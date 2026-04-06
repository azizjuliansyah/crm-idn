'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { DealsPipelineSettingsView } from '@/components/features/deals/DealsPipelineSettingsView';

export default function DealsPipelineSettingsPage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <DealsPipelineSettingsView company={company} />;
}
