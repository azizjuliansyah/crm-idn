'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { KnowledgeBaseView } from '@/components/KnowledgeBaseView';

export default function KnowledgeBasePage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <KnowledgeBaseView company={company} />;
}
