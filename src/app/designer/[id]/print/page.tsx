import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getDesign } from '@/lib/board-designs';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { BoardDiagram } from '@/components/designer/board-diagram';
import { formatInches } from '@/lib/format';
import { SITE_HOST } from '@/lib/brand';
import { btnGhost } from '@/lib/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Board designer — print',
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DesignerPrintPage({ params }: PageProps) {
  await requireUser();
  const { id } = await params;
  const design = await getDesign(id);
  if (!design) notFound();

  const { config } = design;
  const metrics = calculateMetrics(config);
  const finished = [
    metrics.finishedLengthIn,
    metrics.finishedWidthIn,
    metrics.finishedThicknessIn,
  ]
    .map(formatInches)
    .join(' × ');

  return (
    <main id="main" className="print-page">
      <div className="print-controls no-print">
        <Link href={`/designer/${design.id}`} className={btnGhost}>
          ← Back to the designer
        </Link>
        <p className="muted small">
          Use your browser&apos;s Print (Ctrl/Cmd&nbsp;+&nbsp;P) and choose{' '}
          <strong>Save as PDF</strong>.
        </p>
      </div>

      <header className="print-header">
        <h1>{design.name}</h1>
        <p className="print-summary">Board designer print sheet</p>
        <dl className="print-glance">
          <div>
            <dt>Grain</dt>
            <dd>{config.grain === 'end' ? 'End grain' : 'Edge grain'}</dd>
          </div>
          <div>
            <dt>Finished</dt>
            <dd>{finished}</dd>
          </div>
          <div>
            <dt>Total lumber</dt>
            <dd>{formatBoardFeet(metrics.totalBoardFeet)} bd ft</dd>
          </div>
          {config.grain === 'end' ? (
            <div>
              <dt>Slices</dt>
              <dd>
                {metrics.sliceCount} slices · {formatInches(metrics.leftoverIn)} leftover
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      <section className="print-section">
        <h2>Board diagram</h2>
        <figure className="print-board-diagram">
          <BoardDiagram config={config} metrics={metrics} />
        </figure>
      </section>

      <section className="print-section">
        <h2>Strips</h2>
        <table className="print-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Species</th>
              <th scope="col" className="numeric">
                Width
              </th>
              <th scope="col" className="numeric">
                Repeat
              </th>
              <th scope="col" className="numeric">
                Source length
              </th>
            </tr>
          </thead>
          <tbody>
            {config.strips.map((strip, index) => (
              <tr key={strip.id}>
                <td className="numeric" data-label="#">
                  {index + 1}
                </td>
                <td data-label="Species">
                  {speciesName(strip.speciesId, metrics)}
                </td>
                <td className="numeric mono" data-label="Width">
                  {formatInches(strip.widthIn)}
                </td>
                <td className="numeric" data-label="Repeat">
                  {strip.repeat}
                </td>
                <td className="numeric mono" data-label="Source length">
                  {formatInches(config.sourceLengthIn)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="print-section">
        <h2>Board feet by species</h2>
        <table className="print-table">
          <thead>
            <tr>
              <th scope="col">Species</th>
              <th scope="col" className="numeric">
                Board feet
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.boardFeetBySpecies.map((row) => (
              <tr key={row.speciesId}>
                <td data-label="Species">{row.name}</td>
                <td className="numeric" data-label="Board feet">
                  {formatBoardFeet(row.boardFeet)} bd ft
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="print-footer">
        <p>
          {SITE_HOST}/designer/{design.id}
        </p>
      </footer>
    </main>
  );
}

function formatBoardFeet(value: number): string {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function speciesName(
  speciesId: string,
  metrics: ReturnType<typeof calculateMetrics>,
): string {
  return (
    metrics.boardFeetBySpecies.find((row) => row.speciesId === speciesId)?.name ??
    speciesId
  );
}
