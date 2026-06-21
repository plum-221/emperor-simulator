/* ===================================================================
   warfield.js —— 网格沙盘战棋（点将出征·布阵）
   主动出征时开启：在 7×5 棋盘上布阵 → 回合制移动/攻击 → 敌军 AI 应对。
   地形(平原/山丘/密林/河流)影响移动与防御；胜负与战损回传 Game.resolveWar。
   独立模块，渲染进通用弹窗 #modal。
   =================================================================== */
const WarfieldSys = (() => {
"use strict";

const COLS=9, ROWS=6, MAX_TURN=16;           // 扩大沙盘 9×6
/* 地形：move=进入耗费(99=不可进)，def=守方减伤 */
const TERRAIN={
  plain:{key:"plain",name:"平原",move:1,def:0,   ico:""},
  hill: {key:"hill", name:"山丘",move:2,def:0.25,ico:"丘"},
  wood: {key:"wood", name:"密林",move:2,def:0.15,ico:"林"},
  water:{key:"water",name:"河流",move:99,def:0,  ico:"〜"}
};
/* 兵种：射程(rng)/机动(move)/克制(beats)/自身防御减伤(def)/储能技能(skill)。
   步克骑·骑克弓·弓克步（循环）；医疗兵中立不参与克制。*/
const ARM={
  bu:  {key:"bu",  name:"步兵", glyph:"步", rng:1, move:3, beats:"qi",   def:0.15, desc:"结阵持戈·克骑兵·近战",
        skill:{key:"sweep",  name:"横扫", cost:3, desc:"横扫目标及其四邻之敌（群伤）"}},
  qi:  {key:"qi",  name:"骑兵", glyph:"骑", rng:1, move:4, beats:"gong", def:0.05, desc:"长驱奔袭·克弓兵·机动远",
        skill:{key:"charge", name:"突阵", cost:3, desc:"突袭重击 ×2.2·无视反击（斩将利器）"}},
  gong:{key:"gong",name:"弓兵", glyph:"弓", rng:2, move:2, beats:"bu",   def:0,    desc:"远程攒射·克步兵·射程远",
        skill:{key:"rain",   name:"箭雨", cost:3, desc:"覆盖一片·群伤落点周围之敌"}},
  yi:  {key:"yi",  name:"医疗兵",glyph:"医", rng:1, move:3, beats:null,  def:0.1,  desc:"随军医官·疗愈友邻·不擅攻杀",
        skill:{key:"cure",   name:"回春", cost:3, desc:"疗愈周围两格内全部我军"}}
};
const COUNTER_MUL=1.5;                       // 克制方伤害倍率
function counters(a,b){ return !!(ARM[a]&&ARM[a].beats===b); }
function defReduce(u){ return (ARM[u.arm]&&ARM[u.arm].def)||0; }   // 单位自身减伤
let B=null;
const rnd=(a,b)=>a+Math.random()*(b-a);
function leaderOf(side){ return B.units.find(u=>u.side===side&&u.isLeader); }   // 主将（擒贼擒王判定用）
const key=(x,y)=>x+","+y;
const inB=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS;
const manh=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);

function terrainAt(x,y){ return TERRAIN[B.grid[y][x]]; }
function unitAt(x,y){ return B.units.find(u=>u.hp>0&&u.x===x&&u.y===y); }
function aliveOf(side){ return B.units.filter(u=>u.hp>0&&u.side===side); }

/* ---------- 生成战场 ---------- */
function buildGrid(){
  const g=[]; for(let y=0;y<ROWS;y++){ const row=[]; for(let x=0;x<COLS;x++) row.push("plain"); g.push(row); }
  // 中段(x2..COLS-3)随机点缀地形，避开双方布阵区(x0-1 / 右两列)
  const mid=[]; for(let y=0;y<ROWS;y++) for(let x=2;x<=COLS-3;x++) mid.push([x,y]);
  for(let i=mid.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [mid[i],mid[j]]=[mid[j],mid[i]]; }
  let pi=0; const put=(t,n)=>{ for(let k=0;k<n&&pi<mid.length;k++,pi++){ const[x,y]=mid[pi]; g[y][x]=t; } };
  put("hill",5); put("wood",4); put("water",3);
  return g;
}

/* ---------- 生成部队 ---------- */
function mkUnit(o){ return Object.assign({hp:o.maxhp,acted:false,x:-1,y:-1},o); }
const UNIT_FACE={ guard:"assets/portraits/units/guard.jpg", archer:"assets/portraits/units/archer.jpg",
  medic:"assets/portraits/units/medic.jpg",
  foe_chief:"assets/portraits/units/foe_chief.jpg", foe_soldier:"assets/portraits/units/foe_soldier.jpg",
  foe_archer:"assets/portraits/units/foe_archer.jpg", foe_shaman:"assets/portraits/units/foe_shaman.jpg" };
function armed(o){ const a=ARM[o.arm]||ARM.bu; return mkUnit(Object.assign({rng:a.rng,move:a.move,nrg:0,nrgMax:a.skill.cost},o)); }
function buildUnits(cfg){
  const us=[]; let n=0;
  const mil=cfg.ourMilitary||40;
  const gens=(cfg.generals||[]).slice(0,4);
  // 武将 —— 骑兵·头像用各将真立绘
  let leaderId=null, bestMil=-1, emperorId=null;
  gens.forEach(g=>{
    const u=armed({id:"u"+(n++),side:"our",name:g.name,kind:"将",icon:"将",arm:"qi",face:g.portrait||"",
      maxhp:Math.round(58+g.mil*0.6+mil*0.2), atk:Math.round(11+g.mil*0.5+mil*0.1)});
    if(g.mil>bestMil){ bestMil=g.mil; leaderId=u.id; }
    us.push(u);
  });
  // 御驾亲征：陛下·骑兵（头像用帝王按龄立绘）。亲征则陛下即主将。
  if(cfg.emperor && cfg.withEmperor){
    const e=cfg.emperor;
    const u=armed({id:"u"+(n++),side:"our",name:e.name+"(亲征)",kind:"帝",icon:"君",arm:"qi",isEmperor:true,
      face:(typeof emperorFace!=="undefined"?emperorFace(e.age):""),
      maxhp:Math.round(70+e.martial*0.7+mil*0.2), atk:Math.round(14+e.martial*0.6+mil*0.1)});
    emperorId=u.id; us.push(u);
  }
  // 禁军 —— 步兵
  const footN = us.length<3?2:1;
  for(let k=0;k<footN;k++) us.push(armed({id:"u"+(n++),side:"our",name:"禁军"+(k+1),kind:"卒",icon:"丨",arm:"bu",face:UNIT_FACE.guard,
    maxhp:Math.round(42+mil*0.4), atk:Math.round(8+mil*0.22)}));
  // 神射营 —— 弓兵
  us.push(armed({id:"u"+(n++),side:"our",name:"神射营",kind:"弓",icon:"弓",arm:"gong",face:UNIT_FACE.archer,
    maxhp:Math.round(34+mil*0.25), atk:Math.round(10+mil*0.2)}));
  // 随军医 —— 医疗兵（疗愈友军·弱攻）
  us.push(armed({id:"u"+(n++),side:"our",name:"随军医",kind:"医",icon:"医",arm:"yi",face:UNIT_FACE.medic,
    maxhp:Math.round(38+mil*0.25), atk:Math.round(4+mil*0.08), heal:Math.round(14+mil*0.3)}));
  // 主将：御驾亲征→陛下；否则最善战之将。主将被斩即败（擒贼擒王）。
  const ourLeadId = emperorId || leaderId;
  if(ourLeadId){ const L=us.find(u=>u.id===ourLeadId); if(L){ L.isLeader=true; if(!L.isEmperor) L.icon="帅"; } }

  // 敌军（酋首=骑兵主将 · 番弓=弓兵 · 巫医=医疗兵 · 余=步兵）
  const ep=cfg.enemyPow||55, foeN=Math.max(3,Math.min(6,3+Math.floor(ep/26)));
  for(let k=0;k<foeN;k++){
    const lead=k===0, foeArcher=(k===foeN-1), foeMedic=(foeN>=5 && k===foeN-2);
    const arm=lead?"qi":(foeMedic?"yi":(foeArcher?"gong":"bu"));
    us.push(armed({id:"f"+(n++),side:"foe",name:lead?(cfg.enemy+"·王"):(foeMedic?(cfg.enemy+"巫医"):(cfg.enemy+"兵"+k)),
      kind:lead?"酋":(foeMedic?"医":"番"),icon:lead?"酋":(foeMedic?"医":"敌"),isLeader:lead,
      arm,
      face:lead?UNIT_FACE.foe_chief:(foeMedic?UNIT_FACE.foe_shaman:(foeArcher?UNIT_FACE.foe_archer:UNIT_FACE.foe_soldier)),
      maxhp:Math.round((lead?70:46)+ep*0.5*rnd(0.85,1.1)),
      atk:Math.round((lead?14:foeMedic?5:9)+ep*0.18*rnd(0.85,1.1)),
      heal:foeMedic?Math.round(12+ep*0.25):0}));
  }
  return us;
}

/* 自动布阵：己方放左两列，敌方放右两列 */
function autoPlace(){
  const ours=B.units.filter(u=>u.side==="our"), foes=B.units.filter(u=>u.side==="foe");
  const zone=(cols)=>{ const c=[]; for(const x of cols) for(let y=0;y<ROWS;y++) if(TERRAIN[B.grid[y][x]].move<99) c.push({x,y}); return c; };
  const oz=zone([0,1]), fz=zone([COLS-1,COLS-2]);
  ours.forEach((u,i)=>{ const c=oz[i%oz.length]; u.x=c.x; u.y=c.y; });
  foes.forEach((u,i)=>{ const c=fz[i%fz.length]; u.x=c.x; u.y=c.y; });
}

/* ---------- BFS 可达格（含地形耗费，绕开所有单位）---------- */
function reachable(u){
  const res={}; const start=key(u.x,u.y); res[start]=0;
  let frontier=[{x:u.x,y:u.y,c:0}];
  while(frontier.length){
    const nf=[];
    for(const cur of frontier){
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
        const nx=cur.x+dx, ny=cur.y+dy; if(!inB(nx,ny)) return;
        const t=TERRAIN[B.grid[ny][nx]]; if(t.move>=99) return;
        if(unitAt(nx,ny)) return;                 // 单位阻挡
        const nc=cur.c+t.move; if(nc>u.move) return;
        const k=key(nx,ny); if(res[k]==null||nc<res[k]){ res[k]=nc; nf.push({x:nx,y:ny,c:nc}); }
      });
    }
    frontier=nf;
  }
  delete res[start];
  return res;   // {"x,y":cost}
}
function attackTargets(u,fromX,fromY){
  return B.units.filter(t=>t.hp>0&&t.side!==u.side && (Math.abs(t.x-fromX)+Math.abs(t.y-fromY))<=u.rng);
}

/* ---------- 攻击特效：飘伤害数字 / 命中闪光（render 时绘制·~900ms 自灭）---------- */
function fx(x,y,txt,kind){ if(!B.fx)B.fx=[]; B.fx.push({x,y,txt,kind,t:Date.now()}); }
/* ---------- 治疗（医疗兵）---------- */
function heal(src,tgt){
  const amt=Math.min(tgt.maxhp-tgt.hp, src.heal||12);
  if(amt<=0) return false;
  tgt.hp+=amt; fx(tgt.x,tgt.y,"+"+amt,"heal");
  B.log.unshift(`${src.name} 疗 ${tgt.name}，回 ${amt}（${tgt.hp}/${tgt.maxhp}）`);
  if(typeof SFX!=="undefined"&&SFX.good) SFX.good();
  return true;
}
/* ---------- 战斗结算 ---------- */
function strike(att,def,opt){
  opt=opt||{};
  const dt=terrainAt(def.x,def.y);
  const adv=counters(att.arm,def.arm);                       // 兵种克制
  const red=Math.min(0.6, dt.def + defReduce(def));          // 地形减伤 + 单位自身减伤（封顶60%）
  let dmg=Math.max(3,Math.round(att.atk*(opt.mul||1)*rnd(0.82,1.18)*(1-red)*(adv?COUNTER_MUL:1)));
  def.hp=Math.max(0,def.hp-dmg);
  fx(def.x,def.y,"-"+dmg, adv||opt.mul>1.5?"crit":"hit");
  B.log.unshift(`${att.name} ${opt.skill?`【${opt.skill}】`:"击"} ${def.name}，伤 ${dmg}${adv?`（${ARM[att.arm].name}克${ARM[def.arm].name}·克制！）`:""}${dt.def?`（${dt.name}减免）`:""}${def.hp<=0?" — 阵亡！":`（余${def.hp}）`}`);
  if(typeof SFX!=="undefined"&&SFX.deal) SFX.deal();
  // 反击：守方存活且攻方在其射程内（亦计兵种克制）；技能突阵无视反击
  if(!opt.noCounter && def.hp>0 && (Math.abs(att.x-def.x)+Math.abs(att.y-def.y))<=def.rng){
    const cadv=counters(def.arm,att.arm);
    let cd=Math.max(2,Math.round(def.atk*0.4*rnd(0.8,1.2)*(1-defReduce(att))*(cadv?COUNTER_MUL:1)));
    att.hp=Math.max(0,att.hp-cd);
    fx(att.x,att.y,"-"+cd,"hit");
    B.log.unshift(`　↳ ${def.name} 反击，伤 ${cd}${cadv?"（克制！）":""}${att.hp<=0?" — "+att.name+"阵亡！":""}`);
  }
}

/* ---------- 玩家操作 ---------- */
function skillReady(u){ return (u.nrg||0)>=(u.nrgMax||99) && !u.acted; }
function woundedNear(u,x,y){ return B.units.filter(t=>t.hp>0&&t.side===u.side&&t!==u&&t.hp<t.maxhp&&(Math.abs(t.x-x)+Math.abs(t.y-y))<=u.rng); }
function endUnit(u){ u.acted=true; B.sel=null; B.skillMode=false; afterAction(); }
function selectUnit(id){
  const u=B.units.find(x=>x.id===id);
  if(!u||u.side!=="our"||u.hp<=0) return;
  if(B.phase==="battle"&&u.acted) return;
  B.sel=id; B.moved=false; B.skillMode=false; render();
}
/* 技能目标格集合（render 高亮·onCell 判定）*/
function skillCells(u){
  const sk=ARM[u.arm].skill, set={};
  if(sk.key==="cure") return set;                              // 回春无需选格
  const reach = sk.key==="rain" ? u.rng+1 : u.rng;
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
    const d=Math.abs(u.x-x)+Math.abs(u.y-y); if(d<1||d>reach) continue;
    if(sk.key==="rain"){ set[key(x,y)]=1; }                    // 箭雨可落任意格
    else { const t=unitAt(x,y); if(t&&t.side==="foe") set[key(x,y)]=1; }   // 横扫/突阵须点敌
  }
  return set;
}
function castSkillAt(u,x,y){
  const sk=ARM[u.arm].skill, tgt=unitAt(x,y), d=Math.abs(u.x-x)+Math.abs(u.y-y);
  if(sk.key==="sweep"){
    if(!(tgt&&tgt.side==="foe"&&d<=u.rng)) return;             // 须点相邻之敌（无效不消耗）
    strike(u,tgt,{skill:sk.name,mul:1.2});
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const s=unitAt(tgt.x+dx,tgt.y+dy); if(s&&s.side==="foe") strike(u,s,{skill:sk.name,mul:0.7,noCounter:true});});
    fx(u.x,u.y,sk.name,"skill");
  }else if(sk.key==="charge"){
    if(!(tgt&&tgt.side==="foe"&&d<=u.rng)) return;
    strike(u,tgt,{skill:sk.name,mul:2.2,noCounter:true}); fx(u.x,u.y,sk.name,"skill");
  }else if(sk.key==="rain"){
    if(d>u.rng+1) return;
    let hit=0; B.units.filter(t=>t.hp>0&&t.side==="foe"&&(Math.abs(t.x-x)+Math.abs(t.y-y))<=1).forEach(s=>{strike(u,s,{skill:sk.name,mul:0.9,noCounter:true});hit++;});
    if(!hit) return;                                           // 没炸到人则取消
    fx(x,y,sk.name,"skill");
  }
  u.nrg=0; endUnit(u);
}
function castCure(u){
  let n=0; B.units.filter(t=>t.hp>0&&t.side===u.side&&(Math.abs(t.x-u.x)+Math.abs(t.y-u.y))<=2&&t.hp<t.maxhp).forEach(t=>{ if(heal(u,t))n++; });
  fx(u.x,u.y,"回春","skill"); u.nrg=0; endUnit(u);
}
function useSkill(){
  const u=B.units.find(x=>x.id===B.sel); if(!u||!skillReady(u)) return;
  if(ARM[u.arm].skill.key==="cure"){ castCure(u); return; }    // 回春即放
  B.skillMode=!B.skillMode; render();                          // 其余进入选格模式（再点取消）
}
function onCell(x,y){
  if(B.phase==="deploy"){ deployMove(x,y); return; }
  if(B.phase!=="battle"||!B.sel) return;
  const u=B.units.find(x2=>x2.id===B.sel); if(!u||u.acted) return;
  if(B.skillMode){ castSkillAt(u,x,y); return; }              // 技能目标模式
  const tgt=unitAt(x,y), d=Math.abs(u.x-x)+Math.abs(u.y-y);
  // 医疗兵点友军→治疗
  if(u.arm==="yi" && tgt && tgt.side===u.side && tgt!==u && d<=u.rng && tgt.hp<tgt.maxhp){
    if(heal(u,tgt)) endUnit(u); return;
  }
  // 点敌→攻击（在射程内）
  if(tgt&&tgt.side==="foe"){
    if(d<=u.rng){ strike(u,tgt); endUnit(u); }
    return;
  }
  // 点空格→移动（可达）
  if(!tgt){
    const reach=reachable(u);
    if(reach[key(x,y)]!=null){ u.x=x; u.y=y; B.moved=true;
      const canAct = attackTargets(u,x,y).length || (u.arm==="yi"&&woundedNear(u,x,y).length) || skillReady(u);
      if(!canAct){ endUnit(u); } else render();
    }
  }
}
function skipUnit(){ const u=B.units.find(x=>x.id===B.sel); if(u){ endUnit(u); } else { B.sel=null; afterAction(); } }
function afterAction(){
  if(checkEnd()) return;
  if(aliveOf("our").every(u=>u.acted)) enemyTurn();
  else render();
}

/* ---------- 敌军 AI 决策辅助 ---------- */
function nearest(f,arr){ let b=arr[0],bd=1e9; arr.forEach(t=>{const d=manh(f,t);if(d<bd){bd=d;b=t;}}); return b; }
// 去随机的伤害估算（取中值），供 AI 评估"打谁/能不能斩杀"
function estDmg(att,def,mul){
  const dt=terrainAt(def.x,def.y), red=Math.min(0.6,dt.def+defReduce(def)), adv=counters(att.arm,def.arm);
  return Math.max(3,Math.round(att.atk*(mul||1)*(1-red)*(adv?COUNTER_MUL:1)));
}
// 一个我军目标 t 对敌单位 f 的"攻击价值"
function targetValue(f,t,dmg){
  let v=dmg;                                   // 基础=能造成的伤害
  if(dmg>=t.hp)      v+=45;                     // 能一击斩杀 → 高优先
  if(t.isLeader)     v+=38;                     // 我军主将 = 擒王机会（镜像玩家斩首战术）
  if(t.arm==="yi")   v+=20;                     // 我军医疗 → 先断奶
  v+=(1-t.hp/t.maxhp)*14;                       // 残血优先（集火）
  if(counters(f.arm,t.arm)) v+=10;             // 克制目标更划算
  if(counters(t.arm,f.arm)) v-=8;              // 会被对方克制反伤 → 略避
  return v;
}
// (x,y) 处下回合可能挨到的我军总攻击力（近似：我军 move+rng 够得到即计），用于敌方避险
function exposureAt(x,y,ignore){
  let e=0;
  B.units.forEach(o=>{ if(o.hp>0&&o.side==="our"&&o!==ignore){
    if(Math.abs(o.x-x)+Math.abs(o.y-y) <= (o.move||3)+(o.rng||1)) e+=o.atk; } });
  return e;
}
// 敌单位放技能（side 无关版·复用 strike(opt)，不走玩家 endUnit 流程）
function foeCast(f,t){
  const sk=ARM[f.arm].skill;
  if(sk.key==="charge"){ strike(f,t,{skill:sk.name,mul:2.2,noCounter:true}); fx(f.x,f.y,sk.name,"skill"); }
  else if(sk.key==="sweep"){ strike(f,t,{skill:sk.name,mul:1.2});
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const s=unitAt(t.x+dx,t.y+dy); if(s&&s.side!==f.side&&s.hp>0) strike(f,s,{skill:sk.name,mul:0.7,noCounter:true});});
    fx(f.x,f.y,sk.name,"skill"); }
  else if(sk.key==="rain"){ B.units.filter(s=>s.hp>0&&s.side!==f.side&&(Math.abs(s.x-t.x)+Math.abs(s.y-t.y))<=1).forEach(s=>strike(f,s,{skill:sk.name,mul:0.9,noCounter:true}));
    fx(t.x,t.y,sk.name,"skill"); }
  f.nrg=0;
}
// 全场扫描：选最优(站位,目标,是否用技能)。spots = 原地 + 所有可达格
function bestPlanFor(f){
  const spots=[{x:f.x,y:f.y}]; const reach=reachable(f);
  for(const k in reach){ const[x,y]=k.split(",").map(Number); spots.push({x,y}); }
  const canSkill=skillReady(f)&&f.arm!=="yi", sk=ARM[f.arm].skill;
  const skMul=sk?(sk.key==="charge"?2.2:sk.key==="sweep"?1.2:sk.key==="rain"?0.9:1):1;
  let best={score:-1e9};
  for(const sp of spots){
    const expo=exposureAt(sp.x,sp.y,f);
    const inRange=B.units.filter(t=>t.hp>0&&t.side==="our"&&(Math.abs(t.x-sp.x)+Math.abs(t.y-sp.y))<=f.rng);
    for(const t of inRange){
      // 普通攻击
      let v=targetValue(f,t,estDmg(f,t,1)) - expo*(f.isLeader?0.04:0.012);
      if(v>best.score) best={score:v,x:sp.x,y:sp.y,tid:t.id,skill:false};
      // 技能攻击（攒满气才考虑）
      if(canSkill){
        let sv=targetValue(f,t,estDmg(f,t,skMul)) - expo*(f.isLeader?0.04:0.012)
             + (sk.key==="charge"?10:sk.key==="rain"?6:4);   // 技能略加权(斩杀/群伤/无视反击)
        if(sv>best.score) best={score:sv,x:sp.x,y:sp.y,tid:t.id,skill:true};
      }
    }
  }
  return best.score>-1e9?best:null;
}
// 撤到暴露最低的可达格（残血主将自保用）
function retreatFoe(f){
  const reach=reachable(f); let best=null,bs=exposureAt(f.x,f.y,f);
  for(const k in reach){ const[x,y]=k.split(",").map(Number); const e=exposureAt(x,y,f); if(e<bs){bs=e;best={x,y};} }
  if(best){ f.x=best.x; f.y=best.y; B.log.unshift(`${f.name} 见势不利，引军后撤……`); }
}
// 无可攻目标：向战略目标推进（主将偏好我主将/医疗·并避险），到位则顺势出手
function advanceFoe(f){
  const ours=aliveOf("our"); if(!ours.length) return;
  const tgt = f.isLeader ? (ours.find(o=>o.isLeader)||ours.find(o=>o.arm==="yi")||nearest(f,ours)) : nearest(f,ours);
  const reach=reachable(f); let best=null,bs=1e9;
  for(const k in reach){ const[x,y]=k.split(",").map(Number);
    let score=(Math.abs(x-tgt.x)+Math.abs(y-tgt.y)) - ((Math.abs(x-tgt.x)+Math.abs(y-tgt.y))<=f.rng?5:0);
    score += exposureAt(x,y,f)*(f.isLeader?0.03:0.006);     // 主将更避险，避免一头扎进包围
    if(score<bs){ bs=score; best={x,y}; } }
  if(f.isLeader && f.hp<f.maxhp*0.4){                       // 残血主将：只在不更暴露时才移动
    if(best && exposureAt(best.x,best.y,f)<=exposureAt(f.x,f.y,f)){ f.x=best.x; f.y=best.y; }
  } else if(best){ f.x=best.x; f.y=best.y; }
  const t2=nearest(f,aliveOf("our"));
  if(t2 && manh(f,t2)<=f.rng) strike(f,t2);                 // 走到后进了射程→打
}
// 攻击型敌单位的完整一步
function foeCombatAct(f){
  const plan=bestPlanFor(f);
  if(plan){
    const tgt=B.units.find(u=>u.id===plan.tid);
    const willKill=estDmg(f,tgt,plan.skill?(ARM[f.arm].skill.key==="charge"?2.2:ARM[f.arm].skill.key==="sweep"?1.2:0.9):1)>=tgt.hp;
    const risky=exposureAt(plan.x,plan.y,f) > f.hp*0.85;    // 落点预计挨打超自身八成五血
    if(f.isLeader && f.hp<f.maxhp*0.4 && !willKill && risky){
      retreatFoe(f);                                        // 残血主将不浪：能斩首才冒险，否则撤
    }else{
      if(f.x!==plan.x||f.y!==plan.y){ f.x=plan.x; f.y=plan.y; }
      if(plan.skill) foeCast(f,tgt); else strike(f,tgt);
    }
  }else{ advanceFoe(f); }
}
// 敌方医疗兵：优先疗主将→最危者；满气且周围多伤→回春群疗；闲时随主将走位
function foeMedicAct(f){
  const wounded=B.units.filter(t=>t.hp>0&&t.side==="foe"&&t!==f&&t.hp<t.maxhp)
    .sort((a,b)=>(b.isLeader-a.isLeader)||((a.hp/a.maxhp)-(b.hp/b.maxhp)));
  if(!wounded.length){                                      // 无人受伤→护在主将身侧
    const ld=leaderOf("foe");
    if(ld && manh(f,ld)>1){ const reach=reachable(f); let best=null,bd=1e9;
      for(const k in reach){const[x,y]=k.split(",").map(Number); const d=Math.abs(x-ld.x)+Math.abs(y-ld.y); if(d<bd){bd=d;best={x,y};}}
      if(best){f.x=best.x;f.y=best.y;} }
    return;
  }
  const near2=wounded.filter(t=>manh(f,t)<=2);
  if(skillReady(f) && near2.length>=2){                     // 满气+周围两格内≥2伤者→回春群疗
    near2.forEach(t=>heal(f,t)); fx(f.x,f.y,"回春","skill"); f.nrg=0; return;
  }
  const hurt=wounded[0];
  if(manh(f,hurt)>f.rng){                                   // 移到能疗到的最近格
    const reach=reachable(f); let best=null,bd=1e9;
    for(const k in reach){const[x,y]=k.split(",").map(Number); const d=Math.abs(x-hurt.x)+Math.abs(y-hurt.y); if(d<bd){bd=d;best={x,y};}}
    if(best){f.x=best.x;f.y=best.y;}
  }
  if(manh(f,hurt)<=f.rng) heal(f,hurt);
}

/* ---------- 敌军 AI ---------- */
function enemyTurn(){
  B.phase="enemyAnim";
  const foes=aliveOf("foe");
  let i=0;
  const step=()=>{
    if(i>=foes.length){ // 回合结束：复位 + 全员储能 +1
      B.units.forEach(u=>{u.acted=false; u.nrg=Math.min(u.nrgMax||3,(u.nrg||0)+1);}); B.turn++; B.sel=null;
      if(B.turn>MAX_TURN){ endByAttrition(); return; }
      B.phase="battle"; if(checkEnd()) return; render(); return;
    }
    const f=foes[i++]; if(f.hp<=0){ step(); return; }
    if(!aliveOf("our").length){ checkEnd(); return; }
    if(f.arm==="yi") foeMedicAct(f);      // 医疗兵：疗主将/群疗/护驾
    else foeCombatAct(f);                 // 攻击型：择优站位+目标+技能，主将自保
    if(checkEnd()) return;
    render(); setTimeout(step,420);
  };
  render(); setTimeout(step,400);
}

function checkEnd(){
  const our=aliveOf("our"), foe=aliveOf("foe");
  // 擒贼擒王：任一方主将首级被取，该方即败（不必尽歼）
  const fL=leaderOf("foe"), oL=leaderOf("our");
  if(fL && fL.hp<=0){ finish(true,"擒王"); return true; }
  if(oL && oL.hp<=0){ finish(false,"主将殁"); return true; }
  if(foe.length===0){ finish(true); return true; }
  if(our.length===0){ finish(false); return true; }
  return false;
}
function endByAttrition(){
  const oh=aliveOf("our").reduce((a,u)=>a+u.hp,0), fh=aliveOf("foe").reduce((a,u)=>a+u.hp,0);
  finish(oh>=fh);
}
function finish(win,reason){
  B.phase="over"; B.win=win; B.reason=reason||"";
  const head = reason==="擒王" ? "斩其主将，敌军群龙无首、土崩瓦解！"
    : reason==="主将殁" ? "主将殒于阵中，王师溃散……"
    : (win?"敌军溃灭，大获全胜！":"王师力竭，败退而还……");
  B.log.unshift(head);
  const mc=document.getElementById("modal-close"); if(mc) mc.style.display="";
  const ourMax=B.units.filter(u=>u.side==="our").reduce((a,u)=>a+u.maxhp,0)||1;
  const ourHpNow=aliveOf("our").reduce((a,u)=>a+u.hp,0);
  B.result={win, ourHP:Math.round(ourHpNow/ourMax*100), rounds:B.turn};
  render();
}

/* ---------- 布阵阶段：调整己方站位 ----------
   初次布阵：仅左两列阵地。战中「重新布阵」(B.freeDeploy)：全盘自由调动己方阵型。 */
function deployMove(x,y){
  if(!B.freeDeploy && x>1) { return; }          // 初次布阵仅左两列；战中重布阵不限
  if(TERRAIN[B.grid[y][x]].move>=99) return;     // 河流不可站
  const occ=unitAt(x,y);
  if(occ && occ.side!=="our") return;            // 不可占用/换位敌方单位
  if(B.sel){
    const u=B.units.find(p=>p.id===B.sel);
    if(occ&&occ!==u){ // 与己方换位
      const ox=u.x,oy=u.y; u.x=occ.x;u.y=occ.y; occ.x=ox;occ.y=oy;
    }else{ u.x=x; u.y=y; }
    B.sel=null; render();
  }else if(occ&&occ.side==="our"){ B.sel=occ.id; render(); }
}
function startBattle(){
  const resuming = B.turn>0;                     // 战中重布阵后继续：保留回合/气/已动状态，不重置战局
  B.phase="battle"; B.freeDeploy=false; B.sel=null; B.skillMode=false;
  if(!resuming){ B.turn=1; B.units.forEach(u=>{u.acted=false; u.nrg=1;}); }
  render();
}
/* 战中「重新布阵」：随时自由调动己方阵型，再「继续作战」回到战斗（不消耗回合）*/
function enterRedeploy(){
  if(B.phase!=="battle") return;
  B.phase="deploy"; B.freeDeploy=true; B.sel=null; B.skillMode=false; render();
}

/* ---------- 渲染 ---------- */
function render(){
  let cells="";
  const selU = B.sel?B.units.find(u=>u.id===B.sel):null;
  const reach = (B.phase==="battle"&&selU&&!B.skillMode)?reachable(selU):null;
  const atkSet={}, skSet=(B.skillMode&&selU)?skillCells(selU):{};
  if(selU&&B.phase==="battle"&&!B.skillMode) attackTargets(selU,selU.x,selU.y).forEach(t=>atkSet[key(t.x,t.y)]=1);
  const now=Date.now(), activeFx=(B.fx||[]).filter(f=>now-f.t<900);
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
    const t=TERRAIN[B.grid[y][x]], u=unitAt(x,y);
    let cls="wf-cell t-"+t.key;
    if(x<=1) cls+=" zone-our"; else if(x>=COLS-2) cls+=" zone-foe";
    if(reach&&reach[key(x,y)]!=null) cls+=" wf-move";
    if(atkSet[key(x,y)]) cls+=" wf-atk";
    if(skSet[key(x,y)]) cls+=" wf-skillcell";
    if(selU&&selU.x===x&&selU.y===y) cls+=" wf-sel";
    let inner = t.ico?`<span class="wf-terr">${t.ico}</span>`:"";
    if(u){
      const hpPct=Math.max(0,Math.round(u.hp/u.maxhp*100));
      const nrgPct=Math.round((u.nrg||0)/(u.nrgMax||3)*100), ready=skillReady(u)&&u.side==="our";
      const side=u.side==="our"?"u-our":"u-foe";
      const face=u.face?`<img class="wf-face" src="${u.face}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'wf-glyph',textContent:'${u.icon}'}))">`
        :`<span class="wf-glyph">${u.icon}</span>`;
      const armG=(ARM[u.arm]||ARM.bu).glyph;
      inner=`<div class="wf-unit ${side}${u.acted&&u.side==="our"&&B.phase==="battle"?" acted":""}${u.isLeader?" lead":""}${ready?" ready":""}" data-id="${u.id}" title="${u.name}·${(ARM[u.arm]||ARM.bu).name}">
        ${face}<span class="wf-badge">${armG}</span>${u.isLeader?'<span class="wf-crown">主</span>':""}
        <span class="wf-nrg"><u style="width:${nrgPct}%"></u></span>
        <span class="wf-hp"><u style="width:${hpPct}%"></u></span></div>`;
    }
    const cfx=activeFx.filter(f=>f.x===x&&f.y===y).map(f=>`<span class="wf-fx ${f.kind}">${f.txt}</span>`).join("");
    cells+=`<div class="${cls}" data-x="${x}" data-y="${y}">${inner}${cfx}</div>`;
  }
  // 控制区
  let ctrl="";
  const legend=`<div class="wf-legend">克制：步克骑·骑克弓·弓克步(×1.5)｜射程 步/骑1·弓2·医1｜机动 骑4·步/医3·弓2｜储能满放<b>技能</b>｜<b>斩敌主将即胜</b></div>`;
  if(B.phase==="deploy"){
    const free=B.freeDeploy;
    ctrl=`<div class="wf-tip">${free?"自由布阵：点己方单位、再点任意空格即可调动（全盘随意重排、可换位）。摆好后继续作战。":"布阵：点己方单位再点左侧阵地格可换位（仅左二列）。摆好后开战。"}</div>${legend}
      <button class="btn btn-primary wf-go" id="wf-start">${free?"继 续 作 战 ▶":"开 战"}</button>`;
  }else if(B.phase==="over"){
    ctrl=`<div class="wf-result ${B.win?"win":"lose"}">${B.win?"凯　旋":"败　北"}${B.reason?`<span class="wf-reason">· ${B.reason}</span>`:""}</div>
      <button class="btn btn-primary wf-go" id="wf-finish">${B.win?"献　捷　班　师":"收　拾　残　部"}</button>`;
  }else{
    let card="点己方单位行动（蓝格=可移动·红格=可攻击）";
    if(selU){ const a=ARM[selU.arm]||ARM.bu, sk=a.skill, ready=skillReady(selU);
      const def=Math.round((defReduce(selU))*100);
      card=`<div class="wf-stat"><b>${selU.name}</b>·${a.name}${selU.isLeader?" <em>主将</em>":""}${selU.arm==="yi"?" <em>疗</em>":""}
        <span class="wf-stat-row">攻 ${selU.atk}｜防 ${def}%｜血 ${selU.hp}/${selU.maxhp}｜射程 ${selU.rng}｜机动 ${selU.move}｜气 ${selU.nrg||0}/${selU.nrgMax}</span>
        <span class="wf-stat-skill">技能·<b>${sk.name}</b>：${sk.desc}${ready?'':`（气满可放）`}</span></div>
        <div class="wf-act-hint">${B.skillMode?`<b style="color:#c89bff">选格放【${sk.name}】</b>（再点技能取消）`:(selU.arm==="yi"?"点<b>友军</b>治疗／点<b>红格</b>攻击／点<b>蓝格</b>移动":"点<b>红格</b>攻击／点<b>蓝格</b>移动")}</div>`;
    }
    ctrl=`<div class="wf-tip">第 ${B.turn}/${MAX_TURN} 回合 · ${card}</div>${legend}
      <div class="wf-btns">
        ${selU&&skillReady(selU)?`<button class="chip skill${B.skillMode?" on":""}" id="wf-skill">技能·${(ARM[selU.arm].skill).name} ✦</button>`:""}
        ${selU?`<button class="chip" id="wf-skip">原地待命</button>`:""}
        <button class="chip" id="wf-redeploy">重新布阵 ⟲</button>
        <button class="chip warn" id="wf-end">结束我方回合 ▶</button></div>`;
  }
  // 攻击特效到点后清场重绘
  if(activeFx.length){ clearTimeout(B._fxTimer); B._fxTimer=setTimeout(()=>{ if(B&&B.phase!=="over"){ B.fx=(B.fx||[]).filter(f=>Date.now()-f.t<900); render(); } },920); }
  const log=B.log.slice(0,5).map((l,i)=>`<div class="wf-log-item${i===0?" fresh":""}">${l}</div>`).join("");
  const html=`<div class="warfield">
    <h2 class="wf-h">沙　盘　会　战 <span class="wf-vs">王师 ${aliveOf("our").length} · ${B.enemy} ${aliveOf("foe").length}</span></h2>
    <div class="wf-grid" style="grid-template-columns:repeat(${COLS},1fr)">${cells}</div>
    <div class="wf-ctrl">${ctrl}</div>
    <div class="wf-log">${log}</div>
  </div>`;
  UI.openModal(html);
  bind();
}
function bind(){
  [...document.querySelectorAll(".wf-cell")].forEach(c=>c.onclick=()=>onCell(+c.dataset.x,+c.dataset.y));
  [...document.querySelectorAll(".wf-unit")].forEach(el=>el.onclick=(e)=>{ e.stopPropagation();
    const cell=el.closest(".wf-cell"), x=+cell.dataset.x, y=+cell.dataset.y, id=el.dataset.id;
    if(B.phase==="deploy") return onCell(x,y);
    const u=B.units.find(p=>p.id===id), sel=B.sel?B.units.find(p=>p.id===B.sel):null;
    if(B.skillMode) return onCell(x,y);                                            // 技能选格（含点敌头像）
    if(u && u.side==="foe") return onCell(x,y);                                    // 攻击敌军
    if(sel && sel.arm==="yi" && u && u.side==="our" && u.id!==sel.id && u.hp<u.maxhp) return onCell(x,y);  // 医疗友军
    selectUnit(id);                                                                // 否则选中我军
  });
  const s=document.getElementById("wf-start"); if(s) s.onclick=startBattle;
  const skb=document.getElementById("wf-skill"); if(skb) skb.onclick=useSkill;
  const sk=document.getElementById("wf-skip"); if(sk) sk.onclick=skipUnit;
  const rd=document.getElementById("wf-redeploy"); if(rd) rd.onclick=enterRedeploy;
  const en=document.getElementById("wf-end"); if(en) en.onclick=()=>{ aliveOf("our").forEach(u=>u.acted=true); enemyTurn(); };
  const f=document.getElementById("wf-finish"); if(f) f.onclick=()=>{ const mc=document.getElementById("modal-close"); if(mc)mc.style.display=""; UI.closeModal(); const cb=B.onResolve,r=B.result; B=null; if(cb)cb(r); };
}

function open(cfg){
  B={enemy:cfg.enemy, grid:buildGrid(), units:[], phase:"deploy", turn:0, sel:null, moved:false,
     log:[`王师讨伐 ${cfg.enemy}，于此沙盘列阵对垒！`], onResolve:cfg.onResolve, win:false, result:null};
  B.units=buildUnits(cfg);
  autoPlace();
  if(typeof MusicSys!=="undefined") MusicSys.setScene("map");   // 沙盘沿用天下真曲(world.mp3)·不再切合成电子战鼓
  const mc=document.getElementById("modal-close"); if(mc) mc.style.display="none";  // 战中禁关闭
  render();
}
return { open, _state:()=>B };
})();
if(typeof globalThis!=="undefined") globalThis.WarfieldSys=WarfieldSys;
