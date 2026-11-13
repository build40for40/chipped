import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import { fakeApi } from './dev/fake-api'

export default defineConfig({
  base: '/chipped/',
  build: {
    outDir: 'dist/chipped',
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
