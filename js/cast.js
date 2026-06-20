/* ===================================================================
   cast.js —— 固定人物名册（作者撰写的恒定班底）
   取代「每局随机生成百官」：16 位文武各有恒定身份/性情/背景故事/关系网。
   立绘仍取自 manifest 既有图。后宫 12 妃在 data.js 的 CONSORTS 另册。
   关系网刻意织成两大阵营 + 墙头草 + 世仇，供密谍司(B)探查暗线。
   依赖全局：R(随机工具，仅 makeFromCast 不用)、PERSONALITIES。
   =================================================================== */

/* 关系类型：显示用（图标 + 色 + 联动倾向，机制联动在后续阶段接入） */
const RELTYPE = {
  亲族:{ico:"亲",cls:"r-kin",  desc:"血亲连心"},
  师徒:{ico:"师",cls:"r-mentor",desc:"师门情谊"},
  姻亲:{ico:"姻",cls:"r-marry",desc:"姻娅之好"},
  盟友:{ico:"盟",cls:"r-ally", desc:"声气相通"},
  同党:{ico:"党",cls:"r-cabal",desc:"朋比为奸"},
  政敌:{ico:"敌",cls:"r-rival",desc:"庙堂相争"},
  世仇:{ico:"仇",cls:"r-feud", desc:"势不两立"}
};

/* 固定名册。base 数值落在 TIER_STATS 区间内（恒定，不随机）。
   rel.to = 对方 castId；cond(s) 为登场前置，无 cond 即随时可由招贤揭示。
   start=true 者开局即在朝。 */
const ROSTER = [
  /* ============ 文官 8 ============ */
  { id:"c_chancellor", name:"澹台衡", title:"丞相", kind:"civil", tier:"high",
    portrait:"assets/portraits/ministers/m_002.jpg", personality:"谨慎",
    base:{civ:88, mil:45, loyalty:90, ambition:12, age:58}, prefPost:"chancellor",
    unlock:{desc:"国祚≥2 或 威望≥45（贤相择主而仕）", cond:s=>s.nation.year>=2||s.nation.prestige>=45},
    story:"三朝元老，历相二帝。清慎自持，门无私谒，朝野谓之「冰台」。视澹台门生欧阳彻如己出，与度支卫缭水火不容——一清一浊，庙堂两端。",
    rel:[{to:"c_censor",type:"师徒",note:"亲传弟子"},{to:"c_finance",type:"政敌",note:"清浊之争"}] },

  { id:"c_finance", name:"卫缭", title:"度支尚书", kind:"civil", tier:"high",
    portrait:"assets/portraits/ministers/m_011.jpg", personality:"贪婪",
    base:{civ:85, mil:40, loyalty:60, ambition:70, age:50}, prefPost:"finance",
    unlock:{desc:"威望≥30（理财能臣闻风来投）", cond:s=>s.nation.prestige>=30},
    story:"理财圣手，能于无米之炊中变出粮饷，故圣眷不衰。然私囊日丰，暗结大将军赫连勃、攀附国舅皇甫缙，庙堂之下别有沟壑。丞相澹台衡屡欲去之而不得。",
    rel:[{to:"c_chancellor",type:"政敌",note:"清浊之争"},{to:"m_marshal",type:"同党",note:"文武勾连"},{to:"c_kin",type:"盟友",note:"互为奥援"}] },

  { id:"c_censor", name:"欧阳彻", title:"御史大夫", kind:"civil", tier:"mid",
    portrait:"assets/portraits/ministers/m_023.jpg", personality:"刚直",
    base:{civ:68, mil:30, loyalty:85, ambition:15, age:44}, prefPost:"censor",
    unlock:{desc:"威望≥35（铁面御史慕清明而至）", cond:s=>s.nation.prestige>=35},
    story:"铁面御史，弹劾不避权贵，朝臣见之侧目。出澹台衡门下，又亲授谏议南宫澈，清流一脉赖以不坠。最恨卫缭、皇甫缙之流，常思与密谍司里应外合，澄清玉宇。",
    rel:[{to:"c_chancellor",type:"师徒",note:"受业恩师"},{to:"c_remonstrant",type:"师徒",note:"亲传弟子"}] },

  { id:"c_scholar", name:"司徒昭", title:"翰林学士", kind:"civil", tier:"mid",
    portrait:"assets/portraits/ministers/m_034.jpg", personality:"忠厚",
    base:{civ:65, mil:22, loyalty:82, ambition:18, age:40}, prefPost:null,
    unlock:{desc:"帝王智≥50（文治可亲贤）", cond:s=>s.emperor.int>=50},
    story:"文坛宗匠，掌制诰、修国史，下笔成章。性敦厚不党，唯与欧阳彻气味相投，常以诗文相和。乱世则隐，治世则出。",
    rel:[{to:"c_censor",type:"盟友",note:"文章知己"}] },

  { id:"c_personnel", name:"裴蕴", title:"吏部侍郎", kind:"civil", tier:"mid",
    portrait:"assets/portraits/ministers/m_047.jpg", personality:"圆滑",
    base:{civ:60, mil:28, loyalty:65, ambition:40, age:46}, prefPost:null, start:true,
    story:"掌铨选人事，八面玲珑，谁势大便附谁。清流浊党皆与之周旋而不深交，宦海浮沉二十年，竟未尝一败——亦未尝一立。",
    rel:[] },

  { id:"c_spymaster", name:"乐祈", title:"内侍省·密谍提督", kind:"civil", tier:"mid",
    portrait:"assets/portraits/ministers/m_058.jpg", personality:"谨慎",
    base:{civ:62, mil:35, loyalty:88, ambition:20, age:48}, prefPost:null,
    unlock:{desc:"招贤可得（密谍司之首）", cond:null},
    story:"幼年净身入宫，半生潜行于帷幕之后。耳目遍布朝野坊间，百官私语难逃其闻。无党无私，只忠于御座一人——故权臣畏之、清流敬之。掌密谍司则群邪无所遁形。",
    rel:[{to:"m_guard",type:"盟友",note:"内外相济"}] },

  { id:"c_kin", name:"皇甫缙", title:"光禄勋·国舅", kind:"civil", tier:"mid",
    portrait:"assets/portraits/ministers/m_066.jpg", personality:"贪婪",
    base:{civ:58, mil:42, loyalty:62, ambition:55, age:45}, prefPost:null,
    unlock:{desc:"已纳≥1妃（椒房之亲方显）", cond:s=>s.consorts.length>=1},
    story:"椒房之亲，以外戚骤贵。恃宠骄横，广置田宅，与度支卫缭沆瀣一气。其荣辱系于宫中亲眷一身——亲眷见废，则失所恃。",
    rel:[{to:"c_finance",type:"盟友",note:"互为奥援"}] },

  { id:"c_remonstrant", name:"南宫澈", title:"谏议大夫", kind:"civil", tier:"low",
    portrait:"assets/portraits/ministers/m_071.jpg", personality:"刚直",
    base:{civ:48, mil:20, loyalty:80, ambition:22, age:29}, prefPost:null, start:true,
    story:"新科状元，锐气逼人，初登朝便犯颜直谏。师事御史欧阳彻，以澄清天下自任。少不更事，然一片赤心可鉴。",
    rel:[{to:"c_censor",type:"师徒",note:"受业恩师"}] },

  /* ============ 武将 8 ============ */
  { id:"m_marshal", name:"赫连勃", title:"大将军", kind:"martial", tier:"high",
    portrait:"assets/portraits/generals/g_000.jpg", personality:"奸诈",
    base:{mil:90, civ:42, loyalty:58, ambition:72, age:52}, prefPost:"marshal",
    unlock:{desc:"威望≥45 或 国祚≥2（名将归于强主）", cond:s=>s.nation.prestige>=45||s.nation.year>=2},
    story:"军功盖世，总揽天下兵符，麾下骄兵悍将唯其马首是瞻。久蓄异志，内结度支卫缭以济粮饷、外联虎贲宇文泰为羽翼，朝堂之下俨然一国。独忌骠骑慕容垂之忠勇，恨不能除之。",
    rel:[{to:"c_finance",type:"同党",note:"文武勾连"},{to:"m_piaoqi",type:"世仇",note:"忠奸不并"},{to:"m_huben",type:"盟友",note:"爪牙之助"}] },

  { id:"m_piaoqi", name:"慕容垂", title:"骠骑将军", kind:"martial", tier:"high",
    portrait:"assets/portraits/generals/g_001.jpg", personality:"刚直",
    base:{mil:85, civ:40, loyalty:86, ambition:20, age:49}, prefPost:null,
    unlock:{desc:"打赢一场战争（忠魂方归）", cond:s=>s.flags&&s.flags.warWon},
    story:"百战忠魂，守土不移，士卒乐为之死。性刚不容奸，与大将军赫连勃势如冰炭——一柄悬在权臣头上的剑。若得重用，社稷无虞；若遭弃，则栋折榱崩。",
    rel:[{to:"m_marshal",type:"世仇",note:"忠奸不并"}] },

  { id:"m_zhenbei", name:"独孤信", title:"镇北将军", kind:"martial", tier:"mid",
    portrait:"assets/portraits/generals/g_002.jpg", personality:"忠厚",
    base:{mil:70, civ:30, loyalty:84, ambition:16, age:47}, prefPost:null, start:true,
    story:"镇守北疆十载，胡马不敢南牧。待士如子，麾下先锋尉迟胜乃其一手提拔。朴讷少言，唯知食君之禄、忠君之事。",
    rel:[{to:"m_vanguard",type:"师徒",note:"提携之恩"}] },

  { id:"m_vanguard", name:"尉迟胜", title:"先锋校尉", kind:"martial", tier:"low",
    portrait:"assets/portraits/generals/g_003.jpg", personality:"刚直",
    base:{mil:50, civ:18, loyalty:78, ambition:24, age:26}, prefPost:null, start:true,
    story:"独孤信帐下骁将，年少气盛，临阵一往无前。视独孤信如父，他人莫能动其志。璞玉未琢，假以时日必成大器。",
    rel:[{to:"m_zhenbei",type:"师徒",note:"恩同再造"}] },

  { id:"m_huben", name:"宇文泰", title:"虎贲中郎将", kind:"martial", tier:"mid",
    portrait:"assets/portraits/generals/g_000.jpg", personality:"贪婪",
    base:{mil:68, civ:32, loyalty:55, ambition:58, age:43}, prefPost:null,
    unlock:{desc:"招贤可得", cond:null},
    story:"拥兵自重，私通边市以渔利，军纪废弛。依附大将军赫连勃为奥援，沆瀣相济。利之所在，刀锋所向——通敌叛国，亦未必不为。",
    rel:[{to:"m_marshal",type:"盟友",note:"附骥之翼"}] },

  { id:"m_guard", name:"长孙晟", title:"羽林中郎将", kind:"martial", tier:"mid",
    portrait:"assets/portraits/generals/g_001.jpg", personality:"谨慎",
    base:{mil:66, civ:38, loyalty:88, ambition:18, age:41}, prefPost:null, start:true,
    story:"掌宫禁宿卫，帝之爪牙。谨守门禁，夜不卸甲。与密谍提督乐祈内外相济，宫闱之安系于二人。社稷有变，每为最后一道屏障。",
    rel:[{to:"c_spymaster",type:"盟友",note:"内外相济"}] },

  { id:"m_navy", name:"令狐熙", title:"水师都督", kind:"martial", tier:"mid",
    portrait:"assets/portraits/generals/g_002.jpg", personality:"圆滑",
    base:{mil:64, civ:34, loyalty:66, ambition:38, age:45}, prefPost:null,
    unlock:{desc:"招贤可得", cond:null},
    story:"江防宿将，舳舻千里。惯看风色，见势不妙便作壁上观。非奸非忠，唯求自保——朝局清明则效力，朝局浑浊则缩首。",
    rel:[] },

  { id:"m_jinguo", name:"百里燕", title:"巾帼将军", kind:"martial", tier:"mid",
    portrait:"assets/portraits/generals/g_003.jpg", personality:"刚直",
    base:{mil:67, civ:36, loyalty:85, ambition:22, age:33}, prefPost:null,
    unlock:{desc:"招贤可得", cond:null},
    story:"女中豪杰，替父执戟，沙场扬名。性烈如火，眼中不容沙砾，最敬忠勇之士、最恶贪佞之徒。一身肝胆，照人寒胆。",
    rel:[] }
];

/* 稀有度 5 级（白绿蓝橙红·从低到高）——边框/星数体现人物分量，胜过纯星数 */
const RARITY = [
  {r:1, name:"庸",   star:"★",     color:"#cfcfc4", glow:"rgba(190,190,176,.0)"},  // 白
  {r:2, name:"良",   star:"★★",    color:"#6fc46f", glow:"rgba(90,180,90,.35)"},   // 绿
  {r:3, name:"上",   star:"★★★",   color:"#5a9fe0", glow:"rgba(74,143,214,.45)"},  // 蓝
  {r:4, name:"杰",   star:"★★★★",  color:"#e8943a", glow:"rgba(224,140,50,.6)"},   // 橙
  {r:5, name:"绝世", star:"★★★★★", color:"#e0443a", glow:"rgba(224,60,50,.7)"}     // 红
];
/* 16 人稀有度定级（按文武分量/全局地位） */
const RARITY_OF = {
  c_chancellor:5, m_marshal:5,                       // 红·绝世：丞相、大将军 两根擎天柱
  c_finance:4, m_piaoqi:4, c_censor:4,               // 橙·杰：度支、骠骑、御史
  m_zhenbei:3, m_guard:3, c_scholar:3, c_spymaster:3,// 蓝·上：镇北、羽林、翰林、密谍提督
  c_personnel:2, c_kin:2, m_huben:2, m_navy:2, m_jinguo:2, // 绿·良
  c_remonstrant:1, m_vanguard:1                      // 白·庸：新进谏议、先锋
};
/* 取人物稀有度（旧随机臣无 rarity → 按 tier 退化） */
function rarityOf(m){
  let r = m && m.rarity;
  if(!r){ const t=m&&m.tier; r = t==="high"?5 : t==="mid"?3 : 1; }
  return RARITY[Math.max(1,Math.min(5,r))-1];
}

/* 人物 → 固有官职（官职即身份，一人一职·登朝自动就位） */
const POST_OF = {
  c_chancellor:"chancellor", c_finance:"finance", c_censor:"censor", c_scholar:"academy",
  c_personnel:"personnel", c_spymaster:"spymaster", c_kin:"steward", c_remonstrant:"remonstrant",
  m_marshal:"marshal", m_piaoqi:"piaoqi", m_zhenbei:"defense", m_vanguard:"vanguard",
  m_huben:"huben", m_guard:"guard", m_navy:"navy", m_jinguo:"valkyrie"
};

const _castIndex = {}; ROSTER.forEach(c=>_castIndex[c.id]=c);
function castById(id){ return _castIndex[id]||null; }
function castName(id){ const c=_castIndex[id]; return c?c.name:"（未知）"; }

/* 把名册条目实例化为游戏内 minister 对象（恒定数值，零随机）。
   保留既有字段形状 + 附 castId/title/story/rel。 */
function makeFromCast(c){
  return {
    id:c.id, castId:c.id, name:c.name, title:c.title||"", portrait:c.portrait,
    civ:c.base.civ, mil:c.base.mil, loyalty:c.base.loyalty, ambition:c.base.ambition,
    personality:c.personality, post:POST_OF[c.id]||null, age:c.base.age, reward:0,   // 登朝即就其固有官职
    rarity:RARITY_OF[c.id]||3,
    tier:c.tier, kind:c.kind, weapon:null, level:1, exp:0,
    story:c.story, rel:c.rel||[]
  };
}

/* 开局在朝的班底（实例化数组） */
function startingCast(){ return ROSTER.filter(c=>c.start).map(makeFromCast); }

/* 招贤可揭示的名册成员：未在朝、未流放、前置满足 */
function recruitablePool(s){
  const inCourt = new Set((s.ministers||[]).map(m=>m.castId||m.id));
  const exiled  = new Set(s.exiled||[]);
  return ROSTER.filter(c=>!c.start && !inCourt.has(c.id) && !exiled.has(c.id)
    && (!c.unlock || !c.unlock.cond || c.unlock.cond(s)));
}

if(typeof globalThis!=="undefined"){
  globalThis.ROSTER=ROSTER; globalThis.RELTYPE=RELTYPE; globalThis.RARITY=RARITY; globalThis.rarityOf=rarityOf;
  globalThis.castById=castById; globalThis.castName=castName;
  globalThis.makeFromCast=makeFromCast; globalThis.startingCast=startingCast;
  globalThis.recruitablePool=recruitablePool;
}
