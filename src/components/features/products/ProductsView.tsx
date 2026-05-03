'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Button, Subtext, Toast, ToastType
} from '@/components/ui';
import { Company, Product, ProductCategory, ProductUnit } from '@/lib/types';
import {
  Plus, Package, Loader2
} from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { useSearchParams } from 'next/navigation';
import { useProductsQuery, useProductMetadata, useProductMutations } from '@/lib/hooks/useProductsQuery';
import { useProductFilters } from '@/lib/hooks/useProductFilters';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { BulkActionGroup } from '@/components/shared/filters/BulkActionGroup';
import { ProductFormModal } from './components/ProductFormModal';
import { ProductsTableView } from './ProductsTableView';
import { ProductFilterBar } from './ProductFilterBar';

interface Props {
  company: Company;
  initialProducts?: { data: Product[], totalCount: number };
  metadata?: any;
}

export const ProductsView: React.FC<Props> = ({ 
  company,
  initialProducts,
  metadata
}) => {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = useProductFilters();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ 
    isOpen: false, 
    id: null, 
    name: '' 
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const {
    data: productsData,
    isLoading: productsLoading,
    isPlaceholderData: isFetchingNewPage,
  } = useProductsQuery({
    companyId: String(company.id),
    searchTerm: filters.searchTerm,
    filterCategoryId: filters.filterCategoryId,
    sortConfig: filters.sortConfig,
    page,
    pageSize,
  }, initialProducts);

  const { categories: metadataCategories, units: metadataUnits } = useProductMetadata(company.id, metadata);
  const categories = metadataCategories.data || [];
  const units = metadataUnits.data || [];
  const loadingMetadata = metadataCategories.isLoading || metadataUnits.isLoading;

  const { deleteProduct, bulkDeleteProducts } = useProductMutations();

  const products = productsData?.data || [];
  const totalCount = productsData?.totalCount || 0;

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      setToast({ isOpen: true, message: 'Data Berhasil Disimpan', type: 'success' });
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [filters.searchTerm, filters.filterCategoryId]);

  const handleOpenAdd = () => {
    setSelectedProduct(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsFormModalOpen(true);
  };

  const handleExecuteDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await deleteProduct.mutateAsync({ id: confirmDelete.id } as any);
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      setToast({ isOpen: true, message: 'Produk berhasil dihapus', type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    }
  };

  const handleToggleSelect = (id: string | number) => {
    setSelectedIds(prev => prev.includes(id as number) ? prev.filter(i => i !== id) : [...prev, id as number]);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === products.length) setSelectedIds([]);
    else setSelectedIds(products.map(p => p.id));
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteProducts.mutateAsync(selectedIds);
      setToast({ isOpen: true, message: `${selectedIds.length} produk berhasil dihapus`, type: 'success' });
      setSelectedIds([]);
      setIsConfirmBulkDeleteOpen(false);
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    }
  };

  if (loadingMetadata || (productsLoading && products.length === 0)) return (
    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border-2 border-gray-300 shadow-none min-h-[400px]">
      <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
      <Subtext className="text-[10px] uppercase text-gray-400">Sinkronisasi Katalog Produk...</Subtext>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <StandardFilterBar
        title="Katalog Produk"
        subtitle="Kelola daftar produk dan jasa untuk penawaran."
        searchTerm={filters.searchTerm}
        onSearchChange={filters.setSearchTerm}
        searchPlaceholder="Cari nama produk..."
        primaryAction={{
          label: "Produk Baru",
          onClick: handleOpenAdd,
          icon: <Plus size={14} strokeWidth={3} />
        }}
        bulkActions={
          <BulkActionGroup
            selectedCount={selectedIds.length}
            onDelete={() => setIsConfirmBulkDeleteOpen(true)}
          />
        }
      >
        <ProductFilterBar
          filterCategoryId={filters.filterCategoryId}
          setFilterCategoryId={filters.setFilterCategoryId}
          categories={categories}
        />
      </StandardFilterBar>

      <div className="h-[75vh]">
        <ProductsTableView 
          data={products}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
           onToggleSelectAll={handleToggleSelectAll}
          onEdit={handleOpenEdit}
          onDelete={(id: number, name: string) => setConfirmDelete({ isOpen: true, id, name })}
          sortConfig={filters.sortConfig}
          onSort={filters.handleSort as (key: string) => void}
          
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
          onPageSizeChange={(size: number) => {
            setPageSize(size);
            setPage(1);
          }}
          isLoading={productsLoading || isFetchingNewPage}
        />
      </div>

      <ProductFormModal 
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        product={selectedProduct}
        companyId={company.id}
        categories={categories}
        units={units}
        onSuccess={(product) => {
          setIsFormModalOpen(false);
          setToast({ isOpen: true, message: `Data produk ${product.name} berhasil disimpan`, type: 'success' });
        }}
      />

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={handleExecuteDelete}
        title="Hapus Produk"
        itemName={confirmDelete.name}
        description="Apakah Anda yakin ingin menghapus produk ini dari katalog?"
        isProcessing={deleteProduct.status === 'pending'}
      />

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkDeleteOpen}
        onClose={() => setIsConfirmBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        title="Hapus Produk Masal"
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} produk yang dipilih secara permanen?`}
        isProcessing={bulkDeleteProducts.status === 'pending'}
      />

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
