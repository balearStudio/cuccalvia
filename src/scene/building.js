import * as THREE from 'three';
import { buildTextures, PHOTO } from './textures.js';

/**
 * Edificio del CUC Calvià (exterior).
 *
 * Ejes: X = fachada (de -12 a +12), Z = fondo (de -15 la trasera a 0 la fachada),
 * Y = altura (0 = cota del pórtico, -0.9 = jardín).
 *
 * La cubierta es un plano inclinado que sube hacia la derecha y hacia el frente,
 * volando 5 m sobre el pórtico: y = 8.99 + 0.075x + 0.055z (cara inferior).
 */

export const ROOF = { base: 8.99, slopeX: 0.075, slopeZ: 0.055, thickness: 0.35 };
export const roofSoffitY = (x, z) => ROOF.base + ROOF.slopeX * x + ROOF.slopeZ * z;

const PLAN = {
  left: -12,
  right: 12,
  back: -15,
  front: 0,
  wallThickness: 0.32,
  glassFrom: -4,
  gap: 0.12 // holgura entre el remate del muro y el intradós de la cubierta
};

const wallTop = (x, z) => roofSoffitY(x, z) - PLAN.gap;

/* ------------------------------------------------------------------ */
/* Materiales                                                          */
/* ------------------------------------------------------------------ */
function makeMaterials(env) {
  const t = buildTextures();

  // El mapa ya lleva el color medido en la foto, así que el material no lo tiñe
  const stucco = new THREE.MeshStandardMaterial({
    map: t.stucco,
    bumpMap: t.stuccoBump,
    bumpScale: 0.04,
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0,
    envMap: env,
    envMapIntensity: 0.3
  });

  const concrete = new THREE.MeshStandardMaterial({
    map: t.concrete,
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0,
    envMap: env,
    envMapIntensity: 0.28
  });

  const stone = new THREE.MeshStandardMaterial({
    map: t.stone,
    color: 0xffffff,
    roughness: 0.95,
    envMap: env,
    envMapIntensity: 0.25
  });

  const column = new THREE.MeshStandardMaterial({
    color: 0xeeece4,
    roughness: 0.52,
    metalness: 0.02,
    envMap: env,
    envMapIntensity: 0.5
  });

  // Tono tomado del muro cortina en la fotografía
  const glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(PHOTO.glass).multiplyScalar(0.32),
    metalness: 0.0,
    roughness: 0.045,
    transparent: true,
    opacity: 0.42,
    envMap: env,
    envMapIntensity: 1.25,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const darkGlass = glass.clone();
  darkGlass.color = new THREE.Color(0x0d1b21);
  darkGlass.opacity = 0.72;

  const mullion = new THREE.MeshStandardMaterial({
    color: 0x2f3538,
    roughness: 0.42,
    metalness: 0.75,
    envMap: env,
    envMapIntensity: 0.8
  });

  const steel = new THREE.MeshStandardMaterial({
    color: 0xa9aeb0,
    roughness: 0.34,
    metalness: 0.9,
    envMap: env,
    envMapIntensity: 1.0
  });

  // Desde la vista aérea la cubierta es de grava clara, entre arena y tostado
  const roofTop = new THREE.MeshStandardMaterial({
    map: t.concrete,
    color: 0xc3b795,
    roughness: 0.95,
    metalness: 0.05,
    envMap: env,
    envMapIntensity: 0.4
  });

  const soffit = new THREE.MeshStandardMaterial({
    color: 0xdcd6c6,
    roughness: 0.88,
    envMap: env,
    envMapIntensity: 0.3
  });

  const edge = new THREE.MeshStandardMaterial({
    color: 0xcfc9ba,
    roughness: 0.7,
    envMap: env,
    envMapIntensity: 0.4
  });

  // Cara interior de los muros: enfoscado pintado, no el revoco de fuera
  const plaster = new THREE.MeshStandardMaterial({
    color: 0xf4f2ec,
    roughness: 0.96,
    metalness: 0
  });

  return { stucco, concrete, stone, column, glass, darkGlass, mullion, steel, roofTop, soffit, edge, plaster };
}

/* ------------------------------------------------------------------ */
/* Utilidades de geometría                                             */
/* ------------------------------------------------------------------ */

/** Muro plano (posiblemente con el remate superior inclinado) y huecos. */
function wall(outline, holes, depth, material) {
  const shape = new THREE.Shape();
  outline.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();

  for (const h of holes) {
    const path = new THREE.Path();
    h.forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
    path.closePath();
    shape.holes.push(path);
  }

  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 });
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const rect = (x, y, w, h) => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h]
];

function box(w, h, d, material, pos, receive = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = receive;
  return mesh;
}

function tube(a, b, radius, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, 8, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Piezas                                                              */
/* ------------------------------------------------------------------ */

/** Plinto / plataforma del pórtico. */
function plinth(m) {
  const g = new THREE.Group();
  const w = 28.4;
  const d = 22.6;
  const slab = box(w, 0.9, d, m.concrete, [0.4, -0.45, -5.6]);
  slab.receiveShadow = true;
  g.add(slab);

  // Zócalo de piedra en los bordes vistos
  const band = 0.92;
  const front = box(w + 0.16, band, 0.16, m.stone, [0.4, -0.46, 5.72]);
  const leftS = box(0.16, band, d + 0.16, m.stone, [0.4 - w / 2 - 0.08, -0.46, -5.6]);
  const rightS = box(0.16, band, d + 0.16, m.stone, [0.4 + w / 2 + 0.08, -0.46, -5.6]);
  g.add(front, leftS, rightS);
  return g;
}

/** Muros: paño ciego de la izquierda, laterales y trasera. */
function shell(m) {
  const g = new THREE.Group();
  const T = PLAN.wallThickness;

  // --- Fachada principal, paño macizo (x de -12 a -4) ---
  const fz = -T / 2;
  const frontOutline = [
    [PLAN.left, 0],
    [PLAN.glassFrom, 0],
    [PLAN.glassFrom, wallTop(PLAN.glassFrom, fz)],
    [PLAN.left, wallTop(PLAN.left, fz)]
  ];
  const holes = [];
  // Ventanas cuadradas de la planta alta
  for (let i = 0; i < 4; i++) holes.push(rect(-10.55 + i * 1.42, 5.05, 0.86, 0.86));
  // Ventanas verticales de la planta baja
  for (let i = 0; i < 3; i++) holes.push(rect(-10.4 + i * 2.05, 0.55, 0.92, 2.5));

  const frontWall = wall(frontOutline, holes, T, m.stucco);
  frontWall.position.z = -T;
  g.add(frontWall);

  const frontLining = wall(frontOutline, holes, 0.03, m.plaster);
  frontLining.position.z = -T - 0.03;
  g.add(frontLining);

  // Vidrios de esos huecos
  for (const h of holes) {
    const x0 = h[0][0];
    const y0 = h[0][1];
    const w = h[1][0] - x0;
    const hh = h[2][1] - y0;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), m.darkGlass);
    pane.position.set(x0 + w / 2, y0 + hh / 2, -T + 0.06);
    g.add(pane);
    const frame = box(w + 0.1, hh + 0.1, 0.08, m.mullion, [x0 + w / 2, y0 + hh / 2, -T + 0.02], false);
    g.add(frame);
  }

  // --- Lateral izquierdo (x = -12) ---
  const leftOutline = [
    [0, 0],
    [15, 0],
    [15, wallTop(PLAN.left + T / 2, PLAN.back)],
    [0, wallTop(PLAN.left + T / 2, PLAN.front)]
  ];
  const leftHoles = [];
  for (let i = 0; i < 3; i++) leftHoles.push(rect(3.4 + i * 3.0, 4.9, 1.5, 1.0));
  const leftWall = wall(leftOutline, leftHoles, T, m.stucco);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(PLAN.left, 0, 0);
  g.add(leftWall);

  const leftLining = wall(leftOutline, leftHoles, 0.03, m.plaster);
  leftLining.rotation.y = Math.PI / 2;
  leftLining.position.set(PLAN.left + T, 0, 0);
  g.add(leftLining);
  for (const h of leftHoles) {
    const z0 = -h[0][0];
    const y0 = h[0][1];
    const w = h[1][0] - h[0][0];
    const hh = h[2][1] - y0;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), m.darkGlass);
    pane.rotation.y = Math.PI / 2;
    pane.position.set(PLAN.left + 0.08, y0 + hh / 2, z0 - w / 2);
    g.add(pane);
  }

  // --- Lateral derecho (x = 12) ---
  const rightOutline = [
    [0, 0],
    [15, 0],
    [15, wallTop(PLAN.right - T / 2, PLAN.front)],
    [0, wallTop(PLAN.right - T / 2, PLAN.back)]
  ];
  const rightHoles = [];
  for (let i = 0; i < 3; i++) rightHoles.push(rect(2.6 + i * 3.2, 1.1, 1.4, 2.2));
  for (let i = 0; i < 3; i++) rightHoles.push(rect(2.6 + i * 3.2, 4.9, 1.4, 1.1));
  const rightWall = wall(rightOutline, rightHoles, T, m.stucco);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(PLAN.right, 0, PLAN.back);
  g.add(rightWall);

  const rightLining = wall(rightOutline, rightHoles, 0.03, m.plaster);
  rightLining.rotation.y = -Math.PI / 2;
  rightLining.position.set(PLAN.right - T, 0, PLAN.back);
  g.add(rightLining);
  for (const h of rightHoles) {
    const z0 = PLAN.back + h[0][0];
    const y0 = h[0][1];
    const w = h[1][0] - h[0][0];
    const hh = h[2][1] - y0;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), m.darkGlass);
    pane.rotation.y = -Math.PI / 2;
    pane.position.set(PLAN.right - 0.08, y0 + hh / 2, z0 + w / 2);
    g.add(pane);
  }

  // --- Trasera (z = -15) ---
  const backOutline = [
    [PLAN.left, 0],
    [PLAN.right, 0],
    [PLAN.right, wallTop(PLAN.right, PLAN.back + T / 2)],
    [PLAN.left, wallTop(PLAN.left, PLAN.back + T / 2)]
  ];
  const backHoles = [];
  for (let i = 0; i < 5; i++) backHoles.push(rect(-8.6 + i * 3.6, 4.9, 1.6, 1.1));
  backHoles.push(rect(-1.4, 0.2, 2.8, 2.4));
  const backWall = wall(backOutline, backHoles, T, m.stucco);
  backWall.position.set(0, 0, PLAN.back);
  g.add(backWall);

  const backLining = wall(backOutline, backHoles, 0.03, m.plaster);
  backLining.position.set(0, 0, PLAN.back + T);
  g.add(backLining);

  return g;
}

/** Muro cortina de la fachada principal + carpintería. */
function curtainWall(m) {
  const g = new THREE.Group();
  const x0 = PLAN.glassFrom;
  const x1 = PLAN.right;
  const door = { x: 4, w: 3.4, h: 2.7 };

  const outline = [
    [x0, 0],
    [x1, 0],
    [x1, wallTop(x1, 0)],
    [x0, wallTop(x0, 0)]
  ];
  const holes = [rect(door.x - door.w / 2, 0, door.w, door.h)];
  const pane = wall(outline, holes, 0.06, m.glass);
  pane.castShadow = false;
  pane.position.z = -0.06;
  g.add(pane);

  // Montantes verticales cada 2 m
  for (let x = x0; x <= x1 + 0.01; x += 2) {
    const top = wallTop(x, 0);
    g.add(box(0.13, top, 0.22, m.mullion, [x, top / 2, 0.02], false));
  }
  // Travesaños horizontales (siguen la inclinación del remate)
  for (const y of [2.75, 4.35, 6.2]) {
    const bar = box(x1 - x0, 0.11, 0.2, m.mullion, [(x0 + x1) / 2, y, 0.02], false);
    g.add(bar);
  }
  // Remate superior inclinado
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.16, 0.24), m.mullion);
  topBar.position.set((x0 + x1) / 2, (wallTop(x0, 0) + wallTop(x1, 0)) / 2, 0.02);
  topBar.rotation.z = Math.atan(ROOF.slopeX);
  g.add(topBar);

  // Puerta de acceso: dos hojas de vidrio con marco
  const leaf = new THREE.Mesh(new THREE.PlaneGeometry(door.w / 2 - 0.06, door.h - 0.1), m.glass);
  const l1 = leaf.clone();
  l1.position.set(door.x - door.w / 4, (door.h - 0.1) / 2, -0.03);
  const l2 = leaf.clone();
  l2.position.set(door.x + door.w / 4, (door.h - 0.1) / 2, -0.03);
  g.add(l1, l2);
  g.add(box(0.09, door.h, 0.2, m.mullion, [door.x, door.h / 2, 0.02], false));
  g.add(box(door.w + 0.2, 0.16, 0.24, m.mullion, [door.x, door.h + 0.02, 0.02], false));
  g.add(box(0.12, door.h, 0.2, m.mullion, [door.x - door.w / 2, door.h / 2, 0.02], false));
  g.add(box(0.12, door.h, 0.2, m.mullion, [door.x + door.w / 2, door.h / 2, 0.02], false));

  // Rótulo del centro sobre la puerta
  g.add(signage(door.x, 3.55));
  return g;
}

/** Rótulo "CUC · Centre Universitari de Calvià" serigrafiado en el vidrio. */
function signage(cx, cy) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 150px Helvetica, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('CUC', 60, 118);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '46px Helvetica, Arial, sans-serif';
  ctx.fillText('Centre Universitari de Calvià', 350, 100);
  ctx.fillRect(350, 140, 520, 3);
  ctx.font = '34px Helvetica, Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('cuc@calvia.com  ·  971 40 20 68', 350, 176);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.15), mat);
  mesh.position.set(cx, cy, 0.09);
  mesh.renderOrder = 3;
  return mesh;
}

/** Cubierta inclinada con gran vuelo. */
function roof(m) {
  const g = new THREE.Group();
  const xMin = -13.7;
  const xMax = 13.7;
  const zMin = -16.3;
  const zMax = 5.0;
  const w = xMax - xMin;
  const d = zMax - zMin;
  const cx = (xMin + xMax) / 2;
  const cz = (zMin + zMax) / 2;

  const geo = new THREE.BoxGeometry(w, ROOF.thickness, d, 1, 1, 1);
  geo.translate(0, ROOF.thickness / 2, 0); // la cara inferior queda en y = 0 local
  const shear = new THREE.Matrix4().set(
    1, 0, 0, 0,
    ROOF.slopeX, 1, ROOF.slopeZ, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  );
  geo.applyMatrix4(shear);
  geo.computeVertexNormals();

  const slab = new THREE.Mesh(geo, [m.edge, m.edge, m.roofTop, m.soffit, m.edge, m.edge]);
  slab.position.set(cx, roofSoffitY(cx, cz), cz);
  slab.castShadow = true;
  slab.receiveShadow = true;
  g.add(slab);

  // Canalón/goterón en el borde volado
  const drip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.12), m.edge);
  drip.position.set(cx, roofSoffitY(cx, zMax) - 0.05, zMax - 0.06);
  drip.rotation.z = Math.atan(ROOF.slopeX);
  drip.castShadow = true;
  g.add(drip);

  g.add(truss(m, xMin + 0.6, xMax - 0.6));
  return g;
}

/** Celosía metálica triangular sobre el borde alto de la cubierta. */
function truss(m, xFrom, xTo) {
  const g = new THREE.Group();
  const zA = 3.05;
  const zB = 3.95;
  const zTop = 3.5;
  const H = 1.15;
  const r = 0.045;
  const top = (x, z) => roofSoffitY(x, z) + ROOF.thickness;

  const P = (x, z, dy = 0) => new THREE.Vector3(x, top(x, z) + dy, z);

  // Cordones longitudinales
  g.add(tube(P(xFrom, zA, 0.12), P(xTo, zA, 0.12), r, m.steel));
  g.add(tube(P(xFrom, zB, 0.12), P(xTo, zB, 0.12), r, m.steel));
  g.add(tube(P(xFrom, zTop, H), P(xTo, zTop, H), r * 1.15, m.steel));

  const step = 1.5;
  for (let x = xFrom; x <= xTo + 0.01; x += step) {
    const xa = Math.min(x, xTo);
    const xb = Math.min(x + step, xTo);
    // Marco transversal
    g.add(tube(P(xa, zA, 0.12), P(xa, zTop, H), r * 0.8, m.steel));
    g.add(tube(P(xa, zB, 0.12), P(xa, zTop, H), r * 0.8, m.steel));
    g.add(tube(P(xa, zA, 0.12), P(xa, zB, 0.12), r * 0.7, m.steel));
    // Diagonales
    if (xb > xa) {
      g.add(tube(P(xa, zA, 0.12), P(xb, zTop, H), r * 0.6, m.steel));
      g.add(tube(P(xa, zB, 0.12), P(xb, zTop, H), r * 0.6, m.steel));
    }
    // Montante corto hasta la cubierta
    g.add(tube(P(xa, zA, 0), P(xa, zA, 0.12), r * 0.9, m.steel));
    g.add(tube(P(xa, zB, 0), P(xa, zB, 0.12), r * 0.9, m.steel));
  }
  return g;
}

/** Pórtico: columnas cilíndricas blancas. */
function columns(m) {
  const g = new THREE.Group();
  const z = 3.1;
  const xs = [-3.5, -0.5, 2.5, 5.5, 8.5, 11.5];
  for (const x of xs) {
    const h = roofSoffitY(x, z);
    const geo = new THREE.CylinderGeometry(0.29, 0.32, h, 20, 1);
    const col = new THREE.Mesh(geo, m.column);
    col.position.set(x, h / 2, z);
    col.castShadow = true;
    col.receiveShadow = true;
    g.add(col);
    // Basa
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.16, 20), m.concrete);
    base.position.set(x, 0.08, z);
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);
  }
  return g;
}

/** Escalinata de acceso, rampa lateral y barandillas. */
function approach(m) {
  const g = new THREE.Group();
  const steps = 4;
  const rise = 0.9 / steps;
  const run = 0.42;
  const width = 9.2;
  const cx = 4;

  for (let i = 0; i < steps; i++) {
    const y = -0.9 + rise * (i + 0.5);
    const z = 5.72 + run * (steps - i - 0.5);
    const s = box(width, rise, run, m.concrete, [cx, y, z]);
    g.add(s);
  }
  // Rellano de aproximación
  g.add(box(width + 2.4, 0.14, 3.4, m.concrete, [cx, -0.96, 5.72 + steps * run + 1.7]));

  // Muretes laterales de la escalinata
  for (const sx of [-1, 1]) {
    g.add(
      box(0.42, 1.15, steps * run + 0.5, m.stone, [
        cx + sx * (width / 2 + 0.21),
        -0.55,
        5.72 + (steps * run) / 2
      ])
    );
  }

  // Rampa accesible a la derecha, con barandilla metálica
  const rampLen = 7.5;
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, rampLen), m.concrete);
  ramp.position.set(14.6, -0.45, 3.2);
  ramp.rotation.x = Math.atan(0.9 / rampLen);
  ramp.receiveShadow = true;
  ramp.castShadow = true;
  g.add(ramp);

  const rail = new THREE.MeshStandardMaterial({ color: 0x9aa0a3, metalness: 0.85, roughness: 0.35 });
  for (const sx of [-1, 1]) {
    const x = 14.6 + sx * 0.95;
    const a = new THREE.Vector3(x, 0.95, 3.2 - rampLen / 2);
    const b = new THREE.Vector3(x, 0.05, 3.2 + rampLen / 2);
    g.add(tube(a, b, 0.035, rail));
    for (let t = 0; t <= 1.001; t += 0.2) {
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      g.add(tube(p.clone().setY(p.y - 1.0), p, 0.028, rail));
    }
  }

  // Peldaños laterales junto a la rampa (como en la foto)
  for (let i = 0; i < 5; i++) {
    g.add(box(2.6, 0.19, 0.34, m.stone, [17.6, -0.86 + i * 0.19, 1.2 + i * 0.34]));
  }
  return g;
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */
export function createBuilding(env) {
  const m = makeMaterials(env);
  const group = new THREE.Group();
  group.name = 'edificio';
  group.add(plinth(m), shell(m), curtainWall(m), roof(m), columns(m), approach(m));
  return { group, materials: m, plan: PLAN };
}
