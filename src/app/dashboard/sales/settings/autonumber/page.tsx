'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { SalesAutonumberView } from '@/components/features/settings/SalesAutonumberView';

export default function SalesAutonumberPage() {
  const { activeCompany } = useAppStore();

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;

  return <SalesAutonumberView company={activeCompany} />;
}
