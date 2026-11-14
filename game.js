(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 960, H = 540, GROUND = 438;
  const $ = id => document.getElementById(id);
  const held = new Set();
  const keys = { a:'a', d:'d', w:'w', s:'s', j:'j', k:'k', q:'q', u:'u', i:'i' };
  let started = false, paused = false, gameOver = false, soundOn = true, last = 0, tick = 0;
  let timer = 60, timerTick = 0, round = 1, playerWins = 0, enemyWins = 0, shake = 0, combo = 0, comboTimer = 0;
  let audio;
  const particles = [], projectiles = [], effects = [];
  const player = makeFighter('kai', 282, 1);
  const enemy = makeFighter('vex', 678, -1);

  function makeFighter(type, x, facing) {
    return { type, x, y:GROUND, vx:0, vy:0, facing, health:100, meter:0, state:'idle', stateTime:0, attack:null, attackHit:false,
      flash:0, invuln:0, cooldown:0, aiWait:1, walk:0, wins:0, block:false, crouch:false, specialTrail:[] };
  }
  function beep(freq=180, duration=.08, kind='square', volume=.035) {
    if (!soundOn) return;
    try { audio ||= new (window.AudioContext||window.webkitAudioContext)(); const o=audio.createOscillator(), g=audio.createGain(); o.type=kind; o.frequency.setValueAtTime(freq,audio.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(45,freq*.55),audio.currentTime+duration); g.gain.setValueAtTime(volume,audio.currentTime); g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration); o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration); } catch {}
  }
  function setCallout(text, className='') { const c=$('callout'); c.querySelector('b').textContent=text; c.className='round-callout show '+className; }
  function startGame() {
    $('startModal').classList.remove('is-visible'); $('resultModal').classList.remove('is-visible');
    started=true; paused=false; gameOver=false; round=1; playerWins=0; enemyWins=0; resetRound(); setCallout('FIGHT!');
  }
  function resetRound() {
    player.x=282;player.y=GROUND;player.vx=0;player.vy=0;player.facing=1;player.health=100;player.meter=0;player.state='idle';player.stateTime=0;player.attack=null;player.invuln=0;player.cooldown=0;player.block=false;
    enemy.x=678;enemy.y=GROUND;enemy.vx=0;enemy.vy=0;enemy.facing=-1;enemy.health=100;enemy.meter=0;enemy.state='idle';enemy.stateTime=0;enemy.attack=null;enemy.invuln=0;enemy.cooldown=0;enemy.aiWait=.7+Math.random()*.6;
    timer=60;timerTick=0;projectiles.length=0;particles.length=0;effects.length=0;combo=0;comboTimer=0;updateHud();
  }
  function updateHud() {
    $('playerHealth').style.width=Math.max(0,player.health)+'%'; $('enemyHealth').style.width=Math.max(0,enemy.health)+'%';
    $('playerMeter').style.width=player.meter+'%'; $('enemyMeter').style.width=enemy.meter+'%'; $('timer').textContent=String(timer).padStart(2,'0');
    $('playerWins').textContent='●'.repeat(playerWins)+'○'.repeat(3-playerWins); $('enemyWins').textContent='○'.repeat(3-enemyWins)+'●'.repeat(enemyWins);
    $('comboReadout').textContent=combo>1&&comboTimer>0?`${combo} HIT COMBO!`:'';
  }
  function action(f, kind) {
    if (!started||paused||gameOver||f.health<=0||f.state==='hurt'||f.state==='special'||f.state==='ko') return;
    const special=['bolt','rising','phase'].includes(kind);
    if (f.cooldown>0||f.attack) return;
    if(special&&f.meter<34){ f.state='idle'; return; }
    if(special) f.meter-=34;
    f.block=false; f.state=special?'special':'attack'; f.stateTime=0;f.attackHit=false;f.attack=kind;
    const durations={jab:.27,kick:.43,bolt:.55,rising:.63,phase:.48};
    f.attackDuration=durations[kind]||.3; f.cooldown=kind==='bolt'?.8:kind==='rising'?.9:kind==='phase'?.8:.12;
    if(kind==='bolt') { setTimeout(()=>{if(started&&!paused) launchProjectile(f);},130); beep(340,.11,'sawtooth'); }
    if(kind==='rising') { f.vy=-570;f.invuln=.26;spawnBurst(f.x,f.y-65,f.type==='kai'?'#ffcd70':'#a998ff',14);shake=7;beep(225,.2,'sawtooth'); }
    if(kind==='phase') {f.vx=f.facing*600;f.invuln=.32;f.specialTrail=[];spawnBurst(f.x,f.y-45,f.type==='kai'?'#66eee0':'#ff7395',10);beep(510,.15,'triangle');}
    if(kind==='jab'||kind==='kick') beep(kind==='jab'?150:110,.07,'square',.02);
  }
  function launchProjectile(f) {
    if(!started||f.health<=0) return;
    projectiles.push({x:f.x+f.facing*46,y:f.y-88,vx:f.facing*430,owner:f,type:f.type,life:2.2,r:17});
    spawnBurst(f.x+f.facing*42,f.y-85,f.type==='kai'?'#ffcc6d':'#83f0e2',8);
  }
  function spawnBurst(x,y,color,n=8) { for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*190;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.4,max:.65,color,size:2+Math.random()*5});} }
  function hurt(target, source, damage, force=140, special=false) {
    if(target.invuln>0||target.health<=0)return false;
    const blocked=target.block&&target.y>=GROUND-1&&target.facing===Math.sign(source.x-target.x);
    const dealt=blocked?Math.ceil(damage*.22):damage;
    target.health=Math.max(0,target.health-dealt); target.meter=Math.min(100,target.meter+(blocked?7:12));source.meter=Math.min(100,source.meter+(blocked?3:8));
    target.state=target.health<=0?'ko':blocked?'block':'hurt';target.stateTime=0;target.attack=null;target.attackHit=true;target.flash=blocked?.08:.15;
    target.vx=(target.x<source.x?-1:1)*(blocked?45:force);if(!blocked&&target.y===GROUND)target.vy=special?-210:-100;
    shake=blocked?3:7;spawnBurst((target.x+source.x)/2,target.y-86,blocked?'#d9e7ff':source.type==='kai'?'#ffd36d':'#7ef6e8',blocked?5:12);
    $('impactFlash').classList.remove('on');void $('impactFlash').offsetWidth;$('impactFlash').classList.add('on');
    if(source===player&&!blocked){combo++;comboTimer=1.6;} beep(blocked?230:95,blocked?.06:.12,blocked?'triangle':'sawtooth',blocked?.025:.05);return true;
  }
  function attackCheck(f, other) {
    if(!f.attack||f.attackHit)return;
    const t=f.stateTime, kind=f.attack;
    if(kind==='bolt'||kind==='rising'&&t>.25)return;
    const start=kind==='jab'?.08:kind==='kick'?.13:kind==='rising'?.12:kind==='phase'?.12:.08;
    const end=kind==='jab'?.19:kind==='kick'?.31:kind==='rising'?.48:kind==='phase'?.37:.2;
    if(t<start||t>end)return;
    const reach=kind==='jab'?61:kind==='kick'?83:kind==='rising'?72:kind==='phase'?78:55;
    const dx=(other.x-f.x)*f.facing;
    const dy=Math.abs((other.y-90)-(f.y-83));
    if(dx>0&&dx<reach&&dy<105){f.attackHit=true;hurt(other,f,kind==='jab'?7:kind==='kick'?12:kind==='rising'?18:kind==='phase'?15:8,kind==='jab'?110:kind==='kick'?180:260,kind==='rising'||kind==='phase');}
  }
  function playerUpdate(dt) {
    if(player.health<=0)return;
    const moving=held.has('a')||held.has('d'), grounded=player.y>=GROUND-1;
    player.block=held.has('s')&&!moving&&!player.attack;
    player.crouch=held.has('s')&&!moving;
    if(player.attack){
      player.stateTime+=dt; attackCheck(player,enemy);
      if(player.attack==='phase'&&player.stateTime<.28)player.vx=player.facing*540;
      if(player.stateTime>=player.attackDuration){player.attack=null;player.state='idle';player.vx*=.25;}
    } else if(!player.block&&player.state!=='hurt'&&player.state!=='ko') {
      let dir=(held.has('d')?1:0)-(held.has('a')?1:0);
      if(dir){player.vx=dir*235;player.state=grounded?'walk':'air';player.facing=dir;player.walk+=dt*10;} else {player.vx*=Math.pow(.001,dt);if(Math.abs(player.vx)<5)player.vx=0;if(grounded)player.state='idle';}
      if(held.has('w')&&grounded){player.vy=-440;player.state='air';beep(180,.07,'triangle',.015);}
      for(const [key,kind] of [['j','jab'],['k','kick'],['q','bolt'],['u','rising'],['i','phase']])if(held.has(key)){held.delete(key);action(player,kind);break;}
    }
    if(player.state==='hurt'||player.state==='block'){player.stateTime+=dt;if(player.stateTime>(player.state==='block'?.15:.34)){player.state=player.block?'block':'idle';player.vx*=.25;}}
    player.vy+=1150*dt;player.y+=player.vy*dt;if(player.y>GROUND){player.y=GROUND;player.vy=0;if(player.state==='air')player.state='idle';}
    player.x+=player.vx*dt;player.x=Math.max(65,Math.min(895,player.x));player.facing=player.x<enemy.x?1:-1;
    player.cooldown=Math.max(0,player.cooldown-dt);player.invuln=Math.max(0,player.invuln-dt);player.flash=Math.max(0,player.flash-dt);
  }
  function enemyUpdate(dt) {
    if(enemy.health<=0)return;
    enemy.facing=enemy.x<player.x?1:-1;
    if(enemy.attack){enemy.stateTime+=dt;attackCheck(enemy,player);if(enemy.attack==='phase'&&enemy.stateTime<.28)enemy.vx=enemy.facing*510;if(enemy.stateTime>=enemy.attackDuration){enemy.attack=null;enemy.state='idle';enemy.vx*=.2;}}
    else if(enemy.state==='hurt'||enemy.state==='block'){enemy.stateTime+=dt;if(enemy.stateTime>.3){enemy.state='idle';enemy.vx*=.2;}}
    else {
      enemy.aiWait-=dt;const dist=Math.abs(player.x-enemy.x), dir=Math.sign(player.x-enemy.x);
      if(enemy.aiWait<=0){
        if(dist>320&&enemy.meter>=34&&Math.random()<.54)action(enemy,'bolt');
        else if(dist<145){const r=Math.random();if(enemy.meter>=34&&r<.18)action(enemy,'rising');else if(enemy.meter>=34&&r<.31)action(enemy,'phase');else if(r<.55)action(enemy,'kick');else action(enemy,'jab');}
        else if(dist<285&&enemy.meter>=34&&Math.random()<.3)action(enemy,'bolt');
        else if(dist<245){enemy.vx=dir*(105+Math.random()*65);enemy.state='walk';}
        else {enemy.vx=dir*160;enemy.state='walk';}
        enemy.aiWait=.42+Math.random()*.55;
      }
      if(dist<155&&player.attack&&Math.random()<dt*1.6){enemy.block=true;enemy.state='block';}
      else if(enemy.state==='block'&&enemy.stateTime>.13){enemy.block=false;enemy.state='idle';}
    }
    enemy.vy+=1150*dt;enemy.y+=enemy.vy*dt;if(enemy.y>GROUND){enemy.y=GROUND;enemy.vy=0;}
    enemy.x+=enemy.vx*dt;enemy.vx*=Math.pow(.025,dt);enemy.x=Math.max(65,Math.min(895,enemy.x));enemy.cooldown=Math.max(0,enemy.cooldown-dt);enemy.invuln=Math.max(0,enemy.invuln-dt);enemy.flash=Math.max(0,enemy.flash-dt);
  }
  function projectilesUpdate(dt) {
    for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.x+=p.vx*dt;p.life-=dt;
      const target=p.owner===player?enemy:player;
      if(Math.abs(p.x-target.x)<36&&Math.abs(p.y-(target.y-85))<48){hurt(target,p.owner,14,170,true);projectiles.splice(i,1);continue;}
      if(p.life<=0||p.x<0||p.x>W)projectiles.splice(i,1);
    }
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy+=260*dt;if(p.life<=0)particles.splice(i,1);}
    for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0)effects.splice(i,1);}
  }
  function update(dt) {
    tick+=dt;if(!started||paused||gameOver)return;
    if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0)combo=0;}
    timerTick+=dt;if(timerTick>=1){timerTick-=1;timer=Math.max(0,timer-1);}
    playerUpdate(dt);enemyUpdate(dt);projectilesUpdate(dt);
    // Fighters cannot pass through one another; attacks still resolve at close range.
    if(Math.abs(player.x-enemy.x)<45){const sign=Math.sign(player.x-enemy.x)||1;player.x+=sign*23;enemy.x-=sign*23;}
    if(timer<=0||player.health<=0||enemy.health<=0)finishRound();
    updateHud();
  }
  function finishRound(){
    gameOver=true;const winner=player.health===enemy.health?(player.health>=enemy.health?player:enemy):player.health>enemy.health?player:enemy;
    if(winner===player)playerWins++;else enemyWins++;
    $('statusText').textContent=`ROUND ${round} COMPLETE · ${winner.type==='kai'?'KAI':'VEX'} TAKES IT`;
    updateHud();setTimeout(()=>{
      if(playerWins>=2||enemyWins>=2){$('resultTitle').textContent=playerWins>enemyWins?'KAI WINS':'VEX WINS';$('resultTitle').className='result-title'+(playerWins>enemyWins?'':' loss');$('resultDetail').textContent=playerWins>enemyWins?'The night belongs to you.':'The undercity has a new legend.';$('resultModal').classList.add('is-visible');}
      else {round++;resetRound();gameOver=false;$('statusText').textContent=`ROUND ${round} · FIRST TO TWO`;setCallout('ROUND '+round);}
    },850);
  }

  function roundedRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
  function drawBackground(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#26233f');sky.addColorStop(.47,'#76435e');sky.addColorStop(.74,'#e07862');sky.addColorStop(1,'#2a2439');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // Last light and distant city haze.
    const sun=ctx.createRadialGradient(530,208,8,530,208,180);sun.addColorStop(0,'#ffd899b0');sun.addColorStop(.34,'#f68c7890');sun.addColorStop(1,'#e5776900');ctx.fillStyle=sun;ctx.fillRect(300,10,470,410);
    ctx.fillStyle='#ffcb9b';ctx.globalAlpha=.72;ctx.beginPath();ctx.arc(535,215,48,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    // Far skyline
    for(let i=0;i<16;i++){const x=i*68-18,h=95+(i*53%132),w=38+(i*17%28),y=330-h;ctx.fillStyle=i%2?'#302c48':'#292940';ctx.fillRect(x,y,w,h);ctx.fillStyle='#efaa8a22';for(let wy=y+14;wy<330;wy+=19)for(let wx=x+7;wx<x+w-5;wx+=13)if((wx+wy+i)%3<1.6)ctx.fillRect(wx,wy,5,8);}
    // Elevated tracks and streaking train.
    ctx.fillStyle='#211f34';ctx.fillRect(0,286,W,18);ctx.fillStyle='#4b3b50';ctx.fillRect(0,304,W,5);ctx.fillStyle='#191a2d';ctx.fillRect(0,310,W,18);
    const trainX=((tick*115)%1250)-260;ctx.save();ctx.translate(trainX,245);ctx.fillStyle='#3e354e';ctx.fillRect(0,0,300,42);ctx.fillStyle='#ce6471';ctx.fillRect(10,4,270,4);for(let n=0;n<5;n++){ctx.fillStyle='#b8dad0';ctx.globalAlpha=.32;ctx.fillRect(18+n*52,11,38,19);ctx.globalAlpha=1;ctx.fillStyle='#28283d';ctx.fillRect(18+n*52,31,38,3);}ctx.fillStyle='#f9b37c';ctx.fillRect(4,34,8,4);ctx.restore();
    // Platform architectural frame.
    ctx.fillStyle='#242238';ctx.fillRect(0,327,W,17);ctx.fillStyle='#626071';ctx.fillRect(0,327,W,3);ctx.fillStyle='#191b2e';ctx.fillRect(0,344,W,94);
    for(let x=28;x<W;x+=150){ctx.fillStyle='#333047';ctx.fillRect(x,306,13,132);ctx.fillStyle='#8c7480';ctx.fillRect(x+12,306,3,132);}
    // Neon signage
    ctx.save();ctx.shadowBlur=15;ctx.shadowColor='#fb6178';ctx.strokeStyle='#ff7682';ctx.lineWidth=2;ctx.strokeRect(90,185,122,48);ctx.shadowBlur=0;ctx.fillStyle='#ffd7b7';ctx.font='bold 15px monospace';ctx.fillText('LAST TRAIN',99,205);ctx.font='8px monospace';ctx.fillStyle='#ff909a';ctx.fillText('PLATFORM  ZERO',101,220);ctx.restore();
    ctx.save();ctx.shadowBlur=12;ctx.shadowColor='#75f0db';ctx.fillStyle='#65dacc';ctx.font='bold 19px monospace';ctx.fillText('零',817,220);ctx.font='8px monospace';ctx.fillText('NO EXIT',806,235);ctx.restore();
    // wet tiled floor, perspective perspective seams
    const floor=ctx.createLinearGradient(0,350,0,H);floor.addColorStop(0,'#3b3046');floor.addColorStop(1,'#141827');ctx.fillStyle=floor;ctx.fillRect(0,350,W,H-350);
    ctx.strokeStyle='#b48b9b28';ctx.lineWidth=1;for(let i=0;i<=12;i++){let x=i*80;ctx.beginPath();ctx.moveTo(480+(x-480)*.35,350);ctx.lineTo(x,540);ctx.stroke();}for(let y=367;y<540;y+=25){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    // Neon puddle reflections
    ctx.globalAlpha=.27;ctx.fillStyle='#ff6680';ctx.fillRect(110,367,110,3);ctx.fillRect(708,386,94,2);ctx.fillStyle='#55dfd5';ctx.fillRect(385,399,155,2);ctx.fillRect(816,360,73,3);ctx.globalAlpha=1;
    ctx.fillStyle='#d3b5a5';ctx.fillRect(0,434,W,4);ctx.fillStyle='#1a1827';ctx.fillRect(0,438,W,102);
    // floor markers
    ctx.fillStyle='#d0b8a933';for(let x=25;x<W;x+=96){ctx.fillRect(x,448,48,3);ctx.fillRect(x+7,456,3,9);}
  }
  function drawFighter(f){
    const x=f.x,y=f.y; const enemyLook=f.type==='vex';
    // Ground shadow and brief phase afterimage.
    ctx.save();ctx.globalAlpha=.28;ctx.fillStyle='#0c1020';ctx.beginPath();ctx.ellipse(x,GROUND+3,33+(GROUND-y)*.025,7,0,0,Math.PI*2);ctx.fill();ctx.restore();
    if(f.state==='special'&&f.attack==='phase'){for(let n=0;n<3;n++){ctx.globalAlpha=.2-n*.05;ctx.fillStyle=enemyLook?'#c16bff':'#55fff0';ctx.beginPath();ctx.ellipse(x-f.facing*(n+1)*20,y-66,23,55,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
    const bob=f.state==='idle'?Math.sin(tick*3+(enemyLook?1:0))*1.5:0;
    ctx.save();ctx.translate(x,y+bob);ctx.scale(f.facing,1);
    const hurt=f.state==='hurt'||f.state==='ko';const crouch=f.crouch&&f.state!=='attack';const guard=f.block;
    const coat=enemyLook?'#43335f':'#e14658', coatLight=enemyLook?'#8f67bd':'#ff776b', pants=enemyLook?'#25263f':'#273244', skin=enemyLook?'#c58a86':'#dfaa87';
    if(f.flash>0&&Math.floor(f.flash*38)%2===0)ctx.globalAlpha=.55;
    // legs, stylized street-fighter stance
    const legSwing=f.state==='walk'?Math.sin(f.walk)*12:0;
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle=pants;ctx.lineWidth=15;
    if(f.attack==='rising'&&f.state==='special'){ctx.beginPath();ctx.moveTo(-2,-42);ctx.lineTo(-16,-13);ctx.moveTo(5,-41);ctx.lineTo(22,-21);ctx.stroke();}
    else if(crouch){ctx.beginPath();ctx.moveTo(-5,-36);ctx.lineTo(-18,-16);ctx.lineTo(-30,-9);ctx.moveTo(5,-36);ctx.lineTo(17,-15);ctx.lineTo(31,-9);ctx.stroke();}
    else {ctx.beginPath();ctx.moveTo(-6,-45);ctx.lineTo(-10-legSwing,-20);ctx.lineTo(-19-legSwing,-7);ctx.moveTo(7,-45);ctx.lineTo(13+legSwing,-20);ctx.lineTo(24+legSwing,-7);ctx.stroke();}
    // sneaker boots
    ctx.fillStyle=enemyLook?'#92eee3':'#f6cf84';roundedRect(-30-legSwing,-13,22,10,3,ctx.fillStyle);roundedRect(14+legSwing,-13,22,10,3,ctx.fillStyle);
    // jacket torso silhouette
    ctx.fillStyle=coat;ctx.beginPath();ctx.moveTo(-15,-106);ctx.lineTo(11,-105);ctx.lineTo(18,-91);ctx.lineTo(14,-48);ctx.lineTo(-15,-45);ctx.lineTo(-21,-83);ctx.closePath();ctx.fill();
    ctx.fillStyle=coatLight;ctx.beginPath();ctx.moveTo(-14,-100);ctx.lineTo(-3,-96);ctx.lineTo(-8,-53);ctx.lineTo(-15,-51);ctx.closePath();ctx.fill();
    // shirt + diagonal sash
    ctx.fillStyle=enemyLook?'#d8c0cf':'#f4dfbb';ctx.beginPath();ctx.moveTo(-3,-101);ctx.lineTo(7,-101);ctx.lineTo(5,-58);ctx.lineTo(-5,-58);ctx.closePath();ctx.fill();
    ctx.strokeStyle=enemyLook?'#64e2d4':'#ffc655';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-15,-95);ctx.lineTo(11,-67);ctx.stroke();
    // belt
    ctx.fillStyle=enemyLook?'#171a2c':'#efe2c4';ctx.fillRect(-15,-51,29,5);ctx.fillStyle=enemyLook?'#64ddd2':'#f19b58';ctx.fillRect(-3,-52,7,7);
    // arms use pose-driven fists
    let frontX=23,frontY=-75,backX=-16,backY=-71;
    if(f.attack==='jab'&&f.state==='attack'&&f.stateTime>.06){frontX=47;frontY=-77;}
    if(f.attack==='kick'&&f.state==='attack'&&f.stateTime>.1){frontX=36;frontY=-62;}
    if(guard){frontX=16;frontY=-101;backX=-2;backY=-84;}
    if(f.attack==='rising'&&f.state==='special'){frontX=19;frontY=-130;backX=-17;backY=-99;}
    if(f.attack==='bolt'&&f.state==='special'){frontX=38;frontY=-84;}
    if(f.attack==='phase'&&f.state==='special'){frontX=38;frontY=-77;backX=-4;backY=-60;}
    ctx.strokeStyle=coat;ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(-12,-98);ctx.lineTo(backX,backY);ctx.moveTo(10,-97);ctx.lineTo(frontX,frontY);ctx.stroke();
    // wraps / fists
    ctx.fillStyle=enemyLook?'#72e8d8':'#ffe0a2';ctx.beginPath();ctx.arc(backX,backY,7,0,Math.PI*2);ctx.arc(frontX,frontY,7.5,0,Math.PI*2);ctx.fill();
    // head and hair/bandanna
    ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,-117,14,17,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=enemyLook?'#202337':'#252437';ctx.beginPath();ctx.moveTo(-15,-120);ctx.lineTo(-12,-137);ctx.lineTo(2,-140);ctx.lineTo(15,-132);ctx.lineTo(16,-123);ctx.lineTo(1,-128);ctx.lineTo(-8,-122);ctx.closePath();ctx.fill();
    ctx.fillStyle=enemyLook?'#75e8d7':'#ffc652';ctx.fillRect(-14,-126,28,5);ctx.beginPath();ctx.moveTo(-13,-125);ctx.lineTo(-27,-117);ctx.lineTo(-12,-121);ctx.fill();
    // eye and cheek detail
    ctx.fillStyle='#2d2330';ctx.fillRect(5,-119,4,2);ctx.fillStyle=enemyLook?'#79f2e3':'#ff6e67';ctx.fillRect(11,-113,4,2);
    // long jacket tails
    ctx.fillStyle=coat;ctx.beginPath();ctx.moveTo(-12,-51);ctx.lineTo(-24,-22);ctx.lineTo(-12,-29);ctx.lineTo(-2,-48);ctx.fill();
    // kick extension drawn over body
    if(f.attack==='kick'&&f.state==='attack'&&f.stateTime>.1){ctx.strokeStyle=pants;ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(7,-47);ctx.lineTo(32,-55);ctx.lineTo(62,-54);ctx.stroke();ctx.fillStyle=enemyLook?'#92eee3':'#f6cf84';ctx.fillRect(56,-59,13,9);}
    if(guard){ctx.strokeStyle='#b7f7ed99';ctx.lineWidth=2;ctx.beginPath();ctx.arc(14,-84,34,-1.2,.7);ctx.stroke();}
    if(f.state==='special'&&f.attack==='rising'){ctx.shadowBlur=18;ctx.shadowColor=enemyLook?'#7af1df':'#ffbc55';ctx.strokeStyle=enemyLook?'#7af1df':'#ffbc55';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-85,34+Math.sin(tick*28)*4,-1.5,1.3);ctx.stroke();ctx.shadowBlur=0;}
    ctx.restore();ctx.globalAlpha=1;
    // health name plate accents and falling marker for knockout
    if(f.state==='ko'){ctx.fillStyle='#ffe0a0';ctx.font='bold 13px monospace';ctx.fillText('DOWN!',x-22,y-155);}
  }
  function drawFx(){
    for(const p of projectiles){const col=p.type==='kai'?'#ffcd70':'#78f0e2';ctx.save();ctx.shadowBlur=22;ctx.shadowColor=col;ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(p.x,p.y,24,14,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff3c9';ctx.beginPath();ctx.ellipse(p.x,p.y,12,7,0,0,Math.PI*2);ctx.fill();ctx.restore();for(let n=1;n<4;n++){ctx.globalAlpha=.15;ctx.fillStyle=col;ctx.beginPath();ctx.arc(p.x-p.vx*.025*n,p.y,14-n*2,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/(p.max||.65));ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}
    ctx.globalAlpha=1;
  }
  function draw(){
    const sx=shake?(Math.random()-.5)*shake:0,sy=shake?(Math.random()-.5)*shake:0;shake=Math.max(0,shake-1.1);
    ctx.save();ctx.translate(sx,sy);drawBackground();
    // ambient sparks in the platform
    for(let i=0;i<13;i++){const px=(i*89+tick*13)%W,py=280+Math.sin(tick*1.6+i*2)*16;ctx.globalAlpha=.3+Math.sin(tick*3+i)*.15;ctx.fillStyle=i%2?'#ffbc81':'#80e9dc';ctx.fillRect(px,py,2,2);}ctx.globalAlpha=1;
    drawFighter(player);drawFighter(enemy);drawFx();ctx.restore();
    if(paused){ctx.fillStyle='#11131ccc';ctx.fillRect(0,0,W,H);ctx.fillStyle='#ffe4a0';ctx.font='900 58px Impact';ctx.textAlign='center';ctx.fillText('PAUSED',W/2,H/2);ctx.textAlign='left';}
  }
  function loop(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;update(dt);draw();requestAnimationFrame(loop);}
  requestAnimationFrame(loop);

  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(Object.values(keys).includes(k)||[' ','arrowleft','arrowright','arrowup','arrowdown'].includes(k))e.preventDefault();if(k==='escape'||k==='p'){if(started&&!gameOver){paused=!paused;$('pauseModal').classList.toggle('is-visible',paused);}}held.add(k);});
  window.addEventListener('keyup',e=>held.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>held.clear());
  document.querySelectorAll('[data-key]').forEach(btn=>{const key=btn.dataset.key;const down=e=>{e.preventDefault();held.add(key);btn.classList.add('pressed');};const up=e=>{e.preventDefault();held.delete(key);btn.classList.remove('pressed');};btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up);});
  $('startButton').addEventListener('click',()=>{if(audio?.state==='suspended')audio.resume();startGame();});$('rematchButton').addEventListener('click',startGame);
  $('pauseButton').addEventListener('click',()=>{paused=true;$('pauseModal').classList.add('is-visible');});$('resumeButton').addEventListener('click',()=>{paused=false;$('pauseModal').classList.remove('is-visible');});
  $('howButton').addEventListener('click',()=> $('howModal').classList.add('is-visible'));
  document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>$(btn.dataset.close).classList.remove('is-visible')));
  $('soundToggle').addEventListener('click',()=>{soundOn=!soundOn;$('soundToggle').innerHTML=`♫ <span>SOUND ${soundOn?'ON':'OFF'}</span>`;if(soundOn)beep(440,.08,'sine',.02);});
})();
