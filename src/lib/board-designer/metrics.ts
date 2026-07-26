import { layoutTopFace } from './layout';
import {
  closingThicknessHint,
  miterLatticeCloses,
  miterWedgeFraction,
  thicknessMismatchesClose,
} from './miter-geometry';
import { getSpecies } from './species';
import type {
  BoardDesignConfig,
  BoardMetrics,
  Panel,
  PanelPlan,
  SpeciesBoardFeet,
} from './types';

/**
 * Panel + finished-board metrics for a cutting-board design.
 *
 * Pure and total: never throws, never returns NaN, always a full BoardMetrics.
 * Invalid *shapes* are rejected upstream by zod (serialize.ts), not here.
 */
export function calculateMetrics(config: BoardDesignConfig): BoardMetrics {
  const warnings: string[] = [];
  let complete = true;

  const panels = config.panels;
  const panel0 = panels[0];

  const widthOf = (panel: Panel) =>
    panel.strips.reduce((sum, s) => sum + s.widthIn * s.repeat, 0);

  const panelWidthIn = panel0 ? widthOf(panel0) : 0;

  let finishedLengthIn: number;
  let finishedWidthIn: number;
  let finishedThicknessIn: number;
  let sliceCount: number;
  let panelPlan: PanelPlan[];

  if (config.grain === 'edge') {
    finishedLengthIn = config.sourceLengthIn;
    finishedWidthIn = panelWidthIn;
    finishedThicknessIn = panel0?.thicknessIn ?? 0;
    sliceCount = 0;
    panelPlan = panel0
      ? [
          {
            panelId: panel0.id,
            label: panel0.label,
            rows: 1,
            requiredLengthIn: config.sourceLengthIn,
            widthIn: panelWidthIn,
            thicknessIn: panel0.thicknessIn,
          },
        ]
      : [];

    if (panels.length > 1) {
      warnings.push('Extra panels are unused in edge grain.');
    }
  } else {
    const rowPanels: (Panel | undefined)[] = [];
    for (let i = 0; i < config.rowCount; i += 1) {
      const step = config.rowPattern[i % config.rowPattern.length];
      const panel = step
        ? panels.find((p) => p.id === step.panelId)
        : undefined;
      rowPanels.push(panel);
      if (step && !panel) {
        if (!warnings.includes('Row pattern uses a panel that was deleted.')) {
          warnings.push('Row pattern uses a panel that was deleted.');
        }
        complete = false;
      }
    }

    // Equal-width check across panels that appear in the row pattern (and all panels).
    const widths = panels.map((p) => widthOf(p));
    if (widths.length > 1 && widths.some((w) => w !== widths[0])) {
      warnings.push('Panels must be the same width — slices will not line up.');
      complete = false;
    }

    finishedLengthIn = panelWidthIn;
    finishedWidthIn = rowPanels.reduce(
      (sum, p) => sum + (p?.thicknessIn ?? 0),
      0,
    );
    finishedThicknessIn = config.sliceThicknessIn;
    sliceCount = config.rowCount;

    const rowsByPanel = new Map<string, number>();
    for (const p of panels) rowsByPanel.set(p.id, 0);
    for (const p of rowPanels) {
      if (!p) continue;
      rowsByPanel.set(p.id, (rowsByPanel.get(p.id) ?? 0) + 1);
    }

    panelPlan = panels.map((p) => {
      const rows = rowsByPanel.get(p.id) ?? 0;
      const requiredLengthIn =
        rows * config.sliceThicknessIn +
        Math.max(0, rows - 1) * config.kerfIn;
      return {
        panelId: p.id,
        label: p.label,
        rows,
        requiredLengthIn,
        widthIn: widthOf(p),
        thicknessIn: p.thicknessIn,
      };
    });
  }

  const anyStrips = panels.some((p) => p.strips.length > 0);
  if (!anyStrips || !panel0 || panel0.strips.length === 0) {
    warnings.push('Add a strip to see your board.');
    complete = false;
  }

  const seenUnknown = new Set<string>();
  for (const panel of panels) {
    for (const s of panel.strips) {
      if (!getSpecies(s.speciesId) && !seenUnknown.has(s.speciesId)) {
        seenUnknown.add(s.speciesId);
        warnings.push(`Unknown wood: ${s.speciesId}`);
      }
      if (
        s.miter &&
        !getSpecies(s.miter.speciesId) &&
        !seenUnknown.has(s.miter.speciesId)
      ) {
        seenUnknown.add(s.miter.speciesId);
        warnings.push(`Unknown wood: ${s.miter.speciesId}`);
      }
    }
  }

  if (finishedWidthIn > 24) {
    warnings.push('Wider than most planers — plan to hand-flatten.');
  }

  const boardFeetBySpecies = boardFeetBySpeciesFor(config, panelPlan);
  const totalBoardFeet = boardFeetBySpecies.reduce(
    (sum, row) => sum + row.boardFeet,
    0,
  );

  const metricsSoFar: BoardMetrics = {
    panelWidthIn,
    finishedLengthIn,
    finishedWidthIn,
    finishedThicknessIn,
    sliceCount,
    panelPlan,
    boardFeetBySpecies,
    totalBoardFeet,
    warnings,
    complete,
  };

  // Miter lattice closure (colour + closing-thickness). Same helpers as the
  // harlequin acceptance tests — do not silently draw a non-closing pattern.
  //
  // Perf (Sprint 59, Cursor VM): 2400 cells ≈ 33 ms; schema-max 40×20×60 =
  // 48000 cells ≈ 110–125 ms for full colour sampling. Gate colour continuity
  // above 4k cells (thickness check always runs) so the editor keystroke path
  // stays under ~50 ms at the bound.
  const hasMiter = panels.some((p) => p.strips.some((s) => s.miter));
  if (hasMiter) {
    const cells = layoutTopFace(config, metricsSoFar);
    const COLOUR_CHECK_CELL_CAP = 4000;
    let closed: boolean;
    if (cells.length > COLOUR_CHECK_CELL_CAP) {
      closed = !panels.some((panel) =>
        panel.strips.some(
          (s) =>
            s.miter &&
            thicknessMismatchesClose(
              s.widthIn,
              panel.thicknessIn,
              s.miter.angleDeg,
            ),
        ),
      );
    } else {
      closed = miterLatticeCloses(cells, panels);
    }
    if (!closed) {
      for (const panel of panels) {
        for (const s of panel.strips) {
          if (!s.miter) continue;
          if (
            thicknessMismatchesClose(
              s.widthIn,
              panel.thicknessIn,
              s.miter.angleDeg,
            )
          ) {
            const msg = closingThicknessHint(
              s.widthIn,
              panel.thicknessIn,
              s.miter.angleDeg,
            );
            if (!warnings.includes(msg)) warnings.push(msg);
          }
        }
      }
      if (!warnings.some((w) => w.includes('lattice will not close'))) {
        warnings.push('Miter pattern does not close — check corners and row transforms.');
      }
    }
  }

  return {
    ...metricsSoFar,
    warnings,
    complete,
  };
}

function boardFeetBySpeciesFor(
  config: BoardDesignConfig,
  panelPlan: PanelPlan[],
): SpeciesBoardFeet[] {
  const planById = new Map(panelPlan.map((p) => [p.panelId, p]));
  const order: string[] = [];
  const totals = new Map<string, number>();

  const panels =
    config.grain === 'edge' ? config.panels.slice(0, 1) : config.panels;

  for (const panel of panels) {
    const plan = planById.get(panel.id);
    const lengthIn = plan?.requiredLengthIn ?? 0;
    for (const s of panel.strips) {
      const stripBf =
        (panel.thicknessIn * s.widthIn * lengthIn * s.repeat) / 144;
      const wedgeFrac = s.miter
        ? miterWedgeFraction(s.widthIn, panel.thicknessIn, s.miter)
        : 0;
      const baseFrac = 1 - wedgeFrac;

      addBf(order, totals, s.speciesId, stripBf * baseFrac);
      if (s.miter && wedgeFrac > 0) {
        addBf(order, totals, s.miter.speciesId, stripBf * wedgeFrac);
      }
    }
  }

  return order.map((speciesId) => {
    const species = getSpecies(speciesId);
    const raw = totals.get(speciesId) ?? 0;
    return {
      speciesId,
      name: species?.name ?? speciesId,
      boardFeet: raw * (1 + config.wasteFactor),
    };
  });
}

function addBf(
  order: string[],
  totals: Map<string, number>,
  speciesId: string,
  amount: number,
): void {
  if (!totals.has(speciesId)) {
    order.push(speciesId);
    totals.set(speciesId, 0);
  }
  totals.set(speciesId, (totals.get(speciesId) ?? 0) + amount);
}
