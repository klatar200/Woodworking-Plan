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
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
