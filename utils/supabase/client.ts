import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function createSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false, // Disable automatic URL detection to prevent session conflicts
          storage: {
            getItem: (key: string) => {
              if (typeof window !== 'undefined') {
                return window.localStorage.getItem(key);
              }
              return null;
            },
            setItem: (key: string, value: string) => {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, value);
                // Also set as cookie for server-side access
                document.cookie = `${key}=${value}; path=/; max-age=604800; SameSite=Lax`;
              }
            },
            removeItem: (key: string) => {
              if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
                // Also remove cookie
                document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
              }
            },
          },
        }
      }
    );
  }

  return supabaseInstance;
}