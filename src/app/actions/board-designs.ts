'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { checkRateLimit } from '@/lib/rate-limit';
import { guardAction } from '@/lib/action-guard';
import { formString } from '@/lib/form-fields';
import {
  denialTarget,
  bounceTarget,
  noticeUrl,
  DESIGN_TOO_LARGE_NOTICE_VALUE,
} from '@/lib/rate-limit-feedback';
import { parseConfig } from '@/lib/board-designer/serialize';
import { createDesign, updateDesign, deleteDesign } from '@/lib/board-designs';
import { MAX_CONFIG_BYTES } from '@/lib/board-designer/config-limits';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

const FALLBACK = '/designer';

export { MAX_CONFIG_BYTES };

type ParseResult =
  | { ok: true; config: BoardDesignConfig }
  | { ok: false; reason: 'missing' | 'too-large' | 'invalid' };

function parseConfigField(formData: FormData): ParseResult {
  const raw = formString(formData, 'config');
  if (raw === null) return { ok: false, reason: 'missing' };
  if (new TextEncoder().encode(raw).byteLength > MAX_CONFIG_BYTES) {
    return { ok: false, reason: 'too-large' };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  const parsed = parseConfig(json);
  return parsed.ok
    ? { ok: true, config: parsed.config }
    : { ok: false, reason: 'invalid' };
}

function bounceParseFailure(formData: FormData, fallback: string, reason: ParseResult & { ok: false }): never {
  const target = bounceTarget(formData, fallback);
  // Size rejection is the user's real work, not tampering — carry a notice.
  // Missing/invalid (structural) stays silent per CLAUDE.md §7.
  if (reason.reason === 'too-large') {
    redirect(noticeUrl(target, DESIGN_TOO_LARGE_NOTICE_VALUE));
  }
  redirect(target);
}

export async function createBoardDesignAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, FALLBACK));

  const parsed = parseConfigField(formData);
  if (!parsed.ok) bounceParseFailure(formData, FALLBACK, parsed);

  let designId: string | null = null;
  await guardAction(
    createDesign(parsed.config).then((design) => {
      designId = design.id;
    }),
    formData,
    FALLBACK,
  );

  revalidatePath('/designer/library');
  redirect(designId ? `/designer/${designId}` : bounceTarget(formData, FALLBACK));
}

export async function updateBoardDesignAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, FALLBACK));

  const designId = formString(formData, 'designId');
  const parsed = parseConfigField(formData);
  if (designId === null) redirect(bounceTarget(formData, FALLBACK));
  if (!parsed.ok) bounceParseFailure(formData, `/designer/${designId}`, parsed);

  await guardAction(updateDesign(designId, parsed.config), formData, FALLBACK);

  revalidatePath(`/designer/${designId}`);
  revalidatePath('/designer/library');
  redirect(bounceTarget(formData, `/designer/${designId}`));
}

export async function deleteBoardDesignAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('toggle'))) redirect(denialTarget(formData, FALLBACK));

  const designId = formString(formData, 'designId');
  if (designId === null) redirect(bounceTarget(formData, FALLBACK));

  await guardAction(deleteDesign(designId), formData, FALLBACK);

  revalidatePath('/designer/library');
  redirect(bounceTarget(formData, '/designer/library'));
}
