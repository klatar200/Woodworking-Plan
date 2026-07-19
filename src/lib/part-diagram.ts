/**
 * Part diagram layout — QOL-G pilot (2026-07-19).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHAT THIS IS: a to-scale drawing of a plan's PARTS, generated entirely from the
 * `cutList` rows every published plan already has. Each part becomes a rectangle whose
 * proportions are its real width × length. Nothing is drawn by hand, there is no asset
 * per plan, and adding a plan adds a diagram for free.
 *
 * WHAT THIS IS NOT, and the distinction matters:
 *
 *   • NOT the cut-list optimizer. `src/lib/cut-optimizer.ts` answers "what do I BUY" —
 *     it packs parts onto purchasable stock, respects kerf and ripping, and its output
 *     is a number someone acts on at a lumberyard. This module answers "what do these
 *     parts LOOK like next to each other", and its output is a picture. Merging them
 *     would put a display concern inside the one module in this codebase whose
 *     correctness has a cost measured in wasted lumber. They stay separate on purpose.
 *
 *   • NOT an assembly or exploded view. That needs geometry the schema does not have —
 *     how parts JOIN is nowhere in the data — and inventing it would draw a confident
 *     picture of a thing that is not the project. `QOL_UI_BUILD_PLAN.md` rules true 3D
 *     out of this pilot for exactly that reason.
 *
 * GRAIN RUNS ALONG LENGTH, so length is the horizontal axis. Same rule as the optimizer
 * (rule 5: "grain does not rotate") — a diagram that lays a 30″ part across a 6″ board
 * "because it fits" is drawing firewood.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** One cut-list row, in the shape the plan pages already hold. */
export interface DiagramPart {
  id: string;
  label: string;
  quantity: number;
  thicknessIn: number;
  widthIn: number;
  lengthIn: number;
  material: string | null;
}

/** One drawn rectangle, in SVG user units (pixels), origin top-left. */
export interface PlacedPart {
  /** The cut-list row this came from — several placements can share it. */
  partId: string;
  /** Unique per placement, for React keys. */
  key: string;
  label: string;
  material: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  /** True dimensions, for labels and the accessible description. */
  thicknessIn: number;
  widthIn: number;
  lengthIn: number;
  /** 1-based copy number, and how many copies the plan calls for in total. */
  copy: number;
  quantity: number;
  /** True when copies beyond this one were suppressed — the rectangle stands for them. */
  standsForMore: boolean;
}

export interface Diagram {
  width: number;
  height: number;
  parts: PlacedPart[];
  /** Pixels per inch actually used. Exposed so a caller can draw a scale bar. */
  scale: number;
  /** Rows dropped because their dimensions were unusable — reported, never silent. */
  skipped: Array<{ id: string; label: string; reason: string }>;
}

export interface LayoutOptions {
  /** Canvas width in pixels. The scale is derived from this, never the other way round. */
  canvasWidth: number;
  /** Gap between parts, in pixels. */
  gap: number;
  /**
   * How many copies of a part to draw before collapsing the rest into a "×12" label.
   *
   * A bookcase with twelve identical shelves would otherwise spend the whole canvas
   * drawing the same rectangle twelve times, which communicates nothing the label does
   * not. Drawing a FEW is still worth it — seeing three shelves next to one side panel
   * is the comparison the diagram exists for.
   */
  maxCopies: number;
}

export const DEFAULT_LAYOUT: LayoutOptions = {
  canvasWidth: 720,
  gap: 10,
  maxCopies: 3,
};

/**
 * Lay parts out as to-scale rectangles, packed into rows.
 *
 * ROW PACKING, LONGEST FIRST — the same shelf-packing shape the optimizer uses, and for
 * a different reason: here it is purely so the picture reads left-to-right in descending
 * size, which is the order that makes relative scale obvious. There is no kerf, no
 * offcut and no stock length in this module; a reader must never be able to mistake this
 * drawing for a buying plan.
 *
 * ONE SCALE FOR THE WHOLE DIAGRAM. Every rectangle is drawn at the same pixels-per-inch,
 * derived from the longest part. Scaling parts independently to "fit them nicely" would
 * destroy the only thing this drawing actually tells you.
 */
export function layoutParts(
  parts: DiagramPart[],
  options: LayoutOptions = DEFAULT_LAYOUT,
): Diagram {
  const { canvasWidth, gap, maxCopies } = options;

  const skipped: Diagram['skipped'] = [];
  const usable: DiagramPart[] = [];

  for (const part of parts) {
    // Zero, negative or non-finite dimensions produce NaN geometry, which SVG renders as
    // nothing at all — a part that silently vanishes from a diagram is worse than one
    // that is reported missing. 12 of the 85 catalog plans ship an empty cutList, and
    // authored content is hand-written, so this is a real case, not a defensive habit.
    const bad =
      !Number.isFinite(part.widthIn) ||
      !Number.isFinite(part.lengthIn) ||
      part.widthIn <= 0 ||
      part.lengthIn <= 0;

    if (bad) {
      skipped.push({
        id: part.id,
        label: part.label,
        reason: 'missing or non-positive width/length',
      });
      continue;
    }
    usable.push(part);
  }

  if (usable.length === 0) {
    return { width: canvasWidth, height: 0, parts: [], scale: 0, skipped };
  }

  /**
   * THE SCALE. The longest part must fit the canvas with a gap either side; everything
   * else follows from that. Capped so a plan made of tiny parts is not blown up to
   * absurdity — a 3/4″ runner drawn 700px wide reads as a beam.
   */
  const longest = Math.max(...usable.map((p) => p.lengthIn));
  const scale = Math.min((canvasWidth - gap * 2) / longest, 24);

  const placed: PlacedPart[] = [];
  let x = gap;
  let y = gap;
  let rowHeight = 0;

  const byLengthDesc = [...usable].sort(
    (a, b) => b.lengthIn - a.lengthIn || a.label.localeCompare(b.label),
  );

  for (const part of byLengthDesc) {
    const copies = Math.max(1, Math.min(part.quantity, maxCopies));
    const w = part.lengthIn * scale;
    // A minimum drawn height, or a 3/8″-thick runner becomes a hairline nobody can see
    // or click. It distorts the vertical scale for very thin parts, which is the honest
    // trade: an invisible part communicates nothing at all.
    const h = Math.max(part.widthIn * scale, 6);

    for (let copy = 1; copy <= copies; copy += 1) {
      if (x > gap && x + w > canvasWidth - gap) {
        x = gap;
        y += rowHeight + gap;
        rowHeight = 0;
      }

      placed.push({
        partId: part.id,
        key: `${part.id}-${copy}`,
        label: part.label,
        material: part.material,
        x,
        y,
        w,
        h,
        thicknessIn: part.thicknessIn,
        widthIn: part.widthIn,
        lengthIn: part.lengthIn,
        copy,
        quantity: part.quantity,
        standsForMore: copy === copies && part.quantity > copies,
      });

      x += w + gap;
      rowHeight = Math.max(rowHeight, h);
    }
  }

  return {
    width: canvasWidth,
    height: y + rowHeight + gap,
    parts: placed,
    scale,
    skipped,
  };
}

/**
 * A text description of the diagram, for screen readers and for the `<desc>` element.
 *
 * An SVG with no text alternative is a picture that some readers simply do not receive.
 * The cut-list TABLE remains the authoritative, fully accessible presentation of this
 * data — this diagram is an addition to it, never a replacement, which is also why the
 * pilot page shows them side by side.
 */
export function describeDiagram(diagram: Diagram): string {
  if (diagram.parts.length === 0) return 'No parts to draw.';

  const seen = new Set<string>();
  const phrases: string[] = [];

  for (const part of diagram.parts) {
    if (seen.has(part.partId)) continue;
    seen.add(part.partId);
    phrases.push(
      `${part.quantity} × ${part.label}, ${part.widthIn} by ${part.lengthIn} inches`,
    );
  }

  return `Parts drawn to scale: ${phrases.join('; ')}.`;
}
