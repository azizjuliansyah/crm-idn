'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Button, Table, TableHeader, TableBody, TableRow, TableCell, H2, H3, Subtext, Label, Modal, EmptyState, SearchInput, Badge, ComboBox } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, Quotation, SalesRequestCategory } from '@/lib/types';
import {
  Plus, Search, Edit2, Trash2, Loader2, FileText,
  ChevronRight, ArrowUpDown, ChevronUp, ChevronDown,
  AlertTriangle, CheckCircle2, MoreVertical, X, Filter,
  FileDown, FileCheck, FilePlus,
  Clock
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateTemplate1, generateTemplate5, generateTemplate6 } from '@/lib/pdf-templates';
import { useRouter } from 'next/navigation';

interface Props {
  company: Company;
}

type SortKey = 'number' | 'client' | 'date' | 'total' | 'status';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

// Helper to load image and get dimensions for jsPDF
const getImgDimensions = (url: string): Promise<{ width: number, height: number, element: HTMLImageElement }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve({ width: img.width, height: img.height, element: img });
    img.onerror = reject;
    img.src = url;
  });
};

export const QuotationsView: React.FC<Props> = ({ company }) => {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [requestCategories, setRequestCategories] = useState<SalesRequestCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClientId, setFilterClientId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id' as any, direction: 'desc' });

  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; number: string }>({ isOpen: false, id: null, number: '' });
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({
    isOpen: false, title: '', message: '', type: 'success'
  });
  const [requestModal, setRequestModal] = useState<{ isOpen: boolean; quotationId: number | null; quotationStatus: string }>({ isOpen: false, quotationId: null, quotationStatus: '' });

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const [qRes, catRes] = await Promise.all([
        supabase
          .from('quotations')
          .select('*, client:clients(*, client_company:client_companies(*)), quotation_items(*, products(*))')
          .eq('company_id', company.id)
          .order('id', { ascending: false }),
        supabase
          .from('sales_request_categories')
          .select('*')
          .eq('company_id', company.id)
          .order('sort_order', { ascending: false })
      ]);

      if (qRes.error) throw qRes.error;
      if (qRes.data) setQuotations(qRes.data);
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

  const uniqueClients = useMemo(() => {
    const map = new Map();
    quotations.forEach(q => {
      if (q.client) {
        map.set(q.client.id, q.client.name);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [quotations]);

  const filteredQuotations = useMemo(() => {
    let result = quotations.filter(q => {
      const matchesSearch = q.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.client?.client_company?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClient = filterClientId === 'all' || q.client_id === parseInt(filterClientId);
      const matchesStatus = filterStatus === 'all' || q.status === filterStatus;

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
  }, [quotations, searchTerm, filterClientId, filterStatus, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev?.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  const showNotification = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ isOpen: true, title, message, type });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('quotations').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null, number: '' });
      showNotification('Berhasil', `Penawaran ${confirmDelete.number} telah dihapus.`);
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

  const handleDownloadPDF = async (q: Quotation) => {
    const { data: templateSetting } = await supabase
      .from('document_template_settings')
      .select('*')
      .eq('company_id', company.id)
      .eq('document_type', 'quotation')
      .maybeSingle();

    const templateId = templateSetting?.template_id || 'template1';
    const config = templateSetting?.config || {};

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const tealColor = '#55C7C7';
    const gray2Color = '#9B9B9B';
    const rowTealColor = '#2596BE'; // Ganjil
    const rowLightColor = '#F2F9FB'; // Genap
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
      doc.setFontSize(8.5);
      doc.setTextColor(17, 17, 17);
      doc.setFont('helvetica', 'normal');
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
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          safeText(company.name, padX, startY + 12);
        }
      } else {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        safeText(company.name, padX, startY + 12);
      }

      doc.setFillColor(tealColor);
      safeRect(pageWidth - 110, startY, 110, bannerHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(38);
      doc.setFont('helvetica', 'bold');
      safeText('PENAWARAN', pageWidth - 100, startY + 15);

      doc.setTextColor(17, 17, 17);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      safeText('INVOICE TO:', padX, 55);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      safeText(q.client?.client_company?.name || 'PERORANGAN', padX, 62);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const upName = `${q.client?.salutation || ''} ${q.client?.name || ''}`.trim();
      safeText(upName, padX, 68);
      safeText(`P: ${String(q.client?.whatsapp || '-')}`, padX, 74);
      safeText(`E: ${String(q.client?.email || '-')}`, padX, 79);

      const metaX = 130;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      safeText('QUOTATION NO', metaX, 55);
      safeText(':', metaX + 30, 55);
      safeText(q.number || '', metaX + 35, 55);

      safeText('DATE', metaX, 61);
      safeText(':', metaX + 30, 61);
      safeText(formatDateString(q.date), metaX + 35, 61);

      safeText('DUE DATE', metaX, 67);
      safeText(':', metaX + 30, 67);
      doc.setFont('helvetica', 'bold');
      safeText(formatDateString(q.expiry_date), metaX + 35, 67);

      autoTable(doc, {
        startY: 95,
        head: [['Item / Description', 'Price', 'Qty', 'Total']],
        body: q.quotation_items?.map(it => [
          `${it.products?.name || ''}\n${it.description || ''}`,
          formatIDR(it.price),
          `${it.qty} ${it.unit_name || ''}`,
          formatIDR(it.total)
        ]) || [],
        theme: 'plain',
        headStyles: {
          fillColor: tealColor,
          textColor: '#FFFFFF',
          fontSize: 11,
          fontStyle: 'bold',
          minCellHeight: 12,
          valign: 'middle',
          halign: 'left'
        },
        bodyStyles: {
          fillColor: rowLightColor, // Warna default genap
          fontSize: 10,
          textColor: '#111111',
          minCellHeight: 14,
          valign: 'middle',
          halign: 'left'
        },
        alternateRowStyles: {
          fillColor: rowTealColor, // Warna ganjil
          textColor: '#FFFFFF'
        },
        columnStyles: {
          0: { cellWidth: 100, halign: 'left', cellPadding: { left: padX, top: 4, right: 4, bottom: 4 } },
          1: { cellWidth: 40, halign: 'left', cellPadding: { left: 4, top: 4, right: 4, bottom: 4 } },
          2: { cellWidth: 25, halign: 'left', cellPadding: { left: 4, top: 4, right: 4, bottom: 4 } },
          3: { cellWidth: 45, halign: 'left', cellPadding: { left: 4, top: 4, right: padX, bottom: 4 } }
        },
        margin: { left: 0, right: 0 },
        tableWidth: pageWidth,
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const lines = data.cell.text;
            if (lines && Array.isArray(lines) && lines.length > 0) {
              const productName = String(lines[0] || '');
              const descriptionLines = lines.slice(1);

              doc.setFillColor(data.cell.styles.fillColor as string);
              safeRect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');

              let padLeft = 0;
              let padTop = 0;
              if (data.cell.styles.cellPadding) {
                if (typeof data.cell.styles.cellPadding === 'object') {
                  padLeft = safeNum((data.cell.styles.cellPadding as any).left, 0);
                  padTop = safeNum((data.cell.styles.cellPadding as any).top, 0);
                } else {
                  padLeft = safeNum(data.cell.styles.cellPadding, 0);
                  padTop = safeNum(data.cell.styles.cellPadding, 0);
                }
              }

              const startX = data.cell.x + padLeft;
              let currentY = data.cell.y + padTop + 4;

              if (productName) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(data.cell.styles.textColor as string);
                doc.setFontSize(10);
                safeText(productName, startX, currentY);
              }

              if (descriptionLines.length > 0) {
                doc.setFont('helvetica', 'normal');
                // Make description a bit lighter than product name for contrast
                const isTealRow = (data.cell.styles.fillColor as string).toLowerCase() === rowTealColor.toLowerCase();
                doc.setTextColor(isTealRow ? '#E0F2F7' : '#505050');
                doc.setFontSize(9);
                currentY += 5;
                const descText = descriptionLines.join('\n');
                if (descText.trim()) {
                  safeText(descText, startX, currentY);
                }
              }
            }
          }
        }
      });

      const finalY = safeNum((doc as any).lastAutoTable?.finalY, 150);

      doc.setFillColor(gray2Color);
      safeRect(0, finalY + 5, 84, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      safeText(`Due Date: ${formatDateString(q.expiry_date)}`, padX, finalY + 10.5);

      doc.setTextColor(17, 17, 17);
      const summaryLabelX = 130;
      const summaryValueX = pageWidth - padX;

      safeText('Sub Total', summaryLabelX, finalY + 10.5);
      safeText(formatIDR(q.subtotal), summaryValueX, finalY + 10.5, { align: 'right' });

      let currentTotalY = finalY + 10.5;

      if (q.discount_value > 0) {
        currentTotalY += 8;
        safeText('Diskon', summaryLabelX, currentTotalY);
        safeText(`-${formatIDR(q.discount_value)}`, summaryValueX, currentTotalY, { align: 'right' });
      }

      if (q.tax_value > 0) {
        currentTotalY += 8;
        safeText('Pajak', summaryLabelX, currentTotalY);
        safeText(formatIDR(q.tax_value), summaryValueX, currentTotalY, { align: 'right' });
      }

      const grandTotalY = currentTotalY + 5.5;
      doc.setFillColor(tealColor);
      safeRect(120, grandTotalY, 90, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      safeText('Grand Total', summaryLabelX, grandTotalY + 6.5);
      safeText(formatIDR(q.total), summaryValueX, grandTotalY + 6.5, { align: 'right' });

      const bottomY = grandTotalY + 30;
      doc.setTextColor(17, 17, 17);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      safeText('Payment via Bank Transfer:', padX, bottomY);
      doc.setFont('helvetica', 'normal');
      safeText(config.payment_info || '-', padX, bottomY + 6);

      doc.setFont('helvetica', 'bold');
      safeText('Note:', padX, bottomY + 18);
      doc.setFont('helvetica', 'normal');
      safeText(config.note_footer || '-', padX, bottomY + 24, { maxWidth: 80 });

      const sigX = pageWidth - 55;
      if (config.signature_url) {
        try {
          const { width, height, element } = await getImgDimensions(config.signature_url);
          const maxWidth = 50;
          const maxHeight = 25;
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          const finalWidth = width * ratio;
          const finalHeight = height * ratio;

          doc.addImage(element, 'PNG', safeNum(sigX - finalWidth / 2), safeNum(bottomY - 5 + (maxHeight - finalHeight) / 2), finalWidth, finalHeight, undefined, 'FAST');
        } catch (e) { }
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        safeText('[signature image]', sigX, bottomY + 10, { align: 'center' });
      }

      doc.setTextColor(17, 17, 17);
      doc.setFontSize(10);
      // Pepetin spacing (reduced from bottomY + 30/35 to +22/27)
      doc.setFont('helvetica', 'normal');
      safeText(config.signature_name || '', sigX, bottomY + 22, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      safeText(config.signature_company || '', sigX, bottomY + 27, { align: 'center' });

      doc.setFillColor(143, 143, 143);
      safeRect(0, pageHeight - 16, pageWidth, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      safeText(config.footer_bar_text || 'Thank you for your business', pageWidth / 2, pageHeight - 11.5, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      safeText(config.footer_text || '', pageWidth / 2, pageHeight - 5, { align: 'center' });
    } else if (templateId === 'template6') {
      config.document_type = 'quotation';
      const qData = { ...q };
      await generateTemplate6(doc, qData, config, company, pageWidth, padX);
    } else {
      doc.setFillColor('#4F46E5');
      safeRect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      safeText('PENAWARAN HARGA', 20, 25);

      autoTable(doc, {
        startY: 50,
        head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
        body: q.quotation_items?.map(it => [
          String(it.products?.name || it.description || 'Produk'),
          String(it.description || '-'),
          `${it.qty} ${it.unit_name || ''}`,
          formatIDR(it.price),
          formatIDR(it.total)
        ]) || [],
        theme: 'striped',
        headStyles: { fillColor: '#4F46E5', fontSize: 9, halign: 'center' },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } }
      });
    }

    doc.save(`${q.number}.pdf`);
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24 gap-4"><Loader2 className="animate-spin text-blue-600" /><Subtext className="text-[10px]  uppercase tracking-tight text-gray-400">Sinkronisasi Penawaran...</Subtext></div>;

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl ">Daftar Penawaran</H2>
            <Subtext className="text-[10px]  uppercase tracking-tight">Kelola dan pantau seluruh penawaran pelanggan.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/dashboard/sales/quotations/create')}
              leftIcon={<Plus size={14} strokeWidth={3} />}
              className="!px-6 py-2.5 text-[10px] uppercase tracking-tight shadow-lg shadow-blue-100"
              variant="primary"
              size="sm"
            >
              Buat Penawaran
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
              value={filterStatus}
              onChange={(val: string | number) => setFilterStatus(val as string)}
              options={[
                { value: 'all', label: 'SEMUA STATUS' },
                ...['Draft', 'Sent', 'Accepted', 'Declined'].map(s => ({ value: s, label: s.toUpperCase() }))
              ]}
              className="w-40"
              hideSearch={true}
              placeholderSize="text-[10px] font-bold text-gray-900 uppercase tracking-tight"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-[80vh] mb-4 flex flex-col overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto h-full scrollbar-hide">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">
              <TableRow className="hover:bg-transparent">
                <TableCell isHeader>ID</TableCell>
                <TableCell onClick={() => handleSort('date')} isHeader className="cursor-pointer">Tanggal</TableCell>
                <TableCell onClick={() => handleSort('number')} isHeader className="cursor-pointer">Nomor</TableCell>
                <TableCell onClick={() => handleSort('client')} isHeader className="cursor-pointer">Pelanggan</TableCell>
                <TableCell onClick={() => handleSort('total')} isHeader className="cursor-pointer text-center">Total</TableCell>
                <TableCell onClick={() => handleSort('status')} isHeader className="cursor-pointer text-center">Status</TableCell>
                <TableCell isHeader className="text-center">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotations.map(q => (
                <TableRow key={q.id} className="group hover:bg-indigo-50/30 transition-colors border-b border-gray-50/50 last:border-0">
                  <TableCell className="text-[10px] text-gray-500 py-5">#{q.id}</TableCell>
                  <TableCell className="py-5">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock size={12} strokeWidth={2.5} />
                      <Label className="text-[11px] ">{new Date(q.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Label>
                    </div>
                  </TableCell>
                  <TableCell className="py-5">
                    <Badge variant="secondary" className="gap-1.5 rounded-lg">
                      <FileCheck size={10} strokeWidth={2.5} />
                      <Label className="!text-indigo-600">{q.number}</Label>
                    </Badge>
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center  text-[10px] uppercase shadow-sm border border-indigo-100">{q.client?.name.charAt(0)}</div>
                      <div>
                        <Subtext className="text-xs text-gray-900 tracking-tight">{q.client?.name}</Subtext>
                        <Subtext className="text-[10px] !text-gray-400 mt-1 uppercase tracking-tight italic">{q.client?.client_company?.name || 'Personal'}</Subtext>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-indigo-600 text-xs py-5 px-6 bg-indigo-50/5 group-hover:bg-indigo-50/20">{formatIDR(q.total)}</TableCell>
                  <TableCell className="text-center py-5 px-6">
                    <Badge variant={
                      q.status === 'Draft' ? 'neutral' :
                        q.status === 'Sent' ? 'indigo' :
                          q.status === 'Accepted' ? 'emerald' :
                            'rose'
                    }>
                      {q.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadPDF(q)}
                        className="!p-2 !text-emerald-500 hover:!bg-emerald-50 rounded-lg transition-colors"
                        title="Unduh PDF"
                      >
                        <FileDown size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRequestModal({ isOpen: true, quotationId: q.id, quotationStatus: q.status })}
                        className="!p-2 !text-indigo-500 hover:!bg-indigo-50 rounded-lg transition-colors"
                        title="Buat Request Tambahan"
                      >
                        <FilePlus size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/sales/quotations/${q.id}`)}
                        className="!p-2 !text-blue-500 hover:!bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDelete({ isOpen: true, id: q.id, number: q.number })}
                        className="!p-2 !text-rose-700 !bg-transparent hover:!bg-rose-50 shadow-none hover:border-rose-200 transition-all border border-transparent rounded-lg"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredQuotations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState icon={<FileText size={48} />} title="Belum ada penawaran tercatat" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, number: '' })}
        title="Hapus Penawaran"
        size="sm"
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle size={32} />
          </div>
          <Subtext className="text-lg  text-gray-900 tracking-tight">Hapus {confirmDelete.number}?</Subtext>
          <Subtext className="text-sm text-gray-500 font-medium leading-relaxed mt-2 mb-8">
            Tindakan ini permanen. Seluruh data item rincian pajak pada penawaran ini akan hilang selamanya.
          </Subtext>
          <div className="flex w-full gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete({ isOpen: false, id: null, number: '' })}
              className="flex-1 !py-4"
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={executeDelete}
              isLoading={isProcessing}
              leftIcon={<Trash2 size={14} />}
              className="flex-1 !py-4"
            >
              Ya, Hapus
            </Button>
          </div>
        </div>
      </Modal>



      <Modal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title=""
        size="sm"
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={32} /> : <X size={32} />}
          </div>
          <H3 className="text-lg  text-gray-900 mb-2">{notification.title}</H3>
          <Subtext className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
            {notification.message}
          </Subtext>
          <Button
            onClick={() => setNotification({ ...notification, isOpen: false })}
            className="w-full !py-4 bg-gray-900 hover:bg-black text-white"
          >
            Tutup
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={requestModal.isOpen}
        onClose={() => setRequestModal({ isOpen: false, quotationId: null, quotationStatus: '' })}
        title="Buat Request untuk Penawaran Ini"
        size="md"
      >
        <div className="flex flex-col gap-3 py-4">
          <Subtext className="text-sm text-gray-500 mb-2">Silakan pilih jenis request yang ingin Anda ajukan berdasarkan penawaran ini:</Subtext>

          {requestModal.quotationStatus === 'Accepted' && (
            <Button
              variant="ghost"
              className="w-full justify-start !py-4 text-left border border-amber-200 bg-amber-50/50 hover:bg-amber-50"
              leftIcon={<FileCheck className="text-amber-500" size={18} />}
              onClick={() => router.push(`/dashboard/sales/proformas/create?quotationId=${requestModal.quotationId}`)}
            >
              Jadikan Proforma
            </Button>
          )}

          {requestCategories.map(cat => (
            <Button
              key={cat.id}
              variant="ghost"
              className="w-full justify-start !py-4 text-left border border-gray-200 uppercase"
              leftIcon={<FilePlus className="text-gray-400" size={18} />}
              onClick={() => router.push(`/dashboard/sales/requests/${cat.id}/create?quotationId=${requestModal.quotationId}`)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </Modal>
    </div>
  );
};

