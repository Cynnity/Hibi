// Hibi: Taps, typing and form handling for the whole app.
'use strict';
/* =========================================================
   Events
   ========================================================= */
function afterChange() { checkBadges(); save(); render(); }
let armed = null, armTimer;
function disarm() { if (armed) { armed.textContent = armed.dataset.label; armed.classList.remove('armed'); armed = null; } clearTimeout(armTimer); }

document.addEventListener('click', e => {
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    const g = nav.dataset.nav;
    if (TAB_INFO[S.tab].g !== g) { go(S.last[g] && GROUPS[g].includes(S.last[g]) ? S.last[g] : GROUPS[g][0]); save(); render(); scrollTo(0, 0); }
    return;
  }
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.hasAttribute('data-confirm') && armed !== b) {
    disarm(); armed = b; b.dataset.label = b.textContent; b.textContent = 'Tap again to confirm'; b.classList.add('armed');
    armTimer = setTimeout(disarm, 3000); return;
  }
  armed = null; clearTimeout(armTimer);
  const fn = ACT[b.dataset.act] || JACT[b.dataset.act] || MACT[b.dataset.act] || SACT[b.dataset.act] || XACT[b.dataset.act]; if (!fn) return;
  unlockAudio();
  const wasTab = S.tab;
  Crash.lastAct = b.dataset.act;
  try {
    if (fn(b.dataset, b) === false) return;
    afterChange();
  } catch (err) { Crash.record(err, 'button'); toast('Something went wrong. A crash report was saved.'); try { save(); render(); } catch (x) {} return; }
  if (S.tab !== wasTab) scrollTo(0, 0);
});
// Tapping a number box selects what's in it, so typing replaces the old number instead of adding to it
document.addEventListener('focusin', e => {
  const t = e.target;
  if (t && t.tagName === 'INPUT' && (t.classList.contains('num-in') || /^(numeric|decimal)$/.test(t.getAttribute('inputmode') || '') || t.type === 'number')) {
    setTimeout(() => { try { if (document.activeElement === t) t.setSelectionRange(0, t.value.length); } catch (x) { try { t.select(); } catch (y) {} } }, 0);
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'cvJ' || t.id === 'cvU') { const r = R(), v = num(t.value), o = $(t.id === 'cvJ' ? '#cvU' : '#cvJ'); o.value = t.value.trim() === '' ? '' : t.id === 'cvJ' ? (v / r).toFixed(2) : String(Math.round(v * r)); return; }
  if (t.id === 'knSearch') { KQ = t.value; $('#knList').innerHTML = knList(); return; }
  if (t.id === 'payAmt') { $('#payPrev').innerHTML = payPreview(num(t.value)); return; }
  if (t.dataset.bind === 'kgrade') { const x = S.sc.tasks.find(q => q.id === t.dataset.id); if (x) { x[t.dataset.f] = t.value; save(); } return; }
  if (t.id === 'mdSearch') { MQ = t.value; $('#mdList').innerHTML = mdList(); return; }
  if (t.id === 'gmSearch') { GQ = t.value; $('#gmList').innerHTML = gList(); return; }
  if (t.dataset.bind === 'jj') { const k = t.dataset.k; S.jp.journal[k] = S.jp.journal[k] || {}; S.jp.journal[k][t.dataset.f] = t.value; save(); return; }
  if (t.dataset.bind === 'jnotes') { S.jp.notes = t.value; save(); return; }
  if (t.id === 'plateW') { UI.plates.w = t.value; $('#plateOut').innerHTML = plateResult(); return; }
  if (t.dataset.bind === 'tplname') { const x = S.tpl.find(q => q.id === t.dataset.id); if (x && t.value.trim()) { x.name = t.value.trim(); save(); } return; }
  if (t.id === 'exSearch') { Q = t.value; $('#exList').innerHTML = exList(); return; }
  switch (t.dataset.bind) {
    case 'set': { const s = S.active && S.active.exercises[+t.dataset.x] && S.active.exercises[+t.dataset.x].sets[+t.dataset.s]; if (s) { s[t.dataset.f] = t.value; save(); } break; }
    case 'nf': NF[t.dataset.f] = t.value; break;
    case 'ns': NS[t.dataset.f] = t.value; break;
    case 'journal': JD.t = t.value; break;
    case 'dose': { const x = S.sup.find(s => s.id === t.dataset.id); if (x) { x.dose = t.value; save(); } break; }
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.bind === 'modevis') {
    const k = t.dataset.k; S.hidden = S.hidden.filter(x => x !== k); if (!t.checked) S.hidden.push(k);
    toast(t.checked ? `${MODES[k].label} is showing.` : `${MODES[k].label} is hidden.`); save(); render(); return;
  }
  if (t.dataset.bind === 'svfreq') { S.sv.freq = t.value; save(); render(); return; }
  if (t.dataset.bind === 'mstatus') { const m = mFind(t.dataset.id); if (m) { const was = m.status; m.status = t.value; m.updated = Date.now(); if (t.value === 'done' && was !== 'done') { m.finished = Date.now(); if (m.total) m.prog = Math.max(m.prog || 0, m.total); } afterChange(); } return; }
  if (t.dataset.bind === 'msort') { S.md.sort = t.value; save(); render(); return; }
  if (t.dataset.bind === 'suptime') { const x = S.sup.find(q => q.id === t.dataset.id); if (x) { x.time = t.value; save(); } return; }
  if (t.dataset.bind === 'pomo') { S.pomo[t.dataset.k] = +t.value; save(); render(); return; }
  if (t.dataset.bind === 'pomoClass') { S.pomo.c = t.value; save(); return; }
  if (t.dataset.bind === 'gsort') { S.gm.sort = t.value; save(); render(); return; }
  if (t.dataset.bind === 'gstatus') { const g = gFind(t.dataset.id); if (g) { const was = gDone(g); g.status = t.value; g.updated = Date.now(); if (t.value === 'now') g.started = Date.now(); gUnqueue(g); if (gDone(g) && !was) { g.finished = Date.now(); const nx = gUpNext()[0]; toast(`${t.value === 'full' ? '100%' : 'Beaten'}: ${g.title}! Give it a rating.${nx ? ` Up next: ${nx.title}.` : ''}`); } afterChange(); } return; }
  if (t.dataset.bind === 'jjday') { S.jp.jsel = t.value; save(); render(); return; }
  if (t.type === 'file') {
    const f = t.files && t.files[0]; const kind = t.dataset.file; t.value = ''; if (!f) return;
    if (kind === 'photo') addPhoto(f);
    else if (kind === 'restore') f.text().then(restoreFrom);
    else if (kind === 'hevy') f.text().then(importHevy);
    return;
  }
  if (t.dataset.bind === 'pick') { S.pick = t.value; save(); render(); }
  if (t.dataset.bind === 'cpick') { S.cpick = Object.assign({}, S.cpick, {n:t.value}); save(); render(); }
  else if (t.dataset.bind === 'setting') {
    const k = t.dataset.k; S[k] = (k === 'unit' || k === 'rr') ? t.value : +t.value;
    if (k === 'unit') { S.inc = null; S.bar = null; }
    afterChange();
  }
});
document.addEventListener('keydown', e => {
  const t = e.target;
  if (e.key === 'Escape' && UI.plates) { UI.plates = null; render(); return; }
  const ef = t.dataset && t.dataset.enter && (ACT[t.dataset.enter] || JACT[t.dataset.enter] || MACT[t.dataset.enter] || SACT[t.dataset.enter] || XACT[t.dataset.enter]);
  if (e.key === 'Enter' && ef) { e.preventDefault(); if (ef(t.dataset, t) !== false) afterChange(); }
});
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.keep) UI.open[d.dataset.keep] = d.open; }, true);
document.addEventListener('visibilitychange', tick);
