import { chapters } from './story.js';

const numbers = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

function illustration(chapter, index) {
  return `<div class="page-running">ИСТОРИЯ ЛАЗУРНОЙ <span>ЧИЛЛИ ХИИЛ</span></div>
    <div class="illustration-window"><img class="story-art" src="/assets/story/${chapter.image}.webp" alt="${chapter.subtitle}" draggable="false" />
    ${chapter.memories.map((memory, i) => `<button class="memory-point" style="--x:${memory.x}%;--y:${memory.y}%" aria-label="Воспоминание: ${memory.title}" aria-describedby="memory-${index}-${i}"><span class="memory-mark">${i + 1}</span><span class="memory-tooltip" role="tooltip" id="memory-${index}-${i}"><strong>${memory.title}</strong>${memory.text}</span></button>`).join('')}</div>
    <div class="illustration-caption"><span>✧</span>${chapter.subtitle}<span>✧</span></div>
    <span class="page-number">${index * 2 + 1}</span>`;
}

function reading(chapter, index) {
  return `<div class="page-running">КНИГА ПЕРВАЯ <span>ГЛАВА ${numbers[index]}</span></div>
    <div class="chapter-copy"><p class="chapter-kicker">ГЛАВА ${numbers[index]} <span>—</span> ${index === 7 ? 'ЭПИЛОГ' : 'ВОСПОМИНАНИЕ'}</p><h2 id="chapter-title">${chapter.title}</h2><div class="chapter-ornament" aria-hidden="true">──── ❦ ────</div>
    <div class="chapter-text">${chapter.paragraphs.map((p) => `<p>${p}</p>`).join('')}</div>
    <blockquote>${chapter.quote}</blockquote>${index === 7 ? '<div class="happy-heart" aria-label="Счастливый конец">♡</div><button class="final-close" data-book-close>Закрыть эту историю <span>↗</span></button>' : ''}</div>
    <span class="page-number">${index * 2 + 2}</span>`;
}

function removeCloneIds(element) {
  element.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  element.inert = true;
  element.setAttribute('aria-hidden', 'true');
}

export function createBook(onClose) {
  const root = document.querySelector('#storybook');
  const book = root.querySelector('.book');
  const left = root.querySelector('.page-illustration');
  const right = root.querySelector('.page-reading');
  const previous = root.querySelector('[data-book-previous]');
  const next = root.querySelector('[data-book-next]');
  const progress = root.querySelector('.book-progress');
  const dots = root.querySelector('.book-chapters');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let turn = null;
  let isOpen = false;
  let isClosing = false;
  let drag = null;

  function render() {
    const chapter = chapters[index];
    left.innerHTML = illustration(chapter, index);
    right.innerHTML = reading(chapter, index);
    root.dataset.mood = chapter.mood;
    root.dataset.chapter = String(index);
    progress.textContent = `${String(index + 1).padStart(2, '0')} / 08`;
    root.querySelector('.grip-left').setAttribute('aria-disabled', String(index === 0));
    root.querySelector('.grip-right').setAttribute('aria-disabled', String(index === chapters.length - 1));
    previous.disabled = index === 0 || !!turn;
    next.disabled = index === chapters.length - 1 || !!turn;
    next.querySelector('.nav-caption').textContent = index === 6 ? 'Счастливый конец' : 'Следующая глава';
    dots.innerHTML = chapters.map((chapter, i) => `<button data-chapter="${i}" aria-label="Глава ${i + 1}: ${chapter.title}" ${i === index ? 'aria-current="step"' : ''}><span>${numbers[i]}</span></button>`).join('');
    root.querySelector('.book-announcement').textContent = `Глава ${index + 1}. ${chapter.title}`;
  }

  function createTurn(direction) {
    const target = index + direction;
    if (turn || !isOpen || isClosing || target < 0 || target >= chapters.length) return false;
    const oldIndex = index;
    const leaf = document.createElement('div');
    leaf.className = `turn-leaf ${direction > 0 ? 'turn-forward' : 'turn-backward'}`;
    const face = document.createElement('div');
    face.className = `turn-face turn-front ${direction > 0 ? 'page-reading' : 'page-illustration'}`;
    face.innerHTML = direction > 0 ? reading(chapters[index], index) : illustration(chapters[index], index);
    const back = document.createElement('div');
    back.className = `turn-face turn-back ${direction > 0 ? 'page-illustration' : 'page-reading'}`;
    back.innerHTML = direction > 0 ? illustration(chapters[target], target) : reading(chapters[target], target);
    leaf.append(face, back);
    removeCloneIds(leaf);
    const still = (direction > 0 ? left : right).cloneNode(true);
    still.classList.add('turn-still');
    removeCloneIds(still);
    turn = { leaf, still, direction, oldIndex, target, progress: 0 };
    // The old opposite page remains in place until the turned sheet lands.
    if (direction > 0) right.innerHTML = reading(chapters[target], target);
    else left.innerHTML = illustration(chapters[target], target);
    const width = book.clientWidth / 2;
    const height = book.clientHeight;
    const slices = [];
    const count = 20;
    for (let i = 0; i < count; i++) {
      const slice = document.createElement('div');
      slice.className = 'paper-slice';
      slice.style.width = `${width / count + .7}px`;
      slice.style.transformOrigin = direction > 0 ? 'left center' : 'right center';
      for (const [side, original] of [['front', face], ['back', back]]) {
        const surface = document.createElement('div');
        surface.className = `slice-surface slice-${side}`;
        const content = original.cloneNode(true);
        content.style.width = `${width}px`;
        content.style.height = `${height}px`;
        const offset = side === 'front' ? i : count - 1 - i;
        const column = direction > 0 ? offset : count - 1 - offset;
        content.style.left = `${-column * width / count}px`;
        surface.append(content);
        slice.append(surface);
      }
      slices.push(slice);
      leaf.append(slice);
    }
    face.remove();
    back.remove();
    removeCloneIds(leaf);
    turn.slices = slices;
    turn.width = width;
    previous.disabled = next.disabled = true;
    book.append(still, leaf);
    pose(0);
    dots.inert = true;
    return true;
  }

  function pose(p) {
    if (!turn) return;
    turn.progress = p;
    const direction = turn.direction;
    const step = turn.width / turn.slices.length;
    const curl = Math.sin(p * Math.PI) * .85;
    let x = 0;
    let z = 0;
    turn.slices.forEach((slice, i) => {
      const u = (i + .5) / turn.slices.length;
      const angle = -direction * p * Math.PI + direction * curl * (u - .2);
      const leftEdge = direction > 0 ? x : turn.width - x - step;
      slice.style.transform = `translate3d(${leftEdge}px,0,${z}px) rotateY(${angle * 180 / Math.PI}deg)`;
      slice.style.setProperty('--fold-shadow', String(Math.min(.32, Math.abs(Math.sin(angle)) * .16 + curl * u * .12)));
      x += Math.cos(angle) * step;
      z -= direction * Math.sin(angle) * step;
    });
    // Never reveal the incoming illustration underneath the old illustration.
    turn.still.style.opacity = '1';
  }

  async function settle(commit) {
    if (!turn) return;
    const current = turn;
    const from = current.progress;
    const to = commit ? 1 : 0;
    if (!reducedMotion.matches && innerWidth >= 700) {
      const start = performance.now();
      const duration = Math.max(220, Math.abs(to - from) * 940);
      await new Promise((resolve) => {
        function tick(now) {
          const p = Math.min((now - start) / duration, 1);
          const eased = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          pose(from + (to - from) * eased);
          if (p < 1) requestAnimationFrame(tick);
          else resolve();
        }
        requestAnimationFrame(tick);
      });
    } else {
      current.leaf.style.display = 'none';
      current.still.style.display = 'none';
      await right.animate([{ opacity: .3 }, { opacity: 1 }], { duration: reducedMotion.matches ? 120 : 350 }).finished;
    }
    current.leaf.remove();
    current.still.remove();
    index = commit ? current.target : current.oldIndex;
    turn = null;
    dots.inert = false;
    render();
  }

  async function flip(direction) {
    if (!createTurn(direction)) return;
    await settle(true);
  }

  function preload() {
    return Promise.allSettled(chapters.map((chapter) => {
      const img = new Image();
      img.src = `/assets/story/${chapter.image}.webp`;
      return img.decode();
    }));
  }

  function approach() {
    root.hidden = false;
    root.inert = true;
    root.classList.remove('book-open', 'book-closing', 'book-returning');
    index = 0;
    render();
    root.classList.add('book-arriving');
  }

  function open() {
    root.hidden = false;
    root.inert = false;
    isOpen = true;
    root.classList.add('book-open');
    root.querySelector('.book-close').focus({ preventScroll: true });
  }

  async function close() {
    if (!isOpen || turn || isClosing) return;
    isClosing = true;
    root.inert = true;
    root.classList.add('book-closing');
    root.classList.remove('book-open');
    if (!reducedMotion.matches) {
      await Promise.allSettled(root.querySelector('.book-cover').getAnimations().map((a) => a.finished));
    }
    isOpen = false;
    root.classList.add('book-returning');
    await onClose();
    root.hidden = true;
    root.classList.remove('book-arriving', 'book-closing');
    isClosing = false;
  }

  previous.addEventListener('click', () => flip(-1));
  next.addEventListener('click', () => flip(1));
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-book-close]')) close();
    const memory = event.target.closest('.memory-point');
    if (memory) {
      root.querySelectorAll('.memory-point.open').forEach((point) => { if (point !== memory) point.classList.remove('open'); });
      memory.classList.toggle('open');
    }
    const chapter = event.target.closest('.book-chapters [data-chapter]');
    if (chapter && !turn && isOpen) {
      const target = Number(chapter.dataset.chapter);
      if (Math.abs(target - index) === 1) flip(target - index);
      else { index = target; render(); }
    }
  });
  root.querySelectorAll('.page-grip').forEach((grip) => {
    const direction = Number(grip.dataset.direction);
    grip.addEventListener('click', (event) => { if (event.detail === 0) flip(direction); });
    grip.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !createTurn(direction)) return;
      grip.setPointerCapture(event.pointerId);
      drag = { start: event.clientX, direction, time: performance.now(), settling: false };
    });
    grip.addEventListener('pointermove', (event) => {
      if (!drag || drag.settling || !grip.hasPointerCapture(event.pointerId)) return;
      const width = book.getBoundingClientRect().width / 2;
      const movement = (drag.start - event.clientX) * direction;
      pose(Math.min(Math.max(movement / width, 0), .99));
    });
    grip.addEventListener('pointerup', async (event) => {
      if (!drag || drag.settling || !turn) return;
      drag.settling = true;
      const movement = (drag.start - event.clientX) * direction;
      const speed = movement / Math.max(performance.now() - drag.time, 1);
      const commit = turn.progress > .18 || speed > .35 || Math.abs(movement) < 5;
      await settle(commit);
      drag = null;
    });
    grip.addEventListener('lostpointercapture', () => {
      if (drag && !drag.settling && turn) {
        drag.settling = true;
        settle(false).then(() => { drag = null; });
      }
    });
    grip.addEventListener('pointercancel', () => {
      if (drag && !drag.settling && turn) { drag.settling = true; settle(false).then(() => { drag = null; }); }
    });
  });
  document.addEventListener('keydown', (event) => {
    if (!isOpen || root.hidden || root.inert) return;
    if (event.key === 'Tab') {
      const controls = [...root.querySelectorAll('button:not(:disabled)')].filter(node => !node.closest('[inert]') && node.getClientRects().length);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    if (event.key === 'ArrowRight') { event.preventDefault(); flip(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); flip(-1); }
    if (event.key === 'Escape') {
      const openedMemory = root.querySelector('.memory-point.open');
      if (openedMemory) openedMemory.classList.remove('open');
      else close();
    }
  });
  render();
  return { preload, approach, open, close };
}
