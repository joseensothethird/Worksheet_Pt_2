"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Missing Supabase environment variables. Make sure they're set in Vercel."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
