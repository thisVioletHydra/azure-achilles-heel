import { createWorld } from './world.js';

const experience = document.querySelector('#experience');
const arrival = document.querySelector('.arrival');
const status = document.querySelector('.travel-status');
const dialogs = document.querySelectorAll('dialog');
const travelButtons = document.querySelectorAll('[data-action="journey"], [data-action="left"], [data-action="right"]');
const intro = document.querySelector('.intro-curtain');
const introControls = document.querySelectorAll('.header, .hero, .footer, .island-label, .chapter-rail');
let world;
let travelling = false;
let filmTimer;
let filmPlaying = false;

async function revealWorld() {
  experience.classList.add('ready');
  await new Promise(requestAnimationFrame);
  intro.classList.add('opening');
  await Promise.allSettled(intro.getAnimations({ subtree: true }).map((animation) => animation.finished));
  intro.remove();
  introControls.forEach((element) => { element.inert = false; });
}

const chapters = {
  arrival: { eyebrow: 'CHAPTER II — THE ARRIVAL', title: 'Stay a little.<br/><em>The sky can wait.</em>', description: 'You made it to the heart of Aetheria.<br/>Take a breath. Then follow your curiosity.', chapter: 1 },
  left: { eyebrow: 'CHAPTER III — THE OBSERVATORY', title: 'A little closer<br/><em>to infinity.</em>', description: 'The stars have been waiting for you.<br/>Watch the heavens turn, one quiet moment at a time.', chapter: 2 },
  right: { eyebrow: 'CHAPTER III — THE QUIET GARDEN', title: 'Nowhere to be.<br/><em>Nothing to prove.</em>', description: 'Listen to the water. Let the light find you.<br/>Some journeys end exactly where you need them to.', chapter: 2 },
};

function setTravelButtonsDisabled(disabled) {
  document.querySelectorAll('[data-action="home"], [data-action="journey"], [data-action="left"], [data-action="right"]').forEach((button) => {
    if (button.tagName === 'BUTTON') button.disabled = disabled;
  });
}

function closeDialogs() {
  dialogs.forEach((dialog) => dialog.close());
}

function stopFilm() {
  clearTimeout(filmTimer);
  filmPlaying = false;
  world?.setCinematic(false);
  document.querySelector('.film-button').innerHTML = '<span class="play-icon">▷</span> A glimpse of Azure <span class="film-time">01:24</span>';
}

function goTo(place, { fromTour = false } = {}) {
  if (!world || travelling) return;
  if (!fromTour) stopFilm();
  closeDialogs();
  const previous = world.getPlace();
  if (previous === place) return;
  travelling = true;
  setTravelButtonsDisabled(true);
  arrival.hidden = true;
  experience.dataset.place = place;
  document.querySelectorAll('.hero, .footer, .island-label').forEach((element) => {
    element.inert = place !== 'threshold';
    element.setAttribute('aria-hidden', String(place !== 'threshold'));
  });
  status.textContent = place === 'threshold' ? 'THE CLOUDS ARE CALLING YOU HOME' : previous === 'threshold' ? 'LEAVING THE ORDINARY BEHIND' : 'FOLLOWING YOUR WONDER';
  status.style.opacity = '1';
  document.querySelectorAll('.chapter').forEach((button, i) => button.classList.toggle('active', i === (chapters[place]?.chapter ?? 0)));
  world.goTo(place, () => {
    travelling = false;
    setTravelButtonsDisabled(false);
    status.style.opacity = '0';
    if (place === 'threshold') {
      document.querySelector('.hero [data-action="journey"]').focus({ preventScroll: true });
      return;
    }
    const chapter = chapters[place];
    document.querySelector('#arrival-title').innerHTML = chapter.title;
    document.querySelector('#arrival-eyebrow').textContent = chapter.eyebrow;
    document.querySelector('#arrival-description').innerHTML = chapter.description;
    document.querySelector('.path-options').innerHTML = place === 'arrival'
      ? '<button data-action="left"><span>↖</span><span>The observatory<small>FOLLOW THE STARS</small></span></button><button data-action="right"><span>↗</span><span>The quiet garden<small>FOLLOW THE LIGHT</small></span></button>'
      : '<button data-action="journey"><span>↙</span><span>The pavilion<small>BACK TO THE HEART OF AETHERIA</small></span></button><button data-action="' + (place === 'left' ? 'right' : 'left') + '"><span>↗</span><span>' + (place === 'left' ? 'The quiet garden' : 'The observatory') + '<small>THERE’S MORE TO DISCOVER</small></span></button>';
    arrival.hidden = false;
    document.querySelector('#arrival-title').setAttribute('tabindex', '-1');
    document.querySelector('#arrival-title').focus({ preventScroll: true });
  });
}

function playFilm() {
  if (!world || travelling) return;
  world.setCinematic(true);
  filmPlaying = true;
  document.querySelector('.film-button').innerHTML = '<span class="play-icon">Ⅱ</span> Return to your journey';
  const shots = [['arrival', 4500], ['left', 18000], ['right', 38000], ['threshold', 70000]];
  const started = performance.now();
  let index = 0;
  function nextShot() {
    const [place, when] = shots[index];
    filmTimer = setTimeout(() => {
      goTo(place, { fromTour: true });
      world.setCinematic(true);
      index++;
      if (index < shots.length) nextShot();
      else filmTimer = setTimeout(stopFilm, 14000);
    }, Math.max(0, when - (performance.now() - started)));
  }
  nextShot();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'home') goTo('threshold');
  if (action === 'journey') goTo('arrival');
  if (action === 'left') goTo('left');
  if (action === 'right') goTo('right');
  if (action === 'realms') document.querySelector('#realms-dialog').showModal();
  if (action === 'story') document.querySelector('#story-dialog').showModal();
  if (action === 'film') {
    if (filmPlaying) stopFilm();
    else playFilm();
  }
});
document.querySelector('.brand').addEventListener('click', (event) => { event.preventDefault(); goTo('threshold'); });
document.querySelectorAll('.dialog-close').forEach((button) => button.addEventListener('click', closeDialogs));
dialogs.forEach((dialog) => dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));
document.addEventListener('keydown', (event) => {
  if (document.querySelector('dialog[open]')) return;
  if (event.key === 'Escape') { stopFilm(); goTo('threshold'); }
  if (event.key === 'ArrowLeft' && world?.getPlace() !== 'threshold') goTo('left');
  if (event.key === 'ArrowRight' && world?.getPlace() !== 'threshold') goTo('right');
});
document.querySelector('.island-label').addEventListener('pointerenter', () => world?.setHover(true));
document.querySelector('.island-label').addEventListener('pointerleave', () => world?.setHover(false));


setTravelButtonsDisabled(true);
introControls.forEach((element) => { element.inert = true; });
createWorld(document.querySelector('#world'), () => {})
  .then(async (created) => {
    world = created;
    await revealWorld();
    setTravelButtonsDisabled(false);
  })
  .catch((error) => {
    console.error('Azure could not initialize:', error);
    revealWorld();
    document.querySelector('.render-fallback').hidden = false;
    travelButtons.forEach((button) => { button.disabled = true; });
  });
