
'use client';

import React, { useState } from 'react';
import { useDashboard } from '../../DashboardContext';
import { LeadSourcesSettingsView } from '@/components/features/leads/LeadSourcesSettingsView';
import { LeadStagesSettingsView } from '@/components/features/leads/LeadStagesSettingsView';
import { Settings, Globe, GripVertical } from 'lucide-react';

export default function LeadSettingsPage() {
  const { activeCompany } = useDashboard();
  const [activeTab, setActiveTab] = useState<'stages' | 'sources'>('stages');

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 text-gray-400">
        <p>Pilih workspace terlebih dahulu untuk mengakses pengaturan leads.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <LeadStagesSettingsView company={activeCompany} />
    </div>
  );
}
