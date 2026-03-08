'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Input, Textarea, Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, H2, Subtext, Label, Modal, Avatar, Badge, SearchInput, ComboBox, Toast, ToastType } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Task, TaskStage, Project, Company, CompanyMember, Profile } from '@/lib/types';
import {
  Plus, Search, Trello, Table as TableIcon, Loader2,
  CheckSquare, ArrowLeft, Calendar, Clock, AlignLeft,
  AlertTriangle, Trash2, Edit2, Save, X, CheckCircle2, User as UserIcon
} from 'lucide-react';
import { GanttBoard } from '@/components/shared/GanttBoard/GanttBoard';
import { KanbanBoard, KanbanItem, KanbanStage } from '@/components/shared/KanbanBoard/KanbanBoard';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
// Removed legacy NotificationModal import
import { useRouter } from 'next/navigation';

interface Props {
  company: Company;
  user: Profile;
  members: CompanyMember[];
  projectId: number;
}

type ViewMode = 'table' | 'kanban' | 'gantt';

const STAGE_COLORS = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-orange-600',
  'bg-rose-600',
];

const getStageColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'todo':
    case 'to do': return 'bg-sky-500';
    case 'in progress':
    case 'working': return 'bg-amber-500';
    case 'done':
    case 'completed': return 'bg-emerald-500';
    case 'on hold': return 'bg-gray-500';
    case 'cancelled': return 'bg-rose-500';
    default: return 'bg-blue-500';
  }
};

interface KanbanTask extends Task, KanbanItem { }

export const TasksView: React.FC<Props> = ({ company, user, members, projectId }) => {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stages, setStages] = useState<TaskStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; title: string }>({ isOpen: false, id: null, title: '' });
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const [form, setForm] = useState<any>({
    title: '', description: '', stage_id: '', assigned_id: '',
    start_date: '', end_date: ''
  });

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [projRes, stagesRes, tasksRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('task_stages').select('*').eq('company_id', company.id).order('sort_order', { ascending: true }),
        supabase.from('tasks').select('*, assigned_profile:profiles(*)').eq('project_id', projectId).order('id', { ascending: false })
      ]);

      if (projRes.data) setProject(projRes.data);
      if (stagesRes.data) setStages(stagesRes.data);
      if (tasksRes.data) setTasks(tasksRes.data as any);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [projectId, company.id]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const handleOpenAdd = () => {
    setForm({
      title: '', description: '', stage_id: stages[0]?.id || '', assigned_id: user.id,
      start_date: new Date().toISOString().split('T')[0],
      end_date: ''
    });
    setIsAddModalOpen(true);
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
    setIsDetailModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.stage_id) return;
    
    // Validasi Timeline Project
    if (project?.start_date && form.start_date) {
      if (new Date(form.start_date) < new Date(project.start_date)) {
        showToast('Tanggal mulai task tidak boleh mendahului tanggal mulai project (' + new Date(project.start_date).toLocaleDateString('id-ID') + ')', 'error');
        return;
      }
    }
    
    if (project?.end_date && form.end_date) {
      if (new Date(form.end_date) > new Date(project.end_date)) {
        showToast('Tenggat waktu task tidak boleh melebihi tanggal selesai project (' + new Date(project.end_date).toLocaleDateString('id-ID') + ')', 'error');
        return;
      }
    }

    // Validasi End Date >= Start Date
    if (form.start_date && form.end_date) {
      if (new Date(form.end_date) < new Date(form.start_date)) {
        showToast('Tenggat waktu task tidak boleh mendahului tanggal mulai', 'error');
        return;
      }
    }
    
    setIsProcessing(true);
    try {
      const payload = {
        project_id: projectId,
        company_id: company.id,
        stage_id: form.stage_id,
        assigned_id: form.assigned_id || null,
        title: form.title,
        description: form.description,
        start_date: form.start_date || null,
        end_date: form.end_date || null
      };

      if (form.id) {
        await supabase.from('tasks').update(payload).eq('id', form.id);
      } else {
        await supabase.from('tasks').insert(payload);
      }

      setIsAddModalOpen(false);
      setIsDetailModalOpen(false);
      fetchData(false);
      showToast('Data task berhasil disimpan.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      await supabase.from('tasks').delete().eq('id', confirmDelete.id);
      setConfirmDelete({ isOpen: false, id: null, title: '' });
      fetchData(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (taskId: number, newStageId: string) => {
    if (!taskId || isProcessing) return;

    setIsProcessing(true);
    try {
      await supabase.from('tasks').update({ stage_id: newStageId }).eq('id', taskId);
      fetchData(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTaskCard = (t: KanbanTask, isDragged: boolean) => (
    <div
      onClick={() => handleOpenEdit(t)}
      className={`group p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer relative ${isDragged ? 'opacity-30' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Badge variant="ghost" className="px-1.5 py-0 border border-gray-100 text-[7px] text-gray-400 uppercase bg-gray-50">T-{String(t.id).padStart(3, '0')}</Badge>
        <ActionButton
          icon={Trash2}
          variant="rose"
          onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, id: t.id, title: t.title }); }}
          className="opacity-0 group-hover:opacity-100 !p-1 h-fit"
          iconSize={12}
        />
      </div>
      <H2 className="text-[12px] font-semibold text-gray-800 mb-3 leading-tight group-hover:text-emerald-600 transition-colors uppercase line-clamp-2">{t.title}</H2>
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          <Avatar name={t.assigned_profile?.full_name} src={t.assigned_profile?.avatar_url} size="sm" className="w-5 h-5 ring-2 ring-white shadow-sm " />
          <Label className="text-[8px] text-gray-400 uppercase ">{t.assigned_profile?.full_name?.split(' ')[0] || 'TBD'}</Label>
        </div>
        {t.end_date && (
          <div className={`flex items-center gap-1 text-[8px] uppercase ${new Date(t.end_date) < new Date() ? 'text-rose-500' : 'text-gray-400'}`}>
            <Calendar size={10} />
            {new Date(t.end_date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter(t =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.assigned_profile?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

  const tasksByStage = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    stages.forEach(s => groups[s.id] = []);
    filteredTasks.forEach(t => {
      if (groups[t.stage_id]) groups[t.stage_id].push(t);
    });
    return groups;
  }, [filteredTasks, stages]);

  const handleBack = () => {
    if (project) {
      router.push(`/dashboard/projects/${project.pipeline_id}`);
    } else {
      router.back();
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
      <Subtext className="!text-[10px]  uppercase  text-gray-400">Sinkronisasi Task Proyek...</Subtext>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="!p-2.5 text-gray-400 hover:text-gray-900 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="flex-1">
            <H2 className="text-sm  text-gray-900 leading-none truncate uppercase ">{project?.name}</H2>
            <Subtext className="!text-[9px]  text-emerald-600 uppercase  mt-1">Daftar Pekerjaan Proyek</Subtext>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="min-w-[240px]">
            <SearchInput
              placeholder="Cari tugas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="rounded-xl border-gray-100"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1">
            <Button variant="ghost" size="sm" onClick={() => setViewMode('table')} className={`!p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-gray-100' : '!text-gray-400'}`}><TableIcon size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={() => setViewMode('kanban')} className={`!p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-gray-100' : '!text-gray-400'}`}><Trello size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={() => setViewMode('gantt')} className={`!p-2 rounded-lg transition-all ${viewMode === 'gantt' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-gray-100' : '!text-gray-400'}`}><AlignLeft size={14} /></Button>
          </div>
          <Button
            onClick={handleOpenAdd}
            leftIcon={<Plus size={14} />}
            variant="primary"
            size='sm'
          >
            Task Baru
          </Button>
        </div>
      </div>

      <div className="h-[80vh] overflow-hidden flex flex-col">
        {viewMode === 'table' ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto h-full scrollbar-hide">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader>Daftar Pekerjaan</TableCell>
                    <TableCell isHeader>PIC</TableCell>
                    <TableCell isHeader>Timeline</TableCell>
                    <TableCell isHeader>Status</TableCell>
                    <TableCell isHeader className="text-center">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map(t => (
                    <TableRow key={t.id} className="hover:bg-gray-50/50 group transition-colors">
                      <TableCell>
                        <H2 className="text-sm text-gray-900 ">{t.title}</H2>
                        {t.description && <Subtext className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 italic ">{t.description}</Subtext>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar name={t.assigned_profile?.full_name} src={t.assigned_profile?.avatar_url} size="sm" className="bg-emerald-50 text-emerald-600 border border-emerald-100 " />
                          <Subtext className="text-[11px] text-gray-700 ">{t.assigned_profile?.full_name || 'Unassigned'}</Subtext>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Subtext className="text-[10px]  text-gray-500 flex items-center gap-1.5"><Calendar size={10} /> {t.start_date ? new Date(t.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</Subtext>
                          <Subtext className="text-[10px]  text-gray-500 flex items-center gap-1.5"><Clock size={10} /> {t.end_date ? new Date(t.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</Subtext>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="px-3 py-1 text-[9px]  uppercase rounded-full">
                          {stages.find(s => s.id === t.stage_id)?.name || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <ActionButton
                            icon={Edit2}
                            variant="blue"
                            onClick={() => handleOpenEdit(t)}
                          />
                          <ActionButton
                            icon={Trash2}
                            variant="rose"
                            onClick={() => setConfirmDelete({ isOpen: true, id: t.id, title: t.title })}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTasks.length === 0 && (
                    <TableEmpty colSpan={5} message="Belum ada task pada proyek ini" />
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard<KanbanTask>
            stages={stages.map(s => ({
              id: s.id,
              name: s.name,
              colorClass: getStageColor(s.name)
            }))}
            itemsByStatus={tasksByStage as Record<string, KanbanTask[]>}
            renderCard={renderTaskCard as any}
            onReorder={handleStatusChange}
          />
        ) : (
          <GanttBoard
            items={filteredTasks as any[]}
            stages={stages.map(s => ({
              id: s.id.toString(),
              name: s.name,
              colorClass: getStageColor(s.name)
            }))}
            projectStartDate={project?.start_date}
            projectEndDate={project?.end_date}
            onTaskClick={handleOpenEdit}
          />
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={isAddModalOpen || isDetailModalOpen}
        onClose={() => { setIsAddModalOpen(false); setIsDetailModalOpen(false); }}
        title={form.id ? "Edit Pekerjaan" : "Tambah Pekerjaan Baru"}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => { setIsAddModalOpen(false); setIsDetailModalOpen(false); }} disabled={isProcessing} className="rounded-md">
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isProcessing}
              isLoading={isProcessing}
              leftIcon={<Save size={14} />}
              className="rounded-md"
            >
              Simpan Data
            </Button>
          </div>
        }
      >
        <div className="space-y-6 py-2">
          <Input
            label="Judul Pekerjaan*"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Tulis tugas spesifik..."
            className="rounded-md"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ComboBox
              label="Tahapan Task"
              value={form.stage_id}
              onChange={(val: string | number) => setForm({ ...form, stage_id: val.toString() })}
              options={stages.map(s => ({ value: s.id, label: s.name }))}
              hideSearch={true}
              className="rounded-md"
            />
            <ComboBox
              label="Penanggung Jawab (PIC)"
              value={form.assigned_id}
              onChange={(val: string | number) => setForm({ ...form, assigned_id: val.toString() })}
              options={members.map(m => ({
                value: m.profile?.id.toString() || '',
                label: m.profile?.full_name || 'Tanpa Nama',
                sublabel: m.profile?.email
              }))}
              className="rounded-md"
            />
            <Input
              label="Tanggal Mulai"
              type="date"
              value={form.start_date}
              onChange={e => setForm({ ...form, start_date: e.target.value })}
              className="rounded-md"
            />
            <Input
              label="Tenggat Waktu"
              type="date"
              value={form.end_date}
              onChange={e => setForm({ ...form, end_date: e.target.value })}
              className="rounded-md"
            />
          </div>

          <Textarea
            label="Deskripsi Tugas"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Tulis instruksi atau catatan pengerjaan..."
            className="h-32 rounded-2xl"
          />
        </div>
      </Modal>

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ ...confirmDelete, isOpen: false })}
        onConfirm={handleDelete}
        title="Hapus Pekerjaan"
        itemName={confirmDelete.title}
        isProcessing={isProcessing}
      />

    </div >
  );
};
