'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { LeadSourcesSettingsView } from '@/components/features/leads/LeadSourcesSettingsView';

export default function LeadSourcesPage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <LeadSourcesSettingsView company={company} />;
}
