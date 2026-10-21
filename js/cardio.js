// Hibi: Cardio machines (treadmill, stairs): fields, logs and charts.
'use strict';
/* ----- Cardio (treadmill, stairs and other machines) ----- */
const CARDIO = {
  tread:{label:'Treadmill', f:['min', 'spd', 'inc', 'dist']},
  stairs:{label:'Stairs', f:['min', 'lvl', 'fl']},
  cardio:{label:'Other cardio', f:['min', 'dist']}};
const distU = () => S.unit === 'kg' ? 'km' : 'mi', spdU = () => S.unit === 'kg' ? 'km/h' : 'mph';
const CF = {min:() => 'Min', spd:() => spdU(), inc:() => 'Incline', dist:() => distU(), lvl:() => 'Level', fl:() => 'Floors'};
const CF_IN = {min:'decimal', spd:'decimal', inc:'decimal', dist:'decimal', lvl:'numeric', fl:'numeric'};
const CF_ALL = ['min', 'spd', 'inc', 'dist', 'lvl', 'fl'];
const kindOf = e => e && CARDIO[e.k] ? e.k : (x => x && CARDIO[x.kind] ? x.kind : null)(exInfo(e ? e.name : ''));
const kindByName = name => /treadmill|incline walk/i.test(name) ? 'tread' : /stair|step ?mill|stepper/i.test(name) ? 'stairs' : null;
const distOf = s => num(s.dist) || (num(s.spd) && num(s.min) ? Math.round(num(s.spd) * num(s.min) / 60 * 100) / 100 : 0);
function cardioText(s, k) {
  const out = [];
  if (num(s.min)) out.push(fmtN(num(s.min)) + ' min');
  if (num(s.spd)) out.push(fmtN(num(s.spd)) + ' ' + spdU());
  if (s.inc !== undefined && s.inc !== '' && k === 'tread') out.push(fmtN(num(s.inc)) + '% incline');
  if (num(s.lvl)) out.push('level ' + fmtN(num(s.lvl)));
  if (num(s.fl)) out.push(fmtN(num(s.fl)) + ' floors');
  const d = distOf(s); if (d && k !== 'stairs') out.push(fmtN(d) + ' ' + distU());
  return out.join(' · ') || 'No details';
}
const cardioSet = (k, p) => { const o = {done:false}; CARDIO[k].f.forEach(f => o[f] = p && p[f] !== undefined ? p[f] : ''); return o; };
function seedCardio(s) {
  let cat = s.cats.find(c => norm(c.name) === 'cardio');
  if (!cat) { cat = {id:'cardio', name:'Cardio'}; s.cats.push(cat); }
  s.ex.forEach(e => { if (!e.kind) { const k = kindByName(e.name); if (k) { e.kind = k; if (!e.cats.includes(cat.id)) e.cats.push(cat.id); } } });
  const add = (name, kind, muscles, how) => { if (!s.ex.some(e => norm(e.name) === norm(name))) s.ex.push({id:'cx-' + kind, name, kind, cats:[cat.id], muscles, how}); };
  add('Treadmill', 'tread', ['Quads', 'Hamstrings', 'Glutes', 'Calves'], 'Start with a few minutes of easy walking. Stand tall, let your arms swing and try not to hold the rails, especially on an incline. Raise the incline for a tougher walk without running.');
  add('StairMaster', 'stairs', ['Glutes', 'Quads', 'Hamstrings', 'Calves'], 'Step with your whole foot and push through your heel. Stand upright and rest your hands lightly on the rails instead of leaning on them. Pick a level you can keep steady.');
  s.cardioV = 1;
}
// Every cardio round, from the Cardio section and from older workouts that had cardio in them
function cardioLogs() {
  const out = S.cardio.map(c => Object.assign({src:'c'}, c));
  S.history.forEach(w => w.exercises.forEach(e => { const k = kindOf(e); if (k) e.sets.forEach(x => out.push(Object.assign({}, x, {src:'w', end:w.end, name:e.name, k}))); }));
  return out.sort((a, b) => a.end - b.end);
}
function cardioWeek() {
  const ws = weekStart(Date.now()), o = {min:0, dist:0, fl:0, n:0};
  cardioLogs().filter(x => x.end >= ws).forEach(x => { o.n++; o.min += num(x.min); if (x.k !== 'stairs') o.dist += distOf(x); o.fl += num(x.fl); });
  return o;
}
const cardioMachines = () => S.ex.filter(e => live(e) && CARDIO[e.kind]);
const CARDIO_EM = {tread:'🏃', stairs:'🪜', cardio:'🚴'};
const CMET = {min:['Minutes', 'min', x => num(x.min)], dist:['Distance', '', x => distOf(x)], inc:['Incline', '%', x => num(x.inc)], spd:['Speed', '', x => num(x.spd)], fl:['Floors', 'floors', x => num(x.fl)], lvl:['Level', '', x => num(x.lvl)]};
function cardioSeries(name, m) {
  const n = norm(name), get = CMET[m][2], days = {};
  cardioLogs().filter(x => norm(x.name) === n).forEach(x => { const v = get(x); if (!(v > 0)) return; const d = dk(new Date(x.end));
    const o = days[d] = days[d] || {end:x.end, vals:[]}; o.vals.push(v); });
  return Object.values(days).sort((a, b) => a.end - b.end).map(o => ({l:fmtMD(new Date(o.end)),
    v:m === 'inc' || m === 'spd' || m === 'lvl' ? Math.max(...o.vals) : Math.round(o.vals.reduce((a, b) => a + b, 0) * 100) / 100}));
}
const cmetUnit = m => m === 'dist' ? distU() : m === 'spd' ? spdU() : CMET[m][1];
