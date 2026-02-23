'use client';

import React from 'react';
import { useDashboard } from '../../DashboardContext';
import { ClientCompanyCategoriesSettingsView } from '@/components/features/clients/ClientCompanyCategoriesSettingsView';

export default function ClientCompanyCategoriesPage() {
  const { activeCompany } = useDashboard();
  if (!activeCompany) return null;
  return <ClientCompanyCategoriesSettingsView company={activeCompany} />;
}
