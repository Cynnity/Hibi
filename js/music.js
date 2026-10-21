// Hibi: Music from stats.fm (top artists and tracks from the last 4 weeks), shown on Home and in Wrapped.
'use strict';
/* =========================================================
   Music (stats.fm)
   ========================================================= */
const SFM = 'https://api.stats.fm/api/v1';
let muBusy = false;
function normalizeMu(s) {
  if (!s.mu || typeof s.mu !== 'object') s.mu = {};
  if (typeof s.mu.user !== 'string') s.mu.user = '';
  if (!Array.isArray(s.mu.artists)) s.mu.artists = [];
  if (!Array.isArray(s.mu.tracks)) s.mu.tracks = [];
}
const sfmImg = x => (x && (x.image || (x.albums && x.albums[0] && x.albums[0].image))) || '';
async function sfmGet(path) {
  const r = await fetch(`${SFM}/users/${encodeURIComponent(S.mu.user)}${path}`);
  if (r.status === 404) throw Object.assign(new Error('not found'), {why:'user'});
  if (r.status === 403 || r.status === 401) throw Object.assign(new Error('private'), {why:'private'});
  if (!r.ok) throw new Error('stats.fm ' + r.status);
  return r.json();
}
async function muRefresh(manual) {
  if (!S.mu.user || muBusy) return;
  muBusy = true;
  try {
    const [a, t] = await Promise.all([sfmGet('/top/artists?range=weeks&limit=5'), sfmGet('/top/tracks?range=weeks&limit=5')]);
    S.mu.artists = (a.items || []).map(x => ({name:(x.artist && x.artist.name) || '', img:sfmImg(x.artist), streams:x.streams || 0})).filter(x => x.name);
    S.mu.tracks = (t.items || []).map(x => ({name:(x.track && x.track.name) || '', artist:((x.track && x.track.artists) || []).map(y => y.name).join(', '), img:sfmImg(x.track), streams:x.streams || 0})).filter(x => x.name);
    S.mu.at = Date.now(); S.mu.err = '';
    if (manual) toast('Music updated from stats.fm.');
  } catch (e) {
    S.mu.err = e.why === 'user' ? "Couldn't find that stats.fm username." : e.why === 'private' ? 'Your stats.fm profile is private. Make your top artists and tracks public in stats.fm settings.'
      : e instanceof TypeError ? "Couldn't reach stats.fm. You might be offline, or stats.fm may not let other apps read it." : "stats.fm didn't answer. Try again later.";
    S.mu.at = Date.now() - 5 * 36e5;   // try again in about an hour
    if (manual) toast(S.mu.err);
  }
  muBusy = false; saveRaw(); if (S.tab === 'hhome' || S.tab === 'settings') render();
}
function musicCard() {
  if (!S.mu.user) return '';
  if (Date.now() - (S.mu.at || 0) > 6 * 36e5) setTimeout(() => muRefresh(), 0);
  const A = S.mu.artists, T = S.mu.tracks;
  return `<section class="card"><div class="row"><h2>🎧 On repeat</h2><span class="small muted">Last 4 weeks</span></div>
    ${A.length ? `<div class="mu-art">${A.slice(0, 3).map((x, i) => `<div>${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="mu-ph">${esc(x.name[0])}</span>`}<b>${i + 1}. ${esc(x.name)}</b>${x.streams ? `<span class="small muted">${fmtN(x.streams)} plays</span>` : ''}</div>`).join('')}</div>` : ''}
    ${T.length ? T.slice(0, 3).map((x, i) => `<div class="mrow">${x.img ? `<img class="cover" style="width:46px;height:46px" src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<div><b>${i + 1}. ${esc(x.name)}</b><span class="small muted">${esc(x.artist)}</span></div></div>`).join('') : ''}
    ${!A.length && !T.length ? `<p class="note">${esc(S.mu.err || 'Loading your music from stats.fm…')}</p>` : S.mu.err ? `<p class="note">${esc(S.mu.err)}</p>` : ''}</section>`;
}
function musicSettings() {
  return `    <section class="card"><h2>Music (stats.fm)</h2>
      <p class="note">Show your top artists and songs from the last 4 weeks on Home and in Wrapped. Your stats.fm profile needs to be public.</p>
      <form data-form="mu" class="field mt"><input class="input" name="user" placeholder="stats.fm username" value="${esc(S.mu.user)}" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="stats.fm username"><button class="btn" type="submit">Save</button></form>
      ${S.mu.user ? `<div class="btns mt"><button class="btn sm ghost" data-act="muNow">Refresh now</button></div>${S.mu.err ? `<p class="note" style="color:var(--danger)">${esc(S.mu.err)}</p>` : S.mu.at ? `<p class="note">Last updated ${esc(fmtLong(S.mu.at))}.</p>` : ''}` : ''}</section>
`;
}
Object.assign(XACT, {muNow: () => { muRefresh(true); toast('Checking stats.fm…'); return false; }});
Object.assign(SAVE, {mu: o => { S.mu.user = (o.user || '').replace(/^.*stats\.fm\/(user\/)?/i, '').replace(/\/.*$/, '').trim(); S.mu.artists = []; S.mu.tracks = []; S.mu.at = 0; S.mu.err = '';
  if (S.mu.user) setTimeout(() => muRefresh(true), 0); else toast('Music turned off.'); }});
