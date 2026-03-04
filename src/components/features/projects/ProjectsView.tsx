'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Input, Textarea, Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, H2, H4, Subtext, Label, Modal, Avatar, Badge, Card, SearchInput, ComboBox } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Project, ProjectPipeline, Company, CompanyMember, Profile, Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import {
  Plus, Search, Trello, Table as TableIcon, Loader2, Briefcase,
  AlertTriangle, CheckCircle2, X, Trash2, Calendar, Clock,
  Edit2, Save, FileText, ListTodo, Check
} from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { NotificationModal } from '@/components/shared/modals/NotificationModal';
import { ClientFormModal } from '@/components/features/clients/components/ClientFormModal';
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
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [categories, setCategories] = useState<ClientCompanyCategory[]>([]);
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

  // Quick Add Client State
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState<Partial<Client>>({
    salutation: '',
    name: '',
    email: '',
    whatsapp: '',
    client_company_id: null
  });
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);

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
        clientsDataRes,
        companiesDataRes,
        categoriesDataRes
      ] = await Promise.all([
        supabase.from('project_pipelines').select('*, stages:project_pipeline_stages(*)').eq('id', pipelineId).maybeSingle(),
        supabase.from('projects').select(`
          *,
          client:clients(*),
          lead_profile:profiles!projects_lead_id_fkey(*),
          team_members:project_team_members(user_id, profile:profiles(*))
        `).eq('pipeline_id', pipelineId).order('id', { ascending: false }),
        supabase.from('clients').select('*').eq('company_id', company.id).order('name'),
        supabase.from('client_companies').select('*').eq('company_id', company.id).order('name'),
        supabase.from('client_company_categories').select('*').eq('company_id', company.id).order('name')
      ]);

      if (pDataRes.data) {
        setPipeline({
          ...pDataRes.data,
          stages: (pDataRes.data.stages || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
        });
      }
      if (projectsDataRes.data) setProjects(projectsDataRes.data);
      if (clientsDataRes.data) setClients(clientsDataRes.data);
      if (companiesDataRes.data) setClientCompanies(companiesDataRes.data);
      if (categoriesDataRes.data) setCategories(categoriesDataRes.data);

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

  const handleQuickAddCategory = async (name: string) => {
    const { data, error } = await supabase
      .from('client_company_categories')
      .insert({ name: name.trim(), company_id: company.id })
      .select()
      .single();
    if (error) throw error;
    setCategories((prev: ClientCompanyCategory[]) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const handleQuickAddClient = async (form: Partial<Client>) => {
    if (!form.name?.trim()) return;
    setIsProcessingQuick(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          company_id: company.id,
          salutation: form.salutation,
          name: form.name.trim(),
          email: form.email,
          whatsapp: form.whatsapp ? `+62${form.whatsapp.replace(/\\D/g, '')}` : null,
          client_company_id: form.client_company_id
        })
        .select()
        .single();
      if (error) throw error;
      const freshRes = await supabase.from('clients').select('*').eq('company_id', company.id).order('name');
      if (freshRes.data) setClients(freshRes.data);
      setForm((prev: any) => ({ ...prev, client_id: data.id }));
      setIsAddingClient(false);
      setNewClientForm({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal', message: err.message, type: 'error' });
    } finally {
      setIsProcessingQuick(false);
    }
  };

  const handleQuickAddCompany = async (coData: any) => {
    const { data, error } = await supabase
      .from('client_companies')
      .insert({
        company_id: company.id,
        ...coData
      })
      .select()
      .single();
    if (error) throw error;
    setClientCompanies((prev: ClientCompany[]) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
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
      <Subtext className="text-[10px]  uppercase tracking-tight text-gray-400">Sinkronisasi Proyek...</Subtext>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl">Daftar Proyek</H2>
            <Subtext className="text-[10px] uppercase tracking-tight">Kelola dan pantau seluruh proyek klien.</Subtext>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-50 border border-gray-100 p-1 rounded-xl">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={`!p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm ring-1 ring-gray-100 text-emerald-600' : 'text-gray-400'}`}
              >
                <TableIcon size={14} strokeWidth={2.5} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('kanban')}
                className={`!p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm ring-1 ring-gray-100 text-emerald-600' : 'text-gray-400'}`}
              >
                <Trello size={14} strokeWidth={2.5} />
              </Button>
            </div>
            <Button
              onClick={handleOpenAdd}
              leftIcon={<Plus size={14} strokeWidth={3} />}
              className="!px-6 py-2.5 text-[10px] uppercase tracking-tight shadow-lg shadow-emerald-100"
              variant="success"
              size="sm"
            >
              Project Baru
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-50">
          <div className="w-[400px] shrink-0">
            <SearchInput
              placeholder="Cari proyek atau klien..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="h-[80vh] mb-4 overflow-hidden flex flex-col">
        {viewMode === 'table' ? (
          <Card className="!p-0 h-full flex flex-col overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow className="hover:bg-transparent">
                    <TableCell isHeader>Informasi Proyek</TableCell>
                    <TableCell isHeader>Lead & Team</TableCell>
                    <TableCell isHeader>Timeline</TableCell>
                    <TableCell isHeader>Tahapan</TableCell>
                    <TableCell isHeader className="text-center">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedProjects.map(p => (
                    <TableRow key={p.id} className="group">
                      <TableCell className="py-5">
                        <Button
                          onClick={() => router.push(`/dashboard/projects/tasks/${p.id}`)}
                          className="text-xs  text-gray-900 tracking-tight hover:text-emerald-600 transition-colors text-left block uppercase"
                        >
                          {p.name}
                        </Button>
                        <Subtext className="text-[9px] text-emerald-600  uppercase tracking-tight mt-1">{p.client?.name || 'Personal Client'}</Subtext>
                        {p.custom_field_values && Object.entries(p.custom_field_values).slice(0, 1).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-1.5 mt-2">
                            <div className="w-1 h-1 rounded-full bg-emerald-300"></div>
                            <Subtext className="text-[8px]  text-gray-400 uppercase tracking-tight truncate max-w-[150px]">{k}: {String(v)}</Subtext>
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
                              <div className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[8px]  text-gray-400 ring-2 ring-white">
                                +{(p.team_members?.length || 0) - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6">
                        <Label className="text-xs text-gray-600 tracking-tight">{p.client?.name || 'Personal Client'}</Label>
                      </TableCell>
                      <TableCell className="py-5 px-6">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 text-[10px] text-gray-500 border border-gray-100 w-fit">
                          <Calendar size={12} className="text-gray-400" />
                          {p.end_date ? new Date(p.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/projects/tasks/${p.id}`)}
                            className="!p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Buka Tasks Proyek"
                          >
                            <ListTodo size={14} strokeWidth={2.5} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(p)}
                            className="!p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors transition-colors"
                            title="Edit Proyek"
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete({ isOpen: true, id: p.id, name: p.name })}
                            className="!p-2 text-rose-700 !bg-transparent hover:!bg-rose-50 shadow-none hover:border-rose-200 transition-all border border-transparent rounded-lg"
                            title="Hapus Proyek"
                          >
                            <Trash2 size={14} />
                          </Button>
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
                  <Badge variant="ghost" className="!p-0 text-[10px]  uppercase tracking-[0.2em] text-white">{stage.name}</Badge>
                  <div className="flex items-center justify-center bg-white/20 px-2.5 py-1 rounded-lg border border-white/20">
                    <Label className="text-[10px]  text-white">{projectsByStage[stage.id]?.length || 0}</Label>
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
                        <Button
                          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/projects/tasks/${p.id}`); }}
                          className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm hover:bg-emerald-600 hover:text-white border border-emerald-100 transition-all"
                        >
                          <ListTodo size={14} />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="ghost" className="px-2 py-0.5 border border-gray-100 text-[8px]  text-gray-400 uppercase tracking-tight bg-gray-50">PRJ-{String(p.id).padStart(4, '0')}</Badge>
                      </div>
                      <H2 className=" text-[13px] text-gray-800 mb-1 leading-tight tracking-tight group-hover:text-emerald-600 transition-colors uppercase">{p.name}</H2>
                      <Subtext className="text-[9px] text-emerald-600  uppercase tracking-tight mb-4">{p.client?.name || 'Personal Client'}</Subtext>

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
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 text-[9px]  text-gray-400 uppercase tracking-tight">
                          <Calendar size={10} />
                          {p.end_date ? new Date(p.end_date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {projectsByStage[stage.id]?.length === 0 && (
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
        title={form.id ? "Detail Proyek" : "Registrasi Proyek Baru"}
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
            label="Nama Proyek*"
            value={form.name}
            onChange={(e: any) => setForm({ ...form, name: e.target.value })}
            placeholder="Misal: Website Company Profile..."
            className="rounded-md"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ComboBox
              label="Klien Terkait"
              value={form.client_id}
              onChange={(val: string | number) => setForm({ ...form, client_id: val })}
              options={clients.map(c => ({
                value: c.id,
                label: c.name,
                sublabel: `${c.salutation || ''} ${c.whatsapp || c.email || ''}`.trim()
              }))}
              className="rounded-md"
              onAddNew={() => {
                setNewClientForm({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
                setIsAddingClient(true);
              }}
              addNewLabel="Tambah Client Baru"
            />


            <ComboBox
              label="Tahapan Saat Ini"
              value={form.stage_id}
              onChange={(val: string | number) => setForm({ ...form, stage_id: val.toString() })}
              options={pipeline?.stages?.map(s => ({ value: s.id, label: s.name })) || []}
              className="rounded-md"
              hideSearch
            />
            <ComboBox
              label="Project Lead"
              value={form.lead_id}
              onChange={(val: string | number) => setForm({ ...form, lead_id: val.toString() })}
              options={members.map(m => ({
                value: m.profile?.id || '',
                label: m.profile?.full_name || '',
                sublabel: m.profile?.email
              }))}
              className="rounded-md"
            />
            <Input type="date" label="Tanggal Mulai" value={form.start_date} onChange={(e: any) => setForm({ ...form, start_date: e.target.value })} className="rounded-md" />
            <Input type="date" label="Estimasi Selesai" value={form.end_date} onChange={(e: any) => setForm({ ...form, end_date: e.target.value })} className="rounded-md" />
            <div className="space-y-1.5 relative">
              <Label className="ml-1 text-[9px] uppercase tracking-tight text-gray-400">Project Team</Label>
              <details className="group relative">
                <summary className="flex items-center justify-between w-full px-4 py-3.5 border border-gray-200 rounded-md text-sm font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 list-none">
                  <span className={form.team_ids.length ? 'text-gray-900' : 'text-gray-400'}>
                    {form.team_ids.length > 0
                      ? `${form.team_ids.length} Orang Dipilih`
                      : 'Pilih Project Team'}
                  </span>
                  <div className="flex-shrink-0 ml-2">
                    <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </summary>
                <div className="absolute z-50 w-full bg-white mt-1 border border-gray-100 rounded-2xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar p-2">
                  {members.map(m => (
                    <Label key={m.user_id} className="flex items-center gap-3 py-2 px-3 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors">
                      <Input
                        type="checkbox"
                        checked={form.team_ids.includes(m.user_id)}
                        onChange={(e: any) => {
                          const ids = e.target.checked
                            ? [...form.team_ids, m.user_id]
                            : form.team_ids.filter((id: string) => id !== m.user_id);
                          setForm({ ...form, team_ids: ids });
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-xs text-gray-700 font-medium uppercase tracking-tight">{m.profile?.full_name}</span>
                    </Label>
                  ))}
                  {members.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-4">Belum ada member.</div>
                  )}
                </div>
              </details>
            </div>
          </div>

          {/* Dynamic Custom Fields */}
          {pipeline?.custom_fields && pipeline.custom_fields.length > 0 && (
            <div className="space-y-5 pt-6 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-500" />
                <H4 className="text-[11px]  uppercase tracking-tight text-gray-900">Field Tambahan Pipeline</H4>
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
            <Textarea label="Catatan & Lingkup Kerja" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} className="h-32 resize-none shadow-inner" placeholder="Tuliskan detail pekerjaan atau instruksi teknis..." />
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


      <ClientFormModal
        isOpen={isAddingClient}
        onClose={() => setIsAddingClient(false)}
        onSave={handleQuickAddClient}
        form={newClientForm}
        setForm={setNewClientForm}
        isProcessing={isProcessingQuick}
        clientCompanies={clientCompanies}
        categories={categories}
        companyId={company.id}
        onQuickAddCompany={handleQuickAddCompany}
        onQuickAddCategory={handleQuickAddCategory}
      />
    </div>
  );
};
