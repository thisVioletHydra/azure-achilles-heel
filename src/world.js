import * as THREE from 'three';

const ivory = new THREE.MeshStandardMaterial({ color: '#dfd5bb', roughness: .74 });
const gold = new THREE.MeshStandardMaterial({ color: '#baa276', metalness: .65, roughness: .34 });
const stone = new THREE.MeshStandardMaterial({ color: '#59645f', roughness: .95 });
const dark = new THREE.MeshStandardMaterial({ color: '#10252b', roughness: .88 });
const leaf = new THREE.MeshStandardMaterial({ color: '#334c38', roughness: .9 });
const paleLeaf = new THREE.MeshStandardMaterial({ color: '#64734f', roughness: .86 });
const water = new THREE.MeshPhysicalMaterial({ color: '#669ea3', metalness: .3, roughness: .13, transparent: true, opacity: .8 });

function mesh(geometry, material, parent, position = [0, 0, 0], scale = [1, 1, 1]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.scale.set(...scale);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function cylinder(parent, radius, height, position, material = ivory, topRadius = radius, segments = 32) {
  return mesh(new THREE.CylinderGeometry(topRadius, radius, height, segments), material, parent, position);
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

function makeMarbleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = '#eeeae2';
  context.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4500; i++) {
    context.fillStyle = i % 2 ? 'rgba(133,135,127,.045)' : 'rgba(255,255,255,.14)';
    const r = Math.random() * 14;
    context.beginPath();
    context.ellipse(Math.random() * 512, Math.random() * 512, r * 2, r, -.6, 0, Math.PI * 2);
    context.fill();
  }
  for (let i = 0; i < 16; i++) {
    context.strokeStyle = 'rgba(126,128,121,.12)';
    context.lineWidth = Math.random() * 1.2;
    context.beginPath();
    const x = Math.random() * 512;
    context.moveTo(x, 0);
    context.bezierCurveTo(x + 70, 130, x - 110, 370, x + 45, 512);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

async function makeForeground() {
  const group = new THREE.Group();
  group.position.set(2, -1.8, 17);
  const texture = await new THREE.TextureLoader().loadAsync('/assets/heroine-refined.webp');
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
  return { group, wind };
}

function makeTree(parent, x, z, size = 1) {
  const tree = new THREE.Group();
  tree.position.set(x, .2, z);
  tree.scale.setScalar(size);
  cylinder(tree, .09, 1.7, [0, .85, 0], stone, .035, 7);
  const canopyGeometry = new THREE.IcosahedronGeometry(1, 1);
  const matrix = new THREE.Object3D();
  for (const material of [leaf, paleLeaf]) {
    const canopy = new THREE.InstancedMesh(canopyGeometry, material, 22);
    for (let i = 0; i < 22; i++) {
      const angle = i / 22 * Math.PI * 2;
      const radius = .2 + Math.random() * .55;
      const clusterSize = .22 + Math.random() * .22;
      matrix.position.set(Math.cos(angle) * radius, 1.6 + Math.random() * .9, Math.sin(angle) * radius);
      matrix.scale.set(clusterSize * 1.3, clusterSize * .9, clusterSize);
      matrix.rotation.y = angle;
      matrix.updateMatrix();
      canopy.setMatrixAt(i, matrix.matrix);
    }
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    tree.add(canopy);
  }
  parent.add(tree);
  return tree;
}

function makeGazebo(parent) {
  const gazebo = new THREE.Group();
  gazebo.position.set(3.5, 0, -3.7);
  for (let i = 0; i < 3; i++) cylinder(gazebo, 3.1 - i * .19, .18, [0, .12 + i * .18, 0]);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const angle = i / n * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(angle) * 2.45;
    const z = Math.sin(angle) * 2.45;
    cylinder(gazebo, .24, .2, [x, .67, z]);
    cylinder(gazebo, .145, 3.15, [x, 2.3, z], ivory, .12, 16);
    cylinder(gazebo, .26, .18, [x, 3.86, z]);
    for (let j = 0; j < 4; j++) cylinder(gazebo, .18 + j * .018, .08, [x, .82 + j * .09, z]);
    const nextAngle = (i + 1) / n * Math.PI * 2 + Math.PI / 8;
    const nx = Math.cos(nextAngle) * 2.45;
    const nz = Math.sin(nextAngle) * 2.45;
    const midAngle = (angle + nextAngle) / 2;
    const arch = mesh(new THREE.TorusGeometry(.87, .09, 8, 24, Math.PI), ivory, gazebo, [(x + nx) / 2, 3.15, (z + nz) / 2]);
    arch.rotation.y = -midAngle + Math.PI / 2;
  }
  cylinder(gazebo, 2.85, .22, [0, 4.08, 0], ivory, 2.85, 8);
  cylinder(gazebo, 2.95, .09, [0, 4.23, 0], gold, 2.95, 8);
  const dome = mesh(new THREE.SphereGeometry(2.8, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), ivory, gazebo, [0, 4.28, 0], [1, .57, 1]);
  for (let i = 0; i < 8; i++) {
    const rib = new THREE.Curve();
    rib.getPoint = function (t) {
      const a = t * Math.PI / 2;
      const angle = i / 8 * Math.PI * 2;
      return new THREE.Vector3(Math.sin(a) * 2.83 * Math.cos(angle), 4.28 + Math.cos(a) * 1.6, Math.sin(a) * 2.83 * Math.sin(angle));
    };
    mesh(new THREE.TubeGeometry(rib, 24, .025, 5, false), gold, gazebo);
  }
  cylinder(gazebo, .12, .5, [0, 6.05, 0], gold, .01, 12);
  mesh(new THREE.SphereGeometry(.12, 12, 12), gold, gazebo, [0, 6.38, 0]);
  parent.add(gazebo);
  return dome;
}

function makeFountain(parent, glowTexture) {
  const fountain = new THREE.Group();
  fountain.position.set(3.5, 0, 3);
  cylinder(fountain, 2.14, .24, [0, .15, 0]);
  cylinder(fountain, 1.98, .2, [0, .34, 0], ivory, 1.98);
  mesh(new THREE.TorusGeometry(1.86, .13, 10, 64), ivory, fountain, [0, .5, 0]).rotation.x = Math.PI / 2;
  const surface = cylinder(fountain, 1.75, .03, [0, .42, 0], water);
  cylinder(fountain, .22, 1.9, [0, 1.36, 0], ivory, .13, 24);
  const bowlShape = [new THREE.Vector2(0, 0), new THREE.Vector2(.16, 0), new THREE.Vector2(.27, .1), new THREE.Vector2(.75, .29), new THREE.Vector2(.86, .44), new THREE.Vector2(.82, .48), new THREE.Vector2(.71, .37), new THREE.Vector2(.25, .21), new THREE.Vector2(0, .21)];
  mesh(new THREE.LatheGeometry(bowlShape, 48), ivory, fountain, [0, 2.1, 0]);
  cylinder(fountain, .14, .8, [0, 2.73, 0], ivory, .1);
  mesh(new THREE.LatheGeometry(bowlShape, 40), ivory, fountain, [0, 3.06, 0], [.55, .55, .55]);
  const count = 900;
  const positions = new Float32Array(count * 3);
  const seeds = Array.from({ length: count }, () => ({ phase: Math.random(), angle: Math.random() * Math.PI * 2, type: Math.random() }));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const drops = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#ccebf3', map: glowTexture, size: .075, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
  fountain.add(drops);
  for (let i = 0; i < 3; i++) {
    const ring = mesh(new THREE.RingGeometry(.1, .13, 64), new THREE.MeshBasicMaterial({ color: '#c0e6e1', transparent: true, opacity: .2, side: THREE.DoubleSide }), fountain, [0, .448, 0]);
    ring.rotation.x = -Math.PI / 2;
    ring.userData.offset = i / 3;
  }
  const light = new THREE.PointLight('#aee3e3', 4, 9);
  light.position.set(0, 1.8, 0);
  fountain.add(light);
  parent.add(fountain);
  return { group: fountain, drops, seeds, surface };
}

function makeObservatory(parent) {
  const group = new THREE.Group();
  group.position.set(-7.5, 0, -1);
  cylinder(group, 2.5, .3, [0, .2, 0]);
  cylinder(group, 2.25, .25, [0, .47, 0], ivory);
  const metal = new THREE.MeshStandardMaterial({ color: '#d7b781', metalness: .8, roughness: .3 });
  const globe = new THREE.Group();
  globe.position.y = 2.5;
  for (let i = 0; i < 5; i++) {
    const ring = mesh(new THREE.TorusGeometry(1.3 + i * .1, .025, 8, 96), metal, globe);
    ring.rotation.set(i * .7, i * .42, i * .32);
  }
  mesh(new THREE.SphereGeometry(.27, 24, 24), new THREE.MeshStandardMaterial({ color: '#bfdcde', emissive: '#70a3ae', emissiveIntensity: .8, metalness: .5, roughness: .2 }), globe);
  group.add(globe);
  cylinder(group, .15, 1.4, [0, 1.1, 0], gold, .08);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    cylinder(group, .1, .9, [Math.cos(a) * 2.1, .85, Math.sin(a) * 2.1], ivory, .1, 12);
  }
  parent.add(group);
  return globe;
}

function makeGarden(parent) {
  const group = new THREE.Group();
  group.position.set(10, 0, .5);
  cylinder(group, 3.2, .12, [0, .1, 0], paleLeaf);
  const pool = cylinder(group, 1.45, .035, [0, .2, 0], water);
  mesh(new THREE.TorusGeometry(1.55, .1, 8, 64), ivory, group, [0, .2, 0]).rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    makeTree(group, Math.cos(a) * 2.8, Math.sin(a) * 2.8, 1.3 + Math.random() * .3);
  }
  for (let i = 0; i < 65; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.7 + Math.random() * 1.3;
    mesh(new THREE.SphereGeometry(.045, 6, 6), i % 2 ? gold : ivory, group, [Math.cos(a) * r, .22 + Math.random() * .15, Math.sin(a) * r]);
  }
  const bench = new THREE.Group();
  mesh(new THREE.BoxGeometry(2, .15, .65), ivory, bench, [0, .65, 0]);
  mesh(new THREE.BoxGeometry(2, .55, .1), ivory, bench, [0, 1, -.3]);
  mesh(new THREE.BoxGeometry(.15, .65, .5), ivory, bench, [-.75, .32, 0]);
  mesh(new THREE.BoxGeometry(.15, .65, .5), ivory, bench, [.75, .32, 0]);
  bench.position.set(.8, .2, 2.4);
  bench.rotation.y = -.3;
  group.add(bench);
  parent.add(group);
  return pool;
}

function makeCourtyard(glowTexture) {
  const group = new THREE.Group();
  group.position.set(4, -1, -20);
  cylinder(group, 15, .65, [1, -.35, 0], ivory, 15, 64);
  const edge = mesh(new THREE.TorusGeometry(15.1, .08, 8, 100), gold, group, [1, -.02, 0]);
  edge.rotation.x = Math.PI / 2;
  cylinder(group, 15.3, .5, [1, -.85, 0], stone, 15, 64);
  for (let i = 0; i < 35; i++) {
    const angle = i / 35 * Math.PI * 2;
    const x = 1 + Math.cos(angle) * 14.3;
    const z = Math.sin(angle) * 14.3;
    cylinder(group, .14, 1.1, [x, .6, z], ivory, .14, 8);
    cylinder(group, .23, .1, [x, 1.15, z], ivory, .23, 8);
  }
  const railing = mesh(new THREE.TorusGeometry(14.3, .065, 6, 140), ivory, group, [1, 1.15, 0]);
  railing.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const path = mesh(new THREE.BoxGeometry(.025, .008, 27), gold, group, [1, .007, 0]);
    path.rotation.y = i / 8 * Math.PI;
  }
  for (let i = 1; i < 7; i++) {
    const inlay = mesh(new THREE.RingGeometry(i * 2, i * 2 + .018, 100), gold, group, [1, .011, 0]);
    inlay.rotation.x = -Math.PI / 2;
  }
  makeGazebo(group);
  const fountain = makeFountain(group, glowTexture);
  const observatory = makeObservatory(group);
  const pool = makeGarden(group);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + i / 8 * Math.PI;
    makeTree(group, 1 + Math.cos(a) * 11.5, Math.sin(a) * 11.5, 1.3 + Math.random() * .9);
  }
  // Small distant towers frame the pavilion without hiding the sky.
  for (let i = 0; i < 7; i++) {
    const x = -10 + i * 4;
    const h = 3 + Math.random() * 5;
    cylinder(group, .6, h, [x, h / 2 - .5, -17 - Math.random() * 3], ivory, .45, 8);
    cylinder(group, .75, 2.5, [x, h + .75, -18], gold, 0, 8);
  }
  group.visible = false;
  return { group, fountain, observatory, pool };
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
  ivory.map = makeMarbleTexture();
  ivory.needsUpdate = true;
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
  const islandTexture = await new THREE.TextureLoader().loadAsync('/assets/island.webp');
  islandTexture.colorSpace = THREE.SRGBColorSpace;
  islandMaterial.map = islandTexture;
  islandMaterial.needsUpdate = true;
  const foreground = await makeForeground();
  // Render the foreground with its own fixed camera: pointer parallax belongs to the sky.
  const foregroundScene = new THREE.Scene();
  foregroundScene.add(foreground.group);
  const foregroundCamera = camera.clone();
  renderer.autoClear = false;
  const distantIslands = [];
  for (const [x, y, z, size] of [[-17, 2, -12, .17], [25, 4, -16, .22], [-7, -2, -6, .1]]) {
    const material = islandMaterial.clone();
    material.opacity = .55;
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
  const courtyard = makeCourtyard(glowTexture);
  scene.add(courtyard.group);

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
    arrival: { position: new THREE.Vector3(4, 4.5, -3), target: new THREE.Vector3(5.5, 1.8, -21) },
    left: { position: new THREE.Vector3(-6.8, 3.7, -10), target: new THREE.Vector3(-2.3, 1.8, -21) },
    right: { position: new THREE.Vector3(8, 4.2, -8), target: new THREE.Vector3(13, 1.1, -19) },
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

  function goTo(next, onComplete) {
    const start = basePosition.clone();
    const target = baseTarget.clone();
    transition = { from: place, to: next, start, target, progress: 0, duration: reducedMotion.matches ? .25 : place === 'threshold' || next === 'threshold' ? 5.4 : 3.2, onComplete };
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
    let reveal = 1;
    if (transition.from === 'threshold') reveal = THREE.MathUtils.smoothstep(p, .4, .64);
    if (transition.to === 'threshold') reveal = 1 - THREE.MathUtils.smoothstep(p, .35, .65);
    heroGroup.visible = reveal < 1;
    islandMaterial.opacity = 1 - reveal;
    foreground.group.visible = reveal < .4;
    if (!courtyard.group.visible && reveal > .08) renderer.shadowMap.needsUpdate = true;
    courtyard.group.visible = reveal > .08;
    const wash = transition.from === 'threshold' || transition.to === 'threshold' ? Math.pow(Math.sin(p * Math.PI), 12) * .87 : 0;
    document.querySelector('.flight-wash').style.opacity = wash;
    if (p === 1) {
      const done = transition.onComplete;
      transition = null;
      heroGroup.visible = place === 'threshold';
      courtyard.group.visible = place !== 'threshold';
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
    smoothPointer.lerp(pointer, 1 - Math.exp(-dt * 2));
    const motion = reducedMotion.matches ? 0 : 1;
    camera.position.copy(basePosition);
    camera.position.x += smoothPointer.x * .7 * motion;
    camera.position.y += smoothPointer.y * .35 * motion;
    lookTarget.copy(baseTarget);
    lookTarget.x += smoothPointer.x * .18 * motion;
    camera.lookAt(lookTarget);
    if (cinematic && !transition && motion) {
      camera.position.x += Math.sin(elapsed * .14) * 2;
      camera.position.y += Math.sin(elapsed * .23) * .6;
      camera.lookAt(lookTarget);
    }
    const islandBaseY = innerWidth < 600 ? -3 : 6.5;
    islandGroup.position.y = islandBaseY + Math.sin(elapsed * .36) * .27 * motion;
    islandGroup.rotation.z = Math.sin(elapsed * .19) * .006 * motion;
    islandGroup.position.x = (innerWidth < 600 ? 1.2 : 10.4) + smoothPointer.x * .17 * motion;
    islandMaterial.color.setScalar(1 + hover * .035);
    distantIslands.forEach((object, i) => { object.position.y += Math.sin(elapsed * .4 + i) * dt * .06 * motion; });
    clouds.forEach((cloud) => {
      cloud.position.x += dt * cloud.userData.speed * motion;
      if (cloud.position.x > 50) cloud.position.x = -50;
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
    if (courtyard.group.visible) {
      const { fountain, observatory } = courtyard;
      const positions = fountain.drops.geometry.attributes.position;
      fountain.seeds.forEach((seed, i) => {
        const p = (seed.phase + elapsed * .38 * motion) % 1;
        let radius;
        let y;
        if (seed.type < .3) {
          radius = .12 + p * .58;
          y = 3.4 + Math.sin(p * Math.PI) * 1.3 - p * .8;
        } else if (seed.type < .65) {
          radius = .46 + p * .3;
          y = 3.3 - p * p * 1.1;
        } else {
          radius = .84 + p * .7;
          y = 2.5 - p * p * 2.05;
        }
        positions.setXYZ(i, Math.cos(seed.angle) * radius, y, Math.sin(seed.angle) * radius);
      });
      positions.needsUpdate = true;
      fountain.group.children.filter((o) => o.geometry?.type === 'RingGeometry').forEach((ring) => {
        const p = (elapsed * .3 * motion + ring.userData.offset) % 1;
        ring.scale.setScalar(1 + p * 14);
        ring.material.opacity = (1 - p) * .2;
      });
      observatory.rotation.y = elapsed * .12 * motion;
      observatory.rotation.z = Math.sin(elapsed * .2) * .08 * motion;
    }
    dust.rotation.y = elapsed * .003 * motion;
    renderer.clear();
    renderer.render(scene, camera);
    if (foreground.group.visible) {
      renderer.clearDepth();
      renderer.render(foregroundScene, foregroundCamera);
    }
  }

  addEventListener('pointermove', (event) => {
    pointer.set((event.clientX / innerWidth - .5) * 2, -(event.clientY / innerHeight - .5) * 2);
  }, { passive: true });
  addEventListener('pointerleave', () => pointer.set(0, 0));
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
