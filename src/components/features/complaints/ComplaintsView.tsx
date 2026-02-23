'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SupportTicket, Profile, Company, CompanyMember, SupportStage, Client } from '@/lib/types';
import { 
  Plus, Search, Trello, Table as TableIcon, 
  AlertTriangle, CheckCircle2, Trash2, X, Loader2
} from 'lucide-react';
import { Modal, Button, Input, SearchInput, H1, H2, Subtext } from '@/components/ui';
import { ComplaintAddModal } from '@/components/features/complaints/ComplaintAddModal';
import { ComplaintDetailModal } from '@/components/features/complaints/ComplaintDetailModal';
import { ComplaintsTableView } from '@/components/features/complaints/ComplaintsTableView';
import { ComplaintsKanbanView } from '@/components/features/complaints/ComplaintsKanbanView';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { NotificationModal } from '@/components/shared/modals/NotificationModal';

interface Props {
  activeCompany: Company;
  user: Profile;
  activeView?: string;
}

type ViewMode = 'table' | 'kanban';

export const ComplaintsView: React.FC<Props> = ({ activeCompany: company, user }) => {
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
        supabase.from('support_tickets').select('*, assigned_profile:profiles(*), client:clients(*)').eq('company_id', company.id).eq('type', 'complaint').order('id', { ascending: false }),
        supabase.from('support_stages').select('*').eq('company_id', company.id).order('sort_order', { ascending: true }),
        supabase.from('clients').select('*').eq('company_id', company.id).order('name'),
        supabase.from('company_members').select('*, profile:profiles(*)').eq('company_id', company.id)
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
    setConfirmDelete({ isOpen: true, id, name: t?.title || 'Keluhan ini' });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('support_tickets').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      showNotification('Berhasil', 'Data keluhan telah dihapus.');
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

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-rose-600 mb-4" size={32} /><Subtext className="!text-[10px] font-bold uppercase tracking-widest text-gray-400">Sinkronisasi Complaints...</Subtext></div>;

  return (
    <div className="flex flex-col gap-6 h-full text-gray-900">
      <div className="flex items-center justify-between">
         <div>
            <H1>Customer Complaints</H1>
            <Subtext>Kelola keluhan dan komplain dari pelanggan.</Subtext>
         </div>
         <Button 
           onClick={() => setIsAddModalOpen(true)} 
           leftIcon={<Plus size={14} />}
           variant="danger"
         >
           Complaint Baru
         </Button>
      </div>

      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0 overflow-x-auto custom-scrollbar">
        <div className="w-[400px] shrink-0">
          <SearchInput 
            placeholder="Cari keluhan..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="rounded-xl border-gray-100 shadow-none bg-gray-50/30"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <div className="flex items-center p-1 bg-gray-50 border border-gray-100 rounded-xl">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setViewMode('table')} 
              className={`!p-2.5 transition-all ${viewMode === 'table' ? 'bg-white text-rose-600 shadow-sm ring-1 ring-gray-100' : '!text-gray-400'}`}
            >
              <TableIcon size={14} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setViewMode('kanban')} 
              className={`!p-2.5 transition-all ${viewMode === 'kanban' ? 'bg-white text-rose-600 shadow-sm ring-1 ring-gray-100' : '!text-gray-400'}`}
            >
              <Trello size={14} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'table' ? (
          <ComplaintsTableView 
            tickets={filteredTickets} 
            onEdit={(t) => { setSelectedTicket(t); setIsDetailModalOpen(true); }}
            onDelete={handleDeleteClick}
          />
        ) : (
          <ComplaintsKanbanView 
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

      {isAddModalOpen && (
        <ComplaintAddModal 
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          company={company}
          members={members}
          stages={stages}
          clients={clients}
          onSuccess={() => { fetchData(false); showNotification('Berhasil', 'Keluhan baru telah didaftarkan.'); }}
        />
      )}
  
      {selectedTicket && isDetailModalOpen && (
        <ComplaintDetailModal 
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
      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        itemName={confirmDelete.name}
        description="Tindakan ini permanen. Seluruh riwayat aktivitas pada keluhan ini akan hilang."
        isProcessing={isProcessing}
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
