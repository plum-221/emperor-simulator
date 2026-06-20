/* ===================================================================
   spy.js —— 密谍司（探查百官私下勾当·每晚密报·真账可处置）
   核心：每位人物有一层平时不可见的 secret（真实忠诚/结党/贪墨/通敌/构陷），
   每天暗中演化(tick)；密谍司投入越深、眼线越准，揭得越全。
   入夜出密报——报的是模型真值 delta，不是随机花絮。
   依赖全局：R、PERSONALITIES、castName/castById。Game 负责扣资源/弹窗/爆大事件。
   =================================================================== */
const SpySys = (() => {
"use strict";

const MAXLV=5;
const upgradeCost = lv => 18 + lv*14;                 // 升级耗国库
const accuracyOf  = lv => Math.min(1, 0.46 + lv*0.11);// 侦查准度：lv1≈.57 … lv5≈1.0
const agentsOf    = lv => 1 + lv;                     // 可同时派谍人数

/* ---------- 隐藏状态初始化 ---------- */
function initSecret(m){
  const amb=m.ambition||0, loy=m.loyalty||60, P=PERSONALITIES[m.personality]||{};
  // 奸贪者真忠诚低于表面（戴面具）；忠直者真忠诚≈表面
  let gap = Math.max(0, amb-40)*0.55 - (P.loyDrift>0?P.loyDrift*5:0);
  if(m.personality==="奸诈") gap+=12;
  if(m.personality==="贪婪") gap+=8;
  m.secret = {
    trueLoyalty:R.clamp(loy-gap),
    cabal:{progress:0, allies:[]},   // 结党谋逆
    graft:0,                          // 贪墨腐败
    treason:0,                        // 通敌外炸
    scheme:{target:null, progress:0}  // 私情构陷
  };
}
function ensure(s){ (s.ministers||[]).forEach(m=>{ if(!m.secret) initSecret(m); }); }

/* ---------- 部门初始化 ---------- */
function init(s){
  if(!s.spy) s.spy={ est:false, level:1, watch:[], lastNight:null, knownPlots:{} };
  ensure(s);
}
function established(s){ return s.spy && s.spy.est; }

/* 设立/掌印：乐祈（密谍提督）在朝则准度更高 */
function spymasterBonus(s){ return (s.ministers||[]).some(m=>m.post==="spymaster")?1:0; }
function effLevel(s){ return Math.min(MAXLV, (s.spy.level||1)+spymasterBonus(s)); }

/* ---------- 每日暗中演化 ---------- */
function tick(s){
  ensure(s);
  const atWar=!!(s.flags&&s.flags.atWar);
  const inCourt = id => (s.ministers||[]).some(x=>(x.castId||x.id)===id);
  s.ministers.forEach(m=>{
    const sec=m.secret, P=PERSONALITIES[m.personality]||{}, amb=m.ambition||0;
    // 真实忠诚漂移：性情主导（奸贪缓降·忠直缓升），表面 loyalty 不动（面具）
    sec.trueLoyalty=R.clamp(sec.trueLoyalty + (P.loyDrift||0)*0.12 - (amb>55?0.05:0));
    const disloyal = sec.trueLoyalty<45;
    // 结党：野心高 + 真忠诚低 + 有同党/盟友在朝 → 进度涨
    const allies=(m.rel||[]).filter(r=>r.type==="同党"||r.type==="盟友").map(r=>r.to).filter(inCourt);
    if(amb>45 && disloyal){
      sec.cabal.allies=allies;
      sec.cabal.progress=R.clamp(sec.cabal.progress + (amb-45)/45 + allies.length*0.35);
    }else sec.cabal.progress=Math.max(0,sec.cabal.progress-0.4);
    // 贪墨：贪婪性情 或 肥缺 + 真忠诚不高
    const rich=["finance","steward","navy","chancellor"].includes(m.post);
    if(m.personality==="贪婪"||(rich&&sec.trueLoyalty<58))
      sec.graft=R.clamp(sec.graft + (rich?0.7:0.25) + (m.personality==="贪婪"?0.3:0));
    // 通敌：武将 + 拥兵 + 真忠诚极低（战时更易）
    const power=["marshal","huben","defense","navy"].includes(m.post);
    if(m.kind==="martial"&&power&&sec.trueLoyalty<35)
      sec.treason=R.clamp(sec.treason + 0.45 + (atWar?0.3:0));
    else sec.treason=Math.max(0,sec.treason-0.2);
    // 构陷：奸诈/圆滑 对 政敌/世仇 暗中下绊
    const foe=(m.rel||[]).find(r=>(r.type==="政敌"||r.type==="世仇")&&inCourt(r.to));
    if(foe&&(m.personality==="奸诈"||m.personality==="圆滑")&&amb>40){
      sec.scheme.target=foe.to;
      sec.scheme.progress=R.clamp(sec.scheme.progress+0.5);
    }else sec.scheme.progress=Math.max(0,sec.scheme.progress-0.3);
  });
}

/* ---------- 玩家所知情报（按准度加噪） ---------- */
function jitter(v,acc){ if(acc>=1) return Math.round(v); const n=(1-acc)*30; return R.clamp(Math.round(v + (Math.random()*2-1)*n)); }
function watched(s,m){ return (s.spy.watch||[]).includes(m.castId||m.id); }
function intel(s,m){
  const acc=accuracyOf(effLevel(s));
  const showAllies = effLevel(s)>=3;
  return {
    acc, trueLoyalty:jitter(m.secret.trueLoyalty,acc), faceLoyalty:Math.round(m.loyalty),
    cabal:jitter(m.secret.cabal.progress,acc), graft:jitter(m.secret.graft,acc),
    treason:jitter(m.secret.treason,acc), scheme:jitter(m.secret.scheme.progress,acc),
    allies: showAllies ? (m.secret.cabal.allies||[]) : null,
    schemeTarget: showAllies ? m.secret.scheme.target : null
  };
}
/* 最大隐患排序（供高阶自动侦知 + 密报择要） */
function threatScore(m){ const x=m.secret; return x.cabal.progress*1.2 + x.treason*1.4 + x.graft*0.6 + x.scheme.progress*0.5 + (60-x.trueLoyalty)*0.3; }

/* ---------- 每晚密报：报真账 delta ---------- */
function nightReport(s){
  if(!established(s)) return null;
  ensure(s);
  const lv=effLevel(s);
  // 侦查对象：派谍盯防者 + 高阶自动盯最大隐患
  const auto = lv>=4 ? 2 : (lv>=2?1:0);
  const watch = new Set(s.spy.watch||[]);
  const sorted=[...s.ministers].sort((a,b)=>threatScore(b)-threatScore(a));
  sorted.slice(0,auto).forEach(m=>watch.add(m.castId||m.id));
  const targets=s.ministers.filter(m=>watch.has(m.castId||m.id));
  const items=[]; let alert=false;
  targets.forEach(m=>{
    const I=intel(s,m); const lines=[];
    if(I.cabal>=20){ const al=I.allies&&I.allies.length?`（同谋 ${I.allies.map(castName).join("、")}）`:"（同谋未明）";
      lines.push(`结党 <b class="sp-bad">${I.cabal}</b>${al}`); if(I.cabal>=60)alert=true; }
    if(I.graft>=20) lines.push(`贪墨 <b class="sp-bad">${I.graft}</b>`);
    if(I.treason>=20){ lines.push(`通敌 <b class="sp-bad">${I.treason}</b>`); if(I.treason>=55)alert=true; }
    if(I.scheme>=25){ const t=I.schemeTarget?`构陷 ${castName(I.schemeTarget)}`:"暗布构陷"; lines.push(`<b class="sp-bad">${t}</b> ${I.scheme}`); }
    const mask = Math.abs(I.faceLoyalty-I.trueLoyalty)>=15 ? `（表面 ${I.faceLoyalty}）` : "";
    if(lines.length) items.push({ id:m.castId||m.id, name:m.name, title:m.title||"",
      trueLoyalty:I.trueLoyalty, mask, lines });
  });
  const rec={ day:`${s.nation.year}年${["","正","二","三","四","五","六","七","八","九","十","冬","腊"][s.nation.month]}月${s.nation.day}日`,
    items, alert, acc:Math.round(accuracyOf(lv)*100) };
  s.spy.lastNight=rec;
  return rec;
}

/* ---------- 派谍 / 升级 ---------- */
function canWatchMore(s){ return (s.spy.watch||[]).length < agentsOf(s.spy.level||1); }
function toggleWatch(s,id){
  s.spy.watch=s.spy.watch||[];
  const i=s.spy.watch.indexOf(id);
  if(i>=0){ s.spy.watch.splice(i,1); return "off"; }
  if(!canWatchMore(s)) return "full";
  s.spy.watch.push(id); return "on";
}

/* ---------- 管理面板 HTML ---------- */
function panelHTML(s){
  const lv=s.spy.level||1, eff=effLevel(s), acc=Math.round(accuracyOf(eff)*100), cap=agentsOf(lv);
  const boss=spymasterBonus(s);
  let h=`<div class="spy">
    <h2 class="spy-h">⟁ 密 谍 司</h2>`;
  if(!established(s)){
    h+=`<p class="spy-tip">设立密谍司，置耳目于朝野，密察百官私行。每夜密报，真伪立判。</p>
      <button class="btn btn-primary spy-go" onclick="Game.spyEstablish()">⟁ 设立密谍司（耗国库 15）</button>
      <p class="spy-tip dim">※ 若密谍提督（乐祈）在朝执掌，侦查更精。</p></div>`;
    return h;
  }
  h+=`<div class="spy-stat">
      <span>司阶 <b>Lv${lv}</b>${boss?`<span class="spy-boss">+提督</span>`:""}</span>
      <span>侦查准度 <b>${acc}%</b></span>
      <span>眼线 <b>${(s.spy.watch||[]).length}/${cap}</b></span></div>`;
  if(lv<MAXLV) h+=`<button class="chip gold" onclick="Game.spyUpgrade()">扩充密谍司 Lv${lv}→${lv+1}（耗国库 ${upgradeCost(lv)}）</button>`;
  h+=`<p class="spy-tip">点「盯防」派谍密察其人。司阶越高，所报越准、并自动盯查最大隐患。</p>
    <div class="spy-list">`;
  // 按隐患排序列出在朝百官 + 已知情报
  const sorted=[...s.ministers].sort((a,b)=>threatScore(b)-threatScore(a));
  sorted.forEach(m=>{
    const on=watched(s,m), I=intel(s,m);
    const tags=[];
    if(I.cabal>=15) tags.push(`<span class="sp-tag bad">结党${I.cabal}</span>`);
    if(I.treason>=15) tags.push(`<span class="sp-tag bad">通敌${I.treason}</span>`);
    if(I.graft>=15) tags.push(`<span class="sp-tag warn">贪墨${I.graft}</span>`);
    if(I.scheme>=20) tags.push(`<span class="sp-tag warn">构陷${I.scheme}</span>`);
    const known = on || eff>=4;
    h+=`<div class="spy-row ${on?'on':''}">
      <div class="spy-who"><b>${m.name}</b><span class="spy-title">${m.title||""}</span></div>
      <div class="spy-intel">${known?`真忠 <b class="${I.trueLoyalty<45?'sp-bad':'sp-ok'}">${I.trueLoyalty}</b>${Math.abs(I.faceLoyalty-I.trueLoyalty)>=15?`<span class="dim">(表${I.faceLoyalty})</span>`:""} ${tags.join("")||'<span class="dim">暂无异动</span>'}`:`<span class="dim">未派谍·内情不明</span>`}</div>
      <div class="spy-ops">
        <button class="chip ${on?'on':''}" onclick="Game.spyWatch('${m.castId||m.id}')">${on?'✓盯防':'盯防'}</button>
        ${known?spyOpsHTML(m,I):""}
      </div></div>`;
  });
  h+=`</div></div>`;
  return h;
}
/* 处置按钮（B2：查抄/敲打/拿问/收买） */
function spyOpsHTML(m,I){
  let b="";
  if(I.graft>=25) b+=`<button class="chip" onclick="Game.spyAudit('${m.castId||m.id}')" title="查抄贪墨·追回国库">查抄</button>`;
  if(I.cabal>=25||I.scheme>=25) b+=`<button class="chip" onclick="Game.spyWarn('${m.castId||m.id}')" title="敲打警告·挫其结党/构陷">敲打</button>`;
  if(I.cabal>=55||I.treason>=45) b+=`<button class="chip danger" onclick="Game.spyArrest('${m.castId||m.id}')" title="先发制人·拿问下狱">拿问</button>`;
  return b;
}

/* ---------- 密报弹窗 HTML ---------- */
function reportHTML(rec){
  let h=`<div class="spyreport ${rec.alert?'alert':''}">
    <div class="spr-seal">⟁</div>
    <h2 class="spr-h">密 谍 司 · 夜 报</h2>
    <div class="spr-sub">${rec.day} 戌时密呈 · 侦准 ${rec.acc}%</div>`;
  if(!rec.items.length){
    h+=`<p class="spr-quiet">是夜朝野安靖，未见异动。</p>`;
  }else{
    if(rec.alert) h+=`<div class="spr-alert">⚠ 有大患将成，伏望圣裁！</div>`;
    h+=`<div class="spr-items">`+rec.items.map(it=>`<div class="spr-item">
      <div class="spr-who">${it.title?`<span class="spr-t">${it.title}</span>`:""}<b>${it.name}</b>
        <span class="spr-loy">真忠 ${it.trueLoyalty}${it.mask}</span></div>
      <div class="spr-lines">${it.lines.join(" · ")}</div></div>`).join("")+`</div>`;
    h+=`<p class="spr-foot">详情可往「朝堂 → 密谍司」处置。</p>`;
  }
  h+=`</div>`;
  return h;
}

return { init, ensure, established, tick, nightReport, intel, threatScore,
  toggleWatch, panelHTML, reportHTML, effLevel, upgradeCost, initSecret, MAXLV };
})();
if(typeof globalThis!=="undefined") globalThis.SpySys=SpySys;
