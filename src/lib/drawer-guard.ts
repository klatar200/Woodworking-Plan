/**
 * Modal-surface manners for the mobile filter drawer — Sprint 39 (audit M2/A6).
 *
 * The drawer is an off-canvas sheet with a scrim over the page, i.e. it LOOKS modal. It
 * did not BEHAVE modal: Escape did nothing, Tab walked straight out of it into the
 * results hidden behind the scrim, and the page underneath scrolled while you dragged
 * inside the sheet. This module is the behaviour, extracted from the component so the
 * parts that can be wrong are testable — this repo runs vitest in `node`, with no DOM,
 * so anything that only exists inside a `useEffect` is untested by construction.
 *
 * Everything here is JS-only. With JavaScript off, `<details>` still opens and closes on
 * its own and none of this runs; the server-rendered markup is byte-identical.
 */

/**
 * The slice of `Element` this module actually uses.
 *
 * Structural, not `Element`, for one reason: it makes the walk testable with plain
 * objects. It is also honest about the surface — the only thing this code is allowed to
 * do to another element is add and remove one attribute.
 */
export interface InertNode {
  readonly tagName?: string;
  readonly parentElement: InertNode | null;
  readonly children: ArrayLike<InertNode>;
  hasAttribute(name: string): boolean;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

/**
 * Elements that render nothing and can hold nothing focusable, so inerting them is pure
 * churn. Not a micro-optimisation for its own sake: Next injects well over a hundred
 * `<script>` and `<link>` tags into `<body>`, and without this every drawer open wrote
 * ~200 attributes and every close removed them again — on the phone this feature exists
 * for. Verified in the browser before adding it.
 */
const NON_INTERACTIVE_TAGS = new Set([
  'SCRIPT',
  'LINK',
  'STYLE',
  'META',
  'TEMPLATE',
  'TITLE',
  'BASE',
]);

interface KeyTarget {
  addEventListener(type: 'keydown', listener: (event: { key: string }) => void): void;
  removeEventListener(type: 'keydown', listener: (event: { key: string }) => void): void;
}

/**
 * Make everything outside `anchor`'s subtree inert, and return the undo.
 *
 * 🛑 WHY SIBLINGS, NOT `document.querySelector('main')`. The obvious implementation —
 * inert the header, main and footer — BRICKS THE PAGE HERE, because the drawer is a
 * descendant of `<main>` (browse/page.tsx renders FilterPanel inside the catalog's own
 * `<main>`). Inerting main would inert the drawer along with it: an open sheet with a
 * scrim over the page and not one control in it that responds. So the walk goes UP from
 * the anchor, inerting each level's OTHER children — header and footer at the body
 * level, then the results column, the search row, the category rail, the sort control.
 * The anchor's ancestor chain is never touched, so the drawer stays live by construction
 * rather than by remembering to make an exception.
 *
 * `inert` is the right primitive rather than a focus-trap listener: it removes the
 * background from the tab order AND from the accessibility tree, so a screen reader's
 * virtual cursor cannot wander into content the sighted user cannot see either. A
 * `focusin` guard only fixes the first half.
 *
 * An element that is ALREADY inert is left alone and not recorded — it belongs to
 * whoever set it, and clearing someone else's `inert` on our cleanup would un-hide a
 * surface that is still meant to be hidden.
 *
 * The returned release is idempotent: React re-runs effects (StrictMode invokes them
 * twice in development), and a double release must not reach out and touch attributes a
 * later open has since set.
 */
export function inertOutside(anchor: InertNode | null, root: InertNode | null): () => void {
  const touched: InertNode[] = [];

  for (let node = anchor; node && node !== root; node = node.parentElement) {
    const parent = node.parentElement;
    if (!parent) break;
    const siblings = parent.children;
    for (let i = 0; i < siblings.length; i++) {
      const sibling: InertNode | undefined = siblings[i];
      if (!sibling || sibling === node || sibling.hasAttribute('inert')) continue;
      if (sibling.tagName && NON_INTERACTIVE_TAGS.has(sibling.tagName)) continue;
      sibling.setAttribute('inert', '');
      touched.push(sibling);
    }
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    for (const node of touched) node.removeAttribute('inert');
  };
}

export interface DrawerGuardTargets {
  /** The subtree that stays interactive — the `<details>`, so its summary stays reachable. */
  anchor: InertNode | null;
  /** Where the upward walk stops. `document.body`. */
  root: InertNode | null;
  /** Where the Escape listener lives. `document`. */
  keyTarget: KeyTarget | null;
  /** Whose `overflow` is locked while the drawer is open. `document.body`. */
  scrollTarget: { style: { overflow: string } } | null;
  /** Close the drawer and put focus back on the trigger. */
  onEscape: () => void;
}

/**
 * Apply the three modal manners at once, and return one cleanup that undoes all three.
 *
 * ONE function rather than three hooks because they must be symmetric: a page left with a
 * locked `overflow` cannot be scrolled and a page left with a stray `inert` cannot be
 * used at all — both are a bricked page, and both come from a cleanup path that ran for
 * two of the three. Tying them to a single teardown means there is no third path to
 * forget.
 *
 * The previous `overflow` is restored, not blanked. Blindly writing `''` would silently
 * unlock a scroll lock some other surface (a modal, say) is still relying on.
 */
export function guardOpenDrawer({
  anchor,
  root,
  keyTarget,
  scrollTarget,
  onEscape,
}: DrawerGuardTargets): () => void {
  const releaseInert = inertOutside(anchor, root);

  const onKeyDown = (event: { key: string }) => {
    if (event.key === 'Escape') onEscape();
  };
  keyTarget?.addEventListener('keydown', onKeyDown);

  const previousOverflow = scrollTarget?.style.overflow ?? '';
  if (scrollTarget) scrollTarget.style.overflow = 'hidden';

  let released = false;
  return () => {
    if (released) return;
    released = true;
    keyTarget?.removeEventListener('keydown', onKeyDown);
    if (scrollTarget) scrollTarget.style.overflow = previousOverflow;
    releaseInert();
  };
}
