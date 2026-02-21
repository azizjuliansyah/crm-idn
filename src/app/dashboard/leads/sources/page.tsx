'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { LeadSourcesSettingsView } from '@/components/leads/LeadSourcesSettingsView';

export default function LeadSourcesPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <LeadSourcesSettingsView company={company} />;
}
