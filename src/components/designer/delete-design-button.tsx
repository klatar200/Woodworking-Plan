'use client';

import { useState } from 'react';
import { btnDanger, btnGhost } from '@/lib/ui';

/**
 * Library delete that asks first (Sprint 81). Deleting a board is permanent — the server removes
 * the row outright — so one click must never be enough. The first button submits nothing.
 */
export function DeleteDesignButton({
  designId,
  name,
  action,
}: {
  designId: string;
  name: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className={btnGhost} onClick={() => setConfirming(true)}>
        Delete
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-[0.5rem]">
      <input type="hidden" name="designId" value={designId} />
      <input type="hidden" name="returnTo" value="/designer/library" />
      <span className="text-[0.875rem]">{`Delete "${name}"? This can't be undone.`}</span>
      <button type="submit" className={btnDanger}>
        Delete board
      </button>
      <button type="button" className={btnGhost} onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </form>
  );
}
