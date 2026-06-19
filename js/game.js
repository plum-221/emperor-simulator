/* ===================================================================
   game.js —— 游戏引擎
   负责：状态管理 / 事件调度（队列+随机池）/ 选项结算 / 时间流逝 /
         死亡判定 / 结局评定 / 存档（结局图鉴·最佳记录）
   =================================================================== */
(() => {
"use strict";

/* ---------- DOM ---------- */
const $ = id => document.getElementById(id);
const screens = {title:$("screen-title"), game:$("screen-game"), end:$("screen-end")};
const elStats=$("stats"), elCard=$("card"), elPortrait=$("portrait"),
      elSpeaker=$("speaker"), elTitle=$("card-title"), elText=$("card-text"),
      elChoices=$("choices"), elReignName=$("reign-name"), elReignMeta=$("reign-meta");

/* ---------- 常量 ---------- */
const STAT_KEYS=["people","treasury","military","court"];
const STAT_LABEL={people:"民心",treasury:"国库",military:"军事",court:"朝堂"};
const SEASONS=["春","夏","秋","冬"];
const REIGN_NAMES=["永熙","天启","建元","贞观","开元","洪武","嘉靖","万历","太初","神武","景泰","天圣","元丰","承平","乾元","昭武"];
const TEMPLE_GOOD=["太宗","世祖","仁宗","圣祖","高宗"];
const TEMPLE_BAD=["炀帝","灵帝","厉帝","哀帝","幽帝"];

const LS_END="zjtx_endings", LS_BEST="zjtx_best", LS_MUTE="zjtx_mute";

/* 由 events 自动推导“剧情链专属事件”（被任何 next 引用的 id 不进随机池） */
const CHAIN_TARGETS = new Set();
Object.values(EVENTS).forEach(ev=>ev.choices.forEach(c=>{
  if(!c.next) return;
  (Array.isArray(c.next)?c.next:[c.next]).forEach(id=>CHAIN_TARGETS.add(id));
}));
const POOL_IDS = Object.keys(EVENTS).filter(id=>!CHAIN_TARGETS.has(id) && !id.startsWith("intro"));

/* ---------- 状态 ---------- */
let state, lastId=null, busy=false;

function newState(dynasty,name){
  return {
    dynasty: dynasty||"大宁",
    name: name||"无名",
    reign: REIGN_NAMES[Math.floor(Math.random()*REIGN_NAMES.length)],
    stats:{people:50,treasury:50,military:50,court:50},
    year:1, season:0, age:18+Math.floor(Math.random()*5),
    turn:0, flags:{}, used:new Set(), queue:["intro_1","intro_2"]
  };
}

/* ---------- 屏幕切换 ---------- */
function show(name){
  Object.values(screens).forEach(s=>s.classList.remove("active"));
  screens[name].classList.add("active");
}

/* ---------- 状态条渲染 ---------- */
function renderStats(flashKeys=[]){
  elStats.innerHTML = STAT_KEYS.map(k=>`
    <div class="stat s-${k} ${flashKeys.includes(k)?"flash":""}">
      <div class="stat-icon">${ART.icon(k)}</div>
      <div class="stat-name">${STAT_LABEL[k]}</div>
      <div class="stat-bar"><div class="stat-fill" style="width:${state.stats[k]}%"></div></div>
    </div>`).join("");
}

function renderTopbar(){
  elReignName.textContent = `${state.dynasty} · ${state.reign}`;
  const yr = state.year===1 ? "在位元年" : `在位${state.year}年`;
  elReignMeta.textContent = `${yr} · ${SEASONS[state.season]} · 圣寿${state.age}`;
}

/* ---------- 选项数值提示（只显示方向，不显示具体数值，留些悬念） ---------- */
function hintHTML(effects){
  if(!effects) return "";
  const dots = STAT_KEYS.filter(k=>effects[k]).map(k=>{
    const dir = effects[k]>0 ? "up" : "down";
    return `<i class="h-${k} ${dir}"></i>`;
  });
  return dots.length ? `<span class="hint">${dots.join("")}</span>` : "";
}

/* ---------- 渲染一张事件卡 ---------- */
function renderEvent(ev){
  const role = ev.role || "chancellor";
  elPortrait.innerHTML = ART.portrait(role);
  elSpeaker.textContent = SPEAKERS[role] || role;
  elTitle.textContent = ev.title;
  elText.textContent = ev.text;

  const choices = ev.choices.filter(c=>!c.cond || c.cond(state));
  elChoices.innerHTML = choices.map((c,i)=>`
    <button class="choice" data-i="${i}">
      <span>${c.text}</span>${hintHTML(c.effects)}
    </button>`).join("");
  [...elChoices.children].forEach((btn,i)=>{
    btn.addEventListener("click",()=>onChoice(ev,choices[i]),{once:true});
  });

  elCard.classList.remove("deal"); void elCard.offsetWidth; elCard.classList.add("deal");
  SFX.deal();
}

/* ---------- 选项结算 ---------- */
function onChoice(ev, choice){
  if(busy) return; busy=true;
  SFX.pick();

  // 标记
  if(choice.set) Object.entries(choice.set).forEach(([k,v])=>{
    if(k in state.stats) return;            // 安全：set 只写 flags
    state.flags[k]=v;
  });

  // 数值结算
  const flash=[]; let net=0;
  if(choice.effects){
    STAT_KEYS.forEach(k=>{
      if(choice.effects[k]){
        state.stats[k]+=choice.effects[k];
        net+=choice.effects[k]; flash.push(k);
      }
    });
  }

  // 飞牌动画方向
  const dir = net>=0 ? "right":"left";
  elCard.classList.add("leave-"+dir);

  setTimeout(()=>{
    elCard.classList.remove("leave-left","leave-right");
    renderStats(flash);
    if(net>0) SFX.good(); else if(net<0) SFX.bad();

    // 直接触发剧情结局
    if(choice.end){ gameOver(choice.end); busy=false; return; }

    // 把后续剧情压入队首
    if(choice.next){
      const arr = Array.isArray(choice.next)?choice.next:[choice.next];
      state.queue.unshift(...arr);
    }

    // 死亡判定（四维触底/爆表）
    const death = checkExtremes();
    if(death){ gameOver(death); busy=false; return; }

    advanceTime();                          // 时间流逝（可能触发寿终）
    if(!state.alive){ busy=false; return; }

    renderTopbar();
    nextTurn();
    busy=false;
  },340);
}

/* ---------- 四维极值判定 ---------- */
function checkExtremes(){
  for(const k of STAT_KEYS){
    if(state.stats[k]<=0) return k+"_low";
    if(state.stats[k]>=100) return k+"_high";
  }
  return null;
}

/* ---------- 时间流逝 + 寿终判定 ---------- */
function advanceTime(){
  state.turn++;
  state.season=(state.season+1)%4;
  if(state.season===0){                     // 又是一年春
    state.year++; state.age++;
    if(state.age>=50){
      const chance=(state.age-49)*5;        // 年岁越高，天年将尽
      if(Math.random()*100 < chance){ gameOver(naturalEnding()); state.alive=false; }
    }
  }
}

/* ---------- 评分 & 寿终结局分级 ---------- */
function avgStat(){ return STAT_KEYS.reduce((a,k)=>a+state.stats[k],0)/4; }
function score(){ return Math.round(state.year*100 + avgStat()*10); }

function naturalEnding(){
  const avg=avgStat(), allOk=STAT_KEYS.every(k=>state.stats[k]>=45);
  if(state.year>=30 && allOk) return "age_sage";
  if(state.year>=18 && avg>=50) return "age_good";
  if(avg>=40) return "age_mid";
  return "age_bad";
}

function templeName(ending){
  if(ending.good){
    const i=Math.min(TEMPLE_GOOD.length-1, Math.floor(score()/600));
    return "庙号 · "+TEMPLE_GOOD[i];
  }
  if(ending.bad){
    const i=Math.min(TEMPLE_BAD.length-1, Math.floor((4000-score())/700));
    return "谥号 · "+TEMPLE_BAD[Math.max(0,i)];
  }
  return "庙号 · 平";
}

/* ---------- 结局 ---------- */
function gameOver(endId){
  state.alive=false;
  const e = ENDINGS[endId] || ENDINGS.age_mid;
  SFX.end();
  unlockEnding(endId);
  saveBest();

  $("end-seal").textContent = e.seal;
  $("end-temple").textContent = templeName(e);
  $("end-title").textContent = e.title;
  $("end-desc").textContent = e.desc;
  $("end-stats").innerHTML = `
    <div><b>${state.year}</b>在位年数</div>
    <div><b>${state.age}</b>享年</div>
    <div><b>${score()}</b>国运评分</div>`;
  show("end");
}

/* ---------- 主循环：抽取下一张卡 ---------- */
function pickFromPool(){
  let cands = POOL_IDS.filter(id=>{
    const ev=EVENTS[id];
    if(id===lastId) return false;
    if(!ev.repeat && state.used.has(id)) return false;
    if(ev.cond && !ev.cond(state)) return false;
    return true;
  });
  if(!cands.length){                        // 兜底：放开“不重复上一张”
    cands = POOL_IDS.filter(id=>{
      const ev=EVENTS[id];
      if(!ev.repeat && state.used.has(id)) return false;
      if(ev.cond && !ev.cond(state)) return false;
      return true;
    });
  }
  if(!cands.length) return null;
  // 加权随机
  const total=cands.reduce((a,id)=>a+(EVENTS[id].weight||1),0);
  let r=Math.random()*total;
  for(const id of cands){ r-=(EVENTS[id].weight||1); if(r<=0) return id; }
  return cands[cands.length-1];
}

function nextTurn(){
  let id=null;
  while(state.queue.length){
    const q=state.queue.shift();
    const ev=EVENTS[q];
    if(ev && (!ev.cond || ev.cond(state))){ id=q; break; }   // 条件不满足的链节点跳过
  }
  if(!id) id=pickFromPool();
  if(!id){ gameOver(naturalEnding()); return; }              // 极端兜底
  lastId=id;
  if(!EVENTS[id].repeat) state.used.add(id);
  renderEvent(EVENTS[id]);
}

/* ---------- 开局 ---------- */
function startGame(){
  state=newState($("inp-dynasty").value.trim(), $("inp-name").value.trim());
  state.alive=true; lastId=null;
  SFX.unlock(); SFX.gong();
  renderStats(); renderTopbar(); show("game");
  nextTurn();
}

/* ===================================================================
   存档：结局图鉴 + 最佳记录 + 静音
   =================================================================== */
function getUnlocked(){ try{return JSON.parse(localStorage.getItem(LS_END))||[];}catch{return[];} }
function unlockEnding(id){
  const set=new Set(getUnlocked()); set.add(id);
  localStorage.setItem(LS_END, JSON.stringify([...set]));
}
function saveBest(){
  const best=JSON.parse(localStorage.getItem(LS_BEST)||"null");
  const cur={years:state.year, score:score(), dynasty:state.dynasty, reign:state.reign};
  if(!best || cur.score>best.score) localStorage.setItem(LS_BEST, JSON.stringify(cur));
}
function showRecord(){
  const best=JSON.parse(localStorage.getItem(LS_BEST)||"null");
  $("title-record").textContent = best
    ? `最长国祚：${best.dynasty}·${best.reign}　在位${best.years}年　国运${best.score}`
    : "尚未有帝王的传说……";
}

/* ---------- 弹窗 ---------- */
const modal=$("modal"), modalContent=$("modal-content");
function openModal(html){ modalContent.innerHTML=html; modal.classList.add("open"); }
$("modal-close").addEventListener("click",()=>modal.classList.remove("open"));
modal.addEventListener("click",e=>{ if(e.target===modal) modal.classList.remove("open"); });

function openGallery(){
  const unlocked=new Set(getUnlocked());
  const ids=Object.keys(ENDINGS);
  const got=ids.filter(id=>unlocked.has(id)).length;
  const grid=ids.map(id=>{
    const e=ENDINGS[id];
    return unlocked.has(id)
      ? `<div class="gal-item"><b>${e.seal} ${e.title}</b>${e.desc.slice(0,18)}…</div>`
      : `<div class="gal-item locked"><b>？？？</b>尚未解锁</div>`;
  }).join("");
  openModal(`<h2>结局图鉴</h2>
    <p class="gal-count">已解锁 ${got} / ${ids.length} 种结局</p>
    <div class="gallery-grid">${grid}</div>`);
}

function openAbout(){
  openModal(`<h2>玩法说明</h2>
    <p>你是新登基的皇帝。群臣不断递上奏折，你的每一个抉择都会牵动四维国力——任何一维<b>跌至谷底</b>或<b>盛极失衡</b>，王朝都将倾覆。</p>
    <div class="help-stat">${ART.icon("people")}<span><b>民心</b>：水能载舟，亦能覆舟。</span></div>
    <div class="help-stat">${ART.icon("treasury")}<span><b>国库</b>：钱粮乃国之血脉。</span></div>
    <div class="help-stat">${ART.icon("military")}<span><b>军事</b>：武备松弛则国门洞开，过盛则将骄兵悍。</span></div>
    <div class="help-stat">${ART.icon("court")}<span><b>朝堂</b>：百官离心则政令不出，相权独大则架空君主。</span></div>
    <p style="margin-top:12px">选项上的彩色小箭头，<b>仅提示</b>受影响的维度与升降方向。在位越久、四维越均衡，史书评价越高——力争成为<b>千古一帝</b>，莫做亡国之君。</p>`);
}

/* ---------- 静音 ---------- */
function applyMute(){
  const m=localStorage.getItem(LS_MUTE)==="1";
  SFX.setMuted(m);
  $("btn-mute").textContent = m ? "🔇" : "🔊";
}
$("btn-mute").addEventListener("click",()=>{
  localStorage.setItem(LS_MUTE, SFX.isMuted()?"0":"1");
  applyMute();
});

/* ---------- 绑定 ---------- */
$("btn-start").addEventListener("click",startGame);
$("btn-replay").addEventListener("click",()=>{ showRecord(); show("title"); });
$("btn-gallery").addEventListener("click",openGallery);
$("btn-end-gallery").addEventListener("click",openGallery);
$("btn-about").addEventListener("click",openAbout);
document.addEventListener("click",()=>SFX.unlock(),{once:true});

/* ---------- 初始化 ---------- */
applyMute();
showRecord();
show("title");

})();
