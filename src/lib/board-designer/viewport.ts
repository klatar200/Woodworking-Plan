/**
 * The designer's authoring gate: at and above this width the editor is usable,
 * below it the read-only surface renders instead (Sprint 54, DECISIONS_LOG
 * 2026-07-25 — desktop-only authoring, gated on VIEWPORT WIDTH, never UA).
 *
 * Tailwind `lg` = 64rem = 1024px at the app's 16px root font size, so this
 * constant and every `lg:` class in the designer flip together. Changing one
 * without the other splits the CSS surface from the WebGL gate.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS LIVES IN ITS OWN MODULE — do not move it back into r3f-canvas.tsx.
 *
 * `r3f-canvas.tsx` imports `three` and `@react-three/fiber` at module scope, and
 * is reachable ONLY through `dynamic(() => import('./r3f-canvas'), {ssr:false})`
 * so that three.js stays in a lazy chunk. Sprint 55 imported this one constant
 * from there into `designer-shell.tsx` — a statically imported client component —
 * which pulled the whole 3D stack into the designer's initial bundle:
 * `/designer` First Load JS went 114 kB → 358 kB, and three.js began downloading
 * on phones, defeating the Sprint 54 gate it was being imported to implement.
 *
 * A value shared with the canvas must therefore live in a module with NO three.js
 * import. Measured 2026-07-26.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const DESIGNER_WIDE_MQ = '(min-width: 64rem)';
