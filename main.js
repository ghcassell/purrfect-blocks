// Shared: sprites, storage, sound, particles, navigation, hub, collection.
const $ = (s, e = document) => e.querySelector(s), $$ = (s, e = document) => [...e.querySelectorAll(s)];

const ANIMALS = [
  { n: 'Mouse', c: '#b8a6ff', e: 'round' },
  { n: 'Bunny', c: '#ff8fc0', e: 'long' },
  { n: 'Kitten', c: '#ffb44d', e: 'point' },
  { n: 'Puppy', c: '#5cc8ff', e: 'round' },
  { n: 'Fox', c: '#ff7a59', e: 'point' },
  { n: 'Panda', c: '#4fd69c', e: 'round', panda: 1 },
  { n: 'Bear', c: '#b98a63', e: 'round' },
  { n: 'Tiger', c: '#f5c518', e: 'point', stripes: 1 },
  { n: 'Lion', c: '#ff9142', e: 'mane' },
  { n: 'Lion King', c: '#ff4d6d', e: 'mane', crown: 1 },
];
const VIVID = ['#8a5cff', '#ff2d9b', '#ff9500', '#00b7ff', '#ff3b1f', '#00e07a', '#c2571a', '#ffe000', '#ff6a00', '#ff0044']; // saturated block colours
const BASE = ANIMALS.map(a => a.c);
const UNLOCK = [0, 300, 800, 1500, 3000, 5000, 8000, 12000, 18000, 25000]; // cumulative points per animal
const THEMES = [{ id: 'candy', n: 'Candy', at: 0 }, { id: 'mint', n: 'Mint', at: 0 }, { id: 'night', n: 'Night', at: 0 }, { id: 'neon', n: 'Neon', at: 0 }, { id: 'sunset', n: 'Sunset', at: 0 }, { id: 'jungle', n: 'Jungle', at: 0 }];

// ---- sprites: one <symbol> per animal, drawn with shapes ----
const D = '#3b2a4a', P = '#ffb3c7';
const sym = (a, i) => {
  const f = a.panda ? D : '#fff', mane = a.e === 'mane';
  const ears = {
    point: `<path d="M16 44L20 6L50 26zM84 44L80 6L50 26z" fill="#fff"/><path d="M24 36L25 16L40 27zM76 36L75 16L60 27z" fill="${P}"/>`,
    round: `<circle cx="24" cy="26" r="15" fill="${f}"/><circle cx="76" cy="26" r="15" fill="${f}"/>`,
    long: `<ellipse cx="34" cy="20" rx="10" ry="24" fill="#fff"/><ellipse cx="66" cy="20" rx="10" ry="24" fill="#fff"/><ellipse cx="34" cy="22" rx="5" ry="16" fill="${P}"/><ellipse cx="66" cy="22" rx="5" ry="16" fill="${P}"/>`,
    mane: `<circle cx="50" cy="55" r="46" fill="#ffb347"/><circle cx="32" cy="30" r="10" fill="#fff"/><circle cx="68" cy="30" r="10" fill="#fff"/>`,
  }[a.e];
  const eye = a.panda ? 3.5 : 4.5, ec = a.panda ? '#fff' : D;
  return `<symbol id="a${i}" viewBox="0 0 100 100">${ears}<circle cx="50" cy="${mane ? 56 : 58}" r="${mane ? 30 : 34}" fill="#fff"/>`
    + (a.panda ? `<ellipse cx="37" cy="54" rx="9" ry="11" fill="${D}" transform="rotate(20 37 54)"/><ellipse cx="63" cy="54" rx="9" ry="11" fill="${D}" transform="rotate(-20 63 54)"/>` : '')
    + (a.stripes ? `<path d="M50 28v10M40 31l3 8M60 31l-3 8" stroke="${D}" stroke-width="4" stroke-linecap="round"/>` : '')
    + `<circle cx="38" cy="54" r="${eye}" fill="${ec}"/><circle cx="62" cy="54" r="${eye}" fill="${ec}"/>`
    + `<circle cx="30" cy="64" r="5" fill="${P}" opacity=".7"/><circle cx="70" cy="64" r="5" fill="${P}" opacity=".7"/>`
    + `<ellipse cx="50" cy="62" rx="4" ry="3" fill="#ff7a9c"/><path d="M43 68Q50 75 57 68" stroke="${D}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
    + (a.crown ? `<path d="M30 26L34 6L44 18L50 4L56 18L66 6L70 26z" fill="#ffd23f" stroke="#e0a800" stroke-width="2"/>` : '')
    + `</symbol>`;
};
document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute">${ANIMALS.map(sym).join('')}</svg>`);
const use = i => `<svg viewBox="0 0 100 100"><use href="#a${i}"/></svg>`;

// ---- storage ----
const store = { best: { block: 0, merge: 0 }, total: 0, theme: 'candy', mascot: 2, mute: true, daily: null, streak: { last: '', n: 0 } };
try { Object.assign(store, JSON.parse(localStorage.pb)); } catch { }
const save = () => { try { localStorage.pb = JSON.stringify(store); } catch { } };
const dayKey = (d = new Date()) => d.toLocaleDateString('en-CA'); // local YYYY-MM-DD
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
const streakNow = () => [dayKey(), yesterday()].includes(store.streak.last) ? store.streak.n : 0;
const unlockables = () => [...ANIMALS.map((a, i) => ({ name: a.n, at: UNLOCK[i] })), ...THEMES.map(t => ({ name: t.n + ' theme', at: t.at }))];

function addScore(n) {
  const before = store.total;
  store.total += n;
  const today = dayKey();
  if (store.streak.last !== today) { store.streak.n = store.streak.last === yesterday() ? store.streak.n + 1 : 1; store.streak.last = today; }
  unlockables().filter(u => before < u.at && store.total >= u.at).forEach(u => { toast(`🎉 Unlocked ${u.name}!`); SFX.meow(); });
  save();
}

// ---- sound (Web Audio, no files) & haptics ----
let ac;
function tone(f, at = 0, dur = .12, type = 'sine', vol = .12, f2 = f) {
  if (store.mute) return;
  ac ||= new (window.AudioContext || webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
}
const PENTA = [523, 587, 659, 784, 880, 1047];
const SFX = {
  place: () => tone(330, 0, .08, 'triangle'),
  clear: n => { for (let i = 0; i < Math.min(n + 2, 6); i++) tone(PENTA[i], i * .06, .15, 'triangle'); },
  merge: l => tone(300 + l * 60, 0, .14, 'sine', .15, 520 + l * 80),
  meow: () => { tone(750, 0, .3, 'sawtooth', .04, 480); tone(900, .02, .3, 'sine', .05, 520); },
  over: () => tone(400, 0, .5, 'triangle', .12, 150),
};
const buzz = ms => navigator.vibrate?.(ms);

// ---- particles ----
const cv = $('#fx'), cx = cv.getContext('2d');
let ps = [], raf = 0;
const fit = () => { cv.width = innerWidth; cv.height = innerHeight; };
fit(); addEventListener('resize', fit);
function burst(x, y, colors, n = 8) {
  for (let i = 0; i < n; i++) ps.push({ x, y, vx: (Math.random() - .5) * 10, vy: -Math.random() * 9 - 2, s: 4 + Math.random() * 6, life: 1, c: colors[i % colors.length] });
  raf ||= requestAnimationFrame(loop);
}
function loop() {
  cx.clearRect(0, 0, cv.width, cv.height);
  ps = ps.filter(p => (p.life -= .02) > 0);
  ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .35; cx.globalAlpha = p.life; cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.s, p.s); });
  raf = ps.length ? requestAnimationFrame(loop) : 0;
}

// ---- ui helpers ----
const retrigger = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const toast = t => { const e = $('#toast'); e.textContent = t; retrigger(e, 'show'); };
const cheer = t => $$('.bubble').forEach(b => { b.textContent = t; retrigger(b, 'say'); }) || $$('.mascot').forEach(m => retrigger(m, 'jump'));
function paintMascot() { $$('.mascot').forEach(m => { m.innerHTML = use(store.mascot); m.style.setProperty('--c', ANIMALS[store.mascot].c); }); }
function paintSound() { $$('.snd').forEach(b => b.textContent = store.mute ? '🔇' : '🔊'); }
function applyTheme() {
  document.body.dataset.theme = store.theme;
  const vivid = ['neon', 'sunset', 'jungle'].includes(store.theme);
  ANIMALS.forEach((a, i) => a.c = vivid ? VIVID[i] : BASE[i]);
  paintMascot();
}

function show(id) {
  $$('.screen').forEach(s => s.hidden = s.id !== id);
  if (id === 'hub') hub();
  if (id === 'collection') collection();
}

function hub() {
  const t = dayKey(), done = store.daily?.date === t;
  $('#best-b').textContent = store.best.block;
  $('#best-m').textContent = store.best.merge;
  $('#go-daily').disabled = done;
  $('#daily-sub').textContent = done ? `Today: ${store.daily.score} ✓ come back tomorrow` : 'Same puzzle for everyone · one try';
  $('#streak').textContent = `🔥 ${streakNow()} day${streakNow() === 1 ? '' : 's'}`;
  $('#coll-sub').textContent = `${UNLOCK.filter(u => store.total >= u).length}/${ANIMALS.length} animals`;
  paintMascot();
}

function collection() {
  $('#coll-total').textContent = store.total;
  $('#coll-grid').innerHTML = ANIMALS.map((a, i) => {
    const ok = store.total >= UNLOCK[i];
    return `<button class="card ${ok ? '' : 'lock'} ${store.mascot === i ? 'sel' : ''}" data-i="${i}" style="--c:${a.c}">${use(i)}<small>${ok ? a.n : '🔒 ' + UNLOCK[i]}</small></button>`;
  }).join('');
  $('#theme-row').innerHTML = THEMES.map(t => {
    const ok = store.total >= t.at;
    return `<button class="btn ${store.theme === t.id ? 'main' : ''}" data-t="${t.id}" ${ok ? '' : 'disabled'}>${ok ? t.n : '🔒 ' + t.at}</button>`;
  }).join('');
}

document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) return show(go.dataset.go);
  const card = e.target.closest('.card:not(.lock)');
  if (card) { store.mascot = +card.dataset.i; save(); paintMascot(); collection(); SFX.meow(); cheer('Hi!'); return; }
  const th = e.target.closest('[data-t]');
  if (th) { store.theme = th.dataset.t; save(); applyTheme(); collection(); return; }
  if (e.target.closest('.snd')) {
    store.mute = !store.mute; save(); paintSound(); SFX.meow();
  }
});
$('#go-daily').onclick = () => Block.start('daily');
$('#go-block').onclick = () => Block.start('free');
$('#go-merge').onclick = () => Merge.start();

let installEv;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; $('#install').hidden = false; });
$('#install').onclick = async () => { installEv.prompt(); await installEv.userChoice; $('#install').hidden = true; };
navigator.serviceWorker?.register('sw.js');

applyTheme(); paintSound(); show('hub');
