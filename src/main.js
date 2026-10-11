import { createBook } from './book.js';
import { chapters } from './story.js';
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

const book = createBook(async () => {
  travelling = true;
  status.textContent = 'ВОЗВРАЩАЕМСЯ К ОБЛАКАМ';
  await new Promise((resolve) => {
    if (!world) { resolve(); return; }
    world.goTo('threshold', resolve);
  });
  place = 'threshold';
  experience.dataset.place = place;
  status.textContent = '';
  document.querySelector('.flight-wash').style.opacity = '0';
  travelling = false;
  setHomeInert(false);
  document.querySelector('.hero [data-action="journey"]').focus({ preventScroll: true });
});

async function enterStory() {
  if (travelling || place !== 'threshold') return;
  dialogs.forEach((dialog) => dialog.close());
  travelling = true;
  setHomeInert(true);
  status.textContent = 'У КАЖДОЙ ЛЕГЕНДЫ БЫЛ ДОМ';
  status.style.opacity = '1';
  await book.preload();
  place = 'book';
  experience.dataset.place = place;
  if (world) {
    await new Promise((resolve) => world.goTo('book', resolve, () => book.approach()));
  } else book.approach();
  book.open();
  status.style.opacity = '0';
  travelling = false;
}

function closeDialogs() {
  dialogs.forEach((dialog) => dialog.close());
}

document.querySelector('.contents-list').innerHTML = chapters.map((chapter, i) => `<div><span>${String(i + 1).padStart(2, '0')}</span><span>${chapter.title}</span></div>`).join('');
document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'journey') enterStory();
  if (action === 'chapters') document.querySelector('#chapters-dialog').showModal();
  if (action === 'about') document.querySelector('#about-dialog').showModal();
  if (action === 'home' && place === 'book') book.close();
});
document.querySelector('.brand').addEventListener('click', (event) => {
  event.preventDefault();
  if (place === 'book') book.close();
});
document.querySelectorAll('.dialog-close').forEach((button) => button.addEventListener('click', closeDialogs));
dialogs.forEach((dialog) => dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));
document.querySelector('.island-label').addEventListener('pointerenter', () => world?.setHover(true));
document.querySelector('.island-label').addEventListener('pointerleave', () => world?.setHover(false));

setHomeInert(true);
createWorld(document.querySelector('#world'), () => {})
  .then(async (created) => { world = created; await revealWorld(); book.preload(); })
  .catch((error) => {
    console.error('Не удалось открыть небо:', error);
    document.querySelector('.render-fallback').hidden = false;
    revealWorld();
  });
