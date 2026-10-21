// Hibi: Work mode. Clock in and out, log shifts and bonuses, and estimate each paycheck (hourly rate, overtime, taxes, pay schedule).
'use strict';
/* =========================================================
   Work mode
   ========================================================= */
Object.assign(ICON, {dollar:'<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.6.8-2.6 2s1.1 1.7 2.6 2 2.6.8 2.6 2-1.1 2-2.6 2c-1.2 0-2.1-.5-2.6-1.3M12 6.5V8M12 16v1.5"/>', work:'<rect x="3.5" y="7" width="17" height="12.5" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17"/>'});
MODES.work = {label:'Work', em:'💼', nav:[['wtoday','Today','work'],['wshifts','Shifts','plan'],['wpay','Pay','dollar'],['settings','Settings','settings']]};
Object.assign(TAB_INFO, {wtoday:{g:'wtoday',t:'Work'}, wshifts:{g:'wshifts',t:'Shifts'}, wpay:{g:'wpay',t:'Pay'}});
Object.assign(GROUPS, {wtoday:['wtoday'], wshifts:['wshifts'], wpay:['wpay']});
const WK_FREQ = [['weekly','Every week',7], ['biweekly','Every 2 weeks',14], ['semimonthly','Twice a month (15th and last day)',0]];
function normalizeWk(s) {
  if (!s.wk || typeof s.wk !== 'object') s.wk = {};
  const w = s.wk;
  for (const k of ['shifts', 'bonus']) if (!Array.isArray(w[k])) w[k] = [];
  if (typeof w.rate !== 'number') w.rate = 0; if (typeof w.tax !== 'number') w.tax = 0;
  if (typeof w.ot !== 'boolean') w.ot = true; if (!WK_FREQ.some(f => f[0] === w.freq)) w.freq = 'biweekly';
  if (typeof w.pay !== 'string') w.pay = ''; if (typeof w.lag !== 'number') w.lag = 0;
}
const addDays = (k, n) => { const d = keyDate(k); d.setDate(d.getDate() + n); return dk(d); };
const dayDiff = (a, b) => Math.round((keyDate(b) - keyDate(a)) / 864e5);
const hm = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
function shiftMin(s) { let m = hm(s.end) - hm(s.start); if (m <= 0) m += 1440; return Math.max(0, m - num(s.brk)); }
const hrsTxt = m => fmtN(Math.round(m / 6) / 10) + ' h';

// The pay period a date falls in: {from, to (inclusive), pay}
function periodFor(k) {
  const w = S.wk;
  if (w.freq === 'semimonthly') {
    const d = keyDate(k), y = d.getFullYear(), m = d.getMonth(), last = new Date(y, m + 1, 0).getDate(), first = d.getDate() <= 15;
    const from = dk(new Date(y, m, first ? 1 : 16)), to = dk(new Date(y, m, first ? 15 : last));
    return {from, to, pay:addDays(to, w.lag)};
  }
  const L = WK_FREQ.find(f => f[0] === w.freq)[2], anchor = w.pay || dk(new Date());
  const end0 = addDays(anchor, -1 - w.lag), start0 = addDays(end0, 1 - L);
  const n = Math.floor(dayDiff(start0, k) / L), from = addDays(start0, n * L), to = addDays(from, L - 1);
  return {from, to, pay:addDays(to, 1 + w.lag)};
}
// Splits every shift into regular and overtime minutes (over 40 hours in a Monday-to-Sunday week)
function shiftsSplit() {
  const L = S.wk.shifts.slice().sort((a, b) => (a.d + a.start).localeCompare(b.d + b.start)), week = {};
  return L.map(s => { const wkk = weekStart(keyDate(s.d).getTime()), m = shiftMin(s), before = week[wkk] || 0; week[wkk] = before + m;
    const ot = S.wk.ot ? Math.max(0, Math.min(m, before + m - 2400)) : 0; return Object.assign({}, s, {mins:m, reg:m - ot, ot}); });
}
const shRate = s => num(s.rate) || S.wk.rate;
function payFor(P, split) {
  const sh = (split || shiftsSplit()).filter(s => s.d >= P.from && s.d <= P.to), bo = S.wk.bonus.filter(b => b.d >= P.from && b.d <= P.to);
  const reg = sh.reduce((t, s) => t + s.reg, 0), ot = sh.reduce((t, s) => t + s.ot, 0);
  const regPay = sh.reduce((t, s) => t + s.reg / 60 * shRate(s), 0), otPay = sh.reduce((t, s) => t + s.ot / 60 * shRate(s) * 1.5, 0), bonus = bo.reduce((t, b) => t + num(b.amt), 0);
  const gross = regPay + otPay + bonus, tax = gross * S.wk.tax / 100;
  return {sh, bo, reg, ot, mins:reg + ot, regPay, otPay, bonus, gross, tax, net:gross - tax};
}
const cash = a => '$' + (Math.round(a * 100) / 100).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
const fmtShort = k => keyDate(k).toLocaleDateString(undefined, {month:'short', day:'numeric'});
const fmtWd = k => keyDate(k).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
const inDays = k => { const n = dayDiff(today(), k); return n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 0 ? `in ${n} days` : `${-n} days ago`; };
const wkReady = () => S.wk.rate > 0;
function clockMs() { const c = S.wk.clock; return c ? runMs(c) : 0; }

/* ----- Today ----- */
function clockCard() {
  const c = S.wk.clock;
  if (c) return `<section class="card" style="border-color:var(--accent)"><span class="small muted">${c.pausedAt ? 'On break' : 'On the clock'} since ${esc(new Date(c.start).toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}))}</span>
      <div class="clock${c.pausedAt ? ' paused' : ''}" id="workClock">${clock(clockMs())}</div>
      ${wkReady() ? `<span class="small muted" id="workEarn">About ${cash(clockMs() / 36e5 * S.wk.rate)} so far, before taxes</span>` : ''}
      <div class="btns mt"><button class="btn" style="flex:1" data-act="wkOut">Clock out</button><button class="btn ghost" data-act="wkBreak">${c.pausedAt ? '▶ End break' : '☕ Break'}</button></div>
      <button class="link danger mt" data-act="wkCancel" data-confirm>Cancel this shift</button></section>`;
  return `<section class="card"><div class="row"><div><h2>Not clocked in</h2><span class="small muted">Tap when your shift starts, or log a shift by hand.</span></div></div>
      <div class="btns mt"><button class="btn" style="flex:1" data-act="wkIn">⏱ Clock in</button><button class="btn ghost" data-act="go" data-to="wshifts">Log a shift</button></div></section>`;
}
function periodCard(P, title) {
  const p = payFor(P), past = P.pay < today();
  return `<section class="card"><div class="row"><h2>${title}</h2><span class="small muted">${esc(fmtShort(P.from))} to ${esc(fmtShort(P.to))}</span></div>
    <p class="note">💵 Payday <b>${esc(fmtWd(P.pay))}</b>, ${esc(inDays(P.pay))}</p>
    <div class="stats"><div class="stat"><b>${fmtN(Math.round(p.mins / 6) / 10)}</b><span>hours</span></div><div class="stat"><b>${short(Math.round(p.gross))}</b><span>before taxes</span></div><div class="stat"><b>${short(Math.round(p.net))}</b><span>${past ? 'take-home' : 'take-home est.'}</span></div></div>
    ${p.mins || p.bonus ? `<div class="mt">
      <div class="lrow"><span class="muted">Regular: ${hrsTxt(p.reg)}</span><span>${cash(p.regPay)}</span></div>
      ${p.ot ? `<div class="lrow"><span class="muted">Overtime: ${hrsTxt(p.ot)} at 1.5×</span><span>${cash(p.otPay)}</span></div>` : ''}
      ${p.bonus ? `<div class="lrow"><span class="muted">Bonuses</span><span>${cash(p.bonus)}</span></div>` : ''}
      <div class="lrow"><span class="muted">Taxes, about ${fmtN(S.wk.tax)}%</span><span>−${cash(p.tax)}</span></div>
      <div class="lrow"><b>Estimated paycheck</b><b>${cash(p.net)}</b></div></div>` : '<p class="note">No shifts logged in this pay period yet.</p>'}</section>`;
}
function viewWToday() {
  if (!wkReady()) return `<section class="card"><h2>Set up your pay</h2><p class="note">Add your hourly rate, tax rate and a payday so Hibi can estimate your paychecks.</p><button class="btn block mt" data-act="go" data-to="settings">Set up pay</button></section>${clockCard()}`;
  const P = periodFor(today()), ws = weekStart(Date.now()), wkMin = shiftsSplit().filter(s => keyDate(s.d).getTime() >= ws).reduce((t, s) => t + s.mins, 0) + clockMs() / 6e4;
  return `${clockCard()}${periodCard(P, 'This pay period')}
    <section class="card"><div class="row"><h2>This week</h2><span class="small muted">${hrsTxt(wkMin)} of 40</span></div>
      <div class="cbar mt"><i style="width:${Math.min(100, wkMin / 2400 * 100)}%"></i></div>
      ${S.wk.ot && wkMin > 2400 ? `<p class="note">You're in overtime: ${hrsTxt(wkMin - 2400)} at 1.5×.</p>` : `<p class="note">${wkMin < 2400 ? hrsTxt(2400 - wkMin) + ' until overtime.' : ''}</p>`}</section>`;
}

/* ----- Shifts ----- */
function shiftRow(s) {
  return `<div class="lrow" style="align-items:center"><span style="flex:1;text-align:left;color:var(--ink)"><b>${esc(fmtWd(s.d))}</b><span class="small muted" style="display:block">${esc(fmtTime(s.start))}–${esc(fmtTime(s.end))}${num(s.brk) ? `, ${s.brk} min break` : ''}${s.note ? ' · ' + esc(s.note) : ''}</span></span>
    <span style="text-align:right">${hrsTxt(s.mins)}${s.ot ? ` <small>(${hrsTxt(s.ot)} OT)</small>` : ''}<small>${cash(s.reg / 60 * shRate(s) + s.ot / 60 * shRate(s) * 1.5)}</small></span>
    <span style="display:flex;flex-direction:column;gap:2px;flex:none"><button class="link quiet" data-act="wkEdit" data-id="${esc(s.id)}">Edit</button><button class="link danger" data-act="wkDel" data-id="${esc(s.id)}" data-confirm>Delete</button></span></div>`;
}
function viewWShifts() {
  const ed = UI.edit && UI.edit.kind === 'shift' ? S.wk.shifts.find(s => s.id === UI.edit.id) : null, split = shiftsSplit();
  const periods = []; let k = today(); for (let i = 0; i < 6; i++) { const P = periodFor(k); periods.push(P); k = addDays(P.from, -1); }
  return `<details class="card" ${det('wkForm', !!ed || !S.wk.shifts.length)}><summary class="sum"><h2>${ed ? 'Edit shift' : 'Log a shift'}</h2><span class="small muted">For shifts you didn't clock in for</span></summary>
      <form data-form="shift" class="stack">
        <div class="ff"><label>Date<input class="input" type="date" name="d" value="${ed ? esc(ed.d) : today()}"></label><label>Break (minutes)<input class="input" name="brk" inputmode="numeric" placeholder="0" value="${ed && num(ed.brk) ? esc(ed.brk) : ''}"></label>
          <label>Start<input class="input" type="time" name="start" value="${fval(ed, 'start')}"></label><label>End<input class="input" type="time" name="end" value="${fval(ed, 'end')}"></label></div>
        <input class="input" name="note" placeholder="Note (optional), like opening shift" value="${fval(ed, 'note')}" aria-label="Note">
        <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Add shift'}</button>${ed ? '<button class="btn ghost" type="button" data-act="cancelEdit">Cancel</button>' : ''}</div></form></details>
    <details class="card" ${det('wkBonus')}><summary class="sum"><h2>Add a bonus</h2><span class="small muted">Bonuses, commission or anything extra on a paycheck</span></summary>
      <form data-form="bonus" class="stack"><div class="ff"><label>Date<input class="input" type="date" name="d" value="${today()}"></label><label>Amount<input class="input" name="amt" inputmode="decimal" placeholder="$0"></label></div>
        <input class="input" name="note" placeholder="What it was for (optional)" aria-label="What it was for"><button class="btn" type="submit">Add bonus</button></form></details>
    ${periods.map((P, i) => { const p = payFor(P, split); if (!p.sh.length && !p.bo.length && i) return '';
      return `<h2 class="gsec">${i ? esc(fmtShort(P.from) + ' to ' + fmtShort(P.to)) : 'This pay period'} <span class="small muted">${hrsTxt(p.mins)}, payday ${esc(fmtShort(P.pay))}</span></h2>
        <section class="card">${p.sh.length ? p.sh.slice().reverse().map(shiftRow).join('') : '<p class="note">No shifts yet.</p>'}
        ${p.bo.map(b => `<div class="lrow" style="align-items:center"><span style="flex:1;text-align:left;color:var(--ink)">🎉 <b>Bonus</b>${b.note ? ': ' + esc(b.note) : ''} <span class="small muted">${esc(fmtShort(b.d))}</span></span><span>${cash(num(b.amt))}</span><button class="link danger" data-act="wkDelBonus" data-id="${esc(b.id)}" data-confirm>Delete</button></div>`).join('')}</section>`; }).join('')}`;
}

/* ----- Pay ----- */
function viewWPay() {
  if (!wkReady()) return emptyCard('Set up your pay first', 'Add your hourly rate, tax rate and a payday in Settings.', 'Set up pay', 'data-act="go" data-to="settings"');
  const split = shiftsSplit(), y = new Date().getFullYear(), rows = [];
  let k = today();
  for (let i = 0; i < 60; i++) { const P = periodFor(k); if (keyDate(P.to).getFullYear() < y - 1) break; const p = payFor(P, split); if (p.mins || p.bonus) rows.push([P, p]); k = addDays(P.from, -1); }
  const ytd = rows.filter(([P]) => keyDate(P.pay).getFullYear() === y), sum = f => ytd.reduce((t, [, p]) => t + p[f], 0);
  return `${periodCard(periodFor(today()), 'Next paycheck')}
    <section class="card"><h2>${y} so far</h2>
      <div class="stats"><div class="stat"><b>${fmtN(Math.round(sum('mins') / 60))}</b><span>hours</span></div><div class="stat"><b>${short(Math.round(sum('gross')))}</b><span>before taxes</span></div><div class="stat"><b>${short(Math.round(sum('net')))}</b><span>take-home</span></div></div>
      <p class="note">Counts paychecks paid in ${y}. Taxes are an estimate from your tax rate.</p></section>
    ${rows.length ? `<section class="card"><h2>Paychecks</h2>${rows.map(([P, p]) => `<div class="lrow"><span style="text-align:left;color:var(--ink)"><b>${esc(fmtShort(P.pay))}</b><span class="small muted" style="display:block">${esc(fmtShort(P.from))} to ${esc(fmtShort(P.to))}, ${hrsTxt(p.mins)}</span></span><span>${cash(p.net)}<small>${cash(p.gross)} before taxes</small></span></div>`).join('')}</section>` : ''}
    <p class="note">These are estimates. Your real paycheck can differ because of things like benefits, retirement or how your employer withholds taxes. If it's always off, adjust your tax rate in Settings until it matches.</p>`;
}
function wkSettings() {
  const w = S.wk;
  return `    <section class="card"><h2>Pay</h2><form data-form="wkset" class="stack mt">
      <div class="ff"><label>Hourly rate ($)<input class="input" name="rate" inputmode="decimal" placeholder="15.00" value="${w.rate || ''}"></label><label>Tax rate (%)<input class="input" name="tax" inputmode="decimal" placeholder="12" value="${w.tax || ''}"></label></div>
      <label>How often you get paid<select class="input" name="freq">${WK_FREQ.map(([k, l]) => opt(k, l, w.freq)).join('')}</select></label>
      <div class="ff"><label>A payday (any past or upcoming one)<input class="input" type="date" name="pay" value="${esc(w.pay)}"></label><label>Days between the period ending and payday<input class="input" name="lag" inputmode="numeric" placeholder="0" value="${w.lag || ''}"></label></div>
      <label class="setrow"><span>Overtime at 1.5× after 40 hours a week</span><input type="checkbox" name="ot"${w.ot ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>
      <button class="btn" type="submit">Save</button></form>
      <p class="note">Tax rate: try 10 to 15% to start. Compare with a real paystub (taxes taken out ÷ pay before taxes) and adjust until it matches.</p>
      <p class="note">If your paycheck covers days that ended earlier, like the week before payday, put that number of days in the second box. Leave it at 0 if the pay period runs right up to payday.</p>
      <p class="note">Changing your rate only affects new shifts. Shifts you already logged keep the rate they were logged at.</p></section>
`;
}
function workSubtitle() {
  if (!wkReady()) return 'Hours and pay';
  const P = periodFor(today()); return `Payday ${fmtWd(P.pay)}, ${inDays(P.pay)}`;
}
function workHome() {
  const c = S.wk.clock;
  if (!wkReady() && !c && !S.wk.shifts.length) return '';
  const P = periodFor(today()), p = payFor(P);
  return `<section class="card"><div class="row"><h2>💼 Work</h2><button class="link" data-act="mode" data-k="work">Open</button></div>
    ${c ? `<p class="note">${c.pausedAt ? 'On break' : 'On the clock'}: <b id="workClockHome">${clock(clockMs())}</b></p>` : ''}
    ${wkReady() ? `<p class="note">${hrsTxt(p.mins)} this pay period, about <b>${cash(p.net)}</b> take-home. Payday ${esc(inDays(P.pay))}.</p>` : ''}
    <button class="btn sm ${c ? '' : 'ghost'} mt" data-act="${c ? 'wkOut' : 'wkIn'}">${c ? 'Clock out' : '⏱ Clock in'}</button></section>`;
}
function workTick() {
  if (!S.wk || !S.wk.clock) return;
  const t = clock(clockMs()), a = $('#workClock'), b = $('#workClockHome'), e = $('#workEarn');
  if (a) a.textContent = t; if (b) b.textContent = t; if (e) e.textContent = `About ${cash(clockMs() / 36e5 * S.wk.rate)} so far, before taxes`;
}
Object.assign(MVIEWS, {wtoday:viewWToday, wshifts:viewWShifts, wpay:viewWPay});
const hhmm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
Object.assign(MACT, {
  wkIn: () => { S.wk.clock = {start:Date.now(), pausedMs:0, pausedAt:0}; toast('Clocked in. Have a good shift!'); },
  wkBreak: () => { togglePause(S.wk.clock); toast(S.wk.clock.pausedAt ? 'Break started.' : 'Break over.'); },
  wkOut: () => {
    const c = S.wk.clock; if (!c) return false;
    if (c.pausedAt) togglePause(c);
    const st = new Date(c.start), en = new Date(), brk = Math.round((c.pausedMs || 0) / 6e4);
    S.wk.clock = null;
    if (en - st < 60000) { toast('That shift was under a minute, so it wasn\'t saved.'); return; }
    const s = {id:'w' + Date.now(), d:dk(st), start:hhmm(st), end:hhmm(en), brk, note:'', rate:S.wk.rate};
    S.wk.shifts.push(s); toast(`Clocked out. ${hrsTxt(shiftMin(s))} logged${wkReady() ? `, about ${cash(shiftMin(s) / 60 * S.wk.rate)} before taxes` : ''}.`);
  },
  payFromWork: d => { const el = $('#payAmt'); if (el) { el.value = d.v; $('#payPrev').innerHTML = payPreview(num(d.v)); } return false; },
  wkCancel: () => { S.wk.clock = null; toast('Shift canceled.'); },
  wkEdit: d => { UI.edit = {kind:'shift', id:d.id}; UI.open.wkForm = true; scrollTo(0, 0); },
  wkDel: d => { S.wk.shifts = S.wk.shifts.filter(s => s.id !== d.id); },
  wkDelBonus: d => { S.wk.bonus = S.wk.bonus.filter(b => b.id !== d.id); },
});
Object.assign(SAVE, {
  shift: o => {
    if (!o.d || !o.start || !o.end) { toast('Add the date, start and end time.'); return false; }
    const rec = {d:o.d, start:o.start, end:o.end, brk:Math.max(0, Math.round(num(o.brk))), note:o.note || ''};
    const ed = UI.edit && UI.edit.kind === 'shift' ? S.wk.shifts.find(s => s.id === UI.edit.id) : null;
    if (ed) { Object.assign(ed, rec); toast('Shift updated.'); } else { S.wk.shifts.push(Object.assign(rec, {id:'w' + Date.now(), rate:S.wk.rate})); toast(`Shift added: ${hrsTxt(shiftMin(rec))}.`); }
    UI.open.wkForm = false;
  },
  bonus: o => { const amt = num(o.amt); if (!o.d || !(amt > 0)) { toast('Add the date and amount.'); return false; } S.wk.bonus.push({id:'b' + Date.now(), d:o.d, amt, note:o.note || ''}); toast(`Bonus of ${cash(amt)} added. Nice!`); UI.open.wkBonus = false; },
  wkset: o => {
    const w = S.wk, oldRate = w.rate;
    w.rate = Math.max(0, num(o.rate)); w.tax = Math.max(0, Math.min(60, num(o.tax))); w.freq = o.freq || 'biweekly'; w.pay = o.pay || ''; w.lag = Math.max(0, Math.round(num(o.lag))); w.ot = o.ot === 'on';
    if (!oldRate && w.rate) w.shifts.forEach(s => { if (!num(s.rate)) s.rate = w.rate; });
    toast('Pay settings saved.');
  },
});
