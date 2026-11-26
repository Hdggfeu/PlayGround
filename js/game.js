import {
  GRID,
  SAVE_KEY,
  BUILDINGS,
  SHOP_CATEGORIES,
  TROOPS,
  TROOP_ORDER,
  MISSIONS,
  OPPONENT_NAMES,
  CLAN_MEMBERS,
  MISSION_ICONS,
  clone,
  formatNumber,
  formatCompact,
  formatTime,
  buildingUpgradeCost,
  upgradeSeconds,
  buildSeconds,
  getStorageCaps,
  getArmyCap,
  armyHousing,
  xpForLevel,
  makeSnoxId,
  seededRandom,
  makeDefaultState,
  ensureStateShape,
} from "./data.js";
import {
  clamp,
  drawBuilding,
  drawTree,
  drawPine,
  drawRock,
  drawBush,
  drawFlowers,
  drawPond,
  drawTorch,
  drawSelection,
  drawGhost,
  drawTroop,
  drawAvatar,
  renderThumb,
  drawCrest,
  diamond,
  roundRect,
} from "./art.js";

const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const canvas = $("game-canvas");
const ctx = canvas.getContext("2d");
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const now = () => Date.now();

/* ── Sound ───────────────────────────────────────────────────────── */
class GameAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = null;
  }
  ensure() {
    if (!this.enabled) return false;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.14;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return true;
  }
  tone(freq, duration, type = "sine", volume = 0.3, delay = 0, slide = 0) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }
  noise(duration, volume = 0.15, delay = 0) {
    if (!this.ensure()) return;
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    gain.gain.value = volume;
    src.buffer = buffer;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(this.ctx.currentTime + delay);
  }
  play(name) {
    if (!this.enabled) return;
    switch (name) {
      case "click": this.tone(520, 0.055, "triangle", 0.18, 0, -80); break;
      case "open": this.tone(390, 0.08, "sine", 0.16, 0, 90); this.tone(620, 0.08, "sine", 0.1, 0.04); break;
      case "close": this.tone(420, 0.06, "sine", 0.12, 0, -70); break;
      case "coin":
        this.tone(900, 0.08, "triangle", 0.2);
        this.tone(1320, 0.11, "triangle", 0.15, 0.055);
        break;
      case "elixir":
        this.tone(620, 0.11, "sine", 0.18, 0, 220);
        this.tone(980, 0.12, "sine", 0.1, 0.06);
        break;
      case "build":
        this.noise(0.12, 0.22);
        this.tone(120, 0.14, "square", 0.1, 0, -30);
        break;
      case "upgrade":
        this.tone(440, 0.1, "triangle", 0.16);
        this.tone(660, 0.12, "triangle", 0.14, 0.08);
        this.tone(880, 0.2, "triangle", 0.11, 0.16);
        break;
      case "error": this.tone(160, 0.13, "sawtooth", 0.11, 0, -30); break;
      case "attack":
        this.noise(0.1, 0.2);
        this.tone(180, 0.12, "sawtooth", 0.13, 0, -70);
        break;
      case "cannon": this.noise(0.2, 0.3); this.tone(80, 0.2, "square", 0.12, 0, -30); break;
      case "hit": this.noise(0.06, 0.12); this.tone(260, 0.05, "square", 0.06, 0, -50); break;
      case "win":
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, "triangle", 0.18, i * 0.11));
        break;
      case "lose":
        [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, "sine", 0.14, i * 0.14, -20));
        break;
      default: break;
    }
  }
}

const audio = new GameAudio();

/* ── State ───────────────────────────────────────────────────────── */
function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return makeDefaultState();
    return ensureStateShape(JSON.parse(raw));
  } catch {
    return makeDefaultState();
  }
}

const G = {
  state: loadState(),
  mode: "village",
  time: 0,
  lastFrame: 0,
  uiAccum: 0,
  saveAccum: 0,
  view: { w: 0, h: 0, dpr: 1, tw: 60, th: 30, originX: 0, originY: 0, scale: 1 },
  cam: { zoom: 1, panX: 0, panY: 0, defaultZoom: 1 },
  pointer: { down: false, dragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: 0, id: null },
  hoverTile: null,
  hoverScreen: null,
  selected: null,
  build: null,
  sheet: null,
  modal: null,
  bubbles: [],
  battle: null,
  opponents: null,
  lastPointerType: "mouse",
  tutorialDone: false,
  sheetTimer: 0,
  pendingToasts: [],
  shake: 0,
  decorations: [],
  blockedTiles: new Set(),
  pathTiles: new Set(),
  grassPatches: [],
  borderRocks: [],
  enemyCache: new Map(),
};

G.state.sound = G.state.sound !== false;
audio.enabled = G.state.sound;

/* ── Persistence & offline economy ───────────────────────────────── */
function saveState() {
  G.state.lastSaved = now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(G.state));
  } catch (error) {
    console.warn("Sauvegarde impossible", error);
  }
}

function applyOfflineProgress() {
  const last = Number(G.state.lastSaved) || now();
  const elapsed = clamp((now() - last) / 1000, 0, 8 * 3600);
  if (elapsed < 20) return;
  let gold = 0;
  let elixir = 0;
  for (const b of G.state.buildings) {
    const def = BUILDINGS[b.type];
    if (!def?.resource || b.built === false) continue;
    const cap = def.capacity * b.level;
    const amount = Math.min(cap - (b.stored || 0), def.rate * b.level * elapsed);
    if (amount > 0) {
      b.stored = (b.stored || 0) + amount;
      if (def.resource === "gold") gold += amount;
      else elixir += amount;
    }
    b.lastTick = now();
  }
  if (gold + elixir > 30) {
    setTimeout(() => showToast(`Ton royaume a produit ${formatNumber(gold)} or et ${formatNumber(elixir)} élixir pendant ton absence.`, "success", "coin"), 900);
  }
}

function completeDueConstruction(notify = true) {
  const ts = now();
  let changed = false;
  for (const b of G.state.buildings) {
    if (!b.construction) continue;
    if (b.construction.endsAt <= ts) {
      const kind = b.construction.kind;
      if (kind === "upgrade") b.level = Math.min(BUILDINGS[b.type].maxLevel, b.level + 1);
      b.built = true;
      delete b.construction;
      changed = true;
      if (notify) {
        showToast(`${BUILDINGS[b.type].name} ${kind === "upgrade" ? `niveau ${b.level}` : "terminé"} !`, "success", "hammer");
        audio.play("upgrade");
        if (kind === "upgrade") {
          G.state.missions.upgrade = (G.state.missions.upgrade || 0) + 1;
          addXp(18);
        }
      }
    }
  }
  if (changed) {
    refreshSheetIfOpen();
    updateHUD();
    saveState();
  }
  return changed;
}

function getTotalBuilders() {
  return 2 + G.state.buildings.filter((b) => b.type === "hut" && b.built !== false).length;
}

function getActiveBuilders() {
  return G.state.buildings.filter((b) => b.construction).length;
}

function getFreeBuilders() {
  return Math.max(0, getTotalBuilders() - getActiveBuilders());
}

function getTownhallLevel() {
  return G.state.buildings.find((b) => b.type === "townhall")?.level || 1;
}

function addResource(resource, amount) {
  const caps = getStorageCaps(G.state);
  const current = G.state.resources[resource] || 0;
  const max = caps[resource] || Infinity;
  const gained = Math.max(0, Math.min(amount, max - current));
  G.state.resources[resource] = Math.max(0, current + gained);
  return gained;
}

function spendResource(resource, amount) {
  if (amount <= 0) return true;
  if ((G.state.resources[resource] || 0) < amount) return false;
  G.state.resources[resource] -= amount;
  return true;
}

function spendCost(cost) {
  if ((cost.gold || 0) > G.state.resources.gold) return false;
  if ((cost.elixir || 0) > G.state.resources.elixir) return false;
  if ((cost.gems || 0) > G.state.resources.gems) return false;
  G.state.resources.gold -= cost.gold || 0;
  G.state.resources.elixir -= cost.elixir || 0;
  G.state.resources.gems -= cost.gems || 0;
  return true;
}

function addXp(amount) {
  G.state.profile.xp = (G.state.profile.xp || 0) + amount;
  let threshold = xpForLevel(G.state.profile.level);
  while (G.state.profile.xp >= threshold) {
    G.state.profile.xp -= threshold;
    G.state.profile.level += 1;
    threshold = xpForLevel(G.state.profile.level);
    showToast(`Niveau ${G.state.profile.level} atteint ! Ton royaume grandit.`, "success", "star");
    burstConfetti(24);
  }
}

function addTrophies(amount) {
  G.state.profile.trophies = Math.max(0, (G.state.profile.trophies || 0) + amount);
}

function claimableMissions() {
  return MISSIONS.filter((m) => !G.state.missions.claimed.includes(m.id) && (G.state.missions[m.id] || 0) >= m.target);
}

/* ── DOM helpers ─────────────────────────────────────────────────── */
function showToast(message, tone = "", iconName = "info") {
  const root = $("toastRoot");
  const node = document.createElement("div");
  node.className = `toast ${tone}`;
  node.innerHTML = `${icon(iconName)}<span>${escapeHtml(message)}</span>`;
  root.appendChild(node);
  setTimeout(() => {
    node.classList.add("out");
    setTimeout(() => node.remove(), 320);
  }, 3300);
}

function burstConfetti(count = 26) {
  const layer = $("fxLayer");
  const colors = ["#ffd35f", "#69e7ef", "#ff8b72", "#9cf3c7", "#c58bff"];
  for (let i = 0; i < count; i++) {
    const p = document.createElement("i");
    p.className = "confetti";
    p.style.left = `${45 + Math.random() * 10}%`;
    p.style.top = `${34 + Math.random() * 10}%`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty("--dx", `${(Math.random() - 0.5) * 460}px`);
    p.style.setProperty("--dy", `${160 + Math.random() * 330}px`);
    p.style.setProperty("--rot", `${Math.random() * 900 - 450}deg`);
    p.style.animationDelay = `${Math.random() * 0.18}s`;
    layer.appendChild(p);
    setTimeout(() => p.remove(), 2200);
  }
}

function coinFly(screenX, screenY, resource = "gold") {
  const layer = $("fxLayer");
  const node = document.createElement("span");
  node.className = "coin-fly";
  node.innerHTML = icon(resource === "elixir" ? "drop" : "coin");
  if (resource === "elixir") node.style.color = "#e27dff";
  node.style.left = `${screenX - 12}px`;
  node.style.top = `${screenY - 12}px`;
  const target = resource === "elixir" ? $("elixirBtn") : $("goldBtn");
  const rect = target.getBoundingClientRect();
  node.style.setProperty("--dx", `${rect.left + rect.width / 2 - screenX}px`);
  node.style.setProperty("--dy", `${rect.top + rect.height / 2 - screenY}px`);
  layer.appendChild(node);
  setTimeout(() => node.remove(), 900);
}

function vibrate(ms = 10) {
  if (navigator.vibrate && !motionQuery.matches) navigator.vibrate(ms);
}

/* ── View and camera ─────────────────────────────────────────────── */
function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const mobile = w < 700;
  let tw;
  if (mobile) tw = clamp(w / 9.2, 38, 58);
  else tw = Math.max(32, Math.min((w - 54) / 20, (h - 160) / 10));
  G.view = {
    w, h, dpr,
    tw,
    th: tw / 2,
    originX: w / 2,
    originY: (h - 10 * tw) / 2 + 2,
    scale: tw / 64,
  };
  G.cam.defaultZoom = 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!G._resized) {
    G._resized = true;
    applyCameraTransform(ctx);
  }
}

function applyCameraTransform(context = ctx) {
  const { w, h } = G.view;
  const cx = w / 2;
  const cy = h / 2;
  context.translate(cx + G.cam.panX, cy + G.cam.panY);
  context.scale(G.cam.zoom, G.cam.zoom);
  context.translate(-cx, -cy);
}

function tilePoint(x, y) {
  const { tw, th, originX, originY } = G.view;
  return {
    x: originX + (x - y) * tw / 2,
    y: originY + (x + y + 1) * th / 2,
  };
}

function worldToScreen(x, y) {
  const base = tilePoint(x, y);
  const { w, h } = G.view;
  return {
    x: (base.x - w / 2) * G.cam.zoom + w / 2 + G.cam.panX,
    y: (base.y - h / 2) * G.cam.zoom + h / 2 + G.cam.panY,
  };
}

function screenToWorld(px, py) {
  const { w, h, tw, th, originX, originY } = G.view;
  const bx = (px - w / 2 - G.cam.panX) / G.cam.zoom + w / 2;
  const by = (py - h / 2 - G.cam.panY) / G.cam.zoom + h / 2;
  const u = (bx - originX) / (tw / 2);
  const v = (by - originY) / (th / 2) - 1;
  return { x: (u + v) / 2, y: (v - u) / 2 };
}

function buildingCenter(b) {
  const def = BUILDINGS[b.type];
  return {
    x: b.x + (def.size[0] - 1) / 2,
    y: b.y + (def.size[1] - 1) / 2,
  };
}

function buildingScreen(b) {
  const c = buildingCenter(b);
  const p = worldToScreen(c.x, c.y);
  const s = G.view.scale * G.cam.zoom;
  return { x: p.x, y: p.y, s };
}

function screenToTile(px, py) {
  const p = screenToWorld(px, py);
  return { x: Math.round(p.x), y: Math.round(p.y), fx: p.x, fy: p.y };
}

/* ── World decoration / layout data ─────────────────────────────── */
function buildPathTiles() {
  G.pathTiles = new Set();
  const add = (x, y) => G.pathTiles.add(`${x},${y}`);
  for (let y = 5; y <= 14; y++) {
    if (y !== 8 && y !== 9 && y !== 10) {
      add(7, y);
      add(11, y);
    }
  }
  for (let x = 7; x <= 12; x++) {
    if (x !== 8 && x !== 9 && x !== 10) {
      add(x, 7);
      add(x, 11);
    }
  }
  // Avenue from the lower gate to the camp
  for (let y = 13; y <= 15; y++) add(9, y);
  for (let x = 5; x <= 8; x++) add(x, 10);
  for (let x = 11; x <= 14; x++) add(x, 10);
  add(8, 6); add(9, 6); add(10, 6);
  add(8, 12); add(9, 12); add(10, 12);
}

function buildDecorations() {
  G.decorations = [
    { kind: "tree", x: 1.8, y: 2.2, variant: 0, tone: 0 },
    { kind: "tree", x: 17.6, y: 2.1, variant: 1, tone: 1 },
    { kind: "pine", x: 2.4, y: 5.8, variant: 1 },
    { kind: "pine", x: 17.3, y: 6.5, variant: 0 },
    { kind: "pine", x: 1.7, y: 16.3, variant: 2 },
    { kind: "tree", x: 17.6, y: 15.8, variant: 2, tone: 2 },
    { kind: "bush", x: 3.2, y: 2.5, variant: 1 },
    { kind: "bush", x: 15.4, y: 2.4, variant: 0 },
    { kind: "bush", x: 2.3, y: 11.8, variant: 2 },
    { kind: "bush", x: 17.4, y: 11.2, variant: 1 },
    { kind: "rock", x: 3.2, y: 15.3, variant: 0 },
    { kind: "rock", x: 15.8, y: 3.5, variant: 1 },
    { kind: "rock", x: 16.9, y: 9.6, variant: 2 },
    { kind: "flowers", x: 3.6, y: 6.5, variant: 1 },
    { kind: "flowers", x: 15.8, y: 12.7, variant: 2 },
    { kind: "flowers", x: 6.4, y: 2.3, variant: 3 },
    { kind: "flowers", x: 13.2, y: 16.7, variant: 0 },
    { kind: "torch", x: 7.1, y: 6.4 },
    { kind: "torch", x: 11.9, y: 13.5 },
    { kind: "torch", x: 7.2, y: 13.4 },
    { kind: "torch", x: 12.8, y: 6.3 },
  ];
  G.blockedTiles = new Set();
  // Pond at the south-east corner.
  for (const [x, y] of [[16, 16], [17, 16], [16, 17], [17, 17]]) G.blockedTiles.add(`${x},${y}`);
  // Keep the outer tree line free of giant buildings.
  for (const [x, y] of [[0, 0], [0, 19], [19, 0], [19, 19]]) G.blockedTiles.add(`${x},${y}`);
  G.grassPatches = [];
  const rand = seededRandom(90210);
  for (let i = 0; i < 120; i++) {
    G.grassPatches.push({
      x: rand() * GRID,
      y: rand() * GRID,
      r: 0.04 + rand() * 0.09,
      tone: rand() > 0.5 ? "#7bd46e" : "#4fae59",
      a: 0.18 + rand() * 0.28,
    });
  }
  G.borderRocks = [];
  for (let i = 0; i < 32; i++) {
    const side = Math.floor(rand() * 4);
    let x, y;
    if (side === 0) { x = rand() * GRID; y = -0.35 - rand() * 0.7; }
    else if (side === 1) { x = rand() * GRID; y = GRID - 0.2 + rand() * 0.7; }
    else if (side === 2) { x = -0.35 - rand() * 0.7; y = rand() * GRID; }
    else { x = GRID - 0.2 + rand() * 0.7; y = rand() * GRID; }
    G.borderRocks.push({ x, y, r: 0.6 + rand() * 1.5, tone: rand() });
  }
}

/* ── HUD updates ─────────────────────────────────────────────────── */
let lastHud = {};
function setText(id, value) {
  if (lastHud[id] === value) return;
  lastHud[id] = value;
  const node = $(id);
  if (node) node.textContent = value;
}

function updateHUD(force = false) {
  const caps = getStorageCaps(G.state);
  const p = G.state.profile;
  setText("playerName", p.name);
  setText("levelBadge", String(p.level));
  setText("goldAmount", formatCompact(G.state.resources.gold));
  setText("elixirAmount", formatCompact(G.state.resources.elixir));
  setText("gemsAmount", formatNumber(G.state.resources.gems));
  setText("goldCap", `/ ${formatCompact(caps.gold)}`);
  setText("elixirCap", `/ ${formatCompact(caps.elixir)}`);
  setText("trophyAmount", formatNumber(p.trophies));
  setText("realmName", p.realm);
  const xp = Math.max(0, Math.min(1, (p.xp || 0) / xpForLevel(p.level)));
  const fill = $("xpFill");
  if (fill) fill.style.width = `${Math.round(xp * 100)}%`;
  const free = getFreeBuilders();
  setText("buildersFree", String(free));
  const pulse = $("builderPulse");
  if (pulse) pulse.style.background = free > 0 ? "#6ef5b4" : "#ffb15e";
  const soundBtn = $("soundBtn");
  if (soundBtn) {
    soundBtn.innerHTML = icon(audio.enabled ? "sound-on" : "sound-off");
    soundBtn.setAttribute("aria-label", audio.enabled ? "Couper le son" : "Activer le son");
  }
  renderQuests();
}

function renderQuests() {
  const list = $("questList");
  if (!list) return;
  const claimed = new Set(G.state.missions.claimed || []);
  let done = 0;
  list.innerHTML = MISSIONS.map((m) => {
    const progress = Math.min(m.target, G.state.missions[m.id] || 0);
    const complete = progress >= m.target;
    const isClaimed = claimed.has(m.id);
    if (complete) done++;
    const pct = Math.round((progress / m.target) * 100);
    return `
      <button class="quest-item ${complete ? "done" : ""} ${isClaimed ? "claimed" : ""}" data-action="quest" data-id="${m.id}" ${isClaimed ? "disabled" : ""}>
        <span class="quest-check">${isClaimed ? icon("check") : complete ? icon("check") : icon(MISSION_ICONS[m.icon])}</span>
        <span class="quest-body">
          <strong>${isClaimed ? "Objectif terminé" : escapeHtml(m.title)}</strong>
          <span class="quest-progress"><i style="width:${isClaimed ? 100 : pct}%"></i></span>
          <small>${isClaimed ? "Récompense récupérée" : complete ? "Récompense prête !" : `${progress}/${m.target} · ${escapeHtml(m.hint)}`}</small>
        </span>
        <span class="quest-reward">${isClaimed ? "" : `+${m.reward} ${icon("gem")}`}</span>
      </button>`;
  }).join("");
  setText("questCount", `${done}/${MISSIONS.length}`);
  const card = $("questCard");
  if (card) card.dataset.complete = String(done === MISSIONS.length);
}

function updateBuilderChip() {
  const free = getFreeBuilders();
  setText("buildersFree", String(free));
  const pulse = $("builderPulse");
  if (pulse) pulse.style.background = free > 0 ? "#6ef5b4" : "#ffb15e";
}

/* ── Sheet and modal ─────────────────────────────────────────────── */
function openSheet(html, { keepNav = false } = {}) {
  const sheet = $("sheet");
  $("sheetContent").innerHTML = html;
  $("scrim").hidden = false;
  sheet.hidden = false;
  G.sheet = html;
  audio.play("open");
  if (!keepNav) {
    // The active tab remains the section that opened the sheet.
  }
  setTimeout(() => drawDynamicCanvases(), 20);
}

function closeSheet(silent = false) {
  if (!G.sheet) return;
  $("sheet").hidden = true;
  $("scrim").hidden = true;
  $("sheetContent").innerHTML = "";
  G.sheet = null;
  if (!silent) audio.play("close");
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === "village"));
}

function refreshSheetIfOpen() {
  if (!G.sheet) return;
  const opener = G.sheetOpener;
  if (opener === "building" && G.selected) openBuildingSheet(G.selected, true);
  else if (opener === "army") openArmySheet(true);
  else if (opener === "builders") openBuildersSheet(true);
}

function openModal(html) {
  $("modalContent").innerHTML = html;
  $("modalRoot").hidden = false;
  G.modal = html;
  audio.play("open");
  setTimeout(() => drawDynamicCanvases(), 20);
}

function closeModal(silent = false) {
  if (!G.modal) return;
  $("modalRoot").hidden = true;
  $("modalContent").innerHTML = "";
  G.modal = null;
  if (!silent) audio.play("close");
}

function drawDynamicCanvases() {
  document.querySelectorAll("canvas[data-thumb]").forEach((node) => {
    if (node.dataset.rendered === "1") return;
    node.dataset.rendered = "1";
    renderThumb(node, node.dataset.thumb, Number(node.dataset.level || 1), {
      scale: Number(node.dataset.scale || 0) || undefined,
      variant: Number(node.dataset.variant || 0),
    });
  });
  document.querySelectorAll("canvas[data-avatar]").forEach((node) => {
    if (node.dataset.rendered === "1") return;
    node.dataset.rendered = "1";
    drawAvatar(node, G.state.profile);
  });
  document.querySelectorAll("canvas[data-troop]").forEach((node) => {
    if (node.dataset.rendered === "1") return;
    node.dataset.rendered = "1";
    drawTroopThumb(node, node.dataset.troop);
  });
  document.querySelectorAll("canvas[data-base-preview]").forEach((node) => {
    if (node.dataset.rendered === "1") return;
    node.dataset.rendered = "1";
    const idx = Number(node.dataset.basePreview);
    const opponent = G.opponents?.[idx];
    if (opponent) renderBasePreview(node, opponent.buildings);
  });
}

function drawTroopThumb(node, type) {
  const c = node.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = node.clientWidth || 90;
  const h = node.clientHeight || 90;
  node.width = Math.round(w * dpr);
  node.height = Math.round(h * dpr);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  const s = Math.min(w, h) / 80;
  drawTroop(c, type, w / 2, h * 0.9, s * 1.35, G.time, { phase: type.length });
}

/* ── UI icon button wiring ───────────────────────────────────────── */
function updateNav(view) {
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === view));
}

/* ── Rendering: world ────────────────────────────────────────────── */
function drawIsland(context, t, opts = {}) {
  const { tw, th, originX, originY } = G.view;
  const W = GRID * tw;
  const H = GRID * th;
  const T = { x: originX, y: originY };
  const R = { x: originX + W / 2, y: originY + H / 2 };
  const B = { x: originX, y: originY + H };
  const L = { x: originX - W / 2, y: originY + H / 2 };
  const cliff = 34 * G.view.scale;
  const enemy = G.mode === "battle";

  // Under-island glow
  context.save();
  const glow = context.createRadialGradient(originX, originY + H / 2, 10, originX, originY + H / 2, W * 0.58);
  glow.addColorStop(0, enemy ? "rgba(255,126,92,.16)" : "rgba(94,234,214,.16)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = glow;
  context.beginPath();
  context.ellipse(originX, originY + H / 2, W * 0.58, H * 0.6, 0, 0, TAU);
  context.fill();
  context.restore();

  // Shadow far below
  context.save();
  context.globalAlpha = 0.34;
  context.fillStyle = "#041022";
  context.beginPath();
  context.ellipse(originX + 12, B.y + cliff + 52 * G.view.scale, W * 0.44, H * 0.22, 0, 0, TAU);
  context.fill();
  context.restore();

  // Cliff sides
  const down = (p, d) => ({ x: p.x, y: p.y + d });
  const T2 = down(T, cliff);
  const R2 = down(R, cliff);
  const B2 = down(B, cliff);
  const L2 = down(L, cliff);
  const cliffGrad = context.createLinearGradient(0, originY + H * 0.45, 0, B2.y);
  cliffGrad.addColorStop(0, "#7b6e50");
  cliffGrad.addColorStop(0.35, "#5d5945");
  cliffGrad.addColorStop(0.75, "#3c453c");
  cliffGrad.addColorStop(1, "#242f31");
  context.fillStyle = cliffGrad;
  context.beginPath();
  context.moveTo(L.x, L.y);
  context.lineTo(B.x, B.y);
  context.lineTo(B2.x, B2.y);
  context.lineTo(L2.x, L2.y);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(B.x, B.y);
  context.lineTo(R.x, R.y);
  context.lineTo(R2.x, R2.y);
  context.lineTo(B2.x, B2.y);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(T.x, T.y);
  context.lineTo(R.x, R.y);
  context.lineTo(R2.x, R2.y);
  context.lineTo(T2.x, T2.y);
  context.closePath();
  context.fillStyle = "rgba(48,58,50,.65)";
  context.fill();
  context.beginPath();
  context.moveTo(T.x, T.y);
  context.lineTo(L.x, L.y);
  context.lineTo(L2.x, L2.y);
  context.lineTo(T2.x, T2.y);
  context.closePath();
  context.fillStyle = "rgba(56,66,54,.55)";
  context.fill();

  // Rock strata
  context.save();
  context.globalAlpha = 0.25;
  context.strokeStyle = "#1d2929";
  context.lineWidth = 1.2;
  for (let i = 1; i <= 4; i++) {
    const d = (cliff / 5) * i;
    context.beginPath();
    context.moveTo(L.x + 8, L.y + d + 4);
    context.lineTo(B.x, B.y + d);
    context.lineTo(R.x - 8, R.y + d + 2);
    context.stroke();
  }
  context.restore();

  // Hanging roots / vines
  context.strokeStyle = "rgba(91,136,79,.55)";
  context.lineWidth = 1.4;
  for (let i = 0; i < 7; i++) {
    const p = i / 6;
    const x = L.x + (B.x - L.x) * p + (i % 2 ? 8 : -3);
    const y = L.y + (B.y - L.y) * p + 8;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(x + 4, y + 14, x - 2, y + 24 + (i % 3) * 5);
    context.stroke();
  }

  // Ground
  const g = context.createLinearGradient(originX - W / 2, originY, originX + W / 2, originY + H);
  if (enemy) {
    g.addColorStop(0, "#7dbd63");
    g.addColorStop(0.45, "#5fae57");
    g.addColorStop(1, "#428f4d");
  } else {
    g.addColorStop(0, "#86d877");
    g.addColorStop(0.42, "#65c562");
    g.addColorStop(1, "#46a957");
  }
  context.fillStyle = g;
  context.beginPath();
  context.moveTo(T.x, T.y);
  context.lineTo(R.x, R.y);
  context.lineTo(B.x, B.y);
  context.lineTo(L.x, L.y);
  context.closePath();
  context.fill();

  // Soft edge
  context.strokeStyle = "rgba(29,97,57,.5)";
  context.lineWidth = 4;
  context.stroke();

  // Grass texture
  context.save();
  for (const patch of G.grassPatches) {
    const p = tilePoint(patch.x, patch.y);
    context.globalAlpha = patch.a;
    context.fillStyle = patch.tone;
    context.beginPath();
    context.ellipse(p.x, p.y, patch.r * tw, patch.r * th, 0, 0, TAU);
    context.fill();
  }
  context.restore();

  // Border rocks
  context.save();
  for (const rock of G.borderRocks) {
    const p = tilePoint(rock.x, rock.y);
    context.fillStyle = rock.tone > 0.5 ? "#6f7e70" : "#596d61";
    context.globalAlpha = 0.9;
    context.beginPath();
    context.ellipse(p.x, p.y, rock.r * 8 * G.view.scale, rock.r * 4 * G.view.scale, 0.2, 0, TAU);
    context.fill();
  }
  context.restore();

  // Stone paths
  context.save();
  for (const key of G.pathTiles) {
    const [x, y] = key.split(",").map(Number);
    const p = tilePoint(x, y);
    const w = tw * 0.93;
    const h = th * 0.93;
    context.fillStyle = "rgba(198,186,146,.82)";
    diamond(context, p.x, p.y, w, h);
    context.fill();
    context.strokeStyle = "rgba(117,103,70,.22)";
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = "rgba(255,245,210,.12)";
    diamond(context, p.x, p.y - 1, w * 0.62, h * 0.62);
    context.fill();
  }
  context.restore();

  // Pond
  const pond = tilePoint(16.9, 16.9);
  drawPond(context, pond.x, pond.y, tw * 2.7, th * 2.7, t);

  // Pond reeds
  context.save();
  context.strokeStyle = "#4a8a55";
  context.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const rx = pond.x + (i - 2) * 10 * G.view.scale;
    const ry = pond.y + th * 0.55;
    context.beginPath();
    context.moveTo(rx, ry);
    context.quadraticCurveTo(rx + 2, ry - 12 * G.view.scale, rx + (i % 2 ? 4 : -2), ry - 19 * G.view.scale);
    context.stroke();
  }
  context.restore();

  // subtle tile seams in build mode
  if (G.build) {
    context.save();
    context.globalAlpha = 0.12;
    context.strokeStyle = "#f8f0c6";
    context.lineWidth = 1;
    for (let x = 0; x <= GRID; x++) {
      const a = tilePoint(x - 0.5, -0.5);
      const b = tilePoint(x - 0.5, GRID - 0.5);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }
    for (let y = 0; y <= GRID; y++) {
      const a = tilePoint(-0.5, y - 0.5);
      const b = tilePoint(GRID - 0.5, y - 0.5);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }
    context.restore();
  }
}

function drawVillageWorld(context, t) {
  drawIsland(context, t);
  const items = [];
  for (const b of G.state.buildings) {
    const def = BUILDINGS[b.type];
    const depth = b.x + b.y + (def.size[0] + def.size[1]) * 0.35;
    items.push({ kind: "building", depth, b });
  }
  for (const d of G.decorations) {
    items.push({ kind: d.kind, depth: d.x + d.y, d });
  }
  items.sort((a, b) => a.depth - b.depth);

  const s = G.view.scale;
  for (const item of items) {
    if (item.kind === "building") {
      const b = item.b;
      const def = BUILDINGS[b.type];
      const c = buildingCenter(b);
      const p = tilePoint(c.x, c.y);
      const isSelected = G.selected === b;
      if (isSelected) {
        const w = def.size[0] * G.view.tw * 0.98;
        const h = def.size[1] * G.view.th * 0.98;
        drawSelection(context, p.x, p.y, w, h, "#ffd35f", t);
      }
      const constructing = b.construction;
      const alpha = b.built === false ? 0.48 : 1;
      drawBuilding(context, b.type, b.level, p.x, p.y, s, t, { alpha, variant: b.x + b.y });
      if (constructing) drawScaffold(context, p.x, p.y, def, s, t);
    } else {
      drawDecoration(context, item.kind, item.d, t);
    }
  }

  if (G.build?.x != null) {
    const def = BUILDINGS[G.build.type];
    const c = { x: G.build.x + (def.size[0] - 1) / 2, y: G.build.y + (def.size[1] - 1) / 2 };
    const p = tilePoint(c.x, c.y);
    const w = def.size[0] * G.view.tw;
    const h = def.size[1] * G.view.th;
    drawGhost(context, p.x, p.y, w, h, G.build.valid, t);
    drawBuilding(context, G.build.type, 1, p.x, p.y, s, t, { alpha: 0.55, variant: 2 });
  }
}

function drawDecoration(context, kind, d, t) {
  const p = tilePoint(d.x, d.y);
  const s = G.view.scale;
  if (kind === "tree") drawTree(context, p.x, p.y, s, t, d.variant, d.tone);
  else if (kind === "pine") drawPine(context, p.x, p.y, s, t, d.variant);
  else if (kind === "rock") drawRock(context, p.x, p.y, s, t, d.variant);
  else if (kind === "bush") drawBush(context, p.x, p.y, s, t, d.variant);
  else if (kind === "flowers") drawFlowers(context, p.x, p.y, s, t, d.variant);
  else if (kind === "torch") drawTorch(context, p.x, p.y, s, t);
}

function drawScaffold(context, x, y, def, s, t) {
  const w = def.size[0] * 42 * s;
  const h = def.size[1] * 21 * s;
  context.save();
  context.strokeStyle = "rgba(238,188,105,.6)";
  context.lineWidth = 1.4 * s;
  context.setLineDash([4, 4]);
  for (let i = -1; i <= 1; i += 2) {
    context.beginPath();
    context.moveTo(x + i * w * 0.62, y + 2);
    context.lineTo(x + i * w * 0.42, y - 48 * s);
    context.stroke();
  }
  context.beginPath();
  context.moveTo(x - w * 0.58, y - 26 * s);
  context.lineTo(x + w * 0.58, y - 26 * s);
  context.stroke();
  context.restore();
}

/* ── Rendering: overlays and battle ──────────────────────────────── */
function drawBubbles(t) {
  G.bubbles = [];
  if (G.mode !== "village") return;
  for (const b of G.state.buildings) {
    const def = BUILDINGS[b.type];
    if (!def?.resource || b.built === false || b.construction) continue;
    const stored = Math.floor(b.stored || 0);
    if (stored < 12) continue;
    const c = buildingCenter(b);
    const p = worldToScreen(c.x, c.y);
    const bob = Math.sin(t * 2 + b.x * 0.7 + b.y) * 3;
    const sx = p.x;
    const sy = p.y - 72 * G.view.scale * G.cam.zoom + bob;
    const isGold = def.resource === "gold";
    const color = isGold ? "#ffd35e" : "#df7cff";
    const dark = isGold ? "#6b4711" : "#4d1c66";
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = "rgba(4,12,27,.28)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 16, 5, 0, 0, TAU);
    ctx.fill();
    const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, 20);
    g.addColorStop(0, isGold ? "#fff4bd" : "#f8d7ff");
    g.addColorStop(0.45, color);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = isGold ? "#6b430c" : "#49155f";
    if (isGold) {
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ffe37e";
      ctx.beginPath();
      ctx.arc(-1, -1, 6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#b47a19";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, TAU);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.bezierCurveTo(8, -2, 7, 6, 0, 9);
      ctx.bezierCurveTo(-7, 6, -8, -2, 0, -10);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.38)";
      ctx.beginPath();
      ctx.ellipse(-3, -2, 2.2, 4, -0.5, 0, TAU);
      ctx.fill();
    }
    // amount tag
    const label = formatCompact(stored);
    ctx.font = '800 10px "Nunito", sans-serif';
    const textW = ctx.measureText(label).width + 12;
    ctx.fillStyle = "rgba(7,18,41,.9)";
    roundRect(ctx, -textW / 2, 17, textW, 15, 7);
    ctx.fill();
    ctx.strokeStyle = isGold ? "rgba(255,213,100,.35)" : "rgba(222,123,255,.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = isGold ? "#ffe7a1" : "#f1c7ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 24.5);
    ctx.restore();
    G.bubbles.push({ x: sx, y: sy, r: 27, building: b, resource: def.resource });
  }
}

function drawConstructionBadges(t) {
  if (G.mode !== "village") return;
  for (const b of G.state.buildings) {
    if (!b.construction) continue;
    const c = buildingCenter(b);
    const p = worldToScreen(c.x, c.y);
    const remaining = Math.max(0, (b.construction.endsAt - now()) / 1000);
    const s = G.view.scale * G.cam.zoom;
    const sx = p.x;
    const sy = p.y - 80 * s;
    ctx.save();
    ctx.translate(sx, sy);
    const text = formatTime(remaining);
    ctx.font = '800 9px "Nunito", sans-serif';
    const w = ctx.measureText(text).width + 34;
    ctx.fillStyle = "rgba(7,18,41,.94)";
    roundRect(ctx, -w / 2, -10, w, 21, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,213,100,.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = "#ffd35f";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-w / 2 + 11, 0, 5, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 11, 0);
    ctx.lineTo(-w / 2 + 11, -3);
    ctx.stroke();
    ctx.fillStyle = "#ffe8a8";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, -w / 2 + 20, 1);
    ctx.restore();
  }
}

function drawWorldParticles(t) {
  if (G.mode === "village") {
    // Drifting motes around the village
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const seed = i * 7.13;
      const x = (Math.sin(t * 0.12 + seed) * 0.5 + 0.5) * G.view.w;
      const y = (Math.cos(t * 0.1 + seed * 1.7) * 0.5 + 0.5) * G.view.h;
      ctx.globalAlpha = 0.18 + Math.sin(t * 0.8 + i) * 0.08;
      ctx.fillStyle = i % 3 ? "#e9ffb0" : "#9bf7ff";
      ctx.beginPath();
      ctx.arc(x, y, 1.3 + (i % 3) * 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

/* ── Base previews ───────────────────────────────────────────────── */
function renderBasePreview(canvasNode, buildings) {
  const c = canvasNode.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvasNode.clientWidth || 160;
  const h = canvasNode.clientHeight || 90;
  canvasNode.width = Math.round(w * dpr);
  canvasNode.height = Math.round(h * dpr);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  const tw = Math.max(8, w / 17);
  const th = tw / 2;
  const originX = w / 2;
  const originY = h * 0.12;
  const s = tw / 64;
  const p = (x, y) => ({ x: originX + (x - y) * tw / 2, y: originY + (x + y + 1) * th / 2 });
  // ground
  const T = p(-0.5, -0.5);
  const R = p(GRID - 0.5, -0.5);
  const B = p(GRID - 0.5, GRID - 0.5);
  const L = p(-0.5, GRID - 0.5);
  c.fillStyle = "#4b9e52";
  c.beginPath();
  c.moveTo(T.x, T.y); c.lineTo(R.x, R.y); c.lineTo(B.x, B.y); c.lineTo(L.x, L.y); c.closePath(); c.fill();
  c.strokeStyle = "rgba(15,60,34,.4)";
  c.lineWidth = 2;
  c.stroke();
  c.fillStyle = "rgba(35,111,57,.6)";
  c.beginPath();
  c.moveTo(L.x, L.y); c.lineTo(B.x, B.y); c.lineTo(B.x, B.y + 10); c.lineTo(L.x, L.y + 10); c.closePath(); c.fill();
  c.beginPath();
  c.moveTo(B.x, B.y); c.lineTo(R.x, R.y); c.lineTo(R.x, R.y + 10); c.lineTo(B.x, B.y + 10); c.closePath(); c.fill();
  const sorted = [...buildings].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  for (const b of sorted) {
    const def = BUILDINGS[b.type];
    if (!def) continue;
    const cx = b.x + (def.size[0] - 1) / 2;
    const cy = b.y + (def.size[1] - 1) / 2;
    const pt = p(cx, cy);
    drawBuilding(c, b.type, b.level || 1, pt.x, pt.y, s, 0.6, { variant: b.x + b.y });
  }
  // vignette
  const grad = c.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(7,18,41,.18)");
  grad.addColorStop(0.55, "rgba(7,18,41,0)");
  grad.addColorStop(1, "rgba(7,18,41,.48)");
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);
}

/* ── Building sheet ──────────────────────────────────────────────── */
function buildingMaxHp(b) {
  const def = BUILDINGS[b.type];
  return Math.round((def.hp || 100) * Math.pow(1.16, Math.max(0, b.level - 1)));
}

function productionRate(b) {
  const def = BUILDINGS[b.type];
  if (!def?.resource) return 0;
  return def.rate * b.level;
}

function productionCap(b) {
  const def = BUILDINGS[b.type];
  if (!def?.resource) return 0;
  return def.capacity * b.level;
}

function costPills(cost, missing = false) {
  const out = [];
  if (cost.gold) out.push(`<span class="cost-pill ${missing && G.state.resources.gold < cost.gold ? "missing" : ""}">${icon("coin")}${formatNumber(cost.gold)}</span>`);
  if (cost.elixir) out.push(`<span class="cost-pill elixir ${missing && G.state.resources.elixir < cost.elixir ? "missing" : ""}">${icon("drop")}${formatNumber(cost.elixir)}</span>`);
  if (cost.gems) out.push(`<span class="cost-pill gem ${missing && G.state.resources.gems < cost.gems ? "missing" : ""}">${icon("gem")}${formatNumber(cost.gems)}</span>`);
  return out.join("");
}

function openBuildingSheet(b, keep = false) {
  if (!b) return;
  G.selected = b;
  G.sheetOpener = "building";
  const def = BUILDINGS[b.type];
  const maxed = b.level >= def.maxLevel;
  const construction = b.construction;
  const remaining = construction ? Math.max(0, (construction.endsAt - now()) / 1000) : 0;
  const speedGems = construction ? Math.max(1, Math.ceil(remaining / 12)) : 0;
  const cost = buildingUpgradeCost(b.type, b.level);
  const duration = upgradeSeconds(b.type, b.level);
  const canAfford = (cost.gold || 0) <= G.state.resources.gold && (cost.elixir || 0) <= G.state.resources.elixir;
  const freeBuilders = getFreeBuilders();
  const stored = Math.floor(b.stored || 0);
  const isResource = !!def.resource;
  const rate = productionRate(b);
  const cap = productionCap(b);
  const hp = buildingMaxHp(b);

  let stats = `
    <div class="stat-box"><span class="stat-icon">${icon("shield")}</span><span><small>POINTS DE VIE</small><b>${formatNumber(hp)}</b></span></div>
    <div class="stat-box"><span class="stat-icon">${icon("star")}</span><span><small>NIVEAU</small><b>${b.level}${maxed ? " · MAX" : ` / ${def.maxLevel}`}</b></span></div>`;
  if (def.damage) {
    stats += `<div class="stat-box"><span class="stat-icon">${icon("swords")}</span><span><small>DÉGÂTS</small><b>${formatNumber(Math.round(def.damage * Math.pow(1.14, b.level - 1)))}</b></span></div>
      <div class="stat-box"><span class="stat-icon">${icon("target")}</span><span><small>PORTÉE</small><b>${def.range.toFixed(1)} cases</b></span></div>`;
  }
  if (isResource) {
    stats += `<div class="stat-box"><span class="stat-icon">${icon(def.resource === "gold" ? "coin" : "drop")}</span><span><small>PRODUCTION</small><b>${formatNumber(rate * 60)} / h</b></span></div>
      <div class="stat-box"><span class="stat-icon">${icon("clock")}</span><span><small>RÉSERVE</small><b>${formatNumber(cap)}</b></span></div>`;
  }

  let actions = "";
  if (construction) {
    actions = `<button class="btn gold block" data-action="speedup" data-id="${b.id}">${icon("bolt")} Accélérer · ${speedGems} gemmes</button>`;
  } else if (isResource && stored > 0) {
    actions = `<button class="btn gold block" data-action="collect" data-id="${b.id}">${icon(def.resource === "gold" ? "coin" : "drop")} Récolter ${formatNumber(stored)}</button>`;
  }
  if (!construction && !maxed && def.upgradeGold + def.upgradeElixir > 0) {
    actions += `<button class="btn ${canAfford && freeBuilders > 0 ? "green" : "ghost"} block" data-action="upgrade" data-id="${b.id}" ${canAfford && freeBuilders > 0 ? "" : "disabled"}>
      ${icon("hammer")} Améliorer au niveau ${b.level + 1}
    </button>`;
  }
  if (!construction && b.type !== "townhall") {
    actions += `<button class="btn ghost block" data-action="move" data-id="${b.id}">${icon("target")} Déplacer le bâtiment</button>`;
  }
  if (maxed && !construction) actions += `<div class="timer-badge">${icon("check")} Niveau maximum atteint</div>`;

  const production = isResource ? `
    <div class="production-line">
      <span>${icon(def.resource === "gold" ? "coin" : "drop")} Réserve actuelle</span>
      <b>${formatNumber(stored)} / ${formatNumber(cap)}</b>
    </div>` : "";

  const upgradePanel = !construction && !maxed && def.upgradeGold + def.upgradeElixir > 0 ? `
    <div class="upgrade-panel">
      <div class="upgrade-head">
        <strong>Amélioration niveau ${b.level + 1}</strong>
        <span>${icon("clock")} ${formatTime(duration)}</span>
      </div>
      <div class="upgrade-costs">
        ${costPills(cost, true)}
        <span class="timer-badge">${icon("hammer")} ${freeBuilders} artisan${freeBuilders > 1 ? "s" : ""} libre${freeBuilders > 1 ? "s" : ""}</span>
      </div>
      ${!canAfford ? `<div class="upgrade-head" style="margin:7px 0 0"><span style="color:#ff9b8e">Ressources insuffisantes</span></div>` : ""}
      ${canAfford && freeBuilders === 0 ? `<div class="upgrade-head" style="margin:7px 0 0"><span style="color:#ffca7a">Tous tes artisans sont occupés</span></div>` : ""}
    </div>` : "";

  const html = `
    <div class="sheet-head">
      <div class="sheet-head-icon"><canvas data-thumb="${b.type}" data-level="${b.level}" data-scale="1.05"></canvas></div>
      <div class="sheet-head-copy">
        <span class="sheet-eyebrow">${escapeHtml(def.eyebrow || "BÂTIMENT")}</span>
        <span class="sheet-title">${escapeHtml(def.name)}</span>
        <span class="sheet-sub">${construction ? `Travaux en cours · ${formatTime(remaining)}` : escapeHtml(def.desc || "")}</span>
      </div>
    </div>
    <div class="building-layout">
      <div class="building-preview">
        <span class="building-level">NIV. ${b.level}</span>
        <canvas data-thumb="${b.type}" data-level="${b.level}" data-scale="1.75"></canvas>
      </div>
      <div class="building-info">
        <div class="stat-grid">${stats}</div>
        ${production}
        ${upgradePanel}
      </div>
    </div>
    <div class="building-actions">${actions}</div>`;
  openSheet(html);
  if (!keep) audio.play("open");
}

function openBuildersSheet(keep = false) {
  G.sheetOpener = "builders";
  const total = getTotalBuilders();
  const jobs = G.state.buildings.filter((b) => b.construction);
  const rows = jobs.length ? jobs.map((b) => {
    const def = BUILDINGS[b.type];
    const remaining = Math.max(0, (b.construction.endsAt - now()) / 1000);
    const gems = Math.max(1, Math.ceil(remaining / 12));
    return `<div class="setting-row">
      <span><b>${escapeHtml(def.name)} · niv. ${b.level + (b.construction.kind === "upgrade" ? 1 : 0)}</b><small>${formatTime(remaining)} restantes</small></span>
      <button class="btn gold small" data-action="speedup" data-id="${b.id}">${gems} ${icon("gem")}</button>
    </div>`;
  }).join("") : `<div class="snox-note">Tous tes artisans se reposent. Lance une amélioration depuis un bâtiment ou construis un nouveau bâtiment depuis la boutique.</div>`;
  const html = `
    <div class="sheet-head">
      <div class="sheet-head-icon">${icon("hammer")}</div>
      <div class="sheet-head-copy">
        <span class="sheet-eyebrow">ATELIER DU ROYAUME</span>
        <span class="sheet-title">Tes artisans</span>
        <span class="sheet-sub">${jobs.length} chantier${jobs.length > 1 ? "s" : ""} en cours · ${Math.max(0, total - jobs.length)} libre${total - jobs.length > 1 ? "s" : ""}</span>
      </div>
    </div>
    <div style="margin-top:12px">${rows}</div>`;
  openSheet(html);
  if (!keep) audio.play("open");
}

/* ── Shop ────────────────────────────────────────────────────────── */
function buildingCount(type) {
  return G.state.buildings.filter((b) => b.type === type).length;
}

function openShopSheet(category = "resource", keep = false) {
  G.sheetOpener = "shop";
  const tabs = SHOP_CATEGORIES.map((c) => `<button class="sheet-tab ${c.id === category ? "active" : ""}" data-action="shop-tab" data-cat="${c.id}">${c.label}</button>`).join("");
  const types = Object.entries(BUILDINGS).filter(([, d]) => d.category === category && d.buildCost);
  const cards = types.map(([type, def]) => {
    const count = buildingCount(type);
    const limit = def.limit || 99;
    const maxed = count >= limit;
    const th = getTownhallLevel();
    const locked = def.category === "special" && type === "portal" && th < 2;
    const cost = def.buildCost;
    const affordable = (cost.gold || 0) <= G.state.resources.gold && (cost.elixir || 0) <= G.state.resources.elixir && (cost.gems || 0) <= G.state.resources.gems;
    return `<div class="shop-card ${maxed || locked ? "locked" : ""}" data-action="shop-card" data-type="${type}">
      <div class="shop-thumb">
        <canvas data-thumb="${type}" data-level="1" data-scale="1.12"></canvas>
        ${locked ? `<span class="thumb-lock">${icon("lock")}</span>` : ""}
      </div>
      <h4>${escapeHtml(def.name)}</h4>
      <p>${escapeHtml((def.desc || "").slice(0, 82))}${(def.desc || "").length > 82 ? "…" : ""}</p>
      <div class="shop-meta">
        <span class="shop-cost ${cost.elixir ? "elixir" : ""}">${cost.gold ? icon("coin") : cost.elixir ? icon("drop") : icon("gem")}${formatNumber(cost.gold || cost.elixir || cost.gems)}</span>
        <span class="shop-count">${count}/${limit}</span>
      </div>
      <button class="shop-add" data-action="shop-build" data-type="${type}" ${maxed || locked || !affordable ? "disabled" : ""} aria-label="Construire ${escapeHtml(def.name)}">${locked ? icon("lock") : icon("plus")}</button>
    </div>`;
  }).join("");
  const html = `
    <div class="sheet-head">
      <div class="sheet-head-icon">${icon("shop")}</div>
      <div class="sheet-head-copy">
        <span class="sheet-eyebrow">MARCHÉ DU ROYAUME</span>
        <span class="sheet-title">Boutique</span>
        <span class="sheet-sub">Construis, défends et agrandis ton royaume.</span>
      </div>
    </div>
    <div class="sheet-tabs">${tabs}</div>
    <div class="shop-wallet">
      <span class="cost-pill">${icon("coin")}${formatNumber(G.state.resources.gold)}</span>
      <span class="cost-pill elixir">${icon("drop")}${formatNumber(G.state.resources.elixir)}</span>
      <span class="cost-pill gem">${icon("gem")}${formatNumber(G.state.resources.gems)}</span>
    </div>
    <div class="shop-grid">${cards || `<div class="snox-note">Aucun bâtiment disponible dans cette catégorie.</div>`}</div>`;
  openSheet(html);
  if (!keep) audio.play("open");
}

/* ── Army ────────────────────────────────────────────────────────── */
function openArmySheet(keep = false) {
  G.sheetOpener = "army";
  const cap = getArmyCap(G.state);
  const housing = armyHousing(G.state);
  const barracks = G.state.buildings.filter((b) => b.type === "barracks" && b.built !== false);
  const cards = TROOP_ORDER.map((id) => {
    const t = TROOPS[id];
    const count = G.state.army[id] || 0;
    const canTrain = barracks.length > 0 && housing + t.housing <= cap && G.state.resources.elixir >= t.cost;
    return `<div class="troop-card">
      <div class="troop-art"><canvas data-troop="${id}"></canvas><span class="troop-count">${count}</span></div>
      <h4>${t.name}</h4>
      <span class="troop-role">${t.role}</span>
      <div class="troop-stats">
        <span>${icon("shield")}${t.hp}</span>
        <span>${icon("swords")}${t.dps}</span>
        <span>${icon("target")}${t.housing} place${t.housing > 1 ? "s" : ""}</span>
      </div>
      <div class="troop-actions">
        <span class="troop-price">${icon("drop")}${t.cost}</span>
        <button class="btn ${canTrain ? "green" : "ghost"} small" data-action="train" data-troop="${id}" ${canTrain ? "" : "disabled"}>${icon("plus")} Entraîner</button>
      </div>
    </div>`;
  }).join("");
  const html = `
    <div class="sheet-head">
      <div class="sheet-head-icon">${icon("helmet")}</div>
      <div class="sheet-head-copy">
        <span class="sheet-eyebrow">ARMÉE DU ROYAUME</span>
        <span class="sheet-title">Tes troupes</span>
        <span class="sheet-sub">${barracks.length ? "Chaque recrue rejoint immédiatement ton armée." : "Construis une caserne pour entraîner des troupes."}</span>
      </div>
    </div>
    <div class="army-layout">
      <div class="army-summary">
        <div class="army-cap">${icon("users")} <b>${housing}/${cap}</b> places</div>
        <div class="army-cap-bar"><i style="width:${Math.min(100, (housing / cap) * 100)}%"></i></div>
        <span class="timer-badge">${icon("helmet")} ${barracks.length} caserne${barracks.length > 1 ? "s" : ""}</span>
      </div>
      <div class="troop-grid">${cards}</div>
      <div class="snox-note">Astuce : le Colosse attire les tirs des défenses. Envoie-le en premier, puis déploie tes Plumes derrière lui.</div>
    </div>`;
  openSheet(html);
  if (!keep) audio.play("open");
}

/* ── Attack ──────────────────────────────────────────────────────── */
function openAttackSheet(keep = false) {
  G.sheetOpener = "attack";
  if (!G.opponents) G.opponents = generateOpponents();
  const housing = armyHousing(G.state);
  const cap = getArmyCap(G.state);
  const cards = G.opponents.map((o, i) => `
    <button class="opponent-card" data-action="attack" data-index="${i}">
      <div class="opponent-art"><canvas data-base-preview="${i}"></canvas></div>
      <h4>${escapeHtml(o.name)}</h4>
      <div class="opponent-meta">
        <span>${icon("trophy")} ${o.trophies}</span>
        <span>Niv. ${o.level}</span>
      </div>
      <div class="opponent-loot">
        <span>${icon("coin")}${formatCompact(o.loot.gold)}</span>
        <span class="elixir">${icon("drop")}${formatCompact(o.loot.elixir)}</span>
      </div>
    </button>`).join("");
  const html = `
    <div class="sheet-head">
      <div class="sheet-head-icon">${icon("swords")}</div>
      <div class="sheet-head-copy">
        <span class="sheet-eyebrow">CARTE DES ROYAUMES</span>
        <span class="sheet-title">Partir en expédition</span>
        <span class="sheet-sub">Choisis un adversaire. Pille son or, détruis son hôtel et gagne des trophées.</span>
      </div>
    </div>
    <div class="attack-hero">
      <div class="attack-hero-icon">${icon("swords")}</div>
      <div class="attack-hero-copy">
        <small>ARMÉE PRÊTE</small>
        <strong>${housing} / ${cap} places utilisées</strong>
        <span>${housing === 0 ? "Ton armée est vide. Entraîne des troupes avant de partir !" : "Touche un adversaire pour lancer la bataille."}</span>
      </div>
    </div>
    <div class="opponent-grid">${cards}</div>
    <div style="display:flex;justify-content:center;margin-top:12px">
      <button class="btn ghost small" data-action="reroll-opponents">${icon("target")} Chercher d'autres royaumes</button>
    </div>`;
  openSheet(html);
  if (!keep) audio.play("open");
}

/* ── Clan ────────────────────────────────────────────────────────── */
function openClanSheet(keep = false) {
  G.sheetOpener = "clan";
  const messages = [
    ...CLAN_MEMBERS.map((m) => ({ ...m, time: "il y a 12 min" })),
    ...(G.state.chat || []).slice(-12),
  ];
  const rows = messages.map((m) => `
    <div class="chat-msg">
      <span class="chat-avatar" style="color:${m.color || "#cce9ff"}">${escapeHtml((m.name || "?").slice(0, 1))}</span>
      <div class="chat-bubble"><b>${escapeHtml(m.name)}${m.role ? ` · ${escapeHtml(m.role)}` : ""}</b><span>${escapeHtml(m.msg)}</span></div>
    </div>`).join("");
  const html = `
    <div class="sheet-head">
      <div class="sheet-head-icon">${icon("banner")}</div>
      <div class="sheet-head-copy">
        <span class="sheet-eyebrow">ALLIANCE</span>
        <span class="sheet-title">Lames d'Aurore</span>
        <span class="sheet-sub">Un clan de bâtisseurs qui veille sur les frontières de Nova.</span>
      </div>
    </div>
    <div class="clan-banner">
      <div class="clan-crest">${icon("shield")}</div>
      <div class="clan-copy">
        <small>ALLIANCE ACTUELLE</small>
        <strong>Lames d'Aurore</strong>
        <span>#SNOX-7A2 · 18 membres · Niveau 4</span>
      </div>
    </div>
    <div class="clan-stats">
      <div class="clan-stat"><small>TROPHÉES</small><b>4 280</b></div>
      <div class="clan-stat"><small>GUERRES GAGNÉES</small><b>37</b></div>
      <div class="clan-stat"><small>DON DE TROUPES</small><b>1 842</b></div>
    </div>
    <div class="chat-list" id="chatList">${rows}</div>
    <form class="chat-input" id="chatForm">
      <input id="chatInput" maxlength="120" autocomplete="off" placeholder="Écris un message à ton alliance…" />
      <button class="btn gold small" type="submit">Envoyer</button>
    </form>`;
  openSheet(html);
  if (!keep) audio.play("open");
  const list = $("chatList");
  if (list) list.scrollTop = list.scrollHeight;
  const form = $("chatForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("chatInput");
      const text = (input.value || "").trim();
      if (!text) return;
      G.state.chat = [...(G.state.chat || []), { name: G.state.profile.name, role: "Chef", msg: text, color: "#ffcf65", time: "à l'instant" }].slice(-30);
      saveState();
      openClanSheet(true);
      setTimeout(() => {
        const replies = [
          "Bien reçu, chef ! Je pars reconnaître le terrain.",
          "On dirait que la récolte est bonne aujourd'hui. 🌾",
          "Je garde un œil sur les canons du nord.",
          "Une expédition ensemble ce soir ?",
        ];
        G.state.chat = [...(G.state.chat || []), { name: "Mira", role: "Archère", msg: replies[Math.floor(Math.random() * replies.length)], color: "#e49bff", time: "à l'instant" }].slice(-30);
        saveState();
        if (G.sheetOpener === "clan" && G.sheet) openClanSheet(true);
      }, 1600 + Math.random() * 1200);
    });
  }
}

/* ── Snox ID ─────────────────────────────────────────────────────── */
function openSnoxId() {
  closeSheet(true);
  const p = G.state.profile;
  const joined = new Date(G.state.createdAt || now()).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const html = `
    <div class="snox-modal-head">
      <div class="snox-logo">${icon("crown")} SNOX ID</div>
      <h2>Ton identité de chef</h2>
      <p>Un seul Snox ID pour ton royaume, tes sauvegardes et tes futurs jeux Snox.</p>
    </div>
    <div class="id-card">
      <div class="id-card-top">
        <span class="id-avatar"><canvas data-avatar></canvas></span>
        <div class="id-card-name">
          <small>CHEF CONNECTÉ</small>
          <strong>${escapeHtml(p.name)}</strong>
          <span>Royaume de ${escapeHtml(p.realm)} · Niveau ${p.level}</span>
        </div>
      </div>
      <div class="id-code-row">
        <span><small>TON SNOX ID</small><br><span class="id-code">${escapeHtml(p.snoxId)}</span></span>
        <button class="id-copy" data-action="copy-id" aria-label="Copier mon Snox ID">${icon("copy")}</button>
      </div>
      <div class="id-card-foot">
        <span>${icon("shield")} Compte local sécurisé</span>
        <span>Depuis le <b>${joined}</b></span>
      </div>
    </div>
    <div class="snox-info">
      <div class="snox-info-row"><span>Batailles gagnées</span><b>${G.state.stats.battlesWon}</b></div>
      <div class="snox-info-row"><span>Trophées</span><b>${formatNumber(p.trophies)}</b></div>
      <div class="snox-info-row"><span>Or pillé</span><b>${formatNumber(G.state.stats.goldLooted)}</b></div>
    </div>
    <p class="snox-note">Ton Snox ID et ta progression sont enregistrés dans ce navigateur. Ce projet est un jeu original indépendant, sans affiliation avec Supercell.</p>
    <div class="modal-actions split">
      <button class="btn ghost" data-action="edit-name">${icon("helmet")} Changer de pseudo</button>
      <button class="btn ghost" data-action="copy-id">${icon("copy")} Copier l'ID</button>
    </div>
    <div class="modal-actions">
      <button class="btn red" data-action="new-profile">${icon("lock")} Créer un nouveau Snox ID</button>
    </div>`;
  openModal(html);
}

function openSettings() {
  closeSheet(true);
  const html = `
    <div class="settings-head">
      <small>RÉGLAGES DU ROYAUME</small>
      <h2>Options</h2>
      <p>Ajuste ton expérience et gère ta sauvegarde locale.</p>
    </div>
    <div class="setting-row">
      <span><b>Effets sonores</b><small>Ambiance, récoltes et batailles</small></span>
      <button class="switch ${audio.enabled ? "on" : ""}" data-action="toggle-sound" aria-label="Effets sonores"></button>
    </div>
    <div class="setting-row">
      <span><b>Animations réduites</b><small>Moins de mouvements à l'écran</small></span>
      <button class="switch ${motionQuery.matches ? "on" : ""}" data-action="toggle-motion" aria-label="Animations réduites"></button>
    </div>
    <div class="setting-row">
      <span><b>Zoom du village</b><small>Recentrer la caméra sur l'hôtel du royaume</small></span>
      <button class="btn ghost small" data-action="recenter">Recentrer</button>
    </div>
    <div class="danger-zone">
      <p>Réinitialiser efface définitivement ta progression et ton Snox ID actuel de ce navigateur.</p>
      <button class="btn red small" data-action="reset-game">${icon("lock")} Réinitialiser le royaume</button>
    </div>
    <p class="credits">Snox Kingdom · version 1.0<br>Jeu de stratégie original inspiré des jeux de construction de base. Non affilié à Supercell.<br>Art, interface et code générés pour ce royaume.</p>`;
  openModal(html);
}

function openEditName() {
  const p = G.state.profile;
  const html = `
    <div class="settings-head">
      <small>SNOX ID</small>
      <h2>Changer de pseudo</h2>
      <p>Ton pseudo est visible par les autres chefs de ton alliance.</p>
    </div>
    <form id="nameForm">
      <label class="snox-note" style="display:block;margin:0 0 6px">Pseudo de chef</label>
      <input id="nameInput" maxlength="18" value="${escapeHtml(p.name)}" style="width:100%;height:44px;border-radius:12px;border:1px solid rgba(158,201,255,.2);background:rgba(0,0,0,.22);color:#eef7ff;padding:0 12px;font:700 13px 'Nunito',sans-serif;outline:none" />
      <div class="modal-actions">
        <button class="btn gold" type="submit">${icon("check")} Enregistrer</button>
      </div>
    </form>`;
  openModal(html);
  const form = $("nameForm");
  const input = $("nameInput");
  if (input) setTimeout(() => input.focus(), 50);
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = (input.value || "").trim().replace(/[<>]/g, "").slice(0, 18);
      if (value.length < 2) {
        showToast("Choisis un pseudo d'au moins 2 caractères.", "error");
        return;
      }
      p.name = value;
      saveState();
      updateHUD(true);
      closeModal(true);
      openSnoxId();
      showToast(`Bienvenue, ${value} !`, "success", "check");
    });
  }
}

function openResetConfirm() {
  const html = `
    <div class="settings-head">
      <small>ZONE DANGEREUSE</small>
      <h2>Nouveau Snox ID ?</h2>
      <p>Ton royaume actuel sera effacé de ce navigateur. Cette action est définitive.</p>
    </div>
    <div class="snox-note">Ton identifiant actuel <b>${escapeHtml(G.state.profile.snoxId)}</b> et toute ta progression seront perdus. Si tu veux juste changer de pseudo, utilise « Changer de pseudo ».</div>
    <div class="modal-actions split">
      <button class="btn ghost" data-action="close-modal">Annuler</button>
      <button class="btn red" data-action="confirm-reset">${icon("lock")} Tout effacer</button>
    </div>`;
  openModal(html);
}

/* ── Shop / building actions ─────────────────────────────────────── */
function startPlacement(type) {
  const def = BUILDINGS[type];
  if (!def) return;
  if (getFreeBuilders() <= 0) {
    showToast("Tous tes artisans sont occupés. Termine un chantier d'abord.", "error", "hammer");
    return;
  }
  const cost = def.buildCost || {};
  if ((cost.gold || 0) > G.state.resources.gold || (cost.elixir || 0) > G.state.resources.elixir || (cost.gems || 0) > G.state.resources.gems) {
    showToast("Ressources insuffisantes pour ce bâtiment.", "error", "coin");
    return;
  }
  closeSheet(true);
  closeModal(true);
  G.build = { type, x: null, y: null, valid: false, cost };
  G.selected = null;
  $("buildBar").hidden = false;
  $("buildName").textContent = def.name;
  $("confirmBuild").disabled = true;
  const preview = $("buildPreview");
  preview.innerHTML = `<canvas width="43" height="43"></canvas>`;
  renderThumb(preview.querySelector("canvas"), type, 1, { scale: 0.42 });
  audio.play("open");
  showToast("Choisis une parcelle libre sur le terrain.", "", "target");
}

function cancelPlacement() {
  G.build = null;
  $("buildBar").hidden = true;
  $("confirmBuild").disabled = true;
  updateNav("village");
  audio.play("close");
}

function canPlace(type, x, y) {
  const def = BUILDINGS[type];
  if (!def) return false;
  if (x < 0 || y < 0 || x + def.size[0] > GRID || y + def.size[1] > GRID) return false;
  for (let dx = 0; dx < def.size[0]; dx++) {
    for (let dy = 0; dy < def.size[1]; dy++) {
      if (G.blockedTiles.has(`${x + dx},${y + dy}`)) return false;
    }
  }
  for (const b of G.state.buildings) {
    const bd = BUILDINGS[b.type];
    const overlap = x < b.x + bd.size[0] && x + def.size[0] > b.x && y < b.y + bd.size[1] && y + def.size[1] > b.y;
    if (overlap) return false;
  }
  return true;
}

function updateBuildGhost(tile) {
  if (!G.build) return;
  const def = BUILDINGS[G.build.type];
  const x = Math.round(tile.fx - (def.size[0] - 1) / 2);
  const y = Math.round(tile.fy - (def.size[1] - 1) / 2);
  G.build.x = x;
  G.build.y = y;
  G.build.valid = canPlace(G.build.type, x, y);
  $("confirmBuild").disabled = !G.build.valid;
  $("buildBar").classList.toggle("invalid", !G.build.valid);
}

function confirmPlacement() {
  if (!G.build || !G.build.valid) return;
  const { type, x, y, cost } = G.build;
  const def = BUILDINGS[type];
  if (!spendCost(cost)) {
    showToast("Ressources insuffisantes.", "error", "coin");
    return;
  }
  const id = `b${G.state.nextId++}`;
  const secs = buildSeconds(type);
  G.state.buildings.push({
    id, type, x, y, level: 1, built: false,
    construction: { kind: "new", endsAt: now() + secs * 1000, cost },
  });
  removeDecorNear(x, y, def.size);
  audio.play("build");
  vibrate(14);
  burstParticlesAtTile(x + (def.size[0] - 1) / 2, y + (def.size[1] - 1) / 2, "#ffd35f", 16);
  showToast(`${def.name} en construction · ${formatTime(secs)}`, "success", "hammer");
  G.build = null;
  $("buildBar").hidden = true;
  $("confirmBuild").disabled = true;
  updateNav("village");
  addXp(4);
  saveState();
  updateHUD();
}

function removeDecorNear(x, y, size) {
  const cx = x + (size[0] - 1) / 2;
  const cy = y + (size[1] - 1) / 2;
  const radius = Math.max(size[0], size[1]) * 0.9;
  G.decorations = G.decorations.filter((d) => Math.hypot(d.x - cx, d.y - cy) > radius);
}

function collectBuilding(b) {
  const def = BUILDINGS[b.type];
  if (!def?.resource) return;
  const stored = Math.floor(b.stored || 0);
  if (stored < 1) return;
  const gained = addResource(def.resource, stored);
  b.stored = Math.max(0, (b.stored || 0) - gained);
  if (gained > 0) {
    const c = buildingCenter(b);
    const p = worldToScreen(c.x, c.y);
    coinFly(p.x, p.y - 55, def.resource);
    audio.play(def.resource === "gold" ? "coin" : "elixir");
    if (def.resource === "gold") G.state.missions.collect = (G.state.missions.collect || 0) + gained;
    addXp(1);
    showToast(`+${formatNumber(gained)} ${def.resource === "gold" ? "or" : "élixir"}`, "success", def.resource === "gold" ? "coin" : "drop");
    burstParticlesAtTile(c.x, c.y, def.resource === "gold" ? "#ffd35f" : "#e27dff", 10);
    updateHUD();
    saveState();
    if (G.sheetOpener === "building" && G.selected === b) openBuildingSheet(b, true);
  } else {
    showToast("Ton stockage est plein. Améliore ton coffre !", "error", "info");
  }
}

function startUpgrade(b) {
  const def = BUILDINGS[b.type];
  if (!def || b.level >= def.maxLevel) return;
  if (b.construction) return;
  if (getFreeBuilders() <= 0) {
    showToast("Tous tes artisans sont occupés.", "error", "hammer");
    return;
  }
  const cost = buildingUpgradeCost(b.type, b.level);
  if (!spendCost(cost)) {
    showToast("Ressources insuffisantes pour cette amélioration.", "error", "coin");
    return;
  }
  const secs = upgradeSeconds(b.type, b.level);
  b.construction = { kind: "upgrade", endsAt: now() + secs * 1000, cost };
  audio.play("build");
  vibrate(16);
  showToast(`Amélioration lancée · ${formatTime(secs)}`, "success", "hammer");
  updateHUD();
  saveState();
  openBuildingSheet(b, true);
}

function speedUp(b) {
  if (!b?.construction) return;
  const remaining = Math.max(0, (b.construction.endsAt - now()) / 1000);
  const gems = Math.max(1, Math.ceil(remaining / 12));
  if (G.state.resources.gems < gems) {
    showToast(`Il te faut ${gems} gemmes pour accélérer.`, "error", "gem");
    return;
  }
  G.state.resources.gems -= gems;
  b.construction.endsAt = now();
  completeDueConstruction(true);
  updateHUD();
  saveState();
  if (G.sheetOpener === "builders") openBuildersSheet(true);
}

function moveBuildingStart(b) {
  showToast("Le déplacement sera disponible après la prochaine expédition. Ton royaume reste en sécurité.", "", "info");
}

/* ── Training & battle launch ────────────────────────────────────── */
function hasAvailableTroops(army = G.state.army) {
  return TROOP_ORDER.some((id) => Number(army?.[id]) > 0);
}

function trainTroop(id) {
  const t = TROOPS[id];
  if (!t) return;
  const cap = getArmyCap(G.state);
  if (armyHousing(G.state) + t.housing > cap) {
    showToast("Ton camp est plein. Agrandis un camp d'armée.", "error", "users");
    return;
  }
  if (G.state.resources.elixir < t.cost) {
    showToast("Pas assez d'élixir.", "error", "drop");
    return;
  }
  G.state.resources.elixir -= t.cost;
  G.state.army[id] = (G.state.army[id] || 0) + 1;
  audio.play("upgrade");
  addXp(2);
  updateHUD();
  saveState();
  openArmySheet(true);
}

function generateOpponents() {
  const level = G.state.profile.level;
  const rand = seededRandom(now() % 2147483647);
  const names = [...OPPONENT_NAMES].sort(() => rand() - 0.5);
  return Array.from({ length: 3 }, (_, i) => {
    const seed = Math.floor(rand() * 1000000) + i * 371;
    const buildings = generateEnemyBuildings(seed, level + (i === 2 ? 1 : 0));
    return {
      name: names[i % names.length],
      level: Math.max(1, level + (i - 1)),
      trophies: Math.max(20, G.state.profile.trophies + Math.round((rand() - 0.45) * 90)),
      avatar: Math.floor(rand() * 6),
      seed,
      buildings,
      loot: {
        gold: Math.round(500 + rand() * 900 + level * 90),
        elixir: Math.round(420 + rand() * 820 + level * 80),
      },
    };
  });
}

const ENEMY_PRESETS = [
  {
    th: [8, 8],
    list: [
      ["goldmine", 4, 8], ["goldmine", 12, 8], ["goldmine", 8, 12],
      ["elixirpump", 8, 4], ["elixirpump", 12, 12],
      ["barracks", 4, 4], ["camp", 4, 13], ["cannon", 13, 4], ["cannon", 6, 4],
      ["tower", 4, 11], ["vault", 14, 11], ["hut", 15, 7], ["portal", 13, 14],
    ],
  },
  {
    th: [8, 8],
    list: [
      ["goldmine", 4, 4], ["goldmine", 13, 4], ["goldmine", 8, 14],
      ["elixirpump", 4, 10], ["elixirpump", 14, 7],
      ["barracks", 12, 12], ["camp", 5, 14], ["cannon", 13, 10], ["cannon", 5, 6],
      ["tower", 12, 14], ["vault", 3, 7], ["hut", 16, 10], ["portal", 15, 4],
    ],
  },
  {
    th: [8, 8],
    list: [
      ["goldmine", 5, 5], ["goldmine", 13, 5], ["goldmine", 13, 13],
      ["elixirpump", 5, 13], ["elixirpump", 8, 14],
      ["barracks", 4, 9], ["camp", 14, 10], ["cannon", 6, 4], ["cannon", 12, 4],
      ["tower", 4, 14], ["vault", 15, 8], ["hut", 16, 13], ["portal", 2, 8],
    ],
  },
];

function generateEnemyBuildings(seed, level) {
  const rand = seededRandom(seed);
  const preset = ENEMY_PRESETS[seed % ENEMY_PRESETS.length];
  const mirror = rand() > 0.45;
  const buildings = [];
  const add = (type, x, y) => {
    const def = BUILDINGS[type];
    const xx = mirror ? GRID - x - def.size[0] : x;
    const yy = y;
    const lvl = clamp(level + Math.floor(rand() * 3) - 1, 1, def.maxLevel);
    buildings.push({ id: `e${buildings.length + 1}`, type, x: xx, y: yy, level: lvl, built: true });
  };
  add("townhall", preset.th[0], preset.th[1]);
  preset.list.forEach(([type, x, y]) => add(type, x, y));
  // Extra loot building for variety
  if (rand() > 0.5) add("goldmine", 2 + Math.floor(rand() * 3), 15);
  // Ring of walls, filtered where they would overlap a building.
  const walls = [];
  for (let x = 6; x <= 13; x++) {
    if (x !== 8 && x !== 11) walls.push([x, 6], [x, 13]);
  }
  for (let y = 7; y <= 12; y++) {
    if (y !== 9 && y !== 10) walls.push([6, y], [13, y]);
  }
  for (const [x, y] of walls) {
    const xx = mirror ? GRID - x - 1 : x;
    const overlaps = buildings.some((b) => {
      const d = BUILDINGS[b.type];
      return xx < b.x + d.size[0] && xx + 1 > b.x && y < b.y + d.size[1] && y + 1 > b.y;
    });
    if (!overlaps) buildings.push({ id: `e${buildings.length + 1}`, type: "wall", x: xx, y, level: clamp(level, 1, 6), built: true });
  }
  return buildings;
}

function startBattle(index) {
  const opponent = G.opponents?.[index];
  if (!opponent) return;
  if (!hasAvailableTroops()) {
    showToast("Ton armée est vide ! Entraîne des troupes avant d'attaquer.", "error", "helmet");
    openArmySheet();
    return;
  }
  closeSheet(true);
  closeModal(true);
  G.mode = "battle";
  G.selected = null;
  G.build = null;
  G.cam.zoom = 1;
  G.cam.panX = 0;
  G.cam.panY = 0;
  document.body.classList.add("in-battle");
  $("battleHud").hidden = false;
  $("hud").style.display = "none";
  $("battleHud").style.display = "block";
  const buildings = opponent.buildings.map((b, i) => {
    const def = BUILDINGS[b.type];
    const maxHp = Math.round((def.hp || 100) * Math.pow(1.14, b.level - 1));
    return { ...b, id: `eb${i}`, hp: maxHp, maxHp, destroyed: false, cooldown: 0.4 + Math.random() * 0.5 };
  });
  const nonWalls = buildings.filter((b) => b.type !== "wall");
  G.battle = {
    opponent,
    buildings,
    troops: [],
    projectiles: [],
    particles: [],
    floaters: [],
    available: { ...G.state.army },
    selected: TROOP_ORDER.find((id) => (G.state.army[id] || 0) > 0) || "ronce",
    time: 75,
    maxTime: 75,
    over: false,
    resultShown: false,
    destroyed: 0,
    total: nonWalls.length,
    loot: { gold: 0, elixir: 0 },
    stars: 0,
    deployed: 0,
    initialArmy: { ...G.state.army },
    shake: 0,
    startedAt: now(),
  };
  $("enemyName").textContent = opponent.name;
  $("enemyTrophies").textContent = `${formatNumber(opponent.trophies)} trophées · niveau ${opponent.level}`;
  $("enemyAvatar").textContent = opponent.name.slice(0, 1);
  $("battleGold").textContent = "0";
  $("battleElixir").textContent = "0";
  $("battleTimer").textContent = "1:15";
  $("battleTip").textContent = "Choisis une troupe puis touche le terrain";
  updateBattleHud();
  renderTroopTray();
  audio.play("attack");
  showToast("La bataille commence ! Déploie tes troupes.", "", "swords");
  saveState();
}

function renderTroopTray() {
  if (!G.battle) return;
  const tray = $("troopTray");
  tray.innerHTML = TROOP_ORDER.map((id) => {
    const t = TROOPS[id];
    const count = G.battle.available[id] || 0;
    return `<button class="tray-card ${G.battle.selected === id ? "selected" : ""} ${count === 0 ? "empty" : ""}" data-action="select-troop" data-troop="${id}" ${count === 0 ? "disabled" : ""}>
      <canvas data-troop="${id}"></canvas>
      <span>${t.name}</span>
      <span class="tray-count">${count}</span>
    </button>`;
  }).join("");
  tray.querySelectorAll("canvas").forEach((node) => drawTroopThumb(node, node.dataset.troop));
  updateBattleTip();
}

function updateBattleTip() {
  if (!G.battle) return;
  const troop = TROOPS[G.battle.selected];
  if (!troop) return;
  $("battleTip").textContent = `${troop.name} sélectionné${troop.name === "Plume" ? "e" : ""} · touche le terrain`;
}

function updateBattleHud() {
  if (!G.battle) return;
  const b = G.battle;
  const pct = b.total ? Math.min(100, Math.round((b.destroyed / b.total) * 100)) : 0;
  $("destructionPct").textContent = `${pct}%`;
  const arc = $("destructionArc");
  if (arc) arc.style.strokeDashoffset = String(113 - (113 * pct) / 100);
  const timer = Math.max(0, Math.ceil(b.time));
  $("battleTimer").textContent = `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, "0")}`;
  $("battleGold").textContent = formatNumber(b.loot.gold);
  $("battleElixir").textContent = formatNumber(b.loot.elixir);
  document.querySelectorAll("#battleStars .star").forEach((star) => {
    star.classList.toggle("on", Number(star.dataset.star) <= b.stars);
  });
}

function computeStars() {
  if (!G.battle) return 0;
  const b = G.battle;
  const pct = b.total ? (b.destroyed / b.total) * 100 : 0;
  const th = b.buildings.find((x) => x.type === "townhall");
  let stars = 0;
  if (pct >= 50) stars++;
  if (th?.destroyed) stars++;
  if (pct >= 100) stars++;
  return stars;
}

/* ── Battle simulation ───────────────────────────────────────────── */
function deployTroop(type, x, y) {
  const b = G.battle;
  if (!b || b.over) return;
  const available = b.available[type] || 0;
  if (available <= 0) {
    showToast("Plus de troupes de ce type.", "error", "helmet");
    return;
  }
  if (x < 0.4 || y < 0.4 || x > GRID - 0.4 || y > GRID - 0.4) return;
  const def = TROOPS[type];
  const barracksLevel = Math.max(1, ...G.state.buildings.filter((x) => x.type === "barracks").map((x) => x.level));
  const scale = 1 + 0.07 * (barracksLevel - 1);
  b.available[type] = available - 1;
  G.state.army[type] = Math.max(0, (G.state.army[type] || 0) - 1);
  b.troops.push({
    id: `t${b.deployed++}`,
    type,
    x, y,
    hp: Math.round(def.hp * scale),
    maxHp: Math.round(def.hp * scale),
    dps: def.dps * scale,
    speed: def.speed,
    range: def.range,
    favorite: def.favorite,
    target: null,
    cooldown: 0.1,
    retarget: 0,
    phase: Math.random() * 6,
    moving: false,
    flip: false,
    alive: true,
  });
  spawnParticles(x, y, type === "plume" ? "#6be7e1" : type === "colosse" ? "#c78bff" : "#ff9b62", 9, 1.4);
  audio.play("attack");
  vibrate(8);
  if ((b.available[type] || 0) === 0) {
    const next = TROOP_ORDER.find((id) => (b.available[id] || 0) > 0);
    if (next) b.selected = next;
  }
  renderTroopTray();
  saveState();
}

function troopTargetCenter(t) {
  if (!t) return null;
  return buildingCenter(t);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (!len2) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function findTroopTarget(troop) {
  const b = G.battle;
  if (!b) return null;
  let alive = b.buildings.filter((x) => !x.destroyed && x.type !== "wall");
  if (!alive.length) return null;
  let pool = alive;
  if (troop.favorite === "defense") {
    const defenses = alive.filter((x) => BUILDINGS[x.type]?.damage > 0);
    if (defenses.length) pool = defenses;
  }
  let best = null;
  let bestDist = Infinity;
  for (const bd of pool) {
    const c = buildingCenter(bd);
    const d = Math.hypot(c.x - troop.x, c.y - troop.y);
    if (d < bestDist) { bestDist = d; best = bd; }
  }
  if (!best) return null;
  // Melee troops break the first wall on their path. Ranged troops shoot over walls.
  if (troop.range < 1.5) {
    const walls = b.buildings.filter((x) => !x.destroyed && x.type === "wall");
    const targetC = buildingCenter(best);
    let wall = null;
    let wallDist = 0.72;
    for (const w of walls) {
      const c = buildingCenter(w);
      const segDist = distanceToSegment(c.x, c.y, troop.x, troop.y, targetC.x, targetC.y);
      const towardTarget = Math.hypot(c.x - troop.x, c.y - troop.y) < bestDist + 0.5;
      if (segDist < wallDist && towardTarget) {
        wallDist = segDist;
        wall = w;
      }
    }
    if (wall) return wall;
  }
  return best;
}

function damageBuilding(building, amount) {
  if (!building || building.destroyed) return;
  building.hp -= amount;
  if (building.hp <= 0) {
    building.hp = 0;
    building.destroyed = true;
    if (building.type !== "wall") {
      G.battle.destroyed++;
      const def = BUILDINGS[building.type];
      if (building.type === "goldmine" || building.type === "vault") {
        const loot = Math.round(65 + building.level * 34 + Math.random() * 40);
        G.battle.loot.gold += loot;
      } else if (building.type === "elixirpump" || building.type === "elixirstore") {
        const loot = Math.round(55 + building.level * 30 + Math.random() * 35);
        G.battle.loot.elixir += loot;
      } else if (building.type === "townhall") {
        G.battle.loot.gold += 120;
        G.battle.loot.elixir += 120;
      }
      if (def?.damage) G.battle.shake = Math.max(G.battle.shake, 5);
    }
    const c = buildingCenter(building);
    spawnParticles(c.x, c.y - 0.2, building.type === "goldmine" ? "#ffd35f" : "#ffb27c", 20, 2.8);
    spawnParticles(c.x, c.y, "#6f7e72", 10, 1.8);
    audio.play("cannon");
    G.battle.stars = computeStars();
    updateBattleHud();
  }
}

function damageTroop(troop, amount) {
  if (!troop || !troop.alive) return;
  troop.hp -= amount;
  if (troop.hp <= 0) {
    troop.hp = 0;
    troop.alive = false;
    spawnParticles(troop.x, troop.y - 0.25, "#ffe0bd", 10, 1.5);
    spawnParticles(troop.x, troop.y, "#788ea8", 6, 1.2);
    audio.play("hit");
  }
}

function spawnParticles(x, y, color, count = 10, force = 1) {
  if (!G.battle) {
    const p = worldToScreen(x, y);
    const layer = $("fxLayer");
    for (let i = 0; i < Math.min(count, 8); i++) {
      const node = document.createElement("i");
      node.className = "confetti";
      node.style.left = `${p.x + (Math.random() - 0.5) * 20}px`;
      node.style.top = `${p.y + (Math.random() - 0.5) * 10}px`;
      node.style.width = "5px";
      node.style.height = "5px";
      node.style.borderRadius = "50%";
      node.style.background = color;
      node.style.setProperty("--dx", `${(Math.random() - 0.5) * 80}px`);
      node.style.setProperty("--dy", `${-30 - Math.random() * 50}px`);
      node.style.setProperty("--rot", "0deg");
      layer.appendChild(node);
      setTimeout(() => node.remove(), 1400);
    }
    return;
  }
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU;
    const sp = (0.5 + Math.random() * 1.4) * force;
    G.battle.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 0.8 * force,
      life: 0.5 + Math.random() * 0.7, maxLife: 0.5 + Math.random() * 0.7,
      r: 0.035 + Math.random() * 0.07, color,
    });
  }
}

function spawnFloater(x, y, text, color = "#ffe6a1") {
  if (!G.battle) return;
  G.battle.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

function updateBattle(dt) {
  const b = G.battle;
  if (!b || b.over) return;
  b.time -= dt;
  if (b.time <= 0) {
    b.time = 0;
    endBattle();
    return;
  }
  const barracksLevel = Math.max(1, ...G.state.buildings.filter((x) => x.type === "barracks").map((x) => x.level));

  for (const troop of b.troops) {
    if (!troop.alive) continue;
    troop.cooldown -= dt;
    troop.retarget -= dt;
    if (!troop.target || troop.target.destroyed || troop.retarget <= 0) {
      troop.target = findTroopTarget(troop);
      troop.retarget = 0.75 + Math.random() * 0.5;
    }
    if (!troop.target) {
      troop.moving = false;
      continue;
    }
    const c = buildingCenter(troop.target);
    const dx = c.x - troop.x;
    const dy = c.y - troop.y;
    const dist = Math.hypot(dx, dy);
    troop.flip = dx < -0.05;
    const attackDist = troop.range + (BUILDINGS[troop.target.type]?.size?.[0] || 1) * 0.35;
    if (dist > attackDist) {
      const step = Math.min(dist - attackDist * 0.94, troop.speed * dt);
      troop.x += (dx / (dist || 1)) * step;
      troop.y += (dy / (dist || 1)) * step;
      troop.moving = true;
    } else {
      troop.moving = false;
      if (troop.cooldown <= 0) {
        troop.cooldown = troop.type === "colosse" ? 1.15 : troop.type === "plume" ? 0.82 : 0.68;
        if (troop.range > 1.5) {
          b.projectiles.push({
            kind: "troop", sx: troop.x, sy: troop.y - 0.15, x: troop.x, y: troop.y - 0.15,
            target: troop.target, damage: troop.dps * 0.8, t: 0, dur: 0.28, color: "#ffe7a0",
          });
        } else {
          damageBuilding(troop.target, troop.dps * 0.8);
          spawnFloater(c.x + (Math.random() - 0.5) * 0.5, c.y - 0.3, `-${Math.round(troop.dps * 0.8)}`, "#ffe6a1");
          spawnParticles(c.x, c.y - 0.15, "#ffd47a", 4, 0.7);
          audio.play("hit");
        }
      }
    }
  }

  // Defenses shoot back
  for (const building of b.buildings) {
    if (building.destroyed || !BUILDINGS[building.type]?.damage) continue;
    building.cooldown -= dt;
    if (building.cooldown > 0) continue;
    const c = buildingCenter(building);
    const range = BUILDINGS[building.type].range;
    let best = null;
    let bestDist = range;
    for (const troop of b.troops) {
      if (!troop.alive) continue;
      const d = Math.hypot(troop.x - c.x, troop.y - c.y);
      if (d < bestDist) { bestDist = d; best = troop; }
    }
    if (best) {
      building.cooldown = 1.15 + Math.random() * 0.35;
      const def = BUILDINGS[building.type];
      b.projectiles.push({
        kind: "defense", sx: c.x, sy: c.y - 0.4, x: c.x, y: c.y - 0.4,
        target: best, damage: def.damage * (1 + 0.1 * (building.level - 1)), t: 0, dur: 0.24,
        color: building.type === "tower" ? "#9bf5ff" : "#ffc06c",
      });
      audio.play("cannon");
    }
  }

  // Projectiles
  for (const p of b.projectiles) {
    p.t += dt / p.dur;
    if (p.kind === "defense" && p.target?.alive) {
      p.x = p.sx + (p.target.x - p.sx) * Math.min(1, p.t);
      p.y = p.sy + (p.target.y - p.sy) * Math.min(1, p.t);
    } else if (p.kind === "troop" && p.target) {
      const c = buildingCenter(p.target);
      p.x = p.sx + (c.x - p.sx) * Math.min(1, p.t);
      p.y = p.sy + (c.y - p.sy) * Math.min(1, p.t);
    }
    if (p.t >= 1) {
      if (p.kind === "defense" && p.target?.alive) {
        damageTroop(p.target, p.damage);
        spawnParticles(p.target.x, p.target.y - 0.25, "#ffd2a0", 5, 0.8);
        spawnFloater(p.target.x, p.target.y - 0.5, `-${Math.round(p.damage)}`, "#ff9c8b");
      } else if (p.kind === "troop" && p.target && !p.target.destroyed) {
        damageBuilding(p.target, p.damage);
        spawnFloater(p.target.x, p.target.y - 0.4, `-${Math.round(p.damage)}`, "#ffe6a1");
        spawnParticles(p.target.x, p.target.y - 0.2, "#ffd47a", 5, 0.8);
      }
      p.dead = true;
    }
  }
  b.projectiles = b.projectiles.filter((p) => !p.dead);

  for (const p of b.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += dt * 1.5;
    p.vx *= 0.98;
  }
  b.particles = b.particles.filter((p) => p.life > 0);
  for (const f of b.floaters) {
    f.life -= dt;
    f.y -= dt * 0.5;
  }
  b.floaters = b.floaters.filter((f) => f.life > 0);

  b.troops = b.troops.filter((t) => t.alive);
  b.stars = computeStars();
  b.shake = Math.max(0, b.shake - dt * 24);
  updateBattleHud();
  if (b.destroyed >= b.total) {
    endBattle();
  }
}

function endBattle() {
  const b = G.battle;
  if (!b || b.over) return;
  b.over = true;
  b.stars = computeStars();
  const pct = b.total ? Math.round((b.destroyed / b.total) * 100) : 0;
  const win = b.stars > 0;
  const goldGain = Math.min(b.loot.gold, getStorageCaps(G.state).gold - G.state.resources.gold);
  const elixirGain = Math.min(b.loot.elixir, getStorageCaps(G.state).elixir - G.state.resources.elixir);
  addResource("gold", goldGain);
  addResource("elixir", elixirGain);
  G.state.stats.goldLooted = (G.state.stats.goldLooted || 0) + Math.max(0, goldGain);
  const trophies = win ? 16 + b.stars * 5 : -12;
  addTrophies(trophies);
  if (win) {
    G.state.stats.battlesWon = (G.state.stats.battlesWon || 0) + 1;
    G.state.missions.battle = (G.state.missions.battle || 0) + 1;
    addXp(18 + b.stars * 7);
    audio.play("win");
    burstConfetti(36);
  } else {
    G.state.stats.battlesLost = (G.state.stats.battlesLost || 0) + 1;
    addXp(5);
    audio.play("lose");
  }
  b.result = {
    win, pct, stars: b.stars,
    gold: Math.max(0, goldGain),
    elixir: Math.max(0, elixirGain),
    trophies,
    destroyed: b.destroyed,
    total: b.total,
  };
  updateHUD(true);
  saveState();
  setTimeout(() => {
    if (G.battle === b) showBattleResult();
  }, 1000);
}

function showBattleResult() {
  const b = G.battle;
  if (!b?.result) return;
  const r = b.result;
  const stars = [1, 2, 3].map((i) => `<span class="${i <= r.stars ? "on" : ""}">★</span>`).join("");
  const html = `
    <div class="battle-result">
      <div class="result-crest ${r.win ? "" : "lose"}">${r.win ? icon("crown") : icon("shield")}</div>
      <h2>${r.win ? "Victoire !" : "Royaume défendu"}</h2>
      <p class="result-sub">${r.win ? "Ton armée a laissé sa marque sur les frontières de Nova." : "Ton armée n'a pas suffi cette fois. Renforce tes troupes et reviens."}</p>
      <div class="result-stars">${stars}</div>
      <div class="result-grid">
        <div class="result-box"><small>DESTRUCTION</small><b>${r.pct}%</b></div>
        <div class="result-box"><small>TROPHÉES</small><b class="${r.trophies >= 0 ? "gain" : "loss"}">${r.trophies >= 0 ? "+" : ""}${r.trophies}</b></div>
        <div class="result-box"><small>BÂTIMENTS</small><b>${r.destroyed}/${r.total}</b></div>
      </div>
      <div class="result-loot">
        <span>${icon("coin")}+${formatNumber(r.gold)}</span>
        <span class="elixir">${icon("drop")}+${formatNumber(r.elixir)}</span>
      </div>
      <div class="modal-actions split">
        <button class="btn ghost" data-action="rematch">${icon("swords")} Revanche</button>
        <button class="btn gold" data-action="return-home">${icon("home")} Retour au royaume</button>
      </div>
    </div>`;
  openModal(html);
}

function returnHome() {
  closeModal(true);
  document.body.classList.remove("in-battle");
  $("battleHud").hidden = true;
  $("battleHud").style.display = "";
  $("hud").style.display = "";
  G.mode = "village";
  G.battle = null;
  G.cam.zoom = 1;
  G.cam.panX = 0;
  G.cam.panY = 0;
  G.opponents = generateOpponents();
  updateNav("village");
  updateHUD(true);
  saveState();
  showToast("De retour au royaume. Ton Snox ID est enregistré.", "success", "check");
}

function openAbandonConfirm() {
  if (!G.battle) return;
  if (G.battle.over) {
    showBattleResult();
    return;
  }
  const html = `
    <div class="settings-head">
      <small>QUITTER LA BATAILLE</small>
      <h2>Abandonner l'expédition ?</h2>
      <p>Tu perdras les troupes déjà déployées et aucun butin ne sera conservé.</p>
    </div>
    <div class="snox-note">Les troupes restantes rentreront au camp. Les trophées ne changeront pas si tu abandonnes maintenant.</div>
    <div class="modal-actions split">
      <button class="btn ghost" data-action="abandon-cancel">Continuer le combat</button>
      <button class="btn red" data-action="abandon-confirm">Abandonner</button>
    </div>`;
  openModal(html);
}

/* ── Battle render ───────────────────────────────────────────────── */
function drawBattleWorld(context, t) {
  const b = G.battle;
  if (!b) return;
  drawIsland(context, t, { enemy: true });
  const s = G.view.scale;
  const items = b.buildings
    .filter((x) => !x.destroyed || x.type === "wall")
    .sort((a, c) => (a.x + a.y) - (c.x + c.y));
  for (const building of items) {
    const def = BUILDINGS[building.type];
    const c = buildingCenter(building);
    const p = tilePoint(c.x, c.y);
    if (building.destroyed) {
      drawRubble(context, p.x, p.y, def, s, t);
    } else {
      drawBuilding(context, building.type, building.level, p.x, p.y, s, t, { variant: building.x + building.y });
    }
  }
  // Troops sorted with world depth
  const troops = [...b.troops].sort((a, c) => (a.x + a.y) - (c.x + c.y));
  for (const troop of troops) {
    const p = tilePoint(troop.x, troop.y);
    drawTroop(context, troop.type, p.x, p.y, s * 0.88, t, {
      phase: troop.phase,
      moving: troop.moving,
      flip: troop.flip,
      hp: troop.hp,
      maxHp: troop.maxHp,
    });
  }
  // Projectiles
  for (const p of b.projectiles) {
    const pt = tilePoint(p.x, p.y);
    const prev = tilePoint(p.sx + (p.x - p.sx) * 0.75, p.sy + (p.y - p.sy) * 0.75);
    context.save();
    context.strokeStyle = p.color;
    context.globalAlpha = 0.5;
    context.lineWidth = 2.2 * s;
    context.beginPath();
    context.moveTo(prev.x, prev.y - 24 * s);
    context.lineTo(pt.x, pt.y - 24 * s);
    context.stroke();
    context.fillStyle = p.color;
    context.shadowColor = p.color;
    context.shadowBlur = 8;
    context.beginPath();
    context.arc(pt.x, pt.y - 24 * s, 3.2 * s, 0, TAU);
    context.fill();
    context.restore();
  }
  // Particles
  for (const p of b.particles) {
    const pt = tilePoint(p.x, p.y);
    context.save();
    context.globalAlpha = clamp(p.life / p.maxLife, 0, 1) * 0.85;
    context.fillStyle = p.color;
    context.beginPath();
    context.arc(pt.x, pt.y - 10 * s, p.r * G.view.tw, 0, TAU);
    context.fill();
    context.restore();
  }
  // Floating damage
  for (const f of b.floaters) {
    const pt = tilePoint(f.x, f.y);
    context.save();
    context.globalAlpha = clamp(f.life / f.maxLife, 0, 1);
    context.fillStyle = f.color;
    context.font = `800 ${Math.round(12 * G.view.scale)}px "Nunito", sans-serif`;
    context.textAlign = "center";
    context.fillText(f.text, pt.x, pt.y - 55 * s);
    context.restore();
  }
  // Deployment marker
  if (G.hoverTile && !b.over) {
    const p = tilePoint(G.hoverTile.x, G.hoverTile.y);
    const inBounds = G.hoverTile.x >= 0 && G.hoverTile.y >= 0 && G.hoverTile.x < GRID && G.hoverTile.y < GRID;
    if (inBounds) {
      context.save();
      context.strokeStyle = "rgba(137,255,189,.8)";
      context.fillStyle = "rgba(100,255,167,.16)";
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(p.x, p.y, G.view.tw * 0.7, G.view.th * 0.7, 0, 0, TAU);
      context.fill();
      context.stroke();
      context.strokeStyle = "rgba(137,255,189,.4)";
      context.beginPath();
      context.arc(p.x, p.y, G.view.tw * (0.7 + (Math.sin(t * 4) + 1) * 0.08), 0, TAU);
      context.stroke();
      context.restore();
    }
  }
}

function drawRubble(context, x, y, def, s, t) {
  context.save();
  context.globalAlpha = 0.8;
  context.fillStyle = "rgba(4,12,24,.28)";
  context.beginPath();
  context.ellipse(x, y + 4 * s, def.size[0] * 25 * s, def.size[1] * 12 * s, 0, 0, TAU);
  context.fill();
  const blocks = [
    [-13, 0, 6, 4], [5, -2, 8, 5], [13, 5, 5, 3], [-4, 7, 7, 4], [0, -9, 9, 4],
  ];
  for (let i = 0; i < blocks.length; i++) {
    const [dx, dy, w, h] = blocks[i];
    context.fillStyle = i % 2 ? "#6b746d" : "#505e59";
    context.beginPath();
    context.ellipse(x + dx * s, y + dy * s, w * s, h * s, 0.2, 0, TAU);
    context.fill();
  }
  context.globalAlpha = 0.35 + Math.sin(t * 2 + x) * 0.1;
  context.fillStyle = "#2e3632";
  context.beginPath();
  context.arc(x + 3 * s, y - 16 * s, 9 * s, 0, TAU);
  context.fill();
  context.restore();
}

function drawBattleBuildingHealth() {
  if (!G.battle) return;
  for (const b of G.battle.buildings) {
    if (b.destroyed || b.hp >= b.maxHp) continue;
    const c = buildingCenter(b);
    const p = worldToScreen(c.x, c.y);
    const s = G.view.scale * G.cam.zoom;
    const w = 34 * s;
    const y = p.y - 80 * s;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.55)";
    roundRect(ctx, p.x - w / 2, y, w, 4.5, 2);
    ctx.fill();
    ctx.fillStyle = "#78ec91";
    roundRect(ctx, p.x - w / 2 + 0.5, y + 0.5, (w - 1) * clamp(b.hp / b.maxHp, 0, 1), 3.5, 1.5);
    ctx.fill();
    ctx.restore();
  }
}

function renderBattle(t) {
  if (!G.battle) return;
  const b = G.battle;
  const shakeX = (Math.random() - 0.5) * b.shake;
  const shakeY = (Math.random() - 0.5) * b.shake;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  applyCameraTransform(ctx);
  drawBattleWorld(ctx, t);
  ctx.restore();
  drawBattleBuildingHealth();
}

/* ── Hit testing and input ───────────────────────────────────────── */
function getBuildingAt(tile) {
  const list = G.mode === "battle" ? G.battle?.buildings || [] : G.state.buildings;
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    const def = BUILDINGS[b.type];
    if (!def || b.destroyed) continue;
    if (tile.x >= b.x && tile.y >= b.y && tile.x < b.x + def.size[0] && tile.y < b.y + def.size[1]) return b;
  }
  return null;
}

function bubbleAt(px, py) {
  for (let i = G.bubbles.length - 1; i >= 0; i--) {
    const b = G.bubbles[i];
    if (Math.hypot(px - b.x, py - b.y) < b.r) return b;
  }
  return null;
}

function updateHoverFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  G.hoverScreen = { x: px, y: py };
  const tile = screenToTile(px, py);
  G.hoverTile = tile;
  if (G.build) updateBuildGhost(tile);
}

function onPointerDown(e) {
  if (e.button != null && e.button !== 0) return;
  if (!G.audioUnlocked) {
    G.audioUnlocked = true;
    audio.ensure();
  }
  const rect = canvas.getBoundingClientRect();
  G.pointer.down = true;
  G.pointer.dragging = false;
  G.pointer.id = e.pointerId;
  G.pointer.startX = e.clientX - rect.left;
  G.pointer.startY = e.clientY - rect.top;
  G.pointer.lastX = G.pointer.startX;
  G.pointer.lastY = G.pointer.startY;
  G.pointer.moved = 0;
  canvas.style.cursor = "grabbing";
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  updateHoverFromEvent(e);
}

function onPointerMove(e) {
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  if (G.pointer.down) {
    const dx = px - G.pointer.lastX;
    const dy = py - G.pointer.lastY;
    G.pointer.moved += Math.abs(dx) + Math.abs(dy);
    if (G.pointer.moved > 7) G.pointer.dragging = true;
    if (G.pointer.dragging) {
      G.cam.panX += dx;
      G.cam.panY += dy;
      const maxPanX = G.view.w * 0.8;
      const maxPanY = G.view.h * 0.65;
      G.cam.panX = clamp(G.cam.panX, -maxPanX, maxPanX);
      G.cam.panY = clamp(G.cam.panY, -maxPanY, maxPanY);
      G.pointer.lastX = px;
      G.pointer.lastY = py;
      return;
    }
  }
  G.hoverScreen = { x: px, y: py };
  const tile = screenToTile(px, py);
  G.hoverTile = tile;
  if (G.build) updateBuildGhost(tile);
  if (e.pointerType === "mouse") canvas.style.cursor = G.build ? "crosshair" : "grab";
}

function onPointerUp(e) {
  if (!G.pointer.down) return;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const wasDragging = G.pointer.dragging;
  G.pointer.down = false;
  G.pointer.dragging = false;
  canvas.style.cursor = "grab";
  try { canvas.releasePointerCapture(e.pointerId); } catch {}
  if (wasDragging) return;

  if (G.mode === "battle") {
    const tile = screenToTile(px, py);
    if (tile.fx > -0.1 && tile.fy > -0.1 && tile.fx < GRID + 0.1 && tile.fy < GRID + 0.1 && !G.battle?.over) {
      deployTroop(G.battle.selected, tile.fx, tile.fy);
    }
    return;
  }

  if (G.build) {
    const tile = screenToTile(px, py);
    updateBuildGhost(tile);
    if (G.build.valid) confirmPlacement();
    else {
      showToast("Cette parcelle est occupée ou réservée.", "error", "info");
      audio.play("error");
    }
    return;
  }

  const bubble = bubbleAt(px, py);
  if (bubble) {
    collectBuilding(bubble.building);
    return;
  }
  const tile = screenToTile(px, py);
  const b = getBuildingAt(tile);
  if (b) {
    G.selected = b;
    openBuildingSheet(b);
  } else {
    G.selected = null;
    if (G.sheet) closeSheet();
  }
}

function onWheel(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.08 : 0.08;
  G.cam.zoom = clamp(G.cam.zoom + delta, 0.62, 1.9);
}

function zoomBy(delta) {
  G.cam.zoom = clamp(G.cam.zoom + delta, 0.62, 1.9);
  audio.play("click");
}

function recenter() {
  G.cam.zoom = 1;
  G.cam.panX = 0;
  G.cam.panY = 0;
  audio.play("click");
  showToast("Caméra recentrée sur ton royaume.", "", "target");
}

/* ── Actions ─────────────────────────────────────────────────────── */
function claimMission(id) {
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) return;
  const claimed = new Set(G.state.missions.claimed || []);
  if (claimed.has(id)) return;
  if ((G.state.missions[id] || 0) < mission.target) {
    showToast(mission.hint, "", MISSION_ICONS[mission.icon]);
    return;
  }
  claimed.add(id);
  G.state.missions.claimed = [...claimed];
  G.state.resources.gems += mission.reward;
  audio.play("upgrade");
  burstConfetti(18);
  showToast(`Objectif accompli : +${mission.reward} gemmes !`, "success", "gem");
  updateHUD(true);
  saveState();
}

function resetGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  const fresh = makeDefaultState();
  fresh.profile.snoxId = makeSnoxId();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(fresh)); } catch {}
  location.reload();
}

function copySnoxId() {
  const text = G.state.profile.snoxId;
  const done = () => showToast("Snox ID copié. Garde-le précieusement.", "success", "copy");
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}

function fallbackCopy(text, done) {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    done();
  } catch {
    showToast("Impossible de copier automatiquement. Ton ID : " + text, "", "info");
  }
}

function toggleSound() {
  audio.enabled = !audio.enabled;
  G.state.sound = audio.enabled;
  if (audio.enabled) audio.play("click");
  updateHUD(true);
  saveState();
  showToast(audio.enabled ? "Effets sonores activés." : "Effets sonores coupés.", "", audio.enabled ? "sound-on" : "sound-off");
}

function handleAction(action, dataset, element) {
  if (!action) return;
  switch (action) {
    case "quest": claimMission(dataset.id); break;
    case "shop-tab":
      openShopSheet(dataset.cat, true);
      updateNav("shop");
      break;
    case "shop-card":
    case "shop-build":
      startPlacement(dataset.type);
      break;
    case "collect": {
      const b = G.state.buildings.find((x) => x.id === dataset.id);
      if (b) collectBuilding(b);
      break;
    }
    case "upgrade": {
      const b = G.state.buildings.find((x) => x.id === dataset.id);
      if (b) startUpgrade(b);
      break;
    }
    case "speedup": {
      const b = G.state.buildings.find((x) => x.id === dataset.id);
      if (b) speedUp(b);
      break;
    }
    case "move": {
      const b = G.state.buildings.find((x) => x.id === dataset.id);
      if (b) moveBuildingStart(b);
      break;
    }
    case "train": trainTroop(dataset.troop); break;
    case "attack": startBattle(Number(dataset.index)); break;
    case "reroll-opponents":
      G.opponents = generateOpponents();
      openAttackSheet(true);
      showToast("De nouveaux royaumes apparaissent à l'horizon.", "", "target");
      break;
    case "select-troop":
      if (G.battle) {
        G.battle.selected = dataset.troop;
        renderTroopTray();
        audio.play("click");
      }
      break;
    case "copy-id": copySnoxId(); break;
    case "edit-name": openEditName(); break;
    case "new-profile": openResetConfirm(); break;
    case "confirm-reset": resetGame(); break;
    case "reset-game": openResetConfirm(); break;
    case "close-modal": closeModal(); break;
    case "toggle-sound": toggleSound(); break;
    case "toggle-motion":
      G.reduceMotion = !G.reduceMotion;
      document.body.classList.toggle("reduce-motion", G.reduceMotion);
      if (element) element.classList.toggle("on", G.reduceMotion);
      showToast(G.reduceMotion ? "Animations réduites." : "Animations complètes.", "", "settings");
      break;
    case "recenter": recenter(); break;
    case "return-home": returnHome(); break;
    case "rematch": {
      const idx = G.opponents?.findIndex((o) => o.name === G.battle?.opponent.name);
      const target = idx >= 0 ? idx : 0;
      closeModal(true);
      document.body.classList.remove("in-battle");
      $("battleHud").hidden = true;
      $("hud").style.display = "";
      G.mode = "village";
      G.battle = null;
      if (!hasAvailableTroops()) {
        showToast("Ton armée est vide. Entraîne de nouvelles troupes.", "error", "helmet");
        openArmySheet();
        updateNav("army");
      } else {
        startBattle(target);
      }
      break;
    }
    case "abandon-confirm": {
      closeModal(true);
      document.body.classList.remove("in-battle");
      $("battleHud").hidden = true;
      $("hud").style.display = "";
      G.mode = "village";
      G.battle = null;
      G.cam.zoom = 1;
      G.cam.panX = 0;
      G.cam.panY = 0;
      updateNav("village");
      updateHUD(true);
      saveState();
      showToast("Expédition abandonnée. Tes troupes restantes sont rentrées.", "", "shield");
      break;
    }
    case "abandon-cancel": closeModal(true); break;
    case "close-sheet": closeSheet(); break;
    default: break;
  }
}

/* ── Event wiring ────────────────────────────────────────────────── */
function bindEvents() {
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", () => {
    G.pointer.down = false;
    G.pointer.dragging = false;
  });
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("resize", () => {
    resizeCanvas();
    drawAvatar($("avatarCanvas"));
  });
  window.addEventListener("orientationchange", () => setTimeout(resizeCanvas, 250));

  $("profileBtn").addEventListener("click", () => { audio.play("click"); openSnoxId(); });
  $("settingsBtn").addEventListener("click", () => { audio.play("click"); openSettings(); });
  $("soundBtn").addEventListener("click", toggleSound);
  $("gemsBtn").addEventListener("click", () => {
    audio.play("click");
    showToast("Les gemmes s'obtiennent en accomplissant les objectifs et en gagnant des batailles.", "", "gem");
  });
  $("goldBtn").addEventListener("click", () => { audio.play("click"); openShopSheet("resource"); updateNav("shop"); });
  $("elixirBtn").addEventListener("click", () => { audio.play("click"); openShopSheet("resource"); updateNav("shop"); });
  $("builderChip").addEventListener("click", () => { audio.play("click"); openBuildersSheet(); });
  $("questCollapse").addEventListener("click", () => $("questCard").classList.toggle("collapsed"));

  $("sheetClose").addEventListener("click", () => closeSheet());
  $("scrim").addEventListener("click", () => closeSheet());
  $("modalClose").addEventListener("click", () => closeModal());
  $("modalRoot").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-scrim")) closeModal();
  });

  $("cancelBuild").addEventListener("click", cancelPlacement);
  $("confirmBuild").addEventListener("click", confirmPlacement);
  $("battleExit").addEventListener("click", openAbandonConfirm);
  $("zoomIn").addEventListener("click", () => zoomBy(0.12));
  $("zoomOut").addEventListener("click", () => zoomBy(-0.12));
  $("recenter").addEventListener("click", recenter);

  document.querySelectorAll(".nav-item").forEach((nav) => {
    nav.addEventListener("click", () => {
      const view = nav.dataset.view;
      if (G.mode === "battle") return;
      audio.play("click");
      if (view === "village") {
        closeSheet(true);
        closeModal(true);
        G.selected = null;
        updateNav("village");
        recenter();
      } else if (view === "army") {
        openArmySheet();
        updateNav("army");
      } else if (view === "shop") {
        openShopSheet("resource");
        updateNav("shop");
      } else if (view === "attack") {
        openAttackSheet();
        updateNav("attack");
      } else if (view === "clan") {
        openClanSheet();
        updateNav("clan");
      }
    });
  });

  document.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    if (actionEl.disabled) return;
    handleAction(actionEl.dataset.action, actionEl.dataset, actionEl);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (G.modal) closeModal();
      else if (G.sheet) closeSheet();
      else if (G.build) cancelPlacement();
      else if (G.selected) { G.selected = null; closeSheet(); }
      return;
    }
    if (e.key === "+" || e.key === "=") zoomBy(0.12);
    if (e.key === "-") zoomBy(-0.12);
    if (e.key === "0") recenter();
    if (G.mode === "battle" && ["1", "2", "3"].includes(e.key)) {
      const id = TROOP_ORDER[Number(e.key) - 1];
      if ((G.battle.available[id] || 0) > 0) {
        G.battle.selected = id;
        renderTroopTray();
      }
    }
  });

  window.addEventListener("blur", () => {
    G.pointer.down = false;
    G.pointer.dragging = false;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) saveState();
  });
  window.addEventListener("beforeunload", saveState);
}

/* ── Economy / loop ──────────────────────────────────────────────── */
function tickProduction(dt) {
  for (const b of G.state.buildings) {
    const def = BUILDINGS[b.type];
    if (!def?.resource || b.built === false || b.construction) continue;
    const cap = productionCap(b);
    if ((b.stored || 0) >= cap) continue;
    b.stored = Math.min(cap, (b.stored || 0) + productionRate(b) * dt);
    b.lastTick = now();
  }
}

let constructionCheck = 0;
function frame(ts) {
  const dt = clamp((ts - (G.lastFrame || ts)) / 1000, 0, 0.05);
  G.lastFrame = ts;
  const speed = G.reduceMotion ? 0.25 : 1;
  G.time += dt * speed;

  if (G.mode === "village") tickProduction(dt);
  constructionCheck += dt;
  if (constructionCheck >= 0.45) {
    constructionCheck = 0;
    completeDueConstruction(true);
    updateBuilderChip();
  }

  if (G.mode === "battle") updateBattle(dt);

  G.uiAccum += dt;
  if (G.uiAccum > 0.24) {
    G.uiAccum = 0;
    updateHUD();
    if (G.mode === "battle") updateBattleHud();
  }

  G.saveAccum += dt;
  if (G.saveAccum > 6) {
    G.saveAccum = 0;
    saveState();
  }

  ctx.setTransform(G.view.dpr, 0, 0, G.view.dpr, 0, 0);
  ctx.clearRect(0, 0, G.view.w, G.view.h);

  if (G.mode === "village") {
    ctx.save();
    applyCameraTransform(ctx);
    drawVillageWorld(ctx, G.time);
    ctx.restore();
    drawBubbles(G.time);
    drawConstructionBadges(G.time);
    drawWorldParticles(G.time);
  } else {
    renderBattle(G.time);
  }

  requestAnimationFrame(frame);
}

/* ── Boot ────────────────────────────────────────────────────────── */
function init() {
  buildPathTiles();
  buildDecorations();
  resizeCanvas();
  bindEvents();
  G.opponents = generateOpponents();
  applyOfflineProgress();
  completeDueConstruction(false);
  updateHUD(true);
  updateNav("village");
  drawAvatar($("avatarCanvas"));
  saveState();
  requestAnimationFrame(frame);
  setTimeout(() => {
    $("boot").classList.add("ready");
    setTimeout(() => { $("boot").hidden = true; }, 700);
  }, 650);
  setTimeout(() => {
    const first = claimableMissions().length;
    if (first) showToast(`${first} objectif${first > 1 ? "s" : ""} prêt${first > 1 ? "s" : ""} à réclamer !`, "", "scroll");
    else showToast(`Bienvenue ${G.state.profile.name}. Ton Snox ID est actif.`, "success", "crown");
  }, 1500);
}

init();



