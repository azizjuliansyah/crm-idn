'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { EmailSettingsView } from '@/components/features/settings/EmailSettingsView';

export default function EmailSettingsPage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <EmailSettingsView company={company} />;
}
