// Hibi: Subscriptions, in Savings. Track what you pay for, see monthly and yearly totals, and get a heads-up on Home before something renews.
'use strict';
/* =========================================================
   Subscriptions
   ========================================================= */
Object.assign(ICON, {repeat:'<path d="M4 9.5A5.5 5.5 0 0 1 9.5 4H18M15 1l3 3-3 3M20 14.5A5.5 5.5 0 0 1 14.5 20H6M9 23l-3-3 3-3"/>'});
MODES.save.nav.splice(2, 0, ['vsubs', 'Subs', 'repeat']);
Object.assign(TAB_INFO, {vsubs:{g:'vsubs', t:'Subscriptions'}});
Object.assign(GROUPS, {vsubs:['vsubs']});
const SUB_CYCLES = [['month', 'Monthly', 1], ['year', 'Yearly', 12], ['week', 'Weekly', 0], ['quarter', 'Every 3 months', 3], ['half', 'Every 6 months', 6]];
const SUB_PICKS = [['Netflix', '🎬'], ['Spotify', '🎧'], ['YouTube Premium', '▶️'], ['Crunchyroll', '🍥'], ['Disney+', '🏰'], ['Hulu', '📺'], ['Apple Music', '🎵'], ['iCloud+', '☁️'],
  ['Xbox Game Pass', '🎮'], ['PlayStation Plus', '🕹️'], ['Nintendo Online', '🍄'], ['Discord Nitro', '💬'], ['Amazon Prime', '📦'], ['Gym membership', '🏋️'], ['Phone plan', '📱'], ['Claude', '🤖']];
function normalizeSubs(s) {
  if (!Array.isArray(s.subs)) s.subs = [];
  if (typeof s.subRemind !== 'number') s.subRemind = 3;
  if (!s.subSeen || typeof s.subSeen !== 'object') s.subSeen = {};
}
const subCycle = x => SUB_CYCLES.find(c => c[0] === x.cycle) || SUB_CYCLES[0];
const subMonthly = x => { const p = num(x.price); return x.cycle === 'year' ? p / 12 : x.cycle === 'week' ? p * 52 / 12 : x.cycle === 'quarter' ? p / 3 : x.cycle === 'half' ? p / 6 : p; };
// Adds one billing cycle to a date, keeping the same day of the month (the 31st becomes the last day in shorter months)
function subStep(k, x, n) {
  if (x.cycle === 'week') return addDays(k, 7 * n);
  const months = subCycle(x)[2] * n, day = +x.start.slice(8), d = keyDate(k);
  const y = d.getFullYear(), m = d.getMonth() + months, last = new Date(y, m + 1, 0).getDate();
  return dk(new Date(y, m, Math.min(day, last)));
}
// The next billing date on or after today
function subNext(x, from) {
  const t = from || today(); let k = x.start, i = 0;
  if (!k) return '';
  while (k < t && i++ < 2000) k = subStep(k, x, 1);
  return k;
}
const subLive = () => S.subs.filter(x => !x.off);
const subTotals = () => { const m = subLive().reduce((t, x) => t + subMonthly(x), 0); return {m, y:m * 12, n:subLive().length}; };
const subSoon = () => subLive().map(x => ({x, k:subNext(x)})).filter(o => o.k && dayDiff(today(), o.k) <= S.subRemind).sort((a, b) => a.k.localeCompare(b.k));
const subWhen = k => { const n = dayDiff(today(), k); return n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`; };
const cash2 = a => '$' + (Math.round(a * 100) / 100).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

function subCard(x) {
  const k = subNext(x), n = k ? dayDiff(today(), k) : 99;
  return `<details class="card" ${det('sub-' + x.id)}><summary class="sum"><div class="gsum"><span class="sub-em" aria-hidden="true">${esc(x.em || '💳')}</span><div><h3>${esc(x.name)}${x.trial ? ' <span class="chip-mini">Trial</span>' : ''}</h3>
      <span class="small muted">${x.off ? 'Canceled' : `${x.trial ? 'Trial ends' : 'Renews'} ${esc(fmtWd(k))} · ${esc(subWhen(k))}`}</span></div>
      <b class="sub-price${!x.off && n <= S.subRemind ? ' soon' : ''}">${cash2(num(x.price))}<small>/${x.cycle === 'year' ? 'yr' : x.cycle === 'week' ? 'wk' : x.cycle === 'quarter' ? '3 mo' : x.cycle === 'half' ? '6 mo' : 'mo'}</small></b></div></summary>
    <div class="lrow"><span class="muted">How often</span><span>${esc(subCycle(x)[1])}</span></div>
    ${x.cycle !== 'month' ? `<div class="lrow"><span class="muted">Works out to</span><span>${cash2(subMonthly(x))} a month</span></div>` : ''}
    <div class="lrow"><span class="muted">Per year</span><span>${cash2(subMonthly(x) * 12)}</span></div>
    ${x.note ? `<p class="small muted mt">${esc(x.note)}</p>` : ''}
    <div class="row mt"><button class="link" data-act="subEdit" data-id="${esc(x.id)}">Edit</button><button class="link" data-act="subOff" data-id="${esc(x.id)}">${x.off ? 'Restart' : 'Mark canceled'}</button><button class="link danger" data-act="subDel" data-id="${esc(x.id)}" data-confirm>Delete</button></div></details>`;
}
function viewVSubs() {
  const T = subTotals(), L = subLive().slice().sort((a, b) => subNext(a).localeCompare(subNext(b))), off = S.subs.filter(x => x.off);
  const ed = UI.edit && UI.edit.kind === 'sub' ? S.subs.find(x => x.id === UI.edit.id) : null, pick = UI.subPick || null;
  const big = subLive().slice().sort((a, b) => subMonthly(b) - subMonthly(a)).slice(0, 5), maxM = Math.max(1, ...big.map(subMonthly));
  return `<section class="card"><h2>Your subscriptions</h2>
      <div class="stats"><div class="stat"><b>${cash2(T.m)}</b><span>a month</span></div><div class="stat"><b>$${short(Math.round(T.y))}</b><span>a year</span></div><div class="stat"><b>${T.n}</b><span>active</span></div></div>
      ${L.length ? `<p class="note">Next up: <b>${esc(L[0].name)}</b>, ${cash2(num(L[0].price))} ${esc(subWhen(subNext(L[0])))}.</p>` : '<p class="note">Add your subscriptions below to see your totals and get reminders.</p>'}</section>
    ${L.map(subCard).join('')}
    ${big.length > 1 ? `<section class="card"><h2>Biggest costs</h2>${big.map(x => `<div class="crow"><div class="row"><b>${esc(x.em || '💳')} ${esc(x.name)}</b><span>${cash2(subMonthly(x))}/mo</span></div><div class="cbar"><i style="width:${subMonthly(x) / maxM * 100}%"></i></div></div>`).join('')}</section>` : ''}
    <details class="card" ${det('subForm', !!ed || !S.subs.length)}><summary class="sum"><h2>${ed ? 'Edit ' + esc(ed.name) : 'Add a subscription'}</h2><span class="small muted">Name, price and when it renews</span></summary>
      ${ed ? '' : `<div class="chips">${SUB_PICKS.map(([n, em]) => chip(`${em} ${n}`, pick && pick[0] === n, `data-act="subPick" data-n="${esc(n)}"`)).join('')}</div>`}
      <form data-form="sub" class="stack mt">
        <div class="ff"><label>Name<input class="input" name="name" placeholder="Netflix" value="${ed ? esc(ed.name) : pick ? esc(pick[0]) : ''}"></label><label>Emoji<input class="input" name="em" placeholder="💳" maxlength="4" value="${ed ? esc(ed.em || '') : pick ? pick[1] : ''}"></label>
          <label>Price ($)<input class="input" name="price" inputmode="decimal" placeholder="15.49" value="${ed ? esc(ed.price) : ''}"></label><label>How often<select class="input" name="cycle">${SUB_CYCLES.map(([k, l]) => opt(k, l, ed ? ed.cycle : 'month')).join('')}</select></label></div>
        <label>Next charge date (or any past one)<input class="input" type="date" name="start" value="${ed ? esc(subNext(ed)) : ''}"></label>
        <label class="setrow"><span>It's a free trial<small class="muted" style="display:block;font-weight:600">Hibi reminds you before it starts charging</small></span><input type="checkbox" name="trial"${ed && ed.trial ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>
        <input class="input" name="note" placeholder="Note (optional), like shared with family" value="${ed ? esc(ed.note || '') : ''}" aria-label="Note">
        <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Add subscription'}</button>${ed ? '<button class="btn ghost" type="button" data-act="cancelEdit">Cancel</button>' : ''}</div></form></details>
    <section class="card"><h2>Reminders</h2>
      <label class="setrow"><span>Warn me on Home</span><select class="input" style="width:auto" data-bind="subRemind">${[1, 2, 3, 5, 7].map(n => opt(String(n), `${n} ${n === 1 ? 'day' : 'days'} before`, String(S.subRemind))).join('')}</select></label>
      <button class="btn ghost block mt" data-act="subCal">📅 Add renewals to Calendar</button>
      <p class="note">Adds a repeating event for each subscription with an alert the day before. If you change one later, delete the old Hibi event in Calendar and add it again.</p></section>
    ${off.length ? `<details class="card flat" ${det('subOffList')}><summary class="sum"><h2>Canceled</h2><span class="small muted">${off.length} not counted in your totals</span></summary>${off.map(subCard).join('')}</details>` : ''}`;
}
// Alert at the top of Home when something renews soon
function subAlert() {
  const L = subSoon().filter(o => !S.subSeen[o.x.id + '@' + o.k]); if (!L.length || (S.hidden || []).includes('save')) return '';
  return `<section class="card sub-alert"><div class="row"><h2>🔔 Renewing soon</h2><button class="link quiet" data-act="subSeenAll">Got it</button></div>
    ${L.map(({x, k}) => `<div class="lrow"><b>${esc(x.em || '💳')} ${esc(x.name)}${x.trial ? ' <small class="muted">(trial ends)</small>' : ''}</b><span>${cash2(num(x.price))} <small>${esc(subWhen(k))}</small></span></div>`).join('')}
    <button class="link mt" data-act="wGo" data-k="save" data-to="vsubs">See all subscriptions</button></section>`;
}
WIDGETS.subs = {n:'Subscriptions', em:'🔁', d:'Monthly total and what renews next', mode:'save', sizes:['s', 'm'], tap:goTo('save', 'vsubs'),
  s:() => { const T = subTotals(), nx = subLive().slice().sort((a, b) => subNext(a).localeCompare(subNext(b)))[0];
    return small('🔁', 'Subscriptions', `${cash2(T.m).replace(/\.\d\d$/, '')}<small>/mo</small>`, nx ? `${esc(nx.name)} ${esc(subWhen(subNext(nx)))}` : 'Add your subscriptions'); },
  m:() => { const T = subTotals(), L = subLive().slice().sort((a, b) => subNext(a).localeCompare(subNext(b))).slice(0, 4);
    return `<section class="card"><div class="row"><h2>🔁 Subscriptions</h2><span class="small muted">${cash2(T.m)}/mo · $${short(Math.round(T.y))}/yr</span></div>
      ${L.length ? L.map(x => `<div class="lrow"><b>${esc(x.em || '💳')} ${esc(x.name)}</b><span>${cash2(num(x.price))} <small>${esc(subWhen(subNext(x)))}</small></span></div>`).join('') : '<p class="note">No subscriptions yet.</p>'}</section>`; }};
Object.assign(SVIEWS, {vsubs:viewVSubs});
Object.assign(SACT, {
  subPick: d => { UI.subPick = SUB_PICKS.find(p => p[0] === d.n) || null; UI.open.subForm = true; },
  subEdit: d => { UI.edit = {kind:'sub', id:d.id}; UI.open.subForm = true; setTimeout(() => { const f = $('form[data-form="sub"]'); if (f) f.scrollIntoView({behavior:'smooth', block:'center'}); }, 60); },
  subOff: d => { const x = S.subs.find(y => y.id === d.id); if (!x) return false; x.off = !x.off; toast(x.off ? `${x.name} marked canceled. Nice savings!` : `${x.name} is back on.`); if (x.off) confetti(24); },
  subDel: d => { S.subs = S.subs.filter(x => x.id !== d.id); },
  subSeenAll: () => { subSoon().forEach(o => { S.subSeen[o.x.id + '@' + o.k] = 1; }); },
  subCal: () => {
    const L = subLive().filter(x => x.start); if (!L.length) { toast('Add a subscription first.'); return false; }
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const rr = x => x.cycle === 'year' ? 'FREQ=YEARLY' : x.cycle === 'week' ? 'FREQ=WEEKLY' : `FREQ=MONTHLY;INTERVAL=${subCycle(x)[2]}`;
    const ev = L.map(x => { const k = subNext(x).replace(/-/g, ''), e = addDays(subNext(x), 1).replace(/-/g, '');
      return ['BEGIN:VEVENT', `UID:hibi-sub-${x.id}@hibi`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${k}`, `DTEND;VALUE=DATE:${e}`, ...(x.trial ? [] : [`RRULE:${rr(x)}`]),
        `SUMMARY:${icsEsc(`${x.em || '💳'} ${x.name} ${x.trial ? 'trial ends' : 'renews'} (${cash2(num(x.price))})`)}`, 'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(`${x.name} ${x.trial ? 'trial ends' : 'renews'} tomorrow`)}`, 'END:VALARM', 'END:VEVENT'].join('\r\n'); });
    saveCalendar(icsWrap(ev, 'Subscriptions'), 'hibi-subscriptions.ics', ev.length); return false;
  },
});
Object.assign(SAVE, {sub: o => {
  const price = num(o.price); if (!o.name || !(price > 0)) { toast('Add the name and price.'); return false; }
  if (!o.start) { toast('Add when it next charges.'); return false; }
  const rec = {name:o.name.trim(), em:(o.em || '').trim(), price:Math.round(price * 100) / 100, cycle:o.cycle || 'month', start:o.start, trial:o.trial === 'on', note:o.note || ''};
  const ed = UI.edit && UI.edit.kind === 'sub' ? S.subs.find(x => x.id === UI.edit.id) : null;
  if (ed) { Object.assign(ed, rec); toast('Updated.'); } else { S.subs.push(Object.assign(rec, {id:'u' + Date.now()})); toast(`Added ${rec.name}: ${cash2(rec.price)} ${subCycle(rec)[1].toLowerCase()}.`); }
  UI.subPick = null; UI.open.subForm = false;
}});
normalizeSubs(S);
