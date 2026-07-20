import { describe, it, expect } from 'vitest';
import {
  parseFilters,
  buildQueryString,
  hasActiveFilters,
  activeFilterCount,
  type PlanFilters,
} from '@/lib/filters';

/**
 * Filters arrive as a URL query string, which means they are untrusted input from
 * a source that gets bookmarked, shared, hand-edited and mangled.
 *
 * The governing rule: anything unrecognized is DROPPED, never fatal. A stale link
 * with a deleted category, or a hand-typed `?difficulty=99`, must quietly show
 * unfiltered results — not a 500, not an error page.
 */

const VALID = {
  validCategorySlugs: ['cutting-boards', 'furniture', 'outdoor'],
  validToolSlugs: ['table-saw', 'router', 'lathe', 'drill-driver'],
};

const parse = (params: Record<string, string | string[] | undefined>) =>
  parseFilters(params, VALID);

describe('parseFilters — happy path', () => {
  it('parses every filter type at once', () => {
    const f = parse({
      category: 'furniture',
      difficulty: ['2', '3'],
      cost: ['TIER_1', 'TIER_2'],
      time: '480',
      tools: ['table-saw', 'router'],
    });

    expect(f.category).toBe('furniture');
    expect(f.difficulty).toEqual([2, 3]);
    expect(f.costTier).toEqual(['TIER_1', 'TIER_2']);
    expect(f.maxMinutes).toBe(480);
    expect(f.ownedTools).toEqual(['table-saw', 'router']);
  });

  it('accepts a single value where Next gives a string, not an array', () => {
    const f = parse({ difficulty: '3', cost: 'TIER_2', tools: 'lathe' });

    expect(f.difficulty).toEqual([3]);
    expect(f.costTier).toEqual(['TIER_2']);
    expect(f.ownedTools).toEqual(['lathe']);
  });

  it('returns empty filters for an empty query string', () => {
    const f = parse({});

    expect(hasActiveFilters(f)).toBe(false);
    expect(activeFilterCount(f)).toBe(0);
  });
});

describe('parseFilters — hostile and stale input is DROPPED, never fatal', () => {
  it('drops an unknown category (a stale bookmark must not 500)', () => {
    expect(parse({ category: 'category-that-was-deleted' }).category).toBeUndefined();
  });

  it('drops an unknown tool slug', () => {
    expect(parse({ tools: ['table-saw', 'nonexistent-tool'] }).ownedTools).toEqual([
      'table-saw',
    ]);
  });

  it('drops out-of-range difficulties', () => {
    expect(parse({ difficulty: ['0', '3', '99', '-1'] }).difficulty).toEqual([3]);
  });

  it('drops non-numeric difficulty', () => {
    expect(parse({ difficulty: ['abc', "3'; DROP TABLE Plan;--"] }).difficulty).toEqual(
      [],
    );
  });

  it('drops an invalid cost tier', () => {
    expect(parse({ cost: ['TIER_2', 'TIER_9', 'FREE'] }).costTier).toEqual(['TIER_2']);
  });

  it('drops a time value that is not one of the offered buckets', () => {
    // Only the presented buckets are honoured. An arbitrary `?time=7` would make
    // the filter mean something the UI never offered.
    expect(parse({ time: '7' }).maxMinutes).toBeUndefined();
    expect(parse({ time: 'abc' }).maxMinutes).toBeUndefined();
    expect(parse({ time: '480' }).maxMinutes).toBe(480);
  });

  it('SECURITY: an injection string in any filter is simply dropped', () => {
    const f = parse({
      category: "'; DROP TABLE \"Plan\"; --",
      difficulty: ["1' OR '1'='1"],
      cost: ["TIER_1' OR 1=1--"],
      tools: ["router'; DELETE FROM \"Plan\"; --"],
      time: "480'; --",
    });

    expect(f.category).toBeUndefined();
    expect(f.difficulty).toEqual([]);
    expect(f.costTier).toEqual([]);
    expect(f.ownedTools).toEqual([]);
    expect(f.maxMinutes).toBeUndefined();
    expect(hasActiveFilters(f)).toBe(false);
  });

  it('dedupes repeated values rather than widening the IN clause', () => {
    const f = parse({
      difficulty: ['2', '2', '2'],
      tools: ['router', 'router'],
      cost: ['TIER_1', 'TIER_1'],
    });

    expect(f.difficulty).toEqual([2]);
    expect(f.ownedTools).toEqual(['router']);
    expect(f.costTier).toEqual(['TIER_1']);
  });
});

describe('activeFilterCount', () => {
  it('counts each active GROUP once, not each ticked box', () => {
    // "Filters (2)" should mean two things are narrowing the results, not that
    // you ticked five checkboxes inside one group.
    const f = parse({ difficulty: ['1', '2', '3'], tools: ['router', 'lathe'] });
    expect(activeFilterCount(f)).toBe(2);
  });
});

describe('buildQueryString', () => {
  const base: PlanFilters = { difficulty: [], costTier: [], ownedTools: [] };

  it('returns a bare / when nothing is set', () => {
    expect(buildQueryString({ query: '', filters: base })).toBe('/browse');
  });

  it('preserves the search term AND the filters across pagination', () => {
    // Losing the search or the filters on "Next page" is the classic bug here.
    const qs = buildQueryString({
      query: 'walnut',
      filters: { ...base, category: 'furniture', difficulty: [2, 3] },
      page: 2,
    });

    expect(qs).toContain('q=walnut');
    expect(qs).toContain('category=furniture');
    expect(qs).toContain('difficulty=2');
    expect(qs).toContain('difficulty=3');
    expect(qs).toContain('page=2');
  });

  it('omits page=1 rather than emitting a redundant ?page=1', () => {
    expect(buildQueryString({ query: 'oak', filters: base, page: 1 })).toBe('/browse?q=oak');
  });

  it('round-trips through parseFilters unchanged', () => {
    // The strongest guarantee: a link this function builds must parse back to the
    // filters it was built from. Otherwise "Next page" silently changes the query.
    const original: PlanFilters = {
      category: 'outdoor',
      difficulty: [1, 4],
      costTier: ['TIER_2', 'TIER_5'],
      maxMinutes: 960,
      ownedTools: ['router', 'lathe'],
    };

    const qs = buildQueryString({ query: 'cedar', filters: original, page: 3 });
    const params = new URLSearchParams(qs.split('?')[1]);

    const raw: Record<string, string | string[]> = {};
    for (const key of new Set(params.keys())) {
      const all = params.getAll(key);
      raw[key] = all.length > 1 ? all : all[0]!;
    }

    expect(parse(raw)).toEqual(original);
    expect(raw.q).toBe('cedar');
    expect(raw.page).toBe('3');
  });
});
