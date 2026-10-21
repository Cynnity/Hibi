// Hibi: Backup files, restore, Hevy import, progress photos and themes.
'use strict';
/* =========================================================
   Backup, restore and Hevy import
   ========================================================= */
const BACKUP_KEYS = ['cardioV','cpick','cardio','unit','rest','wg','theme','cats','ex','history','bw','j','sup','sl','wt','st','sp','bd','tpl','rr','inc','bar','next','jp','md','sv','sc','gm','alog','wrapSeen','wrapSince','hidden','order'];
function backup() { const o = {app:'hibi', version:2}; BACKUP_KEYS.forEach(k => o[k] = S[k]); return o; }
function restoreFrom(text) {
  let d;
  try { d = JSON.parse(text); if (!d || !Array.isArray(d.history)) throw 0; } catch (e) { toast('That is not a Hibi backup.'); return; }
  const have = new Set(S.history.map(w => w.id)); let added = 0;
  d.history.forEach(w => { if (!have.has(w.id)) { S.history.push(w); added++; } });
  S.history.sort((a, b) => a.end - b.end);
  BACKUP_KEYS.filter(k => k !== 'history' && d[k] != null).forEach(k => { S[k] = d[k]; });
  S = normalize(S); applyTheme(); afterChange();
  toast(`Backup restored. ${plural(added, 'workout')} added.`);
}
function parseCSV(t) {
  const rows = []; let row = [], f = '', q = false;
  t = t.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); f = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}
const MON = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
function hevyDate(s) {
  s = (s || '').trim();
  const m = /(\d{1,2}) (\w{3})\w* (\d{4}),? (\d{1,2}):(\d{2})/.exec(s);
  if (m && MON[m[2].toLowerCase()] !== undefined) return new Date(+m[3], MON[m[2].toLowerCase()], +m[1], +m[4], +m[5]).getTime();
  const t = Date.parse(s); return isNaN(t) ? 0 : t;
}
function importHevy(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) { toast('That file looks empty.'); return; }
  const h = rows[0].map(x => norm(x)), ix = n => h.indexOf(n);
  const iT = ix('start_time'), iE = ix('end_time'), iN = ix('exercise_title'), iS = ix('set_type'), iR = ix('reps');
  let iW = ix('weight_lbs'), kg = false; if (iW < 0) { iW = ix('weight_kg'); kg = iW >= 0; }
  let iD = ix('distance_miles'), dKm = false; if (iD < 0) { iD = ix('distance_km'); dKm = iD >= 0; }
  const iDur = ix('duration_seconds');
  if (iT < 0 || iN < 0 || iR < 0 || iW < 0) { toast("This doesn't look like a Hevy export."); return; }
  const groups = {};
  rows.slice(1).forEach(r => {
    const st = hevyDate(r[iT]); if (!st) return;
    if (iS >= 0 && norm(r[iS] || '') === 'warmup') return;
    const name = (r[iN] || '').trim(); if (!name) return;
    const w = groups[st] = groups[st] || {id:st, start:st, end:(iE >= 0 && hevyDate(r[iE])) || st + 36e5, cat:null, muscles:[], exercises:[], idx:{}};
    let e = w.idx[name]; if (!e) { e = w.idx[name] = {name, sets:[]}; w.exercises.push(e); }
    const dur = iDur >= 0 ? num(r[iDur]) : 0; let dist = iD >= 0 ? num(r[iD]) : 0;
    if ((dur || dist) && !num(r[iW]) && !num(r[iR])) {
      if (dKm && S.unit === 'lb') dist *= .621371; if (!dKm && iD >= 0 && S.unit === 'kg') dist *= 1.60934;
      const info = exInfo(name); e.k = info && CARDIO[info.kind] ? info.kind : kindByName(name) || 'cardio';
      const o = {}; if (dur) o.min = String(Math.round(dur / 6) / 10); if (dist) o.dist = String(Math.round(dist * 100) / 100); e.sets.push(o); return;
    }
    let wt = num(r[iW]); if (kg && S.unit === 'lb') wt *= 2.20462; if (!kg && S.unit === 'kg') wt *= .453592;
    e.sets.push({w:String(Math.round(wt * 10) / 10), r:String(num(r[iR]))});
  });
  const have = new Set(S.history.map(w => w.id)); let n = 0;
  Object.values(groups).forEach(w => {
    delete w.idx;
    if (have.has(w.id) || !w.exercises.length) return;
    w.exercises.forEach(e => {
      const info = exInfo(e.name);
      if (info) info.muscles.forEach(m => { if (!w.muscles.includes(m)) w.muscles.push(m); });
      else S.ex.push(Object.assign({id:'h' + w.id + '-' + S.ex.length, name:e.name, cats:[], muscles:[], how:'Imported from Hevy. Add muscles and notes here.'}, e.k ? {kind:e.k} : {}));
    });
    S.history.push(w); n++;
  });
  S.history.sort((a, b) => a.end - b.end);
  afterChange(); toast(n ? `Imported ${plural(n, 'workout')} from Hevy.` : 'No new workouts found in that file.');
}

/* =========================================================
   Photos (IndexedDB)
   ========================================================= */
const idb = () => new Promise((ok, no) => { const r = indexedDB.open('liftlog', 1); r.onupgradeneeded = () => r.result.createObjectStore('p', {keyPath:'id'}); r.onsuccess = () => ok(r.result); r.onerror = no; });
const pdo = (mode, fn) => idb().then(db => new Promise((ok, no) => { const t = db.transaction('p', mode), q = fn(t.objectStore('p')); t.oncomplete = () => ok(q.result); t.onerror = no; }));
const pAll = () => pdo('readonly', s => s.getAll()).catch(() => []);
const pPut = o => pdo('readwrite', s => s.put(o));
const pDel = id => pdo('readwrite', s => s.delete(id));
async function loadPhotos() { PH = (await pAll()).sort((a, b) => b.id - a.id); checkBadges(); save(); if (S.tab === 'body' || S.tab === 'badges') render(); }
function addPhoto(file) {
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      pPut({id:Date.now(), d:today(), url:c.toDataURL('image/jpeg', .78)}).then(() => { loadPhotos(); toast('Photo saved.'); }, () => toast("Couldn't save the photo."));
    };
    im.onerror = () => toast("Couldn't read that photo.");
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
}

/* =========================================================
   Theme
   ========================================================= */
function applyTheme() {
  const r = document.documentElement;
  if (S.theme === 'sakura') r.removeAttribute('data-skin'); else r.setAttribute('data-skin', S.theme);
  const t = THEMES.find(x => x[0] === S.theme); const m = $('meta[name="theme-color"]'); if (m && t) m.content = t[2];
}
