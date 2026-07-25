import { getSpecies } from './species';
import type {
  BoardDesignConfig,
  BoardMetrics,
  SpeciesBoardFeet,
} from './types';

/**
 * Panel + finished-board metrics for a cutting-board design.
 *
 * Pure and total: never throws, never returns NaN, always a full BoardMetrics.
 * Invalid *shapes* are rejected upstream by zod (serialize.ts), not here.
 *
 * Geometry contract: docs/superpowers/plans/cutting-board-designer-build-plan.md §2.
 */
export function calculateMetrics(config: BoardDesignConfig): BoardMetrics {
  const warnings: string[] = [];
  let complete = true;

  const panelWidthIn = config.strips.reduce(
    (sum, s) => sum + s.widthIn * s.repeat,
    0,
  );
  const panelLengthIn = config.sourceLengthIn;
  const panelThicknessIn = config.stockThicknessIn;

  let finishedLengthIn: number;
  let finishedWidthIn: number;
  let finishedThicknessIn: number;
  let sliceCount: number;
  let leftoverIn: number;

  if (config.grain === 'edge') {
    finishedLengthIn = panelLengthIn;
    finishedWidthIn = panelWidthIn;
    finishedThicknessIn = panelThicknessIn;
    sliceCount = 0;
    leftoverIn = 0;
  } else {
    const { sliceThicknessIn, kerfIn } = config;
    sliceCount = Math.max(
      0,
      Math.floor((panelLengthIn + kerfIn) / (sliceThicknessIn + kerfIn)),
    );
    const usedIn =
      sliceCount * sliceThicknessIn + Math.max(0, sliceCount - 1) * kerfIn;
    leftoverIn = panelLengthIn - usedIn;

    // Rotated 90°: strip pattern runs the length; slices glued side by side.
    finishedLengthIn = panelWidthIn;
    finishedWidthIn = sliceCount * panelThicknessIn;
    finishedThicknessIn = sliceThicknessIn;

    if (sliceCount === 0) {
      warnings.push(
        'No slices fit — increase panel length or reduce slice thickness.',
      );
      complete = false;
    }
  }

  if (config.strips.length === 0) {
    warnings.push('Add a strip to see your board.');
    complete = false;
  }

  const seenUnknown = new Set<string>();
  for (const s of config.strips) {
    if (!getSpecies(s.speciesId) && !seenUnknown.has(s.speciesId)) {
      seenUnknown.add(s.speciesId);
      warnings.push(`Unknown wood: ${s.speciesId}`);
    }
  }

  if (finishedWidthIn > 24) {
    warnings.push('Wider than most planers — plan to hand-flatten.');
  }

  const boardFeetBySpecies = boardFeetBySpeciesFor(config);
  const totalBoardFeet = boardFeetBySpecies.reduce(
    (sum, row) => sum + row.boardFeet,
    0,
  );

  return {
    panelWidthIn,
    panelLengthIn,
    panelThicknessIn,
    finishedLengthIn,
    finishedWidthIn,
    finishedThicknessIn,
    sliceCount,
    leftoverIn,
    boardFeetBySpecies,
    totalBoardFeet,
    warnings,
    complete,
  };
}

function boardFeetBySpeciesFor(
  config: BoardDesignConfig,
): SpeciesBoardFeet[] {
  const { stockThicknessIn, sourceLengthIn, wasteFactor } = config;
  const order: string[] = [];
  const totals = new Map<string, number>();

  for (const s of config.strips) {
    if (!totals.has(s.speciesId)) {
      order.push(s.speciesId);
      totals.set(s.speciesId, 0);
    }
    const bf =
      (stockThicknessIn * s.widthIn * sourceLengthIn * s.repeat) / 144;
    totals.set(s.speciesId, (totals.get(s.speciesId) ?? 0) + bf);
  }

  return order.map((speciesId) => {
    const species = getSpecies(speciesId);
    const raw = totals.get(speciesId) ?? 0;
    return {
      speciesId,
      name: species?.name ?? speciesId,
      boardFeet: raw * (1 + wasteFactor),
    };
  });
}
