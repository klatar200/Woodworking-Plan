import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getDesign } from '@/lib/board-designs';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { ROW_TRANSFORM_LABELS } from '@/lib/board-designer/row-transform';
import type { MiterCorner } from '@/lib/board-designer/types';
import { BoardDiagram } from '@/components/designer/board-diagram';
import { formatInches, formatBoardFeet } from '@/lib/format';
import { SITE_HOST } from '@/lib/brand';
import { btnGhost } from '@/lib/ui';

const CORNER_LABELS: Record<MiterCorner, string> = {
  tl: 'Top left',
  tr: 'Top right',
  bl: 'Bottom left',
  br: 'Bottom right',
};

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
  const planById = new Map(metrics.panelPlan.map((p) => [p.panelId, p]));

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
              <dd>{metrics.sliceCount}</dd>
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

      {config.panels.map((panel) => {
        const plan = planById.get(panel.id);
        return (
          <section key={panel.id} className="print-section">
            <h2>{panel.label}</h2>
            <p className="muted small">
              Thickness {formatInches(panel.thicknessIn)}
              {plan
                ? ` · width ${formatInches(plan.widthIn)} · required length ${formatInches(plan.requiredLengthIn)}`
                : ''}
            </p>
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
                  <th scope="col">Miter</th>
                  <th scope="col" className="numeric">
                    Required length
                  </th>
                </tr>
              </thead>
              <tbody>
                {panel.strips.map((strip, index) => (
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
                    <td data-label="Miter">
                      {strip.miter
                        ? `${speciesName(strip.miter.speciesId, metrics)} · ${strip.miter.angleDeg}° · ${CORNER_LABELS[strip.miter.corner]}`
                        : '—'}
                    </td>
                    <td className="numeric mono" data-label="Required length">
                      {formatInches(plan?.requiredLengthIn ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      {config.grain === 'end' && (
        <section className="print-section">
          <h2>Row order</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th scope="col">Row</th>
                <th scope="col">Panel</th>
                <th scope="col">Placement</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: config.rowCount }, (_, i) => {
                const step = config.rowPattern[i % config.rowPattern.length]!;
                const panel = config.panels.find((p) => p.id === step.panelId);
                return (
                  <tr key={i}>
                    <td className="numeric" data-label="Row">
                      {i + 1}
                    </td>
                    <td data-label="Panel">{panel?.label ?? step.panelId}</td>
                    <td data-label="Placement">
                      {ROW_TRANSFORM_LABELS[step.transform]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

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
        {config.panels.some((p) => p.strips.some((s) => s.miter)) ? (
          <p className="muted small print-miter-note">
            Mitered strips are ripped at an angle and glued to a contrasting
            wedge. One rip yields two composite strips (A-base/B-wedge and
            B-base/A-wedge). Board feet above count the area you keep if you use
            both offcuts; discarding the mates means buying roughly twice this.
          </p>
        ) : null}
      </section>

      <footer className="print-footer">
        <p>
          {SITE_HOST}/designer/{design.id}
        </p>
      </footer>
    </main>
  );
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
