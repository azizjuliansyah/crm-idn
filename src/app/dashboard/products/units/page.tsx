'use client';

import React from 'react';
import { useDashboard } from '../../DashboardContext';
import { ProductUnitsView } from '@/components/ProductUnitsView';

export default function ProductUnitsPage() {
  const { activeCompany } = useDashboard();
  return <ProductUnitsView company={activeCompany} />;
}
