'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { InvoiceRequestsView } from '@/components/InvoiceRequestsView';

export default function InvoiceRequestsPage() {
  const { activeCompany: company } = useDashboard();

  if (!company) return null;

  return <InvoiceRequestsView company={company} />;
}
