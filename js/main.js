import { animate, stagger, utils } from 'animejs';
import { createAmphora } from './gl.js';
import { buildRig } from './rig.js';
import { audio } from './audio.js';
import { createFX } from './fx.js';

const { gsap, ScrollTrigger, Flip, Draggable, SplitText, MotionPathPlugin, TextPlugin, InertiaPlugin, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, Flip, Draggable, SplitText, MotionPathPlugin, TextPlugin, InertiaPlugin);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mm = gsap.matchMedia();

/* =========================================================
   SMOOTH SCROLL + RENDER LOOP
   ========================================================= */
const lenis = new Lenis({ lerp: reduced ? 1 : 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
lenis.stop();
lenis.on('scroll', ScrollTrigger.update);
window.odyssey = { lenis };
gsap.ticker.lagSmoothing(0);

const fx = createFX({ onStrike: () => { flash(0.55, 0.45); audio.thunder(); } });
let amphora = null;
gsap.ticker.add(time => {
  lenis.raf(time * 1000);
  fx.render(time);
  if (amphora) amphora.render(time);
});

// several scenes may hold the scroll at once (a painting, the sirens, the menu); release only when all let go
const locks = new Set();
const lock = (why = 'misc') => { locks.add(why); lenis.stop(); };
const unlock = (why = 'misc') => { locks.delete(why); if (!locks.size) lenis.start(); };
lock('gate');

/* =========================================================
   LOADER — anime.js meander grid
   ========================================================= */
function runLoader() {
  const grid = $('.loader__grid');
  const cols = window.innerWidth < 700 ? 8 : 16;
  const rows = Math.ceil(window.innerHeight / (window.innerWidth / cols));
  grid.style.setProperty('--cols', cols);
  grid.innerHTML = '<i></i>'.repeat(cols * rows);
  animate(grid.children, {
    opacity: [0, 1], scale: [0.2, 1],
    delay: stagger(28, { grid: [cols, rows], from: 'center' }),
    duration: 700, ease: 'outExpo'
  });
  const word = $('.loader__word');
  word.innerHTML = [...word.textContent].map(c => `<span>${c}</span>`).join('');
  animate(word.children, { opacity: [0, 1], translateY: [40, 0], delay: stagger(70, { start: 300 }), duration: 900, ease: 'outElastic(1, .7)' });

  const sources = ['media/img/bow.webp', 'media/img/hero-flame.webp', 'media/img/odysseus.webp', 'media/img/p-olympians.webp'];
  let done = 0;
  const bar = $('.loader__bar span');
  const step = () => { done++; gsap.to(bar, { width: `${(done / (sources.length + 1)) * 100}%`, duration: 0.4 }); };
  const loads = sources.map(src => new Promise(r => { const i = new Image(); i.onload = i.onerror = () => { step(); r(); }; i.src = src; }));
  loads.push(document.fonts.ready.then(step));
  return Promise.all([...loads, new Promise(r => setTimeout(r, 1800))]).then(() => {
    const tl = gsap.timeline();
    tl.to(bar, { width: '100%', duration: 0.3 })
      .to(word.children, { opacity: 0, y: -30, stagger: 0.04, duration: 0.4 })
      .to('#loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'power4.inOut' }, '-=0.1')
      .set('#loader', { display: 'none' });
    return tl;
  });
}

/* =========================================================
   CHAPTER STATE — tone, fluid, threads, counters, letterbox
   ========================================================= */
const counters = { years: 0, men: 600 };
function setCounters(years, men) {
  if (years == null) return;
  const from = { ...counters };
  gsap.to(counters, {
    years: +years, men: +men, duration: Math.min(2.4, 0.6 + Math.abs(from.men - men) / 300 + Math.abs(from.years - years) / 8),
    ease: 'power2.out',
    onUpdate() {
      const y = Math.round(counters.years), m = Math.round(counters.men);
      const yb = $('#c-years'), mb = $('#c-men');
      if (yb.textContent != y || mb.textContent != m) audio.tick();
      yb.textContent = y; mb.textContent = m;
    }
  });
}

const THEME_LEVEL = { sirens: 0.12, strait: 0.3, cyclops: 0.45, underworld: 0.5, zeus: 0.4 };
function setChapter(ch) {
  const d = ch.dataset;
  document.body.dataset.tone = d.tone || 'light';
  const idx = $$('.chapter').indexOf(ch);
  const num = $('.hud__num'), name = $('.hud__name');
  if (name.textContent !== d.title) {
    gsap.to([num, name], { yPercent: -100, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => {
      num.textContent = String(idx).padStart(2, '0'); name.innerHTML = d.title;
      gsap.fromTo([num, name], { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
    } });
  }
  $$('.threads__line').forEach(l => l.classList.toggle('is-on', l.dataset.thread === d.thread));
  setCounters(d.years, d.men);
  audio.themeLevel(THEME_LEVEL[ch.id] ?? 0.75);
  audio.shepard(ch.id === 'strait');
  audio.wind(ch.id === 'zeus' ? 0.4 : ch.id === 'strait' ? 0.25 : 0);
  if (ch.id === 'zeus') fx.storm(1, { lightning: true });
  else if (ch.id === 'strait') fx.storm(0.45);
  else fx.storm(0);}

function setIMAX(open) {
  gsap.to('.lb', { height: open ? 0 : 'var(--lb)', duration: 1.2, ease: 'power3.inOut', overwrite: true });
  gsap.to('.hud', { top: open ? 14 : 'calc(var(--lb) + 14px)', duration: 1.2, ease: 'power3.inOut', overwrite: true });
}

function flash(strength = 1, dur = 0.6) {
  gsap.fromTo('.flash', { opacity: strength }, { opacity: 0, duration: dur, ease: 'power2.out', overwrite: true });
}

/* =========================================================
   TEXT — SplitText reveals and TextPlugin narration
   ========================================================= */
function setupText() {
  $$('.split').forEach(el => {
    const split = SplitText.create(el, { type: 'lines,words,chars', mask: 'lines' });
    gsap.from(split.chars, {
      yPercent: 105, opacity: 0, duration: 1.1, ease: 'power4.out', stagger: 0.014,
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
    });
  });
  $$('.type').forEach(el => {
    const text = el.dataset.text;
    ScrollTrigger.create({
      trigger: el, start: 'top 80%', once: true,
      onEnter: () => gsap.to(el, { text: { value: text }, duration: text.length * 0.022, ease: 'none' })
    });
  });
  $$('.kicker, .hand:not(.sirens__step):not(.bow__hint), .narr > p:not(.type), .panel > p, .agam__text, .credits').forEach(el => {
    gsap.from(el, { opacity: 0, y: 24, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
}

/* =========================================================
   MUSEUM — Flip a painting from its frame to the full screen
   ========================================================= */
function toggleMuseum(m, force) {
  const frame = m.querySelector('.museum__frame') || m._frame;
  const open = force ?? !frame.classList.contains('is-full');
  if (open === frame.classList.contains('is-full')) return;
  const state = Flip.getState(frame);
  if (open) {
    m.style.height = `${m.offsetHeight}px`;
    m._frame = frame;
    document.body.appendChild(frame);
    frame.classList.add('is-full');
    lock('museum');
  } else {
    m.appendChild(frame);
    frame.classList.remove('is-full');
    m.style.height = '';
    unlock('museum');
  }
  Flip.from(state, { duration: 1.1, ease: 'power3.inOut', absolute: true, zIndex: 45 });
}

function setupMuseums() {
  $$('.museum').forEach(m => {
    const frame = m.querySelector('.museum__frame');
    frame.style.cursor = 'zoom-in';
    frame.addEventListener('click', () => toggleMuseum(m));
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const f = $('.museum__frame.is-full');
    if (f) toggleMuseum($$('.museum').find(m => m._frame === f), false);
  });
  // the council of the gods opens itself once, like a cut to a wide shot
  const gods = $('#gods .museum');
  const godsST = ScrollTrigger.create({
    trigger: gods, start: 'center 55%', end: 'bottom top',
    onEnter: () => gsap.delayedCall(0.45, () => {
      // only if the reader actually stopped here, not while flying past
      if (!godsST.isActive || godsST.done) return;
      godsST.done = true;
      toggleMuseum(gods, true);
      gsap.delayedCall(2.8, () => toggleMuseum(gods, false));
    })
  });
}

/* =========================================================
   00 · THE BOW GATE — Draggable with bounds, snap and a release
   ========================================================= */
function setupGate() {
  const wrap = $('#bow-gate');
  const svg = $('.bow__svg', wrap);
  const str = $('.bow__string', wrap);
  const handle = $('.bow__handle', wrap);
  const notch = $('.bow__notch', wrap);
  const arrow = $('.bow__arrow', wrap);
  const img = $('img', wrap);
  const hint = $('.bow__hint', wrap);
  const L = { x: 46, y: 239 }, R = { x: 978, y: 239 }, C = { x: 512, y: 239 };
  notch.setAttribute('cx', R.x); notch.setAttribute('cy', R.y);
  let phase = 1;
  const pos = { x: L.x + 70, y: L.y + 150 };

  // an invisible HTML proxy carries the Draggable; the SVG handle follows it
  const proxy = document.createElement('div');
  proxy.className = 'bow__proxy';
  Object.assign(proxy.style, { position: 'absolute', left: 0, top: 0, width: '56px', height: '56px', margin: '-28px 0 0 -28px', borderRadius: '50%', cursor: 'grab', zIndex: 5, touchAction: 'none' });
  wrap.appendChild(proxy);
  const k = () => wrap.clientWidth / 1024;

  function draw() {
    const x = +pos.x, y = +pos.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    handle.setAttribute('cx', x); handle.setAttribute('cy', y);
    if (phase === 1) {
      const mx = (L.x + x) / 2, my = Math.max(L.y, y) + 40;
      str.setAttribute('d', `M${L.x} ${L.y} Q${mx} ${my} ${x} ${y}`);
    } else {
      str.setAttribute('d', `M${L.x} ${L.y} L${x} ${y} L${R.x} ${R.y}`);
    }
  }
  const syncProxy = () => gsap.set(proxy, { x: pos.x * k(), y: pos.y * k() });
  draw(); syncProxy();
  window.addEventListener('resize', syncProxy);

  let lastCreak = 0;
  const drag = Draggable.create(proxy, {
    type: 'x,y',
    bounds: { minX: 0, maxX: 1024 * k(), minY: 0, maxY: 434 * k() },
    liveSnap: { points: p => { const t = { x: R.x * k(), y: R.y * k() }; return Math.hypot(p.x - t.x, p.y - t.y) < 46 ? t : p; } },
    onPress() { audio.enable(); $('.sound').setAttribute('aria-pressed', 'true'); },
    onDrag() {
      if (!Number.isFinite(this.x) || !Number.isFinite(this.y) || !k()) return;
      if (phase === 1) { pos.x = this.x / k(); pos.y = this.y / k(); }
      else {
        pos.x = C.x; pos.y = Math.min(Math.max(this.y / k(), C.y), C.y + 150);
        const pull = (pos.y - C.y) / 150;
        gsap.set(img, { scaleX: 1 - pull * 0.035, scaleY: 1 + pull * 0.05, transformOrigin: '50% 30%' });
        if (performance.now() - lastCreak > 90) { audio.creak(pull); lastCreak = performance.now(); }
      }
      draw();
    },
    onRelease() {
      if (phase === 1) {
        if (Math.hypot(+pos.x - R.x, +pos.y - R.y) < 30) return strung();
        gsap.to(pos, { x: L.x + 70, y: L.y + 150, duration: 1.2, ease: 'elastic.out(1, .35)', onUpdate: () => { draw(); syncProxy(); } });
        audio.creak(0.3);
        return;
      }
      const pull = (+pos.y - C.y) / 150;
      if (pull > 0.55) return loose();
      gsap.to(pos, { y: C.y, duration: 0.6, ease: 'elastic.out(1, .3)', onUpdate: () => { draw(); syncProxy(); } });
      gsap.to(img, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, .3)' });
    }
  })[0];

  function strung() {
    phase = 2;
    audio.thud();
    pos.x = R.x; pos.y = R.y;
    gsap.to(pos, { x: C.x, y: C.y, duration: 0.5, ease: 'power3.out', onUpdate: () => { draw(); syncProxy(); } });
    gsap.to(notch, { opacity: 0, duration: 0.4 });
    drag.vars.liveSnap = false;
    drag.applyBounds({ minX: C.x * k(), maxX: C.x * k(), minY: C.y * k(), maxY: (C.y + 150) * k() });
    gsap.to(hint, { text: { value: 'now draw it ↓ and let go' }, duration: 0.6 });
    flash(0.25, 0.5);
  }

  function loose() {
    drag.disable();
    audio.twang();
    gsap.set(arrow, { attr: { opacity: 1 }, x: C.x, y: pos.y, rotation: -90, transformOrigin: '0 0' });
    gsap.to(pos, { y: C.y, duration: 0.5, ease: 'elastic.out(1.2, .2)', onUpdate: draw });
    gsap.to(img, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.2, .2)' });
    gsap.to(arrow, { y: -1600, duration: 0.55, ease: 'power2.in' });
    gsap.to(hint, { opacity: 0, duration: 0.3 });
    gsap.delayedCall(0.35, openStory);
  }
  $('.gate__skip').addEventListener('click', () => { audio.enable(); $('.sound').setAttribute('aria-pressed', 'true'); drag.disable(); openStory(); });
}

let opened = false;
function openStory() {
  if (opened) return;
  opened = true;
  flash(1, 1.4);
  document.body.classList.remove('is-locked');
  ScrollTrigger.refresh();
  lenis.resize();
  unlock('gate');
  gsap.delayedCall(0.25, () => { lenis.resize(); lenis.scrollTo('#title', { duration: 2.6, easing: t => 1 - Math.pow(1 - t, 4), force: true }); });
}

/* =========================================================
   CHAPTER SCENES
   ========================================================= */
function setupTitle() {
  gsap.to('.title__art img', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '#title', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.title__art', { clipPath: 'inset(100% 0 0 0 round 260px 260px 8px 8px)', duration: 1.8, ease: 'power4.inOut', scrollTrigger: { trigger: '#title', start: 'top 70%' } });
  gsap.from('.title__word', { letterSpacing: '0.4em', opacity: 0, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: '.title__word', start: 'top 90%' } });
  animate('.scrollcue i', { scaleY: [0, 1], opacity: [1, 0], duration: 1800, loop: true, ease: 'inOutSine' });
}

function setupTroy() {
  const tl = gsap.timeline({ scrollTrigger: { trigger: '#troy', start: 'top 60%', end: 'bottom 40%', scrub: 1 } });
  tl.from('.vase--troy', { scale: 0.88, y: 80, ease: 'none' }, 0)
    .to('#troy .museum', { xPercent: -30, yPercent: -40, rotation: -9, opacity: 0.0, ease: 'power1.in' }, 0.25);
  $$('.torch').forEach(t => animate(t, {
    opacity: [0.55, 1], scale: [0.85, 1.25], duration: () => utils.random(180, 420),
    loop: true, alternate: true, ease: 'inOutQuad'
  }));
}

function setupVoyage() {
  const track = $('.voyage__track');
  const pin = $('.voyage__pin');
  const dist = () => track.scrollWidth - window.innerWidth + window.innerWidth * 0.1;
  const tween = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: pin, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 1, invalidateOnRefresh: true,
      onUpdate: s => amphora && amphora.setProgress(s.progress),
      onToggle: s => amphora && amphora.setVisible(s.isActive)
    }
  });
  createAmphora($('#amphora')).then(a => { amphora = a; a.setVisible(ScrollTrigger.isInViewport(pin)); ScrollTrigger.refresh(); });
  ScrollTrigger.create({ trigger: pin, start: 'top bottom', end: 'bottom top', onToggle: s => amphora && amphora.setVisible(s.isActive) });

  $$('.panel', track).forEach(p => {
    gsap.from(p.children, {
      opacity: 0, y: 50, stagger: 0.08, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left 85%' }
    });
  });
  const lotus = $('.lotus .draw');
  const len = lotus.getTotalLength();
  gsap.fromTo(lotus, { strokeDasharray: len, strokeDashoffset: len }, {
    strokeDashoffset: 0, ease: 'none',
    scrollTrigger: { trigger: '.panel--lotus', containerAnimation: tween, start: 'left 90%', end: 'center 50%', scrub: true }
  });

  // Aeolus: drag the silver knot loose and the winds escape
  const knot = $('.bag__knot');
  const winds = document.createElement('div'); winds.className = 'winds'; pin.appendChild(winds);
  let released = false;
  Draggable.create(knot, {
    type: 'x,y', bounds: { minX: -60, maxX: 60, minY: -70, maxY: 20 }, edgeResistance: 0.6,
    onDrag() { audio.creak(Math.min(1, Math.hypot(this.x, this.y) / 60)); },
    onRelease() {
      const far = Math.hypot(this.x, this.y) > 40;
      gsap.to(knot, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, .4)' });
      if (far && !released) releaseWinds();
    }
  });
  $('.bag').addEventListener('dblclick', releaseWinds);
  function releaseWinds() {
    if (released) return; released = true;
    audio.wind(0.9); audio.whoosh(); gsap.delayedCall(2.5, () => audio.wind(0));
    fx.gust(2.6);
    gsap.to('.bag__body', { attr: { d: 'M60 120c-30 20-30 60-10 75 20 15 80 15 100 0 20-15 20-55-10-75z' }, duration: 0.8, ease: 'power2.out' });
    $('.bag .hand').textContent = 'Ithaca shrinks to a line on the horizon.';
    const r = $('.bag svg').getBoundingClientRect(), pr = pin.getBoundingClientRect();
    const bx = r.left - pr.left + r.width / 2, by = r.top - pr.top + r.height * 0.3;
    for (let i = 0; i < 46; i++) {
      const s = document.createElement('i'); winds.appendChild(s);
      const a = utils.random(-0.9, 0.9) + (i % 2 ? Math.PI : 0), d = utils.random(500, 1400);
      gsap.fromTo(s, { x: bx, y: by, width: 0, opacity: 1, rotation: a * 57.3 },
        { x: bx + Math.cos(a) * d, y: by + Math.sin(a) * d * 0.5, width: utils.random(80, 260), opacity: 0, duration: utils.random(1.1, 2.2), ease: 'power2.out', delay: utils.random(0, 0.5), onComplete: () => s.remove() });
    }
    gsap.fromTo(pin, { x: -8 }, { x: 0, duration: 0.6, ease: 'rough({strength:3, points:20, randomize:true})' });
  }
}

function setupCyclops() {
  const vase = $('.vase--cyclops');
  const eye = $('.eye', vase), pupil = $('.eye i', vase);
  vase.addEventListener('pointermove', e => {
    const r = eye.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.min(1, Math.hypot(dx, dy) / 300), a = Math.atan2(dy, dx);
    gsap.to(pupil, { x: Math.cos(a) * d * r.width * 0.22, y: Math.sin(a) * d * r.width * 0.22, duration: 0.4, ease: 'power3.out' });
  });
  const blink = () => { gsap.to(eye, { scaleY: 0.1, duration: 0.08, yoyo: true, repeat: 1 }); gsap.delayedCall(utils.random(2.5, 5), blink); };
  blink();

  const tl = gsap.timeline({ scrollTrigger: { trigger: '.cyclops__stage', start: 'top 12%', end: '+=130%', pin: true, scrub: 1 } });
  tl.fromTo(vase, { scale: 0.92 }, { scale: 1.08, ease: 'none', duration: 1 }, 0)
    .to('.stake line', { strokeDashoffset: 0, ease: 'power2.in', duration: 0.5 }, 0.15)
    .call(() => { flash(0.9, 0.5); audio.thud(); audio.thunder(); }, null, 0.66)
    .to(eye, { background: 'radial-gradient(circle,#7a0f05,#3a0603 55%,rgba(0,0,0,0) 72%)', boxShadow: '0 0 40px 14px rgba(200,30,10,.55)', duration: 0.12 }, 0.66)
    .to(pupil, { opacity: 0, duration: 0.05 }, 0.66)
    .fromTo(vase, { x: 0 }, { x: 12, duration: 0.04, repeat: 7, yoyo: true, ease: 'none' }, 0.67)
    .to('.stake line', { opacity: 0, duration: 0.2 }, 0.85);

  const word = $('.nobody__word');
  ScrollTrigger.create({
    trigger: '#cyclops .museum--after', start: 'top 75%',
    onEnter: () => gsap.to(word, { text: { value: word.dataset.b }, color: '#E4572E', duration: 0.9, ease: 'none' }),
    onLeaveBack: () => gsap.to(word, { text: { value: word.dataset.a }, color: '#F28C1E', duration: 0.6, ease: 'none' })
  });
}

function setupGiants() {
  gsap.fromTo('.giants__strip', { x: '6vw' }, { x: '-28vw', ease: 'none', scrollTrigger: { trigger: '#giants', start: 'top bottom', end: 'bottom top', scrub: true } });
  const ships = $('.ships');
  ships.innerHTML = '<i></i>'.repeat(12);
  const sink = $$('i', ships).slice(1);
  gsap.timeline({ scrollTrigger: { trigger: ships, start: 'top 85%', end: 'top 35%', scrub: 1 } })
    .to(sink, { y: 26, opacity: 0, rotation: () => utils.random(-30, 30), stagger: 0.1, ease: 'power2.in' });
  ScrollTrigger.create({ trigger: ships, start: 'top 50%', once: true, onEnter: () => audio.thud() });
}

function setupCirce() {
  const frames = $$('.pig__frames i');
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  for (let i = 1; i < frames.length; i++) tl.to(frames[i], { opacity: 1, duration: 1 }).set(frames[i - 1], { opacity: 0 });
  const st = ScrollTrigger.create({ trigger: '.pig', start: 'top 75%', end: 'bottom 30%', scrub: 1, animation: tl });
  const btn = $('.moly');
  btn.addEventListener('click', () => {
    st.disable(false);
    tl.timeScale(2.5).reverse();
    btn.innerHTML = 'Men again — and weeping';
    audio.whoosh();
    animate(btn, { scale: [0.9, 1], duration: 900, ease: 'outElastic(1, .5)' });
  });
}

function setupUnderworld() {
  const frame = $('.agam__frame');
  const dead = $('.agam__dead'), blade = $('.agam__blade');
  const tl = gsap.timeline({ paused: true })
    .set(blade, { opacity: 1, left: '0%' })
    .to(dead, { clipPath: 'inset(0 0% 0 0)', duration: 2.4, ease: 'power2.inOut' }, 0)
    .to(blade, { left: '100%', duration: 2.4, ease: 'power2.inOut' }, 0)
    .to(blade, { opacity: 0, duration: 0.3 })
    .call(() => audio.thud(), null, 1.2);
  ScrollTrigger.create({
    trigger: frame, start: 'center 60%',
    onEnter: () => tl.play(), onLeaveBack: () => tl.reverse()
  });
  const toggle = () => (tl.progress() > 0.5 ? tl.reverse() : tl.play());
  frame.addEventListener('click', toggle);
  frame.addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle()));

  const cracks = $$('.mask__cracks path');
  cracks.forEach(p => { const l = p.getTotalLength(); gsap.set(p, { strokeDasharray: l, strokeDashoffset: l }); });
  gsap.timeline({ scrollTrigger: { trigger: '.mask', start: 'top 70%', end: 'bottom 40%', scrub: 1 } })
    .from('.mask img', { scale: 0.85, rotation: -6, ease: 'none' })
    .to(cracks, { strokeDashoffset: 0, stagger: 0.1, ease: 'none' }, 0.2)
    .to('.mask img', { filter: 'sepia(1) saturate(3.5) hue-rotate(-28deg) brightness(.62)', ease: 'none' }, 0.4);
}

function setupSirens() {
  const stage = $('.sirens__stage');
  const ship = $('.sirens__ship');
  const ears = $('.ears');
  const wax = $('.wax');
  const steps = $$('.sirens__step');
  const ROWERS = [0.34, 0.42, 0.50, 0.58, 0.66, 0.74];
  ROWERS.forEach(x => { const e = document.createElement('i'); e.className = 'ear'; e.style.left = `${x * 100}%`; e.style.top = '57%'; ears.appendChild(e); });
  const king = document.createElement('i'); king.className = 'ear ear--king'; king.style.left = '87.5%'; king.style.top = '50%'; ears.appendChild(king);

  const heroRig = buildRig($('.rig--hero', stage), 'hero');
  const mastRig = buildRig($('.rig--mast', stage), 'mast');
  gsap.to(heroRig.parts.head, { rotation: -3, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to(heroRig.parts.shield, { rotation: 1.5, duration: 3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to(mastRig.parts.head, { rotation: 'random(-8, 6)', duration: 0.32, repeat: -1, repeatRefresh: true, ease: 'sine.inOut' });

  // the ship rides the swell (anime.js keeps this loop off the scroll thread)
  animate(ship, { translateY: [-6, 6], rotate: [-0.8, 0.8], duration: 2600, loop: true, alternate: true, ease: 'inOutSine' });
  animate(wax, { rotate: [-6, 6], duration: 1400, loop: true, alternate: true, ease: 'inOutSine' });

  let sealed = 0, coils = 0, phase = 0;
  const setStep = n => steps.forEach((s, i) => { s.classList.toggle('is-on', i === n - 1); s.classList.toggle('is-done', i < n - 1); });

  const centers = () => {
    const wr = wax.getBoundingClientRect();
    const ox = wr.left - gsap.getProperty(wax, 'x') + wr.width / 2, oy = wr.top - gsap.getProperty(wax, 'y') + wr.height / 2;
    return $$('.ear', ears).filter(e => !e.classList.contains('is-sealed')).map(e => {
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2 - ox, y: r.top + r.height / 2 - oy, el: e };
    });
  };
  let targets = [];
  Draggable.create(wax, {
    type: 'x,y', bounds: stage,
    onPress() { targets = centers(); },
    liveSnap: { points: p => { const t = targets.find(t => Math.hypot(t.x - p.x, t.y - p.y) < 46); return t ? { x: t.x, y: t.y } : p; } },
    onRelease() {
      const hit = targets.find(t => Math.hypot(t.x - this.x, t.y - this.y) < 30);
      if (hit && hit.el === king) {
        gsap.to(wax, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, .4)' });
        flashNote('He pushes the wax away. He wants to hear it.');
        return;
      }
      if (hit) {
        hit.el.classList.add('is-sealed');
        audio.thud();
        sealed++;
        $('.wax-count').textContent = `${sealed}/6`;
        audio.sirens(1, sealed / 7);
        gsap.set(wax, { x: 0, y: 0, scale: 0 }); gsap.to(wax, { scale: 1, duration: 0.6, ease: 'back.out(2)', delay: 0.2 });
        if (sealed === ROWERS.length) startBinding();
        return;
      }
      gsap.to(wax, { x: 0, y: 0, duration: 0.9, ease: 'power3.out' });
    }
  });

  const note = document.createElement('p');
  note.className = 'sirens__note hand';
  $('.sirens__ui').prepend(note);
  function flashNote(t) {
    gsap.killTweensOf(note);
    gsap.set(note, { text: '', opacity: 1 });
    gsap.to(note, { text: { value: t }, duration: 0.6, ease: 'none' });
    gsap.to(note, { opacity: 0, duration: 0.6, delay: 2.8 });
  }

  function startBinding() {
    phase = 2; setStep(2);
    gsap.killTweensOf(wax);
    gsap.to(wax, { scale: 0, autoAlpha: 0, duration: 0.5, delay: 0.3, overwrite: true });
    const binding = $('.binding'); binding.classList.add('is-on');
    gsap.to(binding, { opacity: 1, duration: 0.8 });
    const end = $('.rope-end');
    let side = 'left';
    Draggable.create(end, {
      type: 'x,y', bounds: binding, inertia: true,
      onDrag() {
        const br = binding.getBoundingClientRect(), er = end.getBoundingClientRect();
        const fx = (er.left + er.width / 2 - br.left) / br.width;
        if (side === 'left' && fx > 0.78) side = 'right';
        if (side === 'right' && fx < 0.5) { side = 'left'; coil(); }
      }
    });
    function coil() {
      const c = $$('.coil')[coils];
      if (!c) return;
      gsap.to(c, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' });
      audio.creak(0.8); audio.thud();
      coils++;
      $('.rope-count').textContent = `${coils}/3`;
      if (coils === 3) bound();
    }
  }

  function bound() {
    phase = 3; setStep(3);
    const tl = gsap.timeline();
    tl.to('.rope-end', { opacity: 0, duration: 0.3 })
      .to(['.rig--hero', '.binding__svg'], { opacity: 0, duration: 0.8 }, 0.3)
      .to('.rig--mast', { opacity: 1, duration: 0.8 }, 0.3)
      .call(() => { audio.sirens(1, 0.86); finish(); });
  }

  function finish() { if (phase !== 4) { phase = 4; gsap.delayedCall(0.6, () => unlock('sirens')); } }

  // the stage pins; the story waits for the crew to be ready, then the ship rows past
  const sail = gsap.timeline({ defaults: { ease: 'none' } })
    .fromTo(ship, { xPercent: -30 }, { xPercent: 42, duration: 1 })
    .to('.binding', { y: -30, duration: 1 }, 0);
  ScrollTrigger.create({
    trigger: stage, start: 'top top', end: '+=160%', pin: true, scrub: 1, animation: sail,
    onEnter: () => { if (phase < 4) { lock('sirens'); setStep(1); } audio.sirens(1, sealed / 7); },
    onEnterBack: () => audio.sirens(1, 0.86),
    onLeave: () => audio.sirens(0),
    onLeaveBack: () => audio.sirens(0)
  });
  ScrollTrigger.create({ trigger: '.sirens__intro', start: 'top 60%', end: 'bottom top', onToggle: s => audio.sirens(s.isActive ? 0.45 : 0) });

  // escape hatch so nobody is ever trapped
  const skip = document.createElement('button');
  skip.className = 'gate__skip'; skip.textContent = 'skip';
  Object.assign(skip.style, { position: 'absolute', left: '6vw', top: 'calc(var(--lb) + 7vh)', zIndex: 9, marginTop: 0 });
  stage.appendChild(skip);
  skip.addEventListener('click', () => {
    $$('.ear:not(.ear--king)', ears).forEach(e => e.classList.add('is-sealed'));
    $$('.coil').forEach(c => gsap.set(c, { strokeDashoffset: 0 }));
    gsap.set('.binding', { opacity: 1 }); gsap.set(['.rig--hero', '.rope-end', '.binding__svg', wax], { opacity: 0 }); gsap.set('.rig--mast', { opacity: 1 });
    setStep(3); finish(); skip.remove();
  });
}

function setupStrait() {
  const c = $('.whirl'), g = c.getContext('2d');
  let speed = 0.4, angle = 0, visible = false;
  ScrollTrigger.create({ trigger: '#strait', start: 'top bottom', end: 'bottom top', onToggle: s => (visible = s.isActive) });
  gsap.ticker.add(() => {
    if (!visible) return;
    angle += 0.01 * speed;
    g.clearRect(0, 0, 600, 600);
    g.lineCap = 'round';
    for (let arm = 0; arm < 7; arm++) {
      g.beginPath();
      for (let t = 0; t < 1; t += 0.01) {
        const r = 270 * (1 - t), a = angle * (1 + t * 3) + arm * (Math.PI * 2 / 7) + t * 9;
        const x = 300 + Math.cos(a) * r, y = 300 + Math.sin(a) * r * 0.62;
        t ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = `rgba(${arm % 2 ? '43,76,126' : '127,156,199'},${0.45 + (arm % 3) * 0.15})`;
      g.lineWidth = 3.5 - arm * 0.3;
      g.stroke();
    }
    const grd = g.createRadialGradient(300, 300, 0, 300, 300, 80);
    grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.beginPath(); g.ellipse(300, 300, 90, 56, 0, 0, Math.PI * 2); g.fill();
  });
  const necks = $$('.necks path');
  necks.forEach(p => { const l = p.getTotalLength(); gsap.set(p, { strokeDasharray: l, strokeDashoffset: l }); });
  gsap.set('.heads circle', { scale: 0, transformOrigin: 'center' });
  const verdict = $('.strait__verdict');
  let chosen = false;
  $$('.strait__side').forEach(b => b.addEventListener('click', () => {
    if (chosen) return;
    if (b.dataset.choice === 'charybdis') {
      gsap.to({ s: speed }, { s: 6, duration: 1.2, yoyo: true, repeat: 1, onUpdate() { speed = this.targets()[0].s; } });
      audio.whoosh();
      gsap.to(verdict, { text: { value: 'Athena: "Not that way. Charybdis takes every man. Choose again."' }, duration: 1.4, ease: 'none' });
      return;
    }
    chosen = true;
    audio.thud(); audio.whoosh(0.1);
    gsap.to(necks, { strokeDashoffset: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' });
    gsap.to('.heads circle', { scale: 1, duration: 0.5, stagger: 0.08, delay: 0.6, ease: 'back.out(3)' });
    gsap.to('.strait__side--charybdis', { opacity: 0.35, duration: 1 });
    gsap.to(verdict, { text: { value: 'Six men snatched from the benches, calling his name. He would call it the worst thing he ever saw.' }, duration: 2.6, ease: 'none' });
    setCounters(counters.years, 38);
  }));
}

function setupZeus() {
  let struck = false;
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.wreck', start: 'top 75%', end: 'bottom 25%', scrub: 1, onUpdate: s => {
    if (s.progress > 0.38 && !struck) {
      struck = true;
      const r = $('.wreck').getBoundingClientRect();
      fx.strike(r.left + r.width * 0.53, r.top + r.height * 0.5);
      flash(1, 0.9);
    }
    if (s.progress < 0.2) struck = false;
  } } });
  tl.to('.bolt path', { strokeDashoffset: 0, duration: 0.35, ease: 'power4.in' }, 0)
    .to('.bolt', { opacity: 0, duration: 0.15 }, 0.5)
    .to('.wreck__half--l', { xPercent: -14, yPercent: 26, rotation: -11, opacity: 0.25, duration: 0.6, ease: 'power2.in' }, 0.4)
    .to('.wreck__half--r', { xPercent: 14, yPercent: 34, rotation: 13, opacity: 0.25, duration: 0.6, ease: 'power2.in' }, 0.4);
  ScrollTrigger.create({ trigger: '.wreck__line', start: 'top 80%', once: true, onEnter: () => setCounters(counters.years, 1) });
}

function setupCalypso() {
  gsap.to('.tally i', { scaleY: 1, stagger: 0.25, ease: 'power2.out', scrollTrigger: { trigger: '.tally', start: 'top 85%', end: 'top 40%', scrub: 1 } });
  gsap.to('.tally i:nth-child(5)', { scaleY: 1, rotation: -62, ease: 'none', scrollTrigger: { trigger: '.tally', start: 'top 60%', end: 'top 40%', scrub: 1 } });
}

function setupIthaca() {
  const svg = $('.loom__threads');
  const N = 26, x1 = 470, x2 = 770, y1 = 330, y2 = 430;
  for (let i = 0; i < N; i++) {
    const y = y1 + (i / (N - 1)) * (y2 - y1);
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', x1); l.setAttribute('x2', x2); l.setAttribute('y1', y); l.setAttribute('y2', y);
    l.style.opacity = 0;
    svg.appendChild(l);
  }
  const lines = $$('line', svg);
  gsap.timeline({ scrollTrigger: { trigger: '.loom', start: 'top 70%', end: 'bottom 30%', scrub: 1 } })
    .to(lines, { opacity: 0.85, stagger: 0.05, duration: 0.1, ease: 'none' })
    .to(lines.slice().reverse(), { opacity: 0, stagger: 0.04, duration: 0.1, ease: 'none' }, '+=0.3');

  const pen = buildRig($('.rig--penelope'), 'penelope');
  gsap.to(pen.parts.arm, { rotation: 4, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  const beg = buildRig($('.rig--beggar'), 'beggar');
  gsap.to(beg.parts.body, { rotation: 1.4, duration: 3.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.from('.hall__art', { clipPath: 'inset(0 50% 0 50%)', duration: 1.6, ease: 'power4.inOut', scrollTrigger: { trigger: '.hall', start: 'top 70%' } });
}

function setupBow() {
  const row = $('.axes__row');
  const NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < 12; i++) {
    const x = 330 + i * 72;
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = `<line x1="${x}" y1="160" x2="${x}" y2="290"/><path d="M${x - 22} 128 q22 -26 44 0 v44 q-22 26 -44 0z M${x} 150 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0" fill-rule="evenodd"/>`;
    row.appendChild(g);
  }
  const archer = buildRig($('.rig--archer'), 'hero');
  const arrow = $('.axes__arrow');
  gsap.set(arrow, { opacity: 0 });
  let loosed = false;
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.bow2', start: 'top 55%', end: 'bottom 35%', scrub: 1,
      onUpdate: s => { if (s.progress > 0.08 && !loosed) { loosed = true; audio.twang(); } if (s.progress < 0.04) loosed = false; }
    }
  });
  tl.to(archer.parts.head, { rotation: -4, duration: 0.2 }, 0)
    .to(archer.parts.shield, { rotation: -3, duration: 0.2 }, 0)
    .set(arrow, { opacity: 1 }, 0.08)
    .to(arrow, { motionPath: { path: '.axes__path', align: '.axes__path', alignOrigin: [0, 0.5], autoRotate: true }, duration: 1, ease: 'power1.in' }, 0.08)
    .to($$('g', row), { y: -6, duration: 0.05, stagger: 0.075, yoyo: true, repeat: 1 }, 0.1)
    .call(() => flash(0.6, 0.6), null, 1.05);
}

function setupBed() {
  const frame = $('.bed__frame');
  const roots = $$('.bed__roots path');
  roots.forEach(p => { const l = p.getTotalLength(); gsap.set(p, { strokeDasharray: l, strokeDashoffset: l }); });
  let revealed = false;
  const reveal = () => {
    if (revealed) return; revealed = true;
    audio.thud();
    gsap.to(roots, { strokeDashoffset: 0, duration: 1.8, stagger: 0.12, ease: 'power2.out' });
    gsap.to('.bed__trunk', { stroke: '#E4572E', duration: 0.8 });
    gsap.to('.bed__reveal', { opacity: 1, y: 0, duration: 1.2, delay: 0.6 });
  };
  Draggable.create(frame, {
    type: 'x', bounds: { minX: -16, maxX: 16 }, edgeResistance: 0.92,
    onDrag() { audio.creak(Math.abs(this.x) / 16); },
    onRelease() { gsap.to(frame, { x: 0, duration: 1, ease: 'elastic.out(1, .25)' }); reveal(); }
  });
  ScrollTrigger.create({ trigger: '.bed', start: 'top 20%', once: true, onEnter: reveal });
}

function setupEnd() {
  gsap.from('.end__word', { scale: 0.7, opacity: 0, letterSpacing: '0.3em', duration: 2.2, ease: 'power3.out', scrollTrigger: { trigger: '.end__word', start: 'top 85%' } });
  $('.again').addEventListener('click', () => lenis.scrollTo('#title', { duration: 3 }));
}

/* =========================================================
   GLOBAL UI
   ========================================================= */
function setupUI() {
  // chapter menu behind the owl
  const menu = $('.menu'), owl = $('.owl'), list = $('ol', menu);
  const numerals = ['', 'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ϛ', 'Ζ', 'Η', 'Θ', 'Ι', 'ΙΑ', 'ΙΒ', 'ΙΓ', 'ΙΔ', 'ΙΕ', 'ΙϚ'];
  $$('.chapter').forEach((ch, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="#${ch.id}"><small>${numerals[i] || i}</small>${ch.dataset.title}</a>`;
    list.appendChild(li);
  });
  let open = false;
  const setMenu = v => {
    open = v; menu.classList.toggle('is-open', v);
    owl.setAttribute('aria-expanded', v); menu.setAttribute('aria-hidden', !v);
    gsap.to(menu, { clipPath: v ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)', duration: 0.9, ease: 'power4.inOut' });
    v ? lock('menu') : unlock('menu');
    if (v) gsap.from($$('li', list), { opacity: 0, y: 20, stagger: 0.03, duration: 0.5, delay: 0.25 });
  };
  owl.addEventListener('click', () => setMenu(!open));
  list.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    e.preventDefault();
    if (!opened) openStory();
    setMenu(false);
    gsap.delayedCall(0.5, () => lenis.scrollTo(a.getAttribute('href'), { duration: 2 }));
  });
  // the owl watches the cursor
  window.addEventListener('pointermove', e => {
    const dx = (e.clientX / window.innerWidth - 0.5) * 3, dy = (e.clientY / window.innerHeight - 0.5) * 3;
    gsap.to('.owl__pupil', { x: dx, y: dy, duration: 0.5 });
  });

  const snd = $('.sound');
  snd.addEventListener('click', () => {
    const on = audio.toggle();
    snd.setAttribute('aria-pressed', on);
    animate(snd, { scale: [0.85, 1], duration: 800, ease: 'outElastic(1, .4)' });
  });

  // videos only play while seen
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    const v = en.target;
    if (en.isIntersecting) v.play().catch(() => {}); else v.pause();
  }), { threshold: 0.15 });
  $$('video').forEach(v => io.observe(v));

  // chapter state + letterbox
  $$('.chapter').forEach(ch => {
    ScrollTrigger.create({
      trigger: ch, start: 'top 55%', end: 'bottom 55%',
      onEnter: () => setChapter(ch), onEnterBack: () => setChapter(ch)
    });
  });
  $$('.imax-key').forEach(ch => {
    ScrollTrigger.create({
      trigger: ch, start: 'top 40%', end: 'bottom 60%',
      onEnter: () => setIMAX(true), onEnterBack: () => setIMAX(true),
      onLeave: () => setIMAX(false), onLeaveBack: () => setIMAX(false)
    });
  });

  // generic parallax for framed works
  mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
    $$('.vase:not(.wreck):not(.giants__strip):not(.vase--cyclops):not(.sirens__sea)').forEach(v => {
      gsap.fromTo(v, { y: 60 }, { y: -60, ease: 'none', scrollTrigger: { trigger: v, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });
}

/* =========================================================
   BOOT
   ========================================================= */
async function boot() {
  setChapter($('#gate'));
  setupText();
  setupMuseums();
  setupGate();
  setupTitle();
  setupTroy();
  setupVoyage();
  setupCyclops();
  setupGiants();
  setupCirce();
  setupUnderworld();
  setupSirens();
  setupStrait();
  setupZeus();
  setupCalypso();
  setupIthaca();
  setupBow();
  setupBed();
  setupEnd();
  setupUI();

  const loaded = await runLoader();
  loaded.eventCallback('onComplete', () => {
    $('#gate video').play().catch(() => {});
    gsap.from('.gate__inner > *', { opacity: 0, y: 30, stagger: 0.12, duration: 1.2, ease: 'power3.out' });
  });
  window.addEventListener('load', () => ScrollTrigger.refresh());
  // lazy images change heights as they arrive; re-measure once they settle
  let t;
  const remeasure = () => { clearTimeout(t); t = setTimeout(() => { ScrollTrigger.refresh(); lenis.resize(); }, 350); };
  $$('img[loading="lazy"]').forEach(img => img.complete || img.addEventListener('load', remeasure, { once: true }));
}

boot();
