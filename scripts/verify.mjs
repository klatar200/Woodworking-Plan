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
 *   node scripts/verify.mjs --out <path>     ALSO write the log to <path>, always UTF-8
 *   node scripts/verify.mjs --only test      subset, for fix rounds; marks itself SUBSET
 *   node scripts/verify.mjs check-pack sprints/47   validate a pack without sealing it
 *   node scripts/verify.mjs lock sprints/47  validate, then write ACCEPTANCE.sha256 (planner only)
 *
 * `--out` exists so no shell redirection is involved in producing verify.txt. PowerShell 5.1
 * `>` writes UTF-16LE, which every downstream text tool then fails to parse — and since Cursor
 * runs locally on Keagan's Windows box, that trap is live (CLAUDE.md §5). Node writes UTF-8
 * unconditionally, so the encoding stops depending on which shell the agent happened to pick.
 *
 * CONSTRAINTS (CLAUDE.md §5): no network, no database, no `.env.local`, no `next build`
 * (SWC SIGBUS in the Claude sandbox). Node built-ins only — no new dependency.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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

/** Everything emitted, retained only when --out is given, so the file is byte-identical to stdout. */
const sink = [];
let capture = false;

function emit(text) {
  process.stdout.write(text);
  if (capture) sink.push(text);
}

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
  emit(`\n[${step.id}] $ ${step.cmd}\n`);

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
  if (out) emit(out + '\n');
  if (err) emit(err + '\n');

  // A step that could not be spawned at all is a FAIL, not a crash — the summary must
  // still print, or there is no evidence file to grade against.
  if (result.error) {
    emit(`[${step.id}] runner error: ${result.error.message}\n`);
    return false;
  }
  return result.status === 0;
}

/* ── Pack validator ─────────────────────────────────────────────────────────
 * Runs before `lock` seals a pack, and standalone via `check-pack`.
 *
 * WHAT IT CATCHES — the mechanical defects that reached Cursor in Sprints 76/77 and cost a
 * round each. All of these are arithmetic or existence facts, so a script settles them:
 *   · a stated denominator that does not equal the count of A+R ids  (Sprint 76: gate was
 *     34/35 while two of the 35 were not the grader's to run — mathematically unpassable)
 *   · a gate numerator that is not ceil(pct × scored)
 *   · duplicate or non-contiguous ids inside a prefix group
 *   · a cite naming a file that does not exist, or a line past the end of that file
 *
 * WHAT IT DOES NOT CATCH, and must not be trusted to: whether a cite points at the RIGHT
 * place. `serialize.ts:197` was a real Sprint 77 defect — the line number came off the test
 * file — and that file has >197 lines, so every check here passes it. Cite accuracy needs a
 * reader who does not already know what the author meant. That is what `Check sprint NN` is
 * for; this validator shortens that review, it does not replace it.
 */

const CITE_RE =
  /([A-Za-z0-9_./\\-]+\.(?:ts|tsx|js|mjs|jsx|css|json|md|ps1)):(\d+)/g;
const ACCEPTANCE_ID_RE = /^- \[[ xX]\] ([A-Z]{1,2})(\d+) \| /;
const AMBIGUOUS = Symbol('ambiguous');
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'coverage', '.vercel']);

/** basename → [repo-relative paths]. Built once per run; the repo is small enough. */
function indexFiles(root) {
  const index = new Map();
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const next = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(dir, entry.name), next);
      else index.set(entry.name, [...(index.get(entry.name) ?? []), next]);
    }
  };
  walk(root, '');
  return index;
}

/** A cite may be a repo-relative path or a bare basename. Ambiguous basenames are not judged. */
function resolveCite(raw, index, root) {
  const path = raw.replace(/\\/g, '/');
  if (path.includes('/')) return existsSync(join(root, path)) ? path : null;
  const hits = index.get(path);
  if (!hits || hits.length === 0) return null;
  return hits.length === 1 ? hits[0] : AMBIGUOUS;
}

export function checkPack(sprintDir) {
  const root = process.cwd();
  const dir = resolve(root, sprintDir);
  const problems = [];
  const warnings = [];

  const required = ['GOAL.md', 'PLAN.md', 'ACCEPTANCE.md'];
  for (const name of required) {
    if (!existsSync(join(dir, name))) problems.push(`missing ${name}`);
  }
  if (problems.length) return { problems, warnings };

  const index = indexFiles(root);
  const lineCounts = new Map();
  const lineCount = (rel) => {
    if (!lineCounts.has(rel)) {
      lineCounts.set(rel, readFileSync(join(root, rel), 'utf8').split(/\r?\n/).length);
    }
    return lineCounts.get(rel);
  };

  for (const name of required) {
    const text = readFileSync(join(dir, name), 'utf8');
    for (const [, raw, lineStr] of text.matchAll(CITE_RE)) {
      const rel = resolveCite(raw, index, root);
      if (rel === null) {
        problems.push(`${name}: cite \`${raw}:${lineStr}\` — no such file in the repo`);
        continue;
      }
      if (rel === AMBIGUOUS) {
        warnings.push(`${name}: cite \`${raw}:${lineStr}\` — basename is not unique; not verified`);
        continue;
      }
      const total = lineCount(rel);
      if (Number(lineStr) > total) {
        problems.push(`${name}: cite \`${raw}:${lineStr}\` — ${rel} has only ${total} lines`);
      }
    }
  }

  const acceptance = readFileSync(join(dir, 'ACCEPTANCE.md'), 'utf8');
  const groups = new Map();
  const seen = new Set();
  for (const line of acceptance.split(/\r?\n/)) {
    const match = ACCEPTANCE_ID_RE.exec(line);
    if (!match) continue;
    const [, prefix, digits] = match;
    const id = `${prefix}${digits}`;
    if (seen.has(id)) problems.push(`ACCEPTANCE.md: duplicate id ${id}`);
    seen.add(id);
    groups.set(prefix, [...(groups.get(prefix) ?? []), Number(digits)]);
  }

  if (seen.size === 0) problems.push('ACCEPTANCE.md: no graded ids found');

  for (const [prefix, numbers] of groups) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const gap = sorted.findIndex((n, i) => n !== i + 1);
    if (gap !== -1) {
      problems.push(
        `ACCEPTANCE.md: ${prefix} ids are not contiguous from 1 — got ${sorted.join(', ')}`,
      );
    }
  }

  // The denominator is A+R only. M ids are graded but never scored; counting them is what made
  // Sprint 76 unpassable, so this is the check that matters most.
  const scored = (groups.get('A')?.length ?? 0) + (groups.get('R')?.length ?? 0);
  const denominator = acceptance.match(/÷\s*\*\*(\d+)\*\*/);
  if (!denominator) {
    problems.push('ACCEPTANCE.md: no denominator found (expected `÷ **N**`)');
  } else if (Number(denominator[1]) !== scored) {
    problems.push(
      `ACCEPTANCE.md: denominator says ${denominator[1]} but there are ${scored} A+R ids`,
    );
  }

  const gate = acceptance.match(/Gate\s*=\s*\*\*≥(\d+)%\*\*\s*\((\d+)\s*\/\s*(\d+)\)/);
  if (!gate) {
    warnings.push('ACCEPTANCE.md: gate not in `Gate = **≥95%** (N/M)` form; not verified');
  } else {
    const pct = Number(gate[1]);
    const numerator = Number(gate[2]);
    const gateDenominator = Number(gate[3]);
    if (gateDenominator !== scored) {
      problems.push(
        `ACCEPTANCE.md: gate denominator ${gateDenominator} ≠ ${scored} scored ids`,
      );
    }
    // Integer maths on purpose — 0.95 * 20 is not 19 in binary floating point.
    const need = Math.ceil((pct * scored) / 100);
    if (numerator !== need) {
      problems.push(
        `ACCEPTANCE.md: gate says ${numerator}/${gateDenominator} but ≥${pct}% of ${scored} is ${need}`,
      );
    }
  }

  return { problems, warnings };
}

function reportPack(sprintDir, { problems, warnings }) {
  for (const warning of warnings) process.stdout.write(`  warn  ${warning}\n`);
  for (const problem of problems) process.stderr.write(`  FAIL  ${problem}\n`);
  if (problems.length === 0) {
    process.stdout.write(`pack ${sprintDir}: OK${warnings.length ? ` (${warnings.length} warning(s))` : ''}\n`);
  }
  return problems.length === 0 ? 0 : 1;
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
  // Validate BEFORE sealing. A sealed bad bar is worse than an unsealed one: the hash makes it
  // expensive to correct, and correcting it after the fact voids the sprint (Sprint 77).
  const audit = checkPack(sprintDir);
  if (audit.problems.length > 0) {
    process.stderr.write(`lock: refusing to seal ${sprintDir} — fix these first:\n`);
    reportPack(sprintDir, audit);
    return 1;
  }
  for (const warning of audit.warnings) process.stdout.write(`  warn  ${warning}\n`);

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

function parseOut(argv) {
  const i = argv.indexOf('--out');
  if (i === -1) return null;
  const raw = argv[i + 1];
  if (!raw || raw.startsWith('--')) {
    process.stderr.write('--out requires a file path\n');
    process.exit(2);
  }
  return raw;
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

  if (argv[0] === 'check-pack') {
    if (!argv[1]) {
      process.stderr.write('usage: node scripts/verify.mjs check-pack <sprintDir>\n');
      process.exit(2);
    }
    process.exit(reportPack(argv[1], checkPack(argv[1])));
  }

  const only = parseOnly(argv);
  const outPath = parseOut(argv);
  capture = outPath !== null;
  const toRun = only ? STEPS.filter((s) => only.includes(s.id)) : STEPS;

  // Steps not selected report SKIP rather than vanishing — a summary that silently omits
  // a step reads exactly like a summary where that step passed.
  const results = new Map(STEPS.map((s) => [s.id, 'SKIP']));

  for (const step of toRun) {
    results.set(step.id, runStep(step) ? 'PASS' : 'FAIL');
  }

  const failed = [...results.values()].includes('FAIL');
  const exitCode = failed ? 1 : 0;

  emit('\n' + SUMMARY_OPEN + '\n');
  for (const step of STEPS) {
    emit(`${step.id}: ${results.get(step.id)}\n`);
  }
  // A subset run can exit 0 while the repo is broken. Label it loudly so it cannot be
  // pasted into a SCORECARD as if it were a full run.
  if (only) emit(SUBSET_MARKER + '\n');
  emit(`=== EXIT: ${exitCode} ===\n`);

  // UTF-8, no BOM, regardless of the calling shell. Written last so a crashed step still
  // leaves the summary block in the file rather than a truncated log with no verdict.
  if (outPath) writeFileSync(resolve(process.cwd(), outPath), sink.join(''), 'utf8');

  process.exit(exitCode);
}

main();
