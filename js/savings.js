// Hibi: Savings mode.
'use strict';
/* =========================================================
   Savings mode
   ========================================================= */
Object.assign(ICON, {
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'});
MODES.save = {label:'Savings', em:'💰', nav:[['vgoals','Goals','target'],['vadd','New goal','plus'],['vhist','History','clock'],['settings','Settings','settings']]};
Object.assign(TAB_INFO, {vgoals:{g:'vgoals',t:'Savings goals'}, vadd:{g:'vadd',t:'New goal'}, vhist:{g:'vhist',t:'History'}});
Object.assign(GROUPS, {vgoals:['vgoals'], vadd:['vadd'], vhist:['vhist']});
const SV_EMOJI = ['🎤','🎨','🚗','💍','✈️','🎮','📱','💻','🏠','🎁','🛟','⭐'];
const SV_SUGGEST = [['🎤','Ado VIP tickets',1000,''],['🎨','Profile picture commission',300,''],['💍','Arkansas wedding trip',0,'2027-11-06'],['🚗','Toyota Corolla SE',0,''],['🛟','Emergency fund',1000,'']];
const SV_FREQ = {weekly:[7,'week','Every week'], biweekly:[14,'paycheck','Every 2 weeks'], semimonthly:[15.22,'paycheck','Twice a month'], monthly:[30.44,'month','Once a month']};
function normalizeSv(s) {
  if (!s.sv || typeof s.sv !== 'object') s.sv = {};
  if (!Array.isArray(s.sv.goals)) s.sv.goals = [];
  if (!Array.isArray(s.sv.tx)) s.sv.tx = [];
  if (!SV_FREQ[s.sv.freq]) s.sv.freq = 'biweekly';
}
const usd = a => money(a, 'USD');
const svGoal = id => S.sv.goals.find(g => g.id === id);
const svSaved = g => S.sv.tx.filter(t => t.g === g.id).reduce((a, t) => a + num(t.amt), 0);
const svDone = g => num(g.target) > 0 && svSaved(g) >= num(g.target);
function svPlan(g) {
  const s = svSaved(g), target = num(g.target), left = Math.max(0, target - s);
  if (!target) return 'No target amount set.';
  if (left <= 0) return num(g.dream) > s ? `Minimum reached! ${usd(num(g.dream) - s)} more for your dream amount.` : 'Goal reached!';
  const [days, word] = SV_FREQ[S.sv.freq];
  if (g.date) {
    const dd = (keyDate(g.date) - keyDate(today())) / 864e5;
    if (dd <= 0) return `The target date has passed. ${usd(left)} to go.`;
    const n = Math.max(1, Math.ceil(dd / days));
    return `Save <b>${usd(left / n)} per ${word}</b> to reach it by ${esc(fmtMD(keyDate(g.date)))}${keyDate(g.date).getFullYear() !== new Date().getFullYear() ? ', ' + keyDate(g.date).getFullYear() : ''}.`;
  }
  const since = Date.now() - 60 * 864e5, perDay = S.sv.tx.filter(t => t.g === g.id && num(t.amt) > 0 && keyDate(t.d).getTime() >= since).reduce((a, t) => a + num(t.amt), 0) / 60;
  if (perDay > 0) {
    const d = new Date(); d.setDate(d.getDate() + Math.ceil(left / perDay));
    return `${usd(left)} to go. At your recent pace, you'll get there around <b>${esc(fmtMD(d))}${d.getFullYear() !== new Date().getFullYear() ? ', ' + d.getFullYear() : ''}</b>.`;
  }
  return `${usd(left)} to go. Add a target date to see how much to save each ${word}.`;
}
function svAdd(gid, amt, note) {
  const g = svGoal(gid); if (!g || !amt) return false;
  const before = svSaved(g);
  if (amt < 0 && before + amt < -0.001) { toast(`Only ${usd(before)} is saved in ${g.name}.`); return false; }
  S.sv.tx.push({id:'t' + Date.now(), g:gid, amt, d:today(), note:note || ''});
  const after = before + amt, target = num(g.target);
  if (target && before < target && after >= target) { g.done = Date.now(); toast(`🎉 Goal reached: ${g.name}!`); }
  else { if (target && after < target) g.done = null; toast(`${amt > 0 ? 'Added' : 'Took out'} ${usd(Math.abs(amt))} ${amt > 0 ? 'to' : 'from'} ${g.name}.`); }
}
function goalCard(g) {
  const s = svSaved(g), target = num(g.target), pct = target ? Math.min(100, Math.round(s / target * 100)) : 0;
  return `<section class="card"><div class="row"><div class="mhead"><span class="gem" aria-hidden="true">${esc(g.em || '💰')}</span><div><h3>${esc(g.name)}</h3>
      <span class="small muted">${usd(s)}${target ? ` of ${usd(target)}` : ' saved'}</span></div></div>${target ? `<b>${pct}%</b>` : ''}</div>
    ${target ? `<div class="meter"><i style="width:${pct}%"></i></div>` : ''}
    ${num(g.dream) > target && target ? `<p class="small mt">Dream amount <b>${usd(num(g.dream))}</b>: ${Math.min(100, Math.round(s / num(g.dream) * 100))}% there</p><div class="cbar"><i style="width:${Math.min(100, s / num(g.dream) * 100)}%;background:var(--accent-2)"></i></div>` : ''}
    ${g.jp ? '<p class="small mt">🗾 Counts toward your Japan trip budget</p>' : ''}
    <p class="note">${svPlan(g)}</p>
    ${svDone(g) && !(num(g.dream) > s) ? '' : `<div class="chips mt">${[5, 10, 20, 50, 100].map(v => `<button class="chip" data-act="sQuick" data-id="${esc(g.id)}" data-v="${v}">+$${v}</button>`).join('')}</div>`}
    <details class="mt" ${det('sv-' + g.id)}><summary class="link">Other amount, notes and edit</summary>
      <form data-form="sdep" class="stack mt"><input type="hidden" name="g" value="${esc(g.id)}">
        <div class="field"><select class="input" name="kind" aria-label="Add or take out" style="flex:0 0 130px">${opt('in', 'Add', 'in')}${opt('out', 'Take out', 'in')}</select>
          <input class="input" name="amt" inputmode="decimal" placeholder="Amount in $" aria-label="Amount in dollars"></div>
        <input class="input" name="note" placeholder="Note, like birthday money (optional)" aria-label="Note">
        <button class="btn" type="submit">Save</button></form>
      ${g.notes ? `<p class="small muted mt">${esc(g.notes).replace(/\n/g, '<br>')}</p>` : ''}
      ${g.link ? `<a class="maplink" style="display:inline-block;margin-top:8px" href="${esc(safeUrl(g.link))}" target="_blank" rel="noopener">Open link</a>` : ''}
      <div class="row mt"><button class="link" data-act="sEdit" data-id="${esc(g.id)}">Edit goal</button>${archBtn('goal', g)}<button class="link danger" data-act="sDel" data-id="${esc(g.id)}" data-confirm>Delete goal</button></div></details></section>`;
}
function viewVGoals() {
  const G = S.sv.goals;
  if (!G.length) return emptyCard('No goals yet', 'Make one for anything you\'re saving up for.', 'Make a goal', 'data-act="go" data-to="vadd"');
  const LG = G.filter(live), active = LG.filter(g => !svDone(g)), reached = LG.filter(svDone);
  const savedAll = G.reduce((a, g) => a + svSaved(g), 0), targetActive = active.reduce((a, g) => a + num(g.target), 0), savedActive = active.reduce((a, g) => a + svSaved(g), 0);
  const ms = new Date(); ms.setDate(1); const mk = dk(ms);
  const month = S.sv.tx.filter(t => t.d >= mk).reduce((a, t) => a + num(t.amt), 0);
  return `<section class="card"><h2>Overview</h2>
      <div class="stats"><div class="stat"><b>${usd(savedAll)}</b><span>saved in total</span></div><div class="stat"><b>${month >= 0 ? '+' : '−'}${usd(Math.abs(month))}</b><span>this month</span></div><div class="stat"><b>${active.length}</b><span>${active.length === 1 ? 'goal' : 'goals'} in progress</span></div></div>
      ${targetActive ? `<div class="meter"><i style="width:${Math.min(100, savedActive / targetActive * 100)}%"></i></div><p class="note">${usd(savedActive)} of ${usd(targetActive)} across your active goals.</p>` : ''}
      ${active.length ? `<details class="mt" ${det('payday')}><summary class="link">💵 Payday: split money across your goals</summary>
        <form data-form="payday" class="stack mt"><div class="field"><input class="input" name="amt" id="payAmt" inputmode="decimal" placeholder="Amount to save, in $" aria-label="Amount to save" autocomplete="off"><button class="btn" type="submit">Save</button></div>
        <div id="payPrev"></div><p class="note">It splits by each goal's payday share if you set one. Otherwise it uses what each dated goal needs per paycheck, or splits evenly.</p></form></details>` : ''}</section>
    ${active.map(goalCard).join('')}
    ${reached.length ? `<h2 class="sec">Reached 🎉</h2>${reached.map(goalCard).join('')}` : ''}
    ${archSection('goal', 'goals', g => (g.em || '💰') + ' ' + g.name + ', ' + usd(svSaved(g)) + ' saved')}`;
}
function viewVAdd() {
  const ed = UI.edit && UI.edit.kind === 'goal' ? svGoal(UI.edit.id) : null, pre = !ed && UI.svPre ? UI.svPre : null, v = ed || pre || {};
  const em = v.em || '💰';
  return `${!ed ? `<section class="card"><h2>Ideas</h2><div class="chips mt">${SV_SUGGEST.map((x, i) => chip(x[0] + ' ' + x[1], pre && pre.name === x[1], `data-act="sPre" data-i="${i}"`)).join('')}</div></section>` : ''}
    <section class="card"><h2>${ed ? 'Edit ' + esc(ed.name) : 'New goal'}</h2><form data-form="sgoal" class="stack mt">
      <input class="input" name="name" placeholder="What you're saving for" value="${esc(v.name || '')}" aria-label="Goal name">
      <span class="label">Icon</span><div class="chips">${[...new Set([em, ...SV_EMOJI])].map(e => `<label class="emo"><input type="radio" name="em" value="${e}"${e === em ? ' checked' : ''}><span>${e}</span></label>`).join('')}</div>
      <div class="ff"><label>Target amount ($)<input class="input" name="target" inputmode="decimal" placeholder="1000" value="${v.target || ''}"></label>
        <label>Target date (optional)<input class="input" type="date" name="date" value="${esc(v.date || '')}"></label></div>
      <div class="ff"><label>Dream amount ($)<input class="input" name="dream" inputmode="decimal" placeholder="Optional stretch" value="${v.dream || ''}"></label>
        <label>Payday share (%)<input class="input" name="pct" inputmode="decimal" placeholder="Optional" value="${v.pct || ''}"></label></div>
      <label class="setrow"><span>Counts toward my Japan trip budget</span><input type="checkbox" name="jp"${v.jp ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>
      ${ed ? '' : '<label class="ff one"><span class="small muted" style="font-weight:700">Already saved ($)</span><input class="input" name="start" inputmode="decimal" placeholder="0"></label>'}
      <input class="input" name="link" placeholder="Link, like the ticket or product page (optional)" value="${esc(v.link || '')}" inputmode="url" autocapitalize="off" aria-label="Link">
      <textarea class="input" name="notes" style="min-height:80px" placeholder="Notes (optional)" aria-label="Notes">${esc(v.notes || '')}</textarea>
      <div class="btns"><button class="btn" type="submit">${ed ? 'Save changes' : 'Create goal'}</button>${ed ? '<button class="btn ghost" type="button" data-act="sCancel">Cancel</button>' : ''}</div></form></section>`;
}
function viewVHist() {
  const T = S.sv.tx.slice().sort((a, b) => b.d.localeCompare(a.d) || b.id.localeCompare(a.id));
  if (!T.length) return emptyCard('Nothing saved yet', 'Money you add or take out of a goal shows up here.');
  const months = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return d; });
  const totals = months.map(d => { const k = dk(d).slice(0, 7); return S.sv.tx.filter(t => t.d.slice(0, 7) === k && num(t.amt) > 0).reduce((a, t) => a + num(t.amt), 0); });
  const mx = Math.max(1, ...totals);
  const byDate = {}; T.forEach(t => (byDate[t.d] = byDate[t.d] || []).push(t));
  return `<section class="card"><h2>Saved each month</h2><div class="bars" role="img" aria-label="Money added each month for the last 6 months">${months.map((d, i) =>
      `<div class="b"><div class="col"><span>${totals[i] ? '$' + short(totals[i]) : ''}</span><i style="height:${Math.max(3, totals[i] / mx * 100)}%"></i></div><em>${d.toLocaleDateString(undefined, {month:'short'})}</em></div>`).join('')}</div></section>
    ${Object.keys(byDate).map(d => `<section class="card"><h3>${esc(fmtDay(d))}</h3>${byDate[d].map(t => { const g = svGoal(t.g), a = num(t.amt);
      return `<div class="pk"><span class="gem sm" aria-hidden="true">${esc(g ? g.em || '💰' : '❔')}</span><span><b>${esc(g ? g.name : 'Deleted goal')}</b>${t.note ? `<span class="small muted" style="display:block">${esc(t.note)}</span>` : ''}</span>
        <b style="color:${a >= 0 ? 'var(--good)' : 'var(--danger)'}">${a >= 0 ? '+' : '−'}${usd(Math.abs(a))}</b><button class="link quiet" data-act="sTxDel" data-id="${esc(t.id)}" data-confirm aria-label="Delete this entry">✕</button></div>`; }).join('')}</section>`).join('')}`;
}
const svSettings = () => `    <section class="card"><h2>Savings</h2>
      <label class="setrow"><span>How often you get paid</span><select class="input" data-bind="svfreq">${Object.entries(SV_FREQ).map(([k, v]) => opt(k, v[2], S.sv.freq)).join('')}</select></label>
      <p class="note">Used to work out how much to save each paycheck for goals with a target date.</p></section>
`;
const SVIEWS = {vgoals:viewVGoals, vadd:viewVAdd, vhist:viewVHist};
const SACT = {
  sQuick: d => svAdd(d.id, +d.v),
  sDel: d => { S.sv.goals = S.sv.goals.filter(g => g.id !== d.id); S.sv.tx = S.sv.tx.filter(t => t.g !== d.id); },
  sTxDel: d => { S.sv.tx = S.sv.tx.filter(t => t.id !== d.id); },
  sEdit: d => { UI.edit = {kind:'goal', id:d.id}; go('vadd'); },
  sCancel: () => { UI.edit = null; go('vgoals'); },
  sPre: d => { const x = SV_SUGGEST[+d.i]; UI.svPre = {em:x[0], name:x[1], target:x[2] || '', date:x[3]}; },
};
Object.assign(SAVE, {
  sgoal: o => {
    if (!o.name) { toast('Name your goal first.'); return false; }
    const rec = {name:o.name, em:o.em || '💰', target:num(o.target), date:o.date || '', link:o.link || '', notes:o.notes || '', dream:num(o.dream), pct:num(o.pct), jp:o.jp === 'on'};
    const ed = UI.edit && UI.edit.kind === 'goal' ? svGoal(UI.edit.id) : null;
    if (ed) { Object.assign(ed, rec); toast('Goal updated.'); }
    else {
      const g = Object.assign(rec, {id:'v' + Date.now(), created:Date.now()}); S.sv.goals.push(g);
      const st = num(o.start); if (st > 0) S.sv.tx.push({id:'t' + Date.now(), g:g.id, amt:st, d:today(), note:'Starting amount'});
      toast(`Created ${g.name}.`);
    }
    UI.svPre = null; go('vgoals');
  },
  sdep: o => {
    const a = num(o.amt); if (!(a > 0)) { toast('Enter an amount.'); return false; }
    return svAdd(o.g, o.kind === 'out' ? -a : a, o.note);
  }});
