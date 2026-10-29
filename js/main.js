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
// iPhone's Home Screen apps can lose track of the screen height after the keyboard closes, leaving the bottom bar stranded mid-screen.
// This compares the page's idea of the screen height with what's really visible and nudges the bar by the difference (it never adds up over time).
let NAVDBG = {}, navBusy = 0;
function navFix() {
  navBusy = 0;
  const n = $('#nav'), vv = window.visualViewport; if (!n || !vv) return;
  const ae = document.activeElement; if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
  let d = Math.round(vv.offsetTop + vv.height - innerHeight);
  NAVDBG = {inner:Math.round(innerHeight), visual:Math.round(vv.height), top:Math.round(vv.offsetTop), scale:+vv.scale.toFixed(2), screen:screen.height, y:Math.round(scrollY), d};
  if (Math.abs(d) < 2 || Math.abs(d) > 500 || Math.abs(vv.scale - 1) > .01) d = 0;
  n.style.transform = d ? `translateY(${d}px)` : '';
}
const navSoon = () => { if (!navBusy) navBusy = requestAnimationFrame(navFix); };
['scroll', 'resize', 'orientationchange', 'pageshow', 'touchend'].forEach(e => window.addEventListener(e, navSoon, {passive:true}));
document.addEventListener('visibilitychange', navSoon);
document.addEventListener('focusout', () => [150, 500, 1100].forEach(ms => setTimeout(() => { scrollTo(scrollX, scrollY + 1); scrollTo(scrollX, scrollY - 1 < 0 ? 0 : scrollY - 1); navSoon(); }, ms)));
if (window.visualViewport) { visualViewport.addEventListener('resize', navSoon); visualViewport.addEventListener('scroll', navSoon); }
setInterval(navSoon, 1500);
// Boxes that already hold a number (balances, what you owe) select it when you tap in, so typing replaces it instead of adding to it
document.addEventListener('focusin', e => { const t = e.target; if (t && t.matches && t.matches('input[data-sel]')) setTimeout(() => { try { t.select(); t.setSelectionRange(0, 9999); } catch (x) {} }, 0); });
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
