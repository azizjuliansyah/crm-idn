'use client';

import React from 'react';
import { useDashboard } from '../../DashboardContext';
import { ProductCategoriesView } from '@/components/ProductCategoriesView';

export default function ProductCategoriesPage() {
  const { activeCompany } = useDashboard();
  return <ProductCategoriesView company={activeCompany} />;
}
