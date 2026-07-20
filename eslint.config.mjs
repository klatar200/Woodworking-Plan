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
      // Same story as 'Prototype Wireframe/' — a design-tool export, not app code.
      // Found failing `eslint .` in the 2026-07-19 audit (2 no-empty-object-type
      // errors): the exact "CI red and nobody watching" failure shape again.
      '.design-sync/**',
      // The design-sync toolchain, again — RENAMED/added since the 2026-07-19 audit, so
      // the '.design-sync/**' entry above no longer catches it. `.ds-sync/` is the sync
      // scripts; `ds-bundle/_vendor/` is a vendored React bundle (its minified output is
      // the source of the 21k-line 'e is never used' errors). Neither is app code, neither
      // is imported by `src/`, and `next build` never lints them — same "CI red, nobody
      // watching" shape as the two ignores above. Not ours to fix.
      '.ds-sync/**',
      'ds-bundle/**',
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
