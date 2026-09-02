import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
  back: -22.4,
  front: 0,
  wallThickness: 0.32,
  glassFrom: -2.2,
  gap: 0.12 // holgura entre el remate del muro y el intradós de la cubierta
};

/**
 * Perímetro de la planta, tomado del croquis del catastro: un rectángulo de
 * unos 23 × 22 m con la esquina noreste recortada en dos escalones. El
 * recuadro que queda entre los dos escalones es el que el catastro marca con
 * III plantas — la caja del ascensor y la escalera.
 *
 * Se recorre en sentido antihorario visto desde arriba, empezando por la
 * esquina suroeste; el primer tramo es la fachada principal, que se construye
 * aparte (paño de revoco + muro cortina).
 */
const OUTLINE = [
  [PLAN.left, 0],       // suroeste
  [PLAN.right, 0],      // sureste
  [PLAN.right, -12.4],
  [4.6, -12.4],
  [4.6, -17.7],
  [-1.6, -17.7],
  [-1.6, PLAN.back],
  [PLAN.left, PLAN.back] // noroeste
];

/** Hueco de ascensor y escalera: el bloque de tres plantas del catastro. */
export const CORE = { x0: -1.6, x1: 4.6, z0: -17.7, z1: -12.4 };

const wallTop = (x, z) => roofSoffitY(x, z) - PLAN.gap;

/* ------------------------------------------------------------------ */
/* Materiales                                                          */
/* ------------------------------------------------------------------ */
function makeMaterials() {
  const t = buildTextures();

  // El mapa ya lleva el color medido en la foto, así que el material no lo tiñe
  const stucco = new THREE.MeshStandardMaterial({
    map: t.stucco,
    bumpMap: t.stuccoBump,
    bumpScale: 0.04,
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.3
  });

  const concrete = new THREE.MeshStandardMaterial({
    map: t.concrete,
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.28
  });

  // Losa de piedra de la explanada de acceso
  const plaza = new THREE.MeshStandardMaterial({
    map: t.plaza,
    color: 0xffffff,
    roughness: 0.86,
    envMapIntensity: 0.3
  });

  const stone = new THREE.MeshStandardMaterial({
    map: t.stone,
    color: 0xffffff,
    roughness: 0.95,
    envMapIntensity: 0.25
  });

  const column = new THREE.MeshStandardMaterial({
    color: 0xeeece4,
    roughness: 0.52,
    metalness: 0.02,
    envMapIntensity: 0.5
  });

  // Tono tomado del muro cortina en la fotografía
  const glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(PHOTO.glass).multiplyScalar(0.32),
    metalness: 0.0,
    roughness: 0.045,
    transparent: true,
    opacity: 0.42,
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
    envMapIntensity: 0.8
  });

  const steel = new THREE.MeshStandardMaterial({
    color: 0xa9aeb0,
    roughness: 0.34,
    metalness: 0.9,
    envMapIntensity: 1.0
  });

  // Desde la vista aérea la cubierta es de grava clara, entre arena y tostado
  const roofTop = new THREE.MeshStandardMaterial({
    map: t.concrete,
    color: 0xc3b795,
    roughness: 0.95,
    metalness: 0.05,
    envMapIntensity: 0.4
  });

  const soffit = new THREE.MeshStandardMaterial({
    color: 0xdcd6c6,
    roughness: 0.88,
    envMapIntensity: 0.3
  });

  const edge = new THREE.MeshStandardMaterial({
    color: 0xcfc9ba,
    roughness: 0.7,
    envMapIntensity: 0.4
  });

  // Cara interior de los muros: enfoscado pintado, no el revoco de fuera
  const plaster = new THREE.MeshStandardMaterial({
    color: 0xf4f2ec,
    roughness: 0.96,
    metalness: 0
  });

  return { stucco, concrete, plaza, stone, column, glass, darkGlass, mullion, steel, roofTop, soffit, edge, plaster };
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
  const d = 30.0;
  const slab = box(w, 0.9, d, m.plaza, [0.4, -0.45, -9.5]);
  slab.receiveShadow = true;
  g.add(slab);

  // Zócalo de piedra en los bordes vistos
  const band = 0.92;
  const front = box(w + 0.16, band, 0.16, m.stone, [0.4, -0.46, 5.72]);
  const leftS = box(0.16, band, d + 0.16, m.stone, [0.4 - w / 2 - 0.08, -0.46, -9.5]);
  const rightS = box(0.16, band, d + 0.16, m.stone, [0.4 + w / 2 + 0.08, -0.46, -9.5]);
  g.add(front, leftS, rightS);
  return g;
}

/** Muros: paño ciego de la izquierda, laterales y trasera. */
/**
 * Muro entre dos puntos de la planta. El remate superior sigue el plano de
 * cubierta, así que cada tramo se corta a su altura.
 */
function perimeterWall(m, a, b, holes = []) {
  const T = PLAN.wallThickness;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);

  // El interior queda a la izquierda del recorrido, así que la extrusión sale
  // hacia fuera y el muro se desplaza para ocupar el lado de dentro.
  const outward = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
  const at = (t) => [a[0] + dx * t, a[1] + dz * t];

  const outline = [
    [0, 0],
    [len, 0],
    [len, wallTop(...at(1))],
    [0, wallTop(...at(0))]
  ];

  const group = new THREE.Group();
  for (const [depth, material, offset] of [[T, m.stucco, T], [0.03, m.plaster, T + 0.03]]) {
    const mesh = wall(outline, holes, depth, material);
    mesh.rotation.y = -angle;
    mesh.position.set(a[0] - outward.x * offset, 0, a[1] - outward.z * offset);
    group.add(mesh);
  }

  // Vidrios de los huecos
  for (const h of holes) {
    const t0 = h[0][0] / len;
    const t1 = h[1][0] / len;
    const y0 = h[0][1];
    const hh = h[2][1] - y0;
    const p0 = at(t0);
    const p1 = at(t1);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(h[1][0] - h[0][0], hh), m.darkGlass);
    pane.rotation.y = -angle;
    pane.position.set(
      (p0[0] + p1[0]) / 2 - outward.x * (T - 0.08),
      y0 + hh / 2,
      (p0[1] + p1[1]) / 2 - outward.z * (T - 0.08)
    );
    group.add(pane);
  }
  return group;
}

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
  // Ventanas cuadradas de la planta alta, repartidas por todo el paño
  for (let i = 0; i < 5; i++) holes.push(rect(-10.6 + i * 1.7, 5.05, 0.86, 0.86));
  // Ventanas verticales de la planta baja
  for (let i = 0; i < 4; i++) holes.push(rect(-10.4 + i * 2.05, 0.55, 0.92, 2.5));

  const frontWall = wall(frontOutline, holes, T, m.stucco);
  frontWall.position.z = -T;
  g.add(frontWall);

  const frontLining = wall(frontOutline, holes, 0.03, m.plaster);
  frontLining.position.z = -T - 0.03;
  g.add(frontLining);

  // Persianas enrollables de las ventanas verticales, medio bajadas
  const blindMat = new THREE.MeshStandardMaterial({ color: 0x8d8f8c, roughness: 0.75, metalness: 0.15 });
  for (let i = 0; i < 4; i++) {
    const x = -10.4 + i * 2.05;
    const drop = 1.5 + (i % 2) * 0.35;
    const blind = box(0.92, drop, 0.05, blindMat, [x + 0.46, 0.55 + 2.5 - drop / 2, -T + 0.1], false);
    g.add(blind);
    // Lamas
    const slats = [];
    for (let y = 0; y < drop - 0.06; y += 0.09) {
      slats.push(new THREE.BoxGeometry(0.92, 0.012, 0.02).translate(x + 0.46, 0.55 + 2.5 - drop + y + 0.05, -T + 0.13));
    }
    const slatMesh = new THREE.Mesh(mergeGeometries(slats), new THREE.MeshStandardMaterial({ color: 0x6f7270, roughness: 0.8 }));
    g.add(slatMesh);
    // Cajón de persiana
    g.add(box(1.06, 0.24, 0.12, m.stucco, [x + 0.46, 0.55 + 2.5 + 0.12, -T + 0.08], false));
  }

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

  // --- Resto del perímetro, siguiendo el croquis del catastro ---
  // Ventanas cuadradas de las salas, repartidas por tramo
  const windowRuns = {
    1: [], // sureste: da al vacío de la biblioteca, sin huecos altos
    2: [1.5, 4.2],
    3: [],
    4: [1.6, 3.4],
    5: [1.2, 2.9],
    6: [2.0, 4.6, 7.2, 9.8], // trasera de la oficina y la sala 3
    7: [2.2, 5.0, 7.8, 10.6, 13.4, 16.2] // flanco oeste: salas 1, 2 y 3
  };

  for (let i = 1; i < OUTLINE.length; i++) {
    const a = OUTLINE[i];
    const b = OUTLINE[(i + 1) % OUTLINE.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const holes = [];
    for (const at of windowRuns[i] ?? []) {
      if (at + 1.5 > len) continue;
      holes.push(rect(at, 5.05, 1.4, 1.0)); // planta alta
      if (i === 7 || i === 6) holes.push(rect(at, 1.2, 1.4, 2.0)); // planta baja
    }
    g.add(perimeterWall(m, a, b, holes));
  }

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

  // Focos empotrados en el intradós del pórtico
  const spotBody = new THREE.MeshStandardMaterial({ color: 0x6b6559, metalness: 0.6, roughness: 0.4 });
  const spotLens = new THREE.MeshStandardMaterial({
    color: 0xffe6b8, emissive: 0xffca7a, emissiveIntensity: 0.9, roughness: 0.35
  });
  for (const sx of [-3.6, -1.2, 1.2, 3.6]) {
    const x = door.x + sx;
    const y = roofSoffitY(x, 1.4) - 0.18;
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.3, 12), spotBody);
    can.position.set(x, y, 1.4);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), spotLens);
    lens.position.set(x, y - 0.16, 1.4);
    g.add(can, lens);
  }

  // Rótulos serigrafiados en el vidrio
  g.add(signage(door.x + 3.4, 3.55));
  g.add(glassLabel('BIBLIOTECA', door.x - 4.4, 3.55, 3.4));
  return g;
}

/** Rótulo suelto serigrafiado en el vidrio (BIBLIOTECA, IMEB…). */
function glassLabel(text, cx, cy, width) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 104px Archivo, Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '6px';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width * 0.1875),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false })
  );
  mesh.position.set(cx, cy, 0.09);
  mesh.renderOrder = 3;
  return mesh;
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

/**
 * Cubierta inclinada con gran vuelo. Sigue el mismo perímetro escalonado de la
 * planta, retranqueado hacia fuera, y vuela cinco metros sobre el pórtico.
 */
function roof(m) {
  const g = new THREE.Group();
  const OVER = 1.6; // vuelo lateral y trasero
  const FRONT = 5.0; // vuelo sobre el pórtico
  const poly = [
    [PLAN.left - OVER, FRONT],
    [PLAN.right + OVER, FRONT],
    [PLAN.right + OVER, -12.4 - OVER],
    [4.6 + OVER, -12.4 - OVER],
    [4.6 + OVER, -17.7 - OVER],
    [-1.6 - OVER, -17.7 - OVER],
    [-1.6 - OVER, PLAN.back - OVER],
    [PLAN.left - OVER, PLAN.back - OVER]
  ];

  // La forma se dibuja en XY con la y local hacia el norte, se extruye el
  // canto y se tumba; después se cizalla para darle la pendiente.
  const shape = new THREE.Shape();
  poly.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: ROOF.thickness, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.applyMatrix4(
    new THREE.Matrix4().set(
      1, 0, 0, 0,
      ROOF.slopeX, 1, ROOF.slopeZ, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    )
  );
  geo.translate(0, ROOF.base, 0);
  geo.computeVertexNormals();

  const slab = new THREE.Mesh(geo, [m.soffit, m.edge]);
  slab.castShadow = true;
  slab.receiveShadow = true;
  g.add(slab);

  // Goterón del borde volado
  const drip = new THREE.Mesh(new THREE.BoxGeometry(PLAN.right - PLAN.left + OVER * 2, 0.1, 0.12), m.edge);
  drip.position.set(0, roofSoffitY(0, FRONT) - 0.05, FRONT - 0.06);
  drip.rotation.z = Math.atan(ROOF.slopeX);
  drip.castShadow = true;
  g.add(drip);

  g.add(roofRail(m, PLAN.left - OVER + 0.8, PLAN.right + OVER - 0.8));
  return g;
}

/**
 * Barandilla de seguridad de la cubierta.
 *
 * En las fotografías no hay ninguna celosía: sobre el borde alto corre una
 * barandilla metálica sencilla —montantes y dos largueros— con la fila de
 * lucernarios blancos justo detrás.
 */
function roofRail(m, xFrom, xTo) {
  const g = new THREE.Group();
  const z = 3.3;
  const r = 0.03;
  const top = (x) => roofSoffitY(x, z) + ROOF.thickness;
  const P = (x, dy) => new THREE.Vector3(x, top(x) + dy, z);

  // Largueros
  for (const dy of [0.52, 1.0]) g.add(tube(P(xFrom, dy), P(xTo, dy), r, m.steel));

  // Montantes
  const step = 1.6;
  for (let x = xFrom; x <= xTo + 0.01; x += step) {
    const xa = Math.min(x, xTo);
    g.add(tube(P(xa, 0), P(xa, 1.04), r * 1.1, m.steel));
  }

  // Lucernarios: cajas blancas alineadas detrás de la barandilla
  const lights = [];
  for (let x = xFrom + 1; x <= xTo - 1; x += 2.2) {
    const y = roofSoffitY(x, z + 0.9) + ROOF.thickness;
    lights.push(new THREE.BoxGeometry(0.9, 0.26, 0.5).translate(x, y + 0.13, z + 0.9));
  }
  const skylights = new THREE.Mesh(mergeGeometries(lights), m.soffit);
  skylights.castShadow = true;
  skylights.receiveShadow = true;
  g.add(skylights);

  return g;
}

/**
 * Torre del ascensor y el almacén: la tercera planta, que asoma por encima de
 * la cubierta. Desde el aparcamiento —que está a la cota del techo— se lee como
 * un volumen suelto con el rótulo CUC; desde la carretera de atrás, como el
 * cuerpo que sobresale del edificio.
 */
function roofTower(m) {
  const g = new THREE.Group();
  const w = CORE.x1 - CORE.x0 - 0.6;
  const d = CORE.z1 - CORE.z0 - 0.6;
  const x = (CORE.x0 + CORE.x1) / 2;
  const z = (CORE.z0 + CORE.z1) / 2;
  const h = 4.0;
  const base = roofSoffitY(x, z) + ROOF.thickness;

  g.add(box(w, h, d, m.stucco, [x, base + h / 2, z]));
  // Coronación con un pequeño vuelo
  g.add(box(w + 0.3, 0.24, d + 0.3, m.edge, [x, base + h + 0.12, z]));

  // Ventana cuadrada del hueco de escalera
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.66), m.darkGlass);
  win.position.set(x - w / 2 - 0.01, base + 2.3, z + 0.4);
  win.rotation.y = -Math.PI / 2;
  g.add(win);
  g.add(box(0.08, 0.78, 0.78, m.mullion, [x - w / 2 + 0.02, base + 2.3, z + 0.4], false));

  // Rejilla de ventilación del cuarto de máquinas
  g.add(box(0.06, 0.42, 0.62, m.mullion, [x - w / 2 - 0.02, base + 1.05, z - 0.5], false));

  // Proyector y antena, como en la foto desde la carretera de atrás
  const metal = new THREE.MeshStandardMaterial({ color: 0x74777a, metalness: 0.6, roughness: 0.45 });
  const flood = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.16), metal);
  flood.position.set(x - w / 2 - 0.12, base + 3.1, z + 1.2);
  flood.rotation.z = 0.3;
  g.add(flood);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 6), metal);
  mast.position.set(x + 1.5, base + h + 1.7, z - 1.2);
  g.add(mast);
  const aerial = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), metal);
  aerial.position.set(x + 1.5, base + h + 3.0, z - 1.2);
  g.add(aerial);

  // Rótulo CUC en la cara norte, la que mira al aparcamiento
  const letters = [];
  let lx = x - 1.0;
  for (const ch of ['C', 'U', 'C']) {
    letters.push(new THREE.BoxGeometry(0.6, 0.7, 0.06).translate(lx, base + 2.5, z - d / 2 - 0.03));
    if (ch === 'U') letters.push(new THREE.BoxGeometry(0.38, 0.2, 0.07).translate(lx, base + 2.78, z - d / 2 - 0.04));
    lx += 0.84;
  }
  const cuc = new THREE.Mesh(mergeGeometries(letters), new THREE.MeshStandardMaterial({
    color: 0xf1efe8, roughness: 0.8
  }));
  g.add(cuc);

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}


/**
 * Pórtico. Las columnas son gruesas y ligeramente troncocónicas —más anchas
 * abajo—, tal como se ven en el vídeo del acceso.
 */
function columns(m) {
  const g = new THREE.Group();
  const z = 3.1;
  const xs = [-1.2, 2.0, 5.2, 8.4, 11.6];
  for (const x of xs) {
    const h = roofSoffitY(x, z);
    const geo = new THREE.CylinderGeometry(0.31, 0.4, h, 24, 1);
    const col = new THREE.Mesh(geo, m.column);
    col.position.set(x, h / 2, z);
    col.castShadow = true;
    col.receiveShadow = true;
    g.add(col);
    // Basa
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.14, 24), m.concrete);
    base.position.set(x, 0.07, z);
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);
  }
  return g;
}

/** Escalinata de acceso, rampa lateral y barandillas. */
function approach(m) {
  const g = new THREE.Group();
  const steps = 5;
  const rise = 0.9 / steps;
  const run = 0.46;
  const width = 14.5; // ocupa casi todo el frente acristalado
  const cx = 4.2;

  for (let i = 0; i < steps; i++) {
    const y = -0.9 + rise * (i + 0.5);
    const z = 5.72 + run * (steps - i - 0.5);
    const s = box(width, rise, run, m.concrete, [cx, y, z]);
    g.add(s);
  }
  // Explanada de losa de piedra delante de la escalinata
  g.add(box(width + 6, 0.14, 12, m.plaza, [cx, -0.96, 5.72 + steps * run + 6]));

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

  // Pérgola metálica del área de estar, a la derecha del acceso
  const pergola = new THREE.Group();
  const post = new THREE.MeshStandardMaterial({ color: 0x8b8f92, metalness: 0.7, roughness: 0.45 });
  for (const px of [-2.4, 2.4]) {
    for (const pz of [-1.8, 1.8]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 10), post);
      leg.position.set(19.5 + px, -0.9 + 1.3, 10 + pz);
      leg.castShadow = true;
      pergola.add(leg);
    }
  }
  for (let i = -2.4; i <= 2.4; i += 0.42) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 4.1), post);
    slat.position.set(19.5 + i, 0.46, 10);
    slat.castShadow = true;
    pergola.add(slat);
  }
  for (const pz of [-1.8, 1.8]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.14, 0.12), post);
    beam.position.set(19.5, 0.36, 10 + pz);
    pergola.add(beam);
  }
  g.add(pergola);

  // Papeleras cilíndricas junto a la entrada
  for (const [bx, bz] of [[-3.2, 8.4], [12.4, 8.4]]) {
    const bin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.24, 0.85, 14),
      new THREE.MeshStandardMaterial({ color: 0x2c2f31, roughness: 0.5, metalness: 0.3 })
    );
    bin.position.set(bx, -0.45, bz);
    bin.castShadow = true;
    g.add(bin);
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
export function createBuilding() {
  const m = makeMaterials();
  const group = new THREE.Group();
  group.name = 'edificio';
  group.add(plinth(m), shell(m), curtainWall(m), roof(m), roofTower(m), columns(m), approach(m));
  return { group, materials: m, plan: PLAN };
}
