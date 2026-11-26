import { createMon, calcDamage, catchChance, typeEffect, spriteUrl, xpToNext, clamp, TYPE_COLORS, pick, ITEMS, ZONE_BY_ID } from './data.js';
import { t, itemName, moveName, typeName, speciesName, zoneName, npcName, lv } from './i18n.js';

const $ = (s,r=document)=>r.querySelector(s);

export class Battle {
  constructor(game){
    this.game=game;
    this.active=false;
    this.busy=false;
    this.wild=null;
    this.trainer=null;
    this.raid=false;
    this.enemyTeam=[];
    this.enemyIndex=0;
    this.ally=null;
    this.enemy=null;
    this.logText='';
    this.selectedBall='pokeball';
    this.startedAt=0;
    this.root=$('#battleRoot');
    this.boundKey=(e)=>this.onKey(e);
  }

  open(wild, opts={}){
    if(this.active) return;
    this.active=true; this.busy=false;
    this.wild=wild; this.trainer=opts.trainer||null; this.raid=!!opts.raid;
    this.battleZone=opts.zone||this.game.zone;
    this.startedAt=performance.now();
    this.ally=this.game.party.find(m=>m.hp>0) || this.game.party[0];
    if(!this.ally){ this.active=false; this.game.toast(t('battle.exhaustedTitle'),t('battle.exhaustedBody'),'gold'); return; }
    if(this.trainer){
      const levels=this.trainer.team.map((id,i)=>Math.max(10, this.game.player.level + (i===0?1:2)));
      this.enemyTeam=this.trainer.team.map((id,i)=>createMon(id,levels[i],this.game.data));
      this.enemyIndex=0; this.enemy=this.enemyTeam[0];
    } else if(this.raid){
      this.enemy=createMon(384, Math.max(18,this.game.player.level+4), this.game.data);
      this.enemy.maxHp=Math.round(this.enemy.maxHp*1.25); this.enemy.hp=this.enemy.maxHp;
      this.enemy.name=t('battle.raidName');
    } else {
      this.enemy=createMon(wild.id, wild.level, this.game.data);
      if(wild.shiny){ this.enemy.shiny=true; this.enemy.name='✦ '+this.enemy.name; }
      this.enemy.hp=this.enemy.maxHp;
    }
    this.ally.hp=Math.max(1,this.ally.hp);
    this.build();
    this.root.classList.add('open');
    this.game.paused=true;
    this.game.audio.setMode('battle');
    this.game.audio.sfx('open');
    document.addEventListener('keydown',this.boundKey);
    this.renderAll();
    this.log(this.trainer?t('battle.challenge',{name:npcName(this.trainer)}):t('battle.wildAppeared',{name:this.enemy.name.replace('✦ ','')}));
    this.root.querySelector('.battle-exit').onclick=()=>this.tryRun(true);
    setTimeout(()=>{ if(this.active) this.log(this.trainer?t('battle.chooseMove'):t('battle.whatDo')); },900);
  }

  build(){
    const biome=this.battleZone?.biome||'meadow';
    const z=this.battleZone;
    this.root.innerHTML=`
      <div class="battle-scene" data-biome="${biome}">
        <div class="battle-sky"></div>
        <div class="battle-sun"></div>
        <div class="battle-cloud c1"></div><div class="battle-cloud c2"></div>
        <div class="battle-hills"></div>
        <div class="battle-ground"></div>
        <div class="battle-platform enemy-platform"></div>
        <div class="battle-platform ally-platform"></div>
        <div class="battle-topbar">
          <div class="battle-mode"><span class="dot"></span>${this.trainer?t('battle.trainerMode'):this.raid?t('battle.raidMode'):t('battle.wildMode')} · ${(z?zoneName(z):'').toUpperCase()||'VERDANT WILDS'}</div>
          <button class="battle-exit" aria-label="${t('battle.exit')}">✕</button>
        </div>
        <div class="enemy-mon"><img id="enemySprite" src="${spriteUrl(this.enemy.id)}" alt=""></div>
        <div class="ally-mon"><img id="allySprite" src="${spriteUrl(this.ally.id)}" alt=""></div>
        <div class="battle-hud enemy-hud">
          <div class="hud-top"><strong id="enemyName">${this.enemy.name}</strong><span id="enemyLv">Lv.${this.enemy.level}</span></div>
          <div class="hud-types" id="enemyTypes"></div>
          <div class="hud-hp"><div class="hud-hp-top"><span>${t('battle.hp')}</span><span id="enemyHpText"></span></div><div class="hp-track"><i id="enemyHp"></i></div></div>
          <div class="hud-sub"><span id="enemyStatus">${t('battle.wildStatus')}</span><span id="enemyDex"></span></div>
        </div>
        <div class="battle-hud ally-hud">
          <div class="hud-top"><strong id="allyName">${this.ally.name}</strong><span id="allyLv">Lv.${this.ally.level}</span></div>
          <div class="hud-types" id="allyTypes"></div>
          <div class="hud-hp"><div class="hud-hp-top"><span>${t('battle.hp')}</span><span id="allyHpText"></span></div><div class="hp-track"><i id="allyHp"></i></div></div>
          <div class="hud-sub"><span id="allyStatus">${t('battle.ready')}</span><span id="allyXp"></span></div>
        </div>
        <div class="battle-log" id="battleLog"></div>
        <div class="battle-panel">
          <div class="battle-menu" id="battleMoves"></div>
          <div class="battle-actions">
            <h4>${t('battle.actions')}</h4>
            <button class="action-btn" data-act="catch"><span class="a-ico">◉</span>${t('battle.catch')}<kbd>C</kbd></button>
            <button class="action-btn" data-act="switch"><span class="a-ico blue">⇄</span>${t('battle.switch')}<kbd>P</kbd></button>
            <button class="action-btn" data-act="bag"><span class="a-ico orange">▣</span>${t('battle.bag')}<kbd>B</kbd></button>
            <button class="action-btn run" data-act="run"><span class="a-ico">↩</span>${t('battle.run')}<kbd>R</kbd></button>
            <div class="battle-hint">${t('battle.hint')}</div>
          </div>
        </div>
        <div class="battle-bag" id="battleBag"></div>
        <div class="catch-overlay" id="catchOverlay">
          <div class="catch-burst"></div>
          <div class="catch-ball"></div>
          <div class="catch-label" id="catchLabel">1... 2... 3...</div>
        </div>
        <div class="battle-result" id="battleResult"></div>
      </div>`;
    this.root.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>this.action(b.dataset.act));
    this.updateHud();
    this.renderMoves();
    this.root.querySelector('.battle-exit').onclick=()=>this.tryRun(true);
  }

  typeChips(types){
    return types.map(tp=>`<span class="type-chip" style="background:${TYPE_COLORS[tp]||'#999'}">${typeName(tp)}</span>`).join('');
  }

  renderAll(){ this.updateHud(); this.renderMoves(); }

  updateHud(){
    if(!this.enemy||!this.ally) return;
    const en=this.root.querySelector('#enemyHp');
    const al=this.root.querySelector('#allyHp');
    const er=this.enemy.hp/this.enemy.maxHp, ar=this.ally.hp/this.ally.maxHp;
    if(en){ en.style.width=Math.max(0,er*100)+'%'; en.className=er<.22?'low':er<.52?'mid':''; }
    if(al){ al.style.width=Math.max(0,ar*100)+'%'; al.className=ar<.22?'low':ar<.52?'mid':''; }
    const set=(id,v)=>{ const el=this.root.querySelector(id); if(el) el.textContent=v; };
    set('#enemyHpText',`${Math.max(0,Math.ceil(this.enemy.hp))} / ${this.enemy.maxHp}`);
    set('#allyHpText',`${Math.max(0,Math.ceil(this.ally.hp))} / ${this.ally.maxHp}`);
    set('#enemyName',this.enemy.name);
    set('#enemyLv',lv(this.enemy.level));
    set('#allyName',this.ally.name);
    set('#allyLv',lv(this.ally.level));
    set('#allyXp',`${this.ally.xp} / ${this.ally.xpNext} XP`);
    set('#enemyStatus',this.trainer?t('battle.trainerStatus'):this.raid?t('battle.raidStatus'):this.enemy.shiny?t('battle.shinyStatus'):t('battle.wildStatus'));
    set('#enemyDex',`#${String(this.enemy.id).padStart(4,'0')}`);
    set('#allyStatus',this.ally.status||t('battle.ready'));
    const et=this.root.querySelector('#enemyTypes'); if(et) et.innerHTML=this.typeChips(this.enemy.types);
    const at=this.root.querySelector('#allyTypes'); if(at) at.innerHTML=this.typeChips(this.ally.types);
    const eimg=this.root.querySelector('#enemySprite'); if(eimg&&eimg.dataset.id!==String(this.enemy.id)){ eimg.src=spriteUrl(this.enemy.id); eimg.dataset.id=this.enemy.id; }
    const aimg=this.root.querySelector('#allySprite'); if(aimg&&aimg.dataset.id!==String(this.ally.id)){ aimg.src=spriteUrl(this.ally.id); aimg.dataset.id=this.ally.id; }
  }

  renderMoves(){
    const box=this.root.querySelector('#battleMoves'); if(!box) return;
    box.innerHTML=this.ally.moves.map((m,i)=>{
      const eff=typeEffect(m.type,this.enemy.types);
      const effTag=eff>1?t('battle.effSuper'):eff===0?t('battle.effNone'):eff<1&&eff>0?t('battle.effResisted'):'';
      return `<button class="move-btn" data-move="${i}" style="--mt:${TYPE_COLORS[m.type]}" ${m.pp<=0?'disabled':''}>
        <div class="move-name">${moveName(m.name)}<span>${m.pp}/${m.maxPp} ${t('battle.pp')}</span></div>
        <div class="move-meta"><span class="type-chip" style="background:${TYPE_COLORS[m.type]}">${typeName(m.type)}</span><span>${t('battle.pwr')} ${m.power}</span><b>${m.acc}%${effTag}</b></div>
      </button>`;
    }).join('');
    box.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>this.playerMove(Number(b.dataset.move)));
  }

  log(text){
    this.logText=text;
    const el=this.root.querySelector('#battleLog'); if(!el) return;
    el.textContent=text; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }

  action(act){
    if(!this.active||this.busy) return;
    if(act==='run') this.tryRun();
    else if(act==='catch') this.openBag('balls');
    else if(act==='bag') this.openBag('items');
    else if(act==='switch') this.openSwitch();
  }

  openBag(mode='balls'){
    if(this.trainer&&mode==='balls'){ this.log(t('battle.cantCatchTrainer')); return; }
    if(this.raid&&mode==='balls'){ this.log(t('battle.raidBarrier')); return; }
    const bag=this.root.querySelector('#battleBag');
    const balls=['pokeball','greatball','ultraball'].filter(k=>this.game.bag[k]>0);
    const items=['potion','superpotion','berry'].filter(k=>this.game.bag[k]>0);
    const list=mode==='balls'?balls:items;
    bag.innerHTML=`<div class="battle-bag-inner">
      <h3>${mode==='balls'?t('battle.throwBall'):t('battle.useItem')}</h3>
      <p>${mode==='balls'?t('battle.catchHint'):t('battle.itemHint',{name:this.ally.name,hp:Math.ceil(this.ally.hp),max:this.ally.maxHp})}</p>
      <div class="battle-bag-grid">
        ${list.length?list.map(k=>`<button class="bag-choice" data-item="${k}">${itemIcon(k)}<span>${itemName(k)}</span><b>×${this.game.bag[k]}</b></button>`).join(''):`<div class="bag-choice" style="grid-column:1/-1;justify-content:center;color:#6d8178">${t('battle.noItems')}</div>`}
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn small" data-close-bag>${t('battle.back')}</button></div>
    </div>`;
    bag.classList.add('open');
    bag.querySelector('[data-close-bag]').onclick=()=>bag.classList.remove('open');
    bag.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{
      bag.classList.remove('open');
      if(mode==='balls') this.attemptCatch(b.dataset.item); else this.useItem(b.dataset.item);
    });
  }

  openSwitch(){
    const bag=this.root.querySelector('#battleBag');
    bag.innerHTML=`<div class="battle-bag-inner">
      <h3>${t('battle.switchTitle')}</h3><p>${t('battle.switchHint')}</p>
      <div class="battle-bag-grid">
        ${this.game.party.map((m,i)=>`<button class="bag-choice" data-switch="${i}" ${m.hp<=0||m===this.ally?'disabled':''}>
          <img src="${spriteUrl(m.id)}" style="width:28px;height:28px;image-rendering:pixelated" alt="">
          <span>${m.name}<br><small style="color:#6d8178;font-size:7px">${lv(m.level)} · ${Math.ceil(m.hp)}/${m.maxHp} ${t('battle.hp')}</small></span>
        </button>`).join('')}
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn small" data-close-bag>${t('battle.back')}</button></div>
    </div>`;
    bag.classList.add('open');
    bag.querySelector('[data-close-bag]').onclick=()=>bag.classList.remove('open');
    bag.querySelectorAll('[data-switch]').forEach(b=>b.onclick=()=>{
      const mon=this.game.party[Number(b.dataset.switch)];
      if(!mon||mon.hp<=0||mon===this.ally) return;
      bag.classList.remove('open');
      this.busy=true;
      this.log(t('battle.comeBackGo',{old:this.ally.name,new:mon.name}));
      this.ally=mon;
      this.updateHud(); this.renderMoves();
      if(this.switchAfterFaint){ this.switchAfterFaint=false; this.busy=false; this.finishTurn(); }
      else setTimeout(()=>{ this.busy=false; this.enemyTurn(); },650);
    });
  }

  playerMove(i){
    if(!this.active||this.busy) return;
    const move=this.ally.moves[i];
    if(!move||move.pp<=0) return;
    this.busy=true;
    move.pp--;
    this.renderMoves();
    this.log(t('battle.used',{name:this.ally.name,move:moveName(move.name)}));
    const result=calcDamage(this.ally,this.enemy,move,this.game.data);
    this.animateHit('enemy',result,move);
    setTimeout(()=>{
      if(!this.active) return;
      if(result.miss){ this.log(t('battle.missed',{name:this.ally.name})); this.afterPlayerAction(); return; }
      this.enemy.hp=Math.max(0,this.enemy.hp-result.dmg);
      this.updateHud();
      if(result.mult===0) this.log(t('battle.noEffect'));
      else if(result.crit) this.log(t('battle.crit',{dmg:result.dmg}));
      else if(result.mult>1) this.log(t('battle.super',{dmg:result.dmg}));
      else if(result.mult<1) this.log(t('battle.notVery',{dmg:result.dmg}));
      else this.log(t('battle.tookDamage',{name:this.enemy.name,dmg:result.dmg}));
      this.game.audio.sfx(result.mult>1?'super':'hit');
      if(this.enemy.hp<=0) setTimeout(()=>this.enemyFainted(),500);
      else this.afterPlayerAction();
    },520);
  }

  afterPlayerAction(){
    if(!this.active) return;
    setTimeout(()=>{
      if(!this.active) return;
      this.enemyTurn();
    },420);
  }

  enemyTurn(){
    if(!this.active||this.enemy.hp<=0) return;
    this.busy=true;
    const moves=this.enemy.moves.filter(m=>m.pp>0);
    if(!moves.length){ this.busy=false; return; }
    let move=pick(moves);
    const superMoves=moves.filter(m=>typeEffect(m.type,this.ally.types)>1);
    if(superMoves.length&&Math.random()<.55) move=pick(superMoves);
    move.pp--;
    setTimeout(()=>{
      if(!this.active) return;
      this.log(t('battle.used',{name:this.enemy.name,move:moveName(move.name)}));
      const result=calcDamage(this.enemy,this.ally,move,this.game.data);
      this.animateHit('ally',result,move);
      setTimeout(()=>{
        if(!this.active) return;
        if(result.miss){ this.log(t('battle.missed',{name:this.enemy.name})); this.finishTurn(); return; }
        this.ally.hp=Math.max(0,this.ally.hp-result.dmg);
        this.updateHud();
        if(result.mult>1) this.log(t('battle.superTook',{name:this.ally.name,dmg:result.dmg}));
        else if(result.mult<1&&result.mult>0) this.log(t('battle.notVeryTook',{dmg:result.dmg}));
        else this.log(t('battle.tookDamage',{name:this.ally.name,dmg:result.dmg}));
        this.game.audio.sfx('hit');
        if(this.ally.hp<=0) setTimeout(()=>this.allyFainted(),600);
        else this.finishTurn();
      },520);
    },650);
  }

  finishTurn(){
    this.busy=false;
    if(!this.active) return;
    this.log(t('battle.whatDo'));
  }

  animateHit(who,result,move){
    const img=this.root.querySelector(who==='enemy'?'#enemySprite':'#allySprite');
    if(img){ img.classList.remove('hit'); void img.offsetWidth; img.classList.add('hit'); }
    if(!result.miss&&result.dmg>0){
      const el=document.createElement('div');
      el.className='battle-float'+(result.crit?' crit':'');
      el.textContent='-'+result.dmg;
      el.style.color=result.mult>1?'#ffd75e':result.mult===0?'#9caaa3':'#fff';
      el.style.left=who==='enemy'?'68%':'26%';
      el.style.top=who==='enemy'?'27%':'58%';
      this.root.querySelector('.battle-scene').appendChild(el);
      setTimeout(()=>el.remove(),900);
    }
    const burst=document.createElement('div');
    burst.className='battle-burst';
    burst.style.background=TYPE_COLORS[move.type];
    burst.style.left=who==='enemy'?'68%':'26%';
    burst.style.top=who==='enemy'?'30%':'58%';
    this.root.querySelector('.battle-scene').appendChild(burst);
    setTimeout(()=>burst.remove(),500);
  }

  useItem(key){
    const item=ITEMS[key];
    if(!this.game.bag[key]) return;
    this.busy=true;
    this.game.bag[key]--;
    this.game.updateHud();
    if(item.heal){
      this.ally.hp=Math.min(this.ally.maxHp,this.ally.hp+item.heal);
      this.updateHud(); this.log(t('battle.restored',{name:this.ally.name,hp:item.heal}));
      this.game.audio.sfx('heal');
      setTimeout(()=>{ if(this.active) this.enemyTurn(); },650);
    }
  }

  attemptCatch(ballKey='pokeball'){
    if(!this.active||this.busy||this.trainer||this.raid) return;
    if(!this.game.bag[ballKey]) return;
    this.busy=true;
    this.game.bag[ballKey]--; this.game.updateHud();
    const ball=ITEMS[ballKey];
    this.log(t('battle.threw',{ball:itemName(ballKey)}));
    this.game.audio.sfx('throw');
    const ov=this.root.querySelector('#catchOverlay');
    ov.querySelector('.catch-ball').style.background=ballKey==='greatball'?'linear-gradient(180deg,#5b9cff 0 45%,#1b241f 46% 54%,#f4f7ef 55%)':ballKey==='ultraball'?'linear-gradient(180deg,#ffd54d 0 45%,#1b241f 46% 54%,#f4f7ef 55%)':'';
    ov.classList.add('show');
    const label=ov.querySelector('#catchLabel');
    const chance=catchChance(this.enemy,ball.catch);
    const success=Math.random()<chance;
    label.textContent='1...';
    setTimeout(()=>label.textContent='2...',650);
    setTimeout(()=>label.textContent='3...',1250);
    setTimeout(()=>{
      ov.classList.remove('show');
      if(success){
        this.game.audio.sfx('catch');
        this.log(t('battle.gotcha',{name:this.enemy.name.replace('✦ ','')}));
        setTimeout(()=>this.catchSuccess(),650);
      } else {
        this.game.audio.sfx('flee');
        this.log(t('battle.brokeFree',{name:this.enemy.name}));
        this.busy=false;
        setTimeout(()=>{ if(this.active) this.enemyTurn(); },600);
      }
    },1900);
  }

  catchSuccess(){
    if(!this.active) return;
    const mon=this.enemy;
    const res=this.game.onCatch(mon,this.wild);
    this.showResult('caught',{
      title:t('battle.caughtTitle',{name:mon.name.replace('✦ ','')}),
      desc:res.partyFull?t('battle.caughtDescBox'):t('battle.caughtDescParty'),
      stats:[['level',mon.level],['dex',`#${String(mon.id).padStart(4,'0')}`],['hp',`${mon.hp}/${mon.maxHp}`]],
      sprite:mon.id
    });
  }

  enemyFainted(){
    if(!this.active) return;
    this.game.audio.sfx('level');
    if(this.trainer&&this.enemyIndex<this.enemyTeam.length-1){
      this.enemyIndex++;
      this.enemy=this.enemyTeam[this.enemyIndex];
      this.log(t('battle.sentOut',{trainer:npcName(this.trainer),name:this.enemy.name}));
      this.updateHud(); this.renderMoves();
      setTimeout(()=>{ this.busy=false; this.log(t('battle.whatDo')); },800);
      return;
    }
    const xp=Math.floor((this.enemy.level*7+this.enemy.base.atk*.35+this.enemy.base.hp*.25)*(this.trainer?1.35:1));
    const gains=this.game.addXp(this.ally,xp);
    this.game.audio.sfx('level');
    if(this.raid){ this.game.onRaidWin(); }
    if(this.trainer){
      const prize=350+this.game.player.level*35;
      this.game.player.coins+=prize;
      this.game.onTrainerWin(this.trainer,prize);
    }
    this.game.questEvent('battleWin',{enemy:this.enemy});
    this.game.updateHud();
    const stats=[['xp',`+${xp}`],['level',`${this.ally.level}`]];
    if(gains.length) stats.push(['levelUp',`+${gains.length}`]);
    this.showResult('win',{
      title:this.trainer?t('battle.trainerDefeated',{name:npcName(this.trainer)}):t('battle.victory'),
      desc:this.trainer?t('battle.earnedTrainer',{coins:350+this.game.player.level*35,xp}):t('battle.earnedWild',{name:this.ally.name,xp}),
      stats,sprite:this.enemy.id
    });
  }

  allyFainted(){
    if(!this.active) return;
    const next=this.game.party.find(m=>m.hp>0);
    if(next){
      this.busy=false; this.switchAfterFaint=true;
      this.openSwitch();
      this.log(t('battle.faintedChoose',{name:this.ally.name}));
    } else {
      this.game.audio.sfx('flee');
      this.game.onDefeat();
      this.showResult('lose',{
        title:t('battle.teamExhausted'),
        desc:t('battle.teamExhaustedDesc'),
        stats:[['coins',`-${Math.min(200,this.game.player.coins)}`],['return',t('battle.returnVerdant')]],sprite:null
      });
    }
  }

  tryRun(silent=false){
    if(!this.active||this.busy) return;
    if(this.trainer){ this.log(t('battle.noRunTrainer')); return; }
    const chance=.52+this.ally.stats.spe/(this.enemy.stats.spe*2.2);
    if(Math.random()<chance||silent&&!this.raid){
      this.game.audio.sfx('flee');
      this.log(t('battle.ran'));
      setTimeout(()=>{ this.game.endBattle(); this.close(); },450);
    } else {
      this.busy=true; this.log(t('battle.couldntRun'));
      setTimeout(()=>{ if(this.active) this.enemyTurn(); },500);
    }
  }

  showResult(type,data){
    this.busy=true;
    const el=this.root.querySelector('#battleResult');
    const emblem=type==='caught'?'◉':type==='win'?'★':type==='lose'?'✕':'✦';
    el.innerHTML=`<div class="result-card">
      <div class="result-emblem" style="${type==='lose'?'background:rgba(255,107,107,.12);color:#ff8b8b;border-color:rgba(255,107,107,.25)':''}">${emblem}</div>
      <h3>${data.title}</h3>
      <p>${data.desc}</p>
      <div class="result-stats">${data.stats.map(([k,v])=>`<div><span>${t('result.'+k)}</span><strong>${v}</strong></div>`).join('')}</div>
      <button class="btn primary" id="battleContinue">${t('result.continue')}</button>
    </div>`;
    el.classList.add('show');
    el.querySelector('#battleContinue').onclick=()=>{
      this.game.audio.sfx('click');
      if(type==='caught'||type==='win') this.game.endBattle();
      else this.game.endBattle();
      this.close();
    };
    if(type==='win'||type==='caught'){
      this.game.save();
    }
  }

  close(){
    if(!this.active) return;
    this.active=false; this.paused=false;
    this.root.classList.remove('open');
    this.root.innerHTML='';
    document.removeEventListener('keydown',this.boundKey);
    this.game.paused=false;
    this.game.audio.setMode('world');
    this.game.updateHud();
    this.game.lastBattleEnd=performance.now();
  }

  onKey(e){
    if(!this.active) return;
    if(e.key>='1'&&e.key<='4'){ this.playerMove(Number(e.key)-1); e.preventDefault(); }
    else if(e.key.toLowerCase()==='c'){ this.openBag('balls'); e.preventDefault(); }
    else if(e.key.toLowerCase()==='r'){ this.tryRun(); e.preventDefault(); }
    else if(e.key.toLowerCase()==='b'){ this.openBag('items'); e.preventDefault(); }
    else if(e.key.toLowerCase()==='p'){ this.openSwitch(); e.preventDefault(); }
    else if(e.key==='Escape'){ const bag=this.root.querySelector('#battleBag'); if(bag?.classList.contains('open')) bag.classList.remove('open'); e.preventDefault(); }
  }
}

function itemIcon(k){
  if(k==='potion'||k==='superpotion'||k==='berry') return '<span class="item-potion" style="width:18px;height:22px"></span>';
  return `<span class="item-ball ${k==='greatball'?'great':''}" style="${k==='ultraball'?'background:linear-gradient(180deg,#ffd54d 0 45%,#1b241f 46% 54%,#f4f7ef 55%)':''};width:20px;height:20px"></span>`;
}
