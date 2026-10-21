// Hibi: Starts the app.
'use strict';
/* =========================================================
   Start
   ========================================================= */
applyTheme();
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
setTimeout(wrapCheck, 900);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(wrapCheck, 600); });
try { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').then(reg => { document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); }); }).catch(() => {}); } catch (e) {}
