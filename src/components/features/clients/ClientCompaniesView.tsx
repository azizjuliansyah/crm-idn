'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Button, Table, TableHeader, TableBody, TableRow, TableCell, Subtext, Label, SearchInput, Checkbox, H2, Toast, ToastType, TableContainer, ComboBox } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import {
  Plus, Edit2, Trash2, Factory,
  MapPin, Mail, Phone, ChevronUp, ChevronDown, ArrowUpDown, Loader2 as LoaderIcon
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { ClientCompanyFormModal } from './components/ClientCompanyFormModal';
import { Pagination } from '@/components/shared/tables/Pagination';
import { useClientCompaniesQuery } from '@/lib/hooks/useClientCompaniesQuery';
import { useClientCompanyFilters } from '@/lib/hooks/useClientCompanyFilters';
import { ClientCompaniesTableView } from './ClientCompaniesTableView';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { exportToExcel, ExcelColumn } from '@/lib/utils/excelExport';
import { useAppStore } from '@/lib/store/useAppStore';

interface Props {
  company: Company;
  initialCompanies?: { data: any[], totalCount: number };
  metadata?: any;
}

// No local types needed, using from hooks

export const ClientCompaniesView: React.FC<Props> = ({ 
  company,
  initialCompanies,
  metadata
}) => {
  const searchParams = useSearchParams();
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [categories, setCategories] = useState<ClientCompanyCategory[]>(metadata?.categories || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Custom Modal States
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ isOpen: false, id: null, name: '' });
  const [isConfirmBulkOpen, setIsConfirmBulkOpen] = useState(false);
  
  const { 
    searchTerm, setSearchTerm, 
    categoryFilter, setCategoryFilter,
    sortConfig, handleSort 
  } = useClientCompanyFilters();
  const { showToast } = useAppStore();
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const [form, setForm] = useState<Partial<ClientCompany>>({
    name: '', category_id: null, address: '', email: '', whatsapp: ''
  });

  const {
    data: queryData,
    isLoading: loading,
    refetch: refetchItems
  } = useClientCompaniesQuery({
    companyId: String(company.id),
    searchTerm,
    categoryFilter,
    sortConfig,
    page,
    pageSize,
  }, initialCompanies);

  const items = queryData?.data || [];

  const fetchMetadata = useCallback(async () => {
    if (!company?.id) return;
    try {
      const { data: catsRes } = await supabase.from('client_company_categories').select('*').eq('company_id', company.id).order('name');
      if (catsRes) setCategories(catsRes);
    } catch (err) {
      console.error("Fetch Metadata Error:", err);
    }
  }, [company?.id]);

  useEffect(() => {
    if (!metadata) {
      fetchMetadata();
    }
  }, [fetchMetadata, metadata]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      setToast({ isOpen: true, message: 'Data Berhasil Simpan', type: 'success' });
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [searchParams]);

  // Reset page to 1 on search change
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) setSelectedIds([]);
    else setSelectedIds(items.map(i => i.id));
  };

  const handleExportCompanies = () => {
    const dataToExport = selectedIds.length > 0 
      ? items.filter(i => selectedIds.includes(i.id)) 
      : items;

    if (dataToExport.length === 0) {
      showToast('Tidak ada data untuk diekspor', 'info');
      return;
    }

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nama Perusahaan', key: 'name', width: 30 },
      { header: 'Kategori', key: 'category_label', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'WhatsApp', key: 'whatsapp', width: 20 },
      { header: 'Alamat', key: 'address', width: 40 },
      { header: 'Tanggal Dibuat', key: 'created_at_label', width: 20 },
    ];

    const formattedData = dataToExport.map(i => ({
      ...i,
      category_label: categories.find(c => c.id === i.category_id)?.name || '-',
      created_at_label: new Date(i.created_at).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
      }),
    }));

    exportToExcel(formattedData, columns, 'CRM_Client_Companies_Report');
    showToast('Data Perusahaan berhasil diekspor ke Excel', 'success');
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('client_companies').delete().in('id', selectedIds);
      if (error) throw error;
      refetchItems();
      setIsConfirmBulkOpen(false);
      setSelectedIds([]);
      setToast({ isOpen: true, message: `Berhasil menghapus ${selectedIds.length} data perusahaan.`, type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: "Beberapa data tidak dapat dihapus karena masih terhubung dengan client lain.", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAddCategory = async (newCatName: string) => {
    try {
      const { data, error } = await supabase
        .from('client_company_categories')
        .insert({ name: newCatName, company_id: company.id })
        .select()
        .single();
      if (error) throw error;

      fetchMetadata();
      return data;
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
      return null;
    }
  };

  const handleOpenAdd = () => {
    setForm({ name: '', category_id: null, address: '', email: '', whatsapp: '' });
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Partial<ClientCompany>) => {
    if (!formData.name || !formData.category_id || !formData.address) {
      setToast({ isOpen: true, message: "Harap isi field wajib (Nama, Kategori, Alamat).", type: 'error' });
      return;
    }
    setIsProcessing(true);
    try {
      const payload = {
        name: formData.name,
        category_id: formData.category_id,
        address: formData.address,
        email: formData.email,
        whatsapp: formData.whatsapp,
        company_id: company.id
      };
      if (formData.id) await supabase.from('client_companies').update(payload).eq('id', formData.id);
      else await supabase.from('client_companies').insert(payload);
      setIsModalOpen(false);
      refetchItems();
      setToast({ isOpen: true, message: `Data perusahaan ${formData.name} berhasil disimpan.`, type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('client_companies').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      refetchItems();
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      setToast({ isOpen: true, message: `Data perusahaan ${confirmDelete.name} telah dihapus.`, type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: "Data tidak dapat dihapus karena masih memiliki Client yang terhubung. Hapus client terlebih dahulu.", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading && items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 min-h-[400px]">
      <LoaderIcon className="animate-spin text-indigo-600 mb-4" size={32} />
      <Subtext className="text-[10px] lowercase uppercase text-gray-400">Sinkronisasi Data Perusahaan...</Subtext>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <StandardFilterBar
        title="Perusahaan Client"
        subtitle="Kelola daftar nama perusahaan dan instansi."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onExport={handleExportCompanies}
        searchPlaceholder="Cari perusahaan..."
        primaryAction={{
          label: "Perusahaan Baru",
          onClick: handleOpenAdd,
          icon: <Plus size={14} strokeWidth={3} />
        }}
        bulkActions={
          selectedIds.length > 0 && (
            <Button
              onClick={() => setIsConfirmBulkOpen(true)}
              className="px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] uppercase flex items-center gap-2 hover:bg-rose-600 hover:text-white transition-all shadow-sm font-bold"
            >
              <Trash2 size={14} /> Hapus {selectedIds.length} Item
            </Button>
          )
        }
      >
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <ComboBox
            value={categoryFilter}
            onChange={(val: string | number) => { setCategoryFilter(val as string); setPage(1); }}
            options={[
              { value: 'all', label: 'SEMUA KATEGORI' },
              ...categories.map(c => ({ value: c.id.toString(), label: c.name.toUpperCase() }))
            ]}
            className="w-48"
            placeholderSize="text-[10px] font-bold text-gray-900 uppercase"
          />
        </div>
      </StandardFilterBar>

      <ClientCompaniesTableView
        items={items}
        categories={categories}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect as (id: string | number) => void}
        onToggleSelectAll={toggleSelectAll}
        onEdit={(item) => { setForm(item); setIsModalOpen(true); }}
        onDelete={(id, name) => setConfirmDelete({ isOpen: true, id, name })}
        sortConfig={sortConfig}
        onSort={handleSort}
        
        page={page}
        pageSize={pageSize}
        totalCount={queryData?.totalCount || 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        isLoading={loading}
      />

      <ClientCompanyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave as any}
        form={form}
        setForm={setForm}
        isProcessing={isProcessing}
        categories={categories}
        companyId={company.id}
        onQuickAddCategory={handleQuickAddCategory}
      />

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        itemName={confirmDelete.name}
        description="Tindakan ini permanen. Pastikan tidak ada data client yang masih terhubung dengan perusahaan ini sebelum menghapus."
        isProcessing={isProcessing}
      />

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkOpen}
        onClose={() => setIsConfirmBulkOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} perusahaan yang dipilih secara permanen?`}
        isProcessing={isProcessing}
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
