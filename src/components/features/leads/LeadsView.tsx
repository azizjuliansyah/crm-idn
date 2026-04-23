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
import { Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { BulkActionGroup } from '@/components/shared/filters/BulkActionGroup';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { ConfirmBulkStatusModal } from '@/components/shared/modals/ConfirmBulkStatusModal';
import { exportToExcel, ExcelColumn } from '@/lib/utils/excelExport';

interface Props {
  activeCompany: Company | null;
  activeView: string;
  user: Profile;
}

export const LeadsView: React.FC<Props> = ({ activeCompany, activeView, user }) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [isConfirmBulkStatusOpen, setIsConfirmBulkStatusOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { showToast } = useAppStore();

  // 1. Initialize Filters Hook
  const {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    assigneeFilter, setAssigneeFilter,
    companyFilter, setCompanyFilter,
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
    isPlaceholderData: isFetchingNewPage,
    refetch: refresh,
  } = useLeadsQuery({
    companyId,
    searchTerm,
    statusFilter,
    assigneeFilter,
    companyFilter,
    dateFilterType,
    startDate: startDateFilter,
    endDate: endDateFilter,
    sortConfig,
    page,
    pageSize
  });

  const leads = leadsData?.data || [];

  // 4. Initialize mutations
  const { deleteLead, updateLeadStatus, bulkDeleteLeads, bulkUpdateLeadsStatus } = useLeadMutations();

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
      
      if (newStatus.toLowerCase() === 'qualified') {
        const lead = leads.find(l => l.id === leadId);
        if (lead) setLeadToConvert(lead);
      }
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
  
  const handleBulkDelete = async () => {
    try {
      await bulkDeleteLeads.mutateAsync(selectedIds);
      showToast(`${selectedIds.length} lead berhasil dihapus!`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkDeleteOpen(false);
    } catch (error: any) {
      showToast('Gagal menghapus lead: ' + error.message, 'error');
    }
  };

  const handleBulkUpdateStatus = async (statusId: string | number) => {
    try {
      await bulkUpdateLeadsStatus.mutateAsync({ leadIds: selectedIds, status: String(statusId) });
      showToast(`Status ${selectedIds.length} lead berhasil diperbarui!`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkStatusOpen(false);
    } catch (error: any) {
      showToast('Gagal mengubah status: ' + error.message, 'error');
    }
  };

  const handleExportLeads = () => {
    const dataToExport = selectedIds.length > 0 
      ? leads.filter(l => selectedIds.includes(l.id)) 
      : leads;

    if (dataToExport.length === 0) {
      showToast('Tidak ada data untuk diekspor', 'info');
      return;
    }

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nama Lead', key: 'name', width: 25 },
      { header: 'Instansi/Perusahaan', key: 'company_name', width: 25 },
      { header: 'Status', key: 'status_label', width: 15 },
      { header: 'Sales Assignee', key: 'sales_name', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'WhatsApp', key: 'whatsapp', width: 20 },
      { header: 'Budget', key: 'formatted_budget', width: 20 },
      { header: 'Urgent', key: 'urgent_label', width: 10 },
      { header: 'Tanggal Dibuat', key: 'created_at_label', width: 20 },
    ];

    const formattedData = dataToExport.map(l => ({
      ...l,
      company_name: l.client_company?.name || '-',
      status_label: stages.find(s => s.name.toLowerCase() === l.status.toLowerCase())?.name || l.status,
      sales_name: members.find(m => m.user_id === l.sales_id)?.profile?.full_name || '-',
      formatted_budget: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(l.expected_value || 0),
      urgent_label: l.is_urgent ? 'Ya' : 'Tidak',
      created_at_label: new Date(l.created_at).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
      }),
    }));

    exportToExcel(formattedData, columns, 'CRM_Leads_Report');
    showToast('Data Lead berhasil diekspor ke Excel', 'success');
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
      
      if (newStatus.toLowerCase() === 'qualified') {
        setLeadToConvert(draggedCard);
      }
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
        onExport={handleExportLeads}
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
        bulkActions={
          <BulkActionGroup
            selectedCount={selectedIds.length}
            onUpdateStatus={() => setIsConfirmBulkStatusOpen(true)}
            onDelete={() => setIsConfirmBulkDeleteOpen(true)}
          />
        }
      >
        <LeadFilterBar
          dateFilterType={dateFilterType} setDateFilterType={setDateFilterType}
          startDateFilter={startDateFilter} setStartDateFilter={setStartDateFilter}
          endDateFilter={endDateFilter} setEndDateFilter={setEndDateFilter}
          statusFilter={statusFilter} setStatusFilter={(val) => { setStatusFilter(val); setPage(1); }}
          assigneeFilter={assigneeFilter} setAssigneeFilter={(val) => { setAssigneeFilter(val); setPage(1); }}
          companyFilter={companyFilter} setCompanyFilter={(val) => { setCompanyFilter(val); setPage(1); }}
          stages={stages}
          members={members}
          clientCompanies={clientCompanies}
        />
      </StandardFilterBar>

      <div className="h-[75vh] overflow-hidden">
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
            hasMore={false} // Disable for now or adapt if needed
            isLoadingMore={false}
            onLoadMore={() => {}}
          />
        ) : (
          <LeadsTableView
            data={leads}
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
            
            page={page}
            pageSize={pageSize}
            totalCount={leadsData?.totalCount || 0}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
            }}
            isLoading={leadsLoading || isFetchingNewPage}
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
          onConvertToDeal={() => setLeadToConvert(selectedLead)}
          user={members.find(m => m.user_id === selectedLead.sales_id)?.profile as any}
          sources={sources} clientCompanies={clientCompanies} categories={categories}
        />
      )}

      {leadToConvert && activeCompany && (
        <ConvertLeadModal
          isOpen={!!leadToConvert} onClose={() => setLeadToConvert(null)}
          lead={leadToConvert} companyId={activeCompany.id} userId={user.id}
          members={members}
          onSuccess={() => { 
            setLeadToConvert(null); 
            if (selectedLead?.id === leadToConvert.id) setSelectedLead(null); 
            refresh(); 
          }}
        />
      )}

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen} onClose={() => setConfirmDelete({ isOpen: false, id: null })} onConfirm={executeDelete}
        title="Hapus Lead" itemName="Lead ini" description="Apakah Anda yakin ingin menghapus data lead ini dari sistem?"
      />

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkDeleteOpen}
        onClose={() => setIsConfirmBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        title="Hapus Lead Terpilih"
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} lead yang dipilih? Tindakan ini tidak dapat dibatalkan.`}
        isProcessing={bulkDeleteLeads.status === 'pending'}
      />

      <ConfirmBulkStatusModal
        isOpen={isConfirmBulkStatusOpen}
        onClose={() => setIsConfirmBulkStatusOpen(false)}
        onConfirm={handleBulkUpdateStatus}
        count={selectedIds.length}
        options={stages.map(s => ({ id: s.name.toLowerCase(), name: s.name }))}
        title="Ubah Status Lead"
        label="Pilih Status Baru"
        isProcessing={bulkUpdateLeadsStatus.status === 'pending'}
      />
    </div>
  );
};
