/* ===================================================================
   battle.js —— 可操作战斗界面（Phase 5）
   把「番邦入寇 / 北伐 / 御驾亲征」升级为多回合战术博弈：
   每回合择一战术（强攻/坚守/设伏/突袭），与敌将对阵，
   四战术成相生相克之环：攻克突 · 突克守 · 守克伏 · 伏克攻。
   双方各有「兵势」血条，归零或八回合分胜负；
   胜负与战损（ourHP 余量）回传 Game.resolveWar 复用既有开疆/丧师结算。
   独立模块（仿 map.js），渲染进通用弹窗 #modal。
   =================================================================== */
const BattleSys = (() => {
"use strict";

/* 四战术：atk=攻击系数，def=受创系数（越低越抗打） */
const TACTICS = {
  atk: {key:"atk", name:"强攻", icon:"攻", desc:"猛攻突进，伤敌多、自损亦多", atk:1.30, def:1.20},
  def: {key:"def", name:"坚守", icon:"守", desc:"结阵固守，自损少、伤敌亦少", atk:0.70, def:0.62},
  amb: {key:"amb", name:"设伏", icon:"伏", desc:"诱敌设伏，均衡，专克强攻",   atk:1.00, def:0.90},
  raid:{key:"raid",name:"突袭", icon:"袭", desc:"轻骑突袭，爆发，专克坚守",   atk:1.22, def:1.08}
};
/* x 克 BEATS[x]：攻克突 · 突克守 · 守克伏 · 伏克攻 */
const BEATS = {atk:"raid", raid:"def", def:"amb", amb:"atk"};
const TAC_KEYS = ["atk","def","amb","raid"];
const MAX_ROUNDS = 8;

let B = null;   // 当前战斗状态
const rnd = (a,b)=>a+Math.random()*(b-a);
const counters = (a,b)=>BEATS[a]===b;

function open(cfg){
  B = {
    type:cfg.type, enemy:cfg.enemy, leader:cfg.leader,
    ourPow:Math.max(20,cfg.ourPow), enemyPow:Math.max(20,cfg.enemyPow),
    ourHP:100, enemyHP:100, round:0, log:[], over:false, win:false,
    lastP:null, lastE:null, onResolve:cfg.onResolve
  };
  if(typeof MusicSys!=="undefined") MusicSys.setScene("map");   // 用天下真曲(world.mp3)·不再切合成电子战鼓
  B.log.push(`【${B.enemy}】列阵${B.enemyPow|0} · 我军主帅 ${B.leader}（势${B.ourPow|0}）。鼓声三通，两阵对圆！`);
  // 战斗期间禁用弹窗关闭键，防中途弃战
  const mc=document.getElementById("modal-close"); if(mc) mc.style.display="none";
  prepareRound();
  render();
}

/* 敌将 AI：三成几率针对我上回合战术下克制，余则随机 */
function enemyAI(){
  if(B.lastP && Math.random()<0.35){
    for(const k in BEATS) if(BEATS[k]===B.lastP) return k;
  }
  return TAC_KEYS[Math.floor(Math.random()*TAC_KEYS.length)];
}

/* 每阵开打前定下敌军实际战术，并生成「斥候情报」（七成准），供玩家预判克制 */
function prepareRound(){
  B.enemyNext=enemyAI();
  if(Math.random()<0.70){ B.scout=B.enemyNext; B.scoutSure=true; }
  else{ const o=TAC_KEYS.filter(k=>k!==B.enemyNext); B.scout=o[Math.floor(Math.random()*o.length)]; B.scoutSure=false; }
}

function tactic(pKey){
  if(B.over || !TACTICS[pKey]) return;
  const eKey=B.enemyNext;
  const pCtr=counters(pKey,eKey), eCtr=counters(eKey,pKey);
  const pAtkMod=TACTICS[pKey].atk*(pCtr?1.4:eCtr?0.8:1);
  const eAtkMod=TACTICS[eKey].atk*(eCtr?1.4:pCtr?0.8:1);
  const norm=(B.ourPow+B.enemyPow)/2, base=15;
  const dmgE=Math.max(4,Math.round(base*pAtkMod/TACTICS[eKey].def*(B.ourPow/norm)*rnd(0.8,1.2)));
  const dmgO=Math.max(4,Math.round(base*eAtkMod/TACTICS[pKey].def*(B.enemyPow/norm)*rnd(0.8,1.2)));
  B.enemyHP=Math.max(0,B.enemyHP-dmgE);
  B.ourHP=Math.max(0,B.ourHP-dmgO);
  B.round++; B.lastP=pKey; B.lastE=eKey;
  const tip = pCtr?"（克敌·占尽先机）":eCtr?"（被克·阵脚微乱）":"";
  B.log.unshift(`第${B.round}阵：我「${TACTICS[pKey].name}」对敌「${TACTICS[eKey].name}」${tip} → 伤敌 ${dmgE}、自损 ${dmgO}。`);
  if(typeof SFX!=="undefined"){ pCtr?SFX.good&&SFX.good():SFX.deal&&SFX.deal(); }

  if(B.enemyHP<=0 || B.ourHP<=0 || B.round>=MAX_ROUNDS){
    B.over=true;
    B.win = B.ourHP>0 && (B.enemyHP<=0 || B.ourHP>B.enemyHP);
    B.log.unshift(B.win?`敌阵崩溃，我军${B.ourHP>=60?"大获全胜":"惨胜收兵"}！`:`王师力竭，败象已显……`);
  }else{
    prepareRound();
  }
  render();
}

function bar(label,v,cls){
  return `<div class="bt-side">
    <div class="bt-lab">${label}<b>${Math.round(v)}</b></div>
    <div class="bt-bar ${cls}"><i style="width:${Math.max(0,v)}%"></i></div>
  </div>`;
}

function render(){
  const ours = bar("我军 兵势", B.ourHP, "ours");
  const ene  = bar(`${B.enemy} 兵势`, B.enemyHP, "enemy");
  let actions;
  if(B.over){
    actions = `<div class="bt-end ${B.win?"win":"lose"}">${B.win?"凯　旋":"败　北"}</div>
      <button class="btn btn-primary bt-go" id="bt-finish">${B.win?"献　俘　受　降":"收　拾　残　局"}</button>`;
  }else{
    const sc=TACTICS[B.scout];
    actions = `<div class="bt-scout">斥候回报：敌军似将「<b>${sc?sc.name:"?"}</b>」 <em>${B.scoutSure?"（探报确凿）":"（雾锁敌情，未必尽实）"}</em></div>
      <div class="bt-tip">第 ${B.round+1} 阵 · 择一战术克敌（攻克突·突克守·守克伏·伏克攻）</div>
      <div class="bt-tactics">`+TAC_KEYS.map(k=>{const t=TACTICS[k];
        return `<button class="bt-tac" data-k="${k}" title="${t.desc}"><i>${t.icon}</i><b>${t.name}</b><u>克${TACTICS[BEATS[k]].name}</u></button>`;
      }).join("")+`</div>`;
  }
  const logHtml = B.log.slice(0,6).map((l,i)=>`<div class="bt-log-item${i===0&&!B.over?" fresh":""}">${l}</div>`).join("");
  const html = `<div class="battle">
    <h2 class="bt-title">沙　场　对　决</h2>
    <div class="bt-bars">${ours}${ene}</div>
    <div class="bt-actions">${actions}</div>
    <div class="bt-log">${logHtml}</div>
  </div>`;
  UI.openModal(html);

  if(B.over){
    const f=document.getElementById("bt-finish");
    if(f) f.onclick=finish;
  }else{
    [...document.querySelectorAll(".bt-tac")].forEach(b=>b.onclick=()=>tactic(b.dataset.k));
  }
}

function finish(){
  const mc=document.getElementById("modal-close"); if(mc) mc.style.display="";
  UI.closeModal();
  const res={win:B.win, ourHP:B.ourHP, rounds:B.round};
  const cb=B.onResolve; B=null;
  if(cb) cb(res);
}

return { open, tactic, finish, _state:()=>B };
})();
if(typeof globalThis!=="undefined") globalThis.BattleSys=BattleSys;
