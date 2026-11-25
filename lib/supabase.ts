import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

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