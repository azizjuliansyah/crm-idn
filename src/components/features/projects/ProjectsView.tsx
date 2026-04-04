'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, 
  H2, 
  Subtext, 
  ComboBox
} from '@/components/ui';
import { useAppStore } from '@/lib/store/useAppStore';
import { Loader2, Plus, List, LayoutGrid } from 'lucide-react';
import { Company, Profile, CompanyMember, Project } from '@/lib/types';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { BulkActionGroup } from '@/components/shared/filters/BulkActionGroup';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ConfirmBulkDeleteModal } from '@/components/shared/modals/ConfirmBulkDeleteModal';
import { ConfirmBulkStatusModal } from '@/components/shared/modals/ConfirmBulkStatusModal';
import { useProjectsQuery, useProjectMetadata, useProjectMutations } from '@/lib/hooks/useProjectsQuery';
import { useProjectFilters } from '@/lib/hooks/useProjectFilters';

// Sub-components
import { ProjectFormModal } from './ProjectFormModal';
import { ProjectsTableView } from './ProjectsTableView';
import { ProjectsKanbanView } from './ProjectsKanbanView';
import { ProjectFilterBar } from './ProjectFilterBar';
import { exportToExcel, ExcelColumn } from '@/lib/utils/excelExport';

interface Props {
  company: Company;
  user: Profile;
  members: CompanyMember[];
  pipelineId: number;
}

type ViewMode = 'table' | 'kanban';

export const ProjectsView: React.FC<Props> = ({ company, user, members: initialMembers, pipelineId }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ 
    isOpen: false, 
    id: null, 
    name: '' 
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { showToast } = useAppStore();

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [isConfirmBulkStatusOpen, setIsConfirmBulkStatusOpen] = useState(false);

  // Filters State
  const { 
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    assigneeFilter, setAssigneeFilter,
    clientFilter, setClientFilter,
    sortConfig, handleSort
  } = useProjectFilters([]);

  // Data Fetching
  const {
    data: projectsData,
    isLoading: loadingProjects,
    isPlaceholderData: isFetchingNewPage,
  } = useProjectsQuery({
    companyId: company.id,
    pipelineId,
    searchTerm,
    statusFilter,
    assigneeFilter,
    clientFilter,
    sortConfig,
    page,
    pageSize
  });

  const projects = projectsData?.data || [];

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, assigneeFilter, clientFilter]);

  // Metadata
  const { 
    pipeline: pipelineQuery, 
    members: membersQuery,
    clients: clientsQuery,
    clientCompanies: clientCompaniesQuery,
    categories: categoriesQuery
  } = useProjectMetadata(company.id, pipelineId);

  const pipeline = pipelineQuery.data || null;
  const members = membersQuery.data || initialMembers;
  const clients = clientsQuery.data || [];
  const clientCompanies = clientCompaniesQuery.data || [];
  const categories = categoriesQuery.data || [];
  const loadingMetadata = pipelineQuery.isLoading || membersQuery.isLoading;

  // Mutations
  const { deleteProject: deleteProjectMutation, updateProjectStatus: updateProjectStatusMutation, bulkDeleteProjects, bulkUpdateProjectsStatus } = useProjectMutations();

  const handleOpenAdd = () => {
    setSelectedProject(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setSelectedProject(project);
    setIsFormModalOpen(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await deleteProjectMutation.mutateAsync(confirmDelete.id);
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      showToast('Proyek berhasil dihapus!', 'success');
    } catch (err: any) {
      showToast('Gagal menghapus proyek: ' + err.message, 'error');
    }
  };

  const handleStatusChange = async (projectId: number, newStageId: string) => {
    try {
      await updateProjectStatusMutation.mutateAsync({ projectId, stageId: newStageId });
      showToast('Tahapan proyek berhasil diperbarui!', 'success');
    } catch (err: any) {
      showToast('Gagal memperbarui tahapan: ' + err.message, 'error');
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === projects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(projects.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteProjects.mutateAsync(selectedIds);
      showToast(`${selectedIds.length} proyek berhasil dihapus.`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkDeleteOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkUpdateStatus = async (stageId: string) => {
    try {
      await bulkUpdateProjectsStatus.mutateAsync({ ids: selectedIds, stageId });
      showToast(`${selectedIds.length} tahapan proyek berhasil diperbarui.`, 'success');
      setSelectedIds([]);
      setIsConfirmBulkStatusOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleExportProjects = () => {
    const dataToExport = selectedIds.length > 0 
      ? projects.filter(p => selectedIds.includes(p.id)) 
      : projects;

    if (dataToExport.length === 0) {
      showToast('Tidak ada data untuk diekspor', 'info');
      return;
    }

    const columns: ExcelColumn[] = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nama Proyek', key: 'name', width: 30 },
      { header: 'Pelanggan', key: 'client_name', width: 25 },
      { header: 'Perusahaan', key: 'company_name', width: 25 },
      { header: 'Penanggung Jawab', key: 'lead_name', width: 25 },
      { header: 'Start Date', key: 'start_date_label', width: 15 },
      { header: 'End Date', key: 'end_date_label', width: 15 },
      { header: 'Tahapan', key: 'stage_name', width: 20 },
    ];

    const formattedData = dataToExport.map(p => ({
      ...p,
      client_name: p.client?.name || '-',
      company_name: p.client?.client_company?.name || 'Personal',
      lead_name: p.lead_profile?.full_name || '-',
      start_date_label: p.start_date ? new Date(p.start_date).toLocaleDateString('id-ID') : '-',
      end_date_label: p.end_date ? new Date(p.end_date).toLocaleDateString('id-ID') : '-',
      stage_name: pipeline?.stages?.find(s => s.id === p.stage_id)?.name || 'Unknown',
    }));

    exportToExcel(formattedData, columns, 'CRM_Projects_Report');
    showToast('Data Proyek berhasil diekspor ke Excel', 'success');
  };

  if (loadingMetadata || (loadingProjects && projects.length === 0)) return (
    <div className="flex flex-col items-center justify-center py-24 min-h-[400px]">
      <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
      <Subtext className="text-[10px] uppercase text-gray-400">Sinkronisasi Proyek...</Subtext>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <StandardFilterBar
        title="Project Management"
        subtitle="Kelola dan pantau seluruh proyek klien."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onExport={handleExportProjects}
        searchPlaceholder="Cari proyek atau klien..."
        viewModes={{
          current: viewMode,
          onChange: (mode) => setViewMode(mode as 'kanban' | 'table'),
          options: [
            { mode: 'table', icon: <List size={14} strokeWidth={2.5} />, label: 'Table' },
            { mode: 'kanban', icon: <LayoutGrid size={14} strokeWidth={2.5} />, label: 'Kanban' },
          ]
        }}
        primaryAction={{
          label: "Project Baru",
          onClick: handleOpenAdd,
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
        <div className="flex items-center gap-3 shrink-0">
          <ComboBox
            value={statusFilter}
            onChange={(val: string | number) => setStatusFilter(val.toString())}
            options={[
              { value: 'all', label: 'SEMUA TAHAPAN' },
              ...(pipeline?.stages?.map(s => ({ value: s.id, label: s.name.toUpperCase() })) || [])
            ]}
            className="w-40"
            placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
          />
          <ProjectFilterBar 
            clientFilter={clientFilter}
            setClientFilter={setClientFilter}
            assigneeFilter={assigneeFilter}
            setAssigneeFilter={setAssigneeFilter}
            clientCompanies={clientCompanies}
            members={members}
          />
        </div>
      </StandardFilterBar>

      {/* Main View Area */}
      <div className="h-[75vh] mb-4 overflow-hidden flex flex-col relative text-gray-900">
        {viewMode === 'table' ? (
          <ProjectsTableView 
            data={projects}
            pipeline={pipeline}
            onEdit={handleOpenEdit}
            onDelete={(id, name) => setConfirmDelete({ isOpen: true, id, name })}
            selectedIds={selectedIds}
            onToggleSelect={(id: string | number) => handleToggleSelect(Number(id))}
            onToggleSelectAll={handleToggleSelectAll}
            page={page}
            pageSize={pageSize}
            totalCount={projectsData?.totalCount || 0}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            isLoading={loadingProjects || isFetchingNewPage}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        ) : (
          <ProjectsKanbanView 
            projects={projects}
            pipeline={pipeline}
            onEdit={handleOpenEdit}
            onStatusChange={handleStatusChange}
            hasMore={false}
            isLoadingMore={false}
            onLoadMore={() => {}}
          />
        )}
      </div>

      <ProjectFormModal 
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        project={selectedProject}
        company={company}
        user={user}
        members={members}
        pipeline={pipeline}
        clients={clients}
        clientCompanies={clientCompanies}
        categories={categories}
      />

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={handleDelete}
        title="Hapus Proyek"
        itemName={confirmDelete.name}
        isProcessing={deleteProjectMutation.status === 'pending'}
      />

      <ConfirmBulkDeleteModal
        isOpen={isConfirmBulkDeleteOpen}
        onClose={() => setIsConfirmBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.length}
        title="Hapus Proyek Masal"
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} proyek yang dipilih? Seluruh data rincian pada proyek tersebut akan hilang.`}
        isProcessing={bulkDeleteProjects.status === 'pending'}
      />

      <ConfirmBulkStatusModal
        isOpen={isConfirmBulkStatusOpen}
        onClose={() => setIsConfirmBulkStatusOpen(false)}
        onConfirm={(stageId) => handleBulkUpdateStatus(String(stageId))}
        count={selectedIds.length}
        options={pipeline?.stages?.map(s => ({ id: s.id, name: s.name.toUpperCase() })) || []}
        title="Ubah Tahapan Proyek"
        label="Pilih Tahapan Baru"
        isProcessing={bulkUpdateProjectsStatus.status === 'pending'}
      />
    </div>
  );
};
