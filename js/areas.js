// Hibi: Areas. Splits the saved data into areas and keeps each one in sync through Dropbox,
// so separate Hibi apps (one Home Screen icon per mode) share one set of data. Loads after dropbox.js.
'use strict';
/* =========================================================
   Every saved key belongs to exactly one area. Keys that aren't listed (the open tab, timers, backup times) stay on the phone.
   An app syncs the areas it uses (the full Hibi app syncs all of them, a solo app lists its own in SOLO_APPS in core.js).
   In Dropbox, each area is one file: /areas/<area>.json = {app, v, area, t, by, data:{key:value}}.
   ========================================================= */
const AREAS = {
  gym:['cardioV','cpick','cardio','unit','rest','wg','cats','ex','history','bw','j','sup','sl','wt','st','sp','tpl','rr','inc','bar','next'],
  japan:['jp'], media:['md'], games:['gm'], music:['mu'],
  school:['sc','pomo','fc','nb'], health:['hl'], lists:['ls'], work:['wk'], savings:['sv'],
  subs:['subs','subRemind','subSeen'], budget:['bg'],
  home:['home','ideas'], look:['look','fx','theme','themesUsed','hidden','order'],
  badges:['bd','sx'], recap:['alog','wrapSeen','wrapSince','wrapViewed']};
const AREA_LABEL = {gym:'Gym', japan:'Japan', media:'Shows & Books', games:'Games', music:'Music', school:'School', health:'Health', lists:'Lists', work:'Work', savings:'Savings', subs:'Subscriptions', budget:'Budget', home:'Home', look:'Look', badges:'Badges', recap:'Recaps'};
const appAreas = () => SOLO ? SOLO.areas.filter(a => AREAS[a]) : Object.keys(AREAS);
const areaText = a => { const o = {}; AREAS[a].forEach(k => { o[k] = S[k]; }); return JSON.stringify(o); };
// Per-phone sync notes (never part of a backup): AM.a[area] = {h: hash at last sync, rh: Dropbox hash at last sync, t: when that version was written, dt: when this phone's version changed}
let AM = (() => { try { return JSON.parse(localStorage.getItem('liftlog:areas') || '{}') || {}; } catch (e) { return {}; } })();
if (!AM.dev) AM.dev = Math.random().toString(36).slice(2, 7); if (!AM.a || typeof AM.a !== 'object') AM.a = {};
const amSave = () => { try { localStorage.setItem('liftlog:areas', JSON.stringify(AM)); } catch (e) {} };

async function areaRemote() {
  const out = {}; let r;
  try { r = await (await dbxCall('api', 'files/list_folder', {path:'/areas'})).json(); }
  catch (e) { if (e.status === 409) return out; throw e; }
  for (;;) {
    r.entries.forEach(f => { const m = /^(\w+)\.json$/.exec(f.name || ''); if (m && f['.tag'] === 'file') out[m[1]] = f; });
    if (!r.has_more) break;
    r = await (await dbxCall('api', 'files/list_folder/continue', {cursor:r.cursor})).json();
  }
  return out;
}
async function areaGet(a) {
  const j = JSON.parse(await dbxDown(`/areas/${a}.json`));
  if (!j || j.area !== a || !j.data || typeof j.data !== 'object') throw new Error('Not an area file');
  return j;
}
async function areaPut(a, text, t) {
  const res = await (await dbxUp(`/areas/${a}.json`, JSON.stringify({app:'hibi-area', v:1, area:a, t, by:AM.dev, data:JSON.parse(text)}))).json();
  return res.content_hash || '';
}
// Whichever version loses a clash is kept in Dropbox › conflicts, so nothing is ever thrown away
async function areaKeep(a, why, body) {
  try { const d = new Date(); await dbxUp(`/conflicts/${a}-${why}-${dk(d)}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}-${AM.dev}.json`, body); } catch (e) {}
}
const areaTyping = () => { const e = document.activeElement; return !!(e && /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)); };

// What an area looks like in a brand new app, so a fresh app's empty data isn't saved as a "safety copy"
const areaPristine = a => { try { const f = normalize(Object.assign(blank(), {})), o = {}; AREAS[a].forEach(k => { o[k] = f[k]; }); return JSON.stringify(o); } catch (e) { return ''; } };
let areaBusy = false;
// opts.first: 'remote' or 'local' decides a clash the first time this phone meets an area. Otherwise a solo app takes Dropbox's version and the full app keeps its own.
async function areaSync(opts) {
  if (!DBX.rt || DBX.ask || areaBusy) return 0;
  areaBusy = true;
  try {
    const remote = await areaRemote(), pulls = [], first0 = (opts && opts.first) || (SOLO ? 'remote' : 'local');
    for (const a of appAreas()) {
      const m = AM.a[a] = AM.a[a] || {}, text = areaText(a), h = hashStr(text), first = m.h === undefined, r = remote[a];
      const changed = !first && h !== m.h, rchg = !!r && r.content_hash !== m.rh;
      if (changed && !m.dt) m.dt = Date.now();
      const push = async () => { const t = Date.now(); m.rh = await areaPut(a, text, t); m.h = h; m.t = t; delete m.dt; };
      if (!r) {
        if (first && SOLO) { m.h = h; continue; }   // a brand new app has nothing worth sharing yet
        await push(); continue;
      }
      if (first) {
        if (first0 === 'remote') pulls.push({a, r, h, keep:true}); else { areaKeep(a, 'before-first-sync', await dbxDown(`/areas/${a}.json`)); await push(); }
        continue;
      }
      if (!changed && !rchg) continue;
      if (rchg && !changed) { pulls.push({a, r, h}); continue; }
      if (changed && !rchg) { await push(); continue; }
      const j = await areaGet(a);   // both sides changed: the newer change wins, the other is kept in Dropbox
      if (j.t > (m.dt || 0)) { areaKeep(a, 'this-phone', text); pulls.push({a, r, h, j}); }
      else { areaKeep(a, 'older', JSON.stringify(j)); await push(); }
    }
    let n = 0;
    if (pulls.length && !areaTyping()) {
      const got = [];
      for (const p of pulls) {
        if (hashStr(areaText(p.a)) !== p.h) continue;   // changed while we were talking to Dropbox: try again next time
        const j = p.j || await areaGet(p.a);
        if (p.keep && areaText(p.a) !== areaPristine(p.a)) areaKeep(p.a, 'before-first-pull', areaText(p.a));
        AREAS[p.a].forEach(k => { if (j.data[k] !== undefined) S[k] = j.data[k]; });
        got.push({p, j});
      }
      if (got.length) {
        S = normalize(S);
        got.forEach(({p, j}) => { const m = AM.a[p.a]; m.h = hashStr(areaText(p.a)); m.rh = p.r.content_hash; m.t = j.t || 0; delete m.dt; });
        n = got.length; saveRaw(); try { applyTheme(); if (typeof applyLook === 'function') applyLook(); } catch (e) {}
        render(); toast(`Updated ${got.map(x => AREA_LABEL[x.p.a] || x.p.a).join(', ')} from Dropbox.`);
      }
    }
    amSave(); return n;
  } finally { areaBusy = false; amSave(); }
}
// Checks Dropbox when you open the app, come back to it, and every minute while you're looking at it
setTimeout(() => { if (DBX.rt && !DBX.ask) dbxSync(); }, 1500);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && DBX.rt && !DBX.ask) setTimeout(() => dbxSync(), 400); });
setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine && DBX.rt && !DBX.ask && !dbxBusy) dbxSync(); }, 60000);
