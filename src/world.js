import * as THREE from 'three';

function mesh(geometry, material, parent, position = [0, 0, 0], scale = [1, 1, 1]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.scale.set(...scale);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.12, 'rgba(255,255,255,.8)');
  gradient.addColorStop(.4, 'rgba(255,255,255,.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function makeCloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  for (let i = 0; i < 24; i++) {
    const x = 70 + Math.random() * 370;
    const y = 95 + Math.random() * 75;
    const r = 35 + Math.random() * 70;
    const gradient = context.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(224,229,235,.22)');
    gradient.addColorStop(.45, 'rgba(190,209,224,.1)');
    gradient.addColorStop(1, 'rgba(190,209,224,0)');
    context.fillStyle = gradient;
    context.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return new THREE.CanvasTexture(canvas);
}

async function makeForeground() {
  const group = new THREE.Group();
  group.position.set(2, -1.8, 17);
  const texture = await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}assets/heroine-story.webp`);
  texture.colorSpace = THREE.SRGBColorSpace;
  const wind = { value: 0 };
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  // Wind affects only the free cloth, below the hair and left of the armored body.
  material.onBeforeCompile = function (shader) {
    shader.uniforms.windTime = wind;
    shader.vertexShader = 'uniform float windTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float clothRight = mix(0.39, 0.47, smoothstep(0.47, 0.60, uv.y));
      float cape = (1.0 - smoothstep(clothRight - 0.08, clothRight, uv.x))
        * smoothstep(0.42, 0.49, uv.y)
        * (1.0 - smoothstep(0.64, 0.69, uv.y));
      transformed.x += sin(windTime * 1.65 + uv.y * 7.0) * 0.12 * cape;
      transformed.y += sin(windTime * 1.5 - uv.x * 7.0) * 0.13 * cape;
      transformed.z += sin(windTime * 2.0 - uv.x * 9.0) * 0.2 * cape;
    `);
  };
  const foreground = mesh(new THREE.PlaneGeometry(8.4, 10.55, 64, 80), material, group, [0, .8, 0]);
  foreground.castShadow = false;
  foreground.receiveShadow = false;
  return { group, wind, material };
}

export async function createWorld(canvas, onReady) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#668393', .006);
  const camera = new THREE.PerspectiveCamera(47, innerWidth / innerHeight, .1, 180);
  const sun = new THREE.DirectionalLight('#ffe2b1', 3.3);
  sun.position.set(18, 20, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  sun.shadow.camera.far = 100;
  sun.shadow.normalBias = .035;
  sun.target.position.set(4, 0, -20);
  scene.add(sun.target);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight('#afcedc', '#253d46', 2.1));
  const rim = new THREE.DirectionalLight('#76a5bf', 1.7);
  rim.position.set(-10, 8, -10);
  scene.add(rim);

  const glowTexture = makeGlowTexture();
  const cloudTexture = makeCloudTexture();
  const heroGroup = new THREE.Group();
  scene.add(heroGroup);
  const islandGroup = new THREE.Group();
  islandGroup.position.set(10.4, 6.5, 0);
  heroGroup.add(islandGroup);
  const islandMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
  const island = mesh(new THREE.PlaneGeometry(29, 19.33), islandMaterial, islandGroup);
  const islandTexture = await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}assets/island-castle.webp`);
  islandTexture.colorSpace = THREE.SRGBColorSpace;
  islandMaterial.map = islandTexture;
  islandMaterial.needsUpdate = true;
  const foreground = await makeForeground();
  // Render the foreground with its own fixed camera: pointer parallax belongs to the sky.
  const foregroundScene = new THREE.Scene();
  foregroundScene.add(foreground.group);
  const foregroundCamera = camera.clone();
  const sky = document.querySelector('.sky');
  const depthLayers = [
    { element: document.querySelector('.hero'), distance: 24, tilt: .7 },
    { element: document.querySelector('.footer'), distance: 9, tilt: .25 },
  ];
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const nearClouds = [];
  for (const [x, y, z, width] of [[-8, -4, 23, 11], [9, -4.5, 24, 10], [-5, -6, 26, 13]]) {
    const material = new THREE.SpriteMaterial({ map: cloudTexture, color: '#c5d5de', transparent: true, opacity: .48, depthWrite: false });
    const cloud = new THREE.Sprite(material);
    cloud.position.set(x, y, z);
    cloud.scale.set(width, width * .38, 1);
    cloud.userData.origin = cloud.position.clone();
    cloud.renderOrder = 2;
    foregroundScene.add(cloud);
    nearClouds.push(cloud);
  }
  renderer.autoClear = false;
  const distantIslands = [];
  for (const [x, y, z, size] of [[-11, 0, -12, .12], [27, 3, -18, .16], [22, -5, -9, .08]]) {
    const material = islandMaterial.clone();
    material.opacity = .65;
    const remote = mesh(new THREE.PlaneGeometry(29, 19.33), material, heroGroup, [x, y, z], [size, size, size]);
    distantIslands.push(remote);
  }
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const material = new THREE.SpriteMaterial({ map: cloudTexture, color: i % 3 ? '#bdd2df' : '#e3c0b8', transparent: true, opacity: .24, depthWrite: false });
    const cloud = new THREE.Sprite(material);
    cloud.position.set(-40 + Math.random() * 80, -7 + Math.random() * 7, -20 + Math.random() * 40);
    cloud.scale.set(15 + Math.random() * 15, 6 + Math.random() * 8, 1);
    cloud.userData.speed = .1 + Math.random() * .16;
    scene.add(cloud);
    clouds.push(cloud);
  }

  const dustCount = 180;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - .5) * 65;
    dustPositions[i * 3 + 1] = -6 + Math.random() * 27;
    dustPositions[i * 3 + 2] = -35 + Math.random() * 60;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ map: glowTexture, color: '#e8d5aa', size: .12, transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);


  const waterfalls = [];
  for (const [x, y, height] of [[-6.7, -1, 8], [11.1, -.5, 6.6]]) {
    const positions = new Float32Array(250 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#d2eaf6', size: .06, map: glowTexture, transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending }));
    points.position.set(x, y, .1);
    islandGroup.add(points);
    waterfalls.push({ points, height, seeds: Array.from({ length: 250 }, () => Math.random()) });
  }

  const pointer = new THREE.Vector2();
  const smoothPointer = new THREE.Vector2();
  let place = 'threshold';
  let transition = null;
  let elapsed = 0;
  let previousTime = 0;
  let frame = 0;
  let cinematic = false;
  let hover = 0;
  const lookTarget = new THREE.Vector3(0, 4, 0);
  const poses = {
    threshold: { position: new THREE.Vector3(0, 7, 38), target: new THREE.Vector3(0, 4, 0) },
    book: { position: new THREE.Vector3(8, 8, 20), target: new THREE.Vector3(10, 9, 0) },
  };
  const basePosition = poses.threshold.position.clone();
  const baseTarget = poses.threshold.target.clone();

  function resize() {
    renderer.setSize(innerWidth, document.querySelector('#experience').clientHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    if (innerWidth < 600) {
      islandGroup.position.set(1.2, -3, 0);
      island.scale.setScalar(.60);
      foreground.group.position.set(4, -4, 17);
      foreground.group.scale.setScalar(.65);
      poses.threshold.position.set(0, 7, 43);
      if (place === 'threshold' && !transition) basePosition.copy(poses.threshold.position);
    } else {
      islandGroup.position.set(10.4, 6.5, 0);
      island.scale.setScalar(1);
      foreground.group.position.set(2, -1.8, 17);
      foreground.group.scale.setScalar(1);
      poses.threshold.position.set(0, 7, 38);
      if (place === 'threshold' && !transition) basePosition.copy(poses.threshold.position);
    }
    foregroundCamera.aspect = camera.aspect;
    foregroundCamera.position.copy(poses.threshold.position);
    foregroundCamera.lookAt(poses.threshold.target);
    foregroundCamera.updateProjectionMatrix();
  }

  function goTo(next, onComplete, onApproach, duration) {
    const start = basePosition.clone();
    const target = baseTarget.clone();
    transition = { from: place, to: next, start, target, progress: 0, duration: reducedMotion.matches ? .15 : duration ?? 5.4, onComplete, onApproach, approached: false };
    place = next;
    if (next !== 'threshold') renderer.shadowMap.needsUpdate = true;
  }

  function updateTransition(dt) {
    if (!transition) return;
    transition.progress = Math.min(transition.progress + dt / transition.duration, 1);
    const p = transition.progress;
    const eased = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const next = poses[transition.to];
    basePosition.lerpVectors(transition.start, next.position, eased);
    baseTarget.lerpVectors(transition.target, next.target, eased);
    if (!reducedMotion.matches) basePosition.y += Math.sin(p * Math.PI) * 2;
    const returning = transition.to === 'threshold';
    heroGroup.visible = true;
    islandMaterial.opacity = 1;
    const foregroundReveal = THREE.MathUtils.smoothstep(p, .08, .34);
    foreground.material.opacity = returning ? foregroundReveal : 1 - foregroundReveal;
    foreground.group.visible = foreground.material.opacity > .001;
    canvas.style.filter = 'none';
    if (transition.to === 'book' && p > .36 && !transition.approached) {
      transition.approached = true;
      transition.onApproach?.();
    }
    if (p === 1) {
      canvas.style.filter = 'none';
      foreground.material.opacity = 1;
      const done = transition.onComplete;
      transition = null;
      heroGroup.visible = place === 'threshold';
      islandMaterial.opacity = 1;
      foreground.group.visible = place === 'threshold';
      done?.();
    }
  }

  function animate(time) {
    frame = requestAnimationFrame(animate);
    const dt = Math.min((time - previousTime) / 1000 || .016, .05);
    previousTime = time;
    elapsed += dt;
    updateTransition(dt);
    const depthActive = place === 'threshold' && !transition && finePointer.matches && !reducedMotion.matches;
    if (!depthActive) pointer.set(0, 0);
    smoothPointer.lerp(pointer, 1 - Math.exp(-dt * 2));
    if (reducedMotion.matches || smoothPointer.lengthSq() < .000001) smoothPointer.set(0, 0);
    const motion = reducedMotion.matches ? 0 : 1;
    camera.position.copy(basePosition);
    camera.position.x += smoothPointer.x * 1.9 * motion;
    camera.position.y += smoothPointer.y * .8 * motion;
    lookTarget.copy(baseTarget);
    lookTarget.x += smoothPointer.x * 1.05 * motion;
    lookTarget.y += smoothPointer.y * .55 * motion;
    camera.lookAt(lookTarget);
    if (cinematic && !transition && motion) {
      camera.position.x += Math.sin(elapsed * .14) * 2;
      camera.position.y += Math.sin(elapsed * .23) * .6;
      camera.lookAt(lookTarget);
    }
    const islandBaseY = innerWidth < 600 ? -3 : 6.5;
    islandGroup.position.y = islandBaseY + Math.sin(elapsed * .36) * .27 * motion;
    islandGroup.rotation.z = Math.sin(elapsed * .19) * .006 * motion;
    islandGroup.position.x = (innerWidth < 600 ? 1.2 : 10.4);
    islandMaterial.color.setScalar(.88 + hover * .015);
    distantIslands.forEach((object, i) => { object.position.y += Math.sin(elapsed * .4 + i) * dt * .06 * motion; });
    clouds.forEach((cloud) => {
      cloud.position.x += dt * cloud.userData.speed * motion;
      if (cloud.position.x > 50) cloud.position.x = -50;
    });
    sky.style.transform = `translate3d(${-smoothPointer.x * 7}px,${-smoothPointer.y * 4}px,0) scale(1.045)`;
    depthLayers.forEach(({ element, distance, tilt }) => {
      const x = -smoothPointer.x * distance;
      const y = -smoothPointer.y * distance * .55;
      element.style.transform = `perspective(1400px) translate3d(${x}px,${y}px,0) rotateY(${-smoothPointer.x * tilt}deg) rotateX(${smoothPointer.y * tilt}deg)`;
    });
    nearClouds.forEach((cloud, i) => {
      const origin = cloud.userData.origin;
      cloud.visible = foreground.group.visible && innerWidth >= 700;
      cloud.position.x = origin.x - smoothPointer.x * (1.05 + i * .2) * motion + Math.sin(elapsed * .07 + i) * .14 * motion;
      cloud.position.y = origin.y - smoothPointer.y * .45 * motion;
    });
    foreground.wind.value = elapsed * motion;
    waterfalls.forEach(({ points, height, seeds }) => {
      const positions = points.geometry.attributes.position;
      seeds.forEach((seed, i) => {
        const p = (seed + elapsed * .3 * motion) % 1;
        positions.setXYZ(i, Math.sin(seed * 160) * (.12 + p * .22), -p * height, Math.cos(seed * 80) * .06);
      });
      positions.needsUpdate = true;
    });
    dust.rotation.y = elapsed * .003 * motion;
    renderer.clear();
    renderer.render(scene, camera);
    if (foreground.group.visible) {
      renderer.clearDepth();
      renderer.render(foregroundScene, foregroundCamera);
    }
  }

  addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || place !== 'threshold' || transition) return;
    pointer.set((event.clientX / innerWidth - .5) * 2, -(event.clientY / innerHeight - .5) * 2);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => pointer.set(0, 0));
  addEventListener('blur', () => pointer.set(0, 0));
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else { previousTime = performance.now(); frame = requestAnimationFrame(animate); }
  });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    document.querySelector('.render-fallback').hidden = false;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    document.querySelector('.render-fallback').hidden = true;
    previousTime = performance.now();
    frame = requestAnimationFrame(animate);
  });
  resize();
  frame = requestAnimationFrame(animate);
  onReady();
  return { goTo, setCinematic(value) { cinematic = value; }, setHover(value) { hover = value ? 1 : 0; }, getPlace() { return place; } };
}
