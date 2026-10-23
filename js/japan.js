// Hibi: Japan trip mode: itinerary, money, bookings and lists.
'use strict';
/* =========================================================
   Japan: data
   ========================================================= */
const JP_PACK = `Documents|Passport
Documents|Flight confirmations
Documents|Stay confirmations and addresses
Documents|Travel insurance info
Money|Credit card with no foreign transaction fee
Money|Debit card for ATM cash
Money|Some yen cash for arrival
Tech|Phone and charger
Tech|Power bank
Tech|eSIM or pocket Wi-Fi set up
Tech|Headphones
Clothes|Winter coat
Clothes|Warm layers
Clothes|Comfortable walking shoes
Clothes|Good socks (you take your shoes off a lot)
Toiletries|Toothbrush and toiletries
Toiletries|Medications in original packaging
Other|Small towel or handkerchief
Other|Coin pouch
Other|Reusable bag
Other|Empty space for souvenirs`;
function jpDefaults() {
  return {start:'2027-01-12', end:'2027-02-02', budget:0, rate:{v:158.13, d:'2026-10-20', src:'ecb'},
    items:[], exp:[], flights:[], stays:[], places:[], notes:'', sel:null, gifts:[], journal:{}, jsel:null, prep:prepSeed(),
    pack:JP_PACK.split('\n').map((l, i) => { const [cat, t] = l.split('|'); return {id:'k' + i, cat, t, done:false}; })};
}
function normalizeJp(s) {
  const d = jpDefaults();
  if (!s.jp || typeof s.jp !== 'object') s.jp = d;
  for (const k in d) if (s.jp[k] == null) s.jp[k] = d[k];
  for (const k of ['items', 'exp', 'flights', 'stays', 'places', 'pack', 'prep', 'gifts']) if (!Array.isArray(s.jp[k])) s.jp[k] = d[k];
  if (typeof s.jp.journal !== 'object' || Array.isArray(s.jp.journal)) s.jp.journal = {};
  if (!s.jp.rate || !(s.jp.rate.v > 0)) s.jp.rate = d.rate;
  if (!MODES[s.mode]) s.mode = 'gym';
  if (!s.lastMode || typeof s.lastMode !== 'object') s.lastMode = {};
  const g = TAB_INFO[s.tab].g;
  if (g !== 'settings' && !MODES[s.mode].nav.some(n => n[0] === g)) s.tab = firstTab(s.mode);
}
const JP_CATS = [['activity','🎌','Activity'],['food','🍜','Food'],['transport','🚃','Transport'],['shopping','🛍️','Shopping'],['stay','🏠','Stay'],['flights','✈️','Flights'],['other','📌','Other']];
const catEm = c => (JP_CATS.find(x => x[0] === c) || JP_CATS[6])[1];
const catLabel = c => (JP_CATS.find(x => x[0] === c) || JP_CATS[6])[2];
const R = () => (S.jp.rate && S.jp.rate.v) || 150;
const toUSD = (a, cur) => cur === 'JPY' ? num(a) / R() : num(a);
// Whole dollars, for small stat boxes where cents don't fit
const cash0 = a => (a < 0 ? '−$' : '$') + (Math.abs(a) >= 1e4 ? short(Math.abs(a)) : Math.round(Math.abs(a)).toLocaleString());
const money = (a, cur) => cur === 'JPY' ? '¥' + Math.round(a).toLocaleString() : '$' + (Math.round(a * 100) / 100).toLocaleString(undefined, {maximumFractionDigits:2});
const both = (a, cur) => cur === 'JPY' ? `${money(a, 'JPY')} <span class="muted">(${money(a / R(), 'USD')})</span>` : `${money(a, 'USD')} <span class="muted">(${money(a * R(), 'JPY')})</span>`;
const fmtTime = t => { if (!t) return ''; let [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${pad(m)} ${ap}`; };
const fmtDay = k => keyDate(k).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
const fmtDT = s => s ? `${fmtDay(s.slice(0, 10))}${s.length > 10 ? ', ' + fmtTime(s.slice(11, 16)) : ''}` : 'Not set';
const mapsLink = q => `https://maps.apple.com/?q=${encodeURIComponent(q)}`;
const safeUrl = u => !u ? '' : /^https?:\/\//i.test(u) ? u : 'https://' + u;
const opt = (v, label, cur) => `<option value="${esc(v)}"${cur === v ? ' selected' : ''}>${esc(label)}</option>`;
const curSel = (cur, dflt) => `<select class="input" name="cur" aria-label="Currency" style="flex:0 0 104px">${opt('JPY', '¥ yen', cur || dflt)}${opt('USD', '$ USD', cur || dflt)}</select>`;
function tripDays() {
  const out = [], a = keyDate(S.jp.start), b = keyDate(S.jp.end);
  if (!(a <= b)) return out;
  for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) out.push(dk(d));
  return out;
}
const JARR = {item:'items', exp:'exp', flight:'flights', stay:'stays', place:'places', pack:'pack', prep:'prep', gift:'gifts'};
const editing = kind => UI.edit && UI.edit.kind === kind ? (S.jp[JARR[kind]].find(x => x.id === UI.edit.id) || null) : null;
const fval = (o, k) => esc(o ? (o[k] ?? '') : '');
function upsert(kind, o) {
  const arr = S.jp[JARR[kind]];
  if (UI.edit && UI.edit.kind === kind) { const x = arr.find(y => y.id === UI.edit.id); if (x) { Object.assign(x, o); return 'Updated.'; } }
  o.id = 'j' + Date.now(); arr.push(o); return 'Saved.';
}
const formActions = kind => `<div class="btns"><button class="btn" type="submit">${editing(kind) ? 'Save changes' : 'Save'}</button>${editing(kind) ? '<button class="btn ghost" type="button" data-act="cancelEdit">Cancel</button>' : ''}</div>`;
const tokyoNow = () => new Date().toLocaleTimeString(undefined, {timeZone:'Asia/Tokyo', hour:'numeric', minute:'2-digit'});

/* =========================================================
   Japan: views
   ========================================================= */
function jpSubtitle() {
  const f = k => keyDate(k).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'});
  return `${f(S.jp.start)} to ${f(S.jp.end)}`;
}
function countdownCard() {
  const days = tripDays(), t = today();
  if (!days.length) return `<section class="card"><h2>Set your trip dates</h2><p class="note">Go to Lists, then Info, to add them.</p></section>`;
  let main;
  if (t < S.jp.start) { const n = Math.round((keyDate(S.jp.start) - keyDate(t)) / 864e5); main = `<span class="big">${n}</span><span class="small muted">${n === 1 ? 'day' : 'days'} until Japan</span>`; }
  else if (t > S.jp.end) main = `<h2>Welcome back</h2><span class="small muted">Your trip is complete.</span>`;
  else main = `<span class="big">Day ${days.indexOf(t) + 1}</span><span class="small muted">of ${days.length} in Japan</span>`;
  return `<section class="card"><div class="row"><div>${main}</div><div style="text-align:right"><span class="small muted">Tokyo now</span><b style="display:block;font-size:20px" id="jpClock">${tokyoNow()}</b></div></div></section>`;
}
/* ----- Flights grouped into journeys, with layovers between connecting flights ----- */
const JP_AIRPORTS = ['HND','NRT','KIX','ITM','NGO','CTS','FUK','OKA','KOJ','HIJ','SDJ'];
const dtMs = v => { if (!v) return NaN; const [d, t] = v.split('T'), [y, m, dd] = d.split('-').map(Number), [h, mi] = (t || '0:0').split(':').map(Number); return new Date(y, m - 1, dd, h, mi).getTime(); };
const durTxt = ms => { const m = Math.round(ms / 6e4), h = Math.floor(m / 60); return h ? `${h} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`; };
/* ----- Airport time zones: each flight time is local to its airport, so Hibi works out the real times ----- */
const AIRPORT_TZ = (() => { const o = {}, add = (tz, codes) => codes.split(' ').forEach(c => { o[c] = tz; });
  add('America/New_York', 'MCO SFB FLL MIA TPA PBI JAX RSW SRQ PIE DAB MLB TLH ATL CLT JFK EWR LGA BOS IAD DCA BWI PHL DTW CLE PIT RDU CVG IND CMH BUF ALB BDL PVD RIC ORF SAV CHS MYR BNA');
  add('America/Chicago', 'DFW DAL IAH HOU AUS SAT ORD MDW MSP STL MCI MSY MEM MKE OKC TUL OMA BHM ELP LIT');
  add('America/Denver', 'DEN SLC ABQ BOI'); add('America/Phoenix', 'PHX TUS'); add('America/Los_Angeles', 'LAX SFO SJC OAK SAN SEA PDX LAS SMF BUR ONT SNA LGB');
  add('America/Anchorage', 'ANC'); add('Pacific/Honolulu', 'HNL OGG KOA LIH'); add('Asia/Tokyo', 'HND NRT KIX ITM NGO CTS FUK OKA KOJ HIJ SDJ UKB KMJ');
  add('Asia/Seoul', 'ICN GMP PUS'); add('Asia/Shanghai', 'PEK PKX PVG SHA CAN SZX'); add('Asia/Hong_Kong', 'HKG'); add('Asia/Taipei', 'TPE TSA'); add('Asia/Manila', 'MNL');
  add('Asia/Singapore', 'SIN'); add('Asia/Bangkok', 'BKK DMK'); add('Asia/Dubai', 'DXB'); add('Asia/Qatar', 'DOH'); add('Europe/London', 'LHR LGW'); add('Europe/Paris', 'CDG ORY');
  add('Europe/Berlin', 'FRA MUC'); add('Europe/Amsterdam', 'AMS'); add('Europe/Istanbul', 'IST'); add('America/Toronto', 'YYZ YUL'); add('America/Vancouver', 'YVR');
  add('America/Mexico_City', 'MEX'); add('America/Cancun', 'CUN'); add('America/Puerto_Rico', 'SJU'); add('Australia/Sydney', 'SYD'); return o; })();
const TZ_CHOICES = [['America/New_York', 'Eastern'], ['America/Chicago', 'Central'], ['America/Denver', 'Mountain'], ['America/Phoenix', 'Arizona'], ['America/Los_Angeles', 'Pacific'],
  ['America/Anchorage', 'Alaska'], ['Pacific/Honolulu', 'Hawaii'], ['Asia/Tokyo', 'Japan'], ['Asia/Seoul', 'Korea'], ['Asia/Shanghai', 'China'], ['Asia/Taipei', 'Taiwan'], ['Asia/Hong_Kong', 'Hong Kong'],
  ['Asia/Manila', 'Philippines'], ['Asia/Singapore', 'Singapore'], ['Asia/Bangkok', 'Thailand'], ['Asia/Dubai', 'Dubai'], ['Asia/Qatar', 'Qatar'], ['Europe/London', 'UK'], ['Europe/Paris', 'France'],
  ['Europe/Berlin', 'Germany'], ['Europe/Amsterdam', 'Netherlands'], ['Europe/Istanbul', 'Turkey'], ['America/Toronto', 'Toronto'], ['America/Vancouver', 'Vancouver'], ['America/Mexico_City', 'Mexico City'],
  ['America/Cancun', 'Cancún'], ['America/Puerto_Rico', 'Puerto Rico'], ['Australia/Sydney', 'Sydney']];
const homeTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'; } catch (e) { return 'America/New_York'; } };
const tzName = tz => (TZ_CHOICES.find(x => x[0] === tz) || [0, (tz || '').split('/').pop().replace(/_/g, ' ')])[1];
const apTz = (code, pick) => pick || AIRPORT_TZ[(code || '').toUpperCase().trim()] || '';
// Minutes a time zone is ahead of UTC at a given moment (handles daylight saving)
function tzOff(tz, ms) {
  const p = new Intl.DateTimeFormat('en-US', {timeZone:tz, hourCycle:'h23', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit'}).formatToParts(new Date(ms));
  const g = t => +(p.find(x => x.type === t) || {value:0}).value;
  return (Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second')) - Math.floor(ms / 1000) * 1000) / 6e4;
}
// "YYYY-MM-DDTHH:MM" on the clock in a time zone, as a real moment in time
function zoned(v, tz) {
  if (!v) return NaN; if (!tz) return dtMs(v);
  const [d, t] = v.split('T'), [y, m, dd] = d.split('-').map(Number), [h, mi] = (t || '0:0').split(':').map(Number), guess = Date.UTC(y, m - 1, dd, h, mi);
  try { const ms = guess - tzOff(tz, guess) * 6e4; return guess - tzOff(tz, ms) * 6e4; } catch (e) { return dtMs(v); }
}
const fTzFrom = f => apTz(f.from, f.tzFrom), fTzTo = f => apTz(f.to, f.tzTo);
const fDep = f => zoned(f.dep, fTzFrom(f)), fArr = f => zoned(f.arr, fTzTo(f));
const inTz = (ms, tz) => { try { return new Date(ms).toLocaleString(undefined, {timeZone:tz, weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}); } catch (e) { return ''; } };
// One price per booking: flights with the same confirmation code are counted once (the price entered on any of them)
function flightBookings() {
  const B = {};
  S.jp.flights.forEach(f => { const k = f.conf ? 'c:' + norm(f.conf) : 'f:' + f.id, b = B[k] = B[k] || {legs:[], usd:0, f:null}; b.legs.push(f);
    const c = toUSD(f.cost, f.cur); if (c > b.usd) { b.usd = c; b.f = f; } });
  return Object.values(B);
}
const flightsUSD = () => flightBookings().reduce((t, b) => t + b.usd, 0);
function journeys() {
  const F = S.jp.flights.slice().sort((a, b) => (fDep(a) || 9e15) - (fDep(b) || 9e15)), out = [];
  F.forEach(f => {
    const j = out[out.length - 1], prev = j && j.legs[j.legs.length - 1];
    // Same airport, and the next flight leaves within a day of landing (real times, so crossing time zones works)
    const gap = prev ? fDep(f) - fArr(prev) : NaN;
    if (prev && prev.to === f.from && gap >= 0 && gap <= 24 * 36e5) { j.lays.push({at:f.from, ms:gap, from:prev, to:f}); j.legs.push(f); }
    else out.push({legs:[f], lays:[]});
  });
  out.forEach(j => { const a = j.legs[0].from, b = j.legs[j.legs.length - 1].to;
    j.title = JP_AIRPORTS.includes(b) && !JP_AIRPORTS.includes(a) ? 'Flying to Japan' : JP_AIRPORTS.includes(a) && !JP_AIRPORTS.includes(b) ? 'Flying home' : 'Flight';
    j.route = [a, ...j.legs.map(l => l.to)].join(' → ');
    const t0 = fDep(j.legs[0]), t1 = fArr(j.legs[j.legs.length - 1]); j.total = t1 > t0 ? t1 - t0 : 0; });
  return out;
}
function dayEvents(k) {
  const ev = S.jp.items.filter(i => i.d === k).map(i => Object.assign({}, i, {kind:'item'}));
  S.jp.flights.forEach(f => {
    if (f.dep && f.dep.slice(0, 10) === k) ev.push({auto:true, time:f.dep.slice(11, 16), at:fDep(f), tz:fTzFrom(f), title:`✈️ Flight ${f.from} → ${f.to}`, note:[f.airline, f.num].filter(Boolean).join(' ')});
    if (f.arr && f.arr.slice(0, 10) === k) ev.push({auto:true, time:f.arr.slice(11, 16), at:fArr(f), tz:fTzTo(f), title:`🛬 Land in ${f.to}`, note:[f.airline, f.num].filter(Boolean).join(' ')});
  });
  journeys().forEach(j => j.lays.forEach(l => { if (l.from.arr && l.from.arr.slice(0, 10) === k) ev.push({auto:true, time:l.from.arr.slice(11, 16), at:fArr(l.from) + 1, tz:fTzTo(l.from), title:`⏳ Layover in ${l.at}: ${durTxt(l.ms)}`, note:`Next: ${l.to.from} → ${l.to.to}${l.to.dep ? ' at ' + fmtTime(l.to.dep.slice(11, 16)) : ''}`}); }));
  S.jp.stays.forEach(s => {
    if (s.ci === k) ev.push({auto:true, time:s.cit, title:`🏠 Check in: ${s.name}`, place:s.address});
    if (s.co === k) ev.push({auto:true, time:s.cot, title:`🧳 Check out: ${s.name}`, place:s.address});
  });
  // Sort by the real moment things happen, so a flight home that "lands before it leaves" on the clock still shows in order.
  // Plans and hotel times are in Japan time; flights are in their airport's time.
  ev.forEach(e => { if (!e.tz) e.tz = 'Asia/Tokyo'; if (!(e.at >= 0)) e.at = e.time ? zoned(k + 'T' + e.time, e.tz) : Infinity; if (e.tz !== 'Asia/Tokyo') e.zone = tzName(e.tz) + ' time'; });
  return ev.sort((a, b) => a.at - b.at);
}
function calendar() {
  const trip = new Set(tripDays()), s = keyDate(S.jp.start), base = new Date(s.getFullYear(), s.getMonth() + (UI.jmo || 0), 1);
  const y = base.getFullYear(), m = base.getMonth(), n = new Date(y, m + 1, 0).getDate(), t = today();
  let cells = '<span></span>'.repeat(base.getDay());
  for (let d = 1; d <= n; d++) {
    const k = dk(new Date(y, m, d)), cnt = dayEvents(k).length;
    cells += `<button class="cd${trip.has(k) ? ' trip' : ''}${S.jp.sel === k ? ' sel' : ''}${k === t ? ' now' : ''}" data-act="jDay" data-k="${k}" aria-label="${esc(fmtDay(k))}${cnt ? `, ${plural(cnt, 'plan')}` : ''}">${d}${cnt ? '<i></i>' : ''}</button>`;
  }
  return `<section class="card"><div class="cal-head"><button class="btn sm ghost" data-act="jMonth" data-n="-1" aria-label="Previous month">‹</button>
    <h2>${base.toLocaleDateString(undefined, {month:'long', year:'numeric'})}</h2><button class="btn sm ghost" data-act="jMonth" data-n="1" aria-label="Next month">›</button></div>
    <div class="cal">${[...'SMTWTFS'].map(x => `<b>${x}</b>`).join('')}${cells}</div></section>`;
}
function viewJPlan() {
  const days = tripDays(), t = today();
  if (!S.jp.sel) S.jp.sel = days.includes(t) ? t : (days[0] || t);
  const k = S.jp.sel, idx = days.indexOf(k), ev = dayEvents(k), ed = editing('item');
  const evRow = e => `<div class="ev${e.auto ? ' auto' : ''}"><span class="ev-t">${e.time ? fmtTime(e.time) : 'Any time'}${e.zone && e.time ? `<small>${esc(e.zone)}</small>` : ''}</span>
    <div class="ev-b"><b>${e.auto ? '' : catEm(e.cat) + ' '}${esc(e.title)}</b>${e.place ? `<a href="${mapsLink(e.place)}" target="_blank" rel="noopener">📍 ${esc(e.place)}</a>` : ''}
    ${e.note ? `<span class="small muted">${esc(e.note)}</span>` : ''}${e.cost ? `<span class="small">${both(e.cost, e.cur)}</span>` : ''}</div>
    ${e.auto ? '' : `<div class="ev-a"><button class="link" data-act="jEdit" data-kind="item" data-id="${esc(e.id)}">Edit</button><button class="link danger" data-act="jDel" data-kind="item" data-id="${esc(e.id)}" data-confirm>Delete</button></div>`}</div>`;
  return `${countdownCard()}${todayCard()}${calendar()}
    <section class="card"><h2>${esc(fmtDay(k))}</h2><span class="small muted">${idx >= 0 ? `Day ${idx + 1} of ${days.length}` : 'Outside your trip dates'}${ev.some(e => e.zone) ? ' · Times are Japan time unless marked' : ''}</span>
      ${ev.length ? ev.map(evRow).join('') : '<p class="note">Nothing planned yet. Flights and check-ins show up here on their own.</p>'}
      <details class="mt" ${det('jAdd', !!ed)}><summary class="link">${ed ? 'Edit plan' : '+ Add a plan to this day'}</summary>
        <form data-form="item" class="stack"><input type="hidden" name="d" value="${esc(ed ? ed.d : k)}">
          <div class="field"><input class="input" type="time" name="time" value="${fval(ed, 'time')}" aria-label="Time" style="flex:0 0 132px">
            <select class="input" name="cat" aria-label="Type">${JP_CATS.filter(c => c[0] !== 'flights').map(c => opt(c[0], c[1] + ' ' + c[2], ed ? ed.cat : 'activity')).join('')}</select></div>
          <input class="input" name="title" placeholder="What, like Shibuya Sky" value="${fval(ed, 'title')}" aria-label="What">
          <input class="input" name="place" placeholder="Place or address (optional)" value="${fval(ed, 'place')}" aria-label="Place">
          <div class="field"><input class="input" name="cost" inputmode="decimal" placeholder="Cost (optional)" value="${ed && ed.cost ? ed.cost : ''}" aria-label="Cost">${curSel(ed && ed.cur, 'JPY')}</div>
          <textarea class="input" name="note" style="min-height:70px" placeholder="Notes, like book tickets ahead" aria-label="Notes">${fval(ed, 'note')}</textarea>
          ${formActions('item')}</form></details></section>
    <button class="btn ghost block" data-act="jIcs">Add plans to iPhone Calendar</button>
    <p class="note">Adds your plans, check-ins and check-outs in Tokyo time, plus your flights and layovers at their real times.</p>`;
}
function jTotals() {
  const J = S.jp;
  const booked = flightsUSD() + J.stays.reduce((t, s) => t + toUSD(s.cost, s.cur), 0);
  const spent = J.exp.reduce((t, x) => t + toUSD(x.amount, x.cur), 0);
  const planned = J.items.reduce((t, i) => t + toUSD(i.cost, i.cur), 0);
  const cats = {};
  if (flightsUSD()) cats.flights = flightsUSD();
  J.stays.forEach(s => cats.stay = (cats.stay || 0) + toUSD(s.cost, s.cur));
  J.exp.forEach(x => cats[x.cat || 'other'] = (cats[x.cat || 'other'] || 0) + toUSD(x.amount, x.cur));
  return {booked, spent, planned, cats};
}
function viewJMoney() {
  const J = S.jp, B = num(J.budget), {booked, spent, planned, cats} = jTotals(), used = booked + spent, left = B - used;
  const days = tripDays(), t = today(), daysLeft = t < J.start ? days.length : t > J.end ? 0 : days.length - days.indexOf(t);
  const ed = editing('exp'), catList = Object.entries(cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]), maxC = Math.max(1, ...catList.map(c => c[1]));
  const byDate = {}; J.exp.forEach(x => (byDate[x.date || ''] = byDate[x.date || ''] || []).push(x));
  return `<section class="card"><h2>Overview</h2>
      ${B ? `<div class="trend"><b>${money(left, 'USD')}</b><span>${left >= 0 ? 'left' : 'over'} of your ${money(B, 'USD')} budget</span></div>
        <div class="meter"><i style="width:${Math.min(100, used / B * 100)}%${left < 0 ? ';background:var(--danger)' : ''}"></i></div>` : '<p class="note">Set a total budget below to track what you have left.</p>'}
      <div class="stats"><div class="stat"><b>${cash0(booked)}</b><span>booked</span></div><div class="stat"><b>${cash0(spent)}</b><span>spent</span></div>
        <div class="stat"><b>${B && daysLeft ? cash0(Math.max(0, left) / daysLeft) : '–'}</b><span>per day left</span></div></div>
      ${jpSaved()}${planned ? `<p class="note">Your itinerary has ${money(planned, 'USD')} in planned costs. They count once you log them as spending.</p>` : ''}
      <details class="mt" ${det('jBudget', !B)}><summary class="link">${B ? 'Change budget' : 'Set budget'}</summary>
        <form data-form="budget" class="field mt"><input class="input" name="budget" inputmode="decimal" placeholder="Total budget in US dollars" value="${B || ''}" aria-label="Total budget in US dollars"><button class="btn" type="submit">Save</button></form></details></section>
    ${catList.length ? `<section class="card"><h2>Where it's going</h2>${catList.map(([c, v]) => `<div class="crow"><div class="row"><b>${catEm(c)} ${catLabel(c)}</b><span>${money(v, 'USD')}</span></div><div class="cbar"><i style="width:${v / maxC * 100}%"></i></div></div>`).join('')}</section>` : ''}
    <details class="card" ${det('jExpForm', !!ed || !J.exp.length)}><summary class="sum"><h2>${ed ? 'Edit spending' : 'Log spending'}</h2><span class="small muted">Booked flights and stays are counted for you</span></summary>
      <form data-form="exp" class="stack">
        <input class="input" name="title" placeholder="What, like Ramen in Shinjuku" value="${fval(ed, 'title')}" aria-label="What">
        <div class="field"><input class="input" name="amount" inputmode="decimal" placeholder="Amount" value="${ed ? ed.amount : ''}" aria-label="Amount">${curSel(ed && ed.cur, 'JPY')}</div>
        <div class="field"><select class="input" name="cat" aria-label="Category">${JP_CATS.map(c => opt(c[0], c[1] + ' ' + c[2], ed ? ed.cat : 'food')).join('')}</select>
          <input class="input" type="date" name="date" value="${ed ? esc(ed.date) : t}" aria-label="Date" style="flex:0 0 150px"></div>
        ${formActions('exp')}</form></details>
    ${Object.keys(byDate).sort().reverse().map(d => `<section class="card"><h3>${d ? esc(fmtDay(d)) : 'No date'}</h3>
      ${byDate[d].map(x => `<div class="ev"><span class="ev-t" style="width:26px;font-size:18px">${catEm(x.cat)}</span><div class="ev-b"><b>${esc(x.title)}</b><span class="small">${both(x.amount, x.cur)}</span></div>
        <div class="ev-a"><button class="link" data-act="jEdit" data-kind="exp" data-id="${esc(x.id)}">Edit</button><button class="link danger" data-act="jDel" data-kind="exp" data-id="${esc(x.id)}" data-confirm>Delete</button></div></div>`).join('')}</section>`).join('')}`;
}
let rateTried = false;
function fetchRate(quiet) {
  return fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=JPY').then(r => r.json()).then(d => {
    const v = d && d.rates && d.rates.JPY; if (!(v > 0)) throw 0;
    S.jp.rate = {v, d:d.date || today(), src:'ecb'}; save(); render();
    if (!quiet) toast(`Rate updated: ¥${fmtN(v)} per dollar.`);
  }).catch(() => { if (!quiet) toast("Couldn't get the rate. Check your connection or set it yourself."); });
}
function viewJConv() {
  const r = R(), J = S.jp;
  if (!rateTried && J.rate.src !== 'manual' && Date.now() - keyDate(J.rate.d).getTime() > 2 * 864e5) { rateTried = true; setTimeout(() => fetchRate(true), 0); }
  return `<section class="card"><h2>Yen and dollars</h2>
      <label class="label" for="cvJ">Yen</label><input class="input big-in" id="cvJ" inputmode="decimal" placeholder="¥0" autocomplete="off">
      <label class="label" for="cvU">US dollars</label><input class="input big-in" id="cvU" inputmode="decimal" placeholder="$0" autocomplete="off">
      <p class="note">1 US dollar = ¥${fmtN(r)}. ${J.rate.src === 'manual' ? 'You set this rate' : 'Exchange rate from the European Central Bank'} on ${esc(fmtDay(J.rate.d))}.</p>
      <div class="btns mt"><button class="btn sm" data-act="jRate">Update rate</button></div>
      <details class="mt" ${det('jRateForm')}><summary class="link">Set the rate yourself</summary>
        <form data-form="rate" class="field mt"><input class="input" name="rate" inputmode="decimal" placeholder="Yen per dollar, like 150" aria-label="Yen per dollar"><button class="btn" type="submit">Save</button></form></details></section>
    <section class="card"><h2>Quick prices</h2>${[100, 300, 500, 1000, 3000, 5000, 10000, 20000, 50000].map(y => `<div class="lrow"><b>¥${y.toLocaleString()}</b><span>${money(y / r, 'USD')}</span></div>`).join('')}</section>
    <section class="card"><h2>Good to know</h2>
      <div class="lrow"><span>Lots of small shops, shrines and food stalls only take cash, so keep some yen on you.</span></div>
      <div class="lrow"><span>7-Eleven ATMs usually accept US cards.</span></div>
      <div class="lrow"><span>If a card machine asks whether to pay in dollars or yen, pick yen. Paying in dollars usually costs more.</span></div>
      <div class="lrow"><span>Tipping isn't expected in Japan.</span></div></section>`;
}
function viewJFlights() {
  const ed = editing('flight'), F = S.jp.flights, JN = journeys(), pre = !ed && UI.fpre ? UI.fpre : null;
  const row = (l, v) => v ? `<div class="lrow"><span class="muted">${l}</span><span>${v}</span></div>` : '';
  const BK = flightBookings(), home = homeTz();
  const leg = f => { const tf = fTzFrom(f), tt = fTzTo(f), d0 = fDep(f), d1 = fArr(f), dur = tf && tt && d1 > d0 ? d1 - d0 : 0;
    const b = BK.find(x => x.legs.includes(f)), shared = b && b.legs.length > 1;
    const costRow = b && b.f === f && b.usd ? row(shared ? `Price for all ${b.legs.length} flights` : 'Cost', both(f.cost, f.cur) + (shared ? '<small>One booking, counted once</small>' : '')) : shared && b.usd ? row('Cost', `Part of booking ${esc(f.conf)}`) : row('Cost', f.cost ? both(f.cost, f.cur) : '');
    return `<section class="card"><span class="small muted">${esc([f.airline, f.num].filter(Boolean).join(' ') || 'Flight')}</span>
      <h2 style="font-size:24px;margin-top:2px">${esc(f.from)} → ${esc(f.to)}</h2>
      <div class="pair"><div><span>Departs${tf ? ', ' + esc(tzName(tf)) + ' time' : ''}</span><b>${esc(fmtDT(f.dep))}</b></div><div><span>Arrives${tt ? ', ' + esc(tzName(tt)) + ' time' : ''}</span><b>${esc(fmtDT(f.arr))}</b>
        ${tt && f.arr && tt !== home && d1 ? `<small class="muted" style="display:block;margin-top:2px">That's ${esc(inTz(d1, home))} ${esc(tzName(home))} time</small>` : ''}</div></div>
      ${dur ? `<p class="small muted mt">✈️ ${esc(durTxt(dur))} in the air</p>` : ''}
      ${(!tf && f.from) || (!tt && f.to) ? `<p class="small mt" style="color:var(--danger)">Hibi doesn't know the time zone for ${esc([!tf ? f.from : '', !tt ? f.to : ''].filter(Boolean).join(' or '))}. Tap Edit and pick it, so layovers and flight times come out right.</p>` : ''}
      <div class="mt">${f.conf ? `<div class="lrow"><span class="muted">Confirmation</span><span><b>${esc(f.conf)}</b> <button class="link" data-act="copy" data-v="${esc(f.conf)}">Copy</button></span></div>` : ''}
      ${row('Seat', esc(f.seat))}${costRow}${row('Notes', esc(f.notes))}</div>
      <div class="row mt"><button class="link" data-act="jEdit" data-kind="flight" data-id="${esc(f.id)}">Edit</button><button class="link danger" data-act="jDel" data-kind="flight" data-id="${esc(f.id)}" data-confirm>Delete</button></div></section>`; };
  return `${JN.map(j => `<h2 class="gsec">${j.title === 'Flying to Japan' ? '🛫' : j.title === 'Flying home' ? '🏠' : '✈️'} ${esc(j.title)} <span class="small muted">${esc(j.route)}${j.legs.length > 1 ? `, ${j.legs.length} flights` : ''}${j.total ? `, ${esc(durTxt(j.total))} total` : ''}</span></h2>
      ${j.legs.map((f, i) => (i ? `<div class="layover">⏳ Layover in <b>${esc(j.lays[i - 1].at)}</b>: ${esc(durTxt(j.lays[i - 1].ms))}${j.lays[i - 1].ms < 60 * 6e4 ? ' <b style="color:var(--danger)">(tight)</b>' : ''}</div>` : '') + leg(f)).join('')}
      ${j.title !== 'Flight' ? '' : `<button class="btn ghost block" style="margin:-4px 0 14px" data-act="jConnect" data-to="${esc(j.legs[j.legs.length - 1].to)}" data-dep="${esc(j.legs[j.legs.length - 1].arr || '')}" data-conf="${esc(j.legs[j.legs.length - 1].conf || '')}" data-air="${esc(j.legs[j.legs.length - 1].airline || '')}">+ Add a connecting flight from ${esc(j.legs[j.legs.length - 1].to)}</button>`}`).join('')}
    <details class="card" ${det('jFlightForm', !F.length || !!ed || !!pre)}><summary class="sum"><h2>${ed ? 'Edit flight' : 'Add a flight'}</h2><span class="small muted">Shows up on your itinerary automatically</span></summary>
      <form data-form="flight" class="stack">
        <div class="ff"><label>From<input class="input" name="from" placeholder="MCO" value="${pre ? esc(pre.from) : fval(ed, 'from')}"></label><label>To<input class="input" name="to" placeholder="HND" value="${fval(ed, 'to')}"></label>
          <label>Airline<input class="input" name="airline" placeholder="Airline" value="${pre && pre.air ? esc(pre.air) : fval(ed, 'airline')}"></label><label>Flight number<input class="input" name="num" placeholder="NH 113" value="${fval(ed, 'num')}"></label></div>
        <div class="ff one"><label>Departs (local time)<input class="input" type="datetime-local" name="dep" value="${pre && pre.dep ? esc(pre.dep) : fval(ed, 'dep')}"></label><label>Arrives (local time)<input class="input" type="datetime-local" name="arr" value="${fval(ed, 'arr')}"></label></div>
        <div class="ff"><label>From time zone<select class="input" name="tzFrom">${opt('', 'Automatic', ed ? ed.tzFrom || '' : '')}${TZ_CHOICES.map(([k, l]) => opt(k, l, ed ? ed.tzFrom || '' : '')).join('')}</select></label>
          <label>To time zone<select class="input" name="tzTo">${opt('', 'Automatic', ed ? ed.tzTo || '' : '')}${TZ_CHOICES.map(([k, l]) => opt(k, l, ed ? ed.tzTo || '' : '')).join('')}</select></label></div>
        <div class="ff"><label>Confirmation<input class="input" name="conf" value="${pre && pre.conf ? esc(pre.conf) : fval(ed, 'conf')}"></label><label>Seat<input class="input" name="seat" value="${fval(ed, 'seat')}"></label></div>
        <div class="field"><input class="input" name="cost" inputmode="decimal" placeholder="Cost" value="${ed && ed.cost ? ed.cost : ''}" aria-label="Cost">${curSel(ed && ed.cur, 'USD')}</div>
        <textarea class="input" name="notes" style="min-height:70px" placeholder="Notes, like baggage allowance" aria-label="Notes">${fval(ed, 'notes')}</textarea>
        ${formActions('flight')}</form></details>
    <p class="note">Add each flight separately, including connections, using each airport's local time. Hibi knows the time zone for most airports, so it works out real flight times, layovers and when you land back home. If it doesn't know one, pick it in the form.</p>
    <p class="note"><b>Booked one ticket for several flights, like a round trip?</b> Give every flight the same confirmation code and put the price on just one of them. Hibi counts each booking once in your budget.</p>
    <p class="note">Tokyo is 14 hours ahead of Florida in winter, so you'll land on a later date than it feels like.</p>`;
}
function viewJStays() {
  const ed = editing('stay'), t = today(), L = S.jp.stays.slice().sort((a, b) => (a.ci || '').localeCompare(b.ci || ''));
  const row = (l, v) => v ? `<div class="lrow"><span class="muted">${l}</span><span>${v}</span></div>` : '';
  const nights = s => s.ci && s.co ? Math.round((keyDate(s.co) - keyDate(s.ci)) / 864e5) : 0;
  return `${L.map(s => `<section class="card"><span class="small muted">${esc(s.kind || 'Stay')}${nights(s) ? `, ${plural(nights(s), 'night')}` : ''}</span>
      <h2 style="font-size:22px;margin-top:2px">${esc(s.name)} ${s.ci && s.co && t >= s.ci && t < s.co ? '<span class="pill">Tonight</span>' : ''}</h2>
      ${s.address ? `<a class="maplink" href="${mapsLink(s.address)}" target="_blank" rel="noopener">📍 ${esc(s.address)}</a>` : ''}
      <div class="pair"><div><span>Check in</span><b>${s.ci ? esc(fmtDay(s.ci)) : 'Not set'}${s.cit ? ', ' + fmtTime(s.cit) : ''}</b></div><div><span>Check out</span><b>${s.co ? esc(fmtDay(s.co)) : 'Not set'}${s.cot ? ', ' + fmtTime(s.cot) : ''}</b></div></div>
      <div class="mt">${s.conf ? `<div class="lrow"><span class="muted">Confirmation</span><span><b>${esc(s.conf)}</b> <button class="link" data-act="copy" data-v="${esc(s.conf)}">Copy</button></span></div>` : ''}
      ${row('Getting in', esc(s.entry))}${row('Wi-Fi', esc(s.wifi))}${row('Host or contact', esc(s.host))}${row('Cost', s.cost ? both(s.cost, s.cur) : '')}${row('Notes', esc(s.notes))}
      ${s.link ? `<div class="lrow"><span class="muted">Listing</span><a class="maplink" href="${esc(safeUrl(s.link))}" target="_blank" rel="noopener">Open</a></div>` : ''}</div>
      <div class="row mt"><button class="link" data-act="jEdit" data-kind="stay" data-id="${esc(s.id)}">Edit</button><button class="link danger" data-act="jDel" data-kind="stay" data-id="${esc(s.id)}" data-confirm>Delete</button></div></section>`).join('')}
    <details class="card" ${det('jStayForm', !L.length || !!ed)}><summary class="sum"><h2>${ed ? 'Edit stay' : 'Add a stay'}</h2><span class="small muted">Airbnb, hotel or anywhere you sleep</span></summary>
      <form data-form="stay" class="stack">
        <div class="field"><input class="input" name="name" placeholder="Name, like Shinjuku apartment" value="${fval(ed, 'name')}" aria-label="Name">
          <select class="input" name="kind" aria-label="Type" style="flex:0 0 120px">${['Airbnb', 'Hotel', 'Hostel', 'Ryokan', 'Other'].map(k => opt(k, k, ed ? ed.kind : 'Airbnb')).join('')}</select></div>
        <input class="input" name="address" placeholder="Address" value="${fval(ed, 'address')}" aria-label="Address">
        <div class="ff"><label>Check-in date<input class="input" type="date" name="ci" value="${fval(ed, 'ci')}"></label><label>Time<input class="input" type="time" name="cit" value="${fval(ed, 'cit')}"></label>
          <label>Check-out date<input class="input" type="date" name="co" value="${fval(ed, 'co')}"></label><label>Time<input class="input" type="time" name="cot" value="${fval(ed, 'cot')}"></label></div>
        <div class="ff"><label>Confirmation<input class="input" name="conf" value="${fval(ed, 'conf')}"></label><label>Host or contact<input class="input" name="host" value="${fval(ed, 'host')}"></label></div>
        <input class="input" name="entry" placeholder="How to get in, like door code or key box" value="${fval(ed, 'entry')}" aria-label="How to get in">
        <input class="input" name="wifi" placeholder="Wi-Fi name and password" value="${fval(ed, 'wifi')}" aria-label="Wi-Fi">
        <input class="input" name="link" placeholder="Listing link" value="${fval(ed, 'link')}" aria-label="Listing link" inputmode="url" autocapitalize="off">
        <div class="field"><input class="input" name="cost" inputmode="decimal" placeholder="Total cost" value="${ed && ed.cost ? ed.cost : ''}" aria-label="Total cost">${curSel(ed && ed.cur, 'USD')}</div>
        <textarea class="input" name="notes" style="min-height:70px" placeholder="Notes" aria-label="Notes">${fval(ed, 'notes')}</textarea>
        ${formActions('stay')}</form></details>`;
}
function viewJPack() {
  const P = S.jp.pack, done = P.filter(p => p.done).length, cats = [...new Set(P.map(p => p.cat))];
  return `<section class="card"><div class="row"><h2>Packed</h2><b>${done} / ${P.length}</b></div><div class="meter"><i style="width:${P.length ? done / P.length * 100 : 0}%"></i></div></section>
    ${cats.map(c => `<section class="card"><h3>${esc(c)}</h3>${P.filter(p => p.cat === c).map(p => swipeWrap(`<div class="pk${p.done ? ' done' : ''}">
      <button class="check sm" aria-pressed="${!!p.done}" aria-label="Packed: ${esc(p.t)}" data-act="jToggle" data-kind="pack" data-id="${esc(p.id)}">${ICON_CHECK}</button><span>${esc(p.t)}</span>
      <button class="link quiet" data-act="jDel" data-kind="pack" data-id="${esc(p.id)}" data-confirm aria-label="Remove ${esc(p.t)}">✕</button></div>`, {r:['jToggle', p.done ? 'Undo' : 'Packed'], l:['jDel', 'Delete'], data:{kind:'pack', id:p.id}})).join('')}</section>`).join('')}
    <section class="card"><h2>Add an item</h2><form data-form="pack" class="stack"><input class="input" name="t" placeholder="Item" aria-label="Item">
      <div class="field"><select class="input" name="cat" aria-label="Category">${[...new Set([...cats, 'Other'])].map(c => opt(c, c, 'Other')).join('')}</select><button class="btn" type="submit">Add</button></div></form></section>
    ${done ? '<button class="link danger" data-act="jPackReset" data-confirm>Uncheck everything</button>' : ''}`;
}
function viewJPlaces() {
  const L = S.jp.places.slice().sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0));
  return `<section class="card"><h2>Add a place</h2><form data-form="place" class="stack">
      <input class="input" name="name" placeholder="Place, like teamLab Planets" aria-label="Place">
      <input class="input" name="area" placeholder="Area, like Toyosu (optional)" aria-label="Area">
      <input class="input" name="note" placeholder="Note (optional)" aria-label="Note">
      <button class="btn block" type="submit">Add to list</button></form></section>
    ${L.length ? `<section class="card"><h2>Want to go</h2>${L.map(p => `<div class="pk${p.done ? ' done' : ''}">
      <button class="check sm" aria-pressed="${!!p.done}" aria-label="Been there: ${esc(p.name)}" data-act="jToggle" data-kind="place" data-id="${esc(p.id)}">${ICON_CHECK}</button>
      <span><b>${esc(p.name)}</b>${p.area ? `<span class="small muted">, ${esc(p.area)}</span>` : ''}${p.note ? `<span class="small muted" style="display:block">${esc(p.note)}</span>` : ''}
        <a class="maplink" href="${mapsLink([p.name, p.area, 'Japan'].filter(Boolean).join(' '))}" target="_blank" rel="noopener">Map</a></span>
      <button class="link quiet" data-act="jDel" data-kind="place" data-id="${esc(p.id)}" data-confirm aria-label="Remove ${esc(p.name)}">✕</button></div>`).join('')}</section>`
      : emptyCard('No places yet', 'Save spots you want to see. Check them off once you go.')}`;
}
const PHRASES = [
  ['Hello','こんにちは','konnichiwa'],['Good morning','おはようございます','ohayō gozaimasu'],['Thank you','ありがとうございます','arigatō gozaimasu'],
  ['Excuse me / Sorry','すみません','sumimasen'],['This one, please','これをください','kore o kudasai'],['How much is it?','いくらですか？','ikura desu ka?'],
  ['Can I pay by card?','カードで払えますか？','kādo de haraemasu ka?'],['Check, please','お会計お願いします','o-kaikei onegai shimasu'],
  ['Table for one','一人です','hitori desu'],['Where is the toilet?','トイレはどこですか？','toire wa doko desu ka?'],['Where is the station?','駅はどこですか？','eki wa doko desu ka?'],
  ['Do you speak English?','英語を話せますか？','eigo o hanasemasu ka?'],["I don't understand",'わかりません','wakarimasen'],['Delicious!','おいしい！','oishii!'],
  ['I have an allergy to ___','___アレルギーがあります','___ arerugī ga arimasu'],['Help!','助けて！','tasukete!']];
function viewJPhrases() {
  return `<section class="card">${PHRASES.map(([en, ja, ro]) => `<div class="phr"><div><span class="small muted">${esc(en)}</span><span class="jp" lang="ja">${ja}</span><span class="small muted">${esc(ro)}</span></div>
    <button class="btn sm ghost" data-act="copy" data-v="${esc(ja)}" aria-label="Copy ${esc(en)} in Japanese">Copy</button></div>`).join('')}</section>
    <p class="note">Tap Copy to paste a phrase into a translator app, or just show your screen.</p>`;
}
function viewJInfo() {
  const J = S.jp;
  return `<section class="card"><h2>Trip details</h2><form data-form="trip" class="stack mt">
      <div class="ff"><label>First day<input class="input" type="date" name="start" value="${esc(J.start)}"></label><label>Last day<input class="input" type="date" name="end" value="${esc(J.end)}"></label></div>
      <button class="btn" type="submit">Save dates</button></form></section>
    <section class="card"><div class="row"><h2>Tokyo time</h2><b style="font-size:20px" id="jpClock">${tokyoNow()}</b></div><p class="note">Japan is 14 hours ahead of Florida in winter.</p></section>
    <section class="card"><h2>Emergency</h2>
      <div class="lrow"><b>Police</b><a class="maplink" href="tel:110">110</a></div>
      <div class="lrow"><b>Ambulance or fire</b><a class="maplink" href="tel:119">119</a></div>
      <div class="lrow"><b>US Embassy Tokyo</b><a class="maplink" href="tel:+81332245000">+81 3-3224-5000</a></div>
      <p class="note">The embassy number works around the clock for US citizens in an emergency.</p></section>
    <section class="card"><h2>Good to know</h2>
      <div class="lrow"><span>Japan uses the same plug shape as the US, so your chargers work without an adapter.</span></div>
      <div class="lrow"><span>Add a Suica or PASMO card to Apple Wallet to tap through trains and pay at convenience stores.</span></div>
      <div class="lrow"><span>Public trash cans are rare. Carry a small bag for trash.</span></div>
      <div class="lrow"><span>If you bring medication, check Japan's rules first. Some common US cold medicines aren't allowed.</span></div></section>
    <section class="card"><h2>Notes</h2><textarea class="input mt" data-bind="jnotes" placeholder="Anything else, like JR pass info or gift ideas" aria-label="Trip notes">${esc(J.notes)}</textarea></section>`;
}
/* ----- Japan: today, to-do, gifts, journal, calendar export ----- */
const JP_PREP = `60|Check your passport is valid for the whole trip
30|Book popular spots that sell out, like Shibuya Sky or teamLab
14|Plan how you'll get from the airport to your first stay
7|Set up an eSIM or pocket Wi-Fi
7|Check your cards work abroad and have no foreign transaction fee
7|Get some yen for arrival
7|Save a photo of your passport in a hidden album
3|Fill out Visit Japan Web for immigration and customs
3|Add a Suica or PASMO card to Apple Wallet
2|Download offline Google Maps for Tokyo
1|Check in for your flight
1|Back up this app`;
const prepSeed = () => JP_PREP.split('\n').map((l, i) => { const [b, t] = l.split('|'); return {id:'p' + i, t, before:+b, done:false}; });
const prepDate = p => { if (p.due) return p.due; const d = keyDate(S.jp.start); d.setDate(d.getDate() - (p.before || 0)); return dk(d); };
const prepSorted = () => S.jp.prep.slice().sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || prepDate(a).localeCompare(prepDate(b)));
function prepRow(p) {
  const due = prepDate(p), late = !p.done && due < today();
  return swipeWrap(`<div class="pk${p.done ? ' done' : ''}"><button class="check sm" aria-pressed="${!!p.done}" aria-label="Done: ${esc(p.t)}" data-act="jToggle" data-kind="prep" data-id="${esc(p.id)}">${ICON_CHECK}</button>
    <span>${esc(p.t)}<span class="small${late ? '' : ' muted'}" style="display:block${late ? ';color:var(--danger);font-weight:700' : ''}">${late ? 'Overdue, was ' : 'By '}${esc(fmtDay(due))}</span></span>
    <button class="link quiet" data-act="jDel" data-kind="prep" data-id="${esc(p.id)}" data-confirm aria-label="Remove ${esc(p.t)}">✕</button></div>`,
    {r:['jToggle', p.done ? 'Undo' : 'Done'], l:['jDel', 'Delete'], data:{kind:'prep', id:p.id}});
}
function todayCard() {
  const t = today(), J = S.jp;
  if (t < J.start) {
    const next = prepSorted().filter(p => !p.done).slice(0, 3);
    if (!next.length) return '';
    return `<section class="card"><div class="row"><h2>Up next to prepare</h2><button class="link" data-act="go" data-to="jprep">See all</button></div>${next.map(prepRow).join('')}</section>`;
  }
  if (t > J.end) return '';
  const ev = dayEvents(t), stay = J.stays.find(s => s.ci && s.co && t >= s.ci && t < s.co);
  return `<section class="card"><h2>Today</h2>
    ${ev.length ? ev.map(e => `<div class="lrow"><span class="muted" style="flex:none;width:72px">${e.time ? fmtTime(e.time) : 'Any time'}${e.zone && e.time ? `<small style="display:block;font-size:11px;color:var(--accent)">${esc(e.zone)}</small>` : ''}</span><span style="text-align:left;flex:1;color:var(--ink)">${esc(e.title)}</span></div>`).join('') : '<p class="note">Nothing planned. A free day.</p>'}
    ${stay ? `<span class="label">Tonight</span><b>${esc(stay.name)}</b>${stay.address ? `<a class="maplink" style="display:block" href="${mapsLink(stay.address)}" target="_blank" rel="noopener">📍 ${esc(stay.address)}</a>` : ''}
      ${stay.entry ? `<p class="small mt">Getting in: <b>${esc(stay.entry)}</b></p>` : ''}${stay.wifi ? `<p class="small">Wi-Fi: <b>${esc(stay.wifi)}</b></p>` : ''}` : ''}
    <span class="label">Quick convert</span><div class="field"><input class="input" id="cvJ" inputmode="decimal" placeholder="¥" aria-label="Yen" autocomplete="off"><input class="input" id="cvU" inputmode="decimal" placeholder="$" aria-label="US dollars" autocomplete="off"></div></section>`;
}
function viewJPrep() {
  const P = S.jp.prep, done = P.filter(p => p.done).length;
  return `<section class="card"><div class="row"><h2>Before you go</h2><b>${done} / ${P.length}</b></div><div class="meter"><i style="width:${P.length ? done / P.length * 100 : 0}%"></i></div>
      <p class="note">Due dates move with your trip dates.</p></section>
    <section class="card">${prepSorted().map(prepRow).join('') || '<p class="note">No tasks yet.</p>'}</section>
    <section class="card"><h2>Add a task</h2><form data-form="prep" class="stack">
      <input class="input" name="t" placeholder="Task, like exchange money" aria-label="Task">
      <div class="field"><input class="input" type="date" name="due" aria-label="Due date"><button class="btn" type="submit">Add</button></div></form></section>`;
}
function viewJGifts() {
  const G = S.jp.gifts, bought = G.filter(g => g.done).length, total = G.reduce((t, g) => t + toUSD(g.budget, g.cur), 0);
  const people = [...new Set(G.map(g => g.who || 'Anyone'))];
  return `<section class="card"><div class="row"><h2>Gifts</h2><b>${bought} / ${G.length} bought</b></div>
      ${G.length ? `<p class="note">Planned gift budget: <b>${money(total, 'USD')}</b> (${money(total * R(), 'JPY')}). Log what you buy in Money so it counts.</p>` : '<p class="note">Plan who you\'re buying for so you don\'t overspend at the end of the trip.</p>'}</section>
    ${people.map(p => `<section class="card"><h3>${esc(p)}</h3>${G.filter(g => (g.who || 'Anyone') === p).map(g => `<div class="pk${g.done ? ' done' : ''}">
      <button class="check sm" aria-pressed="${!!g.done}" aria-label="Bought: ${esc(g.what)}" data-act="jToggle" data-kind="gift" data-id="${esc(g.id)}">${ICON_CHECK}</button>
      <span>${esc(g.what)}${g.budget ? `<span class="small muted" style="display:block">Up to ${both(g.budget, g.cur)}</span>` : ''}</span>
      <button class="link quiet" data-act="jDel" data-kind="gift" data-id="${esc(g.id)}" data-confirm aria-label="Remove ${esc(g.what)}">✕</button></div>`).join('')}</section>`).join('')}
    <section class="card"><h2>Add a gift</h2><form data-form="gift" class="stack">
      <input class="input" name="who" placeholder="For who" aria-label="For who" list="giftWho"><datalist id="giftWho">${people.filter(p => p !== 'Anyone').map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      <input class="input" name="what" placeholder="Idea, like KitKats or a keychain" aria-label="Gift idea">
      <div class="field"><input class="input" name="budget" inputmode="decimal" placeholder="Budget (optional)" aria-label="Budget">${curSel('', 'JPY')}</div>
      <button class="btn block" type="submit">Add</button></form></section>`;
}
function viewJJournal() {
  const days = tripDays(), t = today();
  const k = days.includes(S.jp.jsel) ? S.jp.jsel : (days.includes(t) ? t : days[0]);
  if (!k) return emptyCard('Set your trip dates', 'Add them in Lists, then Info.');
  const e = S.jp.journal[k] || {}, written = days.filter(d => S.jp.journal[d] && (S.jp.journal[d].text || S.jp.journal[d].best));
  return `<section class="card"><select class="input" data-bind="jjday" aria-label="Day">${days.map((d, i) => `<option value="${d}"${d === k ? ' selected' : ''}>Day ${i + 1}, ${esc(fmtDay(d))}${S.jp.journal[d] && S.jp.journal[d].text ? ' ✓' : ''}</option>`).join('')}</select>
      <label class="label" for="jjBest">Best thing today</label><input class="input" id="jjBest" data-bind="jj" data-k="${k}" data-f="best" value="${esc(e.best || '')}" placeholder="Like the ramen in Shinjuku">
      <label class="label" for="jjText">What happened</label><textarea class="input" id="jjText" data-bind="jj" data-k="${k}" data-f="text" placeholder="Where you went, who you met, what you ate">${esc(e.text || '')}</textarea>
      <p class="note">Saves as you type.</p></section>
    ${written.filter(d => d !== k).reverse().map(d => { const x = S.jp.journal[d];
      return `<details class="card" ${det('jj-' + d)}><summary class="sum"><h3>Day ${days.indexOf(d) + 1}, ${esc(fmtDay(d))}</h3><span class="small muted">${esc(x.best || 'No highlight')}</span></summary><p>${esc(x.text || '').replace(/\n/g, '<br>')}</p></details>`; }).join('')}`;
}
function icsFile() {
  const J = S.jp, stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const escI = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const d8 = k => k.replace(/-/g, '');
  const ev = [];
  const add = (uid, k, time, title, place, note) => {
    const lines = ['BEGIN:VEVENT', `UID:${uid}@hibi`, `DTSTAMP:${stamp}`];
    if (time) { const [h, m] = time.split(':').map(Number), end = Math.min(h + 1, 23); lines.push(`DTSTART;TZID=Asia/Tokyo:${d8(k)}T${pad(h)}${pad(m)}00`, `DTEND;TZID=Asia/Tokyo:${d8(k)}T${pad(end)}${pad(end === h + 1 ? m : 59)}00`); }
    else { const n = keyDate(k); n.setDate(n.getDate() + 1); lines.push(`DTSTART;VALUE=DATE:${d8(k)}`, `DTEND;VALUE=DATE:${d8(dk(n))}`); }
    lines.push(`SUMMARY:${escI(title)}`); if (place) lines.push(`LOCATION:${escI(place)}`); if (note) lines.push(`DESCRIPTION:${escI(note)}`);
    lines.push('END:VEVENT'); ev.push(lines.join('\r\n'));
  };
  J.items.forEach(i => add(i.id, i.d, i.time, i.title, i.place, i.note));
  // Flights use real times when the airport's time zone is known, otherwise "floating" airport clock times
  const fl = v => v ? v.replace(/[-:]/g, '').slice(0, 13) + '00' : '';
  const utc = ms => new Date(ms).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const at = (v, tz) => tz && v ? utc(zoned(v, tz)) : fl(v);
  journeys().forEach(j => { j.legs.forEach(f => { if (!f.dep) return; const lines = ['BEGIN:VEVENT', `UID:${f.id}-flight@hibi`, `DTSTAMP:${stamp}`, `DTSTART:${at(f.dep, fTzFrom(f))}`, `DTEND:${f.arr && (fTzFrom(f) && fTzTo(f) ? fArr(f) > fDep(f) : dtMs(f.arr) > dtMs(f.dep)) ? at(f.arr, fTzTo(f)) : at(f.dep, fTzFrom(f))}`,
      `SUMMARY:${escI(`✈️ ${f.from} → ${f.to}${f.num ? ' (' + f.num + ')' : ''}`)}`, `DESCRIPTION:${escI([f.airline, f.conf ? 'Confirmation ' + f.conf : '', f.seat ? 'Seat ' + f.seat : '', fTzFrom(f) && fTzTo(f) ? '' : 'Times are local to each airport.'].filter(Boolean).join('\n'))}`,
      'BEGIN:VALARM', 'TRIGGER:-PT3H', 'ACTION:DISPLAY', `DESCRIPTION:${escI(`Flight ${f.from} → ${f.to} in 3 hours`)}`, 'END:VALARM', 'END:VEVENT']; ev.push(lines.join('\r\n')); });
    j.lays.forEach(l => { if (!l.from.arr || !l.to.dep) return; ev.push(['BEGIN:VEVENT', `UID:${l.to.id}-layover@hibi`, `DTSTAMP:${stamp}`, `DTSTART:${at(l.from.arr, fTzTo(l.from))}`, `DTEND:${at(l.to.dep, fTzFrom(l.to))}`, `SUMMARY:${escI(`⏳ Layover in ${l.at} (${durTxt(l.ms)})`)}`, 'TRANSP:TRANSPARENT', 'END:VEVENT'].join('\r\n')); }); });
  J.stays.forEach(s => { if (s.ci) add(s.id + '-in', s.ci, s.cit, `Check in: ${s.name}`, s.address, s.entry); if (s.co) add(s.id + '-out', s.co, s.cot, `Check out: ${s.name}`, s.address, ''); });
  const tz = ['BEGIN:VTIMEZONE', 'TZID:Asia/Tokyo', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0900', 'TZOFFSETTO:+0900', 'TZNAME:JST', 'END:STANDARD', 'END:VTIMEZONE'].join('\r\n');
  return {count:ev.length, text:['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hibi//Japan trip//EN', 'CALSCALE:GREGORIAN', tz, ...ev, 'END:VCALENDAR'].join('\r\n')};
}
const JVIEWS = {jprep:viewJPrep, jgifts:viewJGifts, jjournal:viewJJournal, jplan:viewJPlan, jmoney:viewJMoney, jconv:viewJConv, jflights:viewJFlights, jstays:viewJStays, jpack:viewJPack, jplaces:viewJPlaces, jphrases:viewJPhrases, jinfo:viewJInfo};

/* =========================================================
   Japan: actions and forms
   ========================================================= */
const FORM_KEY = {item:'jAdd', exp:'jExpForm', flight:'jFlightForm', stay:'jStayForm'};
const JACT = {
  mode: d => {
    if (S.mode === d.k) return false;
    S.lastMode[S.mode] = S.tab; S.mode = d.k; UI.edit = null;
    const t = S.lastMode[d.k];
    go(t && TAB_INFO[t] && (TAB_INFO[t].g === 'settings' || MODES[d.k].nav.some(n => n[0] === TAB_INFO[t].g)) ? t : firstTab(d.k));
  },
  jDay: d => { S.jp.sel = d.k; if (UI.edit && UI.edit.kind === 'item') UI.edit = null; },
  jMonth: d => { UI.jmo = (UI.jmo || 0) + (+d.n); },
  jEdit: d => { UI.edit = {kind:d.kind, id:d.id}; UI.open[FORM_KEY[d.kind]] = true; },
  cancelEdit: () => { const k = UI.edit && UI.edit.kind; UI.edit = null; if (k) UI.open[FORM_KEY[k]] = false; },
  jDel: d => { const a = JARR[d.kind]; S.jp[a] = S.jp[a].filter(x => x.id !== d.id); if (UI.edit && UI.edit.id === d.id) UI.edit = null; },
  jToggle: d => { const x = S.jp[JARR[d.kind]].find(y => y.id === d.id); if (x) x.done = !x.done; },
  jPackReset: () => { S.jp.pack.forEach(p => { p.done = false; }); },
  jRate: () => { fetchRate(false); return false; },
  jIcs: () => {
    const f = icsFile(); if (!f.count) { toast('Add some plans, flights or stays first.'); return false; }
    saveCalendar(f.text, 'japan-trip.ics', f.count); return false;
  },
  jConnect: d => { UI.edit = null; UI.fpre = {from:d.to, dep:d.dep, conf:d.conf, air:d.air}; UI.open.jFlightForm = true; setTimeout(() => { const f = $('form[data-form="flight"]'); if (f) { f.scrollIntoView({behavior:'smooth', block:'start'}); const t = f.elements.namedItem('to'); if (t) t.focus(); } }, 50); },
  copy: d => {
    try { navigator.clipboard.writeText(d.v).then(() => toast('Copied.'), () => toast("Couldn't copy here.")); } catch (e) { toast("Couldn't copy here."); }
    return false;
  },
};
const SAVE = {
  cardio: o => {
    const c = UI.clog; if (!c) return false;
    const x = {id:'c' + Date.now(), end:Date.now(), name:c.name, k:c.k}; if (c.start) x.start = c.start;
    const last = [...cardioLogs()].reverse().find(q => norm(q.name) === norm(c.name));
    CARDIO[c.k].f.forEach(f => { if (o[f] !== undefined && o[f] !== '') x[f] = o[f]; else if (last && f !== 'dist' && !(f === 'min' && c.start) && last[f] !== undefined && last[f] !== '') x[f] = last[f]; });
    if (!CARDIO[c.k].f.some(f => num(x[f]))) { toast('Fill in at least one number.'); return false; }
    if (c.k === 'tread' && !num(x.dist) && distOf(x)) x.dist = String(distOf(x));
    S.cardio.push(x); if (c.start) S.crun = null; UI.clog = null; toast(`${c.name} logged: ${cardioText(x, x.k)}.`);
  },
  item: o => { if (!o.title) { toast('Add what the plan is first.'); return false; } o.cost = num(o.cost); toast(upsert('item', o)); UI.open.jAdd = false; },
  exp: o => { o.amount = num(o.amount); if (!o.title || !(o.amount > 0)) { toast('Add what it was and how much.'); return false; } toast(upsert('exp', o)); UI.open.jExpForm = false; },
  flight: o => { if (!o.from || !o.to) { toast('Add where you fly from and to.'); return false; } o.from = o.from.toUpperCase(); o.to = o.to.toUpperCase(); o.cost = num(o.cost); toast(upsert('flight', o)); UI.fpre = null; UI.open.jFlightForm = false; },
  stay: o => { if (!o.name) { toast('Add the name of the place.'); return false; } if (o.ci && o.co && o.co < o.ci) { toast('Check-out is before check-in.'); return false; } o.cost = num(o.cost); toast(upsert('stay', o)); UI.open.jStayForm = false; },
  place: o => { if (!o.name) { toast('Add a place name.'); return false; } o.done = false; S.jp.places.push(Object.assign(o, {id:'j' + Date.now()})); toast('Added.'); },
  pack: o => { if (!o.t) { toast('Type an item first.'); return false; } S.jp.pack.push({id:'k' + Date.now(), t:o.t, cat:o.cat || 'Other', done:false}); },
  prep: o => { if (!o.t) { toast('Type a task first.'); return false; } S.jp.prep.push({id:'p' + Date.now(), t:o.t, due:o.due || '', before:0, done:false}); toast('Task added.'); },
  gift: o => { if (!o.what) { toast('Add a gift idea first.'); return false; } S.jp.gifts.push({id:'g' + Date.now(), who:o.who, what:o.what, budget:num(o.budget), cur:o.cur, done:false}); toast('Gift added.'); },
  budget: o => { S.jp.budget = num(o.budget); UI.open.jBudget = false; toast('Budget saved.'); },
  rate: o => { const v = num(o.rate); if (!(v > 0)) { toast('Enter a rate like 150.'); return false; } S.jp.rate = {v, d:today(), src:'manual'}; UI.open.jRateForm = false; toast('Rate saved.'); },
  trip: o => { if (!o.start || !o.end || o.end < o.start) { toast('Check your trip dates.'); return false; } S.jp.start = o.start; S.jp.end = o.end; S.jp.sel = null; UI.jmo = 0; toast('Trip dates saved.'); },
};
document.addEventListener('submit', e => {
  const f = e.target, kind = f.dataset && f.dataset.form; if (!kind || !SAVE[kind]) return;
  e.preventDefault();
  const o = {}; new FormData(f).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  Crash.lastAct = 'form ' + kind;
  try {
    if (SAVE[kind](o) === false) return;
    UI.edit = null; afterChange();
  } catch (err) { Crash.record(err, 'form'); toast('Something went wrong. A crash report was saved.'); }
});
