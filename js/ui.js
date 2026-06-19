/* ===================================================================
   ui.js —— 视图与交互层
   渲染 HUD / 帝王面板 / 事件卡 / 行动 / 各管理面板，绑定所有事件。
   =================================================================== */
const UI = (() => {
"use strict";
const $=id=>document.getElementById(id);
const screens={title:$("screen-title"),game:$("screen-game"),end:$("screen-end")};
const ROLE_NAME={chancellor:"丞相",general:"大将军",censor:"御史大夫",finance:"户部尚书",
  eunuch:"内侍总管",consort:"嫔妃",envoy:"番邦使臣",peasant:"草民",self:"朕",prince:"皇子"};

function show(name){ for(const k in screens) screens[k].classList.toggle("active",k===name); }

/* 立绘解析：具体文件 or 按角色随机取一张 */
function faceFor(role){
  const M=Game.manifest||{};
  if(role==="consort") return rnd(M.consorts);
  if(role==="general") return rnd(M.generals&&M.generals.length?M.generals:M.ministers);
  return rnd(M.ministers);
}
function rnd(a){ return a&&a.length ? a[Math.floor(Math.random()*a.length)].file : ""; }
function img(src,cls){ return src?`<img class="${cls}" src="${src}" loading="lazy" alt="">`
  :`<div class="${cls} noface">？</div>`; }

/* ---------- HUD ---------- */
function renderHUD(){
  const s=Game.s,n=s.nation;
  $("hud-title").textContent=`${s.dynasty} · ${s.reign}`;
  $("hud-date").textContent=`${n.year}年 ${["","正","二","三","四","五","六","七","八","九","十","冬","腊"][n.month]}月`;
  $("hud-nation").innerHTML=Object.keys(NATION_STATS).map(k=>{
    const m=NATION_STATS[k]; const v=Math.round(n[k]);
    const low=v<20?"low":"";
    return `<span class="nstat ${low}" title="${m.name}"><i>${ICONS[k]||m.icon}</i><b>${v}</b></span>`;
  }).join("");
}

/* ---------- 帝王面板 ---------- */
function renderEmperor(){
  const e=Game.s.emperor;
  $("emp-portrait").innerHTML=img(e.portrait,"emp-face");
  $("emp-name").textContent=e.name+" 帝";
  $("emp-age").textContent=`圣寿 ${e.age} · 第 ${Game.s.gen} 代`;
  $("emp-attrs").innerHTML=Object.keys(EMP_ATTRS).map(k=>{
    const m=EMP_ATTRS[k],v=Math.round(e[k]);
    return `<div class="attr"><span class="attr-n">${m.name}</span>
      <span class="attr-bar"><i style="width:${v}%;background:${m.color}"></i></span>
      <span class="attr-v">${v}</span></div>`;
  }).join("");
}

/* ---------- 事件卡 ---------- */
function showEvent(card){
  const s=Game.s;
  if(!card._face) card._face=faceFor(card.role||"chancellor");
  const speaker=ROLE_NAME[card.role]||"大臣";
  const text=typeof card.text==="function"?card.text(s):card.text;
  const title=typeof card.title==="function"?card.title(s):card.title;
  const choices=card.choices.filter(c=>!c.cond||c.cond(s));
  $("event-area").innerHTML=`
    <div class="ev-card">
      <div class="ev-top">
        ${img(card._face,"ev-face")}
        <div class="ev-meta"><span class="ev-speaker">${speaker}</span>
          <h3 class="ev-title">${title}</h3></div>
      </div>
      <p class="ev-text">${text}</p>
      <div class="ev-choices">
        ${choices.map((c,i)=>`<button class="ev-choice" data-i="${i}">${c.text}</button>`).join("")}
      </div>
    </div>`;
  [...document.querySelectorAll(".ev-choice")].forEach(b=>{
    b.onclick=()=>Game.resolveEvent(+b.dataset.i);
  });
  const ea=$("event-area").firstElementChild; ea.classList.add("deal");
}

/* ---------- 月报（无事件时）---------- */
function showMonth(){
  const s=Game.s,n=s.nation;
  const posts=s.ministers.filter(m=>m.post).length;
  $("event-area").innerHTML=`
    <div class="month-card">
      <h3>${n.year}年 · 本月朝政</h3>
      <p class="month-sub">四海无大事。陛下可择一事而行，或召见群臣、临幸后宫，再进入下一回合。</p>
      <div class="month-grid">
        <div>在职大臣 <b>${posts}/${POSITIONS.length}</b></div>
        <div>后宫嫔妃 <b>${s.consorts.length}</b></div>
        <div>皇嗣 <b>${s.children.length}</b></div>
        <div>国祚 <b>${n.year} 年</b></div>
      </div>
    </div>`;
}

/* ---------- 行动 ---------- */
function renderActions(){
  const s=Game.s;
  if(s.pendingEvent){ $("action-area").innerHTML=`<p class="act-hint">⚑ 请先在上方处理朝政奏折</p>`; return; }
  if(s.actedThisTurn){ $("action-area").innerHTML=`<p class="act-hint">✔ 本月已理政，可进入下一回合</p>`; return; }
  $("action-area").innerHTML=`<div class="act-grid">`+
    Object.keys(Game.ACTIONS).map(k=>{
      const a=Game.ACTIONS[k];
      return `<button class="act-btn" data-a="${k}" title="${a.hint}"><i>${a.icon}</i><span>${a.name}</span></button>`;
    }).join("")+`</div>`;
  [...document.querySelectorAll(".act-btn")].forEach(b=>b.onclick=()=>Game.doAction(b.dataset.a));
}

/* ---------- 面板 ---------- */
let panelOpts={};
function openPanel(name,opts){ panelOpts=opts||{}; $("panel-mask").classList.add("open"); renderPanel(name); }
function closePanel(){ $("panel-mask").classList.remove("open"); panelOpts={}; }
const PANEL_TITLE={court:"朝堂 · 满朝文武",harem:"后宫 · 嫔妃",heir:"皇嗣 · 子女",army:"军务",log:"史册"};

function bar(v,color){ return `<span class="mini-bar"><i style="width:${Math.round(v)}%;background:${color}"></i></span>`; }

function renderPanel(name){
  $("panel-title").textContent=PANEL_TITLE[name]||name;
  const s=Game.s; let h="";
  if(name==="court"){
    const selecting=panelOpts.selectAction==="audience";
    if(selecting) h+=`<p class="panel-tip">点击一位大臣以「召见」（消耗本月行动）</p>`;
    h+=s.ministers.map(m=>{
      const pos=m.post?POSITIONS.find(p=>p.id===m.post).name:"（闲职）";
      const postBtns=selecting?"":`<div class="post-row">`+
        POSITIONS.map(p=>`<button class="chip ${m.post===p.id?"on":""}" onclick="Game.appoint('${m.id}','${m.post===p.id?"":p.id}')">${p.name}</button>`).join("")+
        `<button class="chip danger" onclick="Game.rewardMinister('${m.id}')">赏赐</button>`+
        `<button class="chip danger" onclick="Game.executeMinister('${m.id}')">处死</button></div>`;
      return `<div class="m-card" ${selecting?`onclick="Game.audienceMinister('${m.id}')"`:""}>
        ${img(m.portrait,"m-face")}
        <div class="m-info">
          <div class="m-head"><b>${m.name}</b><span class="m-post">${pos}</span><span class="m-pers">${m.personality}</span></div>
          <div class="m-line">文才 ${m.civ} · 武略 ${m.mil}</div>
          <div class="m-line">忠诚 ${bar(m.loyalty,"#5aa06a")} ${Math.round(m.loyalty)}　野心 ${bar(m.ambition,"#c0563a")} ${Math.round(m.ambition)}</div>
          ${postBtns}
        </div></div>`;
    }).join("");
  }
  else if(name==="harem"){
    const selecting=panelOpts.selectAction==="visit";
    if(selecting) h+=`<p class="panel-tip">点击一位嫔妃以「临幸」（消耗本月行动）</p>`;
    h+=s.consorts.map(c=>{
      const preg=c.pregnant!=null?`<span class="preg">有孕 ${c.pregnant}/10</span>`:"";
      const act=selecting?"":`<button class="chip" onclick="Game.promoteConsort('${c.id}')">晋位</button>`;
      return `<div class="m-card" ${selecting?`onclick="Game.visitConsort('${c.id}')"`:""}>
        ${img(c.portrait,"m-face")}
        <div class="m-info">
          <div class="m-head"><b>${c.name}</b><span class="m-post">${RANKS[c.rank]}</span><span class="m-pers">${c.personality}</span> ${preg}</div>
          <div class="m-line">美貌 ${bar(c.beauty,"#c0397a")} ${Math.round(c.beauty)}</div>
          <div class="m-line">宠爱 ${bar(c.favor,"#d9655a")} ${Math.round(c.favor)}</div>
          ${act}
        </div></div>`;
    }).join("")||`<p class="panel-tip">后宫尚虚，待选秀充盈。</p>`;
  }
  else if(name==="heir"){
    h+=s.children.length?s.children.map(c=>{
      const heir=c.isHeir?`<span class="m-post heir">太子</span>`:"";
      const btn=(c.gender==="男"&&!c.isHeir)?`<button class="chip" onclick="Game.setHeir('${c.name}')">立为太子</button>`:"";
      return `<div class="m-card child">
        <div class="m-info">
          <div class="m-head"><b>${c.name}</b><span class="m-post">皇${c.gender==="男"?"子":"女"} · ${c.age}岁</span>${heir}</div>
          <div class="m-line">母 ${c.mother}</div>
          <div class="m-line">智${c.int} 魅${c.charm} 武${c.martial} 政${c.politics}</div>
          ${btn}
        </div></div>`;
    }).join(""):`<p class="panel-tip">膝下尚无子嗣，临幸后宫以开枝散叶。</p>`;
    h+=`<p class="panel-tip">※ 帝王驾崩时，由太子（或最年长皇子）继位，江山世代相传；若绝嗣则亡国。</p>`;
  }
  else if(name==="army"){
    const n=s.nation, marshal=s.ministers.find(m=>m.post==="marshal");
    h+=`<div class="army-grid">
      <div>兵力 <b>${Math.round(n.military)}</b></div>
      <div>粮草 <b>${Math.round(n.food)}</b></div>
      <div>疆域 <b>${Math.round(n.land)}</b></div>
      <div>威望 <b>${Math.round(n.prestige)}</b></div></div>
      <p class="panel-tip">大将军：${marshal?`${marshal.name}（武略 ${marshal.mil}）`:"<b>虚位以待</b>，请于朝堂任命"}。</p>
      <p class="panel-tip">※ 番邦入寇或将军请战时，可遣大将军或御驾亲征。兵力、将领武略与陛下武力决定胜负。</p>`;
  }
  else if(name==="log"){
    h+=`<div class="log-list">`+s.log.map(l=>`<div class="log-item">${l}</div>`).join("")+`</div>`;
  }
  $("panel-body").innerHTML=h;
}

/* ---------- 提示飘字 ---------- */
let toastT;
function toast(msg){
  const t=$("toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),2200);
}

/* ---------- 传位公告 ---------- */
function announceSuccession(d,cb){
  openModal(`<h2>国丧 · 传承</h2>
    <p>第 ${d.gen-1} 代 <b>${d.old}</b> 帝${d.cause}，享年 ${d.oldAge} 岁。</p>
    <p>太子 <b>${d.heir}</b> 灵前即位，改元继统，是为第 <b>${d.gen}</b> 代。江山社稷，得以延续。</p>
    <div style="text-align:center;margin-top:18px"><button class="btn btn-primary" id="succ-ok">继 位</button></div>`);
  $("succ-ok").onclick=()=>{ closeModal(); cb&&cb(); };
}

/* ---------- 结局 ---------- */
function showEnd(e,stat){
  $("end-seal").textContent=e.seal;
  $("end-temple").textContent=e.temple||"";
  $("end-title").textContent=e.title;
  $("end-desc").textContent=e.desc;
  $("end-stats").innerHTML=`
    <div><b>${stat.years}</b>享国（年）</div>
    <div><b>${stat.gen}</b>传位（代）</div>
    <div><b>${stat.score}</b>国运评分</div>`;
  show("end");
}

/* ---------- 通用弹窗 ---------- */
function openModal(html){ $("modal-content").innerHTML=html; $("modal").classList.add("open"); }
function closeModal(){ $("modal").classList.remove("open"); }

/* ---------- 标题 / 启动 ---------- */
function showRecord(){
  const b=JSON.parse(localStorage.getItem("zjjs_best")||"null");
  $("title-record").textContent=b?`最盛之世：${b.dynasty}　享国 ${b.years} 年 · 传 ${b.gen} 代 · 国运 ${b.score}`:"";
  $("btn-continue").style.display=localStorage.getItem("zjjs_save")?"":"none";
}

function openHelp(){
  openModal(`<h2>玩法说明</h2>
  <p>你是开国之君。每一回合（月）先<b>上朝</b>处理一桩朝政奏折，再择一项<b>行动</b>（勤政／读书习武／临幸后宫／召见群臣／休养），然后<b>下一回合</b>结算。</p>
  <h3>四大系统</h3>
  <p>🏛️ <b>朝堂</b>：满朝文武各有文才武略、忠诚野心。任命丞相、大将军等要职，他们每回合为你增益国力；忠诚过低而野心过高者会<b>谋反</b>。</p>
  <p>🏮 <b>后宫 / 皇嗣</b>：临幸嫔妃生育皇子公主，培养并<b>立太子</b>。帝王驾崩由太子继位，江山<b>世代相传</b>；绝嗣则亡国。</p>
  <p>⚔️ <b>军务战争</b>：番邦入寇或主动北伐，遣大将军或御驾亲征，兵力＋将领武略决定胜负，胜则开疆拓土。</p>
  <p>💰 <b>经济民生·科举外交</b>：国库靠民心疆域征税、养兵养官需开支；逢科举纳贤才、行和亲结盟好。</p>
  <p>国库枯竭、民心尽失、兵败国破、权臣篡位或绝嗣，皆会<b>亡国</b>。在位长久、国力均衡、威望卓著的明君，方能青史留名为<b>千古一帝</b>。</p>`);
}

function boot(){
  Game.init().then(()=>{
    showRecord();
    $("btn-start").onclick=()=>Game.newGame($("inp-dynasty").value.trim(),$("inp-name").value.trim(),$("inp-reign").value.trim());
    $("btn-continue").onclick=()=>{ if(!Game.load()) toast("无存档"); };
    $("btn-help").onclick=openHelp;
    $("btn-replay").onclick=()=>{ show("title"); showRecord(); };
    $("btn-next").onclick=()=>Game.nextTurn();
    $("btn-menu").onclick=()=>{ if(confirm("返回标题？（进度已自动保存，可“继续上局”）")){ show("title"); showRecord(); } };
    [...document.querySelectorAll(".tab[data-panel]")].forEach(t=>{
      t.onclick=()=>openPanel(t.dataset.panel);
      const ic=t.querySelector(".tico"); if(ic) ic.innerHTML=ICONS[t.dataset.panel]||"";
    });
    var ni=document.querySelector("#btn-next .tico"); if(ni) ni.innerHTML=ICONS.next;
    $("panel-close").onclick=closePanel;
    $("panel-mask").onclick=e=>{ if(e.target===$("panel-mask")) closePanel(); };
    $("modal-close").onclick=closeModal;
    document.addEventListener("click",()=>SFX.unlock(),{once:true});
  });
}

return {toGame:()=>show("game"), renderHUD, renderEmperor, showEvent, showMonth, renderActions,
  openPanel, closePanel, renderPanel, toast, announceSuccession, showEnd, boot};
})();

UI.boot();
