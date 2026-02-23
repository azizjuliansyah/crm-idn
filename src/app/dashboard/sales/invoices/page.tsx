'use client';

import React from 'react';
import { useDashboard } from '../../DashboardContext';
import { InvoicesView } from '@/components/features/invoices/InvoicesView';

export default function InvoicesPage() {
  const { activeCompany } = useDashboard();

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;

  return <InvoicesView company={activeCompany} />;
}
