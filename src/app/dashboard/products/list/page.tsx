'use client';

import React from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { ProductsView } from '@/components/ProductsView';

export default function ProductsPage() {
  const { activeCompany } = useDashboard();
  if (!activeCompany) return null;
  return <ProductsView company={activeCompany} />;
}
