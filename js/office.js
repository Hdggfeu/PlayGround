import { S, avgMorale, clamp } from './state.js';
import { ROLES, OFFICES } from './data.js';

const SKIN = ['#f2c9a0', '#d9a06b', '#a9714b', '#8a5a3b', '#f5d7b8', '#c68b5e'];
const HAIR = ['#2b2118', '#4a2f1c', '#1f2937', '#6b3f2a', '#111827', '#7c2d12'];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function devGroup(m, i) {
  if (!m) return '';
  const role = ROLES[m.role];
  const h = hash(m.id + m.name);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >> 3) % HAIR.length];
  const hairStyle = h % 3;
  const bob = (i * 0.6).toFixed(1);
  const hairPath = hairStyle === 0
    ? `<path d="M114 6a16 16 0 0 1 32 0c0-8-7-13-16-13s-16 5-16 13z" fill="${hair}"/>`
    : hairStyle === 1
      ? `<path d="M114 6a16 16 0 0 1 32 0l-2-8c-3-6-9-8-14-8s-12 3-14 8z" fill="${hair}"/><rect x="112" y="4" width="5" height="12" rx="2.5" fill="${hair}"/>`
      : `<path d="M114 4a16 16 0 0 1 32 0c0-9-6-14-16-14S114-5 114 4z" fill="${hair}"/><circle cx="114" cy="2" r="4" fill="${hair}"/>`;
  return `
  <g transform="translate(0,0)">
    <rect x="103" y="6" width="54" height="64" rx="15" fill="#141c27" stroke="#22303f" stroke-width="1.2"/>
    <g class="dev" style="animation-delay:-${bob}s">
      <rect x="112" y="16" width="36" height="48" rx="12" fill="${role.color}" opacity=".9"/>
      <rect x="112" y="16" width="36" height="16" rx="8" fill="#ffffff" opacity=".12"/>
      <rect x="124" y="34" width="12" height="10" rx="3" fill="#0b1018" opacity=".35"/>
      <circle cx="130" cy="6" r="15" fill="${skin}"/>
      ${hairPath}
      <circle cx="125" cy="6" r="1.4" fill="#151b23"/>
      <circle cx="135" cy="6" r="1.4" fill="#151b23"/>
      <path d="M127 11c1.8 1.4 4.2 1.4 6 0" stroke="#151b23" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".6"/>
      <path d="M113 6a17 17 0 0 1 6-12" stroke="#ffffff" stroke-width="1.2" opacity=".18" fill="none"/>
    </g>
  </g>`;
}

function desk(x, y, scale, m, i) {
  const occupied = Boolean(m);
  const screen = occupied ? (m.role === 'artist' ? '#a78bfa' : m.role === 'composer' ? '#f472b6' : m.role === 'designer' ? '#fbbf24' : '#5eead4') : '#1a2431';
  return `
  <g transform="translate(${x} ${y}) scale(${scale})">
    <ellipse cx="92" cy="104" rx="88" ry="12" fill="#05080c" opacity=".45"/>
    ${occupied ? devGroup(m, i) : `
      <g opacity=".42">
        <rect x="103" y="6" width="54" height="64" rx="15" fill="none" stroke="#2b3a4b" stroke-dasharray="4 5"/>
        <circle cx="130" cy="16" r="12" fill="none" stroke="#2b3a4b" stroke-dasharray="3 4"/>
        <text x="130" y="4" text-anchor="middle" font-family="ui-monospace, monospace" font-size="14" fill="#3d5165">+</text>
      </g>`}
    <rect x="0" y="52" width="180" height="16" rx="5" fill="#26313f"/>
    <rect x="0" y="52" width="180" height="5" rx="2.5" fill="#3b4b5e" opacity=".75"/>
    <rect x="4" y="68" width="172" height="7" rx="3" fill="#17202b"/>
    <rect x="10" y="75" width="8" height="26" rx="3" fill="#121a24"/>
    <rect x="162" y="75" width="8" height="26" rx="3" fill="#121a24"/>
    <rect x="22" y="2" width="66" height="44" rx="5" fill="#0a1018" stroke="#2c3a4b"/>
    <rect x="27" y="7" width="56" height="32" rx="3" fill="${screen}" opacity="${occupied ? '.9' : '.35'}"/>
    ${occupied ? `
    <g opacity=".55">
      <rect x="31" y="11" width="22" height="2.4" rx="1.2" fill="#071018"/>
      <rect x="31" y="16" width="34" height="2.4" rx="1.2" fill="#071018"/>
      <rect x="31" y="21" width="16" height="2.4" rx="1.2" fill="#071018"/>
      <rect x="31" y="26" width="28" height="2.4" rx="1.2" fill="#071018"/>
      <rect x="31" y="31" width="20" height="2.4" rx="1.2" fill="#071018"/>
    </g>
    <rect class="scan" x="27" y="7" width="56" height="6" fill="#ffffff" opacity=".12"/>` : ''}
    <rect x="48" y="46" width="14" height="6" rx="2" fill="#2c3a4b"/>
    <rect x="100" y="44" width="52" height="8" rx="3" fill="#1b2532" stroke="#2a3748" transform="rotate(-3 126 48)"/>
    <rect x="160" y="39" width="10" height="13" rx="3" fill="${occupied ? '#f472b6' : '#2a3748'}"/>
    <rect x="171" y="43" width="4" height="6" rx="2" fill="none" stroke="${occupied ? '#f472b6' : '#2a3748'}" stroke-width="2"/>
    ${occupied ? `<circle cx="165" cy="35" r="2.5" fill="#f9a8d4" opacity=".5"/>` : ''}
  </g>`;
}

export function officeSVG() {
  const capacity = OFFICES[S.office].capacity;
  const visible = Math.min(capacity, 6);
  const slots = [
    { x: 120, y: 245, s: 1 },
    { x: 400, y: 245, s: 1 },
    { x: 680, y: 245, s: 1 },
    { x: 60, y: 150, s: 0.8 },
    { x: 335, y: 150, s: 0.8 },
    { x: 610, y: 150, s: 0.8 },
  ];
  const desks = slots.slice(0, visible).map((slot, i) => desk(slot.x, slot.y, slot.s, S.staff[i], i)).join('');
  const mood = avgMorale();
  const glow = mood < 45 ? '#f87171' : '#5eead4';
  const trophies = S.awards;

  return `
  <svg class="office-svg" viewBox="0 0 900 360" role="img" aria-label="The studio office">
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#141d28"/><stop offset="1" stop-color="#0c121a"/>
      </linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#101822"/><stop offset="1" stop-color="#070b10"/>
      </linearGradient>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b1230"/><stop offset=".55" stop-color="#2a2050"/><stop offset="1" stop-color="#0f3b45"/>
      </linearGradient>
      <radialGradient id="moonGlow"><stop offset="0" stop-color="#d9f7ff" stop-opacity=".85"/><stop offset="1" stop-color="#d9f7ff" stop-opacity="0"/></radialGradient>
      <radialGradient id="moodGlow"><stop offset="0" stop-color="${glow}" stop-opacity=".10"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
      <linearGradient id="neon" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#5eead4"/><stop offset=".55" stop-color="#7dd3fc"/><stop offset="1" stop-color="#a78bfa"/>
      </linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="2.2"/></filter>
    </defs>

    <rect width="900" height="360" fill="url(#wall)"/>
    <rect y="188" width="900" height="172" fill="url(#floor)"/>
    <rect y="186" width="900" height="3" fill="#22303f"/>
    <g opacity=".5" stroke="#1a2532" stroke-width="1">
      <path d="M0 218h900M0 252h900M0 294h900M0 344h900"/>
      <path d="M120 188 40 360M340 188 300 360M560 188 620 360M790 188 900 340"/>
    </g>
    <ellipse cx="450" cy="180" rx="430" ry="200" fill="url(#moodGlow)"/>

    <!-- window -->
    <g>
      <rect x="612" y="34" width="250" height="146" rx="10" fill="url(#sky)" stroke="#2a3a4d" stroke-width="3"/>
      <circle cx="806" cy="70" r="26" fill="url(#moonGlow)"/>
      <circle cx="806" cy="70" r="11" fill="#e9fbff" opacity=".9"/>
      <g fill="#0a1220" opacity=".92">
        <rect x="626" y="128" width="18" height="52"/><rect x="650" y="112" width="26" height="68"/>
        <rect x="682" y="136" width="16" height="44"/><rect x="704" y="100" width="22" height="80"/>
        <rect x="732" y="124" width="30" height="56"/><rect x="768" y="110" width="18" height="70"/>
        <rect x="792" y="132" width="24" height="48"/><rect x="822" y="118" width="26" height="62"/>
      </g>
      <g fill="#7dd3fc" opacity=".55">
        <rect x="654" y="120" width="3" height="3"/><rect x="662" y="128" width="3" height="3"/><rect x="710" y="108" width="3" height="3"/>
        <rect x="716" y="120" width="3" height="3"/><rect x="740" y="132" width="3" height="3"/><rect x="802" y="140" width="3" height="3"/>
        <rect x="828" y="126" width="3" height="3"/><rect x="688" y="144" width="3" height="3"/>
      </g>
      <path d="M737 34v146M612 108h250" stroke="#2a3a4d" stroke-width="4"/>
      <rect x="612" y="34" width="250" height="146" rx="10" fill="none" stroke="#33465b" stroke-width="2"/>
    </g>

    <!-- whiteboard -->
    <g transform="rotate(-.6 168 100)">
      <rect x="44" y="34" width="250" height="126" rx="6" fill="#dfe8f1" stroke="#c3d0dd" stroke-width="2"/>
      <text x="60" y="56" font-family="ui-monospace, monospace" font-size="11" font-weight="700" fill="#334155" letter-spacing="1.4">ROADMAP / Q3</text>
      <path d="M60 64h218" stroke="#94a3b8" stroke-width="1.4" stroke-dasharray="5 4"/>
      <g font-family="ui-monospace, monospace" font-size="8.5" fill="#475569">
        <text x="60" y="82">01 CONCEPT</text><text x="60" y="96">02 BUILD</text><text x="60" y="110">03 POLISH</text><text x="60" y="124">04 SHIP</text>
      </g>
      <g>
        <rect x="132" y="76" width="44" height="30" rx="2" fill="#fde68a"/>
        <rect x="184" y="76" width="44" height="30" rx="2" fill="#a7f3d0"/>
        <rect x="236" y="76" width="42" height="30" rx="2" fill="#fbcfe8"/>
        <path d="M140 84h26M140 90h20M140 96h24" stroke="#a16207" stroke-width="1.2" opacity=".55"/>
        <path d="M192 84h26M192 90h18M192 96h24" stroke="#047857" stroke-width="1.2" opacity=".55"/>
        <path d="M244 84h24M244 90h20M244 96h16" stroke="#9d174d" stroke-width="1.2" opacity=".55"/>
      </g>
      <g transform="rotate(-5 120 132)">
        <text x="60" y="146" font-family="ui-monospace, monospace" font-size="16" font-weight="700" fill="#ef4444" opacity=".82">SHIP IT</text>
        <path d="M60 150h62" stroke="#ef4444" stroke-width="2" opacity=".5"/>
      </g>
      <rect x="270" y="44" width="8" height="8" rx="2" fill="#94a3b8"/>
      <rect x="270" y="144" width="8" height="8" rx="2" fill="#94a3b8"/>
    </g>

    <!-- neon sign -->
    <g>
      <text x="450" y="92" text-anchor="middle" font-family="ui-monospace, monospace" font-size="30" font-weight="700" letter-spacing="5" fill="url(#neon)" opacity=".25" filter="url(#soft)">PIXEL FORGE</text>
      <text x="450" y="92" text-anchor="middle" font-family="ui-monospace, monospace" font-size="30" font-weight="700" letter-spacing="5" fill="none" stroke="url(#neon)" stroke-width="1.1">PIXEL FORGE</text>
      <text x="450" y="110" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" letter-spacing="4" fill="#5eead4" opacity=".55">EST. 2026</text>
    </g>

    <!-- clock -->
    <g transform="translate(540 52)">
      <circle r="17" fill="#0d141d" stroke="#2b3a4b" stroke-width="2"/>
      <circle r="14" fill="none" stroke="#1d2936" stroke-width="1"/>
      <path d="M0 0V-9M0 0l5 4" stroke="#5eead4" stroke-width="1.8" stroke-linecap="round"/>
      <circle r="1.6" fill="#5eead4"/>
    </g>

    <!-- trophy shelf -->
    <g transform="translate(30 172)">
      <rect x="0" y="0" width="92" height="4" rx="2" fill="#2b3a4b"/>
      ${Array.from({ length: Math.min(3, Math.max(0, trophies)) }).map((_, i) => `
        <g transform="translate(${14 + i * 26} -14)">
          <path d="M0 0h12v5a6 6 0 0 1-12 0z" fill="#fbbf24"/>
          <path d="M0 1h-3v2a3 3 0 0 0 3 3M12 1h3v2a3 3 0 0 1-3 3" stroke="#fbbf24" fill="none" stroke-width="1.2"/>
          <rect x="4" y="11" width="4" height="3" fill="#d97706"/><rect x="2" y="14" width="8" height="2" rx="1" fill="#d97706"/>
        </g>`).join('')}
    </g>

    <!-- plant -->
    <g transform="translate(846 262)">
      <path d="M-12 30h24l-4 34h-16z" fill="#7c4a2d"/>
      <path d="M-12 30h24l-2 8h-20z" fill="#8b5a37"/>
      <g stroke="#34d399" stroke-width="3" fill="none" stroke-linecap="round">
        <path d="M0 28C0 10-14 6-20-6"/><path d="M0 28C2 8 14 6 20-8"/><path d="M0 28C-2 12-2 2-6-12"/><path d="M0 26C6 14 12 10 16 2"/>
      </g>
      <g fill="#34d399">
        <ellipse cx="-20" cy="-7" rx="6" ry="3.4" transform="rotate(-40 -20 -7)"/>
        <ellipse cx="20" cy="-9" rx="6" ry="3.4" transform="rotate(40 20 -9)"/>
        <ellipse cx="-6" cy="-13" rx="5" ry="3" transform="rotate(-70 -6 -13)"/>
        <ellipse cx="16" cy="1" rx="5" ry="3" transform="rotate(25 16 1)"/>
      </g>
    </g>

    <!-- desks -->
    ${desks}

    <!-- ambient dust -->
    <g fill="#e2f7ff" opacity=".18">
      <circle cx="120" cy="120" r="1.2"/><circle cx="300" cy="80" r="1"/><circle cx="500" cy="160" r="1.3"/>
      <circle cx="700" cy="120" r="1"/><circle cx="380" cy="210" r="1.1"/><circle cx="820" cy="200" r="1.2"/>
    </g>
    <rect width="900" height="360" fill="none" stroke="#1c2733" stroke-width="2"/>
  </svg>`;
}
