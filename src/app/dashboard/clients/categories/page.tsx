'use client';

import React from 'react';
import { useDashboard } from '../../DashboardContext';
import { ClientCompanyCategoriesSettingsView } from '@/components/ClientCompanyCategoriesSettingsView';

export default function ClientCompanyCategoriesPage() {
  const { activeCompany } = useDashboard();
  return <ClientCompanyCategoriesSettingsView company={activeCompany} />;
}
