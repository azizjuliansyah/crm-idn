'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { TaskSettingsView } from '@/components/TaskSettingsView';

export default function TaskStagesPage() {
  const { activeCompany } = useDashboard();

  if (!activeCompany) return null;

  return (
    <TaskSettingsView company={activeCompany} />
  );
}
