import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildTextures } from './textures.js';
import { roofSoffitY, ROOF } from './building.js';

/**
 * Interior del CUC.
 *
 * Planta baja: vestíbulo a doble altura y sala de lectura de la biblioteca.
 * Planta primera: las salas de estudio y un despacho.
 *
 * Los acabados y el mobiliario de la planta alta salen de las fotografías del
 * centro: suelo de terrazo pulido, falso techo registrable de 60 × 60 con
 * luminarias empotradas, mesas corridas de laminado crema con patas tubulares
 * grises, sillas azules y negras, puestos individuales con faldón, zócalo de
 * color (azul en una sala, verde oliva en otra) y una sala pequeña de grupo con
 * mesa redonda y pizarra.
 *
 * El reparto exacto de las salas es todavía provisional: falta el croquis de
 * planta. Cada sala se monta desde ROOMS, así que moverlas es cambiar números.
 */

const L = -12 + 0.32; // cara interior del muro izquierdo
const R = 12 - 0.32;
const BACK = -15 + 0.32;
const FRONT = -0.06;
const SLAB_Y = 4.2; // cara superior del forjado
const SLAB_T = 0.34;
const VOID_Z = -4.2; // el vestíbulo es de doble altura de VOID_Z a la fachada
const CEIL_Y = SLAB_Y + 2.72; // falso techo de la planta alta
const DADO = 1.05; // altura del zócalo de color

/** Reparto provisional de la planta primera. */
const ROOMS = [
  {
    id: 'estudio-grande',
    x0: L, x1: -2.4, z0: BACK, z1: -7.6,
    dado: 0x8d8b6e, // zócalo verde oliva
    kind: 'study',
    carrels: true
  },
  {
    id: 'sala-azul',
    x0: -2.4, x1: 5.2, z0: BACK, z1: -9.4,
    dado: 0x1f66b8, // zócalo azul
    kind: 'study'
  },
  {
    id: 'grupo',
    x0: 5.2, x1: 9.0, z0: BACK, z1: -11.4,
    kind: 'group' // mesa redonda y pizarra
  },
  {
    id: 'despacho',
    x0: 9.0, x1: R, z0: BACK, z1: -11.4,
    kind: 'office'
  },
  {
    id: 'estudio-vidrio',
    x0: 1.6, x1: R, z0: -8.4, z1: VOID_Z,
    kind: 'study' // la sala que da al muro cortina
  }
];

function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function mesh(geos, material, shadows = true) {
  const m = new THREE.Mesh(mergeGeometries(geos), material);
  m.castShadow = shadows;
  m.receiveShadow = true;
  return m;
}

/** Copia una textura con la repetición que corresponde a un plano de w × d metros. */
function tiled(texture, w, d, tile) {
  const t = texture.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(w / tile, d / tile);
  t.needsUpdate = true;
  return t;
}

function place(geos, x, z, rot, y = 0) {
  const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z);
  geos.forEach((g) => g.applyMatrix4(m));
  return geos;
}

/* ------------------------------------------------------------------ */
/* Mobiliario                                                          */
/* ------------------------------------------------------------------ */

/** Mesa corrida de laminado con patas tubulares (planta alta). */
function deskGeometries(x, z, w, d, rot = 0, h = 0.735) {
  const top = [box(w, 0.032, d, 0, h, 0)];
  const legs = [];
  for (const sx of [-1, 1]) {
    const px = sx * (w / 2 - 0.28);
    legs.push(box(0.045, h - 0.05, 0.045, px, (h - 0.05) / 2, -d / 2 + 0.12));
    legs.push(box(0.045, h - 0.05, 0.045, px, (h - 0.05) / 2, d / 2 - 0.12));
    legs.push(box(0.05, 0.05, d - 0.2, px, h - 0.06, 0)); // travesaño
  }
  place(top, x, z, rot);
  place(legs, x, z, rot);
  return { top, legs };
}

/** Puesto individual: mesa con faldón frontal, como los de la sala grande. */
function carrelGeometries(x, z, rot) {
  const { top, legs } = deskGeometries(0, 0, 1.25, 0.72, 0);
  const panel = [box(1.25, 0.5, 0.035, 0, 0.98, -0.34)];
  place(top, x, z, rot);
  place(legs, x, z, rot);
  place(panel, x, z, rot);
  return { top: [...top, ...panel], legs };
}

/** Silla de confidente: asiento azul, respaldo negro y estructura tubular. */
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

/** Mesa redonda de la sala de grupo. */
function roundTableGeometries(x, z) {
  const top = new THREE.CylinderGeometry(0.62, 0.62, 0.035, 24);
  top.translate(x, 0.735, z);
  const stem = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 10);
  stem.translate(x, 0.36, z);
  const foot = new THREE.CylinderGeometry(0.34, 0.36, 0.04, 20);
  foot.translate(x, 0.02, z);
  return { top: [top], legs: [stem, foot] };
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
    map: t.terrazzo,
    color: 0xffffff,
    roughness: 0.28,
    metalness: 0.04,
    envMapIntensity: 0.5
  });
  const ceilingMat = new THREE.MeshStandardMaterial({ map: t.ceiling, color: 0xffffff, roughness: 0.94 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3f2ee, roughness: 0.95 });
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xe9e7e0, roughness: 0.92 });
  const laminate = new THREE.MeshStandardMaterial({ color: 0xe9e1c8, roughness: 0.42, envMapIntensity: 0.35 });
  const tubular = new THREE.MeshStandardMaterial({ color: 0x9ba1a5, metalness: 0.75, roughness: 0.38, envMapIntensity: 0.7 });
  const seatBlue = new THREE.MeshStandardMaterial({ color: 0x2a4f9e, roughness: 0.92 });
  const seatBlack = new THREE.MeshStandardMaterial({ color: 0x26282b, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ map: t.wood, color: 0xd9bd95, roughness: 0.7 });
  const darkWood = new THREE.MeshStandardMaterial({ map: t.wood, color: 0x9a7c56, roughness: 0.75 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8f979b, metalness: 0.85, roughness: 0.35 });
  const glassRail = new THREE.MeshPhysicalMaterial({
    color: 0xbcd6dd, transparent: true, opacity: 0.22, roughness: 0.05, envMapIntensity: 1, side: THREE.DoubleSide
  });
  const partitionGlass = new THREE.MeshPhysicalMaterial({
    color: 0xd6e4e8, transparent: true, opacity: 0.16, roughness: 0.04, envMapIntensity: 1, side: THREE.DoubleSide
  });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfffdf6, emissive: 0xfff6e6, emissiveIntensity: 1.5, roughness: 0.4
  });

  /* ---------------- Planta baja: solado y forjado ---------------- */
  const groundMat = terrazzo.clone();
  groundMat.map = tiled(t.terrazzo, R - L, FRONT - BACK, 1.2);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(R - L, FRONT - BACK), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((L + R) / 2, 0.02, (BACK + FRONT) / 2);
  ground.receiveShadow = true;
  group.add(ground);

  const slabs = [
    box(R - L, SLAB_T, VOID_Z - BACK, (L + R) / 2, SLAB_Y - SLAB_T / 2, (BACK + VOID_Z) / 2),
    box(R - L, SLAB_T, 1.6, (L + R) / 2, SLAB_Y - SLAB_T / 2, VOID_Z + 0.8),
    box(2.6, SLAB_T, 4.2, L + 1.3, SLAB_Y - SLAB_T / 2, VOID_Z + 2.9)
  ];
  group.add(mesh(slabs, slabMat));

  const upperMat = terrazzo.clone();
  upperMat.map = tiled(t.terrazzo, R - L, VOID_Z - BACK + 2.4, 1.2);
  const upperFloor = new THREE.Mesh(new THREE.PlaneGeometry(R - L, VOID_Z - BACK + 2.4), upperMat);
  upperFloor.rotation.x = -Math.PI / 2;
  upperFloor.position.set((L + R) / 2, SLAB_Y + 0.02, (BACK + VOID_Z) / 2 + 1.2);
  upperFloor.receiveShadow = true;
  group.add(upperFloor);

  /* ---------------- Techos ---------------- */
  // Falso techo registrable sobre la planta alta
  ceilingMat.map = tiled(t.ceiling, R - L, VOID_Z - BACK + 2.4, 1.2);
  const dropped = new THREE.Mesh(new THREE.PlaneGeometry(R - L, VOID_Z - BACK + 2.4), ceilingMat);
  dropped.rotation.x = Math.PI / 2;
  dropped.position.set((L + R) / 2, CEIL_Y, (BACK + VOID_Z) / 2 + 1.2);
  group.add(dropped);

  // Sobre el vestíbulo la cubierta queda vista: plano inclinado como el exterior
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

  /* ---------------- Planta primera: tabiquería ---------------- */
  const partitions = [];
  const dados = new Map(); // color → geometrías
  const H = CEIL_Y - SLAB_Y + 0.2;

  const addWall = (x0, z0, x1, z1, thickness = 0.13) => {
    const w = Math.abs(x1 - x0) || thickness;
    const d = Math.abs(z1 - z0) || thickness;
    partitions.push(box(w, H, d, (x0 + x1) / 2, SLAB_Y + H / 2, (z0 + z1) / 2));
  };

  for (const room of ROOMS) {
    // Tabiques: se omite el lado que da a fachada o al vestíbulo
    if (room.z1 !== VOID_Z) addWall(room.x0, room.z1, room.x1, room.z1);
    addWall(room.x1, room.z0, room.x1, room.z1);
    if (room.dado) {
      const geos = dados.get(room.dado) || [];
      const inset = 0.005;
      for (const [x0, z0, x1, z1] of [
        [room.x0, room.z0, room.x1, room.z0],
        [room.x0, room.z1, room.x1, room.z1],
        [room.x0, room.z0, room.x0, room.z1],
        [room.x1, room.z0, room.x1, room.z1]
      ]) {
        const w = Math.abs(x1 - x0) || inset;
        const d = Math.abs(z1 - z0) || inset;
        geos.push(box(w - 0.02, DADO, d - 0.02, (x0 + x1) / 2, SLAB_Y + DADO / 2, (z0 + z1) / 2));
      }
      dados.set(room.dado, geos);
    }
  }
  group.add(mesh(partitions, wallMat));
  for (const [color, geos] of dados) {
    group.add(mesh(geos, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }), false));
  }

  // Mampara acristalada de la sala que da al vestíbulo
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(R - 1.6, 2.4), partitionGlass);
  screen.position.set((1.6 + R) / 2, SLAB_Y + 1.35, -8.4);
  group.add(screen);
  const screenFrame = [];
  for (let x = 1.6; x <= R + 0.01; x += 1.6) screenFrame.push(box(0.07, 2.5, 0.09, x, SLAB_Y + 1.35, -8.4));
  screenFrame.push(box(R - 1.6, 0.08, 0.1, (1.6 + R) / 2, SLAB_Y + 2.58, -8.4));
  group.add(mesh(screenFrame, seatBlack, false));

  /* ---------------- Planta primera: mobiliario ---------------- */
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

    // Cada sala se amuebla en local y al final sube al forjado
    const roomTops = [];
    const roomLegs = [];
    const roomSeats = [];
    const roomBacks = [];
    const roomFrames = [];
    const tops = roomTops;
    const legs = roomLegs;
    const addChair = (x, z, rot) => {
      const c = chairGeometries(x, z, rot);
      roomSeats.push(...c.seat);
      roomBacks.push(...c.back);
      roomFrames.push(...c.frame);
    };

    if (room.kind === 'study') {
      // Mesas corridas en filas, con sillas a ambos lados
      const rows = Math.max(1, Math.floor((depth - 2.2) / 3.0));
      const runLength = Math.min(width - 2.8, 5.6);
      for (let r = 0; r < rows; r++) {
        const z = room.z0 + 2.0 + r * 3.0;
        const d = deskGeometries(cx, z, runLength, 0.8);
        tops.push(...d.top);
        legs.push(...d.legs);
        const seatsPerSide = Math.max(2, Math.round(runLength / 1.5));
        for (let i = 0; i < seatsPerSide; i++) {
          const x = cx - runLength / 2 + (runLength / seatsPerSide) * (i + 0.5);
          addChair(x, z + 0.72, Math.PI);
          addChair(x, z - 0.72, 0);
        }
      }
      // Puestos individuales pegados al muro de fachada
      if (room.carrels) {
        for (let x = room.x0 + 1.3; x < room.x1 - 1.3; x += 1.6) {
          const c = carrelGeometries(x, room.z0 + 0.55, 0);
          tops.push(...c.top);
          legs.push(...c.legs);
          addChair(x, room.z0 + 1.35, Math.PI);
        }
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
      // Pizarra verde con marco de madera
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x2f4a3a, roughness: 0.85 })
      );
      board.position.set(cx, SLAB_Y + 1.55, room.z0 + 0.09);
      group.add(board);
      const boardFrame = [
        box(1.84, 1.14, 0.05, cx, SLAB_Y + 1.55, room.z0 + 0.06)
      ];
      group.add(mesh(boardFrame, woodMat, false));
    }

    if (room.kind === 'office') {
      const d = deskGeometries(cx, cz + 0.4, Math.min(width - 1.2, 1.9), 0.8);
      tops.push(...d.top);
      legs.push(...d.legs);
      addChair(cx, cz - 0.35, 0);
      const cabinet = [box(Math.min(width - 1.0, 1.8), 1.1, 0.42, cx, SLAB_Y + 0.55, room.z0 + 0.32)];
      group.add(mesh(cabinet, woodMat));
    }

    for (const list of [roomTops, roomLegs, roomSeats, roomBacks, roomFrames]) {
      list.forEach((g) => g.translate(0, SLAB_Y, 0));
    }
    allTops.push(...roomTops);
    allLegs.push(...roomLegs);
    allSeats.push(...roomSeats);
    allBacks.push(...roomBacks);
    allFrames.push(...roomFrames);
  }

  group.add(mesh(allTops, laminate));
  group.add(mesh(allLegs, tubular));
  group.add(mesh(allSeats, seatBlue));
  group.add(mesh(allBacks, seatBlack));
  group.add(mesh(allFrames, tubular));

  // Luminarias empotradas en el falso techo, alineadas con la retícula
  const panels = [];
  const grilles = [];
  for (let x = L + 1.8; x < R - 1; x += 3.6) {
    for (let z = BACK + 1.8; z < VOID_Z - 0.5; z += 3.0) {
      panels.push(box(1.18, 0.02, 0.58, x, CEIL_Y - 0.03, z));
      // Marco perimetral, no una caja que tape el panel
      grilles.push(box(1.26, 0.05, 0.04, x, CEIL_Y - 0.025, z - 0.31));
      grilles.push(box(1.26, 0.05, 0.04, x, CEIL_Y - 0.025, z + 0.31));
      grilles.push(box(0.04, 0.05, 0.66, x - 0.61, CEIL_Y - 0.025, z));
      grilles.push(box(0.04, 0.05, 0.66, x + 0.61, CEIL_Y - 0.025, z));
    }
  }
  group.add(mesh(panels, lampMat, false));
  group.add(mesh(grilles, tubular, false));

  /* ---------------- Planta baja: biblioteca y vestíbulo ---------------- */
  const stairs = [];
  const steps = 16;
  for (let i = 0; i < steps; i++) stairs.push(box(1.8, 0.26, 0.3, L + 2.2, 0.13 + i * 0.26, -2.4 - i * 0.3));
  stairs.push(box(2.2, 0.2, 1.8, L + 2.2, SLAB_Y - 0.1, -2.4 - steps * 0.3 - 0.9));
  group.add(mesh(stairs, slabMat));

  const rails = [];
  const railGlass = [];
  const addRail = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ang = Math.atan2(z2 - z1, x2 - x1);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.95), glassRail);
    pane.position.set((x1 + x2) / 2, SLAB_Y + 0.5, (z1 + z2) / 2);
    pane.rotation.y = -ang;
    railGlass.push(pane);
    const bar = new THREE.CylinderGeometry(0.03, 0.03, len, 6);
    bar.rotateZ(Math.PI / 2);
    bar.rotateY(-ang);
    bar.translate((x1 + x2) / 2, SLAB_Y + 1.0, (z1 + z2) / 2);
    rails.push(bar);
  };
  addRail(L, VOID_Z, R, VOID_Z);
  addRail(L + 2.6, VOID_Z, L + 2.6, VOID_Z + 3.4);
  group.add(mesh(rails, metal, false));
  railGlass.forEach((p) => group.add(p));

  // Estanterías y libros
  const shelfGeometries = (x, z, len, rot, shelves = 5) => {
    const g = [];
    const h = 2.1;
    const depth = 0.34;
    g.push(box(len, 0.05, depth, 0, 0.04, 0));
    for (let i = 1; i <= shelves; i++) g.push(box(len, 0.04, depth, 0, (h / shelves) * i, 0));
    g.push(box(0.05, h, depth, -len / 2, h / 2, 0), box(0.05, h, depth, len / 2, h / 2, 0));
    g.push(box(len, h, 0.03, 0, h / 2, -depth / 2));
    return place(g, x, z, rot);
  };
  const bookGeometries = (x, z, len, rot, shelves, buckets) => {
    const h = 2.1;
    const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, 0, z);
    for (let s = 0; s < shelves; s++) {
      const y = (h / shelves) * (s + 1);
      let p = -len / 2 + 0.12;
      while (p < len / 2 - 0.18) {
        const w = 0.03 + rand() * 0.05;
        const bh = 0.2 + rand() * 0.09;
        const g = box(w, bh, 0.24, p + w / 2, y + 0.02 + bh / 2, 0);
        g.applyMatrix4(m);
        buckets[Math.floor(rand() * buckets.length)].push(g);
        p += w + 0.004;
      }
    }
  };

  const shelves = [];
  const bookBuckets = [[], [], [], [], []];
  for (let z = -13.4; z <= -5.5; z += 2.6) {
    shelves.push(...shelfGeometries(L + 0.2, z, 2.4, -Math.PI / 2));
    bookGeometries(L + 0.2, z, 2.4, -Math.PI / 2, 5, bookBuckets);
  }
  for (let x = -8.5; x <= 9; x += 3.0) {
    shelves.push(...shelfGeometries(x, BACK + 0.2, 2.7, 0));
    bookGeometries(x, BACK + 0.2, 2.7, 0, 5, bookBuckets);
  }
  for (let z = -12.5; z <= -8; z += 2.4) {
    shelves.push(...shelfGeometries(2.5, z, 2.1, -Math.PI / 2));
    bookGeometries(2.5, z, 2.1, -Math.PI / 2, 5, bookBuckets);
  }
  group.add(mesh(shelves, darkWood));
  const bookColors = [0x8c3b3b, 0x2f5d78, 0x6a7a3c, 0xb08a3e, 0x50435f];
  bookBuckets.forEach((geos, i) => {
    if (geos.length) group.add(mesh(geos, new THREE.MeshStandardMaterial({ color: bookColors[i], roughness: 0.85 }), false));
  });

  // Mesas de lectura junto al vidrio, con las mismas sillas que arriba
  const lowTops = [];
  const lowLegs = [];
  const lowSeats = [];
  const lowBacks = [];
  const lowFrames = [];
  const addChairLow = (x, z, rot) => {
    const c = chairGeometries(x, z, rot);
    lowSeats.push(...c.seat);
    lowBacks.push(...c.back);
    lowFrames.push(...c.frame);
  };

  for (let z = -2.6; z >= -8.6; z -= 2.9) {
    for (const x of [-2.5, 6.5]) {
      const d = deskGeometries(x, z, 3.2, 1.1);
      lowTops.push(...d.top);
      lowLegs.push(...d.legs);
      for (const sx of [-1, 1]) {
        addChairLow(x + sx * 0.9, z + 0.85, Math.PI);
        addChairLow(x + sx * 0.9, z - 0.85, 0);
      }
    }
  }
  lowTops.push(box(4.6, 1.1, 0.9, 9.0, 0.55, -1.6));
  lowTops.push(box(4.9, 0.08, 1.2, 9.0, 1.14, -1.6));
  group.add(mesh(lowTops, laminate));
  group.add(mesh(lowLegs, tubular));
  if (lowSeats.length) {
    group.add(mesh(lowSeats, seatBlue));
    group.add(mesh(lowBacks, seatBlack));
    group.add(mesh(lowFrames, tubular));
  }

  // Lámparas colgantes del vestíbulo (se ven desde la sala de arriba)
  const pendants = new THREE.Group();
  for (const [x, z] of [[6.5, -2.2], [3.2, -2.2], [-0.2, -2.2]]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.6, 5), metal);
    cord.position.set(x, SLAB_Y - 0.6, z);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.26, 16, 1, true), lampMat);
    shade.position.set(x, SLAB_Y - 1.5, z);
    shade.material = new THREE.MeshStandardMaterial({
      color: 0xf6f4ee, emissive: 0xffe9c4, emissiveIntensity: 0.7, roughness: 0.5, side: THREE.DoubleSide
    });
    pendants.add(cord, shade);
  }
  group.add(pendants);

  /* ---------------- Luz interior ---------------- */
  const lights = new THREE.Group();
  for (const [x, y, z, power] of [
    [4, 3.6, -2.5, 60],
    [-6, 3.6, -7, 55],
    [7, 3.6, -11, 55],
    [-7, 3.6, -13, 45],
    [-6, SLAB_Y + 2.2, -11, 45],
    [1.5, SLAB_Y + 2.2, -12, 45],
    [7.5, SLAB_Y + 2.2, -6.5, 45],
    [-9, SLAB_Y + 2.2, -6.5, 35]
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
