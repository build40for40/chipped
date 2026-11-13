import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import { fakeApi } from './dev/fake-api'

export default defineConfig({
  base: '/chipped/',
  build: {
    outDir: 'dist/chipped',
    // Two pages: Water Marble at /chipped/ (the site), and the almanac kept, unlinked, at /chipped/almanac/.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        almanac: fileURLToPath(new URL('./almanac/index.html', import.meta.url)),
      },
    },
  },
  server: {
    proxy: {
      '/chipped/api': 'http://localhost:8787',
    },
  },
  plugins: [vue(), vueDevTools(), fakeApi()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
