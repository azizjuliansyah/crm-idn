'use client';

import React from 'react';
import { useDashboard } from '../../../DashboardContext';
import { SalesAutonumberView } from '@/components/SalesAutonumberView';

export default function SalesAutonumberPage() {
  const { activeCompany } = useDashboard();

  if (!activeCompany) return <div className="p-8 text-center text-gray-500">Loading Company Data...</div>;

  return <SalesAutonumberView company={activeCompany} />;
}
