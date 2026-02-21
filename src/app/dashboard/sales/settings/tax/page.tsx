'use client';

import React from 'react';
import { useDashboard } from '../../../DashboardContext';
import { TaxSettingsView } from '@/components/TaxSettingsView';

export default function TaxSettingsPage() {
  const { activeCompany } = useDashboard();

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;

  return <TaxSettingsView company={activeCompany} />;
}
