'use client';

import React from 'react';
import { useDashboard } from '../../DashboardContext';
import { ClientCompaniesView } from '@/components/ClientCompaniesView';

export default function ClientCompaniesPage() {
  const { activeCompany } = useDashboard();
  if (!activeCompany) return null;
  return <ClientCompaniesView company={activeCompany} />;
}
