'use client';

import React from 'react';
import { useDashboard } from '../DashboardContext';
import { SupportTicketsView } from '@/components/SupportTicketsView';

export default function SupportPage() {
  const { activeCompany, user } = useDashboard();
  if (!user) return null;
  return <SupportTicketsView activeCompany={activeCompany} activeView="customer_support" user={user} />;
}
