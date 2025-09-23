import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    testTimeout: 700000, // 11.67 minute timeout for comprehensive test suite (623.29s runtime)
    hookTimeout: 300000, // 5 minute timeout for setup/teardown hooks
    // Configure for database testing with Tier 2 rate limit considerations
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 2, // Allow 2 forks for Tier 2 limits
        minForks: 1,
        isolate: true, // Ensure test isolation
      },
    },
    maxConcurrency: 2, // Allow 2 concurrent tests for better performance
    sequence: {
      concurrent: false, // Keep sequential for stability
      shuffle: false, // Keep test order predictable
    },
    coverage: {
      provider: 'v8',
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
        '**/*.d.ts',
        '**/tests/**',
      ],
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/src/generated/prisma/**',
      '**/tests/**',
    ],
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
})
