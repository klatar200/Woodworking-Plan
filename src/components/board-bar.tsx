import { formatInches } from '@/lib/format';
import type { PackedBoard } from '@/lib/cut-optimizer';

interface Props {
  board: PackedBoard;
  /** 1-based, for the accessible name ("Board 2: …"). */
  number: number;
  /** True when several of these lengths are ripped from one physical board. */
  ripped: boolean;
}

/**
 * The to-scale board bar — extracted from the Sprint 15 board-plan page (QOL-B item 4).
 *
 * Someone standing at a saw should be able to SEE the layout, not reconstruct it from a
 * table of numbers. Each part's width in the bar is its share of the board's length
 * (`flexGrow: lengthIn`), and the leftover is drawn as hatching rather than merely
 * stated — seeing 73″ of empty board is what tells you to buy a 6-footer instead.
 *
 * WHY THIS IS ITS OWN COMPONENT NOW: the cut-list tab on the plan page renders the same
 * picture (QOL-B), and two copies of a proportional layout would drift the moment one
 * gained a label the other didn't. The OPTIMIZER was already shared — `optimize()` /
 * `totalBoards()` in `src/lib/cut-optimizer.ts`, called by both pages, never
 * reimplemented. This shares the drawing as well.
 *
 * The `board-bar` / `board-piece` / `board-offcut` classes are RETAINED (not converted
 * to utilities): the print stylesheet restyles them by name for paper (grey fill, black
 * borders), and the standing rule is that any class named in an `@media print` block
 * stays on its element.
 */
export function BoardBar({ board, number, ripped }: Props) {
  const noun = ripped ? 'Length' : 'Board';

  return (
    <div
      className="board-bar"
      role="img"
      aria-label={`${noun} ${number}: ${board.parts
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
  );
}
