// Hibi: Notebooks in School › Study. Handwritten notes with Apple Pencil, and lecture recordings synced to what you wrote.
'use strict';
/* =========================================================
   Notebooks
   ========================================================= */
Object.assign(TAB_INFO, {knb:{g:'knotes', t:'Notebooks'}});
GROUPS.knotes = ['kstudy', 'knb', 'knotes'];

const NB_W = 1000, NB_H = 1414;   // page size in page units (A4 shape). Strokes are saved in these units.
const NB_PAPERS = [['blank', 'Blank'], ['lined', 'Lined'], ['grid', 'Grid'], ['dots', 'Dots'], ['cornell', 'Cornell']];
const NB_PC = {white:['#FFFFFF', '#C9D6EA', '#F2A7B5'], cream:['#FBF6E9', '#D9CDB0', '#E9A99B'], dark:['#1E1F24', '#3A3D47', '#7A4652']};
const NB_COVERS = ['#F0467F', '#8B6CFF', '#2B5BD7', '#16A9A3', '#2E9E5B', '#F2A541', '#E8590C', '#5E6B78'];
const NB_INK = ['#1F1F1F', '#2457D6', '#E03131', '#2B9348', '#7048E8', '#F08C00', '#E64980', '#FFFFFF'];
const NB_HL = ['#FFE066', '#8CE99A', '#FAA2C1', '#A5D8FF', '#FFC078'];
const NB_PW = [2.5, 4, 7], NB_HW = [16, 24, 36];
const nbUid = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function normalizeNb(s) {
  if (!s.nb || typeof s.nb !== 'object') s.nb = {};
  const N = s.nb;
  if (!Array.isArray(N.books)) N.books = [];
  N.books.forEach(b => { if (!Array.isArray(b.pages) || !b.pages.length) b.pages = [nbUid()]; if (!Array.isArray(b.recs)) b.recs = [];
    if (!NB_PAPERS.some(p => p[0] === b.paper)) b.paper = 'lined'; if (!NB_PC[b.pc]) b.pc = 'white'; if (!b.color) b.color = NB_COVERS[0]; });
  if (!N.opt || typeof N.opt !== 'object') N.opt = {};
  const O = N.opt;
  if (typeof O.finger !== 'boolean') O.finger = false;
  if (typeof O.tr !== 'boolean') O.tr = true;
  if (!['pen', 'hl', 'erase', 'lasso'].includes(O.tool)) O.tool = 'pen';
  if (!O.pc) O.pc = NB_INK[0]; if (!O.hc) O.hc = NB_HL[0];
  if (!(O.pw > 0)) O.pw = NB_PW[1]; if (!(O.hw > 0)) O.hw = NB_HW[1];
  if (!N.st || typeof N.st !== 'object') N.st = {};
  if (typeof N.st.strokes !== 'number') N.st.strokes = 0; if (typeof N.st.recMs !== 'number') N.st.recMs = 0;
}
const nbBook = id => S.nb.books.find(b => b.id === id);
const nbTime = ms => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + pad(m) : m) + ':' + pad(s % 60); };

/* ----- Storage: pages and recordings live in IndexedDB ----- */
const PAGES = new Map();   // page id -> {id, strokes, bg, v}
const pageGet = id => sdo('nb', 'readonly', s => s.get(id)).then(p => p || {id, strokes:[], bg:'', v:0}).catch(() => ({id, strokes:[], bg:'', v:0}));
const pagePut = p => sdo('nb', 'readwrite', s => s.put(p));
const recParts = id => sdo('rec', 'readonly', s => s.getAll(IDBKeyRange.bound(id + '#', id + '#￿')));
const recDel = id => sdo('rec', 'readwrite', s => s.delete(IDBKeyRange.bound(id + '#', id + '#￿')));
async function recBlob(r) { const L = (await recParts(r.id)).sort((a, b) => a.n - b.n); return new Blob(L.map(x => x.buf), {type:(r.mime || 'audio/mp4').split(';')[0]}); }
const recExt = r => /webm/.test(r.mime || '') ? 'webm' : 'm4a';
const saveTimers = {};
function pageSave(p) { clearTimeout(saveTimers[p.id]); saveTimers[p.id] = setTimeout(() => { p.v = (p.v || 0) + 1; pagePut(p).catch(() => toast("Couldn't save this page. Is your iPad full?")); }, 600);
  const b = nbBook(UI.nb); if (b) { b.updated = Date.now(); saveRaw(); try { dbxSchedule(); } catch (e) {} } }
try { if (navigator.storage && navigator.storage.persist) setTimeout(() => { if (S.nb.books.length) navigator.storage.persist().catch(() => {}); }, 3000); } catch (e) {}

/* ----- Drawing ----- */
const IMG = new Map();   // page id -> loaded background Image
function bgImg(p, done) {
  if (!p.bg) return null; let im = IMG.get(p.id);
  if (im && im.src === p.bg) return im.complete ? im : null;
  im = new Image(); im.onload = () => done && done(); im.src = p.bg; IMG.set(p.id, im); return null;
}
function paper(ctx, k, b) {
  const [bg, line, margin] = NB_PC[b.pc], W = NB_W * k, H = NB_H * k;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = line; ctx.fillStyle = line; ctx.lineWidth = Math.max(1, k * 1.2);
  const gap = 38 * k;
  if (b.paper === 'lined' || b.paper === 'cornell') { ctx.beginPath(); for (let y = 120 * k; y < H - 20 * k; y += gap) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke(); }
  if (b.paper === 'lined') { ctx.strokeStyle = margin; ctx.beginPath(); ctx.moveTo(110 * k, 0); ctx.lineTo(110 * k, H); ctx.stroke(); }
  if (b.paper === 'grid') { ctx.beginPath(); for (let x = gap; x < W; x += gap) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = gap; y < H; y += gap) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke(); }
  if (b.paper === 'dots') for (let x = gap; x < W; x += gap) for (let y = gap; y < H; y += gap) { ctx.beginPath(); ctx.arc(x, y, Math.max(1, 1.6 * k), 0, 7); ctx.fill(); }
  if (b.paper === 'cornell') { ctx.strokeStyle = margin; ctx.lineWidth = Math.max(1.5, k * 2); ctx.beginPath(); ctx.moveTo(280 * k, 90 * k); ctx.lineTo(280 * k, 1130 * k); ctx.moveTo(0, 1130 * k); ctx.lineTo(W, 1130 * k); ctx.moveTo(0, 90 * k); ctx.lineTo(W, 90 * k); ctx.stroke();
    ctx.fillStyle = margin; ctx.font = `700 ${Math.round(22 * k)}px system-ui,sans-serif`; ctx.fillText('Cues', 20 * k, 122 * k); ctx.fillText('Notes', 300 * k, 122 * k); ctx.fillText('Summary', 20 * k, 1165 * k); }
}
// Dark paper flips black ink to white so it stays readable
const inkOn = (c, b) => b.pc === 'dark' && c.toUpperCase() === '#1F1F1F' ? '#F1F1F1' : b.pc !== 'dark' && c.toUpperCase() === '#FFFFFF' ? '#1F1F1F' : c;
function drawStroke(ctx, s, k, b, alpha) {
  const P = s.pts, n = P.length / 3; if (!n) return;
  ctx.save(); ctx.globalAlpha = (s.tool === 'hl' ? .38 : 1) * (alpha == null ? 1 : alpha);
  ctx.strokeStyle = ctx.fillStyle = s.tool === 'hl' ? s.c : inkOn(s.c, b); ctx.lineCap = s.tool === 'hl' ? 'butt' : 'round'; ctx.lineJoin = 'round';
  if (n === 1) { ctx.beginPath(); ctx.arc(P[0] * k, P[1] * k, s.w * k * (s.tool === 'hl' ? .5 : .5 + P[2] * .5), 0, 7); ctx.fill(); ctx.restore(); return; }
  if (s.tool === 'hl') {
    ctx.lineWidth = s.w * k; ctx.beginPath(); ctx.moveTo(P[0] * k, P[1] * k);
    for (let i = 1; i < n - 1; i++) { const x = P[i * 3], y = P[i * 3 + 1], nx = P[i * 3 + 3], ny = P[i * 3 + 4]; ctx.quadraticCurveTo(x * k, y * k, (x + nx) / 2 * k, (y + ny) / 2 * k); }
    ctx.lineTo(P[(n - 1) * 3] * k, P[(n - 1) * 3 + 1] * k); ctx.stroke();
  } else {
    let px = P[0], py = P[1];
    for (let i = 1; i < n; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], pr = (P[i * 3 - 1] + P[i * 3 + 2]) / 2, mx = i < n - 1 ? (x + P[i * 3 + 3]) / 2 : x, my = i < n - 1 ? (y + P[i * 3 + 4]) / 2 : y;
      ctx.lineWidth = Math.max(.6, s.w * (.45 + pr * .85)) * k; ctx.beginPath(); ctx.moveTo(px * k, py * k); ctx.quadraticCurveTo(x * k, y * k, mx * k, my * k); ctx.stroke(); px = mx; py = my;
    }
  }
  ctx.restore();
}
function paintTo(ctx, k, b, p, onImg) {
  paper(ctx, k, b);
  const im = bgImg(p, onImg); if (im) { const h = NB_W * im.height / im.width; ctx.drawImage(im, 0, 0, NB_W * k, Math.min(NB_H, h) * k); }
  const dim = s => PLAY && PLAY.dim && s.r === PLAY.recId && s.t > PLAY.ms ? .16 : 1;
  p.strokes.forEach(s => { if (s.tool === 'hl') drawStroke(ctx, s, k, b, dim(s)); });
  p.strokes.forEach(s => { if (s.tool !== 'hl') drawStroke(ctx, s, k, b, dim(s)); });
}
function paintPage(el) {
  const b = nbBook(UI.nb), p = PAGES.get(el.dataset.pid); if (!b || !p) return;
  const cv = el.querySelector('.nb-base'), lv = el.querySelector('.nb-live'), r = el.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr); if (!W) return;
  if (cv.width !== W || cv.height !== H) { cv.width = lv.width = W; cv.height = lv.height = H; }
  paintTo(cv.getContext('2d'), W / NB_W, b, p, () => paintPage(el));
  el.dataset.on = '1';
}
const repaintAll = () => $$('.nb-page[data-on="1"]').forEach(paintPage);

/* ----- The editor (a full-screen layer above the app, so it doesn't redraw while you write) ----- */
let NB = null;   // {book, undo:[], redo:[], io, sel}
function nbOpen(id) {
  const b = nbBook(id); if (!b) return;
  UI.nb = id; NB = {undo:[], redo:[], sel:null}; document.body.classList.add('nb-open');
  let root = $('#nbRoot'); if (!root) { root = document.createElement('div'); root.id = 'nbRoot'; document.body.appendChild(root); }
  root.innerHTML = nbShell(b); nbBar(); nbRecBar();
  Promise.all(b.pages.map(pageGet)).then(L => { L.forEach(p => PAGES.set(p.id, p)); nbPagesDraw(); });
}
function nbClose() {
  if (NB && NB.io) NB.io.disconnect();
  Object.keys(saveTimers).forEach(k => { clearTimeout(saveTimers[k]); const p = PAGES.get(k); if (p) { p.v = (p.v || 0) + 1; pagePut(p).catch(() => {}); } delete saveTimers[k]; });
  playStop(); UI.nb = null; NB = null; const r = $('#nbRoot'); if (r) r.innerHTML = '';
  document.body.classList.remove('nb-open'); save(); render(); recPill();
}
const nbShell = b => `<div class="nb-wrap${S.nb.opt.finger ? ' finger' : ''}" id="nb">
  <div class="nb-bar" id="nbBar"></div>
  <div class="nb-scroll" id="nbScroll"><div class="nb-pages" id="nbPages"></div>
    <button class="btn ghost nb-add" data-act="nbAddPage">＋ Add page</button><p class="nb-tip">Write with Apple Pencil. Scroll with your finger. Hold at the end of a line to straighten it.</p></div>
  <div class="nb-rec" id="nbRec"></div><div class="nb-sel" id="nbSel" hidden></div><div id="nbPop"></div>
  <input type="file" accept="image/*" id="nbPhoto" hidden></div>`;
function nbBar() {
  const b = nbBook(UI.nb), O = S.nb.opt, el = $('#nbBar'); if (!b || !el) return;
  const tool = (t, ic, l) => `<button class="nbt${O.tool === t ? ' on' : ''}" data-act="nbTool" data-t="${t}" aria-label="${l}" title="${l}">${ic}</button>`;
  const cols = O.tool === 'hl' ? NB_HL : NB_INK, cur = O.tool === 'hl' ? O.hc : O.pc, sizes = O.tool === 'hl' ? NB_HW : NB_PW, cw = O.tool === 'hl' ? O.hw : O.pw;
  el.innerHTML = `<button class="nbt" data-act="nbClose" aria-label="Back to notebooks">‹</button><b class="nb-title">${esc(b.name)}</b>
    <span class="nb-grp"><button class="nbt" data-act="nbUndo" aria-label="Undo"${NB.undo.length ? '' : ' disabled'}>↶</button><button class="nbt" data-act="nbRedo" aria-label="Redo"${NB.redo.length ? '' : ' disabled'}>↷</button></span>
    <span class="nb-grp">${tool('pen', '✒️', 'Pen')}${tool('hl', '🖍️', 'Highlighter')}${tool('erase', '🧽', 'Eraser')}${tool('lasso', '➰', 'Lasso: select and move')}${b.recs.length ? tool('play', '🔊', 'Tap writing to hear that moment') : ''}</span>
    ${O.tool === 'pen' || O.tool === 'hl' ? `<span class="nb-grp">${cols.map(c => `<button class="nbc${c.toUpperCase() === cur.toUpperCase() ? ' on' : ''}" style="background:${c}" data-act="nbColor" data-c="${c}" aria-label="Color ${c}"></button>`).join('')}
      <label class="nbc any" aria-label="Any color"><input type="color" id="nbAnyColor" value="${esc(cur)}"></label></span>
      <span class="nb-grp">${sizes.map((w, i) => `<button class="nbs${w === cw ? ' on' : ''}" data-act="nbSize" data-w="${w}" aria-label="Size ${i + 1}"><i style="width:${6 + i * 5}px;height:${6 + i * 5}px"></i></button>`).join('')}</span>` : ''}
    <span class="nb-grp nb-end">${REC && REC.bookId === b.id ? `<button class="nbt rec on" data-act="nbRecStop" aria-label="Stop recording">■ <span id="nbRecT">${nbTime(recMs())}</span></button><button class="nbt" data-act="nbRecPause" aria-label="${REC.pausedAt ? 'Resume' : 'Pause'} recording">${REC.pausedAt ? '▶' : '⏸'}</button>`
      : `<button class="nbt rec" data-act="nbRecStart" aria-label="Record lecture" title="Record lecture"${REC ? ' disabled' : ''}>🎙️</button>`}
      ${b.recs.length ? `<button class="nbt" data-act="nbRecList" aria-label="Recordings">🎧<sup>${b.recs.length}</sup></button>` : ''}<button class="nbt" data-act="nbMenu" aria-label="More">⋯</button></span>`;
  const ac = $('#nbAnyColor'); if (ac) ac.onchange = () => { if (O.tool === 'hl') O.hc = ac.value; else O.pc = ac.value; saveRaw(); nbBar(); };
}
function nbPagesDraw() {
  const b = nbBook(UI.nb), box = $('#nbPages'); if (!b || !box) return;
  if (NB.io) NB.io.disconnect();
  box.innerHTML = b.pages.map((id, i) => `<div class="nb-page" data-pid="${esc(id)}"><canvas class="nb-base"></canvas><canvas class="nb-live"></canvas><span class="nb-pno">${i + 1} / ${b.pages.length}</span></div>`).join('');
  NB.io = new IntersectionObserver(es => es.forEach(e => { const el = e.target;
    if (e.isIntersecting) paintPage(el); else if (el.dataset.on === '1') { el.dataset.on = ''; el.querySelectorAll('canvas').forEach(c => { c.width = c.height = 1; }); } }),
    {root:$('#nbScroll'), rootMargin:'120% 0px'});
  $$('.nb-page', box).forEach(el => NB.io.observe(el));
}
const curPage = () => { const L = $$('.nb-page'), mid = innerHeight / 2; let best = L[0], d = 1e9; L.forEach(el => { const r = el.getBoundingClientRect(), dd = Math.abs((r.top + r.bottom) / 2 - mid); if (dd < d) { d = dd; best = el; } }); return best; };
function pushUndo(p) { NB.undo.push({pid:p.id, prev:p.strokes.slice()}); if (NB.undo.length > 80) NB.undo.shift(); NB.redo = []; nbBar(); }

/* ----- Pencil input ----- */
{
  let st = null, holdT = 0;
  const pt = (el, e) => { const r = el.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * NB_W, (e.clientY - r.top) / r.height * NB_H, e.pointerType === 'pen' ? (e.pressure || .5) : .5]; };
  const live = el => { const c = el.querySelector('.nb-live'), x = c.getContext('2d'); return {c, x, k:c.width / NB_W}; };
  const allowed = e => e.pointerType === 'pen' || e.pointerType === 'mouse' || (e.pointerType === 'touch' && (S.nb.opt.finger || S.nb.opt.tool === 'play'));
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest && e.target.closest('.nb-page'); if (!el || !NB) return;
    if (!allowed(e) || e.button > 0) return;
    const p = PAGES.get(el.dataset.pid); if (!p) return;
    e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) {}
    const O = S.nb.opt, a = pt(el, e), L = live(el);
    if (O.tool === 'play') { nbSeekAt(p, a); return; }
    if (O.tool === 'lasso' && NB.sel && NB.sel.pid === p.id && inBox(a, NB.sel.box)) { st = {el, p, mode:'move', last:a, id:e.pointerId}; pushUndo(p); return; }
    if (NB.sel) selClear();
    if (O.tool === 'erase') { st = {el, p, mode:'erase', id:e.pointerId, did:false}; pushUndo(p); if (eraseAt(p, a, el)) st.did = true; return; }
    if (O.tool === 'lasso') { st = {el, p, mode:'lasso', poly:[a[0], a[1]], id:e.pointerId, L}; return; }
    const s = {tool:O.tool === 'hl' ? 'hl' : 'pen', c:O.tool === 'hl' ? O.hc : O.pc, w:O.tool === 'hl' ? O.hw : O.pw, pts:[r1n(a[0]), r1n(a[1]), Math.round(a[2] * 100) / 100]};
    if (REC && REC.bookId === UI.nb) { s.r = REC.id; s.t = Math.round(recMs()); }
    st = {el, p, mode:'draw', s, id:e.pointerId, L, straight:false, at:a};
    if (s.tool === 'pen') { drawDot(L, s, nbBook(UI.nb)); }
    holdArm();
  }, {passive:false});
  const r1n = v => Math.round(v * 10) / 10;
  function holdArm() { clearTimeout(holdT); holdT = setTimeout(() => { if (!st || st.mode !== 'draw' || st.s.pts.length < 18) return;
    const P = st.s.pts, n = P.length / 3, last = [P[(n - 1) * 3], P[(n - 1) * 3 + 1], P[(n - 1) * 3 + 2]];
    st.s.pts = [P[0], P[1], P[2], ...last]; st.straight = true; haptic('tick'); redrawLive(); }, 550); }
  function drawDot(L, s, b) { L.x.clearRect(0, 0, L.c.width, L.c.height); drawStroke(L.x, s, L.k, b); }
  function redrawLive() { const b = nbBook(UI.nb); st.L.x.clearRect(0, 0, st.L.c.width, st.L.c.height); drawStroke(st.L.x, st.s, st.L.k, b); }
  document.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.id) return; e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e], el = st.el;
    if (st.mode === 'draw') {
      const b = nbBook(UI.nb), P = st.s.pts;
      for (const ev of (evs.length ? evs : [e])) { const a = pt(el, ev);
        if (st.straight) { P.splice(3, 3, r1n(a[0]), r1n(a[1]), Math.round(a[2] * 100) / 100); continue; }
        const lx = P[P.length - 3], ly = P[P.length - 2]; if (Math.hypot(a[0] - lx, a[1] - ly) < .8) continue;
        P.push(r1n(a[0]), r1n(a[1]), Math.round(a[2] * 100) / 100);
        if (Math.hypot(a[0] - st.at[0], a[1] - st.at[1]) > 6) { st.at = a; holdArm(); } }
      if (st.straight || st.s.tool === 'hl') redrawLive();
      else { const n = P.length / 3; if (n >= 2) { const x = st.L.x, k = st.L.k; x.save(); x.strokeStyle = inkOn(st.s.c, b); x.lineCap = x.lineJoin = 'round';
        for (let i = Math.max(1, n - evs.length - 1); i < n; i++) { x.lineWidth = Math.max(.6, st.s.w * (.45 + (P[i * 3 - 1] + P[i * 3 + 2]) / 2 * .85)) * k; x.beginPath(); x.moveTo(P[i * 3 - 3] * k, P[i * 3 - 2] * k); x.lineTo(P[i * 3] * k, P[i * 3 + 1] * k); x.stroke(); }
        x.restore(); } }
    } else if (st.mode === 'erase') { for (const ev of (evs.length ? evs : [e])) if (eraseAt(st.p, pt(el, ev), el)) st.did = true; }
    else if (st.mode === 'lasso') { const a = pt(el, e); st.poly.push(a[0], a[1]); lassoDraw(st.L, st.poly); }
    else if (st.mode === 'move') { const a = pt(el, e), dx = a[0] - st.last[0], dy = a[1] - st.last[1]; st.last = a; moveSel(st.p, dx, dy); paintPage(el); selDraw(); }
  }, {passive:false});
  const end = e => {
    if (!st || (e && e.pointerId !== st.id)) return; clearTimeout(holdT);
    const s = st; st = null;
    if (s.mode === 'draw') { pushUndo(s.p); s.p.strokes.push(s.s); S.nb.st.strokes++; s.L.x.clearRect(0, 0, s.L.c.width, s.L.c.height);
      const b = nbBook(UI.nb), k = s.el.querySelector('.nb-base').width / NB_W; if (s.s.tool === 'hl') paintPage(s.el); else drawStroke(s.el.querySelector('.nb-base').getContext('2d'), s.s, k, b); pageSave(s.p); }
    else if (s.mode === 'erase') { if (s.did) pageSave(s.p); else NB.undo.pop(); nbBar(); }
    else if (s.mode === 'lasso') { s.L.x.clearRect(0, 0, s.L.c.width, s.L.c.height); selMake(s.p, s.poly, s.el); }
    else if (s.mode === 'move') pageSave(s.p);
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  // Keep Apple Pencil from scrolling the page or selecting text; fingers still scroll
  document.addEventListener('touchstart', e => { if (UI.nb && e.target.closest && e.target.closest('.nb-page') && [...e.touches].some(t => t.touchType === 'stylus')) e.preventDefault(); }, {passive:false});
  document.addEventListener('touchmove', e => { if (UI.nb && (st || [...e.touches].some(t => t.touchType === 'stylus'))) e.preventDefault(); }, {passive:false});
}
const distSeg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
function hitStroke(s, x, y, r) {
  const P = s.pts, n = P.length / 3, rr = r + s.w / 2;
  if (n === 1) return Math.hypot(P[0] - x, P[1] - y) < rr;
  for (let i = 1; i < n; i++) if (distSeg(x, y, P[i * 3 - 3], P[i * 3 - 2], P[i * 3], P[i * 3 + 1]) < rr) return true;
  return false;
}
function eraseAt(p, a, el) {
  const before = p.strokes.length; p.strokes = p.strokes.filter(s => !hitStroke(s, a[0], a[1], 10));
  if (p.strokes.length !== before) { paintPage(el); haptic('tick'); return true; }
  return false;
}

/* ----- Lasso ----- */
function lassoDraw(L, poly) { L.x.clearRect(0, 0, L.c.width, L.c.height); L.x.save(); L.x.setLineDash([8, 6]); L.x.strokeStyle = '#7048E8'; L.x.lineWidth = 2; L.x.beginPath();
  for (let i = 0; i < poly.length; i += 2) L.x[i ? 'lineTo' : 'moveTo'](poly[i] * L.k, poly[i + 1] * L.k); L.x.closePath(); L.x.stroke(); L.x.fillStyle = 'rgba(112,72,232,.06)'; L.x.fill(); L.x.restore(); }
function inPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) { const xi = P[i], yi = P[i + 1], xj = P[j], yj = P[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
const inBox = (a, B) => a[0] >= B[0] - 12 && a[0] <= B[2] + 12 && a[1] >= B[1] - 12 && a[1] <= B[3] + 12;
function selBox(p, ids) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; p.strokes.forEach((s, i) => { if (!ids.has(s)) return; for (let j = 0; j < s.pts.length; j += 3) { x0 = Math.min(x0, s.pts[j]); x1 = Math.max(x1, s.pts[j]); y0 = Math.min(y0, s.pts[j + 1]); y1 = Math.max(y1, s.pts[j + 1]); } }); return [x0, y0, x1, y1]; }
function selMake(p, poly, el) {
  if (poly.length < 6) return;
  const pick = new Set(p.strokes.filter(s => { let n = 0, t = 0; for (let j = 0; j < s.pts.length; j += 3) { t++; if (inPoly(s.pts[j], s.pts[j + 1], poly)) n++; } return n / t >= .5; }));
  if (!pick.size) return;
  NB.sel = {pid:p.id, set:pick, box:selBox(p, pick), el}; selDraw(); haptic('tick');
  const m = $('#nbSel'); m.hidden = false;
  m.innerHTML = `<span>${plural(pick.size, 'stroke')} selected</span><button class="btn sm ghost" data-act="nbSelColor">Recolor</button><button class="btn sm ghost" data-act="nbSelDel">Delete</button><button class="btn sm" data-act="nbSelDone">Done</button>`;
}
function selDraw() { const S2 = NB && NB.sel; if (!S2) return; const L = S2.el.querySelector('.nb-live'), x = L.getContext('2d'), k = L.width / NB_W, B = S2.box;
  x.clearRect(0, 0, L.width, L.height); x.save(); x.setLineDash([8, 6]); x.strokeStyle = '#7048E8'; x.lineWidth = 2; x.strokeRect((B[0] - 10) * k, (B[1] - 10) * k, (B[2] - B[0] + 20) * k, (B[3] - B[1] + 20) * k); x.restore(); }
function moveSel(p, dx, dy) {
  const S2 = NB.sel, next = new Set();
  p.strokes = p.strokes.map(s => { if (!S2.set.has(s)) return s; const n = Object.assign({}, s, {pts:s.pts.map((v, i) => i % 3 === 0 ? Math.round((v + dx) * 10) / 10 : i % 3 === 1 ? Math.round((v + dy) * 10) / 10 : v)}); next.add(n); return n; });
  S2.set = next; S2.box = [S2.box[0] + dx, S2.box[1] + dy, S2.box[2] + dx, S2.box[3] + dy];
}
function selClear() { if (!NB || !NB.sel) return; const L = NB.sel.el.querySelector('.nb-live'); L.getContext('2d').clearRect(0, 0, L.width, L.height); NB.sel = null; const m = $('#nbSel'); if (m) m.hidden = true; }

/* ----- Lecture recording ----- */
let REC = null;
const recMs = () => REC ? (REC.pausedAt || Date.now()) - REC.start - REC.pausedMs : 0;
async function recStart() {
  const b = nbBook(UI.nb); if (!b || REC) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { toast("Recording isn't available on this device."); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:true, autoGainControl:true}}); }
  catch (e) { toast(e && e.name === 'NotAllowedError' ? 'Hibi needs the microphone. Allow it when asked, or in Settings › Safari › Microphone.' : "Couldn't start the microphone."); return; }
  const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
  let mr; try { mr = new MediaRecorder(stream, Object.assign({audioBitsPerSecond:64000}, mime ? {mimeType:mime} : {})); } catch (e) { mr = new MediaRecorder(stream); }
  const id = 'r' + Date.now();
  REC = {bookId:b.id, id, mr, stream, n:0, start:Date.now(), pausedMs:0, pausedAt:0, tr:[], interim:'', mime:mr.mimeType || mime || 'audio/mp4', saving:Promise.resolve()};
  mr.ondataavailable = e => { if (!e.data || !e.data.size || !REC) return; const R = REC, n = R.n++;
    R.saving = R.saving.then(() => e.data.arrayBuffer()).then(buf => sdo('rec', 'readwrite', s => s.put({k:id + '#' + String(n).padStart(5, '0'), id, n, buf}))).catch(() => { R.saveErr = true; }); };
  mr.onstop = () => recFinish();
  mr.start(4000);
  try { if (navigator.wakeLock) REC.wake = await navigator.wakeLock.request('screen'); } catch (e) {}
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  trStart(); nbBar(); nbRecBar(); haptic();
  toast('Recording. Keep Hibi open and your screen on until class ends.');
}
function recPause() {
  const R = REC; if (!R) return;
  if (R.pausedAt) { R.pausedMs += Date.now() - R.pausedAt; R.pausedAt = 0; try { R.mr.resume(); } catch (e) {} trStart(); }
  else { R.pausedAt = Date.now(); try { R.mr.pause(); } catch (e) {} try { R.sr && R.sr.stop(); } catch (e) {} }
  nbBar(); nbRecBar();
}
function recStop() { const R = REC; if (!R) return; R.stopping = true; try { if (R.mr.state !== 'inactive') R.mr.stop(); else recFinish(); } catch (e) { recFinish(); } }
async function recFinish() {
  const R = REC; if (!R || R.done) return; R.done = true;
  const dur = Math.max(0, (R.pausedAt || Date.now()) - R.start - R.pausedMs);
  try { R.sr && (R.srOff = true, R.sr.stop()); } catch (e) {}
  if (R.interim) R.tr.push([dur, R.interim.trim()]);
  R.stream.getTracks().forEach(t => t.stop());
  try { R.wake && R.wake.release(); } catch (e) {}
  await R.saving;
  const b = nbBook(R.bookId);
  if (b && R.n) { b.recs.push({id:R.id, at:R.start, dur, mime:R.mime, tr:R.tr.filter(x => x[1])}); S.nb.st.recMs += dur; b.updated = Date.now(); }
  REC = null; save(); checkBadges();
  toast(R.n ? `Saved ${nbTime(dur)} of audio${R.tr.length ? ' with a transcript' : ''}.${R.stopping ? '' : ' Recording stopped when Hibi left the screen.'}` : "Nothing was recorded.");
  if (UI.nb) { nbBar(); nbRecBar(); } recPill(); if (!UI.nb && S.tab === 'knb') render();
}
// Live transcript with the speech recognition built into Safari. If it isn't available, the audio still records.
function trStart() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, R = REC;
  if (!SR || !R || !S.nb.opt.tr || R.trOff) return;
  try {
    const sr = new SR(); sr.continuous = true; sr.interimResults = true; sr.lang = navigator.language || 'en-US';
    sr.onresult = e => { if (REC !== R) return; let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) { const x = e.results[i]; if (x.isFinal) { const t = x[0].transcript.trim(); if (t) R.tr.push([Math.round(recMs()), t]); } else interim += x[0].transcript; }
      R.interim = interim; trShow(); };
    sr.onerror = ev => { R.trErr = (R.trErr || 0) + 1;
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(ev.error) || (ev.error !== 'no-speech' && ev.error !== 'aborted' && R.trErr >= 4)) { R.trOff = true; trShow("Live transcript isn't available right now. The audio is still recording."); } };
    sr.onend = () => { if (REC === R && !R.pausedAt && !R.trOff && !R.srOff && R.sr === sr) setTimeout(() => { try { sr.start(); } catch (e) {} }, 300); };
    R.sr = sr; sr.start();
  } catch (e) { R.trOff = true; }
}
function trShow(msg) { const el = $('#nbTr'); if (!el || !REC) return; const L = REC.tr.slice(-2).map(x => x[1]).join(' '); el.textContent = msg || (L + (REC.interim ? ' ' + REC.interim : '')).slice(-220) || 'Listening…'; }
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !REC) return;
  try { if (navigator.wakeLock && (!REC.wake || REC.wake.released)) REC.wake = await navigator.wakeLock.request('screen'); } catch (e) {}
  if (REC && REC.mr.state === 'inactive') recFinish();
  else if (REC && !REC.pausedAt && !REC.trOff) { try { REC.sr && REC.sr.start(); } catch (e) {} }
});
// A small red pill on every screen while recording, so you can leave the notebook and come back
function recPill() {
  let el = $('#recPill');
  if (!REC || UI.nb) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('button'); el.id = 'recPill'; el.className = 'rec-pill'; el.dataset.act = 'nbBackToRec'; document.body.appendChild(el); }
  el.innerHTML = `<i></i>${REC.pausedAt ? 'Paused' : 'Recording'} <b>${nbTime(recMs())}</b>`;
}
setInterval(() => { if (!REC) return; const t = $('#nbRecT'); if (t) t.textContent = nbTime(recMs()); recPill(); }, 1000);

/* ----- Playback, synced with the writing ----- */
let PLAY = null;   // {bookId, recId, audio, url, ms, dim}
function nbRecBar() {
  const el = $('#nbRec'), b = nbBook(UI.nb); if (!el || !b) return;
  if (REC && REC.bookId === b.id) { el.className = 'nb-rec on'; el.innerHTML = `<span class="rec-dot${REC.pausedAt ? ' paused' : ''}"></span><div class="nb-trline" id="nbTr">${REC.pausedAt ? 'Paused' : 'Listening…'}</div>`; trShow(); return; }
  if (!PLAY || PLAY.bookId !== b.id) { el.className = 'nb-rec'; el.innerHTML = ''; return; }
  const r = b.recs.find(x => x.id === PLAY.recId); if (!r) { el.innerHTML = ''; return; }
  const a = PLAY.audio, d = a && isFinite(a.duration) ? a.duration * 1000 : r.dur;
  el.className = 'nb-rec on play';
  el.innerHTML = `<button class="nbt" data-act="nbPlayToggle" aria-label="${a && !a.paused ? 'Pause' : 'Play'}">${a && !a.paused ? '⏸' : '▶'}</button>
    <button class="nbt sm" data-act="nbSkip" data-s="-15" aria-label="Back 15 seconds">−15</button><button class="nbt sm" data-act="nbSkip" data-s="15" aria-label="Forward 15 seconds">+15</button>
    <input type="range" id="nbSeek" min="0" max="${Math.round(d)}" value="${Math.round(PLAY.ms)}" aria-label="Position"><span class="nb-time" id="nbPT">${nbTime(PLAY.ms)} / ${nbTime(d)}</span>
    <button class="nbt sm" data-act="nbSpeed">${(a && a.playbackRate) || 1}×</button><button class="nbt sm${PLAY.dim ? ' on' : ''}" data-act="nbDim" title="Fade what you hadn't written yet">✍️</button><button class="nbt sm" data-act="nbPlayClose" aria-label="Close player">✕</button>`;
  const sk = $('#nbSeek'); if (sk) sk.oninput = () => { if (PLAY && PLAY.audio) { PLAY.audio.currentTime = sk.value / 1000; } };
}
async function playRec(r) {
  playStop(); const b = nbBook(UI.nb); if (!b) return;
  const blob = await recBlob(r); if (!blob.size) { toast("This recording's audio isn't on this device."); return; }
  const url = URL.createObjectURL(blob), audio = new Audio(url); audio.preload = 'auto';
  PLAY = {bookId:b.id, recId:r.id, audio, url, ms:0, dim:true};
  let last = 0;
  audio.ontimeupdate = () => { if (!PLAY) return; PLAY.ms = audio.currentTime * 1000; const sk = $('#nbSeek'), t = $('#nbPT');
    if (sk && document.activeElement !== sk) sk.value = Math.round(PLAY.ms); if (t) t.textContent = `${nbTime(PLAY.ms)} / ${nbTime(isFinite(audio.duration) ? audio.duration * 1000 : r.dur)}`;
    if (PLAY.dim && Date.now() - last > 250) { last = Date.now(); repaintAll(); } };
  audio.onplay = audio.onpause = () => nbRecBar(); audio.onended = () => { nbRecBar(); };
  audio.onloadedmetadata = () => nbRecBar();
  nbRecBar(); repaintAll(); try { await audio.play(); } catch (e) {} nbBar();
}
function playStop() { if (!PLAY) return; try { PLAY.audio.pause(); } catch (e) {} URL.revokeObjectURL(PLAY.url); PLAY = null; if (UI.nb) { repaintAll(); nbRecBar(); } }
function nbSeekAt(p, a) {
  const b = nbBook(UI.nb), hits = p.strokes.filter(s => s.r && hitStroke(s, a[0], a[1], 18));
  if (!hits.length) { toast('Tap something you wrote during a recording.'); return; }
  const s = hits[hits.length - 1], r = b.recs.find(x => x.id === s.r); if (!r) return;
  const go2 = () => { PLAY.audio.currentTime = Math.max(0, s.t / 1000 - 2); PLAY.audio.play().catch(() => {}); };
  if (PLAY && PLAY.recId === r.id) go2(); else playRec(r).then(() => { if (PLAY) go2(); });
}

/* ----- Exports: PDF, page image, audio, transcript ----- */
function pdfFromJpegs(imgs) {
  const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
  const push = b => { if (typeof b === 'string') b = enc.encode(b); parts.push(b); len += b.length; };
  const obj = (id, fn) => { offs[id] = len; push(`${id} 0 obj\n`); fn(); push('\nendobj\n'); };
  push('%PDF-1.4\n');
  const n = imgs.length;
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Kids [${imgs.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${n} >>`));
  imgs.forEach((im, i) => { const p = 3 + i * 3, W = 595, H = Math.round(595 * im.h / im.w), cs = `q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`;
    obj(p, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`));
    obj(p + 1, () => { push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`); });
    obj(p + 2, () => { push(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`); push(im.bytes); push('\nendstream'); }); });
  const xref = len, total = 3 + n * 3;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`); for (let i = 1; i < total; i++) push(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, {type:'application/pdf'});
}
async function pageJpeg(b, p, w) {
  const k = w / NB_W, c = document.createElement('canvas'); c.width = w; c.height = Math.round(NB_H * k);
  if (p.bg) await new Promise(ok => { const im = bgImg(p, ok); if (im) ok(); setTimeout(ok, 3000); });
  const was = PLAY; PLAY = null; paintTo(c.getContext('2d'), k, b, p); PLAY = was;
  const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', .86));
  return {w:c.width, h:c.height, bytes:new Uint8Array(await blob.arrayBuffer()), blob};
}
function shareFile(blob, name, type) {
  const file = new File([blob], name, {type:type || blob.type});
  if (navigator.canShare && navigator.canShare({files:[file]})) return navigator.share({files:[file]}).catch(() => {});
  let framed = true; try { framed = window.top !== window; } catch (e) {}
  if (framed) { toast('Saving files works in the Hibi app on your Home Screen.'); return; }
  const u = URL.createObjectURL(file), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 8000); toast(`Saved ${name}.`);
}
const safeName = s => String(s || 'Notebook').replace(/[^\w\- ]+/g, '').trim() || 'Notebook';
async function nbPdf(b) {
  toast('Making your PDF…'); const imgs = [];
  for (const id of b.pages) { const p = PAGES.get(id) || await pageGet(id); imgs.push(await pageJpeg(b, p, 1240)); }
  shareFile(pdfFromJpegs(imgs), `${safeName(b.name)}.pdf`, 'application/pdf');
}
const trText = (b, r) => `${b.name}\nRecorded ${new Date(r.at).toLocaleString()} (${nbTime(r.dur)})\n\n` + (r.tr && r.tr.length ? r.tr.map(([t, x]) => `[${nbTime(t)}] ${x}`).join('\n') : '(No transcript was made for this recording.)') + '\n';

/* ----- Notebook list (School › Study › Notebooks) ----- */
function viewKNb() {
  const L = [...S.nb.books].sort((a, b) => (b.updated || b.created || 0) - (a.updated || a.created || 0)), ed = UI.nbEdit && nbBook(UI.nbEdit);
  const recMin = Math.round(S.nb.st.recMs / 6e4);
  return `${REC ? `<section class="card" style="border-color:var(--danger)"><div class="row"><span><b style="color:var(--danger)">● Recording</b> in ${esc((nbBook(REC.bookId) || {}).name || 'a notebook')}</span><button class="btn sm" data-act="nbBackToRec">Open</button></div></section>` : ''}
    ${L.length ? `<div class="nbgrid">${L.map(b => { const c = kClass(b.c);
      return `<button class="nbcover" data-act="nbOpen" data-id="${esc(b.id)}" style="--cv:${esc(b.color)}"><span class="nbspine"></span><b>${esc(b.name)}</b>
        <span class="small">${c ? esc(c.name) + ' · ' : ''}${plural(b.pages.length, 'page')}${b.recs.length ? ` · 🎙️ ${b.recs.length}` : ''}</span><span class="small nbwhen">${esc(fmtMD(new Date(b.updated || b.created)))}</span></button>`; }).join('')}</div>`
      : emptyCard('No notebooks yet', 'Make one for each class. Write with Apple Pencil and record lectures right inside it.')}
    ${L.length ? `<details class="card" ${det('nbManage')}><summary class="sum"><h2>Manage notebooks</h2><span class="small muted">Rename, export, recordings, delete${recMin ? ` · ${plural(recMin, 'minute')} recorded` : ''}</span></summary>
      ${L.map(b => `<div class="nbrow"><div><b>${esc(b.name)}</b><span class="small muted">${plural(b.pages.length, 'page')}${b.recs.length ? ` · ${plural(b.recs.length, 'recording')}` : ''}</span></div>
        <span><button class="link" data-act="nbEditMeta" data-id="${esc(b.id)}">Edit</button> <button class="link" data-act="nbPdfBtn" data-id="${esc(b.id)}">PDF</button> <button class="link danger" data-act="nbDelBook" data-id="${esc(b.id)}" data-confirm>Delete</button></span></div>
        ${b.recs.map(r => `<div class="nbrec"><span>🎙️ ${esc(new Date(r.at).toLocaleDateString(undefined, {month:'short', day:'numeric'}))}, ${esc(new Date(r.at).toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}))} · ${nbTime(r.dur)}${r.tr && r.tr.length ? ' · transcript' : ''}</span>
          <span><button class="link" data-act="nbRecShare" data-b="${esc(b.id)}" data-id="${esc(r.id)}">Audio</button> <button class="link" data-act="nbTrShare" data-b="${esc(b.id)}" data-id="${esc(r.id)}">Transcript</button> <button class="link danger" data-act="nbRecDel" data-b="${esc(b.id)}" data-id="${esc(r.id)}" data-confirm>✕</button></span></div>`).join('')}`).join('')}
      <p class="note">Send a lecture's transcript (or the PDF of your notes) to Claude and ask for clean notes or a flashcard file. Drawings and recordings back up to Dropbox, not the backup file.</p></details>` : ''}
    <details class="card" ${det('nbNew', !L.length || !!ed)}><summary class="sum"><h2>${ed ? 'Edit ' + esc(ed.name) : 'New notebook'}</h2></summary>
      <form data-form="nbbook" class="stack">
        <div class="ff"><label>Name<input class="input" name="name" placeholder="Like DC Circuits" value="${esc(ed ? ed.name : '')}"></label><label>Class<select class="input" name="c">${kClassOpts(ed ? ed.c : '')}</select></label></div>
        <span class="label">Paper</span><div class="chips">${NB_PAPERS.map(([k, l]) => `<label class="emo"><input type="radio" name="paper" value="${k}"${(ed ? ed.paper : 'lined') === k ? ' checked' : ''}><span style="width:auto;padding:0 12px;font-size:14px;font-weight:700">${l}</span></label>`).join('')}</div>
        <span class="label">Paper color</span><div class="chips">${[['white', 'White'], ['cream', 'Cream'], ['dark', 'Dark']].map(([k, l]) => `<label class="emo"><input type="radio" name="pc" value="${k}"${(ed ? ed.pc : 'white') === k ? ' checked' : ''}><span style="width:auto;padding:0 12px;font-size:14px;font-weight:700">${l}</span></label>`).join('')}</div>
        <span class="label">Cover</span><div class="chips">${NB_COVERS.map((c, i) => `<label class="emo"><input type="radio" name="color" value="${c}"${(ed ? ed.color : NB_COVERS[L.length % NB_COVERS.length]) === c ? ' checked' : ''}><span><i style="display:block;width:22px;height:22px;border-radius:6px;background:${c}"></i></span></label>`).join('')}</div>
        <div class="btns"><button class="btn" type="submit">${ed ? 'Save' : 'Make notebook'}</button>${ed ? '<button class="btn ghost" type="button" data-act="nbEditCancel">Cancel</button>' : ''}</div></form></details>`;
}

/* ----- The ⋯ menu and the recordings list inside the editor ----- */
function nbPop(html) { const el = $('#nbPop'); if (!el) return; el.innerHTML = html ? `<div class="nb-popbg" data-act="nbPopClose"></div><div class="nb-popin">${html}</div>` : ''; }
function nbMenu() {
  const b = nbBook(UI.nb), O = S.nb.opt;
  nbPop(`<div class="row"><h2>Notebook</h2><button class="link" data-act="nbPopClose">Done</button></div>
    <span class="label">Paper</span><div class="chips">${NB_PAPERS.map(([k, l]) => chip(l, b.paper === k, `data-act="nbPaper" data-k="${k}"`)).join('')}</div>
    <span class="label">Paper color</span><div class="chips">${[['white', 'White'], ['cream', 'Cream'], ['dark', 'Dark']].map(([k, l]) => chip(l, b.pc === k, `data-act="nbPc" data-k="${k}"`)).join('')}</div>
    <span class="label">This page</span><div class="btns"><button class="btn sm ghost" data-act="nbPhotoPage">📷 Add a photo or slide page</button><button class="btn sm ghost" data-act="nbPagePng">🖼️ Save page as image</button><button class="btn sm ghost" data-act="nbDelPage" data-confirm>🗑 Delete page</button></div>
    <span class="label">Settings</span>
    ${fxSwitch('nbFinger', O.finger, 'Draw with finger', 'Off: only Apple Pencil writes, and your finger scrolls. This is how your palm gets ignored.')}
    ${fxSwitch('nbTrOpt', O.tr, 'Live transcript while recording', (window.SpeechRecognition || window.webkitSpeechRecognition) ? 'Uses the speech recognition built into your iPad. It writes down what it hears as the audio records.' : "This browser doesn't offer speech recognition, so recordings are audio only.")}
    <div class="btns mt"><button class="btn" style="flex:1" data-act="nbPdfBtn" data-id="${esc(b.id)}">📄 Export notebook as PDF</button></div>`);
}
function nbRecList() {
  const b = nbBook(UI.nb);
  nbPop(`<div class="row"><h2>Recordings</h2><button class="link" data-act="nbPopClose">Done</button></div>
    ${b.recs.slice().reverse().map(r => `<div class="nbrec big"><div><b>${esc(new Date(r.at).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'}))}, ${esc(new Date(r.at).toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}))}</b><span class="small muted">${nbTime(r.dur)}${r.tr && r.tr.length ? ` · ${plural(r.tr.length, 'transcript line')}` : ' · no transcript'}</span></div>
      <div class="btns"><button class="btn sm" data-act="nbPlay" data-id="${esc(r.id)}">▶ Play</button><button class="btn sm ghost" data-act="nbRecShare" data-b="${esc(b.id)}" data-id="${esc(r.id)}">Audio</button><button class="btn sm ghost" data-act="nbTrShare" data-b="${esc(b.id)}" data-id="${esc(r.id)}">Transcript</button><button class="btn sm ghost" data-act="nbTrCopy" data-b="${esc(b.id)}" data-id="${esc(r.id)}">Copy text</button></div>
      ${r.tr && r.tr.length ? `<details><summary class="link">Read transcript</summary><div class="nbtr">${r.tr.map(([t, x]) => `<button class="nbtrl" data-act="nbTrSeek" data-id="${esc(r.id)}" data-t="${t}"><i>${nbTime(t)}</i> ${esc(x)}</button>`).join('')}</div></details>` : ''}</div>`).join('')}
    <p class="note">While a recording plays, tap 🔊 and then anything you wrote to jump to that moment. ✍️ fades out what you hadn't written yet.</p>`);
}

/* ----- Actions ----- */
const nbRec = (bid, id) => { const b = nbBook(bid); return b && b.recs.find(r => r.id === id); };
Object.assign(XVIEWS, {knb:viewKNb});
Object.assign(FORM_KEY, {nbbook:'nbNew'});
Object.assign(XACT, {
  nbOpen: d => { nbOpen(d.id); return false; },
  nbBackToRec: () => { if (!REC) return false; if (UI.nb !== REC.bookId) { if (UI.nb) nbClose(); nbOpen(REC.bookId); } recPill(); return false; },
  nbClose: () => { selClear(); nbClose(); return false; },
  nbTool: d => { S.nb.opt.tool = d.t; selClear(); saveRaw(); nbBar(); if (d.t === 'play' && !PLAY) { const b = nbBook(UI.nb), r = b.recs[b.recs.length - 1]; if (r) playRec(r); } return false; },
  nbColor: d => { const O = S.nb.opt; if (O.tool === 'hl') O.hc = d.c; else O.pc = d.c; saveRaw(); nbBar(); return false; },
  nbSize: d => { const O = S.nb.opt; if (O.tool === 'hl') O.hw = +d.w; else O.pw = +d.w; saveRaw(); nbBar(); return false; },
  nbUndo: () => { const u = NB.undo.pop(), p = u && PAGES.get(u.pid); if (!p) return false; NB.redo.push({pid:p.id, prev:p.strokes}); p.strokes = u.prev; selClear(); repaintAll(); pageSave(p); nbBar(); return false; },
  nbRedo: () => { const u = NB.redo.pop(), p = u && PAGES.get(u.pid); if (!p) return false; NB.undo.push({pid:p.id, prev:p.strokes}); p.strokes = u.prev; repaintAll(); pageSave(p); nbBar(); return false; },
  nbAddPage: () => { const b = nbBook(UI.nb), id = nbUid(); b.pages.push(id); PAGES.set(id, {id, strokes:[], bg:'', v:0}); save(); nbPagesDraw(); setTimeout(() => { const el = $$('.nb-page').pop(); if (el) el.scrollIntoView({behavior:'smooth', block:'start'}); }, 80); return false; },
  nbMenu: () => { nbMenu(); return false; },
  nbPopClose: () => { nbPop(''); return false; },
  nbPaper: d => { nbBook(UI.nb).paper = d.k; save(); repaintAll(); nbMenu(); return false; },
  nbPc: d => { nbBook(UI.nb).pc = d.k; save(); repaintAll(); nbMenu(); return false; },
  nbFinger: () => { S.nb.opt.finger = !S.nb.opt.finger; saveRaw(); $('#nb').classList.toggle('finger', S.nb.opt.finger); nbMenu(); return false; },
  nbTrOpt: () => { S.nb.opt.tr = !S.nb.opt.tr; saveRaw(); nbMenu(); return false; },
  nbDelPage: () => { const b = nbBook(UI.nb), el = curPage(); if (!el) return false; if (b.pages.length === 1) { const p = PAGES.get(el.dataset.pid); pushUndo(p); p.strokes = []; p.bg = ''; pageSave(p); repaintAll(); nbPop(''); return false; }
    const id = el.dataset.pid; b.pages = b.pages.filter(x => x !== id); sdo('nb', 'readwrite', s => s.delete(id)).catch(() => {}); PAGES.delete(id); NB.undo = NB.undo.filter(u => u.pid !== id); save(); nbPagesDraw(); nbPop(''); toast('Page deleted.'); return false; },
  nbPhotoPage: () => { const f = $('#nbPhoto'); f.onchange = () => { const file = f.files && f.files[0]; f.value = ''; if (!file) return; const fr = new FileReader();
      fr.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1400 / im.width), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        const b = nbBook(UI.nb), id = nbUid(), el = curPage(), at = el ? b.pages.indexOf(el.dataset.pid) + 1 : b.pages.length; b.pages.splice(at, 0, id);
        const p = {id, strokes:[], bg:c.toDataURL('image/jpeg', .82), v:0}; PAGES.set(id, p); pageSave(p); save(); nbPagesDraw(); nbPop(''); setTimeout(() => { const x = $(`.nb-page[data-pid="${id}"]`); if (x) x.scrollIntoView({block:'start'}); }, 80); toast('Photo page added. Write right on it.'); }; im.src = fr.result; };
      fr.readAsDataURL(file); }; f.click(); return false; },
  nbPagePng: () => { const b = nbBook(UI.nb), el = curPage(), p = el && PAGES.get(el.dataset.pid); if (!p) return false; pageJpeg(b, p, 1600).then(x => shareFile(x.blob, `${safeName(b.name)} page ${b.pages.indexOf(p.id) + 1}.jpg`, 'image/jpeg')); return false; },
  nbPdfBtn: d => { const b = nbBook(d.id); if (!b) return false; if (UI.nb) nbPop(''); nbPdf(b); return false; },
  nbSelDel: () => { const s = NB.sel, p = s && PAGES.get(s.pid); if (!p) return false; pushUndo(p); p.strokes = p.strokes.filter(x => !s.set.has(x)); const el = s.el; selClear(); paintPage(el); pageSave(p); return false; },
  nbSelColor: () => { const s = NB.sel, p = s && PAGES.get(s.pid); if (!p) return false; pushUndo(p); const c = S.nb.opt.pc, next = new Set();
    p.strokes = p.strokes.map(x => { if (!s.set.has(x)) return x; const n = Object.assign({}, x, {c:x.tool === 'hl' ? S.nb.opt.hc : c}); next.add(n); return n; }); s.set = next; paintPage(s.el); selDraw(); pageSave(p); return false; },
  nbSelDone: () => { selClear(); return false; },
  nbRecStart: () => { recStart(); return false; },
  nbRecStop: () => { recStop(); return false; },
  nbRecPause: () => { recPause(); return false; },
  nbRecList: () => { nbRecList(); return false; },
  nbPlay: d => { const r = nbRec(UI.nb, d.id); if (r) playRec(r); nbPop(''); return false; },
  nbPlayToggle: () => { if (!PLAY) return false; if (PLAY.audio.paused) PLAY.audio.play().catch(() => {}); else PLAY.audio.pause(); return false; },
  nbSkip: d => { if (!PLAY) return false; PLAY.audio.currentTime = Math.max(0, PLAY.audio.currentTime + (+d.s)); return false; },
  nbSpeed: () => { if (!PLAY) return false; const R = [1, 1.25, 1.5, 2, .75], a = PLAY.audio; a.playbackRate = R[(R.indexOf(a.playbackRate) + 1) % R.length]; nbRecBar(); return false; },
  nbDim: () => { if (!PLAY) return false; PLAY.dim = !PLAY.dim; repaintAll(); nbRecBar(); return false; },
  nbPlayClose: () => { playStop(); if (S.nb.opt.tool === 'play') S.nb.opt.tool = 'pen'; nbBar(); return false; },
  nbTrSeek: d => { const r = nbRec(UI.nb, d.id); if (!r) return false; nbPop(''); const go2 = () => { PLAY.audio.currentTime = +d.t / 1000; PLAY.audio.play().catch(() => {}); };
    if (PLAY && PLAY.recId === r.id) go2(); else playRec(r).then(() => { if (PLAY) go2(); }); return false; },
  nbRecShare: d => { const b = nbBook(d.b), r = nbRec(d.b, d.id); if (!r) return false; recBlob(r).then(bl => bl.size ? shareFile(bl, `${safeName(b.name)} ${dk(new Date(r.at))}.${recExt(r)}`, bl.type) : toast("This recording's audio isn't on this device.")); return false; },
  nbTrShare: d => { const b = nbBook(d.b), r = nbRec(d.b, d.id); if (!r) return false; shareFile(new Blob([trText(b, r)], {type:'text/plain'}), `${safeName(b.name)} ${dk(new Date(r.at))} transcript.txt`, 'text/plain'); return false; },
  nbTrCopy: d => { const b = nbBook(d.b), r = nbRec(d.b, d.id); if (!r) return false; try { navigator.clipboard.writeText(trText(b, r)).then(() => toast('Transcript copied. Paste it to Claude for notes or flashcards.'), () => toast("Couldn't copy here.")); } catch (e) { toast("Couldn't copy here."); } return false; },
  nbRecDel: d => { const b = nbBook(d.b); if (!b) return false; b.recs = b.recs.filter(r => r.id !== d.id); recDel(d.id).catch(() => {}); if (PLAY && PLAY.recId === d.id) playStop(); toast('Recording deleted.'); },
  nbEditMeta: d => { UI.nbEdit = d.id; UI.open.nbNew = true; setTimeout(() => { const f = $('form[data-form="nbbook"]'); if (f) f.scrollIntoView({behavior:'smooth', block:'center'}); }, 60); },
  nbEditCancel: () => { UI.nbEdit = null; UI.open.nbNew = false; },
  nbDelBook: d => { const b = nbBook(d.id); if (!b) return false; if (REC && REC.bookId === b.id) { toast('Stop the recording first.'); return false; }
    b.pages.forEach(id => sdo('nb', 'readwrite', s => s.delete(id)).catch(() => {})); b.recs.forEach(r => recDel(r.id).catch(() => {})); S.nb.books = S.nb.books.filter(x => x.id !== d.id); toast('Notebook deleted.'); },
});
Object.assign(SAVE, {nbbook: o => {
  if (!o.name) { toast('Name the notebook first.'); return false; }
  const ed = UI.nbEdit && nbBook(UI.nbEdit), rec = {name:o.name.slice(0, 80), c:o.c || '', paper:o.paper || 'lined', pc:o.pc || 'white', color:o.color || NB_COVERS[0]};
  if (ed) { Object.assign(ed, rec); UI.nbEdit = null; UI.open.nbNew = false; toast('Notebook saved.'); return; }
  const b = Object.assign(rec, {id:nbUid(), pages:[nbUid()], recs:[], created:Date.now(), updated:Date.now()}); S.nb.books.push(b); UI.open.nbNew = false;
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  setTimeout(() => nbOpen(b.id), 50);
}});
document.addEventListener('keydown', e => {
  if (!UI.nb || /INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); XACT[e.shiftKey ? 'nbRedo' : 'nbUndo'](); }
  else if (e.key === 'Escape') { if ($('#nbPop').innerHTML) nbPop(''); else if (NB && NB.sel) selClear(); }
});
window.addEventListener('resize', () => { if (UI.nb) setTimeout(repaintAll, 120); });

/* ----- Dropbox: pages and recordings ----- */
async function nbDbxUp() {
  DBX.nbv = DBX.nbv || {}; DBX.recs = DBX.recs || {};
  let pages = []; try { pages = await sdo('nb', 'readonly', s => s.getAll()); } catch (e) {}
  for (const p of pages) if (DBX.nbv[p.id] !== p.v) { await dbxUp(`/notebooks/${p.id}.json`, JSON.stringify(p)); DBX.nbv[p.id] = p.v; dbxSave(); }
  for (const b of S.nb.books) for (const r of b.recs) if (!DBX.recs[r.id]) {
    const bl = await recBlob(r); if (!bl.size) continue;
    await dbxUp(`/recordings/${r.id}.${recExt(r)}`, bl); await dbxUp(`/recordings/${r.id} transcript.txt`, trText(b, r)); DBX.recs[r.id] = 1; dbxSave(); }
}
async function nbDbxDown() {
  const list = async path => { let r = await (await dbxCall('api', 'files/list_folder', {path})).json(), f = r.entries; while (r.has_more) { r = await (await dbxCall('api', 'files/list_folder/continue', {cursor:r.cursor})).json(); f = f.concat(r.entries); } return f; };
  let n = 0;
  try { const have = new Set((await sdo('nb', 'readonly', s => s.getAllKeys())) || []);
    for (const f of await list('/notebooks')) { const id = f.name.replace(/\.json$/, ''); if (have.has(id) || !/\.json$/.test(f.name)) continue;
      const p = await (await dbxCall('content', 'files/download', {path:f.path_lower})).json(); if (p && p.id) { await pagePut(p); DBX.nbv = DBX.nbv || {}; DBX.nbv[p.id] = p.v; n++; } } } catch (e) { if (e.status !== 409) throw e; }
  try { for (const f of await list('/recordings')) { const m = /^(r\d+)\.(m4a|webm)$/.exec(f.name); if (!m) continue;
      const got = await recParts(m[1]); if (got && got.length) continue;
      const buf = await (await dbxCall('content', 'files/download', {path:f.path_lower})).arrayBuffer();
      await sdo('rec', 'readwrite', s => s.put({k:m[1] + '#00000', id:m[1], n:0, buf})); DBX.recs = DBX.recs || {}; DBX.recs[m[1]] = 1; n++; } } catch (e) { if (e.status !== 409) throw e; }
  dbxSave(); return n;
}
