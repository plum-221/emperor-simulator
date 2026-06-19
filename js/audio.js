/* ===================================================================
   audio.js —— 用 Web Audio API 实时合成音效（无需任何音频文件）
   暴露全局 SFX 对象：SFX.deal() / pick() / good() / bad() / warn() / gong() / end()
   =================================================================== */
const SFX = (() => {
  let ctx = null, muted = false;

  function ac(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(AC) ctx = new AC();
    }
    if(ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // 单个音：频率、时长、波形、音量、起止频率（滑音）
  function tone(freq, dur, type="sine", vol=0.18, freqEnd=null, delay=0){
    const c = ac(); if(!c || muted) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if(freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  // 噪声（用于钟、纸张）
  function noise(dur, vol=0.12, filterFreq=1200, delay=0){
    const c = ac(); if(!c || muted) return;
    const t0 = c.currentTime + delay;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/n, 2);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type="bandpass"; f.frequency.value=filterFreq; f.Q.value=0.8;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t0);
  }

  return {
    setMuted(m){ muted = m; },
    isMuted(){ return muted; },
    unlock(){ ac(); },                                    // 首次交互时解锁
    deal(){ noise(0.18, 0.10, 2200); },                   // 翻奏折（纸声）
    pick(){ tone(523,0.08,"triangle",0.16); tone(784,0.10,"triangle",0.14,null,0.05); },
    good(){ tone(660,0.12,"sine",0.16); tone(990,0.16,"sine",0.14,null,0.08); },
    bad(){ tone(330,0.16,"sawtooth",0.14,180); },
    warn(){ tone(440,0.12,"square",0.14); tone(440,0.12,"square",0.14,null,0.18); },
    gong(){ noise(1.2,0.18,180); tone(140,1.4,"sine",0.20,90); tone(220,1.2,"sine",0.10,140,0.02); },
    end(){ tone(196,0.5,"sine",0.18,120); tone(147,0.9,"sine",0.16,90,0.2); noise(1.0,0.10,160,0.1); }
  };
})();
