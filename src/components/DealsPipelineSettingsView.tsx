
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Pipeline, Company } from '@/lib/types';
import { 
  Plus, Edit2, Trash2, GripVertical, Save, X, 
  Loader2, GitMerge, AlertTriangle,
  ArrowUp, ArrowDown
} from 'lucide-react';
import { Modal } from '@/components/Modal';

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
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<{ id: number | null, name: string, stages: StageForm[] }>({
    id: null,
    name: '',
    stages: [
      { name: 'Lead' }, { name: 'Contacted' }, { name: 'Proposal' }, { name: 'Negotiation' }, { name: 'Won' }
    ]
  });
  const [newStageInput, setNewStageInput] = useState('');

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, id: number | null }>({
    isOpen: false,
    id: null
  });

  const fetchPipelines = async () => {
    setLoading(true);
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
        { name: 'Lead' }, { name: 'Contacted' }, { name: 'Proposal' }, { name: 'Negotiation' }, { name: 'Won' }
      ]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Pipeline) => {
    setModalForm({
      id: p.id,
      name: p.name,
      stages: (p.stages || []).map(s => ({ id: s.id, name: s.name }))
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
          name: modalForm.name
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
          name: modalForm.name
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
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Pipeline Penjualan...</p></div>;

  return (
    <div className="max-w-5xl space-y-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tighter">Deals Pipeline Management</h3>
            <p className="text-sm text-gray-400 font-medium mt-1">Kelola tahapan penjualan (sales funnel) di workspace Anda.</p>
          </div>
          <button 
            onClick={handleOpenAdd}
            className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={16} /> Tambah Pipeline
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Pipeline</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tahapan</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pipelines.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/30 group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <GitMerge size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 tracking-tight">{p.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{(p.stages || []).length} Stages</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-wrap gap-2">
                      {p.stages?.map(s => (
                        <span key={s.id} className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-bold text-gray-500 shadow-sm uppercase tracking-tighter">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenEdit(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={18} /></button>
                      <button onClick={() => setConfirmModal({ isOpen: true, id: p.id })} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pipelines.length === 0 && (
            <div className="py-20 text-center text-gray-300">
               <GitMerge size={48} className="mx-auto mb-4 opacity-20" />
               <p className="text-xs font-bold uppercase tracking-widest">Belum ada pipeline penjualan yang dikonfigurasi</p>
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={modalForm.id ? "Edit Deals Pipeline" : "Buat Pipeline Baru"}
        size="lg"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 font-bold text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-100 rounded-xl transition-all">Batal</button>
            <button 
              onClick={handleSave} 
              disabled={isProcessing} 
              className="px-10 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Simpan Perubahan
            </button>
          </div>
        }
      >
        <div className="space-y-10 py-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <GitMerge size={12} />
              </div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Pipeline</label>
            </div>
            <input 
              type="text" 
              value={modalForm.name}
              onChange={e => setModalForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Misal: Sales Pipeline Standard..."
              className="w-full px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none font-bold text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
            />
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <GripVertical size={12} />
                </div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tahapan Penjualan</label>
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
              <input 
                type="text" 
                value={newStageInput}
                onChange={e => setNewStageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addStageToForm()}
                placeholder="Nama stage..."
                className="flex-1 px-4 py-3 bg-gray-50 border border-transparent rounded-xl outline-none text-xs font-bold focus:bg-white focus:border-blue-200 transition-all"
              />
              <button onClick={addStageToForm} className="px-4 py-3 bg-gray-900 text-white rounded-xl font-bold text-[10px] uppercase">Tambah</button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, id: null })} title="Hapus Pipeline Permanen" size="sm">
        <div className="text-center py-8 space-y-6">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[28px] flex items-center justify-center mx-auto shadow-xl">
            <AlertTriangle size={36} />
          </div>
          <p className="text-xs text-gray-400 font-medium leading-relaxed">Seluruh deal yang berada dalam pipeline ini akan terpengaruh. Lanjutkan?</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmModal({ isOpen: false, id: null })} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl font-bold text-[10px] uppercase">Batal</button>
            <button onClick={handleDelete} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold text-[10px] uppercase shadow-xl hover:bg-rose-600">Ya, Hapus</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
