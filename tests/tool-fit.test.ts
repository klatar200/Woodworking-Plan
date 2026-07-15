import { describe, it, expect } from 'vitest';
import { toolFit } from '@/lib/workshop';

/**
 * Sprint 26 — "can I build this?" against a user's workshop.
 *
 * The rule that matters: it compares ESSENTIAL tools only, matching the catalog's
 * owned-tools filter, so the plan page and the filter never disagree. Pure, so it's
 * tested directly.
 */
const essential = [
  { slug: 'table-saw', name: 'Table Saw' },
  { slug: 'router', name: 'Router' },
  { slug: 'drill-driver', name: 'Drill / Driver' },
];

describe('toolFit', () => {
  it('ownsAll when every essential tool is owned', () => {
    const fit = toolFit(essential, new Set(['table-saw', 'router', 'drill-driver', 'lathe']));
    expect(fit.ownsAll).toBe(true);
    expect(fit.ownedCount).toBe(3);
    expect(fit.total).toBe(3);
    expect(fit.missing).toEqual([]);
  });

  it('lists the missing essential tools by NAME, and counts what is owned', () => {
    const fit = toolFit(essential, new Set(['table-saw']));
    expect(fit.ownsAll).toBe(false);
    expect(fit.ownedCount).toBe(1);
    expect(fit.total).toBe(3);
    expect(fit.missing).toEqual(['Router', 'Drill / Driver']);
  });

  it('an empty workshop is missing everything', () => {
    const fit = toolFit(essential, new Set());
    expect(fit.ownsAll).toBe(false);
    expect(fit.ownedCount).toBe(0);
    expect(fit.missing).toHaveLength(3);
  });

  it('a plan with no essential tools is trivially buildable', () => {
    const fit = toolFit([], new Set(['table-saw']));
    expect(fit.ownsAll).toBe(true);
    expect(fit.total).toBe(0);
    expect(fit.missing).toEqual([]);
  });

  it('owning tools the plan does NOT need does not affect the fit', () => {
    const fit = toolFit(essential, new Set(['table-saw', 'router', 'drill-driver', 'jointer', 'planer']));
    expect(fit.ownsAll).toBe(true);
    expect(fit.ownedCount).toBe(3); // counts against the plan's 3, not the 5 owned
  });
});
