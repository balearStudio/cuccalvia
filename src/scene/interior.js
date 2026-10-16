import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildTextures } from './textures.js';
import { roofSoffitY, ROOF, TOWER, STAIR_WINDOWS } from './building.js';
import {
  doorStrip, wallLettering, chalkboard, noticeboard, ROOM_COLORS,
  wallLines, followUs, logoPanel, banner, mural, blockLetterCells, europeBoard, becaLetters, cubeFace
} from './signage.js';

/**
 * Interior del CUC.
 *
 * Planta baja: vestíbulo a doble altura, mostrador y la sala de lectura de la
 * biblioteca — estanterías azules sobre carcasa de haya, lámparas colgantes de
 * campana sobre cable largo, el rótulo BIBLIOTECA en la pared y las columnas
 * redondas contra el muro cortina.
 *
 * Planta primera, según el croquis y las fotos: el rellano de la escalera con
 * el sofá rojo bajo el rótulo BECA, el pasillo que lleva a la sala 2 y, girando,
 * la pizarra del centro, la sala 3 y la oficina al fondo. Cada puerta lleva su
 * tira de señalética de color con los poliedros de la marca.
 *
 * Cambiar ROOMS es cambiar dónde va cada sala.
 */

const L = -12 + 0.32; // cara interior del muro oeste
const R = 12 - 0.32;
const BACK = -22.4 + 0.32;
const FRONT = -0.06;
const SLAB_Y = 4.2; // cara superior del forjado
const SLAB_T = 0.34;
const CEIL_Y = SLAB_Y + 2.72;
const DOOR_W = 0.95;
const DOOR_H = 2.1;

/**
 * El vacío: en el croquis de la planta primera toda la mitad este aparece como
 * «abierto», o sea la doble altura sobre la sala de lectura. El forjado ocupa
 * la banda oeste y el entorno del núcleo de comunicaciones.
 */
const VOID = { x0: -2.2, x1: R, z0: -12.4, z1: FRONT };

/** Núcleo de ascensor y escalera: el bloque de tres plantas del catastro. */
const CORE = { x0: -1.6, x1: 4.6, z0: -17.7, z1: -12.4 };

/**
 * El rellano de la planta primera vuela un metro sobre la biblioteca, delante
 * del ascensor: es la barandilla de las letras #CUCALVIÀ.
 */
const EDGE_Z = -11.4;

/** Ojo de la escalera: el forjado se abre sobre los tramos. */
const WELL = { x0: CORE.x0, x1: TOWER.x0, z0: CORE.z0 + 0.35, z1: CORE.z1 - 0.3 };

/**
 * Reparto de la planta primera, calcado del croquis: las salas se agrupan al
 * oeste y al norte, alrededor del vacío. `door` dice en qué paramento está la
 * puerta y a qué distancia del extremo, que es donde va la tira de señalética.
 */
const ROOMS = [
  {
    id: 'sala1',
    x0: -7.3, x1: -2.4, z0: -12.0, z1: FRONT,
    // Se entra desde el rellano; la tira va en la hoja, a la derecha
    door: { side: 'north', at: -3.2, strip: 'leaf', stripSide: -1 },
    glass: ['east'], // da al vacío: se ve desde la biblioteca
    windows: [{ side: 'north', at: -4.75, w: 1.3, y0: 0.95, y1: 2.0 }], // la de corredera bajo BECA
    mural: 'west',
    stripe: '#efc52f', stripeY: 1.55,
    screen: true,
    title: "sala §\nd'estudi", number: '1', color: ROOM_COLORS.dispositius, icon: 'informatica',
    kind: 'block'
  },
  {
    id: 'sala2',
    x0: L, x1: -7.3, z0: -13.1, z1: FRONT,
    // Al fondo del rellano, frente al sofá
    door: { side: 'east', at: -12.55, strip: 'leaf' },
    title: "sala §\nd'estudi", number: '2', color: ROOM_COLORS.estudi, icon: 'estudi',
    kind: 'study', carrels: true,
    dado: '#8d8b6e'
  },
  {
    id: 'sala3',
    x0: L, x1: -8.4, z0: BACK, z1: -13.1,
    door: { side: 'east', at: -17.25 },
    title: "sala §\nd'estudi", number: '3', color: ROOM_COLORS.informatica, icon: 'informatica',
    kind: 'tables'
  },
  {
    id: 'oficina',
    x0: -8.4, x1: -1.7, z0: BACK, z1: -18.0,
    // Al fondo del pasillo de la pizarra
    door: { side: 'south', at: -7.4 },
    title: 'oficina', color: ROOM_COLORS.oficina, icon: 'oficina',
    kind: 'office'
  },
  {
    id: 'grupal',
    x0: -6.4, x1: -1.7, z0: -17.8, z1: -15.2,
    door: { side: 'south', at: -4.6, strip: 'leaf', stripSide: -1 },
    // Ventana de corredera de marco blanco junto a la puerta
    windows: [{ side: 'south', at: -2.85, w: 1.5, y0: 0.95, y1: 2.15 }],
    title: 'treball\nen grup', color: ROOM_COLORS.grup, icon: 'grup',
    kind: 'group'
  }
];

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function mesh(geos, material, shadows = true) {
  if (!geos.length) return new THREE.Group();
  const m = new THREE.Mesh(mergeGeometries(geos), material);
  m.castShadow = shadows;
  m.receiveShadow = true;
  return m;
}

function place(geos, x, z, rot, y = 0) {
  const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z);
  geos.forEach((g) => g.applyMatrix4(m));
  return geos;
}

/** Copia una textura con la repetición propia de un plano de w × d metros. */
function tiled(texture, w, d, tile) {
  const t = texture.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(w / tile, d / tile);
  t.needsUpdate = true;
  return t;
}

function panel(texture, w, h, x, y, z, rotY = 0, opts = {}) {
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
    transparent: opts.transparent ?? false,
    ...opts.material
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  return m;
}

/* ------------------------------------------------------------------ */
/* Mobiliario                                                          */
/* ------------------------------------------------------------------ */

/** Mesa de laminado con patas tubulares. */
function deskGeometries(x, z, w, d, rot = 0, h = 0.735) {
  const top = [box(w, 0.032, d, 0, h, 0)];
  const legs = [];
  for (const sx of [-1, 1]) {
    const px = sx * (w / 2 - 0.28);
    legs.push(box(0.045, h - 0.05, 0.045, px, (h - 0.05) / 2, -d / 2 + 0.12));
    legs.push(box(0.045, h - 0.05, 0.045, px, (h - 0.05) / 2, d / 2 - 0.12));
    legs.push(box(0.05, 0.05, d - 0.2, px, h - 0.06, 0));
  }
  place(top, x, z, rot);
  place(legs, x, z, rot);
  return { top, legs };
}

/** Puesto individual con faldón, como los de las salas de estudio. */
function carrelGeometries(x, z, rot) {
  const { top, legs } = deskGeometries(0, 0, 1.25, 0.72, 0);
  const panelGeo = [box(1.25, 0.48, 0.035, 0, 0.97, -0.34)];
  place(top, x, z, rot);
  place(legs, x, z, rot);
  place(panelGeo, x, z, rot);
  return { top: [...top, ...panelGeo], legs };
}

/** Silla de confidente: asiento azul, respaldo negro, estructura tubular. */
function chairGeometries(x, z, rot) {
  const seat = [box(0.45, 0.06, 0.44, 0, 0.45, 0)];
  const back = [box(0.45, 0.42, 0.055, 0, 0.74, -0.19)];
  const frame = [];
  for (const sx of [-1, 1]) {
    frame.push(box(0.035, 0.45, 0.035, sx * 0.19, 0.225, -0.17));
    frame.push(box(0.035, 0.45, 0.035, sx * 0.19, 0.225, 0.17));
    frame.push(box(0.035, 0.03, 0.36, sx * 0.19, 0.02, 0));
    frame.push(box(0.035, 0.3, 0.035, sx * 0.19, 0.6, -0.185));
  }
  place(seat, x, z, rot);
  place(back, x, z, rot);
  place(frame, x, z, rot);
  return { seat, back, frame };
}

/** Mesa redonda de pie central. */
function roundTableGeometries(x, z, radius = 0.62) {
  const top = new THREE.CylinderGeometry(radius, radius, 0.035, 24);
  top.translate(x, 0.735, z);
  const stem = new THREE.CylinderGeometry(0.16, 0.2, 0.7, 12);
  stem.translate(x, 0.36, z);
  return { top: [top], legs: [stem] };
}

/**
 * Módulo de estantería de la biblioteca: carcasa de haya, tapa y costados
 * azules, y las baldas llenas de libros.
 */
function shelfUnit(x, z, len, rot, { tall = true } = {}) {
  const h = tall ? 1.85 : 1.15;
  const depth = 0.5;
  const wood = [];
  const blue = [];

  // Como en las fotos: costados y trasera de haya; baldas, base y tapa azules
  blue.push(box(len, 0.06, depth, 0, 0.08, 0)); // base
  const shelves = tall ? 4 : 2;
  for (let i = 1; i <= shelves; i++) blue.push(box(len - 0.1, 0.035, depth - 0.06, 0, (h / (shelves + 1)) * i, 0));
  wood.push(box(len, h, 0.03, 0, h / 2, -depth / 2 + 0.02)); // trasera
  blue.push(box(len + 0.06, 0.05, depth + 0.06, 0, h + 0.025, 0)); // tapa
  for (const sx of [-1, 1]) wood.push(box(0.05, h, depth, sx * (len / 2), h / 2, 0)); // costados

  place(wood, x, z, rot);
  place(blue, x, z, rot);
  return { wood, blue, h, shelves, len, depth };
}

/** Libros: se reparten por color para poder fusionarlos en pocas mallas. */
function fillShelf(unit, x, z, rot, rand, buckets) {
  const { h, shelves, len } = unit;
  const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, 0, z);
  for (let s = 1; s <= shelves; s++) {
    const y = (h / (shelves + 1)) * s;
    let p = -len / 2 + 0.14;
    while (p < len / 2 - 0.2) {
      const w = 0.028 + rand() * 0.045;
      const bh = 0.19 + rand() * 0.1;
      const g = box(w, bh, 0.22, p + w / 2, y + 0.017 + bh / 2, 0.02);
      g.applyMatrix4(m);
      buckets[Math.floor(rand() * buckets.length)].push(g);
      p += w + 0.004;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Escena                                                              */
/* ------------------------------------------------------------------ */

export function createInterior() {
  const t = buildTextures();
  const group = new THREE.Group();
  group.name = 'interior';

  let seed = 20250;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  /* ---------------- Materiales ---------------- */
  const terrazzo = new THREE.MeshStandardMaterial({
    map: t.terrazzo, color: 0xffffff, roughness: 0.3, metalness: 0.04, envMapIntensity: 0.5
  });
  const ceilingMat = new THREE.MeshStandardMaterial({ map: t.ceiling, color: 0xffffff, roughness: 0.94 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3f2ee, roughness: 0.95 });
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xe9e7e0, roughness: 0.92 });
  const laminate = new THREE.MeshStandardMaterial({ color: 0xe9e1c8, roughness: 0.42, envMapIntensity: 0.35 });
  const beech = new THREE.MeshStandardMaterial({ map: t.wood, color: 0xdcc39a, roughness: 0.6 });
  const skirtingMat = new THREE.MeshStandardMaterial({ map: t.wood, color: 0xc09a63, roughness: 0.55 });
  const shelfBlue = new THREE.MeshStandardMaterial({ color: 0x2a63a4, roughness: 0.55, envMapIntensity: 0.35 });
  const tubular = new THREE.MeshStandardMaterial({ color: 0x9ba1a5, metalness: 0.75, roughness: 0.38, envMapIntensity: 0.7 });
  const seatBlue = new THREE.MeshStandardMaterial({ color: 0x2a4f9e, roughness: 0.92 });
  const seatBlack = new THREE.MeshStandardMaterial({ color: 0x26282b, roughness: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a4045, metalness: 0.7, roughness: 0.45 });
  const whiteConcrete = new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.85 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xf6f5f1, roughness: 0.7 });
  const partitionGlass = new THREE.MeshPhysicalMaterial({
    color: 0xd6e4e8, transparent: true, opacity: 0.16, roughness: 0.04,
    envMapIntensity: 1, side: THREE.DoubleSide, depthWrite: false
  });
  const glassPane = new THREE.MeshPhysicalMaterial({
    color: 0xd6e4e8, transparent: true, opacity: 0.18, roughness: 0.04,
    envMapIntensity: 1, side: THREE.DoubleSide
  });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfffdf6, emissive: 0xfff6e6, emissiveIntensity: 1.5, roughness: 0.4
  });
  const pendantGlass = new THREE.MeshPhysicalMaterial({
    color: 0xeef3f5, transparent: true, opacity: 0.55, roughness: 0.32, metalness: 0.1,
    emissive: 0xfff2dc, emissiveIntensity: 0.55, side: THREE.DoubleSide, envMapIntensity: 1.2
  });

  /* ---------------- Solados, forjado y techos ---------------- */
  const groundMat = terrazzo.clone();
  groundMat.map = tiled(t.terrazzo, R - L, FRONT - BACK, 1.2);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(R - L, FRONT - BACK), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((L + R) / 2, 0.02, (BACK + FRONT) / 2);
  ground.receiveShadow = true;
  group.add(ground);

  // El forjado ocupa la banda oeste y el entorno del núcleo; el resto es vacío.
  // Sobre los tramos de escalera queda abierto, y en la caja del ascensor no hay
  // forjado.
  const UPPER = [
    [L, VOID.x0, BACK, FRONT],
    [VOID.x0, CORE.x0, BACK, EDGE_Z],
    [WELL.x0, WELL.x1, WELL.z1, EDGE_Z],
    [TOWER.x0, CORE.x1, TOWER.z1, EDGE_Z]
  ];
  group.add(mesh(
    UPPER.map(([x0, x1, z0, z1]) => box(x1 - x0, SLAB_T, z1 - z0, (x0 + x1) / 2, SLAB_Y - SLAB_T / 2, (z0 + z1) / 2)),
    slabMat
  ));
  for (const [x0, x1, z0, z1] of UPPER) {
    const w = x1 - x0;
    const d = z1 - z0;
    const floorMat = terrazzo.clone();
    floorMat.map = tiled(t.terrazzo, w, d, 1.2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((x0 + x1) / 2, SLAB_Y + 0.02, (z0 + z1) / 2);
    floor.receiveShadow = true;
    group.add(floor);

    // Falso techo registrable sobre la parte construida de la planta alta
    const ceilMat = ceilingMat.clone();
    ceilMat.map = tiled(t.ceiling, w, d, 1.2);
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set((x0 + x1) / 2, CEIL_Y, (z0 + z1) / 2);
    group.add(ceiling);
  }

  // Sobre el vacío la cubierta queda vista
  const ceilGeo = new THREE.PlaneGeometry(VOID.x1 - VOID.x0, VOID.z1 - VOID.z0, 1, 1);
  ceilGeo.rotateX(Math.PI / 2);
  ceilGeo.applyMatrix4(
    new THREE.Matrix4().set(1, 0, 0, 0, ROOF.slopeX, 1, ROOF.slopeZ, 0, 0, 0, 1, 0, 0, 0, 0, 1)
  );
  ceilGeo.computeVertexNormals();
  const voidCeiling = new THREE.Mesh(ceilGeo, wallMat);
  const vx = (VOID.x0 + VOID.x1) / 2;
  const vz = (VOID.z0 + VOID.z1) / 2;
  voidCeiling.position.set(vx, roofSoffitY(vx, vz) - 0.3, vz);
  group.add(voidCeiling);

  /* ---------------- Rodapié de madera ---------------- */
  const skirting = [];
  const addSkirting = (x0, z0, x1, z1, y) => {
    const w = Math.abs(x1 - x0) || 0.06;
    const d = Math.abs(z1 - z0) || 0.06;
    skirting.push(box(w, 0.1, d, (x0 + x1) / 2, y + 0.05, (z0 + z1) / 2));
  };
  for (const y of [0.02, SLAB_Y + 0.02]) {
    addSkirting(L, BACK, -1.6, BACK, y);
    addSkirting(L, BACK, L, FRONT, y);
    if (y === 0.02) addSkirting(R, VOID.z0, R, FRONT, y);
  }

  /* ================================================================ */
  /* Planta primera                                                    */
  /* ================================================================ */

  const partitions = [];
  const dados = new Map();
  const stripes = new Map();
  const H = CEIL_Y - SLAB_Y + 0.2;

  // Mampara: zócalo macizo bajo, vidrio hasta el techo y montantes oscuros
  const screens = [];
  const screenFrames = [];
  const addScreen = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.05) return;
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    partitions.push(alongX ? box(len, 0.32, 0.13, cx, SLAB_Y + 0.16, cz) : box(0.13, 0.32, len, cx, SLAB_Y + 0.16, cz));
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, H - 0.34), partitionGlass);
    pane.position.set(cx, SLAB_Y + 0.32 + (H - 0.34) / 2, cz);
    if (!alongX) pane.rotation.y = Math.PI / 2;
    screens.push(pane);
    const n = Math.max(1, Math.round(len / 1.7));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const px = x0 + (x1 - x0) * t;
      const pz = z0 + (z1 - z0) * t;
      screenFrames.push(box(0.07, H - 0.3, 0.09, px, SLAB_Y + 0.3 + (H - 0.3) / 2, pz));
    }
    screenFrames.push(alongX ? box(len, 0.07, 0.1, cx, SLAB_Y + 0.33, cz) : box(0.1, 0.07, len, cx, SLAB_Y + 0.33, cz));
  };

  const addWall = (x0, z0, x1, z1, thickness = 0.13) => {
    const w = Math.abs(x1 - x0) || thickness;
    const d = Math.abs(z1 - z0) || thickness;
    partitions.push(box(w, H, d, (x0 + x1) / 2, SLAB_Y + H / 2, (z0 + z1) / 2));
  };

  const doors = new THREE.Group();
  const strips = [];

  // Paramento con huecos: puertas hasta el suelo y ventanas con antepecho.
  // Entre hueco y hueco, el muro (o la mampara) corre de suelo a techo.
  const openWall = (x0, z0, x1, z1, openings, fn) => {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const fixed = alongX ? z0 : x0;
    const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
    const a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const seg = (p, q) => {
      if (q - p < 0.03) return;
      if (alongX) fn(p, fixed, q, fixed);
      else fn(fixed, p, fixed, q);
    };
    const piece = (len, h, y, at) =>
      partitions.push(alongX ? box(len, h, 0.13, at, SLAB_Y + y + h / 2, fixed) : box(0.13, h, len, fixed, SLAB_Y + y + h / 2, at));
    let cur = a0;
    for (const o of [...openings].sort((p, q) => p.at - q.at)) {
      seg(cur, o.at - o.w / 2);
      cur = o.at + o.w / 2;
      piece(o.w + 0.02, H - o.y1, o.y1, o.at); // dintel
      if (o.y0 > 0) piece(o.w + 0.02, o.y0, 0, o.at); // antepecho
    }
    seg(cur, a1);
  };

  // Ventana de corredera: marco blanco y dos hojas solapadas
  const sliders = [];
  const sliderGlass = [];
  const addSlider = (o, alongX, fixed, inward) => {
    const h = o.y1 - o.y0;
    const y = SLAB_Y + o.y0 + h / 2;
    const frame = (len, hh, at, yy, off = 0) =>
      sliders.push(alongX ? box(len, hh, 0.15, at, yy, fixed + off) : box(0.15, hh, len, fixed + off, yy, at));
    frame(o.w, 0.06, o.at, SLAB_Y + o.y1 - 0.03);
    frame(o.w, 0.08, o.at, SLAB_Y + o.y0 + 0.04);
    frame(0.06, h, o.at - o.w / 2 + 0.03, y);
    frame(0.06, h, o.at + o.w / 2 - 0.03, y);
    for (const [k, off] of [[-1, -0.025], [1, 0.025]]) {
      const at = o.at + k * o.w / 4;
      frame(0.05, h - 0.12, at + k * (o.w / 4 - 0.04), y, off * inward);
      frame(0.05, h - 0.12, at - k * (o.w / 4 - 0.04), y, off * inward);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(o.w / 2 - 0.08, h - 0.14), partitionGlass);
      pane.position.set(alongX ? at : fixed + off * inward, y, alongX ? fixed + off * inward : at);
      if (!alongX) pane.rotation.y = Math.PI / 2;
      sliderGlass.push(pane);
    }
  };

  for (const room of ROOMS) {
    // Cada paramento de la sala, con el lado al que da
    const sides = {
      south: [room.x0, room.z1, room.x1, room.z1],
      north: [room.x0, room.z0, room.x1, room.z0],
      west: [room.x0, room.z0, room.x0, room.z1],
      east: [room.x1, room.z0, room.x1, room.z1]
    };
    // Hacia dentro de la sala, para colgar en cada paramento lo que va dentro
    const inwardOf = { south: [0, -1], north: [0, 1], west: [1, 0], east: [-1, 0] };
    const perimeter = {
      south: Math.abs(room.z1 - FRONT) < 0.2,
      west: Math.abs(room.x0 - L) < 0.2,
      north: Math.abs(room.z0 - BACK) < 0.2,
      east: false
    };

    for (const [name, [x0, z0, x1, z1]] of Object.entries(sides)) {
      const wallFn = room.glass?.includes(name) ? addScreen : addWall;
      // La fachada la levanta building.js; aquí solo la tabiquería interior
      if (perimeter[name]) continue;
      const openings = [];
      if (room.door.side === name) openings.push({ at: room.door.at, w: DOOR_W, y0: 0, y1: DOOR_H });
      for (const win of room.windows ?? []) {
        if (win.side !== name) continue;
        openings.push(win);
        const alongX = name === 'north' || name === 'south';
        addSlider(win, alongX, alongX ? z0 : x0, alongX ? inwardOf[name][1] : inwardOf[name][0]);
      }
      openWall(x0, z0, x1, z1, openings, wallFn);
    }

    // Mural de las ocas, visible desde la biblioteca a través de la mampara
    if (room.mural === 'west') {
      const len = Math.min(room.z1 - room.z0 - 1, 6.4);
      const m = panel(mural(), len, 2.0, room.x0 + 0.082, SLAB_Y + 1.6, room.z1 - 0.6 - len / 2);
      m.rotation.y = Math.PI / 2;
      group.add(m);
    }

    // Pantalla de proyección enrollable sobre las ventanas de la fachada
    if (room.screen) {
      const cx = (room.x0 + room.x1) / 2;
      group.add(panel(wallLettering('', { width: 8, height: 8 }), 2.6, 1.15, cx, SLAB_Y + 2.05, FRONT - 0.42, Math.PI, {
        material: { color: 0xf8f8f6, map: null, side: THREE.DoubleSide }
      }));
      group.add(mesh([box(2.8, 0.1, 0.1, cx, SLAB_Y + 2.66, FRONT - 0.42)], doorMat, false));
    }

    // Hoja de la puerta, su ventanuco y la tira de señalética
    const horizontal = room.door.side === 'north' || room.door.side === 'south';
    const [dx, dz] = horizontal
      ? [room.door.at, room.door.side === 'north' ? room.z0 : room.z1]
      : [room.door.side === 'west' ? room.x0 : room.x1, room.door.at];
    // Hacia fuera de la sala
    const out = horizontal
      ? [0, room.door.side === 'north' ? -1 : 1]
      : [room.door.side === 'west' ? -1 : 1, 0];
    const rot = horizontal ? (out[1] > 0 ? 0 : Math.PI) : (out[0] > 0 ? Math.PI / 2 : -Math.PI / 2);

    const leaf = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W - 0.04, DOOR_H - 0.03, 0.045), doorMat);
    leaf.position.set(dx + out[0] * 0.02, SLAB_Y + (DOOR_H - 0.03) / 2, dz + out[1] * 0.02);
    leaf.rotation.y = rot;
    leaf.castShadow = true;
    const portFrame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.06), doorMat);
    portFrame.position.set(dx + out[0] * 0.02, SLAB_Y + 1.65, dz + out[1] * 0.02);
    portFrame.rotation.y = rot;
    const port = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), glassPane);
    port.position.set(dx + out[0] * 0.05, SLAB_Y + 1.65, dz + out[1] * 0.05);
    port.rotation.y = rot;
    // Las hojas que llevan la tira pegada no tienen ventanuco
    doors.add(leaf);
    if (room.door.strip !== 'leaf') doors.add(portFrame, port);

    const strip = doorStrip({
      title: room.title,
      number: room.number ?? '',
      color: room.color,
      iconKind: room.icon,
      seed: room.id.length * 7 + Math.round(room.x0 * 3)
    });
    // En la jamba, junto al hueco, o pegada a la propia hoja
    const side = room.door.stripSide ?? 1;
    const onLeaf = room.door.strip === 'leaf';
    const offAlong = onLeaf ? side * (DOOR_W / 2 - 0.2) : side * (DOOR_W / 2 + 0.16);
    const offOut = onLeaf ? 0.048 : 0.075;
    const sx = horizontal ? dx + offAlong : dx + out[0] * offOut;
    const sz = horizontal ? dz + out[1] * offOut : dz + offAlong;
    const stripPanel = panel(strip, onLeaf ? 0.22 : 0.24, onLeaf ? 1.75 : 1.9, sx, SLAB_Y + (onLeaf ? 1.0 : 1.15), sz);
    stripPanel.rotation.y = rot;
    strips.push(stripPanel);

    // Zócalo o franja de color por dentro de la sala, y rodapié
    for (const [name, [x0, z0, x1, z1]] of Object.entries(sides)) {
      if (room.glass?.includes(name)) continue;
      const [ix, iz] = inwardOf[name];
      const off = perimeter[name] ? (name === 'south' ? 0.27 : 0.045) : 0.072;
      const w = Math.abs(x1 - x0) || 0.012;
      const d = Math.abs(z1 - z0) || 0.012;
      const cx = (x0 + x1) / 2 + ix * off;
      const cz = (z0 + z1) / 2 + iz * off;
      if (room.dado) {
        const geos = dados.get(room.dado) || [];
        geos.push(box(w, 1.0, d, cx, SLAB_Y + 0.6, cz));
        dados.set(room.dado, geos);
      }
      if (room.stripe) {
        const geos = stripes.get(room.stripe) || [];
        geos.push(box(w, 0.09, d, cx, SLAB_Y + (room.stripeY ?? 1.12), cz));
        stripes.set(room.stripe, geos);
      }
    }
    for (const [x0, z0, x1, z1] of Object.values(sides)) addSkirting(x0, z0, x1, z1, SLAB_Y + 0.02);
  }

  // El núcleo: la caja del ascensor la levanta building.js; aquí solo se cierra
  // el hueco de escalera por el este, contra el ascensor

  group.add(mesh(partitions, wallMat));
  screens.forEach((p) => group.add(p));
  group.add(mesh(screenFrames, steel, false));
  group.add(doors);
  strips.forEach((s) => group.add(s));
  for (const [color, geos] of dados) group.add(mesh(geos, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }), false));
  for (const [color, geos] of stripes) group.add(mesh(geos, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }), false));
  group.add(mesh(sliders, doorMat, false));
  sliderGlass.forEach((p) => group.add(p));

  // Pizarra del pasillo con el nombre del centro, en el muro de la sala 3 que
  // lleva hasta la oficina
  group.add(panel(chalkboard(), 3.2, 1.34, -8.4 + 0.075, SLAB_Y + 1.5, -14.6, Math.PI / 2));
  group.add(mesh([box(0.025, 1.4, 3.26, -8.4 + 0.06, SLAB_Y + 1.5, -14.6)], steel, false));

  // Extintor y su señal en el muro de la sala de grupo, frente a la pizarra
  const red = new THREE.MeshStandardMaterial({ color: 0xc9221e, roughness: 0.45, metalness: 0.2 });
  group.add(mesh([
    new THREE.CylinderGeometry(0.085, 0.085, 0.5, 14).translate(-6.4 - 0.16, SLAB_Y + 0.62, -17.2),
    new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8).translate(-6.4 - 0.16, SLAB_Y + 0.91, -17.2)
  ], red));
  group.add(panel(wallLettering('', { width: 8, height: 8 }), 0.3, 0.3, -6.4 - 0.072, SLAB_Y + 1.75, -17.2, -Math.PI / 2, {
    material: { color: 0xd8261f, map: null }
  }));

  /* ---------------- Mobiliario de las salas ---------------- */
  const allTops = [];
  const allLegs = [];
  const allSeats = [];
  const allBacks = [];
  const allFrames = [];

  for (const room of ROOMS) {
    const cx = (room.x0 + room.x1) / 2;
    const cz = (room.z0 + room.z1) / 2;
    const width = room.x1 - room.x0;
    const depth = room.z1 - room.z0;

    const tops = [];
    const legs = [];
    const seats = [];
    const backs = [];
    const frames = [];
    const addChair = (x, z, rot) => {
      const c = chairGeometries(x, z, rot);
      seats.push(...c.seat);
      backs.push(...c.back);
      frames.push(...c.frame);
    };

    if (room.kind === 'study') {
      const rows = Math.max(1, Math.floor((depth - 2.4) / 3.0));
      const runLength = Math.min(width - 2.6, 5.6);
      for (let r = 0; r < rows; r++) {
        const z = room.z0 + 2.2 + r * 3.0;
        const d = deskGeometries(cx, z, runLength, 0.8);
        tops.push(...d.top);
        legs.push(...d.legs);
        const perSide = Math.max(2, Math.round(runLength / 1.5));
        for (let i = 0; i < perSide; i++) {
          const x = cx - runLength / 2 + (runLength / perSide) * (i + 0.5);
          addChair(x, z + 0.72, Math.PI);
          addChair(x, z - 0.72, 0);
        }
      }
      if (room.carrels) {
        for (let x = room.x0 + 1.3; x < room.x1 - 1.3; x += 1.5) {
          const c = carrelGeometries(x, room.z0 + 0.62, 0);
          tops.push(...c.top);
          legs.push(...c.legs);
          addChair(x, room.z0 + 1.42, Math.PI);
        }
      }
    }

    if (room.kind === 'block') {
      // Mesas juntas en un bloque largo, sillas alrededor, y una fila de mesas
      // contra la fachada, bajo la pantalla
      for (const z of [-7.4, -6.0, -4.6]) {
        const d = deskGeometries(cx, z, 1.4, 1.38);
        tops.push(...d.top);
        legs.push(...d.legs);
        for (const dz of [-0.35, 0.35]) {
          addChair(cx - 0.98, z + dz, Math.PI / 2);
          addChair(cx + 0.98, z + dz, -Math.PI / 2);
        }
      }
      addChair(cx, -8.45, 0);
      addChair(cx, -3.55, Math.PI);
      for (const x of [-6.4, -4.95, -3.5]) {
        const d = deskGeometries(x, -0.95, 1.4, 0.7);
        tops.push(...d.top);
        legs.push(...d.legs);
        addChair(x - 0.3, -1.68, 0);
        addChair(x + 0.3, -1.68, 0);
      }
    }

    if (room.kind === 'tables') {
      // Mesas redondas junto a la ventana y puestos individuales al fondo
      for (const [dx, dz] of [[-width * 0.22, -1.9], [width * 0.22, -1.9]]) {
        const rt = roundTableGeometries(cx + dx, cz + dz, 0.7);
        tops.push(...rt.top);
        legs.push(...rt.legs);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.6;
          addChair(cx + dx + Math.sin(a) * 1.05, cz + dz + Math.cos(a) * 1.05, a + Math.PI);
        }
      }
      for (let x = room.x0 + 1.2; x < room.x1 - 1.2; x += 1.5) {
        const c = carrelGeometries(x, room.z1 - 0.75, Math.PI);
        tops.push(...c.top);
        legs.push(...c.legs);
        addChair(x, room.z1 - 1.55, 0);
      }
    }

    if (room.kind === 'group') {
      const rt = roundTableGeometries(cx, cz);
      tops.push(...rt.top);
      legs.push(...rt.legs);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        addChair(cx + Math.sin(a) * 0.95, cz + Math.cos(a) * 0.95, a + Math.PI);
      }
      const board = panel(wallLettering('', { width: 8, height: 8 }), 1.7, 1.0, cx, SLAB_Y + 1.55, room.z0 + 0.1, 0, {
        material: { color: 0x2f4a3a, map: null }
      });
      group.add(board);
      group.add(mesh([box(1.84, 1.14, 0.05, cx, SLAB_Y + 1.55, room.z0 + 0.075)], tubular, false));
    }

    if (room.kind === 'office') {
      const d = deskGeometries(cx, cz + 0.6, Math.min(width - 1.2, 1.9), 0.8);
      tops.push(...d.top);
      legs.push(...d.legs);
      addChair(cx, cz - 0.15, 0);
      group.add(mesh([box(Math.min(width - 1.0, 1.8), 1.1, 0.42, cx, SLAB_Y + 0.55, room.z0 + 0.32)], beech));
      // Pizarra blanca
      group.add(
        panel(wallLettering('', { width: 8, height: 8 }), 1.8, 1.1, cx, SLAB_Y + 1.6, room.z0 + 0.09, 0, {
          material: { color: 0xf7f7f4, map: null }
        })
      );
    }

    for (const list of [tops, legs, seats, backs, frames]) list.forEach((g) => g.translate(0, SLAB_Y, 0));
    allTops.push(...tops);
    allLegs.push(...legs);
    allSeats.push(...seats);
    allBacks.push(...backs);
    allFrames.push(...frames);
  }

  group.add(mesh(allTops, laminate));
  group.add(mesh(allLegs, tubular));
  group.add(mesh(allSeats, seatBlue));
  group.add(mesh(allBacks, seatBlack));
  group.add(mesh(allFrames, tubular));

  // Luminarias empotradas de rejilla
  const panels = [];
  const grilles = [];
  for (let x = L + 1.9; x < CORE.x1; x += 3.4) {
    for (let z = BACK + 1.9; z < FRONT - 1.5; z += 3.0) {
      if (x > VOID.x0) continue; // el vacío y el núcleo
      panels.push(box(1.18, 0.02, 0.58, x, CEIL_Y - 0.03, z));
      grilles.push(box(1.26, 0.05, 0.04, x, CEIL_Y - 0.025, z - 0.31));
      grilles.push(box(1.26, 0.05, 0.04, x, CEIL_Y - 0.025, z + 0.31));
      grilles.push(box(0.04, 0.05, 0.66, x - 0.61, CEIL_Y - 0.025, z));
      grilles.push(box(0.04, 0.05, 0.66, x + 0.61, CEIL_Y - 0.025, z));
      for (let i = -2; i <= 2; i++) grilles.push(box(0.03, 0.045, 0.58, x + i * 0.22, CEIL_Y - 0.03, z));
    }
  }
  group.add(mesh(panels, lampMat, false));
  group.add(mesh(grilles, tubular, false));

  /* ---------------- Rellano de la planta alta ---------------- */
  // Sofá rojo contra el muro de la sala 1, bajo la ventana de corredera y BECA
  const sofa = new THREE.Group();
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0xc4534a, roughness: 0.95 });
  sofa.add(mesh([
    box(2.0, 0.42, 0.82, 0, 0.3, 0),
    box(2.0, 0.5, 0.2, 0, 0.66, -0.31),
    box(0.18, 0.3, 0.82, -0.91, 0.6, 0),
    box(0.18, 0.3, 0.82, 0.91, 0.6, 0)
  ], sofaMat));
  sofa.position.set(-4.85, SLAB_Y, -12.0 - 0.07 - 0.45);
  sofa.rotation.y = Math.PI;
  group.add(sofa);

  // Cubos-taburete pintados a triángulos, y cajas de cartón encima
  const cardboard = new THREE.MeshStandardMaterial({ color: 0xb48a58, roughness: 0.92 });
  const cube = (x, y, z, size, seed, rotY) => {
    const mats = [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshStandardMaterial({ map: cubeFace(seed * 6 + i), roughness: 0.75 }));
    const c = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mats);
    c.position.set(x, SLAB_Y + y + size / 2, z);
    c.rotation.y = rotY;
    c.castShadow = true;
    group.add(c);
  };
  cube(-6.55, 0, -12.36, 0.5, 1, 0.1);
  cube(-6.53, 0.5, -12.38, 0.48, 2, -0.15);
  cube(-6.1, 0, -13.0, 0.46, 3, 0.3);
  cube(-2.05, 0, -14.4, 0.5, 5, 0.12);
  const boxes = [
    box(0.5, 0.42, 0.42, -2.05, SLAB_Y + 0.5 + 0.21, -14.4),
    box(0.48, 0.4, 0.4, -3.0, SLAB_Y + 0.2, -0.45 - 1.8),
    box(0.44, 0.38, 0.4, -3.0, SLAB_Y + 0.4 + 0.19, -0.45 - 1.8),
    box(0.5, 0.36, 0.44, -3.02, SLAB_Y + 0.78 + 0.18, -0.45 - 1.8)
  ];
  group.add(mesh(boxes, cardboard));

  // «Calvià in Europe» en el paramento de la sala de grupo que da a la escalera
  const europe = panel(europeBoard(), 2.0, 1.95, -1.7 + 0.09, SLAB_Y + 1.55, -16.4, Math.PI / 2);
  group.add(europe);
  group.add(mesh([box(0.05, 2.07, 2.12, -1.7 + 0.06, SLAB_Y + 1.55, -16.4)], beech, false));
  // BECA, sobre la ventana de corredera de la sala 1
  const beca = panel(becaLetters(), 1.7, 0.85, -4.85, SLAB_Y + 2.38, -12.0 - 0.072, Math.PI, {
    transparent: true, material: { transparent: true }
  });
  group.add(beca);

  // Estrellas de papel colgadas
  for (const [x, z] of [[-4.6, -13.7], [L + 3.2, -18.0], [-4.2, -9.0]]) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 1), new THREE.MeshStandardMaterial({
      color: 0xfbfaf6, roughness: 0.9, flatShading: true
    }));
    star.position.set(x, CEIL_Y - 0.5, z);
    star.scale.set(1, 1.25, 1);
    group.add(star);
  }

  /* ================================================================ */
  /* Planta baja: vestíbulo y biblioteca                               */
  /* ================================================================ */

  // Columnas de hormigón gris visto: de doble altura contra el muro cortina y
  // en el vacío; las del borde del altillo siguen hasta el techo de la planta
  // alta, con su anillo de rodapié de madera, y hay otra en el rellano
  const concreteGrey = new THREE.MeshStandardMaterial({ color: 0xb9b8b2, roughness: 0.88 });
  const columns = [];
  const columnFoot = [];
  for (const [x, z] of [[-1.0, -1.1], [2.6, -1.1], [6.2, -1.1], [9.8, -1.1], [4.2, -7.0]]) {
    const h = roofSoffitY(x, z) - 0.3;
    columns.push(new THREE.CylinderGeometry(0.24, 0.24, h, 20).translate(x, h / 2, z));
  }
  for (const z of [-3.2, -7.6, -11.6]) {
    columns.push(new THREE.CylinderGeometry(0.2, 0.2, CEIL_Y, 18).translate(VOID.x0 - 0.35, CEIL_Y / 2, z));
    columnFoot.push(new THREE.CylinderGeometry(0.215, 0.215, 0.1, 18).translate(VOID.x0 - 0.35, SLAB_Y + 0.07, z));
  }
  for (const [x, z] of [[-7.9, -13.35], [-2.55, -13.2]]) {
    columns.push(new THREE.CylinderGeometry(0.2, 0.2, CEIL_Y - SLAB_Y, 18).translate(x, (SLAB_Y + CEIL_Y) / 2, z));
    columnFoot.push(new THREE.CylinderGeometry(0.215, 0.215, 0.1, 18).translate(x, SLAB_Y + 0.07, z));
  }
  group.add(mesh(columns, concreteGrey));
  group.add(mesh(columnFoot, skirtingMat, false));

  // Canto del altillo: la banda blanca que corre bajo las mamparas
  group.add(mesh([
    box(0.3, 0.85, FRONT - VOID.z0, VOID.x0 - 0.1, SLAB_Y - 0.25, (VOID.z0 + FRONT) / 2),
    box(CORE.x1 - VOID.x0, 0.85, 0.3, (VOID.x0 + CORE.x1) / 2, SLAB_Y - 0.25, EDGE_Z - 0.1),
    box(0.3, 0.85, EDGE_Z - VOID.z0 + 0.35, CORE.x1 - 0.1, SLAB_Y - 0.25, (EDGE_Z + VOID.z0) / 2 - 0.1)
  ], whiteConcrete));

  // Escalera de ida y vuelta en el hueco oeste del núcleo, junto al ascensor:
  // peldaño de terrazo con mamperlán de madera y el rodapié siguiendo los
  // peldaños, como en las fotos. Sube de la planta baja a la primera y sigue
  // hasta la cubierta, donde sale a la caja del ascensor.
  const stairs = [];
  const nosings = [];
  const RISERS = 8;
  const tread = 0.28;
  const zStart = WELL.z1;
  const zTop = zStart - tread * RISERS; // arranque del rellano intermedio
  const flightA = WELL.x0 + 0.6; // sube hacia el norte
  const flightB = WELL.x1 - 0.6; // y vuelve hacia el sur
  const eye = (flightA + flightB) / 2;
  const ROOF_LANDING = 8.45;
  const runs = [
    { from: 0, to: SLAB_Y },
    { from: SLAB_Y, to: ROOF_LANDING }
  ];
  const flightRails = [];
  for (const { from, to } of runs) {
    const rise = (to - from) / (RISERS * 2);
    const mid = from + rise * RISERS;
    for (let i = 0; i < RISERS; i++) {
      const y = from + rise * (i + 1);
      const z = zStart - tread * (i + 0.5);
      // El primer tramo de la planta baja es macizo; los demás, losa de peldaños
      stairs.push(from === 0 ? box(1.1, y, tread, flightA, y / 2, z) : box(1.1, 0.24, tread, flightA, y - 0.12, z));
      nosings.push(box(1.1, 0.05, 0.03, flightA, y - 0.02, z + tread / 2));
    }
    // Rellano intermedio de muro a muro, bajo la ventana
    stairs.push(box(WELL.x1 - WELL.x0, 0.2, zTop - WELL.z0, (WELL.x0 + WELL.x1) / 2, mid - 0.1, (zTop + WELL.z0) / 2));
    for (let i = 0; i < RISERS; i++) {
      const y = mid + rise * (i + 1);
      const z = zStart - tread * (RISERS - i - 0.5);
      stairs.push(box(1.1, 0.24, tread, flightB, y - 0.12, z));
      nosings.push(box(1.1, 0.05, 0.03, flightB, y - 0.02, z - tread / 2));
      // Rodapié escalonado contra la caja del ascensor
      skirting.push(box(0.02, 0.1, tread, WELL.x1 - 0.01, y + 0.05, z));
    }
    skirting.push(box(WELL.x1 - WELL.x0, 0.1, 0.02, (WELL.x0 + WELL.x1) / 2, mid + 0.05, WELL.z0 + 0.01));
    flightRails.push([eye - 0.03, zStart, eye - 0.03, zTop, from + 0.25, mid + 0.25]);
    flightRails.push([eye + 0.03, zTop, eye + 0.03, zStart, mid + 0.25, to + 0.25]);
  }
  const stairMat = terrazzo.clone();
  stairMat.map = tiled(t.terrazzo, 1, 1, 1.2);
  group.add(mesh(stairs, stairMat));
  group.add(mesh(nosings, skirtingMat, false));

  // Barandilla de pletina negra: cruces de San Andrés con un disco en cada
  // cruce, como todas las del centro. `rise` la inclina para los tramos.
  const rails = [];
  const addSteelRail = (x1, z1, x2, z2, y, rise = 0) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ang = Math.atan2(z2 - z1, x2 - x1);
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const local = [];
    local.push(box(len, 0.05, 0.05, 0, 1.02, 0)); // pasamanos
    local.push(box(len, 0.04, 0.04, 0, 0.06, 0)); // rastrel inferior
    const posts = Math.max(2, Math.round(len / 1.5));
    for (let i = 0; i <= posts; i++) {
      const px = -len / 2 + (len / posts) * i;
      local.push(box(0.05, 1.04, 0.05, px, 0.52, 0));
    }
    for (let i = 0; i < posts; i++) {
      const a = -len / 2 + (len / posts) * i;
      const b = a + len / posts;
      for (const dir of [1, -1]) {
        const d = Math.hypot(b - a, 0.9);
        const bar = new THREE.BoxGeometry(d, 0.025, 0.025);
        bar.rotateZ(Math.atan2(0.9 * dir, b - a));
        bar.translate((a + b) / 2, 0.54, 0);
        local.push(bar);
      }
      local.push(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12).rotateX(Math.PI / 2).translate((a + b) / 2, 0.54, 0));
    }
    if (rise) {
      const shear = new THREE.Matrix4().set(1, 0, 0, 0, rise / len, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
      local.forEach((g) => g.applyMatrix4(shear));
    }
    place(local, cx, cz, -ang, y);
    rails.push(...local);
  };
  // Balconada sobre la biblioteca, delante del ascensor, y su vuelta
  addSteelRail(VOID.x0 + 0.05, EDGE_Z - 0.34, CORE.x1 - 0.32, EDGE_Z - 0.34, SLAB_Y);
  addSteelRail(CORE.x1 - 0.32, EDGE_Z - 0.34, CORE.x1 - 0.32, VOID.z0 + 0.35, SLAB_Y);
  // Ojo de la escalera, tramo a tramo, y el borde del hueco en la planta alta
  for (const [x1, z1, x2, z2, y1, y2] of flightRails) addSteelRail(x1, z1, x2, z2, (y1 + y2) / 2 - 0.25, y2 - y1);
  addSteelRail(WELL.x0 - 0.03, WELL.z1, WELL.x0 - 0.03, -15.2, SLAB_Y);
  group.add(mesh(rails, steel));

  // Ventanas del hueco de escalera, en el muro norte del núcleo
  const stairWindows = [];
  const stairGlass = new THREE.MeshStandardMaterial({ color: 0xcfe3ea, emissive: 0xbcd6de, emissiveIntensity: 0.55, roughness: 0.2 });
  for (const y of [STAIR_WINDOWS[0], STAIR_WINDOWS[1]]) {
    const cxw = (WELL.x0 + WELL.x1) / 2;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.85), stairGlass);
    pane.position.set(cxw, y, WELL.z0 + 0.012);
    group.add(pane);
    stairWindows.push(
      box(1.07, 0.06, 0.05, cxw, y + 0.455, WELL.z0 + 0.02),
      box(1.07, 0.06, 0.05, cxw, y - 0.455, WELL.z0 + 0.02),
      box(0.06, 0.97, 0.05, cxw - 0.505, y, WELL.z0 + 0.02),
      box(0.06, 0.97, 0.05, cxw + 0.505, y, WELL.z0 + 0.02)
    );
  }
  group.add(mesh(stairWindows, seatBlack, false));

  // Antepecho blanco de la balconada sobre el vestíbulo
  group.add(mesh([box(CORE.x1 - VOID.x0, 0.55, 0.3, (VOID.x0 + CORE.x1) / 2, SLAB_Y + 0.28, EDGE_Z - 0.12)], whiteConcrete));

  // #CUCALVIÀ en letras de bulto sobre el antepecho, mirando a la biblioteca
  const word = blockLetterCells('#CUCALVIÀ', { px: 15 });
  const pix = 0.052;
  const letters = word.cells.map(([cx, cy]) =>
    box(pix, pix, 0.24, CORE.x1 - 0.2 - word.width * pix + cx * pix, SLAB_Y + 0.55 + cy * pix, EDGE_Z - 0.12)
  );
  group.add(mesh(letters, whiteConcrete));

  // Mostrador de recepción: blanco, con la «U» de triángulos del centro
  const counterMat = new THREE.MeshStandardMaterial({ color: 0xf3f2ee, roughness: 0.6 });
  group.add(mesh([
    box(2.8, 1.05, 0.6, -4.6, 0.525, -3.2),
    box(0.6, 1.05, 1.8, -5.7, 0.525, -4.4),
    box(3.0, 0.05, 0.75, -4.6, 1.07, -3.2)
  ], counterMat));
  const logo = panel(logoPanel(), 0.9, 0.9, -4.0, 0.55, -2.89);
  group.add(logo);

  // Tabique bajo el altillo: puerta de la sala infantil, ventana de la
  // oficina de la biblioteca y la pared «SEGUEIX-NOS!»
  const lowWall = [];
  const WALL_X = -7.3;
  lowWall.push(box(0.14, SLAB_Y - SLAB_T, 3.6, WALL_X, (SLAB_Y - SLAB_T) / 2, -1.9));
  lowWall.push(box(0.14, SLAB_Y - SLAB_T, 2.4, WALL_X, (SLAB_Y - SLAB_T) / 2, -11.8));
  lowWall.push(box(0.14, SLAB_Y - SLAB_T - 2.3, 1.8, WALL_X, 2.3 + (SLAB_Y - SLAB_T - 2.3) / 2, -4.6)); // dintel
  lowWall.push(box(0.14, SLAB_Y - SLAB_T, 4.9, WALL_X, (SLAB_Y - SLAB_T) / 2, -8.05));
  group.add(mesh(lowWall, wallMat));
  // Puerta de dos hojas de la sala infantil
  for (const dz of [-0.45, 0.45]) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, 0.86), doorMat);
    leaf.position.set(WALL_X + 0.02, 1.1, -4.6 + dz);
    group.add(leaf);
  }
  const kidsSign = panel(wallLines(['SALA INFANTIL', 'CONEIXEMENTS', 'BIBLIOIGUALTAT']), 2.0, 0.85, WALL_X + 0.09, 2.95, -4.6, Math.PI / 2, {
    transparent: true, material: { transparent: true }
  });
  group.add(kidsSign);
  const follow = panel(followUs(), 3.4, 2.5, WALL_X + 0.09, 1.9, -8.6, Math.PI / 2);
  group.add(follow);
  // Ventana interior de la oficina
  const officeWin = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9), partitionGlass);
  officeWin.position.set(WALL_X + 0.08, 1.55, -11.6);
  officeWin.rotation.y = Math.PI / 2;
  group.add(officeWin);
  group.add(mesh([box(0.1, 1.06, 1.26, WALL_X + 0.03, 1.55, -11.6)], doorMat, false));

  // Banderolas de la doble altura, en el muro norte del ala este: verde, amarilla,
  // magenta y azul, cada una con su foto virada en la cabecera
  [
    [['SUPORT', 'FUTUR', 'ESPAIS'], '#7fa82a', '#a9cf45', 'building', ''],
    [['ESTUDI', 'LECTURA'], '#d6a51c', '#f0c94a', 'books', ''],
    [['CONEIXEMENTS', 'TALLERS', 'ORIENTACIÓ'], '#c41f63', '#e2457f', 'people', ''],
    [['NOVETATS', 'MOBILITAT'], '#1f74c4', '#4a9be0', 'people', 'BIBLIOTECA']
  ].forEach(([words, color, drip, photo, title], i) => {
    const x = 6.0 + i * 1.5;
    const b = panel(banner(words, { color, drip, photo, title }), 1.15, 5.2, x, 5.75, VOID.z0 + 0.36, 0, {
      material: { color: 0xc4c4c4, roughness: 0.95 }
    });
    group.add(b);
  });

  /* ---------------- Biblioteca ---------------- */
  const shelfWood = [];
  const shelfSides = [];
  const bookBuckets = [[], [], [], [], [], []];

  // Un módulo cabe si sus cuatro esquinas están dentro de la planta escalonada
  // y no pisa el núcleo de escalera
  const inPlan = (x, z) => z > -12.2 || (z > -17.5 && x < 4.4) || x < -1.8;
  const fits = (x, z, len, rot) => {
    const hx = rot ? 0.3 : len / 2 + 0.2;
    const hz = rot ? len / 2 + 0.2 : 0.3;
    for (const [dx, dz] of [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) {
      if (!inPlan(x + dx, z + dz)) return false;
    }
    const nearCore = x + hx > CORE.x0 - 0.8 && x - hx < CORE.x1 + 0.8 && z + hz > CORE.z0 - 0.8 && z - hz < CORE.z1 + 1.6;
    return !nearCore && x - hx > WALL_X + 0.4;
  };
  const addUnit = (x, z, len, rot, tall) => {
    if (!fits(x, z, len, rot)) return;
    const unit = shelfUnit(x, z, len, rot, { tall });
    shelfWood.push(...unit.wood);
    shelfSides.push(...unit.blue);
    fillShelf(unit, x, z, rot, rand, bookBuckets);
  };

  // Módulos altos en batería, paralelos a la fachada
  for (let z = -5.2; z >= -20.5; z -= 2.1) {
    for (const x of [-4.8, -1.0, 3.0, 7.0]) addUnit(x, z, 3.0, 0, true);
  }
  // Módulos bajos de novedades junto al vidrio, dejando libre la entrada
  for (const x of [-1.2, 7.6]) addUnit(x, -2.6, 3.0, 0, false);
  // Expositores de DVD y revistas contra el muro este
  addUnit(R - 0.4, -2.6, 3.0, -Math.PI / 2, false);

  group.add(mesh(shelfWood, beech));
  group.add(mesh(shelfSides, shelfBlue));
  const bookColors = [0x8c3b3b, 0x2f5d78, 0x6a7a3c, 0xb08a3e, 0x50435f, 0xd8d2c4];
  bookBuckets.forEach((geos, i) => {
    if (geos.length) group.add(mesh(geos, new THREE.MeshStandardMaterial({ color: bookColors[i], roughness: 0.85 }), false));
  });

  // Mesas de lectura junto al rótulo
  const lowTops = [];
  const lowLegs = [];
  const lowSeats = [];
  const lowBacks = [];
  const lowFrames = [];
  const addLowChair = (x, z, rot) => {
    const c = chairGeometries(x, z, rot);
    lowSeats.push(...c.seat);
    lowBacks.push(...c.back);
    lowFrames.push(...c.frame);
  };
  for (const [x, z] of [[L + 2.6, -20.4], [L + 2.6, -17.2]]) {
    const d = deskGeometries(x, z, 2.6, 1.1);
    lowTops.push(...d.top);
    lowLegs.push(...d.legs);
    for (const sx of [-1, 1]) {
      addLowChair(x + sx * 0.7, z + 0.85, Math.PI);
      addLowChair(x + sx * 0.7, z - 0.85, 0);
    }
  }
  // Puesto de consulta con ordenador
  lowTops.push(box(1.5, 0.04, 0.75, L + 5.6, 0.735, BACK + 1.0));
  group.add(mesh([box(0.5, 0.34, 0.05, L + 5.6, 1.1, BACK + 0.72)], seatBlack, false));

  // Rótulo BIBLIOTECA en el muro este, junto al muro cortina, con la rejilla de
  // carteles debajo; delante, la mesa de lectura con su balda alta, el puesto
  // de ordenador, los atriles de música y una mesita redonda de revistas
  const biblioteca = panel(wallLettering('BIBLIOTECA'), 5.2, 1.3, R - 0.04, 3.45, -7.0, -Math.PI / 2, {
    transparent: true,
    material: { transparent: true, roughness: 0.95 }
  });
  group.add(biblioteca);
  group.add(panel(noticeboard(), 2.6, 1.0, R - 0.04, 1.85, -8.3, -Math.PI / 2));
  group.add(panel(noticeboard(), 2.4, 1.6, L + 3.4, 1.75, BACK + 0.12));

  const libTops = [];
  const libWood = [];
  const read = deskGeometries(R - 1.6, -7.7, 2.9, 1.1);
  libWood.push(...read.top);
  lowLegs.push(...read.legs);
  // Balda corrida a media altura sobre la mesa
  libWood.push(box(2.5, 0.035, 0.3, R - 1.75, 1.08, -7.7));
  for (const dx of [-1.15, 0, 1.15]) libWood.push(box(0.035, 0.32, 0.26, R - 1.75 + dx, 0.91, -7.7));
  for (const dx of [-0.75, 0.15]) {
    addLowChair(R - 1.6 + dx, -7.7 + 0.82, Math.PI);
    addLowChair(R - 1.6 + dx, -7.7 - 0.82, 0);
  }
  const pc = deskGeometries(R - 0.45, -5.0, 1.4, 0.7, Math.PI / 2);
  libTops.push(...pc.top);
  lowLegs.push(...pc.legs);
  group.add(mesh([
    box(0.05, 0.34, 0.5, R - 0.35, 1.0, -5.0),
    box(0.04, 0.2, 0.05, R - 0.33, 0.82, -5.0)
  ], seatBlack, false));
  addLowChair(R - 1.15, -5.0, -Math.PI / 2);
  // Atriles
  const stands = [];
  for (const [x, z, r] of [[R - 0.7, -9.75, -1.2], [R - 1.3, -10.1, -1.9]]) {
    stands.push(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 6).translate(x, 0.55, z));
    stands.push(new THREE.BoxGeometry(0.46, 0.32, 0.01).rotateX(-0.35).rotateY(r).translate(x, 1.18, z));
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      stands.push(new THREE.BoxGeometry(0.3, 0.012, 0.012).rotateZ(-0.5).rotateY(a).translate(x + Math.cos(a) * 0.12, 0.07, z - Math.sin(a) * 0.12));
    }
  }
  group.add(mesh(stands, seatBlack, false));
  // Mesita redonda de revistas entre las estanterías
  const side = roundTableGeometries(8.9, -10.9, 0.34);
  side.top.forEach((g) => g.translate(0, -0.22, 0));
  libWood.push(...side.top);
  lowLegs.push(...side.legs.map((g) => g.scale(0.6, 0.7, 0.6).translate(8.9 * 0.4, 0, -10.9 * 0.4)));
  group.add(mesh(libWood, beech));
  group.add(mesh(libTops, laminate));

  group.add(mesh(lowTops, laminate));
  group.add(mesh(lowLegs, tubular));
  group.add(mesh(lowSeats, seatBlue));
  group.add(mesh(lowBacks, seatBlack));
  group.add(mesh(lowFrames, tubular));

  // Lámparas industriales: cuerpo gris de aletas y campana de vidrio
  // prismático, colgadas de la cubierta con cable blanco a alturas distintas.
  const pendants = new THREE.Group();
  const cords = [];
  const housings = [];
  const fins = [];
  const bellProfile = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    bellProfile.push(new THREE.Vector2(0.09 + 0.2 * Math.pow(t, 0.7), -0.34 * t));
  }
  const bellGeo = new THREE.LatheGeometry(bellProfile, 28);
  let k = 0;
  for (let z = -1.8; z >= -11.2; z -= 2.4) {
    for (const x of [-0.4, 3.0, 6.4, 9.6]) {
      k++;
      if (x > CORE.x0 - 1 && x < CORE.x1 && z < CORE.z1) continue;
      const top = roofSoffitY(x, z) - 0.35;
      const y = 3.0 + ((k * 7) % 5) * 0.45; // alturas escalonadas
      cords.push(box(0.012, top - y, 0.012, x, (top + y) / 2, z));
      housings.push(new THREE.CylinderGeometry(0.12, 0.12, 0.28, 16).translate(x, y + 0.14, z));
      for (let f = 0; f < 8; f++) {
        const a = (f / 8) * Math.PI * 2;
        fins.push(new THREE.BoxGeometry(0.02, 0.24, 0.05).rotateY(-a).translate(x + Math.cos(a) * 0.13, y + 0.14, z + Math.sin(a) * 0.13));
      }
      const bell = new THREE.Mesh(bellGeo, pendantGlass);
      bell.position.set(x, y, z);
      pendants.add(bell);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), lampMat);
      bulb.position.set(x, y - 0.1, z);
      pendants.add(bulb);
    }
  }
  pendants.add(mesh(cords, new THREE.MeshStandardMaterial({ color: 0xf0f0ee, roughness: 0.6 }), false));
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x7d8387, metalness: 0.7, roughness: 0.4 });
  pendants.add(mesh(housings, housingMat, false));
  pendants.add(mesh(fins, housingMat, false));
  group.add(pendants);

  // Focos redondos empotrados en el techo bajo el altillo
  const downlights = [];
  for (let x = L + 1.5; x < VOID.x0 - 0.5; x += 2.4) {
    for (let z = -1.5; z > BACK + 1; z -= 2.6) {
      downlights.push(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16).translate(x, SLAB_Y - SLAB_T - 0.01, z));
    }
  }
  group.add(mesh(downlights, lampMat, false));

  group.add(mesh(skirting, skirtingMat, false));

  /* ---------------- Luz interior ---------------- */
  const lights = new THREE.Group();
  for (const [x, y, z, power] of [
    [4, 3.4, -2.5, 55],
    [-6, 3.2, -6.5, 55],
    [6, 3.2, -10, 50],
    [-7, 3.2, -14.5, 45],
    [3, 3.2, -18.5, 45],
    [-8, 3.2, -20, 40],
    [-6, SLAB_Y + 2.2, -11, 45],
    [1.5, SLAB_Y + 2.2, -12, 45],
    [7.5, SLAB_Y + 2.2, -10.5, 40],
    [-9, SLAB_Y + 2.2, -9.5, 35],
    [CORE.x1 - 1, SLAB_Y + 1.8, CORE.z1 + 1.5, 30]
  ]) {
    const light = new THREE.PointLight(0xfff4e4, power, 26, 2);
    light.position.set(x, y, z);
    lights.add(light);
  }
  const fill = new THREE.HemisphereLight(0xfff6ea, 0x8a8270, 0.6);
  fill.position.set(0, 5, -6);
  lights.add(fill);
  group.add(lights);

  return group;
}
