// Pokémon Templier — procedural art (canvas + inline SVG). No external assets.

export function shade(hex, amt) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  r = Math.max(0, Math.min(255, Math.round(r + amt)))
  g = Math.max(0, Math.min(255, Math.round(g + amt)))
  b = Math.max(0, Math.min(255, Math.round(b + amt)))
  return `rgb(${r},${g},${b})`
}

export function alpha(hex, a) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function ell(ctx, x, y, rx, ry, fill, stroke, lw = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2)
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 3; ctx.stroke() }
}

function rr(ctx, x, y, w, h, r, fill, stroke, lw = 0) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 3; ctx.stroke() }
}

function bodyGrad(ctx, y0, y1, c1, c2) {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  g.addColorStop(0, c1)
  g.addColorStop(1, c2)
  return g
}

function eye(ctx, x, y, r, iris, opts = {}) {
  ell(ctx, x, y, r * 1.15, r * 1.25, '#fffdf4')
  if (opts.sleep) {
    ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 1, r * .9, .2, Math.PI - .2); ctx.stroke()
    return
  }
  ell(ctx, x + (opts.look || 0), y + 1, r * .72, r * .9, iris)
  ell(ctx, x + (opts.look || 0), y + 1, r * .38, r * .62, '#16121a')
  ell(ctx, x - r * .26 + (opts.look || 0), y - r * .3, r * .22, r * .22, 'rgba(255,255,255,.95)')
  if (opts.angry) {
    ctx.strokeStyle = '#2b2118'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 1.7); ctx.lineTo(x + r * .8, y - r * 1.15); ctx.stroke()
  }
}

function mouth(ctx, x, y, w, happy = true) {
  ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'
  ctx.beginPath()
  if (happy) ctx.arc(x, y - 1, w, .2, Math.PI - .2)
  else ctx.arc(x, y + 3, w, Math.PI + .2, Math.PI * 2 - .2)
  ctx.stroke()
}

function cheeks(ctx, x, y, spread, color) {
  ell(ctx, x - spread, y, 6, 3.6, alpha(color || '#f08a8a', .55))
  ell(ctx, x + spread, y, 6, 3.6, alpha(color || '#f08a8a', .55))
}

function drawAura(ctx, art, t, mega) {
  if (!art.aura) return
  const pulse = .82 + Math.sin(t * 3) * .12
  const r = mega ? 105 : 86
  const g = ctx.createRadialGradient(0, -35, 5, 0, -35, r * pulse)
  g.addColorStop(0, alpha(art.aura, .34))
  g.addColorStop(.62, alpha(art.aura, .13))
  g.addColorStop(1, alpha(art.aura, 0))
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(0, -35, r * pulse, 0, Math.PI * 2); ctx.fill()
  for (let i = 0; i < 7; i++) {
    const a = t * .8 + i * 1.9
    const rr2 = 52 + (i % 3) * 16
    const px = Math.cos(a) * rr2, py = -38 + Math.sin(a) * rr2 * .62
    ell(ctx, px, py, 2.6, 2.6, alpha(art.aura, .7))
  }
}

function wings(ctx, color, accent, kind, t) {
  const flap = Math.sin(t * 2.6) * .08
  ctx.save()
  if (kind === 'bat') {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1); ctx.rotate(flap)
      ctx.beginPath(); ctx.moveTo(22, -70)
      ctx.bezierCurveTo(58, -122, 118, -116, 128, -68)
      ctx.bezierCurveTo(100, -82, 88, -52, 72, -40)
      ctx.bezierCurveTo(58, -58, 44, -50, 22, -44)
      ctx.closePath(); ctx.fillStyle = alpha(color, .92); ctx.fill()
      ctx.strokeStyle = accent; ctx.lineWidth = 4; ctx.stroke()
      ctx.restore()
    }
  } else if (kind === 'fairy') {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1); ctx.rotate(flap)
      ctx.beginPath(); ctx.moveTo(18, -65)
      ctx.bezierCurveTo(52, -120, 98, -98, 82, -58)
      ctx.bezierCurveTo(70, -30, 36, -42, 18, -50)
      ctx.closePath(); ctx.fillStyle = alpha(color, .55); ctx.fill()
      ctx.strokeStyle = alpha(accent, .75); ctx.lineWidth = 3; ctx.stroke()
      ctx.restore()
    }
  } else if (kind === 'gold') {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1); ctx.rotate(flap)
      ctx.beginPath(); ctx.moveTo(18, -84)
      ctx.bezierCurveTo(62, -146, 134, -132, 128, -82)
      ctx.lineTo(92, -92); ctx.lineTo(78, -64); ctx.lineTo(56, -84); ctx.lineTo(34, -58)
      ctx.closePath(); ctx.fillStyle = alpha(color, .8); ctx.fill()
      ctx.strokeStyle = accent; ctx.lineWidth = 4; ctx.stroke()
      ctx.restore()
    }
  } else if (kind === 'small') {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1); ctx.rotate(flap)
      ctx.beginPath(); ctx.moveTo(20, -78)
      ctx.bezierCurveTo(48, -112, 82, -96, 70, -62)
      ctx.bezierCurveTo(58, -42, 34, -54, 20, -58)
      ctx.closePath(); ctx.fillStyle = alpha(color, .8); ctx.fill()
      ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
      ctx.restore()
    }
  } else if (kind === 'jet') {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1); ctx.rotate(flap)
      ctx.beginPath(); ctx.moveTo(20, -66)
      ctx.bezierCurveTo(66, -114, 132, -84, 122, -40)
      ctx.bezierCurveTo(94, -50, 70, -34, 54, -20)
      ctx.closePath(); ctx.fillStyle = alpha(color, .85); ctx.fill()
      ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
      ctx.restore()
    }
  } else if (kind === 'fin') {
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1); ctx.rotate(flap)
      ctx.beginPath(); ctx.moveTo(20, -70)
      ctx.quadraticCurveTo(86, -110, 102, -58)
      ctx.quadraticCurveTo(62, -54, 40, -36)
      ctx.closePath(); ctx.fillStyle = alpha(color, .75); ctx.fill()
      ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
      ctx.restore()
    }
  }
  ctx.restore()
}

function crown(ctx, color, accent) {
  ctx.beginPath()
  ctx.moveTo(-30, -138); ctx.lineTo(-34, -166); ctx.lineTo(-14, -152)
  ctx.lineTo(0, -174); ctx.lineTo(14, -152); ctx.lineTo(34, -166); ctx.lineTo(30, -138)
  ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
  ell(ctx, 0, -150, 5, 5, accent)
}

function horns(ctx, color, accent, n = 2) {
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 22, -118)
    ctx.quadraticCurveTo(s * 48, -154, s * 34, -178)
    ctx.quadraticCurveTo(s * 30, -150, s * 10, -128)
    ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
  }
  if (n > 2) {
    ctx.beginPath(); ctx.moveTo(0, -126); ctx.lineTo(0, -172); ctx.lineTo(14, -136); ctx.closePath()
    ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
  }
}

function earPair(ctx, art, y = -124, spread = 28) {
  const { body, accent, ears } = art
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * spread, y); ctx.scale(s, 1)
    if (ears === 'pointed') {
      ctx.beginPath(); ctx.moveTo(-12, 10); ctx.lineTo(4, -30); ctx.lineTo(18, 8); ctx.closePath()
      ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(4, -18); ctx.lineTo(10, 3); ctx.closePath()
      ctx.fillStyle = alpha('#f4a6c8', .65); ctx.fill()
    } else if (ears === 'round') {
      ell(ctx, 0, 0, 16, 18, body, accent, 3)
      ell(ctx, 0, 2, 9, 11, alpha('#f4a6c8', .55))
    } else if (ears === 'leaf') {
      ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(26, -16, 4, -34); ctx.quadraticCurveTo(-14, -8, 0, 10)
      ctx.fillStyle = shade(body, 18); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
    } else if (ears === 'bat') {
      ctx.beginPath(); ctx.moveTo(-10, 12); ctx.lineTo(-2, -36); ctx.lineTo(16, 8); ctx.closePath()
      ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
    } else if (ears === 'fins') {
      ctx.beginPath(); ctx.moveTo(-6, 12); ctx.quadraticCurveTo(24, -18, 4, -32); ctx.quadraticCurveTo(-12, -4, -6, 12)
      ctx.fillStyle = alpha(shade(body, 25), .9); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
    } else if (ears === 'fairy') {
      ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(20, -22, 2, -30); ctx.quadraticCurveTo(-10, -8, 0, 10)
      ctx.fillStyle = shade(body, 20); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.stroke()
    } else if (ears === 'spark') {
      ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(6, -26); ctx.lineTo(16, -2); ctx.lineTo(4, 12); ctx.closePath()
      ctx.fillStyle = '#fff3b0'; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.stroke()
    } else if (ears === 'rock') {
      ctx.beginPath(); ctx.moveTo(-12, 12); ctx.lineTo(-6, -24); ctx.lineTo(14, 10); ctx.closePath()
      ctx.fillStyle = shade(body, 12); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
    } else if (ears === 'horned') {
      ctx.beginPath(); ctx.moveTo(-8, 10); ctx.quadraticCurveTo(14, -26, 8, -40); ctx.quadraticCurveTo(-2, -16, -14, 8)
      ctx.fillStyle = art.hornColor || '#f2e3c2'; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
    } else if (ears === 'helm') {
      ctx.beginPath(); ctx.moveTo(-14, 12); ctx.lineTo(-10, -24); ctx.lineTo(12, -18); ctx.lineTo(16, 12); ctx.closePath()
      ctx.fillStyle = shade(body, 18); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
    }
    ctx.restore()
  }
}

function tail(ctx, art, t) {
  const { body, accent, tail: kind } = art
  if (kind === 'tuft') {
    ctx.beginPath(); ctx.moveTo(38, -34); ctx.bezierCurveTo(86, -54, 94, -18, 72, -8)
    ctx.strokeStyle = shade(body, -15); ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke()
    ell(ctx, 76, -6, 15, 12, shade(body, 18), accent, 3)
  } else if (kind === 'flame') {
    ctx.beginPath(); ctx.moveTo(38, -32); ctx.bezierCurveTo(72, -46, 76, -18, 62, -8)
    ctx.strokeStyle = shade(body, -10); ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.stroke()
    const f = 1 + Math.sin(t * 5) * .1
    ctx.beginPath(); ctx.moveTo(64, -8); ctx.quadraticCurveTo(80, -42 * f, 92, -18 * f)
    ctx.quadraticCurveTo(88, 0, 64, -8); ctx.closePath()
    ctx.fillStyle = '#ffb703'; ctx.fill(); ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 2; ctx.stroke()
    ell(ctx, 78, -16, 6, 9, '#fff3b0')
  } else if (kind === 'fin') {
    ctx.beginPath(); ctx.moveTo(44, -52); ctx.lineTo(94, -78); ctx.lineTo(86, -38); ctx.lineTo(94, -14); ctx.lineTo(44, -34)
    ctx.closePath(); ctx.fillStyle = alpha(shade(body, 18), .95); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
  } else if (kind === 'leaf') {
    ctx.beginPath(); ctx.moveTo(34, -28); ctx.quadraticCurveTo(74, -70, 92, -34); ctx.quadraticCurveTo(62, -14, 34, -28)
    ctx.fillStyle = shade(body, 20); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
  } else if (kind === 'bolt') {
    ctx.beginPath(); ctx.moveTo(34, -40); ctx.lineTo(60, -58); ctx.lineTo(52, -36); ctx.lineTo(76, -44); ctx.lineTo(46, -10); ctx.lineTo(54, -30); ctx.closePath()
    ctx.fillStyle = '#fff3b0'; ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
  } else if (kind === 'spike') {
    ctx.beginPath(); ctx.moveTo(36, -34); ctx.quadraticCurveTo(72, -52, 86, -18); ctx.quadraticCurveTo(60, -18, 40, -20)
    ctx.closePath(); ctx.fillStyle = shade(body, -8); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke()
  } else if (kind === 'cape') {
    const sway = Math.sin(t * 2) * 4
    ctx.beginPath(); ctx.moveTo(-30, -90); ctx.quadraticCurveTo(-74 + sway, -40, -58 + sway, 18)
    ctx.lineTo(-8, 2); ctx.quadraticCurveTo(-18, -46, -6, -90); ctx.closePath()
    ctx.fillStyle = alpha(art.accent, .75); ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 3; ctx.stroke()
  } else if (kind === 'serpent') {
    ctx.beginPath(); ctx.moveTo(30, -30)
    ctx.bezierCurveTo(100, -30, 100, -100, 46, -96)
    ctx.strokeStyle = body; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.stroke()
    ctx.strokeStyle = '#f2c53d'; ctx.lineWidth = 5; ctx.setLineDash([6, 12]); ctx.stroke(); ctx.setLineDash([])
  }
}

function legs(ctx, art, kind = 'paw') {
  const { body, belly, accent } = art
  if (kind === 'paw') {
    for (const x of [-28, 28]) {
      rr(ctx, x - 11, 18, 22, 34, 9, shade(body, -6), accent, 3)
      ell(ctx, x, 52, 16, 9, shade(belly, 4), accent, 2.5)
    }
  } else if (kind === 'stub') {
    for (const x of [-20, 20]) {
      ell(ctx, x, 48, 16, 10, shade(body, -6), accent, 2.5)
    }
  } else if (kind === 'thin') {
    for (const x of [-16, 16]) {
      rr(ctx, x - 5, 26, 10, 34, 5, shade(body, -10), accent, 2.5)
      ell(ctx, x, 60, 10, 5, accent)
    }
  }
}

function drawBeast(ctx, art, t, cat) {
  tail(ctx, art, t)
  legs(ctx, art, 'paw')
  const body = ctx.createLinearGradient(0, -80, 0, 10)
  body.addColorStop(0, shade(art.body, 14)); body.addColorStop(1, shade(art.body, -16))
  ell(ctx, 0, -34, cat ? 46 : 54, cat ? 34 : 40, body, art.accent, 4)
  ell(ctx, 0, -22, cat ? 27 : 33, cat ? 24 : 28, art.belly)
  if (art.stripes) {
    ctx.strokeStyle = alpha(art.accent, .7); ctx.lineWidth = 5; ctx.lineCap = 'round'
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 18 - 6, -54); ctx.lineTo(i * 18 + 4, -36); ctx.stroke() }
  }
  if (art.mane) {
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * .9 + i * .34
      ell(ctx, Math.cos(a) * 36, -94 + Math.sin(a) * 30, 18, 16, shade(art.body, i % 2 ? 22 : 10), art.accent, 2)
    }
  }
  const headY = -104
  ell(ctx, 0, headY, cat ? 35 : 38, cat ? 31 : 34, body, art.accent, 4)
  earPair(ctx, art, headY - 26, cat ? 26 : 30)
  ell(ctx, 0, headY + 14, 21, 14, shade(art.belly, 6))
  ell(ctx, 0, headY + 8, 8, 5, art.accent)
  eye(ctx, -14, headY - 4, 6, art.eye, { look: 1 })
  eye(ctx, 14, headY - 4, 6, art.eye, { look: 1 })
  cheeks(ctx, 0, headY + 12, 22, '#f08a8a')
  mouth(ctx, 0, headY + 18, 7)
  if (art.horn === 'crown') crown(ctx, '#f0c96b', '#8a5b2e')
  if (art.spikes) {
    for (let i = 0; i < art.spikes; i++) {
      const x = -18 + i * 18
      ctx.beginPath(); ctx.moveTo(x, -72); ctx.lineTo(x + 8, -94); ctx.lineTo(x + 16, -70); ctx.closePath()
      ctx.fillStyle = shade(art.body, -18); ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 2; ctx.stroke()
    }
  }
}

function drawFish(ctx, art, t) {
  tail(ctx, art, t)
  if (art.fins) {
    ctx.beginPath(); ctx.moveTo(-6, -82); ctx.quadraticCurveTo(10, -118, 34, -86); ctx.closePath()
    ctx.fillStyle = alpha(shade(art.body, 24), .9); ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 3; ctx.stroke()
  }
  const body = ctx.createRadialGradient(-18, -58, 6, 0, -44, 66)
  body.addColorStop(0, shade(art.body, 28)); body.addColorStop(1, shade(art.body, -16))
  ell(ctx, 0, -46, 56, 40, body, art.accent, 4)
  ell(ctx, 0, -32, 36, 24, art.belly)
  for (let i = 0; i < 3; i++) ell(ctx, -22 + i * 16, -50 - (i % 2) * 8, 5, 5, alpha('#ffffff', .35))
  eye(ctx, -20, -58, 7, art.eye, { look: 1 })
  eye(ctx, 18, -58, 7, art.eye, { look: 1 })
  mouth(ctx, 0, -34, 5)
  if (art.horn === 'drop') {
    ctx.beginPath(); ctx.moveTo(0, -88); ctx.quadraticCurveTo(14, -112, 0, -126); ctx.quadraticCurveTo(-14, -112, 0, -88)
    ctx.fillStyle = '#b9f0ff'; ctx.fill(); ctx.strokeStyle = '#3a86ff'; ctx.lineWidth = 2.5; ctx.stroke()
  } else if (art.horn === 'crest') {
    ctx.beginPath(); ctx.moveTo(-20, -82); ctx.quadraticCurveTo(0, -132, 24, -82); ctx.closePath()
    ctx.fillStyle = alpha(shade(art.body, 30), .9); ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 3; ctx.stroke()
  }
}

function drawPlant(ctx, art, t) {
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * .85 + i * .34
    ctx.save(); ctx.translate(0, -42); ctx.rotate(a)
    ell(ctx, 0, -38, 14, 36, i % 2 ? shade(art.body, 18) : shade(art.body, -8), art.accent, 2.5)
    ctx.restore()
  }
  legs(ctx, art, 'stub')
  const body = ctx.createRadialGradient(-14, -58, 6, 0, -36, 58)
  body.addColorStop(0, shade(art.body, 26)); body.addColorStop(1, shade(art.body, -12))
  ell(ctx, 0, -36, 45, 42, body, art.accent, 4)
  ell(ctx, 0, -26, 27, 26, art.belly)
  eye(ctx, -15, -46, 6.5, art.eye, { look: 1 })
  eye(ctx, 15, -46, 6.5, art.eye, { look: 1 })
  cheeks(ctx, 0, -28, 20)
  mouth(ctx, 0, -20, 6)
  if (art.horn === 'sprout') {
    ctx.strokeStyle = '#3f7a3a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -76); ctx.quadraticCurveTo(0, -98, 0, -104); ctx.stroke()
    ell(ctx, -11, -104, 12, 7, '#7ac96a', '#2f6b32', 2)
    ell(ctx, 11, -108, 12, 7, '#9be07a', '#2f6b32', 2)
  } else if (art.horn === 'bloom') {
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3
      ell(ctx, Math.cos(a) * 18, -94 + Math.sin(a) * 18, 13, 10, i % 2 ? '#f4a6c8' : '#e26d9f', '#8e3160', 2)
    }
    ell(ctx, 0, -94, 12, 12, '#ffe08a', '#b8860b', 2)
  }
}

function drawBird(ctx, art, t) {
  wings(ctx, art.body, art.accent, 'small', t)
  tail(ctx, art, t)
  legs(ctx, art, 'thin')
  const body = ctx.createLinearGradient(0, -96, 0, 20)
  body.addColorStop(0, shade(art.body, 22)); body.addColorStop(1, shade(art.body, -14))
  ell(ctx, 0, -48, 36, 44, body, art.accent, 4)
  ell(ctx, 0, -36, 23, 27, art.belly)
  ell(ctx, 0, -102, 29, 26, body, art.accent, 4)
  eye(ctx, -11, -106, 5.5, art.eye)
  eye(ctx, 11, -106, 5.5, art.eye)
  ctx.beginPath(); ctx.moveTo(0, -96); ctx.lineTo(14, -88); ctx.lineTo(0, -80); ctx.closePath()
  ctx.fillStyle = '#f2c53d'; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 2; ctx.stroke()
  if (art.horn === 'bolt') {
    ctx.beginPath(); ctx.moveTo(0, -126); ctx.lineTo(18, -152); ctx.lineTo(8, -150); ctx.lineTo(20, -174); ctx.lineTo(-4, -146); ctx.lineTo(6, -146); ctx.closePath()
    ctx.fillStyle = '#fff3b0'; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 2.5; ctx.stroke()
  }
}

function drawBat(ctx, art, t) {
  wings(ctx, art.body, art.accent, 'bat', t)
  tail(ctx, art, t)
  legs(ctx, art, 'stub')
  const body = ctx.createLinearGradient(0, -90, 0, 20)
  body.addColorStop(0, shade(art.body, 22)); body.addColorStop(1, shade(art.body, -18))
  ell(ctx, 0, -42, 36, 42, body, art.accent, 4)
  ell(ctx, 0, -30, 22, 25, art.belly)
  const head = ctx.createLinearGradient(0, -130, 0, -80)
  head.addColorStop(0, shade(art.body, 26)); head.addColorStop(1, shade(art.body, -8))
  ell(ctx, 0, -98, 33, 31, head, art.accent, 4)
  earPair(ctx, art, -122, 24)
  eye(ctx, -13, -102, 6.5, art.eye, { look: 1 })
  eye(ctx, 13, -102, 6.5, art.eye, { look: 1 })
  mouth(ctx, 0, -86, 5)
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-7, -84); ctx.lineTo(-3, -74); ctx.lineTo(1, -84); ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.moveTo(5, -84); ctx.lineTo(9, -74); ctx.lineTo(13, -84); ctx.closePath(); ctx.fill()
  if (art.horn === 'horns') horns(ctx, '#e8dcc0', art.accent)
}

function drawRock(ctx, art, t) {
  legs(ctx, art, 'stub')
  const body = ctx.createLinearGradient(-40, -80, 40, 20)
  body.addColorStop(0, shade(art.body, 22)); body.addColorStop(.55, art.body); body.addColorStop(1, shade(art.body, -20))
  ctx.beginPath()
  ctx.moveTo(-46, -14); ctx.lineTo(-38, -62); ctx.lineTo(-8, -82); ctx.lineTo(36, -66); ctx.lineTo(50, -18); ctx.lineTo(28, 18); ctx.lineTo(-26, 20)
  ctx.closePath(); ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 4; ctx.stroke()
  ctx.beginPath(); ctx.moveTo(-24, -54); ctx.lineTo(-12, -30); ctx.lineTo(-26, -6); ctx.strokeStyle = alpha(art.accent, .55); ctx.lineWidth = 3; ctx.stroke()
  ctx.beginPath(); ctx.moveTo(20, -52); ctx.lineTo(12, -28); ctx.lineTo(28, -8); ctx.strokeStyle = alpha(art.accent, .45); ctx.lineWidth = 3; ctx.stroke()
  ell(ctx, 0, -88, 35, 28, body, art.accent, 4)
  earPair(ctx, art, -108, 28)
  eye(ctx, -13, -92, 6, art.eye)
  eye(ctx, 13, -92, 6, art.eye)
  mouth(ctx, 0, -78, 7, false)
  if (art.armor) {
    for (const x of [-34, 34]) {
      rr(ctx, x - 13, -66, 26, 20, 6, shade(art.body, 18), art.accent, 2.5)
      ell(ctx, x, -56, 4, 4, '#f0c96b')
    }
  }
  if (art.spikes) {
    for (let i = 0; i < art.spikes; i++) {
      const x = -30 + i * 20
      ctx.beginPath(); ctx.moveTo(x, -70); ctx.lineTo(x + 10, -96); ctx.lineTo(x + 20, -68); ctx.closePath()
      ctx.fillStyle = shade(art.body, -12); ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 2; ctx.stroke()
    }
  }
}

function drawOrb(ctx, art, t) {
  const float = Math.sin(t * 2) * 4
  ctx.save(); ctx.translate(0, float)
  if (art.aura) {
    const g = ctx.createRadialGradient(0, -56, 10, 0, -56, 74)
    g.addColorStop(0, alpha(art.aura, .4)); g.addColorStop(1, alpha(art.aura, 0))
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -56, 74, 0, Math.PI * 2); ctx.fill()
  }
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 34, -62); ctx.quadraticCurveTo(s * 62, -50, s * 54, -26); ctx.quadraticCurveTo(s * 40, -38, s * 30, -42)
    ctx.closePath(); ctx.fillStyle = shade(art.body, 10); ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 3; ctx.stroke()
  }
  const body = ctx.createRadialGradient(-16, -78, 6, 0, -56, 50)
  body.addColorStop(0, shade(art.body, 38)); body.addColorStop(1, shade(art.body, -20))
  ell(ctx, 0, -56, 44, 44, body, art.accent, 4)
  ell(ctx, 0, -50, 26, 24, alpha(art.belly, .55))
  eye(ctx, -14, -62, 7, art.eye)
  eye(ctx, 14, -62, 7, art.eye)
  mouth(ctx, 0, -46, 6)
  if (art.horn === 'eye') {
    ell(ctx, 0, -94, 10, 15, '#f7f0ff', art.accent, 2.5)
    ell(ctx, 0, -94, 4, 7, art.accent)
  } else if (art.horn === 'bolt') {
    ctx.beginPath(); ctx.moveTo(-4, -92); ctx.lineTo(12, -122); ctx.lineTo(2, -120); ctx.lineTo(14, -146); ctx.lineTo(-8, -116); ctx.lineTo(2, -116); ctx.closePath()
    ctx.fillStyle = '#fff3b0'; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 2.5; ctx.stroke()
  }
  if (art.bloom) {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * 1.256
      ell(ctx, Math.cos(a) * 24, -80 + Math.sin(a) * 18, 9, 7, '#f4a6c8', '#8e3160', 1.5)
    }
  }
  ctx.restore()
}

function drawFairy(ctx, art, t) {
  wings(ctx, art.body, art.accent, 'fairy', t)
  tail(ctx, art, t)
  legs(ctx, art, 'stub')
  const body = ctx.createLinearGradient(0, -90, 0, 20)
  body.addColorStop(0, shade(art.body, 26)); body.addColorStop(1, shade(art.body, -14))
  ell(ctx, 0, -42, 32, 38, body, art.accent, 4)
  ell(ctx, 0, -32, 20, 22, art.belly)
  ell(ctx, 0, -100, 30, 28, body, art.accent, 4)
  earPair(ctx, art, -122, 22)
  eye(ctx, -12, -104, 6, art.eye)
  eye(ctx, 12, -104, 6, art.eye)
  cheeks(ctx, 0, -92, 17)
  mouth(ctx, 0, -86, 5)
  if (art.horn === 'star') {
    ctx.save(); ctx.translate(0, -134); ctx.rotate(t * .3)
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 6 : 15
      const a = -Math.PI / 2 + i * Math.PI / 5
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath(); ctx.fillStyle = '#ffe08a'; ctx.fill(); ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore()
  }
}

function drawDragon(ctx, art, t, mega) {
  wings(ctx, art.body, art.accent, art.wings || 'small', t)
  tail(ctx, art, t)
  legs(ctx, art, 'paw')
  const body = ctx.createLinearGradient(0, -100, 0, 20)
  body.addColorStop(0, shade(art.body, 20)); body.addColorStop(1, shade(art.body, -18))
  ell(ctx, 0, -46, 40, 48, body, art.accent, 4)
  ell(ctx, 0, -34, 26, 31, art.belly)
  const head = ctx.createLinearGradient(0, -150, 0, -90)
  head.addColorStop(0, shade(art.body, 28)); head.addColorStop(1, shade(art.body, -6))
  ell(ctx, 0, -108, 35, 32, head, art.accent, 4)
  ctx.beginPath(); ctx.moveTo(-18, -100); ctx.quadraticCurveTo(0, -80, 18, -100); ctx.quadraticCurveTo(0, -88, -18, -100)
  ctx.fillStyle = art.belly; ctx.fill()
  earPair(ctx, art, -134, 26)
  eye(ctx, -13, -112, 6.5, art.eye, { look: 1, angry: !!mega })
  eye(ctx, 13, -112, 6.5, art.eye, { look: 1, angry: !!mega })
  mouth(ctx, 0, -94, 7, false)
  if (art.spikes) {
    for (let i = 0; i < art.spikes; i++) {
      const x = -22 + i * 15
      ctx.beginPath(); ctx.moveTo(x, -78); ctx.lineTo(x + 6, -98); ctx.lineTo(x + 12, -76); ctx.closePath()
      ctx.fillStyle = '#f2c53d'; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 2; ctx.stroke()
    }
  }
  if (art.armor) {
    rr(ctx, -26, -58, 52, 30, 8, alpha(shade(art.body, 26), .9), '#f0c96b', 3)
    ell(ctx, 0, -43, 8, 8, '#7df9ff')
  }
}

function drawTemplar(ctx, art, t, mega) {
  // cape
  tail(ctx, art, t)
  // legs
  for (const x of [-20, 20]) {
    rr(ctx, x - 10, 8, 20, 48, 7, shade(art.body, -18), art.accent, 3)
    ell(ctx, x, 56, 15, 8, shade(art.accent, 10), '#2b2118', 2)
  }
  // torso armor
  const body = ctx.createLinearGradient(0, -90, 0, 20)
  body.addColorStop(0, shade(art.body, 30)); body.addColorStop(.5, art.body); body.addColorStop(1, shade(art.body, -22))
  ctx.beginPath()
  ctx.moveTo(-32, -82); ctx.quadraticCurveTo(0, -102, 32, -82); ctx.lineTo(26, 8); ctx.quadraticCurveTo(0, 20, -26, 8); ctx.closePath()
  ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 4; ctx.stroke()
  // chest emblem
  ctx.beginPath(); ctx.moveTo(0, -66); ctx.lineTo(13, -50); ctx.lineTo(0, -34); ctx.lineTo(-13, -50); ctx.closePath()
  ctx.fillStyle = mega ? '#7df9ff' : '#f7e6b0'; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 2.5; ctx.stroke()
  // shoulder plates
  for (const s of [-1, 1]) {
    ell(ctx, s * 38, -72, 16, 13, shade(art.body, 22), art.accent, 3)
    ctx.beginPath(); ctx.moveTo(s * 38, -82); ctx.lineTo(s * 48, -104); ctx.lineTo(s * 52, -78); ctx.closePath()
    ctx.fillStyle = mega ? '#7df9ff' : '#f0c96b'; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 2; ctx.stroke()
  }
  // arms
  for (const s of [-1, 1]) {
    rr(ctx, s * 42 - 8, -64, 16, 44, 7, shade(art.body, -8), art.accent, 3)
    ell(ctx, s * 42, -18, 10, 9, shade(art.belly, 0), art.accent, 2)
  }
  // head/helm
  const head = ctx.createLinearGradient(0, -160, 0, -90)
  head.addColorStop(0, shade(art.body, 38)); head.addColorStop(1, shade(art.body, -8))
  ell(ctx, 0, -118, 31, 30, head, art.accent, 4)
  // visor
  ctx.beginPath(); ctx.moveTo(-26, -122); ctx.quadraticCurveTo(0, -112, 26, -122); ctx.lineTo(24, -108); ctx.quadraticCurveTo(0, -100, -24, -108); ctx.closePath()
  ctx.fillStyle = '#2b2118'; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 2; ctx.stroke()
  eye(ctx, -10, -114, 4.5, mega ? '#7df9ff' : '#3ddad7')
  eye(ctx, 10, -114, 4.5, mega ? '#7df9ff' : '#3ddad7')
  // helm crest
  ctx.beginPath(); ctx.moveTo(0, -146); ctx.quadraticCurveTo(0, -190, 0, -200); ctx.quadraticCurveTo(24, -176, 12, -146)
  ctx.closePath(); ctx.fillStyle = mega ? '#7df9ff' : '#f0c96b'; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 3; ctx.stroke()
  if (mega) {
    for (let i = 0; i < 3; i++) {
      const a = t * 1.4 + i * 2.1
      ell(ctx, Math.cos(a) * 56, -86 + Math.sin(a) * 40, 3, 3, '#7df9ff')
    }
    ctx.strokeStyle = alpha('#7df9ff', .7); ctx.lineWidth = 2
    ctx.beginPath(); ctx.ellipse(0, -96, 50, 16, Math.sin(t) * .2, 0, Math.PI * 2); ctx.stroke()
  }
}

function drawLegend(ctx, art, t, speciesId) {
  if (speciesId === 'rayquaza') {
    // serpentine body
    ctx.beginPath(); ctx.moveTo(-38, 20)
    ctx.bezierCurveTo(-120, -10, -100, -86, -20, -88)
    ctx.bezierCurveTo(56, -90, 74, -160, 10, -176)
    ctx.bezierCurveTo(-40, -188, -58, -146, -30, -128)
    ctx.strokeStyle = art.body; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.stroke()
    ctx.strokeStyle = shade(art.body, -24); ctx.lineWidth = 26; ctx.globalAlpha = .18; ctx.stroke(); ctx.globalAlpha = 1
    // rings
    for (let i = 0; i < 5; i++) {
      const x = -44 + i * 20, y = 6 - i * 34
      ctx.beginPath(); ctx.ellipse(x, y, 13, 22, -.4, 0, Math.PI * 2)
      ctx.strokeStyle = '#f2c53d'; ctx.lineWidth = 5; ctx.stroke()
    }
    // fins
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(-18, -96); ctx.quadraticCurveTo(s * 62, -150, s * 54, -70); ctx.quadraticCurveTo(s * 18, -84, -18, -80)
      ctx.closePath(); ctx.fillStyle = alpha(shade(art.body, 20), .9); ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 3; ctx.stroke()
    }
    // head
    ell(ctx, 12, -176, 30, 22, art.body, art.accent, 4)
    eye(ctx, 20, -180, 5, '#ffe066')
    ctx.beginPath(); ctx.moveTo(2, -186); ctx.lineTo(-12, -210); ctx.lineTo(8, -198); ctx.closePath()
    ctx.fillStyle = '#f2c53d'; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 2; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(32, -174); ctx.lineTo(58, -184); ctx.lineTo(40, -166); ctx.closePath()
    ctx.fillStyle = '#f2c53d'; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 2; ctx.stroke()
    return
  }
  // Latias / Latios — sleek jet creature
  wings(ctx, art.body, art.accent, 'jet', t)
  ctx.beginPath(); ctx.moveTo(-26, 10); ctx.quadraticCurveTo(16, 30, 62, -12); ctx.quadraticCurveTo(44, -42, 8, -30); ctx.quadraticCurveTo(-22, -16, -26, 10)
  ctx.closePath()
  const body = ctx.createLinearGradient(0, -60, 0, 24)
  body.addColorStop(0, shade(art.body, 28)); body.addColorStop(1, shade(art.body, -18))
  ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 4; ctx.stroke()
  ell(ctx, -4, -8, 26, 20, art.belly)
  ell(ctx, -18, -54, 27, 24, body, art.accent, 4)
  ctx.beginPath(); ctx.moveTo(-30, -72); ctx.quadraticCurveTo(-54, -104, -28, -106); ctx.quadraticCurveTo(-16, -86, -10, -72)
  ctx.closePath(); ctx.fillStyle = '#f2c53d'; ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 2; ctx.stroke()
  eye(ctx, -26, -58, 5.5, art.eye)
  eye(ctx, -8, -58, 5.5, art.eye)
  mouth(ctx, -18, -42, 4)
  ctx.beginPath(); ctx.moveTo(-38, -18); ctx.quadraticCurveTo(-70, 6, -52, 22); ctx.quadraticCurveTo(-32, 8, -22, -2)
  ctx.closePath(); ctx.fillStyle = alpha(art.body, .8); ctx.fill(); ctx.strokeStyle = art.accent; ctx.lineWidth = 3; ctx.stroke()
}

export function drawCreature(ctx, species, x, y, scale, opts = {}) {
  const mega = !!opts.mega && species.mega
  const art = mega ? { ...species.art, ...species.mega.art } : species.art
  const t = opts.t || 0
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale * (opts.flip ? -1 : 1), scale)
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha
  // shadow
  ctx.save(); ctx.scale(1, .28); ctx.beginPath(); ctx.arc(0, 66, 54, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(8,10,18,.32)'; ctx.fill(); ctx.restore()
  drawAura(ctx, art, t, mega)
  ctx.translate(0, Math.sin(t * 2.1) * 2)
  const kind = art.kind
  if (kind === 'beast') drawBeast(ctx, art, t, false)
  else if (kind === 'cat') drawBeast(ctx, art, t, true)
  else if (kind === 'fish') drawFish(ctx, art, t)
  else if (kind === 'plant') drawPlant(ctx, art, t)
  else if (kind === 'bird') drawBird(ctx, art, t)
  else if (kind === 'bat') drawBat(ctx, art, t)
  else if (kind === 'rock') drawRock(ctx, art, t)
  else if (kind === 'orb') drawOrb(ctx, art, t)
  else if (kind === 'fairy') drawFairy(ctx, art, t)
  else if (kind === 'dragon') drawDragon(ctx, art, t, mega)
  else if (kind === 'templar') drawTemplar(ctx, art, t, mega)
  else if (kind === 'legend') drawLegend(ctx, art, t, species.id)
  ctx.restore()
}

// Small chibi trainer for the overworld.
export function drawTrainer(ctx, x, y, scale, opts = {}) {
  const t = opts.t || 0
  const walk = opts.walk || 0
  const flip = opts.flip ? -1 : 1
  const skin = opts.skin || '#e8c39e'
  const hair = opts.hair || '#4a2e1a'
  const outfit = opts.outfit || '#2f5f9e'
  const accent = opts.accent || '#f0c96b'
  const hat = opts.hat || 'cap'
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale * flip, scale)
  ctx.save(); ctx.scale(1, .3); ctx.beginPath(); ctx.arc(0, 24, 18, 0, Math.PI * 2); ctx.fillStyle = 'rgba(8,10,18,.3)'; ctx.fill(); ctx.restore()
  const bob = Math.sin(walk * 10) * 1.5
  ctx.translate(0, bob)
  // legs
  const legSwing = Math.sin(walk * 10) * 4
  rr(ctx, -8 + legSwing, 8, 7, 16, 3, '#28324a')
  rr(ctx, 2 - legSwing, 8, 7, 16, 3, '#28324a')
  // body
  rr(ctx, -12, -16, 24, 28, 8, outfit, '#1b2438', 2)
  rr(ctx, -9, -12, 18, 8, 3, accent)
  // arms
  rr(ctx, -17, -12, 6, 18, 3, outfit)
  rr(ctx, 11, -12, 6, 18, 3, outfit)
  // head
  ell(ctx, 0, -28, 12, 12, skin, '#7a5a3b', 2)
  // hair / hat
  if (hat === 'cap') {
    ctx.beginPath(); ctx.arc(0, -32, 12, Math.PI, Math.PI * 2); ctx.fillStyle = outfit; ctx.fill()
    rr(ctx, -14, -33, 28, 4, 2, shade(outfit, -20))
    rr(ctx, 0, -33, 14, 4, 2, accent)
  } else if (hat === 'hood') {
    ctx.beginPath(); ctx.arc(0, -30, 14, Math.PI * .9, Math.PI * 2.1); ctx.fillStyle = outfit; ctx.fill()
  } else if (hat === 'crown') {
    ctx.beginPath(); ctx.moveTo(-10, -38); ctx.lineTo(-12, -48); ctx.lineTo(-4, -43); ctx.lineTo(0, -50); ctx.lineTo(4, -43); ctx.lineTo(12, -48); ctx.lineTo(10, -38); ctx.closePath()
    ctx.fillStyle = '#f0c96b'; ctx.fill(); ctx.strokeStyle = '#8a5b2e'; ctx.lineWidth = 1.5; ctx.stroke()
  } else {
    ctx.beginPath(); ctx.arc(0, -30, 12.5, Math.PI, Math.PI * 2); ctx.fillStyle = hair; ctx.fill()
  }
  // face
  ell(ctx, -4, -28, 1.6, 2, '#2b2118')
  ell(ctx, 4, -28, 1.6, 2, '#2b2118')
  ctx.strokeStyle = '#8a4a3b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -25, 2.5, .2, Math.PI - .2); ctx.stroke()
  // bag
  rr(ctx, -19, -8, 8, 12, 3, accent, '#1b2438', 1.5)
  ctx.restore()
}

export function playerAvatarSVG(gender = 'garcon', size = 160, outfit = null, skin = null) {
  const isGirl = gender === 'fille'
  const skinC = skin || (isGirl ? '#e8b48a' : '#d9a47a')
  const hairC = isGirl ? '#6b3f2a' : '#3a2418'
  const outfitC = outfit || (isGirl ? '#c96b8a' : '#2f5f9e')
  const accent = isGirl ? '#f4a6c8' : '#f0c96b'
  const hair = isGirl
    ? `<path d="M40 74c0-32 18-50 40-50s40 18 40 50c0 16-4 26-10 34l-8-22c-14 8-32 8-46 0l-8 22c-5-9-8-20-8-34z" fill="${hairC}"/><path d="M44 88c-8 18-6 36 2 46l10-8c-6-12-6-24-2-38z" fill="${hairC}"/><path d="M116 88c8 18 6 36-2 46l-10-8c6-12 6-24 2-38z" fill="${hairC}"/>`
    : `<path d="M42 76c0-30 17-48 38-48s38 18 38 48c0 8-1 14-3 20l-9-10-5-14c-14 7-32 7-46 0l-5 14-8 10c-2-6-3-12-3-20z" fill="${hairC}"/>`
  return `<svg viewBox="0 0 160 160" width="${size}" height="${size}" role="img" aria-label="Avatar de dresseur">
    <defs>
      <radialGradient id="pav-bg" cx="50%" cy="35%" r="70%">
        <stop offset="0" stop-color="${alpha(accent, .35)}"/><stop offset="1" stop-color="#111a2c"/>
      </radialGradient>
      <linearGradient id="pav-cloth" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${shade(outfitC, 25)}"/><stop offset="1" stop-color="${shade(outfitC, -25)}"/>
      </linearGradient>
    </defs>
    <circle cx="80" cy="80" r="76" fill="url(#pav-bg)" stroke="${accent}" stroke-width="2"/>
    <circle cx="80" cy="80" r="66" fill="none" stroke="${alpha(accent, .25)}" stroke-width="1"/>
    <path d="M30 140c4-26 22-38 50-38s46 12 50 38z" fill="url(#pav-cloth)"/>
    <path d="M66 100h28v18H66z" fill="${skinC}"/>
    <path d="M60 112c6 10 34 10 40 0l6 10c-10 14-42 14-52 0z" fill="${accent}"/>
    <ellipse cx="80" cy="72" rx="27" ry="31" fill="${skinC}"/>
    ${hair}
    <ellipse cx="69" cy="74" rx="4" ry="5" fill="#221a16"/>
    <ellipse cx="91" cy="74" rx="4" ry="5" fill="#221a16"/>
    <circle cx="70.5" cy="72.5" r="1.5" fill="#fff"/>
    <circle cx="92.5" cy="72.5" r="1.5" fill="#fff"/>
    <path d="M73 88c4 4 10 4 14 0" fill="none" stroke="#7a3f32" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="62" cy="84" r="4" fill="${alpha('#f08a8a', .35)}"/>
    <circle cx="98" cy="84" r="4" fill="${alpha('#f08a8a', .35)}"/>
    <path d="M40 140l40-12 40 12" fill="none" stroke="${alpha(accent, .6)}" stroke-width="2"/>
    ${isGirl ? `<path d="M108 54l8-10 3 12z" fill="${accent}"/>` : `<path d="M50 48h60l-6-10H56z" fill="${outfitC}"/><path d="M50 48h60" stroke="${accent}" stroke-width="2"/>`}
  </svg>`
}

function leaderHair(style, color, accent) {
  if (style === 'bun') return `<circle cx="80" cy="34" r="14" fill="${color}"/><path d="M48 64c0-22 14-36 32-36s32 14 32 36c0 6-1 10-3 14l-8-8-4-14c-12 6-26 6-38 0l-4 14-8 8c-1-4-2-9-2-14z" fill="${color}"/>`
  if (style === 'spiky') return `<path d="M46 62c0-22 15-38 34-38s34 16 34 38l-8-4-4-14-8 10-6-16-8 14-8-12-4 16-8 10z" fill="${color}"/>`
  if (style === 'long') return `<path d="M46 64c0-24 15-40 34-40s34 16 34 40c0 14-4 24-10 32l-8-16c-10 6-22 6-32 0l-8 16c-6-8-10-18-10-32z" fill="${color}"/><path d="M48 76c-4 18-2 34 6 44l8-10c-6-12-6-24-2-34z" fill="${color}"/><path d="M112 76c4 18 2 34-6 44l-8-10c6-12 6-24 2-34z" fill="${color}"/>`
  if (style === 'mohawk') return `<path d="M56 62c0-24 10-40 24-40s24 16 24 40l-8-4-2-18-6 14-8-18-8 18-6-14-2 18z" fill="${color}"/>`
  if (style === 'hood') return `<path d="M40 88c0-36 18-58 40-58s40 22 40 58l-8 18-10-18-6-24c-10 5-22 5-32 0l-6 24-10 18z" fill="${color}"/><path d="M54 62c0-16 11-28 26-28s26 12 26 28c0 8-4 14-10 18H64c-6-4-10-10-10-18z" fill="${alpha(color, .55)}"/>`
  if (style === 'cap') return `<path d="M48 62c0-22 14-36 32-36s32 14 32 36z" fill="${color}"/><path d="M44 62h72l-4 8H48z" fill="${shade(color, -30)}"/><path d="M70 40h20l-2 22H72z" fill="${accent}"/>`
  if (style === 'crown') return `<path d="M50 62c0-24 13-38 30-38s30 14 30 38l-7-3-4-12-8 8-5-13-6 13-5-13-5 13-8-8-4 12z" fill="${color}"/><path d="M54 30l6-18 8 10 6-16 6 16 8-10 6 18z" fill="#f0c96b" stroke="#8a5b2e" stroke-width="2"/>`
  if (style === 'wavy') return `<path d="M46 66c0-24 15-42 34-42s34 18 34 42c0 8-2 16-6 22l-8-10c-2-8-4-14-8-18-8 6-16 8-24 8s-14-2-20-8c-4 4-6 10-8 18l-8 10c-4-6-6-14-6-22z" fill="${color}"/>`
  return `<path d="M48 62c0-22 14-36 32-36s32 14 32 36c0 6-1 10-3 14l-8-8-4-14c-12 6-26 6-38 0l-4 14-8 8c-1-4-2-9-2-14z" fill="${color}"/>`
}

export function leaderAvatarSVG(avatar = {}, size = 120, typeColor = '#f0c96b') {
  const skin = avatar.skin || '#d9a47a'
  const hair = avatar.hair || '#3a2418'
  const outfit = avatar.outfit || '#3a3550'
  const accent = avatar.accent || '#f0c96b'
  const style = avatar.style || 'short'
  return `<svg viewBox="0 0 160 160" width="${size}" height="${size}" role="img" aria-label="Portrait de dresseur">
    <defs>
      <radialGradient id="lav-${style}-${outfit.replace('#','')}" cx="50%" cy="30%" r="75%">
        <stop offset="0" stop-color="${alpha(typeColor, .5)}"/><stop offset="1" stop-color="#0c1220"/>
      </radialGradient>
    </defs>
    <circle cx="80" cy="80" r="76" fill="url(#lav-${style}-${outfit.replace('#','')})" stroke="${accent}" stroke-width="2"/>
    <path d="M28 148c3-30 22-46 52-46s49 16 52 46z" fill="${outfit}"/>
    <path d="M64 102h32v18H64z" fill="${skin}"/>
    <path d="M58 116c8 10 36 10 44 0l8 12c-12 14-48 14-60 0z" fill="${accent}"/>
    <ellipse cx="80" cy="74" rx="28" ry="32" fill="${skin}"/>
    ${leaderHair(style, hair, accent)}
    <ellipse cx="69" cy="76" rx="4" ry="5" fill="#221a16"/>
    <ellipse cx="91" cy="76" rx="4" ry="5" fill="#221a16"/>
    <circle cx="70.5" cy="74.5" r="1.5" fill="#fff"/>
    <circle cx="92.5" cy="74.5" r="1.5" fill="#fff"/>
    <path d="M73 90c4 4 10 4 14 0" fill="none" stroke="#7a3f32" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M62 68c3-3 8-3 11 0" fill="none" stroke="${shade(hair, -15)}" stroke-width="2" stroke-linecap="round"/>
    <path d="M87 68c3-3 8-3 11 0" fill="none" stroke="${shade(hair, -15)}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="80" cy="142" r="8" fill="${typeColor}" stroke="${accent}" stroke-width="2"/>
  </svg>`
}

export function professorSVG() {
  return `<svg class="professor-art" viewBox="0 0 420 500" role="img" aria-label="Professeur Sable">
    <defs>
      <radialGradient id="prof-sky" cx="50%" cy="38%" r="72%">
        <stop offset="0" stop-color="#f7dfa0"/><stop offset=".55" stop-color="#d9a45a"/><stop offset="1" stop-color="#5c3a1f"/>
      </radialGradient>
      <linearGradient id="prof-coat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f0e2c4"/><stop offset="1" stop-color="#c9b48a"/>
      </linearGradient>
      <linearGradient id="prof-shirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a3550"/><stop offset="1" stop-color="#221f33"/>
      </linearGradient>
      <linearGradient id="prof-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#bdf6ff" stop-opacity=".75"/><stop offset="1" stop-color="#6ec6d6" stop-opacity=".2"/>
      </linearGradient>
      <filter id="prof-soft"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>
    <rect width="420" height="500" fill="url(#prof-sky)"/>
    <circle cx="300" cy="110" r="70" fill="#ffe9a8" opacity=".7" filter="url(#prof-soft)"/>
    <circle cx="300" cy="110" r="44" fill="#fff3c4" opacity=".85"/>
    <path d="M0 330c70-40 120-18 190-38s150-6 230 30v178H0z" fill="#c99655"/>
    <path d="M0 372c90-36 150-6 220-24s140 8 200 32v120H0z" fill="#a9743b"/>
    <path d="M0 420c100-26 180 4 260-14s120 8 160 24v70H0z" fill="#7a4e28"/>
    <g opacity=".18" fill="#fff">
      <circle cx="60" cy="80" r="2"/><circle cx="110" cy="140" r="1.5"/><circle cx="190" cy="70" r="2"/><circle cx="340" cy="220" r="1.8"/><circle cx="380" cy="150" r="1.4"/><circle cx="250" cy="170" r="1.6"/>
    </g>
    <!-- body -->
    <path d="M92 500c2-96 42-142 118-142s116 46 118 142z" fill="url(#prof-coat)" stroke="#8a6a3a" stroke-width="3"/>
    <path d="M150 380h120v120H150z" fill="url(#prof-shirt)"/>
    <path d="M196 384h28l-14 70z" fill="#d9a441" stroke="#8a5b2e" stroke-width="2"/>
    <path d="M118 392c20-14 44-20 70-20l-10 80-46 48z" fill="#e8d8b8" stroke="#8a6a3a" stroke-width="2"/>
    <path d="M302 392c-20-14-44-20-70-20l10 80 46 48z" fill="#e8d8b8" stroke="#8a6a3a" stroke-width="2"/>
    <path d="M210 410l-12 62 12 28 12-28z" fill="#8a6a3a"/>
    <circle cx="210" cy="438" r="8" fill="#f0c96b" stroke="#8a5b2e" stroke-width="2"/>
    <!-- neck / head -->
    <path d="M182 356h56v34c-18 10-38 10-56 0z" fill="#c98a5a"/>
    <ellipse cx="210" cy="292" rx="66" ry="76" fill="#d99a66"/>
    <ellipse cx="148" cy="300" rx="12" ry="20" fill="#c98a5a"/>
    <ellipse cx="272" cy="300" rx="12" ry="20" fill="#c98a5a"/>
    <!-- ears -->
    <ellipse cx="146" cy="302" rx="8" ry="14" fill="#b87a4a"/>
    <ellipse cx="274" cy="302" rx="8" ry="14" fill="#b87a4a"/>
    <!-- beard -->
    <path d="M152 310c4 60 28 90 58 90s54-30 58-90c-16 24-34 32-58 32s-42-8-58-32z" fill="#f2ede2" stroke="#d8d0c0" stroke-width="2"/>
    <path d="M180 352c10 20 20 28 30 28s20-8 30-28c-8 10-18 14-30 14s-22-4-30-14z" fill="#e2dbcc"/>
    <!-- hair -->
    <path d="M142 276c-4-58 28-96 68-96s72 38 68 96c-10-20-22-30-34-34-20 10-48 10-68 0-12 4-24 14-34 34z" fill="#f4f0e6" stroke="#d8d0c0" stroke-width="2"/>
    <path d="M150 252c8-34 30-54 60-54s52 20 60 54c-16-14-36-20-60-20s-44 6-60 20z" fill="#fffaf0"/>
    <path d="M160 240c-18 4-26 18-22 34 8-12 18-18 30-18z" fill="#f4f0e6"/>
    <path d="M260 240c18 4 26 18 22 34-8-12-18-18-30-18z" fill="#f4f0e6"/>
    <!-- eyebrows -->
    <path d="M168 266c12-8 28-8 40 0" fill="none" stroke="#e8e2d6" stroke-width="7" stroke-linecap="round"/>
    <path d="M212 266c12-8 28-8 40 0" fill="none" stroke="#e8e2d6" stroke-width="7" stroke-linecap="round"/>
    <!-- glasses -->
    <circle cx="184" cy="292" r="26" fill="url(#prof-glass)" stroke="#8a5b2e" stroke-width="4"/>
    <circle cx="238" cy="292" r="26" fill="url(#prof-glass)" stroke="#8a5b2e" stroke-width="4"/>
    <path d="M210 290h2M158 290l-14-6M264 290l14-6" stroke="#8a5b2e" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="184" cy="294" rx="7" ry="9" fill="#3a2a1a"/>
    <ellipse cx="238" cy="294" rx="7" ry="9" fill="#3a2a1a"/>
    <circle cx="182" cy="291" r="2.5" fill="#fff"/><circle cx="236" cy="291" r="2.5" fill="#fff"/>
    <!-- nose -->
    <path d="M210 300c-4 12-8 18-12 22 6 4 12 4 18 0-4-4-6-10-6-22z" fill="#c98a5a"/>
    <!-- mouth -->
    <path d="M194 340c10 8 22 8 32 0" fill="none" stroke="#7a3f32" stroke-width="3" stroke-linecap="round"/>
    <!-- hands + hourglass -->
    <path d="M118 430c-14 10-20 26-14 40 8 2 18-2 24-12z" fill="#d99a66" stroke="#b87a4a" stroke-width="2"/>
    <path d="M302 430c14 10 20 26 14 40-8 2-18-2-24-12z" fill="#d99a66" stroke="#b87a4a" stroke-width="2"/>
    <g transform="translate(210 440)">
      <rect x="-22" y="-30" width="44" height="8" rx="4" fill="#8a5b2e"/>
      <rect x="-22" y="22" width="44" height="8" rx="4" fill="#8a5b2e"/>
      <path d="M-16-22h32l-14 24 14 24h-32l14-24z" fill="#dff6ff" opacity=".75" stroke="#8a5b2e" stroke-width="2"/>
      <path d="M-8 12h16l-8 10z" fill="#f0c96b"/>
      <path d="M-9-14h18l-9 10z" fill="#f0c96b"/>
    </g>
    <!-- coat badge -->
    <g transform="translate(286 420)">
      <path d="M0-16l14 8v16L0 24l-14-8V-8z" fill="#f0c96b" stroke="#8a5b2e" stroke-width="2"/>
      <text x="0" y="6" text-anchor="middle" font-size="13" font-family="Georgia,serif" fill="#4a2e1a">S</text>
    </g>
    <text x="210" y="492" text-anchor="middle" font-family="Georgia,serif" font-size="13" letter-spacing="4" fill="#3a2418" opacity=".75">PROFESSEUR SABLE</text>
  </svg>`
}

export function ballSVG(color = '#d9a441', size = 28) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="17" fill="#f5efe0" stroke="#3a2418" stroke-width="3"/>
    <path d="M3 20h34" stroke="#3a2418" stroke-width="3"/>
    <path d="M20 3a17 17 0 0 0 0 34z" fill="${color}" opacity=".9"/>
    <circle cx="20" cy="20" r="6" fill="${color}" stroke="#3a2418" stroke-width="3"/>
    <circle cx="20" cy="20" r="2.5" fill="#fff"/>
  </svg>`
}

export function badgeSVG(color, glyph, size = 40, earned = true) {
  return `<span class="badge-medal ${earned ? 'earned' : 'locked'}" style="--badge:${color};width:${size}px;height:${size}px">
    <span class="badge-glyph">${glyph}</span>
  </span>`
}
