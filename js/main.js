// Hibi: Starts the app.
'use strict';
/* =========================================================
   Start
   ========================================================= */
applyTheme();
// Open to Home (can be turned off in Home Settings)
function goHomeOnOpen() { if (!S.home || !S.home.startHome) return; if (S.mode !== 'home') S.lastMode[S.mode] = S.tab; S.mode = 'home'; go('hhome'); UI.homeEdit = false; UI.edit = null; }
// Links straight to a mode or screen: ?mode=gym, ?tab=jflights, #savings, #water
const LINK_ALIAS = {savings:'save', money:'save', goals:'save', shows:'media', books:'media', anime:'media', manga:'media', trip:'japan', tokyo:'japan', job:'work', habits:'hlhab', water:'hltoday',
  sleep:'hlsleep', shopping:'lshop', groceries:'lshop', wishlist:'lwish', wish:'lwish', subs:'vsubs', subscriptions:'vsubs', focus:'kfocus', homework:'kdue', flights:'jflights', budget:'jmoney', badges:'hbadges', weight:'body'};
function openLink() {
  let p; try { p = new URLSearchParams(location.search); } catch (e) { return false; }
  let want = (p.get('tab') || p.get('mode') || decodeURIComponent(location.hash.slice(1)) || '').trim().toLowerCase();
  if (!want) return false;
  want = LINK_ALIAS[want] || want;
  const tab = TAB_INFO[want] ? want : null, mode = MODES[want] ? want : tab ? (Object.keys(MODES).find(m => MODES[m].nav.some(n => n[0] === TAB_INFO[tab].g && n[0] !== 'settings')) || null) : null;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  if (!mode || !modeVisible(mode)) return false;
  if (S.mode !== mode) { S.lastMode[S.mode] = S.tab; S.mode = mode; }
  go(tab || (S.lastMode[mode] && TAB_INFO[S.lastMode[mode]] ? S.lastMode[mode] : firstTab(mode))); UI.homeEdit = false; return true;
}
if (!openLink()) goHomeOnOpen();
window.addEventListener('hashchange', () => { if (openLink()) { save(); render(); scrollTo(0, 0); } });
render();
locked = !!S.pin; drawLock();
if (locked && S.faceId) setTimeout(() => { if (locked && FID_OK) faceUnlock(true); }, 400);
setInterval(tick, 250);
loadPhotos();
if (DBX.rt && !DBX.ask) setTimeout(() => dbxSync(), 2500);
// Secret badge counters for opening the app
{ const n = new Date(), d = today(); if (!S.sx.opens.includes(d)) { S.sx.opens.push(d); S.sx.opens = S.sx.opens.slice(-60); }
  if (n.getHours() === 3) sxBump('am3'); if (n.getHours() === 11 && n.getMinutes() === 11) sxBump('wish'); if (n.getMonth() === 0 && n.getDate() === 1) sxBump('newyear');
  checkBadges(); saveRaw(); }
Crash.booted = true;
splashRun();
setTimeout(wrapCheck, 900);
let awayAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { awayAt = Date.now(); return; }
  // Coming back after 5+ minutes counts as opening the app again
  if (awayAt && Date.now() - awayAt > 5 * 6e4 && S.home.startHome && !UI.wrap && !document.querySelector('#sheet')) { goHomeOnOpen(); save(); render(); scrollTo(0, 0); }
  setTimeout(wrapCheck, 600);
});
try { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').then(reg => { document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); }); }).catch(() => {}); } catch (e) {}
