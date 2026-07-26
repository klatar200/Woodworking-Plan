import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { page } from '@/lib/ui';
import { getDesign } from '@/lib/board-designs';
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
import { addBoardDesignToShoppingListAction } from '@/app/actions/shopping-list';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Board designer',
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
};

export default async function SavedDesignerPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { notice } = await searchParams;
  const design = await getDesign(id);
  if (!design) notFound();

  const dismissHref = `/designer/${design.id}`;

  return (
    // Full-width on desktop like /browse — preview column takes the slack.
    <main id="main" className={`${page} lg:max-w-none`}>
      <RateLimitNotice
        show={hasRateLimitNotice(notice)}
        dismissHref={dismissHref}
      />
      <DesignTooLargeNotice
        show={hasDesignTooLargeNotice(notice)}
        dismissHref={dismissHref}
      />
      <p className="breadcrumb no-print">
        <Link href="/designer/library">Your boards</Link>
      </p>
      <DesignerShell
        designId={design.id}
        initialConfig={design.config}
        saveAction={createBoardDesignAction}
        updateAction={updateBoardDesignAction}
        addToShoppingListAction={addBoardDesignToShoppingListAction}
      />
    </main>
  );
}
