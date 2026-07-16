import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InstallCapture, InstallMenuItem } from '@/components/install-prompt';

/**
 * 2026-07-16: the catalog install BANNER is gone — install lives in the profile
 * dropdown and the mobile drawer, fed by the app-wide capture in the root
 * layout (see src/lib/install-store.ts). The server-render contract is the
 * same as the old banner's, and worth guarding for the same reason: nothing
 * install-related may appear in the static document, because installability
 * only exists after a real `beforeinstallprompt` event that SSR can never see.
 * Anything rendered here would be a dead control AND a hydration mismatch.
 */
describe('install affordance — server render (no event can have fired)', () => {
  it('InstallCapture renders nothing, ever (it is a listener, not UI)', () => {
    expect(renderToStaticMarkup(<InstallCapture />)).toBe('');
  });

  it('InstallMenuItem renders nothing before any beforeinstallprompt event', () => {
    expect(renderToStaticMarkup(<InstallMenuItem className="x" />)).toBe('');
  });
});
