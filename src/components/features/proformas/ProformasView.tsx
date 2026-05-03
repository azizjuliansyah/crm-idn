'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button, H2, Subtext, Label, Modal, Badge, ToastType } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Company, ProformaInvoice, SalesRequestCategory } from '@/lib/types';
import {
  Plus, Edit2, Trash2, Loader2, FileCheck,
  FileDown, FileText, FilePlus,
  Clock, MoreVertical, Eye
} from 'lucide-react';
import { ActionMenu } from '@/components/shared/ActionMenu';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateTemplate6 } from '@/lib/pdf-templates';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { ConfirmBulkStatusModal } from '@/components/shared/modals/ConfirmBulkStatusModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { BulkActionGroup } from '@/components/shared/filters/BulkActionGroup';
import { useProformasQuery, useProformaMutations } from '@/lib/hooks/useProformasQuery';
import { useProformaFilters } from '@/lib/hooks/useProformaFilters';
import { useQuotationMetadata } from '@/lib/hooks/useQuotationsQuery';
import { ProformaFilterBar } from './ProformaFilterBar';
import { exportToExcel, ExcelColumn } from '@/lib/utils/excelExport';

interface Props {
  company: Company;
}

const getImgDimensions = (url: string): Promise<{ width: number, height: number, element: HTMLImageElement }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve({ width: img.width, height: img.height, element: img });
    img.onerror = reject;
    img.src = url;
  });
};

export const ProformasView: React.FC<Props> = ({ company }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useAppStore();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters State
  const filters = useProformaFilters([]);

  // Data Fetching
  const {
    data: proformasData,
    isLoading: proformasLoading,
  } = useProformasQuery({
    companyId: String(company.id),
    searchTerm: filters.searchTerm,
    filterStatus: filters.filterStatus,
    filterClientId: filters.filterClientId,
    sortConfig: filters.sortConfig,
    page,
    pageSize,
  });

  const proformas = proformasData?.data || [];
  const totalCount = proformasData?.totalCount || 0;

  // Metadata
  const { clients: clientsQuery } = useQuotationMetadata(String(company.id));
  const clients = clientsQuery.data || [];

  const [requestCategories, setRequestCategories] = useState<SalesRequestCategory[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; number: string }>({ isOpen: false, id: null, number: '' });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [isConfirmBulkStatusOpen, setIsConfirmBulkStatusOpen] = useState(false);
  const [requestModal, setRequestModal] = useState<{ isOpen: boolean; proformaId: number | null; proformaStatus: string }>({ isOpen: false, proformaId: null, proformaStatus: '' });

  // Metadata Fetching
  const fetchMetadata = useCallback(async () => {
    if (!company?.id) return;
    setLoadingMetadata(true);
    try {
      const { data, error } = await supabase
        .from('sales_request_categories')
        .select('*')
        .eq('company_id', company.id)
        .order('sort_order', { ascending: false });

      if (data) setRequestCategories(data);
    } finally {
      setLoadingMetadata(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.searchTerm, filters.filterStatus, filters.filterClientId]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      const message = success === 'created'
        ? 'Proforma baru berhasil dibuat'
        : 'Proforma berhasil diperbarui';
      showToast(message, 'success');

      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [searchParams, showToast]);

  const { bulkDeleteProformas, bulkUpdateProformasStatus } = useProformaMutations();

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      await bulkDeleteProformas.mutateAsync(selectedIds);
      showToast(`${selectedIds.length} proforma berhasil dihapus.`, 'success');
      setSelectedIds([]);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
      setIsConfirmBulkDeleteOpen(false);
    }
  };

  const handleBulkUpdateStatus = async (status: string) => {
    setIsProcessing(true);
    try {
      await bulkUpdateProformasStatus.mutateAsync({ ids: selectedIds, status });
      showToast(`${selectedIds.length} proforma berhasil diperbarui.`, 'success');
      setSelectedIds([]);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
      setIsConfirmBulkStatusOpen(false);
    }
  };

  const handleExportProformas = () => {
    const dataToExport = selectedIds.length > 0 
      ? proformas.filter(p => selectedIds.includes(p.id)) 
      : proformas;

    if (dataToExport.length === 0) {
      showToast('Tidak ada data untuk diekspor', 'info');
      return;
    }

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Tanggal', key: 'date_label', width: 15 },
      { header: 'Nomor Proforma', key: 'number', width: 25 },
      { header: 'Pelanggan', key: 'client_name', width: 25 },
      { header: 'Perusahaan', key: 'company_name', width: 25 },
      { header: 'Total Nilai', key: 'formatted_total', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    const formattedData = dataToExport.map(p => ({
      ...p,
      date_label: formatDateString(p.date),
      client_name: p.client?.name || '-',
      company_name: p.client?.client_company?.name || 'Personal',
      formatted_total: formatIDR(p.total),
    }));

    exportToExcel(formattedData, columns, 'CRM_Proformas_Report');
    showToast('Data Proforma berhasil diekspor ke Excel', 'success');
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('proformas').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null, number: '' });
      showToast(`Proforma Invoice ${confirmDelete.number} telah dihapus.`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatIDR = (num: number = 0) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num).replace('Rp', 'Rp');
  };

  const formatDateString = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const handleDownloadPDF = async (p: ProformaInvoice) => {
    setIsProcessing(true);
    try {
      const { data: templateSetting } = await supabase
        .from('document_template_settings')
        .select('*')
        .eq('company_id', company.id)
        .eq('document_type', 'invoice') 
        .maybeSingle();

      const templateId = templateSetting?.template_id || 'template1';
      const config = templateSetting?.config || {};

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const padX = 18;

      if (templateId === 'template5') {
        const tealColor = '#2596BE';
        doc.setFontSize(8.5);
        doc.setTextColor(17, 17, 17);
        doc.text(String(config.top_contact || ''), pageWidth - padX, 10, { align: 'right' });

        const bannerHeight = 22;
        const startY = 18;

        const logoUrl = config.logo_url || company.logo_url;
        if (logoUrl) {
          try {
            const { width, height, element } = await getImgDimensions(logoUrl);
            const maxWidth = 60;
            const maxHeight = bannerHeight;
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            const finalWidth = width * ratio;
            const finalHeight = height * ratio;
            doc.addImage(element, 'PNG', padX, startY + (maxHeight - finalHeight) / 2, finalWidth, finalHeight, undefined, 'FAST');
          } catch (e) {
            doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text(company.name, padX, startY + 12);
          }
        } else {
          doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text(company.name, padX, startY + 12);
        }

        doc.setFillColor(tealColor);
        doc.rect(pageWidth - 110, startY, 110, bannerHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(30);
        doc.setFont('helvetica', 'bold');
        doc.text('PROFORMA', pageWidth - 100, startY + 15);

        doc.setTextColor(17, 17, 17);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('INVOICE TO:', padX, 55);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(p.client?.client_company?.name || 'PERORANGAN', padX, 62);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${p.client?.salutation || ''} ${p.client?.name || ''}`.trim(), padX, 68);

        const metaX = 130;
        doc.text('PROFORMA NO', metaX, 55);
        doc.text(':', metaX + 30, 55);
        doc.text(p.number, metaX + 35, 55);
        doc.text('DATE', metaX, 61);
        doc.text(':', metaX + 30, 61);
        doc.text(formatDateString(p.date), metaX + 35, 61);

        autoTable(doc, {
          startY: 95,
          head: [['Item / Description', 'Price', 'Qty', 'Total']],
          body: p.proforma_items?.map(it => [
            `${it.products?.name || ''}\n${it.description || ''}`,
            formatIDR(it.price),
            `${it.qty} ${it.unit_name || ''}`,
            formatIDR(it.total)
          ]) || [],
          theme: 'plain',
          headStyles: { fillColor: tealColor, textColor: '#FFFFFF', fontSize: 11, fontStyle: 'bold', minCellHeight: 12, valign: 'middle', halign: 'left' },
          bodyStyles: { fillColor: '#F2F9FB', fontSize: 10, textColor: '#111111', minCellHeight: 14, valign: 'middle', halign: 'left' },
          alternateRowStyles: { fillColor: tealColor, textColor: '#FFFFFF' },
          columnStyles: { 0: { cellWidth: 100, cellPadding: { left: padX, top: 4, right: 4, bottom: 4 } }, 3: { cellPadding: { left: 4, top: 4, right: padX, bottom: 4 } } },
          margin: { left: 0, right: 0 },
          tableWidth: pageWidth
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 150;
        doc.text('Sub Total', 130, finalY + 10.5);
        doc.text(formatIDR(p.subtotal), pageWidth - padX, finalY + 10.5, { align: 'right' });

        const grandTotalY = finalY + 18.5;
        doc.setFillColor(tealColor);
        doc.rect(120, grandTotalY, 90, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Grand Total', 130, grandTotalY + 6.5);
        doc.text(formatIDR(p.total), pageWidth - padX, grandTotalY + 6.5, { align: 'right' });
      } else if (templateId === 'template6') {
        config.document_type = 'proforma';
        const qData = { ...p };
        await generateTemplate6(doc, qData, config, company, pageWidth, padX);
      } else {
        doc.setFillColor('#4F46E5');
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('PROFORMA INVOICE', 20, 25);
        autoTable(doc, {
          startY: 50,
          head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
          body: p.proforma_items?.map(it => [String(it.products?.name || ''), String(it.description || ''), `${it.qty} ${it.unit_name || ''}`, formatIDR(it.price), formatIDR(it.total)]) || [],
          theme: 'striped',
          headStyles: { fillColor: '#4F46E5' }
        });
      }

      doc.save(`${p.number}.pdf`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const columns: ColumnConfig<ProformaInvoice>[] = useMemo(() => [
    {
      header: 'ID',
      key: 'id',
      sortable: true,
      render: (r: ProformaInvoice) => (
        <Label className="text-[10px] text-gray-500 py-5">#{r.id}</Label>
      )
    },
    {
      header: 'Tanggal',
      key: 'date',
      sortable: true,
      render: (r: ProformaInvoice) => (
        <div className="flex items-center gap-2 text-gray-400">
          <Clock size={12} strokeWidth={2.5} />
          <Label className="text-[11px] ">{new Date(r.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Label>
        </div>
      )
    },
    {
      header: 'Nomor',
      key: 'number',
      sortable: true,
      render: (r: ProformaInvoice) => (
        <Badge variant="success" className="gap-1.5 rounded-lg border-emerald-200 bg-emerald-50">
          <FileCheck size={10} strokeWidth={2.5} className="text-emerald-600" />
          <Label className="!text-emerald-600">{r.number}</Label>
        </Badge>
      )
    },
    {
      header: 'Pelanggan',
      key: 'client_id',
      sortable: true,
      render: (r: ProformaInvoice) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo600 flex items-center justify-center  text-[10px] uppercase shadow-sm border border-indigo-100">{r.client?.name.charAt(0)}</div>
          <div>
            <Subtext className="text-xs text-gray-900 ">{r.client?.name}</Subtext>
            <Subtext className="text-[10px] !text-gray-400 mt-1 uppercase  italic">{r.client?.client_company?.name || 'Personal'}</Subtext>
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
      render: (r: ProformaInvoice) => (
        <Label className="font-bold text-indigo-600 text-xs">{formatIDR(r.total)}</Label>
      )
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      headerClassName: 'text-center',
      className: 'text-center',
      render: (r: ProformaInvoice) => (
        <Badge variant={r.status === 'Paid' ? 'emerald' : r.status === 'Sent' ? 'sky' : 'neutral'}>
          {r.status}
        </Badge>
      )
    },
    {
      header: 'Aksi',
      key: 'actions',
      headerClassName: 'text-center',
      className: 'text-center',
      render: (r: ProformaInvoice) => (
        <div className="flex justify-center">
          <ActionMenu>
            <button
              onClick={() => handleDownloadPDF(r)}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 transition-none"
            >
              <FileDown size={14} />
              Unduh PDF
            </button>
            <button
              onClick={() => setRequestModal({ isOpen: true, proformaId: r.id, proformaStatus: r.status })}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-indigo-600 hover:bg-indigo-50 border-t border-gray-50 flex items-center gap-2 transition-none"
            >
              <FilePlus size={14} />
              Request Tambahan
            </button>
            <Link
              href={`/dashboard/sales/proformas/${r.id}`}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-blue-600 hover:bg-blue-50 border-t border-gray-50 flex items-center gap-2 transition-none"
              onClick={(e) => e.stopPropagation()}
            >
              <Eye size={14} />
              Edit Proforma
            </Link>
            <button
              onClick={() => setConfirmDelete({ isOpen: true, id: r.id, number: r.number })}
              className="w-full text-left px-4 py-2.5 text-[11px] font-bold uppercase text-rose-600 hover:bg-rose-50 border-t border-gray-50 flex items-center gap-2 transition-none"
            >
              <Trash2 size={14} />
              Hapus Proforma
            </button>
          </ActionMenu>
        </div>
      )
    }
  ], [handleDownloadPDF, router]);

  if (loadingMetadata || (proformasLoading && proformas.length === 0)) return <div className="flex flex-col items-center justify-center py-24 gap-4"><Loader2 className="animate-spin text-blue-600" /><Subtext className="text-[10px]  uppercase  text-gray-400">Sinkronisasi Proforma...</Subtext></div>;

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <StandardFilterBar
        title="Daftar Proforma Invoice"
        subtitle="Kelola dan pantau seluruh proforma pelanggan."
        searchTerm={filters.searchTerm}
        onSearchChange={filters.setSearchTerm}
        onExport={handleExportProformas}
        searchPlaceholder="Cari nomor, pelanggan..."
        primaryAction={{
          label: "Buat Proforma",
          onClick: () => router.push('/dashboard/sales/proformas/create'),
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
        <ProformaFilterBar 
          filterStatus={filters.filterStatus}
          setFilterStatus={filters.setFilterStatus}
          filterClientId={filters.filterClientId}
          setFilterClientId={filters.setFilterClientId}
          clients={clients}
        />
      </StandardFilterBar>

      <div className="h-[75vh]">
        <BaseDataTable
          data={proformas}
          columns={columns}
          sortConfig={filters.sortConfig}
          onSort={filters.handleSort as (key: string) => void}
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          isLoading={proformasLoading}
          emptyMessage="Belum ada proforma"
          emptyIcon={<FileCheck size={48} />}

          // Selection Props
          selectedIds={selectedIds}
          onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id as number) ? prev.filter(i => i !== id) : [...prev, id as number])}
          onToggleSelectAll={() => setSelectedIds(selectedIds.length === proformas.length ? [] : proformas.map(r => r.id))}

        />
      </div>

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, number: '' })}
        onConfirm={executeDelete}
        title="Hapus Proforma"
        itemName={confirmDelete.number}
        description={`Apakah Anda yakin ingin menghapus proforma ${confirmDelete.number}?`}
      />

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkDeleteOpen}
        onClose={() => setIsConfirmBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        description="Hapus seluruh proforma yang dipilih secara permanen?"
        isProcessing={isProcessing}
      />

      <ConfirmBulkStatusModal
        isOpen={isConfirmBulkStatusOpen}
        onClose={() => setIsConfirmBulkStatusOpen(false)}
        onConfirm={(status) => handleBulkUpdateStatus(String(status))}
        count={selectedIds.length}
        title="Update Status Masal"
        description="Pilih status baru untuk seluruh proforma yang dipilih."
        options={[
            { id: 'Draft', name: 'DRAFT' },
            { id: 'Sent', name: 'SENT' },
            { id: 'Confirmed', name: 'CONFIRMED' },
            { id: 'Production', name: 'PRODUCTION' },
            { id: 'Paid', name: 'PAID' },
            { id: 'Cancelled', name: 'CANCELLED' }
        ]}
        isProcessing={isProcessing}
      />

      <Modal
        isOpen={requestModal.isOpen}
        onClose={() => setRequestModal({ isOpen: false, proformaId: null, proformaStatus: '' })}
        title="Buat Request untuk Proforma Ini"
        size="md"
      >
        <div className="flex flex-col gap-3 py-4">
          <Subtext className="text-sm text-gray-500 mb-2">Silakan pilih jenis request yang ingin Anda ajukan berdasarkan proforma ini:</Subtext>


          {requestModal.proformaStatus !== 'Draft' && (
            <>
              <Link
                href={`/dashboard/sales/invoice-requests/create?proformaId=${requestModal.proformaId}`}
                onMouseEnter={() => router.prefetch(`/dashboard/sales/invoice-requests/create?proformaId=${requestModal.proformaId}`)}
                className="flex items-center gap-3 w-full !py-4 px-4 text-left border border-amber-200 bg-amber-50/50 hover:bg-amber-50 rounded-lg transition-all text-sm font-medium text-gray-700"
              >
                <FileText className="text-amber-500" size={18} />
                Request Invoice
              </Link>

              <Link
                href={`/dashboard/sales/kwitansi-requests/create?proformaId=${requestModal.proformaId}`}
                onMouseEnter={() => router.prefetch(`/dashboard/sales/kwitansi-requests/create?proformaId=${requestModal.proformaId}`)}
                className="flex items-center gap-3 w-full !py-4 px-4 text-left border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 rounded-lg transition-all text-sm font-medium text-gray-700"
              >
                <FileText className="text-emerald-500" size={18} />
                Request Kwitansi
              </Link>
            </>
          )}

          {requestCategories.map(cat => (
            <Link
              key={cat.id}
              href={`/dashboard/sales/requests/${cat.id}/create?proformaId=${requestModal.proformaId}`}
              onMouseEnter={() => router.prefetch(`/dashboard/sales/requests/${cat.id}/create?proformaId=${requestModal.proformaId}`)}
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
