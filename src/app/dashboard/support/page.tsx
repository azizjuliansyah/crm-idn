'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { SupportTicketsView } from '@/components/features/support/SupportTicketsView';

export default function SupportPage() {
  const { activeCompany, user } = useAppStore();
  if (!user || !activeCompany) return null;
  return <SupportTicketsView activeCompany={activeCompany} activeView="customer_support" user={user} />;
}
