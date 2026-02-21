'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { EmailSettingsView } from '@/components/EmailSettingsView';

export default function EmailSettingsPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <EmailSettingsView company={company} />;
}
