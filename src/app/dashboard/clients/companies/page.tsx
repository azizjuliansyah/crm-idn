'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ClientCompaniesView } from '@/components/features/clients/ClientCompaniesView';

export default function ClientCompaniesPage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <ClientCompaniesView company={company} />;
}
