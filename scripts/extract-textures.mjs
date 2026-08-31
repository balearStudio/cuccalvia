/**
 * Extrae texturas de las fotografías del edificio y las deja en public/textures/.
 *
 *   node scripts/extract-textures.mjs
 *
 * De cada recorte se elimina la iluminación (se resta un desenfoque fuerte y se
 * devuelve la media del parche), de modo que la textura queda plana: sin sombras
 * de árboles ni degradados del sol pegados al muro. Después se espeja en 2×2
 * para que sea continua al repetirse.
 *
 * Las fotos originales son pequeñas (822×313), así que estas texturas aportan el
 * color y el carácter reales del revoco; el detalle fino lo añade el ruido
 * procedural de scene/textures.js al superponerse.
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const SRC = 'public/images/cuc-fachada.jpg';
const OUT = 'public/textures';
mkdirSync(OUT, { recursive: true });

/**
 * Recortes en coordenadas de la foto original (822×313).
 *
 * `soften` desenfoca el mosaico ya espejado: el revoco real es liso y uniforme,
 * así que lo que aporta la foto es el color y las manchas de gran escala, no el
 * detalle fino — que a esta resolución no existe. Desenfocar elimina además el
 * patrón de caleidoscopio del espejado. El grano fino y las juntas los dibuja
 * encima scene/textures.js.
 */
const PATCHES = [
  // Franja de revoco soleado entre las ventanas altas y la sombra del arbolado
  { name: 'wall', left: 256, top: 177, width: 88, height: 22, size: 256, sigma: 5, soften: 11 },
  // Peldaños y pavimento de hormigón del acceso
  { name: 'paving', left: 430, top: 278, width: 132, height: 20, size: 256, sigma: 5, soften: 13 },
  // Murete de piedra de la derecha
  { name: 'stone', left: 652, top: 262, width: 140, height: 26, size: 256, sigma: 6, soften: 13 }
];

/** Zonas de las que solo se toma el color medio. */
const SAMPLES = {
  wall: [290, 180, 52, 22],        // revoco al sol
  wallShade: [214, 210, 34, 30],   // el mismo revoco en sombra
  soffit: [470, 105, 60, 14],      // intradós del gran vuelo sobre el pórtico
  column: [420, 150, 8, 110],      // fuste de una columna
  glass: [445, 160, 45, 100],      // muro cortina
  stone: [652, 262, 140, 26],
  paving: [430, 282, 132, 16]
};

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Quita la iluminación del parche: detalle = parche − desenfoque, sobre la media. */
async function flatten(buffer, sigma) {
  const base = sharp(buffer);
  const { data, info } = await base.clone().raw().toBuffer({ resolveWithObject: true });
  const blur = await sharp(buffer).blur(sigma).raw().toBuffer();
  const ch = info.channels;

  const mean = new Array(ch).fill(0);
  for (let i = 0; i < data.length; i += ch) for (let c = 0; c < ch; c++) mean[c] += data[i + c];
  const px = data.length / ch;
  for (let c = 0; c < ch; c++) mean[c] /= px;

  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += ch) {
    for (let c = 0; c < ch; c++) out[i + c] = clamp(mean[c] + (data[i + c] - blur[i + c]));
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: ch } });
}

/** Espeja el parche en 2×2 para que la repetición no tenga costuras. */
async function mirrorTile(image, size) {
  const half = Math.round(size / 2);
  const tile = await image.resize(half, half, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
  const flipX = await sharp(tile).flop().png().toBuffer();
  const flipY = await sharp(tile).flip().png().toBuffer();
  const flipXY = await sharp(tile).flip().flop().png().toBuffer();

  return sharp({ create: { width: size, height: size, channels: 3, background: '#000' } }).composite([
    { input: tile, left: 0, top: 0 },
    { input: flipX, left: half, top: 0 },
    { input: flipY, left: 0, top: half },
    { input: flipXY, left: half, top: half }
  ]);
}

const palette = {};
for (const [name, [left, top, width, height]] of Object.entries(SAMPLES)) {
  // stats() ignora las operaciones encadenadas: hay que materializar el recorte
  const crop = await sharp(SRC)
    .extract({ left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height) })
    .png()
    .toBuffer();
  const { channels } = await sharp(crop).stats();
  const hex = channels
    .slice(0, 3)
    .map((c) => Math.round(c.mean).toString(16).padStart(2, '0'))
    .join('');
  palette[name] = `#${hex}`;
}
writeFileSync(`${OUT}/palette.json`, `${JSON.stringify(palette, null, 2)}\n`);
console.log('palette', palette);

for (const p of PATCHES) {
  const patch = await sharp(SRC)
    .extract({ left: p.left, top: p.top, width: p.width, height: p.height })
    .png()
    .toBuffer();
  const flat = await flatten(patch, p.sigma);
  const tiled = await mirrorTile(flat, p.size);
  const field = p.soften ? tiled.blur(p.soften) : tiled;
  await field.png({ compressionLevel: 9 }).toFile(`${OUT}/${p.name}.png`);
  console.log(`${OUT}/${p.name}.png · ${p.size}×${p.size}`);
}
