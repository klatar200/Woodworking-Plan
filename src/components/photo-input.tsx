'use client';

import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import {
  shouldDownscale,
  scaledDimensions,
  DOWNSCALE_MAX_EDGE,
  DOWNSCALE_QUALITY,
} from '@/lib/client-image';

/**
 * The review form's photo input — a client island that downscales big photos before
 * they are submitted. AUDIT FIX 2026-07-19; sizing rules in src/lib/client-image.ts.
 *
 * WHY: the action body is capped at 4 MB (next.config.ts) and Vercel caps it at
 * ~4.5 MB regardless, while a raw phone photo is routinely 3–12 MB. The server stores
 * a 1600px longest edge anyway, so re-encoding to that size here costs nothing the
 * user would ever see and turns a doomed multi-MB upload into a few hundred KB.
 *
 * FAILS SOFT, PER FILE. Any error — an undecodable file, a browser without
 * createImageBitmap, a canvas that won't encode — leaves the ORIGINAL file in place.
 * Worst case is exactly the behaviour before this component existed. With JavaScript
 * off this renders as the plain <input type="file"> it wraps, and small files still
 * upload fine — the enhancement degrades, the form does not.
 *
 * SECURITY: nothing here is a validation step. The server still decides the file type
 * by magic bytes, caps bytes and pixels, and fully re-encodes (src/lib/storage.ts).
 */

interface Props {
  id: string;
  name: string;
  accept: string;
  multiple?: boolean;
}

async function downscale(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = scaledDimensions(
      bitmap.width,
      bitmap.height,
      DOWNSCALE_MAX_EDGE,
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', DOWNSCALE_QUALITY),
    );

    // If the re-encode failed or somehow grew the file, keep the original.
    if (!blob || blob.size >= file.size) return file;

    const stem = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${stem}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function PhotoInput({ id, name, accept, multiple = false }: Props) {
  // Re-entrancy guard. Assigning `input.files` programmatically does not refire
  // `change`, but a second user-initiated change mid-processing should not interleave.
  const busy = useRef(false);

  const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    if (busy.current) return;

    const files = Array.from(input.files ?? []);
    if (!files.some(shouldDownscale)) return;

    busy.current = true;
    try {
      const transfer = new DataTransfer();
      for (const file of files) {
        transfer.items.add(shouldDownscale(file) ? await downscale(file) : file);
      }
      input.files = transfer.files;
    } catch {
      // Leave whatever the user picked in place — the server has its own limits.
    } finally {
      busy.current = false;
    }
  };

  return (
    <input
      id={id}
      type="file"
      name={name}
      accept={accept}
      multiple={multiple}
      onChange={onChange}
    />
  );
}
