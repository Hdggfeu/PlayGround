import { BUILDINGS } from "./data.js";

const TAU = Math.PI * 2;

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function diamond(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
}

export function fillDiamond(ctx, cx, cy, w, h, fill) {
  diamond(ctx, cx, cy, w, h);
  ctx.fillStyle = fill;
  ctx.fill();
}

function shade(hex, amount) {
  if (!hex || !hex.startsWith("#")) return hex;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = clamp(Math.round(r + amount), 0, 255);
  g = clamp(Math.round(g + amount), 0, 255);
  b = clamp(Math.round(b + amount), 0, 255);
  return `rgb(${r},${g},${b})`;
}

function rgba(hex, alpha) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function isoFace(ctx, cx, cy, hw, hd, height, u1, u2, v1, v2, side, fill) {
  const pt = (u, v) => ({
    x: side === "right" ? cx + u * hw : cx - u * hw,
    y: cy + hd - u * hd - v * height,
  });
  const a = pt(u1, v1);
  const b = pt(u2, v1);
  const c = pt(u2, v2);
  const d = pt(u1, v2);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function prism(ctx, cx, cy, w, d, h, colors) {
  const hw = w / 2;
  const hd = d / 2;
  // left face
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy - h);
  ctx.lineTo(cx, cy + hd - h);
  ctx.lineTo(cx, cy + hd);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.fillStyle = colors.left;
  ctx.fill();
  // right face
  ctx.beginPath();
  ctx.moveTo(cx + hw, cy - h);
  ctx.lineTo(cx, cy + hd - h);
  ctx.lineTo(cx, cy + hd);
  ctx.lineTo(cx + hw, cy);
  ctx.closePath();
  ctx.fillStyle = colors.right;
  ctx.fill();
  // top
  ctx.beginPath();
  ctx.moveTo(cx, cy - hd - h);
  ctx.lineTo(cx + hw, cy - h);
  ctx.lineTo(cx, cy + hd - h);
  ctx.lineTo(cx - hw, cy - h);
  ctx.closePath();
  ctx.fillStyle = colors.top;
  ctx.fill();
}

function roof(ctx, cx, cy, w, d, h, colors, ridge = 0.2) {
  const hw = w / 2;
  const hd = d / 2;
  const tw = w * ridge;
  const td = d * ridge;
  const topY = cy - h;
  // left roof face
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy);
  ctx.lineTo(cx, cy + hd);
  ctx.lineTo(cx + tw / 2, topY + td / 2);
  ctx.lineTo(cx - tw / 2, topY + td / 2);
  ctx.closePath();
  ctx.fillStyle = colors.left;
  ctx.fill();
  // right roof face
  ctx.beginPath();
  ctx.moveTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hd);
  ctx.lineTo(cx + tw / 2, topY + td / 2);
  ctx.lineTo(cx - tw / 2, topY + td / 2);
  ctx.closePath();
  ctx.fillStyle = colors.right;
  ctx.fill();
  // back-left face
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy);
  ctx.lineTo(cx, cy - hd);
  ctx.lineTo(cx - tw / 2, topY - td / 2);
  ctx.lineTo(cx - tw / 2, topY + td / 2);
  ctx.closePath();
  ctx.fillStyle = colors.back || colors.left;
  ctx.fill();
  // back-right face
  ctx.beginPath();
  ctx.moveTo(cx + hw, cy);
  ctx.lineTo(cx, cy - hd);
  ctx.lineTo(cx + tw / 2, topY - td / 2);
  ctx.lineTo(cx + tw / 2, topY + td / 2);
  ctx.closePath();
  ctx.fillStyle = colors.backRight || colors.right;
  ctx.fill();
  // top cap
  fillDiamond(ctx, cx, topY, tw, td, colors.top || colors.left);
  // ridge highlight
  ctx.strokeStyle = colors.ridge || "rgba(255,255,255,.25)";
  ctx.lineWidth = Math.max(1, w * 0.014);
  ctx.beginPath();
  ctx.moveTo(cx - tw / 2, topY);
  ctx.lineTo(cx + tw / 2, topY);
  ctx.stroke();
}

function pyramidRoof(ctx, cx, cy, w, d, h, colors) {
  const hw = w / 2;
  const hd = d / 2;
  const apexY = cy - h;
  // back
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy);
  ctx.lineTo(cx, cy - hd);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, apexY);
  ctx.closePath();
  ctx.fillStyle = colors.back || colors.left;
  ctx.fill();
  // front left
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy);
  ctx.lineTo(cx, cy + hd);
  ctx.lineTo(cx, apexY);
  ctx.closePath();
  ctx.fillStyle = colors.left;
  ctx.fill();
  // front right
  ctx.beginPath();
  ctx.moveTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hd);
  ctx.lineTo(cx, apexY);
  ctx.closePath();
  ctx.fillStyle = colors.right;
  ctx.fill();
  ctx.strokeStyle = colors.ridge || "rgba(255,255,255,.2)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + hd);
  ctx.lineTo(cx, apexY);
  ctx.stroke();
}

function platform(ctx, cx, cy, hw, hd, s, tone = "grass") {
  ctx.save();
  ctx.globalAlpha *= 0.4;
  ctx.fillStyle = "#061425";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8 * s, hw * 1.02, hd * 0.72, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  const top = tone === "grass" ? "#67c661" : tone === "sand" ? "#d5bd86" : "#8a9a9e";
  prism(ctx, cx, cy, hw * 2, hd * 2, 7 * s, {
    top,
    left: shade(top, -42),
    right: shade(top, -22),
  });
  // rim light
  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = Math.max(1, 1.2 * s);
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy - 7 * s);
  ctx.lineTo(cx, cy - hd - 7 * s);
  ctx.lineTo(cx + hw, cy - 7 * s);
  ctx.stroke();
}

function grassTufts(ctx, cx, cy, hw, hd, s, t) {
  const spots = [
    [-0.62, -0.2], [0.5, -0.34], [0.62, 0.16], [-0.3, 0.35],
  ];
  for (let i = 0; i < spots.length; i++) {
    const [u, v] = spots[i];
    const x = cx + u * hw;
    const y = cy + v * hd - 7 * s;
    const sway = Math.sin(t * 1.7 + i * 1.3) * 1.2 * s;
    ctx.strokeStyle = i % 2 ? "#8ee37e" : "#4caa56";
    ctx.lineWidth = Math.max(1, 1.1 * s);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sway, y - 4 * s, x + sway + 1.5 * s, y - 7 * s);
    ctx.stroke();
  }
}

function flag(ctx, x, y, height, s, color, t, emblem = false) {
  ctx.strokeStyle = "#49331d";
  ctx.lineWidth = Math.max(1, 1.7 * s);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - height);
  ctx.stroke();
  const wave = Math.sin(t * 3.2 + x * 0.01) * 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(x, y - height);
  ctx.quadraticCurveTo(x + 8 * s, y - height + wave, x + 17 * s, y - height + 2 * s);
  ctx.lineTo(x + 14 * s, y - height + 9 * s);
  ctx.quadraticCurveTo(x + 6 * s, y - height + 8 * s + wave, x, y - height + 10 * s);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (emblem) {
    ctx.fillStyle = "rgba(255,240,170,.8)";
    ctx.beginPath();
    ctx.arc(x + 8 * s, y - height + 5 * s, 1.8 * s, 0, TAU);
    ctx.fill();
  }
}

function windowOnFace(ctx, cx, cy, hw, hd, h, u, v, s, side, lit = true, w = 0.11, hh = 0.22) {
  isoFace(ctx, cx, cy, hw, hd, h, u - w / 2, u + w / 2, v, v + hh, side, lit ? "#ffd47b" : "#33465a");
  if (lit) {
    ctx.save();
    ctx.globalAlpha *= 0.35;
    isoFace(ctx, cx, cy, hw, hd, h, u - w * 0.75, u + w * 0.75, v - 0.03, v + hh + 0.05, side, "#ffcf6b");
    ctx.restore();
  }
}

function doorOnFace(ctx, cx, cy, hw, hd, h, u, s, side, color = "#4b2c19") {
  isoFace(ctx, cx, cy, hw, hd, h, u - 0.07, u + 0.07, 0, 0.55, side, color);
  isoFace(ctx, cx, cy, hw, hd, h, u - 0.055, u + 0.055, 0.02, 0.52, side, shade(color, 18));
  ctx.fillStyle = "#ffd36c";
  ctx.beginPath();
  const px = side === "right" ? cx + u * hw : cx - u * hw;
  const py = cy + hd - u * hd - h * 0.24;
  ctx.arc(px + (side === "right" ? 2 : -2) * s, py, 1.1 * s, 0, TAU);
  ctx.fill();
}

function smoke(ctx, x, y, s, t, color = "rgba(226,239,245,.32)", count = 3) {
  for (let i = 0; i < count; i++) {
    const p = ((t * 0.28 + i / count) % 1);
    const r = (2.5 + p * 6) * s;
    ctx.fillStyle = color;
    ctx.globalAlpha = (1 - p) * 0.6;
    ctx.beginPath();
    ctx.arc(x + Math.sin(t * 1.2 + i * 2) * 3 * s, y - p * 27 * s, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function goldPile(ctx, x, y, s, t) {
  const glint = (Math.sin(t * 2.4 + x * 0.02) + 1) / 2;
  ctx.fillStyle = "#b97b20";
  ctx.beginPath();
  ctx.ellipse(x, y, 10 * s, 4 * s, 0, 0, TAU);
  ctx.fill();
  const coins = [
    [-5, -2], [0, -4], [5, -1], [-2, -6], [3, -7],
  ];
  for (let i = 0; i < coins.length; i++) {
    const [dx, dy] = coins[i];
    ctx.fillStyle = i % 2 ? "#ffd35c" : "#f4ac2e";
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y + dy * s, 3.2 * s, 2.2 * s, -0.3, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,245,180,.7)";
    ctx.lineWidth = 0.7 * s;
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(255,255,210,${0.2 + glint * 0.65})`;
  ctx.beginPath();
  ctx.arc(x + 3 * s, y - 7 * s, 1.3 * s, 0, TAU);
  ctx.fill();
}

function drawTownhall(ctx, cx, cy, s, level, t, opts) {
  const hw = 74 * s;
  const hd = 37 * s;
  platform(ctx, cx, cy, hw, hd, s);
  grassTufts(ctx, cx, cy, hw, hd, s, t);
  // stairs
  prism(ctx, cx, cy + 20 * s, 42 * s, 20 * s, 5 * s, { top: "#d7c8a4", left: "#8f8068", right: "#b4a486" });
  const bw = 122 * s;
  const bd = 60 * s;
  const bh = 49 * s;
  const by = cy + 2 * s;
  prism(ctx, cx, by, bw, bd, bh, {
    top: "#d8d1b7",
    left: "#b9ad91",
    right: "#d3c7a6",
  });
  // wall texture bands
  for (let i = 1; i <= 3; i++) {
    ctx.strokeStyle = "rgba(103,86,62,.18)";
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.moveTo(cx - bw / 2 + 3 * s, by - (bh / 3) * i + 2 * s);
    ctx.lineTo(cx, by + bd / 2 - (bh / 3) * i + 2 * s);
    ctx.lineTo(cx + bw / 2 - 3 * s, by - (bh / 3) * i + 2 * s);
    ctx.stroke();
  }
  // door and windows
  doorOnFace(ctx, cx, by, bw / 2, bd / 2, bh, 0.27, s, "right", "#4b2d19");
  doorOnFace(ctx, cx, by, bw / 2, bd / 2, bh, 0.27, s, "left", "#4b2d19");
  windowOnFace(ctx, cx, by, bw / 2, bd / 2, bh, 0.62, 0.38, s, "right", true);
  windowOnFace(ctx, cx, by, bw / 2, bd / 2, bh, 0.62, 0.38, s, "left", true);
  windowOnFace(ctx, cx, by, bw / 2, bd / 2, bh, 0.42, 0.46, s, "right", true, 0.08, 0.16);
  windowOnFace(ctx, cx, by, bw / 2, bd / 2, bh, 0.42, 0.46, s, "left", true, 0.08, 0.16);
  // gold belt
  ctx.strokeStyle = "#d49c2c";
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(cx - bw / 2, by - 2 * s);
  ctx.lineTo(cx, by + bd / 2 - 2 * s);
  ctx.lineTo(cx + bw / 2, by - 2 * s);
  ctx.stroke();
  // roof
  roof(ctx, cx, by - bh + 1 * s, 146 * s, 72 * s, 35 * s, {
    top: "#57d7d6",
    left: "#2f9fb2",
    right: "#47c5ca",
    back: "#247f96",
    backRight: "#2a94a8",
    ridge: "rgba(255,241,167,.55)",
  }, 0.3);
  // roof trim
  ctx.strokeStyle = "#f2c355";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 73 * s, by - bh);
  ctx.lineTo(cx, by - bh + 36 * s);
  ctx.lineTo(cx + 73 * s, by - bh);
  ctx.stroke();
  // cupola
  const cupY = by - bh - 24 * s;
  prism(ctx, cx, cupY, 24 * s, 12 * s, 13 * s, { top: "#f7efcf", left: "#c7b58d", right: "#e4d7b0" });
  pyramidRoof(ctx, cx, cupY - 13 * s, 34 * s, 17 * s, 18 * s, { left: "#3bb7c4", right: "#56d8d6", back: "#2d8da2" });
  flag(ctx, cx, cupY - 31 * s, 22 * s, s, "#ffd15e", t, true);
  // level pips
  ctx.fillStyle = "#ffe08b";
  for (let i = 0; i < Math.min(level, 6); i++) {
    ctx.beginPath();
    ctx.arc(cx - 18 * s + i * 7 * s, cy + 18 * s, 1.7 * s, 0, TAU);
    ctx.fill();
  }
}

function drawGoldmine(ctx, cx, cy, s, level, t) {
  const hw = 53 * s;
  const hd = 27 * s;
  platform(ctx, cx, cy, hw, hd, s, "sand");
  // rocks
  ctx.fillStyle = "#7a7568";
  ctx.beginPath();
  ctx.ellipse(cx - 21 * s, cy - 2 * s, 24 * s, 17 * s, -0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#9c9583";
  ctx.beginPath();
  ctx.ellipse(cx - 17 * s, cy - 12 * s, 18 * s, 13 * s, 0.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#b8ad94";
  ctx.beginPath();
  ctx.ellipse(cx - 12 * s, cy - 19 * s, 11 * s, 8 * s, 0, 0, TAU);
  ctx.fill();
  // entrance
  ctx.fillStyle = "#2f241b";
  ctx.beginPath();
  ctx.ellipse(cx + 9 * s, cy - 2 * s, 15 * s, 17 * s, 0, Math.PI, TAU);
  ctx.lineTo(cx + 24 * s, cy + 1 * s);
  ctx.lineTo(cx - 6 * s, cy + 1 * s);
  ctx.closePath();
  ctx.fill();
  // wood beams
  ctx.strokeStyle = "#6d4a24";
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 7 * s, cy + 1 * s);
  ctx.lineTo(cx - 7 * s, cy - 14 * s);
  ctx.moveTo(cx + 24 * s, cy + 1 * s);
  ctx.lineTo(cx + 24 * s, cy - 14 * s);
  ctx.moveTo(cx - 9 * s, cy - 14 * s);
  ctx.lineTo(cx + 26 * s, cy - 14 * s);
  ctx.stroke();
  ctx.strokeStyle = "#a47a3e";
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 7 * s, cy - 12 * s);
  ctx.lineTo(cx + 24 * s, cy - 12 * s);
  ctx.stroke();
  // rails
  ctx.strokeStyle = "#4b4c4c";
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(cx + 3 * s, cy + 9 * s);
  ctx.lineTo(cx + 20 * s, cy + 16 * s);
  ctx.moveTo(cx + 7 * s, cy + 7 * s);
  ctx.lineTo(cx + 24 * s, cy + 14 * s);
  ctx.stroke();
  // cart
  ctx.save();
  ctx.translate(cx + 18 * s, cy + 9 * s);
  ctx.fillStyle = "#8b5b28";
  ctx.beginPath();
  ctx.moveTo(-7 * s, -6 * s);
  ctx.lineTo(8 * s, -2 * s);
  ctx.lineTo(6 * s, 7 * s);
  ctx.lineTo(-9 * s, 2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffce52";
  ctx.beginPath();
  ctx.ellipse(-1 * s, -5 * s, 6 * s, 3 * s, -0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
  // gold
  goldPile(ctx, cx - 23 * s, cy + 12 * s, s * 0.9, t);
  goldPile(ctx, cx - 34 * s, cy + 2 * s, s * 0.62, t);
  // pulley
  ctx.strokeStyle = "#4a3117";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(cx + 30 * s, cy + 2 * s);
  ctx.lineTo(cx + 30 * s, cy - 35 * s);
  ctx.lineTo(cx + 16 * s, cy - 31 * s);
  ctx.stroke();
  ctx.fillStyle = "#d6a441";
  ctx.beginPath();
  ctx.arc(cx + 16 * s, cy - 30 * s, 4 * s, 0, TAU);
  ctx.fill();
  // level marker
  for (let i = 0; i < Math.min(level, 5); i++) {
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(cx - 11 * s + i * 6 * s, cy + 19 * s, 1.4 * s, 0, TAU);
    ctx.fill();
  }
}

function drawElixirPump(ctx, cx, cy, s, level, t) {
  const hw = 53 * s;
  const hd = 27 * s;
  platform(ctx, cx, cy, hw, hd, s, "grass");
  grassTufts(ctx, cx, cy, hw, hd, s, t);
  // pipes
  ctx.strokeStyle = "#7a7f90";
  ctx.lineWidth = 5 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx + 19 * s, cy - 2 * s);
  ctx.quadraticCurveTo(cx + 36 * s, cy - 4 * s, cx + 36 * s, cy - 21 * s);
  ctx.stroke();
  ctx.strokeStyle = "#a9adba";
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  // tank
  ctx.save();
  const tankX = cx - 4 * s;
  const tankY = cy - 4 * s;
  const grad = ctx.createLinearGradient(tankX - 22 * s, 0, tankX + 24 * s, 0);
  grad.addColorStop(0, "#9c3fbf");
  grad.addColorStop(0.45, "#d779f2");
  grad.addColorStop(0.7, "#9e42c8");
  grad.addColorStop(1, "#6f289a");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(tankX - 22 * s, tankY - 4 * s);
  ctx.bezierCurveTo(tankX - 25 * s, tankY - 45 * s, tankX + 22 * s, tankY - 48 * s, tankX + 22 * s, tankY - 4 * s);
  ctx.bezierCurveTo(tankX + 21 * s, tankY + 8 * s, tankX - 20 * s, tankY + 8 * s, tankX - 22 * s, tankY - 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.3)";
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(tankX - 12 * s, tankY - 35 * s);
  ctx.quadraticCurveTo(tankX - 7 * s, tankY - 22 * s, tankX - 9 * s, tankY - 5 * s);
  ctx.stroke();
  // metal bands
  ctx.strokeStyle = "#c9c4b4";
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.ellipse(tankX, tankY - 28 * s, 20 * s, 6 * s, 0, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(tankX, tankY - 7 * s, 21 * s, 7 * s, 0, 0, TAU);
  ctx.stroke();
  // glass dome
  ctx.fillStyle = "rgba(242,213,255,.22)";
  ctx.beginPath();
  ctx.ellipse(tankX, tankY - 47 * s, 17 * s, 8 * s, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#eab9ff";
  ctx.beginPath();
  ctx.ellipse(tankX, tankY - 48 * s, 10 * s, 4 * s, 0, 0, TAU);
  ctx.fill();
  // bubbles
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.22 + i * 0.27) % 1;
    ctx.fillStyle = `rgba(255,214,255,${0.45 * (1 - p)})`;
    ctx.beginPath();
    ctx.arc(tankX + Math.sin(i * 3 + t) * 8 * s, tankY - 10 * s - p * 30 * s, (2 + i * 0.3) * s, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // pump arm
  const angle = Math.sin(t * 1.25) * 0.12;
  ctx.save();
  ctx.translate(cx + 24 * s, cy - 25 * s);
  ctx.rotate(angle);
  ctx.fillStyle = "#7c4d25";
  ctx.fillRect(-2 * s, -4 * s, 25 * s, 5 * s);
  ctx.fillStyle = "#c58c42";
  ctx.beginPath();
  ctx.arc(21 * s, 0, 5 * s, 0, TAU);
  ctx.fill();
  ctx.restore();
  // valve
  ctx.fillStyle = "#d8a43c";
  ctx.beginPath();
  ctx.arc(cx + 35 * s, cy - 21 * s, 5 * s, 0, TAU);
  ctx.fill();
  for (let i = 0; i < Math.min(level, 5); i++) {
    ctx.fillStyle = "#f4c5ff";
    ctx.beginPath();
    ctx.arc(cx - 10 * s + i * 6 * s, cy + 19 * s, 1.4 * s, 0, TAU);
    ctx.fill();
  }
}

function drawVault(ctx, cx, cy, s, level, t) {
  const hw = 53 * s;
  const hd = 27 * s;
  platform(ctx, cx, cy, hw, hd, s, "grass");
  // chest body
  prism(ctx, cx, cy + 2 * s, 82 * s, 40 * s, 34 * s, {
    top: "#a66c30",
    left: "#6f421e",
    right: "#8d5726",
  });
  // curved lid
  ctx.fillStyle = "#8b5628";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 32 * s, 41 * s, 14 * s, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = "#c18139";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 34 * s, 37 * s, 11 * s, 0, Math.PI, TAU);
  ctx.fill();
  // gold bands
  ctx.strokeStyle = "#f0bd4c";
  ctx.lineWidth = 3.2 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 28 * s, cy - 42 * s);
  ctx.lineTo(cx - 28 * s, cy + 16 * s);
  ctx.moveTo(cx + 28 * s, cy - 42 * s);
  ctx.lineTo(cx + 28 * s, cy + 16 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy - 32 * s, 41 * s, 13 * s, 0, Math.PI, TAU);
  ctx.stroke();
  // lock
  ctx.fillStyle = "#ffd45f";
  roundRect(ctx, cx - 8 * s, cy - 18 * s, 16 * s, 16 * s, 3 * s);
  ctx.fill();
  ctx.fillStyle = "#6b4311";
  ctx.beginPath();
  ctx.arc(cx, cy - 10 * s, 2.2 * s, 0, TAU);
  ctx.fill();
  ctx.fillRect(cx - 1 * s, cy - 10 * s, 2 * s, 5 * s);
  // coin emblem
  ctx.fillStyle = "#ffd86c";
  ctx.beginPath();
  ctx.arc(cx - 22 * s, cy + 14 * s, 4 * s, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,246,184,.7)";
  ctx.beginPath();
  ctx.arc(cx - 22 * s, cy + 14 * s, 2 * s, 0, TAU);
  ctx.fill();
  for (let i = 0; i < Math.min(level, 5); i++) {
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(cx - 10 * s + i * 6 * s, cy + 20 * s, 1.4 * s, 0, TAU);
    ctx.fill();
  }
}

function drawElixirStore(ctx, cx, cy, s, level, t) {
  const hw = 53 * s;
  const hd = 27 * s;
  platform(ctx, cx, cy, hw, hd, s, "grass");
  // vat
  const grad = ctx.createLinearGradient(cx - 30 * s, 0, cx + 30 * s, 0);
  grad.addColorStop(0, "#7b329e");
  grad.addColorStop(0.4, "#df83f5");
  grad.addColorStop(0.75, "#a64bcc");
  grad.addColorStop(1, "#6c2690");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - 30 * s, cy + 1 * s);
  ctx.bezierCurveTo(cx - 35 * s, cy - 30 * s, cx - 27 * s, cy - 50 * s, cx - 17 * s, cy - 53 * s);
  ctx.lineTo(cx + 17 * s, cy - 53 * s);
  ctx.bezierCurveTo(cx + 27 * s, cy - 50 * s, cx + 35 * s, cy - 30 * s, cx + 30 * s, cy + 1 * s);
  ctx.bezierCurveTo(cx + 25 * s, cy + 10 * s, cx - 25 * s, cy + 10 * s, cx - 30 * s, cy + 1 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.25)";
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 18 * s, cy - 40 * s);
  ctx.quadraticCurveTo(cx - 13 * s, cy - 21 * s, cx - 17 * s, cy - 2 * s);
  ctx.stroke();
  // metal rings
  ctx.strokeStyle = "#b9a69d";
  ctx.lineWidth = 3 * s;
  for (const yy of [-36, -16, 2]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy + yy * s, 28 * s, 8 * s, 0, 0, TAU);
    ctx.stroke();
  }
  // cork / top
  ctx.fillStyle = "#8a5a31";
  roundRect(ctx, cx - 13 * s, cy - 62 * s, 26 * s, 11 * s, 3 * s);
  ctx.fill();
  ctx.fillStyle = "#e4bb79";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 62 * s, 13 * s, 4 * s, 0, 0, TAU);
  ctx.fill();
  // sparkles
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.2 + i * 0.3) % 1;
    ctx.fillStyle = `rgba(255,221,255,${0.7 * (1 - p)})`;
    ctx.beginPath();
    ctx.arc(cx + Math.sin(t * 2 + i * 2) * 22 * s, cy - p * 55 * s, 1.3 * s, 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < Math.min(level, 5); i++) {
    ctx.fillStyle = "#f4c5ff";
    ctx.beginPath();
    ctx.arc(cx - 10 * s + i * 6 * s, cy + 18 * s, 1.4 * s, 0, TAU);
    ctx.fill();
  }
}

function drawBarracks(ctx, cx, cy, s, level, t) {
  const hw = 53 * s;
  const hd = 27 * s;
  platform(ctx, cx, cy, hw, hd, s, "sand");
  // main tent body
  const bodyTop = cy - 58 * s;
  ctx.fillStyle = "#b34836";
  ctx.beginPath();
  ctx.moveTo(cx - 40 * s, cy + 12 * s);
  ctx.lineTo(cx - 32 * s, bodyTop + 10 * s);
  ctx.lineTo(cx + 33 * s, bodyTop + 2 * s);
  ctx.lineTo(cx + 43 * s, cy + 9 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d65e45";
  ctx.beginPath();
  ctx.moveTo(cx - 32 * s, bodyTop + 10 * s);
  ctx.lineTo(cx - 4 * s, bodyTop - 8 * s);
  ctx.lineTo(cx + 33 * s, bodyTop + 2 * s);
  ctx.lineTo(cx + 2 * s, bodyTop + 13 * s);
  ctx.closePath();
  ctx.fill();
  // stripes
  ctx.strokeStyle = "rgba(255,219,160,.36)";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 24 * s, cy + 7 * s);
  ctx.lineTo(cx - 18 * s, bodyTop + 12 * s);
  ctx.moveTo(cx + 6 * s, cy + 8 * s);
  ctx.lineTo(cx + 12 * s, bodyTop + 2 * s);
  ctx.stroke();
  // entrance
  ctx.fillStyle = "#52291f";
  ctx.beginPath();
  ctx.moveTo(cx - 12 * s, cy + 11 * s);
  ctx.lineTo(cx - 9 * s, bodyTop + 17 * s);
  ctx.lineTo(cx + 8 * s, bodyTop + 15 * s);
  ctx.lineTo(cx + 12 * s, cy + 10 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#e8b15a";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 12 * s, cy + 11 * s);
  ctx.lineTo(cx - 9 * s, bodyTop + 17 * s);
  ctx.lineTo(cx + 8 * s, bodyTop + 15 * s);
  ctx.lineTo(cx + 12 * s, cy + 10 * s);
  ctx.stroke();
  // crossed swords sign
  const sx = cx + 25 * s;
  const sy = cy - 20 * s;
  ctx.fillStyle = "#7c4a22";
  roundRect(ctx, sx - 13 * s, sy - 10 * s, 26 * s, 21 * s, 4 * s);
  ctx.fill();
  ctx.strokeStyle = "#d8ac68";
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();
  ctx.strokeStyle = "#f2d19a";
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(sx - 7 * s, sy - 6 * s);
  ctx.lineTo(sx + 7 * s, sy + 6 * s);
  ctx.moveTo(sx + 7 * s, sy - 6 * s);
  ctx.lineTo(sx - 7 * s, sy + 6 * s);
  ctx.stroke();
  // pole + flag
  ctx.strokeStyle = "#4a3117";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(cx + 39 * s, cy + 7 * s);
  ctx.lineTo(cx + 39 * s, cy - 70 * s);
  ctx.stroke();
  flag(ctx, cx + 39 * s, cy - 70 * s, 18 * s, s, "#ffcf58", t);
  // training dummy
  ctx.strokeStyle = "#5a3b1d";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 39 * s, cy + 16 * s);
  ctx.lineTo(cx - 39 * s, cy - 10 * s);
  ctx.moveTo(cx - 45 * s, cy - 4 * s);
  ctx.lineTo(cx - 33 * s, cy - 4 * s);
  ctx.stroke();
  ctx.fillStyle = "#d3a363";
  ctx.beginPath();
  ctx.arc(cx - 39 * s, cy - 13 * s, 4 * s, 0, TAU);
  ctx.fill();
  // smoke from side
  smoke(ctx, cx + 21 * s, bodyTop + 5 * s, s * 0.8, t, "rgba(238,226,200,.22)", 2);
  for (let i = 0; i < Math.min(level, 5); i++) {
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(cx - 10 * s + i * 6 * s, cy + 19 * s, 1.4 * s, 0, TAU);
    ctx.fill();
  }
}

function drawCamp(ctx, cx, cy, s, level, t) {
  const hw = 53 * s;
  const hd = 27 * s;
  platform(ctx, cx, cy, hw, hd, s, "grass");
  grassTufts(ctx, cx, cy, hw, hd, s, t);
  // small tent left
  ctx.fillStyle = "#4f8f6a";
  ctx.beginPath();
  ctx.moveTo(cx - 42 * s, cy + 7 * s);
  ctx.lineTo(cx - 27 * s, cy - 30 * s);
  ctx.lineTo(cx - 9 * s, cy + 5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#69b57f";
  ctx.beginPath();
  ctx.moveTo(cx - 42 * s, cy + 7 * s);
  ctx.lineTo(cx - 27 * s, cy - 30 * s);
  ctx.lineTo(cx - 25 * s, cy + 7 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#284934";
  ctx.beginPath();
  ctx.moveTo(cx - 31 * s, cy + 5 * s);
  ctx.lineTo(cx - 27 * s, cy - 11 * s);
  ctx.lineTo(cx - 21 * s, cy + 4 * s);
  ctx.closePath();
  ctx.fill();
  // big tent right
  ctx.fillStyle = "#b35a3b";
  ctx.beginPath();
  ctx.moveTo(cx + 9 * s, cy + 10 * s);
  ctx.lineTo(cx + 29 * s, cy - 37 * s);
  ctx.lineTo(cx + 49 * s, cy + 6 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d8754c";
  ctx.beginPath();
  ctx.moveTo(cx + 9 * s, cy + 10 * s);
  ctx.lineTo(cx + 29 * s, cy - 37 * s);
  ctx.lineTo(cx + 31 * s, cy + 9 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#5d2c20";
  ctx.beginPath();
  ctx.moveTo(cx + 25 * s, cy + 8 * s);
  ctx.lineTo(cx + 29 * s, cy - 14 * s);
  ctx.lineTo(cx + 35 * s, cy + 7 * s);
  ctx.closePath();
  ctx.fill();
  // campfire
  const fx = cx - 7 * s;
  const fy = cy + 15 * s;
  ctx.fillStyle = "#5b4026";
  ctx.beginPath();
  ctx.ellipse(fx, fy, 13 * s, 5 * s, 0, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const fh = (10 + Math.sin(t * 7 + i * 1.8) * 3) * s;
    ctx.fillStyle = i === 0 ? "#ffdf6a" : i === 1 ? "#ff9a45" : "#ff6e3c";
    ctx.beginPath();
    ctx.moveTo(fx - (5 - i) * s, fy - 1 * s);
    ctx.quadraticCurveTo(fx - 2 * s, fy - fh, fx + 1 * s, fy - 3 * s);
    ctx.quadraticCurveTo(fx + 5 * s, fy - fh * 0.8, fx + (6 - i) * s, fy - 1 * s);
    ctx.closePath();
    ctx.fill();
  }
  // weapon rack
  ctx.strokeStyle = "#6a4622";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(cx + 39 * s, cy + 18 * s);
  ctx.lineTo(cx + 39 * s, cy - 6 * s);
  ctx.moveTo(cx + 43 * s, cy + 17 * s);
  ctx.lineTo(cx + 43 * s, cy - 4 * s);
  ctx.moveTo(cx + 36 * s, cy - 2 * s);
  ctx.lineTo(cx + 46 * s, cy - 5 * s);
  ctx.stroke();
  ctx.strokeStyle = "#d8d7cc";
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(cx + 40 * s, cy - 2 * s);
  ctx.lineTo(cx + 40 * s, cy + 7 * s);
  ctx.moveTo(cx + 44 * s, cy - 3 * s);
  ctx.lineTo(cx + 44 * s, cy + 6 * s);
  ctx.stroke();
  // banner
  flag(ctx, cx - 47 * s, cy + 5 * s, 28 * s, s, "#6de2dd", t);
  for (let i = 0; i < Math.min(level, 5); i++) {
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(cx - 10 * s + i * 6 * s, cy + 20 * s, 1.4 * s, 0, TAU);
    ctx.fill();
  }
}

function drawCannon(ctx, cx, cy, s, level, t) {
  const hw = 53 * s;
  const hd = 27 * s;
  platform(ctx, cx, cy, hw, hd, s, "sand");
  // circular stone base
  ctx.fillStyle = "#6f7474";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2 * s, 37 * s, 17 * s, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#8e9591";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 2 * s, 35 * s, 15 * s, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#aab0a8";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 6 * s, 30 * s, 12 * s, 0, 0, TAU);
  ctx.fill();
  // stone blocks
  ctx.strokeStyle = "rgba(58,66,63,.35)";
  ctx.lineWidth = 1 * s;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 14 * s, cy - 6 * s + Math.sin(a) * 6 * s);
    ctx.lineTo(cx + Math.cos(a) * 29 * s, cy - 6 * s + Math.sin(a) * 11 * s);
    ctx.stroke();
  }
  // turret mount
  ctx.fillStyle = "#8c5e2e";
  ctx.beginPath();
  ctx.ellipse(cx - 3 * s, cy - 14 * s, 18 * s, 8 * s, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#a87438";
  ctx.beginPath();
  ctx.ellipse(cx - 3 * s, cy - 18 * s, 15 * s, 6 * s, 0, 0, TAU);
  ctx.fill();
  // barrel
  ctx.save();
  ctx.translate(cx - 3 * s, cy - 22 * s);
  ctx.rotate(-0.32 + Math.sin(t * 0.5) * 0.015);
  const bg = ctx.createLinearGradient(0, -8 * s, 0, 8 * s);
  bg.addColorStop(0, "#576169");
  bg.addColorStop(0.5, "#394249");
  bg.addColorStop(1, "#20282e");
  ctx.fillStyle = bg;
  roundRect(ctx, -2 * s, -9 * s, 48 * s, 18 * s, 7 * s);
  ctx.fill();
  ctx.fillStyle = "#1e262b";
  ctx.beginPath();
  ctx.ellipse(46 * s, 0, 4 * s, 9 * s, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#d4a640";
  ctx.fillRect(9 * s, -9 * s, 4 * s, 18 * s);
  ctx.fillRect(31 * s, -9 * s, 4 * s, 18 * s);
  ctx.fillStyle = "rgba(255,255,255,.16)";
  roundRect(ctx, 5 * s, -7 * s, 31 * s, 3 * s, 2 * s);
  ctx.fill();
  ctx.restore();
  // wheel
  ctx.strokeStyle = "#70431e";
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.arc(cx + 9 * s, cy - 5 * s, 10 * s, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "#b47934";
  ctx.lineWidth = 1.5 * s;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ctx.beginPath();
    ctx.moveTo(cx + 9 * s, cy - 5 * s);
    ctx.lineTo(cx + 9 * s + Math.cos(a) * 9 * s, cy - 5 * s + Math.sin(a) * 9 * s);
    ctx.stroke();
  }
  for (let i = 0; i < Math.min(level, 5); i++) {
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(cx - 10 * s + i * 6 * s, cy + 20 * s, 1.4 * s, 0, TAU);
    ctx.fill();
  }
}

function drawTower(ctx, cx, cy, s, level, t) {
  const hw = 53 * s;
  const hd = 27 * s;
  platform(ctx, cx, cy, hw, hd, s, "sand");
  // stone tower base
  prism(ctx, cx, cy + 3 * s, 58 * s, 29 * s, 30 * s, {
    top: "#a7afa8",
    left: "#717d7a",
    right: "#8f9992",
  });
  // wooden legs
  ctx.strokeStyle = "#6b4421";
  ctx.lineWidth = 3.5 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 22 * s, cy - 25 * s);
  ctx.lineTo(cx - 15 * s, cy - 67 * s);
  ctx.moveTo(cx + 22 * s, cy - 25 * s);
  ctx.lineTo(cx + 15 * s, cy - 67 * s);
  ctx.moveTo(cx - 2 * s, cy - 26 * s);
  ctx.lineTo(cx, cy - 67 * s);
  ctx.stroke();
  ctx.strokeStyle = "#9b6c35";
  ctx.lineWidth = 1.3 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 20 * s, cy - 35 * s);
  ctx.lineTo(cx + 19 * s, cy - 50 * s);
  ctx.moveTo(cx + 20 * s, cy - 35 * s);
  ctx.lineTo(cx - 19 * s, cy - 50 * s);
  ctx.stroke();
  // platform
  prism(ctx, cx, cy - 66 * s, 54 * s, 27 * s, 9 * s, {
    top: "#a56f33",
    left: "#6d451e",
    right: "#8a5928",
  });
  // railing
  ctx.strokeStyle = "#5e3c1d";
  ctx.lineWidth = 2 * s;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 9 * s, cy - 68 * s + Math.abs(i) * 1.4 * s);
    ctx.lineTo(cx + i * 9 * s, cy - 78 * s + Math.abs(i) * 1.4 * s);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - 22 * s, cy - 73 * s);
  ctx.lineTo(cx, cy - 81 * s);
  ctx.lineTo(cx + 22 * s, cy - 73 * s);
  ctx.stroke();
  // archer
  ctx.fillStyle = "#d8a56d";
  ctx.beginPath();
  ctx.arc(cx - 3 * s, cy - 88 * s, 5.5 * s, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#31585e";
  ctx.beginPath();
  ctx.moveTo(cx - 10 * s, cy - 82 * s);
  ctx.lineTo(cx + 5 * s, cy - 82 * s);
  ctx.lineTo(cx + 4 * s, cy - 70 * s);
  ctx.lineTo(cx - 9 * s, cy - 70 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#56d9dc";
  ctx.beginPath();
  ctx.arc(cx - 3 * s, cy - 92 * s, 5 * s, Math.PI, TAU);
  ctx.fill();
  ctx.strokeStyle = "#d6c17a";
  ctx.lineWidth = 1.1 * s;
  ctx.beginPath();
  ctx.arc(cx + 8 * s, cy - 79 * s, 9 * s, -1.1, 1.1);
  ctx.stroke();
  // roof
  pyramidRoof(ctx, cx, cy - 96 * s, 46 * s, 23 * s, 24 * s, {
    left: "#c3533e",
    right: "#e06e4f",
    back: "#953e35",
  });
  flag(ctx, cx, cy - 118 * s, 18 * s, s, "#ffd15e", t, true);
  for (let i = 0; i < Math.min(level, 5); i++) {
    ctx.fillStyle = "#ffe08a";
    ctx.beginPath();
    ctx.arc(cx - 10 * s + i * 6 * s, cy + 20 * s, 1.4 * s, 0, TAU);
    ctx.fill();
  }
}

function drawWall(ctx, cx, cy, s, level, t) {
  const hw = 29 * s;
  const hd = 15 * s;
  // shadow
  ctx.fillStyle = "rgba(4,12,24,.24)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4 * s, hw * 0.9, hd * 0.55, 0, 0, TAU);
  ctx.fill();
  prism(ctx, cx, cy, 54 * s, 27 * s, 17 * s, {
    top: "#a9b5b4",
    left: "#68777a",
    right: "#859291",
  });
  // block lines
  ctx.strokeStyle = "rgba(56,71,76,.4)";
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 27 * s, cy - 9 * s);
  ctx.lineTo(cx, cy + 5 * s);
  ctx.lineTo(cx + 27 * s, cy - 9 * s);
  ctx.stroke();
  // crenellations
  for (let i = -1; i <= 1; i++) {
    const bx = cx + i * 13 * s;
    const by = cy - 17 * s + Math.abs(i) * 6 * s;
    prism(ctx, bx, by, 11 * s, 6 * s, 7 * s, {
      top: "#bac4c1",
      left: "#768485",
      right: "#95a09d",
    });
  }
  // moss / gold
  ctx.fillStyle = level >= 3 ? "rgba(255,209,92,.6)" : "rgba(101,167,90,.45)";
  ctx.beginPath();
  ctx.ellipse(cx - 12 * s, cy - 1 * s, 5 * s, 2 * s, -0.2, 0, TAU);
  ctx.fill();
}

function drawHut(ctx, cx, cy, s, level, t) {
  const hw = 29 * s;
  const hd = 15 * s;
  platform(ctx, cx, cy, hw, hd, s, "grass");
  // hut body
  prism(ctx, cx, cy + 2 * s, 40 * s, 20 * s, 25 * s, {
    top: "#b98247",
    left: "#81562c",
    right: "#a16e38",
  });
  // roof
  roof(ctx, cx, cy - 23 * s, 47 * s, 24 * s, 18 * s, {
    top: "#5b9e5c",
    left: "#3c7a46",
    right: "#4d8e50",
    back: "#2f673c",
    ridge: "rgba(212,255,179,.35)",
  }, 0.16);
  // door
  ctx.fillStyle = "#4d2f19";
  roundRect(ctx, cx - 4 * s, cy - 11 * s, 8 * s, 13 * s, 2 * s);
  ctx.fill();
  // window
  ctx.fillStyle = "#ffd277";
  ctx.beginPath();
  ctx.arc(cx + 10 * s, cy - 9 * s, 2.5 * s, 0, TAU);
  ctx.fill();
  // chimney
  prism(ctx, cx - 11 * s, cy - 27 * s, 8 * s, 4 * s, 13 * s, {
    top: "#7b8581",
    left: "#5a6361",
    right: "#69736f",
  });
  smoke(ctx, cx - 11 * s, cy - 41 * s, s * 0.8, t, "rgba(226,239,245,.35)", 3);
  // hammer sign
  ctx.fillStyle = "#7a4d22";
  roundRect(ctx, cx + 11 * s, cy - 22 * s, 12 * s, 10 * s, 2 * s);
  ctx.fill();
  ctx.strokeStyle = "#ffd36a";
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(cx + 14 * s, cy - 19 * s);
  ctx.lineTo(cx + 20 * s, cy - 15 * s);
  ctx.stroke();
  ctx.fillStyle = "#ffd36a";
  ctx.beginPath();
  ctx.arc(cx + 20 * s, cy - 15 * s, 2 * s, 0, TAU);
  ctx.fill();
}

function drawPortal(ctx, cx, cy, s, level, t) {
  const hw = 53 * s;
  const hd = 27 * s;
  platform(ctx, cx, cy, hw, hd, s, "sand");
  // arch
  ctx.strokeStyle = "#7d8b8a";
  ctx.lineWidth = 13 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 24 * s, cy + 8 * s);
  ctx.lineTo(cx - 24 * s, cy - 34 * s);
  ctx.quadraticCurveTo(cx, cy - 68 * s, cx + 24 * s, cy - 34 * s);
  ctx.lineTo(cx + 24 * s, cy + 8 * s);
  ctx.stroke();
  ctx.strokeStyle = "#b7c2bd";
  ctx.lineWidth = 5 * s;
  ctx.stroke();
  // portal energy
  const grad = ctx.createRadialGradient(cx, cy - 23 * s, 2, cx, cy - 23 * s, 31 * s);
  grad.addColorStop(0, "rgba(199,255,255,.9)");
  grad.addColorStop(0.4, "rgba(84,231,241,.62)");
  grad.addColorStop(1, "rgba(57,91,221,.08)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 24 * s, 21 * s, 31 * s, 0, 0, TAU);
  ctx.fill();
  // swirls
  ctx.strokeStyle = "rgba(219,255,255,.45)";
  ctx.lineWidth = 1.2 * s;
  for (let i = 0; i < 3; i++) {
    const a = t * 0.7 + i * 2.1;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * 5 * s, cy - 24 * s + Math.sin(a) * 8 * s, 8 * s, 18 * s, a * 0.25, 0, TAU);
    ctx.stroke();
  }
  // banners
  flag(ctx, cx - 35 * s, cy + 8 * s, 33 * s, s, "#65dfe8", t, true);
  flag(ctx, cx + 35 * s, cy + 8 * s, 33 * s, s, "#b875ff", t, true);
  // runes
  for (let i = 0; i < 4; i++) {
    const a = t * 0.5 + i * Math.PI / 2;
    ctx.fillStyle = "rgba(127,246,255,.55)";
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 35 * s, cy + 3 * s + Math.sin(a) * 12 * s, 1.3 * s, 0, TAU);
    ctx.fill();
  }
}

function drawAmberTree(ctx, cx, cy, s, level, t, variant = 0) {
  const hw = 20 * s;
  const hd = 10 * s;
  ctx.fillStyle = "rgba(4,12,24,.24)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4 * s, hw, hd * 0.6, 0, 0, TAU);
  ctx.fill();
  // trunk
  ctx.strokeStyle = "#68411f";
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 2 * s);
  ctx.lineTo(cx + (variant % 2 ? -3 : 3) * s, cy - 28 * s);
  ctx.stroke();
  ctx.strokeStyle = "#8d5a2b";
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  // branches
  ctx.strokeStyle = "#68411f";
  ctx.lineWidth = 2.2 * s;
  ctx.beginPath();
  ctx.moveTo(cx + 1 * s, cy - 20 * s);
  ctx.lineTo(cx - 11 * s, cy - 29 * s);
  ctx.moveTo(cx + 2 * s, cy - 24 * s);
  ctx.lineTo(cx + 12 * s, cy - 34 * s);
  ctx.stroke();
  // canopy
  const colors = ["#e39a2e", "#ffc453", "#f2b43f", "#d77b24"];
  const blobs = [
    [-14, -36, 14], [3, -45, 17], [15, -35, 13], [-2, -30, 15], [0, -52, 10],
  ];
  for (let i = 0; i < blobs.length; i++) {
    const [dx, dy, r] = blobs[i];
    ctx.fillStyle = colors[(i + variant) % colors.length];
    ctx.beginPath();
    ctx.arc(cx + dx * s, cy + dy * s + Math.sin(t * 1.2 + i) * 0.7 * s, r * s, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,245,180,.35)";
  ctx.beginPath();
  ctx.arc(cx - 4 * s, cy - 47 * s, 6 * s, 0, TAU);
  ctx.fill();
  // falling glints
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.18 + i * 0.33) % 1;
    ctx.fillStyle = `rgba(255,220,110,${0.55 * (1 - p)})`;
    ctx.beginPath();
    ctx.arc(cx + Math.sin(i * 5 + t) * 16 * s, cy - 30 * s + p * 35 * s, 1.2 * s, 0, TAU);
    ctx.fill();
  }
}

function drawSnoxTotem(ctx, cx, cy, s, level, t) {
  const hw = 20 * s;
  const hd = 10 * s;
  ctx.fillStyle = "rgba(4,12,24,.24)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 3 * s, hw, hd * 0.6, 0, 0, TAU);
  ctx.fill();
  prism(ctx, cx, cy, 28 * s, 14 * s, 10 * s, { top: "#7a8b86", left: "#4e5d5d", right: "#62716f" });
  prism(ctx, cx, cy - 10 * s, 22 * s, 11 * s, 39 * s, { top: "#78a79b", left: "#426e69", right: "#58857d" });
  // glowing S
  ctx.strokeStyle = "#7ef5dd";
  ctx.lineWidth = 3 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy - 34 * s, 7 * s, 0.5, 4.4);
  ctx.stroke();
  ctx.strokeStyle = "rgba(126,245,221,.25)";
  ctx.lineWidth = 8 * s;
  ctx.stroke();
  // eyes
  ctx.fillStyle = "#ffd55f";
  ctx.beginPath();
  ctx.arc(cx - 4 * s, cy - 47 * s, 1.7 * s, 0, TAU);
  ctx.arc(cx + 4 * s, cy - 47 * s, 1.7 * s, 0, TAU);
  ctx.fill();
  // energy particles
  for (let i = 0; i < 4; i++) {
    const a = t * 0.9 + i * 1.7;
    ctx.fillStyle = `rgba(125,245,221,${0.35 + Math.sin(t * 2 + i) * 0.2})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 17 * s, cy - 30 * s + Math.sin(a) * 15 * s, 1.1 * s, 0, TAU);
    ctx.fill();
  }
}

export function drawBuilding(ctx, type, level, cx, cy, s, t = 0, opts = {}) {
  if (!BUILDINGS[type]) return;
  const alpha = opts.alpha ?? 1;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (opts.silhouette) ctx.filter = "brightness(0) saturate(0)";
  switch (type) {
    case "townhall": drawTownhall(ctx, cx, cy, s, level, t, opts); break;
    case "goldmine": drawGoldmine(ctx, cx, cy, s, level, t, opts); break;
    case "elixirpump": drawElixirPump(ctx, cx, cy, s, level, t, opts); break;
    case "vault": drawVault(ctx, cx, cy, s, level, t, opts); break;
    case "elixirstore": drawElixirStore(ctx, cx, cy, s, level, t, opts); break;
    case "barracks": drawBarracks(ctx, cx, cy, s, level, t, opts); break;
    case "camp": drawCamp(ctx, cx, cy, s, level, t, opts); break;
    case "cannon": drawCannon(ctx, cx, cy, s, level, t, opts); break;
    case "tower": drawTower(ctx, cx, cy, s, level, t, opts); break;
    case "wall": drawWall(ctx, cx, cy, s, level, t, opts); break;
    case "hut": drawHut(ctx, cx, cy, s, level, t, opts); break;
    case "portal": drawPortal(ctx, cx, cy, s, level, t, opts); break;
    case "amberTree": drawAmberTree(ctx, cx, cy, s, level, t, opts.variant || 0); break;
    case "snoxTotem": drawSnoxTotem(ctx, cx, cy, s, level, t); break;
    default: break;
  }
  ctx.restore();
}

export function drawTree(ctx, x, y, s, t, variant = 0, tone = 0) {
  const palettes = [
    ["#2d7e4d", "#3d9a56", "#55b667", "#236a43"],
    ["#b15c2f", "#d9813c", "#edaa4e", "#8d462a"],
    ["#3b7f7a", "#55a79a", "#6ec7a9", "#2b686a"],
  ];
  const p = palettes[tone % palettes.length];
  ctx.fillStyle = "rgba(3,12,23,.24)";
  ctx.beginPath();
  ctx.ellipse(x, y + 3 * s, 19 * s, 7 * s, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5f3f23";
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(x, y + 2 * s);
  ctx.lineTo(x + (variant % 2 ? -2 : 2) * s, y - 21 * s);
  ctx.stroke();
  const blobs = [
    [-11, -28, 13], [7, -32, 15], [0, -42, 12], [13, -22, 10], [-6, -19, 10],
  ];
  for (let i = 0; i < blobs.length; i++) {
    const [dx, dy, r] = blobs[i];
    ctx.fillStyle = p[(i + variant) % p.length];
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s + Math.sin(t * 1.1 + i + variant) * 0.6 * s, r * s, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(221,255,196,.18)";
  ctx.beginPath();
  ctx.arc(x - 4 * s, y - 43 * s, 4 * s, 0, TAU);
  ctx.fill();
}

export function drawPine(ctx, x, y, s, t, variant = 0) {
  ctx.fillStyle = "rgba(3,12,23,.24)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2 * s, 14 * s, 5 * s, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#5f3f23";
  ctx.lineWidth = 3.5 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 16 * s);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const yy = y - 13 * s - i * 11 * s;
    const w = (20 - i * 4) * s;
    ctx.fillStyle = i === 0 ? "#246c48" : i === 1 ? "#2f8053" : "#3a925d";
    ctx.beginPath();
    ctx.moveTo(x, yy - 18 * s);
    ctx.lineTo(x + w, yy + 4 * s);
    ctx.lineTo(x - w, yy + 4 * s);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawRock(ctx, x, y, s, t, variant = 0) {
  ctx.fillStyle = "rgba(3,12,23,.2)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2 * s, 14 * s, 5 * s, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#727f80";
  ctx.beginPath();
  ctx.ellipse(x - 3 * s, y - 5 * s, 11 * s, 8 * s, -0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#8b9794";
  ctx.beginPath();
  ctx.ellipse(x + 3 * s, y - 9 * s, 7 * s, 6 * s, 0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(197,212,202,.3)";
  ctx.beginPath();
  ctx.ellipse(x + 1 * s, y - 12 * s, 4 * s, 2 * s, 0, 0, TAU);
  ctx.fill();
  if (variant % 3 === 0) {
    ctx.fillStyle = "#5e9b55";
    ctx.beginPath();
    ctx.ellipse(x - 6 * s, y - 3 * s, 4 * s, 2 * s, 0.2, 0, TAU);
    ctx.fill();
  }
}

export function drawBush(ctx, x, y, s, t, variant = 0) {
  ctx.fillStyle = "rgba(3,12,23,.2)";
  ctx.beginPath();
  ctx.ellipse(x, y + 1 * s, 11 * s, 4 * s, 0, 0, TAU);
  ctx.fill();
  const colors = ["#4b9b4d", "#60ad56", "#77bc62"];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(x + (i - 1) * 6 * s, y - 5 * s - (i === 1 ? 3 * s : 0), (5 + (i === 1 ? 2 : 0)) * s, 0, TAU);
    ctx.fill();
  }
  if (variant % 2) {
    ctx.fillStyle = "#ffd66d";
    ctx.beginPath();
    ctx.arc(x + 4 * s, y - 9 * s, 1.3 * s, 0, TAU);
    ctx.fill();
  }
}

export function drawFlowers(ctx, x, y, s, t, variant = 0) {
  const colors = ["#ffd66d", "#ff8fb4", "#9be7ff", "#f7b7ff"];
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + variant;
    ctx.fillStyle = colors[(i + variant) % colors.length];
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 6 * s, y + Math.sin(a) * 3 * s, 1.4 * s, 0, TAU);
    ctx.fill();
  }
}

export function drawPond(ctx, cx, cy, w, h, t) {
  ctx.save();
  const g = ctx.createRadialGradient(cx - w * 0.1, cy - h * 0.15, 2, cx, cy, w * 0.6);
  g.addColorStop(0, "#69dbe2");
  g.addColorStop(0.55, "#2c9cbd");
  g.addColorStop(1, "#1b658a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(202,255,246,.42)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2 - 3, h / 2 - 3, 0, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = t * 0.35 + i * 1.6;
    const rx = w * 0.18;
    const ry = h * 0.13;
    ctx.strokeStyle = `rgba(210,255,255,${0.14 + i * 0.04})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * w * 0.18, cy + Math.sin(a) * h * 0.16, rx, ry, 0, 0, TAU);
    ctx.stroke();
  }
  // lily pads
  ctx.fillStyle = "rgba(74,159,92,.9)";
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.16, cy - h * 0.08, 7, 3.2, 0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,182,211,.9)";
  ctx.beginPath();
  ctx.arc(cx + w * 0.16, cy - h * 0.14, 2.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawTorch(ctx, x, y, s, t) {
  ctx.strokeStyle = "#56391c";
  ctx.lineWidth = 2.4 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 26 * s);
  ctx.stroke();
  ctx.fillStyle = "#6e4623";
  ctx.beginPath();
  ctx.arc(x, y - 27 * s, 3.4 * s, 0, TAU);
  ctx.fill();
  const f = 1 + Math.sin(t * 8 + x) * 0.18;
  ctx.fillStyle = "rgba(255,162,62,.3)";
  ctx.beginPath();
  ctx.arc(x, y - 34 * s, 9 * s * f, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#ffd25e";
  ctx.beginPath();
  ctx.moveTo(x - 3.5 * s, y - 29 * s);
  ctx.quadraticCurveTo(x - 1 * s, y - 42 * s * f, x + 1 * s, y - 30 * s);
  ctx.quadraticCurveTo(x + 4 * s, y - 40 * s * f, x + 4 * s, y - 29 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ff8c3f";
  ctx.beginPath();
  ctx.ellipse(x + 1 * s, y - 32 * s, 2.2 * s, 4.5 * s * f, 0, 0, TAU);
  ctx.fill();
}

export function drawSelection(ctx, cx, cy, w, h, color = "#ffd35f", t = 0) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.setLineDash([7, 5]);
  ctx.lineDashOffset = -t * 16;
  diamond(ctx, cx, cy, w, h);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function drawGhost(ctx, cx, cy, w, h, valid, t) {
  ctx.save();
  ctx.strokeStyle = valid ? "#8bffbd" : "#ff7b6b";
  ctx.fillStyle = valid ? "rgba(91,255,169,.22)" : "rgba(255,102,90,.2)";
  ctx.lineWidth = 2;
  diamond(ctx, cx, cy, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.6;
  ctx.setLineDash([5, 5]);
  ctx.lineDashOffset = -t * 14;
  diamond(ctx, cx, cy - 2, w, h);
  ctx.stroke();
  ctx.restore();
}

export function drawTroop(ctx, type, x, y, s, t, opts = {}) {
  const def = opts.def;
  const bob = Math.sin((opts.phase || 0) + t * 9) * (opts.moving ? 2.2 : 1.2) * s;
  const dir = opts.flip ? -1 : 1;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(dir, 1);
  ctx.globalAlpha = opts.alpha ?? 1;
  // shadow
  ctx.fillStyle = "rgba(4,12,24,.28)";
  ctx.beginPath();
  ctx.ellipse(0, 2 * s, 11 * s, 4 * s, 0, 0, TAU);
  ctx.fill();
  if (type === "ronce") drawRonce(ctx, s, t, opts);
  else if (type === "plume") drawPlume(ctx, s, t, opts);
  else if (type === "colosse") drawColosse(ctx, s, t, opts);
  ctx.restore();
  if (opts.hp != null && opts.maxHp) {
    const w = 24 * s;
    const pct = clamp(opts.hp / opts.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,.55)";
    roundRect(ctx, x - w / 2, y - 34 * s + bob, w, 4 * s, 2 * s);
    ctx.fill();
    ctx.fillStyle = pct > 0.5 ? "#74ec8e" : pct > 0.25 ? "#ffd45c" : "#ff7667";
    roundRect(ctx, x - w / 2 + 0.5, y - 33.5 * s + bob, (w - 1) * pct, 3 * s, 1.5 * s);
    ctx.fill();
  }
}

function drawRonce(ctx, s, t, opts) {
  // legs
  ctx.fillStyle = "#6b3d20";
  ctx.beginPath();
  ctx.ellipse(-5 * s, -2 * s, 3.3 * s, 5 * s, 0.1, 0, TAU);
  ctx.ellipse(5 * s, -2 * s, 3.3 * s, 5 * s, -0.1, 0, TAU);
  ctx.fill();
  // body
  ctx.fillStyle = "#b96c35";
  roundRect(ctx, -9 * s, -22 * s, 18 * s, 17 * s, 6 * s);
  ctx.fill();
  ctx.fillStyle = "#d7a05e";
  roundRect(ctx, -7 * s, -21 * s, 13 * s, 8 * s, 4 * s);
  ctx.fill();
  // belt
  ctx.fillStyle = "#5a321a";
  ctx.fillRect(-9 * s, -12 * s, 18 * s, 3 * s);
  ctx.fillStyle = "#ffd05a";
  ctx.fillRect(-2 * s, -12 * s, 4 * s, 3 * s);
  // head
  ctx.fillStyle = "#e8b27a";
  ctx.beginPath();
  ctx.arc(0, -28 * s, 8.5 * s, 0, TAU);
  ctx.fill();
  // hair/mohawk
  ctx.fillStyle = "#e86b36";
  ctx.beginPath();
  ctx.moveTo(-7 * s, -33 * s);
  ctx.lineTo(-3 * s, -44 * s);
  ctx.lineTo(1 * s, -35 * s);
  ctx.lineTo(4 * s, -43 * s);
  ctx.lineTo(7 * s, -33 * s);
  ctx.closePath();
  ctx.fill();
  // eyes
  ctx.fillStyle = "#2a1b17";
  ctx.beginPath();
  ctx.arc(-3.2 * s, -28 * s, 1.1 * s, 0, TAU);
  ctx.arc(3.2 * s, -28 * s, 1.1 * s, 0, TAU);
  ctx.fill();
  // mouth
  ctx.strokeStyle = "#7f442a";
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.arc(0, -24.5 * s, 2.6 * s, 0.2, 2.9);
  ctx.stroke();
  // club
  ctx.save();
  ctx.translate(9 * s, -17 * s);
  ctx.rotate(-0.5 + Math.sin(t * 4 + (opts.phase || 0)) * 0.08);
  ctx.fillStyle = "#6e4726";
  roundRect(ctx, 0, -2 * s, 15 * s, 4 * s, 2 * s);
  ctx.fill();
  ctx.fillStyle = "#8d5b2c";
  ctx.beginPath();
  ctx.ellipse(17 * s, 0, 6 * s, 4 * s, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#c4c1b4";
  ctx.beginPath();
  ctx.arc(14 * s, -4 * s, 1.4 * s, 0, TAU);
  ctx.arc(20 * s, 3 * s, 1.2 * s, 0, TAU);
  ctx.fill();
  ctx.restore();
  // arm
  ctx.strokeStyle = "#b96c35";
  ctx.lineWidth = 4 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(8 * s, -18 * s);
  ctx.lineTo(12 * s, -12 * s);
  ctx.stroke();
}

function drawPlume(ctx, s, t, opts) {
  // legs
  ctx.fillStyle = "#274e5b";
  ctx.beginPath();
  ctx.ellipse(-4 * s, -2 * s, 2.8 * s, 4.5 * s, 0.1, 0, TAU);
  ctx.ellipse(4 * s, -2 * s, 2.8 * s, 4.5 * s, -0.1, 0, TAU);
  ctx.fill();
  // cloak/body
  ctx.fillStyle = "#2c8d91";
  ctx.beginPath();
  ctx.moveTo(-8 * s, -8 * s);
  ctx.quadraticCurveTo(-12 * s, -25 * s, 0, -30 * s);
  ctx.quadraticCurveTo(12 * s, -25 * s, 8 * s, -8 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#5fd4ce";
  ctx.beginPath();
  ctx.moveTo(-4 * s, -24 * s);
  ctx.quadraticCurveTo(0, -16 * s, 4 * s, -24 * s);
  ctx.lineTo(3 * s, -8 * s);
  ctx.lineTo(-3 * s, -8 * s);
  ctx.closePath();
  ctx.fill();
  // hood
  ctx.fillStyle = "#277d82";
  ctx.beginPath();
  ctx.arc(0, -29 * s, 9 * s, Math.PI * 0.95, Math.PI * 2.05);
  ctx.lineTo(7 * s, -21 * s);
  ctx.lineTo(-7 * s, -21 * s);
  ctx.closePath();
  ctx.fill();
  // face
  ctx.fillStyle = "#eac08d";
  ctx.beginPath();
  ctx.ellipse(0, -26 * s, 6 * s, 6.5 * s, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#2a1b17";
  ctx.beginPath();
  ctx.arc(-2.2 * s, -26 * s, 0.9 * s, 0, TAU);
  ctx.arc(2.2 * s, -26 * s, 0.9 * s, 0, TAU);
  ctx.fill();
  // ponytail
  ctx.fillStyle = "#f2b350";
  ctx.beginPath();
  ctx.ellipse(7 * s, -31 * s, 3.2 * s, 8 * s, 0.6, 0, TAU);
  ctx.fill();
  // bow
  ctx.strokeStyle = "#c19a54";
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.arc(11 * s, -18 * s, 9 * s, -1.2, 1.2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.55)";
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();
  ctx.moveTo(11 * s + Math.cos(-1.2) * 9 * s, -18 * s + Math.sin(-1.2) * 9 * s);
  ctx.lineTo(11 * s + Math.cos(1.2) * 9 * s, -18 * s + Math.sin(1.2) * 9 * s);
  ctx.stroke();
  // arrow
  ctx.strokeStyle = "#e8d9a5";
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(10 * s, -19 * s);
  ctx.lineTo(23 * s, -19 * s);
  ctx.stroke();
}

function drawColosse(ctx, s, t, opts) {
  // legs
  ctx.fillStyle = "#5a3b72";
  ctx.beginPath();
  ctx.ellipse(-8 * s, -3 * s, 5 * s, 7 * s, 0.1, 0, TAU);
  ctx.ellipse(8 * s, -3 * s, 5 * s, 7 * s, -0.1, 0, TAU);
  ctx.fill();
  // body armor
  ctx.fillStyle = "#7c4da0";
  ctx.beginPath();
  ctx.moveTo(-14 * s, -10 * s);
  ctx.quadraticCurveTo(-18 * s, -32 * s, -8 * s, -36 * s);
  ctx.lineTo(8 * s, -36 * s);
  ctx.quadraticCurveTo(18 * s, -32 * s, 14 * s, -10 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#a76cc9";
  ctx.beginPath();
  ctx.ellipse(0, -26 * s, 10 * s, 8 * s, 0, 0, TAU);
  ctx.fill();
  // shoulder pads
  ctx.fillStyle = "#5d347d";
  ctx.beginPath();
  ctx.ellipse(-14 * s, -33 * s, 7 * s, 5 * s, -0.3, 0, TAU);
  ctx.ellipse(14 * s, -33 * s, 7 * s, 5 * s, 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#d8a74d";
  ctx.beginPath();
  ctx.arc(-14 * s, -33 * s, 2 * s, 0, TAU);
  ctx.arc(14 * s, -33 * s, 2 * s, 0, TAU);
  ctx.fill();
  // head
  ctx.fillStyle = "#d8a06e";
  ctx.beginPath();
  ctx.arc(0, -43 * s, 9 * s, 0, TAU);
  ctx.fill();
  // helmet
  ctx.fillStyle = "#5b377a";
  ctx.beginPath();
  ctx.arc(0, -45 * s, 9.5 * s, Math.PI, TAU);
  ctx.lineTo(8 * s, -39 * s);
  ctx.lineTo(-8 * s, -39 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffd15c";
  ctx.fillRect(-1 * s, -55 * s, 2 * s, 8 * s);
  // eyes
  ctx.fillStyle = "#2a1b17";
  ctx.beginPath();
  ctx.arc(-3.2 * s, -43 * s, 1.1 * s, 0, TAU);
  ctx.arc(3.2 * s, -43 * s, 1.1 * s, 0, TAU);
  ctx.fill();
  // jaw
  ctx.fillStyle = "#b67b50";
  ctx.beginPath();
  ctx.ellipse(0, -37.5 * s, 6 * s, 3 * s, 0, 0, TAU);
  ctx.fill();
  // hammer
  ctx.save();
  ctx.translate(15 * s, -20 * s);
  ctx.rotate(-0.32 + Math.sin(t * 3 + (opts.phase || 0)) * 0.05);
  ctx.fillStyle = "#6b4424";
  roundRect(ctx, 0, -2.5 * s, 23 * s, 5 * s, 2 * s);
  ctx.fill();
  ctx.fillStyle = "#9aa5a8";
  roundRect(ctx, 20 * s, -9 * s, 10 * s, 18 * s, 3 * s);
  ctx.fill();
  ctx.fillStyle = "#c4ced0";
  roundRect(ctx, 21 * s, -8 * s, 4 * s, 16 * s, 2 * s);
  ctx.fill();
  ctx.restore();
  // arms
  ctx.strokeStyle = "#d8a06e";
  ctx.lineWidth = 6 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-13 * s, -29 * s);
  ctx.lineTo(-16 * s, -17 * s);
  ctx.moveTo(13 * s, -29 * s);
  ctx.lineTo(16 * s, -19 * s);
  ctx.stroke();
}

export function drawAvatar(canvas, profile = {}) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const size = Math.max(64, Math.round(rect.width || canvas.width || 96));
  if (canvas.width !== Math.round(size * dpr)) {
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = size;
  const h = size;
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#2c6c86");
  g.addColorStop(0.55, "#1c4468");
  g.addColorStop(1, "#10223f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // rays
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.translate(w / 2, h * 0.45);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#bff7ff";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, -w * 0.08);
    ctx.lineTo(w, w * 0.08);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const variant = Number(profile.avatar || 0) % 6;
  const skin = ["#e9b98a", "#c98c5f", "#f0c9a3", "#a96b45", "#dfa475", "#f2d0ad"][variant];
  const hair = ["#4a2b20", "#e0a641", "#7a3c2b", "#1e1b27", "#c46b2f", "#ded5c2"][variant];
  const armor = ["#2f6f82", "#7d3f45", "#42678c", "#3b7351", "#6c4c8d", "#2d6b70"][variant];
  // shoulders
  ctx.fillStyle = armor;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.98, w * 0.39, h * 0.3, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.1)";
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.96, w * 0.3, h * 0.21, 0, Math.PI, TAU);
  ctx.fill();
  // neck
  ctx.fillStyle = skin;
  ctx.fillRect(w * 0.42, h * 0.66, w * 0.16, h * 0.18);
  // head
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.49, w * 0.22, h * 0.25, 0, 0, TAU);
  ctx.fill();
  // ears
  ctx.beginPath();
  ctx.arc(w * 0.27, h * 0.5, w * 0.04, 0, TAU);
  ctx.arc(w * 0.73, h * 0.5, w * 0.04, 0, TAU);
  ctx.fill();
  // hair
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.43, w * 0.24, Math.PI * 0.95, Math.PI * 2.05);
  ctx.lineTo(w * 0.7, h * 0.5);
  ctx.quadraticCurveTo(w * 0.64, h * 0.27, w * 0.5, h * 0.27);
  ctx.quadraticCurveTo(w * 0.33, h * 0.27, w * 0.28, h * 0.5);
  ctx.closePath();
  ctx.fill();
  if (variant % 2 === 0) {
    ctx.fillStyle = "#ffd05f";
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h * 0.37);
    ctx.lineTo(w * 0.22, h * 0.21);
    ctx.lineTo(w * 0.36, h * 0.29);
    ctx.lineTo(w * 0.5, h * 0.17);
    ctx.lineTo(w * 0.64, h * 0.29);
    ctx.lineTo(w * 0.78, h * 0.21);
    ctx.lineTo(w * 0.72, h * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c37c1d";
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.35, w * 0.025, 0, TAU);
    ctx.fill();
  }
  // eyes
  ctx.fillStyle = "#2c1d18";
  ctx.beginPath();
  ctx.ellipse(w * 0.42, h * 0.5, w * 0.026, h * 0.036, 0, 0, TAU);
  ctx.ellipse(w * 0.58, h * 0.5, w * 0.026, h * 0.036, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.8)";
  ctx.beginPath();
  ctx.arc(w * 0.427, h * 0.49, w * 0.008, 0, TAU);
  ctx.arc(w * 0.587, h * 0.49, w * 0.008, 0, TAU);
  ctx.fill();
  // brows
  ctx.strokeStyle = hair;
  ctx.lineWidth = Math.max(1, w * 0.015);
  ctx.beginPath();
  ctx.moveTo(w * 0.38, h * 0.45);
  ctx.lineTo(w * 0.46, h * 0.44);
  ctx.moveTo(w * 0.54, h * 0.44);
  ctx.lineTo(w * 0.62, h * 0.45);
  ctx.stroke();
  // nose
  ctx.strokeStyle = "rgba(95,50,32,.45)";
  ctx.lineWidth = Math.max(1, w * 0.012);
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.52);
  ctx.lineTo(w * 0.49, h * 0.57);
  ctx.lineTo(w * 0.52, h * 0.57);
  ctx.stroke();
  // mouth
  ctx.strokeStyle = "#7a3a35";
  ctx.lineWidth = Math.max(1, w * 0.012);
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.6, w * 0.055, 0.25, Math.PI - 0.25);
  ctx.stroke();
  // cheek highlights
  ctx.fillStyle = "rgba(255,110,110,.12)";
  ctx.beginPath();
  ctx.arc(w * 0.36, h * 0.59, w * 0.035, 0, TAU);
  ctx.arc(w * 0.64, h * 0.59, w * 0.035, 0, TAU);
  ctx.fill();
  // armor trim
  ctx.strokeStyle = "rgba(255,213,100,.65)";
  ctx.lineWidth = Math.max(1, w * 0.014);
  ctx.beginPath();
  ctx.moveTo(w * 0.21, h * 0.86);
  ctx.quadraticCurveTo(w * 0.5, h * 0.79, w * 0.79, h * 0.86);
  ctx.stroke();
}

export function renderThumb(canvas, type, level = 1, opts = {}) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || canvas.width || 96;
  const h = canvas.clientHeight || canvas.height || 96;
  if (canvas.width !== Math.round(w * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const scale = opts.scale || Math.min(w, h) / 145;
  const cx = w * 0.5;
  const cy = h * (opts.cy || 0.74);
  drawBuilding(ctx, type, level, cx, cy, scale, opts.time || 0, { variant: opts.variant || 0 });
}

export function drawCrest(ctx, cx, cy, r, color = "#ffd35f") {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.86, -r * 0.68);
  ctx.lineTo(r * 0.72, r * 0.5);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.72, r * 0.5);
  ctx.lineTo(-r * 0.86, -r * 0.68);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.72);
  ctx.lineTo(r * 0.6, -r * 0.48);
  ctx.lineTo(r * 0.48, r * 0.36);
  ctx.lineTo(0, r * 0.72);
  ctx.lineTo(-r * 0.48, r * 0.36);
  ctx.lineTo(-r * 0.6, -r * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
