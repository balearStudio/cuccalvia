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

/**
 * Las fotografías de partida están en reference/photos/ a resolución completa
 * (2048 px): no se sirven con la web, solo alimentan este script. En
 * public/images/ van copias ligeras, que son las que muestra el botón
 * «Foto real».
 */
const SRC = 'reference/photos/fachada-frontal.jpg';
const PARKING = 'reference/photos/aparcamiento.jpg';
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
  // Paño de revoco al sol, entre juntas y sin sombra de arbolado.
  // A esta resolución el recorte ya trae la junta horizontal y el grano del
  // mortero de verdad, así que apenas hace falta suavizar.
  { name: 'wall', left: 420, top: 515, width: 210, height: 120, size: 512, sigma: 9, soften: 2 },
  // Losa de piedra caliza del rellano de acceso
  { name: 'plaza', left: 560, top: 890, width: 420, height: 90, size: 512, sigma: 9, soften: 12 },
  // Peldaños de la escalinata
  { name: 'paving', left: 700, top: 832, width: 320, height: 52, size: 384, sigma: 7, soften: 10 },
  // Muretes y antepechos, de la misma piedra
  { name: 'stone', left: 560, top: 890, width: 420, height: 90, size: 384, sigma: 9, soften: 12 },
  // Hormigón impreso del aparcamiento, con su despiece en abanico
  { name: 'stamped', left: 520, top: 1080, width: 560, height: 180, size: 512, sigma: 11, soften: 3, src: PARKING }
];

/** Zonas de las que solo se toma el color medio. */
const SAMPLES = {
  wall: [430, 520, 180, 100],      // revoco al sol
  wallShade: [180, 620, 120, 90],  // el mismo revoco en sombra
  soffit: [980, 300, 220, 40],     // intradós del gran vuelo sobre el pórtico
  column: [1010, 480, 22, 200],    // fuste de una columna
  glass: [1160, 500, 90, 200],     // muro cortina
  stone: [560, 890, 420, 90],
  paving: [700, 835, 320, 50],
  stamped: [520, 1080, 560, 180]
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
  const crop = await sharp(name === 'stamped' ? PARKING : SRC)
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
  const patch = await sharp(p.src ?? SRC)
    .extract({ left: p.left, top: p.top, width: p.width, height: p.height })
    .png()
    .toBuffer();
  const flat = await flatten(patch, p.sigma);
  const tiled = await mirrorTile(flat, p.size);
  const field = p.soften ? tiled.blur(p.soften) : tiled;
  await field.png({ compressionLevel: 9 }).toFile(`${OUT}/${p.name}.png`);
  console.log(`${OUT}/${p.name}.png · ${p.size}×${p.size}`);
}
