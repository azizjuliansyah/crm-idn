'use client';

import React from 'react';
import { useDashboard } from '../../DashboardContext';
import { KwitansisView } from '@/components/features/kwitansis/KwitansisView';

export default function KwitansisPage() {
  const { activeCompany } = useDashboard();

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;

  return <KwitansisView company={activeCompany} />;
}
