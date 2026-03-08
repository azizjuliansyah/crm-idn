import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, H2, Subtext, Label, Modal, Badge, Toast, ToastType } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { LeadStage, Company } from '@/lib/types';
import {
  Plus, Edit2, Trash2, Loader2, ArrowUp, ArrowDown, Save,
  CheckCircle2, AlertTriangle, Target, X, Kanban, Zap
} from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { ActionButton } from '@/components/shared/buttons/ActionButton';

interface Props {
  company: Company;
}

export const LeadStagesSettingsView: React.FC<Props> = ({ company }) => {
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [usedStatuses, setUsedStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ id: '', name: '' });

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null; name: string }>({ isOpen: false, id: null, name: '' });
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const fetchData = useCallback(async (isInitial = false) => {
    if (!company) return;
    if (isInitial) setLoading(true);
    try {
      const { data: stagesData } = await supabase
        .from('lead_stages')
        .select('*')
        .eq('company_id', company.id)
        .order('sort_order', { ascending: true });

      const { data: leadsData } = await supabase
        .from('leads')
        .select('status')
        .eq('company_id', company.id);

      if (stagesData) setStages(stagesData);
      if (leadsData) {
        const distinct = Array.from(new Set(leadsData.map((l: any) => (l.status || '').toLowerCase()))) as string[];
        setUsedStatuses(distinct);
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.name || !company) return;
    setIsProcessing(true);
    try {
      if (form.id) {
        await supabase.from('lead_stages').update({ name: form.name }).eq('id', form.id);
      } else {
        const nextSort = stages.length > 0 ? Math.max(...stages.map(s => s.sort_order)) + 1 : 1;
        await supabase.from('lead_stages').insert({
          company_id: company.id,
          name: form.name,
          sort_order: nextSort,
          is_system: false
        });
      }
      setIsModalOpen(false);
      fetchData();
      setToast({ isOpen: true, message: 'Tahapan pipeline telah disimpan.', type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
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
      sort_order: i + 1,
      is_system: s.is_system
    }));
    const { error } = await supabase.from('lead_stages').upsert(updates);
    if (error) {
      setToast({ isOpen: true, message: 'Gagal merubah urutan: ' + error.message, type: 'error' });
      fetchData();
    } else {
      setToast({ isOpen: true, message: 'Urutan tahapan berhasil diperbarui.', type: 'success' });
    }
  };

  const handleDeleteClick = (stage: LeadStage) => {
    if (usedStatuses.includes(stage.name.toLowerCase())) {
      setToast({ isOpen: true, message: 'Tahapan ini sedang digunakan dan tidak dapat dihapus.', type: 'error' });
      return;
    }
    setConfirmDelete({ isOpen: true, id: stage.id, name: stage.name });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      await supabase.from('lead_stages').delete().eq('id', confirmDelete.id);
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      fetchData();
      setToast({ isOpen: true, message: 'Tahapan berhasil dihapus.', type: 'success' });
    } catch (err: any) {
      setToast({ isOpen: true, message: 'Gagal menghapus: ' + err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="animate-spin text-blue-600 mb-4" />
      <Subtext className="text-[10px] uppercase font-bold text-gray-400">Memuat Lead Pipeline...</Subtext>
    </div>
  );

  return (
    <div className="flex flex-col space-y-6 max-w-4xl">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
            <Target size={20} />
          </div>
          <div>
            <H2 className="text-xl ">Manajemen Lead Pipeline</H2>
            <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Atur alur kualifikasi prospek baru ke dalam sistem.</Subtext>
          </div>
        </div>
        <div className="flex items-center gap-3">

          <Button
            onClick={() => { setForm({ id: '', name: '' }); setIsModalOpen(true); }}
            leftIcon={<Plus size={14} strokeWidth={3} />}
            variant='primary'
            size='sm'
          >
            Tambah Stage
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm p-6 space-y-3">
        {stages.map((stage, idx) => {
          const isUsed = usedStatuses.includes(stage.name.toLowerCase());
          return (
            <div key={stage.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-blue-200 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-400 shadow-sm">
                  {idx + 1}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[13px] font-semibold text-gray-700">{stage.name}</Label>
                  {stage.is_system && <Badge variant="neutral" className="!px-2 !py-0.5 !text-[8px] uppercase font-bold bg-gray-200 text-gray-500">Sistem</Badge>}
                  {isUsed && <Badge variant="primary" className="!px-2 !py-0.5 !text-[8px] uppercase font-bold">Aktif</Badge>}
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
                    onClick={() => { setForm({ id: stage.id, name: stage.name }); setIsModalOpen(true); }}
                  />
                  {!stage.is_system && (
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
        title={form.id ? "Edit Tahapan Leads" : "Tambah Tahapan Leads"}
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
              Simpan Tahapan
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <Input
            label="Nama Tahapan"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Misal: Hot Prospect..."
            className="!py-3"
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
