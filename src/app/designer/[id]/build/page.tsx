import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getDesign } from '@/lib/board-designs';
import {
  designBuildSteps,
  type BuildStepQuantity,
} from '@/lib/board-designer/build-steps';
import { calculateMetrics } from '@/lib/board-designer/metrics';
import { formatInches } from '@/lib/format';
import { btnGhost } from '@/lib/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Board designer — build plan',
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function quantityLine(q: BuildStepQuantity): string {
  const dims: string[] = [];
  if (q.lengthIn !== undefined) dims.push(formatInches(q.lengthIn));
  if (q.widthIn !== undefined) dims.push(formatInches(q.widthIn));
  if (q.thicknessIn !== undefined) dims.push(formatInches(q.thicknessIn));
  const dimPart = dims.length > 0 ? ` · ${dims.join(' × ')}` : '';
  return `${q.count}× ${q.label}${dimPart}`;
}

export default async function DesignerBuildPage({ params }: PageProps) {
  await requireUser();
  const { id } = await params;
  const design = await getDesign(id);
  if (!design) notFound();

  const { config } = design;
  const metrics = calculateMetrics(config);
  const steps = designBuildSteps(config, metrics);

  return (
    <main id="main" className="page-wide py-[1.5rem]">
      <div className="mb-[1.25rem] flex flex-wrap items-center gap-[0.75rem]">
        <Link href={`/designer/${design.id}`} className={btnGhost}>
          ← Back to the designer
        </Link>
      </div>

      <header className="mb-[1.5rem]">
        <h1 className="!m-0 text-[1.75rem]">{design.name}</h1>
        <p className="m-0 mt-[0.375rem] text-[0.9375rem] text-muted">
          Build plan — ordered shop steps for this design.
        </p>
      </header>

      <ol className="m-0 grid list-none gap-[1.25rem] p-0">
        {steps.map((step, index) => (
          <li key={step.id} className="pl-[0.5rem]">
            <h2 className="!m-0 text-[1.125rem]">
              {index + 1}. {step.title}
            </h2>
            <p className="m-0 mt-[0.375rem] text-[0.9375rem]">{step.detail}</p>
            {step.quantities.length > 0 ? (
              <ul className="m-0 mt-[0.5rem] grid list-disc gap-[0.25rem] pl-[1.25rem] text-[0.875rem] text-muted">
                {step.quantities.map((q) => (
                  <li key={`${q.label}-${q.widthIn ?? ''}-${q.thicknessIn ?? ''}-${q.lengthIn ?? ''}`}>
                    {quantityLine(q)}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </main>
  );
}
