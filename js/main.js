import {
  S, createState, loadState, hasSave, saveState, clearSave,
  advanceWeek, shipGame, startProject, abandonProject, toggleCrunch,
  marketingPush, teamOuting, hireCandidate, fireStaff, trainStaff,
  buyUpgrade, buyEngine, buyPlatform, upgradeOffice,
  progressPct, achievedDist, distributionFit, forecast, clamp, fmtMoney,
} from './state.js';
import {
  renderChrome, renderMain, wizardHTML, resultsHTML, awardHTML,
  gameOverHTML, helpHTML, menuHTML, confirmHTML, esc,
} from './ui.js';
import { GENRES, THEMES, TITLE_SUFFIX, PLATFORMS, ENGINES } from './data.js';
import { icon } from './icons.js';

const view = { tab: 'studio', fast: false };
let wiz = null;
let fastTimer = null;
let audio = null;

const $ = sel => document.querySelector(sel);
const modalRoot = () => document.getElementById('modal-root');

/* ---------------- sound ---------------- */
function ensureAudio() {
  if (!audio) {
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; }
  }
  if (audio && audio.state === 'suspended') audio.resume().catch(() => {});
}
function tone(freq, dur = 0.08, type = 'sine', gain = 0.035, when = 0) {
  if (!audio || !S?.settings?.sound) return;
  const t = audio.currentTime + when;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function sfx(name) {
  if (!S?.settings?.sound) return;
  ensureAudio();
  if (name === 'click') tone(520, 0.05, 'triangle', 0.025);
  else if (name === 'good') { tone(660, 0.1, 'sine', 0.04); tone(990, 0.14, 'sine', 0.03, 0.08); }
  else if (name === 'bad') { tone(220, 0.16, 'sawtooth', 0.025); tone(160, 0.2, 'sawtooth', 0.02, 0.08); }
  else if (name === 'coin') { tone(880, 0.06, 'square', 0.02); tone(1320, 0.1, 'square', 0.018, 0.05); }
  else if (name === 'ship') { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.035, i * 0.09)); }
  else if (name === 'unlock') { [440, 554, 659].forEach((f, i) => tone(f, 0.18, 'sine', 0.035, i * 0.07)); }
}

/* ---------------- boot / screens ---------------- */
function showTitle() {
  stopFast();
  $('#shell').hidden = true;
  $('#title-screen').hidden = false;
  const cont = $('#continue-btn');
  if (cont) cont.hidden = !hasSave();
  closeModal();
}
function showGame() {
  $('#title-screen').hidden = true;
  $('#shell').hidden = false;
  render();
}
function render() {
  if (!S) return;
  renderChrome(view);
  const main = $('#main');
  const top = main.scrollTop;
  main.innerHTML = renderMain(view);
  main.scrollTop = top;
}
function refreshChrome() {
  if (S) renderChrome(view);
}

function makeTitle(genre, theme) {
  const words = THEMES[theme].words;
  const suffix = TITLE_SUFFIX[genre];
  return `${words[Math.floor(Math.random() * words.length)]} ${suffix[Math.floor(Math.random() * suffix.length)]}`;
}

function startNew(name) {
  createState(name);
  view.tab = 'studio';
  view.fast = false;
  saveState();
  showGame();
  sfx('good');
  toast('Studio founded. The garage smells like ambition.', 'good');
}

function continueGame() {
  const loaded = loadState();
  if (!loaded) { toast('Could not load that save.', 'bad'); return; }
  view.tab = 'studio';
  view.fast = false;
  showGame();
  sfx('good');
  toast('Welcome back. The kettle is still warm.', 'info');
}

/* ---------------- toasts ---------------- */
function toast(text, kind = 'info', iconName) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  const ic = iconName || (kind === 'bad' ? 'bug' : kind === 'good' ? 'check' : kind === 'warn' ? 'zap' : 'spark');
  el.className = `toast ${kind}`;
  el.innerHTML = `<span class="toast-ic">${icon(ic, 16)}</span><span>${esc(text)}</span>`;
  root.appendChild(el);
  while (root.children.length > 4) root.firstElementChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, 4200);
}

/* ---------------- modals ---------------- */
function openModal(html, cls = '') {
  const root = modalRoot();
  root.innerHTML = `<div class="modal-backdrop"><div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
  requestAnimationFrame(() => root.classList.add('open'));
}
function closeModal() {
  const root = modalRoot();
  root.classList.remove('open');
  root.innerHTML = '';
}
function modalOpen() { return Boolean(modalRoot().firstElementChild); }
function refreshModal(html, cls) {
  const modal = modalRoot().querySelector('.modal');
  if (!modal) return;
  const top = modal.scrollTop;
  modal.className = `modal ${cls || modal.className.replace('modal', '').trim()}`;
  modal.innerHTML = html;
  modal.scrollTop = top;
}

/* ---------------- week flow ---------------- */
function stopFast() {
  if (fastTimer) { clearInterval(fastTimer); fastTimer = null; }
  view.fast = false;
  refreshChrome();
}
function toggleFast() {
  if (view.fast) { stopFast(); return; }
  if (S.gameOver) return;
  view.fast = true;
  fastTimer = setInterval(() => {
    if (!S || S.gameOver || modalOpen()) { stopFast(); return; }
    doAdvance(true);
  }, 850);
  refreshChrome();
  toast('Fast forward on. Press pause or open a modal to stop.', 'info');
}
function doAdvance(silent = false) {
  if (!S || S.gameOver) return;
  const res = advanceWeek();
  render();
  saveState();
  if (res.toasts?.length) {
    const seen = new Set();
    for (const t of res.toasts.slice(0, 3)) {
      if (seen.has(t.text)) continue;
      seen.add(t.text);
      toast(t.text, t.kind);
    }
  }
  if (res.bankrupt) {
    stopFast();
    openModal(gameOverHTML(), 'narrow');
    sfx('bad');
  } else if (res.award?.won) {
    stopFast();
    openModal(awardHTML(res.award), 'narrow');
    sfx('good');
  } else if (!silent && res.royalties > 0) {
    // subtle money feedback on manual advances only
  }
}

/* ---------------- wizard ---------------- */
function openWizard() {
  if (S.project) { toast('Finish or cancel the current project first.', 'warn'); return; }
  const genre = 'action';
  const theme = 'fantasy';
  wiz = {
    step: 1,
    genre, theme,
    platform: S.platforms.includes('pc') ? 'pc' : S.platforms[0],
    scope: 'small',
    engine: S.engines[S.engines.length - 1] || 'basement',
    marketing: Math.min(5000, Math.max(0, Math.floor(S.cash / 1000) * 1000)),
    title: makeTitle(genre, theme),
    titleEdited: false,
  };
  openModal(wizardHTML(wiz), 'wide wizard-modal');
}
function refreshWizard() {
  if (!wiz) return;
  refreshModal(wizardHTML(wiz), 'wide wizard-modal');
}
function startWizardProject() {
  if (!wiz) return;
  const res = startProject({
    title: wiz.title.trim() || makeTitle(wiz.genre, wiz.theme),
    genre: wiz.genre, theme: wiz.theme, platform: wiz.platform,
    engine: wiz.engine, scope: wiz.scope, marketing: wiz.marketing,
  });
  if (res.error) { toast(res.error, 'bad'); sfx('bad'); return; }
  wiz = null;
  closeModal();
  view.tab = 'project';
  render();
  saveState();
  sfx('good');
  toast('Production started. Tune the creative focus and advance the week.', 'good');
}

/* ---------------- action handlers ---------------- */
function handleAction(action, data) {
  if (!S && action !== 'close-modal') return;

  switch (action) {
    case 'tab':
      view.tab = data.tab;
      render();
      $('#main').scrollTop = 0;
      return;

    case 'advance':
      if (modalOpen()) return;
      doAdvance();
      return;

    case 'fast':
      toggleFast();
      return;

    case 'sound':
      S.settings.sound = !S.settings.sound;
      saveState();
      refreshChrome();
      if (S.settings.sound) { ensureAudio(); sfx('good'); }
      if (modalOpen()) refreshModal(menuHTML(), 'narrow menu-modal');
      return;

    case 'menu':
      openModal(menuHTML(), 'narrow menu-modal');
      return;

    case 'help':
      openModal(helpHTML(), 'wide help-modal');
      return;

    case 'close-modal':
      closeModal();
      return;

    case 'save-now':
      saveState();
      toast('Game saved locally.', 'good');
      return;

    case 'new-project':
      openWizard();
      return;

    case 'wiz-genre':
      wiz.genre = data.id;
      if (!wiz.titleEdited) wiz.title = makeTitle(wiz.genre, wiz.theme);
      refreshWizard();
      return;
    case 'wiz-theme':
      wiz.theme = data.id;
      if (!wiz.titleEdited) wiz.title = makeTitle(wiz.genre, wiz.theme);
      refreshWizard();
      return;
    case 'wiz-platform':
      if (!S.platforms.includes(data.id)) return;
      wiz.platform = data.id;
      refreshWizard();
      return;
    case 'wiz-scope':
      wiz.scope = data.id;
      refreshWizard();
      return;
    case 'wiz-engine':
      if (!S.engines.includes(data.id)) return;
      wiz.engine = data.id;
      refreshWizard();
      return;
    case 'wiz-shuffle':
      wiz.title = makeTitle(wiz.genre, wiz.theme);
      wiz.titleEdited = false;
      refreshWizard();
      return;
    case 'wiz-back':
      wiz.step = Math.max(1, wiz.step - 1);
      refreshWizard();
      return;
    case 'wiz-next':
      wiz.step = Math.min(3, wiz.step + 1);
      refreshWizard();
      return;
    case 'wiz-start':
      startWizardProject();
      return;

    case 'crunch':
      toggleCrunch();
      render();
      saveState();
      return;

    case 'push': {
      const res = marketingPush();
      if (res.error) { toast(res.error, 'warn'); sfx('bad'); return; }
      toast(`Marketing push: +${res.gain} hype for ${fmtMoney(res.cost)}.`, 'good');
      sfx('coin');
      render();
      saveState();
      return;
    }

    case 'outing': {
      const res = teamOuting();
      if (res.error) { toast(res.error, 'warn'); sfx('bad'); return; }
      toast('Team outing! Morale restored, one week gone.', 'good');
      sfx('good');
      doAdvance(true);
      render();
      saveState();
      return;
    }

    case 'ship': {
      if (!S.project) return;
      if (progressPct(S.project) < 100) { toast('The game is not finished yet.', 'warn'); return; }
      stopFast();
      const result = shipGame();
      if (!result) return;
      render();
      saveState();
      openModal(resultsHTML(result), 'wide results-modal');
      sfx('ship');
      return;
    }

    case 'abandon':
      openModal(confirmHTML({
        title: 'Cancel this project?',
        body: 'All production progress, marketing spend and hype will be lost. The team will be free to start again.',
        label: 'Cancel project',
        action: 'confirm-abandon',
        danger: true,
      }), 'narrow');
      return;

    case 'confirm-abandon':
      abandonProject();
      closeModal();
      view.tab = 'studio';
      render();
      saveState();
      toast('Project cancelled. The whiteboard is blank again.', 'warn');
      return;

    case 'hire': {
      const res = hireCandidate(data.id);
      if (res.error) { toast(res.error, 'warn'); sfx('bad'); return; }
      toast(`${res.hired.name} joined the team.`, 'good');
      sfx('coin');
      render();
      saveState();
      return;
    }

    case 'fire':
      openModal(confirmHTML({
        title: 'Let this developer go?',
        body: 'They will leave immediately. No severance, but the team may notice.',
        label: 'Let them go',
        action: 'confirm-fire',
        data: `data-id="${data.id}"`,
        danger: true,
      }), 'narrow');
      return;

    case 'confirm-fire': {
      const res = fireStaff(data.id);
      closeModal();
      if (res.error) { toast(res.error, 'warn'); return; }
      toast(`${res.fired.name} left the studio.`, 'warn');
      render();
      saveState();
      return;
    }

    case 'train': {
      const res = trainStaff(data.id);
      if (res.error) { toast(res.error, 'warn'); sfx('bad'); return; }
      toast(`Training complete. Skill is now ${res.skill}.`, 'good');
      sfx('unlock');
      render();
      saveState();
      return;
    }

    case 'buy-upgrade': {
      const res = buyUpgrade(data.id);
      if (res.error) { toast(res.error, 'warn'); sfx('bad'); return; }
      toast(`${res.upgrade.name} installed.`, 'good');
      sfx('unlock');
      render();
      saveState();
      return;
    }

    case 'buy-engine': {
      const res = buyEngine(data.id);
      if (res.error) { toast(res.error, 'warn'); sfx('bad'); return; }
      toast(`${res.engine.name} licensed.`, 'good');
      sfx('unlock');
      render();
      saveState();
      return;
    }

    case 'buy-platform': {
      const res = buyPlatform(data.id);
      if (res.error) { toast(res.error, 'warn'); sfx('bad'); return; }
      toast(`Dev kit for ${res.platform.name} acquired.`, 'good');
      sfx('unlock');
      render();
      saveState();
      return;
    }

    case 'office': {
      const res = upgradeOffice();
      if (res.error) { toast(res.error, 'warn'); sfx('bad'); return; }
      toast(`Moved into ${res.office.name}.`, 'good');
      sfx('unlock');
      render();
      saveState();
      return;
    }

    case 'restart':
      openModal(confirmHTML({
        title: 'Start a new studio?',
        body: 'This deletes the current save, including every shipped game and trophy. There is no undo.',
        label: 'Start over',
        action: 'confirm-restart',
        danger: true,
      }), 'narrow');
      return;

    case 'confirm-restart':
      clearSave();
      closeModal();
      showTitle();
      toast('Save cleared. Name your new studio.', 'info');
      return;

    default:
      return;
  }
}

/* ---------------- focus slider live updates ---------------- */
function updateFocusUI() {
  const p = S?.project;
  if (!p) return;
  const dist = achievedDist(p);
  const fit = distributionFit(p);
  const f = forecast(p);
  const main = $('#main');
  for (const k of ['g', 'a', 's', 't']) {
    const share = main.querySelector(`[data-share="${k}"]`);
    if (share) share.style.width = `${dist[k] * 100}%`;
    const shareVal = main.querySelector(`[data-shareval="${k}"]`);
    if (shareVal) shareVal.textContent = `${Math.round(dist[k] * 100)}%`;
    const focusVal = main.querySelector(`[data-focusval="${k}"]`);
    if (focusVal) focusVal.textContent = `${Math.round((p.focus[k] / Math.max(1, p.focus.g + p.focus.a + p.focus.s + p.focus.t)) * 100)}%`;
    const mix = main.querySelector(`[data-mix="${k}"]`);
    if (mix) mix.style.width = `${dist[k] * 100}%`;
  }
  const fill = main.querySelector('[data-fit-fill]');
  if (fill) {
    fill.style.width = `${fit * 100}%`;
    fill.style.setProperty('--c1', fit > .85 ? '#5eead4' : fit > .7 ? '#fbbf24' : '#fb7185');
    fill.style.setProperty('--c2', fit > .85 ? '#38bdf8' : fit > .7 ? '#fde68a' : '#ef4444');
  }
  const fv = main.querySelector('[data-fit-val]');
  if (fv) fv.innerHTML = `${Math.round(fit * 100)}<span>%</span>`;
  const fc = main.querySelector('[data-forecast]');
  if (fc) {
    fc.textContent = `${f.lo.toFixed(1)} – ${f.hi.toFixed(1)}`;
    fc.style.color = f.mid >= 8.5 ? '#5eead4' : f.mid >= 7 ? '#a3e635' : f.mid >= 5.5 ? '#fbbf24' : '#fb7185';
  }
}

/* ---------------- global events ---------------- */
document.addEventListener('click', e => {
  const backdrop = e.target.closest('.modal-backdrop');
  if (backdrop && e.target === backdrop) { closeModal(); return; }
  const target = e.target.closest('[data-action]');
  if (!target) return;
  e.preventDefault();
  ensureAudio();
  if (target.dataset.action !== 'sound') sfx('click');
  handleAction(target.dataset.action, target.dataset);
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.matches('[data-focus]') && S?.project) {
    S.project.focus[t.dataset.focus] = Number(t.value);
    t.style.setProperty('--v', `${t.value}%`);
    updateFocusUI();
  }
  if (t.matches('[data-wiz-title]') && wiz) {
    wiz.title = t.value;
    wiz.titleEdited = true;
  }
  if (t.matches('[data-wiz-marketing]') && wiz) {
    wiz.marketing = Number(t.value);
    t.style.setProperty('--v', `${t.max ? (t.value / t.max) * 100 : 0}%`);
    const out = document.querySelector('[data-marketing-val]');
    if (out) out.textContent = fmtMoney(wiz.marketing);
    const hype = document.querySelector('[data-hype-val]');
    if (hype) hype.textContent = Math.round(clamp(8 + wiz.marketing / 2200 + S.fans / 3000 + S.rep / 6, 5, 100));
  }
});

document.addEventListener('change', e => {
  if (e.target.matches('[data-focus]')) saveState();
  if (e.target.matches('[data-wiz-marketing]') && wiz) refreshWizard();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalOpen()) { closeModal(); return; }
  const typing = e.target.closest('input, textarea, select, button, a, [role="button"]');
  if (typing) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (!modalOpen() && S && !S.gameOver) doAdvance();
  }
  if (e.key >= '1' && e.key <= '5' && !modalOpen() && S) {
    const tabs = ['studio', 'project', 'team', 'market', 'releases'];
    view.tab = tabs[Number(e.key) - 1];
    render();
    $('#main').scrollTop = 0;
  }
});

window.addEventListener('beforeunload', () => { if (S) saveState(); });

/* ---------------- title screen wiring ---------------- */
$('#start-btn').addEventListener('click', () => {
  ensureAudio();
  const name = $('#studio-name').value.trim() || 'Neon Otter Games';
  startNew(name);
});
$('#continue-btn').addEventListener('click', () => {
  ensureAudio();
  continueGame();
});
$('#name-shuffle').addEventListener('click', () => {
  const names = ['Neon Otter Games', 'Tiny Comet Studio', 'Pixel Alchemy', 'Lucky Glitch', 'Moonbase Games', 'Third Coffee', 'Paper Rocket', 'Velvet Byte', 'Wildcard Works', 'Bit Orchard'];
  const input = $('#studio-name');
  input.value = names[Math.floor(Math.random() * names.length)];
  sfx('click');
});

/* ---------------- init ---------------- */
(function init() {
  showTitle();
  if (hasSave()) {
    const cont = $('#continue-btn');
    cont.hidden = false;
    const loaded = loadState();
    if (loaded) {
      // keep loaded state in memory so Continue is instant, but stay on title
      $('#studio-name').value = loaded.name;
    }
  }
  // preload the title screen only; game starts on click
})();
