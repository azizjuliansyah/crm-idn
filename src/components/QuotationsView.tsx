'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Quotation } from '@/lib/types';
import { 
  Plus, Search, Edit2, Trash2, Loader2, FileText, 
  ChevronRight, ArrowUpDown, ChevronUp, ChevronDown, 
  AlertTriangle, CheckCircle2, MoreVertical, X, Filter,
  FileDown
} from 'lucide-react';
import { Modal } from './Modal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('*, client:clients(*, client_company:client_companies(*)), quotation_items(*, products(*))')
        .eq('company_id', company.id)
        .order('id', { ascending: false });
      
      if (error) throw error;
      if (data) setQuotations(data);
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
        switch(sortConfig.key) {
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
         } catch(e) {}
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

  if (loading) return <div className="flex flex-col items-center justify-center py-24 gap-4"><Loader2 className="animate-spin text-blue-600" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sinkronisasi Penawaran...</p></div>;

  return (
    <div className="flex flex-col gap-6 h-full text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] max-w-[320px] flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
            <input 
              type="text" 
              placeholder="Cari nomor, client..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:bg-white transition-all text-[11px] font-bold" 
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <select 
                value={filterClientId}
                onChange={e => setFilterClientId(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-500 outline-none hover:border-blue-100 transition-all cursor-pointer appearance-none shadow-sm min-w-[150px]"
              >
                <option value="all">Semua Pelanggan</option>
                {uniqueClients.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={12} />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={12} />
            </div>

            <div className="relative group">
              <select 
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-500 outline-none hover:border-blue-100 transition-all cursor-pointer appearance-none shadow-sm min-w-[130px]"
              >
                <option value="all">Semua Status</option>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Declined">Declined</option>
              </select>
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 pointer-events-none" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={12} />
            </div>
          </div>
        </div>

        <button 
          onClick={() => router.push('/dashboard/sales/quotations/create')}
          className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={14} /> Buat Penawaran
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex-1">
        <div className="overflow-x-auto h-full custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
              <tr>
                <th onClick={() => handleSort('date')} className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer">Tanggal</th>
                <th onClick={() => handleSort('number')} className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer">Nomor</th>
                <th onClick={() => handleSort('client')} className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer">Pelanggan</th>
                <th onClick={() => handleSort('total')} className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer text-right">Total</th>
                <th onClick={() => handleSort('status')} className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredQuotations.map(q => (
                <tr key={q.id} className="hover:bg-gray-50/30 group transition-colors">
                  <td className="px-8 py-6 text-xs font-bold text-gray-500">{formatDateString(q.date)}</td>
                  <td className="px-8 py-6">
                     <button 
                       onClick={() => router.push(`/dashboard/sales/quotations/${q.id}`)}
                       className="font-bold text-blue-600 text-xs tracking-tight hover:underline text-left"
                     >
                        {q.number}
                     </button>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-gray-900">{q.client?.name || 'Umum'}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-1 italic">
                      {q.client?.client_company?.name || 'Personal'}
                    </p>
                  </td>
                  <td className="px-8 py-6 text-right font-bold text-blue-600 text-xs">{formatIDR(q.total)}</td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter border ${
                      q.status === 'Draft' ? 'bg-gray-50 text-gray-400 border-gray-200' :
                      q.status === 'Sent' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      q.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDownloadPDF(q)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Unduh PDF"><FileDown size={14} /></button>
                      <button 
                        onClick={() => router.push(`/dashboard/sales/quotations/${q.id}`)} 
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete({ isOpen: true, id: q.id, number: q.number })} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredQuotations.length === 0 && (
                <tr>
                   <td colSpan={6} className="py-24 text-center opacity-30 italic">
                      <FileText size={48} className="mx-auto mb-4" />
                      <p className="text-xs font-bold uppercase tracking-widest">Belum ada penawaran tercatat</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }`}</style>
      
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
          <p className="text-lg font-bold text-gray-900 tracking-tight">Hapus {confirmDelete.number}?</p>
          <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2 mb-8">
             Tindakan ini permanen. Seluruh data item rincian pajak pada penawaran ini akan hilang selamanya.
          </p>
          <div className="flex w-full gap-3">
             <button 
               onClick={() => setConfirmDelete({ isOpen: false, id: null, number: '' })}
               className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all"
             >
               Batal
             </button>
             <button 
               onClick={executeDelete}
               disabled={isProcessing}
               className="flex-1 py-4 bg-rose-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow-lg shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
               {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Ya, Hapus
             </button>
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
           <h3 className="text-lg font-bold text-gray-900 mb-2">{notification.title}</h3>
           <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
             {notification.message}
           </p>
           <button 
             onClick={() => setNotification({ ...notification, isOpen: false })}
             className="w-full py-4 bg-gray-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-black transition-all"
           >
             Tutup
           </button>
        </div>
      </Modal>
    </div>
  );
};

