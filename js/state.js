import {
  KEYS, GENRES, THEMES, TITLE_SUFFIX, PLATFORMS, AUDIENCE, ENGINES,
  SCOPES, OFFICES, UPGRADES, ROLES, ROLE_IDS, CRITICS, QUOTES,
  FIRST_NAMES, LAST_NAMES, EVENT_POOL,
} from './data.js';

const SAVE_KEY = 'pixelforge.save.v1';
export let S = null;

/* ---------------- helpers ---------------- */
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const uid = () => Math.random().toString(36).slice(2, 9);
export const round1 = n => Math.round(n * 10) / 10;
export const fmtNum = n => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (a >= 1e4) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return Math.round(n).toLocaleString('en-US');
};
export const fmtMoney = n => (n < 0 ? '−$' : '$') + fmtNum(Math.abs(n));
export const fmtFull = n => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');

/* ---------------- state creation ---------------- */
function makeCandidate() {
  const role = pick(ROLE_IDS);
  const skill = clamp(Math.round(2 + Math.random() * 3 + S.rep / 45), 2, 8);
  const salary = Math.round((skill * 130 + ROLES[role].base) / 10) * 10;
  return {
    id: uid(),
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    role, skill, salary, morale: 78 + Math.round(Math.random() * 14),
    sign: salary * 3,
  };
}

function rollTrend() {
  return { genre: pick(Object.keys(GENRES)), theme: pick(Object.keys(THEMES)) };
}

function addNews(kind, text) {
  S.news.unshift({ kind, text, week: S.week, id: uid() });
  if (S.news.length > 44) S.news.length = 44;
}

export function createState(name) {
  S = {
    v: 1,
    name: (name || 'Neon Otter Games').trim().slice(0, 26) || 'Neon Otter Games',
    week: 1,
    cash: 75000,
    fans: 0,
    rep: 10,
    rp: 6,
    office: 'garage',
    upgrades: [],
    engines: ['basement'],
    platforms: ['pc', 'mobile'],
    staff: [
      { id: 'founder', name: 'You', role: 'designer', skill: 5, salary: 0, morale: 100, founder: true },
      { id: uid(), name: 'Mika Sato', role: 'programmer', skill: 3, salary: 620, morale: 88 },
    ],
    candidates: [],
    candidateWeek: 1,
    project: null,
    releases: [],
    news: [],
    history: [{ week: 1, cash: 75000, fans: 0, rep: 10 }],
    totals: { revenue: 0, spent: 0, copies: 0 },
    awards: 0,
    gameOver: false,
    negativeWeeks: 0,
    lastEvent: null,
    trend: rollTrend(),
    trendWeek: 1,
    achievements: [],
    settings: { sound: true },
    createdAt: Date.now(),
  };
  addNews('good', 'You unlocked the garage and plugged in a kettle. Time to make games.');
  addNews('info', 'Tip: a first game is small, cheap and forgiving. Start there.');
  refreshCandidates(true);
  return S;
}

export function setState(obj) {
  S = obj;
  if (!S.settings) S.settings = { sound: true };
  if (!S.totals) S.totals = { revenue: 0, spent: 0, copies: 0 };
  if (!Array.isArray(S.achievements)) S.achievements = [];
  if (!Array.isArray(S.news)) S.news = [];
  return S;
}

/* ---------------- persistence ---------------- */
export function saveState() {
  if (!S) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage may be blocked */ }
}
export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || obj.v !== 1 || !Array.isArray(obj.staff)) return null;
    return setState(obj);
  } catch (e) { return null; }
}
export function hasSave() {
  try { return Boolean(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
}
export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ }
}

/* ---------------- calendar / finance ---------------- */
export function weekInfo() {
  return { year: Math.floor((S.week - 1) / 52) + 1, week: ((S.week - 1) % 52) + 1 };
}
export function payroll() { return S.staff.reduce((a, m) => a + m.salary, 0); }
export function nextRoyalties() {
  return S.releases.reduce((a, r) => {
    if (r.weeksLeft <= 0) return a;
    return a + (r.schedule[r.schedule.length - r.weeksLeft] || 0);
  }, 0);
}
export function avgMorale() {
  if (!S.staff.length) return 0;
  return S.staff.reduce((a, m) => a + m.morale, 0) / S.staff.length;
}
export function avgSkill() {
  if (!S.staff.length) return 0;
  return S.staff.reduce((a, m) => a + m.skill, 0) / S.staff.length;
}

/* ---------------- production math ---------------- */
export function teamOutput() {
  let out = 0;
  for (const m of S.staff) out += m.skill * 8.5 * (0.6 + clamp(m.morale, 0, 100) / 100 * 0.5);
  if (S.upgrades.includes('desks')) out *= 1.08;
  if (S.upgrades.includes('render')) out *= 1.1;
  const engine = ENGINES[S.project?.engine || 'basement'];
  out *= engine.output;
  if (S.project?.crunch) out *= 1.22;
  return out;
}

export function teamAffinity() {
  const sum = { g: 0, a: 0, s: 0, t: 0 };
  for (const m of S.staff) {
    const aff = ROLES[m.role].affinity;
    for (const k of KEYS) sum[k] += aff[k] * m.skill;
  }
  const total = KEYS.reduce((a, k) => a + sum[k], 0) || 1;
  for (const k of KEYS) sum[k] /= total;
  return sum;
}

export function normalize(obj) {
  const total = KEYS.reduce((a, k) => a + Math.max(0, obj[k] || 0), 0);
  if (total <= 0) return { g: 0.25, a: 0.25, s: 0.25, t: 0.25 };
  const out = {};
  for (const k of KEYS) out[k] = Math.max(0, obj[k] || 0) / total;
  return out;
}

export function focusDist(p) {
  return normalize(p ? p.focus : { g: 25, a: 25, s: 25, t: 25 });
}

export function achievedDist(p) {
  const focus = focusDist(p);
  const aff = teamAffinity();
  const mix = {};
  for (const k of KEYS) mix[k] = focus[k] * 0.6 + aff[k] * 0.4;
  return normalize(mix);
}

export function distributionFit(p) {
  const ideal = GENRES[p.genre].ideal;
  const dist = achievedDist(p);
  let l1 = 0;
  for (const k of KEYS) l1 += Math.abs(dist[k] - ideal[k]);
  return clamp(1 - 0.7 * l1, 0.35, 1);
}

export function techCeiling(platformId) {
  return 3.6 + PLATFORMS[platformId].power * 0.064;
}

export function synergyFor(genreId, themeId) {
  const g = GENRES[genreId];
  if (g.likes.includes(themeId)) return 1.0;
  if (g.dislikes.includes(themeId)) return -0.9;
  return 0.1;
}

export function platformFit(platformId, genreId) {
  return AUDIENCE[PLATFORMS[platformId].audience][genreId] ?? 1;
}

export function trendBonus(genreId, themeId) {
  return (genreId === S.trend.genre ? 0.22 : 0) + (themeId === S.trend.theme ? 0.12 : 0);
}

export function upgradeCraft() {
  let c = 0;
  if (S.upgrades.includes('render')) c += 0.2;
  if (S.upgrades.includes('mocap')) c += 0.35;
  return c;
}

export function projectScore(p, jitter = false) {
  const cap = techCeiling(p.platform);
  const effort = clamp(p.work / p.required, 0, 1.02);
  const fit = distributionFit(p);
  const skill = avgSkill();
  let score = cap * effort * fit * (1 + (skill - 4) * 0.02);
  score += synergyFor(p.genre, p.theme);
  score += ENGINES[p.engine].craft + upgradeCraft();
  score += trendBonus(p.genre, p.theme);
  score += p.polish;
  score -= Math.min(3.4, p.bugs * 0.055);
  score *= 0.92 + 0.08 * platformFit(p.platform, p.genre);
  if (jitter) score += (Math.random() - 0.5) * 0.7;
  return clamp(score, 1, 9.9);
}

export function forecast(p) {
  const projected = p.work >= p.required ? p : { ...p, work: p.required };
  const s = projectScore(projected);
  return { lo: clamp(s - 0.35, 1, 9.9), hi: clamp(s + 0.35, 1, 9.9), mid: s };
}

export function initialHype(marketing) {
  return clamp(8 + marketing / 2200 + S.fans / 3000 + S.rep / 6, 5, 100);
}

export function progressPct(p) {
  return clamp((p.work / p.required) * 100, 0, 100);
}

export function etaWeeks(p) {
  if (!p || p.work >= p.required) return 0;
  return Math.max(1, Math.ceil((p.required - p.work) / Math.max(1, teamOutput())));
}

/* ---------------- project lifecycle ---------------- */
export function startProject(cfg) {
  if (S.project) return { error: 'A project is already in development.' };
  if (!S.platforms.includes(cfg.platform)) return { error: 'That platform is locked.' };
  if (!S.engines.includes(cfg.engine)) return { error: 'That engine is locked.' };
  const marketing = clamp(Math.round(cfg.marketing || 0), 0, 100000);
  if (S.cash < marketing) return { error: 'Not enough cash for that marketing budget.' };
  const p = {
    id: uid(),
    title: cfg.title || 'Untitled Game',
    genre: cfg.genre,
    theme: cfg.theme,
    platform: cfg.platform,
    engine: cfg.engine,
    scope: cfg.scope,
    required: SCOPES[cfg.scope].work,
    work: 0,
    points: { g: 0, a: 0, s: 0, t: 0 },
    focus: { g: 60, a: 55, s: 45, t: 55 },
    bugs: 0,
    polish: 0,
    polishStarted: false,
    polishWeeks: 0,
    marketing,
    hype: initialHype(marketing),
    crunch: false,
    startWeek: S.week,
    weeks: 0,
    lastPush: -99,
  };
  S.cash -= marketing;
  S.totals.spent += marketing;
  S.project = p;
  addNews('production', `${p.title} entered production on ${PLATFORMS[p.platform].name}.`);
  return { project: p };
}

export function toggleCrunch() {
  if (!S.project) return;
  S.project.crunch = !S.project.crunch;
}

export function marketingPush() {
  const p = S.project;
  if (!p) return { error: 'No active project.' };
  if (S.week - p.lastPush < 2) return { error: 'The press needs a breather. Try again next week.' };
  const cost = S.upgrades.includes('pr') ? 9000 : 12000;
  if (S.cash < cost) return { error: 'Not enough cash for a marketing push.' };
  const gain = S.upgrades.includes('pr') ? 16 : 12;
  S.cash -= cost;
  S.totals.spent += cost;
  p.hype = clamp(p.hype + gain, 0, 100);
  p.lastPush = S.week;
  addNews('good', `Marketing push for ${p.title}: hype is now ${Math.round(p.hype)}.`);
  return { cost, gain };
}

export function teamOuting() {
  const cost = 1000 + S.staff.length * 180;
  if (S.cash < cost) return { error: 'Not enough cash for a team outing.' };
  S.cash -= cost;
  S.totals.spent += cost;
  S.staff.forEach(m => { m.morale = clamp(m.morale + 20, 0, 100); });
  addNews('good', 'Team outing: tacos, bowling, and suspiciously good morale.');
  return { cost };
}

export function abandonProject() {
  if (!S.project) return;
  addNews('bad', `${S.project.title} was cancelled. The prototype lives in a drawer.`);
  S.project = null;
}

/* ---------------- releases ---------------- */
const PAYOUT_WEIGHTS = [0.28, 0.2, 0.15, 0.12, 0.1, 0.07, 0.05, 0.03];

function quoteFor(score) {
  return (QUOTES.find(q => score >= q.min) || QUOTES[QUOTES.length - 1]).text;
}

export function shipGame() {
  const p = S.project;
  if (!p || p.work < p.required) return null;
  const score = round1(projectScore(p, true));
  const critics = CRITICS.map(c => {
    const sc = round1(clamp(score + c.bias + (Math.random() - 0.5) * 0.5, 1, 10));
    return { name: c.name, short: c.short, score: sc, quote: quoteFor(sc) };
  });
  const base = 3500 + S.fans * 0.35 + p.hype * 120;
  const reviewMult = 0.3 + Math.pow(score / 10, 2.2) * 2.8;
  const hypeMult = 0.75 + p.hype / 100;
  const platMult = PLATFORMS[p.platform].share / 26;
  const scopeMult = SCOPES[p.scope].sales;
  const trendMult = 1 + (p.genre === S.trend.genre ? 0.12 : 0) + (p.theme === S.trend.theme ? 0.08 : 0);
  const repMult = 1 + S.rep / 300 + S.fans / 40000;
  const aud = platformFit(p.platform, p.genre);
  const copies = Math.max(120, Math.round(base * reviewMult * hypeMult * platMult * scopeMult * trendMult * repMult * aud));
  const price = SCOPES[p.scope].price;
  const gross = Math.round(copies * price);
  const cut = Math.round(gross * 0.72);
  const schedule = PAYOUT_WEIGHTS.map(w => Math.round(cut * w));
  schedule[schedule.length - 1] += cut - schedule.reduce((a, b) => a + b, 0);
  const fanGain = Math.max(0, Math.round(copies * Math.max(0, score - 5.5) / 55));
  const release = {
    id: p.id,
    title: p.title,
    genre: p.genre,
    theme: p.theme,
    platform: p.platform,
    scope: p.scope,
    score,
    critics,
    copies,
    gross,
    revenue: cut,
    week: S.week,
    schedule,
    weeksLeft: schedule.length,
    paid: 0,
    fans: fanGain,
    hype: Math.round(p.hype),
    goty: false,
    marketing: p.marketing,
  };
  S.releases.unshift(release);
  S.fans += fanGain;
  S.rep = clamp(S.rep + (score - 5.5) * 1.35, 0, 100);
  S.totals.copies += copies;
  S.totals.revenue += cut;
  if (S.history.length) {
    Object.assign(S.history[S.history.length - 1], { cash: Math.round(S.cash), fans: Math.round(S.fans), rep: Math.round(S.rep) });
  }
  S.project = null;
  addNews(score >= 8 ? 'good' : score >= 6 ? 'info' : 'bad',
    `${release.title} shipped to ${score.toFixed(1)}/10 reviews and ${copies.toLocaleString()} sales.`);
  const unlocked = checkAchievements();
  return { release, unlocked };
}

/* ---------------- staff & studio ---------------- */
export function refreshCandidates(force = false) {
  if (!force && S.week - S.candidateWeek < 4) return;
  S.candidates = Array.from({ length: 3 }, makeCandidate);
  S.candidateWeek = S.week;
}

export function hireCandidate(id) {
  const idx = S.candidates.findIndex(c => c.id === id);
  if (idx < 0) return { error: 'Candidate is gone.' };
  if (S.staff.length >= OFFICES[S.office].capacity) return { error: 'The office is full. Upgrade it first.' };
  const c = S.candidates[idx];
  if (S.cash < c.sign) return { error: 'Not enough cash for the signing bonus.' };
  S.cash -= c.sign;
  S.totals.spent += c.sign;
  S.staff.push({ id: c.id, name: c.name, role: c.role, skill: c.skill, salary: c.salary, morale: 85 });
  S.candidates.splice(idx, 1);
  S.candidates.push(makeCandidate());
  addNews('good', `${c.name} joined the team as a ${ROLES[c.role].name}.`);
  return { hired: c };
}

export function fireStaff(id) {
  const m = S.staff.find(x => x.id === id);
  if (!m || m.founder) return { error: 'The founder cannot be let go.' };
  S.staff = S.staff.filter(x => x.id !== id);
  addNews('warn', `${m.name} left the studio. The desk feels empty.`);
  return { fired: m };
}

export function trainStaff(id) {
  const m = S.staff.find(x => x.id === id);
  if (!m) return { error: 'Staff member not found.' };
  if (m.skill >= 10) return { error: `${m.name} is already a master.` };
  const cost = 3000 + m.skill * 1600;
  if (S.cash < cost) return { error: 'Not enough cash for training.' };
  S.cash -= cost;
  S.totals.spent += cost;
  m.skill += 1;
  m.morale = clamp(m.morale + 5, 0, 100);
  addNews('good', `${m.name} finished a training course. Skill is now ${m.skill}.`);
  return { cost, skill: m.skill };
}

export function buyUpgrade(id) {
  const u = UPGRADES[id];
  if (!u) return { error: 'Unknown upgrade.' };
  if (S.upgrades.includes(id)) return { error: 'Already installed.' };
  if (S.cash < u.cost) return { error: 'Not enough cash.' };
  S.cash -= u.cost;
  S.totals.spent += u.cost;
  S.upgrades.push(id);
  addNews('good', `Installed ${u.name}. The studio feels more professional already.`);
  return { upgrade: u };
}

export function buyEngine(id) {
  const e = ENGINES[id];
  if (!e) return { error: 'Unknown engine.' };
  if (S.engines.includes(id)) return { error: 'Already licensed.' };
  if (S.cash < e.cost) return { error: 'Not enough cash.' };
  if (S.rp < e.rp) return { error: 'Not enough research points.' };
  S.cash -= e.cost;
  S.totals.spent += e.cost;
  S.rp -= e.rp;
  S.engines.push(id);
  addNews('good', `R&D delivered: ${e.name} is now available.`);
  return { engine: e };
}

export function buyPlatform(id) {
  const p = PLATFORMS[id];
  if (!p) return { error: 'Unknown platform.' };
  if (S.platforms.includes(id)) return { error: 'Already a licensed developer.' };
  if (S.cash < p.cost) return { error: 'Not enough cash.' };
  if (S.rp < p.rp) return { error: 'Not enough research points.' };
  S.cash -= p.cost;
  S.totals.spent += p.cost;
  S.rp -= p.rp;
  S.platforms.push(id);
  addNews('good', `Dev kit acquired: ${p.name}. New audiences await.`);
  return { platform: p };
}

export function upgradeOffice() {
  const idx = Object.keys(OFFICES).indexOf(S.office);
  const nextId = Object.keys(OFFICES)[idx + 1];
  if (!nextId) return { error: 'You already own the best office in town.' };
  const next = OFFICES[nextId];
  if (S.cash < next.cost) return { error: 'Not enough cash for the move.' };
  S.cash -= next.cost;
  S.totals.spent += next.cost;
  S.office = nextId;
  addNews('good', `Moved into ${next.name}. More desks, more ambition.`);
  return { office: next };
}

/* ---------------- achievements ---------------- */
export const ACHIEVEMENTS = [
  { id: 'first-ship', name: 'First Ship', desc: 'Release your first game', test: s => s.releases.length >= 1, progress: s => [Math.min(s.releases.length, 1), 1], fmt: (a, b) => `${a}/${b}` },
  { id: 'hit', name: 'Critical Darling', desc: 'Ship a game scoring 8.0+', test: s => s.releases.some(r => r.score >= 8), progress: s => [s.releases.some(r => r.score >= 8) ? 1 : 0, 1], fmt: (a, b) => `${a}/${b}` },
  { id: 'veteran', name: 'Prolific', desc: 'Release 5 games', test: s => s.releases.length >= 5, progress: s => [Math.min(s.releases.length, 5), 5], fmt: (a, b) => `${a}/${b}` },
  { id: 'fanbase', name: 'Million Strong', desc: 'Reach 25,000 fans', test: s => s.fans >= 25000, progress: s => [Math.min(s.fans, 25000), 25000], fmt: (a, b) => `${fmtNum(a)}/${fmtNum(b)}` },
  { id: 'million', name: 'Scrooge McDuck', desc: 'Hold $1,000,000 cash', test: s => s.cash >= 1000000, progress: s => [Math.min(Math.max(s.cash, 0), 1000000), 1000000], fmt: (a, b) => `${fmtMoney(a)}/${fmtMoney(b)}` },
  { id: 'goty', name: 'Game of the Year', desc: 'Win a GOTY award', test: s => s.awards >= 1, progress: s => [Math.min(s.awards, 1), 1], fmt: (a, b) => `${a}/${b}` },
];

export function checkAchievements() {
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (!S.achievements.includes(a.id) && a.test(S)) {
      S.achievements.push(a.id);
      unlocked.push(a);
      addNews('good', `Achievement unlocked: ${a.name}.`);
    }
  }
  return unlocked;
}

export function nextMilestone() {
  for (const a of ACHIEVEMENTS) {
    if (S.achievements.includes(a.id)) continue;
    const [cur, max] = a.progress(S);
    return { ...a, cur, max, pct: clamp((cur / max) * 100, 0, 100) };
  }
  return null;
}

/* ---------------- week tick ---------------- */
export function advanceWeek() {
  if (!S || S.gameOver) return { toasts: [], award: null, bankrupt: false };
  const toasts = [];
  const p = S.project;

  if (p) {
    const out = teamOutput();
    const dist = achievedDist(p);
    p.work += out;
    for (const k of KEYS) p.points[k] += out * dist[k];
    p.weeks += 1;
    const morale = avgMorale();
    p.bugs += 0.45 + SCOPES[p.scope].bugs + (morale < 50 ? 0.5 : 0) + (p.crunch ? 0.35 : 0) + Math.random() * 0.35;
    if (p.work >= p.required) {
      if (!p.polishStarted) {
        p.polishStarted = true;
        toasts.push({ kind: 'good', text: `${p.title} is feature-complete. Polish it or ship it.` });
        addNews('production', `${p.title} reached feature-complete. The polish phase begins.`);
      }
      p.bugs = Math.max(0, p.bugs - (2.5 + S.staff.length * 0.9));
      p.polish = Math.min(0.8, p.polish + 0.1);
      p.polishWeeks += 1;
    }
  }

  // royalties from shipped games
  let royalties = 0;
  for (const r of S.releases) {
    if (r.weeksLeft > 0) {
      const idx = r.schedule.length - r.weeksLeft;
      const amt = r.schedule[idx] || 0;
      S.cash += amt;
      S.totals.revenue += amt;
      r.paid += amt;
      r.weeksLeft -= 1;
      royalties += amt;
    }
  }

  // payroll
  const pay = payroll();
  S.cash -= pay;
  S.totals.spent += pay;

  // research
  const rpGain = 2 + S.staff.length * 0.6 + S.staff.reduce((a, m) => a + m.skill, 0) * 0.12;
  S.rp = Math.min(999, S.rp + rpGain);

  // morale
  for (const m of S.staff) {
    let decay = 2.4;
    if (S.upgrades.includes('coffee')) decay *= 0.5;
    if (S.upgrades.includes('arcade')) decay -= 1.4;
    if (p?.crunch) decay += 2.2;
    m.morale = clamp(m.morale - decay, 5, 100);
  }

  // candidates rotate
  refreshCandidates(false);

  // market pulse
  if (S.week - S.trendWeek >= 7) {
    S.trend = rollTrend();
    S.trendWeek = S.week;
    addNews('market', `Market pulse: ${GENRES[S.trend.genre].name} + ${THEMES[S.trend.theme].name} is trending.`);
  }

  // random event
  if (Math.random() < 0.22) {
    let ev = pick(EVENT_POOL);
    if (ev.id === S.lastEvent) ev = pick(EVENT_POOL);
    S.lastEvent = ev.id;
    ev.apply(S);
    addNews(ev.kind, ev.text);
    toasts.push({ kind: ev.kind, text: ev.text });
  }

  // advance the clock
  S.week += 1;
  S.history.push({ week: S.week, cash: Math.round(S.cash), fans: Math.round(S.fans), rep: Math.round(S.rep) });
  if (S.history.length > 300) S.history.shift();

  // end-of-year awards
  let award = null;
  if (S.week > 1 && (S.week - 1) % 52 === 0) {
    const recent = S.releases.filter(r => r.week >= S.week - 52);
    if (recent.length) {
      const best = recent.reduce((a, b) => (a.score > b.score ? a : b));
      const rival = 7.7 + Math.random() * 1.7;
      if (best.score >= rival) {
        best.goty = true;
        S.awards += 1;
        S.fans += 3000 + Math.round(best.copies * 0.05);
        S.cash += 75000;
        addNews('award', `${best.title} wins Game of the Year! The trophy shelf begins.`);
        award = { won: true, title: best.title, score: best.score, rival: round1(rival) };
      } else {
        addNews('industry', `${best.title} was nominated for GOTY but lost to a rival (${rival.toFixed(1)}).`);
        award = { won: false, title: best.title, score: best.score, rival: round1(rival) };
      }
    } else {
      addNews('industry', 'The annual awards show crowns another studio. You were not nominated.');
      award = { won: false, none: true };
    }
  }

  // achievements + solvency
  const unlocked = checkAchievements();
  for (const a of unlocked) toasts.push({ kind: 'good', text: `Achievement: ${a.name}` });

  let bankrupt = false;
  if (S.cash < 0) {
    S.negativeWeeks += 1;
    if (S.negativeWeeks >= 2) {
      S.gameOver = true;
      bankrupt = true;
      addNews('bad', 'The studio ran out of money. The lights are off.');
    } else {
      toasts.push({ kind: 'bad', text: 'Payroll pushed you into the red. Fix this next week or fold.' });
    }
  } else {
    S.negativeWeeks = 0;
  }

  return { toasts, award, bankrupt, royalties, pay };
}
