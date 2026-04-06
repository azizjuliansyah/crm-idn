'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { TaxSettingsView } from '@/components/features/settings/TaxSettingsView';

export default function TaxSettingsPage() {
  const { activeCompany } = useAppStore();

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;

  return <TaxSettingsView company={activeCompany} />;
}
