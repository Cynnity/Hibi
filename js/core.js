// Hibi: Constants, helpers, saving and loading, and the mode list.
'use strict';
// Bump this with every release, together with CHANGELOG.md and the cache name in sw.js.
const APP_VERSION = '2.4';

/* =========================================================
   Constants and reference data
   ========================================================= */
const KEY = 'liftlog:v1';
const MUSCLES = ['Chest','Back','Shoulders','Biceps','Triceps','Forearms','Core','Obliques','Traps','Lower Back','Glutes','Quads','Hamstrings','Calves'];
const DEFAULT_CATS = [['upper','Upper'],['lower','Lower'],['push','Push'],['pull','Pull'],['legs','Legs']];

// name | categories | muscles | how-to
const SEED = `Bench Press|upper push|Chest,Triceps,Shoulders|Lie flat, grip just outside shoulders, lower the bar to mid-chest, press up. Feet planted, shoulder blades pinched.
Incline Dumbbell Press|upper push|Chest,Shoulders,Triceps|Bench at 30 degrees. Lower the dumbbells to your upper chest, press up, keep elbows about 45 degrees from your body.
Cable Fly|upper push|Chest|Slight elbow bend, bring the handles together in front of your chest, squeeze, open slowly.
Overhead Press|upper push|Shoulders,Triceps|Bar at collarbone, squeeze glutes, press straight up and move your head through at the top.
Lateral Raise|upper push|Shoulders|Slight elbow bend, raise arms out to shoulder height, lower slowly. No swinging.
Triceps Pushdown|upper push|Triceps|Elbows pinned at your sides, push the cable down until arms are straight, control the return.
Dips|upper push|Chest,Triceps|Lean forward slightly, lower until shoulders are just below elbows, press back up.
Pull-Up|upper pull|Back,Biceps|Hang from the bar, pull your chest toward it by driving elbows down, lower fully.
Barbell Row|upper pull|Back,Biceps,Lower Back|Hinge to about 45 degrees with a flat back, pull the bar to your lower ribs, squeeze, lower slowly.
Lat Pulldown|upper pull|Back,Biceps|Chest tall, pull the bar to your upper chest with elbows down and back, return slowly.
Seated Cable Row|upper pull|Back,Biceps|Sit tall, pull the handle to your stomach, squeeze shoulder blades, don't rock.
Face Pull|upper pull|Shoulders,Back,Traps|Rope at face height, pull toward your face with elbows high, rotate hands outward.
Shrug|upper pull|Traps|Hold the weight at your sides, lift your shoulders straight up toward your ears, pause, lower slowly.
Biceps Curl|upper pull|Biceps,Forearms|Elbows at your sides, curl up without swinging, lower for 2 seconds.
Hammer Curl|upper pull|Biceps,Forearms|Palms facing in, curl the dumbbells up, keep elbows still.
Plank|upper lower|Core,Obliques|Forearms down, body in a straight line, brace your abs, breathe steadily.
Cable Crunch|upper|Core|Kneel facing the cable, hold the rope by your head, crunch your ribs toward your hips, return slowly.
Russian Twist|lower|Obliques,Core|Sit leaning back with feet up or down, rotate your torso side to side with control.
Squat|lower legs|Quads,Glutes,Core|Bar on upper back, feet shoulder-width, sit down between your hips, knees track toes, drive up.
Romanian Deadlift|lower legs|Hamstrings,Glutes,Lower Back|Soft knees, push hips back with the bar close to your legs until hamstrings stretch, stand tall.
Deadlift|lower pull|Back,Hamstrings,Glutes,Lower Back|Bar over mid-foot, flat back, push the floor away, lock out hips, lower with control.
Back Extension|lower pull|Lower Back,Glutes,Hamstrings|Hips on the pad, lower your torso with a flat back, rise until your body is straight. Don't overarch.
Leg Press|lower legs|Quads,Glutes|Feet shoulder-width, lower until knees are about 90 degrees, press without locking out.
Walking Lunge|lower legs|Quads,Glutes|Take a long step, drop the back knee toward the floor, push through the front heel.
Leg Curl|lower legs|Hamstrings|Hips pinned, curl heels toward glutes, pause, return slowly.
Leg Extension|lower legs|Quads|Sit back, extend until legs are straight, squeeze quads, lower slowly.
Hip Thrust|lower legs|Glutes,Hamstrings|Upper back on a bench, bar over hips, drive up until hips are level, squeeze.
Calf Raise|lower legs|Calves|Rise onto your toes as high as you can, pause, lower to a full stretch.`;

const STRETCHES = `Chest|Doorway stretch|Forearm on a door frame, elbow at shoulder height, step through until you feel it across your chest. 30 seconds a side.
Back|Child's pose|Kneel, sit your hips back, reach your arms forward on the floor and breathe. 30 to 45 seconds.
Shoulders|Cross-body stretch|Pull one arm across your chest with the other hand. 30 seconds a side.
Biceps|Wall biceps stretch|Palm flat on a wall behind you, fingers pointing back, turn your body away gently. 30 seconds a side.
Triceps|Overhead triceps stretch|Reach one hand down your back and press that elbow back with the other hand. 30 seconds a side.
Forearms|Wrist flexor stretch|Arm out, palm up, gently pull your fingers back with the other hand. 20 to 30 seconds a side.
Core|Cobra stretch|Lie face down, press up through your hands, keep your hips on the floor. 20 to 30 seconds.
Obliques|Standing side bend|Reach one arm overhead and lean to the opposite side. 20 to 30 seconds a side.
Traps|Neck and upper trap stretch|Tilt your ear toward your shoulder and let the weight of your head do the work. 20 to 30 seconds a side.
Lower Back|Knees-to-chest stretch|Lie on your back and hug both knees toward your chest. 20 to 30 seconds.
Glutes|Figure-four stretch|Lying down, cross an ankle over the opposite knee and pull that knee toward your chest. 30 seconds a side.
Quads|Standing quad stretch|Pull your heel toward your glute, knees together, stand tall. 30 seconds a side.
Hamstrings|Seated forward fold|Legs straight, hinge from the hips toward your toes with a flat back. 30 to 45 seconds.
Calves|Wall calf stretch|Hands on a wall, back heel down and leg straight, lean in. 30 seconds a side.`.split('\n').map(l => l.split('|'));

const MOODS = [['😞','Rough'],['😕','Meh'],['😐','Okay'],['🙂','Good'],['😄','Great']];
const THEMES = [
  ['sakura','Sakura','#F0467F','#2BB8D0'],['midnight','Midnight','#8B6CFF','#141B2D'],['ocean','Ocean','#0A86AA','#F2A541'],
  ['forest','Forest','#86D993','#1F2B22'],['sunset','Sunset','#E8590C','#B5179E'],['mono','Mono','#141414','#F3F3F1'],
  ['ink','Ink','#FFFFFF','#000000'],['matcha','Matcha','#4F8A3C','#D98E73'],['aqua','Aqua','#16A9A3','#E0457B'],
  ['neon','Neon','#FF2E88','#00E5FF'],['royal','Royal','#F2C14E','#0E1530'],['miku','Miku','#39C5BB','#E4508C']];

const TAB_INFO = {
  workout:{g:'workout',t:'Workout'},
  catalog:{g:'library',t:'Exercises'}, care:{g:'library',t:'Stretching'},
  history:{g:'progress',t:'Lifts'}, body:{g:'progress',t:'Body'}, badges:{g:'progress',t:'Badges'},
  today:{g:'daily',t:'Supplements'}, journal:{g:'daily',t:'Journal'},
  settings:{g:'settings',t:'Settings'}};
const GROUPS = {workout:['workout'],library:['catalog','care'],progress:['history','body','badges'],daily:['today','journal'],settings:['settings']};

const ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

/* =========================================================
   Utilities
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => parseFloat(v) || 0;
const norm = s => String(s).trim().toLowerCase();
const pad = n => String(n).padStart(2, '0');
const dk = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => dk(new Date());
const keyDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtMD = d => d.toLocaleDateString(undefined, {month:'short', day:'numeric'});
const fmtLong = t => new Date(t).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
const fmtN = v => { const r = Math.round(v * 10) / 10; return r.toLocaleString(); };
const short = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n));
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const daysBack = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
const toggleIn = (arr, v) => { const i = arr.indexOf(v); i < 0 ? arr.push(v) : arr.splice(i, 1); };
function clock(ms, roundUp) {
  let s = Math.max(0, roundUp ? Math.ceil(ms / 1000) : Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); s %= 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
// Activity log for things that only keep running totals (episodes, chapters, game hours), so recaps know when they happened.
// Each entry: [time, kind, amount, item id]
const logAct = (k, n, id) => { if (n) S.alog.push([Date.now(), k, n, id || '']); };
// Running time for anything that can be paused: {start, pausedMs, pausedAt}
const runMs = r => r ? Math.max(0, (r.pausedAt || Date.now()) - r.start - (r.pausedMs || 0)) : 0;
function togglePause(r) { if (!r) return; if (r.pausedAt) { r.pausedMs = (r.pausedMs || 0) + (Date.now() - r.pausedAt); r.pausedAt = 0; } else r.pausedAt = Date.now(); }
// Hands a calendar (.ics) file to iPhone, which offers to add the events to Calendar
function saveCalendar(text, filename, count) {
  let framed = true; try { framed = window.top !== window; } catch (e) {}
  if (framed) { toast('This works from your Home Screen app.'); return; }
  const url = URL.createObjectURL(new Blob([text], {type:'text/calendar'})), a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  toast(`Calendar file with ${plural(count, 'event')} is ready. Open it and tap Add All.`);
}
const icsEsc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const icsWrap = (events, name) => ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//Hibi//${name}//EN`, 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n');
// Bumps a secret-badge counter
const sxBump = (k, n) => { S.sx[k] = (S.sx[k] || 0) + (n || 1); };
const weekStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const chip = (text, on, attrs) => `<button class="chip${on ? ' on' : ''}" aria-pressed="${!!on}" ${attrs}>${esc(text)}</button>`;

/* =========================================================
   State: load, normalize, save
   ========================================================= */
function seedExercises() {
  return SEED.split('\n').map((l, i) => {
    const [name, cats, muscles, how] = l.split('|');
    return {id:'s' + i, name, cats:cats.split(' '), muscles:muscles.split(','), how};
  });
}
function blank() {
  return {unit:'lb', rest:90, wg:8, theme:'sakura', tab:'workout', last:{}, history:[], active:null, timer:null,
    cats:null, ex:null, bw:[], j:[], sup:null, sl:{}, wt:{}, st:{}, sp:{}, bd:{}, cf:'all', cm:'all', pick:null, lb:0, tpl:[], rr:'6-10', inc:null, bar:null};
}
function normalize(s) {
  if (!Array.isArray(s.history)) s.history = [];
  if (!Array.isArray(s.cats)) s.cats = DEFAULT_CATS.map(([id, name]) => ({id, name}));
  if (!Array.isArray(s.ex)) s.ex = seedExercises();
  s.ex.forEach(e => { if (!Array.isArray(e.cats)) e.cats = []; if (!Array.isArray(e.muscles)) e.muscles = []; if (!e.how) e.how = 'No notes yet.'; });
  if (!Array.isArray(s.sup)) s.sup = [{id:'creatine', name:'Creatine', dose:''}, {id:'omega3', name:'Omega-3', dose:''}];
  for (const k of ['bw', 'j', 'tpl']) if (!Array.isArray(s[k])) s[k] = [];
  if (!/^\d+-\d+$/.test(s.rr || '')) s.rr = '6-10';
  if (typeof s.bar !== 'number') s.bar = null; if (typeof s.inc !== 'number') s.inc = null;
  for (const k of ['sl', 'wt', 'st', 'sp', 'bd', 'last']) if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = {};
  if (s.active && !Array.isArray(s.active.muscles)) s.active.muscles = [];
  s.ex.forEach(e => { if (e.kind && !CARDIO[e.kind]) delete e.kind; });
  if (!s.cardioV) seedCardio(s);
  if (!Array.isArray(s.cardio)) s.cardio = [];
  if (s.crun && !(s.crun.start && CARDIO[s.crun.k])) s.crun = null;
  if (s.tab === 'nutrition') s.tab = 'today';
  if (!TAB_INFO[s.tab]) s.tab = 'workout';
  if (!THEMES.some(t => t[0] === s.theme)) s.theme = 'sakura';
  normalizeJp(s);
  normalizeMd(s);
  normalizeGm(s);
  normalizeMu(s);
  normalizePomo(s);
  normalizeWk(s);
  if (typeof normalizeHome === 'function') normalizeHome(s);
  if (typeof normalizeIdeas === 'function') normalizeIdeas(s);
  if (typeof normalizeSubs === 'function') normalizeSubs(s);   // widgets.js loads after the state, so it also runs this itself
  if (!Array.isArray(s.alog)) s.alog = [];
  { const cut = Date.now() - 800 * 864e5; s.alog = s.alog.filter(a => Array.isArray(a) && a[0] > cut); }
  if (!s.wrapSeen || typeof s.wrapSeen !== 'object') s.wrapSeen = {};
  if (!s.wrapSince) s.wrapSince = Date.now();
  if (!Array.isArray(s.themesUsed)) s.themesUsed = [s.theme || 'sakura'];
  if (!s.sx || typeof s.sx !== 'object') s.sx = {};   // counters for secret badges
  if (!Array.isArray(s.sx.opens)) s.sx.opens = [];   // Wrapped only opens on its own for periods that end after this
  normalizeSv(s);
  normalizeExtra(s);
  return s;
}
function load() {
  let data = {};
  try { data = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  return normalize(Object.assign(blank(), data));
}
function saveRaw() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function save() { saveRaw(); try { dbxSchedule(); } catch (e) {} }

/* =========================================================
   Modes (Gym, Japan) and their bottom tabs
   ========================================================= */
const ICON = {
  workout:'<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  library:'<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>',
  progress:'<path d="M3 20h18M6 16l4-5 3 3 5-7"/>',
  daily:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/>',
  settings:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  plan:'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  money:'<path d="M7 4l5 7 5-7M12 11v9M8 13h8M8 16.5h8"/>',
  book:'<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M14 8v1.5M14 11.3v1.4M14 14.5V16"/>',
  lists:'<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 6l1.2 1.2L7.5 5M4 12l1.2 1.2L7.5 11M4 18l1.2 1.2L7.5 17"/>'};
const MODES = {
  gym:{label:'Gym', em:'🏋️', nav:[['workout','Workout','workout'],['library','Library','library'],['progress','Progress','progress'],['daily','Daily','daily'],['settings','Settings','settings']]},
  japan:{label:'Japan', em:'🗾', nav:[['jplan','Plan','plan'],['jmoney','Money','money'],['jbook','Bookings','book'],['jlists','Lists','lists'],['settings','Settings','settings']]}};
Object.assign(TAB_INFO, {
  jplan:{g:'jplan',t:'Itinerary'}, jprep:{g:'jplan',t:'To-do'}, jjournal:{g:'jplan',t:'Journal'}, jgifts:{g:'jlists',t:'Gifts'}, jmoney:{g:'jmoney',t:'Budget'}, jconv:{g:'jmoney',t:'Converter'},
  jflights:{g:'jbook',t:'Flights'}, jstays:{g:'jbook',t:'Stays'},
  jpack:{g:'jlists',t:'Packing'}, jplaces:{g:'jlists',t:'Places'}, jphrases:{g:'jlists',t:'Phrases'}, jinfo:{g:'jlists',t:'Info'}});
Object.assign(GROUPS, {jplan:['jplan','jprep','jjournal'], jmoney:['jmoney','jconv'], jbook:['jflights','jstays'], jlists:['jpack','jplaces','jgifts','jphrases','jinfo']});
const firstTab = mode => GROUPS[MODES[mode].nav[0][0]][0];
const modeOfGroup = g => Object.keys(MODES).find(m => m !== 'gym' && MODES[m].nav.some(n => n[0] === g && g !== 'settings')) || 'gym';
const modeBar = () => `<div class="modes" role="tablist" aria-label="Mode">${orderedModes().filter(k => modeVisible(k)).map(k => [k, MODES[k]]).map(([k, m]) =>
  `<button role="tab" aria-selected="${S.mode === k}" data-act="mode" data-k="${k}" title="${m.label}"><span aria-hidden="true">${m.em}</span>${S.mode === k ? m.label : `<span class="vh">${m.label}</span>`}</button>`).join('')}</div>`;
