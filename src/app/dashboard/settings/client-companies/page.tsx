'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { ClientCompanyCategoriesSettingsView } from '@/components/ClientCompanyCategoriesSettingsView';

export default function ClientCompanyCategoriesPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <ClientCompanyCategoriesSettingsView company={company} />;
}
