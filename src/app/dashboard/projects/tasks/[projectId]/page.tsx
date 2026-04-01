'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { TasksView } from '@/components/features/tasks/TasksView';
import { useParams } from 'next/navigation';

export default function ProjectTasksPage() {
  const { user, activeCompany, activeCompanyMembers } = useAppStore();
  const params = useParams();
  const projectId = params.projectId ? parseInt(params.projectId as string) : 0;

  if (!user || !activeCompany) return null;

  return (
    <TasksView 
      company={activeCompany} 
      user={user} 
      members={activeCompanyMembers}
      projectId={projectId}
    />
  );
}
