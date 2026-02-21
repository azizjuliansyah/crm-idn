'use client';

import React from 'react';
import { useDashboard } from '../DashboardContext';
import { ComplaintsView } from '@/components/ComplaintsView';

export default function ComplaintsPage() {
  const { activeCompany, user } = useDashboard();
  if (!user) return null;
  return <ComplaintsView activeCompany={activeCompany} activeView="complaints" user={user} />;
}
