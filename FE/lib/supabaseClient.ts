import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseAnonKey) {
  console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY belum dikonfigurasi di environment.");
}

export const supabase = createClient(supabaseUrl || "http://localhost", supabaseAnonKey || "missing-key");
export default supabase;
