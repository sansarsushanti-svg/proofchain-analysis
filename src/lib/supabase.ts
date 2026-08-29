import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabase: SupabaseClient;

if (isConfigured) {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!);
} else {
  // Create a safe stub that won't crash when called.
  // All auth methods return graceful errors instead of throwing.
  const noop = async () => ({ data: { session: null }, error: null });
  const noopVoid = async () => {};

  supabase = {
    auth: {
      getSession: noop,
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.", name: "AuthConfigError", status: 400 } as any,
      }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.", name: "AuthConfigError", status: 400 } as any,
      }),
      signOut: noopVoid,
      getUser: noop,
    },
  } as unknown as SupabaseClient;

  console.warn(
    "Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your project's Keys/API keys UI.",
  );
}

export { supabase };
export { isConfigured };
