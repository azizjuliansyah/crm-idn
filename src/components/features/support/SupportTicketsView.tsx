'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Button, H2, H3, Subtext, Modal, SearchInput } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { SupportTicket, Profile, Company, CompanyMember, SupportStage, Client, TicketTopic } from '@/lib/types';
import {
  Plus, Search, Trello, Table as TableIcon,
  AlertTriangle, CheckCircle2, Trash2, X, Loader2
} from 'lucide-react';
import { SupportTicketAddModal } from '@/components/features/support/SupportTicketAddModal';
import { SupportTicketDetailModal } from '@/components/features/support/SupportTicketDetailModal';
import { SupportTicketsTableView } from '@/components/features/support/SupportTicketsTableView';
import { SupportTicketsKanbanView } from '@/components/features/support/SupportTicketsKanbanView';

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
  const [topics, setTopics] = useState<TicketTopic[]>([]);
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

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [ticketsRes, stagesRes, clientsRes, membersRes, topicsRes] = await Promise.all([
        supabase.from('support_tickets').select('*, assigned_profile:profiles(*), client:clients(*), ticket_topics(*)').eq('company_id', company.id).order('kanban_order', { ascending: true }).order('id', { ascending: false }),
        supabase.from('support_stages').select('*').eq('company_id', company.id).order('sort_order', { ascending: true }),
        supabase.from('clients').select('*').eq('company_id', company.id).order('name'),
        supabase.from('company_members').select('*, profile:profiles(*)').eq('company_id', company.id),
        supabase.from('ticket_topics').select('*').eq('company_id', company.id).order('name')
      ]);

      if (ticketsRes.data) setTickets(ticketsRes.data as SupportTicket[]);
      if (stagesRes.data) setStages(stagesRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
      if (membersRes.data) setMembers(membersRes.data as any);
      if (topicsRes.data) setTopics(topicsRes.data);
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

  // Network update based on the generic KanbanBoard's onReorder payload
  const handleDrop = async (ticketId: number, newStatus: string, index?: number) => {
    if (isProcessing) return;

    try {
      const targetColumnCards = ticketsByStatus[newStatus.toLowerCase()] || [];
      const draggedCard = tickets.find(t => t.id === ticketId);
      if (!draggedCard) return;

      const cardsWithoutDragged = targetColumnCards.filter(t => t.id !== ticketId);

      let newOrder = 0;

      if (cardsWithoutDragged.length === 0) {
        newOrder = 1000;
      } else if (index === undefined || index >= cardsWithoutDragged.length) {
        const lastCard = cardsWithoutDragged[cardsWithoutDragged.length - 1];
        newOrder = (lastCard.kanban_order || 0) + 1000;
      } else if (index <= 0) {
        const firstCard = cardsWithoutDragged[0];
        newOrder = (firstCard.kanban_order || 0) - 1000;
      } else {
        const cardBefore = cardsWithoutDragged[index - 1];
        const cardAfter = cardsWithoutDragged[index];
        newOrder = ((cardBefore.kanban_order || 0) + (cardAfter.kanban_order || 0)) / 2;
      }

      // Optimistic Update
      setTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, status: newStatus.toLowerCase(), kanban_order: newOrder } : t
      ));

      // Network Update
      await supabase.from('support_tickets').update({ status: newStatus.toLowerCase(), kanban_order: newOrder }).eq('id', ticketId);
    } catch (err: any) {
      showNotification('Gagal', err.message, 'error');
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

    // Sort tickets inside grouping mathematically correctly
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const orderA = a.kanban_order || 0;
        const orderB = b.kanban_order || 0;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
    });

    return groups;
  }, [filteredTickets, stages]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 min-h-[400px]">
      <Loader2 className="animate-spin text-rose-600 mb-4" size={32} />
      <Subtext className="text-[10px]  uppercase tracking-tight text-gray-400">Sinkronisasi Customer Support...</Subtext>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl">Customer Support</H2>
            <Subtext className="text-[10px] uppercase tracking-tight">Kelola bantuan dan tiket masalah pelanggan.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-50 border border-gray-100 p-1 rounded-xl">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={`!p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm ring-1 ring-gray-100 text-rose-600' : 'text-gray-400'}`}
              >
                <TableIcon size={14} strokeWidth={2.5} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('kanban')}
                className={`!p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm ring-1 ring-gray-100 text-rose-600' : 'text-gray-400'}`}
              >
                <Trello size={14} strokeWidth={2.5} />
              </Button>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              leftIcon={<Plus size={14} strokeWidth={3} />}
              className="!px-6 py-2.5 text-[10px] uppercase tracking-tight shadow-lg shadow-rose-100"
              variant="danger"
              size="sm"
            >
              Tiket Baru
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
          <div className="w-[400px] shrink-0">
            <SearchInput
              placeholder="Cari ticket bantuan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="h-[80vh] mb-4 overflow-hidden flex flex-col">
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
            onReorder={handleDrop}
          />
        )}
      </div>

      {isAddModalOpen && (
        <SupportTicketAddModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          company={company}
          members={members}
          stages={stages}
          clients={clients}
          topics={topics}
          onSuccess={() => { fetchData(false); showNotification('Berhasil', 'Ticket baru telah dibuat.'); }}
        />
      )}

      {selectedTicket && isDetailModalOpen && (
        <SupportTicketDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          ticket={selectedTicket}
          company={company}
          user={user}
          members={members}
          stages={stages}
          clients={clients}
          topics={topics}
          onUpdate={() => fetchData(false)}
          onDelete={handleDeleteClick}
        />
      )}

      {/* CONFIRM DELETE MODAL */}
      <Modal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        title="Hapus Ticket"
        size="sm"
        footer={
          <div className="flex w-full gap-3">
            <Button variant="ghost" onClick={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} className="flex-1">Batal</Button>
            <Button variant="danger" onClick={executeDelete} isLoading={isProcessing} leftIcon={<Trash2 size={14} />} className="flex-1">Ya, Hapus</Button>
          </div>
        }
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6"><AlertTriangle size={32} /></div>
          <Subtext className="text-lg  text-gray-900 tracking-tight">Hapus {confirmDelete.name}?</Subtext>
          <Subtext className="text-sm text-gray-500 font-medium leading-relaxed mt-2">Tindakan ini permanen. Seluruh riwayat percakapan pada ticket ini akan hilang.</Subtext>
        </div>
      </Modal>

      <Modal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title=""
        size="sm"
        footer={<Button onClick={() => setNotification({ ...notification, isOpen: false })} className="w-full">Tutup</Button>}
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{notification.type === 'success' ? <CheckCircle2 size={32} /> : <X size={32} />}</div>
          <H3 className="text-lg  text-gray-900 mb-2">{notification.title}</H3>
          <Subtext className="text-sm text-gray-500 font-medium leading-relaxed">{notification.message}</Subtext>
        </div>
      </Modal>
    </div>
  );
};
