'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Input, Textarea, Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, H2, H4, Subtext, Label, Modal, Avatar, Badge, Card, SearchInput, ComboBox, Toast, ToastType } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Project, ProjectPipeline, Company, CompanyMember, Profile, Client, ClientCompany, ClientCompanyCategory } from '@/lib/types';
import {
  Plus, Search, Trello, Table as TableIcon, Loader2, Briefcase,
  AlertTriangle, CheckCircle2, X, Trash2, Calendar, Clock,
  Edit2, Save, FileText, ListTodo, Check, User as UserIcon
} from 'lucide-react';
import { KanbanBoard, KanbanItem, KanbanStage } from '@/components/shared/KanbanBoard/KanbanBoard';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ClientFormModal } from '@/components/features/clients/components/ClientFormModal';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

const getStageColor = (index: number) => {
  return STAGE_COLORS[index % STAGE_COLORS.length];
};

interface KanbanProject extends Project, KanbanItem { }

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
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

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
      setToast({ isOpen: true, message: `Proyek "${form.name}" berhasil disimpan!`, type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: 'Gagal menyimpan proyek: ' + err.message, type: 'error' });
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
      setToast({ isOpen: true, message: 'Proyek berhasil dihapus!', type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: 'Gagal menghapus proyek: ' + err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (taskId: number, newStageId: string) => {
    if (!taskId || isProcessing) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.from('projects').update({ stage_id: newStageId }).eq('id', taskId);
      if (error) throw error;
      fetchData(false);
      setToast({ isOpen: true, message: 'Tahapan proyek berhasil diperbarui!', type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: 'Gagal memperbarui tahapan: ' + err.message, type: 'error' });
      fetchData(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderProjectCard = (p: KanbanProject, isDragged: boolean) => (
    <div
      key={p.id}
      onClick={() => handleOpenEdit(p)}
      className={`group p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer relative ${isDragged ? 'opacity-30' : ''}`}
    >
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
        <Button
          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/projects/tasks/${p.id}`); }}
          className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shadow-sm hover:bg-emerald-600 hover:text-white border border-emerald-100 transition-all"
        >
          <ListTodo size={12} />
        </Button>
      </div>
      <div className="flex items-center justify-between mb-2">
        <Badge variant="ghost" className="px-1.5 py-0 border border-gray-100 text-[7px] text-gray-400 uppercase bg-gray-50">PRJ-{String(p.id).padStart(4, '0')}</Badge>
      </div>
      <H2 className="text-xs font-semibold text-gray-800 mb-0.5 leading-tight group-hover:text-emerald-600 transition-colors uppercase truncate">{p.name}</H2>
      <Subtext className="text-[9px] text-emerald-600 uppercase mb-3 line-clamp-1">{p.client?.name || 'Personal Client'}</Subtext>

      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex -space-x-1.5">
          <div title={`Lead: ${p.lead_profile?.full_name}`}>
            <Avatar name={p.lead_profile?.full_name} src={p.lead_profile?.avatar_url} size="sm" className="w-5 h-5 ring-2 ring-emerald-50 shadow-sm" />
          </div>
          {p.team_members?.slice(0, 2).map((tm, idx) => (
            <div key={idx} title={tm.profile?.full_name}>
              <Avatar name={tm.profile?.full_name} src={tm.profile?.avatar_url} size="sm" className="w-5 h-5 ring-2 ring-white shadow-sm" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[8px] text-gray-400 uppercase">
          <Calendar size={10} />
          {p.end_date ? new Date(p.end_date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) : '-'}
        </div>
      </div>
    </div>
  );

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
      setToast({ isOpen: true, message: 'Client baru berhasil ditambahkan!', type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: 'Gagal menambah client: ' + err.message, type: 'error' });
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
      <Subtext className="text-[10px]  uppercase  text-gray-400">Sinkronisasi Proyek...</Subtext>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <H2 className="text-xl">Daftar Proyek</H2>
            <Subtext className="text-[10px] uppercase ">Kelola dan pantau seluruh proyek klien.</Subtext>
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
              className="!px-6 py-2.5 text-[10px] uppercase  shadow-lg shadow-emerald-100"
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
                    <TableCell isHeader className="w-[80px]">ID</TableCell>
                    <TableCell isHeader>Informasi Proyek</TableCell>
                    <TableCell isHeader>Lead & Team</TableCell>
                    <TableCell isHeader>Timeline</TableCell>
                    <TableCell isHeader>Tahapan</TableCell>
                    <TableCell isHeader className="text-center">Aksi</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedProjects.map(p => (
                    <TableRow key={p.id} className="group hover:bg-gray-50/50 transition-colors text-gray-900">
                      <TableCell className="font-medium text-xs text-gray-500">
                        #{String(p.id).padStart(4, '0')}
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex flex-col">
                          <Link
                            href={`/dashboard/projects/tasks/${p.id}`}
                            className="text-sm font-semibold text-gray-900 hover:text-emerald-600 transition-colors block uppercase"
                          >
                            {p.name}
                          </Link>
                          <Subtext className="text-[10px] text-emerald-600 font-medium uppercase mt-1">
                            {p.client?.name || 'Personal Client'}
                          </Subtext>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
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
                              <div className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[8px] text-gray-400 ring-2 ring-white">
                                +{(p.team_members?.length || 0) - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs font-medium text-gray-700 uppercase">
                            {p.lead_profile?.full_name || '-'}
                          </Label>
                          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 uppercase">
                            <Clock size={10} />
                            {p.start_date ? new Date(p.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                            {p.end_date ? ` - ${new Date(p.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` : ''}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <Badge variant="ghost" className="px-2 py-0.5 border border-emerald-100 text-[9px] text-emerald-600 uppercase bg-emerald-50/50 w-fit">
                            {pipeline?.stages?.find(s => s.id === p.stage_id)?.name || 'Unknown'}
                          </Badge>
                          {p.end_date && (
                            <div className="flex items-center gap-1 text-[9px] text-gray-400 uppercase px-1">
                              <Calendar size={10} />
                              Deadline: {new Date(p.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <ActionButton
                            icon={ListTodo}
                            variant="emerald"
                            onClick={() => router.push(`/dashboard/projects/tasks/${p.id}`)}
                            title="Buka Tasks Proyek"
                          />
                          <ActionButton
                            icon={Edit2}
                            variant="blue"
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Proyek"
                          />
                          <ActionButton
                            icon={Trash2}
                            variant="rose"
                            onClick={() => setConfirmDelete({ isOpen: true, id: p.id, name: p.name })}
                            title="Hapus Proyek"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {processedProjects.length === 0 && (
                    <TableEmpty colSpan={6} icon={<Briefcase size={48} />} message="Belum ada proyek terdaftar" />
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <KanbanBoard<KanbanProject>
            stages={pipeline?.stages?.map((stage, idx) => ({
              id: stage.id,
              name: stage.name,
              colorClass: getStageColor(idx)
            })) || []}
            itemsByStatus={projectsByStage as Record<string, KanbanProject[]>}
            renderCard={renderProjectCard as any}
            onReorder={handleStatusChange}
          />
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
            <Button variant="ghost" onClick={() => { setIsAddModalOpen(false); setIsDetailModalOpen(false); }} className="flex-1  text-xs uppercase ">Batal</Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing}
              isLoading={isProcessing}
              leftIcon={<Save size={14} />}
              variant="success"
              className="flex-1  text-xs uppercase  shadow-lg shadow-emerald-100"
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
            <div className="space-y-1.5 relative">
              <Label className="ml-1 text-[9px] uppercase  text-gray-400">Project Team</Label>
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
                      <span className="text-xs text-gray-700 font-medium uppercase ">{m.profile?.full_name}</span>
                    </Label>
                  ))}
                  {members.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-4">Belum ada member.</div>
                  )}
                </div>
              </details>
            </div>
            <Input type="date" label="Tanggal Mulai" value={form.start_date} onChange={(e: any) => setForm({ ...form, start_date: e.target.value })} className="rounded-md" />
            <Input type="date" label="Estimasi Selesai" value={form.end_date} onChange={(e: any) => setForm({ ...form, end_date: e.target.value })} className="rounded-md" />
          </div>

          {/* Dynamic Custom Fields */}
          {pipeline?.custom_fields && pipeline.custom_fields.length > 0 && (
            <div className="space-y-5 pt-6 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-500" />
                <H4 className="text-[11px]  uppercase  text-gray-900">Field Tambahan Pipeline</H4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pipeline?.custom_fields?.map((field, fIdx) => (
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
            <Textarea label="Catatan & Lingkup Kerja" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} className="h-32 resize-none" placeholder="Tuliskan detail pekerjaan atau instruksi teknis..." />
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
        variant="horizontal"
      />

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
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
    </div >
  );
};
