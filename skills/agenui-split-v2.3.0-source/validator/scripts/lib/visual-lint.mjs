import { readJson } from './catalog.mjs';
import { loadVisualProfile, vp, canonicalVp } from './styles.mjs';
export function contrastRatio(fg, bg) {
  const luminance = hex => {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return undefined;
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
    return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
  };
  const a=luminance(fg),b=luminance(bg);
  return a===undefined||b===undefined?undefined:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}
/** Non-mutating design lint. Warnings are not A2UI syntax errors or a native visual verdict. */
export function lintVisual(messages, profile=loadVisualProfile()) {
  const tokens=readJson('authoring/styles/tokens.json'),palette=tokens.colors[profile.theme];
  const sizes=new Set(Object.values(tokens.typography).map(t=>vp(t.logicalSize,profile.fontScale)));
  const colors=new Set(Object.values(palette).map(x=>x.toUpperCase()));
  const nodes=new Map(), warnings=[];
  for(const message of messages)for(const node of message.updateComponents?.components||[])nodes.set(node.id,node);
  const warn=(code,node,message)=>warnings.push({severity:'warning',code,componentId:node.id,message});
  for(const node of nodes.values()){
    const style=node.styles||{};
    if(node.component==='Text'){
      if(style['font-size']&&!sizes.has(canonicalVp(style['font-size'])))warn('W_FONT_ROLE',node,'字号未落入当前已构建语义字阶');
      if(style.color&&/^#[0-9a-f]{6}$/i.test(style.color)&&!colors.has(style.color.toUpperCase()))warn('W_COLOR_ROLE',node,'文字色不在本轮语义调色板');
      if(style['font-weight']&&!['normal','bold'].includes(style['font-weight']))warn('W_FONT_WEIGHT',node,'默认字重应选normal/bold，其他值需明确设计理由');
      if(style['line-clamp']!==undefined&&style['line-clamp']!==3)warn('W_TEXT_SUMMARY',node,'项目只对非关键摘要推荐3行，其余完整显示');
    }
    if(style.opacity!==undefined&&style.opacity<1)warn('W_GROUP_OPACITY',node,'整体透明度会同时影响子文字；半透明卡片应使用背景色alpha');
    if(node.component==='Card'){
      const expected=vp(tokens.radiusLogical.card,profile.lengthScale);
      if(style['border-radius']&&canonicalVp(style['border-radius'])!==expected)warn('W_CARD_RADIUS',node,'Card圆角偏离统一角色');
    }
    if(node.component==='Button'){
      const label=nodes.get(node.child);
      if(label?.component==='Text'){
        const ratio=contrastRatio(label.styles?.color||'',style['background-color']||'');
        if(ratio!==undefined&&ratio<=4.5)warn('W_BUTTON_CONTRAST',node,`已知不透明前景/背景对比度${ratio.toFixed(2)}，低于项目目标`);
      }
    }
  }
  return {warnings,scope:'只检查可确定的样式漂移和不透明按钮色对；不代表原生布局、叠层、字体和触达验收'};
}
