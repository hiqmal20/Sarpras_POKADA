import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ffvaemxzopqtsckdhdpq.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdmFlbXh6b3BxdHNja2RoZHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzI3MjU0MiwiZXhwIjoyMTAyODQ4NTQyfQ.fMVhfuM8HKyaiNarWMQuzv_HIutdprFayHJyCuyahZc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
