// Hibi: How Hibi looks. Accent color, card style, mode icons, app icons, the screen finder, and the Settings sections.
'use strict';
/* =========================================================
   Look
   ========================================================= */
const LOOK_STYLES = [['pop','Paper','Hairline borders, no shadows'],['soft','Soft','No outlines, gentle shadows'],['outline','Outline','Thin lines, no shadows'],['glass','Glass','See-through frosted cards']];
const ACCENTS = ['#F0467F','#FF6FA3','#E0457B','#B5179E','#8B6CFF','#6C5CE7','#3B82F6','#0A86AA','#16A9A3','#39C5BB','#2E9E5B','#86D993','#F2C14E','#F5B301','#E8590C','#FF7A59','#C2243F','#5E6B78','#141414','#FFFFFF'];
const MODE_EMOJI = ['🏠','🏡','🌸','⭐','🏋️','💪','🦍','🏃','🎓','📚','✏️','🧠','🗾','✈️','⛩️','🗼','🍜','📺','📖','🎬','🍿','🎮','🕹️','👾','💰','🐷','💵','🏦','💼','⏱️','🏢','🌿','💧','🌙','✅','🛒','🎁','🛍️','📝','🎧','🎨','🔥','💖','🍀','🌈','🐱','🐶','👑'];
// App icons: the Hibi flower in different colors. [id, name, gradient light, main, dark, sparkle, petal lines, outline]
const ICON_SETS = [
  ['sakura','Sakura','#FF7AAA','#F0467F','#C92E6B','#5CE1F5','#FFC2D7','#2B1B52'],
  ['midnight','Midnight','#A48BFF','#8B6CFF','#4B32B8','#4DD2FF','#D9CCFF','#1B1240'],
  ['miku','Miku','#7FE3DA','#39C5BB','#1F8C84','#E4508C','#BFF3EE','#17323A'],
  ['ocean','Ocean','#5CC3E0','#0A86AA','#07607A','#F2A541','#BDE6F2','#0E2A3A'],
  ['sunset','Sunset','#FFB067','#E8590C','#B5179E','#FFE066','#FFD3B5','#3A1D14'],
  ['matcha','Matcha','#A3CF8F','#4F8A3C','#2E5E22','#D98E73','#D7EBCB','#1F2E1A'],
  ['royal','Royal','#FFE08A','#F2C14E','#C48A12','#7FB2FF','#FFF0C2','#0E1530'],
  ['neon','Neon','#FF5CA8','#FF2E88','#5B0E80','#00E5FF','#FFC2E0','#0B0918'],
  ['lavender','Lavender','#D3C2FF','#9B7BEA','#6B4FC4','#FFB3D1','#EDE4FF','#2B1B52'],
  ['mono','Mono','#5A5A5A','#2A2A2A','#000000','#FFFFFF','#DADADA','#000000']];
function normalizeLook(s) {
  if (!s.look || typeof s.look !== 'object') s.look = {};
  const L = s.look;
  if (typeof L.accent !== 'string' || (L.accent && !/^#[0-9a-f]{6}$/i.test(L.accent))) L.accent = '';
  if (!LOOK_STYLES.some(x => x[0] === L.style)) L.style = 'pop';
  if (!['auto', 'light', 'dark'].includes(L.scheme)) L.scheme = 'auto';   // 4.0: Paper can follow the phone, or stay light or dark
  if (!L.em || typeof L.em !== 'object' || Array.isArray(L.em)) L.em = {};
  if (!ICON_SETS.some(x => x[0] === L.icon)) L.icon = 'sakura';
}
normalizeLook(S);
const lum = hex => { const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
function applyLook() {
  const r = document.documentElement, L = S.look || {};
  if (L.accent) {
    const on = lum(L.accent) > .4 ? '#16121F' : '#FFFFFF';
    r.style.setProperty('--accent', L.accent); r.style.setProperty('--panel', L.accent); r.style.setProperty('--on-accent', on); r.style.setProperty('--btn', L.accent); r.style.setProperty('--on-btn', on);
  } else ['--accent', '--panel', '--on-accent', '--btn', '--on-btn'].forEach(k => r.style.removeProperty(k));
  if (L.scheme === 'light' || L.scheme === 'dark') r.setAttribute('data-theme', L.scheme); else r.removeAttribute('data-theme');
  if (L.style && L.style !== 'pop') r.setAttribute('data-style', L.style); else r.removeAttribute('data-style');
  try { const m = $('meta[name="theme-color"]'), bg = getComputedStyle(r).getPropertyValue('--bg').trim(); if (m && bg) m.content = bg; } catch (e) {}   // the status bar blends into the page
  Object.keys(MODES).forEach(k => { const m = MODES[k]; if (!m.em0) m.em0 = m.em; m.em = (L.em && L.em[k]) || m.em0; });
}
applyLook();
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyLook()); } catch (e) {}

/* ----- App icon ----- */
function iconSvg(id, size) {
  const c = ICON_SETS.find(x => x[0] === id) || ICON_SETS[0], base = ICON_SETS[0];
  let s = HIBI_LOGO.replace(/hb-/g, 'hb' + id + '-').replace(/ style="[^"]*"/, '').replace(/width="64" height="64"/, `width="${size}" height="${size}"`);
  for (let i = 2; i <= 7; i++) s = s.split(base[i]).join('§' + i);
  for (let i = 2; i <= 7; i++) s = s.split('§' + i).join(c[i]);
  return s;
}
function iconPng(id, size) {
  return new Promise((ok, bad) => {
    const img = new Image(), cv = document.createElement('canvas'); cv.width = cv.height = size;
    img.onload = () => { try { cv.getContext('2d').drawImage(img, 0, 0, size, size); ok(cv.toDataURL('image/png')); } catch (e) { bad(e); } };
    img.onerror = bad; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg(id, size).replace('<svg ', '<svg xmlns:xlink="http://www.w3.org/1999/xlink" '));
  });
}
const standalone = () => { try { return navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; } catch (e) { return false; } };
const iconLink = id => location.origin + location.pathname.replace(/index\.html$/, '') + '?icon=' + id;
// Opened in Safari from the icon picker: use that icon for Add to Home Screen, plus a launch screen to match
{
  let pick = ''; try { pick = new URLSearchParams(location.search).get('icon') || ''; } catch (e) {}
  const set = ICON_SETS.find(x => x[0] === pick);
  if (set && set[0] !== 'sakura') iconPng(set[0], 180).then(u => { $$('link[rel="apple-touch-icon"],link[rel="icon"]').forEach(l => { l.href = u; }); }).catch(() => {});
  if (set && !standalone()) setTimeout(() => {
    const b = document.createElement('div'); b.className = 'icon-banner'; b.innerHTML = `<span>${iconSvg(set[0], 44)}</span><div><b>Ready for the ${esc(set[1])} icon</b><span>Tap Share, then Add to Home Screen.</span></div><button aria-label="Close" onclick="this.parentNode.remove()">✕</button>`;
    document.body.appendChild(b);
  }, 1200);
  if (!standalone()) setTimeout(() => startupImage(set ? set[0] : (S.look && S.look.icon) || 'sakura'), 1500);
}
// The picture iPhone shows while a Home Screen app starts. Made to fit this screen.
function startupImage(id) {
  try {
    const c = ICON_SETS.find(x => x[0] === id) || ICON_SETS[0], dpr = Math.min(3, devicePixelRatio || 1), W = Math.round(screen.width * dpr), H = Math.round(screen.height * dpr);
    if (!W || !H || W > 2000 || H > 3200) return;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, c[2]); gr.addColorStop(.55, c[3]); gr.addColorStop(1, c[4]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const img = new Image();
    img.onload = () => { const s = Math.round(W * .34); g.save(); g.beginPath(); const x = (W - s) / 2, y = H * .42 - s / 2, rr = s * .22;
      g.moveTo(x + rr, y); g.arcTo(x + s, y, x + s, y + s, rr); g.arcTo(x + s, y + s, x, y + s, rr); g.arcTo(x, y + s, x, y, rr); g.arcTo(x, y, x + s, y, rr); g.closePath(); g.clip(); g.drawImage(img, x, y, s, s); g.restore();
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.font = `${Math.round(W * .1)}px "Dela Gothic One", sans-serif`; g.fillText('Hibi', W / 2, H * .42 + s / 2 + W * .16);
      let l = $('link[rel="apple-touch-startup-image"]'); if (!l) { l = document.createElement('link'); l.rel = 'apple-touch-startup-image'; document.head.appendChild(l); }
      l.href = cv.toDataURL('image/png'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg(id, 512));
  } catch (e) {}
}

/* ----- Settings, in sections ----- */
const modeSettings = () => ({
  home: () => homeSettings(), gym: () => gymSettings(), japan: () => jpSettings(), media: () => mdSettings(), save: () => svSettings(), games: () => gmSettings(),
  work: () => wkSettings(), health: () => hlSettings(), budget: () => bgSettings()})[S.mode];
function setSecs() {
  const m = modeSettings();
  return [...(m ? [['mode', `${MODES[S.mode].em} ${MODES[S.mode].label}`]] : []), ['look', '🎨 Look'], ['modes', '🧭 Modes'], ['privacy', '🔒 Passcode'], ['data', '💾 Backup'], ['about', '🌸 About']];
}
function homeSettings() {
  return `    <section class="card"><h2>Home</h2>
      <label class="setrow"><span>Show greeting</span><input type="checkbox" data-bind="hgreet"${S.home.greet ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>
      <label class="setrow"><span>Name in greeting</span><input class="input" style="width:50%" data-bind="hname" value="${esc(S.home.name)}" placeholder="Your name" aria-label="Name in greeting"></label>
      ${fxSwitch('homeStart', S.home.startHome, 'Open to Home', 'Opening Hibi again always starts on Home.')}
      <button class="btn ghost block mt" data-act="homeCustomize">✏️ Customize Home widgets</button></section>
${musicSettings()}`;
}
function lookSettings() {
  const L = S.look, cur = L.accent || (S.look.scheme === 'dark' || (S.look.scheme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches) ? '#FF6F94' : '#E5456F');
  return `<section class="card"><h2>Appearance</h2>
      <div class="seg mt" role="tablist" style="margin-bottom:0">${[['auto', 'Match phone'], ['light', 'Light'], ['dark', 'Dark']].map(([k, n]) => `<button role="tab" aria-selected="${L.scheme === k}" data-act="lookScheme" data-k="${k}">${n}</button>`).join('')}</div>
      <p class="note">Match phone follows your phone's light or dark setting.</p></section>
    <section class="card"><div class="row"><h2>Accent color</h2>${L.accent ? '<button class="link" data-act="lookAccent" data-c="">Use default</button>' : ''}</div>
      <p class="note">Buttons, checkmarks, bars and highlights. The default is dark buttons with a pink touch.</p>
      <div class="accents mt">${ACCENTS.map(c => `<button class="acc${L.accent.toLowerCase() === c.toLowerCase() ? ' on' : ''}" style="background:${c}" data-act="lookAccent" data-c="${c}" aria-label="Accent ${c}" aria-pressed="${L.accent.toLowerCase() === c.toLowerCase()}"></button>`).join('')}
        <label class="acc any" aria-label="Pick any color"><input type="color" data-bind="lookAccent" value="${esc(cur)}">🎨</label></div></section>
    <section class="card"><h2>Card style</h2>
      <div class="styles">${LOOK_STYLES.map(([k, n, d]) => `<button class="stylebtn st-${k}" aria-pressed="${L.style === k}" data-act="lookStyle" data-k="${k}"><i></i><b>${n}</b><span>${d}</span></button>`).join('')}</div></section>
    <section class="card"><h2>Mode icons</h2><p class="note">Tap one to pick a different emoji.</p>
      <div class="emrows">${orderedModes().map(k => `<button class="emrow" data-act="emOpen" data-k="${k}"><span class="emb on">${esc(MODES[k].em)}</span>${esc(MODES[k].label)}</button>`).join('')}</div></section>
    <section class="card"><h2>App icon</h2>
      <div class="icons">${ICON_SETS.map(([id, n]) => `<button class="iconbtn" aria-pressed="${L.icon === id}" data-act="lookIcon" data-k="${id}">${iconSvg(id, 58)}<span>${n}</span></button>`).join('')}</div>
      ${L.icon !== 'sakura' || UI.iconHelp ? iconSteps() : '<p class="note">Pick one to see how to put it on your Home Screen.</p>'}</section>
${fxSettings()}`;
}
function iconSteps() {
  const set = ICON_SETS.find(x => x[0] === S.look.icon);
  return `<div class="steps mt"><p class="small"><b>iPhone only lets a website pick its icon when you add it to the Home Screen.</b> So to switch to ${esc(set[1])}, you add Hibi again:</p>
    <ol class="small"><li>Back up first: connect Dropbox in Backup, or save a backup file.</li><li>Tap <b>Open in Safari</b> below, then Share, then <b>Add to Home Screen</b>.</li>
      <li>Open the new Hibi and restore your backup (Dropbox offers it as soon as you connect).</li><li>Check everything is there, then delete the old Hibi icon.</li></ol>
    <p class="note">Each Home Screen copy of Hibi keeps its own data, so don't delete the old one until the new one has your backup.</p>
    <div class="btns mt"><a class="btn" href="${esc(iconLink(set[0]))}" target="_blank" rel="noopener">Open in Safari</a><button class="btn ghost" data-act="setSec" data-s="data">Back up</button></div></div>`;
}
function modesSettings() {
  return `    <section class="card"><h2>Modes</h2><p class="note">Tick the modes you want to see. Drag ⠿ to put them in order. Hidden modes keep their data.</p>
      <div data-sort="modes">${S.order.map(k => { const m = MODES[k]; return `<div class="setrow sortrow" data-sid="${k}">${grip(m.label)}<label style="display:flex;align-items:center;gap:10px;flex:1"><span>${m.em} ${m.label}</span></label>
        <input type="checkbox" data-bind="modevis" data-k="${k}"${modeVisible(k) ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)" aria-label="Show ${m.label}"></div>`; }).join('')}</div>
      <p class="note">The order here is the order in the mode switcher and on Home. Home always stays first.</p></section>
    <section class="card"><h2>Links to a mode</h2><p class="note">Add <b>?mode=</b> or <b>#</b> and a mode to Hibi's address to open straight to it, like these:</p>
      ${[['gym', '?mode=gym'], ['save', '#savings'], ['health', '#water'], ['lists', '#shopping']].map(([k, q]) => `<div class="lrow"><span style="text-align:left;color:var(--ink)">${MODES[k].em} ${MODES[k].label}</span><code class="small">${esc(q)}</code></div>`).join('')}
      <p class="note">On Android, press and hold the Hibi icon for shortcuts to each mode. On iPhone, a link opens in Safari, which keeps separate data from your Home Screen app, so these are mostly handy on Android. To jump around quickly on iPhone, tap 🔎 at the top of any screen.</p></section>
`;
}
function settingsAbout() {
  return `${ideasCard()}    <section class="card"><div class="mhead"><span data-act="logoTap" style="cursor:pointer;display:flex">${HIBI_LOGO}</span><div><h2>Hibi</h2><span class="small muted">Everyday life, all in one place. Version ${APP_VERSION}</span></div></div>
      <button class="btn ghost block mt" data-act="openNotes">What's new: patch notes</button>
      <p class="note">When a new version is on GitHub, the app gets it the next time it opens with internet and shows a Reload button.</p><p class="note">Screen check: ${typeof NAVDBG === 'object' && NAVDBG.inner ? `window ${NAVDBG.inner}, visible ${NAVDBG.visual}, offset ${NAVDBG.top}, zoom ${NAVDBG.scale}, shift ${NAVDBG.d}` : 'not measured yet'}</p></section>`;
}

/* ----- Screen finder ----- */
const JUMP_KW = {workout:'gym lift train start', catalog:'exercises library', care:'stretch', history:'lifts pr records progress', body:'weight weigh scale photos', today:'supplements creatine vitamins', journal:'mood diary',
  hhome:'home widgets', hbadges:'badges achievements', kdue:'homework assignments exams due', kclass:'classes grades schedule', knotes:'notes formulas', knb:'notebooks pencil handwriting draw drawing notes record recording lecture audio transcript', kstudy:'flashcards quizlet study cards decks test learn match review', kfocus:'pomodoro timer study focus',
  jplan:'itinerary calendar days', jprep:'to-do todo checklist', jjournal:'trip journal', jmoney:'budget spending money', jconv:'yen dollar exchange convert currency', jflights:'flights plane airline', jstays:'hotel stays', jpack:'packing', jplaces:'places', jgifts:'gifts souvenirs', jphrases:'phrases words', jinfo:'emergency tokyo time',
  hltoday:'water drink hydrate habits', hlhab:'habits streaks routine', hlsleep:'sleep bed rest', lshop:'shopping groceries store', lwish:'wish list wishlist prices deals',
  btot:'totals year lifetime spending stats history', bacct:'accounts balance money on hand checking savings cash', bgo:'budget safe to spend money overview', btx:'spending transactions purchases csv import bank export', brev:'review swipe sort categories check', bbills:'bills rent subscriptions due', bplan:'plan budgets next month income paycheck savings categories', vgoals:'savings goals money', vadd:'new goal', vhist:'deposits history', vsubs:'subscriptions bills netflix spotify', wtoday:'clock in work shift', wshifts:'shifts hours', wpay:'paycheck pay taxes',
  mnow:'watching reading anime manga', gnow:'playing games'};
const SEC_KW = {look:'theme color accent icon emoji style animation haptics vibration app icon', modes:'hide show order reorder links', privacy:'passcode face id lock', data:'backup dropbox restore export crash', about:'version patch notes ideas'};
function jumpItems() {
  const out = [];
  orderedModes().forEach(k => { const m = MODES[k];
    m.nav.forEach(([g]) => { if (g === 'settings') return; (GROUPS[g] || [g]).forEach(t => { if (TAB_INFO[t]) out.push({k, t, l:TAB_INFO[t].t, kw:JUMP_KW[t] || '', hid:!modeVisible(k)}); }); });
    out.push({k, t:'settings', sec:'mode', l:'Settings', kw:'settings', hid:!modeVisible(k)}); });
  [['look', 'Look: theme, colors, icons'], ['modes', 'Modes and links'], ['privacy', 'Passcode and Face ID'], ['data', 'Backup and Dropbox'], ['about', 'About and patch notes']].forEach(([sec, l]) => out.push({k:'home', t:'settings', sec, l, kw:SEC_KW[sec], set:1}));
  return out;
}
let JQ = '';
function jumpList() {
  const q = norm(JQ), L = jumpItems().filter(x => !q || norm(x.l + ' ' + x.kw + ' ' + MODES[x.k].label).includes(q));
  if (q) return L.length ? `<div class="jlist">${L.map(x => `<button class="jrow" data-act="jumpGo" data-k="${x.k}" data-t="${x.t}" data-sec="${x.sec || ''}"><span>${x.set ? '⚙️' : MODES[x.k].em}</span><b>${esc(x.l)}</b><small>${x.set ? 'Settings' : esc(MODES[x.k].label)}${x.hid ? ' (hidden)' : ''}</small></button>`).join('')}</div>` : '<p class="note">Nothing matches. Try another word.</p>';
  const by = {}; L.filter(x => !x.set && !x.hid).forEach(x => (by[x.k] = by[x.k] || []).push(x));
  return Object.keys(by).map(k => `<div class="jmode"><b>${MODES[k].em} ${esc(MODES[k].label)}</b><div class="chips">${by[k].map(x => `<button class="chip" data-act="jumpGo" data-k="${x.k}" data-t="${x.t}" data-sec="${x.sec || ''}">${esc(x.l)}</button>`).join('')}</div></div>`).join('')
    + `<div class="jmode"><b>⚙️ Settings</b><div class="chips">${L.filter(x => x.set).map(x => `<button class="chip" data-act="jumpGo" data-k="${x.k}" data-t="${x.t}" data-sec="${x.sec}">${esc(x.l.split(':')[0])}</button>`).join('')}</div></div>`;
}
/* ----- Top bar and side menu (4.0): menu button, centered title, search; every mode lives in the menu ----- */
const SVG_MENU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>', SVG_FIND = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>', SVG_GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>';
const appBar = () => `<div class="appbar"><button class="ab-btn" data-act="menuOpen" aria-label="Open menu">${SVG_MENU}</button><h1 class="ab-title">${esc(TAB_INFO[S.tab].t)}</h1><button class="ab-btn" data-act="jumpOpen" aria-label="Find a screen">${SVG_FIND}</button></div>`;
const menuSheet = () => {
  const modes = orderedModes().filter(modeVisible), nm = ((S.home && S.home.name) || '').trim();
  return `<div id="drawer" data-act="menuClose"><aside class="drawer" data-act="noop" role="dialog" aria-modal="true" aria-label="Menu">
    <div class="dr-top"><b class="dr-brand">Hibi</b><button class="ab-btn" data-act="menuGo" data-m="${S.mode}" data-t="settings" aria-label="Settings">${SVG_GEAR}</button></div>
    <div class="dr-h">Modes</div>
    ${modes.map(k => `<button class="dr-i${S.mode === k ? ' on' : ''}" data-act="menuMode" data-k="${k}"><span class="dr-em" aria-hidden="true">${MODES[k].em}</span>${esc(MODES[k].label)}</button>`).join('')}
    <div class="dr-h">More</div>
    <button class="dr-i" data-act="menuGo" data-m="home" data-t="badges"><span class="dr-em" aria-hidden="true">🏆</span>Badges</button>
    <button class="dr-i" data-act="menuGo" data-m="${S.mode}" data-t="settings"><span class="dr-em" aria-hidden="true">⚙️</span>Settings</button>
    <button class="dr-i" data-act="menuFind"><span class="dr-em" aria-hidden="true">🔎</span>Find a screen</button>
    <div class="dr-foot"><span class="dr-av" aria-hidden="true">${esc((nm[0] || 'H').toUpperCase())}</span>${esc(nm || 'Hibi')}<small>v${APP_VERSION}</small></div></aside></div>`;
};
document.addEventListener('keydown', e => { if (e.key === 'Escape' && UI.menu) { UI.menu = false; render(); } });
const jumpSheet = () => `<div id="sheet" data-act="closeSheet"><div class="panel" data-act="noop" role="dialog" aria-modal="true" aria-label="Find a screen">
  <div class="row"><h2>Go to</h2><button class="link" data-act="closeSheet">Done</button></div>
  <input class="input mt" id="jumpQ" type="search" placeholder="Search, like water or flights" value="${esc(JQ)}" autocomplete="off" aria-label="Search screens">
  <div id="jumpList" class="mt">${jumpList()}</div></div></div>`;
const emSheet = () => { const k = UI.emPick, m = MODES[k];
  return `<div id="sheet" data-act="closeSheet"><div class="panel" data-act="noop" role="dialog" aria-modal="true" aria-label="Icon for ${esc(m.label)}">
    <div class="row"><h2>${esc(m.em)} ${esc(m.label)}</h2><button class="link" data-act="closeSheet">Done</button></div>
    <div class="emgrid mt">${MODE_EMOJI.map(e => `<button class="emb${e === m.em ? ' on' : ''}" data-act="emSet" data-k="${k}" data-em="${e}" aria-pressed="${e === m.em}">${e}</button>`).join('')}</div>
    <form data-form="emany" class="field mt"><input type="hidden" name="k" value="${k}"><input class="input" name="em" placeholder="Or type any emoji" maxlength="8" aria-label="Any emoji"><button class="btn" type="submit">Use it</button></form>
    ${S.look.em[k] ? `<button class="link mt" data-act="emSet" data-k="${k}" data-em="">Back to ${esc(m.em0)}</button>` : ''}</div></div>`; };

/* ----- Actions ----- */
Object.assign(XACT, {
  lookAccent: d => { S.look.accent = d.c || ''; applyLook(); },
  menuOpen: () => { UI.menu = true; },
  menuClose: () => { UI.menu = false; },
  menuFind: () => { UI.menu = false; XACT.jumpOpen(); },
  menuMode: d => { UI.menu = false; const f = ACT.mode || JACT.mode || MACT.mode || SACT.mode || XACT.mode; if (S.mode !== d.k && f) f(d); scrollTo(0, 0); },
  menuGo: d => { UI.menu = false; if (S.mode !== d.m) { S.lastMode[S.mode] = S.tab; S.mode = d.m; } UI.edit = null; go(d.t); scrollTo(0, 0); },
  lookScheme: d => { S.look.scheme = d.k; applyLook(); },
  lookStyle: d => { S.look.style = d.k; applyLook(); },
  lookIcon: d => { S.look.icon = d.k; UI.iconHelp = true; },
  emOpen: d => { UI.emPick = d.k; },
  emSet: d => { if (d.em) S.look.em[d.k] = d.em; else delete S.look.em[d.k]; applyLook(); UI.emPick = null; toast(d.em ? `${MODES[d.k].label} is now ${d.em}` : 'Icon reset.'); },
  setSec: d => { UI.setSec = d.s; scrollTo(0, 0); },
  homeCustomize: () => { S.mode = 'home'; go('hhome'); UI.homeEdit = true; scrollTo(0, 0); },
  jumpOpen: () => { UI.jump = true; JQ = ''; setTimeout(() => { const i = $('#jumpQ'); if (i) i.focus(); }, 250); },
  jumpGo: d => { UI.jump = false; if (S.mode !== d.k) { S.lastMode[S.mode] = S.tab; S.mode = d.k; } if (!modeVisible(d.k)) { S.hidden = S.hidden.filter(x => x !== d.k); toast(`${MODES[d.k].label} is showing again.`); }
    if (d.sec) UI.setSec = d.sec; go(d.t); scrollTo(0, 0); },
});
Object.assign(SAVE, {emany: o => { const e = (o.em || '').trim(); if (!e) return false; XACT.emSet({k:o.k, em:[...e].slice(0, 2).join('')}); }});
{ const cs = ACT.closeSheet; ACT.closeSheet = d => { UI.jump = false; UI.emPick = null; return cs(d); }; }
document.addEventListener('input', e => { if (e.target.id === 'jumpQ') { JQ = e.target.value; $('#jumpList').innerHTML = jumpList(); } });
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.bind === 'lookAccent') { S.look.accent = e.target.value; applyLook(); save(); render(); } });
