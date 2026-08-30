import * as THREE from 'three';
import './styles/main.css';

import { SECTIONS, CHARACTER } from './config/site.js';
import { createSky, skyEnvironment } from './scene/sky.js';
import { initTextures } from './scene/textures.js';
import { createBuilding } from './scene/building.js';
import { createEnvironment } from './scene/environment.js';
import { createInterior } from './scene/interior.js';
import { createCharacter } from './scene/character.js';
import { CameraRig } from './core/cameraRig.js';
import { ScrollController } from './core/scrollController.js';
import { createUI } from './ui/ui.js';

const canvas = document.getElementById('scene');
const isMobile = window.matchMedia('(max-width: 900px)').matches;

/* ------------------------------------------------------------------ */
/* Renderizador                                                        */
/* ------------------------------------------------------------------ */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !isMobile,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.6 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd6e4e9, 130, 380);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.35, 900);

/* ------------------------------------------------------------------ */
/* Luz y cielo                                                         */
/* ------------------------------------------------------------------ */
const sunDir = new THREE.Vector3(0.52, 0.66, 0.54).normalize();

const sun = new THREE.DirectionalLight(0xfff2d8, 3.1);
sun.position.copy(sunDir).multiplyScalar(90);
sun.castShadow = true;
sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 190;
sun.shadow.camera.left = -46;
sun.shadow.camera.right = 46;
sun.shadow.camera.top = 46;
sun.shadow.camera.bottom = -40;
sun.shadow.bias = -0.0007;
sun.shadow.normalBias = 0.035;
sun.target.position.set(0, 2, -4);
scene.add(sun, sun.target);

scene.add(new THREE.HemisphereLight(0xbfd9e8, 0x6c6a55, 1.05));
scene.add(new THREE.AmbientLight(0xffffff, 0.18));

/* ------------------------------------------------------------------ */
/* Montaje progresivo (con barra de carga)                             */
/* ------------------------------------------------------------------ */
const ui = createUI(SECTIONS, { onSelect: (i) => scroll.go(i) });
const rig = new CameraRig(camera, canvas);
ui.onAuto = (on) => (rig.auto = on);

let daniel = null;

function applySection(i, immediate = false) {
  ui.setActive(i);
  rig.goTo({ ...SECTIONS[i].camera, via: SECTIONS[i].via }, immediate);
  daniel?.showMarker(Boolean(SECTIONS[i].character));
  // Dentro del edificio la niebla atmosférica sobra
  scene.fog.near = SECTIONS[i].interior ? 260 : 130;
}

const scroll = new ScrollController({
  count: SECTIONS.length,
  onChange: (i) => applySection(i)
});

const next = (fn) => new Promise((resolve) => requestAnimationFrame(() => resolve(fn())));

async function boot() {
  ui.progress(0.06, 'Recortando las texturas de las fotos…');
  await initTextures(import.meta.env.BASE_URL ?? '');

  ui.progress(0.18, 'Preparando el cielo…');
  const env = await next(() => skyEnvironment(renderer, sunDir));
  scene.environment = env;
  scene.add(createSky(sunDir));

  ui.progress(0.3, 'Levantando el edificio…');
  const building = await next(() => createBuilding(env));
  scene.add(building.group);

  ui.progress(0.62, 'Plantando el pinar…');
  scene.add(await next(() => createEnvironment(env)));

  ui.progress(0.82, 'Amueblando el interior…');
  scene.add(await next(() => createInterior(env)));

  ui.progress(0.92, 'Colocando a Daniel a escala…');
  daniel = await next(() => createCharacter());
  daniel.group.position.fromArray(CHARACTER.position);
  daniel.group.rotation.y = CHARACTER.rotation;
  scene.add(daniel.group);

  ui.progress(0.97, 'Enfocando la cámara…');
  applySection(0, true);

  await next(() => renderer.compile(scene, camera));
  ui.progress(1, 'Listo');
  setTimeout(() => ui.finishLoading(), 320);
}

/* ------------------------------------------------------------------ */
/* Bucle                                                               */
/* ------------------------------------------------------------------ */
let last = performance.now();
let elapsed = 0;

function animate() {
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  elapsed += dt;

  rig.update(dt);
  daniel?.update(elapsed);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

boot();
animate();

// Utilidad de desarrollo: posición actual de la cámara en la consola.
window.__cuc = {
  scene,
  camera,
  rig,
  sections: SECTIONS,
  /** Salta a una sección sin transición (útil para depurar encuadres). */
  jump(i) {
    scroll.index = i;
    applySection(i, true);
  },
  /** Vuelca el encuadre actual para copiarlo en config/site.js. */
  dump: () => ({
    position: camera.position.toArray().map((n) => +n.toFixed(2)),
    target: rig.base.target.toArray().map((n) => +n.toFixed(2))
  })
};
