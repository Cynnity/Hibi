// Hibi: Motion. The welcome animation when the app opens, screen transitions, and confetti. Both can be turned off in Home Settings.
'use strict';
/* =========================================================
   Motion
   ========================================================= */
function normalizeFx(s) {
  if (!s.fx || typeof s.fx !== 'object') s.fx = {};
  if (typeof s.fx.intro !== 'boolean') s.fx.intro = true;
  if (typeof s.fx.anim !== 'boolean') s.fx.anim = true;
}
normalizeFx(S);
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const fxOn = () => S.fx.anim && !reduced();
function applyFx() { document.documentElement.classList.toggle('no-anim', !S.fx.anim); }
applyFx();

/* ----- Welcome animation (the markup is in index.html so it shows before anything loads) ----- */
function splashRun() {
  const el = document.getElementById('splash'); if (!el) return;
  if (!S.fx.intro || reduced()) { el.remove(); return; }
  const h = new Date().getHours(), g = document.getElementById('splashHi');
  if (g) g.textContent = `${h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}${S.home && S.home.name ? ', ' + S.home.name : ''}`;
  el.classList.add('go');
  let gone = false;
  const done = () => { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => el.remove(), 520); };
  el.addEventListener('click', done);
  setTimeout(done, 1650);
}

/* ----- Screen transitions: only when the screen changes, not on every tap ----- */
let fxLastTab = null, fxTimer = 0;
function fxEnter() {
  const app = $('#app'); if (!app) return;
  if (fxLastTab !== null && fxLastTab !== S.tab && fxOn()) {
    app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter');
    clearTimeout(fxTimer); fxTimer = setTimeout(() => app.classList.remove('enter'), 700);
  }
  fxLastTab = S.tab;
}

/* ----- Confetti ----- */
function confetti(n) {
  if (!fxOn()) return;
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const cols = ['var(--accent)', 'var(--accent-2)', '#F5B301', '#43E0C8', '#FF8A00', '#8B6CFF'];
  for (let i = 0; i < (n || 36); i++) {
    const p = document.createElement('i');
    p.style.cssText = `left:${50 + (Math.random() - .5) * 30}%;background:${cols[i % cols.length]};--dx:${(Math.random() - .5) * 420}px;--dy:${-(160 + Math.random() * 320)}px;--r:${(Math.random() - .5) * 900}deg;animation-delay:${Math.random() * 120}ms;${i % 3 ? '' : 'border-radius:50%;'}`;
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 1700);
}
Object.assign(XACT, {
  fxIntro: () => { S.fx.intro = !S.fx.intro; toast(S.fx.intro ? 'Welcome animation on.' : 'Welcome animation off.'); },
  fxAnim: () => { S.fx.anim = !S.fx.anim; applyFx(); toast(S.fx.anim ? 'Animations on.' : 'Animations off.'); if (S.fx.anim) setTimeout(() => confetti(24), 150); },
  fxPreview: () => { const s = document.createElement('div'); s.innerHTML = SPLASH_HTML; document.body.appendChild(s.firstElementChild); const was = S.fx.intro; S.fx.intro = true; splashRun(); S.fx.intro = was; return false; },
});
const SPLASH_HTML = '<div id="splash" role="presentation"><div class="sp-in"><div class="sp-logo"><img src="hibi-icon-512.png" alt=""><i></i><i></i><i></i><i></i><i></i><i></i></div><b class="sp-name">Hibi</b><span class="sp-hi" id="splashHi"></span></div></div>';
const fxSwitch = (act, on, label, note) => `<div class="setrow"><span>${label}<small class="muted" style="display:block;font-weight:600">${note}</small></span><button class="switch${on ? ' on' : ''}" role="switch" aria-checked="${on}" aria-label="${label}" data-act="${act}"><i></i></button></div>`;
function fxSettings() {
  return `    <section class="card"><h2>Animations</h2>
      ${fxSwitch('fxIntro', S.fx.intro, 'Welcome animation', 'Plays when you open Hibi. Tap it to skip.')}
      ${fxSwitch('fxAnim', S.fx.anim, 'Smooth animations', 'Screen transitions, filling bars and confetti.')}
      <button class="btn sm ghost mt" data-act="fxPreview">Play the welcome animation</button>
      ${reduced() ? '<p class="note">Your iPhone has Reduce Motion turned on, so Hibi keeps animations off. You can change that in Settings, then Accessibility, then Motion.</p>' : ''}</section>
`;
}
