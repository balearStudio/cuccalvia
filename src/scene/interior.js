import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildTextures } from './textures.js';
import { roofSoffitY, ROOF } from './building.js';

/**
 * Interior: vestíbulo de doble altura, biblioteca en planta baja y salas de
 * estudio en la planta superior.
 *
 * Volumetría provisional pensada para sustituirse por el reparto real cuando
 * lleguen las fotos del interior; la estructura del módulo ya está preparada
 * para ello (cada estancia es una función independiente).
 */

const L = -12 + 0.32; // cara interior del muro izquierdo
const R = 12 - 0.32;
const BACK = -15 + 0.32;
const FRONT = -0.06;
const SLAB_Y = 4.2; // cara superior del forjado
const SLAB_T = 0.34;
const VOID_Z = -4.2; // el vestíbulo es de doble altura de VOID_Z a la fachada

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

/* ---------------- Mobiliario ---------------- */

function tableGeometries(x, z, w = 2.4, d = 1.1, h = 0.74) {
  const g = [box(w, 0.06, d, x, h, z)];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      g.push(box(0.07, h, 0.07, x + sx * (w / 2 - 0.12), h / 2, z + sz * (d / 2 - 0.12)));
  return g;
}

function chairGeometries(x, z, rot = 0) {
  const g = [];
  const seat = box(0.45, 0.05, 0.45, 0, 0.45, 0);
  const back = box(0.45, 0.5, 0.05, 0, 0.72, -0.2);
  g.push(seat, back);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) g.push(box(0.04, 0.45, 0.04, sx * 0.18, 0.225, sz * 0.18));
  const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, 0, z);
  g.forEach((geo) => geo.applyMatrix4(m));
  return g;
}

function shelfGeometries(x, z, len, rot, shelves = 5) {
  const g = [];
  const h = 2.1;
  const depth = 0.34;
  g.push(box(len, 0.05, depth, 0, 0.04, 0));
  for (let i = 1; i <= shelves; i++) g.push(box(len, 0.04, depth, 0, (h / shelves) * i, 0));
  g.push(box(0.05, h, depth, -len / 2, h / 2, 0), box(0.05, h, depth, len / 2, h / 2, 0));
  g.push(box(len, h, 0.03, 0, h / 2, -depth / 2));
  const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, 0, z);
  g.forEach((geo) => geo.applyMatrix4(m));
  return g;
}

/** Filas de libros: se agrupan por color para usar pocas mallas. */
function bookGeometries(x, z, len, rot, shelves, rand, buckets) {
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
}

/* ---------------- Estancias ---------------- */

export function createInterior(env) {
  const t = buildTextures();
  const group = new THREE.Group();
  group.name = 'interior';

  let seed = 20250;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const floorMat = new THREE.MeshStandardMaterial({
    map: t.concrete,
    color: 0xe9e3d6,
    roughness: 0.3,
    metalness: 0.05,
    envMap: env,
    envMapIntensity: 0.45
  });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2eee5, roughness: 0.95 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xfaf7f0, roughness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ map: t.wood, color: 0xd9bd95, roughness: 0.7 });
  const darkWood = new THREE.MeshStandardMaterial({ map: t.wood, color: 0x9a7c56, roughness: 0.75 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0x2d5f6d, roughness: 0.95 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8f979b, metalness: 0.85, roughness: 0.35 });
  const glassRail = new THREE.MeshPhysicalMaterial({
    color: 0xbcd6dd,
    transparent: true,
    opacity: 0.22,
    roughness: 0.05,
    envMap: env,
    envMapIntensity: 1,
    side: THREE.DoubleSide
  });

  /* --- Suelos --- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(R - L, FRONT - BACK), floorMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((L + R) / 2, 0.02, (BACK + FRONT) / 2);
  ground.receiveShadow = true;
  group.add(ground);

  /* --- Forjado de planta primera (deja el vestíbulo a doble altura) --- */
  const slabs = [
    box(R - L, SLAB_T, VOID_Z - BACK, (L + R) / 2, SLAB_Y - SLAB_T / 2, (BACK + VOID_Z) / 2),
    // Balconada estrecha que recorre la fachada de vidrio
    box(R - L, SLAB_T, 1.6, (L + R) / 2, SLAB_Y - SLAB_T / 2, VOID_Z + 0.8),
    // Pasarela lateral hacia la escalera
    box(2.6, SLAB_T, 4.2, L + 1.3, SLAB_Y - SLAB_T / 2, VOID_Z + 2.9)
  ];
  group.add(mesh(slabs, wallMat));

  const upperFloor = new THREE.Mesh(new THREE.PlaneGeometry(R - L, VOID_Z - BACK + 2.4), floorMat);
  upperFloor.rotation.x = -Math.PI / 2;
  upperFloor.position.set((L + R) / 2, SLAB_Y + 0.02, (BACK + VOID_Z) / 2 + 1.2);
  upperFloor.receiveShadow = true;
  group.add(upperFloor);

  /* --- Techo inclinado siguiendo la cubierta --- */
  const ceilGeo = new THREE.PlaneGeometry(R - L, FRONT - BACK, 1, 1);
  ceilGeo.rotateX(Math.PI / 2); // mirando hacia abajo
  const shear = new THREE.Matrix4().set(
    1, 0, 0, 0,
    ROOF.slopeX, 1, ROOF.slopeZ, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  );
  ceilGeo.applyMatrix4(shear);
  ceilGeo.computeVertexNormals();
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  const cx = (L + R) / 2;
  const cz = (BACK + FRONT) / 2;
  ceiling.position.set(cx, roofSoffitY(cx, cz) - 0.3, cz);
  group.add(ceiling);

  // Luminarias lineales
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfffaf0,
    emissive: 0xfff4dd,
    emissiveIntensity: 1.35,
    roughness: 0.4
  });
  const lamps = [];
  for (let z = -13.5; z <= -1; z += 2.6) {
    for (const x of [-7.5, 0, 7.5]) {
      lamps.push(box(3.2, 0.05, 0.12, x, roofSoffitY(x, z) - 0.5, z));
      lamps.push(box(3.3, 0.07, 0.2, x, roofSoffitY(x, z) - 0.44, z));
    }
  }
  group.add(mesh(lamps, lampMat, false));

  /* --- Escalera al piso superior --- */
  const stairs = [];
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    stairs.push(box(1.8, 0.26, 0.3, L + 2.2, 0.13 + i * 0.26, -2.4 - i * 0.3));
  }
  stairs.push(box(2.2, 0.2, 1.8, L + 2.2, SLAB_Y - 0.1, -2.4 - steps * 0.3 - 0.9));
  group.add(mesh(stairs, floorMat));

  /* --- Barandillas de vidrio del vestíbulo --- */
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

  /* --- Biblioteca (planta baja) --- */
  const shelves = [];
  const bookBuckets = [[], [], [], [], []];
  // Estanterías perimetrales contra el muro izquierdo y la trasera
  for (let z = -13.4; z <= -5.5; z += 2.6) {
    shelves.push(...shelfGeometries(L + 0.2, z, 2.4, -Math.PI / 2));
    bookGeometries(L + 0.2, z, 2.4, -Math.PI / 2, 5, rand, bookBuckets);
  }
  for (let x = -8.5; x <= 9; x += 3.0) {
    shelves.push(...shelfGeometries(x, BACK + 0.2, 2.7, 0));
    bookGeometries(x, BACK + 0.2, 2.7, 0, 5, rand, bookBuckets);
  }
  // Estanterías exentas en el centro de la sala
  for (let z = -12.5; z <= -8; z += 2.4) {
    shelves.push(...shelfGeometries(2.5, z, 2.1, -Math.PI / 2));
    bookGeometries(2.5, z, 2.1, -Math.PI / 2, 5, rand, bookBuckets);
  }
  group.add(mesh(shelves, darkWood));

  const bookColors = [0x8c3b3b, 0x2f5d78, 0x6a7a3c, 0xb08a3e, 0x50435f];
  bookBuckets.forEach((geos, i) => {
    if (!geos.length) return;
    group.add(mesh(geos, new THREE.MeshStandardMaterial({ color: bookColors[i], roughness: 0.85 }), false));
  });

  // Mesas de lectura junto al vidrio
  const tables = [];
  const chairs = [];
  for (let z = -2.6; z >= -8.6; z -= 2.9) {
    for (const x of [-2.5, 6.5]) {
      tables.push(...tableGeometries(x, z, 3.2, 1.2));
      for (const sx of [-1, 1]) {
        chairs.push(...chairGeometries(x + sx * 0.9, z + 1.0, Math.PI));
        chairs.push(...chairGeometries(x + sx * 0.9, z - 1.0, 0));
      }
    }
  }
  // Mostrador de recepción
  tables.push(box(4.6, 1.1, 0.9, 9.0, 0.55, -1.6));
  tables.push(box(4.9, 0.08, 1.2, 9.0, 1.14, -1.6));

  group.add(mesh(tables, woodMat));
  group.add(mesh(chairs, fabric));

  /* --- Salas de estudio (planta primera) --- */
  const upTables = [];
  const upChairs = [];
  const partitions = [];
  for (let z = -13.6; z <= -6; z += 3.1) {
    for (const x of [-8, -2, 4, 9.5]) {
      upTables.push(...tableGeometries(x, z, 2.2, 1.0, 0.74).map((g) => (g.translate(0, SLAB_Y, 0), g)));
      upChairs.push(...chairGeometries(x, z + 0.95, Math.PI).map((g) => (g.translate(0, SLAB_Y, 0), g)));
      upChairs.push(...chairGeometries(x, z - 0.95, 0).map((g) => (g.translate(0, SLAB_Y, 0), g)));
      partitions.push(box(2.2, 0.42, 0.05, x, SLAB_Y + 0.95, z));
    }
  }
  // Tabiques de las salas de grupo
  partitions.push(box(0.14, 2.5, 7.4, -5.2, SLAB_Y + 1.25, -10.6));
  partitions.push(box(0.14, 2.5, 7.4, 1.4, SLAB_Y + 1.25, -10.6));
  partitions.push(box(6.6, 2.5, 0.14, -1.9, SLAB_Y + 1.25, -6.9));
  group.add(mesh(upTables, woodMat));
  group.add(mesh(upChairs, fabric));
  group.add(mesh(partitions, wallMat));

  /* --- Luz interior --- */
  const lights = new THREE.Group();
  for (const [x, y, z, power] of [
    [4, 3.6, -2.5, 60],
    [-6, 3.6, -7, 55],
    [7, 3.6, -11, 55],
    [-7, 3.6, -13, 45],
    [0, 6.4, -8, 55],
    [-6, 6.4, -12.5, 50],
    [7, 6.4, -12.5, 50]
  ]) {
    const light = new THREE.PointLight(0xfff1dc, power, 30, 2);
    light.position.set(x, y, z);
    lights.add(light);
  }
  // Relleno suave para que el interior no se apague bajo la cubierta
  const fill = new THREE.HemisphereLight(0xfff4e2, 0x8a7f6a, 0.55);
  fill.position.set(0, 5, -6);
  lights.add(fill);
  group.add(lights);

  return group;
}
