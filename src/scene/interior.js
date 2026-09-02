import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildTextures } from './textures.js';
import { roofSoffitY, ROOF } from './building.js';
import { doorStrip, wallLettering, chalkboard, noticeboard, ROOM_COLORS } from './signage.js';

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

const L = -12 + 0.32; // cara interior del muro izquierdo
const R = 12 - 0.32;
const BACK = -15 + 0.32;
const FRONT = -0.06;
const SLAB_Y = 4.2; // cara superior del forjado
const SLAB_T = 0.34;
const VOID_Z = -6.4; // el vestíbulo es de doble altura desde aquí a la fachada
const CORRIDOR_Z = -8.0; // cara del pasillo donde dan las puertas
const CEIL_Y = SLAB_Y + 2.72;
const DOOR_W = 0.95;
const DOOR_H = 2.1;

/** Reparto provisional de la planta primera (z de BACK a CORRIDOR_Z). */
const ROOMS = [
  {
    id: 'sala1',
    x0: L, x1: -4.6,
    title: "sala §\nd'estudi", number: '1', color: ROOM_COLORS.estudi, icon: 'estudi',
    kind: 'study', carrels: true,
    dado: '#8d8b6e'
  },
  {
    id: 'sala2',
    x0: -4.6, x1: 0.6,
    title: "sala §\nd'estudi", number: '2', color: ROOM_COLORS.estudi, icon: 'estudi',
    kind: 'tables',
    stripe: '#e8c81e' // la franja amarilla de la sala del mural
  },
  {
    id: 'sala3',
    x0: 0.6, x1: 5.2,
    title: "sala §\nd'estudi", number: '3', color: ROOM_COLORS.informatica, icon: 'informatica',
    kind: 'study', carrels: true
  },
  {
    id: 'grup',
    x0: 5.2, x1: 8.4,
    title: 'treball\nen grup', color: ROOM_COLORS.grup, icon: 'grup',
    kind: 'group'
  },
  {
    id: 'oficina',
    x0: 8.4, x1: R,
    title: 'oficina', color: ROOM_COLORS.oficina, icon: 'oficina',
    kind: 'office'
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

  wood.push(box(len, 0.06, depth, 0, 0.08, 0)); // base
  const shelves = tall ? 4 : 2;
  for (let i = 1; i <= shelves; i++) wood.push(box(len - 0.1, 0.035, depth - 0.06, 0, (h / (shelves + 1)) * i, 0));
  wood.push(box(len, h, 0.03, 0, h / 2, -depth / 2 + 0.02)); // trasera

  blue.push(box(len + 0.06, 0.07, depth + 0.06, 0, h + 0.03, 0)); // tapa azul
  for (const sx of [-1, 1]) blue.push(box(0.06, h, depth, sx * (len / 2), h / 2, 0)); // costados

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
  const glassPane = new THREE.MeshPhysicalMaterial({
    color: 0xd6e4e8, transparent: true, opacity: 0.18, roughness: 0.04,
    envMapIntensity: 1, side: THREE.DoubleSide
  });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfffdf6, emissive: 0xfff6e6, emissiveIntensity: 1.5, roughness: 0.4
  });
  const pendantGlass = new THREE.MeshPhysicalMaterial({
    color: 0xf6f9fa, transparent: true, opacity: 0.3, roughness: 0.18,
    emissive: 0xfff0d6, emissiveIntensity: 0.9, side: THREE.DoubleSide, envMapIntensity: 1
  });

  /* ---------------- Solados, forjado y techos ---------------- */
  const groundMat = terrazzo.clone();
  groundMat.map = tiled(t.terrazzo, R - L, FRONT - BACK, 1.2);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(R - L, FRONT - BACK), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((L + R) / 2, 0.02, (BACK + FRONT) / 2);
  ground.receiveShadow = true;
  group.add(ground);

  const slabs = [
    box(R - L, SLAB_T, VOID_Z - BACK, (L + R) / 2, SLAB_Y - SLAB_T / 2, (BACK + VOID_Z) / 2),
    box(R - L, SLAB_T, 1.7, (L + R) / 2, SLAB_Y - SLAB_T / 2, VOID_Z + 2.6),
    box(2.8, SLAB_T, 3.2, L + 1.4, SLAB_Y - SLAB_T / 2, VOID_Z + 1.6)
  ];
  group.add(mesh(slabs, slabMat));

  const upperMat = terrazzo.clone();
  upperMat.map = tiled(t.terrazzo, R - L, VOID_Z - BACK, 1.2);
  const upperFloor = new THREE.Mesh(new THREE.PlaneGeometry(R - L, VOID_Z - BACK), upperMat);
  upperFloor.rotation.x = -Math.PI / 2;
  upperFloor.position.set((L + R) / 2, SLAB_Y + 0.02, (BACK + VOID_Z) / 2);
  upperFloor.receiveShadow = true;
  group.add(upperFloor);

  ceilingMat.map = tiled(t.ceiling, R - L, VOID_Z - BACK, 1.2);
  const dropped = new THREE.Mesh(new THREE.PlaneGeometry(R - L, VOID_Z - BACK), ceilingMat);
  dropped.rotation.x = Math.PI / 2;
  dropped.position.set((L + R) / 2, CEIL_Y, (BACK + VOID_Z) / 2);
  group.add(dropped);

  // Sobre el vestíbulo la cubierta queda vista
  const ceilGeo = new THREE.PlaneGeometry(R - L, VOID_Z - FRONT + 2.6, 1, 1);
  ceilGeo.rotateX(Math.PI / 2);
  ceilGeo.applyMatrix4(
    new THREE.Matrix4().set(1, 0, 0, 0, ROOF.slopeX, 1, ROOF.slopeZ, 0, 0, 0, 1, 0, 0, 0, 0, 1)
  );
  ceilGeo.computeVertexNormals();
  const voidCeiling = new THREE.Mesh(ceilGeo, wallMat);
  const vx = (L + R) / 2;
  const vz = (VOID_Z + FRONT) / 2 - 0.3;
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
    addSkirting(L, BACK, R, BACK, y);
    addSkirting(L, BACK, L, y === 0.02 ? FRONT : VOID_Z, y);
    addSkirting(R, BACK, R, y === 0.02 ? FRONT : VOID_Z, y);
  }

  /* ================================================================ */
  /* Planta primera                                                    */
  /* ================================================================ */

  const partitions = [];
  const dados = new Map();
  const stripes = new Map();
  const H = CEIL_Y - SLAB_Y + 0.2;

  const addWall = (x0, z0, x1, z1, thickness = 0.13) => {
    const w = Math.abs(x1 - x0) || thickness;
    const d = Math.abs(z1 - z0) || thickness;
    partitions.push(box(w, H, d, (x0 + x1) / 2, SLAB_Y + H / 2, (z0 + z1) / 2));
  };

  const doors = new THREE.Group();
  const strips = [];

  for (const room of ROOMS) {
    const cx = (room.x0 + room.x1) / 2;
    const doorX = cx;

    // Tabique entre salas
    addWall(room.x1, BACK, room.x1, CORRIDOR_Z);

    // Muro del pasillo, con el hueco de la puerta
    const leftSpan = doorX - DOOR_W / 2 - room.x0;
    const rightSpan = room.x1 - (doorX + DOOR_W / 2);
    if (leftSpan > 0.02) addWall(room.x0, CORRIDOR_Z, room.x0 + leftSpan, CORRIDOR_Z);
    if (rightSpan > 0.02) addWall(room.x1 - rightSpan, CORRIDOR_Z, room.x1, CORRIDOR_Z);
    // Dintel sobre la puerta
    partitions.push(box(DOOR_W + 0.1, H - DOOR_H, 0.13, doorX, SLAB_Y + DOOR_H + (H - DOOR_H) / 2, CORRIDOR_Z));

    // Hoja de la puerta con su ventanuco
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W - 0.04, DOOR_H - 0.03, 0.045), doorMat);
    leaf.position.set(doorX, SLAB_Y + (DOOR_H - 0.03) / 2, CORRIDOR_Z + 0.02);
    leaf.castShadow = true;
    const port = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.42), glassPane);
    port.position.set(doorX, SLAB_Y + 1.62, CORRIDOR_Z + 0.05);
    const portFrame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.52, 0.06), doorMat);
    portFrame.position.set(doorX, SLAB_Y + 1.62, CORRIDOR_Z + 0.02);
    doors.add(leaf, portFrame, port);

    // Tira de señalética en la jamba, en el lado del pasillo
    const strip = doorStrip({
      title: room.title,
      number: room.number ?? '',
      color: room.color,
      iconKind: room.icon,
      seed: room.id.length * 7 + room.x0
    });
    strips.push(
      panel(strip, 0.24, 1.9, doorX + DOOR_W / 2 + 0.16, SLAB_Y + 1.15, CORRIDOR_Z + 0.075)
    );

    // Zócalo o franja de color de la sala
    const bandTargets = [
      [room.x0, BACK, room.x1, BACK],
      [room.x0, CORRIDOR_Z, room.x1, CORRIDOR_Z],
      [room.x0, BACK, room.x0, CORRIDOR_Z],
      [room.x1, BACK, room.x1, CORRIDOR_Z]
    ];
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

    // Rodapié perimetral de la sala
    for (const [x0, z0, x1, z1] of bandTargets) addSkirting(x0, z0, x1, z1, SLAB_Y + 0.02);
  }

  // Muro del pasillo que da al vestíbulo
  addWall(L, VOID_Z, R, VOID_Z, 0.16);
  group.add(mesh(partitions, wallMat));
  group.add(doors);
  strips.forEach((s) => group.add(s));
  for (const [color, geos] of dados) group.add(mesh(geos, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }), false));
  for (const [color, geos] of stripes) group.add(mesh(geos, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }), false));

  // Pizarra del pasillo con el nombre del centro
  group.add(panel(chalkboard(), 3.2, 2.0, (L + 2.4), SLAB_Y + 1.45, VOID_Z - 0.09, Math.PI));

  /* ---------------- Mobiliario de las salas ---------------- */
  const allTops = [];
  const allLegs = [];
  const allSeats = [];
  const allBacks = [];
  const allFrames = [];

  for (const room of ROOMS) {
    const cx = (room.x0 + room.x1) / 2;
    const cz = (BACK + CORRIDOR_Z) / 2;
    const width = room.x1 - room.x0;
    const depth = CORRIDOR_Z - BACK;

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
        const z = BACK + 2.2 + r * 3.0;
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
          const c = carrelGeometries(x, BACK + 0.62, 0);
          tops.push(...c.top);
          legs.push(...c.legs);
          addChair(x, BACK + 1.42, Math.PI);
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
        const c = carrelGeometries(x, CORRIDOR_Z - 0.75, Math.PI);
        tops.push(...c.top);
        legs.push(...c.legs);
        addChair(x, CORRIDOR_Z - 1.55, 0);
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
      group.add(mesh([box(1.84, 1.14, 0.05, cx, SLAB_Y + 1.55, BACK + 0.06)], beech, false));
    }

    if (room.kind === 'office') {
      const d = deskGeometries(cx, cz + 0.6, Math.min(width - 1.2, 1.9), 0.8);
      tops.push(...d.top);
      legs.push(...d.legs);
      addChair(cx, cz - 0.15, 0);
      group.add(mesh([box(Math.min(width - 1.0, 1.8), 1.1, 0.42, cx, SLAB_Y + 0.55, BACK + 0.32)], beech));
      // Pizarra blanca
      group.add(
        panel(wallLettering('', { width: 8, height: 8 }), 1.8, 1.1, cx, SLAB_Y + 1.6, BACK + 0.09, 0, {
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
  for (let x = L + 1.9; x < R - 1; x += 3.4) {
    for (let z = BACK + 1.9; z < VOID_Z - 0.6; z += 3.0) {
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
  sofa.position.set(R - 1.6, SLAB_Y, VOID_Z - 1.4);
  sofa.rotation.y = -Math.PI / 2;
  group.add(sofa);

  // Cubos-taburete pintados con la gráfica del centro
  const cubeColors = [0x9b1b30, 0x1f3f8f, 0x1a7a4f, 0xc9531c];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.44, 0.44),
      new THREE.MeshStandardMaterial({ color: cubeColors[i % cubeColors.length], roughness: 0.7 })
    );
    c.position.set(R - 3.1, SLAB_Y + 0.22 + i * 0.45, VOID_Z - 0.75);
    c.rotation.y = rand() * 0.4;
    c.castShadow = true;
    group.add(c);
  }

  // Estrellas de papel colgadas
  for (const [x, z] of [[R - 2.2, VOID_Z - 2.6], [L + 3.2, VOID_Z - 1.2]]) {
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

  // Columnas redondas contra el muro cortina
  const columns = [];
  for (const x of [-8.4, -2.6, 3.2, 9.0]) {
    const h = roofSoffitY(x, -1.1) - 0.3;
    const col = new THREE.CylinderGeometry(0.24, 0.24, h, 20);
    col.translate(x, h / 2, -1.1);
    columns.push(col);
  }
  group.add(mesh(columns, whiteConcrete));

  // Escalera y barandilla de acero con cruces de San Andrés
  const stairs = [];
  const steps = 16;
  for (let i = 0; i < steps; i++) stairs.push(box(1.9, 0.26, 0.3, L + 2.2, 0.13 + i * 0.26, -3.2 - i * 0.3));
  stairs.push(box(2.3, 0.2, 1.8, L + 2.2, SLAB_Y - 0.1, -3.2 - steps * 0.3 - 0.9));
  group.add(mesh(stairs, whiteConcrete));

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
    place(local, cx, cz, -ang, y);
    rails.push(...local);
  };
  addSteelRail(L + 0.2, VOID_Z + 0.1, R - 0.2, VOID_Z + 0.1, SLAB_Y);
  addSteelRail(L + 3.6, -3.4, L + 3.6, -7.6, SLAB_Y);
  group.add(mesh(rails, steel));

  // Antepecho blanco de la balconada sobre el vestíbulo
  group.add(mesh([box(R - L, 0.55, 0.3, (L + R) / 2, SLAB_Y + 0.28, VOID_Z + 2.6 - 0.9)], whiteConcrete));

  // Letras CALVIÀ sobre el antepecho
  const letterMat = whiteConcrete;
  const letters = [];
  const letterAt = (cx) => cx;
  let lx = 3.0;
  for (const ch of ['C', 'A', 'L', 'V', 'I', 'À']) {
    const w = ch === 'I' ? 0.16 : 0.42;
    letters.push(box(w, 0.5, 0.22, letterAt(lx), SLAB_Y + 0.82, VOID_Z + 1.75));
    if (ch !== 'I') {
      letters.push(box(w * 0.55, 0.16, 0.22, letterAt(lx) + w * 0.3, SLAB_Y + 0.82, VOID_Z + 1.75));
    }
    lx += w + 0.16;
  }
  group.add(mesh(letters, letterMat));

  // Mostrador curvo de recepción
  const desk = new THREE.Group();
  const counter = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 1.05, 28, 1, true, Math.PI * 0.15, Math.PI * 0.95), beech);
  counter.position.set(8.6, 0.525, -3.0);
  counter.castShadow = true;
  const counterTop = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 1.92, 0.07, 28, 1, false, Math.PI * 0.15, Math.PI * 0.95), beech);
  counterTop.position.set(8.6, 1.08, -3.0);
  desk.add(counter, counterTop);
  group.add(desk);

  /* ---------------- Biblioteca ---------------- */
  const shelfWood = [];
  const shelfSides = [];
  const bookBuckets = [[], [], [], [], [], []];

  // Módulos altos en batería, perpendiculares al vidrio
  for (let z = -4.4; z >= -10.6; z -= 2.1) {
    for (const x of [-7.6, -3.0, 1.6]) {
      const unit = shelfUnit(x, z, 3.0, 0, { tall: true });
      shelfWood.push(...unit.wood);
      shelfSides.push(...unit.blue);
      fillShelf(unit, x, z, 0, rand, bookBuckets);
    }
  }
  // Módulos bajos junto al vidrio y contra el muro
  for (let x = -9.4; x <= 4; x += 3.2) {
    const unit = shelfUnit(x, -2.5, 3.0, 0, { tall: false });
    shelfWood.push(...unit.wood);
    shelfSides.push(...unit.blue);
    fillShelf(unit, x, -2.5, 0, rand, bookBuckets);
  }
  for (let z = -5.0; z >= -12; z -= 3.2) {
    const unit = shelfUnit(L + 0.4, z, 3.0, -Math.PI / 2, { tall: false });
    shelfWood.push(...unit.wood);
    shelfSides.push(...unit.blue);
    fillShelf(unit, L + 0.4, z, -Math.PI / 2, rand, bookBuckets);
  }

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
  for (const [x, z] of [[L + 2.6, -12.6], [L + 2.6, -9.4]]) {
    const d = deskGeometries(x, z, 2.6, 1.1);
    lowTops.push(...d.top);
    lowLegs.push(...d.legs);
    for (const sx of [-1, 1]) {
      addLowChair(x + sx * 0.7, z + 0.85, Math.PI);
      addLowChair(x + sx * 0.7, z - 0.85, 0);
    }
  }
  // Puesto de consulta con ordenador
  lowTops.push(box(1.5, 0.04, 0.75, L + 5.6, 0.735, BACK + 0.9));
  group.add(mesh([box(0.5, 0.34, 0.05, L + 5.6, 1.1, BACK + 0.62)], seatBlack, false));
  group.add(mesh(lowTops, laminate));
  group.add(mesh(lowLegs, tubular));
  group.add(mesh(lowSeats, seatBlue));
  group.add(mesh(lowBacks, seatBlack));
  group.add(mesh(lowFrames, tubular));

  // Rótulo BIBLIOTECA y panel de anuncios en el muro del fondo
  const biblioteca = panel(wallLettering('BIBLIOTECA'), 5.4, 1.35, L + 4.2, 3.1, BACK + 0.1, 0, {
    transparent: true,
    material: { transparent: true, roughness: 0.95 }
  });
  group.add(biblioteca);
  group.add(panel(noticeboard(), 2.4, 1.6, L + 3.2, 1.75, BACK + 0.1));

  // Lámparas colgantes de campana. En la parte de doble altura cuelgan de la
  // cubierta con cable largo; bajo la balconada, del propio forjado.
  const pendants = new THREE.Group();
  const cords = [];
  const bodies = [];
  for (let z = -1.6; z >= -12.6; z -= 2.6) {
    for (const x of [-8.6, -4.2, 0.2, 4.6]) {
      const underSlab = z < VOID_Z;
      const top = underSlab ? SLAB_Y - SLAB_T - 0.02 : roofSoffitY(x, z) - 0.35;
      const y = underSlab ? 2.95 : 3.2;
      cords.push(box(0.016, top - y, 0.016, x, (top + y) / 2, z));
      bodies.push(box(0.22, 0.26, 0.22, x, y + 0.13, z));
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 22, 1, true), pendantGlass);
      shade.position.set(x, y - 0.12, z);
      shade.rotation.x = Math.PI;
      pendants.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), lampMat);
      bulb.position.set(x, y - 0.02, z);
      pendants.add(bulb);
    }
  }
  pendants.add(mesh(cords, tubular, false));
  pendants.add(mesh(bodies, new THREE.MeshStandardMaterial({ color: 0x8d9497, metalness: 0.6, roughness: 0.45 })));
  group.add(pendants);

  group.add(mesh(skirting, skirtingMat, false));

  /* ---------------- Luz interior ---------------- */
  const lights = new THREE.Group();
  for (const [x, y, z, power] of [
    [4, 3.4, -2.5, 55],
    [-6, 3.2, -6.5, 55],
    [6, 3.2, -10, 50],
    [-7, 3.2, -12.5, 45],
    [-6, SLAB_Y + 2.2, -11, 45],
    [1.5, SLAB_Y + 2.2, -12, 45],
    [7.5, SLAB_Y + 2.2, -10.5, 40],
    [-9, SLAB_Y + 2.2, -9.5, 35],
    [8, SLAB_Y + 1.8, VOID_Z - 1.5, 30]
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
