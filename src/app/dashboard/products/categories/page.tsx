'use client';

import React from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ProductCategoriesView } from '@/components/features/products/ProductCategoriesView';

export default function ProductCategoriesPage() {
  const { activeCompany } = useAppStore();
  return <ProductCategoriesView company={activeCompany} />;
}
