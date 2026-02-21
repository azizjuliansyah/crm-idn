'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { DealsView } from '@/components/DealsView';

import { useParams } from 'next/navigation';

export default function DealPipelinePage() {
  const params = useParams();
  const { user, activeCompany } = useDashboard();
  const pipelineId = params?.id ? parseInt(params.id as string) : NaN;

  if (!user || !activeCompany) return null;
  
  if (isNaN(pipelineId)) {
      return <div>Invalid Pipeline ID</div>;
  }

  // We need to pass the activeView ID likely as 'deals_' + id or just 'deals'
  // But DealsView mainly uses it for... nothing currently? It just accepts it.
  // We'll pass `deals_${id}` to match the sidebar key.
  
  return (
    <DealsView 
      user={user} 
      activeCompany={activeCompany} 
      activeView={`deals_${pipelineId}`}
      pipelineId={pipelineId} 
    />
  );
}
