'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Profile, Client, Quotation, ProformaInvoice } from '@/lib/types';
import { 
  ArrowLeft, Save, Loader2, User, FileText, FileCheck, 
  FileQuestion, AlertCircle, Info, ChevronRight, CheckCircle2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  company: Company;
  user: Profile;
  onNavigate?: (viewId: string) => void;
}

export const InvoiceRequestFormView: React.FC<Props> = ({ company, user, onNavigate }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [proformas, setProformas] = useState<ProformaInvoice[]>([]);
  
  const [clientId, setClientId] = useState('');
  const [refType, setRefType] = useState<'quotation' | 'proforma'>('quotation');
  const [docId, setDocId] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, qRes, pRes] = await Promise.all([
        supabase.from('clients').select('*, client_company:client_companies(*)').eq('company_id', company.id).order('name'),
        supabase.from('quotations').select('*').eq('company_id', company.id).eq('status', 'Accepted').order('id', { ascending: false }),
        supabase.from('proformas').select('*').eq('company_id', company.id).order('id', { ascending: false })
      ]);
      
      if (cRes.data) setClients(cRes.data);
      if (qRes.data) setQuotations(qRes.data);
      if (pRes.data) setProformas(pRes.data as any);
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredDocs = useMemo(() => {
    if (!clientId) return [];
    if (refType === 'quotation') {
      return quotations.filter(q => q.client_id === parseInt(clientId));
    } else {
      return proformas.filter(p => p.client_id === parseInt(clientId));
    }
  }, [clientId, refType, quotations, proformas]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !docId) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.from('invoice_requests').insert({
        company_id: company.id,
        requester_id: user.id,
        client_id: parseInt(clientId),
        quotation_id: refType === 'quotation' ? parseInt(docId) : null,
        proforma_id: refType === 'proforma' ? parseInt(docId) : null,
        notes: notes.trim(),
        status: 'Pending'
      });

      if (error) throw error;
      if (onNavigate) {
          onNavigate('request_invoice');
      } else {
        router.push('/dashboard/sales/invoice-requests');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24 gap-4"><Loader2 className="animate-spin text-blue-600" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Menyiapkan Form Request...</p></div>;

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/dashboard/sales/invoice-requests')} className="p-2.5 text-gray-400 hover:text-gray-900 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Buat Pengajuan Invoice</h1>
          <p className="text-sm text-gray-400 font-medium">Ajukan permintaan penagihan kepada tim finance.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <form onSubmit={handleSave} className="p-10 space-y-8">
           <div className="space-y-6">
              <div className="space-y-3">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Pilih Client Utama</label>
                 <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <select 
                      value={clientId}
                      onChange={e => { setClientId(e.target.value); setDocId(''); }}
                      className="w-full pl-12 pr-4 h-14 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all"
                      required
                    >
                       <option value="">-- Pilih Client --</option>
                       {clients.map(c => (
                         <option key={c.id} value={c.id}>{c.name} ({c.client_company?.name || 'Personal'})</option>
                       ))}
                    </select>
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Referensi Dokumen Asal</label>
                 <div className="flex gap-4 mb-4">
                    <button 
                      type="button" 
                      onClick={() => { setRefType('quotation'); setDocId(''); }}
                      className={`flex-1 p-4 rounded-2xl border transition-all flex items-center gap-3 ${refType === 'quotation' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-lg shadow-emerald-50' : 'bg-white border-gray-100 text-gray-400'}`}
                    >
                       <FileText size={20} />
                       <div className="text-left">
                          <p className="text-[10px] font-bold uppercase">Dari Penawaran</p>
                          <p className="text-[9px] font-medium opacity-60">Quotation</p>
                       </div>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setRefType('proforma'); setDocId(''); }}
                      className={`flex-1 p-4 rounded-2xl border transition-all flex items-center gap-3 ${refType === 'proforma' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-lg shadow-indigo-50' : 'bg-white border-gray-100 text-gray-400'}`}
                    >
                       <FileCheck size={20} />
                       <div className="text-left">
                          <p className="text-[10px] font-bold uppercase">Dari Proforma</p>
                          <p className="text-[9px] font-medium opacity-60">Proforma Invoice</p>
                       </div>
                    </button>
                 </div>

                 <div className="relative">
                    {refType === 'quotation' ? <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} /> : <FileCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />}
                    <select 
                      value={docId}
                      onChange={e => setDocId(e.target.value)}
                      disabled={!clientId}
                      className="w-full pl-12 pr-4 h-14 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:bg-white focus:border-blue-500 transition-all disabled:opacity-30"
                      required
                    >
                       <option value="">-- Pilih Dokumen --</option>
                       {filteredDocs.map((d: any) => (
                         <option key={d.id} value={d.id}>{d.number} - Rp {d.total.toLocaleString('id-ID')}</option>
                       ))}
                    </select>
                 </div>
                 {!clientId && <p className="text-[9px] text-gray-400 italic px-2">Silakan pilih client terlebih dahulu untuk melihat daftar dokumen.</p>}
                 {clientId && filteredDocs.length === 0 && <p className="text-[9px] text-rose-500 font-bold px-2">Tidak ada dokumen {refType} yang tersedia untuk client ini.</p>}
              </div>

              <div className="space-y-3">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Catatan Tambahan</label>
                 <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl h-32 resize-none font-medium text-xs outline-none focus:bg-white focus:border-blue-500 transition-all"
                  placeholder="Misal: Tagihan ini untuk termin 1, tolong segera diproses..."
                 />
              </div>
           </div>

           <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl flex gap-4">
              <Info size={24} className="text-blue-500 shrink-0" />
              <p className="text-[11px] text-blue-700 font-medium leading-relaxed">Setelah disimpan, permintaan akan muncul di dashboard admin finance untuk diproses menjadi Invoice Final. Anda dapat memantau statusnya di halaman utama Request Invoice.</p>
           </div>

           <div className="pt-6 border-t border-gray-50 flex justify-end">
              <button 
                type="submit" 
                disabled={isProcessing || !clientId || !docId}
                className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-30"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Kirim Pengajuan
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};
