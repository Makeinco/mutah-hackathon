import { createClient } from "@supabase/supabase-js";

const url = import.meta.env["VITE_SUPABASE_URL"] || "https://lxwwdobvlysgqdgixniv.supabase.co";
const key =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  "sb_publishable_L-E_exDU3r8nhA5xz3gb4w_EzqgXiIv";

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "implicit",
  },
});
