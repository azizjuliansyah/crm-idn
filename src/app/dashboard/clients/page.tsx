'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ClientsView } from '@/components/features/clients/ClientsView';

export default function ClientsPage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <ClientsView company={company} />;
}
