// Hibi: Games mode. Track what you play, hours, genres and a 1 to 10 rating. Search uses RAWG.
'use strict';
/* =========================================================
   Games mode
   ========================================================= */
Object.assign(ICON, {pad:'<path d="M7 9h10a4 4 0 0 1 4 4v1.5a2.5 2.5 0 0 1-4.5 1.5L15 14H9l-1.5 2A2.5 2.5 0 0 1 3 14.5V13a4 4 0 0 1 4-4z"/><path d="M8 11v3M6.5 12.5h3M15.5 12h.01M17.5 13.5h.01"/>'});
MODES.games = {label:'Games', em:'🎮', nav:[['gnow','Playing','pad'],['glib','Library','shelf'],['gadd','Add','plus'],['gstats','Stats','progress'],['settings','Settings','settings']]};
Object.assign(TAB_INFO, {gnow:{g:'gnow',t:'Playing'}, glib:{g:'glib',t:'Games'}, gadd:{g:'gadd',t:'Add a game'}, gstats:{g:'gstats',t:'Game stats'}});
Object.assign(GROUPS, {gnow:['gnow'], glib:['glib'], gadd:['gadd'], gstats:['gstats']});

// Free key from rawg.io/apidocs. It can also be set in Games settings.
const RAWG_KEY = '9ff87aa432d447259d851b4e474a4b60';
const rawgKey = () => (S.gm.key || RAWG_KEY || '').trim();
const GM_ST = [['now','Playing'],['plan','Want to play'],['hold','On hold'],['done','Beaten'],['full','100%'],['drop','Dropped']];
const GM_GENRES = ['Action','Adventure','RPG','Shooter','Platformer','Fighting','Racing','Sports','Strategy','Simulation','Puzzle','Horror','Roguelike','Souls-like','MOBA','Battle royale','Rhythm','Visual novel','Indie','Casual','Massively Multiplayer','Family'];
const GM_PLATS = ['PC','Steam Deck','PlayStation 5','PlayStation 4','Xbox Series X|S','Nintendo Switch','iPhone','Android'];
const gmSt = s => (GM_ST.find(x => x[0] === s) || GM_ST[1])[1];
const gFind = id => S.gm.items.find(x => x.id === id);
const gDone = g => g.status === 'done' || g.status === 'full';
const gCover = (g, lg) => cover(g, 'wide' + (lg ? ' lg' : ''));
const hrs = h => { h = num(h); return h ? `${fmtN(Math.round(h * 10) / 10)} h` : ''; };
let GQ = '', GRES = [];
function normalizeGm(s) {
  if (!s.gm || typeof s.gm !== 'object') s.gm = {};
  if (!Array.isArray(s.gm.items)) s.gm.items = [];
  s.gm.items.forEach(g => { if (!Array.isArray(g.genres)) g.genres = []; if (!Array.isArray(g.plats)) g.plats = []; });
  s.gm.fs = s.gm.fs || 'all'; s.gm.fg = s.gm.fg || 'all'; s.gm.sort = s.gm.sort || 'updated';
  if (typeof s.gm.key !== 'string') s.gm.key = '';
}
const allGenres = () => { const have = [...new Set(S.gm.items.flatMap(g => g.genres))]; return [...have, ...GM_GENRES.filter(x => !have.includes(x))]; };

/* ----- Rows and cards ----- */
function gNowRow(g) {
  return `<div class="mrow">${gCover(g)}<div><b>${esc(g.title)}</b><span class="small muted">${[g.plat, hrs(g.hours) || 'No hours yet'].filter(Boolean).map(esc).join(', ')}</span></div>
    <button class="btn sm" style="min-width:64px" data-act="gHrs" data-id="${esc(g.id)}" data-h="1" aria-label="Add an hour to ${esc(g.title)}">+1 h</button></div>`;
}
function gCard(g) {
  return `<details class="card" ${det('g-' + g.id)}><summary class="sum"><div class="gsum">${gCover(g)}<div><h3>${g.fav ? '❤️ ' : ''}${esc(g.title)}</h3>
      <span class="small muted">${[gmSt(g.status), g.genres.slice(0, 2).join(', '), hrs(g.hours)].filter(Boolean).map(esc).join(' · ')}</span></div>${g.rating ? ring(g.rating, 36) : ''}</div></summary>
    <span class="label">Status</span><select class="input" data-bind="gstatus" data-id="${esc(g.id)}" aria-label="Status">${GM_ST.map(([k, l]) => opt(k, l, g.status)).join('')}</select>
    <span class="label">Your rating</span>${rater('gRate', g.id, g.rating || 0)}
    <span class="label">Hours played: <b>${hrs(g.hours) || '0 h'}</b></span>
    <div class="btns"><button class="btn sm ghost" data-act="gHrs" data-id="${esc(g.id)}" data-h="-1">−1 h</button><button class="btn sm ghost" data-act="gHrs" data-id="${esc(g.id)}" data-h="0.5">+30 min</button><button class="btn sm" data-act="gHrs" data-id="${esc(g.id)}" data-h="1">+1 h</button></div>
    ${g.genres.length ? `<p class="small mt">Genres: <b>${esc(g.genres.join(', '))}</b></p>` : ''}
    ${g.plat ? `<p class="small">Playing on: <b>${esc(g.plat)}</b></p>` : ''}${g.year ? `<p class="small">Released: <b>${esc(g.year)}</b></p>` : ''}
    ${g.notes ? `<p class="small muted mt">${esc(g.notes).replace(/\n/g, '<br>')}</p>` : ''}
    <div class="row mt"><button class="link" data-act="gEdit" data-id="${esc(g.id)}">Edit</button><button class="link" data-act="gFav" data-id="${esc(g.id)}">${g.fav ? 'Unfavorite' : 'Favorite'}</button>
      ${archBtn('game', g)}<button class="link danger" data-act="gDel" data-id="${esc(g.id)}" data-confirm>Delete</button></div></details>`;
}

/* ----- Playing ----- */
function viewGNow() {
  const I = S.gm.items.filter(live);
  if (!I.length) return emptyCard('No games yet', 'Add what you\'re playing, what you\'ve beaten and what\'s in your backlog.', 'Add a game', 'data-act="go" data-to="gadd"');
  const now = I.filter(g => g.status === 'now').sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const plan = I.filter(g => g.status === 'plan').sort((a, b) => (b.added || 0) - (a.added || 0)).slice(0, 4);
  const recent = I.filter(gDone).sort((a, b) => (b.finished || 0) - (a.finished || 0)).slice(0, 3);
  return `<section class="card"><h2>Playing now</h2>${now.length ? now.map(gNowRow).join('') : '<p class="note">Nothing in progress. Start something from your backlog.</p>'}</section>
    ${plan.length ? `<section class="card"><div class="row"><h2>Want to play</h2><button class="link" data-act="gFilter" data-s="plan">See all</button></div>
      ${plan.map(g => `<div class="mrow">${gCover(g)}<div><b>${esc(g.title)}</b><span class="small muted">${esc(g.genres.slice(0, 2).join(', ') || 'Game')}</span></div><button class="btn sm ghost" data-act="gStart" data-id="${esc(g.id)}">Start</button></div>`).join('')}</section>` : ''}
    ${recent.length ? `<section class="card"><h2>Recently beaten</h2>${recent.map(g => `<div class="mrow">${gCover(g)}<div><b>${esc(g.title)}</b><span class="small muted">${[gmSt(g.status), hrs(g.hours)].filter(Boolean).join(', ')}</span></div>${g.rating ? ring(g.rating, 36) : `<button class="link" data-act="gOpen" data-id="${esc(g.id)}">Rate</button>`}</div>`).join('')}</section>` : ''}`;
}

/* ----- Library ----- */
function gList() {
  const fs = S.gm.fs, fg = S.gm.fg, so = S.gm.sort, q = norm(GQ);
  const L = S.gm.items.filter(g => (fs === 'arch' ? !!g.archived : !g.archived && (fs === 'all' || g.status === fs)) && (fg === 'all' || g.genres.includes(fg))
    && (!q || [g.title, g.notes, g.plat, g.genres.join(' ')].some(v => norm(v || '').includes(q))));
  if (!L.length) return emptyCard(q ? 'No matches' : 'Nothing here', q ? 'Try another search.' : 'Pick a different filter, or add a game.');
  const by = {title:(a, b) => a.title.localeCompare(b.title), rating:(a, b) => (b.rating || 0) - (a.rating || 0) || a.title.localeCompare(b.title),
    hours:(a, b) => num(b.hours) - num(a.hours), year:(a, b) => String(b.year || '').localeCompare(String(a.year || '')), updated:(a, b) => (b.updated || 0) - (a.updated || 0)};
  if (so !== 'genre') return L.sort(by[so] || by.updated).map(gCard).join('');
  // Sort by genre: group under each game's main genre, biggest groups first
  const groups = {}; L.forEach(g => { const k = g.genres[0] || 'No genre'; (groups[k] = groups[k] || []).push(g); });
  return Object.entries(groups).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([k, gs]) => `<h2 class="gsec">${esc(k)} <span class="small muted">${gs.length}</span></h2>${gs.sort(by.rating).map(gCard).join('')}`).join('');
}
function viewGLib() {
  const I = S.gm.items, counts = {}, genres = [...new Set(I.filter(live).flatMap(g => g.genres))].sort();
  I.filter(live).forEach(g => { counts[g.status] = (counts[g.status] || 0) + 1; });
  return `<input class="input" id="gmSearch" type="search" placeholder="Search games, genres or platforms" value="${esc(GQ)}" autocomplete="off" aria-label="Search games">
    <div class="chips mt">${chip(`All ${I.filter(live).length}`, S.gm.fs === 'all', 'data-act="gFilter" data-s="all"')}${GM_ST.filter(([k]) => counts[k]).map(([k, l]) => chip(`${l} ${counts[k]}`, S.gm.fs === k, `data-act="gFilter" data-s="${k}"`)).join('')}${I.some(g => g.archived) ? chip(`Archived ${I.filter(g => g.archived).length}`, S.gm.fs === 'arch', 'data-act="gFilter" data-s="arch"') : ''}</div>
    ${genres.length ? `<div class="chips mt">${chip('All genres', S.gm.fg === 'all', 'data-act="gGenreF" data-g="all"')}${genres.map(x => chip(x, S.gm.fg === x, `data-act="gGenreF" data-g="${esc(x)}"`)).join('')}</div>` : ''}
    <div class="row mt mb"><span class="small muted">Sort by</span><select class="input" style="width:auto" data-bind="gsort" aria-label="Sort by">${[['updated', 'Recently updated'], ['genre', 'Genre'], ['rating', 'Rating'], ['hours', 'Hours played'], ['title', 'Title'], ['year', 'Release year']].map(([k, l]) => opt(k, l, S.gm.sort)).join('')}</select></div>
    <div id="gmList">${gList()}</div>`;
}

/* ----- Add or edit ----- */
function viewGAdd() {
  const ed = UI.edit && UI.edit.kind === 'game' ? gFind(UI.edit.id) : null, gen = ed ? ed.genres : [];
  const plats = [...new Set([...(ed ? ed.plats : []), ...GM_PLATS])];
  return `<section class="card"><h2>${ed ? 'Edit ' + esc(ed.title) : 'Add a game'}</h2>
      <div class="field mt"><input class="input" id="gmQ" type="search" placeholder="Search for a game" value="${ed ? esc(ed.title) : ''}" data-enter="gSearch" autocomplete="off" aria-label="Search for a game"><button class="btn" type="button" data-act="gSearch">Search</button></div>
      <p class="note">${rawgKey() ? 'Finds the cover, genres, platforms and release year. Game data from <a href="https://rawg.io" target="_blank" rel="noopener">RAWG</a>.' : 'Game search needs a free RAWG key. Add it in Settings. You can still fill games in by hand.'}</p>
      <div id="gmRes"></div>
      <div class="mhead mt" id="gmPicked">${ed && ed.img ? `${gCover(ed, true)}<button type="button" class="link danger" data-act="gNoCover">Remove cover</button>` : ''}</div>
      <form data-form="game" class="stack mt">
      <input type="hidden" name="img" value="${fval(ed, 'img')}"><input type="hidden" name="src" value="${fval(ed, 'src')}">
      <input type="hidden" name="genres" value="${esc(gen.join('|'))}"><input type="hidden" name="plats" value="${esc((ed ? ed.plats : []).join('|'))}">
      <input class="input" name="title" placeholder="Title" value="${fval(ed, 'title')}" aria-label="Title">
      <div class="ff">
        <label>Status<select class="input" name="status">${GM_ST.map(([k, l]) => opt(k, l, ed ? ed.status : 'now')).join('')}</select></label>
        <label>Hours played<input class="input" name="hours" inputmode="decimal" placeholder="0" value="${ed && ed.hours ? esc(ed.hours) : ''}"></label>
        <label>Playing on<input class="input" name="plat" list="gmPlats" placeholder="PC" value="${fval(ed, 'plat')}"></label>
        <label>Release year<input class="input" name="year" inputmode="numeric" placeholder="2024" value="${fval(ed, 'year')}"></label></div>
      <datalist id="gmPlats">${plats.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      <span class="label">Genres</span><div class="chips" id="gmGenres">${[...new Set([...gen, ...allGenres()])].map(x => chip(x, gen.includes(x), `data-act="gGenre" data-g="${esc(x)}"`)).join('')}</div>
      <div class="field"><input class="input" id="gmNewGenre" placeholder="Add another genre" autocomplete="off" data-enter="gGenreAdd" aria-label="Add a genre"><button class="btn ghost" type="button" data-act="gGenreAdd">Add</button></div>
      <textarea class="input" name="notes" style="min-height:80px" placeholder="Notes, like where you left off or who you play with" aria-label="Notes">${fval(ed, 'notes')}</textarea>
      <label class="setrow"><span>Favorite</span><input type="checkbox" name="fav"${ed && ed.fav ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>
      <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Add game'}</button>${ed ? '<button class="btn ghost" type="button" data-act="gCancel">Cancel</button>' : ''}</div></form></section>
    <p class="note">Beaten means you finished the story. 100% means you did everything.</p>`;
}

/* ----- Stats ----- */
function viewGStats() {
  const I = S.gm.items, y = new Date().getFullYear();
  if (!I.length) return emptyCard('No stats yet', 'Add a few games to see your stats.', 'Add a game', 'data-act="go" data-to="gadd"');
  const c = s => I.filter(g => g.status === s).length, beatY = I.filter(g => gDone(g) && g.finished && new Date(g.finished).getFullYear() === y).length;
  const rated = I.filter(g => g.rating), avg = rated.length ? Math.round(rated.reduce((t, g) => t + g.rating, 0) / rated.length * 10) / 10 : 0;
  const total = I.reduce((t, g) => t + num(g.hours), 0);
  const gStats = {}; I.forEach(g => g.genres.forEach(x => { const o = gStats[x] = gStats[x] || {n:0, r:0, rn:0, h:0}; o.n++; o.h += num(g.hours); if (g.rating) { o.r += g.rating; o.rn++; } }));
  const byGenre = Object.entries(gStats).sort((a, b) => b[1].n - a[1].n).slice(0, 10), maxG = Math.max(1, ...byGenre.map(x => x[1].n));
  const top = I.filter(g => g.rating >= 8).sort((a, b) => b.rating - a.rating || num(b.hours) - num(a.hours)).slice(0, 8);
  const most = I.filter(g => num(g.hours)).sort((a, b) => num(b.hours) - num(a.hours)).slice(0, 5);
  return `<section class="card"><h2>Overview</h2>
      <div class="stats"><div class="stat"><b>${c('now')}</b><span>playing</span></div><div class="stat"><b>${beatY}</b><span>beaten in ${y}</span></div><div class="stat"><b>${c('plan')}</b><span>backlog</span></div></div>
      <div class="stats"><div class="stat"><b>${short(Math.round(total))}</b><span>hours played</span></div><div class="stat"><b>${c('full')}</b><span>at 100%</span></div><div class="stat"><b>${I.length}</b><span>games</span></div></div>
      ${rated.length ? `<div class="rate-row mt">${ring(Math.round(avg), 56)}<p class="note" style="margin:0">Your average rating is <b>${fmtN(avg)}</b> across ${plural(rated.length, 'game')}.</p></div>` : ''}</section>
    ${byGenre.length ? `<section class="card"><h2>By genre</h2>${byGenre.map(([x, o]) => `<div class="crow"><div class="row"><b>${esc(x)}</b><span>${o.n}${o.rn ? ` · avg ${fmtN(Math.round(o.r / o.rn * 10) / 10)}` : ''}${o.h ? ` · ${hrs(o.h)}` : ''}</span></div><div class="cbar"><i style="width:${o.n / maxG * 100}%"></i></div></div>`).join('')}</section>` : ''}
    ${top.length ? `<section class="card"><h2>Top rated</h2>${top.map(g => `<div class="mrow">${gCover(g)}<div><b>${esc(g.title)}</b><span class="small muted">${esc(g.genres.slice(0, 2).join(', '))}</span></div>${ring(g.rating, 40)}</div>`).join('')}</section>` : ''}
    ${most.length ? `<section class="card"><h2>Most played</h2>${most.map(g => `<div class="lrow"><b>${esc(g.title)}</b><span>${hrs(g.hours)}</span></div>`).join('')}</section>` : ''}`;
}
function gmSettings() {
  return `    <section class="card"><h2>Game search</h2>
      <p class="note">Covers, genres and platforms come from RAWG. ${RAWG_KEY ? 'Hibi already has a key, so you only need this if search stops working.' : 'Get a free key at rawg.io/apidocs and paste it here.'}</p>
      <form data-form="gmkey" class="field mt"><input class="input" name="key" placeholder="${RAWG_KEY ? 'Using the built-in key' : 'RAWG API key'}" value="${esc(S.gm.key)}" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="RAWG API key"><button class="btn" type="submit">Save</button></form></section>
`;
}
Object.assign(MVIEWS, {gnow:viewGNow, glib:viewGLib, gadd:viewGAdd, gstats:viewGStats});

/* ----- Search (RAWG) ----- */
const rawgImg = u => u ? u.replace('/media/games/', '/media/crop/600/400/games/').replace('/media/screenshots/', '/media/crop/600/400/screenshots/') : '';
async function rawgSearch(q) {
  const k = rawgKey(); if (!k) throw Object.assign(new Error('no key'), {nokey:true});
  const r = await fetch(`https://api.rawg.io/api/games?key=${encodeURIComponent(k)}&page_size=10&search=${encodeURIComponent(q)}`);
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('bad key'), {nokey:true});
  const d = await r.json();
  return (d.results || []).map(x => ({title:x.name, img:rawgImg(x.background_image), year:x.released ? x.released.slice(0, 4) : '',
    genres:(x.genres || []).map(g => g.name === 'Role Playing Games' || g.name === 'RPG' ? 'RPG' : g.name), plats:(x.platforms || []).map(p => p.platform && p.platform.name).filter(Boolean), src:'rawg:' + x.id}));
}
function gSetGenres(list) {
  const f = $('form[data-form="game"]'); if (!f) return;
  f.elements.namedItem('genres').value = list.join('|');
  $('#gmGenres').innerHTML = [...new Set([...list, ...allGenres()])].map(x => chip(x, list.includes(x), `data-act="gGenre" data-g="${esc(x)}"`)).join('');
}
const gFormGenres = () => { const f = $('form[data-form="game"]'); const v = f ? f.elements.namedItem('genres').value : ''; return v ? v.split('|') : []; };

/* ----- Actions ----- */
function gTouch(g) { g.updated = Date.now(); }
Object.assign(MACT, {
  gHrs: d => { const g = gFind(d.id); if (!g) return false; g.hours = Math.max(0, Math.round((num(g.hours) + num(d.h)) * 10) / 10); if (num(d.h) > 0 && (g.status === 'plan' || g.status === 'hold')) g.status = 'now'; gTouch(g); },
  gRate: d => { const g = gFind(d.id); if (!g) return false; g.rating = g.rating === +d.v ? 0 : +d.v; },
  gStart: d => { const g = gFind(d.id); if (!g) return false; g.status = 'now'; gTouch(g); toast(`Started ${g.title}. Have fun!`); },
  gFav: d => { const g = gFind(d.id); if (!g) return false; g.fav = !g.fav; },
  gDel: d => { S.gm.items = S.gm.items.filter(g => g.id !== d.id); },
  gEdit: d => { UI.edit = {kind:'game', id:d.id}; go('gadd'); },
  gOpen: d => { UI.open['g-' + d.id] = true; S.gm.fs = 'all'; go('glib'); },
  gCancel: () => { UI.edit = null; go('glib'); },
  gFilter: d => { S.gm.fs = d.s; go('glib'); },
  gGenreF: d => { S.gm.fg = d.g; },
  gGenre: d => { const L = gFormGenres(); const i = L.indexOf(d.g); i >= 0 ? L.splice(i, 1) : L.push(d.g); gSetGenres(L); return false; },
  gGenreAdd: () => { const el = $('#gmNewGenre'), v = (el.value || '').trim(); if (!v) return false; const L = gFormGenres(); if (!L.includes(v)) L.push(v); gSetGenres(L); el.value = ''; return false; },
  gSearch: () => {
    const q = $('#gmQ').value.trim(), box = $('#gmRes'); if (!q) { toast('Type a game to search.'); return false; }
    box.innerHTML = '<p class="note">Searching</p>';
    rawgSearch(q).then(r => {
      GRES = r;
      box.innerHTML = r.length ? r.map((x, i) => `<button type="button" class="res" data-act="gPick" data-i="${i}">${gCover(x)}<span><b>${esc(x.title)}</b>
        <span class="small muted" style="display:block">${[x.year, x.genres.slice(0, 3).join(', ')].filter(Boolean).map(esc).join(' · ')}</span></span></button>`).join('')
        : '<p class="note">No matches. Try a different spelling, or fill it in by hand.</p>';
    }).catch(e => { box.innerHTML = `<p class="note">${e.nokey ? 'Game search needs a working RAWG key. Add it in Settings.' : 'Search needs internet. You can still fill it in by hand.'}</p>`; });
    return false;
  },
  gPick: d => {
    const x = GRES[+d.i]; if (!x) return false;
    const f = $('form[data-form="game"]'), el = n => f.elements.namedItem(n);
    el('title').value = x.title; el('img').value = x.img || ''; el('src').value = x.src || ''; el('plats').value = x.plats.join('|');
    if (x.year) el('year').value = x.year;
    $('#gmPlats').innerHTML = [...new Set([...x.plats, ...GM_PLATS])].map(p => `<option value="${esc(p)}">`).join('');
    gSetGenres(x.genres);
    $('#gmPicked').innerHTML = x.img ? `${gCover(x, true)}<span class="small muted">Cover and genres added. Fill in the rest and save.</span>` : '<span class="small muted">No cover for this one, but the details are filled in.</span>';
    $('#gmRes').innerHTML = '';
    return false;
  },
  gNoCover: () => { const f = $('form[data-form="game"]'); f.elements.namedItem('img').value = ''; $('#gmPicked').innerHTML = ''; return false; },
});
Object.assign(SAVE, {
  game: o => {
    if (!o.title) { toast('Add a title first.'); return false; }
    const rec = {title:o.title, status:o.status || 'now', hours:Math.max(0, Math.round(num(o.hours) * 10) / 10), plat:o.plat || '', year:o.year || '',
      genres:o.genres ? o.genres.split('|').filter(Boolean) : [], plats:o.plats ? o.plats.split('|').filter(Boolean) : [], img:o.img || '', src:o.src || '', notes:o.notes || '', fav:o.fav === 'on', updated:Date.now()};
    const ed = UI.edit && UI.edit.kind === 'game' ? gFind(UI.edit.id) : null;
    if (ed) { if (gDone(rec) && !gDone(ed)) rec.finished = Date.now(); Object.assign(ed, rec); toast('Updated.'); go('glib'); }
    else {
      if (S.gm.items.some(g => norm(g.title) === norm(rec.title) && !g.archived)) { toast(`${rec.title} is already in your games.`); return false; }
      Object.assign(rec, {id:'g' + Date.now(), added:Date.now(), rating:0}); if (gDone(rec)) rec.finished = Date.now();
      S.gm.items.push(rec); toast(`Added ${rec.title}.`); go(rec.status === 'now' ? 'gnow' : 'glib');
    }
  },
  gmkey: o => { S.gm.key = o.key || ''; toast(o.key ? 'RAWG key saved.' : 'Key cleared.'); },
});
