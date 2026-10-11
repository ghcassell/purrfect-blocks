// Pure game logic. Loaded as globals in the browser; `node logic.js` runs the self-check.
const SHAPES = ['X', 'XX', 'X/X', 'XXX', 'X/X/X', 'XXXX', 'X/X/X/X', 'XXXXX', 'X/X/X/X/X', 'XX/XX', 'XXX/XXX/XXX', 'XXX/XXX', 'XX/XX/XX',
  'XX/X.', 'XX/.X', 'X./XX', '.X/XX', 'XXX/X../X..', 'XXX/..X/..X', 'X../X../XXX', '..X/..X/XXX',
  'XXX/.X.', '.X./XXX', 'X./XX/X.', '.X/XX/.X', '.XX/XX.', 'XX./.XX', '.X/XX/X.', 'X./XX/.X'].map(s => {
  const rows = s.split('/'), cells = [];
  rows.forEach((row, r) => [...row].forEach((ch, c) => ch === 'X' && cells.push([r, c])));
  return { cells, h: rows.length, w: rows[0].length };
});

// Stateless mulberry32 step: same (seed, n) always gives the same value, so undo can't change the daily sequence.
function rnd(seed, n) {
  let a = (seed + Math.imul(n, 0x9E3779B1)) | 0;
  a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function hashStr(s) {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function pick(seed, n) {
  const v = rnd(seed, n) * SHAPES.length;
  return { ...SHAPES[v | 0], col: ((v % 1) * 7) | 0 };
}

// Block board: flat array of 64, -1 = empty, else colour index.
const fits = (b, cells, r, c) => cells.every(([a, d]) => {
  const y = r + a, x = c + d;
  return y >= 0 && y < 8 && x >= 0 && x < 8 && b[y * 8 + x] < 0;
});
const anyFits = (b, ps) => ps.some(p => p && b.some((_, i) => fits(b, p.cells, i >> 3, i & 7)));
function fullLines(b) {
  const out = new Set(); let count = 0;
  for (let i = 0; i < 8; i++) {
    const row = [...Array(8)].map((_, k) => i * 8 + k), col = [...Array(8)].map((_, k) => k * 8 + i);
    if (row.every(k => b[k] >= 0)) { count++; row.forEach(k => out.add(k)); }
    if (col.every(k => b[k] >= 0)) { count++; col.forEach(k => out.add(k)); }
  }
  return { idx: [...out], count };
}

// Merge: `l` = tile levels in a line, nearest the destination edge first. Returns groups of source indices.
function slideLine(l, max) {
  const g = [];
  for (let i = 0; i < l.length; i++) {
    if (l[i] === l[i + 1] && l[i] < max) { g.push([i, i + 1]); i++; } else g.push([i]);
  }
  return g;
}
const canMerge = (g, max) => g.some((row, r) => row.some((v, c) =>
  v < 0 || (v < max && (v === row[c + 1] || (g[r + 1] && v === g[r + 1][c])))));

if (typeof module !== 'undefined') {
  module.exports = { pick, fits, anyFits, fullLines, slideLine, canMerge, SHAPES, hashStr };
  if (require.main === module) {
    const assert = require('assert');
    assert.deepStrictEqual(slideLine([0, 0, 0], 9), [[0, 1], [2]]);
    assert.deepStrictEqual(slideLine([1, 1, 1, 1], 9), [[0, 1], [2, 3]]);
    assert.deepStrictEqual(slideLine([9, 9], 9), [[0], [1]]);
    assert.deepStrictEqual(slideLine([0, 1], 9), [[0], [1]]);
    const b = Array(64).fill(-1);
    assert(fits(b, [[0, 0], [0, 1]], 0, 6) && !fits(b, [[0, 0], [0, 1]], 0, 7));
    for (let k = 0; k < 8; k++) { b[k] = 0; b[k * 8] = 0; }       // row 0 + col 0 full
    const fl = fullLines(b);
    assert.strictEqual(fl.count, 2); assert.strictEqual(fl.idx.length, 15);
    assert(!anyFits(Array(64).fill(1), [{ cells: [[0, 0]] }]));
    assert.deepStrictEqual(pick(5, 3), pick(5, 3));
    assert(canMerge([[0, 1], [2, 3]].map(r => r), 9) === false);
    assert(canMerge([[0, 0], [2, 3]], 9) && canMerge([[-1, 1], [2, 3]], 9));
    console.log('logic ok');
  }
}
