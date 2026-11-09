import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

// Luméria — a small, original creature-catching adventure inspired by classic monster RPGs.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ed9c1);
scene.fog = new THREE.Fog(0x9ed9c1, 26, 75);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 160);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.17;
document.body.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe4ffe9, 0x728a6b, 2.0));
const sun = new THREE.DirectionalLight(0xffefd0, 3.2); sun.position.set(-12,23,12); sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35; scene.add(sun);
const mat=(color,rough=.86)=>new THREE.MeshStandardMaterial({color,roughness:rough});
const materials={grass:mat(0x77bb7d),grass2:mat(0x86c986),path:mat(0xe3c99a),pathEdge:mat(0xcbb27f),water:mat(0x74c9c4,.3),trunk:mat(0x80563c),leaf:mat(0x428c61),leaf2:mat(0x68ad6c),stone:mat(0xb7b9a2),cream:mat(0xf4e8ca),roof:mat(0xd98164),roof2:mat(0xe6a45f),wall:mat(0xffe6bc),blue:mat(0x72aabb),dark:mat(0x354851)};
function mesh(geo,material,parent=scene){const m=new THREE.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,x,y,z,sx,sy,sz,material){const m=mesh(new THREE.BoxGeometry(sx,sy,sz),material,parent);m.position.set(x,y,z);return m;}
function ball(parent,x,y,z,r,material,sx=1,sy=1,sz=1){const m=mesh(new THREE.SphereGeometry(r,16,12),material,parent);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;}
const world = new THREE.Group(); scene.add(world);
// Rolling meadow ground and soft distant ridges.
const ground=mesh(new THREE.PlaneGeometry(180,180),materials.grass);ground.rotation.x=-Math.PI/2;ground.position.y=-.13;ground.castShadow=false;
for(let i=0;i<8;i++){const hill=mesh(new THREE.SphereGeometry(1,24,16),mat(i%2?0x7bb997:0x8bc79a));hill.scale.set(12+Math.random()*9,3+Math.random()*4,7+Math.random()*7);hill.position.set(-34+i*10,1.4,-30-Math.random()*10);hill.castShadow=false;}
// Irregular path loops from the village into the grassland.
function pathPiece(x,z,w,d,rot=0){let m=mesh(new THREE.BoxGeometry(w,.12,d),materials.path);m.position.set(x,.005,z);m.rotation.y=rot;m.castShadow=false;return m;}
pathPiece(0,0,8,7);pathPiece(0,-6,5.5,12);pathPiece(0,-15,5,8);pathPiece(3,-21,5,9,-.35);pathPiece(6,-26,5,7,-.65);pathPiece(-5,-4,10,3.8,.12);pathPiece(-10,-5,7,3.7,.3);pathPiece(8,-5,9,3.7,-.08);
// A little reflective pond.
const pond=mesh(new THREE.CircleGeometry(5.5,40),materials.water);pond.rotation.x=-Math.PI/2;pond.position.set(13,.025,-12);pond.scale.set(1.35,.72,1);pond.castShadow=false;
// Village cottages, a fountain and a winding footpath.
function cottage(x,z,wall,roof){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);box(g,0,1.05,0,4.2,2.1,3.6,wall);const r=mesh(new THREE.ConeGeometry(3.2,2.1,4),roof);r.position.set(0,3.05,0);r.rotation.y=Math.PI/4;r.scale.set(1,1,.75);box(g,0,.75,1.84,.8,1.5,.1,materials.trunk);box(g,-1.15,1.25,1.86,.75,.75,.12,materials.blue);box(g,1.15,1.25,1.86,.75,.75,.12,materials.blue);box(g,0,2.05,1.91,.1,2.05,.08,materials.cream);return g;}
cottage(-8,-8,materials.wall,materials.roof);cottage(8,-2,materials.cream,materials.roof2);cottage(-15,-12,materials.cream,materials.roof);
// A fountain landmark with a shallow basin.
const fountain=new THREE.Group();fountain.position.set(-5,0,-5);scene.add(fountain);
const basin=mesh(new THREE.CylinderGeometry(1.55,1.25,.42,24),materials.stone,fountain);basin.position.y=.23;
const water=mesh(new THREE.CylinderGeometry(1.27,1.27,.1,24),materials.water,fountain);water.position.y=.46;
const column=mesh(new THREE.CylinderGeometry(.28,.42,1.65,14),materials.stone,fountain);column.position.y=1.35;
const finial=ball(fountain,0,2.3,0,.46,materials.water,.85,1.18,.85);
// Bushes and flowers: arranged as safe-to-walk edges framing the trail and encounters.
const rng=(a,b)=>a+Math.random()*(b-a);
for(let i=0;i<165;i++){let x=rng(-29,29),z=rng(-35,14);if((Math.abs(x)<4.4&&z<2&&z>-31)||(Math.abs(x)<10&&z>-8&&z<-2)||(x>5&&x<21&&z>-18&&z<-6)||(x<-5&&x>-18&&z<-5&&z>-11))continue;
 const shrub=new THREE.Group();shrub.position.set(x,0,z);scene.add(shrub);const c=mesh(new THREE.IcosahedronGeometry(rng(.4,.85),1),mat([0x529863,0x68a96f,0x73b37c][Math.floor(Math.random()*3)]),shrub);c.position.y=.45;c.scale.y=.8;shrub.scale.setScalar(rng(.75,1.25));if(Math.random()<.54){const f=ball(shrub,rng(-.3,.3),.82,rng(-.3,.3),.09,mat([0xffdb83,0xf5a7a5,0xf4f0dc][Math.floor(Math.random()*3)]));f.castShadow=false;}}
function tree(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);scene.add(g);const t=mesh(new THREE.CylinderGeometry(.22,.38,2.2,8),materials.trunk,g);t.position.y=1.05;for(const [y,r,c] of [[2.3,1.6,materials.leaf],[3.3,1.25,materials.leaf2],[4.05,.82,materials.leaf]]){const crown=mesh(new THREE.IcosahedronGeometry(r,1),c,g);crown.position.y=y;crown.scale.y=.8;}return g;}
[[-22,-3,1.1],[-20,-16,1.25],[-14,-21,1],[-1,-28,1.2],[11,-30,1.25],[22,-18,1.15],[23,-4,1],[-27,-26,1.4],[19,4,1.3],[-18,1,1.1],[12,-21,.85]].forEach(v=>tree(...v));
// A low wooden sign beside the way out.
const sign=new THREE.Group();sign.position.set(4,0,-8);scene.add(sign);const post=mesh(new THREE.CylinderGeometry(.09,.12,1.8,8),materials.trunk,sign);post.position.y=.85;box(sign,0,1.48,0,1.35,.62,.16,materials.roof2);box(sign,0,1.48,.095,1.12,.39,.025,materials.cream);
const signCanvas=document.createElement('canvas');signCanvas.width=256;signCanvas.height=96;const ctx=signCanvas.getContext('2d');ctx.fillStyle='#ffedc8';ctx.fillRect(0,0,256,96);ctx.fillStyle='#3f6656';ctx.font='bold 30px sans-serif';ctx.textAlign='center';ctx.fillText('HAUTES HERBES',128,60);const signTex=new THREE.CanvasTexture(signCanvas);const signText=mesh(new THREE.PlaneGeometry(1.12,.39),new THREE.MeshBasicMaterial({map:signTex,transparent:true}),sign);signText.position.set(0,1.48,.116);
// Player character: colorful, hand-built low-poly adventurer.
const player=new THREE.Group();scene.add(player);
const skin=mat(0xe9b58e), jacket=mat(0x418c88), jacketLight=mat(0x65b0a1), pants=mat(0x355d6a), hair=mat(0x4d3936), hat=mat(0xe99161), white=mat(0xfff6df), eye=mat(0x263942,.45), shoe=mat(0xede2c2);
const body=mesh(new THREE.CapsuleGeometry(.37,.55,4,8),jacket,player);body.position.y=1.12;const bib=box(player,0,1.26,.345,.33,.32,.045,jacketLight);const head=ball(player,0,1.95,0,.43,skin,1,.95,.9);const haircap=ball(player,0,2.22,-.02,.46,hair,1.03,.62,.95);haircap.position.y=2.2;
const cap=mesh(new THREE.CylinderGeometry(.4,.43,.2,12),hat,player);cap.position.set(0,2.5,0);const brim=mesh(new THREE.CylinderGeometry(.55,.53,.085,14),hat,player);brim.position.set(0,2.42,.09);
ball(player,-.17,1.99,.375,.047,eye);ball(player,.17,1.99,.375,.047,eye);ball(player,-.156,2.01,.414,.014,white);ball(player,.184,2.01,.414,.014,white);
for(const x of [-.49,.49]){const arm=mesh(new THREE.CapsuleGeometry(.13,.4,3,7),jacket,player);arm.position.set(x,1.2,0);arm.rotation.z=x<0?-.2:.2;const hand=ball(player,x, .91, .02,.13,skin);}
for(const x of [-.2,.2]){const leg=mesh(new THREE.CapsuleGeometry(.14,.43,3,7),pants,player);leg.position.set(x,.43,0);const shoeMesh=ball(player,x,.15,.08,.19,shoe,1,.55,1.3);}
const pack=box(player,0,1.35,-.4,.48,.56,.27,mat(0xc66f53));
player.position.set(0,0,0);
// Party creatures are original stylized mascots, composed from simple geometry.
const creatureSpecs={Brindille:{emoji:'🌿',color:0x64bf7b,belly:0xc9e78e,ears:0x4f985e,type:'FEUILLE',hp:24,level:5},Flambin:{emoji:'🔥',color:0xe98b5f,belly:0xffcb83,ears:0xc35f50,type:'BRAISE',hp:22,level:5},Bullebleu:{emoji:'💧',color:0x63b9ce,belly:0xc6f0e2,ears:0x468ea4,type:'AQUA',hp:26,level:5},Sylvapin:{emoji:'🌱',color:0x88b87b,belly:0xe0d5a5,ears:0x668a57,type:'FEUILLE',hp:18,level:3},Pétalune:{emoji:'🌸',color:0xe890af,belly:0xffe2d5,ears:0xc76c89,type:'FÉE',hp:17,level:3},Galapierre:{emoji:'🪨',color:0xa99d80,belly:0xd9cdae,ears:0x766f64,type:'ROCHE',hp:22,level:4},Aqualin:{emoji:'💧',color:0x76b8d5,belly:0xd3f4e7,ears:0x538da9,type:'AQUA',hp:19,level:3},Flammousse:{emoji:'🔥',color:0xefad66,belly:0xffe1a0,ears:0xd57855,type:'BRAISE',hp:18,level:3}};
const party=[];
function makeCreature(name,scale=1){const spec=creatureSpecs[name]||creatureSpecs.Sylvapin;const g=new THREE.Group();g.userData.name=name;g.scale.setScalar(scale);const c=mat(spec.color),b=mat(spec.belly),d=mat(spec.ears),dark=mat(0x34434a,.4),shine=mat(0xffffff,.3);
 ball(g,0,.67,0,.58,c,1.03,1, .9);ball(g,0,.51,.405,.36,b,1,.7,.42);
 // two leaf/ear sprouts
 for(const side of [-1,1]){const ear=mesh(new THREE.SphereGeometry(.22,12,10),d,g);ear.position.set(side*.39,1.17,-.02);ear.scale.set(.55,1.45,.42);ear.rotation.z=side*-.24;const tip=mesh(new THREE.ConeGeometry(.15,.43,8),c,g);tip.position.set(side*.41,1.44,-.02);tip.rotation.z=side*-.2;}
 for(const side of [-1,1]){ball(g,side*.19,.82,.505,.06,dark);ball(g,side*.205,.845,.553,.02,shine);}
 const nose=ball(g,0,.68,.59,.045,dark,1,.7,1);const tail=mesh(new THREE.ConeGeometry(.18,.65,8),d,g);tail.position.set(0,.43,-.62);tail.rotation.x=-1.05;
 for(const x of [-.34,.34]){const foot=ball(g,x,.17,.12,.22,c,1,.75,1.25);}
 return g;}
let following=null;const followingOffset=new THREE.Vector3();
function putFollower(){if(following)scene.remove(following);following=null;if(!party.length)return;following=makeCreature(party[party.length-1],.72);scene.add(following);}
// A few wandering creatures are visible in the tall grass.
const roamers=[];
for(const [n,x,z] of [['Sylvapin',-7,-18],['Pétalune',17,-21],['Galapierre',-18,-26],['Aqualin',18,-10],['Flammousse',-12,-28]]){const c=makeCreature(n,.68);c.position.set(x,0,z);scene.add(c);roamers.push({mesh:c,home:new THREE.Vector3(x,0,z),phase:Math.random()*6,active:true});}
// UI and game state.
let selectedStarter='Brindille', started=false, inBattle=false, battleBusy=false, steps=0, encounters=0, orbs=5, currentWild=null, wildHP=0, wildMax=0, battleTimer=0, dialogueTimer=0, audioCtx=null, musicOn=false;
const keys={};const ui=id=>document.getElementById(id);
function toast(msg){const t=ui('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2100);}
function quest(title,text){ui('quest-title').textContent=title;ui('quest-text').textContent=text;}
function updateHud(){ui('count').textContent=encounters;ui('orbs').textContent=orbs;ui('party-count').textContent=party.length;}
function say(msg){ui('prompt').textContent=msg;ui('prompt').classList.add('show');clearTimeout(dialogueTimer);dialogueTimer=setTimeout(()=>ui('prompt').classList.remove('show'),2400);}
document.querySelectorAll('.starter').forEach(button=>button.addEventListener('click',()=>{selectedStarter=button.dataset.starter;document.querySelectorAll('.starter').forEach(b=>b.classList.toggle('selected',b===button));}));
ui('start').addEventListener('click',()=>{if(started)return;started=true;party.push(selectedStarter);putFollower();updateHud();ui('intro').classList.add('hidden');quest('Explore Luméria','Traverse les hautes herbes pour rencontrer de nouvelles créatures.');toast(`${selectedStarter} rejoint ton équipe !`);});
function showPrompt(){if(!started||inBattle)return;let nearest=Infinity;for(const r of roamers){if(!r.active)continue;const d=player.position.distanceTo(r.mesh.position);if(d<2.1)nearest=Math.min(nearest,d);}if(nearest<2.1){ui('prompt').textContent='Appuie sur E pour approcher la créature';ui('prompt').classList.add('show');}else if(nearest===Infinity)ui('prompt').classList.remove('show');}
function startBattle(name,roamer=null){if(inBattle||!started)return;inBattle=true;battleBusy=false;currentWild={name,roamer};const s=creatureSpecs[name];wildMax=s.hp;wildHP=s.hp;ui('wild-name').textContent=`${s.emoji} ${name}`;ui('wild-level').textContent=`NIV. ${s.level} · ${s.type}`;ui('wild-hp').style.width='100%';ui('wild-hpnum').textContent=`${wildHP} / ${wildMax} PV`;ui('battle-msg').textContent=`Un ${name} sauvage apparaît !`;ui('battle').classList.add('active');ui('prompt').classList.remove('show');renderActions();}
function renderActions(){const box=ui('actions');box.innerHTML='';const buttons=[['🌿','Attaque vive','attack'],['✧','Lancer un orbe','orb'],['♡','Se reposer','rest'],['↗','Prendre la fuite','run']];for(const [icon,label,action]of buttons){const b=document.createElement('button');b.className='action'+(action==='orb'?' primary':'');b.innerHTML=`${icon}　${label}`;b.onclick=()=>battleAction(action);box.appendChild(b);}}
function wildAttack(){if(!inBattle)return;const dmg=2+Math.floor(Math.random()*4);const lead=creatureSpecs[party[0]];ui('battle-msg').textContent=`${currentWild.name} riposte ! ${party[0]} perd ${dmg} PV, mais garde courage.`;const c=ui('battle');c.animate([{transform:'translateX(0)'},{transform:'translateX(-7px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:280});}
function battleAction(action){if(!inBattle||battleBusy)return;battleBusy=true;if(action==='run'){ui('battle-msg').textContent='Tu quittes le combat et reprends le sentier.';setTimeout(endBattle,750);return;}
 if(action==='rest'){ui('battle-msg').textContent=`${party[0]} reprend son souffle. Le lien avec ton compagnon grandit !`;setTimeout(()=>{if(inBattle){battleBusy=false;wildAttack();}},850);return;}
 if(action==='attack'){const dmg=5+Math.floor(Math.random()*5);wildHP=Math.max(0,wildHP-dmg);ui('wild-hp').style.width=`${wildHP/wildMax*100}%`;ui('wild-hpnum').textContent=`${wildHP} / ${wildMax} PV`;ui('battle-msg').textContent=`${party[0]} utilise Attaque vive ! ${currentWild.name} perd ${dmg} PV.`;if(wildHP<=0){ui('battle-msg').textContent=`${currentWild.name} est impressionné ! Il rejoint ton carnet.`;setTimeout(()=>{if(currentWild.roamer){currentWild.roamer.active=false;currentWild.roamer.mesh.visible=false;}encounters++;if(party.length<6){party.push(currentWild.name);putFollower();toast(`${currentWild.name} rejoint ton équipe !`);}else toast(`${currentWild.name} rejoint ton carnet !`);updateHud();afterWin();},900);return;}setTimeout(()=>{if(inBattle){battleBusy=false;wildAttack();}},850);return;}
 if(action==='orb'){if(orbs<=0){ui('battle-msg').textContent='Tes orbes sont épuisés ! Repose-toi ou prends la fuite.';battleBusy=false;return;}orbs--;updateHud();const chance=wildHP<wildMax*.45?.82:.48;if(Math.random()<chance){ui('battle-msg').textContent=`L'orbe s'ouvre… ${currentWild.name} te fait confiance !`;setTimeout(()=>{if(currentWild.roamer){currentWild.roamer.active=false;currentWild.roamer.mesh.visible=false;}encounters++;if(party.length<6){party.push(currentWild.name);putFollower();toast(`${currentWild.name} rejoint ton équipe !`);}else toast(`${currentWild.name} rejoint ton carnet !`);updateHud();afterWin();},1150);}else{ui('battle-msg').textContent=`Oh ! ${currentWild.name} s'échappe de l'orbe !`;setTimeout(()=>{if(inBattle){battleBusy=false;wildAttack();}},900);}return;}}
function endBattle(){inBattle=false;battleBusy=false;ui('battle').classList.remove('active');if(currentWild?.roamer&&currentWild.roamer.active){currentWild.roamer.mesh.position.copy(currentWild.roamer.home);}currentWild=null;}
function afterWin(){quest(encounters>=3?'Un lien précieux':'Carnet enrichi',encounters>=3?'Tu as rencontré trois créatures ! Continue à explorer les sentiers.':'Les rencontres font grandir ton équipe. Explore les hautes herbes !');setTimeout(endBattle,950);}
function interact(){if(!started)return;if(inBattle)return;let nearest=null,dist=2.2;for(const r of roamers){if(!r.active)continue;const d=player.position.distanceTo(r.mesh.position);if(d<dist){dist=d;nearest=r;}}if(nearest){startBattle(nearest.mesh.userData.name,nearest);return;}if(player.position.distanceTo(sign.position)<2.6){say('Les hautes herbes frémissent… avance prudemment !');return;}say('Le sentier mène vers des rencontres. Explore les hautes herbes !');}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(k==='e'||k==='enter')interact();if(k==='m')toggleMusic();});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
// Touch D-pad, with buttons held for continuous responsive movement.
const mapDir={up:['z','arrowup'],down:['s','arrowdown'],left:['q','arrowleft'],right:['d','arrowright']};document.querySelectorAll('.touch button').forEach(button=>{const down=e=>{e.preventDefault();for(const k of mapDir[button.dataset.dir])keys[k]=true;};const up=e=>{e.preventDefault();for(const k of mapDir[button.dataset.dir])keys[k]=false;};button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointerleave',up);button.addEventListener('pointercancel',up);});ui('mobile-action').addEventListener('click',interact);
function toggleMusic(){musicOn=!musicOn;if(musicOn){try{audioCtx ||= new AudioContext();audioCtx.resume();playNote();toast('Musique activée ♪');}catch{toast('Audio indisponible');}}else toast('Musique coupée');}
function playNote(){if(!musicOn||!audioCtx)return;const now=audioCtx.currentTime;const notes=[392,494,587,494,440,523,659,523];const idx=Math.floor(now*1.1)%notes.length;const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.value=notes[idx];gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.025,now+.03);gain.gain.exponentialRampToValueAtTime(.0001,now+.42);osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now);osc.stop(now+.45);setTimeout(playNote,430);}
// Camera and controls: follow behind the explorer while retaining the toy-diorama view.
const cameraTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3();let lastTime=performance.now();
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;const t=now*.001;
 if(started&&!inBattle){let dx=0,dz=0;if(keys['d']||keys['arrowright'])dx+=1;if(keys['q']||keys['arrowleft'])dx-=1;if(keys['s']||keys['arrowdown'])dz+=1;if(keys['z']||keys['arrowup'])dz-=1;const l=Math.hypot(dx,dz);if(l){dx/=l;dz/=l;const speed=5.1;player.position.x=THREE.MathUtils.clamp(player.position.x+dx*speed*dt,-33,33);player.position.z=THREE.MathUtils.clamp(player.position.z+dz*speed*dt,-39,19);player.rotation.y=Math.atan2(dx,dz);steps+=dt*speed;if(following){const p=new THREE.Vector3(player.position.x-Math.sin(player.rotation.y)*1.25,0,player.position.z-Math.cos(player.rotation.y)*1.25);following.position.lerp(p,Math.min(1,dt*7));following.rotation.y=player.rotation.y;}player.position.y=Math.abs(Math.sin(steps*5))*.045;body.rotation.x=Math.sin(steps*5)*.045;}else{player.position.y=THREE.MathUtils.damp(player.position.y,0,8,dt);if(following){const p=new THREE.Vector3(player.position.x,0,player.position.z+1.35);following.position.lerp(p,Math.min(1,dt*3));following.rotation.y=player.rotation.y;}}
 for(const r of roamers){if(!r.active)continue;r.mesh.position.y=.045+Math.sin(t*2+r.phase)*.055;r.mesh.rotation.y=Math.sin(t*.6+r.phase)*.25;}
 showPrompt();}
 const lookAt=new THREE.Vector3(player.position.x,1.3,player.position.z-4);desiredCamera.set(player.position.x+10,12.5,player.position.z+16);camera.position.lerp(desiredCamera,Math.min(1,dt*2.7));cameraTarget.lerp(lookAt,Math.min(1,dt*3));camera.lookAt(cameraTarget);
 // face player and battlers within the view, subtly animate all mascots.
 for(const r of roamers){r.mesh.rotation.z=Math.sin(t*2+r.phase)*.025;}
 if(following)following.position.y+=Math.sin(t*4)*.005;
 renderer.render(scene,camera);}
requestAnimationFrame(animate);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));});
