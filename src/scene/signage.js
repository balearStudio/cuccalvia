import * as THREE from 'three';

/**
 * Identidad gráfica del CUC, dibujada en canvas.
 *
 * El centro señaliza cada puerta con una tira vertical: una banda de color con
 * el nombre de la sala y su pictograma, y debajo, sobre blanco, los poliedros
 * facetados de dos tonos que son la marca del centro. Cada estancia tiene su
 * color.
 */

/** Paleta de las bandas de señalética, tomada de las fotografías. */
export const ROOM_COLORS = {
  oficina: '#5b2d9b',
  informatica: '#c0247b',
  estudi: '#23a9dc',
  grup: '#17a79b'
};

/** Colores de los poliedros de la marca. */
const GEM_COLORS = [
  ['#2e8b45', '#e08a1e'],
  ['#d3197e', '#17a79b'],
  ['#2b6cd4', '#5b2d9b'],
  ['#e8c81e', '#2e8b45'],
  ['#35bfd6', '#c0247b'],
  ['#e08a1e', '#d3197e']
];

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function texture(c, transparent = false) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  void transparent;
  return tex;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un poliedro facetado: dos caras claras y dos oscuras sobre el mismo cuerpo. */
function gem(ctx, cx, cy, r, [a, b], rand) {
  const sides = 5 + Math.floor(rand() * 2);
  const turn = rand() * Math.PI * 2;
  const points = [];
  for (let i = 0; i < sides; i++) {
    const ang = turn + (i / sides) * Math.PI * 2;
    const rr = r * (0.72 + rand() * 0.38);
    points.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
  }
  // Un vértice interior desde el que se abren las facetas
  const ix = cx + (rand() - 0.5) * r * 0.5;
  const iy = cy + (rand() - 0.5) * r * 0.5;

  for (let i = 0; i < sides; i++) {
    const p = points[i];
    const q = points[(i + 1) % sides];
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.closePath();
    const tone = i % 2 === 0 ? a : b;
    ctx.fillStyle = tone;
    ctx.globalAlpha = 0.75 + (i / sides) * 0.25;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Pictogramas de las bandas, trazados a mano alzada. */
function icon(ctx, kind, cx, cy, s) {
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = s * 0.07;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (kind === 'oficina') {
    ctx.strokeRect(cx - s * 0.45, cy - s * 0.05, s * 0.9, s * 0.12); // sobre
    ctx.strokeRect(cx - s * 0.42, cy - s * 0.46, s * 0.42, s * 0.34); // monitor
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.21, cy - s * 0.12);
    ctx.lineTo(cx - s * 0.21, cy - s * 0.05);
    ctx.stroke();
    ctx.strokeRect(cx + s * 0.1, cy + s * 0.07, s * 0.32, s * 0.4); // cajonera
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.16, cy - s * 0.4);
    ctx.lineTo(cx + s * 0.16, cy - s * 0.06);
    ctx.moveTo(cx + s * 0.3, cy - s * 0.34);
    ctx.lineTo(cx + s * 0.3, cy - s * 0.06);
    ctx.stroke(); // lápices
  } else if (kind === 'grup') {
    for (const [dx, r] of [
      [-0.3, 0.13],
      [0, 0.16],
      [0.3, 0.13]
    ]) {
      ctx.beginPath();
      ctx.arc(cx + dx * s, cy - s * 0.2, r * s, 0, 6.29);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + dx * s, cy + s * 0.34, r * s * 1.9, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else if (kind === 'informatica') {
    ctx.strokeRect(cx - s * 0.46, cy - s * 0.3, s * 0.44, s * 0.32); // portátil
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.52, cy + s * 0.06);
    ctx.lineTo(cx + s * 0.04, cy + s * 0.06);
    ctx.stroke();
    ctx.strokeRect(cx + s * 0.1, cy - s * 0.32, s * 0.2, s * 0.42); // tableta
    ctx.strokeRect(cx + s * 0.36, cy - s * 0.26, s * 0.14, s * 0.34); // móvil
  } else {
    // Sala de estudio: libro abierto y cuaderno
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.44, cy - s * 0.22);
    ctx.lineTo(cx - s * 0.02, cy - s * 0.14);
    ctx.lineTo(cx - s * 0.02, cy + s * 0.28);
    ctx.lineTo(cx - s * 0.44, cy + s * 0.2);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.44, cy - s * 0.22);
    ctx.lineTo(cx + s * 0.02, cy - s * 0.14);
    ctx.lineTo(cx + s * 0.02, cy + s * 0.28);
    ctx.lineTo(cx + s * 0.44, cy + s * 0.2);
    ctx.closePath();
    ctx.stroke();
  }
}

/**
 * Tira de jamba: banda de color con el rótulo arriba y poliedros debajo.
 * `title` admite un número destacado, como en «sala 3 d'estudi».
 */
export function doorStrip({ title, number = '', color, iconKind, seed = 1 }) {
  const W = 256;
  const H = 1536;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const rand = rng(seed);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Banda de color
  const bandH = 470;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, bandH);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const lines = title.split('\n');
  ctx.font = '600 62px Barlow, Helvetica, Arial, sans-serif';
  let y = 150;
  for (const line of lines) {
    if (number && line.includes('§')) {
      // El número va en grande, pegado al texto
      const [before, after] = line.split('§');
      ctx.font = '600 60px Barlow, Helvetica, Arial, sans-serif';
      const wBefore = ctx.measureText(before).width;
      ctx.font = '700 96px Barlow, Helvetica, Arial, sans-serif';
      const wNum = ctx.measureText(number).width;
      const wAfter = (() => {
        ctx.font = '600 60px Barlow, Helvetica, Arial, sans-serif';
        return ctx.measureText(after).width;
      })();
      const total = wBefore + wNum + wAfter;
      let x = W / 2 - total / 2;
      ctx.textAlign = 'left';
      ctx.font = '600 60px Barlow, Helvetica, Arial, sans-serif';
      ctx.fillText(before, x, y);
      x += wBefore;
      ctx.font = '700 96px Barlow, Helvetica, Arial, sans-serif';
      ctx.fillText(number, x, y + 6);
      x += wNum;
      ctx.font = '600 60px Barlow, Helvetica, Arial, sans-serif';
      ctx.fillText(after, x, y);
      ctx.textAlign = 'center';
    } else {
      ctx.fillText(line, W / 2, y);
    }
    y += 76;
  }
  icon(ctx, iconKind, W / 2, bandH - 130, 150);

  // Poliedros sobre el blanco
  let cy = bandH + 190;
  let i = 0;
  while (cy < H - 120) {
    const r = 60 + rand() * 55;
    const cx = W / 2 + (rand() - 0.5) * 60;
    gem(ctx, cx, cy, r, GEM_COLORS[i % GEM_COLORS.length], rand);
    cy += r * 2 + 60 + rand() * 70;
    i++;
  }

  return texture(c);
}

/** Rótulo de pared con letras negras, como el BIBLIOTECA de la sala de lectura. */
export function wallLettering(text, { width = 2048, height = 512, size = 300, color = '#141414' } = {}) {
  const c = canvas(width, height);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px Archivo, Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = `${size * 0.04}px`;
  ctx.fillText(text, width / 2, height / 2);
  const tex = texture(c);
  return tex;
}

/** Pizarra del pasillo, con el nombre del centro escrito con tiza. */
export function chalkboard() {
  const W = 1024;
  const H = 640;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const rand = rng(5);

  ctx.fillStyle = '#22262a';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40000; i++) {
    ctx.fillStyle = `rgba(210,220,225,${rand() * 0.05})`;
    ctx.fillRect(rand() * W, rand() * H, 2, 2);
  }
  ctx.strokeStyle = 'rgba(230,238,240,0.85)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.font = '700 96px Archivo, Helvetica, Arial, sans-serif';
  ctx.fillStyle = 'rgba(236,242,244,0.9)';
  ctx.textAlign = 'left';
  ctx.fillText('CENTRE', 70, 220);
  ctx.fillText('UNIVERSITARI', 70, 330);
  ctx.fillText('DE CALVIÀ', 70, 440);

  // Cartelería pegada
  const posters = [
    ['#f2f2ee', 700, 90, 250, 180],
    ['#e8eef4', 700, 300, 250, 200],
    ['#f6d9e6', 620, 120, 60, 60]
  ];
  for (const [fill, x, y, w, h] of posters) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(40,60,90,0.35)';
    for (let l = 0; l < 6; l++) ctx.fillRect(x + 14, y + 22 + l * 22, w - 28 - rand() * 40, 7);
  }
  return texture(c);
}

/** Panel de corcho / rejilla azul con carteles, como el de la biblioteca. */
export function noticeboard() {
  const W = 768;
  const H = 512;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const rand = rng(12);

  ctx.fillStyle = '#f4f4f0';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(120,130,140,0.5)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  const tints = ['#ffffff', '#ffe9a8', '#cfe6f7', '#f8d3e4', '#d8f0d6'];
  for (let i = 0; i < 12; i++) {
    const w = 90 + rand() * 70;
    const h = 120 + rand() * 90;
    const x = rand() * (W - w);
    const y = rand() * (H - h);
    ctx.fillStyle = tints[(rand() * tints.length) | 0];
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(50,70,100,0.4)';
    ctx.fillRect(x + 8, y + 10, w - 16, 14);
    for (let l = 0; l < 5; l++) ctx.fillRect(x + 8, y + 36 + l * 14, (w - 16) * (0.5 + rand() * 0.5), 5);
  }
  return texture(c);
}
