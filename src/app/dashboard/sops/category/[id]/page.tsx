'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { SopListView } from '@/components/features/sop/SopListView';

export default function SopCategoryPage() {
  const params = useParams();
  const id = params?.id;
  const { activeCompany: company } = useAppStore();

  if (!company || !id) return null;

  return <SopListView company={company} categoryId={parseInt(id as string)} />;
}
