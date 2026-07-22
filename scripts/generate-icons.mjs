/**
 * Generate the PWA/touch icons from the canonical brand mark (Sprint 45).
 *
 * SOURCE: public/brand/notch-logo.svg — Keagan's supplied Notch mark (the
 * interlocking two-tone N), background stripped to transparent per his direction.
 * This script is the ONLY way icon bytes change; edit the SVG, re-run, commit both.
 *
 *   node scripts/generate-icons.mjs [--dry-run]
 *
 * OUTPUTS (paths are load-bearing — the manifest and layout metadata name them):
 *   • public/icons/icon-192.png           192×192, transparent, mark contained
 *   • public/icons/icon-512.png           512×512, transparent, mark contained
 *   • public/icons/icon-maskable-512.png  512×512, SOLID cream plate, mark in the
 *     inner 80% safe zone — launchers crop maskable icons to arbitrary shapes, so
 *     anything outside the zone can be cut off. The plate is cream (#f6f1e7, the
 *     brand --bg), NOT forest: the mark's green half would vanish on a forest plate.
 *   • public/icons/apple-touch-icon.png   180×180, SOLID cream plate — iOS composites
 *     transparency onto black, so a transparent apple-touch icon looks broken.
 *
 * The favicon is NOT generated here: src/app/icon.svg is the same cleaned SVG,
 * served by the App Router file convention (crisp at every size, themes with
 * nothing — a favicon is not themable anyway).
 *
 * No service-worker cache bump needed: sw.js is network-first, stale icon bytes
 * only ever serve offline and self-heal on the next online visit.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const SRC = `${root}public/brand/notch-logo.svg`;
const OUT_DIR = `${root}public/icons/`;
const CREAM = '#f6f1e7'; // the light theme's --bg (globals.css :root)

const dryRun = process.argv.includes('--dry-run');

if (!existsSync(SRC)) {
  console.error(`[generate-icons] missing source: ${SRC}`);
  process.exit(1);
}
const svg = readFileSync(SRC);

/** Rasterize the mark to fit inside a box, preserving aspect, transparent. */
async function markPng(box) {
  return sharp(svg, { density: 300 })
    .resize(box, box, { fit: 'inside' })
    .png()
    .toBuffer();
}

/** Center the mark on a solid square plate. */
async function onPlate(size, markBox, background) {
  const mark = await markPng(markBox);
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function emit(name, buffer) {
  const path = `${OUT_DIR}${name}`;
  if (dryRun) {
    console.log(`[dry-run] would write ${name} (${buffer.length} bytes)`);
    return;
  }
  writeFileSync(path, buffer);
  console.log(`wrote ${name} (${buffer.length} bytes)`);
}

// Transparent "any" icons: mark contained with a ~6% margin so it doesn't kiss
// the edges in launchers that render the icon un-plated.
await emit('icon-192.png', await onTransparent(192));
await emit('icon-512.png', await onTransparent(512));
// Maskable: inner 80% safe zone on the cream plate.
await emit('icon-maskable-512.png', await onPlate(512, Math.round(512 * 0.8), CREAM));
// Apple touch: 180px, cream plate, ~72% mark.
await emit('apple-touch-icon.png', await onPlate(180, Math.round(180 * 0.72), CREAM));

async function onTransparent(size) {
  const mark = await markPng(Math.round(size * 0.88));
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}
