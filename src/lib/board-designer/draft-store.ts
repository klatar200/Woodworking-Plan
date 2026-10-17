import { parseConfig } from './serialize';
import type { BoardDesignConfig } from './types';

/**
 * Per-tab drafts of an unsaved board design (Sprint 81).
 *
 * A reload, a crash, or an in-app navigation used to throw the user's edits away. The designer now
 * keeps the latest design the server would accept here and restores it on return.
 *
 * PRIVACY: `sessionStorage` only — never storage that outlives the tab, because a private board must
 * not survive on a shared computer. `PrivateCacheGuard` also wipes every draft on sign-out
 * (CLAUDE.md §7 Offline/SW).
 *
 * Storage access THROWS in Safari private mode and with cookies blocked — even reading
 * `window.sessionStorage` does (see step-progress.ts). Every function here swallows that: losing a
 * draft is better than breaking the designer.
 */
export const DRAFT_KEY_PREFIX = 'notch:designer-draft:';

export function draftKey(designId: string | null): string {
  return `${DRAFT_KEY_PREFIX}${designId ?? 'new'}`;
}

function resolve(storage?: Storage): Storage | null {
  return storage ?? window.sessionStorage;
}

/** Store the design only when the server would accept it; otherwise keep the previous draft. */
export function saveDraft(
  designId: string | null,
  config: BoardDesignConfig,
  storage?: Storage,
): void {
  try {
    const parsed = parseConfig(config);
    if (!parsed.ok) return;
    resolve(storage)?.setItem(draftKey(designId), JSON.stringify(parsed.config));
  } catch {
    // Storage unavailable or full — drafts are best-effort.
  }
}

export function loadDraft(
  designId: string | null,
  storage?: Storage,
): BoardDesignConfig | null {
  try {
    const raw = resolve(storage)?.getItem(draftKey(designId));
    if (!raw) return null;
    const parsed = parseConfig(JSON.parse(raw));
    return parsed.ok ? parsed.config : null;
  } catch {
    return null;
  }
}

export function clearDraft(designId: string | null, storage?: Storage): void {
  try {
    resolve(storage)?.removeItem(draftKey(designId));
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/** Remove every designer draft, and nothing else — called on sign-out. */
export function clearAllDrafts(storage?: Storage): void {
  try {
    const store = resolve(storage);
    if (!store) return;
    const keys: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key?.startsWith(DRAFT_KEY_PREFIX)) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
  } catch {
    // Best-effort, like the private cache wipe it runs beside.
  }
}
