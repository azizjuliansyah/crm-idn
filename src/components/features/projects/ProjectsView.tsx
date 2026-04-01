'use client';

import React, { useState } from 'react';
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
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { useProjectsQuery, useProjectMetadata, useProjectMutations } from '@/lib/hooks/useProjectsQuery';
import { useProjectFilters } from '@/lib/hooks/useProjectFilters';

// Sub-components
import { ProjectFormModal } from './ProjectFormModal';
import { ProjectsTableView } from './ProjectsTableView';
import { ProjectsKanbanView } from './ProjectsKanbanView';

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
  const { showToast } = useAppStore();

  // Filters State
  const { 
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    assigneeFilter, setAssigneeFilter,
    sortConfig, handleSort
  } = useProjectFilters([]);

  // Data Fetching
  const {
    data,
    isLoading: loadingProjects,
    isFetchingNextPage: isLoadingMore,
    hasNextPage: hasMore,
    fetchNextPage: loadMore
  } = useProjectsQuery({
    companyId: company.id,
    pipelineId,
    searchTerm,
    statusFilter,
    assigneeFilter,
    sortConfig
  });

  const projects = data?.pages.flatMap(page => page.data) || [];

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
  const { deleteProject, updateProjectStatus } = useProjectMutations();

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
      await deleteProject.mutateAsync(confirmDelete.id);
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      showToast('Proyek berhasil dihapus!', 'success');
    } catch (err: any) {
      showToast('Gagal menghapus proyek: ' + err.message, 'error');
    }
  };

  const handleStatusChange = async (projectId: number, newStageId: string) => {
    try {
      await updateProjectStatus.mutateAsync({ projectId, stageId: newStageId });
      showToast('Tahapan proyek berhasil diperbarui!', 'success');
    } catch (err: any) {
      showToast('Gagal memperbarui tahapan: ' + err.message, 'error');
    }
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
          <ComboBox
            value={assigneeFilter}
            onChange={(val: string | number) => setAssigneeFilter(val.toString())}
            options={[
              { value: 'all', label: 'SEMUA TIM' },
              ...members.map(m => ({
                value: m.user_id,
                label: (m.profile?.full_name || m.user_id).toUpperCase()
              }))
            ]}
            className="w-40"
            placeholderSize="text-[10px] font-bold text-gray-900 uppercase "
          />
        </div>
      </StandardFilterBar>

      {/* Main View Area */}
      <div className="h-[80vh] mb-4 overflow-hidden flex flex-col relative text-gray-900">
        {viewMode === 'table' ? (
          <ProjectsTableView 
            projects={projects}
            pipeline={pipeline}
            onEdit={handleOpenEdit}
            onDelete={(id, name) => setConfirmDelete({ isOpen: true, id, name })}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={() => loadMore()}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        ) : (
          <ProjectsKanbanView 
            projects={projects}
            pipeline={pipeline}
            onEdit={handleOpenEdit}
            onStatusChange={handleStatusChange}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={() => loadMore()}
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
        isProcessing={deleteProject.status === 'pending'}
        variant="horizontal"
      />
    </div>
  );
};
