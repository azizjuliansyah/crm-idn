'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { ClientCompaniesView } from '@/components/features/clients/ClientCompaniesView';

export default function ClientCompaniesPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <ClientCompaniesView company={company} />;
}
