'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { ProjectsView } from '@/components/ProjectsView';
import { useParams } from 'next/navigation';

export default function ProjectsPage() {
  const { user, activeCompany, activeCompanyMembers } = useDashboard();
  const params = useParams();
  const pipelineId = params.id ? parseInt(params.id as string) : 0;

  if (!user || !activeCompany) return null;

  return (
    <ProjectsView 
      company={activeCompany} 
      user={user} 
      members={activeCompanyMembers}
      pipelineId={pipelineId}
    />
  );
}
