'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { SopCategorySettingsView } from '@/components/features/sop/SopCategorySettingsView';

export default function SopCategoriesPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <SopCategorySettingsView company={company} />;
}
