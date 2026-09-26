import { revalidateTag } from "next/cache";

import { RESUME_CACHE_TAG } from "@/lib/resume";

// Called by the resume repo's Cloudflare deploy so a resume change shows up
// right away instead of when the 30-day cache expires. It's unauthenticated on
// purpose: the resume is public, and a call only marks it stale, so the worst
// case is an extra background refetch while visitors keep getting the cached copy.
export function POST() {
  revalidateTag(RESUME_CACHE_TAG, "max");
  return Response.json({ revalidated: true });
}
