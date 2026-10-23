// Hibi: Flashcards in School › Study. Decks you import from a text file, and Flashcards, Learn, Test, Match and Review modes.
'use strict';
/* =========================================================
   Flashcards
   ========================================================= */
// School's Notes tab becomes Study, with Flashcards and Notes inside it
{ const n = MODES.school.nav.find(x => x[0] === 'knotes'); if (n) { n[1] = 'Study'; n[2] = 'book2'; } }
Object.assign(ICON, {book2:'<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>'});
Object.assign(TAB_INFO, {kstudy:{g:'knotes', t:'Flashcards'}});
TAB_INFO.knotes.t = 'Notes';
GROUPS.knotes = ['kstudy', 'knotes'];

const FC_GAP = [0, 1, 2, 4, 8, 16];   // days until a card comes back, by how well you know it (box 0 to 5)
function normalizeFc(s) {
  if (!s.fc || typeof s.fc !== 'object') s.fc = {};
  const F = s.fc;
  if (!Array.isArray(F.decks)) F.decks = [];
  F.decks.forEach(d => { if (!Array.isArray(d.cards)) d.cards = []; if (!d.best || typeof d.best !== 'object') d.best = {};
    d.cards.forEach(c => { if (typeof c.box !== 'number') c.box = 0; if (typeof c.due !== 'string') c.due = ''; c.r = c.r || 0; c.w = c.w || 0; }); });
  if (!F.st || typeof F.st !== 'object') F.st = {};
  for (const k of ['seen', 'perfect', 'learned']) if (typeof F.st[k] !== 'number') F.st[k] = 0;
  if (typeof F.st.match !== 'number') F.st.match = 0;   // fastest Match time ever, in tenths of a second
  if (!F.opt || typeof F.opt !== 'object') F.opt = {};
  if (!['d', 't'].includes(F.opt.ans)) F.opt.ans = 'd';  // d: see the term, answer with the definition. t: the other way around.
  if (typeof F.opt.shuf !== 'boolean') F.opt.shuf = true;
}
const fcDeck = id => S.fc.decks.find(d => d.id === id);
function fcFind(id) { for (const d of S.fc.decks) { const c = d.cards.find(x => x.id === id); if (c) return {d, c}; } return null; }
const fcUid = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fcDue = c => !!c.due && c.due <= today();
const fcKnown = c => c.box >= 3;
const fcAllDue = () => S.fc.decks.flatMap(d => d.cards.filter(fcDue));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function fcGrade(c, ok) {
  if (ok) { c.box = Math.min(5, c.box + 1); c.r++; } else { c.box = 0; c.w++; }
  c.due = addDays(today(), FC_GAP[c.box] || 0) ; if (!ok) c.due = today();
  S.fc.st.seen++; logAct('fc', 1);
}

/* ----- Reading a text file into decks ----- */
// One card per line: term, then a tab (Quizlet export), " :: ", " | ", or the first " - ", ": " or " = ".
// "# Name" starts a new deck. Indented lines add to the card above.
function fcParse(text, name) {
  const decks = []; let cur = null, last = null;
  const start = n => { cur = {name:n, cards:[]}; decks.push(cur); last = null; };
  String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n').forEach(raw => {
    const line = raw.replace(/\s+$/, ''), t = line.trim();
    if (!t) { last = null; return; }
    const h = /^#{1,3}\s+(.+)$/.exec(t); if (h) { start(h[1].trim().slice(0, 80)); return; }
    if (/^\/\//.test(t)) return;
    if (last && /^\s/.test(raw)) { last.d += '\n' + t; return; }
    let i = -1, sep = '';
    for (const s of ['\t', ' :: ', ' | ']) { const k = line.indexOf(s); if (k > 0) { i = k; sep = s; break; } }
    if (i < 0) for (const s of [' — ', ' – ', ' - ', ': ', ' = ']) { const k = line.indexOf(s); if (k > 0 && (i < 0 || k < i)) { i = k; sep = s; } }
    if (i < 0) { if (last) last.d += '\n' + t; return; }
    const term = line.slice(0, i).replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim(), def = line.slice(i + sep.length).trim();
    if (!term || !def) return;
    if (!cur) start(name || 'New deck');
    last = {t:term.slice(0, 500), d:def.slice(0, 2000)}; cur.cards.push(last);
  });
  return decks.filter(d => d.cards.length);
}
function fcImport(text, name, cls) {
  const L = fcParse(text, name);
  if (!L.length) { toast('No cards found. Put one card per line, like: term - definition'); return 0; }
  let n = 0;
  L.forEach(x => { S.fc.decks.push({id:fcUid(), name:x.name, c:cls || '', created:Date.now(), best:{}, cards:x.cards.map(c => ({id:fcUid(), t:c.t, d:c.d, box:0, due:'', r:0, w:0}))}); n += x.cards.length; });
  UI.fcDeck = L.length === 1 ? S.fc.decks[S.fc.decks.length - 1].id : null; UI.open.fcImp = false;
  toast(L.length === 1 ? `Imported ${plural(n, 'card')} into ${L[0].name}.` : `Imported ${plural(L.length, 'deck')} with ${plural(n, 'card')}.`);
  return n;
}

/* ----- Answers ----- */
const fcNorm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\b(the|a|an)\b/g, ' ').replace(/[^a-z0-9µω×÷+\-=/.%²³]+/g, ' ').replace(/\s+/g, ' ').trim();
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 8) return 99;
  let p = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) { const c = [i]; for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
  return p[b.length];
}
const FC_STOP = new Set(['that', 'this', 'with', 'from', 'into', 'than', 'then', 'they', 'them', 'have', 'which', 'what', 'when', 'your', 'also', 'used', 'like', 'each', 'because']);
const fcKeys = s => fcNorm(s).split(' ').filter(w => /\d/.test(w) || (w.length >= 4 && !FC_STOP.has(w)));
// Lenient: ignores case, accents, punctuation, small typos and anything in brackets, and accepts any part split by ; or /
function fcOk(given, ans) {
  const g = fcNorm(given); if (!g) return false;
  const raw = String(ans), alts = [raw, raw.replace(/\([^)]*\)/g, ' '), ...(raw.match(/\(([^)]*)\)/g) || []).map(x => x.slice(1, -1)), ...raw.split(/\s*[;/]\s*|\s*,\s*or\s+/)];
  return alts.some(x => { const a = fcNorm(x); if (!a) return false;
    if (g === a || lev(g, a) <= Math.max(1, Math.floor(a.length * .15))) return true;
    const sq = v => v.replace(/[\s×·]/g, ''), sg = sq(g), sa = sq(a); if (sa && (sg === sa || (sa.length > 3 && lev(sg, sa) <= 1))) return true;
    const K = fcKeys(x), G = fcKeys(given); if (K.length < 2) return false;
    const hit = K.filter(k => G.some(w => w === k || (k.length > 4 && lev(w, k) <= 1) || (k.length > 5 && w.length > 5 && w.slice(0, 4) === k.slice(0, 4)))).length;
    return hit / K.length >= .8; });
}
// Which side is the question for this card (asks for the term when the answer would be too long to type)
const fcAsk = (c, typing) => { const ans = S.fc.opt.ans === 't' || (typing && c.d.length > 60) ? 't' : 'd'; return ans === 'd' ? {q:c.t, a:c.d, ql:'Term', al:'Definition'} : {q:c.d, a:c.t, ql:'Definition', al:'Term'}; };
function fcOptions(c, all, n) {
  const k = fcAsk(c).al === 'Definition' ? 'd' : 't';
  const others = shuffle(all.filter(x => x.id !== c.id && fcNorm(x[k]) !== fcNorm(c[k]))).slice(0, (n || 4) - 1).map(x => x[k]);
  return shuffle([c[k], ...others]);
}

/* ----- Deck list ----- */
function viewKStudy() {
  if (UI.fc) return fcSession();
  const D = UI.fcDeck && fcDeck(UI.fcDeck); if (D) return fcDeckView(D);
  const due = fcAllDue();
  return `${due.length ? `<section class="card" style="border-color:var(--accent)"><div class="row"><div><h2>🔁 ${plural(due.length, 'card')} to review</h2><span class="small muted">Cards come back right before you'd forget them.</span></div>
      <button class="btn" data-act="fcStart" data-m="review">Review</button></div></section>` : ''}
    ${S.fc.decks.length ? `<div class="fcdecks">${S.fc.decks.map(d => { const k = d.cards.filter(fcKnown).length, du = d.cards.filter(fcDue).length, c = kClass(d.c);
      return `<button class="fcdeck" data-act="fcOpen" data-id="${esc(d.id)}"><b>${esc(d.name)}</b><span class="small muted">${c ? `<span class="cdot" style="background:${esc(c.color)}"></span>${esc(c.name)} · ` : ''}${plural(d.cards.length, 'card')}${du ? ` · <b style="color:var(--accent)">${du} due</b>` : ''}</span>
        <div class="meter"><i style="width:${d.cards.length ? k / d.cards.length * 100 : 0}%"></i></div><span class="small muted">${d.cards.length ? Math.round(k / d.cards.length * 100) : 0}% known</span></button>`; }).join('')}</div>`
      : emptyCard('No flashcards yet', 'Import a deck from a text file, paste one in, or turn any note into flashcards.')}
    <details class="card" ${det('fcImp', !S.fc.decks.length)}><summary class="sum"><h2>Add a deck</h2><span class="small muted">From a file, pasted text or from scratch</span></summary>
      <form data-form="fcimp" class="stack">
        <div class="ff"><label>Deck name<input class="input" name="name" placeholder="Like DC Circuits ch. 3"></label><label>Class<select class="input" name="c">${kClassOpts('')}</select></label></div>
        <label class="btn ghost file-btn">📄 Import a text file<input type="file" accept=".txt,.tsv,.csv,.md,text/plain" data-file="fcimport" aria-label="Import a flashcard text file"></label>
        <textarea class="input" name="text" style="min-height:130px;font-size:14px" placeholder="Or paste cards here, one per line:&#10;Ohm's law - V = I × R&#10;Unit of resistance - Ohm (Ω)" aria-label="Cards to import"></textarea>
        <div class="btns"><button class="btn" type="submit">Add cards</button><button class="btn ghost" type="button" data-act="fcBlank">Start an empty deck</button></div></form>
      <details class="mt" ${det('fcHow')}><summary class="link">How to make a flashcard file</summary>
        <p class="note">One card per line. Put the term, then a dash, colon, tab or " :: ", then the definition. A line that starts with # starts a new deck, so one file can hold several decks. Quizlet exports work too.</p>
        <pre class="fcpre"># EET 1015 Chapter 3
Ohm's law :: V = I × R
Unit of resistance :: Ohm (Ω)
Series resistors :: R = R1 + R2 + R3</pre>
        <p class="note">Easiest way: send your notes, slides or a photo of them to Claude and ask for a Hibi flashcard file. You can also turn any note into cards from the Notes tab.</p></details></details>`;
}

/* ----- One deck ----- */
function fcDeckView(D) {
  const k = D.cards.filter(fcKnown).length, du = D.cards.filter(fcDue).length, st = D.cards.filter(c => c.star).length, O = S.fc.opt, ed = UI.fcEdit && D.cards.find(c => c.id === UI.fcEdit);
  const n = D.cards.length, modes = [['flash', '🃏', 'Flashcards', 'Flip through and sort'], ['learn', '🧠', 'Learn', 'Multiple choice, then typing'], ['test', '📝', 'Test', 'A graded practice test'], ['match', '⚡', 'Match', 'Race to pair them up']];
  return `<button class="link mb" data-act="fcBack">‹ All decks</button>
    <section class="card"><h2>${esc(D.name)}</h2>
      <div class="stats"><div class="stat"><b>${n}</b><span>cards</span></div><div class="stat"><b>${n ? Math.round(k / n * 100) : 0}%</b><span>known</span></div><div class="stat"><b>${du}</b><span>due today</span></div></div>
      ${D.best.match ? `<p class="note">Best Match time: <b>${(D.best.match / 10).toFixed(1)} s</b>${D.best.test != null ? ` · Best test: <b>${D.best.test}%</b>` : ''}</p>` : D.best.test != null ? `<p class="note">Best test: <b>${D.best.test}%</b></p>` : ''}</section>
    ${n ? `<div class="fcmodes">${modes.map(([m, e, l, s]) => `<button class="fcmode" data-act="fcStart" data-m="${m}" data-id="${esc(D.id)}"${m === 'match' && n < 2 || m === 'learn' && n < 1 ? ' disabled' : ''}><i>${e}</i><b>${l}</b><span>${s}</span></button>`).join('')}</div>
      ${du ? `<button class="btn block mb" data-act="fcStart" data-m="review" data-id="${esc(D.id)}">🔁 Review ${plural(du, 'due card')}</button>` : ''}
      <div class="chips mb">${chip('🔀 Shuffle', O.shuf, 'data-act="fcOpt" data-k="shuf"')}${st ? chip(`⭐ Starred only (${st})`, !!UI.fcStar, 'data-act="fcStarOnly"') : ''}${chip(O.ans === 'd' ? 'Show term first' : 'Show definition first', true, 'data-act="fcOpt" data-k="ans"')}</div>` : ''}
    <section class="card"><div class="row"><h2>Cards</h2><span class="small muted">${n ? 'Swipe left to delete' : ''}</span></div>
      ${D.cards.map(c => swipeWrap(`<div class="fcrow"><button class="fcst${c.star ? ' on' : ''}" data-act="fcStar" data-id="${esc(c.id)}" aria-label="${c.star ? 'Unstar' : 'Star'} ${esc(c.t)}" aria-pressed="${!!c.star}">${c.star ? '★' : '☆'}</button>
        <div><b>${esc(c.t)}</b><span>${esc(c.d)}</span></div><span class="fclv" title="How well you know it">${'●'.repeat(Math.min(5, c.box))}${'○'.repeat(5 - Math.min(5, c.box))}</span>
        <button class="link" data-act="fcEditCard" data-id="${esc(c.id)}">Edit</button></div>`, {l:['fcDelCard', 'Delete'], data:{id:c.id}})).join('') || '<p class="note">No cards yet. Add some below.</p>'}</section>
    <details class="card" ${det('fcAdd', !n || !!ed)}><summary class="sum"><h2>${ed ? 'Edit card' : 'Add a card'}</h2></summary>
      <form data-form="fccard" class="stack"><input type="hidden" name="deck" value="${esc(D.id)}">
        <textarea class="input" name="t" style="min-height:60px" placeholder="Term" aria-label="Term">${esc(ed ? ed.t : '')}</textarea>
        <textarea class="input" name="d" style="min-height:80px" placeholder="Definition" aria-label="Definition">${esc(ed ? ed.d : '')}</textarea>
        <div class="btns"><button class="btn" type="submit">${ed ? 'Save card' : 'Add card'}</button>${ed ? '<button class="btn ghost" type="button" data-act="fcEditCancel">Cancel</button>' : ''}</div></form></details>
    <details class="card" ${det('fcDeckSet')}><summary class="sum"><h2>Deck settings</h2></summary>
      <form data-form="fcdeck" class="stack"><input type="hidden" name="id" value="${esc(D.id)}">
        <div class="ff"><label>Name<input class="input" name="name" value="${esc(D.name)}"></label><label>Class<select class="input" name="c">${kClassOpts(D.c)}</select></label></div>
        <button class="btn" type="submit">Save</button></form>
      <form data-form="fcmore" class="stack mt"><input type="hidden" name="id" value="${esc(D.id)}"><span class="label">Add more cards from text</span>
        <textarea class="input" name="text" style="min-height:80px;font-size:14px" placeholder="term - definition, one per line" aria-label="More cards"></textarea><button class="btn ghost" type="submit">Add these cards</button></form>
      <div class="btns mt"><button class="btn ghost" data-act="fcExport" data-id="${esc(D.id)}">📤 Export as text file</button><button class="btn ghost" data-act="fcReset" data-id="${esc(D.id)}" data-confirm>Reset progress</button></div>
      <button class="link danger mt" data-act="fcDelDeck" data-id="${esc(D.id)}" data-confirm>Delete this deck</button></details>`;
}

/* ----- Study sessions ----- */
function fcPool(D, m) {
  let L = D ? D.cards : S.fc.decks.flatMap(d => d.cards);
  if (m === 'review') L = L.filter(fcDue);
  else if (UI.fcStar && L.some(c => c.star)) L = L.filter(c => c.star);
  return S.fc.opt.shuf || m === 'match' || m === 'test' ? shuffle(L) : L.slice();
}
function fcBegin(m, deckId, ids) {
  const D = deckId ? fcDeck(deckId) : null, L = ids ? ids.map(i => (fcFind(i) || {}).c).filter(Boolean) : fcPool(D, m);
  if (!L.length) { toast('No cards to study here.'); return false; }
  const f = {m, deck:deckId || '', q:L.map(c => c.id), i:0, flip:false, know:[], miss:[], hist:[]};
  if (m === 'learn') { f.lv = {}; f.q.forEach(id => { f.lv[id] = 0; }); f.round = 1; f.cur = null; f.fb = null; f.rq = []; learnRound(f); }
  if (m === 'test') { f.setup = true; f.n = Math.min(20, L.length); f.types = {mc:true, tf:true, wr:true}; }
  if (m === 'match') { matchSetup(f, L); }
  UI.fc = f; scrollTo(0, 0); return true;
}
const fcCards = f => f.q.map(id => (fcFind(id) || {}).c).filter(Boolean);
const fcTop = (f, label, extra) => `<div class="fctop"><button class="btn sm ghost" data-act="fcEnd" aria-label="End session">✕</button><b>${label}</b><span class="small muted">${extra || ''}</span></div>`;
function fcSession() {
  const f = UI.fc;
  if (f.m === 'learn') return learnView(f);
  if (f.m === 'test') return testView(f);
  if (f.m === 'match') return matchView(f);
  return flashView(f);
}

/* Flashcards and Review */
function flashView(f) {
  const L = fcCards(f);
  if (f.i >= L.length) {
    const nk = f.know.length, nm = f.miss.length;
    return `${fcTop(f, f.m === 'review' ? 'Review' : 'Flashcards')}<section class="card fcdone"><div class="fcbig">${nm ? '💪' : '🎉'}</div><h2>${nm ? 'Nice work. Keep going.' : 'You know all of these!'}</h2>
      <div class="stats"><div class="stat"><b style="color:var(--good)">${nk}</b><span>know it</span></div><div class="stat"><b style="color:var(--danger)">${nm}</b><span>still learning</span></div><div class="stat"><b>${L.length ? Math.round(nk / L.length * 100) : 0}%</b><span>this round</span></div></div>
      <div class="btns mt">${nm ? `<button class="btn" style="flex:1" data-act="fcAgain">Study the ${nm} again</button>` : ''}<button class="btn ghost" style="flex:1" data-act="fcRestart">Start over</button></div>
      <button class="btn ghost block mt" data-act="fcEnd">Done</button></section>`;
  }
  const c = L[f.i], a = fcAsk(c), long = s => s.length > 140 ? ' long' : s.length > 60 ? ' mid' : '';
  return `${fcTop(f, f.m === 'review' ? 'Review' : 'Flashcards', `${f.i + 1} / ${L.length}`)}<div class="meter mb"><i style="width:${f.i / L.length * 100}%"></i></div>
    <div class="fcard${f.flip ? ' flip' : ''}" id="fcCard" data-act="fcFlip" role="button" tabindex="0" aria-label="Flip card">
      <div class="fc-in"><div class="fc-face fc-front${long(a.q)}"><span class="fc-lbl">${a.ql}</span><button class="fcst big${c.star ? ' on' : ''}" data-act="fcStar" data-id="${esc(c.id)}" aria-label="Star">${c.star ? '★' : '☆'}</button>${esc(a.q)}</div>
        <div class="fc-face fc-back${long(a.a)}"><span class="fc-lbl">${a.al}</span><button class="fcst big${c.star ? ' on' : ''}" data-act="fcStar" data-id="${esc(c.id)}" aria-label="Star">${c.star ? '★' : '☆'}</button>${esc(a.a)}</div></div></div>
    <p class="note" style="text-align:center">Tap the card to flip it. Swipe right if you know it, left if you're still learning.</p>
    <div class="fcbtns"><button class="btn ghost" data-act="fcMark" data-ok="0">😅 Still learning</button><button class="btn" data-act="fcMark" data-ok="1">✅ Know it</button></div>
    ${f.hist.length ? '<button class="link mt" data-act="fcUndo">↩ Undo last card</button>' : ''}`;
}

/* Learn: multiple choice until you get it, then type it */
function learnRound(f) {
  const left = f.q.filter(id => f.lv[id] < 2);
  f.rq = left.slice(0, 7); f.ri = 0; f.cur = f.rq[0] || null; f.fb = null; f.opts = null; f.roundDone = false;
}
function learnView(f) {
  const all = fcCards(f), done = f.q.filter(id => f.lv[id] >= 2).length, total = f.q.length;
  const head = fcTop(f, 'Learn', `${done} / ${total} mastered`) + `<div class="meter mb"><i style="width:${done / total * 100}%;background:var(--good)"></i></div>`;
  if (done >= total) return `${head}<section class="card fcdone"><div class="fcbig">🎓</div><h2>You learned all ${plural(total, 'card')}!</h2><p class="note">They'll come back in Review right before you'd forget them.</p>
    <div class="btns mt"><button class="btn" style="flex:1" data-act="fcRestart">Learn again</button><button class="btn ghost" style="flex:1" data-act="fcEnd">Done</button></div></section>`;
  if (f.roundDone) return `${head}<section class="card fcdone"><div class="fcbig">🔥</div><h2>Round ${f.round} done</h2><p class="note">${done} of ${total} mastered so far. Keep it going.</p>
    <button class="btn block mt" data-act="fcNextRound">Continue to round ${f.round + 1}</button></section>`;
  const hit = fcFind(f.cur); if (!hit) { learnRound(f); return learnView(f); }
  const c = hit.c, typing = f.lv[c.id] === 1 || all.length < 2, a = fcAsk(c, typing);
  if (!typing && !f.opts) f.opts = fcOptions(c, all, 4);
  const fb = f.fb;
  return `${head}<section class="card fcq"><span class="fc-lbl2">${a.ql}${typing ? ' · type the answer' : ' · pick the answer'}</span><div class="fcqtext">${esc(a.q)}</div>
    ${typing ? (fb ? '' : `<form data-form="fclearn" class="stack mt"><input class="input" name="a" placeholder="Type the ${a.al.toLowerCase()}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Your answer" autofocus>
        <div class="btns"><button class="btn" type="submit" style="flex:1">Check</button><button class="btn ghost" type="button" data-act="fcIdk">Don't know</button></div></form>`)
      : `<div class="fcopts">${f.opts.map((o, i) => `<button class="fcopt${fb ? (fcNorm(o) === fcNorm(a.a) ? ' right' : fb.pick === i ? ' wrong' : ' dim') : ''}" data-act="fcPick" data-i="${i}"${fb ? ' disabled' : ''}>${esc(o)}</button>`).join('')}</div>`}
    ${fb ? `<div class="fcfb ${fb.ok ? 'ok' : 'no'}"><b>${fb.ok ? ['Nice!', 'You got it!', 'Correct!', 'Perfect.'][Math.floor(Math.random() * 4)] : 'Not quite.'}</b>
      ${fb.ok ? '' : `<span>${fb.given ? `You said: ${esc(fb.given)}<br>` : ''}Answer: <b>${esc(a.a)}</b></span>`}
      <div class="btns mt">${!fb.ok && fb.typed ? '<button class="btn ghost" data-act="fcOverride">I was right</button>' : ''}<button class="btn" style="flex:1" data-act="fcLearnNext">Continue</button></div></div>` : ''}</section>`;
}
function learnAnswer(f, ok, extra) {
  const id = f.cur, c = (fcFind(id) || {}).c; if (!c) return;
  const typed = f.lv[id] === 1 || fcCards(f).length < 2;
  if (ok) { f.lv[id] = typed ? 2 : 1; if (typed) fcGrade(c, true); } else { f.lv[id] = 0; fcGrade(c, false); f.rq.push(id); }
  if (f.q.every(x => f.lv[x] >= 2)) { S.fc.st.learned++; setTimeout(() => confetti(48), 150); }
  f.fb = Object.assign({ok, typed}, extra || {});
  haptic(ok ? undefined : 'heavy');
}

/* Test */
function testView(f) {
  if (f.setup) {
    const max = f.q.length;
    return `${fcTop(f, 'Practice test')}<section class="card"><h2>Set up your test</h2>
      <span class="label">Questions</span><div class="chips">${[5, 10, 20, 30].filter(n => n < max).map(n => chip(String(n), f.n === n, `data-act="fcTestN" data-n="${n}"`)).join('')}${chip(`All ${max}`, f.n === max, `data-act="fcTestN" data-n="${max}"`)}</div>
      <span class="label">Question types</span><div class="chips">${[['mc', 'Multiple choice'], ['tf', 'True or false'], ['wr', 'Written']].map(([k, l]) => chip(l, f.types[k], `data-act="fcTestT" data-k="${k}"`)).join('')}</div>
      <button class="btn block mt" data-act="fcTestGo">Start test</button></section>`;
  }
  if (f.graded) {
    const T = f.qs, ok = T.filter(q => q.ok).length, pct = Math.round(ok / T.length * 100);
    return `${fcTop(f, 'Test results')}<section class="card fcdone"><div class="fcbig">${pct === 100 ? '💯' : pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '📚'}</div><h2>${pct}%</h2><p class="note">${ok} of ${T.length} right${pct === 100 ? '. Perfect score!' : '.'}</p>
      <div class="btns mt">${ok < T.length ? `<button class="btn" style="flex:1" data-act="fcLearnMissed">Learn the ${T.length - ok} you missed</button>` : ''}<button class="btn ghost" style="flex:1" data-act="fcRestart">New test</button></div></section>
      ${T.map((q, i) => `<section class="card fcres ${q.ok ? 'ok' : 'no'}"><span class="small muted">${i + 1}. ${q.ok ? '✅ Correct' : '❌ Missed'}</span><p><b>${esc(q.prompt)}</b></p>${q.type === 'tf' ? `<p class="small">${esc(q.shown)}</p>` : ''}
        ${q.ok ? '' : `<p class="small">Your answer: ${esc(q.given || '(blank)')}</p>`}<p class="small">Answer: <b>${esc(q.answer)}</b></p></section>`).join('')}
      <button class="btn ghost block" data-act="fcEnd">Done</button>`;
  }
  return `${fcTop(f, 'Practice test', `${f.qs.length} questions`)}<form data-form="fctest">${f.qs.map((q, i) => `<section class="card fctq"><span class="small muted">${i + 1} of ${f.qs.length} · ${q.type === 'mc' ? 'Multiple choice' : q.type === 'tf' ? 'True or false' : 'Written'}</span>
      <p class="fcqtext sm">${esc(q.prompt)}</p>
      ${q.type === 'mc' ? `<div class="fcopts">${q.opts.map((o, j) => `<label class="fcopt rad"><input type="radio" name="q${i}" value="${j}"><span>${esc(o)}</span></label>`).join('')}</div>`
        : q.type === 'tf' ? `<p class="fctf">${esc(q.shown)}</p><div class="fcopts two"><label class="fcopt rad"><input type="radio" name="q${i}" value="1"><span>True</span></label><label class="fcopt rad"><input type="radio" name="q${i}" value="0"><span>False</span></label></div>`
        : `<input class="input" name="q${i}" placeholder="Type the ${esc(q.al.toLowerCase())}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Answer ${i + 1}">`}</section>`).join('')}
    <button class="btn block" type="submit">Submit test</button></form>`;
}
function testBuild(f) {
  const all = fcCards(f), L = all.slice(0, f.n), kinds = Object.keys(f.types).filter(k => f.types[k]);
  f.qs = L.map((c, i) => {
    let type = kinds[i % kinds.length]; if (type === 'mc' && all.length < 2) type = 'wr'; if (type === 'tf' && all.length < 2) type = 'wr';
    const a = fcAsk(c, type === 'wr');
    if (type === 'mc') return {id:c.id, type, prompt:a.q, answer:a.a, opts:fcOptions(c, all, 4), al:a.al};
    if (type === 'tf') { const truth = Math.random() < .5, other = shuffle(all.filter(x => x.id !== c.id))[0], k = a.al === 'Definition' ? 'd' : 't';
      return {id:c.id, type, prompt:a.q, shown:truth || !other ? a.a : other[k], truth:truth || !other, answer:truth || !other ? 'True' : `False. It's: ${a.a}`, al:a.al}; }
    return {id:c.id, type, prompt:a.q, answer:a.a, al:a.al};
  });
  f.qs = shuffle(f.qs); f.setup = false;
}

/* Match */
function matchSetup(f, L) {
  const pick = L.slice(0, 6), tiles = [];
  pick.forEach(c => { tiles.push({id:c.id, s:'t', x:c.t}); tiles.push({id:c.id, s:'d', x:c.d}); });
  f.tiles = shuffle(tiles); f.sel = -1; f.left = pick.length; f.t0 = 0; f.pen = 0; f.end = 0;
}
function matchView(f) {
  const D = f.deck && fcDeck(f.deck);
  if (f.end) { const t = Math.round((f.end - f.t0) / 100 + f.pen * 10), best = D && D.best.match;
    return `${fcTop(f, 'Match')}<section class="card fcdone"><div class="fcbig">⚡</div><h2>${(t / 10).toFixed(1)} seconds</h2>
      <p class="note">${f.newBest ? '🏆 New best for this deck!' : best ? `Your best is ${(best / 10).toFixed(1)} s.` : ''}${f.pen ? ` Includes ${f.pen} s of penalties for wrong pairs.` : ''}</p>
      <div class="btns mt"><button class="btn" style="flex:1" data-act="fcRestart">Play again</button><button class="btn ghost" style="flex:1" data-act="fcEnd">Done</button></div></section>`; }
  return `${fcTop(f, 'Match', `<span id="fcTimer">${f.t0 ? ((Date.now() - f.t0) / 1000 + f.pen).toFixed(1) : '0.0'}</span> s`)}<p class="note">Tap a term, then its definition. Wrong pairs add a second.</p>
    <div class="fcmatch">${f.tiles.map((t, i) => `<button class="fctile${t.gone ? ' gone' : ''}${t.x.length > 70 ? ' long' : ''}" data-act="fcTile" data-i="${i}"${t.gone ? ' disabled' : ''}>${esc(t.x)}</button>`).join('')}</div>`;
}
function matchTap(i, el) {
  const f = UI.fc, t = f.tiles[i]; if (!t || t.gone) return;
  if (!f.t0) f.t0 = Date.now();
  const tiles = $$('.fctile');
  if (f.sel < 0) { f.sel = i; el.classList.add('sel'); haptic('tick'); return; }
  if (f.sel === i) { f.sel = -1; el.classList.remove('sel'); return; }
  const a = f.tiles[f.sel], prev = tiles[f.sel]; f.sel = -1;
  if (a.id === t.id && a.s !== t.s) {
    a.gone = t.gone = true; haptic(); [prev, el].forEach(x => { x.classList.remove('sel'); x.classList.add('ok'); setTimeout(() => { x.classList.add('gone'); x.disabled = true; }, 260); });
    if (--f.left <= 0) { f.end = Date.now(); const D = f.deck && fcDeck(f.deck), t10 = Math.round((f.end - f.t0) / 100 + f.pen * 10);
      const prev = D && D.best.match; if (D && (!prev || t10 < prev)) { f.newBest = !!prev; D.best.match = t10; }
      if (!S.fc.st.match || t10 < S.fc.st.match) S.fc.st.match = t10;
      f.tiles.forEach(x => { const c = (fcFind(x.id) || {}).c; if (c && x.s === 't') { S.fc.st.seen++; logAct('fc', 1); } });
      setTimeout(() => { confetti(40); afterChange(); }, 350); }
  } else {
    f.pen++; haptic('heavy'); [prev, el].forEach(x => { x.classList.remove('sel'); x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 450); });
  }
}
setInterval(() => { const el = $('#fcTimer'), f = UI.fc; if (el && f && f.m === 'match' && f.t0 && !f.end) el.textContent = ((Date.now() - f.t0) / 1000 + f.pen).toFixed(1); }, 100);

/* Swiping the flashcard */
{
  let g = null;
  document.addEventListener('pointerdown', e => { const el = e.target.closest('#fcCard'); if (!el || e.target.closest('.fcst')) return; g = {el, x:e.clientX, y:e.clientY, dx:0, on:false, id:e.pointerId}; }, {passive:true});
  document.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return; const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.on) { if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { g = null; return; } if (Math.abs(dx) < 12) return; g.on = true; try { g.el.setPointerCapture(e.pointerId); } catch (x) {} }
    g.dx = dx; g.el.style.transition = 'none'; g.el.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
    g.el.classList.toggle('yes', dx > 90); g.el.classList.toggle('no', dx < -90);
  }, {passive:true});
  const end = e => { if (!g || (e && e.pointerId !== g.id)) return; const s = g; g = null; if (!s.on) return;
    swiped = Date.now(); s.el.style.transition = 'transform .25s ease';
    if (Math.abs(s.dx) > 90) { s.el.style.transform = `translateX(${s.dx > 0 ? 120 : -120}%) rotate(${s.dx > 0 ? 12 : -12}deg)`; setTimeout(() => { fcMark(s.dx > 0); afterChange(); }, 180); }
    else { s.el.style.transform = ''; s.el.classList.remove('yes', 'no'); } };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
}
function fcMark(ok) {
  const f = UI.fc, L = fcCards(f), c = L[f.i]; if (!c) return;
  f.hist.push({i:f.i, id:c.id, box:c.box, due:c.due, r:c.r, w:c.w, ok});
  fcGrade(c, ok); (ok ? f.know : f.miss).push(c.id); f.i++; f.flip = false; haptic(ok ? undefined : 'tick');
  if (f.i >= L.length && !f.miss.length) setTimeout(() => confetti(40), 150);
}
document.addEventListener('keydown', e => {
  const f = UI.fc; if (!f || (f.m !== 'flash' && f.m !== 'review') || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); XACT.fcFlip(); }
  else if (e.key === 'ArrowRight') { fcMark(true); afterChange(); } else if (e.key === 'ArrowLeft') { fcMark(false); afterChange(); }
});

/* ----- Export a deck as a text file ----- */
function fcExport(D) {
  const text = `# ${D.name}\n` + D.cards.map(c => `${c.t.replace(/\s*\n\s*/g, ' ')}\t${c.d.replace(/\s*\n\s*/g, ' ')}`).join('\n') + '\n';
  const file = new File([text], `${D.name.replace(/[^\w\- ]+/g, '').trim() || 'flashcards'}.txt`, {type:'text/plain'});
  if (navigator.canShare && navigator.canShare({files:[file]})) { navigator.share({files:[file]}).catch(() => {}); return; }
  let framed = true; try { framed = window.top !== window; } catch (e) {}
  if (!framed) { const u = URL.createObjectURL(file), a = document.createElement('a'); a.href = u; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('Deck saved as a text file.'); return; }
  try { navigator.clipboard.writeText(text).then(() => toast('Copied the deck as text.')); } catch (e) { toast("Couldn't save the file here."); }
}

/* ----- Actions and forms ----- */
Object.assign(XVIEWS, {kstudy:viewKStudy});
Object.assign(XACT, {
  fcOpen: d => { UI.fcDeck = d.id; UI.fcEdit = null; UI.fcStar = false; scrollTo(0, 0); },
  fcBack: () => { UI.fcDeck = null; UI.fcEdit = null; },
  fcBlank: () => { const f = $('form[data-form="fcimp"]'), nm = f && f.name.value.trim() || 'New deck', c = f && f.c.value || '';
    S.fc.decks.push({id:fcUid(), name:nm, c, created:Date.now(), best:{}, cards:[]}); UI.fcDeck = S.fc.decks[S.fc.decks.length - 1].id; UI.open.fcAdd = true; UI.open.fcImp = false; toast(`Made ${nm}. Add your first card.`); },
  fcStart: d => { if (!fcBegin(d.m, d.id || '')) return false; },
  fcEnd: () => { UI.fc = null; scrollTo(0, 0); },
  fcRestart: () => { const f = UI.fc; if (!f) return false; fcBegin(f.m, f.deck); },
  fcAgain: () => { const f = UI.fc; if (!f) return false; fcBegin(f.m, f.deck, f.miss.slice()); },
  fcFlip: () => { const f = UI.fc; if (!f) return false; f.flip = !f.flip; const el = $('#fcCard'); if (el) el.classList.toggle('flip', f.flip); haptic('tick'); return false; },
  fcMark: d => { fcMark(d.ok === '1'); },
  fcUndo: () => { const f = UI.fc, h = f && f.hist.pop(); if (!h) return false; const c = (fcFind(h.id) || {}).c; if (c) Object.assign(c, {box:h.box, due:h.due, r:h.r, w:h.w});
    f.i = h.i; f.flip = false; (h.ok ? f.know : f.miss).pop(); S.fc.st.seen = Math.max(0, S.fc.st.seen - 1); },
  fcStar: d => { const h = fcFind(d.id); if (!h) return false; h.c.star = !h.c.star; haptic('tick');
    if (UI.fc) { $$(`.fcst[data-id="${CSS.escape(d.id)}"]`).forEach(b => { b.classList.toggle('on', h.c.star); b.textContent = h.c.star ? '★' : '☆'; }); save(); return false; } },
  fcOpt: d => { if (d.k === 'shuf') S.fc.opt.shuf = !S.fc.opt.shuf; else S.fc.opt.ans = S.fc.opt.ans === 'd' ? 't' : 'd'; },
  fcStarOnly: () => { UI.fcStar = !UI.fcStar; },
  fcEditCard: d => { UI.fcEdit = d.id; UI.open.fcAdd = true; setTimeout(() => { const f = $('form[data-form="fccard"]'); if (f) f.scrollIntoView({behavior:'smooth', block:'center'}); }, 60); },
  fcEditCancel: () => { UI.fcEdit = null; UI.open.fcAdd = false; },
  fcDelCard: d => { S.fc.decks.forEach(D => { D.cards = D.cards.filter(c => c.id !== d.id); }); },
  fcDelDeck: d => { S.fc.decks = S.fc.decks.filter(D => D.id !== d.id); UI.fcDeck = null; toast('Deck deleted.'); },
  fcReset: d => { const D = fcDeck(d.id); if (!D) return false; D.cards.forEach(c => Object.assign(c, {box:0, due:'', r:0, w:0})); D.best = {}; toast('Progress reset.'); },
  fcExport: d => { const D = fcDeck(d.id); if (D) fcExport(D); return false; },
  fcPick: d => { const f = UI.fc, c = (fcFind(f.cur) || {}).c; if (!c || f.fb) return false; const a = fcAsk(c), o = f.opts[+d.i];
    learnAnswer(f, fcNorm(o) === fcNorm(a.a), {pick:+d.i});
    if (f.fb.ok) setTimeout(() => { if (UI.fc === f && f.fb && f.fb.ok) { XACT.fcLearnNext(); render(); } }, 900); },
  fcIdk: () => { const f = UI.fc; learnAnswer(f, false, {typed:true, given:''}); },
  fcOverride: () => { const f = UI.fc, id = f.cur, c = (fcFind(id) || {}).c; if (!c) return false; f.rq.pop(); f.lv[id] = 2; if (f.q.every(x => f.lv[x] >= 2)) S.fc.st.learned++; c.box = Math.max(1, c.box); c.w = Math.max(0, c.w - 1); c.r++; c.due = addDays(today(), FC_GAP[c.box]); f.fb.ok = true; XACT.fcLearnNext(); },
  fcLearnNext: () => { const f = UI.fc; f.fb = null; f.opts = null; f.ri++;
    while (f.ri < f.rq.length && f.lv[f.rq[f.ri]] >= 2) f.ri++;
    if (f.ri >= f.rq.length) { if (!f.q.every(id => f.lv[id] >= 2)) f.roundDone = true; f.cur = null; } else f.cur = f.rq[f.ri];
    setTimeout(() => { const i = $('form[data-form="fclearn"] input'); if (i) i.focus(); }, 60); },
  fcNextRound: () => { const f = UI.fc; f.round++; learnRound(f); },
  fcTestN: d => { UI.fc.n = +d.n; },
  fcTestT: d => { const t = UI.fc.types; t[d.k] = !t[d.k]; if (!Object.values(t).some(Boolean)) t[d.k] = true; },
  fcTestGo: () => { testBuild(UI.fc); scrollTo(0, 0); },
  fcLearnMissed: () => { const f = UI.fc, ids = f.qs.filter(q => !q.ok).map(q => q.id); fcBegin('learn', f.deck, ids); },
  fcTile: (d, el) => { matchTap(+d.i, el); return false; },
  fcFromNote: d => { const n = S.sc.notes.find(x => x.id === d.id); if (!n) return false;
    const L = fcParse(n.body, n.title); if (!L.length) { toast('Write the note as "term: definition", one per line, to make cards.'); return false; }
    const cards = L.flatMap(x => x.cards); S.fc.decks.push({id:fcUid(), name:n.title, c:n.c || '', created:Date.now(), best:{}, cards:cards.map(c => ({id:fcUid(), t:c.t, d:c.d, box:0, due:'', r:0, w:0}))});
    UI.fcDeck = S.fc.decks[S.fc.decks.length - 1].id; go('kstudy'); toast(`Made ${plural(cards.length, 'card')} from ${n.title}.`); },
});
Object.assign(SAVE, {
  fcimp: o => { if (!(o.text || '').trim()) { toast('Paste some cards, or pick a text file.'); return false; } if (!fcImport(o.text, o.name || 'New deck', o.c)) return false; },
  fcmore: o => { const D = fcDeck(o.id), L = fcParse(o.text, D && D.name); if (!D || !L.length) { toast('No cards found. One per line, like: term - definition'); return false; }
    const n = L.flatMap(x => x.cards); n.forEach(c => D.cards.push({id:fcUid(), t:c.t, d:c.d, box:0, due:'', r:0, w:0})); toast(`Added ${plural(n.length, 'card')}.`); },
  fccard: o => { const D = fcDeck(o.deck); if (!D || !o.t || !o.d) { toast('Fill in both sides of the card.'); return false; }
    const ed = UI.fcEdit && D.cards.find(c => c.id === UI.fcEdit);
    if (ed) { ed.t = o.t; ed.d = o.d; toast('Card saved.'); UI.fcEdit = null; UI.open.fcAdd = false; } else { D.cards.push({id:fcUid(), t:o.t, d:o.d, box:0, due:'', r:0, w:0}); toast('Card added.'); setTimeout(() => { const t = $('form[data-form="fccard"] textarea'); if (t) t.focus(); }, 60); } },
  fcdeck: o => { const D = fcDeck(o.id); if (!D) return false; D.name = o.name || D.name; D.c = o.c || ''; UI.open.fcDeckSet = false; toast('Deck saved.'); },
  fclearn: o => { const f = UI.fc, c = (fcFind(f.cur) || {}).c; if (!c) return false; const a = fcAsk(c, true); learnAnswer(f, fcOk(o.a, a.a), {given:o.a, typed:true}); },
  fctest: o => { const f = UI.fc; let ok = 0;
    f.qs.forEach((q, i) => { const v = o['q' + i]; const c = (fcFind(q.id) || {}).c;
      q.given = q.type === 'mc' ? (v != null ? q.opts[+v] : '') : q.type === 'tf' ? (v == null ? '' : v === '1' ? 'True' : 'False') : (v || '');
      q.ok = q.type === 'mc' ? v != null && fcNorm(q.opts[+v]) === fcNorm(q.answer) : q.type === 'tf' ? v != null && (v === '1') === q.truth : fcOk(v, q.answer);
      if (q.ok) ok++; if (c) fcGrade(c, q.ok); });
    f.graded = true; const pct = Math.round(ok / f.qs.length * 100), D = f.deck && fcDeck(f.deck);
    if (D && (D.best.test == null || pct > D.best.test)) D.best.test = pct;
    if (pct === 100) { S.fc.st.perfect++; setTimeout(() => confetti(60), 120); }
    scrollTo(0, 0); },
});
