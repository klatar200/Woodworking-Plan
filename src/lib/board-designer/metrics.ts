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

  return {
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
      if (!totals.has(s.speciesId)) {
        order.push(s.speciesId);
        totals.set(s.speciesId, 0);
      }
      const bf =
        (panel.thicknessIn * s.widthIn * lengthIn * s.repeat) / 144;
      totals.set(s.speciesId, (totals.get(s.speciesId) ?? 0) + bf);
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
