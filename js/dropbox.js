// Hibi: Dropbox auto backup of data, photos and crash reports.
'use strict';
/* =========================================================
   Dropbox auto backup (data and progress photos)
   Tokens live in their own localStorage key and are never part of a backup file.
   ========================================================= */
const DBX_KEY = 'nrc9jvlk2pgrkiv', DBX_STORE = 'liftlog:dbx';
let DBX = (() => { try { return JSON.parse(localStorage.getItem(DBX_STORE) || '{}') || {}; } catch (e) { return {}; } })();
let dbxBusy = false, dbxTimer = null, dbxAgain = false, dbxMsg = '';
const dbxSave = () => { try { localStorage.setItem(DBX_STORE, JSON.stringify(DBX)); } catch (e) {} };
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const asciiJson = o => JSON.stringify(o).replace(/[\u007f-￿]/g, c => '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4));
const hashStr = t => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return t.length + ':' + h; };
const ago = t => { const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : fmtMD(new Date(t)); };
async function dbxPrep() {
  if (DBX.url || !(window.crypto && crypto.subtle)) return;
  const v = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const ch = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));
  DBX.pkce = v; DBX.url = `https://www.dropbox.com/oauth2/authorize?client_id=${DBX_KEY}&response_type=code&code_challenge=${ch}&code_challenge_method=S256&token_access_type=offline`;
  dbxSave(); if (S.tab === 'settings') render();
}
async function dbxToken(p) {
  const r = await fetch('https://api.dropboxapi.com/oauth2/token', {method:'POST', body:new URLSearchParams(Object.assign({client_id:DBX_KEY}, p))});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error_description || j.error || 'Dropbox error'); e.auth = true; throw e; }
  return j;
}
async function dbxAccess(force) {
  if (!force && DBX.at && DBX.exp > Date.now()) return DBX.at;
  const j = await dbxToken({grant_type:'refresh_token', refresh_token:DBX.rt});
  DBX.at = j.access_token; DBX.exp = Date.now() + (j.expires_in - 300) * 1000; dbxSave(); return DBX.at;
}
async function dbxCall(host, ep, arg, body, retry) {
  const h = {Authorization:'Bearer ' + await dbxAccess(retry)};
  if (host === 'content') { h['Dropbox-API-Arg'] = asciiJson(arg); if (body !== undefined) h['Content-Type'] = 'application/octet-stream'; }
  else h['Content-Type'] = 'application/json';
  const r = await fetch(`https://${host}.dropboxapi.com/2/${ep}`, {method:'POST', headers:h, body:host === 'content' ? body : JSON.stringify(arg)});
  if (r.status === 401 && !retry) return dbxCall(host, ep, arg, body, true);
  if (!r.ok) { const e = new Error(await r.text().catch(() => '')); e.status = r.status; throw e; }
  return r;
}
const dbxUp = (path, data) => dbxCall('content', 'files/upload', {path, mode:'overwrite', mute:true}, data);
const dbxDown = path => dbxCall('content', 'files/download', {path}).then(r => r.text());
const dbxErr = e => e.auth ? 'Dropbox sign-in expired. Disconnect and connect again.' : !navigator.onLine || e instanceof TypeError ? "No internet right now. It'll back up when you're back online." : e.status === 507 ? 'Your Dropbox is full.' : "Dropbox didn't answer. It'll try again on the next change.";
function dbxShow(msg) { dbxMsg = msg || ''; const el = $('#dbxStatus'); if (el) el.innerHTML = dbxStatusHtml(); }
function dbxStatusHtml() {
  if (dbxBusy) return 'Backing up…';
  if (dbxMsg) return esc(dbxMsg);
  if (DBX.err) return `<span style="color:var(--danger)">${esc(DBX.err)}</span>`;
  return DBX.last ? `Last backup: <b>${esc(ago(DBX.last))}</b>${DBX.nph ? `, with ${plural(DBX.nph, 'photo')}` : ''}.` : 'Not backed up yet.';
}
function dbxSchedule(ms) {
  if (!DBX.rt || DBX.ask) return;
  clearTimeout(dbxTimer); dbxTimer = setTimeout(() => dbxSync(), ms || 4000);
}
async function dbxSync(manual) {
  if (!DBX.rt || DBX.ask) return;
  if (dbxBusy) { dbxAgain = true; return; }
  clearTimeout(dbxTimer);
  const json = JSON.stringify(backup()), hash = hashStr(json);
  let ph = []; try { ph = await pAll(); } catch (e) {}
  DBX.photos = DBX.photos || {};
  const newPh = ph.filter(p => !DBX.photos[p.id]);
  if (!manual && hash === DBX.hash && !newPh.length) return;
  dbxBusy = true; dbxShow();
  try {
    if (manual || hash !== DBX.hash) {
      await dbxUp('/hibi-backup.json', json);
      await dbxUp(`/daily/hibi-${today()}.json`, json);
      DBX.hash = hash;
    }
    for (const p of newPh) { await dbxUp(`/photos/${p.id}.jpg`, await (await fetch(p.url)).blob()); DBX.photos[p.id] = 1; dbxSave(); }
    if (typeof nbDbxUp === 'function') await nbDbxUp();
    await dbxCrashUpload();
    DBX.nph = ph.length; DBX.last = Date.now(); DBX.err = ''; S.lb = DBX.last; saveRaw();
    if (manual) toast('Backed up to Dropbox.');
  } catch (e) { DBX.err = dbxErr(e); if (manual) toast(DBX.err); }
  dbxBusy = false; dbxSave(); dbxShow();
  if (dbxAgain) { dbxAgain = false; dbxSchedule(1500); }
}
async function dbxRestore() {
  dbxShow('Downloading from Dropbox…');
  const text = await dbxDown('/hibi-backup.json');
  restoreFrom(text);
  let added = 0;
  try {
    const have = new Set((await pAll()).map(p => String(p.id)));
    let r = await (await dbxCall('api', 'files/list_folder', {path:'/photos'})).json(), files = r.entries;
    while (r.has_more) { r = await (await dbxCall('api', 'files/list_folder/continue', {cursor:r.cursor})).json(); files = files.concat(r.entries); }
    for (const f of files) {
      const id = f.name.replace(/\.jpg$/, ''); if (!/^\d+$/.test(id) || have.has(id)) continue;
      const blob = await (await dbxCall('content', 'files/download', {path:f.path_lower})).blob();
      const url = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = no; fr.readAsDataURL(blob); });
      await pPut({id:+id, d:dk(new Date(+id)), url}); DBX.photos = DBX.photos || {}; DBX.photos[id] = 1; added++;
    }
  } catch (e) { if (e.status !== 409) throw e; }
  if (typeof nbDbxDown === 'function') await nbDbxDown();
  DBX.hash = hashStr(JSON.stringify(backup())); dbxSave();
  if (added) loadPhotos();
  dbxShow(''); return added;
}
function dbxCard() {
  if (!DBX.rt) {
    if (!DBX.url) dbxPrep();
    return `<section class="card"><h2>Dropbox auto backup</h2>
      <p class="note">Back up everything, including progress photos, notebooks and lecture recordings, to your Dropbox on its own: a few seconds after each change and when you open Hibi. Hibi only sees its own folder in Dropbox › Apps.</p>
      <p class="mt"><b>1.</b> Tap below, sign in and tap Allow. Dropbox shows you a code. Copy it.</p>
      ${DBX.url ? `<a class="btn block mt" style="text-decoration:none;display:flex;align-items:center;justify-content:center" href="${esc(DBX.url)}" target="_blank" rel="noopener">Open Dropbox</a>` : '<p class="note">Getting ready…</p>'}
      <p class="mt"><b>2.</b> Come back here and paste the code.</p>
      <div class="field mt"><input class="input" id="dbxCode" placeholder="Paste the code" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" data-enter="dbxConnect" aria-label="Dropbox code"><button class="btn" data-act="dbxConnect">Connect</button></div>
      <p class="note" id="dbxStatus" role="status">${esc(dbxMsg)}</p></section>`;
  }
  if (DBX.ask) return `<section class="card"><h2>Dropbox auto backup</h2>
      <p>Your Dropbox already has a Hibi backup${DBX.ask.d ? ` from <b>${esc(fmtLong(DBX.ask.d))}</b>` : ''}. Which one do you want to keep?</p>
      <button class="btn block mt" data-act="dbxUseRemote">Use the Dropbox backup</button>
      <p class="note">Brings it onto this phone. Workouts on both are kept.</p>
      <button class="btn ghost block mt" data-act="dbxUseLocal" data-confirm>Replace it with this phone's data</button>
      <p class="note" id="dbxStatus" role="status">${esc(dbxMsg)}</p></section>`;
  return `<section class="card"><div class="row"><h2>Dropbox auto backup</h2><span class="small" style="color:var(--good);font-weight:800">On</span></div>
      <p class="note" id="dbxStatus" role="status">${dbxStatusHtml()}</p>
      <p class="note">Backs up a few seconds after each change and when you open Hibi. A copy for each day goes in the daily folder too, in case you ever need to go back.</p>
      <div class="btns mt"><button class="btn" style="flex:1" data-act="dbxNow">Back up now</button><button class="btn ghost" style="flex:1" data-act="dbxRestoreBtn" data-confirm>Restore from Dropbox</button></div>
      <button class="link danger mt" data-act="dbxOff" data-confirm>Disconnect Dropbox</button></section>`;
}
// Crash reports go to Dropbox › Apps › Hibi › crash-reports, one file each.
async function dbxCrashUpload() {
  if (!DBX.rt || DBX.ask) return;
  const l = Crash.list(), todo = l.filter(r => !r.up); if (!todo.length) return;
  for (const r of todo) {
    const d = new Date(r.t), name = `${dk(d)}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}_${r.id}.json`;
    await dbxUp(`/crash-reports/${name}`, JSON.stringify(Object.assign({}, r, {up:undefined}), null, 2)); r.up = true;
  }
  const fresh = Crash.list(); fresh.forEach(x => { if (todo.some(r => r.id === x.id)) x.up = true; }); Crash.store(fresh);
}
Crash.onRecord = () => { if (DBX.rt && !DBX.ask) setTimeout(() => dbxCrashUpload().catch(() => {}), 500); };
Object.assign(XACT, {
  crashCopy: () => { const t = Crash.text(); try { navigator.clipboard.writeText(t).then(() => toast('Crash reports copied. Paste them to Claude.'), () => toast("Couldn't copy.")); } catch (e) { toast("Couldn't copy."); } return false; },
  crashClear: () => { Crash.store([]); toast('Crash reports cleared.'); },
  dbxConnect: () => {
    const code = (($('#dbxCode') || {}).value || '').trim();
    if (!code) { toast('Paste the code from Dropbox first.'); return false; }
    dbxShow('Connecting…');
    dbxToken({grant_type:'authorization_code', code, code_verifier:DBX.pkce}).then(async j => {
      DBX = {rt:j.refresh_token, at:j.access_token, exp:Date.now() + (j.expires_in - 300) * 1000, photos:{}};
      try { const m = await (await dbxCall('api', 'files/get_metadata', {path:'/hibi-backup.json'})).json(); DBX.ask = {d:Date.parse(m.server_modified) || 0}; }
      catch (e) { if (e.status !== 409) throw e; }
      dbxSave(); dbxMsg = ''; render(); toast('Dropbox connected.');
      if (!DBX.ask) dbxSync(true);
    }).catch(e => { dbxShow(e.auth ? "That code didn't work. Codes only work once, so tap Open Dropbox again for a new one." : dbxErr(e)); if (e.auth) { delete DBX.url; delete DBX.pkce; dbxSave(); dbxPrep(); } });
    return false;
  },
  dbxUseRemote: () => { dbxRestore().then(n => { delete DBX.ask; dbxSave(); render(); toast(`Restored from Dropbox${n ? ` with ${plural(n, 'photo')}` : ''}.`); dbxSync(true); }).catch(e => dbxShow(dbxErr(e))); return false; },
  dbxUseLocal: () => { delete DBX.ask; dbxSave(); render(); dbxSync(true); return false; },
  dbxNow: () => { dbxSync(true); return false; },
  dbxRestoreBtn: () => { dbxRestore().then(n => { render(); toast(`Restored from Dropbox${n ? ` with ${plural(n, 'photo')}` : ''}.`); }).catch(e => { dbxShow(dbxErr(e)); toast(dbxErr(e)); }); return false; },
  dbxOff: () => { DBX = {}; dbxSave(); dbxMsg = ''; toast('Dropbox disconnected. Your files stay in Dropbox.'); }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dbxTimer) dbxSync(); });
window.addEventListener('online', () => { if (DBX.err) dbxSchedule(1000); });
