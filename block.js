// Block puzzle: drag shapes onto an 8x8 grid, clear full rows/columns, ends when nothing fits.
const Block = (() => {
  const N = 8, LIFT = 70, boardEl = $('#b-board'), trayEl = $('#b-tray'), overEl = $('#b-over'), undoEl = $('#b-undo');
  let board, tray, score, combo, seed, n, mode, snapStr, undoUsed, over, busy, best0;
  const col = i => ANIMALS[i].c;
  const draw = () => pick(seed, n++);
  const pieceHTML = p => `<div class="piece" style="--w:${p.w};--h:${p.h}">${p.cells.map(([r, c]) =>
    `<i class="cell f" style="--c:${col(p.col)};grid-area:${r + 1}/${c + 1}">${use(p.col)}</i>`).join('')}</div>`;

  function render(clr = []) {
    boardEl.innerHTML = board.map((v, i) => v < 0 ? '<i class="cell"></i>'
      : `<i class="cell f ${clr.includes(i) ? 'clr' : ''}" style="--c:${col(v)}">${use(v)}</i>`).join('');
    trayEl.innerHTML = tray.map((p, i) => `<div class="slot" data-i="${i}">${p ? pieceHTML(p) : ''}</div>`).join('');
    $('#b-score').textContent = score;
    $('#b-best').textContent = store.best.block;
    undoEl.disabled = !snapStr || undoUsed || busy;
  }

  function start(m) {
    mode = m;
    seed = m === 'daily' ? hashStr(dayKey()) : (Math.random() * 2 ** 32) >>> 0;
    n = 0; board = Array(64).fill(-1); score = 0; combo = 0; snapStr = null; undoUsed = false; over = busy = false;
    best0 = store.best.block;
    tray = [draw(), draw(), draw()];
    if (m === 'daily') { store.daily = { date: dayKey(), score: 0 }; save(); }
    overEl.hidden = true;
    show('block'); paintMascot(); render();
    cheer(m === 'daily' ? 'Daily time!' : 'Drag a shape!');
  }

  function place(i, r, c) {
    snapStr = JSON.stringify({ board, tray, score, combo, n });
    const p = tray[i]; tray[i] = null;
    p.cells.forEach(([a, b]) => board[(r + a) * N + c + b] = p.col);
    const { idx, count } = fullLines(board);
    let gain = p.cells.length;
    if (count) { gain += 10 * count * count * (1 + combo); combo++; } else combo = 0;
    score += gain; addScore(gain);
    store.best.block = Math.max(store.best.block, score);
    if (mode === 'daily') store.daily.score = score;
    save(); SFX.place(); buzz(10);
    if (!count) return finish();
    busy = true;
    SFX.clear(count); buzz(20 * count);
    if (count > 1) SFX.meow();
    cheer(['Nice!', 'Purrfect!', 'MEOWVELOUS!'][Math.min(count, 3) - 1] + (combo > 1 ? ` x${combo}` : ''));
    const pop = $('#b-pop'); pop.textContent = '+' + gain; retrigger(pop, 'go');
    idx.forEach(k => { const b = boardEl.children[k].getBoundingClientRect(); burst(b.left + b.width / 2, b.top + b.height / 2, [col(board[k]), '#fff'], 3); });
    render(idx);
    setTimeout(() => { idx.forEach(k => board[k] = -1); busy = false; finish(); }, 300);
  }

  function finish() {
    if (tray.every(p => !p)) tray = [draw(), draw(), draw()];
    render();
    if (!anyFits(board, tray)) end();
  }

  function end() {
    over = true; SFX.over(); buzz([40, 60, 40]);
    setTimeout(() => {
      if (!over) return; // undone meanwhile
      $('#b-final').textContent = score;
      $('#b-msg').textContent = (score > best0 ? '🎉 New best!' : `Best: ${store.best.block}`) + (mode === 'daily' ? ' · daily score locked in' : '');
      overEl.hidden = false;
    }, 600);
  }

  undoEl.onclick = () => {
    if (!snapStr || undoUsed || busy) return;
    ({ board, tray, score, combo, n } = JSON.parse(snapStr));
    undoUsed = true; snapStr = null; over = false; overEl.hidden = true;
    if (mode === 'daily') { store.daily.score = score; save(); }
    render();
  };
  $('#b-again').onclick = () => start(mode === 'daily' ? 'free' : mode); // daily is one try; replay is free play

  // drag a tray piece; the held piece floats LIFT px above the finger so it stays visible
  const ghost = (idx, color) => {
    $$('.g', boardEl).forEach(e => e.classList.remove('g'));
    boardEl.style.setProperty('--gc', color);
    idx.forEach(k => boardEl.children[k].classList.add('g'));
  };
  trayEl.onpointerdown = e => {
    const slot = e.target.closest('.slot'), i = +slot?.dataset.i;
    if (!slot || busy || over || !tray[i]) return;
    e.preventDefault();
    const p = tray[i], fly = document.createElement('div');
    fly.className = 'fly'; fly.innerHTML = pieceHTML(p); document.body.append(fly);
    slot.classList.add('lift');
    trayEl.setPointerCapture(e.pointerId);
    let tgt = null;
    const move = ev => {
      const x = ev.clientX - fly.offsetWidth / 2, y = ev.clientY - fly.offsetHeight / 2 - LIFT;
      fly.style.transform = `translate(${x}px,${y}px)`;
      const a = boardEl.children[0].getBoundingClientRect(), pitch = boardEl.children[1].getBoundingClientRect().left - a.left;
      const c = Math.round((x - a.left) / pitch), r = Math.round((y - a.top) / pitch);
      tgt = fits(board, p.cells, r, c) ? [r, c] : null;
      ghost(tgt ? p.cells.map(([dr, dc]) => (r + dr) * N + c + dc) : [], col(p.col));
    };
    const done = ok => () => {
      trayEl.onpointermove = trayEl.onpointerup = trayEl.onpointercancel = null;
      fly.remove(); slot.classList.remove('lift'); ghost([], '#fff');
      if (ok && tgt) place(i, tgt[0], tgt[1]);
    };
    trayEl.onpointermove = move; trayEl.onpointerup = done(true); trayEl.onpointercancel = done(false);
    move(e);
  };
  return { start };
})();
