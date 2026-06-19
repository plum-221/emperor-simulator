/* ===================================================================
   map.js —— 准4X 大地图子系统（MapSys）
   列国舆图：探索 / 开发 / 进军攻取 / 征募。与国家六维最小侵入式整合：
   自有区每月加成 treasury/food/military，攻取额外奖 land/prestige。
   依赖 game.js 暴露的 Game（R/clamp/SFX/UI 经全局可见）。
   =================================================================== */
const MapSys = (() => {
"use strict";

/* 阵营配色 */
const FACTION_COLOR = {
  self:"#d9b65f", neutral:"#8a8170",
  北狄:"#5b82b8", 西羌:"#b07ac0", 契丹:"#4a9d8e",
  东夷:"#c79a5a", 南诏:"#5aa06a", 突厥:"#c0563a"
};

/* 区域模板（svg viewBox 0 0 600 460）。owner 初始：self 三区，余为各 faction / neutral */
const REGIONS = [
  {id:"jingji",  name:"京畿", x:300,y:200, owner:"self",    terrain:"关塞", str:40, dev:2, cap:true,
   adj:["zhongyuan","guanzhong","yanyun","qilu"]},
  {id:"zhongyuan",name:"中原",x:300,y:272, owner:"self",    terrain:"平原", str:30, dev:1,
   adj:["jingji","guanzhong","jiangnan","qilu","bashu"]},
  {id:"guanzhong",name:"关中",x:218,y:235, owner:"self",    terrain:"关塞", str:30, dev:1,
   adj:["jingji","zhongyuan","hexi","longyou","bashu","shuofang"]},
  {id:"jiangnan",name:"江南", x:344,y:336, owner:"neutral", terrain:"水乡", str:28, dev:0,
   adj:["zhongyuan","bashu","lingnan","qilu"]},
  {id:"shuofang",name:"朔方", x:243,y:108, owner:"北狄",     terrain:"草原", str:38, dev:0,
   adj:["guanzhong","yanyun","hexi"]},
  {id:"yanyun",  name:"燕云", x:372,y:120, owner:"北狄",     terrain:"关塞", str:42, dev:0,
   adj:["jingji","shuofang","liaodong"]},
  {id:"hexi",    name:"河西", x:138,y:193, owner:"西羌",     terrain:"山地", str:34, dev:0,
   adj:["guanzhong","shuofang","longyou","xiyu"]},
  {id:"longyou", name:"陇右", x:150,y:290, owner:"西羌",     terrain:"山地", str:32, dev:0,
   adj:["guanzhong","hexi","bashu","xiyu"]},
  {id:"bashu",   name:"巴蜀", x:213,y:342, owner:"neutral", terrain:"山地", str:30, dev:0,
   adj:["guanzhong","zhongyuan","jiangnan","longyou","lingnan"]},
  {id:"qilu",    name:"齐鲁", x:412,y:235, owner:"东夷",     terrain:"平原", str:33, dev:0,
   adj:["jingji","zhongyuan","jiangnan","liaodong"]},
  {id:"liaodong",name:"辽东", x:458,y:132, owner:"契丹",     terrain:"草原", str:36, dev:0,
   adj:["yanyun","qilu"]},
  {id:"lingnan", name:"岭南", x:322,y:406, owner:"南诏",     terrain:"水乡", str:26, dev:0,
   adj:["jiangnan","bashu","jiaozhi"]},
  {id:"jiaozhi", name:"交趾", x:250,y:416, owner:"南诏",     terrain:"山地", str:24, dev:0,
   adj:["lingnan"]},
  {id:"xiyu",    name:"西域", x:70, y:235, owner:"突厥",     terrain:"草原", str:30, dev:0,
   adj:["hexi","longyou"]}
];

const TERRAIN_DEF = {关塞:8, 山地:5, 平原:0, 水乡:2, 草原:0};

/* ---------- 状态 ---------- */
function initState(s){
  if(s.map && s.map.regions && s.map.regions.length) return;   // 已有则不覆盖（兼容旧档）
  const regions = REGIONS.map(r=>({
    id:r.id, name:r.name, x:r.x, y:r.y, owner:r.owner, faction:r.owner==="self"||r.owner==="neutral"?null:r.owner,
    terrain:r.terrain, str:r.str + R.i(-3,4), dev:r.dev||0, cap:!!r.cap,
    adj:r.adj.slice(), explored:false
  }));
  const byId = id=>regions.find(x=>x.id===id);
  // 自有区及其邻接 → 已探
  regions.forEach(r=>{ if(r.owner==="self") r.explored=true; });
  regions.forEach(r=>{ if(r.adj.some(id=>{const a=byId(id);return a&&a.owner==="self";})) r.explored=true; });
  s.map = {regions, sel:null};
}
function R0(){ return Game.s.map; }
function region(id){ return R0().regions.find(r=>r.id===id); }
function bordersSelf(r){ return r.adj.some(id=>{const a=region(id);return a&&a.owner==="self";}); }

/* ---------- 计算 ---------- */
function defenseOf(r){ return Math.round(r.str + (TERRAIN_DEF[r.terrain]||0) + r.dev*4); }
function attackPower(){
  const s=Game.s, m=s.ministers.find(x=>x.post==="marshal");
  const marshal = m?m.mil:20;
  return Math.round(s.nation.military*0.5 + marshal*0.4 + s.emperor.martial*0.2);
}
function counts(){
  const rs=R0().regions; return {own:rs.filter(r=>r.owner==="self").length, total:rs.length};
}

/* ---------- 月度结算（由 game.js monthlySettle 调用）---------- */
function produce(s){
  if(!s.map) return;
  let tax=0,food=0,mil=0;
  for(const r of s.map.regions){ if(r.owner!=="self") continue;
    tax += Math.ceil((r.dev+1)/2);
    if(r.terrain==="平原"||r.terrain==="水乡") food += r.dev+1;
    if(r.dev>=2) mil += 1;
  }
  s.nation.treasury += Math.round(tax*0.6);   // 打折，避免与既有税入叠加过猛
  s.nation.food     += Math.round(food*0.5);
  s.nation.military += Math.round(mil*0.5);
}
function growEnemies(s){
  if(!s.map) return;
  for(const r of s.map.regions){ if(r.owner==="self") continue; if(R.chance(14)) r.str=Math.min(72,r.str+1); }
}

/* ---------- 玩家动作（消耗当前时段行动）---------- */
function consume(){ // 返回 false 表示本时段已行动
  if(Game.s.actedThisTurn){ Game.toast("此时段已行一事"); return false; }
  return true;
}
function selectRegion(id){ R0().sel=id; UI.renderPanel("map"); }

function explore(id){
  const r=region(id); if(!r||r.explored) return;
  if(!bordersSelf(r)){ Game.toast("只能探索与疆域接壤之地"); return; }
  if(!consume()) return;
  r.explored=true; Game.s.actedThisTurn=true;
  SFX.pick(); Game.toast(`遣使探得 ${r.name}：守军约 ${r.str}。`);
  Game.logMsg(`遣使探明 ${r.name} 虚实。`);
  Game.renderTurn(); UI.renderPanel("map");
}
function develop(id){
  const r=region(id); if(!r||r.owner!=="self") return;
  if(r.dev>=3){ Game.toast("此地已极尽繁华"); return; }
  const cost=10*(r.dev+1);
  if(Game.s.nation.treasury<cost){ Game.toast(`国库不足（需 ${cost}）`); return; }
  if(!consume()) return;
  Game.s.nation.treasury-=cost; r.dev++; Game.s.actedThisTurn=true;
  SFX.good(); Game.toast(`开发 ${r.name}，富庶渐增（开发度 ${r.dev}）。`);
  Game.clampNation(); Game.renderTurn(); UI.renderPanel("map");
}
function levy(id){
  const r=region(id); if(!r||r.owner!=="self") return;
  const s=Game.s;
  if(s.nation.food<6||s.nation.treasury<4){ Game.toast("粮饷不足，无以募兵"); return; }
  if(!consume()) return;
  s.nation.food-=6; s.nation.treasury-=4;
  const got=R.i(4,8); s.nation.military+=got; s.actedThisTurn=true;
  SFX.gong(); Game.toast(`${r.name} 募丁 ${got}，兵力大增。`);
  Game.clampNation(); Game.renderTurn(); UI.renderPanel("map");
}
function march(id){
  const r=region(id); if(!r||r.owner==="self") return;
  if(!bordersSelf(r)){ Game.toast("大军无法越境，需先取相邻之地"); return; }
  if(!r.explored){ Game.toast("敌情不明，请先遣使探索"); return; }
  if(!consume()) return;
  const s=Game.s; s.actedThisTurn=true;
  const atk=attackPower()+R.i(-10,20), def=defenseOf(r)+R.i(-6,10);
  const win=atk>=def;
  if(win){
    const land=R.i(2,5),spoil=R.i(4,10),pres=R.i(4,8),loss=R.i(6,12);
    r.owner="self"; r.faction=null; r.dev=Math.max(r.dev,0); r.str=18; r.explored=true;
    // 新得之地的邻接随之入"已探"视野
    r.adj.forEach(aid=>{const a=region(aid); if(a)a.explored=true;});
    s.nation.land=R.clamp(s.nation.land+land); s.nation.treasury=R.clamp(s.nation.treasury+spoil);
    s.nation.prestige=R.clamp(s.nation.prestige+pres); s.nation.military=R.clamp(s.nation.military-loss);
    s.nation.people=R.clamp(s.nation.people+R.i(0,3));
    const m=s.ministers.find(x=>x.post==="marshal"); if(m)m.loyalty=R.clamp(m.loyalty+3);
    SFX.gong();
    Game.toast(`大捷！攻取 ${r.name}，开疆拓土，威望大涨。`);
    Game.logMsg(`王师攻取 ${r.name}，疆域 +${land}，威望 +${pres}。`);
  }else{
    const loss=R.i(8,16);
    s.nation.military=R.clamp(s.nation.military-loss); s.nation.people=R.clamp(s.nation.people-R.i(0,4));
    r.str=Math.min(75,r.str+2);
    SFX.bad();
    Game.toast(`攻 ${r.name} 受挫，损兵折将（兵力 -${loss}）。`);
    Game.logMsg(`征 ${r.name} 失利，损兵 ${loss}。`);
  }
  Game.clampNation(); Game.renderTurn();
  if(Game.checkEndings && Game.checkEndings()) return;
  UI.renderPanel("map");
}

/* ---------- 渲染 ---------- */
function svgMap(s){
  const rs=s.map.regions, sel=s.map.sel;
  const byId=id=>rs.find(r=>r.id===id);
  let lines="";
  rs.forEach(r=>r.adj.forEach(aid=>{ if(r.id<aid){ const a=byId(aid); if(a)
    lines+=`<line x1="${r.x}" y1="${r.y}" x2="${a.x}" y2="${a.y}" stroke="#00000033" stroke-width="1.4"/>`; }}));
  let tiles="";
  rs.forEach(r=>{
    const col=FACTION_COLOR[r.owner]||"#8a8170";
    const isSel=sel===r.id;
    const stroke=isSel?"#ffffff":(r.owner==="self"?"#f6dd96":"#0008");
    const sub = !r.explored ? "？未探" : (r.owner==="self" ? "★"+r.dev : "兵"+r.str);
    tiles+=`<g class="rg" onclick="MapSys.selectRegion('${r.id}')" style="cursor:pointer">
      <rect x="${r.x-31}" y="${r.y-18}" width="62" height="36" rx="8" fill="${col}" fill-opacity="${r.owner==="self"?0.95:(r.explored?0.7:0.45)}" stroke="${stroke}" stroke-width="${isSel?3:1.2}"/>
      <text x="${r.x}" y="${r.y-2}" text-anchor="middle" font-size="13.5" fill="#1a120b" font-weight="700">${r.cap?"♔":""}${r.name}</text>
      <text x="${r.x}" y="${r.y+11}" text-anchor="middle" font-size="9" fill="#1a120bbb">${sub}</text>
    </g>`;
  });
  return `<svg viewBox="0 0 600 460" class="worldmap" preserveAspectRatio="xMidYMid meet">
    <rect x="0" y="0" width="600" height="460" rx="14" fill="url(#mapbg)"/>
    <defs><radialGradient id="mapbg" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="#3a2c18"/><stop offset="100%" stop-color="#211608"/></radialGradient></defs>
    ${lines}${tiles}</svg>`;
}
function actionCard(s){
  const r=s.map.sel?region(s.map.sel):null;
  if(!r) return `<p class="panel-tip">点击舆图上的州郡，查看详情、遣使、开发或进军。<br>★ = 开发度 · 兵 = 守军 · ♔ = 都城。</p>`;
  const ownTxt = r.owner==="self"?"<b>我朝</b>":(r.owner==="neutral"?"中立":`${r.owner}`);
  let btns="";
  if(r.owner==="self"){
    btns += r.dev<3?`<button class="chip" onclick="MapSys.develop('${r.id}')">开发（耗${10*(r.dev+1)}）</button>`:`<span class="chip" style="opacity:.5">已极繁华</span>`;
    btns += `<button class="chip" onclick="MapSys.levy('${r.id}')">征募（耗粮6库4）</button>`;
  }else if(bordersSelf(r)){
    if(!r.explored) btns += `<button class="chip" onclick="MapSys.explore('${r.id}')">遣使探索</button>`;
    else btns += `<button class="chip danger" onclick="MapSys.march('${r.id}')">进军攻取</button>`;
  }else{
    btns += `<span class="panel-tip" style="display:inline">需先攻取相邻州郡，方可用兵于此。</span>`;
  }
  const power = r.owner!=="self" && r.explored ? `<div class="m-line">我军战力约 <b>${attackPower()}</b>　VS　守备约 <b>${defenseOf(r)}</b></div>` : "";
  const info = r.explored
    ? `<div class="m-line">归属 ${ownTxt} · ${r.terrain}　${r.owner==="self"?("开发度 "+r.dev):("守军 "+r.str)}</div>${power}`
    : `<div class="m-line">归属 ${ownTxt} · 敌情不明，需遣使探查</div>`;
  return `<div class="region-card">
    <div class="m-head"><b>${r.cap?"♔ ":""}${r.name}</b><span class="m-post">${r.terrain}</span></div>
    ${info}<div class="post-row">${btns}</div></div>`;
}
function renderBody(s){
  const c=counts(s);
  return `<div class="map-summary">疆域 <b>${c.own}/${c.total}</b> 州　·　点击州郡用兵理政</div>
    ${svgMap(s)}
    <div id="map-action">${actionCard(s)}</div>`;
}

return {initState, produce, growEnemies, selectRegion, explore, develop, levy, march, renderBody, REGIONS};
})();
