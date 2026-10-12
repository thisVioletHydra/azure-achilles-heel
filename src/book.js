import { chapters } from './story.js';
import { createWheelGesture, isHorizontalWheel, swipeDirection } from './wheel-gesture.js';
import { navigationTarget } from './book-navigation.js';

const numbers = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

function illustration(chapter, index) {
  return `<div class="page-running">ИСТОРИЯ ЛАЗУРНОЙ <span>ЧИЛЛИ ХИИЛ</span></div>
    <div class="illustration-window"><img class="story-art" src="${import.meta.env.BASE_URL}assets/story/${chapter.image}.webp" alt="${chapter.subtitle}" draggable="false" />
    ${chapter.memories.map((memory, i) => `<button class="memory-point${memory.y < 40 ? ' memory-below' : ''}" style="--x:${memory.x}%;--y:${memory.y}%" aria-expanded="false" aria-label="Воспоминание: ${memory.title}" aria-describedby="memory-${index}-${i}"><span class="memory-mark">${i + 1}</span><span class="memory-tooltip" role="tooltip" id="memory-${index}-${i}"><strong>${memory.title}</strong>${memory.text}</span></button>`).join('')}</div>
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
  // Clip outside the book without flattening the rotating sheet's 3D scene.
  const turnViewport = document.createElement('div');
  turnViewport.className = 'page-turn-viewport';
  turnViewport.setAttribute('aria-hidden', 'true');
  const turnScene = document.createElement('div');
  turnScene.className = 'page-turn-scene';
  turnViewport.append(turnScene);
  book.append(turnViewport);
  const preparedTurns = new Map();
  function placeMemories(page, size, image) {
    if (!image?.naturalWidth || !size.width || !size.height) return;
    const scale = Math.min(size.width / image.naturalWidth, size.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const margin = compactLayout.matches ? 23 : 18;
    page.querySelectorAll('.memory-point').forEach(point => {
      const x = parseFloat(point.style.getPropertyValue('--x')) / 100 * width;
      const y = parseFloat(point.style.getPropertyValue('--y')) / 100 * height;
      point.style.left = `${(size.width - width) / 2 + Math.max(Math.min(margin, width / 2), Math.min(width - margin, x))}px`;
      point.style.top = `${(size.height - height) / 2 + Math.max(Math.min(margin, height / 2), Math.min(height - margin, y))}px`;
    });
  }
  const decodedImages = new Map();
  const reader = { phase: 'closed', chapter: 0, side: 0, pan: null, turn: null, drag: null, gesture: null, memory: null, destination: null };
  function showMemory(point, pinned = false) {
    if (reader.memory) {
      reader.memory.point.classList.remove('open');
      reader.memory.point.setAttribute('aria-expanded', 'false');
    }
    reader.memory = point ? { point, pinned } : null;
    if (point) {
      point.classList.add('open');
      point.setAttribute('aria-expanded', 'true');
    }
  }
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
    showMemory(null);
    const width = book.clientWidth / 2;
    const destination = side * width;
    if (!smooth || reducedMotion.matches) {
      reader.side = side;
      book.style.setProperty('--turn-origin', compactLayout.matches ? `${side === 0 ? 25 : 75}%` : '50%');
      stage.scrollTo({ left: destination, behavior: 'instant' });
      updateNavigation();
      return;
    }
    if (!transition('panning')) return;
    const motion = { from: readingPosition(), to: reader.chapter * 2 + side, side };
    reader.pan = motion;
    updateNavigation();
    let origin = stage.scrollLeft;
    let targetSide = side;
    let startedAt = performance.now();
    let duration = 420;
    await new Promise(resolve => {
      function tick(now) {
        if (targetSide !== motion.side) {
          targetSide = motion.side;
          origin = stage.scrollLeft;
          startedAt = now;
          duration = Math.max(80, Math.abs(targetSide * width - origin) / width * 420);
        }
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = progress * progress * (3 - 2 * progress);
        stage.scrollTo({ left: origin + (targetSide * width - origin) * eased, behavior: 'instant' });
        if (progress < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
    reader.side = motion.side;
    book.style.setProperty('--turn-origin', `${reader.side === 0 ? 25 : 75}%`);
    reader.pan = null;
    stage.scrollTo({ left: reader.side * width, behavior: 'instant' });
    transition('idle');
    continueNavigation();
  }
  function updateNavigation() {
    const accepting = ['idle', 'panning', 'turning'].includes(reader.phase);
    const position = reader.destination ?? reader.pan?.to ?? reader.turn?.to ?? readingPosition();
    const last = compactLayout.matches ? chapters.length * 2 - 1 : chapters.length - 1;
    previous.disabled = !accepting || position === 0;
    next.disabled = !accepting || position === last;
    root.setAttribute('aria-busy', String(reader.phase === 'turning' || reader.phase === 'panning'));
    const chapter = compactLayout.matches ? Math.floor(position / 2) : position;
    progress.textContent = `${String(chapter + 1).padStart(2, '0')} / 08`;
    dots.querySelectorAll('[data-chapter]').forEach(dot => {
      if (Number(dot.dataset.chapter) === chapter) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
    root.querySelector('.book-announcement').textContent = `Глава ${chapter + 1}. ${chapters[chapter].title}`;
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
  function readingPosition() {
    return compactLayout.matches ? reader.chapter * 2 + reader.side : reader.chapter;
  }
  function continueNavigation() {
    if (reader.phase !== 'idle' || reader.gesture || reader.destination === null) return;
    const position = readingPosition();
    if (position === reader.destination) {
      reader.destination = null;
      return;
    }
    navigate(reader.destination > position ? 1 : -1);
  }
  function requestNavigation(direction) {
    if (!['idle', 'panning', 'turning'].includes(reader.phase)) return;
    const last = compactLayout.matches ? chapters.length * 2 - 1 : chapters.length - 1;
    const motion = reader.pan ?? reader.turn;
    reader.destination = navigationTarget({ destination: reader.destination, position: readingPosition(), motionTarget: motion?.to, direction, last });
    updateNavigation();
    continueNavigation();
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const compactLayout = matchMedia('(max-width: 1100px)');
  function updateReadingHint() {
    root.querySelector('.book-hint').textContent = compactLayout.matches
      ? 'Текст прокручивается вверх и вниз. Свайп влево — дальше, вправо — назад.'
      : 'Прокручивайте текст внутри страницы. Листайте стрелками ← → или тяните за край листа. Кружки хранят воспоминания.';
  }
  compactLayout.addEventListener('change', () => {
    reader.destination = null;
    book.style.setProperty('--turn-origin', compactLayout.matches ? `${reader.side === 0 ? 25 : 75}%` : '50%');
    updateReadingHint();
  });
  updateReadingHint();

  let suppressClickUntil = 0;

  function finishGesture() {
    const gesture = reader.gesture;
    reader.gesture = null;
    if (reader.phase === 'gesturing') transition('idle');
    return gesture;
  }
  function sampleGesture(gesture, time, x) {
    gesture.samples.push([time, x]);
    while (gesture.samples.length > 1 && gesture.samples[0][0] < time - 100) gesture.samples.shift();
  }
  function commitGesture(gesture, distance) {
    if (!gesture?.horizontal || gesture.pinch) { continueNavigation(); return; }
    suppressClickUntil = performance.now() + 400;
    const first = gesture.samples[0];
    const last = gesture.samples.at(-1);
    const velocity = (last[1] - first[1]) / Math.max(1, last[0] - first[0]);
    const direction = swipeDirection({ distance, velocity, pageWidth: stage.clientWidth });
    if (direction) requestNavigation(direction);
    else continueNavigation();
  }

  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    if (event.target.closest('.page-reading, .page-running, .illustration-caption, .page-number, button, a')) return;
    if (!compactLayout.matches || !event.isPrimary || event.button !== 0 || !transition('gesturing')) return;
    reader.gesture = { kind: 'pointer', id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false, samples: [[event.timeStamp, event.clientX]] };
  });
  stage.addEventListener('pointermove', (event) => {
    const gesture = reader.gesture;
    if (gesture?.kind !== 'pointer' || gesture.id !== event.pointerId) return;
    sampleGesture(gesture, event.timeStamp, event.clientX);
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
  document.addEventListener('pointerup', (event) => {
    if (reader.gesture?.kind !== 'pointer' || reader.gesture.id !== event.pointerId) return;
    const gesture = finishGesture();
    sampleGesture(gesture, event.timeStamp, event.clientX);
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    commitGesture(gesture, event.clientX - gesture.x);
  });
  document.addEventListener('pointercancel', () => {
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
  root.addEventListener('touchstart', (event) => {
    if (!compactLayout.matches || !stage.contains(event.target) || reader.phase === 'closed') return;
    if (!['idle', 'gesturing', 'panning', 'turning'].includes(reader.phase)) {
      if (event.cancelable) event.preventDefault();
      return;
    }
    if (reader.phase === 'idle' && !transition('gesturing')) return;
    if (event.touches.length > 1 || event.touches[0].clientX < 24 || event.touches[0].clientX > innerWidth - 24) event.preventDefault();
    const point = touchCenter(event.touches);
    reader.gesture = { kind: 'touch', ...point, lastX: point.x, count: event.touches.length, horizontal: false, pinch: false, samples: [[event.timeStamp, point.x]] };
  }, { passive: false });
  document.addEventListener('touchmove', (event) => {
    const gesture = reader.gesture;
    if (gesture?.kind !== 'touch') return;
    if (gesture.horizontal && event.cancelable) event.preventDefault();
    if (event.touches.length !== gesture.count) return;
    const point = touchCenter(event.touches);
    sampleGesture(gesture, event.timeStamp, point.x);
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
  document.addEventListener('touchend', (event) => {
    const gesture = reader.gesture;
    if (gesture?.kind !== 'touch') return;
    if (event.changedTouches.length === gesture.count) gesture.lastX = touchCenter(event.changedTouches).x;
    if (event.touches.length > 0) return;
    finishGesture();
    sampleGesture(gesture, event.timeStamp, gesture.lastX);
    if (gesture.horizontal && event.cancelable) event.preventDefault();
    commitGesture(gesture, gesture.lastX - gesture.x);
  }, { passive: false });
  document.addEventListener('touchcancel', () => {
    if (reader.gesture?.kind === 'touch') { finishGesture(); continueNavigation(); }
  });

  const acceptWheel = createWheelGesture();
  root.addEventListener('wheel', (event) => {
    if (!stage.contains(event.target) || !compactLayout.matches || !isOpen() || event.ctrlKey) return;
    // A new trackpad input releases an unfinished mouse gesture, not text selection.
    if (reader.gesture?.kind === 'pointer') finishGesture();
    if (!isHorizontalWheel(event.deltaX, event.deltaY)) {
      // Vertical noise inside an ongoing stroke must not create another page turn.
      acceptWheel({ distance: 0, time: event.timeStamp });
      return;
    }
    event.preventDefault();
    const distance = event.deltaX * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientWidth : 1);
    const direction = acceptWheel({ distance, time: event.timeStamp });
    const motion = reader.pan ?? reader.turn;
    if (reader.phase !== 'idle' && motion && direction === Math.sign(motion.to - motion.from)) return;
    if (direction) requestNavigation(direction);
  }, { passive: false, capture: true });

  function render() {
    showMemory(null);
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
    root.querySelector('.grip-left').setAttribute('aria-disabled', String(reader.chapter === 0));
    root.querySelector('.grip-right').setAttribute('aria-disabled', String(reader.chapter === chapters.length - 1));
    dots.innerHTML = chapters.map((chapter, i) => `<button data-chapter="${i}" aria-label="Глава ${i + 1}: ${chapter.title}" ${i === reader.chapter ? 'aria-current="step"' : ''}><span>${numbers[i]}</span></button>`).join('');
    updateNavigation();
    prepareTurns();
  }

  function prepareTurns() {
    preparedTurns.clear();
    const window = left.querySelector('.illustration-window');
    const image = left.querySelector('.story-art');
    const size = { width: window.clientWidth, height: window.clientHeight };
    placeMemories(left, size, decodedImages.get(reader.chapter) ?? image);
    for (const direction of [-1, 1]) {
      const target = reader.chapter + direction;
      if (target < 0 || target >= chapters.length) continue;
      const source = direction > 0 ? right : left;
      const opposite = direction > 0 ? left : right;
      const face = source.cloneNode(true);
      face.className = `turn-face turn-front ${direction > 0 ? 'page-reading' : 'page-illustration'}`;
      const back = document.createElement('div');
      back.className = `turn-face turn-back ${direction > 0 ? 'page-illustration' : 'page-reading'}`;
      back.innerHTML = direction > 0 ? illustration(chapters[target], target) : reading(chapters[target], target);
      if (direction > 0) placeMemories(back, size, decodedImages.get(target));
      const still = opposite.cloneNode(true);
      still.classList.add('turn-still');
      const incoming = document.createElement('div');
      incoming.innerHTML = direction > 0 ? reading(chapters[target], target) : illustration(chapters[target], target);
      const shades = [];
      for (const page of [face, back, still]) {
        // Hidden tooltip paragraphs are interactive content, not part of a sheet.
        page.querySelectorAll('.memory-tooltip').forEach(node => node.remove());
        page.querySelectorAll('[aria-describedby]').forEach(node => node.removeAttribute('aria-describedby'));
        removeCloneIds(page);
        if (page !== still) {
          const shade = document.createElement('div');
          shade.className = 'turn-shade';
          page.append(shade);
          shades.push(shade);
        }
      }
      preparedTurns.set(direction, { face, back, still, shades, incoming });
    }
  }

  function createTurn(direction) {
    const target = reader.chapter + direction;
    if (reader.phase !== 'idle' || target < 0 || target >= chapters.length) return false;
    const oldIndex = reader.chapter;
    const sourcePage = direction > 0 ? right : left;
    // Measure the real page, rather than assuming a half-width grid in every layout.
    const width = sourcePage.offsetWidth;
    const height = sourcePage.offsetHeight;
    const sourceScroll = sourcePage.scrollTop;
    transition('turning');
    showMemory(null);
    const { face, back, still, shades, incoming } = preparedTurns.get(direction);
    preparedTurns.clear();
    stage.scrollTo({ left: stage.scrollLeft, behavior: 'instant' });
    const leaf = document.createElement('div');
    leaf.className = `turn-leaf ${direction > 0 ? 'turn-forward' : 'turn-backward'}`;
    Object.assign(leaf.style, { left: `${sourcePage.offsetLeft}px`, width: `${width}px`, height: `${height}px` });
    leaf.append(face, back);
    const stillPage = direction > 0 ? left : right;
    const destination = compactLayout.matches ? target * 2 + (direction > 0 ? 0 : 1) : target;
    reader.turn = { leaf, still, shades, direction, oldIndex, target, from: readingPosition(), to: destination, progress: 0, cameraStart: stage.scrollLeft, readingScroll: right.scrollTop, compact: compactLayout.matches, simple: compactLayout.matches || reducedMotion.matches };
    root.classList.add('page-turning');
    // The old opposite page remains in place until the turned sheet lands.
    if (direction > 0) {
      right.replaceChildren(...incoming.childNodes);
      right.scrollTop = 0;
    } else {
      left.replaceChildren(...incoming.childNodes);
    }
    face.style.width = back.style.width = `${width}px`;
    face.style.height = back.style.height = `${height}px`;
    reader.turn.width = width;
    reader.turn.face = face;
    reader.turn.sourceScroll = sourceScroll;
    book.append(still);
    turnScene.append(leaf);
    still.scrollTop = stillPage.scrollTop;
    face.scrollTop = sourceScroll;
    pose(0);
    dots.inert = true;
    updateNavigation();
    return true;
  }

  function pose(p) {
    if (!reader.turn) return;
    reader.turn.progress = p;
    const direction = reader.turn.direction;
    const curl = Math.sin(p * Math.PI);
    const angle = -direction * p * 180;
    // One continuous surface avoids independently rasterized strip seams.
    reader.turn.leaf.style.setProperty('transform', `rotateY(${angle}deg)`, 'important');
    reader.turn.shades.forEach(shade => { shade.style.opacity = String(curl * .16); });
    if (reader.turn.simple) return;
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
  }

  async function settle(commit) {
    if (!reader.turn) return;
    const current = reader.turn;
    if (current.settling) return;
    current.settling = true;
    current.commit = commit;
    let from = current.progress;
    let to = commit ? 1 : 0;
    if (!reducedMotion.matches) {
      let start = performance.now();
      let duration = Math.max(80, Math.abs(to - from) * 940);
      await new Promise((resolve) => {
        function tick(now) {
          if (current.resized) { resolve(); return; }
          const target = current.commit ? 1 : 0;
          if (target !== to) {
            from = current.progress;
            to = target;
            start = now;
            duration = Math.max(80, Math.abs(to - from) * 940);
          }
          const p = Math.min((now - start) / duration, 1);
          const eased = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          const position = from + (to - from) * eased;
          pose(position);
          if (current.compact) {
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
    current.finished = true;
    commit = current.commit;
    reader.chapter = commit ? current.target : current.oldIndex;
    render();
    right.scrollTop = commit ? 0 : current.readingScroll;
    if (compactLayout.matches) {
      const width = book.clientWidth / 2;
      const side = commit ? (current.direction > 0 ? 0 : 1) : reader.side;
      const destination = side * width;
      stage.scrollTo({ left: destination, behavior: 'instant' });
      reader.side = side;
      book.style.setProperty('--turn-origin', `${side === 0 ? 25 : 75}%`);
    } else {
      stage.scrollTo({ left: 0, behavior: 'instant' });
      book.style.setProperty('--turn-origin', '50%');
    }
    await left.querySelector('.story-art').decode().catch(() => {});
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    current.leaf.remove();
    current.still.remove();
    root.classList.remove('page-turning');
    reader.turn = null;
    dots.inert = false;
    transition('idle');
    continueNavigation();
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
      try { await img.decode(); decodedImages.set(i, img); } catch { /* A missing illustration must not lock navigation. */ }
    }));
    // Background loading must not replace pages while a gesture is in progress.
    if (reader.phase === 'closed' && root.hidden) render();
  }

  function approach() {
    root.hidden = false;
    root.inert = true;
    root.classList.remove('book-open', 'book-closing', 'book-returning', 'reading-ready');
    root.classList.add('book-closed');
    reader.chapter = 0;
    reader.side = 0;
    reader.destination = null;
    reader.gesture = null;
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
    prepareTurns();
  }

  async function close() {
    if (reader.phase !== 'idle') return;
    transition('closing');
    root.inert = true;
    showMemory(null);
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

  addEventListener('resize', () => {
    if (reader.turn) {
      reader.turn.resized = true;
      if (!reader.turn.settling) {
        settle(false).then(() => { reader.drag = null; });
      }
    } else if (reader.phase === 'idle' && compactLayout.matches) {
      pan(reader.side, false);
    }
    updateNavigation();
    if (reader.phase === 'idle') prepareTurns();
  });

  left.addEventListener('click', (event) => {
    if (reader.memory && !event.target.closest('.memory-point')) {
      showMemory(null);
      return;
    }
    if (!compactLayout.matches && reader.chapter === 0 && isOpen() && !reader.turn && !event.target.closest('button')) close();
  });

  left.addEventListener('pointerenter', () => book.classList.add('hover-left'));
  left.addEventListener('pointerleave', () => book.classList.remove('hover-left'));
  left.addEventListener('pointerover', (event) => {
    const point = event.target.closest('.memory-point');
    if (event.pointerType === 'mouse' && point && reader.phase === 'idle' && reader.memory?.point !== point) showMemory(point);
  });
  left.addEventListener('pointerout', (event) => {
    const memory = reader.memory;
    if (event.pointerType !== 'mouse' || !memory || memory.pinned) return;
    if (memory.point.contains(event.target) && !memory.point.contains(event.relatedTarget)) showMemory(null);
  });
  right.addEventListener('pointerenter', () => book.classList.add('hover-right'));
  right.addEventListener('pointerleave', () => book.classList.remove('hover-right'));

  previous.addEventListener('click', () => requestNavigation(-1));
  next.addEventListener('click', () => requestNavigation(1));
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-book-open]')) open();
    if (event.target.closest('[data-book-close]')) close();
    if (event.target.closest('[data-book-exit]')) exit();
    const memory = event.target.closest('.memory-point');
    if (event.target.closest('.memory-tooltip')) return;
    if (memory && reader.phase === 'idle') showMemory(reader.memory?.point === memory && reader.memory.pinned ? null : memory, true);
    else showMemory(null);
    const chapter = event.target.closest('.book-chapters [data-chapter]');
    if (chapter && reader.phase === 'idle') {
      reader.destination = null;
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
    if (event.key === 'ArrowRight') { event.preventDefault(); requestNavigation(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); requestNavigation(-1); }
    if (event.key === 'Escape') {
      if (reader.memory) showMemory(null);
      else close();
    }
  });
  root.dataset.readerState = reader.phase;
  render();
  return { preload, approach, arrive, open, close, exit, hide };
}
