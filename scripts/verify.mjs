#!/usr/bin/env node
/**
 * Sprint 00 — the verify runner. Sole producer of `sprints/<NN>/verify.txt`.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY THIS IS A SCRIPT AND NOT `"verify": "npm run typecheck && npm run lint && ..."`
 *
 * A `&&` chain SHORT-CIRCUITS. If typecheck fails, lint/test/content never run, and the
 * only evidence in verify.txt is the first failure. An agent grading SCORECARD.md against
 * that file would then report "1 failure" when there might be four — and the fix round
 * would be scoped to a quarter of the actual problem, guaranteeing a second round.
 *
 * This runner executes EVERY step regardless of earlier failures, then prints one summary
 * block. The cost of a full run is paid once; the cost of a needless fix round is paid in
 * both Claude and Cursor requests.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CONTRACT — `SCORECARD.md` cites this block, so its shape is load-bearing:
 *
 *     === VERIFY SUMMARY ===
 *     typecheck: PASS
 *     lint: PASS
 *     test: FAIL
 *     content: PASS
 *     === EXIT: 1 ===
 *
 * `tests/sprint-pack.test.ts` asserts a graded sprint's verify.txt contains the opening
 * marker. Changing these strings breaks that guard — update both together.
 *
 * USAGE
 *   node scripts/verify.mjs                  full run (the only kind SCORECARD may cite)
 *   node scripts/verify.mjs --only test      subset, for fix rounds; marks itself SUBSET
 *   node scripts/verify.mjs lock sprints/47  write ACCEPTANCE.sha256 (planner only)
 *
 * CONSTRAINTS (CLAUDE.md §5): no network, no database, no `.env.local`, no `next build`
 * (SWC SIGBUS in the Claude sandbox). Node built-ins only — no new dependency.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Order matters only for readability of the log — every step runs regardless.
 * `content` is last because it is the cheapest and its failures are the most legible.
 */
const STEPS = [
  { id: 'typecheck', cmd: 'npx tsc --noEmit' },
  { id: 'lint', cmd: 'npx eslint .' },
  { id: 'test', cmd: 'npx vitest run' },
  { id: 'content', cmd: 'node scripts/validate-plans.mjs' },
];

const SUMMARY_OPEN = '=== VERIFY SUMMARY ===';
const SUBSET_MARKER = '=== SUBSET RUN — NOT VALID SCORECARD EVIDENCE ===';

/** Prefix every line so interleaved step output stays attributable in one flat file. */
function prefixed(id, text) {
  if (!text) return '';
  return text
    .replace(/\s+$/, '')
    .split(/\r?\n/)
    .map((line) => `[${id}] ${line}`)
    .join('\n');
}

function runStep(step) {
  process.stdout.write(`\n[${step.id}] $ ${step.cmd}\n`);

  // shell:true is required for `npx` resolution on Windows (npx.cmd). Every command in
  // STEPS is a hardcoded constant — no interpolation of external input reaches this call.
  const result = spawnSync(step.cmd, {
    shell: true,
    encoding: 'utf8',
    cwd: process.cwd(),
    maxBuffer: 64 * 1024 * 1024,
  });

  const out = prefixed(step.id, result.stdout);
  const err = prefixed(step.id, result.stderr);
  if (out) process.stdout.write(out + '\n');
  if (err) process.stdout.write(err + '\n');

  // A step that could not be spawned at all is a FAIL, not a crash — the summary must
  // still print, or there is no evidence file to grade against.
  if (result.error) {
    process.stdout.write(`[${step.id}] runner error: ${result.error.message}\n`);
    return false;
  }
  return result.status === 0;
}

/**
 * `lock` subcommand — writes sha256(ACCEPTANCE.md) next to it.
 *
 * The point: the agent being graded must not be able to edit the bar it is graded against.
 * `tests/sprint-pack.test.ts` recomputes this hash, so a post-hoc edit to ACCEPTANCE.md
 * turns the suite red. Written by the PLANNER at the end of step 01 and never again —
 * re-locking to clear a failure is re-scoping, which is Keagan's call (CLAUDE.md §4).
 */
function lock(sprintDir) {
  const dir = resolve(process.cwd(), sprintDir);
  const acceptance = join(dir, 'ACCEPTANCE.md');
  if (!existsSync(acceptance)) {
    process.stderr.write(`lock: no ACCEPTANCE.md at ${acceptance}\n`);
    return 1;
  }
  const target = join(dir, 'ACCEPTANCE.sha256');
  if (existsSync(target)) {
    process.stderr.write(
      `lock: ${target} already exists. Re-locking would erase the tamper check.\n` +
        `If the bar genuinely changed, that is a re-scope — escalate per CLAUDE.md §4.\n`,
    );
    return 1;
  }
  // Normalise line endings so a Windows checkout and a CI checkout hash identically.
  const normalised = readFileSync(acceptance, 'utf8').replace(/\r\n/g, '\n');
  const digest = createHash('sha256').update(normalised, 'utf8').digest('hex');
  writeFileSync(target, digest + '\n', 'utf8');
  process.stdout.write(`locked ${sprintDir}/ACCEPTANCE.md\n${digest}\n`);
  return 0;
}

function parseOnly(argv) {
  const i = argv.indexOf('--only');
  if (i === -1) return null;
  const raw = argv[i + 1];
  if (!raw) {
    process.stderr.write('--only requires a comma-separated list of step ids\n');
    process.exit(2);
  }
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const known = new Set(STEPS.map((s) => s.id));
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length) {
    process.stderr.write(
      `--only: unknown step(s) ${unknown.join(', ')}. Known: ${[...known].join(', ')}\n`,
    );
    process.exit(2);
  }
  return ids;
}

function main() {
  const argv = process.argv.slice(2);

  if (argv[0] === 'lock') {
    if (!argv[1]) {
      process.stderr.write('usage: node scripts/verify.mjs lock <sprintDir>\n');
      process.exit(2);
    }
    process.exit(lock(argv[1]));
  }

  const only = parseOnly(argv);
  const toRun = only ? STEPS.filter((s) => only.includes(s.id)) : STEPS;

  // Steps not selected report SKIP rather than vanishing — a summary that silently omits
  // a step reads exactly like a summary where that step passed.
  const results = new Map(STEPS.map((s) => [s.id, 'SKIP']));

  for (const step of toRun) {
    results.set(step.id, runStep(step) ? 'PASS' : 'FAIL');
  }

  const failed = [...results.values()].includes('FAIL');
  const exitCode = failed ? 1 : 0;

  process.stdout.write('\n' + SUMMARY_OPEN + '\n');
  for (const step of STEPS) {
    process.stdout.write(`${step.id}: ${results.get(step.id)}\n`);
  }
  // A subset run can exit 0 while the repo is broken. Label it loudly so it cannot be
  // pasted into a SCORECARD as if it were a full run.
  if (only) process.stdout.write(SUBSET_MARKER + '\n');
  process.stdout.write(`=== EXIT: ${exitCode} ===\n`);

  process.exit(exitCode);
}

main();
