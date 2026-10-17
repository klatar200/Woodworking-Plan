import { describe, expect, it } from 'vitest';
import {
  DRAFT_KEY_PREFIX,
  clearAllDrafts,
  clearDraft,
  draftKey,
  loadDraft,
  saveDraft,
} from '@/lib/board-designer/draft-store';
import { parseConfig } from '@/lib/board-designer/serialize';
import { getTemplate } from '@/lib/board-designer/templates';

/** Sprint 81 — per-tab drafts: only savable designs, never throws, wipes only its own keys. */

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

const throwing = new Proxy({} as Storage, {
  get() {
    throw new Error('storage blocked');
  },
});

const checker = () => getTemplate('checkerboard')!.config;

describe('draft store', () => {
  it('round-trips a savable design in its parsed form', () => {
    const storage = new MemoryStorage();
    saveDraft('d1', checker(), storage);
    const parsed = parseConfig(checker());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(loadDraft('d1', storage)).toEqual(parsed.config);
    expect(draftKey('d1')).toBe('notch:designer-draft:d1');
    expect(draftKey(null)).toBe('notch:designer-draft:new');
  });

  it('keeps the previous draft when the new design is not savable', () => {
    const storage = new MemoryStorage();
    saveDraft('d1', checker(), storage);
    saveDraft('d1', { ...checker(), name: '' }, storage);
    expect(loadDraft('d1', storage)?.name).toBe('Checkerboard');
  });

  it('returns null for a missing key and for malformed JSON', () => {
    const storage = new MemoryStorage();
    expect(loadDraft('nope', storage)).toBeNull();
    storage.setItem(draftKey('bad'), '{not json');
    expect(loadDraft('bad', storage)).toBeNull();
  });

  it('never throws when storage does', () => {
    expect(() => saveDraft('d1', checker(), throwing)).not.toThrow();
    expect(loadDraft('d1', throwing)).toBeNull();
    expect(() => clearDraft('d1', throwing)).not.toThrow();
    expect(() => clearAllDrafts(throwing)).not.toThrow();
    expect(() => draftKey('d1')).not.toThrow();
  });

  it('clearAllDrafts removes only designer drafts', () => {
    const storage = new MemoryStorage();
    saveDraft('d1', checker(), storage);
    saveDraft(null, checker(), storage);
    storage.setItem('notch:step:plan-x', '3');
    clearAllDrafts(storage);
    expect([...Array(storage.length).keys()].map((i) => storage.key(i))).toEqual(['notch:step:plan-x']);
    expect(DRAFT_KEY_PREFIX).toBe('notch:designer-draft:');
  });
});
