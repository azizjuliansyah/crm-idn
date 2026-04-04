'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, H1, Subtext } from '@/components/ui';
import { useAppStore } from '@/lib/store/useAppStore';

import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, Deal, Pipeline, Client, ClientCompany, ClientCompanyCategory, Profile } from '@/lib/types';
import { Plus, List, LayoutGrid } from 'lucide-react';
import { DealAddModal } from './DealAddModal';
import { DealDetailModal } from './DealDetailModal';
import { ConvertDealToProjectModal } from './ConvertDealToProjectModal';
import { DealsTableView } from './DealsTableView';
import { DealsKanbanView } from './DealsKanbanView';
import { DealFilterBar } from './DealFilterBar';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { useDealFilters } from '@/lib/hooks/useDealFilters';
import { useKanbanReorder } from '@/lib/hooks/useKanbanReorder';
import { formatIDR } from '@/lib/utils/formatters';
import { useRouter } from 'next/navigation';
import { useDealsQuery, useDealMetadata, useDealMutations } from '@/lib/hooks/useDealsQuery';
import { Trash2, RefreshCw } from 'lucide-react';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { ConfirmBulkStatusModal } from '@/components/shared/modals/ConfirmBulkStatusModal';
import { BulkActionGroup } from '@/components/shared/filters/BulkActionGroup';
import { exportToExcel, ExcelColumn } from '@/lib/utils/excelExport';

interface Props {
  activeCompany: Company | null;
  activeView: string;
  user: Profile;
  pipelineId?: number;
}

export const DealsView: React.FC<Props> = ({ activeCompany, activeView, user, pipelineId }) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { showToast } = useAppStore();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [isConfirmBulkStatusOpen, setIsConfirmBulkStatusOpen] = useState(false);
  const router = useRouter();

  // 1. Metadata Hooks
  const { 
    pipeline: pipelineQuery, 
    members: membersQuery, 
    clients: clientsQuery, 
    clientCompanies: clientCompaniesQuery, 
    categories: categoriesQuery 
  } = useDealMetadata(activeCompany?.id || 0, pipelineId);

  const pipeline = pipelineQuery.data || null;
  const members = membersQuery.data || [];
  const clients = clientsQuery.data || [];
  const clientCompanies = clientCompaniesQuery.data || [];
  const categories = categoriesQuery.data || [];
  const loadingMetadata = pipelineQuery.isLoading || membersQuery.isLoading;

  // 2. Filters Hook
  const {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    assigneeFilter, setAssigneeFilter,
    companyFilter, setCompanyFilter,
    probabilityFilter, setProbabilityFilter,
    dateFilterType, setDateFilterType,
    startDateFilter, setStartDateFilter,
    endDateFilter, setEndDateFilter,
    followUpFilter, setFollowUpFilter,
    sortConfig, handleSort
  } = useDealFilters([]);

  // 3. Deals Query Hook
  const {
    data: dealsData,
    isLoading: loadingDeals,
    isPlaceholderData: isFetchingNewPage,
    refetch: refresh
  } = useDealsQuery({
    companyId: activeCompany?.id || 0,
    pipelineId: pipeline?.id,
    searchTerm,
    statusFilter,
    assigneeFilter,
    companyFilter,
    probabilityFilter,
    startDate: startDateFilter,
    endDate: endDateFilter,
    dateFilterType,
    followUpFilter,
    sortConfig,
    page,
    pageSize
  });

  const deals = dealsData?.data || [];

  // 4. Mutations Hook
  const { deleteDeal, updateDealStatus, bulkDeleteDeals, bulkUpdateDealsStage } = useDealMutations();

  // 5. Initialize Kanban Hook
  const { handleReorder } = useKanbanReorder<Deal>({
    table: 'deals',
    statusField: 'stage_id',
    user_id: user.id,
    logActivity: true,
    onSuccess: (msg) => showToast(msg, 'success'),
    onError: (msg) => showToast(msg, 'error')
  });

  const handleCreateSuccess = () => { setIsAddModalOpen(false); refresh(); showToast('Deal baru berhasil dibuat!', 'success'); };
  const handleUpdate = () => { refresh(); showToast('Deal berhasil diperbarui!', 'success'); };
  const handleDelete = (id: number) => { setConfirmDelete({ isOpen: true, id }); };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await deleteDeal.mutateAsync(confirmDelete.id);
      if (selectedDeal?.id === confirmDelete.id) setSelectedDeal(null);
      showToast('Deal berhasil dihapus!', 'success');
      setConfirmDelete({ isOpen: false, id: null });
    } catch (error: any) { showToast('Gagal menghapus deal: ' + error.message, 'error'); }
  };
  
  const handleUpdateStage = async (dealId: number, newStageId: string | number) => {
    try {
      await updateDealStatus.mutateAsync({ dealId, stageId: newStageId });
      showToast('Tahapan transaksi berhasil diperbarui!', 'success');
    } catch (error: any) {
      showToast('Gagal mengubah tahapan: ' + error.message, 'error');
    }
  };

  const handleToggleUrgency = async (id: number, current: boolean) => {
    try {
      const { error } = await supabase.from('deals').update({ is_urgent: !current }).eq('id', id);
      if (error) throw error;
      refresh();
      showToast(!current ? 'Deal ditandai sebagai urgent!' : 'Status urgent dihapus.', 'success');
    } catch (error: any) { showToast('Gagal mengubah status urgensi: ' + error.message, 'error'); }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteDeals.mutateAsync(selectedIds);
      showToast(`${selectedIds.length} deal berhasil dihapus!`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkDeleteOpen(false);
    } catch (error: any) {
      showToast('Gagal menghapus deal: ' + error.message, 'error');
    }
  };

  const handleBulkUpdateStage = async (stageId: string | number) => {
    try {
      await bulkUpdateDealsStage.mutateAsync({ dealIds: selectedIds, stageId });
      showToast(`Tahapan ${selectedIds.length} deal berhasil diperbarui!`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkStatusOpen(false);
    } catch (error: any) {
      showToast('Gagal mengubah tahapan: ' + error.message, 'error');
    }
  };

  const handleExportDeals = () => {
    const dataToExport = selectedIds.length > 0 
      ? deals.filter(d => selectedIds.includes(d.id)) 
      : deals;

    if (dataToExport.length === 0) {
      showToast('Tidak ada data untuk diekspor', 'info');
      return;
    }

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nama Transaksi', key: 'name', width: 30 },
      { header: 'Perusahaan', key: 'company_name', width: 25 },
      { header: 'Tahapan', key: 'stage_label', width: 20 },
      { header: 'Probabilitas', key: 'formatted_probability', width: 15 },
      { header: 'Nilai Transaksi', key: 'formatted_value', width: 20 },
      { header: 'Sales Assignee', key: 'sales_name', width: 20 },
      { header: 'Tanggal Dibuat', key: 'created_at_label', width: 20 },
    ];

    const formattedData = dataToExport.map(d => ({
      ...d,
      company_name: d.customer_company || 'Perorangan',
      stage_label: pipeline?.stages?.find(s => s.id === d.stage_id)?.name || d.stage_id,
      formatted_probability: `${d.probability || 0}%`,
      formatted_value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(d.expected_value || 0),
      sales_name: d.sales_profile?.full_name || '-',
      created_at_label: new Date(d.created_at).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
      }),
    }));

    exportToExcel(formattedData, columns, 'CRM_Deals_Report');
    showToast('Data Transaksi berhasil diekspor ke Excel', 'success');
  };

  const handleCreateQuotation = (clientId: number, dealId: number) => { router.push(`/dashboard/sales/quotations/create?client_id=${clientId}&deal_id=${dealId}`); };
  const handleEditQuotation = (quotationId: number) => { router.push(`/dashboard/sales/quotations/${quotationId}`); };

  const handleToggleSelect = (id: string | number) => {
    const numId = typeof id === 'string' ? parseInt(id) : id;
    if (isNaN(numId)) return;
    setSelectedIds(prev => prev.includes(numId) ? prev.filter(i => i !== numId) : [...prev, numId]);
  };
  const handleToggleSelectAll = () => { if (selectedIds.length === deals.length) setSelectedIds([]); else setSelectedIds(deals.map(l => l.id)); };

  const dealsByStage = useMemo(() => {
    return (pipeline?.stages || []).reduce((acc, stage) => {
      acc[stage.id] = deals
        .filter(l => l.stage_id === stage.id)
        .sort((a, b) => {
          const orderA = a.kanban_order || 0;
          const orderB = b.kanban_order || 0;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      return acc;
    }, {} as Record<string, Deal[]>);
  }, [deals, pipeline?.stages]);

  const onDrop = async (dealId: number, newStageId: string, index?: number) => {
    const draggedCard = deals.find(d => d.id === dealId);
    if (!draggedCard) return;
    try {
      await handleReorder(deals, () => {}, dealId, newStageId, index, draggedCard.stage_id);
      refresh();
    } catch (err) { refresh(); }
  };

  if (!activeCompany) return <div className="p-8 text-center text-gray-400">Pilih workspace terlebih dahulu.</div>;

  return (
    <div className="flex flex-col space-y-6">
      <StandardFilterBar
        title="Sales Pipeline"
        subtitle="Monitoring transaksi dan pipeline penjualan."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onExport={handleExportDeals}
        searchPlaceholder="Cari deal, klien..."
        viewModes={{
          current: viewMode,
          onChange: (mode) => setViewMode(mode as 'kanban' | 'table'),
          options: [
            { mode: 'table', icon: <List size={14} strokeWidth={2.5} />, label: 'Table' },
            { mode: 'kanban', icon: <LayoutGrid size={14} strokeWidth={2.5} />, label: 'Kanban' },
          ]
        }}
        primaryAction={{
          label: "Buat Deal",
          onClick: () => setIsAddModalOpen(true),
          icon: <Plus size={14} strokeWidth={3} />
        }}
        bulkActions={
          <BulkActionGroup
            selectedCount={selectedIds.length}
            onUpdateStatus={() => setIsConfirmBulkStatusOpen(true)}
            onDelete={() => setIsConfirmBulkDeleteOpen(true)}
            updateLabel="Ubah Tahapan"
          />
        }
      >
        <DealFilterBar
          dateFilterType={dateFilterType} setDateFilterType={setDateFilterType}
          startDateFilter={startDateFilter} setStartDateFilter={setStartDateFilter}
          endDateFilter={endDateFilter} setEndDateFilter={setEndDateFilter}
          followUpFilter={followUpFilter} setFollowUpFilter={setFollowUpFilter}
          statusFilter={statusFilter} setStatusFilter={(val) => { setStatusFilter(val); setPage(1); }}
          assigneeFilter={assigneeFilter} setAssigneeFilter={(val) => { setAssigneeFilter(val); setPage(1); }}
          companyFilter={companyFilter} setCompanyFilter={(val) => { setCompanyFilter(val); setPage(1); }}
          probabilityFilter={probabilityFilter} setProbabilityFilter={(val) => { setProbabilityFilter(val); setPage(1); }}
          pipeline={pipeline}
          members={members}
          clientCompanies={clientCompanies}
        />
      </StandardFilterBar>

      <div className="h-[75vh] mb-4 overflow-hidden relative">
        {loadingMetadata || (loadingDeals && deals.length === 0) ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : viewMode === 'kanban' ? (
          <DealsKanbanView
            pipeline={pipeline} dealsByStage={dealsByStage} onEdit={setSelectedDeal} onDelete={(id, e) => handleDelete(id)}
            onReorder={onDrop} onCreateQuotation={handleCreateQuotation} onEditQuotation={handleEditQuotation}
            hasMore={false} isLoadingMore={false} onLoadMore={() => {}}
          />
        ) : (
          <DealsTableView
            data={deals} sortConfig={sortConfig} onSort={handleSort} selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect} onToggleSelectAll={handleToggleSelectAll} onEdit={setSelectedDeal}
            onDelete={handleDelete} onToggleUrgency={handleToggleUrgency} onUpdateStage={handleUpdateStage} 
            pipeline={pipeline}
            onCreateQuotation={handleCreateQuotation} onEditQuotation={handleEditQuotation}
            
            page={page}
            pageSize={pageSize}
            totalCount={dealsData?.totalCount || 0}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
            }}
            isLoading={loadingDeals || isFetchingNewPage}
          />
        )}
      </div>

      {isAddModalOpen && (
        <DealAddModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleCreateSuccess}
          company={activeCompany!}
          members={members}
          pipeline={pipeline}
          clients={clients}
          clientCompanies={clientCompanies}
          categories={categories}
          user={user}
        />
      )}

      {selectedDeal && (
        <DealDetailModal
          isOpen={!!selectedDeal}
          deal={selectedDeal}
          company={activeCompany!}
          members={members}
          pipeline={pipeline}
          clients={clients}
          clientCompanies={clientCompanies}
          onClose={() => setSelectedDeal(null)}
          onUpdate={handleUpdate}
          onDelete={() => handleDelete(selectedDeal.id)}
          onConvertToProject={() => setIsConvertModalOpen(true)}
          user={user as any}
          onCreateQuotation={handleCreateQuotation}
          onEditQuotation={handleEditQuotation}
          categories={categories}
        />
      )}

      {isConvertModalOpen && selectedDeal && activeCompany && (
        <ConvertDealToProjectModal
          isOpen={isConvertModalOpen} onClose={() => setIsConvertModalOpen(false)} deal={selectedDeal}
          companyId={activeCompany.id} userId={user.id} onSuccess={() => { setIsConvertModalOpen(false); setSelectedDeal(null); refresh(); }}
        />
      )}

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen} onClose={() => setConfirmDelete({ isOpen: false, id: null })} onConfirm={executeDelete}
        title="Hapus Deal" itemName="Deal ini" description="Apakah Anda yakin ingin menghapus data deal ini dari sistem?"
      />

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkDeleteOpen}
        onClose={() => setIsConfirmBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        title="Hapus Deal Terpilih"
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} deal yang dipilih? Tindakan ini tidak dapat dibatalkan.`}
        isProcessing={bulkDeleteDeals.status === 'pending'}
      />

      <ConfirmBulkStatusModal
        isOpen={isConfirmBulkStatusOpen}
        onClose={() => setIsConfirmBulkStatusOpen(false)}
        onConfirm={handleBulkUpdateStage}
        count={selectedIds.length}
        options={pipeline?.stages?.map(s => ({ id: s.id, name: s.name })) || []}
        title="Ubah Tahapan Deal"
        label="Pilih Tahapan Baru"
        isProcessing={bulkUpdateDealsStage.status === 'pending'}
      />
    </div>
  );
};
