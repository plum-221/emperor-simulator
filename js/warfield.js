/* ===================================================================
   warfield.js —— 网格沙盘战棋（点将出征·布阵）
   主动出征时开启：在 7×5 棋盘上布阵 → 回合制移动/攻击 → 敌军 AI 应对。
   地形(平原/山丘/密林/河流)影响移动与防御；胜负与战损回传 Game.resolveWar。
   独立模块，渲染进通用弹窗 #modal。
   =================================================================== */
const WarfieldSys = (() => {
"use strict";

const COLS=7, ROWS=5, MAX_TURN=14;
/* 地形：move=进入耗费(99=不可进)，def=守方减伤 */
const TERRAIN={
  plain:{key:"plain",name:"平原",move:1,def:0,   ico:""},
  hill: {key:"hill", name:"山丘",move:2,def:0.25,ico:"丘"},
  wood: {key:"wood", name:"密林",move:2,def:0.15,ico:"林"},
  water:{key:"water",name:"河流",move:99,def:0,  ico:"〜"}
};
/* 兵种：各有射程(rng)/机动(move)与克制(beats)。步克骑·骑克弓·弓克步（循环）。*/
const ARM={
  bu:  {key:"bu",  name:"步兵", glyph:"步", rng:1, move:3, beats:"qi",   desc:"结阵持戈·克骑兵·近战"},
  qi:  {key:"qi",  name:"骑兵", glyph:"骑", rng:1, move:4, beats:"gong", desc:"长驱奔袭·克弓兵·机动远"},
  gong:{key:"gong",name:"弓兵", glyph:"弓", rng:2, move:2, beats:"bu",   desc:"远程攒射·克步兵·射程远"}
};
const COUNTER_MUL=1.5;                       // 克制方伤害倍率
function counters(a,b){ return !!(ARM[a]&&ARM[a].beats===b); }
let B=null;
const rnd=(a,b)=>a+Math.random()*(b-a);
function leaderOf(side){ return B.units.find(u=>u.side===side&&u.isLeader); }   // 主将（擒贼擒王判定用）
const key=(x,y)=>x+","+y;
const inB=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS;
const manh=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);

function terrainAt(x,y){ return TERRAIN[B.grid[y][x]]; }
function unitAt(x,y){ return B.units.find(u=>u.hp>0&&u.x===x&&u.y===y); }
function aliveOf(side){ return B.units.filter(u=>u.hp>0&&u.side===side); }

/* ---------- 生成战场 ---------- */
function buildGrid(){
  const g=[]; for(let y=0;y<ROWS;y++){ const row=[]; for(let x=0;x<COLS;x++) row.push("plain"); g.push(row); }
  // 中段(x2..4)随机点缀地形，避开双方布阵区(x0-1 / x5-6)
  const mid=[]; for(let y=0;y<ROWS;y++) for(let x=2;x<=4;x++) mid.push([x,y]);
  for(let i=mid.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [mid[i],mid[j]]=[mid[j],mid[i]]; }
  let pi=0; const put=(t,n)=>{ for(let k=0;k<n&&pi<mid.length;k++,pi++){ const[x,y]=mid[pi]; g[y][x]=t; } };
  put("hill",3); put("wood",3); put("water",2);
  return g;
}

/* ---------- 生成部队 ---------- */
function mkUnit(o){ return Object.assign({hp:o.maxhp,acted:false,x:-1,y:-1},o); }
const UNIT_FACE={ guard:"assets/portraits/units/guard.png", archer:"assets/portraits/units/archer.png",
  foe_chief:"assets/portraits/units/foe_chief.png", foe_soldier:"assets/portraits/units/foe_soldier.png",
  foe_archer:"assets/portraits/units/foe_archer.png" };
function armed(o){ const a=ARM[o.arm]||ARM.bu; return mkUnit(Object.assign({rng:a.rng,move:a.move},o)); }
function buildUnits(cfg){
  const us=[]; let n=0;
  const mil=cfg.ourMilitary||40;
  const gens=(cfg.generals||[]).slice(0,4);
  // 武将 —— 骑兵·头像用各将真立绘
  let leaderId=null, bestMil=-1, emperorId=null;
  gens.forEach(g=>{
    const u=armed({id:"u"+(n++),side:"our",name:g.name,kind:"将",icon:"将",arm:"qi",face:g.portrait||"",
      maxhp:Math.round(58+g.mil*0.6+mil*0.2), atk:Math.round(11+g.mil*0.5+mil*0.1)});
    if(g.mil>bestMil){ bestMil=g.mil; leaderId=u.id; }
    us.push(u);
  });
  // 御驾亲征：陛下·骑兵（头像用帝王按龄立绘）。亲征则陛下即主将。
  if(cfg.emperor && cfg.withEmperor){
    const e=cfg.emperor;
    const u=armed({id:"u"+(n++),side:"our",name:e.name+"(亲征)",kind:"帝",icon:"君",arm:"qi",isEmperor:true,
      face:(typeof emperorFace!=="undefined"?emperorFace(e.age):""),
      maxhp:Math.round(70+e.martial*0.7+mil*0.2), atk:Math.round(14+e.martial*0.6+mil*0.1)});
    emperorId=u.id; us.push(u);
  }
  // 禁军 —— 步兵
  const footN = us.length<3?2:1;
  for(let k=0;k<footN;k++) us.push(armed({id:"u"+(n++),side:"our",name:"禁军"+(k+1),kind:"卒",icon:"丨",arm:"bu",face:UNIT_FACE.guard,
    maxhp:Math.round(42+mil*0.4), atk:Math.round(8+mil*0.22)}));
  // 神射营 —— 弓兵
  us.push(armed({id:"u"+(n++),side:"our",name:"神射营",kind:"弓",icon:"弓",arm:"gong",face:UNIT_FACE.archer,
    maxhp:Math.round(34+mil*0.25), atk:Math.round(10+mil*0.2)}));
  // 主将：御驾亲征→陛下；否则最善战之将。主将被斩即败（擒贼擒王）。
  const ourLeadId = emperorId || leaderId;
  if(ourLeadId){ const L=us.find(u=>u.id===ourLeadId); if(L){ L.isLeader=true; if(!L.isEmperor) L.icon="帅"; } }

  // 敌军（酋首=骑兵主将 · 番弓=弓兵 · 余=步兵）
  const ep=cfg.enemyPow||55, foeN=Math.max(3,Math.min(5,3+Math.floor(ep/28)));
  for(let k=0;k<foeN;k++){
    const lead=k===0, foeArcher=(k===foeN-1);
    us.push(armed({id:"f"+(n++),side:"foe",name:lead?(cfg.enemy+"·王"):(cfg.enemy+"兵"+k),
      kind:lead?"酋":"番",icon:lead?"酋":"敌",isLeader:lead,
      arm:lead?"qi":(foeArcher?"gong":"bu"),
      face:lead?UNIT_FACE.foe_chief:(foeArcher?UNIT_FACE.foe_archer:UNIT_FACE.foe_soldier),
      maxhp:Math.round((lead?70:46)+ep*0.5*rnd(0.85,1.1)),
      atk:Math.round((lead?14:9)+ep*0.18*rnd(0.85,1.1))}));
  }
  return us;
}

/* 自动布阵：己方放左两列，敌方放右两列 */
function autoPlace(){
  const ours=B.units.filter(u=>u.side==="our"), foes=B.units.filter(u=>u.side==="foe");
  const zone=(cols)=>{ const c=[]; for(const x of cols) for(let y=0;y<ROWS;y++) if(TERRAIN[B.grid[y][x]].move<99) c.push({x,y}); return c; };
  const oz=zone([0,1]), fz=zone([6,5]);
  ours.forEach((u,i)=>{ const c=oz[i%oz.length]; u.x=c.x; u.y=c.y; });
  foes.forEach((u,i)=>{ const c=fz[i%fz.length]; u.x=c.x; u.y=c.y; });
}

/* ---------- BFS 可达格（含地形耗费，绕开所有单位）---------- */
function reachable(u){
  const res={}; const start=key(u.x,u.y); res[start]=0;
  let frontier=[{x:u.x,y:u.y,c:0}];
  while(frontier.length){
    const nf=[];
    for(const cur of frontier){
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
        const nx=cur.x+dx, ny=cur.y+dy; if(!inB(nx,ny)) return;
        const t=TERRAIN[B.grid[ny][nx]]; if(t.move>=99) return;
        if(unitAt(nx,ny)) return;                 // 单位阻挡
        const nc=cur.c+t.move; if(nc>u.move) return;
        const k=key(nx,ny); if(res[k]==null||nc<res[k]){ res[k]=nc; nf.push({x:nx,y:ny,c:nc}); }
      });
    }
    frontier=nf;
  }
  delete res[start];
  return res;   // {"x,y":cost}
}
function attackTargets(u,fromX,fromY){
  return B.units.filter(t=>t.hp>0&&t.side!==u.side && (Math.abs(t.x-fromX)+Math.abs(t.y-fromY))<=u.rng);
}

/* ---------- 战斗结算 ---------- */
function strike(att,def){
  const dt=terrainAt(def.x,def.y);
  const adv=counters(att.arm,def.arm);                       // 兵种克制
  let dmg=Math.max(3,Math.round(att.atk*rnd(0.82,1.18)*(1-dt.def)*(adv?COUNTER_MUL:1)));
  def.hp=Math.max(0,def.hp-dmg);
  B.log.unshift(`${att.name} 击 ${def.name}，伤 ${dmg}${adv?`（${ARM[att.arm].name}克${ARM[def.arm].name}·克制！）`:""}${dt.def?`（${dt.name}减免）`:""}${def.hp<=0?" — 阵亡！":`（余${def.hp}）`}`);
  if(typeof SFX!=="undefined"&&SFX.deal) SFX.deal();
  // 反击：守方存活且攻方在其射程内（亦计兵种克制）
  if(def.hp>0 && (Math.abs(att.x-def.x)+Math.abs(att.y-def.y))<=def.rng){
    const cadv=counters(def.arm,att.arm);
    let cd=Math.max(2,Math.round(def.atk*0.4*rnd(0.8,1.2)*(cadv?COUNTER_MUL:1)));
    att.hp=Math.max(0,att.hp-cd);
    B.log.unshift(`　↳ ${def.name} 反击，伤 ${cd}${cadv?"（克制！）":""}${att.hp<=0?" — "+att.name+"阵亡！":""}`);
  }
}

/* ---------- 玩家操作 ---------- */
function selectUnit(id){
  const u=B.units.find(x=>x.id===id);
  if(!u||u.side!=="our"||u.hp<=0) return;
  if(B.phase==="battle"&&u.acted) return;
  B.sel=id; B.moved=false; render();
}
function onCell(x,y){
  if(B.phase==="deploy"){ deployMove(x,y); return; }
  if(B.phase!=="battle"||!B.sel) return;
  const u=B.units.find(x2=>x2.id===B.sel); if(!u||u.acted) return;
  const tgt=unitAt(x,y);
  // 点敌→攻击（在射程内）
  if(tgt&&tgt.side==="foe"){
    if((Math.abs(u.x-x)+Math.abs(u.y-y))<=u.rng){ strike(u,tgt); u.acted=true; B.sel=null; afterAction(); }
    return;
  }
  // 点空格→移动（可达）
  if(!tgt){
    const reach=reachable(u);
    if(reach[key(x,y)]!=null){ u.x=x; u.y=y; B.moved=true;
      // 移动后若已无可攻击目标，自动结束该单位
      if(!attackTargets(u,x,y).length){ u.acted=true; B.sel=null; afterAction(); }
      else render();
    }
  }
}
function skipUnit(){ const u=B.units.find(x=>x.id===B.sel); if(u){ u.acted=true; } B.sel=null; afterAction(); }
function afterAction(){
  if(checkEnd()) return;
  if(aliveOf("our").every(u=>u.acted)) enemyTurn();
  else render();
}

/* ---------- 敌军 AI ---------- */
function enemyTurn(){
  B.phase="enemyAnim";
  const foes=aliveOf("foe");
  let i=0;
  const step=()=>{
    if(i>=foes.length){ // 回合结束
      B.units.forEach(u=>u.acted=false); B.turn++; B.sel=null;
      if(B.turn>MAX_TURN){ endByAttrition(); return; }
      B.phase="battle"; if(checkEnd()) return; render(); return;
    }
    const f=foes[i++]; if(f.hp<=0){ step(); return; }
    // 找最近我军
    const targets=aliveOf("our"); if(!targets.length){ checkEnd(); return; }
    let tgt=targets[0],bd=1e9; targets.forEach(t=>{const d=manh(f,t);if(d<bd){bd=d;tgt=t;}});
    // 若已在射程→打；否则移动到「最靠近且能打到」的可达格
    if(manh(f,tgt)<=f.rng){ strike(f,tgt); }
    else{
      const reach=reachable(f); let best=null,bs=1e9;
      for(const k in reach){ const[x,y]=k.split(",").map(Number);
        const d=Math.abs(x-tgt.x)+Math.abs(y-tgt.y);
        const score=d - (d<=f.rng?5:0);   // 优先能进入射程的位置
        if(score<bs){ bs=score; best={x,y}; } }
      if(best){ f.x=best.x; f.y=best.y; }
      if(manh(f,tgt)<=f.rng) strike(f,tgt);
    }
    if(checkEnd()) return;
    render(); setTimeout(step,420);
  };
  render(); setTimeout(step,400);
}

function checkEnd(){
  const our=aliveOf("our"), foe=aliveOf("foe");
  // 擒贼擒王：任一方主将首级被取，该方即败（不必尽歼）
  const fL=leaderOf("foe"), oL=leaderOf("our");
  if(fL && fL.hp<=0){ finish(true,"擒王"); return true; }
  if(oL && oL.hp<=0){ finish(false,"主将殁"); return true; }
  if(foe.length===0){ finish(true); return true; }
  if(our.length===0){ finish(false); return true; }
  return false;
}
function endByAttrition(){
  const oh=aliveOf("our").reduce((a,u)=>a+u.hp,0), fh=aliveOf("foe").reduce((a,u)=>a+u.hp,0);
  finish(oh>=fh);
}
function finish(win,reason){
  B.phase="over"; B.win=win; B.reason=reason||"";
  const head = reason==="擒王" ? "斩其主将，敌军群龙无首、土崩瓦解！"
    : reason==="主将殁" ? "主将殒于阵中，王师溃散……"
    : (win?"敌军溃灭，大获全胜！":"王师力竭，败退而还……");
  B.log.unshift(head);
  const mc=document.getElementById("modal-close"); if(mc) mc.style.display="";
  const ourMax=B.units.filter(u=>u.side==="our").reduce((a,u)=>a+u.maxhp,0)||1;
  const ourHpNow=aliveOf("our").reduce((a,u)=>a+u.hp,0);
  B.result={win, ourHP:Math.round(ourHpNow/ourMax*100), rounds:B.turn};
  render();
}

/* ---------- 布阵阶段：调整己方站位 ---------- */
function deployMove(x,y){
  if(x>1) { return; }                          // 仅左两列布阵区
  if(TERRAIN[B.grid[y][x]].move>=99) return;   // 河流不可站
  const occ=unitAt(x,y);
  if(B.sel){
    const u=B.units.find(p=>p.id===B.sel);
    if(occ&&occ!==u){ // 交换
      const ox=u.x,oy=u.y; u.x=occ.x;u.y=occ.y; occ.x=ox;occ.y=oy;
    }else{ u.x=x; u.y=y; }
    B.sel=null; render();
  }else if(occ&&occ.side==="our"){ B.sel=occ.id; render(); }
}
function startBattle(){ B.phase="battle"; B.sel=null; B.turn=1; B.units.forEach(u=>u.acted=false); render(); }

/* ---------- 渲染 ---------- */
function render(){
  let cells="";
  const reach = (B.phase==="battle"&&B.sel)?reachable(B.units.find(u=>u.id===B.sel)):null;
  const selU = B.sel?B.units.find(u=>u.id===B.sel):null;
  const atkSet={};
  if(selU&&B.phase==="battle") attackTargets(selU,selU.x,selU.y).forEach(t=>atkSet[key(t.x,t.y)]=1);
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
    const t=TERRAIN[B.grid[y][x]], u=unitAt(x,y);
    let cls="wf-cell t-"+t.key;
    if(x<=1) cls+=" zone-our"; else if(x>=5) cls+=" zone-foe";
    if(reach&&reach[key(x,y)]!=null) cls+=" wf-move";
    if(atkSet[key(x,y)]) cls+=" wf-atk";
    if(selU&&selU.x===x&&selU.y===y) cls+=" wf-sel";
    let inner = t.ico?`<span class="wf-terr">${t.ico}</span>`:"";
    if(u){
      const hpPct=Math.max(0,Math.round(u.hp/u.maxhp*100));
      const side=u.side==="our"?"u-our":"u-foe";
      // 头像作标识（缺图回退为类型字）；类型小角标 + HP 条
      const face=u.face?`<img class="wf-face" src="${u.face}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'wf-glyph',textContent:'${u.icon}'}))">`
        :`<span class="wf-glyph">${u.icon}</span>`;
      const armG=(ARM[u.arm]||ARM.bu).glyph;     // 兵种角标：步/骑/弓
      inner=`<div class="wf-unit ${side}${u.acted&&u.side==="our"&&B.phase==="battle"?" acted":""}${u.isLeader?" lead":""}" data-id="${u.id}" title="${u.name}·${(ARM[u.arm]||ARM.bu).name}">
        ${face}<span class="wf-badge">${armG}</span>${u.isLeader?'<span class="wf-crown">主</span>':""}
        <span class="wf-hp"><u style="width:${hpPct}%"></u></span></div>`;
    }
    cells+=`<div class="${cls}" data-x="${x}" data-y="${y}">${inner}</div>`;
  }
  // 控制区
  let ctrl="";
  const legend=`<div class="wf-legend">兵种克制：步克骑 · 骑克弓 · 弓克步（克制 ×1.5）｜射程 步/骑1·弓2 ｜机动 骑4·步3·弓2｜<b>斩敌主将（主）即胜</b></div>`;
  if(B.phase==="deploy"){
    ctrl=`<div class="wf-tip">布阵：点己方单位再点左侧阵地格可换位（仅左二列）。摆好后开战。</div>${legend}
      <button class="btn btn-primary wf-go" id="wf-start">开 战</button>`;
  }else if(B.phase==="over"){
    ctrl=`<div class="wf-result ${B.win?"win":"lose"}">${B.win?"凯　旋":"败　北"}${B.reason?`<span class="wf-reason">· ${B.reason}</span>`:""}</div>
      <button class="btn btn-primary wf-go" id="wf-finish">${B.win?"献　捷　班　师":"收　拾　残　部"}</button>`;
  }else{
    const a=selU?(ARM[selU.arm]||ARM.bu):null;
    const sel=selU?`已选 <b>${selU.name}</b>·<em>${a.name}</em>（射程${selU.rng}·机动${selU.move}${selU.isLeader?"·主将":""}）—— ${B.moved?"已移动·":""}点<b>红格</b>攻击／点<b>蓝格</b>移动`:"点己方单位行动（蓝格=可移动·红格=可攻击）";
    ctrl=`<div class="wf-tip">第 ${B.turn}/${MAX_TURN} 回合 · ${sel}</div>${legend}
      <div class="wf-btns">${selU?`<button class="chip" id="wf-skip">原地待命</button>`:""}
        <button class="chip warn" id="wf-end">结束我方回合 ▶</button></div>`;
  }
  const log=B.log.slice(0,5).map((l,i)=>`<div class="wf-log-item${i===0?" fresh":""}">${l}</div>`).join("");
  const html=`<div class="warfield">
    <h2 class="wf-h">沙　盘　会　战 <span class="wf-vs">王师 ${aliveOf("our").length} · ${B.enemy} ${aliveOf("foe").length}</span></h2>
    <div class="wf-grid" style="grid-template-columns:repeat(${COLS},1fr)">${cells}</div>
    <div class="wf-ctrl">${ctrl}</div>
    <div class="wf-log">${log}</div>
  </div>`;
  UI.openModal(html);
  bind();
}
function bind(){
  [...document.querySelectorAll(".wf-cell")].forEach(c=>c.onclick=()=>onCell(+c.dataset.x,+c.dataset.y));
  [...document.querySelectorAll(".wf-unit")].forEach(el=>el.onclick=(e)=>{ e.stopPropagation();
    if(B.phase==="deploy") return onCell(+el.closest(".wf-cell").dataset.x,+el.closest(".wf-cell").dataset.y);
    selectUnit(el.dataset.id); });
  const s=document.getElementById("wf-start"); if(s) s.onclick=startBattle;
  const sk=document.getElementById("wf-skip"); if(sk) sk.onclick=skipUnit;
  const en=document.getElementById("wf-end"); if(en) en.onclick=()=>{ aliveOf("our").forEach(u=>u.acted=true); enemyTurn(); };
  const f=document.getElementById("wf-finish"); if(f) f.onclick=()=>{ const mc=document.getElementById("modal-close"); if(mc)mc.style.display=""; UI.closeModal(); const cb=B.onResolve,r=B.result; B=null; if(cb)cb(r); };
}

function open(cfg){
  B={enemy:cfg.enemy, grid:buildGrid(), units:[], phase:"deploy", turn:0, sel:null, moved:false,
     log:[`王师讨伐 ${cfg.enemy}，于此沙盘列阵对垒！`], onResolve:cfg.onResolve, win:false, result:null};
  B.units=buildUnits(cfg);
  autoPlace();
  if(typeof MusicSys!=="undefined") MusicSys.setScene("map");   // 沙盘沿用天下真曲(world.mp3)·不再切合成电子战鼓
  const mc=document.getElementById("modal-close"); if(mc) mc.style.display="none";  // 战中禁关闭
  render();
}
return { open, _state:()=>B };
})();
if(typeof globalThis!=="undefined") globalThis.WarfieldSys=WarfieldSys;
