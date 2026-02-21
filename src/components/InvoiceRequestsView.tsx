'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, InvoiceRequest } from '@/lib/types';
import { 
  Plus, Search, Loader2, FileQuestion, 
  ChevronRight, ArrowUpDown, ChevronUp, ChevronDown, 
  AlertTriangle, CheckCircle2, X, Filter,
  FileText, Clock, User, Building,
  FileCheck, Check, Trash2
} from 'lucide-react';
import { Modal } from './Modal';
import { useRouter } from 'next/navigation';

interface Props {
  company: Company;
}

type SortKey = 'id' | 'client' | 'status' | 'created_at';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

export const InvoiceRequestsView: React.FC<Props> = ({ company }) => {
  const router = useRouter();
  const [requests, setRequests] = useState<InvoiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'desc' });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({ isOpen: false, id: null });
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ 
    isOpen: false, title: '', message: '', type: 'success' 
  });

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoice_requests')
        .select('*, profiles(*), client:clients(*, client_company:client_companies(*)), quotation:quotations(number), proforma:proformas(number)')
        .eq('company_id', company.id)
        .order('id', { ascending: false });
      
      if (error) throw error;
      if (data) setRequests(data as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        let valA: any, valB: any;
        switch(sortConfig.key) {
          case 'client': valA = a.client?.name || ''; valB = b.client?.name || ''; break;
          case 'status': valA = a.status; valB = b.status; break;
          case 'created_at': valA = a.created_at; valB = b.created_at; break;
          default: valA = a.id; valB = b.id;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
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
      setNotification({ isOpen: true, title: 'Berhasil', message: `Request telah di-${newStatus.toLowerCase()}.`, type: 'success' });
      fetchData();
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal', message: err.message, type: 'error' });
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
      setNotification({ isOpen: true, title: 'Gagal', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Rejected': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24 gap-4"><Loader2 className="animate-spin text-blue-600" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Request Invoice...</p></div>;

  return (
    <div className="flex flex-col gap-6 h-full text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px] max-w-[320px] flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
            <input 
              type="text" 
              placeholder="Cari client atau nomor..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:bg-white transition-all text-[11px] font-bold" 
            />
          </div>

          <div className="relative group">
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-500 outline-none hover:border-blue-100 transition-all cursor-pointer appearance-none shadow-sm"
            >
              <option value="all">Semua Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={12} />
          </div>
        </div>

        <button 
          onClick={() => router.push('/dashboard/sales/invoice-requests/create')}
          className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={14} /> Request Baru
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex-1">
        <div className="overflow-x-auto h-full custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
              <tr>
                <th onClick={() => handleSort('id')} className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer">ID</th>
                <th onClick={() => handleSort('created_at')} className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer">Tanggal</th>
                <th onClick={() => handleSort('client')} className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer">Pelanggan</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Referensi</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Pemohon</th>
                <th onClick={() => handleSort('status')} className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 cursor-pointer text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRequests.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/30 group transition-colors">
                  <td className="px-8 py-6 text-[10px] font-bold text-gray-400">#{r.id}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock size={12} />
                      <span className="text-xs font-bold">{new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] uppercase">{r.client?.name.charAt(0)}</div>
                       <div>
                          <p className="text-xs font-bold text-gray-900 leading-tight">{r.client?.name}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{r.client?.client_company?.name || 'Personal'}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {r.quotation ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full w-fit">
                        <FileText size={10} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{r.quotation.number}</span>
                      </div>
                    ) : r.proforma ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full w-fit">
                        <FileCheck size={10} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{r.proforma.number}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-300 italic">No Ref</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <User size={12} className="text-gray-300" />
                       <span className="text-[11px] font-bold text-gray-600">{r.profile?.full_name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter border ${getStatusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {r.status === 'Pending' && (
                        <>
                          <button onClick={() => handleUpdateStatus(r.id, 'Approved')} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Approve"><Check size={16} /></button>
                          <button onClick={() => handleUpdateStatus(r.id, 'Rejected')} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg" title="Reject"><X size={16} /></button>
                        </>
                      )}
                      <button onClick={() => setConfirmDelete({ isOpen: true, id: r.id })} className="p-2 text-gray-300 hover:text-rose-500" title="Hapus"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                   <td colSpan={7} className="py-24 text-center opacity-30 italic">
                      <FileQuestion size={48} className="mx-auto mb-4" />
                      <p className="text-xs font-bold uppercase tracking-widest">Belum ada request invoice</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={confirmDelete.isOpen} onClose={() => setConfirmDelete({ isOpen: false, id: null })} title="Hapus Request" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6"><AlertTriangle size={32} /></div>
          <p className="text-sm font-bold text-gray-600 leading-relaxed mb-8">Apakah Anda yakin ingin menghapus catatan permintaan invoice ini?</p>
          <div className="flex w-full gap-3">
             <button onClick={() => setConfirmDelete({ isOpen: false, id: null })} className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold text-[10px] uppercase rounded-lg">Batal</button>
             <button onClick={executeDelete} disabled={isProcessing} className="flex-1 py-4 bg-rose-600 text-white font-bold text-[10px] uppercase rounded-lg shadow-lg">{isProcessing ? <Loader2 className="animate-spin" size={14} /> : "Ya, Hapus"}</button>
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
