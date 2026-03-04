'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Input, Textarea, Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, H2, Subtext, Label, Modal, Avatar, Badge, SearchInput, ComboBox } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Task, TaskStage, Project, Company, CompanyMember, Profile } from '@/lib/types';
import {
  Plus, Search, Trello, Table as TableIcon, Loader2,
  CheckSquare, ArrowLeft, Calendar, Clock,
  AlertTriangle, Trash2, Edit2, Save, X, CheckCircle2
} from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { NotificationModal } from '@/components/shared/modals/NotificationModal';
import { useRouter } from 'next/navigation';

interface Props {
  company: Company;
  user: Profile;
  members: CompanyMember[];
  projectId: number;
}

type ViewMode = 'table' | 'kanban';

const STAGE_COLORS = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-orange-600',
  'bg-rose-600',
];

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
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({
    isOpen: false, title: '', message: '', type: 'success'
  });

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const [form, setForm] = useState<any>({
    title: '', description: '', stage_id: '', assigned_id: '',
    start_date: '', end_date: ''
  });

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
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
      if (showLoading) setLoading(false);
    }
  }, [projectId, company.id]);

  useEffect(() => {
    fetchData();
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
      setNotification({ isOpen: true, title: 'Berhasil', message: 'Data task berhasil disimpan.', type: 'success' });
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal', message: err.message, type: 'error' });
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

  const handleStatusChange = async (newStageId: string, taskId?: number) => {
    const targetId = taskId || draggingId;
    if (!targetId || isProcessing) return;

    setIsProcessing(true);
    try {
      await supabase.from('tasks').update({ stage_id: newStageId }).eq('id', targetId);
      fetchData(false);
    } finally {
      setIsProcessing(false);
      setDraggingId(null);
      setDropTarget(null);
    }
  };

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
      <Subtext className="!text-[10px]  uppercase tracking-tight text-gray-400">Sinkronisasi Task Proyek...</Subtext>
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
            <H2 className="text-sm  text-gray-900 leading-none truncate uppercase tracking-tight">{project?.name}</H2>
            <Subtext className="!text-[9px]  text-emerald-600 uppercase tracking-tight mt-1">Daftar Pekerjaan Proyek</Subtext>
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
          </div>
          <Button
            onClick={handleOpenAdd}
            leftIcon={<Plus size={14} />}
            variant="success"
            className="!px-6 py-2.5  text-[10px] uppercase tracking-tight shadow-lg shadow-emerald-100"
          >
            Task Baru
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
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
                        <H2 className="text-sm text-gray-900 tracking-tight">{t.title}</H2>
                        {t.description && <Subtext className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 italic tracking-tight">{t.description}</Subtext>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar name={t.assigned_profile?.full_name} src={t.assigned_profile?.avatar_url} size="sm" className="bg-emerald-50 text-emerald-600 border border-emerald-100 " />
                          <Subtext className="text-[11px] text-gray-700 tracking-tight">{t.assigned_profile?.full_name || 'Unassigned'}</Subtext>
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
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(t)} className="!p-2 text-blue-500 hover:bg-blue-50 border border-transparent hover:border-blue-100"><Edit2 size={14} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete({ isOpen: true, id: t.id, title: t.title })} className="!p-2 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100"><Trash2 size={14} /></Button>
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
        ) : (
          <div className="flex gap-4 items-start h-full overflow-x-auto pb-4 scrollbar-hide">
            {stages.map((stage, sIdx) => (
              <div key={stage.id} className="flex flex-col gap-3 min-w-[300px] w-[300px] h-full">
                <div className={`p-4 ${STAGE_COLORS[sIdx % STAGE_COLORS.length]} rounded-2xl shadow-lg shadow-black/5 flex items-center justify-between border-b-4 border-black/10`}>
                  <Badge variant="ghost" className="!p-0 text-[10px] uppercase tracking-tight text-white">{stage.name}</Badge>
                  <div className="flex items-center justify-center bg-white/20 px-2.5 py-1 rounded-lg border border-white/20">
                    <Label className="text-[10px] text-white tracking-tight">{tasksByStage[stage.id]?.length || 0}</Label>
                  </div>
                </div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDropTarget(stage.id); }}
                  onDrop={(e) => { e.preventDefault(); const id = parseInt(e.dataTransfer.getData('text/plain')); if (id) handleStatusChange(stage.id, id); }}
                  className={`flex-1 space-y-3 p-3 rounded-2xl border-2 border-dashed transition-all overflow-y-auto scrollbar-hide ${dropTarget === stage.id ? 'bg-emerald-50/50 border-emerald-300' : 'bg-gray-50/50 border-transparent'}`}
                >
                  {tasksByStage[stage.id]?.map(t => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => { setDraggingId(t.id); e.dataTransfer.setData('text/plain', t.id.toString()); }}
                      onClick={() => handleOpenEdit(t)}
                      className="group p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 hover:border-emerald-200 transition-all cursor-pointer transform hover:-translate-y-1 active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="ghost" className="px-2 py-0.5 border border-gray-100 text-[8px]  text-gray-400 uppercase tracking-tight bg-gray-50">T-{String(t.id).padStart(3, '0')}</Badge>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, id: t.id, title: t.title }); }} className="!p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all border-none"><Trash2 size={12} /></Button>
                      </div>
                      <H2 className=" text-[13px] text-gray-800 mb-3 leading-tight tracking-tight group-hover:text-emerald-600 transition-colors uppercase">{t.title}</H2>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                          <Avatar name={t.assigned_profile?.full_name} src={t.assigned_profile?.avatar_url} size="sm" className="ring-2 ring-white shadow-sm " />
                          <Label className="text-[9px]  text-gray-400 uppercase tracking-tight">{t.assigned_profile?.full_name?.split(' ')[0] || 'TBD'}</Label>
                        </div>
                        {t.end_date && (
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px]  uppercase tracking-tight ${new Date(t.end_date) < new Date() ? 'bg-rose-50 text-rose-500' : 'bg-gray-50 text-gray-400'}`}>
                            <Calendar size={10} />
                            {new Date(t.end_date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {tasksByStage[stage.id]?.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl text-[9px]  uppercase text-gray-200 tracking-[0.2em]">Kosong</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={isAddModalOpen || isDetailModalOpen}
        onClose={() => { setIsAddModalOpen(false); setIsDetailModalOpen(false); }}
        title={form.id ? "Edit Pekerjaan" : "Tambah Pekerjaan Baru"}
        size="lg"
        footer={
          <div className="flex w-full gap-3">
            <Button variant="ghost" onClick={() => { setIsAddModalOpen(false); setIsDetailModalOpen(false); }} className="flex-1  text-xs uppercase tracking-tight">Batal</Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing}
              isLoading={isProcessing}
              leftIcon={<Save size={14} />}
              variant="success"
              className="flex-1  text-xs uppercase tracking-tight shadow-lg shadow-emerald-100"
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

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type === 'success' ? 'success' : 'error'}
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
