/** Sprint 72 — Save a copy display name (max 80). */
export function copyDesignName(name: string): string {
  const trimmed = name.trim() || 'Untitled';
  const next = `Copy of ${trimmed}`;
  return next.length <= 80 ? next : next.slice(0, 80);
}
