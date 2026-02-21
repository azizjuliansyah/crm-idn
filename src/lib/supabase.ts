import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://gnjbvtatpgabaretjfyv.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduamJ2dGF0cGdhYmFyZXRqZnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NzgzNjcsImV4cCI6MjA4NTA1NDM2N30.oA-8h9ViyTFT_wdogtt0fGmYM70DzDU-p7ySlFfLdrI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'crm_pintar_auth_session',
    // Mencegah Supabase melakukan pengecekan sesi yang terlalu agresif saat window fokus
    // Note: window is not defined in server-side Next.js, so we need a check or use client-side only.
    // However, since this file is likely used in client components, we can leave it but safer to use a check if we move to SSR.
    // For now, mirroring original.
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});
