'use client';
import React, { useState } from 'react';
import { List, LayoutGrid, Plus } from 'lucide-react';
import { 
  Company, Lead, Profile 
} from '@/lib/types';
import { LeadAddModal } from './LeadAddModal';
import { LeadDetailModal } from './LeadDetailModal';
import { ConvertLeadModal } from './ConvertLeadModal';
import { LeadsTableView } from './LeadsTableView';
import { LeadsKanbanView } from './LeadsKanbanView';
import { LeadFilterBar } from './LeadFilterBar';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { useLeadFilters } from '@/lib/hooks/useLeadFilters';
import { useKanbanReorder } from '@/lib/hooks/useKanbanReorder';
import { useAppStore } from '@/lib/store/useAppStore';
import { useLeadMetadata, useLeadsQuery, useLeadMutations } from '@/lib/hooks/useLeadsQuery';
import { supabase } from '@/lib/supabase';

interface Props {
  activeCompany: Company | null;
  activeView: string;
  user: Profile;
}

export const LeadsView: React.FC<Props> = ({ activeCompany, activeView, user }) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { showToast } = useAppStore();

  // 1. Initialize Filters Hook
  const {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    assigneeFilter, setAssigneeFilter,
    dateFilterType, setDateFilterType,
    startDateFilter, setStartDateFilter,
    endDateFilter, setEndDateFilter,
    sortConfig, handleSort
  } = useLeadFilters([]);

  const companyId = activeCompany?.id || 0;

  // 2. Fetch Metadata using TanStack Query
  const { 
    stages: stagesQuery, 
    members: membersQuery, 
    sources: sourcesQuery, 
    clientCompanies: clientCompaniesQuery, 
    categories: categoriesQuery 
  } = useLeadMetadata(companyId);

  const stages = stagesQuery.data || [];
  const members = membersQuery.data || [];
  const sources = sourcesQuery.data || [];
  const clientCompanies = clientCompaniesQuery.data || [];
  const categories = categoriesQuery.data || [];
  
  const loadingMetadata = stagesQuery.isLoading || 
                         membersQuery.isLoading || 
                         sourcesQuery.isLoading || 
                         clientCompaniesQuery.isLoading || 
                         categoriesQuery.isLoading;

  // 3. Fetch Leads using TanStack Query
  const {
    data: leadsData,
    isLoading: leadsLoading,
    isFetchingNextPage: isLoadingMore,
    hasNextPage: hasMore,
    fetchNextPage: loadMore,
    refetch: refresh,
  } = useLeadsQuery({
    companyId,
    searchTerm,
    statusFilter,
    assigneeFilter,
    dateFilterType,
    startDate: startDateFilter,
    endDate: endDateFilter,
    sortConfig,
  });

  const leads = leadsData?.pages.flatMap(page => page.data) || [];

  // 4. Initialize mutations
  const { deleteLead, updateLeadStatus } = useLeadMutations();

  const handleCreateSuccess = () => {
    setIsAddModalOpen(false);
    refresh();
    showToast('Lead baru berhasil didaftarkan!', 'success');
  };

  const handleUpdate = () => {
    refresh();
    showToast('Perubahan berhasil disimpan!', 'success');
  };

  const handleDelete = (id: number) => { setConfirmDelete({ isOpen: true, id }); };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await deleteLead.mutateAsync(confirmDelete.id);
      showToast('Lead berhasil dihapus!', 'success');
      if (selectedLead?.id === confirmDelete.id) setSelectedLead(null);
      setConfirmDelete({ isOpen: false, id: null });
    } catch (error: any) {
      showToast('Gagal menghapus lead: ' + error.message, 'error');
    }
  };

  const handleUpdateStatus = async (leadId: number, newStatus: string) => {
    try {
      await updateLeadStatus.mutateAsync({ leadId, status: newStatus });
      showToast('Status lead berhasil diperbarui!', 'success');
    } catch (error: any) {
      showToast('Gagal mengubah status: ' + error.message, 'error');
    }
  };

  const handleToggleUrgency = async (id: number, current: boolean) => {
    try {
      const { error } = await supabase.from('leads').update({ is_urgent: !current }).eq('id', id);
      if (error) throw error;
      refresh();
      showToast(!current ? 'Lead ditandai sebagai urgent!' : 'Status urgent dihapus.', 'success');
    } catch (error: any) {
      showToast('Gagal mengubah status urgensi: ' + error.message, 'error');
    }
  };

  const handleToggleSelect = (id: string | number) => {
    const numId = typeof id === 'string' ? parseInt(id) : id;
    if (isNaN(numId)) return;
    setSelectedIds(prev => prev.includes(numId) ? prev.filter(i => i !== numId) : [...prev, numId]);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map(l => l.id));
    }
  };

  // 5. Initialize Kanban Hook
  const { handleReorder } = useKanbanReorder<Lead>({
    table: 'leads',
    statusField: 'status',
    user_id: user.id,
    logActivity: true,
    onSuccess: (msg) => showToast(msg, 'success'),
    onError: (msg) => showToast(msg, 'error')
  });

  const onDrop = async (leadId: number, newStatus: string, index?: number) => {
    const draggedCard = leads.find(l => l.id === leadId);
    if (!draggedCard) return;
    
    try {
      await handleReorder(leads, () => {}, leadId, newStatus, index, draggedCard.status);
      refresh();
    } catch (err) {
      refresh();
    }
  };

  const leadsByStatus = stages.reduce((acc, stage) => {
    const statusKey = stage.name.toLowerCase();
    acc[statusKey] = leads
      .filter(l => l.status === statusKey)
      .sort((a, b) => {
        const orderA = a.kanban_order || 0;
        const orderB = b.kanban_order || 0;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    return acc;
  }, {} as Record<string, Lead[]>);

  if (!activeCompany) return <div className="p-8 text-center text-gray-400">Pilih workspace terlebih dahulu.</div>;

  return (
    <div className="flex flex-col space-y-6">
      <StandardFilterBar
        title="Leads Pipeline"
        subtitle="Kelola prospek dan konversi penjualan Anda."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Cari lead, klien..."
        viewModes={{
          current: viewMode,
          onChange: (mode) => setViewMode(mode as 'kanban' | 'table'),
          options: [
            { mode: 'table', icon: <List size={14} strokeWidth={2.5} />, label: 'Table' },
            { mode: 'kanban', icon: <LayoutGrid size={14} strokeWidth={2.5} />, label: 'Kanban' },
          ]
        }}
        primaryAction={{
          label: "Tambah Lead",
          onClick: () => setIsAddModalOpen(true),
          icon: <Plus size={14} strokeWidth={3} />
        }}
      >
        <LeadFilterBar
          dateFilterType={dateFilterType} setDateFilterType={setDateFilterType}
          startDateFilter={startDateFilter} setStartDateFilter={setStartDateFilter}
          endDateFilter={endDateFilter} setEndDateFilter={setEndDateFilter}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          assigneeFilter={assigneeFilter} setAssigneeFilter={setAssigneeFilter}
          stages={stages}
          members={members}
        />
      </StandardFilterBar>

      <div className="h-[80vh] overflow-hidden">
        {loadingMetadata || (leadsLoading && leads.length === 0) ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : viewMode === 'kanban' ? (
          <LeadsKanbanView
            stages={stages}
            leadsByStatus={leadsByStatus}
            onEdit={setSelectedLead}
            onDelete={handleDelete}
            onReorder={onDrop}
            hasUrgency={activeCompany?.has_lead_urgency}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMore}
          />
        ) : (
          <LeadsTableView
            leads={leads}
            sortConfig={sortConfig}
            onSort={handleSort}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onEdit={setSelectedLead}
            onDelete={handleDelete}
            onToggleUrgency={handleToggleUrgency}
            onUpdateStatus={handleUpdateStatus}
            stages={stages}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMore}
          />
        )}
      </div>

      {isAddModalOpen && (
        <LeadAddModal
          isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleCreateSuccess} company={activeCompany} members={members}
          stages={stages} sources={sources} clientCompanies={clientCompanies} categories={categories}
        />
      )}

      {selectedLead && (
        <LeadDetailModal
          isOpen={!!selectedLead} lead={selectedLead} company={activeCompany}
          members={members} stages={stages} onClose={() => setSelectedLead(null)}
          onUpdate={handleUpdate} onDelete={() => handleDelete(selectedLead.id)}
          onConvertToDeal={() => setIsConvertModalOpen(true)}
          user={members.find(m => m.user_id === selectedLead.sales_id)?.profile as any}
          sources={sources} clientCompanies={clientCompanies} categories={categories}
        />
      )}

      {isConvertModalOpen && selectedLead && activeCompany && (
        <ConvertLeadModal
          isOpen={isConvertModalOpen} onClose={() => setIsConvertModalOpen(false)}
          lead={selectedLead} companyId={activeCompany.id} userId={user.id}
          onSuccess={() => { setIsConvertModalOpen(false); setSelectedLead(null); refresh(); }}
        />
      )}

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={executeDelete}
        title="Hapus Lead"
        itemName="Lead ini"
        description="Apakah Anda yakin ingin menghapus data lead ini dari sistem?"
        variant="horizontal"
      />
    </div>
  );
};
