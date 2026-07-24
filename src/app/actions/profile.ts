'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formString } from '@/lib/form-fields';
import { checkRateLimit } from '@/lib/rate-limit';
import { denialTarget, bounceTarget } from '@/lib/rate-limit-feedback';
import { guardAction } from '@/lib/action-guard';

/**
 * Update optional profile fields — Sprint 47.
 *
 * SECURITY: owner from `requireUser()` only. Any injected `userId` in FormData is
 * ignored — never read. Server action must not throw: malformed/oversized input
 * bails via `redirect()`, rate-limit drops via `checkRateLimit()`, lib work wrapped
 * in `guardAction()`.
 *
 * Website: http(s) only — `javascript:` / `data:` / protocol-relative rejected.
 */

const MAX_PHONE = 40;
const MAX_COMPANY = 120;
const MAX_JOB_TITLE = 120;
const MAX_WEBSITE = 200;

const PROFILE = '/settings/profile';

/**
 * Optional string field with a hard length bound.
 *
 * Present-as-string is required (missing/File → bail). Empty trims to null (clears the
 * column). `formString` supplies the trimmed non-empty value; the length check runs on
 * the raw trim so an oversized payload cannot sneak past via a null return.
 */
function readOptional(
  formData: FormData,
  key: string,
  max: number,
): string | null | undefined {
  const raw = formData.get(key);
  if (typeof raw !== 'string') return undefined; // bail
  if (raw.trim().length > max) return undefined; // bail
  return formString(formData, key); // null when empty → clear
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function updateProfileFields(formData: FormData): Promise<void> {
  if (!(await checkRateLimit('create'))) redirect(denialTarget(formData, PROFILE));

  const phone = readOptional(formData, 'phone', MAX_PHONE);
  const company = readOptional(formData, 'company', MAX_COMPANY);
  const jobTitle = readOptional(formData, 'jobTitle', MAX_JOB_TITLE);
  const website = readOptional(formData, 'website', MAX_WEBSITE);

  if (
    phone === undefined ||
    company === undefined ||
    jobTitle === undefined ||
    website === undefined
  ) {
    redirect(bounceTarget(formData, PROFILE));
  }

  if (website !== null && !isHttpUrl(website)) {
    redirect(bounceTarget(formData, PROFILE));
  }

  await guardAction(
    (async () => {
      const user = await requireUser();
      // Intentionally ignore any formData.get('userId') — owner is the session only.
      await prisma.user.update({
        where: { id: user.id },
        data: { phone, company, jobTitle, website },
      });
    })(),
    formData,
    PROFILE,
  );

  revalidatePath(PROFILE);
  redirect(PROFILE);
}
