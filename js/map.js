/* ===================================================================
   map.js —— 天下 4X 战略层（MapSys · 省份制回合制）
   P1：天下回合 + 军队单位(募/移动/围攻) + 单位制持续战斗 + 攻克夺州
       + 可行动高亮 + 目标进度。自带「结束回合」，独立于按天推进。
   后续：P2 城池产能 / P3 国策科技 / P4 敌国AI / P5 攻城接沙盘战棋。
   依赖全局 Game(R/SFX/UI/toast)。
   =================================================================== */
const MapSys = (() => {
"use strict";

const FACTION_COLOR = {
  self:"#d9b65f", neutral:"#8a8170",
  北狄:"#5b82b8", 西羌:"#b07ac0", 契丹:"#4a9d8e",
  东夷:"#c79a5a", 南诏:"#5aa06a", 突厥:"#c0563a"
};
const TERRAIN_DEF = {关塞:8, 山地:5, 平原:0, 水乡:2, 草原:0};

const REGIONS = [
  {id:"jingji",  name:"京畿", x:300,y:200, owner:"self",    terrain:"关塞", str:18, dev:2, cap:true,
   adj:["zhongyuan","guanzhong","yanyun","qilu"]},
  {id:"zhongyuan",name:"中原",x:300,y:272, owner:"self",    terrain:"平原", str:14, dev:1,
   adj:["jingji","guanzhong","jiangnan","qilu","bashu"]},
  {id:"guanzhong",name:"关中",x:218,y:235, owner:"self",    terrain:"关塞", str:14, dev:1,
   adj:["jingji","zhongyuan","hexi","longyou","bashu","shuofang"]},
  {id:"jiangnan",name:"江南", x:344,y:336, owner:"neutral", terrain:"水乡", str:22, dev:0,
   adj:["zhongyuan","bashu","lingnan","qilu"]},
  {id:"shuofang",name:"朔方", x:243,y:108, owner:"北狄",     terrain:"草原", str:30, dev:0,
   adj:["guanzhong","yanyun","hexi"]},
  {id:"yanyun",  name:"燕云", x:372,y:120, owner:"北狄",     terrain:"关塞", str:34, dev:0,
   adj:["jingji","shuofang","liaodong"]},
  {id:"hexi",    name:"河西", x:138,y:193, owner:"西羌",     terrain:"山地", str:26, dev:0,
   adj:["guanzhong","shuofang","longyou","xiyu"]},
  {id:"longyou", name:"陇右", x:150,y:290, owner:"西羌",     terrain:"山地", str:24, dev:0,
   adj:["guanzhong","hexi","bashu","xiyu"]},
  {id:"bashu",   name:"巴蜀", x:213,y:342, owner:"neutral", terrain:"山地", str:22, dev:0,
   adj:["guanzhong","zhongyuan","jiangnan","longyou","lingnan"]},
  {id:"qilu",    name:"齐鲁", x:412,y:235, owner:"东夷",     terrain:"平原", str:25, dev:0,
   adj:["jingji","zhongyuan","jiangnan","liaodong"]},
  {id:"liaodong",name:"辽东", x:458,y:132, owner:"契丹",     terrain:"草原", str:28, dev:0,
   adj:["yanyun","qilu"]},
  {id:"lingnan", name:"岭南", x:322,y:406, owner:"南诏",     terrain:"水乡", str:20, dev:0,
   adj:["jiangnan","bashu","jiaozhi"]},
  {id:"jiaozhi", name:"交趾", x:250,y:416, owner:"南诏",     terrain:"山地", str:18, dev:0,
   adj:["lingnan"]},
  {id:"xiyu",    name:"西域", x:70, y:235, owner:"突厥",     terrain:"草原", str:24, dev:0,
   adj:["hexi","longyou"]}
];

/* 兵种 */
const UNIT_TYPES = {
  bu:{key:"bu", name:"步军", icon:"卒", hp:32, atk:13, move:2, cost:{treasury:8, food:6, military:4}},
  qi:{key:"qi", name:"骑军", icon:"骑", hp:26, atk:17, move:3, cost:{treasury:13, food:8, military:5}}
};

/* ---------- 状态 ---------- */
function initState(s){
  if(s.map && s.map.regions && s.map.regions.length){
    if(!s.map.units) s.map.units=[];     // 旧档惰性补
    if(s.map.turn==null) s.map.turn=1;
    if(s.map.seq==null) s.map.seq=0;
    // 旧档 garrison 兼容：非己州用 str
    s.map.regions.forEach(r=>{ if(r.garrison==null) r.garrison=(r.owner==="self"?0:r.str||20); });
    return;
  }
  const regions = REGIONS.map(r=>({
    id:r.id, name:r.name, x:r.x, y:r.y, owner:r.owner,
    faction:(r.owner==="self"||r.owner==="neutral")?null:r.owner,
    terrain:r.terrain, dev:r.dev||0, cap:!!r.cap, adj:r.adj.slice(),
    explored:false, garrison:(r.owner==="self"?0:(r.str+R.i(-2,3)))
  }));
  const byId=id=>regions.find(x=>x.id===id);
  regions.forEach(r=>{ if(r.owner==="self") r.explored=true; });
  regions.forEach(r=>{ if(r.adj.some(id=>{const a=byId(id);return a&&a.owner==="self";})) r.explored=true; });
  s.map = {regions, units:[], sel:null, selU:null, turn:1, seq:0};
  // 开局驻军：都城两步一骑
  spawn(s,"jingji","bu"); spawn(s,"jingji","bu"); spawn(s,"jingji","qi");
  spawn(s,"zhongyuan","bu"); spawn(s,"guanzhong","bu");
}
function spawn(s,rid,type){
  const t=UNIT_TYPES[type]; const m=s.map;
  m.units.push({id:"U"+(m.seq++), owner:"self", type, hp:t.hp, maxhp:t.hp, atk:t.atk, move:t.move, movesLeft:t.move, rid});
}
function M(){ return Game.s.map; }
function region(id){ return M().regions.find(r=>r.id===id); }
function unit(id){ return M().units.find(u=>u.id===id); }
function unitsIn(rid,owner){ return M().units.filter(u=>u.rid===rid && (!owner||u.owner===owner)); }
function bordersSelf(r){ return r.adj.some(id=>{const a=region(id);return a&&a.owner==="self";}); }
function counts(){ const rs=M().regions; return {own:rs.filter(r=>r.owner==="self").length, total:rs.length}; }
function defenseOf(r){ return Math.round(r.garrison + (TERRAIN_DEF[r.terrain]||0) + r.dev*4); }

/* ---------- 月度反哺国家（game.js monthlySettle 调）---------- */
function produce(s){
  if(!s.map) return; let tax=0,food=0,mil=0;
  for(const r of s.map.regions){ if(r.owner!=="self") continue;
    tax+=Math.ceil((r.dev+1)/2);
    if(r.terrain==="平原"||r.terrain==="水乡") food+=r.dev+1;
    if(r.dev>=2) mil+=1; }
  s.nation.treasury+=Math.round(tax*0.6); s.nation.food+=Math.round(food*0.5); s.nation.military+=Math.round(mil*0.5);
}
function growEnemies(s){ if(!s.map) return;
  for(const r of s.map.regions){ if(r.owner==="self") continue; if(R.chance(12)) r.garrison=Math.min(60,r.garrison+1); }
}

/* ---------- 选择 ---------- */
function selectRegion(id){
  const m=M(), r=region(id); if(!r) return;
  // 已选我军 + 点的是合法目标 → 移动/攻取
  if(m.selU){ const u=unit(m.selU);
    if(u && u.owner==="self" && u.movesLeft>0){
      if(isAttackTarget(u,r)){ attack(u,r); return; }
      if(reachable(u)[id]!=null){ moveUnit(u,r); return; }
    }
  }
  m.sel=id; UI.renderPanel("map");
}
function selectUnit(uid){ const m=M(); m.selU=(m.selU===uid?null:uid); UI.renderPanel("map"); }

/* ---------- 移动可达（BFS·穿行己有/已探无敌州）---------- */
function reachable(u){
  const res={}, start=u.rid; res[start]=0;
  let frontier=[{id:start,c:0}];
  while(frontier.length){ const nf=[];
    for(const cur of frontier){ const r=region(cur.id);
      r.adj.forEach(aid=>{ const a=region(aid); if(!a) return;
        if(a.owner!=="self") return;                 // 仅在己境内机动（攻敌另算）
        if(unitsIn(aid).length>=3) return;           // 单州屯兵上限
        const nc=cur.c+1; if(nc>u.movesLeft) return;
        if(res[aid]==null||nc<res[aid]){ res[aid]=nc; nf.push({id:aid,c:nc}); }
      });
    } frontier=nf;
  }
  delete res[start]; return res;
}
function isAttackTarget(u,r){
  if(r.owner==="self") return false;
  const cur=region(u.rid); return cur.adj.includes(r.id) && r.explored;
}
function moveUnit(u,r){ u.rid=r.id; u.movesLeft=Math.max(0,u.movesLeft-1); SFX.pick(); M().sel=r.id; UI.renderPanel("map"); }

/* ---------- 围攻战斗（持续 HP·多回合）---------- */
function attack(u,r){
  if(!isAttackTarget(u,r)){ Game.toast("不可攻击此地"); return; }
  if(!r.explored){ Game.toast("敌情不明，请先遣使探索"); return; }
  const def=defenseOf(r);
  const dmgG=Math.max(3,Math.round(u.atk*R.rnd(0.7,1.15)));
  const dmgU=Math.max(2,Math.round(def*0.32*R.rnd(0.7,1.15)));
  r.garrison=Math.max(0,r.garrison-dmgG); u.hp=Math.max(0,u.hp-dmgU); u.movesLeft=0;
  let msg=`${UNIT_TYPES[u.type].name}攻 ${r.name}，挫敌守备 ${dmgG}`;
  if(u.hp<=0){ // 我军覆没
    M().units=M().units.filter(x=>x.id!==u.id); M().selU=null;
    msg+=`，然力战不支，全军覆没！`;
    SFX.bad(); Game.toast(msg); UI.renderPanel("map"); return;
  }
  msg+=`（我军余 ${u.hp}）`;
  if(r.garrison<=0){ capture(r,u); SFX.gong();
    Game.toast(`克 ${r.name}！${UNIT_TYPES[u.type].name}入城镇守。`);
    Game.logMsg(`天下：攻取 ${r.name}，疆域 +1。`);
  }else{ SFX.deal(); Game.toast(msg+`，守军未溃（余 ${r.garrison}）。`); }
  UI.renderPanel("map");
}
function capture(r,u){
  const s=Game.s; r.owner="self"; r.faction=null; r.garrison=0; r.explored=true;
  if(u){ u.rid=r.id; }                                  // 入城
  r.adj.forEach(aid=>{const a=region(aid); if(a)a.explored=true;});
  s.nation.land=R.clamp(s.nation.land+R.i(2,5)); s.nation.prestige=R.clamp(s.nation.prestige+R.i(2,4));
  if(s.flags) s.flags.warWon=true; if(Game.tally) Game.tally("battlewin");
  // 胜利判定
  if(counts().own>=counts().total){ s.nation.prestige=R.clamp(s.nation.prestige+20);
    Game.toast("🏆 六合归一，天下一统！"); Game.logMsg("【天下一统】普天之下，莫非王土！"); if(s.flags)s.flags.unified=true; }
  UI.renderHUD&&UI.renderHUD(); Game.save&&Game.save();
}

/* ---------- 募军（己州·耗国库/粮/兵）---------- */
function recruit(rid,type){
  const s=Game.s, r=region(rid); if(!r||r.owner!=="self") return;
  if(unitsIn(rid).length>=3){ Game.toast("此州屯兵已满（上限3）"); return; }
  const t=UNIT_TYPES[type], c=t.cost;
  if(s.nation.treasury<c.treasury||s.nation.food<c.food||s.nation.military<c.military){
    Game.toast(`粮饷不足（需 库${c.treasury}·粮${c.food}·兵${c.military}）`); return; }
  s.nation.treasury-=c.treasury; s.nation.food-=c.food; s.nation.military-=c.military;
  spawn(s,rid,type); SFX.gong(); Game.toast(`${r.name} 募得 ${t.name}一支。`);
  Game.clampNation&&Game.clampNation(); UI.renderHUD&&UI.renderHUD(); Game.save&&Game.save(); UI.renderPanel("map");
}

/* ---------- 探索 / 开发（天下回合·耗资源·不占按天行动）---------- */
function explore(id){
  const r=region(id); if(!r||r.explored) return;
  if(!bordersSelf(r)){ Game.toast("只能探索与疆域接壤之地"); return; }
  r.explored=true; SFX.pick(); Game.toast(`遣使探得 ${r.name}：守备约 ${r.garrison}。`);
  UI.renderPanel("map");
}
function develop(id){
  const r=region(id), s=Game.s; if(!r||r.owner!=="self") return;
  if(r.dev>=3){ Game.toast("此地已极尽繁华"); return; }
  const cost=10*(r.dev+1);
  if(s.nation.treasury<cost){ Game.toast(`国库不足（需 ${cost}）`); return; }
  s.nation.treasury-=cost; r.dev++; SFX.good();
  Game.toast(`开发 ${r.name}（开发度 ${r.dev}），城防与产出渐增。`);
  Game.clampNation&&Game.clampNation(); UI.renderHUD&&UI.renderHUD(); Game.save&&Game.save(); UI.renderPanel("map");
}

/* ---------- 结束回合 ---------- */
function endTurn(){
  const s=Game.s, m=M();
  m.units.forEach(u=>{ if(u.owner==="self") u.movesLeft=UNIT_TYPES[u.type].move; });  // 复位机动
  // 敌州缓慢补备（P4 接真 AI）
  m.regions.forEach(r=>{ if(r.owner!=="self" && R.chance(22)) r.garrison=Math.min(60,r.garrison+1); });
  m.turn++; m.selU=null; SFX.deal();
  Game.toast(`天下 · 第 ${m.turn} 回合`); UI.renderPanel("map");
}

/* ---------- 渲染 ---------- */
function svgMap(s){
  const m=s.map, sel=m.sel, selU=m.selU?unit(m.selU):null;
  const reach = selU?reachable(selU):{};
  const byId=id=>m.regions.find(r=>r.id===id);
  let lines="";
  m.regions.forEach(r=>r.adj.forEach(aid=>{ if(r.id<aid){ const a=byId(aid); if(a)
    lines+=`<line x1="${r.x}" y1="${r.y}" x2="${a.x}" y2="${a.y}" stroke="#00000033" stroke-width="1.4"/>`; }}));
  let tiles="";
  m.regions.forEach(r=>{
    const col=FACTION_COLOR[r.owner]||"#8a8170";
    const isSel=sel===r.id;
    const canMoveHere = selU && reach[r.id]!=null;
    const canAtkHere  = selU && isAttackTarget(selU,r);
    let stroke=isSel?"#fff":(r.owner==="self"?"#f6dd96":"#0008"), sw=isSel?3:1.2;
    if(canMoveHere){ stroke="#5ad1ff"; sw=3; } if(canAtkHere){ stroke="#ff5a4a"; sw=3; }
    const myU=unitsIn(r.id,"self");
    const sub = !r.explored ? "？" : (r.owner==="self" ? "★"+r.dev : "守"+r.garrison);
    tiles+=`<g class="rg" onclick="MapSys.selectRegion('${r.id}')" style="cursor:pointer">
      <rect x="${r.x-31}" y="${r.y-19}" width="62" height="38" rx="8" fill="${col}" fill-opacity="${r.owner==="self"?0.95:(r.explored?0.7:0.4)}" stroke="${stroke}" stroke-width="${sw}"/>
      ${canMoveHere?`<rect x="${r.x-31}" y="${r.y-19}" width="62" height="38" rx="8" fill="#5ad1ff" fill-opacity="0.18"/>`:""}
      ${canAtkHere?`<rect x="${r.x-31}" y="${r.y-19}" width="62" height="38" rx="8" fill="#ff5a4a" fill-opacity="0.16"/>`:""}
      <text x="${r.x}" y="${r.y-3}" text-anchor="middle" font-size="13" fill="#1a120b" font-weight="700">${r.cap?"♔":""}${r.name}</text>
      <text x="${r.x}" y="${r.y+9}" text-anchor="middle" font-size="8.5" fill="#1a120bbb">${sub}</text>
      ${myU.length?`<g>${myU.map((u,i)=>`<circle cx="${r.x-22+i*11}" cy="${r.y+15}" r="5" fill="${u.id===m.selU?'#fff':'#2a4a8a'}" stroke="#f6dd96" stroke-width="1"/><text x="${r.x-22+i*11}" y="${r.y+18}" text-anchor="middle" font-size="7" fill="${u.id===m.selU?'#2a4a8a':'#fff'}" font-weight="700">${UNIT_TYPES[u.type].icon}</text>`).join("")}</g>`:""}
    </g>`;
  });
  return `<svg viewBox="0 0 600 470" class="worldmap" preserveAspectRatio="xMidYMid meet">
    <defs><radialGradient id="mapbg" cx="50%" cy="42%" r="75%"><stop offset="0%" stop-color="#3a2c18"/><stop offset="100%" stop-color="#211608"/></radialGradient></defs>
    <rect x="0" y="0" width="600" height="470" rx="14" fill="url(#mapbg)"/>${lines}${tiles}</svg>`;
}
function actionCard(s){
  const m=s.map, r=m.sel?region(m.sel):null;
  if(!r) return `<p class="panel-tip wf-hint">⚑ <b>如何征服天下</b>：①点己方州(金)选一支军队「⚑出征」②点蓝色高亮州移动、点红色高亮州攻取 ③攻克相邻敌州即纳入疆域 ④点「结束回合」恢复军队机动。<br>★=开发度 · 守=敌守备 · ♔=都城 · 目标：吞并全部 ${counts().total} 州。</p>`;
  const ownTxt=r.owner==="self"?"<b>我朝</b>":(r.owner==="neutral"?"中立":r.faction||r.owner);
  let h=`<div class="region-card"><div class="m-head"><b>${r.cap?"♔ ":""}${r.name}</b><span class="m-post">${r.terrain}</span></div>`;
  if(r.explored){
    h+=`<div class="m-line">归属 ${ownTxt}　${r.owner==="self"?("开发度 "+r.dev):("守备 "+defenseOf(r)+"（含地利）")}</div>`;
  }else h+=`<div class="m-line">归属 ${ownTxt} · 敌情不明</div>`;
  // 我军单位列表
  const myU=unitsIn(r.id,"self");
  if(myU.length){ h+=`<div class="unit-row">`+myU.map(u=>{const t=UNIT_TYPES[u.type];
    return `<button class="unit-chip ${u.id===m.selU?'on':''}" onclick="MapSys.selectUnit('${u.id}')" title="点选此军，再点高亮州移动/攻取">
      ${t.icon} ${t.name} <i>气${u.hp}/${u.maxhp}·行${u.movesLeft}</i>${u.id===m.selU?' ⚑出征中':''}</button>`;}).join("")+`</div>`; }
  // 动作
  let btns="";
  if(r.owner==="self"){
    btns+=`<button class="chip" onclick="MapSys.recruit('${r.id}','bu')">募步军(库8粮6兵4)</button>`;
    btns+=`<button class="chip" onclick="MapSys.recruit('${r.id}','qi')">募骑军(库13粮8兵5)</button>`;
    btns+= r.dev<3?`<button class="chip" onclick="MapSys.develop('${r.id}')">开发(库${10*(r.dev+1)})</button>`:`<span class="chip" style="opacity:.5">已极繁华</span>`;
  }else if(bordersSelf(r)){
    if(!r.explored) btns+=`<button class="chip" onclick="MapSys.explore('${r.id}')">遣使探索</button>`;
    else btns+=`<span class="panel-tip" style="display:inline">⚔ 选一支相邻我军，点此州攻取（红色高亮）。</span>`;
  }else btns+=`<span class="panel-tip" style="display:inline">需先取下相邻州郡，方可用兵于此。</span>`;
  h+=`<div class="post-row">${btns}</div></div>`;
  return h;
}
function renderBody(s){
  const c=counts(); const pct=Math.round(c.own/c.total*100);
  const m=s.map;
  return `<div class="map-top">
      <div class="map-goal"><span>一统进度</span><div class="goal-bar"><i style="width:${pct}%"></i></div><b>${c.own}/${c.total} 州</b></div>
      <div class="map-turn">天下 · 第 <b>${m.turn||1}</b> 回合 <button class="btn btn-primary turn-btn" onclick="MapSys.endTurn()">结束回合 ▶</button></div>
    </div>
    ${svgMap(s)}
    <div id="map-action">${actionCard(s)}</div>`;
}

return {initState, produce, growEnemies, selectRegion, selectUnit, recruit, explore, develop, endTurn,
  renderBody, counts, REGIONS, UNIT_TYPES};
})();
if(typeof globalThis!=="undefined") globalThis.MapSys=MapSys;
