import React from 'react';
import { DashboardProvider } from './DashboardContext';
import { DashboardLayoutClient } from '@/components/DashboardLayoutClient';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardLayoutClient>
        {children}
      </DashboardLayoutClient>
    </DashboardProvider>
  );
}
