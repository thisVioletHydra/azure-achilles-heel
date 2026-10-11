import { chapters } from './story.js';

const numbers = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

function illustration(chapter, index) {
  return `<div class="page-running">ИСТОРИЯ ЛАЗУРНОЙ <span>ЧИЛЛИ ХИИЛ</span></div>
    <div class="illustration-window"><img class="story-art" src="${import.meta.env.BASE_URL}assets/story/${chapter.image}.webp" alt="${chapter.subtitle}" draggable="false" />
    ${chapter.memories.map((memory, i) => `<button class="memory-point${memory.y < 40 ? ' memory-below' : ''}" style="--x:${memory.x}%;--y:${memory.y}%" aria-label="Воспоминание: ${memory.title}" aria-describedby="memory-${index}-${i}"><span class="memory-mark">${i + 1}</span><span class="memory-tooltip" role="tooltip" id="memory-${index}-${i}"><strong>${memory.title}</strong>${memory.text}</span></button>`).join('')}</div>
    <div class="illustration-caption"><span>✧</span>${chapter.subtitle}<span>✧</span></div>
    <span class="page-number">${index * 2 + 1}</span>`;
}

function reading(chapter, index) {
  return `<div class="page-running">КНИГА ПЕРВАЯ <span>ГЛАВА ${numbers[index]}</span></div>
    <div class="chapter-copy"><p class="chapter-kicker">ГЛАВА ${numbers[index]} <span>—</span> ${index === 7 ? 'ЭПИЛОГ' : 'ВОСПОМИНАНИЕ'}</p><h2 id="chapter-title">${chapter.title}</h2><div class="chapter-ornament" aria-hidden="true">──── ❦ ────</div>
    <div class="chapter-text">${chapter.paragraphs.map((p) => `<p>${p}</p>`).join('')}</div>
    <blockquote>${chapter.quote}</blockquote>${index === 7 ? '<div class="happy-heart" aria-label="Счастливый конец">♡</div><button class="final-close" data-book-close>Закрыть эту историю <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></button>' : ''}</div>
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
  const reader = { phase: 'closed', chapter: 0, side: 0, turn: null, drag: null, gesture: null };
  const transitions = {
    closed: ['opening'],
    opening: ['idle'],
    idle: ['gesturing', 'panning', 'turning', 'closing'],
    gesturing: ['idle'],
    panning: ['idle'],
    turning: ['idle'],
    closing: ['closed'],
  };
  function transition(phase) {
    if (!transitions[reader.phase].includes(phase)) return false;
    reader.phase = phase;
    root.dataset.readerState = phase;
    updateNavigation();
    return true;
  }
  function isOpen() {
    return reader.phase !== 'closed' && reader.phase !== 'closing';
  }
  let closedCoverRect = null;
  let closedCoverFrame = null;
  async function pan(side, smooth = true) {
    const destination = side * book.clientWidth / 2;
    if (!smooth || reducedMotion.matches) {
      reader.side = side;
      stage.scrollTo({ left: destination, behavior: 'instant' });
      updateNavigation();
      return;
    }
    if (!transition('panning')) return;
    const origin = stage.scrollLeft;
    const startedAt = performance.now();
    await new Promise(resolve => {
      function tick(now) {
        const progress = Math.min((now - startedAt) / 420, 1);
        const eased = progress * progress * (3 - 2 * progress);
        stage.scrollTo({ left: origin + (destination - origin) * eased, behavior: 'instant' });
        if (progress < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
    reader.side = side;
    stage.scrollTo({ left: destination, behavior: 'instant' });
    transition('idle');
  }
  function updateNavigation() {
    const busy = reader.phase !== 'idle';
    previous.disabled = busy || (reader.chapter === 0 && (!compactLayout.matches || reader.side === 0));
    next.disabled = busy || (reader.chapter === chapters.length - 1 && (!compactLayout.matches || reader.side === 1));
    previous.querySelector('.nav-caption').textContent = compactLayout.matches ? 'Назад' : 'Предыдущая глава';
    next.querySelector('.nav-caption').textContent = compactLayout.matches ? 'Дальше' : 'Следующая глава';
  }
  function navigate(direction) {
    if (reader.phase !== 'idle') return;
    if (compactLayout.matches && ((direction > 0 && reader.side === 0) || (direction < 0 && reader.side === 1))) {
      pan(direction > 0 ? 1 : 0);
      return;
    }
    flip(direction);
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const compactLayout = matchMedia('(max-width: 1100px)');
  function updateReadingHint() {
    root.querySelector('.book-hint').textContent = compactLayout.matches
      ? 'Текст прокручивается вверх и вниз. Свайп влево — дальше, вправо — назад.'
      : 'Прокручивайте текст внутри страницы. Листайте стрелками ← → или тяните за край листа. Кружки хранят воспоминания.';
  }
  compactLayout.addEventListener('change', updateReadingHint);
  updateReadingHint();

  let suppressClickUntil = 0;

  function finishGesture() {
    const gesture = reader.gesture;
    reader.gesture = null;
    if (reader.phase === 'gesturing') transition('idle');
    return gesture;
  }
  function commitGesture(gesture, distance) {
    if (!gesture?.horizontal || gesture.pinch) return;
    suppressClickUntil = performance.now() + 400;
    if (Math.abs(distance) >= 28) navigate(distance < 0 ? 1 : -1);
  }

  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    if (event.target.closest('.page-reading, .page-running, .illustration-caption, .page-number, button, a')) return;
    if (!compactLayout.matches || !event.isPrimary || event.button !== 0 || !transition('gesturing')) return;
    reader.gesture = { kind: 'pointer', id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
  });
  stage.addEventListener('pointermove', (event) => {
    const gesture = reader.gesture;
    if (gesture?.kind !== 'pointer' || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.horizontal && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
      finishGesture();
      return;
    }
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      gesture.horizontal = true;
      stage.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
  });
  stage.addEventListener('pointerup', (event) => {
    if (reader.gesture?.kind !== 'pointer' || reader.gesture.id !== event.pointerId) return;
    const gesture = finishGesture();
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    commitGesture(gesture, event.clientX - gesture.x);
  });
  stage.addEventListener('pointercancel', () => {
    if (reader.gesture?.kind === 'pointer') finishGesture();
  });
  stage.addEventListener('lostpointercapture', (event) => {
    if (event.target === stage && reader.gesture?.kind === 'pointer') finishGesture();
  });
  stage.addEventListener('click', (event) => {
    if (performance.now() >= suppressClickUntil) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  function touchCenter(touches) {
    const points = [...touches];
    return { x: points.reduce((sum, point) => sum + point.clientX, 0) / points.length, y: points.reduce((sum, point) => sum + point.clientY, 0) / points.length, spread: points.length > 1 ? Math.hypot(points[0].clientX - points[1].clientX, points[0].clientY - points[1].clientY) : 0 };
  }
  stage.addEventListener('touchstart', (event) => {
    if (!compactLayout.matches || reader.phase === 'closed') return;
    if (reader.phase !== 'idle' && reader.gesture?.kind !== 'touch') {
      if (event.cancelable) event.preventDefault();
      return;
    }
    if (reader.phase === 'idle' && !transition('gesturing')) return;
    if (event.touches.length > 1 || event.touches[0].clientX < 24 || event.touches[0].clientX > innerWidth - 24) event.preventDefault();
    const point = touchCenter(event.touches);
    reader.gesture = { kind: 'touch', ...point, lastX: point.x, count: event.touches.length, horizontal: false, pinch: false };
  }, { passive: false });
  stage.addEventListener('touchmove', (event) => {
    const gesture = reader.gesture;
    if (gesture?.kind !== 'touch') return;
    if (gesture.horizontal && event.cancelable) event.preventDefault();
    if (event.touches.length !== gesture.count) return;
    const point = touchCenter(event.touches);
    const dx = point.x - gesture.x;
    const dy = point.y - gesture.y;
    if (!gesture.horizontal && Math.abs(point.spread - gesture.spread) > 45 && Math.abs(dx) < 18) {
      gesture.pinch = true;
      return;
    }
    gesture.lastX = point.x;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      gesture.horizontal = true;
      event.preventDefault();
    }
  }, { passive: false });
  stage.addEventListener('touchend', (event) => {
    const gesture = reader.gesture;
    if (gesture?.kind !== 'touch') return;
    if (event.changedTouches.length === gesture.count) gesture.lastX = touchCenter(event.changedTouches).x;
    if (event.touches.length > 0) return;
    finishGesture();
    if (gesture.horizontal && event.cancelable) event.preventDefault();
    commitGesture(gesture, gesture.lastX - gesture.x);
  }, { passive: false });
  stage.addEventListener('touchcancel', () => {
    if (reader.gesture?.kind === 'touch') finishGesture();
  });

  let wheelDistance = 0;
  let wheelLastAt = 0;
  let wheelUsed = false;
  stage.addEventListener('wheel', (event) => {
    if (!compactLayout.matches || !isOpen() || event.ctrlKey) return;
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    const now = performance.now();
    if (now - wheelLastAt > 180) { wheelDistance = 0; wheelUsed = false; }
    wheelLastAt = now;
    if (reader.phase !== 'idle' || wheelUsed) return;
    const distance = event.deltaX * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientWidth : 1);
    wheelDistance += distance;
    if (Math.abs(wheelDistance) < 28) return;
    wheelUsed = true;
    navigate(wheelDistance > 0 ? 1 : -1);
  }, { passive: false });

  function render() {
    const chapter = chapters[reader.chapter];
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
    book.style.setProperty('--left-stack', stackShadow(reader.chapter));
    book.style.setProperty('--right-stack', stackShadow(chapters.length - reader.chapter));
    left.innerHTML = illustration(chapter, reader.chapter);
    right.innerHTML = reading(chapter, reader.chapter);
    const cached = decodedImages.get(reader.chapter);
    if (cached) {
      cached.className = 'story-art';
      cached.alt = chapter.subtitle;
      cached.draggable = false;
      left.querySelector('.story-art').replaceWith(cached);
    }
    root.dataset.mood = chapter.mood;
    root.dataset.chapter = String(reader.chapter);
    progress.textContent = `${String(reader.chapter + 1).padStart(2, '0')} / 08`;
    root.querySelector('.grip-left').setAttribute('aria-disabled', String(reader.chapter === 0));
    root.querySelector('.grip-right').setAttribute('aria-disabled', String(reader.chapter === chapters.length - 1));
    dots.innerHTML = chapters.map((chapter, i) => `<button data-chapter="${i}" aria-label="Глава ${i + 1}: ${chapter.title}" ${i === reader.chapter ? 'aria-current="step"' : ''}><span>${numbers[i]}</span></button>`).join('');
    updateNavigation();
    root.querySelector('.book-announcement').textContent = `Глава ${reader.chapter + 1}. ${chapter.title}`;
  }

  function createTurn(direction) {
    const target = reader.chapter + direction;
    if (reader.phase !== 'idle' || target < 0 || target >= chapters.length) return false;
    transition('turning');
    const oldIndex = reader.chapter;
    root.classList.add('page-turning');
    stage.scrollTo({ left: stage.scrollLeft, behavior: 'instant' });
    const leaf = document.createElement('div');
    leaf.className = `turn-leaf ${direction > 0 ? 'turn-forward' : 'turn-backward'}`;
    const sourcePage = direction > 0 ? right : left;
    const sourceScroll = sourcePage.scrollTop;
    const sourceStyle = getComputedStyle(sourcePage);
    const face = sourcePage.cloneNode(true);
    face.className = `turn-face turn-front ${direction > 0 ? 'page-reading' : 'page-illustration'}`;
    face.style.scrollbarWidth = sourceStyle.scrollbarWidth;
    face.style.scrollbarGutter = sourceStyle.scrollbarGutter;
    face.style.borderRadius = sourceStyle.borderRadius;

    const back = document.createElement('div');
    back.className = `turn-face turn-back ${direction > 0 ? 'page-illustration' : 'page-reading'}`;
    const backStyle = getComputedStyle(direction > 0 ? left : right);
    back.style.borderRadius = backStyle.borderRadius;
    back.style.scrollbarWidth = backStyle.scrollbarWidth;
    back.style.scrollbarGutter = backStyle.scrollbarGutter;
    back.innerHTML = direction > 0 ? illustration(chapters[target], target) : reading(chapters[target], target);
    leaf.append(face, back);
    removeCloneIds(leaf);
    const stillPage = direction > 0 ? left : right;
    const still = stillPage.cloneNode(true);
    still.classList.add('turn-still');
    removeCloneIds(still);
    reader.turn = { leaf, still, direction, oldIndex, target, progress: 0, cameraStart: stage.scrollLeft, readingScroll: right.scrollTop };
    // The old opposite page remains in place until the turned sheet lands.
    if (direction > 0) {
      right.innerHTML = reading(chapters[target], target);
      right.scrollTop = 0;
    } else {
      left.innerHTML = illustration(chapters[target], target);
    }
    const width = book.clientWidth / 2;
    const height = book.clientHeight;
    face.style.width = back.style.width = `${width}px`;
    face.style.height = back.style.height = `${height}px`;
    reader.turn.width = width;
    reader.turn.face = face;
    reader.turn.sourceScroll = sourceScroll;
    previous.disabled = next.disabled = true;
    book.append(still, leaf);
    still.scrollTop = stillPage.scrollTop;
    face.scrollTop = sourceScroll;
    pose(0);
    dots.inert = true;
    return true;
  }

  function pose(p) {
    if (!reader.turn) return;
    reader.turn.progress = p;
    const direction = reader.turn.direction;
    const curl = Math.sin(p * Math.PI);
    const angle = -direction * p * 180;
    // One continuous surface avoids independently rasterized strip seams.
    reader.turn.leaf.style.setProperty('transform', `rotateY(${angle}deg) skewY(${direction * curl * 1.8}deg)`, 'important');
    reader.turn.leaf.style.setProperty('--fold-shadow', String(curl * .16));
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
    reader.turn.face.style.clipPath = `polygon(${edge.join(',')})`;
    // Never reveal the incoming illustration underneath the old illustration.
    reader.turn.still.style.opacity = '1';
  }

  async function settle(commit) {
    if (!reader.turn) return;
    const current = reader.turn;
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
    reader.chapter = commit ? current.target : current.oldIndex;
    render();
    right.scrollTop = commit ? 0 : current.readingScroll;
    if (compactLayout.matches) {
      const destination = commit ? (current.direction > 0 ? 0 : current.width) : current.cameraStart;
      stage.scrollTo({ left: destination, behavior: 'instant' });
      reader.side = destination > current.width / 2 ? 1 : 0;
    }
    await left.querySelector('.story-art').decode();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    current.leaf.remove();
    current.still.remove();
    root.classList.remove('page-turning');
    reader.turn = null;
    dots.inert = false;
    transition('idle');
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
    reader.chapter = 0;
    reader.side = 0;
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
    const rect = closedCoverRect;
    const pageWidth = book.clientWidth / 2;
    const pageHeight = book.clientHeight;
    const target = book.getBoundingClientRect();
    const scene = document.createElement('div');
    scene.className = 'binding-scene';
    scene.inert = true;
    scene.setAttribute('aria-hidden', 'true');
    Object.assign(scene.style, { left: `${rect.left - pageWidth}px`, top: `${rect.top}px`, width: `${pageWidth * 2}px`, height: `${pageHeight}px`, transformOrigin: `${pageWidth}px 0` });
    const leftBoard = left.cloneNode(true);
    const rightBoard = right.cloneNode(true);
    const cover = root.querySelector('.book-cover').cloneNode(true);
    leftBoard.className = 'binding-left paper-page page-illustration';
    rightBoard.className = 'binding-right paper-page page-reading';
    cover.className = 'binding-cover book-cover';
    cover.removeAttribute('data-book-open');
    const frameBox = document.createElement('div');
    frameBox.className = 'binding-cover-content';
    Object.assign(frameBox.style, { width: `${rect.width}px`, height: `${rect.height}px`, transform: `scale(${pageWidth / rect.width},${pageHeight / rect.height})` });
    frameBox.append(closedCoverFrame.cloneNode(true));
    cover.querySelector('.cover-frame').replaceWith(frameBox);
    scene.append(leftBoard, rightBoard, cover);
    const paperEdge = document.createElement('div');
    paperEdge.className = 'binding-paper-edge';
    Object.assign(paperEdge.style, { left: `${pageWidth + 5 * pageWidth / rect.width}px`, top: `${pageHeight - 4 * pageHeight / rect.height}px`, width: `${pageWidth - 10 * pageWidth / rect.width}px`, height: `${16 * pageHeight / rect.height}px` });
    scene.prepend(paperEdge);
    removeCloneIds(scene);
    const small = `scale(${rect.width / pageWidth},${rect.height / pageHeight})`;
    const full = `translate(${target.left - (rect.left - pageWidth)}px,${target.top - rect.top}px) scale(1)`;
    scene.style.transform = opening ? small : full;
    leftBoard.style.transform = opening ? 'rotateY(180deg)' : 'rotateY(0deg)';
    cover.style.transform = opening ? 'rotateY(0deg)' : 'rotateY(-180deg)';
    if (!opening) await Promise.all([...scene.querySelectorAll('img')].map(image => image.decode()));
    root.classList.add('cover-flight');
    root.append(scene);
    rightBoard.scrollTop = right.scrollTop;
    if (opening) await Promise.all([...scene.querySelectorAll('img')].map(image => image.decode()));
    const options = { duration: 1600, easing: 'linear', fill: 'both', direction: opening ? 'normal' : 'reverse' };
    await Promise.all([
      paperEdge.animate([{opacity:1,offset:0},{opacity:0,offset:.15},{opacity:0,offset:1}], options).finished,
      rightBoard.animate([{boxShadow:'none',clipPath:'inset(3px 5px round 12px)',offset:0},{boxShadow:'0 3px #cdbd9e,0 6px #eee4cf,0 9px #183640',clipPath:'inset(0 round 12px)',offset:.15},{boxShadow:'0 3px #cdbd9e,0 6px #eee4cf,0 9px #183640',clipPath:'inset(0 round 12px)',offset:1}], options).finished,
      cover.animate([{transform:'rotateY(0deg)',offset:0},{transform:'rotateY(-150deg)',offset:.55},{transform:'rotateY(-180deg)',offset:.8},{transform:'rotateY(-180deg)',offset:1}], options).finished,
      leftBoard.animate([{transform:'rotateY(180deg)',offset:0},{transform:'rotateY(15deg)',offset:.65},{transform:'rotateY(0deg)',offset:.9},{transform:'rotateY(0deg)',offset:1}], options).finished,
      scene.animate([{transform:small,offset:0},{transform:small,offset:.35,easing:'ease-in-out'},{transform:full,offset:1}], options).finished,
    ]);
    // Keep the last animation frame until the real book has painted its new state.
    return async () => {
      root.classList.remove('cover-flight');
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      scene.remove();
    };
  }

  async function open() {
    if (reader.phase !== 'closed' || root.inert) return;
    await left.querySelector('.story-art').decode();
    if (reader.phase !== 'closed' || root.inert) return;
    const cover = root.querySelector('.book-cover');
    closedCoverRect = cover.getBoundingClientRect();
    closedCoverFrame = cover.querySelector('.cover-frame').cloneNode(true);
    [...closedCoverFrame.children].forEach((child, i) => {
      const style = getComputedStyle(cover.querySelector('.cover-frame').children[i]);
      child.style.fontSize = style.fontSize;
      child.style.letterSpacing = style.letterSpacing;
      child.style.lineHeight = style.lineHeight;
    });
    root.classList.remove('book-closed', 'book-closing');
    root.hidden = false;
    root.inert = false;
    transition('opening');
    root.classList.add('book-open');
    if (compactLayout.matches) { root.classList.add('artwork-ready'); pan(reader.side, false); }
    root.querySelector('.book-close').focus({ preventScroll: true });
    cover.getBoundingClientRect();
    const finishCover = compactLayout.matches && !reducedMotion.matches ? await animateCompactCover(true) : null;
    await Promise.allSettled(cover.getAnimations().map(animation => animation.finished));
    if (reader.phase !== 'opening') return;
    await left.querySelector('.story-art').decode();
    root.classList.add('reading-ready');
    if (compactLayout.matches) pan(reader.side, false);
    setPagesInert(false);
    if (finishCover) await finishCover();
    transition('idle');
  }

  async function close() {
    if (reader.phase !== 'idle') return;
    transition('closing');
    root.inert = true;
    root.querySelectorAll('.memory-point.open').forEach(point => point.classList.remove('open'));
    const finishCover = compactLayout.matches && !reducedMotion.matches ? await animateCompactCover(false) : null;
    root.classList.add('book-closing');
    root.classList.remove('book-open', 'reading-ready', 'artwork-ready');
    if (!reducedMotion.matches) {
      await Promise.allSettled(root.querySelector('.book-cover').getAnimations().map((a) => a.finished));
    }
    root.inert = false;
    root.classList.remove('book-closing');
    root.classList.add('book-closed');
    setPagesInert(true);
    if (finishCover) await finishCover();
    transition('closed');
    root.querySelector('.book-cover').focus({ preventScroll: true });
  }

  async function exit() {
    if (reader.phase !== 'idle' && reader.phase !== 'closed') return;
    if (isOpen()) await close();
    root.inert = true;
    await onExit();
  }

  function hide() {
    root.hidden = true;
    root.classList.remove('book-arriving', 'book-returning');
  }

  left.addEventListener('click', (event) => {
    if (!compactLayout.matches && reader.chapter === 0 && isOpen() && !reader.turn && !event.target.closest('button')) close();
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
    if (chapter && reader.phase === 'idle') {
      const target = Number(chapter.dataset.chapter);
      if (Math.abs(target - reader.chapter) === 1) flip(target - reader.chapter);
      else { reader.chapter = target; render(); }
    }
  });
  root.querySelectorAll('.page-grip').forEach((grip) => {
    const direction = Number(grip.dataset.direction);
    grip.addEventListener('click', (event) => { if (event.detail === 0) flip(direction); });
    grip.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') return;
      if (event.button !== 0 || !createTurn(direction)) return;
      grip.setPointerCapture(event.pointerId);
      reader.drag = { start: event.clientX, direction, time: performance.now(), settling: false };
    });
    grip.addEventListener('pointermove', (event) => {
      if (!reader.drag || reader.drag.settling || !grip.hasPointerCapture(event.pointerId)) return;
      const width = book.getBoundingClientRect().width / 2;
      const movement = (reader.drag.start - event.clientX) * direction;
      pose(Math.min(Math.max(movement / width, 0), .99));
    });
    grip.addEventListener('pointerup', async (event) => {
      if (!reader.drag || reader.drag.settling || !reader.turn) return;
      reader.drag.settling = true;
      const movement = (reader.drag.start - event.clientX) * direction;
      const speed = movement / Math.max(performance.now() - reader.drag.time, 1);
      const commit = movement >= -8 || speed > .35;
      await settle(commit);
      reader.drag = null;
    });
    grip.addEventListener('lostpointercapture', () => {
      if (reader.drag && !reader.drag.settling && reader.turn) {
        reader.drag.settling = true;
        settle(false).then(() => { reader.drag = null; });
      }
    });
    grip.addEventListener('pointercancel', () => {
      if (reader.drag && !reader.drag.settling && reader.turn) { reader.drag.settling = true; settle(false).then(() => { reader.drag = null; }); }
    });
  });
  document.addEventListener('keydown', (event) => {
    if (!isOpen() || root.hidden || root.inert) return;
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
  root.dataset.readerState = reader.phase;
  render();
  return { preload, approach, arrive, open, close, exit, hide };
}
