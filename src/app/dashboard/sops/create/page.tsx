'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { SopFormView } from '@/components/features/sop/SopFormView';

export default function CreateSopPage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <SopFormView company={company} />;
}
