import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { fileURLToPath } from 'url'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          index: fileURLToPath(new URL('src/renderer/index.html', import.meta.url)),
          game: fileURLToPath(new URL('src/renderer/game.html', import.meta.url))
        }
      }
    },
    plugins: [
      // Moved inside renderer config
      viteStaticCopy({
        // silent: true,
        targets: [
          {
            src: '/home/seom2/Desktop/sensor_lx/src/renderer/assets/models/*.glb',
            dest: 'assets/models'
          },
          {
            src: '/home/seom2/Desktop/sensor_lx/src/renderer/assets/environmentMap/*.hdr',
            dest: 'assets/environmentMap'
          }
        ]
      })
    ]
  }
})

// C:\Users\Usuario\Desktop\sensor\dist\win-unpacked\resources\app.asar.unpacked\resources
