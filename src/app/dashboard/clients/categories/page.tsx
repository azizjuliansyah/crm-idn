'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ClientCompanyCategoriesSettingsView } from '@/components/features/clients/ClientCompanyCategoriesSettingsView';

export default function ClientCompanyCategoriesPage() {
  const { activeCompany } = useAppStore();
  if (!activeCompany) return null;
  return <ClientCompanyCategoriesSettingsView company={activeCompany} />;
}
