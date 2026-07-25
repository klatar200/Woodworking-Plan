import type { Cell } from '@/lib/board-designer/layout';

export const MAX_3D_CELLS = 8_000;

export interface SpeciesCellGroup {
  speciesId: string;
  colorHex: string;
  cells: Cell[];
}

export function groupCellsBySpecies(cells: readonly Cell[]): SpeciesCellGroup[] {
  const order: string[] = [];
  const groups = new Map<string, SpeciesCellGroup>();

  for (const cell of cells) {
    const existing = groups.get(cell.speciesId);
    if (existing) {
      existing.cells.push(cell);
      continue;
    }

    order.push(cell.speciesId);
    groups.set(cell.speciesId, {
      speciesId: cell.speciesId,
      colorHex: cell.colorHex,
      cells: [cell],
    });
  }

  return order.map((speciesId) => groups.get(speciesId)!);
}

export function shouldUseSvgFallback(cellCount: number): boolean {
  return cellCount > MAX_3D_CELLS;
}

export function sanitizeBoardFileName(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || 'board-design';
}
