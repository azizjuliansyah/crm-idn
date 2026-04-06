'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { InvoiceRequestsView } from '@/components/features/invoices/InvoiceRequestsView';

export default function InvoiceRequestsPage() {
  const { activeCompany: company } = useAppStore();

  if (!company) return null;

  return <InvoiceRequestsView company={company} />;
}
