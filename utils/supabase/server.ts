import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createSupabaseClient() {
  const cookieStore = await cookies(); // Await the cookies() promise
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: {
          getItem: (key: string) => cookieStore.get(key)?.value || null,
          setItem: (key: string, value: string) => {
            cookieStore.set(key, value, { secure: true, httpOnly: true }); // No return value
          },
          removeItem: (key: string) => {
            cookieStore.delete(key); // No return value
          },
        },
      },
    }
  );
}