import type { Metadata } from 'next';
import Link from 'next/link';
import { page } from '@/lib/ui';
import { requireUser } from '@/lib/auth';
import { getTemplate } from '@/lib/board-designer/templates';
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

export default async function DesignerPage() {
  await requireUser();

  const template = getTemplate('checkerboard');
  if (!template) {
    throw new Error('Missing checkerboard board designer template');
  }

  return (
    <main id="main" className={`${page} page-wide`}>
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
