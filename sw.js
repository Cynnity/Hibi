// Hibi offline cache. Bump V with every release so phones download the new files together.
const V='hibi-v1.7',CORE=['./', 'index.html', 'manifest.webmanifest', 'CHANGELOG.md', 'hibi-icon-180.png', 'hibi-icon-512.png', 'css/hibi.css', 'js/crash.js', 'js/core.js', 'js/japan.js', 'js/media.js', 'js/games.js', 'js/savings.js', 'js/home-school.js', 'js/cardio.js', 'js/state.js', 'js/gym.js', 'js/views.js', 'js/app.js', 'js/data.js', 'js/events.js', 'js/dropbox.js', 'js/main.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
  const same=new URL(r.url).origin===self.location.origin;
  e.respondWith(caches.match(r,{ignoreSearch:same}).then(hit=>{
    // The app's own files only change through a new version above, so they never mix old and new.
    if(hit&&same)return hit;
    const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>hit);
    return hit||net}))});
