// Hibi: Budget mode. Safe-to-spend, auto-sorted spending, a swipe review, bills set aside first, next-period plans and savings.
'use strict';
/* =========================================================
   Budget mode
   ========================================================= */
Object.assign(ICON, {
  wallet:'<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5z"/><circle cx="16" cy="13.5" r="1"/>',
  receipt:'<path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3zM9 8h6M9 12h6"/>'});
MODES.budget = {label:'Budget', em:'💸', nav:[['bgo','Overview','wallet'],['btx','Spending','receipt'],['bbills','Bills','repeat'],['bplan','Plan','target'],['settings','Settings','settings']]};
Object.assign(TAB_INFO, {bgo:{g:'bgo', t:'Budget'}, btx:{g:'btx', t:'Spending'}, brev:{g:'btx', t:'Review'}, bbills:{g:'bbills', t:'Bills'}, bplan:{g:'bplan', t:'Plan'}, btot:{g:'btx', t:'Totals'}, bacct:{g:'bplan', t:'Accounts'}});
Object.assign(GROUPS, {bgo:['bgo'], btx:['btx', 'brev', 'btot'], bbills:['bbills'], bplan:['bplan', 'bacct']});

// [id, emoji, name, color, kind, keywords]. Keywords are comma separated. A word ending in ? still sorts the spending but asks you to double-check it.
const BG_DEF = [
  ['groc','🛒','Groceries','#2ECC71','flex','publix, winn dixie, aldi, sprouts, kroger, whole foods, save a lot, food lion, trader joe, fresh market, grocery, supermarket, lidl, piggly wiggly, amazon fresh'],
  ['dine','🍔','Eating out','#FF9F43','flex','mcdonald, burger king, wendy, taco bell, chick fil a, chipotle, subway, starbucks, dunkin, popeyes, kfc, domino, pizza, papa john, little caesars, panda express, five guys, wingstop, jersey mike, firehouse sub, zaxby, cook out, whataburger, arby, sonic drive, dairy queen, culver, chili s, applebee, olive garden, outback, ihop, denny, waffle house, doordash, uber eats, ubereats, grubhub, restaurant, grill, cafe, coffee, bakery, bbq, sushi, ramen, taqueria, diner'],
  ['gas','⛽','Gas','#E17055','flex','shell, chevron, exxon, bp, sunoco, marathon, speedway, racetrac, murphy usa, murphy express, citgo, valero, texaco, gulf oil, phillips 66, fuel, gas station, gasoline, quiktrip, buc ee, kwik trip, sheetz, wawa?, circle k?, 7 eleven?, 7eleven?, pilot?, love s?, flying j?'],
  ['car','🚗','Car & tolls','#3498DB','flex','sunpass, toll, e zpass, ezpass, turnpike, parking, garage, autozone, o reilly, advance auto, napa auto, jiffy lube, valvoline, car wash, carwash, oil change, discount tire, pep boys, dmv, tag agency, tag renewal, registration, towing, mavis, monro, meineke, harbor freight?, tire'],
  ['ent','🎬','Entertainment','#A55EEA','flex','movie, cinema, theatre, theater, amc, regal, cinemark, fandango, steam, playstation, xbox, nintendo, gamestop, epic games, blizzard, riot games, twitch, ticketmaster, stubhub, live nation, concert, bowling, arcade, dave busters, topgolf, escape room, museum, zoo, theme park, disney, universal, seaworld, barnes noble, kinokuniya, manga, comic, audible, itunes?, google play?, app store?, apple com?'],
  ['hl','💊','Health','#1ABC9C','flex','cvs, walgreens, rite aid, pharmacy, urgent care, clinic, hospital, dental, dentist, doctor, medical, optical, vision, lenscrafters, gnc, vitamin shoppe, supplement, planet fitness, workout anytime, anytime fitness, crunch fitness, gym?, quest diagnostics, labcorp, physical therapy, chiropract, therapy'],
  ['shop','🛍️','Shopping','#FD79A8','flex','amazon?, amzn?, walmart?, wal mart?, target?, costco?, sams club?, best buy, ebay, etsy, temu, shein, nike, adidas, foot locker, old navy, ross, tj maxx, marshalls, kohl s, dollar general, dollar tree, family dollar, home depot, lowe s, ikea, hobby lobby, michaels, apple store, micro center, newegg'],
  ['care','💈','Personal care','#00B894','flex','barber, haircut, salon, sephora?, ulta?, great clips, sport clips, nail, spa, massage, tattoo, wax'],
  ['edu','🎓','School','#0984E3','flex','irsc, indian river, bookstore, textbook, chegg, pearson, mcgraw, tuition, coursera, udemy, eta international, scantron'],
  ['trav','✈️','Travel','#6C5CE7','flex','airlines, delta air, american air, jetblue, spirit air, southwest air, united air, frontier air, hotel, motel, airbnb, booking com, expedia, vrbo, hostel, marriott, hilton, hyatt, amtrak, jr east, suica, narita, haneda, uber?, lyft?, rental car, hertz, enterprise rent, avis, airport'],
  ['bills','🧾','Bills','#636E72','bill','rent, mortgage, electric, fpl, duke energy, water bill, utilities, utility, sewer, internet, spectrum, xfinity, comcast, att wireless, at t wireless, att internet, verizon, t mobile, tmobile, phone bill, insurance, geico, progressive, state farm, allstate, student loan, loan payment, klarna?, affirm?, afterpay?'],
  ['other','📦','Other','#B2BEC3','flex','']];
const BG_W = {groc:25, dine:15, gas:15, ent:10, hl:5, shop:15, car:5, care:5, edu:0, trav:0, other:5};   // starting weights for "Suggest"
const BG_EM = ['🛒','🍔','⛽','🚗','🎬','💊','🛍️','💈','🎓','✈️','🎮','☕','🐶','🎁','🏠','📱','💡','🧾','🏋️','📦'];

function normalizeBg(s) {
  if (!s.bg || typeof s.bg !== 'object' || Array.isArray(s.bg)) s.bg = {};
  const g = s.bg, hasWk = !!(s.wk && s.wk.rate > 0);
  if (!Array.isArray(g.cats) || !g.cats.length) g.cats = BG_DEF.map(([id, em, name, color, kind, kw]) => ({id, em, name, color, kind, kw}));
  g.cats = g.cats.filter(c => c && c.id && c.name);
  ['bills', 'other'].forEach(id => { if (!g.cats.some(c => c.id === id)) { const d = BG_DEF.find(x => x[0] === id); g.cats.push({id:d[0], em:d[1], name:d[2], color:d[3], kind:d[4], kw:d[5]}); } });
  g.cats.forEach(c => { if (typeof c.em !== 'string' || !c.em) c.em = '📦'; if (!/^#[0-9a-f]{6}$/i.test(c.color || '')) c.color = '#B2BEC3'; if (c.kind !== 'bill') c.kind = 'flex'; if (typeof c.kw !== 'string') c.kw = ''; });
  if (!Array.isArray(g.tx)) g.tx = [];
  g.tx = g.tx.filter(x => x && x.id && x.d && typeof x.amt === 'number' && isFinite(x.amt));
  g.tx.forEach(x => { if (x.kind !== 'in') x.kind = 'out'; if (!x.cat) x.cat = 'other'; if (!x.rev) x.rev = 0; x.pts = x.kind !== 'in' && x.pts > 0 ? Math.min(+x.pts, x.amt) : 0; if (typeof x.name !== 'string') x.name = ''; });
  if (!Array.isArray(g.bills)) g.bills = [];
  if (!g.pts || typeof g.pts !== 'object') g.pts = {bal:0, asOf:today()}; g.pts.bal = Math.max(0, +g.pts.bal || 0); if (!g.pts.asOf) g.pts.asOf = today();
  if (!Array.isArray(g.cards)) {   // 3.6.1: rewards are kept per card. Start with the cards from his bank, plus one for anything entered before
    g.cards = [['d1', 'Discover it', '🟧'], ['c1', 'Capital One', '🟦'], ['b1', 'Bank of America', '🟥']].map(([id, name, em]) => ({id, name, em, bal:0, val:1, asOf:today()}));
    if (g.pts.bal > 0 || g.tx.some(x => x.pts > 0)) { g.cards.push({id:'o1', name:'Other rewards', em:'🎁', bal:g.pts.bal, val:1, asOf:g.pts.asOf}); g.tx.forEach(x => { if (x.pts > 0) x.pc = 'o1'; }); }
  }
  g.cards = g.cards.filter(c => c && c.id && c.name).map(c => ({id:String(c.id), name:String(c.name).slice(0, 24), em:String(c.em || '💳').slice(0, 4), bal:Math.max(0, +c.bal || 0), val:+c.val > 0 ? +c.val : 1, asOf:c.asOf || today(), at:+c.at || 0, lim:Math.max(0, +c.lim || 0), owed:Math.max(0, +c.owed || 0), oas:c.oas || today(), oat:+c.oat || 0, l4:/^\d{4}$/.test(c.l4 || '') ? c.l4 : ''}));
  g.tx.forEach(x => { if (x.cc && !g.cards.some(c => c.id === x.cc)) x.cc = ''; if (!x.cc) x.cc = ''; });
  g.tx.forEach(x => { if (x.pts > 0 && !g.cards.some(c => c.id === x.pc)) x.pc = g.cards[0] ? g.cards[0].id : ''; });
  ['plan', 'learn', 'paid', 'moved'].forEach(k => { if (!g[k] || typeof g[k] !== 'object' || Array.isArray(g[k])) g[k] = {}; });
  if (!g.base || typeof g.base !== 'object') g.base = {};
  if (!g.base.b || typeof g.base.b !== 'object') g.base.b = {};
  if (!['pay', 'month'].includes(g.per)) g.per = 'month';
  if (!g.v332) { g.v332 = true; g.per = 'month'; }   // 3.3.2: budgets run month by month unless you switch back to pay periods
  if (!['work', 'month', 'manual', 'entered'].includes(g.src)) g.src = 'entered';
  if (!g.v341) { g.v341 = true; g.src = 'entered'; }   // 3.4.1: every month gets the income you enter for it
  if (typeof g.minc !== 'number') g.minc = 0;
  if (typeof g.inc !== 'number') g.inc = 0;
  if (typeof g.roll !== 'boolean') g.roll = false;
  if (!g.save || typeof g.save !== 'object') g.save = {};
  if (!['amt', 'pct'].includes(g.save.mode)) g.save.mode = 'amt';
  if (typeof g.save.v !== 'number') g.save.v = 0;
  if (typeof g.save.goal !== 'string') g.save.goal = '';
  g.save.split = (Array.isArray(g.save.split) ? g.save.split : []).filter(x => x && typeof x.id === 'string' && (num(x.pct) > 0 || num(x.amt) > 0)).slice(0, 20).map(x => ({id:x.id, pct:num(x.pct), amt:num(x.amt)}));
  if (!['amt', 'pct'].includes(g.save.splitMode)) g.save.splitMode = 'amt';
  // 4.5: each month keeps its own savings split (plan[key].split = [{id, amt}]). Old one-month amount/goal overrides become a one-row split.
  Object.values(g.plan).forEach(p => {
    if (!p || typeof p !== 'object') return;
    if (Array.isArray(p.split)) p.split = p.split.filter(x => x && typeof x === 'object').slice(0, 30).map(x => ({id:typeof x.id === 'string' ? x.id : '', amt:Math.max(0, num(x.amt))}));
    else if ((p.save != null && p.save !== '') || p.sg !== undefined) {
      const usualAmt = g.save.splitMode === 'amt' && g.save.split.length ? g.save.split.reduce((a, x) => a + num(x.amt), 0) : g.save.mode === 'amt' ? num(g.save.v) : 0;
      const amt = p.save != null && p.save !== '' ? (p.sm === 'pct' ? num(p.inc) * num(p.save) / 100 : num(p.save)) : usualAmt;
      if (amt > 0) p.split = [{id:p.sg !== undefined ? p.sg : g.save.goal, amt:Math.round(amt * 100) / 100}];
    }
    delete p.save; delete p.sm; delete p.sg;
  });
  if (!Array.isArray(g.accts)) g.accts = [];
  g.accts = g.accts.filter(a => a && a.id && a.name);
  g.accts.forEach(a => { a.bal = num(a.bal); if (!a.asOf) a.asOf = dk(new Date()); if (!Array.isArray(a.hist)) a.hist = [{d:a.asOf, v:a.bal}]; a.main = !!a.main; if (typeof a.work !== 'boolean') a.work = true; if (!a.em) a.em = '🏦'; if (!['spend', 'save', 'invest'].includes(a.type)) a.type = /sav|reserve|emergency/i.test(a.name) ? 'save' : 'spend'; });
  if (!Array.isArray(g.cpay)) g.cpay = []; g.cpay = g.cpay.filter(p => p && p.id && p.d && typeof p.amt === 'number' && isFinite(p.amt) && p.amt > 0);
  if (!Array.isArray(g.nw)) g.nw = []; g.nw = g.nw.filter(p => p && p.d && isFinite(p.v)).slice(-400);
  if (!g.n || typeof g.n !== 'object') g.n = {};
  ['rev', 'moved', 'imp', 'scan'].forEach(k => { if (typeof g.n[k] !== 'number') g.n[k] = 0; });
}

/* ----- Money and names ----- */
const bgCat = id => S.bg.cats.find(c => c.id === id) || S.bg.cats.find(c => c.id === 'other');
const bgK = a => Math.abs(a) >= 1000 ? (a < 0 ? '−' : '') + '$' + short(Math.abs(a)) : bgM(a);
const bgM = a => { const v = Math.round(a * 100) / 100, big = Math.abs(v) >= 100; return (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString(undefined, {minimumFractionDigits:big ? 0 : 2, maximumFractionDigits:big ? 0 : 2}); };
const BG_LEAD = new Set(['sq', 'tst', 'pos', 'sp', 'pp', 'debit', 'purchase', 'card', 'checkcard', 'visa', 'recurring', 'ach', 'dd', 'pmt', 'purch', 'crd']);
// Makes a bank description easier to match: lower case, no store or card numbers, no processor prefixes
function bgClean(s) {
  let t = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  t = t.filter(w => !(/^\d{3,}$/.test(w) || ((w.match(/\d/g) || []).length >= 3 && /[a-z]/.test(w))));
  while (t.length > 1 && BG_LEAD.has(t[0])) t.shift();
  return t.join(' ');
}
const bgKey = c => c.split(' ').slice(0, 2).join(' ');
const BG_KW = new Map();
function bgKws(c) {
  let v = BG_KW.get(c.kw); if (v) return v;
  v = c.kw.split(',').map(x => x.trim()).filter(Boolean).map(x => { const amb = x.endsWith('?'), kw = bgClean(amb ? x.slice(0, -1) : x); return kw ? [kw, amb] : null; }).filter(Boolean);
  BG_KW.set(c.kw, v); return v;
}
// conf 2 = sure, 1 = probably (check it), 0 = no idea
function bgGuess(name) {
  const c = bgClean(name); if (!c) return {cat:'other', conf:0, why:'none'};
  const learned = S.bg.learn[bgKey(c)]; if (learned && S.bg.cats.some(x => x.id === learned)) return {cat:learned, conf:2, why:'learned'};
  for (const b of bgBillsAll()) { const bn = bgClean(b.x.name); if (bn.length >= 3 && (' ' + c).includes(' ' + bn)) return {cat:'bills', conf:2, why:'bill'}; }
  let best = null;
  S.bg.cats.forEach(cat => bgKws(cat).forEach(([kw, amb]) => { if ((' ' + c).includes(' ' + kw) && (!best || kw.length > best.kw.length)) best = {cat:cat.id, kw, amb}; }));
  return best ? {cat:best.cat, conf:best.amb ? 1 : 2, why:'rule'} : {cat:'other', conf:0, why:'none'};
}
function bgMk(o) {
  const gs = o.cat ? {cat:o.cat, conf:2, why:'manual'} : bgGuess(o.name), kind = o.kind === 'in' ? 'in' : 'out';
  return {id:'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), d:o.d || today(), amt:Math.round(num(o.amt) * 100) / 100, name:String(o.name || '').trim() || (kind === 'in' ? 'Money in' : 'Spending'),
    cat:kind === 'in' ? 'other' : gs.cat, kind, rev:kind === 'in' ? 0 : (gs.conf < 2 ? 1 : 0), why:gs.why, src:o.src || '', note:o.note || ''};
}
// Remembers where a merchant goes, and sorts the other waiting ones from the same merchant too
function bgLearn(x) {
  const k = bgKey(bgClean(x.name)); if (!k || x.kind === 'in') return 0;
  S.bg.learn[k] = x.cat; let n = 0;
  S.bg.tx.forEach(o => { if (o !== x && o.rev && o.kind !== 'in' && bgKey(bgClean(o.name)) === k) { o.cat = x.cat; o.rev = 0; o.why = 'learned'; n++; } });
  return n;
}

/* ----- Refunds: money back for a purchase cancels it out, once you say yes ----- */
const BG_RFSKIP = new Set(['pay', 'card', 'refund', 'return', 'credit', 'purchase', 'payment', 'the', 'inc', 'llc', 'com']);
const bgWords = n => bgClean(n).split(' ').filter(w => w.length >= 3 && !BG_RFSKIP.has(w));
const bgRefundOn = x => x.kind === 'in' && (x.rf === 'yes' || x.rf === 'ask') && S.bg.tx.some(p => p.id === x.of);
const bgAsk = x => x.kind === 'in' && x.rf === 'ask' && S.bg.tx.some(p => p.id === x.of);
function bgNet(x) {
  if (x.kind === 'in') return x.amt;
  const r = S.bg.tx.reduce((t, y) => t + (y.kind === 'in' && y.rf === 'yes' && y.of === x.id ? y.amt : 0), 0) + (x.pts || 0);
  return r ? Math.max(0, Math.round((x.amt - r) * 100) / 100) : x.amt;
}
function bgFindRefund(r, pool) {
  const rw = bgWords(r.name), taken = new Set(S.bg.tx.filter(y => y.kind === 'in' && (y.rf === 'yes' || y.rf === 'ask') && y.of).map(y => y.of));
  const C = pool.filter(p => p.kind !== 'in' && !taken.has(p.id) && p.d <= r.d && dayDiff(p.d, r.d) <= 60 && p.amt + 0.005 >= r.amt).map(p => {
    const pw = bgWords(p.name), nm = rw.some(a => pw.some(b => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))))), eq = Math.abs(p.amt - r.amt) < 0.005;
    return {p, score:eq && nm ? 3 : nm ? 2 : eq ? 1 : 0, ago:dayDiff(p.d, r.d)};
  }).filter(c => c.score > 0).sort((a, b) => b.score - a.score || a.ago - b.ago);
  if (!C.length) return null;
  if (C[0].score === 1 && (C.filter(c => c.score === 1).length > 1 || r.amt < 5)) return null;   // same amount with a different name has to be unambiguous
  return C[0].p;
}
function bgScanRefunds() {
  let n = 0;
  S.bg.tx.filter(x => x.kind === 'in' && !x.rf).forEach(x => { const p = bgFindRefund(x, S.bg.tx); if (p) { x.rf = 'ask'; x.of = p.id; n++; } });
  return n;
}

/* ----- Periods, income, bills ----- */
const bgPayOn = () => S.bg.per === 'pay' && wkReady();
// Paychecks (Work mode periods) whose payday falls in a range
function bgPaychecks(from, to, max) {
  const out = []; let P = periodFor(addDays(from, -60)), n = 0;
  while (P.pay <= to && n++ < (max || 40)) { if (P.pay >= from) out.push(P); P = periodFor(addDays(P.to, 1)); }
  return out;
}
function bgPeriodAt(k) {
  if (bgPayOn()) {
    let P = periodFor(k), n = 0; while (P.pay > k && n++ < 8) P = periodFor(addDays(P.from, -1));
    const nx = periodFor(addDays(P.to, 1)); let to = addDays(nx.pay, -1); const from = P.pay;
    if (to < from) to = addDays(from, 13);
    if (k >= from && k <= to) return {from, to, key:from, days:dayDiff(from, to) + 1, pay:true};
  }
  const d = keyDate(k), y = d.getFullYear(), m = d.getMonth(), from = dk(new Date(y, m, 1)), to = dk(new Date(y, m + 1, 0));
  return {from, to, key:from, days:dayDiff(from, to) + 1, pay:false};
}
function bgPer(n) {
  let per = bgPeriodAt(today());
  for (let i = 0; i < n; i++) per = bgPeriodAt(addDays(per.to, 1));
  for (let i = 0; i > n; i--) per = bgPeriodAt(addDays(per.from, -1));
  return per;
}
const bgRange = per => fmtShort(per.from) + ' to ' + fmtShort(per.to);
const bgLabel = per => per.pay ? bgRange(per) : keyDate(per.from).toLocaleDateString(undefined, {month:'long', year:'numeric'});
const bgWord = () => bgPer(0).pay ? 'period' : 'month';
function bgTypical() {
  const L = []; let P = periodFor(today()), n = 0;
  while (L.length < 3 && n++ < 12) { P = periodFor(addDays(P.from, -1)); const p = payFor(P); if (p.mins > 0) L.push(p.net); }
  return L.length ? L.reduce((a, b) => a + b, 0) / L.length : 0;
}
function bgIncome(per) {
  const g = S.bg, pl = g.plan[per.key] || {}, ins = g.tx.filter(x => x.kind === 'in' && x.d >= per.from && x.d <= per.to && !bgRefundOn(x)), sum = L => L.reduce((t, x) => t + x.amt, 0), csvIn = sum(ins.filter(x => x.src === 'csv')), hand = sum(ins.filter(x => x.src !== 'csv'));
  let base, note;
  if (pl.inc != null && pl.inc !== '') { base = num(pl.inc); note = 'You set this'; }
  else if (g.src === 'entered') { base = 0; note = 'Enter this month\'s income'; }
  else if (g.src === 'month' && g.minc > 0) { base = g.minc * (per.pay ? per.days / 30.4375 : 1); note = per.pay ? `Your predicted ${bgM(g.minc)} a month, split across this period` : 'Your predicted monthly income'; }
  else if (g.src === 'work' && wkReady()) {
    const typ = bgTypical(); base = bgPaychecks(per.from, per.to).reduce((t, P) => t + (P.to < today() ? payFor(P).net : Math.max(payFor(P).net, typ)), 0); note = 'From your Work pay';
  } else { base = g.inc; note = g.src === 'work' ? 'Set up Work pay, or type your pay in Settings' : 'Your usual pay'; }
  // Money in from an import is what really arrived, so it replaces your estimate instead of stacking on top of it
  const total = Math.max(base, csvIn) + hand, extra = total - base;
  if (csvIn > base) note = 'Using the money you actually received';
  return {base, extra, total, note};
}
// Savings can be set for one month on its own (plan[key].save, .sm mode, .sg goal), otherwise your usual setting applies
function bgSaveCfg(per) {
  const p = S.bg.plan[per.key] || {}, own = p.save != null && p.save !== '', g = S.bg.save;
  return {own, mode:own ? (p.sm === 'pct' ? 'pct' : 'amt') : g.mode, v:own ? num(p.save) : num(g.v), goal:p.sg !== undefined ? p.sg : g.goal, ownGoal:p.sg !== undefined};
}
// 4.5: every month has its own list of goals and dollars. A month you haven't set follows your usual split.
const bgGoalOk = id => !id || S.sv.goals.some(g => g.id === id);
function bgUsualRows(income) {
  const g = S.bg.save, sp = (g.split || []).filter(x => bgGoalOk(x.id)), whole = Math.max(0, g.mode === 'pct' ? num(income) * num(g.v) / 100 : num(g.v));
  if (sp.length) return g.splitMode === 'amt' ? sp.filter(x => num(x.amt) > 0).map(x => ({id:x.id, amt:num(x.amt)})) : sp.map(x => ({id:x.id, amt:Math.round(whole * num(x.pct)) / 100})).filter(x => x.amt > 0);
  return whole > 0 ? [{id:bgGoalOk(g.goal) ? g.goal : '', amt:Math.round(whole * 100) / 100}] : [];
}
// Rows as typed (for the editor) and the clean rows the math uses
function bgMonthSave(per, income) {
  const p = S.bg.plan[per.key], own = !!p && Array.isArray(p.split);
  const raw = own ? p.split : bgUsualRows(income != null ? income : bgIncome(per).total);
  const rows = raw.filter(x => num(x.amt) > 0).map(x => ({id:bgGoalOk(x.id) ? x.id : '', amt:num(x.amt)}));
  return {own, raw, rows, total:Math.round(rows.reduce((a, x) => a + x.amt, 0) * 100) / 100};
}
// The goals that get money this period (rows with no goal are just set aside)
function bgShares(per) {
  const M = bgMonthSave(per), byId = {};
  M.rows.filter(x => x.id).forEach(x => { byId[x.id] = (byId[x.id] || 0) + x.amt; });
  return Object.entries(byId).map(([id, amt]) => ({id, amt, pct:M.total ? amt / M.total * 100 : 0}));
}
const bgSaveAmt = (per, income) => bgMonthSave(per, income).total;
const bgSaveRows = (A, total) => A.map(x => ({id:x.id || '', amt:Math.round(num(x.amt) * 100) / 100}));
const bgBudgetsOf = per => { const p = S.bg.plan[per.key]; return p && p.b ? p.b : S.bg.base.b; };
// Subscriptions (from Savings) and your own bills share the same shape
const bgBillsAll = () => [...S.subs.filter(x => !x.off && x.start).map(x => ({x, src:'sub'})), ...S.bg.bills.filter(x => !x.off && x.start).map(x => ({x, src:'bill'}))];
function bgBillsIn(per) {
  const out = [];
  bgBillsAll().forEach(({x, src}) => {
    if (x.trial) { if (x.start >= per.from && x.start <= per.to) out.push({x, src, k:x.start, id:x.id + '@' + x.start, amt:num(x.price)}); return; }
    let k = subNext(x, per.from), n = 0;
    while (k && k <= per.to && n++ < 12) { out.push({x, src, k, id:x.id + '@' + k, amt:num(x.price)}); k = subStep(k, x, 1); }
  });
  return out.sort((a, b) => a.k.localeCompare(b.k));
}
function bgPaid(b) {
  const m = S.bg.paid[b.id]; if (m === true) return 'manual'; if (m === false) return false;
  const w = bgClean(b.x.name); if (w.length < 3) return false;
  const lo = addDays(b.k, -6), hi = addDays(b.k, 7);
  return S.bg.tx.some(t => t.kind !== 'in' && t.d >= lo && t.d <= hi && (' ' + bgClean(t.name)).includes(' ' + w)) ? 'auto' : false;
}
const bgTxIn = per => S.bg.tx.filter(x => x.d >= per.from && x.d <= per.to);

// Everything about one period: what's coming in, what's set aside, and what is safe to spend
function bgCalc(per, noRoll) {
  const g = S.bg, inc = bgIncome(per), bills = bgBillsIn(per), billsTotal = bills.reduce((t, b) => t + b.amt, 0), sv = bgSaveAmt(per, inc.total);
  let roll = 0;
  if (g.roll && !noRoll) { const pv = bgPeriodAt(addDays(per.from, -1)); if (pv.to < per.from && pv.to < today()) { const c = bgCalc(pv, true); if (c.n) roll = Math.max(0, c.left); } }
  const pool = inc.total - billsTotal - sv + roll;
  const flex = bgTxIn(per).filter(x => x.kind !== 'in' && bgCat(x.cat).kind === 'flex');
  const spent = flex.reduce((t, x) => t + bgNet(x), 0), bud = bgBudgetsOf(per), t0 = today();
  const inP = t0 >= per.from && t0 <= per.to, daysLeft = inP ? dayDiff(t0, per.to) + 1 : t0 < per.from ? per.days : 0;
  const ptsUsed = flex.reduce((t, x) => t + (x.pts || 0), 0);
  const spentToday = inP ? flex.filter(x => x.d === t0).reduce((t, x) => t + bgNet(x), 0) : 0, left = pool - spent;
  const by = S.bg.cats.filter(c => c.kind === 'flex').map(c => { const b = num(bud[c.id]), s = flex.filter(x => x.cat === c.id).reduce((t, x) => t + bgNet(x), 0); return {c, b, s, left:b - s, perDay:daysLeft ? (b - s) / daysLeft : 0}; });
  const elapsed = inP ? dayDiff(per.from, t0) : t0 > per.to ? per.days : 0;
  return {per, inc, bills, billsTotal, sv, roll, pool, spent, ptsUsed, left, by, daysLeft, perDay:daysLeft ? left / daysLeft : 0, spentToday,
    todayCan:daysLeft ? Math.max(0, (left + spentToday) / daysLeft - spentToday) : 0, pace:pool * (elapsed / per.days) - (spent - spentToday), inP, n:flex.length, assigned:by.reduce((t, x) => t + x.b, 0)};
}
const bgRevList = () => { const sk = UI.bgSkip || [], L = S.bg.tx.filter(x => x.rev || bgAsk(x)).slice().reverse().sort((a, b) => b.d.localeCompare(a.d)); return [...L.filter(x => !sk.includes(x.id)), ...L.filter(x => sk.includes(x.id))]; };
function bgSubtitle() {
  if (S.tab === 'brev') { const n = bgRevList().length; return n ? `${plural(n, 'purchase')} to check` : 'Everything is sorted'; }
  if (S.tab === 'bbills') return `${bgM(bgBillsIn(bgPer(0)).reduce((t, b) => t + b.amt, 0))} set aside this period`;
  if (S.tab === 'btot') return UI.bgYear === 'all' ? 'Everything since you started' : 'Your year at a glance';
  if (S.tab === 'bacct') return `${bgM(bgTotalBal())} across ${plural(S.bg.accts.length, 'account')}`;
  const C = bgCalc(bgPer(0));
  if (S.tab === 'bplan') return bgRange(bgPer(UI.bgOff || 0));
  return C.pool > 0 || C.spent ? (C.left < 0 ? `Over by ${bgM(-C.left)} this period` : `${bgM(C.todayCan)} safe to spend today`) : 'Add your pay to get started';
}

/* ----- Overview ----- */
const bgHasInc = per => { const p = S.bg.plan[per.key]; return !!p && p.inc != null && p.inc !== ''; };
const bgWorkIn = per => wkReady() ? bgPaychecks(per.from, per.to).reduce((t, P) => t + payFor(P).net, 0) : 0;
function bgIncCard(per, view, C, big) {
  const set = bgHasInc(per), w = bgWorkIn(per), word = per.pay ? 'period' : 'month';
  return `<section class="card${big ? ' bg-hero' : ''}"><div class="row"><h2>${big ? `What's coming in this ${word}?` : '💵 Income'}</h2>${set ? `<b>${bgM(C.inc.base)}</b>` : ''}</div>
    ${big ? `<p class="note">Part-time pay changes from ${word} to ${word}, so each one gets its own income. Enter what you expect, and change it any time.</p>` : ''}
    <label class="bgfield">${set ? `Income for ${esc(bgLabel(per))}` : 'Expected income ($)'}<input class="input" inputmode="decimal" data-bind="bgpinc" data-v="${view}" value="${set ? esc(S.bg.plan[per.key].inc) : ''}" placeholder="${big ? 'What you expect to make' : esc(String(Math.round(C.inc.base * 100) / 100))}" aria-label="Income for this ${word}"></label>
    <div class="btns mt">${w > 0 ? `<button class="btn ghost sm" data-act="bgIncWork" data-v="${view}">Use my Work pay (${bgM(w)})</button>` : ''}<button class="btn ghost sm" data-act="bgIncPrev" data-v="${view}">Same as last ${word}</button>${set && S.bg.src !== 'entered' ? `<button class="btn ghost sm" data-act="bgIncClear" data-v="${view}">Use my estimate</button>` : ''}</div>
    ${C.inc.extra ? `<p class="small muted mt">Plus ${bgM(C.inc.extra)} of money in you added.</p>` : ''}</section>`;
}
const bgNavBar = () => { const v = UI.bgView || 0, per = bgPer(v); return `<div class="bgnav"><button class="btn sm ghost" data-act="bgView" data-n="-1" aria-label="Earlier">‹</button><b>${esc(bgLabel(per))}</b><button class="btn sm ghost" data-act="bgView" data-n="1" aria-label="Later">›</button>${v ? '<button class="link" data-act="bgView" data-n="0">Back to now</button>' : ''}</div>`; };
const BG_BAD = 'var(--danger)';
const bgBar = (parts, total) => `<div class="bgstack" role="img" aria-label="Where this period's money goes">${parts.map(([v, col]) => v > 0 && total > 0 ? `<i style="width:${Math.min(100, v / total * 100)}%;background:${col}"></i>` : '').join('')}</div>`;
const bgCatOpts = (cur, auto) => `${auto ? '<option value="">✨ Auto-sort</option>' : ''}${S.bg.cats.map(c => opt(c.id, c.em + ' ' + c.name, cur)).join('')}`;
// Recent activity: what you added, bills and subscriptions you marked paid, card payments, newest first
function bgRecent(max) {
  const it = [];
  S.bg.tx.forEach(x => it.push({d:x.d, t:(bgMadeAt(x) || 0), em:x.kind === 'in' ? '💵' : bgCat(x.cat).em, name:x.name, sub:(x.kind === 'in' ? (x.rf === 'yes' && bgRefundOn(x) ? 'Refund' : 'Money in') : bgCat(x.cat).name) + (x.cc ? ' · ' + ((S.bg.cards.find(c => c.id === x.cc) || {}).name || 'card') : ''), amt:x.kind === 'in' ? '+' + cash2(x.amt) : cash2(x.amt), inn:x.kind === 'in', act:'bgTxEdit', id:x.id}));
  const bills = bgBillsAll();
  Object.keys(S.bg.paid).forEach(k => {
    if (S.bg.paid[k] !== true) return; const at = k.lastIndexOf('@'), b = bills.find(q => q.x.id === k.slice(0, at)); if (!b) return;
    it.push({d:k.slice(at + 1), t:0, em:b.x.em || '✅', name:b.x.name, sub:(b.src === 'sub' ? 'Subscription' : 'Bill') + ' marked paid', amt:cash2(num(b.x.price)), paid:true});
  });
  S.bg.cpay.forEach(p => { const c = S.bg.cards.find(x => x.id === p.card); it.push({d:p.d, t:0, em:'💳', name:(c ? c.name : 'Card') + ' payment', sub:'Card payment', amt:cash2(p.amt)}); });
  return it.filter(x => x.d <= today()).sort((a, b) => b.d.localeCompare(a.d) || b.t - a.t).slice(0, max || 6);
}
function bgRecentCard() {
  const L = bgRecent(6); if (!L.length) return '';
  return `<section class="card"><div class="row"><h2>🕘 Recent</h2><button class="link" data-act="wGo" data-k="budget" data-to="btx">See all</button></div>
    ${L.map(x => `<div class="lrow"${x.act ? ` data-act="${x.act}" data-id="${esc(x.id)}" role="button" tabindex="0"` : ''}><span style="text-align:left;color:var(--ink)">${esc(x.em)} <b>${esc(x.name)}</b><small class="muted">${esc(fmtShort(x.d))} · ${esc(x.sub)}</small></span><span${x.inn ? ' class="bg-good"' : ''}>${x.paid ? '✓ ' : ''}${x.amt}</span></div>`).join('')}</section>`;
}
function bgTxForm(ed) {
  return `<form data-form="bgtx" class="stack">
    <div class="ff"><label>Amount ($)<input class="input" name="amt" inputmode="decimal" placeholder="0.00" autocomplete="off" value="${ed ? esc(ed.amt) : ''}"></label><label>Date<input class="input" type="date" name="d" value="${esc(ed ? ed.d : today())}"></label></div>
    <label>What was it?<input class="input" name="name" placeholder="Shell, Publix, SunPass…" autocomplete="off" autocapitalize="words" value="${ed ? esc(ed.name) : ''}"></label>
    <label>Category<select class="input" name="cat">${bgCatOpts(ed ? ed.cat : '', !ed)}</select></label>
    ${S.bg.cards.length ? `<label>Which card<select class="input" name="cc"><option value="">Debit or cash</option>${S.bg.cards.map(c => opt(c.id, c.em + ' ' + c.name, ed ? ed.cc : UI.bgCc || '')).join('')}</select></label>` : ''}
    <label>Paid with card rewards ($)<small class="muted" style="display:block;font-weight:600">Points or cash back you used. It comes off your rewards instead of your budget.</small><div class="ff"><input class="input" name="pts" inputmode="decimal" placeholder="0.00" autocomplete="off" value="${ed && ed.pts ? esc(ed.pts) : ''}" aria-label="Amount paid with rewards"><select class="input" name="pc" aria-label="Which card's rewards">${S.bg.cards.map(c => opt(c.id, c.em + ' ' + c.name, ed && ed.pc ? ed.pc : UI.bgPc || '')).join('')}</select></div></label>
    <label class="setrow"><span>Money coming in<small class="muted" style="display:block;font-weight:600">Like a gift or something you sold</small></span><input type="checkbox" name="kin"${ed && ed.kind === 'in' ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>
    <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Add'}</button>${ed ? '<button class="btn ghost" type="button" data-act="cancelEdit">Cancel</button>' : ''}${ed && ed.rc ? `<button class="btn ghost" type="button" data-act="rcSee" data-id="${esc(ed.id)}">🧾 Receipt</button>` : ''}</div></form>`;
}
function bgCatRow(o, daysLeft) {
  const {c, b, s, left, perDay} = o, pct = b ? Math.min(100, Math.max(0, s / b * 100)) : s ? 100 : 0, over = b > 0 && s > b;
  return `<div class="bgrow" data-act="bgCatGo" data-c="${esc(c.id)}" role="button" tabindex="0"><div class="row"><b><span class="bgdot" style="background:${c.color}"></span>${esc(c.em)} ${esc(c.name)}</b><span style="${over ? 'color:' + BG_BAD : ''}">${b ? (over ? `${bgM(-left)} over` : `${bgM(left)} left`) : `${bgM(s)} spent`}</span></div>
    <div class="cbar"><i style="width:${pct}%;background:${over ? BG_BAD : c.color}"></i></div>
    <span class="small muted">${b ? `${bgM(s)} of ${bgM(b)}${!over && daysLeft && perDay > 0 ? ` · ${bgM(perDay)} a day` : ''}` : 'No budget set'}</span></div>`;
}
function bgTrend() {
  const out = []; let per = bgPer(0);
  for (let i = 0; i < 6; i++) { const C = bgCalc(per, true); if (C.n || i === 0) out.unshift(C); per = bgPeriodAt(addDays(per.from, -1)); }
  if (out.length < 2) return '';
  const mx = Math.max(1, ...out.map(C => Math.max(C.spent, C.pool)));
  return `<section class="card"><h2>Period by period</h2>${out.map(C => `<div class="crow"><div class="row"><b>${esc(fmtShort(C.per.from))}</b><span>${bgM(C.spent)} of ${bgM(C.pool)}</span></div><div class="cbar"><i style="width:${Math.max(0, C.spent) / mx * 100}%;background:${C.spent > C.pool ? BG_BAD : 'var(--accent)'}"></i></div></div>`).join('')}</section>`;
}
function bgSavingsCard(C) {
  if (!(C.sv > 0)) return '';
  const sh = bgShares(C.per), moved = S.bg.moved[C.per.key], gn = x => S.sv.goals.find(g => g.id === x.id), amtOf = x => x.amt, aside = Math.round((C.sv - sh.reduce((a, x) => a + x.amt, 0)) * 100) / 100;
  return `<section class="card"><div class="row"><h2>🏦 Savings</h2><b>${bgM(C.sv)}</b></div><p class="note">${sh.length ? `Set aside this period for ${sh.length > 1 ? 'your goals' : `<b>${esc(gn(sh[0]).em || '💰')} ${esc(gn(sh[0]).name)}</b>`}.` : 'Set aside before you spend anything else.'}</p>
    ${sh.length > 1 ? sh.map(x => `<div class="lrow"><span style="text-align:left;color:var(--ink)">${esc(gn(x).em || '💰')} ${esc(gn(x).name)} </span><b>${bgM(amtOf(x))}</b></div>`).join('') : ''}
    ${sh.length && aside > 0 ? `<div class="lrow"><span style="text-align:left;color:var(--ink)">🏦 Just set aside</span><b>${bgM(aside)}</b></div>` : ''}
    ${sh.length ? (moved ? `<p class="small muted">✓ Moved ${bgM(moved)} into ${sh.length > 1 ? 'your goals' : esc(gn(sh[0]).name)}</p>` : `<button class="btn block mt" data-act="bgMove">Move ${bgM(sh.reduce((a, x) => a + x.amt, 0))} into ${sh.length > 1 ? 'your goals' : esc(gn(sh[0]).name)}</button>`) : '<button class="link mt" data-act="wGo" data-k="budget" data-to="bplan">Pick a savings goal in Plan</button>'}</section>`;
}
function viewBgo() {
  const view = UI.bgView || 0, per = bgPer(view), C = bgCalc(per), rv = bgRevList().length, over = C.left < 0, none = !C.inc.total && !S.bg.tx.length;
  const tot = Math.max(C.inc.total + C.roll, C.billsTotal + C.sv + C.spent, 1), cls = over ? 'bad' : C.pool > 0 && C.left < C.pool * .15 ? 'warn' : '';
  const needInc = S.bg.src === 'entered' && !bgHasInc(per) && !C.inc.extra;
  const hero = needInc ? bgIncCard(per, view, C, true) : none ? `<section class="card bg-hero"><h2>Let's set up your budget</h2><p class="note">Hibi works out what's safe to spend by taking your pay, setting aside bills and savings, and splitting what's left across the days until your next payday.</p>
      <div class="btns mt"><button class="btn" data-act="wGo" data-k="budget" data-to="bplan">Add your pay</button><button class="btn ghost" data-act="wGo" data-k="work" data-to="settings">Set up Work pay</button></div></section>`
    : `<section class="card bg-hero"><div class="row"><h2>Safe to spend</h2><span class="small muted">${esc(bgRange(per))}</span></div>
      <div class="bg-big ${cls}">${C.daysLeft ? bgM(over ? 0 : C.todayCan) : bgM(Math.max(0, C.left))}<small> ${C.daysLeft ? 'today' : 'left'}</small></div>
      <p class="bg-sub">${over ? `You're <b>${bgM(-C.left)}</b> over for this period. A few light days gets you back on track.` : C.daysLeft ? `About <b>${bgM(C.perDay)} a day</b> for the next ${plural(C.daysLeft, 'day')}, with <b>${bgM(C.left)}</b> left in total.` : `This ${per.pay ? 'period' : 'month'} is over. You finished with ${bgM(C.left)}.`}</p>
      ${C.inP && C.n ? `<p class="small ${C.pace >= 0 ? 'bg-good' : ''}" style="${C.pace < 0 ? 'color:' + BG_BAD : ''}">${C.pace >= 0 ? `You're ${bgM(C.pace)} under your usual pace.` : `You're ${bgM(-C.pace)} over pace.`}</p>` : ''}
      ${bgBar([[C.billsTotal, '#6C5CE7'], [C.sv, '#1ABC9C'], [C.spent, 'var(--accent)'], [Math.max(0, C.left), 'var(--line)']], tot)}
      <div class="bg-legend"><span><i style="background:#6C5CE7"></i>Bills</span><span><i style="background:#1ABC9C"></i>Savings</span><span><i style="background:var(--accent)"></i>Spent</span><span><i style="background:var(--line)"></i>Left</span></div>
      <details class="mt" ${det('bgHow')}><summary class="link">How this is worked out</summary>
        <div class="lrow"><span style="text-align:left;color:var(--ink)">Income<small class="muted">${esc(C.inc.note)}</small></span><span>${bgM(C.inc.total)}</span></div>
        <div class="lrow"><span style="text-align:left;color:var(--ink)">Bills and subscriptions<small class="muted">${plural(C.bills.length, 'bill')} due this period</small></span><span>−${bgM(C.billsTotal)}</span></div>
        <div class="lrow"><span style="text-align:left;color:var(--ink)">Savings</span><span>−${bgM(C.sv)}</span></div>
        ${C.roll ? `<div class="lrow"><span style="text-align:left;color:var(--ink)">Rolled over from last period</span><span>+${bgM(C.roll)}</span></div>` : ''}
        <div class="lrow"><span style="text-align:left;color:var(--ink)"><b>To spend freely</b></span><span><b>${bgM(C.pool)}</b></span></div>
        <div class="lrow"><span style="text-align:left;color:var(--ink)">Spent so far${C.ptsUsed ? `<small class="muted">Not counting ${bgM(C.ptsUsed)} paid with rewards</small>` : ''}</span><span>−${bgM(C.spent)}</span></div></details></section>`;
  const shown = C.by.filter(o => o.b || o.s);
  return `${bgNavBar()}${hero}
    ${needInc ? '' : bgIncCard(per, view, C, false)}
    ${bgMoneyCard()}
    ${typeof rcUI === 'function' ? rcUI() : ''}
    ${rv ? `<section class="card bg-rev"><div class="row"><h2>👀 ${plural(rv, 'purchase')} to check</h2><button class="btn sm" data-act="wGo" data-k="budget" data-to="brev">Swipe through</button></div><p class="note">I wasn't sure where ${rv === 1 ? 'this one goes' : 'these go'}. It takes a few seconds.</p></section>` : ''}
    <details class="card" ${det('bgQuick', !S.bg.tx.length)}><summary class="sum"><h2>➕ Add spending</h2><span class="small muted">I'll sort it for you</span></summary>${typeof rcScanBtn === 'function' ? rcScanBtn() : ''}${bgTxForm(null)}</details>
    ${bgRecentCard()}
    <section class="card"><div class="row"><h2>Categories</h2><button class="link" data-act="wGo" data-k="budget" data-to="bplan">Edit budgets</button></div>
      ${shown.length ? shown.map(o => bgCatRow(o, C.daysLeft)).join('') : '<p class="note">Set a budget for each category in Plan, or just start adding spending.</p>'}
      ${C.by.some(o => !o.b && !o.s) ? '' : ''}</section>
    ${C.bills.length ? `<section class="card"><div class="row"><h2>🧾 Bills this period</h2><b>${bgM(C.billsTotal)}</b></div>${C.bills.slice(0, 4).map(b => `<div class="lrow"><b>${esc(b.x.em || '💳')} ${esc(b.x.name)}</b><span>${cash2(b.amt)} <small>${esc(fmtShort(b.k))}${bgPaid(b) ? ' · paid ✓' : ''}</small></span></div>`).join('')}
      <button class="link mt" data-act="wGo" data-k="budget" data-to="bbills">See all bills</button></section>` : ''}
    ${bgSavingsCard(C)}${bgTrend()}`;
}

/* ----- Spending ----- */
function bgRow(x) {
  const c = bgCat(x.cat), inc = x.kind === 'in';
  return swipeWrap(`<div class="bgtx" data-act="bgTxEdit" data-id="${esc(x.id)}" role="button" tabindex="0"><span class="bgem" style="--c:${c.color}">${esc(inc ? '💵' : c.em)}</span>
    <div><b>${esc(x.name)}</b><span class="small muted">${inc ? (x.rf === 'yes' && bgRefundOn(x) ? 'Refund of ' + esc((bgFind(x.of) || {}).name || 'a purchase') : bgAsk(x) ? 'Maybe a refund · needs a look' : 'Money in') : esc(c.name)}${x.rev ? ' · needs a look' : ''}${!inc && x.cc ? ` · on ${esc((S.bg.cards.find(c => c.id === x.cc) || {name:'card'}).name)}` : ''}${!inc && x.pts ? ` · ${cash2(x.pts)} from ${esc((S.bg.cards.find(c => c.id === x.pc) || {name:''}).name)} rewards` : ''}${!inc && bgNet(x) < x.amt - (x.pts || 0) - 0.005 ? ` · ${cash2(x.amt - (x.pts || 0) - bgNet(x))} refunded` : ''}</span></div><b class="bgamt${inc ? ' in' : ''}">${inc ? '+' : ''}${cash2(x.amt)}</b></div>`,
    {r:['bgTxEdit', 'Edit'], l:['bgTxDel', 'Delete'], data:{id:x.id}});
}
function bgFiltered() {
  const r = UI.bgRange || 'cur'; let L = S.bg.tx.map((x, i) => [x, i]).sort((a, b) => b[0].d.localeCompare(a[0].d) || b[1] - a[1]).map(a => a[0]);
  if (r === 'cur') { const p = bgPer(0); L = L.filter(x => x.d >= p.from && x.d <= p.to); } else if (r === 'prev') { const p = bgPer(-1); L = L.filter(x => x.d >= p.from && x.d <= p.to); }
  if (UI.bgCat) L = L.filter(x => x.cat === UI.bgCat);
  const q = norm(UI.bgQ || ''); if (q) L = L.filter(x => norm(x.name + ' ' + bgCat(x.cat).name).includes(q));
  return L;
}
function bgList() {
  const all = bgFiltered(), L = all.slice(0, 150); if (!L.length) return '<p class="note">Nothing here yet.</p>';
  let last = '', out = '';
  L.forEach(x => { if (x.d !== last) { last = x.d; out += `<h3 class="bgday">${esc(fmtWd(x.d))}</h3>`; } out += bgRow(x); });
  return out + (all.length > 150 ? '<p class="note">Showing the newest 150. Use the filters to narrow it down.</p>' : '');
}
function bgImportCard() {
  const t = UI.bgCsvText, P = t ? bgCsvPlan(t) : null, o = UI.bgCsvOpts || {};
  return `<details class="card" ${det('bgImp', !!t)}><summary class="sum"><h2>Import from your bank</h2><span class="small muted">CSV file or pasted rows</span></summary>
    <p class="note">Download a CSV from your bank or card app (look for Export or Download on your transactions). Hibi sorts everything, skips ones it already has, and asks about the unsure ones in Review.</p>
    <label class="btn ghost file-btn">📄 Choose a CSV file<input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" data-file="bgcsv" aria-label="Choose a bank CSV file"></label>
    <form data-form="bgcsvp" class="stack mt"><textarea class="input" name="csv" rows="3" placeholder="…or paste the rows here, with the column names on the first line" aria-label="Paste bank rows">${esc(t || '')}</textarea><button class="btn ghost" type="submit">Preview</button></form>
    ${P ? (P.err ? `<p class="note" style="color:${BG_BAD}">${esc(P.err)}</p>` : `<div class="mt"><p class="note"><b>${plural(P.items.length, 'new purchase')}</b> from ${esc(fmtShort(P.from))} to ${esc(fmtShort(P.to))}${P.dups ? `, ${P.dups} already in Hibi` : ''}${P.refs ? `, ${P.refs} look${P.refs === 1 ? 's' : ''} like refund${P.refs === 1 ? '' : 's'} (you'll confirm in Review)` : ''}${P.credits ? `, ${P.credits} ${o.inc ? 'deposits added as money in' : 'deposits or credits skipped'}` : ''}.</p>
      ${P.items.slice(0, 4).map(i => { const c = bgCat(i.cat); return `<div class="lrow"><span style="text-align:left;color:var(--ink)">${esc(i.kind === 'in' ? '💵' : c.em)} ${esc(i.name)}<small class="muted">${esc(fmtShort(i.d))} · ${i.kind === 'in' ? 'Money in' : esc(c.name)}${i.conf < 2 ? ' · will ask' : ''}</small></span><span>${cash2(i.amt)}</span></div>`; }).join('')}
      <div class="ff mt"><label>Which amounts are spending?<select class="input" data-bind="bgcsvsign"><option value="auto"${(o.sign || 'auto') === 'auto' ? ' selected' : ''}>Detect it for me</option><option value="neg"${o.sign === 'neg' ? ' selected' : ''}>Negative amounts</option><option value="pos"${o.sign === 'pos' ? ' selected' : ''}>Positive amounts</option></select></label></div>
      ${S.bg.cards.length ? `<label class="mt">Which card is this file from?<small class="muted" style="display:block;font-weight:600">Skip if it has a Card column or you use debit</small><select class="input" data-bind="bgcsvcard"><option value="">Not sure / debit</option>${S.bg.cards.map(c => opt(c.id, c.em + ' ' + c.name, UI.bgCsvCard || '')).join('')}</select></label>` : ''}
      <label class="setrow"><span>Also import money coming in<small class="muted" style="display:block;font-weight:600">Leave off if your paycheck is already counted from Work</small></span><input type="checkbox" data-bind="bgcsvinc"${o.inc ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>
      <div class="btns mt">${P.items.length ? `<button class="btn" data-act="bgCsvGo">Import ${P.items.length}</button>` : ''}<button class="btn ghost" data-act="bgCsvClear">Clear</button></div></div>`) : ''}</details>`;
}
function viewBtx() {
  const ed = UI.edit && UI.edit.kind === 'bgtx' ? S.bg.tx.find(x => x.id === UI.edit.id) : null, r = UI.bgRange || 'cur', all = bgFiltered(), out = all.filter(x => x.kind !== 'in').reduce((t, x) => t + x.amt, 0);
  const used = S.bg.cats.filter(c => S.bg.tx.some(x => x.cat === c.id && x.kind !== 'in'));
  return `${typeof rcUI === 'function' ? rcUI() : ''}<details class="card" ${det('bgTxForm', !!ed)}><summary class="sum"><h2>${ed ? 'Edit ' + esc(ed.name) : '➕ Add spending'}</h2><span class="small muted">${ed ? '' : "I'll sort it for you"}</span></summary>${!ed && typeof rcScanBtn === 'function' ? rcScanBtn() : ''}${bgTxForm(ed)}</details>
    <section class="card"><div class="chips">${[['cur', 'This ' + bgWord()], ['prev', 'Last ' + bgWord()], ['all', 'All time']].map(([k, l]) => chip(l, r === k, `data-act="bgR" data-v="${k}"`)).join('')}</div>
      <input class="input mt" id="bgSearch" type="search" placeholder="Search spending" value="${esc(UI.bgQ || '')}" aria-label="Search spending" autocomplete="off">
      <div class="chips mt">${chip('All', !UI.bgCat, 'data-act="bgCatF" data-c=""')}${used.map(c => chip(c.em + ' ' + c.name, UI.bgCat === c.id, `data-act="bgCatF" data-c="${esc(c.id)}"`)).join('')}</div>
      <p class="note">${plural(all.length, 'item')}${out ? ` · ${bgM(out)} spent` : ''}. Swipe left to delete, right to edit.</p><div id="bgList">${bgList()}</div></section>
    ${bgImportCard()}`;
}

/* ----- CSV import ----- */
function bgCsvRows(text) {
  text = String(text || '').replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0] || '', cnt = ch => first.split(ch).length - 1, delim = cnt('\t') > cnt(',') ? '\t' : cnt(';') > cnt(',') ? ';' : ',';
  const rows = []; let r = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { r.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; r.push(f); f = ''; if (r.some(c => c.trim())) rows.push(r); r = []; }
    else f += ch;
  }
  r.push(f); if (r.some(c => c.trim())) rows.push(r);
  return rows.map(r => r.map(c => c.trim()));
}
function bgDateOf(s) {
  s = String(s || '').trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))) { let y = +m[3]; if (y < 100) y += 2000; const a = +m[1], b = +m[2]; return a > 12 ? `${y}-${pad(b)}-${pad(a)}` : `${y}-${pad(a)}-${pad(b)}`; }
  const d = new Date(s); return isNaN(d) ? '' : dk(d);
}
const bgAmtOf = s => { s = String(s ?? '').trim(); if (!s) return NaN; const neg = /^\(.*\)$/.test(s) || /^[-−]/.test(s) || /-\s*$/.test(s), v = parseFloat(s.replace(/[^0-9.]/g, '')); return isNaN(v) ? NaN : neg ? -v : v; };
const BG_XFER = /^(online |mobile |recurring )?(payment|pmt)\b|payment thank you|thank you payment|autopay|automatic payment|transfer (to|from)|^transfer\b|internal transfer|credit card payment|crd pmt|ach pmt/i;
function bgCsvPlan(text) {
  const rows = bgCsvRows(text), o = UI.bgCsvOpts || {};
  const hi = rows.findIndex(r => r.some(c => /date/i.test(c)) && r.some(c => /amount|debit|credit|withdraw|deposit/i.test(c)));
  if (hi < 0) return {err:"I couldn't find the column names. The first line should have things like Date, Description and Amount."};
  const H = rows[hi].map(c => c.toLowerCase()), find = (...res) => { for (const re of res) { const i = H.findIndex(c => re.test(c)); if (i >= 0) return i; } return -1; };
  const iD = find(/^(transaction |trans )?date$/, /date/), iN = find(/^description$|merchant/, /payee|name/, /memo|detail|narrative|description/), iDeb = find(/debit|withdraw|money out|paid out/), iCr = find(/credit|deposit|money in|paid in/), iA = find(/^amount/, /amount/), iC = H.findIndex(c => /^(card|account)( name)?$/.test(c));
  if (iD < 0 || iN < 0 || (iA < 0 && iDeb < 0)) return {err:"I couldn't match the columns. I need a date, a description and an amount."};
  const data = rows.slice(hi + 1), split = iDeb >= 0 && iA < 0;
  let neg = 0, pos = 0; if (!split) data.forEach(r => { const v = bgAmtOf(r[iA]); if (v < 0) neg++; else if (v > 0) pos++; });
  const spendNeg = o.sign === 'neg' ? true : o.sign === 'pos' ? false : neg >= pos;
  const have = new Map(); S.bg.tx.forEach(x => { const k = x.d + '|' + x.amt.toFixed(2) + '|' + bgClean(x.name) + '|' + x.kind; have.set(k, (have.get(k) || 0) + 1); });
  const seen = new Map(), items = []; let dups = 0, credits = 0, bad = 0, refs = 0;
  data.forEach(r => {
    const d = bgDateOf(r[iD]), name = r[iN] || ''; let amt, kind;
    if (split) { const db = Math.abs(bgAmtOf(r[iDeb]) || 0), cr = iCr >= 0 ? Math.abs(bgAmtOf(r[iCr]) || 0) : 0; if (db > 0) { amt = db; kind = 'out'; } else if (cr > 0) { amt = cr; kind = 'in'; } }
    else { const v = bgAmtOf(r[iA]); if (!isNaN(v) && v !== 0) { amt = Math.abs(v); kind = (spendNeg ? v < 0 : v > 0) ? 'out' : 'in'; } }
    if (!d || !amt || !name) { bad++; return; }
    if (kind === 'in' && BG_XFER.test(name.trim())) { credits++; return; }
    if (kind === 'in' && !o.inc) { const pool = S.bg.tx.concat(items.filter(i => i.kind === 'out').map(i => ({id:'~' + i.d + i.name, kind:'out', d:i.d, amt:i.amt, name:i.name}))); if (!bgFindRefund({d, amt, name}, pool)) { credits++; return; } refs++; }
    if (kind === 'out' && BG_XFER.test(name.trim())) { credits++; return; }
    const cn = iC >= 0 ? String(r[iC] || '').toLowerCase() : '', cc = (S.bg.cards.find(c => cn && (cn.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(cn))) || {}).id || '';
    const key = d + '|' + amt.toFixed(2) + '|' + bgClean(name) + '|' + kind, n = (seen.get(key) || 0) + 1; seen.set(key, n);
    if (n <= (have.get(key) || 0)) { dups++; return; }
    const gs = kind === 'in' ? {cat:'other', conf:2} : bgGuess(name);
    items.push({d, amt:Math.round(amt * 100) / 100, name:name.replace(/\s+/g, ' ').slice(0, 60), kind, cat:gs.cat, conf:gs.conf, cc});
  });
  if (!items.length && !dups && !credits) return {err:"I couldn't read any rows from that. Check that it's the transactions file."};
  const ds = items.map(i => i.d).sort();
  return {items, dups, credits, bad, refs, from:ds[0] || today(), to:ds[ds.length - 1] || today()};
}

/* ----- Review (swipe) ----- */
function bgRefundCard(x, live) {
  const p = bgFind(x.of), pc = p ? bgCat(p.cat) : null, part = p && x.amt < p.amt - 0.005;
  return `<div class="bgcard${live ? '' : ' behind'}"${live ? ` data-live data-id="${esc(x.id)}"` : ''}>
    ${live ? '<div class="bgstamp ok">REFUND</div><div class="bgstamp no">NOPE</div>' : ''}
    <span class="small muted">${esc(fmtWd(x.d))} · money in</span><div class="bg-merch">${esc(x.name)}</div><div class="bg-amt">+${cash2(x.amt)}</div>
    <p class="bg-q">Looks like ${part ? 'part of' : ''} a refund for</p><div class="bg-guess" style="--c:${pc ? pc.color : 'var(--accent)'}">${esc(p ? p.name : 'a purchase')} · ${cash2(p ? p.amt : 0)}</div>
    <p class="small muted">${p ? esc(fmtWd(p.d)) : ''}${pc ? ` · ${esc(pc.em)} ${esc(pc.name)}` : ''}. If yes, that spending comes back off your budget.</p>
    ${live ? `<div class="btns bg-btns"><button class="btn ghost" data-act="bgNo" data-id="${esc(x.id)}" aria-label="Not a refund">✗ Not a refund</button><button class="btn" data-act="bgOk" data-id="${esc(x.id)}" aria-label="Yes, a refund">✓ Yes, refund</button></div>` : ''}</div>`;
}
function bgCardHtml(x, live) {
  if (bgAsk(x)) return bgRefundCard(x, live);
  const c = bgCat(x.cat), pick = live && (UI.bgPick === x.id || x.why === 'none');
  return `<div class="bgcard${live ? '' : ' behind'}"${live ? ` data-live data-id="${esc(x.id)}"` : ''}>
    ${live ? '<div class="bgstamp ok">RIGHT</div><div class="bgstamp no">NOT QUITE</div>' : ''}
    <span class="small muted">${esc(fmtWd(x.d))}</span><div class="bg-merch">${esc(x.name)}</div><div class="bg-amt">${cash2(x.amt)}</div>
    ${pick ? `<p class="bg-q">Where does this go?</p><div class="chips bg-grid">${S.bg.cats.map(k => chip(k.em + ' ' + k.name, false, `data-act="bgSet" data-id="${esc(x.id)}" data-c="${esc(k.id)}"`)).join('')}</div>`
      : `<p class="bg-q">${x.why === 'rule' ? 'I think this is' : 'Filed under'}</p><div class="bg-guess" style="--c:${c.color}">${esc(c.em)} ${esc(c.name)}</div>
        ${live ? `<div class="btns bg-btns"><button class="btn ghost" data-act="bgNo" data-id="${esc(x.id)}" aria-label="Not right, pick another">✗ Not right</button><button class="btn" data-act="bgOk" data-id="${esc(x.id)}" aria-label="Looks right">✓ Right</button></div>` : ''}`}</div>`;
}
function viewBrev() {
  const L = bgRevList();
  if (!L.length) return `${emptyCard('All caught up', 'Nothing needs a second look. When Hibi is unsure where a purchase goes, it shows up here to swipe through.', 'Add spending', 'data-act="go" data-to="btx"')}
    <section class="card"><p class="note">Hibi remembers <b>${Object.keys(S.bg.learn).length}</b> ${Object.keys(S.bg.learn).length === 1 ? 'merchant' : 'merchants'} so far. The more you confirm, the fewer cards you get.</p></section>`;
  const x = L[0], nxt = L[1];
  return `<p class="note" style="text-align:center">${plural(L.length, 'card')} left. Swipe right if it's sorted right, left to pick a different category.</p>
    <div class="bgdeck">${nxt ? bgCardHtml(nxt, false) : ''}${bgCardHtml(x, true)}</div>
    <div class="btns bg-more"><button class="link" data-act="bgSkip" data-id="${esc(x.id)}">Skip for now</button><button class="link danger" data-act="bgTxDel" data-id="${esc(x.id)}">Delete it</button></div>`;
}
{
  let d = null; const TH = 90;
  document.addEventListener('pointerdown', e => {
    const c = e.target.closest('.bgcard[data-live]'); if (!c || e.button > 0 || e.target.closest('button,select,input,textarea,a')) return;
    d = {c, x:e.clientX, y:e.clientY, dx:0, on:false, past:false, id:e.pointerId};
  }, {passive:true});
  document.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.on) { if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { d = null; return; } if (Math.abs(dx) < 10) return; d.on = true; d.c.classList.add('drag'); try { d.c.setPointerCapture(e.pointerId); } catch (x) {} }
    d.dx = dx; d.c.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
    const k = Math.min(1, Math.abs(dx) / TH); d.c.style.setProperty('--ok', dx > 0 ? k : 0); d.c.style.setProperty('--no', dx < 0 ? k : 0);
    const past = Math.abs(dx) >= TH; if (past !== d.past) { d.past = past; if (past) haptic('tick'); }
  }, {passive:true});
  const end = e => {
    if (!d || (e && e.pointerId !== d.id)) return; const s = d; d = null; if (!s.on) return;
    swiped = Date.now(); s.c.classList.remove('drag'); const id = s.c.dataset.id, up = e && e.type === 'pointerup';
    if (up && s.dx >= TH) { s.c.style.transform = 'translateX(120%) rotate(16deg)'; s.c.style.opacity = '0'; haptic(); setTimeout(() => runAct('bgOk', {dataset:{id}}), 170); }
    else if (up && s.dx <= -TH) { s.c.style.transform = ''; s.c.style.setProperty('--no', 0); runAct('bgNo', {dataset:{id}}); }
    else { s.c.style.transform = ''; s.c.style.setProperty('--ok', 0); s.c.style.setProperty('--no', 0); }
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
}

/* ----- Bills ----- */
function bgBillRow(b) {
  const p = bgPaid(b), n = dayDiff(today(), b.k), soon = !p && n >= 0 && n <= 3, late = !p && n < 0;
  return `<div class="bgbill${p ? ' paid' : ''}"><button class="bgchk${p ? ' on' : ''}" aria-pressed="${!!p}" data-act="bgPaid" data-id="${esc(b.id)}" data-hap aria-label="Paid: ${esc(b.x.name)}">${ICON_CHECK}</button>
    <span class="sub-em" aria-hidden="true" style="width:38px;height:38px;font-size:20px">${esc(b.x.em || '💳')}</span>
    <div style="flex:1;min-width:0"><b>${esc(b.x.name)}</b><span class="small muted" style="display:block">${esc(fmtWd(b.k))}${p ? ` · paid${p === 'auto' ? ' (found in your spending)' : ''}` : late ? ' · was due' : n === 0 ? ' · today' : n === 1 ? ' · tomorrow' : ''}${b.src === 'sub' ? ' · subscription' : ''}</span></div>
    <b class="${soon || late ? 'sub-price soon' : ''}">${cash2(b.amt)}</b></div>`;
}
function viewBbills() {
  const per = bgPer(0), nx = bgPer(1), B = bgBillsIn(per), tot = B.reduce((t, b) => t + b.amt, 0), paid = B.filter(bgPaid).reduce((t, b) => t + b.amt, 0), N = bgBillsIn(nx);
  const ed = UI.edit && UI.edit.kind === 'bgbill' ? S.bg.bills.find(x => x.id === UI.edit.id) : null, mine = S.bg.bills.filter(x => !x.off);
  const monthly = bgBillsAll().reduce((t, b) => t + subMonthly(b.x), 0);
  return `<section class="card"><div class="row"><h2>Set aside first</h2><span class="small muted">${esc(bgRange(per))}</span></div>
      <div class="stats"><div class="stat"><b>${bgM(tot)}</b><span>bills this period</span></div><div class="stat"><b>${bgM(paid)}</b><span>paid</span></div><div class="stat"><b>${bgM(tot - paid)}</b><span>still to pay</span></div></div>
      <div class="meter"><i style="width:${tot ? Math.min(100, paid / tot * 100) : 0}%;background:var(--good)"></i></div>
      <p class="note">These come out of your money before anything is safe to spend, so paying them can't push you over. About <b>${bgM(monthly)}</b> a month in all.</p></section>
    ${B.length ? `<section class="card"><h2>Due this period</h2>${B.map(bgBillRow).join('')}<p class="note">Tap the check when one is paid. If you add the payment to your spending with the same name, Hibi marks it paid for you.</p></section>` : emptyCard('No bills this period', 'Add rent, your phone, insurance and anything else that comes out regularly. Subscriptions you track in Savings show up here too.')}
    ${N.length ? `<details class="card flat" ${det('bgNext')}><summary class="sum"><h2>Next period</h2><span class="small muted">${bgM(N.reduce((t, b) => t + b.amt, 0))} · ${esc(bgRange(nx))}</span></summary>${N.map(b => `<div class="lrow"><b>${esc(b.x.em || '💳')} ${esc(b.x.name)}</b><span>${cash2(b.amt)} <small>${esc(fmtShort(b.k))}</small></span></div>`).join('')}</details>` : ''}
    <details class="card" ${det('bgBillForm', !!ed || !mine.length)}><summary class="sum"><h2>${ed ? 'Edit ' + esc(ed.name) : 'Add a bill'}</h2><span class="small muted">Rent, phone, insurance, loans</span></summary>
      <form data-form="bgbill" class="stack mt">
        <div class="ff"><label>Name<input class="input" name="name" placeholder="Rent" value="${ed ? esc(ed.name) : ''}"></label><label>Emoji<input class="input" name="em" placeholder="🏠" maxlength="4" value="${ed ? esc(ed.em || '') : ''}"></label>
          <label>Amount ($)<input class="input" name="price" inputmode="decimal" placeholder="0.00" value="${ed ? esc(ed.price) : ''}"></label><label>How often<select class="input" name="cycle">${SUB_CYCLES.map(([k, l]) => opt(k, l, ed ? ed.cycle : 'month')).join('')}</select></label></div>
        <label>Next due date (or any past one)<input class="input" type="date" name="start" value="${ed ? esc(subNext(ed)) : ''}"></label>
        <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Add bill'}</button>${ed ? '<button class="btn ghost" type="button" data-act="cancelEdit">Cancel</button>' : ''}</div></form></details>
    ${mine.length ? `<section class="card"><h2>Your bills</h2>${mine.map(x => swipeWrap(`<div class="lrow"><span style="text-align:left;color:var(--ink)">${esc(x.em || '💳')} <b>${esc(x.name)}</b><small class="muted">${esc(subCycle(x)[1])} · next ${esc(fmtShort(subNext(x)))}</small></span><span>${cash2(num(x.price))}</span></div>`, {r:['bgBillEdit', 'Edit'], l:['bgBillDel', 'Delete'], data:{id:x.id}})).join('')}<p class="note">Swipe left to delete, right to edit.</p></section>` : ''}
    <section class="card"><h2>Subscriptions</h2><p class="note">${S.subs.filter(x => !x.off).length ? `${plural(S.subs.filter(x => !x.off).length, 'subscription')} from Savings are counted here automatically.` : 'Subscriptions you add in Savings count here automatically.'}</p><button class="btn ghost block" data-act="wGo" data-k="save" data-to="vsubs">Manage subscriptions</button></section>`;
}

/* ----- Plan ----- */
function viewBplan() {
  const off = UI.bgOff || 0, per = bgPer(off), C = bgCalc(per), pl = S.bg.plan[per.key] || {}, bud = bgBudgetsOf(per), pv = bgCalc(bgPer(off - 1), true), left = C.pool - C.assigned, goals = S.sv.goals.filter(live);
  const rows = C.by.map(o => { const lp = pv.by.find(x => x.c.id === o.c.id), ls = lp ? lp.s : 0;
    return `<div class="bgplan-row"><span class="bgem" style="--c:${o.c.color}">${esc(o.c.em)}</span><div style="flex:1;min-width:0"><b>${esc(o.c.name)}</b><span class="small muted" style="display:block">${ls ? `Last period: ${bgM(ls)}` : 'Nothing spent last period'}</span></div>
      <input class="input bgin" inputmode="decimal" data-bind="bgb" data-c="${esc(o.c.id)}" value="${bud[o.c.id] ? esc(bud[o.c.id]) : ''}" placeholder="$0" aria-label="Budget for ${esc(o.c.name)}"></div>`; }).join('');
  return `<div class="chips mb">${[[0, 'This ' + bgWord()], [1, 'Next ' + bgWord()], [2, 'After that']].map(([k, l]) => chip(l, off === k, `data-act="bgOff" data-v="${k}"`)).join('')}</div>
    <section class="card"><div class="row"><h2>${off ? 'Plan ahead' : 'This period'}</h2><span class="small muted">${esc(bgRange(per))}</span></div>
      ${bgBar([[C.billsTotal, '#6C5CE7'], [C.sv, '#1ABC9C'], [Math.max(0, C.assigned), 'var(--accent)'], [Math.max(0, left), 'var(--line)']], Math.max(C.inc.total + C.roll, C.billsTotal + C.sv + C.assigned, 1))}
      <div class="bg-legend"><span><i style="background:#6C5CE7"></i>Bills</span><span><i style="background:#1ABC9C"></i>Savings</span><span><i style="background:var(--accent)"></i>Budgeted</span><span><i style="background:var(--line)"></i>Unassigned</span></div>
      <label class="bgfield">Income this period<small class="muted">${esc(C.inc.note)}${off && S.bg.src === 'work' && wkReady() && !pl.inc ? ', using your typical paycheck for future ones' : ''}</small><input class="input" inputmode="decimal" data-bind="bgpinc" value="${pl.inc != null && pl.inc !== '' ? esc(pl.inc) : ''}" placeholder="${esc(String(Math.round(C.inc.base * 100) / 100))}" aria-label="Income this period"></label>
      <div class="lrow"><span style="text-align:left;color:var(--ink)">Bills and subscriptions<small class="muted">${plural(C.bills.length, 'bill')}</small></span><span>−${bgM(C.billsTotal)}</span></div>
      ${C.roll ? `<div class="lrow"><span style="text-align:left;color:var(--ink)">Rolled over</span><span>+${bgM(C.roll)}</span></div>` : ''}
      <div class="lrow"><span style="text-align:left;color:var(--ink)"><b>To spend freely</b></span><span><b>${bgM(C.pool)}</b></span></div></section>
    <section class="card"><div class="row"><h2>Budgets</h2><span class="small muted" style="${left < 0 ? 'color:' + BG_BAD : ''}">${left < 0 ? `${bgM(-left)} over-assigned` : `${bgM(left)} unassigned`}</span></div>
      ${rows}
      <div class="btns mt"><button class="btn" data-act="bgSuggest">✨ Suggest for me</button>${off ? '<button class="btn ghost" data-act="bgCopy">Copy this period</button>' : ''}</div>
      <div class="btns mt"><button class="btn ghost sm" data-act="bgDefault">Use as my default</button><button class="btn ghost sm" data-act="bgClear" data-confirm>Clear</button></div>
      <p class="note">Unassigned money is a cushion. Anything you spend still counts against your safe-to-spend number, even in a category with no budget. Edit the categories themselves in Settings.</p></section>
    ${bgSaveCard(per, off, C)}`;
}


// 4.5: one clean savings card per month: goals and dollars, a total, and copy buttons
function bgSaveCard(per, off, C) {
  const M = bgMonthSave(per, C.inc.total), goals = S.sv.goals.filter(live), name = bgLabel(per), short = per.pay ? 'this period' : keyDate(per.from).toLocaleDateString(undefined, {month:'long'});
  const pvPer = bgPer(off - 1), pv = bgMonthSave(pvPer), pvName = pvPer.pay ? 'last period' : keyDate(pvPer.from).toLocaleDateString(undefined, {month:'long'});
  const usual = bgUsualRows(C.inc.total), sig = R => R.map(x => (x.id || '') + ':' + num(x.amt)).join('|'), isUsual = sig(M.rows) === sig(usual);
  const raw = M.raw.length ? M.raw : [{id:'', amt:0}];
  const rows = raw.map((x, i) => `<div class="bgsv-row"><select class="input" data-bind="bgsvg" data-i="${i}" aria-label="Goal ${i + 1}"><option value="">🏦 Just set aside</option>${goals.map(g => opt(g.id, (g.em || '💰') + ' ' + g.name, x.id || '')).join('')}</select>
      <input class="input" inputmode="decimal" data-bind="bgsva" data-i="${i}" value="${num(x.amt) ? esc(String(num(x.amt))) : ''}" placeholder="$0" aria-label="Dollars for goal ${i + 1}">
      <button class="bgsv-x" type="button" data-act="bgSvDel" data-i="${i}" aria-label="Remove this goal">✕</button></div>`).join('');
  const btn = (act, label) => `<button class="btn ghost sm" type="button" data-act="${act}">${label}</button>`;
  const tools = [
    pv.rows.length && sig(pv.rows) !== sig(M.rows) ? btn('bgSvCopy', `Copy from ${esc(pvName)}`) : '',
    M.own && usual.length ? btn('bgSvReset', 'Use my usual') : '',
    !isUsual && M.rows.length ? btn('bgSvMakeUsual', 'Make this my usual') : ''].filter(Boolean);
  return `<section class="card"><div class="row"><h2>Savings</h2><span class="chip-mini" style="${M.own ? '' : 'background:var(--line);color:var(--mute)'}">${M.own ? 'Just ' + esc(short) : 'Your usual'}</span></div>
      <p class="note">${M.own ? `${esc(name)} has its own savings. Other months aren't changed.` : `${esc(name)} follows your usual savings. Change anything below to give it its own.`}</p>
      <div class="bgsv-head"><span>Goal</span><span>Amount</span><span></span></div>
      ${rows}
      <button class="link mt" type="button" data-act="bgSvAdd">+ Add a goal</button>
      <div class="lrow mt"><span style="text-align:left;color:var(--ink)"><b>Saving in ${esc(short)}</b></span><span><b>${bgM(M.total)}</b></span></div>
      ${tools.length ? `<div class="btns mt">${tools.join('')}</div>` : ''}
      <p class="note">Savings come out before your safe to spend.</p></section>`;
}
// Give this month its own copy of the rows before changing them
const bgSvOwn = per => { const p = S.bg.plan[per.key] = S.bg.plan[per.key] || {}; if (!Array.isArray(p.split)) p.split = bgSaveRows(bgMonthSave(per).raw); return p; };

/* ----- Settings ----- */
function bgCatItem(c) {
  const open = UI.edit && UI.edit.kind === 'bgcat' && UI.edit.id === c.id;
  return `<div class="card flat" data-sid="${esc(c.id)}"><details ${det('bgc-' + c.id, !!open)}><summary class="sum"><div class="gsum">${grip(c.name)}<span class="bgem" style="--c:${c.color}">${esc(c.em)}</span><div><h3>${esc(c.name)}</h3><span class="small muted">${c.kind === 'bill' ? 'Bills, set aside first' : 'Spending'} · ${plural(bgKws(c).length, 'sort word')}</span></div></div></summary>
    ${bgCatForm(c)}</details></div>`;
}
function bgCatForm(c) {
  const fixed = c && (c.id === 'bills' || c.id === 'other');
  return `<form data-form="bgcat" class="stack mt"><input type="hidden" name="id" value="${c ? esc(c.id) : ''}">
    <div class="field"><input class="input" name="em" value="${c ? esc(c.em) : '🏷️'}" aria-label="Emoji" style="flex:0 0 58px;text-align:center;font-size:22px" maxlength="4"><input class="input" name="name" placeholder="Category name" value="${c ? esc(c.name) : ''}" aria-label="Category name" maxlength="24"></div>
    <div class="ff"><label>Color<input class="input" type="color" name="color" value="${c ? esc(c.color) : '#F0467F'}" style="padding:4px;height:46px"></label>
      <label>Counts as<select class="input" name="kind"${fixed ? ' disabled' : ''}>${opt('flex', 'Spending', c ? c.kind : 'flex')}${opt('bill', 'A bill (set aside first)', c ? c.kind : 'flex')}</select></label></div>
    <label>Words that sort into it<textarea class="input" name="kw" rows="3" placeholder="shell, chevron, sunpass">${c ? esc(c.kw) : ''}</textarea></label>
    <p class="note" style="margin-top:-4px">Separate with commas. A word ending in ? still sorts it, but asks you to double-check in Review.</p>
    <div class="btns"><button class="btn" type="submit">${c ? 'Save' : 'Add category'}</button>${c && !fixed ? `<button class="btn ghost danger" type="button" data-act="bgCatDel" data-id="${esc(c.id)}" data-confirm>Delete</button>` : ''}</div></form>`;
}
function bgSettings() {
  const g = S.bg, learned = Object.entries(g.learn), N = g.tx.length, goals = S.sv.goals.filter(live);
  const U = bgUsualRows(bgIncome(bgPer(0)).total), gnm = id => { const x = S.sv.goals.find(q => q.id === id); return x ? (x.em || '💰') + ' ' + x.name : '🏦 Just set aside'; };
  return `<section class="card"><h2>Usual savings</h2>
      ${U.length ? U.map(x => `<div class="lrow"><span style="text-align:left;color:var(--ink)">${esc(gnm(x.id))}</span><span>${bgM(x.amt)}</span></div>`).join('') + `<div class="lrow"><span style="text-align:left;color:var(--ink)"><b>Each ${bgWord()}</b></span><span><b>${bgM(U.reduce((a, x) => a + x.amt, 0))}</b></span></div>` : '<p class="note">No usual savings yet.</p>'}
      <p class="note">Months you haven't changed use this. To change it, set up a month in Plan › Savings and tap "Make this my usual".</p>
      <button class="btn ghost sm mt" data-act="wGo" data-k="budget" data-to="bplan">Open Plan</button></section>
    <section class="card"><h2>Budget period</h2>
      <label>Budget runs<select class="input" data-bind="bgper">${opt('pay', 'From payday to payday (uses Work)', g.per)}${opt('month', 'By calendar month', g.per)}</select></label>
      ${g.per === 'pay' && !wkReady() ? '<p class="note">Set your pay in Work settings first. Until then, Hibi uses calendar months.</p>' : ''}
      <label class="mt" style="display:block">Where income comes from<select class="input" data-bind="bgsrc">${opt('entered', 'What I enter for each month', g.src)}${opt('work', 'My Work mode pay', g.src)}${opt('month', 'My predicted monthly income', g.src)}${opt('manual', 'A fixed amount each period', g.src)}</select></label>
      <label class="mt" style="display:block">Predicted income per month ($)<input class="input" inputmode="decimal" data-bind="bgminc" value="${g.minc || ''}" placeholder="0" aria-label="Predicted income per month"></label>
      <p class="note">${g.src === 'entered' ? 'Each month has its own income. Enter it on Overview or Plan. Nothing here is used unless you pick a different source.' : g.src === 'month' ? 'Hibi uses this every month. With pay periods, each period gets its share, like 14 days out of the month. Change one period from Plan.' : 'Pick "My predicted monthly income" above to use it.'}</p>
      <label class="mt" style="display:block">Fixed pay each period ($)<input class="input" inputmode="decimal" data-bind="bginc" value="${g.inc || ''}" placeholder="0" aria-label="Usual pay each period"></label>
      <p class="note">${g.src === 'work' ? 'Used if Work has no pay set up. Your real paychecks come from Work.' : g.src === 'manual' ? 'Hibi uses this for every period. You can change one period from Plan.' : 'Only used when you pick a fixed amount.'}</p>
      <label class="setrow"><span>Roll leftovers into the next period<small class="muted" style="display:block;font-weight:600">Money you didn't spend carries forward</small></span><input type="checkbox" data-bind="bgroll"${g.roll ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label></section>
    <section class="card"><div class="row"><h2>Categories</h2><span class="small muted">Drag ⠿ to reorder</span></div>
      <div data-sort="bgcats">${g.cats.map(bgCatItem).join('')}</div>
      <details class="mt" ${det('bgCatNew')}><summary class="link">+ New category</summary>${bgCatForm(null)}</details>
      <button class="btn ghost block mt" data-act="bgResort">Re-sort my old spending</button>
      <p class="note">Re-sorting only touches purchases you haven't confirmed yourself.</p></section>
    <section class="card"><h2>What Hibi remembers</h2><p class="note">${learned.length ? `${plural(learned.length, 'merchant')} sorted for you from your choices.` : 'When you confirm or change a category, Hibi remembers that merchant.'}</p>
      ${learned.slice(-12).reverse().map(([k, id]) => `<div class="lrow"><span style="text-align:left;color:var(--ink)">${esc(k)}</span><span>${esc(bgCat(id).em)} ${esc(bgCat(id).name)} <button class="link danger" data-act="bgLearnDel" data-k="${esc(k)}" aria-label="Forget ${esc(k)}">✕</button></span></div>`).join('')}
      ${learned.length ? '<button class="link danger mt" data-act="bgLearnAll" data-confirm>Forget all of them</button>' : ''}</section>
    <section class="card"><h2>Your data</h2><p class="note">${plural(N, 'purchase')} saved on this device. Budget data is included in Hibi's backups and Dropbox sync.</p>
      <div class="btns"><button class="btn ghost" data-act="bgExport"${N ? '' : ' disabled'}>Export as CSV</button><button class="btn ghost danger" data-act="bgWipe" data-confirm>Delete all budget data</button></div></section>`;
}

/* ----- Actions and forms ----- */
Object.assign(XVIEWS, {bgo:viewBgo, btx:viewBtx, brev:viewBrev, bbills:viewBbills, bplan:viewBplan});
Object.assign(FORM_KEY, {bgtx:'bgTxForm', bgbill:'bgBillForm', bgcat:'bgCatNew'});
const bgFind = id => S.bg.tx.find(x => x.id === id);
function bgCheckEmpty() { if (!bgRevList().length) { setTimeout(() => confetti(30), 120); toast('All sorted. Nice!'); } }
Object.assign(XACT, {
  bgOk: d => { const x = bgFind(d.id); if (!x) return false; if (bgAsk(x)) { x.rf = 'yes'; S.bg.n.rev++; haptic(); toast(`Refund counted. ${cash2(x.amt)} back in your budget.`); if (!bgRevList().length) bgCheckEmpty(); return; } if (x.why === 'none') { UI.bgPick = x.id; toast('Pick a category for this one first.'); return; } x.rev = 0; if (x.why === 'rule' || x.why === 'none') x.why = 'manual'; const n = bgLearn(x); S.bg.n.rev++; UI.bgPick = null; haptic(); toast(n ? `Got it. ${plural(n, 'other purchase')} from them sorted too.` : 'Got it.'); if (!bgRevList().length) bgCheckEmpty(); },
  bgNo: d => { const x = bgFind(d.id); if (x && bgAsk(x)) { x.rf = 'no'; toast('Left as money in.'); if (!bgRevList().length) bgCheckEmpty(); return; } UI.bgPick = d.id; },
  bgSet: d => { const x = bgFind(d.id); if (!x) return false; x.cat = d.c; x.rev = 0; x.why = 'manual'; const n = bgLearn(x); S.bg.n.rev++; UI.bgPick = null; haptic(); const c = bgCat(d.c);
    toast(`${c.em} ${c.name}.${n ? ` ${plural(n, 'other purchase')} from them sorted too.` : ' I\'ll remember that.'}`); if (!bgRevList().length) bgCheckEmpty(); },
  bgSkip: d => { UI.bgSkip = [...(UI.bgSkip || []).filter(i => i !== d.id), d.id]; UI.bgPick = null; },
  bgTxEdit: d => { UI.edit = {kind:'bgtx', id:d.id}; UI.open.bgTxForm = true; if (S.tab !== 'btx') go('btx'); setTimeout(() => { const f = $('form[data-form="bgtx"]'); if (f) f.scrollIntoView({behavior:'smooth', block:'center'}); }, 60); },
  bgTxDel: d => { if (typeof rcStore !== 'undefined' && S.bg.tx.some(x => x.id === d.id && x.rc)) rcStore.del(d.id); S.bg.tx = S.bg.tx.filter(x => x.id !== d.id); if (UI.edit && UI.edit.id === d.id) UI.edit = null; },
  bgR: d => { UI.bgRange = d.v; },
  bgCatF: d => { UI.bgCat = d.c || ''; },
  bgCatGo: d => { UI.bgCat = d.c; UI.bgRange = 'cur'; go('btx'); scrollTo(0, 0); },
  bgOff: d => { UI.bgOff = +d.v; },
  bgPaid: d => { const per = bgPer(0), b = bgBillsIn(per).concat(bgBillsIn(bgPer(1))).find(x => x.id === d.id); if (!b) return false; const cur = bgPaid(b); S.bg.paid[d.id] = !cur; },
  bgBillEdit: d => { UI.edit = {kind:'bgbill', id:d.id}; UI.open.bgBillForm = true; setTimeout(() => { const f = $('form[data-form="bgbill"]'); if (f) f.scrollIntoView({behavior:'smooth', block:'center'}); }, 60); },
  bgBillDel: d => { S.bg.bills = S.bg.bills.filter(x => x.id !== d.id); },
  bgMove: () => { const per = bgPer(0), C = bgCalc(per), sh = bgShares(per); if (!sh.length || !(C.sv > 0)) return false; if (S.bg.moved[per.key]) return false;
    const tot = Math.round(sh.reduce((a, x) => a + x.amt, 0) * 100) / 100;
    sh.forEach(x => { const a = Math.round(x.amt * 100) / 100; if (a > 0) svAdd(x.id, a, 'From Budget'); });
    S.bg.moved[per.key] = tot; S.bg.n.moved++; },
  bgSplitMore: () => { const f = $('form[data-form="bgsplit"]'), dl = S.bg.save.splitMode === 'amt', n = bgSplitRows(), d = []; if (f) for (let i = 0; i < n; i++) { const id = (f.elements['g' + i] || {}).value || '', v = num((f.elements['p' + i] || {}).value); d.push(id || v ? (dl ? {id, amt:v} : {id, pct:v}) : {}); } UI.bgSplitDraft = d; UI.bgSplitRows = n + 1; UI.open.bgSplit = true; },
  bgSvAdd: () => { bgSvOwn(bgPer(UI.bgOff || 0)).split.push({id:'', amt:0}); },
  bgSvDel: d => { const p = bgSvOwn(bgPer(UI.bgOff || 0)); p.split.splice(+d.i, 1); },
  bgSvCopy: () => { const off = UI.bgOff || 0, per = bgPer(off), pv = bgPer(off - 1), R = bgMonthSave(pv).rows; if (!R.length) { toast('Nothing saved last time to copy.'); return false; }
    (S.bg.plan[per.key] = S.bg.plan[per.key] || {}).split = bgSaveRows(R); toast(`Copied ${bgM(R.reduce((a, x) => a + x.amt, 0))} of savings.`); },
  bgSvReset: () => { const p = S.bg.plan[bgPer(UI.bgOff || 0).key]; if (p) delete p.split; toast('Back to your usual savings.'); },
  bgSvMakeUsual: () => { const per = bgPer(UI.bgOff || 0), R = bgMonthSave(per).rows; S.bg.save.split = R.map(x => ({id:x.id, amt:x.amt, pct:0})); S.bg.save.splitMode = 'amt'; S.bg.save.mode = 'amt'; S.bg.save.v = R.reduce((a, x) => a + x.amt, 0); S.bg.save.goal = '';
    const p = S.bg.plan[per.key]; if (p) delete p.split; toast(`Saved as your usual: ${bgM(S.bg.save.v)} a ${bgWord()}.`); },
  bgSplitClear: () => { S.bg.save.split = []; toast('Back to one goal.'); },
  bgSuggest: () => {
    const off = UI.bgOff || 0, per = bgPer(off), C = bgCalc(per, true), pool = Math.max(0, C.pool);
    if (!pool) { toast('Add your income first so I know how much there is to split.'); return false; }
    const hist = []; for (let i = 1; i <= 3; i++) { const h = bgCalc(bgPer(off - i), true); if (h.n) hist.push(h); }
    const w = {}; S.bg.cats.filter(c => c.kind === 'flex').forEach(c => { w[c.id] = hist.length ? hist.reduce((t, h) => t + (h.by.find(x => x.c.id === c.id) || {s:0}).s, 0) / hist.length : (BG_W[c.id] ?? 3); });
    const tot = Object.values(w).reduce((a, b) => a + b, 0) || 1, scale = hist.length ? Math.min(pool, tot) / tot : pool * .9 / tot, b = {};
    Object.entries(w).forEach(([id, v]) => { const a = Math.round(v * scale / 5) * 5; if (a > 0) b[id] = a; });
    (S.bg.plan[per.key] = S.bg.plan[per.key] || {}).b = b; toast(hist.length ? 'Budgets set from your recent spending.' : 'Starter budgets set. Change any of them.'); },
  bgSaveUsual: () => { const per = bgPer(UI.bgOff || 0), c = bgSaveCfg(per); S.bg.save.mode = c.mode; S.bg.save.v = c.v; S.bg.save.goal = c.goal || ''; toast('Saved as your usual savings.'); },
  bgSaveReset: () => { const p = S.bg.plan[bgPer(UI.bgOff || 0).key]; if (p) { p.save = null; delete p.sm; delete p.sg; } toast('Back to your usual savings.'); },
  bgCopy: () => { const per = bgPer(UI.bgOff || 0); (S.bg.plan[per.key] = S.bg.plan[per.key] || {}).b = Object.assign({}, bgBudgetsOf(bgPer(0))); toast('Copied from this period.'); },
  bgDefault: () => { S.bg.base.b = Object.assign({}, bgBudgetsOf(bgPer(UI.bgOff || 0))); toast('Saved as your default for new periods.'); },
  bgClear: () => { const per = bgPer(UI.bgOff || 0), p = S.bg.plan[per.key]; if (p) delete p.b; S.bg.plan[per.key] = Object.assign({}, p, {b:{}}); toast('Budgets cleared for this period.'); },
  bgCatDel: d => { const c = S.bg.cats.find(x => x.id === d.id); if (!c || c.id === 'bills' || c.id === 'other') return false;
    S.bg.cats = S.bg.cats.filter(x => x.id !== c.id); S.bg.tx.forEach(x => { if (x.cat === c.id) { x.cat = 'other'; x.rev = x.kind === 'in' ? 0 : 1; } });
    Object.keys(S.bg.learn).forEach(k => { if (S.bg.learn[k] === c.id) delete S.bg.learn[k]; }); delete S.bg.base.b[c.id]; Object.values(S.bg.plan).forEach(p => { if (p.b) delete p.b[c.id]; }); UI.edit = null; toast(`Deleted ${c.name}. Its purchases moved to Other for a re-check.`); },
  bgResort: () => { let n = 0; S.bg.tx.forEach(x => { if (x.kind === 'in' || x.why === 'manual' || x.why === 'learned') return; const gs = bgGuess(x.name); if (gs.cat !== x.cat || (gs.conf < 2) !== !!x.rev) { x.cat = gs.cat; x.rev = gs.conf < 2 ? 1 : 0; x.why = gs.why; n++; } }); toast(n ? `Re-sorted ${plural(n, 'purchase')}.` : 'Everything already matches.'); },
  bgLearnDel: d => { delete S.bg.learn[d.k]; },
  bgLearnAll: () => { S.bg.learn = {}; toast('Forgot all merchants.'); },
  bgCsvGo: () => {
    const P = UI.bgCsvText ? bgCsvPlan(UI.bgCsvText) : null; if (!P || P.err || !P.items.length) { toast('Nothing to import.'); return false; }
    let rv = 0; P.items.forEach(i => { const x = bgMk({d:i.d, amt:i.amt, name:i.name, kind:i.kind, src:'csv'}); x.cc = i.kind === 'in' ? '' : i.cc || UI.bgCsvCard || ''; if (x.rev) rv++; S.bg.tx.push(x); });
    const rn = bgScanRefunds(); S.bg.n.imp += P.items.length; UI.bgCsvText = ''; UI.open.bgImp = false; toast(`Imported ${plural(P.items.length, 'purchase')}.${rv + rn ? ` ${rv + rn} need a quick look in Review.` : ''}`); if (rv + rn) UI.bgRev = rv + rn; },
  bgCsvClear: () => { UI.bgCsvText = ''; },
  bgExport: () => {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"', rows = [['Date', 'Amount', 'Type', 'Category', 'Name', 'Note'].join(',')];
    S.bg.tx.slice().sort((a, b) => a.d.localeCompare(b.d)).forEach(x => rows.push([x.d, x.amt.toFixed(2), x.kind === 'in' ? 'in' : 'out', q(bgCat(x.cat).name), q(x.name), q(x.note)].join(',')));
    shareFile(new Blob([rows.join('\n')], {type:'text/csv'}), 'hibi-spending.csv', 'text/csv'); return false; },
  bgWipe: () => { S.bg = {}; normalizeBg(S); UI.bgCsvText = ''; toast('Budget data deleted.'); },
});
Object.assign(SAVE, {
  bgtx: o => {
    const amt = num(o.amt); if (!(amt > 0)) { toast('Add the amount.'); return false; }
    const ed = UI.edit && UI.edit.kind === 'bgtx' ? S.bg.tx.find(x => x.id === UI.edit.id) : null, kind = o.kin === 'on' ? 'in' : 'out';
    if (ed) {
      Object.assign(ed, {amt:Math.round(amt * 100) / 100, d:o.d || ed.d, name:o.name || ed.name, kind}); ed.pts = kind === 'in' ? 0 : Math.min(Math.max(0, num(o.pts)), ed.amt); ed.pc = ed.pts ? o.pc || '' : ''; ed.cc = kind === 'in' ? '' : S.bg.cards.some(c => c.id === o.cc) ? o.cc : '';
      if (kind === 'in') { ed.rev = 0; if (!ed.rf) bgScanRefunds(); } else if (o.cat && (o.cat !== ed.cat || ed.rev)) { ed.cat = o.cat; ed.rev = 0; ed.why = 'manual'; bgLearn(ed); }
      UI.open.bgTxForm = false; toast('Updated.'); return;
    }
    const x = bgMk({amt, d:o.d, name:o.name, cat:o.cat, kind}); x.pts = kind === 'in' ? 0 : Math.min(Math.max(0, num(o.pts)), x.amt); x.pc = x.pts ? o.pc || '' : ''; if (x.pc) UI.bgPc = x.pc; x.cc = kind === 'in' ? '' : S.bg.cards.some(c => c.id === o.cc) ? o.cc : ''; UI.bgCc = x.cc; S.bg.tx.push(x); if (o.cat && o.name) bgLearn(x); if (kind === 'in' && bgScanRefunds()) { toast('That looks like a refund. Check Review.'); return; }
    const c = bgCat(x.cat); toast(kind === 'in' ? `Added ${cash2(x.amt)} coming in.` : `${cash2(x.amt)} → ${c.em} ${c.name}.${x.rev ? ' Not sure about that one, so it\'s in Review.' : ''}`); haptic();
  },
  bgpts: o => { const c = S.bg.cards.find(x => x.id === o.id), v = num(o.v); if (!c) return false; if (!(v >= 0) || String(o.v || '').trim() === '') { toast('Type what you have now.'); return false; } Object.assign(c, {bal:v, asOf:today(), at:Date.now()}); toast(`${c.name} updated.`); },
  bgowed: o => {
    const c = S.bg.cards.find(x => x.id === o.id); if (!c) return false; const oS = String(o.owed || '').trim(), lS = String(o.lim || '').trim();
    if (!oS && !lS) { toast('Type what you owe or the limit.'); return false; }
    if (oS) { c.owed = Math.max(0, Math.round(num(oS) * 100) / 100); c.oas = today(); c.oat = Date.now(); }
    if (lS) c.lim = Math.max(0, Math.round(num(lS) * 100) / 100); toast(`${c.name} saved.`); haptic();
  },
  bgpay: o => {
    const amt = Math.round(num(o.amt) * 100) / 100; if (!(amt > 0)) { toast('Add the payment amount.'); return false; } if (!S.bg.cards.some(c => c.id === o.card)) return false;
    S.bg.cpay.push({id:'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), d:o.d || today(), amt, card:o.card}); UI.bgPayCard = o.card; const c = S.bg.cards.find(x => x.id === o.card); toast(`${cash2(amt)} paid to ${c.name}. You owe ${bgM(bgOwed(c).owed)}.`); haptic();
  },
  bgsplit: o => {
    const dl = S.bg.save.splitMode === 'amt', sp = [], seen = {}; for (let i = 0; i < 30; i++) { const id = o['g' + i], v = Math.round(num(o['p' + i]) * 100) / 100; if (id && v > 0 && !seen[id]) { seen[id] = 1; sp.push(dl ? {id, amt:v, pct:0} : {id, pct:v, amt:0}); } }
    if (!sp.length) { S.bg.save.split = []; toast('Back to one goal.'); return; }
    const t = Math.round(sp.reduce((a, x) => a + (dl ? x.amt : x.pct), 0) * 100) / 100; if (!dl && t !== 100) { toast(`Percents add up to ${t}. Make it 100.`); return false; }
    S.bg.save.split = sp; UI.bgSplitDraft = null; UI.bgSplitRows = 0; UI.open.bgSplit = true; toast(dl ? `Savings split saved: ${bgM(t)} a ${bgWord()}.` : 'Savings split saved.');
  },
  bgcard: o => {
    const name = (o.name || '').trim(); if (!name) { toast('Give the card a name.'); return false; }
    const ed = UI.edit && UI.edit.kind === 'bgcard' ? S.bg.cards.find(c => c.id === UI.edit.id) : null, val = num(o.val) > 0 ? num(o.val) : 1, em = (o.em || '').trim().slice(0, 4) || '💳';
    const l4 = /^\d{4}$/.test((o.l4 || '').trim()) ? o.l4.trim() : ''; if (ed) { Object.assign(ed, {name:name.slice(0, 24), em, val, l4}); UI.open.bgCardForm = false; toast('Saved.'); return; }
    S.bg.cards.push({id:'k' + Date.now().toString(36), name:name.slice(0, 24), em, bal:Math.max(0, num(o.bal)), val, asOf:today(), at:Date.now(), l4}); UI.open.bgCardForm = false; toast(`Added ${name}.`);
  },
  bgbill: o => {
    const price = num(o.price); if (!o.name || !(price > 0)) { toast('Add the name and amount.'); return false; } if (!o.start) { toast('Add when it is next due.'); return false; }
    const rec = {name:o.name.trim(), em:(o.em || '').trim(), price:Math.round(price * 100) / 100, cycle:o.cycle || 'month', start:o.start, trial:false, note:''};
    const ed = UI.edit && UI.edit.kind === 'bgbill' ? S.bg.bills.find(x => x.id === UI.edit.id) : null;
    if (ed) { Object.assign(ed, rec); toast('Updated.'); } else { S.bg.bills.push(Object.assign(rec, {id:'g' + Date.now()})); toast(`Added ${rec.name}: ${cash2(rec.price)} ${subCycle(rec)[1].toLowerCase()}.`); }
    UI.open.bgBillForm = false;
  },
  bgcat: o => {
    const name = (o.name || '').trim(); if (!name) { toast('Give it a name.'); return false; }
    const ex = o.id ? S.bg.cats.find(c => c.id === o.id) : null;
    const rec = {name:name.slice(0, 24), em:(o.em || '').trim().slice(0, 4) || '🏷️', color:/^#[0-9a-f]{6}$/i.test(o.color || '') ? o.color : '#B2BEC3', kw:(o.kw || '').replace(/\s*\n+\s*/g, ', ')};
    if (ex) { if (ex.id !== 'bills' && ex.id !== 'other') rec.kind = o.kind === 'bill' ? 'bill' : 'flex'; Object.assign(ex, rec); toast('Saved. Tap "Re-sort" to apply new words to old purchases.'); }
    else { rec.kind = o.kind === 'bill' ? 'bill' : 'flex'; S.bg.cats.splice(Math.max(0, S.bg.cats.length - 1), 0, Object.assign(rec, {id:'c' + Date.now().toString(36)})); UI.open.bgCatNew = false; toast(`Added ${rec.name}.`); }
  },
  bgcsvp: o => { UI.bgCsvText = o.csv || ''; UI.open.bgImp = true; render(); return false; },
});
// Typing and tapping controls (called from events.js)
function bgBind(t) {
  const g = S.bg, k = t.dataset.bind, v = t.type === 'checkbox' ? t.checked : t.value, per = bgPer(t.dataset.v !== undefined ? +t.dataset.v : (UI.bgOff || 0)), pl = () => (g.plan[per.key] = g.plan[per.key] || {});
  const blank = String(v).trim() === '';
  switch (k) {
    case 'bgb': { const p = pl(); if (!p.b) p.b = Object.assign({}, bgBudgetsOf(per)); const a = Math.max(0, num(v)); if (a) p.b[t.dataset.c] = Math.round(a * 100) / 100; else delete p.b[t.dataset.c]; break; }
    case 'bgpinc': pl().inc = blank ? null : Math.max(0, num(v)); break;
    case 'bgpsave': { const p = pl(); if (blank) { p.save = null; delete p.sm; } else { p.save = Math.max(0, num(v)); if (!p.sm) p.sm = bgSaveCfg(per).mode; } break; }
    case 'bgpsm': { const p = pl(), c = bgSaveCfg(per), nm = v === 'pct' ? 'pct' : 'amt', inc = bgIncome(per).total; let x = c.v; if (nm !== c.mode) x = inc > 0 ? (nm === 'pct' ? c.v / inc * 100 : inc * c.v / 100) : 0; p.sm = nm; p.save = Math.round(x * 100) / 100; break; }
    case 'bgsvg': case 'bgsva': { const p = bgSvOwn(per), i = +t.dataset.i; while (p.split.length <= i) p.split.push({id:'', amt:0}); if (k === 'bgsvg') p.split[i].id = v; else p.split[i].amt = Math.max(0, Math.round(num(v) * 100) / 100); break; }
    case 'bgpsg': { const p = pl(); if (v === '__d') delete p.sg; else p.sg = v; break; }
    case 'bgper': g.per = v; break;
    case 'bgsrc': g.src = v; break;
    case 'bgminc': g.minc = Math.max(0, num(v)); if (g.minc > 0 && g.src === 'work' && !wkReady()) g.src = 'month'; break;
    case 'bginc': g.inc = Math.max(0, num(v)); break;
    case 'bgroll': g.roll = !!v; break;
    case 'bgsm': g.save.mode = v; break;
    case 'bgsv': g.save.v = Math.max(0, num(v)); break;
    case 'bgsg': g.save.goal = v; break;
    case 'bgspm': g.save.splitMode = v === 'pct' ? 'pct' : 'amt'; break;
    case 'bgcsvsign': UI.bgCsvOpts = Object.assign({}, UI.bgCsvOpts, {sign:v}); render(); return;
    case 'bgcsvcard': UI.bgCsvCard = v; render(); return;
    case 'bgcsvinc': UI.bgCsvOpts = Object.assign({}, UI.bgCsvOpts, {inc:!!v}); render(); return;
  }
  save(); render();
}

/* ----- Home widget ----- */
WIDGETS.budget = {n:'Safe to spend', em:'💸', d:'What you can spend today, and what bills are coming', mode:'budget', sizes:['s', 'm'], tap:goTo('budget', 'bgo'),
  s:() => { const C = bgCalc(bgPer(0)), set = C.inc.total || S.bg.tx.length;
    return small('💸', 'Safe to spend', set ? bgM(C.left < 0 ? 0 : C.daysLeft ? C.todayCan : Math.max(0, C.left)) : '–', !set ? 'Add your pay' : C.left < 0 ? `Over by ${bgM(-C.left)}` : `${bgM(C.left)} left · ${C.daysLeft}d`); },
  m:() => { const C = bgCalc(bgPer(0)), rv = bgRevList().length, set = C.inc.total || S.bg.tx.length, nb = C.bills.filter(b => !bgPaid(b)).slice(0, 2);
    return `<section class="card"><div class="row"><h2>💸 Safe to spend</h2><button class="link" data-act="mode" data-k="budget">Open</button></div>
      ${set ? `<div class="bg-big${C.left < 0 ? ' bad' : ''}" style="font-size:34px">${bgM(C.left < 0 ? 0 : C.daysLeft ? C.todayCan : Math.max(0, C.left))}<small> ${C.daysLeft ? 'today' : 'left'}</small></div>
        <p class="note">${C.left < 0 ? `Over by ${bgM(-C.left)} this period.` : `${bgM(C.left)} left until ${esc(fmtShort(addDays(C.per.to, 1)))}, about ${bgM(C.perDay)} a day.`}</p>
        ${bgBar([[C.billsTotal, '#6C5CE7'], [C.sv, '#1ABC9C'], [C.spent, 'var(--accent)'], [Math.max(0, C.left), 'var(--line)']], Math.max(C.inc.total + C.roll, C.billsTotal + C.sv + C.spent, 1))}
        ${nb.length ? `<p class="small muted mt">Next: ${nb.map(b => `${esc(b.x.name)} ${cash2(b.amt)} ${esc(subWhen(b.k))}`).join(' · ')}</p>` : ''}
        ${rv ? `<button class="btn sm mt" data-act="wGo" data-k="budget" data-to="brev">👀 ${plural(rv, 'purchase')} to check</button>` : ''}` : '<p class="note">Add your pay to see what\'s safe to spend.</p><button class="btn sm mt" data-act="wGo" data-k="budget" data-to="bplan">Set up</button>'}</section>`; }};


/* ----- Accounts (money on hand) ----- */
// The main account is tracked: what you typed, plus money in and Work paychecks since then, minus the spending you've logged
function bgEst(a) {
  const to = today(), tx = S.bg.tx.filter(x => x.d > a.asOf && x.d <= to);
  const out = tx.filter(x => x.kind !== 'in' && !x.cc).reduce((t, x) => t + x.amt - (x.pts || 0), 0) + S.bg.cpay.filter(p => p.d > a.asOf && p.d <= to).reduce((t, p) => t + p.amt, 0), inn = tx.filter(x => x.kind === 'in').reduce((t, x) => t + x.amt, 0);
  const pay = a.work && wkReady() ? bgPaychecks(addDays(a.asOf, 1), to, 80).reduce((t, P) => t + payFor(P).net, 0) : 0;
  return {est:a.bal + inn + pay - out, out, inn, pay};
}
const bgNow = a => a.main ? bgEst(a).est : a.bal;
const bgTotalBal = () => S.bg.accts.reduce((t, a) => t + bgNow(a), 0);
/* ----- Credit cards and net worth ----- */
const bgAfter = (c, d, x) => d > c.oas || (d === c.oas && bgMadeAt(x) >= (c.oat || 0));
function bgOwed(c) {
  const ch = S.bg.tx.filter(x => x.kind !== 'in' && x.cc === c.id && bgAfter(c, x.d, x)).reduce((t, x) => t + bgNet(x), 0), pay = S.bg.cpay.filter(p => p.card === c.id && bgAfter(c, p.d, p)).reduce((t, p) => t + p.amt, 0);
  const owed = Math.max(0, Math.round((c.owed + ch - pay) * 100) / 100);
  return {owed, ch, pay, avail:c.lim ? Math.max(0, c.lim - owed) : 0, util:c.lim ? owed / c.lim : 0};
}
const bgOwedTotal = () => S.bg.cards.reduce((t, c) => t + bgOwed(c).owed, 0);
const bgTypeSum = ty => S.bg.accts.filter(a => a.type === ty).reduce((t, a) => t + bgNow(a), 0);
function bgSnapNW() {
  const v = Math.round((bgTotalBal() - bgOwedTotal()) * 100) / 100, L = S.bg.nw, t = today(), last = L[L.length - 1];
  if (!S.bg.accts.length && !L.length) return;
  if (last && last.d === t) last.v = v; else L.push({d:t, v}); if (L.length > 400) L.shift();
}
function bgSpark(L) {
  if (L.length < 2) return '';
  const W = 300, H = 56, vs = L.map(p => p.v), mn = Math.min(...vs), mx = Math.max(...vs), r = mx - mn || 1;
  const pts = L.map((p, i) => `${(i / (L.length - 1) * W).toFixed(1)},${(H - 6 - (p.v - mn) / r * (H - 12)).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="bgspark" role="img" aria-label="Net worth over time" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}
function bgWorthCard() {
  bgSnapNW();
  const assets = bgTotalBal(), owed = bgOwedTotal(), worth = assets - owed, L = S.bg.nw, first = L[0], sav = bgTypeSum('save'), inv = bgTypeSum('invest'), spd = bgTypeSum('spend');
  const delta = first && L.length > 1 ? worth - first.v : 0;
  return `<section class="card bg-hero"><h2>✨ Net worth</h2><p class="small muted">What you own minus what you owe</p>
    <div class="bg-big${worth < 0 ? ' neg' : ''}">${worth < 0 ? '−' : ''}${bgM(Math.abs(worth))}</div>
    ${first && L.length > 1 ? `<p class="bg-sub">${delta >= 0 ? '+' : '−'}<b>${bgM(Math.abs(delta))}</b> since ${esc(fmtShort(first.d))}</p>` : '<p class="bg-sub">Add your accounts and cards. Hibi tracks how it grows over time.</p>'}
    ${bgSpark(L)}
    ${bgBar([[spd, '#6C5CE7'], [sav, '#1ABC9C'], [inv, '#F1C40F'], [owed, BG_BAD]], spd + sav + inv + owed)}
    <div class="bg-legend"><span><i style="background:#6C5CE7"></i>Spending ${bgM(spd)}</span><span><i style="background:#1ABC9C"></i>Savings ${bgM(sav)}</span>${inv ? `<span><i style="background:#F1C40F"></i>Investing ${bgM(inv)}</span>` : ''}<span><i style="background:${BG_BAD}"></i>Owed ${bgM(owed)}</span></div></section>`;
}
function bgCreditCard() {
  const C = S.bg.cards, tot = bgOwedTotal(), lim = C.reduce((t, c) => t + c.lim, 0), pays = S.bg.cpay.slice().sort((a, b) => b.d.localeCompare(a.d) || String(b.id).localeCompare(String(a.id))).slice(0, 6);
  if (!C.length) return '';
  return `<section class="card"><div class="row"><h2>💳 Credit cards</h2><b>${bgM(tot)}</b></div>
    <p class="note">${lim ? `${bgM(tot)} owed of ${bgM(lim)} in total limits (${Math.round(tot / lim * 100)}%). ` : ''}Pick the card on each purchase and log your payments, and what you owe updates on its own. Under about 30% of a limit is a healthy range.</p>
    ${C.map(c => { const o = bgOwed(c), pc = Math.min(100, o.util * 100), col = o.util > 0.5 ? BG_BAD : o.util > 0.3 ? '#F39C12' : 'var(--good)'; return `<div class="bgcardrow"><div class="row"><b>${esc(c.em)} ${esc(c.name)}</b><b>${bgM(o.owed)}</b></div>
      ${c.lim ? `<div class="meter"><i style="width:${pc}%;background:${col}"></i></div><span class="small muted">${Math.round(o.util * 100)}% of ${bgM(c.lim)} used, ${bgM(o.avail)} available</span>` : '<span class="small muted">Add the credit limit to see how much you have used.</span>'}
      <form data-form="bgowed" class="stack mt"><input type="hidden" name="id" value="${esc(c.id)}"><div class="ff"><label>What you owe now ($)<input class="input" name="owed" inputmode="decimal" placeholder="${esc(String(o.owed))}"></label><label>Credit limit ($)<input class="input" name="lim" inputmode="decimal" placeholder="${c.lim ? esc(String(c.lim)) : '0'}"></label></div><button class="btn ghost" type="submit">Save</button></form></div>`; }).join('')}
    <h3 class="bgday mt">Log a payment</h3>
    <form data-form="bgpay" class="stack"><div class="ff"><label>Card<select class="input" name="card">${C.map(c => opt(c.id, c.em + ' ' + c.name, UI.bgPayCard || '')).join('')}</select></label><label>Amount ($)<input class="input" name="amt" inputmode="decimal" placeholder="0.00" autocomplete="off"></label></div>
      <label>Date<input class="input" type="date" name="d" value="${esc(today())}"></label><button class="btn" type="submit">Add payment</button></form>
    ${pays.length ? `<div class="mt">${pays.map(p => { const c = C.find(x => x.id === p.card); return swipeWrap(`<div class="lrow"><span style="text-align:left;color:var(--ink)">${esc(c ? c.em + ' ' + c.name : 'Card')}<small class="muted">${esc(fmtShort(p.d))} · payment</small></span><span>−${cash2(p.amt)}</span></div>`, {l:['bgPayDel', 'Delete'], data:{id:p.id}}); }).join('')}</div>` : ''}</section>`;
}
function bgMoneyCard() {
  const A = S.bg.accts;
  if (!A.length) return `<section class="card"><h2>🏦 Money on hand</h2><p class="note">Add what's in your accounts. Hibi tracks it as you spend and get paid, so you always know roughly what you have.</p><button class="btn ghost block" data-act="wGo" data-k="budget" data-to="bacct">Add my accounts</button></section>`;
  const main = A.find(a => a.main), C = bgCalc(bgPer(0)), due = C.bills.filter(b => !bgPaid(b)).reduce((t, b) => t + b.amt, 0);
  return `<section class="card"><div class="row"><h2>🏦 Money on hand</h2><button class="link" data-act="wGo" data-k="budget" data-to="bacct">Accounts</button></div>
    <div class="bg-big" style="font-size:34px">${bgM(bgTotalBal())}</div>
    ${main ? `<p class="note">${esc(main.name)} is about <b>${bgM(bgNow(main))}</b> now${due > 0 ? `, and <b>${bgM(bgNow(main) - due)}</b> after the ${bgM(due)} of bills still due this ${bgWord()}` : ''}.</p>` : '<p class="note">Mark one account as the one you spend from, and Hibi will track it for you.</p>'}</section>`;
}
function bgAcctForm(ed) {
  return `<form data-form="bgacct" class="stack">
    <div class="field"><input class="input" name="em" value="${ed ? esc(ed.em) : '🏦'}" aria-label="Emoji" style="flex:0 0 58px;text-align:center;font-size:22px" maxlength="4"><input class="input" name="name" placeholder="Checking, Savings, Cash…" value="${ed ? esc(ed.name) : ''}" aria-label="Account name" maxlength="24"></div>
    <label>Type<select class="input" name="type">${opt('spend', 'Checking or cash', ed ? ed.type : 'spend')}${opt('save', 'Savings', ed ? ed.type : '')}${opt('invest', 'Investing', ed ? ed.type : '')}</select></label>
    ${ed ? '' : '<label>What\'s in it right now ($)<input class="input" name="bal" inputmode="decimal" placeholder="0.00"></label>'}
    <label class="setrow"><span>Track my spending here<small class="muted" style="display:block;font-weight:600">Hibi updates this one as you spend and get paid</small></span><input type="checkbox" name="main"${!ed ? ' checked' : ed.main ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>
    <label class="setrow"><span>Count my Work paychecks<small class="muted" style="display:block;font-weight:600">Adds each payday after the date you entered</small></span><input type="checkbox" name="work"${!ed || ed.work ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>
    <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Add account'}</button>${ed ? '<button class="btn ghost" type="button" data-act="cancelEdit">Cancel</button>' : ''}</div></form>`;
}
const bgMadeAt = x => { const n = parseInt(String(x.id).slice(1, -4), 36); return n > 1e12 ? n : 0; };
// Spending after the day you typed the balance counts. On that same day it counts only if you logged it after typing the balance
const bgCardLeft = c => { const used = S.bg.tx.filter(x => x.kind !== 'in' && x.pc === c.id && (x.d > c.asOf || (x.d === c.asOf && bgMadeAt(x) >= (c.at || 0)))).reduce((t, x) => t + (x.pts || 0), 0); return {used, left:Math.max(0, c.bal * c.val - used)}; };
const bgPtsLeft = () => S.bg.cards.reduce((o, c) => { const r = bgCardLeft(c); o.left += r.left; o.used += r.used; return o; }, {left:0, used:0});
function bgCardForm(ed) {
  return `<form data-form="bgcard" class="stack">
    <div class="field"><input class="input" name="em" value="${ed ? esc(ed.em) : '💳'}" aria-label="Emoji" style="flex:0 0 58px;text-align:center;font-size:22px" maxlength="4"><input class="input" name="name" placeholder="Card name" value="${ed ? esc(ed.name) : ''}" aria-label="Card name" maxlength="24"></div>
    <label>Each point is worth ($)<small class="muted" style="display:block;font-weight:600">Cash back: 1. Points or miles are often about 0.01.</small><input class="input" name="val" inputmode="decimal" placeholder="1" value="${ed ? esc(ed.val) : ''}"></label>
    <label>Last 4 digits <small class="muted">(optional)</small><small class="muted" style="display:block;font-weight:600">Lets receipt scanning pick this card for you</small><input class="input" name="l4" inputmode="numeric" maxlength="4" placeholder="1234" autocomplete="off" value="${ed ? esc(ed.l4 || '') : ''}"></label>
    ${ed ? '' : '<label>What you have now<small class="muted" style="display:block;font-weight:600">Dollars of cash back, or your number of points</small><input class="input" name="bal" inputmode="decimal" placeholder="0"></label>'}
    <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Add card'}</button>${ed ? '<button class="btn ghost" type="button" data-act="cancelEdit">Cancel</button>' : ''}</div></form>`;
}
function bgRewardsCard() {
  const R = bgPtsLeft(), ed = UI.edit && UI.edit.kind === 'bgcard' ? S.bg.cards.find(c => c.id === UI.edit.id) : null;
  return `<section class="card"><div class="row"><h2>🎁 Card rewards</h2><b>${bgM(R.left)}</b></div>
    <p class="note">Points and cash back for each card, in dollars. When you pay for something with them, add the amount and pick the card on that purchase. It comes off that card's rewards and doesn't use up your safe to spend.</p>
    ${S.bg.cards.map(c => { const r = bgCardLeft(c), pt = c.val !== 1; return `<div class="bgcardrow"><div class="row"><b>${esc(c.em)} ${esc(c.name)}</b><b>${bgM(r.left)}</b></div>
      <span class="small muted">${pt ? `${Math.round(c.bal).toLocaleString()} points at ${cash2(c.val)} each on ${esc(fmtShort(c.asOf))}` : `${bgM(c.bal)} on ${esc(fmtShort(c.asOf))}`}${r.used ? `, ${bgM(r.used)} used since` : ''}</span>
      <form data-form="bgpts" class="field mt"><input type="hidden" name="id" value="${esc(c.id)}"><input class="input" name="v" inputmode="decimal" placeholder="${pt ? 'Points you have now' : 'What you have now ($)'}" aria-label="Rewards now on ${esc(c.name)}"><button class="btn ghost" type="submit">Update</button></form>
      <div class="row mt" style="justify-content:flex-start;gap:16px"><button class="link" data-act="bgCardEdit" data-id="${esc(c.id)}">Edit</button><button class="link danger" data-act="bgCardDel" data-id="${esc(c.id)}" data-confirm>Delete</button></div></div>`; }).join('')}
    <details class="mt" ${det('bgCardForm', !!ed)}><summary class="link">${ed ? 'Edit ' + esc(ed.name) : 'Add a card'}</summary>${bgCardForm(ed)}</details></section>`;
}
function viewBacct() {
  const A = S.bg.accts, ed = UI.edit && UI.edit.kind === 'bgacct' ? A.find(x => x.id === UI.edit.id) : null, tot = bgTotalBal();
  const start = A.reduce((t, a) => t + a.hist[0].v, 0), since = A.map(a => a.hist[0].d).sort()[0];
  return `${bgWorthCard()}${bgCreditCard()}${A.length ? `<section class="card"><h2>Accounts total</h2><div class="bg-big">${bgM(tot)}</div>${A.length && since ? `<p class="bg-sub">${tot - start >= 0 ? '+' : '−'}<b>${bgM(Math.abs(tot - start))}</b> since ${esc(fmtShort(since))}, when you first added your accounts.</p>` : ''}</section>` : ''}
    ${A.map(a => { const e = a.main ? bgEst(a) : null;
      return `<section class="card"><div class="row"><div class="mhead"><span class="gem" aria-hidden="true">${esc(a.em)}</span><div><h3>${esc(a.name)}${a.type === 'save' ? ' <span class="chip-mini">Savings</span>' : a.type === 'invest' ? ' <span class="chip-mini">Investing</span>' : ''}${a.main ? ' <span class="chip-mini">Tracked</span>' : ''}</h3><span class="small muted">You entered ${bgM(a.bal)} on ${esc(fmtShort(a.asOf))}</span></div></div><b>${bgM(bgNow(a))}</b></div>
        ${e ? `<p class="note">Now: ${bgM(a.bal)}${e.pay ? ` + ${bgM(e.pay)} paychecks` : ''}${e.inn ? ` + ${bgM(e.inn)} money in` : ''} − ${bgM(e.out)} spent since then.</p>` : ''}
        <form data-form="bgbal" class="field mt"><input type="hidden" name="id" value="${esc(a.id)}"><input class="input" name="v" inputmode="decimal" placeholder="Update what's in it now" aria-label="New balance for ${esc(a.name)}"><button class="btn ghost" type="submit">Update</button></form>
        ${a.hist.length > 1 ? `<p class="small muted mt">${a.hist.slice(-5).map(h => `${esc(fmtShort(h.d))}: ${bgM(h.v)}`).join(' → ')}</p>` : ''}
        <div class="row mt" style="justify-content:flex-start;gap:16px"><button class="link" data-act="bgAcctEdit" data-id="${esc(a.id)}">Edit</button><button class="link danger" data-act="bgAcctDel" data-id="${esc(a.id)}" data-confirm>Delete</button></div></section>`; }).join('')}
    ${bgRewardsCard()}
    <details class="card" ${det('bgAcctForm', !!ed || !A.length)}><summary class="sum"><h2>${ed ? 'Edit ' + esc(ed.name) : 'Add an account'}</h2><span class="small muted">Checking, savings, cash</span></summary>${bgAcctForm(ed)}</details>
    <p class="note">Hibi can't see your bank, so update an account's balance now and then to keep it accurate. Every time you do, the estimate starts fresh from the number you typed.</p>`;
}

/* ----- Totals: year and lifetime ----- */
function bgStats(y) {
  const first = S.bg.tx.map(x => x.d).sort()[0] || today(), yr = new Date().getFullYear();
  const from = y === 'all' ? first : `${y}-01-01`, to = y === 'all' || +y === yr ? today() : `${y}-12-31`;
  const tx = S.bg.tx.filter(x => x.d >= from && x.d <= to), out = tx.filter(x => x.kind !== 'in'), sum = L => L.reduce((t, x) => t + x.amt, 0);
  const pcs = wkReady() ? bgPaychecks(from, to, 400) : [], work = pcs.reduce((t, P) => t + payFor(P).net, 0), inn = sum(tx.filter(x => x.kind === 'in' && !bgRefundOn(x)));
  const mk = {}; const add = (k, f, v) => { (mk[k] = mk[k] || {spent:0, earned:0})[f] += v; };
  out.forEach(x => add(x.d.slice(0, 7), 'spent', bgNet(x))); tx.filter(x => x.kind === 'in' && !bgRefundOn(x)).forEach(x => add(x.d.slice(0, 7), 'earned', x.amt)); pcs.forEach(P => { const v = payFor(P).net; if (v > 0) add(P.pay.slice(0, 7), 'earned', v); });
  const months = Object.keys(mk).sort(), n = Math.max(1, (+to.slice(0, 4) - +from.slice(0, 4)) * 12 + (+to.slice(5, 7) - +from.slice(5, 7)) + 1);
  const mer = new Map(); out.forEach(x => { const c = bgClean(x.name), k = bgKey(c) || 'unknown', o = mer.get(k) || {name:x.name, sum:0, n:0}; o.sum += bgNet(x); o.n++; mer.set(k, o); });
  const cats = S.bg.cats.map(c => ({c, v:sum(out.filter(x => x.cat === c.id))})).filter(o => o.v > 0).sort((a, b) => b.v - a.v);
  const big = out.slice().sort((a, b) => b.amt - a.amt)[0];
  return {from, to, spent:sum(out), bills:sum(out.filter(x => bgCat(x.cat).kind === 'bill')), earned:work + inn, n, count:out.length, months, mk, cats, mer:[...mer.values()].sort((a, b) => b.sum - a.sum).slice(0, 8), big};
}
function viewBtot() {
  const yr = new Date().getFullYear(), y = UI.bgYear === 'all' ? 'all' : (UI.bgYear || yr), S0 = bgStats(y), mx = Math.max(1, ...S0.months.map(k => Math.max(S0.mk[k].spent, S0.mk[k].earned)));
  const net = S0.earned - S0.spent, mname = k => keyDate(k + '-01').toLocaleDateString(undefined, y === 'all' ? {month:'short', year:'2-digit'} : {month:'long'});
  const cmax = S0.cats.length ? S0.cats[0].v : 1;
  return `<div class="bgnav">${y === 'all' ? '' : `<button class="btn sm ghost" data-act="bgY" data-n="-1" aria-label="Previous year">‹</button><b>${y}</b><button class="btn sm ghost" data-act="bgY" data-n="1" aria-label="Next year"${y >= yr ? ' disabled' : ''}>›</button>`}<button class="chip${y === 'all' ? ' on' : ''}" data-act="bgY" data-v="${y === 'all' ? 'year' : 'all'}" aria-pressed="${y === 'all'}">${y === 'all' ? 'Back to this year' : 'Lifetime'}</button></div>
    ${S0.count || S0.earned ? `<section class="card"><h2>${y === 'all' ? 'Since you started' : y}</h2>
      <div class="stats bgstats"><div class="stat"><b>${bgK(S0.spent)}</b><span>spent</span></div><div class="stat"><b>${S0.earned ? bgK(S0.earned) : '–'}</b><span>came in</span></div><div class="stat"><b style="${net < 0 ? 'color:' + BG_BAD : ''}">${S0.earned ? (net < 0 ? '−' : '+') + bgK(Math.abs(net)) : '–'}</b><span>${net < 0 ? 'short' : 'kept'}</span></div></div>
      <p class="note">About <b>${bgM(S0.spent / S0.n)}</b> a month across ${plural(S0.count, 'purchase')}. ${S0.bills ? `${bgM(S0.bills)} of it was bills.` : ''}${S0.earned ? ' "Came in" is your Work paychecks plus any money in you added.' : ''}</p></section>
    ${S0.months.length ? `<section class="card"><h2>Month by month</h2>${S0.months.slice(-24).map(k => { const m = S0.mk[k]; return `<div class="crow"><div class="row"><b>${esc(mname(k))}</b><span>${bgM(m.spent)}${m.earned ? ` of ${bgM(m.earned)}` : ''}</span></div><div class="cbar"><i style="width:${m.spent / mx * 100}%;background:${m.earned && m.spent > m.earned ? BG_BAD : 'var(--accent)'}"></i></div></div>`; }).join('')}</section>` : ''}
    ${S0.cats.length ? `<section class="card"><h2>Where it went</h2>${S0.cats.map(o => `<div class="crow"><div class="row"><b><span class="bgdot" style="background:${o.c.color}"></span>${esc(o.c.em)} ${esc(o.c.name)}</b><span>${bgM(o.v)} · ${Math.round(o.v / S0.spent * 100)}%</span></div><div class="cbar"><i style="width:${o.v / cmax * 100}%;background:${o.c.color}"></i></div></div>`).join('')}</section>` : ''}
    ${S0.mer.length ? `<section class="card"><h2>Top places</h2>${S0.mer.map(m => `<div class="lrow"><span style="text-align:left;color:var(--ink)">${esc(m.name.replace(/\s+/g, ' ').slice(0, 28))}<small class="muted">${plural(m.n, 'time')}</small></span><span>${bgM(m.sum)}</span></div>`).join('')}${S0.big ? `<p class="note">Biggest single purchase: <b>${cash2(S0.big.amt)}</b> at ${esc(S0.big.name.slice(0, 28))} on ${esc(fmtShort(S0.big.d))}.</p>` : ''}</section>` : ''}`
    : emptyCard(y === 'all' ? 'Nothing tracked yet' : `Nothing in ${y}`, 'Add or import your spending and your year and lifetime totals show up here.', 'Add spending', 'data-act="go" data-to="btx"')}`;
}
Object.assign(XVIEWS, {btot:viewBtot, bacct:viewBacct});
Object.assign(FORM_KEY, {bgacct:'bgAcctForm', bgcard:'bgCardForm', bgsplit:'bgSplitForm'});
Object.assign(XACT, {
  bgIncWork: d => { const per = bgPer(+d.v || 0), v = bgWorkIn(per); if (!(v > 0)) { toast('No Work paychecks land in that time.'); return false; } (S.bg.plan[per.key] = S.bg.plan[per.key] || {}).inc = Math.round(v * 100) / 100; toast('Income set from your Work pay.'); },
  bgIncPrev: d => { const per = bgPer(+d.v || 0), pv = bgPer((+d.v || 0) - 1), p = S.bg.plan[pv.key], v = p && p.inc != null && p.inc !== '' ? num(p.inc) : bgIncome(pv).base; if (!(v > 0)) { toast('Last one has no income to copy.'); return false; } (S.bg.plan[per.key] = S.bg.plan[per.key] || {}).inc = Math.round(v * 100) / 100; toast(`Income set to ${bgM(v)}.`); },
  bgIncClear: d => { const p = S.bg.plan[bgPer(+d.v || 0).key]; if (p) p.inc = null; },
  bgView: d => { UI.bgView = +d.n === 0 ? 0 : Math.max(-36, Math.min(36, (UI.bgView || 0) + +d.n)); },
  bgY: d => { const yr = new Date().getFullYear(); if (d.v === 'all') UI.bgYear = 'all'; else if (d.v === 'year') UI.bgYear = yr; else { const c = UI.bgYear === 'all' ? yr : (UI.bgYear || yr); UI.bgYear = Math.min(yr, c + +d.n); } },
  bgAcctEdit: d => { UI.edit = {kind:'bgacct', id:d.id}; UI.open.bgAcctForm = true; setTimeout(() => { const f = $('form[data-form="bgacct"]'); if (f) f.scrollIntoView({behavior:'smooth', block:'center'}); }, 60); },
  bgPayDel: d => { S.bg.cpay = S.bg.cpay.filter(p => p.id !== d.id); },
  bgCardEdit: d => { UI.edit = {kind:'bgcard', id:d.id}; UI.open.bgCardForm = true; },
  bgCardDel: d => { S.bg.cards = S.bg.cards.filter(c => c.id !== d.id); S.bg.tx.forEach(x => { if (x.pc === d.id) { x.pts = 0; x.pc = ''; } if (x.cc === d.id) x.cc = ''; }); S.bg.cpay = S.bg.cpay.filter(p => p.card !== d.id); UI.edit = null; },
  bgAcctDel: d => { S.bg.accts = S.bg.accts.filter(a => a.id !== d.id); UI.edit = null; },
});
Object.assign(SAVE, {
  bgacct: o => {
    const name = (o.name || '').trim(); if (!name) { toast('Give the account a name.'); return false; }
    const ed = UI.edit && UI.edit.kind === 'bgacct' ? S.bg.accts.find(a => a.id === UI.edit.id) : null, main = o.main === 'on', work = o.work === 'on';
    if (ed) { Object.assign(ed, {name:name.slice(0, 24), em:(o.em || '').trim().slice(0, 4) || '🏦', main, work, type:['spend', 'save', 'invest'].includes(o.type) ? o.type : 'spend'}); if (main) S.bg.accts.forEach(a => { if (a !== ed) a.main = false; }); UI.open.bgAcctForm = false; toast('Saved.'); return; }
    const bal = Math.round(num(o.bal) * 100) / 100, a = {id:'a' + Date.now().toString(36), name:name.slice(0, 24), em:(o.em || '').trim().slice(0, 4) || '🏦', bal, asOf:today(), hist:[{d:today(), v:bal}], main, work, type:['spend', 'save', 'invest'].includes(o.type) ? o.type : 'spend'};
    if (main) S.bg.accts.forEach(x => { x.main = false; }); S.bg.accts.push(a); if (!S.bg.accts.some(x => x.main)) a.main = true; UI.open.bgAcctForm = false; toast(`Added ${a.name}.`);
  },
  bgbal: o => {
    const a = S.bg.accts.find(x => x.id === o.id); if (!a) return false; if (String(o.v || '').trim() === '') { toast('Type what is in it now.'); return false; }
    a.bal = Math.round(num(o.v) * 100) / 100; a.asOf = today(); a.hist = [...a.hist.filter(h => h.d !== today()), {d:today(), v:a.bal}].slice(-60); toast(`${a.name} is now ${bgM(a.bal)}.`); haptic();
  },
});

// Badge counters (called from badges.js)
function bgBadgeStats(o) {
  const g = S.bg; o.bgTx = g.tx.length; o.bgRev = g.n.rev; o.bgMoved = g.n.moved; o.bgUnder = 0;
  if (!g.tx.length) return;
  const first = g.tx.map(x => x.d).sort()[0]; let per = bgPeriodAt(addDays(bgPer(0).from, -1));
  for (let i = 0; i < 8 && per.to >= first; i++) { const C = bgCalc(per, true); if (C.n >= 3 && C.pool > 0 && C.left >= 0) o.bgUnder++; per = bgPeriodAt(addDays(per.from, -1)); }
}
normalizeBg(S);
bgScanRefunds();
// This file loads after the state was built, so add Budget to the mode order here
S.order = [...S.order.filter(k => MODES[k]), ...Object.keys(MODES).filter(k => k !== 'home' && !S.order.includes(k))];
