// Hibi: Touch gestures. Swipe list rows, drag to reorder, and haptic taps.
'use strict';
/* =========================================================
   Haptics
   ========================================================= */
// Android vibrates through navigator.vibrate. iPhone has no vibrate for websites, but iOS 18 and later give a light
// tap when a switch-style checkbox is toggled during a tap, so Hibi flips a hidden one.
let hapEl = null;
function haptic(kind) {
  if (S && S.fx && S.fx.haptic === false) return;
  try { if (navigator.vibrate) { navigator.vibrate(kind === 'heavy' ? [30, 40, 30] : kind === 'tick' ? 6 : 12); return; } } catch (e) {}
  try {
    if (!hapEl) { hapEl = document.createElement('label'); hapEl.setAttribute('aria-hidden', 'true'); hapEl.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px;overflow:hidden;opacity:0';
      hapEl.innerHTML = '<input type="checkbox" switch tabindex="-1">'; document.body.appendChild(hapEl); }
    hapEl.click(); if (kind === 'heavy') setTimeout(() => hapEl.click(), 90);
  } catch (e) {}
}

/* =========================================================
   Swipe rows
   ========================================================= */
// Wraps a row so it can be swiped. o.r = [action, label] for a right swipe, o.l for a left swipe, o.data = attributes passed to the action.
function swipeWrap(inner, o) {
  const data = Object.entries(o.data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
  return `<div class="sw" data-swipe${o.r ? ` data-sr="${o.r[0]}"` : ''}${o.l ? ` data-sl="${o.l[0]}"` : ''}${data}>
    <div class="sw-bg" aria-hidden="true">${o.r ? `<span class="sw-r">✓ ${esc(o.r[1])}</span>` : '<span></span>'}${o.l ? `<span class="sw-l${/^(Delete|Remove)/.test(o.l[1]) ? ' del' : ''}">${esc(o.l[1])} ${/^(Delete|Remove)/.test(o.l[1]) ? '🗑' : '✏️'}</span>` : '<span></span>'}</div>
    <div class="sw-row">${inner}</div></div>`;
}
const actFn = name => ACT[name] || JACT[name] || MACT[name] || SACT[name] || XACT[name];
let undoSnap = null, swiped = 0;
function runAct(name, el) {
  const fn = actFn(name); if (!fn) return;
  const del = /Del$|^lsDel$|^kDel$/.test(name);
  if (del) undoSnap = JSON.stringify(S);
  Crash.lastAct = 'swipe ' + name;
  try { if (fn(Object.assign({}, el.dataset), el) !== false) afterChange(); } catch (err) { Crash.record(err, 'swipe'); toast('Something went wrong. A crash report was saved.'); return; }
  if (del) undoToast('Deleted.');
}
function undoToast(msg) {
  const t = $('#toast'); t.innerHTML = `${esc(msg)} <button class="undo" data-undo>Undo</button>`; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.classList.remove('show'); undoSnap = null; }, 4500);
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-undo]') && undoSnap) {
    e.stopPropagation(); S = normalize(JSON.parse(undoSnap)); undoSnap = null; save(); render(); toast('Restored.'); haptic(); return;
  }
  // A swipe ends with a click on whatever was under the finger. Ignore it.
  if (Date.now() - swiped < 350) { e.stopPropagation(); e.preventDefault(); }
}, true);
{
  let sw = null;
  const TH = 80;
  document.addEventListener('pointerdown', e => {
    if (e.button > 0 || dragging) return;
    const row = e.target.closest('.sw-row'); if (!row || e.target.closest('input,textarea,select,.grip')) return;
    const box = row.parentElement;
    sw = {box, row, x:e.clientX, y:e.clientY, dx:0, on:false, past:false, id:e.pointerId, r:!!box.dataset.sr, l:!!box.dataset.sl};
  }, {passive:true});
  document.addEventListener('pointermove', e => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (!sw.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      if ((dx > 0 && !sw.r) || (dx < 0 && !sw.l)) { sw = null; return; }
      sw.on = true; sw.box.classList.add('swiping'); try { sw.row.setPointerCapture(e.pointerId); } catch (x) {}
    }
    let v = dx; if ((v > 0 && !sw.r) || (v < 0 && !sw.l)) v = 0;
    if (Math.abs(v) > TH) v = Math.sign(v) * (TH + (Math.abs(v) - TH) * .35);
    sw.dx = v; sw.row.style.transform = `translateX(${v}px)`;
    sw.box.dataset.dir = v > 0 ? 'r' : 'l';
    const past = Math.abs(dx) >= TH; if (past !== sw.past) { sw.past = past; sw.box.classList.toggle('go', past); if (past) haptic('tick'); }
  }, {passive:true});
  const end = e => {
    if (!sw || (e && e.pointerId !== sw.id)) return;
    const s = sw; sw = null;
    if (!s.on) return;
    swiped = Date.now();
    s.row.style.transition = 'transform .22s ease';
    if (s.past && e && e.type === 'pointerup') {
      const name = s.dx > 0 ? s.box.dataset.sr : s.box.dataset.sl;
      s.row.style.transform = `translateX(${s.dx > 0 ? '' : '-'}105%)`; haptic();
      setTimeout(() => runAct(name, s.box), 160);
    } else { s.row.style.transform = ''; setTimeout(() => { s.box.classList.remove('swiping', 'go'); s.row.style.transition = ''; }, 230); }
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
}

/* =========================================================
   Drag to reorder
   ========================================================= */
// A list with data-sort="key" whose items have data-sid. Drag an item by its ⠿ grip. SORT[key] saves the new order.
const SORT = {
  modes: ids => { S.order = ids.filter(k => MODES[k] && k !== 'home'); },
  widgets: ids => { const by = new Map(S.home.w.map(w => [w.id, w])); S.home.w = ids.map(i => by.get(i)).filter(Boolean).concat(S.home.w.filter(w => !ids.includes(w.id))); },
  tpl: ids => { const by = new Map(S.tpl.map(t => [t.id, t])); S.tpl = ids.map(i => by.get(i)).filter(Boolean).concat(S.tpl.filter(t => !ids.includes(t.id))); },
  gq: ids => { S.gm.queue = [...ids.filter(i => S.gm.queue.includes(i)), ...S.gm.queue.filter(i => !ids.includes(i))]; },
  habits: ids => { const by = new Map(S.hl.habits.map(h => [h.id, h])); S.hl.habits = ids.map(i => by.get(i)).filter(Boolean).concat(S.hl.habits.filter(h => !ids.includes(h.id))); },
  wish: ids => { const by = new Map(S.ls.wish.map(w => [w.id, w])); S.ls.wish = ids.map(i => by.get(i)).filter(Boolean).concat(S.ls.wish.filter(w => !ids.includes(w.id))); },
};
let dragging = null;
{
  const items = box => [...box.children].filter(c => c.dataset.sid);
  document.addEventListener('pointerdown', e => {
    const g = e.target.closest('.grip'); if (!g || e.button > 0) return;
    const item = g.closest('[data-sid]'), box = item && item.parentElement;
    if (!box || !box.dataset.sort || !SORT[box.dataset.sort]) return;
    e.preventDefault();
    const r = item.getBoundingClientRect(), ghost = item.cloneNode(true);
    ghost.classList.add('drag-ghost'); ghost.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    ghost.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
    document.body.appendChild(ghost); item.classList.add('drag-src');
    dragging = {box, item, ghost, id:e.pointerId, oy:e.clientY - r.top, ox:e.clientX - r.left, y:e.clientY, x:e.clientX, moved:false, start:items(box).map(i => i.dataset.sid).join()};
    try { g.setPointerCapture(e.pointerId); } catch (x) {}
    haptic(); scrollLoop();
  });
  function move(x, y) {
    const d = dragging; d.x = x; d.y = y;
    d.ghost.style.left = (x - d.ox) + 'px'; d.ghost.style.top = (y - d.oy) + 'px';
    const L = items(d.box).filter(i => i !== d.item);
    let target = null, after = false;
    for (const i of L) { const r = i.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom && x >= r.left - 6 && x <= r.right + 6) { target = i; const wide = r.width > d.box.clientWidth * .7; after = wide ? y > r.top + r.height / 2 : x > r.left + r.width / 2; break; } }
    if (!target) { const first = L[0], last = L[L.length - 1];
      if (first && y < first.getBoundingClientRect().top) { target = first; after = false; } else if (last && y > last.getBoundingClientRect().bottom) { target = last; after = true; } }
    if (!target) return;
    const ref = after ? target.nextElementSibling : target;
    if (ref === d.item || d.item.nextElementSibling === ref) return;
    const before = new Map(items(d.box).map(i => [i, i.getBoundingClientRect()]));
    d.box.insertBefore(d.item, ref); haptic('tick');
    items(d.box).forEach(i => { if (i === d.item) return; const a = before.get(i), b = i.getBoundingClientRect(); const dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) { i.style.transition = 'none'; i.style.transform = `translate(${dx}px,${dy}px)`; requestAnimationFrame(() => requestAnimationFrame(() => { i.style.transition = 'transform .2s ease'; i.style.transform = ''; })); } });
  }
  function scrollLoop() {
    if (!dragging) return;
    const y = dragging.y, h = innerHeight, edge = 70;
    if (y < edge) scrollBy(0, -Math.ceil((edge - y) / 6)); else if (y > h - edge - 80) scrollBy(0, Math.ceil((y - (h - edge - 80)) / 6));
    requestAnimationFrame(scrollLoop);
  }
  window.addEventListener('pointermove', e => { if (dragging && e.pointerId === dragging.id) { e.preventDefault(); move(e.clientX, e.clientY); } }, {passive:false});
  window.addEventListener('touchmove', e => { if (dragging) e.preventDefault(); }, {passive:false});
  const done = e => {
    const d = dragging; if (!d || (e && e.pointerId !== d.id)) return;
    dragging = null; d.ghost.remove(); d.item.classList.remove('drag-src');
    const ids = items(d.box).map(i => i.dataset.sid);
    if (ids.join() !== d.start) { SORT[d.box.dataset.sort](ids); haptic(); save(); render(); }
  };
  window.addEventListener('pointerup', done); window.addEventListener('pointercancel', done);
}
const grip = label => `<span class="grip" aria-label="Drag to reorder ${esc(label)}" role="img">⠿</span>`;
