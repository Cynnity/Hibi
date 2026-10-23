// Hibi: Health & Habits mode. Daily habits with streaks, water in fl oz, and sleep.
'use strict';
/* =========================================================
   Health & Habits
   ========================================================= */
Object.assign(ICON, {
  moon:'<path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.4 6.4 0 0 0 10.1 10.1z"/>',
  habit:'<path d="M12 20.5c4.5-2.6 7.5-6.2 7.5-10.2a7.5 7.5 0 0 0-15 0c0 4 3 7.6 7.5 10.2z"/><path d="M8.8 10.6l2.2 2.2 4.2-4.4"/>'});
MODES.health = {label:'Health', em:'🌿', nav:[['hltoday','Today','daily'],['hlhab','Habits','habit'],['hlsleep','Sleep','moon'],['settings','Settings','settings']]};
Object.assign(TAB_INFO, {hltoday:{g:'hltoday',t:'Today'}, hlhab:{g:'hlhab',t:'Habits'}, hlsleep:{g:'hlsleep',t:'Sleep'}});
Object.assign(GROUPS, {hltoday:['hltoday'], hlhab:['hlhab'], hlsleep:['hlsleep']});

const HL_DAYS = [[1,'M','Mon'],[2,'T','Tue'],[3,'W','Wed'],[4,'T','Thu'],[5,'F','Fri'],[6,'S','Sat'],[0,'S','Sun']];
const HL_SUGGEST = [['🧘','Stretch'],['📖','Read 10 pages'],['🧴','Skincare'],['🦷','Floss'],['🚶','Go for a walk'],['📵','No phone in bed'],['🧹','Tidy up for 10 min'],['🗣️','Practice Japanese'],['🛏️','Make the bed'],['🙏','Write 3 good things']];
const HL_EMOJI = ['✅','🧘','📖','🧴','🦷','🚶','🏃','📵','🧹','🗣️','🛏️','🙏','💊','🥗','🍎','☀️','🌙','💧','✍️','🎸','🎨','💻','🧠','🪴','🐶','💰','📚','🎧','🚭','☕'];
const SLEEP_Q = [['😫','Awful'],['😕','Rough'],['😐','Okay'],['🙂','Good'],['😴','Great']];

function normalizeHl(s) {
  if (!s.hl || typeof s.hl !== 'object') s.hl = {};
  const h = s.hl;
  if (!Array.isArray(h.habits)) h.habits = [];
  h.habits.forEach(x => { if (!Array.isArray(x.days) || !x.days.length) x.days = [0, 1, 2, 3, 4, 5, 6]; if (!x.em) x.em = '✅'; });
  if (!h.done || typeof h.done !== 'object' || Array.isArray(h.done)) h.done = {};
  if (!h.water || typeof h.water !== 'object' || Array.isArray(h.water)) h.water = {};
  if (!(h.goal > 0)) h.goal = 64;          // fl oz a day
  if (!(h.bottle > 0)) h.bottle = 32;      // fl oz in his usual bottle
  if (!Array.isArray(h.sleep)) h.sleep = [];
  if (!(h.sleepGoal > 0)) h.sleepGoal = 8; // hours
}
const hlR1 = n => Math.round(n * 10) / 10;
const hlAdd = (k, n) => { const d = keyDate(k); d.setDate(d.getDate() + n); return dk(d); };
/* ----- Water ----- */
const waterOz = k => (S.hl.water[k] || []).reduce((t, x) => t + num(x[1]), 0);
const ozTxt = n => fmtN(hlR1(n)) + ' fl oz';
function waterStreak() {
  let n = 0, k = today(); if (waterOz(k) < S.hl.goal) k = hlAdd(k, -1);
  while (waterOz(k) >= S.hl.goal && n < 999) { n++; k = hlAdd(k, -1); }
  return n;
}
/* ----- Habits ----- */
const hlLive = () => S.hl.habits.filter(live);
const hlDue = (x, k) => x.days.includes(keyDate(k).getDay()) && (!x.created || k >= dk(new Date(x.created)));
const hlDid = (x, k) => (S.hl.done[k] || []).includes(x.id);
// Streak: scheduled days in a row that were done. Today only breaks it once the day is over.
function hlStreak(x) {
  let n = 0, k = today(), guard = 0;
  if (hlDue(x, k) && !hlDid(x, k)) k = hlAdd(k, -1);
  while (guard++ < 800) {
    if (x.created && k < dk(new Date(x.created))) break;
    if (hlDue(x, k)) { if (!hlDid(x, k)) break; n++; }
    k = hlAdd(k, -1);
  }
  return n;
}
function hlBest(x) {
  const ks = Object.keys(S.hl.done).filter(k => S.hl.done[k].includes(x.id)).sort(); if (!ks.length) return 0;
  let best = 0, run = 0, k = ks[0]; const end = today();
  for (let g = 0; k <= end && g < 1500; g++, k = hlAdd(k, 1)) { if (!hlDue(x, k) && !hlDid(x, k)) continue; if (hlDid(x, k)) { run++; best = Math.max(best, run); } else if (k < end) run = 0; }
  return best;
}
const hlToday = () => hlLive().filter(x => hlDue(x, today()));
const hlDaysTxt = x => x.days.length === 7 ? 'Every day' : x.days.join() === '1,2,3,4,5' ? 'Weekdays' : x.days.join() === '0,6' || x.days.join() === '6,0' ? 'Weekends' : HL_DAYS.filter(d => x.days.includes(d[0])).map(d => d[2]).join(', ');
/* ----- Sleep ----- */
const slMin = x => { let m = hm(x.wake) - hm(x.bed); if (m <= 0) m += 1440; return m; };
const slTxt = m => `${Math.floor(m / 60)} h${m % 60 ? ' ' + Math.round(m % 60) + ' min' : ''}`;
const slSorted = () => [...S.hl.sleep].sort((a, b) => b.d.localeCompare(a.d));
function slAvg(days) {
  const from = hlAdd(today(), -(days - 1)), L = S.hl.sleep.filter(x => x.d >= from);
  return L.length ? {m:L.reduce((t, x) => t + slMin(x), 0) / L.length, n:L.length} : null;
}

/* ----- Rows ----- */
function hlRow(x, k) {
  const did = hlDid(x, k || today()), st = hlStreak(x);
  return swipeWrap(`<div class="pk hl${did ? ' done' : ''}"><button class="check" aria-pressed="${did}" data-act="hlToggle" data-id="${esc(x.id)}" aria-label="Done: ${esc(x.name)}">${ICON_CHECK}</button>
    <span><b>${esc(x.em)} ${esc(x.name)}</b><span class="small muted" style="display:block">${st ? `🔥 ${plural(st, 'day')} in a row` : did ? 'Started a streak!' : 'Start a streak today'}</span></span></div>`,
    {r:['hlToggle', did ? 'Undo' : 'Done'], data:{id:x.id}});
}
const weekDots = (on, label) => `<div class="dots" aria-label="${esc(label)}">${[...Array(7)].map((_, i) => { const d = daysBack(6 - i), k = dk(d), v = on(k);
  return `<span class="dot${v === 1 ? ' on' : v === 0 ? '' : ' off'}${i === 6 ? ' today' : ''}" title="${esc(fmtMD(d))}">${'SMTWTFS'[d.getDay()]}</span>`; }).join('')}</div>`;

/* ----- Today ----- */
function waterCard(compact) {
  const H = S.hl, oz = waterOz(today()), pct = Math.min(100, oz / H.goal * 100), st = waterStreak(), L = H.water[today()] || [];
  return `<section class="card water"><div class="row"><h2>💧 Water</h2>${st ? `<span class="small muted">🔥 ${plural(st, 'day')} at your goal</span>` : ''}</div>
    <div class="trend"><b>${fmtN(hlR1(oz))}<small> / ${fmtN(H.goal)} fl oz</small></b><span>${oz >= H.goal ? '🎉 Goal reached!' : `${ozTxt(H.goal - oz)} to go`}</span></div>
    <div class="meter wmeter"><i style="width:${pct}%"></i></div>
    <div class="btns mt wbtns">${[8, 16].map(n => `<button class="btn sm ghost" data-act="hlWater" data-n="${n}" data-hap>+${n} oz</button>`).join('')}<button class="btn sm" data-act="hlWater" data-n="${H.bottle}" data-hap>🥤 +${fmtN(H.bottle)} oz bottle</button></div>
    ${compact ? '' : `<form data-form="hlwater" class="field mt"><input class="input" name="oz" inputmode="decimal" placeholder="Other amount in fl oz" aria-label="Fluid ounces"><button class="btn ghost" type="submit">Add</button></form>
    ${L.length ? `<div class="row mt"><span class="small muted">${plural(L.length, 'drink')} today, last at ${esc(new Date(L[L.length - 1][0]).toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}))}</span><button class="link" data-act="hlWaterUndo">Undo last</button></div>` : ''}
    ${weekDots(k => waterOz(k) >= H.goal ? 1 : 0, 'Days you hit your water goal this week')}`}</section>`;
}
function habitsCard() {
  const L = hlToday(), done = L.filter(x => hlDid(x, today())).length;
  if (!hlLive().length) return `<section class="card"><h2>✅ Habits</h2><p class="note">Pick something small you want to do every day and build a streak.</p>
    <div class="chips mt">${HL_SUGGEST.slice(0, 6).map(([e, n]) => `<button class="chip" data-act="hlQuick" data-em="${e}" data-n="${esc(n)}">${e} ${esc(n)}</button>`).join('')}</div>
    <button class="link mt" data-act="go" data-to="hlhab">Make your own</button></section>`;
  return `<section class="card"><div class="row"><h2>✅ Habits</h2><b>${done} / ${L.length}</b></div>
    ${L.length ? `<div class="meter"><i style="width:${L.length ? done / L.length * 100 : 0}%"></i></div>${L.map(x => hlRow(x)).join('')}
    <p class="note">Tip: swipe a habit right to check it off.</p>` : '<p class="note">Nothing scheduled today. Enjoy the day off.</p>'}</section>`;
}
function sleepCard() {
  const last = slSorted()[0], t = today(), logged = last && last.d === t, a = slAvg(7);
  return `<section class="card"><div class="row"><h2>🌙 Sleep</h2>${a ? `<span class="small muted">${slTxt(Math.round(a.m))} average this week</span>` : ''}</div>
    ${logged ? `<div class="trend"><b>${slTxt(slMin(last))}</b><span>last night, ${esc(fmtTime(last.bed))} to ${esc(fmtTime(last.wake))}${last.q ? ' ' + SLEEP_Q[last.q - 1][0] : ''}</span></div>`
      : `<p class="note">How did you sleep last night?</p>${sleepForm(null, true)}`}</section>`;
}
function viewHlToday() {
  return `${waterCard()}${habitsCard()}${sleepCard()}`;
}

/* ----- Habits tab ----- */
function viewHlHab() {
  const L = hlLive(), ed = UI.edit && UI.edit.kind === 'habit' ? S.hl.habits.find(x => x.id === UI.edit.id) : null;
  const em = UI.hlEm || (ed ? ed.em : '✅'), days = UI.hlDays || (ed ? ed.days : [0, 1, 2, 3, 4, 5, 6]);
  return `${L.length ? `<section class="card"><div class="row"><h2>Your habits</h2><span class="small muted">Drag ⠿ to reorder</span></div><div data-sort="habits">
    ${L.map(x => { const st = hlStreak(x), best = hlBest(x);
      return `<div class="hlh" data-sid="${esc(x.id)}">${swipeWrap(`<div class="hlh-in"><span class="grip" aria-label="Drag to reorder ${esc(x.name)}">⠿</span>
        <div style="flex:1;min-width:0"><b>${esc(x.em)} ${esc(x.name)}</b><span class="small muted" style="display:block">${esc(hlDaysTxt(x))} · 🔥 ${st} now · best ${best}</span>
        ${weekDots(k => hlDue(x, k) ? (hlDid(x, k) ? 1 : 0) : -1, 'This week for ' + x.name)}</div>
        <button class="check sm" aria-pressed="${hlDid(x, today())}" data-act="hlToggle" data-id="${esc(x.id)}" aria-label="Done today: ${esc(x.name)}">${ICON_CHECK}</button></div>
        <div class="row" style="justify-content:flex-start;gap:16px;padding:0 0 10px 34px"><button class="link" data-act="hlEdit" data-id="${esc(x.id)}">Edit</button>${archBtn('habit', x)}<button class="link danger" data-act="hlDel" data-id="${esc(x.id)}" data-confirm>Delete</button></div>`,
        {r:['hlToggle', 'Done'], l:['hlEdit', 'Edit'], data:{id:x.id}})}</div>`; }).join('')}</div>
    <p class="note">Swipe right to check off today, left to edit.</p></section>` : ''}
    ${archSection('habit', 'habits', x => x.em + ' ' + x.name)}
    <details class="card" ${det('hlForm', !L.length || !!ed)}><summary class="sum"><h2>${ed ? 'Edit habit' : 'Add a habit'}</h2></summary>
      <form data-form="habit" class="stack">
        <input class="input" name="name" placeholder="What, like Stretch for 5 minutes" value="${esc(UI.hlDraft && UI.hlDraft.name != null ? UI.hlDraft.name : ed ? ed.name : '')}" aria-label="Habit">
        <span class="label">Icon</span><div class="emgrid">${HL_EMOJI.map(e => `<button type="button" class="emb${e === em ? ' on' : ''}" data-act="hlEm" data-em="${e}" aria-pressed="${e === em}">${e}</button>`).join('')}</div>
        <span class="label">Which days</span><div class="chips">${HL_DAYS.map(([n, , l]) => chip(l, days.includes(n), `type="button" data-act="hlDay" data-n="${n}"`)).join('')}</div>
        <div class="chips">${chip('Every day', days.length === 7, 'type="button" data-act="hlDaySet" data-s="all"')}${chip('Weekdays', days.slice().sort().join() === '1,2,3,4,5', 'type="button" data-act="hlDaySet" data-s="wk"')}${chip('Weekends', days.slice().sort().join() === '0,6', 'type="button" data-act="hlDaySet" data-s="we"')}</div>
        <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Add habit'}</button>${ed ? '<button class="btn ghost" type="button" data-act="cancelEdit">Cancel</button>' : ''}</div></form>
      ${ed ? '' : `<span class="label">Ideas</span><div class="chips">${HL_SUGGEST.filter(([, n]) => !L.some(x => norm(x.name) === norm(n))).map(([e, n]) => `<button class="chip" data-act="hlQuick" data-em="${e}" data-n="${esc(n)}">${e} ${esc(n)}</button>`).join('')}</div>`}</details>`;
}

/* ----- Sleep tab ----- */
function sleepForm(ed, quick) {
  const d = ed ? ed.d : today(), last = slSorted()[0];
  return `<form data-form="sleep" class="stack${quick ? ' mt' : ''}">
    <div class="ff"><label>Went to bed<input class="input" type="time" name="bed" value="${esc(ed ? ed.bed : last ? last.bed : '23:30')}"></label><label>Woke up<input class="input" type="time" name="wake" value="${esc(ed ? ed.wake : last ? last.wake : '07:30')}"></label></div>
    ${quick ? '<input type="hidden" name="d" value="' + today() + '">' : `<div class="ff one"><label>Morning you woke up<input class="input" type="date" name="d" value="${esc(d)}" max="${today()}"></label></div>`}
    <div class="chips">${SLEEP_Q.map(([e, l], i) => `<label class="emo"><input type="radio" name="q" value="${i + 1}"${ed && ed.q === i + 1 ? ' checked' : ''}><span title="${l}">${e}</span></label>`).join('')}</div>
    <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Log sleep'}</button>${ed ? '<button class="btn ghost" type="button" data-act="cancelEdit">Cancel</button>' : ''}</div></form>`;
}
function viewHlSleep() {
  const L = slSorted(), ed = UI.edit && UI.edit.kind === 'sleep' ? S.hl.sleep.find(x => x.id === UI.edit.id) : null, a7 = slAvg(7), a30 = slAvg(30), G = S.hl.sleepGoal;
  const pts = [...L].reverse().slice(-30).map(x => ({l:fmtMD(keyDate(x.d)), v:hlR1(slMin(x) / 60)}));
  const bedAvg = L.length >= 3 ? (() => { const ms = L.slice(0, 7).map(x => { const m = hm(x.bed); return m < 720 ? m + 1440 : m; }); const v = Math.round(ms.reduce((t, x) => t + x, 0) / ms.length) % 1440; return fmtTime(pad(Math.floor(v / 60)) + ':' + pad(v % 60)); })() : '';
  return `${L.length ? `<section class="card"><h2>This week</h2>
      <div class="stats"><div class="stat"><b>${a7 ? hlR1(a7.m / 60) : '–'}</b><span>h a night</span></div><div class="stat"><b>${a7 ? S.hl.sleep.filter(x => x.d >= hlAdd(today(), -6) && slMin(x) >= G * 60).length : 0}</b><span>nights ${G}+ h</span></div><div class="stat"><b>${a30 ? hlR1(a30.m / 60) : '–'}</b><span>h, 30 days</span></div></div>
      ${bedAvg ? `<p class="note">You usually go to bed around <b>${esc(bedAvg)}</b>. Your goal is ${plural(G, 'hour')} a night.</p>` : ''}
      ${lineChart(pts, 'h')}</section>` : ''}
    <details class="card" ${det('slForm', !L.length || !!ed || !(L[0] && L[0].d === today()))}><summary class="sum"><h2>${ed ? 'Edit sleep' : 'Log sleep'}</h2></summary>${sleepForm(ed)}</details>
    ${L.length ? `<section class="card"><h2>Nights</h2>${L.slice(0, UI.slAll ? 400 : 14).map(x => swipeWrap(`<div class="lrow"><b>${esc(fmtDay(x.d))}<small class="muted" style="font-weight:600">${esc(fmtTime(x.bed))} to ${esc(fmtTime(x.wake))}${x.q ? ' · ' + SLEEP_Q[x.q - 1][0] + ' ' + SLEEP_Q[x.q - 1][1] : ''}</small></b>
      <span><b style="color:${slMin(x) >= G * 60 ? 'var(--good)' : 'var(--ink)'}">${slTxt(slMin(x))}</b><span style="display:flex;gap:12px;justify-content:flex-end"><button class="link" data-act="slEdit" data-id="${esc(x.id)}">Edit</button><button class="link danger" data-act="slDel" data-id="${esc(x.id)}" data-confirm>Delete</button></span></span></div>`,
      {l:['slDel', 'Delete'], data:{id:x.id}})).join('')}
      ${L.length > 14 && !UI.slAll ? `<button class="link mt" data-act="slAll">Show all ${L.length} nights</button>` : ''}<p class="note">Swipe a night left to delete it.</p></section>` : ''}`;
}

/* ----- Settings ----- */
function hlSettings() {
  const H = S.hl;
  return `    <section class="card"><h2>Health</h2>
      <label class="setrow"><span>Daily water goal</span><select class="input" data-bind="hlset" data-k="goal">${[48, 56, 64, 72, 80, 96, 100, 120, 128].map(n => `<option value="${n}"${H.goal === n ? ' selected' : ''}>${n} fl oz</option>`).join('')}</select></label>
      <label class="setrow"><span>Your water bottle</span><select class="input" data-bind="hlset" data-k="bottle">${[12, 16, 20, 24, 30, 32, 40, 64].map(n => `<option value="${n}"${H.bottle === n ? ' selected' : ''}>${n} fl oz</option>`).join('')}</select></label>
      <label class="setrow"><span>Sleep goal</span><select class="input" data-bind="hlset" data-k="sleepGoal">${[6, 6.5, 7, 7.5, 8, 8.5, 9].map(n => `<option value="${n}"${H.sleepGoal === n ? ' selected' : ''}>${n} hours</option>`).join('')}</select></label>
      <p class="note">A common goal is about 64 fl oz of water a day, more on gym days. The bottle button adds your whole bottle in one tap.</p></section>
`;
}
const hlSubtitle = () => {
  if (S.tab === 'hlsleep') { const a = slAvg(7); return a ? `${slTxt(Math.round(a.m))} a night this week` : 'Track how you sleep'; }
  const L = hlToday(); return `${ozTxt(waterOz(today()))} of water · ${L.filter(x => hlDid(x, today())).length} of ${plural(L.length, 'habit')} done`;
};

/* ----- Actions and forms ----- */
ARCH.habit = () => S.hl.habits;
Object.assign(XVIEWS, {hltoday:viewHlToday, hlhab:viewHlHab, hlsleep:viewHlSleep});
Object.assign(XACT, {
  hlWater: d => { const k = today(), n = num(d.n); if (!(n > 0)) return false; const was = waterOz(k);
    (S.hl.water[k] = S.hl.water[k] || []).push([Date.now(), n]);
    if (was < S.hl.goal && was + n >= S.hl.goal) { setTimeout(() => confetti(30), 80); toast('💧 Water goal reached!'); } else toast(`+${fmtN(n)} fl oz. ${ozTxt(waterOz(k))} today.`); },
  hlWaterUndo: () => { const L = S.hl.water[today()]; if (!L || !L.length) return false; const x = L.pop(); toast(`Removed ${fmtN(x[1])} fl oz.`); },
  hlToggle: d => { const k = today(), x = S.hl.habits.find(h => h.id === d.id); if (!x) return false; S.hl.done[k] = S.hl.done[k] || []; toggleIn(S.hl.done[k], x.id);
    if (hlDid(x, k)) { const st = hlStreak(x); const all = hlToday().every(h => hlDid(h, k));
      if (all && hlToday().length > 1) { setTimeout(() => confetti(36), 80); toast('🎉 Every habit done today!'); } else toast(st > 1 ? `🔥 ${st} days in a row: ${x.name}` : `Done: ${x.name}`); } },
  hlQuick: d => { S.hl.habits.push({id:'h' + Date.now(), name:d.n, em:d.em, days:[0, 1, 2, 3, 4, 5, 6], created:Date.now()}); toast(`Added ${d.em} ${d.n}. Check it off when you do it.`); },
  hlEm: d => { UI.hlEm = d.em; keepForm('habit'); },
  hlDay: d => { const ed = UI.edit && UI.edit.kind === 'habit' ? S.hl.habits.find(x => x.id === UI.edit.id) : null; UI.hlDays = (UI.hlDays || (ed ? ed.days : [0, 1, 2, 3, 4, 5, 6])).slice(); toggleIn(UI.hlDays, +d.n); if (!UI.hlDays.length) UI.hlDays.push(+d.n); keepForm('habit'); },
  hlDaySet: d => { UI.hlDays = d.s === 'all' ? [0, 1, 2, 3, 4, 5, 6] : d.s === 'wk' ? [1, 2, 3, 4, 5] : [0, 6]; keepForm('habit'); },
  hlEdit: d => { UI.edit = {kind:'habit', id:d.id}; UI.hlEm = null; UI.hlDays = null; UI.hlDraft = null; UI.open.hlForm = true; if (S.tab !== 'hlhab') go('hlhab'); setTimeout(() => { const f = $('form[data-form="habit"]'); if (f) f.scrollIntoView({behavior:'smooth', block:'center'}); }, 60); },
  hlDel: d => { S.hl.habits = S.hl.habits.filter(x => x.id !== d.id); Object.values(S.hl.done).forEach(L => { const i = L.indexOf(d.id); if (i >= 0) L.splice(i, 1); }); },
  slEdit: d => { UI.edit = {kind:'sleep', id:d.id}; UI.open.slForm = true; },
  slDel: d => { S.hl.sleep = S.hl.sleep.filter(x => x.id !== d.id); },
  slAll: () => { UI.slAll = true; },
});
// Keeps typed text in the habit form when tapping an icon or a day
function keepForm(kind) { const f = $(`form[data-form="${kind}"]`); if (f) UI.hlDraft = Object.fromEntries(new FormData(f)); }
Object.assign(SAVE, {
  hlwater: o => { const n = num(o.oz); if (!(n > 0 && n <= 200)) { toast('Enter how many fl oz.'); return false; } XACT.hlWater({n}); },
  habit: o => {
    const name = (o.name || (UI.hlDraft && UI.hlDraft.name) || '').trim(); if (!name) { toast('Name the habit first.'); return false; }
    const ed = UI.edit && UI.edit.kind === 'habit' ? S.hl.habits.find(x => x.id === UI.edit.id) : null;
    const rec = {name, em:UI.hlEm || (ed ? ed.em : '✅'), days:(UI.hlDays || (ed ? ed.days : [0, 1, 2, 3, 4, 5, 6])).slice().sort()};
    if (ed) { Object.assign(ed, rec); toast('Habit updated.'); } else { S.hl.habits.push(Object.assign(rec, {id:'h' + Date.now(), created:Date.now()})); toast(`Added ${rec.em} ${rec.name}.`); }
    UI.hlEm = null; UI.hlDays = null; UI.hlDraft = null; UI.edit = null; UI.open.hlForm = false;
  },
  sleep: o => {
    if (!o.bed || !o.wake) { toast('Add when you went to bed and woke up.'); return false; }
    const rec = {d:o.d || today(), bed:o.bed, wake:o.wake, q:+o.q || 0};
    const ed = UI.edit && UI.edit.kind === 'sleep' ? S.hl.sleep.find(x => x.id === UI.edit.id) : null;
    if (ed) Object.assign(ed, rec); else { S.hl.sleep = S.hl.sleep.filter(x => x.d !== rec.d); S.hl.sleep.push(Object.assign(rec, {id:'z' + Date.now()})); }
    const m = slMin(rec); toast(ed ? 'Sleep updated.' : `Logged ${slTxt(m)} of sleep.${m >= S.hl.sleepGoal * 60 ? ' 😴 Nice.' : ''}`);
    UI.edit = null; UI.open.slForm = false;
  }});
Object.assign(FORM_KEY, {habit:'hlForm', sleep:'slForm'});
{ const ce = JACT.cancelEdit; JACT.cancelEdit = d => { UI.hlEm = UI.hlDays = UI.hlDraft = null; return ce(d); }; }
