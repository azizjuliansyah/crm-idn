'use client';

import React from 'react';
import { useDashboard } from './DashboardContext';
import { DashboardOverview } from '@/components/DashboardOverview';

export default function DashboardPage() {
  const { activeCompany } = useDashboard();
  if (!activeCompany) return null;
  return <DashboardOverview company={activeCompany} />;
}
