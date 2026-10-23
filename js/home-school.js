// Hibi: Home dashboard, School mode, hiding and ordering modes, passcode, archive, patch notes.
'use strict';
/* =========================================================
   Home, School, mode visibility, passcode, savings extras
   ========================================================= */
/* ----- Logo and the "new version is ready" banner ----- */
const HIBI_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="64" height="64" style="border-radius:15px;flex:none" aria-hidden="true"> <defs> <linearGradient id="hb-bg" x1="0" y1="0" x2="1" y2="1"> <stop offset="0" stop-color="#FF7AAA"/> <stop offset="0.55" stop-color="#F0467F"/> <stop offset="1" stop-color="#C92E6B"/> </linearGradient> <pattern id="hb-tone" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"> <circle cx="11" cy="11" r="3.2" fill="#FFFFFF"/> </pattern> <radialGradient id="hb-fade" cx="0.88" cy="0.9" r="0.55"> <stop offset="0" stop-color="#fff" stop-opacity="1"/> <stop offset="1" stop-color="#fff" stop-opacity="0"/> </radialGradient> <mask id="hb-toneMask"><rect width="512" height="512" fill="url(#hb-fade)"/></mask> <path id="hb-petal" d="M256 262 C 200 212 182 136 222 92 L 256 120 L 290 92 C 330 136 312 212 256 262 Z"/> </defs> <rect width="512" height="512" fill="url(#hb-bg)"/> <rect width="512" height="512" fill="url(#hb-tone)" opacity="0.22" mask="url(#hb-toneMask)"/> <g transform="translate(0 14)"> <g fill="#2B1B52" transform="translate(9 9)"> <use href="#hb-petal"/><use href="#hb-petal" transform="rotate(72 256 256)"/><use href="#hb-petal" transform="rotate(144 256 256)"/> <use href="#hb-petal" transform="rotate(216 256 256)"/><use href="#hb-petal" transform="rotate(288 256 256)"/> </g> <g fill="#FFFFFF" stroke="#2B1B52" stroke-width="12" stroke-linejoin="round"> <use href="#hb-petal"/><use href="#hb-petal" transform="rotate(72 256 256)"/><use href="#hb-petal" transform="rotate(144 256 256)"/> <use href="#hb-petal" transform="rotate(216 256 256)"/><use href="#hb-petal" transform="rotate(288 256 256)"/> </g> <g stroke="#FFC2D7" stroke-width="7" stroke-linecap="round"> <path d="M256 238 V 168"/><path d="M256 238 V 168" transform="rotate(72 256 256)"/><path d="M256 238 V 168" transform="rotate(144 256 256)"/> <path d="M256 238 V 168" transform="rotate(216 256 256)"/><path d="M256 238 V 168" transform="rotate(288 256 256)"/> </g> <circle cx="256" cy="256" r="30" fill="#F0467F" stroke="#2B1B52" stroke-width="10"/> <circle cx="246" cy="246" r="8" fill="#FFFFFF"/> </g> <g transform="translate(404 104)"> <path d="M0 -46 C 6 -14 14 -6 46 0 C 14 6 6 14 0 46 C -6 14 -14 6 -46 0 C -14 -6 -6 -14 0 -46 Z" fill="#5CE1F5" stroke="#2B1B52" stroke-width="8" stroke-linejoin="round"/> </g> <g transform="translate(112 410)"> <path d="M0 -22 C 3 -7 7 -3 22 0 C 7 3 3 7 0 22 C -3 7 -7 3 -22 0 C -7 -3 -3 -7 0 -22 Z" fill="#FFFFFF" stroke="#2B1B52" stroke-width="6" stroke-linejoin="round"/> </g> </svg>`;
let updateReady = false, hadController = false;
try {
  if ('serviceWorker' in navigator) {
    hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) { updateReady = true; render(); } hadController = true; });
  }
} catch (e) {}
const updateBanner = () => updateReady ? `<div class="card flat" style="border-color:var(--accent)"><div class="row"><span class="small"><b>A new version is ready.</b> Reload to use it.</span><button class="btn sm" data-act="reloadApp">Reload</button></div></div>` : '';
Object.assign(JACT, {reloadApp: () => { location.reload(); return false; }});
Object.assign(ICON, {home:'<path d="M3.5 11L12 4l8.5 7M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>', due:'<rect x="4" y="4.5" width="16" height="16" rx="2"/><path d="M8 3v3M16 3v3M8.5 13l2.5 2.5 4.5-5"/>'});
{ // reorder so Home comes first and School sits after Gym
  const old = Object.assign({}, MODES); Object.keys(MODES).forEach(k => delete MODES[k]);
  MODES.home = {label:'Home', em:'🏠', nav:[['hhome','Home','home'],['settings','Settings','settings']]};
  MODES.gym = old.gym;
  MODES.school = {label:'School', em:'🎓', nav:[['kdue','Due','due'],['kclass','Classes','library'],['knotes','Notes','lists'],['settings','Settings','settings']]};
  Object.keys(old).filter(k => k !== 'gym').forEach(k => { MODES[k] = old[k]; });
}
Object.assign(TAB_INFO, {hhome:{g:'hhome',t:'Home'}, kdue:{g:'kdue',t:'Due'}, kclass:{g:'kclass',t:'Classes'}, knotes:{g:'knotes',t:'Notes'}});
Object.assign(GROUPS, {hhome:['hhome'], kdue:['kdue'], kclass:['kclass'], knotes:['knotes']});
const orderedModes = () => ['home', ...((S && S.order) || Object.keys(MODES).filter(k => k !== 'home'))].filter(k => MODES[k]);
const modeVisible = k => k === 'home' || !(S.hidden || []).includes(k);

/* ----- School data ----- */
const K_KINDS = [['hw','📝','Assignment'],['exam','🧪','Exam'],['quiz','❓','Quiz'],['lab','🔬','Lab'],['project','🛠️','Project'],['other','📌','Other']];
const K_COLORS = ['#F0467F','#2BB8D0','#8B6CFF','#F2A541','#2E9E5B','#E8590C','#5E6B78'];
const K_DAYS = [['M','Mon'],['T','Tue'],['W','Wed'],['R','Thu'],['F','Fri'],['S','Sat'],['U','Sun']];
const K_REF = `Ohm's law: V = I × R
Power: P = V × I = I² × R = V² / R
Resistors in series: R = R1 + R2 + R3 ...
Resistors in parallel: 1/R = 1/R1 + 1/R2 + ...
Two in parallel: R = (R1 × R2) / (R1 + R2)
Resistor colors: Black 0, Brown 1, Red 2, Orange 3, Yellow 4, Green 5, Blue 6, Violet 7, Gray 8, White 9
Tolerance band: Gold ±5%, Silver ±10%`;
function normalizeExtra(s) {
  if (!s.sc || typeof s.sc !== 'object') s.sc = {};
  for (const k of ['classes', 'tasks']) if (!Array.isArray(s.sc[k])) s.sc[k] = [];
  if (!Array.isArray(s.sc.notes)) s.sc.notes = [{id:'kref', c:'', title:'Quick reference', body:K_REF}];
  s.sc.classes.forEach(c => { if (!c.term) c.term = termOf(new Date()); if (typeof c.end !== 'string') c.end = ''; });
  if (!s.sc.term) s.sc.term = termOf(new Date());
  if (!Array.isArray(s.hidden)) s.hidden = [];
  s.hidden = s.hidden.filter(k => MODES[k] && k !== 'home');
  if (typeof s.pin !== 'string') s.pin = '';
  if (!s.seenVer) s.seenVer = '1.0';
  const all = Object.keys(MODES).filter(k => k !== 'home');
  if (!Array.isArray(s.order)) s.order = [];
  s.order = [...s.order.filter(k => all.includes(k)), ...all.filter(k => !s.order.includes(k))];
  if (!MODES[s.mode] || s.hidden.includes(s.mode)) { s.mode = 'home'; s.tab = 'hhome'; }
}
const kClass = id => S.sc.classes.find(c => c.id === id);
/* ----- Terms (semesters): Spring is January to May, Summer June and July, Fall August to December ----- */
const termOf = d => { const m = d.getMonth(), y = d.getFullYear(); return (m <= 4 ? 'Spring ' : m <= 6 ? 'Summer ' : 'Fall ') + y; };
const termKey = t => { const [n, y] = String(t).split(' '); return (+y || 0) * 10 + ({Spring:1, Summer:2, Fall:3}[n] || 0); };
const termNext = t => { const [n, y] = String(t).split(' '); return n === 'Spring' ? 'Summer ' + y : n === 'Summer' ? 'Fall ' + y : 'Spring ' + (+y + 1); };
function termList() {
  const cur = termOf(new Date()), set = new Set([cur, termNext(cur), ...S.sc.classes.map(c => c.term).filter(Boolean)]);
  if (cur.startsWith('Fall')) set.add('Spring ' + (new Date().getFullYear() + 1));
  return [...set].sort((a, b) => termKey(a) - termKey(b));
}
const termLabel = t => { const cur = termOf(new Date()); return t + (t === cur ? ' (now)' : termKey(t) > termKey(cur) ? ' (next)' : ''); };
const classTime = c => c.time ? fmtTime(c.time) + (c.end ? '–' + fmtTime(c.end) : '') : '';
const nowTermClasses = () => S.sc.classes.filter(c => live(c) && c.term === termOf(new Date()));
const kKind = k => K_KINDS.find(x => x[0] === k) || K_KINDS[5];
const dayLetter = d => 'UMTWRFS'[d.getDay()];
function kGrade(cid) {
  const g = S.sc.tasks.filter(t => t.c === cid && num(t.max) > 0 && t.score !== '' && t.score != null);
  if (!g.length) return null;
  const pct = g.reduce((a, t) => a + num(t.score), 0) / g.reduce((a, t) => a + num(t.max), 0) * 100;
  return {pct, letter:pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F', n:g.length};
}
function kRow(x) {
  const c = kClass(x.c), k = kKind(x.kind), late = !x.done && x.due && x.due < today();
  return swipeWrap(`<div class="pk${x.done ? ' done' : ''}"><button class="check sm" aria-pressed="${!!x.done}" data-act="kToggle" data-id="${esc(x.id)}" aria-label="Done: ${esc(x.title)}">${ICON_CHECK}</button>
    <span>${k[1]} <b>${esc(x.title)}</b><span class="small" style="display:block;${late ? 'color:var(--danger);font-weight:700' : 'color:var(--mute)'}">${c ? `<span class="cdot" style="background:${esc(c.color)}"></span>${esc(c.name)}, ` : ''}${x.due ? (late ? 'was due ' : 'due ') + esc(fmtDay(x.due)) + (x.time ? ' at ' + fmtTime(x.time) : '') : 'no due date'}</span></span>
    <button class="link quiet" data-act="kDel" data-id="${esc(x.id)}" data-confirm aria-label="Delete ${esc(x.title)}">✕</button></div>`,
    {r:['kToggle', x.done ? 'Undo' : 'Done'], l:['kDel', 'Delete'], data:{id:x.id}});
}
const kOpenSorted = () => S.sc.tasks.filter(x => !x.done && !(kClass(x.c) || {}).archived).sort((a, b) => (a.due || '9').localeCompare(b.due || '9') || (a.time || '').localeCompare(b.time || ''));
const kClassOpts = cur => { const now = termOf(new Date()); return opt('', 'No class', cur || '') + S.sc.classes.filter(c => live(c) || c.id === cur).sort((a, b) => (a.term === now ? 0 : 1) - (b.term === now ? 0 : 1) || termKey(a.term) - termKey(b.term)).map(c => opt(c.id, c.name + (c.term && c.term !== now ? ` (${c.term})` : ''), cur || '')).join(''); };
function viewKDue() {
  const t = today(), wk = dk(new Date(Date.now() + 7 * 864e5)), open = kOpenSorted(), done = S.sc.tasks.filter(x => x.done).sort((a, b) => (b.due || '').localeCompare(a.due || ''));
  const grp = [['Overdue', open.filter(x => x.due && x.due < t)], ['Today', open.filter(x => x.due === t)], ['This week', open.filter(x => x.due > t && x.due <= wk)], ['Later', open.filter(x => !x.due || x.due > wk)]];
  return `${!S.sc.classes.length ? '<div class="card flat"><p class="small">Tip: add your classes in the Classes tab so you can tag work with them.</p></div>' : ''}
    ${grp.filter(g => g[1].length).map(([h, L]) => `<section class="card"><h2${h === 'Overdue' ? ' style="color:var(--danger)"' : ''}>${h}</h2>${L.map(kRow).join('')}</section>`).join('') || (S.sc.tasks.length ? '<div class="empty"><h2>All caught up</h2><p>Nothing due right now.</p></div>' : '')}
    <details class="card" ${det('kAdd', !S.sc.tasks.length)}><summary class="sum"><h2>Add homework, an exam or a project</h2></summary>
      <form data-form="ktask" class="stack">
        <input class="input" name="title" placeholder="What, like Lab 4 report" aria-label="What">
        <div class="ff"><label>Class<select class="input" name="c">${kClassOpts('')}</select></label><label>Type<select class="input" name="kind">${K_KINDS.map(k => opt(k[0], k[1] + ' ' + k[2], 'hw')).join('')}</select></label>
          <label>Due date<input class="input" type="date" name="due"></label><label>Time (optional)<input class="input" type="time" name="time"></label></div>
        <button class="btn" type="submit">Add</button></form></details>
    ${done.length ? `<details class="card" ${det('kDone')}><summary class="sum"><h2>Done</h2><span class="small muted">${done.length}</span></summary>${done.map(kRow).join('')}</details>` : ''}`;
}
function viewKClass() {
  const ed = UI.edit && UI.edit.kind === 'kclass' ? kClass(UI.edit.id) : null, col = ed ? ed.color : K_COLORS[S.sc.classes.length % K_COLORS.length];
  const T = termList(), sel = T.includes(S.sc.term) ? S.sc.term : termOf(new Date()), mine = S.sc.classes.filter(c => live(c) && c.term === sel);
  return `<div class="chips mb">${T.map(t => chip(`${termLabel(t)} ${S.sc.classes.filter(c => live(c) && c.term === t).length}`, t === sel, `data-act="kTerm" data-t="${esc(t)}"`)).join('')}</div>
    ${mine.length ? '' : `<div class="card flat"><p class="small">No classes in ${esc(sel)} yet. ${termKey(sel) > termKey(termOf(new Date())) ? 'Registration open? Add them below.' : 'Add them below.'}</p></div>`}
    ${mine.map(c => { const g = kGrade(c.id), tasks = S.sc.tasks.filter(t => t.c === c.id), done = tasks.filter(t => t.done);
      return `<details class="card" ${det('kc-' + c.id)}><summary class="sum"><div class="mhead"><span class="gem" style="background:${esc(c.color)};color:#fff;font-weight:900">${esc((c.code || c.name).slice(0, 3).toUpperCase())}</span>
        <div><h3>${esc(c.name)}</h3><span class="small muted">${[c.days ? c.days.split('').map(d => (K_DAYS.find(x => x[0] === d) || ['', d])[1]).join(', ') : '', classTime(c), c.room].filter(Boolean).map(esc).join(', ') || 'No schedule set'}</span>
        ${g ? `<span class="small"><b>${g.letter}</b>, ${Math.round(g.pct * 10) / 10}% from ${plural(g.n, 'grade')}</span>` : ''}</div></div></summary>
        ${c.teacher ? `<p class="small">Teacher: <b>${esc(c.teacher)}</b></p>` : ''}
        <p class="small mt">${tasks.filter(t => !t.done).length} open, ${done.length} done</p>
        ${done.length ? `<span class="label">Grades</span>${done.map(t => `<div class="lrow" style="align-items:center"><span style="flex:1;text-align:left;color:var(--ink)">${kKind(t.kind)[1]} ${esc(t.title)}</span>
          <span style="display:flex;gap:6px;align-items:center;flex:none"><input class="input" style="width:64px;min-height:38px;text-align:center" inputmode="decimal" placeholder="Score" aria-label="Score for ${esc(t.title)}" data-bind="kgrade" data-id="${esc(t.id)}" data-f="score" value="${esc(t.score ?? '')}">/
          <input class="input" style="width:64px;min-height:38px;text-align:center" inputmode="decimal" placeholder="Out of" aria-label="Out of, for ${esc(t.title)}" data-bind="kgrade" data-id="${esc(t.id)}" data-f="max" value="${esc(t.max ?? '')}"></span></div>`).join('')}<p class="note">Check off work in Due, then add the score here. Your grade updates when you leave this screen.</p>` : ''}
        <div class="row mt"><button class="link" data-act="kEditClass" data-id="${esc(c.id)}">Edit</button>${archBtn('class', c)}<button class="link danger" data-act="kDelClass" data-id="${esc(c.id)}" data-confirm>Delete class</button></div></details>`; }).join('')}
    ${archSection('class', 'classes', c => c.name + (c.code ? ', ' + c.code : ''))}
    <details class="card" ${det('kClassForm', !mine.length || !!ed)}><summary class="sum"><h2>${ed ? 'Edit ' + esc(ed.name) : 'Add a class'}</h2></summary>
      <form data-form="kclass" class="stack">
        <div class="ff"><label>Class name<input class="input" name="name" placeholder="DC Circuits" value="${fval(ed, 'name')}"></label><label>Code<input class="input" name="code" placeholder="EET 1015" value="${fval(ed, 'code')}"></label></div>
        <span class="label">Days</span><div class="chips">${K_DAYS.map(([k, l]) => `<label class="emo"><input type="checkbox" name="d_${k}"${ed && (ed.days || '').includes(k) ? ' checked' : ''}><span style="width:auto;padding:0 12px;font-size:14px;font-weight:700">${l}</span></label>`).join('')}</div>
        <div class="ff"><label>Start time<input class="input" type="time" name="time" value="${fval(ed, 'time')}"></label><label>End time<input class="input" type="time" name="end" value="${fval(ed, 'end')}"></label>
          <label>Room<input class="input" name="room" placeholder="Room or online" value="${fval(ed, 'room')}"></label><label>Semester<select class="input" name="term">${termList().map(t => opt(t, t, ed ? ed.term : sel)).join('')}</select></label></div>
        <input class="input" name="teacher" placeholder="Teacher (optional)" value="${fval(ed, 'teacher')}" aria-label="Teacher">
        <span class="label">Color</span><div class="chips">${K_COLORS.map(cl => `<label class="emo"><input type="radio" name="color" value="${cl}"${cl === col ? ' checked' : ''}><span><i style="display:block;width:22px;height:22px;border-radius:50%;background:${cl}"></i></span></label>`).join('')}</div>
        <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Add class'}</button>${ed ? '<button class="btn ghost" type="button" data-act="cancelEdit">Cancel</button>' : ''}</div></form></details>`;
}
let KQ = '';
function knList() {
  const q = norm(KQ), L = S.sc.notes.filter(n => !q || norm(n.title + ' ' + n.body).includes(q));
  if (!L.length) return emptyCard(q ? 'No matches' : 'No notes yet', q ? 'Try another word.' : 'Add formulas, definitions or anything to look up fast.');
  return L.map(n => { const c = kClass(n.c);
    return `<details class="card" ${det('kn-' + n.id, n.id === 'kref')}><summary class="sum"><h3>${esc(n.title)}</h3><span class="small muted">${c ? esc(c.name) : 'General'}</span></summary>
      <p style="white-space:pre-wrap;line-height:1.7">${esc(n.body)}</p>
      <div class="row mt"><button class="link" data-act="kEditNote" data-id="${esc(n.id)}">Edit</button><button class="link" data-act="fcFromNote" data-id="${esc(n.id)}">🃏 Make flashcards</button><button class="link danger" data-act="kDelNote" data-id="${esc(n.id)}" data-confirm>Delete</button></div></details>`; }).join('');
}
function viewKNotes() {
  const ed = UI.edit && UI.edit.kind === 'knote' ? S.sc.notes.find(n => n.id === UI.edit.id) : null;
  return `<input class="input mb" id="knSearch" type="search" placeholder="Search notes" value="${esc(KQ)}" autocomplete="off" aria-label="Search notes">
    <div id="knList">${knList()}</div>
    <details class="card" ${det('kNoteForm', !!ed)}><summary class="sum"><h2>${ed ? 'Edit note' : 'Add a note'}</h2></summary>
      <form data-form="knote" class="stack"><input class="input" name="title" placeholder="Title, like Kirchhoff's laws" value="${fval(ed, 'title')}" aria-label="Title">
        <select class="input" name="c" aria-label="Class">${kClassOpts(ed ? ed.c : '')}</select>
        <textarea class="input" name="body" style="min-height:160px" placeholder="Your notes" aria-label="Note">${fval(ed, 'body')}</textarea>
        <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Add note'}</button>${ed ? '<button class="btn ghost" type="button" data-act="cancelEdit">Cancel</button>' : ''}</div></form></details>`;
}

/* ----- Savings extras: payday split, dream amount, Japan link ----- */
function svPer(g) {
  const left = Math.max(0, num(g.target) - svSaved(g)); if (!left || !g.date) return 0;
  const dd = (keyDate(g.date) - keyDate(today())) / 864e5; if (dd <= 0) return left;
  return left / Math.max(1, Math.ceil(dd / SV_FREQ[S.sv.freq][0]));
}
function payAlloc(total) {
  const act = S.sv.goals.filter(g => live(g) && (!svDone(g) || num(g.dream) > svSaved(g)));
  if (!act.length || !(total > 0)) return {out:[], rest:total || 0};
  const cap = g => Math.max(0, (num(g.dream) > num(g.target) ? num(g.dream) : num(g.target) || Infinity) - svSaved(g));
  const amt = new Map(act.map(g => [g, 0])), r2 = x => Math.floor(x * 100) / 100;
  let rem = total;
  if (act.some(g => num(g.pct) > 0)) {
    const sum = act.reduce((a, g) => a + num(g.pct), 0);
    act.forEach(g => { const x = Math.min(cap(g), r2(total * num(g.pct) / sum)); amt.set(g, x); rem -= x; });
  } else {
    act.filter(g => g.date).forEach(g => { const x = Math.min(cap(g), r2(svPer(g)), r2(rem)); amt.set(g, x); rem -= x; });
    for (let pass = 0; pass < 3 && rem > 0.009; pass++) {
      const open = act.filter(g => amt.get(g) < cap(g) - 0.009 && (pass > 0 || !g.date));
      const pool = open.length ? open : act.filter(g => amt.get(g) < cap(g) - 0.009);
      if (!pool.length) break;
      const each = r2(rem / pool.length);
      if (each <= 0) break;
      pool.forEach(g => { const x = Math.min(cap(g) - amt.get(g), each); amt.set(g, r2(amt.get(g) + x)); rem -= x; });
    }
  }
  const out = act.map(g => ({g, amt:amt.get(g)})).filter(o => o.amt > 0);
  return {out, rest:Math.round((total - out.reduce((a, o) => a + o.amt, 0)) * 100) / 100};
}
function payPreview(a) {
  if (!(a > 0)) return '';
  const {out, rest} = payAlloc(a);
  if (!out.length) return '<p class="note">No active goals to put it in.</p>';
  return out.map(o => `<div class="lrow"><span style="text-align:left;color:var(--ink)">${esc(o.g.em || '💰')} ${esc(o.g.name)}</span><b>${usd(o.amt)}</b></div>`).join('') + (rest > 0.009 ? `<p class="note">${usd(rest)} won't fit, because those goals would be full.</p>` : '');
}
function jpSaved() {
  const gs = S.sv.goals.filter(g => g.jp); if (!gs.length) return '';
  const s = gs.reduce((a, g) => a + svSaved(g), 0), B = num(S.jp.budget);
  return `<p class="note">💰 You've saved <b>${usd(s)}</b> for this trip in Savings${B ? `, ${Math.round(s / B * 100)}% of your budget` : ''}.</p>`;
}

/* ----- Home ----- */
/* ----- Passcode ----- */
let locked = false, hiddenAt = 0, pinBuf = '', PINF = null;
async function hashPin(p) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('liftlog:' + p));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function lockHtml() {
  if (!locked && !PINF) return '';
  const title = locked ? 'Enter your passcode' : PINF.step === 'current' ? 'Enter your current passcode' : PINF.step === 'new' ? 'Choose a 4-digit passcode' : 'Enter it again to confirm';
  return `<div id="lock" role="dialog" aria-modal="true" aria-label="${title}"><div class="lk"><div class="lk-em" aria-hidden="true">🔒</div><h2>${title}</h2>
    <div class="dots4" aria-hidden="true">${[0, 1, 2, 3].map(i => `<i class="${i < pinBuf.length ? 'on' : ''}"></i>`).join('')}</div>
    <p class="small" id="lockMsg" role="alert" style="min-height:22px;color:var(--danger);font-weight:700"></p>
    <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button data-pin="${k}" aria-label="${k === '⌫' ? 'Delete' : k}">${k}</button>`).join('')}</div>
    ${locked && S.faceId && FID_OK ? '<button class="btn block mt" data-pin="face">Unlock with Face ID</button>' : ''}
    ${PINF ? '<button class="link" data-pin="cancel">Cancel</button>' : ''}</div></div>`;
}
function drawLock(msg) { $('#lockRoot').innerHTML = lockHtml(); if (msg && $('#lockMsg')) $('#lockMsg').textContent = msg; }
/* ----- Face ID (uses the iPhone's passkey system; the passcode stays as a backup) ----- */
let FID_OK = false;
try { if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
  PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(v => { FID_OK = !!v; if (locked) drawLock(); if (S.tab === 'settings') render(); }).catch(() => {}); } catch (e) {}
const fidB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fidBin = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
async function faceSetup() {
  try {
    const cred = await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)), rp:{name:'Hibi', id:location.hostname},
      user:{id:crypto.getRandomValues(new Uint8Array(16)), name:'Hibi unlock', displayName:'Hibi unlock'}, pubKeyCredParams:[{type:'public-key', alg:-7}, {type:'public-key', alg:-257}],
      authenticatorSelection:{authenticatorAttachment:'platform', userVerification:'required', residentKey:'discouraged'}, timeout:60000, attestation:'none'}});
    S.faceId = fidB64(cred.rawId); save(); render(); toast('Face ID is on. Your passcode still works as a backup.');
  } catch (e) { toast(e && e.name === 'NotAllowedError' ? 'Face ID setup was canceled.' : "Face ID isn't available here. Your passcode still works."); }
}
async function faceUnlock(auto) {
  try {
    await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)), rpId:location.hostname, userVerification:'required', timeout:60000,
      allowCredentials:[{type:'public-key', id:fidBin(S.faceId), transports:['internal']}]}});
    locked = false; pinBuf = ''; drawLock(); setTimeout(wrapCheck, 300);
  } catch (e) { drawLock(auto ? '' : e && e.name === 'NotAllowedError' ? 'Face ID was canceled. Use your passcode.' : "Face ID didn't work. Use your passcode."); }
}
async function pinKey(k) {
  if (k === 'face') { faceUnlock(); return; }
  if (k === 'cancel') { PINF = null; pinBuf = ''; drawLock(); return; }
  if (k === '⌫') { pinBuf = pinBuf.slice(0, -1); drawLock(); return; }
  if (pinBuf.length >= 4) return;
  pinBuf += k; drawLock(); if (pinBuf.length < 4) return;
  const entered = pinBuf; pinBuf = '';
  const bad = m => { drawLock(m); try { navigator.vibrate && navigator.vibrate(150); } catch (e) {} };
  if (locked) { if (await hashPin(entered) === S.pin) { locked = false; drawLock(); setTimeout(wrapCheck, 300); } else { sxBump('pinWrong'); save(); bad('Wrong passcode. Try again.'); } return; }
  if (PINF.step === 'current') {
    if (await hashPin(entered) !== S.pin) return bad("That isn't your current passcode.");
    if (PINF.then === 'off') { S.pin = ''; S.faceId = ''; PINF = null; save(); drawLock(); render(); toast('Passcode turned off.'); return; }
    PINF = {step:'new'}; drawLock(); return;
  }
  if (PINF.step === 'new') { PINF = {step:'confirm', first:entered}; drawLock(); return; }
  if (entered !== PINF.first) { PINF = {step:'new'}; return bad("Those didn't match. Choose one again."); }
  S.pin = await hashPin(entered); PINF = null; save(); drawLock(); render(); toast('Passcode set.');
}
document.addEventListener('click', e => { const k = e.target.closest('[data-pin]'); if (k) { e.stopPropagation(); e.preventDefault(); pinKey(k.dataset.pin); } }, true);
document.addEventListener('keydown', e => {
  if (!locked && !PINF) return;
  if (/^\d$/.test(e.key)) { e.preventDefault(); pinKey(e.key); } else if (e.key === 'Backspace') { e.preventDefault(); pinKey('⌫'); }
}, true);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  else if (S.pin && hiddenAt && Date.now() - hiddenAt > 60000) { locked = true; pinBuf = ''; drawLock(); }
});
const pinSupported = () => !!(window.crypto && crypto.subtle);
function settingsCommon() {
  return `    <section class="card"><h2>Passcode</h2>
      <p class="note">${S.pin ? 'The app asks for your passcode when it opens and after a minute in the background.' : 'Ask for a 4-digit passcode when the app opens.'} It stops people from casually looking, but it isn't as strong as Face ID. If you forget it, you'd have to erase the app's data, so keep a backup.</p>
      <div class="btns mt">${S.pin ? '<button class="btn ghost" data-act="pinChange">Change passcode</button><button class="btn ghost" data-act="pinOff">Turn off</button>' : '<button class="btn" data-act="pinSet">Set a passcode</button>'}</div>
      ${S.pin && FID_OK ? `<div class="setrow mt"><span>Unlock with Face ID</span>${S.faceId ? '<button class="btn sm ghost" data-act="faceOff">Turn off</button>' : '<button class="btn sm" data-act="faceOn">Turn on</button>'}</div>
      <p class="note">${S.faceId ? 'The lock screen shows an Unlock with Face ID button. Your passcode still works too.' : 'Your iPhone saves a passkey called "Hibi unlock" in Passwords. That\'s how Face ID works for web apps. Nothing leaves your phone.'}</p>` : S.pin ? '' : '<p class="note">Set a passcode first to turn on Face ID.</p>'}</section>
`;
}

/* ----- Actions and forms ----- */
const XVIEWS = {kdue:viewKDue, kclass:viewKClass, knotes:viewKNotes};
const XACT = {
  homeTpl: d => { S.lastMode[S.mode] = S.tab; S.mode = 'gym'; ACT.startTpl(d); go('workout'); },
  faceOn: () => { faceSetup(); return false; },
  faceOff: () => { S.faceId = ''; toast('Face ID unlock is off. Remove the "Hibi unlock" passkey in the Passwords app if you like.'); },
  kTerm: d => { S.sc.term = d.t; delete UI.open.kClassForm; },
  modeMove: d => { const o = S.order, i = o.indexOf(d.k), j = i + (+d.n); if (i < 0 || j < 0 || j >= o.length) return false; [o[i], o[j]] = [o[j], o[i]]; },
  homeGym: () => { S.lastMode[S.mode] = S.tab; S.mode = 'gym'; go('workout'); },
  kToggle: d => { const x = S.sc.tasks.find(t => t.id === d.id); if (!x) return false; x.done = !x.done; x.doneAt = x.done ? Date.now() : 0; if (x.done) toast(`Done: ${x.title}`); },
  kDel: d => { S.sc.tasks = S.sc.tasks.filter(t => t.id !== d.id); },
  kEditClass: d => { UI.edit = {kind:'kclass', id:d.id}; UI.open.kClassForm = true; },
  kDelClass: d => { S.sc.classes = S.sc.classes.filter(c => c.id !== d.id); S.sc.tasks.forEach(t => { if (t.c === d.id) t.c = ''; }); S.sc.notes.forEach(n => { if (n.c === d.id) n.c = ''; }); },
  kEditNote: d => { UI.edit = {kind:'knote', id:d.id}; UI.open.kNoteForm = true; },
  kDelNote: d => { S.sc.notes = S.sc.notes.filter(n => n.id !== d.id); },
  pinSet: () => { if (!pinSupported()) { toast('Passcodes work when you open the app from your Home Screen.'); return false; } PINF = {step:'new'}; pinBuf = ''; drawLock(); return false; },
  pinChange: () => { PINF = {step:'current', then:'set'}; pinBuf = ''; drawLock(); return false; },
  pinOff: () => { PINF = {step:'current', then:'off'}; pinBuf = ''; drawLock(); return false; },
};
Object.assign(SAVE, {
  ktask: o => {
    if (!o.title) { toast('Add what it is first.'); return false; }
    S.sc.tasks.push({id:'k' + Date.now(), title:o.title, c:o.c || '', kind:o.kind || 'hw', due:o.due || '', time:o.time || '', done:false, score:'', max:''});
    toast('Added.'); UI.open.kAdd = false;
  },
  kclass: o => {
    if (!o.name) { toast('Add the class name.'); return false; }
    const rec = {name:o.name, code:o.code || '', days:K_DAYS.map(d => d[0]).filter(k => o['d_' + k]).join(''), time:o.time || '', end:o.end || '', term:o.term || termOf(new Date()), room:o.room || '', teacher:o.teacher || '', color:o.color || K_COLORS[0]};
    const ed = UI.edit && UI.edit.kind === 'kclass' ? kClass(UI.edit.id) : null;
    if (ed) { Object.assign(ed, rec); toast('Class updated.'); } else { S.sc.classes.push(Object.assign(rec, {id:'c' + Date.now()})); toast(`Added ${rec.name} to ${rec.term}.`); }
    S.sc.term = rec.term;
    UI.open.kClassForm = false;
  },
  knote: o => {
    if (!o.title && !o.body) { toast('Write something first.'); return false; }
    const rec = {title:o.title || 'Untitled', c:o.c || '', body:o.body || ''};
    const ed = UI.edit && UI.edit.kind === 'knote' ? S.sc.notes.find(n => n.id === UI.edit.id) : null;
    if (ed) Object.assign(ed, rec); else S.sc.notes.unshift(Object.assign(rec, {id:'n' + Date.now()}));
    toast(ed ? 'Note updated.' : 'Note added.'); UI.open.kNoteForm = false;
  },
  payday: o => {
    const {out} = payAlloc(num(o.amt)); if (!out.length) { toast('Enter an amount to split.'); return false; }
    const reached = [];
    out.forEach((x, i) => {
      const before = svSaved(x.g); S.sv.tx.push({id:'t' + Date.now() + '-' + i, g:x.g.id, amt:x.amt, d:today(), note:'Payday'});
      if (num(x.g.target) && before < num(x.g.target) && before + x.amt >= num(x.g.target)) { x.g.done = Date.now(); reached.push(x.g.name); }
    });
    toast(reached.length ? `🎉 Goal reached: ${reached.join(', ')}!` : `Saved ${usd(out.reduce((a, x) => a + x.amt, 0))} across ${plural(out.length, 'goal')}.`);
    UI.open.payday = false;
  }});

/* ----- Patch notes (reads CHANGELOG.md, which the offline cache keeps) ----- */
let NOTES = null;
function mdLite(md) {
  const out = []; let list = false;
  const inline = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`(.+?)`/g, '<code>$1</code>');
  const close = () => { if (list) { out.push('</ul>'); list = false; } };
  md.split('\n').forEach(l => {
    const t = l.trim(); let m;
    if (!t) return close();
    if (t === '---') { close(); out.push('<hr>'); return; }
    if ((m = /^(#{1,3})\s+(.*)$/.exec(t))) { close(); if (m[1].length > 1) out.push(`<h${m[1].length + 1}>${inline(m[2])}</h${m[1].length + 1}>`); return; }
    if ((m = /^[-*]\s+(.*)$/.exec(t))) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li${/^\s{2,}/.test(l) ? ' class="sub"' : ''}>${inline(m[1])}</li>`); return; }
    close(); out.push(`<p>${inline(t)}</p>`);
  });
  close(); return out.join('');
}
function loadNotes() {
  fetch('CHANGELOG.md', {cache:'no-cache'}).then(r => { if (!r.ok) throw 0; return r.text(); })
    .then(t => { NOTES = mdLite(t); const b = $('#notesBody'); if (b) b.innerHTML = NOTES; })
    .catch(() => { const b = $('#notesBody'); if (b && !NOTES) b.innerHTML = '<p class="note">Patch notes load in the Hibi app on your Home Screen. Open it from cynnity.github.io/Hibi to read them.</p>'; });
}
const notesSheet = () => `<div id="sheet" data-act="closeNotes"><div class="panel" data-act="noop" role="dialog" aria-modal="true" aria-label="Patch notes">
  <div class="row"><h2>Patch notes</h2><button class="link" data-act="closeNotes">Done</button></div>
  <div class="notes" id="notesBody">${NOTES || '<p class="note">Loading patch notes</p>'}</div></div></div>`;
Object.assign(XACT, {
  openNotes: () => { UI.notes = true; S.seenVer = APP_VERSION; loadNotes(); },
  closeNotes: () => { UI.notes = false; },
  seenUpdate: () => { S.seenVer = APP_VERSION; },
});

/* ----- Archive: hide things without deleting them ----- */
const ARCH = {cat:() => S.cats, ex:() => S.ex, tpl:() => S.tpl, class:() => S.sc.classes, goal:() => S.sv.goals, media:() => S.md.items, game:() => S.gm.items};
const live = x => !x.archived;
const archBtn = (kind, x, style) => `<button class="link" data-act="arch" data-kind="${kind}" data-id="${esc(x.id)}"${style ? ` style="${style}"` : ''}>${x.archived ? 'Restore' : 'Archive'}</button>`;
function archSection(kind, label, nameOf) {
  const a = ARCH[kind]().filter(x => x.archived); if (!a.length) return '';
  return `<details class="card flat" ${det('arch-' + kind)}><summary class="sum"><h2>Archived ${label}</h2><span class="small muted">${a.length} hidden. Restore any time.</span></summary>
    ${a.map(x => `<div class="lrow" style="align-items:center"><span style="text-align:left;color:var(--ink)">${esc(nameOf(x))}</span>${archBtn(kind, x)}</div>`).join('')}</details>`;
}
Object.assign(XACT, {arch: d => {
  const x = ARCH[d.kind]().find(y => y.id === d.id); if (!x) return false;
  x.archived = !x.archived;
  if (d.kind === 'tpl' && x.archived && S.next === x.id) S.next = null;
  if (d.kind === 'cat' && x.archived && S.cf === x.id) S.cf = 'all';
  toast(x.archived ? 'Archived. It\'s hidden, not deleted.' : 'Restored.');
}});
