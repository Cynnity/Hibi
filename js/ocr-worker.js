// Hibi receipt reader: runs Tesseract (text recognition) off the main thread, fully on the phone.
// The engine files live in vendor/ocr/. Messages in: {cmd:'init', core, data} and {cmd:'rec', png, psm}.
let M = null, api = null, cur = 0;
const say = (t, o) => postMessage(Object.assign({t}, o));
async function readAll(resp, onBytes) {
  const total = +resp.headers.get('content-length') || 0, rd = resp.body.getReader(), parts = []; let got = 0;
  for (;;) { const {done, value} = await rd.read(); if (done) break; parts.push(value); got += value.length; onBytes(got, total); }
  const out = new Uint8Array(got); let p = 0; parts.forEach(b => { out.set(b, p); p += b.length; }); return out;
}
async function init(m) {
  say('stage', {s:'engine'});
  importScripts(m.core);
  M = await TesseractCore({TesseractProgress: p => say('prog', {p:cur ? Math.max(0, (p - 30) / 70) : 0})});
  say('stage', {s:'model'});
  const r = await fetch(m.data); if (!r.ok) throw new Error('Could not load the text model (' + r.status + ')');
  let bytes = await readAll(r, (g, t) => say('dl', {g, t}));
  if (bytes[0] === 31 && bytes[1] === 139) bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  M.FS.writeFile('./eng.traineddata', bytes);
  api = new M.TessBaseAPI();
  if (api.Init(null, 'eng', 1, undefined) === -1) throw new Error('The text model would not start');
  api.SetVariable('preserve_interword_spaces', '1');
  api.SetVariable('user_defined_dpi', '300');
  say('ready');
}
function rec(m) {
  cur = 1;
  api.SetVariable('tessedit_pageseg_mode', String(m.psm || 6));
  if (m.wl) api.SetVariable('tessedit_char_whitelist', m.wl); else api.SetVariable('tessedit_char_whitelist', '');
  M.FS.writeFile('/input', new Uint8Array(m.png));
  if (api.SetImageFile(1, 0) === 1) throw new Error('Could not read the image');
  api.Recognize(null);
  const tsv = api.GetTSVText(), text = api.GetUTF8Text(), conf = api.MeanTextConf();
  cur = 0; say('done', {id:m.id, tsv, text, conf});
}
onmessage = async e => {
  try { if (e.data.cmd === 'init') await init(e.data); else if (e.data.cmd === 'rec') rec(e.data); }
  catch (err) { say('err', {id:e.data.id, msg:String((err && err.message) || err)}); }
};
