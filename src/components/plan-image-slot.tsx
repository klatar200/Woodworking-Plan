import Image from 'next/image';

interface PlanImage {
  url: string;
  alt: string;
}

interface Props {
  title: string;
  image?: PlanImage;
}

/**
 * The plan's image slot — Sprint 20, the desktop right rail.
 *
 * Renders the plan's primary photo when there is one, and an honest empty placeholder
 * when there isn't. There is NO AI-generated image here, by decision
 * (`DECISIONS_LOG.md` 2026-07-14): no image-gen API has a genuine free perpetual tier at
 * production quality, so it would break the $0-during-development constraint. The slot
 * ships ready to receive real photography — which has been the open content item since
 * Sprint 1, where every one of the 24 plans has `images: []`.
 *
 * A placeholder rather than nothing, on purpose: the two-column desktop layout needs the
 * rail to hold its shape whether or not a photo exists, and an empty column reads as a
 * broken layout. On mobile it is one modest block, not a hero that pushes the plan's
 * actual data below the fold — this app's differentiator is the structured metadata, not
 * the picture (BUSINESS_PLAN.md §9).
 */
export function PlanImageSlot({ title, image }: Props) {
  // Sprint 30a: image slot moved from globals.css to Tailwind utilities.
  return (
    <div className="border border-border rounded-[0.5rem] overflow-hidden bg-surface">
      {image ? (
        <Image
          src={image.url}
          alt={image.alt}
          width={800}
          height={600}
          sizes="(max-width: 64rem) 100vw, 22rem"
          className="block w-full h-auto"
          priority
        />
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-[0.5rem] aspect-[4/3] text-muted bg-accent-tint text-[2.5rem]"
          role="img"
          aria-label={`No photo yet for ${title}`}
        >
          <span aria-hidden="true">🪚</span>
          <span className="text-[0.875rem]">Photo coming soon</span>
        </div>
      )}
    </div>
  );
}
