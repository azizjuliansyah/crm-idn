'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TaskStage, Company } from '@/lib/types';
import { 
  Plus, Edit2, Trash2, Loader2, ArrowUp, ArrowDown, Save 
} from 'lucide-react';
import { Modal } from '@/components/Modal';

interface Props {
  company: Company;
}

export const TaskSettingsView: React.FC<Props> = ({ company }) => {
  const [stages, setStages] = useState<TaskStage[]>([]);
  const [usedStatuses, setUsedStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ id: '', name: '' });

  const fetchData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    try {
      const { data: stagesData } = await supabase.from('task_stages').select('*').eq('company_id', company.id).order('sort_order', { ascending: true });
      const { data: tasksData } = await supabase.from('tasks').select('stage_id').eq('company_id', company.id);
      
      if (stagesData) setStages(stagesData);
      if (tasksData) {
        const distinct = Array.from(new Set(tasksData.map((t: any) => t.stage_id))) as string[];
        setUsedStatuses(distinct);
      }
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !company) return;
    setIsProcessing(true);
    try {
      if (form.id) {
        await supabase.from('task_stages').update({ name: form.name }).eq('id', form.id);
      } else {
        const nextSort = stages.length > 0 ? Math.max(...stages.map(s => s.sort_order)) + 1 : 1;
        await supabase.from('task_stages').insert({ company_id: company.id, name: form.name, sort_order: nextSort });
      }
      setIsModalOpen(false);
      fetchData();
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
    const updates = newStages.map((s, i) => ({ id: s.id, company_id: company.id, name: s.name, sort_order: i + 1 }));
    await supabase.from('task_stages').upsert(updates);
  };

  const handleDelete = async (stage: TaskStage) => {
    if (usedStatuses.includes(stage.id)) {
      alert("Tahapan ini sedang digunakan oleh beberapa task dan tidak dapat dihapus.");
      return;
    }
    if (!confirm("Hapus tahapan task ini?")) return;
    await supabase.from('task_stages').delete().eq('id', stage.id);
    fetchData();
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Task Pipeline...</p></div>;

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Pengaturan Task Pipeline</h3>
            <p className="text-xs text-gray-400 font-medium">Tentukan tahapan untuk alur kerja operasional tim Anda.</p>
          </div>
          <button onClick={() => { setForm({ id: '', name: '' }); setIsModalOpen(true); }} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"><Plus size={14} /> Tahapan Baru</button>
        </div>
        <div className="p-6 space-y-3">
          {stages.map((stage, idx) => {
            const isUsed = usedStatuses.includes(stage.id);
            return (
              <div key={stage.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-blue-200 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-400">{idx + 1}</div>
                  <span className="text-sm font-bold text-gray-700 tracking-tight">{stage.name}</span>
                  {isUsed && <span className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[8px] font-bold uppercase rounded border border-blue-100">Digunakan</span>}
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1 mr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setForm({ id: stage.id, name: stage.name }); setIsModalOpen(true); }} className="p-2 bg-white border border-gray-200 rounded-lg text-blue-500 hover:bg-blue-50"><Edit2 size={14} /></button>
                    <button disabled={isUsed} onClick={() => handleDelete(stage)} className={`p-2 bg-white border border-gray-200 rounded-lg transition-colors ${isUsed ? 'text-gray-200 opacity-50' : 'text-red-400 hover:bg-red-50'}`}><Trash2 size={14} /></button>
                  </div>
                  <button onClick={() => handleMove(stage.id, 'up')} disabled={idx === 0} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button onClick={() => handleMove(stage.id, 'down')} disabled={idx === stages.length - 1} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 disabled:opacity-30"><ArrowDown size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={form.id ? "Edit Tahapan Task" : "Tambah Tahapan Task"} footer={<button onClick={handleSave} disabled={isProcessing} className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2">{isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Tahapan</button>}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Tahapan</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold shadow-sm focus:bg-white focus:border-blue-500 transition-all" placeholder="Misal: Review Client..." />
          </div>
        </div>
      </Modal>
    </div>
  );
};
