export class AudioEngine {
  constructor(){
    this.ctx = null;
    this.enabled = true;
    this.started = false;
    this.mode = 'world';
    this.timer = null;
    this.step = 0;
    this.master = null;
  }
  init(){
    if(this.started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? .13 : 0;
    this.master.connect(this.ctx.destination);
    this.started = true;
    this.startAmbient();
    this.schedule();
  }
  startAmbient(){
    if(!this.ctx) return;
    const o1=this.ctx.createOscillator(), o2=this.ctx.createOscillator(), g=this.ctx.createGain(), f=this.ctx.createBiquadFilter();
    o1.type='triangle'; o2.type='sine'; o1.frequency.value=110; o2.frequency.value=164.8;
    f.type='lowpass'; f.frequency.value=420; f.Q.value=.6;
    g.gain.value=.035;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
    o1.start(); o2.start();
    this.pad = {o1,o2,g};
    this.chordTimer = setInterval(()=>{
      if(!this.ctx||!this.enabled) return;
      const roots=[110,98,87.3,130.8];
      const r=roots[this.step%roots.length];
      const t=this.ctx.currentTime;
      this.pad.o1.frequency.setTargetAtTime(r,t,.6);
      this.pad.o2.frequency.setTargetAtTime(r*1.5,t,.8);
    },4200);
  }
  schedule(){
    clearInterval(this.timer);
    this.timer=setInterval(()=>this.tick(), 420);
  }
  tick(){
    if(!this.ctx||!this.enabled||!this.started) return;
    if(this.ctx.state==='suspended') this.ctx.resume();
    const scale=[0,3,5,7,10,12];
    const base=this.mode==='battle'?164.8:220;
    if(this.mode==='battle'){
      const seq=[0,4,2,5,1,3,2,4];
      const n=seq[this.step%seq.length];
      this.note(base*Math.pow(2,n/12),.16,'square',.012);
      if(this.step%2===0) this.note(base/2,.3,'triangle',.016);
    } else {
      if(this.step%2===0 && Math.random()<.8){
        const n=scale[Math.floor(Math.random()*scale.length)];
        this.note(base*Math.pow(2,n/12)*(Math.random()<.3?2:1),.9,'sine',.008);
      }
      if(Math.random()<.08) this.chirp();
    }
    this.step++;
  }
  note(freq,dur,type,vol=.02){
    if(!this.ctx||!this.enabled) return;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.value=freq;
    const t=this.ctx.currentTime;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.02); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+dur+.05);
  }
  chirp(){
    if(!this.ctx||!this.enabled) return;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain(); o.type='sine';
    const t=this.ctx.currentTime; const f=1200+Math.random()*1200;
    o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(f*1.4,t+.09);
    g.gain.setValueAtTime(.008,t); g.gain.exponentialRampToValueAtTime(.0001,t+.14);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+.16);
  }
  sfx(name){
    if(!this.ctx||!this.enabled) return;
    const t=this.ctx.currentTime;
    const tone=(f,d,type='sine',v=.05,slide=0)=>{
      const o=this.ctx.createOscillator(),g=this.ctx.createGain(); o.type=type;
      o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(f*slide,t+d);
      g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t+d+.03);
    };
    if(name==='click') tone(520,.06,'triangle',.04,1.15);
    else if(name==='open'){ tone(330,.1,'sine',.04,1.5); setTimeout(()=>tone(495,.14,'sine',.035,1.3),60); }
    else if(name==='close'){ tone(400,.1,'sine',.035,.7); }
    else if(name==='catch'){ tone(660,.12,'square',.04,1.5); setTimeout(()=>tone(990,.18,'square',.04,1.2),120); setTimeout(()=>tone(1320,.3,'sine',.05),280); }
    else if(name==='hit'){ tone(120,.12,'sawtooth',.055,.5); }
    else if(name==='super'){ tone(180,.18,'square',.05,1.7); setTimeout(()=>tone(300,.12,'sawtooth',.04,.6),80); }
    else if(name==='flee'){ tone(420,.2,'sine',.03,.4); }
    else if(name==='level'){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.2,'triangle',.04),i*90)); }
    else if(name==='coin'){ tone(880,.08,'square',.03,1.2); setTimeout(()=>tone(1174,.14,'square',.03),70); }
    else if(name==='heal'){ [440,554,659].forEach((f,i)=>setTimeout(()=>tone(f,.35,'sine',.035),i*110)); }
    else if(name==='throw'){ tone(280,.18,'sine',.03,2.2); }
  }
  setMode(mode){ this.mode=mode; }
  toggle(){
    this.enabled=!this.enabled;
    if(this.master) this.master.gain.setTargetAtTime(this.enabled?.13:0,this.ctx.currentTime,.1);
    return this.enabled;
  }
}
