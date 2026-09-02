import * as THREE from 'three';

/**
 * Texturas del edificio.
 *
 * Los materiales exteriores parten de las fotografías del CUC: scripts/
 * extract-textures.mjs recorta el revoco, el hormigón del acceso y el murete de
 * piedra, les quita la iluminación (sombras del arbolado, degradado del sol) y
 * los deja como campos de color continuos en public/textures/.
 *
 * Las fotos originales son de 822×313 px, así que aportan el color y las manchas
 * de gran escala reales, no el detalle fino — que a esa resolución no existe.
 * Ese detalle (grano del mortero, juntas horizontales del paño, veta de la
 * piedra) se dibuja aquí encima en un canvas. Lo que no aparece en las fotos
 * —césped, albero, madera— es enteramente procedural.
 */

/** Colores medidos sobre la fotografía (scripts/extract-textures.mjs). */
export const PHOTO = {
  wall: '#efd5ba', // revoco al sol: rosado cálido, no arena
  wallShade: '#ac9987', // el mismo revoco en sombra
  soffit: '#9b8264',
  column: '#787571', // fuste de una columna, en sombra
  glass: '#90918e', // muro cortina
  stone: '#e6d1b3',
  paving: '#e1d3ba',
  stamped: '#9e8c7b' // hormigón impreso del aparcamiento
};

const FILES = {
  wall: 'textures/wall.png',
  plaza: 'textures/plaza.png',
  paving: 'textures/paving.png',
  stone: 'textures/stone.png',
  stamped: 'textures/stamped.png'
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function finish(c, repeat = 1) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Grano fino: motas claras y oscuras sobre lo ya dibujado. */
function speckle(ctx, size, { seed = 1, amp = 14, density = 0.22, dotSize = 1.4 } = {}) {
  const rnd = mulberry32(seed);
  const dots = size * size * density;
  for (let i = 0; i < dots; i++) {
    const v = (rnd() - 0.5) * 2 * amp;
    const tone = v > 0 ? 255 : 0;
    ctx.fillStyle = `rgba(${tone},${tone},${tone},${Math.abs(v) / 255})`;
    ctx.fillRect(rnd() * size, rnd() * size, dotSize, dotSize);
  }
}

/** Manchas suaves de gran escala. */
function blotches(ctx, size, { seed = 2, count = 20, amp = 9 } = {}) {
  const rnd = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = size * (0.05 + rnd() * 0.2);
    const v = (rnd() - 0.5) * 2 * amp;
    const tone = v > 0 ? 255 : 0;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${tone},${tone},${tone},${Math.abs(v) / 255})`);
    g.addColorStop(1, `rgba(${tone},${tone},${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/** Juntas del paño: una línea en sombra con su reflejo claro debajo. */
function joints(ctx, size, { rows = 4, cols = 0, alpha = 0.1 } = {}) {
  ctx.lineWidth = 1;
  for (let i = 1; i <= rows; i++) {
    const y = Math.round((size / rows) * i) - 0.5;
    ctx.strokeStyle = `rgba(60,48,32,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,250,235,${alpha * 0.75})`;
    ctx.beginPath();
    ctx.moveTo(0, y + 1);
    ctx.lineTo(size, y + 1);
    ctx.stroke();
  }
  for (let i = 1; i <= cols; i++) {
    const x = Math.round((size / cols) * i) - 0.5;
    ctx.strokeStyle = `rgba(60,48,32,${alpha * 0.7})`;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
}

/** Mapa de relieve en gris a partir del canvas ya compuesto. */
function toBump(source, repeat) {
  const size = source.width;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) | 0;
    d[i] = d[i + 1] = d[i + 2] = l;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

/**
 * Campo de color fotográfico + detalle dibujado encima.
 *
 * `alpha` mezcla la foto sobre un color plano: por debajo de 1 la variación de
 * gran escala se atenúa, que es lo que evita que se lea el motivo repetido del
 * recorte cuando la textura se embaldosa sobre un paño grande.
 */
function fromPhoto(image, size, decorate, { base = PHOTO.wall, alpha = 1 } = {}) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  if (image) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, 0, 0, size, size);
    ctx.globalAlpha = 1;
  }
  decorate(ctx, size);
  return c;
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // sin foto se sigue con el color plano
    img.src = url;
  });
}

let cache = null;

/** Carga las fotos base. Debe llamarse antes de construir la escena. */
export async function initTextures(base = '') {
  const entries = await Promise.all(
    Object.entries(FILES).map(async ([key, file]) => [
      key,
      // En el empaquetado de un solo archivo las rutas ya son data URI
      await loadImage(file.startsWith('data:') ? file : base + file)
    ])
  );
  const photos = Object.fromEntries(entries);
  cache = build(photos);
  return cache;
}

/** Texturas ya construidas (initTextures debe haberse resuelto). */
export function buildTextures() {
  if (!cache) cache = build({});
  return cache;
}

function build(photos) {
  /* --- Revoco de la fachada: 1 baldosa = 2,2 m --- */
  // A resolución completa el recorte ya trae las juntas horizontales del paño y
  // el grano del mortero, así que la foto va casi pura: solo se le añade algo de
  // grano fino para que aguante de cerca.
  const wallCanvas = fromPhoto(photos.wall, 512, (ctx, size) => {
    speckle(ctx, size, { seed: 7, amp: 6, density: 0.5, dotSize: 1 });
  }, { base: PHOTO.wall, alpha: 0.92 });
  const wallRepeat = 1 / 2.3; // deja las juntas cada ~0,57 m, como en la fachada
  const wall = finish(wallCanvas, wallRepeat);
  const wallBump = toBump(wallCanvas, wallRepeat);

  /* --- Hormigón del acceso, peldaños y pavimentos: 1 baldosa = 3 m --- */
  const pavingCanvas = fromPhoto(photos.paving, 512, (ctx, size) => {
    blotches(ctx, size, { seed: 23, count: 14, amp: 5 });
    speckle(ctx, size, { seed: 21, amp: 12, density: 0.4, dotSize: 1.2 });
  }, { base: PHOTO.paving, alpha: 0.65 });
  const concrete = finish(pavingCanvas, 1 / 3);

  /* --- Losa de piedra de la explanada de acceso: 1 baldosa = 2,4 m --- */
  const plazaCanvas = fromPhoto(photos.plaza, 512, (ctx, size) => {
    blotches(ctx, size, { seed: 71, count: 16, amp: 6 });
    // Despiece de losas de 1,2 m
    ctx.strokeStyle = 'rgba(120,112,96,0.5)';
    ctx.lineWidth = 2;
    for (const p of [0, size / 2]) {
      ctx.beginPath();
      ctx.moveTo(p + 1, 0);
      ctx.lineTo(p + 1, size);
      ctx.moveTo(0, p + 1);
      ctx.lineTo(size, p + 1);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,252,244,0.35)';
    ctx.lineWidth = 1.5;
    for (const p of [3, size / 2 + 3]) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    speckle(ctx, size, { seed: 72, amp: 10, density: 0.35, dotSize: 1.2 });
  }, { base: PHOTO.stone, alpha: 0.8 });
  const plaza = finish(plazaCanvas, 1 / 2.4);

  /* --- Piedra de los muretes: 1 baldosa = 2,5 m --- */
  const stoneCanvas = fromPhoto(photos.stone, 512, (ctx, size) => {
    const rnd = mulberry32(9);
    const rows = 6;
    const h = size / rows;
    ctx.lineWidth = 2;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * 60;
      while (x < size) {
        const w = 50 + rnd() * 80;
        ctx.strokeStyle = `rgba(120,104,78,${0.16 + rnd() * 0.12})`;
        ctx.strokeRect(x, r * h, w, h);
        x += w;
      }
    }
    blotches(ctx, size, { seed: 31, count: 26, amp: 11 });
    speckle(ctx, size, { seed: 33, amp: 20, density: 0.24, dotSize: 1.6 });
  }, { base: PHOTO.stone, alpha: 0.7 });
  const stone = finish(stoneCanvas, 1 / 2.5);

  /* --- Césped (procedural: no hay foto útil) --- */
  const grassCanvas = (() => {
    const size = 512;
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const rnd = mulberry32(33);
    ctx.fillStyle = '#5c7a3c';
    ctx.fillRect(0, 0, size, size);
    blotches(ctx, size, { seed: 44, count: 40, amp: 22 });
    for (let i = 0; i < 26000; i++) {
      const g = 90 + rnd() * 70;
      ctx.strokeStyle = `rgba(${(g * 0.6) | 0},${g | 0},${(g * 0.45) | 0},0.5)`;
      ctx.lineWidth = 1;
      const x = rnd() * size;
      const y = rnd() * size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 3, y - 2 - rnd() * 3);
      ctx.stroke();
    }
    return c;
  })();
  const grass = finish(grassCanvas, 26);

  /* --- Albero de los caminos --- */
  const gravelCanvas = (() => {
    const size = 512;
    const c = canvas(size);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#c2a878';
    ctx.fillRect(0, 0, size, size);
    blotches(ctx, size, { seed: 51, count: 24, amp: 14 });
    speckle(ctx, size, { seed: 52, amp: 26, density: 0.45, dotSize: 2 });
    return c;
  })();
  const gravel = finish(gravelCanvas, 10);

  /* --- Hormigón impreso del aparcamiento: 1 baldosa = 4 m --- */
  const asphaltCanvas = fromPhoto(photos.stamped, 512, (ctx, size) => {
    speckle(ctx, size, { seed: 62, amp: 12, density: 0.35, dotSize: 1.4 });
  }, { base: PHOTO.stamped, alpha: 0.9 });
  const asphalt = finish(asphaltCanvas, 1 / 4);

  /* --- Terrazo de las plantas interiores (1 baldosa = 1,2 m) --- */
  const terrazzoCanvas = (() => {
    const size = 512;
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const rnd = mulberry32(88);
    ctx.fillStyle = '#dcddd0';
    ctx.fillRect(0, 0, size, size);
    const chips = ['#c6c8bc', '#a8ac9e', '#f0efe6', '#b6b2a2', '#8e9287'];
    for (let i = 0; i < 14000; i++) {
      ctx.fillStyle = chips[(rnd() * chips.length) | 0];
      ctx.globalAlpha = 0.5 + rnd() * 0.5;
      const r = 0.8 + rnd() * 2.0;
      ctx.beginPath();
      ctx.ellipse(rnd() * size, rnd() * size, r, r * (0.5 + rnd() * 0.8), rnd() * 3.14, 0, 6.29);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Juntas de las losas
    ctx.strokeStyle = 'rgba(140,142,130,0.5)';
    ctx.lineWidth = 1;
    for (const p of [0, size / 2]) {
      ctx.beginPath();
      ctx.moveTo(p + 0.5, 0);
      ctx.lineTo(p + 0.5, size);
      ctx.moveTo(0, p + 0.5);
      ctx.lineTo(size, p + 0.5);
      ctx.stroke();
    }
    return c;
  })();
  const terrazzo = finish(terrazzoCanvas, 1 / 1.2);

  /* --- Falso techo registrable de 60 × 60 cm (1 baldosa = 1,2 m) --- */
  const ceilingCanvas = (() => {
    const size = 512;
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const rnd = mulberry32(99);
    ctx.fillStyle = '#f4f4ef';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 26000; i++) {
      ctx.fillStyle = `rgba(150,150,140,${0.05 + rnd() * 0.14})`;
      ctx.fillRect(rnd() * size, rnd() * size, 1.6, 1.6);
    }
    ctx.strokeStyle = 'rgba(176,176,168,0.9)';
    ctx.lineWidth = 3;
    for (const p of [0, size / 2]) {
      ctx.beginPath();
      ctx.moveTo(p + 1.5, 0);
      ctx.lineTo(p + 1.5, size);
      ctx.moveTo(0, p + 1.5);
      ctx.lineTo(size, p + 1.5);
      ctx.stroke();
    }
    return c;
  })();
  const ceiling = finish(ceilingCanvas, 1 / 1.2);

  /* --- Madera clara del mobiliario --- */
  const woodCanvas = (() => {
    const size = 512;
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const rnd = mulberry32(77);
    ctx.fillStyle = '#c39a68';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 260; i++) {
      ctx.strokeStyle = `rgba(${(90 + rnd() * 60) | 0},${(60 + rnd() * 40) | 0},30,${0.05 + rnd() * 0.12})`;
      ctx.lineWidth = 0.6 + rnd() * 2.4;
      ctx.beginPath();
      const y = rnd() * size;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.33, y + (rnd() - 0.5) * 18, size * 0.66, y + (rnd() - 0.5) * 18, size, y + (rnd() - 0.5) * 8);
      ctx.stroke();
    }
    return c;
  })();
  const wood = finish(woodCanvas, 2);

  return { stucco: wall, stuccoBump: wallBump, concrete, plaza, stone, grass, gravel, asphalt, wood, terrazzo, ceiling };
}
