import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    coverage: {
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/src/generated/prisma/**',
        '**/src/test/**',
        '**/reports/**',
        '**/scripts/**',
        '**/prisma/**',
        '**/*.config.*',
        // Next.js generated files and build artifacts
        '**/.next/**',
        '**/next-env.d.ts',
        // Page components (mostly routing/imports, minimal business logic)
        '**/src/app/**/page.tsx',
        '**/src/app/**/layout.tsx',
        // Type definition files
        '**/*.d.ts'
      ]
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/src/generated/prisma/**',
      '**/tests/**'
    ],
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
})