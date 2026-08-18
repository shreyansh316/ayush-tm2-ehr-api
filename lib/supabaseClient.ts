import { createClient } from '@supabase/supabase-js';

export interface NamasteCodeRecord {
  'Sr No.': number;
  'TM2 Code': string;
  'Ayurveda Code'?: string | null;
  'Name English'?: string | null;
  'Namc Term Devanagari'?: string | null;
  'Hinglish'?: string | null;
  similarity_score?: number;
}

export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      console.warn(
        '⚠️ Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Ensure they are configured in .env.local'
      );
    }
  }

  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
  );
}

export const supabase = getSupabase();
