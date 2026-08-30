import * as THREE from 'three';

/**
 * Personaje de baja poligonización — Daniel Ramos (balearStudio), autor de la
 * web — situado en el exterior, junto al acceso al edificio.
 *
 * Está modelado a escala real: 1,93 m de la planta de los pies a la coronilla,
 * de modo que también funciona como referencia de escala del edificio.
 */

export const HEIGHT = 1.93;

const SKIN = 0xe3b193;
const HAIR = 0x3b2c22;
const BEARD = 0x6d4c33;
const SHIRT = 0xd9c3a3;
const PANTS = 0x333a42;
const SHOES = 0x20242a;

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });
}

function part(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Etiqueta flotante con la cota de altura. */
function labelSprite(text) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(8, 26, 34, 0.78)';
  ctx.beginPath();
  ctx.roundRect(6, 26, 500, 76, 38);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(1.05, 0.26, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export function createCharacter() {
  const group = new THREE.Group();
  group.name = 'daniel';

  const skin = mat(SKIN);
  const hair = mat(HAIR, { roughness: 0.95 });
  const beard = mat(BEARD, { roughness: 0.95 });
  const shirt = mat(SHIRT, { roughness: 0.92 });
  const pants = mat(PANTS, { roughness: 0.9 });
  const shoes = mat(SHOES, { roughness: 0.7 });
  const dark = mat(0x241c17);

  /* --- Piernas (0 → 1.02) --- */
  const legs = new THREE.Group();
  for (const sx of [-1, 1]) {
    legs.add(part(0.17, 0.62, 0.19, pants, sx * 0.115, 0.35, 0));       // pantorrilla
    legs.add(part(0.2, 0.42, 0.22, pants, sx * 0.115, 0.83, 0));        // muslo
    legs.add(part(0.19, 0.1, 0.29, shoes, sx * 0.115, 0.05, 0.04));     // zapatilla
  }
  group.add(legs);

  /* --- Torso (1.02 → 1.63) --- */
  const torso = new THREE.Group();
  torso.position.y = 1.02;
  torso.add(part(0.46, 0.2, 0.25, pants, 0, 0.1, 0));                   // cadera
  const chest = part(0.5, 0.46, 0.27, shirt, 0, 0.42, 0);               // camiseta
  torso.add(chest);
  torso.add(part(0.56, 0.09, 0.27, shirt, 0, 0.645, 0));                // hombros
  group.add(torso);

  /* --- Brazos --- */
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sx * 0.29, 1.655, 0);
    arm.add(part(0.16, 0.3, 0.18, shirt, 0, -0.15, 0));                   // manga
    arm.add(part(0.12, 0.32, 0.13, skin, 0, -0.44, 0));                 // antebrazo
    arm.add(part(0.11, 0.14, 0.09, skin, 0, -0.66, 0.01));              // mano
    arm.userData.side = sx;
    group.add(arm);
    arms.push(arm);
  }

  /* --- Cabeza (1.63 → 1.93) --- */
  const head = new THREE.Group();
  head.position.y = 1.63;
  head.add(part(0.1, 0.09, 0.1, skin, 0, 0.045, 0));                    // cuello
  const skull = part(0.21, 0.25, 0.22, skin, 0, 0.2, 0);
  head.add(skull);
  // Pelo muy corto
  head.add(part(0.225, 0.09, 0.235, hair, 0, 0.295, -0.004));
  head.add(part(0.228, 0.1, 0.06, hair, 0, 0.225, -0.095));
  for (const sx of [-1, 1]) head.add(part(0.02, 0.12, 0.2, hair, sx * 0.104, 0.23, -0.01));
  // Barba recortada
  head.add(part(0.215, 0.11, 0.225, beard, 0, 0.115, 0.002));
  head.add(part(0.13, 0.045, 0.03, beard, 0, 0.185, 0.108));            // bigote
  // Ojos y cejas
  for (const sx of [-1, 1]) {
    head.add(part(0.045, 0.028, 0.02, dark, sx * 0.055, 0.222, 0.108));
    head.add(part(0.055, 0.018, 0.02, hair, sx * 0.056, 0.256, 0.108));
    head.add(part(0.022, 0.07, 0.045, skin, sx * 0.113, 0.205, -0.005)); // orejas
  }
  head.add(part(0.038, 0.055, 0.032, skin, 0, 0.202, 0.108));            // nariz
  group.add(head);

  /* --- Cota de altura (solo en la página de créditos) --- */
  const marker = new THREE.Group();
  const line = mat(0xffffff, { emissive: 0x88a0aa, emissiveIntensity: 0.4, roughness: 0.5 });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, HEIGHT, 6), line);
  rod.position.set(0.52, HEIGHT / 2, 0.18);
  marker.add(rod);
  for (const y of [0.01, HEIGHT]) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.028, 0.028), line);
    tick.position.set(0.42, y, 0.18);
    marker.add(tick);
  }
  const label = labelSprite('1,93 m');
  label.position.set(1.18, HEIGHT * 0.9, 0.18);
  marker.add(label);
  marker.visible = false;
  group.add(marker);

  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const api = {
    group,
    marker,
    /** Animación de reposo: respiración, balanceo y giro suave de la cabeza. */
    update(t) {
      chest.scale.y = 1 + Math.sin(t * 1.5) * 0.018;
      chest.position.y = 0.42 + Math.sin(t * 1.5) * 0.006;
      torso.rotation.y = Math.sin(t * 0.42) * 0.05;
      head.rotation.y = Math.sin(t * 0.31) * 0.22 - torso.rotation.y * 0.5;
      head.rotation.x = Math.sin(t * 0.55) * 0.045;
      head.position.y = 1.63 + Math.sin(t * 1.5) * 0.008;
      arms.forEach((arm) => {
        arm.rotation.x = Math.sin(t * 0.8 + (arm.userData.side > 0 ? 0.6 : 0)) * 0.055;
        arm.rotation.z = arm.userData.side * (0.05 + Math.sin(t * 0.6) * 0.02);
        arm.position.y = 1.655 + Math.sin(t * 1.5) * 0.007;
      });
      if (marker.visible) label.material.opacity = 0.85 + Math.sin(t * 2) * 0.1;
    },
    showMarker(on) {
      marker.visible = on;
    }
  };

  return api;
}
