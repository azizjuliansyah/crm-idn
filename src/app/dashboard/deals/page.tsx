'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { DealsView } from '@/components/features/deals/DealsView';

export default function DealsPage() {
  const { activeCompany, user } = useAppStore();
  if (!user) return null;
  return <DealsView activeCompany={activeCompany} activeView="deals" user={user} />;
}
