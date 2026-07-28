/**
 * Ordered build guide derived from a board design (Sprint 78 / D5).
 *
 * Pure library — no React, no I/O. Sprint 79 surfaces this; do not add UI here.
 * D7 safety guidance stays gated: no PPE / technique coaching sentences.
 */
import { formatInches } from '@/lib/format';
import {
  expandStripPieces,
  planeBufferIn,
} from '@/lib/board-designer/lumber-allowance';
import { getSpecies } from '@/lib/board-designer/species';
import { stripDisplayName } from '@/lib/board-designer/strip-display';
import type {
  BoardDesignConfig,
  BoardMetrics,
  Panel,
  PanelPlan,
  RowTransform,
} from '@/lib/board-designer/types';

export interface BuildStepQuantity {
  label: string;
  count: number;
  lengthIn?: number;
  widthIn?: number;
  thicknessIn?: number;
}

export interface BuildStep {
  id: string;
  title: string;
  detail: string;
  quantities: BuildStepQuantity[];
}

const TRANSFORM_NAME: Record<RowTransform, string> = {
  none: 'as designed',
  rot180: 'turned 180°',
  mirrorX: 'mirrored left-to-right',
  mirrorY: 'mirrored top-to-bottom',
};

function step(
  id: string,
  title: string,
  detail: string,
  quantities: BuildStepQuantity[] = [],
): BuildStep {
  return { id, title, detail, quantities };
}

/** Panels the board actually uses — from geometry, not raw `config.panels`. */
function usedPanelEntries(
  config: BoardDesignConfig,
  metrics: BoardMetrics,
): { plan: PanelPlan; panel: Panel }[] {
  const byId = new Map(config.panels.map((p) => [p.id, p]));
  const out: { plan: PanelPlan; panel: Panel }[] = [];
  for (const plan of metrics.panelPlan) {
    // End grain lists unused panels with rows:0; they must contribute no stock.
    if (config.grain === 'end' && plan.rows === 0) continue;
    const panel = byId.get(plan.panelId);
    if (!panel) continue;
    out.push({ plan, panel });
  }
  return out;
}

function speciesLabel(speciesId: string): string {
  return getSpecies(speciesId)?.name ?? speciesId;
}

function ripQuantities(panels: Panel[]): BuildStepQuantity[] {
  // Group by species + width so the guide can list rip sizes.
  const groups = new Map<string, { speciesId: string; widthIn: number; count: number }>();
  for (const panel of panels) {
    for (const piece of expandStripPieces(panel)) {
      const key = `${piece.speciesId}\0${piece.widthIn}`;
      const cur = groups.get(key);
      if (cur) cur.count += 1;
      else {
        groups.set(key, {
          speciesId: piece.speciesId,
          widthIn: piece.widthIn,
          count: 1,
        });
      }
    }
  }
  return [...groups.values()].map((g) => ({
    label: `${speciesLabel(g.speciesId)} strips`,
    count: g.count,
    widthIn: g.widthIn,
  }));
}

function millQuantities(panels: Panel[]): BuildStepQuantity[] {
  // One entry per species + thickness. count = distinct rip widths at that pair
  // (boards to mill to), not strip piece count.
  const groups = new Map<
    string,
    { speciesId: string; thicknessIn: number; widths: Set<number> }
  >();
  for (const panel of panels) {
    for (const piece of expandStripPieces(panel)) {
      const key = `${piece.speciesId}\0${panel.thicknessIn}`;
      let g = groups.get(key);
      if (!g) {
        g = {
          speciesId: piece.speciesId,
          thicknessIn: panel.thicknessIn,
          widths: new Set(),
        };
        groups.set(key, g);
      }
      g.widths.add(piece.widthIn);
    }
  }
  return [...groups.values()].map((g) => ({
    label: `${speciesLabel(g.speciesId)} stock`,
    count: g.widths.size,
    thicknessIn: g.thicknessIn,
  }));
}

function stripOrderLabels(panels: Panel[]): string {
  const names: string[] = [];
  for (const panel of panels) {
    panel.strips.forEach((strip, index) => {
      const n = strip.repeat > 1 ? ` ×${strip.repeat}` : '';
      names.push(`${stripDisplayName(strip, index)}${n}`);
    });
  }
  return names.join(', ');
}

function distinctTransforms(config: BoardDesignConfig): RowTransform[] {
  const seen = new Set<RowTransform>();
  const out: RowTransform[] = [];
  for (const s of config.rowPattern) {
    if (seen.has(s.transform)) continue;
    seen.add(s.transform);
    out.push(s.transform);
  }
  return out;
}

function arrangeRowsDetail(config: BoardDesignConfig): string {
  const n = config.rowPattern.length;
  const transforms = distinctTransforms(config);
  const named = transforms.map((t) => TRANSFORM_NAME[t]).join(', ');
  return `Turn slices end-up and arrange them by repeating a ${n}-step row pattern. Transforms used: ${named}.`;
}

function edgeSteps(
  config: BoardDesignConfig,
  metrics: BoardMetrics,
): BuildStep[] {
  const used = usedPanelEntries(config, metrics);
  const panels = used.map((u) => u.panel);
  const thickness = panels[0]?.thicknessIn ?? 0;
  const buffer = formatInches(planeBufferIn(config));
  const length = formatInches(config.sourceLengthIn);
  const finished = formatInches(metrics.finishedLengthIn);

  return [
    step(
      'mill-stock',
      'Mill stock',
      `Mill each species to ${formatInches(thickness)} thick.`,
      millQuantities(panels),
    ),
    step(
      'rip-strips',
      'Rip strips',
      'Rip strips to width for each species.',
      ripQuantities(panels),
    ),
    step(
      'crosscut-strips',
      'Crosscut strips',
      `Crosscut strips to ${length} (panel length).`,
      ripQuantities(panels).map((q) => ({
        ...q,
        lengthIn: config.sourceLengthIn,
      })),
    ),
    step(
      'dry-fit',
      'Dry fit',
      `Lay strips out in order: ${stripOrderLabels(panels) || 'as designed'}.`,
    ),
    step(
      'glue-up-panel',
      'Glue up the panel',
      'Glue and clamp the strips into one panel — one glue-up.',
    ),
    step(
      'flatten',
      'Flatten',
      `Plane flat, removing about ${buffer} of plane buffer.`,
    ),
    step(
      'trim-ends',
      'Trim ends',
      `Trim to the finished length of ${finished}.`,
    ),
    step('sand-finish', 'Sand and finish', 'Sand and finish the board.'),
  ];
}

function endSteps(
  config: BoardDesignConfig,
  metrics: BoardMetrics,
): BuildStep[] {
  const used = usedPanelEntries(config, metrics);
  const panels = used.map((u) => u.panel);
  const buffer = formatInches(planeBufferIn(config));
  const length = formatInches(config.sourceLengthIn);
  const sliceT = formatInches(config.sliceThicknessIn);
  const finished = formatInches(metrics.finishedLengthIn);
  const sliceCount = metrics.sliceCount;

  // Distinct thicknesses from used panels — must match millQuantities (F5).
  const thicknesses = [
    ...new Set(panels.map((p) => p.thicknessIn)),
  ].sort((a, b) => a - b);
  const millDetail =
    thicknesses.length <= 1
      ? `Mill each species to ${formatInches(thicknesses[0] ?? 0)} thick.`
      : `Mill each species to its panel thickness: ${thicknesses
          .map((t) => formatInches(t))
          .join(', ')}.`;

  return [
    step(
      'mill-stock',
      'Mill stock',
      millDetail,
      millQuantities(panels),
    ),
    step(
      'rip-strips',
      'Rip strips',
      'Rip strips to width for each species.',
      ripQuantities(panels),
    ),
    step(
      'crosscut-strips',
      'Crosscut strips',
      `Crosscut strips to ${length} (panel length).`,
      ripQuantities(panels).map((q) => ({
        ...q,
        lengthIn: config.sourceLengthIn,
      })),
    ),
    step(
      'dry-fit',
      'Dry fit',
      `Lay strips out in order: ${stripOrderLabels(panels) || 'as designed'}.`,
    ),
    step(
      'glue-up-panel',
      'Glue up the panel',
      'Glue and clamp the strips into the panel — first glue-up.',
    ),
    step(
      'flatten-panel',
      'Flatten the panel',
      `Plane the panel flat, removing about ${buffer} of plane buffer.`,
    ),
    step(
      'crosscut-slices',
      'Crosscut into slices',
      `Crosscut the panel into ${sliceCount} slices at ${sliceT} thick.`,
    ),
    step('arrange-rows', 'Arrange rows', arrangeRowsDetail(config)),
    step(
      'glue-up-board',
      'Glue up the board',
      'Glue and clamp the arranged slices into the board — second glue-up.',
    ),
    step(
      'flatten-board',
      'Flatten the board',
      `Plane the board flat, removing about ${buffer} of plane buffer.`,
    ),
    step(
      'trim-ends',
      'Trim ends',
      `Trim to the finished length of ${finished}.`,
    ),
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
  return config.grain === 'edge'
    ? edgeSteps(config, metrics)
    : endSteps(config, metrics);
}
