/**
 * Ordered build guide derived from a board design (Sprint 78 / D5; numbers reworked in Sprint 80).
 *
 * Pure library — no React, no I/O. D7 safety guidance stays gated: no PPE / technique coaching
 * sentences.
 *
 * Every dimension comes from `designCutPieces`, the same source the cut plan packs, so the guide
 * and the cut plan cannot disagree. The rule they share: cut where Sprint 73's maths budgets an
 * allowance (rip width, end-grain slices and strip length); finish to the design's dimension.
 */
import { formatInches } from '@/lib/format';
import { designCutPieces, type CutPiece } from '@/lib/board-designer/cut-pieces';
import { planeBufferIn } from '@/lib/board-designer/lumber-allowance';
import {
  MITER_COMPOSITE_METHOD,
  MITER_CORNER_LABELS,
  formatMiterAngle,
} from '@/lib/board-designer/miter-labels';
import { getSpecies } from '@/lib/board-designer/species';
import { ROW_TRANSFORM_LABELS } from '@/lib/board-designer/row-transform';
import type {
  BoardDesignConfig,
  BoardMetrics,
} from '@/lib/board-designer/types';

export interface BuildStepQuantity {
  label: string;
  count: number;
  lengthIn?: number;
  widthIn?: number;
  thicknessIn?: number;
  /**
   * Singular noun. When set the line reads "<label> · <dims> — for <count> <noun>s", for stock
   * that several pieces come out of (CARRY-1: a count of boards would be a guess).
   */
  countNoun?: string;
}

export interface BuildStep {
  id: string;
  title: string;
  detail: string;
  quantities: BuildStepQuantity[];
}

/**
 * The one way a quantity is written — the build route and the print sheet both call this
 * (CARRY-2). Dimensions are labelled because "14 1/4″ × 1 11/16″" does not say which is which.
 */
export function formatBuildQuantity(q: BuildStepQuantity): string {
  const dims: string[] = [];
  if (q.lengthIn !== undefined) dims.push(`${formatInches(q.lengthIn)} long`);
  if (q.widthIn !== undefined) dims.push(`${formatInches(q.widthIn)} wide`);
  if (q.thicknessIn !== undefined) dims.push(`${formatInches(q.thicknessIn)} thick`);
  const dimPart = dims.length > 0 ? ` · ${dims.join(' × ')}` : '';

  if (q.countNoun) {
    const noun = q.count === 1 ? q.countNoun : `${q.countNoun}s`;
    return `${q.label}${dimPart} — for ${q.count} ${noun}`;
  }
  return `${q.count}× ${q.label}${dimPart}`;
}

function step(
  id: string,
  title: string,
  detail: string,
  quantities: BuildStepQuantity[] = [],
): BuildStep {
  return { id, title, detail, quantities };
}

function speciesLabel(speciesId: string): string {
  return getSpecies(speciesId)?.name ?? speciesId;
}

/** Group pieces into quantities, first-seen order, summing counts. */
function groupQuantities(
  pieces: CutPiece[],
  keyOf: (piece: CutPiece) => string,
  make: (piece: CutPiece) => BuildStepQuantity,
): BuildStepQuantity[] {
  const groups = new Map<string, BuildStepQuantity>();
  for (const piece of pieces) {
    const key = keyOf(piece);
    const existing = groups.get(key);
    if (existing) existing.count += piece.count;
    else groups.set(key, { ...make(piece), count: piece.count });
  }
  return [...groups.values()];
}

/** Used panels, in panel order, as their first cut piece (carries id, label, length, thickness). */
function usedPanels(pieces: CutPiece[]): CutPiece[] {
  const seen = new Map<string, CutPiece>();
  for (const piece of pieces) {
    if (!seen.has(piece.panelId)) seen.set(piece.panelId, piece);
  }
  return [...seen.values()];
}

/** Steps whose wording and numbers are shared by both grains. */
function cuttingSteps(config: BoardDesignConfig, pieces: CutPiece[]): BuildStep[] {
  const panels = usedPanels(pieces);
  const multi = panels.length > 1;
  const panelPrefix = (piece: CutPiece) => (multi ? `${piece.panelLabel}: ` : '');
  const buffer = planeBufferIn(config);

  const thicknesses = [...new Set(pieces.map((p) => p.thicknessIn))].sort((a, b) => a - b);
  const millDetail =
    thicknesses.length <= 1
      ? `Mill each species to ${formatInches(thicknesses[0] ?? 0)} thick.`
      : `Mill each species to its panel thickness: ${thicknesses
          .map((t) => formatInches(t))
          .join(', ')}.`;

  const ripDetail =
    buffer > 0
      ? `Rip each strip ${formatInches(buffer)} over its finished width, then joint the glue edges down to finished width.`
      : 'Rip strips to finished width.';

  const crosscutDetail = multi
    ? `Crosscut each panel's strips to its own length: ${panels
        .map((p) => `${p.panelLabel} ${formatInches(p.lengthIn)}`)
        .join('; ')}.`
    : `Crosscut strips to ${formatInches(panels[0]?.lengthIn ?? 0)}.`;

  const steps: BuildStep[] = [
    step(
      'mill-stock',
      'Mill stock',
      millDetail,
      groupQuantities(
        pieces,
        (p) => `${p.speciesId}\0${p.thicknessIn}`,
        (p) => ({
          label: `${speciesLabel(p.speciesId)} stock`,
          count: 0,
          thicknessIn: p.thicknessIn,
          countNoun: 'strip',
        }),
      ),
    ),
    step(
      'rip-strips',
      'Rip strips',
      ripDetail,
      groupQuantities(
        pieces,
        (p) => `${p.speciesId}\0${p.ripWidthIn}`,
        (p) => ({
          label: `${speciesLabel(p.speciesId)} strips`,
          count: 0,
          widthIn: p.ripWidthIn,
        }),
      ),
    ),
    step(
      'crosscut-strips',
      'Crosscut strips',
      crosscutDetail,
      groupQuantities(
        pieces,
        (p) => `${p.panelId}\0${p.speciesId}\0${p.ripWidthIn}`,
        (p) => ({
          label: `${panelPrefix(p)}${speciesLabel(p.speciesId)} strips`,
          count: 0,
          lengthIn: p.lengthIn,
          widthIn: p.ripWidthIn,
        }),
      ),
    ),
  ];

  const mitered = pieces.filter((p) => p.role === 'strip' && p.miter);
  if (mitered.length > 0) {
    steps.push(
      step(
        'make-composite-strips',
        'Make composite strips',
        `${MITER_COMPOSITE_METHOD} Pair each mitered strip with a partner strip of its wedge species, cut to the same size.`,
        mitered.map((p) => ({
          label: `${panelPrefix(p)}${p.stripName}: ${speciesLabel(p.speciesId)} with ${speciesLabel(p.miter!.speciesId)} wedge, ${MITER_CORNER_LABELS[p.miter!.corner]} corner at ${formatMiterAngle(p.miter!.angleDeg)}`,
          count: p.count,
        })),
      ),
    );
  }

  steps.push(step('dry-fit', 'Dry fit', dryFitDetail(pieces, panels)));
  return steps;
}

function dryFitDetail(pieces: CutPiece[], panels: CutPiece[]): string {
  const entriesFor = (panelId: string): string =>
    pieces
      .filter((p) => p.panelId === panelId && p.role === 'strip')
      .map((p) => {
        const repeat = p.count > 1 ? ` ×${p.count}` : '';
        const wedge = p.miter ? `, ${speciesLabel(p.miter.speciesId)} wedge` : '';
        return `${p.stripName}${repeat} (${speciesLabel(p.speciesId)} ${formatInches(p.finishedWidthIn)}${wedge})`;
      })
      .join(', ');

  if (panels.length > 1) {
    return `Lay each panel's strips out in order — ${panels
      .map((p) => `${p.panelLabel}: ${entriesFor(p.panelId)}`)
      .join('; ')}.`;
  }
  const only = panels[0];
  return `Lay strips out in order: ${only ? entriesFor(only.panelId) : 'as designed'}.`;
}

function edgeSteps(
  config: BoardDesignConfig,
  metrics: BoardMetrics,
  pieces: CutPiece[],
): BuildStep[] {
  return [
    ...cuttingSteps(config, pieces),
    step(
      'glue-up-panel',
      'Glue up the panel',
      'Glue and clamp the strips into one panel — one glue-up.',
    ),
    step(
      'flatten',
      'Flatten',
      `Flatten the board to ${formatInches(metrics.finishedThicknessIn)} thick.`,
    ),
    step('trim-ends', 'Trim ends', 'Square both ends.'),
    step('sand-finish', 'Sand and finish', 'Sand and finish the board.'),
  ];
}

function endSteps(
  config: BoardDesignConfig,
  metrics: BoardMetrics,
  pieces: CutPiece[],
): BuildStep[] {
  const panels = usedPanels(pieces);
  const multi = panels.length > 1;
  const buffer = planeBufferIn(config);
  const rowsById = new Map(metrics.panelPlan.map((plan) => [plan.panelId, plan.rows]));
  const labelById = new Map(config.panels.map((panel) => [panel.id, panel.label]));

  const distinctThickness = new Set(panels.map((p) => p.thicknessIn));
  const flattenPanelDetail =
    distinctThickness.size <= 1
      ? `Flatten the panel to ${formatInches(panels[0]?.thicknessIn ?? 0)} thick.`
      : `Flatten each panel to its thickness: ${panels
          .map((p) => `${p.panelLabel} ${formatInches(p.thicknessIn)}`)
          .join('; ')}.`;

  const sliceCut = formatInches(config.sliceThicknessIn + buffer);
  const slicesDetail = multi
    ? `Crosscut each panel into slices at ${sliceCut} thick: ${panels
        .map((p) => `${p.panelLabel} ${rowsById.get(p.panelId) ?? 0}`)
        .join('; ')}.`
    : `Crosscut the panel into ${rowsById.get(panels[0]?.panelId ?? '') ?? metrics.sliceCount} slices at ${sliceCut} thick.`;

  const rows = config.rowPattern
    .map((s, i) => {
      const placement = ROW_TRANSFORM_LABELS[s.transform];
      if (!multi) return `row ${i + 1} ${placement}`;
      return `row ${i + 1} ${labelById.get(s.panelId) ?? 'deleted panel'} — ${placement}`;
    })
    .join('; ');

  const finishedThickness = formatInches(config.sliceThicknessIn);
  const flattenBoardDetail =
    buffer > 0
      ? `Flatten the board to ${finishedThickness} thick, removing about ${formatInches(buffer)}.`
      : `Flatten the board to ${finishedThickness} thick.`;

  return [
    ...cuttingSteps(config, pieces),
    step(
      'glue-up-panel',
      'Glue up the panel',
      'Glue and clamp the strips into the panel — first glue-up.',
    ),
    step('flatten-panel', 'Flatten the panel', flattenPanelDetail),
    step('crosscut-slices', 'Crosscut into slices', slicesDetail),
    step(
      'arrange-rows',
      'Arrange rows',
      `Turn slices end-up and lay them out by repeating this ${config.rowPattern.length}-step row pattern: ${rows}.`,
    ),
    step(
      'glue-up-board',
      'Glue up the board',
      'Glue and clamp the arranged slices into the board — second glue-up.',
    ),
    step('flatten-board', 'Flatten the board', flattenBoardDetail),
    step('trim-ends', 'Trim ends', 'Square both ends.'),
    step('sand-finish', 'Sand and finish', 'Sand and finish the board.'),
  ];
}

/**
 * Derive an ordered build guide for a board design.
 * Edge grain → one glue-up. End grain → panel glue-up, slice, second glue-up.
 */
export function designBuildSteps(
  config: BoardDesignConfig,
  metrics: BoardMetrics,
): BuildStep[] {
  const pieces = designCutPieces(config, metrics.panelPlan);
  return config.grain === 'edge'
    ? edgeSteps(config, metrics, pieces)
    : endSteps(config, metrics, pieces);
}
