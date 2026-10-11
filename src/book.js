import { chapters } from './story.js';

const numbers = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

function illustration(chapter, index) {
  return `<div class="page-running">ИСТОРИЯ ЛАЗУРНОЙ <span>ЧИЛЛИ ХИИЛ</span></div>
    <div class="illustration-window"><img class="story-art" src="${import.meta.env.BASE_URL}assets/story/${chapter.image}.webp" alt="${chapter.subtitle}" draggable="false" />
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

export function createBook(onExit) {
  const root = document.querySelector('#storybook');
  const book = root.querySelector('.book');
  const left = root.querySelector('.page-illustration');
  const right = root.querySelector('.page-reading');
  const previous = root.querySelector('[data-book-previous]');
  const next = root.querySelector('[data-book-next]');
  const progress = root.querySelector('.book-progress');
  const dots = root.querySelector('.book-chapters');
  const stage = root.querySelector('.book-stage');
  const decodedImages = new Map();
  let cameraSide = 0;
  let savedCameraSide = 0;
  let closedCoverRect = null;
  function pan(side, smooth = true) {
    cameraSide = side;
    stage.scrollTo({ left: side * book.clientWidth / 2, behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant' });
    updateNavigation();
  }
  function updateNavigation() {
    previous.disabled = !!turn || (index === 0 && (!compactLayout.matches || cameraSide === 0));
    next.disabled = !!turn || (index === chapters.length - 1 && (!compactLayout.matches || cameraSide === 1));
    previous.querySelector('.nav-caption').textContent = compactLayout.matches ? 'Назад' : 'Предыдущая глава';
    next.querySelector('.nav-caption').textContent = compactLayout.matches ? 'Дальше' : 'Следующая глава';
  }
  function navigate(direction) {
    if (turn || isClosing || !root.classList.contains('reading-ready')) return;
    if (compactLayout.matches && ((direction > 0 && cameraSide === 0) || (direction < 0 && cameraSide === 1))) { pan(direction > 0 ? 1 : 0); return; }
    flip(direction);
  }
  stage.addEventListener('scroll', () => {
    if (!compactLayout.matches || !isOpen || turn) return;
    cameraSide = stage.scrollLeft > book.clientWidth / 4 ? 1 : 0;
    updateNavigation();
  }, { passive: true });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const compactLayout = matchMedia('(max-width: 1100px)');
  function updateReadingHint() {
    root.querySelector('.book-hint').textContent = compactLayout.matches
      ? 'Свайп влево — дальше, вправо — назад. Кружки хранят воспоминания.'
      : 'Листайте стрелками ← → или тяните за край листа. Кружки на рисунках хранят воспоминания.';
  }
  compactLayout.addEventListener('change', updateReadingHint);
  updateReadingHint();
  let index = 0;
  let turn = null;
  let isOpen = false;
  let isClosing = false;
  let drag = null;

  let swipe = null;
  let suppressClickUntil = 0;
  let swipeReadyAt = 0;

  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    if (!compactLayout.matches || !isOpen || isClosing || turn || !event.isPrimary || event.button !== 0) return;
    if (!root.classList.contains('reading-ready') || performance.now() < swipeReadyAt) return;
    swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
  });
  stage.addEventListener('pointermove', (event) => {
    if (!swipe || swipe.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (!swipe.horizontal && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
      swipe = null;
      return;
    }
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      swipe.horizontal = true;
      stage.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
  });
  stage.addEventListener('pointerup', (event) => {
    if (!swipe || swipe.id !== event.pointerId) return;
    const gesture = swipe;
    swipe = null;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (!gesture.horizontal) return;
    suppressClickUntil = performance.now() + 400;
    const dx = event.clientX - gesture.x;
    if (Math.abs(dx) < 28 || turn || isClosing) return;
    swipeReadyAt = performance.now() + 450;
    navigate(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => { swipe = null; });
  stage.addEventListener('lostpointercapture', (event) => {
    if (event.target === stage) swipe = null;
  });
  stage.addEventListener('click', (event) => {
    if (performance.now() >= suppressClickUntil) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  let touchGesture = null;
  function touchCenter(touches) {
    const points = [...touches];
    return { x: points.reduce((sum, point) => sum + point.clientX, 0) / points.length, y: points.reduce((sum, point) => sum + point.clientY, 0) / points.length, spread: points.length > 1 ? Math.hypot(points[0].clientX - points[1].clientX, points[0].clientY - points[1].clientY) : 0 };
  }
  stage.addEventListener('touchstart', (event) => {
    if (!compactLayout.matches || !isOpen || isClosing || turn || !root.classList.contains('reading-ready')) return;
    const point = touchCenter(event.touches);
    touchGesture = { ...point, lastX: point.x, count: event.touches.length, horizontal: false, pinch: false };
  }, { passive: true });
  stage.addEventListener('touchmove', (event) => {
    if (!touchGesture || event.touches.length !== touchGesture.count) return;
    const point = touchCenter(event.touches);
    const dx = point.x - touchGesture.x;
    const dy = point.y - touchGesture.y;
    if (Math.abs(point.spread - touchGesture.spread) > 20) { touchGesture.pinch = true; return; }
    touchGesture.lastX = point.x;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      touchGesture.horizontal = true;
      event.preventDefault();
    }
  }, { passive: false });
  stage.addEventListener('touchend', (event) => {
    if (!touchGesture) return;
    const gesture = touchGesture;
    touchGesture = null;
    if (!gesture.horizontal || gesture.pinch || turn || isClosing) return;
    event.preventDefault();
    suppressClickUntil = performance.now() + 400;
    const dx = gesture.lastX - gesture.x;
    if (Math.abs(dx) >= 28) navigate(dx < 0 ? 1 : -1);
  }, { passive: false });
  stage.addEventListener('touchcancel', () => { touchGesture = null; });

  let wheelDistance = 0;
  let wheelLastAt = 0;
  let wheelUsed = false;
  stage.addEventListener('wheel', (event) => {
    if (!compactLayout.matches || !isOpen || isClosing || event.ctrlKey) return;
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    const now = performance.now();
    if (now - wheelLastAt > 180) { wheelDistance = 0; wheelUsed = false; }
    wheelLastAt = now;
    if (turn || wheelUsed) return;
    const distance = event.deltaX * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientWidth : 1);
    wheelDistance += distance;
    if (Math.abs(wheelDistance) < 45) return;
    wheelUsed = true;
    navigate(wheelDistance > 0 ? 1 : -1);
  }, { passive: false });

  function render() {
    const chapter = chapters[index];
    // Each chapter transfers one sheet from the right block to the left board.
    function stackShadow(sheets) {
      const layers = [];
      for (let sheet = 1; sheet <= sheets; sheet++) {
        layers.push(`0 ${sheet * 2}px 0 ${sheet % 2 ? '#cdbd9e' : '#eee4cf'}`);
      }
      layers.push(`0 ${sheets * 2 + 3}px 0 #264550`);
      layers.push(`0 ${sheets * 2 + 5}px 0 #183640`);
      return layers.join(',');
    }
    book.style.setProperty('--left-stack', stackShadow(index));
    book.style.setProperty('--right-stack', stackShadow(chapters.length - index));
    left.innerHTML = illustration(chapter, index);
    right.innerHTML = reading(chapter, index);
    const cached = decodedImages.get(index);
    if (cached) {
      cached.className = 'story-art';
      cached.alt = chapter.subtitle;
      cached.draggable = false;
      left.querySelector('.story-art').replaceWith(cached);
    }
    root.dataset.mood = chapter.mood;
    root.dataset.chapter = String(index);
    progress.textContent = `${String(index + 1).padStart(2, '0')} / 08`;
    root.querySelector('.grip-left').setAttribute('aria-disabled', String(index === 0));
    root.querySelector('.grip-right').setAttribute('aria-disabled', String(index === chapters.length - 1));
    previous.disabled = index === 0 || !!turn;
    next.disabled = index === chapters.length - 1 || !!turn;
    next.querySelector('.nav-caption').textContent = index === 6 ? 'Счастливый конец' : 'Следующая глава';
    dots.innerHTML = chapters.map((chapter, i) => `<button data-chapter="${i}" aria-label="Глава ${i + 1}: ${chapter.title}" ${i === index ? 'aria-current="step"' : ''}><span>${numbers[i]}</span></button>`).join('');
    updateNavigation();
    root.querySelector('.book-announcement').textContent = `Глава ${index + 1}. ${chapter.title}`;
  }

  function createTurn(direction) {
    const target = index + direction;
    if (turn || !isOpen || isClosing || !root.classList.contains('reading-ready') || target < 0 || target >= chapters.length) return false;
    const oldIndex = index;
    const leaf = document.createElement('div');
    leaf.className = `turn-leaf ${direction > 0 ? 'turn-forward' : 'turn-backward'}`;
    const sourcePage = direction > 0 ? right : left;
    const sourceScroll = sourcePage.scrollTop;
    const face = sourcePage.cloneNode(true);
    face.className = `turn-face turn-front ${direction > 0 ? 'page-reading' : 'page-illustration'}`;

    const back = document.createElement('div');
    back.className = `turn-face turn-back ${direction > 0 ? 'page-illustration' : 'page-reading'}`;
    back.innerHTML = direction > 0 ? illustration(chapters[target], target) : reading(chapters[target], target);
    leaf.append(face, back);
    removeCloneIds(leaf);
    const still = (direction > 0 ? left : right).cloneNode(true);
    still.classList.add('turn-still');
    removeCloneIds(still);
    turn = { leaf, still, direction, oldIndex, target, progress: 0, cameraStart: stage.scrollLeft };
    // The old opposite page remains in place until the turned sheet lands.
    if (direction > 0) right.innerHTML = reading(chapters[target], target);
    else left.innerHTML = illustration(chapters[target], target);
    const width = book.clientWidth / 2;
    const height = book.clientHeight;
    face.style.width = back.style.width = `${width}px`;
    face.style.height = back.style.height = `${height}px`;
    turn.width = width;
    turn.face = face;
    turn.sourceScroll = sourceScroll;
    previous.disabled = next.disabled = true;
    book.append(still, leaf);
    face.scrollTop = sourceScroll;
    root.classList.add('page-turning');
    pose(0);
    dots.inert = true;
    return true;
  }

  function pose(p) {
    if (!turn) return;
    turn.progress = p;
    const direction = turn.direction;
    const curl = Math.sin(p * Math.PI);
    const angle = -direction * p * 180;
    // One continuous surface avoids independently rasterized strip seams.
    turn.leaf.style.setProperty('transform', `rotateY(${angle}deg) skewY(${direction * curl * 1.8}deg)`, 'important');
    turn.leaf.style.setProperty('--fold-shadow', String(curl * .16));
    const edge = [];
    for (let i = 0; i <= 12; i++) {
      const x = i / 12 * 100;
      const bend = Math.sin(i / 12 * Math.PI) * curl * 1.3;
      edge.push(`${x}% ${bend}%`);
    }
    for (let i = 12; i >= 0; i--) {
      const x = i / 12 * 100;
      const bend = Math.sin(i / 12 * Math.PI) * curl * 1.3;
      edge.push(`${x}% ${100 - bend}%`);
    }
    turn.face.style.clipPath = `polygon(${edge.join(',')})`;
    // Never reveal the incoming illustration underneath the old illustration.
    turn.still.style.opacity = '1';
  }

  async function settle(commit) {
    if (!turn) return;
    const current = turn;
    const from = current.progress;
    const to = commit ? 1 : 0;
    if (!reducedMotion.matches) {
      const start = performance.now();
      const duration = Math.max(220, Math.abs(to - from) * 940);
      await new Promise((resolve) => {
        function tick(now) {
          const p = Math.min((now - start) / duration, 1);
          const eased = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          const position = from + (to - from) * eased;
          pose(position);
          if (compactLayout.matches) {
            const destination = current.direction > 0 ? 0 : current.width;
            stage.scrollLeft = current.cameraStart + (destination - current.cameraStart) * position;
          }
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
    root.classList.remove('page-turning');
    current.leaf.remove();
    current.still.remove();
    index = commit ? current.target : current.oldIndex;
    turn = null;
    if (compactLayout.matches) cameraSide = current.direction > 0 ? 0 : 1;
    dots.inert = false;
    render();
    if (compactLayout.matches) { pan(current.direction > 0 ? 0 : 1, false); right.scrollTop = 0; }
  }

  async function flip(direction) {
    if (!createTurn(direction)) return;
    await settle(true);
  }

  async function preload() {
    await Promise.all(chapters.map(async (chapter, i) => {
      if (decodedImages.has(i)) return;
      const img = new Image();
      img.src = `${import.meta.env.BASE_URL}assets/story/${chapter.image}.webp`;
      await img.decode();
      decodedImages.set(i, img);
    }));
    render();
  }

  function approach() {
    root.hidden = false;
    root.inert = true;
    root.classList.remove('book-open', 'book-closing', 'book-returning', 'reading-ready');
    root.classList.add('book-closed');
    index = 0;
    savedCameraSide = 0;
    render();
    root.classList.add('book-arriving');
  }

  function arrive() {
    root.inert = false;
    root.querySelector('.book-cover').focus({ preventScroll: true });
    setPagesInert(true);
  }

  function setPagesInert(value) {
    left.inert = right.inert = value;
    root.querySelector('.book-footer').inert = value;
    root.querySelectorAll('.page-grip').forEach(grip => { grip.inert = value; });
  }

  async function animateCompactCover(opening) {
    const cover = root.querySelector('.book-cover');
    const ghost = cover.cloneNode(true);
    ghost.className = 'cover-transition book-cover';
    ghost.removeAttribute('data-book-open');
    ghost.inert = true;
    ghost.setAttribute('aria-hidden', 'true');
    const rect = closedCoverRect;
    Object.assign(ghost.style, { position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, minHeight: '0', zIndex: '25', visibility: 'visible', transformOrigin: 'left center', transition: 'none' });
    root.classList.add('cover-flight');
    root.append(ghost);
    const frames = [
      { transform: 'perspective(1500px) rotateY(0deg)', opacity: 1, offset: 0 },
      { transform: 'perspective(1500px) rotateY(-95deg)', opacity: 1, offset: .65 },
      { transform: 'perspective(1500px) rotateY(-150deg)', opacity: 0, offset: 1 },
    ];
    const options = { duration: 1300, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' };
    const zoom = [{ transform: 'translateY(45px) scale(.78)', opacity: .35 }, { transform: 'translateY(0) scale(1)', opacity: 1 }];
    await Promise.all([
      ghost.animate(opening ? frames : [{transform:'perspective(1500px) rotateY(-85deg)',opacity:1},{transform:'perspective(1500px) rotateY(0deg)',opacity:1}], options).finished,
      stage.animate(zoom, { ...options, direction: opening ? 'normal' : 'reverse', fill: 'none' }).finished,
    ]);
    ghost.remove();
    root.classList.remove('cover-flight');
  }

  async function open() {
    if (isOpen || isClosing || root.inert) return;
    await left.querySelector('.story-art').decode();
    if (isOpen || isClosing || root.inert) return;
    const cover = root.querySelector('.book-cover');
    closedCoverRect = cover.getBoundingClientRect();
    root.classList.remove('book-closed', 'book-closing');
    root.hidden = false;
    root.inert = false;
    isOpen = true;
    root.classList.add('book-open');
    if (compactLayout.matches) { root.classList.add('artwork-ready'); pan(savedCameraSide, false); }
    root.querySelector('.book-close').focus({ preventScroll: true });
    cover.getBoundingClientRect();
    if (compactLayout.matches && !reducedMotion.matches) await animateCompactCover(true);
    await Promise.allSettled(cover.getAnimations().map(animation => animation.finished));
    if (!isOpen || isClosing) return;
    await left.querySelector('.story-art').decode();
    root.classList.add('reading-ready');
    if (compactLayout.matches) pan(savedCameraSide, false);
    setPagesInert(false);
  }

  async function close() {
    if (!isOpen || turn || isClosing) return;
    isClosing = true;
    root.inert = true;
    savedCameraSide = cameraSide;
    root.querySelectorAll('.memory-point.open').forEach(point => point.classList.remove('open'));
    if (compactLayout.matches && !reducedMotion.matches) await animateCompactCover(false);
    root.classList.add('book-closing');
    root.classList.remove('book-open', 'reading-ready', 'artwork-ready');
    if (!reducedMotion.matches) {
      await Promise.allSettled(root.querySelector('.book-cover').getAnimations().map((a) => a.finished));
    }
    isOpen = false;
    root.inert = false;
    root.classList.remove('book-closing');
    root.classList.add('book-closed');
    setPagesInert(true);
    isClosing = false;
    root.querySelector('.book-cover').focus({ preventScroll: true });
  }

  async function exit() {
    if (turn || isClosing) return;
    if (isOpen) await close();
    root.inert = true;
    await onExit();
  }

  function hide() {
    root.hidden = true;
    root.classList.remove('book-arriving', 'book-returning');
  }

  left.addEventListener('click', (event) => {
    if (!compactLayout.matches && index === 0 && isOpen && !turn && !event.target.closest('button')) close();
  });

  left.addEventListener('pointerenter', () => book.classList.add('hover-left'));
  left.addEventListener('pointerleave', () => book.classList.remove('hover-left'));
  right.addEventListener('pointerenter', () => book.classList.add('hover-right'));
  right.addEventListener('pointerleave', () => book.classList.remove('hover-right'));

  previous.addEventListener('click', () => navigate(-1));
  next.addEventListener('click', () => navigate(1));
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-book-open]')) open();
    if (event.target.closest('[data-book-close]')) close();
    if (event.target.closest('[data-book-exit]')) exit();
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
      const commit = movement >= -8 || speed > .35;
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
    if (event.key === 'ArrowRight') { event.preventDefault(); navigate(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); navigate(-1); }
    if (event.key === 'Escape') {
      const openedMemory = root.querySelector('.memory-point.open');
      if (openedMemory) openedMemory.classList.remove('open');
      else close();
    }
  });
  render();
  return { preload, approach, arrive, open, close, exit, hide };
}
