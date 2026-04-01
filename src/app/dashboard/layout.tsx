import React from 'react';
import { DashboardProvider } from './DashboardContext';
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient';
import { createClient } from '@/lib/supabase-server';

import { QueryProvider } from '@/components/providers/QueryProvider';
import { AppInitializer } from '@/components/providers/AppInitializer';
import { GlobalToast } from '@/components/shared/notifications/GlobalToast';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  return (
    <QueryProvider>
      <AppInitializer>
        <DashboardProvider>
          <DashboardLayoutClient>
            {children}
          </DashboardLayoutClient>
          <GlobalToast />
        </DashboardProvider>
      </AppInitializer>
    </QueryProvider>
  );
}
