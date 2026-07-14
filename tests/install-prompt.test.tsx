import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InstallPrompt } from '@/components/install-prompt';

/**
 * The banner only ever appears after a real `beforeinstallprompt` event AND a
 * delay, both of which happen in a `useEffect` — which never runs during
 * server-side rendering. So a static render must produce nothing: no banner,
 * no hydration mismatch, no flash of a prompt nobody has earned yet.
 */
describe('InstallPrompt — server render (no event has fired yet)', () => {
  it('renders nothing before any beforeinstallprompt event', () => {
    expect(renderToStaticMarkup(<InstallPrompt />)).toBe('');
  });
});
