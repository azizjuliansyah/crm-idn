'use client';

import React from 'react';
import { useDashboard } from '../../DashboardContext';
import { ClientsView } from '@/components/ClientsView';

export default function ClientsPage() {
  const { activeCompany } = useDashboard();
  return <ClientsView company={activeCompany} />;
}
