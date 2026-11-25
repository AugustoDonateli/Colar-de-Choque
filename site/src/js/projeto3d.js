import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// O 3D só começa quando a aba "Projeto 3D" é aberta pela primeira vez.
let iniciado = false;
async function iniciar() {
  if (iniciado) { window.dispatchEvent(new Event('resize')); return; }
  iniciado = true;
const msg = document.getElementById('msg');
try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]); } catch (e) {}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const stage = document.getElementById('stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (e) {
  msg.textContent = 'Este navegador não conseguiu abrir o 3D (WebGL desligado). Tente outro navegador ou outro aparelho.';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(stage.clientWidth, stage.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(stage.clientWidth, stage.clientHeight);
Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(32, stage.clientWidth / stage.clientHeight, 0.1, 600);
const HOME = { pos: V(25, 16.5, 33), target: V(0, 0.5, 0) };
camera.position.copy(HOME.pos);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 7;
controls.maxDistance = 120;
controls.autoRotateSpeed = 1.2;

scene.add(new THREE.HemisphereLight(0xffffff, 0xaeb6bf, 0.6));
const key = new THREE.DirectionalLight(0xffffff, 2.3);
key.position.set(14, 32, 18);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 110 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
scene.add(key);
const rim = new THREE.DirectionalLight(0xdde7ff, 0.9);
rim.position.set(-20, 12, -18);
scene.add(rim);

// ---------- helpers ----------
const maxAniso = renderer.capabilities.getMaxAnisotropy();
function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function M(color, o = {}) { return new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.5, metalness: 0 }, o)); }
const steel = () => M(0xd8dde2, { metalness: 1, roughness: 0.24 });
const tin = () => M(0xc9ccd0, { metalness: 1, roughness: 0.32 });
const gold = () => M(0xd9b45a, { metalness: 1, roughness: 0.3 });
function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
function rbox(w, h, d, r, mat, x = 0, y = 0, z = 0, seg = 3) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), mat); m.position.set(x, y, z); return m; }
function cyl(r, h, mat, x = 0, y = 0, z = 0, seg = 32, axis = 'y') { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2; m.position.set(x, y, z); return m; }
function rr(Klass, w, d, r) {
  const s = new Klass(); const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function extrudeRR(w, d, r, depth, bevel = 0, wall = 0) {
  const s = rr(THREE.Shape, w, d, r);
  if (wall > 0) s.holes.push(rr(THREE.Path, w - 2 * wall, d - 2 * wall, Math.max(0.08, r - wall)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 12 });
  g.rotateX(-Math.PI / 2);
  return g;
}
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }
function board(w, t, d, color, tex, x = 0, y = 0, z = 0) {
  const edge = M(color, { roughness: 0.55 });
  const top = M(0xffffff, { map: tex, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), [edge, edge, top, edge, edge, edge]);
  m.position.set(x, y, z); return m;
}
const PX = 128;
function pcbTex(wcm, dcm, base, draw) {
  return canvasTex(Math.round(wcm * PX), Math.round(dcm * PX), (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.07; g.strokeStyle = '#fff';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(Math.random() * w, 0); g.bezierCurveTo(Math.random() * w, h * 0.3, Math.random() * w, h * 0.7, Math.random() * w, h); g.lineWidth = 3; g.stroke(); }
    g.globalAlpha = 1; draw(g, w, h);
  });
}
function txt(g, s, x, y, px, color = '#fff', align = 'center', weight = 600, rot = 0) {
  g.save(); g.translate(x, y); if (rot) g.rotate(rot);
  g.font = `${weight} ${px}px "IBM Plex Mono", ui-monospace, monospace`;
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, 0, 0); g.restore();
}
function pad(g, x, y, s, color = '#d9b45a') { g.fillStyle = color; g.fillRect(x - s / 2, y - s / 2, s, s); }

// ---------- registry ----------
const device = new THREE.Group();
scene.add(device);
const comps = {};
const pickables = [];
function reg(id, group, info) {
  group.traverse(o => {
    if (o.isMesh) {
      o.userData.compId = id; o.castShadow = true; o.receiveShadow = true; pickables.push(o);
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => { m.userData.baseEmissive = m.emissive ? m.emissive.clone() : null; m.userData.baseEmissiveIntensity = m.emissiveIntensity; });
    }
  });
  device.add(group);
  comps[id] = Object.assign({ id, group, base: group.position.clone(), baseRot: group.rotation.clone(), explode: info.explode || V(0, 0, 0), glow: 0 }, info);
  return comps[id];
}
function matsOf(id) { const out = []; comps[id].group.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => out.push(m)); }); return out; }

// ---------- caixa (base) ----------
const whiteABS = () => M(0xf1f2ee, { roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.45 });
{
  const g = new THREE.Group();
  const mat = whiteABS();
  g.add(mesh(extrudeRR(9.92, 9.92, 0.6, 0.22, 0.04), mat, 0, 0.04, 0));
  g.add(mesh(extrudeRR(10, 10, 0.65, 5.1, 0, 0.25), mat, 0, 0.3, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(cyl(0.45, 5.0, mat, sx * 4.05, 2.8, sz * 4.05, 24));
    g.add(cyl(0.16, 0.02, M(0x6d7177, { roughness: 0.6 }), sx * 4.05, 5.31, sz * 4.05, 16));
  }
  const molded = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#f1f2ee'; c.fillRect(0, 0, w, h);
    txt(c, 'IP65', w / 2, h / 2 - 22, 40, '#c9cbc6', 'center', 600);
    txt(c, '100 × 100', w / 2, h / 2 + 24, 26, '#c9cbc6', 'center', 500);
  });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), M(0xffffff, { map: molded, roughness: 0.5, transparent: true }));
  plate.rotation.x = Math.PI / 2; plate.position.set(-2.4, -0.005, -2.4);
  g.add(plate);
  reg('caixa', g, { name: 'Caixa hermética 10 × 10 × 7 cm', what: 'Protege tudo da água e da poeira (IP66). A borracha da tampa faz a vedação; todo furo leva silicone. Por dentro, dois andares: bateria e módulo de alta tensão embaixo, placa de controle em cima.', cost: 'R$ 28,97 (com tampa transparente)', side: 'fora', label: V(-5.4, 3.6, 5.2), xray: true });
}

// ---------- tampa ----------
const lid = new THREE.Group();
{
  const mat = M(0xe4eef4, { transparent: true, opacity: 0.24, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false });
  const rubber = M(0x1d1f22, { roughness: 0.85 });
  lid.add(mesh(extrudeRR(9.75, 9.75, 0.55, 0.08, 0, 0.3), rubber, 0, 5.4, 0));
  lid.add(mesh(extrudeRR(9.86, 9.86, 0.6, 1.35, 0, 0.22), mat, 0, 5.53, 0));
  lid.add(mesh(extrudeRR(9.86, 9.86, 0.6, 0.25, 0.05), mat, 0, 6.88, 0));
  lid.add(mesh(extrudeRR(9.36, 9.36, 0.45, 0.32, 0, 0.14), mat, 0, 5.1, 0));
  const sticker = canvasTex(512, 116, (c, w, h) => {
    c.fillStyle = '#14181c'; c.fillRect(0, 0, w, h);
    txt(c, 'COLEIRA · PROTÓTIPO 1 · v2', 20, 36, 24, '#fff', 'left', 600);
    txt(c, 'Desligue antes de abrir', 20, 84, 20, '#cfd3d8', 'left', 500);
    c.fillStyle = '#e3a000'; c.fillRect(w - 178, 62, 160, 36);
    txt(c, 'ALTA TENSÃO', w - 98, 80, 19, '#14181c', 'center', 600);
  });
  const st = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.0), M(0xffffff, { map: sticker, roughness: 0.6 }));
  st.rotation.x = -Math.PI / 2; st.position.set(0, 7.145, -3.95);
  lid.add(st);
  lid.userData.screws = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const s = new THREE.Group();
    s.add(cyl(0.33, 0.14, steel(), 0, 0.07, 0, 24));
    const dark = M(0x2a2d31, { roughness: 0.5 });
    s.add(box(0.46, 0.04, 0.06, dark, 0, 0.13, 0));
    s.add(box(0.06, 0.04, 0.46, dark, 0, 0.13, 0));
    s.add(cyl(0.13, 5.9, steel(), 0, -2.95, 0, 12));
    s.position.set(sx * 4.05, 7.1, sz * 4.05);
    s.userData.base = s.position.clone();
    lid.add(s); lid.userData.screws.push(s);
  }
  reg('tampa', lid, { name: 'Tampa transparente com borracha', what: 'Tampa alta: a caixa tem 7 cm de altura contando com ela. Fecha com 4 parafusos plásticos de 1/4 de volta, dois deles servem de dobradiça; abre com chave de fenda. Por ela dá para ver o LED do ESP32 (pareamento, bateria fraca) e as luzes do carregador (vermelha carregando, azul cheia) sem abrir a caixa. A borracha preta precisa estar limpa para vedar. A tampa transparente é só do protótipo: na versão de venda ela é cinza e a luz de carga vai para um LED vedado ao lado do USB-C.', cost: 'Vem com a caixa', side: 'fora', label: V(4.9, 7.4, -4.6), xray: true, explode: V(0, 2.5, 0) });
  lid.traverse(o => { if (o.isMesh && o.material.transparent && o.material.opacity < 0.5) o.castShadow = false; });
}

// ---------- protetor TPU ----------
{
  const g = new THREE.Group();
  const tpu = M(0x2a2e33, { roughness: 0.82, sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color(0x60666e) });
  g.add(mesh(extrudeRR(10.74, 10.74, 0.95, 2.6, 0, 0.35), tpu, 0, 0.15, 0));
  for (const sx of [-1, 1]) {
    const x = sx * 6.1;
    g.add(rbox(1.5, 0.5, 6.2, 0.15, tpu, x, 1.55, 0));
    g.add(rbox(1.5, 0.5, 6.2, 0.15, tpu, x, 0.45, 0));
    g.add(rbox(1.5, 0.62, 0.45, 0.1, tpu, x, 1.0, 2.875));
    g.add(rbox(1.5, 0.62, 0.45, 0.1, tpu, x, 1.0, -2.875));
  }
  reg('protetor', g, { name: 'Protetor de TPU (impresso)', what: 'Abraça a caixa, amortece pancada de cerca e de queda e prende a fita pelas duas orelhas.', cost: 'Impresso na A1 Mini em TPU', side: 'fora', label: V(6.9, 2.2, 3.4), xray: true });
}

// ---------- fita, fivela, elo ----------
const strapPts = [[5.3, 1.0], [7.3, 0.95], [9.4, -0.4], [11.7, -3.8], [13.4, -8.8], [13.7, -14.4], [12.3, -20], [8.9, -24.6], [4.3, -27.4], [0, -28.3], [-4.3, -27.4], [-8.9, -24.6], [-12.3, -20], [-13.7, -14.4], [-13.4, -8.8], [-11.7, -3.8], [-9.4, -0.4], [-7.3, 0.95], [-5.3, 1.0]].map(p => V(p[0], p[1], 0));
const strapCurve = new THREE.CatmullRomCurve3(strapPts, false, 'centripetal');
function ribbon(curve, t0, t1, width, thick, segs) {
  const pos = [], nor = [], uv = [], idx = [];
  const hw = width / 2, ht = thick / 2, Z = V(0, 0, 1);
  let len = 0, prev = null;
  const faces = [[1, 1, 1, -1], [1, -1, -1, -1], [-1, -1, -1, 1], [-1, 1, 1, 1]];
  const rings = [];
  for (let i = 0; i <= segs; i++) {
    const t = t0 + (t1 - t0) * i / segs;
    const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const n = V(-tg.y, tg.x, 0).normalize();
    if (prev) len += p.distanceTo(prev); prev = p;
    rings.push({ p, n, len });
  }
  for (let f = 0; f < 4; f++) {
    const [na, za, nb, zb] = faces[f];
    const base = pos.length / 3;
    rings.forEach(r => {
      const a = r.p.clone().addScaledVector(r.n, na * ht).addScaledVector(Z, za * hw);
      const b = r.p.clone().addScaledVector(r.n, nb * ht).addScaledVector(Z, zb * hw);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      const fn = f === 0 ? r.n : f === 2 ? r.n.clone().negate() : (f === 1 ? V(0, 0, -1) : V(0, 0, 1));
      nor.push(fn.x, fn.y, fn.z, fn.x, fn.y, fn.z);
      uv.push(r.len / 5, f % 2 === 0 ? 1 : 0.5, r.len / 5, f % 2 === 0 ? 0 : 0.5);
    });
    for (let i = 0; i < segs; i++) {
      const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}
const webTex = canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#191a1c'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#2b2d31'; c.lineWidth = 3;
  for (let i = -h; i < w + h; i += 9) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h * 0.6, h); c.stroke(); }
  c.fillStyle = '#26282c'; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14);
}, { repeat: true });
{
  const g = new THREE.Group();
  const web = M(0xffffff, { side: THREE.DoubleSide, map: webTex, bumpMap: webTex, bumpScale: 0.6, roughness: 0.88, sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color(0x3a3e44) });
  g.add(new THREE.Mesh(ribbon(strapCurve, 0, 0.475, 5, 0.22, 260), web));
  g.add(new THREE.Mesh(ribbon(strapCurve, 0.525, 1, 5, 0.22, 260), web));
  reg('fita', g, { name: 'Fita de 50 mm', what: 'Vai em volta do pescoço. Fica justa, com dois dedos de folga entre a fita e o couro.', cost: '1,5 m de fita de poliéster, uns R$ 10', side: 'fora', label: V(13.9, -9, 2.8) });
}
{
  const g = new THREE.Group();
  const plastic = M(0x121315, { roughness: 0.35, clearcoat: 0.4 });
  const p = strapCurve.getPointAt(0.5);
  g.add(rbox(3.2, 1.05, 5.9, 0.3, plastic, 0.9, 0, 0));
  g.add(rbox(2.0, 0.7, 5.2, 0.2, plastic, -1.3, 0, 0));
  g.add(rbox(1.2, 0.5, 0.5, 0.15, plastic, -0.9, 0, 2.75));
  g.add(rbox(1.2, 0.5, 0.5, 0.15, plastic, -0.9, 0, -2.75));
  g.add(box(0.6, 0.06, 3.0, M(0x2a2c30, { roughness: 0.6 }), 0.9, 0.53, 0));
  g.position.copy(p);
  reg('fivela', g, { name: 'Fivela de engate rápido 50 mm', what: 'Abre e fecha a coleira para colocar e tirar do boi.', cost: 'R$ 19,89 o pacote com 10', side: 'fora', label: V(0, -26.9, 3.4) });
}
{
  const g = new THREE.Group();
  const velTex = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#3a3d41'; c.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { c.fillStyle = Math.random() > 0.5 ? '#4a4e53' : '#2c2f33'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, { repeat: true });
  const vel = M(0xffffff, { side: THREE.DoubleSide, map: velTex, roughness: 1, sheen: 0.8, sheenColor: new THREE.Color(0x6a6f76), sheenRoughness: 0.9 });
  g.add(new THREE.Mesh(ribbon(strapCurve, 0.71, 0.765, 5.06, 0.5, 30), vel));
  const red = M(0xc8202a, { roughness: 0.7 });
  const mid = strapCurve.getPointAt(0.738), tg = strapCurve.getTangentAt(0.738), n = V(-tg.y, tg.x, 0);
  const tag = box(0.9, 0.04, 2.2, red); tag.position.copy(mid.clone().addScaledVector(n, 0.27)); tag.lookAt(mid.clone().addScaledVector(n, 2)); tag.rotateX(Math.PI / 2);
  g.add(tag);
  reg('elo', g, { name: 'Elo fraco de velcro', what: 'Une as duas partes da fita com 5 cm de velcro costurado. Se a coleira enroscar numa cerca, ele abre antes de machucar o boi.', cost: '10 cm de velcro, costura de selaria', side: 'fora', label: V(-14.6, -16.5, 2.8) });
}

// ---------- pinos de inox ----------
const PIN_X = [-0.2, 3.8], PIN_Z = 3.6;
{
  const g = new THREE.Group();
  const rubber = M(0x18191b, { roughness: 0.9 });
  const ring = tin();
  PIN_X.forEach(x => {
    g.add(cyl(0.56, 0.06, rubber, x, -0.03, PIN_Z, 28));
    g.add(cyl(0.42, 0.3, steel(), x, -0.21, PIN_Z, 6));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.37, 28, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), steel());
    dome.position.set(x, -0.36, PIN_Z); g.add(dome);
    g.add(cyl(0.35, 0.2, steel(), x, 0.42, PIN_Z, 28));
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 10, 28), ring); t.rotation.x = Math.PI / 2; t.position.set(x, 0.33, PIN_Z); g.add(t);
    g.add(cyl(0.11, 0.55, ring, x + (x < 1 ? 0.45 : -0.45), 0.36, PIN_Z - 0.3, 12, 'x'));
  });
  reg('pinos', g, { name: '2 pinos de inox (porca cega)', what: 'Encostam no couro, a 4 cm um do outro. O pulso sai de um pino, passa pela pele e volta pelo outro. A porca cega é arredondada para não ferir.', cost: 'R$ 28,99 as 10 porcas + parafusos M4', side: 'fora', label: V(1.8, -1.4, 4.8), explode: V(0, -1.8, 0), hv: true });
}

// ---------- USB-C de painel ----------
{
  const g = new THREE.Group();
  const black = M(0x1b1c1f, { roughness: 0.4, metalness: 0.3 });
  g.add(cyl(0.64, 0.22, black, 0, 0, 0.11, 32, 'z'));
  g.add(rbox(0.92, 0.36, 0.14, 0.06, steel(), 0, 0, 0.25));
  g.add(rbox(0.78, 0.22, 0.1, 0.04, M(0x0c0d0e, { roughness: 0.6 }), 0, 0, 0.29));
  const cap = new THREE.Group();
  cap.add(cyl(0.52, 0.2, M(0x16171a, { roughness: 0.85 }), 0, 0, 0, 28, 'z'));
  cap.add(box(0.6, 0.25, 0.08, M(0x16171a, { roughness: 0.85 }), -0.5, 0, -0.02));
  cap.position.set(1.05, -0.15, 0.33); cap.rotation.y = -0.5; g.add(cap);
  g.add(cyl(0.48, 1.1, M(0x2a2c30, { roughness: 0.5, metalness: 0.4 }), 0, 0, -0.8, 28, 'z'));
  const nut = cyl(0.68, 0.2, steel(), 0, 0, -0.38, 6, 'z'); g.add(nut);
  g.position.set(-2.7, 4.0, 5.0);
  reg('usbc', g, { name: 'Conector USB-C vedado', what: 'Carrega a bateria sem abrir a caixa. A tampa de borracha fica fechada durante o uso.', cost: 'R$ 17,44 (R$ 8,46 na 1ª compra)', side: 'fora', label: V(-2.7, 5.0, 5.6), explode: V(0, 0, 2.6) });
}

// ---------- chave liga/desliga ----------
{
  const g = new THREE.Group();
  g.add(cyl(0.55, 0.18, steel(), 0, 0, 0.09, 6, 'z'));
  const boot = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), M(0x141517, { roughness: 0.75 }));
  boot.rotation.x = Math.PI / 2; boot.scale.set(1, 1.5, 1); boot.position.set(0, 0, 0.18); g.add(boot);
  g.add(rbox(0.9, 1.1, 1.3, 0.08, M(0x2f3236, { roughness: 0.55 }), 0, 0, -0.75));
  g.add(box(0.3, 0.06, 0.35, tin(), 0, 0.25, -1.5));
  g.add(box(0.3, 0.06, 0.35, tin(), 0, -0.25, -1.5));
  g.position.set(-5.0, 4.2, 0.5);
  g.rotation.y = -Math.PI / 2;
  reg('chave', g, { name: 'Chave liga/desliga', what: 'Corta a energia de tudo. Fica protegida por uma capa de borracha por fora.', cost: 'R$ 15,73 o pacote com 5', side: 'fora', label: V(-5.9, 3.3, 0.5), explode: V(-2.6, 0, 0) });
}

// ---------- bateria ----------
{
  const g = new THREE.Group();
  g.add(rbox(7.8, 1.15, 2.15, 0.1, M(0x18191c, { roughness: 0.55 }), 0, -0.575, 0));
  g.add(box(0.1, 0.9, 0.7, tin(), -3.85, -0.2, 0));
  g.add(box(0.1, 0.9, 0.7, tin(), 3.6, -0.2, 0));
  const wrap = canvasTex(512, 1024, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#147a74'); gr.addColorStop(0.5, '#1f9b92'); gr.addColorStop(1, '#147a74');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(0, h * 0.08, w, 6); c.fillRect(0, h * 0.92, w, 6);
    for (let k = 0; k < 2; k++) {
      txt(c, 'NCR18650B · 3300 mAh · 3,6 V', w * (0.25 + k * 0.5), h / 2, 34, '#fff', 'center', 600, -Math.PI / 2);
    }
    txt(c, '+', w * 0.5, h * 0.95, 44, '#fff', 'center', 600);
  });
  const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 6.5, 48, 1, true), M(0xffffff, { map: wrap, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
  cell.rotation.z = -Math.PI / 2; g.add(cell);
  g.add(cyl(0.9, 0.04, steel(), 3.25, 0, 0, 40, 'x'));
  g.add(cyl(0.9, 0.04, steel(), -3.25, 0, 0, 40, 'x'));
  g.add(cyl(0.35, 0.12, steel(), 3.33, 0, 0, 24, 'x'));
  const petg = M(0xe07a2f, { roughness: 0.45, clearcoat: 0.3 });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.2, 12, 40, Math.PI), petg);
  arch.rotation.y = Math.PI / 2; arch.position.set(0, 0, 0); g.add(arch);
  g.add(rbox(0.5, 1.2, 0.5, 0.08, petg, 0, -0.55, 1.08));
  g.add(rbox(0.5, 1.2, 0.5, 0.08, petg, 0, -0.55, -1.08));
  g.position.set(0, 1.45, -2.45);
  reg('bateria', g, { name: 'Bateria 18650 + suporte', what: 'Fica no andar de baixo, embaixo da placa. Guarda a energia: 3,6 V e 3.300 mAh. A trava laranja, impressa em PETG, segura a célula quando o boi corre. Os dois fios sobem por um furo da placa até o carregador.', cost: 'R$ 84,90 a bateria + R$ 12,94 o suporte', side: 'dentro', label: V(-2.0, 1.0, -3.9), explode: V(0, 1.4, -3.4) });
}

// ---------- módulo de alta tensão ----------
{
  const g = new THREE.Group();
  g.add(cyl(1.15, 6.4, M(0x131416, { roughness: 0.55, clearcoat: 0.35 }), 0, 0, 0, 40, 'x'));
  const lab = canvasTex(512, 160, (c, w, h) => {
    c.fillStyle = '#f2b705'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#14181c'; c.lineWidth = 8; c.strokeRect(8, 8, w - 16, h - 16);
    txt(c, '⚡ ALTA TENSÃO', w / 2, 62, 46, '#14181c');
    txt(c, 'ENTRADA 3,7–6 V · 6,4 cm', w / 2, 116, 26, '#14181c', 'center', 500);
  });
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), M(0xffffff, { map: lab, roughness: 0.55 }));
  lp.rotation.x = -Math.PI / 2; lp.position.set(0, 1.17, 0); g.add(lp);
  g.add(cyl(0.07, 0.3, M(0xd7262e, { roughness: 0.4 }), 3.3, -0.2, -0.2, 10, 'x'));
  g.add(cyl(0.07, 0.3, M(0x1c1d20, { roughness: 0.4 }), 3.3, -0.2, 0.2, 10, 'x'));
  g.add(cyl(0.11, 0.35, M(0xf3f1ea, { roughness: 0.35 }), -3.35, 0.15, -0.2, 12, 'x'));
  g.add(cyl(0.11, 0.35, M(0xf3f1ea, { roughness: 0.35 }), -3.35, 0.15, 0.2, 12, 'x'));
  g.position.set(0, 1.45, 1.25);
  reg('moduloAT', g, { name: 'Módulo de alta tensão', what: 'Fica deitado no andar de baixo, embaixo da placa. O cilindro tem 6,4 cm de comprimento (medida do anúncio). Transforma os 3,7 V da bateria em milhares de volts com pouca corrente, só enquanto os dois MOSFETs deixam passar.', cost: 'R$ 14,50 o cilindro e R$ 13,52 o bloco (compre os 2 para comparar)', side: 'dentro', label: V(-1.6, 2.85, 1.25), explode: V(0, 1.3, 1.2), hv: true });
}

// ---------- placa de controle (v2) ----------
const BW = 7, BD = 9, BY = 3.2, TOP = 3.28;
const bxz = (x, z) => [(x + BW / 2) * PX, (z + BD / 2) * PX];
const TRACES = [
  ['#d7262e', 22, [[0.3, -1.6], [0.3, 1.4]]],
  ['#2b2c30', 22, [[0.85, -3.0], [0.85, 3.4]]],
  ['#d7262e', 12, [[-1.4, 1.15], [0.3, 1.15]]],
  ['#2b2c30', 12, [[-1.4, 0.88], [0.85, 0.88]]],
  ['#2b2c30', 12, [[-0.75, 3.2], [0.85, 3.2]]],
  ['#2b2c30', 12, [[-0.05, -2.51], [0.85, -2.51]]],
  ['#d7262e', 16, [[0.3, -1.6], [3.3, -1.6]]],
  ['#2b2c30', 16, [[1.25, 0.25], [1.08, 0.25], [1.08, 1.4], [1.25, 1.4]]],
  ['#2b2c30', 16, [[1.25, 1.65], [1.25, 1.95], [0.85, 1.95]]],
  ['#1f9a4f', 12, [[-1.4, 0.34], [-0.25, 0.34], [-0.25, -0.62], [1.25, -0.62], [1.25, -0.25]]],
  ['#1f9a4f', 12, [[-3.0, 0.88], [-3.0, 2.62], [2.2, 2.62], [2.2, 1.15], [1.25, 1.15]]],
  ['#f08a24', 12, [[-1.4, 0.61], [-2.2, 0.61], [-2.2, -3.95], [2.75, -3.95], [2.75, -3.3]]],
  ['#f08a24', 12, [[-0.05, -3.31], [-0.05, -3.95]]],
  ['#e6b800', 12, [[-1.4, 0.07], [-0.8, 0.07], [-0.8, -3.04], [-0.05, -3.04]]],
  ['#2f6fd6', 12, [[-3.0, 1.15], [-3.3, 1.15], [-3.3, -2.3], [1.45, -2.3]]],
  ['#2f6fd6', 12, [[1.7, -2.3], [1.85, -2.85]]],
  ['#f4f4ef', 12, [[-1.4, -0.74], [-1.2, -0.74], [-1.2, -1.25], [0.85, -1.25]]],
  ['#8a9097', 12, [[-1.4, -0.47], [-1.0, -0.47], [-1.0, -1.8], [-0.55, -1.8]]],
  ['#2b2c30', 12, [[-0.15, -1.8], [0.85, -1.8]]]
];
{
  const g = new THREE.Group();
  const tex = canvasTex(BW * PX, BD * PX, (c, w, h) => {
    c.fillStyle = '#c9a46a'; c.fillRect(0, 0, w, h);
    for (let x = 16; x < w; x += 32) for (let y = 16; y < h; y += 32) { c.fillStyle = '#b07a3c'; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); c.fillStyle = '#5a4126'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); }
    c.lineCap = 'round'; c.lineJoin = 'round';
    TRACES.forEach(([col, wd, pts]) => {
      const path = () => { c.beginPath(); pts.forEach(([x, z], i) => { const [px, py] = bxz(x, z); if (i) c.lineTo(px, py); else c.moveTo(px, py); }); };
      path(); c.strokeStyle = 'rgba(244,232,206,.95)'; c.lineWidth = wd + 10; c.stroke();
      path(); c.strokeStyle = col; c.lineWidth = wd; c.stroke();
    });
    const hole = (x, z, r) => { const [px, py] = bxz(x, z); c.fillStyle = '#d9b45a'; c.beginPath(); c.arc(px, py, r + 8, 0, 7); c.fill(); c.fillStyle = '#2a2016'; c.beginPath(); c.arc(px, py, r, 0, 7); c.fill(); };
    hole(-0.38, 1.95, 13); hole(-0.38, 2.38, 13);
    const padAt = (x, z, s) => { const [px, py] = bxz(x, z); pad(c, px, py, s); };
    padAt(0.3, -0.2, 40); padAt(3.3, -1.6, 40);
    const T = (s, x, z, px, col = '#3b2a17') => { const [a, b] = bxz(x, z); txt(c, s, a, b, px, col, 'center', 600); };
    T('+', 0.3, -1.98, 34, '#8a1212'); T('−', 0.85, -3.35, 34, '#111');
    T('AT+', 3.3, -2.0, 20); T('CHAVE', 0.3, -0.58, 17); T('BAT', -0.38, 1.6, 17);
    T('PLACA DE CONTROLE', 1.95, 3.55, 24, '#4a3520'); T('v2 · 7 × 9 cm', 1.95, 3.95, 20, '#5a4126');
  });
  g.add(board(BW, 0.16, BD, 0xc9a46a, tex, 0, BY, 0));
  const cap = new THREE.Group();
  cap.add(cyl(0.5, 1.8, M(0x1c2a52, { roughness: 0.35, clearcoat: 0.6 }), 0, 0.9, 0, 32));
  cap.add(cyl(0.5, 0.03, tin(), 0, 1.81, 0, 32));
  cap.add(box(0.12, 1.75, 0.2, M(0xc9ccd4, { roughness: 0.5 }), 0.46, 0.9, 0));
  cap.position.set(-0.55, TOP, 1.0); g.add(cap);
  const to92 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.45, 20, 1, false, 0, Math.PI), M(0x111214, { roughness: 0.4 }));
  to92.position.set(1.55, TOP + 0.24, -2.3); g.add(to92);
  const res = (x, z, axis, warm) => {
    g.add(cyl(0.09, 0.42, M(warm ? 0xd8c39a : 0x6fa8dc, { roughness: 0.5 }), x, TOP + 0.13, z, 12, axis));
    [-0.1, 0.0, 0.1].forEach((o, i) => g.add(cyl(0.096, 0.035, M([0x8b1a1a, 0x111111, 0xc59a2b][i], { roughness: 0.5 }), x + (axis === 'x' ? o : 0), TOP + 0.13, z + (axis === 'z' ? o : 0), 12, axis)));
  };
  res(-0.85, 0.34, 'x', true); res(2.2, 2.2, 'z', true); res(1.05, -0.25, 'x'); res(1.05, 1.15, 'x');
  res(0.6, -2.3, 'x', true); res(0.05, -1.25, 'x'); res(0.55, -1.25, 'x');
  g.add(box(0.62, 0.32, 0.62, M(0x2b2d31, { roughness: 0.4 }), -0.35, TOP + 0.16, -1.8));
  g.add(cyl(0.18, 0.12, M(0x111214, { roughness: 0.5 }), -0.35, TOP + 0.38, -1.8, 16));
  reg('placa', g, { name: 'Placa de controle (7 × 9 cm)', what: 'Junta tudo numa peça só: ESP32, receptor, carregador, os 2 MOSFETs, o buzzer e os componentes pequenos (capacitor, resistores, transistor e botão de pareamento). As linhas coloridas mostram as ligações feitas por baixo da placa. Com ela, sobram só 10 fios soltos dentro da caixa.', cost: 'R$ 19 a placa + miúdos', side: 'dentro', label: V(2.0, 3.6, 3.75), explode: V(0, 4.8, 0),
    traces: [['#d7262e', 'Barramento + (depois da chave)'], ['#2b2c30', 'Barramento −'], ['#1c2a52', 'Capacitor de 1.000 µF entre o 5V e o GND do ESP32'], ['#f4f4ef', 'Divisor de 2 resistores de 100 kΩ que mede a bateria'], ['#8a9097', 'Botão de pareamento']] });
}

// ---------- MOSFETs (IRLZ44N deitados na placa) ----------
function to220(id, name, z, info) {
  const g = new THREE.Group();
  const tex = canvasTex(230, 256, (c, w, h) => { c.fillStyle = '#16171a'; c.fillRect(0, 0, w, h); txt(c, 'IRLZ44N', w / 2, h * 0.36, 32, '#d9dce0', 'center', 600); txt(c, name, w / 2, h * 0.68, 64, '#ffffff', 'center', 700); });
  const black = M(0x16171a, { roughness: 0.45 });
  const top = M(0xffffff, { map: tex, roughness: 0.45 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 1.0), [black, black, top, black, black, black]);
  body.position.set(0, 0.225, 0); g.add(body);
  g.add(box(0.6, 0.12, 1.0, tin(), 0.72, 0.06, 0));
  g.add(cyl(0.17, 0.13, M(0x2a2016, { roughness: 0.6 }), 0.78, 0.06, 0, 20));
  [-0.25, 0, 0.25].forEach(dz => { g.add(box(0.75, 0.05, 0.09, tin(), -0.82, 0.1, dz)); g.add(box(0.06, 0.16, 0.09, tin(), -1.17, 0.03, dz)); });
  g.position.set(2.35, TOP, z);
  return reg(id, g, info);
}
to220('mosfetA', 'A', 0.0, { name: 'MOSFET A (IRLZ44N)', what: 'Primeira chave do choque, deitada na placa. O ESP32 liga pelo GPIO 4, por um resistor de 100 Ω. É ela que faz os pulsos do B e do C. A aba de metal é o dreno: recebe o negativo do módulo de alta tensão.', cost: 'R$ 28,90 o pacote com 3 (um é reserva)', side: 'dentro', label: V(2.4, 4.05, -0.2), explode: V(0, 4.8, 0),
  traces: [['#1f9a4f', 'Porta (pino da esquerda) ← GPIO 4 por 100 Ω; resistor de 10 kΩ até o −'], ['#2b2c30', 'Fonte (pino da direita) → dreno do MOSFET B']] });
to220('mosfetB', 'B', 1.4, { name: 'MOSFET B (IRLZ44N)', what: 'Segunda chave, em série com a A e ligada ao GPIO 6. Fica ligada durante o choque inteiro, como uma janela aberta, enquanto a A pulsa. Se uma queimar em curto, a outra ainda corta o choque. A fonte vai direto no barramento −.', cost: 'Do mesmo pacote com 3', side: 'dentro', label: V(2.4, 4.05, 1.6), explode: V(0, 4.8, 0),
  traces: [['#1f9a4f', 'Porta ← GPIO 6 por 100 Ω; resistor de 10 kΩ até o −'], ['#2b2c30', 'Dreno (meio e aba) ← fonte do MOSFET A'], ['#2b2c30', 'Fonte → barramento −']] });

// ---------- suporte de 2 andares ----------
{
  const g = new THREE.Group();
  const layer = canvasTex(64, 256, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { c.fillStyle = y % 8 ? '#8a8a8a' : '#747474'; c.fillRect(0, y, w, 2); } }, { repeat: true, data: true });
  layer.repeat.set(4, 4);
  const petg = M(0xe07a2f, { roughness: 0.42, clearcoat: 0.35, bumpMap: layer, bumpScale: 0.25 });
  [[-3.1, -0.95], [3.1, -0.95], [-3.1, 4.1], [3.1, 4.1]].forEach(([x, z]) => { g.add(cyl(0.22, 2.62, petg, x, 1.61, z, 16)); g.add(cyl(0.36, 0.14, petg, x, 0.37, z, 18)); });
  g.add(rbox(0.45, 0.2, 5.5, 0.06, petg, -3.1, BY - 0.18, 1.575));
  g.add(rbox(0.45, 0.2, 5.5, 0.06, petg, 3.1, BY - 0.18, 1.575));
  reg('bandeja', g, { name: 'Suporte de 2 andares (impresso)', what: 'Quatro colunas e dois trilhos seguram a placa de controle por cima da bateria e do módulo de alta tensão. A trava laranja da bateria é impressa junto.', cost: 'Impresso em PETG na A1 Mini', side: 'dentro', label: V(-3.1, 2.0, 4.1), explode: V(0, 2.4, 0) });
}

// ---------- ESP32-C3 ----------
{
  const g = new THREE.Group();
  const tex = pcbTex(1.8, 2.25, '#17181b', (c, w, h) => {
    const right = ['0', '1', '2', '3', '4', '3V3', 'G', '5V'];
    const left = ['21', '20', '10', '9', '8', '7', '6', '5'];
    const zs = [-0.69, -0.42, -0.15, 0.12, 0.39, 0.66, 0.93, 1.2].map(z => (z - 0.25 + 1.125) / 2.25 * h);
    zs.forEach((y, i) => { pad(c, w - 14, y, 18); pad(c, 14, y, 18); txt(c, right[i], w - 30, y, 13, '#e8e8e8', 'right', 500); txt(c, left[i], 30, y, 13, '#e8e8e8', 'left', 500); });
    txt(c, 'ESP32-C3', w / 2, h * 0.44, 20, '#fff');
    txt(c, 'SuperMini', w / 2, h * 0.53, 15, '#bbb', 'center', 500);
  });
  g.add(board(1.8, 0.12, 2.25, 0x17181b, tex));
  g.add(box(0.55, 0.08, 0.55, M(0x2b2d31, { roughness: 0.3, metalness: 0.2 }), 0, 0.1, -0.2));
  g.add(box(0.25, 0.08, 0.7, M(0x0e0e10, { roughness: 0.3 }), 0, 0.1, -0.85));
  g.add(rbox(0.9, 0.32, 0.72, 0.12, steel(), 0, 0.22, 1.0));
  g.add(box(0.32, 0.14, 0.26, M(0xe9e9e6), -0.5, 0.13, 0.55)); g.add(box(0.32, 0.14, 0.26, M(0xe9e9e6), 0.5, 0.13, 0.55));
  g.add(cyl(0.07, 0.05, M(0x111111), -0.5, 0.22, 0.55, 12)); g.add(cyl(0.07, 0.05, M(0x111111), 0.5, 0.22, 0.55, 12));
  g.add(box(0.12, 0.06, 0.08, M(0x2b6cff, { emissive: new THREE.Color(0x1d4fd0), emissiveIntensity: 1.2 }), 0.45, 0.1, 0.2));
  [-0.94, -0.67, -0.4, -0.13, 0.14, 0.41, 0.68, 0.95].forEach(zz => { g.add(box(0.06, 0.2, 0.06, gold(), 0.8, -0.13, zz)); g.add(box(0.06, 0.2, 0.06, gold(), -0.8, -0.13, zz)); });
  g.position.set(-2.2, TOP + 0.2, 0.2);
  reg('esp32', g, { name: 'ESP32-C3 SuperMini', what: 'O cérebro, soldado direto na placa. Confere se o código veio de um controle pareado, respeita os limites de tempo, faz o choque fraco em pulsos e decide quando sai o choque. O LED azul aparece pela tampa transparente.', cost: 'R$ 16,14 no AliExpress', side: 'dentro', label: V(-2.4, 4.15, 0.3), explode: V(0, 4.8, 0),
    traces: [['#d7262e', '5V ← barramento +'], ['#2b2c30', 'GND → barramento −'], ['#e6b800', 'GPIO 3 ← dados do RXB6'], ['#1f9a4f', 'GPIO 4 → MOSFET A; GPIO 6 → MOSFET B'], ['#2f6fd6', 'GPIO 5 → 1 kΩ → BC547 → buzzer'], ['#f4f4ef', 'GPIO 0 ← divisor que mede a bateria'], ['#8a9097', 'GPIO 1 ← botão de pareamento'], ['#f08a24', '3V3 → RXB6 e buzzer']] });
}

// ---------- RXB6 + antena em mola ----------
{
  const g = new THREE.Group();
  const tex = pcbTex(3.0, 1.4, '#1f6b3a', (c, w, h) => {
    txt(c, 'RXB6  433 MHz', w * 0.42, h * 0.3, 20, '#fff');
    txt(c, 'ANT', 26, h * 0.5, 13, '#fff', 'left', 500); pad(c, 14, h * 0.5, 18);
    ['VCC', 'DATA', 'DATA', 'GND'].forEach((s, i) => txt(c, s, w - 46, (0.21 + i * 0.19) * h, 12, '#fff', 'right', 500));
  });
  g.add(board(3.0, 0.1, 1.4, 0x1f6b3a, tex));
  g.add(rbox(0.75, 0.28, 0.32, 0.12, steel(), -0.2, 0.18, 0.3));
  g.add(box(0.5, 0.12, 0.4, M(0x16171a, { roughness: 0.35 }), 0.5, 0.1, 0.25));
  g.add(cyl(0.12, 0.25, M(0x2f7d4a, { roughness: 0.4 }), -0.9, 0.17, 0.2, 14));
  [-0.41, -0.14, 0.13, 0.39].forEach(zz => g.add(box(0.06, 0.32, 0.06, gold(), 1.35, -0.16, zz)));
  g.add(box(0.06, 0.32, 0.06, gold(), -1.36, -0.16, 0));
  g.position.set(-1.4, TOP + 0.3, -2.9);
  reg('rxb6', g, { name: 'Receptor RXB6 433 MHz', what: 'Escuta o rádio do controle e passa o código para o ESP32. Soldado direto na placa, alimentado pelos 3,3 V do ESP32.', cost: 'R$ 10,30 no AliExpress (1 por pessoa nesse preço)', side: 'dentro', label: V(-1.0, 4.1, -3.4), explode: V(0, 4.8, 0),
    traces: [['#f08a24', 'VCC ← 3V3 do ESP32'], ['#e6b800', 'DATA → GPIO 3'], ['#2b2c30', 'GND → barramento −']] });
}
{
  const g = new THREE.Group();
  class Helix extends THREE.Curve { getPoint(t, out = new THREE.Vector3()) { const a = t * Math.PI * 2 * 16; return out.set(Math.cos(a) * 0.2, t * 2.5, Math.sin(a) * 0.2); } }
  const copper = M(0xc8a24a, { metalness: 1, roughness: 0.28 });
  const hx = new THREE.Mesh(new THREE.TubeGeometry(new Helix(), 360, 0.035, 6, false), copper); hx.position.y = 0.18; g.add(hx);
  g.add(cyl(0.035, 0.2, copper, 0.2, 0.09, 0, 8));
  g.position.set(-2.76, TOP + 0.36, -2.9);
  reg('antena', g, { name: 'Antena em mola 433 MHz', what: 'Uma mola pequena soldada no pino ANT do receptor. Substitui o fio de 17,3 cm que dava a volta na caixa. Se o alcance ficar curto no teste do galão, volte para o fio.', cost: 'R$ 13,44', side: 'dentro', label: V(-2.76, 5.0, -2.9), explode: V(0, 4.8, 0) });
}

// ---------- TP4056 ----------
{
  const g = new THREE.Group();
  const tex = pcbTex(2.6, 1.7, '#1d4fa3', (c, w, h) => {
    txt(c, 'TP4056', w * 0.55, h * 0.32, 22, '#fff');
    txt(c, 'IN+', 30, h * 0.24, 12, '#fff', 'left', 500); txt(c, 'IN−', 30, h * 0.76, 12, '#fff', 'left', 500);
    pad(c, 14, h * 0.24, 16); pad(c, 14, h * 0.76, 16);
    [['B+', 0.15], ['B−', 0.32], ['OUT+', 0.68], ['OUT−', 0.85]].forEach(([s, f]) => { pad(c, w - 14, h * f, 16); txt(c, s, w - 28, h * f, 12, '#fff', 'right', 500); });
  });
  g.add(board(2.6, 0.1, 1.7, 0x1d4fa3, tex));
  g.add(rbox(0.75, 0.3, 0.9, 0.12, steel(), -1.0, 0.2, 0));
  g.add(box(0.5, 0.12, 0.4, M(0x16171a, { roughness: 0.35 }), 0.1, 0.1, 0.25));
  g.add(box(0.3, 0.1, 0.25, M(0x16171a, { roughness: 0.35 }), 0.6, 0.1, -0.35));
  g.add(box(0.12, 0.07, 0.08, M(0xff3b30, { emissive: new THREE.Color(0xa00000), emissiveIntensity: 0.6 }), 0.0, 0.09, -0.4));
  g.add(box(0.12, 0.07, 0.08, M(0x2b6cff), 0.25, 0.09, -0.4));
  [[1.15, -0.6], [1.15, -0.31], [1.15, 0.31], [1.15, 0.6], [-1.15, -0.44], [-1.15, 0.44]].forEach(([x, z]) => g.add(box(0.06, 0.2, 0.06, gold(), x, -0.12, z)));
  g.position.set(-1.9, TOP + 0.14, 2.6);
  reg('tp4056', g, { name: 'Carregador TP4056', what: 'Carrega a bateria pelo USB-C e corta a energia se a bateria descarregar demais ou der curto. As luzes (vermelha carregando, azul cheia) aparecem pela tampa transparente.', cost: 'R$ 12,08 o pacote com 5', side: 'dentro', label: V(-2.1, 4.0, 2.9), explode: V(0, 4.8, 0),
    traces: [['#2b2c30', 'OUT− → barramento −']] });
}

// ---------- buzzer ----------
{
  const g = new THREE.Group();
  g.add(cyl(0.6, 0.85, M(0x121315, { roughness: 0.45 }), 0, 0, 0, 36));
  g.add(cyl(0.12, 0.05, M(0x2a2c30), 0, 0.44, 0, 16));
  const t = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#121315'; c.fillRect(0, 0, w, h); txt(c, '+', 30, 64, 30, '#ddd'); });
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.58, 32), M(0xffffff, { map: t, roughness: 0.5 })); top.rotation.x = -Math.PI / 2; top.position.y = 0.43; g.add(top);
  g.position.set(2.3, TOP + 0.43, -2.9);
  reg('buzzer', g, { name: 'Buzzer', what: 'Bipa antes de todo choque, para o boi associar o som. Também avisa por bipes: bateria fraca, pareamento feito.', cost: 'R$ 11,71 o pacote com 10', side: 'dentro', label: V(2.3, 4.6, -2.9), explode: V(0, 4.8, 0),
    traces: [['#f08a24', '+ ← 3V3'], ['#2f6fd6', '− → coletor do BC547']] });
}

// ---------- controle ----------
const fobButtons = {};
{
  const g = new THREE.Group();
  const white = M(0xf1f2ef, { roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  g.add(rbox(3.2, 1.3, 8.6, 0.6, white, 0, 0, 0, 4));
  g.add(rbox(3.26, 0.06, 8.1, 0.03, M(0xd6d8d3, { roughness: 0.5 }), 0, -0.25, 0.1));
  const face = canvasTex(320, 860, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    txt(c, '433 MHz', w / 2, h * 0.9, 24, '#8a8e94', 'center', 500);
  });
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 8.6), M(0xffffff, { map: face, transparent: true, roughness: 0.35 }));
  fp.rotation.x = -Math.PI / 2; fp.position.y = 0.655; g.add(fp);
  ['A', 'B', 'C', 'D'].forEach((s, k) => {
    const b = new THREE.Group();
    b.add(cyl(0.58, 0.22, M(0x55595f, { roughness: 0.7 }), 0, 0, 0, 32));
    const lt = canvasTex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); txt(c, s, w / 2, h / 2, 76, '#ffffff', 'center', 600); });
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), M(0xffffff, { map: lt, transparent: true, roughness: 0.6 }));
    cap.rotation.x = -Math.PI / 2; cap.position.y = 0.112; b.add(cap);
    b.position.set(0, 0.72, -2.2 + k * 1.45); g.add(b); fobButtons[s] = b;
  });
  g.add(cyl(0.09, 0.05, M(0xff3b30, { emissive: new THREE.Color(0x400000) }), 0, 0.67, -3.45, 12));
  const metal = M(0xb9bcc1, { metalness: 0.85, roughness: 0.3 });
  g.add(cyl(0.12, 1.5, metal, 0, 0.15, -5.0, 16, 'z'));
  g.add(cyl(0.2, 0.25, metal, 0, 0.15, -5.8, 16, 'z'));
  g.position.set(-5.2, 2.6, 13.6);
  g.rotation.set(-0.12, 0.38, 0.05);
  reg('controle', g, { name: 'Controle 433 MHz', what: 'Corpo comprido que enche a mão, 4 botões grandes em coluna e antena curta. A: só bipe. B: bipe e choque fraco (0,5 s em pulsos curtos). C: médio (0,5 s em pulsos mais longos). D: forte (1 s direto). Usa pilha A23 de 12 V. Vai junto um controle de chaveiro já pareado, de reserva.', cost: 'R$ 20,51 o principal + R$ 8,99 o reserva', side: 'fora', label: V(-5.2, 4.4, 13.6) });
}


// ---------- fios ----------
const C = { red: 0xd7262e, black: 0x1f2024, green: 0x1f9a4f, yellow: 0xf2c418, orange: 0xf08a24, blue: 0x2f6fd6, white: 0xeeeeea, gray: 0x8a9097, hv: 0xf7f4ec };
const R = { thin: 0.042, thick: 0.066, hv: 0.088 };
const wires = [];
function W(id, ca, pa, cb, pb, color, kind, label, h, via) { wires.push({ id, a: { c: ca, w: V(...pa) }, b: { c: cb, w: V(...pb) }, color, kind, label, h, via: (via || []).map(([c, p]) => ({ c, w: V(...p) })) }); }
W('w_usbp', 'usbc', [-2.8, 3.95, 3.62], 'tp4056', [-3.05, 3.48, 2.16], C.red, 'thin', 'USB-C + → TP4056 IN+', 0.3);
W('w_usbn', 'usbc', [-2.6, 3.95, 3.62], 'tp4056', [-3.05, 3.48, 3.04], C.black, 'thin', 'USB-C − → TP4056 IN−', 0.3);
W('w_bp', 'bateria', [3.85, 1.0, -2.45], 'tp4056', [-0.75, 3.48, 2.0], C.red, 'thin', 'Bateria + → TP4056 B+ (por baixo da placa, sobe pelo furo)', 0, [['bateria', [3.75, 2.45, -1.7]], ['placa', [1.4, 2.95, -1.0]], ['placa', [-0.38, 2.95, 1.95]], ['placa', [-0.38, 3.52, 1.95]]]);
W('w_bn', 'bateria', [-3.85, 1.0, -2.45], 'tp4056', [-0.75, 3.48, 2.29], C.black, 'thin', 'Bateria − → TP4056 B− (por baixo da placa, sobe pelo furo)', 0, [['bateria', [-3.75, 2.45, -1.7]], ['placa', [-2.4, 2.95, 0.4]], ['placa', [-0.38, 2.95, 2.38]], ['placa', [-0.38, 3.52, 2.38]]]);
W('w_out', 'tp4056', [-0.75, 3.48, 2.91], 'chave', [-3.5, 3.95, 0.5], C.red, 'thick', 'TP4056 OUT+ → chave');
W('w_sw', 'chave', [-3.5, 4.45, 0.5], 'placa', [0.3, 3.3, -0.2], C.red, 'thick', 'Chave → barramento + da placa');
W('w_hvp', 'moduloAT', [3.45, 1.25, 1.05], 'placa', [3.3, 3.3, -1.6], C.red, 'thick', 'Barramento + (pad AT+) → alta tensão, entrada +', 0.35);
W('w_hvn', 'moduloAT', [3.45, 1.25, 1.45], 'mosfetA', [3.13, 3.42, 0.0], C.black, 'thick', 'Alta tensão, entrada − → aba (dreno) do MOSFET A', 0.5);
W('w_hv1', 'moduloAT', [-3.5, 1.6, 1.05], 'pinos', [-0.2, 0.45, 3.6], C.hv, 'hv', 'Alta tensão (saída) → pino de inox 1', 0, [['moduloAT', [-4.1, 0.7, 2.6]]]);
W('w_hv2', 'moduloAT', [-3.5, 1.6, 1.45], 'pinos', [3.8, 0.45, 3.6], C.hv, 'hv', 'Alta tensão (saída) → pino de inox 2', 0, [['moduloAT', [-3.9, 0.6, 3.0]], ['moduloAT', [1.5, 0.5, 3.1]]]);

const wireGroup = new THREE.Group();
scene.add(wireGroup);
scene.updateMatrixWorld(true);
wires.forEach(w => {
  w.a.l = comps[w.a.c].group.worldToLocal(w.a.w.clone());
  w.b.l = comps[w.b.c].group.worldToLocal(w.b.w.clone());
  w.via.forEach(v => { v.l = comps[v.c].group.worldToLocal(v.w.clone()); });
  w.mat = M(w.color, { roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3, transparent: true, opacity: 1, emissive: new THREE.Color(0x000000) });
  w.mesh = new THREE.Mesh(new THREE.BufferGeometry(), w.mat);
  w.mesh.castShadow = true;
  w.mesh.userData.wire = w;
  wireGroup.add(w.mesh);
  w.blobs = [0, 1].map(() => { const s = new THREE.Mesh(new THREE.SphereGeometry(R[w.kind] * 1.7, 12, 8), tin()); wireGroup.add(s); return s; });
});
function buildWires() {
  scene.updateMatrixWorld(true);
  wires.forEach(w => {
    const a = comps[w.a.c].group.localToWorld(w.a.l.clone());
    const b = comps[w.b.c].group.localToWorld(w.b.l.clone());
    let d = a.distanceTo(b), curve;
    if (w.via.length) {
      curve = new THREE.CatmullRomCurve3([a, ...w.via.map(v => comps[v.c].group.localToWorld(v.l.clone())), b], false, 'centripetal');
      d = curve.getLength();
    } else {
      const h = w.h ?? Math.min(1.2, 0.35 + 0.16 * d);
      curve = new THREE.CubicBezierCurve3(a, a.clone().add(V(0, h, 0)), b.clone().add(V(0, h, 0)), b);
    }
    w.mesh.geometry.dispose();
    w.mesh.geometry = new THREE.TubeGeometry(curve, Math.max(24, Math.round(d * 6)), R[w.kind], 8, false);
    w.blobs[0].position.copy(a); w.blobs[1].position.copy(b);
  });
}
buildWires();

// ---------- chão ----------
const FLOOR_Y = -28.9;
{
  const shadowFloor = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.ShadowMaterial({ opacity: 0.05 }));
  shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.position.y = FLOOR_Y; shadowFloor.receiveShadow = true; scene.add(shadowFloor);
  const ao = canvasTex(256, 256, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(60,70,80,.22)'); gr.addColorStop(1, 'rgba(60,70,80,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const aoMesh = new THREE.Mesh(new THREE.PlaneGeometry(26, 12), new THREE.MeshBasicMaterial({ map: ao, transparent: true, depthWrite: false }));
  aoMesh.rotation.x = -Math.PI / 2; aoMesh.position.set(0, FLOOR_Y + 0.01, 0); scene.add(aoMesh);
}

// ---------- rótulos ----------
const labels = [];
Object.values(comps).forEach(cp => {
  const el = document.createElement('div');
  el.className = 'lbl' + (cp.hv ? ' hv' : '');
  el.textContent = ({ caixa: 'Caixa', tampa: 'Tampa', protetor: 'Protetor TPU', fita: 'Fita 50 mm', fivela: 'Fivela', elo: 'Elo de velcro', pinos: 'Pinos de inox', usbc: 'USB-C', chave: 'Chave', bateria: 'Bateria 18650', moduloAT: 'Alta tensão', mosfetA: 'MOSFET A', mosfetB: 'MOSFET B', bandeja: 'Suporte', esp32: 'ESP32-C3', rxb6: 'RXB6', antena: 'Antena', tp4056: 'TP4056', placa: 'Placa de controle', buzzer: 'Buzzer', controle: 'Controle' })[cp.id];
  const obj = new CSS2DObject(el);
  obj.position.copy(cp.group.worldToLocal(cp.label.clone()));
  cp.group.add(obj);
  labels.push({ cp, obj, el });
});

// ---------- raio-x: material fantasma e contornos ----------
const edgeMat = new THREE.LineBasicMaterial({ color: 0x5b7088, transparent: true, opacity: 0, depthWrite: false });
Object.values(comps).forEach(cp => {
  if (!cp.xray) return;
  const meshes = []; cp.group.traverse(o => { if (o.isMesh) meshes.push(o); });
  meshes.forEach(o => {
    const toGhost = m => { const gm = new THREE.MeshLambertMaterial({ color: m.color ? m.color.clone() : 0xffffff, transparent: true, opacity: 1, depthWrite: false }); gm.userData.baseOp = m.transparent ? m.opacity : 1; return gm; };
    o.userData.orig = o.material;
    o.userData.ghost = Array.isArray(o.material) ? o.material.map(toGhost) : toGhost(o.material);
    if (o.geometry.attributes.position.count < 6000) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 35), edgeMat); e.visible = false; o.add(e); }
  });
});

// ---------- efeitos ----------
const rings = [];
for (let i = 0; i < 3; i++) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 48), new THREE.MeshBasicMaterial({ color: 0x1d63d8, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  m.visible = false; scene.add(m); rings.push(m);
}
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xcfeeff });
const spark = new THREE.Mesh(new THREE.BufferGeometry(), sparkMat); spark.visible = false; scene.add(spark);
const glowTex = canvasTex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(200,235,255,1)'); gr.addColorStop(0.3, 'rgba(120,190,255,.6)'); gr.addColorStop(1, 'rgba(80,150,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
glow.scale.set(5, 5, 1); glow.visible = false; scene.add(glow);
const sparkLight = new THREE.PointLight(0x9fd3ff, 0, 14, 2); scene.add(sparkLight);
function makeSpark() {
  const a = comps.pinos.group.localToWorld(V(PIN_X[0], -0.72, PIN_Z)), b = comps.pinos.group.localToWorld(V(PIN_X[1], -0.72, PIN_Z));
  const pts = [];
  for (let i = 0; i <= 18; i++) { const t = i / 18; const p = a.clone().lerp(b, t); if (i > 0 && i < 18) p.add(V(0, -Math.sin(t * Math.PI) * 0.9 + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5)); pts.push(p); }
  spark.geometry.dispose(); spark.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.035, 6, false);
  const mid = a.clone().lerp(b, 0.5).add(V(0, -0.8, 0));
  glow.position.copy(mid); sparkLight.position.copy(mid);
}

// ---------- estado e animação ----------
const state = { lid: 0, lidT: 0, ex: 0, exT: 0, xr: 0, xrT: 0 };
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = t => Math.max(0, Math.min(1, t));
let lastEx = -1;
function applyPose() {
  const lt = ease(clamp01(state.lid));
  const sT = ease(clamp01(state.lid * 2.2));
  const mT = ease(clamp01((state.lid - 0.35) / 0.65));
  lid.userData.screws.forEach(s => { s.position.y = s.userData.base.y + 0.9 * sT; s.rotation.y = -9 * sT; });
  const e = ease(clamp01(state.ex));
  Object.values(comps).forEach(cp => {
    if (cp.id === 'tampa') return;
    cp.group.position.copy(cp.base).addScaledVector(cp.explode, e);
  });
  lid.position.set(0, 7.5 * mT + comps.tampa.explode.y * e, -3.2 * mT);
  lid.rotation.x = -0.42 * mT;
  if (Math.abs(e - lastEx) > 1e-4) { buildWires(); lastEx = e; }
  const xr = clamp01(state.xr);
  Object.values(comps).forEach(cp => {
    if (!cp.xray) return;
    cp.group.traverse(o => {
      if (o.isMesh && o.userData.ghost) {
        const g = o.userData.ghost; const useG = xr > 0.02;
        o.material = useG ? g : o.userData.orig;
        (Array.isArray(g) ? g : [g]).forEach(m => { m.opacity = Math.min(m.userData.baseOp ?? 1, 1 - 0.9 * xr); });
        o.castShadow = !useG;
      }
      if (o.isLineSegments) { o.visible = xr > 0.02; o.material.opacity = 0.55 * xr; }
    });
  });
  const inside = Math.max(lt, xr, e) > 0.55;
  labels.forEach(L => {
    const show = uiLabels && (L.cp.side === 'fora' ? true : inside) && !(L.cp.id === 'tampa' && lt < 0.5 && e < 0.3);
    L.obj.visible = show;
  });
}

// ---------- brilho ----------
let hoverId = null, selectedId = null;
const simGlow = new Map();
const simWires = new Set();
const accent = new THREE.Color(0x1d63d8);
function updateGlow() {
  Object.values(comps).forEach(cp => {
    const g = Math.max(simGlow.get(cp.id) || 0, cp.id === selectedId ? 0.32 : 0, cp.id === hoverId ? 0.18 : 0);
    if (Math.abs(g - cp.glow) < 1e-3) return;
    cp.glow = g;
    const col = simGlow.has(cp.id) ? new THREE.Color(0x5aa9ff) : accent;
    matsOf(cp.id).forEach(m => {
      if (!m.emissive) return;
      if (g > 0) { m.emissive.copy(col); m.emissiveIntensity = g; }
      else { m.emissive.copy(m.userData.baseEmissive || new THREE.Color(0)); m.emissiveIntensity = m.userData.baseEmissiveIntensity ?? 1; }
    });
  });
  const focus = selectedId || (simWires.size ? '__sim' : null);
  wires.forEach(w => {
    const on = simWires.has(w.id) || (selectedId && (w.a.c === selectedId || w.b.c === selectedId));
    w.mat.emissive.set(on ? w.color : 0x000000);
    w.mat.emissiveIntensity = on ? (w.color === C.black ? 0.25 : 0.55) : 0;
    w.mat.opacity = focus && !on ? 0.22 : 1;
  });
}

// ---------- UI ----------
let uiLabels = true;
const $ = id => document.getElementById(id);
const bLid = $('bLid'), bEx = $('bExplode'), bXr = $('bXray');
function setLid(open) { state.lidT = open ? 1 : 0; bLid.setAttribute('aria-pressed', open); bLid.textContent = open ? 'Fechar tampa' : 'Abrir tampa'; }
function setEx(on) { state.exT = on ? 1 : 0; bEx.setAttribute('aria-pressed', on); if (on) { setLid(true); tweenCam(V(27, 27, 41), V(0, 5.5, 0)); } else { tweenCam(V(25, 16.5, 33), V(0, 1.5, 0)); } }
function setXr(on) { state.xrT = on ? 1 : 0; bXr.setAttribute('aria-pressed', on); }
bLid.onclick = () => { const open = state.lidT < 0.5; setLid(open); if (!open && state.exT > 0.5) setEx(false); else if (open) tweenCam(null, V(0, 3.0, 0)); };
bEx.onclick = () => setEx(state.exT < 0.5);
bXr.onclick = () => setXr(state.xrT < 0.5);
$('bHome').onclick = () => { select(null); tweenCam(HOME.pos.clone(), HOME.target.clone()); };
$('tWires').onchange = e => { wireGroup.visible = e.target.checked; };
$('tLabels').onchange = e => { uiLabels = e.target.checked; };
$('tSpin').onchange = e => { controls.autoRotate = e.target.checked; };

const legendItems = [[C.red, 'Fio positivo da bateria'], [C.black, 'Fio negativo (GND)'], [C.hv, 'Fio de alta tensão (grosso)', true], [null, 'Trilhas por baixo da placa:'], [C.green, 'Sinal que liga os MOSFETs'], [0xe6b800, 'Dados do rádio'], [C.orange, '3,3 V do ESP32'], [C.blue, 'Buzzer'], [C.white, 'Medição da bateria'], [C.gray, 'Botão de pareamento']];
const hex = n => '#' + n.toString(16).padStart(6, '0');
$('legend').innerHTML = legendItems.map(([c, t, thick]) => c === null ? `<li style="margin-top:6px;font-weight:600">${t}</li>` : `<li><span class="sw${thick ? ' thick' : ''}" style="background:${hex(c)}"></span>${t}</li>`).join('');

const info = $('info');
const groups = [['Por fora', ['caixa', 'tampa', 'protetor', 'pinos', 'usbc', 'chave', 'fita', 'fivela', 'elo', 'controle']], ['Andar de cima: placa de controle', ['placa', 'esp32', 'rxb6', 'antena', 'tp4056', 'mosfetA', 'mosfetB', 'buzzer']], ['Andar de baixo', ['bateria', 'moduloAT', 'bandeja']]];
function renderInfo() {
  if (!selectedId) {
    info.innerHTML = `<h2>Clique numa peça</h2><p>Cada peça mostra o que faz, em que ela liga e quanto custa. Os fios da peça escolhida ficam acesos.</p>` +
      groups.map(([t, ids]) => `<div class="k">${t}</div><div class="chips">${ids.map(id => `<button class="chip${comps[id].hv ? ' hv' : ''}" data-id="${id}">${comps[id].name.replace(/ \(.*\)/, '')}</button>`).join('')}</div>`).join('');
  } else {
    const cp = comps[selectedId];
    const ws = wires.filter(w => w.a.c === selectedId || w.b.c === selectedId);
    info.innerHTML = `<button class="back" id="bBack">← Todas as peças</button><h2>${cp.name}</h2><p>${cp.what}</p>` +
      ((ws.length || cp.traces) ? `<div class="k">Liga em</div><ul>${ws.map(w => `<li><span class="sw${w.kind !== 'thin' ? ' thick' : ''}" style="background:${hex(w.color)}"></span><span>${w.label} <em style="opacity:.6">(fio)</em></span></li>`).join('')}${(cp.traces || []).map(([col, t]) => `<li><span class="sw" style="background:${col};border-radius:2px"></span><span>${t} <em style="opacity:.6">(trilha)</em></span></li>`).join('')}</ul>` : '') +
      `<div class="cost">Custo: ${cp.cost}</div>`;
    $('bBack').onclick = () => select(null);
  }
  info.querySelectorAll('.chip').forEach(b => b.onclick = () => select(b.dataset.id, true));
}
function select(id, focus) {
  selectedId = id; renderInfo();
  if (id && focus) {
    const cp = comps[id];
    if (cp.side === 'dentro' && state.lidT < 0.5 && state.xrT < 0.5 && state.exT < 0.5) setLid(true);
    const b = new THREE.Box3().setFromObject(cp.group);
    const c = b.getCenter(V(0, 0, 0)); const size = b.getSize(V(0, 0, 0)).length();
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (cp.side === 'dentro') dir.lerp(V(0.35, 0.85, 0.4).normalize(), 0.6).normalize();
    tweenCam(c.clone().addScaledVector(dir, Math.max(9, Math.min(46, size * 3.0))), c);
  }
}
renderInfo();

let camTween = null;
function tweenCam(pos, target, dur = 0.9) {
  camTween = { t: 0, dur, p0: camera.position.clone(), p1: pos ? pos.clone() : null, t0: controls.target.clone(), t1: target ? target.clone() : controls.target.clone() };
}

// ---------- seleção com o mouse ----------
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
const tip = $('tip');
let downPos = null;
function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const targets = pickables.filter(o => o.visible && !(state.xr > 0.5 && comps[o.userData.compId]?.xray));
  if (wireGroup.visible) targets.push(...wires.map(w => w.mesh));
  const hits = ray.intersectObjects(targets, false);
  let hit = hits[0];
  if (hit && hit.object.userData.compId === 'tampa' && state.lid < 0.5) { const behind = hits.find(h => h.object.userData.compId !== 'tampa' && h.object.userData.compId !== 'caixa'); if (behind && comps[behind.object.userData.compId]?.side === 'dentro') hit = behind; }
  return hit ? hit.object : null;
}
renderer.domElement.addEventListener('pointermove', ev => {
  if (ev.pointerType === 'touch') return;
  const o = pick(ev);
  const w = o?.userData.wire;
  hoverId = w ? null : (o?.userData.compId || null);
  renderer.domElement.style.cursor = o ? 'pointer' : 'grab';
  if (o) {
    tip.style.display = 'block'; tip.style.left = (ev.clientX + 14) + 'px'; tip.style.top = (ev.clientY + 14) + 'px';
    tip.textContent = w ? w.label : comps[hoverId].name;
  } else tip.style.display = 'none';
});
renderer.domElement.addEventListener('pointerleave', () => { hoverId = null; tip.style.display = 'none'; });
renderer.domElement.addEventListener('pointerdown', ev => { downPos = [ev.clientX, ev.clientY]; });
renderer.domElement.addEventListener('pointerup', ev => {
  if (!downPos || Math.hypot(ev.clientX - downPos[0], ev.clientY - downPos[1]) > 5) return;
  const o = pick(ev);
  if (!o) { if (!lsOpen) select(null); return; }
  const w = o.userData.wire;
  const id = w ? w.a.c : o.userData.compId;
  if (lsOpen) talkAbout(id); else select(id, true);
});

const bSim = $('bSim');
// ---------- aula: roteiro ----------
const PATH_C = ['bateria', 'tp4056', 'chave', 'moduloAT', 'mosfetA', 'mosfetB'];
const PATH_W = ['w_bp', 'w_bn', 'w_out', 'w_sw', 'w_hvp', 'w_hvn'];
const LESSON = [
  { t: 'A ideia', s: [
    { m: `Oi! Vou te mostrar a coleira peça por peça, como numa conversa. No fim você vai conseguir explicar para qualquer pessoa como ela funciona, com os números de cada peça. Dá para girar e aproximar o modelo a qualquer hora, e clicar numa peça também puxa assunto sobre ela.`,
      a: { cam: 'home', lid: 0, xr: 0, ex: 0 } },
    { m: `Para que serve: no treino de laço, o cavalo precisa de um boi que saia correndo. Com o tempo o boi aprende que não precisa correr e fica parado. O peão aperta um botão, a coleira dá um **bipe** e um **choque curto**, e o boi sai.`,
      a: { cam: 'home', g: ['caixa', 'controle'] },
      why: `O bipe vem antes de todo choque para o boi ligar o som ao choque. Depois de alguns dias, só o bipe já faz ele correr, e o choque quase não é mais usado. É o mesmo princípio da coleira de adestramento de cachorro. Uma das perguntas para o comprador no retorno é justamente: depois de quantos dias o boi passou a reagir só ao bipe?` },
    { m: `Isso já existe nos Estados Unidos: o **Steer Saver**. Entregue no Brasil, sai por volta de **R$ 4.400**. A nossa coleira usa peças que custam uns **R$ 200** hoje, e uns R$ 130 se forem compradas em lote de 20.`,
      a: { cam: 'home' },
      why: `De onde vêm os números: o Steer Saver custa US$ 349,99. Com dólar a R$ 5,60, frete, imposto de importação de 60% e ICMS, chega perto de R$ 4.400. O nosso valor é a soma das peças que vão de fato numa coleira. As ferramentas da bancada e as sobras dos pacotes ficam de fora.` },
    { m: `O sistema tem duas partes: o **controle**, na mão do peão, e a **caixa**, presa no pescoço do boi por uma fita. Entre os dois só tem rádio, nenhum fio.`,
      a: { f: ['controle', 'caixa'], dir: 'iso', g: ['controle', 'caixa'] } },
    { quiz: { q: `Por que a coleira bipa antes de todo choque?`, o: ['Para avisar o peão que a bateria está boa', 'Para o boi aprender a reagir só ao som', 'Porque o módulo faz barulho ao ligar'], ok: 1,
      e: `Com o tempo o bipe sozinho já faz o boi correr, e ele leva menos choque.` } }
  ] },
  { t: 'Por fora: caixa e coleira', s: [
    { m: `A caixa é uma caixa de passagem da **Multitoc**, de **10 × 10 × 7 cm**, dessas que eletricista usa em parede externa. Escolhemos ela por três motivos: já vem vedada, é barata (uns R$ 29) e aguenta pancada.`,
      a: { f: ['caixa'], dir: 'iso', lid: 0, xr: 0, ex: 0, g: ['caixa', 'tampa'] },
      why: `Na ficha dela: **IP66**. O primeiro 6 quer dizer que não entra poeira nenhuma; o segundo, que aguenta jato forte de água. **IK06 a IK08** é a resistência a pancada. O plástico é polipropileno com proteção contra o sol por até 5 anos, e ela funciona de −5 a 60 °C.` },
    { m: `A tampa é alta e fecha com **4 parafusos plásticos de 1/4 de volta**, dois deles servem de dobradiça. Por baixo tem uma borracha que faz a vedação. No protótipo a tampa é transparente, para ver as luzes de dentro; na versão de venda ela é cinza.`,
      a: { f: ['caixa'], dir: 'iso', lid: 1, g: ['tampa'] },
      why: `A borracha só veda se estiver limpa e com os 4 parafusos fechados. Por isso o manual manda limpar a borracha toda vez que abrir. A mesma caixa existe com tampa opaca, com as mesmas medidas, então a troca na versão de venda não muda nada por dentro.` },
    { m: `Em volta da caixa vai um **protetor de TPU** impresso na A1 Mini. TPU é um plástico com jeito de borracha: amortece pancada de cerca e de queda. Ele tem duas orelhas, por onde passa a fita.`,
      a: { f: ['protetor'], dir: 'side', lid: 0, g: ['protetor'] } },
    { m: `A fita é de **poliéster de 50 mm**, a mesma de mochila e de cinta de carga. Ela fecha com uma **fivela de engate rápido**, e num trecho tem um pedaço de **velcro** costurado: o elo fraco.`,
      a: { f: ['elo', 'fivela'], dir: 'front', zoom: 1.2, g: ['fita', 'fivela', 'elo'] },
      why: `Se a coleira enroscar numa cerca ou num galho, o velcro abre antes de machucar o pescoço do boi. É uma proteção que custa uns R$ 3.` },
    { m: `Embaixo da caixa ficam os **dois pinos de inox**, a **4 cm** um do outro. São parafusos M4 com porca cega, que é arredondada para não ferir o couro. O choque sai por um pino, atravessa a pele e volta pelo outro.`,
      a: { f: ['pinos'], dir: 'bottom', g: ['pinos'] },
      why: `A corrente precisa de um caminho de ida e volta. Com os dois pinos encostados no couro, o caminho é só o pedaço de pele entre eles. Por isso o choque fica localizado ali e não passa pelo corpo todo.` },
    { m: `Na lateral ficam o **conector USB-C**, para carregar sem abrir a caixa, e a **chave liga/desliga** com capa de borracha. Os dois são à prova d'água.`,
      a: { f: ['usbc', 'chave'], dir: 'left', g: ['usbc', 'chave'] },
      ifs: [[`E se carregar com a coleira ligada?`, `O carregador pode não perceber que a bateria encheu, porque a placa continua puxando corrente. Por isso o manual diz: carregue com a chave desligada.`]] }
  ] },
  { t: 'O controle e o rádio', s: [
    { m: `O controle principal é de portão: branco, comprido, com **4 botões grandes**, A, B, C e D, um embaixo do outro. Ele usa uma pilha **A23 de 12 V** e manda o sinal em **433 MHz**.`,
      a: { f: ['controle'], dir: 'top', lid: 0, xr: 0, g: ['controle'] },
      why: `433 MHz é uma faixa de rádio liberada para aparelhos de curto alcance, como controle de portão e alarme de carro. Por isso existe controle barato e receptor pronto. Os botões grandes em coluna ajudam a achar o botão pelo tato, montado no cavalo.` },
    { m: `O anúncio promete **mais de 100 metros** em campo aberto. No boi o alcance cai, porque o corpo do animal é quase todo água, e água absorve o sinal. Por isso um dos testes é: coleira encostada num galão de 20 litros e 10 toques a **30 metros**.`,
      a: { f: ['controle', 'caixa'], dir: 'iso', g: ['controle'], fx: 'rings', btn: 'B' } },
    { m: `Cada controle tem um **código só dele**, gravado de fábrica no chip **EV1527**. Quando você aperta um botão, ele manda esse código e o número do botão, repetindo várias vezes em menos de um segundo.`,
      a: { f: ['controle', 'caixa'], dir: 'iso', g: ['controle'], fx: 'rings', btn: 'A' },
      why: `O código tem 20 bits, o que dá mais de 1 milhão de combinações. Mais 4 bits dizem qual botão foi apertado. A chance de o controle de outra pessoa ter o mesmo código é muito pequena.` },
    { m: `Dentro da caixa, quem escuta é o receptor **RXB6**, a plaquinha verde. Ele é do tipo **super-heteródino**: fica afinado bem em 433,92 MHz e ignora o resto. Isso dá mais alcance e menos interferência que os receptores mais baratos.`,
      a: { f: ['rxb6', 'antena'], dir: 'top', lid: 1, xr: 0, g: ['rxb6', 'antena'] },
      why: `Super-heteródino é o mesmo princípio do rádio AM e FM: o receptor mistura o sinal que chega com uma frequência dele e filtra só a diferença, numa faixa bem estreita. Pelo anúncio, o RXB6 percebe sinais muito fracos (−116 dBm) e gasta só 6 mA com 3,3 V.` },
    { m: `A antena é uma **mola de cobre de 27 mm** soldada no pino ANT do receptor. Ela fica em pé e longe do módulo de alta tensão.`,
      a: { f: ['antena', 'rxb6'], dir: 'side', lid: 1, g: ['antena'] },
      why: `Uma antena boa para 433 MHz tem um quarto do tamanho da onda. A onda tem 69 cm: 300.000 km/s divididos por 433,92 milhões de ciclos por segundo. Um quarto disso dá 17,3 cm. A mola é um fio desse tipo enrolado para caber na caixa. Se o alcance ficar curto, dá para trocar por um fio reto de 17,3 cm.` },
    { m: `**Pareamento**: a coleira só obedece controles que ela conhece. Você segura o botão de pareamento e liga a coleira. Com 2 bipes e o LED piscando rápido, solta e aperta A, B, C e D, nessa ordem. Cada botão tem um código diferente, e os 4 ficam salvos na memória, que não se perde ao desligar. Cabem 4 controles.`,
      a: { f: ['esp32', 'placa'], dir: 'top', lid: 1, g: ['esp32'] },
      ifs: [[`E se o vizinho apertar o controle de portão dele?`, `O RXB6 recebe o sinal, mas o ESP32 compara o código com os salvos. Como não é igual, ele ignora: sem bipe e sem choque. Dá para ver isso na simulação, no caso "Controle do vizinho".`],
            [`E se o controle cair e quebrar?`, `Vai junto um segundo controle, já pareado. Ele é o de chaveiro, também de 433 MHz com EV1527.`]] },
    { quiz: { q: `O controle do vizinho também é de 433 MHz. Por que ele não dispara a coleira?`, o: ['O RXB6 não recebe o sinal dele', 'O código dele não está salvo na coleira', 'Ele usa outra pilha'], ok: 1,
      e: `O RXB6 até recebe, porque é a mesma frequência. Quem barra é o ESP32, comparando o código.` } }
  ] },
  { t: 'A energia', s: [
    { m: `Agora o andar de baixo, com o raio-X. A energia vem de uma **bateria 18650 Panasonic de 3.300 mAh**, o mesmo tipo usado em lanterna e notebook. Cheia ela tem **4,2 V**; na média, **3,6 V**.`,
      a: { f: ['bateria'], dir: 'front', lid: 0, xr: 1, g: ['bateria'] },
      why: `mAh é quanta carga ela guarda: 3.300 mAh daria 3,3 A durante 1 hora. A coleira parada gasta pouco, só o ESP32 e o receptor. O choque puxa uns 2 a 3 A, mas só por meio segundo, então uma carga dura vários treinos. Fuja de 18650 com "8.800 mAh" no anúncio: esse número não existe nesse tamanho de bateria.` },
    { m: `A bateria fica num **suporte** e uma **trava laranja** impressa em PETG segura ela no lugar quando o boi corre. O suporte de 2 andares também é impresso: bateria e módulo embaixo, placa em cima.`,
      a: { f: ['bateria', 'bandeja'], dir: 'front', xr: 1, g: ['bateria', 'bandeja'] },
      why: `PETG aguenta sol e calor melhor que PLA. PLA amolece dentro de uma caixa fechada no sol, por isso não entra em nada que vai no boi.` },
    { m: `O carregador é o **TP4056**, o módulo azul. Ele carrega a bateria pelo USB-C com **1 A**, até 4,2 V, e tem duas luzes: **vermelha** carregando e **azul** cheia.`,
      a: { f: ['tp4056', 'usbc'], dir: 'top', lid: 1, xr: 0, g: ['tp4056', 'usbc'], w: ['w_usbp', 'w_usbn'] },
      why: `Com 1 A, uma bateria vazia de 3.300 mAh leva umas 3 a 4 horas para encher. O chip TP4056 sozinho só carrega; os outros dois chips do módulo azul fazem a proteção, que é o próximo assunto.` },
    { m: `O módulo também **protege a bateria**: corta a energia se ela descer demais (uns 2,4 V), se der curto ou se a corrente passar de uns 3 A. Bateria de lítio que descarrega demais estraga e pode esquentar.`,
      a: { f: ['tp4056'], dir: 'top', lid: 1, g: ['tp4056', 'bateria'], w: ['w_bp', 'w_bn'] },
      why: `Quem faz isso são o chip DW01 e um MOSFET duplo 8205, os dois pretinhos ao lado do TP4056. A coleira ainda tem uma segunda camada: o ESP32 mede a bateria, bipa avisando em 3,5 V e bloqueia o choque em 3,3 V, bem antes da proteção do módulo atuar.` },
    { m: `Da saída do carregador, a energia passa pela **chave liga/desliga**. Com ela desligada, nada funciona: nem rádio, nem choque. É a chave que se desliga para pôr e tirar a coleira do boi.`,
      a: { f: ['chave', 'tp4056'], dir: 'left', lid: 1, g: ['chave', 'tp4056'], w: ['w_out', 'w_sw'] } },
    { quiz: { q: `Qual luz do carregador mostra que a bateria encheu?`, o: ['Vermelha', 'Azul', 'As duas apagadas'], ok: 1,
      e: `Vermelha é carregando, azul é cheia. Pela tampa transparente dá para ver sem abrir.` } }
  ] },
  { t: 'A placa de controle', s: [
    { m: `Em cima da bateria fica a **placa de controle**, uma placa ilhada de **7 × 9 cm**. Quase tudo está soldado nela, ligado por trilhas por baixo. Por isso dentro da caixa sobram só **10 fios soltos**.`,
      a: { f: ['placa'], dir: 'top', lid: 1, xr: 0, g: ['placa'] },
      why: `Placa ilhada tem furos a cada 2,54 mm, cada um com uma ilha de cobre. As peças entram nos furos e são ligadas com solda e fio por baixo. Para vender em quantidade, ela vira uma placa de circuito de fábrica, com as trilhas impressas, e a montagem cai para cerca de 1 hora.` },
    { m: `O cérebro é o **ESP32-C3 SuperMini**, uma placa de **22,5 × 18 mm**. Ele recebe o código do rádio, confere se pode dar choque, controla o tempo e o bipe, e mede a bateria.`,
      a: { f: ['esp32'], dir: 'top', lid: 1, g: ['esp32'] },
      why: `É um microcontrolador: um computador pequeno que roda um programa só, o firmware. Pode rodar a 160 MHz, mas o firmware usa 80 MHz para gastar menos bateria. Tem Wi-Fi e Bluetooth, que não usamos agora, mas podem servir numa versão futura. O firmware é gravado pelo USB-C dele, pela Arduino IDE.` },
    { m: `Cada pino tem uma função: o **GPIO 3** recebe os dados do rádio, os **GPIO 4 e 6** ligam as duas chaves do choque, o **GPIO 5** liga o buzzer, o **GPIO 1** é o botão de pareamento e o **GPIO 0** mede a bateria.`,
      a: { f: ['placa'], dir: 'top', lid: 1, g: ['esp32', 'rxb6', 'mosfetA', 'mosfetB', 'buzzer'] },
      why: `Como ele mede a bateria: ela chega a 4,2 V, e a entrada do ESP32 só lê até uns 2,5 V. Dois resistores de 100 kΩ dividem a tensão pela metade, então 4,2 V viram 2,1 V, e o programa multiplica por 2 de volta.` },
    { m: `O **buzzer** é ativo: com 3 V ele apita sozinho. O ESP32 não liga ele direto; liga um transistor **BC547**, que aguenta a corrente do buzzer sem forçar o pino.`,
      a: { f: ['buzzer'], dir: 'top', lid: 1, g: ['buzzer'] } },
    { m: `O **capacitor** azul, de **1.000 µF**, funciona como um reservatório. Quando o choque puxa 2 a 3 A, a tensão da bateria cai por um instante; o capacitor segura a tensão do ESP32 para ele não reiniciar.`,
      a: { f: ['placa'], dir: 'side', lid: 1, g: ['placa'] },
      ifs: [[`E se tirar o capacitor?`, `Cada choque poderia derrubar a tensão e reiniciar o ESP32. No meio do treino a coleira ficaria alguns segundos sem responder.`]] },
    { quiz: { q: `Qual peça decide se pode ou não dar choque?`, o: ['O RXB6', 'O ESP32', 'O TP4056'], ok: 1,
      e: `O RXB6 só escuta e o TP4056 só cuida da bateria. Quem decide é o ESP32.` } }
  ] },
  { t: 'O choque', s: [
    { m: `Agora a peça que dá o choque: o **módulo de alta tensão**, o cilindro preto de **6,4 cm** no andar de baixo. Ele recebe 3,7 V da bateria e solta **pulsos de milhares de volts**, com pouca corrente.`,
      a: { f: ['moduloAT'], dir: 'front', lid: 0, xr: 1, g: ['moduloAT'] },
      why: `Por dentro ele tem um oscilador, que transforma a corrente contínua da bateria em pulsos rápidos, e um transformador com muitas voltas de fio, que multiplica a tensão. É o mesmo princípio do bastão de choque e do acendedor de fogão.` },
    { m: `O anúncio diz **400.000 V**, mas isso é exagero de vendedor. O mesmo anúncio fala em faísca de **10 a 20 mm**. Como o ar aguenta uns 3.000 V por milímetro, isso dá algumas dezenas de milhares de volts.`,
      a: { f: ['moduloAT'], dir: 'front', xr: 1, g: ['moduloAT'] },
      why: `Quem diz a força real é a comparação com o bastão de choque para gado: faísca na mesma distância, um do lado do outro. Por isso a lista tem dois módulos: o cilindro e um bloco mais fraco, de uns 10.000 V e faísca de 5 mm. Fica o que chegar mais perto do bastão.` },
    { m: `O que dói num choque é a corrente que passa e por quanto tempo. Aqui cada pulso é muito curto e a corrente é pequena, como no bastão de gado e na cerca elétrica: dói e assusta. Os limites do firmware existem para o boi não levar mais que isso.`,
      a: { f: ['pinos', 'moduloAT'], dir: 'front', xr: 1, g: ['pinos', 'moduloAT'], w: ['w_hv1', 'w_hv2'], fx: 'spark' },
      why: `Mesmo assim: nunca teste em pessoa, e desligue a chave para mexer na coleira. Na bancada, a faísca é testada com as duas pontas presas e afastadas.` },
    { m: `O módulo fica sempre ligado no **positivo** da bateria, depois da chave. Quem decide se ele funciona são **duas chaves eletrônicas** no negativo: os MOSFETs **IRLZ44N**, A e B, deitados na placa.`,
      a: { f: ['mosfetA', 'mosfetB', 'moduloAT'], dir: 'side', xr: 1, g: ['mosfetA', 'mosfetB', 'moduloAT'], w: ['w_hvp', 'w_hvn'] },
      why: `MOSFET é uma chave sem nenhuma peça mexendo. Quando o ESP32 põe 3,3 V na porta dele, a corrente passa; com 0 V, ela para. Tem que ser o IRLZ44N, com L, que liga bem com os 3,3 V do ESP32. O IRFZ44N, com F, é parecido e mais fácil de achar, mas precisa de uns 10 V para ligar direito.` },
    { m: `Os dois MOSFETs ficam **em série**: a corrente passa pelo A e depois pelo B. O choque só sai com os dois ligados ao mesmo tempo.`,
      a: { f: ['mosfetA', 'mosfetB'], dir: 'top', lid: 1, xr: 0, g: ['mosfetA', 'mosfetB'] },
      ifs: [[`E se um MOSFET queimar?`, `MOSFET costuma queimar em curto, ou seja, fica ligado para sempre. Com um só, o boi levaria choque sem parar até a bateria acabar. Com dois em série, o outro ainda corta.`]],
      why: `Cada porta tem um resistor de 100 Ω, que segura o pico de corrente quando o ESP liga a chave, e um de 10 kΩ até o negativo, que mantém a chave desligada enquanto o ESP está ligando ou se um fio soltar.` },
    { m: `Com os dois ligados, a corrente faz este caminho: **bateria → carregador → chave → módulo → MOSFET A → MOSFET B → de volta à bateria**. Na saída do módulo, os fios grossos levam o pulso até os dois pinos.`,
      a: { cam: 'sim', lid: 0, xr: 1, g: PATH_C.concat(['pinos']), w: PATH_W.concat(['w_hv1', 'w_hv2']), fx: 'spark' } },
    { quiz: { q: `Por que são dois MOSFETs e não um?`, o: ['Para o choque ficar mais forte', 'Para que, se um queimar ligado, o outro ainda corte', 'Porque um só não cabe na placa'], ok: 1,
      e: `É uma proteção contra a falha mais comum desse tipo de peça.` } }
  ] },
  { t: 'As regras do cérebro', s: [
    { m: `O ESP32 segue regras que nenhum botão passa por cima. Elas protegem o boi e o próprio módulo.`,
      a: { f: ['esp32'], dir: 'top', lid: 1, xr: 0, g: ['esp32'] } },
    { m: `**Regra 1**: um toque, um choque. Segurar o botão não aumenta nada: o choque dura no máximo **1 segundo**.`,
      a: { f: ['esp32'], dir: 'top', lid: 1, g: ['esp32'] } },
    { m: `**Regra 2**: depois de um choque, o próximo só sai **3 segundos** depois, mesmo apertando de novo. **Regra 3**: no máximo **5 segundos** de choque somados em 1 minuto.`,
      a: { f: ['esp32', 'moduloAT'], dir: 'top', lid: 1, g: ['esp32', 'moduloAT'] },
      why: `O próprio anúncio do módulo avisa que ele não pode trabalhar direto por muito tempo. Com 1 s por vez e 5 s por minuto, ele fica longe do limite e não esquenta.` },
    { m: `**Regra 4**: o bipe vem sempre antes. **Regra 5**: ao ligar, as saídas começam desligadas, e um vigia interno, o **watchdog**, reinicia o ESP32 se o programa travar.`,
      a: { f: ['esp32', 'buzzer'], dir: 'top', lid: 1, g: ['esp32', 'buzzer', 'mosfetA', 'mosfetB'] },
      why: `O watchdog é um cronômetro que o programa precisa zerar o tempo todo. Se o programa travar e parar de zerar, o cronômetro estoura e reinicia o chip. Enquanto ele reinicia, os resistores de 10 kΩ deixam os MOSFETs desligados.` },
    { m: `Os 4 botões: **A** só bipa. **B** bipa e dá choque fraco: meio segundo em pulsos curtos. **C** é o médio: meio segundo com pulsos mais longos. **D** é o forte: 1 segundo direto.`,
      a: { f: ['controle'], dir: 'top', lid: 0, g: ['controle'] }, sims: [['B', 'normal', '▶ Ver o B em câmera lenta'], ['D', 'normal', '▶ Ver o D']],
      why: `Como os pulsos mudam a força: no B, o MOSFET fica, por exemplo, 30 ms ligado e 70 ms desligado. O módulo trabalha só 30% do tempo e o choque sai mais fraco. Esses tempos vão ser ajustados na bancada. Se os níveis não ficarem diferentes, eles viram níveis de tempo: 0,3, 0,6 e 1 s.` },
    { m: `A coleira também **conta** quantos bipes e choques deu. Quando o comprador devolver, dá para ler pelo USB e comparar com o que ele contou.`,
      a: { f: ['esp32'], dir: 'top', lid: 1, g: ['esp32'] } },
    { quiz: { q: `O peão aperta o D e segura por 10 segundos. O que acontece?`, o: ['10 s de choque', '1 s de choque e depois nada', 'Choque até soltar o botão'], ok: 1,
      e: `O limite é 1 s por toque. Para dar outro, solta, espera 3 s e aperta de novo.` } }
  ] },
  { t: 'Um toque, do começo ao fim', s: [
    { m: `Hora de juntar tudo. Abra a simulação: ela mostra um toque passo a passo, com pausa, e diz o que cada peça está fazendo. Depois teste os outros casos e veja o que muda.`,
      a: { cam: 'sim', lid: 0, xr: 1 },
      sims: [['B', 'normal', '▶ Toque no B'], ['B', 'vizinho', 'Controle do vizinho'], ['B', 'duas', 'Duas vezes seguidas'], ['D', 'segurar', 'Segurar o D'], ['B', 'fraca', 'Bateria fraca']] }
  ] },
  { t: 'O que pode dar errado', s: [
    { m: `Toda peça pode falhar, e o projeto tem uma resposta para cada falha importante. **Choque sem ninguém apertar**: só controles pareados funcionam, as saídas começam desligadas e tem um teste de 1 hora com a coleira ligada perto de controles de portão.`,
      a: { f: ['esp32'], dir: 'top', lid: 1, xr: 0, g: ['esp32', 'mosfetA', 'mosfetB'] } },
    { m: `**Água e poeira**: caixa IP66, silicone neutro em cada furo e um saquinho de sílica gel por dentro. **Pancada**: protetor de TPU, placa presa no suporte e bateria travada.`,
      a: { f: ['caixa'], dir: 'iso', lid: 0, g: ['caixa', 'protetor', 'bandeja'] },
      why: `Silicone acético, o que tem cheiro de vinagre, solta ácido enquanto seca e corrói as placas. Por isso tem que ser o neutro.` },
    { m: `**Coleira enroscada**: o elo fraco de velcro abre. **Bateria acabando no treino**: ao ligar, os bipes mostram a carga (1 boa, 2 baixa, 3 no fim) e a bateria vai cheia para cada dia. **Controle perdido**: o reserva já vai pareado.`,
      a: { f: ['elo', 'fivela'], dir: 'front', zoom: 1.2, g: ['elo', 'controle'] } },
    { m: `**Pessoa encostada na coleira quando alguém aperta o controle**: a regra é desligar a chave para pôr, tirar ou mexer na coleira, com aviso escrito na caixa e no manual.`,
      a: { f: ['chave'], dir: 'left', lid: 0, g: ['chave'] } }
  ] },
  { t: 'Explicando para o seu pai', s: [
    { m: `Agora o roteiro para você contar, peça por peça. Cada fala vem com o 3D mostrando a peça. Pode ler em voz alta.`,
      a: { cam: 'home', lid: 0, xr: 0, ex: 0 } },
    { m: `"No treino de laço o boi fica manhoso e para de correr. O aparelho importado que resolve custa uns **R$ 4.400**. A gente montou um por uns **R$ 200** em peças."`,
      a: { cam: 'home', g: ['caixa', 'controle'] } },
    { m: `"A caixa é uma caixa de passagem Multitoc de **10 × 10 × 7 cm**, IP66: não entra poeira e aguenta jato d'água. Em volta tem um protetor de borracha impresso, e ela vai no pescoço numa fita de **50 mm**, com fivela e um elo de velcro que abre se enroscar."`,
      a: { f: ['caixa'], dir: 'iso', g: ['caixa', 'protetor', 'fita'] } },
    { m: `"O controle é de portão, **433 MHz**, com 4 botões e pilha de 12 V. O anúncio fala em **mais de 100 metros** em campo aberto. Cada controle tem um código próprio, e a coleira só obedece os que foram pareados."`,
      a: { f: ['controle', 'caixa'], dir: 'iso', g: ['controle'], fx: 'rings', btn: 'B' } },
    { m: `"Dentro tem dois andares. Embaixo, a **bateria 18650 de 3.300 mAh** e o **módulo de alta tensão**. Em cima, a placa com o **ESP32**, que é o cérebro, o **receptor de rádio**, o **carregador USB-C** e **duas chaves eletrônicas**."`,
      a: { f: ['placa', 'bateria', 'moduloAT'], dir: 'iso', lid: 0, xr: 1, g: ['bateria', 'moduloAT', 'esp32', 'rxb6', 'tp4056', 'mosfetA', 'mosfetB'] } },
    { m: `"Quando eu aperto o B, o receptor pega o código, o ESP32 confere, bipa e liga as duas chaves por **meio segundo**. A bateria alimenta o módulo, que solta pulsos de milhares de volts com pouca corrente, e o pulso sai por **dois pinos de inox**, de um para o outro, pela pele."`,
      a: { cam: 'sim', xr: 1, g: PATH_C.concat(['pinos', 'controle', 'rxb6', 'esp32']), w: PATH_W.concat(['w_hv1', 'w_hv2']), fx: 'spark' } },
    { m: `"Para segurança: choque de no máximo **1 segundo**, pausa de **3 segundos**, bipe sempre antes, duas chaves em série caso uma queime e um elo fraco na fita."`,
      a: { f: ['esp32'], dir: 'top', lid: 1, xr: 0, g: ['esp32', 'mosfetA', 'mosfetB', 'buzzer'] } },
    { m: `**Versão de 30 segundos**: "É uma coleira com controle de portão. Aperta o botão, ela bipa e dá um choque curto, igual bastão de gado, para o boi correr no treino. Dentro tem uma bateria de lanterna, um chip que confere o controle e limita o tempo, e um módulo que gera o choque. Custa uns R$ 200 em peças; o importado sai R$ 4.400."`,
      a: { cam: 'home', lid: 0, xr: 0 } },
    { m: `Pronto, essa é a coleira inteira. Se travar em alguma parte, volte ao capítulo pelo menu lá em cima{ASK}.`,
      a: { cam: 'home' }, end: true }
  ] }
];

// ---------- efeitos: anéis de rádio, faísca, bipe ----------
let nowT = 0;
const fx = { ringsAt: -1, sparkUntil: -1, btn: null, btnUntil: -1 };
let audioCtx = null;
function getAudio() {
  try { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) {}
  return audioCtx;
}
function fxRings(btn) { fx.ringsAt = nowT; if (btn) { fx.btn = btn; fx.btnUntil = nowT + 0.5; } }
function fxSpark(d = 1.1) { fx.sparkUntil = nowT + d; }
function fxBeep(n = 1) {
  const ctx = getAudio(); if (!ctx) return;
  for (let i = 0; i < n; i++) {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 2700; g.gain.value = 0.0001;
      o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.3;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.start(t); o.stop(t + 0.23);
    } catch (e) {}
  }
}
function updateFx() {
  Object.entries(fobButtons).forEach(([k, b]) => { b.position.y = (fx.btn === k && nowT < fx.btnUntil) ? 0.64 : 0.72; });
  const bz = { A: -2.2, B: -0.75, C: 0.7, D: 2.15 }[fx.btn] ?? -0.75;
  const from = comps.controle.group.localToWorld(V(0, 0.85, bz));
  const to = comps.rxb6.group.localToWorld(V(-1.4, 0.3, 0));
  rings.forEach((m, k) => {
    const lt = fx.ringsAt < 0 ? -1 : (nowT - fx.ringsAt - k * 0.22) / 1.0;
    if (lt < 0 || lt > 1) { m.visible = false; return; }
    m.visible = true; m.position.copy(from).lerp(to, lt); m.lookAt(to); const s = 0.6 + lt * 2.2; m.scale.set(s, s, s); m.material.opacity = 0.85 * (1 - lt);
  });
  const sparking = nowT < fx.sparkUntil;
  spark.visible = glow.visible = sparking;
  if (sparking) { makeSpark(); sparkLight.intensity = 40 + Math.random() * 80; glow.material.opacity = 0.6 + Math.random() * 0.4; }
  else sparkLight.intensity = 0;
}

// ---------- câmera: enquadrar peças ----------
const restBox = {};
scene.updateMatrixWorld(true);
Object.values(comps).forEach(cp => { restBox[cp.id] = new THREE.Box3().setFromObject(cp.group); });
const DIRS = { iso: V(0.75, 0.62, 1), front: V(0.45, 0.42, 1), top: V(0.22, 1, 0.5), side: V(1, 0.5, 0.3), left: V(-1, 0.45, 0.55), bottom: V(0.45, -0.5, 1) };
const SIMCAM = { pos: V(10, 34, 38), target: V(-2, 1.2, 5.5) };
const isNarrow = () => stage.clientWidth < 760;
function focusOn(ids, dir = 'iso', zoom = 1) {
  const box = new THREE.Box3();
  ids.forEach(id => { if (!restBox[id]) return; const b = restBox[id].clone(); b.translate(comps[id].explode.clone().multiplyScalar(state.exT)); box.union(b); });
  if (box.isEmpty()) return;
  const c = box.getCenter(V(0, 0, 0)), size = box.getSize(V(0, 0, 0)).length();
  const d = (DIRS[dir] || DIRS.iso).clone().normalize();
  const dist = Math.max(9, Math.min(62, size * 2.2 / zoom + 5)) * (isNarrow() ? 1.3 : 1);
  tweenCam(c.clone().addScaledVector(d, dist), c, 1.1);
}
function camPreset(name) {
  const k = isNarrow() ? 1.25 : 1;
  if (name === 'home') tweenCam(HOME.pos.clone(), HOME.target.clone(), 1.1);
  else if (name === 'sim') tweenCam(SIMCAM.target.clone().add(SIMCAM.pos.clone().sub(SIMCAM.target).multiplyScalar(k)), SIMCAM.target.clone(), 1.1);
}
// desloca o centro da imagem para a área livre (fora dos painéis)
function updateOffset() {
  const w = stage.clientWidth, h = stage.clientHeight;
  let ox = 0, oy = 0;
  const lsOn = document.body.classList.contains('ls-on'), simOn = document.body.classList.contains('sim-on');
  if (w >= 760) { if (lsOn) ox = Math.round(((390 + 16) - ($('controls').offsetWidth + 16)) / 2); if (simOn) oy = 80; }
  else if (lsOn || simOn) oy = Math.round(h * 0.25);
  if (ox || oy) camera.setViewOffset(w, h, ox, oy, w, h); else camera.clearViewOffset();
}

// ---------- aplica o que cada fala mostra no 3D ----------
function setExQuiet(on) { state.exT = on ? 1 : 0; bEx.setAttribute('aria-pressed', on); if (on) setLid(true); }
function applyAct(a = {}, keepSim) {
  if (simS && !keepSim) closeSim();
  select(null);
  if ('ex' in a) setExQuiet(!!a.ex);
  if ('lid' in a) setLid(!!a.lid);
  if ('xr' in a) setXr(!!a.xr);
  simGlow.clear(); simWires.clear();
  (a.g || []).forEach(id => { if (comps[id]) simGlow.set(id, 0.35); });
  (a.w || []).forEach(id => simWires.add(id));
  if (a.cam) camPreset(a.cam);
  else if (a.f) focusOn(a.f, a.dir, a.zoom || 1);
  if (a.fx === 'rings') fxRings(a.btn || 'B');
  if (a.fx === 'spark') fxSpark(1.3);
  if (a.fx === 'beep') fxBeep();
}

// ---------- aula: conversa ----------
const lessonEl = $('lesson'), lsLog = $('lsLog'), lsActs = $('lsActs'), lsChap = $('lsChap');
const LS_KEY = 'coleira3d-aula-v1';
let lsOpen = false, askOn = false;
const ls = { ch: 0, st: -1 };
const escH = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace('{ASK}', askOn ? ' ou pergunte na caixa aqui embaixo' : '');
const fmtAns = s => escH(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
lsChap.innerHTML = LESSON.map((c, i) => `<option value="${i}">${i + 1}. ${escH(c.t)}</option>`).join('');
function saveLs() { try { localStorage.setItem(LS_KEY, JSON.stringify({ ch: ls.ch, st: ls.st })); } catch (e) {} }
function loadLs() { try { const v = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); if (v && LESSON[v.ch] && LESSON[v.ch].s[v.st]) return v; } catch (e) {} return null; }
function scrollLog() { requestAnimationFrame(() => { lsLog.scrollTop = lsLog.scrollHeight; }); }
function bubble(kind, html, act) {
  const d = document.createElement('div');
  d.className = 'b ' + kind;
  d.innerHTML = html;
  if (act) {
    const r = document.createElement('button');
    r.className = 'replay'; r.type = 'button'; r.textContent = '↺ mostrar no 3D';
    r.onclick = () => applyAct(act);
    d.appendChild(r);
  }
  lsLog.appendChild(d); scrollLog();
  return d;
}
function divider(text) { const d = document.createElement('div'); d.className = 'div'; d.textContent = text; lsLog.appendChild(d); }
function actBtn(label, fn, cls) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'la' + (cls ? ' ' + cls : ''); b.textContent = label;
  b.onclick = () => fn(b);
  lsActs.appendChild(b);
  return b;
}
function stepLabel() {
  const c = LESSON[ls.ch], last = ls.st >= c.s.length - 1;
  if (last && ls.ch >= LESSON.length - 1) return 'Recomeçar a aula';
  return last ? 'Próximo capítulo →' : 'Continuar →';
}
function showStep(resumed) {
  const c = LESSON[ls.ch], st = c.s[ls.st];
  lsChap.value = String(ls.ch);
  if (ls.st === 0 || resumed) divider(`Capítulo ${ls.ch + 1} de ${LESSON.length} · ${c.t}`);
  lsActs.innerHTML = '';
  if (st.quiz) { renderQuiz(st.quiz); saveLs(); return; }
  bubble('me', fmt(st.m), st.a);
  if (st.a) applyAct(st.a);
  renderActs(st);
  saveLs();
}
function renderActs(st) {
  lsActs.innerHTML = '';
  if (st.why) actBtn('Por quê?', b => { bubble('you', 'Por quê?'); bubble('me', fmt(st.why)); b.remove(); });
  (st.ifs || []).forEach(([q, ans]) => actBtn(q, b => { bubble('you', escH(q)); bubble('me', fmt(ans)); b.remove(); }));
  (st.sims || []).forEach(([btn, scen, label]) => actBtn(label, () => openSim(btn, scen), 'sim'));
  actBtn(stepLabel(), nextStep, 'next');
}
function renderQuiz(qz) {
  const d = bubble('me quiz', `<div class="qk">Pergunta rápida</div>${fmt(qz.q)}<div class="opts"></div>`);
  const box = d.querySelector('.opts');
  qz.o.forEach((o, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = o;
    b.onclick = () => {
      box.querySelectorAll('button').forEach((x, j) => { x.disabled = true; if (j === qz.ok) x.classList.add('ok'); });
      if (i !== qz.ok) b.classList.add('no');
      bubble('you', escH(o));
      bubble('me', (i === qz.ok ? '<b>Certo.</b> ' : `<b>Ainda não.</b> A resposta é: ${escH(qz.o[qz.ok])}. `) + fmt(qz.e));
      actBtn(stepLabel(), nextStep, 'next');
    };
    box.appendChild(b);
  });
}
function nextStep() {
  const c = LESSON[ls.ch];
  if (ls.st < c.s.length - 1) ls.st++;
  else if (ls.ch < LESSON.length - 1) { ls.ch++; ls.st = 0; }
  else { ls.ch = 0; ls.st = 0; lsLog.innerHTML = ''; }
  showStep();
}
function jumpTo(ch) { ls.ch = ch; ls.st = 0; showStep(); }
lsChap.onchange = () => jumpTo(+lsChap.value);
function openLesson() {
  lsOpen = true; lessonEl.hidden = false; document.body.classList.add('ls-on');
  $('bLesson').setAttribute('aria-pressed', 'true');
  updateOffset();
  if (!lsLog.childElementCount) {
    const saved = loadLs();
    if (saved && (saved.ch > 0 || saved.st > 0)) {
      ls.ch = saved.ch; ls.st = saved.st;
      const d = document.createElement('div'); d.className = 'div'; d.textContent = 'Continuando de onde você parou';
      lsLog.appendChild(d);
      showStep(true);
      actBtn('Começar do início', () => { lsLog.innerHTML = ''; ls.ch = 0; ls.st = 0; showStep(); });
    } else { ls.ch = 0; ls.st = 0; showStep(); }
  } else {
    const st = LESSON[ls.ch].s[ls.st];
    if (st && st.a) applyAct(st.a);
  }
}
function closeLesson() {
  lsOpen = false; lessonEl.hidden = true; document.body.classList.remove('ls-on');
  $('bLesson').setAttribute('aria-pressed', 'false');
  simGlow.clear(); simWires.clear();
  updateOffset();
}
$('bLesson').onclick = () => (lsOpen ? closeLesson() : openLesson());
$('lsClose').onclick = closeLesson;
// clicar numa peça durante a aula puxa assunto sobre ela
function talkAbout(id) {
  const cp = comps[id]; if (!cp) return;
  bubble('you', `O que é isso? (${escH(cp.name)})`);
  const a = { g: [id], f: [id], dir: cp.side === 'dentro' ? 'top' : 'iso' };
  if (cp.side === 'dentro' && state.lidT < 0.5 && state.xrT < 0.5) a.lid = 1;
  bubble('me', `<b>${escH(cp.name)}</b><br>${escH(cp.what)}<div class="bc">Custo: ${escH(cp.cost)}</div>`, a);
  applyAct(a);
}

// ---------- simulação em câmera lenta ----------
const simbar = $('simbar');
const LEVELS = {
  A: { dur: 0 },
  B: { dur: 0.5, on: 30, off: 70, text: 'O B é o choque fraco. O ESP32 deixa o MOSFET B ligado por 0,5 s e, nesse tempo, liga e desliga o A em pulsos curtos: 30 ms ligado e 70 ms desligado.', num: 'B: 5 pulsos de 30 ms em 0,5 s', shock: 'Choque fraco: 0,5 s em pulsos curtos' },
  C: { dur: 0.5, on: 70, off: 30, text: 'O C é o médio. Mesma janela de 0,5 s no MOSFET B, mas os pulsos do A ficam mais longos: 70 ms ligado e 30 ms desligado.', num: 'C: 5 pulsos de 70 ms em 0,5 s', shock: 'Choque médio: 0,5 s em pulsos longos' },
  D: { dur: 1, on: 1000, off: 0, text: 'O D é o forte. Os dois MOSFETs ficam ligados direto por 1 s.', num: 'D: ligado direto por 1 s', shock: 'Choque forte: 1 s direto' }
};
const SCEN = { normal: 'Normal', vizinho: 'Controle do vizinho', duas: 'Duas vezes seguidas', segurar: 'Segurar o botão', fraca: 'Bateria fraca' };
function buildSteps(btn, scen) {
  const L = LEVELS[btn], S = [];
  if (scen === 'vizinho') {
    S.push({ s: 'O vizinho aperta o controle de portão dele. Também é 433 MHz, então o sinal chega até a coleira.', n: 'Frequência: 433,92 MHz · Código: de outro controle', c: ['controle'], fx: 'rings', dur: 3.4 });
    S.push({ s: 'O RXB6 recebe o sinal pela antena em mola e entrega os pulsos ao ESP32 pelo GPIO 3 (trilha amarela da placa).', n: 'O RXB6 recebe qualquer sinal de 433 MHz', c: ['rxb6', 'antena'], dur: 3.4 });
    S.push({ s: 'O ESP32 compara o código com os controles salvos. Esse não está na lista, então ele ignora. Nada bipa e nada liga.', n: 'Código: desconhecido ✗ · MOSFETs: desligados', c: ['esp32'], dur: 4.4 });
    return S;
  }
  S.push({ s: `Você aperta o ${btn}. O controle manda por rádio o código dele e o número do botão, repetindo várias vezes em menos de 1 segundo.`, n: 'Frequência: 433,92 MHz · Código: 20 bits do controle + 4 bits do botão', c: ['controle'], fx: 'rings', dur: 3.4 });
  S.push({ s: 'O RXB6 pega o sinal pela antena em mola e entrega os pulsos ao ESP32 pelo GPIO 3 (trilha amarela da placa).', n: 'Sensibilidade do RXB6: −116 dBm · Consumo: 6 mA', c: ['rxb6', 'antena'], dur: 3.4 });
  S.push({ s: 'O ESP32 decodifica e compara o código com os controles salvos. Esse é pareado.', n: 'Código: pareado ✓', c: ['esp32'], dur: 3 });
  if (scen === 'fraca') {
    S.push({ s: 'Antes de liberar, ele mede a bateria pelo divisor de tensão no GPIO 0. Ela está abaixo de 3,3 V: o choque fica bloqueado e o buzzer dá bipes de aviso.', n: 'Bateria: 3,2 V ✗ · Avisa abaixo de 3,5 V · Bloqueia abaixo de 3,3 V', c: ['esp32', 'buzzer', 'bateria'], fx: 'beep3', dur: 4.6 });
    S.push({ s: 'Hora de recarregar: chave desligada e USB-C num carregador de celular. Luz vermelha carregando, azul cheia.', n: 'Carga: 1 A · De vazia a cheia: uns 3 a 4 horas', c: ['usbc', 'tp4056', 'chave'], w: ['w_usbp', 'w_usbn'], dur: 4.4 });
    return S;
  }
  S.push({ s: 'Ele confere as regras: passaram 3 s do último choque? Sobra tempo no limite de 5 s por minuto? A bateria está acima de 3,3 V?', n: 'Último choque: há 12 s ✓ · Usado no minuto: 0 de 5 s ✓ · Bateria: 3,9 V ✓', c: ['esp32'], dur: 4 });
  S.push({ s: 'Bipe de aviso. O ESP32 liga o buzzer pelo GPIO 5, através do transistor BC547.', n: 'Bipe antes de todo choque', c: ['buzzer'], fx: 'beep', dur: 2.8 });
  if (btn === 'A') {
    S.push({ s: 'O A só bipa. Os MOSFETs continuam desligados e nada chega ao módulo. É o botão para o boi aprender o som.', n: 'MOSFETs: desligados · Choque: nenhum', c: [], dur: 4.2 });
    return S;
  }
  S.push({ s: L.text, n: `Portas dos MOSFETs: 3,3 V nos GPIO 4 e 6 · ${L.num}`, c: ['mosfetA', 'mosfetB', 'esp32'], graph: btn, dur: 4.8 });
  S.push({ s: 'Com as duas chaves fechadas, a corrente circula: bateria → carregador → chave → módulo → MOSFET A → MOSFET B → de volta à bateria.', n: 'Corrente: uns 2 a 3 A enquanto o pulso dura · O capacitor de 1.000 µF segura a tensão do ESP32', c: PATH_C, w: PATH_W, dur: 4.8 });
  S.push({ s: 'O módulo transforma os 3,7 V em pulsos de milhares de volts. Eles saem pelos fios grossos, chegam aos pinos de inox e passam pela pele, de um pino para o outro.', n: `Distância entre os pinos: 4 cm · ${L.shock}`, c: ['moduloAT', 'pinos'], w: ['w_hv1', 'w_hv2'], fx: 'spark', dur: 4.4 });
  if (scen === 'segurar') S.push({ s: 'Você continua segurando o botão. Não muda nada: o choque já parou no limite. Para dar outro, solte, espere 3 s e aperte de novo.', n: `Choque deste toque: ${btn === 'D' ? '1 s' : '0,5 s'} · Limite por toque: 1 s`, c: ['controle', 'esp32'], dur: 4.4 });
  S.push({ s: 'Os MOSFETs desligam e começa a contagem de 3 s para o próximo choque.', n: `Usado no minuto: ${String(L.dur).replace('.', ',')} de 5 s · Próximo choque liberado em 3 s`, c: ['esp32'], dur: 3.4 });
  if (scen === 'duas') {
    S.push({ s: 'Você aperta de novo, 1 segundo depois. O código é pareado, mas ainda não passaram 3 s: o ESP32 ignora esse toque, sem bipe e sem choque.', n: 'Último choque: há 1 s ✗ (precisa de 3 s)', c: ['controle', 'esp32'], fx: 'rings', dur: 4.6 });
    S.push({ s: 'Passados os 3 s, o próximo toque volta a funcionar normalmente.', n: 'Pausa mínima entre choques: 3 s', c: ['esp32'], dur: 3.2 });
  }
  return S;
}
function pulseSVG(btn) {
  const L = LEVELS[btn]; if (!L || !L.dur) return '';
  const W = 300, H = 40, total = 1000, x = ms => 10 + (ms / total) * (W - 20);
  let d = `M${x(0)} 32`; let t = 0;
  while (t < L.dur * 1000 - 0.1) { const on = Math.min(L.on, L.dur * 1000 - t); d += ` L${x(t)} 32 L${x(t)} 8 L${x(t + on)} 8 L${x(t + on)} 32`; t += L.on + L.off; }
  d += ` L${x(total)} 32`;
  return `<svg viewBox="0 0 ${W} ${H + 12}" width="100%" height="52" role="img" aria-label="Pulsos do botão ${btn}"><path d="${d}" fill="none" stroke="#1d63d8" stroke-width="2"/><line x1="10" y1="32" x2="${W - 10}" y2="32" stroke="#ccd2d8"/><text x="10" y="48" font-size="10" fill="#5a636c">0 s</text><text x="${x(500)}" y="48" font-size="10" fill="#5a636c" text-anchor="middle">0,5 s</text><text x="${W - 10}" y="48" font-size="10" fill="#5a636c" text-anchor="end">1 s</text><text x="${W - 10}" y="7" font-size="9.5" fill="#5a636c" text-anchor="end">ligado</text></svg><div class="gk">Os tempos dos pulsos são o ponto de partida e vão ser ajustados na bancada.</div>`;
}
let simS = null;
function openSim(btn = 'B', scen = 'normal') {
  if (scen === 'segurar' && btn === 'A') btn = 'D';
  simS = { btn, scen, steps: buildSteps(btn, scen), i: -1, t: 0, playing: true };
  simbar.hidden = false; document.body.classList.add('sim-on');
  simbar.querySelectorAll('[data-btn]').forEach(b => b.setAttribute('aria-pressed', b.dataset.btn === btn));
  $('simScen').value = scen;
  select(null); setExQuiet(false); setLid(false); setXr(true);
  updateOffset(); camPreset('sim');
  getAudio();
  simGo(0);
}
function simGo(i) {
  if (!simS) return;
  simS.i = Math.max(0, Math.min(simS.steps.length - 1, i)); simS.t = 0;
  const st = simS.steps[simS.i];
  simGlow.clear(); simWires.clear();
  (st.c || []).forEach(id => simGlow.set(id, 0.35)); (st.w || []).forEach(id => simWires.add(id));
  if (st.fx === 'rings') fxRings(simS.btn);
  if (st.fx === 'beep') fxBeep(1);
  if (st.fx === 'beep3') fxBeep(3);
  if (st.fx === 'spark') fxSpark(1.2);
  $('simN').textContent = `${simS.i + 1}/${simS.steps.length}`;
  $('simS').textContent = st.s;
  $('simNum').textContent = st.n || '';
  $('simGraph').innerHTML = st.graph ? pulseSVG(st.graph) : '';
  $('simTitle').textContent = `Simulação · botão ${simS.btn} · ${SCEN[simS.scen]}`;
  simPlayLabel();
}
function simPlayLabel() {
  if (!simS) return;
  const done = !simS.playing && simS.i >= simS.steps.length - 1 && simS.t >= simS.steps[simS.i].dur;
  $('simPlay').textContent = done ? '↺ De novo' : (simS.playing ? '⏸ Pausar' : '▶ Continuar');
}
function runSim(dt) {
  if (!simS) return;
  const st = simS.steps[simS.i];
  if (simS.playing) {
    simS.t += dt * ($('simSlow').checked ? 0.5 : 1);
    if (simS.t >= st.dur) {
      if (simS.i + 1 < simS.steps.length) simGo(simS.i + 1);
      else { simS.t = st.dur; simS.playing = false; simPlayLabel(); }
    }
  }
  const tot = simS.steps.length;
  $('simProg').style.width = (((simS.i + Math.min(1, simS.t / st.dur)) / tot) * 100).toFixed(1) + '%';
}
function closeSim() {
  if (!simS) return;
  simS = null; simbar.hidden = true; document.body.classList.remove('sim-on');
  simGlow.clear(); simWires.clear();
  updateOffset();
}
$('simPlay').onclick = () => {
  if (!simS) return;
  const last = simS.i >= simS.steps.length - 1 && simS.t >= simS.steps[simS.i].dur;
  if (last) { simS.playing = true; simGo(0); return; }
  simS.playing = !simS.playing; simPlayLabel();
};
$('simPrev').onclick = () => { if (simS) { simS.playing = false; simGo(simS.i - 1); } };
$('simNext').onclick = () => { if (simS) { simS.playing = false; simGo(simS.i + 1); } };
$('simClose').onclick = () => { closeSim(); if (lsOpen) { const st = LESSON[ls.ch].s[ls.st]; if (st && st.a) applyAct(st.a); } else setXr(false); };
simbar.querySelectorAll('[data-btn]').forEach(b => { b.onclick = () => openSim(b.dataset.btn, $('simScen').value); });
$('simScen').onchange = () => openSim(simS ? simS.btn : 'B', $('simScen').value);
bSim.onclick = () => openSim('B', 'normal');

// ---------- pergunte ao Claude ----------
const askForm = $('lsAsk'), askQ = $('lsQ');
let samp = null, asking = false;
const askHist = [];
function factsText() {
  const parts = Object.values(comps).map(c => `- ${c.id}: ${c.name}. ${c.what} Custo: ${c.cost}`).join('\n');
  const ws = wires.map(w => `- ${w.id}: ${w.label}`).join('\n');
  const lesson = LESSON.map(c => `## ${c.t}\n` + c.s.map(s => s.quiz ? '' : [s.m, s.why, ...(s.ifs || []).map(x => x.join(' '))].filter(Boolean).join(' ')).join('\n')).join('\n\n').replace(/\*\*/g, '').replace('{ASK}', '');
  return `PEÇAS DO MODELO 3D (id: nome. descrição. custo):\n${parts}\n\nFIOS SOLTOS (id: ligação):\n${ws}\n\nCONTEÚDO DA AULA (fatos do projeto):\n${lesson}`;
}
const ASK_RULES = `Você é o Claude explicando, dentro de um modelo 3D, como funciona uma coleira de choque remoto para boi, feita para treino de laço. É um protótipo de uma unidade para o comprador testar.
Regras da resposta:
- Português do Brasil, frases simples e diretas, como numa conversa com alguém leigo em eletrônica.
- Curta: até umas 120 palavras, a não ser que peçam mais detalhe.
- Não use construções do tipo "não é X, é Y" nem frases de efeito.
- Use os números dos fatos abaixo. Se a resposta não estiver nos fatos e você não tiver certeza, diga que isso ainda não foi definido ou testado. Não invente medidas.
- Sempre que falar de peças específicas, chame a ferramenta mostrar_no_3d com os ids delas antes de terminar a resposta.
- Se a pergunta for sobre o que acontece num toque do controle, ou num caso como controle do vizinho, duas vezes seguidas, segurar o botão ou bateria fraca, chame simular_toque.
- Nunca dê instruções para machucar animais ou pessoas. O choque é para treino, com os limites do firmware. Choque não se testa em pessoa.`;
const TOOLS = [
  { name: 'mostrar_no_3d', description: 'Acende peças e fios no modelo 3D e move a câmera até elas.',
    inputSchema: { type: 'object', properties: {
      pecas: { type: 'array', items: { type: 'string', enum: Object.keys(comps) }, description: 'ids das peças' },
      fios: { type: 'array', items: { type: 'string', enum: wires.map(w => w.id) }, description: 'ids dos fios soltos, opcional' },
      raio_x: { type: 'boolean', description: 'deixa a caixa transparente para ver o andar de baixo' } }, required: ['pecas'] },
    execute: inp => {
      const ids = (inp.pecas || []).filter(id => comps[id]);
      const a = { g: ids, w: (inp.fios || []).filter(id => wires.some(w => w.id === id)), xr: !!inp.raio_x };
      if (ids.length) { a.f = ids; a.dir = ids.every(id => comps[id].side === 'dentro') ? 'top' : 'iso'; }
      if (!inp.raio_x && ids.some(id => comps[id].side === 'dentro')) a.lid = 1;
      applyAct(a);
      return { ok: true, mostradas: ids };
    } },
  { name: 'simular_toque', description: 'Abre a simulação em câmera lenta de um toque no controle.',
    inputSchema: { type: 'object', properties: {
      botao: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
      caso: { type: 'string', enum: ['normal', 'vizinho', 'duas', 'segurar', 'fraca'], description: 'normal, controle do vizinho, duas vezes seguidas, segurar o botão ou bateria fraca' } }, required: ['botao'] },
    execute: inp => { openSim(['A', 'B', 'C', 'D'].includes(inp.botao) ? inp.botao : 'B', SCEN[inp.caso] ? inp.caso : 'normal'); return { ok: true }; } }
];
async function ask(q) {
  if (!samp || asking) return;
  asking = true; askForm.classList.add('busy');
  bubble('you', escH(q));
  const b = bubble('me ans', '<span class="typing">Pensando...</span>');
  const hist = askHist.slice(-6).map(h => `${h.r === 'u' ? 'Pergunta' : 'Resposta'}: ${h.t}`).join('\n');
  const prompt = `${ASK_RULES}\n\n${factsText()}\n\n${hist ? 'CONVERSA ATÉ AGORA:\n' + hist + '\n\n' : ''}PERGUNTA: ${q}`;
  try {
    const r = await samp(prompt, { onText: ({ text }) => { b.innerHTML = fmtAns(text); scrollLog(); }, tools: TOOLS, modelTier: 'default', cache: false });
    b.innerHTML = fmtAns(r.text || '');
    askHist.push({ r: 'u', t: q }, { r: 'a', t: r.text || '' });
  } catch (err) {
    if (err && err.code === 'not_granted') { b.textContent = 'A caixa de perguntas não foi liberada aqui. A aula continua funcionando normalmente.'; askForm.hidden = true; askOn = false; }
    else if (err && err.code === 'rate_limited') b.textContent = 'Muitas perguntas seguidas. Espere um pouco e tente de novo.';
    else if (err && err.text) b.innerHTML = fmtAns(err.text);
    else b.textContent = 'Não consegui responder agora. Tente de novo daqui a pouco.';
  }
  asking = false; askForm.classList.remove('busy'); scrollLog();
}
askForm.onsubmit = e => { e.preventDefault(); const q = askQ.value.trim(); if (!q) return; askQ.value = ''; ask(q); };
if (window.claude && typeof window.claude.use === 'function') {
  window.claude.use('sample').then(s => { if (s) { samp = s; askOn = true; askForm.hidden = false; } }).catch(() => {});
}

// ---------- laço ----------
let frameNo = 0;
const occRay = new THREE.Raycaster();
const tmpV = new THREE.Vector3();
function occludeLabels() {
  const solid = pickables.filter(o => o.visible && !(state.xr > 0.5 && comps[o.userData.compId]?.xray));
  labels.forEach(L => {
    if (!L.obj.visible) return;
    L.obj.getWorldPosition(tmpV);
    const dir = tmpV.clone().sub(camera.position); const dist = dir.length(); dir.normalize();
    occRay.set(camera.position, dir); occRay.far = dist - 0.4;
    const hit = occRay.intersectObjects(solid, false).find(h => h.object.userData.compId !== L.cp.id);
    L.el.style.opacity = hit ? '0.3' : '1';
  });
}
const clock = new THREE.Clock();
function frame() {
  if (!stage.clientWidth) { clock.getDelta(); requestAnimationFrame(frame); return; }
  const raw = clock.getDelta();
  const dt = Math.min(raw, 0.05), rdt = Math.min(raw, 0.25);
  const k = 1 - Math.pow(0.0015, dt);
  state.lid += (state.lidT - state.lid) * Math.min(1, k * 1.3);
  state.ex += (state.exT - state.ex) * Math.min(1, k * 1.1);
  state.xr += (state.xrT - state.xr) * Math.min(1, k * 1.6);
  nowT += rdt;
  applyPose();
  runSim(rdt);
  updateFx();
  updateGlow();
  if (camTween) {
    camTween.t += rdt / camTween.dur;
    const e = ease(clamp01(camTween.t));
    if (camTween.p1) camera.position.lerpVectors(camTween.p0, camTween.p1, e);
    controls.target.lerpVectors(camTween.t0, camTween.t1, e);
    if (camTween.t >= 1) camTween = null;
  }
  controls.update();
  if ((++frameNo % 8) === 0) occludeLabels();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h); labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  const narrow = w < 760;
  camera.fov = narrow ? 46 : 32;
  camera.updateProjectionMatrix();
  updateOffset();
}
window.addEventListener('resize', resize);
resize();
if (stage.clientWidth < 760) { HOME.pos.multiplyScalar(1.25); HOME.target.set(0, -2, 0); camera.position.copy(HOME.pos); controls.target.copy(HOME.target); }
msg.remove();
frame();
openLesson();
}
window.Projeto3D = { iniciar };
if (window.projeto3dPedido) iniciar();
