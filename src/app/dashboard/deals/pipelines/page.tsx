'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { DealsPipelineSettingsView } from '@/components/DealsPipelineSettingsView';

export default function DealsPipelineSettingsPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <DealsPipelineSettingsView company={company} />;
}
