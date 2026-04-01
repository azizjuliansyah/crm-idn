'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ComplaintsView } from '@/components/features/complaints/ComplaintsView';

export default function ComplaintsPage() {
  const { activeCompany, user } = useAppStore();
  if (!user || !activeCompany) return null;
  return <ComplaintsView activeCompany={activeCompany} activeView="complaints" user={user} />;
}
