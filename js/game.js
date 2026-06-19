/* ===================================================================
   game.js —— 游戏引擎
   状态 / 回合循环（上朝→行动→结算）/ 经济与忠诚结算 /
   战争 / 后宫子嗣 / 世代传承 / 结局
   暴露全局 Game；事件 do(G) 通过 G 调用本对象方法。
   =================================================================== */
const Game = (() => {
"use strict";

const ENDINGS = {
  bankrupt:{seal:"穷",temple:"谥曰·哀帝",title:"国库枯竭",desc:"府库空空，百官断俸、边军哗变。债台高筑的朝廷再难运转，江山就此倾覆。"},
  min_revolt:{seal:"反",temple:"谥曰·灵帝",title:"官逼民反",desc:"民心丧尽，赤地千里。揭竿者云集响应，义军攻破宫门，王朝在烈火中改姓易代。"},
  invaded:{seal:"破",temple:"谥曰·愍帝",title:"国门洞开",desc:"兵力凋零，铁骑长驱直入。京城陷落，社稷化为焦土，宗庙不血食矣。"},
  usurped:{seal:"篡",temple:"史册除名",title:"权臣篡位",desc:"你放任权臣坐大，终被一杯鸩酒送上西天。新朝建立，你的名字被从宗庙抹去。"},
  no_heir:{seal:"绝",temple:"谥曰·殇帝",title:"绝嗣而终",desc:"你驾崩之时膝下无子，皇位无人可继。诸王争立，外戚干政，盛极一时的王朝就此分崩离析。"},
  poison:{seal:"丹",temple:"谥曰·惑帝",title:"丹毒攻心",desc:"你痴迷长生、日服金丹，重金属之毒终于发作。你在幻觉中“飞升”，留下无尽遗恨。"},
  sage:{seal:"圣",temple:"庙号·圣祖",title:"千古一帝",desc:"你在位数十载，文治武功，四海升平、万邦来朝。史官提笔，尊你为圣祖，庙食千秋，万世传颂。",good:true}
};

let G;  // 指向自身，供事件 do() 使用

const api = {
  s:null, manifest:null,

  /* ---------- 启动 ---------- */
  async init(){
    G = this;
    try{
      const r = await fetch("assets/manifest.json");
      this.manifest = await r.json();
    }catch(e){
      console.warn("manifest 读取失败，使用占位：",e);
      this.manifest = {ministers:[],consorts:[],generals:[]};
    }
  },

  newGame(dynasty,name,reign){
    const M=this.manifest;
    const ministers = buildMinisters(M.ministers, 8);
    const generals  = buildGenerals(M.generals.length?M.generals:M.ministers, 4);
    // 开局自动任命前几位
    const roster = ministers.concat(generals);
    this.s = {
      dynasty:dynasty||"大宁", reign:reign||"永熙", gen:1,
      emperor:{name:name||"萧承乾", age:R.i(16,20), portrait:this.pickFace(M),
        health:70, int:R.i(40,65), charm:R.i(40,65),
        martial:R.i(35,60), politics:R.i(40,65), exp:0},
      nation:{year:1, month:1,
        treasury:60, military:55, people:60, food:55, land:50, prestige:45},
      ministers:roster,
      consorts:buildConsorts(M.consorts, 3),
      children:[],
      pool:{ // 剩余立绘，供科举/选秀补充
        ministers:R.shuffle(M.ministers).slice(8,80),
        consorts:R.shuffle(M.consorts).slice(3),
        generals:R.shuffle(M.generals).slice(4)
      },
      flags:{}, log:[], pendingEvent:null, actedThisTurn:false,
      over:false, rebel:null, _succession:null, peakAge:0
    };
    // 默认任命
    this.autoAppoint();
    this.logMsg(`${this.s.dynasty}立国，${this.s.reign}帝即位，时年${this.s.emperor.age}岁。`);
    UI.toGame();
    SFX.gong();
    this.beginTurn();
  },

  pickFace(M){ const arr=(M.generals&&M.generals.length?M.generals:M.ministers)||[]; return arr.length?R.pick(arr).file:""; },

  autoAppoint(){
    const s=this.s;
    const civ=s.ministers.filter(m=>m.civ>=m.mil).sort((a,b)=>b.civ-a.civ);
    const mil=s.ministers.filter(m=>m.mil>m.civ).sort((a,b)=>b.mil-a.mil);
    const give=(arr,post)=>{const m=arr.find(x=>!x.post);if(m)m.post=post;};
    give(civ,"chancellor"); give(civ,"finance"); give(civ,"censor");
    give(mil,"marshal"); give(mil,"defense");
  },

  /* ---------- 回合：上朝 ---------- */
  beginTurn(){
    const s=this.s; if(s.over) return;
    s.actedThisTurn=false;
    s.pendingEvent=this.rollEvent();
    this.renderTurn();
  },

  rollEvent(){
    const s=this.s;
    // 谋反优先
    if(s.rebel){
      s._rebelName=s.rebel.name;
      return EVENTS.find(e=>e.id==="ev_rebel_min");
    }
    if(!R.chance(72)) return null;                 // 部分回合无事
    const cands=EVENTS.filter(e=>(e.weight||1)>0 && (!e.cond||e.cond(s)) && !(e.once&&s.flags["done_"+e.id]));
    if(!cands.length) return null;
    const tot=cands.reduce((a,e)=>a+(e.weight||1),0);
    let r=Math.random()*tot;
    for(const e of cands){ r-=(e.weight||1); if(r<=0) return e; }
    return cands[0];
  },

  /* ---------- 处理奏折选项 ---------- */
  resolveEvent(idx){
    const s=this.s, ev=s.pendingEvent; if(!ev) return;
    const choices=ev.choices.filter(c=>!c.cond||c.cond(s));
    const opt=choices[idx]; if(!opt) return;
    SFX.pick();
    if(opt.effects) this.applyEffects(opt.effects);
    if(ev.once) s.flags["done_"+ev.id]=true;
    s.pendingEvent=null;
    this.logMsg(`【${typeof ev.title==="function"?ev.title(s):ev.title}】${opt.text}`);
    if(opt.do) opt.do(this);          // 可能再次 showCard（如战报）
    this.afterEvent();
  },

  afterEvent(){
    if(this.s.over) return;
    if(this.checkEndings()) return;
    if(this.s.pendingEvent) UI.showEvent(this.s.pendingEvent);
    else this.renderTurn();
  },

  showCard(card){ this.s.pendingEvent=card; },

  /* ---------- 行动（每回合一次）---------- */
  ACTIONS:{
    govern:{name:"勤政",icon:ICONS.govern,hint:"批阅奏章，理政安民",run(s){
      const g=s.emperor.politics; s.nation.treasury+=Math.round(g/12)+R.i(0,3);
      s.nation.people+=Math.round(g/22)+1; s.emperor.health-=2; s.emperor.exp+=2;
      return `勤勉理政，国库 +${Math.round(g/12)+1}，民心略增。`;}},
    read:{name:"读书",icon:ICONS.read,hint:"研读经史，增长智略",run(s){
      s.emperor.int+=R.i(2,4); s.emperor.politics+=1; s.emperor.health-=1;
      return "潜心向学，智力、政治有所长进。";}},
    train:{name:"习武",icon:ICONS.train,hint:"演练武艺，强身健体",run(s){
      s.emperor.martial+=R.i(2,4); s.emperor.health+=1;
      return "勤练弓马，武力增长，龙体康健。";}},
    cultivate:{name:"养性",icon:ICONS.cultivate,hint:"陶冶情操，增益魅力",run(s){
      s.emperor.charm+=R.i(2,4); s.emperor.health+=1;
      return "怡情养性，魅力提升。";}},
    rest:{name:"休养",icon:ICONS.rest,hint:"颐养龙体，恢复健康",run(s){
      s.emperor.health+=R.i(5,8);
      return "静心休养，龙体大安。";}},
    visit:{name:"临幸后宫",icon:ICONS.visit,hint:"宠幸嫔妃，开枝散叶",select:"harem"},
    audience:{name:"召见群臣",icon:ICONS.audience,hint:"召见大臣，笼络忠心",select:"court"}
  },

  doAction(type){
    const s=this.s; if(s.actedThisTurn||s.pendingEvent) return;
    const a=this.ACTIONS[type];
    if(a.select){ UI.openPanel(a.select,{selectAction:type}); return; }
    const msg=a.run(s); s.actedThisTurn=true;
    this.clampAll(); SFX.good(); this.toast(msg);
    this.renderTurn();
  },

  visitConsort(id){
    const s=this.s; const c=s.consorts.find(x=>x.id===id); if(!c)return;
    if(s.actedThisTurn) { this.toast("本月已理政"); return; }
    c.favor=R.clamp(c.favor+R.i(6,12)); c.bond=R.clamp(c.bond+R.i(3,7));
    s.actedThisTurn=true;
    // 受孕：与健康、宠爱相关
    if(c.pregnant==null && R.chance(28+s.emperor.health/8)){ c.pregnant=0; this.toast(`临幸 ${c.name}，${c.name}承欢…（似有喜兆）`);}
    else this.toast(`临幸 ${c.name}，情分渐深。`);
    SFX.good(); UI.closePanel(); this.renderTurn();
  },

  audienceMinister(id){
    const s=this.s; const m=s.ministers.find(x=>x.id===id); if(!m)return;
    if(s.actedThisTurn){ this.toast("本月已理政"); return; }
    m.loyalty=R.clamp(m.loyalty+R.i(5,10)); m.ambition=R.clamp(m.ambition-R.i(2,5));
    s.actedThisTurn=true; SFX.good();
    this.toast(`召见 ${m.name}，君臣相得，忠诚提升。`); UI.closePanel(); this.renderTurn();
  },

  /* ---------- 任命 / 后宫管理 ---------- */
  appoint(id,post){
    const s=this.s, m=s.ministers.find(x=>x.id===id); if(!m)return;
    if(post){ const old=s.ministers.find(x=>x.post===post); if(old)old.post=null; m.post=post; }
    else m.post=null;
    SFX.pick(); UI.renderPanel("court");
  },
  rewardMinister(id){
    const s=this.s, m=s.ministers.find(x=>x.id===id); if(!m)return;
    if(s.nation.treasury<8){ this.toast("国库不足，无以行赏"); return; }
    s.nation.treasury-=8; m.loyalty=R.clamp(m.loyalty+R.i(8,15)); m.reward=3;
    SFX.good(); this.toast(`赏赐 ${m.name}，其感恩戴德。`); UI.renderPanel("court"); this.renderTurn();
  },
  executeMinister(id){
    const s=this.s, i=s.ministers.findIndex(x=>x.id===id); if(i<0)return;
    const m=s.ministers[i]; m.post=null; s.ministers.splice(i,1);
    s.nation.people-=3; this.shiftAllLoyalty(-3);
    SFX.bad(); this.toast(`${m.name} 已伏诛，百官震恐。`); UI.renderPanel("court"); this.renderTurn();
  },
  promoteConsort(id){
    const s=this.s, c=s.consorts.find(x=>x.id===id); if(!c)return;
    if(c.rank>=RANKS.length-1){ this.toast("已是皇后，无以复加"); return; }
    if(c.rank>=6 && s.consorts.some(x=>x.rank===7)){ this.toast("中宫已有皇后"); return; }
    c.rank++; SFX.good(); this.toast(`晋 ${c.name} 为${RANKS[c.rank]}。`); UI.renderPanel("harem");
  },

  setHeir(name){
    const s=this.s;
    s.children.forEach(c=>c.isHeir=false);
    const h=s.children.find(c=>c.name===name); if(h){h.isHeir=true; this.toast(`立 ${h.name} 为太子。`);}
    UI.renderPanel("heir");
  },

  /* ---------- 事件 do() 可调用的 API ---------- */
  shiftAllLoyalty(d){ this.s.ministers.forEach(m=>m.loyalty=R.clamp(m.loyalty+d)); },
  allConsortFavor(d){ this.s.consorts.forEach(c=>c.favor=R.clamp(c.favor+d)); },
  toast(msg){ UI.toast(msg); },
  removeRebel(){ const s=this.s; if(s.rebel){const m=s.ministers.find(x=>x.id===s.rebel.id); if(m){m.post=null; const i=s.ministers.indexOf(m); s.ministers.splice(i,1);} s.rebel=null;} },

  recruit(n){
    const s=this.s; let got=0;
    for(let k=0;k<n;k++){
      const src=s.pool.ministers.shift(); if(!src) break;
      s.ministers.push(buildMinisters([src],1)[0]); got++;
    }
    this.toast(`科举得士，${got} 位新贤入朝。`);
  },

  marryPrincess(){
    const s=this.s; const p=s.children.find(c=>c.gender==="女"&&c.age>=14&&!c.married);
    if(p){ p.married=true; this.toast(`公主 ${p.name} 远嫁番邦，结两国之好。`);}
  },

  /* ---------- 战争 ---------- */
  startWar(type){
    const s=this.s, n=s.nation;
    const enemy=R.pick(ENEMIES);
    const ePow=R.i(40,75)+n.year+ (type==="invade"?8:0);
    const marshal=s.ministers.find(m=>m.post==="marshal");
    let our=n.military*0.5;
    if(type==="emperor") our+=s.emperor.martial+8;
    else our+=(marshal?marshal.mil:25);
    const myRoll=our+R.i(-15,30), enRoll=ePow+R.i(-15,25);
    const win=myRoll>=enRoll;
    let title,text,role="general";
    if(win){
      const land=R.i(3,8),spoil=R.i(6,16),loss=R.i(5,12);
      n.land=R.clamp(n.land+land); n.treasury=R.clamp(n.treasury+spoil);
      n.prestige=R.clamp(n.prestige+(type==="emperor"?12:8)); n.military=R.clamp(n.military-loss);
      n.people=R.clamp(n.people+4);
      title="大捷！"; text=`${type==="invade"?"击退":(type==="emperor"?"御驾亲征，大破":"挥师征讨")}${enemy}，斩获无数！疆域 +${land}，国库 +${spoil}，威望大涨。`;
      if(marshal)marshal.loyalty=R.clamp(marshal.loyalty+4);
      SFX.gong();
    }else{
      const loss=R.i(12,24),land=R.i(2,6);
      n.military=R.clamp(n.military-loss); n.land=R.clamp(n.land-land);
      n.people=R.clamp(n.people-6); n.treasury=R.clamp(n.treasury-6);
      title="败北…"; text=`${enemy}势大，王师${type==="invade"?"未能拒敌":"出师不利"}，损兵折将。兵力 -${loss}，疆域 -${land}。`;
      SFX.bad();
      if(type==="emperor" && n.military<20 && R.chance(35)){
        this.showCard({title:"血染沙场",role:"general",text:"乱军之中，陛下身中流矢……",
          choices:[{text:"（天命如此）",do:G=>G.emperorDies("battle")}]});
        return;
      }
    }
    this.showCard({title,text,role,choices:[{text:"继续",do:()=>{}}]});
  },

  /* ---------- 结算（下一回合）---------- */
  nextTurn(){
    const s=this.s; if(s.over) return;
    if(s.pendingEvent){ this.toast("请先处理朝政奏折"); return; }
    SFX.deal();
    this.resolve();
    if(s.over) return;
    if(this.checkEndings()) return;
    if(s._succession){ const d=s._succession; s._succession=null; UI.announceSuccession(d,()=>this.beginTurn()); return; }
    this.beginTurn();
  },

  resolve(){
    const s=this.s, n=s.nation, e=s.emperor;
    // 百官治绩
    s.ministers.forEach(m=>{
      if(!m.post) return;
      const pos=POSITIONS.find(p=>p.id===m.post); const t=m[pos.use];
      if(m.post==="chancellor"){ n.treasury+=Math.round(t/22); n.people+=Math.round(t/34); }
      if(m.post==="finance"){ n.treasury+=Math.round(t/18); n.food+=Math.round(t/40); }
      if(m.post==="censor"){ n.people+=Math.round(t/45); s.ministers.forEach(x=>x.ambition=R.clamp(x.ambition-1)); }
      if(m.post==="marshal"){ n.military+=Math.round(t/26); }
      if(m.post==="defense"){ n.military+=Math.round(t/30); }
    });
    // 经济：税入 - 开支
    const income=Math.round(n.people/12 + n.land/16);
    const upkeep=Math.round(n.military/14 + s.consorts.length*0.6 + s.ministers.filter(m=>m.post).length);
    n.treasury+=income-upkeep;
    n.food+=Math.round(n.land/22 - n.people/34);
    // 拮据反噬
    if(n.treasury<15){ n.people-=4; this.shiftAllLoyalty(-3); }
    if(n.food<12){ n.people-=5; }
    // 忠诚漂移 + 谋反隐患
    s.ministers.forEach(m=>{
      const p=PERSONALITIES[m.personality];
      m.loyalty=R.clamp(m.loyalty + p.loyDrift + (m.reward>0?3:0) + (n.treasury<15?-2:0));
      m.ambition=R.clamp(m.ambition + (p.amb>0?1:0)*0 + (m.loyalty<40?1:0));
      if(m.reward>0)m.reward--;
      if(!s.rebel && m.loyalty<28 && m.ambition>60 && R.chance(35)) s.rebel={id:m.id,name:m.name};
    });
    // 后宫
    s.consorts.forEach(c=>{
      c.favor=R.clamp(c.favor-1);
      if(c.pregnant!=null){ c.pregnant++; if(c.pregnant>=10){ this.birth(c); c.pregnant=null; } }
    });
    // 帝王健康/年龄
    e.health-=R.i(0,1)+(e.age>=45?1:0)+(e.age>=60?1:0);
    // 月历推进
    n.month++;
    if(n.month>12){
      n.month=1; n.year++; e.age++; s.peakAge=Math.max(s.peakAge,e.age);
      s.children.forEach(c=>c.age++);
      s.ministers.forEach(m=>{ m.age++; if(m.age>72 && R.chance(20)){ this.retire(m); } });
      // 丹毒
      if(s.flags.pills>=5 && R.chance(s.flags.pills*4)){ this.emperorDies("poison"); return; }
      // 天年
      if(e.age>=50 && R.chance((e.age-48)*4)){ this.emperorDies("age"); return; }
    }
    this.clampNation();
  },

  retire(m){ m.post=null; const i=this.s.ministers.indexOf(m); if(i>=0)this.s.ministers.splice(i,1); this.logMsg(`老臣 ${m.name} 告老还乡。`); },

  birth(c){
    const s=this.s; const boy=R.chance(52);
    const name=(boy?R.pick(GIVEN_M):R.pick(GIVEN_F));
    const child={name, gender:boy?"男":"女", age:0, mother:c.name, isHeir:false, married:false,
      health:R.i(50,80), int:R.i(30,70), charm:R.i(30,70), martial:R.i(30,70), politics:R.i(30,70)};
    s.children.push(child);
    s.nation.prestige=R.clamp(s.nation.prestige+2);
    this.toast(`${c.name} 诞下皇${boy?"子":"女"} ${name}！`); this.logMsg(`${c.name} 诞下皇${boy?"子":"女"}${name}。`);
  },

  /* ---------- 帝王驾崩 / 传承 ---------- */
  emperorDies(cause){
    const s=this.s, e=s.emperor;
    // 千古一帝（自然死且功业卓著）
    if((cause==="age") && e.age>=55 && this.avgNation()>=62 && s.nation.prestige>=70){
      this.gameOver("sage"); return;
    }
    // 寻找继承人：太子优先，否则最年长皇子
    let heir=s.children.find(c=>c.isHeir && c.gender==="男");
    if(!heir) heir=s.children.filter(c=>c.gender==="男").sort((a,b)=>b.age-a.age)[0];
    if(!heir){ this.gameOver("no_heir"); return; }
    // 传位
    const causeTxt={age:"寿终正寝",poison:"丹毒发作",battle:"崩于阵前",health:"积劳成疾"}[cause]||"驾崩";
    s._succession={old:e.name, oldAge:e.age, cause:causeTxt, heir:heir.name, gen:s.gen+1};
    s.gen++;
    s.emperor={name:heir.name, age:Math.max(15,heir.age), portrait:this.pickFace(this.manifest),
      health:70, int:heir.int, charm:heir.charm, martial:heir.martial, politics:heir.politics, exp:0};
    // 新君登基：后宫一清，旧皇子退场，老臣部分留任
    s.consorts=buildConsorts(s.pool.consorts.length?s.pool.consorts:this.manifest.consorts,3);
    s.pool.consorts=s.pool.consorts.slice(3);
    s.children=[];
    this.logMsg(`${e.name}${causeTxt}，享年${e.age}。太子${heir.name}即位，是为第${s.gen}代。`);
    SFX.gong();
  },

  /* ---------- 结局判定 ---------- */
  checkEndings(){
    const s=this.s, n=s.nation;
    if(s.over) return true;
    if(n.treasury<=-15){ this.gameOver("bankrupt"); return true; }
    if(n.people<=0){ this.gameOver("min_revolt"); return true; }
    if(n.military<=0){ this.gameOver("invaded"); return true; }
    if(s.emperor.health<=0){ this.emperorDies("health"); return this.s.over; }
    return false;
  },

  gameOver(id){
    const s=this.s; if(s.over) return; s.over=true;
    const e=ENDINGS[id]||ENDINGS.no_heir;
    SFX.end();
    this.saveBest();
    UI.showEnd(e, {years:s.nation.year, gen:s.gen, score:this.score()});
    localStorage.removeItem(LS_SAVE);
  },

  /* ---------- 计算 ---------- */
  avgNation(){ const n=this.s.nation; return (n.treasury+n.military+n.people+n.food+n.land+n.prestige)/6; },
  score(){ const s=this.s; return Math.round(s.nation.year*60 + this.avgNation()*8 + s.gen*120 + s.nation.prestige*4); },

  applyEffects(fx){
    const s=this.s, NK=Object.keys(NATION_STATS), EK=Object.keys(EMP_ATTRS);
    for(const k in fx){
      if(NK.includes(k)) s.nation[k]+=fx[k];
      else if(EK.includes(k)) s.emperor[k]+=fx[k];
    }
    this.clampAll();
  },
  clampNation(){ const n=this.s.nation; for(const k in NATION_STATS) if(k!=="treasury") n[k]=R.clamp(n[k]); if(n.treasury>100)n.treasury=100; },
  clampAll(){ this.clampNation(); const e=this.s.emperor; for(const k in EMP_ATTRS) e[k]=R.clamp(e[k]); },

  logMsg(t){ const s=this.s; s.log.unshift(`${s.nation.year}年${s.nation.month}月 · ${t}`); if(s.log.length>60)s.log.pop(); },

  renderTurn(){ UI.renderHUD(); UI.renderEmperor(); if(this.s.pendingEvent)UI.showEvent(this.s.pendingEvent); else UI.showMonth(); UI.renderActions(); this.save(); },

  /* ---------- 存档 ---------- */
  save(){ try{ localStorage.setItem(LS_SAVE, JSON.stringify(this.s)); }catch(e){} },
  load(){ try{ const d=JSON.parse(localStorage.getItem(LS_SAVE)); if(d&&!d.over){ this.s=d; UI.toGame(); this.renderTurn(); return true; } }catch(e){} return false; },
  saveBest(){ const s=this.s; const best=JSON.parse(localStorage.getItem(LS_BEST)||"null");
    const cur={dynasty:s.dynasty,years:s.nation.year,gen:s.gen,score:this.score()};
    if(!best||cur.score>best.score) localStorage.setItem(LS_BEST, JSON.stringify(cur)); }
};

const LS_SAVE="zjjs_save", LS_BEST="zjjs_best";
return api;
})();
