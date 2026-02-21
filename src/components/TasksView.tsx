'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Task, TaskStage, Project, Company, CompanyMember, Profile } from '@/lib/types';
import { 
  Plus, Search, Trello, Table as TableIcon, Loader2, 
  CheckSquare, ArrowLeft, Calendar, Clock, 
  AlertTriangle, Trash2, Edit2, Save, X, CheckCircle2
} from 'lucide-react';
import { Modal } from '@/components/Modal';
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

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600 mb-4" size={32} /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sinkronisasi Task Proyek...</p></div>;

  return (
    <div className="flex flex-col gap-5 h-full overflow-hidden text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={handleBack}
            className="p-2.5 text-gray-400 hover:text-gray-900 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
             <h3 className="text-sm font-bold text-gray-900 leading-none truncate">{project?.name}</h3>
             <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Daftar Pekerjaan Proyek</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12} />
            <input 
              type="text" 
              placeholder="Cari tugas..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white transition-all text-[10px] font-bold" 
            />
          </div>
          <div className="flex items-center p-1 bg-gray-50 border border-gray-100 rounded-xl">
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}><TableIcon size={12} /></button>
            <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}><Trello size={12} /></button>
          </div>
          <button 
            onClick={handleOpenAdd} 
            className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
          >
            <Plus size={12} /> Task Baru
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'table' ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full">
            <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Daftar Pekerjaan</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">PIC</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Timeline</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTasks.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/50 group transition-colors">
                      <td className="px-6 py-6">
                        <p className="text-sm font-bold text-gray-900 tracking-tight">{t.title}</p>
                        {t.description && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 italic">{t.description}</p>}
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                           <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-[10px] font-bold text-emerald-600 border border-emerald-100">
                             {t.assigned_profile?.full_name.charAt(0)}
                           </div>
                           <span className="text-[11px] font-bold text-gray-700">{t.assigned_profile?.full_name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5"><Calendar size={10} /> {t.start_date ? new Date(t.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</p>
                            <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5"><Clock size={10} /> {t.end_date ? new Date(t.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</p>
                         </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="px-3 py-1 bg-gray-50 text-gray-500 text-[9px] font-bold uppercase rounded-full border border-gray-200">
                          {stages.find(s => s.id === t.stage_id)?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-center">
                         <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEdit(t)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                            <button onClick={() => setConfirmDelete({ isOpen: true, id: t.id, title: t.title })} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-24 text-center">
                        <CheckSquare size={48} className="mx-auto mb-4 opacity-5" />
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-300">Belum ada task pada proyek ini</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 items-start h-full overflow-x-auto pb-4 custom-scrollbar">
            {stages.map((stage, sIdx) => (
              <div key={stage.id} className="flex flex-col gap-3 min-w-[280px] w-[280px] h-full">
                <div className={`p-4 ${STAGE_COLORS[sIdx % STAGE_COLORS.length]} rounded-xl shadow-md flex items-center justify-between`}>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-white">{stage.name}</span>
                   <span className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-full">{tasksByStage[stage.id]?.length || 0}</span>
                </div>
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDropTarget(stage.id); }} 
                  onDrop={(e) => { e.preventDefault(); const id = parseInt(e.dataTransfer.getData('text/plain')); if (id) handleStatusChange(stage.id, id); }}
                  className={`flex-1 space-y-3 p-2 rounded-2xl border-2 border-dashed transition-all overflow-y-auto custom-scrollbar ${dropTarget === stage.id ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50/30 border-transparent'}`}
                >
                   {tasksByStage[stage.id]?.map(t => (
                     <div 
                        key={t.id} 
                        draggable
                        onDragStart={(e) => { setDraggingId(t.id); e.dataTransfer.setData('text/plain', t.id.toString()); }}
                        onClick={() => handleOpenEdit(t)}
                        className="group p-5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-grab active:cursor-grabbing transform hover:-translate-y-1"
                      >
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[9px] font-bold text-gray-300 uppercase">Task #{String(t.id).padStart(3, '0')}</p>
                        </div>
                        <h4 className="font-bold text-[13px] text-gray-900 mb-2 leading-tight">{t.title}</h4>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                           <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] font-bold text-white" title={t.assigned_profile?.full_name}>
                                 {t.assigned_profile?.full_name.charAt(0)}
                              </div>
                              <span className="text-[9px] font-bold text-gray-400">{t.assigned_profile?.full_name.split(' ')[0]}</span>
                           </div>
                           <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-300 uppercase">
                              <Calendar size={10} />
                              {t.end_date ? new Date(t.end_date).toLocaleDateString('id-ID', { month: 'short' }) : '-'}
                           </div>
                        </div>
                     </div>
                   ))}
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
          <div className="flex gap-3">
             <button onClick={() => { setIsAddModalOpen(false); setIsDetailModalOpen(false); }} className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Batal</button>
             <button onClick={handleSave} disabled={isProcessing} className="px-10 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95">
               {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SIMPAN DATA
             </button>
          </div>
        }
      >
        <div className="space-y-8 py-2">
           <div className="space-y-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Judul Pekerjaan*</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner" placeholder="Tulis tugas spesifik..." />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tahapan Task</label>
                 <select value={form.stage_id} onChange={e => setForm({...form, stage_id: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white">
                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Penanggung Jawab (PIC)</label>
                 <select value={form.assigned_id} onChange={e => setForm({...form, assigned_id: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white">
                    <option value="">-- Pilih PIC --</option>
                    {members.map(m => <option key={m.profile?.id} value={m.profile?.id}>{m.profile?.full_name}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tanggal Mulai</label>
                 <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tenggat Waktu</label>
                 <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white" />
              </div>
           </div>

           <div className="space-y-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Deskripsi Tugas</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 text-xs font-medium h-32 resize-none outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner" placeholder="Tulis instruksi atau catatan pengerjaan..." />
           </div>
        </div>
      </Modal>

      <Modal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} title="" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
           <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={32} /> : <X size={32} />}
           </div>
           <h3 className="text-lg font-bold text-gray-900 mb-2">{notification.title}</h3>
           <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">{notification.message}</p>
           <button onClick={() => setNotification({ ...notification, isOpen: false })} className="w-full py-4 bg-gray-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-black transition-all">Tutup</button>
        </div>
      </Modal>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};
