import * as THREE from 'three';

/**
 * Cúpula de cielo: degradado, sol, nubes, estrellas y luna.
 *
 * Todo se controla por uniformes para que el módulo de atmósfera pueda pasar de
 * un mediodía despejado a un atardecer nublado o a una noche estrellada sin
 * reconstruir nada. También es la fuente del mapa de entorno (los reflejos del
 * vidrio), que se regenera cuando cambia el estado.
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
  uniform vec3 uCloudLit;
  uniform vec3 uCloudDark;
  uniform float uCloud;     // cobertura nubosa 0..1
  uniform float uNight;     // 0 de día, 1 de noche cerrada
  uniform float uSunDisc;   // 0 oculta el disco solar
  uniform float uTime;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hash3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }

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

    // Estrellas (solo de noche)
    if (uNight > 0.01 && dir.y > 0.0) {
      vec3 cell = floor(dir * 220.0);
      float s = hash3(cell);
      if (s > 0.9965) {
        float tw = 0.6 + 0.4 * sin(uTime * 2.0 + s * 100.0);
        col += vec3(0.9, 0.93, 1.0) * (s - 0.9965) * 260.0 * tw * uNight * smoothstep(0.0, 0.25, dir.y);
      }
    }

    // Sol (o luna: el color y el tamaño los fija la atmósfera)
    float d = max(dot(dir, normalize(uSun)), 0.0);
    col += uSunColor * pow(d, 900.0) * 3.2 * uSunDisc;
    col += uSunColor * pow(d, 12.0) * 0.16 * uSunDisc * (1.0 - uCloud * 0.7);

    // Nubes: la cobertura baja el umbral, así que cubren más cielo
    if (dir.y > 0.02) {
      vec2 uv = dir.xz / max(dir.y, 0.06) * 0.24;
      float c = fbm(uv * 1.6 + vec2(3.0 + uTime * 0.004, 1.0));
      float lo = mix(0.62, 0.20, uCloud);
      float hi = mix(0.95, 0.55, uCloud);
      c = smoothstep(lo, hi, c) * smoothstep(0.02, 0.30, dir.y);
      vec3 cloud = mix(uCloudLit, uCloudDark, uCloud);
      col = mix(col, cloud, c * mix(0.55, 0.96, uCloud));
    }

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Valores por defecto: mediodía despejado de verano. */
export function defaultSkyUniforms(sunDirection) {
  return {
    uTop: { value: new THREE.Color('#1f6fae') },
    uMid: { value: new THREE.Color('#8ec4e2') },
    uBottom: { value: new THREE.Color('#dfe9e4') },
    uSun: { value: sunDirection.clone() },
    uSunColor: { value: new THREE.Color('#fff3d8') },
    uCloudLit: { value: new THREE.Color('#fffdf8') },
    uCloudDark: { value: new THREE.Color('#8d949c') },
    uCloud: { value: 0.25 },
    uNight: { value: 0 },
    uSunDisc: { value: 1 },
    uTime: { value: 0 }
  };
}

export function createSky(sunDirection) {
  const uniforms = defaultSkyUniforms(sunDirection);
  const material = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), material);
  mesh.scale.setScalar(600);
  mesh.frustumCulled = false;
  mesh.name = 'cielo';
  return { mesh, uniforms };
}

/**
 * Mapa de entorno a partir del propio cielo. Se vuelve a generar cada vez que
 * cambia el estado atmosférico; devuelve la textura y libera la anterior.
 */
export function skyEnvironment(renderer, uniforms, previous = null) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const scene = new THREE.Scene();
  const sky = createSky(uniforms.uSun.value);
  for (const [key, u] of Object.entries(uniforms)) {
    if (u.value && u.value.isColor) sky.uniforms[key].value.copy(u.value);
    else if (u.value && u.value.isVector3) sky.uniforms[key].value.copy(u.value);
    else sky.uniforms[key].value = u.value;
  }
  scene.add(sky.mesh);

  const target = pmrem.fromScene(scene, 0.04);
  pmrem.dispose();
  sky.mesh.geometry.dispose();
  sky.mesh.material.dispose();
  previous?.dispose();
  return target.texture;
}
