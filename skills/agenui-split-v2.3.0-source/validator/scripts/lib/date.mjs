export function nextSaturday18(now = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const format = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const parts = date => Object.fromEntries(format.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
  const local = parts(now);
  const day = new Date(Date.UTC(local.year, local.month - 1, local.day));
  let days = (6 - day.getUTCDay() + 7) % 7;
  if (days === 0 && local.hour >= 18) days = 7;
  day.setUTCDate(day.getUTCDate() + days);
  const target = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 18);
  let instant = target;
  for (let i = 0; i < 3; i++) {
    const p = parts(new Date(instant));
    instant += target - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  }
  const offset = Math.round((target - instant) / 60000);
  const pad = n => String(n).padStart(2, '0');
  return `${day.toISOString().slice(0, 10)}T18:00:00${offset >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}
