import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // _borrowed/ holds unwired reference code from earlier days; its tests run only once a file moves into src/ or worker/.
      exclude: ['**/node_modules/**', '_borrowed/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
