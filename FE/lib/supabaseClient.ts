import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function decodeRole(key: string): string | null {
  try {
    const part = key.split(".")[1];
    if (!part) return null;
    // Browser-safe base64url decode (no Node Buffer in bundle)
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof window !== "undefined" && typeof window.atob === "function"
        ? window.atob(b64)
        : Buffer.from(b64, "base64").toString();
    return JSON.parse(json)?.role ?? null;
  } catch {
    return null;
  }
}

// Fail-fast: never embed service_role key in the frontend bundle.
// Only the public anon key may be used client-side (subject to RLS).
// If a service_role key is detected we refuse to use it so the bundle
// never carries privileged credentials — API calls go via BE instead.
let effectiveKey = supabaseAnonKey;
if (supabaseAnonKey.startsWith("eyJ") && decodeRole(supabaseAnonKey) === "service_role") {
  if (typeof window !== "undefined") {
    console.error(
      "[supabase] SECURITY: service_role key terdeteksi di NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Bundle frontend diblokir memakai key ini. Ganti dengan anon public key dan rotasi key yang bocor di Supabase Dashboard → Settings → API."
    );
  }
  effectiveKey = "";
}

if ((!supabaseUrl || !effectiveKey) && typeof window !== "undefined") {
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum valid. API tetap jalan via backend (BE-only mode)."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  effectiveKey || "placeholder-anon-key"
);
export default supabase;
