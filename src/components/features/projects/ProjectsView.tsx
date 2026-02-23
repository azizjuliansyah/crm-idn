'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Project, ProjectPipeline, Company, CompanyMember, Profile, Client } from '@/lib/types';
import { 
  Plus, Search, Trello, Table as TableIcon, Loader2, Briefcase,
  AlertTriangle, CheckCircle2, X, Trash2, Calendar, Clock,
  Edit2, Save, FileText, ListTodo
} from 'lucide-react';
import { Modal, SearchInput, Table, TableHeader, TableRow, TableCell, TableBody, TableEmpty, Badge, Button, Card, Input, Select, Label, Textarea, Avatar, H2 } from '@/components/ui';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { NotificationModal } from '@/components/shared/modals/NotificationModal';
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
      const [
        pDataRes,
        projectsDataRes,
        clientsDataRes
      ] = await Promise.all([
        supabase.from('project_pipelines').select('*, stages:project_pipeline_stages(*)').eq('id', pipelineId).maybeSingle(),
        supabase.from('projects').select(`
          *,
          client:clients(*),
          lead_profile:profiles!projects_lead_id_fkey(*),
          team_members:project_team_members(user_id, profile:profiles(*))
        `).eq('pipeline_id', pipelineId).order('id', { ascending: false }),
        supabase.from('clients').select('*').eq('company_id', company.id).order('name')
      ]);

      if (pDataRes.data) {
        setPipeline({
          ...pDataRes.data,
          stages: (pDataRes.data.stages || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
        });
      }
      if (projectsDataRes.data) setProjects(projectsDataRes.data);
      if (clientsDataRes.data) setClients(clientsDataRes.data);

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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 min-h-[400px]">
      <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sinkronisasi Proyek...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 h-full overflow-hidden text-gray-900">
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0 overflow-x-auto custom-scrollbar">
        <div className="w-[400px] shrink-0">
          <SearchInput 
            placeholder="Cari proyek atau klien..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="rounded-xl border-gray-100 shadow-none bg-gray-50/30"
          />
        </div>
        
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1">
            <Button variant="ghost" size="sm" onClick={() => setViewMode('table')} className={`!p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-gray-100' : '!text-gray-400'}`}><TableIcon size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={() => setViewMode('kanban')} className={`!p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-gray-100' : '!text-gray-400'}`}><Trello size={14} /></Button>
          </div>
          <Button 
            onClick={handleOpenAdd} 
            leftIcon={<Plus size={14} />}
            variant="success"
            className="!px-6 py-2.5 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100"
          >
            Project Baru
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'table' ? (
          <Card className="!p-0 h-full flex flex-col overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow className="!bg-gray-50/50 border-b border-gray-100">
                    <TableCell isHeader className="text-[10px] font-black uppercase tracking-widest py-4">Informasi Proyek</TableCell>
                    <TableCell isHeader className="text-[10px] font-black uppercase tracking-widest py-4">Lead & Team</TableCell>
                    <TableCell isHeader className="text-[10px] font-black uppercase tracking-widest py-4">Timeline</TableCell>
                    <TableCell isHeader className="text-[10px] font-black uppercase tracking-widest py-4">Tahapan</TableCell>
                    <TableCell isHeader className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedProjects.map(p => (
                    <TableRow key={p.id} className="group">
                      <TableCell className="py-5">
                        <button 
                          onClick={() => router.push(`/dashboard/projects/tasks/${p.id}`)}
                          className="text-xs font-black text-gray-900 tracking-tight hover:text-emerald-600 transition-colors text-left block uppercase"
                        >
                          {p.name}
                        </button>
                        <p className="text-[9px] text-emerald-600 font-black uppercase tracking-tight mt-1">{p.client?.name || 'Personal Client'}</p>
                        {p.custom_field_values && Object.entries(p.custom_field_values).slice(0, 1).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-1.5 mt-2">
                             <div className="w-1 h-1 rounded-full bg-emerald-300"></div>
                             <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[150px]">{k}: {String(v)}</p>
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <div title={`Lead: ${p.lead_profile?.full_name}`}>
                              <Avatar name={p.lead_profile?.full_name} src={p.lead_profile?.avatar_url} size="sm" className="ring-2 ring-emerald-50 shadow-sm" />
                           </div>
                           <div className="flex -space-x-2">
                              {p.team_members?.slice(0, 3).map((tm, idx) => (
                                <div key={idx} title={tm.profile?.full_name}>
                                   <Avatar name={tm.profile?.full_name} src={tm.profile?.avatar_url} size="sm" className="w-6 h-6 ring-2 ring-white shadow-sm" />
                                </div>
                              ))}
                              {(p.team_members?.length || 0) > 3 && (
                                <div className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[8px] font-black text-gray-400 ring-2 ring-white">
                                  +{(p.team_members?.length || 0) - 3}
                                </div>
                              )}
                           </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="space-y-1.5">
                            <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 w-fit">
                               <Calendar size={10} className="text-gray-400" />
                               <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">{p.start_date ? new Date(p.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                            </div>
                            <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 w-fit">
                               <Clock size={10} className="text-emerald-500" />
                               <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">{p.end_date ? new Date(p.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                            </div>
                         </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral" className="uppercase justify-center px-3 py-1 text-[8px] font-black tracking-widest border-gray-100 bg-gray-50 text-gray-500">
                          {pipeline?.stages?.find(s => s.id === p.stage_id)?.name || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                         <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform scale-95 group-hover:scale-100">
                            <Button 
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/dashboard/projects/tasks/${p.id}`)} 
                              className="!p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl"
                              title="Buka Tasks Proyek"
                            >
                              <ListTodo size={14} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(p)} className="!p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Edit2 size={14} /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete({ isOpen: true, id: p.id, name: p.name })} className="!p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 size={14} /></Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {processedProjects.length === 0 && (
                    <TableEmpty colSpan={5} icon={<Briefcase size={48} />} message="Belum ada proyek terdaftar" />
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <div className="flex gap-4 items-start h-full overflow-x-auto pb-4 scrollbar-hide">
            {pipeline?.stages?.map((stage, sIdx) => (
              <div key={stage.id} className="flex flex-col gap-3 min-w-[300px] w-[300px] h-full">
                <div className={`p-4 ${STAGE_COLORS[sIdx % STAGE_COLORS.length]} rounded-2xl shadow-lg shadow-black/5 flex items-center justify-between border-b-4 border-black/10`}>
                   <Badge variant="ghost" className="!p-0 text-[10px] font-black uppercase tracking-[0.2em] text-white">{stage.name}</Badge>
                   <div className="flex items-center justify-center bg-white/20 px-2.5 py-1 rounded-lg border border-white/20">
                      <span className="text-[10px] font-black text-white">{projectsByStage[stage.id]?.length || 0}</span>
                   </div>
                </div>
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDropTarget(stage.id); }} 
                  onDrop={(e) => { e.preventDefault(); const id = parseInt(e.dataTransfer.getData('text/plain')); if (id) handleStatusChange(stage.id, id); }}
                  className={`flex-1 space-y-3 p-3 rounded-2xl border-2 border-dashed transition-all overflow-y-auto scrollbar-hide ${dropTarget === stage.id ? 'bg-emerald-50/50 border-emerald-300' : 'bg-gray-50/50 border-transparent'}`}
                >
                   {projectsByStage[stage.id]?.map(p => (
                     <div 
                        key={p.id} 
                        draggable
                        onDragStart={(e) => { setDraggingId(p.id); e.dataTransfer.setData('text/plain', p.id.toString()); }}
                        onClick={() => handleOpenEdit(p)}
                        className="group p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 hover:border-emerald-200 transition-all cursor-pointer transform hover:-translate-y-1 active:scale-[0.98] relative"
                      >
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                           <button 
                              onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/projects/tasks/${p.id}`); }}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm hover:bg-emerald-600 hover:text-white border border-emerald-100 transition-all"
                           >
                              <ListTodo size={14} />
                           </button>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <Badge variant="ghost" className="px-2 py-0.5 border border-gray-100 text-[8px] font-black text-gray-400 uppercase tracking-widest bg-gray-50">PRJ-{String(p.id).padStart(4, '0')}</Badge>
                        </div>
                        <H2 className="font-black text-[13px] text-gray-800 mb-1 leading-tight tracking-tight group-hover:text-emerald-600 transition-colors uppercase">{p.name}</H2>
                        <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mb-4">{p.client?.name || 'Personal Client'}</p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                           <div className="flex -space-x-1.5">
                              <div title={`Lead: ${p.lead_profile?.full_name}`}>
                                 <Avatar name={p.lead_profile?.full_name} src={p.lead_profile?.avatar_url} size="sm" className="w-6 h-6 ring-2 ring-emerald-50 shadow-sm" />
                              </div>
                              {p.team_members?.slice(0, 2).map((tm, idx) => (
                                <div key={idx} title={tm.profile?.full_name}>
                                   <Avatar name={tm.profile?.full_name} src={tm.profile?.avatar_url} size="sm" className="w-6 h-6 ring-2 ring-white shadow-sm" />
                                </div>
                              ))}
                           </div>
                           <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                <Calendar size={10} />
                                {p.end_date ? new Date(p.end_date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) : '-'}
                           </div>
                        </div>
                     </div>
                   ))}
                   {projectsByStage[stage.id]?.length === 0 && (
                     <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl text-[9px] font-black uppercase text-gray-200 tracking-[0.2em]">Kosong</div>
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
        title={form.id ? "Detail Proyek" : "Registrasi Proyek Baru"}
        size="lg"
        footer={
          <div className="flex w-full gap-3">
             <Button variant="ghost" onClick={() => { setIsAddModalOpen(false); setIsDetailModalOpen(false); }} className="flex-1 font-black text-xs uppercase tracking-widest">Batal</Button>
             <Button 
               onClick={handleSave} 
               disabled={isProcessing} 
               isLoading={isProcessing}
               leftIcon={<Save size={14} />}
               variant="success"
               className="flex-1 font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100"
             >
               Simpan Data
             </Button>
          </div>
        }
      >
        <div className="space-y-6 py-2">
            <Input 
              label="Nama Proyek*" 
              value={form.name} 
              onChange={(e: any) => setForm({...form, name: e.target.value})} 
              placeholder="Misal: Website Company Profile..."
              className="rounded-xl"
              required
            />
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Select 
                label="Klien Terkait" 
                value={form.client_id} 
                onChange={(e: any) => setForm({...form, client_id: e.target.value})}
                className="rounded-xl"
              >
                <option value="">-- Pilih Klien --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select 
                label="Tahapan Saat Ini" 
                value={form.stage_id} 
                onChange={(e: any) => setForm({...form, stage_id: e.target.value})}
                className="rounded-xl"
              >
                {pipeline?.stages?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Select 
                label="Project Lead" 
                value={form.lead_id} 
                onChange={(e: any) => setForm({...form, lead_id: e.target.value})}
                className="rounded-xl"
              >
                <option value="">Pilih Lead</option>
                {members.map(m => <option key={m.profile?.id} value={m.profile?.id}>{m.profile?.full_name}</option>)}
              </Select>
              <Input type="date" label="Tanggal Mulai" value={form.start_date} onChange={(e: any) => setForm({...form, start_date: e.target.value})} className="rounded-xl" />
              <Input type="date" label="Estimasi Selesai" value={form.end_date} onChange={(e: any) => setForm({...form, end_date: e.target.value})} className="rounded-xl" />
              <div className="space-y-2">
                 <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Project Team</Label>
                 <div className="p-3 bg-gray-50/50 border border-gray-100 rounded-2xl max-h-32 overflow-y-auto scrollbar-hide">
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
                        <Label className="ml-1">{field.label}</Label>
                        <Input 
                          type={field.type} 
                          value={form.custom_field_values[field.label] || ''}
                          onChange={(e: any) => handleCustomFieldChange(field.label, e.target.value)}
                          className="!py-3.5 shadow-sm"
                        />
                      </div>
                    ))}
                 </div>
              </div>
           )}

           <div className="space-y-4 pt-6 border-t border-gray-50">
              <Textarea label="Catatan & Lingkup Kerja" value={form.notes} onChange={(e: any) => setForm({...form, notes: e.target.value})} className="h-32 resize-none shadow-inner" placeholder="Tuliskan detail pekerjaan atau instruksi teknis..." />
           </div>
        </div>
      </Modal>

      <ConfirmDeleteModal 
        isOpen={confirmDelete.isOpen} 
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} 
        onConfirm={handleDelete}
        title="Hapus Proyek"
        itemName={confirmDelete.name}
        isProcessing={isProcessing}
      />

      <NotificationModal 
        isOpen={notification.isOpen} 
        onClose={() => setNotification({ ...notification, isOpen: false })} 
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />


    </div>
  );
};
