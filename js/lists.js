// Hibi: Lists mode. A shopping list, and a wish list that keeps a price history for each item.
'use strict';
/* =========================================================
   Shopping list and wish list
   ========================================================= */
Object.assign(ICON, {
  cart:'<path d="M3 4h2.5l2.2 11h10.6L20.5 7H7"/><circle cx="9.5" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  gift:'<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9zm0 0c2-4 6-4 6-1.5S14 9 12 9z"/>'});
MODES.lists = {label:'Lists', em:'🛒', nav:[['lshop','Shopping','cart'],['lwish','Wish list','gift'],['settings','Settings','settings']]};
Object.assign(TAB_INFO, {lshop:{g:'lshop',t:'Shopping list'}, lwish:{g:'lwish',t:'Wish list'}});
Object.assign(GROUPS, {lshop:['lshop'], lwish:['lwish']});

// Store sections, with words that put an item there automatically
const LS_SEC = [
  ['produce','🥬','Produce','apple banana berr grape lemon lime orange avocado tomato potato onion garlic lettuce spinach salad carrot pepper cucumber broccoli fruit veg cilantro herb mushroom corn'],
  ['meat','🥩','Meat & fish','chicken beef steak pork bacon sausage turkey ham ground fish salmon tuna shrimp meat'],
  ['dairy','🥛','Dairy & eggs','milk egg cheese yogurt yoghurt butter cream'],
  ['bakery','🍞','Bakery','bread bagel tortilla bun roll muffin croissant'],
  ['pantry','🥫','Pantry','rice pasta noodle ramen sauce oil flour sugar salt spice cereal oat bean soup peanut can protein powder'],
  ['frozen','🧊','Frozen','frozen ice pizza'],
  ['snacks','🍿','Snacks & drinks','chip snack cookie candy chocolate soda juice water coffee tea drink energy gatorade cracker'],
  ['home','🧻','Household','paper towel toilet detergent soap dish trash bag cleaner sponge battery bulb foil'],
  ['care','🧴','Personal care','shampoo conditioner toothpaste toothbrush deodorant lotion razor floss vitamin medicine'],
  ['other','🛍️','Other','']];
const lsSec = k => LS_SEC.find(x => x[0] === k) || LS_SEC[LS_SEC.length - 1];
const lsGuess = name => { const W = norm(name).split(/[^a-z]+/).filter(Boolean); const s = LS_SEC.find(x => x[3] && x[3].split(' ').some(k => W.some(w => w.startsWith(k)))); return s ? s[0] : 'other'; };
const WISH_PRIO = [[1,'Must have'],[2,'Want'],[3,'Someday']];

function normalizeLs(s) {
  if (!s.ls || typeof s.ls !== 'object') s.ls = {};
  const L = s.ls;
  if (!Array.isArray(L.shop)) L.shop = [];
  if (!L.past || typeof L.past !== 'object' || Array.isArray(L.past)) L.past = {};   // name -> [times bought, section]
  if (!Array.isArray(L.wish)) L.wish = [];
  L.wish.forEach(w => { if (!Array.isArray(w.prices)) w.prices = []; if (!w.prio) w.prio = 2; });
  if (!['prio', 'price', 'drop', 'custom'].includes(L.sort)) L.sort = 'prio';
  if (typeof L.got !== 'number') L.got = 0;   // items checked off, for badges
}

/* ----- Shopping ----- */
function lsRow(x) {
  return swipeWrap(`<div class="pk${x.done ? ' done' : ''}"><button class="check sm" aria-pressed="${!!x.done}" data-act="lsToggle" data-id="${esc(x.id)}" aria-label="Got ${esc(x.name)}">${ICON_CHECK}</button>
    <span><b>${esc(x.name)}</b>${x.qty ? `<span class="small muted"> × ${esc(x.qty)}</span>` : ''}</span>
    <button class="link quiet" data-act="lsDel" data-id="${esc(x.id)}" aria-label="Remove ${esc(x.name)}">✕</button></div>`,
    {r:['lsToggle', x.done ? 'Undo' : 'Got it'], l:['lsDel', 'Delete'], data:{id:x.id}});
}
function viewLShop() {
  const L = S.ls.shop, open = L.filter(x => !x.done), got = L.filter(x => x.done);
  const again = Object.entries(S.ls.past).filter(([n]) => !L.some(x => norm(x.name) === n)).sort((a, b) => b[1][0] - a[1][0]).slice(0, 12);
  return `<section class="card"><form data-form="lsadd" class="field"><input class="input" name="name" placeholder="Add an item, like 2 dozen eggs" autocomplete="off" enterkeyhint="done" aria-label="Item"><button class="btn" type="submit">Add</button></form>
      ${again.length ? `<span class="label">Buy again</span><div class="chips">${again.map(([n, v]) => `<button class="chip" data-act="lsAgain" data-n="${esc(n)}">+ ${esc(v[2] || n)}</button>`).join('')}</div>` : ''}</section>
    ${open.length ? LS_SEC.filter(s => open.some(x => x.sec === s[0])).map(s => `<section class="card"><h3>${s[1]} ${esc(s[2])}</h3>${open.filter(x => x.sec === s[0]).map(lsRow).join('')}</section>`).join('')
      : L.length ? '<div class="empty"><h2>All done</h2><p>Everything is in the cart.</p></div>' : emptyCard('Your list is empty', 'Add what you need above. Hibi sorts it by store section for you.')}
    ${got.length ? `<details class="card" ${det('lsGot', true)}><summary class="sum"><h2>In the cart</h2><span class="small muted">${got.length}</span></summary>${got.map(lsRow).join('')}
      <button class="btn ghost block mt" data-act="lsClear">Clear ${plural(got.length, 'checked item')}</button></details>` : ''}
    ${L.length ? '<p class="note">Swipe right to check off, left to delete. Items you clear show up in Buy again.</p>' : ''}`;
}

/* ----- Wish list ----- */
const wPrice = w => w.prices.length ? w.prices[w.prices.length - 1].p : num(w.price);
const wLow = w => w.prices.length ? Math.min(...w.prices.map(x => x.p)) : wPrice(w);
const wFirst = w => w.prices.length ? w.prices[0] : null;
const cashW = a => '$' + (Math.round(a * 100) / 100).toLocaleString(undefined, {minimumFractionDigits:a % 1 ? 2 : 0, maximumFractionDigits:2});
function wSpark(w) {
  const P = w.prices.slice(-12); if (P.length < 2) return '';
  const vs = P.map(x => x.p), lo = Math.min(...vs), hi = Math.max(...vs), W = 120, H = 34, rng = hi - lo || 1;
  const pts = P.map((x, i) => `${(i * (W - 6) / (P.length - 1) + 3).toFixed(1)},${(H - 4 - (x.p - lo) / rng * (H - 8)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline points="${pts}"/></svg>`;
}
function wishCard(w) {
  const p = wPrice(w), f = wFirst(w), low = wLow(w), T = num(w.target), diff = f ? p - f.p : 0, hit = T && p && p <= T;
  const host = (() => { try { return w.url ? new URL(w.url).hostname.replace(/^www\./, '') : ''; } catch (e) { return ''; } })();
  return `<div class="wish${hit ? ' hit' : ''}" data-sid="${esc(w.id)}">${swipeWrap(`<details class="wish-in" ${det('wish-' + w.id)}><summary>
      ${S.ls.sort === 'custom' ? `<span class="grip" aria-label="Drag to reorder ${esc(w.name)}">⠿</span>` : ''}<span class="wish-em">${esc(w.em || '🎁')}</span>
      <div class="wmain"><b>${esc(w.name)}</b><span class="small muted">${esc(WISH_PRIO[w.prio - 1][1])}${host ? ' · ' + esc(host) : w.store ? ' · ' + esc(w.store) : ''}</span>
        ${diff ? `<span class="small" style="font-weight:800;color:${diff < 0 ? 'var(--good)' : 'var(--danger)'}">${diff < 0 ? '▼' : '▲'} ${cashW(Math.abs(diff))} since ${esc(fmtMD(keyDate(f.d)))}</span>` : ''}
        ${hit ? '<span class="small" style="font-weight:800;color:var(--good)">🎯 At or under your target price!</span>' : ''}</div>
      <div class="wprice">${p ? `<b>${cashW(p)}</b>` : '<span class="small muted">No price</span>'}${wSpark(w)}</div></summary>
    <div class="wish-body">
      ${w.prices.length ? `<div class="stats"><div class="stat"><b>${cashW(low)}</b><span>lowest seen</span></div><div class="stat"><b>${T ? cashW(T) : '–'}</b><span>your target</span></div><div class="stat"><b>${w.prices.length}</b><span>${w.prices.length === 1 ? 'price check' : 'price checks'}</span></div></div>` : ''}
      ${w.note ? `<p class="note">${esc(w.note)}</p>` : ''}
      <form data-form="wprice" class="field mt"><input type="hidden" name="id" value="${esc(w.id)}"><input class="input" name="p" inputmode="decimal" placeholder="Price today" aria-label="Price today"><button class="btn" type="submit">Log price</button></form>
      <div class="btns mt">${w.url ? `<a class="btn sm ghost" href="${esc(w.url)}" target="_blank" rel="noopener">🔗 Check price</a>` : ''}<button class="btn sm ghost" data-act="wSave" data-id="${esc(w.id)}">💰 Save for it</button><button class="btn sm" data-act="wGot" data-id="${esc(w.id)}">🎉 Got it</button></div>
      ${w.prices.length > 1 ? `<details class="mt" ${det('wph-' + w.id)}><summary class="link">Price history</summary>${[...w.prices].reverse().map((x, i) => `<div class="lrow"><span style="text-align:left;color:var(--ink)">${esc(fmtDay(x.d))}</span><span>${cashW(x.p)} <button class="link danger" data-act="wPDel" data-id="${esc(w.id)}" data-i="${w.prices.length - 1 - i}" aria-label="Delete this price">✕</button></span></div>`).join('')}</details>` : ''}
      <div class="row mt"><button class="link" data-act="wEdit" data-id="${esc(w.id)}">Edit</button><button class="link danger" data-act="wDel" data-id="${esc(w.id)}" data-confirm>Delete</button></div></div></details>`,
    {l:['wEdit', 'Edit'], data:{id:w.id}})}</div>`;
}
function wishSorted(L) {
  const s = S.ls.sort;
  if (s === 'custom') return L;
  if (s === 'price') return [...L].sort((a, b) => wPrice(a) - wPrice(b));
  if (s === 'drop') { const d = w => { const f = wFirst(w); return f && f.p ? (wPrice(w) - f.p) / f.p : 0; }; return [...L].sort((a, b) => d(a) - d(b)); }
  return [...L].sort((a, b) => a.prio - b.prio || (b.added || 0) - (a.added || 0));
}
function viewLWish() {
  const L = S.ls.wish.filter(w => !w.got), G = S.ls.wish.filter(w => w.got).sort((a, b) => b.got - a.got), ed = UI.edit && UI.edit.kind === 'wish' ? S.ls.wish.find(w => w.id === UI.edit.id) : null;
  const total = L.reduce((t, w) => t + wPrice(w), 0), drops = L.filter(w => { const f = wFirst(w); return f && wPrice(w) < f.p; }).length;
  return `${L.length ? `<section class="card"><div class="stats"><div class="stat"><b>${L.length}</b><span>${L.length === 1 ? 'item' : 'items'}</span></div><div class="stat"><b>${cash0(total)}</b><span>in total</span></div><div class="stat"><b>${drops}</b><span>${drops === 1 ? 'price drop' : 'price drops'}</span></div></div>
      <div class="chips mt">${[['prio','Priority'],['price','Cheapest'],['drop','Biggest drop'],['custom','My order']].map(([k, l]) => chip(l, S.ls.sort === k, `data-act="wSort" data-k="${k}"`)).join('')}</div></section>
    <div data-sort="wish">${wishSorted(L).map(wishCard).join('')}</div>
    <p class="note">Hibi can't check store prices on its own, because stores block apps from reading their pages. Tap Check price, then log what you see. Hibi keeps the history and shows when it drops. Swipe left on an item to edit it.</p>` : emptyCard('Nothing on your wish list', 'Add things you want, with a link and a target price. Log the price now and then to see when it drops.')}
    <details class="card" ${det('lsWishForm', !L.length || !!ed)}><summary class="sum"><h2>${ed ? 'Edit ' + esc(ed.name) : 'Add to wish list'}</h2></summary>
      <form data-form="wish" class="stack">
        <div class="field"><input class="input" name="em" value="${fval(ed, 'em') || '🎁'}" aria-label="Emoji" style="flex:0 0 58px;text-align:center;font-size:22px" maxlength="4"><input class="input" name="name" placeholder="What, like AirPods Pro" value="${fval(ed, 'name')}" aria-label="Item"></div>
        <input class="input" name="url" type="text" inputmode="url" placeholder="Link to it (optional)" value="${fval(ed, 'url')}" aria-label="Link" autocapitalize="off" autocorrect="off">
        <div class="ff"><label>Price now<input class="input" name="price" inputmode="decimal" placeholder="0.00" value="${ed ? esc(wPrice(ed) || '') : ''}"></label><label>Target price<input class="input" name="target" inputmode="decimal" placeholder="Optional" value="${ed && ed.target ? esc(ed.target) : ''}"></label></div>
        <div class="ff"><label>Priority<select class="input" name="prio">${WISH_PRIO.map(([v, l]) => opt(String(v), l, String(ed ? ed.prio : 2))).join('')}</select></label><label>Store<input class="input" name="store" placeholder="Optional" value="${fval(ed, 'store')}"></label></div>
        <input class="input" name="note" placeholder="Notes, like size or color (optional)" value="${fval(ed, 'note')}" aria-label="Notes">
        <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Add'}</button>${ed ? '<button class="btn ghost" type="button" data-act="cancelEdit">Cancel</button>' : ''}</div></form></details>
    ${G.length ? `<details class="card flat" ${det('wGot')}><summary class="sum"><h2>Got it</h2><span class="small muted">${G.length}</span></summary>${G.map(w => `<div class="lrow"><span style="text-align:left;color:var(--ink)">${esc(w.em || '🎁')} ${esc(w.name)}<small class="muted">${esc(fmtLong(w.got))}</small></span><span>${wPrice(w) ? cashW(wPrice(w)) : ''} <button class="link" data-act="wUngot" data-id="${esc(w.id)}">Undo</button></span></div>`).join('')}</details>` : ''}`;
}
const lsSubtitle = () => S.tab === 'lwish' ? (n => n ? `${plural(n, 'item')} you want` : 'Things you want, and their prices')(S.ls.wish.filter(w => !w.got).length)
  : (n => n ? `${n} left to get` : 'Nothing to buy')(S.ls.shop.filter(x => !x.done).length);

/* ----- Actions and forms ----- */
const wFind = id => S.ls.wish.find(w => w.id === id);
Object.assign(XVIEWS, {lshop:viewLShop, lwish:viewLWish});
Object.assign(FORM_KEY, {wish:'lsWishForm'});
function lsPush(name, qty) {
  const k = norm(name), past = S.ls.past[k], ex = S.ls.shop.find(x => norm(x.name) === k && !x.done);
  if (ex) { toast(`${ex.name} is already on your list.`); return; }
  S.ls.shop.push({id:'s' + Date.now() + Math.random().toString(36).slice(2, 5), name, qty:qty || '', sec:past && past[1] ? past[1] : lsGuess(name), done:false});
}
Object.assign(XACT, {
  lsToggle: d => { const x = S.ls.shop.find(i => i.id === d.id); if (!x) return false; x.done = !x.done; if (x.done) S.ls.got++; },
  lsDel: d => { S.ls.shop = S.ls.shop.filter(x => x.id !== d.id); },
  lsClear: () => { S.ls.shop.filter(x => x.done).forEach(x => { const k = norm(x.name), p = S.ls.past[k] || [0, x.sec, x.name]; S.ls.past[k] = [p[0] + 1, x.sec, x.name]; });
    const n = S.ls.shop.filter(x => x.done).length; S.ls.shop = S.ls.shop.filter(x => !x.done); toast(`Cleared ${plural(n, 'item')}.`); },
  lsAgain: d => { const p = S.ls.past[d.n]; lsPush(p && p[2] || d.n); },
  wSort: d => { S.ls.sort = d.k; if (d.k === 'custom') toast('Drag ⠿ to put them in your order.'); },
  wEdit: d => { UI.edit = {kind:'wish', id:d.id}; UI.open.lsWishForm = true; setTimeout(() => { const f = $('form[data-form="wish"]'); if (f) f.scrollIntoView({behavior:'smooth', block:'center'}); }, 60); },
  wDel: d => { S.ls.wish = S.ls.wish.filter(w => w.id !== d.id); },
  wGot: d => { const w = wFind(d.id); if (!w) return false; w.got = Date.now(); S.ls.got++; confetti(36); toast(`🎉 Enjoy your ${w.name}!`); },
  wUngot: d => { const w = wFind(d.id); if (w) w.got = 0; },
  wPDel: d => { const w = wFind(d.id); if (!w) return false; w.prices.splice(+d.i, 1); },
  wSave: d => { const w = wFind(d.id); if (!w) return false;
    const have = S.sv.goals.find(g => g.wish === w.id && live(g));
    if (have) { S.lastMode[S.mode] = S.tab; S.mode = 'save'; go('vgoals'); toast(`${have.name} is already a savings goal.`); return; }
    S.sv.goals.push({id:'v' + Date.now(), created:Date.now(), name:w.name, em:w.em || '🎁', target:wPrice(w) || num(w.target), date:'', link:w.url || '', notes:'From your wish list', dream:0, pct:0, jp:false, wish:w.id});
    S.lastMode[S.mode] = S.tab; S.mode = 'save'; go('vgoals'); toast(`Made a savings goal for ${w.name}.`); },
});
Object.assign(SAVE, {
  lsadd: o => {
    const raw = (o.name || '').trim(); if (!raw) return false;
    raw.split(/,|\n/).map(t => t.trim()).filter(Boolean).forEach(t => { const m = /^(\d+(?:\.\d+)?)\s*(?:x|×)?\s+((?:dozen|lbs?|pounds?|oz|kg|g|packs?|bags?|box(?:es)?|cans?|bottles?|gallons?|jars?|cartons?|loaf|loaves)\s+)?(.+)$/i.exec(t); lsPush(m ? m[3] : t, m ? (m[1] + (m[2] ? ' ' + m[2].trim() : '')) : ''); });
    setTimeout(() => { const i = $('form[data-form="lsadd"] input'); if (i) i.focus(); }, 30);
  },
  wprice: o => { const w = wFind(o.id), p = num(o.p); if (!w || !(p > 0)) { toast('Enter the price you see.'); return false; }
    const t = today(), f = wFirst(w), was = wPrice(w); w.prices = w.prices.filter(x => x.d !== t); w.prices.push({d:t, p});
    toast(num(w.target) && p <= num(w.target) && !(was && was <= num(w.target)) ? `🎯 ${w.name} hit your target price!` : f && p < f.p ? `▼ Down ${cashW(f.p - p)} since you started tracking.` : 'Price logged.'); },
  wish: o => {
    if (!o.name) { toast('Name the item first.'); return false; }
    let url = (o.url || '').trim(); if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    const ed = UI.edit && UI.edit.kind === 'wish' ? wFind(UI.edit.id) : null, p = num(o.price);
    const rec = {name:o.name, em:(o.em || '🎁').slice(0, 4), url, target:num(o.target), prio:+o.prio || 2, store:o.store || '', note:o.note || ''};
    if (ed) { Object.assign(ed, rec); if (p > 0 && p !== wPrice(ed)) { ed.prices = ed.prices.filter(x => x.d !== today()); ed.prices.push({d:today(), p}); } toast('Updated.'); }
    else { S.ls.wish.push(Object.assign(rec, {id:'x' + Date.now(), added:Date.now(), got:0, prices:p > 0 ? [{d:today(), p}] : []})); toast(`Added ${rec.name}.`); }
    UI.open.lsWishForm = false;
  }});
