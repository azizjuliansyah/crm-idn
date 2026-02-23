'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { ProformasView } from '@/components/features/proformas/ProformasView';

export default function ProformasPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <ProformasView company={company} />;
}
