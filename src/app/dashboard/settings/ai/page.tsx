'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { AiSettingsView } from '@/components/features/ai/AiSettingsView';

export default function AiSettingsPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <AiSettingsView company={company} />;
}
