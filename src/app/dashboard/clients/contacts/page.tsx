'use client';

import React from 'react';
import { useDashboard } from '../../DashboardContext';
import { ClientsView } from '@/components/features/clients/ClientsView';

export default function ClientsPage() {
  const { activeCompany } = useDashboard();
  if (!activeCompany) return null;
  return <ClientsView company={activeCompany} />;
}
