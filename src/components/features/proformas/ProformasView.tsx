'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Button, Table, TableHeader, TableBody, TableRow, TableCell, H2, H3, Subtext, Label, Modal, EmptyState, SearchInput, Badge, ComboBox, Toast, ToastType } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, ProformaInvoice, SalesRequestCategory } from '@/lib/types';
import {
  Plus, Search, Edit2, Trash2, Loader2, FileCheck,
  ChevronRight, ArrowUpDown, ChevronUp, ChevronDown,
  AlertTriangle, CheckCircle2, X, Filter,
  FileDown, FileText, FilePlus,
  Clock
} from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateTemplate1, generateTemplate5, generateTemplate6 } from '@/lib/pdf-templates';
import { useRouter, useSearchParams } from 'next/navigation';

interface Props {
  company: Company;
}

type SortKey = 'number' | 'client' | 'date' | 'total' | 'status';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

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
  const [proformas, setProformas] = useState<ProformaInvoice[]>([]);
  const [requestCategories, setRequestCategories] = useState<SalesRequestCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClientId, setFilterClientId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id' as any, direction: 'desc' });

  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; number: string }>({ isOpen: false, id: null, number: '' });
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });
  const [requestModal, setRequestModal] = useState<{ isOpen: boolean; proformaId: number | null; proformaStatus: string }>({ isOpen: false, proformaId: null, proformaStatus: '' });

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const [pRes, catRes] = await Promise.all([
        supabase
          .from('proformas')
          .select('*, client:clients(*, client_company:client_companies(*)), proforma_items(*, products(*))')
          .eq('company_id', company.id)
          .order('id', { ascending: false }),
        supabase
          .from('sales_request_categories')
          .select('*')
          .eq('company_id', company.id)
          .order('sort_order', { ascending: false })
      ]);

      if (pRes.error) throw pRes.error;
      if (pRes.data) setProformas(pRes.data as any);
      if (catRes.error) throw catRes.error;
      if (catRes.data) setRequestCategories(catRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      const message = success === 'created'
        ? 'Proforma baru berhasil dibuat'
        : 'Proforma berhasil diperbarui';
      setToast({ isOpen: true, message, type: 'success' });

      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    }
  }, [searchParams]);

  const uniqueClients = useMemo(() => {
    const map = new Map();
    proformas.forEach(p => {
      if (p.client) {
        map.set(p.client.id, p.client.name);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [proformas]);

  const filteredProformas = useMemo(() => {
    let result = proformas.filter(p => {
      const matchesSearch = p.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.client?.client_company?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClient = filterClientId === 'all' || p.client_id === parseInt(filterClientId);
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;

      return matchesSearch && matchesClient && matchesStatus;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any, valB: any;
        switch (sortConfig.key) {
          case 'number': valA = a.number; valB = b.number; break;
          case 'client': valA = a.client?.name || ''; valB = b.client?.name || ''; break;
          case 'date': valA = a.date; valB = b.date; break;
          case 'total': valA = a.total; valB = b.total; break;
          case 'status': valA = a.status; valB = b.status; break;
          default: valA = a.id; valB = b.id;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [proformas, searchTerm, filterClientId, filterStatus, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  const showNotification = (title: string, message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('proformas').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null, number: '' });
      showNotification('Berhasil', `Proforma Invoice ${confirmDelete.number} telah dihapus.`);
      fetchData();
    } catch (err: any) {
      showNotification('Gagal', err.message, 'error');
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
    const pageHeight = doc.internal.pageSize.getHeight();
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
      const tealColor = '#2596BE';
      const gray2Color = '#9B9B9B';
      const rowTealColor = '#2596BE';
      const rowLightColor = '#F2F9FB';

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

      doc.setFillColor(tealColor);
      safeRect(pageWidth - 110, startY, 110, bannerHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(30);
      doc.setFont('helvetica', 'bold');
      safeText('PROFORMA', pageWidth - 100, startY + 15);

      doc.setTextColor(17, 17, 17);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      safeText('INVOICE TO:', padX, 55);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      safeText(p.client?.client_company?.name || 'PERORANGAN', padX, 62);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      safeText(`${p.client?.salutation || ''} ${p.client?.name || ''}`.trim(), padX, 68);

      const metaX = 130;
      safeText('PROFORMA NO', metaX, 55);
      safeText(':', metaX + 30, 55);
      safeText(p.number, metaX + 35, 55);
      safeText('DATE', metaX, 61);
      safeText(':', metaX + 30, 61);
      safeText(formatDateString(p.date), metaX + 35, 61);

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
        bodyStyles: { fillColor: rowLightColor, fontSize: 10, textColor: '#111111', minCellHeight: 14, valign: 'middle', halign: 'left' },
        alternateRowStyles: { fillColor: rowTealColor, textColor: '#FFFFFF' },
        columnStyles: { 0: { cellWidth: 100, cellPadding: { left: padX, top: 4, right: 4, bottom: 4 } }, 3: { cellPadding: { left: 4, top: 4, right: padX, bottom: 4 } } },
        margin: { left: 0, right: 0 },
        tableWidth: pageWidth
      });

      const finalY = safeNum((doc as any).lastAutoTable?.finalY, 150);
      safeText('Sub Total', 130, finalY + 10.5);
      safeText(formatIDR(p.subtotal), pageWidth - padX, finalY + 10.5, { align: 'right' });

      const grandTotalY = finalY + 18.5;
      doc.setFillColor(tealColor);
      safeRect(120, grandTotalY, 90, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      safeText('Grand Total', 130, grandTotalY + 6.5);
      safeText(formatIDR(p.total), pageWidth - padX, grandTotalY + 6.5, { align: 'right' });
    } else if (templateId === 'template6') {
      config.document_type = 'proforma';
      const qData = { ...p };
      await generateTemplate6(doc, qData, config, company, pageWidth, padX);
    } else {
      doc.setFillColor('#4F46E5');
      safeRect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      safeText('PROFORMA INVOICE', 20, 25);
      autoTable(doc, {
        startY: 50,
        head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
        body: p.proforma_items?.map(it => [String(it.products?.name || ''), String(it.description || ''), `${it.qty} ${it.unit_name || ''}`, formatIDR(it.price), formatIDR(it.total)]) || [],
        theme: 'striped',
        headStyles: { fillColor: '#4F46E5' }
      });
    }

    doc.save(`${p.number}.pdf`);
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24 gap-4"><Loader2 className="animate-spin text-blue-600" /><Subtext className="text-[10px]  uppercase  text-gray-400">Sinkronisasi Proforma...</Subtext></div>;

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl ">Daftar Proforma Invoice</H2>
            <Subtext className="text-[10px]  uppercase ">Kelola dan pantau seluruh proforma pelanggan.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/dashboard/sales/proformas/create')}
              leftIcon={<Plus size={14} strokeWidth={3} />}
              className="!px-6 py-2.5 text-[10px] uppercase  shadow-lg shadow-blue-100"
              variant="primary"
              size="sm"
            >
              Buat Proforma
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
          <div className="w-[400px] shrink-0">
            <SearchInput
              placeholder="Cari nomor, client..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <ComboBox
              value={filterClientId}
              onChange={(val: string | number) => setFilterClientId(val as string)}
              options={[
                { value: 'all', label: 'SEMUA PELANGGAN' },
                ...uniqueClients.map(([id, name]) => ({ value: id.toString(), label: name.toUpperCase() }))
              ]}
              className="w-40"
              placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-[80vh] mb-4 flex flex-col overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto h-full custom-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">
              <TableRow className="hover:bg-transparent">
                <TableCell isHeader>ID</TableCell>
                <TableCell onClick={() => handleSort('date')} isHeader className="cursor-pointer">Tanggal</TableCell>
                <TableCell onClick={() => handleSort('number')} isHeader className="cursor-pointer">Nomor</TableCell>
                <TableCell onClick={() => handleSort('client')} isHeader className="cursor-pointer">Pelanggan</TableCell>
                <TableCell onClick={() => handleSort('total')} isHeader className="cursor-pointer text-right px-6">Total</TableCell>
                <TableCell onClick={() => handleSort('status')} isHeader className="cursor-pointer text-center">Status</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProformas.map(p => (
                <TableRow key={p.id} className="group hover:bg-indigo-50/30 transition-colors border-b border-gray-50/50 last:border-0">
                  <TableCell className="text-[10px] text-gray-500 py-5">#{p.id}</TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock size={12} strokeWidth={2.5} />
                      <Label className="text-[11px] ">{new Date(p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Label>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <Badge variant="success" className="gap-1.5 rounded-lg">
                      <FileCheck size={10} strokeWidth={2.5} />
                      <Label className="!text-emerald-600">{p.number}</Label>
                    </Badge>
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center  text-[10px] uppercase shadow-sm border border-indigo-100">{p.client?.name.charAt(0)}</div>
                      <div>
                        <Subtext className="text-xs text-gray-900 ">{p.client?.name}</Subtext>
                        <Subtext className="text-[10px] !text-gray-400 mt-1 uppercase  italic">{p.client?.client_company?.name || 'Personal'}</Subtext>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right  text-indigo-600 text-xs py-5 bg-indigo-50/5 group-hover:bg-indigo-50/20">{formatIDR(p.total)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.status === 'Paid' ? 'emerald' : p.status === 'Sent' ? 'sky' : 'neutral'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <ActionButton
                        icon={FileDown}
                        variant="emerald"
                        onClick={() => handleDownloadPDF(p)}
                        title="Unduh PDF"
                      />
                      <ActionButton
                        icon={FilePlus}
                        variant="indigo"
                        onClick={() => setRequestModal({ isOpen: true, proformaId: p.id, proformaStatus: p.status })}
                        title="Buat Request Berdasarkan Proforma"
                      />
                      <ActionButton
                        icon={Edit2}
                        variant="blue"
                        onClick={() => router.push(`/dashboard/sales/proformas/${p.id}`)}
                        title="Edit"
                      />
                      <ActionButton
                        icon={Trash2}
                        variant="rose"
                        onClick={() => setConfirmDelete({ isOpen: true, id: p.id, number: p.number })}
                        title="Hapus"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProformas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={<FileCheck size={48} className="mx-auto mb-4" />}
                      title="Belum ada proforma"
                      description="Belum ada data proforma yang tercatat"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, number: '' })}
        onConfirm={executeDelete}
        title="Hapus Proforma"
        itemName={confirmDelete.number}
        description={`Apakah Anda yakin ingin menghapus proforma ${confirmDelete.number}?`}
        variant="horizontal"
      />

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
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
            <Button
              variant="ghost"
              className="w-full justify-start !py-4 text-left border border-amber-200 bg-amber-50/50 hover:bg-amber-50"
              leftIcon={<FileText className="text-amber-500" size={18} />}
              onClick={() => router.push(`/dashboard/sales/invoice-requests/create?proformaId=${requestModal.proformaId}`)}
            >
              Request Invoice
            </Button>
          )}

          {requestCategories.map(cat => (
            <Button
              key={cat.id}
              variant="ghost"
              className="w-full justify-start !py-4 text-left border border-gray-200 uppercase"
              leftIcon={<FilePlus className="text-gray-400" size={18} />}
              onClick={() => router.push(`/dashboard/sales/requests/${cat.id}/create?proformaId=${requestModal.proformaId}`)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </Modal>
    </div>
  );
};
