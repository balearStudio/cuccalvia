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

/**
 * Coche de baja poligonización. Devuelve geometrías separadas por material
 * para poder fusionarlas después en pocas mallas.
 */
function carGeometries(rand, x, z, rot) {
  const body = [];
  const glass = [];
  const tyre = [];
  const L = 4.1 + rand() * 0.7;
  const W = 1.75 + rand() * 0.15;

  const chassis = new THREE.BoxGeometry(W, 0.62, L);
  chassis.translate(0, 0.72, 0);
  body.push(chassis);

  const cabin = new THREE.BoxGeometry(W * 0.92, 0.56, L * 0.46);
  cabin.translate(0, 1.3, -L * 0.05);
  glass.push(cabin);

  const roof = new THREE.BoxGeometry(W * 0.8, 0.1, L * 0.4);
  roof.translate(0, 1.58, -L * 0.05);
  body.push(roof);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const w = new THREE.CylinderGeometry(0.33, 0.33, 0.2, 10);
      w.rotateZ(Math.PI / 2);
      w.translate(sx * (W / 2 - 0.04), 0.33, sz * (L * 0.32));
      tyre.push(w);
    }
  }

  const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, GROUND_Y, z);
  [...body, ...glass, ...tyre].forEach((g) => g.applyMatrix4(m));
  return { body, glass, tyre };
}

export function createEnvironment() {
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
    envMapIntensity: 0.3
  });
  // El plano del suelo tiene UV 0..1, así que la repetición se calcula aparte
  grassMat.map = t.grass.clone();
  grassMat.map.wrapS = grassMat.map.wrapT = THREE.RepeatWrapping;
  grassMat.map.repeat.set(70, 70); // una baldosa cada 6 m
  grassMat.map.needsUpdate = true;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420, 1, 1), grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  group.add(ground);

  /* ---------------- Caminos ---------------- */
  // Todo el acceso está pavimentado con la misma losa de piedra del edificio
  const pathMat = new THREE.MeshStandardMaterial({
    map: t.plaza,
    color: 0xffffff,
    roughness: 0.88,
    envMapIntensity: 0.3
  });
  const paths = [];
  // Acceso frontal
  const main = new THREE.PlaneGeometry(13, 22);
  main.rotateX(-Math.PI / 2);
  main.translate(4, GROUND_Y + 0.02, 19);
  paths.push(main);
  // Sendero a la rampa
  const ramp = new THREE.PlaneGeometry(5, 18);
  ramp.rotateX(-Math.PI / 2);
  ramp.translate(17.5, GROUND_Y + 0.02, 14);
  paths.push(ramp);

  const pathMesh = new THREE.Mesh(mergeGeometries(paths), pathMat);
  pathMesh.receiveShadow = true;
  // Escala de la losa: el plano tiene UV 0..1, así que se ajusta aparte
  pathMat.map = t.plaza.clone();
  pathMat.map.wrapS = pathMat.map.wrapT = THREE.RepeatWrapping;
  pathMat.map.repeat.set(9, 9);
  pathMat.map.needsUpdate = true;
  group.add(pathMesh);

  /* ---------------- Muretes de piedra ---------------- */
  const stoneMat = new THREE.MeshStandardMaterial({
    map: t.stone,
    color: 0xd9d0bd,
    roughness: 0.95,
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
  addWall(13, 0.75, 0.5, -13, 16.5);
  addWall(0.5, 0.75, 12, -19.3, 10.8);
  addWall(10, 0.9, 0.5, 22, 14);
  addWall(0.5, 0.9, 10, 26.8, 9.4);
  const wallMesh = new THREE.Mesh(mergeGeometries(walls), stoneMat);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  group.add(wallMesh);

  /* ---------------- Aparcamiento y pasarela de acceso ---------------- */
  // En la vista aérea el aparcamiento queda al norte, sobre el edificio, y de él
  // baja una pasarela hasta la entrada; la pista de tenis está al este.
  const PARK_Y = GROUND_Y + 2.2;
  // Hormigón impreso con despiece en abanico, como en las fotos del aparcamiento
  const asphaltMat = new THREE.MeshStandardMaterial({
    map: t.asphalt,
    color: 0xffffff,
    roughness: 0.94,
    envMapIntensity: 0.2
  });

  const lot = new THREE.Mesh(new THREE.BoxGeometry(42, 0.3, 19), asphaltMat);
  lot.position.set(5, PARK_Y - 0.15, 46);
  lot.receiveShadow = true;
  group.add(lot);

  // Talud y muro de contención hacia el edificio
  const retaining = [];
  retaining.push((() => {
    const g = new THREE.BoxGeometry(42, 2.2, 0.6);
    g.translate(5, GROUND_Y + 1.1, 36.5);
    return g;
  })());
  for (const sx of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.6, 2.2, 19);
    g.translate(5 + sx * 21, GROUND_Y + 1.1, 46);
    retaining.push(g);
  }
  const retainingMesh = new THREE.Mesh(mergeGeometries(retaining), stoneMat);
  retainingMesh.castShadow = true;
  retainingMesh.receiveShadow = true;
  group.add(retainingMesh);

  // Torre de escaleras y ascensor, con el rótulo CUC
  const towerMat = new THREE.MeshStandardMaterial({ map: t.plaza, color: 0xd8c1ae, roughness: 0.94 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(4.4, 6.2, 4.0), towerMat);
  tower.position.set(-13.5, GROUND_Y + 3.1, 33.5);
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);
  const towerCap = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.22, 4.3), towerMat);
  towerCap.position.set(-13.5, GROUND_Y + 6.3, 33.5);
  towerCap.castShadow = true;
  group.add(towerCap);
  // Antena y foco de la cubierta de la torre
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x5b6063, metalness: 0.6, roughness: 0.5 });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.2, 6), mastMat);
  mast.position.set(-12.4, GROUND_Y + 8.0, 33.5);
  group.add(mast);
  // Rótulo CUC en relieve
  const cucMat = new THREE.MeshStandardMaterial({ color: 0xf1efe8, roughness: 0.8 });
  const cucLetters = [];
  let cx0 = -14.6;
  for (const ch of ['C', 'U', 'C']) {
    cucLetters.push(new THREE.BoxGeometry(0.62, 0.72, 0.06).translate(cx0, GROUND_Y + 4.2, 35.53));
    if (ch === 'U') cucLetters.push(new THREE.BoxGeometry(0.4, 0.2, 0.07).translate(cx0, GROUND_Y + 4.5, 35.54));
    cx0 += 0.86;
  }
  group.add(new THREE.Mesh(mergeGeometries(cucLetters), cucMat));

  // Marcas de las plazas
  const marks = [];
  for (let i = 0; i < 12; i++) {
    const g = new THREE.BoxGeometry(0.12, 0.02, 4.6);
    g.translate(-13 + i * 2.5, PARK_Y + 0.01, 43.5);
    marks.push(g);
  }
  group.add(
    new THREE.Mesh(mergeGeometries(marks), new THREE.MeshStandardMaterial({ color: 0xe4d98a, roughness: 0.9 }))
  );

  // Coches aparcados
  const carBody = [];
  const carGlass = [];
  const carTyre = [];
  const bodyColors = [0x2b3138, 0xb8bcc0, 0x8d99a6, 0x6b2f2f, 0x2f4a6b, 0xd8d5cc];
  const bodyBuckets = bodyColors.map(() => []);
  for (let i = 0; i < 7; i++) {
    const x = -11.8 + i * 2.5 + rand() * 0.3;
    const c = carGeometries(rand, x, 43.4 + rand() * 0.4, Math.PI * (rand() > 0.5 ? 1 : 0));
    c.body.forEach((g) => g.translate(0, PARK_Y - GROUND_Y, 0));
    c.glass.forEach((g) => g.translate(0, PARK_Y - GROUND_Y, 0));
    c.tyre.forEach((g) => g.translate(0, PARK_Y - GROUND_Y, 0));
    bodyBuckets[Math.floor(rand() * bodyColors.length)].push(...c.body);
    carGlass.push(...c.glass);
    carTyre.push(...c.tyre);
  }
  bodyBuckets.forEach((geos, i) => {
    if (!geos.length) return;
    const mesh = new THREE.Mesh(
      mergeGeometries(geos),
      new THREE.MeshStandardMaterial({ color: bodyColors[i], roughness: 0.35, metalness: 0.55, envMapIntensity: 0.9 })
    );
    mesh.castShadow = true;
    group.add(mesh);
  });
  const carGlassMesh = new THREE.Mesh(
    mergeGeometries(carGlass),
    new THREE.MeshStandardMaterial({ color: 0x2a3438, roughness: 0.12, metalness: 0.3, envMapIntensity: 1.1 })
  );
  const carTyreMesh = new THREE.Mesh(mergeGeometries(carTyre), new THREE.MeshStandardMaterial({ color: 0x1b1d1f, roughness: 0.95 }));
  carGlassMesh.castShadow = true;
  group.add(carGlassMesh, carTyreMesh);
  void carBody;

  // Escalera de zigzag entre el aparcamiento y la explanada, con los parapetos
  // macizos de hormigón que se ven en las fotos del jardín
  const zig = new THREE.Group();
  const stepMat = new THREE.MeshStandardMaterial({ map: t.plaza, color: 0xffffff, roughness: 0.9 });
  const parapetMat = new THREE.MeshStandardMaterial({ map: t.stone, color: 0xd8cdba, roughness: 0.95 });
  const flightSteps = 7;
  const rise = 2.2 / (flightSteps * 2);
  const run = 0.34;
  const flights = [
    { x: -6.6, z0: 34.0, dir: -1 },
    { x: -4.2, z0: 34.0 - flightSteps * run - 1.6, dir: -1 }
  ];
  let level = PARK_Y;
  const zigSteps = [];
  const zigWalls = [];
  for (const f of flights) {
    for (let i = 0; i < flightSteps; i++) {
      level -= rise;
      zigSteps.push(new THREE.BoxGeometry(2.2, rise + 0.02, run).translate(f.x, level + rise / 2, f.z0 + f.dir * (i * run)));
    }
    // Rellano
    zigSteps.push(new THREE.BoxGeometry(2.6, 0.16, 1.6).translate(f.x + 1.2, level - 0.08, f.z0 + f.dir * (flightSteps * run + 0.8)));
    for (const sx of [-1, 1]) {
      zigWalls.push(
        new THREE.BoxGeometry(0.34, 1.15, flightSteps * run + 1.8).translate(
          f.x + sx * 1.27,
          level + 0.9,
          f.z0 + f.dir * (flightSteps * run / 2 + 0.4)
        )
      );
    }
  }
  zig.add(new THREE.Mesh(mergeGeometries(zigSteps), stepMat));
  const zigWallMesh = new THREE.Mesh(mergeGeometries(zigWalls), parapetMat);
  zigWallMesh.castShadow = true;
  zig.add(zigWallMesh);
  zig.traverse((o) => {
    if (o.isMesh) o.receiveShadow = true;
  });
  group.add(zig);

  // Pasarela desde el aparcamiento hasta la plaza de acceso
  const walkway = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.25, 8.6), pathMat);
  walkway.position.set(4, GROUND_Y + 1.1, 32.4);
  walkway.rotation.x = -Math.atan(2.2 / 8.6);
  walkway.castShadow = true;
  walkway.receiveShadow = true;
  group.add(walkway);

  const parapets = [];
  for (const sx of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.3, 1.0, 9.2);
    g.translate(4 + sx * 2.45, GROUND_Y + 1.65, 32.4);
    g.rotateX(0);
    parapets.push(g);
  }
  const parapetMesh = new THREE.Mesh(mergeGeometries(parapets), stoneMat);
  parapetMesh.castShadow = true;
  group.add(parapetMesh);

  /* ---------------- Piscina y pista, al este ---------------- */
  const sports = new THREE.Group();

  // Solera del recinto
  const deck = new THREE.Mesh(new THREE.BoxGeometry(26, 0.3, 34), new THREE.MeshStandardMaterial({
    map: t.plaza, color: 0xe8dcc6, roughness: 0.92
  }));
  deck.position.set(45, GROUND_Y + 0.15, -4);
  deck.receiveShadow = true;
  sports.add(deck);

  // Vaso de la piscina
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(12.5, 0.24, 25),
    new THREE.MeshPhysicalMaterial({
      color: 0x1f7fa8, roughness: 0.08, metalness: 0.05, envMapIntensity: 1.2,
      transparent: true, opacity: 0.92
    })
  );
  water.position.set(43, GROUND_Y + 0.24, -4);
  sports.add(water);
  const coping = [];
  for (const [w, d, dx, dz] of [[13.3, 0.4, 0, 12.7], [13.3, 0.4, 0, -12.7], [0.4, 25.8, 6.45, 0], [0.4, 25.8, -6.45, 0]]) {
    coping.push(new THREE.BoxGeometry(w, 0.14, d).translate(43 + dx, GROUND_Y + 0.34, -4 + dz));
  }
  sports.add(new THREE.Mesh(mergeGeometries(coping), new THREE.MeshStandardMaterial({ color: 0xeee9dc, roughness: 0.9 })));
  // Corcheras
  const lanes = [];
  for (let i = -2; i <= 2; i++) lanes.push(new THREE.BoxGeometry(0.12, 0.03, 24).translate(43 + i * 2.4, GROUND_Y + 0.37, -4));
  sports.add(new THREE.Mesh(mergeGeometries(lanes), new THREE.MeshStandardMaterial({ color: 0xe4e7ea, roughness: 0.7 })));

  // Valla perimetral y báculos de alumbrado
  const fencePosts = [];
  for (let i = 0; i <= 11; i++) {
    const z = -4 - 17 + i * 3.1;
    fencePosts.push(new THREE.CylinderGeometry(0.06, 0.06, 3.0, 6).translate(32.2, GROUND_Y + 1.8, z));
  }
  sports.add(new THREE.Mesh(mergeGeometries(fencePosts), new THREE.MeshStandardMaterial({
    color: 0x33383b, metalness: 0.6, roughness: 0.5
  })));
  const fenceMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 3.0),
    new THREE.MeshStandardMaterial({ color: 0x2f3437, transparent: true, opacity: 0.2, side: THREE.DoubleSide, roughness: 0.6 })
  );
  fenceMesh.rotation.y = Math.PI / 2;
  fenceMesh.position.set(32.2, GROUND_Y + 1.8, -4);
  sports.add(fenceMesh);

  // Báculos blancos altos del recinto deportivo
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xdcdedd, metalness: 0.4, roughness: 0.5 });
  for (const [px, pz] of [[34, 8], [34, -16], [54, 8], [54, -16]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 7.5, 8), poleMat);
    pole.position.set(px, GROUND_Y + 3.75, pz);
    pole.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.4), poleMat);
    head.position.set(px, GROUND_Y + 7.5, pz);
    sports.add(pole, head);
  }

  sports.traverse((o) => {
    if (o.isMesh) o.receiveShadow = true;
  });
  group.add(sports);

  /* ---------------- Vegetación ---------------- */
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d5137, roughness: 0.95 });
  const pineMat = new THREE.MeshStandardMaterial({
    color: 0x415c34,
    roughness: 0.92,
    flatShading: true,
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
  const busy = (x, z) =>
    (z > 2 && x > -26 && x < 30) || // frente del edificio y acceso
    (z > 28 && x > -22 && x < 30) || // aparcamiento, torre y escalera
    (x > 30 && x < 60 && z > -24 && z < 16); // piscina y pista
  for (let i = 0; i < 700 && spots.length < 96; i++) {
    const a = rand() * Math.PI * 2;
    const r = 26 + rand() * 56;
    const x = Math.cos(a) * r + 2;
    const z = Math.sin(a) * r - 4;
    if (busy(x, z)) continue;
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

  // Farolas: se guardan bombilla y foco para encenderlas de noche
  const lamps = [];
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
      new THREE.MeshStandardMaterial({ color: 0xfff2cf, emissive: 0xfff0c8, emissiveIntensity: 0.15 })
    );
    bulb.position.y = 4.16;
    lamp.add(post, head, bulb);
    lamp.position.set(x, GROUND_Y, z);
    lamp.traverse((o) => (o.castShadow = true));
    furniture.add(lamp);

    const light = new THREE.PointLight(0xffe6b8, 0, 22, 2);
    light.position.set(x, GROUND_Y + 4.1, z);
    light.visible = false;
    furniture.add(light);
    lamps.push({ bulb, light });
  }

  group.add(furniture);

  // La atmósfera necesita estos materiales para teñir la vegetación por
  // estación y las farolas para encenderlas de noche.
  return {
    group,
    materials: { grass: grassMat, shrub: shrubMat, pine: pineMat, hills: hillMat },
    surfaces: [pathMat, asphaltMat, stoneMat],
    lamps
  };
}
