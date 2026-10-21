// Hibi: Focus tab in School. A Pomodoro timer: focus, short break, and a long break every few rounds.
'use strict';
/* =========================================================
   Focus (Pomodoro)
   ========================================================= */
Object.assign(ICON, {timer:'<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 2M9.5 3h5M12 3v2.5"/>'});
MODES.school.nav.splice(3, 0, ['kfocus', 'Focus', 'timer']);
Object.assign(TAB_INFO, {kfocus:{g:'kfocus', t:'Focus'}});
Object.assign(GROUPS, {kfocus:['kfocus']});
const PHASES = {focus:['Focus', '🍅'], short:['Short break', '☕'], long:['Long break', '🌿']};
function normalizePomo(s) {
  if (!s.pomo || typeof s.pomo !== 'object') s.pomo = {};
  const p = s.pomo;
  if (!(p.focus > 0)) p.focus = 25; if (!(p.short > 0)) p.short = 5; if (!(p.long > 0)) p.long = 15; if (!(p.every > 0)) p.every = 4;
  if (!Array.isArray(p.log)) p.log = [];
  if (typeof p.done !== 'number') p.done = 0;
  if (!p.phase || !PHASES[p.phase]) p.phase = 'focus';
  if (typeof p.c !== 'string') p.c = '';
  if (p.run && !(p.run.end || p.run.paused != null)) p.run = null;
}
const pomoLen = ph => (S.pomo[ph] || 25) * 6e4;
const pomoLeft = () => { const r = S.pomo.run; return !r ? pomoLen(S.pomo.phase) : r.paused != null ? r.paused : Math.max(0, r.end - Date.now()); };
function pomoRing() {
  const total = pomoLen(S.pomo.phase), left = pomoLeft(), C = 2 * Math.PI * 92, frac = Math.max(0, Math.min(1, left / total));
  return `<svg class="pomo-ring" viewBox="0 0 220 220" role="img" aria-label="${PHASES[S.pomo.phase][0]}, ${clock(left, true)} left">
    <circle cx="110" cy="110" r="92" fill="none" stroke="var(--line)" stroke-width="12"/>
    <circle id="pomoArc" cx="110" cy="110" r="92" fill="none" stroke="${S.pomo.phase === 'focus' ? 'var(--accent)' : 'var(--good)'}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 110 110)"/>
    <text x="110" y="104" text-anchor="middle" id="pomoTime">${clock(left, true)}</text>
    <text x="110" y="138" text-anchor="middle" class="ph">${PHASES[S.pomo.phase][1]} ${PHASES[S.pomo.phase][0]}</text></svg>`;
}
function focusStats() {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0); const ws = weekStart(Date.now());
  const today = S.pomo.log.filter(x => x[0] >= t0.getTime()), week = S.pomo.log.filter(x => x[0] >= ws);
  const byC = {}; week.forEach(x => byC[x[2] || ''] = (byC[x[2] || ''] || 0) + x[1]);
  return {n:today.length, min:today.reduce((a, x) => a + x[1], 0), wmin:week.reduce((a, x) => a + x[1], 0), byC};
}
function viewKFocus() {
  const p = S.pomo, r = p.run, st = focusStats(), running = r && r.paused == null;
  const lenSel = (k, opts) => `<select class="input" data-bind="pomo" data-k="${k}" aria-label="${k}">${opts.map(n => opt(String(n), n + ' min', String(p[k]))).join('')}</select>`;
  const round = (p.done % p.every) + (p.phase === 'focus' ? 1 : 0);
  return `<section class="card" style="text-align:center">${pomoRing()}
      <p class="small muted">${p.phase === 'focus' ? `Round ${round} of ${p.every}` : 'Stand up, stretch, drink some water.'}</p>
      <div class="btns mt" style="justify-content:center">${running ? '<button class="btn" data-act="pomoPause">⏸ Pause</button>' : `<button class="btn" data-act="pomoStart">▶ ${r ? 'Resume' : 'Start'}</button>`}
        ${r ? '<button class="btn ghost" data-act="pomoReset" data-confirm>Reset</button>' : ''}<button class="btn ghost" data-act="pomoSkip">Skip</button></div>
      <label class="setrow mt" style="text-align:left"><span>Studying for</span><select class="input" style="width:auto;max-width:60%" data-bind="pomoClass" aria-label="Class">${kClassOpts(p.c)}</select></label></section>
    <section class="card"><h2>Today</h2>
      <div class="stats"><div class="stat"><b>${st.n}</b><span>${st.n === 1 ? 'focus round' : 'focus rounds'}</span></div><div class="stat"><b>${st.min}</b><span>min today</span></div><div class="stat"><b>${fmtN(Math.round(st.wmin / 6) / 10)}</b><span>h this week</span></div></div>
      ${Object.keys(st.byC).length ? Object.entries(st.byC).sort((a, b) => b[1] - a[1]).map(([c, m]) => `<div class="lrow"><b>${esc(c ? (kClass(c) || {}).name || 'Class' : 'No class')}</b><span>${m} min this week</span></div>`).join('') : ''}</section>
    <details class="card" ${det('pomoSet')}><summary class="sum"><h2>Timer lengths</h2><span class="small muted">${p.focus} min focus, ${p.short} min break, ${p.long} min long break every ${p.every}</span></summary>
      <label class="setrow"><span>Focus</span>${lenSel('focus', [15, 20, 25, 30, 40, 45, 50, 60])}</label>
      <label class="setrow"><span>Short break</span>${lenSel('short', [3, 5, 10, 15])}</label>
      <label class="setrow"><span>Long break</span>${lenSel('long', [10, 15, 20, 30])}</label>
      <label class="setrow"><span>Long break every</span><select class="input" data-bind="pomo" data-k="every" aria-label="Long break every">${[2, 3, 4, 5, 6].map(n => opt(String(n), n + ' rounds', String(p.every))).join('')}</select></label></details>
    <p class="note">The timer keeps time even if you leave the app, but your phone won't ping you while Hibi is closed. Keep Hibi open, or set an iPhone timer too.</p>`;
}
// Small banner on other School screens while a timer runs
const pomoBanner = () => S.pomo.run && S.tab !== 'kfocus' ? `<div class="card flat" style="border-color:var(--accent)"><div class="row"><span class="small">${PHASES[S.pomo.phase][1]} <b>${PHASES[S.pomo.phase][0]}</b>: <b id="pomoMini">${clock(pomoLeft(), true)}</b>${S.pomo.run.paused != null ? ' (paused)' : ''}</span><button class="btn sm" data-act="go" data-to="kfocus">Open</button></div></div>` : '';
function pomoAdvance(completed) {
  const p = S.pomo;
  if (p.phase === 'focus') {
    if (completed) { p.log.push([Date.now(), p.focus, p.c || '']); if (p.log.length > 3000) p.log = p.log.slice(-3000); }
    p.done++; p.phase = p.done % p.every === 0 ? 'long' : 'short';
  } else p.phase = 'focus';
  p.run = null;
}
function pomoTick() {
  const p = S.pomo, r = p.run; if (!r) return;
  if (r.paused == null && Date.now() >= r.end) {
    const was = p.phase, late = Date.now() - r.end > 60000; pomoAdvance(true); save();
    if (!late) { beep(); toast(was === 'focus' ? `🍅 Focus round done! Time for a ${p.phase === 'long' ? p.long + ' min long' : p.short + ' min'} break.` : "☕ Break's over. Ready to focus?"); }
    else toast(was === 'focus' ? '🍅 A focus round finished while you were away.' : 'Your break ended while you were away.');
    afterChange(); return;
  }
  const left = pomoLeft(), el = $('#pomoTime'); if (el) el.textContent = clock(left, true);
  const mini = $('#pomoMini'); if (mini) mini.textContent = clock(left, true);
  const arc = $('#pomoArc'); if (arc) { const C = 2 * Math.PI * 92; arc.setAttribute('stroke-dasharray', `${(C * Math.max(0, Math.min(1, left / pomoLen(p.phase)))).toFixed(1)} ${C.toFixed(1)}`); }
}
Object.assign(XVIEWS, {kfocus:viewKFocus});
Object.assign(XACT, {
  pomoStart: () => { const p = S.pomo, r = p.run; if (r && r.paused != null) { r.end = Date.now() + r.paused; r.paused = null; } else if (!r) p.run = {end:Date.now() + pomoLen(p.phase), paused:null}; },
  pomoPause: () => { const r = S.pomo.run; if (!r) return false; r.paused = Math.max(0, r.end - Date.now()); },
  pomoReset: () => { S.pomo.run = null; S.pomo.phase = 'focus'; S.pomo.done = 0; },
  pomoSkip: () => { if (S.pomo.phase === 'focus') sxBump('skipFocus'); pomoAdvance(false); },
});
