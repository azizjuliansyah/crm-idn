
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
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-2xl  text-gray-900 tracking-tight">Pengaturan Leads</h1>
          <p className="text-sm text-gray-500 font-medium">Konfigurasi sumber dan tahapan leads untuk workspace ini.</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('stages')}
          className={`px-5 py-2.5 rounded-lg text-xs  uppercase tracking-tight flex items-center gap-2 transition-all ${activeTab === 'stages'
              ? 'bg-white text-blue-600 shadow-md transform scale-100'
              : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          <GripVertical size={14} /> Tahapan Pipeline
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-5 py-2.5 rounded-lg text-xs  uppercase tracking-tight flex items-center gap-2 transition-all ${activeTab === 'sources'
              ? 'bg-white text-blue-600 shadow-md transform scale-100'
              : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          <Globe size={14} /> Sumber Leads
        </button>
      </div>

      <div>
        {activeTab === 'stages' ? (
          <LeadStagesSettingsView company={activeCompany} />
        ) : (
          <LeadSourcesSettingsView company={activeCompany} />
        )}
      </div>
    </div>
  );
}
