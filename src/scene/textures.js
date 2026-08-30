import * as THREE from 'three';

/* Texturas generadas por código (canvas): sin descargas, cero dependencias. */

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

function finish(c, repeat = 1, aniso = 8) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = aniso;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Ruido granulado genérico sobre un color base. */
function grain(size, base, opts = {}) {
  const { seed = 1, dots = size * size * 0.22, amp = 14, dotSize = 1.4, blobs = 0, blobAmp = 8 } = opts;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const rnd = mulberry32(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < blobs; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = size * (0.05 + rnd() * 0.18);
    const d = (rnd() - 0.5) * 2 * blobAmp;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const sign = d > 0 ? 255 : 0;
    g.addColorStop(0, `rgba(${sign},${sign},${sign},${Math.abs(d) / 255})`);
    g.addColorStop(1, `rgba(${sign},${sign},${sign},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  for (let i = 0; i < dots; i++) {
    const v = (rnd() - 0.5) * 2 * amp;
    const sign = v > 0 ? 255 : 0;
    ctx.fillStyle = `rgba(${sign},${sign},${sign},${Math.abs(v) / 255})`;
    ctx.fillRect(rnd() * size, rnd() * size, dotSize, dotSize);
  }
  return c;
}

/** Mapa de relieve en escala de grises a partir del mismo ruido. */
function toBump(sourceCanvas) {
  const size = sourceCanvas.width;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) | 0;
    d[i] = d[i + 1] = d[i + 2] = l;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

let cache = null;

export function buildTextures() {
  if (cache) return cache;

  // Revoco / mortero color arena de la fachada
  const stuccoC = grain(512, '#dcd0b8', { seed: 7, amp: 18, dots: 90000, blobs: 26, blobAmp: 10 });
  const stucco = finish(stuccoC, 4);
  const stuccoBump = toBump(stuccoC);
  stuccoBump.repeat.set(4, 4);

  // Hormigón visto (zócalo, escalinata, pavimento del pórtico)
  const concreteC = grain(512, '#c9c3b6', { seed: 21, amp: 16, dots: 70000, blobs: 18, blobAmp: 9 });
  const concrete = finish(concreteC, 3);

  // Césped
  const grassC = (() => {
    const size = 512;
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const rnd = mulberry32(33);
    ctx.fillStyle = '#5c7a3c';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 60; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = size * (0.06 + rnd() * 0.2);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${100 + rnd() * 40 | 0},${130 + rnd() * 40 | 0},60,0.30)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
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
  const grass = finish(grassC, 26);

  // Gravilla / albero de los caminos
  const gravelC = grain(512, '#c2a878', { seed: 51, amp: 26, dots: 120000, dotSize: 2, blobs: 20, blobAmp: 12 });
  const gravel = finish(gravelC, 10);

  // Piedra de los muretes: mampostería mallorquina (marés)
  const stoneC = (() => {
    const size = 512;
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const rnd = mulberry32(9);
    ctx.fillStyle = '#8e8271';
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const h = size / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * 60;
      while (x < size) {
        const w = 40 + rnd() * 70;
        const tone = 150 + rnd() * 60;
        ctx.fillStyle = `rgb(${tone | 0},${(tone * 0.94) | 0},${(tone * 0.82) | 0})`;
        ctx.fillRect(x + 2, r * h + 2, w - 4, h - 4);
        x += w;
      }
    }
    for (let i = 0; i < 40000; i++) {
      const v = (rnd() - 0.5) * 30;
      ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 255})`;
      ctx.fillRect(rnd() * size, rnd() * size, 2, 2);
    }
    return c;
  })();
  const stone = finish(stoneC, 5);

  // Madera clara para el mobiliario interior
  const woodC = (() => {
    const size = 512;
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const rnd = mulberry32(77);
    ctx.fillStyle = '#c39a68';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 260; i++) {
      ctx.strokeStyle = `rgba(${90 + rnd() * 60 | 0},${60 + rnd() * 40 | 0},30,${0.05 + rnd() * 0.12})`;
      ctx.lineWidth = 0.6 + rnd() * 2.4;
      ctx.beginPath();
      const y = rnd() * size;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.33, y + (rnd() - 0.5) * 18, size * 0.66, y + (rnd() - 0.5) * 18, size, y + (rnd() - 0.5) * 8);
      ctx.stroke();
    }
    return c;
  })();
  const wood = finish(woodC, 2);

  cache = { stucco, stuccoBump, concrete, grass, gravel, stone, wood };
  return cache;
}
