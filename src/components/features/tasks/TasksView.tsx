'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Button, 
  Subtext, 
} from '@/components/ui';
import { 
  Task, 
  Company, 
  CompanyMember, 
  Profile 
} from '@/lib/types';
import {
  Trello, 
  Table as TableIcon, 
  ArrowLeft, 
  AlignLeft,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { useTasksQuery, useTaskMetadata, useTaskMutations } from '@/lib/hooks/useTasksQuery';
import { useTaskFilters } from '@/lib/hooks/useTaskFilters';
import { TasksTableView } from './TasksTableView';
import { TasksKanbanView } from './TasksKanbanView';
import { TasksGanttView } from './TasksGanttView';
import { TaskFormModal } from './TaskFormModal';
import { StandardFilterBar } from '@/components/shared/filters/StandardFilterBar';
import { useAppStore } from '@/lib/store/useAppStore';

interface Props {
  company: Company;
  user: Profile;
  members: CompanyMember[];
  projectId: number;
}

export const TasksView: React.FC<Props> = ({ company, user, members, projectId }) => {
  const router = useRouter();
  const { showToast } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; title: string }>({ 
    isOpen: false, 
    id: null, 
    title: '' 
  });

  const [form, setForm] = useState<any>({
    title: '', description: '', stage_id: '', assigned_id: '',
    start_date: '', end_date: ''
  });

  // Filters
  const {
    searchTerm, setSearchTerm,
    viewMode, setViewMode
  } = useTaskFilters([]);

  // Data Fetching
  const {
    data,
    isLoading: tasksLoading,
    isFetchingNextPage: isLoadingMore,
    hasNextPage: hasMore,
    fetchNextPage: loadMore
  } = useTasksQuery({
    projectId,
    searchTerm
  });

  const { project: projectQuery, stages: stagesQuery } = useTaskMetadata(projectId, company.id);
  const project = projectQuery.data || null;
  const stages = stagesQuery.data || [];
  const loadingMetadata = projectQuery.isLoading || stagesQuery.isLoading;

  const tasks = useMemo(() => {
    return data?.pages.flatMap(page => page.data) || [];
  }, [data]);

  // Mutations
  const { upsertTask, deleteTask, updateTaskStage } = useTaskMutations();

  // Handlers
  const handleOpenAdd = () => {
    setForm({
      title: '', description: '', stage_id: stages[0]?.id || '', assigned_id: user.id,
      start_date: new Date().toISOString().split('T')[0],
      end_date: ''
    });
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setForm({
      id: task.id,
      title: task.title,
      description: task.description || '',
      stage_id: task.stage_id,
      assigned_id: task.assigned_id || '',
      start_date: task.start_date || '',
      end_date: task.end_date || ''
    });
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.stage_id) return;
    
    // Validasi Timeline Project
    if (project?.start_date && form.start_date) {
      if (new Date(form.start_date) < new Date(project.start_date)) {
        showToast(`Mulai task tidak boleh sebelum ${new Date(project.start_date).toLocaleDateString('id-ID')}`, 'error');
        return;
      }
    }
    
    if (project?.end_date && form.end_date) {
      if (new Date(form.end_date) > new Date(project.end_date)) {
        showToast(`Tenggat tidak boleh melebihi ${new Date(project.end_date).toLocaleDateString('id-ID')}`, 'error');
        return;
      }
    }

    try {
      await upsertTask.mutateAsync({
        ...form,
        project_id: projectId,
        company_id: company.id,
      });
      setIsModalOpen(false);
      showToast('Data task berhasil disimpan.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await deleteTask.mutateAsync(confirmDelete.id);
      setConfirmDelete({ isOpen: false, id: null, title: '' });
      showToast('Task telah dihapus.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleStatusChange = async (taskId: number, newStageId: string) => {
    try {
      await updateTaskStage.mutateAsync({ taskId, stageId: newStageId });
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loadingMetadata || (tasksLoading && tasks.length === 0)) return (
    <div className="flex flex-col items-center justify-center py-24 min-h-[400px]">
      <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
      <Subtext className="!text-[10px] uppercase text-gray-400 font-bold">Sinkronisasi Task Proyek...</Subtext>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <StandardFilterBar
        title={project?.name || 'Proyek'}
        subtitle="Daftar Pekerjaan Proyek"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Cari tugas..."
        leftElement={
          <Link
            href={project ? `/dashboard/projects/${project.pipeline_id}` : '/dashboard/projects'}
            className="p-2.5 text-gray-400 hover:text-gray-900 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center shadow-sm"
          >
            <ArrowLeft size={16} />
          </Link>
        }
        viewModes={{
          current: viewMode,
          onChange: (mode) => setViewMode(mode as any),
          options: [
            { mode: 'table', icon: <TableIcon size={14} />, label: 'Table' },
            { mode: 'kanban', icon: <Trello size={14} />, label: 'Kanban' },
            { mode: 'gantt', icon: <AlignLeft size={14} />, label: 'Gantt' },
          ]
        }}
        primaryAction={{
          label: "Task Baru",
          onClick: handleOpenAdd
        }}
      />

      <div className="h-[80vh] overflow-hidden flex flex-col">
        {viewMode === 'table' ? (
          <TasksTableView 
            tasks={tasks}
            stages={stages}
            onEdit={handleOpenEdit}
            onDelete={(id, title) => setConfirmDelete({ isOpen: true, id, title })}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={() => loadMore()}
          />
        ) : viewMode === 'kanban' ? (
          <TasksKanbanView 
            tasks={tasks}
            stages={stages}
            onEdit={handleOpenEdit}
            onDelete={(id, title) => setConfirmDelete({ isOpen: true, id, title })}
            onStatusChange={handleStatusChange}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={() => loadMore()}
          />
        ) : (
          <TasksGanttView 
            tasks={tasks}
            stages={stages}
            project={project}
            onTaskClick={handleOpenEdit}
          />
        )}
      </div>

      <TaskFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        form={form}
        setForm={setForm}
        isProcessing={upsertTask.status === 'pending'}
        stages={stages}
        members={members}
      />

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ ...confirmDelete, isOpen: false })}
        onConfirm={handleDelete}
        title="Hapus Pekerjaan"
        itemName={confirmDelete.title}
        isProcessing={deleteTask.status === 'pending'}
        variant="horizontal"
      />
    </div>
  );
};
