'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ProjectPipeline, Company, ProjectCustomField } from '@/lib/types';
import { 
  Plus, Edit2, Trash2, GripVertical, Save, X, 
  Loader2, Workflow, AlertTriangle,
  ArrowUp, ArrowDown, Type, Hash, Calendar as CalendarIcon
} from 'lucide-react';
import { Modal, Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, H2, Subtext, Card, Input, Select, Label } from '@/components/ui';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';

interface Props {
  company: Company;
}

interface StageForm {
  id?: string;
  name: string;
}

export const ProjectPipelinesSettingsView: React.FC<Props> = ({ company }) => {
  const [pipelines, setPipelines] = useState<ProjectPipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<{ id: number | null, name: string, stages: StageForm[], custom_fields: ProjectCustomField[] }>({
    id: null,
    name: '',
    stages: [
      { name: 'Planning' }, { name: 'Implementation' }, { name: 'Review' }, { name: 'Closing' }
    ],
    custom_fields: []
  });
  const [newStageInput, setNewStageInput] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date'>('text');

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, id: number | null }>({
    isOpen: false,
    id: null
  });

  const fetchPipelines = async () => {
    setLoading(true);
    try {
      const { data: pipelinesData } = await supabase
        .from('project_pipelines')
        .select('*, stages:project_pipeline_stages(*)')
        .eq('company_id', company.id)
        .order('id');
      
      if (pipelinesData) {
        const sorted = pipelinesData.map(p => ({
          ...p,
          stages: (p.stages || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
        }));
        setPipelines(sorted);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, [company.id]);

  const handleOpenAdd = () => {
    setModalForm({
      id: null,
      name: '',
      stages: [
        { name: 'Planning' }, { name: 'Implementation' }, { name: 'Review' }, { name: 'Closing' }
      ],
      custom_fields: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: ProjectPipeline) => {
    setModalForm({
      id: p.id,
      name: p.name,
      stages: (p.stages || []).map(s => ({ id: s.id, name: s.name })),
      custom_fields: p.custom_fields || []
    });
    setIsModalOpen(true);
  };

  const addStageToForm = () => {
    if (!newStageInput.trim()) return;
    setModalForm(prev => ({
      ...prev,
      stages: [...prev.stages, { name: newStageInput.trim() }]
    }));
    setNewStageInput('');
  };

  const removeStageFromForm = (idx: number) => {
    setModalForm(prev => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== idx)
    }));
  };

  const addCustomField = () => {
    if (!newFieldLabel.trim()) return;
    setModalForm(prev => ({
      ...prev,
      custom_fields: [...prev.custom_fields, { label: newFieldLabel.trim(), type: newFieldType }]
    }));
    setNewFieldLabel('');
  };

  const removeCustomField = (idx: number) => {
    setModalForm(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== idx)
    }));
  };

  const handleMoveStage = (idx: number, direction: 'up' | 'down') => {
    const newStages = [...modalForm.stages];
    if (direction === 'up' && idx > 0) {
      [newStages[idx], newStages[idx - 1]] = [newStages[idx - 1], newStages[idx]];
    } else if (direction === 'down' && idx < newStages.length - 1) {
      [newStages[idx], newStages[idx + 1]] = [newStages[idx + 1], newStages[idx]];
    }
    setModalForm({ ...modalForm, stages: newStages });
  };

  const handleUpdateStageName = (idx: number, val: string) => {
    const newStages = [...modalForm.stages];
    newStages[idx].name = val;
    setModalForm({ ...modalForm, stages: newStages });
  };

  const handleSave = async () => {
    if (!modalForm.name.trim() || modalForm.stages.length === 0) return;
    setIsProcessing(true);
    
    try {
      let pipelineId = modalForm.id;

      if (pipelineId) {
        await supabase.from('project_pipelines').update({ 
          name: modalForm.name,
          custom_fields: modalForm.custom_fields 
        }).eq('id', pipelineId);
        
        const currentStages = pipelines.find(p => p.id === pipelineId)?.stages || [];
        const stageIdsToKeep = modalForm.stages.filter(s => s.id).map(s => s.id);
        const stageIdsToRemove = currentStages.filter(s => !stageIdsToKeep.includes(s.id)).map(s => s.id);

        if (stageIdsToRemove.length > 0) {
          await supabase.from('project_pipeline_stages').delete().in('id', stageIdsToRemove);
        }

        const stageUpserts = modalForm.stages.map((s, idx) => ({
          ...(s.id ? { id: s.id } : {}),
          pipeline_id: pipelineId,
          name: s.name,
          sort_order: idx + 1
        }));
        await supabase.from('project_pipeline_stages').upsert(stageUpserts);

      } else {
        const { data: newP } = await supabase.from('project_pipelines').insert({
          company_id: company.id,
          name: modalForm.name,
          custom_fields: modalForm.custom_fields
        }).select().single();
        pipelineId = newP.id;

        if (pipelineId) {
          const stageInserts = modalForm.stages.map((s, idx) => ({
            pipeline_id: pipelineId,
            name: s.name,
            sort_order: idx + 1
          }));
          await supabase.from('project_pipeline_stages').insert(stageInserts);
        }
      }

      setIsModalOpen(false);
      await fetchPipelines();
      window.dispatchEvent(new CustomEvent('pipelinesUpdated'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmModal.id) return;
    setIsProcessing(true);
    try {
      await supabase.from('project_pipelines').delete().eq('id', confirmModal.id);
      setConfirmModal({ isOpen: false, id: null });
      await fetchPipelines();
      window.dispatchEvent(new CustomEvent('pipelinesUpdated'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Konfigurasi...</p></div>;

  return (
    <div className="max-w-5xl space-y-8">
      <Card className="p-10 border-b border-gray-50 flex items-center justify-between !rounded-b-none">
          <div>
            <H2 className="text-2xl font-bold tracking-tighter">Project Pipeline Management</H2>
            <Subtext className="mt-1">Kelola tahapan pengerjaan proyek di workspace Anda.</Subtext>
          </div>
          <Button 
            onClick={handleOpenAdd}
            leftIcon={<Plus size={16} />}
          >
            Tambah Pipeline
          </Button>
      </Card>

      <Card className="!rounded-t-none !border-t-0 p-0 overflow-hidden">

        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="px-10">Nama Pipeline</TableCell>
              <TableCell isHeader className="px-10">Tahapan</TableCell>
              <TableCell isHeader className="px-10 text-center">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pipelines.map(p => (
              <TableRow key={p.id} className="group">
                <TableCell className="px-10 py-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Workflow size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 tracking-tight">{p.name}</p>
                      {p.custom_fields && p.custom_fields.length > 0 && (
                        <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">{p.custom_fields.length} Custom Fields</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-10 py-8">
                  <div className="flex flex-wrap gap-2">
                    {p.stages?.map(s => (
                      <span key={s.id} className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-bold text-gray-500 shadow-sm uppercase tracking-tighter">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="px-10 py-8 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(p)} className="!p-2 text-blue-500 hover:bg-blue-50"><Edit2 size={16} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmModal({ isOpen: true, id: p.id })} className="!p-2 text-rose-500 hover:bg-rose-50"><Trash2 size={16} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {pipelines.length === 0 && (
            <TableEmpty colSpan={3} icon={<Workflow size={48} />} message="Belum ada project pipeline yang dikonfigurasi" />
          )}
        </Table>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalForm.id ? "Edit Project Pipeline" : "Daftarkan Pipeline Baru"}
        size="lg"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="px-8 flex-1">Batal</Button>
            <Button 
              onClick={handleSave} 
              disabled={isProcessing}
              isLoading={isProcessing}
              leftIcon={<Save size={14} />}
              className="flex-1"
            >
              Simpan Perubahan
            </Button>
          </div>
        }
      >
        <div className="space-y-10 py-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Workflow size={12} />
              </div>
              <Label>Nama Pipeline Proyek</Label>
            </div>
            <Input 
              type="text" 
              value={modalForm.name}
              onChange={e => setModalForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Misal: Pengembangan Software..."
              className="!py-4"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Stages Section */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <GripVertical size={12} />
                  </div>
                  <Label>Tahapan Kerja</Label>
                </div>
              </div>

              <div className="space-y-3">
                {modalForm.stages.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-blue-100 transition-all group">
                    <div className="w-7 h-7 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-[9px] font-bold text-gray-400">
                      {idx + 1}
                    </div>
                    <input 
                      type="text"
                      value={s.name}
                      onChange={(e) => handleUpdateStageName(idx, e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none font-bold text-xs text-gray-700"
                    />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleMoveStage(idx, 'up')} disabled={idx === 0} className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-20"><ArrowUp size={14} /></button>
                      <button onClick={() => handleMoveStage(idx, 'down')} disabled={idx === modalForm.stages.length - 1} className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-20"><ArrowDown size={14} /></button>
                      <button onClick={() => removeStageFromForm(idx)} className="p-1.5 text-gray-400 hover:text-rose-600"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input 
                  type="text" 
                  value={newStageInput}
                  onChange={e => setNewStageInput(e.target.value)}
                  onKeyDown={(e: any) => e.key === 'Enter' && addStageToForm()}
                  placeholder="Nama stage..."
                  className="flex-1 !py-3"
                />
                <button onClick={addStageToForm} className="px-4 py-3 bg-gray-900 text-white rounded-xl font-bold text-[10px] uppercase">Tambah</button>
              </div>
            </div>

            {/* Custom Fields Section */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Plus size={12} />
                  </div>
                  <Label>Custom Fields (Optional)</Label>
                </div>
              </div>

              <div className="space-y-3">
                {modalForm.custom_fields.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl group">
                    <div className="w-7 h-7 bg-white border border-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                      {f.type === 'text' ? <Type size={14} /> : f.type === 'number' ? <Hash size={14} /> : <CalendarIcon size={14} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-700">{f.label}</p>
                      <p className="text-[8px] font-bold uppercase text-emerald-600 tracking-tighter">{f.type}</p>
                    </div>
                    <button onClick={() => removeCustomField(idx)} className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {modalForm.custom_fields.length === 0 && (
                  <div className="p-10 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-300">Belum ada field kustom</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                <Input 
                  type="text" 
                  value={newFieldLabel}
                  onChange={e => setNewFieldLabel(e.target.value)}
                  placeholder="Label field (misal: Lokasi)..."
                  className="!py-3"
                />
                <div className="flex gap-2">
                  <Select 
                    value={newFieldType}
                    onChange={(e: any) => setNewFieldType(e.target.value)}
                    className="flex-1 !py-3 w-32"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                  </Select>
                  <button onClick={addCustomField} className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase shadow-lg shadow-emerald-100">+ Add</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDeleteModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ isOpen: false, id: null })} 
        onConfirm={handleDelete}
        title="Hapus Pipeline Permanen"
        itemName="Pipeline ini"
        isProcessing={isProcessing}
        description="Seluruh data proyek yang berada dalam pipeline ini akan terpengaruh atau terhapus. Lanjutkan?"
      />
    </div>
  );
};
