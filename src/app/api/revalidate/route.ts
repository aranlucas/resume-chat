import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

import { RESUME_CACHE_TAG } from "@/lib/resume";

// Called by the resume repo's Cloudflare deploy so a resume change reaches the
// page and the assistant right away instead of when the 30-day cache expires.
export function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (secret === undefined || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }
  // Serve cached data while the fresh copy loads in the background.
  revalidateTag(RESUME_CACHE_TAG, "max");
  return Response.json({ revalidated: true });
}
