'use client';

import React from 'react';
import { useDashboard } from '../DashboardContext';
import { LeadsView } from '@/components/LeadsView';

export default function LeadsPage() {
  const { activeCompany } = useDashboard();
  return <LeadsView activeCompany={activeCompany} activeView="leads" />;
}
