import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;

export type Surprise = {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  recipient_name: string;
  sender_name: string;
  occasion_date: string | null;
  letter: string;
  wishes: string[];
  theme: string;
  published: boolean;
  created_at?: string;
};