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
  sleep:'hlsleep', shopping:'lshop', groceries:'lshop', wishlist:'lwish', wish:'lwish', subs:'vsubs', subscriptions:'vsubs', focus:'kfocus', homework:'kdue', flights:'jflights', budget:'bgo', spending:'btx', bills:'bbills', japanbudget:'jmoney', badges:'hbadges', weight:'body'};
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
HOME_READY = true; normalizeHome(S);
if (!openLink()) goHomeOnOpen();
window.addEventListener('hashchange', () => { if (openLink()) { save(); render(); scrollTo(0, 0); } });
render();
locked = !!S.pin; drawLock();
if (locked && S.faceId) setTimeout(() => { if (locked && FID_OK) faceUnlock(true); }, 400);
// Keeps the bottom bar on the bottom of what you can see. iPhone's browser can leave a fixed bar stranded mid-screen after scrolling or switching apps,
// so this measures it against the visible area and slides it back (it leaves the bar alone while you're typing, since the keyboard covers the bottom).
let navBusy = 0;
function navPin() {
  navBusy = 0;
  const n = $('#nav'), vv = window.visualViewport; if (!n || !vv || !n.offsetHeight) return;
  const ae = document.activeElement; if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
  const b = parseFloat(n.style.bottom) || 0, d = n.getBoundingClientRect().bottom - (vv.offsetTop + vv.height);
  if (Math.abs(d) > 1.5) n.style.bottom = (b + d) + 'px';
}
const navSoon = () => { if (!navBusy) navBusy = requestAnimationFrame(navPin); };
['scroll', 'resize', 'orientationchange', 'pageshow', 'focusin', 'touchend'].forEach(e => window.addEventListener(e, navSoon, {passive:true}));
document.addEventListener('visibilitychange', navSoon);
document.addEventListener('focusout', () => setTimeout(navSoon, 350));
if (window.visualViewport) { visualViewport.addEventListener('resize', navSoon); visualViewport.addEventListener('scroll', navSoon); }
setInterval(navSoon, 1000);
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
