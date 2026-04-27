'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { supabase } from '@/lib/supabase';

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const init = useAppStore((state) => state.init);

  useEffect(() => {
    // Initial load
    init();

    // Listen for auth changes to sync store immediately
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Background re-sync if session exists
        if (session) {
          init();
        }
      } else if (event === 'SIGNED_OUT') {
        // Clear user state if signed out externally
        useAppStore.getState().setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [init]);

  return <>{children}</>;
}
