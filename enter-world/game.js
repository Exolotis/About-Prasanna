// Enter the world: a small island at real Bengaluru time. Drive to each place to open a chapter.
// Models: Kenney Car, Nature, Racing and City kits (CC0). Island, water, stops and effects: made here.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const $ = id => document.getElementById(id);
const TOP = new URLSearchParams(location.search).has('top');
const touch = matchMedia('(pointer:coarse)').matches;
const R = 56; // island radius: small and dense, like a diorama
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp;

// ---------- content ----------
const A = (href, text, solid) => `<a class="btn${solid ? '' : ' o'}" href="${href}" ${href.startsWith('/') ? '' : 'target="_blank" rel="noopener"'}>${text}</a>`;
const STOPS = [
  { id: 'about', links: [['Book a call','https://cal.com/moluscca-support-rc4jcj/30min'],['Resume','https://drive.google.com/drive/u/0/folders/12uHezXlF6-sCG7z94eg3mI9fGl5Q4kJx'],['prasanna.lol','/']], sub: 'Prasanna Bhatkar, actuarial science, Bangalore', title: 'Start here', at: [0, 19], color: '#ffffff', html: `
    <div class="k">Actuarial science, from Bangalore</div><h2>Prasanna Bhatkar.</h2>
    <p>I price risk nobody has priced yet. Right now: merchant risk at Dodo Payments, building Moluscca, shipping Moluscca Templates, and chairing crisis committees.</p>
    <p>CB1, CB2, CB3 cleared · B.Sc Actuarial Science, 8.2/10 CGPA · I can make it happen.</p>
    <div class="row">${A('https://cal.com/moluscca-support-rc4jcj/30min', 'Book a call', 1)}${A('https://drive.google.com/drive/u/0/folders/12uHezXlF6-sCG7z94eg3mI9fGl5Q4kJx', 'Resume')}</div>` },
  { id: 'dodo', links: [['dodopayments.com','https://dodopayments.com/']], sub: 'Risk Analyst, 5,000+ merchants reviewed', title: 'Dodo Payments', at: [13.4, 13.4], color: '#c6fe1e', html: `
    <div class="k">Now · since May 2026 · full-time</div><img class="logo" src="dodo.svg" alt="Dodo Payments"><h2>Risk Analyst, Liabilities and Ongoing</h2>
    <ul><li><b>Onboarding and ongoing reviews.</b> 5,000+ merchants reviewed: business models, transaction flows, compliance exposure and credibility.</li>
    <li><b>Monitoring.</b> Chargebacks, liabilities, fraud signals and odd patterns in international payments, caught before they turn into losses.</li>
    <li><b>Underwriting calls.</b> KYB and KYC, behavioural risk and policy-based scoring, with compliance, operations and payments.</li>
    <li><b>Data and decisions.</b> Queries, dashboards, simulations and policy, turned into clear recommendations.</li></ul>` },
  { id: 'climeta', links: [['climeta.ai','https://climeta.ai/']], sub: 'Actuarial and climate risk intern', title: 'Climeta', at: [19, 0], color: '#5ad1a0', html: `
    <div class="k">Feb to May 2026 · internship</div><img class="logo" src="climeta.svg" alt="Climeta"><h2>Actuarial Intern, Actuarial and Climate Risk</h2>
    <ul><li><b>Parametric products.</b> Solar farm revenue loss, livestock and climate-sensitive green energy portfolios.</li>
    <li><b>Climate data.</b> Irradiance, temperature and humidity, modelled into revenue volatility.</li>
    <li><b>Triggers and pricing.</b> Payout design, threshold calibration, premium pricing, back-testing and basis risk.</li>
    <li><b>Crops.</b> Multi-peril models for teak, marigold and gherkin.</li></ul>` },
  { id: 'research', links: [['Read the paper on SSRN','https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6509501']], sub: 'Two papers, two Best Paper awards', title: 'Research', at: [13.4, -13.4], color: '#ffd166', html: `
    <div class="k">Two papers, two Best Paper awards</div><h2>Original work on risks nobody had a price for.</h2>
    <ul><li><b>The Insurance Domino Effect: war and conflict.</b> Best Paper, ACTSUM 2024.</li>
    <li><b>Gridshield: autonomous vehicle insurance.</b> Best Paper, ACTCON 2025. 736+ NHTSA incident records turned into a pricing framework.</li></ul>
    <p>Best Business Planner, Dexter 2023.</p>
    <div class="row">${A('https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6509501', 'Read the paper on SSRN', 1)}</div>` },
  { id: 'moluscca', links: [['moluscca.com','https://www.moluscca.com'],['Templates','https://templates.moluscca.com'],['API','https://api.moluscca.com']], sub: 'Risk intelligence for markets priced blind', title: 'Moluscca', at: [0, -19], color: '#7cc8ff', html: `
    <div class="k">Founder</div><h2>Moluscca. Risk intelligence for markets priced blind.</h2>
    <p>Transparent insurability scores with a defensible "why". Thin data handled with credibility theory, no black boxes.</p>
    <ul><li><b>Moluscca Templates.</b> Dashboard templates with the maths built in and tested.</li>
    <li><b>Moluscca API.</b> Risk maths and checked India data in one request. Launching soon.</li>
    <li><b>Quant Risk Dashboard.</b> A Claude skill: any spreadsheet in, a verified risk dashboard out.</li></ul>
    <div class="row">${A('https://www.moluscca.com', 'moluscca.com', 1)}${A('https://templates.moluscca.com', 'Templates')}${A('https://api.moluscca.com', 'API')}</div>
    <img class="logo" src="peerlist.svg" alt="Peerlist" style="height:24px;margin-top:16px;opacity:.8">` },
  { id: 'mun', links: [['LinkedIn','https://www.linkedin.com/in/prasanna-bhatkar-/']], sub: '50+ MUNs, chaired 85% of formats', title: 'MUN', at: [-13.4, -13.4], color: '#ff8fab', html: `
    <div class="k">Off the clock</div><h2>Diplomacy as a contact sport.</h2><p>50+ MUNs. Chaired almost 85% of every format there is.</p>
    <ul><li><b>Co-Founder,</b> All India MUN</li><li><b>Secretary-General,</b> Heber MUN and GujMUN, 2024-25</li><li><b>Senior Advisor,</b> Heber MUN, 2025-26</li><li><b>Chair, Crisis Committee,</b> NIT Trichy, 2026</li></ul>` },
  { id: 'hoops', links: [['Hobbies on my site','/#hobbies']], sub: 'Die-hard Harden fan, OG Minecraft player', title: 'Basketball', at: [-19, 0], color: '#ff9f43', html: `
    <div class="k">Off the clock</div><h2>Die-hard Harden fan.</h2><p>Played through 12th grade and hit threes over a lot of 6'5 players. The prime is gone.</p>
    <p><b>Also:</b> OG Minecraft player. The one thing nobody is getting any closer to me at.</p>` },
  { id: 'contact', links: [['Book a 30-min call','https://cal.com/moluscca-support-rc4jcj/30min'],['LinkedIn','https://www.linkedin.com/in/prasanna-bhatkar-/'],['GitHub','https://github.com/Exolotis']], sub: 'prasanna@moluscca.com', title: 'Contact', at: [-13.4, 13.4], color: '#b8a6ff', html: `
    <div class="k">Say hello</div><h2>Pricing something blind? Let's talk.</h2><p>prasanna@moluscca.com</p>
    <div class="row">${A('https://cal.com/moluscca-support-rc4jcj/30min', 'Book a 30-min call', 1)}${A('https://www.linkedin.com/in/prasanna-bhatkar-/', 'LinkedIn')}${A('https://github.com/Exolotis', 'GitHub')}${A('/', 'prasanna.lol')}</div>` },
];
const CARS = [
  { file: 'race-future', name: 'Future racer', note: 'Fastest', speed: 34, grip: 5.2 },
  { file: 'race', name: 'Racer', note: 'Quick and sharp', speed: 32, grip: 5.6 },
  { file: 'sedan-sports', name: 'Sports sedan', note: 'All-rounder', speed: 29, grip: 5 },
  { file: 'hatchback-sports', name: 'Hot hatch', note: 'Nimble', speed: 27, grip: 6 },
  { file: 'suv-luxury', name: 'Luxury SUV', note: 'Calm cruiser', speed: 25, grip: 4.2 },
  { file: 'police', name: 'Police', note: 'Steady', speed: 28, grip: 4.8 },
  { file: 'taxi', name: 'Taxi', note: 'Bangalore spirit', speed: 26, grip: 4.6 },
  { file: 'kart-oopi', name: 'Kart', note: 'Drifty fun', speed: 23, grip: 3.4 },
];

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.5 : 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#0b1630', 70, 190);
const camera = new THREE.PerspectiveCamera(38, 1, 1, 600);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.4, 0.92);
// colour grade: one mood for the whole world, set by the time of day
const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uTint: { value: new THREE.Color('#ffffff') }, uAmt: { value: 0 }, uSat: { value: 1 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform sampler2D tDiffuse;uniform vec3 uTint;uniform float uAmt,uSat;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);float l=dot(c.rgb,vec3(.299,.587,.114));vec3 g=mix(vec3(l),c.rgb,uSat);g=mix(g,g*uTint*1.6,uAmt);float v=smoothstep(1.15,.35,length(vUv-.5));gl_FragColor=vec4(g*mix(.72,1.,v),c.a);}' });
// soft contact shadows in corners and under things (desktop only, phones skip it for speed)
const ao = touch ? null : new GTAOPass(scene, camera, 512, 512);
if (ao) { ao.updateGtaoMaterial({ radius: 1.2, distanceExponent: 1.5, thickness: 1.2, scale: 1.1, samples: 12 }); ao.blendIntensity = 0.85; composer.addPass(ao); }
// tilt-shift: top and bottom of the screen go soft, so the island reads as a miniature model
const tilt = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uAmt: { value: 2.6 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform sampler2D tDiffuse;uniform vec2 uRes;uniform float uAmt;varying vec2 vUv;void main(){float b=smoothstep(.16,.55,abs(vUv.y-.46))*uAmt*1.6;if(b<.05){gl_FragColor=texture2D(tDiffuse,vUv);return;}vec4 c=vec4(0.);float t=0.;for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++){vec2 o=vec2(float(i),float(j))*b/uRes;float w=1./(1.+float(i*i+j*j));c+=texture2D(tDiffuse,vUv+o)*w;t+=w;}gl_FragColor=c/t;}' });
composer.addPass(bloom); composer.addPass(tilt); composer.addPass(grade); composer.addPass(new OutputPass());

// ---------- real Bengaluru time: sun, sky and light ----------
const hemi = new THREE.HemisphereLight('#bcd7ff', '#3b3a2a', 1);
const sun = new THREE.DirectionalLight('#fff1d6', 2.5);
sun.castShadow = true; sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 220 });
scene.add(hemi, sun, sun.target);
// hour, sky, fog, sun (lit) colour, sun power, shadow colour, shadow power, night 0..1
// Shadows are tinted, not black: the whole island shares one palette at each time of day.
const PAL = [
  [0, '#0b1636', '#14245a', '#8fb0ff', 1.6, '#2a2a8a', 1.5, 1], [5, '#101c45', '#22306a', '#8fb0ff', 1.5, '#2a2a8a', 1.5, 1],
  [6.3, '#5a5aa8', '#f4a18a', '#ffb08a', 2.2, '#8a3f8f', 1.3, 0.4], [8, '#7ab4ee', '#d6ecfa', '#fff0dc', 2.6, '#5a6fd0', 1.15, 0],
  [16, '#78b0ec', '#dcebf8', '#fff0dc', 2.6, '#5a6fd0', 1.15, 0], [18, '#5b5fae', '#f59a7a', '#ff9a72', 2.2, '#7a3a9a', 1.3, 0.3],
  [19.3, '#18265a', '#2f3a78', '#8fb0ff', 1.6, '#2a2a8a', 1.5, 0.9], [24, '#0b1636', '#14245a', '#8fb0ff', 1.6, '#2a2a8a', 1.5, 1]];
const skyCol = new THREE.Color(), fogCol = new THREE.Color(), tmpC = new THREE.Color();
let night = 0, istHour = 12;
function setTime() {
  const now = new Date(), force = new URLSearchParams(location.search).get('hour'); istHour = force !== null ? +force % 24 : ((now.getUTCHours() + 5.5 + now.getUTCMinutes() / 60) % 24);
  let i = 0; while (i < PAL.length - 2 && PAL[i + 1][0] <= istHour) i++;
  const a = PAL[i], b = PAL[i + 1], t = (istHour - a[0]) / (b[0] - a[0]);
  skyCol.set(a[1]).lerp(tmpC.set(b[1]), t); fogCol.set(a[2]).lerp(tmpC.set(b[2]), t);
  sun.color.set(a[3]).lerp(tmpC.set(b[3]), t); sun.intensity = lerp(a[4], b[4], t);
  hemi.color.set(a[5]).lerp(tmpC.set(b[5]), t); hemi.groundColor.copy(hemi.color).multiplyScalar(0.6); hemi.intensity = lerp(a[6], b[6], t); night = lerp(a[7], b[7], t);
  scene.background = skyCol; scene.fog.color.copy(fogCol);
  bloom.strength = 0.15 + night * 0.35;
  const dusk = Math.max(0, 1 - Math.abs(istHour - 18.4) / 1.4) + Math.max(0, 1 - Math.abs(istHour - 6.4) / 1.2);
  grade.uniforms.uTint.value.set(night > 0.5 ? '#6f86ff' : dusk > 0.2 ? '#ffb48a' : '#fff1de');
  grade.uniforms.uAmt.value = night > 0.5 ? 0.3 * night : dusk > 0.2 ? 0.25 * dusk : 0.08;
  grade.uniforms.uSat.value = night > 0.5 ? 0.88 : 1.05;
  $('clock') && ($('clock').textContent = `Bengaluru ${String(Math.floor(istHour)).padStart(2, '0')}:${String(Math.floor(istHour % 1 * 60)).padStart(2, '0')} · ${night > 0.6 ? 'night' : night > 0.2 ? 'dusk' : 'day'}`);
}

// ---------- island ground ----------
const groundY = () => 0;
{
  const g = new THREE.RingGeometry(0.01, R, 96, 40); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = [], c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    p.setY(i, 0);
    c.set(r > R - 5 ? '#e9d3a1' : '#7cae55'); if (r < R - 5 && r > R - 8) c.lerp(tmpC.set('#e9d3a1'), (r - (R - 8)) / 3);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.receiveShadow = true; scene.add(m);
}
// road: one asphalt loop joining the stops, with edge lines, a dashed centre and kerbs
// cliff wall under the island: the world floats like a model on a table
{
  const g = new THREE.CylinderGeometry(R, R * 0.72, 16, 72, 6, true).toNonIndexed(); g.translate(0, -8, 0);
  const pos = g.attributes.position, col = [], c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < -0.5) { const k = 1 + (rnd() - 0.5) * 0.08; pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); } }
  for (let i = 0; i < pos.count; i += 3) { const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3; c.set(y > -1.5 ? '#d9c08c' : y > -6 ? '#9a7b5a' : '#6d5642').offsetHSL(0, 0, (rnd() - 0.5) * 0.06); for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const cliff = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })); cliff.receiveShadow = true; scene.add(cliff);
}
// road line through the stops, smoothed so no bend is tight enough to fold the kerbs
const pathCurve = (() => {
  const raw = new THREE.CatmullRomCurve3(Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2, r = 39 + 4 * Math.sin(a * 3 + 0.5) + 2 * Math.cos(a * 5); return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); }), true, 'centripetal');
  let p = raw.getSpacedPoints(240).slice(0, 240);
  for (let k = 0; k < 60; k++) p = p.map((v, i) => v.clone().multiplyScalar(2).add(p[(i + 239) % 240]).add(p[(i + 1) % 240]).multiplyScalar(0.25));
  return new THREE.CatmullRomCurve3(p.filter((_, i) => i % 4 === 0), true, 'centripetal');
})();
const ROAD_HALF = 4.6;
const ROAD_PTS = pathCurve.getSpacedPoints(400);
{
  const n = 500, pts = pathCurve.getSpacedPoints(n), len = pathCurve.getLength();
  const strip = (inner, outer, y, mat, vRepeat) => {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const a = pts[i % n], b = pts[(i + 1) % n], d = new THREE.Vector3().subVectors(b, a).normalize(), sd = new THREE.Vector3(-d.z, 0, d.x);
      pos.push(a.x + sd.x * outer, y, a.z + sd.z * outer, a.x + sd.x * inner, y, a.z + sd.z * inner);
      const v = i / n * len / vRepeat; uv.push(0, v, 1, v);
      if (i < n) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m); return m;
  };
  const tex = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const asphalt = tex(128, 128, x => {
    x.fillStyle = '#3b3e46'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${rnd() < .5 ? '255,255,255' : '0,0,0'},${0.04 + rnd() * 0.06})`; x.fillRect(rnd() * 128, rnd() * 128, 1.5, 1.5); }
    x.fillStyle = '#eef0f2'; x.fillRect(4, 0, 4, 128); x.fillRect(120, 0, 4, 128);
    x.fillStyle = '#f3c74a'; x.fillRect(62, 0, 4, 64);
  });
  strip(-ROAD_HALF, ROAD_HALF, 0.05, new THREE.MeshLambertMaterial({ map: asphalt, polygonOffset: true, polygonOffsetFactor: -1 }), 8);
  const kerb = tex(8, 64, x => { x.fillStyle = '#e8403a'; x.fillRect(0, 0, 8, 32); x.fillStyle = '#f4f4f4'; x.fillRect(0, 32, 8, 32); });
  const kerbMat = new THREE.MeshLambertMaterial({ map: kerb });
  strip(ROAD_HALF, ROAD_HALF + 0.7, 0.09, kerbMat, 3); strip(-ROAD_HALF - 0.7, -ROAD_HALF, 0.09, kerbMat, 3);
}
// paved plaza in the middle where all the places are
{
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  x.fillStyle = '#a99d88'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = `hsl(34,${14 + rnd() * 10}%,${58 + rnd() * 9}%)`; x.fillRect(i * 32 + 1, j * 32 + 1, 30, 30); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(26.5, 72), new THREE.MeshLambertMaterial({ map: t })); plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; plaza.receiveShadow = true; scene.add(plaza);
  const edge = new THREE.Mesh(new THREE.RingGeometry(26.5, 27.2, 72), new THREE.MeshLambertMaterial({ color: '#b9a98a' })); edge.rotation.x = -Math.PI / 2; edge.position.y = 0.04; scene.add(edge);
}
// start gate across the circuit
const GATE_SOLIDS = [];
{
  const p = pathCurve.getPointAt(0), d = pathCurve.getTangentAt(0), yaw = Math.atan2(d.x, d.z), g = new THREE.Group();
  const ck = document.createElement('canvas'); ck.width = 64; ck.height = 16; const c = ck.getContext('2d');
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#111' : '#fff'; c.fillRect(i * 4, j * 4, 4, 4); }
  const ct = new THREE.CanvasTexture(ck); ct.magFilter = THREE.NearestFilter; ct.colorSpace = THREE.SRGBColorSpace;
  for (const sx of [-ROAD_HALF - 1, ROAD_HALF + 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 0.5), new THREE.MeshStandardMaterial({ color: '#2b2b30' })); post.position.set(sx, 3, 0); post.castShadow = true; g.add(post); }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF * 2 + 3, 1.2, 0.3), new THREE.MeshBasicMaterial({ map: ct })); banner.position.y = 5.6; g.add(banner);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 1.2), new THREE.MeshBasicMaterial({ map: ct })); line.rotation.x = -Math.PI / 2; line.position.y = 0.08; g.add(line);
  g.position.set(p.x, 0, p.z); g.rotation.y = yaw; scene.add(g);
  const sd = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); for (const k of [-1, 1]) GATE_SOLIDS.push({ x: p.x + sd.x * k * (ROAD_HALF + 1), z: p.z + sd.z * k * (ROAD_HALF + 1), r: 0.4 });
}
// ramps you can jump: a wedge on the road, the car climbs it and flies off the end
const ramps = [];
{
  const stripes = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#2b2b30'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#f3c74a'; for (let i = -64; i < 64; i += 16) { x.beginPath(); x.moveTo(i, 64); x.lineTo(i + 8, 64); x.lineTo(i + 72, 0); x.lineTo(i + 64, 0); x.fill(); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (const t of [0.07, 0.31, 0.56, 0.81]) {
    const p = pathCurve.getPointAt(t), d = pathCurve.getTangentAt(t), yaw = Math.atan2(d.x, d.z), L = 6, W = 4.4, H = 1.3;
    const g = new THREE.BufferGeometry();
    const v = [-W / 2, 0, 0, W / 2, 0, 0, -W / 2, H, L, W / 2, H, L, -W / 2, 0, L, W / 2, 0, L];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1], 2));
    g.setIndex([0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5, 0, 4, 2, 1, 3, 5]); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: stripes, side: THREE.DoubleSide })); m.castShadow = m.receiveShadow = true;
    m.position.set(p.x - Math.sin(yaw) * L / 2, 0.05, p.z - Math.cos(yaw) * L / 2); m.rotation.y = yaw; scene.add(m);
    ramps.push({ x: m.position.x, z: m.position.z, yaw, L, W, H });
  }
}
function groundAt(x, z) {
  for (const r of ramps) {
    const dx = x - r.x, dz = z - r.z, u = dx * Math.sin(r.yaw) + dz * Math.cos(r.yaw), v = dx * Math.cos(r.yaw) - dz * Math.sin(r.yaw);
    if (Math.abs(v) < r.W / 2 && u >= 0 && u <= r.L) return r.H * u / r.L;
  }
  return 0;
}
// water with moving glints
const waterMat = new THREE.ShaderMaterial({
  transparent: true, fog: true,
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uDeep: { value: new THREE.Color('#0e3b5c') }, uShallow: { value: new THREE.Color('#2b8fb0') }, uGlint: { value: 1 } }]),
  vertexShader: `varying vec3 vP;
#include <fog_pars_vertex>
void main(){vec4 mvPosition=modelViewMatrix*vec4(position,1.);vP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
  fragmentShader: `uniform float uTime,uGlint;uniform vec3 uDeep,uShallow;varying vec3 vP;
#include <fog_pars_fragment>
void main(){float r=length(vP.xz);float s=smoothstep(${(R + 22).toFixed(1)},${(R - 2).toFixed(1)},r);vec3 c=mix(uDeep,uShallow,s);
float w=sin(vP.x*.35+uTime*1.3)*sin(vP.z*.31-uTime*1.1)+sin((vP.x+vP.z)*.9+uTime*2.)*.4;c+=smoothstep(1.15,1.38,w)*.35*uGlint;
float foam=smoothstep(${(R + 3.5).toFixed(1)},${(R + 1.5).toFixed(1)},r)*smoothstep(${(R - 1).toFixed(1)},${(R + 1.2).toFixed(1)},r)*(.6+.4*sin(r*3.-uTime*2.));c=mix(c,vec3(.95),foam*.8);
gl_FragColor=vec4(c,.94);
#include <fog_fragment>
}`});
const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), waterMat); water.rotation.x = -Math.PI / 2; water.position.y = -13; scene.add(water);
// stars + fireflies (night only)
const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 1500 }, (_, i) => { const a = rnd() * 6.28, e = 0.15 + rnd() * 1.3, d = 420; return i % 3 === 0 ? Math.cos(a) * Math.cos(e) * d : i % 3 === 1 ? Math.sin(e) * d : Math.sin(a) * Math.cos(e) * d; }), 3)),
  new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, fog: false }));
scene.add(stars);
const flies = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 240 }, (_, i) => i % 3 === 1 ? 0.6 + rnd() * 2.5 : (rnd() - 0.5) * R * 1.7), 3)),
  new THREE.PointsMaterial({ color: '#ffe48a', size: 0.35, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(flies);

// ---------- model loading ----------
const loader = new GLTFLoader(), cache = {};
const load = async f => (cache[f] ||= (await loader.loadAsync(f)).scene);
function fit(obj, h) { const b = new THREE.Box3().setFromObject(obj), s = h / Math.max(0.001, b.max.y - b.min.y); obj.scale.multiplyScalar(s); const b2 = new THREE.Box3().setFromObject(obj); obj.position.y -= b2.min.y; return obj; }
function shadows(o, cast = true) { o.traverse(m => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = true; } }); return o; }
async function place(file, x, z, h, rotY = 0, cast = true) { const o = shadows(fit((await load(file)).clone(true), h), cast); o.position.x = x; o.position.z = z; o.rotation.y = rotY; scene.add(o); return o; }

// instanced scatter of one model (all its meshes)
async function scatter(file, list, h) {
  const src = fit((await load(file)).clone(true), h); src.updateMatrixWorld(true);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  src.traverse(m => {
    if (!m.isMesh) return;
    const inst = new THREE.InstancedMesh(m.geometry, m.material, list.length); inst.castShadow = true; inst.receiveShadow = true;
    list.forEach((it, i) => { Q.setFromAxisAngle(up, it.r); M.compose(P.set(it.x, 0, it.z), Q, S.setScalar(it.s)); M.multiply(m.matrixWorld); inst.setMatrixAt(i, M); });
    scene.add(inst);
  });
}

// ---------- colliders, knockables, explosions ----------
const solids = [...GATE_SOLIDS]; // {x,z,r}
const props = []; // knockable things
function addProp(obj, r, mass = 1, explosive = false) { props.push({ obj, r, mass, explosive, v: new THREE.Vector3(), spin: new THREE.Vector3(), home: obj.position.clone(), homeRot: obj.rotation.clone(), y0: obj.position.y, gone: 0 }); }
const fx = []; // particles
const sparkGeo = new THREE.IcosahedronGeometry(0.4, 0);
function explode(at) {
  shake = Math.max(shake, 0.45 * Math.max(0, 1 - Math.hypot(state.x - at.x, state.z - at.z) / 25)); // gentle, only when close
  const flash = new THREE.PointLight('#ffb35c', 600, 40, 2); flash.position.copy(at).y += 2; scene.add(flash); fx.push({ light: flash, life: 0.5, max: 0.5 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.1, 40), new THREE.MeshBasicMaterial({ color: '#ffd28a', transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(at.x, 0.2, at.z); scene.add(ring); fx.push({ ring, life: 0.7, max: 0.7 });
  for (let i = 0; i < 46; i++) {
    const fire = i < 30, m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: fire ? (i % 2 ? '#ffb347' : '#ff6a2b') : '#5b5b62', transparent: true, depthWrite: false, blending: fire ? THREE.AdditiveBlending : THREE.NormalBlending }));
    m.position.copy(at).y += 1; scene.add(m);
    const a = rnd() * 6.28, up = 4 + rnd() * (fire ? 12 : 7), sp = 3 + rnd() * (fire ? 10 : 5);
    fx.push({ mesh: m, v: new THREE.Vector3(Math.cos(a) * sp, up, Math.sin(a) * sp), life: 0.6 + rnd() * (fire ? 0.6 : 1.4), max: 1.4, grow: fire ? 3 : 1.5 });
  }
  // push everything nearby, including the car
  props.forEach(p => { const d = p.obj.position.distanceTo(at); if (d < 12 && !p.gone) { const k = Math.min(6, (12 - d) * 0.8 / p.mass), dir = p.obj.position.clone().sub(at).setY(0).normalize(); p.v.addScaledVector(dir, k).y += Math.min(2.5, k * 0.3); p.spin.set(rnd() * 8, rnd() * 8, rnd() * 8); } });
  const dc = Math.hypot(state.x - at.x, state.z - at.z); if (dc < 8) { state.vx += (state.x - at.x) / dc * 3; state.vz += (state.z - at.z) / dc * 3; } // small nudge only
}

// ---------- the stops: each is a small place ----------
const stops = [];
const logoImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
async function boardTex(title, sub, color, logo) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const x = cv.getContext('2d');
  x.fillStyle = '#111114'; x.beginPath(); x.roundRect(0, 0, 512, 256, 30); x.fill(); x.fillStyle = color; x.fillRect(0, 236, 512, 20);
  const img = logo && await logoImg(logo);
  if (img) { const w = Math.min(420, 90 * img.width / img.height); x.drawImage(img, 256 - w / 2, 46, w, w * img.height / img.width); }
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `800 ${img ? 34 : 64}px "Albert Sans",sans-serif`; x.fillText(img ? sub : title, 256, img ? 198 : 140);
  if (!img && sub) { x.fillStyle = '#a1a1a6'; x.font = '600 30px "Albert Sans",sans-serif'; x.fillText(sub, 256, 192); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const box = (w, h, d, c) => shadows(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(c)));
const cyl = (r1, r2, h, c, seg = 16) => shadows(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), std(c)));
const spinners = [];
const lamps = [];
async function lamp(x, z) {
  const o = await place('models/lightPostModern.glb', x, z, 4.2);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe2a8' }));
  const b = new THREE.Box3().setFromObject(o); bulb.position.set(x, b.max.y - 0.2, z); scene.add(bulb);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4.5, 32), new THREE.MeshBasicMaterial({ color: '#ffcf86', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.05, z); scene.add(pool);
  const warm = new THREE.PointLight('#ffb867', 0, 14, 1.6); warm.position.set(x, b.max.y - 0.6, z); scene.add(warm);
  lamps.push({ bulb, pool, warm }); solids.push({ x, z, r: 0.5 });
}
async function buildStop(s) {
  const [x, z] = s.at, ringPos = new THREE.Vector3(x, 0, z).multiplyScalar(10.5 / 19);
  const face = Math.atan2(-x, -z); // face the island centre
  { const base = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.9, 0.22, 48), new THREE.MeshStandardMaterial({ color: '#efe6d4', roughness: 0.9 })); base.position.set(x, 0.11, z); base.receiveShadow = true; scene.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(6.75, 0.09, 6, 64), new THREE.MeshBasicMaterial({ color: s.color })); rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.23, z); scene.add(rim); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.5, 48), new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(ringPos.x, 0.06, ringPos.z); scene.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.3, 40), new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.12, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.set(ringPos.x, 0.05, ringPos.z); scene.add(disc);
  // sign
  const sub = { about: 'Drive to the rings', dodo: 'Now · Risk Analyst', climeta: 'Climate risk intern', research: 'Two Best Papers', moluscca: 'Risk intelligence', mun: '50+ conferences', hoops: 'Harden fan', contact: 'Say hello' }[s.id];
  const logo = { dodo: 'dodo.svg', climeta: 'climeta.svg' }[s.id];
  { const side = new THREE.Vector3(-z, 0, x).normalize(); await lamp(ringPos.x + side.x * 4.6, ringPos.z + side.z * 4.6); } // lamp beside the ring
  // the place itself
  if (s.id === 'about') {
    const bb = new THREE.Group(); for (const sx of [-3.4, 3.4]) { const post = cyl(0.14, 0.14, 6, '#2b2b30', 8); post.position.set(sx, 3, 0); bb.add(post); } bb.position.set(x, 0, z); bb.rotation.y = face; scene.add(bb); solids.push({ x, z, r: 3 });
    const name = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3.4), new THREE.MeshBasicMaterial({ map: await boardTex('PRASANNA', 'I price risk nobody has priced yet', '#ffffff') }));
    name.position.set(x + Math.sin(face) * 0.2, 4.2, z + Math.cos(face) * 0.2); name.rotation.y = face; scene.add(name);
    await place('models/flagCheckers.glb', x + 7, z + 1, 3.4);
  }
  if (s.id === 'dodo') {
    await place('models/city/building-a.glb', x + Math.sin(face) * -4, z + Math.cos(face) * -4, 7, face); solids.push({ x: x - Math.sin(face) * 4, z: z - Math.cos(face) * 4, r: 4.2 });
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.2), new THREE.MeshBasicMaterial({ map: await boardTex('', 'Merchant risk', '#c6fe1e', 'dodo.svg'), side: THREE.DoubleSide, transparent: true }));
    roof.position.set(x - Math.sin(face) * 4, 8, z - Math.cos(face) * 4); roof.rotation.y = face; scene.add(roof);
    for (let i = 0; i < 9; i++) { const c = box(0.9, 0.9, 0.9, i % 3 ? '#c89a5a' : '#b8863f'); c.position.set(x + 3 + (i % 3) * 0.95, 0.45 + Math.floor(i / 3) * 0.9, z + 2); scene.add(c); addProp(c, 0.55, 0.5); }
  }
  if (s.id === 'climeta') {
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
      const p = new THREE.Group(), leg = cyl(0.06, 0.06, 1, '#8d8d93', 6); leg.position.y = 0.5; p.add(leg);
      const pan = shadows(new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 1.3), std('#1f3c78', { metalness: 0.4, roughness: 0.25, emissive: '#0a1a40' }))); pan.position.y = 1.05; pan.rotation.x = -0.5; p.add(pan);
      p.position.set(x - 3 + c * 2.3, 0, z - 5 + r * 2.2); p.rotation.y = face; scene.add(p);
    }
    solids.push({ x, z: z - 4, r: 4.5 });
    const t = new THREE.Group(), tower = cyl(0.18, 0.32, 9, '#f2f2f2'); tower.position.y = 4.5; t.add(tower);
    const hub = new THREE.Group(); hub.position.set(0, 9, 0.4); t.add(hub);
    for (let k = 0; k < 3; k++) { const bl = box(0.3, 3.6, 0.08, '#ffffff'); bl.position.y = 1.8; const arm = new THREE.Group(); arm.rotation.z = k * 2.094; arm.add(bl); hub.add(arm); }
    t.position.set(x + 6, 0, z + 2); t.rotation.y = face; scene.add(t); spinners.push(hub); solids.push({ x: x + 6, z: z + 2, r: 0.6 });
  }
  if (s.id === 'research') {
    await place('models/statue_obelisk.glb', x, z - 4, 7); solids.push({ x, z: z - 4, r: 1.6 });
    for (const dx of [-3.2, 3.2]) {
      const pod = box(1.8, 1.4, 1.8, '#e9e4da'); pod.position.set(x + dx, 0.7, z - 1); scene.add(pod); solids.push({ x: x + dx, z: z - 1, r: 1.3 });
      const pts = [[0, 0], [0.45, 0], [0.12, 0.2], [0.1, 0.7], [0.55, 1.1], [0.62, 1.6], [0, 1.6]].map(p => new THREE.Vector2(p[0], p[1]));
      const cup = shadows(new THREE.Mesh(new THREE.LatheGeometry(pts, 20), std('#f2c14e', { metalness: 0.9, roughness: 0.25, emissive: '#3a2a05' }))); cup.position.set(x + dx, 1.4, z - 1); scene.add(cup); spinners.push(cup);
    }
  }
  if (s.id === 'moluscca') {
    const shell = new THREE.Group();
    for (let k = 0; k < 11; k++) { const rib = shadows(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), std(k % 2 ? '#f4e6d4' : '#ead2bb', { roughness: 0.5 }))); rib.scale.set(0.55, 0.35, 3.6); rib.position.z = 1.8; const arm = new THREE.Group(); arm.rotation.y = -1.25 + k * 0.25; arm.rotation.x = -0.35; arm.add(rib); shell.add(arm); }
    const lid = shell.clone(); lid.rotation.x = -0.9; lid.position.set(0, 0.3, 0);
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 20), new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#9fd8ff', emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.1 }));
    pearl.position.set(0, 1.1, 1.6); const sh = new THREE.Group(); sh.add(shell, lid, pearl); sh.position.set(x, 0.4, z - 3); sh.rotation.y = face + Math.PI; scene.add(sh);
    solids.push({ x, z: z - 3, r: 3.4 }); s.pearl = pearl;
    await place('models/lily_large.glb', x + 5, z + 1, 0.4);
  }
  if (s.id === 'mun') {
    const table = cyl(3, 3, 0.25, '#7a5233', 32); table.position.set(x, 1.1, z); scene.add(table);
    const leg = cyl(0.4, 0.6, 1.1, '#5c3d26'); leg.position.set(x, 0.55, z); scene.add(leg); solids.push({ x, z, r: 3.2 });
    const flagCols = ['#ff5a5f', '#3d7bff', '#ffd23f', '#2ecc71', '#ffffff', '#ff8fab'];
    flagCols.forEach((c, k) => {
      const a = k / flagCols.length * 6.283, fx2 = x + Math.cos(a) * 4.6, fz = z + Math.sin(a) * 4.6;
      const pole = cyl(0.05, 0.05, 3.4, '#d9d9de', 6); pole.position.set(fx2, 1.7, fz); scene.add(pole);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), std(c, { side: THREE.DoubleSide })); fl.position.set(fx2 + 0.6, 3, fz); fl.castShadow = true; scene.add(fl); spinners.push({ flag: fl, k });
      const ch = box(0.6, 0.9, 0.6, '#2b2b30'); ch.position.set(x + Math.cos(a) * 3.6, 0.45, z + Math.sin(a) * 3.6); scene.add(ch); addProp(ch, 0.45, 0.7);
    });
  }
  if (s.id === 'hoops') {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'); c.fillStyle = '#c8743f'; c.fillRect(0, 0, 256, 256); c.strokeStyle = '#fff'; c.lineWidth = 4; c.strokeRect(8, 8, 240, 240); c.beginPath(); c.arc(128, 8, 90, 0, Math.PI); c.stroke(); c.strokeRect(88, 8, 80, 90);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const court = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshLambertMaterial({ map: t })); court.rotation.x = -Math.PI / 2; court.rotation.z = face; court.position.set(x, 0.04, z); court.receiveShadow = true; scene.add(court);
    const hx = x - Math.sin(face) * 5.4, hz = z - Math.cos(face) * 5.4, hoop = new THREE.Group();
    const p = cyl(0.12, 0.12, 4, '#3a3a40'); p.position.y = 2; hoop.add(p);
    const bd = box(1.9, 1.2, 0.08, '#ffffff'); bd.position.set(0, 4, 0.3); hoop.add(bd);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 24), std('#ff5a1f')); rim.rotation.x = Math.PI / 2; rim.position.set(0, 3.6, 0.75); hoop.add(rim);
    hoop.position.set(hx, 0, hz); hoop.rotation.y = face; scene.add(hoop); solids.push({ x: hx, z: hz, r: 0.5 });
    for (let k = 0; k < 3; k++) { const ball = shadows(new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), std('#e8762b', { roughness: 0.6 }))); ball.position.set(x + k * 1.4 - 1.4, 0.42, z + 1); scene.add(ball); addProp(ball, 0.42, 0.25); }
  }
  if (s.id === 'contact') {
    const mb = new THREE.Group(), pole = cyl(0.08, 0.08, 1.2, '#3a3a40'); pole.position.y = 0.6; mb.add(pole);
    const body = box(0.7, 0.55, 1, '#3d7bff'); body.position.y = 1.45; mb.add(body);
    const flag = box(0.05, 0.4, 0.15, '#ff5a5f'); flag.position.set(0.38, 1.6, 0.2); mb.add(flag);
    mb.position.set(x + 2, 0, z - 2); scene.add(mb); solids.push({ x: x + 2, z: z - 2, r: 0.6 });
    const booth = box(1.5, 3, 1.5, '#d63b3b'); booth.position.set(x - 3, 1.5, z - 3); scene.add(booth); solids.push({ x: x - 3, z: z - 3, r: 1.1 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.35, 1.52), new THREE.MeshBasicMaterial({ color: '#fff3c4' })); top.position.set(x - 3, 3.1, z - 3); scene.add(top);
    await place('models/campfire_stones.glb', x + 5, z + 2, 0.6);
  }
  stops.push({ ...s, pos: ringPos, ring, disc });
}

// ---------- fluffy trees: leaf cards in a sphere, shaded like one soft ball ----------
function leafTexture() { return new THREE.TextureLoader().load('models/leaf.png'); }
function canopyGeometry() {
  const planes = [];
  for (let i = 0; i < 80; i++) {
    const pl = new THREE.PlaneGeometry(0.85, 0.85), sp = new THREE.Spherical(1 - Math.pow(rnd(), 3), Math.PI * 2 * rnd(), Math.PI * rnd()), pos = new THREE.Vector3().setFromSpherical(sp);
    pl.rotateZ(rnd() * 9999); pl.lookAt(pos); pl.translate(pos.x, pos.y, pos.z);
    const out = pos.clone().normalize(), nrm = new Float32Array(12), v = new THREE.Vector3();
    for (let k = 0; k < 4; k++) { v.fromBufferAttribute(pl.attributes.position, k).lerp(out, 0.85).normalize(); nrm.set([v.x, v.y, v.z], k * 3); }
    pl.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); planes.push(pl);
  }
  return mergeGeometries(planes);
}
function buildFluffyTrees(list) {
  const leaf = leafTexture(), canopy = canopyGeometry();
  const greens = ['#5d9e46', '#6fae4c', '#4f8f40'], falls = ['#e0892f', '#d8632b'];
  const mat = new THREE.MeshLambertMaterial({ alphaMap: leaf, alphaTest: 0.35, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => { sh.uniforms.uWind = windU; sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvec3 tp=instanceMatrix[3].xyz;transformed.x+=sin(uWind*1.4+tp.x*.2+position.y)*.08*max(position.y+1.,0.);'); };
  const trunkG = new THREE.CylinderGeometry(0.18, 0.28, 2.6, 6); trunkG.translate(0, 1.3, 0);
  const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: '#6b4a35' }), list.length);
  const leaves = new THREE.InstancedMesh(canopy, mat, list.length * 2);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), C = new THREE.Color();
  let li = 0;
  list.forEach((t, i) => {
    const s = t.s, fall = t.x > 20 && t.z < -10 && rnd() < 0.7;
    Q.setFromAxisAngle(up, t.r); M.compose(P.set(t.x, 0, t.z), Q, S.set(s, s, s)); trunks.setMatrixAt(i, M);
    const n = rnd() < 0.5 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const r = (k ? 1.3 : 1.8) * s; M.compose(P.set(t.x + (k ? (rnd() - 0.5) * 1.6 * s : 0), (2.9 + k * 1.1) * s + r * 0.4, t.z + (k ? (rnd() - 0.5) * 1.6 * s : 0)), Q, S.set(r, r * 0.9, r));
      leaves.setMatrixAt(li, M); leaves.setColorAt(li, C.set((fall ? falls : greens)[Math.floor(rnd() * (fall ? 2 : 3))])); li++;
    }
  });
  leaves.count = li; [trunks, leaves].forEach(m => { m.castShadow = true; m.receiveShadow = true; scene.add(m); });
}

// ---------- grass: thousands of blades swaying in the wind ----------
const windU = { value: 0 };
function buildGrass() {
  const n = touch ? 12000 : 28000, blade = new THREE.PlaneGeometry(0.13, 0.34, 1, 2); blade.translate(0, 0.17, 0); { const nr = blade.attributes.normal; for (let i = 0; i < nr.count; i++) nr.setXYZ(i, 0, 1, 0); }
  const mat = new THREE.MeshLambertMaterial({ color: '#7fb85a', side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uWind = windU;
    sh.vertexShader = 'uniform float uWind;varying float vH;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvH=uv.y;vec3 ip=instanceMatrix[3].xyz;transformed.x+=sin(uWind*1.7+ip.x*.35+ip.z*.2)*.22*uv.y*uv.y;transformed.z+=cos(uWind*1.3+ip.z*.3)*.12*uv.y*uv.y;');
    sh.fragmentShader = 'varying float vH;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb*=mix(.72,1.12,vH);').replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
  };
  const g = new THREE.InstancedMesh(blade, mat, n); g.receiveShadow = true;
  const pts = pathCurve.getSpacedPoints(160), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), S = new THREE.Vector3();
  let k = 0, tries = 0;
  while (k < n && tries++ < n * 6) {
    const a = rnd() * 6.283, r = Math.sqrt(rnd()) * (R - 11), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) < 27.5) continue;
    let nearest = 99; for (let i = 0; i < pts.length; i += 2) { const d = Math.hypot(pts[i].x - x, pts[i].z - z); if (d < nearest) nearest = d; }
    if (nearest < ROAD_HALF + 1.2) continue;
    Q.setFromAxisAngle(up, rnd() * 6.28); M.compose(P.set(x, 0, z), Q, S.set(1, 0.6 + rnd() * 0.9, 1)); g.setMatrixAt(k++, M);
  }
  g.count = k; scene.add(g);
}

// ---------- scenery ----------
async function buildScenery() {
  const free = (x, z, pad) => Math.hypot(x, z) < R - 10 && Math.hypot(x, z) > 28.5 + pad && !STOPS.some(s => Math.hypot(s.at[0] - x, s.at[1] - z) < 11 + pad) && pathCurve.getSpacedPoints(120).every(p => Math.hypot(p.x - x, p.z - z) > 6.5 + pad);
  const pick = (n, pad, rMin = 0, rMax = R - 10) => { const out = []; let t = 0; while (out.length < n && t++ < n * 40) { const a = rnd() * 6.283, r = Math.sqrt(lerp(rMin * rMin, rMax * rMax, rnd())), x = Math.cos(a) * r, z = Math.sin(a) * r; if (free(x, z, pad) && out.every(o => Math.hypot(o.x - x, o.z - z) > pad * 2)) out.push({ x, z, r: rnd() * 6.28, s: 0.8 + rnd() * 0.45 }); } return out; };
  const fluffy = pick(46, 1.7, 8); buildFluffyTrees(fluffy); fluffy.forEach(t => solids.push({ x: t.x, z: t.z, r: 0.5 * t.s }));
  for (const [f, h] of [['tree_pineRoundA', 6], ['tree_pineTallA_detailed', 7]]) { const l = pick(8, 1.6, 8); await scatter(`models/${f}.glb`, l, h); l.forEach(t => solids.push({ x: t.x, z: t.z, r: 0.7 * t.s })); }
  const palms = pick(18, 1.4, R - 18, R - 9); await scatter('models/tree_palmDetailedTall.glb', palms, 7); palms.forEach(t => solids.push({ x: t.x, z: t.z, r: 0.5 }));
  await scatter('models/tree_palmBend.glb', pick(8, 1.4, R - 16, R - 9), 5.5);
  for (const [f, h, n] of [['rock_largeA', 1.1, 8], ['rock_largeC', 1, 8], ['rock_tallB', 2.2, 5]]) { const l = pick(n, 1.2, 6); await scatter(`models/${f}.glb`, l, h); l.forEach(t => solids.push({ x: t.x, z: t.z, r: 1.1 * t.s })); }
  for (const [f, h, n] of [['plant_bushLarge', 1.4, 30], ['plant_bush', 0.9, 40], ['flower_yellowA', 0.6, 60], ['flower_purpleA', 0.6, 60], ['flower_redA', 0.6, 50], ['mushroom_redGroup', 0.5, 20], ['stone_smallA', 0.4, 40]]) await scatter(`models/${f}.glb`, pick(n, 0.25, 4), h);
  await place('models/tent_detailedOpen.glb', -44, 30, 3, 0.6); solids.push({ x: -44, z: 30, r: 2 });
  await place('models/log_stack.glb', -40, 36, 1.2, 1.1); solids.push({ x: -40, z: 36, r: 1.2 });
  // explosive crates: in the gaps between places and beside the circuit
  let crateMesh = null; (await load('models/crate.glb')).traverse(o => { if (!crateMesh && o.isMesh) crateMesh = o; });
  const crateAt = (x, z) => { const m = shadows(new THREE.Mesh(crateMesh.geometry, crateMesh.material)); const g = new THREE.Group(); g.add(m); fit(g, 1.1); g.position.x = x; g.position.z = z; g.rotation.y = rnd() * 3; scene.add(g); addProp(g, 0.6, 1, true); };
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; crateAt(Math.sin(a) * 21.5, Math.cos(a) * 21.5); }
  for (let i = 0; i < 8; i++) { const t = (i + 0.3) / 8, p = pathCurve.getPointAt(t), n = pathCurve.getTangentAt(t), sd = new THREE.Vector3(-n.z, 0, n.x).multiplyScalar(i % 2 ? ROAD_HALF + 2.5 : -(ROAD_HALF + 2.5)); crateAt(p.x + sd.x, p.z + sd.z); }
  for (let i = 0; i < 5; i++) { const t = (i + 0.7) / 5, p = pathCurve.getPointAt(t); for (let k = 0; k < 4; k++) { const c = await place('models/pylon.glb', p.x + (k - 1.5) * 1.4, p.z + 3, 1); addProp(c, 0.45, 0.5); } }
  for (let i = 0; i < 4; i++) { const t = (i + 0.15) / 4, p = pathCurve.getPointAt(t), b = await place('models/barrierRed.glb', p.x - 6, p.z - 6, 1, rnd() * 3); addProp(b, 1, 1.2); }
}

// ---------- car ----------
let car = null, wheels = [], carIdx = 0;
const SPAWN = { x: 0, z: 0, yaw: 0 };
const state = { x: SPAWN.x, z: SPAWN.z, vx: 0, vz: 0, yaw: SPAWN.yaw, steer: 0, y: 0, vy: 0, dead: 0 };
async function setCar(i) {
  carIdx = i; const c = CARS[i];
  const src = await load(`cars/${c.file}.glb`);
  if (car) scene.remove(car);
  car = shadows(src.clone(true)); car.scale.setScalar(1.6); car.rotation.order = 'YXZ';
  wheels = []; car.traverse(o => { if (/wheel/i.test(o.name)) wheels.push({ o, front: /front/i.test(o.name) }); });
  // headlights: glowing bulbs, soft beams and a real spotlight (stronger at night)
  const b = new THREE.Box3().setFromObject(car), sc = car.scale.x, front = b.max.z / sc - 0.03, hy = (b.min.y + (b.max.y - b.min.y) * 0.38) / sc, hw = (b.max.x - b.min.x) * 0.3 / sc;
  const beamMat = new THREE.MeshBasicMaterial({ color: '#fff2c4', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (const sx of [-hw, hw]) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff7d6' })); bulb.position.set(sx, hy, front); car.add(bulb);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.6, 20, 1, true), beamMat); cone.rotation.x = -Math.PI / 2; cone.position.set(sx, hy - 0.1, front + 1.8); car.add(cone);
  }
  car.userData.beam = beamMat;
  const head = new THREE.SpotLight('#fff2c4', 0, 26, 0.55, 0.6, 1.2); head.position.set(0, hy, front); head.target.position.set(0, 0, front + 6); car.add(head, head.target); car.userData.head = head;
  scene.add(car);
  document.querySelectorAll('.car').forEach((b, k) => b.classList.toggle('on', k === i));
  try { localStorage.setItem('ew-car', i); } catch (e) {}
}
function respawn() { Object.assign(state, { x: SPAWN.x, z: SPAWN.z, vx: 0, vz: 0, yaw: SPAWN.yaw, y: 0, vy: 0, dead: 0 }); if (car) car.visible = true; }

// skid marks + dust
const skidN = 400, skid = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.28, 0.6), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.28, depthWrite: false }), skidN);
skid.count = 0; scene.add(skid); let skidI = 0;
const SM = new THREE.Matrix4(), SQ = new THREE.Quaternion(), SV = new THREE.Vector3(), SS = new THREE.Vector3(1, 1, 1), XAX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
function addSkid(x, z, yaw) { SQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(XAX); SM.compose(SV.set(x, 0.07, z), SQ, SS); skid.setMatrixAt(skidI, SM); skidI = (skidI + 1) % skidN; skid.count = Math.min(skidN, skid.count + 1); skid.instanceMatrix.needsUpdate = true; }
const dustGeo = new THREE.SphereGeometry(0.35, 6, 4);
function dust(x, z) { const m = new THREE.Mesh(dustGeo, new THREE.MeshBasicMaterial({ color: '#e9dcc0', transparent: true, opacity: 0.6, depthWrite: false })); m.position.set(x, 0.3, z); scene.add(m); fx.push({ mesh: m, v: new THREE.Vector3((rnd() - 0.5) * 2, 1.2, (rnd() - 0.5) * 2), life: 0.6, max: 0.6, grow: 2.2, dust: true }); }

// ---------- input ----------
const keys = {}; const joy = { x: 0, y: 0 }; let boostBtn = false, brakeBtn = false;
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyE' && near && !anyOpen()) visit(near.links[0][1]);
  if (e.code === 'KeyR') respawn();
  if (e.code === 'KeyC') show('start');
  if (e.code === 'Escape') closeAll();
  if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
{
  const j = $('joy'), knob = $('knob'); let id = null;
  const move = e => { const r = j.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), m = r.width / 2 - 20, l = Math.min(1, Math.hypot(dx, dy) / m), a = Math.atan2(dy, dx); joy.x = Math.cos(a) * l; joy.y = Math.sin(a) * l; knob.style.transform = `translate(${joy.x * m}px,${joy.y * m}px)`; };
  j.addEventListener('pointerdown', e => { id = e.pointerId; j.setPointerCapture(id); move(e); });
  j.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
  const end = () => { id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end);
  const hold = (el, set) => { el.addEventListener('pointerdown', e => { e.preventDefault(); set(true); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => el.addEventListener(ev, () => set(false))); };
  hold($('tBoost'), v => boostBtn = v); hold($('tBrake'), v => brakeBtn = v);
}
const anyOpen = () => document.querySelector('.over.on');
function show(id) { closeAll(); $(id).classList.add('on'); }
function closeAll() { document.querySelectorAll('.over').forEach(o => o.classList.remove('on')); }
function openStop(s) { $('infoBody').innerHTML = s.html; show('info'); }
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeAll));
document.querySelectorAll('.over').forEach(o => o.addEventListener('pointerdown', e => { if (e.target === o && o.id !== 'start') closeAll(); }));
$('bHelp').onclick = () => show('help'); $('bCars').onclick = () => show('start');
let music = null, soundOn = true; try { soundOn = localStorage.getItem('ew-sound') !== '0'; } catch (e) {}
const setSound = on => { soundOn = on; $('bSound').textContent = on ? 'Sound on' : 'Sound off'; try { localStorage.setItem('ew-sound', on ? '1' : '0'); } catch (e) {} if (music) on ? music.play().catch(() => {}) : music.pause(); };
$('bSound').onclick = () => { if (!music) { music = new Audio('sound/music.mp3'); music.loop = true; music.volume = 0.35; } setSound(!soundOn || music.paused); };
setSound(soundOn);
$('go').onclick = () => { closeAll(); started = true; if (!music) { music = new Audio('sound/music.mp3'); music.loop = true; music.volume = 0.35; } setSound(soundOn); };
const visit = u => { if (u.startsWith('/')) location.href = u; else window.open(u, '_blank', 'noopener'); };
let shownStop = null;
$('cars').innerHTML = CARS.map((c, i) => `<button class="car" type="button" data-i="${i}">${c.name}<small>${c.note}</small><div class="bar"><i style="width:${Math.round(c.speed / 34 * 100)}%"></i></div><div class="bar"><i style="width:${Math.round(c.grip / 6 * 100)}%"></i></div></button>`).join('');
document.querySelectorAll('.car').forEach(b => b.onclick = () => setCar(+b.dataset.i));

// ---------- minimap ----------
const mapc = $('mapc').getContext('2d'), MS = 150 / (R + 8);
function drawMap() {
  const c = mapc; c.clearRect(0, 0, 300, 300); c.save(); c.translate(150, 150);
  c.fillStyle = '#123b57'; c.fillRect(-150, -150, 300, 300);
  c.fillStyle = '#e9d3a1'; c.beginPath(); c.arc(0, 0, R * MS, 0, 7); c.fill(); c.fillStyle = '#7cae55'; c.beginPath(); c.arc(0, 0, (R - 9) * MS, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 5; c.beginPath(); pathCurve.getSpacedPoints(80).forEach((p, i) => i ? c.lineTo(p.x * MS, p.z * MS) : c.moveTo(p.x * MS, p.z * MS)); c.closePath(); c.stroke();
  stops.forEach(s => { c.fillStyle = s.color; c.beginPath(); c.arc(s.pos.x * MS, s.pos.z * MS, 8, 0, 7); c.fill(); });
  c.translate(state.x * MS, state.z * MS); c.rotate(-state.yaw + Math.PI);
  c.fillStyle = '#000'; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -13); c.lineTo(9, 10); c.lineTo(-9, 10); c.closePath(); c.fill(); c.stroke(); c.restore();
}

// ---------- loop ----------
let lastGh = 0, started = false, near = null, last = performance.now(), shake = 0, timeAcc = 99, skidT = 0;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), CAM = new THREE.Vector3(10, 16, 14);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); tilt.uniforms.uRes.value.set(w, h); tilt.uniforms.uAmt.value = w < h ? 1.8 : 2.6; camera.aspect = w / h; camera.fov = w < h ? 58 : 40; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

function update(dt, t) {
  if ((timeAcc += dt) > 30) { timeAcc = 0; setTime(); }
  const c = CARS[carIdx], drive = started && !anyOpen() && !state.dead;
  let thr = 0, st = 0, boost = false, brake = false;
  if (drive) {
    const jx = Math.abs(joy.x) < 0.12 ? 0 : joy.x;
    thr = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.y;
    st = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0) - jx;
    boost = keys.ShiftLeft || keys.ShiftRight || boostBtn; brake = keys.Space || brakeBtn;
  }
  thr = clamp(thr, -1, 1); st = clamp(st, -1, 1);
  // arcade car with drift: velocity slides, grip pulls it back in line with the nose
  const fx_ = Math.sin(state.yaw), fz = Math.cos(state.yaw), fwdSpeed = state.vx * fx_ + state.vz * fz;
  const sideX = fz, sideZ = -fx_, sideSpeed = state.vx * sideX + state.vz * sideZ;
  const top = c.speed * (boost ? 1.4 : 1), acc = thr > 0 ? (fwdSpeed < top ? 26 * thr : 0) : thr < 0 ? (fwdSpeed > -10 ? (fwdSpeed > 0 ? 40 : 16) * thr : 0) : 0;
  state.vx += fx_ * acc * dt; state.vz += fz * acc * dt;
  const grip = (brake ? 1.2 : c.grip) * (state.y > groundAt(state.x, state.z) + 0.15 ? 0.05 : 1);
  state.vx -= sideX * sideSpeed * Math.min(1, grip * dt); state.vz -= sideZ * sideSpeed * Math.min(1, grip * dt);
  const drag = Math.pow(thr === 0 ? 0.55 : 0.82, dt) * (brake ? Math.pow(0.15, dt) : 1);
  state.vx *= drag; state.vz *= drag;
  state.steer += (st - state.steer) * Math.min(1, dt * 9);
  state.yaw += state.steer * 2.6 * clamp(fwdSpeed / 8, -1, 1) * dt;
  state.x += state.vx * dt; state.z += state.vz * dt;
  const gh = groundAt(state.x, state.z);
  state.vy -= 24 * dt; state.y += state.vy * dt;
  if (state.y <= gh) { state.vy = Math.max(0, (gh - lastGh) / Math.max(dt, 0.001)); state.y = gh; } // on the ground or riding up a ramp
  const airborne = state.y > gh + 0.15; lastGh = gh;
  // edges and solid things
  const r = Math.hypot(state.x, state.z);
  if (r > R - 3) { const k = (R - 3) / r; state.x *= k; state.z *= k; state.vx *= 0.3; state.vz *= 0.3; }
  for (const s of solids) { const dx = state.x - s.x, dz = state.z - s.z, d = Math.hypot(dx, dz), m = s.r + 1.2; if (d < m && d > 0.001) { state.x = s.x + dx / d * m; state.z = s.z + dz / d * m; const vn = (state.vx * dx + state.vz * dz) / d; if (vn < 0) { state.vx -= dx / d * vn * 1.4; state.vz -= dz / d * vn * 1.4; } } }
  // knock things over (explosive barrels go boom)
  const sp = Math.hypot(state.vx, state.vz);
  for (const p of props) {
    if (p.gone) { if ((p.gone -= dt) <= 0) { p.gone = 0; p.obj.visible = true; p.obj.position.copy(p.home); p.obj.rotation.copy(p.homeRot); p.v.set(0, 0, 0); p.spin.set(0, 0, 0); } continue; }
    const o = p.obj.position, dx = o.x - state.x, dz = o.z - state.z, d = Math.hypot(dx, dz);
    if (d < p.r + 1.3 && o.y < p.y0 + 2) {
      if (p.explosive && sp > 6) { explode(o.clone()); p.obj.visible = false; p.gone = 12; continue; }
      const k = Math.min(7, (sp * 0.35 + 1.5) / p.mass); p.v.x += dx / d * k; p.v.z += dz / d * k; p.v.y += Math.min(2, k * 0.15); p.spin.set((rnd() - 0.5) * k * 0.8, (rnd() - 0.5) * k * 0.5, (rnd() - 0.5) * k * 0.8); // tip and slide, no flying
      state.vx *= 1 - 0.08 * p.mass; state.vz *= 1 - 0.08 * p.mass;
    }
    if (p.v.lengthSq() > 0.0004 || o.y > p.y0 + 0.01) {
      p.v.y -= 22 * dt; o.addScaledVector(p.v, dt);
      p.obj.rotation.x += p.spin.x * dt; p.obj.rotation.y += p.spin.y * dt; p.obj.rotation.z += p.spin.z * dt;
      if (o.y < p.y0) { o.y = p.y0; p.v.y = Math.abs(p.v.y) > 2 ? -p.v.y * 0.35 : 0; p.v.x *= 0.5; p.v.z *= 0.5; p.spin.multiplyScalar(0.5); }
      p.v.x *= Math.pow(0.15, dt); p.v.z *= Math.pow(0.15, dt); // ground friction
      if (Math.hypot(o.x, o.z) > R + 2) { p.obj.visible = false; p.gone = 10; }
    }
  }
  if (car) {
    car.position.set(state.x, state.y, state.z); car.rotation.set(0, state.yaw, 0);
    if (airborne) car.rotation.x = clamp(-state.vy * 0.03, -0.5, 0.5); else if (gh > 0) car.rotation.x = -0.21;
    wheels.forEach(w => { w.o.rotation.x += fwdSpeed * dt / 0.4; if (w.front) w.o.rotation.y = state.steer * 0.5; });
    if (Math.abs(sideSpeed) > 4.5 && !airborne && (skidT += dt) > 0.025) { skidT = 0; for (const s of [-0.55, 0.55]) addSkid(state.x - fx_ * 1.1 + sideX * s, state.z - fz * 1.1 + sideZ * s, state.yaw); if (rnd() < 0.5) dust(state.x - fx_ * 1.3, state.z - fz * 1.3); }
    if (boost && thr > 0 && rnd() < 0.3) dust(state.x - fx_ * 1.4, state.z - fz * 1.4);
  }
  // camera: high angle, fixed direction, follows the car
  const menu = !started || $('start').classList.contains('on');
  const off = menu ? new THREE.Vector3(Math.sin(t * 0.12) * 11, 6.5, Math.cos(t * 0.12) * 11) : CAM.clone().multiplyScalar(innerWidth < innerHeight ? 1.25 : 1);
  camPos.set(state.x, 0, state.z).add(off); camera.position.lerp(camPos, 1 - Math.pow(menu ? 0.2 : 0.02, dt));
  camLook.set(state.x + state.vx * 0.15, 0.8, state.z + state.vz * 0.15);
  camera.lookAt(camLook);
  if (TOP) { camera.position.set(0, 175, 0.01); camera.lookAt(0, 0, 0); scene.fog.near = 400; scene.fog.far = 900; $('start').classList.remove('on'); } // ?top=1: whole-island check view
  if (shake > 0) { const k = shake * shake; camera.position.x += Math.sin(t * 38) * k * 0.6; camera.position.y += Math.sin(t * 31 + 1.3) * k * 0.4; shake = Math.max(0, shake - dt * 1.8); } // smooth, short wobble
  sun.position.set(state.x + 30 * Math.cos(istHour / 24 * 6.28), 60, state.z + 25); sun.target.position.set(state.x, 0, state.z);
  // effects
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.life -= dt; const k = Math.max(0, f.life / f.max);
    if (f.mesh) { f.v.y -= (f.dust ? 0 : 14) * dt; f.mesh.position.addScaledVector(f.v, dt); f.mesh.scale.setScalar(1 + (1 - k) * f.grow); f.mesh.material.opacity = k * (f.dust ? 0.6 : 1); }
    if (f.ring) { f.ring.scale.setScalar(1 + (1 - k) * 14); f.ring.material.opacity = k; }
    if (f.light) f.light.intensity = 600 * k;
    if (f.life <= 0) { const o = f.mesh || f.ring || f.light; scene.remove(o); o.geometry?.dispose?.(); o.material?.dispose?.(); fx.splice(i, 1); }
  }
  spinners.forEach(s => { if (s.flag) s.flag.rotation.y = Math.sin(t * 2 + s.k) * 0.3; else if (s.isGroup) s.rotation.z += dt * 1.6; else s.rotation.y += dt * 0.8; });
  windU.value = t; waterMat.uniforms.uTime.value = t; waterMat.uniforms.uGlint.value = 0.4 + (1 - night) * 0.6;
  stars.material.opacity = night; flies.material.opacity = night * (0.6 + 0.4 * Math.sin(t * 3));
  flies.position.y = Math.sin(t * 0.7) * 0.4;
  if (car?.userData.beam) { car.userData.beam.opacity = night * 0.02; car.userData.head.intensity = night * 60; }
  lamps.forEach(l => { l.warm.intensity = night * 30; l.pool.visible = false; l.pool.material.opacity = night * 0.16; l.bulb.material.color.set(night > 0.3 ? '#ffe2a8' : '#cfcfcf'); });
  // stops
  near = null;
  stops.forEach(s => { const d = Math.hypot(s.pos.x - state.x, s.pos.z - state.z), inside = d < 3.6; s.disc.material.opacity = inside ? 0.3 : 0.06; s.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.03); if (inside) near = s; if (s.pearl) s.pearl.material.emissiveIntensity = 0.4 + night * 0.8 + Math.sin(t * 2) * 0.15; });
  $('prompt').classList.toggle('on', !!near && started && !anyOpen());
  if (near && near !== shownStop) {
    shownStop = near; $('ptitle').textContent = near.title; $('psub').textContent = near.sub;
    $('plinks').innerHTML = near.links.map((l, i) => `<a class="btn${i ? ' o' : ''}" href="${l[1]}" ${l[1].startsWith('/') ? '' : 'target="_blank" rel="noopener"'}>${l[0]}${i || touch ? '' : ' <kbd style="background:rgba(0,0,0,.12);color:#000">E</kbd>'}</a>`).join('');
  }
  if (!near) shownStop = null;
  $('kmh').textContent = Math.round(sp * 3.6);
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt, now / 1000);
  composer.render();
  drawMap();
  requestAnimationFrame(loop);
}

// ---------- loading screen: facts that make you stop, plus live headlines ----------
const FACTS = [
  ['Risk, priced', 'A 1-in-100-year flood has a 26% chance of hitting at least once in 30 years.', '1 − 0.99³⁰. The name lies; the maths doesn\'t.'],
  ['Risk, priced', 'Put 23 people in a room. There\'s a 50% chance two share a birthday.', 'The birthday problem. Intuition is a terrible actuary.'],
  ['History', 'Lloyd\'s of London started as a coffee house, around 1688.', 'Ship captains swapped news. Merchants priced the risk.'],
  ['History', 'The first proper life table was built in 1693 by Edmond Halley.', 'Yes, the comet guy. He priced annuities too.'],
  ['Space', 'Of 10,000+ active satellites, only about 300 are insured.', 'Low orbit is crowded, and mostly self-insured.'],
  ['India', 'The monsoon brings roughly three-quarters of India\'s yearly rain in four months.', 'Which is why a weak one is a pricing problem.'],
  ['Prasanna', '5,000+ merchants reviewed for risk at Dodo Payments.', 'Business models, transaction flows, chargebacks.'],
  ['Prasanna', 'Two research papers. Two Best Paper awards.', 'War risk (ACTSUM 2024) and autonomous vehicles (ACTCON 2025).'],
  ['Prasanna', '50+ Model UN conferences. Chaired about 85% of formats.', 'Diplomacy as a contact sport.'],
];
let factI = 0;
function showFact() {
  const [tag, text, src] = FACTS[factI++ % FACTS.length], el = $('fact');
  el.classList.add('out');
  setTimeout(() => { $('ftag').textContent = tag; el.textContent = text; $('factsrc').textContent = src; el.classList.remove('out'); }, 350);
}
showFact(); const factTimer = setInterval(showFact, 4200);
(() => { const tick = () => { const n = new Date(), h = (n.getUTCHours() + 5.5 + n.getUTCMinutes() / 60) % 24; $('lclock').textContent = `Bengaluru ${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor(h % 1 * 60)).padStart(2, '0')}`; }; tick(); setInterval(tick, 20000); })();
fetch('/api/news').then(r => r.ok ? r.json() : null).then(j => {
  if (!j || !j.items || !j.items.length) { $('news').innerHTML = '<span style="color:#6e6e73">Headlines unavailable right now</span>'; return; }
  const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const row = j.items.map(i => `<a href="${esc(i.link)}" target="_blank" rel="noopener">${esc(i.title)}</a>`).join('');
  $('news').innerHTML = `<div class="rail">${row}${row}</div>`;
}).catch(() => { $('news').innerHTML = '<span style="color:#6e6e73">Headlines unavailable right now</span>'; });
const setLoad = v => { $('lnum').textContent = Math.round(v) + '%'; };

// ---------- boot ----------
(async () => {
  const bar = { style: {} }; const _w = Object.defineProperty(bar.style, 'width', { set: v => setLoad(parseFloat(v)) }); setTime();
  await document.fonts?.ready; bar.style.width = '15%';
  for (let i = 0; i < STOPS.length; i++) { await buildStop(STOPS[i]); bar.style.width = 15 + i * 6 + '%'; }
  await buildScenery(); buildGrass(); bar.style.width = '85%';
  let saved = 0; try { saved = +localStorage.getItem('ew-car') || 0; } catch (e) {}
  await setCar(clamp(saved, 0, CARS.length - 1)); bar.style.width = '100%';
  $('enter').classList.add('on'); $('lnum').textContent = 'Ready';
  $('enter').onclick = () => { clearInterval(factTimer); $('load').classList.add('off'); };
  if (TOP) $('load').classList.add('off');
  requestAnimationFrame(loop);
})();
