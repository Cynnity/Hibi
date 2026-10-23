// Hibi: Ideas for Hibi. A quick list for jotting down ideas and fixes, then copying them all to paste to Claude.
'use strict';
/* =========================================================
   Ideas for Hibi
   ========================================================= */
function normalizeIdeas(s) { if (!Array.isArray(s.ideas)) s.ideas = []; }
normalizeIdeas(S);
const ideasOpen = () => S.ideas.filter(x => !x.done);
function ideasCard() {
  const open = ideasOpen(), done = S.ideas.filter(x => x.done);
  return `    <section class="card" id="ideas"><div class="row"><h2>💡 Ideas for Hibi</h2><span class="small muted">${open.length} to send</span></div>
      <p class="note">Jot down ideas and fixes as they come to you. When you have a batch, tap Copy all and paste it to Claude.</p>
      <form data-form="idea" class="field mt"><input class="input" name="t" placeholder="Like: rest timer is too loud" autocomplete="off" aria-label="New idea"><button class="btn" type="submit">Add</button></form>
      ${open.map(x => swipeWrap(`<div class="lrow" style="align-items:center"><button class="check sm" aria-pressed="false" aria-label="Mark sent: ${esc(x.t)}" data-act="ideaDone" data-id="${esc(x.id)}">${ICON_CHECK}</button>
        <span style="flex:1;text-align:left;color:var(--ink)">${esc(x.t)}<small class="muted" style="display:block">${esc(MODES[x.m] ? MODES[x.m].em + ' ' + MODES[x.m].label + ' · ' : '')}${esc(fmtMD(new Date(x.at)))}</small></span>
        <button class="link danger" data-act="ideaDel" data-id="${esc(x.id)}" aria-label="Delete idea">✕</button></div>`, {r:['ideaDone', 'Sent'], l:['ideaDel', 'Delete'], data:{id:x.id}})).join('')}
      ${open.length ? `<div class="btns mt"><button class="btn" style="flex:1" data-act="ideaCopy">📋 Copy all (${open.length})</button></div>` : ''}
      ${done.length ? `<details class="mt" ${det('ideasDone')}><summary class="link">Sent (${done.length})</summary>${done.slice().reverse().map(x => `<div class="lrow"><span class="muted" style="text-align:left;text-decoration:line-through">${esc(x.t)}</span><button class="link quiet" data-act="ideaDone" data-id="${esc(x.id)}">Undo</button></div>`).join('')}
        <button class="link danger mt" data-act="ideaClear" data-confirm>Clear sent ideas</button></details>` : ''}</section>
`;
}
WIDGETS.ideas = {n:'Ideas for Hibi', em:'💡', d:'How many ideas you have waiting to send', sizes:['s'], tap:'data-act="ideaOpen"',
  s:() => small('💡', 'Ideas', ideasOpen().length, ideasOpen().length ? 'waiting to send' : 'Tap to add one')};
Object.assign(XACT, {
  ideaOpen: () => { S.lastMode[S.mode] = S.tab; go('settings'); setTimeout(() => { const el = $('#ideas'); if (el) { el.scrollIntoView({behavior:'smooth', block:'start'}); const i = el.querySelector('input'); if (i) i.focus(); } }, 80); },
  ideaDone: d => { const x = S.ideas.find(i => i.id === d.id); if (x) x.done = !x.done; },
  ideaDel: d => { S.ideas = S.ideas.filter(i => i.id !== d.id); },
  ideaClear: () => { S.ideas = S.ideas.filter(i => !i.done); },
  ideaCopy: () => {
    const L = ideasOpen(); if (!L.length) return false;
    const text = `Hibi ideas and fixes (version ${APP_VERSION}):\n` + L.map((x, i) => `${i + 1}. ${x.t}${MODES[x.m] ? ` [${MODES[x.m].label}]` : ''}`).join('\n');
    try { navigator.clipboard.writeText(text).then(() => toast('Copied! Paste it to Claude, then tick them off.'), () => toast("Couldn't copy here.")); } catch (e) { toast("Couldn't copy here."); }
    return false;
  },
});
Object.assign(SAVE, {idea: o => { const t = (o.t || '').trim(); if (!t) return false; S.ideas.push({id:'i' + Date.now(), t:t.slice(0, 500), m:S.mode, at:Date.now()}); toast('Idea saved 💡'); setTimeout(() => { const i = $('#ideas input'); if (i) i.focus(); }, 60); }});
