// Card faces for the table view, drawn as SVG in the layout of the real 7 Wonders Duel cards:
// a coloured effect band on top (chain symbol at its right), the cost down the left edge, a painted scene made up
// from the card's name, and a stone name plaque at the bottom. Wonders are landscape with an effect panel on the right.
// Shared gradients and icons live in one hidden <svg> (CardArt.install) and every card <use>s them.
(() => {
  /* ---------------------------------------------------------------- helpers ---- */
  const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const rng = seed => () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f = n => +n.toFixed(2);
  const R = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}" fill="${fill}" ${extra}/>`;
  const C = (x, y, r, fill, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
  const E = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" ${extra}/>`;
  const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
  const L = (x1, y1, x2, y2, stroke, w = 1, extra = '') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const G = (tx, ty, s, inner, extra = '') => `<g transform="translate(${f(tx)} ${f(ty)}) scale(${s})" ${extra}>${inner}</g>`;

  /* ------------------------------------------------------- scene primitives ---- */
  // Everything takes a position, a scale and colours; scenes below combine them. Coordinates: a 100 x 150 card.
  const sky = kind => R(-5, -5, 175, 160, `url(#sky-${kind})`);
  const sun = (x, y, r, c = '#fff1c4') => C(x, y, r * 2.4, c, 'opacity=".25"') + C(x, y, r * 1.5, c, 'opacity=".4"') + C(x, y, r, c);
  const hills = (y, color, amp, seed, w = 100) => {
    const r = rng(seed); let d = `M-5 ${y}`;
    for (let x = -5; x <= w + 5; x += 12) d += ` Q${x + 6} ${f(y - amp * (0.4 + r()))} ${x + 12} ${f(y - amp * r() * 0.5)}`;
    return P(d + ` V160 H-5 Z`, color);
  };
  const ground = (y, color, w = 100) => R(-5, y, w + 10, 160 - y, color);
  const tree = (x, y, s, c = '#5f7f45', t = '#6b4a2e') =>
    R(x - 1.2 * s, y - 9 * s, 2.4 * s, 9 * s, t) + C(x, y - 13 * s, 6 * s, c) + C(x - 4 * s, y - 10 * s, 4.5 * s, c) + C(x + 4.5 * s, y - 10.5 * s, 4.5 * s, c) + C(x + 1.5 * s, y - 16 * s, 4 * s, c, 'opacity=".85"');
  const cypress = (x, y, s, c = '#3f5f38') => P(`M${x} ${y - 26 * s} Q${x + 5 * s} ${y - 12 * s} ${x + 3 * s} ${y} H${x - 3 * s} Q${x - 5 * s} ${y - 12 * s} ${x} ${y - 26 * s}Z`, c);
  const person = (x, y, s, robe = '#7a4b3a', o = {}) => {
    const skin = o.skin || '#d9a57b';
    let g = P(`M${x - 4 * s} ${y} L${x - 3 * s} ${y - 13 * s} Q${x} ${y - 15 * s} ${x + 3 * s} ${y - 13 * s} L${x + 4 * s} ${y}Z`, robe) + C(x, y - 16 * s, 2.6 * s, skin) + P(`M${x - 2.6 * s} ${y - 16.8 * s} Q${x} ${y - 20 * s} ${x + 2.6 * s} ${y - 16.8 * s}Z`, o.hair || '#3a2a22');
    if (o.tool === 'spear') g += L(x + 4 * s, y + 1 * s, x + 6 * s, y - 26 * s, '#5a4632', 0.9 * s) + P(`M${x + 6 * s} ${y - 29 * s} l${1.2 * s} ${3 * s} h${-2.4 * s}Z`, '#cfd3d6');
    if (o.tool === 'axe') g += L(x + 2 * s, y - 11 * s, x + 9 * s, y - 18 * s, '#5a4632', 1 * s) + P(`M${x + 8 * s} ${y - 20 * s} l${3 * s} ${1 * s} l${-1.5 * s} ${3 * s}Z`, '#b9bec2');
    if (o.tool === 'staff') g += L(x - 4.5 * s, y, x - 5 * s, y - 20 * s, '#6b4a2e', 0.9 * s);
    if (o.tool === 'bow') g += P(`M${x + 5 * s} ${y - 22 * s} Q${x + 11 * s} ${y - 13 * s} ${x + 5 * s} ${y - 4 * s}`, 'none', `stroke="#5a3d22" stroke-width="${0.9 * s}"`) + L(x + 5 * s, y - 22 * s, x + 5 * s, y - 4 * s, '#e8dcc4', 0.3 * s);
    if (o.tool === 'bowl') g += E(x + 3 * s, y - 9 * s, 3 * s, 1.5 * s, '#8f6a45');
    if (o.tool === 'basket') g += R(x + 2 * s, y - 10 * s, 5 * s, 4 * s, '#a6824c', 1);
    if (o.crest) g += P(`M${x - 3 * s} ${y - 17 * s} Q${x} ${y - 23 * s} ${x + 3 * s} ${y - 17 * s}Z`, '#c23b2e');
    return g;
  };
  const crowd = (x, y, w, n, seed, s = 0.5) => { const r = rng(seed); let g = ''; for (let i = 0; i < n; i++) g += person(x + (w * i) / n + r() * 3, y + r() * 2, s * (0.85 + r() * 0.3), ['#7a4b3a', '#5d6f8a', '#8a7a4a', '#9a5c4a', '#e3d8c4'][Math.floor(r() * 5)]); return g; };
  const column = (x, y, h, w = 4, c = '#efe6d6', sh = '#cfc3ad') => R(x - w / 2, y - h, w, h, c) + R(x - w / 2 + w * 0.6, y - h, w * 0.4, h, sh, 0, 'opacity=".5"') + R(x - w * 0.8, y - h - 1.6, w * 1.6, 1.8, c) + R(x - w * 0.8, y - 1.4, w * 1.6, 1.4, sh);
  const temple = (x, y, w, h, n = 5, c = '#efe6d6', roof = '#e3d6bf') => {
    let g = R(x - w / 2 - 2, y - 3, w + 4, 3, '#d8ccb5') + R(x - w / 2 - 1, y - 5, w + 2, 2, '#e6dbc6');
    for (let i = 0; i < n; i++) g += column(x - w / 2 + 2.5 + (i * (w - 5)) / (n - 1), y - 5, h, Math.max(2.5, w / n / 2.2), c);
    return g + R(x - w / 2 - 1, y - 5 - h - 4, w + 2, 4, roof) + P(`M${x - w / 2 - 2} ${y - 9 - h} L${x} ${y - 9 - h - w * 0.22} L${x + w / 2 + 2} ${y - 9 - h}Z`, roof) + P(`M${x - w / 2 + 3} ${y - 10 - h} L${x} ${y - 9 - h - w * 0.17} L${x + w / 2 - 3} ${y - 10 - h}Z`, '#cdbfa6');
  };
  const arcade = (x, y, w, h, n, c = '#c9a27a', hole = 'url(#sky-day)') => {
    let d = `M${x} ${y} V${y - h} H${x + w} V${y} Z`; const aw = w / n;
    for (let i = 0; i < n; i++) { const ax = x + i * aw + aw * 0.18, bw = aw * 0.64, top = y - h * 0.62; d += ` M${f(ax)} ${y} V${f(top)} A${f(bw / 2)} ${f(bw / 2)} 0 0 1 ${f(ax + bw)} ${f(top)} V${y} Z`; }
    return P(d, c, 'fill-rule="evenodd"');
  };
  const wall = (x, y, w, h, c = '#b8a58a') => {
    let d = `M${x} ${y} V${y - h}`; for (let i = 0; i < w; i += 6) d += ` h3 v-3 h3 v3`; return P(d + ` V${y} Z`, c);
  };
  const tower = (x, y, w, h, c = '#b39d80') => wall(x - w / 2, y, w, h, c) + R(x - 1.2, y - h * 0.6, 2.4, 4, '#5b4a3a', 1);
  const dome = (x, y, w, h, c = '#d9cbb0') => P(`M${x - w / 2} ${y} A${w / 2} ${h} 0 0 1 ${x + w / 2} ${y}Z`, c) + R(x - 1, y - h - 4, 2, 4, c);
  const obelisk = (x, y, s, c = '#c7b28f') => P(`M${x - 3 * s} ${y} L${x - 2 * s} ${y - 40 * s} L${x} ${y - 45 * s} L${x + 2 * s} ${y - 40 * s} L${x + 3 * s} ${y}Z`, c) + P(`M${x} ${y - 45 * s} L${x + 2 * s} ${y - 40 * s} L${x + 3 * s} ${y} H${x}Z`, '#000', 'opacity=".12"');
  const statue = (x, y, s, c = '#c9b99a') => R(x - 6 * s, y - 8 * s, 12 * s, 8 * s, '#d8ccb5') + R(x - 7 * s, y - 9 * s, 14 * s, 2 * s, '#e6dbc6') +
    P(`M${x - 3.5 * s} ${y - 9 * s} L${x - 2.5 * s} ${y - 26 * s} Q${x} ${y - 28 * s} ${x + 2.5 * s} ${y - 26 * s} L${x + 3.5 * s} ${y - 9 * s}Z`, c) + C(x, y - 30 * s, 2.8 * s, c) + L(x + 2 * s, y - 25 * s, x + 7 * s, y - 36 * s, c, 1.6 * s);
  const amphora = (x, y, s, c = '#b5673f') => P(`M${x - 1.5 * s} ${y - 12 * s} h${3 * s} v${2 * s} q${4 * s} ${2 * s} ${3 * s} ${6 * s} q${-1 * s} ${3.5 * s} ${-3 * s} ${4 * s} h${-3 * s} q${-2 * s} ${-0.5 * s} ${-3 * s} ${-4 * s} q${-1 * s} ${-4 * s} ${3 * s} ${-6 * s}Z`, c) + L(x - 3 * s, y - 9.5 * s, x - 1.5 * s, y - 11 * s, c, 0.6 * s) + L(x + 3 * s, y - 9.5 * s, x + 1.5 * s, y - 11 * s, c, 0.6 * s);
  const barrel = (x, y, s, c = '#8a5a34') => E(x, y, 5 * s, 6 * s, c) + E(x, y, 5 * s, 6 * s, 'none', `stroke="#4e3420" stroke-width="${0.5 * s}"`) + L(x - 4.6 * s, y - 2.5 * s, x + 4.6 * s, y - 2.5 * s, '#4e3420', 0.6 * s) + L(x - 4.6 * s, y + 2.5 * s, x + 4.6 * s, y + 2.5 * s, '#4e3420', 0.6 * s);
  const barrelSide = (x, y, s) => E(x, y, 5 * s, 5 * s, '#8a5a34') + E(x, y, 3.4 * s, 3.4 * s, '#a87447') + C(x, y, 0.8 * s, '#4e3420');
  const logs = (x, y, s) => { let g = ''; const rows = [[0, 0], [1, 0], [2, 0], [3, 0], [0.5, -1], [1.5, -1], [2.5, -1], [1, -2], [2, -2]];
    for (const [i, j] of rows) { const cx = x + i * 6 * s, cy = y + j * 5.4 * s; g += C(cx, cy, 3 * s, '#a4774a') + C(cx, cy, 2.1 * s, '#d9b384') + C(cx, cy, 1 * s, 'none', `stroke="#a4774a" stroke-width="${0.3 * s}"`); }
    return R(x - 3 * s, y - 13 * s, 24 * s, 16 * s, '#7a5332', 0, 'opacity=".0"') + g; };
  const blocks = (x, y, s, c = '#a7abb0') => { let g = ''; for (const [i, j] of [[0, 0], [1, 0], [2, 0], [0.5, -1], [1.5, -1], [1, -2]]) g += R(x + i * 8 * s, y + j * 5.5 * s - 5.5 * s, 7.6 * s, 5.2 * s, c, 0.6) + R(x + i * 8 * s, y + j * 5.5 * s - 5.5 * s, 7.6 * s, 1.2 * s, '#fff', 0, 'opacity=".25"'); return g; };
  const bricks = (x, y, s) => blocks(x, y, s, '#c0633b');
  const water = (y, c = '#7fb0c8', w = 100) => R(-5, y, w + 10, 160 - y, c) + [0, 1, 2, 3].map(i => L(10 + i * 22 + (i % 2) * 8, y + 4 + i * 3, 24 + i * 22 + (i % 2) * 8, y + 4 + i * 3, '#fff', 0.6, 'opacity=".5"')).join('');
  const ship = (x, y, s, sail = '#e9dcc0') => P(`M${x - 14 * s} ${y - 4 * s} H${x + 14 * s} L${x + 10 * s} ${y + 2 * s} H${x - 10 * s}Z`, '#6b4228') + L(x, y - 4 * s, x, y - 24 * s, '#4e3420', 0.8 * s) +
    P(`M${x - 9 * s} ${y - 22 * s} Q${x} ${y - 19 * s} ${x + 9 * s} ${y - 22 * s} V${y - 8 * s} Q${x} ${y - 5 * s} ${x - 9 * s} ${y - 8 * s}Z`, sail) + L(x - 9 * s, y - 15 * s, x + 9 * s, y - 15 * s, '#b24a36', 1.4 * s, 'opacity=".7"');
  const flame = (x, y, s) => C(x, y - 3 * s, 7 * s, '#ffcf7a', 'opacity=".3"') + P(`M${x} ${y - 9 * s} Q${x + 4 * s} ${y - 3 * s} ${x + 2 * s} ${y} H${x - 2 * s} Q${x - 4 * s} ${y - 3 * s} ${x} ${y - 9 * s}Z`, '#f29a3a') + P(`M${x} ${y - 5.5 * s} Q${x + 2 * s} ${y - 2 * s} ${x + 1 * s} ${y} H${x - 1 * s} Q${x - 2 * s} ${y - 2 * s} ${x} ${y - 5.5 * s}Z`, '#ffe08a');
  const lighthouse = (x, y, s) => P(`M${x - 7 * s} ${y} L${x - 4 * s} ${y - 40 * s} H${x + 4 * s} L${x + 7 * s} ${y}Z`, '#e6dccb') + R(x - 5 * s, y - 46 * s, 10 * s, 6 * s, '#cdbfa6') + flame(x, y - 46 * s, 1.1 * s) + [1, 2, 3].map(i => R(x - 6 * s + i * 0.6 * s, y - i * 12 * s, 12 * s - i * 1.2 * s, 1.4 * s, '#cdbfa6')).join('');
  const banner = (x, y, s, c = '#b83a2f') => L(x, y, x, y - 26 * s, '#5a4632', 0.8 * s) + P(`M${x} ${y - 25 * s} h${9 * s} l${-2 * s} ${4 * s} l${2 * s} ${4 * s} h${-9 * s}Z`, c);
  const awning = (x, y, w, c = '#c9533f', goods = '') => {
    let stripes = ''; for (let i = 0; i < w; i += 6) stripes += R(x + i, y - 26, 3, 7, '#f3e6cf');
    return R(x + 1, y - 19, 2, 19, '#6b4a2e') + R(x + w - 3, y - 19, 2, 19, '#6b4a2e') + R(x - 1, y - 26, w + 2, 7, c) + stripes + P(`M${x - 1} ${y - 19} ${Array.from({ length: Math.ceil(w / 6) }, (_, i) => `q3 3 6 0`).join(' ')} V${y - 19}Z`, c) + R(x + 2, y - 9, w - 4, 9, '#8a6040') + goods;
  };
  const shelf = (x, y, w, h, seed) => { const r = rng(seed); let g = R(x, y - h, w, h, '#6d4a31') + R(x + 1.5, y - h + 1.5, w - 3, h - 3, '#4b3222');
    for (let k = 1; k < 4; k++) { const sy = y - h + (k * h) / 4; g += R(x + 1.5, sy, w - 3, 1.4, '#8a6040');
      for (let i = 0; i < 5; i++) { const jx = x + 4 + i * (w - 8) / 5 + r() * 2; const c = ['#b5673f', '#6f8f6a', '#a58a5a', '#5f7fa0'][Math.floor(r() * 4)]; g += r() > 0.5 ? amphora(jx, sy, 0.4, c) : R(jx - 1.5, sy - 4, 3, 4, c, 1); } }
    return g; };
  const scrolls = (x, y, s) => { let g = ''; for (const [i, j] of [[0, 0], [1, 0], [2, 0], [0.5, -1], [1.5, -1]]) g += R(x + i * 7 * s, y + j * 3.2 * s - 3 * s, 6.5 * s, 3 * s, '#e6d2a6', 1.4 * s) + C(x + i * 7 * s + 0.5 * s, y + j * 3.2 * s - 1.5 * s, 1.4 * s, '#c9ad76'); return g; };
  const flask = (x, y, s, c = '#8fd0e3') => P(`M${x - 1 * s} ${y - 10 * s} h${2 * s} v${4 * s} l${3.5 * s} ${5.5 * s} q${0.5 * s} ${0.8 * s} ${-0.5 * s} ${0.8 * s} h${-8 * s} q${-1 * s} 0 ${-0.5 * s} ${-0.8 * s} l${3.5 * s} ${-5.5 * s}Z`, c, 'opacity=".9"') + R(x - 1.4 * s, y - 11 * s, 2.8 * s, 1.2 * s, '#a58a5a');
  const table = (x, y, w, c = '#7a5234') => R(x, y - 9, w, 2, c) + R(x + 2, y - 7, 1.6, 7, c) + R(x + w - 3.6, y - 7, 1.6, 7, c);
  const mask = (x, y, s, c = '#f2e7d2', sad) => E(x, y, 5 * s, 6.5 * s, c) + E(x - 2 * s, y - 1.5 * s, 1.2 * s, 0.8 * s, '#3b2a22') + E(x + 2 * s, y - 1.5 * s, 1.2 * s, 0.8 * s, '#3b2a22') + P(`M${x - 2.5 * s} ${y + 2.5 * s} Q${x} ${y + (sad ? 1 : 4.5) * s} ${x + 2.5 * s} ${y + 2.5 * s}`, 'none', `stroke="#3b2a22" stroke-width="${0.6 * s}"`);
  const horse = (x, y, s, c = '#6b4a34') => P(`M${x - 9 * s} ${y - 9 * s} Q${x - 10 * s} ${y - 14 * s} ${x - 4 * s} ${y - 14 * s} H${x + 5 * s} L${x + 9 * s} ${y - 20 * s} L${x + 12 * s} ${y - 19 * s} L${x + 11 * s} ${y - 14 * s} L${x + 8 * s} ${y - 11 * s} Q${x + 7 * s} ${y - 8 * s} ${x + 5 * s} ${y - 8 * s} H${x - 6 * s}Z`, c) +
    [x - 7, x - 4, x + 3, x + 6].map((lx, i) => L(lx * 1 + (lx - x) * (s - 1), y - 8.5 * s, lx * 1 + (lx - x) * (s - 1) + (i % 2 ? 0.8 : -0.8) * s, y, c, 1.2 * s)).join('') + P(`M${x - 9 * s} ${y - 12 * s} q${-3 * s} ${2 * s} ${-2 * s} ${6 * s}`, 'none', `stroke="${c}" stroke-width="${0.9 * s}"`);
  const camel = (x, y, s, c = '#b08a5a') => P(`M${x - 8 * s} ${y - 8 * s} Q${x - 7 * s} ${y - 17 * s} ${x - 2 * s} ${y - 13 * s} Q${x + 1 * s} ${y - 18 * s} ${x + 5 * s} ${y - 12 * s} L${x + 9 * s} ${y - 18 * s} L${x + 12 * s} ${y - 17 * s} L${x + 10 * s} ${y - 12 * s} Q${x + 8 * s} ${y - 7 * s} ${x + 4 * s} ${y - 8 * s}Z`, c) + [x - 6, x - 3, x + 2, x + 4].map(lx => L(lx + (lx - x) * (s - 1), y - 8 * s, lx + (lx - x) * (s - 1), y, c, 1 * s)).join('');
  const target = (x, y, r) => C(x, y, r, '#f1e5c8') + C(x, y, r * 0.72, '#c0453a') + C(x, y, r * 0.46, '#f1e5c8') + C(x, y, r * 0.22, '#c0453a') + L(x, y + r, x - r * 0.6, y + r * 2.2, '#6b4a2e', 1) + L(x, y + r, x + r * 0.6, y + r * 2.2, '#6b4a2e', 1);
  const fence = (x, y, w, c = '#8a6040') => { let g = R(x, y - 6, w, 1.2, c) + R(x, y - 3, w, 1.2, c); for (let i = 0; i <= w; i += 5) g += R(x + i, y - 8, 1.4, 8, c); return g; };
  const palisade = (x, y, w, c = '#8a6040') => { let d = ''; for (let i = 0; i < w; i += 3.4) d += `M${x + i} ${y} V${y - 14 - (i % 2) * 2} l1.6 -2.5 l1.6 2.5 V${y}Z `; return P(d, c); };
  const tent = (x, y, s, c = '#d8c6a0') => P(`M${x - 10 * s} ${y} L${x} ${y - 14 * s} L${x + 10 * s} ${y}Z`, c) + P(`M${x - 2 * s} ${y} L${x} ${y - 7 * s} L${x + 2 * s} ${y}Z`, '#5b4a3a');
  const kiln = (x, y, s) => P(`M${x - 9 * s} ${y} Q${x - 10 * s} ${y - 16 * s} ${x} ${y - 17 * s} Q${x + 10 * s} ${y - 16 * s} ${x + 9 * s} ${y}Z`, '#a8683f') + P(`M${x - 4 * s} ${y} Q${x} ${y - 9 * s} ${x + 4 * s} ${y}Z`, '#ffb45a') + C(x, y - 2 * s, 6 * s, '#ffcf7a', 'opacity=".35"') + R(x - 1.5 * s, y - 22 * s, 3 * s, 5 * s, '#8a5433');
  const catapult = (x, y, s) => R(x - 10 * s, y - 4 * s, 20 * s, 3 * s, '#7a5234') + C(x - 7 * s, y - 1 * s, 2.4 * s, '#5a3d24') + C(x + 7 * s, y - 1 * s, 2.4 * s, '#5a3d24') + L(x - 5 * s, y - 4 * s, x + 6 * s, y - 20 * s, '#7a5234', 1.6 * s) + E(x + 7 * s, y - 21 * s, 2.2 * s, 1.4 * s, '#5a3d24') + L(x + 3 * s, y - 4 * s, x + 2 * s, y - 13 * s, '#7a5234', 1.2 * s);
  const stars = (seed, w = 100) => { const r = rng(seed); let g = ''; for (let i = 0; i < 26; i++) g += C(r() * w, 4 + r() * 60, 0.3 + r() * 0.5, '#fff', `opacity="${0.4 + r() * 0.6}"`); return g; };
  const coins = (x, y, s) => { let g = ''; for (let i = 0; i < 5; i++) g += E(x, y - i * 1.6 * s, 4 * s, 1.5 * s, '#e3b33b', `stroke="#a8791a" stroke-width="${0.3 * s}"`); for (let i = 0; i < 3; i++) g += E(x + 8 * s, y - i * 1.6 * s, 4 * s, 1.5 * s, '#e3b33b', `stroke="#a8791a" stroke-width="${0.3 * s}"`); return g; };
  const scales = (x, y, s, c = '#9a7440') => L(x, y, x, y - 18 * s, c, 1 * s) + L(x - 9 * s, y - 16 * s, x + 9 * s, y - 16 * s, c, 0.9 * s) + P(`M${x - 13 * s} ${y - 9 * s} Q${x - 9 * s} ${y - 6 * s} ${x - 5 * s} ${y - 9 * s}Z`, c) + P(`M${x + 5 * s} ${y - 9 * s} Q${x + 9 * s} ${y - 6 * s} ${x + 13 * s} ${y - 9 * s}Z`, c) + L(x - 9 * s, y - 16 * s, x - 11 * s, y - 9 * s, c, 0.3 * s) + L(x - 9 * s, y - 16 * s, x - 7 * s, y - 9 * s, c, 0.3 * s) + L(x + 9 * s, y - 16 * s, x + 7 * s, y - 9 * s, c, 0.3 * s) + L(x + 9 * s, y - 16 * s, x + 11 * s, y - 9 * s, c, 0.3 * s) + R(x - 4 * s, y, 8 * s, 1.5 * s, c);
  const steps = (x, y, w, n, c = '#e1d5bf') => { let g = ''; for (let i = 0; i < n; i++) g += R(x + i * 2.5, y - (i + 1) * 2.4, w - i * 5, 2.4, i % 2 ? c : '#d6c9b1'); return g; };
  const pyramid = (x, y, w, h, c = '#e3c48d') => P(`M${x - w / 2} ${y} L${x} ${y - h} L${x + w / 2} ${y}Z`, c) + P(`M${x} ${y - h} L${x + w / 2} ${y} H${x + w * 0.12}Z`, '#000', 'opacity=".13"');
  const candle = (x, y, s) => R(x - 1 * s, y - 6 * s, 2 * s, 6 * s, '#efe3c4') + flame(x, y - 6 * s, 0.4 * s);
  const armillary = (x, y, s, c = '#b07a3e') => `<g fill="none" stroke="${c}" stroke-width="${1.1 * s}">${C(x, y - 12 * s, 7 * s, 'none')}${E(x, y - 12 * s, 7 * s, 2.5 * s, 'none', `transform="rotate(-25 ${x} ${y - 12 * s})"`)}${E(x, y - 12 * s, 2.5 * s, 7 * s, 'none')}</g>` + L(x, y - 5 * s, x, y, c, 1.2 * s) + R(x - 4 * s, y - 1 * s, 8 * s, 1.5 * s, c);
  const vignette = (w = 100, h = 150) => R(-5, -5, w + 10, h + 10, 'url(#vignette)');

  /* ---------------------------------------------------------------- scenes ---- */
  // One per card name. Scenes are loose sketches of the idea, drawn from a few shared props.
  const S = {
    'Lumber yard': () => sky('dawn') + sun(58, 68, 7) + hills(92, '#b98f6a', 14, 1) + tree(20, 104, 1.4, '#7b8a4c') + tree(82, 100, 1.2, '#8a8a52') + ground(104, '#8f7a4e') + logs(14, 126, 1.4) + person(70, 130, 1.5, '#7a3b2e', { tool: 'axe' }),
    'Logging camp': () => sky('day') + hills(88, '#8fa87a', 10, 2) + [12, 28, 72, 88].map((x, i) => cypress(x, 110 - i % 2 * 4, 1.3)) + ground(108, '#8a8a5a') + tent(50, 118, 1.5) + logs(64, 132, 1) + person(30, 134, 1.3, '#5d6f8a', { tool: 'axe' }),
    'Clay pool': () => sky('day') + hills(84, '#9fb58a', 8, 3) + ground(96, '#b88a5c') + E(50, 116, 40, 12, '#c9784a') + E(50, 117, 33, 9, '#7fa9b8') + [16, 22, 80, 86].map(x => L(x, 112, x + 1, 100, '#5f7f45', 0.8)).join('') + person(72, 132, 1.3, '#9a5c4a', { tool: 'basket' }),
    'Clay pit': () => sky('dusk') + ground(88, '#c07a4a') + P('M0 100 Q50 84 100 100 V150 H0Z', '#a9603a') + P('M10 112 Q50 98 90 112 V150 H10Z', '#8f4d2e') + P('M22 124 Q50 114 78 124 V150 H22Z', '#7a3f26') + person(44, 124, 1.2, '#e3d8c4', { tool: 'basket' }) + person(64, 110, 1, '#5d6f8a'),
    'Quarry': () => sky('day') + P('M-5 60 L30 52 L55 70 L80 55 L105 64 V150 H-5Z', '#9ea3a8') + P('M-5 90 L40 82 L70 96 L105 88 V150 H-5Z', '#878c92') + blocks(20, 132, 1.3) + person(76, 134, 1.3, '#7a4b3a', { tool: 'staff' }),
    'Stone pit': () => sky('dusk') + P('M-5 70 L25 64 L60 80 L105 70 V150 H-5Z', '#a39e98') + R(24, 92, 52, 40, '#7f7a74') + R(30, 100, 40, 32, '#6b6661') + blocks(54, 136, 1) + person(34, 132, 1.3, '#9a5c4a', { tool: 'staff' }),
    'Glassworks': () => sky('int') + kiln(40, 128, 2.2) + [70, 78, 86].map((x, i) => flask(x, 128 - i % 2 * 2, 1.1, ['#8fd0e3', '#a7d9c8', '#9bc3ea'][i])).join('') + table(62, 132, 32),
    'Press': () => sky('int') + R(20, 60, 2, 76, '#6b4a2e') + R(78, 60, 2, 76, '#6b4a2e') + R(20, 60, 60, 4, '#6b4a2e') + R(34, 64, 32, 30, '#e6d2a6') + R(38, 68, 24, 22, '#efdfba') + L(50, 64, 50, 94, '#c9ad76', 0.5) + scrolls(26, 134, 1.4),
    'Guard tower': () => sky('dusk') + hills(104, '#8f8a6a', 12, 5) + tower(58, 112, 18, 62) + banner(58, 50, 1, '#c23b2e') + palisade(4, 124, 30) + person(26, 136, 1.2, '#8a3d32', { tool: 'spear', crest: 1 }),
    'Workshop': () => sky('int') + table(10, 130, 80) + G(26, 104, 1, `<g fill="none" stroke="#8a5a2b" stroke-width="2"><path d="M0 18 L10 0 L20 18"/></g>`) + L(36, 104, 36, 116, '#8a5a2b', 0.6) + C(36, 117, 1.5, '#5a3d24') + R(52, 112, 18, 9, '#b9a27a', 1) + L(74, 121, 88, 104, '#9aa0a6', 1.6) + person(66, 118, 1.3, '#6b7a4a'),
    'Apothecary': () => sky('int') + shelf(46, 128, 46, 60, 7) + R(4, 50, 18, 90, '#c98a5a', 0, 'opacity=".55"') + person(40, 136, 1.7, '#3f8a5a', { tool: 'bowl', hair: '#e8e1d6' }) + [70, 78].map(x => flask(x, 138, 0.8, '#6fa88f')).join(''),
    'Stone reserve': () => sky('day') + ground(116, '#cdb892') + awning(20, 124, 60, '#6f7780', blocks(26, 124, 0.9)) + person(80, 138, 1.2, '#8a7a4a'),
    'Clay reserve': () => sky('day') + ground(116, '#cdb892') + awning(20, 124, 60, '#c0633b', bricks(26, 124, 0.9)) + person(80, 138, 1.2, '#5d6f8a'),
    'Wood reserve': () => sky('day') + ground(116, '#cdb892') + awning(20, 124, 60, '#5f7f45', logs(30, 120, 0.7)) + person(80, 138, 1.2, '#9a5c4a'),
    'Stable': () => sky('day') + hills(96, '#a7b58a', 8, 9) + ground(110, '#b59a6a') + R(46, 84, 44, 30, '#a07650') + P('M42 86 L68 68 L94 86Z', '#7a5234') + R(60, 96, 14, 18, '#4e3420') + fence(2, 124, 40) + horse(30, 136, 1.4),
    'Garrison': () => sky('day') + arcade(-4, 150, 108, 104, 2, '#5f5a52', 'none') + temple(52, 118, 30, 16, 5) + person(38, 136, 1.4, '#8a2f28', { crest: 1 }) + crowd(58, 124, 22, 5, 11, 0.45),
    'Palisade': () => sky('dusk') + hills(100, '#9a8a6a', 10, 12) + palisade(-4, 128, 108) + tower(78, 106, 14, 40, '#8a6040') + person(30, 140, 1.2, '#8a3d32', { tool: 'spear' }),
    'Scriptorium': () => sky('int') + table(14, 128, 72) + R(26, 114, 30, 5, '#efdfba') + L(50, 104, 60, 118, '#ece3d0', 0.8) + candle(70, 119, 1.4) + scrolls(18, 142, 1) + person(40, 116, 1.3, '#6f5a8a'),
    'Pharmacist': () => sky('int') + shelf(10, 124, 40, 56, 13) + E(68, 124, 10, 5, '#8f6a45') + L(64, 124, 74, 108, '#b9a27a', 2) + [82, 90].map(x => flask(x, 128, 0.9, '#9fcf9a')).join('') + table(56, 132, 40),
    'Theater': () => sky('day') + P('M-5 150 V104 Q50 70 105 104 V150Z', '#d8c9ad') + [0, 1, 2, 3].map(i => P(`M${-5 + i * 6} 150 V${108 + i * 6} Q50 ${76 + i * 8} ${105 - i * 6} ${108 + i * 6} V150`, 'none', 'stroke="#bfae8e" stroke-width="1"')).join('') + mask(38, 118, 1.6) + mask(62, 118, 1.6, '#e3cfae', true),
    'Altar': () => sky('dusk') + temple(50, 116, 70, 34, 6) + R(38, 118, 24, 14, '#d8ccb5') + flame(50, 118, 1.8) + crowd(10, 142, 80, 6, 14, 0.5),
    'Baths': () => sky('int') + column(14, 118, 70, 7) + column(86, 118, 70, 7) + water(114, '#8cc2c9') + E(50, 104, 14, 5, '#e6dccb') + L(50, 104, 50, 116, '#dff1f4', 1.2) + person(28, 120, 1.2, '#efe6d6') + person(72, 136, 1.5, '#3a2a22', { skin: '#c99670' }),
    'Tavern': () => sky('dusk') + R(18, 72, 64, 54, '#b88a60') + P('M12 74 L50 52 L88 74Z', '#8a5433') + R(40, 98, 20, 28, '#4e3420') + C(30, 90, 2.5, '#ffcf7a') + amphora(22, 138, 1.1) + amphora(82, 138, 1.2, '#9a5a3a') + table(58, 142, 18),
    'Sawmill': () => sky('day') + [10, 88].map(x => cypress(x, 104, 1.4)).join('') + ground(104, '#9a8a5a') + R(24, 94, 52, 4, '#7a5234') + R(26, 98, 3, 20, '#7a5234') + R(71, 98, 3, 20, '#7a5234') + L(50, 70, 50, 118, '#c7ccd0', 1.2) + R(10, 124, 80, 5, '#d9b384') + R(14, 130, 72, 5, '#c9a071') + person(80, 140, 1.2, '#5d6f8a'),
    'Brickyard': () => sky('day') + ground(104, '#c9a27a') + kiln(70, 118, 1.6) + bricks(12, 130, 1.1) + bricks(40, 140, 0.9),
    'Shelf quarry': () => sky('day') + [0, 1, 2, 3].map(i => R(-5 + i * 10, 64 + i * 18, 110 - i * 20, 18, ['#b1b4b8', '#a0a4a9', '#90949a', '#80858b'][i])).join('') + blocks(56, 136, 1) + person(32, 128, 1.1, '#7a4b3a', { tool: 'staff' }),
    'Glass-blower': () => sky('int') + kiln(26, 128, 2) + L(52, 112, 70, 104, '#5a4632', 1) + C(72, 103, 3, '#ffb45a') + person(50, 132, 1.6, '#6b7a4a') + [80, 88].map(x => amphora(x, 136, 0.8, '#8fd0e3')).join(''),
    'Drying room': () => sky('int') + [66, 84, 102].map((y, k) => L(0, y, 100, y, '#6b4a2e', 0.5) + [10, 30, 50, 70, 90].map(x => R(x - 7 + k * 3, y, 13, 12, '#ecdcb4', 0, 'opacity=".9"')).join('')).join('') + person(50, 142, 1.3, '#9a5c4a'),
    'Walls': () => sky('day') + hills(108, '#a7b58a', 10, 21) + wall(-4, 126, 108, 30, '#b8a58a') + tower(20, 128, 16, 44) + tower(80, 128, 16, 44) + banner(80, 84, 0.8),
    'Forum': () => sky('day') + ground(116, '#d8c9ad') + [10, 26, 42, 58, 74, 90].map(x => column(x, 116, 38, 4)).join('') + R(4, 74, 92, 5, '#e3d6bf') + awning(30, 132, 40, '#b8462f') + crowd(8, 144, 84, 7, 17, 0.5),
    'Caravansery': () => sky('desert') + sun(76, 60, 6, '#ffe2a8') + ground(108, '#d8b98a') + wall(-4, 118, 108, 30, '#c9a27a') + arcade(34, 118, 32, 34, 1, '#b8916a') + camel(22, 140, 1.4) + camel(78, 138, 1.1, '#9a7650'),
    'Customs house': () => sky('day') + water(120, '#7fb0c8') + R(4, 80, 56, 42, '#d8c9ad') + P('M0 82 L32 64 L64 82Z', '#b8462f') + ship(78, 124, 0.9) + R(8, 128, 10, 8, '#a07650') + R(20, 130, 8, 6, '#8a6040'),
    'Courthouse': () => sky('day') + steps(8, 142, 84, 5) + temple(50, 130, 72, 38, 6) + crowd(14, 146, 72, 6, 19, 0.45),
    'Horse breeders': () => sky('day') + hills(96, '#a7b58a', 8, 23) + ground(108, '#b5a06a') + fence(0, 118, 100) + horse(30, 138, 1.3, '#7a5234') + horse(70, 134, 1.1, '#e3d8c4'),
    'Barracks': () => sky('day') + R(10, 80, 80, 44, '#c9a27a') + P('M4 82 L50 62 L96 82Z', '#8a5433') + [26, 50, 74].map(x => R(x - 5, 96, 10, 28, '#5a4632')).join('') + [16, 34, 64, 84].map(x => person(x, 142, 1.1, '#8a2f28', { tool: 'spear', crest: 1 })).join(''),
    'Archery range': () => sky('day') + ground(104, '#a8b07a') + target(70, 96, 11) + person(28, 140, 1.7, '#5d6f8a', { tool: 'bow' }),
    'Parade ground': () => sky('dusk') + ground(108, '#c9b48a') + [0, 1, 2].map(r => crowd(8 + r * 4, 120 + r * 10, 80 - r * 4, 7, 30 + r, 0.55 + r * 0.1)).join('') + banner(10, 118, 1) + banner(90, 118, 1),
    'Library': () => sky('int') + [8, 52].map(x => R(x, 60, 40, 76, '#5b3d27') + [0, 1, 2, 3].map(k => scrolls(x + 4, 78 + k * 16, 0.85)).join('')).join('') + person(50, 142, 1.3, '#6f5a8a'),
    'Dispensary': () => sky('int') + shelf(4, 132, 50, 70, 29) + table(56, 134, 40) + [64, 74, 84].map((x, i) => flask(x, 125, 1, ['#9fcf9a', '#e3b0a0', '#8fd0e3'][i])).join('') + E(70, 136, 6, 2.5, '#8f6a45'),
    'School': () => sky('day') + column(10, 120, 60, 6) + column(90, 120, 60, 6) + ground(120, '#d8c9ad') + person(76, 136, 1.6, '#e3d8c4', { tool: 'staff', hair: '#e8e1d6' }) + crowd(14, 142, 46, 4, 33, 0.8),
    'Laboratory': () => sky('int') + table(8, 130, 84) + [22, 36, 50].map((x, i) => flask(x, 121, 1.3, ['#9fcf9a', '#8fd0e3', '#e3b0a0'][i])).join('') + G(62, 94, 1, `<g fill="none" stroke="#8a5a2b" stroke-width="2"><path d="M0 26 L12 0 L24 26"/></g>`) + L(74, 94, 74, 110, '#8a5a2b', 0.6) + C(74, 111, 1.8, '#5a3d24'),
    'Statue': () => sky('day') + ground(128, '#d8c9ad') + statue(50, 132, 2.2) + cypress(12, 130, 1.6) + cypress(88, 130, 1.6),
    'Temple': () => sky('dusk') + sun(50, 70, 5, '#ffd9a8') + steps(4, 142, 92, 4) + temple(50, 132, 78, 42, 7),
    'Aqueduct': () => sky('day') + hills(104, '#a7b58a', 10, 37) + arcade(-6, 130, 112, 58, 5, '#c9a27a') + R(-6, 70, 112, 4, '#b8916a') + water(134, '#8cb8c4'),
    'Rostrum': () => sky('day') + R(26, 104, 48, 22, '#d8ccb5') + R(22, 102, 56, 3, '#e6dbc6') + person(50, 104, 1.5, '#e3d8c4', { tool: 'staff' }) + crowd(4, 144, 92, 9, 39, 0.55),
    'Brewery': () => sky('int') + [18, 42, 66].map(x => barrelSide(x + 8, 128, 2)).join('') + [30, 54].map(x => barrelSide(x + 8, 108, 2)).join('') + R(0, 138, 100, 12, '#5b3d27'),
    'Arsenal': () => sky('int') + R(8, 60, 84, 70, '#5b3d27') + [22, 42, 62, 82].map((x, i) => C(x - 2, 90, 8, ['#b83a2f', '#c9a246', '#8a8f96', '#b83a2f'][i]) + C(x - 2, 90, 3, '#e8dcc4')).join('') + [16, 28, 40, 52, 64, 76].map(x => L(x, 128, x + 2, 104, '#6b4a2e', 1)).join(''),
    'Pretorium': () => sky('dusk') + steps(10, 142, 80, 4) + temple(50, 132, 70, 40, 6, '#e6dccb', '#b8462f') + banner(12, 132, 1.2) + banner(88, 132, 1.2) + person(30, 148, 1.2, '#8a2f28', { tool: 'spear', crest: 1 }) + person(70, 148, 1.2, '#8a2f28', { tool: 'spear', crest: 1 }),
    'Academy': () => sky('day') + [14, 86].map(x => column(x, 128, 68, 7)).join('') + ground(128, '#d8c9ad') + P('M38 126 L52 120 L66 126 L52 132Z', '#b9a27a') + L(52, 126, 56, 110, '#6b4a2e', 1) + person(76, 140, 1.5, '#e3d8c4', { tool: 'staff', hair: '#e8e1d6' }) + person(26, 140, 1.2, '#5d6f8a'),
    'Study': () => sky('int') + R(6, 58, 30, 80, '#5b3d27') + [0, 1, 2, 3].map(k => scrolls(9, 76 + k * 16, 0.7)).join('') + table(40, 132, 54) + P('M54 118 L64 114 L74 118 L64 122Z', '#b9a27a') + L(64, 118, 67, 108, '#6b4a2e', 0.8) + candle(84, 123, 1.2),
    'Chamber of commerce': () => sky('day') + temple(50, 116, 66, 32, 5) + scales(50, 140, 1.4) + coins(18, 142, 1.1) + coins(72, 142, 1),
    'Port': () => sky('day') + water(110, '#7fb0c8') + ship(34, 124, 1.1) + ship(76, 116, 0.7, '#e3cfae') + lighthouse(90, 108, 0.6) + R(-5, 132, 40, 20, '#b8a58a'),
    'Armory': () => sky('int') + R(10, 62, 80, 66, '#5b3d27') + P('M30 74 h14 v18 q-7 10 -14 0Z', '#b0b5ba') + P('M56 74 h14 v18 q-7 10 -14 0Z', '#c9a246') + C(50, 110, 10, '#b83a2f') + C(50, 110, 3.5, '#e8dcc4') + [20, 80].map(x => L(x, 128, x, 76, '#6b4a2e', 1.2)).join(''),
    'Palace': () => sky('dusk') + steps(4, 146, 92, 4) + temple(50, 136, 88, 36, 8) + dome(50, 86, 34, 16),
    'Town hall': () => sky('day') + R(10, 82, 80, 50, '#e1d5bf') + [22, 38, 62, 78].map(x => column(x, 132, 40, 5)).join('') + P('M6 84 L50 64 L94 84Z', '#d6c9b1') + crowd(4, 146, 92, 8, 41, 0.5),
    'Obelisk': () => sky('desert') + sun(74, 64, 7, '#ffe2a8') + hills(118, '#d8b98a', 6, 43) + obelisk(44, 136, 1.9) + ground(134, '#cfb080'),
    'Fortifications': () => sky('dusk') + hills(104, '#9a8a6a', 8, 45) + wall(-4, 132, 108, 44, '#a8957a') + tower(16, 136, 22, 66) + tower(84, 136, 22, 66) + arcade(38, 132, 24, 30, 1, '#8f7d64'),
    'Siege workshop': () => sky('day') + ground(112, '#a8987a') + catapult(46, 132, 2.2) + logs(66, 140, 0.8) + person(84, 140, 1.2, '#5d6f8a', { tool: 'axe' }),
    'Circus': () => sky('day') + E(50, 122, 52, 18, '#d8c9ad') + E(50, 124, 40, 11, '#c9a27a') + R(22, 122, 56, 3, '#e6dbc6') + horse(40, 132, 0.8) + horse(64, 128, 0.7, '#e3d8c4') + crowd(0, 104, 100, 12, 47, 0.35),
    'University': () => sky('day') + steps(8, 142, 84, 4) + temple(50, 132, 70, 34, 6) + dome(50, 82, 30, 14) + armillary(50, 150, 0.9),
    'Observatory': () => sky('night') + stars(49) + C(80, 58, 6, '#f4ecd0') + R(22, 102, 56, 40, '#8a8f96') + dome(50, 104, 56, 22, '#b9bec4') + L(46, 92, 72, 70, '#4b4f55', 3),
    'Gardens': () => sky('day') + ground(112, '#8fb07a') + [8, 30, 70, 92].map(x => tree(x, 116, 1.2, '#5f8f4a')).join('') + E(50, 126, 14, 4, '#8cc2c9') + L(50, 126, 50, 108, '#dff1f4', 1.2) + column(50, 122, 6, 4),
    'Pantheon': () => sky('dusk') + steps(10, 144, 80, 4) + R(12, 94, 76, 40, '#e1d5bf') + dome(50, 96, 76, 28, '#d6c9b1') + temple(50, 134, 44, 30, 4),
    'Senate': () => sky('day') + P('M-5 150 V110 Q50 86 105 110 V150Z', '#e1d5bf') + [10, 26, 42, 58, 74, 90].map(x => column(x, 118, 30, 4)).join('') + crowd(10, 144, 80, 8, 53, 0.45),
    'Lighthouse': () => sky('dusk') + water(118, '#7f9fb8') + R(34, 116, 32, 8, '#b8a58a') + lighthouse(50, 118, 1.3) + ship(16, 134, 0.6),
    'Arena': () => sky('day') + arcade(2, 136, 96, 58, 5, '#d8b98a') + arcade(8, 84, 84, 18, 6, '#c9a27a') + crowd(8, 150, 84, 8, 59, 0.45),
    'Merchants guild': () => sky('int') + table(8, 130, 84) + scales(50, 121, 1.1) + coins(20, 120, 0.8) + banner(90, 134, 1.3, '#d9b64f') + R(60, 112, 12, 9, '#a07650'),
    'Shipowners guild': () => sky('day') + water(118, '#7fb0c8') + ship(46, 128, 1.4) + banner(90, 118, 1.2, '#7a4fa3'),
    'Builders guild': () => sky('desert') + pyramid(54, 132, 70, 50) + L(18, 132, 22, 70, '#6b4a2e', 1.4) + L(22, 70, 48, 78, '#6b4a2e', 1) + L(44, 78, 44, 100, '#8a8f96', 0.4) + R(40, 100, 8, 5, '#a7abb0') + person(80, 142, 1.2, '#7a4b3a', { tool: 'staff' }),
    'Magistrates guild': () => sky('day') + temple(50, 122, 66, 34, 5) + person(50, 142, 1.5, '#7a4fa3', { tool: 'staff' }) + banner(10, 140, 1.2, '#7a4fa3'),
    'Scientists guild': () => sky('night') + stars(61) + table(10, 136, 80) + armillary(50, 127, 1.6) + candle(22, 127, 1.2) + scrolls(66, 127, 0.8),
    'Moneylenders guild': () => sky('int') + table(6, 132, 88) + coins(24, 123, 1.4) + coins(58, 123, 1.2) + R(40, 104, 20, 12, '#8a5433', 1) + banner(92, 128, 1.1, '#d9b64f'),
    'Tacticians guild': () => sky('int') + table(6, 132, 88) + R(14, 114, 72, 9, '#e6d2a6') + [26, 44, 62].map((x, i) => C(x, 118, 2, ['#b83a2f', '#3d6fb0', '#b83a2f'][i])).join('') + person(20, 142, 1.3, '#8a2f28', { crest: 1 }) + person(80, 142, 1.3, '#7a4fa3'),
  };

  // Wonder scenes: 160 x 100, landscape
  const W = {
    'The Appian Way': () => sky('dawn') + sun(80, 38, 6) + hills(56, '#b9a27a', 8, 71, 160) + P('M70 50 L90 50 L140 100 H20Z', '#b3aaa0') + [0, 1, 2, 3, 4].map(i => L(80 - i * 12, 52 + i * 11, 80 + i * 12, 52 + i * 11, '#8f877e', 0.5)).join('') + [30, 44, 116, 130].map((x, i) => cypress(x, 86 - (i % 2) * 8, 1.1)).join('') + person(98, 96, 1, '#8a2f28', { crest: 1 }),
    'Circus Maximus': () => sky('day') + ground(58, '#d8c9ad', 160) + E(80, 74, 70, 18, '#c9a27a') + R(20, 72, 120, 4, '#e6dbc6') + obelisk(80, 74, 0.5) + horse(52, 84, 0.7) + horse(112, 72, 0.6, '#e3d8c4') + arcade(0, 58, 160, 18, 12, '#d8b98a'),
    'The Colossus': () => sky('storm') + hills(62, '#6f8a8a', 14, 73, 160) + water(70, '#5f8f9a', 160) + G(58, 84, 2.1, statue(0, 0, 1, '#8a6a45')) + [100, 112, 120].map((x, i) => P(`M${x} ${22 + i * 5} q3 -2 6 0 q3 -2 6 0`, 'none', 'stroke="#fff" stroke-width=".8"')).join('') + ship(126, 90, 0.8) + ship(28, 90, 0.5),
    'The Great Library': () => sky('dusk') + steps(14, 96, 132, 4) + temple(80, 86, 118, 46, 10) + scrolls(26, 98, 0.8) + crowd(40, 98, 80, 7, 77, 0.4),
    'The Great Lighthouse': () => sky('dusk') + water(66, '#6f97ad', 160) + R(52, 70, 60, 8, '#b8a58a') + G(82, 76, 1.5, lighthouse(0, 0, 1)) + ship(30, 86, 0.6) + ship(130, 82, 0.5),
    'The Hanging Gardens': () => sky('day') + [0, 1, 2, 3].map(i => R(28 + i * 12, 84 - i * 16, 104 - i * 24, 16, ['#c9a27a', '#bf9a72', '#b8916a', '#ae8962'][i]) + [0, 1, 2, 3, 4].map(k => tree(34 + i * 12 + k * (92 - i * 24) / 4, 70 - i * 16 + 2, 0.55, '#5f8f4a')).join('')).join('') + R(20, 84, 120, 16, '#a07650'),
    'The Mausoleum': () => sky('dusk') + ground(88, '#c9b48a', 160) + R(50, 60, 60, 28, '#e1d5bf') + temple(80, 60, 52, 16, 7) + P('M56 38 L80 18 L104 38Z', '#d6c9b1') + statue(80, 22, 0.35),
    'Piraeus': () => sky('day') + water(58, '#7fb0c8', 160) + R(-5, 80, 60, 25, '#b8a58a') + R(10, 60, 36, 22, '#d8c9ad') + P('M6 62 L28 50 L50 62Z', '#b8462f') + ship(86, 78, 1) + ship(126, 70, 0.7, '#e3cfae') + ship(146, 88, 0.6),
    'The Pyramids': () => sky('desert') + sun(128, 28, 6, '#ffe2a8') + ground(80, '#d8b98a', 160) + pyramid(62, 84, 80, 56) + pyramid(112, 84, 56, 38, '#dcbd86') + pyramid(28, 86, 30, 20, '#d6b27c') + camel(140, 96, 0.8),
    'The Sphinx': () => sky('desert') + ground(74, '#d8b98a', 160) + pyramid(124, 76, 60, 42, '#e0c190') + P('M24 86 L24 72 Q30 58 40 60 L46 48 Q52 42 58 48 L60 62 L104 64 Q112 66 112 86Z', '#c9a06a') + P('M44 50 L40 64 L52 64 L56 50Z', '#b58c58'),
    'The Statue of Zeus': () => sky('int') + [18, 142].map(x => column(x, 98, 84, 10)).join('') + R(52, 78, 56, 20, '#c9b48a') + P('M62 78 L66 40 Q80 30 94 40 L98 78Z', '#c8a24a') + C(80, 32, 6, '#e3c47a') + L(96, 44, 112, 22, '#c8a24a', 2) + R(66, 62, 28, 6, '#a58a5a'),
    'The Temple of Artemis': () => sky('dawn') + sun(30, 30, 5) + steps(6, 98, 148, 4) + temple(80, 88, 136, 42, 12) + cypress(10, 90, 1) + cypress(152, 90, 1),
  };

  const backScene = { 1: () => temple(64, 110, 40, 38, 5), 2: () => arcade(-6, 130, 112, 70, 5, '#000'), 3: () => steps(10, 138, 80, 4) + temple(50, 128, 56, 36, 6) + dome(50, 84, 50, 22), G: () => temple(50, 128, 70, 40, 6) + dome(50, 82, 40, 20) + tower(18, 130, 16, 56) + tower(82, 130, 16, 56) };

  /* ------------------------------------------------------------------ icons ---- */
  // Symbols share one viewBox 0 0 20 20; cards place them with <use>.
  const ICONS = {
    // two branches of leaves curving up either side of the number, open at the top
    laurel: (() => { const leaf = th => { const x = 10 + 7.6 * Math.cos(th * Math.PI / 180), y = 10.6 + 7.6 * Math.sin(th * Math.PI / 180);
        return E(x, y, 1.25, 2.7, '#77b255', `stroke="#3d6b29" stroke-width=".3" transform="rotate(${f(th)} ${f(x)} ${f(y)})"`); };
      const arc = (a0, a1) => P(`M${f(10 + 7.6 * Math.cos(a0 * Math.PI / 180))} ${f(10.6 + 7.6 * Math.sin(a0 * Math.PI / 180))} A7.6 7.6 0 0 ${a1 > a0 ? 1 : 0} ${f(10 + 7.6 * Math.cos(a1 * Math.PI / 180))} ${f(10.6 + 7.6 * Math.sin(a1 * Math.PI / 180))}`, 'none', 'stroke="#3d6b29" stroke-width=".5"');
      let g = arc(100, 240) + arc(80, -60);
      for (let th = 110; th <= 235; th += 25) g += leaf(th);
      for (let th = 70; th >= -55; th -= 25) g += leaf(th);
      return g; })(),
    shield: C(10, 10, 9.2, '#b83a2f', 'stroke="#6e1e17" stroke-width="1"') + C(10, 10, 7, 'none', 'stroke="#e7b2a4" stroke-width=".45" stroke-dasharray="1 .9"') +
      L(4.5, 4.5, 14.5, 14.5, '#f4ece6', 1.3) + L(15.5, 4.5, 5.5, 14.5, '#f4ece6', 1.3) + L(12.2, 15.5, 15.5, 12.2, '#3b2a22', 1.3) + L(7.8, 15.5, 4.5, 12.2, '#3b2a22', 1.3) + L(14.5, 14.5, 16.3, 16.3, '#3b2a22', 1.5) + L(5.5, 14.5, 3.7, 16.3, '#3b2a22', 1.5),
    coin: C(10, 10, 9, '#e8b93f', 'stroke="#a8791a" stroke-width="1"') + C(10, 10, 6.8, 'none', 'stroke="#c99a2a" stroke-width=".5"'),
    WOOD: C(10, 10, 9.2, '#4f7d3a', 'stroke="#2e4a22" stroke-width=".7"') + [[7, 11], [11, 11], [9, 7.6], [13, 7.6]].map(([x, y]) => C(x, y, 2.1, '#8a5a34') + C(x, y, 1.3, '#d9b384')).join(''),
    CLAY: C(10, 10, 9.2, '#c55a33', 'stroke="#7a3219" stroke-width=".7"') + P('M4.5 11 L7 8 H15.5 L13 11Z', '#e7a07c') + P('M4.5 11 H13 V13 H4.5Z', '#9a4524') + P('M13 11 L15.5 8 V10 L13 13Z', '#7a3219'),
    STONE: C(10, 10, 9.2, '#8b9096', 'stroke="#4f5358" stroke-width=".7"') + P('M5 12 L7 8 H14 L15.5 11 L14 13.5 H6.5Z', '#c6cace') + P('M5 12 L6.5 13.5 H14 L15.5 11 V12.5 L14 15 H6.5 L5 13.4Z', '#6d7278'),
    GLASS: P('M6 1.5 H14 L18.5 6 V14 L14 18.5 H6 L1.5 14 V6Z', '#5fb3d6', 'stroke="#2d6f8f" stroke-width=".7"') + flask(10, 16, 0.95, '#eaf7fc'),
    PAPER: P('M6 1.5 H14 L18.5 6 V14 L14 18.5 H6 L1.5 14 V6Z', '#d8b774', 'stroke="#8f6f36" stroke-width=".7"') + R(5, 6, 10, 8, '#f3e2b8', 1) + C(5.2, 10, 1.4, '#c9a15c') + C(14.8, 10, 1.4, '#c9a15c'),
    ARMILLARY_SPHERE: armillary(10, 19, 0.75, '#9a6a33'),
    WEIGHING_SCALE: scales(10, 18.5, 0.62, '#9a6a33'),
    SUNDIAL: P('M2 14 L10 10 L18 14 L10 18Z', '#b98a4f') + P('M2 14 L10 18 L18 14 V15 L10 19 L2 15Z', '#7a5530') + L(10, 14, 11, 3, '#6b4a2e', 1.2),
    MORTAR_AND_PESTEL: P('M2.5 10 H17.5 Q17 17.5 10 17.5 Q3 17.5 2.5 10Z', '#a8773f') + E(10, 10, 7.5, 1.6, '#5a3d24') + L(9, 11, 16, 2, '#c49a64', 2.2),
    INCLINOMETER: `<g fill="none" stroke="#8a5a2b" stroke-width="1.8" stroke-linecap="round"><path d="M3 18 L10 2 L17 18"/></g>` + L(10, 3, 10, 12, '#5a3d24', 0.5) + P('M8.8 12 H11.2 L10 15Z', '#5a3d24'),
    QUILL_AND_INKPEN: P('M4 18 Q7 6 17 2 Q13 8 11 12 Q8 15 4 18Z', '#e7e1d6', 'stroke="#9a8f7e" stroke-width=".4"') + R(11, 13, 6, 5, '#4a3a30', 1),
    WHEEL: C(10, 10, 8.5, 'none', 'stroke="#8a5a2b" stroke-width="2"') + [0, 45, 90, 135].map(a => L(10 + 8 * Math.cos(a * Math.PI / 180), 10 + 8 * Math.sin(a * Math.PI / 180), 10 - 8 * Math.cos(a * Math.PI / 180), 10 - 8 * Math.sin(a * Math.PI / 180), '#8a5a2b', 0.9)).join('') + C(10, 10, 2, '#6b4a2e'),
    again: `<g fill="none" stroke="#f3ecde" stroke-width="1.8" stroke-linecap="round"><path d="M15.5 6.5 A6.5 6.5 0 1 0 16 12.5"/></g>` + P('M13 3.5 L17.5 6.8 L12.6 8.4Z', '#f3ecde'),
    token: C(10, 10, 9, '#3f9a78', 'stroke="#1f5e47" stroke-width=".8"') + C(10, 10, 6, 'none', 'stroke="#d9f1e6" stroke-width=".8"') + C(10, 10, 2, '#d9f1e6'),
    discard: R(3, 5, 10, 13, '#8a8f96', 1.5) + R(6, 3, 10, 13, '#c9cdd2', 1.5, 'stroke="#6b7076" stroke-width=".5"') + P('M9 9 H14 M12 7 L14 9 L12 11', 'none', 'stroke="#3b3f44" stroke-width="1"'),
    wonderMark: P('M10 3 L18 16 H2Z', '#e8b93f', 'stroke="#a8791a" stroke-width=".6"') + P('M10 3 L18 16 H11Z', '#b98a2a'),
    // chain (link) symbols, drawn white
    VASE: amphora(10, 18, 1.35, '#fff'), BARREL: barrel(10, 10, 1.5, '#fff').replace(/#4e3420/g, '#9aa'), MASK: mask(10, 10, 1.4, '#fff'),
    TEMPLE: P('M3 7 L10 2.5 L17 7Z', '#fff') + [5, 8.5, 11.5, 15].map(x => R(x - 0.8, 8, 1.6, 8, '#fff')).join('') + R(2.5, 16.5, 15, 1.6, '#fff'),
    SUN: C(10, 10, 4, '#fff') + [0, 45, 90, 135, 180, 225, 270, 315].map(a => L(10 + 5.5 * Math.cos(a * Math.PI / 180), 10 + 5.5 * Math.sin(a * Math.PI / 180), 10 + 8 * Math.cos(a * Math.PI / 180), 10 + 8 * Math.sin(a * Math.PI / 180), '#fff', 1.4)).join(''),
    DROP: P('M10 2 Q16 10 15 13 A5 5 0 0 1 5 13 Q4 10 10 2Z', '#fff'),
    COLUMN: R(5, 3, 10, 2, '#fff') + R(7, 5, 6, 11, '#fff') + R(5, 16, 10, 2, '#fff'),
    MOON: P('M12 2 A8 8 0 1 0 17 15 A6.5 6.5 0 1 1 12 2Z', '#fff'),
    TARGET: C(10, 10, 8, 'none', 'stroke="#fff" stroke-width="1.6"') + C(10, 10, 4.5, 'none', 'stroke="#fff" stroke-width="1.6"') + C(10, 10, 1.6, '#fff'),
    HELMET: P('M4 16 V10 Q4 3 10 3 Q16 3 16 10 V16 H12 V11 H8 V16Z', '#fff') + P('M6 4 Q10 -1 14 4', 'none', 'stroke="#fff" stroke-width="1.5"'),
    HORSESHOE: P('M5 17 V9 A5 5 0 0 1 15 9 V17', 'none', 'stroke="#fff" stroke-width="3"'),
    SWORD: L(4, 16, 15, 5, '#fff', 2) + L(4.5, 12, 8, 15.5, '#fff', 1.6) + P('M15 5 L17 3 L16 6Z', '#fff'),
    TOWER: wall(5, 18, 10, 15, '#fff'),
    HARP: P('M5 18 V4 Q12 4 15 16 Z', 'none', 'stroke="#fff" stroke-width="1.6"') + [8, 10.5, 13].map(x => L(x, 6, x, 16, '#fff', 0.5)).join(''),
    LYRE: P('M5 4 Q4 14 10 17 Q16 14 15 4', 'none', 'stroke="#fff" stroke-width="1.8"') + R(5, 7, 10, 1.4, '#fff') + [8, 10, 12].map(x => L(x, 8, x, 15, '#fff', 0.5)).join(''),
    GEAR: C(10, 10, 5.5, '#fff') + [0, 45, 90, 135, 180, 225, 270, 315].map(a => R(8.8, 1.5, 2.4, 3.5, '#fff', 0, `transform="rotate(${a} 10 10)"`)).join('') + C(10, 10, 2, '#555'),
    BOOK: P('M2 5 Q6 3 10 5 V17 Q6 15 2 17Z', '#fff') + P('M18 5 Q14 3 10 5 V17 Q14 15 18 17Z', '#fff', 'opacity=".85"'),
    LAMP: P('M3 12 Q10 6 15 10 L18 8 L16 12 Q10 16 3 12Z', '#fff') + flame(5, 11, 0.5).replace(/#f29a3a|#ffe08a|#ffcf7a/g, '#fff'),
  };

  function install() {
    if (document.getElementById('card-defs')) return;
    const noise = (() => { const r = rng(7); let g = ''; for (let i = 0; i < 90; i++) g += C(r() * 30, r() * 30, 0.3 + r() * 0.9, r() > 0.5 ? '#fff' : '#000', `opacity="${0.04 + r() * 0.08}"`); return g; })();
    const grain = (() => { const r = rng(11); let g = ''; for (let i = 0; i < 9; i++) { const y = r() * 30; g += P(`M0 ${f(y)} Q10 ${f(y + r() * 3 - 1.5)} 20 ${f(y)} T40 ${f(y)}`, 'none', `stroke="#000" stroke-width="${f(0.3 + r() * 0.6)}" opacity=".15"`); } return g; })();
    const skies = { dawn: ['#f7cf9a', '#f3e2c2'], day: ['#bcd8ea', '#eee6d6'], dusk: ['#d9b4c9', '#f5dcc0'], night: ['#27335a', '#5b5f88'], int: ['#7b5a40', '#c19a6e'], desert: ['#f2c98f', '#f6e6c4'], storm: ['#6f8f9a', '#c7c0b6'] };
    const bands = { BROWN: ['#8a5634', '#5e3620'], GRAY: ['#a5abb1', '#7b8188'], GOLD: ['#eebc49', '#cf9624'], RED: ['#c34b3a', '#932c22'], BLUE: ['#3a86c4', '#225f93'], GREEN: ['#45a064', '#2b7045'], PURPLE: ['#8a5bb3', '#5c3782'], WONDER: ['#c7b08c', '#a08462'] };
    const lg = (id, [a, b], x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
    const defs = `<svg id="card-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      ${Object.entries(skies).map(([k, v]) => lg('sky-' + k, v)).join('')}
      ${Object.entries(bands).map(([k, v]) => lg('band-' + k, v)).join('')}
      ${lg('plaque', ['#f1f1ee', '#bfc1c1'])}${lg('panel', ['#2f5b63', '#1f3f46'])}
      <radialGradient id="vignette" cx=".5" cy=".55" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
      <pattern id="noise" width="30" height="30" patternUnits="userSpaceOnUse">${noise}</pattern>
      <pattern id="grain" width="40" height="30" patternUnits="userSpaceOnUse">${grain}</pattern>
      ${Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 20 20" overflow="visible">${v}</symbol>`).join('')}
    </defs></svg>`;
    document.body.insertAdjacentHTML('afterbegin', defs);
  }

  /* ----------------------------------------------------------------- pieces ---- */
  const use = (id, x, y, s) => `<use href="#i-${id}" x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}"/>`;
  const num = (x, y, n, size, fill = '#fff', stroke = '#2d2a26') => `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" dominant-baseline="central" font-family="Georgia, serif" font-weight="700" font-size="${size}" fill="${fill}" stroke="${stroke}" stroke-width="${size / 7}" paint-order="stroke">${n}</text>`;
  const FORMULA = { PER_BROWN_AND_GRAY_CARD: ['BROWN', 'GRAY'], PER_BROWN_CARD: ['BROWN'], PER_GRAY_CARD: ['GRAY'], PER_RED_CARD: ['RED'], PER_GOLD_CARD: ['GOLD'], PER_BLUE_CARD: ['BLUE'], PER_GREEN_CARD: ['GREEN'] };
  const miniCard = (x, y, col) => R(x, y, 9, 13, `url(#band-${col})`, 1.5, 'stroke="#fff" stroke-width=".8"');

  // The row of effect icons in a card's top band, as [width, svg-at-x] pieces so they can be centred
  function effects(c) {
    const items = [], add = (w, draw) => items.push([w, draw]), Y = size => f((31 - size) / 2);
    const alt = { WOOD_OR_CLAY_OR_STONE: ['WOOD', 'CLAY', 'STONE'], GLASS_OR_PAPER: ['GLASS', 'PAPER'] }[c.alt];
    if (alt) add(alt.length * 17 - 2, x => alt.map((r, i) => use(r, x + i * 17, Y(15), 15) + (i ? `<text x="${f(x + i * 17 - 1)}" y="${f(Y(15) + 11)}" font-size="9" font-weight="700" fill="#fff" text-anchor="middle">/</text>` : '')).join(''));
    for (const [r, n] of Object.entries(c.produces || {})) for (let i = 0; i < n; i++) add(21, x => use(r, x, Y(21), 21));
    for (const r of c.trade || []) add(26, x => use(r, x, Y(20) + 1, 20) + use('coin', x + 13, Y(20) - 3, 12) + num(x + 19, Y(20) + 3, 1, 8, '#5a3d0a', 'none'));
    const fc = c.color !== 'WONDER' && (FORMULA[c.coinsFormula] || FORMULA[c.vpFormula]);
    const laurel = (x, n) => use('laurel', x, Y(25), 25) + num(x + 12.5, Y(25) + 13.5, n, 12);
    const coin = (x, n, size = 21) => use('coin', x, Y(size), size) + num(x + size / 2, Y(size) + size / 2 + 0.4, n, size * 0.55, '#5a3d0a', 'none');
    if (c.color === 'PURPLE') {
      if (c.vpFormula === 'PER_WONDER') add(44, x => use('wonderMark', x, Y(18), 18) + laurel(x + 19, c.vp));
      else if (c.vpFormula === 'PER_THREE_COINS') add(44, x => coin(x, 3, 18) + laurel(x + 19, 1));
      else add(50, x => fc.map((col, i) => miniCard(x + i * 4, 8 + i, col)).join('') + coin(x + 10, 1, 14) + laurel(x + 25, 1));
    } else {
      for (let i = 0; i < (c.shields || 0); i++) add(22, x => use('shield', x, Y(22), 22));
      if (c.science && c.science !== 'NONE') add(24, x => use(c.science, x, Y(24), 24));
      if (c.coins && fc) add(26, x => miniCard(x, 9, fc[0]) + coin(x + 8, c.coins, 18));
      else if (c.coins && c.color !== 'PROGRESS_TOKEN') add(22, x => coin(x, c.coins, 22));
      if (c.vp) add(25, x => laurel(x, c.vp));
    }
    return items;
  }

  function costColumn(c, x, y, step, size) {
    const pips = [];
    if (c.coinCost) pips.push(i => use('coin', x, y + i * step, size) + num(x + size / 2, y + i * step + size / 2 + 0.3, c.coinCost, size * 0.6, '#5a3d0a', 'none'));
    for (const [r, n] of Object.entries(c.cost || {})) for (let k = 0; k < n; k++) pips.push(i => use(r, x, y + i * step, size));
    const chainFrom = c.chainFrom && c.chainFrom !== 'NONE' ? c.chainFrom : null;
    if (!pips.length && !chainFrom) return '';
    const h = pips.length * step + (chainFrom ? step + 2 : 0) + 3;
    return R(x - 4, y - 2, size + 6, h, '#fbf7ee', 2.5, 'opacity=".72"') + pips.map((p, i) => p(i)).join('') +
      (chainFrom ? R(x - 0.5, y + pips.length * step + 1, size + 1, size + 1, '#2b2724', 2) + use(chainFrom, x + 1, y + pips.length * step + 2.5, size - 2) : '');
  }

  const plaque = (name, cx, y, w, h) => {
    const size = Math.min(h * 0.62, (w * 1.55) / Math.max(8, name.length));
    return R(cx - w / 2, y, w, h, 'url(#plaque)', h / 2, 'stroke="#8e9090" stroke-width=".4"') +
      `<text x="${cx}" y="${f(y + h / 2 + 0.3)}" text-anchor="middle" dominant-baseline="central" font-family="'Trebuchet MS', 'Gill Sans', sans-serif" font-weight="700" font-size="${f(size)}" letter-spacing=".35" fill="#3d3b39">${esc(name.toUpperCase())}</text>`;
  };

  /* ----------------------------------------------------------------- public ---- */
  const cache = new Map();
  function card(name, c) {
    const key = 'c|' + name;
    if (cache.has(key)) return cache.get(key);
    const scene = (S[name] || (() => sky('day') + temple(50, 128, 60, 40, 5)))();
    const items = effects(c), gap = 2, total = items.reduce((t, [w]) => t + w, 0) + gap * Math.max(0, items.length - 1);
    const chain = c.chain && c.chain !== 'NONE';
    let x = Math.max(4, ((chain ? 84 : 100) - total) / 2);
    const icons = items.map(([w, draw]) => { const s = draw(x); x += w + gap; return s; }).join('');
    const r = rng(hash(name)); let edge = 'M-2 -2 H102 V29'; for (let ex = 100; ex >= 0; ex -= 5) edge += ` L${ex} ${f(30 + r() * 3.5)}`;
    const svg = `<svg viewBox="0 0 100 150" preserveAspectRatio="none">${scene}${vignette()}
      <path d="${edge} Z" fill="url(#band-${c.color})"/><path d="${edge} Z" fill="url(#${c.color === 'BROWN' ? 'grain' : 'noise'})"/>
${icons}${chain ? use(c.chain, 86, 9, 11) : ''}
      ${costColumn(c, 4, 38, 12, 11)}${plaque(name, 50, 136, 84, 10)}</svg>`;
    cache.set(key, svg);
    return svg;
  }

  function wonder(name, c) {
    const key = 'w|' + name;
    if (cache.has(key)) return cache.get(key);
    const scene = (W[name] || (() => sky('day') + temple(80, 90, 100, 40, 8)))();
    const fx = [];
    const alt = { WOOD_OR_CLAY_OR_STONE: ['WOOD', 'CLAY', 'STONE'], GLASS_OR_PAPER: ['GLASS', 'PAPER'] }[c.alt];
    if (alt) fx.push(y => alt.map((r, i) => use(r, 129 + (i % 2) * 12, y + Math.floor(i / 2) * 11, 12)).join(''));
    const b = c.bonuses || [];
    if (b.includes('BURN_BROWN_BUILDING') || b.includes('BURN_GRAY_BUILDING'))
      fx.push(y => R(134, y, 10, 13, `url(#band-${b.includes('BURN_BROWN_BUILDING') ? 'BROWN' : 'GRAY'})`, 1.5, 'stroke="#fff" stroke-width=".7"') + L(132, y + 1, 146, y + 12, '#e0473a', 1.8) + L(146, y + 1, 132, y + 12, '#e0473a', 1.8));
    if (b.includes('DRAW_PROGRESS_TOKEN')) fx.push(y => use('token', 131, y, 16));
    if (b.includes('DRAW_FROM_DISCARDED')) fx.push(y => use('discard', 131, y, 16));
    for (let i = 0; i < c.shields; i++) fx.push(y => use('shield', 131, y, 16));
    if (c.coins) fx.push(y => use('coin', 131, y, 16) + num(139, y + 8.3, c.coins, 8.5, '#5a3d0a', 'none'));
    if (b.includes('BURN_THREE_COINS')) fx.push(y => use('coin', 131, y, 16) + num(139, y + 8.3, '-3', 7, '#b83a2f', 'none'));
    if (c.vp) fx.push(y => use('laurel', 130, y, 18) + num(139, y + 9.8, c.vp, 9.5));
    if (b.includes('EXTRA_TURN')) fx.push(y => use('again', 131, y, 16));
    const step = Math.min(17, 68 / Math.max(1, fx.length));
    const svg = `<svg viewBox="0 0 160 100" preserveAspectRatio="none">${scene}${vignette(160, 100)}
      ${R(126, 4, 30, 92, 'url(#panel)', 5, 'opacity=".86"')}${R(127.5, 5.5, 27, 89, 'none', 4, 'stroke="#8fb3b3" stroke-width=".4" stroke-dasharray="1.2 1"')}
      ${use('wonderMark', 123, 1, 9)}${fx.map((d, i) => d(14 + i * step)).join('')}
      ${costColumn(c, 5, 8, 11.5, 11)}${plaque(name, 70, 86, 96, 10)}</svg>`;
    cache.set(key, svg);
    return svg;
  }

  const TINT = { 1: ['#cf7a42', '#b25f2c'], 2: ['#3aa6d6', '#1f86b6'], 3: ['#a98bc6', '#8a6cae'], G: ['#7a5fb0', '#5d4494'] };
  function back(age) {
    const key = 'b|' + age;
    if (cache.has(key)) return cache.get(key);
    const [a, b] = TINT[age] || TINT[1];
    const svg = `<svg viewBox="0 0 100 150" preserveAspectRatio="none">
      ${R(0, 0, 100, 150, '#231d1b', 9)}<defs>${`<linearGradient id="bk${age}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`}</defs>
      ${R(6, 6, 88, 138, `url(#bk${age})`, 5)}<g opacity=".22">${(backScene[age] || backScene[1])()}</g>${R(6, 6, 88, 138, 'url(#noise)', 5)}
      ${C(50, 146, 12, '#231d1b')}<text x="50" y="140" text-anchor="middle" dominant-baseline="central" font-family="Georgia, serif" font-weight="700" font-size="9" fill="#f3ecde">${age === 'G' ? 'G' : ['', 'I', 'II', 'III'][age]}</text></svg>`;
    cache.set(key, svg);
    return svg;
  }

  window.CardArt = { install, card, wonder, back, icon: (id, size) => `<svg viewBox="0 0 20 20" width="${size}" height="${size}">${use(id, 0, 0, 20)}</svg>` };
})();
