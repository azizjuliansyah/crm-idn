'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { SopListView } from '@/components/features/sop/SopListView';

export default function SopPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <SopListView company={company} />;
}
