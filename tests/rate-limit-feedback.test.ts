import { describe, it, expect } from 'vitest';
import {
  safeReturnTo,
  rateLimitNoticeUrl,
  denialTarget,
  hasRateLimitNotice,
} from '@/lib/rate-limit-feedback';

/**
 * The redirect target for a denied action is built from FORM DATA — i.e. from
 * attacker input. The tests that matter here are the open-redirect ones:
 * a crafted returnTo must never send a user off-site from our own domain.
 */

describe('safeReturnTo — returnTo is attacker input', () => {
  it('accepts an app-relative path, query string and all', () => {
    expect(safeReturnTo('/saved', '/')).toBe('/saved');
    expect(safeReturnTo('/?category=outdoor&page=2', '/')).toBe(
      '/?category=outdoor&page=2',
    );
  });

  it('rejects an absolute URL — the open redirect', () => {
    expect(safeReturnTo('https://evil.example/sign-in', '/')).toBe('/');
    expect(safeReturnTo('http://evil.example', '/saved')).toBe('/saved');
  });

  it('rejects a protocol-relative URL — starts with "/" but leaves the site', () => {
    expect(safeReturnTo('//evil.example/sign-in', '/')).toBe('/');
  });

  it('rejects the backslash variant of the same trick', () => {
    expect(safeReturnTo('/\\evil.example', '/')).toBe('/');
  });

  it('rejects javascript: and other non-path schemes', () => {
    expect(safeReturnTo('javascript:alert(1)', '/')).toBe('/');
  });

  it('falls back for missing, empty, or non-string values', () => {
    expect(safeReturnTo(undefined, '/x')).toBe('/x');
    expect(safeReturnTo(null, '/x')).toBe('/x');
    expect(safeReturnTo('', '/x')).toBe('/x');
    expect(safeReturnTo(42, '/x')).toBe('/x');
  });
});

describe('rateLimitNoticeUrl', () => {
  it('appends with ? on a bare path', () => {
    expect(rateLimitNoticeUrl('/saved')).toBe('/saved?notice=slow-down');
  });

  it('appends with & when a query string already exists — filters survive', () => {
    expect(rateLimitNoticeUrl('/?category=outdoor')).toBe(
      '/?category=outdoor&notice=slow-down',
    );
  });
});

describe('denialTarget — where a denied action bounces to', () => {
  function form(entries: Record<string, string>): FormData {
    const formData = new FormData();
    for (const [k, v] of Object.entries(entries)) formData.set(k, v);
    return formData;
  }

  it('prefers a valid returnTo', () => {
    expect(denialTarget(form({ returnTo: '/?page=2' }), '/')).toBe(
      '/?page=2&notice=slow-down',
    );
  });

  it('falls back to the plan page when the form carries a well-formed slug', () => {
    expect(denialTarget(form({ slug: 'oak-coat-rack' }), '/')).toBe(
      '/plans/oak-coat-rack?notice=slow-down',
    );
  });

  it('a malformed slug is NOT embedded in a path — it, too, is form input', () => {
    expect(denialTarget(form({ slug: '../profile' }), '/')).toBe(
      '/?notice=slow-down',
    );
    expect(denialTarget(form({ slug: 'x?y=z' }), '/saved')).toBe(
      '/saved?notice=slow-down',
    );
  });

  it('a hostile returnTo falls through to the slug fallback, not off-site', () => {
    expect(
      denialTarget(form({ returnTo: '//evil.example', slug: 'oak-coat-rack' }), '/'),
    ).toBe('/plans/oak-coat-rack?notice=slow-down');
  });

  it('uses the given default when the form has neither', () => {
    expect(denialTarget(form({}), '/saved')).toBe('/saved?notice=slow-down');
  });
});

describe('hasRateLimitNotice', () => {
  it('matches only the exact notice value', () => {
    expect(hasRateLimitNotice('slow-down')).toBe(true);
    expect(hasRateLimitNotice('anything-else')).toBe(false);
    expect(hasRateLimitNotice(undefined)).toBe(false);
    // Next hands repeated params as an array — not a valid notice.
    expect(hasRateLimitNotice(['slow-down', 'slow-down'])).toBe(false);
  });
});
