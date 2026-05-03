import React, { useState, useEffect } from 'react';
import { Input, Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, H2, Subtext, Label, Modal, Toast, ToastType, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Pipeline, Company } from '@/lib/types';
import {
  Plus, Edit2, Trash2, GripVertical, Save, X,
  Loader2, GitMerge, AlertTriangle,
  ArrowUp, ArrowDown, Zap
} from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ActionButton } from '@/components/shared/buttons/ActionButton';

interface Props {
  company: Company;
}

interface StageForm {
  id?: string;
  name: string;
}

export const DealsPipelineSettingsView: React.FC<Props> = ({ company }) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<{ id: number | null, name: string, stages: StageForm[], has_urgency: boolean }>({
    id: null,
    name: '',
    stages: [
      { name: 'Lead' }, { name: 'Contacted' }, { name: 'Proposal' }, { name: 'Negotiation' }, { name: 'Won' }
    ],
    has_urgency: false
  });
  const [newStageInput, setNewStageInput] = useState('');

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, id: number | null }>({
    isOpen: false,
    id: null
  });

  const fetchPipelines = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const { data: pipelinesData } = await supabase
        .from('pipelines')
        .select('*, stages:pipeline_stages(*)')
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
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines(true);
  }, [company.id]);

  const handleOpenAdd = () => {
    setModalForm({
      id: null,
      name: '',
      stages: [
        { name: 'Lead' }, { name: 'Contacted' }, { name: 'Proposal' }, { name: 'Negotiation' }, { name: 'Won' }
      ],
      has_urgency: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Pipeline) => {
    setModalForm({
      id: p.id,
      name: p.name,
      stages: (p.stages || []).map(s => ({ id: s.id, name: s.name })),
      has_urgency: p.has_urgency || false
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
        await supabase.from('pipelines').update({
          name: modalForm.name,
          has_urgency: modalForm.has_urgency
        }).eq('id', pipelineId);

        const currentStages = pipelines.find(p => p.id === pipelineId)?.stages || [];
        const stageIdsToKeep = modalForm.stages.filter(s => s.id).map(s => s.id);
        const stageIdsToRemove = currentStages.filter(s => !stageIdsToKeep.includes(s.id)).map(s => s.id);

        if (stageIdsToRemove.length > 0) {
          await supabase.from('pipeline_stages').delete().in('id', stageIdsToRemove);
        }

        const stageUpserts = modalForm.stages.map((s, idx) => ({
          ...(s.id ? { id: s.id } : {}),
          pipeline_id: pipelineId,
          name: s.name,
          sort_order: idx + 1
        }));
        await supabase.from('pipeline_stages').upsert(stageUpserts);

      } else {
        const { data: newP } = await supabase.from('pipelines').insert({
          company_id: company.id,
          name: modalForm.name,
          has_urgency: modalForm.has_urgency
        }).select().single();
        pipelineId = newP.id;

        if (pipelineId) {
          const stageInserts = modalForm.stages.map((s, idx) => ({
            pipeline_id: pipelineId,
            name: s.name,
            sort_order: idx + 1
          }));
          await supabase.from('pipeline_stages').insert(stageInserts);
        }
      }

      setIsModalOpen(false);
      await fetchPipelines();
      showToast('Pipeline berhasil disimpan');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmModal.id) return;
    setIsProcessing(true);
    try {
      await supabase.from('pipelines').delete().eq('id', confirmModal.id);
      setConfirmModal({ isOpen: false, id: null });
      await fetchPipelines();
      showToast('Pipeline berhasil dihapus');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><Subtext className="text-[10px] uppercase font-bold text-gray-400">Memuat Pipeline Penjualan...</Subtext></div>;

  return (
    <div className="flex flex-col space-y-6 max-w-5xl">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border-2 border-gray-300 shadow-none shrink-0">
        <div>
          <H2 className="text-xl ">Deals Pipeline Management</H2>
          <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Kelola tahapan penjualan (sales funnel) di workspace Anda.</Subtext>
        </div>
        <Button
          onClick={handleOpenAdd}
          leftIcon={<Plus size={14} strokeWidth={3} />}
          className="!px-6 py-2.5 text-[10px] uppercase shadow-none"
          variant='primary'
          size='sm'
        >
          Tambah Pipeline
        </Button>
      </div>

      <div className="bg-white rounded-2xl border-2 border-gray-300 overflow-hidden shadow-none flex flex-col relative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="py-4 px-6 font-bold text-gray-900 uppercase text-[10px]">Nama Pipeline</TableCell>
              <TableCell isHeader className="py-4 px-6 font-bold text-gray-900 uppercase text-[10px]">Tahapan</TableCell>
              <TableCell isHeader className="text-center py-4 px-6 font-bold text-gray-900 uppercase text-[10px]">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pipelines.map(p => (
              <TableRow key={p.id}>
                <TableCell className="py-4 px-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-none">
                      <GitMerge size={20} />
                    </div>
                    <div>
                      <Label className="text-[13px] font-semibold text-gray-900">{p.name}</Label>
                      <Subtext className="text-[10px] text-gray-400 uppercase font-bold mt-1">{(p.stages || []).length} Stages</Subtext>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-6">
                  <div className="flex flex-wrap gap-2">
                    {p.stages?.map(s => (
                      <Badge key={s.id} variant="neutral" className="px-3 py-1 bg-white border border-gray-100 text-[10px] text-gray-500 font-bold uppercase shadow-none">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-center py-4 px-6">
                  <div className="flex items-center justify-center gap-2">
                    <ActionButton
                      icon={Edit2}
                      variant="blue"
                      onClick={() => handleOpenEdit(p)}
                    />
                    <ActionButton
                      icon={Trash2}
                      variant="rose"
                      onClick={() => setConfirmModal({ isOpen: true, id: p.id })}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {pipelines.length === 0 && (
              <TableEmpty colSpan={3} message="Belum ada pipeline penjualan yang dikonfigurasi" icon={<GitMerge size={48} />} />
            )}
          </TableBody>
        </Table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalForm.id ? "Edit Deals Pipeline" : "Buat Pipeline Baru"}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isProcessing} className="rounded-md">
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isProcessing}
              disabled={isProcessing}
              className="rounded-md"
            >
              <Save size={14} className="mr-2" /> Simpan Perubahan
            </Button>
          </div>
        }
      >
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <GitMerge size={12} />
              </div>
              <Label className="text-[10px] text-gray-400 uppercase font-bold">Nama Pipeline</Label>
            </div>
            <Input
              value={modalForm.name}
              onChange={e => setModalForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Misal: Sales Pipeline Standard..."
              className="!py-3 text-sm"
            />
          </div>

          <div className="space-y-3 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <GripVertical size={12} />
                </div>
                <Label className="text-[10px] text-gray-400 uppercase font-bold">Tahapan Penjualan</Label>
              </div>
            </div>

            <div className="space-y-2">
              {modalForm.stages.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-none hover:border-blue-100 transition-all group w-full">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-6 h-6 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-[9px] font-bold text-gray-400 shrink-0 shadow-none">
                      {idx + 1}
                    </div>
                    <Input
                      type="text"
                      value={s.name}
                      onChange={(e) => handleUpdateStageName(idx, e.target.value)}
                      className="bg-transparent border-none outline-none text-[13px] font-semibold text-gray-700 w-full"
                      containerClassName="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <ActionButton icon={ArrowUp} onClick={() => handleMoveStage(idx, 'up')} disabled={idx === 0} variant="gray" />
                    <ActionButton icon={ArrowDown} onClick={() => handleMoveStage(idx, 'down')} disabled={idx === modalForm.stages.length - 1} variant="gray" />
                    <ActionButton icon={Trash2} onClick={() => removeStageFromForm(idx)} variant="rose" />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 w-full">
              <Input
                type="text"
                value={newStageInput}
                onChange={e => setNewStageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addStageToForm()}
                placeholder="Nama stage..."
                className="!py-2 text-sm"
                containerClassName="flex-1"
              />
              <Button onClick={addStageToForm} variant="primary" className="!py-2 rounded-lg text-xs font-semibold px-4">Tambah</Button>
            </div>
          </div>
        </div>
      </Modal>
      <ConfirmDeleteModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        itemName="Pipeline"
        isProcessing={isProcessing}
      />

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
