'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { PdfTemplatesSettingsView } from '@/components/features/settings/PdfTemplatesSettingsView';

export default function PdfTemplatesPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <PdfTemplatesSettingsView company={company} />;
}
