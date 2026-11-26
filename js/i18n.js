// Tiny i18n layer. English is the source dictionary; a missing translation
// always falls back to readable English instead of showing a raw key.
import {
  GENRES, THEMES, PLATFORMS, ENGINES, ROLES, SCOPES, OFFICES, UPGRADES, DISC,
} from './data.js';
import en from './lang/en.js';
import fr from './lang/fr.js';
import es from './lang/es.js';
import de from './lang/de.js';
import ja from './lang/ja.js';

export const LANGS = [
  { id: 'en', code: 'EN', native: 'English', english: 'English', locale: 'en-US' },
  { id: 'fr', code: 'FR', native: 'Français', english: 'French', locale: 'fr-FR' },
  { id: 'es', code: 'ES', native: 'Español', english: 'Spanish', locale: 'es-ES' },
  { id: 'de', code: 'DE', native: 'Deutsch', english: 'German', locale: 'de-DE' },
  { id: 'ja', code: 'JA', native: '日本語', english: 'Japanese', locale: 'ja-JP' },
];

const DICTS = { en, fr, es, de, ja };
const SOURCE = {
  genre: GENRES, theme: THEMES, platform: PLATFORMS, engine: ENGINES,
  role: ROLES, scope: SCOPES, office: OFFICES, upgrade: UPGRADES, disc: DISC,
};
const AUDIENCE_SOURCE = { core: 'Core', casual: 'Casual', family: 'Family', hardcore: 'Hardcore' };

let current = 'en';
try {
  const saved = localStorage.getItem('pixelforge.lang');
  if (saved && LANGS.some(l => l.id === saved)) current = saved;
  else {
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (['fr', 'es', 'de', 'ja'].includes(nav)) current = nav;
  }
} catch (e) { /* storage blocked */ }

export function getLang() { return current; }
export function setLang(id) {
  if (!LANGS.some(l => l.id === id)) id = 'en';
  current = id;
  try { localStorage.setItem('pixelforge.lang', id); } catch (e) { /* noop */ }
  try { document.documentElement.lang = id; } catch (e) { /* noop */ }
  return current;
}
export function langMeta(id = current) {
  return LANGS.find(l => l.id === id) || LANGS[0];
}
export function locale() { return langMeta().locale; }

function interpolate(text, vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

export function t(key, vars) {
  if (key == null) return '';
  const dict = DICTS[current] || {};
  let out = dict[key];
  if (out == null) out = en[key];
  if (out == null) out = key;
  return interpolate(out, vars);
}

// Plural helper: looks up key.one / key.other.
export function tn(key, n, vars) {
  return t(`${key}.${n === 1 ? 'one' : 'other'}`, { ...(vars || {}), n });
}

export function td(cat, id, field = 'name') {
  const lang = DICTS[current];
  const translated = lang?.data?.[cat]?.[id]?.[field];
  if (translated != null) return translated;
  if (cat === 'audience') return AUDIENCE_SOURCE[id] ?? id;
  return SOURCE[cat]?.[id]?.[field] ?? id;
}

// Vars may carry ids for game entities; turn them into localized names.
export function resolveVars(vars) {
  if (!vars) return {};
  const out = { ...vars };
  if (out.genre) out.genre = td('genre', out.genre);
  if (out.theme) out.theme = td('theme', out.theme);
  if (out.platform) out.platform = td('platform', out.platform);
  if (out.engine) out.engine = td('engine', out.engine);
  if (out.role) out.role = td('role', out.role);
  if (out.upgrade) out.upgrade = td('upgrade', out.upgrade);
  if (out.office) out.office = td('office', out.office);
  if (out.scope) out.scope = td('scope', out.scope);
  if (out.audience) out.audience = td('audience', out.audience);
  if (out.disc) out.disc = td('disc', out.disc);
  if (out.ach) out.achName = t(out.ach);
  if (out.lang) out.lang = langMeta(out.lang).native;
  return out;
}

export function tt(key, vars) {
  return t(key, resolveVars(vars));
}

export function applyStaticI18n(root = document) {
  try { document.documentElement.lang = current; } catch (e) { /* noop */ }
  try { document.title = t('app.title'); } catch (e) { /* noop */ }
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', t(el.dataset.i18nTitle));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  });
}

export function fmtDate(week) {
  const y = Math.floor((week - 1) / 52) + 1;
  const w = ((week - 1) % 52) + 1;
  return t('releases.yearWeek', { y, w });
}
