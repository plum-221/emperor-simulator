/* ===================================================================
   music.js —— 生成式古风背景音乐（WebAudio 实时合成·分场景·零文件零版权）
   五声音阶（宫商角徵羽）古筝式拨弦 + 低音垫，按场景切换情绪：
   title 标题(空灵) / court 朝堂(平和) / night 入夜(幽邃) / battle 战斗(紧促)。
   暴露 MusicSys：start / setScene / setEnabled / isEnabled / toggle / setVolume。
   ★ 真曲覆盖：若 REAL_TRACKS[scene] 指向 assets/audio/ 下的真 CC0 音频，则改播该文件。
     （默认空=纯合成；用户放好真曲并在此登记即自动启用，代码无需再改。）
   =================================================================== */
const MusicSys = (() => {
"use strict";

let ctx=null, master=null, enabled=true, started=false;
let scene=null, timer=null, drone=[], nextT=0, audioEl=null;
const rnd=(a,b)=>a+Math.random()*(b-a);

/* 真曲覆盖表：指向 assets/audio/ 下的真曲则改播文件（否则纯合成）。
   title 初始页 / court+night 日常大厅(昼夜同曲不断流) / map 天下舆图。*/
const REAL_TRACKS = {
  title: "assets/audio/title.mp3",   // 初始进入页面
  court: "assets/audio/hall.mp3",    // 日常大厅
  night: "assets/audio/hall.mp3",    // 入夜也用大厅曲，避免昼夜切换时重启
  map:   "assets/audio/world.mp3"    // 天下舆图
};

/* 五声音阶（半音偏移）：宫调 = 大五声；羽调 = 小五声(幽邃) */
const SCALE_GONG=[0,2,4,7,9], SCALE_YU=[0,3,5,7,10];
const SCENES = {
  title :{root:60, scale:SCALE_GONG, beat:0.95, density:0.55, oct:[0,1],  droneOct:-2, drum:0,   gain:0.5},
  court :{root:60, scale:SCALE_GONG, beat:0.80, density:0.6,  oct:[0,1],  droneOct:-2, drum:0,   gain:0.5},
  night :{root:57, scale:SCALE_YU,   beat:1.05, density:0.45, oct:[-1,0], droneOct:-2, drum:0,   gain:0.42},
  map   :{root:60, scale:SCALE_GONG, beat:0.85, density:0.55, oct:[0,1],  droneOct:-2, drum:0,   gain:0.5},
  battle:{root:55, scale:SCALE_YU,   beat:0.42, density:0.85, oct:[0,1],  droneOct:-1, drum:1,   gain:0.55}
};
const midi=m=>440*Math.pow(2,(m-69)/12);

function ac(){
  if(!ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null;
    ctx=new AC(); master=ctx.createGain(); master.gain.value=0.5; master.connect(ctx.destination); }
  if(ctx.state==="suspended") ctx.resume();
  return ctx;
}

/* 古筝式拨弦：基音 + 八度泛音，快起慢落（指拨衰减），轻微滑音 */
function pluck(freq,t,vel,pan){
  const c=ctx, g=c.createGain(), p=(c.createStereoPanner?c.createStereoPanner():null);
  const o1=c.createOscillator(), o2=c.createOscillator();
  o1.type="triangle"; o2.type="sine";
  o1.frequency.setValueAtTime(freq*1.004,t); o1.frequency.exponentialRampToValueAtTime(freq,t+0.06);
  o2.frequency.setValueAtTime(freq*2,t);
  const og2=c.createGain(); og2.gain.value=0.25; o2.connect(og2);
  const dur=rnd(1.1,1.8);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(vel,t+0.012);     // 快起
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);    // 慢落
  o1.connect(g); og2.connect(g);
  let tail=g; if(p){ p.pan.value=pan; g.connect(p); tail=p; }
  tail.connect(master);
  o1.start(t); o2.start(t); o1.stop(t+dur+0.05); o2.stop(t+dur+0.05);
}
/* 战鼓：低频骤降 */
function drum(t){
  const c=ctx, o=c.createOscillator(), g=c.createGain();
  o.type="sine"; o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(46,t+0.18);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.5,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+0.3);
  o.connect(g); g.connect(master); o.start(t); o.stop(t+0.35);
}

/* 低音垫：根音 + 五度，长持续微颤 */
function startDrone(cfg){
  stopDrone();
  const c=ctx, base=cfg.root+cfg.droneOct*12;
  [0,7].forEach((iv,i)=>{
    const o=c.createOscillator(), g=c.createGain();
    o.type="sine"; o.frequency.value=midi(base+iv);
    g.gain.value=0; g.gain.linearRampToValueAtTime(i?0.04:0.06, c.currentTime+2);
    const lfo=c.createOscillator(), lg=c.createGain();
    lfo.frequency.value=rnd(0.05,0.12); lg.gain.value=2; lfo.connect(lg); lg.connect(o.frequency);
    o.connect(g); g.connect(master); o.start(); lfo.start();
    drone.push(o,lfo,g);
  });
}
function stopDrone(){ const now=ctx?ctx.currentTime:0; drone.forEach(n=>{ try{ if(n.stop) n.stop(now+0.1); }catch(e){} }); drone=[]; }

/* 调度器：旋律随机游走（五声内邻音优先），按密度落子 */
let degree=0;
function scheduleBeat(t,cfg){
  if(Math.random()<cfg.density){
    degree += (Math.random()<0.5?-1:1)*(Math.random()<0.7?1:2);
    const n=cfg.scale.length;
    let idx=((degree%n)+n)%n, oct=cfg.oct[Math.floor(Math.random()*cfg.oct.length)];
    const m=cfg.root+cfg.scale[idx]+oct*12;
    pluck(midi(m), t, rnd(0.10,0.22), rnd(-0.6,0.6));
    if(Math.random()<0.25) pluck(midi(m+ (Math.random()<0.5?7:12)), t+cfg.beat*0.5, rnd(0.06,0.12), rnd(-0.6,0.6)); // 轮指余音
  }
  if(cfg.drum) drum(t);
}
function loop(){
  if(!ctx||!enabled||!scene||REAL_TRACKS[scene]) return;   // 真曲场景不再叠合成拨弦，避免冲突
  const cfg=SCENES[scene]; const ahead=0.3;
  while(nextT < ctx.currentTime+ahead){ scheduleBeat(nextT,cfg); nextT+=cfg.beat; }
}

/* ---------- 对外 ---------- */
function applyScene(name){
  const cfg=SCENES[name]||SCENES.court;
  if(master) master.gain.linearRampToValueAtTime(enabled?cfg.gain:0, ctx.currentTime+0.6);
  // 真曲覆盖
  if(REAL_TRACKS[name]){ useRealTrack(REAL_TRACKS[name], cfg.gain); return; }
  stopRealTrack();
  startDrone(cfg);
  nextT=ctx.currentTime+0.15;
}
function useRealTrack(url,vol){
  stopDrone();
  if(!audioEl){ audioEl=new Audio(); audioEl.loop=true; }
  if(audioEl.src.indexOf(url)<0){ audioEl.src=url; }
  audioEl.volume=enabled?vol:0; audioEl.play().catch(()=>{});
}
function stopRealTrack(){ if(audioEl){ audioEl.pause(); } }

function start(){
  if(started) return; if(!ac()) return; started=true;
  if(!timer) timer=setInterval(loop, 90);
  applyScene(scene||"title");
}
function setScene(name){
  if(scene===name) return; scene=name;
  if(!started){ return; }            // 待首次交互 start() 后生效
  applyScene(name);
}
function setEnabled(on){ enabled=on;
  if(ctx&&master){ const cfg=SCENES[scene]||SCENES.court; master.gain.linearRampToValueAtTime(on?cfg.gain:0, ctx.currentTime+0.4); }
  if(audioEl) audioEl.volume=on?(SCENES[scene]||SCENES.court).gain:0;
  try{ localStorage.setItem("zjjs_music", on?"1":"0"); }catch(e){}
}
function isEnabled(){ return enabled; }
function toggle(){ setEnabled(!enabled); return enabled; }
function setVolume(v){ if(master) master.gain.value=v; }

/* 读偏好 + 首次交互自动起播（绕过浏览器自动播放限制） */
try{ if(localStorage.getItem("zjjs_music")==="0") enabled=false; }catch(e){}
if(typeof document!=="undefined"){
  const kick=()=>{ start(); document.removeEventListener("pointerdown",kick); document.removeEventListener("keydown",kick); };
  document.addEventListener("pointerdown",kick); document.addEventListener("keydown",kick);
}

return { start, setScene, setEnabled, isEnabled, toggle, setVolume, _scenes:SCENES,
  _track:()=>audioEl?audioEl.src:"", _scene:()=>scene };
})();
if(typeof globalThis!=="undefined") globalThis.MusicSys=MusicSys;
