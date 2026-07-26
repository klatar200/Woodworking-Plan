import type { Metadata } from 'next';
import Link from 'next/link';
import { page } from '@/lib/ui';
import { requireUser } from '@/lib/auth';
import { getTemplate } from '@/lib/board-designer/templates';
import { DesignerShell } from '@/components/designer/designer-shell';
import {
  DesignTooLargeNotice,
  RateLimitNotice,
} from '@/components/rate-limit-notice';
import {
  hasDesignTooLargeNotice,
  hasRateLimitNotice,
} from '@/lib/rate-limit-feedback';
import {
  createBoardDesignAction,
  updateBoardDesignAction,
} from '@/app/actions/board-designs';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Board designer',
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ notice?: string }>;
};

export default async function DesignerPage({ searchParams }: PageProps) {
  await requireUser();
  const { notice } = await searchParams;

  const template = getTemplate('checkerboard');
  if (!template) {
    throw new Error('Missing checkerboard board designer template');
  }

  return (
    // Full-width on desktop like /browse — preview column takes the slack.
    <main id="main" className={`${page} lg:max-w-none`}>
      <RateLimitNotice
        show={hasRateLimitNotice(notice)}
        dismissHref="/designer"
      />
      <DesignTooLargeNotice
        show={hasDesignTooLargeNotice(notice)}
        dismissHref="/designer"
      />
      <p className="breadcrumb no-print">
        <Link href="/designer/library">Your boards</Link>
      </p>
      <DesignerShell
        designId={null}
        initialConfig={template.config}
        saveAction={createBoardDesignAction}
        updateAction={updateBoardDesignAction}
      />
    </main>
  );
}
