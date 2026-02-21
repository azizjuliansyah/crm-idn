'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { ProjectPipelinesSettingsView } from '@/components/ProjectPipelinesSettingsView';

export default function ProjectPipelinesPage() {
  const { activeCompany } = useDashboard();

  if (!activeCompany) return null;

  return (
    <ProjectPipelinesSettingsView company={activeCompany} />
  );
}
