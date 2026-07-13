/**
 * Cut-list optimizer / board-footage calculator — Sprint 15.
 *
 * Turns a plan's cut list ("6 strips at 13/16 × 2 × 19″") into a BOARD PLAN: how many
 * boards of what length to buy, and which parts to cut from each one.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * THIS IS THE DIFFERENTIATOR. Every plan site gives you a cut list. None of them tells
 * you what to actually put in the truck.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ─── THE FOUR THINGS THAT MAKE A NAIVE OPTIMIZER DANGEROUS ────────────────────
 *
 * 1. **KERF.** Every cut turns ~1/8″ of wood into sawdust. An optimizer that packs
 *    lengths without accounting for it tells you six 16″ pieces fit on a 96″ board
 *    (96 = 6 × 16, exactly), and then they don't — you are 5/8″ short, standing at a
 *    saw, with the last piece ruined. **Kerf is not a detail. It is the whole reason
 *    people get this wrong by hand.**
 *
 * 2. **You cannot cut a part longer than the board.** An optimizer that silently drops
 *    an impossible part hands you a confident buying list that cannot build the thing.
 *    Impossible parts are reported LOUDLY and never quietly omitted.
 *
 * 3. **GRAIN DOES NOT ROTATE.** This is 1-D packing along the board's LENGTH, and it
 *    must stay 1-D. A 2-D packer would happily lay a 30″ part across a 6″-wide board
 *    "because it fits", which is not a board, it is firewood. Length is length.
 *
 * 4. **Real boards have knots, splits and snipe.** The board-footage figure carries a
 *    waste allowance, because buying exactly what the cut list sums to is how you end
 *    up back at the lumberyard.
 *
 * ─── WHY FIRST-FIT-DECREASING, AND NOT SOMETHING CLEVERER ─────────────────────
 *
 * Bin-packing is NP-hard. FFD is the standard heuristic and is provably within
 * 11/9·OPT + 6/9 of optimal — for a hobbyist buying five boards, that is either exactly
 * optimal or one board off, and the "one board off" case is a spare board, which any
 * woodworker will tell you is not a loss.
 *
 * It is also DETERMINISTIC and explainable, which matters more than the last 3% of
 * yield: the user has to be able to look at the layout and see that it is sane. A
 * simulated-annealing solution that saves half a board and cannot be checked by eye is
 * a worse product.
 */

/** A part to cut. Dimensions in inches. */
export interface Part {
  /** Stable id, so the UI can key rows. */
  id: string;
  label: string;
  quantity: number;
  thicknessIn: number;
  widthIn: number;
  lengthIn: number;
  material: string | null;
}

/** One physical board, and what gets cut from it. */
export interface PackedBoard {
  /** The parts, in the order they should be cut (longest first). */
  parts: { id: string; label: string; lengthIn: number }[];
  /** Inches of board consumed, INCLUDING kerf and the end trim. */
  usedIn: number;
  /** Inches left over. Usable offcut if it is long enough to be worth keeping. */
  offcutIn: number;
}

/** All the parts sharing one stock profile (same thickness and width). */
export interface BoardGroup {
  thicknessIn: number;
  widthIn: number;
  material: string | null;
  boards: PackedBoard[];
  /** Parts that CANNOT be cut from the chosen stock. Never silently dropped. */
  impossible: { id: string; label: string; lengthIn: number; reason: string }[];
  /** Total board feet for this group, INCLUDING the waste allowance. */
  boardFeet: number;
  /**
   * How many of these parts can be ripped side-by-side from one board.
   *
   * 1 when the part width IS the stock width (buy a 1x4, cut 1x4 parts). More when the
   * parts are narrower and you rip them out of something wider — which is how you get
   * 2″ cutting-board strips, since nobody sells a 2″ board.
   */
  ripsPerBoard: number;
  /** The stock actually being bought for this group. */
  stockWidthIn: number;
  /** `packLengths` works in LANES, not boards. This is how many lanes it produced. */
  lanes: number;
  /**
   * The number the user actually acts on: physical boards to buy.
   *
   * `ceil(lanes / ripsPerBoard)`. Distinct from `lanes` on purpose — conflating "a
   * length of board I need" with "a board I must buy" is exactly how a rip-capable
   * optimizer over-buys by 4x.
   */
  physicalBoards: number;
}

export interface OptimizerOptions {
  /** Stock board length, inches. */
  stockLengthIn: number;
  /**
   * Stock board WIDTH, inches — or `null` to buy each part's width exactly.
   *
   * ═══════════════════════════════════════════════════════════════════════════════
   * THIS OPTION EXISTS BECAUSE THE FIRST VERSION OF THIS FILE WAS WRONG.
   *
   * It grouped parts by width and implicitly assumed you could BUY a board of that
   * width. For the cedar plans (3.5″, 5.5″ — real 1x4 and 1x6 stock) that happens to be
   * true. For the maple cutting board, whose strips are 2″ wide, it is not: **nobody
   * sells a 2″-wide hardwood board.** You RIP those from something wider.
   *
   * So the tool would have confidently told someone to buy stock that does not exist —
   * precisely the "confidently wrong" failure this whole sprint is supposed to prevent.
   *
   * With a stock width set, the optimizer works out how many parts can be RIPPED
   * side-by-side from one board (minus a kerf per rip) and packs lengths into those
   * lanes instead. `null` keeps the old behaviour, which is right when the part width
   * genuinely IS a stock width.
   * ═══════════════════════════════════════════════════════════════════════════════
   */
  stockWidthIn: number | null;
  /** Saw kerf, inches. A standard table-saw blade is 1/8". */
  kerfIn: number;
  /**
   * Inches trimmed off the end of every board before any part is cut.
   *
   * Board ends are rarely square, and are often checked or split. Squaring one end
   * before you start is what every woodworker actually does, so the optimizer must
   * assume it too — otherwise its layout is one trim cut short of reality.
   */
  endTrimIn: number;
  /** Extra material bought to cover knots, splits and snipe. 0.15 = 15%. */
  wasteFactor: number;
}

/** Sensible defaults. A 1/8" kerf and 15% waste are the standard shop assumptions. */
export const DEFAULT_OPTIONS: OptimizerOptions = {
  stockLengthIn: 96, // an 8-foot board
  stockWidthIn: null, // buy each part's width — correct for dimensional lumber
  kerfIn: 0.125, // 1/8" — a standard table-saw blade
  endTrimIn: 1,
  wasteFactor: 0.15,
};

/** Board lengths you can actually buy, in inches. */
export const STOCK_LENGTHS_IN = [72, 96, 120, 144, 192] as const;

/**
 * Board WIDTHS you can actually buy, in inches — the ACTUAL dressed widths, not the
 * nominal ones. A "1x6" is 5.5″ wide, and a tool that quietly used 6 would over-promise
 * by half an inch on every rip.
 */
export const STOCK_WIDTHS_IN = [3.5, 5.5, 7.25, 9.25, 11.25] as const;

/** Kerf options: a thin-kerf blade, a standard blade, a bandsaw is finer. */
export const KERF_OPTIONS_IN = [0.0625, 0.09375, 0.125, 0.1875] as const;

/**
 * Board feet for a single part.
 *
 * The lumber industry's unit: 1 bd ft = 144 cubic inches (12 × 12 × 1). Note it uses
 * NOMINAL thickness in the trade, but we use actual, because the cut list is actual and
 * quietly switching units mid-calculation is how you produce a number nobody can check.
 */
export function boardFeetForPart(part: Part): number {
  return (part.thicknessIn * part.widthIn * part.lengthIn * part.quantity) / 144;
}

/**
 * Packs part lengths into boards — First-Fit-Decreasing.
 *
 * Longest parts first. This is what makes FFD good: place the awkward pieces while there
 * is still room to place them, and let the short offcuts fill the gaps afterwards.
 * Placing shortest-first strands long parts on their own boards.
 *
 * Exported so the packing can be tested directly. A packing algorithm you can only
 * observe through a rendered page is one nobody will ever check.
 */
export function packLengths(
  parts: { id: string; label: string; lengthIn: number }[],
  options: Pick<OptimizerOptions, 'stockLengthIn' | 'kerfIn' | 'endTrimIn'>,
): { boards: PackedBoard[]; impossible: PackedBoard['parts'] } {
  const { stockLengthIn, kerfIn, endTrimIn } = options;

  /**
   * Usable length after squaring one end.
   *
   * Every part then costs `length + kerf`, because cutting it off consumes a blade's
   * width. Charging kerf per part rather than per gap is deliberately CONSERVATIVE — it
   * over-reserves by one kerf on the last piece of each board. Being 1/8″ pessimistic
   * costs nothing; being 1/8″ optimistic costs a ruined part.
   */
  const usable = stockLengthIn - endTrimIn;

  const impossible: PackedBoard['parts'] = [];
  const fitting: PackedBoard['parts'] = [];

  for (const part of parts) {
    if (part.lengthIn + kerfIn > usable) {
      impossible.push(part);
    } else {
      fitting.push(part);
    }
  }

  // DECREASING. See above — the whole point of FFD.
  const sorted = [...fitting].sort(
    (a, b) => b.lengthIn - a.lengthIn || a.id.localeCompare(b.id),
  );

  const boards: PackedBoard[] = [];

  for (const part of sorted) {
    const cost = part.lengthIn + kerfIn;

    // FIRST fit — the first board with room, not the best-fitting one. Best-Fit is
    // marginally tighter and much harder to eyeball; the user has to trust this layout.
    const board = boards.find((candidate) => candidate.offcutIn >= cost);

    if (board) {
      board.parts.push(part);
      board.usedIn += cost;
      board.offcutIn -= cost;
    } else {
      boards.push({
        parts: [part],
        usedIn: endTrimIn + cost,
        offcutIn: usable - cost,
      });
    }
  }

  return { boards, impossible };
}

/**
 * The full board plan for a cut list.
 *
 * Parts are grouped by (thickness × width) because that is how lumber is BOUGHT: a
 * 0.75 × 3.5 part and a 1.5 × 3.5 part do not come off the same board, however similar
 * they look in a table. Grouping by anything else would produce a buying list that
 * cannot be bought.
 */
export function optimize(parts: Part[], options: OptimizerOptions): BoardGroup[] {
  const groups = new Map<string, Part[]>();

  for (const part of parts) {
    // Thickness and width identify the stock. Material is carried along for display but
    // is NOT part of the key — two cedar boards and one maple board of the same
    // dimensions are still three different purchases, and the material label is often
    // absent or inconsistent in the content.
    const key = `${part.thicknessIn}x${part.widthIn}`;
    const existing = groups.get(key);
    if (existing) existing.push(part);
    else groups.set(key, [part]);
  }

  const result: BoardGroup[] = [];

  for (const group of groups.values()) {
    const first = group[0]!;

    /**
     * RIPS PER BOARD — how many parts fit ACROSS the board's width.
     *
     * With no stock width chosen, we assume you buy stock at exactly the part's width:
     * one part per board width. That is correct for dimensional lumber (a 3.5″ part is
     * a 1x4) and WRONG for anything you rip — which is why the option exists.
     *
     * With a stock width, each rip after the first costs a kerf, so N parts need
     * `N × partWidth + (N − 1) × kerf` of board. Solve for N.
     */
    const stockWidthIn = options.stockWidthIn ?? first.widthIn;

    const ripsPerBoard =
      options.stockWidthIn === null
        ? 1
        : Math.floor(
            (stockWidthIn + options.kerfIn) / (first.widthIn + options.kerfIn),
          );

    // A part WIDER than the stock cannot be cut from it at all. Report it; never quietly
    // produce a board plan that omits a part the build needs.
    if (ripsPerBoard < 1) {
      result.push({
        thicknessIn: first.thicknessIn,
        widthIn: first.widthIn,
        material: first.material,
        boards: [],
        impossible: group.map((part) => ({
          id: part.id,
          label: part.label,
          lengthIn: part.lengthIn,
          reason: `Wider than the ${stockWidthIn}″ stock — it cannot be ripped from it.`,
        })),
        boardFeet: 0,
        ripsPerBoard: 0,
        stockWidthIn,
        lanes: 0,
        physicalBoards: 0,
      });
      continue;
    }

    // Expand quantities: 6 identical strips are 6 pieces to place, not one.
    const pieces = group.flatMap((part) =>
      Array.from({ length: part.quantity }, (_, index) => ({
        id: `${part.id}-${index}`,
        label: part.label,
        lengthIn: part.lengthIn,
      })),
    );

    // `packLengths` packs into LANES — a lane is one rip's worth of board length.
    const { boards: lanes, impossible } = packLengths(pieces, options);

    // Several lanes come off ONE physical board when you can rip it.
    const physicalBoards = Math.ceil(lanes.length / ripsPerBoard);

    const rawBoardFeet = group.reduce((sum, part) => sum + boardFeetForPart(part), 0);

    result.push({
      thicknessIn: first.thicknessIn,
      widthIn: first.widthIn,
      material: first.material,
      boards: lanes,
      impossible: impossible.map((part) => ({
        ...part,
        reason: `Longer than a ${options.stockLengthIn}″ board once the end trim is taken off.`,
      })),
      // Waste allowance applied HERE, not to the board count. You buy extra board FEET
      // to cover defects; you do not buy 15% of an extra board.
      boardFeet: rawBoardFeet * (1 + options.wasteFactor),
      ripsPerBoard,
      stockWidthIn,
      lanes: lanes.length,
      physicalBoards,
    });
  }

  // Thickest, then widest, first — that is the order they are stacked at the yard, and
  // the order you carry them.
  return result.sort(
    (a, b) => b.thicknessIn - a.thicknessIn || b.widthIn - a.widthIn,
  );
}

/**
 * Total PHYSICAL boards to buy. The number you act on at the till.
 *
 * Sums `physicalBoards`, NOT `boards.length`. `boards` is a list of LANES — lengths of
 * board — and when you can rip four 2″ strips from one 1x10, four lanes are one board.
 * Summing lanes here would over-buy by exactly the rip factor, which for the maple
 * cutting board is 4×. The distinction is the entire point of the rip logic.
 */
export function totalBoards(groups: BoardGroup[]): number {
  return groups.reduce((sum, group) => sum + group.physicalBoards, 0);
}

/** True if ANY part cannot be cut. The UI must not show a buying list without saying so. */
export function hasImpossibleParts(groups: BoardGroup[]): boolean {
  return groups.some((group) => group.impossible.length > 0);
}

/** How efficiently the boards are used, 0–1. Honest about what is being thrown away. */
export function yieldRatio(group: BoardGroup, stockLengthIn: number): number {
  if (group.boards.length === 0) return 0;

  const used = group.boards.reduce((sum, board) => sum + board.usedIn, 0);
  return used / (group.boards.length * stockLengthIn);
}
