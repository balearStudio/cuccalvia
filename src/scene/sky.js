import * as THREE from 'three';

/**
 * Cúpula de cielo con degradado, sol y algo de bruma sobre el horizonte.
 * También sirve como fuente del mapa de entorno (reflejos del vidrio).
 */

const vert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const frag = /* glsl */ `
  varying vec3 vWorld;
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uBottom;
  uniform vec3 uSun;
  uniform vec3 uSunColor;

  // Ruido de valor sencillo para las nubes
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 dir = normalize(vWorld);
    float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

    vec3 col = mix(uBottom, uMid, smoothstep(0.42, 0.56, h));
    col = mix(col, uTop, smoothstep(0.55, 0.95, h));

    // Sol y halo
    float d = max(dot(dir, normalize(uSun)), 0.0);
    col += uSunColor * pow(d, 900.0) * 3.2;
    col += uSunColor * pow(d, 12.0) * 0.16;

    // Nubes altas
    if (dir.y > 0.02) {
      vec2 uv = dir.xz / max(dir.y, 0.06) * 0.24;
      float c = fbm(uv * 1.6 + vec2(3.0, 1.0));
      c = smoothstep(0.52, 0.92, c) * smoothstep(0.02, 0.30, dir.y);
      col = mix(col, vec3(1.0, 0.99, 0.97), c * 0.75);
    }

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export function createSky(sunDirection) {
  const geometry = new THREE.SphereGeometry(1, 48, 32);
  const material = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color('#1f6fae') },
      uMid: { value: new THREE.Color('#8ec4e2') },
      uBottom: { value: new THREE.Color('#dfe9e4') },
      uSun: { value: sunDirection.clone() },
      uSunColor: { value: new THREE.Color('#fff3d8') }
    }
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(600);
  mesh.frustumCulled = false;
  mesh.name = 'sky';
  return mesh;
}

/** Genera el mapa de entorno (PMREM) a partir de la propia cúpula. */
export function skyEnvironment(renderer, sunDirection) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const scene = new THREE.Scene();
  scene.add(createSky(sunDirection));
  const target = pmrem.fromScene(scene, 0.04);
  pmrem.dispose();
  return target.texture;
}
