// Merge animals: 2048-style swipe on a 5x5 grid. Ends when the board is full and nothing can merge.
const Merge = (() => {
  const N = 5, MAX = ANIMALS.length - 1, boardEl = $('#m-board'), overEl = $('#m-over'), sec = $('#merge');
  let tiles, grid, score, uid, over, won, best0, tilesEl;
  const els = new Map();
  const tin = l => `<div class="tin" style="--c:${ANIMALS[l].c}">${use(l)}</div>`;

  function put(t, fresh) {
    let e = els.get(t.id);
    if (!e) {
      e = document.createElement('div'); e.className = 'tile'; e.innerHTML = tin(t.lvl);
      tilesEl.append(e); els.set(t.id, e);
      if (fresh) retrigger(e.firstChild, 'pop');
    }
    e.style.transform = `translate(${t.c * 100}%,${t.r * 100}%)`;
    return e;
  }
  function spawn() {
    const free = [];
    grid.forEach((row, r) => row.forEach((t, c) => t || free.push([r, c])));
    const [r, c] = free[Math.random() * free.length | 0];
    const t = { id: uid++, lvl: Math.random() < .85 ? 0 : 1, r, c };
    tiles.push(t); grid[r][c] = t; put(t, true);
  }
  const hud = () => { $('#m-score').textContent = score; $('#m-best').textContent = store.best.merge; };

  function start() {
    boardEl.innerHTML = `<div class="bgrid">${'<i class="cell"></i>'.repeat(N * N)}</div><div class="tiles"></div>`;
    tilesEl = boardEl.lastChild; els.clear();
    tiles = []; grid = Array.from({ length: N }, () => Array(N).fill(null));
    score = 0; uid = 0; over = won = false; best0 = store.best.merge;
    overEl.hidden = true;
    spawn(); spawn(); hud(); show('merge'); paintMascot(); cheer('Swipe!');
  }

  function move(d) {
    if (over) return;
    // pos(i,k): k-th slot of line i counted from the edge the tiles slide toward
    const pos = (i, k) => d === 'L' ? [i, k] : d === 'R' ? [i, N - 1 - k] : d === 'U' ? [k, i] : [N - 1 - k, i];
    const ng = Array.from({ length: N }, () => Array(N).fill(null));
    let moved = false, gain = 0, top = -1;
    for (let i = 0; i < N; i++) {
      const line = [];
      for (let k = 0; k < N; k++) { const [r, c] = pos(i, k); if (grid[r][c]) line.push(grid[r][c]); }
      slideLine(line.map(t => t.lvl), MAX).forEach((g, k) => {
        const [r, c] = pos(i, k), t = line[g[0]];
        if (t.r !== r || t.c !== c) moved = true;
        t.r = r; t.c = c; ng[r][c] = t;
        if (g.length > 1) {
          const b = line[g[1]];
          b.r = r; b.c = c; b.dead = true;
          t.lvl++; t.merged = true; moved = true; gain += 10 * 2 ** (t.lvl + 1); top = Math.max(top, t.lvl);
        }
      });
    }
    if (!moved) return;
    grid = ng;
    const dead = tiles.filter(t => t.dead);
    tiles = tiles.filter(t => !t.dead);
    dead.forEach(t => { const e = put(t); els.delete(t.id); setTimeout(() => e.remove(), 130); });
    const b = boardEl.getBoundingClientRect();
    tiles.forEach(t => {
      const e = put(t);
      if (!t.merged) return;
      t.merged = false; e.innerHTML = tin(t.lvl); retrigger(e.firstChild, 'pop');
      burst(b.left + (t.c + .5) * b.width / N, b.top + (t.r + .5) * b.height / N, [ANIMALS[t.lvl].c, '#fff'], 6);
    });
    spawn();
    if (gain) {
      score += gain; addScore(gain);
      store.best.merge = Math.max(store.best.merge, score); save();
      SFX.merge(top); buzz(12);
      if (top >= 3) cheer(`You made a ${ANIMALS[top].n}!`);
      if (top === MAX && !won) { won = true; toast('👑 Lion King! Keep going!'); SFX.meow(); }
    } else SFX.place();
    hud();
    if (!canMerge(grid.map(row => row.map(t => t ? t.lvl : -1)), MAX)) end();
  }

  function end() {
    over = true; SFX.over(); buzz([40, 60, 40]);
    setTimeout(() => {
      $('#m-final').textContent = score;
      $('#m-msg').textContent = score > best0 ? '🎉 New best!' : `Best: ${store.best.merge}`;
      overEl.hidden = false;
    }, 600);
  }

  $('#m-again').onclick = start;
  let p0;
  sec.addEventListener('pointerdown', e => { p0 = e.target.closest('button') ? null : [e.clientX, e.clientY]; });
  sec.addEventListener('pointerup', e => {
    if (!p0) return;
    const dx = e.clientX - p0[0], dy = e.clientY - p0[1]; p0 = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'));
  });
  addEventListener('keydown', e => { const d = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D' }[e.key]; if (d && !sec.hidden) move(d); });
  return { start };
})();
