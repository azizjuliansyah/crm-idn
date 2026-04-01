'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { SopCategorySettingsView } from '@/components/features/sop/SopCategorySettingsView';

export default function SopCategoriesPage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <SopCategorySettingsView company={company} />;
}
