// Hibi: Gym screens and the Settings screen.
'use strict';
/* =========================================================
   Views
   ========================================================= */
function emptyCard(title, text, label, act) {
  return `<div class="empty"><h2>${title}</h2><p>${text}</p>${label ? `<button class="btn" ${act}>${label}</button>` : ''}</div>`;
}
const isOpen = (key, dflt) => key in UI.open ? UI.open[key] : !!dflt;
const det = (key, dflt) => `data-keep="${esc(key)}"${isOpen(key, dflt) ? ' open' : ''}`;

function subtitle() {
  if (TAB_INFO[S.tab].g[0] === 'j') return jpSubtitle();
  if (TAB_INFO[S.tab].g === 'hhome') return new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
  if (['wtoday', 'wshifts', 'wpay'].includes(S.tab)) return workSubtitle();
  if (S.tab === 'kfocus') { const st = focusStats(); return st.n ? `${plural(st.n, 'focus round')} today` : 'Pomodoro timer'; }
  if (TAB_INFO[S.tab].g[0] === 'k') { const wk = dk(new Date(Date.now() + 7 * 864e5)), n = S.sc.tasks.filter(t => !t.done && t.due && t.due <= wk).length; return `${n} due in the next week`; }
  if (TAB_INFO[S.tab].g[0] === 'v') { const n = S.sv.goals.filter(g => live(g) && !svDone(g)).length; return `${plural(n, 'goal')} in progress`; }
  if (['gnow', 'glib', 'gadd', 'gstats'].includes(TAB_INFO[S.tab].g)) { const L = S.gm.items.filter(live), n = L.filter(g => g.status === 'now').length; return `${n} playing, ${plural(L.length, 'game')} in total`; }
  if (TAB_INFO[S.tab].g[0] === 'm') { const n = S.md.items.filter(m => m.status === 'now').length; return `${n} in progress, ${plural(S.md.items.length, 'title')} in total`; }
  const nowStr = new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
  switch (S.tab) {
    case 'workout': return S.active ? 'Workout in progress' : nowStr;
    case 'catalog': return plural(S.ex.length, 'exercise') + ' in your library';
    case 'care': return 'Stretches and recovery basics';
    case 'history': return plural(S.history.length, 'workout') + ' logged';
    case 'body': return 'Body weight and progress photos';
    case 'hbadges': case 'badges': return `${BADGES.filter(b => S.bd[b[0]]).length} of ${BADGES.length} unlocked`;
    case 'today': return nowStr;
    case 'journal': return 'One entry a day';
    default: return 'Theme, units and your data';
  }
}

/* ----- Workout ----- */
function upNext() {
  const t = nextTpl(); if (!t) return '';
  const last = [...S.history].reverse().find(w => w.tpl === t.id);
  return `<section class="card"><span class="small muted">Up next in your rotation</span>
    <h2 style="font-size:26px;margin-top:4px">${esc(t.name)}</h2><p class="tags">${esc(t.items.map(i => i.name).join(', '))}</p>
    <p class="note">${last ? 'Last done ' + fmtLong(last.end) + '.' : 'Not done yet.'}</p>
    <div class="btns mt"><button class="btn" style="flex:1" data-act="startTpl" data-id="${esc(t.id)}">Start ${esc(t.name)}</button>${S.tpl.length > 1 ? '<button class="btn ghost" data-act="skipRot">Skip</button>' : ''}</div></section>`;
}
function cardioSection(compact) {
  const M = cardioMachines(), r = S.crun;
  if (r) return `<section class="card crun"><span class="small muted">${CARDIO_EM[r.k] || '🏃'} ${esc(r.name)} running</span>
      <div class="clock${r.pausedAt ? ' paused' : ''}" id="cardioClock">${clock(runMs(r))}</div>
      <div class="btns mt"><button class="btn" style="flex:1" data-act="cardioStop">Done</button><button class="btn ghost" data-act="cardioPause">${r.pausedAt ? '▶ Resume' : '⏸ Pause'}</button><button class="btn ghost" data-act="cardioCancel" data-confirm>Cancel</button></div></section>`;
  if (!M.length) return '';
  const wk = cardioWeek(), last = [...cardioLogs()].reverse().slice(0, compact ? 0 : 3);
  return `<section class="card"><div class="row"><h2>Cardio</h2>${wk.n ? `<span class="small muted">${fmtN(Math.round(wk.min))} min this week</span>` : ''}</div>
    ${compact ? '<p class="note">Log a warm-up or finisher. It saves separately from this workout.</p>' : ''}
    <div class="tiles mt" style="margin-bottom:0">${M.map(e => `<button class="tile ctile2" data-act="cardioOpen" data-id="${esc(e.id)}"><i aria-hidden="true">${CARDIO_EM[e.kind]}</i><b>${esc(e.name)}</b><span>Log or time it</span></button>`).join('')}</div>
    ${last.length ? `<div class="mt">${last.map(x => `<div class="lrow"><b>${esc(x.name)}<small class="muted" style="display:block;font-weight:600">${esc(fmtLong(x.end))}</small></b><span>${esc(cardioText(x, x.k))}</span></div>`).join('')}</div>` : ''}</section>`;
}
function cardioSheet() {
  const c = UI.clog, F = CARDIO[c.k].f, last = [...cardioLogs()].reverse().find(x => norm(x.name) === norm(c.name));
  return `<div id="sheet" data-act="closeSheet"><div class="panel" data-act="noop" role="dialog" aria-modal="true" aria-label="Log ${esc(c.name)}">
    <div class="row"><h2>${CARDIO_EM[c.k]} ${esc(c.name)}</h2><button class="link" data-act="closeSheet">Cancel</button></div>
    ${last ? `<p class="note">Last time: ${esc(cardioText(last, last.k))}</p>` : ''}
    <form data-form="cardio" class="stack mt">
      <div class="cform" style="--n:${F.length}">${F.map(f => `<label><span class="label">${esc(f === 'inc' ? 'Incline %' : f === 'min' ? 'Minutes' : CF[f]())}</span><input class="num-in" name="${f}" inputmode="${CF_IN[f]}" value="${esc(c[f] !== undefined ? c[f] : '')}" placeholder="${last && last[f] !== undefined && last[f] !== '' ? esc(last[f]) : f === 'dist' ? 'auto' : '0'}"></label>`).join('')}</div>
      <p class="note">${last ? "Blank boxes use last time's numbers. " : ''}${c.k === 'tread' ? `Leave ${distU()} blank and it's worked out from speed and time.` : ''}</p>
      <button class="btn block" type="submit">Save</button></form>
    ${c.min === undefined ? `<button class="btn ghost block mt" data-act="cardioStart">Start a timer instead</button>` : ''}</div></div>`;
}
function tplList() {
  const L = S.tpl.filter(live); if (!L.length) return '';
  const nx = nextTpl();
  return `<details class="card tpls" ${det('tplList', true)}><summary class="sum"><h2>Templates</h2><span class="small muted">${plural(L.length, 'template')}. Tap one to see its exercises.</span></summary>
    ${L.map(t => `<details class="tpl" ${det('tpl:' + t.id)}><summary><b>${esc(t.name)}</b>${nx && nx.id === t.id ? '<span class="chip">Next</span>' : ''}<span>${plural(t.items.length, 'exercise')}</span></summary>
      <ol>${t.items.map(i => `<li>${esc(i.name)}${i.sets ? ` <small>· ${plural(i.sets, 'set')}</small>` : ''}</li>`).join('')}</ol>
      <div class="btns"><button class="btn" style="flex:1" data-act="startTpl" data-id="${esc(t.id)}">Start ${esc(t.name)}</button></div></details>`).join('')}</details>`;
}
function viewWorkout() {
  if (S.active) return viewSession(S.active);
  const ws = weekStart(Date.now()), wk = S.history.filter(w => w.end >= ws), last = S.history[S.history.length - 1];
  const vol = wk.reduce((t, w) => t + volOf(w), 0), mins = wk.reduce((t, w) => t + Math.max(0, (w.end - (w.start || w.end)) / 6e4), 0);
  const backupDue = S.history.length && !DBX.rt && (!S.lb || Date.now() - S.lb > 7 * 864e5);
  return `${upNext()}<section class="card"><h2>This week</h2>
      <div class="stats"><div class="stat"><b>${wk.length}</b><span>${wk.length === 1 ? 'workout' : 'workouts'}</span></div>
      <div class="stat"><b>${short(vol)}</b><span>${S.unit} lifted</span></div><div class="stat"><b>${Math.round(mins)}</b><span>minutes</span></div></div>
      <p class="note">${last ? `Last workout ${fmtLong(last.end)}${last.cat ? ', ' + esc(catName(last.cat)) : ''}.` : 'Finish your first workout and it shows up here.'}</p></section>
    ${cardioSection()}
    ${tplList()}
    <h2 class="sec">${S.tpl.some(live) ? 'Or start by category' : 'Start a workout'}</h2>
    <div class="tiles">${S.cats.filter(live).filter(c => { const L = S.ex.filter(e => live(e) && e.cats.includes(c.id)); return !L.length || !L.every(e => CARDIO[e.kind]); }).map(c => { const n = S.ex.filter(e => live(e) && e.cats.includes(c.id)).length;
      return `<button class="tile" data-act="start" data-cat="${esc(c.id)}"><b>${esc(c.name)}</b><span>${plural(n, 'exercise')}</span></button>`; }).join('')}</div>
    <div class="btns"><button class="btn ghost" style="flex:1" data-act="start">Start empty workout</button><button class="btn ghost" style="flex:1" data-act="openPlates">Plate calculator</button></div>
    ${S.tpl.length ? `<details class="card mt" ${det('manageTpl')}><summary class="sum"><h2>Manage templates</h2><span class="small muted">Rename, reorder or delete. Your rotation follows this order.</span></summary>
      ${S.tpl.map((t, i) => `<div class="lrow" style="align-items:center"><input class="input" style="min-height:40px" data-bind="tplname" data-id="${esc(t.id)}" value="${esc(t.name)}" aria-label="Template name">${i ? `<button class="link quiet" data-act="tplUp" data-id="${esc(t.id)}" aria-label="Move ${esc(t.name)} up">↑ Up</button>` : ''}${archBtn('tpl', t)}<button class="link danger" data-act="deleteTpl" data-id="${esc(t.id)}" data-confirm>Delete</button></div>`).join('')}</details>`
      : `<p class="note">Tip: save any workout as a template from the workout screen or your history, then start it here with one tap.</p>`}
    ${backupDue ? `<div class="card flat mt"><div class="row"><span class="small">It's been over a week since your last backup.</span><button class="btn sm" data-act="go" data-to="settings">Back up</button></div></div>` : ''}`;
}
function viewSession(a) {
  const done = a.exercises.reduce((t, e) => t + e.sets.filter(s => s.done).length, 0);
  const total = a.exercises.reduce((t, e) => t + e.sets.length, 0);
  const inSession = new Set(a.exercises.map(e => norm(e.name)));
  const pool = S.ex.filter(e => live(e) && !CARDIO[e.kind] && (!a.cat || e.cats.includes(a.cat)) && !inSession.has(norm(e.name)));
  return `<section class="card"><div class="row"><div>
      <span class="small muted"><b>${esc(a.cat ? catName(a.cat) : 'Workout')}</b> ${a.pausedAt ? '<b style="color:var(--accent)">paused</b>' : 'in progress'}</span>
      <div class="clock${a.pausedAt ? ' paused' : ''}" id="elapsed">${clock(runMs(a))}</div>
      <span class="small muted">${done} of ${plural(total, 'set')} done</span></div>
      <div class="stack" style="gap:8px;flex:none"><button class="btn" data-act="finish">Finish</button><button class="btn ghost sm" data-act="pauseWorkout">${a.pausedAt ? '▶ Resume' : '⏸ Pause'}</button></div></div></section>
    ${a.exercises.map(exCard).join('') || emptyCard('No exercises yet', 'Add one below to start logging sets.')}
    <section class="card"><h2>Add exercise</h2>
      ${pool.length ? `<div class="chips mt">${pool.map(e => `<button class="chip" data-act="addFromLib" data-id="${esc(e.id)}">+ ${esc(e.name)}</button>`).join('')}</div>` : ''}
      <div class="field mt"><input class="input" id="newEx" list="exNames" placeholder="Search or type a new exercise" autocomplete="off" enterkeyhint="done" data-enter="addTyped" aria-label="Exercise name"><button class="btn" data-act="addTyped">Add</button></div>
      <datalist id="exNames">${S.ex.map(e => `<option value="${esc(e.name)}">`).join('')}</datalist></section>
    <details class="card" ${det('sessionMuscles')}><summary class="sum"><h2>Muscles worked</h2><span class="small muted">${a.muscles.length ? esc(a.muscles.join(', ')) : 'Tap below or add exercises'}</span></summary>
      ${figure(a.muscles)}<div class="chips mt">${MUSCLES.map(m => chip(m, a.muscles.includes(m), `data-act="sessionMuscle" data-m="${esc(m)}"`)).join('')}</div></details>
    <details class="card" ${det('saveTpl')}><summary class="sum"><h2>Save as template</h2><span class="small muted">Start these exercises with one tap next time</span></summary>
      <div class="field"><input class="input" id="tplName" placeholder="Name, like Push A" value="${esc(a.tpl ? (S.tpl.find(t => t.id === a.tpl) || {}).name || '' : '')}" data-enter="saveTpl" aria-label="Template name"><button class="btn" data-act="saveTpl">Save</button></div>
      <p class="note">Saving with an existing name updates that template.</p></details>
    ${cardioSection(true)}
    <button class="link danger" data-act="discard" data-confirm>Discard workout</button>`;
}
function cardioCard(ex, xi, k) {
  const info = exInfo(ex.name), F = CARDIO[k].f, last = lastSession(ex.name);
  const rows = ex.sets.map((s, si) => { const p = prevFor(ex.name, si);
    return `<div class="set-row cardio${s.done ? ' done' : ''}" style="--n:${F.length}"><span class="sn">${si + 1}</span>
      ${F.map(f => `<input class="num-in" inputmode="${CF_IN[f]}" aria-label="${esc(CF[f]())} for round ${si + 1}" data-bind="set" data-x="${xi}" data-s="${si}" data-f="${f}" value="${esc(s[f] === undefined ? '' : s[f])}" placeholder="${p && p[f] !== undefined && p[f] !== '' ? esc(p[f]) : f === 'dist' ? 'auto' : '0'}">`).join('')}
      <button class="check" aria-label="Round ${si + 1} done" aria-pressed="${!!s.done}" data-act="toggleSet" data-x="${xi}" data-s="${si}">${ICON_CHECK}</button></div>`; }).join('');
  return `<section class="card">
    <div class="row"><h3>${esc(ex.name)}</h3><span class="ex-actions"><button class="link quiet" data-act="removeEx" data-x="${xi}" data-confirm>Remove</button></span></div>
    ${(t => t.length ? `<p class="tags">${esc(t.join(', '))}</p>` : '')([...(norm(CARDIO[k].label) === norm(ex.name) ? [] : [CARDIO[k].label]), ...(info ? info.muscles : [])])}
    ${(lt => lt ? `<p class="note">Last time: ${esc(lt)}</p>` : '')(last && last.sets.map(x => cardioText(x, k)).filter(x => x !== 'No details').join('; '))}
    <div class="set-row h cardio" style="--n:${F.length}" aria-hidden="true"><span>#</span>${F.map(f => `<span>${esc(f === 'inc' ? 'Incline %' : CF[f]())}</span>`).join('')}<span></span></div>
    ${rows}
    ${k === 'tread' ? `<p class="note">Leave ${distU()} blank and it's worked out from speed and time.</p>` : ''}
    <div class="row"><button class="link" data-act="addSet" data-x="${xi}">+ Add round</button>${ex.sets.length > 1 ? `<button class="link quiet" data-act="removeSet" data-x="${xi}">Remove last round</button>` : ''}</div></section>`;
}
function exCard(ex, xi) {
  const k = kindOf(ex); if (k) return cardioCard(ex, xi, k);
  const info = exInfo(ex.name);
  const rows = ex.sets.map((s, si) => {
    const p = prevFor(ex.name, si);
    return `<div class="set-row${s.done ? ' done' : ''}"><span class="sn">${si + 1}</span>
      <span class="prev">${p ? `${esc(p.w || 0)} × ${esc(p.r || 0)}` : '–'}</span>
      <input class="num-in" inputmode="decimal" aria-label="Weight for set ${si + 1}" data-bind="set" data-x="${xi}" data-s="${si}" data-f="w" value="${esc(s.w)}" placeholder="${p ? esc(p.w) : '0'}">
      <input class="num-in" inputmode="numeric" aria-label="Reps for set ${si + 1}" data-bind="set" data-x="${xi}" data-s="${si}" data-f="r" value="${esc(s.r)}" placeholder="${p ? esc(p.r) : '0'}">
      <button class="check" aria-label="Set ${si + 1} done" aria-pressed="${!!s.done}" data-act="toggleSet" data-x="${xi}" data-s="${si}">${ICON_CHECK}</button></div>`;
  }).join('');
  return `<section class="card">
    <div class="row"><h3>${esc(ex.name)}</h3><span class="ex-actions"><button class="link" data-act="plates" data-x="${xi}">Plates</button><button class="link quiet" data-act="removeEx" data-x="${xi}" data-confirm>Remove</button></span></div>
    ${info && info.muscles.length ? `<p class="tags">${esc(info.muscles.join(', '))}</p>` : ''}
    ${info ? `<details class="howto" ${det('how-' + info.id)}><summary>How to do it, and your progress</summary><p>${esc(info.how)}</p>${barChart(ex.name)}</details>` : ''}
    ${hintHtml(ex, xi)}
    <div class="set-row h" aria-hidden="true"><span>Set</span><span>Previous</span><span>${S.unit}</span><span>Reps</span><span></span></div>
    ${rows}
    <div class="row"><button class="link" data-act="addSet" data-x="${xi}">+ Add set</button>${ex.sets.length > 1 ? `<button class="link quiet" data-act="removeSet" data-x="${xi}">Remove last set</button>` : ''}</div></section>`;
}

/* ----- Library ----- */
const EX_TYPES = [['', 'Weights'], ['tread', 'Treadmill'], ['stairs', 'Stairs'], ['cardio', 'Other cardio']];
function viewCatalog() {
  const f = S.cf;
  return `<input class="input" id="exSearch" type="search" placeholder="Search by name or muscle" value="${esc(Q)}" autocomplete="off" aria-label="Search exercises">
    <div class="chips mt mb">${chip('All', f === 'all', 'data-act="filterCat" data-c="all"')}${S.cats.filter(live).map(c => chip(c.name, f === c.id, `data-act="filterCat" data-c="${esc(c.id)}"`)).join('')}</div>
    <div id="exList">${exList()}</div>${archSection('ex', 'exercises', x => x.name)}
    <details class="card" ${det('newEx')}><summary class="sum"><h2>Create an exercise</h2><span class="small muted">Add your own with muscles and notes</span></summary>
      <input class="input" placeholder="Name" data-bind="nf" data-f="name" value="${esc(NF.name)}" aria-label="Exercise name">
      <textarea class="input mt" style="min-height:80px" placeholder="How to do it, in a sentence or two" data-bind="nf" data-f="how" aria-label="How to do it">${esc(NF.how)}</textarea>
      <span class="label">Type</span><div class="chips">${EX_TYPES.map(([k, l]) => chip(l, (NF.kind || '') === k, `data-act="nfKind" data-k="${k}"`)).join('')}</div>
      <span class="label">Muscles</span><div class="chips">${MUSCLES.map(m => chip(m, NF.muscles.includes(m), `data-act="nfMuscle" data-m="${esc(m)}"`)).join('')}</div>
      <span class="label">Categories</span><div class="chips">${S.cats.filter(live).map(c => chip(c.name, NF.cats.includes(c.id), `data-act="nfCat" data-c="${esc(c.id)}"`)).join('')}</div>
      <button class="btn block mt" data-act="createEx">Add to library</button></details>
    <details class="card" ${det('cats')}><summary class="sum"><h2>Categories</h2><span class="small muted">${S.cats.length} ${S.cats.length === 1 ? 'category' : 'categories'}</span></summary>
      ${S.cats.map(c => `<div class="lrow" style="align-items:center"><b${c.archived ? ' class="muted"' : ''}>${esc(c.name)}${c.archived ? ' (archived)' : ''}</b>${archBtn('cat', c, 'margin-left:auto')}<button class="link danger" data-act="deleteCat" data-c="${esc(c.id)}" data-confirm>Delete</button></div>`).join('')}
      <div class="field mt"><input class="input" id="newCat" placeholder="New category, like Arms" autocomplete="off" data-enter="addCat" aria-label="New category name"><button class="btn" data-act="addCat">Add</button></div></details>`;
}
function exList() {
  const f = S.cf, q = norm(Q);
  const list = S.ex.filter(e => live(e) && (f === 'all' || e.cats.includes(f)) && (!q || norm(e.name).includes(q) || e.muscles.some(m => norm(m).includes(q))));
  if (!list.length) return emptyCard(q ? 'No matches' : 'Nothing here yet', q ? 'Try a different name or muscle.' : 'Open any exercise and tap this category to add it.');
  return list.map(e => `<details class="card" ${det('ex-' + e.id)}><summary class="sum"><h3>${esc(e.name)}</h3><span class="small muted">${e.muscles.length ? esc(e.muscles.join(', ')) : 'No muscles set'}</span></summary>
      <p class="muted">${esc(e.how)}</p>${figure(e.muscles)}${CARDIO[e.kind] ? (l => `<p class="note">${l ? 'Last time: ' + esc(l.sets.map(x => cardioText(x, e.kind)).join('; ')) : 'Not logged yet. Progress shows up under Progress, then Cardio.'}</p>`)(lastSession(e.name)) : barChart(e.name)}
      <span class="label">Type</span><div class="chips">${EX_TYPES.map(([k, l]) => chip(l, (e.kind || '') === k, `data-act="exKind" data-id="${esc(e.id)}" data-k="${k}"`)).join('')}</div>
      <span class="label">Muscles</span><div class="chips">${MUSCLES.map(m => chip(m, e.muscles.includes(m), `data-act="exMuscle" data-id="${esc(e.id)}" data-m="${esc(m)}"`)).join('')}</div>
      <span class="label">Categories</span><div class="chips">${S.cats.filter(c => live(c) || e.cats.includes(c.id)).map(c => chip(c.name, e.cats.includes(c.id), `data-act="exCat" data-id="${esc(e.id)}" data-c="${esc(c.id)}"`)).join('') || '<span class="small muted">Create a category first.</span>'}</div>
      ${archBtn('ex', e)} <button class="link danger mt" data-act="deleteEx" data-id="${esc(e.id)}" data-confirm>Delete exercise</button></details>`).join('');
}
function viewCare() {
  const f = S.cm;
  return `<div class="chips mb">${chip('All', f === 'all', 'data-act="filterCare" data-m="all"')}${MUSCLES.map(m => chip(m, f === m, `data-act="filterCare" data-m="${esc(m)}"`)).join('')}</div>
    ${STRETCHES.filter(x => f === 'all' || x[0] === f).map(([m, n, h]) => `<section class="card"><h3>${esc(n)}</h3><p class="tags">${esc(m)}</p><p class="mt">${esc(h)}</p></section>`).join('')}
    <section class="card"><h2>Basic care</h2>
      <div class="lrow"><span>Warm up 5 to 10 minutes with light cardio, then a few light sets of your first lift.</span></div>
      <div class="lrow"><span>Stretch gently after training and stop before it hurts.</span></div>
      <div class="lrow"><span>Drink water through the day, not just during workouts.</span></div>
      <div class="lrow"><span>Aim for 7 to 9 hours of sleep. Muscles recover while you rest.</span></div>
      <div class="lrow"><span>Take rest days. Soreness is normal, sharp or joint pain is not. Stop, rest, and see a professional if it keeps happening.</span></div></section>`;
}

/* ----- Progress ----- */
function cardioProgress() {
  const names = cardioNames(); if (!names.length) return '';
  const logs = cardioLogs(), c = S.cpick || {}, name = names.includes(c.n) ? c.n : names[0], k = (logs.find(x => x.name === name) || {}).k || 'cardio';
  const mets = CARDIO[k].f.filter(f => CMET[f]), m = mets.includes(c.m) ? c.m : mets.includes('inc') ? 'inc' : 'min';
  const pts = cardioSeries(name, m), wk = cardioWeek(), u = cmetUnit(m);
  const all = logs.filter(x => x.name === name), recent = [...logs].reverse().slice(0, 15);
  const best = f => Math.max(0, ...all.map(CMET[f][2]));
  return `<section class="card"><h2>Cardio</h2>
    <div class="cstats"><div class="stat"><b>${fmtN(Math.round(wk.min))}</b><span>min this week</span></div><div class="stat"><b>${fmtN(Math.round(wk.dist * 10) / 10)}</b><span>${distU()} this week</span></div><div class="stat"><b>${fmtN(wk.fl)}</b><span>floors this week</span></div></div>
    <select class="input mt" data-bind="cpick" data-f="n" aria-label="Cardio machine">${names.map(n => `<option${n === name ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
    <div class="chips mt">${mets.map(f => chip(CMET[f][0], f === m, `data-act="cardioMet" data-m="${f}"`)).join('')}</div>
    ${trend(pts, u)}${lineChart(pts, u)}
    <p class="note">Bests on ${esc(name)}: ${mets.map(f => { const b = best(f); return b ? `${CMET[f][0].toLowerCase()} ${fmtN(b)}${f === 'inc' ? '%' : cmetUnit(f) ? ' ' + cmetUnit(f) : ''}` : ''; }).filter(Boolean).join(', ') || 'none yet'}.</p>
    <details class="mt" ${det('cardioLog')}><summary class="link">Cardio log</summary>
      ${recent.map(x => `<div class="lrow"><b>${esc(x.name)}<small class="muted" style="display:block;font-weight:600">${esc(fmtLong(x.end))}</small></b><span>${esc(cardioText(x, x.k))}${x.src === 'c' ? `<button class="link danger" data-act="cardioDel" data-id="${esc(x.id)}" data-confirm>Delete</button>` : ''}</span></div>`).join('')}</details></section>`;
}
function viewHistory() {
  if (!S.history.length) return emptyCard('No workouts yet', 'Finish a workout and your lifts, PRs and charts show up here.', 'Start a workout', 'data-act="go" data-to="workout"');
  const names = loggedNames(), pick = names.includes(S.pick) ? S.pick : names[0], pts = pick ? series(pick) : [];
  return `${cardioProgress()}${names.length ? `<section class="card"><h2>Lift progress</h2>
      <select class="input mt" data-bind="pick" aria-label="Exercise">${names.map(n => `<option${n === pick ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
      ${trend(pts, S.unit)}${lineChart(pts, S.unit)}</section>` : ''}
    ${names.length ? `<details class="card" ${det('prs', true)}><summary class="sum"><h2>Personal records</h2><span class="small muted">Heaviest set for each lift</span></summary>
      ${bestSets().map(b => `<div class="lrow"><b>${esc(b.name)}</b><span>${fmtN(b.v)} ${S.unit} × ${fmtN(b.r)}<small>${fmtMD(new Date(b.d))}</small></span></div>`).join('')}</details>` : ''}
    <h2 class="sec">Workouts</h2>
    ${[...S.history].reverse().map(w => {
      const mins = Math.max(1, Math.round((w.end - (w.start || w.end)) / 6e4));
      return `<details class="card" ${det('w-' + w.id)}><summary class="sum"><h3>${fmtLong(w.end)}</h3>
        <span class="small muted">${esc(w.cat ? catName(w.cat) : (w.muscles && w.muscles.length ? w.muscles.join(', ') : 'Workout'))}, ${mins} min${volOf(w) || !w.exercises.some(e => kindOf(e)) ? `, ${short(volOf(w))} ${S.unit}` : ''}${(c => c ? `, ${fmtN(c)} min cardio` : '')(Math.round(w.exercises.filter(e => kindOf(e)).reduce((t, e) => t + e.sets.reduce((u, x) => u + num(x.min), 0), 0)))}</span></summary>
        ${w.exercises.map(e => { const k = kindOf(e); return `<div class="lrow"><b>${esc(e.name)}</b><span>${k ? esc(e.sets.map(s => cardioText(s, k)).join('; ')) : e.sets.map(s => `${fmtN(num(s.w))}×${fmtN(num(s.r))}`).join(', ')}</span></div>`; }).join('')}
        <div class="row mt"><button class="link" data-act="tplFromWorkout" data-id="${esc(w.id)}">Save as template</button><button class="link danger" data-act="deleteWorkout" data-id="${esc(w.id)}" data-confirm>Delete workout</button></div></details>`;
    }).join('')}`;
}
function viewBody() {
  const pts = S.bw.slice(-60).map(p => ({l:fmtMD(keyDate(p.d)), v:p.v})), t = S.bw.find(p => p.d === today());
  return `<section class="card"><h2>Body weight</h2>
      <div class="field mt"><input class="input" id="bwIn" inputmode="decimal" placeholder="Today's weight in ${S.unit}" value="${t ? t.v : ''}" data-enter="saveWeight" aria-label="Today's body weight"><button class="btn" data-act="saveWeight">Save</button></div>
      ${trend(pts, S.unit)}${lineChart(pts, S.unit)}</section>
    <section class="card"><div class="row"><h2>Progress photos</h2>
      <label class="btn sm file-btn">Add photo<input type="file" accept="image/*" data-file="photo" aria-label="Add a progress photo"></label></div>
      <p class="note">Photos stay on this phone only and aren't included in backups.</p>
      ${PH.length ? `<div class="photos">${PH.map(p => `<figure><img src="${p.url}" alt="Progress photo from ${esc(fmtMD(keyDate(p.d)))}" loading="lazy">
        <figcaption>${esc(fmtMD(keyDate(p.d)))}<button class="link danger" data-act="deletePhoto" data-id="${p.id}" data-confirm>Delete</button></figcaption></figure>`).join('')}</div>` : ''}</section>`;
}

/* ----- Daily ----- */
function viewToday() {
  const now = new Date();
  const week = [...Array(7)].map((_, i) => daysBack(6 - i));
  const took = (id, d) => (S.sl[dk(d)] || []).includes(id);
  const taken = S.sup.filter(x => took(x.id, now)).length;
  return `<section class="card"><div class="row"><h2>Supplements</h2><span class="small muted"><b>${taken}</b> of ${S.sup.length} today</span></div>
      ${S.sup.map(x => `<div class="sup"><div><b>${esc(x.name)}</b><span class="small muted">${x.dose ? ', ' + esc(x.dose) : ''}</span>
        <div class="dots" aria-label="Last 7 days">${week.map((d, i) => `<span class="dot${took(x.id, d) ? ' on' : ''}${i === 6 ? ' today' : ''}" title="${esc(fmtMD(d))}">${'SMTWTFS'[d.getDay()]}</span>`).join('')}</div></div>
        <button class="check" aria-label="Took ${esc(x.name)} today" aria-pressed="${took(x.id, now)}" data-act="toggleSup" data-id="${esc(x.id)}">${ICON_CHECK}</button></div>`).join('') || '<p class="note">No supplements yet. Add one below.</p>'}
      <details class="mt" ${det('manageSup')}><summary class="link">Manage supplements</summary>
        ${S.sup.map(x => `<div class="lrow" style="align-items:center"><b style="flex:none">${esc(x.name)}</b><input class="input" style="min-height:40px" placeholder="Dose from your label" data-bind="dose" data-id="${esc(x.id)}" value="${esc(x.dose)}" aria-label="${esc(x.name)} dose"><button class="link danger" data-act="removeSup" data-id="${esc(x.id)}" data-confirm>Remove</button></div>`).join('')}
        <span class="label">Daily reminders</span>
        ${S.sup.map(x => `<div class="lrow" style="align-items:center"><span style="flex:1;text-align:left;color:var(--ink)">${esc(x.name)}</span><input class="input" type="time" style="width:130px;min-height:40px" data-bind="suptime" data-id="${esc(x.id)}" value="${esc(x.time || '')}" aria-label="Reminder time for ${esc(x.name)}"></div>`).join('')}
        <button class="btn ghost block mt" data-act="supCal">📅 Add reminders to Calendar</button>
        <p class="note">Set a time for each one, then tap the button. Your iPhone adds a daily repeating event with an alert, and you just tap Add All. Supplements with the same time share one reminder. If you change times later, delete the old Hibi reminders in Calendar and add them again.</p>
        <span class="label">Add a supplement</span>
        <input class="input" placeholder="Name, like Vitamin D" data-bind="ns" data-f="name" value="${esc(NS.name)}" aria-label="Supplement name">
        <div class="field mt"><input class="input" placeholder="Dose from your label" data-bind="ns" data-f="dose" value="${esc(NS.dose)}" aria-label="Dose"><button class="btn" data-act="addSup">Add</button></div></details></section>`;
}
function viewJournal() {
  const t = today();
  if (!JD || JD.d !== t) { const e = S.j.find(x => x.d === t); JD = {d:t, m:e ? e.m : 0, t:e ? e.t : ''}; }
  const strip = [...Array(14)].map((_, i) => { const d = daysBack(13 - i), e = S.j.find(x => x.d === dk(d)), m = e && MOODS[e.m - 1];
    return m ? `<span title="${esc(fmtMD(d))}: ${m[1]}">${m[0]}</span>` : `<span class="none" title="${esc(fmtMD(d))}">·</span>`; }).join('');
  const past = S.j.filter(e => e.d !== t).slice().reverse();
  return `<section class="card"><h2>How are you feeling today?</h2>
      <div class="chips mt">${MOODS.map((m, i) => chip(m[0] + ' ' + m[1], JD.m === i + 1, `data-act="mood" data-m="${i + 1}"`)).join('')}</div>
      <textarea class="input mt" data-bind="journal" placeholder="What happened today? How did training feel?" aria-label="Journal entry">${esc(JD.t)}</textarea>
      <button class="btn block mt" data-act="saveJournal">Save entry</button></section>
    <section class="card"><h2>Last two weeks</h2><div class="moodstrip">${strip}</div></section>
    ${past.map(e => { const m = MOODS[e.m - 1];
      return `<details class="card" ${det('j-' + e.d)}><summary class="sum"><h3>${esc(keyDate(e.d).toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'}))}</h3><span class="small muted">${m ? m[0] + ' ' + m[1] : 'No mood'}</span></summary>
        <p>${esc(e.t || 'No notes.').replace(/\n/g, '<br>')}</p><button class="link danger mt" data-act="deleteEntry" data-d="${esc(e.d)}" data-confirm>Delete entry</button></details>`; }).join('')}`;
}

/* ----- Settings ----- */
function crashCard() {
  const l = Crash.list(); if (!l.length) return '';
  const last = l[l.length - 1], up = l.filter(r => r.up).length;
  return `<section class="card"><div class="row"><h2>Crash reports</h2><b>${l.length}</b></div>
      <p class="note">Last one ${esc(fmtLong(last.t))}: ${esc(last.msg)}</p>
      <p class="note">${DBX.rt ? (up === l.length ? 'All saved to Dropbox › Apps › your Hibi folder › crash-reports.' : 'Saving to Dropbox on the next backup.') : 'Connect Dropbox above and these get saved there too.'} Copy them and send them to Claude to get them fixed.</p>
      <div class="btns mt"><button class="btn" style="flex:1" data-act="crashCopy">Copy reports</button><button class="btn ghost" data-act="crashClear" data-confirm>Clear</button></div></section>`;
}
function viewSettings() {
  return `<section class="card"><h2>Theme</h2>
      <div class="swatches">${THEMES.map(([id, n, a, b]) => `<button class="swatch" aria-pressed="${S.theme === id}" data-act="theme" data-k="${id}"><i style="background:linear-gradient(135deg,${a} 50%,${b} 50%)"></i>${n}</button>`).join('')}</div>
      <p class="note">Sakura follows your phone's light or dark mode. The others stay fixed.</p></section>
${S.mode === 'home' ? fxSettings() + musicSettings() : S.mode === 'school' ? '' : S.mode === 'gym' ? `    <section class="card"><h2>Training</h2>
      <label class="setrow"><span>Weight unit</span><select class="input" data-bind="setting" data-k="unit">${['lb', 'kg'].map(u => `<option${S.unit === u ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
      <label class="setrow"><span>Rest timer</span><select class="input" data-bind="setting" data-k="rest">${[45, 60, 90, 120, 150, 180, 240].map(n => `<option value="${n}"${S.rest === n ? ' selected' : ''}>${clock(n * 1000)}</option>`).join('')}</select></label>
      <label class="setrow"><span>Rep range for hints</span><select class="input" data-bind="setting" data-k="rr">${['5-8', '6-10', '8-12', '10-15', '12-20'].map(r => `<option value="${r}"${S.rr === r ? ' selected' : ''}>${r.replace('-', ' to ')} reps</option>`).join('')}</select></label>
      <label class="setrow"><span>Weight jump</span><select class="input" data-bind="setting" data-k="inc">${incOpts().map(n => `<option value="${n}"${inc() === n ? ' selected' : ''}>${n} ${S.unit}</option>`).join('')}</select></label>
      <label class="setrow"><span>Bar weight</span><select class="input" data-bind="setting" data-k="bar">${barOpts().map(n => `<option value="${n}"${barW() === n ? ' selected' : ''}>${n} ${S.unit}</option>`).join('')}</select></label>
      <p class="note">Hints tell you to add weight once you hit the top of your rep range on every set.</p>
      <p class="note">Changing the unit only changes labels. Numbers you already logged stay as entered.</p></section>
` : S.mode === 'save' ? svSettings() : S.mode === 'games' ? gmSettings() : S.mode === 'work' ? wkSettings() : S.mode === 'japan' ? `    <section class="card"><h2>Japan trip</h2><form data-form="trip" class="stack mt">
      <div class="ff"><label>First day<input class="input" type="date" name="start" value="${esc(S.jp.start)}"></label><label>Last day<input class="input" type="date" name="end" value="${esc(S.jp.end)}"></label></div>
      <button class="btn" type="submit">Save dates</button></form>
      <p class="note">Exchange rate: ¥${fmtN(R())} per dollar. Change it in Money, then Converter.</p></section>
` : `    <section class="card"><h2>Import from AniList</h2>
      <p class="note">Bring in your anime and manga lists with your AniList username. Your profile needs to be public. Run it again any time to update progress.</p>
      <form data-form="alimport" class="field mt"><input class="input" name="user" placeholder="AniList username" value="${esc(S.md.al || '')}" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="AniList username"><button class="btn" type="submit">Import</button></form>
      <p class="note" id="alStatus" role="status"></p></section>
`}${ideasCard()}${settingsCommon()}${dbxCard()}${crashCard()}    <section class="card"><h2>Backup file</h2>
      <p class="note">Everything lives on this phone, in this browser.${DBX.rt ? ' Dropbox backs it up for you, but you can still save a file by hand.' : ' Save a backup file to your Files app or iCloud Drive now and then.'} Last backup: <b>${S.lb ? fmtMD(new Date(S.lb)) : 'never'}</b>.</p>
      <div class="btns mt"><button class="btn" data-act="shareBackup">Save backup file</button><label class="btn ghost file-btn">Restore from file<input type="file" accept=".json,application/json,text/plain" data-file="restore" aria-label="Restore from a backup file"></label></div>
      <details class="mt" ${det('textBackup')}><summary class="link">Copy or paste backup as text</summary>
        <textarea class="input" id="bk" style="min-height:100px;font-size:13px" placeholder="Backup text appears here. Paste a backup here to restore." aria-label="Backup text"></textarea>
        <div class="btns mt"><button class="btn sm ghost" data-act="copyBackup">Show and copy</button><button class="btn sm ghost" data-act="restoreText">Restore from text</button></div></details></section>
${S.mode === 'gym' ? `    <section class="card"><h2>Import from Hevy</h2>
      <p class="note">In Hevy, go to Settings, then Export &amp; Import Data, then Export Workouts. Pick that CSV file here. Warm-up sets are skipped and workouts you already have are ignored.</p>
      <label class="btn ghost file-btn mt">Choose Hevy CSV<input type="file" accept=".csv,text/csv,text/plain" data-file="hevy" aria-label="Import Hevy CSV"></label></section>` : ''}
    <section class="card"><div class="mhead"><span data-act="logoTap" style="cursor:pointer;display:flex">${HIBI_LOGO}</span><div><h2>Hibi</h2><span class="small muted">Everyday life, all in one place. Version ${APP_VERSION}</span></div></div>
      <button class="btn ghost block mt" data-act="openNotes">What's new: patch notes</button>
      <p class="note">When you upload a new version to GitHub, the app gets it the next time it opens with internet and shows a Reload button.</p></section>`;
}
