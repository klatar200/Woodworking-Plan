import { describe, it, expect } from 'vitest';
import { parsePageSize, PAGE_SIZES, DEFAULT_PAGE_SIZE } from '@/lib/page-size';
import { buildQueryString } from '@/lib/filters';
import type { PlanFilters } from '@/lib/filters';

/**
 * QOL-I item 4 — the page-size param.
 *
 * `parsePageSize` is the untrusted-input gate: it must HARD-clamp to the allowlist so a
 * hand-edited `?perPage=100000` can't ask the server for a 100k-card page. Anything not
 * exactly one of the allowed values degrades to the default, silently — same doctrine as
 * `parseSort` and the `page` clamp.
 */

const noFilters: PlanFilters = {
  category: undefined,
  difficulty: [],
  costTier: [],
  maxMinutes: undefined,
  ownedTools: [],
};

describe('parsePageSize', () => {
  it('accepts each allow-listed value', () => {
    for (const n of PAGE_SIZES) {
      expect(parsePageSize(String(n))).toBe(n);
    }
  });

  it('rejects anything off the list, degrading to the default', () => {
    for (const bad of ['12', '13', '100000', '0', '-1', '11.9', 'abc', '', '48; DROP', undefined]) {
      expect(parsePageSize(bad), `perPage=${bad}`).toBe(DEFAULT_PAGE_SIZE);
    }
  });

  it('Sprint 48: legacy ?perPage=12 clamps to 24 (removed from the allowlist)', () => {
    expect(PAGE_SIZES).not.toContain(12);
    expect(DEFAULT_PAGE_SIZE).toBe(24);
    expect(parsePageSize('12')).toBe(24);
  });

  it('rejects a repeated param (string[])', () => {
    expect(parsePageSize(['48', '96'])).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe('buildQueryString — perPage', () => {
  it('includes perPage when provided', () => {
    expect(buildQueryString({ query: '', filters: noFilters, perPage: 48 })).toBe(
      '/browse?perPage=48',
    );
  });

  it('omits perPage when not provided (default keeps the URL clean)', () => {
    expect(buildQueryString({ query: '', filters: noFilters })).toBe('/browse');
  });

  it('carries perPage alongside filters, sort, and page', () => {
    const qs = buildQueryString({
      query: 'oak',
      filters: { ...noFilters, category: 'furniture' },
      sort: 'newest',
      page: 2,
      perPage: 24,
    });
    expect(qs).toContain('q=oak');
    expect(qs).toContain('category=furniture');
    expect(qs).toContain('sort=newest');
    expect(qs).toContain('page=2');
    expect(qs).toContain('perPage=24');
    expect(qs.startsWith('/browse?')).toBe(true);
  });
});
