'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { LeadsView } from '@/components/features/leads/LeadsView';

export default function LeadsPage() {
  const { activeCompany, user } = useAppStore();
  if (!user) return null;
  return <LeadsView activeCompany={activeCompany} activeView="leads" user={user} />;
}
