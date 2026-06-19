/* ===================================================================
   events.js —— 剧情数据库
   - SPEAKERS : 角色显示名（对应 ART.portrait 的 role）
   - ENDINGS  : 结局图鉴（含四维触底/爆表 + 剧情结局 + 寿终）
   - EVENTS   : 事件卡（含分支链 next / 标记 set / 条件 cond / 结局 end）

   choice 字段说明：
     text     选项文字
     effects  {people,treasury,military,court} 数值增减
     set      设置剧情标记 {flag:true}
     next     后续事件 id（字符串或数组，会插入队首，形成剧情链）
     end      直接触发结局 id
     cond     该选项的出现条件（可选）
   event 字段说明：
     role/title/text 必填；once 默认 true（演过不再出）；repeat:true 可重复
     cond     出现条件 fn(state)；weight 随机权重（默认1）
   =================================================================== */

const SPEAKERS = {
  emperor:"太上皇", chancellor:"丞相", general:"大将军", finance:"户部尚书",
  censor:"御史大夫", eunuch:"内侍总管", empress:"皇后", consort:"贵妃",
  astrologer:"钦天监", envoy:"番邦使臣", peasant:"乡野百姓", prince:"皇子",
  relative:"国舅", monk:"云游高僧", self:"内心独白"
};

/* ---------- 结局图鉴 ---------- */
const ENDINGS = {
  // 四维触底
  people_low:{seal:"反",title:"官逼民反",desc:"民心丧尽，赤地千里。揭竿者云集响应，义军攻破宫门，王朝在烈火中倾覆。",bad:true},
  treasury_low:{seal:"穷",title:"国库见底",desc:"府库空空如也，官俸断绝、边军哗变。债台高筑的朝廷再也运转不动，江山易主。",bad:true},
  military_low:{seal:"破",title:"国门洞开",desc:"刀枪锈蚀，武备废弛。铁骑长驱直入，京城陷落，社稷化为焦土。",bad:true},
  court_low:{seal:"乱",title:"群臣离心",desc:"百官离散，无人理政。政令出不了宫门，权臣趁乱起兵，把你赶下了龙椅。",bad:true},
  // 四维爆表（失衡同样致命）
  people_high:{seal:"危",title:"功高盖主",desc:"你的声望如日中天，反被野心家挟“民意”裹挟。一场“顺天应人”的兵变，把你架成了傀儡。",bad:true},
  treasury_high:{seal:"奢",title:"骄奢亡国",desc:"金山银海堆满府库，你却沉溺于穷奢极欲，大兴土木。民脂民膏耗尽，盛极而衰。",bad:true},
  military_high:{seal:"篡",title:"黄袍加身",desc:"武将兵权过重，一朝黄袍加身。将军们“被迫”拥立新主，你被尊为太上皇，幽居深宫。",bad:true},
  court_high:{seal:"傀",title:"权臣当道",desc:"相权独大，一手遮天。你成了垂拱而治的牌位，诏书皆出于权臣之手，名存实亡。",bad:true},
  // 寿终（按评分细分）
  age_sage:{seal:"圣",title:"千古一帝",desc:"你在位数十载，文治武功，四海升平。史官提笔，谥你为太宗，庙食千秋，万世传颂。",good:true},
  age_good:{seal:"安",title:"守成明君",desc:"你寿终正寝，传位太子。江山平稳，百姓安乐。后人称你为一代守成之君。",good:true},
  age_mid:{seal:"庸",title:"庸碌一生",desc:"你平淡地度过了帝王生涯，无大功亦无大过。史书上，你只是寥寥一行。",bad:false},
  age_bad:{seal:"昏",title:"昏聩而终",desc:"你荒废朝政，沉湎享乐，临终时国势已颓。史官冷笔，谥你为灵。",bad:true},
  // 剧情专属结局
  usurped:{seal:"篡",title:"权相篡位",desc:"你放任相权坐大，终被丞相一杯鸩酒送上西天。新朝建立，你的名字被从宗庙抹去。",bad:true},
  battle_die:{seal:"烈",title:"马革裹尸",desc:"你御驾亲征，身先士卒，却中流矢而崩于阵前。将士痛哭，却也赢下了那场决定国运的大战。",good:true},
  poison_immortal:{seal:"丹",title:"丹毒攻心",desc:"你痴迷长生，日服金丹。重金属之毒终于发作，你在幻觉中“飞升”，享年不足四十。",bad:true},
  abdicate:{seal:"禅",title:"功成身退",desc:"你主动禅位于贤明太子，归隐山林，含饴弄孙。激流勇退，得享天年，传为美谈。",good:true},
  assassinated:{seal:"刺",title:"血溅宫墙",desc:"你树敌太多，一名死士潜入寝宫，刀光过处，一代帝王猝然崩逝。",bad:true},
  rebellion_win:{seal:"定",title:"力挽狂澜",desc:"叛军围城之际，你亲临城头督战，内外夹击，平定大乱。经此一役，皇权空前稳固。",good:true}
};

/* ---------- 事件库 ---------- */
const EVENTS = {

  /* ===== 开局教学三连 ===== */
  intro_1:{role:"chancellor",title:"登基大典",text:"陛下初登大宝，臣等恭请圣安。如今百废待兴，陛下打算先施恩于民，还是先充盈国库？",
    choices:[
      {text:"减免赋税，与民休息",effects:{people:+10,treasury:-8},next:"intro_2"},
      {text:"加征商税，先富国库",effects:{treasury:+10,people:-8},next:"intro_2"}
    ]},
  intro_2:{role:"general",title:"边关来报",text:"启禀陛下，北境蛮族蠢蠢欲动。是即刻整军备战，还是遣使安抚、暂求太平？",
    choices:[
      {text:"整军练兵，以备不测",effects:{military:+10,treasury:-6}},
      {text:"遣使和谈，岁币换安宁",effects:{military:-4,treasury:-6,people:+4}}
    ]},

  /* ===== 旱灾赈灾链 ===== */
  drought_1:{role:"finance",title:"北方大旱",text:"陛下，北方三州大旱，颗粒无收，灾民已逾数十万，正向京城涌来。",
    choices:[
      {text:"开仓放粮，全力赈灾",effects:{treasury:-16,people:+16},next:"drought_2a"},
      {text:"令地方自行处置",effects:{people:-14,court:-4},next:"drought_2b"},
      {text:"以工代赈，修渠筑路",effects:{treasury:-8,people:+8,court:+4}}
    ]},
  drought_2a:{role:"censor",title:"赈粮被贪",text:"陛下圣明赈灾，然查得地方官中饱私囊，赈粮十去其七！民间已有怨声。",
    choices:[
      {text:"严惩贪官，抄家示众",effects:{people:+10,court:-8,treasury:+6}},
      {text:"念其初犯，从轻发落",effects:{court:+6,people:-10}}
    ]},
  drought_2b:{role:"peasant",title:"流民围城",text:"草民们走投无路，跪在宫门外哭嚎。再不管，怕是要出大乱子了……",
    choices:[
      {text:"此时补发赈济",effects:{treasury:-12,people:+8}},
      {text:"派兵驱散流民",effects:{people:-16,military:-2}}
    ]},

  /* ===== 权臣坐大链（核心剧情） ===== */
  chancellor_1:{role:"eunuch",title:"密报丞相",text:"陛下，奴才斗胆进言：丞相结党营私，门生故吏遍布朝野，恐非社稷之福啊……",weight:1,
    choices:[
      {text:"敲打丞相，削其党羽",effects:{court:-6,people:+4},set:{curb_chancellor:true}},
      {text:"宦官不得干政，杖责之",effects:{court:+8,people:-4},set:{trust_chancellor:true}},
      {text:"暗中调查，按兵不动",effects:{court:+2},next:"chancellor_2"}
    ]},
  chancellor_2:{role:"censor",title:"丞相专权",text:"陛下，丞相近日竟敢驳回御批、私调禁军。再不制止，相权将凌驾君权之上！",cond:s=>!s.flags.curb_chancellor,
    choices:[
      {text:"夺其兵权，贬出京城",effects:{court:-14,military:+4,people:+6},set:{curb_chancellor:true}},
      {text:"隐忍不发，徐徐图之",effects:{court:+10},next:"chancellor_3"}
    ]},
  chancellor_3:{role:"chancellor",title:"相国摄政",text:"老臣以为，陛下春秋正盛，国事繁杂，不若交由老臣代为裁决，陛下静养便是。",cond:s=>s.flags.trust_chancellor||s.stats.court>=72,
    choices:[
      {text:"准奏，万事托付丞相",effects:{court:+20},end:"usurped"},
      {text:"放肆！来人，拿下逆臣！",effects:{court:-20,military:+6,people:+8},set:{curb_chancellor:true}}
    ]},

  /* ===== 北伐战争链 ===== */
  war_1:{role:"general",title:"蛮骑南下",text:"陛下！北蛮十万铁骑破关而入，沿途州县告急！请陛下圣裁！",weight:1,cond:s=>s.year>=2,
    choices:[
      {text:"御驾亲征，鼓舞士气",effects:{military:+6,people:+8},next:"war_emperor"},
      {text:"命大将军领兵迎敌",effects:{military:+4,court:+4},next:"war_general"},
      {text:"坚壁清野，固守待援",effects:{military:-4,people:-6,treasury:-8},next:"war_defend"}
    ]},
  war_emperor:{role:"general",title:"决战在即",text:"陛下亲临前线，三军用命！然敌众我寡，决战凶险万分。陛下可要亲冒矢石？",
    choices:[
      {text:"擂鼓亲征，与士卒共进退",effects:{military:+10,people:+10,court:+6},next:"war_emperor_2"},
      {text:"坐镇中军，遥控指挥",effects:{military:+4,people:-2}}
    ]},
  war_emperor_2:{role:"self",title:"流矢破空",text:"激战正酣，一支冷箭破空射来……（你已赢得军心，但凶险难测）",
    choices:[
      {text:"天命在我！（搏一搏）",effects:{},end:"battle_die",cond:s=>s.stats.military<55},
      {text:"天命在我！（搏一搏）",effects:{military:+12,people:+12,court:+8},cond:s=>s.stats.military>=55}
    ]},
  war_general:{role:"general",title:"将军凯旋",text:"托陛下洪福，末将大破蛮军，斩首三万！然将士伤亡惨重，亟需犒赏。",
    choices:[
      {text:"重赏三军，将军封侯",effects:{treasury:-14,military:+12,court:+6}},
      {text:"国库吃紧，从简犒赏",effects:{military:-8,people:-4,treasury:-2}}
    ]},
  war_defend:{role:"finance",title:"坚壁之困",text:"固守虽稳，然旷日持久，粮饷如流水般耗去。城中已现饥色。",
    choices:[
      {text:"开仓济军民",effects:{treasury:-12,people:+6,military:+4}},
      {text:"催逼地方再筹粮饷",effects:{people:-10,treasury:+8}}
    ]},

  /* ===== 立储夺嫡链 ===== */
  heir_1:{role:"empress",title:"国本之争",text:"陛下，皇子们渐已长成。嫡长子仁厚，三皇子聪敏，立储之事，关乎国本，望陛下早定。",cond:s=>s.year>=5,
    choices:[
      {text:"立嫡长，遵祖制",effects:{court:+8,people:+4},set:{heir:"eldest"}},
      {text:"立贤明的三皇子",effects:{court:-6,people:+6},set:{heir:"third"},next:"heir_2"},
      {text:"诸子尚幼，暂缓再议",effects:{court:-4},next:"heir_dispute"}
    ]},
  heir_2:{role:"chancellor",title:"废长立幼之忧",text:"陛下废长立幼，恐开夺嫡之端。嫡长子党羽不服，朝中已隐隐分作两派。",
    choices:[
      {text:"安抚长子，厚加封赏",effects:{treasury:-8,court:+6}},
      {text:"贬斥长子，以绝后患",effects:{people:-8,court:-6,military:-4}}
    ]},
  heir_dispute:{role:"prince",title:"诸子夺嫡",text:"父皇迟迟不立太子，儿臣们……唉，宫中已是暗流汹涌，连禁军都有人选边站了。",
    choices:[
      {text:"快刀斩乱麻，即刻立储",effects:{court:+6},set:{heir:"eldest"}},
      {text:"继续观望，平衡各方",effects:{court:-8,military:-6}}
    ]},

  /* ===== 宦官专权链 ===== */
  eunuch_1:{role:"eunuch",title:"内侍进言",text:"陛下日理万机，太过操劳。奴才愿为陛下分忧，替陛下批阅些寻常奏章，如何？",cond:s=>s.year>=3,
    choices:[
      {text:"准你协理，朕也省心",effects:{court:-6},set:{eunuch_power:true},next:"eunuch_2"},
      {text:"祖宗家法，宦官不得干政",effects:{court:+6,people:+2}}
    ]},
  eunuch_2:{role:"censor",title:"阉党横行",text:"陛下！内侍总管假传圣旨、卖官鬻爵，朝中正直之士噤若寒蝉。阉党之祸，甚于前朝！",cond:s=>s.flags.eunuch_power,
    choices:[
      {text:"族灭阉党，以正朝纲",effects:{court:+12,people:+10,eunuch_power:false}},
      {text:"内侍乃朕心腹，御史多虑了",effects:{court:-12,people:-10}}
    ]},

  /* ===== 后宫线 ===== */
  harem_1:{role:"consort",title:"贵妃失宠",text:"陛下近日只宠新人，臣妾……臣妾自知人老珠黄。只是六宫之事，还望陛下莫要全凭新人摆布。",cond:s=>s.year>=2,
    choices:[
      {text:"温言宽慰，雨露均沾",effects:{people:+4,court:+2}},
      {text:"独宠新人，不理旧情",effects:{court:-4,people:-4},next:"harem_2"}
    ]},
  harem_2:{role:"empress",title:"后宫倾轧",text:"陛下，新贵恃宠而骄，竟与臣妾这皇后分庭抗礼，宫闱不宁，恐外戚生事。",
    choices:[
      {text:"申饬新贵，重振中宫",effects:{court:+6,people:+2}},
      {text:"和稀泥，谁也不得罪",effects:{court:-6,people:-2}}
    ]},

  /* ===== 外戚线 ===== */
  relative_1:{role:"relative",title:"国舅求官",text:"陛下，老臣是皇后的兄长。犬子才学过人，可否在朝中谋个一官半职，也好为陛下效力嘛。",cond:s=>s.year>=4,
    choices:[
      {text:"看在皇后面上，准了",effects:{court:-6,people:-4},set:{waiqi:true}},
      {text:"科举取士，恕难徇私",effects:{court:+4,people:+6}}
    ]},
  relative_2:{role:"censor",title:"外戚跋扈",text:"陛下，国舅一门骄横不法，强占民田、欺行霸市，京城百姓敢怒不敢言！",cond:s=>s.flags.waiqi,
    choices:[
      {text:"依法严惩，绝不姑息",effects:{people:+10,court:-4}},
      {text:"皇亲国戚，从轻处置",effects:{people:-10,court:+4}}
    ]},

  /* ===== 变法改革线 ===== */
  reform_1:{role:"chancellor",title:"变法图强",text:"陛下，如今积弊已深。臣有一揽新法：均田、清丈、改税。然变法必触动豪强，阻力极大。",cond:s=>s.year>=6,
    choices:[
      {text:"力排众议，推行新法",effects:{court:-10,treasury:+8,people:+6},next:"reform_2"},
      {text:"祖宗成法，不可轻改",effects:{court:+8,treasury:-4}}
    ]},
  reform_2:{role:"censor",title:"新法之争",text:"陛下，新法虽利国，然执行操切，地方扰民。豪强反扑，民间亦有怨言，请陛下慎之。",
    choices:[
      {text:"放缓节奏，循序渐进",effects:{people:+6,treasury:+2,court:+2}},
      {text:"雷霆推进，绝不回头",effects:{treasury:+12,people:-8,court:-8}},
      {text:"全面废止，恢复旧制",effects:{court:+8,treasury:-8,people:-4}}
    ]},

  /* ===== 长生丹药线 ===== */
  immortal_1:{role:"astrologer",title:"献长生方",text:"贫道云游四海，得一炼丹秘方。陛下若日服金丹，可享万寿无疆，与天同寿！",cond:s=>s.age>=40,weight:1,
    choices:[
      {text:"善！速速为朕炼丹",effects:{treasury:-8,people:-2},set:{taking_pills:true},next:"immortal_2"},
      {text:"装神弄鬼，乱棍打出",effects:{people:+4,court:+2}}
    ]},
  immortal_2:{role:"self",title:"丹毒渐深",text:"服丹数月，你时而亢奋时而眩晕，性情大变，常对左右大发雷霆……（金丹含重金属之毒）",cond:s=>s.flags.taking_pills,
    choices:[
      {text:"幡然醒悟，即刻停服",effects:{people:+4,court:+4},set:{taking_pills:false}},
      {text:"加大剂量，朕命由我不由天",effects:{court:-8},end:"poison_immortal"}
    ]},

  /* ===== 瘟疫线 ===== */
  plague_1:{role:"finance",title:"瘟疫横行",text:"陛下，江南爆发大疫，十室九空，恐蔓延至京畿。需即刻决断。",cond:s=>s.year>=3,
    choices:[
      {text:"封城隔离，调拨药材",effects:{treasury:-12,people:+10}},
      {text:"召集名医，编印药方",effects:{treasury:-6,people:+6,court:+4}},
      {text:"听天由命，不予理会",effects:{people:-16}}
    ]},

  /* ===== 外交和亲线 ===== */
  envoy_1:{role:"envoy",title:"番邦求亲",text:"我大汗仰慕天朝上国，愿以骏马千匹为聘，求娶贵国公主，永结秦晋之好。",cond:s=>s.year>=4,
    choices:[
      {text:"准和亲，结两国之好",effects:{military:+6,treasury:+6,people:-4}},
      {text:"天朝公主岂能远嫁蛮夷",effects:{people:+6,military:-6,treasury:-4}},
      {text:"以宗室女册封为公主代嫁",effects:{court:+4,military:+4}}
    ]},

  /* ===== 叛乱线 ===== */
  rebellion_1:{role:"general",title:"藩镇叛乱",text:"陛下！节度使拥兵自重，公然反叛，已聚众十万，直逼京师！",cond:s=>s.year>=8&&s.stats.military<60,weight:1,
    choices:[
      {text:"亲临城头，死守京师",effects:{people:+10,military:+6},next:"rebellion_2"},
      {text:"调集勤王之师围剿",effects:{treasury:-14,military:+8,court:+4}},
      {text:"许以高官，招安叛将",effects:{court:-8,people:-6,military:-4}}
    ]},
  rebellion_2:{role:"self",title:"破釜沉舟",text:"叛军攻城甚急，城内人心惶惶。这一战，赌上的是你的江山与性命。",
    choices:[
      {text:"背水一战！",effects:{},end:"rebellion_win",cond:s=>s.stats.military>=45&&s.stats.people>=45},
      {text:"背水一战！",effects:{military:-10,people:-10,court:-10},cond:s=>s.stats.military<45||s.stats.people<45}
    ]},

  /* ===== 大兴土木线 ===== */
  palace_1:{role:"chancellor",title:"营建宫室",text:"陛下，旧宫年久失修。是否大兴土木，营造新宫，以彰天子威仪？",cond:s=>s.year>=5,
    choices:[
      {text:"营建华美新宫，扬国威",effects:{treasury:-18,people:-8,court:+6}},
      {text:"略加修葺即可，勿扰民",effects:{people:+8,treasury:-2}},
      {text:"以工代赈，雇灾民营造",effects:{treasury:-10,people:+6}}
    ]},

  /* ===== 科举取士线 ===== */
  exam_1:{role:"censor",title:"科场舞弊",text:"陛下，今科会试惊现舞弊，主考收受贿赂，泄露考题，天下士子哗然！",cond:s=>s.year>=3,
    choices:[
      {text:"彻查到底，主考问斩",effects:{people:+10,court:-4}},
      {text:"重开恩科，安抚士子",effects:{treasury:-6,people:+8,court:+2}},
      {text:"大事化小，息事宁人",effects:{people:-10,court:+4}}
    ]},

  /* ===== 可重复的日常小事件（保证长局不重样） ===== */
  daily_flood:{role:"finance",title:"黄河决堤",text:"陛下，黄河又一次决口，下游良田尽淹。治河乃无底之洞，然不治则民不聊生。",repeat:true,weight:2,cond:s=>s.year>=2,
    choices:[
      {text:"拨巨款修堤治河",effects:{treasury:-12,people:+10}},
      {text:"暂筑土堰，敷衍了事",effects:{people:-8,treasury:-2}}
    ]},
  daily_locust:{role:"peasant",title:"蝗灾蔽日",text:"陛下，蝗虫过境，遮天蔽日，禾苗一夜尽毁。乡民跪求朝廷开恩。",repeat:true,weight:2,cond:s=>s.year>=2,
    choices:[
      {text:"减免灾区赋税",effects:{treasury:-8,people:+10}},
      {text:"组织捕蝗，悬赏收购",effects:{treasury:-6,people:+8,court:+2}},
      {text:"祭天祈福，静待天怒平息",effects:{people:-6,court:-2}}
    ]},
  daily_tribute:{role:"envoy",title:"万邦来朝",text:"陛下，岁末藩属国前来朝贡，献上奇珍异宝。依例，天朝当有厚赐回礼。",repeat:true,weight:2,
    choices:[
      {text:"厚往薄来，彰显国威",effects:{treasury:-8,court:+6,military:+2}},
      {text:"对等回礼即可",effects:{treasury:-2,court:+2}},
      {text:"扣下贡品，赏赐从简",effects:{treasury:+8,court:-6}}
    ]},
  daily_omen:{role:"astrologer",title:"天降异象",text:"陛下，昨夜荧惑守心，天有异象，主大凶。臣以为，当下罪己诏以安天心。",repeat:true,weight:2,cond:s=>s.year>=2,
    choices:[
      {text:"下罪己诏，自省其身",effects:{people:+8,court:-2}},
      {text:"无稽之谈，照常理政",effects:{people:-4,court:+4}},
      {text:"大赦天下，以消灾祸",effects:{people:+6,court:-4,treasury:-4}}
    ]},
  daily_corruption:{role:"censor",title:"贪腐成风",text:"陛下，近来吏治松弛，地方官层层盘剥，民怨渐起。请陛下整顿吏治。",repeat:true,weight:2,cond:s=>s.year>=2,
    choices:[
      {text:"严查重惩，杀一儆百",effects:{people:+8,court:-6,treasury:+4}},
      {text:"高薪养廉，徐徐图之",effects:{treasury:-8,court:+6,people:+2}},
      {text:"水至清则无鱼，睁只眼闭只眼",effects:{people:-8,court:+6}}
    ]},
  daily_famine:{role:"peasant",title:"青黄不接",text:"陛下，开春青黄不接，乡间已有饿殍。求朝廷放些常平仓的粮吧！",repeat:true,weight:2,cond:s=>s.year>=2,
    choices:[
      {text:"开常平仓平价放粮",effects:{treasury:-8,people:+10}},
      {text:"劝富户开仓济贫",effects:{court:-4,people:+6}}
    ]},
  daily_border:{role:"general",title:"边境摩擦",text:"陛下，边境小股蛮兵屡屡越境劫掠。是强硬反击，还是隐忍息事？",repeat:true,weight:2,cond:s=>s.year>=2,
    choices:[
      {text:"出兵痛击，扬我军威",effects:{military:+8,treasury:-6,people:+2}},
      {text:"增筑边墙，被动防御",effects:{treasury:-8,military:+4}},
      {text:"花钱消灾，赔款了事",effects:{treasury:-6,military:-4,people:-2}}
    ]},
  daily_festival:{role:"empress",title:"宫廷宴乐",text:"陛下，逢佳节，是否大办宫宴、与民同乐，以示天下太平？",repeat:true,weight:1,
    choices:[
      {text:"大办庆典，普天同庆",effects:{treasury:-8,people:+8,court:+2}},
      {text:"一切从简，节用爱民",effects:{treasury:+4,people:+2,court:-2}}
    ]},
  daily_monk:{role:"monk",title:"高僧化缘",text:"阿弥陀佛。老衲欲建一座万佛寺，普度众生。还望陛下慷慨布施，功德无量。",repeat:true,weight:1,cond:s=>s.year>=3,
    choices:[
      {text:"敕建佛寺，广结善缘",effects:{treasury:-10,people:+8,court:-2}},
      {text:"佛门清净，朕略捐香火",effects:{treasury:-2,people:+2}},
      {text:"沙门蠹国，勒令还俗",effects:{people:-4,treasury:+8,court:+2}}
    ]},
  daily_merchant:{role:"finance",title:"通商之议",text:"陛下，海外番商求开市舶，互通有无。开海则国库丰盈，然亦恐奸宄混入。",repeat:true,weight:1,cond:s=>s.year>=3,
    choices:[
      {text:"开埠通商，征收关税",effects:{treasury:+12,people:+2,court:-2}},
      {text:"重农抑商，闭关自守",effects:{treasury:-4,court:+4,people:-2}}
    ]}
};
