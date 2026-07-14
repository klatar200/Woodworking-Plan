import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadCatalog } from '@/content/load';
import { planSchema } from '@/content/plan-schema';

/**
 * Sprint 21 — per-step tools/materials.
 *
 * The load-time SUBSET check is the safety property: a step may only reference tools
 * and materials the plan itself declares. The database can't express that cheaply (see
 * schema.prisma), so load.ts is the gate — and a step pointing at a tool the plan never
 * lists would tell a builder to fetch something the project doesn't use. These tests
 * drive loadCatalog against a temp content dir so the cross-file check runs for real.
 */

let dir: string;

function write(rel: string, obj: unknown) {
  const full = join(dir, rel);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, JSON.stringify(obj));
}

const basePlan = (steps: unknown[]) => ({
  slug: 'test-plan',
  title: 'Test Plan',
  summary: 'A plan.',
  description: 'Desc.',
  category: 'cat',
  difficulty: 2,
  timeMinMinutes: 60,
  timeMaxMinutes: 120,
  timeLabel: '1-2 hrs',
  costTier: 'TIER_1',
  costMinCents: 1000,
  costMaxCents: 4000,
  tags: ['x'],
  tools: [{ slug: 'table-saw', essential: true }],
  materials: [{ name: 'Maple', unit: 'board feet', quantity: 2 }],
  cutList: [],
  steps,
  images: [],
  published: true,
});

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ww-steptags-'));
  write('categories.json', [{ slug: 'cat', name: 'Cat' }]);
  write('tools.json', [
    { slug: 'table-saw', name: 'Table Saw' },
    { slug: 'router', name: 'Router' },
  ]);
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('per-step tag subset validation', () => {
  it('accepts a step whose tools/materials are a subset of the plan', () => {
    write('plans/test-plan.json', basePlan([
      { title: 'Cut', body: 'Rip it.', tools: ['table-saw'], materials: ['Maple'] },
    ]));
    const c = loadCatalog(dir);
    expect(c.plans[0]!.steps[0]!.tools).toEqual(['table-saw']);
    expect(c.plans[0]!.steps[0]!.materials).toEqual(['Maple']);
  });

  it('REJECTS a step tool the plan never declares, naming the plan and step', () => {
    // 'router' is a real tool, but this plan doesn't list it — the builder would be
    // told to fetch a tool the project doesn't use.
    write('plans/test-plan.json', basePlan([
      { title: 'Cut', body: 'Rip it.', tools: ['router'] },
    ]));
    expect(() => loadCatalog(dir)).toThrow(/test-plan.*step 1.*router.*not in the plan/s);
  });

  it("REJECTS a step material the plan never declares", () => {
    write('plans/test-plan.json', basePlan([
      { title: 'Glue', body: 'Glue it.', materials: ['Walnut'] },
    ]));
    expect(() => loadCatalog(dir)).toThrow(/test-plan.*step 1.*Walnut.*not in the plan/s);
  });

  it('treats missing tools/materials as empty — a plan predating the content pass still loads', () => {
    write('plans/test-plan.json', basePlan([{ title: 'Do', body: 'Do it.' }]));
    const c = loadCatalog(dir);
    expect(c.plans[0]!.steps[0]!.tools).toEqual([]);
    expect(c.plans[0]!.steps[0]!.materials).toEqual([]);
  });
});

describe('step schema defaults', () => {
  it('defaults tools/materials to [] when omitted', () => {
    const r = planSchema.safeParse(basePlan([{ title: 'A', body: 'B' }]));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.steps[0]!.tools).toEqual([]);
      expect(r.data.steps[0]!.materials).toEqual([]);
    }
  });

  it('rejects a non-kebab tool slug on a step', () => {
    const r = planSchema.safeParse(basePlan([{ title: 'A', body: 'B', tools: ['Table Saw'] }]));
    expect(r.success).toBe(false);
  });
});
