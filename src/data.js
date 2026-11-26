import { speciesName } from './i18n.js';

export const TYPE_COLORS = {
  normal:'#b8b89a', fire:'#ff8b4a', water:'#6aa8ff', electric:'#ffd84d', grass:'#8ddc63',
  ice:'#8fe3e3', fighting:'#e35f57', poison:'#c06bc0', ground:'#dfbd72', flying:'#b3a1ff',
  psychic:'#ff7fae', bug:'#b6c93c', rock:'#c9b45c', ghost:'#9b86d4', dragon:'#8b6cff',
  dark:'#9a8171', steel:'#b9c4d9', fairy:'#ff9ecb'
};

export const TYPE_CHART = {
  normal:{rock:.5,ghost:0,steel:.5},
  fire:{fire:.5,water:.5,grass:2,ice:2,bug:2,rock:.5,dragon:.5,steel:2},
  water:{fire:2,water:.5,grass:.5,ground:2,rock:2,dragon:.5},
  electric:{water:2,electric:.5,grass:.5,ground:0,flying:2,dragon:.5},
  grass:{fire:.5,water:2,grass:.5,poison:.5,ground:2,flying:.5,bug:.5,rock:2,dragon:.5,steel:.5},
  ice:{fire:.5,water:.5,grass:2,ice:.5,ground:2,flying:2,dragon:2,steel:.5},
  fighting:{normal:2,ice:2,poison:.5,flying:.5,psychic:.5,bug:.5,rock:2,ghost:0,dark:2,steel:2,fairy:.5},
  poison:{grass:2,poison:.5,ground:.5,rock:.5,ghost:.5,steel:0,fairy:2},
  ground:{fire:2,electric:2,grass:.5,poison:2,flying:0,bug:.5,rock:2,steel:2},
  flying:{electric:.5,grass:2,fighting:2,bug:2,rock:.5,steel:.5},
  psychic:{fighting:2,poison:2,psychic:.5,dark:0,steel:.5},
  bug:{fire:.5,grass:2,fighting:.5,poison:.5,flying:.5,psychic:2,ghost:.5,dark:2,steel:.5,fairy:.5},
  rock:{fire:2,ice:2,fighting:.5,ground:.5,flying:2,bug:2,steel:.5},
  ghost:{normal:0,psychic:2,ghost:2,dark:.5},
  dragon:{dragon:2,steel:.5,fairy:0},
  dark:{fighting:.5,psychic:2,ghost:2,dark:.5,fairy:.5},
  steel:{fire:.5,water:.5,electric:.5,ice:2,rock:2,steel:.5,fairy:2},
  fairy:{fire:.5,fighting:2,poison:.5,dragon:2,dark:2,steel:.5}
};

export const MOVES = {
  normal:[
    ['Tackle',40,100,35,'A straightforward full-body charge.'],
    ['Quick Attack',40,100,30,'Strikes with blinding speed.'],
    ['Headbutt',70,100,15,'A risky, heavy head-first slam.'],
    ['Body Slam',85,100,10,'Crushes the foe with full weight.']
  ],
  fire:[
    ['Ember',40,100,30,'A small flame that may leave a burn.'],
    ['Flame Wheel',60,100,20,'Rolls into the foe wreathed in fire.'],
    ['Fire Fang',65,95,15,'Bites with flame-cloaked fangs.'],
    ['Flamethrower',90,100,10,'A searing stream of intense flame.']
  ],
  water:[
    ['Water Gun',40,100,30,'Squirts a pressurized jet of water.'],
    ['Aqua Jet',45,100,25,'Rockets forward on a watery wake.'],
    ['Brine',65,100,15,'A wave of stinging salt water.'],
    ['Surf',90,100,10,'A great tidal wave crashes down.']
  ],
  grass:[
    ['Vine Whip',45,100,30,'Lashes the foe with slender vines.'],
    ['Razor Leaf',55,95,25,'Sharp leaves slice through the air.'],
    ['Seed Bomb',75,100,15,'Hurls a hard, explosive seed.'],
    ['Energy Ball',90,100,10,'Draws on nature to form a sphere.']
  ],
  electric:[
    ['Thunder Shock',40,100,30,'A jolt of static electricity.'],
    ['Spark',50,100,25,'Charges the foe with crackling energy.'],
    ['Thunder Fang',65,95,15,'Bites with electrified fangs.'],
    ['Thunderbolt',90,100,10,'A powerful bolt of lightning.']
  ],
  ice:[
    ['Powder Snow',40,100,30,'A gust of chilling snow.'],
    ['Icy Wind',55,95,25,'A frigid wind that slows the foe.'],
    ['Ice Fang',65,95,15,'Bites with ice-cold fangs.'],
    ['Ice Beam',90,100,10,'A beam of freezing energy.']
  ],
  fighting:[
    ['Rock Smash',40,100,30,'A punch that can shatter stone.'],
    ['Low Sweep',55,100,25,'A swift kick at the foe’s legs.'],
    ['Brick Break',75,100,15,'A focused, shattering chop.'],
    ['Close Combat',95,100,10,'A reckless all-out assault.']
  ],
  poison:[
    ['Poison Sting',40,100,30,'A toxic barb jabs the foe.'],
    ['Acid',45,100,25,'Corrosive acid splashes out.'],
    ['Poison Jab',75,100,15,'A stabbing strike laced with venom.'],
    ['Sludge Bomb',90,100,10,'Hurls a bomb of foul sludge.']
  ],
  ground:[
    ['Mud-Slap',40,100,30,'Flings mud into the foe’s eyes.'],
    ['Bulldoze',60,100,20,'Tramples the ground with force.'],
    ['Dig',75,100,15,'Burrows underground, then strikes.'],
    ['Earthquake',95,100,10,'A massive, ground-shaking quake.']
  ],
  flying:[
    ['Gust',40,100,30,'Whips up a buffeting wind.'],
    ['Wing Attack',55,100,25,'Strikes with spread wings.'],
    ['Aerial Ace',70,100,15,'An unavoidable flying slash.'],
    ['Air Slash',85,95,10,'A blade of compressed air.']
  ],
  psychic:[
    ['Confusion',45,100,30,'A weak telekinetic attack.'],
    ['Psybeam',60,100,20,'A peculiar ray that may confuse.'],
    ['Zen Headbutt',75,95,15,'Focuses will into a headbutt.'],
    ['Psychic',90,100,10,'A powerful telekinetic blast.']
  ],
  bug:[
    ['Bug Bite',45,100,30,'Chews on the foe with tiny fangs.'],
    ['Struggle Bug',50,100,25,'An awkward but determined tackle.'],
    ['X-Scissor',75,100,15,'Slashes with crossed claws.'],
    ['Bug Buzz',85,100,10,'A damaging vibration of sound.']
  ],
  rock:[
    ['Rock Throw',45,100,30,'Hurls a small boulder.'],
    ['Rock Tomb',55,95,25,'Drops stones to trap the foe.'],
    ['Smack Down',70,100,15,'Knocks the foe out of the air.'],
    ['Stone Edge',95,90,10,'Sharp stone pillars stab upward.']
  ],
  ghost:[
    ['Lick',40,100,30,'A creepy lick that may paralyze.'],
    ['Shadow Sneak',45,100,25,'Strikes from the foe’s shadow.'],
    ['Shadow Claw',70,100,15,'A slash from a shadowy claw.'],
    ['Shadow Ball',90,100,10,'Hurls a sphere of dark energy.']
  ],
  dragon:[
    ['Twister',40,100,30,'Whips up a dragon-touched cyclone.'],
    ['Dragon Breath',55,100,25,'A breath of draconic energy.'],
    ['Dragon Claw',75,100,15,'Slashes with sharp dragon claws.'],
    ['Dragon Pulse',90,100,10,'A shockwave from the dragon’s core.']
  ],
  dark:[
    ['Bite',45,100,30,'A dark-infused bite.'],
    ['Feint Attack',55,100,25,'A sly, unavoidable strike.'],
    ['Crunch',75,100,15,'Bites with wicked, crushing force.'],
    ['Dark Pulse',90,100,10,'A wave of cruel, dark thoughts.']
  ],
  steel:[
    ['Metal Claw',45,100,30,'Rakes with hardened steel claws.'],
    ['Bullet Punch',45,100,25,'A lightning-fast metal jab.'],
    ['Iron Head',75,100,15,'A skull-first steel charge.'],
    ['Flash Cannon',90,100,10,'A blinding beam of steel energy.']
  ],
  fairy:[
    ['Fairy Wind',40,100,30,'A sparkling, disarming breeze.'],
    ['Draining Kiss',50,100,25,'Steals vitality with a kiss.'],
    ['Play Rough',75,95,15,'A rough-and-tumble fairy assault.'],
    ['Moonblast',90,100,10,'Borrows the moon’s power to attack.']
  ]
};

export const NATURES = ['Bold','Brave','Calm','Careful','Hasty','Impish','Jolly','Lax','Lonely','Mild','Modest','Naive','Naughty','Quiet','Rash','Relaxed','Sassy','Serious','Timid'];

export const ZONES = [
  { id:'hollow', name:'Verdant Hollow', subtitle:'Where every journey begins', x:75, y:64, r:15, biome:'town', mapColor:'#a8c47d', levels:[8,14], spawns:[16,19,21,25,52,133,163,165,191,194,263,265,396,399,504,519,659,661,819,906,915], desc:'A sun-warmed haven of cobbled lanes, wildflower gardens and the smell of fresh bread.' },
  { id:'meadow', name:'Sunpetal Meadows', subtitle:'Fields alive with fluttering wings', x:74, y:83, r:20, biome:'meadow', mapColor:'#9cbf6e', levels:[4,11], spawns:[10,13,16,19,21,25,29,32,43,46,48,69,133,161,162,163,165,167,172,191,194,263,265,266,287,396,399,401,412,415,519,661,736,819,824,906,915], desc:'Endless wildflower fields where rookie trainers chase their first catch.' },
  { id:'forest', name:'Whispering Woods', subtitle:'Old trees remember everything', x:40, y:53, r:24, biome:'forest', mapColor:'#47734c', levels:[7,17], spawns:[10,11,12,13,14,15,46,47,48,63,64,65,69,70,71,102,103,114,123,127,133,143,152,153,154,165,166,167,168,187,188,189,191,192,193,204,205,212,214,251,252,253,254,265,266,267,273,274,275,285,286,287,290,291,292,315,357,387,388,389,401,402,403,404,412,413,414,455,459,460,495,496,497,511,512,513,514,540,541,542,548,549,590,591,636,637,708,709,753,754,755,756,761,762,763,781,810,811,812,829,830,840,841,842,856,857,858,906,907,908,928,929,930], desc:'A deep green labyrinth of ancient boughs, mossy stones and shy forest spirits.' },
  { id:'lake', name:'Mirror Lake', subtitle:'Still water, bright secrets', x:108, y:55, r:20, biome:'lake', mapColor:'#4c8f9b', levels:[8,18], spawns:[7,8,9,54,55,60,61,62,72,73,74,79,80,86,87,90,91,98,99,116,117,118,119,120,121,129,130,131,134,147,148,149,158,159,160,170,171,183,184,186,194,195,199,211,222,223,224,226,230,245,258,259,260,270,271,272,278,279,283,284,318,319,320,321,339,340,341,342,349,350,363,364,365,366,367,368,369,370,373,374,375,380,381,382,418,419,422,423,456,457,458,489,490,501,502,503,535,536,537,550,550,565,566,567,580,581,592,593,594,602,603,604,618,647,690,691,692,693,704,705,706,728,729,730,746,747,748,751,752,767,768,769,770,779,780,833,834,846,847,852,853,871,882,883,902,912,913,914,960,961,962,976,977,978,999,1000,1010,1011,1012,1013], desc:'A glassy lake ringed by reeds, ancient stones and legends of a serpent below.' },
  { id:'volcano', name:'Ember Ridge', subtitle:'The mountain breathes fire', x:117, y:92, r:20, biome:'volcano', mapColor:'#8e5b43', levels:[14,26], spawns:[4,5,6,37,38,58,59,77,78,126,136,146,155,156,157,218,219,228,229,240,244,250,255,256,257,322,323,324,331,332,338,351,359,383,390,391,392,425,426,467,485,494,498,499,500,513,514,554,555,607,608,609,631,636,637,662,663,667,668,721,725,726,727,757,758,776,806,837,838,839,850,851,909,910,911,935,936,937,988,1004,1007,1009,1020,1021,1022,1023], desc:'Basalt cliffs and rivers of slow gold. Only the bold climb through the heat haze.' },
  { id:'snow', name:'Frostpeak Expanse', subtitle:'Silence, snow and starlight', x:48, y:24, r:23, biome:'snow', mapColor:'#c1d9dc', levels:[15,28], spawns:[27,28,37,38,39,40,58,59,86,87,91,122,124,131,144,215,220,221,225,238,239,361,362,363,364,365,378,459,460,461,471,473,478,582,583,584,613,614,615,698,699,700,712,713,715,720,739,740,745,746,781,792,801,849,866,872,873,874,875,883,896,897,898,974,975,991,996,997,998,1002,1014], desc:'A high alpine world of blue ice, drifting snow and frozen silence.' },
  { id:'coast', name:'Storm Coast', subtitle:'Where the sky meets the sea', x:135, y:74, r:17, biome:'coast', mapColor:'#648b87', levels:[12,24], spawns:[7,8,9,54,55,60,61,62,72,73,74,90,91,98,99,116,117,118,119,120,121,129,130,131,138,139,140,141,170,171,211,222,223,224,226,230,278,279,320,321,339,340,341,342,349,350,366,367,368,369,370,371,372,373,374,375,376,377,418,419,456,457,458,489,490,501,502,503,535,536,537,550,565,566,567,580,581,592,593,594,602,603,604,618,690,691,692,693,728,729,730,746,747,748,751,752,767,768,769,770,779,780,833,834,846,847,852,853,871,882,883,902,912,913,914,960,961,962,976,977,978,999,1000,1010,1011,1012,1013], desc:'Salt spray, black cliffs and a lighthouse that cuts through the storm.' },
  { id:'swamp', name:'Shadowfen Marsh', subtitle:'Listen — the reeds are whispering', x:75, y:103, r:17, biome:'swamp', mapColor:'#526349', levels:[13,25], spawns:[23,24,41,42,88,89,92,93,94,109,110,169,194,195,211,213,269,270,271,272,278,279,283,284,290,291,292,293,294,295,316,317,336,337,351,352,353,354,355,356,358,425,426,434,435,442,451,452,453,454,455,472,489,490,537,568,569,580,581,592,593,594,616,617,618,690,691,692,693,704,705,706,709,710,711,718,719,720,746,747,748,751,752,755,756,757,758,767,768,769,770,793,794,795,796,797,798,799,800,803,804,805,806,849,850,851,871,882,883,902,938,939,940,941,942,943,944,945,946,947,948,949,950,951,952,953,954,955,956,957,958,959,960,961,962,971,972,973,1001,1003,1005], desc:'A mist-drowned wetland of crooked trees and soft, deceptive ground.' },
  { id:'peak', name:'Victory Peak', subtitle:'Only legends reach the summit', x:75, y:16, r:15, biome:'peak', mapColor:'#7c8a80', levels:[24,38], spawns:[6,95,142,144,145,146,149,150,151,243,244,245,249,250,251,377,378,379,380,381,382,383,384,385,386,480,481,482,483,484,485,486,487,488,489,490,491,492,493,494,495,496,497,498,499,500,638,639,640,641,642,643,644,645,646,647,648,649,716,717,718,719,720,721,772,773,774,775,776,777,778,779,780,781,782,783,784,785,786,787,788,789,790,791,792,793,794,795,796,797,798,799,800,801,802,803,804,805,806,807,808,809,890,891,892,893,894,895,896,897,898,899,900,901,902,903,904,905], desc:'Wind-scoured stone above the clouds. The air itself feels electric.' }
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map(z=>[z.id,z]));

export const ITEMS = {
  pokeball:{name:'Poké Ball', short:'Ball', desc:'A reliable ball for catching wild Pokémon.', price:200, icon:'ball', catch:1},
  greatball:{name:'Great Ball', short:'Great', desc:'A high-performance ball with a better catch rate.', price:600, icon:'great', catch:1.5},
  ultraball:{name:'Ultra Ball', short:'Ultra', desc:'An advanced ball with an exceptional catch rate.', price:1200, icon:'ultra', catch:2},
  potion:{name:'Potion', short:'Potion', desc:'Restores 30 HP to a party Pokémon.', price:300, icon:'potion', heal:30},
  superpotion:{name:'Super Potion', short:'Super', desc:'Restores 80 HP to a party Pokémon.', price:700, icon:'potion', heal:80},
  revive:{name:'Revive', short:'Revive', desc:'Revives a fainted Pokémon with half HP.', price:1000, icon:'revive'},
  berry:{name:'Oran Berry', short:'Berry', desc:'A sweet berry that restores 20 HP.', price:100, icon:'berry', heal:20},
  lure:{name:'Wild Lure', short:'Lure', desc:'Draws rarer Pokémon out of hiding for 10 minutes.', price:900, icon:'lure'}
};

export const SHOP_STOCK = ['pokeball','greatball','ultraball','potion','superpotion','revive','berry','lure'];

export const NPCS = [
  {id:'alder', name:'Professor Alder', role:'Pokémon Professor', x:76.5, y:70.8, sprite:197, color:'#c9f46c', lines:[
    'Ah, Nova! Right on time. The wilds are restless — I can feel it in the wind.',
    'Take these Poké Balls. The creatures beyond the gate are curious, but they spook easily.',
    'Catch three wild Pokémon and bring me your field notes. There is something remarkable happening at Victory Peak.'
  ], dialogueType:'professor'},
  {id:'joy', name:'Nurse Joy', role:'Pokémon Center', x:67.5, y:58.9, sprite:113, color:'#ff9ecb', lines:['Welcome to the Verdant Hollow Pokémon Center!','Let me take care of your team. They work so hard out there.'], dialogueType:'heal'},
  {id:'mara', name:'Mara', role:'Trail Merchant', x:83.5, y:58.9, sprite:36, color:'#ffb254', lines:['Fresh stock from Storm Coast! Balls, potions, and a few things that fell off a boat.','No refunds. Especially not on the mysterious eggs.'], dialogueType:'shop'},
  {id:'kai', name:'Rival Kai', role:'Ace Trainer', x:75.0, y:82.4, sprite:149, color:'#70c9ff', lines:['Took you long enough. I already caught a full team while you were napping.','Let’s see if the professor’s faith in you was deserved.'], dialogueType:'rival', team:[149,59]},
  {id:'mira', name:'Scout Mira', role:'Ranger Corps', x:47.5, y:64.5, sprite:123, color:'#c9f46c', lines:['The Whispering Woods are beautiful this time of year — and completely full of Bug-types.','If you hear a rustle behind you, do not investigate alone.'], dialogueType:'quest'},
  {id:'fen', name:'Old Fen', role:'Marsh Hermit', x:78.0, y:99.4, sprite:260, color:'#b49cff', lines:['The fen keeps its own counsel. But it likes visitors who bring berries.','Something old moved beneath the water last night. Something with too many eyes.'], dialogueType:'lore'},
  {id:'tobin', name:'Tobin', role:'Trainer', x:91.5, y:73.5, sprite:143, color:'#ffb254', lines:['My Snorlax and I have been walking this road for years. Mostly walking. Occasionally napping.'], dialogueType:'trainer', team:[143,59]},
  {id:'sena', name:'Sena', role:'Sky Watcher', x:65.5, y:35.5, sprite:6, color:'#70c9ff', lines:['Rayquaza has been circling for three days. The storm hasn’t stopped since.','If you’re going to the peak, take a jacket. And maybe a dragon.'], dialogueType:'lore'},
  {id:'ivo', name:'Ivo', role:'Mountain Guide', x:107.5, y:86.0, sprite:6, color:'#ff8b4a', lines:['Ember Ridge is no place for sandals. The ground remembers every step.','There are Fire-types up there that eat charcoal for breakfast. Bring water. Lots of it.'], dialogueType:'lore'},
];

export const TRAINER_NAMES = ['Luna','Rook','Ivy','Kai','Mika','Sora','Juno','Ash','Rhea','Theo','Nia','Vale','Cyan','Pia','Onyx','Rin','Iris','Koa','Maeve','Zed','Aster','Niko','Yara','Finn','Eli','Nova','Tess','Remy','Wren','Kai','Sage','Briar','Kite','Lark','Moss','Rune','Skye','Tide','Ember','Frost'];
export const BOT_LINES = [
  'Anyone seen a shiny Ralts near the lake? 👀',
  'The Rayquaza raid is filling up — 47/50!',
  'Just caught my first Sprigatito 🌱',
  'Selling a spare Moon Stone in Verdant Hollow.',
  'Frostpeak is gorgeous at sunrise. Worth the climb.',
  'Anyone want to run the Ember Ridge route? Need a water type.',
  'The new migration rotation brought a Milotic to Mirror Lake!',
  'LFG for Victory Peak. Level 24+, bring potions.',
  'Tip: great balls work way better when the wild mon is low HP.',
  'Who else is still awake? The fireflies in Shadowfen are unreal.',
  'My Ceruledge just hit level 40. The grind is real.',
  'The shop restocked ultra balls!! Go go go',
  'I swear there’s a legendary in the fog at the coast.',
  'New player here. How do I get to Sunpetal Meadows?',
  'The music in Whispering Woods is so good.',
  'Anyone up for a friendly battle in the plaza?',
  'Caught a shiny Magikarp after 200 tries. Never again.',
  'The professor gives free pokeballs btw, talk to him first!',
  'Raid starts in 12 minutes. Meet at the north gate!',
  'Just saw a pack of Eevee near the flower fields 🥹'
];

export const QUEST_DEFS = {
  main:{ id:'main', title:'A New Journey', chapter:'01', desc:'Professor Alder is waiting by the lab. Something is stirring in the Verdant Wilds.', rewards:{coins:800, pokeball:10}, objectives:[
    {id:'talk', label:'Speak with Professor Alder', target:1},
    {id:'catch', label:'Catch 3 wild Pokémon', target:3},
    {id:'level', label:'Reach trainer level 15', target:15}
  ]},
  side1:{ id:'side1', title:'A Shy Sprigatito', chapter:'SIDE', desc:'Scout Mira spotted a frightened Sprigatito near the Whispering Woods. It keeps hiding in the tall grass.', rewards:{coins:450, greatball:3}, objectives:[
    {id:'sprig', label:'Catch a Sprigatito', target:1}
  ]},
  side2:{ id:'side2', title:'The Lighthouse Keeper', chapter:'SIDE', desc:'The Storm Coast lighthouse has gone dark. Find out what is scaring the keeper.', rewards:{coins:650, superpotion:2}, objectives:[
    {id:'coast', label:'Visit Storm Coast', target:1}
  ]},
  raid:{ id:'raid', title:'Sky Serpent Sighting', chapter:'RAID', desc:'Rayquaza has descended on Victory Peak. Trainers are gathering for a once-in-a-generation encounter.', rewards:{coins:2500, ultraball:5}, objectives:[
    {id:'raid', label:'Defeat the sky serpent', target:1}
  ]}
};

export function spriteUrl(id){ return `./assets/pokemon/${id}.png`; }
export function padDex(id){ return String(id).padStart(4,'0'); }
export function titleCase(s){ return s.replace(/\b\w/g,c=>c.toUpperCase()); }
export function rand(a,b){ return a + Math.random()*(b-a); }
export function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
export function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
export function lerp(a,b,t){ return a+(b-a)*t; }

export function typeEffect(moveType, defenderTypes){
  let mult = 1;
  for(const t of defenderTypes){
    const row = TYPE_CHART[moveType];
    if(row && row[t] !== undefined) mult *= row[t];
  }
  return mult;
}

export function statsFor(base, level){
  return {
    maxHp: Math.floor(base.hp*2*level/100)+level+10,
    atk: Math.floor(base.atk*2*level/100)+5,
    def: Math.floor(base.def*2*level/100)+5,
    spa: Math.floor(base.spa*2*level/100)+5,
    spd: Math.floor(base.spd*2*level/100)+5,
    spe: Math.floor(base.spe*2*level/100)+5
  };
}

export function xpToNext(level){ return Math.floor(32 + level*level*4.8); }

export function movesFor(mon, level){
  const types = [...new Set([...mon.types,'normal'])];
  const out = [];
  types.forEach((t,ti)=>{
    const pool = MOVES[t] || MOVES.normal;
    const count = ti === 0 ? 3 : 1;
    for(let i=0;i<count;i++){
      const m = pool[Math.min(pool.length-1, Math.floor((level-4)/10)+i)];
      if(!out.find(x=>x.name===m[0])) out.push({name:m[0],type:t,power:m[1],acc:m[2],pp:m[3],maxPp:m[3],desc:m[4]});
    }
  });
  if(out.length<4){
    for(const m of MOVES.normal){
      if(out.length>=4) break;
      if(!out.find(x=>x.name===m[0])) out.push({name:m[0],type:'normal',power:m[1],acc:m[2],pp:m[3],maxPp:m[3],desc:m[4]});
    }
  }
  return out.slice(0,4);
}

export function createMon(id, level, data, opts={}){
  const base = data[id-1];
  const stats = statsFor(base, level);
  const hp = opts.hp ?? stats.maxHp;
  return {
    uid: opts.uid || (Date.now().toString(36)+Math.random().toString(36).slice(2,7)),
    id, name: speciesName(base), level, types: base.types, base,
    hp, maxHp: stats.maxHp, stats,
    moves: movesFor(base, level),
    xp: opts.xp ?? 0, xpNext: xpToNext(level),
    nature: opts.nature || pick(NATURES),
    shiny: opts.shiny ?? false,
    status: null
  };
}

export function healMon(mon){ mon.hp = mon.maxHp; mon.status = null; }
export function calcDamage(attacker, defender, move, data){
  const mult = typeEffect(move.type, defender.types);
  if(mult === 0) return {dmg:0,mult,crit:false,miss:false};
  const accRoll = Math.random()*100;
  if(accRoll > move.acc) return {dmg:0,mult,crit:false,miss:true};
  const crit = Math.random() < 0.07;
  const physical = ['normal','fighting','flying','poison','ground','rock','bug','ghost','steel'].includes(move.type) && !['psychic','fairy','dragon','dark','ice'].includes(move.type);
  const atk = physical ? attacker.stats.atk : attacker.stats.spa;
  const def = physical ? defender.stats.def : defender.stats.spd;
  const stab = attacker.types.includes(move.type) ? 1.2 : 1;
  const randF = 0.86 + Math.random()*0.14;
  let dmg = Math.floor((((2*attacker.level/5+2)*move.power*atk/def)/50+2) * mult * stab * randF * (crit?1.5:1));
  dmg = Math.max(1,dmg);
  return {dmg,mult,crit,miss:false};
}

export function catchChance(mon, ballMult){
  const hpFactor = 1 - (mon.hp/mon.maxHp)*0.72;
  const base = (mon.base.capture || 45)/255;
  const lvlFactor = clamp(1 - (mon.level-5)*0.012, .45, 1);
  const status = mon.status ? 1.35 : 1;
  return clamp((base*0.82 + hpFactor*0.42) * ballMult * lvlFactor * status, .035, .94);
}

export function getZoneAt(x,y){
  let best = ZONES[0], bestScore = Infinity;
  for(const z of ZONES){
    const d = Math.hypot(x-z.x, (y-z.y)*1.15);
    const score = d / z.r;
    if(score < bestScore){ bestScore = score; best = z; }
  }
  return best;
}

export function biomeSpawns(zone, data, count, playerLevel){
  const hour = new Date().getHours();
  const rotation = Math.floor(Date.now()/(1000*60*30));
  const pool = zone.spawns.filter(id=>id>=1 && id<=data.length);
  const levelMin = Math.max(2, zone.levels[0] + Math.floor(playerLevel*.15));
  const levelMax = Math.max(levelMin+1, zone.levels[1] + Math.floor(playerLevel*.3));
  const out = [];
  for(let i=0;i<count;i++){
    let id = pool[Math.floor(Math.random()*pool.length)];
    if(Math.random()<0.12){
      const migration = 1 + ((rotation*37 + i*113 + zone.id.length*19) % data.length);
      id = migration;
    }
    const legendary = data[id-1].legendary || data[id-1].mythical;
    if(legendary && Math.random() > .025) id = pool[Math.floor(Math.random()*pool.length)];
    const lvl = Math.floor(rand(levelMin,levelMax));
    out.push({id, level: Math.max(2,lvl), shiny: Math.random()<0.012, zone:zone.id, hour});
  }
  return out;
}

export const ZONE_PALETTES = {
  town:{grass:'#7fa75c',grass2:'#88b062',path:'#c7b88b',path2:'#b9a87d',water:'#4d9aab',water2:'#3c8496',tree:'#3f713e',tree2:'#5b8c4c',rock:'#9b9c8c',snow:'#e9f4f2',lava:'#d55a2d',swamp:'#5d724f'},
  meadow:{grass:'#82ad5e',grass2:'#8eb968',path:'#c7b88b',path2:'#b9a87d',water:'#4d9aab',water2:'#3c8496',tree:'#3f713e',tree2:'#5b8c4c',rock:'#9b9c8c',snow:'#e9f4f2',lava:'#d55a2d',swamp:'#5d724f'},
  forest:{grass:'#5d8b4e',grass2:'#699957',path:'#ad9b72',path2:'#998862',water:'#3f8189',water2:'#326d76',tree:'#2e5c36',tree2:'#477b42',rock:'#828d7c',snow:'#e9f4f2',lava:'#d55a2d',swamp:'#4d6546'},
  lake:{grass:'#78a35d',grass2:'#84af66',path:'#c2b183',path2:'#b09d73',water:'#3d8da1',water2:'#2f778d',tree:'#3a6f42',tree2:'#538b4e',rock:'#8d968b',snow:'#e9f4f2',lava:'#d55a2d',swamp:'#56704f'},
  volcano:{grass:'#77684f',grass2:'#806f53',path:'#9b7659',path2:'#86644c',water:'#557f82',water2:'#456b70',tree:'#5a4c36',tree2:'#6f5b3e',rock:'#665b53',snow:'#e9f4f2',lava:'#e2622e',swamp:'#4d493a'},
  snow:{grass:'#b7cdc7',grass2:'#c3d7d1',path:'#d8ded2',path2:'#c8d0c6',water:'#79b4c2',water2:'#66a3b2',tree:'#456d63',tree2:'#5f8a76',rock:'#8a9694',snow:'#edf7f5',lava:'#d55a2d',swamp:'#7e958c'},
  coast:{grass:'#7c9b69',grass2:'#87a773',path:'#c3b58a',path2:'#b0a17a',water:'#3f8799',water2:'#317285',tree:'#436f45',tree2:'#5d8a51',rock:'#8d8d82',snow:'#e9f4f2',lava:'#d55a2d',swamp:'#5d7352'},
  swamp:{grass:'#667a52',grass2:'#71875a',path:'#8b7e5c',path2:'#796d50',water:'#3f665c',water2:'#34574f',tree:'#354f38',tree2:'#4a6745',rock:'#73776a',snow:'#e9f4f2',lava:'#d55a2d',swamp:'#4c5f43'},
  peak:{grass:'#7f927c',grass2:'#899d85',path:'#a7a999',path2:'#969887',water:'#598e9b',water2:'#487b88',tree:'#425d4d',tree2:'#58745c',rock:'#777c76',snow:'#dfeceb',lava:'#d55a2d',swamp:'#5d6b58'}
};

export const ZONE_TIPS = {
  hollow:'A safe haven. Visit the Pokémon Center to heal, or the market for supplies.',
  meadow:'Tall grass hides wild Pokémon. Walk close and press E to engage.',
  forest:'Bug and Grass-types thrive here. Fire-types have an edge.',
  lake:'Water-types gather at the shore. Bring Great Balls for rare encounters.',
  volcano:'Fire-types roam the ridge. Water and Rock moves deal extra damage.',
  snow:'Ice-types are common in the drifts. Watch for sparkling snow — shinies hide there.',
  coast:'Storms roll in fast. Electric-types love the charged air.',
  swamp:'Poison and Ghost-types lurk in the fog. Potions are essential.',
  peak:'The final frontier. Legendary Pokémon have been sighted at the summit.'
};
