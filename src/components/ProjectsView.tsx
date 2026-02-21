'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Project, ProjectPipeline, Company, CompanyMember, Profile, Client } from '@/lib/types';
import { 
  Plus, Search, Trello, Table as TableIcon, Loader2, Briefcase,
  AlertTriangle, CheckCircle2, X, Trash2, Calendar, Clock,
  Edit2, Save, FileText, ListTodo
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useRouter } from 'next/navigation';

interface Props {
  company: Company;
  user: Profile;
  members: CompanyMember[];
  pipelineId: number;
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

export const ProjectsView: React.FC<Props> = ({ company, user, members, pipelineId }) => {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pipeline, setPipeline] = useState<ProjectPipeline | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ isOpen: false, id: null, name: '' });
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ 
    isOpen: false, title: '', message: '', type: 'success' 
  });

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const [form, setForm] = useState<any>({
    name: '', client_id: '', lead_id: '', team_ids: [] as string[], 
    start_date: '', end_date: '', notes: '', stage_id: '',
    custom_field_values: {} as Record<string, any>
  });

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data: pData } = await supabase
        .from('project_pipelines')
        .select('*, stages:project_pipeline_stages(*)')
        .eq('id', pipelineId)
        .maybeSingle();
      
      if (pData) {
        setPipeline({
          ...pData,
          stages: (pData.stages || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
        });
      }

      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          *,
          client:clients(*),
          lead_profile:profiles!projects_lead_id_fkey(*),
          team_members:project_team_members(user_id, profile:profiles(*))
        `)
        .eq('pipeline_id', pipelineId)
        .order('id', { ascending: false });

      if (projectsData) setProjects(projectsData);

      const { data: clientsData } = await supabase.from('clients').select('*').eq('company_id', company.id).order('name');
      if (clientsData) setClients(clientsData);

    } finally {
      if (showLoading) setLoading(false);
    }
  }, [pipelineId, company.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAdd = () => {
    setForm({
      name: '', client_id: '', lead_id: user.id, team_ids: [], 
      start_date: new Date().toISOString().split('T')[0], 
      end_date: '', notes: '', stage_id: pipeline?.stages?.[0]?.id || '',
      custom_field_values: {}
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setForm({
      id: project.id,
      name: project.name,
      client_id: project.client_id || '',
      lead_id: project.lead_id || '',
      team_ids: project.team_members?.map(tm => tm.user_id) || [],
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      notes: project.notes || '',
      stage_id: project.stage_id,
      custom_field_values: project.custom_field_values || {}
    });
    setSelectedProject(project);
    setIsDetailModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.stage_id) return;
    setIsProcessing(true);
    try {
      const projectPayload = {
        company_id: company.id,
        pipeline_id: pipelineId,
        stage_id: form.stage_id,
        client_id: form.client_id ? Number(form.client_id) : null,
        lead_id: form.lead_id || null,
        name: form.name,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes,
        custom_field_values: form.custom_field_values
      };

      let projectId = form.id;
      if (projectId) {
        await supabase.from('projects').update(projectPayload).eq('id', projectId);
        await supabase.from('project_team_members').delete().eq('project_id', projectId);
      } else {
        const { data } = await supabase.from('projects').insert(projectPayload).select().single();
        projectId = data.id;
      }

      if (form.team_ids.length > 0) {
        const teamInserts = form.team_ids.map((uid: string) => ({
          project_id: projectId,
          user_id: uid
        }));
        await supabase.from('project_team_members').insert(teamInserts);
      }

      setIsAddModalOpen(false);
      setIsDetailModalOpen(false);
      fetchData(false);
      setNotification({ isOpen: true, title: 'Berhasil', message: 'Data proyek berhasil disimpan.', type: 'success' });
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
      await supabase.from('projects').delete().eq('id', confirmDelete.id);
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      fetchData(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (newStageId: string, pId?: number) => {
    const targetId = pId || draggingId;
    if (!targetId || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await supabase.from('projects').update({ stage_id: newStageId }).eq('id', targetId);
      fetchData(false);
    } finally {
      setIsProcessing(false);
      setDraggingId(null);
      setDropTarget(null);
    }
  };

  const processedProjects = useMemo(() => {
    return projects.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  const projectsByStage = useMemo(() => {
    const groups: Record<string, Project[]> = {};
    if (pipeline?.stages) {
      pipeline.stages.forEach(s => groups[s.id] = []);
    }
    processedProjects.forEach(p => {
      if (groups[p.stage_id]) groups[p.stage_id].push(p);
    });
    return groups;
  }, [processedProjects, pipeline]);

  const handleCustomFieldChange = (label: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      custom_field_values: {
        ...prev.custom_field_values,
        [label]: value
      }
    }));
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" size={32} /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sinkronisasi Proyek...</p></div>;

  return (
    <div className="flex flex-col gap-5 h-full overflow-hidden text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative min-w-[300px] flex-1 max-w-[400px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
            <Search size={14} />
          </span>
          <input 
            type="text" 
            placeholder="Cari proyek atau klien..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl outline-none focus:bg-white transition-all text-[11px] font-bold" 
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-gray-50 border border-gray-100 rounded-xl">
            <button onClick={() => setViewMode('table')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><TableIcon size={14} /></button>
            <button onClick={() => setViewMode('kanban')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}><Trello size={14} /></button>
          </div>
          <button 
            onClick={handleOpenAdd} 
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={12} /> Project Baru
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
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Informasi Proyek</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Lead & Team</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Timeline</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Tahapan</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {processedProjects.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 group transition-colors">
                      <td className="px-6 py-6">
                        <button 
                          onClick={() => router.push(`/dashboard/projects/tasks/${p.id}`)}
                          className="text-sm font-bold text-gray-900 tracking-tight hover:text-blue-600 transition-colors text-left block"
                        >
                          {p.name}
                        </button>
                        <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">{p.client?.name || 'Personal Client'}</p>
                        {p.custom_field_values && Object.entries(p.custom_field_values).slice(0, 1).map(([k, v]) => (
                          <p key={k} className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest mt-1 truncate max-w-[150px]">{k}: {String(v)}</p>
                        ))}
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                           <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-indigo-100" title={`Lead: ${p.lead_profile?.full_name}`}>
                             {p.lead_profile?.full_name.charAt(0)}
                           </div>
                           <div className="flex -space-x-2">
                              {p.team_members?.slice(0, 3).map((tm, idx) => (
                                <div key={idx} className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-400" title={tm.profile?.full_name}>
                                  {tm.profile?.full_name.charAt(0)}
                                </div>
                              ))}
                              {(p.team_members?.length || 0) > 3 && (
                                <div className="w-7 h-7 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-400">
                                  +{(p.team_members?.length || 0) - 3}
                                </div>
                              )}
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5"><Calendar size={10} /> {p.start_date ? new Date(p.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</p>
                            <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5"><Clock size={10} /> {p.end_date ? new Date(p.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</p>
                         </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="px-3 py-1 bg-gray-50 text-gray-500 text-[9px] font-bold uppercase rounded-full border border-gray-200">
                          {pipeline?.stages?.find(s => s.id === p.stage_id)?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-center">
                         <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => router.push(`/dashboard/projects/tasks/${p.id}`)} 
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Buka Tasks Proyek"
                            >
                              <ListTodo size={14} />
                            </button>
                            <button onClick={() => handleOpenEdit(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                            <button onClick={() => setConfirmDelete({ isOpen: true, id: p.id, name: p.name })} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {processedProjects.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-24 text-center">
                        <Briefcase size={48} className="mx-auto mb-4 opacity-5" />
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-300">Belum ada proyek terdaftar</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 items-start h-full overflow-x-auto pb-4 custom-scrollbar">
            {pipeline?.stages?.map((stage, sIdx) => (
              <div key={stage.id} className="flex flex-col gap-3 min-w-[300px] w-[300px] h-full">
                <div className={`p-4 ${STAGE_COLORS[sIdx % STAGE_COLORS.length]} rounded-xl shadow-md flex items-center justify-between`}>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white">{stage.name}</span>
                   </div>
                   <span className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-full">{projectsByStage[stage.id]?.length || 0}</span>
                </div>
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDropTarget(stage.id); }} 
                  onDrop={(e) => { e.preventDefault(); const id = parseInt(e.dataTransfer.getData('text/plain')); if (id) handleStatusChange(stage.id, id); }}
                  className={`flex-1 space-y-3 p-2 rounded-2xl border-2 border-dashed transition-all overflow-y-auto custom-scrollbar ${dropTarget === stage.id ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50/30 border-transparent'}`}
                >
                   {projectsByStage[stage.id]?.map(p => (
                     <div 
                        key={p.id} 
                        draggable
                        onDragStart={(e) => { setDraggingId(p.id); e.dataTransfer.setData('text/plain', p.id.toString()); }}
                        onClick={() => handleOpenEdit(p)}
                        className="group p-5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-grab active:cursor-grabbing transform hover:-translate-y-1 relative"
                      >
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
                           <button 
                              onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/projects/tasks/${p.id}`); }}
                              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shadow-sm hover:bg-emerald-600 hover:text-white transition-all"
                           >
                              <ListTodo size={12} />
                           </button>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[9px] font-bold text-gray-300 uppercase">#{String(p.id).padStart(4, '0')}</p>
                        </div>
                        <h4 className="font-bold text-[13px] text-gray-900 mb-1 group-hover:text-blue-600 transition-colors leading-tight">{p.name}</h4>
                        <p className="text-[10px] text-blue-600 font-bold uppercase mb-4">{p.client?.name || 'Personal'}</p>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                           <div className="flex -space-x-1.5">
                              <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white" title={`Lead: ${p.lead_profile?.full_name}`}>
                                 {p.lead_profile?.full_name.charAt(0)}
                              </div>
                              {p.team_members?.slice(0, 2).map((tm, idx) => (
                                <div key={idx} className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[7px] font-bold text-gray-400" title={tm.profile?.full_name}>
                                  {tm.profile?.full_name.charAt(0)}
                                </div>
                              ))}
                           </div>
                           <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-300 uppercase">
                              <Calendar size={10} />
                              {p.end_date ? new Date(p.end_date).toLocaleDateString('id-ID', { month: 'short' }) : '-'}
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
        title={form.id ? "Detail Proyek" : "Registrasi Proyek Baru"}
        size="lg"
        footer={
          <div className="flex gap-3">
             <button onClick={() => { setIsAddModalOpen(false); setIsDetailModalOpen(false); }} className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Batal</button>
             <button onClick={handleSave} disabled={isProcessing} className="px-10 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95">
               {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} SIMPAN DATA
             </button>
          </div>
        }
      >
        <div className="space-y-8 py-2">
           <div className="space-y-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Proyek*</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner" placeholder="Ketik nama proyek..." />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Klien Terkait</label>
                 <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white">
                    <option value="">-- Pilih Klien --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tahapan Saat Ini</label>
                 <select value={form.stage_id} onChange={e => setForm({...form, stage_id: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white">
                    {pipeline?.stages?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Project Lead</label>
                 <select value={form.lead_id} onChange={e => setForm({...form, lead_id: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white">
                    <option value="">Pilih Lead</option>
                    {members.map(m => <option key={m.profile?.id} value={m.profile?.id}>{m.profile?.full_name}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tanggal Mulai</label>
                 <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Estimasi Selesai</label>
                 <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Project Team</label>
                 <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl max-h-32 overflow-y-auto custom-scrollbar">
                    {members.map(m => (
                      <label key={m.user_id} className="flex items-center gap-3 py-1 cursor-pointer hover:bg-gray-100 rounded px-2 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={form.team_ids.includes(m.user_id)} 
                          onChange={(e) => {
                             const ids = e.target.checked 
                                ? [...form.team_ids, m.user_id] 
                                : form.team_ids.filter((id: string) => id !== m.user_id);
                             setForm({...form, team_ids: ids});
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                        />
                        <span className="text-[11px] font-bold text-gray-700">{m.profile?.full_name}</span>
                      </label>
                    ))}
                 </div>
              </div>
           </div>

           {/* Dynamic Custom Fields */}
           {pipeline?.custom_fields && pipeline.custom_fields.length > 0 && (
              <div className="space-y-5 pt-6 border-t border-gray-50">
                 <div className="flex items-center gap-2">
                    <FileText size={16} className="text-emerald-500" />
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-900">Field Tambahan Pipeline</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pipeline.custom_fields.map((field, fIdx) => (
                      <div key={fIdx} className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                        <input 
                          type={field.type} 
                          value={form.custom_field_values[field.label] || ''}
                          onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
                          className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-xl font-bold outline-none focus:border-emerald-500 transition-all shadow-sm"
                        />
                      </div>
                    ))}
                 </div>
              </div>
           )}

           <div className="space-y-4 pt-6 border-t border-gray-50">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Catatan & Lingkup Kerja</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 text-xs font-medium h-32 resize-none outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner" placeholder="Tuliskan detail pekerjaan atau instruksi teknis..." />
           </div>
        </div>
      </Modal>

      <Modal isOpen={confirmDelete.isOpen} onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} title="Hapus Proyek" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
             <AlertTriangle size={32} />
          </div>
          <p className="text-lg font-bold text-gray-900 tracking-tight">Hapus {confirmDelete.name}?</p>
          <div className="flex w-full gap-3 mt-8">
             <button onClick={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold text-[10px] uppercase tracking-widest rounded-lg">Batal</button>
             <button onClick={handleDelete} disabled={isProcessing} className="flex-1 py-4 bg-rose-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow-lg flex items-center justify-center gap-2">{isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Ya, Hapus</button>
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
