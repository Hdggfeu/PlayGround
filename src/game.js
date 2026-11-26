import {
  ZONES, ZONE_BY_ID, ITEMS, SHOP_STOCK, NPCS, TRAINER_NAMES,
  QUEST_DEFS, TYPE_COLORS, createMon, healMon, xpToNext, spriteUrl, padDex, clamp, rand, pick,
  getZoneAt, biomeSpawns, typeEffect
} from './data.js';
import {
  t, getLang, setLang, applyStaticI18n, speciesName, zoneName, zoneSubtitle, zoneDesc, zoneTip,
  npcName, npcRole, npcLines, questText, itemName, itemDesc, typeName, moveName, natureName,
  trainerTitle, biomeName, botLines, chatSeeds, emoteName, LANGUAGES, lv
} from './i18n.js';
import { World, T, MAP_W, MAP_H } from './world.js';
import { Battle } from './battle.js';
import { AudioEngine } from './audio.js';

const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const fmt = n=>Math.round(n).toLocaleString(getLang()==='fr'?'fr-FR':'en-US');

const PALETTES = [
  {cap:'#70c9ff',jacket:'#456b8a',shirt:'#e6e4d4',skin:'#d9a37e',hair:'#2e2620',bag:'#9b7a4c',accent:'#70c9ff'},
  {cap:'#c9f46c',jacket:'#5d7a48',shirt:'#efe9d4',skin:'#b77d57',hair:'#3d2c21',bag:'#bb8d4f',accent:'#c9f46c'},
  {cap:'#ff9ecb',jacket:'#8a4f72',shirt:'#f4e5db',skin:'#e7b38b',hair:'#6d3e35',bag:'#d6a76d',accent:'#ff9ecb'},
  {cap:'#ffb254',jacket:'#8a5c3b',shirt:'#f3e7cd',skin:'#c98d61',hair:'#2e2119',bag:'#7d5b3a',accent:'#ffb254'},
  {cap:'#b49cff',jacket:'#5a4d7d',shirt:'#e7e0f0',skin:'#dca77d',hair:'#3a2c42',bag:'#8d6e5a',accent:'#b49cff'},
  {cap:'#ff7b62',jacket:'#7d4c45',shirt:'#f0e5d0',skin:'#e2b287',hair:'#4b2e24',bag:'#c79a53',accent:'#ff7b62'}
];
const LANDING = {
  hollow:[74.9,69.7], meadow:[74,86], forest:[45,64], lake:[96.5,63], volcano:[109,86],
  snow:[53,30], coast:[129,78], swamp:[78,98], peak:[76,34]
};
const TITLES = ['Ranger','Collector','Explorer','Breeder','Ace Trainer','Wanderer','Researcher','Gym Challenger'];

export class Game {
  constructor(data){
    this.data=data;
    this.world=new World(data);
    this.audio=new AudioEngine();
    this.battle=new Battle(this);
    this.canvas=$('#world');
    this.ctx=this.canvas.getContext('2d');
    this.dpr=1; this.vw=innerWidth; this.vh=innerHeight;
    this.cam={x:0,y:0,ready:false};
    this.keys=new Set();
    this.touch={x:0,y:0,active:false};
    this.sprites=new Map();
    this.wilds=[]; this.bots=[]; this.remotePlayers=new Map();
    this.particles=[];
    this.chatMessages={global:[],local:[],party:[]};
    this.chatTab='global';
    this.chatUnread={global:0,local:0,party:0};
    this.modalOpen=false;
    this.paused=false;
    this.interactTarget=null;
    this.lastBattleEnd=0;
    this.clock=10*60+24;
    this.eventEnds=Date.now()+14*60*1000+32*1000;
    this.onlineCount=1284;
    this.playerId='tr-'+Math.random().toString(36).slice(2,9);
    this.quests={main:{talk:0,catch:0,level:14,claimed:false},side1:{sprig:0,claimed:false},side2:{coast:0,claimed:false},raid:{raid:0,claimed:false}};
    this.visited=new Set(['hollow']);
    this.box=[];
    this.settings={particles:true,dayNight:true,sound:true,language:getLang(),tutorialSeen:false};
    this.evoMap={};
    for(const m of data){ if(m.evolves_from){ if(!this.evoMap[m.evolves_from]) this.evoMap[m.evolves_from]=[]; this.evoMap[m.evolves_from].push(m); } }
    this.lastUpdate=0; this.lastMinimap=0; this.lastHud=0; this.lastSave=0; this.lastChat=0; this.lastPrompt=0;
    this.load();
    setLang(this.settings.language||getLang());
    this.party.forEach(m=>{ if(m.base) m.name=speciesName(m.base); });
    this.box.forEach(m=>{ if(m.base) m.name=speciesName(m.base); });
    this.zone=this.world.zoneAt(this.player.x,this.player.y);
  }

  init(){
    this.resize();
    applyStaticI18n();
    this.updateLangButton();
    this.bindUI();
    this.setupMultiplayer();
    this.preload();
    this.spawnWilds(true);
    this.spawnTownCritters();
    this.spawnBots();
    this.seedChat();
    this.updateHud();
    this.renderParty();
    this.renderChat();
    this.drawAvatar();
    this.initParticles();
    this.cam.x=this.player.x*T-this.vw/2;
    this.cam.y=this.player.y*T-this.vh/2;
    this.clampCamera();
    setTimeout(()=>{ $('#boot').classList.add('hidden'); },420);
    setTimeout(()=>this.showZoneBanner(this.zone),700);
    setTimeout(()=>this.toast(t('toast.welcomeTitle'),t('toast.welcomeBody'),'purple'),2200);
    if(!this.settings.tutorialSeen){
      setTimeout(()=>{ if(!this.modalOpen&&!this.battle.active) this.openTutorial(true); },3600);
    }
    const today=new Date().toDateString();
    if(localStorage.getItem('terraverse_daily')!==today){
      localStorage.setItem('terraverse_daily',today); this.bag.pokeball+=3;
      setTimeout(()=>this.toast(t('toast.dailyTitle'),t('toast.dailyBody'),'gold'),5200);
    }
    this.updateHud();
    this.loop(performance.now());
    this.save();
  }

  /* ---------------- persistence ---------------- */
  defaultState(){
    this.player={name:'Nova',x:74.9,y:69.7,dir:'down',frame:0,moving:false,level:14,xp:4200,coins:2450,rank:'RANGER',playtime:0};
    this.party=[
      createMon(25,13,this.data),
      createMon(906,12,this.data),
      createMon(937,14,this.data)
    ];
    this.party[0].xp=480;
    this.bag={pokeball:12,greatball:4,ultraball:1,potion:5,superpotion:2,revive:1,berry:3,lure:1};
    this.dex={seen:new Set([25,906,937,1,4,7,16,19,133,194,396,399]),caught:new Set([25,906,937])};
    this.quests={main:{talk:0,catch:0,level:14,claimed:false},side1:{sprig:0,claimed:false},side2:{coast:0,claimed:false},raid:{raid:0,claimed:false}};
    this.visited=new Set(['hollow']);
    this.box=[];
  }

  load(){
    let save=null;
    try{ save=JSON.parse(localStorage.getItem('terraverse_save_v2')||'null'); }catch{}
    if(!save||!save.party){ this.defaultState(); return; }
    try{
      this.player={...save.player};
      this.player.x=Number(this.player.x)||75.2; this.player.y=Number(this.player.y)||73.2;
      this.party=save.party.map(p=>{
        const m=createMon(p.id,p.level,this.data,{hp:p.hp,xp:p.xp,uid:p.uid,nature:p.nature,shiny:p.shiny});
        if(p.moves) m.moves=p.moves.map(sm=>({...sm,maxPp:sm.maxPp||sm.pp}));
        return m;
      });
      if(!this.party.length) this.defaultState();
      this.bag={pokeball:12,greatball:4,ultraball:1,potion:5,superpotion:2,revive:1,berry:3,lure:1,...(save.bag||{})};
      this.dex={seen:new Set(save.dex?.seen||[25,906,937]),caught:new Set(save.dex?.caught||[25,906,937])};
      this.quests={...this.quests,...(save.quests||{})};
      this.visited=new Set(save.visited||['hollow']);
      this.box=(save.box||[]).map(p=>createMon(p.id,p.level,this.data,{hp:p.hp,xp:p.xp,nature:p.nature,shiny:p.shiny}));
      this.settings={...this.settings,...(save.settings||{})};
      this.audio.enabled=this.settings.sound!==false;
    }catch(e){
      console.warn('Save was incompatible, starting fresh.',e);
      this.defaultState();
    }
  }

  save(){
    try{
      const data={
        v:2, savedAt:Date.now(),
        player:{...this.player},
        party:this.party.map(p=>({id:p.id,level:p.level,hp:p.hp,xp:p.xp,uid:p.uid,nature:p.nature,shiny:p.shiny,moves:p.moves})),
        bag:this.bag, dex:{seen:[...this.dex.seen],caught:[...this.dex.caught]},
        quests:this.quests, visited:[...this.visited], settings:this.settings,
        box:this.box.map(p=>({id:p.id,level:p.level,hp:p.hp,xp:p.xp,nature:p.nature,shiny:p.shiny}))
      };
      localStorage.setItem('terraverse_save_v2',JSON.stringify(data));
      this.lastSave=performance.now();
    }catch{}
  }

  reset(){
    localStorage.removeItem('terraverse_save_v2');
    location.reload();
  }

  updateLangButton(){
    const el=$('#btnLang'); if(el) el.textContent=getLang().toUpperCase();
  }

  setLanguage(lang){
    setLang(lang);
    this.settings.language=getLang();
    this.party.forEach(m=>{ if(m.base) m.name=speciesName(m.base); });
    this.box.forEach(m=>{ if(m.base) m.name=speciesName(m.base); });
    this.wilds.forEach(w=>{ const base=this.data[w.id-1]; if(base) w.name=speciesName(base); });
    this.bots.forEach(b=>{ const z=ZONE_BY_ID[b.zoneId]; if(z) b.zone=zoneName(z); if(b.titleKey) b.title=trainerTitle(b.titleKey); });
    this.chatMessages={global:[],local:[],party:[]};
    this.chatUnread={global:0,local:0,party:0};
    this.seedChat();
    applyStaticI18n();
    this.updateLangButton();
    this.updateHud();
    this.renderParty();
    this.renderChat();
    this.save();
    if(this.modalOpen) this.openSettings();
    else this.toast(t('toast.languageTitle'),t('toast.languageBody'),'purple');
  }

  /* ---------------- boot helpers ---------------- */
  resize(){
    this.dpr=Math.min(window.devicePixelRatio||1,2);
    this.vw=window.innerWidth; this.vh=window.innerHeight;
    this.canvas.width=Math.floor(this.vw*this.dpr);
    this.canvas.height=Math.floor(this.vh*this.dpr);
    this.canvas.style.width=this.vw+'px'; this.canvas.style.height=this.vh+'px';
  }

  getSprite(id){
    if(!id) return null;
    let img=this.sprites.get(id);
    if(!img){ img=new Image(); img.decoding='async'; img.src=spriteUrl(id); this.sprites.set(id,img); }
    return img;
  }

  preload(){
    const ids=new Set([...this.party.map(p=>p.id),384]);
    this.world.npcs.forEach(n=>n.sprite&&ids.add(n.sprite));
    this.wilds.slice(0,14).forEach(w=>ids.add(w.id));
    this.bots.slice(0,8).forEach(b=>ids.add(b.lead));
    ids.forEach(id=>this.getSprite(id));
    // Warm the most recognisable dex entries for the first page.
    for(let id=1;id<=36;id++) this.getSprite(id);
  }

  /* ---------------- input ---------------- */
  bindUI(){
    window.addEventListener('resize',()=>this.resize());
    window.addEventListener('keydown',e=>this.onKeyDown(e));
    window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur',()=>this.keys.clear());
    this.canvas.addEventListener('pointerdown',e=>this.onCanvasClick(e));

    $('#chatForm').addEventListener('submit',e=>{e.preventDefault();this.sendChat();});
    $('#chatInput').addEventListener('focus',()=>{this.keys.clear();});
    $('#chatMin').onclick=()=>{ $('#chatDock').classList.toggle('minimized'); this.audio.sfx('click'); };
    $$('.chat-tab').forEach(b=>b.onclick=()=>{
      this.chatTab=b.dataset.chat; this.chatUnread[this.chatTab]=0;
      $$('.chat-tab').forEach(x=>x.classList.toggle('active',x===b));
      this.renderChat(); this.audio.sfx('click');
    });

    $('#btnMap').onclick=()=>this.openMap();
    $('#btnMap2').onclick=()=>this.openMap();
    $('#btnSocial').onclick=()=>this.openSocial();
    $('#btnProfile').onclick=()=>this.openParty(0);
    $('#btnParty').onclick=()=>this.openParty(0);
    $('#btnRaid').onclick=()=>this.openRaid();
    $('#btnSettings').onclick=()=>this.openSettings();
    $('#btnLang').onclick=()=>this.setLanguage(getLang()==='fr'?'en':'fr');
    $('#btnSound').onclick=()=>{
      this.audio.init(); const on=this.audio.toggle(); this.settings.sound=on;
      $('#btnSound').style.color=on?'':'#6d8178';
      this.toast(on?t('toast.soundOnTitle'):t('toast.soundOffTitle'),on?t('toast.soundOnBody'):t('toast.soundOffBody'),'purple');
      this.save();
    };
    $$('.slot').forEach(s=>s.onclick=()=>this.hotbar(s.dataset.slot));
    $('#interactPrompt').onclick=()=>this.interact();

    $('#btnRaid').onclick=()=>this.openRaid();
    $('#eventSprite').onerror=()=>{};
    $$('.touch-menu button').forEach(b=>b.onclick=()=>this.hotbar(b.dataset.touch));
    $('#touchInteract').onclick=()=>this.interact();
    $('#touchBall').onclick=()=>this.quickCatch();
    this.bindJoystick();

    // First gesture unlocks WebAudio.
    const unlock=()=>{ this.audio.init(); window.removeEventListener('pointerdown',unlock); window.removeEventListener('keydown',unlock); };
    window.addEventListener('pointerdown',unlock,{once:true});
    window.addEventListener('keydown',unlock,{once:true});
  }

  bindJoystick(){
    const joy=$('#joystick'), knob=$('#joyKnob');
    let id=null;
    const update=(e)=>{
      const r=joy.getBoundingClientRect();
      let dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2);
      const max=r.width*.32, len=Math.hypot(dx,dy);
      if(len>max){ dx=dx/len*max; dy=dy/len*max; }
      knob.style.transform=`translate(${dx}px,${dy}px)`;
      this.touch.x=dx/max; this.touch.y=dy/max; this.touch.active=true;
    };
    joy.addEventListener('pointerdown',e=>{ id=e.pointerId; joy.setPointerCapture(id); update(e); e.preventDefault(); });
    joy.addEventListener('pointermove',e=>{ if(e.pointerId===id) update(e); });
    const end=e=>{ if(e.pointerId!==id) return; id=null; this.touch.active=false; this.touch.x=0; this.touch.y=0; knob.style.transform=''; };
    joy.addEventListener('pointerup',end); joy.addEventListener('pointercancel',end);
  }

  onKeyDown(e){
    if(this.battle.active) return;
    const tag=document.activeElement?.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA'){
      if(e.key==='Escape') document.activeElement.blur();
      return;
    }
    const k=e.key.toLowerCase();
    if(e.key==='Escape'){
      if(this.modalOpen) this.closeModal();
      else if($('#chatDock').classList.contains('minimized')) $('#chatDock').classList.remove('minimized');
      return;
    }
    if(this.modalOpen) return;
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(k)){
      this.keys.add(k); if(k===' '||k.startsWith('arrow')) e.preventDefault();
    }
    if(e.repeat) return;
    if(k==='e'||k===' '){ this.interact(); e.preventDefault(); }
    else if(k==='m') this.openMap();
    else if(k==='d') this.openDex();
    else if(k==='p') this.openParty(0);
    else if(k==='b') this.openBag();
    else if(k==='j') this.openQuests();
    else if(k==='o') this.openSocial();
    else if(k==='x') this.openEmotes();
    else if(k==='enter'){ $('#chatInput').focus(); e.preventDefault(); }
    else if(k==='1') this.selectBall('pokeball');
    else if(k==='2') this.selectBall('greatball');
    else if(k==='3') this.usePotionOnLead();
  }

  onCanvasClick(e){
    if(this.modalOpen||this.battle.active||this.paused) return;
    const wx=(e.clientX+this.cam.x)/T, wy=(e.clientY+this.cam.y)/T;
    let best=null,bd=2.2;
    for(const w of this.wilds){ const d=Math.hypot(w.x-wx,w.y-wy); if(d<bd){bd=d;best={type:'wild',w};} }
    for(const n of this.world.npcs){ const d=Math.hypot(n.x-wx,n.y-wy); if(d<bd){bd=d;best={type:'npc',n};} }
    if(best?.type==='wild') this.startWildBattle(best.w);
    else if(best?.type==='npc') this.talkNpc(best.n);
  }

  /* ---------------- main loop ---------------- */
  loop(now){
    const dt=Math.min(.05,Math.max(0,(now-this.lastUpdate)/1000)); this.lastUpdate=now;
    if(!this.paused&&!this.modalOpen&&!this.battle.active) this.update(dt,now);
    else this.updateAmbient(dt,now);
    this.render(now);
    if(now-this.lastMinimap>120){ this.world.drawMinimap($('#minimap'),this,now); this.lastMinimap=now; }
    if(now-this.lastHud>1400){ this.updateHud(); this.lastHud=now; }
    if(now-this.lastSave>12000){ this.save(); this.lastSave=now; }
    if(now-this.lastChat>22000){ this.botChat(); this.lastChat=now; }
    if(now-this.lastPrompt>90){ this.updateInteraction(); this.lastPrompt=now; }
    requestAnimationFrame(t=>this.loop(t));
  }

  update(dt,now){
    this.player.playtime=(this.player.playtime||0)+dt;
    this.clock+=dt*.22;
    if(this.clock>=1440) this.clock-=1440;
    this.updatePlayer(dt,now);
    this.updateCamera(dt);
    this.updateWilds(dt,now);
    this.updateBots(dt);
    this.updateParticles(dt);
    this.pruneRemotes(now);
    this.checkZone();
    this.updateEventTimer();
    if(Math.random()<dt*.18) this.remoteState();
    this.renderEventTimer();
  }

  updateAmbient(dt,now){
    this.clock+=dt*.22;
    this.updateParticles(dt);
    this.updateCamera(dt,true);
    this.pruneRemotes(now);
    this.updateBots(dt*.35);
    this.updateEventTimer();
    this.renderEventTimer();
  }

  updatePlayer(dt,now){
    let dx=0,dy=0;
    if(this.keys.has('a')||this.keys.has('arrowleft')) dx-=1;
    if(this.keys.has('d')||this.keys.has('arrowright')) dx+=1;
    if(this.keys.has('w')||this.keys.has('arrowup')) dy-=1;
    if(this.keys.has('s')||this.keys.has('arrowdown')) dy+=1;
    if(this.touch.active){ dx+=this.touch.x; dy+=this.touch.y; }
    const len=Math.hypot(dx,dy);
    if(len>.12){
      dx/=Math.max(1,len); dy/=Math.max(1,len);
      const sprint=(this.keys.has('shift')||Math.hypot(this.touch.x,this.touch.y)>.86)?1.55:1;
      const speed=4.55*sprint;
      const nx=this.player.x+dx*speed*dt;
      const ny=this.player.y+dy*speed*dt;
      if(this.world.isWalkable(nx,this.player.y)) this.player.x=nx;
      if(this.world.isWalkable(this.player.x,ny)) this.player.y=ny;
      this.player.moving=true;
      if(Math.abs(dx)>Math.abs(dy)) this.player.dir=dx>0?'right':'left';
      else this.player.dir=dy>0?'down':'up';
      this.player.frame=Math.floor(now/125)%4;
      if(Math.random()<dt*7) this.audio.chirp();
    } else {
      this.player.moving=false; this.player.frame=0;
    }
  }

  updateCamera(dt,instant=false){
    const targetX=clamp(this.player.x*T-this.vw/2,0,MAP_W*T-this.vw);
    const targetY=clamp(this.player.y*T-this.vh/2,0,MAP_H*T-this.vh);
    if(instant||!this.cam.ready){ this.cam.x=targetX; this.cam.y=targetY; this.cam.ready=true; }
    else {
      const k=1-Math.pow(.0008,dt);
      this.cam.x+=(targetX-this.cam.x)*k;
      this.cam.y+=(targetY-this.cam.y)*k;
    }
  }

  clampCamera(){
    this.cam.x=clamp(this.cam.x,0,MAP_W*T-this.vw);
    this.cam.y=clamp(this.cam.y,0,MAP_H*T-this.vh);
  }

  checkZone(){
    const z=this.world.zoneAt(this.player.x,this.player.y);
    if(z.id!==this.zone.id){
      this.zone=z;
      this.visited.add(z.id);
      this.showZoneBanner(z);
      this.initParticles();
      this.spawnWilds(false);
      if(z.id==='coast'){ this.questEvent('coast'); }
      this.updateHud();
    }
  }

  /* ---------------- world life ---------------- */
  spawnWilds(initial=false){
    const target=initial?28:28;
    let guard=0;
    while(this.wilds.length<target&&guard++<90){
      let zone=this.zone.id==='hollow'?ZONE_BY_ID.meadow:this.zone;
      if(Math.random()<.16) zone=pick(ZONES.filter(z=>z.id!=='hollow'&&z.id!==this.zone.id));
      let x=this.player.x+rand(-16,16), y=this.player.y+rand(-13,13);
      let tries=0;
      while(tries++<18&&(!this.world.isWalkable(x,y)||this.world.zoneAt(x,y).id==='hollow'||Math.hypot(x-this.player.x,y-this.player.y)<3.4)){
        x=this.player.x+rand(-17,17); y=this.player.y+rand(-13,13);
      }
      if(tries>=18) continue;
      if(this.wilds.some(w=>Math.hypot(w.x-x,w.y-y)<1.5)) continue;
      const spawn=biomeSpawns(zone,this.data,1,this.player.level)[0];
      if(!spawn) continue;
      const base=this.data[spawn.id-1];
      this.wilds.push({...spawn,x,y,name:speciesName(base),dir:pick(['left','right','up','down']),phase:Math.random()*6.28,vx:0,vy:0,turnAt:performance.now()+rand(1000,5000),wander:true});
      this.getSprite(spawn.id);
    }
    // Keep the herd from becoming stale.
    const now=performance.now();
    this.wilds=this.wilds.filter(w=>{
      const d=Math.hypot(w.x-this.player.x,w.y-this.player.y);
      if(d>31&&this.wilds.length>8) return false;
      return now-w.turnAt<30000||true;
    });
  }

  spawnTownCritters(){
    const critters=[[16,5,71.4,66.6],[133,7,78.4,66.8],[194,6,71.2,62.8],[819,8,79.6,62.4],[25,9,73.0,71.2],[399,5,77.6,72.0]];
    for(const [id,level,x,y] of critters){
      if(!this.world.isWalkable(x,y)) continue;
      const base=this.data[id-1];
      this.wilds.push({id,level,shiny:id===133&&Math.random()<.35,x,y,name:speciesName(base),dir:pick(['left','right','up','down']),phase:Math.random()*6.28,vx:0,vy:0,turnAt:performance.now()+rand(1000,5000),wander:true,town:true});
      this.getSprite(id);
    }
  }

  updateWilds(dt,now){
    for(const w of this.wilds){
      const d=Math.hypot(w.x-this.player.x,w.y-this.player.y);
      if(d>33) continue;
      if(now>w.turnAt){
        w.turnAt=now+rand(2200,6500);
        if(Math.random()<.58){ const a=Math.random()*6.28; w.vx=Math.cos(a)*.28; w.vy=Math.sin(a)*.28; w.dir=Math.abs(w.vx)>Math.abs(w.vy)?(w.vx>0?'right':'left'):(w.vy>0?'down':'up'); }
        else { w.vx=0; w.vy=0; w.dir=pick(['left','right','up','down']); }
      }
      if(w.vx||w.vy){
        const nx=w.x+w.vx*dt, ny=w.y+w.vy*dt;
        if(this.world.isWalkable(nx,ny)){ w.x=nx; w.y=ny; }
        else { w.vx*=-1; w.vy*=-1; }
      }
      if(d<2.2&&Math.random()<dt*2){ w.dir=Math.abs(this.player.x-w.x)>Math.abs(this.player.y-w.y)?(this.player.x>w.x?'right':'left'):(this.player.y>w.y?'down':'up'); }
    }
    this.spawnWilds(false);
  }

  spawnBots(){
    const points=[['hollow',76.6,66.4],['hollow',71.4,65.6],['hollow',82.2,64.4],['meadow',77,84],['meadow',70,86],['forest',47,65],['forest',42,58],['lake',97,62],['lake',102,65],['coast',128,77],['volcano',110,86],['snow',53,31],['swamp',78,98],['peak',76,36]];
    const leads=[25,133,906,935,448,658,778,745,887,887,1007,282,94,384];
    this.bots=points.map(([zone,x,y],i)=>{
      const z=ZONE_BY_ID[zone];
      if(!this.world.isWalkable(x,y)){ x+=rand(-2,2); y+=rand(-2,2); }
      return {
        id:'bot-'+i, name:TRAINER_NAMES[i%TRAINER_NAMES.length], level:8+Math.floor(rand(0,26)),
        title:trainerTitle(TITLES[i%TITLES.length]), titleKey:TITLES[i%TITLES.length], x,y, homeX:x, homeY:y, zone:zoneName(z), zoneId:z.id, lead:leads[i%leads.length],
        palette:PALETTES[i%PALETTES.length], dir:pick(['down','left','right','up']), frame:0,
        phase:Math.random()*6.28, targetX:x,targetY:y, nextTurn:0
      };
    });
  }

  updateBots(dt){
    const now=performance.now();
    for(const b of this.bots){
      if(Math.hypot(b.x-this.player.x,b.y-this.player.y)>26){ b.frame=0; continue; }
      if(now>b.nextTurn){
        b.nextTurn=now+rand(2600,7200);
        const a=Math.random()*6.28;
        b.targetX=b.homeX+Math.cos(a)*rand(1,6);
        b.targetY=b.homeY+Math.sin(a)*rand(1,5);
      }
      const dx=b.targetX-b.x, dy=b.targetY-b.y, d=Math.hypot(dx,dy);
      if(d>.25){
        const sp=.85;
        const nx=b.x+dx/d*sp*dt, ny=b.y+dy/d*sp*dt;
        if(this.world.isWalkable(nx,ny)){ b.x=nx; b.y=ny; b.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'); b.frame=Math.floor(now/160)%4; }
        else { b.nextTurn=0; }
      } else b.frame=0;
    }
  }

  pruneRemotes(now){
    for(const [id,p] of this.remotePlayers){ if(now-p.lastSeen>4500) this.remotePlayers.delete(id); }
  }

  /* ---------------- particles & render ---------------- */
  initParticles(){
    const biome=this.zone?.biome||'meadow';
    const count=this.vw<700?32:64;
    this.particles=[];
    for(let i=0;i<count;i++){
      const type=biome==='snow'?'snow':biome==='volcano'?'ember':biome==='swamp'?'firefly':biome==='forest'?'leaf':biome==='coast'?'spray':'pollen';
      this.particles.push({type,x:Math.random()*this.vw,y:Math.random()*this.vh,vx:rand(-6,6),vy:type==='snow'?rand(10,24):type==='ember'?rand(-18,-6):rand(-5,5),size:rand(1,3),phase:Math.random()*6.28,alpha:rand(.2,.7)});
    }
  }

  updateParticles(dt){
    for(const p of this.particles){
      p.x+=p.vx*dt; p.y+=p.vy*dt;
      if(p.type==='pollen') p.x+=Math.sin(performance.now()*.0006+p.phase)*.15;
      if(p.x<-10)p.x=this.vw+10; if(p.x>this.vw+10)p.x=-10;
      if(p.y<-10)p.y=this.vh+10; if(p.y>this.vh+10)p.y=-10;
    }
  }

  render(now){
    const ctx=this.ctx;
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    ctx.clearRect(0,0,this.vw,this.vh);
    this.world.draw(ctx,this,this.cam,this.vw,this.vh,now);
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    if(this.settings.particles) this.drawParticles(ctx);
    this.drawLighting(ctx);
  }

  drawParticles(ctx){
    for(const p of this.particles){
      const pulse=.6+Math.sin(performance.now()*.002+p.phase)*.4;
      if(p.type==='pollen'){ ctx.fillStyle=`rgba(240,238,170,${p.alpha*.65})`; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*.7,0,6.28); ctx.fill(); }
      else if(p.type==='snow'){ ctx.fillStyle=`rgba(248,253,255,${p.alpha})`; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,6.28); ctx.fill(); }
      else if(p.type==='ember'){ ctx.fillStyle=`rgba(255,150,64,${p.alpha*pulse})`; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*.8,0,6.28); ctx.fill(); }
      else if(p.type==='firefly'){ ctx.fillStyle=`rgba(206,255,127,${p.alpha*pulse})`; ctx.shadowColor='#c9f46c'; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*.8,0,6.28); ctx.fill(); ctx.shadowBlur=0; }
      else if(p.type==='leaf'){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(now*.001+p.phase); ctx.fillStyle=`rgba(167,205,101,${p.alpha*.6})`; ctx.fillRect(-p.size,-p.size*.5,p.size*2,p.size); ctx.restore(); }
      else if(p.type==='spray'){ ctx.fillStyle=`rgba(204,238,240,${p.alpha*.4})`; ctx.fillRect(p.x,p.y,p.size*1.5,p.size*.6); }
    }
  }

  drawLighting(ctx){
    if(!this.settings.dayNight) return;
    const hour=(this.clock/60)%24;
    let tint=null, alpha=0;
    if(hour>17.5&&hour<20){ tint='rgba(255,142,69,'; alpha=(hour-17.5)/2.5*.15; }
    else if(hour>20||hour<5){ tint='rgba(22,42,83,'; alpha=.26; }
    if(tint){ ctx.fillStyle=tint+alpha+')'; ctx.fillRect(0,0,this.vw,this.vh); }
    const g=ctx.createLinearGradient(0,0,this.vw,this.vh);
    g.addColorStop(0,'rgba(255,244,190,.055)'); g.addColorStop(.4,'rgba(255,255,255,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,this.vw,this.vh);
  }

  /* ---------------- interaction ---------------- */
  updateInteraction(){
    if(this.modalOpen||this.battle.active||this.paused){ $('#interactPrompt').classList.remove('show'); return; }
    let best=null,bd=2.35;
    for(const n of this.world.npcs){ const d=Math.hypot(n.x-this.player.x,n.y-this.player.y); if(d<bd){bd=d;best={type:'npc',target:n};} }
    for(const w of this.wilds){ const d=Math.hypot(w.x-this.player.x,w.y-this.player.y); if(d<bd){bd=d;best={type:'wild',target:w};} }
    this.interactTarget=best;
    const el=$('#interactPrompt');
    if(best){
      $('#interactText').textContent=best.type==='wild'
        ?t('interact.engage',{name:best.target.name,level:best.target.level})
        :t('interact.talk',{name:npcName(best.target)});
      el.classList.add('show');
    } else el.classList.remove('show');
  }

  interact(){
    if(this.modalOpen||this.battle.active) return;
    const target=this.interactTarget;
    if(!target){
      // Helpful nudge if the player is standing in town.
      if(this.zone.id==='hollow') this.toast(t('toast.helpTitle'),t('toast.helpBody'),'purple');
      return;
    }
    if(target.type==='wild') this.startWildBattle(target.target);
    else this.talkNpc(target.target);
  }

  startWildBattle(w){
    if(!w||this.battle.active) return;
    this.dex.seen.add(w.id);
    this.audio.sfx('open');
    this.battle.open(w);
    this.updateHud();
  }

  quickCatch(){
    if(this.battle.active) return;
    const target=this.interactTarget;
    if(target?.type==='wild') this.startWildBattle(target.target);
    else this.toast(t('toast.noWildTitle'),t('toast.noWildBody'),'gold');
  }

  talkNpc(npc){
    if(!npc) return;
    this.openDialogue(npc);
  }

  /* ---------------- events & quests ---------------- */
  questEvent(type,payload={}){
    const q=this.quests;
    if(type==='talk'){
      q.main.talk=1;
      this.addTrainerXp(250);
    } else if(type==='catch'){
      q.main.catch=Math.min(3,(q.main.catch||0)+1);
      if(payload.id===906) q.side1.sprig=1;
      this.addTrainerXp(500);
    } else if(type==='coast'){
      q.side2.coast=1;
    } else if(type==='battleWin'){
      q.main.battle=(q.main.battle||0)+1;
    } else if(type==='raid'){
      q.raid.raid=1;
    }
    q.main.level=this.player.level;
    this.checkQuestCompletion();
    this.updateHud();
  }

  checkQuestCompletion(){
    const q=this.quests;
    if(!q.main.claimed&&q.main.talk>=1&&q.main.catch>=3&&this.player.level>=15){
      q.main.claimed=true;
      this.player.coins+=800; this.bag.pokeball+=10;
      this.toast(t('quest.completeTitle'),t('quest.completeBody'),'gold');
      this.audio.sfx('coin');
    }
    if(!q.side1.claimed&&q.side1.sprig>=1){
      q.side1.claimed=true; this.player.coins+=450; this.bag.greatball+=3;
      this.toast(t('quest.side1Title'),t('quest.side1Body'),'gold');
    }
    if(!q.side2.claimed&&q.side2.coast>=1){
      q.side2.claimed=true; this.player.coins+=650; this.bag.superpotion+=2;
      this.toast(t('quest.side2Title'),t('quest.side2Body'),'gold');
    }
    if(!q.raid.claimed&&q.raid.raid>=1){
      q.raid.claimed=true; this.player.coins+=2500; this.bag.ultraball+=5;
      this.toast(t('quest.raidTitle'),t('quest.raidBody'),'purple');
    }
  }

  addTrainerXp(amount){
    this.player.xp=(this.player.xp||0)+amount;
    let need=2500+this.player.level*220;
    let leveled=false;
    while(this.player.xp>=need){
      this.player.xp-=need; this.player.level++; leveled=true;
      need=2500+this.player.level*220;
    }
    this.quests.main.level=this.player.level;
    if(leveled){
      this.toast(t('level.trainerTitle',{level:this.player.level}),t('level.trainerBody'),'gold');
      this.audio.sfx('level');
    }
    this.updateHud();
  }

  addXp(mon,amount){
    const gains=[];
    mon.xp+=amount;
    mon.xpNext=xpToNext(mon.level);
    while(mon.xp>=mon.xpNext&&mon.level<100){
      mon.xp-=mon.xpNext; mon.level++; gains.push(mon.level);
      const oldMax=mon.maxHp;
      const fresh=createMon(mon.id,mon.level,this.data);
      mon.stats=fresh.stats; mon.maxHp=fresh.maxHp;
      mon.hp=Math.min(mon.maxHp,mon.hp+(mon.maxHp-oldMax));
      mon.moves=fresh.moves;
      mon.xpNext=xpToNext(mon.level);
      this.dex.seen.add(mon.id);
    }
    if(gains.length){
      this.toast(t('level.monTitle',{name:mon.name,lv:lv(mon.level)}),t('level.monBody',{n:gains.length,s:gains.length>1?'s':''}),'gold');
      const evolved=this.evolveIfReady(mon);
      if(evolved) setTimeout(()=>this.toast(t('level.evolveTitle',{from:evolved.from}),t('level.evolveBody',{to:evolved.to}),'purple'),800);
    }
    this.updateHud(); this.renderParty();
    return gains;
  }

  evolveIfReady(mon){
    const levelReq=mon.base.evolve;
    const targets=this.evoMap[mon.id];
    if(!levelReq||!targets||!targets.length||mon.level<levelReq) return null;
    const target=targets[0];
    const oldName=mon.name;
    const fresh=createMon(target.id,mon.level,this.data);
    mon.id=target.id; mon.name=speciesName(target); mon.types=target.types; mon.base=target;
    mon.stats=fresh.stats; mon.maxHp=fresh.maxHp; mon.hp=Math.min(mon.maxHp,mon.hp+Math.round(fresh.maxHp*.25));
    mon.moves=fresh.moves;
    this.dex.caught.add(target.id); this.dex.seen.add(target.id);
    this.getSprite(target.id);
    this.updateHud(); this.renderParty();
    return {from:oldName,to:speciesName(target)};
  }

  onCatch(mon,wild){
    this.dex.caught.add(mon.id); this.dex.seen.add(mon.id);
    let partyFull=false;
    if(this.party.length<6) this.party.push(mon); else { this.box.push(mon); partyFull=true; }
    this.questEvent('catch',{id:mon.id});
    this.addTrainerXp(120);
    this.renderParty(); this.updateHud();
    if(wild) this.wilds=this.wilds.filter(w=>w!==wild);
    this.spawnWilds(false);
    return {partyFull};
  }

  onTrainerWin(npc,prize){
    this.player.coins+=0;
    if(npc.id==='kai'){ this.rivalDefeated=true; this.toast(t('battle.rivalTitle'),t('battle.rivalBody'),'purple'); }
    else this.toast(t('battle.trainerWinTitle',{name:npcName(npc)}),t('battle.trainerWinBody',{prize}),'gold');
    this.addTrainerXp(700);
    this.checkQuestCompletion();
    this.updateHud(); this.save();
  }

  onRaidWin(){
    this.questEvent('raid');
    this.toast(t('battle.raidWinTitle'),t('battle.raidWinBody'),'purple');
    this.addTrainerXp(1200);
    this.save();
  }

  onDefeat(){
    const loss=Math.min(200,this.player.coins);
    this.player.coins-=loss;
    this.party.forEach(healMon);
    this.player.x=67.5; this.player.y=60.8;
    this.zone=ZONE_BY_ID.hollow; this.cam.ready=false;
    this.toast(t('battle.defeatTitle'),t('battle.defeatBody',{loss}),'gold');
    this.audio.sfx('heal');
    this.updateHud(); this.renderParty(); this.save();
  }

  endBattle(){
    if(this.battle.wild) this.wilds=this.wilds.filter(w=>w!==this.battle.wild);
    this.lastBattleEnd=performance.now();
    this.updateHud();
    this.save();
  }

  /* ---------------- chat & multiplayer ---------------- */
  seedChat(){
    const seeds=chatSeeds();
    seeds.global.forEach(([n,text],i)=>this.chatMessages.global.push({name:n,text,time:Date.now()-i*47000,tag:i===0?'MOD':''}));
    seeds.local.forEach(([n,text,tag],i)=>this.chatMessages.local.push({name:n,text,time:Date.now()-(i+1)*45000,tag}));
    this.chatMessages.party.push({name:getLang()==='fr'?'Système':'System',text:seeds.party[0],system:true,time:Date.now()});
    this.lastChat=performance.now();
  }

  addChat(channel,name,text,tag='',system=false){
    this.chatMessages[channel].push({name,text,tag,time:Date.now(),system});
    if(this.chatMessages[channel].length>60) this.chatMessages[channel].shift();
    if(channel===this.chatTab) this.renderChat();
    else this.chatUnread[channel]=(this.chatUnread[channel]||0)+1;
  }

  renderChat(){
    const body=$('#chatBody');
    const list=this.chatMessages[this.chatTab]||[];
    body.innerHTML=list.slice(-9).map(m=>{
      if(m.system) return `<div class="chat-line system">${escapeHtml(m.text)}</div>`;
      const displayName=m.name==='You'?t('hud.you'):m.name;
      return `<div class="chat-line"><span class="ch-name ${m.name==='You'?'you':m.tag==='MOD'?'gm':''}">${escapeHtml(displayName)}${m.tag?`<span class="ch-tag ${m.tag==='MOD'?'gm':''}">${m.tag}</span>`:''}</span><span class="ch-text">${escapeHtml(m.text)}</span></div>`;
    }).join('');
    body.scrollTop=body.scrollHeight;
  }

  sendChat(){
    const input=$('#chatInput');
    const text=input.value.trim();
    if(!text) return;
    input.value='';
    this.addChat(this.chatTab,'You',text,'',false);
    this.broadcast({type:'chat',channel:this.chatTab,name:this.player.name,text,id:this.playerId});
    this.audio.sfx('click');
    input.blur();
    this.keys.clear();
  }

  botChat(){
    if(this.battle.active||this.modalOpen) return;
    if(Math.random()<.72){
      const name=pick(TRAINER_NAMES);
      const text=pick(botLines());
      const ch=Math.random()<.7?'global':'local';
      this.addChat(ch,name,text,Math.random()<.08?'MOD':'');
    }
    this.onlineCount=1240+Math.floor(Math.random()*90);
    this.updateHud();
  }

  setupMultiplayer(){
    this.channelId='terraverse-shard-07';
    try{
      this.channel=new BroadcastChannel(this.channelId);
      this.channel.onmessage=(e)=>this.onNet(e.data);
      this.channel.postMessage({type:'hello',id:this.playerId,name:this.player.name});
      setInterval(()=>this.remoteState(),240);
      setInterval(()=>this.broadcast({type:'heartbeat',id:this.playerId}),3000);
      window.addEventListener('beforeunload',()=>this.broadcast({type:'bye',id:this.playerId}));
    }catch(e){ this.channel=null; }
  }

  remoteState(){
    if(!this.channel) return;
    this.broadcast({
      type:'state',id:this.playerId,name:this.player.name,x:this.player.x,y:this.player.y,
      dir:this.player.dir,frame:this.player.frame,level:this.player.level,
      zone:zoneName(this.zone),lead:this.party[0]?.id||25,palette:PALETTES[0]
    });
  }

  broadcast(msg){
    try{ this.channel?.postMessage(msg); }catch{}
  }

  onNet(msg){
    if(!msg||msg.id===this.playerId) return;
    if(msg.type==='state'){
      const existing=this.remotePlayers.get(msg.id);
      this.remotePlayers.set(msg.id,{...msg,lastSeen:performance.now(),frame:msg.frame||0});
      if(!existing){ this.addChat('local',msg.name,t('chat.joinedShard'),'',true); }
    } else if(msg.type==='hello'){
      this.remoteState();
      if(msg.name) this.addChat('local',msg.name,t('chat.sameShard'),'',true);
    } else if(msg.type==='bye'){
      this.remotePlayers.delete(msg.id);
    } else if(msg.type==='chat'){
      const ch=msg.channel==='party'?'party':msg.channel==='local'?'local':'global';
      this.addChat(ch,msg.name,msg.text,'');
    }
  }

  /* ---------------- UI: HUD ---------------- */
  updateHud(){
    const p=this.player;
    $('#playerName').textContent=p.name;
    $('#profileLv').textContent=p.level;
    const mn=$('#mobileName'), ml=$('#mobileLv'); if(mn) mn.textContent=p.name; if(ml) ml.textContent=lv(p.level);
    $('#coinCount').textContent=fmt(p.coins);
    $('#ballCount').textContent=this.bag.pokeball;
    $('#greatCount').textContent=this.bag.greatball;
    $('#potionCount').textContent=this.bag.potion;
    $('#onlineCount').textContent=fmt(this.onlineCount);
    const need=2500+p.level*220;
    const pct=clamp((p.xp/need)*100,0,100);
    $('#xpBar').style.width=pct+'%';
    $('#xpText').textContent=`${fmt(p.xp)} / ${fmt(need)} XP`;
    $('#zoneName').textContent=zoneName(this.zone);
    $('#mmZone').textContent=zoneName(this.zone);
    $('#weatherChip').textContent=`${this.weatherLabel()} · ${this.timeLabel()}`;
    this.renderQuestCard();
    this.renderParty();
  }

  weatherLabel(){
    const b=this.zone.biome;
    if(b==='snow') return t('weather.snow');
    if(b==='volcano') return t('weather.volcano');
    if(b==='coast') return t('weather.coast');
    if(b==='swamp') return t('weather.swamp');
    if(b==='forest') return t('weather.forest');
    if(b==='lake') return t('weather.lake');
    return t('weather.default');
  }

  timeLabel(){
    const h=Math.floor(this.clock/60)%24, m=Math.floor(this.clock%60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  renderEventTimer(){
    const left=Math.max(0,this.eventEnds-Date.now());
    const m=Math.floor(left/60000), s=Math.floor((left%60000)/1000);
    const el=$('#eventTimer'); if(el) el.textContent=left>0?`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:t('event.live');
  }

  updateEventTimer(){ this.renderEventTimer(); }

  renderQuestCard(){
    const q=this.quests.main;
    const def=questText('main');
    const objectives=[
      ['questObj1',def.objectives[0].label,q.talk,1],
      ['questObj2',def.objectives[1].label,q.catch,3],
      ['questObj3',def.objectives[2].label,this.player.level,15]
    ];
    for(const [id,label,val,target] of objectives){
      const el=document.getElementById(id); if(!el) continue;
      const done=val>=target;
      el.classList.toggle('done',done);
      el.innerHTML=`<span class="q-check"></span><span>${escapeHtml(label)}</span><b>${Math.min(val,target)}/${target}</b>`;
    }
    $('#questTitle').textContent=q.claimed?t('quest.claimedTitle'):def.title;
    $('#questDesc').textContent=q.claimed?t('quest.claimedDesc'):def.desc;
  }

  renderParty(){
    const rail=$('#partyRail'); if(!rail) return;
    rail.innerHTML=this.party.map((m,i)=>{
      const r=m.hp/m.maxHp;
      return `<div class="party-mon ${i===0?'lead':''}" data-party="${i}">
        <img class="pm-sprite" src="${spriteUrl(m.id)}" alt="${m.name}">
        <div class="pm-info"><div class="pm-top"><strong>${m.name}</strong><span>${lv(m.level)}</span></div>
        <div class="pm-hp"><i class="${r<.25?'low':r<.55?'mid':''}" style="width:${Math.max(0,r*100)}%"></i></div></div>
        ${i===0?`<span class="pm-lv">${t('misc.lead')}</span>`:''}
      </div>`;
    }).join('');
    rail.querySelectorAll('[data-party]').forEach(el=>el.onclick=()=>this.openParty(Number(el.dataset.party)));
    $('#partyCount').textContent=`${this.party.length} / 6`;
    const p=this.player;
    $('#profileLv').textContent=p.level;
    $('#playerName').textContent=p.name;
  }

  drawAvatar(){
    const c=$('#avatarCanvas'); if(!c) return;
    const g=c.getContext('2d'); g.clearRect(0,0,96,96);
    const grad=g.createLinearGradient(0,0,96,96); grad.addColorStop(0,'#2c5f49'); grad.addColorStop(1,'#16362b');
    g.fillStyle=grad; g.fillRect(0,0,96,96);
    g.save(); g.translate(48,80); g.scale(1.9,1.9);
    this.world.drawTrainer(g,0,0,'down',0,{cap:'#ff7b62',jacket:'#3c7b6b',shirt:'#f0ead6',skin:'#e4b58a',hair:'#43342a',bag:'#e0b04f',accent:'#c9f46c'},1);
    g.restore();
  }

  showZoneBanner(z){
    const b=$('#zoneBanner');
    $('#zbName').textContent=zoneName(z);
    $('#zbSub').textContent=zoneSubtitle(z)||'';
    b.classList.add('show');
    clearTimeout(this._zbTimer);
    this._zbTimer=setTimeout(()=>b.classList.remove('show'),4200);
  }

  toast(title,msg='',type=''){
    const stack=$('#toasts');
    const el=document.createElement('div');
    el.className='toast';
    const icon=type==='gold'?'★':type==='purple'?'✦':'●';
    el.innerHTML=`<div class="toast-icon ${type}">${icon}</div><div><strong>${escapeHtml(title)}</strong>${msg?`<span>${escapeHtml(msg)}</span>`:''}</div>`;
    stack.appendChild(el);
    while(stack.children.length>3) stack.firstElementChild.remove();
    setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(),320); },4200);
  }

  /* ---------------- UI: hotbar ---------------- */
  hotbar(slot){
    this.audio.sfx('click');
    if(slot==='ball') this.selectBall('pokeball');
    else if(slot==='great') this.selectBall('greatball');
    else if(slot==='potion') this.usePotionOnLead();
    else if(slot==='bag') this.openBag();
    else if(slot==='party') this.openParty(0);
    else if(slot==='dex') this.openDex();
    else if(slot==='map') this.openMap();
    else if(slot==='emote') this.openEmotes();
    else if(slot==='quests') this.openQuests();
    else if(slot==='chat') this.openChat();
  }

  selectBall(key){
    if(!this.bag[key]){ this.toast(t('toast.outOfStockTitle'),t('toast.outOfStockBody',{name:itemName(key)}),'gold'); return; }
    this.selectedBall=key;
    $$('.slot').forEach(s=>s.classList.toggle('active',s.dataset.slot===(key==='greatball'?'great':key==='ultraball'?'ultra':'ball')));
    this.toast(t('toast.ballReadyTitle',{name:itemName(key)}),t('toast.ballReadyBody',{count:this.bag[key]}),'');
  }

  usePotionOnLead(){
    const mon=this.party[0];
    if(!mon) return;
    if(mon.hp>=mon.maxHp){ this.toast(t('toast.fullHpTitle'),t('toast.fullHpBody',{name:mon.name}),''); return; }
    const key=this.bag.superpotion>0?'superpotion':this.bag.potion>0?'potion':'berry';
    if(!this.bag[key]){ this.toast(t('toast.noHealingTitle'),t('toast.noHealingBody'),'gold'); return; }
    this.bag[key]--;
    mon.hp=Math.min(mon.maxHp,mon.hp+ITEMS[key].heal);
    this.audio.sfx('heal');
    this.toast(t('toast.healedTitle',{name:mon.name}),t('toast.healedBody',{hp:ITEMS[key].heal,cur:mon.hp,max:mon.maxHp}),'gold');
    this.renderParty(); this.updateHud(); this.save();
  }

  /* ---------------- UI: modal framework ---------------- */
  openModal({title,subtitle='',icon='✦',wide=false,narrow=false,body='',footer='',onMount}){
    this.modalOpen=true;
    const root=$('#modalRoot');
    root.innerHTML=`<div class="modal ${wide?'wide':''} ${narrow?'narrow':''}">
      <div class="modal-head">
        <div class="modal-title"><div class="mt-icon">${icon}</div><div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div></div>
        <button class="modal-close" aria-label="${t('misc.close')}">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer?`<div class="modal-foot">${footer}</div>`:''}
    </div>`;
    root.classList.add('open');
    root.onclick=(e)=>{ if(e.target===root) this.closeModal(); };
    root.querySelector('.modal-close').onclick=()=>this.closeModal();
    if(onMount) onMount(root);
    this.audio.sfx('open');
  }

  closeModal(){
    if(!this.modalOpen) return;
    this.modalOpen=false;
    const root=$('#modalRoot'); root.classList.remove('open'); root.innerHTML='';
    this.audio.sfx('close');
    this.keys.clear();
    this.updateInteraction();
  }


  openChat(){
    this.openModal({
      title:t('chat.title'), subtitle:t('chat.subtitle',{count:fmt(this.onlineCount)}), icon:'◉', narrow:true,
      body:`<div style="display:flex;gap:5px;margin-bottom:10px">${['global','local','party'].map(c=>`<button class="gen-chip ${c===this.chatTab?'active':''}" data-mchat="${c}" style="text-transform:uppercase">${t('chat.'+c)}</button>`).join('')}</div>
      <div id="mobileChatBody" style="height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:9px;background:rgba(0,0,0,.2);border:1px solid var(--line)"></div>
      <form id="mobileChatForm" style="display:flex;gap:6px;margin-top:8px"><input id="mobileChatInput" maxlength="90" placeholder="${t('chat.placeholderShort')}" style="flex:1;height:34px;border-radius:7px;border:1px solid var(--line);background:rgba(0,0,0,.2);color:#fff;padding:0 9px;font-size:10px;outline:none"><button class="btn primary small" type="submit">${t('chat.modalSend')}</button></form>`,
      footer:`<span>${t('chat.footer')}</span><span><kbd>Esc</kbd> ${t('chat.closeHint')}</span>`,
      onMount:(root)=>{
        const draw=()=>{
          const list=this.chatMessages[this.chatTab]||[];
          const body=root.querySelector('#mobileChatBody');
          body.innerHTML=list.slice(-14).map(m=>m.system?`<div class="chat-line system">${escapeHtml(m.text)}</div>`:`<div class="chat-line"><span class="ch-name ${m.name==='You'?'you':''}">${escapeHtml(m.name==='You'?t('hud.you'):m.name)}</span><span class="ch-text">${escapeHtml(m.text)}</span></div>`).join('');
          body.scrollTop=body.scrollHeight;
          root.querySelectorAll('[data-mchat]').forEach(b=>b.classList.toggle('active',b.dataset.mchat===this.chatTab));
        };
        root.querySelectorAll('[data-mchat]').forEach(b=>b.onclick=()=>{ this.chatTab=b.dataset.mchat; this.chatUnread[this.chatTab]=0; draw(); });
        root.querySelector('#mobileChatForm').addEventListener('submit',e=>{
          e.preventDefault();
          const input=root.querySelector('#mobileChatInput'); const text=input.value.trim(); if(!text) return;
          input.value='';
          this.addChat(this.chatTab,'You',text,'');
          this.broadcast({type:'chat',channel:this.chatTab,name:this.player.name,text,id:this.playerId});
          draw();
        });
        draw();
      }
    });
  }

  /* ---------------- UI: dex ---------------- */
  openDex(){
    let gen=0, page=0, query='';
    const shell=()=>{
      const filtered=this.data.filter(m=>(gen===0||m.gen===gen)&&(!query||m.name.toLowerCase().includes(query.toLowerCase())||String(m.id).padStart(4,'0').includes(query)));
      const perPage=36, pages=Math.max(1,Math.ceil(filtered.length/perPage));
      page=clamp(page,0,pages-1);
      const items=filtered.slice(page*perPage,page*perPage+perPage);
      return {filtered,pages,items};
    };
    this.openModal({
      title:t('dex.title'), subtitle:t('dex.subtitle',{caught:fmt(this.dex.caught.size),seen:fmt(this.dex.seen.size),total:fmt(this.data.length)}), icon:'▤', wide:true,
      body:`<div class="dex-toolbar">
        <div class="search-box"><svg class="ico small"><use href="#i-search"/></svg><input id="dexSearch" placeholder="${t('dex.search')}" value="${escapeHtml(query)}"></div>
        <div class="gen-chips"><button class="gen-chip active" data-gen="0">${t('dex.all')}</button>${[1,2,3,4,5,6,7,8,9].map(g=>`<button class="gen-chip" data-gen="${g}">${t('dex.gen',{n:g})}</button>`).join('')}</div>
      </div>
      <div class="dex-stats">
        <div class="dex-stat"><span>${t('dex.caught')}</span><strong>${fmt(this.dex.caught.size)} <small>/ ${fmt(this.data.length)}</small></strong></div>
        <div class="dex-stat"><span>${t('dex.seen')}</span><strong>${fmt(this.dex.seen.size)} <small>/ ${fmt(this.data.length)}</small></strong></div>
        <div class="dex-stat"><span>${t('dex.completion')}</span><strong>${(this.dex.caught.size/this.data.length*100).toFixed(1)}<small>%</small></strong></div>
        <div class="dex-stat"><span>${t('dex.migration')}</span><strong>${t('dex.allGen')}</strong></div>
      </div>
      <div class="dex-grid" id="dexGrid"></div>
      <div class="dex-pager"><button id="dexPrev">‹</button><span id="dexPageInfo"></span><button id="dexNext">›</button></div>`,
      footer:`<span>${t('dex.tip')}</span><span><kbd>D</kbd> ${t('chat.closeHint')}</span>`,
      onMount:(root)=>{
        const grid=root.querySelector('#dexGrid'), info=root.querySelector('#dexPageInfo');
        const render=()=>{
          const {items,pages}=shell();
          grid.innerHTML=items.map(m=>{
            const caught=this.dex.caught.has(m.id), seen=this.dex.seen.has(m.id)||caught;
            return `<div class="dex-card ${caught?'caught':''} ${seen?'':'unseen'}" data-dex="${m.id}">
              <span class="dex-num">#${padDex(m.id)}</span>${caught?'<span class="dex-caught-mark">✓</span>':''}
              <img src="${spriteUrl(m.id)}" loading="lazy" alt="${speciesName(m)}">
              <strong>${seen?speciesName(m):'???'}</strong>
              <div class="dex-types">${seen?m.types.map(tp=>`<span class="type-chip" style="background:${TYPE_COLORS[tp]}">${typeName(tp)}</span>`).join(''):''}</div>
            </div>`;
          }).join('');
          info.textContent=`${page+1} / ${pages}`;
          root.querySelector('#dexPrev').disabled=page===0;
          root.querySelector('#dexNext').disabled=page>=pages-1;
          grid.querySelectorAll('[data-dex]').forEach(el=>el.onclick=()=>this.openDexDetail(Number(el.dataset.dex)));
        };
        root.querySelector('#dexSearch').addEventListener('input',e=>{ query=e.target.value; page=0; render(); });
        root.querySelectorAll('[data-gen]').forEach(b=>b.onclick=()=>{ gen=Number(b.dataset.gen); page=0; root.querySelectorAll('[data-gen]').forEach(x=>x.classList.toggle('active',x===b)); render(); });
        root.querySelector('#dexPrev').onclick=()=>{ page--; render(); };
        root.querySelector('#dexNext').onclick=()=>{ page++; render(); };
        render();
      }
    });
  }

  openDexDetail(id){
    const m=this.data[id-1], caught=this.dex.caught.has(id), seen=this.dex.seen.has(id)||caught;
    const evo=this.evoMap[id]?.[0];
    const evoFrom=this.data.find(x=>x.id===m.evolves_from);
    const extra=m.legendary?t('dex.legendaryExtra'):m.mythical?t('dex.mythicalExtra'):t('dex.regularExtra');
    const desc=t('dex.desc',{name:speciesName(m),types:m.types.map(typeName).join('/'),gen:m.gen,extra});
    this.openModal({
      title:seen?speciesName(m):t('dex.unknown'), subtitle:t('dex.detailSubtitle',{num:padDex(id),gen:m.gen}), icon:caught?'✓':'?', wide:true,
      body:`<div class="dex-detail">
        <div class="dex-art"><span class="dex-art-num">#${padDex(id)}</span><img src="${spriteUrl(id)}" alt="${speciesName(m)}" class="${seen?'':'unseen-art'}" style="${seen?'':'filter:brightness(0) opacity(.35)'}"></div>
        <div class="dex-info">
          <h3>${seen?speciesName(m):'???'}</h3>
          <div class="dex-types">${m.types.map(tp=>`<span class="type-chip" style="background:${TYPE_COLORS[tp]}">${typeName(tp)}</span>`).join('')}</div>
          <p class="dex-desc">${seen?desc:t('dex.unknownHint')}</p>
          <div class="stat-bars">
            ${[[t('dex.statHp'),m.hp],[t('dex.statAtk'),m.atk],[t('dex.statDef'),m.def],[t('dex.statSpa'),m.spa],[t('dex.statSpd'),m.spd],[t('dex.statSpe'),m.spe]].map(([k,v])=>`<div class="stat-row"><label>${k}</label><b>${v}</b><div class="stat-track"><i style="width:${clamp(v/180*100,4,100)}%"></i></div></div>`).join('')}
          </div>
          <div class="dex-facts">
            <span class="dex-fact">${t('dex.catchRate')} <b>${m.capture}</b></span>
            ${m.legendary?`<span class="dex-fact">${t('dex.legendary')}</span>`:''}
            ${m.mythical?`<span class="dex-fact">${t('dex.mythical')}</span>`:''}
            ${evo?`<span class="dex-fact">${t('dex.evolvesAt',{level:m.evolve,name:speciesName(evo)})}</span>`:''}
            ${evoFrom?`<span class="dex-fact">${t('dex.evolvesFrom',{name:speciesName(evoFrom)})}</span>`:''}
          </div>
        </div>
      </div>`,
      footer:`<span>${caught?t('dex.caughtStatus'):seen?t('dex.seenStatus'):t('dex.notSeenStatus')}</span><button class="btn small" id="dexBack">${t('dex.back')}</button>`,
      onMount:(root)=>{ root.querySelector('#dexBack').onclick=()=>this.openDex(); }
    });
  }

  /* ---------------- UI: party ---------------- */
  openParty(selected=0){
    selected=clamp(selected,0,Math.max(0,this.party.length-1));
    this.openModal({
      title:t('party.title'), subtitle:t('party.subtitle',{count:this.party.length,box:this.box.length}), icon:'🐾', wide:true,
      body:'<div class="party-layout"><div class="party-grid" id="partyGrid"></div><div class="party-detail" id="partyDetail"></div></div>',
      footer:`<span>${t('party.footer')}</span><button class="btn small" id="setLead">${t('party.setLead')}</button>`,
      onMount:(root)=>{
        const render=()=>{
          const grid=root.querySelector('#partyGrid');
          grid.innerHTML=this.party.map((m,i)=>`
            <div class="party-slot ${i===selected?'active':''}" data-slot="${i}">
              ${i===0?`<span class="ps-badge">${t('party.lead')}</span>`:''}
              <div class="ps-top"><img src="${spriteUrl(m.id)}" alt=""><div style="flex:1"><div class="ps-name">${m.name}<span>${lv(m.level)}</span></div><div class="ps-types">${m.types.map(tp=>`<span class="type-chip" style="background:${TYPE_COLORS[tp]}">${typeName(tp)}</span>`).join('')}</div></div></div>
              <div class="ps-hp"><div class="ps-hp-top"><span>${t('party.hp')}</span><span>${Math.ceil(m.hp)} / ${m.maxHp}</span></div><div class="ps-hp-track"><i class="${m.hp/m.maxHp<.25?'low':''}" style="width:${m.hp/m.maxHp*100}%;background:${m.hp/m.maxHp<.25?'#ff6b6b':m.hp/m.maxHp<.55?'#ffb254':'#c9f46c'}"></i></div></div>
            </div>`).join('')+Array.from({length:Math.max(0,6-this.party.length)}).map(()=>`<div class="party-slot empty"><span>+</span>${t('party.empty')}</div>`).join('');
          grid.querySelectorAll('[data-slot]').forEach(el=>el.onclick=()=>{ selected=Number(el.dataset.slot); render(); });
          const m=this.party[selected];
          if(!m){ root.querySelector('#partyDetail').innerHTML=''; return; }
          root.querySelector('#partyDetail').innerHTML=`
            <img class="big-sprite" src="${spriteUrl(m.id)}" alt="">
            <h3>${m.name} ${m.shiny?'✦':''}</h3>
            <div class="pd-lv">${t('misc.level')} ${m.level} · ${t('misc.nature',{nature:natureName(m.nature).toUpperCase()})}</div>
            <div class="dex-types" style="justify-content:center;margin-top:7px">${m.types.map(tp=>`<span class="type-chip" style="background:${TYPE_COLORS[tp]}">${typeName(tp)}</span>`).join('')}</div>
            <div class="pd-moves">${m.moves.map(mv=>`<div class="pd-move" style="border-color:${TYPE_COLORS[mv.type]}"><strong>${moveName(mv.name)}</strong><span>${typeName(mv.type)} · ${mv.pp}/${mv.maxPp} PP</span></div>`).join('')}</div>
            <div class="pd-xp"><div class="ps-hp-top"><span>${t('misc.nextLevel')}</span><span>${m.xp} / ${m.xpNext} XP</span></div><div class="ps-hp-track"><i style="width:${clamp(m.xp/m.xpNext*100,0,100)}%"></i></div></div>
            <div style="margin-top:auto;padding-top:12px;font-size:7.5px;color:#6d8178;line-height:1.45">${m.base.legendary?t('misc.legendaryDesc'):t('misc.regularDesc')}</div>`;
          root.querySelector('#setLead').onclick=()=>{
            if(selected===0) return;
            const [mon]=this.party.splice(selected,1); this.party.unshift(mon); selected=0;
            this.toast(t('toast.leadChangedTitle'),t('toast.leadChangedBody',{name:mon.name}),'gold');
            this.renderParty(); render(); this.save();
          };
        };
        render();
      }
    });
  }

  /* ---------------- UI: bag ---------------- */
  openBag(){
    const items=Object.keys(ITEMS).filter(k=>this.bag[k]>0);
    this.openModal({
      title:t('bag.title'), subtitle:t('bag.subtitle',{count:items.reduce((n,k)=>n+this.bag[k],0),coins:fmt(this.player.coins)}), icon:'▣', wide:true,
      body:`<div class="bag-layout"><div class="bag-grid">${items.map(k=>{
        return `<div class="bag-item" data-item="${k}"><div class="bag-icon">${bagIcon(k)}</div><div><strong>${itemName(k)}</strong><p>${itemDesc(k)}</p></div><b>×${this.bag[k]}</b></div>`;
      }).join('')}</div><div class="bag-side"><h4>${t('bag.notesTitle')}</h4><p class="bag-tip">${t('bag.notes')}</p></div></div>`,
      footer:`<span>${t('bag.footer')}</span><button class="btn small" id="bagShop">${t('bag.visitMarket')}</button>`,
      onMount:(root)=>{
        root.querySelectorAll('[data-item]').forEach(el=>el.onclick=()=>{
          const k=el.dataset.item;
          if(k==='potion'||k==='superpotion'||k==='berry'){
            const mon=this.party[0];
            if(mon.hp>=mon.maxHp){ this.toast(t('toast.fullHpTitle'),t('toast.fullHpBody',{name:mon.name}),''); return; }
            this.bag[k]--; mon.hp=Math.min(mon.maxHp,mon.hp+ITEMS[k].heal); this.audio.sfx('heal');
            this.toast(t('toast.healedTitle',{name:mon.name}),`+${ITEMS[k].heal} ${t('battle.hp')}`,'gold'); this.updateHud(); this.save(); this.openBag();
          } else if(k==='pokeball'||k==='greatball'||k==='ultraball'){
            this.selectedBall=k; this.toast(t('toast.ballReadyTitle',{name:itemName(k)}),t('toast.ballReadyBody',{count:this.bag[k]}),''); this.closeModal();
          } else {
            this.toast(t('toast.itemActivatedTitle',{name:itemName(k)}),k==='lure'?t('toast.lureBody'):t('toast.itemActivatedBody'),'purple');
          }
        });
        root.querySelector('#bagShop').onclick=()=>this.openShop();
      }
    });
  }

  /* ---------------- UI: map ---------------- */
  openMap(){
    this.openModal({
      title:t('map.title'), subtitle:t('map.subtitle'), icon:'◈', wide:true,
      body:`<div class="map-layout"><div class="world-map-wrap"><canvas id="worldMapCanvas" width="900" height="560"></canvas><div class="map-legend"><span><i style="background:#c9f46c"></i>${t('hud.you')}</span><span><i style="background:#ffb254"></i>${t('hud.wild')}</span><span><i style="background:#70c9ff"></i>${t('hud.trainers')}</span></div></div>
      <div class="map-side"><h4>${t('map.fastTravel')}</h4>${ZONES.map(z=>`<button class="waypoint" data-zone="${z.id}"><span class="wp-ico">${z.id==='hollow'?'⌂':'✦'}</span><div><strong>${zoneName(z)}</strong><span>${t('map.levels',{min:z.levels[0],max:z.levels[1],biome:biomeName(z.biome)})}</span></div><em>${t('map.travel')}</em></button>`).join('')}<div class="map-tip">${t('map.openWorld',{tip:zoneTip(this.zone.id)})}</div></div></div>`,
      footer:`<span>${t('map.footer')}</span><span><kbd>M</kbd> ${t('chat.closeHint')}</span>`,
      onMount:(root)=>{
        const c=root.querySelector('#worldMapCanvas');
        this.world.drawWorldMap(c,this);
        root.querySelectorAll('[data-zone]').forEach(b=>b.onclick=()=>this.fastTravel(b.dataset.zone));
      }
    });
  }

  fastTravel(id){
    const z=ZONE_BY_ID[id]; if(!z) return;
    const [x,y]=LANDING[id]||[z.x,z.y];
    this.player.x=x; this.player.y=y; this.player.dir='down'; this.zone=z;
    this.visited.add(id); this.cam.ready=false; this.wilds=[]; this.spawnWilds(true); this.initParticles();
    if(id==='coast') this.questEvent('coast');
    this.closeModal(); this.showZoneBanner(z);
    this.toast(t('toast.arrivedTitle',{name:zoneName(z)}),t('toast.arrivedBody',{subtitle:zoneSubtitle(z)}),'purple');
    this.updateHud(); this.save();
  }

  /* ---------------- UI: quests ---------------- */
  openQuests(){
    const q=this.quests;
    const card=(id,def,vals,complete,claimed)=>{
      const objectives=def.objectives.map(o=>{
        const cur=vals[o.id]??0; const done=cur>=o.target;
        return `<div class="qe-obj ${done?'done':''}"><span>${o.label}</span><b>${Math.min(cur,o.target)}/${o.target}</b></div>`;
      }).join('');
      const rewards=Object.entries(QUEST_DEFS[id].rewards).map(([k,v])=>`${k==='coins'?'★':'◉'} ${k==='coins'?fmt(v):v+'× '+itemName(k)}`).join(' · ');
      return `<div class="quest-entry ${id==='main'?'main':'side'} ${complete?'complete':''}"><div class="qe-icon">${id==='main'?'!':id==='raid'?'◆':'✦'}</div><div class="qe-main"><h4>${def.title}</h4><p>${def.desc}</p><div class="qe-objs">${objectives}</div><div class="qe-reward">${claimed?t('quests.claimed'):t('quests.rewards',{rewards})}</div></div>${complete&&!claimed?`<button class="claim-btn" data-claim="${id}">${t('quests.claim')}</button>`:''}</div>`;
    };
    this.openModal({
      title:t('quests.title'), subtitle:t('quests.subtitle'), icon:'!', wide:true,
      body:`<div class="quest-list">
        ${card('main',questText('main'),q.main,q.main.talk>=1&&q.main.catch>=3&&this.player.level>=15,q.main.claimed)}
        ${card('side1',questText('side1'),q.side1,q.side1.sprig>=1,q.side1.claimed)}
        ${card('side2',questText('side2'),q.side2,q.side2.coast>=1,q.side2.claimed)}
        ${card('raid',questText('raid'),q.raid,q.raid.raid>=1,q.raid.claimed)}
      </div>`,
      footer:`<span>${t('quests.footer')}</span><span><kbd>J</kbd> ${t('quests.closeHint')}</span>`,
      onMount:(root)=>{
        root.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>{ this.checkQuestCompletion(); this.openQuests(); });
      }
    });
  }

  /* ---------------- UI: shop ---------------- */
  openShop(){
    this.openModal({
      title:t('shop.title'), subtitle:t('shop.subtitle'), icon:'▣', wide:true,
      body:`<div class="shop-layout"><div class="shop-grid">${SHOP_STOCK.map(k=>{const it=ITEMS[k];return `<div class="shop-item"><div class="bag-icon">${bagIcon(k)}</div><div><strong>${itemName(k)}</strong><p>${itemDesc(k)}</p></div><div class="shop-buy"><span>${fmt(it.price)}c</span><button data-buy="${k}">${t('shop.buy')}</button></div></div>`;}).join('')}</div>
      <div class="shop-side"><h4>${t('shop.today')}</h4><div class="shop-feature"><img src="${spriteUrl(133)}" alt=""><div><strong>${t('shop.eeveeTitle')}</strong><p>${t('shop.eeveeDesc')}</p><b>${t('shop.priceCoins',{amount:fmt(1400)})}</b></div></div><div class="shop-feature" style="background:rgba(201,244,108,.06);border-color:rgba(201,244,108,.15)"><img src="${spriteUrl(25)}" alt=""><div><strong>${t('shop.rangerTitle')}</strong><p>${t('shop.rangerDesc')}</p><b>${t('shop.priceCoins',{amount:fmt(1650)})}</b></div></div><p class="bag-tip" style="margin-top:10px">${t('shop.maraNote')}</p></div></div>`,
      footer:`<span>${t('shop.coins',{coins:fmt(this.player.coins)})}</span><span>${t('shop.delivery')}</span>`,
      onMount:(root)=>{
        root.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>this.buyItem(b.dataset.buy));
      }
    });
  }

  buyItem(key){
    const it=ITEMS[key];
    if(this.player.coins<it.price){ this.toast(t('toast.notEnoughTitle'),t('toast.notEnoughBody',{amount:fmt(it.price-this.player.coins)}),'gold'); this.audio.sfx('flee'); return; }
    this.player.coins-=it.price; this.bag[key]=(this.bag[key]||0)+1;
    this.audio.sfx('coin'); this.toast(t('toast.boughtTitle',{name:itemName(key)}),t('toast.boughtBody',{price:fmt(it.price),count:this.bag[key]}),'gold');
    this.updateHud(); this.openShop(); this.save();
  }

  /* ---------------- UI: social ---------------- */
  openSocial(){
    const remotes=[...this.remotePlayers.values()];
    const people=[...remotes.map(p=>({name:p.name,level:p.level,title:t('social.sameShard'),zone:p.zone,remote:true,color:'#70c9ff'})),...this.bots.slice(0,8).map(b=>({name:b.name,level:b.level,title:b.title,zone:b.zone,color:b.palette.cap}))];
    this.openModal({
      title:t('social.title'), subtitle:t('social.subtitle',{count:fmt(this.onlineCount),zone:zoneName(this.zone)}), icon:'◉', wide:true,
      body:`<div class="social-layout"><div class="social-list">${people.map(p=>`<div class="social-player"><div class="sp-avatar" style="background:${p.color}">${p.name[0]}</div><div class="sp-info"><strong>${escapeHtml(p.name)} ${p.remote?`<span class="sp-tag">${t('social.realTrainer')}</span>`:''}</strong><span>${lv(p.level)} · ${escapeHtml(p.title)} · ${escapeHtml(p.zone||t('social.nearby'))}</span></div><button class="sp-action" data-wave="${escapeHtml(p.name)}">${t('social.wave')}</button></div>`).join('')}</div>
      <div class="social-side"><h4>${t('social.shardStatus')}</h4><div class="shard-stat"><span>${t('social.online')}</span><b>${fmt(this.onlineCount)}</b></div><div class="shard-stat"><span>${t('social.inZone',{zone:zoneName(this.zone)})}</span><b>${Math.max(8,this.bots.filter(b=>b.zone===zoneName(this.zone)).length+remotes.length+3)}</b></div><div class="shard-stat"><span>${t('social.parties')}</span><b>12</b></div><div class="shard-stat"><span>${t('social.uptime')}</span><b>99.98%</b></div><div class="invite-box"><strong>${t('social.inviteTitle')}</strong><p>${t('social.inviteDesc')}</p><input readonly value="TERRA-07-VERDANT" id="inviteCode"><button class="btn small" id="copyInvite" style="margin-top:6px;width:100%">${t('social.copy')}</button></div><p class="shard-note">${t('social.note')}</p></div></div>`,
      footer:`<span>${t('social.footer')}</span><span><kbd>O</kbd> ${t('social.closeHint')}</span>`,
      onMount:(root)=>{
        root.querySelectorAll('[data-wave]').forEach(b=>b.onclick=()=>{
          const name=b.dataset.wave;
          const wave=t('social.waveChat',{name});
          this.addChat('local','You',wave,'');
          this.broadcast({type:'chat',channel:'local',name:this.player.name,text:wave,id:this.playerId});
          this.toast(t('toast.waveTitle'),t('toast.waveBody',{name}),'purple');
        });
        root.querySelector('#copyInvite').onclick=()=>{
          const input=root.querySelector('#inviteCode');
          input.select(); navigator.clipboard?.writeText(input.value).catch(()=>{});
          this.toast(t('toast.inviteCopiedTitle'),t('toast.inviteCopiedBody'),'gold');
        };
      }
    });
  }

  /* ---------------- UI: settings ---------------- */
  openSettings(){
    this.openModal({
      title:t('settings.title'), subtitle:t('settings.subtitle'), icon:'⚙', narrow:true,
      body:`<div class="settings-list">
        <div class="setting-row language-row"><div><strong>${t('settings.language')}</strong><p>${t('settings.languageDesc')}</p></div><div class="lang-choices">${LANGUAGES.map(l=>`<button class="lang-choice ${getLang()===l.id?'active':''}" data-lang="${l.id}">${l.label}</button>`).join('')}</div></div>
        <div class="setting-row"><div><strong>${t('settings.sound')}</strong><p>${t('settings.soundDesc')}</p></div><button class="toggle ${this.settings.sound?'on':''}" data-setting="sound"></button></div>
        <div class="setting-row"><div><strong>${t('settings.particles')}</strong><p>${t('settings.particlesDesc')}</p></div><button class="toggle ${this.settings.particles?'on':''}" data-setting="particles"></button></div>
        <div class="setting-row"><div><strong>${t('settings.dayNight')}</strong><p>${t('settings.dayNightDesc')}</p></div><button class="toggle ${this.settings.dayNight?'on':''}" data-setting="dayNight"></button></div>
        <div class="setting-row"><div><strong>${t('settings.guide')}</strong><p>${t('settings.guideDesc')}</p></div><button class="btn small" id="openGuide">${t('settings.guideButton')}</button></div>
        <div class="setting-row"><div><strong>${t('settings.profile')}</strong><p>${t('settings.profileDesc',{name:escapeHtml(this.player.name),level:this.player.level,id:this.playerId})}</p></div><span class="rank-tag">${this.player.rank}</span></div>
        <div class="setting-row"><div><strong>${t('settings.reset')}</strong><p>${t('settings.resetDesc')}</p></div><button class="btn small" id="resetSave" style="color:#ff8b8b;border-color:rgba(255,107,107,.2)">${t('settings.resetButton')}</button></div>
      </div>`,
      footer:`<span>${t('settings.footer',{zone:zoneName(this.zone)})}</span><span>${t('settings.autosaved')}</span>`,
      onMount:(root)=>{
        root.querySelectorAll('[data-setting]').forEach(b=>b.onclick=()=>{
          const k=b.dataset.setting; this.settings[k]=!this.settings[k]; b.classList.toggle('on',this.settings[k]);
          if(k==='sound'){ this.audio.init(); this.audio.enabled=this.settings.sound; if(this.audio.master) this.audio.master.gain.value=this.settings.sound?.13:0; }
          this.save();
        });
        root.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{
          if(b.dataset.lang!==getLang()) this.setLanguage(b.dataset.lang);
        });
        root.querySelector('#openGuide').onclick=()=>this.openTutorial(false);
        root.querySelector('#resetSave').onclick=()=>{
          if(root.querySelector('#resetSave').dataset.confirm==='1') this.reset();
          else { root.querySelector('#resetSave').dataset.confirm='1'; root.querySelector('#resetSave').textContent=t('settings.resetConfirm'); }
        };
      }
    });
  }

  /* ---------------- UI: emotes ---------------- */
  openEmotes(){
    const emotes=[['👋','Wave'],['🎉','Cheer'],['💃','Dance'],['✨','Sparkle'],['❤️','Heart'],['💪','Flex']];
    this.openModal({
      title:t('emotes.title'), subtitle:t('emotes.subtitle'), icon:'☺', narrow:true,
      body:`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${emotes.map(([e,n])=>`<button class="btn" data-emote="${n}" style="height:76px;flex-direction:column;font-size:26px;gap:4px">${e}<span style="font-size:8px;color:#96a99f">${emoteName(n)}</span></button>`).join('')}</div>`,
      footer:`<span>${t('emotes.footer')}</span><span><kbd>X</kbd> ${t('emotes.closeHint')}</span>`,
      onMount:(root)=>{
        root.querySelectorAll('[data-emote]').forEach(b=>b.onclick=()=>{
          const n=b.dataset.emote;
          const text=`${emoteName(n)} ${n==='Wave'?'👋':'✨'}`;
          this.addChat('local','You',text,'');
          this.broadcast({type:'chat',channel:'local',name:this.player.name,text,id:this.playerId});
          this.closeModal(); this.toast(t('toast.emoteSentTitle'),t('toast.emoteSentBody',{name:emoteName(n)}),'purple');
        });
      }
    });
  }

  /* ---------------- UI: raid ---------------- */
  openRaid(){
    const done=this.quests.raid.claimed;
    this.openModal({
      title:t('raid.title'), subtitle:t('raid.subtitle'), icon:'◆', narrow:true,
      body:`<div style="text-align:center"><div style="position:relative;height:210px;display:grid;place-items:center;background:radial-gradient(circle,rgba(180,156,255,.18),transparent 65%);border-radius:16px;border:1px solid rgba(180,156,255,.18);overflow:hidden;margin-bottom:14px">
        <img src="${spriteUrl(384)}" alt="Rayquaza" style="width:170px;height:170px;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 16px 24px rgba(0,0,0,.45))">
        <span style="position:absolute;bottom:14px;font-family:Silkscreen;font-size:9px;letter-spacing:2px;color:#d8cbff">${t('raid.level',{level:Math.max(18,this.player.level+4)})}</span>
      </div>
      <p style="font-size:10px;line-height:1.6;color:#a9bcb3;max-width:440px;margin:0 auto 14px">${t('raid.desc')}</p>
      <div style="display:flex;justify-content:center;gap:18px;padding:11px;border-radius:9px;background:rgba(0,0,0,.18);margin-bottom:14px">
        <div style="text-align:center"><span style="display:block;font-size:7px;color:#6d8178;letter-spacing:1px">${t('raid.trainers')}</span><strong style="font-size:13px;color:#c8b7ff">47 / 50</strong></div>
        <div style="text-align:center"><span style="display:block;font-size:7px;color:#6d8178;letter-spacing:1px">${t('raid.timeLeft')}</span><strong style="font-size:13px;color:#c8b7ff">${$('#eventTimer').textContent}</strong></div>
        <div style="text-align:center"><span style="display:block;font-size:7px;color:#6d8178;letter-spacing:1px">${t('raid.reward')}</span><strong style="font-size:13px;color:#c8b7ff">${fmt(2500)}c</strong></div>
      </div>
      <button class="btn purple" id="joinRaid" style="width:100%;height:44px" ${done?'disabled':''}>${done?t('raid.cleared'):t('raid.join')}</button>
      <p style="font-size:7.5px;color:#6d8178;margin-top:9px">${t('raid.note')}</p></div>`,
      footer:`<span>${t('raid.footer')}</span><span><kbd>Esc</kbd> ${t('raid.closeHint')}</span>`,
      onMount:(root)=>{
        root.querySelector('#joinRaid').onclick=()=>{
          if(done) return;
          this.closeModal();
          this.battle.open(null,{raid:true,zone:ZONE_BY_ID.peak});
        };
      }
    });
  }

  /* ---------------- UI: dialogue ---------------- */
  openDialogue(npc){
    let index=0;
    const lines=npcLines(npc);
    const render=()=>{
      const line=lines[index];
      this.openModal({
        title:'', subtitle:'', icon:'', narrow:true, body:'', onMount:()=>{}
      });
      // Custom shell for a more intimate conversation layout.
      const root=$('#modalRoot');
      root.innerHTML=`<div class="modal narrow dialogue-modal">
        <div class="dialogue-body">
          <div class="dialogue-portrait">${npc.sprite?`<img src="${spriteUrl(npc.sprite)}" alt="">`:`<span style="font-size:36px">✎</span>`}</div>
          <div class="dialogue-copy"><div class="dialogue-name">${escapeHtml(npcName(npc))} <span>${escapeHtml(npcRole(npc))}</span></div><p class="dialogue-text">${escapeHtml(line)}</p></div>
        </div>
        <div class="dialogue-actions" id="dialogueActions"></div>
      </div>`;
      root.classList.add('open'); this.modalOpen=true;
      root.onclick=e=>{ if(e.target===root) this.closeModal(); };
      const actions=root.querySelector('#dialogueActions');
      const next=document.createElement('button'); next.className='btn primary'; next.textContent=index<lines.length-1?t('dialogue.continue'):t('dialogue.close');
      next.onclick=()=>{ this.audio.sfx('click'); if(index<lines.length-1){ index++; render(); } else finish(); };
      actions.appendChild(next);
      const finish=()=>{
        const type=npc.dialogueType;
        if(type==='professor'){
          const first=this.quests.main.talk===0;
          if(first){
            this.quests.main.talk=1; this.bag.pokeball+=10; this.addTrainerXp(250); this.audio.sfx('coin'); this.checkQuestCompletion();
            this.toast(t('toast.fieldSuppliesTitle'),t('toast.fieldSuppliesBody'),'gold');
            this.updateHud(); this.save();
          }
          this.closeModal(); this.openDex();
        } else if(type==='heal'){
          this.party.forEach(healMon); this.audio.sfx('heal');
          this.toast(t('toast.nurseHealedTitle'),t('toast.nurseHealedBody'),'gold');
          this.renderParty(); this.updateHud(); this.save(); this.closeModal();
        } else if(type==='shop'){
          this.openShop();
        } else if(type==='rival'||type==='trainer'){
          this.closeModal();
          if(npc.team) setTimeout(()=>this.battle.open(null,{trainer:npc}),250);
        } else this.closeModal();
      };
      if(index===lines.length-1){
        const type=npc.dialogueType;
        if(type==='heal'){ const b=document.createElement('button'); b.className='btn'; b.textContent=t('dialogue.heal'); b.onclick=()=>{this.party.forEach(healMon);this.audio.sfx('heal');this.toast(t('toast.teamHealedTitle'),t('toast.teamHealedBody'),'gold');this.renderParty();this.updateHud();this.closeModal();this.save();}; actions.prepend(b); }
        if(type==='shop'){ const b=document.createElement('button'); b.className='btn'; b.textContent=t('dialogue.browse'); b.onclick=()=>this.openShop(); actions.prepend(b); }
        if(type==='rival'||type==='trainer'){ const b=document.createElement('button'); b.className='btn'; b.textContent=t('dialogue.battle'); b.onclick=()=>{this.closeModal();this.battle.open(null,{trainer:npc});}; actions.prepend(b); }
        if(type==='professor'){ const b=document.createElement('button'); b.className='btn'; b.textContent=t('dialogue.dex'); b.onclick=()=>{this.closeModal();this.openDex();}; actions.prepend(b); }
      }
    };
    render();
  }

  /* ---------------- UI: story tutorial ---------------- */
  openTutorial(auto=false){
    this.settings.tutorialSeen=true; this.save();
    const steps=[
      ['◈',t('tutorial.stepMoveTitle'),t('tutorial.stepMove')],
      ['E',t('tutorial.stepInteractTitle'),t('tutorial.stepInteract')],
      ['◉',t('tutorial.stepCatchTitle'),t('tutorial.stepCatch')],
      ['⚔',t('tutorial.stepBattleTitle'),t('tutorial.stepBattle')],
      ['★',t('tutorial.stepGrowTitle'),t('tutorial.stepGrow')]
    ];
    this.openModal({
      title:t('tutorial.title'), subtitle:t('tutorial.subtitle'), icon:'✦', wide:true,
      body:`<div class="tutorial-layout">
        <div class="tutorial-story">
          <span class="tutorial-kicker">${t('tutorial.subtitle')}</span>
          <h3>${t('tutorial.storyTitle')}</h3>
          <p>${t('tutorial.story')}</p>
          <div class="tutorial-controls">${t('tutorial.controls')}</div>
        </div>
        <div class="tutorial-steps">
          ${steps.map(([ico,title,body])=>`<div class="tutorial-step"><span class="ts-ico">${ico}</span><div><strong>${title}</strong><p>${body}</p></div></div>`).join('')}
        </div>
      </div>`,
      footer:`<span>${t('tutorial.reopen')}</span><button class="btn primary small" id="tutorialStart">${t('tutorial.start')}</button>`,
      onMount:(root)=>{ root.querySelector('#tutorialStart').onclick=()=>this.closeModal(); }
    });
  }

  /* ---------------- chat helpers ---------------- */
  // Reserved for future features.
}

function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function bagIcon(k){
  if(k==='pokeball'||k==='greatball'||k==='ultraball') return `<span class="item-ball ${k==='greatball'?'great':''}" style="${k==='ultraball'?'background:linear-gradient(180deg,#ffd54d 0 45%,#1b241f 46% 54%,#f4f7ef 55%)':''}"></span>`;
  if(k==='potion'||k==='superpotion') return '<span class="item-potion"></span>';
  if(k==='berry') return '<span style="font-size:20px">🍒</span>';
  if(k==='revive') return '<span style="font-size:18px;color:#c9f46c">✚</span>';
  return '<span style="font-size:18px">✦</span>';
}
