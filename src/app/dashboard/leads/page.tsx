'use client';

import React from 'react';
import { useDashboard } from '../DashboardContext';
import { LeadsView } from '@/components/features/leads/LeadsView';

export default function LeadsPage() {
  const { activeCompany, user } = useDashboard();
  if (!user) return null;
  return <LeadsView activeCompany={activeCompany} activeView="leads" user={user} />;
}
