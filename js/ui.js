import {
  S, weekInfo, payroll, nextRoyalties, avgMorale, avgSkill, teamOutput,
  progressPct, etaWeeks, forecast, distributionFit, achievedDist, focusDist,
  techCeiling, synergyFor, platformFit, teamAffinity, nextMilestone,
  ACHIEVEMENTS, fmtNum, fmtMoney, fmtFull, clamp, round1,
} from './state.js';
import {
  GENRES, THEMES, PLATFORMS, ENGINES, SCOPES, OFFICES, UPGRADES,
  ROLES, KEYS, DISC,
} from './data.js';
import { icon } from './icons.js';
import { officeSVG } from './office.js';

export const TABS = [
  { id: 'studio', label: 'Studio', icon: 'home' },
  { id: 'project', label: 'Project', icon: 'gamepad' },
  { id: 'team', label: 'Team', icon: 'users' },
  { id: 'market', label: 'Market', icon: 'globe' },
  { id: 'releases', label: 'Releases', icon: 'trophy' },
];

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function scoreClass(n) {
  if (n >= 8.5) return 'great';
  if (n >= 7) return 'good';
  if (n >= 5.5) return 'mid';
  return 'bad';
}
export const scoreColor = n => n >= 8.5 ? '#5eead4' : n >= 7 ? '#a3e635' : n >= 5.5 ? '#fbbf24' : '#fb7185';

const gradeLabel = n => n >= 8.5 ? 'Must play' : n >= 7 ? 'Great' : n >= 5.5 ? 'Mixed' : 'Rough';

export function genreChip(id, small = false) {
  const g = GENRES[id];
  return `<span class="chip ${small ? 'chip-sm' : ''}" style="--c1:${g.color[0]};--c2:${g.color[1]}"><i class="chip-mono">${g.mono}</i>${g.name}</span>`;
}
export function themeChip(id, small = false) {
  const t = THEMES[id];
  return `<span class="chip ${small ? 'chip-sm' : ''}" style="--c1:${t.color[0]};--c2:${t.color[1]}"><i class="chip-mono">${t.mono}</i>${t.name}</span>`;
}
export function platformChip(id, small = false) {
  const p = PLATFORMS[id];
  return `<span class="chip ${small ? 'chip-sm' : ''}" style="--c1:${p.color[0]};--c2:${p.color[1]}"><i class="chip-mono">${p.mono}</i>${p.name}</span>`;
}
export function scopeChip(id) {
  return `<span class="chip chip-plain">${icon('chart', 13)} ${SCOPES[id].name}</span>`;
}

function stat(ic, label, value, tone = '') {
  return `<div class="stat ${tone}"><span class="stat-ic">${icon(ic, 17)}</span><div class="stat-txt"><small>${label}</small><b>${value}</b></div></div>`;
}

export function renderChrome(view) {
  const wi = weekInfo();
  const cashTone = S.cash < 0 ? 'bad' : S.cash < 8000 ? 'warn' : '';
  document.getElementById('topstats').innerHTML =
    `<div class="stat stat-week"><span class="stat-ic">${icon('calendar', 16)}</span><div class="stat-txt"><small>Year ${wi.year}</small><b>Week ${wi.week}</b></div></div>` +
    stat('coin', 'Cash', fmtMoney(S.cash), cashTone) +
    stat('users', 'Fans', fmtNum(S.fans)) +
    stat('star', 'Rep', Math.round(S.rep) + '%') +
    stat('flask', 'Research', Math.floor(S.rp));

  const soundBtn = document.getElementById('sound-btn');
  soundBtn.innerHTML = icon(S.settings.sound ? 'soundOn' : 'soundOff', 19);
  soundBtn.classList.toggle('muted', !S.settings.sound);
  document.getElementById('fast-btn').innerHTML = icon(view.fast ? 'pause' : 'play', 17);
  document.getElementById('fast-btn').classList.toggle('active', view.fast);
  document.querySelector('.adv-icon').innerHTML = icon('play', 16);
  document.querySelector('[data-action="menu"]').innerHTML = icon('menu', 19);

  const side = TABS.map(t => {
    const badge = t.id === 'project' && S.project ? '<i class="nav-dot"></i>' : '';
    return `<button class="nav-item ${view.tab === t.id ? 'active' : ''}" data-action="tab" data-tab="${t.id}">
      ${icon(t.icon, 19)}<span>${t.label}</span>${badge}
    </button>`;
  }).join('');
  document.getElementById('sidebar').innerHTML = `
    <div class="side-nav">${side}</div>
    <div class="side-foot">
      <div class="side-office">
        <span class="eyebrow">STUDIO</span>
        <b>${esc(S.name)}</b>
        <small>${OFFICES[S.office].name} · ${S.staff.length}/${OFFICES[S.office].capacity} desks</small>
      </div>
      <button class="side-link" data-action="help">${icon('spark', 15)} How to play</button>
      <button class="side-link" data-action="menu">${icon('menu', 15)} Menu &amp; save</button>
    </div>`;
  document.getElementById('bottomnav').innerHTML = TABS.map(t => `
    <button class="bn-item ${view.tab === t.id ? 'active' : ''}" data-action="tab" data-tab="${t.id}">
      <span class="bn-ic">${icon(t.icon, 20)}${t.id === 'project' && S.project ? '<i class="nav-dot"></i>' : ''}</span>
      <span>${t.label}</span>
    </button>`).join('');
}

export function renderMain(view) {
  if (view.tab === 'project') return renderProject();
  if (view.tab === 'team') return renderTeam();
  if (view.tab === 'market') return renderMarket();
  if (view.tab === 'releases') return renderReleases();
  return renderStudio();
}

/* ---------------- studio dashboard ---------------- */
export function renderStudio() {
  const wi = weekInfo();
  const pay = payroll();
  const roy = nextRoyalties();
  const net = roy - pay;
  const mile = nextMilestone();
  const staff = S.staff;
  const capacity = OFFICES[S.office].capacity;
  const empty = Math.max(0, capacity - staff.length);
  const morale = avgMorale();

  return `
  <div class="view-head">
    <div>
      <div class="eyebrow">YEAR ${wi.year} · WEEK ${wi.week}</div>
      <h1>${esc(S.name)}</h1>
      <p class="sub">${OFFICES[S.office].name} · ${S.releases.length} game${S.releases.length === 1 ? '' : 's'} shipped · ${S.awards} GOTY</p>
    </div>
    <div class="head-actions">
      ${S.project
        ? `<button class="btn" data-action="tab" data-tab="project">${icon('gamepad', 16)} Open Project</button>`
        : `<button class="btn btn-primary" data-action="new-project">${icon('plus', 16)} New Game</button>`}
    </div>
  </div>

  <div class="studio-grid">
    <section class="panel office-panel">
      <div class="office-overlay top">
        <span class="chip chip-plain">${icon('home', 13)} ${OFFICES[S.office].name}</span>
        <span class="chip chip-plain">${icon('users', 13)} ${staff.length} in studio</span>
      </div>
      ${officeSVG()}
      <div class="office-foot">
        ${staff.map(m => `<div class="mini-dev" title="${esc(m.name)} — ${ROLES[m.role].name}">
          <span class="mini-av" style="--c:${ROLES[m.role].color}">${esc(m.name.split(' ').map(x => x[0]).join('').slice(0, 2))}</span>
          <span class="mini-name">${esc(m.founder ? 'You' : m.name.split(' ')[0])}</span>
          <span class="mini-morale"><i style="width:${Math.round(m.morale)}%;--c:${m.morale < 45 ? '#fb7185' : m.morale < 70 ? '#fbbf24' : '#5eead4'}"></i></span>
        </div>`).join('')}
        ${Array.from({ length: Math.min(empty, 3) }).map(() => `<div class="mini-dev empty"><span class="mini-av">+</span><span class="mini-name">Hire</span></div>`).join('')}
        ${empty > 3 ? `<div class="mini-dev more">+${empty - 3}</div>` : ''}
      </div>
    </section>

    <section class="panel pulse-panel">
      <div class="panel-head"><h2>Studio pulse</h2><span class="live-dot">LIVE</span></div>
      <div class="fin-list">
        <div class="fin-row"><span>Payroll</span><b class="neg">−${fmtMoney(pay)}</b></div>
        <div class="fin-row"><span>Royalties</span><b class="pos">+${fmtMoney(roy)}</b></div>
        <div class="fin-row total"><span>Net / week</span><b class="${net < 0 ? 'neg' : 'pos'}">${net < 0 ? '−' : '+'}${fmtMoney(Math.abs(net))}</b></div>
      </div>
      <div class="divider"></div>
      <div class="metric-line">
        <div class="metric-top"><span>Team morale</span><b>${Math.round(morale)}</b></div>
        <div class="bar"><i style="width:${morale}%;--c1:${morale < 45 ? '#fb7185' : '#fbbf24'};--c2:${morale < 45 ? '#ef4444' : '#fde68a'}"></i></div>
      </div>
      <div class="metric-line">
        <div class="metric-top"><span>Reputation</span><b>${Math.round(S.rep)}%</b></div>
        <div class="bar"><i style="width:${S.rep}%;--c1:#a78bfa;--c2:#c4b5fd"></i></div>
      </div>
      <div class="mini-stats">
        <div><small>Fans</small><b>${fmtNum(S.fans)}</b></div>
        <div><small>Research</small><b>${Math.floor(S.rp)} RP</b></div>
        <div><small>Avg skill</small><b>${avgSkill().toFixed(1)}</b></div>
      </div>
      ${mile ? `
      <div class="milestone">
        <div class="metric-top"><span>${icon('target', 13)} ${mile.name}</span><b>${mile.fmt(mile.cur, mile.max)}</b></div>
        <div class="bar thin"><i style="width:${mile.pct}%;--c1:#5eead4;--c2:#38bdf8"></i></div>
        <small>${mile.desc}</small>
      </div>` : `<div class="milestone done">${icon('trophy', 16)} All milestones cleared. Legend status.</div>`}
    </section>

    ${projectCard()}

    <section class="panel news-panel">
      <div class="panel-head"><h2>Studio feed</h2><span class="muted">${S.news.length} updates</span></div>
      <ul class="news-list">
        ${S.news.slice(0, 9).map(n => `<li class="news-item ${n.kind}">
          <span class="news-dot"></span>
          <div><p>${esc(n.text)}</p><small>Week ${((n.week - 1) % 52) + 1}</small></div>
        </li>`).join('')}
      </ul>
    </section>
  </div>`;
}

function projectCard() {
  const p = S.project;
  if (!p) {
    return `<section class="panel project-summary empty-project">
      <div class="empty-art">${icon('gamepad', 34)}</div>
      <div>
        <h2>No game in development</h2>
        <p class="sub">Your team is rested and the whiteboard is blank. Time to pick a genre, a theme, and a platform.</p>
        <div class="row-actions">
          <button class="btn btn-primary" data-action="new-project">${icon('plus', 16)} Start a New Game</button>
          <button class="btn btn-ghost" data-action="tab" data-tab="market">${icon('globe', 16)} Check the market</button>
        </div>
      </div>
    </section>`;
  }
  const pct = progressPct(p);
  const ready = pct >= 100;
  const f = forecast(p);
  const fit = Math.round(distributionFit(p) * 100);
  return `<section class="panel project-summary">
    <div class="panel-head">
      <div>
        <div class="eyebrow">${ready ? 'READY TO SHIP' : 'IN DEVELOPMENT'}</div>
        <h2>${esc(p.title)}</h2>
      </div>
      <span class="stage-badge ${ready ? 'polish' : 'dev'}">${ready ? 'Polish' : 'Production'}</span>
    </div>
    <div class="chips">${genreChip(p.genre, true)}${themeChip(p.theme, true)}${platformChip(p.platform, true)}${scopeChip(p.scope)}</div>
    <div class="progress-head"><span>${Math.round(pct)}% complete</span><span>${ready ? `${p.polishWeeks} week${p.polishWeeks === 1 ? '' : 's'} polishing` : `~${etaWeeks(p)} weeks left`}</span></div>
    <div class="bar tall"><i style="width:${pct}%;--c1:#5eead4;--c2:#a78bfa"></i></div>
    <div class="summary-grid">
      <div><small>Audience fit</small><b style="color:${fit > 85 ? '#5eead4' : fit > 70 ? '#fbbf24' : '#fb7185'}">${fit}%</b></div>
      <div><small>Bugs</small><b>${Math.round(p.bugs)}</b></div>
      <div><small>Hype</small><b>${Math.round(p.hype)}</b></div>
      <div><small>Forecast</small><b>${f.lo.toFixed(1)}–${f.hi.toFixed(1)}</b></div>
    </div>
    <div class="row-actions">
      <button class="btn" data-action="tab" data-tab="project">${icon('gamepad', 16)} Continue Production ${icon('arrowRight', 15)}</button>
      ${ready ? `<button class="btn btn-primary" data-action="ship">${icon('zap', 16)} Ship It</button>` : ''}
    </div>
  </section>`;
}

/* ---------------- project detail ---------------- */
export function renderProject() {
  const p = S.project;
  if (!p) {
    return `<div class="view-head"><div><div class="eyebrow">PRODUCTION</div><h1>Project</h1></div></div>
    <div class="panel empty-state">
      <div class="empty-art">${icon('gamepad', 40)}</div>
      <h2>Nothing in the oven</h2>
      <p class="sub">Start a project to choose a genre, theme, platform and scope. Then steer the team's focus while the weeks tick by.</p>
      <button class="btn btn-primary" data-action="new-project">${icon('plus', 16)} Start a New Game</button>
    </div>`;
  }
  const pct = progressPct(p);
  const ready = pct >= 100;
  const fit = distributionFit(p);
  const dist = achievedDist(p);
  const focus = focusDist(p);
  const aff = teamAffinity();
  const f = forecast(p);
  const out = teamOutput();
  const cap = techCeiling(p.platform);
  const syn = synergyFor(p.genre, p.theme);
  const pf = platformFit(p.platform, p.genre);
  const ideal = GENRES[p.genre].ideal;

  return `
  <div class="view-head">
    <div>
      <div class="eyebrow">${ready ? 'POLISH PHASE' : 'IN DEVELOPMENT'} · WEEK ${p.weeks + 1}</div>
      <h1>${esc(p.title)}</h1>
      <div class="chips">${genreChip(p.genre)}${themeChip(p.theme)}${platformChip(p.platform)}${scopeChip(p.scope)}</div>
    </div>
    <div class="head-actions">
      <button class="btn btn-ghost danger-text" data-action="abandon">${icon('trash', 15)} Cancel</button>
      ${ready
        ? `<button class="btn btn-primary" data-action="ship">${icon('zap', 16)} Release Game</button>`
        : `<span class="chip chip-plain">${icon('clock', 14)} Production</span>`}
    </div>
  </div>

  <div class="detail-grid">
    <div class="col">
      <section class="panel">
        <div class="panel-head"><h2>Production</h2><span class="muted">${fmtNum(p.work)} / ${fmtNum(p.required)} pts</span></div>
        <div class="progress-head"><span>${ready ? 'Feature complete — polish or ship' : `${Math.round(pct)}% · ~${etaWeeks(p)} weeks left`}</span><b>${Math.round(pct)}%</b></div>
        <div class="bar tall"><i style="width:${pct}%;--c1:#5eead4;--c2:#a78bfa"></i></div>
        <div class="stat-row">
          <div class="stat-box"><small>Team output</small><b>${out.toFixed(0)}<span> pts/wk</span></b></div>
          <div class="stat-box"><small>Bugs</small><b class="${p.bugs > 20 ? 'neg' : ''}">${Math.round(p.bugs)}</b></div>
          <div class="stat-box"><small>Polish bonus</small><b>+${p.polish.toFixed(2)}</b></div>
          <div class="stat-box"><small>Tech ceiling</small><b>${cap.toFixed(1)}</b></div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Creative focus</h2><span class="muted">steer the mix</span></div>
        <p class="hint-line">Your team's roles bias what gets made. These sliders steer the rest. Match the genre's needs to lift the review score.</p>
        <div class="focus-list">
          ${KEYS.map(k => `
          <div class="focus-row" style="--accent:${DISC[k].color}">
            <div class="focus-label"><span class="dot" style="background:${DISC[k].color}"></span>${DISC[k].name}<small data-focusval="${k}">${Math.round(focus[k] * 100)}%</small></div>
            <input class="slider" type="range" min="0" max="100" step="1" value="${p.focus[k]}" data-focus="${k}" style="--v:${p.focus[k]}%" aria-label="${DISC[k].name} focus">
            <div class="focus-share"><i style="width:${dist[k] * 100}%;background:${DISC[k].color}" data-share="${k}"></i><span data-shareval="${k}">${Math.round(dist[k] * 100)}%</span></div>
          </div>`).join('')}
        </div>
        <div class="mix-strip" aria-hidden="true">
          ${KEYS.map(k => `<i style="width:${dist[k] * 100}%;background:${DISC[k].color}" data-mix="${k}"></i>`).join('')}
        </div>
        <div class="mix-legend">
          ${KEYS.map(k => `<span><i style="background:${DISC[k].color}"></i>${DISC[k].name} <b>${Math.round(ideal[k] * 100)}%</b> <small>ideal</small></span>`).join('')}
        </div>
      </section>
    </div>

    <div class="col">
      <section class="panel fit-panel">
        <div class="panel-head"><h2>Audience fit</h2><span class="stage-badge ${fit > .85 ? 'good' : fit > .7 ? 'warn' : 'bad'}">${fit > .85 ? 'On target' : fit > .7 ? 'Close' : 'Off target'}</span></div>
        <div class="fit-big" style="--score:${scoreColor(fit * 10)}">
          <b data-fit-val>${Math.round(fit * 100)}<span>%</span></b>
          <div class="fit-bar"><i style="width:${fit * 100}%;--c1:${fit > .85 ? '#5eead4' : fit > .7 ? '#fbbf24' : '#fb7185'};--c2:${fit > .85 ? '#38bdf8' : fit > .7 ? '#fde68a' : '#ef4444'}" data-fit-fill></i></div>
        </div>
        <p class="hint-line">${GENRES[p.genre].blurb}</p>
        <div class="tag-list">
          <span class="tag ${syn > .5 ? 'good' : syn < 0 ? 'bad' : ''}">${icon(syn < 0 ? 'close' : 'check', 13)} ${syn > .5 ? 'Loved pairing' : syn < 0 ? 'Clashing pairing' : 'Neutral pairing'}</span>
          <span class="tag ${pf > 1.05 ? 'good' : pf < .9 ? 'bad' : ''}">${icon('target', 13)} ${pf > 1.05 ? 'Platform favourite' : pf < .9 ? 'Wrong audience' : 'Fits platform'}</span>
          <span class="tag">${icon('flask', 13)} Ceiling ${cap.toFixed(1)}/10</span>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Live forecast</h2><span class="muted">critic estimate</span></div>
        <div class="forecast">
          <b data-forecast style="color:${scoreColor(f.mid)}">${f.lo.toFixed(1)} – ${f.hi.toFixed(1)}</b>
          <span>/ 10</span>
        </div>
        <div class="forecast-meta">
          <div><small>Hype</small><b>${Math.round(p.hype)}</b></div>
          <div><small>Morale</small><b>${Math.round(avgMorale())}</b></div>
          <div><small>Marketing</small><b>${fmtMoney(p.marketing)}</b></div>
        </div>
        <div class="divider"></div>
        <div class="panel-head sub-head"><h3>Production actions</h3></div>
        <div class="action-stack">
          <button class="action-row" data-action="push" ${S.week - p.lastPush < 2 ? 'disabled' : ''}>
            <span class="action-ic">${icon('zap', 17)}</span>
            <span><b>Marketing push</b><small>+${S.upgrades.includes('pr') ? 16 : 12} hype · ${fmtMoney(S.upgrades.includes('pr') ? 9000 : 12000)}</small></span>
            ${S.week - p.lastPush < 2 ? '<em>cooling down</em>' : icon('chevron', 15)}
          </button>
          <button class="action-row" data-action="outing">
            <span class="action-ic">${icon('coffee', 17)}</span>
            <span><b>Team outing</b><small>+20 morale · ${fmtMoney(1000 + S.staff.length * 180)} · costs a week</small></span>
            ${icon('chevron', 15)}
          </button>
          <button class="action-row ${p.crunch ? 'on' : ''}" data-action="crunch">
            <span class="action-ic">${icon('clock', 17)}</span>
            <span><b>Crunch mode ${p.crunch ? 'ON' : 'off'}</b><small>+22% output · morale drains faster</small></span>
            <span class="switch ${p.crunch ? 'on' : ''}"><i></i></span>
          </button>
        </div>
      </section>

      <section class="panel ship-panel ${ready ? 'ready' : ''}">
        <div class="ship-copy">
          <span class="eyebrow">${ready ? 'THE FINAL CALL' : 'LOCKED'}</span>
          <h3>${ready ? 'Ready to ship?' : 'Finish production first'}</h3>
          <p>${ready
            ? `Every extra polish week fixes bugs and adds a little score. Ship now for cash flow, or hold out for reviews.`
            : `The release button unlocks at 100%. You are at ${Math.round(pct)}%.`}</p>
        </div>
        <button class="btn btn-primary btn-lg" data-action="ship" ${ready ? '' : 'disabled'}>${icon('zap', 18)} Release Game</button>
      </section>
    </div>
  </div>`;
}

/* ---------------- team ---------------- */
function skillPips(n) {
  return `<span class="pips">${Array.from({ length: 10 }).map((_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
}

function avatar(m, size = '') {
  const initials = m.name.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  return `<span class="avatar ${size}" style="--c:${ROLES[m.role].color}">${esc(initials)}</span>`;
}

export function renderTeam() {
  const cap = OFFICES[S.office].capacity;
  const nextOfficeId = Object.keys(OFFICES)[Object.keys(OFFICES).indexOf(S.office) + 1];
  const nextOffice = nextOfficeId ? OFFICES[nextOfficeId] : null;
  const morale = avgMorale();
  return `
  <div class="view-head">
    <div>
      <div class="eyebrow">PEOPLE</div>
      <h1>Your team</h1>
      <p class="sub">${S.staff.length} of ${cap} desks filled · avg skill ${avgSkill().toFixed(1)} · morale ${Math.round(morale)}</p>
    </div>
    <div class="head-actions">
      <span class="chip chip-plain">${icon('briefcase', 14)} ${fmtMoney(payroll())} / week</span>
    </div>
  </div>

  <div class="team-grid">
    <div class="col">
      <section class="panel">
        <div class="panel-head"><h2>Roster</h2><span class="muted">${S.staff.length}/${cap}</span></div>
        <div class="staff-list">
          ${S.staff.map(m => `
          <div class="staff-card">
            ${avatar(m, 'lg')}
            <div class="staff-info">
              <div class="staff-name">${esc(m.name)} ${m.founder ? '<span class="tag you">You</span>' : ''}</div>
              <div class="staff-role" style="color:${ROLES[m.role].color}">${ROLES[m.role].name} · ${m.salary ? fmtMoney(m.salary) + '/wk' : 'no salary'}</div>
              <div class="staff-skill">${skillPips(m.skill)}<b>${m.skill}</b></div>
              <div class="staff-morale">
                <span>Morale</span>
                <div class="bar thin"><i style="width:${m.morale}%;--c1:${m.morale < 45 ? '#fb7185' : m.morale < 70 ? '#fbbf24' : '#5eead4'};--c2:${m.morale < 45 ? '#ef4444' : m.morale < 70 ? '#fde68a' : '#38bdf8'}"></i></div>
                <b>${Math.round(m.morale)}</b>
              </div>
            </div>
            <div class="staff-actions">
              <button class="btn btn-sm" data-action="train" data-id="${m.id}" ${m.skill >= 10 ? 'disabled' : ''}>${icon('spark', 13)} Train <span class="cost">${m.skill >= 10 ? 'MAX' : fmtMoney(3000 + m.skill * 1600)}</span></button>
              ${m.founder ? '<span class="tag you">Founder</span>' : `<button class="icon-btn sm danger-text" data-action="fire" data-id="${m.id}" aria-label="Let ${esc(m.name)} go">${icon('trash', 15)}</button>`}
            </div>
          </div>`).join('')}
          ${Array.from({ length: Math.max(0, cap - S.staff.length) }).map(() => `
          <div class="staff-card empty-slot">
            <span class="avatar lg ghost">+</span>
            <div class="staff-info"><div class="staff-name muted">Empty desk</div><div class="staff-role">Hire someone from the pool</div></div>
          </div>`).join('')}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Hiring pool</h2><span class="muted">refreshes in ${Math.max(1, 4 - (S.week - S.candidateWeek))} wk</span></div>
        <div class="hire-grid">
          ${S.candidates.map(c => `
          <div class="hire-card">
            <div class="hire-top">
              ${avatar(c)}
              <div>
                <b>${esc(c.name)}</b>
                <small style="color:${ROLES[c.role].color}">${ROLES[c.role].name}</small>
              </div>
              <span class="skill-badge">${c.skill}</span>
            </div>
            <div class="hire-meta"><span>${fmtMoney(c.salary)}/wk</span><span>Signing ${fmtMoney(c.sign)}</span></div>
            <button class="btn btn-sm btn-full" data-action="hire" data-id="${c.id}" ${S.staff.length >= cap ? 'disabled' : ''}>
              ${S.staff.length >= cap ? 'Office full' : `${icon('plus', 14)} Hire`}
            </button>
          </div>`).join('')}
        </div>
      </section>
    </div>

    <div class="col">
      <section class="panel office-upgrade">
        <div class="panel-head"><h2>Office</h2><span class="tag">${OFFICES[S.office].name}</span></div>
        <div class="office-ill">${icon('home', 30)}<div><b>${cap} desks</b><small>${OFFICES[S.office].desc}</small></div></div>
        ${nextOffice ? `
        <div class="divider"></div>
        <div class="upgrade-next">
          <div class="metric-top"><span>Next: ${nextOffice.name}</span><b>${fmtMoney(nextOffice.cost)}</b></div>
          <p class="hint-line">${nextOffice.desc} · ${nextOffice.capacity} desks</p>
          <button class="btn btn-full" data-action="office" ${S.cash < nextOffice.cost ? 'disabled' : ''}>${S.cash < nextOffice.cost ? 'Need ' + fmtMoney(nextOffice.cost - S.cash) + ' more' : 'Move in'}</button>
        </div>` : '<p class="hint-line">You have the best office in the city. Enjoy the view.</p>'}
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Role strengths</h2></div>
        <p class="hint-line">Roles bias what the team naturally produces. Mix roles to hit a genre's ideal balance.</p>
        <div class="role-list">
          ${Object.entries(ROLES).map(([id, r]) => `
          <div class="role-row">
            <span class="role-dot" style="background:${r.color}"></span>
            <b>${r.name}</b>
            <span class="role-bars">
              ${KEYS.map(k => `<i style="height:${Math.max(10, r.affinity[k] * 22)}px;background:${DISC[k].color}" title="${DISC[k].name}"></i>`).join('')}
            </span>
          </div>`).join('')}
        </div>
        <div class="role-legend">${KEYS.map(k => `<span><i style="background:${DISC[k].color}"></i>${DISC[k].short}</span>`).join('')}</div>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Team morale</h2><b>${Math.round(morale)}/100</b></div>
        <p class="hint-line">${morale < 45 ? 'The team is fried. Take an outing or morale will drag output and quality.' : morale < 70 ? 'Morale is slipping. Coffee helps; outings help more.' : 'The team is happy and shipping. Keep it that way.'}</p>
        <div class="bar tall"><i style="width:${morale}%;--c1:${morale < 45 ? '#fb7185' : '#5eead4'};--c2:${morale < 45 ? '#ef4444' : '#a78bfa'}"></i></div>
        <div class="divider"></div>
        <button class="btn btn-full" data-action="outing">${icon('coffee', 15)} Team outing · ${fmtMoney(1000 + S.staff.length * 180)}</button>
        <p class="tiny-note">Costs one week of production. Restores 20 morale.</p>
      </section>
    </div>
  </div>`;
}

/* ---------------- market ---------------- */
export function renderMarket() {
  const trendWeeks = Math.max(1, 7 - (S.week - S.trendWeek));
  return `
  <div class="view-head">
    <div>
      <div class="eyebrow">MARKET &amp; R&amp;D</div>
      <h1>Market</h1>
      <p class="sub">Research points: <b>${Math.floor(S.rp)} RP</b> · new trends every 7 weeks</p>
    </div>
    <div class="head-actions">
      <span class="chip chip-plain">${icon('flask', 14)} ${Math.floor(S.rp)} RP banked</span>
    </div>
  </div>

  <section class="panel trend-panel">
    <div class="trend-copy">
      <span class="eyebrow">HOT RIGHT NOW</span>
      <h2>${GENRES[S.trend.genre].name} <span class="amp">×</span> ${THEMES[S.trend.theme].name}</h2>
      <p class="sub">Games matching the trend earn a review and sales bonus. Trend rotates in ${trendWeeks} week${trendWeeks === 1 ? '' : 's'}.</p>
    </div>
    <div class="trend-chips">${genreChip(S.trend.genre)}${themeChip(S.trend.theme)}</div>
  </section>

  <div class="section-head"><h2>${icon('globe', 18)} Platforms</h2><span class="muted">install base drives sales · power caps quality</span></div>
  <div class="platform-grid">
    ${Object.entries(PLATFORMS).map(([id, p]) => {
      const owned = S.platforms.includes(id);
      const can = S.cash >= p.cost && S.rp >= p.rp;
      return `<div class="platform-card ${owned ? 'owned' : ''}">
        <div class="pc-head">
          <span class="pc-mono" style="--c1:${p.color[0]};--c2:${p.color[1]}">${p.mono}</span>
          <div><b>${p.name}</b><small>${p.audience} audience</small></div>
          ${owned ? `<span class="tag good">${icon('check', 12)} Licensed</span>` : `<span class="tag">${icon('lock', 12)} Locked</span>`}
        </div>
        <div class="pc-metrics">
          <div><span>Power</span><div class="bar thin"><i style="width:${p.power}%;--c1:#a78bfa;--c2:#6366f1"></i></div><b>${p.power}</b></div>
          <div><span>Share</span><div class="bar thin"><i style="width:${p.share}%;--c1:#5eead4;--c2:#38bdf8"></i></div><b>${p.share}%</b></div>
        </div>
        <div class="pc-facts"><span>${icon('target', 12)} Ceiling ${techCeiling(id).toFixed(1)}</span><span>${icon('chart', 12)} ${fmtNum(p.share * 1.8)}k buyers</span></div>
        <p class="pc-note">${p.note}</p>
        ${owned
          ? `<div class="pc-owned">${icon('check', 14)} Dev kit installed</div>`
          : `<button class="btn btn-sm btn-full" data-action="buy-platform" data-id="${id}" ${can ? '' : 'disabled'}>
              ${can ? `Unlock · ${fmtMoney(p.cost)} + ${p.rp} RP` : `${S.cash < p.cost ? fmtMoney(p.cost - S.cash) + ' short' : p.rp + ' RP needed'}`}
            </button>`}
      </div>`;
    }).join('')}
  </div>

  <div class="section-head"><h2>${icon('flask', 18)} Engines</h2><span class="muted">permanent upgrades to speed and craft</span></div>
  <div class="engine-grid">
    ${Object.entries(ENGINES).map(([id, e]) => {
      const owned = S.engines.includes(id);
      const can = S.cash >= e.cost && S.rp >= e.rp;
      return `<div class="engine-card ${owned ? 'owned' : ''}">
        <div class="engine-top">
          <span class="engine-glyph">${icon('flask', 18)}</span>
          <div><b>${e.name}</b><small>${e.note}</small></div>
          ${owned ? `<span class="tag good">${icon('check', 12)} Installed</span>` : ''}
        </div>
        <div class="engine-stats">
          <div><small>Output</small><b>+${Math.round((e.output - 1) * 100)}%</b></div>
          <div><small>Craft</small><b>+${e.craft.toFixed(2)}</b></div>
        </div>
        ${owned ? '' : `<button class="btn btn-sm btn-full" data-action="buy-engine" data-id="${id}" ${can ? '' : 'disabled'}>
          ${can ? `License · ${fmtMoney(e.cost)} + ${e.rp} RP` : `${S.cash < e.cost ? fmtMoney(e.cost - S.cash) + ' short' : e.rp + ' RP needed'}`}
        </button>`}
      </div>`;
    }).join('')}
  </div>

  <div class="section-head"><h2>${icon('briefcase', 18)} Studio upgrades</h2><span class="muted">one-time comfort and productivity</span></div>
  <div class="upgrade-grid">
    ${Object.entries(UPGRADES).map(([id, u]) => {
      const owned = S.upgrades.includes(id);
      return `<div class="upgrade-card ${owned ? 'owned' : ''}">
        <div class="upgrade-top"><span class="upgrade-tag">${u.tag}</span>${owned ? `<span class="tag good">${icon('check', 12)} Installed</span>` : ''}</div>
        <b>${u.name}</b>
        <p>${u.desc}</p>
        ${owned ? `<div class="pc-owned">${icon('check', 14)} Working</div>` : `<button class="btn btn-sm btn-full" data-action="buy-upgrade" data-id="${id}" ${S.cash >= u.cost ? '' : 'disabled'}>${S.cash >= u.cost ? 'Buy · ' + fmtMoney(u.cost) : fmtMoney(u.cost - S.cash) + ' short'}</button>`}
      </div>`;
    }).join('')}
  </div>`;
}

/* ---------------- releases ---------------- */
function chart(key, color, label) {
  const data = S.history.length > 1 ? S.history.slice(-90) : [
    { week: 1, cash: S.cash, fans: S.fans },
    { week: 2, cash: S.cash, fans: S.fans },
  ];
  const vals = data.map(d => d[key]);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max - min < 1) { max = min + 1; }
  const w = 620, h = 132, pad = 8;
  const pts = vals.map((v, i) => [
    pad + (i / Math.max(1, vals.length - 1)) * (w - pad * 2),
    h - pad - ((v - min) / (max - min)) * (h - pad * 2),
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h - pad} L${pts[0][0].toFixed(1)} ${h - pad} Z`;
  const last = pts[pts.length - 1];
  return `<div class="chart-wrap">
    <div class="chart-head"><span>${label}</span><b>${key === 'cash' ? fmtMoney(vals[vals.length - 1]) : fmtNum(vals[vals.length - 1])}</b></div>
    <svg viewBox="0 0 ${w} ${h}" class="chart" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="grad-${key}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity=".32"/><stop offset="1" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#grad-${key})"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="3.4" fill="${color}"/>
    </svg>
    <div class="chart-axis"><span>${min === vals[0] ? 'start' : ''}</span><span>last 90 weeks</span></div>
  </div>`;
}

export function renderReleases() {
  const total = S.releases.length;
  const avg = total ? S.releases.reduce((a, r) => a + r.score, 0) / total : 0;
  const copies = S.releases.reduce((a, r) => a + r.copies, 0);
  const revenue = S.releases.reduce((a, r) => a + r.revenue, 0);
  return `
  <div class="view-head">
    <div>
      <div class="eyebrow">PORTFOLIO</div>
      <h1>Releases</h1>
      <p class="sub">${total} game${total === 1 ? '' : 's'} shipped · ${S.awards} Game of the Year award${S.awards === 1 ? '' : 's'}</p>
    </div>
    <div class="head-actions">
      <button class="btn" data-action="new-project" ${S.project ? 'disabled' : ''}>${icon('plus', 16)} New Game</button>
    </div>
  </div>

  <div class="stat-strip">
    <div class="stat-box"><small>Games shipped</small><b>${total}</b></div>
    <div class="stat-box"><small>Average review</small><b style="color:${scoreColor(avg)}">${avg ? avg.toFixed(1) : '—'}</b></div>
    <div class="stat-box"><small>Copies sold</small><b>${fmtNum(copies)}</b></div>
    <div class="stat-box"><small>Studio revenue</small><b>${fmtMoney(revenue)}</b></div>
  </div>

  <div class="chart-grid">
    ${chart('cash', '#5eead4', 'Cash over time')}
    ${chart('fans', '#a78bfa', 'Fanbase growth')}
  </div>

  <section class="panel">
    <div class="panel-head"><h2>Game history</h2><span class="muted">newest first</span></div>
    ${total === 0 ? `<div class="empty-state small"><div class="empty-art">${icon('trophy', 34)}</div><h3>No releases yet</h3><p class="sub">Ship your first game to start building a legacy.</p></div>` : `
    <div class="release-list">
      ${S.releases.map(r => {
        const wi = Math.floor((r.week - 1) / 52) + 1;
        const wk = ((r.week - 1) % 52) + 1;
        const still = r.weeksLeft > 0;
        return `<div class="release-card">
          <div class="score-badge ${scoreClass(r.score)}" style="--score:${scoreColor(r.score)}"><b>${r.score.toFixed(1)}</b><small>${gradeLabel(r.score)}</small></div>
          <div class="release-main">
            <div class="release-title">${esc(r.title)} ${r.goty ? `<span class="goty-tag">${icon('trophy', 12)} GOTY</span>` : ''}</div>
            <div class="chips">${genreChip(r.genre, true)}${themeChip(r.theme, true)}${platformChip(r.platform, true)}${scopeChip(r.scope)}</div>
            <div class="release-meta"><span>Year ${wi}, week ${wk}</span><span>${fmtNum(r.copies)} copies</span><span>${fmtMoney(r.revenue)} earned</span><span>+${fmtNum(r.fans)} fans</span></div>
          </div>
          <div class="release-side">
            <span class="tag ${still ? 'good' : ''}">${still ? `${r.weeksLeft} wk royalties left` : 'Sales settled'}</span>
            <span class="release-paid">${fmtMoney(r.paid)} paid</span>
          </div>
        </div>`;
      }).join('')}
    </div>`}
  </section>`;
}

/* ---------------- modals ---------------- */
export function resultsHTML(result) {
  const r = result.release;
  const circ = 2 * Math.PI * 52;
  const dash = circ * clamp(r.score / 10, 0, 1);
  const color = scoreColor(r.score);
  return `<div class="results">
    <div class="results-hero">
      <div class="score-ring" style="--score:${color}">
        <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="#1d2733" stroke-width="8"/><circle cx="60" cy="60" r="52" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${dash} ${circ}" transform="rotate(-90 60 60)"/></svg>
        <div class="score-num"><b>${r.score.toFixed(1)}</b><small>${gradeLabel(r.score)}</small></div>
      </div>
      <div class="results-copy">
        <span class="eyebrow">RELEASE REVIEWS</span>
        <h2>${esc(r.title)}</h2>
        <div class="chips">${genreChip(r.genre, true)}${themeChip(r.theme, true)}${platformChip(r.platform, true)}${scopeChip(r.scope)}</div>
        <p class="results-lede">${r.score >= 8 ? 'The press is glowing. This one is going on the wall.' : r.score >= 6.5 ? 'A respectable launch. The team is proud, the critics are mostly convinced.' : 'The reviews are rough. Time to learn, patch, and try again.'}</p>
      </div>
    </div>
    <div class="critic-list">
      ${r.critics.map(c => `<div class="critic-row">
        <span class="critic-av">${c.short}</span>
        <div class="critic-body"><div><b>${c.name}</b><span class="critic-score" style="color:${scoreColor(c.score)}">${c.score.toFixed(1)}</span></div><p>"${c.quote}"</p></div>
      </div>`).join('')}
    </div>
    <div class="result-stats">
      <div><small>Copies sold</small><b>${fmtNum(r.copies)}</b></div>
      <div><small>Gross sales</small><b>${fmtMoney(r.gross)}</b></div>
      <div><small>Studio cut</small><b>${fmtMoney(r.revenue)}</b></div>
      <div><small>New fans</small><b class="pos">+${fmtNum(r.fans)}</b></div>
    </div>
    <p class="results-foot">Royalties arrive over the next 8 weeks. ${result.unlocked?.length ? `Achievement unlocked: <b>${result.unlocked.map(a => a.name).join(', ')}</b>.` : 'The studio feed has the full story.'}</p>
    <div class="modal-actions"><button class="btn btn-primary btn-lg" data-action="close-modal">Back to the studio</button></div>
    ${r.score >= 8 ? `<div class="confetti">${Array.from({ length: 44 }).map((_, i) => `<i style="--x:${Math.random() * 100}%;--d:${(Math.random() * 1.6).toFixed(2)}s;--r:${Math.random() * 360}deg;--c:${['#5eead4', '#a78bfa', '#fbbf24', '#f472b6', '#38bdf8'][i % 5]}"></i>`).join('')}</div>` : ''}
  </div>`;
}

export function awardHTML(award) {
  return `<div class="award-modal">
    <div class="award-trophy">${icon('trophy', 54)}</div>
    <span class="eyebrow">ANNUAL AWARDS</span>
    <h2>Game of the Year</h2>
    <p class="award-title">${esc(award.title)}</p>
    <div class="award-score">${award.score.toFixed(1)} <small>/ 10</small></div>
    <p class="results-lede">The industry stood up. Your studio just won the biggest prize in games. +$75,000 and a wave of new fans.</p>
    <div class="modal-actions"><button class="btn btn-primary btn-lg" data-action="close-modal">Accept the trophy</button></div>
  </div>`;
}

export function gameOverHTML() {
  const total = S.releases.length;
  return `<div class="gameover-modal">
    <div class="go-icon">${icon('heart', 42)}</div>
    <span class="eyebrow">STUDIO CLOSED</span>
    <h2>The lights are off.</h2>
    <p class="results-lede">Payroll outran the royalties. The landlord changed the locks. But what a run.</p>
    <div class="result-stats">
      <div><small>Games shipped</small><b>${total}</b></div>
      <div><small>Fans</small><b>${fmtNum(S.fans)}</b></div>
      <div><small>Lifetime revenue</small><b>${fmtMoney(S.totals.revenue)}</b></div>
      <div><small>GOTY awards</small><b>${S.awards}</b></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary btn-lg" data-action="restart">Start a new studio</button>
    </div>
  </div>`;
}

export function helpHTML() {
  return `<div class="help-modal">
    <div class="modal-head"><div><span class="eyebrow">FIELD MANUAL</span><h2>How to run a studio</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Close">${icon('close', 18)}</button></div>
    <div class="help-grid">
      <div class="help-step"><span>01</span><div><b>Pick a concept</b><p>Genre + theme + platform. Loved pairings lift reviews; clashing ones sink them. Platform power caps your quality ceiling, while install base drives sales.</p></div></div>
      <div class="help-step"><span>02</span><div><b>Steer production</b><p>Each week your team produces points. Sliders decide the split between gameplay, graphics, sound and story. Your team's roles bias the mix — a composer makes sound easier to push.</p></div></div>
      <div class="help-step"><span>03</span><div><b>Polish or ship</b><p>At 100% you can release, or spend weeks fixing bugs and adding polish. Bugs shave review points. Marketing builds hype, which drives launch sales.</p></div></div>
      <div class="help-step"><span>04</span><div><b>Grow the studio</b><p>Royalties arrive over eight weeks. Hire, train, research engines and platforms, and upgrade the office. At year end, the best game wins GOTY.</p></div></div>
    </div>
    <div class="help-tips">
      <b>Quick tips</b>
      <ul>
        <li>Press <kbd>Space</kbd> to advance a week. Hold the fast-forward button to run several.</li>
        <li>Audience fit matters more than raw output. Check the ideal percentages on the project screen.</li>
        <li>Do not let morale fall below 45 — output and quality both suffer.</li>
        <li>Two weeks in the red and the studio closes. Keep a cash buffer for payroll.</li>
      </ul>
    </div>
    <div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">Got it</button></div>
  </div>`;
}

export function menuHTML() {
  return `<div class="menu-modal">
    <div class="modal-head"><div><span class="eyebrow">PAUSE</span><h2>${esc(S.name)}</h2></div><button class="icon-btn" data-action="close-modal" aria-label="Close">${icon('close', 18)}</button></div>
    <div class="menu-list">
      <button class="action-row" data-action="help"><span class="action-ic">${icon('spark', 17)}</span><span><b>How to play</b><small>The field manual</small></span>${icon('chevron', 15)}</button>
      <button class="action-row" data-action="save-now"><span class="action-ic">${icon('check', 17)}</span><span><b>Save game</b><small>Autosaves every week anyway</small></span>${icon('chevron', 15)}</button>
      <button class="action-row" data-action="sound"><span class="action-ic">${icon(S.settings.sound ? 'soundOn' : 'soundOff', 17)}</span><span><b>Sound ${S.settings.sound ? 'on' : 'off'}</b><small>Small synth blips</small></span>${icon('chevron', 15)}</button>
      <button class="action-row" data-action="restart"><span class="action-ic">${icon('plus', 17)}</span><span><b>New studio</b><small>Abandon this save and start over</small></span>${icon('chevron', 15)}</button>
    </div>
    <p class="tiny-note">Pixel Forge · a tiny tycoon about making big games</p>
  </div>`;
}

export function confirmHTML({ title, body, label, action, data = '', danger = false }) {
  return `<div class="confirm-modal">
    <h2>${esc(title)}</h2>
    <p class="sub">${esc(body)}</p>
    <div class="modal-actions">
      <button class="btn" data-action="close-modal">Never mind</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="${action}" ${data}>${esc(label)}</button>
    </div>
  </div>`;
}

/* ---------------- new project wizard ---------------- */
export function wizardHTML(wiz) {
  const g = GENRES[wiz.genre], t = THEMES[wiz.theme];
  const syn = synergyFor(wiz.genre, wiz.theme);
  const maxMarketing = Math.max(0, Math.min(60000, Math.floor(S.cash / 1000) * 1000));
  const marketing = Math.min(wiz.marketing, maxMarketing);
  const baseOut = teamOutput() / (ENGINES[S.project?.engine || 'basement'].output || 1);
  const estWeeks = Math.max(1, Math.ceil(SCOPES[wiz.scope].work / Math.max(1, baseOut * ENGINES[wiz.engine].output)));
  const hype = Math.round(clamp(8 + marketing / 2200 + S.fans / 3000 + S.rep / 6, 5, 100));
  const stepTitles = ['Concept', 'Platform & scope', 'Budget & launch'];
  return `<div class="wizard">
    <div class="modal-head wizard-head">
      <div>
        <span class="eyebrow">NEW PROJECT · STEP ${wiz.step} OF 3</span>
        <h2>${stepTitles[wiz.step - 1]}</h2>
      </div>
      <button class="icon-btn" data-action="close-modal" aria-label="Close">${icon('close', 18)}</button>
    </div>
    <div class="step-dots">${[1, 2, 3].map(i => `<i class="${i <= wiz.step ? 'on' : ''}"></i>`).join('')}</div>

    ${wiz.step === 1 ? `
    <div class="wiz-title-row">
      <label>WORKING TITLE</label>
      <div class="wiz-title-input">
        <input id="wiz-title" data-wiz-title maxlength="34" value="${esc(wiz.title)}" spellcheck="false" aria-label="Working title">
        <button class="icon-btn sm" data-action="wiz-shuffle" aria-label="Random title">${icon('shuffle', 16)}</button>
      </div>
    </div>
    <div class="wiz-section"><div class="wiz-label">GENRE</div>
      <div class="pick-grid genres">
        ${Object.entries(GENRES).map(([id, x]) => `<button class="pick ${wiz.genre === id ? 'on' : ''}" data-action="wiz-genre" data-id="${id}" style="--c1:${x.color[0]};--c2:${x.color[1]}">
          <span class="pick-mono">${x.mono}</span><span class="pick-name">${x.name}</span><small>${Object.entries(x.ideal).sort((a, b) => b[1] - a[1])[0][0] === 'g' ? 'Mechanics' : Object.entries(x.ideal).sort((a, b) => b[1] - a[1])[0][0] === 'a' ? 'Visuals' : Object.entries(x.ideal).sort((a, b) => b[1] - a[1])[0][0] === 's' ? 'Audio' : 'Story'} led</small>
        </button>`).join('')}
      </div>
    </div>
    <div class="wiz-section"><div class="wiz-label">THEME</div>
      <div class="pick-grid themes">
        ${Object.entries(THEMES).map(([id, x]) => `<button class="pick theme ${wiz.theme === id ? 'on' : ''}" data-action="wiz-theme" data-id="${id}" style="--c1:${x.color[0]};--c2:${x.color[1]}">
          <span class="pick-mono">${x.mono}</span><span class="pick-name">${x.name}</span>
        </button>`).join('')}
      </div>
    </div>
    <div class="synergy-banner ${syn > .5 ? 'good' : syn < 0 ? 'bad' : ''}">
      <span class="syn-icon">${icon(syn < 0 ? 'close' : syn > .5 ? 'check' : 'dot', 18)}</span>
      <div><b>${syn > .5 ? 'Loved pairing' : syn < 0 ? 'Clashing pairing' : 'Unproven pairing'}</b>
      <p>${g.name} + ${t.name}: ${syn > .5 ? 'critics and fans adore this combination. +1.0 review.' : syn < 0 ? 'these two fight each other. −0.9 review. Consider a different theme.' : 'nobody expects it, but it could work. Small bonus.'}</p></div>
    </div>` : ''}

    ${wiz.step === 2 ? `
    <div class="wiz-section"><div class="wiz-label">PLATFORM</div>
      <div class="wiz-platforms">
        ${Object.entries(PLATFORMS).map(([id, p]) => {
          const owned = S.platforms.includes(id);
          return `<button class="wiz-platform ${wiz.platform === id ? 'on' : ''} ${owned ? '' : 'locked'}" data-action="wiz-platform" data-id="${id}" ${owned ? '' : 'disabled'} style="--c1:${p.color[0]};--c2:${p.color[1]}">
            <span class="pick-mono">${p.mono}</span>
            <span class="wp-name">${p.name}<small>${p.audience}</small></span>
            <span class="wp-stats"><b>${techCeiling(id).toFixed(1)}</b><small>ceiling</small></span>
            <span class="wp-stats"><b>${p.share}%</b><small>share</small></span>
            ${owned ? '' : `<span class="wp-lock">${icon('lock', 12)} locked</span>`}
          </button>`;
        }).join('')}
      </div>
    </div>
    <div class="wiz-section"><div class="wiz-label">SCOPE</div>
      <div class="scope-grid">
        ${Object.entries(SCOPES).map(([id, s]) => `<button class="scope-card ${wiz.scope === id ? 'on' : ''}" data-action="wiz-scope" data-id="${id}">
          <b>${s.name}</b><span>${fmtNum(s.work)} pts</span><small>${s.desc}</small>
          <em>$${s.price} / copy · ${s.sales.toFixed(2)}× sales</em>
        </button>`).join('')}
      </div>
    </div>
    <div class="wiz-section"><div class="wiz-label">ENGINE</div>
      <div class="engine-picks">
        ${Object.entries(ENGINES).map(([id, e]) => {
          const owned = S.engines.includes(id);
          return `<button class="engine-pick ${wiz.engine === id ? 'on' : ''}" data-action="wiz-engine" data-id="${id}" ${owned ? '' : 'disabled'}>
            ${icon('flask', 15)} <b>${e.name}</b><small>${owned ? `+${Math.round((e.output - 1) * 100)}% out · +${e.craft} craft` : 'locked'}</small>
          </button>`;
        }).join('')}
      </div>
    </div>` : ''}

    ${wiz.step === 3 ? `
    <div class="wiz-summary">
      <div class="wiz-summary-head">
        <div><span class="eyebrow">PROJECT BRIEF</span><h3>${esc(wiz.title)}</h3></div>
        <div class="chips">${genreChip(wiz.genre, true)}${themeChip(wiz.theme, true)}${platformChip(wiz.platform, true)}${scopeChip(wiz.scope)}</div>
      </div>
      <div class="wiz-facts">
        <div><small>Estimated dev time</small><b>${estWeeks} weeks</b></div>
        <div><small>Weekly payroll</small><b>${fmtMoney(payroll())}</b></div>
        <div><small>Tech ceiling</small><b>${techCeiling(wiz.platform).toFixed(1)}</b></div>
        <div><small>Market share</small><b>${PLATFORMS[wiz.platform].share}%</b></div>
      </div>
      <div class="marketing-block">
        <div class="metric-top"><span>Marketing budget</span><b data-marketing-val>${fmtMoney(marketing)}</b></div>
        <input class="slider marketing" type="range" min="0" max="${maxMarketing}" step="1000" value="${marketing}" data-wiz-marketing style="--v:${maxMarketing ? (marketing / maxMarketing) * 100 : 0}%">
        <div class="marketing-scale"><span>$0</span><span>${fmtMoney(maxMarketing)}</span></div>
        <p class="hint-line">Cash on hand ${fmtMoney(S.cash)} · estimated launch hype <b data-hype-val>${hype}</b>. Marketing is paid up front and cannot be refunded.</p>
      </div>
      <div class="wiz-notes">
        <span>${icon('target', 14)} ${PLATFORMS[wiz.platform].audience} audience</span>
        <span>${icon('flask', 14)} ${ENGINES[wiz.engine].name}</span>
        <span>${icon('users', 14)} ${S.staff.length} devs</span>
        <span>${icon('clock', 14)} ${estWeeks} weeks</span>
      </div>
    </div>` : ''}

    <div class="wizard-foot">
      <div class="wiz-cash">${icon('coin', 15)} ${fmtMoney(S.cash)}</div>
      <div class="wiz-buttons">
        ${wiz.step > 1 ? `<button class="btn" data-action="wiz-back">${icon('arrowLeft', 15)} Back</button>` : ''}
        ${wiz.step < 3 ? `<button class="btn btn-primary" data-action="wiz-next">Next ${icon('arrowRight', 15)}</button>` : `<button class="btn btn-primary btn-lg" data-action="wiz-start">${icon('play', 15)} Start Development</button>`}
      </div>
    </div>
  </div>`;
}
