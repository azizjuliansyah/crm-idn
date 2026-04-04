'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button, H2, Subtext, Label, ComboBox, TableContainer } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Company, Invoice } from '@/lib/types';
import {
  Plus, Edit2, Trash2, Loader2, FileBadge,
  FileDown, Download, FilePlus
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateTemplate1, generateTemplate5, generateTemplate6 } from '@/lib/pdf-templates';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { ConfirmBulkStatusModal } from '@/components/shared/modals/ConfirmBulkStatusModal';
import { BulkActionGroup } from '@/components/shared/filters/BulkActionGroup';
import { BaseDataTable } from '@/components/shared/tables/BaseDataTable';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { useInvoicesQuery, useInvoiceMutations } from '@/lib/hooks/useInvoicesQuery';
import { useInvoiceFilters } from '@/lib/hooks/useInvoiceFilters';
import { useQuotationMetadata } from '@/lib/hooks/useQuotationsQuery';
import { InvoiceFilterBar } from './InvoiceFilterBar';
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

export const InvoicesView: React.FC<Props> = ({ company }) => {
  const router = useRouter();
  const { activeCompanyMembers, user, showToast } = useAppStore();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters State
  const filters = useInvoiceFilters([]);

  // Data Fetching
  const {
    data: invoicesData,
    isLoading: invoicesLoading,
    isPlaceholderData: isFetchingNewPage,
  } = useInvoicesQuery({
    companyId: String(company.id),
    searchTerm: filters.searchTerm,
    filterStatus: filters.filterStatus,
    filterClientId: filters.filterClientId,
    sortConfig: filters.sortConfig,
    page,
    pageSize,
  });

  const invoices = invoicesData?.data || [];

  // Metadata
  const { clients: clientsQuery } = useQuotationMetadata(String(company.id));
  const clients = clientsQuery.data || [];

  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; number: string }>({ isOpen: false, id: null, number: '' });

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [isConfirmBulkStatusOpen, setIsConfirmBulkStatusOpen] = useState(false);

  const { bulkDeleteInvoices, bulkUpdateInvoicesStatus } = useInvoiceMutations();

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === invoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map(i => i.id));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteInvoices.mutateAsync(selectedIds);
      showToast(`${selectedIds.length} invoice berhasil dihapus.`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkDeleteOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkUpdateStatus = async (status: string) => {
    try {
      await bulkUpdateInvoicesStatus.mutateAsync({ ids: selectedIds, status });
      showToast(`${selectedIds.length} invoice berhasil diperbarui.`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkStatusOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleExportInvoices = () => {
    const dataToExport = selectedIds.length > 0 
      ? invoices.filter(i => selectedIds.includes(i.id)) 
      : invoices;

    if (dataToExport.length === 0) {
      showToast('Tidak ada data untuk diekspor', 'info');
      return;
    }

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Tanggal', key: 'date_label', width: 15 },
      { header: 'Nomor Invoice', key: 'number', width: 25 },
      { header: 'Pelanggan', key: 'client_name', width: 25 },
      { header: 'Perusahaan', key: 'company_name', width: 25 },
      { header: 'Total Nilai', key: 'formatted_total', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    const formattedData = dataToExport.map(i => ({
      ...i,
      date_label: formatDateString(i.date),
      client_name: i.client?.name || '-',
      company_name: i.client?.client_company?.name || 'Personal',
      formatted_total: formatIDR(i.total),
    }));

    exportToExcel(formattedData, columns, 'CRM_Invoices_Report');
    showToast('Data Invoice berhasil diekspor ke Excel', 'success');
  };
  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.searchTerm, filters.filterStatus, filters.filterClientId]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      const message = success === 'created'
        ? 'Invoice baru berhasil dibuat'
        : 'Invoice berhasil diperbarui';
      showToast(message, 'success');

      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [searchParams, showToast]);

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null, number: '' });
      showToast(`Invoice ${confirmDelete.number} telah dihapus.`, 'success');
      // React Query handles refinement
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

  const handleDownloadPDF = async (inv: Invoice) => {
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

    const safeNum = (val: any, fallback: number = 0) => {
      const n = Number(val);
      return Number.isFinite(n) ? n : fallback;
    };

    const safeText = (text: any, x: number, y: number, options?: any) => {
      doc.text(String(text || ''), safeNum(x), safeNum(y), options);
    };

    const safeRect = (x: number, y: number, w: number, h: number, style?: string) => {
      doc.rect(safeNum(x), safeNum(y), safeNum(w), safeNum(h), style);
    };

    if (templateId === 'template5') {
      const mainColor = '#4F46E5';
      doc.setFontSize(8.5);
      doc.setTextColor(17, 17, 17);
      safeText(config.top_contact || '', pageWidth - padX, 10, { align: 'right' });

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
          doc.addImage(element, 'PNG', safeNum(padX), safeNum(startY + (maxHeight - finalHeight) / 2), finalWidth, finalHeight, undefined, 'FAST');
        } catch (e) {
          doc.setFontSize(14); doc.setFont('helvetica', 'bold'); safeText(company.name, padX, startY + 12);
        }
      } else {
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); safeText(company.name, padX, startY + 12);
      }

      doc.setFillColor(mainColor);
      safeRect(pageWidth - 110, startY, 110, bannerHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(34);
      doc.setFont('helvetica', 'bold');
      safeText('INVOICE', pageWidth - 100, startY + 15);

      doc.setTextColor(17, 17, 17);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      safeText('BILLED TO:', padX, 55);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      safeText(inv.client?.client_company?.name || 'PERORANGAN', padX, 62);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      safeText(`${inv.client?.salutation || ''} ${inv.client?.name || ''}`.trim(), padX, 68);

      const metaX = 130;
      safeText('INVOICE NO', metaX, 55);
      safeText(':', metaX + 30, 55);
      safeText(inv.number, metaX + 35, 55);
      safeText('DATE', metaX, 61);
      safeText(':', metaX + 30, 61);
      safeText(formatDateString(inv.date), metaX + 35, 61);
      safeText('DUE DATE', metaX, 67);
      safeText(':', metaX + 30, 67);
      safeText(formatDateString(inv.due_date), metaX + 35, 67);

      autoTable(doc, {
        startY: 95,
        head: [['Item / Description', 'Price', 'Qty', 'Total']],
        body: inv.invoice_items?.map(it => [
          `${it.products?.name || ''}\n${it.description || ''}`,
          formatIDR(it.price),
          `${it.qty} ${it.unit_name || ''}`,
          formatIDR(it.total)
        ]) || [],
        theme: 'plain',
        headStyles: { fillColor: mainColor, textColor: '#FFFFFF', fontSize: 11, fontStyle: 'bold', minCellHeight: 12, valign: 'middle', halign: 'left' },
        bodyStyles: { fillColor: '#FFFFFF', fontSize: 10, textColor: '#111111', minCellHeight: 14, valign: 'middle', halign: 'left' },
        alternateRowStyles: { fillColor: '#F5F5FF' },
        columnStyles: { 0: { cellWidth: 100, cellPadding: { left: padX, top: 4, right: 4, bottom: 4 } }, 3: { cellPadding: { left: 4, top: 4, right: padX, bottom: 4 } } },
        margin: { left: 0, right: 0 },
        tableWidth: pageWidth
      });

      const finalY = safeNum((doc as any).lastAutoTable?.finalY, 150);
      safeText('Sub Total', 130, finalY + 10.5);
      safeText(formatIDR(inv.subtotal), pageWidth - padX, finalY + 10.5, { align: 'right' });

      const grandTotalY = finalY + 18.5;
      doc.setFillColor(mainColor);
      safeRect(120, grandTotalY, 90, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      safeText('Grand Total', 130, grandTotalY + 6.5);
      safeText(formatIDR(inv.total), pageWidth - padX, grandTotalY + 6.5, { align: 'right' });
    } else if (templateId === 'template6') {
      config.document_type = 'invoice';
      const qData = { ...inv };
      await generateTemplate6(doc, qData, config, company, pageWidth, padX);
    } else {
      doc.setFillColor('#4F46E5');
      safeRect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      safeText('SALES INVOICE', 20, 25);
      autoTable(doc, {
        startY: 50,
        head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
        body: inv.invoice_items?.map(it => [String(it.products?.name || ''), String(it.description || ''), `${it.qty} ${it.unit_name || ''}`, formatIDR(it.price), formatIDR(it.total)]) || [],
        theme: 'striped',
        headStyles: { fillColor: '#4F46E5' }
      });
    }

    doc.save(`${inv.number}.pdf`);
  };

  const hasApprovalPermission = useMemo(() => {
    if (user?.platform_role === 'ADMIN') return true;
    const currentMember = activeCompanyMembers.find(m => m.user_id === user?.id);
    return currentMember?.company_roles?.permissions.includes('Persetujuan Request Kwitansi') || false;
  }, [user, activeCompanyMembers]);

  const handleCreateKwitansi = async (inv: Invoice) => {
    setIsProcessing(true);
    try {
      const kwtNumber = `KWT-${Date.now().toString().slice(-6)}`;
      const { data: kwt, error: kwtErr } = await supabase
        .from('kwitansis')
        .insert({
          company_id: company.id,
          client_id: inv.client_id,
          invoice_id: inv.id,
          number: kwtNumber,
          date: new Date().toISOString().split('T')[0],
          status: 'Paid',
          total: inv.total || 0,
          subtotal: inv.subtotal || 0,
          tax_type: inv.tax_type || null,
          tax_value: inv.tax_value || 0,
          discount_type: inv.discount_type || 'Rp',
          discount_value: inv.discount_value || 0
        })
        .select()
        .single();

      if (kwtErr) throw kwtErr;

      if (inv.invoice_items && inv.invoice_items.length > 0) {
        const { error: itemsErr } = await supabase
          .from('kwitansi_items')
          .insert(inv.invoice_items.map((it: any) => ({
            kwitansi_id: kwt.id,
            product_id: it.product_id,
            description: it.description,
            qty: it.qty,
            price: it.price,
            total: it.total,
            unit_name: it.unit_name
          })));
        if (itemsErr) throw itemsErr;
      }

      showToast(`Kwitansi berhasil dibuat.`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadKwitansi = async (inv: Invoice) => {
    setIsProcessing(true);
    try {
      const { data: kwt, error: kwtErr } = await supabase
        .from('kwitansis')
        .select('*, client:clients(*, client_company:client_companies(*)), kwitansi_items(*, products(*))')
        .eq('invoice_id', inv.id)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (kwtErr) throw kwtErr;

      if (!kwt) {
        showToast('Kwitansi untuk invoice ini belum dibuat.', 'error');
        setIsProcessing(false);
        return;
      }

      const { data: templateSetting } = await supabase
        .from('document_template_settings')
        .select('*')
        .eq('company_id', company.id)
        .eq('document_type', 'kwitansi')
        .maybeSingle();

      const templateId = templateSetting?.template_id || 'template1';
      const config = templateSetting?.config || {};
      config.document_type = 'kwitansi';

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const padX = 18;

      if (templateId === 'template1') {
        await generateTemplate1(doc, kwt, config, company, pageWidth, padX);
      } else if (templateId === 'template5') {
        await generateTemplate5(doc, kwt, config, company, pageWidth, padX);
      } else if (templateId === 'template6') {
        await generateTemplate6(doc, kwt, config, company, pageWidth, padX);
      } else {
        doc.setFillColor('#4F46E5');
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('KWITANSI PENJUALAN', 20, 25);

        autoTable(doc, {
          startY: 50,
          head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
          body: kwt.kwitansi_items?.map((it: any) => [
            String(it.products?.name || ''),
            String(it.description || ''),
            `${it.qty} ${it.unit_name || ''}`,
            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(it.price),
            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(it.total)
          ]) || [],
          theme: 'striped',
          headStyles: { fillColor: '#4F46E5' }
        });
      }

      doc.save(`${kwt.number}.pdf`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (invoicesLoading && invoices.length === 0) return <div className="flex flex-col items-center justify-center py-24 gap-4"><Loader2 className="animate-spin text-blue-600" /><Subtext className="text-[10px]  uppercase  text-gray-400">Sinkronisasi Invoice...</Subtext></div>;

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <StandardFilterBar
        title="Daftar Invoice"
        subtitle="Kelola dan pantau seluruh tagihan pelanggan."
        searchTerm={filters.searchTerm}
        onSearchChange={filters.setSearchTerm}
        onExport={handleExportInvoices}
        searchPlaceholder="Cari nomor, client..."
        primaryAction={{
          label: "Buat Invoice",
          onClick: () => router.push('/dashboard/sales/invoices/create'),
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
        <InvoiceFilterBar 
          filterStatus={filters.filterStatus}
          setFilterStatus={filters.setFilterStatus}
          filterClientId={filters.filterClientId}
          setFilterClientId={filters.setFilterClientId}
          clients={clients}
        />
      </StandardFilterBar>

      <div className="h-[75vh]">
        <BaseDataTable
          data={invoices}
          selectedIds={selectedIds}
          onToggleSelect={(id) => handleToggleSelect(Number(id))}
          onToggleSelectAll={handleToggleSelectAll}
          columns={[
            { 
              header: 'ID', 
              key: 'id', 
              sortable: true,
              className: 'w-20 font-mono text-[11px] text-gray-400 py-5 px-6',
              render: (inv) => `#${String(inv.id).padStart(4, '0')}`
            },
            { 
              header: 'Tanggal', 
              key: 'date', 
              sortable: true,
              render: (inv) => <Label className="text-[11px] text-gray-500">{formatDateString(inv.date)}</Label>
            },
            { 
              header: 'Nomor', 
              key: 'number', 
              sortable: true,
              render: (inv) => (
                <Link
                  href={`/dashboard/sales/invoices/${inv.id}`}
                  onMouseEnter={() => router.prefetch(`/dashboard/sales/invoices/${inv.id}`)}
                  className="text-indigo-600 text-xs font-medium hover:underline flex items-center gap-1.5"
                >
                  <FileBadge size={12} className="text-indigo-400" />
                  {inv.number}
                </Link>
              )
            },
            { 
              header: 'Pelanggan', 
              key: 'client', 
              sortable: true,
              render: (inv) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px] uppercase shadow-sm border border-indigo-100">{inv.client?.name.charAt(0)}</div>
                  <div>
                    <Subtext className="text-xs text-gray-900 font-bold">{inv.client?.name}</Subtext>
                    <Subtext className="text-[10px] !text-gray-400 mt-1 uppercase font-bold italic">{inv.client?.client_company?.name || 'Personal'}</Subtext>
                  </div>
                </div>
              )
            },
            { 
              header: 'Total', 
              key: 'total', 
              sortable: true,
              className: 'text-right font-bold text-indigo-600 text-xs bg-indigo-50/5 group-hover:bg-indigo-50/20',
              render: (inv) => formatIDR(inv.total)
            },
            { 
              header: 'Status', 
              key: 'status', 
              sortable: true,
              className: 'text-center',
              render: (inv) => (
                <Label className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase border transition-all duration-300 ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  inv.status === 'Partial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    inv.status === 'Unpaid' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      'bg-gray-50 text-gray-400 border-gray-200'
                  }`}>
                  {inv.status}
                </Label>
              )
            },
            {
              header: 'Aksi',
              key: 'actions',
              className: 'text-center',
              render: (inv) => (
                <div className="flex items-center justify-center gap-2">
                  <ActionButton
                    icon={FileDown}
                    variant="emerald"
                    onClick={() => handleDownloadPDF(inv)}
                    title="Unduh PDF"
                  />
                  {inv.status === 'Paid' && (inv as any).kwitansis?.length > 0 && (
                    <ActionButton
                      icon={Download}
                      variant="rose"
                      onClick={() => handleDownloadKwitansi(inv)}
                      title="Unduh Kwitansi"
                    />
                  )}
                  {inv.status === 'Paid' && (inv as any).kwitansis?.length === 0 && hasApprovalPermission && (
                    <ActionButton
                      icon={FilePlus}
                      variant="indigo"
                      onClick={() => handleCreateKwitansi(inv)}
                      title="Buat Kwitansi"
                    />
                  )}
                  <ActionButton
                    icon={Edit2}
                    variant="blue"
                    href={`/dashboard/sales/invoices/${inv.id}`}
                    title="Edit"
                  />
                  <ActionButton
                    icon={Trash2}
                    variant="rose"
                    onClick={() => setConfirmDelete({ isOpen: true, id: inv.id, number: inv.number })}
                    title="Hapus"
                  />
                </div>
              )
            }
          ]}
          sortConfig={filters.sortConfig}
          onSort={filters.handleSort as (key: string) => void}
          page={page}
          pageSize={pageSize}
          totalCount={invoicesData?.totalCount || 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          isLoading={invoicesLoading}
          emptyMessage="Belum ada invoice tercatat"
          emptyIcon={<FileBadge size={48} />}
        />
      </div>


      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, number: '' })}
        onConfirm={executeDelete}
        title="Hapus Invoice"
        itemName={confirmDelete.number}
        isProcessing={isProcessing}
      />

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkDeleteOpen}
        onClose={() => setIsConfirmBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        title="Hapus Invoice Masal"
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} invoice yang dipilih? Data rincian item pada invoice tersebut juga akan hilang.`}
        isProcessing={bulkDeleteInvoices.status === 'pending'}
      />

      <ConfirmBulkStatusModal
        isOpen={isConfirmBulkStatusOpen}
        onClose={() => setIsConfirmBulkStatusOpen(false)}
        onConfirm={(statusId) => handleBulkUpdateStatus(String(statusId))}
        count={selectedIds.length}
        options={[
          { id: 'Unpaid', name: 'UNPAID' },
          { id: 'Partial', name: 'PARTIAL' },
          { id: 'Paid', name: 'PAID' },
        ]}
        title="Ubah Status Invoice"
        label="Pilih Status Baru"
        isProcessing={bulkUpdateInvoicesStatus.status === 'pending'}
      />
    </div>
  );
};
