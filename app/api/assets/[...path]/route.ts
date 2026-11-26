import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const bucket = "surprise-assets";

// Ensure signed asset URLs are generated from the latest stored path.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } },
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const path = params.path;

  if (!url || !key) {
    return NextResponse.json({ error: "Asset storage is not configured." }, { status: 500 });
  }

  if (path.length !== 4 || path.some((part) => !part || part === "." || part === "..")) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const mediaFile = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp3|m4a|wav|ogg|webm|jpg|jpeg|png|webp)$/i;
  if (!uuid.test(path[0]) || !uuid.test(path[1]) || !["song", "memory"].includes(path[2]) || !mediaFile.test(path[3])) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.storage
    .from(bucket)
.createSignedUrl(path.join("/"), 60 * 60 * 24);

  if (error || !data) {
    return NextResponse.json({ error: "Asset is unavailable." }, { status: 404 });
  }

  return NextResponse.json(
    { url: data.signedUrl },
    { headers: { "Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate", "Pragma": "no-cache", "Expires": "0" } },
  );
}
