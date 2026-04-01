'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { QuotationsView } from '@/components/features/quotations/QuotationsView';

export default function QuotationsPage() {
  const { activeCompany } = useAppStore();

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;

  return <QuotationsView company={activeCompany} />;
}
