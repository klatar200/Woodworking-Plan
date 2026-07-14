import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    // 'Prototype Wireframe/' is a design-tool EXPORT (Claude Design), not app code —
    // `next build` never lints it, but `eslint .` (CI) did, and its two errors
    // (deprecated ReactDOM.render, an assign-to-`module`) kept CI red for weeks, which
    // is how a real production bug reached a deploy with nobody watching the detector.
    // It is historical reference (DECISIONS_LOG.md 2026-07-14) and not ours to fix.
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'coverage/**',
      'Prototype Wireframe/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Unused code is dead code — fail the build on it rather than letting it
      // accumulate (BUILD_PLAN.md §6 category 5).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];

export default config;
