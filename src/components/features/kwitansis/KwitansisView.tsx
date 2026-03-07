'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, H2, Subtext, Label, SearchInput, ComboBox, Toast, ToastType } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, Kwitansi } from '@/lib/types';
import {
  Plus, Search, Edit2, Trash2, Loader2, FileBadge,
  ChevronRight, ArrowUpDown, ChevronUp, ChevronDown,
  AlertTriangle, CheckCircle2, X, Filter,
  FileDown, Download
} from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
// Removed legacy NotificationModal import
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateTemplate1, generateTemplate5, generateTemplate6 } from '@/lib/pdf-templates';
import { useRouter } from 'next/navigation';

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

export const KwitansisView: React.FC<Props> = ({ company }) => {
  const router = useRouter();
  const [Kwitansis, setKwitansis] = useState<Kwitansi[]>([]);
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

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (!company?.id) return;
    if (isInitial) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kwitansis')
        .select('*, client:clients(*, client_company:client_companies(*)), kwitansi_items(*, products(*))')
        .eq('company_id', company.id)
        .order('id', { ascending: false });

      if (error) throw error;
      if (data) setKwitansis(data as any);
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const uniqueClients = useMemo(() => {
    const map = new Map();
    Kwitansis.forEach(inv => {
      if (inv.client) {
        map.set(inv.client.id, inv.client.name);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [Kwitansis]);

  const filteredKwitansis = useMemo(() => {
    let result = Kwitansis.filter(inv => {
      const matchesSearch = inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.client?.client_company?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClient = filterClientId === 'all' || inv.client_id === parseInt(filterClientId);
      const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;

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
  }, [Kwitansis, searchTerm, filterClientId, filterStatus, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('kwitansis').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null, number: '' });
      showToast(`Kwitansi ${confirmDelete.number} telah dihapus.`);
      fetchData();
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

  const handleDownloadPDF = async (inv: Kwitansi) => {
    const { data: templateSetting } = await supabase
      .from('document_template_settings')
      .select('*')
      .eq('company_id', company.id)
      .eq('document_type', 'kwitansi')
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
      const mainColor = '#4F46E5';
      const grayColor = '#9B9B9B';
      const rowLightColor = '#F5F5FF';

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
      safeText('Kwitansi', pageWidth - 100, startY + 15);

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
      safeText('Kwitansi NO', metaX, 55);
      safeText(':', metaX + 30, 55);
      safeText(inv.number, metaX + 35, 55);
      safeText('DATE', metaX, 61);
      safeText(':', metaX + 30, 61);
      safeText(formatDateString(inv.date), metaX + 35, 61);
      safeText('DUE DATE', metaX, 67);
      safeText(':', metaX + 30, 67);

      autoTable(doc, {
        startY: 95,
        head: [['Item / Description', 'Price', 'Qty', 'Total']],
        body: inv.kwitansi_items?.map(it => [
          `${it.products?.name || ''}\n${it.description || ''}`,
          formatIDR(it.price),
          `${it.qty} ${it.unit_name || ''}`,
          formatIDR(it.total)
        ]) || [],
        theme: 'plain',
        headStyles: { fillColor: mainColor, textColor: '#FFFFFF', fontSize: 11, fontStyle: 'bold', minCellHeight: 12, valign: 'middle', halign: 'left' },
        bodyStyles: { fillColor: '#FFFFFF', fontSize: 10, textColor: '#111111', minCellHeight: 14, valign: 'middle', halign: 'left' },
        alternateRowStyles: { fillColor: rowLightColor },
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
      config.document_type = 'kwitansi';
      const qData = { ...inv };
      await generateTemplate6(doc, qData, config, company, pageWidth, padX);
    } else {
      doc.setFillColor('#4F46E5');
      safeRect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      safeText('SALES Kwitansi', 20, 25);
      autoTable(doc, {
        startY: 50,
        head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
        body: inv.kwitansi_items?.map(it => [String(it.products?.name || ''), String(it.description || ''), `${it.qty} ${it.unit_name || ''}`, formatIDR(it.price), formatIDR(it.total)]) || [],
        theme: 'striped',
        headStyles: { fillColor: '#4F46E5' }
      });
    }

    doc.save(`${inv.number}.pdf`);
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24 gap-4"><Loader2 className="animate-spin text-blue-600" /><Subtext className="text-[10px]  uppercase  text-gray-400">Sinkronisasi Kwitansi...</Subtext></div>;

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl ">Daftar Kwitansi</H2>
            <Subtext className="text-[10px]  uppercase ">Kelola dan pantau seluruh tagihan pelanggan.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/dashboard/sales/kwitansis/create')}
              leftIcon={<Plus size={14} strokeWidth={3} />}
              className="!px-6 py-2.5 text-[10px] uppercase  shadow-lg shadow-blue-100"
              variant="primary"
              size="sm"
            >
              Buat Kwitansi
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

            <ComboBox
              value={filterStatus}
              onChange={(val: string | number) => setFilterStatus(val as string)}
              options={[
                { value: 'all', label: 'SEMUA STATUS' },
                { value: 'Unpaid', label: 'UNPAID' },
                { value: 'Partial', label: 'PARTIAL' },
                { value: 'Paid', label: 'PAID' },
              ]}
              className="w-40"
              hideSearch={true}
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
                <TableCell onClick={() => handleSort('date')} isHeader className="cursor-pointer">Tanggal</TableCell>
                <TableCell onClick={() => handleSort('number')} isHeader className="cursor-pointer">Nomor</TableCell>
                <TableCell onClick={() => handleSort('client')} isHeader className="cursor-pointer">Pelanggan</TableCell>
                <TableCell onClick={() => handleSort('total')} isHeader className="cursor-pointer text-center">Total</TableCell>
                <TableCell onClick={() => handleSort('status')} isHeader className="cursor-pointer text-center">Status</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKwitansis.map(inv => (
                <TableRow key={inv.id} className="group hover:bg-indigo-50/30 transition-colors border-b border-gray-50/50 last:border-0">
                  <TableCell className="py-5 px-6">
                    <Label className="text-[11px] text-gray-500">{formatDateString(inv.date)}</Label>
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <Button
                      onClick={() => router.push(`/dashboard/sales/kwitansis/${inv.id}`)}
                      className=" text-indigo-600 text-xs  hover:underline flex items-center gap-1.5"
                    >
                      <FileBadge size={12} className="text-indigo-400" />
                      {inv.number}
                    </Button>
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center  text-[10px] uppercase shadow-sm border border-indigo-100">{inv.client?.name.charAt(0)}</div>
                      <div>
                        <Subtext className="text-xs text-gray-900 ">{inv.client?.name}</Subtext>
                        <Subtext className="text-[10px] !text-gray-400 mt-1 uppercase  italic">{inv.client?.client_company?.name || 'Personal'}</Subtext>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right  text-indigo-600 text-xs py-5 px-6 bg-indigo-50/5 group-hover:bg-indigo-50/20">{formatIDR(inv.total)}</TableCell>
                  <TableCell className="text-center py-5 px-6">
                    <Label className={`px-3 py-1 rounded-full text-[9px]  uppercase  border transition-all duration-300 ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      inv.status === 'Partial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        inv.status === 'Unpaid' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-gray-50 text-gray-400 border-gray-200'
                      }`}>
                      {inv.status}
                    </Label>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <ActionButton
                        icon={FileDown}
                        variant="emerald"
                        onClick={() => handleDownloadPDF(inv)}
                        title="Unduh PDF"
                      />
                      <ActionButton
                        icon={Edit2}
                        variant="blue"
                        onClick={() => router.push(`/dashboard/sales/kwitansis/${inv.id}`)}
                        title="Edit"
                      />
                      <ActionButton
                        icon={Trash2}
                        variant="rose"
                        onClick={() => setConfirmDelete({ isOpen: true, id: inv.id, number: inv.number })}
                        title="Hapus"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredKwitansis.length === 0 && (
                <TableEmpty colSpan={6} message="Belum ada Kwitansi tercatat" icon={<FileBadge size={48} />} />
              )}
            </TableBody>
          </Table>
        </div>
      </div>


      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, number: '' })}
        onConfirm={executeDelete}
        title="Hapus Kwitansi"
        itemName={confirmDelete.number}
        isProcessing={isProcessing}
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
