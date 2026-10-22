// Hibi: Focus tab in School. A Pomodoro timer: focus, short break, and a long break every few rounds.
'use strict';
/* =========================================================
   Focus (Pomodoro)
   ========================================================= */
Object.assign(ICON, {timer:'<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 2M9.5 3h5M12 3v2.5"/>'});
MODES.school.nav.splice(3, 0, ['kfocus', 'Focus', 'timer']);
Object.assign(TAB_INFO, {kfocus:{g:'kfocus', t:'Focus'}});
Object.assign(GROUPS, {kfocus:['kfocus']});
const PHASES = {focus:['Focus', '🎯'], short:['Break', '☕'], long:['Long break', '🌿']};
const POMO_PRESETS = [['Classic', 25, 5, 15], ['Deep work', 50, 10, 20], ['Quick', 15, 3, 10], ['Marathon', 90, 20, 30]];
function normalizePomo(s) {
  if (!s.pomo || typeof s.pomo !== 'object') s.pomo = {};
  const p = s.pomo;
  if (!(p.focus > 0)) p.focus = 25; if (!(p.short > 0)) p.short = 5; if (!(p.long > 0)) p.long = 15; if (!(p.every > 0)) p.every = 4;
  if (!Array.isArray(p.log)) p.log = [];
  if (typeof p.done !== 'number') p.done = 0;
  if (!p.phase || !PHASES[p.phase]) p.phase = 'focus';
  if (typeof p.c !== 'string') p.c = '';
  if (typeof p.goal !== 'number') p.goal = 120;   // daily focus goal in minutes, 0 = off
  if (p.run && !(p.run.end || p.run.paused != null)) p.run = null;
}
const pomoLen = ph => (S.pomo.run && S.pomo.run.len && ph === S.pomo.phase ? S.pomo.run.len : (S.pomo[ph] || 25)) * 6e4;
const pomoLeft = () => { const r = S.pomo.run; return !r ? pomoLen(S.pomo.phase) : r.paused != null ? r.paused : Math.max(0, r.end - Date.now()); };
function pomoRing() {
  const total = pomoLen(S.pomo.phase), left = pomoLeft(), C = 2 * Math.PI * 92, frac = Math.max(0, Math.min(1, left / total));
  return `<div class="pomo-wrap" role="timer" aria-label="${PHASES[S.pomo.phase][0]}, ${clock(left, true)} left">
    <svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="92" fill="none" stroke="var(--line)" stroke-width="12"/>
      <circle id="pomoArc" cx="110" cy="110" r="92" fill="none" stroke="${S.pomo.phase === 'focus' ? 'var(--accent)' : 'var(--good)'}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 110 110)"/></svg>
    <div class="pomo-face"><b id="pomoTime">${clock(left, true)}</b><span>${PHASES[S.pomo.phase][1]} ${PHASES[S.pomo.phase][0]}</span></div></div>`;
}
function focusStats() {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0); const ws = weekStart(Date.now());
  const today = S.pomo.log.filter(x => x[0] >= t0.getTime()), week = S.pomo.log.filter(x => x[0] >= ws);
  const byC = {}; week.forEach(x => byC[x[2] || ''] = (byC[x[2] || ''] || 0) + x[1]);
  return {n:today.length, min:today.reduce((a, x) => a + x[1], 0), wmin:week.reduce((a, x) => a + x[1], 0), byC};
}
const stepper = (k, label, v, busy) => `<div class="pomo-step"><span>${label}</span><div><button class="btn sm ghost" data-act="pomoStep" data-k="${k}" data-n="-1"${busy ? ' disabled' : ''} aria-label="Less ${label.toLowerCase()} time">−</button>
  <b>${v}<small> min</small></b><button class="btn sm ghost" data-act="pomoStep" data-k="${k}" data-n="1"${busy ? ' disabled' : ''} aria-label="More ${label.toLowerCase()} time">+</button></div></div>`;
function viewKFocus() {
  const p = S.pomo, r = p.run, st = focusStats(), running = r && r.paused == null;
  const round = (p.done % p.every) + (p.phase === 'focus' ? 1 : 0), preset = POMO_PRESETS.find(x => x[1] === p.focus && x[2] === p.short);
  const numIn = (k, label, max, hint) => `<label class="setrow"><span>${label}${hint ? `<small class="muted" style="display:block;font-weight:600">${hint}</small>` : ''}</span><span style="display:flex;align-items:center;gap:6px"><input class="input" style="width:84px;text-align:center" type="number" inputmode="numeric" min="0" max="${max}" data-bind="pomoNum" data-k="${k}" value="${p[k]}" aria-label="${label}"><small class="muted">${k === 'every' ? 'rounds' : 'min'}</small></span></label>`;
  const goalPct = p.goal ? Math.min(100, st.min / p.goal * 100) : 0;
  return `<section class="card" style="text-align:center">
      <div class="chips pomo-phases">${Object.entries(PHASES).map(([k, [l, em]]) => chip(`${em} ${l}`, p.phase === k, `data-act="pomoPhase" data-k="${k}"${r ? ' disabled' : ''}`)).join('')}</div>
      ${pomoRing()}
      <p class="small muted">${p.phase === 'focus' ? `Round ${round} of ${p.every}` : 'Stand up, stretch, drink some water.'}</p>
      <div class="btns mt" style="justify-content:center">${running ? '<button class="btn" data-act="pomoPause">⏸ Pause</button>' : `<button class="btn" data-act="pomoStart">▶ ${r ? 'Resume' : 'Start'}</button>`}
        ${r ? '<button class="btn ghost" data-act="pomoReset" data-confirm>Reset</button>' : ''}<button class="btn ghost" data-act="pomoSkip">Skip</button></div>
      <div class="pomo-steps mt">${stepper('focus', 'Focus', p.focus, !!r)}${stepper('short', 'Break', p.short, !!r)}</div>
      ${r ? '<p class="note">Reset or finish this round to change the times.</p>' : `<div class="chips" style="justify-content:center;margin-top:10px">${POMO_PRESETS.map(([n, f, b]) => chip(`${n} ${f}/${b}`, preset && preset[0] === n, `data-act="pomoPreset" data-n="${n}"`)).join('')}</div>`}
      <label class="setrow mt" style="text-align:left"><span>Studying for</span><select class="input" style="width:auto;max-width:60%" data-bind="pomoClass" aria-label="Class">${kClassOpts(p.c)}</select></label></section>
    <section class="card"><div class="row"><h2>Today</h2>${p.goal ? `<span class="small muted">Goal: ${fmtN(Math.round(p.goal / 6) / 10)} h</span>` : ''}</div>
      ${p.goal ? `<div class="crow mt"><div class="row"><b>${st.min} of ${p.goal} min</b><span>${st.min >= p.goal ? 'Goal reached 🎉' : `${p.goal - st.min} min to go`}</span></div><div class="cbar"><i style="width:${goalPct}%"></i></div></div>` : ''}
      <div class="stats"><div class="stat"><b>${st.n}</b><span>${st.n === 1 ? 'focus round' : 'focus rounds'}</span></div><div class="stat"><b>${st.min}</b><span>min today</span></div><div class="stat"><b>${fmtN(Math.round(st.wmin / 6) / 10)}</b><span>h this week</span></div></div>
      ${Object.keys(st.byC).length ? Object.entries(st.byC).sort((a, b) => b[1] - a[1]).map(([c, m]) => `<div class="lrow"><b>${esc(c ? (kClass(c) || {}).name || 'Class' : 'No class')}</b><span>${m} min this week</span></div>`).join('') : ''}</section>
    <details class="card" ${det('pomoSet')}><summary class="sum"><h2>Timer settings</h2><span class="small muted">${p.focus} min focus, ${p.short} min break, ${p.long} min long break every ${p.every} rounds</span></summary>
      ${numIn('focus', 'Focus time', 180)}${numIn('short', 'Break', 60)}${numIn('long', 'Long break', 90)}${numIn('every', 'Long break every', 12)}
      ${numIn('goal', 'Daily focus goal', 720, 'How much you want to study each day. 0 turns it off.')}
      <p class="note">Type any number of minutes. Changes apply to the next round.</p></details>
    <p class="note">The timer keeps time even if you leave the app, but your phone won't ping you while Hibi is closed. Keep Hibi open, or set an iPhone timer too.</p>`;
}
// Small banner on other School screens while a timer runs
const pomoBanner = () => S.pomo.run && S.tab !== 'kfocus' ? `<div class="card flat" style="border-color:var(--accent)"><div class="row"><span class="small">${PHASES[S.pomo.phase][1]} <b>${PHASES[S.pomo.phase][0]}</b>: <b id="pomoMini">${clock(pomoLeft(), true)}</b>${S.pomo.run.paused != null ? ' (paused)' : ''}</span><button class="btn sm" data-act="go" data-to="kfocus">Open</button></div></div>` : '';
function pomoAdvance(completed) {
  const p = S.pomo;
  if (p.phase === 'focus') {
    if (completed) { p.log.push([Date.now(), (p.run && p.run.len) || p.focus, p.c || '']); if (p.log.length > 3000) p.log = p.log.slice(-3000); }
    p.done++; p.phase = p.done % p.every === 0 ? 'long' : 'short';
  } else p.phase = 'focus';
  p.run = null;
}
function pomoTick() {
  const p = S.pomo, r = p.run; if (!r) return;
  if (r.paused == null && Date.now() >= r.end) {
    const was = p.phase, late = Date.now() - r.end > 60000; pomoAdvance(true); save();
    if (!late) { beep(); toast(was === 'focus' ? `🎯 Focus round done! Time for a ${p.phase === 'long' ? p.long + ' min long' : p.short + ' min'} break.` : "☕ Break's over. Ready to focus?"); }
    else toast(was === 'focus' ? '🎯 A focus round finished while you were away.' : 'Your break ended while you were away.');
    afterChange(); return;
  }
  const left = pomoLeft(), el = $('#pomoTime'); if (el) el.textContent = clock(left, true);
  const mini = $('#pomoMini'); if (mini) mini.textContent = clock(left, true);
  const arc = $('#pomoArc'); if (arc) { const C = 2 * Math.PI * 92; arc.setAttribute('stroke-dasharray', `${(C * Math.max(0, Math.min(1, left / pomoLen(p.phase)))).toFixed(1)} ${C.toFixed(1)}`); }
}
Object.assign(XVIEWS, {kfocus:viewKFocus});
Object.assign(XACT, {
  pomoStart: () => { const p = S.pomo, r = p.run; if (r && r.paused != null) { r.end = Date.now() + r.paused; r.paused = null; } else if (!r) { const len = p[p.phase] || 25; p.run = {end:Date.now() + len * 6e4, paused:null, len}; } },
  pomoPause: () => { const r = S.pomo.run; if (!r) return false; r.paused = Math.max(0, r.end - Date.now()); },
  pomoReset: () => { S.pomo.run = null; S.pomo.phase = 'focus'; S.pomo.done = 0; },
  pomoStep: d => { const p = S.pomo; if (p.run) return false; const v = p[d.k], n = +d.n, step = v < 5 || (v === 5 && n < 0) ? 1 : v < 60 ? 5 : 10;
    p[d.k] = Math.max(1, Math.min(d.k === 'focus' ? 180 : 60, v + n * step)); },
  pomoPreset: d => { const x = POMO_PRESETS.find(y => y[0] === d.n); if (!x || S.pomo.run) return false; [, S.pomo.focus, S.pomo.short, S.pomo.long] = x; toast(`${x[0]}: ${x[1]} min focus, ${x[2]} min breaks.`); },
  pomoPhase: d => { if (S.pomo.run || !PHASES[d.k]) return false; S.pomo.phase = d.k; },
  pomoSkip: () => { if (S.pomo.phase === 'focus') sxBump('skipFocus'); pomoAdvance(false); },
});
