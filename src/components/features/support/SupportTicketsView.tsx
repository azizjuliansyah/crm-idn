'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Button, H2, Subtext, TableContainer } from '@/components/ui';
import { useAppStore } from '@/lib/store/useAppStore';


import { supabase } from '@/lib/supabase';
import { SupportTicket, Profile, Company, CompanyMember, SupportStage, Client, TicketTopic } from '@/lib/types';
import {
  Plus, Trello, Table as TableIcon,
  Loader2 as LoaderIcon, List, LayoutGrid
} from 'lucide-react';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { ConfirmBulkStatusModal } from '@/components/shared/modals/ConfirmBulkStatusModal';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { SupportTicketAddModal } from '@/components/features/support/SupportTicketAddModal';
import { SupportTicketDetailModal } from '@/components/features/support/SupportTicketDetailModal';
import { Pagination } from '@/components/shared/tables/Pagination';
import { useSupportTicketsQuery, useSupportTicketMutations } from '@/lib/hooks/useSupportTicketsQuery';
import { SupportTicketsTableView } from '@/components/features/support/SupportTicketsTableView';
import { SupportTicketsKanbanView } from '@/components/features/support/SupportTicketsKanbanView';
import { useSupportTicketFilters } from '@/lib/hooks/useSupportTicketFilters';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { BulkActionGroup } from '@/components/shared/filters/BulkActionGroup';
import { SupportTicketFilterBar } from './SupportTicketFilterBar';
import { exportToExcel, ExcelColumn } from '@/lib/utils/excelExport';

interface Props {
  activeCompany: Company;
  user: Profile;
  activeView?: string;
}

type ViewMode = 'table' | 'kanban';

export const SupportTicketsView: React.FC<Props> = ({ activeCompany: company, user }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters State
  const filters = useSupportTicketFilters([]);

  const [stages, setStages] = useState<SupportStage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [topics, setTopics] = useState<TicketTopic[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [isConfirmBulkStatusOpen, setIsConfirmBulkStatusOpen] = useState(false);

  // Data Fetching (Paginated for Table)
  const {
    data: ticketsData,
    isLoading: ticketsLoading,
    refetch: refetchTickets
  } = useSupportTicketsQuery({
    companyId: String(company.id),
    searchTerm: filters.searchTerm,
    filterStatus: filters.filterStatus,
    filterClientId: filters.filterClientId,
    filterTopicId: filters.filterTopicId,
    filterType: 'ticket',
    sortConfig: filters.sortConfig,
    page,
    pageSize,
  });

  const tickets = ticketsData?.data || [];

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ isOpen: false, id: null, name: '' });
  const { showToast } = useAppStore();

  const fetchMetadata = useCallback(async () => {
    try {
      const [stagesRes, clientsRes, membersRes, topicsRes] = await Promise.all([
        supabase.from('support_stages').select('*').eq('company_id', company.id).order('sort_order', { ascending: true }),
        supabase.from('clients').select('*').eq('company_id', company.id).order('name'),
        supabase.from('company_members').select('*, profile:profiles(*)').eq('company_id', company.id),
        supabase.from('ticket_topics').select('*').eq('company_id', company.id).order('name')
      ]);

      if (stagesRes.data) setStages(stagesRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
      if (membersRes.data) setMembers(membersRes.data as any);
      if (topicsRes.data) setTopics(topicsRes.data);
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  }, [company.id]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.searchTerm, filters.filterStatus, filters.filterClientId, filters.filterTopicId]);

  const handleDeleteClick = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const t = tickets.find(ticket => ticket.id === id);
    setConfirmDelete({ isOpen: true, id, name: t?.title || 'Ticket ini' });
  };

  const { bulkDeleteTickets, bulkUpdateTicketsStatus } = useSupportTicketMutations();

  const handleToggleSelect = (id: string | number) => {
    const numId = Number(id);
    setSelectedIds(prev =>
      prev.includes(numId) ? prev.filter(i => i !== numId) : [...prev, numId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === tickets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tickets.map(t => t.id));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteTickets.mutateAsync(selectedIds);
      showToast(`${selectedIds.length} tiket berhasil dihapus.`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkDeleteOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkUpdateStatus = async (status: string) => {
    try {
      await bulkUpdateTicketsStatus.mutateAsync({ ids: selectedIds, status });
      showToast(`${selectedIds.length} status tiket berhasil diperbarui.`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkStatusOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleExportTickets = () => {
    const dataToExport = selectedIds.length > 0 
      ? tickets.filter(t => selectedIds.includes(t.id)) 
      : tickets;

    if (dataToExport.length === 0) {
      showToast('Tidak ada data untuk diekspor', 'info');
      return;
    }

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Tipe', key: 'type', width: 12 },
      { header: 'Judul Tiket', key: 'title', width: 30 },
      { header: 'Pelanggan', key: 'client_name', width: 25 },
      { header: 'Topik', key: 'topic_name', width: 20 },
      { header: 'PIC Support', key: 'assigned_name', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Prioritas', key: 'priority', width: 15 },
      { header: 'Tanggal Dibuat', key: 'date_label', width: 20 },
    ];

    const formattedData = dataToExport.map(t => ({
      ...t,
      client_name: t.client?.name || 'Umum',
      topic_name: t.ticket_topics?.name || '-',
      assigned_name: t.assigned_profile?.full_name || '-',
      date_label: new Date(t.created_at).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
      }),
    }));

    exportToExcel(formattedData, columns, 'CRM_Support_Tickets_Report');
    showToast('Data Tiket berhasil diekspor ke Excel', 'success');
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('support_tickets').delete().eq('id', confirmDelete.id);
      if (error) throw error;
      showToast('Ticket bantuan telah dihapus.', 'success');
      refetchTickets();
      setConfirmDelete({ isOpen: false, id: null, name: '' });
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (ticketId: number, newStatus: string, index: number = 0) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const stageTickets = tickets.filter(t => (t.status || '').toLowerCase() === newStatus.toLowerCase());
      const cardsWithoutDragged = stageTickets.filter(t => t.id !== ticketId);

      let newOrder = 0;
      if (cardsWithoutDragged.length === 0) {
        newOrder = 1000;
      } else if (index <= 0) {
        const firstCard = cardsWithoutDragged[0];
        newOrder = (firstCard.kanban_order || 0) - 1000;
      } else if (index >= cardsWithoutDragged.length) {
        const lastCard = cardsWithoutDragged[cardsWithoutDragged.length - 1];
        newOrder = (lastCard.kanban_order || 0) + 1000;
      } else {
        const cardBefore = cardsWithoutDragged[index - 1];
        const cardAfter = cardsWithoutDragged[index];
        newOrder = ((cardBefore.kanban_order || 0) + (cardAfter.kanban_order || 0)) / 2;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus.toLowerCase(), kanban_order: newOrder })
        .eq('id', ticketId);

      if (error) throw error;
      showToast('Status ticket diperbarui.', 'success');
      refetchTickets();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const ticketsByStatus = useMemo(() => {
    const groups: Record<string, SupportTicket[]> = {};
    stages.forEach(s => groups[s.name.toLowerCase()] = []);
    tickets.forEach(t => {
      const sKey = (t.status || '').toLowerCase();
      if (groups[sKey]) groups[sKey].push(t);
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const orderA = a.kanban_order || 0;
        const orderB = b.kanban_order || 0;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
    });

    return groups;
  }, [tickets, stages]);

  if (ticketsLoading && tickets.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-100 min-h-[400px]">
      <LoaderIcon className="animate-spin text-rose-600 mb-4" size={32} />
      <Subtext className="text-[10px]  uppercase  text-gray-400">Sinkronisasi Customer Support...</Subtext>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <StandardFilterBar
        title="Customer Support"
        subtitle="Kelola bantuan dan tiket masalah pelanggan."
        searchTerm={filters.searchTerm}
        onSearchChange={filters.setSearchTerm}
        onExport={handleExportTickets}
        searchPlaceholder="Cari tiket bantuan..."
        viewModes={{
          current: viewMode,
          onChange: (mode) => setViewMode(mode as ViewMode),
          options: [
            { mode: 'table', icon: <TableIcon size={14} strokeWidth={2.5} />, label: 'Table' },
            { mode: 'kanban', icon: <Trello size={14} strokeWidth={2.5} />, label: 'Kanban' },
          ]
        }}
        primaryAction={{
          label: "Tiket Baru",
          onClick: () => setIsAddModalOpen(true),
          icon: <Plus size={14} strokeWidth={3} />
        }}
        bulkActions={
          <BulkActionGroup
            selectedCount={selectedIds.length}
            onUpdateStatus={() => setIsConfirmBulkStatusOpen(true)}
            onDelete={() => setIsConfirmBulkDeleteOpen(true)}
          />
        }
      >
        <SupportTicketFilterBar
          filterStatus={filters.filterStatus}
          setFilterStatus={filters.setFilterStatus}
          filterClientId={filters.filterClientId}
          setFilterClientId={filters.setFilterClientId}
          filterTopicId={filters.filterTopicId}
          setFilterTopicId={filters.setFilterTopicId}
          clients={clients}
          topics={topics}
        />
      </StandardFilterBar>

      {viewMode === 'table' ? (
        <SupportTicketsTableView
          tickets={tickets}
          isLoading={ticketsLoading}
          onEdit={(t: any) => { setSelectedTicket(t); setIsDetailModalOpen(true); }}
          onDelete={handleDeleteClick}
          page={page}
          pageSize={pageSize}
          totalCount={ticketsData?.totalCount || 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          sortConfig={filters.sortConfig}
          onSort={filters.handleSort}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />
      ) : (
        <TableContainer height="h-[75vh]">
          <SupportTicketsKanbanView
            stages={stages}
            ticketsByStatus={ticketsByStatus}
            onEdit={(t: any) => { setSelectedTicket(t); setIsDetailModalOpen(true); }}
            onDelete={handleDeleteClick}
            onReorder={handleDrop as any}
          />
        </TableContainer>
      )}

      {isAddModalOpen && (
        <SupportTicketAddModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          company={company}
          members={members}
          stages={stages}
          clients={clients}
          topics={topics}
          onSuccess={() => refetchTickets()}
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
          onUpdate={() => refetchTickets()}
          onDelete={handleDeleteClick}
        />
      )}

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        title="Hapus Ticket"
        itemName={confirmDelete.name}
        description="Apakah Anda yakin ingin menghapus data ticket bantuan ini dari sistem? Tindakan ini permanen."
        isProcessing={isProcessing}
      />

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkDeleteOpen}
        onClose={() => setIsConfirmBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        title="Hapus Tiket Masal"
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} tiket yang dipilih? Tindakan ini permanen.`}
        isProcessing={bulkDeleteTickets.status === 'pending'}
      />

      <ConfirmBulkStatusModal
        isOpen={isConfirmBulkStatusOpen}
        onClose={() => setIsConfirmBulkStatusOpen(false)}
        onConfirm={(status) => handleBulkUpdateStatus(String(status))}
        count={selectedIds.length}
        options={stages.map(s => ({ id: s.name.toLowerCase(), name: s.name.toUpperCase() }))}
        title="Ubah Status Tiket"
        label="Pilih Status Baru"
        isProcessing={bulkUpdateTicketsStatus.status === 'pending'}
      />
    </div>
  );
};
