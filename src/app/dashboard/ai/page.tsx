'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { AiAssistantView } from '@/components/features/ai/AiAssistantView';

export default function AiAssistantPage() {
  const { activeCompany: company, user } = useDashboard();

  if (!company || !user) return null;

  return <AiAssistantView company={company} user={user} />;
}
