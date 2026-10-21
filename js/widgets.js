// Hibi: Home screen widgets. Add, remove, move and resize them, like iPhone widgets.
'use strict';
/* =========================================================
   Home widgets
   ========================================================= */
// Each widget: name, emoji, what it shows, the mode it belongs to (hidden modes hide their widgets), sizes ('s' small square, 'm' wide), and how to draw it.
const goTo = (k, to) => `data-act="wGo" data-k="${k}" data-to="${to}"`;
const small = (em, label, big, sub, tap, extra) => `<div class="wd-h"><span aria-hidden="true">${em}</span>${esc(label)}</div><div class="wd-big">${big}</div>${sub ? `<div class="wd-sub">${sub}</div>` : ''}${extra || ''}`;
const WIDGETS = {
  week:{n:'Weekly recap', em:'📅', d:'This week across every mode', sizes:['m'], m:() => weekCard()},
  gym:{n:'Gym', em:'🏋️', d:'Workouts this week and your next template', mode:'gym', sizes:['m', 's'], tap:goTo('gym', 'workout'),
    m:() => { const t = nextTpl(), n = S.history.filter(w => w.end >= weekStart(Date.now())).length, last = S.history[S.history.length - 1];
      return `<section class="card"><div class="row"><h2>🏋️ Gym</h2><button class="link" data-act="mode" data-k="gym">Open</button></div>
        <p class="note">${plural(n, 'workout')} this week${last ? `. Last one ${esc(fmtLong(last.end))}` : ''}.</p>
        ${S.active ? '<button class="btn block mt" data-act="homeGym">Continue your workout</button>' : t ? `<button class="btn block mt" data-act="homeTpl" data-id="${esc(t.id)}">Start ${esc(t.name)}</button>` : ''}</section>`; },
    s:() => { const t = nextTpl(), n = S.history.filter(w => w.end >= weekStart(Date.now())).length;
      return small('🏋️', 'Gym', n, n === 1 ? 'workout this week' : 'workouts this week', '', S.active ? '<button class="btn sm wd-btn" data-act="homeGym">Continue</button>' : t ? `<button class="btn sm wd-btn" data-act="homeTpl" data-id="${esc(t.id)}">Start ${esc(t.name)}</button>` : ''); }},
  cardio:{n:'Cardio', em:'🏃', d:'Cardio minutes this week', mode:'gym', sizes:['s'], tap:goTo('gym', 'workout'),
    s:() => { const c = cardioWeek(); return small('🏃', 'Cardio', fmtN(Math.round(c.min)), `min this week${c.dist ? ` · ${fmtN(r1(c.dist))} ${distU()}` : ''}`); }},
  supps:{n:'Supplements', em:'💊', d:"Today's supplements, tap to check off", mode:'gym', sizes:['s', 'm'], tap:goTo('gym', 'today'),
    s:() => { const tk = S.sl[today()] || [], n = S.sup.filter(x => tk.includes(x.id)).length;
      return small('💊', 'Supplements', `${n}/${S.sup.length}`, 'taken today', '', `<div class="wd-chips">${S.sup.slice(0, 4).map(x => `<button class="wd-chip${tk.includes(x.id) ? ' on' : ''}" data-act="toggleSup" data-id="${esc(x.id)}" aria-pressed="${tk.includes(x.id)}">${esc(x.name.slice(0, 10))}</button>`).join('')}</div>`); },
    m:() => { const tk = S.sl[today()] || [];
      return `<section class="card"><div class="row"><h2>💊 Supplements</h2><span class="small muted">${S.sup.filter(x => tk.includes(x.id)).length} of ${S.sup.length} today</span></div>
        <div class="chips mt">${S.sup.map(x => chip((tk.includes(x.id) ? '✓ ' : '') + x.name, tk.includes(x.id), `data-act="toggleSup" data-id="${esc(x.id)}"`)).join('') || '<p class="note">No supplements yet.</p>'}</div></section>`; }},
  weight:{n:'Body weight', em:'⚖️', d:'Your latest weigh-in', mode:'gym', sizes:['s'], tap:goTo('gym', 'body'),
    s:() => { const L = S.bw, l = L[L.length - 1], f = L[Math.max(0, L.length - 8)];
      return small('⚖️', 'Weight', l ? `${fmtN(l.v)}<small> ${S.unit}</small>` : '–', l ? (L.length > 1 ? `${l.v - f.v > 0 ? '+' : ''}${fmtN(r1(l.v - f.v))} since ${esc(fmtMD(keyDate(f.d)))}` : esc(fmtMD(keyDate(l.d)))) : 'Tap to log'); }},
  journal:{n:'Journal', em:'📝', d:"Today's mood and journal", mode:'gym', sizes:['s'], tap:goTo('gym', 'journal'),
    s:() => { const e = S.j.find(x => x.d === today()), m = e && MOODS[e.m - 1];
      return small('📝', 'Journal', m ? m[0] : '✍️', m ? `Feeling ${m[1].toLowerCase()} today` : 'How was today?'); }},
  school:{n:'School', em:'🎓', d:"Today's classes and what's due", mode:'school', sizes:['m', 's'], tap:goTo('school', 'kdue'),
    m:() => { const due = kOpenSorted().slice(0, 3), todays = nowTermClasses().filter(c => (c.days || '').includes(dayLetter(new Date()))).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      return `<section class="card"><div class="row"><h2>🎓 School</h2><button class="link" data-act="mode" data-k="school">Open</button></div>
        ${todays.length ? `<p class="note">Classes today: ${todays.map(c => `<b>${esc(c.name)}</b>${c.time ? ' ' + classTime(c) : ''}`).join(', ')}</p>` : ''}
        ${due.length ? due.map(kRow).join('') : '<p class="note">Nothing due. Nice.</p>'}</section>`; },
    s:() => { const x = kOpenSorted()[0], c = x && kClass(x.c);
      return small('🎓', 'Next due', x ? `<span class="wd-txt">${esc(x.title)}</span>` : '🎉', x ? esc([c && c.name, x.due ? fmtDay(x.due) : 'No due date'].filter(Boolean).join(' · ')) : 'Nothing due'); }},
  classes:{n:'Next class', em:'🏫', d:'Your next class today', mode:'school', sizes:['s'], tap:goTo('school', 'kclass'),
    s:() => { const now = new Date(), hm = pad(now.getHours()) + ':' + pad(now.getMinutes());
      const L = nowTermClasses().filter(c => (c.days || '').includes(dayLetter(now)) && c.time).sort((a, b) => a.time.localeCompare(b.time));
      const cur = L.find(c => c.time <= hm && c.end && c.end > hm), nx = L.find(c => c.time > hm);
      return cur ? small('🏫', 'In class now', `<span class="wd-txt">${esc(cur.name)}</span>`, `until ${fmtTime(cur.end)}${cur.room ? ' · ' + esc(cur.room) : ''}`)
        : nx ? small('🏫', 'Next class', `<span class="wd-txt">${esc(nx.name)}</span>`, `${classTime(nx)}${nx.room ? ' · ' + esc(nx.room) : ''}`) : small('🏫', 'Classes', '😌', L.length ? 'Done for today' : 'No classes today'); }},
  focus:{n:'Focus timer', em:'🍅', d:'Pomodoro timer and focus time today', mode:'school', sizes:['s'], tap:goTo('school', 'kfocus'),
    s:() => { const st = focusStats(), r = S.pomo.run;
      return r ? small(PHASES[S.pomo.phase][1], PHASES[S.pomo.phase][0], `<span id="pomoW">${clock(pomoLeft(), true)}</span>`, r.paused != null ? 'Paused' : 'Running')
        : small('🍅', 'Focus', st.min, `min today · ${plural(st.n, 'round')}`, '', '<button class="btn sm wd-btn" data-act="wPomo">▶ Start focus</button>'); }},
  japan:{n:'Japan trip', em:'🗾', d:'Countdown and your pre-trip to-do list', mode:'japan', sizes:['m', 's'], tap:goTo('japan', 'jplan'),
    m:() => { const days = tripDays(), t = today(), J = S.jp;
      const line = !days.length ? 'Set your trip dates.' : t < J.start ? `<b>${Math.round((keyDate(J.start) - keyDate(t)) / 864e5)} days</b> until Japan` : t > J.end ? 'Trip complete. Welcome back!' : `<b>Day ${days.indexOf(t) + 1}</b> of ${days.length} in Japan`;
      const next = t < J.start ? prepSorted().filter(p => !p.done).slice(0, 2) : [];
      return `<section class="card"><div class="row"><h2>🗾 Japan</h2><button class="link" data-act="mode" data-k="japan">Open</button></div><p class="note">${line}</p>${next.map(prepRow).join('')}</section>`; },
    s:() => { const days = tripDays(), t = today(), J = S.jp;
      if (days.length && t < J.start) { const n = Math.round((keyDate(J.start) - keyDate(t)) / 864e5); return small('🗾', 'Japan', n, n === 1 ? 'day to go' : 'days to go'); }
      if (days.length && t <= J.end) return small('🗾', 'Japan', `Day ${days.indexOf(t) + 1}`, `of ${days.length} · Tokyo ${esc(tokyoNow())}`);
      return small('🗾', 'Japan', '✈️', days.length ? 'Trip complete' : 'Set your trip dates'); }},
  tokyo:{n:'Tokyo time', em:'🕐', d:'The time in Tokyo right now', mode:'japan', sizes:['s'], tap:goTo('japan', 'jplan'),
    s:() => small('🕐', 'Tokyo', `<span class="tokyo-now">${esc(tokyoNow())}</span>`, new Date().toLocaleDateString(undefined, {timeZone:'Asia/Tokyo', weekday:'long'}))},
  media:{n:'Watching and reading', em:'📚', d:"What you're watching and reading", mode:'media', sizes:['m', 's'], tap:goTo('media', 'mnow'),
    m:() => { const now = S.md.items.filter(m => live(m) && m.status === 'now').sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 3);
      return `<section class="card"><div class="row"><h2>📚 Watching and reading</h2><button class="link" data-act="mode" data-k="media">Open</button></div>${now.length ? now.map(nowRow).join('') : '<p class="note">Nothing in progress.</p>'}</section>`; },
    s:() => { const m = S.md.items.filter(x => live(x) && x.status === 'now').sort((a, b) => (b.updated || 0) - (a.updated || 0))[0];
      return m ? `<div class="wd-cover" style="${m.img ? `background-image:url('${esc(m.img)}')` : `background:hsl(${hue(m.title)} 55% 52%)`}"></div>${small(isWatch(m.type) ? '📺' : '📖', isWatch(m.type) ? 'Watching' : 'Reading', `<span class="wd-txt">${esc(m.title)}</span>`, esc(progText(m)), '', m.type !== 'movie' ? `<button class="btn sm wd-btn" data-act="mInc" data-id="${esc(m.id)}">+1 ${unitOf(m)[1]}</button>` : '')}`
        : small('📚', 'Watching', '🍿', 'Nothing in progress'); }},
  games:{n:'Playing', em:'🎮', d:"Games you're playing", mode:'games', sizes:['m', 's'], tap:goTo('games', 'gnow'),
    m:() => { const now = S.gm.items.filter(g => live(g) && g.status === 'now').sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 3);
      return `<section class="card"><div class="row"><h2>🎮 Playing</h2><button class="link" data-act="mode" data-k="games">Open</button></div>${now.length ? now.map(gNowRow).join('') : '<p class="note">Nothing in progress.</p>'}</section>`; },
    s:() => { const g = S.gm.items.filter(x => live(x) && x.status === 'now').sort((a, b) => (b.updated || 0) - (a.updated || 0))[0];
      return g ? `<div class="wd-cover" style="${g.img ? `background-image:url('${esc(g.img)}')` : `background:hsl(${hue(g.title)} 55% 52%)`}"></div>${small('🎮', 'Playing', `<span class="wd-txt">${esc(g.title)}</span>`, esc(g.genres.slice(0, 2).join(', ')))}` : small('🎮', 'Playing', '🕹️', 'Nothing in progress'); }},
  upnext:{n:'Up next', em:'📋', d:'The next game in your Up next list', mode:'games', sizes:['s'], tap:goTo('games', 'gnow'),
    s:() => { const g = gUpNext()[0]; return g ? small('📋', 'Up next', `<span class="wd-txt">${esc(g.title)}</span>`, `${gUpNext().length - 1 ? `+${gUpNext().length - 1} more in line` : 'Last one in line'}`, '', `<button class="btn sm wd-btn" data-act="gStart" data-id="${esc(g.id)}">Start</button>`) : small('📋', 'Up next', '🤷', 'Nothing lined up'); }},
  save:{n:'Savings', em:'💰', d:'Your closest savings goals', mode:'save', sizes:['m', 's'], tap:goTo('save', firstTab('save')),
    m:() => { const gs = S.sv.goals.filter(g => live(g) && !svDone(g) && num(g.target)).sort((a, b) => svSaved(b) / num(b.target) - svSaved(a) / num(a.target)).slice(0, 2);
      return `<section class="card"><div class="row"><h2>💰 Savings</h2><button class="link" data-act="mode" data-k="save">Open</button></div>
        ${gs.length ? gs.map(g => `<div class="crow"><div class="row"><b>${esc(g.em || '💰')} ${esc(g.name)}</b><span>${usd(svSaved(g))} of ${usd(num(g.target))}</span></div><div class="cbar"><i style="width:${Math.min(100, svSaved(g) / num(g.target) * 100)}%"></i></div></div>`).join('') : '<p class="note">No goals in progress.</p>'}</section>`; },
    s:() => { const g = S.sv.goals.filter(x => live(x) && !svDone(x) && num(x.target)).sort((a, b) => svSaved(b) / num(b.target) - svSaved(a) / num(a.target))[0];
      if (!g) return small('💰', 'Savings', '🐷', 'No goals in progress');
      const pct = Math.min(100, svSaved(g) / num(g.target) * 100);
      return small(g.em || '💰', g.name, `${Math.round(pct)}%`, `${usd(svSaved(g))} of ${usd(num(g.target))}`, '', `<div class="cbar wd-bar"><i style="width:${pct}%"></i></div>`); }},
  work:{n:'Work', em:'💼', d:'Hours, paycheck estimate and clock in', mode:'work', sizes:['m', 's'], tap:goTo('work', 'wtoday'),
    m:() => workHome() || `<section class="card"><div class="row"><h2>💼 Work</h2><button class="link" data-act="mode" data-k="work">Open</button></div><p class="note">Set up your pay in Work, then Settings.</p></section>`,
    s:() => { const c = S.wk.clock;
      if (c) return small('💼', c.pausedAt ? 'On break' : 'On the clock', `<span class="wk-live">${clock(clockMs())}</span>`, '', '', '<button class="btn sm wd-btn" data-act="wkOut">Clock out</button>');
      if (!wkReady()) return small('💼', 'Work', '⏱', 'Set up your pay', '', '<button class="btn sm wd-btn" data-act="wkIn">Clock in</button>');
      const P = periodFor(today()), p = payFor(P);
      return small('💵', 'Payday', `<span class="wd-txt">${esc(inDays(P.pay))}</span>`, `about ${cash(p.net)} · ${hrsTxt(p.mins)}`, '', '<button class="btn sm wd-btn ghost" data-act="wkIn">⏱ Clock in</button>'); }},
  music:{n:'On repeat', em:'🎧', d:'Top artists and songs from stats.fm', sizes:['m'], need:'mu', m:() => musicCard() || muSetup('🎧 On repeat')},
  'mu-time':{n:'Time listened', em:'⏳', d:'Minutes listened, last 4 weeks (stats.fm)', sizes:['s'], need:'mu', tap:'data-act="wGo" data-k="home" data-to="settings"',
    s:() => { muMaybe(); if (!S.mu.user) return small('⏳', 'Listened', '🎧', 'Add stats.fm in Settings');
      return S.mu.ms ? small('⏳', 'Listened', fmtN(Math.round(S.mu.ms / 6e4)), `minutes · last 4 weeks${S.mu.count ? ` · ${fmtN(S.mu.count)} plays` : ''}`) : small('⏳', 'Listened', '–', esc(S.mu.timeErr || 'Loading…')); }},
  'mu-artist':{n:'Top artist', em:'🎤', d:'Your #1 artist lately (stats.fm)', sizes:['s'], need:'mu', tap:'data-act="wGo" data-k="home" data-to="settings"',
    s:() => { muMaybe(); const a = S.mu.artists[0]; if (!a) return small('🎤', 'Top artist', '🎧', S.mu.user ? 'Loading…' : 'Add stats.fm in Settings');
      return `${a.img ? `<div class="wd-cover round" style="background-image:url('${esc(a.img)}')"></div>` : ''}${small('🎤', 'Top artist', `<span class="wd-txt">${esc(a.name)}</span>`, a.streams ? `${fmtN(a.streams)} plays · 4 weeks` : 'Last 4 weeks')}`; }},
  'mu-track':{n:'Top song', em:'🎵', d:'Your most played song lately (stats.fm)', sizes:['s'], need:'mu', tap:'data-act="wGo" data-k="home" data-to="settings"',
    s:() => { muMaybe(); const t = S.mu.tracks[0]; if (!t) return small('🎵', 'Top song', '🎧', S.mu.user ? 'Loading…' : 'Add stats.fm in Settings');
      return `${t.img ? `<div class="wd-cover" style="background-image:url('${esc(t.img)}')"></div>` : ''}${small('🎵', 'Top song', `<span class="wd-txt">${esc(t.name)}</span>`, esc(t.artist))}`; }},
  'mu-artists':{n:'Top artists', em:'🎤', d:'Your top 3 artists, big (stats.fm)', sizes:['m'], need:'mu',
    m:() => { muMaybe(); const A = S.mu.artists; if (!A.length) return muSetup('🎤 Top artists');
      return `<section class="card"><div class="row"><h2>🎤 Top artists</h2><span class="small muted">Last 4 weeks</span></div><div class="mu-art">${A.slice(0, 3).map((x, i) => `<div>${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="mu-ph">${esc(x.name[0])}</span>`}<b>${i + 1}. ${esc(x.name)}</b>${x.streams ? `<span class="small muted">${fmtN(x.streams)} plays</span>` : ''}</div>`).join('')}</div></section>`; }},
  badges:{n:'Badges', em:'🏆', d:'Your badge collection and latest unlock', sizes:['s'], tap:'data-act="wGo" data-k="home" data-to="hbadges"',
    s:() => { const got = BADGES.filter(b => S.bd[b[0]]).sort((a, b) => S.bd[b[0]] - S.bd[a[0]]), l = got[0];
      return small('🏆', 'Badges', `${got.length}<small>/${BADGES.length}</small>`, l ? `Latest: ${l[1]} ${esc(l[2])}` : 'None yet'); }},
  wrapped:{n:'Wrapped', em:'🎁', d:'Your month and year in review', sizes:['m'], m:() => wrapCard() || '<section class="card"><h2>🎁 Wrapped</h2><p class="note">Your first Wrapped shows up once you log a few things.</p></section>'},
};
const muSetup = title => `<section class="card"><h2>${title}</h2><p class="note">${S.mu.user ? esc(S.mu.err || 'Loading your music from stats.fm…') : 'Add your stats.fm username in Home Settings to see your music here.'}</p>${S.mu.user ? '' : '<button class="btn sm mt" data-act="wGo" data-k="home" data-to="settings">Add stats.fm</button>'}</section>`;
const muMaybe = () => { if (S.mu.user && Date.now() - (S.mu.at || 0) > 6 * 36e5) setTimeout(() => muRefresh(), 0); };
const W_DEFAULT = () => [['week', 'm'], ...S.order.filter(k => modeVisible(k)).flatMap(k => ({gym:[['gym', 'm']], school:[['school', 'm']], japan:[['japan', 'm']], media:[['media', 'm']], work:[['work', 'm']], games:[['games', 'm']], save:[['save', 'm']]})[k] || []),
  ...(S.mu.user ? [['music', 'm']] : []), ['wrapped', 'm']].map(([t, z], i) => ({id:'w' + i, t, z}));
function normalizeHome(s) {
  if (!s.home || typeof s.home !== 'object') s.home = {};
  if (!Array.isArray(s.home.w)) s.home.w = null;   // filled with the default layout on first draw
  else s.home.w = s.home.w.filter(w => w && WIDGETS[w.t]).map(w => Object.assign(w, {z:WIDGETS[w.t].sizes.includes(w.z) ? w.z : WIDGETS[w.t].sizes[0]}));
  if (typeof s.home.greet !== 'boolean') s.home.greet = true;
  if (typeof s.home.name !== 'string') s.home.name = 'Cynn';
}
const wVisible = w => !WIDGETS[w.t].mode || modeVisible(WIDGETS[w.t].mode);
function drawWidget(w, i, edit) {
  const def = WIDGETS[w.t]; let inner = '';
  try { inner = def[w.z](); } catch (e) { Crash.record(e, 'widget ' + w.t); inner = w.z === 's' ? small('⚠️', def.n, '!', "Couldn't load") : `<section class="card"><p class="note">${esc(def.n)} couldn't load.</p></section>`; }
  const bar = edit ? `<div class="wd-edit"><b>${def.em} ${esc(def.n)}</b><span>${i ? `<button class="btn sm ghost" data-act="wMove" data-i="${i}" data-n="-1" aria-label="Move up">↑</button>` : ''}<button class="btn sm ghost" data-act="wMove" data-i="${i}" data-n="1" aria-label="Move down">↓</button>${def.sizes.length > 1 ? `<button class="btn sm ghost" data-act="wSize" data-i="${i}">${w.z === 's' ? 'Make wide' : 'Make small'}</button>` : ''}<button class="btn sm ghost" data-act="wDel" data-i="${i}" aria-label="Remove ${esc(def.n)}">✕</button></span></div>` : '';
  if (w.z === 's') return `<div class="wd-slot s${edit ? ' editing' : ''}">${bar}<section class="wd s"${!edit && def.tap ? ` ${def.tap} role="button" tabindex="0"` : ''}>${inner}</section></div>`;
  return `<div class="wd-slot m${edit ? ' editing' : ''}">${bar}${inner}</div>`;
}
function viewHomeW() {
  if (!S.home.w) { S.home.w = W_DEFAULT(); saveRaw(); }
  const h = new Date().getHours(), edit = !!UI.homeEdit, L = S.home.w.map((w, i) => [w, i]).filter(([w]) => edit || wVisible(w));
  const upd = S.seenVer !== APP_VERSION ? `<section class="card" style="border-color:var(--accent)"><h2>Hibi was updated to ${APP_VERSION}</h2><div class="btns mt"><button class="btn sm" data-act="openNotes">See what's new</button><button class="btn sm ghost" data-act="seenUpdate">Dismiss</button></div></section>` : '';
  const greet = S.home.greet ? `<p class="lead">${h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}${S.home.name ? ', ' + esc(S.home.name) : ''}.</p>` : '';
  return `${upd}${edit ? `<section class="card" style="border-color:var(--accent)"><h2>Customize Home</h2><p class="note">Move, resize or remove widgets, and add new ones. Small widgets sit two to a row.</p>
      <label class="setrow"><span>Show greeting</span><input type="checkbox" data-bind="hgreet"${S.home.greet ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>
      <label class="setrow"><span>Name in greeting</span><input class="input" style="width:50%" data-bind="hname" value="${esc(S.home.name)}" placeholder="Your name" aria-label="Name in greeting"></label>
      <div class="btns mt"><button class="btn" style="flex:1" data-act="wAddOpen">+ Add widget</button><button class="btn ghost" data-act="wDone">Done</button></div></section>` : greet}
    <div class="wgrid">${L.map(([w, i]) => drawWidget(w, i, edit)).join('') || '<div class="wd-slot m"><section class="card"><p class="note">No widgets yet. Tap Customize to add some.</p></section></div>'}</div>
    ${edit ? `<div class="btns mt"><button class="btn block" data-act="wAddOpen">+ Add widget</button></div><button class="link danger mt" data-act="wReset" data-confirm>Reset to the default layout</button>`
      : '<button class="btn ghost block mt" data-act="wEdit">✏️ Customize Home</button>'}`;
}
function widgetSheet() {
  const groups = [['Everyday', null], ...S.order.map(k => [MODES[k].em + ' ' + MODES[k].label, k])];
  const items = Object.entries(WIDGETS);
  const row = ([t, d]) => { const hid = d.mode && !modeVisible(d.mode);
    return `<div class="lrow" style="align-items:center"><span style="flex:1;text-align:left;color:var(--ink)"><b>${d.em} ${esc(d.n)}</b><span class="small muted" style="display:block">${esc(d.d)}${hid ? ' (this mode is hidden)' : ''}</span></span>
      <span style="display:flex;gap:6px;flex:none">${d.sizes.includes('s') ? `<button class="btn sm ghost" data-act="wAdd" data-t="${t}" data-z="s">Small</button>` : ''}${d.sizes.includes('m') ? `<button class="btn sm${d.sizes.includes('s') ? ' ghost' : ''}" data-act="wAdd" data-t="${t}" data-z="m">Wide</button>` : ''}</span></div>`; };
  return `<div id="sheet" data-act="closeSheet"><div class="panel" data-act="noop" role="dialog" aria-modal="true" aria-label="Add a widget">
    <div class="row"><h2>Add a widget</h2><button class="link" data-act="closeSheet">Done</button></div>
    ${groups.map(([label, k]) => { const L = items.filter(([, d]) => (d.mode || null) === k); return L.length ? `<span class="label">${esc(label)}</span>${L.map(row).join('')}` : ''; }).join('')}</div></div>`;
}
function widgetTick() {
  const ty = document.querySelectorAll('.tokyo-now'); if (ty.length) { const t = tokyoNow(); ty.forEach(e => { e.textContent = t; }); }
  const wl = document.querySelectorAll('.wk-live'); if (wl.length && S.wk.clock) { const t = clock(clockMs()); wl.forEach(e => { e.textContent = t; }); }
  const pw = $('#pomoW'); if (pw && S.pomo.run) pw.textContent = clock(pomoLeft(), true);
}
Object.assign(XVIEWS, {hhome:viewHomeW});
Object.assign(XACT, {
  wGo: d => { if (S.mode !== d.k) { S.lastMode[S.mode] = S.tab; S.mode = d.k; } go(d.to); scrollTo(0, 0); },
  wPomo: () => { XACT.pomoStart(); S.lastMode[S.mode] = S.tab; S.mode = 'school'; go('kfocus'); },
  wEdit: () => { UI.homeEdit = true; },
  wDone: () => { UI.homeEdit = false; UI.wAdd = false; toast('Home saved.'); },
  wAddOpen: () => { UI.wAdd = true; },
  wAdd: d => { S.home.w.push({id:'w' + Date.now(), t:d.t, z:d.z}); UI.wAdd = false; toast(`Added ${WIDGETS[d.t].n}.`); setTimeout(() => { const s = document.querySelectorAll('.wd-slot'); if (s.length) s[s.length - 1].scrollIntoView({behavior:'smooth', block:'center'}); }, 60); },
  wDel: d => { const w = S.home.w[+d.i]; S.home.w.splice(+d.i, 1); if (w) toast(`Removed ${WIDGETS[w.t].n}.`); },
  wMove: d => { const L = S.home.w, i = +d.i, j = i + (+d.n); if (j < 0 || j >= L.length) return false; [L[i], L[j]] = [L[j], L[i]]; },
  wSize: d => { const w = S.home.w[+d.i]; if (!w) return false; w.z = w.z === 's' ? 'm' : 's'; },
  wReset: () => { S.home.w = W_DEFAULT(); },
});
normalizeHome(S);
