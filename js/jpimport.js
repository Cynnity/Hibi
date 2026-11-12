// Hibi: Japan trip file import (from the old Japan trip app) and the extra Japan screens it fills:
// day headers, taxi cards, emergency numbers, tips, free-time ideas and the budget plan. Loads after japan.js.
'use strict';
const jpHash = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
// "¥5,200 (paid)" or "$47.98" or "~¥4,000–6,000" into {cost, cur}
function jpPrice(s) {
  const t = String(s == null ? '' : s), m = /([¥$])\s*([\d,]+(?:\.\d+)?)/.exec(t);
  if (!m) return {cost:0, cur:'JPY'};
  return {cost:parseFloat(m[2].replace(/,/g, '')) || 0, cur:m[1] === '¥' ? 'JPY' : 'USD'};
}
// A time like "10:30–11:00 entry", "2 PM" or "~12:30" into "HH:MM"
function jpClock(s) {
  const t = String(s || ''); let m = /(\d{1,2})(?::(\d{2}))?\s*[–-]\s*\d{1,2}(?::\d{2})?\s*(AM|PM)/i.exec(t);   // "3–7:30 PM" starts at 3 PM
  if (m) return pad(+m[1] % 12 + (/pm/i.test(m[3]) ? 12 : 0)) + ':' + (m[2] || '00');
  m = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(t);
  if (m) { let h = +m[1]; if (m[3]) { h = h % 12 + (/pm/i.test(m[3]) ? 12 : 0); } return pad(h) + ':' + m[2]; }
  m = /(\d{1,2})\s*(AM|PM)/i.exec(t); if (m) return pad(+m[1] % 12 + (/pm/i.test(m[2]) ? 12 : 0)) + ':00';
  return '';
}
function jpCat(name, kind) {
  const n = String(name || '').toLowerCase();
  if (/check.?in|check.?out|airbnb|hotel|ryokan|^home|\bbed\b|sleep|stay/.test(n)) return 'stay';
  if (/flight|airport|boarding|customs|immigration|narita|haneda|layover/.test(n)) return 'flights';
  if (/train|station|bus\b|shinkansen|skyliner|taxi|transfer|subway|metro|ride to|go to|get to|freepass|ropeway/.test(n)) return 'transport';
  if (/ramen|lunch|dinner|breakfast|café|cafe|coffee|eat|restaurant|izakaya|sushi|curry|yakitori|konbini|food|snack|brunch|tea house|sweets/.test(n)) return 'food';
  if (/shop|store|mall|uniqlo|don quijote|book.?off|haul|souvenir|buy|cards|figures|tower records|broadway|market/.test(n)) return 'shopping';
  return 'activity';
}
const jpTr = st => st && st.transitTo && Array.isArray(st.transitTo.steps) ? st.transitTo.steps.map(x => ({mode:x.mode, mins:x.mins, fare:x.fare, text:x.text, line:x.line || '', color:x.color || ''})) : [];
function jpFromTrip(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.days)) throw new Error('That is not a trip file.');
  const J = {items:[], flights:[], stays:[], prep:[], pack:[], places:[], gifts:[], days:{}, taxi:[], tips:[], flex:[], phr:[], plan:null, emerg:null, tname:d.name || ''};
  const tipTitle = {}; (d.tips || []).forEach(t => { tipTitle[t.id] = t.title; });
  d.days.forEach(day => {
    J.days[day.date] = {title:day.title || '', city:day.city || '', stay:day.stay || '', walk:day.walk === '—' ? '' : (day.walk || ''), tz:day.tz || '', tzNote:day.tzNote || '', planB:Array.isArray(day.planB) ? day.planB : []};
    (day.stops || []).forEach((st, n) => {
      const notes = [];
      if (st.note) notes.push(st.note);
      if (st.hours) notes.push('Open: ' + st.hours);
      if (st.price) notes.push('Cost: ' + st.price);
      if (st.optional) notes.push('Optional.');
      if (Array.isArray(st.alts) && st.alts.length) notes.push('Backups: ' + st.alts.map(a => a.name + (a.address ? ' (' + a.address + ')' : '') + (a.note ? ': ' + a.note : '')).join(' | '));
      const o = {id:'x' + jpHash(day.date + '|' + n + '|' + st.name), d:day.date, time:/^\d\d:\d\d$/.test(st.time || '') ? st.time : jpClock(st.time), end:st.end || '', cat:jpCat(st.name, st.kind),
        title:st.name || 'Stop', place:st.address || '', cost:st.cost > 0 ? st.cost : 0, cur:'JPY', note:notes.join('\n'), imp:1};
      if (st.lat != null && st.lon != null) { o.lat = st.lat; o.lon = st.lon; }
      if (st.verified) o.vf = {ok:!!st.verified.ok, src:st.verified.src || '', date:st.verified.date || ''};
      if (st.pinApprox) o.approx = 1;
      const tr = jpTr(st); if (tr.length) { o.tr = tr; if (st.transitTo.note) o.trn = st.transitTo.note; if (st.transitTo.lastTrain) o.lt = String(st.transitTo.lastTrain); }
      if (Array.isArray(st.tips) && st.tips.length) o.tp = st.tips.filter(x => tipTitle[x]);
      if (st.fixed || st.locked) o.fixed = 1;
      J.items.push(o);
    });
  });
  (d.bookings || []).forEach((b, n) => {
    const p = jpPrice(b.price), clk = jpClock(b.time), notes = [];
    if (b.time && !/^\d\d:\d\d$/.test(b.time)) notes.push('Time: ' + b.time);
    if (b.price) notes.push('Price: ' + b.price);
    if (b.note) notes.push(b.note);
    // A booking that is already a stop on that day (same place) just marks that stop as booked, so it isn't listed twice
    const toks = String(b.name).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 2 && !/^(the|and|with|tea|house|entry|museum|ride|pm|am)$/.test(w));
    const need = Math.min(2, toks.length);
    let same = null, best = 0; J.items.forEach(x => { if (x.d !== b.date || x.st) return; const c = toks.filter(w => x.title.toLowerCase().includes(w)).length; if (need > 0 && c >= need && c > best) { best = c; same = x; } });
    if (same) { same.st = b.status === 'booked' ? 'booked' : 'todo'; if (!same.time && clk) same.time = clk; if (!same.cost && p.cost) { same.cost = p.cost; same.cur = p.cur; } same.note = [same.note, ...notes].filter(Boolean).join('\n'); return; }
    J.items.push({id:'x' + jpHash('book|' + n + '|' + b.name), d:b.date, time:clk, cat:/sumo|museum|teamlab|ghibli|sky|ride|tour/i.test(b.name) ? 'activity' : jpCat(b.name), title:b.name, place:'', cost:0, cur:p.cur, note:notes.join('\n'), st:b.status === 'booked' ? 'booked' : 'todo', imp:1});
  });
  const conf = d.flightConf || '';
  (d.flights || []).forEach((f, n) => {
    const m = /^([A-Z0-9]{2})\s*(\d+)/.exec(f.flight || '');
    const arrDate = f.arrDate || f.date;
    J.flights.push({id:'x' + jpHash('fl|' + n + '|' + f.flight), airline:m ? ({AS:'Alaska Airlines'}[m[1]] || m[1]) : '', num:f.flight || '', from:f.from, to:f.to, dep:f.date && f.dep ? f.date + 'T' + f.dep : '', arr:arrDate && f.arr ? arrDate + 'T' + f.arr : '',
      conf, seat:'', cost:n === 0 && d.budget && Array.isArray(d.budget.prepaid) ? ((d.budget.prepaid.find(x => /flights/i.test(x.name)) || {}).usd || 0) : 0, cur:'USD', notes:f.note || '', imp:1});
  });
  (d.stays || []).forEach((s, n) => {
    const p = jpPrice(s.price), notes = [s.room, s.charge ? 'Charged: ' + s.charge.replace(/^charged\s*/i, '') : '', s.cancel, s.price && !/^[¥$]/.test(String(s.price).trim()) ? '' : (s.price ? 'Price: ' + s.price : ''), s.note].filter(Boolean);
    J.stays.push({id:'x' + jpHash('st|' + n + '|' + s.name), name:s.name, address:s.address || '', ci:s.checkIn || '', co:s.checkOut || '', cit:s.checkInTime ? jpClock(String(s.checkInTime).replace(/^after\s*/i, '')) : '', cot:s.checkOutTime ? jpClock(String(s.checkOutTime).replace(/^before\s*/i, '')) : '',
      cost:p.cost, cur:p.cur, kind:/airbnb/i.test(s.name) ? 'Airbnb' : 'Hotel', notes:notes.join('\n'), host:'', entry:'', wifi:'', conf:'', imp:1});
  });
  (d.deadlines || []).forEach((x, n) => J.prep.push({id:'x' + jpHash('pr|' + n + '|' + x.title), t:x.title, due:x.date || '', before:0, done:false, note:x.note || '', imp:1}));
  (d.packLists || []).forEach(pl => (pl.items || []).forEach((it, n) => J.pack.push({id:'x' + jpHash('pk|' + pl.id + '|' + n + '|' + it.t), cat:pl.title + (it.cat ? ' · ' + it.cat : ''), t:it.t, why:it.why || '', done:false, imp:1, grp:pl.id})));
  (d.spots || []).forEach((s, n) => J.places.push({id:'x' + jpHash('sp|' + n + '|' + s.name), name:s.name, area:s.cat || '', note:[s.when, s.hours ? 'Open: ' + s.hours : '', s.note].filter(Boolean).join('\n'), address:s.address || '', em:s.icon || '', lat:s.lat, lon:s.lon, done:false, imp:1}));
  (d.shoppingList || []).forEach((s, n) => J.gifts.push({id:'x' + jpHash('gf|' + n + '|' + s.item), who:'Shopping list', what:s.item, budget:0, cur:'JPY', done:false, imp:1}));
  (d.taxiCards || []).forEach(c => J.taxi.push({name:c.name || '', ja:c.ja || '', en:c.en || '', ok:!!(c.verified && c.verified.ok), note:c.checkNote || ''}));
  J.taxiLine = d.taxiLine || '';
  (d.tips || []).forEach(t => J.tips.push({id:t.id, em:t.icon || '', title:t.title || '', short:t.short || '', body:t.body || ''}));
  J.flex = Array.isArray(d.flex) ? d.flex.slice() : [];
  (d.phrases || []).forEach(p => J.phr.push({en:p.en, ja:p.ja, ro:p.romaji || ''}));
  if (d.emergency) J.emerg = {insurance:d.emergency.insurance || '', numbers:(d.emergency.numbers || []).map(n => ({name:n.name, tel:n.tel, note:n.note || ''}))};
  if (d.budget) J.plan = {total:num(d.budget.total), food:num(d.budget.dailyFood), prepaid:(d.budget.prepaid || []).map(x => ({name:x.name, usd:num(x.usd)})), cats:(d.budget.categories || []).map(c => ({name:c.name, amount:num(c.amount), committed:num(c.committed), note:c.note || ''}))};
  const sorted = Object.keys(J.days).sort(); J.start = sorted[0]; J.end = sorted[sorted.length - 1];
  if (d.name) J.tname = d.name;
  return J;
}
// Put the imported trip into S.jp. Your own entries (spending, journal, anything you added, and what you've ticked off) are kept.
function jpApply(J) {
  const S0 = S.jp, keepUser = a => a.filter(x => !x.imp);
  const done = {}; ['prep', 'pack', 'places', 'gifts'].forEach(k => S0[k].forEach(x => { if (x.done) done[x.id] = 1; }));
  const mark = (arr) => arr.map(x => (done[x.id] ? Object.assign(x, {done:true}) : x));
  S0.items = keepUser(S0.items).concat(J.items);
  S0.flights = keepUser(S0.flights).concat(J.flights);
  S0.stays = keepUser(S0.stays).concat(J.stays);
  S0.prep = S0.prep.filter(x => !x.imp && !/^p\d{1,2}$/.test(x.id)).concat(mark(J.prep));   // the built-in starter tasks give way to your own
  S0.pack = S0.pack.filter(x => !x.imp && !/^k\d{1,2}$/.test(x.id)).concat(mark(J.pack));
  S0.places = keepUser(S0.places).concat(mark(J.places));
  S0.gifts = keepUser(S0.gifts).concat(mark(J.gifts));
  ['days', 'taxi', 'tips', 'flex', 'phr', 'plan', 'emerg', 'taxiLine', 'tname'].forEach(k => { S0[k] = J[k]; });
  S0.start = J.start; S0.end = J.end; S0.sel = null; UI.jmo = 0;
  if (J.plan && J.plan.total) S0.budget = J.plan.total;
}
const jpCount = J => `${J.items.length} plans and bookings, ${J.flights.length} flights, ${J.stays.length} stays, ${J.prep.length} to-dos, ${J.pack.length} packing items, ${J.places.length} spots`;
document.addEventListener('change', e => {
  const el = e.target; if (!el || el.id !== 'jpFile') return;
  const f = el.files && el.files[0]; if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const J = jpFromTrip(JSON.parse(fr.result));
      jpApply(J); S = normalize(S); afterChange(); toast(`Imported: ${jpCount(J)}.`);
    } catch (err) { toast(err && err.message === 'That is not a trip file.' ? err.message : "Couldn't read that file."); }
    el.value = '';
  };
  fr.onerror = () => toast("Couldn't read that file.");
  fr.readAsText(f);
});
Object.assign(JACT, {
  jpPick: () => { const i = $('#jpFile'); if (i) i.click(); return false; },
  jBook: d => { const x = S.jp.items.find(y => y.id === d.id); if (x) x.st = x.st === 'booked' ? 'todo' : 'booked'; },
  jpTaxi: d => { UI.taxi = UI.taxi === d.i ? null : d.i; },
  jpTip: d => { UI.tip = UI.tip === d.id ? null : d.id; },
});

/* ----- extra screens ----- */
const jpVf = o => !o.vf ? '' : o.vf.ok ? `<span class="small muted" title="${esc(o.vf.src || '')}">✓ checked${o.vf.src ? ' on ' + esc(o.vf.src) : ''}</span>` : '<span class="small" style="color:var(--danger)">⚠ not checked yet</span>';
const jpMode = m => ({walk:'🚶', train:'🚆', bus:'🚌', taxi:'🚕', flight:'✈️', ride:'🚗'})[m] || '➡️';
function jpTransit(e) {
  if (!e.tr || !e.tr.length) return '';
  const mins = e.tr.reduce((t, x) => t + (+x.mins || 0), 0), fare = e.tr.reduce((t, x) => t + (+x.fare || 0), 0);
  return `<details class="small" style="margin-top:4px"><summary class="link">Getting there · ${mins} min${fare ? ', about ' + money(fare, 'JPY') : ''}</summary>
    ${e.tr.map(x => `<div class="lrow" style="align-items:flex-start"><span style="flex:none;width:28px">${jpMode(x.mode)}</span><span style="text-align:left;color:var(--ink)">${esc(x.text)}${x.line ? ` <span class="muted">(${esc(x.line)})</span>` : ''}<small class="muted" style="display:block">${x.mins} min${x.fare ? ', ' + money(x.fare, 'JPY') : ''}</small></span></div>`).join('')}
    ${e.trn ? `<p class="small muted">${esc(e.trn)}</p>` : ''}${e.lt ? `<p class="small muted">Last train: ${esc(e.lt)}</p>` : ''}</details>`;
}
function jpDayHead(k) {
  const D = (S.jp.days || {})[k]; if (!D) return '';
  const bits = [D.city, D.walk ? D.walk.replace(/^~/, 'about ') + ' walking' : ''].filter(Boolean).join(' · ');
  return `<div style="margin:6px 0 4px">${D.title ? `<b style="font-size:17px">${esc(D.title)}</b>` : ''}${bits ? `<span class="small muted" style="display:block">${esc(bits)}</span>` : ''}
    ${D.stay ? `<span class="small" style="display:block">🛏️ ${esc(D.stay)}</span>` : ''}${D.tzNote ? `<span class="small muted" style="display:block">🕒 ${esc(D.tzNote)}</span>` : ''}
    ${D.planB && D.planB.length ? `<details class="small" style="margin-top:4px"><summary class="link">If something goes wrong</summary>${D.planB.map(x => `<p class="note">${esc(x)}</p>`).join('')}</details>` : ''}</div>`;
}
const jpTipLinks = e => !e.tp || !e.tp.length ? '' : `<span class="small muted">Tips: ${e.tp.map(id => { const t = (S.jp.tips || []).find(x => x.id === id); return t ? `${esc(t.em)} ${esc(t.title)}` : ''; }).filter(Boolean).join(', ')}</span>`;
function jpBudgetPlan() {
  const P = S.jp.plan; if (!P) return '';
  const pre = P.prepaid.reduce((t, x) => t + x.usd, 0), cat = P.cats.reduce((t, x) => t + x.amount, 0);
  return `<section class="card"><h2>Budget plan</h2><p class="note">From your trip file: ${money(P.total, 'USD')} total, about ${money(P.food, 'USD')} a day for food.</p>
    <h3>Already paid</h3>${P.prepaid.map(x => `<div class="lrow"><span style="text-align:left;color:var(--ink)">${esc(x.name)}</span><b>${money(x.usd, 'USD')}</b></div>`).join('')}
    <div class="lrow"><span class="muted">Paid so far</span><b>${money(pre, 'USD')}</b></div>
    <h3 class="mt">Still to spend</h3>${P.cats.map(c => `<div class="lrow" style="align-items:flex-start"><span style="text-align:left;color:var(--ink)">${esc(c.name)}${c.note ? `<small class="muted" style="display:block">${esc(c.note)}</small>` : ''}</span><b>${money(c.amount, 'USD')}</b></div>`).join('')}
    <div class="lrow"><span class="muted">Planned</span><b>${money(cat, 'USD')}</b></div>
    <div class="lrow"><span class="muted">Paid plus planned</span><b>${money(pre + cat, 'USD')}</b></div></section>`;
}
function jpInfoExtra() {
  const J = S.jp;
  const emerg = J.emerg ? `<section class="card"><h2>Emergency</h2>${J.emerg.numbers.map(n => `<div class="lrow" style="align-items:flex-start"><span style="text-align:left;color:var(--ink)"><b>${esc(n.name)}</b>${n.note ? `<small class="muted" style="display:block">${esc(n.note)}</small>` : ''}</span><a class="maplink" href="tel:${esc(String(n.tel).replace(/[^\d+]/g, ''))}">${esc(n.tel)}</a></div>`).join('')}
      ${J.emerg.insurance ? `<p class="note">${esc(J.emerg.insurance)}</p>` : ''}</section>` : '';
  const taxi = (J.taxi || []).length ? `<section class="card"><h2>Taxi cards</h2><p class="note">Show the driver your screen. Tap a place to open it.</p>
    ${J.taxi.map((c, i) => `<div style="border-top:1px solid var(--line);padding:8px 0"><button class="link" data-act="jpTaxi" data-i="${i}" style="font-weight:800">${esc(c.name)}</button> ${c.ok ? '<span class="small muted">✓</span>' : '<span class="small" style="color:var(--danger)">⚠ check</span>'}
      ${UI.taxi === i ? `<div style="margin-top:8px"><div lang="ja" style="font-size:22px;line-height:1.5;font-weight:700">${esc(c.ja || '')}</div>${c.ja && J.taxiLine ? `<div lang="ja" style="font-size:20px;line-height:1.5;margin-top:4px">${esc(J.taxiLine)}</div>` : ''}
        <p class="small mt">${esc(c.en)}</p>${c.note ? `<p class="small muted">${esc(c.note)}</p>` : ''}<button class="btn sm ghost" data-act="copy" data-v="${esc(c.ja || c.en)}">Copy</button></div>` : ''}</div>`).join('')}</section>` : '';
  const tips = (J.tips || []).length ? `<section class="card"><h2>Tips</h2>${J.tips.map(t => `<div style="border-top:1px solid var(--line);padding:8px 0"><button class="link" data-act="jpTip" data-id="${esc(t.id)}" style="font-weight:800;text-align:left">${esc(t.em)} ${esc(t.title)}</button><span class="small muted" style="display:block">${esc(t.short)}</span>
      ${UI.tip === t.id ? `<div class="small mt" style="white-space:pre-wrap;line-height:1.5">${esc(t.body)}</div>` : ''}</div>`).join('')}</section>` : '';
  const flex = (J.flex || []).length ? `<section class="card"><h2>If you have free time</h2>${J.flex.map(x => `<div class="lrow"><span style="text-align:left;color:var(--ink)">${esc(x)}</span></div>`).join('')}</section>` : '';
  return {emerg, taxi, tips, flex};
}
const jpFileCard = () => `<section class="card"><h2>Trip file</h2><p class="note">Bring in your trip from the old Japan app (japan-trip-data.json). Your spending, journal and anything you added yourself stay put. Importing again updates the trip without losing what you ticked off.</p>
  <input type="file" id="jpFile" accept=".json,application/json" hidden><button class="btn block" data-act="jpPick">Import trip file</button></section>`;
