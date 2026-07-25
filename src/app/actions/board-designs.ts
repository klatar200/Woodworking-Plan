'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { checkRateLimit } from '@/lib/rate-limit';
import { guardAction } from '@/lib/action-guard';
import { formString } from '@/lib/form-fields';
import { denialTarget, bounceTarget } from '@/lib/rate-limit-feedback';
import { parseConfig } from '@/lib/board-designer/serialize';
import { createDesign, updateDesign, deleteDesign } from '@/lib/board-designs';
import type { BoardDesignConfig } from '@/lib/board-designer/types';

const FALLBACK = '/designer';
const MAX_CONFIG_BYTES = 8 * 1024;

function parseConfigField(formData: FormData): BoardDesignConfig | null {
  const raw = formString(formData, 'config');
  if (raw === null) return null;
  if (new TextEncoder().encode(raw).byteLength > MAX_CONFIG_BYTES) return null;

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = parseConfig(json);
  return parsed.ok ? parsed.config : null;
}

export async function createBoardDesignAction(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, FALLBACK));

  const config = parseConfigField(formData);
  if (config === null) redirect(bounceTarget(formData, FALLBACK));

  let designId: string | null = null;
  await guardAction(
    createDesign(config).then((design) => {
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
  const config = parseConfigField(formData);
  if (designId === null || config === null) redirect(bounceTarget(formData, FALLBACK));

  await guardAction(updateDesign(designId, config), formData, FALLBACK);

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
