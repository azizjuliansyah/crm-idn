import React from 'react';
import { redirect } from 'next/navigation';
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient';
import { createClient } from '@/lib/supabase-server';

import { QueryProvider } from '@/components/providers/QueryProvider';
import { AppInitializer } from '@/components/providers/AppInitializer';
import { GlobalToast } from '@/components/shared/notifications/GlobalToast';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error('Supabase auth error:', error);
  }
  
  if (!user) {
    return redirect('/login');
  }

  return (
    <QueryProvider>
      <AppInitializer>
        <DashboardLayoutClient>
          {children}
        </DashboardLayoutClient>
        <GlobalToast />
      </AppInitializer>
    </QueryProvider>
  );
}
