import React, { useState, useEffect, useCallback } from 'react';
import { Input, Button, H2, Subtext, Label, Modal, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { LeadStage, Company } from '@/lib/types';
import {
  Plus, Edit2, Trash2, Loader2, ArrowUp, ArrowDown, Save,
  CheckCircle2, AlertTriangle, Target, X
} from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { NotificationModal } from '@/components/shared/modals/NotificationModal';

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
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' }>({
    isOpen: false, title: '', message: '', type: 'success'
  });

  const fetchData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
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
      setLoading(false);
    }
  }, [company.id, supabase]);

  useEffect(() => {
    fetchData();
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
      setNotification({ isOpen: true, title: 'Berhasil', message: 'Tahapan pipeline telah disimpan.', type: 'success' });
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal', message: err.message, type: 'error' });
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
    await supabase.from('lead_stages').upsert(updates);
  };

  const handleDeleteClick = (stage: LeadStage) => {
    if (usedStatuses.includes(stage.name.toLowerCase())) {
      setNotification({ isOpen: true, title: 'Akses Ditolak', message: 'Tahapan ini sedang digunakan oleh data prospek dan tidak dapat dihapus.', type: 'warning' });
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
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="animate-spin text-blue-600 mb-4" />
      <Subtext className="text-[10px]  uppercase tracking-tight text-gray-400">Memuat Lead Pipeline...</Subtext>
    </div>
  );

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <div>
            <H2 className="text-xl  tracking-tight">Manajemen Lead Pipeline</H2>
            <Subtext className="text-xs mt-1">Atur alur kualifikasi prospek baru ke dalam sistem.</Subtext>
          </div>
          <Button
            onClick={() => { setForm({ id: '', name: '' }); setIsModalOpen(true); }}
            leftIcon={<Plus size={14} />}
            size="md"
            variant='primary'
          >
            Tambah Stage
          </Button>
        </div>
        <div className="p-6 space-y-3">
          {stages.map((stage, idx) => {
            const isUsed = usedStatuses.includes(stage.name.toLowerCase());
            return (
              <div key={stage.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-blue-200 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-[10px]  text-gray-400">{idx + 1}</div>
                  <Label className="text-sm  text-gray-700 tracking-tight">{stage.name}</Label>
                  {stage.is_system && <Badge variant="neutral" className="!px-2 !py-0.5 !text-[8px]">Sistem</Badge>}
                  {isUsed && <Badge variant="primary" className="!px-2 !py-0.5 !text-[8px]">Aktif</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1 mr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => { setForm({ id: stage.id, name: stage.name }); setIsModalOpen(true); }} className="!p-2 bg-white border border-gray-200 text-blue-500">
                      <Edit2 size={14} />
                    </Button>
                    {!stage.is_system && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(stage)}
                        disabled={isUsed}
                        className={`!p-2 bg-white border border-gray-200 ${isUsed ? 'text-gray-200 opacity-50' : 'text-red-400'}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleMove(stage.id, 'up')} disabled={idx === 0} className="!p-2 bg-white border border-gray-200 text-gray-400">
                    <ArrowUp size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleMove(stage.id, 'down')} disabled={idx === stages.length - 1} className="!p-2 bg-white border border-gray-200 text-gray-400">
                    <ArrowDown size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.id ? "Edit Tahapan Leads" : "Tambah Tahapan Leads"}
        footer={
          <Button
            onClick={handleSave}
            isLoading={isProcessing}
            className="w-full justify-center"
          >
            Simpan Tahapan
          </Button>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nama Tahapan"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Misal: Hot Prospect..."
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
