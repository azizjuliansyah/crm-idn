'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { SopFormView } from '@/components/SopFormView';

export default function CreateSopPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <SopFormView company={company} />;
}
