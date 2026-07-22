import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

export default defineConfig({
  // Next.js uses React's automatic JSX runtime (no `import React` needed).
  // Vitest's transform defaults to the classic runtime, which would throw
  // "React is not defined" when a test renders a component.
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'node',
    // .tsx too — the catalog page test does a real static render (JSX in the test).
    include: ['tests/**/*.test.{ts,tsx}'],
    // Several files must `await import('@/lib/plans')` INSIDE their first test
    // (their vi.mock setup has to land before the module graph loads), so that
    // one test pays the transform cost of the whole Prisma-sized import chain.
    // Under a full-suite parallel run that lazy import alone can exceed the 5s
    // default on this machine — the same files pass in isolation in ~1s. A
    // bigger timeout weakens no assertion; it stops import contention from
    // masquerading as 5 failing tests (first seen Sprint 43, 81-file suite).
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
