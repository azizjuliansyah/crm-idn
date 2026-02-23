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
import { 
  Button, Input, Select, Table, TableHeader, 
  TableRow, TableCell, TableBody, TableEmpty, Badge,
  SearchInput, H1, H2, Subtext
} from '@/components/ui';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { NotificationModal } from '@/components/shared/modals/NotificationModal';
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

  const getStatusVariant = (status: string): 'success' | 'danger' | 'warning' | 'secondary' => {
    switch (status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'danger';
      default: return 'warning';
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-2xl border border-gray-100 min-h-[400px]"><Loader2 className="animate-spin text-indigo-600" size={32} /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Request Invoice...</p></div>;

  return (
    <div className="flex flex-col gap-6 h-full text-gray-900">
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-[400px]">
            <SearchInput 
              placeholder="Cari client atau nomor..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="rounded-xl border-gray-100 shadow-none bg-gray-50/30"
            />
          </div>
 
          <div className="w-[200px]">
            <Select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="!text-[10px] !font-black uppercase tracking-widest text-gray-400 w-full"
            >
              <option value="all">SEMUA STATUS</option>
              <option value="Pending">PENDING</option>
              <option value="Approved">APPROVED</option>
              <option value="Rejected">REJECTED</option>
            </Select>
          </div>
        </div>
 
        <Button 
          onClick={() => router.push('/dashboard/sales/invoice-requests/create')}
          variant="primary"
          className="!px-6 py-2.5 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 shrink-0 ml-auto"
        >
          <div className="flex items-center gap-2">
            <Plus size={14} strokeWidth={3} />
            <span>Request Baru</span>
          </div>
        </Button>
      </div>
 
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex-1">
        <Table>
            <TableHeader className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">
              <TableRow className="hover:bg-transparent">
                <TableCell onClick={() => handleSort('id')} className="font-black text-gray-400 uppercase tracking-widest cursor-pointer text-[10px] py-4 px-6">ID</TableCell>
                <TableCell onClick={() => handleSort('created_at')} className="font-black text-gray-400 uppercase tracking-widest cursor-pointer text-[10px] py-4 px-6">Tanggal</TableCell>
                <TableCell onClick={() => handleSort('client')} className="font-black text-gray-400 uppercase tracking-widest cursor-pointer text-[10px] py-4 px-6">Pelanggan</TableCell>
                <TableCell className="font-black text-gray-400 uppercase tracking-widest text-[10px] py-4 px-6">Referensi</TableCell>
                <TableCell className="font-black text-gray-400 uppercase tracking-widest text-[10px] py-4 px-6">Pemohon</TableCell>
                <TableCell onClick={() => handleSort('status')} className="font-black text-gray-400 uppercase tracking-widest cursor-pointer text-center text-[10px] py-4 px-6">Status</TableCell>
                <TableCell className="font-black text-gray-400 uppercase tracking-widest text-center text-[10px] py-4 px-6">Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map(r => (
                <TableRow key={r.id} className="group hover:bg-indigo-50/30 transition-colors border-b border-gray-50/50 last:border-0">
                  <TableCell className="text-[10px] font-bold text-gray-400 py-5 px-6">#{r.id}</TableCell>
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock size={12} strokeWidth={2.5} />
                      <span className="text-[11px] font-bold">{new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] uppercase shadow-sm border border-indigo-100">{r.client?.name.charAt(0)}</div>
                       <div>
                          <p className="text-xs font-black text-gray-900 leading-tight tracking-tight">{r.client?.name}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{r.client?.client_company?.name || 'Personal'}</p>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    {r.quotation ? (
                      <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 rounded-lg border-indigo-100 bg-indigo-50 text-indigo-600">
                        <FileText size={10} strokeWidth={2.5} />
                        <span className="font-black text-[9px] uppercase tracking-widest">{r.quotation.number}</span>
                      </Badge>
                    ) : r.proforma ? (
                      <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 rounded-lg border-gray-100 bg-gray-50 text-gray-600">
                        <FileCheck size={10} strokeWidth={2.5} />
                        <span className="font-black text-[9px] uppercase tracking-widest">{r.proforma.number}</span>
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-gray-300 italic font-bold">NO REF</span>
                    )}
                  </TableCell>
                  <TableCell className="py-5 px-6">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                         <User size={10} strokeWidth={2.5} className="text-gray-400" />
                       </div>
                       <span className="text-[11px] font-bold text-gray-600">{r.profile?.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-5 px-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${
                      r.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      r.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center py-5 px-6">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                      {r.status === 'Pending' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(r.id, 'Approved')} className="!p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors" title="Approve"><Check size={16} strokeWidth={3} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(r.id, 'Rejected')} className="!p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="Reject"><X size={16} strokeWidth={3} /></Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete({ isOpen: true, id: r.id })} className="!p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="Hapus"><Trash2 size={16} strokeWidth={2.5} /></Button>
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
      />
 
      <NotificationModal 
        isOpen={notification.isOpen} 
        onClose={() => setNotification({ ...notification, isOpen: false })} 
        title={notification.title} 
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
};
