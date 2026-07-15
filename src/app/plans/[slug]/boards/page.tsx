import { notFound } from 'next/navigation';
import { btn } from '@/lib/ui'; // Sprint 29: shared bare-button class
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPlanBySlug } from '@/lib/plans';
import { formatInches } from '@/lib/format';
import {
  optimize,
  totalBoards,
  hasImpossibleParts,
  yieldRatio,
  DEFAULT_OPTIONS,
  STOCK_LENGTHS_IN,
  STOCK_WIDTHS_IN,
  KERF_OPTIONS_IN,
  type Part,
} from '@/lib/cut-optimizer';

/**
 * Board plan — Sprint 15. The cut-list optimizer.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * "WHAT DO I ACTUALLY PUT IN THE TRUCK?"
 *
 * Every plan site gives you a cut list. None of them answers that question. This page
 * is the differentiator: it turns 109 part dimensions into a number of boards, and a
 * layout showing which parts come off which one.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * A PUBLIC route under `/plans(.*)`, so the Sprint 8 service worker caches it and the
 * Sprint 14 download picks it up. This is the sheet you want at the lumberyard, and a
 * lumberyard is a warehouse with no signal.
 *
 * Stock length and kerf are GET params — a plain form, no JavaScript. Someone who owns
 * a track saw with a thin blade, or who can only fit 6-foot boards in their car, gets
 * an answer for THEIR shop rather than for mine.
 */
export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ stock?: string; width?: string; kerf?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPlanBySlug(slug);

  if (!plan) return { title: 'Plan not found' };

  return {
    title: `${plan.title} — board plan`,
    robots: { index: false, follow: false },
  };
}

/** Never trust the query string. Anything unrecognized falls back to the default. */
function parseChoice(raw: string | undefined, allowed: readonly number[], fallback: number) {
  const value = Number.parseFloat(raw ?? '');
  return allowed.includes(value) ? value : fallback;
}

export default async function BoardPlanPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const plan = await getPlanBySlug(slug);

  // Null for unknown AND unpublished alike — the optimizer is not a back door into
  // staged content.
  if (!plan) notFound();

  const stockLengthIn = parseChoice(query.stock, STOCK_LENGTHS_IN, DEFAULT_OPTIONS.stockLengthIn);
  const kerfIn = parseChoice(query.kerf, KERF_OPTIONS_IN, DEFAULT_OPTIONS.kerfIn);

  /**
   * Stock WIDTH. `null` (the default) means "buy each part at its own width", which is
   * right for dimensional lumber — a 3.5″ part IS a 1x4.
   *
   * Choose a width and the optimizer RIPS instead: it works out how many parts fit across
   * the board and divides the board count accordingly. That is the only correct answer
   * for something like the maple cutting board, whose 2″ strips are not a thing you can
   * buy — you rip them from a 1x10.
   */
  const stockWidthIn =
    query.width === 'rip-none' || query.width === undefined
      ? null
      : STOCK_WIDTHS_IN.includes(Number.parseFloat(query.width) as never)
        ? Number.parseFloat(query.width)
        : null;

  const options = { ...DEFAULT_OPTIONS, stockLengthIn, stockWidthIn, kerfIn };

  const parts: Part[] = plan.cutList.map((item) => ({
    id: item.id,
    label: item.part,
    quantity: item.quantity,
    thicknessIn: item.thicknessIn,
    widthIn: item.widthIn,
    lengthIn: item.lengthIn,
    material: item.material,
  }));

  const groups = optimize(parts, options);
  const boards = totalBoards(groups);
  const impossible = hasImpossibleParts(groups);

  return (
    <main id="main" className="print-page">
      <div className="print-controls no-print">
        <Link href={`/plans/${plan.slug}`}>← Back to the plan</Link>
      </div>

      <header className="print-header">
        <h1>{plan.title} — board plan</h1>
        <p className="print-summary">
          What to buy, and which parts come off which board.
        </p>
      </header>

      {/* Options. A plain GET form — no JavaScript, and it survives being printed. */}
      <form method="get" className="scope-form no-print">
        <label htmlFor="stock">Board length</label>
        <select id="stock" name="stock" defaultValue={String(stockLengthIn)}>
          {STOCK_LENGTHS_IN.map((length) => (
            <option key={length} value={length}>
              {length / 12} ft ({length}&Prime;)
            </option>
          ))}
        </select>

        <label htmlFor="width">Board width</label>
        <select id="width" name="width" defaultValue={stockWidthIn === null ? 'rip-none' : String(stockWidthIn)}>
          {/* The default is the honest one for dimensional lumber. */}
          <option value="rip-none">Buy each part&apos;s width</option>
          {STOCK_WIDTHS_IN.map((width) => (
            <option key={width} value={width}>
              Rip from {formatInches(width)} stock
            </option>
          ))}
        </select>

        <label htmlFor="kerf">Saw kerf</label>
        <select id="kerf" name="kerf" defaultValue={String(kerfIn)}>
          {KERF_OPTIONS_IN.map((kerf) => (
            <option key={kerf} value={kerf}>
              {formatInches(kerf)}
            </option>
          ))}
        </select>

        <button type="submit" className={btn}>
          Recalculate
        </button>
      </form>

      {/*
        THE HEADLINE NUMBER. The whole point of the page: one number you can act on.
      */}
      <p className="board-total">
        Buy <strong>{boards}</strong> {boards === 1 ? 'board' : 'boards'} at{' '}
        {stockLengthIn / 12} ft.
      </p>

      {/* IMPOSSIBLE PARTS FIRST, and loudly. A buying list that cannot build the thing
          is worse than no buying list at all. */}
      {impossible && (
        <div className="notice notice-warning">
          <strong>Some parts do not fit on a {stockLengthIn / 12} ft board.</strong> Pick a
          longer board above, or plan to join them. They are listed with their groups
          below — they are <em>not</em> included in the board count.
        </div>
      )}

      {groups.map((group) => {
        const yieldPct = Math.round(yieldRatio(group, stockLengthIn) * 100);

        return (
          <section
            key={`${group.thicknessIn}x${group.widthIn}`}
            className="print-section board-group"
          >
            <h2>
              {formatInches(group.thicknessIn)} &times; {formatInches(group.widthIn)}
              {group.material ? <span className="muted"> — {group.material}</span> : null}
            </h2>

            <p className="muted small">
              <strong>
                {group.physicalBoards}{' '}
                {group.physicalBoards === 1 ? 'board' : 'boards'}
              </strong>
              {/* If we are RIPPING, say so and show the arithmetic. A board count that
                  is 4× smaller than the number of lengths looks like a bug unless the
                  page explains itself. */}
              {group.ripsPerBoard > 1 && (
                <>
                  {' '}
                  &mdash; {group.lanes} lengths, {group.ripsPerBoard} ripped side-by-side
                  from each {formatInches(group.stockWidthIn)} board
                </>
              )}{' '}
              &middot; {group.boardFeet.toFixed(1)} board feet (includes{' '}
              {Math.round(options.wasteFactor * 100)}% for knots and defects) &middot;{' '}
              {/* HONEST ABOUT WASTE. A low yield is the user's cue to buy a shorter
                  board — hiding it would be hiding the tool's own limitation. This is
                  the whole board you pay for: length offcut AND, when ripping, any rip
                  lane left empty both count against it. */}
              {yieldPct}% of the boards you buy used
            </p>

            {group.impossible.length > 0 && (
              <ul className="detail-list">
                {group.impossible.map((item) => (
                  <li key={item.id} className="detail-row impossible-part">
                    <strong>{item.label}</strong> at {formatInches(item.lengthIn)} &mdash;{' '}
                    {item.reason}
                  </li>
                ))}
              </ul>
            )}

            <ol className="board-list">
              {group.boards.map((board, index) => (
                <li key={index} className="board">
                  <h3 className="board-heading">
                    {/* "Length", not "Board" — when ripping, several of these come off
                        ONE board, and calling them boards would double-count in the
                        user's head against the buying number above. */}
                    {group.ripsPerBoard > 1 ? 'Length' : 'Board'} {index + 1}
                    <span className="muted">
                      {' '}
                      &middot; {formatInches(board.offcutIn)} left over
                    </span>
                  </h3>

                  {/* A to-scale bar. Someone standing at a saw should be able to SEE the
                      layout, not reconstruct it from a table of numbers. */}
                  <div
                    className="board-bar"
                    role="img"
                    aria-label={`Board ${index + 1}: ${board.parts
                      .map((p) => `${p.label} at ${formatInches(p.lengthIn)}`)
                      .join(', ')}, with ${formatInches(board.offcutIn)} left over`}
                  >
                    {board.parts.map((p, i) => (
                      <span
                        key={`${p.id}-${i}`}
                        className="board-piece"
                        style={{ flexGrow: p.lengthIn }}
                        title={`${p.label} — ${formatInches(p.lengthIn)}`}
                      >
                        <span className="board-piece-label">{formatInches(p.lengthIn)}</span>
                      </span>
                    ))}
                    {board.offcutIn > 0 && (
                      <span className="board-offcut" style={{ flexGrow: board.offcutIn }} />
                    )}
                  </div>

                  <ol className="board-cuts">
                    {board.parts.map((p, i) => (
                      <li key={`${p.id}-${i}`}>
                        {p.label} &mdash; <strong>{formatInches(p.lengthIn)}</strong>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <p className="footnote">
        Cuts are listed longest-first, which is how they should be made: the awkward
        pieces get placed while there is still board to place them on. The layout assumes
        one end of each board is squared off ({formatInches(options.endTrimIn)}) and that
        every cut costs {formatInches(kerfIn)} of kerf &mdash; the reason six 16&Prime;
        parts do not fit on a 96&Prime; board.
      </p>
    </main>
  );
}
