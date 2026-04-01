'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { AiSettingsView } from '@/components/features/ai/AiSettingsView';

export default function AiSettingsPage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <AiSettingsView company={company} />;
}
