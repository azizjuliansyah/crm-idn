'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useDashboard } from './DashboardContext';
import { Loader2 } from 'lucide-react';

const DashboardOverview = dynamic(
  () => import('@/components/features/dashboard/DashboardOverview').then(mod => mod.DashboardOverview),
  { 
    loading: () => (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Menyiapkan Komponen Dashboard...</p>
      </div>
    )
  }
);

export default function DashboardPage() {
  const { activeCompany } = useDashboard();
  if (!activeCompany) return null;
  return <DashboardOverview company={activeCompany} />;
}
