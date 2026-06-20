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

/* 边际递减成长：属性越高，单次涨得越少（base 为低位时的近似涨幅）。
   解决「按天后行动频率剧增 → 五维瞬间顶满」的平衡问题。 */
const grow = (cur, base) => R.clamp(cur + Math.round(base * (100 - cur) / 100));

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
    // 固定班底：开局仅少数核心重臣在朝（澹台衡/欧阳彻·赫连勃/独孤信/长孙晟），
    // 其余固定人物靠招贤/事件/条件从名册逐个登场（不再随机生成路人）。
    const roster = startingCast();
    this.s = {
      dynasty:dynasty||"大宁", reign:reign||"永熙", gen:1,
      emperor:{name:name||"萧承乾", age:R.i(16,20), portrait:this.pickFace(M),
        health:70, int:R.i(40,65), charm:R.i(40,65),
        martial:R.i(35,60), politics:R.i(40,65), exp:0},
      nation:{year:1, month:1, day:1, phase:0,
        treasury:30, military:35, people:45, food:38, land:40, prestige:25},  // 寒微起步：物资仅够开局，靠经营壮大
      ministers:roster,
      consorts:[],            // 后宫从 0 开始，逐位解锁攻略入宫
      romance:{},             // 攻略进度 {[tplId]:{aff,seen,done}}
      children:[],
      pool:{ // 剩余立绘，供招贤/选秀补充
        ministers:R.shuffle(M.ministers).slice(8,80),
        consorts:R.shuffle(M.consorts).slice(3),
        generals:R.shuffle(M.generals).slice(4)
      },
      blacklist:[],   // 已罢免/处死者的立绘文件，永不再入招贤池（旧机制兼容）
      exiled:[],      // 已罢免/处死的固定人物 castId，名册不再揭示
      recruitPoints:12, shards:0, gachaPity:0,   // 招贤点 / 升级碎片 / 保底计数（开局仅够一抽）
      talentPts:1, talents:[],                    // 帝王天赋点 / 已点天赋
      weapons:[],   // 已得武器 id 列表（武库）
      weaponLv:{},  // 武器强化等级 {[wid]:lv}
      flags:{}, log:[], pendingEvent:null, actedThisTurn:false,
      over:false, rebel:null, _succession:null, peakAge:0
    };
    // 官职即身份：固定班底登朝自动就位（makeFromCast 已置 post），无需玩家指派
    MapSys.initState(this.s);
    if(typeof SpySys!=="undefined") SpySys.init(this.s);   // 密谍司 + 百官隐藏暗面
    if(typeof QuestSys!=="undefined") QuestSys.initState(this.s);
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
    if(s._spyEvent){ s.pendingEvent=s._spyEvent; s._spyEvent=null; }  // 密谍司养熟爆变优先
    else s.pendingEvent=this.rollEvent();
    this.renderTurn();
  },

  rollEvent(){
    const s=this.s;
    // 谋反优先
    if(s.rebel){
      s._rebelName=s.rebel.name;
      return EVENTS.find(e=>e.id==="ev_rebel_min");
    }
    if(!R.chance(22)) return null;                 // 多数时段无事（按时段触发，频率调低）
    const ph=PHASES[s.nation.phase||0].key;
    const cands=EVENTS.filter(e=>(e.weight||1)>0 && (!e.cond||e.cond(s)) && !(e.once&&s.flags["done_"+e.id]) && (!e.phase||e.phase===ph));
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
    this._bigChain = !!ev.big;          // 大事件标记，沿连锁传递到后续 showCard 卡片
    if(opt.effects) this.applyEffects(opt.effects);
    // 关系涟漪（B4）：每个选择都牵动百官忠诚与后宫情绪。
    // 显式 effects.loyalty/favor 由 applyEffects 处理；此处再叠加一层「由国计民生自动推导」的小幅涟漪。
    const fx=opt.effects||{};
    const loyR=R.clamp(Math.round(((fx.people||0)+(fx.prestige||0)+(fx.treasury||0)*0.4)/10),-2,2); // 善政则百官安、苛政离心
    const favR=R.clamp(Math.round(((fx.charm||0)*2+(fx.health||0))/3),-2,2);                          // 修养/龙体影响后宫情绪
    if(loyR) this.shiftAllLoyalty(loyR);
    if(favR) this.allConsortFavor(favR);
    if(ev.once) s.flags["done_"+ev.id]=true;
    if(ev.id && typeof QuestSys!=="undefined") QuestSys.see(s,"events",ev.id);
    s.pendingEvent=null;
    this.logMsg(`【${typeof ev.title==="function"?ev.title(s):ev.title}】${opt.text}`);
    if(opt.do) opt.do(this);          // 可能再次 showCard（如战报）
    if(loyR||favR){ const parts=[]; if(loyR)parts.push(`百官忠诚 ${loyR>0?"+":""}${loyR}`); if(favR)parts.push(`后宫情绪 ${favR>0?"+":""}${favR}`); this.toast(parts.join("、")); }
    this.afterEvent();
  },

  afterEvent(){
    if(this.s.over) return;
    if(this.checkEndings()) return;
    if(this.s.pendingEvent) UI.showEvent(this.s.pendingEvent);
    else this.renderTurn();
  },

  showCard(card){ if(this._bigChain && card.big===undefined) card.big=true; this.s.pendingEvent=card; },

  /* ---------- 行动（每个时段一次）----------
     按天后行动频率剧增，故五维成长改为「边际递减」：属性越高、单次涨得越少，
     自然趋近上限而不会一两月顶到 100。grow(cur,base) 见文件顶部。 */
  ACTIONS:{
    govern:{name:"勤政",icon:ICONS.govern,hint:"批阅奏章，理政安民（晨/午）",phases:["morn","noon"],run(s){
      const g=s.emperor.politics; let dt=Math.max(1,Math.round(g/50));
      if(Game.hasTalent("t_diligence")) dt=Math.round(dt*1.5);   // 天赋·宵衣旰食
      s.nation.treasury+=dt; if(R.chance(45))s.nation.people+=1;
      s.recruitPoints=(s.recruitPoints||0)+1;   // 勤政纳贤：积累招贤点
      s.emperor.health-=1; s.emperor.exp+=1;
      return `勤勉理政，国库 +${dt}，招贤点 +1。`;}},
    read:{name:"读书",icon:ICONS.read,hint:"研读经史，增长智略（晨）",phases:["morn"],run(s){
      const b=s.emperor.int; s.emperor.int=grow(b,Game.hasTalent("t_scholar")?15:9); if(R.chance(40))s.emperor.politics=grow(s.emperor.politics,5);
      s.emperor.health-=1;
      return `潜心向学，智力 +${s.emperor.int-b}。`;}},
    train:{name:"习武",icon:ICONS.train,hint:"演练武艺，强身健体（晨/午）",phases:["morn","noon"],run(s){
      const b=s.emperor.martial; s.emperor.martial=grow(b,Game.hasTalent("t_valor")?15:9); if(R.chance(30))s.emperor.health+=1;
      return `勤练弓马，武力 +${s.emperor.martial-b}。`;}},
    audience:{name:"召见群臣",icon:ICONS.audience,hint:"召见大臣，笼络忠心（午）",phases:["noon"],select:"court"},
    cultivate:{name:"养性",icon:ICONS.cultivate,hint:"陶冶情操，增益魅力（夜）",phases:["eve"],run(s){
      const b=s.emperor.charm; s.emperor.charm=grow(b,9); if(R.chance(30))s.emperor.health+=1;
      return `怡情养性，魅力 +${s.emperor.charm-b}。`;}},
    visit:{name:"临幸后宫",icon:ICONS.visit,hint:"宠幸嫔妃，开枝散叶（仅夜）",phases:["eve"],select:"harem"},
    rest:{name:"休养",icon:ICONS.rest,hint:"颐养龙体，恢复健康（夜）",phases:["eve"],run(s){
      s.emperor.health+= Game.hasTalent("t_longevity")?R.i(5,8):R.i(3,5);
      return "静心休养，龙体渐安。";}},
    inspect:{name:"微服私访",icon:ICONS.visit,hint:"微服出宫，奇遇连连（午/夜）",phases:["noon","eve"],run(s){
      Game.startInspection(); return "";}}
  },

  doAction(type){
    const s=this.s; if(s.actedThisTurn||s.pendingEvent) return;
    const a=this.ACTIONS[type];
    if(a.phases && !a.phases.includes(PHASES[s.nation.phase||0].key)){ this.toast(`此事宜在${a.phases.map(k=>PHASES.find(p=>p.key===k).name).join("/")}行`); return; }
    if(a.select){ UI.openPanel(a.select,{selectAction:type}); return; }
    const msg=a.run(s); s.actedThisTurn=true;
    this.tally(type);
    this.clampAll(); SFX.good(); this.toast(msg);
    this.renderTurn();
  },

  visitConsort(id){
    const s=this.s; const c=s.consorts.find(x=>x.id===id); if(!c)return;
    if(s.actedThisTurn) { this.toast("此时段已行一事"); return; }
    c.favor=R.clamp(c.favor+R.i(6,12)); c.bond=R.clamp(c.bond+R.i(3,7));
    s.actedThisTurn=true; this.tally("visit");
    // 受孕：与健康、宠爱相关
    if(c.pregnant==null && R.chance(28+s.emperor.health/8+(this.hasTalent("t_fertility")?18:0))){ c.pregnant=0; this.toast(`临幸 ${c.name}，${c.name}承欢…（似有喜兆）`);}
    else this.toast(`临幸 ${c.name}，情分渐深。`);
    SFX.good(); UI.closePanel(); this.renderTurn();
  },

  audienceMinister(id){
    const s=this.s; const m=s.ministers.find(x=>x.id===id); if(!m)return;
    if(s.actedThisTurn){ this.toast("此时段已行一事"); return; }
    m.loyalty=R.clamp(m.loyalty+R.i(5,10)); m.ambition=R.clamp(m.ambition-R.i(2,5));
    this.gainExp(m,6);
    s.actedThisTurn=true; SFX.good();
    this.toast(`召见 ${m.name}，君臣相得，忠诚提升、历练渐增。`); UI.closePanel(); this.renderTurn();
  },

  /* ---------- 任命 / 后宫管理 ---------- */
  appoint(id,post){
    const s=this.s, m=s.ministers.find(x=>x.id===id); if(!m)return;
    if(post){
      const P=POSITIONS.find(p=>p.id===post); if(!P) return;
      // 文职只授文官、武职只授武将——官职不可乱设
      const fit = P.use==="mil" ? m.kind==="martial" : m.kind==="civil";
      if(!fit){ this.toast(P.use==="mil"?"武职须授武将":"文职须授文官"); return; }
      const old=s.ministers.find(x=>x.post===post); if(old)old.post=null;   // 该职单人·顶替旧任
      m.post=post;
    }
    else m.post=null;
    SFX.pick(); UI.renderPanel("court");
  },
  rewardMinister(id){
    const s=this.s, m=s.ministers.find(x=>x.id===id); if(!m)return;
    if(s.nation.treasury<8){ this.toast("国库不足，无以行赏"); return; }
    s.nation.treasury-=8; m.loyalty=R.clamp(m.loyalty+R.i(8,15)); m.reward=3;
    const aff=this.relRipple(m,"reward");
    SFX.good(); this.toast(`赏赐 ${m.name}，其感恩戴德。`); this._rippleToast(m,"reward",aff);
    UI.renderPanel("court"); this.renderTurn();
  },
  /* 问罪：依密谍司查得之罪证 + 公开劣迹，列出可成立的罪名（无罪证不得擅诛） */
  chargesAgainst(m){
    const s=this.s, ch=[], sec=m.secret;
    if(s.rebel && s.rebel.id===m.id) ch.push({key:"rebel",name:"谋反作乱",sev:3});
    if(Math.round(m.loyalty) < 30) ch.push({key:"disloy",name:"离心异志·忠诚低下",sev:1});
    const known = (typeof SpySys!=="undefined") && SpySys.established(s) &&
      ( (s.spy.watch||[]).includes(m.castId||m.id) || SpySys.effLevel(s)>=4 );
    if(known && sec){
      if(sec.cabal.progress>=30)  ch.push({key:"cabal",  name:"结党营私",sev:2});
      if(sec.treason>=25)         ch.push({key:"treason",name:"私通外敌",sev:3});
      if(sec.graft>=30)           ch.push({key:"graft",  name:"贪墨国帑",sev:2});
      if(sec.scheme.progress>=30) ch.push({key:"scheme", name:"构陷同僚",sev:1});
    }
    return ch;
  },
  // 处死：须有罪证（justified=罪名 key）。无罪证则妄诛忠良，遭百官离心、威望大损。
  executeMinister(id, charge){
    const s=this.s, i=s.ministers.findIndex(x=>x.id===id); if(i<0)return;
    const m=s.ministers[i]; const justified=!!charge;
    if(!justified && this.chargesAgainst(m).length===0){
      // 兜底防护：无罪证不可径直处死（UI 正常不会走到）
    }
    const post=m.post; m.post=null; s.ministers.splice(i,1);
    if(m.portrait && !s.blacklist.includes(m.portrait)) s.blacklist.push(m.portrait);
    if(m.castId && !(s.exiled||[]).includes(m.castId)){ (s.exiled=s.exiled||[]).push(m.castId); }
    s.nation.people=R.clamp(s.nation.people-(justified?1:5));
    if(justified){ this.shiftAllLoyalty(-1); s.nation.prestige=R.clamp(s.nation.prestige+2);  // 明正典刑：忠良反安
      s.ministers.forEach(x=>{ if(x.loyalty>=65) x.loyalty=R.clamp(x.loyalty+1); }); }
    else { this.shiftAllLoyalty(-7); s.nation.prestige=R.clamp(s.nation.prestige-6); }       // 妄诛忠良：百官寒心
    const aff=this.relRipple(m,"punish");
    this.checkRomanceBreak(post);
    SFX.bad();
    this.toast(justified ? `${m.name} 罪${charge}，明正典刑，朝纲肃然。` : `${m.name} 无辜伏诛，百官震恐离心！`);
    this.logMsg(justified?`处死 ${m.name}（${charge}），正法度。`:`妄杀 ${m.name}，朝野侧目。`);
    this._rippleToast(m,"punish",aff);
    UI.closeModal(); UI.renderPanel("court"); this.renderTurn();
  },
  // 罢免：有罪证则依律黜免（轻反噬）；无罪证则无故罢黜，百官寒心（容许但有代价）
  dismissMinister(id, charge){
    const s=this.s, i=s.ministers.findIndex(x=>x.id===id); if(i<0)return;
    const m=s.ministers[i]; const post=m.post; m.post=null; s.ministers.splice(i,1);
    const justified=!!charge;
    if(m.portrait && !s.blacklist.includes(m.portrait)) s.blacklist.push(m.portrait);
    if(m.castId && !(s.exiled||[]).includes(m.castId)){ (s.exiled=s.exiled||[]).push(m.castId); }
    if(justified){ this.shiftAllLoyalty(-1); }
    else { this.shiftAllLoyalty(-4); s.nation.prestige=R.clamp(s.nation.prestige-3); }        // 无故罢黜
    const aff=this.relRipple(m,"punish");
    this.checkRomanceBreak(post);
    SFX.pick();
    this.toast(justified?`${m.name} 罪${charge}，依律罢黜。`:`${m.name} 无故罢黜，百官寒心。`); this._rippleToast(m,"punish",aff);
    this.logMsg(justified?`罢免 ${m.name}（${charge}）。`:`无故罢免 ${m.name}，朝议哗然。`);
    UI.renderPanel("court"); this.renderTurn();
  },
  /* 门第联动：失去某官位 → 依赖该官位的官家女攻略中断、心动清零 */
  checkRomanceBreak(post){
    if(!post) return; const s=this.s;
    CONSORTS.forEach(t=>{
      if(t.requirePost===post && !s.ministers.some(m=>m.post===post)){
        const r=s.romance[t.id];
        if(r && !r.done && r.aff>0){ r.aff=0; r.seen=[]; this.toast(`${t.name} 门第骤衰，芳心已冷……`); }
      }
    });
  },
  /* 招贤抽卡：消耗「招贤点」单池抽卡 + 高/中/低档 + 保底 + 重复转碎片。
     排除黑名单（罢免/处死者永不再现）；抽中已在朝者→化碎片（不出现两个同人）。*/
  /* 招贤改造：从「固定名册」揭示一位尚未登场的人物（不再随机生成路人）。
     rollTier 决定本抽偏向的档位（保底照旧），优先取该档候选；名册招满 → 化碎片。
     已流放(exiled)者名册不再揭示——杜绝「罢免-重抽更强随机替代」。 */
  recruitDraw(){
    const s=this.s;
    const cost = s.recruitVoucher ? Math.ceil(GACHA.cost/2) : GACHA.cost;   // 低价券：半价一次
    if(s.recruitPoints < cost){ this.toast(`招贤点不足（需 ${cost}）`); UI.renderPanel("court"); return null; }
    const pool = recruitablePool(s);
    if(!pool.length){   // 名册已尽：举朝贤才悉数在位（或前置未满），化招贤之资为碎片
      s.recruitPoints-=cost; if(s.recruitVoucher) s.recruitVoucher=false;
      s.shards=(s.shards||0)+3; SFX.pick();
      this.toast(`一时再无贤才可征，招贤所获化为碎片 +3（共 ${s.shards}）`);
      UI.renderPanel("court"); this.renderTurn();
      return {dupe:true,shard:3};
    }
    s.recruitPoints-=cost; if(s.recruitVoucher) s.recruitVoucher=false;
    const want=rollTier(s.gachaPity||0);
    s.gachaPity = want==="high" ? 0 : (s.gachaPity||0)+1;
    let cands = pool.filter(c=>c.tier===want);
    if(!cands.length) cands = pool;                 // 该档名册已空 → 全池
    const c = R.pick(cands);
    const tier = GACHA.tiers[c.tier] || GACHA.tiers.mid;   // 按其真实档位显示
    if(want==="high" && c.tier!=="high") s.gachaPity=GACHA.pity;  // 保底未真出大才则不清零
    const m = makeFromCast(c);
    s.ministers.push(m); SFX.gong(); this.tally("recruit");
    if(typeof SpySys!=="undefined") SpySys.ensure(s);   // 新臣即生隐藏暗面
    this.logMsg(`招贤纳【${tier.name}${tier.star}】${m.title}·${m.name}（文${m.civ}·武${m.mil}）。`);
    UI.showRecruit(m);
    UI.renderPanel("court"); this.renderTurn();
    return m;
  },
  earnPoints(n,reason){ const s=this.s; if(n<=0)return; s.recruitPoints=(s.recruitPoints||0)+n; if(reason)this.logMsg(`${reason}，招贤点 +${n}。`); },

  /* ---------- 密谍司：设立 / 升级 / 派谍 / 处置 / 夜报 / 养熟爆变 ---------- */
  spyEstablish(){ const s=this.s; if(s.spy&&s.spy.est) return;
    const free=s.ministers.some(m=>m.post==="spymaster"), cost=free?0:15;
    if(s.nation.treasury<cost){ this.toast(`国库不足（需 ${cost}）`); return; }
    s.nation.treasury-=cost; if(!s.spy)SpySys.init(s); s.spy.est=true;
    SFX.gong(); this.toast("密谍司已设，耳目遍布朝野。"); this.logMsg("设立密谍司，密察百官私行。");
    UI.openModal(SpySys.panelHTML(s)); this.renderTurn();
  },
  spyUpgrade(){ const s=this.s; if(!s.spy||!s.spy.est) return;
    const lv=s.spy.level||1; if(lv>=SpySys.MAXLV){ this.toast("密谍司已臻极境"); return; }
    const cost=SpySys.upgradeCost(lv);
    if(s.nation.treasury<cost){ this.toast(`国库不足（需 ${cost}）`); return; }
    s.nation.treasury-=cost; s.spy.level=lv+1; SFX.good();
    this.toast(`密谍司扩充至 Lv${lv+1}，眼线更广、所报更精。`);
    UI.openModal(SpySys.panelHTML(s)); this.renderTurn();
  },
  spyWatch(id){ const s=this.s; const r=SpySys.toggleWatch(s,id);
    if(r==="full") this.toast("眼线已尽，先撤一处或扩充密谍司"); else SFX.pick();
    UI.openModal(SpySys.panelHTML(s)); },
  _spyFind(id){ return this.s.ministers.find(m=>(m.castId||m.id)===id); },
  spyAudit(id){ const s=this.s, m=this._spyFind(id); if(!m||!m.secret) return;
    const got=Math.round(m.secret.graft*0.9); s.nation.treasury=R.clamp(s.nation.treasury+got);
    m.secret.graft=0; m.loyalty=R.clamp(m.loyalty-6); m.secret.trueLoyalty=R.clamp(m.secret.trueLoyalty-4);
    SFX.good(); this.toast(`查抄 ${m.name} 之贪墨，追回国库 +${got}（其怀怨）`);
    this.logMsg(`密谍司查抄 ${m.name} 贪墨，没入国库 +${got}。`);
    UI.openModal(SpySys.panelHTML(s)); this.renderTurn();
  },
  spyWarn(id){ const s=this.s, m=this._spyFind(id); if(!m||!m.secret) return;
    m.secret.cabal.progress=Math.max(0,m.secret.cabal.progress-35);
    m.secret.scheme.progress=Math.max(0,m.secret.scheme.progress-35);
    m.secret.trueLoyalty=R.clamp(m.secret.trueLoyalty-3); m.ambition=R.clamp(m.ambition-4);
    SFX.pick(); this.toast(`敲打 ${m.name}，其结党构陷暂息（然记恨于心）`);
    this.logMsg(`密谍司敲打 ${m.name}，挫其私谋。`);
    UI.openModal(SpySys.panelHTML(s)); this.renderTurn();
  },
  spyArrest(id){ const s=this.s, i=s.ministers.findIndex(m=>(m.castId||m.id)===id); if(i<0) return;
    const m=s.ministers[i], post=m.post; m.post=null; s.ministers.splice(i,1);
    if(m.portrait&&!s.blacklist.includes(m.portrait)) s.blacklist.push(m.portrait);
    if(m.castId&&!(s.exiled||[]).includes(m.castId)) (s.exiled=s.exiled||[]).push(m.castId);
    this.shiftAllLoyalty(-2); const aff=this.relRipple(m,"punish"); this.checkRomanceBreak(post);
    SFX.bad(); this.toast(`先发制人，${m.name} 已下狱拿问，逆谋消弭。`); this._rippleToast(m,"punish",aff);
    this.logMsg(`密谍司拿问 ${m.name}，其党羽星散。`);
    UI.closeModal(); UI.renderPanel("court"); this.renderTurn();
  },
  /* 暗线养熟 → 爆大事件（每日检） */
  spyMaturity(){ const s=this.s;
    for(const m of s.ministers){ const sec=m.secret; if(!sec) continue;
      if(sec.cabal.progress>=100 && !s.rebel){           // 结党养成 → 谋反
        s.rebel={id:m.id, name:m.name}; sec.cabal.progress=70;
        this.logMsg(`【惊变】${m.name} 结党已成，反形毕露！`); return;
      }
      if(sec.treason>=100 && !s._spyEvent){               // 通敌养成 → 里通外敌偷袭
        sec.treason=40; const loss=R.i(10,20); const tid=m.id;
        s.nation.military=R.clamp(s.nation.military-loss); s.nation.treasury=R.clamp(s.nation.treasury-8);
        s._spyEvent={title:"通敌之祸",role:"general",big:true,
          text:`${m.title}·${m.name} 暗通番邦，引寇内犯！边关告急，兵力 -${loss}。`,
          choices:[{text:"彻查严办",do:G=>{ const j=G.s.ministers.findIndex(x=>x.id===tid);
            if(j>=0){ const mm=G.s.ministers[j]; mm.post=null; G.s.ministers.splice(j,1);
              if(mm.castId)(G.s.exiled=G.s.exiled||[]).push(mm.castId); } G.shiftAllLoyalty(-3); }},
            {text:"暂且隐忍",do:G=>{ G.s.nation.prestige=R.clamp(G.s.nation.prestige-6); }}]};
        return;
      }
    }
  },
  /* ---------- 养成：武将经验/升级/突破 + 帝王天赋 ---------- */
  hasTalent(id){ return (this.s.talents||[]).includes(id); },
  gainExp(m,n){
    if(!m) return; m.level=m.level||1; m.exp=(m.exp||0)+n;
    while(m.exp >= m.level*10){ m.exp-=m.level*10; m.level++;
      const k=m.kind==="martial"?"mil":"civ"; m[k]=grow(m[k],5);
    }
  },
  breakthrough(id){
    const s=this.s, m=s.ministers.find(x=>x.id===id); if(!m) return;
    const order=["low","mid","high"], ti=order.indexOf(m.tier||"low");
    if(ti>=2){ this.toast(`${m.name} 已臻化境，无可再破`); return; }
    if((m.level||1)<5){ this.toast(`需 Lv5 方可突破（今 Lv${m.level||1}）`); return; }
    const cost=8; if((s.shards||0)<cost){ this.toast(`碎片不足（需 ${cost}）`); return; }
    s.shards-=cost; m.tier=order[ti+1]; m.level=1; m.exp=0;
    const k=m.kind==="martial"?"mil":"civ"; m[k]=R.clamp(m[k]+12);
    SFX.gong(); this.toast(`${m.name} 突破至 ${GACHA.tiers[m.tier].star}！${k==="mil"?"武略":"文才"} +12`);
    this.logMsg(`${m.name} 经突破晋为${GACHA.tiers[m.tier].name}。`);
    UI.renderPanel("court");
  },
  openTalents(){ UI.openModal(this.talentHTML()); },
  talentHTML(){
    const s=this.s;
    let h=`<div class="talent-tree"><h2>帝王天赋 ✦ <span class="tp">天赋点 ${s.talentPts||0}</span></h2>`;
    TALENT_BRANCHES.forEach(br=>{
      h+=`<div class="tl-branch"><div class="tl-bh">${br}</div>`;
      TALENTS.filter(t=>t.branch===br).forEach(t=>{
        const on=this.hasTalent(t.id);
        const lock=t.req&&!this.hasTalent(t.req);
        const can=!on&&!lock&&(s.talentPts||0)>=t.cost;
        h+=`<div class="tl-node ${on?"on":lock?"lock":""}">
          <div class="tl-n"><b>${t.name}</b>${on?`<span class="tl-ok">✓已悟</span>`:`<button class="chip" ${can?"":"disabled"} onclick="Game.unlockTalent('${t.id}')">参悟 ✦${t.cost}</button>`}</div>
          <div class="tl-d">${t.desc}${lock?`<span class="tl-req">（需先悟「${talentById(t.req).name}」）</span>`:""}</div></div>`;
      });
      h+=`</div>`;
    });
    h+=`<p class="panel-tip">※ 每年得 1 天赋点；亦可经达成大业获取。天赋永久生效。</p></div>`;
    return h;
  },
  unlockTalent(id){
    const s=this.s, t=talentById(id); if(!t||this.hasTalent(id)) return;
    if(t.req&&!this.hasTalent(t.req)){ this.toast("尚需先参悟前置天赋"); return; }
    if((s.talentPts||0)<t.cost){ this.toast("天赋点不足"); return; }
    s.talentPts-=t.cost; (s.talents=s.talents||[]).push(id);
    SFX.good(); this.toast(`参悟天赋·${t.name}！`); this.logMsg(`帝王参悟天赋「${t.name}」。`);
    UI.openModal(this.talentHTML()); UI.renderEmperor();
  },

  /* ---------- 大业系统（任务/成就/图鉴/称号）转接 ---------- */
  tally(key,n){ if(typeof QuestSys!=="undefined"&&this.s) QuestSys.tally(this.s,key,n); },
  questTab(t){ this.s._questTab=t; UI.renderPanel("quest"); },
  equipTitle(t){ if(typeof QuestSys!=="undefined") QuestSys.setTitle(t); UI.renderPanel("quest"); UI.renderHUD(); },
  /* 武库抽卡：消耗招贤点抽一件武器，已有则化碎片 */
  weaponDraw(){
    const s=this.s; const cost=GACHA.cost;
    if((s.recruitPoints||0)<cost){ this.toast(`招贤点不足（需 ${cost}）`); UI.renderPanel("court"); return null; }
    s.recruitPoints-=cost;
    const w=rollWeapon(); const tg=GACHA.tiers[w.tier];
    if(!s.weapons) s.weapons=[];
    if(s.weapons.includes(w.id)){   // 重复 → 碎片
      s.shards=(s.shards||0)+tg.shard; SFX.pick();
      this.toast(`【${tg.name}${tg.star}】${w.name} 已在武库，化碎片 +${tg.shard}（共 ${s.shards}）`);
      UI.renderPanel("court"); return {dupe:true,wid:w.id};
    }
    s.weapons.push(w.id); SFX.gong();
    if(typeof QuestSys!=="undefined") QuestSys.see(s,"weapons",w.id);
    this.logMsg(`武库铸成【${tg.name}${tg.star}】${w.name}（${w.stat==="mil"?"武略":"文才"} +${w.bonus}）。`);
    this.toast(`得【${tg.name}${tg.star}】${w.name}！可佩于将相。`);
    UI.renderPanel("court"); return w;
  },
  /* 兵器有效加成 = 基础 bonus + 强化等级×步长（强化存于 s.weaponLv） */
  wpBonus(wid){ const w=weaponById(wid); if(!w) return 0; const lv=(this.s.weaponLv&&this.s.weaponLv[wid])||0; return w.bonus + lv*FORGE_STEP; },
  /* 装备武器（wid="" 卸下）。武器同时只能在一人身上；换装自动转移、增减对应属性（含强化） */
  equipWeapon(mid,wid){
    const s=this.s, m=s.ministers.find(x=>x.id===mid); if(!m) return;
    // 先卸下 m 当前武器
    if(m.weapon){ const om=weaponById(m.weapon); if(om) m[om.stat]=R.clamp(m[om.stat]-this.wpBonus(m.weapon)); m.weapon=null; }
    if(!wid){ this.toast(`${m.name} 已卸兵刃`); UI.renderPanel("court"); return; }
    const w=weaponById(wid); if(!w) return;
    // 该武器若在他人身上，先夺下
    const holder=s.ministers.find(x=>x.weapon===wid);
    if(holder){ const ow=weaponById(holder.weapon); if(ow) holder[ow.stat]=R.clamp(holder[ow.stat]-this.wpBonus(holder.weapon)); holder.weapon=null; }
    const b=this.wpBonus(wid);
    m.weapon=wid; m[w.stat]=R.clamp(m[w.stat]+b);
    SFX.good(); this.toast(`${m.name} 佩 ${w.name}，${w.stat==="mil"?"武略":"文才"} +${b}`);
    UI.renderPanel("court");
  },
  /* 强化兵器：耗碎片提升加成等级。若正佩于某人身上，自动先减旧加成、升级、再补新加成 */
  forgeWeapon(wid){
    const s=this.s, w=weaponById(wid); if(!w) return;
    if(!s.weaponLv) s.weaponLv={};
    const lv=s.weaponLv[wid]||0;
    if(lv>=FORGE_MAX){ this.toast(`${w.name} 已臻极境（+${lv*FORGE_STEP}）`); return; }
    const cost=forgeCost(lv);
    if((s.shards||0)<cost){ this.toast(`碎片不足（需 ${cost}）`); return; }
    const holder=s.ministers.find(x=>x.weapon===wid);
    if(holder) holder[w.stat]=R.clamp(holder[w.stat]-this.wpBonus(wid));   // 先减旧加成
    s.shards-=cost; s.weaponLv[wid]=lv+1;
    if(holder) holder[w.stat]=R.clamp(holder[w.stat]+this.wpBonus(wid));   // 补新加成
    SFX.gong(); this.toast(`${w.name} 强化至 +${(lv+1)*FORGE_STEP}！${holder?`（${holder.name} ${w.stat==="mil"?"武略":"文才"}已增）`:""}`);
    this.logMsg(`武库强化 ${w.name} 至 +${(lv+1)*FORGE_STEP}。`);
    UI.renderPanel("court");
  },
  /* 阵容羁绊月结：满足组合即给被动加成（神兵在握含兵器谱套装效果）。返回生效羁绊 id 数组 */
  applyBonds(){
    const s=this.s, n=s.nation; const active=[];
    BONDS.forEach(b=>{ if(!b.cond(s)) return; active.push(b.id);
      switch(b.id){
        case "b_wenwu": n.treasury+=2; n.military+=2; break;
        case "b_zhong": n.people+=1; s.recruitPoints=(s.recruitPoints||0)+1; break;
        case "b_elite": n.prestige+=2; break;
        case "b_loyal": s.ministers.forEach(m=>m.ambition=R.clamp(m.ambition-2)); s.recruitPoints=(s.recruitPoints||0)+1; break;
        case "b_arms":  n.military+=1; n.prestige+=1; break;
      }
    });
    return active;
  },
  activeBonds(){ return BONDS.filter(b=>b.cond(this.s)); },
  grantVoucher(){ this.s.recruitVoucher=true; this.toast("获一次「半价招贤」良机！"); },
  // 碎片升级：消耗碎片提升一名官员主属性（武将提武略、文官提文才，边际递减）
  upgradeMinister(id){
    const s=this.s, m=s.ministers.find(x=>x.id===id); if(!m) return;
    if((s.shards||0)<UPGRADE_COST){ this.toast(`碎片不足（需 ${UPGRADE_COST}）`); return; }
    s.shards-=UPGRADE_COST;
    const key = m.kind==="martial" ? "mil" : "civ";
    const b=m[key]; m[key]=grow(b, 12);
    SFX.good(); this.toast(`${m.name} ${key==="mil"?"武略":"文才"} +${m[key]-b}（碎片余 ${s.shards}）`);
    UI.renderPanel("court");
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

  /* ---------- 后宫攻略系统（P9·galgame）---------- */
  /* 可攻略名单：前置已解锁、尚未入宫 */
  wooableConsorts(){ const s=this.s; return CONSORTS.filter(t=>t.unlock.cond(s) && !s.consorts.some(c=>c.tplId===t.id)); },
  lockedConsorts(){ const s=this.s; return CONSORTS.filter(t=>!t.unlock.cond(s) && !s.consorts.some(c=>c.tplId===t.id)); },
  romanceOf(cid){ const s=this.s; return (s.romance[cid] = s.romance[cid] || {aff:0,seen:[],done:false}); },

  /* 攻略行动（夜·消耗时段）：kind="meet" 相会 / "gift" 赠礼 */
  wooConsort(cid,kind){
    const s=this.s; const tpl=consortTpl(cid); if(!tpl) return;
    if(s.actedThisTurn){ this.toast("此时段已行一事"); return; }
    if(!tpl.unlock.cond(s)){ this.toast(`${tpl.name} 缘分未到`); return; }
    if(s.consorts.some(c=>c.tplId===cid)){ this.toast("已纳入后宫"); return; }
    if(tpl.requirePost && !s.ministers.some(m=>m.post===tpl.requirePost)){ this.toast(`${tpl.name} 门第失势，暂难亲近`); UI.renderPanel("harem"); return; }
    const r=this.romanceOf(cid);
    let gain;
    if(kind==="gift"){
      if(s.nation.treasury<6){ this.toast("国库不足，无以备礼"); UI.renderPanel("harem"); return; }
      s.nation.treasury-=6; gain=R.i(11,17);
    }else{
      const base=s.emperor[tpl.woo]||40;                       // 吃她偏好的那一维
      gain=Math.round((7 + base/9 + s.emperor.charm/16) * (100-r.aff)/100) + R.i(1,4);  // 边际递减
      if(this.hasTalent("t_charm")) gain=Math.round(gain*1.4); // 天赋·风流天子
    }
    r.aff=R.clamp(r.aff+gain);
    s.actedThisTurn=true; SFX.good();
    this.tally("woo"); if(typeof QuestSys!=="undefined") QuestSys.see(s,"consorts",cid);
    this.toast(`与 ${tpl.name} ${kind==="gift"?"赠礼":"相会"}，心动 +${gain}（${r.aff}/100）`);
    // 心动跨阈值 → 触发未演的剧情幕
    const idx=tpl.scenes.findIndex((sc,i)=>!r.seen.includes(i) && r.aff>=sc.at);
    if(idx>=0){ r.seen.push(idx); this.showSceneCard(tpl,tpl.scenes[idx]); UI.closePanel(); this.afterEvent(); return; }
    UI.renderPanel("harem"); this.renderTurn();
  },

  /* 把一幕剧情包装成事件卡（复用 showCard/resolveEvent；末幕选项触发入宫）*/
  showSceneCard(tpl,scene){
    const choices=scene.choices.map(ch=>{
      const c={text:ch.text, effects:ch.eff||{}};
      if(scene.join) c.do=(G)=>G.joinConsort(tpl.id);
      return c;
    });
    this.showCard({title:scene.title, role:"consort", _face:tpl.portrait, big:false,
      text:`【${ORIGINS[tpl.origin].name} · ${tpl.name}】　${scene.text}`, choices});
  },

  joinConsort(cid){
    const s=this.s, tpl=consortTpl(cid); if(!tpl) return;
    if(s.consorts.some(c=>c.tplId===cid)) return;
    const c=makeConsort(tpl); s.consorts.push(c);
    this.romanceOf(cid).done=true;
    if(typeof QuestSys!=="undefined") QuestSys.see(s,"consorts",cid);
    SFX.gong();
    this.logMsg(`${tpl.name} 入宫，封为${RANKS[c.rank]}（特质·${c.traitName}）。`);
    this.toast(`${tpl.name} 倾心相许，纳为${RANKS[c.rank]}！`);
  },

  /* 入宫妃子的被动特质，按月结算 */
  applyConsortTraits(){
    const s=this.s, n=s.nation, e=s.emperor;
    s.consorts.forEach(c=>{
      switch(c.traitKey){
        case "huiyan":   s.recruitPoints=(s.recruitPoints||0)+1; break;
        case "mulberry": n.people=R.clamp(n.people+1); break;
        case "chenyu":   e.charm=grow(e.charm,3); break;
        case "fengqiu":  n.treasury=R.clamp(n.treasury+1); break;
        case "hongxian": s.ministers.forEach(m=>m.ambition=R.clamp(m.ambition-1)); break;
        case "jieyu":    this.allConsortFavor(1); break;
        case "wenji":    e.int=grow(e.int,3); n.treasury=R.clamp(n.treasury+1); break;
        case "mulan":    n.military=R.clamp(n.military+1); break;
        case "jianqi":   e.martial=grow(e.martial,3); break;
        case "qingguo":  e.charm=grow(e.charm,4); c.favor=R.clamp(c.favor+R.i(-6,3)); break;
        case "meihua":   n.prestige=R.clamp(n.prestige+1); e.charm=grow(e.charm,2); break;
        case "xiao":     ["treasury","military","people","food","land","prestige"].forEach(k=>n[k]=R.clamp(n[k]+0.6)); break;
      }
    });
  },

  /* 教养皇嗣：消耗本时段行动，按边际递减提升孩子某一维 */
  educateChild(id,kind){
    const s=this.s; if(s.actedThisTurn){ this.toast("此时段已行一事"); return; }
    const c=s.children.find(x=>String(x.id)===String(id)); if(!c)return;
    const map={int:"智力",charm:"魅力",martial:"武力",politics:"政治"};
    const k=kind||R.pick(Object.keys(map));
    const b=c[k]||40; c[k]=R.clamp(grow(b,8));
    s.actedThisTurn=true; SFX.good();
    this.toast(`教养 ${c.name}，${map[k]} +${c[k]-b}。`);
    UI.closePanel(); this.renderTurn();
  },

  /* ---------- 事件 do() 可调用的 API ---------- */
  shiftAllLoyalty(d){ this.s.ministers.forEach(m=>m.loyalty=R.clamp(m.loyalty+d)); },
  /* 关系连坐：查 a↔b 关系类型（双向） */
  relEdge(a,b){ const bid=b.castId||b.id;
    const f=x=>(x.rel||[]).find(r=>r.to===bid);
    const e=f(a)||((b.rel||[]).find(r=>r.to===(a.castId||a.id))); return e?e.type:null; },
  /* 处罚/封赏一人 → 关系网涟漪（同党亲族师门牵连、政敌世仇反应）。返回受影响摘要。 */
  relRipple(target, kind){
    const s=this.s, affected=[], tid=target.castId||target.id;
    s.ministers.forEach(o=>{
      if((o.castId||o.id)===tid) return;
      const type=this.relEdge(target,o); if(!type) return;
      let dl=0, dt=0, da=0;
      if(kind==="punish"){
        if(type==="同党"||type==="盟友"){ dl=-4; dt=-5; }
        else if(type==="亲族"||type==="姻亲"){ dl=-6; dt=-6; }
        else if(type==="师徒"){ dl=-5; dt=-4; }
        else if(type==="政敌"||type==="世仇"){ dl=+3; }
      }else{ // reward
        if(type==="师徒"||type==="亲族"||type==="姻亲"||type==="盟友"){ dl=+3; }
        else if(type==="同党"){ dl=+2; }
        else if(type==="政敌"||type==="世仇"){ dl=-2; da=+2; }
      }
      if(dl||dt||da){ o.loyalty=R.clamp(o.loyalty+dl);
        if(o.secret) o.secret.trueLoyalty=R.clamp(o.secret.trueLoyalty+dt);
        if(da) o.ambition=R.clamp(o.ambition+da);
        affected.push({name:o.name, type, dl}); }
    });
    return affected;
  },
  /* 连坐 toast 摘要 */
  _rippleToast(target, kind, affected){
    if(!affected.length) return;
    const tip=affected.slice(0,4).map(a=>`${a.name}(${a.type}${a.dl>0?"↑":"↓"})`).join("、");
    this.toast(`牵动关系：${tip}${affected.length>4?"…":""}`);
    this.logMsg(`${target.name}${kind==="punish"?"获罪":"受赏"}，牵动 ${affected.map(a=>a.name).join("、")}。`);
  },
  allConsortFavor(d){ this.s.consorts.forEach(c=>c.favor=R.clamp(c.favor+d)); },
  toast(msg){ UI.toast(msg); },
  removeRebel(){ const s=this.s; if(s.rebel){const m=s.ministers.find(x=>x.id===s.rebel.id); if(m){m.post=null; const i=s.ministers.indexOf(m); s.ministers.splice(i,1);} s.rebel=null;} },

  recruit(n){
    const s=this.s; let got=0;
    for(let k=0;k<n;k++){
      let src=null;
      while(s.pool.ministers.length){ const cand=s.pool.ministers.shift(); if(!s.blacklist.includes(cand.file)){ src=cand; break; } }
      if(!src) break;
      s.ministers.push(buildMinisters([src],1)[0]); got++;
    }
    this.toast(`科举得士，${got} 位新贤入朝。`);
  },

  marryPrincess(){
    const s=this.s; const p=s.children.find(c=>c.gender==="女"&&c.age>=14&&!c.married);
    if(p){ p.married=true; this.toast(`公主 ${p.name} 远嫁番邦，结两国之好。`);}
  },

  /* ---------- 微服探险（roguelike·一次抽 3 桩随机遭遇连环抉择）---------- */
  startInspection(){
    this._advQueue = R.shuffle(INSPECT_ENCOUNTERS).slice(0,3);
    this._advStep = 0; this.tally("inspect");
    this.nextEncounter();
  },
  nextEncounter(){
    if(!this._advQueue || this._advStep>=this._advQueue.length){
      this._advQueue=null;
      this.showCard({title:"微服回銮",role:"eunuch",
        text:"一番微服私访，民间疾苦、世态炎凉，尽入圣心。摆驾回宫，感念良多。",
        choices:[{text:"摆驾回宫",do:()=>{}}]});
      return;
    }
    const enc=this._advQueue[this._advStep++];
    this.showCard({title:"微服 · "+enc.title, role:enc.role||"peasant", text:enc.text,
      choices:enc.choices.map(ch=>({text:ch.text, effects:ch.eff, do:(G2)=>G2.nextEncounter()}))});
  },

  /* ---------- 主动出征：点将 → 沙盘会战（WarfieldSys 网格战棋）---------- */
  launchCampaign(genIds, withEmperor){
    const s=this.s, n=s.nation;
    if(s.actedThisTurn){ this.toast("此时段已行一事，明日再战"); return; }
    if(s.pendingEvent){ this.toast("请先处理朝政"); return; }
    if(n.military<15){ this.toast("兵力凋敝，不堪一战"); return; }
    const gens=s.ministers.filter(m=>genIds&&genIds.includes(m.id));
    if(!gens.length && !withEmperor){ this.toast("请先点选出征武将（或御驾亲征）"); return; }
    const enemy=R.pick(ENEMIES);
    const ePow=R.i(45,80)+n.year+(withEmperor?6:0);
    const marshal=gens.find(g=>g.post==="marshal")||gens[0]||null;
    const done=(res)=>{
      s.actedThisTurn=true;
      this.resolveWar(withEmperor?"emperor":"offense", res, enemy, marshal);
    };
    if(typeof WarfieldSys!=="undefined" && WarfieldSys.open){
      UI.closePanel();
      WarfieldSys.open({ enemy, ourMilitary:n.military, generals:gens,
        emperor:s.emperor, withEmperor:!!withEmperor, enemyPow:ePow, onResolve:done });
    }else{   // 无头兜底：即时判定
      const our=n.military*0.5+(withEmperor?s.emperor.martial:0)+(marshal?marshal.mil:20);
      done({win:(our+R.i(-15,30))>=(ePow+R.i(-10,25)), ourHP:60, rounds:0});
    }
  },

  /* ---------- 战争 ---------- */
  startWar(type){
    const s=this.s, n=s.nation;
    const enemy=R.pick(ENEMIES);
    const ePow=R.i(40,75)+n.year+ (type==="invade"?8:0);
    const marshal=s.ministers.find(m=>m.post==="marshal");
    let our=n.military*0.5;
    if(type==="emperor") our+=s.emperor.martial+8+(this.hasTalent("t_valor")?6:0);   // 天赋·神武盖世：亲征更勇
    else our+=(marshal?marshal.mil:25);
    if(this.hasTalent("t_strategy")) our+=8;   // 天赋·运筹帷幄
    // 可操作战斗界面（多回合·战术博弈）：交由 BattleSys 接管，结束回调 resolveWar
    if(typeof BattleSys!=="undefined" && BattleSys.open){
      const leader = type==="emperor" ? `${s.emperor.name}（御驾亲征）` : (marshal?`${marshal.name}（武略${marshal.mil}）`:"偏将临阵");
      BattleSys.open({ type, enemy, ourPow:our, enemyPow:ePow, leader,
        onResolve:(res)=>this.resolveWar(type,res,enemy,marshal) });
      return;
    }
    // 回退：无 BattleSys 时即时判定（保留旧逻辑，便于无头测试）
    const win=(our+R.i(-15,30))>=(ePow+R.i(-15,25));
    this.resolveWar(type,{win,ourHP:win?60:8,rounds:0},enemy,marshal);
  },
  /* 战后结算：复用既有开疆/丧师数值，按战损（ourHP 余量）微调战果 */
  resolveWar(type,res,enemy,marshal){
    const s=this.s, n=s.nation; const win=!!res.win; const decisive=(res.ourHP||0)>=60;
    let title,text,role="general";
    if(win){
      const conq=this.hasTalent("t_conquest");   // 天赋·开疆拓土
      const land=R.i(3,8)+(decisive?R.i(1,4):0)+(conq?3:0), spoil=R.i(6,16)+Math.round((res.ourHP||40)/12), loss=R.i(5,12);
      n.land=R.clamp(n.land+land); n.treasury=R.clamp(n.treasury+spoil);
      n.prestige=R.clamp(n.prestige+(type==="emperor"?12:8)+(decisive?4:0)+(conq?4:0)); n.military=R.clamp(n.military-loss);
      n.people=R.clamp(n.people+4);
      s.flags.warWon=true;   // 战功——解锁巾帼·燕霜攻略
      this.tally("battlewin");
      title=decisive?"大捷！":"惨胜"; text=`${type==="invade"?"击退":(type==="emperor"?"御驾亲征，大破":"挥师征讨")}${enemy}，${decisive?"斩获无数":"险胜收兵"}！疆域 +${land}，国库 +${spoil}，威望大涨。`;
      if(marshal){ marshal.loyalty=R.clamp(marshal.loyalty+4); this.gainExp(marshal,10); }
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
        this.afterEvent(); return;
      }
    }
    this.showCard({title,text,role,choices:[{text:"继续",do:()=>{}}]});
    this.afterEvent();
  },

  /* ---------- 快进：连推时段，遇事件 / 月末 / 国丧 即停 ---------- */
  fastForward(){
    const s=this.s; if(s.over||s.pendingEvent) return;
    const startM=s.nation.month, startY=s.nation.year, startGen=s.gen;
    this._ff=true;                       // 静默：循环内不重绘 DOM
    let guard=0;
    while(!s.over && !s.pendingEvent && guard<400){
      this.nextTurn(); guard++;
      if(s.gen!==startGen) break;        // 改朝换代（弹了传位公告）
      if(s.nation.month!==startM || s.nation.year!==startY) break;  // 跨月即停
    }
    this._ff=false;
    if(!s.over){ this.renderTurn(); if(!s.pendingEvent) this.toast("⏩ 已快进至月末（或下一桩朝政）"); }
  },

  /* ---------- 推进一个时段（早→中→晚→次日）---------- */
  nextTurn(){
    const s=this.s, n=s.nation; if(s.over) return;
    if(s.pendingEvent){ this.toast("请先处理朝政奏折"); return; }
    if(!this._ff) SFX.deal();
    this.tally("turn");
    let dayTurned=false;
    n.phase++;
    if(n.phase>2){                       // 一天过完
      n.phase=0; n.day++; dayTurned=true;
      this.dailyTick();
      if(s.over) return;
      if(n.day>MONTH_DAYS){              // 一月过完 → 结算
        n.day=1; n.month++;
        this.monthlySettle();
        if(s.over) return;
        if(n.month>12){                  // 一年过完 → 年事
          n.month=1; n.year++;
          this.yearlyTick();
          if(s.over) return;
        }
      }
    }
    if(this.checkEndings()) return;
    if(s._succession){ const d=s._succession; s._succession=null; UI.announceSuccession(d,()=>this.beginTurn()); return; }
    if(dayTurned && !this._ff && typeof UI!=="undefined" && UI.dayTransition){
      const MN=["","正","二","三","四","五","六","七","八","九","十","冬","腊"];
      const date=`${n.year}年 ${MN[n.month]}月 ${n.day}日`;
      const head = (n.month===1&&n.day===1) ? "新　岁" : (n.day===1 ? "新　月" : "翌　日");
      UI.dayTransition(head, date, "晨光熹微，又是一日");
    }
    this.beginTurn();
    // 入夜密报：密谍司戌时密呈（仅有异动才弹·快进静默）
    if(n.phase===2 && !this._ff && typeof SpySys!=="undefined" && SpySys.established(s)){
      const rec=SpySys.nightReport(s);
      if(rec && (rec.items.length||rec.alert) && !s.pendingEvent) UI.openModal(SpySys.reportHTML(rec));
    }
  },

  /* 每日：轻量推进（健康微漂移 + 百官暗面演化 + 暗线养熟检测）*/
  dailyTick(){
    const e=this.s.emperor;
    if(R.chance(8)) e.health-=1;         // 日常损耗（约每月 -2~3，与原月制相当）
    if(typeof SpySys!=="undefined"){ SpySys.tick(this.s); this.spyMaturity(); }  // 私下勾当暗中滋长
    this.clampAll();
  },

  /* 每月：经济 / 忠诚 / 怀孕 / 百官治绩结算 */
  monthlySettle(){
    const s=this.s, n=s.nation, e=s.emperor;
    MapSys.produce(s); MapSys.growEnemies(s);   // 列国舆图：自有州郡月产 + 敌境growth
    // 百官治绩
    // 增益随接近上限递减（headroom 软顶）：n[k] 越高单位增益越小，使国力收敛到中段而非焊满
    const gain=(k,amt)=>{ n[k]+=amt*(100-n[k])/100; };
    // 百官治绩
    s.ministers.forEach(m=>{
      if(!m.post) return;
      const pos=POSITIONS.find(p=>p.id===m.post); if(!pos) return;
      const t=m[pos.use];
      if(pos.eff) pos.eff(gain, t, s, n);       // 数据驱动：各官职月结治绩
      this.gainExp(m, 3);                       // 在职历练：积累经验升级
    });
    // 经济：税入 - 开支（开支随军队/后宫/百官增长 → 治国是收支平衡的艺术）
    const income=n.people/18 + n.land/24 + (this.hasTalent("t_finance")?2:0);   // 天赋·理财有道 +2
    const upkeep=n.military/11 + s.consorts.length*0.8 + s.ministers.filter(m=>m.post).length*1.3;
    n.treasury+=income-upkeep;                 // 净流可正可负，荒政则赤字
    n.food   += n.land/24 - n.people/24;        // 地养粮、民耗粮（人多则粮紧）
    n.military-= n.military/28 * (this.hasTalent("t_drill")?0.5:1);   // 天赋·治军严明：损耗减半
    n.people  -= n.people/120 * (this.hasTalent("t_benevol")?0.5:1);  // 天赋·仁泽万民：回落减半
    if(this.hasTalent("t_taxation"))  gain("people",0.6);     // 天赋·轻徭薄赋：民心月回升
    if(this.hasTalent("t_logistics")) gain("military",0.8);   // 天赋·兵精粮足：兵力月回升
    if(this.hasTalent("t_virtue"))    n.prestige=R.clamp(n.prestige+1);  // 天赋·德被苍生：威望月增
    // 月度治理产出招贤点：民心越盛、贤才越愿来投（御史在职额外揽才）
    s.recruitPoints=(s.recruitPoints||0)+ 1 + (n.people>=60?1:0) + (s.ministers.some(m=>m.post==="censor")?1:0) + (this.hasTalent("t_meritocracy")?1:0);
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
    this.applyConsortTraits();   // 入宫妃子的被动特质
    this.applyBonds();           // 阵容羁绊（含兵器谱套装）被动加成
    // 帝王健康随龄消耗（按月）
    e.health-=R.i(0,1)+(e.age>=45?1:0)+(e.age>=60?1:0);
    if(typeof QuestSys!=="undefined"&&s.quest) QuestSys.refreshDaily(s);   // 月初轮替日课
    this.clampNation();
  },

  /* 每年：年龄增长 / 老臣告老 / 丹毒 / 天年 */
  yearlyTick(){
    const s=this.s, n=s.nation, e=s.emperor;
    e.age++; s.peakAge=Math.max(s.peakAge,e.age);
    s.talentPts=(s.talentPts||0)+1; this.logMsg(`又是一年，帝王心智渐熟，得天赋点 +1。`);
    s.children.forEach(c=>{ c.age++; this.growChild(c); });
    s.ministers.forEach(m=>{ m.age++; if(m.age>72 && R.chance(20)){ this.retire(m); } });
    if(s.flags.pills>=5 && R.chance(s.flags.pills*4)){ this.emperorDies("poison"); return; }
    const longev=this.hasTalent("t_longevity")?0.55:1;   // 天赋·颐养天和：天年风险大减
    if(e.age>=50 && R.chance((e.age-48)*4*longev)){ this.emperorDies("age"); return; }
  },

  /* 孩子成长：随年龄推进成长阶段（婴/幼/少/青），属性随之增益 */
  growChild(c){
    const st=childStage(c.age);
    if(c._stage===st.key) return;
    c._stage=st.key;
    // 进入新阶段，五维小幅成长
    ["int","charm","martial","politics"].forEach(k=>{ c[k]=R.clamp((c[k]||40)+R.i(2,6)); });
    if(st.key!=="baby") this.logMsg(`皇${c.gender==="男"?"子":"女"}${c.name} 已长成${st.name}。`);
  },

  retire(m){ m.post=null; const i=this.s.ministers.indexOf(m); if(i>=0)this.s.ministers.splice(i,1); this.logMsg(`老臣 ${m.name} 告老还乡。`); },

  birth(c){
    const s=this.s; const boy=R.chance(52);
    const name=(boy?R.pick(GIVEN_M):R.pick(GIVEN_F));
    const child={id:"ch_"+Date.now().toString(36)+Math.floor(Math.random()*1e4),
      name, gender:boy?"男":"女", age:0, mother:c.name, isHeir:false, married:false, _stage:"baby",
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
      s._sageWin=true; if(typeof QuestSys!=="undefined"&&s.quest) QuestSys.check(s);
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
    // 新君登基：后宫一清（新朝重新攻略），旧皇子退场，老臣部分留任
    s.consorts=[]; s.romance={};
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
      else if(k==="loyalty") this.shiftAllLoyalty(fx[k]);   // 关系增量：百官忠诚（B4 显式）
      else if(k==="favor") this.allConsortFavor(fx[k]);     // 关系增量：后宫好感（B4 显式）
      else if(k==="points") s.recruitPoints=(s.recruitPoints||0)+fx[k];  // 招贤点（B2 事件产出）
    }
    this.clampAll();
  },
  clampNation(){ const n=this.s.nation; for(const k in NATION_STATS) if(k!=="treasury") n[k]=R.clamp(n[k]); if(n.treasury>100)n.treasury=100; },
  clampAll(){ this.clampNation(); const e=this.s.emperor; for(const k in EMP_ATTRS) e[k]=R.clamp(e[k]); },

  logMsg(t){ const s=this.s; s.log.unshift(`${s.nation.year}年${s.nation.month}月 · ${t}`); if(s.log.length>60)s.log.pop(); },

  renderTurn(){ if(this._ff){ this.save(); return; } if(typeof QuestSys!=="undefined"&&this.s.quest) QuestSys.check(this.s); UI.renderHUD(); UI.renderEmperor(); if(this.s.pendingEvent)UI.showEvent(this.s.pendingEvent); else UI.showMonth(); UI.renderActions(); if(typeof MusicSys!=="undefined") MusicSys.setScene(this.s.nation.phase===2?"night":"court"); this.save(); },

  /* ---------- 存档 ---------- */
  save(){ try{ localStorage.setItem(LS_SAVE, JSON.stringify(this.s)); }catch(e){} },
  /* 旧档字段补全（惰性 migration），新存档结构变化时在此兜底 */
  _migrate(d){ if(!d.romance)d.romance={}; if(!d.weapons)d.weapons=[]; if(!d.weaponLv)d.weaponLv={}; if(!d.talents)d.talents=[]; if(d.talentPts==null)d.talentPts=0; return d; },
  /* 把一份状态对象装载为当前游戏并进入游戏界面 */
  _adopt(d){ this._migrate(d); this.s=d; MapSys.initState(this.s); if(typeof SpySys!=="undefined") SpySys.init(this.s); if(typeof QuestSys!=="undefined") QuestSys.initState(this.s); UI.toGame(); this.renderTurn(); },
  load(){ try{ const d=JSON.parse(localStorage.getItem(LS_SAVE)); if(d&&!d.over){ this._adopt(d); return true; } }catch(e){} return false; },

  /* ---------- 多格手动存档（与自动存档「继续上局」并存）---------- */
  slotMeta(i){ try{ const d=JSON.parse(localStorage.getItem(LS_SLOT(i))); return d?d.meta:null; }catch(e){ return null; } },
  slotsMeta(){ const a=[]; for(let i=0;i<SLOT_COUNT;i++) a.push(this.slotMeta(i)); return a; },
  saveToSlot(i){
    if(!this.s || this.s.over){ this.toast("当前无进行中的存档"); return; }
    const s=this.s, meta={dynasty:s.dynasty, reign:s.reign, name:s.emperor.name,
      year:s.nation.year, month:s.nation.month, gen:s.gen, score:this.score(), ts:Date.now()};
    try{ localStorage.setItem(LS_SLOT(i), JSON.stringify({meta, snap:s})); SFX.good(); this.toast(`已存入 存档${i+1}`); }
    catch(e){ this.toast("存档失败（浏览器空间不足）"); }
    UI.openArchive(this._archiveMode||"save");
  },
  loadFromSlot(i){
    try{ const d=JSON.parse(localStorage.getItem(LS_SLOT(i)));
      if(!d||!d.snap){ this.toast("此格为空"); return; }
      const dd=d.snap; this._adopt(dd);
      try{ localStorage.setItem(LS_SAVE, JSON.stringify(this.s)); }catch(e){}   // 同步为自动存档，下次「继续上局」即此局
      UI.closeModal(); SFX.gong(); this.toast(`读取 存档${i+1}`);
    }catch(e){ this.toast("读档失败（存档已损坏）"); }
  },
  deleteSlot(i){ try{ localStorage.removeItem(LS_SLOT(i)); }catch(e){} this.toast(`已删除 存档${i+1}`); UI.openArchive(this._archiveMode||"save"); },
  saveBest(){ const s=this.s; const best=JSON.parse(localStorage.getItem(LS_BEST)||"null");
    const cur={dynasty:s.dynasty,years:s.nation.year,gen:s.gen,score:this.score()};
    if(!best||cur.score>best.score) localStorage.setItem(LS_BEST, JSON.stringify(cur)); }
};

const LS_SAVE="zjjs_save", LS_BEST="zjjs_best";
const SLOT_COUNT=6, LS_SLOT=i=>"zjjs_slot_"+i;
return api;
})();
