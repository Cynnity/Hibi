// Hibi: Weekly recap on Home, and Monthly and Yearly Wrapped (tap-through slides, like Spotify Wrapped).
'use strict';
/* =========================================================
   Recaps
   ========================================================= */
const MON_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_MS = 864e5;
function periodOf(kind, key) {
  if (kind === 'week') { const from = +key; return {kind, key, from, to:from + 7 * DAY_MS, label:'Week of ' + fmtMD(new Date(from))}; }
  if (kind === 'month') { const [y, m] = key.split('-').map(Number); return {kind, key, from:new Date(y, m - 1, 1).getTime(), to:new Date(y, m, 1).getTime(), label:`${MON_NAMES[m - 1]} ${y}`, short:MON_NAMES[m - 1]}; }
  return {kind, key, from:new Date(+key, 0, 1).getTime(), to:new Date(+key + 1, 0, 1).getTime(), label:String(key), short:String(key)};
}
const inR = (t, P) => t >= P.from && t < P.to;
const dIn = (d, P) => !!d && inR(keyDate(d).getTime(), P);
const r1 = n => Math.round(n * 10) / 10;
const topKey = o => { const e = Object.entries(o).sort((a, b) => b[1] - a[1])[0]; return e ? e : null; };

// Everything that happened in a period, from every mode
function recap(P) {
  const o = {};
  const W = S.history.filter(w => inR(w.end, P));
  o.workouts = W.length;
  o.days = new Set(W.map(w => dk(new Date(w.end)))).size;
  o.gymMin = Math.round(W.reduce((t, w) => t + Math.max(0, Math.min(600, (w.end - (w.start || w.end)) / 6e4)), 0));
  o.volume = Math.round(W.reduce((t, w) => t + volOf(w), 0));
  const exSets = {}, mus = {}; o.heavy = null;
  W.forEach(w => { (w.muscles || []).forEach(m => mus[m] = (mus[m] || 0) + 1);
    w.exercises.forEach(e => { if (kindOf(e)) return; exSets[e.name] = (exSets[e.name] || 0) + e.sets.length;
      e.sets.forEach(s => { const v = num(s.w); if (v > 0 && (!o.heavy || v > o.heavy.w)) o.heavy = {w:v, r:num(s.r), name:e.name}; }); }); });
  o.favEx = topKey(exSets); o.topMuscle = topKey(mus);
  const before = {}, during = {};
  S.history.forEach(w => w.exercises.forEach(e => { if (kindOf(e)) return; const k = norm(e.name), t = topOf(e);
    if (w.end < P.from) before[k] = Math.max(before[k] || 0, t); else if (inR(w.end, P)) during[k] = Math.max(during[k] || 0, t); }));
  o.prs = Object.keys(during).filter(k => before[k] !== undefined && during[k] > before[k]).length;

  const C = cardioLogs().filter(x => inR(x.end, P));
  o.cardioN = C.length; o.cardioMin = Math.round(C.reduce((t, x) => t + num(x.min), 0));
  o.dist = r1(C.reduce((t, x) => t + (x.k === 'stairs' ? 0 : distOf(x)), 0)); o.floors = C.reduce((t, x) => t + num(x.fl), 0);

  const A = S.alog.filter(a => inR(a[0], P)), sumK = k => A.filter(a => a[1] === k).reduce((t, a) => t + a[2], 0);
  o.ep = sumK('ep'); o.ch = sumK('ch'); o.vols = sumK('vol'); o.pages = sumK('page');
  const mh = {};
  A.forEach(a => { if (a[1] !== 'gh') mh[a[3]] = (mh[a[3]] || 0) + a[2]; });
  const tm = topKey(mh); o.topShow = tm && tm[1] > 0 && mFind(tm[0]) ? {m:mFind(tm[0]), n:tm[1]} : null;
  o.beaten = S.gm.items.filter(g => gDone(g) && g.finished && inR(g.finished, P)).sort((a, b) => (b.rating || 0) - (a.rating || 0));
  o.gStarted = S.gm.items.filter(g => g.started && inR(g.started, P));
  o.gAdded = S.gm.items.filter(g => g.added && inR(g.added, P) && g.status === 'plan').length;
  const genreN = {}; [...o.beaten, ...o.gStarted].forEach(g => { if (g.genres[0]) genreN[g.genres[0]] = (genreN[g.genres[0]] || 0) + 1; });
  o.topGenre = topKey(genreN);
  o.finished = S.md.items.filter(m => m.status === 'done' && m.finished && inR(m.finished, P)).sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const T = S.sv.tx.filter(t => dIn(t.d, P) && num(t.amt) > 0);
  o.saved = Math.round(T.reduce((t, x) => t + num(x.amt), 0) * 100) / 100; o.deposits = T.length;
  o.tasks = S.sc.tasks.filter(t => t.done && t.doneAt && inR(t.doneAt, P)).length;
  const WS = shiftsSplit().filter(s => dIn(s.d, P)); o.workMin = WS.reduce((t, s) => t + s.mins, 0); o.shifts = WS.length;
  o.earned = WS.reduce((t, s) => t + s.reg / 60 * shRate(s) + s.ot / 60 * shRate(s) * 1.5, 0) + [...S.wk.bonus.filter(b => dIn(b.d, P)), ...wkRecurringBetween(P)].reduce((t, b) => t + num(b.amt), 0);
  const FL = S.pomo.log.filter(x => inR(x[0], P)); o.focusN = FL.length; o.focusMin = FL.reduce((t, x) => t + x[1], 0);
  const J = S.j.filter(e => dIn(e.d, P)), moods = {}; J.forEach(e => { if (e.m) moods[e.m] = (moods[e.m] || 0) + 1; });
  o.journal = J.length; const tmo = topKey(moods); o.mood = tmo ? MOODS[+tmo[0] - 1] : null;
  o.badges = BADGES.filter(b => S.bd[b[0]] && inR(S.bd[b[0]], P));
  o.jpDays = tripDays().filter(d => dIn(d, P)).length;
  o.jpSpent = Math.round(S.jp.exp.filter(x => dIn(x.date, P)).reduce((t, x) => t + toUSD(x.amount, x.cur), 0));
  o.any = !!(o.workouts || o.cardioN || o.gStarted.length || o.ep || o.ch || o.vols || o.pages || o.beaten.length || o.finished.length || o.saved || o.tasks || o.focusN || o.shifts || o.journal || o.badges.length || o.jpDays);
  return o;
}

/* ----- Weekly recap card on Home ----- */
function weekCard() {
  const cur = weekStart(Date.now()), last = UI.wk === 'last', P = periodOf('week', last ? cur - 7 * DAY_MS : cur), o = recap(P);
  const tiles = [[o.workouts, o.workouts === 1 ? 'workout' : 'workouts', '🏋️'], [o.cardioMin, 'cardio min', '🏃'], [o.gStarted.length, o.gStarted.length === 1 ? 'game started' : 'games started', '🎮'], [o.beaten.length, o.beaten.length === 1 ? 'game beaten' : 'games beaten', '🏁'],
    [o.ep, o.ep === 1 ? 'episode' : 'episodes', '📺'], [o.ch, o.ch === 1 ? 'chapter' : 'chapters', '📖'], [o.pages, 'pages', '📚'], [o.saved ? usd(o.saved) : 0, 'saved', '💰'],
    [o.workMin ? r1(o.workMin / 60) : 0, 'hours worked', '💼'], [o.earned ? usd(Math.round(o.earned)) : 0, 'earned', '💵'], [o.tasks, 'homework done', '🎓'], [o.focusMin, 'focus min', '🍅'], [o.journal, o.journal === 1 ? 'journal entry' : 'journal entries', '📝']].filter(x => x[0]);
  const hi = [o.prs ? `🏆 ${plural(o.prs, 'new PR')}` : '', ...o.beaten.slice(0, 2).map(g => `🎮 Beat ${g.title}`), ...o.finished.slice(0, 2).map(m => `✅ Finished ${m.title}`),
    ...o.badges.slice(0, 2).map(b => `${b[1]} ${b[2]}`)].filter(Boolean);
  return `<section class="card"><div class="row"><h2>${last ? 'Last week' : 'This week'}</h2>
      <div class="chips" style="flex-wrap:nowrap">${chip('This week', !last, 'data-act="wkSet" data-w="this"')}${chip('Last week', last, 'data-act="wkSet" data-w="last"')}</div></div>
    ${tiles.length ? `<div class="stats wk">${tiles.map(([v, l, em]) => `<div class="stat"><b>${typeof v === 'number' ? fmtN(v) : esc(v)}</b><span>${em} ${esc(l)}</span></div>`).join('')}</div>`
      : `<p class="note">${last ? 'Nothing was logged last week.' : 'Nothing logged yet this week. Hit the gym, play something or save a little and it shows up here.'}</p>`}
    ${hi.length ? `<p class="note">${hi.map(esc).join(' · ')}</p>` : ''}</section>`;
}

/* ----- Wrapped ----- */
const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
function wrapCard() {
  const now = new Date(), opts = [];
  for (let i = 0; i < 12; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1), k = monthKey(d), P = periodOf('month', k);
    if (recap(P).any) opts.push(['month', k, i === 0 ? `${MON_NAMES[d.getMonth()]} so far` : `${MON_NAMES[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : ''}`]); }
  for (let y = now.getFullYear(); y > now.getFullYear() - 3; y--) if (recap(periodOf('year', String(y))).any) opts.push(['year', String(y), y === now.getFullYear() ? `${y} so far` : String(y)]);
  if (!opts.length) return '';
  return `<section class="card"><h2>🎁 Wrapped</h2><p class="note">Your month and year in review. A new one opens on its own when each month ends.</p>
    <div class="chips mt">${opts.map(([k, key, l]) => `<button class="chip" data-act="wrapOpen" data-k="${k}" data-key="${esc(key)}">${esc(l)}</button>`).join('')}</div></section>`;
}
function wrapSlides(kind, key) {
  const P = periodOf(kind, key), o = recap(P), L = [], yr = kind === 'year', unit = S.unit;
  const add = s => L.push(s);
  const ongoing = P.to > Date.now();
  add({em:'🎁', eye:'Hibi Wrapped', big:P.label + (ongoing ? ' so far' : ''), text:ongoing ? `Here's ${yr ? 'your year' : P.short} so far.` : yr ? "Let's look back at your year." : `Here's how ${P.short} went.`, x:['Tap to continue']});
  if (o.workouts) {
    const cars = o.volume / (unit === 'kg' ? 1800 : 4000);
    add({em:'🏋️', eye:'In the gym', big:fmtN(o.workouts), unit:o.workouts === 1 ? 'workout' : 'workouts',
      text:`${plural(o.days, 'day')} of training and ${fmtN(r1(o.gymMin / 60))} hours under the bar.`,
      x:[o.volume ? `${short(o.volume)} ${unit} lifted in total${cars >= 1 ? `. That's about ${fmtN(Math.round(cars))} ${Math.round(cars) === 1 ? 'car' : 'cars'}.` : '.'}` : '', o.prs ? `🏆 ${plural(o.prs, 'new PR')}` : '']});
  }
  if (o.heavy) add({em:'💪', eye:'Heaviest lift', big:`${fmtN(o.heavy.w)} ${unit}`, text:`${o.heavy.name}${o.heavy.r ? ` for ${plural(o.heavy.r, 'rep')}` : ''}`,
    x:[o.favEx ? `Favorite exercise: ${o.favEx[0]} (${plural(o.favEx[1], 'set')})` : '', o.topMuscle ? `Most trained: ${o.topMuscle[0]}` : '']});
  if (o.cardioN) add({em:'🏃', eye:'Cardio', big:fmtN(o.cardioMin), unit:'minutes', text:`Across ${plural(o.cardioN, 'session')}.`,
    x:[o.dist ? `${fmtN(o.dist)} ${distU()} covered` : '', o.floors ? `${fmtN(o.floors)} floors climbed` : '']});
  if (o.beaten.length || o.gStarted.length) { const b = o.beaten.length, best = o.beaten[0] || o.gStarted[0];
    add({em:'🎮', eye:'Gaming', big:fmtN(b || o.gStarted.length), unit:b ? (b === 1 ? 'game beaten' : 'games beaten') : (o.gStarted.length === 1 ? 'game started' : 'games started'),
      text:b ? `${o.beaten.slice(0, 3).map(g => g.title).join(', ')}${b > 3 ? ' and more' : ''}` : o.gStarted.slice(0, 3).map(g => g.title).join(', '), img:best && best.img,
      x:[b && o.gStarted.length ? `Started ${plural(o.gStarted.length, 'game')}` : '', o.beaten[0] && o.beaten[0].rating ? `Best: ${o.beaten[0].title} (${o.beaten[0].rating}/10)` : '', o.gAdded ? `${plural(o.gAdded, 'game')} added to your backlog` : '', o.topGenre ? `Top genre: ${o.topGenre[0]}` : '']}); }
  const md = [[o.ep, 'episodes'], [o.ch, 'chapters'], [o.vols, 'volumes'], [o.pages, 'pages']].filter(x => x[0] > 0);
  if (md.length || o.finished.length) add({em:'📺', eye:'Watching and reading', big:fmtN(md.length ? md[0][0] : o.finished.length), unit:md.length ? md[0][1] : 'titles finished',
    text:o.topShow ? `Most watched or read: ${o.topShow.m.title}` : '', img:o.topShow && o.topShow.m.img,
    x:[...md.slice(1).map(([n, l]) => `${fmtN(n)} ${l}`), o.finished.length ? `Finished ${plural(o.finished.length, 'title')}${o.finished[0].rating ? `. Best: ${o.finished[0].title} (${o.finished[0].rating}/10)` : ''}` : '']});
  if (S.mu.artists.length && S.mu.at && (ongoing || Date.now() - P.to < 14 * DAY_MS) && kind === 'month') add({em:'🎧', eye:'On repeat', big:S.mu.artists[0].name, unit:'your top artist lately', img:S.mu.artists[0].img,
    x:[S.mu.tracks[0] ? `Top song: ${S.mu.tracks[0].name} by ${S.mu.tracks[0].artist}` : '', S.mu.artists.slice(1, 3).length ? `Also: ${S.mu.artists.slice(1, 3).map(a => a.name).join(', ')}` : '']});
  if (o.shifts) add({em:'💼', eye:'Work', big:fmtN(r1(o.workMin / 60)), unit:'hours worked', text:`Across ${plural(o.shifts, 'shift')}.`, x:[o.earned ? `About ${usd(Math.round(o.earned))} earned before taxes` : '']});
  if (o.saved) add({em:'💰', eye:'Savings', big:usd(o.saved), unit:'saved', text:`Across ${plural(o.deposits, 'deposit')}. Future you says thanks.`});
  if (o.jpDays) add({em:'🗾', eye:'Japan', big:fmtN(o.jpDays), unit:o.jpDays === 1 ? 'day in Japan' : 'days in Japan', text:o.jpSpent ? `${usd(o.jpSpent)} spent on the trip.` : 'A trip to remember.'});
  if (o.tasks || o.focusN) add({em:'🎓', eye:'School', big:fmtN(o.tasks || r1(o.focusMin / 60)), unit:o.tasks ? (o.tasks === 1 ? 'assignment done' : 'assignments done') : 'hours of focus', text:'One step closer to that degree.',
    x:[o.tasks && o.focusN ? `🍅 ${fmtN(r1(o.focusMin / 60))} hours of focus across ${plural(o.focusN, 'round')}` : '']});
  if (o.journal) add({em:o.mood ? o.mood[0] : '📝', eye:'Journal', big:fmtN(o.journal), unit:o.journal === 1 ? 'entry' : 'entries', text:o.mood ? `Most days felt ${o.mood[1].toLowerCase()}.` : ''});
  if (o.badges.length) add({em:'🏅', eye:'Badges unlocked', big:fmtN(o.badges.length), unit:o.badges.length === 1 ? 'badge' : 'badges', x:o.badges.slice(0, 6).map(b => `${b[1]} ${b[2]}`)});
  const sum = [[o.workouts, 'workouts'], [o.cardioMin, 'cardio min'], [o.beaten.length, 'games beaten'], [o.ep || o.ch, o.ep ? 'episodes' : 'chapters'], [o.saved ? usd(o.saved) : 0, 'saved'], [o.workMin ? r1(o.workMin / 60) : 0, 'hours worked'], [o.tasks, 'assignments'], [o.gStarted.length, 'games started'], [o.finished.length, 'titles finished']].filter(x => x[0]).slice(0, 6);
  const next = ongoing ? 'Keep it going.' : yr ? `Here's to ${+key + 1}.` : `On to ${MON_NAMES[(+key.split('-')[1]) % 12]}.`;
  add({em:'✨', eye:`${P.label} in Hibi`, big:'', sum, text:next, done:true});
  return {P, L};
}
function wrapHtml() {
  const W = UI.wrap, {P, L} = wrapSlides(W.kind, W.key), i = Math.max(0, Math.min(L.length - 1, W.i)), s = L[i];
  return `<div id="wrap" class="w${i % 6}" role="dialog" aria-modal="true" aria-label="${esc(P.label)} Wrapped">
    <div class="wbars">${L.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="wtop"><span>Hibi Wrapped · ${esc(P.label)}</span><button class="wclose" data-act="wrapClose" aria-label="Close">✕</button></div>
    <button class="wtap prev" data-act="wrapPrev" aria-label="Previous"></button><button class="wtap next" data-act="wrapNext" aria-label="Next"></button>
    <div class="wbody" key="${i}">
      <div class="wem" aria-hidden="true">${s.em}</div><div class="weye">${esc(s.eye)}</div>
      ${s.big ? `<div class="wbig">${esc(s.big)}</div>` : ''}${s.unit ? `<div class="wunit">${esc(s.unit)}</div>` : ''}
      ${s.img ? `<img class="wimg" src="${esc(s.img)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      ${s.text ? `<p class="wtext">${esc(s.text)}</p>` : ''}
      ${(s.x || []).filter(Boolean).map(t => `<p class="wx">${esc(t)}</p>`).join('')}
      ${s.sum ? `<div class="wsum">${s.sum.map(([v, l]) => `<div><b>${typeof v === 'number' ? fmtN(v) : esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : ''}
      ${s.done ? '<button class="wdone" data-act="wrapClose">Done</button>' : ''}
    </div></div>`;
}
// Opens last month's (and in January, last year's) Wrapped once, the first time Hibi is opened after it ends.
function wrapCheck() {
  try {
    if (UI.wrap || locked || S.tab === undefined) return;
    const now = new Date(), y = now.getFullYear(), m = now.getMonth();
    const due = [['year', String(y - 1)], ['month', m ? `${y}-${pad(m)}` : `${y - 1}-12`]];
    let changed = false;
    for (const [k, key] of due) {
      const id = k + ':' + key; if (S.wrapSeen[id] || periodOf(k, key).to <= S.wrapSince) continue;
      if (recap(periodOf(k, key)).any) { UI.wrap = {kind:k, key, i:0, id}; render(); return; }
      S.wrapSeen[id] = 1; changed = true;
    }
    if (changed) saveRaw();
  } catch (e) { Crash.record(e, 'wrapped check'); }
}
Object.assign(XACT, {
  wkSet: d => { UI.wk = d.w === 'last' ? 'last' : ''; },
  wrapOpen: d => { UI.wrap = {kind:d.k, key:d.key, i:0}; },
  wrapNext: () => { const n = wrapSlides(UI.wrap.kind, UI.wrap.key).L.length; if (UI.wrap.i < n - 1) UI.wrap.i++; render(); return false; },
  wrapPrev: () => { if (UI.wrap.i > 0) UI.wrap.i--; render(); return false; },
  wrapClose: () => { const w = UI.wrap; UI.wrap = null; if (w && w.i > 0) S.wrapViewed = 1; if (w && w.id) S.wrapSeen[w.id] = 1; setTimeout(wrapCheck, 400); },
});
document.addEventListener('keydown', e => { if (!UI.wrap) return; if (e.key === 'ArrowRight') XACT.wrapNext(); else if (e.key === 'ArrowLeft') XACT.wrapPrev(); else if (e.key === 'Escape') { XACT.wrapClose(); afterChange(); } });
