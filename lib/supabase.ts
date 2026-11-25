import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;

export type PageKey = "welcome" | "song" | "wishes" | "candles" | "memory" | "final";

export type MemoryPhoto = {
  path: string;
  caption: string;
};

export type SurpriseExperience = {
  enabled: Record<Exclude<PageKey, "welcome" | "final">, boolean>;
  pageOrder: PageKey[];
  songTitle: string;
  songDedication: string;
  songPath: string;
  memoryTitle: string;
  memories: MemoryPhoto[];
};

export const defaultExperience: SurpriseExperience = {
  enabled: {
    song: false,
    wishes: true,
    candles: true,
    memory: false,
  },
  pageOrder: ["welcome", "song", "wishes", "candles", "memory", "final"],
  songTitle: "",
  songDedication: "",
  songPath: "",
  memoryTitle: "",
  memories: [],
};

export function readExperience(value: unknown): SurpriseExperience {
  const raw = value && typeof value === "object"
    ? value as Partial<SurpriseExperience>
    : {};
  const rawEnabled: Partial<SurpriseExperience["enabled"]> =
    raw.enabled && typeof raw.enabled === "object" ? raw.enabled : {};
  const pages: PageKey[] = ["welcome", "song", "wishes", "candles", "memory", "final"];
  const requestedOrder = Array.isArray(raw.pageOrder)
    ? raw.pageOrder.filter((page): page is PageKey => pages.includes(page as PageKey))
    : [];
  const optionalOrder = Array.from(new Set(requestedOrder.filter((page) => page !== "welcome" && page !== "final")));
  pages.forEach((page) => {
    if (page !== "welcome" && page !== "final" && !optionalOrder.includes(page)) optionalOrder.push(page);
  });
  const pageOrder: PageKey[] = ["welcome", ...optionalOrder, "final"];
  const memories = Array.isArray(raw.memories)
    ? raw.memories.filter((memory) => memory && typeof memory.path === "string")
      .map((memory) => ({ path: memory.path, caption: typeof memory.caption === "string" ? memory.caption : "" }))
    : [];

  return {
    enabled: {
      song: rawEnabled.song === true,
      wishes: rawEnabled.wishes !== false,
      candles: rawEnabled.candles !== false,
      memory: rawEnabled.memory === true,
    },
    pageOrder,
    songTitle: typeof raw.songTitle === "string" ? raw.songTitle : "",
    songDedication: typeof raw.songDedication === "string" ? raw.songDedication : "",
    songPath: typeof raw.songPath === "string" ? raw.songPath : "",
    memoryTitle: typeof raw.memoryTitle === "string" ? raw.memoryTitle : "",
    memories,
  };
}

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
  experience: SurpriseExperience;
  published: boolean;
  created_at?: string;
};