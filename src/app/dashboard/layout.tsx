import React from 'react';
import { DashboardProvider } from './DashboardContext';
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient';
import { createClient } from '@/lib/supabase-server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  return (
    <DashboardProvider>
      <DashboardLayoutClient>
        {children}
      </DashboardLayoutClient>
    </DashboardProvider>
  );
}
