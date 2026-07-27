import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Sprint 00 — the sprint-pack protocol guard.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * THIS TEST GUARDS A PROCESS, NOT A FEATURE.
 *
 * The sprint loop hands work between two agents through `sprints/<NN>/`. Every rule in
 * `sprints/README.md` was, before this file existed, a rule a human had to notice being
 * broken — and the human is the one the process exists to unburden.
 *
 * Three failures are worth the file on their own:
 *
 *   1. A SCORECARD that silently omits checks. Twelve of sixteen graded reads as a clean
 *      pass to a tired reader. Here it is a red suite.
 *   2. A SCORECARD written without running verify. The grade then cites nothing.
 *   3. The graded agent editing the bar it is graded against. `ACCEPTANCE.sha256` is
 *      written once by the PLANNER (`node scripts/verify.mjs lock <dir>`); any later edit
 *      to ACCEPTANCE.md changes the digest and fails assertion 6.
 *
 * A comment is not a mechanism (CLAUDE.md §8). These are.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * IN-FLIGHT SPRINTS STAY GREEN. Assertions that need a SCORECARD, a verify.txt, or a lock
 * are skipped when those files are absent. A sprint mid-implementation must not redden the
 * suite — otherwise the first thing an executor learns is to delete the guard.
 *
 * Reads the filesystem only: no mocks, no network, no database. Passes on a repo with zero
 * sprint folders.
 */

const SPRINTS_DIR = resolve(process.cwd(), 'sprints');
const TEMPLATE_DIR = join(SPRINTS_DIR, '_template');

/** `- [ ] A1 | statement | evidence: verify.txt` — greedy statement so pipes inside it survive. */
const CHECK_RE =
  /^- \[[ xX]\] ([A-Z]{1,2}\d+) \| (.+) \| evidence: (verify\.txt|file:line|manual)\s*$/;

/** `- A1 | PASS | verify.txt:14 typecheck PASS` */
const GRADE_RE = /^- ([A-Z]{1,2}\d+) \| (PASS|FAIL) \| (.+?)\s*$/;

const VERIFY_MARKER = '=== VERIFY SUMMARY ===';

/** A subset run can exit 0 with the repo broken; it is never valid grading evidence. */
const SUBSET_MARKER = '=== SUBSET RUN';

type Check = { id: string; statement: string; evidence: string };

function readLines(path: string): string[] {
  return readFileSync(path, 'utf8').split(/\r?\n/);
}

function parseAcceptance(path: string): Check[] {
  const checks: Check[] = [];
  for (const line of readLines(path)) {
    if (!line.startsWith('- [')) continue;
    const m = CHECK_RE.exec(line);
    // A line that opens like a check but does not parse is a malformed check, not prose —
    // silently ignoring it is how an unenforceable bar gets written.
    expect(m, `malformed ACCEPTANCE line in ${path}:\n  ${line}`).not.toBeNull();
    const [, id, statement, evidence] = m ?? [];
    // Unreachable — the expect above throws first. The guard exists for the type checker,
    // which cannot know a matched group is present (`noUncheckedIndexedAccess`).
    if (!id || !statement || !evidence) continue;
    checks.push({ id, statement: statement.trim(), evidence });
  }
  return checks;
}

function parseScorecard(path: string): Map<string, string> {
  const grades = new Map<string, string>();
  for (const line of readLines(path)) {
    const m = GRADE_RE.exec(line);
    if (!m) continue;
    const [, id, verdict] = m;
    if (id && verdict) grades.set(id, verdict);
  }
  return grades;
}

/** Ids are contiguous from 1 within each prefix group (A = acceptance, R = gate, M = manual). */
function assertContiguousPerPrefix(ids: string[], label: string) {
  const groups = new Map<string, number[]>();
  for (const id of ids) {
    const m = /^([A-Z]{1,2})(\d+)$/.exec(id);
    // Ids reaching here already matched CHECK_RE, so this cannot fail in practice; the
    // guard is for the type checker (`noUncheckedIndexedAccess`).
    if (!m?.[1] || !m[2]) continue;
    const prefix = m[1];
    groups.set(prefix, [...(groups.get(prefix) ?? []), Number(m[2])]);
  }
  for (const [prefix, nums] of groups) {
    const sorted = [...nums].sort((a, b) => a - b);
    const expected = Array.from({ length: sorted.length }, (_, i) => i + 1);
    expect(sorted, `${label}: ${prefix} ids must run 1..n with no gaps`).toEqual(expected);
  }
}

function sprintDirs(): string[] {
  if (!existsSync(SPRINTS_DIR)) return [];
  return readdirSync(SPRINTS_DIR)
    .filter((name) => /^\d+$/.test(name))
    .filter((name) => statSync(join(SPRINTS_DIR, name)).isDirectory())
    .sort();
}

describe('sprint pack — template', () => {
  // Keeps this file non-empty on a repo with zero sprints, and holds the template itself to
  // the format it documents. A template that does not parse teaches every sprint to not parse.
  it('ships the four skeleton files', () => {
    for (const f of ['GOAL.md', 'PLAN.md', 'ACCEPTANCE.md', 'README.md']) {
      expect(existsSync(join(TEMPLATE_DIR, f)), `sprints/_template/${f} missing`).toBe(true);
    }
  });

  it('template ACCEPTANCE.md conforms to its own documented format', () => {
    const checks = parseAcceptance(join(TEMPLATE_DIR, 'ACCEPTANCE.md'));
    expect(checks.length).toBeGreaterThan(0);
    assertContiguousPerPrefix(
      checks.map((c) => c.id),
      'template',
    );
  });

  it('README documents both line formats', () => {
    const readme = readFileSync(join(TEMPLATE_DIR, 'README.md'), 'utf8');
    expect(readme).toContain('evidence: verify.txt');
    expect(readme).toContain('| PASS |');
  });
});

describe.each(sprintDirs())('sprint pack — sprints/%s', (name) => {
  const dir = join(SPRINTS_DIR, name);
  const p = (f: string) => join(dir, f);

  // 1 — a half-opened sprint is worse than no sprint: the executor implements against a
  // plan with no bar, and the grade becomes prose again.
  it('has GOAL.md, PLAN.md and ACCEPTANCE.md', () => {
    for (const f of ['GOAL.md', 'PLAN.md', 'ACCEPTANCE.md']) {
      expect(existsSync(p(f)), `sprints/${name}/${f} missing`).toBe(true);
    }
  });

  // 2 + 3 — the bar must be parseable and binary before anything can be graded against it.
  it('ACCEPTANCE ids are well-formed, unique and contiguous; statements are non-empty', () => {
    const checks = parseAcceptance(p('ACCEPTANCE.md'));
    expect(checks.length, 'ACCEPTANCE.md declares no checks').toBeGreaterThan(0);

    const ids = checks.map((c) => c.id);
    expect(new Set(ids).size, `duplicate ids in sprints/${name}/ACCEPTANCE.md`).toBe(ids.length);
    assertContiguousPerPrefix(ids, `sprints/${name}`);

    for (const c of checks) {
      expect(c.statement.length, `${c.id} has an empty statement`).toBeGreaterThan(0);
    }
  });

  // 4 — THE ONE THAT MATTERS. Partial grading is the failure mode the old loop could not see.
  it('SCORECARD grades every ACCEPTANCE id', () => {
    if (!existsSync(p('SCORECARD.md'))) return; // in-flight sprint

    const checks = parseAcceptance(p('ACCEPTANCE.md'));
    const grades = parseScorecard(p('SCORECARD.md'));

    const ungraded = checks.map((c) => c.id).filter((id) => !grades.has(id));
    expect(
      ungraded,
      `sprints/${name}/SCORECARD.md does not grade: ${ungraded.join(', ')}`,
    ).toEqual([]);

    const unknown = [...grades.keys()].filter((id) => !checks.some((c) => c.id === id));
    expect(unknown, `SCORECARD grades ids absent from ACCEPTANCE: ${unknown.join(', ')}`).toEqual(
      [],
    );
  });

  // 5 — a grade with no machine evidence behind it is the prose scorecard we just removed.
  it('a graded sprint has a full verify.txt', () => {
    if (!existsSync(p('SCORECARD.md'))) return;

    expect(existsSync(p('verify.txt')), `sprints/${name}/verify.txt missing`).toBe(true);
    const verify = readFileSync(p('verify.txt'), 'utf8');
    expect(verify, 'verify.txt has no summary block — verify was never run').toContain(
      VERIFY_MARKER,
    );
    expect(verify, 'verify.txt is a --only subset run and cannot back a grade').not.toContain(
      SUBSET_MARKER,
    );
  });

  // 6 — tamper check. Written by the planner via `node scripts/verify.mjs lock <dir>`.
  it('ACCEPTANCE.md is unchanged since it was locked', () => {
    if (!existsSync(p('ACCEPTANCE.sha256'))) return; // not yet locked

    const expected = readFileSync(p('ACCEPTANCE.sha256'), 'utf8').trim();
    // Normalised so a Windows checkout and a CI checkout agree.
    const body = readFileSync(p('ACCEPTANCE.md'), 'utf8').replace(/\r\n/g, '\n');
    const actual = createHash('sha256').update(body, 'utf8').digest('hex');
    expect(
      actual,
      `sprints/${name}/ACCEPTANCE.md changed after locking. The bar is not editable by the ` +
        `actor being graded. A genuine bar change is a re-scope — escalate (CLAUDE.md §4).`,
    ).toBe(expected);
  });

  // 7 — CLAUDE.md §4's "≤3 attempts, then stop and escalate", made mechanical.
  it('FIXES.md has not passed the 3-round cap', () => {
    if (!existsSync(p('FIXES.md'))) return;

    const rounds = readLines(p('FIXES.md'))
      .map((l) => /^#{1,3}\s*Round\s+(\d+)/i.exec(l))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => Number(m[1]));

    const over = rounds.filter((n) => n > 3);
    expect(
      over,
      `sprints/${name}/FIXES.md reached round ${over[0]}. Three rounds is the cap — ` +
        `stop and escalate to Keagan rather than grinding (CLAUDE.md §4).`,
    ).toEqual([]);
  });
});
