// Hibi: Shows & Books mode.
'use strict';
/* =========================================================
   Shows & Books mode
   ========================================================= */
Object.assign(ICON, {
  play:'<circle cx="12" cy="12" r="8.5"/><path d="M10 8.8l5 3.2-5 3.2z"/>',
  shelf:'<path d="M5 4v16M9.5 4v16M14 5.5l4.5 14.5M3.5 20h17"/>',
  plus:'<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>'});
MODES.media = {label:'Shows & Books', em:'📚', nav:[['mnow','Now','play'],['mlib','Library','shelf'],['madd','Add','plus'],['mstats','Stats','progress'],['settings','Settings','settings']]};
Object.assign(TAB_INFO, {mnow:{g:'mnow',t:'Now'}, mlib:{g:'mlib',t:'Library'}, madd:{g:'madd',t:'Add'}, mstats:{g:'mstats',t:'Stats'}});
Object.assign(GROUPS, {mnow:['mnow'], mlib:['mlib'], madd:['madd'], mstats:['mstats']});
const MD_TYPES = [['anime','Anime','ep'],['show','TV show','ep'],['movie','Movie','ep'],['manga','Manga','ch'],['manhwa','Manhwa','ch'],['webtoon','Webtoon','ch'],['ln','Light novel','vol'],['book','Book','page']];
const MD_ST = [['now','In progress'],['plan','Want to start'],['hold','On hold'],['done','Finished'],['drop','Dropped']];
const MD_UNITS = {ep:['Episode','Ep'], ch:['Chapter','Ch'], vol:['Volume','Vol'], page:['Page','Page']};
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const isWatch = t => ['anime', 'show', 'movie'].includes(t);
const stLabel = (s, type) => s === 'now' ? (isWatch(type) ? 'Watching' : 'Reading') : (MD_ST.find(x => x[0] === s) || MD_ST[1])[1];
const typeLabel = t => (MD_TYPES.find(x => x[0] === t) || MD_TYPES[0])[1];
const unitOf = m => MD_UNITS[m.unit] || MD_UNITS.ep;
const hasDay = m => m.day !== '' && m.day != null;
const mFind = id => S.md.items.find(x => x.id === id);
let MQ = '';
function normalizeMd(s) {
  if (!s.md || typeof s.md !== 'object') s.md = {};
  if (!Array.isArray(s.md.items)) s.md.items = [];
  if (!s.md.count || typeof s.md.count !== 'object') s.md.count = {};
  if (!s.md.r10) { s.md.items.forEach(m => { if (m.rating) m.rating = Math.min(10, Math.round(num(m.rating) * 2)); }); s.md.r10 = 1; }   // stars (1-5) became a 1-10 ring in 1.7
  s.md.fs = s.md.fs || 'all'; s.md.ft = s.md.ft || 'all'; s.md.sort = s.md.sort || 'updated';
}
function progText(m) {
  if (m.type === 'movie') return m.status === 'done' ? 'Watched' : 'Not watched yet';
  return `${unitOf(m)[1]} ${m.prog || 0}${m.total ? ` of ${m.total}` : ''}`;
}
/* ----- 1 to 10 ring rating, shared by Shows & Books and Games ----- */
const ringColor = v => v >= 8 ? 'var(--good)' : v >= 5 ? '#E5A100' : 'var(--danger)';
function ring(v, size) {
  v = Math.max(0, Math.min(10, Math.round(num(v)))); size = size || 40;
  const r = 17, C = 2 * Math.PI * r;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 40 40" role="img" aria-label="${v ? `Rated ${v} out of 10` : 'Not rated'}">
    <circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--line)" stroke-width="4"/>
    ${v ? `<circle cx="20" cy="20" r="${r}" fill="none" stroke="${ringColor(v)}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(C * v / 10).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 20 20)"/>` : ''}
    <text x="20" y="21" text-anchor="middle" dominant-baseline="middle">${v || '–'}</text></svg>`;
}
// Tap a number to rate, tap it again to clear.
function rater(act, id, v) {
  return `<div class="rate-row">${ring(v, 56)}<div class="rater" role="group" aria-label="Rating out of 10">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i =>
    `<button class="${i === v ? 'on' : i < v ? 'in' : ''}" data-act="${act}" data-id="${esc(id)}" data-v="${i}" aria-label="Rate ${i} out of 10" aria-pressed="${i === v}">${i}</button>`).join('')}</div></div>`;
}
const stars = (m, interactive) => interactive ? rater('mRate', m.id, m.rating || 0) : ring(m.rating, 30);
function nowRow(m) {
  const pct = m.total ? Math.min(100, (m.prog || 0) / m.total * 100) : 0;
  return `<div class="mrow">${cover(m)}<div><b>${esc(m.title)}</b><span class="small muted">${progText(m)}${m.platform ? ', ' + esc(m.platform) : ''}${hasDay(m) ? `, new on ${DAYS[+m.day].slice(0, 3)}` : ''}</span>${airText(m) ? `<span class="small" style="display:block;color:var(--accent);font-weight:700">${airText(m)}</span>` : ''}
    ${m.total && m.type !== 'movie' ? `<div class="cbar"><i style="width:${pct}%"></i></div>` : ''}</div>
    ${m.type === 'movie' ? `<button class="btn sm" data-act="mDone" data-id="${esc(m.id)}">Watched</button>`
      : `<button class="btn sm" style="min-width:76px" data-act="mInc" data-id="${esc(m.id)}" aria-label="Add one ${unitOf(m)[0].toLowerCase()} to ${esc(m.title)}">+1 ${unitOf(m)[1]}</button>`}</div>`;
}
function viewMNow() {
  const I = S.md.items, dow = new Date().getDay();
  if (!airTried && Date.now() - (S.md.airAt || 0) > 3 * 36e5) { airTried = true; setTimeout(refreshAiring, 0); }
  if (!I.length) return emptyCard('Nothing here yet', 'Add a show, anime, manga or book and it shows up here.', 'Add one', 'data-act="go" data-to="madd"');
  const now = I.filter(m => live(m) && m.status === 'now').sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const airsToday = m => m.next && dk(new Date(m.next.at)) === today();
  const outToday = now.filter(m => (hasDay(m) && +m.day === dow) || airsToday(m)), plan = I.filter(m => live(m) && m.status === 'plan').sort((a, b) => (b.added || 0) - (a.added || 0)).slice(0, 4);
  return `${outToday.length ? `<section class="card"><h2>New today</h2><p class="note">Today: ${outToday.map(m => `<b>${esc(m.title)}</b>${airsToday(m) ? ` (Ep ${m.next.ep} at ${new Date(m.next.at).toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})})` : ''}`).join(', ')}.</p></section>` : ''}
    <section class="card"><h2>Continue</h2>${now.length ? now.map(nowRow).join('') : '<p class="note">Nothing in progress. Start something from your Want to start list.</p>'}</section>
    ${plan.length ? `<section class="card"><div class="row"><h2>Want to start</h2><button class="link" data-act="mFilter" data-s="plan">See all</button></div>
      ${plan.map(m => `<div class="mrow">${cover(m)}<div><b>${esc(m.title)}</b><span class="small muted">${typeLabel(m.type)}${m.platform ? ', ' + esc(m.platform) : ''}</span></div><button class="btn sm ghost" data-act="mStart" data-id="${esc(m.id)}">Start</button></div>`).join('')}</section>` : ''}`;
}
function mdList() {
  const fs = S.md.fs, ft = S.md.ft, q = norm(MQ), so = S.md.sort;
  const L = S.md.items.filter(m => (fs === 'arch' ? !!m.archived : !m.archived && (fs === 'all' || m.status === fs)) && (ft === 'all' || m.type === ft) && (!q || [m.title, m.notes, m.platform].some(v => norm(v || '').includes(q))));
  L.sort(so === 'title' ? (a, b) => a.title.localeCompare(b.title) : so === 'rating' ? (a, b) => (b.rating || 0) - (a.rating || 0) : (a, b) => (b.updated || 0) - (a.updated || 0));
  if (!L.length) return emptyCard(q ? 'No matches' : 'Nothing here yet', q ? 'Try another search.' : 'Add something from the Add tab, or pick a different filter.');
  return L.map(m => `<details class="card" ${det('m-' + m.id)}><summary class="sum"><div class="mhead">${cover(m)}<div><h3>${m.fav ? '❤️ ' : ''}${esc(m.title)}</h3>
      <span class="small muted">${typeLabel(m.type)}, ${stLabel(m.status, m.type)}${m.type !== 'movie' ? ', ' + progText(m) : ''}</span>${m.rating ? stars(m) : ''}</div></div></summary>
    ${m.total && m.type !== 'movie' ? `<div class="cbar"><i style="width:${Math.min(100, (m.prog || 0) / m.total * 100)}%"></i></div>` : ''}
    ${m.type !== 'movie' ? `<div class="btns mt"><button class="btn sm ghost" data-act="mDec" data-id="${esc(m.id)}" aria-label="Take one off">−1</button><button class="btn sm" data-act="mInc" data-id="${esc(m.id)}">+1 ${unitOf(m)[1]}</button></div>` : ''}
    <span class="label">Status</span><select class="input" data-bind="mstatus" data-id="${esc(m.id)}" aria-label="Status">${MD_ST.map(([k]) => opt(k, stLabel(k, m.type), m.status)).join('')}</select>
    <span class="label">Your rating</span>${stars(m, true)}
    ${m.platform ? `<p class="small mt">Where: <b>${esc(m.platform)}</b></p>` : ''}${m.season ? `<p class="small">Season or part: <b>${esc(m.season)}</b></p>` : ''}
    ${hasDay(m) ? `<p class="small">New ${unitOf(m)[0].toLowerCase()}s on ${DAYS[+m.day]}</p>` : ''}${m.notes ? `<p class="small muted mt">${esc(m.notes).replace(/\n/g, '<br>')}</p>` : ''}
    <div class="row mt"><button class="link" data-act="mEdit" data-id="${esc(m.id)}">Edit</button><button class="link" data-act="mFav" data-id="${esc(m.id)}">${m.fav ? 'Unfavorite' : 'Favorite'}</button>
      ${archBtn('media', m)}<button class="link danger" data-act="mDel" data-id="${esc(m.id)}" data-confirm>Delete</button></div></details>`).join('');
}
function viewMLib() {
  const I = S.md.items, counts = {}, types = [...new Set(I.map(m => m.type))];
  I.filter(live).forEach(m => { counts[m.status] = (counts[m.status] || 0) + 1; });
  return `<input class="input" id="mdSearch" type="search" placeholder="Search titles, notes or where" value="${esc(MQ)}" autocomplete="off" aria-label="Search">
    <div class="chips mt">${chip(`All ${I.filter(live).length}`, S.md.fs === 'all', 'data-act="mFilter" data-s="all"')}${MD_ST.map(([k, l]) => chip(`${l} ${counts[k] || 0}`, S.md.fs === k, `data-act="mFilter" data-s="${k}"`)).join('')}${I.some(m => m.archived) ? chip(`Archived ${I.filter(m => m.archived).length}`, S.md.fs === 'arch', 'data-act="mFilter" data-s="arch"') : ''}</div>
    ${types.length > 1 ? `<div class="chips mt">${chip('All types', S.md.ft === 'all', 'data-act="mType" data-t="all"')}${types.map(t => chip(typeLabel(t), S.md.ft === t, `data-act="mType" data-t="${t}"`)).join('')}</div>` : ''}
    <div class="row mt mb"><span class="small muted">Sort by</span><select class="input" style="width:auto" data-bind="msort" aria-label="Sort by">${opt('updated', 'Recently updated', S.md.sort)}${opt('title', 'Title', S.md.sort)}${opt('rating', 'Rating', S.md.sort)}</select></div>
    <div id="mdList">${mdList()}</div>`;
}
function viewMAdd() {
  const ed = UI.edit && UI.edit.kind === 'media' ? mFind(UI.edit.id) : null;
  return `<section class="card"><h2>${ed ? 'Edit ' + esc(ed.title) : 'Add a show or book'}</h2>
      <div class="field mt"><input class="input" id="mdQ" type="search" placeholder="Search for a cover and details" value="${ed ? esc(ed.title) : ''}" data-enter="mSearch" autocomplete="off" aria-label="Search for a title"><button class="btn" type="button" data-act="mSearch">Search</button></div>
      <p class="note">Set the type below first. Anime, manga, manhwa and light novels come from AniList, TV shows from TVmaze, and books from Open Library.</p>
      <div id="mdRes"></div>
      <div class="mhead mt" id="mdPicked">${ed && ed.img ? `${cover(ed, 'lg')}<button type="button" class="link danger" data-act="mNoCover">Remove cover</button>` : ''}</div>
      <form data-form="media" class="stack mt">
      <input type="hidden" name="img" value="${fval(ed, 'img')}"><input type="hidden" name="src" value="${fval(ed, 'src')}">
      <input class="input" name="title" placeholder="Title" value="${fval(ed, 'title')}" aria-label="Title">
      <div class="ff">
        <label>Type<select class="input" name="type">${MD_TYPES.map(([k, l]) => opt(k, l, ed ? ed.type : 'anime')).join('')}</select></label>
        <label>Status<select class="input" name="status">${MD_ST.map(([k, l]) => opt(k, l, ed ? ed.status : 'now')).join('')}</select></label>
        <label>Up to<input class="input" name="prog" inputmode="numeric" placeholder="0" value="${ed && ed.prog ? ed.prog : ''}"></label>
        <label>Out of<input class="input" name="total" inputmode="numeric" placeholder="Not sure" value="${ed && ed.total ? ed.total : ''}"></label>
        <label>Count by<select class="input" name="unit">${opt('', 'Match the type', ed ? '' : '')}${Object.entries(MD_UNITS).map(([k, v]) => opt(k, v[0] + 's', ed ? ed.unit : '')).join('')}</select></label>
        <label>Season or part<input class="input" name="season" placeholder="Season 2" value="${fval(ed, 'season')}"></label>
        <label>Where<input class="input" name="platform" placeholder="Crunchyroll" value="${fval(ed, 'platform')}"></label>
        <label>New ones on<select class="input" name="day">${opt('', 'No set day', ed && hasDay(ed) ? String(ed.day) : '')}${DAYS.map((d, i) => opt(String(i), d, ed && hasDay(ed) ? String(ed.day) : '')).join('')}</select></label></div>
      <textarea class="input" name="notes" style="min-height:80px" placeholder="Notes, like where you left off or who recommended it" aria-label="Notes">${fval(ed, 'notes')}</textarea>
      <label class="setrow"><span>Favorite</span><input type="checkbox" name="fav"${ed && ed.fav ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>
      <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Add'}</button>${ed ? '<button class="btn ghost" type="button" data-act="mCancel">Cancel</button>' : ''}</div></form></section>
    <p class="note">"On hold" is for things you stopped but plan to come back to. "Dropped" is for things you're done with.</p>`;
}
function viewMStats() {
  const I = S.md.items, y = new Date().getFullYear();
  if (!I.length) return emptyCard('No stats yet', 'Add a few shows or books to see your stats.', 'Add one', 'data-act="go" data-to="madd"');
  const c = s => I.filter(m => m.status === s).length, finY = I.filter(m => m.status === 'done' && m.finished && new Date(m.finished).getFullYear() === y).length;
  const top = I.filter(m => m.rating >= 8).sort((a, b) => b.rating - a.rating).slice(0, 8), favs = I.filter(m => m.fav);
  const byType = MD_TYPES.map(([k, l]) => [l, I.filter(m => m.type === k).length]).filter(x => x[1]), maxT = Math.max(1, ...byType.map(x => x[1]));
  return `<section class="card"><h2>Overview</h2>
      <div class="stats"><div class="stat"><b>${c('now')}</b><span>in progress</span></div><div class="stat"><b>${finY}</b><span>finished in ${y}</span></div><div class="stat"><b>${c('plan')}</b><span>want to start</span></div></div>
      <div class="stats"><div class="stat"><b>${short(S.md.count.ep || 0)}</b><span>episodes</span></div><div class="stat"><b>${short(S.md.count.ch || 0)}</b><span>chapters</span></div><div class="stat"><b>${c('hold')}</b><span>on hold</span></div></div>
      <p class="note">Episodes and chapters count every +1 you tap in this app.</p></section>
    <section class="card"><h2>By type</h2>${byType.map(([l, n]) => `<div class="crow"><div class="row"><b>${l}</b><span>${n}</span></div><div class="cbar"><i style="width:${n / maxT * 100}%"></i></div></div>`).join('')}</section>
    ${top.length ? `<section class="card"><h2>Top rated</h2>${top.map(m => `<div class="mrow">${cover(m)}<div><b>${esc(m.title)}</b>${stars(m)}</div></div>`).join('')}</section>` : ''}
    ${favs.length ? `<section class="card"><h2>Favorites</h2>${favs.map(m => `<div class="lrow"><b>❤️ ${esc(m.title)}</b><span>${typeLabel(m.type)}</span></div>`).join('')}</section>` : ''}`;
}
const MVIEWS = {mnow:viewMNow, mlib:viewMLib, madd:viewMAdd, mstats:viewMStats};
function finishMedia(m) { m.status = 'done'; m.finished = Date.now(); UI.open['m-' + m.id] = true; toast(`Finished ${m.title}! Rate it in Library.`); }
const MACT = {
  mInc: d => {
    const m = mFind(d.id); if (!m) return false;
    m.prog = (m.prog || 0) + 1; m.updated = Date.now(); S.md.count[m.unit] = (S.md.count[m.unit] || 0) + 1; logAct(m.unit, 1, m.id);
    if (m.status === 'plan' || m.status === 'hold' || m.status === 'drop') m.status = 'now';
    if (m.total && m.prog >= m.total && m.status !== 'done') finishMedia(m);
  },
  mDec: d => { const m = mFind(d.id); if (!m || !m.prog) return false; m.prog--; m.updated = Date.now(); S.md.count[m.unit] = Math.max(0, (S.md.count[m.unit] || 0) - 1); logAct(m.unit, -1, m.id); },
  mDone: d => { const m = mFind(d.id); if (!m) return false; m.prog = 1; m.total = 1; m.updated = Date.now(); finishMedia(m); },
  mStart: d => { const m = mFind(d.id); if (!m) return false; m.status = 'now'; m.updated = Date.now(); toast(`Started ${m.title}.`); },
  mRate: d => { const m = mFind(d.id); if (!m) return false; m.rating = m.rating === +d.v ? 0 : +d.v; },
  mFav: d => { const m = mFind(d.id); if (!m) return false; m.fav = !m.fav; },
  mDel: d => { S.md.items = S.md.items.filter(m => m.id !== d.id); },
  mEdit: d => { UI.edit = {kind:'media', id:d.id}; go('madd'); },
  mCancel: () => { UI.edit = null; go('mlib'); },
  mFilter: d => { S.md.fs = d.s; go('mlib'); },
  mType: d => { S.md.ft = d.t; },
};
Object.assign(SAVE, {
  media: o => {
    if (!o.title) { toast('Add a title first.'); return false; }
    const t = MD_TYPES.find(x => x[0] === o.type) || MD_TYPES[0];
    const rec = {title:o.title, type:t[0], status:o.status || 'now', prog:Math.max(0, Math.round(num(o.prog))), total:Math.max(0, Math.round(num(o.total))),
      unit:o.unit || t[2], img:o.img || '', src:o.src || '', season:o.season, platform:o.platform, day:o.day, notes:o.notes, fav:o.fav === 'on', updated:Date.now()};
    if (rec.type === 'movie') { rec.total = 1; rec.prog = rec.status === 'done' ? 1 : 0; }
    if (rec.status === 'done' && rec.total) rec.prog = Math.max(rec.prog, rec.total);
    const ed = UI.edit && UI.edit.kind === 'media' ? mFind(UI.edit.id) : null;
    if (ed) { if (rec.status === 'done' && ed.status !== 'done') rec.finished = Date.now(); Object.assign(ed, rec); toast('Updated.'); go('mlib'); }
    else { Object.assign(rec, {id:'m' + Date.now(), added:Date.now(), rating:0}); if (rec.status === 'done') rec.finished = Date.now(); S.md.items.push(rec); toast(`Added ${rec.title}.`); if (/^anilist:/.test(rec.src) && rec.type === 'anime') { S.md.airAt = 0; airTried = false; } }
  }});

/* ----- Covers: search AniList, TVmaze and Open Library ----- */
let MRES = [];
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const tile = (t, cls = '') => `<span class="cover ctile ${cls}" style="background:hsl(${hue(t)} 55% 52%)" aria-hidden="true">${esc((String(t).trim()[0] || '?').toUpperCase())}</span>`;
const cover = (m, cls = '') => m.img ? `<img class="cover ${cls}" src="${esc(m.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-t="${esc(m.title)}">` : tile(m.title, cls);
document.addEventListener('error', e => {
  const t = e.target;
  if (t && t.tagName === 'IMG' && t.classList.contains('cover')) t.outerHTML = tile(t.dataset.t || '?', t.classList.contains('lg') ? 'lg' : '');
}, true);
const ALQ = 'query($s:String,$t:MediaType){Page(perPage:8){media(search:$s,type:$t,sort:SEARCH_MATCH){id title{romaji english} format episodes chapters volumes countryOfOrigin startDate{year} coverImage{medium large}}}}';
function alType(m) {
  if (m.format === 'MOVIE') return 'movie';
  if (m.format === 'NOVEL') return 'ln';
  if (m.format === 'MANGA' || m.format === 'ONE_SHOT') return m.countryOfOrigin === 'KR' ? 'manhwa' : 'manga';
  return 'anime';
}
async function mdSearch(q, type) {
  if (type === 'show') {
    const d = await (await fetch('https://api.tvmaze.com/search/shows?q=' + encodeURIComponent(q))).json();
    return d.slice(0, 8).map(x => x.show).map(s => ({title:s.name, type:'show', total:0, unit:'ep', img:(s.image && s.image.medium) || '',
      year:s.premiered ? s.premiered.slice(0, 4) : '', platform:(s.network && s.network.name) || (s.webChannel && s.webChannel.name) || '', src:'tvmaze:' + s.id}));
  }
  if (type === 'book') {
    const d = await (await fetch('https://openlibrary.org/search.json?limit=8&fields=key,title,author_name,cover_i,number_of_pages_median,first_publish_year&q=' + encodeURIComponent(q))).json();
    return (d.docs || []).map(b => ({title:b.title, alt:(b.author_name || []).slice(0, 2).join(', '), type:'book', total:b.number_of_pages_median || 0, unit:'page',
      img:b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : '', year:b.first_publish_year || '', src:'ol:' + b.key}));
  }
  const r = await fetch('https://graphql.anilist.co', {method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json'},
    body:JSON.stringify({query:ALQ, variables:{s:q, t:(type === 'anime' || type === 'movie') ? 'ANIME' : 'MANGA'}})});
  const d = await r.json();
  return ((d.data && d.data.Page && d.data.Page.media) || []).map(m => {
    const t = alType(m), watch = t === 'anime' || t === 'movie';
    return {title:m.title.english || m.title.romaji, alt:m.title.english && m.title.romaji !== m.title.english ? m.title.romaji : '', type:t,
      total:(t === 'ln' ? m.volumes : watch ? m.episodes : m.chapters) || 0, unit:t === 'ln' ? 'vol' : watch ? 'ep' : 'ch',
      img:(m.coverImage && (m.coverImage.large || m.coverImage.medium)) || '', year:m.startDate && m.startDate.year, src:'anilist:' + m.id};
  });
}
Object.assign(MACT, {
  mSearch: () => {
    const q = $('#mdQ').value.trim(); if (!q) { toast('Type a title to search.'); return false; }
    const type = $('form[data-form="media"] [name="type"]').value, box = $('#mdRes');
    box.innerHTML = '<p class="note">Searching</p>';
    mdSearch(q, type).then(r => {
      MRES = r;
      box.innerHTML = r.length ? r.map((x, i) => `<button type="button" class="res" data-act="mPick" data-i="${i}">${cover(x)}<span><b>${esc(x.title)}</b>
        <span class="small muted" style="display:block">${[x.alt, typeLabel(x.type), x.year, x.total ? `${x.total} ${MD_UNITS[x.unit][0].toLowerCase()}s` : ''].filter(Boolean).map(v => esc(v)).join(', ')}</span></span></button>`).join('')
        : '<p class="note">No matches. Try a different spelling or another type, or fill it in by hand.</p>';
    }).catch(() => { box.innerHTML = '<p class="note">Search needs internet. You can still fill it in by hand.</p>'; });
    return false;
  },
  mPick: d => {
    const x = MRES[+d.i]; if (!x) return false;
    const f = $('form[data-form="media"]'), el = n => f.elements.namedItem(n);
    el('title').value = x.title; el('type').value = x.type; el('unit').value = '';
    if (x.total) el('total').value = x.total;
    if (x.platform && !el('platform').value) el('platform').value = x.platform;
    el('img').value = x.img || ''; el('src').value = x.src || '';
    $('#mdPicked').innerHTML = x.img ? `${cover(x, 'lg')}<span class="small muted">Cover added. Fill in the rest and save.</span>` : '<span class="small muted">No cover for this one, but the details are filled in.</span>';
    $('#mdRes').innerHTML = '';
    return false;
  },
  mNoCover: () => { const f = $('form[data-form="media"]'); f.elements.namedItem('img').value = ''; f.elements.namedItem('src').value = ''; $('#mdPicked').innerHTML = ''; return false; },
});

/* ----- AniList import and airing times ----- */
const AL_URL = 'https://graphql.anilist.co';
const AL_ST = {CURRENT:'now', REPEATING:'now', PLANNING:'plan', PAUSED:'hold', COMPLETED:'done', DROPPED:'drop'};
const AL_LIST = 'query($u:String,$t:MediaType){MediaListCollection(userName:$u,type:$t){lists{entries{status progress progressVolumes score(format:POINT_10) completedAt{year month day} media{id title{romaji english} format episodes chapters volumes countryOfOrigin coverImage{large medium} nextAiringEpisode{episode airingAt}}}}}}';
const alPost = (query, variables) => fetch(AL_URL, {method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json'}, body:JSON.stringify({query, variables})}).then(r => r.json());
async function importAniList(user) {
  const st = () => $('#alStatus');
  if (st()) st().textContent = 'Importing your lists';
  try {
    let added = 0, updated = 0;
    for (const t of ['ANIME', 'MANGA']) {
      const d = await alPost(AL_LIST, {u:user, t});
      if (d.errors && d.errors.length) {
        const msg = d.errors[0].message || '';
        throw new Error(/private/i.test(msg) ? 'That AniList profile is private. Make it public in AniList settings, then try again.' : /not found/i.test(msg) ? 'No AniList user with that name. Check the spelling.' : msg);
      }
      const lists = (d.data && d.data.MediaListCollection && d.data.MediaListCollection.lists) || [];
      lists.forEach(l => (l.entries || []).forEach(e => {
        const m = e.media, type = alType(m), watch = type === 'anime' || type === 'movie', src = 'anilist:' + m.id;
        const unit = watch ? 'ep' : type === 'ln' && e.progressVolumes ? 'vol' : 'ch';
        const c = e.completedAt || {}, finished = c.year ? new Date(c.year, (c.month || 1) - 1, c.day || 1).getTime() : null;
        const rec = {title:m.title.english || m.title.romaji, type, status:AL_ST[e.status] || 'plan', unit,
          prog:unit === 'vol' ? e.progressVolumes : (e.progress || 0), total:(unit === 'vol' ? m.volumes : unit === 'ep' ? m.episodes : m.chapters) || 0,
          img:(m.coverImage && (m.coverImage.large || m.coverImage.medium)) || '', src, rating:Math.round(e.score || 0),
          next:m.nextAiringEpisode ? {ep:m.nextAiringEpisode.episode, at:m.nextAiringEpisode.airingAt * 1000} : null};
        if (type === 'movie') { rec.total = 1; rec.prog = rec.status === 'done' ? 1 : 0; }
        const ex = S.md.items.find(x => x.src === src);
        if (ex) {
          Object.assign(ex, {status:rec.status, prog:rec.prog, unit:rec.unit, total:rec.total || ex.total, img:ex.img || rec.img, rating:rec.rating || ex.rating, next:rec.next});
          if (rec.status === 'done' && !ex.finished) ex.finished = finished || Date.now();
          updated++;
        } else {
          added++;
          S.md.items.push(Object.assign(rec, {id:'m' + m.id + '-' + Date.now().toString(36), added:Date.now(), updated:Date.now() - added, finished,
            platform:'', season:'', notes:'', fav:false, day:''}));
        }
      }));
    }
    S.md.airAt = Date.now(); save(); render();
    toast(`AniList: ${plural(added, 'new title')}, ${updated} updated.`);
  } catch (e) {
    const msg = e && e.message && !/fetch|network|load failed/i.test(e.message) ? e.message : 'Importing needs internet. Try again when you are online.';
    if (st()) st().textContent = msg; toast(msg);
  }
}
let airTried = false;
async function refreshAiring() {
  const ids = [...new Set(S.md.items.filter(m => m.type === 'anime' && m.status !== 'done' && m.status !== 'drop' && /^anilist:\d+$/.test(m.src || '')).map(m => +m.src.split(':')[1]))];
  if (!ids.length) return;
  try {
    const d = await alPost('query($ids:[Int]){Page(perPage:50){media(id_in:$ids,type:ANIME){id episodes nextAiringEpisode{episode airingAt}}}}', {ids:ids.slice(0, 50)});
    ((d.data && d.data.Page && d.data.Page.media) || []).forEach(x => S.md.items.filter(m => m.src === 'anilist:' + x.id).forEach(m => {
      m.next = x.nextAiringEpisode ? {ep:x.nextAiringEpisode.episode, at:x.nextAiringEpisode.airingAt * 1000} : null;
      if (x.episodes) m.total = x.episodes;
    }));
    S.md.airAt = Date.now(); save(); if (S.tab === 'mnow') render();
  } catch (e) {}
}
function fmtRel(ms) {
  const min = Math.round(ms / 6e4), h = Math.round(ms / 36e5), d = Math.round(ms / 864e5);
  return min < 60 ? `in ${min} min` : h < 24 ? `in ${h} ${h === 1 ? 'hour' : 'hours'}` : `in ${d} ${d === 1 ? 'day' : 'days'}`;
}
function airText(m) {
  if (!m.next) return '';
  const now = Date.now(), prog = m.prog || 0;
  if (m.next.at > now) {
    const behind = m.next.ep - 1 - prog;
    return `${behind > 0 ? `${behind} new ${behind === 1 ? 'episode' : 'episodes'} out. ` : ''}Ep ${m.next.ep} ${fmtRel(m.next.at - now)}`;
  }
  return prog < m.next.ep ? `Ep ${m.next.ep} is out` : '';
}

Object.assign(SAVE, {alimport: o => { if (!o.user) { toast('Type your AniList username.'); return false; } S.md.al = o.user; save(); importAniList(o.user); return false; }});
