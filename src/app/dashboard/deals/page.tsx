'use client';

import React from 'react';
import { useDashboard } from '../DashboardContext';
import { DealsView } from '@/components/DealsView';

export default function DealsPage() {
  const { activeCompany, user } = useDashboard();
  if (!user) return null;
  return <DealsView activeCompany={activeCompany} activeView="deals" user={user} />;
}
