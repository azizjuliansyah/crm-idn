'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Invoice } from '@/lib/types';
import { 
  Plus, Search, Edit2, Trash2, Loader2, FileBadge, 
  ChevronRight, ArrowUpDown, ChevronUp, ChevronDown, 
  AlertTriangle, CheckCircle2, X, Filter,
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
        .from('invoices')
        .select('*, client:clients(*, client_company:client_companies(*)), invoice_items(*, products(*))')
        .eq('company_id', company.id)
        .order('id', { ascending: false });
      
      if (error) throw error;
      if (data) setInvoices(data as any);
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
    invoices.forEach(inv => {
      if (inv.client) {
        map.set(inv.client.id, inv.client.name);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    let result = invoices.filter(inv => {
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
  }, [invoices, searchTerm, filterClientId, filterStatus, sortConfig]);

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
      const { error } = await supabase.from('invoices').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      setConfirmDelete({ isOpen: false, id: null, number: '' });
      showNotification('Berhasil', `Invoice ${confirmDelete.number} telah dihapus.`);
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

  if (loading) return <div className="flex flex-col items-center justify-center py-24 gap-4"><Loader2 className="animate-spin text-blue-600" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sinkronisasi Invoice...</p></div>;

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
                {uniqueClients.map(([id, name]) => (<option key={id} value={id}>{name}</option>))}
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
                 <option value="Unpaid">Unpaid</option>
                 <option value="Partial">Partial</option>
                 <option value="Paid">Paid</option>
              </select>
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 pointer-events-none" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={12} />
            </div>
          </div>
        </div>

        <button 
          onClick={() => router.push('/dashboard/sales/invoices/create')}
          className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={14} /> Buat Invoice
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
              {filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50/30 group transition-colors">
                  <td className="px-8 py-6 text-xs font-bold text-gray-500">{formatDateString(inv.date)}</td>
                  <td className="px-8 py-6">
                     <button onClick={() => router.push(`/dashboard/sales/invoices/${inv.id}`)} className="font-bold text-blue-600 text-xs tracking-tight hover:underline text-left">{inv.number}</button>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-gray-900">{inv.client?.name || 'Umum'}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-1 italic">{inv.client?.client_company?.name || 'Personal'}</p>
                  </td>
                  <td className="px-8 py-6 text-right font-bold text-blue-600 text-xs">{formatIDR(inv.total)}</td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter border ${
                      inv.status === 'Unpaid' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      inv.status === 'Partial' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      'bg-gray-50 text-gray-400 border-gray-200'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDownloadPDF(inv)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Unduh PDF"><FileDown size={14} /></button>
                      <button onClick={() => router.push(`/dashboard/sales/invoices/${inv.id}`)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                      <button onClick={() => setConfirmDelete({ isOpen: true, id: inv.id, number: inv.number })} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                   <td colSpan={6} className="py-24 text-center opacity-30 italic">
                      <FileBadge size={48} className="mx-auto mb-4" />
                      <p className="text-xs font-bold uppercase tracking-widest">Belum ada invoice tercatat</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }`}</style>
      
      <Modal isOpen={confirmDelete.isOpen} onClose={() => setConfirmDelete({ isOpen: false, id: null, number: '' })} title="Hapus Invoice" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6"><AlertTriangle size={32} /></div>
          <p className="text-lg font-bold text-gray-900 tracking-tight">Hapus {confirmDelete.number}?</p>
          <div className="flex w-full gap-3 mt-8">
             <button onClick={() => setConfirmDelete({ isOpen: false, id: null, number: '' })} className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold text-[10px] uppercase tracking-widest rounded-lg">Batal</button>
             <button onClick={executeDelete} disabled={isProcessing} className="flex-1 py-4 bg-rose-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow-lg flex items-center justify-center gap-2">{isProcessing && <Loader2 className="animate-spin" size={14} />} Ya, Hapus</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} title="" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
           <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{notification.type === 'success' ? <CheckCircle2 size={32} /> : <X size={32} />}</div>
           <h3 className="text-lg font-bold text-gray-900 mb-2">{notification.title}</h3>
           <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">{notification.message}</p>
           <button onClick={() => setNotification({ ...notification, isOpen: false })} className="w-full py-4 bg-gray-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-black transition-all">Tutup</button>
        </div>
      </Modal>
    </div>
  );
};
