import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` inlines everything (including three.js) into one dist/index.html
export default defineConfig({
  plugins: [viteSingleFile()],
  server: { host: true },
  preview: { host: true },
});
