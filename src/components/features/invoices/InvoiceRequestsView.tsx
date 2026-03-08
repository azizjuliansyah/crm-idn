'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, H2, Subtext, Label, Badge, SearchInput, ComboBox, Toast, ToastType } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, InvoiceRequest } from '@/lib/types';
import {
  Plus, Search, Loader2, FileQuestion,
  ChevronRight, ArrowUpDown, ChevronUp, ChevronDown,
  AlertTriangle, CheckCircle2, X, Filter,
  FileText, Clock, User, Building,
  FileCheck, Check, Trash2, FilePlus, ExternalLink, Zap, FileDown
} from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
// Removed legacy NotificationModal import
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateTemplate1, generateTemplate5, generateTemplate6 } from '@/lib/pdf-templates';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDashboard } from '@/app/dashboard/DashboardContext';

interface Props {
  company: Company;
}

type SortKey = 'id' | 'client' | 'status' | 'created_at';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

export const InvoiceRequestsView: React.FC<Props> = ({ company }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeCompanyMembers, user } = useDashboard();
  const [requests, setRequests] = useState<InvoiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'desc' });
  const [isProcessing, setIsProcessing] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const fetchData = useCallback(async (isInitial = false) => {
    if (!company?.id) return;
    if (isInitial) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoice_requests')
        .select('*, profile:profiles(*), client:clients(*, client_company:client_companies(*)), quotation:quotations(number), proforma:proformas(number), invoice:invoices(id, number), urgency_level:urgency_levels(id, name, color, sort_order)')
        .eq('company_id', company.id)
        .order('id', { ascending: false });

      if (error) throw error;
      if (data) setRequests(data as any);
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      setToast({ isOpen: true, message: 'Request baru berhasil diajukan', type: 'success' });

      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [searchParams]);

  const filteredRequests = useMemo(() => {
    let result = requests.filter(r => {
      const matchesSearch =
        (r.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.quotation?.number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.proforma?.number || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        // Sort by urgency first
        const orderA = a.urgency_level?.sort_order ?? 999;
        const orderB = b.urgency_level?.sort_order ?? 999;
        if (orderA !== orderB) return orderA - orderB;

        let valA: any, valB: any;
        switch (sortConfig.key) {
          case 'client': valA = a.client?.name || ''; valB = b.client?.name || ''; break;
          case 'status': valA = a.status; valB = b.status; break;
          case 'created_at': valA = a.created_at; valB = b.created_at; break;
          default: valA = a.id; valB = b.id;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Even if no specific sort, show urgent first
      result.sort((a, b) => {
        const orderA = a.urgency_level?.sort_order ?? 999;
        const orderB = b.urgency_level?.sort_order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return 0;
      });
    }

    return result;
  }, [requests, searchTerm, filterStatus, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  const handleUpdateStatus = async (id: number, newStatus: 'Approved' | 'Rejected') => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('invoice_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setToast({ isOpen: true, message: `Request telah di-${newStatus.toLowerCase()}.`, type: 'success' });
      fetchData();
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
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
        const mainColor = '#4F46E5';
        const grayColor = '#9B9B9B';
        const rowLightColor = '#F5F5FF';

        doc.setFontSize(8.5);
        doc.setTextColor(17, 17, 17);
        doc.text(config.top_contact || '', pageWidth - padX, 10, { align: 'right' });

        const bannerHeight = 22;
        const startY = 18;

        const logoUrl = config.logo_url || company.logo_url;
        if (logoUrl) {
          try {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = logoUrl;
            });
            const maxWidth = 60;
            const maxHeight = bannerHeight;
            const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
            doc.addImage(img, 'PNG', padX, startY + (maxHeight - img.height * ratio) / 2, img.width * ratio, img.height * ratio, undefined, 'FAST');
          } catch (e) {
            doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text(company.name, padX, startY + 12);
          }
        } else {
          doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text(company.name, padX, startY + 12);
        }

        doc.setFillColor(mainColor);
        doc.rect(pageWidth - 110, startY, 110, bannerHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(34);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', pageWidth - 100, startY + 15);

        doc.setTextColor(17, 17, 17);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('BILLED TO:', padX, 55);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(inv.client?.client_company?.name || 'PERORANGAN', padX, 62);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${inv.client?.salutation || ''} ${inv.client?.name || ''}`.trim(), padX, 68);

        const metaX = 130;
        doc.text('INVOICE NO', metaX, 55);
        doc.text(':', metaX + 30, 55);
        doc.text(inv.number, metaX + 35, 55);
        doc.text('DATE', metaX, 61);
        doc.text(':', metaX + 30, 61);
        doc.text(new Date(inv.date).toLocaleDateString('id-ID'), metaX + 35, 61);
        doc.text('DUE DATE', metaX, 67);
        doc.text(':', metaX + 30, 67);
        doc.text(new Date(inv.due_date).toLocaleDateString('id-ID'), metaX + 35, 67);

        autoTable(doc, {
          startY: 95,
          head: [['Item / Description', 'Price', 'Qty', 'Total']],
          body: inv.invoice_items?.map((it: any) => [
            `${it.products?.name || ''}\n${it.description || ''}`,
            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(it.price),
            `${it.qty} ${it.unit_name || ''}`,
            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(it.total)
          ]) || [],
          theme: 'plain',
          headStyles: { fillColor: mainColor, textColor: '#FFFFFF', fontSize: 11, fontStyle: 'bold', minCellHeight: 12, valign: 'middle', halign: 'left' },
          bodyStyles: { fillColor: '#FFFFFF', fontSize: 10, textColor: '#111111', minCellHeight: 14, valign: 'middle', halign: 'left' },
          alternateRowStyles: { fillColor: rowLightColor },
          columnStyles: { 0: { cellWidth: 100, cellPadding: { left: padX, top: 4, right: 4, bottom: 4 } }, 3: { cellPadding: { left: 4, top: 4, right: padX, bottom: 4 } } },
          margin: { left: 0, right: 0 },
          tableWidth: pageWidth
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 150;
        doc.text('Sub Total', 130, finalY + 10.5);
        doc.text(new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(inv.subtotal), pageWidth - padX, finalY + 10.5, { align: 'right' });

        const grandTotalY = finalY + 18.5;
        doc.setFillColor(mainColor);
        doc.rect(120, grandTotalY, 90, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Grand Total', 130, grandTotalY + 6.5);
        doc.text(new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(inv.total), pageWidth - padX, grandTotalY + 6.5, { align: 'right' });
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
      setToast({ isOpen: true, message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };



  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('invoice_requests').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null });
      fetchData();
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusVariant = (status: string): 'success' | 'danger' | 'warning' | 'secondary' => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'danger';
      default: return 'warning';
    }
  };

  const hasApprovalPermission = useMemo(() => {
    if (user?.platform_role === 'ADMIN') return true;
    const currentMember = activeCompanyMembers.find(m => m.user_id === user?.id);
    return currentMember?.company_roles?.permissions.includes('Persetujuan Request Invoice') || false;
  }, [user, activeCompanyMembers]);

  if (loading) return <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-2xl border border-gray-100 min-h-[400px]"><Loader2 className="animate-spin text-indigo-600" size={32} /><Subtext className="text-[10px]  uppercase  text-gray-400">Memuat Request Invoice...</Subtext></div>;

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl ">Daftar Request Invoice</H2>
            <Subtext className="text-[10px]  uppercase ">Kelola dan pantau seluruh permintaan pembuatan tagihan pelanggan.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/dashboard/sales/invoice-requests/create')}
              leftIcon={<Plus size={14} strokeWidth={3} />}
              className="!px-6 py-2.5 text-[10px] uppercase  shadow-lg shadow-blue-100"
              variant="primary"
              size="sm"
            >
              Request Baru
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
          <div className="w-[400px] shrink-0">
            <SearchInput
              placeholder="Cari client atau nomor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <ComboBox
              value={filterStatus}
              onChange={(val: string | number) => setFilterStatus(val.toString())}
              placeholder="Status"
              options={[
                { value: 'all', label: 'SEMUA STATUS' },
                { value: 'Pending', label: 'PENDING' },
                { value: 'Approved', label: 'APPROVED' },
                { value: 'Rejected', label: 'REJECTED' },
              ]}
              className="w-40"
              hideSearch={true}
              placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm h-[80vh] mb-4">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">
            <TableRow className="hover:bg-transparent">
              <TableCell isHeader>ID</TableCell>
              <TableCell isHeader>Tanggal</TableCell>
              <TableCell isHeader>Pelanggan</TableCell>
              <TableCell isHeader>Referensi</TableCell>
              <TableCell isHeader>Pemohon</TableCell>
              <TableCell isHeader className="text-center">Status</TableCell>
              <TableCell isHeader className="text-center">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((r, idx) => (
              <TableRow
                key={r.id}
                className={`group transition-all border-b border-gray-50/50 last:border-0 ${(r.urgency_level)
                  ? (idx % 2 === 0
                    ? 'bg-amber-50/20 hover:bg-amber-100/30'
                    : 'bg-amber-50/10 hover:bg-amber-100/20')
                  : 'hover:bg-indigo-50/30'
                  }`}
              >
                <TableCell className="text-[10px] text-gray-500 py-5">#{r.id}</TableCell>
                <TableCell className="py-5">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={12} strokeWidth={2.5} />
                    <Label className="text-[11px] ">{new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Label>
                  </div>
                </TableCell>
                <TableCell className="py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center  text-[10px] uppercase shadow-sm border border-indigo-100">{r.client?.name.charAt(0)}</div>
                    <div>
                      <Subtext className="text-xs text-gray-900 ">{r.client?.name}</Subtext>
                      <Subtext className="text-[10px] !text-gray-400 mt-1 uppercase  italic">{r.client?.client_company?.name || 'Personal'}</Subtext>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-5">
                  {r.quotation ? (
                    <Badge variant="secondary" className="gap-1.5 rounded-lg">
                      <FileText size={10} strokeWidth={2.5} />
                      <Label className="!text-indigo-600">{r.quotation.number}</Label>
                    </Badge>
                  ) : r.proforma ? (
                    <Badge variant="success" className="gap-1.5 rounded-lg">
                      <FileCheck size={10} strokeWidth={2.5} />
                      <Label className="!text-emerald-600">{r.proforma.number}</Label>
                    </Badge>
                  ) : (
                    <Label className="text-[10px] text-gray-300 italic ">NO REF</Label>
                  )}
                </TableCell>
                <TableCell className="py-5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                      <User size={10} strokeWidth={2.5} className="text-gray-400" />
                    </div>
                    <Label className="text-[11px]  text-gray-600">
                      {r.profile?.full_name ||
                        activeCompanyMembers.find(m => m.user_id === r.requester_id)?.profile?.full_name ||
                        'Data Tidak Tersedia'}
                    </Label>
                  </div>
                </TableCell>
                <TableCell className="text-center py-5">
                  <div className="flex flex-col items-center gap-2">
                    <Badge variant={
                      r.status === 'Pending' ? 'neutral' :
                        r.status === 'Approved' ? 'emerald' :
                          'rose'
                    } className="capitalize">
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
                </TableCell>
                <TableCell>
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
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set('requestId', r.id.toString());
                          params.set('clientId', r.client_id.toString());
                          if (r.proforma_id) params.set('proformaId', r.proforma_id.toString());
                          if (r.quotation_id) params.set('quotationId', r.quotation_id.toString());
                          router.push(`/dashboard/sales/invoices/create?${params.toString()}`);
                        }}
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
                          onClick={() => router.push(`/dashboard/sales/invoices/${r.invoice_id}`)}
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
                </TableCell>
              </TableRow>
            ))}
            {filteredRequests.length === 0 && (
              <TableEmpty colSpan={7} message="Belum ada request invoice" icon={<FileQuestion size={48} />} />
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Hapus Request"
        itemName="Request Invoice ini"
        isProcessing={isProcessing}
        description="Apakah Anda yakin ingin menghapus catatan permintaan invoice ini?"
        variant="horizontal"
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
