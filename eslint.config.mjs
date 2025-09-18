import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'src/generated/prisma/**',
      'reports/**',
      'coverage/**',
      'prisma/**',
      'src/app/**/page.tsx',
      'playwright.config.ts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      parser: (await import('@typescript-eslint/parser')).default,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      sonarjs: (await import('eslint-plugin-sonarjs')).default,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/restrict-plus-operands': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      'no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1, 2],
          ignoreArrayIndexes: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],
      'sonarjs/no-duplicate-string': [
        'error',
        {
          threshold: 3,
        },
      ],
      'sonarjs/no-duplicated-branches': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-identical-expressions': 'error',
      'sonarjs/no-identical-conditions': 'error',
      'sonarjs/no-redundant-boolean': 'error',
      'no-duplicate-case': 'error',
      // 'no-restricted-syntax': [
      //   'error',
      //   {
      //     selector: 'TSUnknownKeyword',
      //     message: 'Use a more specific type instead of unknown',
      //   },
      // ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'src/test/**/*.ts'],
    languageOptions: {
      parser: (await import('@typescript-eslint/parser')).default,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      sonarjs: (await import('eslint-plugin-sonarjs')).default,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      'no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1, 2],
          ignoreArrayIndexes: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],
      'sonarjs/no-duplicate-string': [
        'error',
        {
          threshold: 3,
        },
      ],
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: [
      '**/prisma/**',
      '**/serialization.ts',
      '**/typeGuards.ts',
      '**/prisma-extensions.ts',
      '**/openai.ts',
    ],
    languageOptions: {
      parser: (await import('@typescript-eslint/parser')).default,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      'no-restricted-syntax': 'off', // Allow unknown in Prisma and utility files
    },
  },
]

export default eslintConfig
