// Hibi: Starts the app.
'use strict';
/* =========================================================
   Start
   ========================================================= */
applyTheme();
// Open to Home (can be turned off in Home Settings)
function goHomeOnOpen() { if (!S.home || !S.home.startHome) return; if (S.mode !== 'home') S.lastMode[S.mode] = S.tab; S.mode = 'home'; go('hhome'); UI.homeEdit = false; UI.edit = null; }
goHomeOnOpen();
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
