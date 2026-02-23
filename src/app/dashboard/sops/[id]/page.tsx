'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { SopDetailView } from '@/components/features/sop/SopDetailView';

import { useParams } from 'next/navigation';

export default function SopDetailPage() {
  const params = useParams();
  const { activeCompany: company } = useDashboard();
  const id = params?.id ? parseInt(params.id as string) : NaN;

  if (!company || isNaN(id)) return null;

  return <SopDetailView company={company} sopId={id} />;
}
