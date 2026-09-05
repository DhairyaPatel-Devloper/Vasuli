console.log('DEBUG - Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('DEBUG - Supabase Key exists:', !!(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));

import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

export function getSupabaseBrowserClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Support both env var names — PUBLISHABLE_KEY is the new Supabase default
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase URL or publishable key is missing. Check your .env.local file.'
      );
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}
