import { createBook } from './book.js';
import { createWorld } from './world.js';

const experience = document.querySelector('#experience');
const status = document.querySelector('.travel-status');
const homeControls = document.querySelectorAll('.header, .hero, .footer, .island-label, .chapter-rail');
const intro = document.querySelector('.intro-curtain');
const dialogs = document.querySelectorAll('dialog');
let world;
let travelling = false;
let place = 'threshold';

function setHomeInert(inert) {
  homeControls.forEach((element) => { element.inert = inert; });
}

async function revealWorld() {
  experience.classList.add('ready');
  await new Promise(requestAnimationFrame);
  intro.classList.add('opening');
  await Promise.allSettled(intro.getAnimations({ subtree: true }).map((animation) => animation.finished));
  intro.remove();
  setHomeInert(false);
}

const veil = document.querySelector('.cloud-veil');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

async function passClouds(changeScene) {
  veil.hidden = false;
  veil.style.opacity = '1';
  experience.classList.add('in-flight');
  const duration = reducedMotion.matches ? 500 : 2800;
  const portrait = matchMedia('(max-width: 1100px) and (orientation: portrait)').matches;
  const animations = [...veil.querySelectorAll('.veil-cloud')].map((cloud, i) => {
    const direction = i % 2 ? -1 : 1;
    const rotation = i === 1 ? 180 : 0;
    const scale = (portrait ? [1, 1.04, 1.08] : [1.08, 1.2, 1.32])[i];
    const y = (portrait ? [4, -4, 0] : [12, -14, 0])[i];
    const blur = portrait ? i * .5 : i * 2;
    return cloud.animate([
      { offset: 0, transform: `translate3d(${-direction * 130}%,${y}%,0) scale(${scale}) rotate(${rotation}deg)`, filter: `blur(${blur}px)` },
      { offset: .42, transform: `translate3d(${-direction * 12}%,${y}%,0) scale(${scale}) rotate(${rotation}deg)`, filter: `blur(${blur}px)` },
      { offset: .58, transform: `translate3d(${direction * 12}%,${y - 2}%,0) scale(${scale}) rotate(${rotation}deg)`, filter: `blur(${blur}px)` },
      { offset: 1, transform: `translate3d(${direction * 130}%,${y - 8}%,0) scale(${scale}) rotate(${rotation}deg)`, filter: `blur(${blur}px)` },
    ], { duration, easing: 'linear', fill: 'forwards' });
  });
  await new Promise(resolve => {
    function watch() {
      if (Number(animations[0].currentTime) >= duration * .48) resolve();
      else requestAnimationFrame(watch);
    }
    requestAnimationFrame(watch);
  });
  await changeScene();
  experience.classList.remove('in-flight', 'castle-flight');
  await Promise.all(animations.map(animation => animation.finished));
  veil.hidden = true;
  animations.forEach(animation => animation.cancel());
}

function flyTo(destination, onApproach, duration) {
  return new Promise(resolve => {
    if (!world) { onApproach?.(); resolve(); return; }
    world.goTo(destination, resolve, onApproach, duration ?? (destination === 'book' ? 3.1 : 2.1));
  });
}

const book = createBook(async () => {
  if (travelling) return;
  travelling = true;
  const flight = flyTo('threshold', undefined, reducedMotion.matches ? .15 : 1.2);
  await passClouds(async () => {
    await flight;
    book.hide();
    place = 'threshold';
    experience.dataset.place = place;
  });
  travelling = false;
  setHomeInert(false);
  document.querySelector('.hero [data-action="journey"]').focus({ preventScroll: true });
});

async function enterStory() {
  if (travelling || place !== 'threshold') return;
  dialogs.forEach(dialog => dialog.close());
  travelling = true;
  setHomeInert(true);
  status.textContent = 'ГОТОВИМ ИСТОРИЮ';
  status.style.opacity = '1';
  await book.preload();
  status.style.opacity = '0';
  experience.classList.add('castle-flight');
  let approach;
  const nearingCastle = new Promise(resolve => { approach = resolve; });
  const flight = flyTo('book', approach);
  await nearingCastle;
  await passClouds(async () => {
    place = 'book';
    experience.dataset.place = place;
    book.approach();
    await new Promise(requestAnimationFrame);
  });
  await flight;
  travelling = false;
  book.arrive();
}

function closeDialogs() {
  dialogs.forEach((dialog) => dialog.close());
}

document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'journey') enterStory();
  if (action === 'about') document.querySelector('#about-dialog').showModal();
  if (action === 'home' && place === 'book') book.exit();
});
document.querySelectorAll('.dialog-close').forEach((button) => button.addEventListener('click', closeDialogs));
dialogs.forEach((dialog) => dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));

setHomeInert(true);
createWorld(document.querySelector('#world'), () => {})
  .then(async (created) => { world = created; await revealWorld(); book.preload(); })
  .catch((error) => {
    console.error('Не удалось открыть небо:', error);
    document.querySelector('.render-fallback').hidden = false;
    revealWorld();
  });
