// Hibi offline cache. Bump V with every release so phones download the new files together.
const V='hibi-v4.3.1',OCR='hibi-ocr',CORE=['./', 'index.html', 'manifest.webmanifest', 'CHANGELOG.md', 'hibi-icon-180.png', 'hibi-icon-512.png', 'css/hibi.css', 'js/crash.js', 'js/core.js', 'js/japan.js', 'js/media.js', 'js/games.js', 'js/savings.js', 'js/work.js', 'js/home-school.js', 'js/focus.js', 'js/cardio.js', 'js/music.js', 'js/health.js', 'js/lists.js', 'js/study.js', 'js/notebook.js', 'js/state.js', 'js/gym.js', 'js/badges.js', 'js/views.js', 'js/recap.js', 'js/widgets.js', 'js/motion.js', 'js/ideas.js', 'js/subs.js', 'js/budget.js', 'js/receipt.js', 'js/ocr-worker.js', 'js/app.js', 'js/data.js', 'js/look.js', 'js/events.js', 'js/touch.js', 'js/dropbox.js', 'js/main.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!==OCR).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
  const same=new URL(r.url).origin===self.location.origin;
  // Searches and other online lookups always go straight to the internet; only images, fonts and the app's own files are cached
  if(!same&&!['image','font','style'].includes(r.destination))return;
  e.respondWith(caches.match(r,{ignoreSearch:same}).then(hit=>{
    // The app's own files only change through a new version above, so they never mix old and new.
    if(hit&&same)return hit;
    const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(same&&r.url.includes('/vendor/ocr/')?OCR:V).then(c=>c.put(r,cp))}return res}).catch(()=>hit);
    return hit||net}))});
