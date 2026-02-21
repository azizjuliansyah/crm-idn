'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { SupportPipelineSettingsView } from '@/components/SupportPipelineSettingsView';

export default function SupportPipelinesPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <SupportPipelineSettingsView company={company} />;
}
