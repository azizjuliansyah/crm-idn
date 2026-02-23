'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { ProjectPipelinesSettingsView } from '@/components/features/projects/ProjectPipelinesSettingsView';

export default function ProjectPipelinesPage() {
  const { activeCompany } = useDashboard();

  if (!activeCompany) return null;

  return (
    <ProjectPipelinesSettingsView company={activeCompany} />
  );
}
