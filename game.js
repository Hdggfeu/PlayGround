const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const battleScreen = document.getElementById('battle-screen');
const hud = document.getElementById('hud');
const messageBox = document.getElementById('message-box');
const touchControls = document.getElementById('touch-controls');
const startBtn = document.getElementById('start-btn');
const questText = document.getElementById('quest-text');
const playerNameEl = document.getElementById('player-name');
const levelEl = document.getElementById('player-level');
const playerHealthEl = document.getElementById('player-health');
const coinEl = document.getElementById('coin-count');
const onlineCountEl = document.getElementById('online-count');
const regionEl = document.getElementById('region-name');
const partyList = document.getElementById('party-list');
const ballCountEl = document.getElementById('ball-count');
const potionCountEl = document.getElementById('potion-count');
const enemyNameEl = document.getElementById('enemy-name');
const enemyHpFill = document.getElementById('enemy-hp-fill');
const battleLog = document.getElementById('battle-log');
const enemySprite = document.getElementById('enemy-sprite');

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 1200;

const keys = new Set();
let lastTimestamp = 0;
let isGameStarted = false;
let activeScene = 'village';
let messageTimer = null;

const state = {
  player: {
    x: 350,
    y: 520,
    w: 28,
    h: 28,
    color: '#ffd76a',
    name: 'Astra',
    level: 1,
    hp: 100,
    maxHp: 100,
    coins: 0,
    balls: 4,
    potions: 3,
    facing: 'down'
  },
  playersOnline: 24,
  region: 'Brightwood',
  questIndex: 0,
  party: [
    { name: 'Piplup', type: 'water', level: 8 },
    { name: 'Pikachu', type: 'electric', level: 5 }
  ],
  worldObjects: [
    { type: 'house', x: 130, y: 180, w: 190, h: 130 },
    { type: 'house', x: 630, y: 180, w: 190, h: 130 },
    { type: 'tree', x: 880, y: 340, w: 80, h: 80 },
    { type: 'tree', x: 1010, y: 540, w: 80, h: 80 },
    { type: 'tree', x: 1220, y: 330, w: 80, h: 80 },
    { type: 'tree', x: 510, y: 760, w: 80, h: 80 },
    { type: 'sign', x: 330, y: 335, w: 44, h: 44 },
    { type: 'portal', x: 1500, y: 760, w: 60, h: 60 },
    { type: 'guide', x: 220, y: 430, w: 36, h: 36 }
  ],
  battle: null,
  wildCreatures: [
    { name: 'Pikachu', hp: 34, maxHp: 34, color: '#f7d652', type: 'electric' },
    { name: 'Bubblup', hp: 42, maxHp: 42, color: '#5cc2ff', type: 'water' },
    { name: 'Treecko', hp: 28, maxHp: 28, color: '#6bd57b', type: 'grass' },
    { name: 'Charmit', hp: 40, maxHp: 40, color: '#ffa076', type: 'fire' }
  ]
};

const quests = [
  'Talk to the town guide.',
  'Travel to the wild grass and catch a creature.',
  'Win a battle in the meadow.',
  'Return to the guide for your reward.'
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function showMessage(text) {
  messageBox.textContent = text;
  messageBox.classList.remove('hidden');
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => messageBox.classList.add('hidden'), 2400);
}

function updateHud() {
  playerNameEl.textContent = state.player.name;
  levelEl.textContent = state.player.level;
  playerHealthEl.textContent = state.player.hp;
  coinEl.textContent = state.player.coins;
  onlineCountEl.textContent = state.playersOnline;
  regionEl.textContent = state.region;
  ballCountEl.textContent = state.player.balls;
  potionCountEl.textContent = state.player.potions;
  questText.textContent = quests[state.questIndex] || 'Quest complete!';

  partyList.innerHTML = '';
  state.party.forEach((member) => {
    const tag = document.createElement('span');
    tag.className = 'pokemon-tag';
    tag.textContent = `${member.name} Lv.${member.level}`;
    partyList.appendChild(tag);
  });
}

function startBattle(creature) {
  if (state.battle) return;
  const data = JSON.parse(JSON.stringify(creature));
  state.battle = {
    ...data,
    enemyName: data.name,
    log: `${data.name} appears! Choose an action.`
  };
  enemyNameEl.textContent = state.battle.name;
  enemyHpFill.style.width = `${(state.battle.hp / state.battle.maxHp) * 100}%`;
  battleLog.textContent = state.battle.log;
  battleScreen.classList.remove('hidden');
  enemySprite.style.background = `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(234, 244, 255, 0.1) 35%, rgba(16,24,26,0.8) 36%), linear-gradient(135deg, ${creature.color}, #6bb36f)`;
}

function endBattle(outcome) {
  if (!state.battle) return;
  const creatureName = state.battle.name;
  state.battle = null;
  battleScreen.classList.add('hidden');

  if (outcome === 'captured') {
    if (state.questIndex === 1) state.questIndex = 2;
    showMessage(`${creatureName} joined your party!`);
  } else if (outcome === 'defeated') {
    state.player.coins += 10;
    if (state.questIndex === 2) state.questIndex = 3;
    showMessage(`${creatureName} was defeated. +10 coins!`);
  }
  updateHud();
}

function doBattleAction(action) {
  if (!state.battle) return;

  const player = state.player;
  const enemy = state.battle;
  let log = '';

  switch (action) {
    case 'attack': {
      const damage = 8 + Math.floor(Math.random() * 6);
      enemy.hp = Math.max(0, enemy.hp - damage);
      log = `You strike ${enemy.name} for ${damage} damage.`;
      break;
    }
    case 'heal': {
      if (player.potions <= 0) {
        log = 'You have no potions left.';
        break;
      }
      if (player.hp >= player.maxHp) {
        log = 'Your health is already full.';
        break;
      }
      player.potions -= 1;
      const heal = Math.min(player.maxHp - player.hp, 24);
      player.hp += heal;
      log = `You use a potion and recover ${heal} health.`;
      break;
    }
    case 'capture': {
      if (player.balls <= 0) {
        log = 'You have no Pokéballs.';
        break;
      }
      player.balls -= 1;
      const chance = Math.random();
      if (chance > 0.58) {
        const caught = { name: enemy.name, type: enemy.type, level: 7 + Math.floor(Math.random() * 5) };
        state.party.push(caught);
        endBattle('captured');
        return;
      }
      log = `${enemy.name} broke free!`;
      break;
    }
    case 'run': {
      const escapedName = enemy.name;
      state.battle = null;
      battleScreen.classList.add('hidden');
      showMessage(`You escaped from ${escapedName}.`);
      updateHud();
      return;
    }
    default:
      break;
  }

  if (enemy.hp > 0) {
    const enemyDamage = 5 + Math.floor(Math.random() * 7);
    player.hp = Math.max(0, player.hp - enemyDamage);
    log += ` ${enemy.name} attacks for ${enemyDamage}.`;
    if (player.hp === 0) {
      player.hp = 35;
      battleLog.textContent = `${log} You retreat to town and recover some health.`;
      updateHud();
      endBattle('escaped');
      showMessage('You were escorted back to town and healed to 35 HP.');
      return;
    }
  } else {
    log += ` ${enemy.name} faints.`;
    battleLog.textContent = log;
    endBattle('defeated');
    return;
  }

  battleLog.textContent = log;
  enemyHpFill.style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
  updateHud();
}

function isCollidingWithObject(x, y, obj) {
  return x + state.player.w > obj.x && x < obj.x + obj.w && y + state.player.h > obj.y && y < obj.y + obj.h;
}

function movePlayer(dx, dy) {
  if (!isGameStarted || state.battle) return;
  const nextX = clamp(state.player.x + dx, 40, WORLD_WIDTH - 80);
  const nextY = clamp(state.player.y + dy, 40, WORLD_HEIGHT - 80);

  let blocked = false;
  for (const obj of state.worldObjects) {
    if (isCollidingWithObject(nextX, nextY, obj)) {
      blocked = true;
      break;
    }
  }

  if (!blocked) {
    state.player.x = nextX;
    state.player.y = nextY;
  }

  if (Math.abs(dx) > Math.abs(dy)) state.player.facing = dx < 0 ? 'left' : 'right';
  else if (dy !== 0) state.player.facing = dy < 0 ? 'up' : 'down';

  const targetWild = state.wildCreatures[Math.floor(Math.random() * state.wildCreatures.length)];
  const nearGrass = state.player.x > 900 && state.player.y > 250;
  if (nearGrass && Math.random() < 0.015) {
    startBattle(targetWild);
  }

}

function interact() {
  const guideNear = Math.abs(state.player.x - 220) < 80 && Math.abs(state.player.y - 430) < 80;
  const signNear = Math.abs(state.player.x - 330) < 80 && Math.abs(state.player.y - 335) < 80;

  if (guideNear) {
    if (state.questIndex === 0) {
      state.questIndex = 1;
      showMessage('Guide: Head into the grass and catch a creature.');
    } else if (state.questIndex === 3) {
      state.questIndex = 4;
      state.player.coins += 25;
      showMessage('Guide: Quest complete! Here is your 25-coin reward.');
    } else if (state.questIndex === 4) {
      showMessage('Guide: You are always welcome in Brightwood.');
    } else {
      showMessage('Guide: Keep exploring the wilds.');
    }
    updateHud();
    return;
  }

  if (signNear) {
    showMessage('Trail sign: Brightwood Meadow to the east.');
    return;
  }

  if (state.player.x > 900 && state.player.y > 250 && !state.battle) {
    const creature = state.wildCreatures[Math.floor(Math.random() * state.wildCreatures.length)];
    startBattle(creature);
  }
}

function update() {
  const moveSpeed = 4;
  if (keys.has('ArrowUp') || keys.has('w')) movePlayer(0, -moveSpeed);
  if (keys.has('ArrowDown') || keys.has('s')) movePlayer(0, moveSpeed);
  if (keys.has('ArrowLeft') || keys.has('a')) movePlayer(-moveSpeed, 0);
  if (keys.has('ArrowRight') || keys.has('d')) movePlayer(moveSpeed, 0);
}

function drawBackground() {
  ctx.fillStyle = '#a8d77f';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Town green and a winding trail lead from Brightwood to the meadow.
  ctx.fillStyle = '#b8df91';
  ctx.fillRect(0, 0, 850, WORLD_HEIGHT);
  ctx.fillStyle = '#c9ab72';
  ctx.beginPath();
  ctx.moveTo(285, 1200);
  ctx.lineTo(425, 1200);
  ctx.bezierCurveTo(520, 960, 450, 820, 560, 650);
  ctx.bezierCurveTo(690, 480, 720, 450, 850, 390);
  ctx.bezierCurveTo(1110, 270, 1260, 400, 1460, 510);
  ctx.bezierCurveTo(1620, 600, 1530, 800, 1710, 930);
  ctx.lineTo(1640, 1010);
  ctx.bezierCurveTo(1440, 870, 1510, 680, 1400, 590);
  ctx.bezierCurveTo(1210, 500, 1080, 390, 900, 500);
  ctx.bezierCurveTo(780, 560, 740, 650, 650, 730);
  ctx.bezierCurveTo(560, 850, 620, 990, 425, 1200);
  ctx.closePath();
  ctx.fill();

  // Meadow clearing and soft grass tufts.
  ctx.fillStyle = '#91c96e';
  ctx.fillRect(875, 235, 980, 775);
  ctx.fillStyle = '#7cb95f';
  for (let i = 0; i < 90; i++) {
    const x = 895 + ((i * 137) % 930);
    const y = 255 + ((i * 83) % 735);
    ctx.fillRect(x, y, 3, 10);
    ctx.fillRect(x + 5, y + 3, 3, 7);
  }

  // Quiet village square.
  ctx.fillStyle = '#c3df9e';
  ctx.fillRect(70, 355, 720, 360);
  ctx.fillStyle = '#d7bd84';
  ctx.fillRect(0, 485, 880, 78);
  ctx.fillRect(410, 280, 78, 650);

  // Houses.
  for (const house of state.worldObjects.filter((obj) => obj.type === 'house')) {
    ctx.fillStyle = '#8b5b43';
    ctx.fillRect(house.x - 12, house.y - 28, house.w + 24, 48);
    ctx.fillStyle = '#f4d18c';
    ctx.fillRect(house.x, house.y, house.w, house.h);
    ctx.fillStyle = '#a96f4a';
    ctx.fillRect(house.x + 78, house.y + 62, 38, 68);
    ctx.fillStyle = '#a9d8e4';
    ctx.fillRect(house.x + 22, house.y + 30, 42, 34);
    ctx.fillRect(house.x + 126, house.y + 30, 42, 34);
  }

  // Trees and landmarks.
  for (const obj of state.worldObjects) {
    if (obj.type === 'tree') {
      ctx.fillStyle = '#76523a';
      ctx.fillRect(obj.x + 32, obj.y + 44, 16, 34);
      ctx.fillStyle = '#438a50';
      ctx.beginPath();
      ctx.arc(obj.x + 40, obj.y + 34, 39, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#63a95c';
      ctx.beginPath();
      ctx.arc(obj.x + 28, obj.y + 24, 22, 0, Math.PI * 2);
      ctx.fill();
    } else if (obj.type === 'sign') {
      ctx.fillStyle = '#855735';
      ctx.fillRect(obj.x + 18, obj.y + 22, 8, 24);
      ctx.fillStyle = '#e7c77d';
      ctx.fillRect(obj.x, obj.y + 2, 44, 24);
      ctx.strokeStyle = '#785631';
      ctx.strokeRect(obj.x, obj.y + 2, 44, 24);
    } else if (obj.type === 'guide') {
      ctx.fillStyle = '#79543c';
      ctx.beginPath();
      ctx.arc(obj.x + 18, obj.y + 12, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2c65d';
      ctx.fillRect(obj.x + 4, obj.y + 16, 28, 20);
      ctx.fillStyle = '#fff0bd';
      ctx.fillRect(obj.x + 12, obj.y + 4, 12, 4);
    } else if (obj.type === 'portal') {
      ctx.fillStyle = '#6a6b93';
      ctx.fillRect(obj.x - 10, obj.y + 10, obj.w + 20, obj.h + 12);
      ctx.fillStyle = '#b5e8ff';
      ctx.beginPath();
      ctx.ellipse(obj.x + obj.w / 2, obj.y + obj.h / 2 + 8, 22, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(116, 196, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(obj.x + obj.w / 2, obj.y + obj.h / 2 + 8, 15, 23, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlayer() {
  const { x, y, w, h, color, facing } = state.player;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = '#1f2430';
  const eyeOffset = facing === 'left' ? -5 : 5;
  ctx.fillRect(x + 7 + eyeOffset, y + 6, 4, 4);
  ctx.fillRect(x + 17 + eyeOffset, y + 6, 4, 4);

  ctx.strokeStyle = '#4a3d2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + h);
  ctx.lineTo(x + w / 2, y + h + 12);
  ctx.stroke();

  if (facing === 'left') {
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x - 8, y + h / 2 + 6);
    ctx.stroke();
  } else if (facing === 'right') {
    ctx.beginPath();
    ctx.moveTo(x + w, y + h / 2);
    ctx.lineTo(x + w + 8, y + h / 2 + 6);
    ctx.stroke();
  } else if (facing === 'up') {
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2 - 6, y - 8);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + h);
    ctx.lineTo(x + w / 2 + 6, y + h + 8);
    ctx.stroke();
  }
}

function draw() {
  const cameraX = clamp(state.player.x + state.player.w / 2 - canvas.width / 2, 0, WORLD_WIDTH - canvas.width);
  const cameraY = clamp(state.player.y + state.player.h / 2 - canvas.height / 2, 0, WORLD_HEIGHT - canvas.height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-cameraX, -cameraY);
  drawBackground();
  drawPlayer();
  ctx.restore();
}

function tick(timestamp) {
  const delta = timestamp - lastTimestamp;
  if (delta > 0) {
    update();
    draw();
    lastTimestamp = timestamp;
  }
  requestAnimationFrame(tick);
}

function beginGame() {
  isGameStarted = true;
  startScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  touchControls.classList.remove('hidden');
  updateHud();
  showMessage('Welcome to Brightwood!');
}

startBtn.addEventListener('click', beginGame);

document.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.add(key);

  if (key === 'e' || key === 'Enter') {
    interact();
  }

  if (key === ' ') {
    if (state.battle) {
      doBattleAction('attack');
    }
  }
});

document.addEventListener('keyup', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    doBattleAction(button.dataset.action);
  });
});

document.querySelectorAll('[data-move]').forEach((button) => {
  button.addEventListener('click', () => {
    const direction = button.dataset.move;
    if (direction === 'up') movePlayer(0, -8);
    if (direction === 'down') movePlayer(0, 8);
    if (direction === 'left') movePlayer(-8, 0);
    if (direction === 'right') movePlayer(8, 0);
  });
});

document.getElementById('touch-action').addEventListener('click', interact);

updateHud();
requestAnimationFrame(tick);
