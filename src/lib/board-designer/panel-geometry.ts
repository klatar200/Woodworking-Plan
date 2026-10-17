import type {
  BoardDesignConfig,
  Panel,
  PanelPlan,
} from './types';

/**
 * Widest board a common benchtop planer takes (13″ models — the 12½–13″ class). The build guide's
 * "Flatten the panel" step is where a wider glued panel stops fitting (Sprint 82).
 */
export const BENCHTOP_PLANER_WIDTH_IN = 13;

export const PLANER_WIDTH_WARNING = 'Wider than a 13" benchtop planer — plan to hand-flatten.';

export interface PanelGeometry {
  panelWidthIn: number;
  finishedLengthIn: number;
  finishedWidthIn: number;
  finishedThicknessIn: number;
  sliceCount: number;
  panelPlan: PanelPlan[];
  /** Geometry warnings collected while building the plan (no miter closure). */
  warnings: string[];
  complete: boolean;
}

/**
 * Panel plan + finished dimensions — the cheap half of `calculateMetrics`.
 *
 * Shopping-list synthesis (Sprint 64) needs board feet without paying for
 * `layoutTopFace` + closure sampling on every mitered design (~125 ms).
 */
export function panelGeometry(config: BoardDesignConfig): PanelGeometry {
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
    // A panel no row uses adds no wood — say so rather than let it sit in the editor looking live.
    for (const p of panels) {
      if (rowsByPanel.get(p.id) === 0) {
        warnings.push(`"${p.label}" is not in the row pattern — it adds nothing to the board.`);
      }
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

  // What goes through a planer is each glued PANEL, whose width is the strip stack — not the
  // finished board's width (in end grain that is the stack of rows). Used panels only.
  const usedPanelWidths = panelPlan
    .filter((plan) => config.grain === 'edge' || plan.rows > 0)
    .map((plan) => plan.widthIn);
  if (usedPanelWidths.some((width) => width > BENCHTOP_PLANER_WIDTH_IN)) {
    warnings.push(PLANER_WIDTH_WARNING);
  }

  return {
    panelWidthIn,
    finishedLengthIn,
    finishedWidthIn,
    finishedThicknessIn,
    sliceCount,
    panelPlan,
    warnings,
    complete,
  };
}
