import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import SurpriseExperience from "./surprise-experience";

export const dynamic = "force-dynamic";

export default async function SharedSurprise({ params }: { params: { slug: string } }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) notFound();
  const db = createClient(url, key);
  const { data, error } = await db.from("surprises").select("title,recipient_name,sender_name,occasion_date,letter,wishes,theme,experience,published").eq("slug", params.slug).eq("published", true).single();
  if (error || !data) notFound();
  return <SurpriseExperience surprise={data} />;
}