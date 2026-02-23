'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { SopFormView } from '@/components/features/sop/SopFormView';

import { useParams } from 'next/navigation';

export default function EditSopPage() {
  const params = useParams();
  const { activeCompany: company } = useDashboard();
  const id = params?.id ? parseInt(params.id as string) : NaN;

  if (!company || isNaN(id)) return null;

  return <SopFormView company={company} sopId={id} />;
}
