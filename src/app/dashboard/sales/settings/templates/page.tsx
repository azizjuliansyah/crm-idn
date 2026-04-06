'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { PdfTemplatesSettingsView } from '@/components/features/settings/PdfTemplatesSettingsView';

export default function PdfTemplatesPage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <PdfTemplatesSettingsView company={company} />;
}
