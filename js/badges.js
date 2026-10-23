// Hibi: Badges for every mode, grouped by category. Gym badges live in gym.js; this adds the rest and the Badges screen.
'use strict';
/* =========================================================
   Badges for every category
   ========================================================= */
Object.assign(ICON, {trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3M12 13v4M9 20h6M10 17h4"/>'});
MODES.home.nav.splice(1, 0, ['hbadges', 'Badges', 'trophy']);
Object.assign(TAB_INFO, {hbadges:{g:'hbadges', t:'Badges'}});
Object.assign(GROUPS, {hbadges:['hbadges']});
const BADGE_CATS = [['secret','🤫','Secret'],['gym','🏋️','Gym'],['cardio','🏃','Cardio'],['daily','📓','Daily'],['school','🎓','School'],['work','💼','Work'],['japan','🗾','Japan'],
  ['media','📚','Shows & Books'],['games','🎮','Games'],['save','💰','Savings'],['health','🌿','Health'],['lists','🛒','Lists'],['hibi','🌸','Hibi']];
const BADGE_CAT_OF = {cardio10:'cardio', stairs:'cardio', t1230:'cardio', stack:'daily', creat:'daily', jr7:'daily', bw7:'daily', photo:'daily'};
const badgeCat = b => b[6] || BADGE_CAT_OF[b[0]] || 'gym';
// [id, emoji, name, how to get it, real or fun, progress -> [current, goal], category]
BADGES.push(
  ['hl1','💧','Hydrated','Hit your water goal for the day','real',s => [s.hlWaterDays, 1],'health'],
  ['hl7','🌊','Water Week','Hit your water goal 7 days in a row','real',s => [s.hlWaterRun, 7],'health'],
  ['hb1','✅','Day One','Check off a habit','real',s => [s.hlChecks, 1],'health'],
  ['hb7','🔥','On a Roll','Keep a habit going 7 days in a row','real',s => [s.hlBest, 7],'health'],
  ['hb30','🏆','Habit Formed','Keep a habit going 30 days in a row','real',s => [s.hlBest, 30],'health'],
  ['sl7','🌙','Sleep Tracker','Log 7 nights of sleep','real',s => [s.slN, 7],'health'],
  ['sl10','🐻','Hibernation Mode','Sleep 10 hours or more in one night','fun',s => [s.sl10, 1],'health'],
  ['ls10','🛒','Grocery Run','Check off 10 things on your shopping list','real',s => [s.lsGot, 10],'lists'],
  ['lsdrop','📉','Price Drop','Spot a price drop on your wish list','fun',s => [s.wDrop, 1],'lists'],
  ['lsgot','🎁','Treat Yourself','Get something from your wish list','real',s => [s.wGot, 1],'lists'],
  ['c1','👟','First Steps','Log your first cardio session','real',s => [s.cn, 1],'cardio'],
  ['c25','🏃','Cardio Regular','Log 25 cardio sessions','real',s => [s.cn, 25],'cardio'],
  ['cmara','🏅','Marathon, Technically','Cover 26.2 miles (42 km) of cardio in total','fun',s => [s.cdist, byUnit(26.2, 42.2)],'cardio'],
  ['clava','🌋','The Floor Is Lava','Climb 100 floors in one session','fun',s => [s.maxFl, 100],'cardio'],
  ['jr30','📔','Main Character Diary','Write 30 journal entries','real',s => [s.jr, 30],'daily'],
  ['mood','😄','Good Vibes Only','Log a great mood 10 times','fun',s => [s.great, 10],'daily'],
  ['k1','✏️','Homework Hero','Finish your first assignment','real',s => [s.kDone, 1],'school'],
  ['k25','📚','Assignment Grinder','Finish 25 assignments','real',s => [s.kDone, 25],'school'],
  ['k100','🎓','Academic Weapon','Finish 100 assignments','real',s => [s.kDone, 100],'school'],
  ['kA','🅰️','Straight A','Have a class averaging an A','real',s => [s.kA, 1],'school'],
  ['f1','🎯','Focus Mode','Finish your first focus round','real',s => [s.fN, 1],'school'],
  ['f10h','🧠','Deep Work','Focus for 10 hours in total','real',s => [s.fMin / 60, 10],'school'],
  ['f4','🔥','Locked In (Study Edition)','Finish 4 focus rounds in one day','fun',s => [s.fDay, 4],'school'],
  ['fnight','🌙','All-Nighter','Finish a focus round between midnight and 4am','fun',s => [s.fLate, 1],'school'],
  ['fc1','🃏','Deck Builder','Make your first flashcard deck','real',s => [s.fcDecks, 1],'school'],
  ['fc100','🧠','Card Shark','Study 100 flashcards','real',s => [s.fcSeen, 100],'school'],
  ['fc1000','📇','Flashcard Grind','Study 1,000 flashcards','real',s => [s.fcSeen, 1000],'school'],
  ['fclearn','🎓','Learned It','Finish a Learn session','real',s => [s.fcLearned, 1],'school'],
  ['fcperf','💯','Perfect Score','Get 100% on a practice test','fun',s => [s.fcPerfect, 1],'school'],
  ['fcmatch','⚡','Speed Matcher','Finish Match in under 20 seconds','fun',s => [s.fcFast, 1],'school'],
  ['kspring','🌸','Next Semester Ready','Add classes for an upcoming semester','fun',s => [s.kNext, 1],'school'],
  ['w1','⏱️','Clocked In','Log your first shift','real',s => [s.wkShifts, 1],'work'],
  ['w100h','💼','Hundred Hours','Work 100 hours in total','real',s => [s.wkHours, 100],'work'],
  ['w500h','🏢','Employee of the Month','Work 500 hours in total','real',s => [s.wkHours, 500],'work'],
  ['w40','📆','Full Time','Work 40 hours in one week','real',s => [s.wkWeek, 40],'work'],
  ['wpay','💵','Payday','Get through your first logged pay period','real',s => [s.wkPaid, 1],'work'],
  ['wot','🥵','Overtime Arc','Work overtime in a week','fun',s => [s.wkOT, 1],'work'],
  ['wbonus','🎉','Bonus Round','Log a bonus','fun',s => [s.wkBonus, 1],'work'],
  ['jprep','🛂','Passport Ready','Finish your whole pre-trip to-do list','real',s => [s.jpPrep, 1],'japan'],
  ['jpack','🧳','Packed and Ready','Check off everything on your packing list','real',s => [s.jpPack, 1],'japan'],
  ['jland','⛩️',"Isekai'd",'Spend your first day in Japan','fun',s => [s.jpDays, 1],'japan'],
  ['jweek','🗾','Local Now','Spend 14 days in Japan','fun',s => [s.jpDays, 14],'japan'],
  ['jdiary','📝','Travel Diary','Write 5 trip journal entries','real',s => [s.jpJ, 5],'japan'],
  ['jgift','🎁','Omiyage Master','Buy every gift on your gift list','fun',s => [s.jpGift, 1],'japan'],
  ['md1','🎬','Opening Theme','Add your first show or book','real',s => [s.mdN, 1],'media'],
  ['ep100','📺','Binge Watcher','Watch 100 episodes','real',s => [s.ep, 100],'media'],
  ['ep500','🍿','Just One More Episode','Watch 500 episodes','fun',s => [s.ep, 500],'media'],
  ['ch100','📖','Bookworm','Read 100 chapters','real',s => [s.ch, 100],'media'],
  ['ch1000','🐛','Chapter Goblin','Read 1,000 chapters','fun',s => [s.ch, 1000],'media'],
  ['mdfin10','✅','Arc Complete','Finish 10 shows or books','real',s => [s.mdFin, 10],'media'],
  ['md10','💯','Peak Fiction','Rate something a 10','fun',s => [s.md10, 1],'media'],
  ['mdfav','❤️','Comfort Shows','Favorite 5 shows or books','fun',s => [s.mdFav, 5],'media'],
  ['g1','🕹️','Player One','Add your first game','real',s => [s.gN, 1],'games'],
  ['gbeat','🏁','Credits Roll','Beat a game','real',s => [s.gBeat, 1],'games'],
  ['gbeat10','👾','Final Boss','Beat 10 games','real',s => [s.gBeat, 10],'games'],
  ['gfull','💎','Completionist','100% a game','real',s => [s.gFull, 1],'games'],
  ['grate','🧐','Critic','Rate 10 games','real',s => [s.gRated, 10],'games'],
  ['ggenre','🌈','Genre Hopper','Have games in 5 different genres','fun',s => [s.gGenres, 5],'games'],
  ['gpile','📚','Pile of Shame','Have 10 games in Want to play','fun',s => [s.gPlan, 10],'games'],
  ['gdrop','😤','Rage Quit','Drop a game','fun',s => [s.gDrop, 1],'games'],
  ['gq','📋','Next Up','Line up 3 games in Up next','fun',s => [s.gQueue, 3],'games'],
  ['sv1','🪙','First Coin','Make your first savings deposit','real',s => [s.svDep, 1],'save'],
  ['sv100','🏦','Bank Arc','Save $100 in total','real',s => [s.svTotal, 100],'save'],
  ['sv1000','💰','Four Digits','Save $1,000 in total','real',s => [s.svTotal, 1000],'save'],
  ['svgoal','🎯','Goal Get','Reach a savings goal','real',s => [s.svGoals, 1],'save'],
  ['sv20','🐷','Piggy Bank Regular','Make 20 deposits','fun',s => [s.svDep, 20],'save'],
  ['hdbx','☁️','Cloud Save','Connect Dropbox backup','real',s => [s.dbx, 1],'hibi'],
  ['hwrap','🎁','Wrapped Up','Watch a Hibi Wrapped','fun',s => [s.wrapped, 1],'hibi'],
  ['htheme','🎨','Fashionista','Try 5 themes','fun',s => [s.themes, 5],'hibi'],
  ['hface','🙂','Face Reveal','Turn on Face ID unlock','fun',s => [s.face, 1],'hibi'],
  ['hmusic','🎧','Aux Cord','Connect stats.fm','fun',s => [s.music, 1],'hibi'],
  ['hall','🌸','Everything App','Use 6 different modes','real',s => [s.modes, 6],'hibi'],
  // Secret badges: hidden until you find them
  ['x-petal','🌸','Petal Pusher','Tap the Hibi logo 10 times. It tickles.','secret',s => [s.x.logo || 0, 10],'secret'],
  ['x-39','💙','Thank You (39)','Switch to the Miku theme. 39 sounds like "thank you" in Japanese.','secret',s => [s.x.miku || 0, 1],'secret'],
  ['x-am3','🫠','3AM Thoughts','Open Hibi between 3 and 4 in the morning. Go to sleep.','secret',s => [s.x.am3 || 0, 1],'secret'],
  ['x-wish','🌠','Make a Wish','Open Hibi at exactly 11:11','secret',s => [s.x.wish || 0, 1],'secret'],
  ['x-newyear','🎆','New Year, Same Me','Open Hibi on New Year\'s Day','secret',s => [s.x.newyear || 0, 1],'secret'],
  ['x-clingy','🥺','Clingy','Open Hibi 7 days in a row','secret',s => [s.openRun, 7],'secret'],
  ['x-who','🕵️','Who Are You?','Get the passcode wrong 3 times','secret',s => [s.x.pinWrong || 0, 3],'secret'],
  ['x-indecisive','🎨',"Can't Decide",'Switch themes 10 times in one day','secret',s => [s.x.thN || 0, 10],'secret'],
  ['x-eyes','😴','Just Resting My Eyes','Pause a workout for over 30 minutes','secret',s => [s.x.longPause || 0, 1],'secret'],
  ['x-speed','⚡','Any% Speedrun','Finish a workout of 3+ sets in under 10 minutes','secret',s => [s.x.speed || 0, 1],'secret'],
  ['x-tiny','🪶','Warm-Up Counts, Right?','Finish a workout that lifted under 100 total','secret',s => [s.x.tiny || 0, 1],'secret'],
  ['x-closing','🌃','Closing Shift','Clock out after midnight','secret',s => [s.x.lateShift || 0, 1],'secret'],
  ['x-falsealarm','🚨','False Alarm','Cancel a shift you clocked in for','secret',s => [s.x.cancelShift || 0, 1],'secret'],
  ['x-distracted','🐿️','Squirrel!','Skip 5 focus rounds','secret',s => [s.x.skipFocus || 0, 5],'secret'],
  ['x-brutal','🔪','Brutal','Rate a game or show a 1 out of 10','secret',s => [s.rated1, 1],'secret'],
  ['x-peak','🗻','Everything Is Peak','Rate 5 games or shows a 10','secret',s => [s.rated10, 5],'secret'],
  ['x-backlog','♾️','The Backlog Is Endless','Have 50 games in Want to play','secret',s => [s.gPlan, 50],'secret'],
  ['x-designer','🛋️','Interior Designer','Put 10 widgets on your Home screen','secret',s => [s.widgets, 10],'secret']
);
// Extra numbers for the badges above, added to the gym stats
function statsMore() {
  const o = {}, C = cardioLogs();
  o.cn = C.length; o.cdist = C.reduce((t, x) => t + (x.k === 'stairs' ? 0 : distOf(x)), 0); o.maxFl = Math.max(0, ...C.map(x => num(x.fl)));
  o.great = S.j.filter(e => e.m === 5).length;
  o.kDone = S.sc.tasks.filter(t => t.done).length;
  o.kA = S.sc.classes.some(c => { const g = kGrade(c.id); return g && /^A/.test(g.letter); }) ? 1 : 0;
  const cur = termKey(termOf(new Date())); o.kNext = S.sc.classes.some(c => termKey(c.term) > cur) ? 1 : 0;
  const L = S.pomo.log, days = {}; L.forEach(x => { const k = dk(new Date(x[0])); days[k] = (days[k] || 0) + 1; });
  o.fN = L.length; o.fMin = L.reduce((t, x) => t + x[1], 0); o.fDay = Math.max(0, ...Object.values(days)); o.fLate = L.filter(x => new Date(x[0]).getHours() < 4).length;
  const sh = shiftsSplit(), wk = {};
  sh.forEach(s => { const k = weekStart(keyDate(s.d).getTime()); wk[k] = (wk[k] || 0) + s.mins; });
  o.wkShifts = sh.length; o.wkHours = sh.reduce((t, s) => t + s.mins, 0) / 60; o.wkWeek = Math.max(0, ...Object.values(wk)) / 60;
  o.wkOT = sh.some(s => s.ot > 0) ? 1 : 0; o.wkBonus = S.wk.bonus.length + S.wk.rbonus.length;
  o.wkPaid = S.wk.rate && sh.length && periodFor(sh[0].d).pay <= today() ? 1 : 0;
  const J = S.jp; o.jpPrep = J.prep.length && J.prep.every(p => p.done) ? 1 : 0; o.jpPack = J.pack.length && J.pack.every(p => p.done) ? 1 : 0;
  o.jpDays = tripDays().filter(d => d <= today()).length; o.jpJ = Object.values(J.journal || {}).filter(x => x && (x.text || x.best)).length;
  o.jpGift = J.gifts.length && J.gifts.every(g => g.done) ? 1 : 0;
  const M = S.md.items; o.mdN = M.length; o.ep = S.md.count.ep || 0; o.ch = S.md.count.ch || 0; o.mdFin = M.filter(m => m.status === 'done').length;
  o.md10 = M.some(m => m.rating >= 10) ? 1 : 0; o.mdFav = M.filter(m => m.fav).length;
  const G = S.gm.items; o.gN = G.length; o.gBeat = G.filter(gDone).length; o.gFull = G.filter(g => g.status === 'full').length; o.gRated = G.filter(g => g.rating).length;
  o.gGenres = new Set(G.flatMap(g => g.genres)).size; o.gPlan = G.filter(g => g.status === 'plan').length; o.gDrop = G.filter(g => g.status === 'drop').length; o.gQueue = S.gm.queue.length;
  o.svDep = S.sv.tx.filter(t => num(t.amt) > 0).length; o.svTotal = S.sv.tx.reduce((t, x) => t + num(x.amt), 0); o.svGoals = S.sv.goals.filter(svDone).length;
  let dbx = 0; try { dbx = DBX.rt ? 1 : 0; } catch (e) {}
  o.dbx = dbx; o.wrapped = Object.keys(S.wrapSeen).length && S.wrapViewed ? 1 : 0; o.themes = (S.themesUsed || []).length; o.face = S.faceId ? 1 : 0; o.music = S.mu.artists.length ? 1 : 0;
  const used = [S.history.length, o.kDone + S.sc.classes.length, o.wkShifts, J.items.length + J.flights.length, M.length, G.length, S.sv.tx.length].filter(Boolean).length;
  o.modes = used;
  o.x = S.sx;
  const ds = [...new Set(S.sx.opens)].sort(); let run = 0; o.openRun = 0;
  ds.forEach((x, i) => { run = i && Math.round((keyDate(x) - keyDate(ds[i - 1])) / 864e5) === 1 ? run + 1 : 1; o.openRun = Math.max(o.openRun, run); });
  const R = [...S.md.items, ...S.gm.items].map(x => x.rating || 0); o.rated1 = R.filter(r => r === 1).length; o.rated10 = R.filter(r => r >= 10).length;
  o.widgets = S.home && S.home.w ? S.home.w.length : 0;
  if (S.hl) { const wk = Object.keys(S.hl.water).filter(k => waterOz(k) >= S.hl.goal).sort(); o.hlWaterDays = wk.length; o.hlWaterRun = 0; let rn = 0;
    wk.forEach((k, i) => { rn = i && hlAdd(wk[i - 1], 1) === k ? rn + 1 : 1; o.hlWaterRun = Math.max(o.hlWaterRun, rn); });
    o.hlChecks = Object.values(S.hl.done).reduce((t, L) => t + L.length, 0); o.hlBest = Math.max(0, ...S.hl.habits.map(hlBest));
    o.slN = S.hl.sleep.length; o.sl10 = S.hl.sleep.some(x => slMin(x) >= 600) ? 1 : 0; }
  if (S.fc) { o.fcDecks = S.fc.decks.length; o.fcSeen = S.fc.st.seen; o.fcLearned = S.fc.st.learned; o.fcPerfect = S.fc.st.perfect; o.fcFast = S.fc.st.match && S.fc.st.match < 200 ? 1 : 0; }
  if (S.ls) { o.lsGot = S.ls.got; o.wDrop = S.ls.wish.some(w => { const f = wFirst(w); return f && w.prices.some(x => x.p < f.p); }) ? 1 : 0; o.wGot = S.ls.wish.filter(w => w.got).length; }
  return o;
}
function viewBadges() {
  const s = stats(), n = BADGES.filter(b => S.bd[b[0]]).length, f = S.bf || 'all';
  const card = ([id, em, name, desc, kind, fn]) => {
    const [c, g] = fn(s), on = !!S.bd[id];
    if (kind === 'secret' && !on) return `<div class="badge lock secret"><div class="em" aria-hidden="true">❓</div><b>???</b><span>Secret badge. Keep exploring.</span></div>`;
    return `<div class="badge${on ? '' : ' lock'}${kind === 'fun' ? ' fun' : ''}"><div class="em" aria-hidden="true">${em}</div><b>${esc(name)}</b><span>${esc(desc)}</span>
      ${on ? `<span>Unlocked ${fmtMD(new Date(S.bd[id]))}</span>` : `<div class="meter" role="progressbar" aria-label="${esc(name)} progress" aria-valuenow="${Math.floor(Math.min(c, g))}" aria-valuemax="${g}"><i style="width:${Math.min(100, c / g * 100)}%"></i></div>`}</div>`;
  };
  const order = L => L.slice().sort((a, b) => (S.bd[b[0]] ? 1 : 0) - (S.bd[a[0]] ? 1 : 0) || (() => { const [ca, ga] = a[5](s), [cb, gb] = b[5](s); return cb / gb - ca / ga; })());
  const cats = [...BADGE_CATS.slice(1), BADGE_CATS[0]].map(([k, em, l]) => [k, em, l, BADGES.filter(b => badgeCat(b) === k)]).filter(x => x[3].length);
  return `<section class="card"><div class="row"><h2>Collection</h2><b>${n} / ${BADGES.length}</b></div><div class="meter"><i style="width:${n / BADGES.length * 100}%"></i></div>
      <div class="chips mt">${chip('All', f === 'all', 'data-act="badgeF" data-f="all"')}${cats.map(([k, em, l, L]) => chip(`${em} ${l} ${L.filter(b => S.bd[b[0]]).length}/${L.length}`, f === k, `data-act="badgeF" data-f="${k}"`)).join('')}</div></section>
    ${cats.filter(c => f === 'all' || c[0] === f).map(([k, em, l, L]) => `<h2 class="sec">${em} ${esc(l)} <span class="small muted">${L.filter(b => S.bd[b[0]]).length} of ${L.length}</span></h2>
      <div class="badges">${order(L).map(card).join('')}</div>`).join('')}
    <p class="note">Fun badges have a dashed border. Locked badges show how close you are. Secret badges stay hidden until you find them.</p>`;
}
Object.assign(XVIEWS, {hbadges:viewBadges});
Object.assign(XACT, {badgeF: d => { S.bf = d.f; },
  logoTap: () => { sxBump('logo'); const n = S.sx.logo; if ([3, 7].includes(n)) toast(n === 3 ? '🌸 Hehe.' : '🌸 Okay, that tickles.'); checkBadges(); saveRaw(); if (n >= 10 && n < 12) render(); return false; }});
