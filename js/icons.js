// Minimal line-icon set, drawn inline so the game has zero external assets.
const P = {
  home: '<path d="M3 10.6 12 3l9 7.6V21H3z"/><path d="M9 21v-6h6v6"/>',
  gamepad: '<rect x="2" y="7" width="20" height="10.5" rx="4.5"/><path d="M7 10.5v4M5 12.5h4"/><circle cx="16.5" cy="11.4" r="1" fill="currentColor" stroke="none"/><circle cx="18.7" cy="13.6" r="1" fill="currentColor" stroke="none"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.8 21v-1.2A5.8 5.8 0 0 1 8.6 14h.8a5.8 5.8 0 0 1 5.8 5.8V21"/><path d="M16.2 5.3a3.1 3.1 0 0 1 0 5.9M17.6 14.3a5.6 5.6 0 0 1 3.6 5.2V21"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.4 3.8 5.5 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.5-3.8-9S9.5 5.4 12 3z"/>',
  trophy: '<path d="M8 4h8v4.5a4 4 0 0 1-8 0z"/><path d="M8 5H4.5v1.5A3.5 3.5 0 0 0 8 10M16 5h3.5v1.5A3.5 3.5 0 0 1 16 10"/><path d="M12 12.5V16M9 20h6M10 16h4l1 4H9z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5v11M15 8.8c-.6-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2.3 0 3.1 6 1.6 6 4.6 0 1.4-1.3 2.3-3 2.3-1.4 0-2.4-.5-3-1.5"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  flask: '<path d="M9.5 3h5M10.5 3v5.5L5.4 18a2.4 2.4 0 0 0 2.1 3.5h9a2.4 2.4 0 0 0 2.1-3.5L13.5 8.5V3"/><path d="M8 14h8"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  play: '<path d="M7 4.8v14.4L20 12z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  bug: '<circle cx="12" cy="13" r="5"/><path d="M12 8V5M9 5h6M7 10 4.5 8M7 16l-2.5 2M17 10l2.5-2M17 16l2.5 2M4 13H2M22 13h-2M9 8 7 6M15 8l2-2"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  zap: '<path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.4l3.4 2"/>',
  heart: '<path d="M12 20.5S3.5 15.2 3.5 9.4A4.9 4.9 0 0 1 12 6a4.9 4.9 0 0 1 8.5 3.4c0 5.8-8.5 11.1-8.5 11.1z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  arrowRight: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M20 12H5M11 6l-6 6 6 6"/>',
  soundOn: '<path d="M4 9.5h4L13 5v14l-5-4.5H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  soundOff: '<path d="M4 9.5h4L13 5v14l-5-4.5H4z"/><path d="m17 9 5 6M22 9l-5 6"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
  shuffle: '<path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7M21 16v5h-5M14 14l7 7M3 8V3h5M10 10 3 3"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12.5h18"/>',
  coffee: '<path d="M4 8h13v6.5A5.5 5.5 0 0 1 11.5 20h-2A5.5 5.5 0 0 1 4 14.5z"/><path d="M17 9.5h1.5a2.5 2.5 0 0 1 0 5H17M7 3v2M11 3v2M15 3v2"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  dot: '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
};

export function icon(name, size = 18, cls = '') {
  const body = P[name] || P.dot;
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
