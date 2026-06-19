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

/* 子嗣取名用字 */
const GIVEN_M = "承乾景琰昭珩瑞渊弘睿晟煜钰熙泽宸曜钧澈".split("");
const GIVEN_F = "玥婉宁妧琬瑶昭华婵柔嫣媛清菀绮".split("");

/* ---------- 由 manifest 构建角色 ---------- */
function buildMinisters(list, n){
  const sel = R.shuffle(list).slice(0,n);
  return sel.map((m,idx)=>({
    id:"min"+idx+"_"+Date.now()%9999+idx,
    name:m.name, portrait:m.file,
    civ:R.i(45,95), mil:R.i(10,55),
    loyalty:R.i(55,88), ambition:R.i(5,45),
    personality:R.pick(PERS_KEYS),
    post:null, age:R.i(28,60), reward:0
  }));
}
function buildGenerals(list, n){
  const sel = R.shuffle(list).slice(0,n);
  return sel.map((m,idx)=>({
    id:"gen"+idx+"_"+Date.now()%9999+idx,
    name:m.name, portrait:m.file,
    civ:R.i(20,55), mil:R.i(55,96),
    loyalty:R.i(55,90), ambition:R.i(10,55),
    personality:R.pick(PERS_KEYS),
    post:null, age:R.i(30,58), reward:0
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
   {text:"亲自殿试，广纳贤才",effects:{people:+6,politics:+1},do:G=>G.recruit(3)},
   {text:"循例放榜",effects:{people:+2},do:G=>G.recruit(2)},
   {text:"鬻卖功名以充国库",effects:{treasury:+12,people:-8},do:G=>G.recruit(1)}]},

 {id:"ev_exam_fraud",cat:"政务",role:"censor",weight:1,title:"科场舞弊",cond:s=>s.nation.year>=3,
  text:"陛下，本科会试惊现舞弊，主考收贿泄题，士子哗然！",
  choices:[
   {text:"彻查严办，主考问斩",effects:{people:+10},do:G=>G.shiftAllLoyalty(-3)},
   {text:"重开恩科，安抚士子",effects:{treasury:-6,people:+6}},
   {text:"息事宁人",effects:{people:-10}}]},

 /* ——— 后宫 ——— */
 {id:"ev_harem_jealous",cat:"后宫",role:"consort",weight:2,title:"六宫争宠",cond:s=>s.consorts.length>=2,
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
 {id:"ev_immortal",cat:"个人",role:"eunuch",weight:1,title:"方士献丹",cond:s=>s.emperor.age>=38,
  text:"有方士进献金丹，言服之可延年益寿、长生不老。",
  choices:[
   {text:"日服金丹，求长生",effects:{health:+6},do:G=>{G.s.flags.pills=(G.s.flags.pills||0)+1;}},
   {text:"强身在己，逐其出宫",effects:{health:+2,people:+2}}]},

 {id:"ev_hunt",cat:"个人",role:"general",weight:2,title:"围猎演武",
  text:"秋高马肥，群臣请陛下校猎西苑，既可演武，亦可怡情。",
  choices:[
   {text:"亲挽强弓，校猎演武",effects:{martial:+3,health:+2,prestige:+2}},
   {text:"国事为重，免了",effects:{politics:+1}}]},

 {id:"ev_study",cat:"个人",role:"chancellor",weight:2,title:"经筵讲读",
  text:"翰林学士请陛下御经筵，讲读经史，以资治道。",
  choices:[
   {text:"潜心向学",effects:{int:+3,politics:+2,health:-1}},
   {text:"略听便罢",effects:{int:+1}}]},

 {id:"ev_inspect",cat:"民生",role:"peasant",weight:2,title:"微服私访",cond:s=>s.nation.year>=1,
  text:"陛下微服出宫，见市井百态、民间疾苦……",
  choices:[
   {text:"体察民情，回宫即颁惠政",effects:{people:+8,treasury:-4,charm:+1}},
   {text:"惩治当街恶霸",effects:{people:+6,prestige:+2}},
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
