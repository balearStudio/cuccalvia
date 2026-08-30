import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildTextures } from './textures.js';

/**
 * Entorno: jardín, pinar mediterráneo, setos, muretes de piedra y caminos.
 * Todo se fusiona en pocas mallas para que la escena siga siendo ligera.
 */

const GROUND_Y = -0.9;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pino de parasol mediterráneo: tronco esbelto y copa ancha y aplanada. */
function pineGeometries(rand, x, z, scale) {
  const trunks = [];
  const crowns = [];
  const h = (6.5 + rand() * 4.0) * scale;
  const lean = (rand() - 0.5) * 0.22;
  const tilt = lean * h * 0.5;

  const trunk = new THREE.CylinderGeometry(0.13 * scale, 0.3 * scale, h, 6, 1);
  trunk.translate(0, h / 2, 0);
  trunk.rotateZ(lean);
  trunk.translate(x, GROUND_Y, z);
  trunks.push(trunk);

  // Ramas bajas insinuadas
  const branches = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < branches; i++) {
    const bl = (1.6 + rand() * 1.4) * scale;
    const b = new THREE.CylinderGeometry(0.05 * scale, 0.09 * scale, bl, 5, 1);
    b.translate(0, bl / 2, 0);
    b.rotateZ((rand() - 0.5) * 1.6);
    b.rotateY(rand() * Math.PI * 2);
    b.translate(x - tilt * 0.6, GROUND_Y + h * (0.55 + rand() * 0.2), z);
    trunks.push(b);
  }

  // Copa: capas anchas y planas superpuestas (forma de sombrilla)
  const layers = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < layers; i++) {
    const r = (2.6 + rand() * 1.6) * scale * (1 - i * 0.16);
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.scale(1.1, 0.3 + rand() * 0.12, 1.1);
    const a = rand() * Math.PI * 2;
    const rad = rand() * 0.9 * scale;
    g.translate(
      x - tilt + Math.cos(a) * rad,
      GROUND_Y + h * (0.9 + i * 0.07) + rand() * 0.4,
      z + Math.sin(a) * rad
    );
    crowns.push(g);
  }
  // Un par de mechones sueltos por debajo de la copa
  for (let i = 0; i < 2; i++) {
    const r = (0.9 + rand() * 0.8) * scale;
    const g = new THREE.IcosahedronGeometry(r, 0);
    g.scale(1.2, 0.45, 1.2);
    const a = rand() * Math.PI * 2;
    g.translate(
      x - tilt * 0.8 + Math.cos(a) * 2.2 * scale,
      GROUND_Y + h * (0.72 + rand() * 0.14),
      z + Math.sin(a) * 2.2 * scale
    );
    crowns.push(g);
  }
  return { trunks, crowns };
}

/** Relieve lejano: la sierra que cierra el horizonte. */
function distantHills(rand) {
  const geos = [];
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2;
    const r = 150 + rand() * 120;
    const w = 60 + rand() * 110;
    const h = 14 + rand() * 34;
    const g = new THREE.IcosahedronGeometry(1, 1);
    g.scale(w, h, w * (0.6 + rand() * 0.5));
    g.rotateY(rand() * Math.PI);
    g.translate(Math.cos(a) * r, GROUND_Y - h * 0.55, Math.sin(a) * r);
    geos.push(g);
  }
  return geos;
}

/** Arbusto / seto redondeado. */
function shrubGeometry(rand, x, z, r) {
  const g = new THREE.IcosahedronGeometry(r, 1);
  g.scale(1 + rand() * 0.3, 0.65 + rand() * 0.3, 1 + rand() * 0.3);
  g.translate(x, GROUND_Y + r * 0.45, z);
  return g;
}

export function createEnvironment(env) {
  const t = buildTextures();
  const group = new THREE.Group();
  group.name = 'entorno';
  const rand = rng(1234);

  /* ---------------- Suelo ---------------- */
  const grassMat = new THREE.MeshStandardMaterial({
    map: t.grass,
    color: 0x9aa96d,
    roughness: 1,
    metalness: 0,
    envMap: env,
    envMapIntensity: 0.3
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420, 1, 1), grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  group.add(ground);

  /* ---------------- Caminos ---------------- */
  const pathMat = new THREE.MeshStandardMaterial({
    map: t.gravel,
    color: 0xe0d3b4,
    roughness: 0.98,
    envMap: env,
    envMapIntensity: 0.25
  });
  const paths = [];
  // Acceso frontal
  const main = new THREE.PlaneGeometry(11, 34);
  main.rotateX(-Math.PI / 2);
  main.translate(4, GROUND_Y + 0.02, 24);
  paths.push(main);
  // Vial lateral
  const side = new THREE.PlaneGeometry(46, 7.5);
  side.rotateX(-Math.PI / 2);
  side.translate(6, GROUND_Y + 0.015, 40);
  paths.push(side);
  // Sendero a la rampa
  const ramp = new THREE.PlaneGeometry(5, 18);
  ramp.rotateX(-Math.PI / 2);
  ramp.translate(17.5, GROUND_Y + 0.02, 14);
  paths.push(ramp);

  const pathMesh = new THREE.Mesh(mergeGeometries(paths), pathMat);
  pathMesh.receiveShadow = true;
  group.add(pathMesh);

  /* ---------------- Muretes de piedra ---------------- */
  const stoneMat = new THREE.MeshStandardMaterial({
    map: t.stone,
    color: 0xd9d0bd,
    roughness: 0.95,
    envMap: env,
    envMapIntensity: 0.25
  });
  const walls = [];
  const addWall = (w, h, d, x, z) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, GROUND_Y + h / 2, z);
    walls.push(g);
    const cap = new THREE.BoxGeometry(w + 0.18, 0.12, d + 0.18);
    cap.translate(x, GROUND_Y + h + 0.06, z);
    walls.push(cap);
  };
  addWall(15, 0.75, 0.5, -13, 16.5);
  addWall(0.5, 0.75, 12, -20.3, 10.8);
  addWall(12, 0.9, 0.5, 21, 12);
  addWall(0.5, 0.9, 10, 26.8, 7.4);
  const wallMesh = new THREE.Mesh(mergeGeometries(walls), stoneMat);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  group.add(wallMesh);

  /* ---------------- Vegetación ---------------- */
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d5137, roughness: 0.95 });
  const pineMat = new THREE.MeshStandardMaterial({
    color: 0x415c34,
    roughness: 0.92,
    flatShading: true,
    envMap: env,
    envMapIntensity: 0.25
  });
  const shrubMat = new THREE.MeshStandardMaterial({
    color: 0x5a7040,
    roughness: 0.95,
    flatShading: true
  });

  const trunks = [];
  const crowns = [];
  const shrubs = [];

  // Pinar que rodea la parcela: nunca delante de la fachada ni sobre la
  // visual del encuadre inicial (desde la esquina delantera izquierda).
  const spots = [];
  const blocksHero = (x, z) => {
    // Distancia del punto a la recta cámara(-30,15,35) → edificio(0,-4)
    const ax = -30, az = 35, bx = 0, bz = -4;
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const px = ax + dx * t, pz = az + dz * t;
    return Math.hypot(x - px, z - pz) < 13;
  };
  for (let i = 0; i < 260 && spots.length < 44; i++) {
    const a = rand() * Math.PI * 2;
    const r = 30 + rand() * 48;
    const x = Math.cos(a) * r + 2;
    const z = Math.sin(a) * r - 4;
    if (z > 2 && x > -26 && x < 30) continue; // despeja el frente y el acceso
    if (blocksHero(x, z)) continue;
    spots.push([x, z]);
  }
  // Pinos escogidos que enmarcan el edificio (como en las fotos)
  spots.push(
    [-31, -2], [-27, -16], [-19, -28], [-4, -30], [10, -32], [24, -26],
    [31, -10], [34, 2], [30, 14], [26, 24], [-34, 12], [-38, 26]
  );

  for (const [x, z] of spots) {
    const s = 0.75 + rand() * 0.6;
    const p = pineGeometries(rand, x, z, s);
    trunks.push(...p.trunks);
    crowns.push(...p.crowns);
  }

  // Setos delante del plinto y macizos junto a la escalinata
  for (let x = -13; x <= 20; x += 1.5) {
    if (x > -1 && x < 9.5) continue; // hueco de la escalinata
    shrubs.push(shrubGeometry(rand, x + (rand() - 0.5) * 0.3, 7.7 + (rand() - 0.5) * 0.5, 0.6 + rand() * 0.28));
  }
  for (let i = 0; i < 30; i++) {
    const a = rand() * Math.PI * 2;
    const r = 12 + rand() * 18;
    const x = Math.cos(a) * r + 3;
    const z = Math.sin(a) * r + 12;
    if (x > -2 && x < 11 && z < 26) continue;
    shrubs.push(shrubGeometry(rand, x, z, 0.6 + rand() * 0.8));
  }

  // Sierra de fondo
  const hillMat = new THREE.MeshStandardMaterial({
    color: 0x7f8f74,
    roughness: 1,
    flatShading: true,
    fog: true
  });
  const hills = new THREE.Mesh(mergeGeometries(distantHills(rand)), hillMat);
  hills.receiveShadow = false;
  group.add(hills);

  const trunkMesh = new THREE.Mesh(mergeGeometries(trunks), trunkMat);
  const crownMesh = new THREE.Mesh(mergeGeometries(crowns), pineMat);
  const shrubMesh = new THREE.Mesh(mergeGeometries(shrubs), shrubMat);
  for (const mesh of [trunkMesh, crownMesh, shrubMesh]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  /* ---------------- Mobiliario urbano ---------------- */
  const metal = new THREE.MeshStandardMaterial({ color: 0x50565a, metalness: 0.7, roughness: 0.45 });
  const woodMat = new THREE.MeshStandardMaterial({ map: t.wood, color: 0xcdb18a, roughness: 0.8 });
  const furniture = new THREE.Group();

  // Bancos
  for (const [x, z, rot] of [
    [-8, 12.5, 0],
    [13, 12.5, 0],
    [-15, 24, Math.PI / 2]
  ]) {
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.55), woodMat);
    seat.position.y = 0.45;
    const backRest = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.42, 0.08), woodMat);
    backRest.position.set(0, 0.72, -0.24);
    bench.add(seat, backRest);
    for (const sx of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.5), metal);
      leg.position.set(sx, 0.22, 0);
      bench.add(leg);
    }
    bench.position.set(x, GROUND_Y, z);
    bench.rotation.y = rot;
    bench.traverse((o) => (o.castShadow = true));
    furniture.add(bench);
  }

  // Farolas
  for (const [x, z] of [
    [-2.5, 18],
    [11, 18],
    [-2.5, 30],
    [11, 30]
  ]) {
    const lamp = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.2, 8), metal);
    post.position.y = 2.1;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.42), metal);
    head.position.y = 4.24;
    const bulb = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.05, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xfff2cf, emissive: 0xfff0c8, emissiveIntensity: 0.35 })
    );
    bulb.position.y = 4.16;
    lamp.add(post, head, bulb);
    lamp.position.set(x, GROUND_Y, z);
    lamp.traverse((o) => (o.castShadow = true));
    furniture.add(lamp);
  }

  group.add(furniture);
  return group;
}
