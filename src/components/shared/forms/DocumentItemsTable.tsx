'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Product, ProductCategory, ProductUnit } from '@/lib/types';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { Button, Input, Table, TableHeader, TableBody, TableRow, TableCell, ComboBox } from '@/components/ui';
import { ProductFormModal } from '@/components/features/products/components/ProductFormModal';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { useAppStore } from '@/lib/store/useAppStore';

export interface DocumentItemRow {
  id?: number;
  productId: string;
  description: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
}

interface Props {
  company: Company;
  items: DocumentItemRow[];
  onChange: (items: DocumentItemRow[]) => void;
  initialSelectedProducts?: Product[];
  categories: ProductCategory[];
  units: ProductUnit[];
}

export const DocumentItemsTable: React.FC<Props> = ({ 
  company, items, onChange, initialSelectedProducts = [], categories, units 
}) => {
  const { showToast } = useAppStore();
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>(initialSelectedProducts);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Infinite scroll for products
  const fetchProductsPaginated = useCallback(async ({ from, to }: { from: number, to: number }) => {
    if (!company?.id) return { data: [], error: null, count: 0 };
    let query = supabase.from('products').select('*, product_units(*)', { count: 'exact' }).eq('company_id', company.id);
    if (productSearch) query = query.ilike('name', `%${productSearch}%`);
    query = query.order('name', { ascending: true });
    const { data, error, count } = await query.range(from, to);
    return { data: data || [], error, count };
  }, [company?.id, productSearch]);

  const {
    data: scrolledProducts,
    isLoadingMore: isLoadingMoreProducts,
    hasMore: hasMoreProducts,
    loadMore: loadMoreProducts,
    refresh: refreshProducts
  } = useInfiniteScroll<Product>(fetchProductsPaginated, {
    pageSize: 20,
    dependencies: [company?.id, productSearch]
  });

  const products = useMemo(() => {
    const list = [...scrolledProducts];
    selectedProducts.forEach(sp => {
      if (!list.find(p => p.id === sp.id)) {
        list.unshift(sp);
      }
    });
    return list;
  }, [scrolledProducts, selectedProducts]);

  const formatIDRVal = (num: number = 0) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  const handleSelectProduct = (rowIdx: number, prod: Product | null) => {
    const newItems = [...items];
    const item = { ...newItems[rowIdx] };
    if (prod) {
      item.productId = prod.id.toString();
      item.description = prod.description || '';
      item.price = prod.price;
      item.unit = prod.product_units?.name || 'pcs';
      
      setSelectedProducts(prev => {
        if (!prev.find(p => p.id === prod.id)) return [...prev, prod];
        return prev;
      });
    } else {
      item.productId = ''; item.description = ''; item.price = 0; item.unit = 'pcs';
    }
    item.total = item.qty * item.price;
    newItems[rowIdx] = item;
    onChange(newItems);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length === 1) { 
        onChange([{ productId: '', description: '', qty: 1, unit: 'pcs', price: 0, total: 0 }]); 
        return; 
    }
    onChange(items.filter((_, i) => i !== idx));
  };

  const handleAddItem = () => onChange([...items, { productId: '', description: '', qty: 1, unit: 'pcs', price: 0, total: 0 }]);

  const handleCreatedProduct = async (newProd: Product) => {
    await refreshProducts();
    // Ensure we have the full product with unit details for the selection
    const { data: freshSelect } = await supabase.from('products').select('*, product_units(*)').eq('id', newProd.id).single();
    if (freshSelect) {
      setSelectedProducts(prev => [...prev, freshSelect]);
      // Small delay to ensure the products list is updated before we try to find it in the ComboBox
      // Though refreshProducts is awaited, the unshift in products useMemo depends on selectedProducts update
    }
    setIsProductModalOpen(false);
  };

  return (
    <>
      <div className="overflow-visible">
        <Table className="overflow-visible">
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="px-4 py-3 text-[10px] w-1/4">Produk</TableCell>
              <TableCell isHeader className="px-4 py-3 text-[10px]">Deskripsi</TableCell>
              <TableCell isHeader className="px-4 text-center w-20 py-3 text-[10px]">Qty</TableCell>
              <TableCell isHeader className="px-4 text-center w-24 py-3 text-[10px]">Satuan</TableCell>
              <TableCell isHeader className="px-4 text-right w-32 py-3 text-[10px]">Harga</TableCell>
              <TableCell isHeader className="px-4 text-right w-36 py-3 text-[10px]">Jumlah</TableCell>
              <TableCell isHeader className="text-center w-10">{''}</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="px-4 py-3">
                  <ComboBox
                    placeholder="Pilih Produk"
                    value={item.productId}
                    onChange={(val: string | number) => handleSelectProduct(idx, products.find(p => p.id.toString() === val.toString()) || null)}
                    options={products.map(p => ({
                      value: p.id.toString(),
                      label: p.name,
                      sublabel: formatIDRVal(p.price)
                    }))}
                    onAddNew={() => setIsProductModalOpen(true)}
                    addNewLabel="Daftar Produk Baru"
                    onLoadMore={loadMoreProducts}
                    hasMore={hasMoreProducts}
                    isLoadingMore={isLoadingMoreProducts}
                    onSearchChange={setProductSearch}
                  />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => { const n = [...items]; n[idx].description = e.target.value; onChange(n); }}
                    className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-md outline-none focus:border-blue-500 transition-all font-medium"
                    placeholder="Detail spesifikasi..."
                  />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <input
                    type="number"
                    value={item.qty}
                    onChange={e => { const n = [...items]; n[idx].qty = Number(e.target.value); n[idx].total = n[idx].qty * n[idx].price; onChange(n); }}
                    className="w-full text-xs px-2 py-2 text-center font-bold bg-white border border-gray-200 rounded-md outline-none focus:border-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </TableCell>
                <TableCell className="px-4 py-3 text-center">
                  <div className="w-full px-2 py-2 bg-gray-50 border border-gray-100 rounded-[4px] text-[10px] text-center text-gray-400 font-bold uppercase ">
                    {item.unit}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <input
                    type="number"
                    value={item.price}
                    onChange={e => { const n = [...items]; n[idx].price = Number(e.target.value); n[idx].total = n[idx].qty * n[idx].price; onChange(n); }}
                    className="w-full text-xs px-3 py-2 text-right font-bold bg-white border border-gray-200 rounded-md outline-none focus:border-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </TableCell>
                <TableCell className="px-4 py-3 text-right font-bold text-gray-700 text-sm whitespace-nowrap">
                  {formatIDRVal(item.total)}
                </TableCell>
                <TableCell className="text-center px-2 py-3">
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(idx)} className="!p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50">
                    <Trash2 size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <Button onClick={handleAddItem} variant="ghost" size="sm" leftIcon={<Plus size={14} />} className="!text-[#4F46E5] hover:bg-indigo-50 font-bold uppercase text-[10px]">
          Tambah Baris
        </Button>
      </div>

      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={null}
        companyId={company.id}
        categories={categories}
        units={units}
        onSuccess={handleCreatedProduct}
      />
    </>
  );
};
