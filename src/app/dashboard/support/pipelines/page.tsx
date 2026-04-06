'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { SupportPipelineSettingsView } from '@/components/features/support/SupportPipelineSettingsView';

export default function SupportPipelinesPage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <SupportPipelineSettingsView company={company} />;
}
