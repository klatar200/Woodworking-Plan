import { describe, expect, it } from 'vitest';
import { copyDesignName } from '@/lib/board-designer/copy-name';

describe('copyDesignName', () => {
  it('prefixes Copy of and trims to 80', () => {
    expect(copyDesignName('Maple')).toBe('Copy of Maple');
    expect(copyDesignName('  Maple  ')).toBe('Copy of Maple');
    expect(copyDesignName('')).toBe('Copy of Untitled');
    const long = 'x'.repeat(100);
    expect(copyDesignName(long).length).toBe(80);
    expect(copyDesignName(long).startsWith('Copy of ')).toBe(true);
  });
});
