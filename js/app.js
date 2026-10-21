// Hibi: Rendering, toasts, timers and the Gym actions.
'use strict';
/* =========================================================
   Render
   ========================================================= */
const VIEWS = {workout:viewWorkout, catalog:viewCatalog, care:viewCare, history:viewHistory, body:viewBody, badges:viewBadges, today:viewToday, journal:viewJournal, settings:viewSettings};
// Draws the current screen. If drawing fails, a crash report is saved and a safe screen is shown instead of a blank app.
function render() {
  try { drawApp(); Crash.shown = false; }
  catch (e) { const r = Crash.record(e, 'drawing ' + (S && S.tab || 'screen')); Crash.screen(r); }
}
function drawApp() {
  const g = TAB_INFO[S.tab].g, tabs = GROUPS[g];
  const seg = tabs.length > 1 ? `<div class="seg" role="tablist">${tabs.map(t => `<button role="tab" aria-selected="${t === S.tab}" data-act="go" data-to="${t}">${TAB_INFO[t].t}</button>`).join('')}</div>` : '';
  $('#app').innerHTML = `${updateBanner()}${modeBar()}<header class="top"><h1>${TAB_INFO[S.tab].t}</h1><p>${esc(subtitle())}</p></header>${seg}${S.mode === 'school' ? pomoBanner() : ''}${(VIEWS[S.tab] || JVIEWS[S.tab] || MVIEWS[S.tab] || SVIEWS[S.tab] || XVIEWS[S.tab])()}`;
  $('#sheetRoot').innerHTML = sheetHtml();
  { const mb = $('.modes'), sel = mb && mb.querySelector('[aria-selected="true"]'); if (sel && (sel.offsetLeft + sel.offsetWidth > mb.clientWidth + mb.scrollLeft || sel.offsetLeft < mb.scrollLeft)) mb.scrollLeft = Math.max(0, sel.offsetLeft - 16); }
  $('#nav').innerHTML = MODES[S.mode].nav.map(([ng, label, ic]) => `<button data-nav="${ng}"${ng === g ? ' aria-current="page"' : ''}><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[ic]}</svg></span>${label}</button>`).join('');
  tick();
}
function go(tab) {
  if (!TAB_INFO[tab]) return;
  S.tab = tab; S.last[TAB_INFO[tab].g] = tab;
}

/* =========================================================
   Feedback: toast, sound
   ========================================================= */
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
let audio;
function unlockAudio() { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) {} }
function beep() {
  try {
    unlockAudio();
    [0, .22].forEach(off => {
      const o = audio.createOscillator(), g = audio.createGain(), t0 = audio.currentTime + off;
      o.connect(g); g.connect(audio.destination); o.frequency.value = 880;
      g.gain.setValueAtTime(.25, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + .18); o.start(t0); o.stop(t0 + .2);
    });
  } catch (e) {}
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
}

/* =========================================================
   Timers
   ========================================================= */
function startRest() { S.timer = {end:Date.now() + S.rest * 1000, total:S.rest}; }
const restLeft = () => S.timer ? (S.timer.paused != null ? S.timer.paused : S.timer.end - Date.now()) : 0;
function tick() {
  const jc = $('#jpClock'); if (jc) jc.textContent = tokyoNow();
  const el = $('#elapsed'); if (el && S.active) el.textContent = clock(runMs(S.active));
  const cc = $('#cardioClock'); if (cc && S.crun) cc.textContent = clock(runMs(S.crun));
  pomoTick();
  workTick();
  widgetTick();
  const r = $('#rest');
  if (!S.timer) { r.hidden = true; return; }
  const left = restLeft();
  const pb = $('#restPause'); if (pb) { const p = S.timer.paused != null; pb.textContent = p ? '▶' : '⏸'; pb.setAttribute('aria-label', p ? 'Resume rest timer' : 'Pause rest timer'); r.classList.toggle('paused', p); }
  if (left <= 0 && S.timer.paused == null) {
    const stale = left < -60000;
    S.timer = null; save(); r.hidden = true;
    if (!stale) { beep(); toast('Rest is over. Next set!'); }
    return;
  }
  r.hidden = false;
  $('#restTime').textContent = clock(left, true);
  $('#restBar').style.transform = `scaleX(${Math.max(0, Math.min(1, left / (S.timer.total * 1000)))})`;
}

/* =========================================================
   Actions (each mutates state; returning false skips save/render)
   ========================================================= */
function addSetTo(ex) {
  const last = ex.sets[ex.sets.length - 1], p = prevFor(ex.name, ex.sets.length), k = kindOf(ex);
  if (k) { ex.sets.push(cardioSet(k, p || last)); return; }
  ex.sets.push({w:p ? p.w : last ? last.w : '', r:p ? p.r : last ? last.r : '', done:false});
}
function addExercise(name) {
  const a = S.active, p = prevFor(name, 0), info = exInfo(name), k = info && CARDIO[info.kind] ? info.kind : null;
  a.exercises.push(k ? {name:info.name, k, sets:[cardioSet(k, p)]} : {name:info ? info.name : name, sets:[{w:p ? p.w : '', r:p ? p.r : '', done:false}]});
  if (info) info.muscles.forEach(m => { if (!a.muscles.includes(m)) a.muscles.push(m); });
}
const ACT = {
  go: d => go(d.to),
  start: d => { S.active = {id:Date.now(), start:Date.now(), cat:d.cat || null, muscles:[], exercises:[]}; UI.open.sessionMuscles = false; },
  addFromLib: d => { const e = S.ex.find(x => x.id === d.id); if (!e) return false; addExercise(e.name); },
  addTyped: () => { const v = $('#newEx').value.trim(); if (!v) { toast('Type an exercise name first.'); return false; } addExercise(v); },
  removeEx: d => { S.active.exercises.splice(+d.x, 1); },
  addSet: d => addSetTo(S.active.exercises[+d.x]),
  removeSet: d => { const ex = S.active.exercises[+d.x]; if (ex.sets.length > 1) ex.sets.pop(); },
  toggleSet: d => {
    const ex = S.active.exercises[+d.x], s = ex.sets[+d.s];
    s.done = !s.done;
    if (s.done) { const p = prevFor(ex.name, +d.s), k = kindOf(ex);
      if (k) { if (p) CARDIO[k].f.forEach(f => { if (s[f] === '' && p[f] !== undefined) s[f] = p[f]; }); return; }
      if (s.w === '' && p) s.w = p.w; if (s.r === '' && p) s.r = p.r; startRest(); }
  },
  sessionMuscle: d => toggleIn(S.active.muscles, d.m),
  finish: () => {
    const a = S.active;
    const ex = a.exercises.map(e => { const k = kindOf(e);
      if (!k) return {name:e.name, sets:e.sets.filter(s => s.done).map(s => ({w:s.w, r:s.r}))};
      return {name:e.name, k, sets:e.sets.filter(s => s.done).map(s => { const o = {}; CARDIO[k].f.forEach(f => { if (s[f] !== '' && s[f] !== undefined) o[f] = s[f]; });
        if (k === 'tread' && !num(o.dist) && distOf(o)) o.dist = String(distOf(o)); return o; })}; }).filter(e => e.sets.length);
    if (!ex.length) { toast('Check off at least one set to save this workout.'); return false; }
    const prs = ex.filter(e => { if (e.k) return false; const old = series(e.name); return old.length && topOf(e) > Math.max(...old.map(p => p.v)); }).map(e => e.name);
    const end = Date.now();
    S.history.push({id:a.id, start:end - runMs(a), end, cat:a.cat, tpl:a.tpl || null, muscles:a.muscles, exercises:ex});
    if (a.tpl && S.tpl.some(t => t.id === a.tpl)) S.next = tplAfter(a.tpl);
    { const mins = runMs(a) / 6e4, sets = ex.reduce((t, e) => t + (e.k ? 0 : e.sets.length), 0), vol = volOf({exercises:ex.filter(e => !e.k)});
      if (mins < 10 && sets >= 3) sxBump('speed'); if (sets && vol < 100 && !ex.some(e => e.k)) sxBump('tiny'); }
    S.active = null; S.timer = null;
    toast(prs.length ? `🏆 New PR: ${prs.join(', ')}!` : `Workout saved. ${ex.every(e => e.k) ? 'Cardio logged.' : plural(ex.reduce((t, e) => t + e.sets.length, 0), 'set') + ' logged.'}`);
  },
  discard: () => { S.active = null; S.timer = null; },
  restMinus: () => { if (!S.timer) return false; if (S.timer.paused != null) S.timer.paused = Math.max(0, S.timer.paused - 15000); S.timer.end -= 15000; S.timer.total = Math.max(15, S.timer.total - 15); },
  restPlus: () => { if (!S.timer) return false; if (S.timer.paused != null) S.timer.paused += 15000; S.timer.end += 15000; S.timer.total += 15; },
  restSkip: () => { S.timer = null; },
  restPause: () => { const t = S.timer; if (!t) return false; if (t.paused != null) { t.end = Date.now() + t.paused; t.paused = null; } else t.paused = Math.max(0, t.end - Date.now()); tick(); },
  pauseWorkout: () => { if (S.active.pausedAt && Date.now() - S.active.pausedAt > 30 * 6e4) sxBump('longPause'); togglePause(S.active); toast(S.active.pausedAt ? 'Workout paused.' : 'Back to it!'); },
  cardioPause: () => { togglePause(S.crun); },
  applyHint: d => {
    const ex = S.active.exercises[+d.x], h = hintFor(ex.name); if (!h) return false;
    ex.sets.forEach(s => { if (!s.done) { s.w = String(h.w); s.r = String(h.r); } });
    toast(`Sets filled in: ${fmtN(h.w)} ${S.unit} × ${h.r}.`);
  },

  saveTpl: () => {
    const a = S.active; if (!a.exercises.length) { toast('Add some exercises first.'); return false; }
    const name = ($('#tplName').value || '').trim() || (a.cat ? catName(a.cat) : 'My workout');
    const items = a.exercises.map(e => ({name:e.name, sets:Math.max(1, e.sets.length)}));
    let t = S.tpl.find(x => norm(x.name) === norm(name));
    if (t) { t.items = items; t.cat = a.cat || null; toast(`Updated ${name}.`); }
    else { t = {id:'t' + Date.now(), name, cat:a.cat || null, items}; S.tpl.push(t); toast(`Saved ${name} as a template.`); }
    a.tpl = t.id; UI.open.saveTpl = false;
  },
  tplFromWorkout: d => {
    const w = S.history.find(x => String(x.id) === d.id); if (!w) return false;
    const name = (w.cat ? catName(w.cat) : 'Workout') + ' ' + fmtMD(new Date(w.end));
    S.tpl.push({id:'t' + Date.now(), name, cat:w.cat || null, items:w.exercises.map(e => ({name:e.name, sets:e.sets.length}))});
    toast(`Saved as ${name}. Rename it on the Workout tab.`);
  },
  startTpl: d => {
    const t = S.tpl.find(x => x.id === d.id); if (!t) return false;
    S.active = {id:Date.now(), start:Date.now(), cat:t.cat || null, tpl:t.id, muscles:[], exercises:[]};
    UI.open.sessionMuscles = false;
    t.items.forEach(it => { addExercise(it.name); const ex = S.active.exercises[S.active.exercises.length - 1]; for (let i = 1; i < it.sets; i++) addSetTo(ex); });
  },
  deleteTpl: d => { S.tpl = S.tpl.filter(t => t.id !== d.id); if (S.next === d.id) S.next = null; },
  tplUp: d => { const i = S.tpl.findIndex(t => t.id === d.id); if (i > 0) [S.tpl[i - 1], S.tpl[i]] = [S.tpl[i], S.tpl[i - 1]]; },
  skipRot: () => { const t = nextTpl(); if (t) S.next = tplAfter(t.id); },

  openPlates: () => { UI.plates = {w:''}; },
  plates: d => { const ex = S.active.exercises[+d.x], s = ex.sets.find(x => !x.done) || ex.sets[ex.sets.length - 1]; UI.plates = {w:s ? s.w : ''}; },
  plateQuick: d => { UI.plates.w = d.w; },
  closeSheet: () => { UI.plates = null; UI.clog = null; UI.wAdd = false; },
  noop: () => false,

  filterCat: d => { S.cf = d.c; },
  exMuscle: d => { const e = S.ex.find(x => x.id === d.id); if (e) toggleIn(e.muscles, d.m); },
  exCat: d => { const e = S.ex.find(x => x.id === d.id); if (e) toggleIn(e.cats, d.c); },
  deleteEx: d => { S.ex = S.ex.filter(e => e.id !== d.id); },
  nfMuscle: d => toggleIn(NF.muscles, d.m),
  nfKind: d => { NF.kind = d.k; },
  cardioOpen: d => { const e = S.ex.find(x => x.id === d.id); if (!e || !CARDIO[e.kind]) return false; UI.clog = {name:e.name, k:e.kind}; },
  cardioStart: () => { const c = UI.clog; if (!c) return false; S.crun = {name:c.name, k:c.k, start:Date.now()}; UI.clog = null; toast(`${c.name} timer started.`); },
  cardioStop: () => { const r = S.crun; if (!r) return false; UI.clog = {name:r.name, k:r.k, start:r.start, min:String(Math.max(1, Math.round(runMs(r) / 6e3) / 10))}; },
  cardioCancel: () => { S.crun = null; },
  cardioDel: d => { S.cardio = S.cardio.filter(x => String(x.id) !== d.id); },
  exKind: d => { const e = S.ex.find(x => x.id === d.id); if (!e) return false; if (d.k) e.kind = d.k; else delete e.kind;
    if (S.active) S.active.exercises.forEach(x => { if (norm(x.name) === norm(e.name) && !x.sets.some(q => q.done)) { x.k = d.k || undefined; if (!x.k) delete x.k; x.sets = x.sets.map(() => d.k ? cardioSet(d.k) : {w:'', r:'', done:false}); } }); },
  cardioMet: d => { S.cpick = Object.assign({}, S.cpick, {m:d.m}); },
  nfCat: d => toggleIn(NF.cats, d.c),
  createEx: () => {
    const name = NF.name.trim();
    if (!name) { toast('Give the exercise a name.'); return false; }
    if (exInfo(name)) { toast('That exercise is already in your library.'); return false; }
    S.ex.push(Object.assign({id:'u' + Date.now(), name, cats:NF.cats, muscles:NF.muscles, how:NF.how.trim() || 'No notes yet.'}, NF.kind ? {kind:NF.kind} : {}));
    NF = {name:'', how:'', muscles:[], cats:[], kind:''}; UI.open.newEx = false; toast(`Added ${name} to your library.`);
  },
  addCat: () => { const v = $('#newCat').value.trim(); if (!v) return false; S.cats.push({id:'c' + Date.now(), name:v}); },
  deleteCat: d => { S.cats = S.cats.filter(c => c.id !== d.c); S.ex.forEach(e => { e.cats = e.cats.filter(c => c !== d.c); }); if (S.cf === d.c) S.cf = 'all'; },
  filterCare: d => { S.cm = d.m; },

  deleteWorkout: d => { S.history = S.history.filter(w => String(w.id) !== d.id); },
  saveWeight: () => {
    const v = num($('#bwIn').value); if (!(v > 0)) { toast('Enter your weight first.'); return false; }
    S.bw = S.bw.filter(p => p.d !== today()); S.bw.push({d:today(), v}); S.bw.sort((a, b) => a.d < b.d ? -1 : 1); toast('Weight saved.');
  },
  deletePhoto: d => { pDel(+d.id).then(loadPhotos); return false; },

  toggleSup: d => { const k = today(); S.sl[k] = S.sl[k] || []; toggleIn(S.sl[k], d.id); },
  addSup: () => {
    if (!NS.name.trim()) { toast('Give the supplement a name.'); return false; }
    S.sup.push({id:'p' + Date.now(), name:NS.name.trim(), dose:NS.dose.trim()}); NS = {name:'', dose:''};
  },
  removeSup: d => { S.sup = S.sup.filter(x => x.id !== d.id); },
  supCal: () => {
    const L = S.sup.filter(x => /^\d\d:\d\d$/.test(x.time || ''));
    if (!L.length) { toast('Set a reminder time for at least one supplement first.'); return false; }
    const byT = {}; L.forEach(x => (byT[x.time] = byT[x.time] || []).push(x));
    const start = dk(new Date()).replace(/-/g, ''), stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const ev = Object.entries(byT).map(([t, xs]) => { const [h, m] = t.split(':'), names = xs.map(x => x.name + (x.dose ? ` (${x.dose})` : ''));
      return ['BEGIN:VEVENT', `UID:hibi-sup-${t.replace(':', '')}@hibi`, `DTSTAMP:${stamp}`, `DTSTART:${start}T${h}${m}00`, `DTEND:${start}T${h}${m}00`, 'RRULE:FREQ=DAILY',
        `SUMMARY:${icsEsc('💊 Take ' + xs.map(x => x.name).join(', '))}`, `DESCRIPTION:${icsEsc(names.join('\n') + '\nCheck them off in Hibi, then Gym, then Daily.')}`, 'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc('Time for ' + xs.map(x => x.name).join(', '))}`, 'END:VALARM', 'END:VEVENT'].join('\r\n'); });
    saveCalendar(icsWrap(ev, 'Supplements'), 'hibi-supplements.ics', ev.length); return false;
  },
  mood: d => { JD.m = JD.m === +d.m ? 0 : +d.m; },
  saveJournal: () => {
    if (!JD.m && !JD.t.trim()) { toast('Pick a mood or write a few words first.'); return false; }
    S.j = S.j.filter(e => e.d !== JD.d); S.j.push({d:JD.d, m:JD.m, t:JD.t}); S.j.sort((a, b) => a.d < b.d ? -1 : 1); toast('Entry saved.');
  },
  deleteEntry: d => { S.j = S.j.filter(e => e.d !== d.d); if (d.d === today()) JD = null; },

  theme: d => { S.theme = d.k; applyTheme(); if (!S.themesUsed.includes(d.k)) S.themesUsed.push(d.k); const td = today(); if (S.sx.thD !== td) { S.sx.thD = td; S.sx.thN = 0; } S.sx.thN++; if (d.k === 'miku') sxBump('miku'); },
  shareBackup: () => {
    const file = new File([JSON.stringify(backup())], `hibi-backup-${today()}.json`, {type:'application/json'});
    if (navigator.canShare && navigator.canShare({files:[file]})) {
      navigator.share({files:[file]}).then(() => { S.lb = Date.now(); save(); render(); toast('Backup saved.'); })
        .catch(e => { if (e.name !== 'AbortError') downloadBackup(file); });
    } else downloadBackup(file);
    return false;
  },
  copyBackup: () => {
    const t = $('#bk'); t.value = JSON.stringify(backup()); t.select();
    S.lb = Date.now(); save();
    try { navigator.clipboard.writeText(t.value).then(() => toast('Backup copied.'), () => toast('Select the text and copy it.')); } catch (e) { toast('Select the text and copy it.'); }
    return false;
  },
  restoreText: () => { restoreFrom($('#bk').value); return false; },
};
function downloadBackup(file) {
  let framed = true; try { framed = window.top !== window; } catch (e) {}
  if (framed) {
    UI.open.textBackup = true; render();
    const t = $('#bk'); t.value = JSON.stringify(backup()); t.select();
    toast('Files are blocked in this preview. Copy the text below instead.'); return;
  }
  try {
    const url = URL.createObjectURL(file), a = document.createElement('a');
    a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    S.lb = Date.now(); save(); render(); toast('Backup downloaded.');
  } catch (e) { toast('Saving a file is blocked here. Use copy as text instead.'); }
}
