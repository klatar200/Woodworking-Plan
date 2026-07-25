import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { page } from '@/lib/ui';
import { getDesign } from '@/lib/board-designs';
import { DesignerShell } from '@/components/designer/designer-shell';
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
  params: Promise<{ id: string }>;
};

export default async function SavedDesignerPage({ params }: PageProps) {
  const { id } = await params;
  const design = await getDesign(id);
  if (!design) notFound();

  return (
    // Full-width on desktop like /browse — preview column takes the slack.
    <main id="main" className={`${page} lg:max-w-none`}>
      <p className="breadcrumb no-print">
        <Link href="/designer/library">Your boards</Link>
      </p>
      <DesignerShell
        designId={design.id}
        initialConfig={design.config}
        saveAction={createBoardDesignAction}
        updateAction={updateBoardDesignAction}
      />
    </main>
  );
}
