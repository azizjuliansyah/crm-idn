import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, H2, Subtext, Label, Modal, Badge, Toast, ToastType } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { SupportStage, Company } from '@/lib/types';
import {
  Plus, Edit2, Trash2, Loader2, ArrowUp, ArrowDown, Save,
  CheckCircle2, AlertTriangle, Target, X
} from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ActionButton } from '@/components/shared/buttons/ActionButton';

interface Props {
  company: Company;
}

export const SupportPipelineSettingsView: React.FC<Props> = ({ company }) => {
  const [stages, setStages] = useState<SupportStage[]>([]);
  const [usedStatuses, setUsedStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ id: '', name: '' });

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null; name: string }>({ isOpen: false, id: null, name: '' });
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (!company) return;
    if (isInitial) setLoading(true);
    try {
      const { data: stagesData } = await supabase
        .from('support_stages')
        .select('*')
        .eq('company_id', company.id)
        .order('sort_order', { ascending: true });

      const { data: ticketsData } = await supabase
        .from('support_tickets')
        .select('status')
        .eq('company_id', company.id);

      if (stagesData) setStages(stagesData);
      if (ticketsData) {
        const distinct = Array.from(new Set(ticketsData.map((t: any) => (t.status || '').toLowerCase()))) as string[];
        setUsedStatuses(distinct);
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !company) return;
    setIsProcessing(true);
    try {
      if (form.id) {
        const { error } = await supabase.from('support_stages').update({ name: form.name }).eq('id', parseInt(form.id));
        if (error) throw error;
      } else {
        const nextSort = stages.length > 0 ? Math.max(...stages.map(s => s.sort_order)) + 1 : 1;
        const { error } = await supabase.from('support_stages').insert({
          company_id: company.id,
          name: form.name,
          sort_order: nextSort,
        });
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchData();
      showToast('Tahapan pipeline telah disimpan.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMove = async (id: number, direction: 'up' | 'down') => {
    const idx = stages.findIndex(s => s.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === stages.length - 1)) return;

    const newStages = [...stages];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newStages[idx], newStages[targetIdx]] = [newStages[targetIdx], newStages[idx]];

    setStages(newStages);
    const updates = newStages.map((s, i) => ({
      id: s.id,
      company_id: company.id,
      name: s.name,
      sort_order: i + 1
    }));
    await supabase.from('support_stages').upsert(updates);
  };

  const handleDeleteClick = (stage: SupportStage) => {
    if (usedStatuses.includes(stage.name.toLowerCase())) {
      showToast('Tahapan ini sedang digunakan oleh ticket and tidak dapat dihapus.', 'info');
      return;
    }
    setConfirmDelete({ isOpen: true, id: stage.id, name: stage.name });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      await supabase.from('support_stages').delete().eq('id', confirmDelete.id);
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      fetchData();
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 min-h-[400px]">
      <Loader2 className="animate-spin text-rose-600 mb-4" size={32} />
      <Subtext className="text-[10px] uppercase font-bold text-gray-400">Memuat Support Pipeline...</Subtext>
    </div>
  );

  return (
    <div className="flex flex-col space-y-6 max-w-4xl">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div>
          <H2 className="text-xl ">Manajemen Support Pipeline</H2>
          <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Atur status pengerjaan ticket support.</Subtext>
        </div>
        <Button
          onClick={() => { setForm({ id: '', name: '' }); setIsModalOpen(true); }}
          leftIcon={<Plus size={14} strokeWidth={3} />}
          variant="primary"
          size="sm"
        >
          Tambah Stage
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm p-6 space-y-3">
        {stages.map((stage, idx) => {
          const isUsed = usedStatuses.includes(stage.name.toLowerCase());
          return (
            <div key={stage.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-rose-200 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-400 shadow-sm">
                  {idx + 1}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[13px] font-semibold text-gray-700">{stage.name}</Label>
                  {isUsed && <Badge variant="primary" className="text-[8px] py-0.5 uppercase font-bold px-2">Aktif</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <ActionButton
                    icon={ArrowUp}
                    variant="gray"
                    onClick={() => handleMove(stage.id, 'up')}
                    disabled={idx === 0}
                  />
                  <ActionButton
                    icon={ArrowDown}
                    variant="gray"
                    onClick={() => handleMove(stage.id, 'down')}
                    disabled={idx === stages.length - 1}
                  />
                </div>
                <div className="flex items-center gap-1 pl-3 ml-2 border-l border-gray-200">
                  <ActionButton
                    icon={Edit2}
                    variant="blue"
                    onClick={() => { setForm({ id: stage.id.toString(), name: stage.name }); setIsModalOpen(true); }}
                  />
                  {!['new', 'closed'].includes(stage.name.toLowerCase()) && (
                    <ActionButton
                      icon={Trash2}
                      variant="rose"
                      onClick={() => handleDeleteClick(stage)}
                      disabled={isUsed}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.id ? "Edit Tahapan Support" : "Tambah Tahapan Support"}
        footer={
          <div className="flex w-full gap-3">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 text-[10px] uppercase font-bold">Batal</Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing}
              isLoading={isProcessing}
              leftIcon={<Save size={14} />}
              variant="primary"
            >
              Simpan
            </Button>
          </div>
        }
      >
        <div className="py-2 space-y-4">
          <Input
            label="Nama Tahapan"
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Misal: In Progress..."
            className="!py-3"
            required
          />
        </div>
      </Modal>

      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        title="Hapus Tahapan"
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
    </div>
  );
};
