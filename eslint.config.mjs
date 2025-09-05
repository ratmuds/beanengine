import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

export default [
  js.configs.recommended,
  ...svelte.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: tsparser,
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // General rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        svelteConfig
      }
    },
    rules: {
      // Override or add Svelte-specific rules here
      'svelte/no-at-html-tags': 'error',
      'svelte/no-target-blank': 'error',
      'svelte/no-unused-svelte-ignore': 'error'
    }
  },
  {
    ignores: [
      '*.cjs',
      'node_modules/**',
      'dist/**',
      'build/**',
      '.svelte-kit/**'
    ]
  }
];