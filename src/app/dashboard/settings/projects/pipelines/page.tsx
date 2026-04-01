'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ProjectPipelinesSettingsView } from '@/components/features/projects/ProjectPipelinesSettingsView';

export default function ProjectPipelinesPage() {
  const { activeCompany } = useAppStore();

  if (!activeCompany) return null;

  return (
    <ProjectPipelinesSettingsView company={activeCompany} />
  );
}
