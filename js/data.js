/* ===================================================================
   data.js —— 静态数据与角色构建
   - 国家六维 / 帝王五维 / 官职 / 性格 / 敌国
   - 事件库 EVENTS（政务·灾害·战争·外交·后宫·权臣·谋反·科举·丹药…）
   - 由 manifest.json（真实古籍立绘）构建满朝文武、后宫、名将
   =================================================================== */

/* 国家六维（key: 中文名/图标/颜色） */
const NATION_STATS = {
  treasury:{name:"国库",icon:"💰",color:"#d9b65f"},
  military:{name:"兵力",icon:"⚔️",color:"#c0563a"},
  people:  {name:"民心",icon:"🌾",color:"#5aa06a"},
  food:    {name:"粮草",icon:"🍚",color:"#c79a5a"},
  land:    {name:"疆域",icon:"🗺️",color:"#7a9bd0"},
  prestige:{name:"威望",icon:"🏯",color:"#b07ac0"}
};
/* 帝王五维 */
const EMP_ATTRS = {
  health:  {name:"健康",color:"#d9655a"},
  int:     {name:"智力",color:"#5b82b8"},
  charm:   {name:"魅力",color:"#c0397a"},
  martial: {name:"武力",color:"#c0563a"},
  politics:{name:"政治",color:"#5aa06a"}
};

/* 统一鎏金线描图标（替代 emoji，跟随 currentColor 上色） */
const _i = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICONS = {
  // 国家六维
  treasury:_i('<path d="M3.5 15c3.5-4 13.5-4 17 0l-2 3.2c-4.5-1.8-8.5-1.8-13 0z"/><path d="M9.5 12c1-1.6 4-1.6 5 0"/>'),
  military:_i('<path d="M12 3v11"/><path d="M9 14h6"/><path d="M12 14v5"/><path d="M10.5 19h3"/>'),
  people:_i('<path d="M12 5.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6"/><path d="M5.5 19c0-3.7 2.9-6 6.5-6s6.5 2.3 6.5 6"/>'),
  food:_i('<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 7.5c0 1-1 1.3-1 2.3"/><path d="M13 6.5c0 1.2-1 1.6-1 2.8"/>'),
  land:_i('<path d="M2 19l6-9 4 5 3-4 7 8"/>'),
  prestige:_i('<path d="M6.5 3v18"/><path d="M6.5 4h11l-3 3.2 3 3.2h-11"/>'),
  // 行动
  govern:_i('<path d="M7 3h10v18H7z"/><path d="M10 8h4"/><path d="M10 12h4"/><path d="M10 16h3"/>'),
  read:_i('<path d="M12 6c-2-1.4-5-1.4-7.5-1v12c2.5-.4 5.5-.4 7.5 1 2-1.4 5-1.4 7.5-1V5c-2.5-.4-5.5-.4-7.5 1z"/><path d="M12 6v13"/>'),
  train:_i('<path d="M7.5 4a12 12 0 0 1 0 16"/><path d="M5 12h13"/><path d="M15 9l3 3-3 3"/>'),
  cultivate:_i('<path d="M12 20L5.5 9.5a7.5 7.5 0 0 1 13 0z"/><path d="M12 20V11"/><path d="M9 11l1.3-3.2"/><path d="M15 11l-1.3-3.2"/>'),
  rest:_i('<path d="M20 13.5A8 8 0 1 1 10.5 4 6.3 6.3 0 0 0 20 13.5z"/>'),
  visit:_i('<path d="M12 20S4 14.5 4 9.2A3.7 3.7 0 0 1 12 6.4 3.7 3.7 0 0 1 20 9.2C20 14.5 12 20 12 20z"/>'),
  audience:_i('<path d="M8 6.5a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8"/><path d="M16 6.5a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8"/><path d="M3.5 18c0-3 2-4.5 4.5-4.5s4.5 1.5 4.5 4.5"/><path d="M16 13.5c2.5 0 4.5 1.5 4.5 4.5"/>'),
  // 页签
  court:_i('<path d="M4 9l8-4.5 8 4.5"/><path d="M5.5 9v8.5"/><path d="M18.5 9v8.5"/><path d="M5 18h14"/><path d="M9.5 18v-4.5h5V18"/>'),
  harem:_i('<path d="M12 3v2"/><path d="M12 5c-3 0-5 2.5-5 6.5S9 18 12 18s5-2.5 5-6.5S15 5 12 5z"/><path d="M7.5 9h9"/><path d="M7.5 14h9"/><path d="M12 18v2.5"/>'),
  heir:_i('<path d="M12 5.2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8"/><path d="M8.5 19v-4a3.5 3.5 0 0 1 7 0v4"/><path d="M9.5 19h5"/>'),
  army:_i('<path d="M12 3l7 2.2v5.8c0 4.8-3.4 7.8-7 9.7-3.6-1.9-7-4.9-7-9.7V5.2z"/><path d="M12 8v6"/><path d="M9 11h6"/>'),
  log:_i('<path d="M4 6h16"/><path d="M4 18h16"/><path d="M6.5 6v12"/><path d="M17.5 6v12"/><path d="M9.5 10h5"/><path d="M9.5 14h5"/>'),
  map:_i('<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z"/><path d="M9 4v14"/><path d="M15 6v14"/>'),
  next:_i('<path d="M6 6l6 6-6 6"/><path d="M13 6l6 6-6 6"/>'),
  // 新增：招贤 / 罢免
  recruit:_i('<path d="M9 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path d="M3.5 19c0-3.2 2.5-5 5.5-5"/><path d="M16 8v6"/><path d="M13 11h6"/>'),
  dismiss:_i('<path d="M9 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/><path d="M3.5 19c0-3.2 2.5-5 5.5-5"/><path d="M15 9l5 5"/><path d="M20 9l-5 5"/>')
};

/* 官职：用哪种才（civ文/mil武）、主要增益维度 */
const POSITIONS = [
  {id:"chancellor",name:"丞相",   use:"civ",desc:"总领百官，理政安民（增国库·民心）"},
  {id:"censor",    name:"御史大夫",use:"civ",desc:"监察百官，肃贪反腐（抑野心·增民心）"},
  {id:"finance",   name:"户部尚书",use:"civ",desc:"掌天下钱粮（增国库·粮草）"},
  {id:"marshal",   name:"大将军",  use:"mil",desc:"统率三军，征战四方（增兵力·战力）"},
  {id:"defense",   name:"兵部尚书",use:"mil",desc:"操练兵马，整军经武（增兵力）"}
];

/* 性格：影响忠诚漂移与野心 */
const PERSONALITIES = {
  忠厚:{loyDrift:+2,amb:-10}, 刚直:{loyDrift:+1,amb:-5},
  圆滑:{loyDrift:0, amb:+5},  奸诈:{loyDrift:-2,amb:+15},
  贪婪:{loyDrift:-1,amb:+10}, 谨慎:{loyDrift:+1,amb:0}
};
const PERS_KEYS = Object.keys(PERSONALITIES);

/* 后宫位分（由低到高） */
const RANKS = ["答应","常在","贵人","嫔","妃","贵妃","皇贵妃","皇后"];

/* 一天的三个时段（按天推进：早→中→晚） */
const PHASES = [
  {key:"morn",name:"清晨",icon:"🌅",hint:"晨光熹微，新的一日"},
  {key:"noon",name:"正午",icon:"☀️",hint:"日上中天，正宜理政"},
  {key:"eve", name:"入夜",icon:"🌙",hint:"华灯初上，倦鸟归巢"}
];
const MONTH_DAYS = 30;   // 每月天数（统一 30，便于结算）

/* 选秀：每次纳新嫔妃的花费 */
const SELECT_COST = 10;

/* ---------- 招贤抽卡（点数 + 高/中/低档 + 保底 + 重复转碎片）---------- */
const GACHA = {
  cost: 10,        // 每抽消耗「招贤点」
  pity: 10,        // 保底：连续未出大才满 N 抽，下一抽必出高档
  tiers: {
    low:  {key:"low", name:"庸才", star:"★",   p:0.60, statBonus:0,  shard:1, color:"#9a9c8f"},
    mid:  {key:"mid", name:"良才", star:"★★",  p:0.30, statBonus:10, shard:3, color:"#6ca9e0"},
    high: {key:"high",name:"大才", star:"★★★", p:0.10, statBonus:22, shard:6, color:"#e0b24a"}
  }
};
const TIER_KEYS = ["low","mid","high"];
function rollTier(pity){
  if(pity>=GACHA.pity) return "high";
  const r=Math.random();
  if(r < GACHA.tiers.high.p) return "high";
  if(r < GACHA.tiers.high.p + GACHA.tiers.mid.p) return "mid";
  return "low";
}
const UPGRADE_COST = 5;   // 每次以碎片提升一名官员主属性所耗碎片

/* ---------- 武器系统：独立卡牌池，装备于角色提对应能力 ---------- */
const WEAPONS = [
  {id:"tieqiang", name:"铁枪",     tier:"low",  stat:"mil", bonus:5,  img:"assets/weapons/tieqiang.png",  desc:"寻常铁枪，聊胜于无"},
  {id:"langhao",  name:"狼毫笔",   tier:"low",  stat:"civ", bonus:5,  img:"assets/weapons/langhao.png",   desc:"文房利器，落笔成章"},
  {id:"qilingong",name:"麒麟弓",   tier:"mid",  stat:"mil", bonus:12, img:"assets/weapons/qilingong.png", desc:"良弓在手，百步穿杨"},
  {id:"liutao",   name:"六韬兵书", tier:"mid",  stat:"civ", bonus:12, img:"assets/weapons/liutao.png",    desc:"运筹帷幄，决胜千里"},
  {id:"yuruyi",   name:"玉如意",   tier:"mid",  stat:"civ", bonus:10, img:"assets/weapons/yuruyi.png",    desc:"祥瑞之器，言出法随"},
  {id:"fangtian", name:"方天画戟", tier:"high", stat:"mil", bonus:22, img:"assets/weapons/fangtian.png",  desc:"万人敌之兵，所向披靡"},
  {id:"qinggang", name:"青釭剑",   tier:"high", stat:"mil", bonus:20, img:"assets/weapons/qinggang.png",  desc:"削铁如泥，吹毛断发"},
  {id:"yuxi",     name:"传国玉玺", tier:"high", stat:"civ", bonus:22, img:"assets/weapons/yuxi.png",      desc:"受命于天，既寿永昌"}
];
function weaponById(id){ return WEAPONS.find(w=>w.id===id); }
function rollWeapon(){ const t=rollTier(0); const pool=WEAPONS.filter(w=>w.tier===t); return R.pick(pool.length?pool:WEAPONS); }

/* 敌国/番邦 */
const ENEMIES = ["北狄","西羌","东瀛","南诏","匈奴","突厥","契丹","吐蕃"];

/* ---------- 工具 ---------- */
const R = {
  i:(a,b)=>Math.floor(Math.random()*(b-a+1))+a,
  pick:a=>a[Math.floor(Math.random()*a.length)],
  shuffle:a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;},
  chance:p=>Math.random()*100<p,
  clamp:(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,v))
};

/* 孩子成长阶段（按年龄）。key 同时用作成长立绘的文件名后缀 */
const CHILD_STAGES = [
  {key:"baby", name:"襁褓",  max:2},
  {key:"child",name:"孩童",  max:6},
  {key:"teen", name:"少年",  max:12},
  {key:"youth",name:"弱冠",  max:99}
];
function childStage(age){ return CHILD_STAGES.find(s=>age<=s.max) || CHILD_STAGES[CHILD_STAGES.length-1]; }

/* 帝王按年龄段立绘（key 即文件名）。少年≤17 / 青年≤30 / 中年≤50 / 老年>50 */
const EMPEROR_BANDS = [
  {key:"teen",  max:17},
  {key:"young", max:30},
  {key:"middle",max:50},
  {key:"old",   max:999}
];
function emperorBand(age){ return (EMPEROR_BANDS.find(b=>age<=b.max) || EMPEROR_BANDS[EMPEROR_BANDS.length-1]).key; }
function emperorFace(age){ return "assets/portraits/emperor/"+emperorBand(age)+".png"; }

/* 子嗣取名用字 */
const GIVEN_M = "承乾景琰昭珩瑞渊弘睿晟煜钰熙泽宸曜钧澈".split("");
const GIVEN_F = "玥婉宁妧琬瑶昭华婵柔嫣媛清菀绮".split("");

/* ---------- 由 manifest 构建角色 ---------- */
function buildMinisters(list, n, tier){
  const sel = R.shuffle(list).slice(0,n);
  return sel.map((m,idx)=>({
    id:"min"+idx+"_"+Date.now()%9999+idx,
    name:m.name, portrait:m.file,
    civ:R.i(45,95), mil:R.i(10,55),
    loyalty:R.i(55,88), ambition:R.i(5,45),
    personality:R.pick(PERS_KEYS),
    post:null, age:R.i(28,60), reward:0,
    tier:tier||"mid", kind:"civil", weapon:null
  }));
}
function buildGenerals(list, n, tier){
  const sel = R.shuffle(list).slice(0,n);
  return sel.map((m,idx)=>({
    id:"gen"+idx+"_"+Date.now()%9999+idx,
    name:m.name, portrait:m.file,
    civ:R.i(20,55), mil:R.i(55,96),
    loyalty:R.i(55,90), ambition:R.i(10,55),
    personality:R.pick(PERS_KEYS),
    post:null, age:R.i(30,58), reward:0,
    tier:tier||"mid", kind:"martial", weapon:null
  }));
}
function buildConsorts(list, n){
  const sel = R.shuffle(list).slice(0,n);
  return sel.map((c,idx)=>({
    id:"con"+idx+"_"+Date.now()%9999+idx,
    name:c.name, portrait:c.file,
    beauty:R.i(55,98), personality:R.pick(PERS_KEYS),
    favor:R.i(0,15), bond:R.i(0,10),
    rank:0, pregnant:null, age:R.i(16,26)
  }));
}

/* ===================================================================
   事件库
   每个 choice 可含：
     effects {treasury,military,people,food,land,prestige, health,int,charm,martial,politics}
     do(G)    自定义逻辑（G 为 game.js 暴露的 API）
     cond(s)  选项出现条件
   事件可含 cond(s) / weight / once / role(立绘角色) / cat
   text 可为字符串或 (s)=>字符串
   =================================================================== */
const EVENTS = [
 /* ——— 政务 / 民生 ——— */
 {id:"ev_tax",cat:"政务",role:"finance",weight:3,title:"岁初定赋",
  text:"陛下，新岁伊始，该定本年赋税之策了。轻徭薄赋则民心向，加征赋税则国库丰。",
  choices:[
   {text:"轻徭薄赋，与民休息",effects:{people:+8,treasury:-6}},
   {text:"循旧例，量入为出",effects:{treasury:+3,people:+1}},
   {text:"加征赋税，充盈国库",effects:{treasury:+12,people:-10}}]},

 {id:"ev_flood",cat:"灾害",role:"finance",weight:3,title:"黄河决堤",cond:s=>s.nation.year>=1,
  text:"陛下！黄河决口，下游千里泽国，流民失所。治河靡费，然不治则民变在即。",
  choices:[
   {text:"拨巨款治河赈灾",effects:{treasury:-14,people:+12,food:-4}},
   {text:"以工代赈，雇灾民筑堤",effects:{treasury:-8,people:+8}},
   {text:"暂筑土堰，敷衍过去",effects:{people:-12,treasury:-2}}]},

 {id:"ev_locust",cat:"灾害",role:"peasant",weight:2,title:"蝗灾蔽日",cond:s=>s.nation.year>=1,
  text:"陛下，蝗虫过境，遮天蔽日，禾苗一夜尽毁，粮仓告急。",
  choices:[
   {text:"开仓放粮，减免赋税",effects:{food:-10,people:+12,treasury:-4}},
   {text:"悬赏捕蝗，组织自救",effects:{treasury:-6,people:+8,food:-2}},
   {text:"祭天祈福，静待天怒",effects:{people:-8}}]},

 {id:"ev_plague",cat:"灾害",role:"censor",weight:2,title:"瘟疫横行",cond:s=>s.nation.year>=2,
  text:"陛下，江南大疫，十室九空，恐蔓延京畿。",
  choices:[
   {text:"封城隔离，调拨药材",effects:{treasury:-12,people:+10}},
   {text:"召集名医，编印药方",effects:{treasury:-6,people:+6,int:+1}},
   {text:"听天由命",effects:{people:-16}}]},

 /* ——— 权臣 / 大臣 ——— */
 {id:"ev_corrupt",cat:"朝堂",role:"censor",weight:3,title:"贪腐成风",cond:s=>s.nation.year>=1,
  text:"陛下，地方官层层盘剥，民怨渐起。请陛下整顿吏治。",
  choices:[
   {text:"严查重惩，杀一儆百",effects:{people:+8,treasury:+6},do:G=>G.shiftAllLoyalty(-4)},
   {text:"高薪养廉，徐徐图之",effects:{treasury:-8},do:G=>G.shiftAllLoyalty(+4)},
   {text:"睁只眼闭只眼",effects:{people:-8},do:G=>G.shiftAllLoyalty(+2)}]},

 {id:"ev_powerful",cat:"朝堂",role:"chancellor",weight:2,title:"相权日重",
  cond:s=>{const c=s.ministers.find(m=>m.post==="chancellor");return c&&c.ambition>50;},
  text:s=>{const c=s.ministers.find(m=>m.post==="chancellor");return `陛下，丞相${c?c.name:""}近来专断独行，门生故吏遍布朝野，恐非社稷之福。`;},
  choices:[
   {text:"削其党羽，敲打震慑",effects:{people:+4},do:G=>{const c=G.s.ministers.find(m=>m.post==="chancellor");if(c){c.ambition-=20;c.loyalty-=8;}}},
   {text:"夺其相位，贬出京城",effects:{},do:G=>{const c=G.s.ministers.find(m=>m.post==="chancellor");if(c){c.post=null;G.toast(c.name+" 被罢相");}}},
   {text:"信任有加，委以重任",effects:{},do:G=>{const c=G.s.ministers.find(m=>m.post==="chancellor");if(c){c.loyalty+=6;c.ambition+=10;}}}]},

 {id:"ev_remonstrate",cat:"朝堂",role:"censor",weight:2,title:"御史死谏",cond:s=>s.emperor.health<55||s.nation.people<45,
  text:"御史叩首泣血：陛下近来疏于政事，长此以往，恐失天下之心！请陛下纳谏。",
  choices:[
   {text:"虚心纳谏，痛改前非",effects:{people:+8,politics:+2,health:+3}},
   {text:"赏其忠直，勉励有加",effects:{people:+4},do:G=>G.shiftAllLoyalty(+3)},
   {text:"忠言逆耳，将其下狱",effects:{people:-12},do:G=>G.shiftAllLoyalty(-6)}]},

 /* ——— 谋反（动态触发，见 game.js）——— */
 {id:"ev_rebel_min",cat:"危机",role:"general",weight:0,title:"权臣谋反",
  text:s=>`急报！${s._rebelName||"逆臣"}久蓄异志，今举兵作乱，引私军直扑宫城！`,
  choices:[
   {text:"调禁军平叛",cond:s=>s.nation.military>=35,effects:{military:-12,people:-4,treasury:-6},
    do:G=>{G.toast("叛乱已平");G.removeRebel();}},
   {text:"亲征讨逆，以振军心",cond:s=>s.emperor.martial>=55,effects:{prestige:+10,military:-8},
    do:G=>{G.toast("陛下亲征，叛军溃散");G.removeRebel();}},
   {text:"无兵可调，仓皇出逃",effects:{},do:G=>G.gameOver("usurped")}]},

 /* ——— 战争 / 军事 ——— */
 {id:"ev_invade",cat:"战争",role:"general",weight:2,title:"番邦入寇",cond:s=>s.nation.year>=2,
  text:s=>`边关急报：${R.pick(ENEMIES)}起兵犯境，铁骑南下，边军告急！`,
  choices:[
   {text:"遣大将军领兵迎战",cond:s=>s.ministers.some(m=>m.post==="marshal"),
    do:G=>G.startWar("invade")},
   {text:"御驾亲征",cond:s=>s.emperor.martial>=50,do:G=>G.startWar("emperor")},
   {text:"遣使议和，岁币换太平",effects:{treasury:-12,prestige:-6,people:-2}},
   {text:"坚壁清野，固守不出",effects:{military:-6,food:-8,people:-4}}]},

 {id:"ev_general_ask",cat:"军事",role:"general",weight:2,title:"将军请战",cond:s=>s.ministers.some(m=>m.post==="marshal")&&s.nation.military>55,
  text:"大将军请命：如今兵强马壮，正可北伐拓土，扬我国威！",
  choices:[
   {text:"准奏，出兵北伐",do:G=>G.startWar("offense")},
   {text:"国库吃紧，暂缓用兵",effects:{military:-2}},
   {text:"重赏将士，犒劳三军",effects:{treasury:-10,military:+8,prestige:+4}}]},

 /* ——— 外交 ——— */
 {id:"ev_marriage",cat:"外交",role:"envoy",weight:2,title:"番邦求亲",cond:s=>s.nation.year>=3,
  text:s=>`${R.pick(ENEMIES)}可汗遣使来朝，愿以骏马千匹为聘，求娶天朝公主，永结盟好。`,
  choices:[
   {text:"和亲结盟",cond:s=>s.children.some(c=>c.gender==="女"&&c.age>=14),
    effects:{military:+6,treasury:+8,prestige:-4},do:G=>G.marryPrincess()},
   {text:"册宗室女为公主代嫁",effects:{prestige:+2,military:+4,treasury:+4}},
   {text:"天朝岂能屈尊和亲",effects:{prestige:+6,people:+4,military:-4}}]},

 {id:"ev_tribute",cat:"外交",role:"envoy",weight:2,title:"万邦来朝",cond:s=>s.nation.prestige>=55,
  text:"四方藩属慕天朝威德，齐来朝贡，献上奇珍异宝。",
  choices:[
   {text:"厚往薄来，彰显国威",effects:{treasury:-8,prestige:+8}},
   {text:"对等回礼",effects:{treasury:+2,prestige:+2}},
   {text:"尽收贡品，赏赐从简",effects:{treasury:+10,prestige:-6}}]},

 /* ——— 科举 ——— */
 {id:"ev_exam",cat:"政务",role:"chancellor",weight:2,title:"开科取士",cond:s=>s.nation.year>=2&&s.nation.year%3===0,
  text:"陛下，三年一度的会试已毕，天下英才汇聚京城，正待陛下钦点。",
  choices:[
   {text:"亲自殿试，广纳贤才",effects:{people:+6,politics:+1,points:+10}},
   {text:"循例放榜",effects:{people:+2,points:+5}},
   {text:"鬻卖功名以充国库",effects:{treasury:+12,people:-8,points:+2}}]},

 {id:"ev_exam_fraud",cat:"政务",role:"censor",weight:1,title:"科场舞弊",cond:s=>s.nation.year>=3,
  text:"陛下，本科会试惊现舞弊，主考收贿泄题，士子哗然！",
  choices:[
   {text:"彻查严办，主考问斩",effects:{people:+10},do:G=>G.shiftAllLoyalty(-3)},
   {text:"重开恩科，安抚士子",effects:{treasury:-6,people:+6}},
   {text:"息事宁人",effects:{people:-10}}]},

 /* ——— 后宫 ——— */
 {id:"ev_harem_jealous",cat:"后宫",role:"consort",weight:2,phase:"eve",title:"六宫争宠",cond:s=>s.consorts.length>=2,
  text:"陛下，近日后宫为争宠而明争暗斗，皇后劝陛下当雨露均沾，以安宫闱。",
  choices:[
   {text:"雨露均沾，安抚六宫",effects:{charm:+1},do:G=>G.allConsortFavor(+4)},
   {text:"独宠一人，不理其余",effects:{},do:G=>G.allConsortFavor(-4)},
   {text:"严立宫规，整肃后宫",effects:{people:+2},do:G=>G.allConsortFavor(-2)}]},

 {id:"ev_empress_kin",cat:"朝堂",role:"chancellor",weight:1,title:"外戚求官",cond:s=>s.consorts.some(c=>c.rank>=6),
  text:"皇后母族倚仗后位，求陛下为其子弟封官加爵。",
  choices:[
   {text:"看在皇后面上，准了",effects:{people:-6},do:G=>G.shiftAllLoyalty(-3)},
   {text:"任人唯贤，恕难徇私",effects:{people:+6,politics:+1}}]},

 /* ——— 丹药 / 个人 ——— */
 {id:"ev_immortal",cat:"个人",role:"eunuch",weight:1,phase:"eve",title:"方士献丹",cond:s=>s.emperor.age>=38,
  text:"有方士进献金丹，言服之可延年益寿、长生不老。",
  choices:[
   {text:"日服金丹，求长生",effects:{health:+6},do:G=>{G.s.flags.pills=(G.s.flags.pills||0)+1;}},
   {text:"强身在己，逐其出宫",effects:{health:+2,people:+2}}]},

 {id:"ev_hunt",cat:"个人",role:"general",weight:2,phase:"noon",title:"围猎演武",
  text:"秋高马肥，群臣请陛下校猎西苑，既可演武，亦可怡情。",
  choices:[
   {text:"亲挽强弓，校猎演武",effects:{martial:+3,health:+2,prestige:+2}},
   {text:"国事为重，免了",effects:{politics:+1}}]},

 {id:"ev_study",cat:"个人",role:"chancellor",weight:2,phase:"morn",title:"经筵讲读",
  text:"翰林学士请陛下御经筵，讲读经史，以资治道。",
  choices:[
   {text:"潜心向学",effects:{int:+3,politics:+2,health:-1}},
   {text:"略听便罢",effects:{int:+1}}]},

 {id:"ev_inspect",cat:"民生",role:"peasant",weight:2,title:"微服私访",cond:s=>s.nation.year>=1,
  text:"陛下微服出宫，见市井百态、民间疾苦……",
  choices:[
   {text:"体察民情，回宫即颁惠政",effects:{people:+8,treasury:-4,charm:+1}},
   {text:"微访中访得草野遗贤",effects:{people:+3},do:G=>G.grantVoucher()},
   {text:"只当游乐，一笑而过",effects:{health:+2,people:-2}}]},

 /* ——— 经济 ——— */
 {id:"ev_trade",cat:"经济",role:"finance",weight:2,title:"开海通商",cond:s=>s.nation.year>=3,
  text:"海外番商求开市舶，互通有无。开海则财源广进，然恐奸宄混入。",
  choices:[
   {text:"开埠通商，广征关税",effects:{treasury:+14,people:+2,prestige:+2}},
   {text:"重农抑商，闭关自守",effects:{treasury:-4,people:-2,food:+4}}]},

 {id:"ev_palace",cat:"经济",role:"chancellor",weight:1,title:"营建宫室",cond:s=>s.nation.treasury>40,
  text:"陛下，旧宫年久失修，是否大兴土木，营造新宫以彰天威？",
  choices:[
   {text:"营建华美新宫",effects:{treasury:-18,people:-8,prestige:+10}},
   {text:"略加修葺，勿扰民",effects:{people:+6,treasury:-2}},
   {text:"以工代赈营建",effects:{treasury:-10,people:+4,prestige:+4}}]},

 {id:"ev_omen",cat:"个人",role:"eunuch",weight:2,title:"天降异象",cond:s=>s.nation.year>=2,
  text:"钦天监奏：荧惑守心，天有异象，主大凶。当下罪己诏以安天心。",
  choices:[
   {text:"下罪己诏，自省其身",effects:{people:+8,prestige:-2}},
   {text:"大赦天下消灾",effects:{people:+6,treasury:-4}},
   {text:"无稽之谈，照常理政",effects:{people:-4,politics:+1}}]}
];

/* ===================================================================
   大事件 BIG_EVENTS —— 多段连锁、撼动国运。
   weight 低、有 cond 触发；big:true 触发特殊横幅样式。
   连锁靠 choice.do 里 G.showCard(下一段卡) 实现（与战报同机制）。
   =================================================================== */
const BIG_EVENTS = [
 /* —— 太师逼宫（权臣政变·三选枝，可亡国/可翻盘）—— */
 {id:"big_coup",cat:"大事件",role:"chancellor",weight:1,big:true,
  cond:s=>s.nation.year>=2 && s.ministers.some(m=>m.post==="chancellor"&&m.ambition>52),
  title:"太师逼宫",
  text:s=>{const c=s.ministers.find(m=>m.post==="chancellor");return `惊变！丞相${c?c.name:"权臣"}久蓄异志，今率百官伏阙，甲士环立殿外，逼陛下"垂拱而治、还政于相"——刀光剑影，社稷悬于一线！`;},
  choices:[
   {text:"调禁军强硬镇压",cond:s=>s.nation.military>=30,do:G=>{
     const win=R.chance(42+G.s.emperor.martial/4);
     const c=G.s.ministers.find(m=>m.post==="chancellor");
     if(win){
       G.applyEffects({prestige:+12,people:-4,military:-8});
       if(c){const i=G.s.ministers.indexOf(c); G.s.ministers.splice(i,1); if(c.portrait&&!G.s.blacklist.includes(c.portrait))G.s.blacklist.push(c.portrait);}
       G.showCard({title:"逼宫平定",role:"general",text:"禁军及时入卫，乱党猝不及防，太师党羽尽数伏诛，朝局重归一统。",
         choices:[{text:"论功行赏，整肃朝纲",do:g=>g.shiftAllLoyalty(+4)}]});
     }else{
       G.applyEffects({military:-15,prestige:-6});
       G.showCard({title:"兵变失控",role:"general",text:"不料禁军竟被太师收买反水，挟百官围紧宫城，喊杀震天……",
         choices:[
          {text:"血战突围，召勤王军",cond:s=>s.emperor.martial>=58,do:g=>{g.applyEffects({prestige:+8,military:-10,health:-15}); g.toast("陛下浴血突围，惊险脱困，誓师讨逆！");}},
          {text:"退位让贤（亡国）",do:g=>g.gameOver("usurped")}]});
     }}},
   {text:"密召大将军勤王",cond:s=>s.ministers.some(m=>m.post==="marshal"&&m.loyalty>=60),do:G=>{
     const m=G.s.ministers.find(x=>x.post==="marshal"); const mm=m?m.mil:25;
     const win=R.chance(55+mm/4);
     const c=G.s.ministers.find(x=>x.post==="chancellor");
     if(win){
       G.applyEffects({prestige:+10,military:-5});
       if(c){const i=G.s.ministers.indexOf(c); G.s.ministers.splice(i,1); if(c.portrait&&!G.s.blacklist.includes(c.portrait))G.s.blacklist.push(c.portrait);}
       G.showCard({title:"勤王成功",role:"general",text:`${m?m.name:"大将军"}星夜提兵入卫，里应外合，一举擒贼！`,
         choices:[{text:"重赏勤王之臣",do:g=>{if(m)m.loyalty=R.clamp(m.loyalty+6);}}]});
     }else{
       G.applyEffects({prestige:-6,military:-10});
       G.showCard({title:"勤王迟矣",role:"general",text:"援军阻于关隘，宫门已破，回天乏术……",
         choices:[{text:"（大势已去）",do:g=>g.gameOver("usurped")}]});
     }}},
   {text:"妥协让权，封其为相国",do:G=>{
     G.applyEffects({prestige:-14,people:-4});
     const c=G.s.ministers.find(m=>m.post==="chancellor");
     if(c){c.ambition=R.clamp(c.ambition+18); c.loyalty=R.clamp(c.loyalty-10);}
     G.toast("权柄旁落，太师势焰熏天，朝政尽出其门。");}}]},

 /* —— 民变燎原（剿/抚/罪己，剿失败可亡国）—— */
 {id:"big_rebellion",cat:"大事件",role:"general",weight:1,big:true,
  cond:s=>s.nation.year>=2 && s.nation.people<46,
  title:"民变燎原",
  text:"八百里加急！连岁苛敛，饥民揭竿，旬日聚众十万，连陷州县，烽烟燎原，直逼京畿！",
  choices:[
   {text:"遣大军血腥镇压",cond:s=>s.nation.military>=30,do:G=>{
     const win=R.chance(52);
     if(win){G.applyEffects({military:-12,people:-10,prestige:+4}); G.showCard({title:"暂平民乱",role:"general",text:"义军主力被剿，然伏尸遍野，血流成河，民心愈寒。",choices:[{text:"善后抚恤",do:g=>g.applyEffects({treasury:-6,people:+4})}]});}
     else{G.applyEffects({military:-20,people:-12,land:-6}); G.showCard({title:"剿而复炽",role:"general",text:"官军屡剿屡败，乱众愈聚愈多，半壁江山糜烂……",
       choices:[
        {text:"被迫迁都南幸",do:g=>g.applyEffects({prestige:-10,treasury:-10,land:-4})},
        {text:"社稷崩塌（亡国）",cond:s=>s.nation.people<16,do:g=>g.gameOver("min_revolt")}]});}}},
   {text:"开仓赈济，下诏招安",do:G=>{
     if(G.s.nation.treasury<10){G.toast("国库空虚，赈济不济，乱势难遏！"); G.applyEffects({people:-6}); return;}
     G.applyEffects({treasury:-16,people:+16,prestige:-2}); G.toast("开仓放粮、赦其胁从，流民渐散归田。");}},
   {text:"下罪己诏，严惩贪官以谢天下",do:G=>{
     G.applyEffects({people:+12,prestige:-4}); G.shiftAllLoyalty(-4); G.toast("罪己诏下，连斩数名巨贪，民愤稍平。");}}]},

 /* —— 列国会盟（倾国之战·亲征/遣将/纵横，决战二段）—— */
 {id:"big_invasion",cat:"大事件",role:"general",weight:1,big:true,
  cond:s=>s.nation.year>=3,
  title:"列国会盟",
  text:s=>`社稷存亡之秋！${R.pick(ENEMIES)}纠合${R.pick(ENEMIES)}诸部歃血会盟，倾国之兵数十万压境，旌旗蔽野，存亡系于一役！`,
  choices:[
   {text:"御驾亲征，背水一战",cond:s=>s.emperor.martial>=45,do:G=>{
     const mm=(()=>{const m=G.s.ministers.find(x=>x.post==="marshal");return m?m.mil:0;})();
     const power=G.s.emperor.martial + G.s.nation.military*0.5 + mm*0.5;
     const win=(power+R.i(-18,30))>=92;
     if(win){G.applyEffects({prestige:+22,land:+10,military:-14,people:+8}); G.showCard({title:"封狼居胥",role:"general",text:"陛下亲冒矢石，三军用命，鏖战三日，敌酋授首！开疆拓土，威加海内！",choices:[{text:"勒石纪功",do:()=>{}}]});}
     else{G.applyEffects({military:-25,land:-12,people:-10,prestige:-8}); G.showCard({title:"亲征大败",role:"general",text:"中军被冲散，王师溃于阵前，陛下仅以身免……",
       choices:[
        {text:"退守京畿，再图后举",do:g=>g.applyEffects({treasury:-10})},
        {text:"乱军之中身中流矢",cond:s=>s.nation.military<14,do:g=>g.emperorDies("battle")}]});}}},
   {text:"遣大将军倾国御敌",cond:s=>s.ministers.some(m=>m.post==="marshal"),do:G=>{
     const m=G.s.ministers.find(x=>x.post==="marshal"); const mm=m?m.mil:25;
     const win=R.chance(44+mm/3);
     if(win){G.applyEffects({prestige:+14,land:+6,military:-16}); if(m)m.loyalty=R.clamp(m.loyalty+6); G.showCard({title:"力挽狂澜",role:"general",text:`${m?m.name:"大将军"}用兵如神，诱敌深入，大破联军于国门之外！`,choices:[{text:"凯旋郊迎",do:()=>{}}]});}
     else{G.applyEffects({military:-22,land:-14,people:-8}); G.showCard({title:"丧师失地",role:"general",text:"大将军兵败被围，连失数州，告急文书雪片般飞来……",choices:[{text:"忍辱割地求和",do:g=>g.applyEffects({treasury:-14,prestige:-10})}]});}}},
   {text:"倾国库金帛，纵横捭阖以离间",do:G=>{
     if(G.s.nation.treasury<25){G.toast("国库不足以行此策！"); return;}
     const ok=R.chance(52+G.s.emperor.politics/5);
     if(ok){G.applyEffects({treasury:-25,prestige:+4}); G.toast("重金离间，盟约土崩，联军内讧自溃！");}
     else{G.applyEffects({treasury:-25,military:-10,people:-4}); G.toast("离间不成，反遭轻慢，敌势愈炽。");}}}]},

 /* —— 夺嫡之争（立长/择贤/放任，放任可丧子）—— */
 {id:"big_heir",cat:"大事件",role:"prince",weight:1,big:true,
  cond:s=>s.children.filter(c=>c.gender==="男"&&c.age>=15).length>=2,
  title:"夺嫡之争",
  text:"国本动摇！诸皇子渐长，各结党羽、明争暗斗，朝臣亦分立门户，京师暗流汹涌。",
  choices:[
   {text:"早立长子，以绝纷争",do:G=>{
     const sons=G.s.children.filter(c=>c.gender==="男").sort((a,b)=>b.age-a.age);
     if(sons[0]){G.s.children.forEach(c=>c.isHeir=false); sons[0].isHeir=true; G.applyEffects({prestige:+6}); G.toast(`立长子 ${sons[0].name} 为太子，国本既定。`);}}},
   {text:"考校才德，择贤而立",do:G=>{
     const sons=G.s.children.filter(c=>c.gender==="男"&&c.age>=15).sort((a,b)=>(b.int+b.politics)-(a.int+a.politics));
     const best=sons[0]; if(best){G.s.children.forEach(c=>c.isHeir=false); best.isHeir=true;}
     G.applyEffects({prestige:+4,politics:+2}); G.shiftAllLoyalty(-2);
     G.showCard({title:"择贤之议",role:"prince",text:`众望所归，立 ${best?best.name:"皇子"} 为储。然落选诸子心怀怨望，各府门可罗雀又暗藏杀机……`,
       choices:[
        {text:"厚赏安抚诸王",do:g=>g.applyEffects({treasury:-8,prestige:+2})},
        {text:"削藩夺权，以绝后患",do:g=>{g.applyEffects({prestige:+4}); g.shiftAllLoyalty(-3);}}]});}},
   {text:"放任相争，坐观其变",do:G=>{
     G.applyEffects({prestige:-8}); G.shiftAllLoyalty(-4);
     const sons=G.s.children.filter(c=>c.gender==="男");
     if(R.chance(45) && sons.length>=2){
       const victim=R.pick(sons); const i=G.s.children.indexOf(victim); G.s.children.splice(i,1);
       G.showCard({title:"骨肉相残",role:"prince",text:`夺嫡终酿惨祸——皇子 ${victim.name} 离奇暴毙于府邸，宫闱腥风血雨。`,choices:[{text:"痛而无言",do:()=>{}}]});
     }else{G.toast("诸子相争不休，朝纲日紊，国势暗损。");}}}]},

 /* —— 荧惑守心（祥瑞/天怒分支）—— */
 {id:"big_omen",cat:"大事件",role:"eunuch",weight:1,big:true,cond:s=>s.nation.year>=2,
  title:"荧惑守心",
  text:"钦天监夜观天象，惊见荧惑守心——史载主天子失德、社稷有变；亦或，是改天换命之兆？满朝惶惶。",
  choices:[
   {text:"斋戒祈禳，虔诚罪己",do:G=>{
     const ok=R.chance(58);
     if(ok){G.applyEffects({people:+12,prestige:+6,health:+4}); G.showCard({title:"天心感格",role:"eunuch",text:"七日斋戒，诚意上达，异象消弭，旋即甘霖普降、五谷丰登，万民称颂圣德！",choices:[{text:"敬天法祖",do:()=>{}}]});}
     else{G.applyEffects({people:-6}); G.toast("禳之不应，流言四起，人心惶惶。");}}},
   {text:"广施仁政，大赦天下",do:G=>{G.applyEffects({treasury:-12,people:+14,prestige:+4}); G.toast("大赦天下，蠲免逋赋，与民更始。");}},
   {text:"斥为妖言，诛钦天监",do:G=>{
     G.applyEffects({people:-10,prestige:-4}); G.shiftAllLoyalty(-3);
     if(R.chance(35)){G.showCard({title:"天怒示警",role:"eunuch",text:"翌日京师地动山摇，宫室倾颓、火光冲天，举国震恐，皆言天谴！",choices:[{text:"惶恐补救",do:g=>g.applyEffects({treasury:-10,people:+4})}]});}}}]}
];
EVENTS.push(...BIG_EVENTS);
