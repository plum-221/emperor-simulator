/* ===== VN 对话引擎（galgame 式攻略剧情）=====
   VNSys.play(opts, onChoose)
   opts = {
     name,         // 默认说话人（嫔妃名）
     faceBase,     // 立绘前缀 → faceBase+表情key+".jpg"
     fallbackFace, // 立绘加载失败时回退（单张头像）
     cgBase,       // CG 前缀 → cgBase+key+".jpg"
     bg,           // 立绘场景的背景图
     script:[ {who?, txt, face?, cg?} ... ],  // who 省略=旁白；face 持续生效；cg=该句切大图
     choices:[ {text} ... ]
   }
   onChoose(i) 在玩家选定后回调（外部用它走 resolveEvent 结算）。*/
const VNSys = (function(){
  let root=null, opts=null, lines=[], i=0, curFace=null, onChoose=null, done=false;

  function el(){ return document.getElementById("vn"); }

  function build(){
    if(el()) return;
    const d=document.createElement("div");
    d.id="vn"; d.className="vn";
    d.innerHTML=`
      <div class="vn-bg" id="vn-bg"></div>
      <div class="vn-cg" id="vn-cg"></div>
      <img class="vn-sprite" id="vn-sprite" alt="">
      <div class="vn-skip" id="vn-skip">跳过 ▸</div>
      <div class="vn-box" id="vn-box">
        <div class="vn-name" id="vn-name"></div>
        <div class="vn-text" id="vn-text"></div>
        <div class="vn-next" id="vn-next">▼</div>
      </div>
      <div class="vn-choices" id="vn-choices"></div>`;
    (document.getElementById("app")||document.body).appendChild(d);
    // 点击对话区推进（点选项区/跳过不算）
    d.addEventListener("click",e=>{
      if(done) return;
      if(e.target.closest(".vn-choices")||e.target.closest(".vn-skip")) return;
      advance();
    });
    document.getElementById("vn-skip").addEventListener("click",()=>{ if(!done) toChoices(); });
    root=d;
  }

  function render(line){
    const cg=document.getElementById("vn-cg"), sp=document.getElementById("vn-sprite"),
          bg=document.getElementById("vn-bg"), nm=document.getElementById("vn-name"),
          tx=document.getElementById("vn-text"), nx=document.getElementById("vn-next");
    if(line.face) curFace=line.face;
    if(line.cg){                                   // CG 大图模式：隐立绘
      cg.style.backgroundImage=`url('${opts.cgBase}${line.cg}.jpg')`;
      cg.classList.add("show"); sp.classList.remove("show");
    }else{                                         // 立绘模式
      cg.classList.remove("show");
      const src=opts.faceBase+(curFace||"neutral")+".jpg";
      if(sp.getAttribute("src")!==src){ sp.onerror=()=>{ if(opts.fallbackFace) sp.src=opts.fallbackFace; }; sp.src=src; }
      sp.classList.add("show");
    }
    bg.style.backgroundImage=`url('${opts.bg}')`;
    if(line.who){ nm.textContent=line.who; nm.style.display=""; tx.classList.remove("narration"); }
    else { nm.style.display="none"; tx.classList.add("narration"); }   // 旁白
    tx.textContent=line.txt;
    tx.classList.remove("vn-in"); void tx.offsetWidth; tx.classList.add("vn-in");   // 重播淡入
    nx.style.display = (i>=lines.length-1)?"none":"";
  }

  function advance(){
    if(i>=lines.length-1){ toChoices(); return; }
    i++; render(lines[i]);
  }

  function toChoices(){
    done=true;
    document.getElementById("vn-next").style.display="none";
    const box=document.getElementById("vn-choices");
    box.innerHTML=(opts.choices||[{text:"…"}]).map((c,idx)=>`<button class="vn-choice" data-i="${idx}">${c.text}</button>`).join("");
    box.classList.add("show");
    [...box.querySelectorAll(".vn-choice")].forEach(b=>{
      b.onclick=()=>{ const idx=+b.dataset.i; teardown(); if(onChoose) onChoose(idx); };
    });
  }

  function teardown(){
    if(typeof MusicSys!=="undefined") MusicSys.setScene("court");
    const d=el(); if(d) d.remove(); root=null;
  }

  function play(o, cb){
    build();
    opts=o; lines=o.script||[]; i=0; curFace=null; onChoose=cb; done=false;
    if(typeof SFX!=="undefined"&&SFX.unlock) SFX.unlock();
    if(typeof MusicSys!=="undefined") MusicSys.setScene("night");
    document.getElementById("vn-choices").classList.remove("show");
    document.getElementById("vn-choices").innerHTML="";
    if(!lines.length){ toChoices(); return; }
    render(lines[0]);
  }

  return { play };
})();
