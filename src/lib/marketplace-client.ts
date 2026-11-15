import { createClient } from "@supabase/supabase-js";
import type { MarketplaceDatabase } from "./marketplace.types";

export function createMarketplaceClient() {
  const url = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient<MarketplaceDatabase>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
