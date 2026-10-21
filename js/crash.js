// Hibi: Crash reports. Loaded first so it can catch problems in any other file.
// A report holds the error, where it happened, the version and the screen you were on. No personal data.
'use strict';
const CRASH_KEY = 'liftlog:crash';
const Crash = {
  booted:false, lastAct:'', onRecord:null, shown:false,
  list() { try { return JSON.parse(localStorage.getItem(CRASH_KEY) || '[]') || []; } catch (e) { return []; } },
  store(l) { try { localStorage.setItem(CRASH_KEY, JSON.stringify(l.slice(-30))); } catch (e) {} },
  record(err, where) {
    const e = err && err.error !== undefined ? err.error : err;
    let mode = '', tab = '', ver = '?';
    try { mode = S.mode; tab = S.tab; } catch (x) {}
    try { ver = APP_VERSION; } catch (x) {}
    const r = {id:'r' + Date.now() + Math.floor(Math.random() * 1000), t:Date.now(), v:ver, where:where || '', msg:String(e && e.message || e || 'Unknown error').slice(0, 500),
      stack:String(e && e.stack || '').split('\n').slice(0, 10).join('\n'), mode, tab, act:Crash.lastAct, booted:Crash.booted, ua:navigator.userAgent};
    const l = Crash.list(), prev = l[l.length - 1];
    if (prev && prev.msg === r.msg && r.t - prev.t < 5000) return prev;
    l.push(r); Crash.store(l);
    try { console.error('[Hibi crash]', r.where, r.msg); } catch (x) {}
    try { if (Crash.onRecord) Crash.onRecord(r); } catch (x) {}
    return r;
  },
  text(l) { return (l || Crash.list()).map(r => `${new Date(r.t).toLocaleString()} · v${r.v} · ${r.where}${r.act ? ' · after "' + r.act + '"' : ''} · ${r.mode}/${r.tab}\n${r.msg}\n${r.stack}`).join('\n\n'); },
  // Shown instead of a blank screen when the app can't draw itself. Uses no other Hibi code.
  screen(r) {
    if (Crash.shown) return; Crash.shown = true;
    const app = document.getElementById('app'); if (!app) return;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'})[c]);
    app.innerHTML = `<section class="card" style="margin-top:40px"><h2>Something went wrong</h2>
      <p class="mt">Hibi hit an error and couldn't load this screen. <b>Your data is safe.</b> A crash report was saved${r && r.up ? ' to Dropbox' : ''}.</p>
      <p class="note mt" style="word-break:break-word">${esc(r ? r.msg : '')}</p>
      <div class="btns mt"><button class="btn" id="crReload" style="flex:1">Reload</button><button class="btn ghost" id="crCopy" style="flex:1">Copy report</button></div>
      <p class="note mt">${Crash.booted ? 'You can also tap another tab below. ' : ''}Send the copied report to Claude to get it fixed.</p></section>`;
    document.getElementById('crReload').onclick = () => location.reload();
    document.getElementById('crCopy').onclick = () => { const t = Crash.text(Crash.list().slice(-3)); try { navigator.clipboard.writeText(t).then(() => { document.getElementById('crCopy').textContent = 'Copied'; }); } catch (x) { prompt('Copy this report:', t); } };
  }
};
window.addEventListener('error', e => {
  if (e.target && e.target !== window) {   // a file failed to load: only the app's own scripts matter, not fonts or cover images
    if (e.target.tagName === 'SCRIPT') Crash.screen(Crash.record(new Error("Couldn't load " + (e.target.getAttribute('src') || 'a script')), 'loading'));
    return;
  }
  const r = Crash.record(e.error || e.message, e.filename ? `${e.filename.split('/').pop()}:${e.lineno}` : 'error');
  if (!Crash.booted) Crash.screen(r);
}, true);
window.addEventListener('unhandledrejection', e => { Crash.record(e.reason, 'background task'); });
window.addEventListener('load', () => { if (!Crash.booted) Crash.screen(Crash.list().slice(-1)[0]); });
