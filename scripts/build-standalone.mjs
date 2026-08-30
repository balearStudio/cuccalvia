/**
 * Empaqueta dist/ en un único archivo HTML autocontenido: el JS y el CSS van
 * en línea y las fotografías se incrustan como data URI. Útil para compartir la
 * web sin servidor o para publicarla como página suelta.
 *
 *   node scripts/build-standalone.mjs [salida.html] [--fragment]
 *
 * Con --fragment se omiten <!doctype>, <html>, <head> y <body> (formato de los
 * Artifacts de Claude, que aportan su propio esqueleto).
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const root = resolve(process.argv[1], '../..');
const dist = join(root, 'dist');
const outPath = process.argv[2] || join(dist, 'cuc-standalone.html');
const fragment = process.argv.includes('--fragment');

const html = readFileSync(join(dist, 'index.html'), 'utf8');

const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const images = readdirSync(join(dist, 'images'));

const assetsDir = join(dist, 'assets');
const files = readdirSync(assetsDir);
const cssFile = files.find((f) => f.endsWith('.css'));
const jsFile = files.find((f) => f.endsWith('.js'));

let css = readFileSync(join(assetsDir, cssFile), 'utf8');
let js = readFileSync(join(assetsDir, jsFile), 'utf8');

// Fotografías → data URI (el bundle las referencia como "images/archivo.jpg")
for (const name of images) {
  const type = mime[extname(name).toLowerCase()];
  if (!type) continue;
  const data = readFileSync(join(dist, 'images', name)).toString('base64');
  const uri = `data:${type};base64,${data}`;
  for (const ref of [`images/${name}`, `./images/${name}`, `/images/${name}`]) {
    js = js.split(ref).join(uri);
  }
}

// El cierre de script dentro de una cadena rompería el <script> que lo envuelve
const safeJs = js.split('</script>').join('<\\/script>');

const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [, 'CUC Calvià'])[1];
const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/) || [, ''])[1]
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .trim();

const head = `<title>${title}</title>\n<style>\n${css}\n</style>`;
const tail = `<script type="module">\n${safeJs}\n</script>`;

const output = fragment
  ? `${head}\n${body}\n${tail}\n`
  : `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
${head}
</head>
<body>
${body}
${tail}
</body>
</html>
`;

writeFileSync(outPath, output);
console.log(`${outPath} · ${(output.length / 1024 / 1024).toFixed(2)} MB`);
