import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildTextures } from './textures.js';
import { roofSoffitY, ROOF, TOWER } from './building.js';
import {
  doorStrip, wallLettering, chalkboard, noticeboard, ROOM_COLORS,
  wallLines, followUs, logoPanel, banner, mural, blockLetterCells, europeBoard, becaLetters
} from './signage.js';

/**
 * Interior del CUC.
 *
 * Planta baja: vestíbulo a doble altura, mostrador y la sala de lectura de la
 * biblioteca — estanterías azules sobre carcasa de haya, lámparas colgantes de
 * campana sobre cable largo, el rótulo BIBLIOTECA en la pared y las columnas
 * redondas contra el muro cortina.
 *
 * Planta primera: el pasillo con la pizarra del centro y, a un lado, las salas
 * — tres salas de estudio (una de ellas de informática), la sala de trabajo en
 * grupo y la oficina —, cada una con su tira de señalética de color y los
 * poliedros de la marca en la jamba.
 *
 * El reparto de salas sigue siendo provisional: falta el croquis de planta.
 * Cambiar ROOMS es cambiar dónde va cada una.
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
 * Reparto de la planta primera, calcado del croquis: las salas se agrupan al
 * oeste y al norte, alrededor del vacío. `door` dice en qué paramento está la
 * puerta y a qué distancia del extremo, que es donde va la tira de señalética.
 */
const ROOMS = [
  {
    id: 'sala1',
    x0: -7.3, x1: -2.4, z0: -12.0, z1: FRONT,
    door: { side: 'east', at: -10.6 },
    glass: ['east'], // da al vacío: se ve desde la biblioteca
    mural: 'west',
    title: "sala §\nd'estudi", number: '1', color: ROOM_COLORS.estudi, icon: 'estudi',
    kind: 'study', carrels: true
  },
  {
    id: 'sala2',
    x0: L, x1: -7.3, z0: -13.1, z1: FRONT,
    door: { side: 'north', at: -8.4 },
    title: "sala §\nd'estudi", number: '2', color: ROOM_COLORS.estudi, icon: 'estudi',
    kind: 'study', carrels: true,
    dado: '#8d8b6e'
  },
  {
    id: 'sala3',
    x0: L, x1: -8.4, z0: BACK, z1: -13.1,
    door: { side: 'east', at: -15.4 },
    title: "sala §\nd'estudi", number: '3', color: ROOM_COLORS.informatica, icon: 'informatica',
    kind: 'tables'
  },
  {
    id: 'oficina',
    x0: -8.4, x1: -1.7, z0: BACK, z1: -18.0,
    door: { side: 'south', at: -5.2 },
    title: 'oficina', color: ROOM_COLORS.oficina, icon: 'oficina',
    kind: 'office'
  },
  {
    id: 'grupal',
    x0: -6.4, x1: -1.7, z0: -17.8, z1: -15.2,
    door: { side: 'south', at: -4.0 },
    title: 'treball\nen grup', color: ROOM_COLORS.grup, icon: 'grup',
    kind: 'group',
    stripe: '#e8c81e'
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

  // El forjado ocupa la banda oeste y el entorno del núcleo; el resto es vacío
  const slabs = [
    box(VOID.x0 - L, SLAB_T, FRONT - BACK, (L + VOID.x0) / 2, SLAB_Y - SLAB_T / 2, (BACK + FRONT) / 2),
    box(CORE.x1 + 1.2 - VOID.x0, SLAB_T, VOID.z0 - BACK, (VOID.x0 + CORE.x1 + 1.2) / 2, SLAB_Y - SLAB_T / 2, (BACK + VOID.z0) / 2)
  ];
  group.add(mesh(slabs, slabMat));

  const upperMat = terrazzo.clone();
  upperMat.map = tiled(t.terrazzo, VOID.x0 - L, FRONT - BACK, 1.2);
  const upperWest = new THREE.Mesh(new THREE.PlaneGeometry(VOID.x0 - L, FRONT - BACK), upperMat);
  upperWest.rotation.x = -Math.PI / 2;
  upperWest.position.set((L + VOID.x0) / 2, SLAB_Y + 0.02, (BACK + FRONT) / 2);
  upperWest.receiveShadow = true;
  group.add(upperWest);

  const upperNorth = new THREE.Mesh(
    new THREE.PlaneGeometry(CORE.x1 + 1.2 - VOID.x0, VOID.z0 - BACK),
    upperMat
  );
  upperNorth.rotation.x = -Math.PI / 2;
  upperNorth.position.set((VOID.x0 + CORE.x1 + 1.2) / 2, SLAB_Y + 0.02, (BACK + VOID.z0) / 2);
  upperNorth.receiveShadow = true;
  group.add(upperNorth);

  // Falso techo sobre la parte construida de la planta alta
  ceilingMat.map = tiled(t.ceiling, VOID.x0 - L, FRONT - BACK, 1.2);
  const droppedWest = new THREE.Mesh(new THREE.PlaneGeometry(VOID.x0 - L, FRONT - BACK), ceilingMat);
  droppedWest.rotation.x = Math.PI / 2;
  droppedWest.position.set((L + VOID.x0) / 2, CEIL_Y, (BACK + FRONT) / 2);
  group.add(droppedWest);
  const droppedNorth = new THREE.Mesh(
    new THREE.PlaneGeometry(CORE.x1 + 1.2 - VOID.x0, VOID.z0 - BACK),
    ceilingMat
  );
  droppedNorth.rotation.x = Math.PI / 2;
  droppedNorth.position.set((VOID.x0 + CORE.x1 + 1.2) / 2, CEIL_Y, (BACK + VOID.z0) / 2);
  group.add(droppedNorth);

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

  for (const room of ROOMS) {
    // Cada paramento de la sala, con el lado al que da
    const sides = {
      south: [room.x0, room.z1, room.x1, room.z1],
      north: [room.x0, room.z0, room.x1, room.z0],
      west: [room.x0, room.z0, room.x0, room.z1],
      east: [room.x1, room.z0, room.x1, room.z1]
    };

    for (const [name, [x0, z0, x1, z1]] of Object.entries(sides)) {
      const wallFn = room.glass?.includes(name) ? addScreen : addWall;
      // La fachada la levanta building.js; aquí solo la tabiquería interior
      if (name === 'south' && Math.abs(z1 - FRONT) < 0.2) continue;
      if (name === 'west' && Math.abs(x0 - L) < 0.2) continue;
      if (name === 'north' && Math.abs(z0 - BACK) < 0.2) continue;

      if (room.door.side === name) {
        // El muro se parte para dejar el hueco de la puerta
        const along = name === 'north' || name === 'south' ? 'x' : 'z';
        const at = room.door.at;
        if (along === 'x') {
          wallFn(x0, z0, at - DOOR_W / 2, z1);
          wallFn(at + DOOR_W / 2, z0, x1, z1);
          partitions.push(box(DOOR_W + 0.1, H - DOOR_H, 0.13, at, SLAB_Y + DOOR_H + (H - DOOR_H) / 2, z0));
        } else {
          wallFn(x0, z0, x1, at - DOOR_W / 2);
          wallFn(x0, at + DOOR_W / 2, x1, z1);
          partitions.push(box(0.13, H - DOOR_H, DOOR_W + 0.1, x0, SLAB_Y + DOOR_H + (H - DOOR_H) / 2, at));
        }
      } else {
        wallFn(x0, z0, x1, z1);
      }
    }

    // Mural de las ocas, visible desde la biblioteca a través de la mampara
    if (room.mural === 'west') {
      const m = panel(mural(), Math.min(room.z1 - room.z0 - 1, 6.4), 2.0, room.x0 + 0.09, SLAB_Y + 1.6, (room.z0 + room.z1) / 2);
      m.rotation.y = Math.PI / 2;
      group.add(m);
    }

    // Hoja de la puerta, su ventanuco y la tira de señalética en la jamba
    const horizontal = room.door.side === 'north' || room.door.side === 'south';
    const [dx, dz] = horizontal
      ? [room.door.at, room.door.side === 'north' ? room.z0 : room.z1]
      : [room.door.side === 'west' ? room.x0 : room.x1, room.door.at];
    // Hacia fuera de la sala
    const out = horizontal
      ? [0, room.door.side === 'north' ? -1 : 1]
      : [room.door.side === 'west' ? -1 : 1, 0];
    const rot = horizontal ? 0 : Math.PI / 2;

    const leaf = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W - 0.04, DOOR_H - 0.03, 0.045), doorMat);
    leaf.position.set(dx + out[0] * 0.02, SLAB_Y + (DOOR_H - 0.03) / 2, dz + out[1] * 0.02);
    leaf.rotation.y = rot;
    leaf.castShadow = true;
    const portFrame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.52, 0.06), doorMat);
    portFrame.position.set(dx + out[0] * 0.02, SLAB_Y + 1.62, dz + out[1] * 0.02);
    portFrame.rotation.y = rot;
    const port = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.42), glassPane);
    port.position.set(dx + out[0] * 0.05, SLAB_Y + 1.62, dz + out[1] * 0.05);
    port.rotation.y = rot;
    doors.add(leaf, portFrame, port);

    const strip = doorStrip({
      title: room.title,
      number: room.number ?? '',
      color: room.color,
      iconKind: room.icon,
      seed: room.id.length * 7 + Math.round(room.x0 * 3)
    });
    const sx = horizontal ? dx + DOOR_W / 2 + 0.16 : dx + out[0] * 0.075;
    const sz = horizontal ? dz + out[1] * 0.075 : dz + DOOR_W / 2 + 0.16;
    const stripPanel = panel(strip, 0.24, 1.9, sx, SLAB_Y + 1.15, sz);
    stripPanel.rotation.y = rot;
    strips.push(stripPanel);

    // Zócalo o franja de color, y rodapié
    const bandTargets = Object.values(sides);
    if (room.dado) {
      const geos = dados.get(room.dado) || [];
      for (const [x0, z0, x1, z1] of bandTargets) {
        const w = Math.abs(x1 - x0) || 0.02;
        const d = Math.abs(z1 - z0) || 0.02;
        geos.push(box(Math.max(w - 0.02, 0.02), 1.0, Math.max(d - 0.02, 0.02), (x0 + x1) / 2, SLAB_Y + 0.6, (z0 + z1) / 2));
      }
      dados.set(room.dado, geos);
    }
    if (room.stripe) {
      const geos = stripes.get(room.stripe) || [];
      for (const [x0, z0, x1, z1] of bandTargets) {
        const w = Math.abs(x1 - x0) || 0.03;
        const d = Math.abs(z1 - z0) || 0.03;
        geos.push(box(Math.max(w - 0.02, 0.03), 0.1, Math.max(d - 0.02, 0.03), (x0 + x1) / 2, SLAB_Y + 1.12, (z0 + z1) / 2));
      }
      stripes.set(room.stripe, geos);
    }
    for (const [x0, z0, x1, z1] of bandTargets) addSkirting(x0, z0, x1, z1, SLAB_Y + 0.02);
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

  // Pizarra del pasillo con el nombre del centro
  group.add(panel(chalkboard(), 3.0, 1.9, (CORE.x0 + CORE.x1) / 2, SLAB_Y + 1.45, CORE.z1 + 0.09, 0));

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
      const board = panel(wallLettering('', { width: 8, height: 8 }), 1.7, 1.0, cx, SLAB_Y + 1.55, BACK + 0.09, 0, {
        material: { color: 0x2f4a3a, map: null }
      });
      group.add(board);
      group.add(mesh([box(1.84, 1.14, 0.05, cx, SLAB_Y + 1.55, room.z0 + 0.06)], beech, false));
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
      if (x > VOID.x0 && z > VOID.z0) continue; // aquí está el vacío
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

  /* ---------------- Rincón de espera de la planta alta ---------------- */
  const sofa = new THREE.Group();
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0xc4534a, roughness: 0.95 });
  sofa.add(mesh([
    box(2.1, 0.42, 0.82, 0, 0.34, 0),
    box(2.1, 0.5, 0.2, 0, 0.68, -0.31),
    box(0.18, 0.34, 0.82, -0.96, 0.62, 0),
    box(0.18, 0.34, 0.82, 0.96, 0.62, 0)
  ], sofaMat));
  // En el rellano que queda entre la sala 3, la sala 2 y la de grupo
  sofa.position.set(-5.2, SLAB_Y, -14.6);
  sofa.rotation.y = 0;
  group.add(sofa);

  // Cubos-taburete pintados con la gráfica del centro
  const cubeColors = [0x9b1b30, 0x1f3f8f, 0x1a7a4f, 0xc9531c];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.44, 0.44),
      new THREE.MeshStandardMaterial({ color: cubeColors[i % cubeColors.length], roughness: 0.7 })
    );
    c.position.set(-2.4, SLAB_Y + 0.22 + i * 0.45, -13.7);
    c.rotation.y = rand() * 0.4;
    c.castShadow = true;
    group.add(c);
  }

  // «Calvià in Europe» en el paramento de la sala de grupo que da a la escalera
  const europe = panel(europeBoard(), 2.0, 1.95, -1.7 + 0.09, SLAB_Y + 1.55, -16.4, Math.PI / 2);
  group.add(europe);
  group.add(mesh([box(0.05, 2.07, 2.12, -1.7 + 0.06, SLAB_Y + 1.55, -16.4)], beech, false));
  // BECA, sobre el muro de la sala 1 que cierra el rellano
  const beca = panel(becaLetters(), 2.2, 1.1, -5.0, SLAB_Y + 1.9, -12.0 - 0.08, Math.PI, {
    transparent: true, material: { transparent: true }
  });
  group.add(beca);

  // Estrellas de papel colgadas
  for (const [x, z] of [[-4.0, -14.0], [L + 3.2, -18.0]]) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 1), new THREE.MeshStandardMaterial({
      color: 0xfbfaf6, roughness: 0.9, flatShading: true
    }));
    star.position.set(x, CEIL_Y - 0.55, z);
    star.scale.set(1, 1.25, 1);
    group.add(star);
  }

  /* ================================================================ */
  /* Planta baja: vestíbulo y biblioteca                               */
  /* ================================================================ */

  // Columnas de hormigón gris visto: de doble altura contra el muro cortina y
  // en el vacío, y más bajas sosteniendo el borde del altillo
  const concreteGrey = new THREE.MeshStandardMaterial({ color: 0xb9b8b2, roughness: 0.88 });
  const columns = [];
  for (const [x, z] of [[-1.0, -1.1], [2.6, -1.1], [6.2, -1.1], [9.8, -1.1], [4.2, -7.0]]) {
    const h = roofSoffitY(x, z) - 0.3;
    columns.push(new THREE.CylinderGeometry(0.24, 0.24, h, 20).translate(x, h / 2, z));
  }
  for (const z of [-3.2, -7.6, -11.6]) {
    columns.push(new THREE.CylinderGeometry(0.2, 0.2, SLAB_Y - SLAB_T, 18).translate(VOID.x0 - 0.35, (SLAB_Y - SLAB_T) / 2, z));
  }
  group.add(mesh(columns, concreteGrey));

  // Canto del altillo: la banda blanca que corre bajo las mamparas
  group.add(mesh([
    box(0.3, 0.85, FRONT - VOID.z0, VOID.x0 - 0.1, SLAB_Y - 0.25, (VOID.z0 + FRONT) / 2),
    box(CORE.x1 + 1.2 - VOID.x0, 0.85, 0.3, (VOID.x0 + CORE.x1 + 1.2) / 2, SLAB_Y - 0.25, VOID.z0 - 0.1)
  ], whiteConcrete));

  // Escalera de dos tramos en el hueco oeste del núcleo, junto al ascensor:
  // peldaño de terrazo con mamperlán de madera, como en las fotos
  const stairs = [];
  const nosings = [];
  const RISERS = 8;
  const rise = SLAB_Y / (RISERS * 2);
  const tread = 0.28;
  const zStart = CORE.z1 - 0.3;
  const flightA = CORE.x0 + 0.6; // sube hacia el norte
  const flightB = TOWER.x0 - 0.6; // baja hacia el sur hasta la planta alta
  for (let i = 0; i < RISERS; i++) {
    const y = rise * (i + 1);
    const z = zStart - tread * (i + 0.5);
    stairs.push(box(1.1, y, tread, flightA, y / 2, z));
    nosings.push(box(1.1, 0.05, 0.03, flightA, y - 0.02, z + tread / 2));
  }
  const landingZ = zStart - tread * RISERS - 0.75;
  stairs.push(box(TOWER.x0 - CORE.x0, 0.2, 1.5, (CORE.x0 + TOWER.x0) / 2, SLAB_Y / 2 - 0.1, landingZ));
  for (let i = 0; i < RISERS; i++) {
    const y = SLAB_Y / 2 + rise * (i + 1);
    const z = zStart - tread * (RISERS - i - 0.5);
    stairs.push(box(1.1, 0.24, tread, flightB, y - 0.12, z));
    nosings.push(box(1.1, 0.05, 0.03, flightB, y - 0.02, z - tread / 2));
  }
  const stairMat = terrazzo.clone();
  stairMat.map = tiled(t.terrazzo, 1, 1, 1.2);
  group.add(mesh(stairs, stairMat));
  group.add(mesh(nosings, skirtingMat, false));

  const rails = [];
  const addSteelRail = (x1, z1, x2, z2, y) => {
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
    // Cruces
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
    }
    // Disco en cada cruce, como en todas las barandillas del centro
    for (let i = 0; i < posts; i++) {
      const mid = -len / 2 + (len / posts) * (i + 0.5);
      local.push(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12).rotateX(Math.PI / 2).translate(mid, 0.54, 0));
    }
    place(local, cx, cz, -ang, y);
    rails.push(...local);
  };
  addSteelRail(VOID.x0 + 0.05, VOID.z0 + 0.05, CORE.x1 + 1.1, VOID.z0 + 0.05, SLAB_Y);
  // Ojo de la escalera: barandilla entre los dos tramos y alrededor en la planta alta
  addSteelRail((flightA + flightB) / 2, zStart, (flightA + flightB) / 2, landingZ + 0.75, SLAB_Y / 2 - 0.3);
  addSteelRail(CORE.x0 + 0.05, landingZ - 0.75, TOWER.x0 - 0.05, landingZ - 0.75, SLAB_Y);
  group.add(mesh(rails, steel));

  // Antepecho blanco de la balconada sobre el vestíbulo
  group.add(mesh([box(CORE.x1 + 1.1 - VOID.x0, 0.55, 0.3, (VOID.x0 + CORE.x1 + 1.1) / 2, SLAB_Y + 0.28, VOID.z0 + 0.18)], whiteConcrete));

  // #CUCALVIÀ en letras de bulto sobre el antepecho
  const word = blockLetterCells('#CUCALVIÀ', { px: 15 });
  const pix = 0.052;
  const letters = word.cells.map(([cx, cy]) =>
    box(pix, pix, 0.24, CORE.x1 + 1.0 - word.width * pix + cx * pix, SLAB_Y + 0.55 + cy * pix, VOID.z0 + 0.18)
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

  // Banderolas verticales en el muro este de la doble altura
  for (const [i, words, color, drip] of [
    [0, ['SUPORT', 'FUTUR', 'ESPAIS'], '#9bb93a', '#c3db5e'],
    [1, ['LECTURA', 'AUDIOVISUAL'], '#d9b52a', '#f0d466'],
    [2, ['ESTUDI', 'ESPAIS'], '#9bb93a', '#c3db5e']
  ]) {
    const b = panel(banner(words, { color, drip }), 1.3, 5.0, R - 0.05, 4.4, -3.2 - i * 2.4, -Math.PI / 2);
    group.add(b);
  }

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
  for (let z = -2.6; z >= -10.5; z -= 3.2) addUnit(R - 0.4, z, 3.0, -Math.PI / 2, false);

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
  group.add(mesh(lowTops, laminate));
  group.add(mesh(lowLegs, tubular));
  group.add(mesh(lowSeats, seatBlue));
  group.add(mesh(lowBacks, seatBlack));
  group.add(mesh(lowFrames, tubular));

  // Rótulo BIBLIOTECA y panel de anuncios en el muro del fondo
  const biblioteca = panel(wallLettering('BIBLIOTECA'), 5.4, 1.35, L + 4.6, 3.1, BACK + 0.12, 0, {
    transparent: true,
    material: { transparent: true, roughness: 0.95 }
  });
  group.add(biblioteca);
  group.add(panel(noticeboard(), 2.4, 1.6, L + 3.4, 1.75, BACK + 0.12));

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
