'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { AiSettingsView } from '@/components/features/settings/AiSettingsView';

export default function AiSettingsPage() {
  const { activeCompany } = useAppStore();
  
  if (!activeCompany) {
    return <div className="p-8 text-center text-gray-500">Pilih workspace terlebih dahulu untuk mengatur konfigurasi AI.</div>;
  }

  return <AiSettingsView company={activeCompany} />;
}
