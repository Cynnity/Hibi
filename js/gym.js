// Hibi: Gym logic: lifting helpers, progression hints, plate math, body diagram, charts and badges.
'use strict';
/* =========================================================
   Lifting helpers
   ========================================================= */
const exInfo = name => S.ex.find(e => norm(e.name) === norm(name));

const catName = id => (S.cats.find(c => c.id === id) || {}).name || 'Workout';
const tplAfter = id => { const L = S.tpl.filter(t => !t.archived); if (!L.length) return null; const i = L.findIndex(t => t.id === id); return L[(i + 1) % L.length].id; };
const nextTpl = () => S.tpl.find(t => t.id === S.next && !t.archived) || S.tpl.find(t => !t.archived) || null;
const topOf = e => Math.max(0, ...e.sets.map(s => num(s.w)));
const volOf = w => w.exercises.reduce((t, e) => t + e.sets.reduce((u, s) => u + num(s.w) * num(s.r), 0), 0);
const loggedNames = () => [...new Set(S.history.flatMap(w => w.exercises.filter(e => !kindOf(e)).map(e => e.name)))].sort((a, b) => a.localeCompare(b));
const cardioNames = () => [...new Set(cardioLogs().map(x => x.name))].sort((a, b) => a.localeCompare(b));
function series(name) {
  const n = norm(name), out = [];
  for (const w of S.history) { const e = w.exercises.find(x => norm(x.name) === n); if (e) out.push({l:fmtMD(new Date(w.end)), v:topOf(e)}); }
  return out;
}
function prevFor(name, i) {
  const n = norm(name);
  for (let h = S.history.length - 1; h >= 0; h--) {
    const e = S.history[h].exercises.find(x => norm(x.name) === n);
    if (e) return e.sets[i] || null;
  }
  return null;
}
function bestSets() {
  const best = {};
  for (const w of S.history) for (const e of w.exercises) if (!kindOf(e)) for (const s of e.sets) {
    const k = norm(e.name), v = num(s.w), r = num(s.r), b = best[k];
    if (!b || v > b.v || (v === b.v && r > b.r)) best[k] = {name:e.name, v, r, d:w.end};
  }
  return Object.values(best).sort((a, b) => a.name.localeCompare(b.name));
}

/* =========================================================
   Progression hints (double progression) and plate math
   ========================================================= */
const repRange = () => (S.rr || '6-10').split('-').map(Number);
const inc = () => S.inc || (S.unit === 'kg' ? 2.5 : 5);
const incOpts = () => S.unit === 'kg' ? [1, 1.25, 2.5, 5] : [2.5, 5, 10];
const barW = () => S.bar || (S.unit === 'kg' ? 20 : 45);
const barOpts = () => S.unit === 'kg' ? [20, 15, 10] : [45, 35, 15];
function lastSession(name) {
  const n = norm(name);
  for (let h = S.history.length - 1; h >= 0; h--) { const e = S.history[h].exercises.find(x => norm(x.name) === n); if (e) return e; }
  return null;
}
function hintFor(name) {
  const last = lastSession(name); if (!last || kindOf(last)) return null;
  const [lo, hi] = repRange(), top = topOf(last); if (!(top > 0)) return null;
  const reps = last.sets.filter(s => num(s.w) === top).map(s => num(s.r)), minR = Math.min(...reps);
  if (minR >= hi) {
    const w = Math.round((top + inc()) * 100) / 100;
    return {up:true, w, r:lo, text:`You hit ${hi}+ reps on every set at ${fmtN(top)} last time. Go up to <b>${fmtN(w)} ${S.unit}</b> and aim for ${lo}+ reps.`};
  }
  if (minR < lo) return {up:false, w:top, r:lo, text:`Stay at <b>${fmtN(top)} ${S.unit}</b> and get every set to at least ${lo} reps.`};
  const goal = Math.min(hi, minR + 1);
  return {up:false, w:top, r:goal, text:`Stay at <b>${fmtN(top)} ${S.unit}</b> and aim for <b>${goal} reps</b> on every set. Hit ${hi} on all of them and it's time to add weight.`};
}
function hintHtml(ex, xi) {
  const h = hintFor(ex.name); if (!h) return '';
  return `<div class="hint${h.up ? ' up' : ''}"><span class="txt">${h.up ? '⬆️ ' : ''}${h.text}</span><button class="btn sm ghost" data-act="applyHint" data-x="${xi}">Use</button></div>`;
}
const PLATES = {
  lb:[[45,'#2B5BD7'],[35,'#E5B80B'],[25,'#2E9E5B'],[10,'#F2F2F2'],[5,'#C0392B'],[2.5,'#4A4A4A']],
  kg:[[25,'#D7263D'],[20,'#2B5BD7'],[15,'#E5B80B'],[10,'#2E9E5B'],[5,'#F2F2F2'],[2.5,'#4A4A4A'],[1.25,'#A8A8A8']]};
function plateMath(total) {
  const list = PLATES[S.unit === 'kg' ? 'kg' : 'lb'], bar = barW();
  if (!(total > 0)) return {err:'Type a total weight or tap one below.'};
  if (total < bar) return {err:`That's less than the ${fmtN(bar)} ${S.unit} bar.`};
  let side = (total - bar) / 2; const out = [];
  for (const [p, c] of list) while (side >= p - 1e-9) { out.push([p, c]); side = Math.round((side - p) * 1000) / 1000; }
  return {out, left:side * 2, bar};
}
function plateResult() {
  const total = num(UI.plates.w), r = plateMath(total);
  if (r.err) return `<p class="note">${r.err}</p>`;
  const maxP = PLATES[S.unit === 'kg' ? 'kg' : 'lb'][0][0];
  let x = 58;
  const rects = r.out.map(([p, c]) => { const h = 30 + 72 * (p / maxP), w = p >= 10 ? 16 : 10;
    const s = `<rect x="${x}" y="${(60 - h / 2).toFixed(1)}" width="${w}" height="${h.toFixed(1)}" rx="3" fill="${c}" stroke="var(--ink)" stroke-width="1.5"/>`; x += w + 2; return s; }).join('');
  const groups = []; r.out.forEach(([p]) => { const g = groups.find(q => q[0] === p); g ? g[1]++ : groups.push([p, 1]); });
  return `<svg class="plates-svg" viewBox="0 0 320 120" role="img" aria-label="One side of the bar">
      <rect x="0" y="56" width="320" height="8" rx="3" fill="var(--mute)"/><rect x="40" y="52" width="280" height="16" rx="3" fill="var(--muscle)"/>
      <rect x="44" y="42" width="10" height="36" rx="2" fill="var(--ink)"/>${rects}</svg>
    <p><b>Each side:</b> ${groups.length ? groups.map(([p, n]) => `${n} × ${fmtN(p)}`).join(', ') : 'nothing, just the bar'}</p>
    ${r.left > 0.001 ? `<p class="note">Closest you can load is ${fmtN(total - r.left)} ${S.unit}. The extra ${fmtN(r.left)} ${S.unit} can't be made with standard plates.</p>` : ''}
    <p class="note">Using a ${fmtN(r.bar)} ${S.unit} bar. You can change it in Settings.</p>`;
}
function sheetHtml() {
  if (UI.wrap) return wrapHtml();
  if (UI.jump) return jumpSheet();
  if (UI.emPick) return emSheet();
  if (UI.wAdd) return widgetSheet();
  if (UI.notes) return notesSheet();
  if (UI.clog) return cardioSheet();
  if (!UI.plates) return '';
  const quick = S.unit === 'kg' ? [40, 60, 80, 100, 120, 140, 180] : [95, 135, 185, 225, 275, 315, 405];
  return `<div id="sheet" data-act="closeSheet"><div class="panel" data-act="noop" role="dialog" aria-modal="true" aria-label="Plate calculator">
    <div class="row"><h2>Plate calculator</h2><button class="link" data-act="closeSheet">Done</button></div>
    <input class="input mt" id="plateW" inputmode="decimal" placeholder="Total weight in ${S.unit}" value="${esc(UI.plates.w)}" aria-label="Total weight">
    <div class="chips mt">${quick.map(n => chip(String(n), num(UI.plates.w) === n, `data-act="plateQuick" data-w="${n}"`)).join('')}</div>
    <div id="plateOut">${plateResult()}</div></div></div>`;
}

/* =========================================================
   Body diagram (half figure mirrored down the centre line)
   ========================================================= */
const ARM_FORE = 'M20 98C17 108 14 120 14 132C17 134 20 133 22 130C24 120 27 108 29 98C26 100 23 100 20 98Z';
const DELT = 'M41 42.5C31 42 22 46 20 57C23 60 28 59 32 56C34 51 37 47 42 46Z';
const FIG = {
  base:'M60 28C57 28 55 29 55 31L55 37C50 40 42 41 33 42C25 44 19 49 18 58C17 70 17 84 19 95C16 105 13 118 12 132C11 140 10 147 11 154C12 160 17 162 19 157C20 150 21 142 22 136C25 123 28 110 30 98C32 88 33 78 34 70C35 82 37 100 36 117C35 125 33 131 33 140C31 160 33 182 37 204C35 215 35 232 37 245C37 251 35 256 39 258L51 258C53 255 51 250 51 245C54 231 55 216 55 206C57 186 59 162 59 146L60 146Z',
  front:{
    Traps:['M55 37C51 39.5 46 41 41 42.2L50 43.6C52.5 41.6 54 39.6 55 37Z'],
    Shoulders:[DELT],
    Chest:['M42.5 46C36 49 34 55 34 63C39 71 50 73 59.5 69L59.5 47C53 45 47.5 45 42.5 46Z'],
    Biceps:['M21 61C19 70 19 82 22 92C26 94 29 90 30 84C31 74 31 64 30 59C27 61 24 62 21 61Z'],
    Forearms:[ARM_FORE],
    Core:['M51 73.5Q51 73 51.5 73L58.5 73Q59.5 73 59.5 74L59.5 83Q59.5 84 58.5 84L51.5 84Q51 84 51 83Z',
          'M51 86Q51 85.5 51.5 85.5L58.5 85.5Q59.5 85.5 59.5 86.5L59.5 95.5Q59.5 96.5 58.5 96.5L51.5 96.5Q51 96.5 51 95.5Z',
          'M51 98.5Q51 98 51.5 98L58.5 98Q59.5 98 59.5 99L59.5 108Q59.5 109 58.5 109L51.5 109Q51 109 51 108Z',
          'M51 111L59.5 111L59.5 130C56 132 53 129 51 123Z'],
    Obliques:['M36 72C40 74 45 76 49 76L49 112C46 117 42 120 38 121C38.5 104 38 88 36 72Z'],
    Quads:['M34 140C32 158 33 180 38 200C41 202 43 198 44 192C43 172 42 154 45 140C41 138 37 138 34 140Z',
           'M46 138C44 156 44 178 46 196C49 200 53 199 54 193C55 174 55 155 53 137C51 136 48 136 46 138Z',
           'M55.5 170C54.5 180 54.5 191 56 199C58 200 59 196 59 190C59 182 58 175 55.5 170Z'],
    Calves:['M37.5 214C36 226 37 238 39.5 246C42 248 44 246 44 242C44 230 43 221 42 213Z',
            'M50 213C52.5 222 53.5 234 51.5 245C49.5 247 47.5 245 47.5 241C47 230 47.5 220 50 213Z']},
  back:{
    Traps:['M60 29C57 30 56 33 55 37C50 40 43 41 37 43C45 47 52 55 56 68C58 77 59 85 60 92Z'],
    Shoulders:[DELT],
    Back:['M38 48C44 49 50 53 53 62C49 66 43 66 39 62C37 58 36 53 38 48Z',
          'M35 64C36 76 39 90 43 100C46 107 49 112 52 116C53 108 53 100 52 94C50 84 48 76 46 68C43 66 38 65 35 64Z'],
    'Lower Back':['M53 98C55 106 56 116 55 128C57 130 59 130 59.5 128L59.5 96C57.5 95 55 95 53 98Z'],
    Triceps:['M19.5 60C17.5 70 17.5 83 20 93C23 96 27 94 29 89C30 80 31 70 31 60C27 62 23 62 19.5 60Z'],
    Forearms:[ARM_FORE],
    Glutes:['M35 129C33 137 33 146 36 153C42 159 51 160 59.5 156L59.5 132C52 128 43 127 35 129Z'],
    Hamstrings:['M35 161C33 175 35 190 39 202C42 204 45 200 46 194C46 182 46 170 47 160C43 159 39 159 35 161Z',
                'M49 160C49 174 50 188 52 199C55 201 57 197 58 191C58 180 58.5 168 58.5 158C55 160 52 161 49 160Z'],
    Calves:['M37.5 211C35.5 221 36.5 232 39.5 240C42.5 242 44.5 238 44.5 232C44.5 224 43.5 216 42.5 210Z',
            'M47 210C47 220 48 231 50.5 239C53.5 240 54.5 236 54.5 230C54.5 222 53.5 214 52 208Z']}};
function figure(selected) {
  const sel = new Set(selected || []);
  const mirror = inner => inner + `<g transform="matrix(-1 0 0 1 120 0)">${inner}</g>`;
  const side = (muscles, dx) => {
    let out = `<g transform="translate(${dx} 0)"><ellipse class="base" cx="60" cy="16" rx="10.5" ry="12.5"/>${mirror(`<path class="base" d="${FIG.base}"/>`)}`;
    for (const [m, paths] of Object.entries(muscles))
      out += `<g class="m${sel.has(m) ? ' on' : ''}"><title>${m}</title>${mirror(paths.map(d => `<path d="${d}"/>`).join(''))}</g>`;
    return out + '</g>';
  };
  const label = sel.size ? [...sel].join(', ') : 'none selected';
  return `<svg class="figure" viewBox="0 0 250 274" role="img" aria-label="Muscle map, front and back: ${esc(label)}">${side(FIG.front, 0)}${side(FIG.back, 130)}<text x="60" y="272" text-anchor="middle">Front</text><text x="190" y="272" text-anchor="middle">Back</text></svg>`;
}

/* =========================================================
   Charts
   ========================================================= */
let gradId = 0;
function lineChart(pts, unit) {
  if (pts.length < 2) return `<p class="note">${pts.length ? 'Log one more entry to see your trend line.' : 'Nothing logged yet.'}</p>`;
  const W = 320, H = 150, T = 14, B = 22, n = pts.length, vs = pts.map(p => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const pd = (hi - lo) * .15; lo -= pd; hi += pd;
  const X = i => 6 + i * (W - 12) / (n - 1), Y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B), base = H - B;
  const line = pts.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
  const id = 'lg' + (++gradId);
  const grid = [T, (T + base) / 2, base].map(y => `<line class="grid" x1="0" x2="${W}" y1="${y}" y2="${y}"/>`).join('');
  const dots = n <= 24 ? pts.slice(0, -1).map((p, i) => `<circle class="pt" cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.5"/>`).join('') : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trend from ${esc(pts[0].l)} to ${esc(pts[n - 1].l)}: ${fmtN(vs[0])} to ${fmtN(vs[n - 1])} ${esc(unit)}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>
    ${grid}<path d="${line} L${X(n - 1).toFixed(1)} ${base} L${X(0).toFixed(1)} ${base}Z" fill="url(#${id})"/><path class="ln" d="${line}"/>${dots}
    <circle class="last" cx="${X(n - 1).toFixed(1)}" cy="${Y(vs[n - 1]).toFixed(1)}" r="5.5"/>
    <text x="0" y="${H - 4}">${esc(pts[0].l)}</text><text x="${W}" y="${H - 4}" text-anchor="end">${esc(pts[n - 1].l)}</text></svg>`;
}
function trend(pts, unit) {
  if (!pts.length) return '';
  const a = pts[0].v, b = pts[pts.length - 1].v, d = Math.round((b - a) * 10) / 10;
  return `<div class="trend"><b>${fmtN(b)}<small> ${esc(unit)}</small></b>${pts.length > 1 ? `<span>${d > 0 ? '+' : ''}${fmtN(d)} ${esc(unit)} since ${esc(pts[0].l)}</span>` : ''}</div>`;
}
function barChart(name) {
  const t = series(name).slice(-8);
  if (!t.length) return '<p class="note">No sessions logged yet. Your top weight per session shows up here.</p>';
  const m = Math.max(...t.map(p => p.v), 1);
  return `<div class="bars" role="img" aria-label="Top weight in the last ${t.length} sessions, best ${fmtN(m)} ${S.unit}">${t.map(p =>
    `<div class="b"><div class="col"><span>${fmtN(p.v)}</span><i style="height:${Math.max(5, p.v / m * 100)}%"></i></div><em>${esc(p.l)}</em></div>`).join('')}</div>
    <p class="note">Top weight per session. Best ${fmtN(m)} ${S.unit}.</p>`;
}

/* =========================================================
   Badges
   ========================================================= */
function stats() {
  const o = {n:S.history.length, vol:0, sets:0, mins:0, maxMin:0, early:0, late:0, midn:0, lunch:0, wknd:0, leg:0, tagged:0, quads:false,
    maxRep:0, maxVol:0, oneSet:0, pr:0, plus:0, run:0, cmin:0, fl:0, t1230:0};
  const top = {}, days = new Set();
  [...S.history].sort((a, b) => a.end - b.end).forEach(w => {
    const st = w.start || w.end, d = new Date(st), hr = d.getHours(), dy = d.getDay(), mu = w.muscles || [];
    let v = 0, c = 0, p = 0, lift = 0;
    days.add(dk(d));
    w.exercises.forEach(e => {
      const ck = kindOf(e);
      if (ck) return;
      lift++;
      const k = norm(e.name); let mx = 0;
      e.sets.forEach(s => { const wt = num(s.w), r = num(s.r); v += wt * r; c++; if (r > o.maxRep) o.maxRep = r; if (wt > mx) mx = wt; });
      if (k in top && mx > top[k]) p++;
      top[k] = Math.max(top[k] || 0, mx);
    });
    o.vol += v; o.sets += c; o.maxVol = Math.max(o.maxVol, v); o.pr += p; if (p >= 3) o.plus++; if (c === 1 && lift) o.oneSet++;
    const m = (w.end - st) / 6e4; if (m > 0 && m < 600) { o.mins += m; o.maxMin = Math.max(o.maxMin, m); }
    if (hr >= 4 && hr < 7) o.early++; if (hr >= 22) o.late++; if (hr < 4) o.midn++; if (hr >= 11 && hr < 13) o.lunch++; if (dy === 0 || dy === 6) o.wknd++;
    if (mu.length) { o.tagged++; if (mu.includes('Quads')) o.quads = true; if (['Quads','Hamstrings','Glutes','Calves'].some(x => mu.includes(x))) o.leg++; }
  });
  cardioLogs().forEach(x => { o.cmin += num(x.min); o.fl += num(x.fl); if (x.k === 'tread' && num(x.inc) >= 12 && num(x.min) >= 30) o.t1230++; });
  const ds = [...days].sort(); let run = 0;
  ds.forEach((x, i) => { run = i && Math.round((keyDate(x) - keyDate(ds[i - 1])) / 864e5) === 1 ? run + 1 : 1; o.run = Math.max(o.run, run); });
  const liftMax = re => Math.max(0, ...Object.keys(top).filter(k => re.test(k)).map(k => top[k]));
  o.bench = liftMax(/bench press/); o.squat = liftMax(/squat/); o.dead = liftMax(/^(?!.*(romanian|stiff|rdl)).*deadlift/);
  const ids = S.sup.map(x => x.id);
  o.stack = ids.length ? Object.keys(S.sl).filter(k => ids.every(i => S.sl[k].includes(i))).length : 0;
  o.creat = Object.keys(S.sl).filter(k => S.sl[k].includes('creatine')).length;
  o.jr = S.j.length; o.bw = S.bw.length; o.photos = PH.length; o.tpl = S.tpl.length;
  Object.assign(o, statsMore());
  return o;
}
const byUnit = (lb, kg) => S.unit === 'kg' ? kg : lb;
const BADGES = [
  ['first','🏁','First Rep','Log your first workout','real',s => [s.n, 1]],
  ['cardio10','🏃','Cardio Era','Log 10 hours of cardio','real',s => [Math.floor(s.cmin), 600]],
  ['stairs','🪜','Stairway to Heaven','Climb 500 floors on the stairs','real',s => [s.fl, 500]],
  ['t1230','⛰️','12-3-30','Walk 30+ minutes at a 12% incline or higher','fun',s => [s.t1230, 1]],
  ['w10','💪','Regular','Log 10 workouts','real',s => [s.n, 10]],
  ['w25','🔥','Locked In','Log 25 workouts','real',s => [s.n, 25]],
  ['w50','🦍','Gym Rat','Log 50 workouts','real',s => [s.n, 50]],
  ['w100','👑','Centurion','Log 100 workouts','real',s => [s.n, 100]],
  ['v10k','🏋️','Ten Thousand','Lift 10,000 total','real',s => [s.vol, 1e4]],
  ['v100k','🚛','Heavy Hauler','Lift 100,000 total','real',s => [s.vol, 1e5]],
  ['v1m','🌋','Million Club','Lift 1,000,000 total','real',s => [s.vol, 1e6]],
  ['sets500','🧱','Set Collector','Complete 500 sets','real',s => [s.sets, 500]],
  ['pr1','📈','New Personal Best','Set your first PR','real',s => [s.pr, 1]],
  ['pr10','🏆','PR Machine','Set 10 PRs','real',s => [s.pr, 10]],
  ['bench','🥉','One Plate Bench','Bench press 135 lb or 60 kg','real',s => [s.bench, byUnit(135, 60)]],
  ['squat','🥈','Two Plate Squat','Squat 225 lb or 100 kg','real',s => [s.squat, byUnit(225, 100)]],
  ['dead','🥇','Three Plate Deadlift','Deadlift 315 lb or 140 kg','real',s => [s.dead, byUnit(315, 140)]],
  ['long','⏱️','Marathon Session','Train 90 minutes in one session','real',s => [s.maxMin, 90]],
  ['home','🏠','Second Home','Spend 10 hours training in total','real',s => [s.mins / 60, 10]],
  ['run3','📅','Three-Day Run','Train 3 days in a row','real',s => [s.run, 3]],
  ['legs10','🦵','Leg Day Survivor','Do 10 workouts that hit your legs','real',s => [s.leg, 10]],
  ['stack','💊','Full Stack','Take every supplement in one day','real',s => [s.stack, 1]],
  ['creat','🧪','Creatine Loaded','Log creatine on 30 days','real',s => [s.creat, 30]],
  ['jr7','📓','Dear Diary','Write 7 journal entries','real',s => [s.jr, 7]],
  ['bw7','⚖️','Scale Watcher','Log body weight 7 times','real',s => [s.bw, 7]],
  ['photo','📸','Progress Pic','Add a progress photo','real',s => [s.photos, 1]],
  ['tpl','🗂️','Game Plan','Save your first workout template','real',s => [s.tpl, 1]],
  ['early','🌅','Early Bird','Start a workout before 7am','fun',s => [s.early, 1]],
  ['late','🦉','Night Owl','Start a workout after 10pm','fun',s => [s.late, 1]],
  ['midn','🌙','Midnight Pump','Start a workout between midnight and 4am','fun',s => [s.midn, 1]],
  ['lunch','🥪','Lunch Break Lifter','Start a workout between 11am and 1pm','fun',s => [s.lunch, 1]],
  ['wknd','🛋️','Weekend Warrior','Do 4 workouts on weekends','fun',s => [s.wknd, 4]],
  ['9000','⚡',"It's Over 9000",'Lift more than 9,000 in one workout','fun',s => [s.maxVol, 9001]],
  ['plus','🚀','Plus Ultra','Set PRs on 3 lifts in one workout','fun',s => [s.plus, 1]],
  ['arc','🎌','Training Arc','Train 5 days in a row','fun',s => [s.run, 5]],
  ['rep20','🔁','Rep Machine','Do a set of 20 or more reps','fun',s => [s.maxRep, 20]],
  ['filler','📺','Filler Episode','Finish a workout with only one set','fun',s => [s.oneSet, 1]],
  ['skip','🍗','Skipped Leg Day','Log 10 tagged workouts without ever hitting quads','fun',s => [s.quads ? 0 : s.tagged, 10]]];
function checkBadges() {
  const s = stats(), fresh = [];
  for (const b of BADGES) { if (S.bd[b[0]]) continue; const [c, g] = b[5](s); if (c >= g) { S.bd[b[0]] = Date.now(); fresh.push(b); } }
  const sec = fresh.filter(b => b[4] === 'secret');
  if (fresh.length) setTimeout(() => { try { confetti(40); } catch (e) {} }, 850);
  if (fresh.length) setTimeout(() => toast(sec.length ? `🤫 Secret badge unlocked: ${sec.map(b => b[1] + ' ' + b[2]).join(', ')}` : fresh.length > 2 ? `${fresh.length} badges unlocked!` : `${fresh.map(b => b[1]).join(' ')} Badge unlocked: ${fresh.map(b => b[2]).join(', ')}`), 900);
}
