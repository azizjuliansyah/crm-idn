'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { TaskSettingsView } from '@/components/features/tasks/TaskSettingsView';

export default function TaskStagesPage() {
  const { activeCompany } = useAppStore();

  if (!activeCompany) return null;

  return (
    <TaskSettingsView company={activeCompany} />
  );
}
