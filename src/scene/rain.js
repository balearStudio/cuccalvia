import * as THREE from 'three';

/**
 * Lluvia: segmentos verticales que caen dentro de una caja que sigue a la
 * cámara, de modo que unas pocas miles de gotas bastan para toda la escena.
 */
export function createRain({ count = 4200, area = 70, height = 34 } = {}) {
  const positions = new Float32Array(count * 6); // dos vértices por gota
  const speeds = new Float32Array(count);
  const lengths = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * area;
    const y = Math.random() * height;
    const z = (Math.random() - 0.5) * area;
    lengths[i] = 0.35 + Math.random() * 0.5;
    speeds[i] = 26 + Math.random() * 16;
    positions[i * 6 + 0] = x;
    positions[i * 6 + 1] = y;
    positions[i * 6 + 2] = z;
    positions[i * 6 + 3] = x;
    positions[i * 6 + 4] = y - lengths[i];
    positions[i * 6 + 5] = z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0xc8d6dd,
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  });

  const mesh = new THREE.LineSegments(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.name = 'lluvia';

  const centre = new THREE.Vector3();

  return {
    mesh,
    /** `intensity` 0 = seco, 1 = chaparrón. */
    setIntensity(intensity) {
      mesh.visible = intensity > 0.01;
      material.opacity = 0.18 + intensity * 0.4;
      mesh.userData.intensity = intensity;
    },
    update(dt, camera) {
      if (!mesh.visible) return;
      const intensity = mesh.userData.intensity ?? 1;
      centre.copy(camera.position);
      const pos = geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const o = i * 6;
        const fall = speeds[i] * (0.5 + intensity * 0.6) * dt;
        pos[o + 1] -= fall;
        pos[o + 4] -= fall;
        if (pos[o + 4] < centre.y - height * 0.45) {
          const x = centre.x + (Math.random() - 0.5) * area;
          const z = centre.z + (Math.random() - 0.5) * area;
          const y = centre.y + height * 0.55;
          pos[o + 0] = x;
          pos[o + 1] = y;
          pos[o + 2] = z;
          pos[o + 3] = x;
          pos[o + 4] = y - lengths[i];
          pos[o + 5] = z;
        }
      }
      geometry.attributes.position.needsUpdate = true;
    }
  };
}
