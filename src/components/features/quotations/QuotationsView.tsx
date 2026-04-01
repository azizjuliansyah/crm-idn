'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Loader2, FileCheck, FileText, FilePlus } from 'lucide-react';

import { 
  H2, Subtext, Modal
} from '@/components/ui';

import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';

import { supabase } from '@/lib/supabase';
import { Company, Quotation, SalesRequestCategory } from '@/lib/types';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { useQuotationFilters } from '@/lib/hooks/useQuotationFilters';
import { downloadQuotationPDF } from '@/lib/services/pdfService';
import { useAppStore } from '@/lib/store/useAppStore';

import { QuotationFilterBar } from './QuotationFilterBar';
import { QuotationTable } from './QuotationTable';

interface Props {
  company: Company;
}

export const QuotationsView: React.FC<Props> = ({ company }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useAppStore();
  
  // Data State
  const [requestCategories, setRequestCategories] = useState<SalesRequestCategory[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // UI State
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; number: string }>({ isOpen: false, id: null, number: '' });
  const [requestModal, setRequestModal] = useState<{ isOpen: boolean; quotationId: number | null; quotationStatus: string }>({ isOpen: false, quotationId: null, quotationStatus: '' });

  // Custom Hooks for Logic
  const fetchQuotations = useCallback(async ({ from, to }: { from: number, to: number }) => {
    if (!company?.id) return { data: [], error: null, count: 0 };
    
    let query = supabase
      .from('quotations')
      .select('*, client:clients(*, client_company:client_companies(*)), quotation_items(*, products(*))', { count: 'exact' })
      .eq('company_id', company.id);

    if (filters.searchTerm) {
      query = query.or(`number.ilike.%${filters.searchTerm}%,client_name.ilike.%${filters.searchTerm}%`);
    }

    if (filters.filterStatus !== 'all') {
      query = query.eq('status', filters.filterStatus);
    }

    const { data, error, count } = await query
      .order('id', { ascending: false })
      .range(from, to);

    return { data: data || [], error, count };
  }, [company?.id]);

  const {
    data: quotations,
    isLoading: quotationsLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh
  } = useInfiniteScroll<Quotation>(fetchQuotations, {
    pageSize: 20,
    dependencies: [company?.id]
  });

  const filters = useQuotationFilters(quotations);

  // Metadata Fetching
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!company?.id) return;
      setLoadingMetadata(true);
      try {
        const { data } = await supabase
          .from('sales_request_categories')
          .select('*')
          .eq('company_id', company.id)
          .order('sort_order', { ascending: false });

        if (data) setRequestCategories(data);
      } finally {
        setLoadingMetadata(false);
      }
    };
    fetchMetadata();
  }, [company?.id]);

  // Toast Handling from URL
  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      const message = success === 'created' ? 'Penawaran baru berhasil dibuat' : 'Penawaran berhasil diperbarui';
      showToast(message, 'success');
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [searchParams, showToast]);

  // Actions
  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('quotations').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null, number: '' });
      showToast(`Penawaran ${confirmDelete.number} telah dihapus.`, 'success');
      refresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loadingMetadata || (quotationsLoading && quotations.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="animate-spin text-blue-600" />
        <Subtext className="text-[10px] uppercase text-gray-400">Sinkronisasi Penawaran...</Subtext>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl ">Daftar Penawaran</H2>
            <Subtext className="text-[10px] uppercase">Kelola dan pantau seluruh penawaran pelanggan.</Subtext>
          </div>
          <Link
            href="/dashboard/sales/quotations/create"
            onMouseEnter={() => router.prefetch('/dashboard/sales/quotations/create')}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-100"
          >
            <Plus size={14} strokeWidth={3} />
            Buat Penawaran
          </Link>
        </div>

        <QuotationFilterBar 
          searchTerm={filters.searchTerm}
          setSearchTerm={filters.setSearchTerm}
          filterStatus={filters.filterStatus}
          setFilterStatus={filters.setFilterStatus}
        />
      </div>

      {/* Main Table */}
      <QuotationTable 
        quotations={filters.filteredQuotations}
        onSort={filters.handleSort}
        onDownload={(q) => downloadQuotationPDF(q, company)}
        onRequest={(id, status) => setRequestModal({ isOpen: true, quotationId: id, quotationStatus: status })}
        onDelete={(id, num) => setConfirmDelete({ isOpen: true, id, number: num })}
        isLoading={quotationsLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        loadMore={loadMore}
      />

      {/* Modals & Feedback */}
      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, number: '' })}
        onConfirm={executeDelete}
        title="Hapus Penawaran"
        itemName={confirmDelete.number}
        description="Tindakan ini permanen. Seluruh data item rincian pajak pada penawaran ini akan hilang selamanya."
        isProcessing={isProcessing}
        variant="horizontal"
      />

      <Modal
        isOpen={requestModal.isOpen}
        onClose={() => setRequestModal({ isOpen: false, quotationId: null, quotationStatus: '' })}
        title="Buat Request untuk Penawaran Ini"
        size="md"
      >
        <div className="flex flex-col gap-3 py-4">
          <Subtext className="text-sm text-gray-500 mb-2">Silakan pilih jenis request yang ingin Anda ajukan berdasarkan penawaran ini:</Subtext>

          {requestModal.quotationStatus === 'Accepted' && (
            <>
              <Link
                href={`/dashboard/sales/proformas/create?quotationId=${requestModal.quotationId}`}
                onMouseEnter={() => router.prefetch(`/dashboard/sales/proformas/create?quotationId=${requestModal.quotationId}`)}
                className="flex items-center gap-3 w-full !py-4 px-4 text-left border border-amber-200 bg-amber-50/50 hover:bg-amber-50 rounded-lg transition-all text-sm font-medium text-gray-700"
              >
                <FileCheck className="text-amber-500" size={18} />
                Jadikan Proforma
              </Link>
              <Link
                href={`/dashboard/sales/invoice-requests/create?quotationId=${requestModal.quotationId}`}
                onMouseEnter={() => router.prefetch(`/dashboard/sales/invoice-requests/create?quotationId=${requestModal.quotationId}`)}
                className="flex items-center gap-3 w-full !py-4 px-4 text-left border border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-lg transition-all text-sm font-medium text-gray-700"
              >
                <FileText className="text-blue-500" size={18} />
                Request Invoice
              </Link>
            </>
          )}

          {requestCategories.map(cat => (
            <Link
              key={cat.id}
              href={`/dashboard/sales/requests/${cat.id}/create?quotationId=${requestModal.quotationId}`}
              onMouseEnter={() => router.prefetch(`/dashboard/sales/requests/${cat.id}/create?quotationId=${requestModal.quotationId}`)}
              className="flex items-center gap-3 w-full !py-4 px-4 text-left border border-gray-200 rounded-lg transition-all text-sm font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50"
            >
              <FilePlus className="text-gray-400" size={18} />
              {cat.name}
            </Link>
          ))}
        </div>
      </Modal>
    </div>
  );
};
