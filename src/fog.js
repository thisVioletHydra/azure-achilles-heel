import { WebGLRenderer, Scene, Camera, PlaneGeometry, Mesh, ShaderMaterial } from 'three';

// A continuous volume: no image tiles, sprite boundaries or looping animation seam.
const fragmentShader = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float coverage;
float hash(vec3 p) {
  p = fract(p * .1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                 mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                 mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) {
  return .57*noise(p) + .28*noise(p*2.03+7.1) + .15*noise(p*4.11+19.3);
}
void main() {
  vec2 uv = (gl_FragCoord.xy - .5*resolution) / resolution.y;
  float density = 0.;
  float light = 0.;
  // Samples move down the viewing ray. Nearby masses expand from the vanishing
  // point while distant masses retain finer detail; all extend beyond the viewport.
  for (int i=0; i<4; i++) {
    float depth = .65 + float(i)*.72;
    vec3 p = vec3(uv*depth*2.6, depth*1.8-time*1.35);
    p.xy += vec2(.22*sin(time*.3+depth), .16*cos(depth+time*.23));
    float n = fbm(p + .45*vec3(noise(p+4.),noise(p+11.),noise(p+23.)));
    float mass = smoothstep(.22,.77,n);
    density += mass / 4.;
    light += noise(p+vec3(.12,.22,0.)) / 4.;
  }
  vec3 color = mix(vec3(.66,.76,.79),vec3(.96,.97,.94),
                   clamp(.18 + density*.75 + light*.45,0.,1.));
  // Entire field is opaque through the scene cut, but its illuminated texture
  // keeps moving. At the ends, varying optical depth reveals organic wisps.
  float alpha = coverage >= .999 ? 1. :
    1.-exp(-coverage/(max(.001,1.-coverage))*(.35+density*2.8));
  gl_FragColor = vec4(color,alpha);
}`;

export function createFog(veil) {
  const canvas = document.createElement('canvas');
  canvas.className = 'flight-fog';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch {
    // Keep the passage usable when another WebGL context is unavailable.
    return createCanvasFog(veil);
  }
  veil.append(canvas);
  const uniforms = { resolution: { value: { x: 1, y: 1 } }, time: { value: 0 }, coverage: { value: 0 } };
  const material = new ShaderMaterial({ uniforms, fragmentShader,
    vertexShader: 'void main(){gl_Position=vec4(position.xy,0.,1.);}', transparent: true, depthTest: false, depthWrite: false });
  const scene = new Scene();
  scene.add(new Mesh(new PlaneGeometry(2, 2), material));
  const camera = new Camera();
  return (time, coverage) => {
    // Bound fragment cost on high-DPI phones; resize during a passage is safe.
    const rect = veil.getBoundingClientRect();
    const scale = Math.min(1, 640 / Math.max(rect.width, rect.height));
    const width = Math.max(1, Math.round(rect.width*scale));
    const height = Math.max(1, Math.round(rect.height*scale));
    if (canvas.width !== width || canvas.height !== height) renderer.setSize(width, height, false);
    uniforms.resolution.value.x = width;
    uniforms.resolution.value.y = height;
    uniforms.time.value = time;
    uniforms.coverage.value = coverage;
    renderer.render(scene, camera);
  };
}

function createCanvasFog(veil) {
  const canvas = document.createElement('canvas');
  canvas.className = 'flight-fog';
  canvas.setAttribute('aria-hidden', 'true');
  veil.append(canvas);
  const ctx = canvas.getContext('2d');
  return (time, coverage) => {
    canvas.width = Math.max(1, Math.round(veil.clientWidth*.5));
    canvas.height = Math.max(1, Math.round(veil.clientHeight*.5));
    const { width: w, height: h } = canvas;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = `rgba(192,211,215,${coverage})`;
    ctx.fillRect(0,0,w,h);
    for (let i=0;i<18;i++) {
      const depth = 1 + i*.035 + time*.22;
      const x = w*.5 + Math.sin(i*12.3)*w*.65*depth;
      const y = h*.5 + Math.cos(i*7.7)*h*.65*depth;
      const r = Math.max(w,h)*(.2+(i%3)*.06)*depth;
      const gradient = ctx.createRadialGradient(x,y,0,x,y,r);
      gradient.addColorStop(0,`rgba(248,249,241,${coverage*.55})`);
      gradient.addColorStop(1,'rgba(248,249,241,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0,0,w,h);
    }
  };
}

const smooth = x => { x = Math.min(1,Math.max(0,x)); return x*x*(3-2*x); };

export async function passFog(draw, changeScene, reducedMotion) {
  const duration = reducedMotion ? 500 : 2400;
  const start = performance.now();
  let switched = false, settled = false, sceneError;
  let revealAt = Infinity;
  await new Promise(resolve => {
    function frame(now) {
      const elapsed = now-start;
      // Hold only optical coverage while an asynchronous scene change completes;
      // the volume itself never pauses or restarts.
      if (!switched && elapsed >= duration*.48) {
        switched = true;
        Promise.resolve().then(changeScene).catch(error => { sceneError = error; }).finally(() => { settled = true; });
      }
      if (settled && revealAt === Infinity) revealAt = Math.max(duration*.58,elapsed);
      const coverage = elapsed < duration*.42 ? smooth(elapsed/(duration*.42)) :
        elapsed < revealAt ? 1 : 1-smooth((elapsed-revealAt)/(duration*.42));
      draw(reducedMotion ? 0 : elapsed/1000,coverage);
      if (elapsed >= revealAt+duration*.42) resolve();
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  if (sceneError) throw sceneError;
}
