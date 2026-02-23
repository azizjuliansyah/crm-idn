'use client';

import React from 'react';
import { useDashboard } from '../../DashboardContext';
import { CompanySettingsView } from '@/components/features/settings/CompanySettingsView';

export default function CompanySettingsPage() {
  const { activeCompany, refreshCompanyData } = useDashboard();
  
  if (!activeCompany) {
    return <div className="p-8 text-center text-gray-500">Pilih workspace terlebih dahulu untuk mengatur profil perusahaan.</div>;
  }

  return <CompanySettingsView company={activeCompany} onCompanyUpdate={refreshCompanyData} />;
}
