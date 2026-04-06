'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ClientsView } from '@/components/features/clients/ClientsView';

export default function ClientsPage() {
  const { activeCompany } = useAppStore();
  if (!activeCompany) return null;
  return <ClientsView company={activeCompany} />;
}
