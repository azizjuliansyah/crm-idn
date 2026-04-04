'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Loader2, FileCheck, FileText, FilePlus, Clock, FileDown, Edit2, Trash2 } from 'lucide-react';

import { 
  H2, Subtext, Modal, Badge, Label
} from '@/components/ui';

import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { ConfirmBulkStatusModal } from '@/components/shared/modals/ConfirmBulkStatusModal';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { BulkActionGroup } from '@/components/shared/filters/BulkActionGroup';
import { Button } from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Company, Quotation, SalesRequestCategory } from '@/lib/types';
import { useQuotationFilters } from '@/lib/hooks/useQuotationFilters';
import { downloadQuotationPDF } from '@/lib/services/pdfService';
import { useAppStore } from '@/lib/store/useAppStore';
import { useQuotationsQuery, useQuotationMetadata, useQuotationMutations } from '@/lib/hooks/useQuotationsQuery';
import { QuotationFilterBar } from './QuotationFilterBar';
import { formatIDR } from '@/lib/utils/formatters';
import { exportToExcel, ExcelColumn } from '@/lib/utils/excelExport';

interface Props {
  company: Company;
}

export const QuotationsView: React.FC<Props> = ({ company }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useAppStore();
  
  // Data State
  const [isProcessing, setIsProcessing] = useState(false);
  
  // UI State
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; number: string }>({ isOpen: false, id: null, number: '' });
  const [requestModal, setRequestModal] = useState<{ isOpen: boolean; quotationId: number | null; quotationStatus: string }>({ isOpen: false, quotationId: null, quotationStatus: '' });

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [isConfirmBulkStatusOpen, setIsConfirmBulkStatusOpen] = useState(false);

  const { bulkDeleteQuotations, bulkUpdateQuotationsStatus } = useQuotationMutations();

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === quotations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(quotations.map(q => q.id));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteQuotations.mutateAsync(selectedIds);
      showToast(`${selectedIds.length} penawaran berhasil dihapus.`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkDeleteOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkUpdateStatus = async (status: string) => {
    try {
      await bulkUpdateQuotationsStatus.mutateAsync({ ids: selectedIds, status });
      showToast(`${selectedIds.length} penawaran berhasil diperbarui.`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkStatusOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleExportQuotations = () => {
    const dataToExport = selectedIds.length > 0 
      ? quotations.filter(q => selectedIds.includes(q.id)) 
      : quotations;

    if (dataToExport.length === 0) {
      showToast('Tidak ada data untuk diekspor', 'info');
      return;
    }

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Tanggal', key: 'date_label', width: 15 },
      { header: 'Nomor Penawaran', key: 'number', width: 25 },
      { header: 'Pelanggan', key: 'client_name', width: 25 },
      { header: 'Perusahaan', key: 'company_name', width: 25 },
      { header: 'Total Nilai', key: 'formatted_total', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    const formattedData = dataToExport.map(q => ({
      ...q,
      date_label: new Date(q.date).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
      }),
      client_name: q.client?.name || '-',
      company_name: q.client?.client_company?.name || 'Personal',
      formatted_total: formatIDR(q.total),
    }));

    exportToExcel(formattedData, columns, 'CRM_Quotations_Report');
    showToast('Data Penawaran berhasil diekspor ke Excel', 'success');
  };
  // Filters State
  const filters = useQuotationFilters([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Data Fetching
  const {
    data: quotationsData,
    isLoading: quotationsLoading,
  } = useQuotationsQuery({
    companyId: String(company.id),
    searchTerm: filters.searchTerm,
    filterStatus: filters.filterStatus,
    filterClientId: filters.filterClientId,
    sortConfig: filters.sortConfig,
    page,
    pageSize,
  });

  const quotations = quotationsData?.data || [];
  const totalCount = quotationsData?.totalCount || 0;

  // Metadata
  const { clients: clientsQuery } = useQuotationMetadata(String(company.id));
  const clients = clientsQuery.data || [];

  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [requestCategories, setRequestCategories] = useState<SalesRequestCategory[]>([]);

  // Metadata Fetching (Categories)
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

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.searchTerm, filters.filterStatus, filters.filterClientId]);

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
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const columns: ColumnConfig<Quotation>[] = useMemo(() => [
    {
      header: 'ID',
      key: 'id',
      sortable: true,
      className: 'w-20 font-mono text-[11px] text-gray-400 py-5 px-6',
      render: (q: Quotation) => `#${String(q.id).padStart(4, '0')}`
    },
    {
      header: 'Tanggal',
      key: 'date',
      sortable: true,
      render: (q: Quotation) => (
        <div className="flex items-center gap-2 text-gray-400">
          <Clock size={12} strokeWidth={2.5} />
          <Label className="text-[11px] ">{new Date(q.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Label>
        </div>
      )
    },
    {
      header: 'Nomor',
      key: 'number',
      sortable: true,
      render: (q: Quotation) => (
        <Badge variant="secondary" className="gap-1.5 rounded-lg border-indigo-200 bg-indigo-50">
          <FileCheck size={10} strokeWidth={2.5} className="text-indigo-600" />
          <Label className="!text-indigo-600">{q.number}</Label>
        </Badge>
      )
    },
    {
      header: 'Pelanggan',
      key: 'client_id',
      sortable: true,
      render: (q: Quotation) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center  text-[10px] uppercase shadow-sm border border-indigo-100">{q.client?.name.charAt(0)}</div>
          <div>
            <Subtext className="text-xs text-gray-900 ">{q.client?.name}</Subtext>
            <Subtext className="text-[10px] !text-gray-400 mt-1 uppercase  italic">{q.client?.client_company?.name || 'Personal'}</Subtext>
          </div>
        </div>
      )
    },
    {
      header: 'Total',
      key: 'total',
      sortable: true,
      headerClassName: 'text-right',
      className: 'text-right',
      render: (q: Quotation) => (
        <Label className="font-bold text-indigo-600 text-xs py-5 px-6">{formatIDR(q.total)}</Label>
      )
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      headerClassName: 'text-center',
      className: 'text-center',
      render: (q: Quotation) => (
        <Badge variant={
          q.status === 'Draft' ? 'neutral' :
            q.status === 'Sent' ? 'indigo' :
              q.status === 'Accepted' ? 'emerald' :
                'rose'
        }>
          {q.status}
        </Badge>
      )
    },
    {
      header: 'Aksi',
      key: 'actions',
      headerClassName: 'text-center',
      className: 'text-center',
      render: (q: Quotation) => (
        <div className="flex items-center justify-center gap-2">
          <ActionButton
            icon={FileDown}
            variant="emerald"
            onClick={() => downloadQuotationPDF(q, company)}
            title="Unduh PDF"
          />
          <ActionButton
            icon={FilePlus}
            variant="indigo"
            onClick={() => setRequestModal({ isOpen: true, quotationId: q.id, quotationStatus: q.status })}
            title="Buat Request Tambahan"
          />
          <ActionButton
            icon={Edit2}
            variant="blue"
            href={`/dashboard/sales/quotations/${q.id}`}
            title="Edit"
          />
          <ActionButton
            icon={Trash2}
            variant="rose"
            onClick={() => setConfirmDelete({ isOpen: true, id: q.id, number: q.number })}
            title="Hapus"
          />
        </div>
      )
    }
  ], [company, router]);

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
      <StandardFilterBar
        title="Daftar Penawaran"
        subtitle="Kelola dan pantau seluruh penawaran pelanggan."
        searchTerm={filters.searchTerm}
        onSearchChange={filters.setSearchTerm}
        onExport={handleExportQuotations}
        searchPlaceholder="Cari nomor, client..."
        primaryAction={{
          label: "Buat Penawaran",
          onClick: () => router.push('/dashboard/sales/quotations/create'),
          icon: <Plus size={14} strokeWidth={3} />
        }}
        bulkActions={
          <BulkActionGroup
            selectedCount={selectedIds.length}
            onUpdateStatus={() => setIsConfirmBulkStatusOpen(true)}
            onDelete={() => setIsConfirmBulkDeleteOpen(true)}
          />
        }
      >
        <QuotationFilterBar 
          filterStatus={filters.filterStatus}
          setFilterStatus={filters.setFilterStatus}
          filterClientId={filters.filterClientId}
          setFilterClientId={filters.setFilterClientId}
          clients={clients}
        />
      </StandardFilterBar>

      <div className="h-[75vh]">
        <BaseDataTable
          data={quotations}
          selectedIds={selectedIds}
          onToggleSelect={(id) => handleToggleSelect(Number(id))}
          onToggleSelectAll={handleToggleSelectAll}
          columns={columns}
          sortConfig={filters.sortConfig}
          onSort={filters.handleSort as (key: string) => void}
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          isLoading={quotationsLoading}
          emptyMessage="Belum ada penawaran tercatat"
          emptyIcon={<FileText size={48} />}
        />
      </div>

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, number: '' })}
        onConfirm={executeDelete}
        title="Hapus Penawaran"
        itemName={confirmDelete.number}
        description="Tindakan ini permanen. Seluruh data item rincian pajak pada penawaran ini akan hilang selamanya."
        isProcessing={isProcessing}
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

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkDeleteOpen}
        onClose={() => setIsConfirmBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        title="Hapus Penawaran Masal"
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} penawaran yang dipilih? Data rincian item pada penawaran tersebut juga akan hilang.`}
        isProcessing={bulkDeleteQuotations.status === 'pending'}
      />

      <ConfirmBulkStatusModal
        isOpen={isConfirmBulkStatusOpen}
        onClose={() => setIsConfirmBulkStatusOpen(false)}
        onConfirm={(statusId) => handleBulkUpdateStatus(String(statusId))}
        count={selectedIds.length}
        options={[
          { id: 'Draft', name: 'Draft' },
          { id: 'Sent', name: 'Sent' },
          { id: 'Accepted', name: 'Accepted' },
          { id: 'Rejected', name: 'Rejected' },
        ]}
        title="Ubah Status Penawaran"
        label="Pilih Status Baru"
        isProcessing={bulkUpdateQuotationsStatus.status === 'pending'}
      />
    </div>
  );
};
