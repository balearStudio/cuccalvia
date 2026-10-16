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
  dispositius: '#f0c21a', // sala 1: amarilla, con portátil, tableta y móvil
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
  const W = 1536;
  const H = 640;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const rand = rng(5);

  ctx.fillStyle = '#1f2326';
  ctx.fillRect(0, 0, W, H);
  // Restos de borrado
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(210,220,225,${0.015 + rand() * 0.03})`;
    ctx.beginPath();
    ctx.ellipse(rand() * W, rand() * H, 30 + rand() * 90, 8 + rand() * 20, rand() * 3, 0, 6.29);
    ctx.fill();
  }

  // El nombre del centro, a tiza: trazo fino de letras altas y estrechas
  ctx.strokeStyle = 'rgba(236,240,242,0.82)';
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  ctx.font = '300 150px "Barlow Condensed", Barlow, "Arial Narrow", sans-serif';
  ctx.textAlign = 'left';
  ctx.save();
  ctx.translate(130, 250);
  ctx.rotate(-0.025);
  ctx.strokeText('CENTRE  UNIVERSITARI', 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(560, 470);
  ctx.rotate(-0.02);
  ctx.strokeText('DE  CALVIÀ', 0, 0);
  ctx.restore();

  // Círculos de color con sus campañas
  const disc = (x, y, r, fill, label, ink = '#ffffff') => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.font = `700 ${Math.round(r * 0.32)}px Barlow, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + r * 0.12);
  };
  disc(110, 95, 82, '#9bc93a', "CREA'T");
  disc(115, 560, 72, '#3a86d6', 'BRÚIXOLA');
  disc(1440, 300, 58, '#d8336f', '');
  disc(1400, 560, 46, '#ef8f2a', '');
  disc(70, 340, 40, '#f0c21a', '1', '#1f2326');

  // La «U» de bloques de colores
  const u = ['#2b6cd4', '#d3197e', '#9bc93a', '#f0c21a', '#17a79b', '#5b2d9b'];
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = u[i];
    ctx.fillRect(720 + (i < 3 ? 0 : 70), 40 + (i % 3) * 30, 26, 26);
  }
  ctx.fillStyle = u[2];
  ctx.fillRect(746, 100, 44, 26);

  // Carteles pegados: convocatoria, horarios, QR
  const poster = (x, y, w, h, head, rot) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#f7f6f2';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = head;
    ctx.fillRect(10, 10, w - 20, 22);
    ctx.fillStyle = 'rgba(40,60,90,0.45)';
    for (let l = 0; l < Math.floor((h - 60) / 18); l++) ctx.fillRect(12, 46 + l * 18, (w - 24) * (0.45 + rand() * 0.55), 6);
    ctx.restore();
  };
  poster(150, 380, 170, 220, '#2b6cd4', -0.03);
  poster(560, 300, 130, 150, '#ef8f2a', 0.02);
  poster(930, 290, 110, 170, '#3a86d6', -0.01);
  poster(1250, 80, 120, 160, '#5b2d9b', 0.02);
  // QR
  ctx.fillStyle = '#f7f6f2';
  ctx.fillRect(1050, 70, 90, 110);
  ctx.fillStyle = '#1b1b1b';
  for (let i = 0; i < 64; i++) if (rand() > 0.5) ctx.fillRect(1058 + (i % 8) * 9, 78 + Math.floor(i / 8) * 9, 9, 9);

  // Muñequitos recortados
  for (const [x, y] of [[240, 90], [520, 70], [880, 70], [1180, 420], [1490, 120], [700, 540], [760, 560]]) {
    ctx.fillStyle = ['#e8b48f', '#c98d6a', '#f0c9a8'][(x / 10) % 3 | 0];
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = ['#3a86d6', '#d8336f', '#2e8b45', '#1f1f1f'][(y / 10) % 4 | 0];
    ctx.fillRect(x - 13, y + 16, 26, 44);
    ctx.fillStyle = '#3b2a20';
    ctx.fillRect(x - 17, y - 18, 34, 10);
  }
  // Placa del Ajuntament abajo
  ctx.fillStyle = '#2f5fae';
  ctx.fillRect(960, 560, 220, 36);
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

/** Rótulo de varias líneas en negro, como el de la puerta de la sala infantil. */
export function wallLines(lines, { width = 1024, lineHeight = 120, size = 84 } = {}) {
  const c = canvas(width, lineHeight * lines.length + 40);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `700 ${size}px Barlow, Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, width / 2, 20 + lineHeight * (i + 0.5)));
  return texture(c);
}

/** Pared «SEGUEIX-NOS!» con los iconos de redes y los poliedros pintados. */
export function followUs() {
  const W = 1024;
  const H = 768;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const rand = rng(31);
  ctx.fillStyle = '#f7f7f4';
  ctx.fillRect(0, 0, W, H);
  // Poliedros sueltos por la pared
  for (const [x, y, r, i] of [[90, 130, 80, 0], [210, 330, 60, 2], [130, 600, 90, 4], [880, 120, 55, 1], [930, 560, 70, 5]]) {
    gem(ctx, x, y, r, GEM_COLORS[i], rand);
  }
  ctx.fillStyle = '#26324a';
  ctx.textAlign = 'center';
  ctx.font = '500 92px Barlow, Helvetica, Arial, sans-serif';
  ctx.letterSpacing = '12px';
  ctx.fillText('SEGUEIX-NOS!', W / 2, 300);
  ctx.letterSpacing = '0px';
  // Iconos de redes
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#26324a';
    ctx.fillRect(W / 2 - 170 + i * 90, 350, 66, 66);
  }
  ctx.font = '500 44px Barlow, Helvetica, Arial, sans-serif';
  ctx.fillText('@cucalvia', W / 2, 490);
  ctx.fillText('www.cucalvia.com', W / 2, 545);
  return texture(c);
}

/** Logotipo del centro: la «U» de triángulos de color del mostrador. */
export function logoPanel() {
  const S = 512;
  const c = canvas(S, S);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f7f4';
  ctx.fillRect(0, 0, S, S);
  const cell = 90;
  const ox = (S - cell * 3) / 2;
  const oy = (S - cell * 3) / 2;
  const cells = [
    [0, 0, '#d3197e', '#5b2d9b'], [2, 0, '#17a79b', '#2b6cd4'],
    [0, 1, '#e8c81e', '#d3197e'], [2, 1, '#2e8b45', '#e08a1e'],
    [0, 2, '#2b6cd4', '#17a79b'], [1, 2, '#e08a1e', '#e8c81e'], [2, 2, '#5b2d9b', '#2e8b45']
  ];
  for (const [i, j, a, b] of cells) {
    const x = ox + i * cell;
    const y = oy + j * cell;
    ctx.fillStyle = a;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + cell, y);
    ctx.lineTo(x, y + cell);
    ctx.fill();
    ctx.fillStyle = b;
    ctx.beginPath();
    ctx.moveTo(x + cell, y);
    ctx.lineTo(x + cell, y + cell);
    ctx.lineTo(x, y + cell);
    ctx.fill();
  }
  return texture(c);
}

/** Banderola vertical de la biblioteca, con su rotulación en gotas de color. */
export function banner(words, { color = '#a7c43a', drip = '#c9de6b', photo = 'people', title = '' } = {}) {
  const W = 256;
  const H = 1152;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const rand = rng(words.join('').length * 13 + color.length);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Cabecera: una foto virada al color de la banderola
  const PH = 380;
  ctx.fillStyle = drip;
  ctx.fillRect(0, 0, W, PH);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = color;
  if (photo === 'people') {
    // Caras y hombros de un grupo, en primer plano
    for (let i = 0; i < 9; i++) {
      const x = 20 + rand() * (W - 40);
      const y = 70 + rand() * (PH - 120);
      const r = 26 + rand() * 22;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.29);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, y + r * 2.2, r * 1.6, r * 1.1, 0, Math.PI, 0);
      ctx.fill();
    }
  } else if (photo === 'building') {
    // Una fachada con sus huecos
    ctx.fillRect(20, 120, W - 40, PH - 120);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#ffffff';
    for (let y = 150; y < PH - 30; y += 60) for (let x = 40; x < W - 50; x += 52) ctx.fillRect(x, y, 30, 36);
  } else {
    // Lomos de libros en una balda
    for (let x = 0; x < W; ) {
      const w = 10 + rand() * 18;
      ctx.globalAlpha = 0.3 + rand() * 0.5;
      ctx.fillRect(x, 90 + rand() * 40, w - 2, PH);
      x += w;
    }
  }
  ctx.globalAlpha = 1;
  if (title) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 40px Archivo, Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, 50);
  }

  // La pintura gotea desde la foto hacia el blanco
  ctx.fillStyle = drip;
  for (let x = 6; x < W; x += 26) {
    const len = 30 + rand() * 170;
    const w = 12 + rand() * 10;
    ctx.fillRect(x, PH - 4, w, len);
    ctx.beginPath();
    ctx.arc(x + w / 2, PH - 4 + len, w / 2, 0, 6.29);
    ctx.fill();
  }

  // Palabras en vertical, leídas de arriba abajo
  ctx.fillStyle = color;
  ctx.font = '700 58px Barlow, Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  words.forEach((word, i) => {
    ctx.save();
    ctx.translate(W / 2 + 34 - i * 58, PH + 140 + i * 70);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(word, 0, 0);
    ctx.restore();
  });
  return texture(c);
}

/** Cara de los cubos-taburete: triángulos de dos o tres colores. */
export function cubeFace(seed) {
  const S = 256;
  const c = canvas(S, S);
  const ctx = c.getContext('2d');
  const rand = rng(seed);
  const palette = ['#c0304a', '#2e8b45', '#2b4fa0', '#e08a1e', '#9bc93a', '#d3197e', '#23262b'];
  const pick = () => palette[(rand() * palette.length) | 0];
  const corners = [[0, 0], [S, 0], [S, S], [0, S]];
  const k = (rand() * 4) | 0;
  const [a, b, cc, d] = [0, 1, 2, 3].map((i) => corners[(i + k) % 4]);
  const tri = (p, q, r, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(...p);
    ctx.lineTo(...q);
    ctx.lineTo(...r);
    ctx.closePath();
    ctx.fill();
  };
  tri(a, b, d, pick());
  tri(b, cc, d, pick());
  if (rand() > 0.5) tri([S / 2, S / 2], b, cc, pick());
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, S, S);
  return texture(c);
}

/** Mural de la sala 1: sol amarillo, bandada de ocas y la consigna a mano. */
export function mural() {
  const W = 1536;
  const H = 768;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f5f5f1';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#efc52f';
  ctx.beginPath();
  ctx.arc(330, 420, 230, 0, 6.29);
  ctx.fill();
  ctx.fillStyle = '#2b2f33';
  const goose = (x, y, s) => {
    ctx.beginPath();
    ctx.moveTo(x - 60 * s, y - 30 * s);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 70 * s, y - 40 * s);
    ctx.lineTo(x + 8 * s, y + 14 * s);
    ctx.lineTo(x - 70 * s, y - 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x + 4 * s, y - 4 * s, 46 * s, 8 * s); // cuello
  };
  for (const [x, y, s] of [[200, 200, 1.1], [360, 290, 0.9], [520, 210, 1.2], [300, 480, 0.8], [650, 380, 0.7], [140, 380, 0.75]]) goose(x, y, s);
  ctx.fillStyle = '#1d1f22';
  ctx.font = '700 104px "Marker Felt", "Comic Sans MS", Barlow, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DESCOBREIX', 860, 300);
  ctx.fillText('ATREVEIX-TE', 860, 420);
  ctx.fillText('CREA', 860, 540);
  return texture(c);
}

/**
 * Letras macizas a partir de un texto: se rasteriza en un canvas pequeño y cada
 * píxel lleno se convierte en un bloque. Así salen las letras de bulto del
 * «#CUCALVIÀ» sin cargar ninguna tipografía 3D.
 */
export function blockLetterCells(text, { px = 16 } = {}) {
  const c = canvas(px * text.length, px + 6);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.font = `900 ${px}px Archivo, Helvetica, Arial, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, 1, 3);
  const width = Math.ceil(ctx.measureText(text).width) + 2;
  const data = ctx.getImageData(0, 0, width, c.height).data;
  const cells = [];
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 110) cells.push([x, c.height - 1 - y]);
    }
  }
  return { cells, width, height: c.height };
}

/** Panel «Calvià in Europe»: el mapa con las fotos de los intercambios. */
export function europeBoard() {
  const W = 1024;
  const H = 1000;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const rand = rng(77);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.font = '800 118px Archivo, Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#1f6fc4';
  ctx.fillText('CALVIÀ', 60, 150);
  ctx.font = '700 64px Archivo, Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#e8b51e';
  ctx.fillText('IN', 60, 260);
  ctx.font = '800 150px Archivo, Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#d6237a';
  ctx.fillText('EUR', 150, 280);
  ctx.fillText('PE', 640, 280);
  ctx.fillStyle = '#2e7fc9';
  ctx.beginPath();
  ctx.arc(540, 230, 70, 0, 6.29);
  ctx.fill();
  ctx.fillStyle = '#7cc04a';
  ctx.beginPath();
  ctx.arc(530, 220, 40, 0, 6.29);
  ctx.fill();
  // Mapa: manchas verdes que insinúan el continente
  ctx.fillStyle = '#a6d23f';
  for (let i = 0; i < 70; i++) {
    const x = 170 + rand() * 720;
    const y = 360 + rand() * 560;
    ctx.beginPath();
    ctx.ellipse(x, y, 30 + rand() * 70, 20 + rand() * 50, rand() * 3, 0, 6.29);
    ctx.fill();
  }
  // Fotos colgadas con hilo
  for (let i = 0; i < 9; i++) {
    const x = (i % 3 < 1 ? 70 : 760) + rand() * 120;
    const y = 380 + rand() * 520;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, 90, 70);
    ctx.fillStyle = ['#3a6ea8', '#c46a38', '#4a8a52'][i % 3];
    ctx.fillRect(x + 6, y + 6, 78, 50);
  }
  return texture(c);
}

/** Letras BECA en mosaico de colores, como en la pared del rellano. */
export function becaLetters() {
  const W = 1024;
  const H = 512;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.font = '900 360px Archivo, Helvetica, Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2b2f3a';
  ctx.fillText('BEC', 40, 260);
  // La A, hecha de cuadraditos de colores
  const colors = ['#d3197e', '#17a79b', '#e8c81e', '#2b6cd4', '#e08a1e', '#5b2d9b'];
  const ax = 760;
  const ay = 100;
  for (let j = 0; j < 6; j++) {
    for (let i = 0; i < 5; i++) {
      const inA = j === 2 || i === 0 || i === 4 || j === 0;
      if (!inA) continue;
      ctx.fillStyle = colors[(i + j) % colors.length];
      ctx.fillRect(ax + i * 48, ay + j * 52, 44, 48);
    }
  }
  return texture(c);
}
