/* ===================================================================
   quests.js —— 大业系统（P10 批1）：主线任务 / 日常 / 成就 / 称号 / 图鉴
   独立模块 QuestSys（仿 map.js / battle.js）。读 Game.s，按回合检查、发奖。
   成就+称号跨局留存于 localStorage；任务/日常/图鉴随存档。
   =================================================================== */
const QuestSys = (() => {
"use strict";

/* ---------- 主线任务链（中兴大业·逐级解锁）---------- */
const MAIN_QUESTS = [
 {id:"m_recruit", name:"求贤若渴", desc:"前往「朝堂」招贤馆，抽卡招揽第一位新贤入朝。",
  cond:s=>(s.counters&&s.counters.recruit>=1), reward:{points:10}},
 {id:"m_firstwife",name:"开枝散叶", desc:"攻略并纳第一位佳人入宫。",
  cond:s=>s.consorts.length>=1, reward:{treasury:15}},
 {id:"m_army",    name:"兵强马壮", desc:"励兵秣马，使兵力达到 70。",
  cond:s=>s.nation.military>=70, reward:{points:10}},
 {id:"m_rich",    name:"文治初兴", desc:"轻徭薄赋、广开财源，国库达到 80。",
  cond:s=>s.nation.treasury>=80, reward:{shards:5}},
 {id:"m_harem3",  name:"后宫渐盈", desc:"纳满 3 位嫔妃，开枝散叶。",
  cond:s=>s.consorts.length>=3, reward:{points:15}},
 {id:"m_war",     name:"开疆拓土", desc:"在沙场上打赢一场对外战争。",
  cond:s=>!!(s.flags&&s.flags.warWon), reward:{prestige:6,points:5}},
 {id:"m_heir",    name:"国本永固", desc:"册立太子，江山后继有人。",
  cond:s=>s.children.some(c=>c.isHeir), reward:{treasury:20}},
 {id:"m_prestige",name:"威加海内", desc:"声威远播，威望达到 70。",
  cond:s=>s.nation.prestige>=70, reward:{points:20}},
 {id:"m_elite",   name:"名将云集", desc:"招揽 2 位三星(★★★)将才入朝。",
  cond:s=>s.ministers.filter(m=>m.tier==="high"&&m.kind==="martial").length>=2, reward:{weapon:1}},
 {id:"m_sage",    name:"千古一帝", desc:"在位日久、国力鼎盛、威望卓著——成就不世明君。",
  cond:s=>s.emperor.age>=45 && avgNation(s)>=62 && s.nation.prestige>=72, reward:{points:30,title:"千古一帝"}}
];
function avgNation(s){ const n=s.nation; return (n.treasury+n.military+n.people+n.food+n.land+n.prestige)/6; }

/* ---------- 日常任务池（每月刷 3 个）---------- */
const DAILY_POOL = [
 {id:"d_govern", key:"govern", need:2, name:"勤政为民", reward:{points:3}},
 {id:"d_woo",    key:"woo",    need:2, name:"情牵佳人", reward:{shards:2}},
 {id:"d_train",  key:"train",  need:2, name:"整军经武", reward:{points:3}},
 {id:"d_recruit",key:"recruit",need:1, name:"广纳贤才", reward:{points:2}},
 {id:"d_read",   key:"read",   need:2, name:"经筵不辍", reward:{points:3}},
 {id:"d_turn",   key:"turn",   need:6, name:"日理万机", reward:{treasury:6}},
 {id:"d_visit",  key:"visit",  need:1, name:"雨露后宫", reward:{shards:2}}
];

/* ---------- 成就（跨局留存）+ 称号 ---------- */
const ACHIEVEMENTS = [
 {id:"a_first",  name:"一代之始", desc:"开创基业，纳第一位嫔妃。", cond:s=>s.consorts.length>=1},
 {id:"a_twelve", name:"后宫十二钗", desc:"集齐全部 12 位佳丽入宫。", cond:s=>s.consorts.length>=12, title:"风流天子"},
 {id:"a_war5",   name:"百战之君", desc:"累计打赢 5 场战争。", cond:s=>(s.counters&&s.counters.battlewin>=5), title:"马上皇帝"},
 {id:"a_rich",   name:"富甲天下", desc:"国库达到 95。", cond:s=>s.nation.treasury>=95},
 {id:"a_prestige",name:"万邦来朝", desc:"威望达到 90。", cond:s=>s.nation.prestige>=90, title:"天可汗"},
 {id:"a_elite3", name:"猛将如云", desc:"麾下同时拥有 3 位三星将才。", cond:s=>s.ministers.filter(m=>m.tier==="high"&&m.kind==="martial").length>=3},
 {id:"a_arsenal",name:"十八般兵器", desc:"集齐全部 8 件神兵。", cond:s=>(s.weapons||[]).length>=8, title:"神兵之主"},
 {id:"a_children",name:"多子多福", desc:"育有 5 位皇嗣。", cond:s=>s.children.length>=5},
 {id:"a_gen2",   name:"江山永祚", desc:"传位至第 2 代。", cond:s=>s.gen>=2, title:"开国太祖"},
 {id:"a_map",    name:"混一寰宇", desc:"占据 8 个以上州郡。", cond:s=>(s.map&&s.map.regions?Object.values(s.map.regions).filter(r=>r.owner==="self").length>=8:false), title:"一统之君"},
 {id:"a_int",    name:"博通古今", desc:"帝王智力达到 90。", cond:s=>s.emperor.int>=90},
 {id:"a_martial",name:"勇冠三军", desc:"帝王武力达到 90。", cond:s=>s.emperor.martial>=90},
 {id:"a_sage",   name:"圣君之名", desc:"以千古一帝之姿落幕。", cond:s=>s._sageWin, title:"圣祖"},
 {id:"a_long",   name:"长治久安", desc:"在位满 20 年。", cond:s=>s.nation.year>=20, title:"中兴之主"}
];

/* ---------- 留存存取 ---------- */
const LS_ACH="zjjs_ach", LS_TITLE="zjjs_title";
function lsGet(k,d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch(e){ return d; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
function unlockedAch(){ return lsGet(LS_ACH,[]); }
function equippedTitle(){ return lsGet(LS_TITLE,""); }
function setTitle(t){ lsSet(LS_TITLE,t); }
function availableTitles(){ const got=unlockedAch(); return ACHIEVEMENTS.filter(a=>a.title&&got.includes(a.id)).map(a=>a.title); }

/* ---------- 状态初始化（随存档）---------- */
function initState(s){
  if(!s.quest) s.quest={mainIdx:0, daily:[], dailyMonth:-1};
  if(!s.counters) s.counters={};
  if(!s.codex) s.codex={consorts:[],weapons:[],events:[]};
  if(!s.quest.daily || !s.quest.daily.length) refreshDaily(s);
}

/* ---------- 计数 / 图鉴 ---------- */
function tally(s,key,n){
  if(!s.counters) s.counters={};
  s.counters[key]=(s.counters[key]||0)+(n||1);
  // 推进日常
  (s.quest&&s.quest.daily||[]).forEach(t=>{ if(!t.done && t.key===key){ t.prog=Math.min(t.need,(t.prog||0)+(n||1)); } });
}
function see(s,cat,id){
  if(!s.codex) s.codex={consorts:[],weapons:[],events:[]};
  const a=s.codex[cat]; if(a && !a.includes(id)) a.push(id);
}

/* ---------- 日常刷新（每月）---------- */
function refreshDaily(s){
  const picks=R.shuffle(DAILY_POOL).slice(0,3).map(d=>({id:d.id,key:d.key,need:d.need,name:d.name,reward:d.reward,prog:0,done:false}));
  s.quest.daily=picks; s.quest.dailyMonth=s.nation?s.nation.month:0;
}

/* ---------- 发奖 ---------- */
function grant(s,rw){
  if(!rw) return "";
  const p=[];
  if(rw.points){ s.recruitPoints=(s.recruitPoints||0)+rw.points; p.push("招贤点+"+rw.points); }
  if(rw.shards){ s.shards=(s.shards||0)+rw.shards; p.push("碎片+"+rw.shards); }
  if(rw.treasury){ s.nation.treasury=R.clamp(s.nation.treasury+rw.treasury); p.push("国库+"+rw.treasury); }
  if(rw.prestige){ s.nation.prestige=R.clamp(s.nation.prestige+rw.prestige); p.push("威望+"+rw.prestige); }
  if(rw.weapon && typeof Game!=="undefined"){ const w=rollWeapon(); if(!s.weapons)s.weapons=[]; if(!s.weapons.includes(w.id)){s.weapons.push(w.id); p.push("神兵·"+w.name);} else {s.shards=(s.shards||0)+3; p.push("碎片+3");} }
  return p.join("·");
}

/* ---------- 每回合检查：主线完成 / 日常完成 / 成就解锁 ---------- */
function check(s){
  const G=(typeof Game!=="undefined")?Game:null;
  const notes=[];
  // 主线
  while(s.quest.mainIdx<MAIN_QUESTS.length){
    const q=MAIN_QUESTS[s.quest.mainIdx];
    if(!q.cond(s)) break;
    const rwTxt=grant(s,q.reward);
    if(q.reward&&q.reward.title){ const got=unlockedAch(); /* 主线称号直接给 */ }
    s.quest.mainIdx++;
    notes.push(`大业达成·${q.name}！${rwTxt?("（"+rwTxt+"）"):""}`);
    if(G){ G.logMsg(`【大业】${q.name} 达成。${rwTxt}`); }
  }
  // 日常
  (s.quest.daily||[]).forEach(t=>{
    if(!t.done && (t.prog||0)>=t.need){ t.done=true; const rwTxt=grant(s,t.reward); notes.push(`日课完成·${t.name}（${rwTxt}）`); }
  });
  // 成就（跨局留存）
  const got=unlockedAch(); let changed=false;
  ACHIEVEMENTS.forEach(a=>{
    if(!got.includes(a.id) && a.cond(s)){
      got.push(a.id); changed=true;
      notes.push(`成就解锁·${a.name}${a.title?("（得称号「"+a.title+"」）"):""}`);
      if(a.title && !equippedTitle()) setTitle(a.title);   // 首个称号自动佩戴
    }
  });
  if(changed) lsSet(LS_ACH,got);
  // 反馈
  if(G && notes.length){ notes.forEach(n=>G.toast(n)); }
  return notes;
}

/* ---------- UI 渲染 ---------- */
function curMain(s){ return MAIN_QUESTS[s.quest?s.quest.mainIdx:0] || null; }
function bar(v,max,color){ const p=Math.min(100,Math.round(v/max*100)); return `<span class="mini-bar"><i style="width:${p}%;background:${color}"></i></span>`; }

function renderBody(s){
  const tab=(s._questTab||"main");
  let h=`<div class="q-tabs">
    ${["main","成就","图鉴","称号"].map((k,i)=>{const id=["main","ach","codex","title"][i];const nm=["任务","成就","图鉴","称号"][i];
      return `<button class="q-tab ${tab===id?"on":""}" onclick="Game.questTab('${id}')">${nm}</button>`;}).join("")}
  </div>`;
  if(tab==="main"){
    const q=curMain(s);
    h+=`<h3 class="harem-sec">主线 · 中兴大业</h3>`;
    if(q) h+=`<div class="q-card cur"><div class="q-h"><b>${q.name}</b><span class="q-step">${s.quest.mainIdx+1}/${MAIN_QUESTS.length}</span></div>
      <div class="q-desc">${q.desc}</div><div class="q-rw">奖励：${rwText(q.reward)}</div></div>`;
    else h+=`<p class="panel-tip">中兴大业已全数达成，你已是名垂青史的一代雄主！</p>`;
    // 已完成主线（折叠简列）
    if(s.quest.mainIdx>0){ h+=`<div class="q-done-list">已成：`+MAIN_QUESTS.slice(0,s.quest.mainIdx).map(m=>`<span>✓${m.name}</span>`).join(" ")+`</div>`; }
    h+=`<h3 class="harem-sec">日课 · 每月轮替</h3>`;
    h+=(s.quest.daily||[]).map(t=>`<div class="q-card ${t.done?"done":""}">
      <div class="q-h"><b>${t.name}</b>${t.done?`<span class="q-ok">✓ 已领</span>`:`<span class="q-step">${t.prog||0}/${t.need}</span>`}</div>
      ${t.done?"":`<div class="q-pbar">${bar(t.prog||0,t.need,"#6ca9e0")}</div>`}
      <div class="q-rw">奖励：${rwText(t.reward)}</div></div>`).join("");
  }
  else if(tab==="ach"){
    const got=unlockedAch();
    h+=`<h3 class="harem-sec">成就（${got.length}/${ACHIEVEMENTS.length}）</h3>`;
    h+=ACHIEVEMENTS.map(a=>{const on=got.includes(a.id);
      return `<div class="q-card ${on?"":"locked"}"><div class="q-h"><b>${on?a.name:"未解之业 ???"}</b>${a.title?`<span class="q-title">称号·${a.title}</span>`:""}</div>
        <div class="q-desc">${on?a.desc:"（未解锁）"}</div></div>`;
    }).join("");
  }
  else if(tab==="codex"){
    h+=`<h3 class="harem-sec">后宫图鉴（${s.codex.consorts.length}/${CONSORTS.length}）</h3><div class="codex-grid">`;
    h+=CONSORTS.map(c=>{const on=s.codex.consorts.includes(c.id);
      return `<div class="cdx ${on?"":"locked"}" title="${on?c.name:"未解锁"}">${on?`<img src="${c.portrait}" loading="lazy">`:`<div class="cdx-silh">？</div>`}<span>${on?c.name:"？？"}</span></div>`;}).join("")+`</div>`;
    h+=`<h3 class="harem-sec">武库图鉴（${s.codex.weapons.length}/${WEAPONS.length}）</h3><div class="codex-grid">`;
    h+=WEAPONS.map(w=>{const on=s.codex.weapons.includes(w.id);
      return `<div class="cdx ${on?"":"locked"}" title="${on?w.name:"未得"}">${on?`<img src="${w.img}" loading="lazy">`:`<div class="cdx-silh">？</div>`}<span>${on?w.name:"？？"}</span></div>`;}).join("")+`</div>`;
    h+=`<p class="panel-tip">奇遇见闻：已历 <b>${s.codex.events.length}</b> 桩朝堂奇遇。</p>`;
  }
  else if(tab==="title"){
    const titles=availableTitles(), cur=equippedTitle();
    h+=`<h3 class="harem-sec">称号 · 挂于帝号之前</h3>`;
    h+=`<p class="panel-tip">达成带称号的成就即可解锁。当前：<b>${cur||"（无）"}</b></p>`;
    h+=`<div class="title-list"><button class="chip ${!cur?"on":""}" onclick="Game.equipTitle('')">不佩戴</button>`+
      titles.map(t=>`<button class="chip ${cur===t?"on":""}" onclick="Game.equipTitle('${t}')">${t}</button>`).join("")+`</div>`;
    if(!titles.length) h+=`<p class="panel-tip">尚无称号——多多达成成就以获取。</p>`;
  }
  return h;
}
function rwText(rw){ if(!rw)return"—"; const p=[]; if(rw.points)p.push("招贤点+"+rw.points); if(rw.shards)p.push("碎片+"+rw.shards); if(rw.treasury)p.push("国库+"+rw.treasury); if(rw.prestige)p.push("威望+"+rw.prestige); if(rw.weapon)p.push("神兵×1"); if(rw.title)p.push("称号「"+rw.title+"」"); return p.join("·"); }

return { initState, tally, see, refreshDaily, check, renderBody, curMain,
  unlockedAch, equippedTitle, setTitle, availableTitles,
  MAIN_QUESTS, ACHIEVEMENTS };
})();
if(typeof globalThis!=="undefined") globalThis.QuestSys=QuestSys;
