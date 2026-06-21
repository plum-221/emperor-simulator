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

/* 出征点将选择态 */
let campaignPick=new Set(), campaignEmperor=false;
function pickCampaign(id){ if(campaignPick.has(id)) campaignPick.delete(id);
  else{ if(campaignPick.size>=4){ toast("至多点 4 员武将"); return; } campaignPick.add(id); }
  renderPanel("army"); }
function toggleCampaignEmperor(){ campaignEmperor=!campaignEmperor; renderPanel("army"); }
function doLaunchCampaign(){ const ids=[...campaignPick]; const emp=campaignEmperor;
  campaignPick=new Set(); campaignEmperor=false; Game.launchCampaign(ids,emp); }

/* 日切换·拂晓过场动画（非阻塞·自动消退） */
function dayTransition(head, date, sub){
  const old=document.getElementById("day-transition"); if(old) old.remove();
  const el=document.createElement("div"); el.id="day-transition";
  el.innerHTML=`<div class="dt-sun"></div><div class="dt-card">
    <div class="dt-head">${head}</div>
    <div class="dt-date">${date}</div>
    <div class="dt-sub">${sub||""}</div></div>`;
  document.body.appendChild(el);
  setTimeout(()=>{ if(el.parentNode) el.remove(); }, 1180);
}

/* 密谍司管理面板（朝堂·密谍司按钮打开） */
function openSpy(){ if(typeof SpySys==="undefined") return; openModal(SpySys.panelHTML(Game.s)); }

/* 问罪：依罪证罢黜/诛戮，无罪证不得擅诛（妄诛遭反噬） */
function openImpeach(id){
  const s=Game.s, m=s.ministers.find(x=>x.id===id); if(!m) return;
  const charges=Game.chargesAgainst(m);
  const top = charges.slice().sort((a,b)=>b.sev-a.sev)[0];
  const cname = top ? top.name : "";
  let h=`<div class="impeach">
    <h2 class="imp-h">问 罪</h2>
    <div class="imp-who">${img(m.portrait,"imp-face")}
      <div><div class="imp-name"><b>${m.name}</b><span>${m.title||""}</span></div>
      <div class="imp-loy">表面忠诚 ${Math.round(m.loyalty)}</div></div></div>`;
  if(charges.length){
    h+=`<div class="imp-sec">查得罪证</div><div class="imp-charges">`+
      charges.map(c=>`<div class="imp-charge sev${c.sev}">${c.name}</div>`).join("")+`</div>`;
    h+=`<p class="imp-tip">罪证确凿，问罪有据，朝纲得正。</p>
      <div class="imp-acts">
        <button class="btn warn" onclick="Game.dismissMinister('${m.id}','${cname}')">依律罢黜</button>
        <button class="btn btn-primary danger-btn" onclick="Game.executeMinister('${m.id}','${cname}')">明正典刑 · 处死</button>
      </div>`;
  }else{
    h+=`<div class="imp-sec">查无实据</div>
      <p class="imp-tip warn-tip">经查，${m.name} 持身尚正，并无确凿罪证。<b>妄诛忠良必失天下人心。</b><br>欲知其私行，可遣<b>密谍司</b>密察。</p>
      <div class="imp-acts">
        <button class="btn ghost" onclick="UI.closeModal();UI.openSpy()">遣密谍司查察</button>
        <button class="btn warn" onclick="Game.dismissMinister('${m.id}','')">无故罢黜（百官寒心）</button>
      </div>
      <p class="imp-note">※ 无罪证不可处死；强行罢黜将折损威望、百官离心。</p>`;
  }
  h+=`</div>`;
  openModal(h);
}

/* 人物详情：身份 / 背景故事 / 关系网（点大臣卡 详 打开） */
function openCharacter(id){
  const s=Game.s; const m=s.ministers.find(x=>x.id===id||x.castId===id); if(!m) return;
  const tg=(typeof rarityOf!=="undefined")?rarityOf(m):GACHA.tiers[m.tier||"mid"];
  const status=(cid)=>{
    if(s.ministers.some(x=>(x.castId||x.id)===cid)) return {t:"在朝",c:"st-in"};
    if((s.exiled||[]).includes(cid)) return {t:"已逐",c:"st-out"};
    return {t:"未仕",c:"st-un"};
  };
  let relHTML="";
  if(m.rel && m.rel.length){
    relHTML=m.rel.map(r=>{
      const rt=(typeof RELTYPE!=="undefined"&&RELTYPE[r.type])||{ico:"·",cls:""};
      const other=(typeof castById!=="undefined"&&castById(r.to))||null;
      const oname=other?`${other.title?other.title+"·":""}${other.name}`:r.to;
      const st=status(r.to);
      return `<div class="ch-rel ${rt.cls}">
        <span class="ch-rt">${rt.ico} ${r.type}</span>
        <span class="ch-ro">${oname}<span class="ch-st ${st.c}">${st.t}</span></span>
        ${r.note?`<span class="ch-rn">${r.note}</span>`:""}</div>`;
    }).join("");
  }else relHTML=`<div class="ch-rel-none">朝中暂无明载之亲故。</div>`;
  const html=`<div class="charv">
    <div class="ch-top">
      ${img(m.portrait,"ch-face")}
      <div class="ch-id">
        <div class="ch-name"><b>${m.name}</b><span class="ch-title">${m.title||(m.kind==="martial"?"武将":"文官")}</span></div>
        <div class="ch-tags"><span style="color:${tg.color}">${tg.star} ${tg.name}</span> · <span class="ch-pers">${m.personality}</span> · ${m.age||"—"}岁</div>
        <div class="ch-stat">文才 <b>${m.civ}</b> · 武略 <b>${m.mil}</b> · 忠诚 <b>${Math.round(m.loyalty)}</b> · 野心 <b>${Math.round(m.ambition)}</b> · Lv${m.level||1}</div>
      </div>
    </div>
    <div class="ch-sec-h">身世</div>
    <p class="ch-story">${m.story||"（其人来历，史册无载。）"}</p>
    <div class="ch-sec-h">关系网</div>
    <div class="ch-rels">${relHTML}</div>
  </div>`;
  openModal(html);
}

/* 立绘解析：具体文件 or 按角色随机取一张 */
function faceFor(role){
  const M=Game.manifest||{};
  if(role==="consort") return rnd(M.consorts);
  if(role==="general") return rnd(M.generals&&M.generals.length?M.generals:M.ministers);
  return rnd(M.ministers);
}
function rnd(a){ return a&&a.length ? a[Math.floor(Math.random()*a.length)].file : ""; }
function img(src,cls){ return src?`<img class="${cls} imgload" src="${src}" loading="lazy" alt="" onload="this.classList.add('imgok')" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'${cls} noface',textContent:'？'}))">`
  :`<div class="${cls} noface">？</div>`; }

/* ---------- HUD ---------- */
function renderHUD(){
  const s=Game.s,n=s.nation;
  const tt=(typeof QuestSys!=="undefined")?QuestSys.equippedTitle():"";
  $("hud-title").textContent=`${tt?tt+"·":""}${s.dynasty} · ${s.reign}`;
  const ph=PHASES[n.phase||0]||PHASES[0];
  $("hud-date").textContent=`${n.year}年 ${["","正","二","三","四","五","六","七","八","九","十","冬","腊"][n.month]}月${n.day||1}日 · ${ph.icon}${ph.name}`;
  $("hud-nation").innerHTML=Object.keys(NATION_STATS).map(k=>{
    const m=NATION_STATS[k]; const v=Math.round(n[k]);
    const low=v<20?"low":"";
    return `<span class="nstat ${low}" title="${m.name}"><i>${ICONS[k]||m.icon}</i><b>${v}</b></span>`;
  }).join("");
}

/* ---------- 帝王面板 ---------- */
function renderEmperor(){
  const e=Game.s.emperor;
  $("emp-portrait").innerHTML=img(emperorFace(e.age),"emp-face");
  $("emp-name").textContent=e.name+" 帝";
  $("emp-age").textContent=`圣寿 ${e.age} · 第 ${Game.s.gen} 代`;
  const tp=Game.s.talentPts||0;
  $("emp-attrs").innerHTML=Object.keys(EMP_ATTRS).map(k=>{
    const m=EMP_ATTRS[k],v=Math.round(e[k]);
    return `<div class="attr"><span class="attr-n">${m.name}</span>
      <span class="attr-bar"><i style="width:${v}%;background:${m.color}"></i></span>
      <span class="attr-v">${v}</span></div>`;
  }).join("")+`<button class="btn btn-primary talent-btn" onclick="Game.openTalents()">✦ 帝王天赋${tp>0?` <em class="tp-badge">${tp}</em>`:""}</button>`;
}

/* ---------- 事件卡 ---------- */
/* 事件 → 场景插画类别（按 id 精确，回落到 cat 类别，再回落朝堂大殿） */
const SCENE_BY_ID={
  ev_drought:"drought", ev_flood:"flood", ev_flood2:"flood", ev_locust:"locust", ev_plague:"plague",
  ev_exam:"exam", ev_exam_fraud:"exam", ev_invade:"war", ev_general_ask:"war", ev_hunt:"war", ev_autumn:"war",
  ev_omen:"omen", ev_qilin:"omen", ev_eclipse:"omen", big_omen:"omen",
  ev_harem_jealous:"harem", ev_inspect:"incognito", ev_orphan:"incognito",
  ev_trade:"market", ev_merchant:"market", ev_palace:"market", ev_lantern:"market", ev_horse:"market",
  ev_rebel_min:"rebellion", big_coup:"rebellion", big_rebellion:"rebellion", ev_assassin:"rebellion",
  ev_swordsman:"incognito", ev_poet:"incognito", ev_monk:"incognito", ev_painting:"incognito",
  big_invasion:"war", big_heir:"court", ev_unify:"end_unify"
};
const SCENE_BY_CAT={ 灾害:"flood", 战争:"war", 军事:"war", 后宫:"harem", 祥瑞:"omen", 危机:"rebellion",
  大事件:"rebellion", 经济:"market", 节庆:"market", 民生:"incognito", 江湖:"incognito", 奇人:"incognito", 秘闻:"incognito" };
function sceneFor(card){
  return SCENE_BY_ID[card.id] || SCENE_BY_CAT[card.cat] || "court";
}

function showEvent(card){
  const s=Game.s;
  if(!card._face) card._face=faceFor(card.role||"chancellor");
  const speaker=ROLE_NAME[card.role]||"大臣";
  const text=typeof card.text==="function"?card.text(s):card.text;
  const title=typeof card.title==="function"?card.title(s):card.title;
  const choices=card.choices.filter(c=>!c.cond||c.cond(s));
  const banner=card.triumph?`<div class="ev-banner gold">天 下 一 统 · 万 邦 来 朝</div>`
    :card.big?`<div class="ev-banner">大 事 件 · 国 之 存 亡</div>`:"";
  const illust=`<div class="ev-illust-wrap"><img class="ev-illust" src="assets/scenes/${sceneFor(card)}.jpg" alt="" onerror="this.closest('.ev-illust-wrap').remove()"></div>`;
  $("event-area").innerHTML=`
    <div class="ev-card${card.big?" big":""}${card.triumph?" triumph":""}">
      ${banner}
      ${illust}
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
  const ph=PHASES[n.phase||0]||PHASES[0];
  let questLine="";
  if(typeof QuestSys!=="undefined"&&s.quest){ const q=QuestSys.curMain(s);
    questLine=q?`<p class="month-quest">当前大业：<b>${q.name}</b> —— ${q.desc}</p>`:`<p class="month-quest">中兴大业已成，名垂青史。</p>`; }
  const MONTH_SCENE={morn:"court", noon:"market", eve:"harem"};
  const mscene=MONTH_SCENE[ph.key]||"court";
  $("event-area").innerHTML=`
    <div class="month-card">
      <div class="month-illust-wrap"><img class="month-illust" src="assets/scenes/${mscene}.jpg" alt="" onerror="this.closest('.month-illust-wrap').remove()">
        <span class="month-illust-cap">${ph.icon} ${ph.name}</span></div>
      <h3>${ph.icon} ${n.year}年${["","正","二","三","四","五","六","七","八","九","十","冬","腊"][n.month]}月${n.day||1}日 · ${ph.name}</h3>
      <p class="month-sub">${ph.hint}。陛下可择一事而行，或召见群臣、临幸后宫，再「下一时段」。</p>
      ${questLine}
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
  if(s.pendingEvent){ $("action-area").innerHTML=`<p class="act-hint">请先在上方处理朝政奏折</p>`; return; }
  const ff=`<button class="act-ff" id="btn-ff">快进至下一事件 / 月末</button>`;
  if(s.actedThisTurn){ $("action-area").innerHTML=`<p class="act-hint">✔ 此时段已行一事，可「下一时段」</p>`+ff; }
  else{
    const curPh=PHASES[s.nation.phase||0].key;
    $("action-area").innerHTML=`<div class="act-grid">`+
      Object.keys(Game.ACTIONS).filter(k=>{ const a=Game.ACTIONS[k]; return !a.phases||a.phases.includes(curPh); }).map(k=>{
        const a=Game.ACTIONS[k];
        return `<button class="act-btn" data-a="${k}" title="${a.hint}"><i>${a.icon}</i><span>${a.name}</span></button>`;
      }).join("")+`</div>`+ff;
    [...document.querySelectorAll(".act-btn")].forEach(b=>b.onclick=()=>Game.doAction(b.dataset.a));
  }
  const f=$("btn-ff"); if(f) f.onclick=()=>Game.fastForward();
}

/* ---------- 面板 ---------- */
let panelOpts={};
function openPanel(name,opts){ panelOpts=opts||{}; $("panel-mask").classList.add("open"); renderPanel(name);
  if(name==="map" && typeof MusicSys!=="undefined") MusicSys.setScene("map"); }   // 天下专属曲
function closePanel(){ $("panel-mask").classList.remove("open"); panelOpts={};
  if(typeof MusicSys!=="undefined" && Game.s){ MusicSys.setScene(Game.s.nation.phase===2?"night":"court"); } }  // 恢复大厅曲
const PANEL_TITLE={map:"天下 · 列国舆图",court:"朝堂 · 满朝文武",harem:"后宫 · 嫔妃",heir:"皇嗣 · 子女",army:"军务",log:"史册",quest:"大业 · 任务·成就·图鉴"};

function bar(v,color){ return `<span class="mini-bar"><i style="width:${Math.round(v)}%;background:${color}"></i></span>`; }

function renderPanel(name){
  $("panel-title").textContent=PANEL_TITLE[name]||name;
  const s=Game.s; let h="";
  if(name==="map"){
    h+=MapSys.renderBody(s);
  }
  else if(name==="quest"){
    h+=(typeof QuestSys!=="undefined")?QuestSys.renderBody(s):`<p class="panel-tip">大业系统未加载</p>`;
  }
  else if(name==="court"){
    const selecting=panelOpts.selectAction==="audience";
    const owned=(s.weapons||[]).map(weaponById).filter(Boolean);
    if(selecting) h+=`<p class="panel-tip">点击一位大臣以「召见」（消耗此时段行动）</p>`;
    else{
      const cost=s.recruitVoucher?Math.ceil(GACHA.cost/2):GACHA.cost;
      const pity=s.gachaPity||0;
      h+=`<div class="recruit-bar">
        <div class="rc-info"><b>招贤馆</b><span>招贤点 <b>${s.recruitPoints||0}</b> · 碎片 <b>${s.shards||0}</b> · 保底 ${pity}/${GACHA.pity}${s.recruitVoucher?` · <em class="voucher">半价券✦</em>`:""}<br>抽中已仕之贤化碎片，碎片可精进文武。已罢免/处死者不再现。</span></div>
        <button class="btn btn-primary rc-btn" ${(s.recruitPoints||0)<cost?"disabled":""} onclick="Game.recruitDraw()">求贤 ✦ ${cost}点</button>
      </div>
      <div class="recruit-bar">
        <div class="rc-info"><b>武库</b><span>已得武器 <b>${owned.length}</b>/${WEAPONS.length} · 抽中已有→碎片。佩于将相提其文/武。</span></div>
        <button class="btn btn-primary rc-btn" ${(s.recruitPoints||0)<GACHA.cost?"disabled":""} onclick="Game.weaponDraw()">铸兵 ${GACHA.cost}点</button>
      </div>`;
      // 密谍司
      const spyEst=(typeof SpySys!=="undefined")&&SpySys.established(s);
      const spyAlert=spyEst&&s.ministers.some(m=>m.secret&&(m.secret.cabal.progress>=55||m.secret.treason>=45));
      h+=`<div class="recruit-bar spy-bar${spyAlert?' alert':''}">
        <div class="rc-info"><b>密谍司</b><span>${spyEst?`司阶 <b>Lv${s.spy.level}</b> · 眼线 ${(s.spy.watch||[]).length}/${1+(s.spy.level||1)}。密察百官私行，每夜戌时密呈。`:'设耳目于朝野，密察 结党/贪墨/通敌/构陷，每夜密报真账。'}</span></div>
        <button class="btn btn-primary rc-btn" onclick="UI.openSpy()">${spyEst?(spyAlert?'密谍司':'密谍司'):'设立密谍司'}</button>
      </div>`;
      // 朝局势力图（党争可视化）
      const fac=Game.computeFactions?Game.computeFactions():{factions:[],tensions:[]};
      const perilFac=fac.factions.find(f=>f.peril);
      h+=`<div class="recruit-bar fac-bar${perilFac?' alert':''}">
        <div class="rc-info"><b>朝局势力</b><span>${fac.factions.length?`朝堂分 <b>${fac.factions.length}</b> 派${fac.dominant?`，<b>${fac.dominant.kind}</b>权重最盛`:""}${perilFac?` · <em class="voucher" style="color:#e08a8a">${perilFac.kind}坐大！</em>`:""}。${fac.tensions.length?`党争 ${fac.tensions.length} 处`:"朝局尚和"}` : "百官各自为政，未结朋党。"}</span></div>
        <button class="btn btn-primary rc-btn" onclick="UI.openFactions()">朝局势力图</button>
      </div>`;
      if(owned.length) h+=`<div class="armory">`+owned.map(w=>{const tg=GACHA.tiers[w.tier];const on=s.ministers.find(x=>x.weapon===w.id);
        const lv=(s.weaponLv&&s.weaponLv[w.id])||0; const eff=w.bonus+lv*FORGE_STEP;
        const maxed=lv>=FORGE_MAX; const fc=forgeCost(lv); const canForge=!maxed&&(s.shards||0)>=fc;
        const forgeBtn=`<button class="wp-forge ${canForge?"":"off"}" ${canForge?"":"disabled"} onclick="Game.forgeWeapon('${w.id}')" title="强化 +${FORGE_STEP}（耗碎片 ${fc}）">${maxed?"✦满":`强化✦${fc}`}</button>`;
        return `<span class="wp-chip" style="border-color:${tg.color}" title="${w.desc}">${img(w.img,"wp-mini")}<b>${w.name}${lv?`<em class="wp-lv">+${lv*FORGE_STEP}</em>`:""}</b><i style="color:${tg.color}">${w.stat==="mil"?"武":"文"}+${eff}</i>${on?`<u>${on.name}</u>`:`<u class="idle">未佩</u>`}${forgeBtn}</span>`;}).join("")+`</div>`;
      // 羁绊（阵容协同）
      h+=`<div class="bonds"><div class="bonds-h">朝堂羁绊 <span>组合达成即享被动加成</span></div>`+
        BONDS.map(b=>{const on=b.cond(s);return `<span class="bond ${on?"on":""}" title="${b.desc}">${b.icon} ${b.name}${on?" ✓":""}</span>`;}).join("")+`</div>`;
    }
    h+=s.ministers.map(m=>{
      const pos=m.post?POSITIONS.find(p=>p.id===m.post).name:"（闲职）";
      const rar=(typeof rarityOf!=="undefined")?rarityOf(m):{color:"#cfcfc4",star:"★",name:""};
      const upBtn=(s.shards||0)>=UPGRADE_COST?`<button class="chip" onclick="Game.upgradeMinister('${m.id}')">碎片精进 ✦${UPGRADE_COST}</button>`:"";
      const canBk=(m.level||1)>=5 && (m.tier||"low")!=="high";
      const bkBtn=selecting?"":`<button class="chip ${canBk&&(s.shards||0)>=8?"gold":""}" ${canBk?"":"disabled"} onclick="Game.breakthrough('${m.id}')" title="Lv5且非满星可突破·耗碎片8">突破 ⤴${canBk?" ✦8":""}</button>`;
      const wpSel=(!selecting&&owned.length)?`<select class="wp-sel" onchange="Game.equipWeapon('${m.id}',this.value)">
        <option value="">佩兵…</option>`+owned.map(w=>`<option value="${w.id}" ${m.weapon===w.id?"selected":""}>${w.name} ${w.stat==="mil"?"武":"文"}+${w.bonus+((s.weaponLv&&s.weaponLv[w.id])||0)*FORGE_STEP}</option>`).join("")+`</select>`:"";
      // 官职即身份：登朝自动就位、不可指派；赏赐/养成 + 问罪（须有罪证方可罢黜诛戮）
      const nCharges=Game.chargesAgainst(m).length;
      const postBtns=selecting?"":`<div class="post-row">`+
        `<button class="chip" onclick="Game.rewardMinister('${m.id}')">赏赐</button>`+upBtn+bkBtn+wpSel+
        `<button class="chip ${nCharges?'danger':'warn'}" onclick="UI.openImpeach('${m.id}')" title="问罪：依密谍司查得之罪证罢黜或诛戮">问罪${nCharges?` <em class="chg">${nCharges}</em>`:""}</button></div>`;
      const wpTag=m.weapon?(()=>{const w=weaponById(m.weapon);return w?`<span class="m-wp" title="${w.desc}">${w.name}</span>`:"";})():"";
      return `<div class="m-card r${rar.r||1}" style="border-color:${rar.color};box-shadow:0 0 0 1px ${rar.color}${(rar.r||1)>=4?`,0 0 12px ${rar.glow}`:""}" ${selecting?`onclick="Game.audienceMinister('${m.id}')"`:""}>
        ${img(m.portrait,"m-face")}
        <div class="m-info">
          <div class="m-head"><b>${m.name}</b>${m.title?`<span class="m-title">${m.title}</span>`:""}<span class="m-tier" style="color:${rar.color}" title="${rar.name}">${rar.star}</span><span class="m-post">${pos}</span>${m.waiqi?`<span class="m-waiqi" title="外戚：因宫中亲眷得宠而骤贵，权重而野心易长">外戚</span>`:""}${wpTag}<span class="m-pers">${m.personality}</span><button class="m-view" onclick="event.stopPropagation();UI.openCharacter('${m.id}')" title="查看身世·关系">详</button></div>
          <div class="m-line">${m.kind==="martial"?"武将":"文官"} · 文才 ${m.civ} · 武略 ${m.mil} <span class="m-lv">Lv${m.level||1}</span><span class="m-exp">${m.exp||0}/${(m.level||1)*10}</span></div>
          <div class="m-line">忠诚 ${bar(m.loyalty,"#5aa06a")} ${Math.round(m.loyalty)}　野心 ${bar(m.ambition,"#c0563a")} ${Math.round(m.ambition)}</div>
          ${postBtns}
        </div></div>`;
    }).join("");
  }
  else if(name==="harem"){
    const selecting=panelOpts.selectAction==="visit";
    if(selecting){
      // 临幸模式：只列已入宫妃子，点选临幸
      h+=`<p class="panel-tip">点击一位嫔妃以「临幸」（消耗此时段行动·开枝散叶）</p>`;
      h+=s.consorts.map(c=>`<div class="m-card" onclick="Game.visitConsort('${c.id}')">
        ${img(c.portrait,"m-face")}
        <div class="m-info"><div class="m-head"><b>${c.name}</b><span class="m-post">${RANKS[c.rank]}</span></div>
        <div class="m-line">宠爱 ${bar(c.favor,"#d9655a")} ${Math.round(c.favor)}</div></div></div>`
      ).join("")||`<p class="panel-tip">后宫尚虚，先去攻略佳人。</p>`;
    }else{
      // ① 已入宫
      h+=`<h3 class="harem-sec">凤仪 · 已入宫（${s.consorts.length}）</h3>`;
      h+=s.consorts.map(c=>{
        const preg=c.pregnant!=null?`<span class="preg">有孕 ${c.pregnant}/10</span>`:"";
        const og=ORIGINS[c.origin]; const ob=og?`<span class="m-origin" style="color:${og.color}">${og.name}</span>`:"";
        const tr=c.traitName?`<span class="m-trait" title="入宫特质">✦${c.traitName}</span>`:"";
        return `<div class="m-card">
          ${img(c.portrait,"m-face")}
          <div class="m-info">
            <div class="m-head"><b>${c.name}</b><span class="m-post">${RANKS[c.rank]}</span>${ob}${tr}${preg}</div>
            <div class="m-line">美貌 ${bar(c.beauty,"#c0397a")} ${Math.round(c.beauty)}</div>
            <div class="m-line">宠爱 ${bar(c.favor,"#d9655a")} ${Math.round(c.favor)}</div>
            <div class="post-row"><button class="chip" onclick="Game.promoteConsort('${c.id}')">晋位</button></div>
          </div></div>`;
      }).join("")||`<p class="panel-tip">后宫尚虚——结识佳人、以心动攻略，方得佳丽入宫。</p>`;
      // ② 可攻略
      const woo=Game.wooableConsorts();
      h+=`<h3 class="harem-sec">情缘 · 可攻略（${woo.length}）</h3>`;
      if(!woo.length) h+=`<p class="panel-tip">眼下无可结识之人，且去增威望、任贤臣、建功业，自有佳人入眼。</p>`;
      h+=woo.map(t=>{
        const r=Game.romanceOf(t.id); const og=ORIGINS[t.origin];
        const blocked=t.requirePost && !s.ministers.some(m=>m.post===t.requirePost);
        const gift=s.nation.treasury<6;
        return `<div class="m-card woo">
          ${img(t.portrait,"m-face")}
          <div class="m-info">
            <div class="m-head"><b>${t.name}</b><span class="m-origin" style="color:${og.color}">${og.name}</span><span class="m-woo">偏好·${WOO_NAME[t.woo]}</span></div>
            <div class="m-line">心动 ${bar(r.aff,"#e0709a")} ${r.aff}/100</div>
            <div class="m-line woo-desc">${t.scenes.find((sc,i)=>!r.seen.includes(i))?("下一幕 心动达 "+t.scenes.find((sc,i)=>!r.seen.includes(i)).at):"情意渐浓…"}　特质·${t.trait.name}</div>
            ${blocked?`<p class="woo-block">${t.unlock.desc}——门第现已失势，暂难亲近</p>`:`<div class="post-row">
              <button class="chip woo-btn" onclick="Game.wooConsort('${t.id}','meet')">相会（吃${WOO_NAME[t.woo]}）</button>
              <button class="chip woo-btn" ${gift?"disabled":""} onclick="Game.wooConsort('${t.id}','gift')">赠礼 ✦6</button>
            </div>`}
          </div></div>`;
      }).join("");
      // ③ 待解锁
      const locked=Game.lockedConsorts();
      if(locked.length){
        h+=`<h3 class="harem-sec">待解锁（${locked.length}）</h3>`;
        h+=locked.map(t=>{const og=ORIGINS[t.origin];
          return `<div class="m-card locked">
            <div class="m-face noface silh">？</div>
            <div class="m-info"><div class="m-head"><b>？？？</b><span class="m-origin" style="color:${og.color}">${og.name}</span></div>
            <div class="m-line lock-cond">${t.unlock.desc}</div></div></div>`;
        }).join("");
      }
      h+=`<p class="panel-tip">※ 攻略行动在「后宫」面板进行，消耗当前时段。心动跨阈值触发剧情，终幕纳入后宫，赐予出身特质。临幸（开枝散叶）走底部行动·入夜可行。</p>`;
    }
  }
  else if(name==="heir"){
    h+=s.children.length?s.children.map(c=>{
      const heir=c.isHeir?`<span class="m-post heir">太子</span>`:"";
      const st=childStage(c.age);
      const setBtn=(c.gender==="男"&&!c.isHeir)?`<button class="chip" onclick="Game.setHeir('${c.name}')">立为太子</button>`:"";
      // 公主和亲 / 皇子分封（后宫皇嗣 → 外交·天下4X 缝合）
      const fiefR=c.fiefRid&&s.map?(s.map.regions.find(r=>r.id===c.fiefRid)||{}).name:"";
      const marriedTag=c.married?`<span class="m-post" style="color:#d9a;">已和亲${c.marriedTo?"·"+c.marriedTo:""}</span>`:"";
      const fiefTag=c.fiefRid?`<span class="m-post" style="color:#8fc99a;">藩·${fiefR}</span>`:"";
      const dipBtn=(c.gender==="女"&&c.age>=14&&!c.married)?`<button class="chip dip" onclick="Game.openMarriage('${c.id}')">和亲结盟</button>`
        :(c.gender==="男"&&c.age>=15&&!c.isHeir)?(c.fiefRid?`<button class="chip" onclick="Game.recallPrince('${c.id}')">召还撤藩</button>`:`<button class="chip dip" onclick="Game.openEnfeoff('${c.id}')">分封就藩</button>`):"";
      // 已成年(弱冠)不再教养
      const edu=st.key!=="youth"?`
        <button class="chip" onclick="Game.educateChild('${c.id}','int')">习文</button>
        <button class="chip" onclick="Game.educateChild('${c.id}','martial')">习武</button>
        <button class="chip" onclick="Game.educateChild('${c.id}','charm')">修仪</button>
        <button class="chip" onclick="Game.educateChild('${c.id}','politics')">问政</button>`:"";
      return `<div class="m-card child">
        ${img("assets/portraits/children/"+st.key+".png","child-face")}
        <div class="m-info">
          <div class="m-head"><b>${c.name}</b><span class="m-post">皇${c.gender==="男"?"子":"女"} · ${c.age}岁 · ${st.name}</span>${heir}${marriedTag}${fiefTag}</div>
          <div class="m-line">母 ${c.mother}</div>
          <div class="m-line">智${c.int} 魅${c.charm} 武${c.martial} 政${c.politics}</div>
          <div class="post-row">${edu}${setBtn}${dipBtn}</div>
        </div></div>`;
    }).join(""):`<p class="panel-tip">膝下尚无子嗣，临幸后宫以开枝散叶。</p>`;
    const allyList=s.allies?Object.keys(s.allies).filter(f=>s.allies[f]>0):[];
    if(allyList.length) h+=`<p class="panel-tip" style="color:#d9a;">※ 当前和亲盟邦：${allyList.map(f=>`${f}（余${s.allies[f]}年）`).join("、")}——盟期内不犯边。</p>`;
    h+=`<p class="panel-tip">※ 公主可<b>和亲结盟</b>(息边+朝贡)、皇子可<b>分封就藩</b>(守土·有拥兵自重之险)。教养消耗当前时段提升皇嗣某维；驾崩时由太子（或最年长皇子）继位，绝嗣则亡国。</p>`;
  }
  else if(name==="army"){
    const n=s.nation, e=s.emperor;
    const gens=s.ministers.filter(m=>m.kind==="martial");
    h+=`<div class="army-grid">
      <div>兵力 <b>${Math.round(n.military)}</b></div>
      <div>粮草 <b>${Math.round(n.food)}</b></div>
      <div>疆域 <b>${Math.round(n.land)}</b></div>
      <div>威望 <b>${Math.round(n.prestige)}</b></div></div>
      <p class="panel-tip"><b>点将出征</b>：点选随征武将（至多 4 员），开「沙盘会战」亲自布阵指挥。消耗本时段行动。</p>
      <div class="muster">`;
    if(!gens.length) h+=`<p class="panel-tip">朝中暂无武将，请于<b>朝堂·求贤</b>招募，或任命大将军。</p>`;
    gens.forEach(g=>{
      const on=campaignPick.has(g.id);
      const wp=g.weapon?(()=>{const w=weaponById(g.weapon);return w?` ${w.name}`:"";})():"";
      h+=`<button class="mus-card ${on?"on":""}" onclick="UI.pickCampaign('${g.id}')">
        ${img(g.portrait,"mus-face")}
        <span class="mus-info"><b>${g.name}</b><i>武略 ${g.mil}${g.post==="marshal"?" · 大将军":""}${wp}</i></span>
        <span class="mus-chk">${on?"✓":"＋"}</span></button>`;
    });
    h+=`</div>
      <label class="mus-emp"><input type="checkbox" ${campaignEmperor?"checked":""} onclick="UI.toggleCampaignEmperor()"> 御驾亲征（陛下临阵·武力 ${Math.round(e.martial)}，强力但有风险）</label>
      <button class="btn btn-primary mus-go" ${(campaignPick.size||campaignEmperor)?"":"disabled"} onclick="UI.doLaunchCampaign()">点 将 出 征（${campaignPick.size}${campaignEmperor?"+帝":""}）</button>
      <p class="panel-tip">※ 沙盘上有平原/山丘/密林/河流，地形影响移动与防御。亦可坐等「番邦入寇」随机应战（仓促战术对决）。</p>`;
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
  const cg=e.cg||(e.good?"end_sage":"end_fall");
  const es=$("screen-end");
  if(es){ es.style.backgroundImage=`linear-gradient(rgba(10,4,2,.74),rgba(10,4,2,.88)), url('assets/scenes/${cg}.jpg')`;
    es.style.backgroundSize="cover"; es.style.backgroundPosition="center"; }
  $("end-seal").textContent=e.seal;
  $("end-temple").textContent=e.temple||"";
  $("end-title").textContent=e.title;
  $("end-desc").textContent=e.desc;
  $("end-stats").innerHTML=`
    <div><b>${stat.years}</b>享国（年）</div>
    <div><b>${stat.gen}</b>传位（代）</div>
    <div><b>${stat.score}</b>国运评分</div>`;
  _lastEnd={e,stat};
  // 「朝代实录图」按钮（注入 end-actions·避免重复）
  const acts=$("screen-end").querySelector(".end-actions");
  if(acts && !acts.querySelector("#btn-annals")){
    const b=document.createElement("button"); b.id="btn-annals"; b.className="btn"; b.textContent="📜 朝代实录图";
    b.onclick=exportAnnals; acts.insertBefore(b, acts.firstChild);
  }
  show("end");
}
let _lastEnd=null;
/* ---------- 史册分享：把一朝实录渲成可保存的长图 ---------- */
function exportAnnals(){
  const s=Game.s, le=_lastEnd||{e:{seal:"崩",title:"",temple:"",desc:""},stat:{years:s.nation.year,gen:s.gen,score:0}};
  const e=le.e, st=le.stat, lines=(s.annals||[]).slice(-14);
  const W=720, H=1180, c=document.createElement("canvas"); c.width=W; c.height=H;
  const x=c.getContext("2d");
  // 背景
  const g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,"#1c130b"); g.addColorStop(.5,"#241810"); g.addColorStop(1,"#160f08");
  x.fillStyle=g; x.fillRect(0,0,W,H);
  x.strokeStyle="#9a7327"; x.lineWidth=3; x.strokeRect(18,18,W-36,H-36);
  x.strokeStyle="#5a4323"; x.lineWidth=1; x.strokeRect(26,26,W-52,H-52);
  const cx=W/2; x.textAlign="center";
  // 标题
  x.fillStyle="#f6dd96"; x.font="bold 40px 'Noto Serif SC',serif";
  x.fillText(`${s.dynasty} · 朝代实录`, cx, 92);
  x.fillStyle="#caa765"; x.font="18px 'Noto Serif SC',serif";
  x.fillText(`${s.reign}朝 · 凡 ${st.years} 载 · 传 ${st.gen} 代`, cx, 126);
  // 结局玺印
  x.save(); x.translate(cx,210);
  x.fillStyle=e.good?"#b5862f":"#7a2018"; x.strokeStyle="#f6dd96"; x.lineWidth=2;
  x.beginPath(); const r=52; x.roundRect(-r,-r,2*r,2*r,12); x.fill(); x.stroke();
  x.fillStyle="#fff"; x.font="bold 60px 'Noto Serif SC',serif"; x.textBaseline="middle";
  x.fillText(e.seal||"崩",0,4); x.restore(); x.textBaseline="alphabetic";
  x.fillStyle="#f2a861"; x.font="20px 'Noto Serif SC',serif"; x.fillText(e.temple||"",cx,300);
  x.fillStyle="#f6dd96"; x.font="bold 30px 'Noto Serif SC',serif"; x.fillText(e.title||"",cx,338);
  // 国运评分
  x.fillStyle="#caa765"; x.font="16px 'Noto Serif SC',serif"; x.fillText(`国运评分 ${st.score}`, cx, 372);
  // 分隔
  x.strokeStyle="#5a4323"; x.beginPath(); x.moveTo(70,398); x.lineTo(W-70,398); x.stroke();
  x.fillStyle="#f2a861"; x.font="bold 20px 'Noto Serif SC',serif"; x.fillText("· 本 朝 大 事 记 ·", cx, 430);
  // 大事记（左对齐·自动换行截断）
  x.textAlign="left"; x.font="16px 'Noto Serif SC',serif";
  let y=466; const maxw=W-120;
  for(const ln of lines){
    let t=ln; if(x.measureText(t).width>maxw){ while(x.measureText(t+"…").width>maxw && t.length>4) t=t.slice(0,-1); t+="…"; }
    x.fillStyle="#caa765"; x.fillText("•", 56, y);
    x.fillStyle="#ece0cf"; x.fillText(t, 76, y); y+=44; if(y>H-110) break;
  }
  // 页脚
  x.textAlign="center"; x.fillStyle="#8a7a5a"; x.font="14px 'Noto Serif SC',serif";
  x.fillText("朕的江山 · 皇帝成长录", cx, H-58);
  x.fillStyle="#6a5a3a"; x.font="12px monospace";
  x.fillText("plum-221.github.io/emperor-simulator", cx, H-36);
  // 导出
  const url=c.toDataURL("image/jpeg",0.92);
  openModal(`<h2>朝代实录图</h2><p class="panel-tip">右键（或长按）图片可保存分享；亦可点下方下载。</p>
    <img src="${url}" style="width:100%;border-radius:10px;border:1px solid #8a6a3a;display:block;margin:6px 0">
    <div class="ar-code"><a class="chip gold" href="${url}" download="${s.dynasty}_朝代实录.jpg">下载实录图</a><button class="chip" onclick="UI.closeModal()">返回</button></div>`);
}

/* ---------- 招贤抽卡结果 ---------- */
function showRecruit(m){
  const rar=(typeof rarityOf!=="undefined")?rarityOf(m):{color:"#cfcfc4",star:"★",name:""};
  openModal(`<div class="recruit-reveal r${rar.r||1}">
    <h2>招贤得士 ✦</h2>
    <div class="rc-frame" style="border-color:${rar.color};box-shadow:0 0 18px ${rar.glow||"transparent"}">${img(m.portrait,"rc-face")}</div>
    <div class="rc-rarity" style="color:${rar.color}">${rar.star} <span>${rar.name}${m.title?" · "+m.title:""}</span></div>
    <div class="rc-name">${m.name}<span class="m-pers">${m.personality}</span></div>
    <div class="rc-stats">
      <span>文才 <b>${m.civ}</b></span><span>武略 <b>${m.mil}</b></span>
      <span>忠诚 <b>${Math.round(m.loyalty)}</b></span><span>野心 <b>${Math.round(m.ambition)}</b></span>
    </div>
    <p class="rc-tip">已入朝待命，可于朝堂授其要职。</p>
    <div style="text-align:center;margin-top:14px"><button class="btn btn-primary" id="rc-ok">纳 入 朝 堂</button></div>
  </div>`);
  const ok=$("rc-ok"); if(ok) ok.onclick=closeModal;
}

/* ---------- 选秀纳妃揭示 ---------- */
function showSelect(c){
  openModal(`<div class="recruit-reveal">
    <h2>选秀采选 ✦</h2>
    ${img(c.portrait,"rc-face")}
    <div class="rc-name">${c.name}<span class="m-pers">${c.personality}</span></div>
    <div class="rc-stats">
      <span>美貌 <b>${c.beauty}</b></span><span>位分 <b>${RANKS[c.rank]}</b></span><span>芳龄 <b>${c.age}</b></span>
    </div>
    <p class="rc-tip">已纳入后宫，可临幸以开枝散叶、或晋其位分。</p>
    <div style="text-align:center;margin-top:14px"><button class="btn btn-primary" id="rc-ok">迎 入 后 宫</button></div>
  </div>`);
  const ok=$("rc-ok"); if(ok) ok.onclick=closeModal;
}

/* ---------- 通用弹窗 ---------- */
function openModal(html){ $("modal-content").innerHTML=html; $("modal").classList.add("open"); }
function closeModal(){ $("modal").classList.remove("open"); }

/* ---------- 朝局势力图（党争可视化）---------- */
function openFactions(){
  const fac=Game.computeFactions();
  const FCLS={外戚党:"#c47894",武将集团:"#c08a4a",权臣朋党:"#b85a5a",清流:"#5a9bb0",朋党:"#8a8170"};
  if(!fac.factions.length){
    openModal(`<h2>朝局势力图</h2><p class="panel-tip">满朝文武各自为政，尚未结成朋党。<br>※ 派系由「师徒/盟友/同党/亲族」关系自然聚合而成；招揽更多关联人物、或密谍司养出结党，朝局便会分化。</p><button class="btn" onclick="UI.closeModal()">退下</button>`); return;
  }
  const cards=fac.factions.map(f=>{
    const col=FCLS[f.kind]||"#8a8170";
    const mem=f.members.map(m=>`<span class="fac-mem">${m.name}${m.post?`<i class="fac-post">${(POSITIONS.find(p=>p.id===m.post)||{}).name||""}</i>`:""}${m.waiqi?'<i class="fac-wq">外戚</i>':""}<u>忠${m.loyalty}·野${m.ambition}</u></span>`).join("");
    return `<div class="fac-card" style="border-color:${col}">
      <div class="fac-head"><b style="color:${col}">${f.kind}</b><span class="fac-pow">权势 ${f.power}</span>${f.peril?'<span class="fac-peril">⚠ 坐大</span>':""}</div>
      <div class="fac-meta">${f.size} 人 · 均忠 ${f.avgLoy} · 均野 ${f.avgAmb}</div>
      <div class="fac-mems">${mem}</div></div>`;
  }).join("");
  const tens=fac.tensions.length?`<div class="fac-tens"><b>党争 · 庙堂相争</b>${fac.tensions.map(t=>`<span class="fac-t ${t.type==="世仇"?"feud":"rival"}">${t.a} <em>${t.type==="世仇"?"⚔":"⚡"}</em> ${t.b}</span>`).join("")}</div>`:`<p class="panel-tip">各派暂无公开倾轧，朝局尚算平和。</p>`;
  const peril=fac.factions.find(f=>f.peril);
  const verdict=peril?`<p class="panel-tip" style="color:#e08a8a">※ <b>${peril.kind}</b>权重过盛、野心炽烈，已成尾大不掉之势——宜遣密谍司察其结党、或以问罪剪其羽翼，否则恐有不臣之祸。`
    :`<p class="panel-tip">※ ${fac.dominant?`当前<b>${fac.dominant.kind}</b>权重最盛。`:""}派系由关系网自然聚合；扶植清流、剪除朋党，乃帝王制衡之术。`;
  openModal(`<h2>朝局势力图 · 党争</h2>${verdict}<div class="fac-grid">${cards}</div>${tens}<button class="btn" onclick="UI.closeModal()">退下</button>`);
}
/* ---------- 和亲结盟 选择弹窗 ---------- */
function openMarriage(pid){
  const G=Game, ps=G.marriageablePrincesses(), fs=G.marriageTargets();
  if(!ps.length){ openModal(`<h2>和亲结盟</h2><p class="panel-tip">尚无适龄待嫁的公主（需年满 14 岁）。</p><button class="btn" onclick="UI.closeModal()">退下</button>`); return; }
  if(!fs.length){ openModal(`<h2>和亲结盟</h2><p class="panel-tip">四方番邦或已臣服、或已结盟，眼下无可和亲之国。</p><button class="btn" onclick="UI.closeModal()">退下</button>`); return; }
  let list=pid?ps.filter(p=>String(p.id)===String(pid)):ps; if(!list.length) list=ps;
  const rows=list.map(p=>`<div class="dip-row"><div class="dip-who"><b>${p.name}</b> 公主 · ${p.age}岁 · 魅${p.charm}</div>
    <div class="dip-opts">${fs.map(f=>`<button class="chip dip" onclick="Game.doMarriage('${p.id}','${f}')">嫁 ${f}</button>`).join("")}</div></div>`).join("");
  openModal(`<h2>和亲结盟 · 秦晋之好</h2><p class="panel-tip">择一公主远嫁番邦，缔结<b>六年盟约</b>：该国不复犯边，并奉表献礼朝贡（国库 +8·粮 +6·威望 +5）。盟期满后须重修旧好，否则边衅复萌。</p>${rows}<button class="btn" onclick="UI.closeModal()">从长计议</button>`);
}
/* ---------- 分封就藩 选择弹窗 ---------- */
function openEnfeoff(pid){
  const G=Game, ps=G.enfeoffablePrinces(), rs=G.enfeoffableRegions();
  if(!ps.length){ openModal(`<h2>分封就藩</h2><p class="panel-tip">尚无可分封的皇子（需年满 15 岁、非太子、未就藩）。</p><button class="btn" onclick="UI.closeModal()">退下</button>`); return; }
  if(!rs.length){ openModal(`<h2>分封就藩</h2><p class="panel-tip">尚无可供分封的州郡（需我朝直辖、非都城、未封藩）。先往「天下」开疆拓土。</p><button class="btn" onclick="UI.closeModal()">退下</button>`); return; }
  let list=pid?ps.filter(p=>String(p.id)===String(pid)):ps; if(!list.length) list=ps;
  const rows=list.map(p=>`<div class="dip-row"><div class="dip-who"><b>${p.name}</b> 皇子 · ${p.age}岁 · 武${p.martial} 政${p.politics}</div>
    <div class="dip-opts">${rs.map(r=>`<button class="chip dip" onclick="Game.doEnfeoff('${p.id}','${r.id}')">就藩 ${r.name}</button>`).join("")}</div></div>`).join("");
  openModal(`<h2>分封就藩 · 藩屏王室</h2><p class="panel-tip">封皇子为藩王、镇守一州：藩镇拱卫，守备骤增、岁有藩贡。然藩王年久兵厚易生异心，恐有<b>拥兵自重</b>之患——封建乃双刃之剑。</p>${rows}<button class="btn" onclick="UI.closeModal()">从长计议</button>`);
}

/* ---------- 标题 / 启动 ---------- */
function showRecord(){
  const b=JSON.parse(localStorage.getItem("zjjs_best")||"null");
  $("title-record").textContent=b?`最盛之世：${b.dynasty}　享国 ${b.years} 年 · 传 ${b.gen} 代 · 国运 ${b.score}`:"";
  $("btn-continue").style.display=localStorage.getItem("zjjs_save")?"":"none";
}

/* ---------- 新手引导（首通分步浮层·可在菜单重看）---------- */
const GUIDE_STEPS=[
  {t:"君临天下 · 欢迎",b:"你是开国之君。一回合＝一个月，玩法循环只有三步：<br><b>① 上朝</b>批一桩奏折（多选项，牵动国力与人心）<br><b>② 行动</b>择一而行（勤政／读书习武／临幸后宫／召见群臣／休养）<br><b>③ 下一回合</b>结算经济、忠诚、生育、年岁<br>顶部「下一时段／快进」推进时间，遇大事自动停。"},
  {t:"顶栏 · 两套属性",b:"<b>国力六维</b>（国库／兵力／民心／粮草／疆土／威望）是江山家底——任一归零便有亡国之虞。<br><b>帝王五维</b>（健康／智力／魅力／武力／政治）靠「行动」养成，越高则理政、征战、攻略越强。治国是<b>收支平衡</b>的艺术，别让任何一维崩盘。"},
  {t:"底部 · 五大舞台",b:"<b>朝堂</b>：满朝文武各有忠诚野心；任要职增益国力，可设<b>密谍司</b>查暗线、看<b>朝局势力图</b>（党争）。<br><b>后宫</b>：攻略嫔妃、诞育皇嗣。<br><b>皇嗣</b>：培养立太子；公主可<b>和亲</b>结盟、皇子可<b>分封</b>守边。<br><b>天下</b>：可点击大地图的回合制 4X——经营城池、研国策、点将出征<b>沙盘会战</b>。<br><b>大业</b>：任务／成就／图鉴／称号。"},
  {t:"长线 · 世代与结局",b:"帝王会老、会驾崩。立了太子，江山便<b>世代相传</b>、新君续局；绝嗣则亡国。<br>一生如何，<b>盖棺定论</b>：勤政均衡→千古一帝，开疆→武皇，仁政→仁君，嗜杀→暴君……八种人设结局，看你怎么当这个皇帝。<br>亦可亲征扫平列国，成<b>一统天下</b>之大结局。"},
  {t:"贴士",b:"· 看不清某词？多数按钮可<b>悬停看说明</b>。<br>· 怕丢档／换设备：菜单「存档」可<b>导出存档码</b>带走。<br>· 本引导可在<b>菜单 → 新手引导</b>随时重看。<br>祝陛下国祚绵长，青史留名！"},
];
function openGuide(step){
  step=Math.max(0,Math.min(GUIDE_STEPS.length-1, step|0));
  const g=GUIDE_STEPS[step], last=step===GUIDE_STEPS.length-1;
  const dots=GUIDE_STEPS.map((_,i)=>`<i class="g-dot${i===step?" on":""}"></i>`).join("");
  try{ localStorage.setItem("zjjs_onboarded","1"); }catch(e){}
  openModal(`<div class="guide"><div class="g-step">引导 ${step+1}/${GUIDE_STEPS.length}</div>
    <h2>${g.t}</h2><p class="g-body">${g.b}</p>
    <div class="g-dots">${dots}</div>
    <div class="g-btns">
      ${step>0?`<button class="chip" onclick="UI.openGuide(${step-1})">上一步</button>`:`<button class="chip" onclick="UI.closeModal()">跳过</button>`}
      ${last?`<button class="btn btn-primary" onclick="UI.closeModal()">开始治国 ▶</button>`:`<button class="btn btn-primary" onclick="UI.openGuide(${step+1})">下一步 ▶</button>`}
    </div></div>`);
}
function maybeOnboard(){ try{ if(!localStorage.getItem("zjjs_onboarded")) setTimeout(()=>openGuide(0),600); }catch(e){} }
function openHelp(){
  openModal(`<h2>玩法说明</h2>
  <p>你是开国之君。每一回合（月）先<b>上朝</b>处理一桩朝政奏折，再择一项<b>行动</b>（勤政／读书习武／临幸后宫／召见群臣／休养），然后<b>下一回合</b>结算。</p>
  <h3>四大系统</h3>
  <p><b>朝堂</b>：满朝文武各有文才武略、忠诚野心。任命丞相、大将军等要职，他们每回合为你增益国力；忠诚过低而野心过高者会<b>谋反</b>。</p>
  <p><b>后宫 / 皇嗣</b>：临幸嫔妃生育皇子公主，培养并<b>立太子</b>。帝王驾崩由太子继位，江山<b>世代相传</b>；绝嗣则亡国。</p>
  <p><b>军务战争</b>：番邦入寇或主动北伐，遣大将军或御驾亲征，兵力＋将领武略决定胜负，胜则开疆拓土。</p>
  <p><b>经济民生·科举外交</b>：国库靠民心疆域征税、养兵养官需开支；逢科举纳贤才、行和亲结盟好。</p>
  <p>国库枯竭、民心尽失、兵败国破、权臣篡位或绝嗣，皆会<b>亡国</b>。在位长久、国力均衡、威望卓著的明君，方能青史留名为<b>千古一帝</b>。</p>`);
}

/* ---------- 存档管理 ---------- */
function fmtSaveTime(ts){ const d=new Date(ts), p=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; }
/* mode: "save" 游戏内(可存入/读取/删除) · "load" 标题页(仅读取/删除) */
function openArchive(mode){
  Game._archiveMode=mode;
  const metas=Game.slotsMeta();
  let h=`<h2>存档 ✦ <span class="ar-sub">${mode==="save"?"存入 · 读取 · 删除":"读取存档"}</span></h2><div class="slots">`;
  for(let i=0;i<metas.length;i++){
    const m=metas[i];
    h+=`<div class="slot ${m?"used":"empty"}">
      <div class="slot-no">${i+1}</div>
      <div class="slot-info">${m?`<b>${m.dynasty} · ${m.reign}帝</b><span>${m.year}年${m.month}月 · 第 ${m.gen} 代 · 国运 ${m.score}</span><i>${fmtSaveTime(m.ts)}</i>`:`<span class="slot-none">— 空 档 —</span>`}</div>
      <div class="slot-btns">
        ${mode==="save"?`<button class="chip gold" onclick="Game.saveToSlot(${i})">${m?"覆盖":"存入"}</button>`:""}
        ${m?`<button class="chip" onclick="Game.loadFromSlot(${i})">读取</button>`:""}
        ${m?`<button class="chip danger" onclick="Game.deleteSlot(${i})">删除</button>`:""}
      </div></div>`;
  }
  h+=`</div>
    <div class="ar-code"><button class="chip gold" onclick="UI.showExportCode()">导出存档码</button><button class="chip" onclick="UI.showImportCode()">导入存档码</button></div>
    <p class="panel-tip">※ 存档存于本机浏览器（清除浏览器数据会丢失）。怕丢档或想换设备，用<b>导出存档码</b>把整局存成一串文本带走，到别处<b>导入</b>即续。「继续上局」是自动存档，与此处 6 格手动存档互不影响。</p>`;
  openModal(h);
}
function showExportCode(){
  const code=Game.exportSave();
  openModal(`<h2>导出存档码</h2><p class="panel-tip">复制下方整串文本妥善保存（换设备/防丢）。到别处「导入存档码」即可续局。</p>
    <textarea class="code-box" readonly onclick="this.select()">${code}</textarea>
    <div class="ar-code"><button class="chip gold" id="copy-code">一键复制</button><button class="chip" onclick="UI.openArchive('save')">返回</button></div>`);
  const cb=$("copy-code"); if(cb) cb.onclick=()=>{ const ta=document.querySelector(".code-box"); if(ta){ ta.select();
    try{ navigator.clipboard.writeText(ta.value); }catch(e){ document.execCommand&&document.execCommand("copy"); }
    cb.textContent="已复制 ✓"; } };
}
function showImportCode(){
  openModal(`<h2>导入存档码</h2><p class="panel-tip warn-tip">导入将<b>覆盖当前进度</b>，请确认已存档。粘贴存档码后点导入。</p>
    <textarea class="code-box" placeholder="在此粘贴存档码……"></textarea>
    <div class="ar-code"><button class="chip gold" id="do-import">导　入</button><button class="chip" onclick="UI.openArchive('save')">返回</button></div>`);
  const ib=$("do-import"); if(ib) ib.onclick=()=>{ const ta=document.querySelector(".code-box"); if(ta&&Game.importSave(ta.value)) UI.closeModal(); };
}
function openGameMenu(){
  const mOn=(typeof MusicSys!=="undefined")&&MusicSys.isEnabled();
  const sOn=(typeof SFX!=="undefined")&&!SFX.isMuted();
  openModal(`<h2>菜单</h2><div class="menu-list">
    <button class="btn btn-primary" onclick="UI.openArchive('save')">存档 / 读档</button>
    <button class="btn" onclick="UI.toggleMusic(this)">背景音乐：${mOn?"开":"关"}</button>
    <button class="btn" onclick="UI.toggleSfx(this)">音效：${sOn?"开":"关"}</button>
    <button class="btn" onclick="UI.openGuide(0)">新手引导</button>
    <button class="btn" onclick="UI.openHelp()">玩法说明</button>
    <button class="btn" onclick="UI.openCheatGate()">🔓 破解版</button>
    <button class="btn" onclick="UI.backToTitle()">返回标题</button>
    <button class="btn ghost" onclick="UI.closeModal()">✖ 继续游戏</button>
  </div><p class="panel-tip">※ 背景音乐为实时合成古风（五声音阶古筝），随昼夜战事变换。进度已自动保存。</p>`);
}
/* ---------- 破解版（密令 admin@XI）---------- */
function openCheatGate(){
  if(Game._cheat){ openCheatPanel(); return; }
  openModal(`<h2>🔒 破解版</h2>
    <p class="panel-tip">输入帝王密令，解锁全方位体验与参数编辑。</p>
    <div class="nb-name"><span>密令</span><input id="ch-pass" type="password" placeholder="••••••••"></div>
    <div class="nb-btns">
      <button class="btn btn-primary" onclick="UI.verifyCheat()">解　锁</button>
      <button class="btn ghost" onclick="UI.openGameMenu()">返回</button>
    </div>`);
  setTimeout(()=>{ const i=$("ch-pass"); if(i){ i.focus(); i.onkeydown=e=>{ if(e.key==="Enter") verifyCheat(); }; } },60);
}
function verifyCheat(){
  const v=($("ch-pass")?$("ch-pass").value:"").trim();
  if(v==="admin@XI"){ Game._cheat=true; try{localStorage.setItem("zjjs_cheat","1");}catch(e){}
    toast("密令通过，破解版已解锁"); openCheatPanel(); }
  else { toast("密令有误"); const i=$("ch-pass"); if(i){ i.value=""; i.focus(); } }
}
function openCheatPanel(){
  const s=Game.s; if(!s){ toast("请先开局"); return; }
  const n=s.nation, e=s.emperor;
  const NK=Object.keys(NATION_STATS), EK=Object.keys(EMP_ATTRS);
  const row=(k,grp,label,val)=>`<label class="ch-row"><span>${label}</span><input class="ch-in" data-grp="${grp}" data-k="${k}" value="${val}"></label>`;
  const h=`<div class="cheat"><h2>🔓 破解版 · 帝王密令</h2>
    <p class="panel-tip ch-tip">一键拉满，或编辑数值后「应用」。各维上限 100，招贤点·碎片·圣寿不限。仅本机生效。</p>
    <div class="ch-quick">
      <button class="btn btn-primary" onclick="UI.cheatMax('nation')">国力全满</button>
      <button class="btn btn-primary" onclick="UI.cheatMax('emperor')">帝王全满</button>
      <button class="btn" onclick="UI.cheatAdd('recruitPoints',500)">招贤点 +500</button>
      <button class="btn" onclick="UI.cheatAdd('shards',500)">碎片 +500</button>
      <button class="btn" onclick="UI.cheatHeal()">龙体康复</button>
    </div>
    <h3 class="ch-h">国家六维</h3>
    <div class="ch-grid">${NK.map(k=>row(k,"n",NATION_STATS[k].name,Math.round(n[k]))).join("")}</div>
    <h3 class="ch-h">帝王五维</h3>
    <div class="ch-grid">${EK.map(k=>row(k,"e",EMP_ATTRS[k].name,Math.round(e[k]))).join("")}</div>
    <h3 class="ch-h">资源 · 寿数</h3>
    <div class="ch-grid">
      ${row("recruitPoints","s","招贤点",s.recruitPoints||0)}
      ${row("shards","s","碎片",s.shards||0)}
      ${row("age","e","圣寿",e.age||0)}
    </div>
    <div class="nb-btns">
      <button class="btn btn-primary" onclick="UI.cheatApply()">应　用</button>
      <button class="btn ghost" onclick="UI.openGameMenu()">返回菜单</button>
    </div></div>`;
  openModal(h);
}
function _cheatRefresh(){ renderHUD(); renderEmperor(); if(typeof Game.save==="function") Game.save(); }
function cheatMax(which){
  const s=Game.s; if(!s) return;
  if(which==="nation"){ for(const k in NATION_STATS) s.nation[k]=100; }
  else { for(const k in EMP_ATTRS) s.emperor[k]=100; }
  _cheatRefresh(); toast(which==="nation"?"国力已拉满":"帝王五维已拉满"); openCheatPanel();
}
function cheatAdd(key,amt){ const s=Game.s; if(!s) return; s[key]=(s[key]||0)+amt; _cheatRefresh(); toast(`${key==="shards"?"碎片":"招贤点"} +${amt}`); openCheatPanel(); }
function cheatHeal(){ const s=Game.s; if(!s) return; s.emperor.health=100; _cheatRefresh(); toast("龙体康复，健康 100"); openCheatPanel(); }
function cheatApply(){
  const s=Game.s; if(!s) return;
  [...document.querySelectorAll(".ch-in")].forEach(inp=>{
    const grp=inp.dataset.grp, k=inp.dataset.k; let v=parseInt(inp.value,10); if(isNaN(v)) return;
    if(grp==="n") s.nation[k]=v; else if(grp==="e") s.emperor[k]=v; else s[k]=v;
  });
  if(typeof Game.clampAll==="function") Game.clampAll();   // 六维/五维收敛到 0-100，招贤点/碎片/圣寿不受限
  _cheatRefresh(); toast("已应用"); openCheatPanel();
}

function toggleMusic(btn){ if(typeof MusicSys==="undefined") return; const on=MusicSys.toggle(); if(btn) btn.textContent=`背景音乐：${on?"开":"关"}`; }
function toggleSfx(btn){ if(typeof SFX==="undefined") return; const on=SFX.isMuted(); SFX.setMuted(!on); if(btn) btn.textContent=`音效：${!on?"关":"开"}`; }
function backToTitle(){ closeModal(); show("title"); showRecord(); if(typeof MusicSys!=="undefined") MusicSys.setScene("title"); }

/* ---------- 新生皇嗣赐名 ---------- */
function promptNewborns(){
  const s=Game.s; if(!s._newborns||!s._newborns.length) return;
  const id=s._newborns[0];
  const c=s.children.find(x=>String(x.id)===String(id));
  if(!c){ s._newborns.shift(); return promptNewborns(); }   // 已不存在则跳过
  const sib=c.gender==="男"?"皇子":"公主";
  openModal(`<h2>${sib} 降生</h2>
    <p class="nb-tip"><b>${c.mother}</b> 为陛下诞下一位 <b>${sib}</b>，恭请陛下赐名。</p>
    <div class="nb-name"><span>赐名</span><input id="nb-input" maxlength="4" value="${c.name}" placeholder="${c.name}"></div>
    <div class="nb-btns">
      <button class="btn btn-primary" onclick="UI.confirmNewbornName()">钦　定</button>
      <button class="btn ghost" onclick="UI.confirmNewbornName(true)">由钦天监拟名</button>
    </div>`);
  setTimeout(()=>{ const i=$("nb-input"); if(i){ i.focus(); i.select();
    i.onkeydown=e=>{ if(e.key==="Enter") confirmNewbornName(); }; } },60);
}
function confirmNewbornName(keep){
  const s=Game.s; if(!s._newborns||!s._newborns.length){ closeModal(); return; }
  const id=s._newborns[0];
  const c=s.children.find(x=>String(x.id)===String(id));
  if(c && !keep){ const v=($("nb-input")?$("nb-input").value:"").trim(); if(v) c.name=v.slice(0,4); }
  s._newborns.shift(); if(typeof Game.save==="function") Game.save();
  closeModal();
  if(s._newborns.length){ setTimeout(promptNewborns,120); }   // 还有未命名者，继续下一位
}

/* ---------- 开场预加载：只阻塞「开局必现」的关键立绘，其余进场后后台静默预热 ----------
   旧版把全部 ~156 张立绘(≈23MB)堵在开场，进场奇慢。现拆两档：
   crit = 开局即可能展示(帝王四龄/皇嗣成长/固定妃子/武器/名将) ≈30 张 → 阻塞预热(进场快)
   rest = 招贤/选秀才出现的百官与妃子池(百余张) → 进场后后台 new Image() 静默预热(不挡路) */
function collectAssetUrls(){
  const M=Game.manifest||{}, crit=new Set(), rest=new Set();
  const addC=u=>{ if(u) crit.add(u); }, addR=u=>{ if(u) rest.add(u); };
  if(typeof EMPEROR_BANDS!=="undefined") EMPEROR_BANDS.forEach(b=>addC("assets/portraits/emperor/"+b.key+".png"));
  if(typeof CHILD_STAGES!=="undefined")  CHILD_STAGES.forEach(st=>addC("assets/portraits/children/"+st.key+".png"));
  if(typeof CONSORTS!=="undefined")      CONSORTS.forEach(c=>addC(c.portrait));   // 后宫面板开局即列可攻略妃
  if(typeof WEAPONS!=="undefined")       WEAPONS.forEach(w=>addC(w.img));
  (M.generals ||[]).forEach(x=>addC(x.file));                                     // 名将仅 4 张，开局军务/事件常现
  (M.ministers||[]).slice(0,12).forEach(x=>addC(x.file));                         // 开局班底+早期招贤大致命中
  (M.ministers||[]).slice(12).forEach(x=>addR(x.file));
  (M.consorts ||[]).forEach(x=>addR(x.file));
  ["guard","archer","medic","foe_chief","foe_soldier","foe_archer","foe_shaman"].forEach(k=>addR("assets/portraits/units/"+k+".png")); // 沙盘单位头像
  const c=[...crit];
  return { crit:c, rest:[...rest].filter(u=>!crit.has(u)) };
}
function preloadAssets(done){
  const {crit, rest}=collectAssetUrls(), total=crit.length;
  const fill=$("pl-fill"), txt=$("pl-text"), pl=$("preloader");
  let loaded=0, revealed=false, warmed=false;
  // 后台静默预热其余立绘（不阻塞、不计进度），稍延后避免与首屏抢带宽
  const warmRest=()=>{ if(warmed) return; warmed=true;
    setTimeout(()=>{ rest.forEach(u=>{ const im=new Image(); im.src=u; }); }, 1800); };
  // 关键集就绪 → 自动揭开标题（不再强制轻触·杜绝误触穿透到「即皇帝位」）。
  // 标题曲不在此 start——交给 music.js 全局首次交互监听(pointerdown/keydown)起播，
  // 否则此处提前 start() 会把 started 置真，玩家真点击时反而不响。
  const reveal=()=>{ if(revealed) return; revealed=true;
    if(txt) txt.textContent="恭 迎 圣 驾";
    if(pl){ pl.classList.add("done"); setTimeout(()=>{ pl.style.display="none"; },520); }
    done&&done(); warmRest();
  };
  if(!total){ reveal(); return; }
  const tick=()=>{ loaded++;
    const pct=Math.round(loaded/total*100);
    if(fill) fill.style.width=pct+"%";
    if(txt && !revealed) txt.textContent=`恭迎圣驾 · 备办仪仗　${loaded}/${total}`;
    if(loaded>=total) reveal();
  };
  crit.forEach(u=>{ const im=new Image(); im.onload=im.onerror=tick; im.src=u; });
  setTimeout(reveal, 20000); // 兜底：个别图卡住也自动放行进标题
}
function boot(){
  try{ if(localStorage.getItem("zjjs_cheat")==="1") Game._cheat=true; }catch(e){}   // 破解版一经解锁，本机长期有效
  Game.init().then(()=>{
    showRecord();
    if(typeof MusicSys!=="undefined") MusicSys.setScene("title");   // 标题曲（首次交互后起播）
    $("btn-start").onclick=()=>Game.newGame($("inp-dynasty").value.trim(),$("inp-name").value.trim(),$("inp-reign").value.trim());
    $("btn-continue").onclick=()=>{ if(!Game.load()) toast("无存档"); };
    $("btn-load").onclick=()=>openArchive("load");
    $("btn-help").onclick=openHelp;
    $("btn-replay").onclick=()=>{ show("title"); showRecord(); if(typeof MusicSys!=="undefined") MusicSys.setScene("title"); };
    $("btn-next").onclick=()=>Game.nextTurn();
    $("btn-menu").onclick=openGameMenu;
    [...document.querySelectorAll(".tab[data-panel]")].forEach(t=>{
      t.onclick=()=>openPanel(t.dataset.panel);
      const ic=t.querySelector(".tico"); if(ic) ic.innerHTML=ICONS[t.dataset.panel]||"";
    });
    var ni=document.querySelector("#btn-next .tico"); if(ni) ni.innerHTML=ICONS.next;
    $("panel-close").onclick=closePanel;
    $("panel-mask").onclick=e=>{ if(e.target===$("panel-mask")) closePanel(); };
    $("modal-close").onclick=closeModal;
    document.addEventListener("click",()=>SFX.unlock(),{once:true});
    preloadAssets();   // 预加载全部立绘 → 进度条满后揭开标题
  });
}

return {toGame:()=>{ show("game"); if(typeof MusicSys!=="undefined") MusicSys.setScene("court"); }, renderHUD, renderEmperor, showEvent, showMonth, renderActions,
  openPanel, closePanel, renderPanel, toast, announceSuccession, showEnd, showRecruit, showSelect,
  openModal, closeModal, openArchive, openGameMenu, openHelp, backToTitle,
  pickCampaign, toggleCampaignEmperor, doLaunchCampaign, dayTransition, openCharacter, openSpy, openImpeach,
  openMarriage, openEnfeoff, openFactions, showExportCode, showImportCode, openGuide, maybeOnboard, exportAnnals,
  promptNewborns, confirmNewbornName,
  openCheatGate, verifyCheat, openCheatPanel, cheatMax, cheatAdd, cheatHeal, cheatApply,
  toggleMusic, toggleSfx, boot};
})();

UI.boot();
