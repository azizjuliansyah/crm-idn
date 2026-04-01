'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { InvoicesView } from '@/components/features/invoices/InvoicesView';

export default function InvoicesPage() {
  const { activeCompany } = useAppStore();

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;

  return <InvoicesView company={activeCompany} />;
}
