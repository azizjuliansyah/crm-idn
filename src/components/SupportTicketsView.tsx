'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SupportTicket, Profile, Company, CompanyMember, SupportStage, Client } from '@/lib/types';
import { 
  Plus, Search, Trello, Table as TableIcon, 
  AlertTriangle, CheckCircle2, Trash2, X, Loader2
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { SupportTicketAddModal } from '@/components/SupportTicketAddModal';
import { SupportTicketDetailModal } from '@/components/SupportTicketDetailModal';
import { SupportTicketsTableView } from '@/components/SupportTicketsTableView';
import { SupportTicketsKanbanView } from '@/components/SupportTicketsKanbanView';

interface Props {
  activeCompany: Company;
  user: Profile;
  activeView?: string;
}

type ViewMode = 'table' | 'kanban';

export const SupportTicketsView: React.FC<Props> = ({ activeCompany: company, user }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stages, setStages] = useState<SupportStage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ isOpen: false, id: null, name: '' });
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ 
    isOpen: false, title: '', message: '', type: 'success' 
  });

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [ticketsRes, stagesRes, clientsRes, membersRes] = await Promise.all([
        supabase.from('support_tickets').select('*, assigned_profile:profiles(*), client:clients(*)').eq('company_id', company.id).order('id', { ascending: false }),
        supabase.from('support_stages').select('*').eq('company_id', company.id).order('sort_order', { ascending: true }),
        supabase.from('clients').select('*').eq('company_id', company.id).order('name'),
        supabase.from('company_members').select('*, profiles(*)').eq('company_id', company.id)
      ]);

      if (ticketsRes.data) setTickets(ticketsRes.data as SupportTicket[]);
      if (stagesRes.data) setStages(stagesRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
      if (membersRes.data) setMembers(membersRes.data as any);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showNotification = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ isOpen: true, title, message, type });
  };

  const handleDeleteClick = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const t = tickets.find(ticket => ticket.id === id);
    setConfirmDelete({ isOpen: true, id, name: t?.title || 'Ticket ini' });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('support_tickets').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      showNotification('Berhasil', 'Ticket bantuan telah dihapus.');
      await fetchData(false);
      setConfirmDelete({ isOpen: false, id: null, name: '' });
    } catch (err: any) {
      showNotification('Gagal', err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (newStatus: string, ticketId?: number) => {
    const targetId = ticketId || draggingId;
    if (!targetId || isProcessing) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.from('support_tickets').update({ status: newStatus.toLowerCase() }).eq('id', targetId);
      if (error) throw error;
      await fetchData(false);
    } finally {
      setIsProcessing(false);
      setDraggingId(null);
      setDropTarget(null);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tickets, searchTerm]);

  const ticketsByStatus = useMemo(() => {
    const groups: Record<string, SupportTicket[]> = {};
    stages.forEach(s => groups[s.name.toLowerCase()] = []);
    filteredTickets.forEach(t => {
      const sKey = (t.status || '').toLowerCase();
      if (groups[sKey]) groups[sKey].push(t);
    });
    return groups;
  }, [filteredTickets, stages]);

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-rose-600 mb-4" size={32} /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sinkronisasi Customer Support...</p></div>;

  return (
    <div className="flex flex-col gap-6 h-full text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative min-w-[300px] flex-1 max-w-[400px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
          <input 
            type="text" 
            placeholder="Cari ticket bantuan..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:bg-white transition-all text-[11px] font-bold" 
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-gray-50 border border-gray-100 rounded-xl">
            <button onClick={() => setViewMode('table')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}><TableIcon size={14} /></button>
            <button onClick={() => setViewMode('kanban')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}><Trello size={14} /></button>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="px-6 py-3.5 bg-rose-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95"><Plus size={12} /> Ticket Baru</button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'table' ? (
          <SupportTicketsTableView 
            tickets={filteredTickets} 
            onEdit={(t) => { setSelectedTicket(t); setIsDetailModalOpen(true); }}
            onDelete={handleDeleteClick}
          />
        ) : (
          <SupportTicketsKanbanView 
            stages={stages}
            ticketsByStatus={ticketsByStatus}
            onEdit={(t) => { setSelectedTicket(t); setIsDetailModalOpen(true); }}
            onDelete={handleDeleteClick}
            onDragStart={(e, id) => { setDraggingId(id); e.dataTransfer.setData('text/plain', id.toString()); }}
            onDragOver={(e, s) => { e.preventDefault(); if (dropTarget !== s) setDropTarget(s); }}
            onDrop={(e, s) => { e.preventDefault(); const id = parseInt(e.dataTransfer.getData('text/plain')); if (id) handleStatusChange(s, id); }}
            dropTarget={dropTarget}
          />
        )}
      </div>

      <SupportTicketAddModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        company={company}
        members={members}
        stages={stages}
        clients={clients}
        onSuccess={() => { fetchData(false); showNotification('Berhasil', 'Ticket baru telah dibuat.'); }}
      />

      {selectedTicket && (
        <SupportTicketDetailModal 
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          ticket={selectedTicket}
          company={company}
          user={user}
          members={members}
          stages={stages}
          clients={clients}
          onUpdate={() => fetchData(false)}
          onDelete={handleDeleteClick}
        />
      )}

      {/* CONFIRM DELETE MODAL */}
      <Modal isOpen={confirmDelete.isOpen} onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} title="Hapus Ticket" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6"><AlertTriangle size={32} /></div>
          <p className="text-lg font-bold text-gray-900 tracking-tight">Hapus {confirmDelete.name}?</p>
          <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2 mb-8">Tindakan ini permanen. Seluruh riwayat percakapan pada ticket ini akan hilang.</p>
          <div className="flex w-full gap-3">
             <button onClick={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold text-[10px] uppercase tracking-widest rounded-xl">Batal</button>
             <button onClick={executeDelete} disabled={isProcessing} className="flex-1 py-4 bg-rose-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2">{isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Ya, Hapus</button>
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
