'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { SopListView } from '@/components/features/sop/SopListView';

export default function SopPage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <SopListView company={company} />;
}
