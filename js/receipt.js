/* =========================================================
   Receipts: take a photo, Hibi reads it on your phone, and fills in the purchase.
   The text reader (Tesseract) runs in js/ocr-worker.js and its files live in vendor/ocr/.
   Nothing is uploaded anywhere.
   ========================================================= */
const RC_BASE = 'vendor/ocr/';
let RCW = null, RCREADY = null, RCIDLE = 0, RCJOB = null;
const rcSimd = () => { try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (e) { return false; } };

// Starts the reader (once) and calls on(stage, info) while it loads. The first time it downloads the text model, then it is kept on the phone.
function rcEngine(on) {
  on = on || (() => {});
  clearTimeout(RCIDLE);
  if (RCREADY) return RCREADY;
  RCREADY = new Promise((ok, no) => {
    let w; try { w = new Worker('js/ocr-worker.js'); } catch (e) { RCREADY = null; return no(new Error('This browser cannot run the receipt reader.')); }
    RCW = w;
    w.onmessage = e => {
      const m = e.data;
      if (m.t === 'stage') on(m.s); else if (m.t === 'dl') on('dl', m); else if (m.t === 'ready') ok(w);
      else if (m.t === 'prog' && RCJOB) RCJOB.prog(m.p);
      else if (m.t === 'done' && RCJOB && RCJOB.id === m.id) { const j = RCJOB; RCJOB = null; j.ok(m); }
      else if (m.t === 'err') { if (RCJOB && RCJOB.id === m.id) { const j = RCJOB; RCJOB = null; j.no(new Error(m.msg)); } else { rcStop(); no(new Error(m.msg)); } }
    };
    w.onerror = e => { rcStop(); no(new Error('The receipt reader stopped. ' + (e.message || ''))); };
    const abs = f => new URL(RC_BASE + f, document.baseURI).href;
    w.postMessage({cmd:'init', core:abs(rcSimd() ? 'tesseract-core-simd-lstm.wasm.js' : 'tesseract-core-lstm.wasm.js'), data:abs(window.RC_MODEL || 'eng.traineddata.gz')});
  });
  return RCREADY;
}
function rcStop() { clearTimeout(RCIDLE); if (RCW) { try { RCW.terminate(); } catch (e) {} } RCW = null; RCREADY = null; RCJOB = null; }
// Frees the memory a little after the last scan (phones are tight on memory)
const rcLater = () => { clearTimeout(RCIDLE); RCIDLE = setTimeout(rcStop, 90000); };
async function rcRecognize(png, psm, prog) {
  await rcEngine();
  return new Promise((ok, no) => { const id = 'j' + Date.now(); RCJOB = {id, ok, no, prog:prog || (() => {})}; RCW.postMessage({cmd:'rec', id, png, psm}); }).finally(rcLater);
}

/* ----- Getting the photo ready: orient, crop to the paper, flatten the lighting, straighten ----- */
async function rcLoad(file) {
  let bmp = null;
  try { if (window.createImageBitmap) bmp = await createImageBitmap(file, {imageOrientation:'from-image'}); } catch (e) { bmp = null; }
  if (!bmp) { const url = URL.createObjectURL(file), im = new Image(); im.src = url; await im.decode(); bmp = im; bmp._url = url; }
  const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight;
  return {bmp, w, h};
}
const rcCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
function rcGray(cv) {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, n = cv.width * cv.height, g = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) g[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8;
  return g;
}
function rcBox(src, w, h, r) {   // separable box blur on a small float image
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) { let s = 0, c = 0; const o = y * w; for (let x = -r; x <= r; x++) if (x >= 0 && x < w) { s += src[o + x]; c++; }
    for (let x = 0; x < w; x++) { tmp[o + x] = s / c; const a = x - r, b = x + r + 1; if (a >= 0) { s -= src[o + a]; c--; } if (b < w) { s += src[o + b]; c++; } } }
  for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let y = -r; y <= r; y++) if (y >= 0 && y < h) { s += tmp[y * w + x]; c++; }
    for (let y = 0; y < h; y++) { out[y * w + x] = s / c; const a = y - r, b = y + r + 1; if (a >= 0) { s -= tmp[a * w + x]; c--; } if (b < h) { s += tmp[b * w + x]; c++; } } }
  return out;
}
function rcOtsu(g, step) {
  const hist = new Float64Array(256); let n = 0; for (let i = 0; i < g.length; i += step) { hist[g[i]]++; n++; }
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sb = 0, wb = 0, best = 0, th = 128;
  for (let t = 0; t < 256; t++) { wb += hist[t]; if (!wb) continue; const wf = n - wb; if (!wf) break; sb += t * hist[t]; const mb = sb / wb, mf = (sum - sb) / wf, v = wb * wf * (mb - mf) * (mb - mf); if (v > best) { best = v; th = t; } }
  return th;
}
// Finds the bright paper in the photo and returns its box (or the whole image)
function rcPaperBox(cv) {
  const k = 320 / Math.max(cv.width, cv.height), sw = Math.max(8, Math.round(cv.width * k)), sh = Math.max(8, Math.round(cv.height * k)), sm = rcCanvas(sw, sh);
  sm.getContext('2d').drawImage(cv, 0, 0, sw, sh); const g = rcGray(sm), th = rcOtsu(g, 1);
  let br = 0; for (let i = 0; i < g.length; i++) if (g[i] > th) br++;
  const frac = br / g.length; if (frac > 0.8 || frac < 0.08) return null;   // nothing to separate, or it did not find paper
  const col = new Float32Array(sw), row = new Float32Array(sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (g[y * sw + x] > th) { col[x]++; row[y]++; }
  const lim = (a, n, f) => { const m = Math.max(...a) * f; let lo = 0, hi = n - 1; while (lo < n && a[lo] < m) lo++; while (hi > 0 && a[hi] < m) hi--; return [lo, hi]; };
  const [x0, x1] = lim(col, sw, 0.35), [y0, y1] = lim(row, sh, 0.12);
  if (x1 - x0 < sw * 0.15 || y1 - y0 < sh * 0.15) return null;
  const px = Math.round(sw * 0.03), py = Math.round(sh * 0.02);
  return {x:Math.max(0, x0 - px) / sw, y:Math.max(0, y0 - py) / sh, w:Math.min(sw, x1 + px + 1) / sw - Math.max(0, x0 - px) / sw, h:Math.min(sh, y1 + py + 1) / sh - Math.max(0, y0 - py) / sh};
}
// How crooked the lines of text are, in degrees (looks for the angle where the dark rows line up best)
function rcSkew(cv) {
  const k = 700 / Math.max(cv.width, cv.height), sw = Math.round(cv.width * Math.min(1, k)), sh = Math.round(cv.height * Math.min(1, k)), sm = rcCanvas(sw, sh);
  sm.getContext('2d').drawImage(cv, 0, 0, sw, sh); const g = rcGray(sm), f = new Float32Array(g.length); for (let i = 0; i < g.length; i++) f[i] = g[i];
  const mean = rcBox(f, sw, sh, 9), pts = [], mx = Math.round(sw * 0.05), my = Math.round(sh * 0.05);
  for (let y = my; y < sh - my; y++) for (let x = mx; x < sw - mx; x++) { const i = y * sw + x; if (f[i] < mean[i] * 0.75 && mean[i] > 90) pts.push(x - sw / 2, y - sh / 2); }
  if (pts.length < 400) return 0;
  const score = a => { const c = Math.cos(a), s = Math.sin(a), bins = new Float32Array(sh * 2 + 4); for (let i = 0; i < pts.length; i += 2) { const yy = Math.round(-pts[i] * s + pts[i + 1] * c + sh); if (yy >= 0 && yy < bins.length) bins[yy]++; } let t = 0; for (let i = 1; i < bins.length; i++) { const d = bins[i] - bins[i - 1]; t += d * d; } return t; };
  let best = 0, bs = -1; for (let d = -10; d <= 10; d += 1) { const s = score(d * Math.PI / 180); if (s > bs) { bs = s; best = d; } }
  let b2 = best, s2 = bs; for (let d = best - 1; d <= best + 1; d += 0.2) { const s = score(d * Math.PI / 180); if (s > s2) { s2 = s; b2 = d; } }
  return b2;
}
// Full cleanup. Returns a canvas (grayscale look) and the steps taken.
async function rcPrep(file, o) {
  o = o || {};
  const {bmp, w, h} = await rcLoad(file);
  let k = 1; const long = Math.max(w, h); if (long > 3400) k = 3400 / long; else if (long < 1600) k = Math.min(2.5, 1600 / long);
  let cv = rcCanvas(w * k, h * k); const cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(bmp, 0, 0, cv.width, cv.height);
  if (bmp.close) bmp.close(); if (bmp._url) URL.revokeObjectURL(bmp._url);
  const steps = [];
  if (o.crop !== false) { const bx = rcPaperBox(cv); if (bx) { const c2 = rcCanvas(bx.w * cv.width, bx.h * cv.height); c2.getContext('2d').drawImage(cv, bx.x * cv.width, bx.y * cv.height, c2.width, c2.height, 0, 0, c2.width, c2.height); cv = c2; steps.push('crop'); } }
  // if the paper is small in the frame, bring the text up to a size the reader likes
  if (cv.width < 1100) { const c2 = rcCanvas(cv.width * (1100 / cv.width), cv.height * (1100 / cv.width)); const x2 = c2.getContext('2d'); x2.imageSmoothingQuality = 'high'; x2.drawImage(cv, 0, 0, c2.width, c2.height); cv = c2; }
  const ang = o.skew === false ? 0 : rcSkew(cv);
  if (Math.abs(ang) >= 0.5) { const r = -ang * Math.PI / 180, c2 = rcCanvas(cv.width, cv.height), x2 = c2.getContext('2d'); x2.fillStyle = '#fff'; x2.fillRect(0, 0, c2.width, c2.height); x2.translate(c2.width / 2, c2.height / 2); x2.rotate(r); x2.drawImage(cv, -cv.width / 2, -cv.height / 2); cv = c2; steps.push('rotate ' + ang.toFixed(2)); }
  // even out the lighting, then stretch the contrast
  const W = cv.width, H = cv.height, g = rcGray(cv), sk = 1 / Math.max(2, Math.round(Math.max(W, H) / 220)), bw = Math.max(4, Math.round(W * sk)), bh = Math.max(4, Math.round(H * sk));
  const sm = rcCanvas(bw, bh); sm.getContext('2d').drawImage(cv, 0, 0, bw, bh); const sg = rcGray(sm), sf = new Float32Array(sg.length); for (let i = 0; i < sg.length; i++) sf[i] = sg[i];
  // the background is the lighter surroundings of the text, so use a max-ish blur: blur, then take the brighter of blur and the pixel
  const bgs = rcBox(sf, bw, bh, Math.max(2, Math.round(bw / 14)));
  for (let i = 0; i < bgs.length; i++) bgs[i] = Math.max(bgs[i], sf[i]);
  const bgc = rcCanvas(bw, bh), bgx = bgc.getContext('2d'), bi = bgx.createImageData(bw, bh); for (let i = 0; i < bgs.length; i++) { const v = Math.min(255, bgs[i]); bi.data[i * 4] = bi.data[i * 4 + 1] = bi.data[i * 4 + 2] = v; bi.data[i * 4 + 3] = 255; } bgx.putImageData(bi, 0, 0);
  const big = rcCanvas(W, H), bx2 = big.getContext('2d'); bx2.imageSmoothingEnabled = true; bx2.imageSmoothingQuality = 'high'; bx2.drawImage(bgc, 0, 0, W, H);
  const bg = rcGray(big), out = new Uint8Array(W * H), hist = new Uint32Array(256);
  for (let i = 0; i < out.length; i++) { const v = Math.min(255, Math.round(g[i] * 235 / Math.max(40, bg[i]))); out[i] = v; hist[v]++; }
  let lo = 0, hi = 255, acc = 0, n = out.length; while (lo < 255 && (acc += hist[lo]) < n * 0.01) lo++; acc = 0; while (hi > 0 && (acc += hist[hi]) < n * 0.4) hi--;   // dark end: 1%, light end: where the paper starts
  hi = Math.max(hi, lo + 60); const span = hi - lo;
  const res = rcCanvas(W, H), rx = res.getContext('2d'), id = rx.createImageData(W, H);
  for (let i = 0, j = 0; i < out.length; i++, j += 4) { const v = Math.max(0, Math.min(255, Math.round((out[i] - lo) * 255 / span))); id.data[j] = id.data[j + 1] = id.data[j + 2] = v; id.data[j + 3] = 255; }
  rx.putImageData(id, 0, 0); steps.push('flatten');
  if (rcWhiteOut(res)) steps.push('edges');
  return {cv:res, steps, from:[w, h]};
}
// Anything dark that touches the edge of the picture is the table or the shadows around the paper. Paint it white so it does not confuse the reader.
function rcWhiteOut(cv) {
  const k = 500 / Math.max(cv.width, cv.height), sw = Math.max(8, Math.round(cv.width * k)), sh = Math.max(8, Math.round(cv.height * k)), sm = rcCanvas(sw, sh);
  const sx = sm.getContext('2d'); sx.imageSmoothingQuality = 'high'; sx.drawImage(cv, 0, 0, sw, sh); const g = rcGray(sm), dark = new Uint8Array(sw * sh);
  for (let i = 0; i < g.length; i++) dark[i] = g[i] < 120 ? 1 : 0;
  const seen = new Uint8Array(sw * sh), st = []; const push = i => { if (dark[i] && !seen[i]) { seen[i] = 1; st.push(i); } };
  for (let x = 0; x < sw; x++) { push(x); push((sh - 1) * sw + x); } for (let y = 0; y < sh; y++) { push(y * sw); push(y * sw + sw - 1); }
  let n = 0; while (st.length) { const i = st.pop(); n++; const x = i % sw, y = (i / sw) | 0; if (x > 0) push(i - 1); if (x < sw - 1) push(i + 1); if (y > 0) push(i - sw); if (y < sh - 1) push(i + sw); }
  if (n < sw * sh * 0.004 || n > sw * sh * 0.6) return false;
  const grow = new Uint8Array(sw * sh); for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { if (!seen[y * sw + x]) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && xx < sw && yy >= 0 && yy < sh) grow[yy * sw + xx] = 1; } }
  const mc = rcCanvas(sw, sh), mx = mc.getContext('2d'), mi = mx.createImageData(sw, sh); for (let i = 0; i < grow.length; i++) { mi.data[i * 4] = mi.data[i * 4 + 1] = mi.data[i * 4 + 2] = 255; mi.data[i * 4 + 3] = grow[i] ? 255 : 0; } mx.putImageData(mi, 0, 0);
  const cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(mc, 0, 0, cv.width, cv.height); return true;
}
const rcPng = cv => new Promise(ok => cv.toBlob(b => b.arrayBuffer().then(ok), 'image/png'));

/* ----- Reading the text: lines, amounts, date, merchant, card ----- */
const RC_MERCH = ['Walmart', 'Target', 'Publix', 'Winn-Dixie', 'Aldi', 'Costco', "Sam's Club", 'Kroger', 'Whole Foods', 'Trader Joe\'s', 'Walgreens', 'CVS', 'Rite Aid', 'Shell', 'Chevron', 'Wawa', '7-Eleven', 'Murphy USA', 'RaceTrac', 'Circle K', 'Sunoco', 'BP', 'Exxon', 'Mobil', 'Speedway', 'Marathon', 'Texaco', 'Valero', 'Pilot', "Love's", 'Chipotle', "McDonald's", 'Burger King', "Wendy's", 'Taco Bell', 'Subway', 'Starbucks', "Dunkin'", "Domino's", 'Pizza Hut', "Papa John's", 'Panera Bread', 'Chick-fil-A', 'KFC', "Popeyes", 'Sonic', "Arby's", 'Five Guys', 'Whataburger', 'IHOP', "Denny's", 'Waffle House', 'Cracker Barrel', 'Olive Garden', "Applebee's", "Chili's", 'Outback Steakhouse', 'Texas Roadhouse', 'Jimmy John\'s', 'Jersey Mike\'s', 'Little Caesars', 'Dairy Queen', 'Krispy Kreme', 'Home Depot', "Lowe's", 'Dollar General', 'Family Dollar', 'Dollar Tree', 'Amazon', 'Best Buy', 'AutoZone', "O'Reilly Auto Parts", 'Advance Auto Parts', 'NAPA Auto Parts', 'Ross', 'TJ Maxx', 'Marshalls', "Kohl's", 'Old Navy', 'Hot Topic', 'Uniqlo', 'GameStop', 'Petco', 'PetSmart', 'Tractor Supply', 'Harbor Freight', 'Michaels', 'Hobby Lobby', 'Staples', 'Office Depot', 'Ulta', 'Sephora', 'Bath & Body Works', 'Apple', 'Total Nutrition', 'GNC', 'Bealls', 'Burlington', 'AMC Theatres', 'Regal', 'Cinemark', 'Auntie Anne\'s', 'Villa Pizza', 'Canteen', 'SunPass'];
const rcNorm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
function rcLev(a, b, max) {   // edit distance, stops early past max
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let p = Array.from({length:b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const c = [i]; let lo = i; for (let j = 1; j <= b.length; j++) { const v = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); c.push(v); if (v < lo) lo = v; } if (lo > max) return max + 1; p = c; }
  return p[b.length];
}
// Turns the reader's word list into lines (words on the same height, left to right)
function rcLines(tsv) {
  const W = [];
  String(tsv || '').split('\n').forEach(row => { const c = row.split('\t'); if (c.length < 12 || c[0] !== '5') return; const t = c.slice(11).join('\t').trim(), cf = +c[10]; if (!t || cf < 0) return; W.push({t, x:+c[6], y:+c[7], w:+c[8], h:+c[9], c:cf}); });
  if (!W.length) return [];
  const hs = W.map(w => w.h).sort((a, b) => a - b), mh = hs[Math.floor(hs.length / 2)] || 20, L = [];
  W.sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2)).forEach(w => {
    const cy = w.y + w.h / 2; let best = null;
    for (let i = L.length - 1; i >= 0 && i >= L.length - 4; i--) { const l = L[i]; if (Math.abs(cy - l.cy) < Math.max(mh * 0.5, Math.min(w.h, l.h) * 0.55) && !l.w.some(o => w.x < o.x + o.w - 2 && w.x + w.w > o.x + 2)) { best = l; break; } }
    if (best) { best.w.push(w); best.cy = best.w.reduce((t, o) => t + o.y + o.h / 2, 0) / best.w.length; best.h = Math.max(best.h, w.h); }
    else L.push({w:[w], cy, h:w.h});
  });
  return L.map((l, i) => { l.w.sort((a, b) => a.x - b.x); let s = ''; l.w.forEach((w, k) => { if (k) { const gap = w.x - (l.w[k - 1].x + l.w[k - 1].w); s += gap > mh * 1.6 ? '   ' : ' '; } s += w.t; }); return {i, s, words:l.w, h:l.h, y:l.cy, conf:l.w.reduce((t, w) => t + w.c, 0) / l.w.length}; });
}
// One money amount, forgiving about the mistakes a reader makes (O for 0, a space before the cents, a comma for the dot)
function rcMoneyTok(t) {
  let s = String(t).trim(); if (!/\d/.test(s)) return null;
  s = s.replace(/^[\$S€£]+(?=[\dOoIl|])/, '').replace(/[A-Za-z]{1,2}$/, m => /^[TXFNAB]$/i.test(m) ? '' : m);
  const neg = /^\(.*\)$|-$|^-/.test(s); s = s.replace(/[()\-]/g, '');
  s = s.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1').replace(/S/g, '5').replace(/B/g, '8');
  if (/^\d{1,3}(,\d{3})*\.\d{2}$/.test(s)) return (neg ? -1 : 1) * parseFloat(s.replace(/,/g, ''));
  if (/^\d+\.\d{2}$/.test(s)) return (neg ? -1 : 1) * parseFloat(s);
  if (/^\d{1,3},\d{2}$/.test(s)) return (neg ? -1 : 1) * parseFloat(s.replace(',', '.'));
  return null;
}
// All the amounts on a line, as {v, x} left to right
function rcAmts(line) {
  const out = [], w = line.words.slice();
  for (let i = 0; i < w.length; i++) {
    let t = w[i].t, x = w[i].x;
    if (/^[\$S]?\d{1,3}$/.test(t) && w[i + 1] && /^[.,]\d{2}[A-Za-z]?$/.test(w[i + 1].t)) { t += w[i + 1].t; i++; }   // "12" ".34"
    else if (/^[\$]$/.test(t) && w[i + 1]) { t = w[i + 1].t; i++; }
    const v = rcMoneyTok(t); if (v !== null && !/^\d{9,}$/.test(t)) out.push({v, x});
  }
  return out;
}
const RC_MON = {JAN:1, FEB:2, MAR:3, APR:4, MAY:5, JUN:6, JUL:7, AUG:8, SEP:9, OCT:10, NOV:11, DEC:12};
function rcDates(lines, now) {
  const out = [], fix = s => s.replace(/[OoQD]/g, '0').replace(/[Il|]/g, '1'), td = new Date(now + 'T12:00:00');
  const ok = (y, m, d) => { if (y < 100) y += 2000; if (y < 2000 || m < 1 || m > 12 || d < 1 || d > 31) return null; const dt = new Date(y, m - 1, d, 12); if (dt.getMonth() !== m - 1) return null; if (dt - td > 2 * 864e5) return null; if (td - dt > 800 * 864e5) return null; return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; };
  lines.forEach(l => {
    const up = l.s.toUpperCase(); if (/\b(EXP|EXPIR|VALID|RETURN BY|VOID|SAVE BY|GOOD (THRU|THROUGH)|THRU|UNTIL|BEFORE)\b/.test(up)) return;
    const hasTime = /\b\d{1,2}\s?:\s?\d{2}/.test(l.s) || /\b[AP]M\b/.test(up), lab = /\bDATE\b/.test(up) ? 2 : 0;
    let m; const A = /([0-9OoIl|]{1,2})\s?[\/\-.]\s?([0-9OoIl|]{1,2})\s?[\/\-.]\s?([0-9OoIl|]{4}|[0-9OoIl|]{2})(?![0-9])/g;
    while ((m = A.exec(l.s))) { let a = +fix(m[1]), b = +fix(m[2]), y = +fix(m[3]); let mo = a, d = b; if (a > 12 && b <= 12) { mo = b; d = a; } const v = ok(y, mo, d); if (v) out.push({d:v, s:3 + lab + (hasTime ? 2 : 0), i:l.i}); }
    const B = /\b(20\d{2})\s?[\/\-.]\s?([0-9OoIl]{1,2})\s?[\/\-.]\s?([0-9OoIl]{1,2})\b/g;
    while ((m = B.exec(l.s))) { const v = ok(+m[1], +fix(m[2]), +fix(m[3])); if (v) out.push({d:v, s:4 + lab + (hasTime ? 2 : 0), i:l.i}); }
    const C = /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?\s*(\d{1,2})(?:ST|ND|RD|TH)?\s*[,.]?\s*(\d{4}|\d{2})?\b/g;
    while ((m = C.exec(up))) { const yy = m[3] ? +m[3] : td.getFullYear(); let v = ok(yy, RC_MON[m[1]], +m[2]); if (!v && !m[3]) v = ok(yy - 1, RC_MON[m[1]], +m[2]); if (v) out.push({d:v, s:3 + lab + (hasTime ? 2 : 0) - (m[3] ? 0 : 1), i:l.i}); }
    const D = /\b(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?\s*,?\s*(\d{4}|\d{2})\b/g;
    while ((m = D.exec(up))) { const v = ok(+m[3], RC_MON[m[2]], +m[1]); if (v) out.push({d:v, s:3 + lab + (hasTime ? 2 : 0), i:l.i}); }
  });
  return out;
}
const RC_SKIPL = /^(WELCOME|THANK|THANKS|RECEIPT|CUSTOMER|COPY|STORE\b|ORDER|SALE\b|INVOICE|TEL\b|PHONE|MANAGER|SERVER|CASHIER|DATE|WWW|HTTP|SURVEY|FEEDBACK|VISIT|SAVE|DRIVE|OPEN|HOURS|GUEST|TABLE|CHECK|TRANSACTION|REG\b|TERMINAL|APPROVED|DUPLICATE|MERCHANT|AUTH)/;
const RC_ADDR = /\b(ST|STREET|AVE|AVENUE|RD|ROAD|BLVD|HWY|HIGHWAY|DR|DRIVE|LN|LANE|WAY|PKWY|CT|SUITE|STE|FL|FLORIDA|USA|PO BOX|NW|NE|SW|SE|N|S|E|W)\b/;
function rcTitle(s) {
  return s.replace(/[|_~`]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').map(w => { if (/[a-z]/.test(w)) return w; if (w.length <= 3 && !/^(THE|AND|OF)$/.test(w)) return w; const l = w.toLowerCase().replace(/(^|[-'&.])([a-z])/g, (m, a, b) => a + b.toUpperCase()); return l.replace(/^Mc([a-z])/, (m, c) => 'Mc' + c.toUpperCase()); }).join(' ').replace(/\b(Of|And|The)\b(?!^)/g, m => m.toLowerCase()).replace(/^(.)/, c => c.toUpperCase());
}

function rcMerchant(lines) {
  const head = lines.slice(0, 9);
  for (const l of head) {   // a shop we know, even with a letter or two misread
    const n = rcNorm(l.s); if (n.length < 2) continue;
    for (const k of RC_MERCH) { const kn = rcNorm(k); if (kn.length < 2) continue; if (kn.length <= 3 ? l.words.some(w => rcNorm(w.t) === kn) : (n.includes(kn) || l.words.some(w => rcNorm(w.t).length >= 4 && rcLev(rcNorm(w.t), kn, kn.length > 6 ? 2 : 1) <= (kn.length > 6 ? 2 : 1)) || rcLev(n.slice(0, kn.length + 1), kn, 1) <= 1 && kn.length >= 5)) return {name:k, known:true}; }
  }
  for (const l of head) {
    const s = l.s.trim(), up = s.toUpperCase(), letters = (s.match(/[A-Za-z]/g) || []).length;
    if (letters < 3 || letters < s.replace(/\s/g, '').length * 0.6) continue;
    if (RC_SKIPL.test(up) || RC_ADDR.test(up) && /\d/.test(up) || /\d{3}[-.\s)]+\d{4}/.test(s) || /\b\d{5}\b/.test(s)) continue;
    return {name:rcTitle(s.replace(/[^A-Za-z0-9&'.\- ]+/g, ' ').trim()), known:false};
  }
  return {name:'', known:false};
}
function rcCard(lines) {
  const NET = /(VISA|MASTER|MC\b|DISCOVER|AMEX|AMERICAN|DEBIT|CREDIT|CARD|ACCT|ENDING|APPLE PAY)/;
  for (let i = lines.length - 1; i >= 0; i--) {
    const s = lines[i].s, up = s.toUpperCase(); if (!NET.test(up) && !/[*¥]{2,}/.test(s)) continue;
    const toks = s.replace(/\s+[\$S]?[\d,]+\.\d{2}\s*$/, '').trim().split(/[\s*¥xX•\]\[:#-]+/).filter(Boolean);
    const t = toks[toks.length - 1] || '', m = /^([0-9OoIl])[.,]?([0-9OoIl]{3})$/.exec(t);
    if (m) { const d = (m[1] + m[2]).replace(/[Oo]/g, '0').replace(/[Il]/g, '1'); if (/^\d{4}$/.test(d) && !/\.\d{2}$/.test(t)) return {l4:d, net:(/(VISA|MASTERCARD|MC\b|DISCOVER|AMEX|AMERICAN EXPRESS)/.exec(up) || [''])[0]}; }
  }
  return {l4:'', net:''};
}
const RC_NOTOT = /(SUB\s?-?TOTAL|TAX|CHANGE|CASH|TENDER|SAVINGS?|DISCOUNT|COUPON|ITEMS?\b|POINTS|REWARDS?|BALANCE FWD|TIP\b|GRATUITY|GALLONS?|GAL\b|QTY|@)/;
function rcAmounts(lines) {
  let sub = null, tax = null, tip = null; const cand = [];
  lines.forEach((l, k) => {
    const up = l.s.toUpperCase().replace(/[^A-Z0-9@ ]+/g, ' ').replace(/\s+/g, ' '), am = rcAmts(l); if (!am.length) return;
    const last = am[am.length - 1].v;
    if (/SUB\s?TOTAL|MERCHANDISE|NET SALES?/.test(up)) { sub = last; return; }
    if (/\b(SALES? )?TAX\b|\bHST\b|\bGST\b|\bVAT\b/.test(up) && !/TOTAL/.test(up)) { tax = (tax || 0) + last; return; }
    if (/\b(TIP|GRATUITY)\b/.test(up) && !/TOTAL/.test(up)) { tip = last; return; }
    let s = 0;
    if (/\b(GRAND TOTAL|TOTAL DUE|AMOUNT DUE|BALANCE DUE|TOTAL AMOUNT|ORDER TOTAL|AMOUNT CHARGED|TOTAL CHARGED|TOTAL SALE|TOTAL PAID)\b/.test(up)) s = 6;
    else if (/\bTOTAL\b/.test(up) && !/\b(ITEM|SAVINGS?|POINTS|DISCOUNT|CHANGE|FUEL|TAX)/.test(up)) s = 5;
    else if (/\b(TOTAL|AMOUNT|BALANCE|SALE|PURCHASE|DEBIT|CREDIT)\b/.test(up) && !RC_NOTOT.test(up.replace(/\bTOTAL\b|\bAMOUNT\b|\bSALE\b|\bPURCHASE\b|\bDEBIT\b|\bCREDIT\b|\bBALANCE\b/g, ''))) s = 4;
    else if (/\b(VISA|MASTERCARD|MC|DISCOVER|AMEX|CARD)\b/.test(up) && !/\bCHANGE\b/.test(up)) s = 3;
    else if (/\bFUEL TOTAL\b/.test(up)) s = 3;
    else if (/CASH|CHANGE|TENDER/.test(up)) { return; }
    else s = 1;
    cand.push({v:Math.round(last * 100) / 100, s, k, line:l.s});
  });
  return {sub, tax, tip, cand};
}
function rcPickTotal(A, lines) {
  const by = new Map();
  A.cand.forEach(c => { if (!(c.v > 0) || c.v > 20000) return; const e = by.get(c.v) || {v:c.v, s:0, n:0, k:0}; e.s = Math.max(e.s, c.s) + (e.n ? 0.6 : 0); e.n++; e.k = Math.max(e.k, c.k); by.set(c.v, e); });
  let arr = [...by.values()];
  const ok = (a, b) => Math.abs(a - b) < 0.015;
  arr.forEach(e => {
    if (A.sub != null && A.tax != null && ok(A.sub + A.tax, e.v)) e.s += 3.5;
    else if (A.sub != null && A.tax == null && ok(A.sub, e.v)) e.s += 0.5;
    if (A.sub != null && A.tip != null && A.tax != null && ok(A.sub + A.tax + A.tip, e.v)) e.s += 4;   // restaurant: total with the tip
    e.s += e.k / Math.max(lines.length, 1) * 0.8;   // later lines win ties
  });
  if (A.sub != null && A.tax != null && !arr.some(e => ok(e.v, A.sub + A.tax)) && A.sub > 0) arr.push({v:Math.round((A.sub + A.tax) * 100) / 100, s:3.2, n:0, k:0, calc:true});
  arr.sort((a, b) => b.s - a.s || b.v - a.v);
  return arr;
}
function rcItems(lines, tot) {
  const out = [];
  lines.forEach(l => {
    const up = l.s.toUpperCase(); if (/TOTAL|TAX|CHANGE|CASH|TENDER|VISA|MASTER|DISCOVER|AMEX|BALANCE|SAVINGS|TIP\b|DEBIT|CREDIT|AUTH|APPROVED|ITEMS|PUMP|GAL\b|@/.test(up)) return;
    const am = rcAmts(l); if (!am.length || am.some(q => q.v !== am[0].v) || am[0].v <= 0 || am[0].v >= tot) return;
    const nm = l.s.replace(/\s+[\$S]?[\d,]+\s?[.,]\s?\d{2}\b.*$/, '').replace(/\b\d{6,}\b/g, ' ').replace(/^[^A-Za-z0-9]+/, '').replace(/^\W*\d{6,}\W*/, '').replace(/^\d+\s+(?=[A-Za-z])/, '').replace(/\s{2,}/g, ' ').trim();
    if ((nm.match(/[A-Za-z]/g) || []).length < 3) return;
    out.push({n:rcTitle(nm).slice(0, 40), v:am[0].v});
  });
  return out.slice(0, 14);
}
// The whole read: text in, a best guess plus other possibilities out
function rcParse(tsv, text, now) {
  now = now || (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
  const lines = rcLines(tsv).filter(l => l.s.replace(/\s/g, '').length > 0);
  const A = rcAmounts(lines), ranked = rcPickTotal(A, lines), mer = rcMerchant(lines), card = rcCard(lines);
  const ds = rcDates(lines, now).sort((a, b) => b.s - a.s || (a.i - b.i)), seen = new Set(), dates = [];
  ds.forEach(d => { if (!seen.has(d.d)) { seen.add(d.d); dates.push(d.d); } });
  const best = ranked[0], second = ranked[1];
  let sure = 0;   // 0 check it, 1 probably, 2 sure
  if (best) { sure = best.s >= 5 ? 2 : best.s >= 3 ? 1 : 0; if (second && best.s - second.s < 1 && second.s >= 3) sure = Math.min(sure, 1); if (A.sub != null && A.tax != null && Math.abs(A.sub + A.tax - best.v) < 0.015) sure = 2; }
  const fuel = lines.some(l => /\b(GAL|GALLONS?|UNLEADED|REGULAR|PREMIUM|DIESEL|PUMP)\b/i.test(l.s) && /\b\d+\.\d{2,3}\b/.test(l.s)) || /GAS|FUEL|PETRO/.test(rcNorm(mer.name));
  return {merchant:mer.name, known:mer.known, total:best ? best.v : null, alts:ranked.slice(1, 5).map(e => e.v), sure, date:dates[0] || '', dates:dates.slice(0, 3), l4:card.l4, net:card.net, tax:A.tax, sub:A.sub, tip:A.tip, items:best ? rcItems(lines, best.v) : [], fuel, lines:lines.length};
}

/* ===== Scanning a receipt: photo in, a filled-out purchase to confirm out ===== */
const rcStore = {
  put: (id, blob) => sdo('rc', 'readwrite', s => s.put({id, blob, t:Date.now()})),
  get: id => sdo('rc', 'readonly', s => s.get(id)).catch(() => null),
  del: id => sdo('rc', 'readwrite', s => s.delete(id)).catch(() => {}),
};
function rcFit(cv, long) {
  const k = Math.min(1, long / Math.max(cv.width, cv.height)), c = rcCanvas(cv.width * k, cv.height * k), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = 'high'; x.drawImage(cv, 0, 0, c.width, c.height); return c;
}
const rcMB = n => (n / 1048576).toFixed(1);
function rcSay(txt, pct) {
  if (UI.rc) { UI.rc.txt = txt; if (pct != null) UI.rc.pct = pct; }
  const t = document.getElementById('rctxt'), b = document.getElementById('rcbar'); if (t) t.textContent = txt; if (b && pct != null) b.style.width = Math.round(pct * 100) + '%';
}
async function rcScan(file) {
  if (UI.rc && UI.rc.thumb) URL.revokeObjectURL(UI.rc.thumb);
  const me = UI.rc = {stage:'work', txt:'Straightening the photo…', pct:0.05};
  if (S.tab !== 'bgo' && S.tab !== 'btx') go('btx');
  render(); setTimeout(() => { const e = document.getElementById('rcCard'); if (e) e.scrollIntoView({behavior:'smooth', block:'center'}); }, 80);
  const live = () => UI.rc === me;
  try {
    const eng = rcEngine((s, m) => { if (!live()) return; if (s === 'dl') rcSay(`Downloading the reader, once only (${rcMB(m.g)} of ${m.t ? rcMB(m.t) : '13'} MB)`, 0.1 + 0.5 * (m.t ? m.g / m.t : 0.5)); else if (s === 'engine') rcSay('Starting the reader…', 0.1); else if (s === 'model') rcSay('Getting the reader ready…', 0.12); });
    eng.catch(() => {});
    const P = await rcPrep(file); if (!live()) return;
    rcSay('Reading the receipt…', 0.65);
    const png = await rcPng(P.cv); await eng; if (!live()) return;
    rcSay('Reading the receipt…', 0.7);
    let r = await rcRecognize(png.slice(0), 6, p => live() && rcSay('Reading the receipt…', 0.7 + 0.25 * p)), p = rcParse(r.tsv, r.text);
    if (live() && (p.total == null || p.sure < 1 || !p.date)) {   // second look with a different layout guess; keep whichever read is better
      rcSay('Taking a second look…', 0.95);
      try { const r2 = await rcRecognize(png.slice(0), 4), p2 = rcParse(r2.tsv, r2.text), rate = q => (q.total != null ? 2 + q.sure : 0) + (q.date ? 1 : 0) + (q.merchant ? 0.5 : 0); if (rate(p2) > rate(p)) { p = p2; r = r2; } } catch (e) {}
    }
    if (!live()) return;
    const gs = p.merchant ? bgGuess(p.merchant) : {cat:'other', conf:0}, cat = p.fuel && gs.conf < 2 ? (S.bg.cats.find(c => c.id === 'gas') || S.bg.cats.find(c => /gas|fuel|car|transport/i.test(c.name)) || {}).id || '' : '';
    const card = p.l4 ? (S.bg.cards.find(c => c.l4 && c.l4 === p.l4) || {}).id || '' : '';
    const blob = await new Promise(ok => rcFit(P.cv, 1400).toBlob(ok, 'image/jpeg', 0.72));
    UI.rc = {stage:'review', blob, thumb:URL.createObjectURL(blob), p, f:{amt:p.total != null ? p.total.toFixed(2) : '', d:p.date || today(), name:p.merchant || '', cat:cat || (gs.conf >= 1 ? gs.cat : ''), cc:card, items:p.items.length > 1, keep:true}, conf:Math.round(r.conf || 0), l4:p.l4, l4miss:!!p.l4 && !card};
  } catch (e) {
    if (live()) UI.rc = {stage:'fail', msg:String(e && e.message || e).slice(0, 140)};
    try { Crash.record && Crash.record(e, 'scanning a receipt'); } catch (x) {}
  }
  render(); setTimeout(() => { const e = document.getElementById('rcCard'); if (e) e.scrollIntoView({behavior:'smooth', block:'center'}); }, 80);
}
function rcUI() {
  const R = UI.rc; let h = '';
  if (UI.rcView) h += `<div class="rcview" data-act="rcClose" role="dialog" aria-label="Receipt photo"><button class="btn sm" data-act="rcClose">Close</button><img src="${esc(UI.rcView)}" alt="Your receipt"></div>`;
  if (!R) return h;
  if (R.stage === 'work') return h + `<section class="card" id="rcCard"><h2>🧾 Scanning…</h2><div class="cbar mt"><i id="rcbar" style="width:${Math.round((R.pct || 0) * 100)}%;background:var(--accent);transition:width .3s"></i></div><p class="note" id="rctxt">${esc(R.txt || '')}</p><p class="small muted">Everything is read on your phone. The photo is never uploaded.</p><button class="link" data-act="rcCancel">Cancel</button></section>`;
  if (R.stage === 'fail') return h + `<section class="card" id="rcCard"><h2>🧾 Couldn't read that</h2><p class="note">${esc(R.msg || 'Something went wrong.')}</p><p class="small muted">Try again in good light with the whole receipt flat in the picture. Or type it in below.</p><div class="btns"><label class="btn file-btn">📷 Try again<input type="file" accept="image/*" data-file="bgscan" aria-label="Take or choose a receipt photo"></label><button class="btn ghost" data-act="rcCancel">Close</button></div></section>`;
  const p = R.p, f = R.f, hint = p.total == null ? 'I couldn\'t find the total. Please type it in.' : p.sure === 2 ? '' : p.sure === 1 ? 'Check the total, I\'m not 100% sure.' : 'Please check the total, this one was hard to read.';
  const alts = p.alts.filter(v => v !== p.total).slice(0, 3);
  return h + `<section class="card" id="rcCard"><div class="row"><h2>🧾 Check this receipt</h2><button class="link" data-act="rcCancel">Discard</button></div>
    <div class="rcrow"><img class="rcthumb" src="${esc(R.thumb)}" alt="Your receipt" data-act="rcShowNew"><p class="note" style="margin:0">${p.total == null ? 'Fill in what I missed' : 'Here\'s what I found'}. Change anything that's off, then add it.${R.conf < 60 ? ' <b>The photo was a bit blurry.</b>' : ''}</p></div>
    ${hint ? `<p class="small" style="color:${p.total == null || p.sure === 0 ? 'var(--bad,#E17055)' : 'var(--muted)'};font-weight:700">⚠︎ ${hint}</p>` : ''}
    <form data-form="rcsave" class="stack">
      <div class="ff"><label>Total ($)<input class="input" name="amt" inputmode="decimal" autocomplete="off" value="${esc(f.amt)}" placeholder="0.00"></label><label>Date<input class="input" type="date" name="d" value="${esc(f.d)}"></label></div>
      ${alts.length ? `<div class="chips" aria-label="Other amounts on the receipt"><span class="small muted" style="align-self:center">Or:</span>${alts.map(v => chip(cash2(v), false, `data-act="rcAlt" data-v="${v.toFixed(2)}"`)).join('')}</div>` : ''}
      ${p.dates.length > 1 ? `<div class="chips"><span class="small muted" style="align-self:center">Other dates:</span>${p.dates.filter(d => d !== f.d).map(d => chip(fmtShort(d), false, `data-act="rcDate" data-v="${d}"`)).join('')}</div>` : ''}
      <label>Where<input class="input" name="name" autocomplete="off" autocapitalize="words" value="${esc(f.name)}" placeholder="Store name"></label>
      <label>Category<select class="input" name="cat">${bgCatOpts(f.cat, true)}</select></label>
      ${S.bg.cards.length ? `<label>Which card${p.l4 ? ` <small class="muted">(receipt shows ending ${esc(p.l4)})</small>` : ''}<select class="input" name="cc"><option value="">Debit or cash</option>${S.bg.cards.map(c => opt(c.id, c.em + ' ' + c.name + (c.l4 ? ' ·' + c.l4 : ''), f.cc)).join('')}</select></label>` : ''}
      ${R.l4miss ? `<label class="setrow"><span>Remember ending ${esc(R.l4)} for this card<small class="muted" style="display:block;font-weight:600">Next time I'll pick it for you</small></span><input type="checkbox" name="rl4" checked style="width:24px;height:24px;accent-color:var(--accent)"></label>` : ''}
      ${p.items.length ? `<label class="setrow"><span>Save the items in the note<small class="muted" style="display:block;font-weight:600">${plural(p.items.length, 'item')} · ${esc(p.items.slice(0, 2).map(i => i.n).join(', '))}${p.items.length > 2 ? '…' : ''}</small></span><input type="checkbox" name="ni"${f.items ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>` : ''}
      <label class="setrow"><span>Keep the photo with it<small class="muted" style="display:block;font-weight:600">Stays on this phone</small></span><input type="checkbox" name="kp"${f.keep ? ' checked' : ''} style="width:24px;height:24px;accent-color:var(--accent)"></label>
      <div class="btns"><button class="btn" type="submit">Add it</button><label class="btn ghost file-btn">Retake<input type="file" accept="image/*" data-file="bgscan" aria-label="Take or choose a receipt photo"></label></div></form></section>`;
}
function rcScanBtn(label) {
  return `<label class="btn block file-btn rcscan">📷 ${label || 'Scan a receipt'}<input type="file" accept="image/*" data-file="bgscan" aria-label="Take or choose a receipt photo"></label>`;
}
Object.assign(XACT, {
  rcCancel: () => { if (UI.rc && UI.rc.thumb) URL.revokeObjectURL(UI.rc.thumb); UI.rc = null; rcStop(); },
  rcAlt: d => { const i = document.querySelector('form[data-form="rcsave"] [name="amt"]'); if (i) i.value = d.v; return false; },
  rcDate: d => { const i = document.querySelector('form[data-form="rcsave"] [name="d"]'); if (i) i.value = d.v; return false; },
  rcShowNew: () => { if (UI.rc && UI.rc.thumb) UI.rcView = UI.rc.thumb; },
  rcClose: () => { if (UI.rcView && !(UI.rc && UI.rc.thumb === UI.rcView)) URL.revokeObjectURL(UI.rcView); UI.rcView = null; },
  rcSee: d => { rcStore.get(d.id).then(r => { if (r && r.blob) { UI.rcView = URL.createObjectURL(r.blob); render(); } else toast('That photo isn\'t on this phone.'); }); return false; },
});
Object.assign(SAVE, {
  rcsave: o => {
    const R = UI.rc; if (!R || R.stage !== 'review') return false;
    const before = S.bg.tx.length; UI.edit = null; const bad = SAVE.bgtx({amt:o.amt, d:o.d, name:o.name, cat:o.cat, cc:o.cc}); if (bad === false || S.bg.tx.length === before) return false;
    const x = S.bg.tx[S.bg.tx.length - 1], p = R.p;
    if (o.ni === 'on' && p.items.length) x.note = p.items.map(i => `${i.n} ${i.v.toFixed(2)}`).join('\n').slice(0, 600);
    if (o.rl4 === 'on' && R.l4 && o.cc) { const c = S.bg.cards.find(k => k.id === o.cc); if (c && !c.l4) c.l4 = R.l4; }
    if (o.kp === 'on') { x.rc = 1; rcStore.put(x.id, R.blob).catch(() => { x.rc = 0; save(); toast('Added, but the photo didn\'t fit on this phone.'); }); }
    if (UI.rc && UI.rc.thumb && !x.rc) URL.revokeObjectURL(UI.rc.thumb); UI.rc = null; rcStop(); S.bg.n.scan = (S.bg.n.scan || 0) + 1;
  },
});
