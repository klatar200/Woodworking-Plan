import type { Metadata } from 'next';
import Link from 'next/link';
import { page, btnGhost, btnPrimary } from '@/lib/ui';
import { listDesigns } from '@/lib/board-designs';
import { deleteBoardDesignAction } from '@/app/actions/board-designs';
import { DesignThumbnail } from '@/components/designer/design-thumbnail';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Board designer',
  robots: { index: false, follow: false },
};

export default async function DesignerLibraryPage() {
  const designs = await listDesigns();

  return (
    <main id="main" className={page}>
      <p className="breadcrumb no-print">
        <Link href="/designer">Board designer</Link>
      </p>
      <div className="flex flex-wrap items-center justify-between gap-[0.75rem] mb-[1rem]">
        <h1 className="m-0!">Your boards</h1>
        <Link href="/designer" className={btnPrimary}>
          New board
        </Link>
      </div>

      {designs.length === 0 ? (
        <p className="muted">No boards saved yet. Start from a template.</p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-[0.75rem]">
          {designs.map((design) => (
            <li
              key={design.id}
              className="flex flex-wrap items-center justify-between gap-[0.75rem] rounded-[1rem] border border-border bg-surface p-[1rem] shadow-e1"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[0.875rem]">
                <DesignThumbnail name={design.name} configJson={design.config} />
                <div className="min-w-0">
                  <Link href={`/designer/${design.id}`} className="font-medium!">
                    {design.name}
                  </Link>
                  <p className="small muted m-0">
                    Updated {design.updatedAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <form action={deleteBoardDesignAction}>
                <input type="hidden" name="designId" value={design.id} />
                <input type="hidden" name="returnTo" value="/designer/library" />
                <button type="submit" className={btnGhost}>
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
