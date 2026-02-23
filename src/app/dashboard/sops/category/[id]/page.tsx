'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { SopListView } from '@/components/features/sop/SopListView';

export default function SopCategoryPage() {
  const params = useParams();
  const id = params?.id;
  const { activeCompany: company } = useDashboard();

  if (!company || !id) return null;

  return <SopListView company={company} categoryId={parseInt(id as string)} />;
}
