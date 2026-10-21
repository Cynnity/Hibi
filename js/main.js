// Hibi: Starts the app.
'use strict';
/* =========================================================
   Start
   ========================================================= */
applyTheme();
render();
locked = !!S.pin; drawLock();
setInterval(tick, 250);
loadPhotos();
if (DBX.rt && !DBX.ask) setTimeout(() => dbxSync(), 2500);
Crash.booted = true;
try { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').then(reg => { document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); }); }).catch(() => {}); } catch (e) {}
