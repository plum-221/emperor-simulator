/* ===================================================================
   map.js —— 天下 4X 战略层（MapSys · 省份制回合制）
   P1：天下回合 + 军队单位(募/移动/围攻) + 单位制持续战斗 + 攻克夺州
       + 可行动高亮 + 目标进度。自带「结束回合」，独立于按天推进。
   后续：P2 城池产能 / P3 国策科技 / P4 敌国AI / P5 攻城接沙盘战棋。
   依赖全局 Game(R/SFX/UI/toast)。
   =================================================================== */
const MapSys = (() => {
"use strict";

let buildOpen=false;   // 营建·编练菜单是否展开（默认收起·省版面）
function toggleBuild(){ buildOpen=!buildOpen; UI.renderPanel("map"); }

const FACTION_COLOR = {
  self:"#d9b65f", neutral:"#8a8170",
  北狄:"#5b82b8", 西羌:"#b07ac0", 契丹:"#4a9d8e",
  东夷:"#c79a5a", 南诏:"#5aa06a", 突厥:"#c0563a"
};
const TERRAIN_DEF = {关塞:8, 山地:5, 平原:0, 水乡:2, 草原:0};

const REGIONS = [
  {id:"jingji",  name:"京畿", x:300,y:200, owner:"self",    terrain:"关塞", str:18, dev:2, cap:true,
   adj:["zhongyuan","guanzhong","yanyun","qilu"]},
  {id:"zhongyuan",name:"中原",x:300,y:272, owner:"self",    terrain:"平原", str:14, dev:1,
   adj:["jingji","guanzhong","jiangnan","qilu","bashu"]},
  {id:"guanzhong",name:"关中",x:218,y:235, owner:"self",    terrain:"关塞", str:14, dev:1,
   adj:["jingji","zhongyuan","hexi","longyou","bashu","shuofang"]},
  {id:"jiangnan",name:"江南", x:344,y:336, owner:"neutral", terrain:"水乡", str:22, dev:0,
   adj:["zhongyuan","bashu","lingnan","qilu"]},
  {id:"shuofang",name:"朔方", x:243,y:108, owner:"北狄",     terrain:"草原", str:30, dev:0,
   adj:["guanzhong","yanyun","hexi"]},
  {id:"yanyun",  name:"燕云", x:372,y:120, owner:"北狄",     terrain:"关塞", str:34, dev:0,
   adj:["jingji","shuofang","liaodong"]},
  {id:"hexi",    name:"河西", x:138,y:193, owner:"西羌",     terrain:"山地", str:26, dev:0,
   adj:["guanzhong","shuofang","longyou","xiyu"]},
  {id:"longyou", name:"陇右", x:150,y:290, owner:"西羌",     terrain:"山地", str:24, dev:0,
   adj:["guanzhong","hexi","bashu","xiyu"]},
  {id:"bashu",   name:"巴蜀", x:213,y:342, owner:"neutral", terrain:"山地", str:22, dev:0,
   adj:["guanzhong","zhongyuan","jiangnan","longyou","lingnan"]},
  {id:"qilu",    name:"齐鲁", x:412,y:235, owner:"东夷",     terrain:"平原", str:25, dev:0,
   adj:["jingji","zhongyuan","jiangnan","liaodong"]},
  {id:"liaodong",name:"辽东", x:458,y:132, owner:"契丹",     terrain:"草原", str:28, dev:0,
   adj:["yanyun","qilu"]},
  {id:"lingnan", name:"岭南", x:322,y:406, owner:"南诏",     terrain:"水乡", str:20, dev:0,
   adj:["jiangnan","bashu","jiaozhi"]},
  {id:"jiaozhi", name:"交趾", x:250,y:416, owner:"南诏",     terrain:"山地", str:18, dev:0,
   adj:["lingnan"]},
  {id:"xiyu",    name:"西域", x:70, y:235, owner:"突厥",     terrain:"草原", str:24, dev:0,
   adj:["hexi","longyou"]}
];

/* 兵种（build=以城池产能建造所需点数；需 reqTech 则科技解锁） */
const UNIT_TYPES = {
  bu:{key:"bu", name:"步军", icon:"卒", hp:32, atk:13, move:2, build:6},
  qi:{key:"qi", name:"骑军", icon:"骑", hp:26, atk:17, move:3, build:9},
  nu:{key:"nu", name:"弩军", icon:"弩", hp:24, atk:21, move:2, build:11, reqTech:"crossbow"},
  jin:{key:"jin",name:"精锐", icon:"锐", hp:40, atk:24, move:2, build:16, reqTech:"elite"}
};
/* 城池建筑（每州可建·分级·建造耗产能·每回合产出反哺国家或加成） */
const BUILDINGS = {
  farm:    {key:"farm",   name:"农田", icon:"农", max:3, build:5, desc:"每回合产粮"},
  market:  {key:"market", name:"市集", icon:"市", max:3, build:6, desc:"每回合入库"},
  barracks:{key:"barracks",name:"兵营",icon:"营", max:3, build:7, desc:"+产能·解锁强兵"},
  wall:    {key:"wall",   name:"城墙", icon:"城", max:3, build:6, desc:"+守备(被攻更难破)"},
  academy: {key:"academy",name:"书院", icon:"学", max:2, build:8, desc:"每回合+研究点"}
};
/* 国策/科技树（P3·研究点逐回合积累解锁） */
const TECH = {
  drill:    {key:"drill",   name:"勤练精兵", cost:8,  req:[],                    desc:"全军攻击 +3"},
  farming:  {key:"farming", name:"劝课农桑", cost:8,  req:[],                    desc:"农田产粮 +50%"},
  masonry:  {key:"masonry", name:"金城汤池", cost:10, req:[],                    desc:"城墙守备翻倍"},
  crossbow: {key:"crossbow",name:"强弩之术", cost:11, req:["drill"],             desc:"解锁弩军(高攻)"},
  cavalry:  {key:"cavalry", name:"控弦之士", cost:12, req:["drill"],             desc:"骑军机动 +1"},
  commerce: {key:"commerce",name:"通商惠工", cost:10, req:["farming"],           desc:"市集入库 +50%"},
  logistics:{key:"logistics",name:"足食足兵",cost:12, req:["farming"],           desc:"各城产能 +1"},
  academy:  {key:"academy", name:"兴文重教", cost:9,  req:["commerce"],          desc:"每回合 +1 研究点"},
  elite:    {key:"elite",   name:"虎贲之锐", cost:18, req:["crossbow","masonry"],desc:"解锁精锐(最强兵)"},
  unify:    {key:"unify",   name:"大一统论", cost:22, req:["academy","logistics"],desc:"夺州威望翻倍·终极国策"}
};
function techAvailable(k){ const t=TECH[k]; return t.req.every(r=>hasTech(r)); }

/* ---------- 状态 ---------- */
function initCity(r){ if(!r.build) r.build={farm:0,market:0,barracks:0,wall:0,academy:0};
  if(r.store==null) r.store=0; if(!r.queue) r.queue=[]; }
function initState(s){
  if(s.map && s.map.regions && s.map.regions.length){
    if(!s.map.units) s.map.units=[];     // 旧档惰性补
    if(s.map.turn==null) s.map.turn=1;
    if(s.map.seq==null) s.map.seq=0;
    if(!s.map.tech) s.map.tech={done:[],cur:null,pts:0};
    s.map.regions.forEach(r=>{ if(r.garrison==null) r.garrison=(r.owner==="self"?0:r.str||20); if(r.owner==="self") initCity(r); });
    return;
  }
  const regions = REGIONS.map(r=>({
    id:r.id, name:r.name, x:r.x, y:r.y, owner:r.owner,
    faction:(r.owner==="self"||r.owner==="neutral")?null:r.owner,
    terrain:r.terrain, dev:r.dev||0, cap:!!r.cap, adj:r.adj.slice(),
    explored:false, garrison:(r.owner==="self"?0:(r.str+R.i(-2,3)))
  }));
  const byId=id=>regions.find(x=>x.id===id);
  regions.forEach(r=>{ if(r.owner==="self") r.explored=true; });
  regions.forEach(r=>{ if(r.adj.some(id=>{const a=byId(id);return a&&a.owner==="self";})) r.explored=true; });
  regions.forEach(r=>{ if(r.owner==="self") initCity(r); });
  s.map = {regions, units:[], sel:null, selU:null, turn:1, seq:0, tech:{done:[],cur:null,pts:0}};
  // 开局驻军：都城两步一骑
  spawn(s,"jingji","bu"); spawn(s,"jingji","bu"); spawn(s,"jingji","qi");
  spawn(s,"zhongyuan","bu"); spawn(s,"guanzhong","bu");
}
function spawn(s,rid,type){
  const t=UNIT_TYPES[type]; const m=s.map;
  m.units.push({id:"U"+(m.seq++), owner:"self", type, hp:t.hp, maxhp:t.hp, atk:t.atk, move:t.move, movesLeft:t.move, rid});
}
function M(){ return Game.s.map; }
function region(id){ return M().regions.find(r=>r.id===id); }
function unit(id){ return M().units.find(u=>u.id===id); }
function unitsIn(rid,owner){ return M().units.filter(u=>u.rid===rid && (!owner||u.owner===owner)); }
function bordersSelf(r){ return r.adj.some(id=>{const a=region(id);return a&&a.owner==="self";}); }
function counts(){ const rs=M().regions; return {own:rs.filter(r=>r.owner==="self").length, total:rs.length}; }
function defenseOf(r){ const wall=(r.build&&r.build.wall||0)*(hasTech("masonry")?12:6); return Math.round(r.garrison + (TERRAIN_DEF[r.terrain]||0) + r.dev*4 + (r.owner==="self"?wall:0)); }
/* ---------- 城池产能 / 科技（P2/P3）---------- */
function hasTech(k){ const t=M().tech; return t&&t.done.includes(k); }
function prodOf(r){ return 1 + (r.dev||0) + (r.build&&r.build.barracks||0) + (r.cap?1:0) + (hasTech("logistics")?1:0); }
function unitAtkBonus(){ return hasTech("drill")?3:0; }   // 国策·勤练
function moveOf(u){ return UNIT_TYPES[u.type].move + (hasTech("cavalry")&&u.type==="qi"?1:0); }
function startResearch(k){ const m=M(); if(hasTech(k)) return; if(!techAvailable(k)){ Game.toast("前置国策未成"); return; }
  m.tech.cur=k; SFX.pick(); Game.toast(`始研国策《${TECH[k].name}》`); UI.renderPanel("map"); }
function queueUnit(rid,type){
  const r=region(rid), t=UNIT_TYPES[type]; if(!r||r.owner!=="self") return;
  if(t.reqTech && !hasTech(t.reqTech)){ Game.toast(`需先研习国策方可建「${t.name}」`); return; }
  if(r.queue.length>=4){ Game.toast("此城工役已满（队列上限4）"); return; }
  r.queue.push({kind:"unit", key:type, name:t.name, left:t.build, cost:t.build}); SFX.pick();
  Game.toast(`${r.name} 着手编练${t.name}（需产能 ${t.build}）`); UI.renderPanel("map");
}
function queueBuild(rid,key){
  const r=region(rid), b=BUILDINGS[key]; if(!r||r.owner!=="self") return;
  const lv=(r.build[key]||0), queued=r.queue.filter(q=>q.kind==="build"&&q.key===key).length;
  if(lv+queued>=b.max){ Game.toast(`${b.name}已达上限`); return; }
  if(r.queue.length>=4){ Game.toast("此城工役已满（队列上限4）"); return; }
  r.queue.push({kind:"build", key, name:b.name+"·"+(lv+queued+1)+"级", left:b.build, cost:b.build}); SFX.pick();
  Game.toast(`${r.name} 兴建${b.name}（需产能 ${b.build}）`); UI.renderPanel("map");
}
function cancelQueue(rid,idx){ const r=region(rid); if(!r||!r.queue[idx]) return; r.queue.splice(idx,1); SFX.pick(); UI.renderPanel("map"); }

/* ---------- 月度反哺国家（game.js monthlySettle 调）---------- */
function produce(s){
  if(!s.map) return; let tax=0,food=0,mil=0;
  for(const r of s.map.regions){ if(r.owner!=="self") continue;
    tax+=Math.ceil((r.dev+1)/2);
    if(r.terrain==="平原"||r.terrain==="水乡") food+=r.dev+1;
    if(r.dev>=2) mil+=1; }
  s.nation.treasury+=Math.round(tax*0.6); s.nation.food+=Math.round(food*0.5); s.nation.military+=Math.round(mil*0.5);
}
function growEnemies(s){ if(!s.map) return;
  for(const r of s.map.regions){ if(r.owner==="self") continue; if(R.chance(12)) r.garrison=Math.min(60,r.garrison+1); }
}

/* ---------- 选择 ---------- */
function selectRegion(id){
  const m=M(), r=region(id); if(!r) return;
  // 已选我军 + 点的是合法目标 → 移动/攻取
  if(m.selU){ const u=unit(m.selU);
    if(u && u.owner==="self" && u.movesLeft>0){
      if(isAttackTarget(u,r)){ attack(u,r); return; }
      if(reachable(u)[id]!=null){ moveUnit(u,r); return; }
    }
  }
  m.sel=id; UI.renderPanel("map");
}
function selectUnit(uid){ const m=M(); m.selU=(m.selU===uid?null:uid); UI.renderPanel("map"); }

/* ---------- 移动可达（BFS·穿行己有/已探无敌州）---------- */
function reachable(u){
  const res={}, start=u.rid; res[start]=0;
  let frontier=[{id:start,c:0}];
  while(frontier.length){ const nf=[];
    for(const cur of frontier){ const r=region(cur.id);
      r.adj.forEach(aid=>{ const a=region(aid); if(!a) return;
        if(a.owner!=="self") return;                 // 仅在己境内机动（攻敌另算）
        if(unitsIn(aid).length>=3) return;           // 单州屯兵上限
        const nc=cur.c+1; if(nc>u.movesLeft) return;
        if(res[aid]==null||nc<res[aid]){ res[aid]=nc; nf.push({id:aid,c:nc}); }
      });
    } frontier=nf;
  }
  delete res[start]; return res;
}
function isAttackTarget(u,r){
  if(r.owner==="self") return false;
  const cur=region(u.rid); return cur.adj.includes(r.id) && r.explored;
}
function moveUnit(u,r){ u.rid=r.id; u.movesLeft=Math.max(0,u.movesLeft-1); SFX.pick(); M().sel=r.id; UI.renderPanel("map"); }

/* ---------- 攻城（P5：开沙盘战棋亲自指挥；无头则即时判定）---------- */
function attack(u,r){
  if(!isAttackTarget(u,r)){ Game.toast("不可攻击此地"); return; }
  if(!r.explored){ Game.toast("敌情不明，请先遣使探索"); return; }
  u.movesLeft=0; M().sel=r.id;
  const sf=Game.s.flags; if(sf){ sf.warClock=MONTH_DAYS; sf.atWar=true; }   // 攻城兴兵：每日军粮军饷加重
  // 节奏分流：守备孱弱的小股残敌即时围攻拿下，免去为扫尾反复开战棋；
  // 真正有防御纵深的城（守备厚 / 已筑城墙）才劳师亲临沙盘会战。
  const trivial = defenseOf(r) <= 14 && !(r.build&&r.build.wall);
  if(trivial){ quickAssault(u,r); return; }
  if(typeof WarfieldSys!=="undefined" && WarfieldSys.open){
    const s=Game.s, gens=s.ministers.filter(m=>m.kind==="martial").slice(0,3);
    UI.closePanel&&UI.closePanel();                       // 收起地图，露出战棋弹窗
    WarfieldSys.open({ enemy:(r.faction||r.owner||"敌军"),
      ourMilitary:Math.round(u.hp*1.4 + s.nation.military*0.25 + (u.type==="qi"?10:0)),
      generals:gens, emperor:s.emperor, withEmperor:false,
      enemyPow:defenseOf(r), onResolve:res=>resolveAssault(u.id, r.id, res) });
  } else { quickAssault(u,r); }
}
function resolveAssault(uid, rid, res){
  const r=region(rid), u=unit(uid); const s=Game.s;
  if(res && res.win){
    if(u) capture(r,u); else capture(r,null);
    r._flash=Date.now(); SFX.gong();
    Game.toast(`克 ${r.name}！王师入城镇守。`); Game.logMsg(`天下：攻取 ${r.name}，疆域 +1。`);
  }else{
    if(u){ u.hp=Math.max(0,Math.round(u.hp*((res&&res.ourHP||40)/100)));
      if(u.hp<=0){ M().units=M().units.filter(x=>x.id!==uid); Game.toast(`攻 ${r.name} 失利，全军覆没……`); }
      else Game.toast(`攻 ${r.name} 受挫，折损而还（余气 ${u.hp}）。`); }
    r.garrison=Math.max(0,r.garrison-R.i(3,9));
  }
  M().selU=null; UI.renderHUD&&UI.renderHUD(); Game.save&&Game.save();
  if(UI.openPanel) UI.openPanel("map");
}
/* 即时判定（无头兜底·单位制持续围攻） */
function quickAssault(u,r){
  const def=defenseOf(r);
  const dmgG=Math.max(3,Math.round((u.atk+unitAtkBonus())*R.rnd(0.7,1.15)));
  const dmgU=Math.max(2,Math.round(def*0.32*R.rnd(0.7,1.15)));
  r.garrison=Math.max(0,r.garrison-dmgG); u.hp=Math.max(0,u.hp-dmgU);
  if(u.hp<=0){ M().units=M().units.filter(x=>x.id!==u.id); M().selU=null; SFX.bad();
    Game.toast(`${UNIT_TYPES[u.type].name}攻 ${r.name} 力战不支，全军覆没！`); UI.renderPanel&&UI.renderPanel("map"); return; }
  if(r.garrison<=0){ capture(r,u); r._flash=Date.now(); SFX.gong(); Game.toast(`克 ${r.name}！`); }
  else { SFX.deal(); Game.toast(`攻 ${r.name}，挫守备 ${dmgG}（敌余 ${r.garrison}·我余 ${u.hp}）。`); }
  UI.renderPanel&&UI.renderPanel("map");
}
function capture(r,u){
  const s=Game.s; r.owner="self"; r.faction=null; r.garrison=0; r.explored=true;
  initCity(r);                                          // 新附之州立城
  if(u){ u.rid=r.id; }                                  // 入城
  r.adj.forEach(aid=>{const a=region(aid); if(a)a.explored=true;});
  const pmul=hasTech("unify")?2:1;
  s.nation.land=R.clamp(s.nation.land+R.i(2,5)); s.nation.prestige=R.clamp(s.nation.prestige+R.i(2,4)*pmul);
  if(s.flags) s.flags.warWon=true; if(Game.tally) Game.tally("battlewin");
  if(s.deeds) s.deeds.valor+=2;   // 开疆拓土：武功之迹
  // 胜利判定
  if(counts().own>=counts().total){ s.nation.prestige=R.clamp(s.nation.prestige+20);
    Game.logMsg("【天下一统】普天之下，莫非王土！"); if(s.flags)s.flags.unified=true;
    // 让「克X！」捷报与金框闪光先行播完，再升起一统高光大结局
    if(Game.onUnify) setTimeout(()=>Game.onUnify(),700); }
  UI.renderHUD&&UI.renderHUD(); Game.save&&Game.save();
}

/* ---------- 募军（己州·耗国库/粮/兵）---------- */
function recruit(rid,type){
  const s=Game.s, r=region(rid); if(!r||r.owner!=="self") return;
  if(unitsIn(rid).length>=3){ Game.toast("此州屯兵已满（上限3）"); return; }
  const t=UNIT_TYPES[type], c=t.cost;
  if(s.nation.treasury<c.treasury||s.nation.food<c.food||s.nation.military<c.military){
    Game.toast(`粮饷不足（需 库${c.treasury}·粮${c.food}·兵${c.military}）`); return; }
  s.nation.treasury-=c.treasury; s.nation.food-=c.food; s.nation.military-=c.military;
  spawn(s,rid,type); SFX.gong(); Game.toast(`${r.name} 募得 ${t.name}一支。`);
  Game.clampNation&&Game.clampNation(); UI.renderHUD&&UI.renderHUD(); Game.save&&Game.save(); UI.renderPanel("map");
}

/* ---------- 探索 / 开发（天下回合·耗资源·不占按天行动）---------- */
function explore(id){
  const r=region(id); if(!r||r.explored) return;
  if(!bordersSelf(r)){ Game.toast("只能探索与疆域接壤之地"); return; }
  r.explored=true; SFX.pick(); Game.toast(`遣使探得 ${r.name}：守备约 ${r.garrison}。`);
  UI.renderPanel("map");
}
function develop(id){
  const r=region(id), s=Game.s; if(!r||r.owner!=="self") return;
  if(r.dev>=3){ Game.toast("此地已极尽繁华"); return; }
  const cost=10*(r.dev+1);
  if(s.nation.treasury<cost){ Game.toast(`国库不足（需 ${cost}）`); return; }
  s.nation.treasury-=cost; r.dev++; SFX.good();
  Game.toast(`开发 ${r.name}（开发度 ${r.dev}），城防与产出渐增。`);
  Game.clampNation&&Game.clampNation(); UI.renderHUD&&UI.renderHUD(); Game.save&&Game.save(); UI.renderPanel("map");
}

/* ---------- 敌国 AI（P4）：补备 / 吞并中立扩张 / 袭扰边境 ---------- */
function enemyTurn(s){
  const m=s.map; let fell=null; const warlords=[];
  m.regions.forEach(r=>{
    if(r.owner==="self"||r.owner==="neutral"||!r.faction) return;
    if(R.chance(45)) r.garrison=Math.min(70, r.garrison+R.i(1,2));    // 补备
    if(r.garrison<22) return;                                         // 弱州不出击
    const neu  = r.adj.map(region).filter(a=>a&&a.owner==="neutral");
    const mine = r.adj.map(region).filter(a=>a&&a.owner==="self"&&a.explored);
    const atk = Math.round(r.garrison*0.5*R.rnd(0.8,1.2));
    if(neu.length && R.chance(60)){                                   // 扩张：吞并中立
      const t=neu.sort((a,b)=>a.garrison-b.garrison)[0];
      t.garrison-=atk;
      if(t.garrison<=0){ t.owner=r.owner; t.faction=r.owner; t.garrison=R.i(14,20); r.garrison=Math.round(r.garrison*0.72); }
    }else if(mine.length && !(s.allies&&s.allies[r.faction]>0) && R.chance(32)){  // 袭扰：攻你边州（和亲盟邦不犯边）
      if(s.flags){ s.flags.warClock=MONTH_DAYS; s.flags.atWar=true; }   // 番邦犯边：战时·每日物资消耗加重
      const t=mine.sort((a,b)=>defenseOf(a)-defenseOf(b))[0];
      const guards=unitsIn(t.id,"self");
      if(guards.length){ guards.forEach(u=>u.hp-=R.i(3,9)); m.units=m.units.filter(u=>u.hp>0);
        r.garrison=Math.round(r.garrison*0.85);
        Game.toast(`${r.faction} 犯 ${t.name}，守军力拒！`); }
      else { const d=defenseOf(t);
        if(t.cap){ t.garrison=Math.max(0,(t.garrison|0)); Game.toast(`${r.faction} 兵临 ${t.name}！京畿告急，速遣援军！`); }  // 都城不被一击夺
        else if(atk>d){ t.owner=r.owner; t.faction=r.owner; t.garrison=R.i(12,18);
          t.build={farm:0,market:0,barracks:0,wall:0,academy:0}; t.queue=[]; t.store=0; t.dev=Math.max(0,t.dev-1);
          fell=t.name; r.garrison=Math.round(r.garrison*0.7); }
      }
    }
    // 列国争雄：天下并非只针对你——强藩亦吞并相邻异姓敌州（低频·让地图自然合纵连横）
    else if(r.garrison>=28 && R.chance(16)){
      const rivals=r.adj.map(region).filter(a=>a&&a.owner!=="self"&&a.owner!=="neutral"&&a.faction&&a.faction!==r.faction);
      if(rivals.length){
        const t=rivals.sort((a,b)=>a.garrison-b.garrison)[0];
        t.garrison-=Math.round(r.garrison*0.45*R.rnd(0.8,1.2));
        if(t.garrison<=0){ const loser=t.faction;
          t.owner=r.owner; t.faction=r.owner; t.garrison=R.i(12,18); r.garrison=Math.round(r.garrison*0.7);
          warlords.push(`${r.faction} 攻灭 ${loser}，得 ${t.name}`); }
      }
    }
  });
  if(fell){ Game.logMsg(`【边警】${fell} 失陷于敌！`); }
  if(warlords.length){ Game.logMsg(`【列国争雄】${warlords[0]}。`); }
}

/* ---------- 结束回合 ---------- */
function endTurn(){
  const s=Game.s, m=M(), n=s.nation;
  // 1) 城池产能 → 推进建造队列
  let foodY=0, taxY=0, research=0;
  m.regions.forEach(r=>{ if(r.owner!=="self") return; initCity(r);
    const p=prodOf(r); if(r.queue.length){ const it=r.queue[0]; it.left-=p;
      if(it.left<=0){ completeBuild(s,r,it); r.queue.shift(); } }
    // 建筑每回合产出
    foodY += (r.build.farm||0)*2*(hasTech("farming")?1.5:1) + (r.terrain==="平原"||r.terrain==="水乡"?r.dev:0);
    taxY  += (r.build.market||0)*2*(hasTech("commerce")?1.5:1) + Math.ceil((r.dev+1)/2);
    research += (r.build.academy||0)*1;
  });
  n.food=R.clamp(n.food+Math.round(foodY*0.5)); n.treasury=R.clamp(n.treasury+Math.round(taxY*0.5));
  // 2) 科技研究推进
  research += 1 + (hasTech("academy")?1:0);
  if(m.tech.cur){ m.tech.pts+=research; const tech=TECH[m.tech.cur];
    if(tech && m.tech.pts>=tech.cost){ m.tech.done.push(m.tech.cur); m.tech.pts-=tech.cost;
      Game.toast(`国策大成：${tech.name}！`); Game.logMsg(`研习国策《${tech.name}》成。`); m.tech.cur=null; } }
  // 3) 复位军队机动 + 敌AI（P4）
  m.units.forEach(u=>{ if(u.owner==="self") u.movesLeft=moveOf(u); });
  enemyTurn(s);
  m.turn++; m.selU=null; SFX.deal();
  Game.clampNation&&Game.clampNation(); UI.renderHUD&&UI.renderHUD(); Game.save&&Game.save();
  Game.toast(`天下 · 第 ${m.turn} 回合`); UI.renderPanel("map");
}
function completeBuild(s,r,it){
  if(it.kind==="unit"){ if(unitsIn(r.id,"self").length<3){ spawn(s,r.id,it.key); Game.toast(`${r.name} 练成${it.name}！`); }
    else Game.toast(`${r.name} 屯兵已满，${it.name}暂遣散`); }
  else { r.build[it.key]=(r.build[it.key]||0)+1; Game.toast(`${r.name} ${it.name} 建成！`); }
}

/* ---------- 渲染 ---------- */
function svgMap(s){
  const m=s.map, sel=m.sel, selU=m.selU?unit(m.selU):null;
  const reach = selU?reachable(selU):{};
  const byId=id=>m.regions.find(r=>r.id===id);
  let lines="";
  m.regions.forEach(r=>r.adj.forEach(aid=>{ if(r.id<aid){ const a=byId(aid); if(a)
    lines+=`<line x1="${r.x}" y1="${r.y}" x2="${a.x}" y2="${a.y}" stroke="#00000033" stroke-width="1.4"/>`; }}));
  let tiles="";
  m.regions.forEach(r=>{
    const col=FACTION_COLOR[r.owner]||"#8a8170";
    const isSel=sel===r.id;
    const canMoveHere = selU && reach[r.id]!=null;
    const canAtkHere  = selU && isAttackTarget(selU,r);
    let stroke=isSel?"#fff":(r.owner==="self"?"#f6dd96":"#0008"), sw=isSel?3:1.2;
    if(canMoveHere){ stroke="#5ad1ff"; sw=3; } if(canAtkHere){ stroke="#ff5a4a"; sw=3; }
    const myU=unitsIn(r.id,"self");
    const sub = !r.explored ? "？" : (r.owner==="self" ? "★"+r.dev : "守"+r.garrison);
    tiles+=`<g class="rg" onclick="MapSys.selectRegion('${r.id}')" style="cursor:pointer">
      <rect x="${r.x-31}" y="${r.y-19}" width="62" height="38" rx="8" fill="${col}" fill-opacity="${r.owner==="self"?0.95:(r.explored?0.7:0.4)}" stroke="${stroke}" stroke-width="${sw}"/>
      ${canMoveHere?`<rect x="${r.x-31}" y="${r.y-19}" width="62" height="38" rx="8" fill="#5ad1ff" fill-opacity="0.18"/>`:""}
      ${canAtkHere?`<rect x="${r.x-31}" y="${r.y-19}" width="62" height="38" rx="8" fill="#ff5a4a" fill-opacity="0.16"/>`:""}
      ${(r._flash&&Date.now()-r._flash<1600)?`<rect class="cap-flash" x="${r.x-31}" y="${r.y-19}" width="62" height="38" rx="8" fill="none" stroke="#f6dd96" stroke-width="3"/>`:""}
      <text x="${r.x}" y="${r.y-3}" text-anchor="middle" font-size="13" fill="#1a120b" font-weight="700">${r.cap?"都":""}${r.name}</text>
      <text x="${r.x}" y="${r.y+9}" text-anchor="middle" font-size="8.5" fill="#1a120bbb">${sub}</text>
      ${myU.length?`<g>${myU.map((u,i)=>`<circle cx="${r.x-22+i*11}" cy="${r.y+15}" r="5" fill="${u.id===m.selU?'#fff':'#2a4a8a'}" stroke="#f6dd96" stroke-width="1"/><text x="${r.x-22+i*11}" y="${r.y+18}" text-anchor="middle" font-size="7" fill="${u.id===m.selU?'#2a4a8a':'#fff'}" font-weight="700">${UNIT_TYPES[u.type].icon}</text>`).join("")}</g>`:""}
    </g>`;
  });
  return `<svg viewBox="0 0 600 470" class="worldmap" preserveAspectRatio="xMidYMid meet">
    <defs>
      <radialGradient id="mapbg" cx="50%" cy="42%" r="75%"><stop offset="0%" stop-color="#3a2c18"/><stop offset="100%" stop-color="#211608"/></radialGradient>
      <clipPath id="mapclip"><rect x="0" y="0" width="600" height="470" rx="14"/></clipPath>
    </defs>
    <g clip-path="url(#mapclip)">
      <rect x="0" y="0" width="600" height="470" fill="url(#mapbg)"/>
      <image href="assets/scenes/map_bg.jpg" x="0" y="0" width="600" height="470" preserveAspectRatio="xMidYMid slice" opacity="0.92"/>
      <rect x="0" y="0" width="600" height="470" fill="#1a1208" opacity="0.3"/>
    </g>${lines}${tiles}</svg>`;
}
function actionCard(s){
  const m=s.map, r=m.sel?region(m.sel):null;
  if(!r) return `<p class="panel-tip wf-hint"><b>如何征服天下</b>：①点己方州(金)→城池可<b>营建</b>(建筑/编练军队)、<b>开发</b>②点州中军队「出征」→ 蓝格移动·红格攻取(开沙盘战棋亲征)③攻克敌州即纳疆域④「结束回合」城池出产能、研国策、敌国会扩张反击。<br>★=开发 · 守=守备 · 「都」=都城 · 目标：吞并全部 ${counts().total} 州。</p>`;
  const ownTxt=r.owner==="self"?"<b>我朝</b>":(r.owner==="neutral"?"中立":r.faction||r.owner);
  let h=`<div class="region-card"><div class="m-head"><b>${r.cap?"都 ":""}${r.name}</b><span class="m-post">${r.terrain}${r.owner==="self"?` · 产能 ${prodOf(r)}/回合`:""}</span></div>`;
  if(r.explored) h+=`<div class="m-line">归属 ${ownTxt}　${r.owner==="self"?("开发度 "+r.dev):("守备 "+defenseOf(r)+"（含地利）")}</div>`;
  else h+=`<div class="m-line">归属 ${ownTxt} · 敌情不明</div>`;
  const myU=unitsIn(r.id,"self");
  if(myU.length){ h+=`<div class="unit-row">`+myU.map(u=>{const t=UNIT_TYPES[u.type];
    return `<button class="unit-chip ${u.id===m.selU?'on':''}" onclick="MapSys.selectUnit('${u.id}')" title="点选此军，再点高亮州移动/攻取">
      ${t.name} <i>气${u.hp}/${u.maxhp}·行${u.movesLeft}</i>${u.id===m.selU?'·征':''}</button>`;}).join("")+`</div>`; }
  if(r.owner==="self"){
    initCity(r);
    // 营建队列（始终显示进度）
    if(r.queue.length){ h+=`<div class="build-q">`+r.queue.map((it,i)=>{const pct=Math.round((1-it.left/it.cost)*100);
      return `<span class="bq-item"><b>${it.name}</b><span class="bq-bar"><u style="width:${pct}%"></u></span><button onclick="MapSys.cancelQueue('${r.id}',${i})">✕</button></span>`;}).join("")+`</div>`; }
    // 营建·编练菜单：默认折叠，省版面（点开才展开建筑/编练，不再霸占整张面板）
    h+=`<button class="build-toggle" onclick="MapSys.toggleBuild()">🔨 营建 · 编练${buildOpen?" ▴":" ▾"}</button>`;
    if(buildOpen){
      h+=`<div class="build-grid">`+Object.values(BUILDINGS).map(b=>{const lv=r.build[b.key]||0;
        const full=lv>=b.max; return `<button class="bld ${full?'full':''}" ${full?'disabled':''} onclick="MapSys.queueBuild('${r.id}','${b.key}')" title="${b.desc}（建造产能 ${b.build}）">${b.name} <i>${lv}/${b.max}</i></button>`;}).join("")+`</div>`;
      h+=`<div class="post-row">`+Object.values(UNIT_TYPES).map(t=>{const locked=t.reqTech&&!hasTech(t.reqTech);
        return `<button class="chip ${locked?'':'gold'}" ${locked?'disabled':''} onclick="MapSys.queueUnit('${r.id}','${t.key}')" title="${locked?'需国策解锁':'编练（产能 '+t.build+'）'}">${t.name}${locked?'锁':' ✦'+t.build}</button>`;}).join("")
        + (r.dev<3?`<button class="chip" onclick="MapSys.develop('${r.id}')">开发(库${10*(r.dev+1)})</button>`:`<span class="chip" style="opacity:.5">极繁华</span>`)
        +`</div>`;
    }
  }else if(bordersSelf(r)){
    h+= !r.explored ? `<div class="post-row"><button class="chip" onclick="MapSys.explore('${r.id}')">遣使探索</button></div>`
      : `<p class="panel-tip" style="margin:6px 0 0">选一支相邻我军，点此州（红色高亮）发起攻城。</p>`;
  }else h+=`<p class="panel-tip" style="margin:6px 0 0">需先取下相邻州郡，方可用兵于此。</p>`;
  h+=`</div>`;
  return h;
}
/* 国策科技树弹窗 */
function techPanelHTML(){
  const m=M(), t=m.tech;
  let h=`<div class="techtree"><h2 class="tt-h">国 策</h2>
    <div class="tt-cur">${t.cur?`研习中：<b>${TECH[t.cur].name}</b> ${t.pts}/${TECH[t.cur].cost}`:'未择国策（点选下方研习）'} · 每回合积累研究点</div>
    <div class="tt-grid">`;
  Object.values(TECH).forEach(tc=>{
    const done=hasTech(tc.key), avail=techAvailable(tc.key)&&!done, cur=t.cur===tc.key;
    const cls=done?"done":(cur?"cur":(avail?"avail":"lock"));
    const reqTxt=tc.req.length?`<i>需 ${tc.req.map(k=>TECH[k].name).join("·")}</i>`:"";
    h+=`<button class="tt-node ${cls}" ${(done||(!avail&&!cur))?'disabled':''} onclick="MapSys.startResearch('${tc.key}')">
      <b>${tc.name}</b>${done?' ✓':cur?' 研':''}<span>${tc.desc}</span>${reqTxt}<em>${tc.cost}研</em></button>`;
  });
  h+=`</div></div>`; return h;
}
function openTech(){ UI.openModal(techPanelHTML()); }
function renderBody(s){
  const c=counts(); const pct=Math.round(c.own/c.total*100); const m=s.map;
  const tcur=m.tech&&m.tech.cur?`研${TECH[m.tech.cur].name.slice(0,2)} ${m.tech.pts}/${TECH[m.tech.cur].cost}`:"国策";
  return `<div class="map-top">
      <div class="map-goal"><span>一统</span><div class="goal-bar"><i style="width:${pct}%"></i></div><b>${c.own}/${c.total}</b></div>
      <div class="map-turn">第 <b>${m.turn||1}</b> 回合
        <button class="chip gold" onclick="MapSys.openTech()">${tcur}</button>
        <button class="btn btn-primary turn-btn" onclick="MapSys.endTurn()">结束回合 ▶</button></div>
    </div>
    ${svgMap(s)}
    <div id="map-action">${actionCard(s)}</div>`;
}

return {initState, produce, growEnemies, selectRegion, selectUnit, explore, develop, endTurn, toggleBuild,
  queueUnit, queueBuild, cancelQueue, startResearch, openTech, resolveAssault, quickAssault,
  renderBody, counts, REGIONS, UNIT_TYPES, TECH, BUILDINGS};
})();
if(typeof globalThis!=="undefined") globalThis.MapSys=MapSys;
