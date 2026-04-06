'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  H2, Subtext, Label, Badge, Button,
} from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Company, InvoiceRequest } from '@/lib/types';
import {
  Plus, FileQuestion, Clock, User, Building,
  Check, Trash2, FilePlus, ExternalLink, Zap, FileDown, X
} from 'lucide-react';
import { BaseDataTable, ColumnConfig } from '@/components/shared/tables/BaseDataTable';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateTemplate1, generateTemplate5, generateTemplate6 } from '@/lib/pdf-templates';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';
import { useInvoiceRequestsQuery, useInvoiceRequestMutations } from '@/lib/hooks/useInvoiceRequestsQuery';
import { useInvoiceRequestFilters } from '@/lib/hooks/useInvoiceRequestFilters';
import { InvoiceRequestFilterBar } from './InvoiceRequestFilterBar';
import { BulkActionGroup } from '@/components/shared/filters/BulkActionGroup';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { ConfirmBulkStatusModal } from '@/components/shared/modals/ConfirmBulkStatusModal';
import { exportToExcel, ExcelColumn } from '@/lib/utils/excelExport';

interface Props {
  company: Company;
}

export const InvoiceRequestsView: React.FC<Props> = ({ company }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeCompanyMembers, user, showToast } = useAppStore();
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = useInvoiceRequestFilters();

  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [isConfirmBulkStatusOpen, setIsConfirmBulkStatusOpen] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });

  const {
    data: requestsData,
    isLoading: loading,
    refetch: refetchRequests
  } = useInvoiceRequestsQuery({
    companyId: String(company.id),
    searchTerm: filters.searchTerm,
    filterStatus: filters.filterStatus,
    sortConfig: filters.sortConfig,
    page,
    pageSize,
  });

  const { bulkDeleteRequests, bulkUpdateStatus: bulkStatusMutation } = useInvoiceRequestMutations();

  const requests = requestsData?.data || [];
  const totalCount = requestsData?.totalCount || 0;

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      showToast('Request baru berhasil diajukan', 'success');

      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [searchParams, showToast]);

  // Reset page to 1 on filter changes
  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [filters.searchTerm, filters.filterStatus]);

  const handleUpdateStatus = async (id: number, newStatus: 'Approved' | 'Rejected') => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('invoice_requests')
        .update({
          status: newStatus,
          approved_at: newStatus === 'Approved' ? new Date().toISOString() : null,
          approver_id: newStatus === 'Approved' ? user?.id : null
        })
        .eq('id', id);

      if (error) throw error;
      showToast(`Request berhasil di-${newStatus.toLowerCase()}`, 'success');
      refetchRequests();
    } catch (err: any) {
      console.error(err);
      showToast('Gagal memperbarui status', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadInvoice = async (r: InvoiceRequest) => {
    if (!r.invoice_id) return;
    setIsProcessing(true);

    try {
      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .select('*, client:clients(*, client_company:client_companies(*)), invoice_items(*, products(*))')
        .eq('id', r.invoice_id)
        .single();

      if (invErr) throw invErr;
      if (!inv) throw new Error('Invoice tidak ditemukan.');

      const { data: templateSetting } = await supabase
        .from('document_template_settings')
        .select('*')
        .eq('company_id', company.id)
        .eq('document_type', 'invoice')
        .maybeSingle();

      const templateId = templateSetting?.template_id || 'template1';
      const config = templateSetting?.config || {};
      config.document_type = 'invoice';

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const padX = 18;

      if (templateId === 'template1') {
        await generateTemplate1(doc, inv, config, company, pageWidth, padX);
      } else if (templateId === 'template5') {
        await generateTemplate5(doc, inv, config, company, pageWidth, padX);
      } else if (templateId === 'template6') {
        await generateTemplate6(doc, inv, config, company, pageWidth, padX);
      } else {
        doc.setFillColor('#4F46E5');
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('SALES INVOICE', 20, 25);

        autoTable(doc, {
          startY: 50,
          head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
          body: inv.invoice_items?.map((it: any) => [
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

      doc.save(`${inv.number}.pdf`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('invoice_requests')
        .delete()
        .eq('id', confirmDelete.id);

      if (error) throw error;
      showToast('Request berhasil dihapus', 'success');
      refetchRequests();
    } catch (err: any) {
      console.error(err);
      showToast('Gagal menghapus request', 'error');
    } finally {
      setIsProcessing(false);
      setConfirmDelete({ isOpen: false, id: null });
    }
  };
  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      await bulkDeleteRequests.mutateAsync(selectedIds);
      showToast(`${selectedIds.length} request berhasil dihapus`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkDeleteOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkUpdateStatus = async (status: string) => {
    setIsProcessing(true);
    try {
      await bulkStatusMutation.mutateAsync({ ids: selectedIds, status });
      showToast(`${selectedIds.length} status request berhasil diperbarui`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkStatusOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportRequests = () => {
    const dataToExport = selectedIds.length > 0 
      ? requests.filter(r => selectedIds.includes(r.id)) 
      : requests;

    if (dataToExport.length === 0) {
      showToast('Tidak ada data untuk diekspor', 'info' as any);
      return;
    }

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Keterangan', key: 'notes', width: 30 },
      { header: 'Ref Quotation', key: 'qtn_number', width: 20 },
      { header: 'Ref Proforma', key: 'pi_number', width: 20 },
      { header: 'Pelanggan', key: 'client_name', width: 25 },
      { header: 'Perusahaan', key: 'company_name', width: 25 },
      { header: 'Urgency', key: 'urgency_label', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Tanggal Request', key: 'date_label', width: 20 },
    ];

    const formattedData = dataToExport.map(r => ({
      ...r,
      qtn_number: r.quotation?.number || '-',
      pi_number: r.proforma?.number || '-',
      client_name: r.client?.name || '-',
      company_name: r.client?.client_company?.name || 'Personal',
      urgency_label: r.urgency_level?.name || 'Normal',
      date_label: new Date(r.created_at).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
      }),
    }));

    exportToExcel(formattedData, columns, 'CRM_Invoice_Requests_Report');
    showToast('Data Request berhasil diekspor ke Excel', 'success');
  };

  const hasApprovalPermission = useMemo(() => {
    if (user?.platform_role === 'ADMIN') return true;
    const currentMember = activeCompanyMembers.find(m => m.user_id === user?.id);
    return currentMember?.company_roles?.permissions.includes('Persetujuan Request Invoice') || false;
  }, [user, activeCompanyMembers]);

  const columns: ColumnConfig<InvoiceRequest>[] = useMemo(() => [
    {
      header: 'ID',
      key: 'id',
      sortable: true,
      className: 'w-20 font-mono text-[11px] text-gray-400 py-5 px-6',
      render: (r: InvoiceRequest) => `#${String(r.id).padStart(4, '0')}`
    },
    {
      header: 'Keterangan Request',
      key: 'notes',
      sortable: true,
      render: (r: InvoiceRequest) => (
        <div className="flex flex-col gap-1">
          <Label className="text-sm font-bold text-gray-900 uppercase line-clamp-1">
            {r.notes || 'Tanpa Keterangan'}
          </Label>
          <Subtext className="text-[10px] text-gray-400 flex items-center gap-1.5 font-medium uppercase tracking-wider">
            <Clock size={10} />
            DAFTAR PADA {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
          </Subtext>
        </div>
      )
    },
    {
      header: 'Nomor Referensi',
      key: 'reference',
      sortable: true,
      render: (r: InvoiceRequest) => (
        <div className="flex flex-col gap-1">
          {r.quotation?.number && (
            <div className="flex items-center gap-2">
              <Badge variant="sky" className="text-[9px] uppercase px-2 py-0.5 rounded-md font-bold">QTN</Badge>
              <Label className="text-xs font-bold text-emerald-600">{r.quotation.number}</Label>
            </div>
          )}
          {r.proforma?.number && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="indigo" className="text-[9px] uppercase px-2 py-0.5 rounded-md font-bold">PI</Badge>
              <Label className="text-xs font-bold text-indigo-600">{r.proforma.number}</Label>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Client',
      key: 'client_id',
      sortable: true,
      render: (r: InvoiceRequest) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <User size={12} className="text-gray-400" />
            <Label className="text-xs font-bold text-gray-900 uppercase">
              {r.client?.name || 'Client Tidak Tersedia'}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Building size={12} className="text-gray-400" />
            <Subtext className="text-[10px] text-gray-500 uppercase">
              {r.client?.client_company?.name || 'Personal'}
            </Subtext>
          </div>
        </div>
      )
    },
    {
      header: 'Dibuat Oleh',
      key: 'requester_id',
      render: (r: InvoiceRequest) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-[10px]">
            {(r.profile?.full_name || 'U')[0].toUpperCase()}
          </div>
          <Label className="text-[11px] font-bold text-gray-700 uppercase">
            {r.profile?.full_name ||
              activeCompanyMembers.find(m => m.user_id === r.requester_id)?.profile?.full_name ||
              'USER'}
          </Label>
        </div>
      )
    },
    {
      header: 'Status & Urgency',
      key: 'status',
      sortable: true,
      headerClassName: 'text-center',
      className: 'text-center',
      render: (r: InvoiceRequest) => (
        <div className="flex flex-col items-center gap-2">
          <Badge variant={
            r.status === 'Pending' ? 'neutral' :
              r.status === 'Approved' ? 'emerald' :
                'rose'
          } className="capitalize px-3 py-1 text-[10px] font-bold">
            {r.status}
          </Badge>
          {(r.urgency_level) && (
            <div className={`px-2 py-1 rounded-full text-[9px] font-bold tracking-wide uppercase flex items-center gap-1 shadow-sm border ${
              r.urgency_level ? `bg-${r.urgency_level.color}-100 text-${r.urgency_level.color}-700 border-${r.urgency_level.color}-200` : 'bg-amber-100 text-amber-700 border-amber-200'
            }`}>
              <Zap size={10} fill="currentColor" />
              {r.urgency_level?.name || 'Urgent'}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Aksi',
      key: 'actions',
      headerClassName: 'text-center',
      className: 'text-center',
      render: (r: InvoiceRequest) => (
        <div className="flex items-center justify-center gap-2">
          {r.status === 'Pending' && hasApprovalPermission && (
            <>
              <ActionButton
                icon={Check}
                variant="emerald"
                onClick={() => handleUpdateStatus(r.id, 'Approved')}
                title="Approve"
              />
              <ActionButton
                icon={X}
                variant="rose"
                onClick={() => handleUpdateStatus(r.id, 'Rejected')}
                title="Reject"
              />
            </>
          )}
          {r.status === 'Approved' && !r.invoice_id && hasApprovalPermission && (
            <ActionButton
              icon={FilePlus}
              variant="indigo"
              href={`/dashboard/sales/invoices/create?requestId=${r.id}&clientId=${r.client_id}${r.proforma_id ? `&proformaId=${r.proforma_id}` : ''}${r.quotation_id ? `&quotationId=${r.quotation_id}` : ''}`}
              title="Buat Invoice"
            />
          )}
          {r.status === 'Approved' && r.invoice_id && (
            <>
              <ActionButton
                icon={FileDown}
                variant="emerald"
                onClick={() => handleDownloadInvoice(r)}
                title="Download Invoice"
              />
              <ActionButton
                icon={ExternalLink}
                variant="blue"
                href={`/dashboard/sales/invoices/${r.invoice_id}`}
                title={`Lihat Invoice ${r.invoice?.number || ''}`}
              />
            </>
          )}
          <ActionButton
            icon={Trash2}
            variant="rose"
            onClick={() => setConfirmDelete({ isOpen: true, id: r.id })}
            title="Hapus"
          />
        </div>
      )
    }
  ], [activeCompanyMembers, hasApprovalPermission, handleDownloadInvoice, handleUpdateStatus, router]);

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <StandardFilterBar
        title="Request Invoice"
        subtitle="Kelola dan pantau seluruh permintaan pembuatan invoice pelanggan."
        searchTerm={filters.searchTerm}
        onSearchChange={filters.setSearchTerm}
        onExport={handleExportRequests}
        searchPlaceholder="Cari request..."
        primaryAction={{
          label: "Request Baru",
          onClick: () => router.push('/dashboard/sales/invoice-requests/create'),
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
        <InvoiceRequestFilterBar
          filterStatus={filters.filterStatus}
          setFilterStatus={filters.setFilterStatus}
        />
      </StandardFilterBar>

      <div className="h-[75vh]">
        <BaseDataTable
          data={requests}
          columns={columns}
          sortConfig={filters.sortConfig}
          onSort={filters.handleSort as (key: string) => void}
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          isLoading={loading}
          emptyMessage="Belum ada request invoice"
          emptyIcon={<FileQuestion size={48} className="opacity-10" />}
          
          selectedIds={selectedIds}
          onToggleSelect={(id) => {
            const numId = Number(id);
            setSelectedIds(prev => prev.includes(numId) ? prev.filter(i => i !== numId) : [...prev, numId]);
          }}
          onToggleSelectAll={() => {
            if (selectedIds.length === requests.length) {
              setSelectedIds([]);
            } else {
              setSelectedIds(requests.map(r => r.id));
            }
          }}
        />
      </div>

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Hapus Request"
        itemName="Request Invoice ini"
        isProcessing={isProcessing}
        description="Apakah Anda yakin ingin menghapus catatan permintaan invoice ini?"
      />

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkDeleteOpen}
        onClose={() => setIsConfirmBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        title="Hapus Request Masal"
        description="Apakah Anda yakin ingin menghapus seluruh request yang dipilih? Tindakan ini tidak dapat dibatalkan."
        isProcessing={isProcessing}
      />

      <ConfirmBulkStatusModal
        isOpen={isConfirmBulkStatusOpen}
        onClose={() => setIsConfirmBulkStatusOpen(false)}
        onConfirm={(status) => handleBulkUpdateStatus(String(status))}
        count={selectedIds.length}
        title="Ubah Status Masal"
        label="Pilih Status Baru"
        description="Pilih status baru untuk seluruh request yang dipilih."
        options={[
          { id: 'Pending', name: 'PENDING' },
          { id: 'Approved', name: 'APPROVED' },
          { id: 'Rejected', name: 'REJECTED' }
        ]}
        isProcessing={isProcessing}
      />

    </div>
  );
};
