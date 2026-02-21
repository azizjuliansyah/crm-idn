'use client';

import React from 'react';
import { useDashboard } from '../../DashboardContext';
import { ClientCompaniesView } from '@/components/ClientCompaniesView';

export default function ClientCompaniesPage() {
  const { activeCompany } = useDashboard();
  return <ClientCompaniesView company={activeCompany} />;
}
