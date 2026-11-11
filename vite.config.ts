import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { transform } from 'esbuild'
import checker from 'vite-plugin-checker'
import { defineConfig, type Plugin } from 'vitest/config'

// `npm test` checks your work in src/N-begin.ts, `npm run test:solution` checks src/N-end.ts
const target = process.env.SOLUTION ? 'end' : 'begin'
const root = import.meta.dirname

// Vite's own transformer only knows legacy decorators, and browsers do not run standard ones yet.
// Files that use standard (TC39) decorators go through esbuild first, which lowers them.
function standardDecorators(): Plugin {
  return {
    name: 'standard-decorators',
    enforce: 'pre',
    async transform(code, id) {
      if (!/\.ts$/.test(id) || !/^\s*@\w/m.test(code)) return null
      const result = await transform(code, {
        loader: 'ts',
        target: 'es2022',
        sourcefile: id,
        sourcemap: true,
        tsconfigRaw: { compilerOptions: { experimentalDecorators: false, useDefineForClassFields: true } },
      })
      return { code: result.code, map: result.map }
    },
  }
}

// During `npm run dev`, vite-plugin-checker runs TypeScript 7 in watch mode. Its own overlay is hidden:
// it would list every exercise. Each page shows only the errors of its own file (src/_internal/nav.ts).
// It stays out of tests and builds.
const typeErrorsInPage = () => checker({
  typescript: { tsconfigPath: './tsconfig.json' },
  overlay: { initialIsOpen: false, badgeStyle: 'display: none;', panelStyle: 'display: none;' },
  enableBuild: false,
})

// every N-begin.html / N-end.html page at the root is an entry
const pages = readdirSync(root).filter(file => file.endsWith('.html'))

export default defineConfig({
  plugins: [standardDecorators(), ...(process.env.VITEST ? [] : [typeErrorsInPage()])],
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map(page => [page.replace('.html', ''), resolve(root, page)])),
    },
  },
  resolve: {
    alias: [
      { find: /^#exercise\/(\d+)$/, replacement: resolve(root, `src/$1-${target}.ts`) },
    ],
  },
  test: {
    include: ['tests/**/*.test.ts'],
    typecheck: {
      enabled: true,
      include: ['tests/**/*.test-d.ts'],
      tsconfig: target === 'end' ? './tsconfig.tests.solution.json' : './tsconfig.tests.json',
    },
  },
})
