import { ZONES, ZONE_BY_ID, ZONE_PALETTES, NPCS, spriteUrl, clamp, pick, rand } from './data.js';
import { t, zoneName, npcName, npcRole, trainerTitle, buildingName, signText, lv } from './i18n.js';

export const T = 48;
export const MAP_W = 155;
export const MAP_H = 120;
export const TILE = { GRASS:0, TALL:1, PATH:2, WATER:3, SAND:4, TREE:5, ROCK:6, SNOW:7, ICE:8, LAVA:9, SWAMP:10, FLOWER:11, STONE:12, DARK:13, BASALT:14, DEEP:15, BRIDGE:16, SNOWTREE:17 };
const BLOCKED = new Set([TILE.WATER,TILE.DEEP,TILE.LAVA,TILE.TREE,TILE.ROCK,TILE.SNOWTREE]);

function hash(x,y,s=0){ const n = Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453123; return n-Math.floor(n); }
function noise(x,y,s=0){
  const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi;
  const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=hash(xi,yi,s), b=hash(xi+1,yi,s), c=hash(xi,yi+1,s), d=hash(xi+1,yi+1,s);
  return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;
}
function distSeg(px,py,ax,ay,bx,by){
  const dx=bx-ax, dy=by-ay; const l=dx*dx+dy*dy||1;
  let t=((px-ax)*dx+(py-ay)*dy)/l; t=clamp(t,0,1);
  return Math.hypot(px-(ax+dx*t), py-(ay+dy*t));
}

const ROADS = [
  [[75,63],[75,81]], [[75,63],[75,46]], [[75,63],[96,60]], [[75,63],[58,64]], [[58,64],[45,60]],
  [[75,81],[74,96]], [[96,60],[104,62]], [[104,62],[112,70]], [[112,70],[123,78]], [[75,46],[66,36]], [[66,36],[54,28]],
  [[75,81],[92,88]], [[92,88],[108,94]], [[75,81],[61,94]], [[61,94],[77,102]], [[123,78],[134,74]],
  [[75,46],[75,30]], [[75,30],[76,20]], [[67,58],[75,63]], [[83,58],[75,63]], [[75,68],[75,63]]
];

const BUILDINGS = [
  { kind:'center', name:'POKÉMON CENTER', x:62, y:51, w:7, h:5, roof:'#d95d58', trim:'#f4e9d7' },
  { kind:'market', name:'WILDWIND MARKET', x:81, y:51, w:7, h:5, roof:'#4b8b6d', trim:'#f2e4c7' },
  { kind:'lab', name:'ALDER LAB', x:79, y:67, w:7, h:5, roof:'#5f8fa8', trim:'#e9f1e7' },
  { kind:'house', name:'NOVA’S HOUSE', x:61, y:67, w:6, h:4, roof:'#b96b4f', trim:'#f1e3cc' },
  { kind:'inn', name:'THE RESTING FENN', x:87, y:67, w:5, h:4, roof:'#7b6aa1', trim:'#eadfcc' },
  { kind:'lighthouse', name:'STORMWATCH', x:137, y:68, w:3, h:3, roof:'#e7e4d6', trim:'#cf5b4f' }
];

export class World {
  constructor(data){
    this.data = data;
    this.w = MAP_W; this.h = MAP_H;
    this.tiles = new Uint8Array(MAP_W*MAP_H);
    this.biomes = new Array(MAP_W*MAP_H);
    this.treeTiles = [];
    this.rockTiles = [];
    this.buildings = BUILDINGS;
    this.npcs = NPCS.map(n=>({...n, homeX:n.x, homeY:n.y, phase:Math.random()*6.28, moving:false, dir:'down', frame:0}));
    this.fountain = {x:75.5,y:63.2,r:2.1};
    this.props = [];
    this.generate();
    this.buildProps();
    this.mapCanvas = null;
  }

  idx(x,y){ return y*MAP_W+x; }
  get(x,y){ if(x<0||y<0||x>=MAP_W||y>=MAP_H) return TILE.DEEP; return this.tiles[y*MAP_W+x]; }
  set(x,y,t,b){ if(x<0||y<0||x>=MAP_W||y>=MAP_H) return; this.tiles[y*MAP_W+x]=t; if(b)this.biomes[y*MAP_W+x]=b; }
  biomeAt(x,y){ return this.biomes[Math.floor(y)*MAP_W+Math.floor(x)] || 'meadow'; }

  generate(){
    const town = {x:75,y:64,r:13.4};
    for(let y=0;y<MAP_H;y++){
      for(let x=0;x<MAP_W;x++){
        const n = noise(x*.16,y*.16,1);
        const n2 = noise(x*.42,y*.42,7);
        let biome = 'meadow';
        let best = 999;
        for(const z of ZONES){
          if(z.id==='hollow') continue;
          let d = Math.hypot((x-z.x)/z.r, (y-z.y)/z.r);
          d += (n-.5)*.18;
          if(d<best){best=d;biome=z.id;}
        }
        const inTown = Math.hypot((x-town.x)/1.0,(y-town.y)/1.18) < town.r;
        if(inTown) biome='hollow';
        let t = TILE.GRASS;
        const pal = ZONE_PALETTES[biome] || ZONE_PALETTES.meadow;

        if(x>142 - n*3.2){ biome='coast'; t=TILE.WATER; }
        else if(Math.hypot((x-108)/16.5,(y-55)/11.5) + (n-.5)*.10 < 1){
          biome='lake'; t = Math.hypot((x-108)/15,(y-55)/10.4) + (n-.5)*.09 < 1 ? TILE.WATER : TILE.SAND;
        } else if(inTown){
          t = TILE.GRASS;
          if(n2>.68) t=TILE.FLOWER;
        } else if(biome==='forest'){
          t = n2>.74 ? TILE.TALL : TILE.GRASS;
          if(n>.58) t=TILE.TREE;
          if(n2>.9 && n<.58) t=TILE.FLOWER;
        } else if(biome==='meadow'){
          if(n2>.53) t=TILE.TALL;
          if(n2>.82) t=TILE.FLOWER;
          if(n>.83) t=TILE.TREE;
        } else if(biome==='snow' || biome==='peak'){
          t = TILE.SNOW;
          if(n2>.68) t=TILE.ICE;
          if(n>.72) t=TILE.ROCK;
          if(n>.84) t=TILE.SNOWTREE;
          if(biome==='peak' && n>.78) t=TILE.ROCK;
        } else if(biome==='volcano'){
          t = TILE.BASALT;
          if(n2>.52) t=TILE.DARK;
          if(n>.73) t=TILE.ROCK;
          if(n2>.82 && Math.hypot(x-117,y-92)<13) t=TILE.LAVA;
        } else if(biome==='swamp'){
          t = TILE.SWAMP;
          if(n2>.67) t=TILE.WATER;
          if(n>.76) t=TILE.TREE;
          if(n2>.88) t=TILE.TALL;
        } else if(biome==='coast'){
          t = n2>.57 ? TILE.TALL : TILE.GRASS;
          if(n>.78) t=TILE.TREE;
          if(n2>.9) t=TILE.SAND;
        } else if(biome==='lake'){
          t = n2>.6 ? TILE.TALL : TILE.GRASS;
          if(n>.84) t=TILE.TREE;
        }

        this.tiles[y*MAP_W+x]=t;
        this.biomes[y*MAP_W+x]=biome;
      }
    }

    // Roads are painted after terrain so the world is traversable.
    for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++){
      let road = false;
      for(const seg of ROADS){
        if(distSeg(x+.5,y+.5,seg[0][0],seg[0][1],seg[1][0],seg[1][1]) < 1.05){ road=true; break; }
      }
      const inTown = Math.hypot(x-75,(y-64)*.86) < 12.5;
      const plaza = Math.hypot(x-75.5,(y-63.2)*1.05) < 7.6;
      if(road || plaza){
        const old = this.get(x,y);
        let pt = inTown ? TILE.STONE : TILE.PATH;
        if(old===TILE.WATER||old===TILE.DEEP) pt=TILE.BRIDGE;
        if(old===TILE.LAVA) pt=TILE.PATH;
        this.set(x,y,pt,this.biomes[y*MAP_W+x]);
      }
    }

    // Clear a generous, readable town square and keep the fountain area open.
    for(let y=54;y<73;y++) for(let x=66;x<87;x++){
      if(this.get(x,y)===TILE.TREE||this.get(x,y)===TILE.ROCK) this.set(x,y,TILE.GRASS,this.biomes[y*MAP_W+x]);
    }

    // Rebuild decoration lists.
    this.treeTiles=[]; this.rockTiles=[];
    for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++){
      const t=this.get(x,y);
      if(t===TILE.TREE||t===TILE.SNOWTREE) this.treeTiles.push({x,y,snow:t===TILE.SNOWTREE});
      if(t===TILE.ROCK) this.rockTiles.push({x,y});
    }
  }

  buildProps(){
    const p=[];
    const add=(type,x,y,extra={})=>p.push({type,x,y,...extra});
    // Lamps and benches frame the plaza.
    [[70.8,62],[80.2,62],[70.8,68.5],[80.2,68.5],[75.5,57.8],[75.5,71.8]].forEach(([x,y])=>add('lamp',x,y));
    add('bench',72.2,60.7,{dir:1}); add('bench',78.6,60.7,{dir:-1});
    add('bench',72.2,66.1,{dir:1}); add('bench',78.6,66.1,{dir:-1});
    // Market stalls
    add('stall',84.6,59.5,{color:'#c8743f'}); add('stall',86.6,60.8,{color:'#4d8d74'});
    add('crate',82.8,59.3); add('crate',83.6,59.8); add('crate',81.8,58.8);
    // Flower beds and fountain-side greenery.
    add('flowerbed',68.4,60.3); add('flowerbed',82.4,64.8); add('flowerbed',68.8,66.2); add('flowerbed',73.0,66.4); add('flowerbed',78.2,66.4);
    add('tree',65.4,60.7,{snow:false}); add('tree',85.7,60.9,{snow:false}); add('tree',65.1,66.7,{snow:false}); add('tree',85.9,66.2,{snow:false}); add('tree',70.7,58.2,{snow:false}); add('tree',80.4,58.2,{snow:false});
    add('bush',67.2,70.4); add('bush',86.2,63.2); add('bush',90.2,66.3);
    // Signposts and a town noticeboard.
    add('sign',73.0,74.2,{label:'SOUTH · SUNPETAL MEADOWS'});
    add('sign',62.7,63.6,{label:'WEST · WHISPERING WOODS'});
    add('sign',87.7,62.4,{label:'EAST · MIRROR LAKE'});
    add('sign',75.8,50.8,{label:'NORTH · VICTORY PEAK'});
    add('notice',71.8,63.8);
    // Outskirts
    add('sign',49.8,59.6,{label:'WHISPERING WOODS'});
    add('sign',101.8,62.8,{label:'MIRROR LAKE'});
    add('sign',73.8,89.6,{label:'SHADOWFEN MARSH'});
    add('sign',113.5,84.6,{label:'EMBER RIDGE'});
    add('sign',131.8,76.6,{label:'STORM COAST'});
    add('sign',75.8,31.8,{label:'VICTORY PEAK'});
    // Country fences and crates.
    for(let i=0;i<5;i++) add('fence',59+i,75.4,{v:false});
    for(let i=0;i<4;i++) add('fence',92,70+i,{v:true});
    add('crate',89.8,60.8); add('barrel',88.9,61.4); add('barrel',90.5,61.6); add('bench',73.1,68.0,{dir:1}); add('bench',77.6,68.0,{dir:-1});
    // Coast landmark details.
    add('boat',132.2,82.4); add('boat',136.2,84.8); add('crate',135.2,73.6);
    add('campfire',114.2,89.5); add('tent',115.6,91.2);
    add('campfire',47.2,31.4); add('tent',45.6,33.2);
    // A few scenic rocks not on the tile grid.
    [[96,70.8],[55,77.2],[101,90.4],[60,42.2],[86,39.6],[124,60.2]].forEach(([x,y])=>add('boulder',x,y));
    this.props=p;
  }

  buildingAt(x,y){
    for(const b of this.buildings){
      if(x>b.x-.2 && x<b.x+b.w+.2 && y>b.y-.2 && y<b.y+b.h+.2) return b;
    }
    return null;
  }

  isWalkable(x,y){
    if(x<1||y<1||x>=MAP_W-1||y>=MAP_H-1) return false;
    const t=this.get(Math.floor(x),Math.floor(y));
    if(BLOCKED.has(t)) return false;
    if(this.buildingAt(x,y)) return false;
    if(Math.hypot(x-this.fountain.x,y-this.fountain.y) < this.fountain.r+.35) return false;
    return true;
  }

  zoneAt(x,y){
    if(Math.hypot(x-75,(y-64)*.9)<13.6) return ZONE_BY_ID.hollow;
    let best=ZONE_BY_ID.meadow, bd=1e9;
    for(const z of ZONES){
      if(z.id==='hollow') continue;
      const d=Math.hypot(x-z.x,(y-z.y)*1.1)/z.r;
      if(d<bd){bd=d;best=z;}
    }
    return best;
  }

  drawGround(ctx, cam, vw, vh, time){
    const x0=Math.max(0,Math.floor(cam.x/T)-1), x1=Math.min(MAP_W-1,Math.ceil((cam.x+vw)/T)+1);
    const y0=Math.max(0,Math.floor(cam.y/T)-1), y1=Math.min(MAP_H-1,Math.ceil((cam.y+vh)/T)+1);
    for(let y=y0;y<=y1;y++){
      for(let x=x0;x<=x1;x++){
        this.drawTile(ctx,x,y,this.get(x,y),this.biomes[y*MAP_W+x],time);
      }
    }
  }

  drawTile(ctx,x,y,t,biome,time){
    const px=x*T, py=y*T;
    const pal=ZONE_PALETTES[biome]||ZONE_PALETTES.meadow;
    const h=hash(x,y,3), h2=hash(x,y,9);
    switch(t){
      case TILE.TALL: {
        ctx.fillStyle=pal.grass2; ctx.fillRect(px,py,T,T);
        ctx.fillStyle='rgba(26,58,27,.24)'; ctx.fillRect(px,py,T,T);
        const sway=Math.sin(time*.0017+x*.8+y*.5)*2;
        for(let i=0;i<5;i++){
          const bx=px+5+i*9+h*4, by=py+39-h2*7;
          ctx.strokeStyle=i%2?'#477b3b':'#5d9146'; ctx.lineWidth=2.4;
          ctx.beginPath(); ctx.moveTo(bx,by); ctx.quadraticCurveTo(bx+sway,by-10,bx+2+sway,by-17); ctx.stroke();
          ctx.strokeStyle='#78a957'; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.moveTo(bx+1,by-5); ctx.quadraticCurveTo(bx+5+sway,by-10,bx+7+sway,by-13); ctx.stroke();
        }
        break;
      }
      case TILE.PATH: {
        ctx.fillStyle=h>.5?pal.path:pal.path2; ctx.fillRect(px,py,T,T);
        ctx.fillStyle='rgba(80,64,41,.14)';
        for(let i=0;i<4;i++){ const a=hash(x*7+i,y*3,4), b=hash(x*5,y*9+i,5); ctx.beginPath(); ctx.ellipse(px+8+a*33,py+9+b*32,2+a*2,1.3+b,0,0,6.28); ctx.fill(); }
        ctx.fillStyle='rgba(255,245,210,.13)'; ctx.fillRect(px+3,py+2,4,2);
        break;
      }
      case TILE.STONE: {
        ctx.fillStyle=h>.5?'#b9ae8f':'#c5b998'; ctx.fillRect(px,py,T,T);
        ctx.strokeStyle='rgba(87,79,59,.22)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(px,py+T/2); ctx.lineTo(px+T,py+T/2); ctx.moveTo(px+T/2,py); ctx.lineTo(px+T/2,py+T/2); ctx.moveTo(px+T/4,py+T/2); ctx.lineTo(px+T/4,py+T); ctx.stroke();
        if(h2>.7){ ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(px+5,py+6,3,2); }
        break;
      }
      case TILE.WATER: case TILE.DEEP: {
        const grad=ctx.createLinearGradient(px,py,px,py+T);
        grad.addColorStop(0,pal.water); grad.addColorStop(1,pal.water2);
        ctx.fillStyle=grad; ctx.fillRect(px,py,T,T);
        ctx.strokeStyle='rgba(205,245,242,.24)'; ctx.lineWidth=1.6;
        for(let i=0;i<2;i++){
          const yy=py+13+i*19+Math.sin(time*.0012+x*.9+y*.6+i)*2;
          ctx.beginPath(); ctx.moveTo(px+7,yy); ctx.quadraticCurveTo(px+16,yy-4,px+24,yy); ctx.quadraticCurveTo(px+32,yy+4,px+41,yy); ctx.stroke();
        }
        if(h>.86){ ctx.fillStyle='rgba(255,255,255,.17)'; ctx.beginPath(); ctx.arc(px+15,py+31,1.7,0,6.28); ctx.fill(); }
        break;
      }
      case TILE.SAND: {
        ctx.fillStyle=h>.5?'#d7c797':'#cebd8c'; ctx.fillRect(px,py,T,T);
        ctx.fillStyle='rgba(120,99,57,.18)';
        for(let i=0;i<5;i++){ ctx.fillRect(px+5+hash(x+i,y,8)*36,py+6+hash(x,y+i,2)*36,2,1.4); }
        break;
      }
      case TILE.SNOW: {
        ctx.fillStyle=h>.5?'#e8f3f1':'#dfeeec'; ctx.fillRect(px,py,T,T);
        ctx.fillStyle='rgba(255,255,255,.45)'; ctx.fillRect(px+3,py+3,5,2);
        ctx.fillStyle='rgba(122,163,167,.13)'; ctx.beginPath(); ctx.ellipse(px+25,py+29,15,8,0,0,6.28); ctx.fill();
        break;
      }
      case TILE.ICE: {
        ctx.fillStyle='#c9e4e8'; ctx.fillRect(px,py,T,T);
        ctx.strokeStyle='rgba(255,255,255,.45)'; ctx.lineWidth=1.4;
        ctx.beginPath(); ctx.moveTo(px+8,py+10); ctx.lineTo(px+20,py+18); ctx.lineTo(px+17,py+34); ctx.stroke();
        ctx.strokeStyle='rgba(103,157,172,.2)'; ctx.beginPath(); ctx.moveTo(px+28,py+8); ctx.lineTo(px+37,py+25); ctx.stroke();
        break;
      }
      case TILE.LAVA: {
        ctx.fillStyle='#3d312c'; ctx.fillRect(px,py,T,T);
        const g=ctx.createRadialGradient(px+24,py+24,2,px+24,py+24,30);
        g.addColorStop(0,'#ffcf5e'); g.addColorStop(.35,'#f17731'); g.addColorStop(.8,'#b23c20'); g.addColorStop(1,'#5e2b20');
        ctx.fillStyle=g; ctx.fillRect(px+2,py+2,T-4,T-4);
        ctx.strokeStyle='rgba(255,214,109,.55)'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(px+4,py+31); ctx.quadraticCurveTo(px+19,py+24+Math.sin(time*.002+x)*2,px+43,py+27); ctx.stroke();
        break;
      }
      case TILE.SWAMP: {
        ctx.fillStyle=h>.5?'#5d704f':'#66795a'; ctx.fillRect(px,py,T,T);
        ctx.fillStyle='rgba(28,53,38,.35)'; ctx.beginPath(); ctx.ellipse(px+24,py+26,17,10,0,0,6.28); ctx.fill();
        ctx.strokeStyle='rgba(163,194,125,.25)'; ctx.lineWidth=1;
        for(let i=0;i<3;i++) ctx.strokeRect(px+8+i*11,py+18+h*8,3,1);
        break;
      }
      case TILE.BASALT: {
        ctx.fillStyle=h>.5?'#514842':'#5b5149'; ctx.fillRect(px,py,T,T);
        ctx.strokeStyle='rgba(28,25,24,.25)'; ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.moveTo(px+7,py); ctx.lineTo(px+11,py+16); ctx.lineTo(px+4,py+30); ctx.lineTo(px+9,py+T); ctx.stroke();
        break;
      }
      case TILE.DARK: {
        ctx.fillStyle=h>.5?'#51473f':'#4b413a'; ctx.fillRect(px,py,T,T);
        ctx.fillStyle='rgba(229,120,63,.22)'; ctx.fillRect(px+9,py+22,6,2);
        break;
      }
      case TILE.FLOWER: {
        ctx.fillStyle=pal.grass; ctx.fillRect(px,py,T,T);
        const cols=biome==='snow'?['#d6e9f7','#c3d8ec','#f0f8ff']:['#f2dc72','#f0a4bf','#f8f2d8','#a9c9f2'];
        for(let i=0;i<4;i++){
          const fx=px+8+hash(x*3+i,y*2,1)*32, fy=py+10+hash(x*2,y*3+i,4)*28;
          ctx.fillStyle=cols[(i+Math.floor(h*4))%cols.length];
          ctx.beginPath(); ctx.arc(fx,fy,2.4,0,6.28); ctx.fill();
          ctx.fillStyle='rgba(255,255,255,.5)'; ctx.fillRect(fx-1,fy-1,1.3,1.3);
        }
        break;
      }
      case TILE.BRIDGE: {
        ctx.fillStyle='#8c6f4c'; ctx.fillRect(px,py,T,T);
        ctx.strokeStyle='rgba(55,39,24,.4)'; ctx.lineWidth=2;
        for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(px,py+6+i*12); ctx.lineTo(px+T,py+6+i*12); ctx.stroke(); }
        ctx.fillStyle='#6d5439'; ctx.fillRect(px,py,4,T); ctx.fillRect(px+T-4,py,4,T);
        break;
      }
      default: {
        ctx.fillStyle=h>.5?pal.grass:pal.grass2; ctx.fillRect(px,py,T,T);
        if(h2>.68){
          ctx.strokeStyle=biome==='snow'?'rgba(91,128,122,.22)':'rgba(48,86,40,.18)'; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.moveTo(px+11,py+30); ctx.lineTo(px+13,py+23); ctx.moveTo(px+13,py+27); ctx.lineTo(px+17,py+24); ctx.stroke();
        }
        if(h>.93){ ctx.fillStyle=biome==='snow'?'rgba(255,255,255,.45)':'rgba(214,226,157,.28)'; ctx.beginPath(); ctx.arc(px+30,py+17,1.4,0,6.28); ctx.fill(); }
        break;
      }
    }
  }

  collectObjects(cam,vw,vh,game,time){
    const x0=cam.x-120,x1=cam.x+vw+120,y0=cam.y-180,y1=cam.y+vh+120;
    const objs=[];
    for(const t of this.treeTiles){
      const px=t.x*T,py=t.y*T;
      if(px>x0&&px<x1&&py>y0&&py<y1) objs.push({type:'tree',x:t.x,y:t.y,snow:t.snow,sortY:py+T,biome:this.biomeAt(t.x,t.y)});
    }
    for(const r of this.rockTiles){
      const px=r.x*T,py=r.y*T;
      if(px>x0&&px<x1&&py>y0&&py<y1) objs.push({type:'rock',x:r.x,y:r.y,sortY:py+T,biome:this.biomeAt(r.x,r.y)});
    }
    for(const b of this.buildings){
      const px=b.x*T,py=b.y*T;
      if(px<x1&&px+b.w*T>x0&&py<y1&&py+b.h*T>y0) objs.push({type:'building',b,sortY:(b.y+b.h)*T});
    }
    for(const p of this.props){
      const px=p.x*T,py=p.y*T;
      if(px>x0&&px<x1&&py>y0&&py<y1) objs.push({type:'prop',p,sortY:py+16});
    }
    objs.push({type:'fountain',sortY:this.fountain.y*T+32});
    for(const n of this.npcs){
      const px=n.x*T,py=n.y*T;
      if(px>x0&&px<x1&&py>y0&&py<y1) objs.push({type:'npc',n,sortY:py+24});
    }
    for(const w of game.wilds){
      const px=w.x*T,py=w.y*T;
      if(px>x0&&px<x1&&py>y0&&py<y1) objs.push({type:'wild',w,sortY:py+20});
    }
    for(const p of game.remotePlayers.values()){
      const px=p.x*T,py=p.y*T;
      if(px>x0&&px<x1&&py>y0&&py<y1) objs.push({type:'remote',p,sortY:py+24});
    }
    for(const b of game.bots){
      const px=b.x*T,py=b.y*T;
      if(px>x0&&px<x1&&py>y0&&py<y1) objs.push({type:'bot',b,sortY:py+24});
    }
    if(game.player){
      objs.push({type:'player',sortY:game.player.y*T+24});
    }
    objs.sort((a,b)=>a.sortY-b.sortY);
    return objs;
  }

  draw(ctx,game,cam,vw,vh,time){
    ctx.save();
    ctx.translate(-cam.x,-cam.y);
    this.drawGround(ctx,cam,vw,vh,time);
    const objs=this.collectObjects(cam,vw,vh,game,time);
    for(const o of objs){
      if(o.type==='tree') this.drawTree(ctx,o.x*T+T/2,o.y*T+T*.86,o.snow,o.biome,time,o.x,o.y);
      else if(o.type==='rock') this.drawRock(ctx,o.x*T+T/2,o.y*T+T*.84,o.biome);
      else if(o.type==='building') this.drawBuilding(ctx,o.b,time);
      else if(o.type==='prop') this.drawProp(ctx,o.p,time);
      else if(o.type==='fountain') this.drawFountain(ctx,time);
      else if(o.type==='npc') this.drawNpc(ctx,o.n,time,game);
      else if(o.type==='wild') this.drawWild(ctx,o.w,time,game);
      else if(o.type==='remote') this.drawRemote(ctx,o.p,time,game);
      else if(o.type==='bot') this.drawBot(ctx,o.b,time,game);
      else if(o.type==='player') this.drawPlayer(ctx,game,time);
    }
    // Foreground grass blades near the camera for depth.
    this.drawForegroundGrass(ctx,cam,vw,vh,time);
    ctx.restore();
  }

  drawForegroundGrass(ctx,cam,vw,vh,time){
    const x0=Math.max(0,Math.floor(cam.x/T)),x1=Math.min(MAP_W-1,Math.ceil((cam.x+vw)/T));
    const y0=Math.max(0,Math.floor(cam.y/T)),y1=Math.min(MAP_H-1,Math.ceil((cam.y+vh)/T));
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
      if(this.get(x,y)!==TILE.TALL) continue;
      const px=x*T,py=y*T;
      ctx.strokeStyle='rgba(54,99,45,.55)'; ctx.lineWidth=2;
      for(let i=0;i<3;i++){
        const bx=px+8+i*13, by=py+T-2, sw=Math.sin(time*.002+x*1.3+y+i)*2;
        ctx.beginPath(); ctx.moveTo(bx,by); ctx.quadraticCurveTo(bx+sw,by-8,bx+3+sw,by-14); ctx.stroke();
      }
    }
  }

  drawTree(ctx,cx,cy,snow,biome,time,tx,ty){
    const pal=ZONE_PALETTES[biome]||ZONE_PALETTES.meadow;
    const s=.9+hash(tx,ty,2)*.25;
    ctx.save(); ctx.translate(cx,cy); ctx.scale(s,s);
    ctx.fillStyle='rgba(15,32,20,.24)'; ctx.beginPath(); ctx.ellipse(4,4,23,10,0,0,6.28); ctx.fill();
    ctx.fillStyle=snow?'#6a5e54':'#6d5036'; ctx.fillRect(-4,-20,8,23);
    ctx.fillStyle=snow?'#7d7266':'#876442'; ctx.fillRect(-2,-18,3,18);
    const base=snow?'#3d665f':pal.tree, light=snow?'#56877b':pal.tree2;
    ctx.fillStyle=base;
    ctx.beginPath(); ctx.arc(-10,-31,17,0,6.28); ctx.arc(10,-30,16,0,6.28); ctx.arc(0,-43,19,0,6.28); ctx.fill();
    ctx.fillStyle=light;
    ctx.beginPath(); ctx.arc(-7,-36,12,0,6.28); ctx.arc(8,-37,11,0,6.28); ctx.arc(0,-46,12,0,6.28); ctx.fill();
    if(snow){
      ctx.fillStyle='rgba(245,252,250,.88)';
      ctx.beginPath(); ctx.arc(-8,-41,10,Math.PI,0); ctx.arc(8,-42,10,Math.PI,0); ctx.arc(0,-49,12,Math.PI,0); ctx.fill();
    } else {
      ctx.fillStyle='rgba(190,221,129,.22)';
      ctx.beginPath(); ctx.arc(-7,-42,7,0,6.28); ctx.arc(5,-44,6,0,6.28); ctx.fill();
      if(hash(tx,ty,7)>.76){ ctx.fillStyle='#e8c45f'; ctx.beginPath(); ctx.arc(11,-39,2.5,0,6.28); ctx.fill(); }
    }
    ctx.restore();
  }

  drawRock(ctx,cx,cy,biome){
    const pal=ZONE_PALETTES[biome]||ZONE_PALETTES.meadow;
    ctx.fillStyle='rgba(14,30,19,.22)'; ctx.beginPath(); ctx.ellipse(cx,cy+2,20,7,0,0,6.28); ctx.fill();
    ctx.fillStyle=pal.rock; ctx.beginPath(); ctx.moveTo(cx-17,cy); ctx.lineTo(cx-12,cy-16); ctx.lineTo(cx+3,cy-21); ctx.lineTo(cx+16,cy-11); ctx.lineTo(cx+18,cy+1); ctx.lineTo(cx+4,cy+6); ctx.lineTo(cx-11,cy+4); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.17)'; ctx.beginPath(); ctx.moveTo(cx-10,cy-13); ctx.lineTo(cx+2,cy-18); ctx.lineTo(cx+10,cy-12); ctx.lineTo(cx-2,cy-8); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(20,28,21,.18)'; ctx.fillRect(cx-3,cy-6,11,2);
  }

  drawBuilding(ctx,b,time){
    const x=b.x*T,y=b.y*T,w=b.w*T,h=b.h*T;
    ctx.fillStyle='rgba(9,24,15,.3)'; ctx.beginPath(); ctx.ellipse(x+w/2,y+h-1,w*.54,18,0,0,6.28); ctx.fill();
    // Foundation and facade
    const wallTop=y+76, wallBottom=y+h-5;
    ctx.fillStyle='#e8dcc3'; ctx.fillRect(x+8,wallTop,w-16,wallBottom-wallTop);
    ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(x+8,wallTop,w-16,4);
    ctx.fillStyle='rgba(101,79,54,.18)';
    for(let yy=wallTop+22;yy<wallBottom;yy+=22) ctx.fillRect(x+8,yy,w-16,1);
    ctx.fillStyle='#8b7656'; ctx.fillRect(x+8,wallBottom-12,w-16,12);
    ctx.fillStyle='rgba(255,255,255,.15)'; ctx.fillRect(x+8,wallBottom-12,w-16,2);
    // Windows with flower boxes
    const cols=Math.max(1,Math.floor((w-56)/48));
    for(let i=0;i<cols;i++){
      const wx=x+30+i*48;
      if(wx+22>x+w-18) break;
      ctx.fillStyle='#5e4835'; ctx.fillRect(wx-2,wallTop+28,24,26);
      const wg=ctx.createLinearGradient(wx,wallTop+30,wx+20,wallTop+50);
      wg.addColorStop(0,'#b7dcdc'); wg.addColorStop(.6,'#78aeb6'); wg.addColorStop(1,'#527f8e');
      ctx.fillStyle=wg; ctx.fillRect(wx,wallTop+30,20,22);
      ctx.strokeStyle='rgba(255,255,255,.45)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(wx+10,wallTop+30); ctx.lineTo(wx+10,wallTop+52); ctx.moveTo(wx,wallTop+41); ctx.lineTo(wx+20,wallTop+41); ctx.stroke();
      ctx.fillStyle='#7a5838'; ctx.fillRect(wx-3,wallTop+51,26,5);
      ctx.fillStyle='#5f8a4d'; ctx.beginPath(); ctx.arc(wx+4,wallTop+49,4,0,6.28); ctx.arc(wx+13,wallTop+48,4,0,6.28); ctx.fill();
    }
    // Door
    const dx=x+w/2;
    ctx.fillStyle='#5b4432'; ctx.fillRect(dx-16,wallBottom-49,32,44);
    ctx.fillStyle='#7a5d41'; ctx.fillRect(dx-13,wallBottom-45,26,40);
    ctx.fillStyle='#c9a86a'; ctx.fillRect(dx+8,wallBottom-25,2,2);
    ctx.fillStyle='rgba(255,255,255,.14)'; ctx.fillRect(dx-13,wallBottom-45,3,40);
    // Roof
    ctx.fillStyle='rgba(0,0,0,.13)'; ctx.beginPath(); ctx.moveTo(x-12,y+82); ctx.lineTo(x+w*.16,y+6); ctx.lineTo(x+w*.84,y+6); ctx.lineTo(x+w+12,y+82); ctx.closePath(); ctx.fill();
    ctx.fillStyle=b.roof; ctx.beginPath(); ctx.moveTo(x-10,y+78); ctx.lineTo(x+w*.17,y+2); ctx.lineTo(x+w*.83,y+2); ctx.lineTo(x+w+10,y+78); ctx.closePath(); ctx.fill();
    // shingles
    ctx.strokeStyle='rgba(0,0,0,.13)'; ctx.lineWidth=1;
    for(let i=1;i<6;i++){
      const yy=y+12+i*11, inset=i*5.5;
      ctx.beginPath(); ctx.moveTo(x+8+inset,yy); ctx.lineTo(x+w-8-inset,yy); ctx.stroke();
    }
    ctx.fillStyle='rgba(255,255,255,.15)';
    ctx.beginPath(); ctx.moveTo(x+2,y+72); ctx.lineTo(x+w*.19,y+8); ctx.lineTo(x+w*.43,y+8); ctx.lineTo(x+w*.24,y+72); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.16)'; ctx.fillRect(x-10,y+74,w+20,6);
    ctx.fillStyle=b.trim; ctx.fillRect(x+w*.17-3,y+1,w*.66+6,4);
    // Chimney
    ctx.fillStyle='#9a7960'; ctx.fillRect(x+w*.68,y-9,15,22);
    ctx.fillStyle='#c6a887'; ctx.fillRect(x+w*.68-2,y-11,19,5);
    // Emblems and signs
    if(b.kind==='center'){
      ctx.fillStyle='#f8f2e4'; ctx.beginPath(); ctx.arc(dx,y+60,13,0,6.28); ctx.fill();
      ctx.fillStyle='#d95d58'; ctx.fillRect(dx-7,y+56,14,4); ctx.fillRect(dx-2,y+51,4,14);
      ctx.fillStyle='#f8f2e4'; ctx.fillRect(dx-42,y+22,84,15);
      ctx.fillStyle='#7a3a35'; ctx.font='700 8px Outfit'; ctx.textAlign='center'; ctx.fillText(buildingName('center',b.name),dx,y+32);
      // awning over door
      for(let i=0;i<6;i++){ ctx.fillStyle=i%2?'#f3e5cf':'#d95d58'; ctx.fillRect(dx-21+i*7,wallBottom-54,7,7); }
    } else if(b.kind==='market'){
      ctx.fillStyle='#f3e7c8'; ctx.fillRect(dx-46,y+22,92,16);
      ctx.fillStyle='#386350'; ctx.font='700 8px Outfit'; ctx.textAlign='center'; ctx.fillText(buildingName('market',b.name),dx,y+33);
      for(let i=0;i<8;i++){ ctx.fillStyle=i%2?'#f1e3c1':'#4d8d74'; ctx.fillRect(dx-34+i*8.5,wallTop+12,8.5,15); }
      ctx.fillStyle='#c8743f'; ctx.fillRect(dx-10,wallBottom-64,20,13);
      ctx.fillStyle='#f4e1b8'; ctx.font='700 6px Outfit'; ctx.fillText(t('misc.open'),dx,wallBottom-55);
    } else if(b.kind==='lab'){
      ctx.fillStyle='#e9f1e7'; ctx.fillRect(dx-36,y+22,72,15);
      ctx.fillStyle='#3f6577'; ctx.font='700 8px Outfit'; ctx.textAlign='center'; ctx.fillText(buildingName('lab',b.name),dx,y+33);
      ctx.strokeStyle='#e9f1e7'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(x+w-31,y+45,13,0,6.28); ctx.stroke();
      ctx.fillStyle='#9ed2d8'; ctx.beginPath(); ctx.arc(x+w-31,y+45,9,0,6.28); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(x+w-34,y+41,3,0,6.28); ctx.fill();
      ctx.fillStyle='#d6e4d9'; ctx.fillRect(dx-19,wallBottom-58,38,11);
      ctx.fillStyle='#4f6b5a'; ctx.font='700 5.5px Outfit'; ctx.fillText(t('misc.fieldResearch'),dx,wallBottom-50);
    } else if(b.kind==='lighthouse'){
      ctx.fillStyle='#ded9c9'; ctx.fillRect(x+8,y+18,w-16,h-24);
      ctx.fillStyle='#cf5b4f'; ctx.fillRect(x+8,y+18,w-16,5);
      ctx.fillStyle='#f6e7a3'; ctx.fillRect(dx-9,y+32,18,14);
      ctx.fillStyle='#544f49'; ctx.fillRect(dx-12,y+30,24,4);
      ctx.fillStyle='rgba(255,231,144,.12)'; ctx.beginPath(); ctx.moveTo(dx,y+36); ctx.lineTo(dx+180,y+2); ctx.lineTo(dx+180,y+86); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#f6e7a3'; ctx.fillRect(dx-7,y+56,14,9);
    } else {
      ctx.fillStyle='#f2e8d5'; ctx.fillRect(dx-35,y+22,70,15);
      ctx.fillStyle='#58493d'; ctx.font='700 6.5px Outfit'; ctx.textAlign='center'; ctx.fillText(buildingName(b.kind,b.name),dx,y+32);
      ctx.fillStyle='#6d533d'; ctx.fillRect(dx-30,wallBottom-54,60,6);
      ctx.fillStyle='#8e6b47'; ctx.fillRect(dx-30,wallBottom-48,60,3);
    }
    ctx.textAlign='left';
  }

  drawProp(ctx,p,time){
    const x=p.x*T,y=p.y*T;
    if(p.type==='lamp'){
      ctx.fillStyle='rgba(11,24,16,.23)'; ctx.beginPath(); ctx.ellipse(x+2,y+7,8,3,0,0,6.28); ctx.fill();
      ctx.fillStyle='#4b5147'; ctx.fillRect(x-1.5,y-38,3,42);
      ctx.fillStyle='#303a32'; ctx.fillRect(x-6,y-4,12,5);
      ctx.fillStyle='#f6df95'; ctx.beginPath(); ctx.arc(x,y-42,6,0,6.28); ctx.fill();
      ctx.fillStyle='rgba(255,228,137,.16)'; ctx.beginPath(); ctx.arc(x,y-42,17,0,6.28); ctx.fill();
    } else if(p.type==='bench'){
      ctx.fillStyle='rgba(12,25,17,.2)'; ctx.beginPath(); ctx.ellipse(x,y+6,22,5,0,0,6.28); ctx.fill();
      ctx.fillStyle='#7a5a3a'; ctx.fillRect(x-21,y-9,42,6); ctx.fillRect(x-21,y-2,42,4);
      ctx.fillStyle='#51412f'; ctx.fillRect(x-17,y+2,4,7); ctx.fillRect(x+13,y+2,4,7);
    } else if(p.type==='stall'){
      ctx.fillStyle='rgba(12,25,17,.2)'; ctx.beginPath(); ctx.ellipse(x,y+8,26,6,0,0,6.28); ctx.fill();
      ctx.fillStyle='#6b5037'; ctx.fillRect(x-22,y-11,44,12);
      ctx.fillStyle=p.color; for(let i=0;i<5;i++){ ctx.fillRect(x-24+i*10,y-31,10,9); }
      ctx.fillStyle='#d8c8a4'; ctx.fillRect(x-24,y-22,48,5);
      ctx.fillStyle='#4f3c2b'; ctx.fillRect(x-20,y+1,3,10); ctx.fillRect(x+17,y+1,3,10);
    } else if(p.type==='crate'||p.type==='barrel'){
      if(p.type==='crate'){
        ctx.fillStyle='rgba(12,25,17,.18)'; ctx.beginPath(); ctx.ellipse(x,y+3,12,4,0,0,6.28); ctx.fill();
        ctx.fillStyle='#9b7647'; ctx.fillRect(x-9,y-14,18,17);
        ctx.strokeStyle='rgba(77,53,28,.4)'; ctx.strokeRect(x-9,y-14,18,17);
        ctx.beginPath(); ctx.moveTo(x-9,y-14); ctx.lineTo(x+9,y+3); ctx.moveTo(x+9,y-14); ctx.lineTo(x-9,y+3); ctx.stroke();
      } else {
        ctx.fillStyle='#86633e'; ctx.fillRect(x-8,y-17,16,19);
        ctx.fillStyle='#a17a4c'; ctx.fillRect(x-8,y-14,16,3); ctx.fillRect(x-8,y-5,16,3);
      }
    } else if(p.type==='flowerbed'){
      ctx.fillStyle='rgba(20,35,20,.2)'; ctx.beginPath(); ctx.ellipse(x,y+2,25,9,0,0,6.28); ctx.fill();
      ctx.fillStyle='#6c5238'; ctx.beginPath(); ctx.ellipse(x,y,24,8,0,0,6.28); ctx.fill();
      const cols=['#f2dc72','#f0a4bf','#f8f2d8','#a9c9f2'];
      for(let i=0;i<8;i++){ ctx.fillStyle=cols[i%4]; ctx.beginPath(); ctx.arc(x-18+hash(i,1,2)*36,y-4+hash(2,i,4)*8,2.6,0,6.28); ctx.fill(); }
    } else if(p.type==='bush'){
      ctx.fillStyle='rgba(12,28,16,.22)'; ctx.beginPath(); ctx.ellipse(x,y+4,18,6,0,0,6.28); ctx.fill();
      ctx.fillStyle='#3d713f'; ctx.beginPath(); ctx.arc(x-8,y-4,11,0,6.28); ctx.arc(x+6,y-7,12,0,6.28); ctx.arc(x,y-13,10,0,6.28); ctx.fill();
      ctx.fillStyle='#5f9450'; ctx.beginPath(); ctx.arc(x-5,y-9,6,0,6.28); ctx.arc(x+5,y-13,6,0,6.28); ctx.fill();
    } else if(p.type==='sign'){
      ctx.fillStyle='rgba(12,25,17,.18)'; ctx.beginPath(); ctx.ellipse(x,y+4,8,3,0,0,6.28); ctx.fill();
      ctx.fillStyle='#765735'; ctx.fillRect(x-2,y-23,4,26);
      ctx.fillStyle='#b58d58'; ctx.fillRect(x-28,y-35,56,15);
      ctx.fillStyle='#6a4c2d'; ctx.font='700 4.6px Outfit'; ctx.textAlign='center'; ctx.fillText(signText(p.label||'TRAIL'),x,y-25);
      ctx.textAlign='left';
    } else if(p.type==='notice'){
      ctx.fillStyle='#765735'; ctx.fillRect(x-12,y-23,3,24); ctx.fillRect(x+9,y-23,3,24);
      ctx.fillStyle='#8f6a42'; ctx.fillRect(x-15,y-38,30,20);
      ctx.fillStyle='#e4d2a9'; ctx.fillRect(x-12,y-35,24,14);
      ctx.fillStyle='#7a5a37'; ctx.font='700 4px Outfit'; ctx.textAlign='center'; ctx.fillText(t('misc.fieldNotes'),x,y-28);
      ctx.textAlign='left';
    } else if(p.type==='fence'){
      ctx.fillStyle='rgba(10,23,15,.15)'; ctx.fillRect(x-2,y+2,4,4);
      if(p.v){ ctx.fillStyle='#8b6a44'; ctx.fillRect(x-2,y-17,4,22); ctx.fillRect(x-11,y-13,22,3); ctx.fillRect(x-11,y-5,22,3); }
      else { ctx.fillStyle='#8b6a44'; ctx.fillRect(x-17,y-12,3,15); ctx.fillRect(x-2,y-15,4,18); ctx.fillRect(x+14,y-12,3,15); ctx.fillRect(x-19,y-11,38,3); }
    } else if(p.type==='campfire'){
      ctx.fillStyle='rgba(20,20,15,.22)'; ctx.beginPath(); ctx.ellipse(x,y+3,14,5,0,0,6.28); ctx.fill();
      ctx.strokeStyle='#5b4530'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(x-10,y+1); ctx.lineTo(x+10,y-2); ctx.moveTo(x-9,y-2); ctx.lineTo(x+10,y+2); ctx.stroke();
      const f=Math.sin(time*.01)*2;
      ctx.fillStyle='#ff9a3d'; ctx.beginPath(); ctx.moveTo(x-5,y); ctx.quadraticCurveTo(x-2,y-15-f,x,y-19); ctx.quadraticCurveTo(x+6,y-11,x+5,y); ctx.fill();
      ctx.fillStyle='#ffd65e'; ctx.beginPath(); ctx.moveTo(x-2,y); ctx.quadraticCurveTo(x,y-9,x+2,y); ctx.fill();
    } else if(p.type==='tent'){
      ctx.fillStyle='rgba(10,23,15,.22)'; ctx.beginPath(); ctx.ellipse(x,y+5,24,6,0,0,6.28); ctx.fill();
      ctx.fillStyle='#5d7d5f'; ctx.beginPath(); ctx.moveTo(x-22,y+4); ctx.lineTo(x,y-27); ctx.lineTo(x+22,y+4); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#47634a'; ctx.beginPath(); ctx.moveTo(x-5,y+4); ctx.lineTo(x,y-18); ctx.lineTo(x+7,y+4); ctx.closePath(); ctx.fill();
    } else if(p.type==='boat'){
      ctx.fillStyle='rgba(8,28,30,.3)'; ctx.beginPath(); ctx.ellipse(x,y+5,25,6,0,0,6.28); ctx.fill();
      ctx.fillStyle='#8a5f3d'; ctx.beginPath(); ctx.moveTo(x-24,y-2); ctx.lineTo(x+24,y-4); ctx.lineTo(x+14,y+7); ctx.lineTo(x-15,y+6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#6b472d'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,y-3); ctx.lineTo(x,y-28); ctx.stroke();
      ctx.fillStyle='#e8dfc9'; ctx.beginPath(); ctx.moveTo(x+2,y-27); ctx.lineTo(x+19,y-12); ctx.lineTo(x+2,y-11); ctx.closePath(); ctx.fill();
    } else if(p.type==='boulder'){
      this.drawRock(ctx,x,y,this.biomeAt(p.x,p.y));
    } else if(p.type==='tree'){
      this.drawTree(ctx,x,y,p.snow,this.biomeAt(p.x,p.y),time,p.x*3,p.y*7);
    }
  }

  drawFountain(ctx,time){
    const x=this.fountain.x*T,y=this.fountain.y*T;
    ctx.fillStyle='rgba(8,24,17,.24)'; ctx.beginPath(); ctx.ellipse(x,y+14,74,24,0,0,6.28); ctx.fill();
    ctx.fillStyle='#9d9d89'; ctx.beginPath(); ctx.ellipse(x,y+7,72,31,0,0,6.28); ctx.fill();
    ctx.fillStyle='#b9b8a0'; ctx.beginPath(); ctx.ellipse(x,y,70,28,0,0,6.28); ctx.fill();
    const g=ctx.createRadialGradient(x,y-3,4,x,y,66); g.addColorStop(0,'#86d0cf'); g.addColorStop(1,'#3f8e9c');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(x,y-3,60,21,0,0,6.28); ctx.fill();
    ctx.strokeStyle='rgba(230,255,247,.4)'; ctx.lineWidth=1.6;
    for(let i=0;i<3;i++){ ctx.beginPath(); ctx.ellipse(x,y-3,18+i*15,6+i*5,time*.0002+i,0,6.28); ctx.stroke(); }
    ctx.fillStyle='#a8aa93'; ctx.fillRect(x-6,y-34,12,34);
    ctx.fillStyle='#c0c1a7'; ctx.beginPath(); ctx.ellipse(x,y-35,16,7,0,0,6.28); ctx.fill();
    ctx.fillStyle='rgba(154,226,226,.7)'; ctx.beginPath(); ctx.ellipse(x,y-37,11,4,0,0,6.28); ctx.fill();
    const jet=Math.sin(time*.004)*4;
    ctx.strokeStyle='rgba(200,247,244,.65)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x,y-40); ctx.quadraticCurveTo(x-12,y-60-jet,x-24,y-44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y-40); ctx.quadraticCurveTo(x+14,y-64+jet,x+25,y-45); ctx.stroke();
    ctx.fillStyle='rgba(213,249,246,.55)';
    ctx.beginPath(); ctx.arc(x-24,y-44,2.5,0,6.28); ctx.arc(x+25,y-45,2.5,0,6.28); ctx.fill();
  }

  drawTrainer(ctx,cx,cy,dir,frame,pal,scale=2.15){
    ctx.save(); ctx.translate(cx,cy); ctx.scale(scale,scale); ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='rgba(9,22,14,.26)'; ctx.beginPath(); ctx.ellipse(0,2,9,4,0,0,6.28); ctx.fill();
    const swing=frame===1?2:frame===2?-2:0;
    const bob=frame===1||frame===2?-1:0;
    // legs
    ctx.fillStyle='#293832';
    if(dir==='left'||dir==='right'){
      ctx.fillRect(-4,15,4,8+swing*.3); ctx.fillRect(2,15,4,8-swing*.3);
      ctx.fillStyle='#e9eee4'; ctx.fillRect(-5,22,5,3); ctx.fillRect(2,22,5,3);
    } else {
      ctx.fillRect(-6+swing*.4,15,5,8); ctx.fillRect(2-swing*.4,15,5,8);
      ctx.fillStyle='#e9eee4'; ctx.fillRect(-7+swing*.4,22,6,3); ctx.fillRect(2-swing*.4,22,6,3);
    }
    // body
    ctx.fillStyle=pal.jacket; ctx.fillRect(-7,7+bob,14,10);
    ctx.fillStyle=pal.shirt; ctx.fillRect(-3,8+bob,6,8);
    ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(-7,7+bob,2,9);
    // backpack
    if(dir==='up'){ ctx.fillStyle=pal.bag; ctx.fillRect(-5,9+bob,10,8); ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(-3,11+bob,6,2); }
    else if(dir!=='down'){ ctx.fillStyle=pal.bag; ctx.fillRect(dir==='left'?1:-6,10+bob,5,7); }
    // arms
    ctx.fillStyle=pal.skin;
    if(dir==='left'){ ctx.fillRect(-10,10+bob,4,7); }
    else if(dir==='right'){ ctx.fillRect(6,10+bob,4,7); }
    else { ctx.fillRect(-10,10+bob,3,7); ctx.fillRect(7,10+bob,3,7); }
    // head
    ctx.fillStyle=pal.skin; ctx.fillRect(-5,1+bob,10,8);
    ctx.fillStyle=pal.hair; ctx.fillRect(-6,0+bob,12,3); ctx.fillRect(-6,2+bob,3,4); ctx.fillRect(3,2+bob,3,4);
    if(dir==='down'){
      ctx.fillStyle='#1d2a25'; ctx.fillRect(-3,4+bob,2,2); ctx.fillRect(2,4+bob,2,2);
      ctx.fillStyle='rgba(100,50,40,.5)'; ctx.fillRect(-1,7+bob,3,1);
    } else if(dir==='left'){
      ctx.fillStyle='#1d2a25'; ctx.fillRect(-4,4+bob,2,2);
    } else if(dir==='right'){
      ctx.fillStyle='#1d2a25'; ctx.fillRect(2,4+bob,2,2);
    }
    // cap
    ctx.fillStyle=pal.cap; ctx.fillRect(-7,-3+bob,14,4); ctx.fillRect(-8,-1+bob,16,2);
    if(dir==='down') ctx.fillRect(-7,0+bob,14,2);
    if(dir==='right') ctx.fillRect(4,0+bob,8,2);
    if(dir==='left') ctx.fillRect(-12,0+bob,8,2);
    ctx.fillStyle='rgba(255,255,255,.35)'; ctx.fillRect(-4,-3+bob,4,1.5);
    // emblem
    ctx.fillStyle=pal.accent; ctx.fillRect(1,10+bob,3,3);
    ctx.restore();
  }

  drawNameplate(ctx,x,y,text,sub,color='#c9f46c',width=null){
    ctx.save();
    ctx.font='600 9px Outfit'; ctx.textAlign='center';
    const w=width||Math.max(48,ctx.measureText(text).width+18);
    ctx.fillStyle='rgba(5,17,11,.78)';
    ctx.beginPath(); ctx.roundRect(x-w/2,y-14,w,sub?25:15,5); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.1)'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle=color; ctx.fillText(text,x,y-4);
    if(sub){ ctx.fillStyle='rgba(224,238,229,.62)'; ctx.font='500 7px Outfit'; ctx.fillText(sub,x,y+7); }
    ctx.restore();
  }

  drawNpc(ctx,n,time,game){
    const x=n.x*T,y=n.y*T;
    const pal={cap:n.color,jacket:'#4e7f6b',shirt:'#e9e4cf',skin:'#e6b98f',hair:'#3f3128',bag:'#8c633e',accent:n.color};
    const near=game && Math.hypot(game.player.x-n.x,game.player.y-n.y)<2.7;
    if(near){ ctx.strokeStyle='rgba(201,244,108,.6)'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(x,y+4,22,9,0,0,6.28); ctx.stroke(); }
    this.drawTrainer(ctx,x,y,n.dir||'down',0,pal,2.1);
    // Companion creature
    if(n.sprite){
      const img=game.getSprite(n.sprite);
      if(img&&img.complete){
        const bob=Math.sin(time*.0025+n.phase)*2;
        ctx.save(); ctx.imageSmoothingEnabled=false;
        ctx.globalAlpha=.9;
        ctx.drawImage(img,x+22,y-26+bob,30,30);
        ctx.restore();
      }
    }
    const marker=n.id==='alder'?'!':null;
    const nm=npcName(n), role=npcRole(n);
    this.drawNameplate(ctx,x,y-45,nm,role,n.color,Math.max(56,nm.length*6+18));
    if(marker){
      ctx.save(); ctx.translate(x,y-72+Math.sin(time*.004)*3);
      ctx.fillStyle='#c9f46c'; ctx.beginPath(); ctx.arc(0,0,8,0,6.28); ctx.fill();
      ctx.fillStyle='#1a2d0e'; ctx.font='800 11px Outfit'; ctx.textAlign='center'; ctx.fillText('!',0,4); ctx.restore();
    }
  }

  drawWild(ctx,w,time,game){
    const x=w.x*T,y=w.y*T;
    const img=game.getSprite(w.id);
    if(!img||!img.complete) return;
    const bob=Math.sin(time*.003+w.phase)*2.5;
    ctx.fillStyle='rgba(9,22,14,.24)'; ctx.beginPath(); ctx.ellipse(x,y+8,16,5.5,0,0,6.28); ctx.fill();
    if(w.shiny){
      ctx.strokeStyle='rgba(255,223,114,.35)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y-8,20,0,6.28); ctx.stroke();
      for(let i=0;i<3;i++){ const a=time*.001+i*2.1; ctx.fillStyle='rgba(255,240,160,.8)'; ctx.beginPath(); ctx.arc(x+Math.cos(a)*19,y-8+Math.sin(a)*13,1.6,0,6.28); ctx.fill(); }
    }
    ctx.save(); ctx.imageSmoothingEnabled=false;
    const size=w.id>1000?44:42;
    if(w.dir==='left'){ ctx.translate(x,y-9+bob); ctx.scale(-1,1); ctx.drawImage(img,-size/2,-size/2,size,size); }
    else ctx.drawImage(img,x-size/2,y-9+bob-size/2,size,size);
    ctx.restore();
    const near=game && Math.hypot(game.player.x-w.x,game.player.y-w.y)<3.4;
    if(near){
      this.drawNameplate(ctx,x,y-38,`${w.name}  ${lv(w.level)}`,null,w.shiny?'#ffd76e':'#ffd0a3',Math.max(66,w.name.length*5+30));
      ctx.strokeStyle='rgba(255,210,140,.45)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.ellipse(x,y+8,20,7,0,0,6.28); ctx.stroke();
    }
  }

  drawRemote(ctx,p,time,game){
    const x=p.x*T,y=p.y*T;
    const pal=p.palette||{cap:'#70c9ff',jacket:'#456b8a',shirt:'#e6e4d4',skin:'#d9a37e',hair:'#2e2620',bag:'#9b7a4c',accent:'#70c9ff'};
    this.drawTrainer(ctx,x,y,p.dir||'down',p.frame||0,pal,2.05);
    if(p.lead && game.getSprite(p.lead)){
      const img=game.getSprite(p.lead);
      if(img.complete){ ctx.save(); ctx.imageSmoothingEnabled=false; ctx.globalAlpha=.9; ctx.drawImage(img,x+21,y-24+Math.sin(time*.003)*2,26,26); ctx.restore(); }
    }
    this.drawNameplate(ctx,x,y-44,p.name,`${lv(p.level||12)} · ${p.zone||t('misc.explorer')}`,'#8edcff',Math.max(64,p.name.length*6+20));
  }

  drawBot(ctx,b,time,game){
    const x=b.x*T,y=b.y*T;
    this.drawTrainer(ctx,x,y,b.dir||'down',b.frame||0,b.palette,2.05);
    if(b.lead && game.getSprite(b.lead)){
      const img=game.getSprite(b.lead);
      if(img.complete){ ctx.save(); ctx.imageSmoothingEnabled=false; ctx.globalAlpha=.9; ctx.drawImage(img,x+21,y-24+Math.sin(time*.003+b.phase)*2,26,26); ctx.restore(); }
    }
    this.drawNameplate(ctx,x,y-44,b.name,`${lv(b.level)} · ${b.title}`,'#b7e18e',Math.max(64,b.name.length*6+20));
  }

  drawPlayer(ctx,game,time){
    const p=game.player;
    const x=p.x*T,y=p.y*T;
    const pal={cap:'#ff7b62',jacket:'#3c7b6b',shirt:'#f0ead6',skin:'#e4b58a',hair:'#43342a',bag:'#e0b04f',accent:'#c9f46c'};
    this.drawTrainer(ctx,x,y,p.dir,p.frame,pal,2.2);
    if(p.moving&&Math.random()<.15){ ctx.fillStyle='rgba(214,198,159,.3)'; ctx.beginPath(); ctx.arc(x-6,y+2,3,0,6.28); ctx.fill(); }
    // Partner follows at a slight distance.
    const lead=game.party[0];
    if(lead){
      const img=game.getSprite(lead.id);
      if(img&&img.complete){
        const fx=x-26, fy=y+12+Math.sin(time*.003)*2;
        ctx.fillStyle='rgba(9,22,14,.2)'; ctx.beginPath(); ctx.ellipse(fx,fy+2,12,4,0,0,6.28); ctx.fill();
        ctx.save(); ctx.imageSmoothingEnabled=false; ctx.drawImage(img,fx-14,fy-23,28,28); ctx.restore();
      }
    }
  }

  buildMapCanvas(){
    if(this.mapCanvas) return this.mapCanvas;
    const c=document.createElement('canvas'); c.width=MAP_W*4; c.height=MAP_H*4;
    const g=c.getContext('2d');
    const colors={hollow:'#a8c47d',meadow:'#8caf63',forest:'#416a47',lake:'#3e8a9b',volcano:'#7d5140',snow:'#c5d9da',coast:'#5d7f7d',swamp:'#4f6248',peak:'#76847a'};
    for(let y=0;y<MAP_H;y++) for(let x=0;x<MAP_W;x++){
      const t=this.get(x,y), b=this.biomes[y*MAP_W+x];
      let col=colors[b]||'#8caf63';
      if(t===TILE.WATER||t===TILE.DEEP) col=b==='swamp'?'#3e665b':'#3d8da1';
      else if(t===TILE.LAVA) col='#e2622e';
      else if(t===TILE.SNOW||t===TILE.ICE) col='#dcebea';
      else if(t===TILE.PATH||t===TILE.STONE||t===TILE.BRIDGE) col='#c5b892';
      else if(t===TILE.TREE||t===TILE.SNOWTREE) col=b==='snow'?'#54786c':'#355c3a';
      else if(t===TILE.ROCK) col='#737b73';
      else if(t===TILE.BASALT||t===TILE.DARK) col='#51463f';
      else if(t===TILE.SAND) col='#d3c28f';
      g.fillStyle=col; g.fillRect(x*4,y*4,4,4);
    }
    for(const b of this.buildings){ g.fillStyle='#ece2c8'; g.fillRect(b.x*4,b.y*4,b.w*4,b.h*4); g.fillStyle='#b0534c'; g.fillRect(b.x*4,b.y*4,b.w*4,3); }
    this.mapCanvas=c;
    return c;
  }

  drawMinimap(canvas,game,time){
    const g=canvas.getContext('2d'); const W=canvas.width,H=canvas.height;
    g.clearRect(0,0,W,H);
    const zoom=8, px=game.player.x*T, py=game.player.y*T;
    const tilesX=Math.ceil(W/zoom), tilesY=Math.ceil(H/zoom);
    const startX=game.player.x-tilesX/2, startY=game.player.y-tilesY/2;
    const colors={hollow:'#8fb070',meadow:'#84a75e',forest:'#416a47',lake:'#3e8a9b',volcano:'#7d5140',snow:'#c5d9da',coast:'#5d7f7d',swamp:'#4f6248',peak:'#76847a'};
    for(let j=0;j<tilesY;j++) for(let i=0;i<tilesX;i++){
      const tx=Math.floor(startX+i),ty=Math.floor(startY+j);
      if(tx<0||ty<0||tx>=MAP_W||ty>=MAP_H){ g.fillStyle='#173428'; g.fillRect(i*zoom,j*zoom,zoom,zoom); continue; }
      const t=this.get(tx,ty),b=this.biomes[ty*MAP_W+tx]; let col=colors[b]||'#84a75e';
      if(t===TILE.WATER||t===TILE.DEEP) col=b==='swamp'?'#3e665b':'#3d8da1';
      else if(t===TILE.LAVA) col='#d96636';
      else if(t===TILE.SNOW||t===TILE.ICE) col='#dcebea';
      else if(t===TILE.PATH||t===TILE.STONE||t===TILE.BRIDGE) col='#c5b892';
      else if(t===TILE.TREE||t===TILE.SNOWTREE) col=b==='snow'?'#4e7165':'#315739';
      else if(t===TILE.ROCK) col='#6f776f';
      else if(t===TILE.BASALT||t===TILE.DARK) col='#51463f';
      else if(t===TILE.SAND) col='#d3c28f';
      g.fillStyle=col; g.fillRect(i*zoom,j*zoom,zoom+1,zoom+1);
    }
    // buildings
    for(const b of this.buildings){
      const bx=(b.x-startX)*zoom, by=(b.y-startY)*zoom;
      if(bx>-40&&by>-40&&bx<W+40&&by<H+40){ g.fillStyle='#efe3c7'; g.fillRect(bx,by,b.w*zoom,b.h*zoom); g.fillStyle='#a95049'; g.fillRect(bx,by,b.w*zoom,3); }
    }
    // wild markers
    for(const w of game.wilds){
      const wx=(w.x-startX)*zoom, wy=(w.y-startY)*zoom;
      if(wx<0||wy<0||wx>W||wy>H) continue;
      g.fillStyle=w.shiny?'#ffe07d':'#ffb254'; g.beginPath(); g.arc(wx,wy,2.4,0,6.28); g.fill();
    }
    // other players
    for(const p of game.remotePlayers.values()){
      const wx=(p.x-startX)*zoom, wy=(p.y-startY)*zoom;
      if(wx<0||wy<0||wx>W||wy>H) continue;
      g.fillStyle='#70c9ff'; g.beginPath(); g.arc(wx,wy,3.2,0,6.28); g.fill();
    }
    for(const b of game.bots){
      const wx=(b.x-startX)*zoom, wy=(b.y-startY)*zoom;
      if(wx<0||wy<0||wx>W||wy>H) continue;
      g.fillStyle='#89cbe0'; g.beginPath(); g.arc(wx,wy,2.1,0,6.28); g.fill();
    }
    // npc markers
    for(const n of this.npcs){
      const wx=(n.x-startX)*zoom, wy=(n.y-startY)*zoom;
      if(wx<0||wy<0||wx>W||wy>H) continue;
      g.fillStyle='#c9f46c'; g.beginPath(); g.arc(wx,wy,2,0,6.28); g.fill();
    }
    // player arrow
    const cx=(game.player.x-startX)*zoom, cy=(game.player.y-startY)*zoom;
    g.save(); g.translate(cx,cy);
    const rot={up:0,right:Math.PI/2,down:Math.PI,left:-Math.PI/2}[game.player.dir]||0;
    g.rotate(rot);
    g.fillStyle='#eaffb0'; g.beginPath(); g.moveTo(0,-6); g.lineTo(5,5); g.lineTo(0,2); g.lineTo(-5,5); g.closePath(); g.fill();
    g.strokeStyle='rgba(0,0,0,.5)'; g.lineWidth=1; g.stroke();
    g.restore();
    // Soft edge vignette
    const grad=g.createRadialGradient(W/2,H/2,H*.2,W/2,H/2,H*.75);
    grad.addColorStop(0,'rgba(0,0,0,0)'); grad.addColorStop(1,'rgba(2,12,8,.35)');
    g.fillStyle=grad; g.fillRect(0,0,W,H);
  }

  drawWorldMap(canvas,game){
    const g=canvas.getContext('2d'); const W=canvas.width,H=canvas.height;
    const src=this.buildMapCanvas();
    g.imageSmoothingEnabled=false;
    g.fillStyle='#10251e'; g.fillRect(0,0,W,H);
    const scale=Math.min(W/src.width,H/src.height);
    g.drawImage(src,(W-src.width*scale)/2,(H-src.height*scale)/2,src.width*scale,src.height*scale);
    const ox=(W-src.width*scale)/2, oy=(H-src.height*scale)/2, k=src.width/MAP_W*scale;
    // Zone labels
    g.textAlign='center';
    for(const z of ZONES){
      const x=ox+z.x*k, y=oy+z.y*k;
      g.font='700 10px Outfit'; g.fillStyle='rgba(255,255,255,.92)'; g.strokeStyle='rgba(0,0,0,.5)'; g.lineWidth=3;
      const zname=zoneName(z).toUpperCase();
      g.strokeText(zname,x,y); g.fillText(zname,x,y);
      g.font='500 7px Outfit'; g.fillStyle='rgba(230,245,235,.65)';
      const levels=lv(`${z.levels[0]}–${z.levels[1]}`);
      g.strokeText(levels,x,y+12); g.fillText(levels,x,y+12);
    }
    for(const b of this.buildings){
      g.fillStyle='#f3e8cf'; g.fillRect(ox+b.x*k,oy+b.y*k,b.w*k,b.h*k);
    }
    const px=ox+game.player.x*k, py=oy+game.player.y*k;
    g.beginPath(); g.arc(px,py,11,0,6.28); g.fillStyle='rgba(201,244,108,.2)'; g.fill();
    g.beginPath(); g.arc(px,py,5,0,6.28); g.fillStyle='#c9f46c'; g.fill(); g.strokeStyle='#0b1b12'; g.lineWidth=2; g.stroke();
    g.font='700 8px Outfit'; g.fillStyle='#eaffb0'; g.fillText(t('misc.you'),px,py-14);
    g.textAlign='left';
  }
}
