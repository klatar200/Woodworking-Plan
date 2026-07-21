/**
 * Sprint 35 (audit H1) — destructive-action confirmation for reviews and build photos.
 *
 * Deletion is a two-step, URL-driven flow: the "Delete"/"Remove" control is a GET link that
 * adds `?confirm-delete=<id>` / `?confirm-photo=<id>`, and the matching card then reveals an
 * inline confirm block with the real server-action form. This is the one decision the confirm
 * block hangs on, extracted so the SECURITY-relevant rule is unit-tested rather than buried in
 * JSX: the confirm renders ONLY when the requested id matches a target the SESSION user may
 * actually modify (their own review/photo, or an admin). A forged or foreign id — the whole
 * point of the audit finding — reveals nothing, and the raw param is never reflected into
 * markup (callers compare it, they do not print it). The server action re-checks ownership
 * regardless; this only governs what the page shows.
 */
export function showConfirm(
  confirmId: string | undefined | null,
  targetId: string,
  canModify: boolean,
): boolean {
  return canModify && confirmId === targetId;
}
