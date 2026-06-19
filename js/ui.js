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
function showEvent(card){
  const s=Game.s;
  if(!card._face) card._face=faceFor(card.role||"chancellor");
  const speaker=ROLE_NAME[card.role]||"大臣";
  const text=typeof card.text==="function"?card.text(s):card.text;
  const title=typeof card.title==="function"?card.title(s):card.title;
  const choices=card.choices.filter(c=>!c.cond||c.cond(s));
  const banner=card.big?`<div class="ev-banner">⚠ 大 事 件 · 国 之 存 亡</div>`:"";
  $("event-area").innerHTML=`
    <div class="ev-card${card.big?" big":""}">
      ${banner}
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
    questLine=q?`<p class="month-quest">📜 当前大业：<b>${q.name}</b> —— ${q.desc}</p>`:`<p class="month-quest">📜 中兴大业已成，名垂青史。</p>`; }
  $("event-area").innerHTML=`
    <div class="month-card">
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
  if(s.pendingEvent){ $("action-area").innerHTML=`<p class="act-hint">⚑ 请先在上方处理朝政奏折</p>`; return; }
  const ff=`<button class="act-ff" id="btn-ff">⏩ 快进至下一事件 / 月末</button>`;
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
function openPanel(name,opts){ panelOpts=opts||{}; $("panel-mask").classList.add("open"); renderPanel(name); }
function closePanel(){ $("panel-mask").classList.remove("open"); panelOpts={}; }
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
        <button class="btn btn-primary rc-btn" ${(s.recruitPoints||0)<GACHA.cost?"disabled":""} onclick="Game.weaponDraw()">铸兵 ⚔ ${GACHA.cost}点</button>
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
      const tg=GACHA.tiers[m.tier||"mid"];
      const upBtn=(s.shards||0)>=UPGRADE_COST?`<button class="chip" onclick="Game.upgradeMinister('${m.id}')">碎片精进 ✦${UPGRADE_COST}</button>`:"";
      const canBk=(m.level||1)>=5 && (m.tier||"low")!=="high";
      const bkBtn=selecting?"":`<button class="chip ${canBk&&(s.shards||0)>=8?"gold":""}" ${canBk?"":"disabled"} onclick="Game.breakthrough('${m.id}')" title="Lv5且非满星可突破·耗碎片8">突破 ⤴${canBk?" ✦8":""}</button>`;
      const wpSel=(!selecting&&owned.length)?`<select class="wp-sel" onchange="Game.equipWeapon('${m.id}',this.value)">
        <option value="">⚔ 佩兵…</option>`+owned.map(w=>`<option value="${w.id}" ${m.weapon===w.id?"selected":""}>${w.name} ${w.stat==="mil"?"武":"文"}+${w.bonus+((s.weaponLv&&s.weaponLv[w.id])||0)*FORGE_STEP}</option>`).join("")+`</select>`:"";
      const postBtns=selecting?"":`<div class="post-row">`+
        POSITIONS.map(p=>`<button class="chip ${m.post===p.id?"on":""}" onclick="Game.appoint('${m.id}','${m.post===p.id?"":p.id}')">${p.name}</button>`).join("")+
        `<button class="chip" onclick="Game.rewardMinister('${m.id}')">赏赐</button>`+upBtn+bkBtn+wpSel+
        `<button class="chip warn" onclick="Game.dismissMinister('${m.id}')">罢免</button>`+
        `<button class="chip danger" onclick="Game.executeMinister('${m.id}')">处死</button></div>`;
      const wpTag=m.weapon?(()=>{const w=weaponById(m.weapon);return w?`<span class="m-wp" title="${w.desc}">⚔${w.name}</span>`:"";})():"";
      return `<div class="m-card" ${selecting?`onclick="Game.audienceMinister('${m.id}')"`:""}>
        ${img(m.portrait,"m-face")}
        <div class="m-info">
          <div class="m-head"><b>${m.name}</b><span class="m-tier" style="color:${tg.color}" title="${tg.name}">${tg.star}</span><span class="m-post">${pos}</span>${wpTag}<span class="m-pers">${m.personality}</span></div>
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
            ${blocked?`<p class="woo-block">⚠ ${t.unlock.desc}——门第现已失势，暂难亲近</p>`:`<div class="post-row">
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
            <div class="m-line lock-cond">🔒 ${t.unlock.desc}</div></div></div>`;
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
      // 已成年(弱冠)不再教养
      const edu=st.key!=="youth"?`
        <button class="chip" onclick="Game.educateChild('${c.id}','int')">习文</button>
        <button class="chip" onclick="Game.educateChild('${c.id}','martial')">习武</button>
        <button class="chip" onclick="Game.educateChild('${c.id}','charm')">修仪</button>
        <button class="chip" onclick="Game.educateChild('${c.id}','politics')">问政</button>`:"";
      return `<div class="m-card child">
        ${img("assets/portraits/children/"+st.key+".png","child-face")}
        <div class="m-info">
          <div class="m-head"><b>${c.name}</b><span class="m-post">皇${c.gender==="男"?"子":"女"} · ${c.age}岁 · ${st.name}</span>${heir}</div>
          <div class="m-line">母 ${c.mother}</div>
          <div class="m-line">智${c.int} 魅${c.charm} 武${c.martial} 政${c.politics}</div>
          <div class="post-row">${edu}${setBtn}</div>
        </div></div>`;
    }).join(""):`<p class="panel-tip">膝下尚无子嗣，临幸后宫以开枝散叶。</p>`;
    h+=`<p class="panel-tip">※ 教养可消耗当前时段提升皇嗣某一维（边际递减）；弱冠成年后定型。帝王驾崩时由太子（或最年长皇子）继位，绝嗣则亡国。</p>`;
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

/* ---------- 招贤抽卡结果 ---------- */
function showRecruit(m){
  openModal(`<div class="recruit-reveal">
    <h2>招贤得士 ✦</h2>
    ${img(m.portrait,"rc-face")}
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
  h+=`</div><p class="panel-tip">※ 存档存于本机浏览器（清除浏览器数据会丢失）。「继续上局」是自动存档，与此处 6 格手动存档互不影响。</p>`;
  openModal(h);
}
function openGameMenu(){
  openModal(`<h2>菜单</h2><div class="menu-list">
    <button class="btn btn-primary" onclick="UI.openArchive('save')">💾 存档 / 读档</button>
    <button class="btn" onclick="UI.openHelp()">📜 玩法说明</button>
    <button class="btn" onclick="UI.backToTitle()">🏛 返回标题</button>
    <button class="btn ghost" onclick="UI.closeModal()">✖ 继续游戏</button>
  </div><p class="panel-tip">※ 进度已自动保存，返回标题后可「继续上局」。</p>`);
}
function backToTitle(){ closeModal(); show("title"); showRecord(); }

function boot(){
  Game.init().then(()=>{
    showRecord();
    $("btn-start").onclick=()=>Game.newGame($("inp-dynasty").value.trim(),$("inp-name").value.trim(),$("inp-reign").value.trim());
    $("btn-continue").onclick=()=>{ if(!Game.load()) toast("无存档"); };
    $("btn-load").onclick=()=>openArchive("load");
    $("btn-help").onclick=openHelp;
    $("btn-replay").onclick=()=>{ show("title"); showRecord(); };
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
  });
}

return {toGame:()=>show("game"), renderHUD, renderEmperor, showEvent, showMonth, renderActions,
  openPanel, closePanel, renderPanel, toast, announceSuccession, showEnd, showRecruit, showSelect,
  openModal, closeModal, openArchive, openGameMenu, openHelp, backToTitle, boot};
})();

UI.boot();
