import { MAX_STRIPS_PER_PANEL, MAX_STRIPS_TOTAL } from './config-limits';
import { parseConfig } from './serialize';
import type { BoardDesignConfig } from './types';

/**
 * Why this design cannot be saved yet, in words (Sprint 81).
 *
 * The server rejects an invalid config with a silent bounce that reloads the page (CLAUDE.md §7
 * — structural failures carry no notice), which used to throw away the user's unsaved work. The
 * designer now checks first: Save stays disabled and these messages say why.
 *
 * The gate is `parseConfig` — the server's own — so `saveBlockers(c).length === 0` exactly when
 * the server would accept `c`. The specific messages only explain the states the editor can reach;
 * anything else falls back to a generic line rather than letting an invalid design through.
 */
export function saveBlockers(config: BoardDesignConfig): string[] {
  if (parseConfig(config).ok) return [];

  const blockers: string[] = [];
  const panelName = (label: string, index: number) => (label.length > 0 ? label : `Panel ${index + 1}`);

  if (config.name.length === 0) blockers.push('Give the board a name.');
  if (config.panels.some((panel) => panel.label.length === 0)) {
    blockers.push('Give every panel a label.');
  }
  config.panels.forEach((panel, index) => {
    if (panel.strips.length === 0) {
      blockers.push(`"${panelName(panel.label, index)}" needs at least one strip.`);
    } else if (panel.strips.length > MAX_STRIPS_PER_PANEL) {
      blockers.push(`"${panelName(panel.label, index)}" has more than ${MAX_STRIPS_PER_PANEL} strips.`);
    }
  });
  const total = config.panels.reduce((sum, panel) => sum + panel.strips.length, 0);
  if (total > MAX_STRIPS_TOTAL) {
    blockers.push(`A board can have at most ${MAX_STRIPS_TOTAL} strips.`);
  }
  const panelIds = new Set(config.panels.map((panel) => panel.id));
  if (config.rowPattern.some((step) => !panelIds.has(step.panelId))) {
    blockers.push('A row in the pattern uses a deleted panel.');
  }

  if (blockers.length === 0) {
    blockers.push("This design can't be saved — undo your last change.");
  }
  return blockers;
}
