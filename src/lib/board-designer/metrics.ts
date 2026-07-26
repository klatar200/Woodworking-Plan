import { layoutTopFace } from './layout';
import {
  closingThicknessHint,
  miterLatticeCloses,
  thicknessMismatchesClose,
  type ClosableCell,
} from './miter-geometry';
import { boardFeetBySpeciesFor } from './design-board-feet';
import { panelGeometry } from './panel-geometry';
import { getSpecies } from './species';
import type {
  BoardDesignConfig,
  BoardMetrics,
  Panel,
} from './types';

/**
 * Append miter closure warnings. Thickness gate always runs; colour continuity
 * always runs (Sprint 62 — deleted the unreachable 48k skip gate after measuring
 * colour alone at ≤ ~25 ms for a closing 12k lattice; schema-max ≪ 200 ms).
 */
export function applyMiterClosureWarnings(
  warnings: string[],
  cells: readonly ClosableCell[],
  panels: readonly Panel[],
): void {
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

  const closed = miterLatticeClosesMemo(cells, panels);
  if (
    !closed &&
    !warnings.some((w) => w.includes('lattice will not close'))
  ) {
    warnings.push(
      'Miter pattern does not close — check corners and row transforms.',
    );
  }
}

/**
 * Panel + finished-board metrics for a cutting-board design.
 *
 * Pure and total: never throws, never returns NaN, always a full BoardMetrics.
 * Invalid *shapes* are rejected upstream by zod (serialize.ts), not here.
 */
export function calculateMetrics(config: BoardDesignConfig): BoardMetrics {
  const geometry = panelGeometry(config);
  const warnings = [...geometry.warnings];
  const complete = geometry.complete;

  const panels = config.panels;

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

  const boardFeetBySpecies = boardFeetBySpeciesFor(config, geometry.panelPlan);
  const totalBoardFeet = boardFeetBySpecies.reduce(
    (sum, row) => sum + row.boardFeet,
    0,
  );

  const metricsSoFar: BoardMetrics = {
    panelWidthIn: geometry.panelWidthIn,
    finishedLengthIn: geometry.finishedLengthIn,
    finishedWidthIn: geometry.finishedWidthIn,
    finishedThicknessIn: geometry.finishedThicknessIn,
    sliceCount: geometry.sliceCount,
    panelPlan: geometry.panelPlan,
    boardFeetBySpecies,
    totalBoardFeet,
    warnings,
    complete,
  };

  // Miter lattice closure — see applyMiterClosureWarnings / Sprint 61 notes.
  const hasMiter = panels.some((p) => p.strips.some((s) => s.miter));
  if (hasMiter) {
    const cells = layoutTopFace(config, metricsSoFar);
    applyMiterClosureWarnings(warnings, cells, panels);
  }

  return {
    ...metricsSoFar,
    warnings,
    complete,
  };
}

/** Last colour-closure result — skip recompute when the lattice fingerprint is unchanged. */
let colourMemoKey = '';
let colourMemoValue = true;

function miterLatticeClosesMemo(
  cells: readonly ClosableCell[],
  panels: readonly Panel[],
): boolean {
  const key = colourFingerprint(cells, panels);
  if (key === colourMemoKey) return colourMemoValue;
  colourMemoKey = key;
  colourMemoValue = miterLatticeCloses(cells, panels);
  return colourMemoValue;
}

/**
 * Fingerprint the lattice geometry that affects colour continuity.
 * Name / wasteFactor changes must not bust the memo.
 */
function colourFingerprint(
  cells: readonly ClosableCell[],
  panels: readonly Panel[],
): string {
  return JSON.stringify({
    cells: cells.map((c) => [
      c.xIn,
      c.yIn,
      c.wIn,
      c.hIn,
      c.speciesId,
      c.wedge?.speciesId ?? null,
      c.wedge?.polygon ?? null,
    ]),
    panels: panels.map((p) => [
      p.thicknessIn,
      p.strips.map((s) => [
        s.widthIn,
        s.miter?.angleDeg ?? null,
        s.miter?.corner ?? null,
        s.miter?.speciesId ?? null,
      ]),
    ]),
  });
}
