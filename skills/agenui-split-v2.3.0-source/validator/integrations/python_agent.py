"""Async bridge for the agent backend. Python 3.10+, standard library only.

Pass a real model delta async iterator to validate_stream. The command-line
entry point replays an existing NDJSON file; it does not call a model.
"""
import argparse
import asyncio
from contextlib import aclosing, suppress
import http.client
import json
from pathlib import Path
import sys
from urllib.parse import quote, urlsplit


class ValidationError(Exception):
    def __init__(self, status, result):
        self.status = status
        self.result = result
        super().__init__(f"validator HTTP {status}: {json.dumps(result.get('diagnostics') or result.get('error') or result, ensure_ascii=False)}")


class AgentValidator:
    """Each open reply has independent ordering. Never retry an uncertain write."""
    def __init__(self, base_url="http://127.0.0.1:8080", timeout=10):
        url = urlsplit(base_url)
        if url.scheme not in ("http", "https") or not url.hostname or url.username or url.password or url.path not in ("", "/") or url.query or url.fragment:
            raise ValueError("base_url must name a trusted service origin")
        self.url, self.timeout = url, timeout

    async def request(self, method, path, body=b"", mime=None):
        def run():
            factory = http.client.HTTPSConnection if self.url.scheme == "https" else http.client.HTTPConnection
            conn = factory(self.url.hostname, self.url.port, timeout=self.timeout)
            try:
                conn.request(method, path, body=body, headers={"Content-Type": mime} if mime else {})
                response = conn.getresponse()
                raw = response.read()
                return response.status, json.loads(raw) if raw else {}
            finally:
                conn.close()
        return await asyncio.to_thread(run)

    async def validate_stream(self, deltas, *, surface_id, expected_contract_sha256):
        """Yield approved A2UI messages as they arrive; transport errors stay off the UI channel."""
        meta = {"surfaceId": surface_id, "expectedContractSha256": expected_contract_sha256}
        status, result = await self.request("POST", "/v1/sessions", json.dumps(meta).encode(), "application/json")
        if status != 201:
            raise ValidationError(status, result)
        prefix = "/v1/sessions/" + quote(result["sessionId"], safe="")
        seq, emitted, finished = result["nextSeq"], 0, False
        def messages(receipt):
            nonlocal emitted
            for entry in receipt.get("accepted", []):
                if entry["sequence"] != emitted + 1:
                    raise RuntimeError("nonconsecutive accepted message sequence")
                emitted += 1
                yield entry["message"]
        try:
            async for delta in deltas:
                raw = delta.encode("utf-8") if isinstance(delta, str) else delta
                if not isinstance(raw, bytes):
                    raise TypeError("model delta must be str or bytes")
                # Bounded requests; newlines and UTF-8 characters can span them.
                for pos in range(0, len(raw), 8192):
                    status, result = await self.request("POST", f"{prefix}/chunks/{seq}", raw[pos:pos+8192], "application/octet-stream")
                    for message in messages(result):
                        yield message
                    if status != 200 or not result.get("valid"):
                        raise ValidationError(status, result)
                    seq = result["nextSeq"]
            status, result = await self.request("POST", f"{prefix}/finish/{seq}")
            for message in messages(result):
                yield message
            if status != 200 or not result.get("valid"):
                raise ValidationError(status, result)
            finished = True
        finally:
            if not finished:
                # Abandon the run; a lost HTTP response must not cause replay to UI.
                with suppress(OSError, http.client.HTTPException, ValueError):
                    await self.request("DELETE", prefix)


async def replay(args):
    stamp = json.loads(Path(args.stamp).read_text(encoding="utf-8"))
    async def chunks():
        with Path(args.file).open("rb") as f:
            while block := f.read(args.chunk_bytes):
                yield block
    client = AgentValidator(args.url)
    async with aclosing(client.validate_stream(chunks(), surface_id=args.surface_id,
                                              expected_contract_sha256=stamp["contractSha256"])) as accepted:
        async for message in accepted:
            # Real agent: await ordered_client_queue.put(message).
            print(json.dumps(message, ensure_ascii=False, separators=(",", ":")), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Replay NDJSON through the validator HTTP API")
    parser.add_argument("file")
    parser.add_argument("--surface-id", required=True)
    parser.add_argument("--stamp", required=True, help="contract-stamp.json of the model's installed Skill")
    parser.add_argument("--url", default="http://127.0.0.1:8080")
    parser.add_argument("--chunk-bytes", type=int, default=4096)
    args = parser.parse_args()
    if args.chunk_bytes < 1:
        parser.error("--chunk-bytes must be positive")
    try:
        asyncio.run(replay(args))
    except (ValidationError, OSError, http.client.HTTPException, ValueError, RuntimeError) as err:
        print(str(err), file=sys.stderr)
        sys.exit(1)
