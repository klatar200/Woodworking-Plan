import { describe, it, expect, vi } from 'vitest';
import { guardOpenDrawer, inertOutside, type InertNode } from '@/lib/drawer-guard';

/**
 * Sprint 39.3 (audit M2) — the mobile filter drawer's modal manners.
 *
 * THE TEST THAT MATTERS HERE IS THE CLEANUP. A drawer that fails to trap focus is a
 * usability bug; a drawer that leaves `inert` on the page behind it is a BRICKED PAGE —
 * every link and button dead, with no visible reason and no way for the user to recover
 * short of a reload. Same for a scroll lock that is never released. So every test below
 * asserts the undo as hard as the do.
 *
 * The module is structural (it declares the four Element methods it uses) precisely so
 * this can run in `node` with no DOM, the way step-progress.ts is.
 */

/** A minimal element tree: parent links, children, and one attribute bag. */
class Node implements InertNode {
  parentElement: Node | null = null;
  readonly children: Node[] = [];
  private readonly attrs = new Set<string>();

  readonly tagName: string;

  constructor(
    readonly name: string,
    children: Node[] = [],
  ) {
    this.tagName = name.toUpperCase();
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }

  hasAttribute(name: string) {
    return this.attrs.has(name);
  }
  setAttribute(name: string, _value = '') {
    this.attrs.add(name);
  }
  removeAttribute(name: string) {
    this.attrs.delete(name);
  }
}

/**
 * The real shape from browse/page.tsx — and the reason this module exists. The drawer is
 * a DESCENDANT of `<main>`, so the obvious "inert header, main and footer" would inert
 * the drawer along with the page and leave an open sheet with nothing in it that works.
 */
function page() {
  const summary = new Node('summary');
  const drawer = new Node('drawer');
  const details = new Node('details', [summary, drawer]);
  const sort = new Node('sort');
  const aside = new Node('aside', [sort, details]);
  const results = new Node('results');
  const rail = new Node('category-rail');
  const grid = new Node('grid', [rail, aside, results]);
  const main = new Node('main', [grid]);
  const content = new Node('content', [main]);
  const header = new Node('header');
  const footer = new Node('footer');
  const body = new Node('body', [header, content, footer]);

  return { body, header, footer, main, grid, rail, aside, results, sort, details, summary, drawer };
}

const inert = (node: Node) => node.hasAttribute('inert');

describe('inertOutside — everything but the drawer stops responding', () => {
  it('inerts each ancestor level’s other children, up to the root', () => {
    const p = page();
    inertOutside(p.details, p.body);

    for (const node of [p.header, p.footer, p.rail, p.results, p.sort]) {
      expect(inert(node), node.name).toBe(true);
    }
  });

  /** If any of these went inert, the open drawer itself would be dead. */
  it('never touches the anchor’s own ancestors, or anything inside it', () => {
    const p = page();
    inertOutside(p.details, p.body);

    for (const node of [p.body, p.main, p.grid, p.aside, p.details, p.summary, p.drawer]) {
      expect(inert(node), node.name).toBe(false);
    }
  });

  it('removes every attribute it set, and only those', () => {
    const p = page();
    p.results.setAttribute('inert', ''); // already inert — someone else owns this one
    const release = inertOutside(p.details, p.body);
    release();

    expect(inert(p.header)).toBe(false);
    expect(inert(p.footer)).toBe(false);
    expect(inert(p.rail)).toBe(false);
    // Left as we found it: clearing another owner's `inert` would un-hide a surface that
    // is still meant to be hidden.
    expect(inert(p.results)).toBe(true);
  });

  /** React invokes effect cleanups more than once (StrictMode double-invokes in dev). */
  it('is idempotent — a second release cannot clear a later open’s attributes', () => {
    const p = page();
    const release = inertOutside(p.details, p.body);
    release();
    inertOutside(p.details, p.body); // a second open
    release(); // the stale cleanup fires again

    expect(inert(p.header)).toBe(true);
  });

  /**
   * Next injects well over a hundred `<script>`/`<link>` tags into `<body>`. They render
   * nothing and hold nothing focusable, so inerting them is ~200 attribute writes per
   * open and ~200 removals per close, on the phone this drawer exists for.
   */
  it('skips elements that render nothing and can hold nothing focusable', () => {
    const script = new Node('script');
    const link = new Node('link');
    const target = new Node('details');
    const body = new Node('body', [script, link, target, new Node('footer')]);

    inertOutside(target, body);
    expect(inert(script)).toBe(false);
    expect(inert(link)).toBe(false);
    expect(inert(body.children[3]!)).toBe(true);
  });

  it('does nothing at all without an anchor', () => {
    const p = page();
    expect(() => inertOutside(null, p.body)()).not.toThrow();
    expect(inert(p.header)).toBe(false);
  });
});

describe('guardOpenDrawer — Escape, scroll lock, and one symmetric teardown', () => {
  function keyTarget() {
    const listeners: Array<(event: { key: string }) => void> = [];
    return {
      listeners,
      addEventListener: (_type: 'keydown', fn: (event: { key: string }) => void) => {
        listeners.push(fn);
      },
      removeEventListener: (_type: 'keydown', fn: (event: { key: string }) => void) => {
        const i = listeners.indexOf(fn);
        if (i !== -1) listeners.splice(i, 1);
      },
    };
  }

  it('closes on Escape and ignores every other key', () => {
    const p = page();
    const keys = keyTarget();
    const onEscape = vi.fn();
    guardOpenDrawer({
      anchor: p.details,
      root: p.body,
      keyTarget: keys,
      scrollTarget: { style: { overflow: '' } },
      onEscape,
    });

    for (const key of ['a', 'Enter', 'Tab', 'Esc']) {
      keys.listeners.forEach((fn) => fn({ key }));
    }
    expect(onEscape).not.toHaveBeenCalled();

    keys.listeners.forEach((fn) => fn({ key: 'Escape' }));
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll while open and RESTORES what was there before', () => {
    const p = page();
    // Not '' — something else may already own a lock, and blanking it would silently
    // unlock a modal that is still up.
    const scrollTarget = { style: { overflow: 'clip' } };
    const release = guardOpenDrawer({
      anchor: p.details,
      root: p.body,
      keyTarget: keyTarget(),
      scrollTarget,
      onEscape: () => {},
    });

    expect(scrollTarget.style.overflow).toBe('hidden');
    release();
    expect(scrollTarget.style.overflow).toBe('clip');
  });

  /**
   * The bricked-page test. One teardown has to undo all three, because a cleanup path
   * that runs for two of them leaves a page that is either unscrollable or unusable.
   */
  it('undoes the listener, the lock and the inert in a single release', () => {
    const p = page();
    const keys = keyTarget();
    const scrollTarget = { style: { overflow: '' } };
    const onEscape = vi.fn();
    const release = guardOpenDrawer({
      anchor: p.details,
      root: p.body,
      keyTarget: keys,
      scrollTarget,
      onEscape,
    });
    release();

    expect(keys.listeners).toHaveLength(0);
    expect(scrollTarget.style.overflow).toBe('');
    expect(inert(p.header)).toBe(false);
    expect(inert(p.results)).toBe(false);

    // And a key press after teardown reaches nobody.
    keys.listeners.forEach((fn) => fn({ key: 'Escape' }));
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('releases exactly once, however many times it is called', () => {
    const p = page();
    const scrollTarget = { style: { overflow: '' } };
    const release = guardOpenDrawer({
      anchor: p.details,
      root: p.body,
      keyTarget: keyTarget(),
      scrollTarget,
      onEscape: () => {},
    });
    release();
    scrollTarget.style.overflow = 'hidden'; // a second drawer opens
    release(); // the stale cleanup fires again

    expect(scrollTarget.style.overflow).toBe('hidden');
  });
});
