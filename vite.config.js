import { defineConfig } from 'vite';

export default defineConfig({
  // Ruta relativa para que funcione tanto en la raiz de un dominio
  // como en un subdirectorio (por ejemplo GitHub Pages).
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  },
  server: {
    host: true,
    port: 5173
  }
});
