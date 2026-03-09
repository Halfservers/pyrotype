import path from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const generatedPrisma = path.resolve(
  import.meta.dirname,
  'server/src/generated/prisma',
)

function prismaCloudflarePlugin(): Plugin {
  return {
    name: 'vite-plugin-prisma-cloudflare',
    resolveId(id) {
      // Redirect .prisma/client/default → our generated wasm.js (Workers-compatible)
      if (id === '.prisma/client/default') {
        return path.join(generatedPrisma, 'wasm.js')
      }
      // Resolve #wasm-engine-loader → wasm-worker-loader.mjs (Workers variant)
      if (id === '#wasm-engine-loader') {
        return path.join(generatedPrisma, 'wasm-worker-loader.mjs')
      }
      // Resolve #main-entry-point → wasm.js (Workers variant)
      if (id === '#main-entry-point') {
        return path.join(generatedPrisma, 'wasm.js')
      }
    },
  }
}

const config = defineConfig({
  build: {
    commonjsOptions: {
      include: [/node_modules/, /server[\\/]src[\\/]generated[\\/]prisma/],
    },
  },
  plugins: [
    prismaCloudflarePlugin(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
