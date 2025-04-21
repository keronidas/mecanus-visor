import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./src/renderer/index.html', import.meta.url)),
        game: fileURLToPath(new URL('./src/renderer/game.html', import.meta.url)),
        camera: fileURLToPath(new URL('./src/renderer/camera.html', import.meta.url))
      }
    }
  },
  base: './'
});