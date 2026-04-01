'use client';

import React, { useState, useEffect } from 'react';
import { 
  Input, 
  Textarea, 
  Button, 
  Modal, 
  Label, 
  H4, 
} from '@/components/ui';
import { useAppStore } from '@/lib/store/useAppStore';
import { 
  FileText, 
  Save 
} from 'lucide-react';
import { ComboBox } from '@/components/ui/ComboBox';
import { supabase } from '@/lib/supabase';
import { 
  Project, 
  ProjectPipeline, 
  Company, 
  CompanyMember, 
  Profile, 
  Client, 
  ClientCompany, 
  ClientCompanyCategory 
} from '@/lib/types';
import { ClientFormModal } from '@/components/features/clients/components/ClientFormModal';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  company: Company;
  user: Profile;
  members: CompanyMember[];
  pipeline: ProjectPipeline | null;
  clients: Client[];
  clientCompanies: ClientCompany[];
  categories: ClientCompanyCategory[];
}

export const ProjectFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  project,
  company,
  user,
  members,
  pipeline,
  clients,
  clientCompanies,
  categories,
}) => {
  const { showToast } = useAppStore();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);

  const [form, setForm] = useState<any>({
    name: '',
    client_id: '',
    lead_id: user.id,
    team_ids: [] as string[],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
    stage_id: pipeline?.stages?.[0]?.id || '',
    custom_field_values: {} as Record<string, any>
  });

  const [newClientForm, setNewClientForm] = useState<Partial<Client>>({
    salutation: '',
    name: '',
    email: '',
    whatsapp: '',
    client_company_id: null
  });

  useEffect(() => {
    if (project) {
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
    } else {
      setForm({
        name: '',
        client_id: '',
        lead_id: user.id,
        team_ids: [],
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        notes: '',
        stage_id: pipeline?.stages?.[0]?.id || '',
        custom_field_values: {}
      });
    }
  }, [project, isOpen, user.id, pipeline]);

  const handleSave = async () => {
    if (!form.name || !form.stage_id) return;

    if (form.start_date && form.end_date) {
      if (new Date(form.end_date) < new Date(form.start_date)) {
        showToast('Estimasi selesai tidak boleh mendahului tanggal mulai', 'error');
        return;
      }
    }

    setIsProcessing(true);
    try {
      const projectPayload = {
        company_id: company.id,
        pipeline_id: pipeline?.id,
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
        const { data, error } = await supabase.from('projects').insert(projectPayload).select().single();
        if (error) throw error;
        projectId = data.id;
      }

      if (form.team_ids.length > 0) {
        const teamInserts = form.team_ids.map((uid: string) => ({
          project_id: projectId,
          user_id: uid
        }));
        await supabase.from('project_team_members').insert(teamInserts);
      }

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
      showToast(`Proyek "${form.name}" berhasil disimpan!`, 'success');
    } catch (err: any) {
      showToast('Gagal menyimpan proyek: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAddClient = async (f: Partial<Client>) => {
    if (!f.name?.trim()) return;
    setIsProcessingQuick(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          company_id: company.id,
          salutation: f.salutation,
          name: f.name.trim(),
          email: f.email,
          whatsapp: f.whatsapp ? `+62${f.whatsapp.replace(/\D/g, '')}` : null,
          client_company_id: f.client_company_id
        })
        .select()
        .single();
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['clients', company.id] });
      setForm((prev: any) => ({ ...prev, client_id: data.id }));
      setIsAddingClient(false);
      setNewClientForm({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
      showToast('Client baru berhasil ditambahkan!', 'success');
    } catch (err: any) {
      showToast('Gagal menambah client: ' + err.message, 'error');
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
    queryClient.invalidateQueries({ queryKey: ['client-companies', company.id] });
    return data;
  };

  const handleQuickAddCategory = async (name: string) => {
    const { data, error } = await supabase
      .from('client_company_categories')
      .insert({ name: name.trim(), company_id: company.id })
      .select()
      .single();
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['client-company-categories', company.id] });
    return data;
  };

  const handleCustomFieldChange = (label: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      custom_field_values: {
        ...prev.custom_field_values,
        [label]: value
      }
    }));
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={form.id ? "Detail Proyek" : "Registrasi Proyek Baru"}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="ghost" onClick={onClose} disabled={isProcessing} className="rounded-md">
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
              <Label className="ml-1 text-[9px] uppercase text-gray-400">Project Team</Label>
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
                      <span className="text-xs text-gray-700 font-medium uppercase">{m.profile?.full_name}</span>
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

          {pipeline?.custom_fields && pipeline.custom_fields.length > 0 && (
            <div className="space-y-5 pt-6 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-500" />
                <H4 className="text-[11px] uppercase text-gray-900">Field Tambahan Pipeline</H4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pipeline?.custom_fields?.map((field: any, fIdx: number) => (
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
      />
    </>
  );
};
