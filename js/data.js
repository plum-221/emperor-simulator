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
  quest:_i('<path d="M6 3h9l3 3v15H6z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/><path d="M15 3v3h3"/>'),
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
/* 武器强化（P10 批3）：耗碎片提升兵器加成。等级 0..MAX，每级 +FORGE_STEP，耗费随级递增。 */
const FORGE_STEP = 3, FORGE_MAX = 5, FORGE_BASE = 4;        // 加成步长 / 上限 / 基础碎片
function forgeCost(lv){ return FORGE_BASE + lv*2; }         // lv0→4 · lv1→6 … lv4→12

/* ---------- 武将羁绊（P10 批3·阵容协同）----------
   按朝堂「组合」触发被动加成（玩家可经招贤/任命/铸兵主动凑齐），
   不依赖随机姓名。其中「神兵在握」即兵器谱·套装效果。月结算统一在 Game.applyBonds。 */
const BONDS = [
  {id:"b_wenwu", name:"出将入相", icon:"⚖", desc:"文官、武将各 ≥3 人在朝 → 国库 +2 · 兵力 +2 /月",
    cond:s=>s.ministers.filter(m=>m.kind==="civil").length>=3 && s.ministers.filter(m=>m.kind==="martial").length>=3},
  {id:"b_zhong", name:"群贤毕至", icon:"✦", desc:"朝臣 ≥8 人 → 民心 +1 · 招贤点 +1 /月",
    cond:s=>s.ministers.length>=8},
  {id:"b_elite", name:"众星拱月", icon:"★", desc:"≥2 位 ★★★ 重臣在朝 → 威望 +2 /月",
    cond:s=>s.ministers.filter(m=>(m.tier||"low")==="high").length>=2},
  {id:"b_loyal", name:"上下同心", icon:"❤", desc:"全体朝臣忠诚 ≥70 → 百官野心 −2 · 招贤点 +1 /月",
    cond:s=>s.ministers.length>0 && s.ministers.every(m=>m.loyalty>=70)},
  {id:"b_arms",  name:"神兵在握", icon:"⚔", desc:"≥3 位将相佩兵器（兵器谱·套装）→ 兵力 +1 · 威望 +1 /月",
    cond:s=>s.ministers.filter(m=>m.weapon).length>=3}
];

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
/* 星级分档数值区间：主属性(本行当)/副属性。星越高，roll 范围越高。
   开局全 1★(low)→寒微随机；强者靠招贤抽卡(mid/high)获得。 */
const TIER_STATS = {
  low:  {main:[28,52], off:[8,30]},
  mid:  {main:[52,72], off:[20,46]},
  high: {main:[72,92], off:[38,62]}
};
const _statRange = t => TIER_STATS[t] || TIER_STATS.mid;

/* ---------- 原创人名生成（架空王朝·不用历史人名）----------
   manifest 里随附的姓名多为真实历史人物（孔门弟子等），用在架空背景里出戏；
   故角色姓名一律由本生成器现造：复/单姓 + 1~2 字名。全局去重，立绘仍取自 manifest。 */
const SURNAMES = ("慕容 司马 上官 独孤 宇文 长孙 欧阳 南宫 西门 东方 端木 皇甫 尉迟 令狐 钟离 闻人 公冶 轩辕 赫连 澹台 仲孙 百里 东郭 "
 +"萧 沈 苏 陆 顾 裴 卫 崔 卢 柳 江 温 薛 霍 岑 桓 殷 阮 厉 戚 商 蓝 燕 元 楚 卓 凌 简 计 步 邵").trim().split(/\s+/).filter(x=>/[一-龥]/.test(x));
const GIVEN_CHARS = "珩玦翊彧瑀瑒旸砚琰珏璟琤珝晔暠勖劭頔翯勍彣斐然朗逸尘骁烬戈彻钺霆烈毅锐承钧泽宸曜澈渊昭瑞弘睿晟煜熙凛肃恪慎诫衡谦"
  .split("").filter(x=>/[一-龥]/.test(x));
const _usedNames = new Set();
function makeOfficialName(){
  for(let i=0;i<80;i++){
    const sur=R.pick(SURNAMES);
    const len=R.chance(62)?2:1;                         // 多数双字名
    let given=R.pick(GIVEN_CHARS); if(len===2){ let c2=R.pick(GIVEN_CHARS); if(c2!==given) given+=c2; }
    const full=sur+given;
    if(!_usedNames.has(full)){ _usedNames.add(full); return full; }
  }
  const fb=R.pick(SURNAMES)+R.pick(GIVEN_CHARS)+(_usedNames.size); _usedNames.add(fb); return fb;
}

function buildMinisters(list, n, tier){
  const sel = R.shuffle(list).slice(0,n); const rg=_statRange(tier||"mid");
  return sel.map((m,idx)=>({
    id:"min"+idx+"_"+Date.now()%9999+idx,
    name:makeOfficialName(), portrait:m.file,
    civ:R.i(rg.main[0],rg.main[1]), mil:R.i(rg.off[0],rg.off[1]),
    loyalty:R.i(55,88), ambition:R.i(5,45),
    personality:R.pick(PERS_KEYS),
    post:null, age:R.i(28,60), reward:0,
    tier:tier||"mid", kind:"civil", weapon:null, level:1, exp:0
  }));
}
function buildGenerals(list, n, tier){
  const sel = R.shuffle(list).slice(0,n); const rg=_statRange(tier||"mid");
  return sel.map((m,idx)=>({
    id:"gen"+idx+"_"+Date.now()%9999+idx,
    name:makeOfficialName(), portrait:m.file,
    civ:R.i(rg.off[0],rg.off[1]), mil:R.i(rg.main[0],rg.main[1]),
    loyalty:R.i(55,90), ambition:R.i(10,55),
    personality:R.pick(PERS_KEYS),
    post:null, age:R.i(30,58), reward:0,
    tier:tier||"mid", kind:"martial", weapon:null, level:1, exp:0
  }));
}

/* ---------- 帝王天赋树（P10 批3·养成）---------- */
const TALENTS = [
 {id:"t_diligence",branch:"文治",name:"宵衣旰食",desc:"勤政所得国库 +50%。",cost:1,req:null},
 {id:"t_finance",  branch:"文治",name:"理财有道",desc:"每月税入额外 +2。",cost:1,req:"t_diligence"},
 {id:"t_drill",    branch:"武功",name:"治军严明",desc:"兵员月损耗减半。",cost:1,req:null},
 {id:"t_strategy", branch:"武功",name:"运筹帷幄",desc:"战阵战力 +8。",cost:1,req:"t_drill"},
 {id:"t_benevol",  branch:"仁德",name:"仁泽万民",desc:"民心自然回落减半。",cost:1,req:null},
 {id:"t_charm",    branch:"仁德",name:"风流天子",desc:"攻略心动收益 +40%。",cost:1,req:"t_benevol"}
];
const TALENT_BRANCHES=["文治","武功","仁德"];
function talentById(id){ return TALENTS.find(t=>t.id===id); }
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
   后宫攻略系统（P9·galgame）——开局 0 妃，逐位解锁攻略入宫
   出身分五等；每位有前置解锁 + 偏好属性 woo + 三幕剧情(心动25/55/85) + 入宫特质。
   =================================================================== */
const ORIGINS = {
  maid:   {name:"宫女",  color:"#8fae6a"},
  common: {name:"良家",  color:"#6ca9e0"},
  noble:  {name:"官家女",color:"#e0b24a"},
  martial:{name:"将门",  color:"#c0563a"},
  rare:   {name:"仙逸",  color:"#c08fe0"}
};
const WOO_NAME = {charm:"魅力", int:"才情", martial:"英气"};
const _PC = "assets/portraits/consorts/";   // 立绘目录
/* ★ 后宫 12 妃·全原创角色（架空王朝·无历史人名）。
   traitKey 为内部 effect 键（applyConsortTraits 据此结算），保持不动；
   姓名 / 特质名 / 解锁文案 / 三幕剧情皆为本游戏原创。立绘沿用 manifest 图。 */
const CONSORTS = [
 {id:"hongfu", name:"苏蘅", portrait:_PC+"c_011.jpg", origin:"maid", woo:"charm", beauty:84, joinRank:0,
  traitKey:"huiyan", trait:{name:"慧眼识珠",desc:"独具识人之明，每月为君添招贤点 +1。"},
  unlock:{desc:"开局即可结识（掌名册的掖庭女史，过目成诵）", cond:()=>true},
  scenes:[
   {at:25,title:"掖庭抄检",text:"掌百官名册的女史苏蘅，仅凭只言片语便能道出某官贤愚高下，分毫不差。你立于廊下听了半晌，暗暗称奇。",
    choices:[{text:"近前赞其识见",eff:{charm:+1}},{text:"佯作不闻，静观其能",eff:{}}]},
   {at:55,title:"荐贤一语",text:"你为一桩任命踌躇不决，苏蘅从旁一语中的；所荐之人到任，果然称职。她浅笑：「识人如识字，看的是骨，不是面。」",
    choices:[{text:"倚为参详，言听计从",eff:{prestige:+2}},{text:"试其心志，问以天下",eff:{int:+1}}]},
   {at:85,title:"知遇之许",text:"苏蘅本是罪臣之后、没入掖庭，你不究其出身、唯重其才。今夜她盈盈下拜：愿为君识尽天下英才，不负这一段知遇……",join:true,
    choices:[{text:"纳为答应，引为知己",eff:{}}]}]},

 {id:"luofu", name:"阮陌桑", portrait:_PC+"c_018.jpg", origin:"common", woo:"int", beauty:82, joinRank:1,
  traitKey:"mulberry", trait:{name:"陌上遗芳",desc:"贤淑动乡里，在宫则民心月增 +1。"},
  unlock:{desc:"国祚≥1年（微服城南，桑陌间偶遇贤名远播的农家女）", cond:s=>s.nation.year>=1},
  scenes:[
   {at:25,title:"陌上问桑",text:"微服出郊，见城南采桑女阮陌桑指点农事、调度乡邻，井井有条，老圃少壮无不心服。你看得入了神。",
    choices:[{text:"下马问其姓字",eff:{}},{text:"远观而不渎",eff:{people:+2}}]},
   {at:55,title:"一乡之望",text:"那年蚕事歉收，陌桑倾己之储分与四邻，又传授养蚕新法，全乡赖以度荒——你方知这采桑女有济世之心。",
    choices:[{text:"敬其德行，明媒求之",eff:{prestige:+3}},{text:"赐其乡里，以彰其善",eff:{}}]},
   {at:85,title:"布衣之约",text:"你撤去仪仗、备六礼亲迎，陌桑不慕宫阙之华，唯念你「肯为农桑俯身」之诚，红妆出阁……",join:true,
    choices:[{text:"以礼纳为常在",eff:{people:+2}}]}]},

 {id:"xishi", name:"沄溪", portrait:_PC+"c_010.jpg", origin:"maid", woo:"charm", beauty:97, joinRank:1,
  traitKey:"chenyu", trait:{name:"照水之容",desc:"绝世之容润泽圣心，帝王魅力缓涨。"},
  unlock:{desc:"威望≥50（番邦慕威，进献一名临水照影的绝色女子）", cond:s=>s.nation.prestige>=50},
  scenes:[
   {at:25,title:"临水照影",text:"邻邦慕你威名，进献绝色女子沄溪。初见之日，她临溪照影，水波为之凝滞，游鱼忘游——左右皆失色。",
    choices:[{text:"惊为天人，筑临水之榭",eff:{charm:+1}},{text:"恐为红颜祸水，自戒",eff:{politics:+1}}]},
   {at:55,title:"溪畔劝言",text:"你日日与沄溪相对水榭，乐而忘返。她却敛容相劝：「容色如溪水东流，社稷方是长久。」绝色而有识见。",
    choices:[{text:"纳其谏，宠而不废政",eff:{politics:+1}},{text:"携之泛舟，暂忘忧烦",eff:{health:+1}}]},
   {at:85,title:"溪心定情",text:"沄溪虽出寒微，心如溪水澄澈。今夜她临水抚琴一曲，曲终敛衽：愿照你一世清明，不教这江山蒙尘……",join:true,
    choices:[{text:"纳为常在，相期相守",eff:{}}]}]},

 {id:"wenjun", name:"林夙", portrait:_PC+"c_012.jpg", origin:"common", woo:"int", beauty:85, joinRank:3,
  traitKey:"fengqiu", trait:{name:"当垆理财",desc:"才女主中馈，理财有方，国库月入 +1。"},
  unlock:{desc:"帝王智力≥55（能赏其才，方得这位精擅钱谷的才女青眼）", cond:s=>s.emperor.int>=55},
  scenes:[
   {at:25,title:"琴台遇才",text:"富商之女林夙新寡，慕才而至。席间论及钱谷盐铁之道，她对答如流、算无遗策，满座须眉为之噤声。",
    choices:[{text:"以琴心相挑",eff:{int:+1}},{text:"出一道难题考之",eff:{int:+1}}]},
   {at:55,title:"当垆同甘",text:"林夙不顾父阻、连夜相奔，甚而当垆理账、亲操井臼，不以贫贱为耻——此女有同甘共苦之志。",
    choices:[{text:"敬其决绝，许以白首",eff:{}},{text:"赐金以全其家",eff:{treasury:-4}}]},
   {at:85,title:"白首之约",text:"林夙以一纸理财长策相示，愿为你掌内帑、丰府库；又附短笺：「愿得一心人，白头不相离。」是要你许她一世专情……",join:true,
    choices:[{text:"纳为嫔，誓不相负",eff:{}}]}]},

 {id:"hongxian", name:"慕容璇", portrait:_PC+"c_002.jpg", origin:"maid", woo:"martial", beauty:80, joinRank:2,
  traitKey:"hongxian", trait:{name:"夜阑潜锋",desc:"夜行女侠慑奸佞，百官野心月降、谋反难起。"},
  unlock:{desc:"大将军在任（军中举荐一名身负绝艺的青衣婢潜身入宫）", cond:s=>s.ministers.some(m=>m.post==="marshal")},
  scenes:[
   {at:25,title:"青衣藏锋",text:"一名青衣婢女慕容璇，举止矫健异于常人。某夜你见她飞身越脊、瞬息往返，落地无声——竟是身负绝艺的女侠。",
    choices:[{text:"识破而不点破",eff:{}},{text:"延入内廷，以礼相询",eff:{}}]},
   {at:55,title:"夜阑潜锋",text:"边镇藩帅蓄异志，慕容璇一夜往返三百里，留一柄短匕于其枕畔以示警，不血刃而折其骄横之心。",
    choices:[{text:"重赏其功，倚为腹心",eff:{prestige:+3}},{text:"诫其慎用，护其周全",eff:{}}]},
   {at:85,title:"侠骨之许",text:"慕容璇本欲功成身退、飘然江湖，却为你「以天下为己任」之志所留。她收剑入鞘，垂首道：愿留君侧，为你守这万里河山……",join:true,
    choices:[{text:"纳为贵人，倚为干城",eff:{}}]}]},

 {id:"liju", name:"温宛", portrait:_PC+"c_005.jpg", origin:"common", woo:"charm", beauty:83, joinRank:2,
  traitKey:"jieyu", trait:{name:"解语花",desc:"善解人意，六宫情绪月稳 +1。"},
  unlock:{desc:"国库≥50（盛世采选良家，温宛以贤名入选）", cond:s=>s.nation.treasury>=50},
  scenes:[
   {at:25,title:"丽人入选",text:"采选良家，有女温宛者，姿容婉丽、应对从容，不矜不伐，独得众女中一份难得的娴雅。",
    choices:[{text:"嘉其端庄，留备六宫",eff:{}},{text:"试其才识，问以诗书",eff:{int:+1}}]},
   {at:55,title:"解语之能",text:"宫中偶有龃龉口角，温宛总能两边宽解、化戾气为祥和，宫人皆称她一声「解语花」——六宫赖以安宁。",
    choices:[{text:"委以协理六宫之责",eff:{}},{text:"赏赐有加，以彰其德",eff:{treasury:-3}}]},
   {at:85,title:"岁岁安宁",text:"温宛无倾国之色，却有持家之能。她为你打理后宫井井有条，今夜执一盏灯，候你归来……",join:true,
    choices:[{text:"纳为贵人，托以中馈",eff:{}}]}]},

 {id:"wenji", name:"谢清婳", portrait:_PC+"c_007.jpg", origin:"noble", woo:"int", beauty:86, joinRank:4,
  requirePost:"chancellor",
  traitKey:"wenji", trait:{name:"兰台秘藏",desc:"博学多才，常侍御书，帝王智力缓涨、国库月入 +1。"},
  unlock:{desc:"任丞相满朝＋帝王智≥50＋国祚≥2（书香门第，父执居相位方堪匹配）",
    cond:s=>s.ministers.some(m=>m.post==="chancellor")&&s.emperor.int>=50&&s.nation.year>=2},
  scenes:[
   {at:25,title:"隔帘琴音",text:"当朝大儒之女谢清婳，博学辩才、妙于音律。隔帘抚琴，一弦忽断，她不闻而知断的是第几弦——你惊为奇才。",
    choices:[{text:"叹服其慧，延以论学",eff:{int:+1}},{text:"命其续补散佚之典",eff:{int:+1}}]},
   {at:55,title:"兰台论典",text:"清婳历览群书，为你校雠散佚典籍、参详文治之道，每有所献皆切中肯綮。你读罢动容——此女胸中有家国。",
    choices:[{text:"当众褒扬其才情",eff:{prestige:-1,int:+1}},{text:"私下相邀夜话",eff:{health:-1,int:+1}}]},
   {at:85,title:"国士之许",text:"你以国士之礼相待，清婳感你惜才如金，终许身相从，愿为你整典籍、佐文治、相守白首……",join:true,
    choices:[{text:"纳为妃，引为文胆",eff:{int:+2}}]}]},

 {id:"mulan", name:"燕霜", portrait:_PC+"c_003.jpg", origin:"martial", woo:"martial", beauty:81, joinRank:3,
  traitKey:"mulan", trait:{name:"巾帼知兵",desc:"巾帼知兵，亲历行伍，在宫则兵力月增 +1。"},
  unlock:{desc:"打赢一场战争（军功册上，一员『男装』小将竟是女儿身）", cond:s=>!!(s.flags&&s.flags.warWon)},
  scenes:[
   {at:25,title:"军中蹊跷",text:"大胜之后论功，一员屡立战功的小将入觐——你却觉其眉目清秀、声细如丝，举止间似有蹊跷。",
    choices:[{text:"不动声色，暗加留意",eff:{}},{text:"屏退左右，温言相询",eff:{}}]},
   {at:55,title:"巾帼现身",text:"真相大白：她乃代父从军十二载的燕霜。卸去戎装、对镜理鬓，飒爽之中现出娇容，满座皆惊。",
    choices:[{text:"赦其欺君，嘉其至孝",eff:{prestige:+3}},{text:"惜其忠勇，留侍御前",eff:{military:+2}}]},
   {at:85,title:"巾帼之约",text:"燕霜本欲解甲归田、奉养双亲，你许她「忠孝两全、荣养还乡」之愿。她行一个端正的军礼，又含羞垂首……",join:true,
    choices:[{text:"纳为嫔，赐还乡荣养双亲",eff:{}}]}]},

 {id:"gongsun", name:"凌霄", portrait:_PC+"c_000.jpg", origin:"martial", woo:"martial", beauty:80, joinRank:2,
  traitKey:"jianqi", trait:{name:"剑器通玄",desc:"剑舞通武理，常陪君演武，帝王武力缓涨。"},
  unlock:{desc:"帝王武力≥55（演武之余，慕剑器大家之名召之入宫）", cond:s=>s.emperor.martial>=55},
  scenes:[
   {at:25,title:"剑器惊鸿",text:"教坊第一人凌霄舞剑器，一舞而四座色沮，矫如群帝骖龙、来如雷霆收震怒——你看得心神俱往。",
    choices:[{text:"亲下场与之论剑",eff:{martial:+1}},{text:"赐金帛，请其授艺",eff:{treasury:-3}}]},
   {at:55,title:"对舞通玄",text:"你常与凌霄对舞切磋，她剑走轻灵、你力贯长虹，一刚一柔，相得益彰。习剑既久，你武艺大进。",
    choices:[{text:"引为剑友，惺惺相惜",eff:{martial:+1}},{text:"以国手之礼遇之",eff:{prestige:+1}}]},
   {at:85,title:"剑胆之许",text:"凌霄豪爽不拘，与你既是剑友、又生情愫。她一剑封鞘、行一个江湖礼：往后，护你左右，与你并辔看这天下……",join:true,
    choices:[{text:"纳为贵人，并辔同游",eff:{}}]}]},

 {id:"furen", name:"安韶华", portrait:_PC+"c_004.jpg", origin:"noble", woo:"charm", beauty:95, joinRank:4,
  traitKey:"qingguo", trait:{name:"倾城之姿",desc:"绝色摄魂，帝王魅力大涨；然红颜易老、其宠月有起落。"},
  unlock:{desc:"威望≥45＋已纳≥1妃（乐官于殿前歌『一顾倾城』，荐其妹入宫）",
    cond:s=>s.nation.prestige>=45&&s.consorts.length>=1},
  scenes:[
   {at:25,title:"一顾倾城",text:"乐官于殿前歌：『北方有佳人，一顾倾人城，再顾倾人国。』你问世间果有此人，他垂首：臣有一妹，名安韶华……",
    choices:[{text:"叹『安得如此佳人』",eff:{charm:+1}},{text:"召其妹一见究竟",eff:{}}]},
   {at:55,title:"满殿生辉",text:"安韶华入觐，回眸一顾，满殿为之生辉，果真倾城之色。你自此朝思暮想，几废寝食——左右暗暗忧心。",
    choices:[{text:"专宠无度，朝夕相伴",eff:{health:-1,charm:+1}},{text:"自警节制，宠之有节",eff:{politics:+1}}]},
   {at:85,title:"倾城之恋",text:"韶华体弱而慧，深谙『以色事人者，色衰而爱弛』，从不以容自恃，反劝你勤勉朝政。今夜她浅笑相邀……",join:true,
    choices:[{text:"纳为妃，珍之重之",eff:{}}]}]},

 {id:"shouyang", name:"宇文蕴", portrait:_PC+"c_006.jpg", origin:"noble", woo:"charm", beauty:90, joinRank:5,
  traitKey:"meihua", trait:{name:"凤仪天成",desc:"金枝玉叶，母仪有度，在宫则威望月增 +1、帝王魅力缓涨。"},
  unlock:{desc:"威望≥60＋国祚≥3（前朝嫡公主下嫁，以固盟好、彰天家气象）",
    cond:s=>s.nation.prestige>=60&&s.nation.year>=3},
  scenes:[
   {at:25,title:"金枝下嫁",text:"前朝嫡公主宇文蕴下嫁以固两国盟好。金枝玉叶，举止雍容，立于丹墀之上，自有一段天家风范。",
    choices:[{text:"赞其天生丽质",eff:{charm:+1}},{text:"敬其身份，以礼相待",eff:{prestige:+1}}]},
   {at:55,title:"凤仪有度",text:"宇文蕴通晓礼乐典章，每为你参详宫廷仪轨、外邦觐见之仪，进退有度，颇助天朝威仪。",
    choices:[{text:"委以掌内廷礼仪",eff:{prestige:+2}},{text:"携之同御万邦来朝",eff:{prestige:+2}}]},
   {at:85,title:"凤仪之选",text:"公主出身高贵却不骄矜，与你日久情生。两家盟好、天作之合，群臣皆贺。今奉册宝，迎其入主东宫……",join:true,
    choices:[{text:"纳为贵妃，以彰国体",eff:{prestige:+3}}]}]},

 {id:"nongyu", name:"云栖梧", portrait:_PC+"c_001.jpg", origin:"rare", woo:"int", beauty:93, joinRank:5,
  traitKey:"xiao", trait:{name:"鸾箫和鸣",desc:"仙姿玉质，箫引祥瑞，在宫则国家六维月各受微益。"},
  unlock:{desc:"国祚≥5＋威望≥70（盛世祥瑞，方外仙眷慕治世清明而来）",
    cond:s=>s.nation.year>=5&&s.nation.prestige>=70},
  scenes:[
   {at:25,title:"凤楼闻箫",text:"夜阑人静，宫阙之上忽闻箫声清越、响遏行云。你循声而往，见一女子吹紫玉箫，云栖梧，仿若不食人间烟火。",
    choices:[{text:"屏息静听，不忍惊扰",eff:{int:+1}},{text:"以礼相邀，问其来历",eff:{}}]},
   {at:55,title:"鸾箫和鸣",text:"你习箫与之相和，一吹一应，竟引来彩凤翔集庭中、百鸟和鸣——左右皆称太平祥瑞、圣德所感。",
    choices:[{text:"筑高台以待仙眷",eff:{treasury:-4,prestige:+2}},{text:"敬天惜福，谦冲自牧",eff:{prestige:+2}}]},
   {at:85,title:"乘鸾之约",text:"云栖梧本是方外仙眷，为你治世清明、苍生安乐所动，愿弃仙缘、留驻人间。今夕箫声为媒，结此良缘……",join:true,
    choices:[{text:"纳为贵妃，珍若拱璧",eff:{prestige:+3}}]}]}
];
function consortTpl(id){ return CONSORTS.find(c=>c.id===id); }
/* 从模板生成已入宫妃子对象 */
function makeConsort(tpl){
  return {
    id:"con_"+tpl.id, tplId:tpl.id, name:tpl.name, portrait:tpl.portrait,
    beauty:tpl.beauty||R.i(70,95), personality:R.pick(PERS_KEYS),
    favor:32, bond:22, rank:tpl.joinRank||0, pregnant:null, age:R.i(16,24),
    origin:tpl.origin, traitKey:tpl.traitKey, traitName:tpl.trait?tpl.trait.name:""
  };
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
   {text:"无稽之谈，照常理政",effects:{people:-4,politics:+1}}]},

 /* ——— 批2 新增事件：节庆 / 奇人 / 秘闻 / 祥瑞 / 灾异 / 江湖 / 民生 ——— */
 {id:"ev_lantern",cat:"节庆",role:"eunuch",weight:2,phase:"eve",title:"上元灯会",cond:s=>s.nation.month===1,
  text:"正月十五，京城张灯结彩，万人空巷。陛下可与民同乐，亦可借机微服察访民情。",
  choices:[
   {text:"登楼与民同乐，普天同庆",effects:{people:+8,prestige:+4,charm:+1}},
   {text:"大办灯会，彰显国力",effects:{treasury:-10,people:+6,prestige:+6}},
   {text:"一切从简，体恤民力",effects:{people:+4,treasury:+2}}]},

 {id:"ev_autumn",cat:"节庆",role:"general",weight:2,phase:"noon",title:"中秋秋狝",cond:s=>s.nation.month>=8&&s.nation.month<=9,
  text:"金风送爽，正宜行秋狝大典，校阅三军、震慑四夷。",
  choices:[
   {text:"亲率王师校猎演武",effects:{military:+6,prestige:+4,martial:+2,health:-1}},
   {text:"犒赏三军，与将士同乐",effects:{treasury:-8,military:+8},do:G=>G.shiftAllLoyalty&&G.shiftAllLoyalty(+3)},
   {text:"国事繁冗，免此一年",effects:{politics:+1,people:-2}}]},

 {id:"ev_swordsman",cat:"江湖",role:"general",weight:2,title:"剑客投帖",cond:s=>s.nation.year>=1,
  text:"一身负绝艺的江湖剑客求见，自荐入宫充任侍卫，然其来历不明、桀骜不驯。",
  choices:[
   {text:"试其身手，收为大内侍卫",effects:{military:+4,prestige:+2},do:G=>{if(G.s.emperor)G.s.emperor.health=R.clamp(G.s.emperor.health+2);}},
   {text:"赐金礼送，敬而远之",effects:{treasury:-4,prestige:+1}},
   {text:"疑为刺客，乱棒打出",effects:{people:-2,prestige:-1}}]},

 {id:"ev_merchant",cat:"经济",role:"finance",weight:2,title:"豪商进献",cond:s=>s.nation.year>=1,
  text:"江南首富沈氏求见，愿献白银百万助国用，只求一纸皇商特许、免税通商之恩。",
  choices:[
   {text:"准其所请，纳财通商",effects:{treasury:+18,people:-4,prestige:-2}},
   {text:"纳财而不予特权",effects:{treasury:+10}},
   {text:"重农抑商，叱退之",effects:{people:+4,treasury:-2,politics:+1}}]},

 {id:"ev_monk",cat:"奇人",role:"eunuch",weight:1,title:"高僧论道",cond:s=>s.nation.year>=2,
  text:"终南山高僧云游至京，请与陛下论佛理治道。听之或可明心见性。",
  choices:[
   {text:"虚心请教，参悟治道",effects:{int:+2,politics:+2,health:+2}},
   {text:"大兴佛寺，广结善缘",effects:{treasury:-12,people:+8,prestige:+2}},
   {text:"敬鬼神而远之",effects:{politics:+1}}]},

 {id:"ev_painting",cat:"秘闻",role:"chancellor",weight:1,title:"前朝遗宝",cond:s=>s.nation.year>=2,
  text:"内库清点，惊见前朝失传名画《千里江山图》，价值连城。然有臣谏言：玩物易丧志。",
  choices:[
   {text:"悬于御书房，朝夕揣摩",effects:{int:+2,charm:+1,prestige:+2}},
   {text:"拍卖充盈国库",effects:{treasury:+14,prestige:-2}},
   {text:"赏赐功臣，以彰恩宠",effects:{},do:G=>G.shiftAllLoyalty&&G.shiftAllLoyalty(+5)}]},

 {id:"ev_drought",cat:"灾害",role:"finance",weight:2,title:"赤地千里",cond:s=>s.nation.year>=2,
  text:"连月不雨，禾稼枯焦，井泉皆竭，灾民载道。",
  choices:[
   {text:"开仓赈济，掘井引渠",effects:{treasury:-12,food:-6,people:+12}},
   {text:"祈雨斋戒，减膳撤乐",effects:{people:+6,prestige:+2,health:-1}},
   {text:"催征如故，不恤民艰",effects:{people:-14,treasury:+6}}]},

 {id:"ev_qilin",cat:"祥瑞",role:"eunuch",weight:1,title:"麒麟现世",cond:s=>s.nation.prestige>=55,
  text:"地方奏报：祥瑞麒麟现于郊野，万民称颂，皆言陛下圣德感天！",
  choices:[
   {text:"昭告天下，大赦四海",effects:{people:+10,prestige:+8,treasury:-6}},
   {text:"勒石纪瑞，载入史册",effects:{prestige:+6,int:+1}},
   {text:"恐为臣下谄媚，淡然处之",effects:{politics:+2,people:+2}}]},

 {id:"ev_orphan",cat:"民生",role:"censor",weight:2,title:"街头弃儿",cond:s=>s.nation.year>=1,
  text:"微服途中见路有冻饿弃儿，啼哭无依，路人侧目。",
  choices:[
   {text:"敕建慈幼局，收养孤贫",effects:{treasury:-8,people:+10,prestige:+2}},
   {text:"携回宫中亲自抚养",effects:{people:+5,charm:+1}},
   {text:"叹息而过，无可奈何",effects:{people:-4,health:-1}}]},

 {id:"ev_poet",cat:"奇人",role:"chancellor",weight:1,title:"狂士题诗",cond:s=>s.nation.year>=1,
  text:"一落第狂生于酒肆题反诗讥讽朝政，传遍京城，有司请旨严办。",
  choices:[
   {text:"不以言罪人，反召其入仕",effects:{people:+8,prestige:+4,int:+1}},
   {text:"一笑置之，焚诗了事",effects:{people:+4}},
   {text:"以大不敬论罪，下狱问斩",effects:{people:-10,prestige:-2},do:G=>G.shiftAllLoyalty&&G.shiftAllLoyalty(-3)}]},

 {id:"ev_horse",cat:"外交",role:"envoy",weight:2,title:"西域贡马",cond:s=>s.nation.year>=2,
  text:"西域使团进献汗血宝马千匹，神骏非凡，正可充实军备。",
  choices:[
   {text:"厚赐使团，纳为军马",effects:{treasury:-8,military:+10,prestige:+2}},
   {text:"挑选良驹，余者市易",effects:{military:+5,treasury:+4}},
   {text:"婉拒以示不慕奇货",effects:{prestige:+4,people:+2}}]},

 {id:"ev_flood2",cat:"灾害",role:"finance",weight:2,title:"江南水患",cond:s=>s.nation.year>=2,
  text:"梅雨成灾，江南圩田尽没，漕运中断，米价腾贵。",
  choices:[
   {text:"截留漕粮就地赈济",effects:{food:-8,people:+12,treasury:-4}},
   {text:"遣能臣督修水利",effects:{treasury:-12,people:+8,food:+4}},
   {text:"听之任之，灾后再议",effects:{people:-12,food:-4}}]},

 {id:"ev_assassin",cat:"危机",role:"eunuch",weight:1,title:"夜半行刺",cond:s=>s.nation.year>=3&&s.nation.prestige<50,
  text:"深夜，黑衣刺客潜入寝宫，刀光直逼御榻！侍卫闻声赶至，缠斗正酣。",
  choices:[
   {text:"临危不乱，亲手格杀",cond:s=>s.emperor.martial>=50,effects:{martial:+3,prestige:+8,health:-4}},
   {text:"急呼侍卫，仓皇避走",effects:{prestige:-4,health:-2}},
   {text:"生擒之，深查幕后主使",effects:{health:-2},do:G=>G.shiftAllLoyalty&&G.shiftAllLoyalty(-2)}]},

 {id:"ev_eclipse",cat:"祥瑞",role:"eunuch",weight:1,title:"日食示警",cond:s=>s.nation.year>=2,
  text:"白昼天狗食日，京师晦暗，百姓惊惶击鼓救日。钦天监奏请修省。",
  choices:[
   {text:"避正殿、减常膳以应天谴",effects:{people:+6,prestige:+2,health:-1}},
   {text:"颁修省诏，求直言极谏",effects:{people:+4,politics:+2},do:G=>G.shiftAllLoyalty&&G.shiftAllLoyalty(+2)},
   {text:"晓谕百姓此乃天象常理",effects:{int:+2,people:-2}}]}
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

/* ===================================================================
   微服探险（P10 批2·roguelike）——「微服私访」行动触发一连串随机遭遇。
   每次随机抽 3 桩，逐桩抉择、累积得失，归来结算。
   =================================================================== */
const INSPECT_ENCOUNTERS = [
 {title:"市井赌坊",role:"peasant",text:"行至闹市，见一赌坊人声鼎沸，有泼皮强拉良民豪赌、放印子钱盘剥。",
  choices:[
   {text:"亮出身份，查封赌坊",eff:{people:+6,treasury:+4}},
   {text:"暗记其名，回宫严办",eff:{people:+4,politics:+1}},
   {text:"佯装赌客，小试身手",eff:{treasury:+3,health:-1}}]},
 {title:"茶肆听政",role:"peasant",text:"茶肆中，几位老者正高谈阔论，臧否时政、针砭朝廷得失，浑然不知天子在侧。",
  choices:[
   {text:"虚心倾听，引以为鉴",eff:{politics:+2,people:+3}},
   {text:"上前与之辩驳一番",eff:{int:+2,charm:+1}},
   {text:"赏茶钱，含笑而去",eff:{people:+4,charm:+1}}]},
 {title:"义士相救",role:"general",text:"忽遇恶霸纵马伤人，一布衣少年挺身格斗、护住老幼，身手不凡。",
  choices:[
   {text:"赞其义勇，许以从军",eff:{military:+4,prestige:+2}},
   {text:"赐金疗伤，记其姓名",eff:{treasury:-3,people:+4}},
   {text:"暗中护持，不动声色",eff:{prestige:+2}}]},
 {title:"荒村求医",role:"censor",text:"行经荒村，见一家老小染疫卧床，无钱延医，奄奄一息。",
  choices:[
   {text:"解囊赐药，遣御医往治",eff:{treasury:-5,people:+8,charm:+1}},
   {text:"敕令地方设义诊局",eff:{treasury:-8,people:+10}},
   {text:"心有不忍，留银而去",eff:{treasury:-3,people:+4}}]},
 {title:"古寺奇遇",role:"eunuch",text:"破败古寺中，一老僧似早知圣驾将至，奉上一卷无字天书，言『有缘自见』。",
  choices:[
   {text:"虚心参悟，若有所得",eff:{int:+3,politics:+1}},
   {text:"重修古寺，以谢机缘",eff:{treasury:-8,people:+6,prestige:+2}},
   {text:"一笑收下，权当趣谈",eff:{charm:+1}}]},
 {title:"才女卖画",role:"chancellor",text:"桥头一清丽女子卖画自给，笔意清绝，题诗孤高，引得文人围观叹赏。",
  choices:[
   {text:"高价购其全画",eff:{treasury:-4,charm:+1,int:+1}},
   {text:"题字相赠，传为佳话",eff:{prestige:+3,charm:+1}},
   {text:"叹其遭际，赐银周济",eff:{treasury:-3,people:+3}}]},
 {title:"漕工罢役",role:"finance",text:"运河码头，漕工因克扣工钱聚众罢役，监工与之对峙，眼看激成民变。",
  choices:[
   {text:"当场补发工钱，严惩贪吏",eff:{treasury:-6,people:+8}},
   {text:"好言安抚，许以整改",eff:{people:+4,politics:+1}},
   {text:"调兵弹压，强令复工",eff:{people:-8,military:-2}}]},
 {title:"猎户献宝",role:"general",text:"深山猎户献上一张罕见白虎皮，并诉说山中虎患、村民惶惶。",
  choices:[
   {text:"纳其献，遣兵除虎患",eff:{military:-3,people:+8,prestige:+2}},
   {text:"赏猎户，命其引兵围猎",eff:{treasury:-3,martial:+2,people:+4}},
   {text:"婉拒虎皮，只解民忧",eff:{people:+6}}]},
 {title:"孩童遮道",role:"peasant",text:"一群顽童嬉戏遮道，认不出天颜，反围着你索要糖人、拉你同玩。",
  choices:[
   {text:"童心未泯，与之同乐",eff:{health:+3,charm:+2,people:+2}},
   {text:"买糖分赠，皆大欢喜",eff:{treasury:-2,people:+4,charm:+1}},
   {text:"威严不可犯，命人驱散",eff:{people:-3}}]},
 {title:"冤民拦驾",role:"censor",text:"忽有老妪拦路喊冤，状告县令草菅人命、屈杀其子，血书在手、声泪俱下。",
  choices:[
   {text:"亲准其状，钦差彻查",eff:{people:+8,prestige:+2},note:"严"},
   {text:"暗访属实再办，免打草惊蛇",eff:{people:+4,politics:+2}},
   {text:"民妇刁状，斥退了事",eff:{people:-10,prestige:-2}}]}
];
