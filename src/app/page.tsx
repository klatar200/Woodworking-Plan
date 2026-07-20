import { redirect } from 'next/navigation';

/**
 * QOL-M Step 1 (2026-07-20): the catalog MOVED to `/browse`. This root route is a
 * TEMPORARY redirect to `/browse` until Step 2 builds the marketing landing page here
 * (the mockup approved in Step 0).
 *
 * The PWA manifest's `start_url` stays `/` (decided 2026-07-20), so an installed app
 * opens here; during this interim step it bounces to the catalog. Step 2 replaces this
 * file with the landing page, which carries its own prominent CTA into `/browse`.
 */
export default function HomePage() {
  redirect('/browse');
}
