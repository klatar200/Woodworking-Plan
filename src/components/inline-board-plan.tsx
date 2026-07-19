import Link from 'next/link';
import { BoardBar } from '@/components/board-bar';
import { formatInches } from '@/lib/format';
import {
  optimize,
  totalBoards,
  hasImpossibleParts,
  DEFAULT_OPTIONS,
  type Part,
} from '@/lib/cut-optimizer';

interface Props {
  slug: string;
  cutList: Array<{
    id: string;
    part: string;
    quantity: number;
    thicknessIn: number;
    widthIn: number;
    lengthIn: number;
    material: string | null;
  }>;
}

/**
 * The cut list, drawn — QOL-B item 4 (decided 2026-07-19: embed inline rather than
 * link out only).
 *
 * A table of 30 part dimensions does not answer "what do I put in the truck", and the
 * answer already existed one click away on `/plans/[slug]/boards`. This puts the
 * picture where people actually read the cut list, at the cost of a second render path.
 *
 * ── What is shared and what is not ───────────────────────────────────────────
 * The MATH is shared, not copied: `optimize()` and `totalBoards()` come from
 * `src/lib/cut-optimizer.ts`, the same functions the boards page calls. The DRAWING is
 * shared too (`board-bar.tsx`). What this component adds is only the compact framing.
 * If the optimizer's rules change — kerf, ripping, `physicalBoards` vs lanes — both
 * views change together, which is the whole reason not to reimplement any of it here.
 *
 * ── Why DEFAULT_OPTIONS, and why the link out ────────────────────────────────
 * Stock length, stock width and kerf are the boards page's job: they are GET params
 * there, and giving the tab its own controls would mean two places to change the same
 * setting and a plan page that re-optimizes on every keystroke. So this shows the
 * default answer (8 ft stock, 1/8″ kerf, each part bought at its own width) and says so,
 * then links out for anyone whose shop differs.
 *
 * ── Impossible parts are stated, loudly ──────────────────────────────────────
 * Optimizer rule 4: a confident buying list that cannot build the thing is worse than no
 * tool. If any part is too long for the default board, the headline number is withheld
 * — showing "buy 3 boards" while silently dropping the part that doesn't fit is the
 * exact failure that rule exists to prevent — and the reader is sent to the boards page,
 * where a longer stock length can be chosen and every impossible part is named.
 */
export function InlineBoardPlan({ slug, cutList }: Props) {
  const parts: Part[] = cutList.map((item) => ({
    id: item.id,
    label: item.part,
    quantity: item.quantity,
    thicknessIn: item.thicknessIn,
    widthIn: item.widthIn,
    lengthIn: item.lengthIn,
    material: item.material,
  }));

  const groups = optimize(parts, DEFAULT_OPTIONS);
  const boards = totalBoards(groups);
  const impossible = hasImpossibleParts(groups);
  const stockFt = DEFAULT_OPTIONS.stockLengthIn / 12;

  return (
    <div className="mt-[1.5rem]">
      <h3 className="sub-heading">What to buy</h3>

      {impossible ? (
        <p className="notice notice-warning">
          <strong>
            Some parts are longer than a {stockFt} ft board, so there is no honest board
            count to show here.
          </strong>{' '}
          <Link href={`/plans/${slug}/boards`}>Open the board plan</Link> to pick a longer
          stock length &mdash; it names every part that does not fit.
        </p>
      ) : (
        <p className="board-total">
          Buy <strong>{boards}</strong> {boards === 1 ? 'board' : 'boards'} at {stockFt} ft.
        </p>
      )}

      {groups.map((group) => (
        <section
          key={`${group.thicknessIn}x${group.widthIn}`}
          className="mb-[1.25rem] break-inside-avoid"
        >
          <h4 className="m-0 mb-[0.25rem] text-[0.95rem] font-semibold">
            {formatInches(group.thicknessIn)} &times; {formatInches(group.widthIn)}
            {group.material ? <span className="muted"> — {group.material}</span> : null}
          </h4>

          <p className="muted small mt-0 mb-[0.5rem]">
            {group.physicalBoards} {group.physicalBoards === 1 ? 'board' : 'boards'}
            {/* Say it when we are ripping. A board count several times smaller than the
                number of lengths drawn below looks like a bug unless the page explains
                itself — the same note the boards page makes. */}
            {group.ripsPerBoard > 1 ? (
              <>
                {' '}
                &mdash; {group.lanes} lengths, {group.ripsPerBoard} ripped side-by-side
                from each {formatInches(group.stockWidthIn)} board
              </>
            ) : null}
          </p>

          <ol className="board-list">
            {group.boards.map((board, index) => (
              <li key={index} className="board">
                <BoardBar
                  board={board}
                  number={index + 1}
                  ripped={group.ripsPerBoard > 1}
                />
              </li>
            ))}
          </ol>
        </section>
      ))}

      <p className="footnote">
        Assumes {stockFt} ft stock, a {formatInches(DEFAULT_OPTIONS.kerfIn)} saw kerf, and
        buying each part at its own width.{' '}
        <Link href={`/plans/${slug}/boards`}>
          Change the board size or kerf on the full board plan &rarr;
        </Link>
      </p>
    </div>
  );
}
