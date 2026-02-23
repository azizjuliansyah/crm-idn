'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { ClientsView } from '@/components/features/clients/ClientsView';

export default function ClientsPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <ClientsView company={company} />;
}
