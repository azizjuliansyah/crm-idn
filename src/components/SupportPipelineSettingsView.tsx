
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SupportStage, Company } from '@/lib/types';
import { 
  Plus, Edit2, Trash2, Loader2, ArrowUp, ArrowDown, Save, 
  CheckCircle2, AlertTriangle, Target, X
} from 'lucide-react';
import { Modal } from '@/components/Modal';

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
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' }>({ 
    isOpen: false, title: '', message: '', type: 'success' 
  });

  const fetchData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
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
        await supabase.from('support_stages').update({ name: form.name }).eq('id', parseInt(form.id));
      } else {
        const nextSort = stages.length > 0 ? Math.max(...stages.map(s => s.sort_order)) + 1 : 1;
        await supabase.from('support_stages').insert({ 
            company_id: company.id, 
            name: form.name, 
            sort_order: nextSort,
            // Assuming support_stages implies system/custom via logic or column if exists. 
            // LeadStages had is_system. Let's assume support_stages might not or we default to false if column missing.
            // Based on SupportTicketsView, we didn't see is_system usage explicitly but let's check.
            // We will safely omit is_system if uncertain, OR check types.
            // For now, let's assume simple insert.
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

  const handleMove = async (id: number, direction: 'up' | 'down') => {
    const idx = stages.findIndex(s => s.id === id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === stages.length - 1)) return;
    
    const newStages = [...stages];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newStages[idx], newStages[targetIdx]] = [newStages[targetIdx], newStages[idx]];

    setStages(newStages);
    
    // Updates
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
        setNotification({ isOpen: true, title: 'Akses Ditolak', message: 'Tahapan ini sedang digunakan oleh ticket dan tidak dapat dihapus.', type: 'warning' });
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

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Support Pipeline...</p></div>;

  return (
    <div className="space-y-8 max-w-2xl animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Manajemen Support Pipeline</h3>
            <p className="text-xs text-gray-400 font-medium">Atur status pengerjaan ticket support.</p>
          </div>
          <button 
            onClick={() => { setForm({ id: '', name: '' }); setIsModalOpen(true); }} 
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            <Plus size={14} /> Tambah Stage
          </button>
        </div>
        <div className="p-6 space-y-3">
          {stages.map((stage, idx) => {
            const isUsed = usedStatuses.includes(stage.name.toLowerCase());
            return (
              <div key={stage.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-blue-200 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-400">{idx + 1}</div>
                  <span className="text-sm font-bold text-gray-700 tracking-tight">{stage.name}</span>
                  {isUsed && <span className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[8px] font-bold uppercase rounded border border-blue-100">Aktif</span>}
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1 mr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setForm({ id: stage.id.toString(), name: stage.name }); setIsModalOpen(true); }} className="p-2 bg-white border border-gray-200 rounded-lg text-blue-500 hover:bg-blue-50"><Edit2 size={14} /></button>
                    {!['new', 'closed'].includes(stage.name.toLowerCase()) && ( // Basic protection for likely system stages if no column exists
                      <button onClick={() => handleDeleteClick(stage)} className={`p-2 bg-white border border-gray-200 rounded-lg transition-colors ${isUsed ? 'text-gray-200 opacity-50' : 'text-red-400 hover:bg-red-50'}`}><Trash2 size={14} /></button>
                    )}
                  </div>
                  <button onClick={() => handleMove(stage.id, 'up')} disabled={idx === 0} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button onClick={() => handleMove(stage.id, 'down')} disabled={idx === stages.length - 1} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 disabled:opacity-30"><ArrowDown size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={form.id ? "Edit Tahapan Support" : "Tambah Tahapan Support"} 
        footer={
          <button 
            onClick={handleSave} 
            disabled={isProcessing} 
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"
          >
            {isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Tahapan
          </button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Tahapan</label>
            <input 
              type="text" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold focus:bg-white focus:border-blue-500 transition-all" 
              placeholder="Misal: In Progress..." 
            />
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <Modal 
        isOpen={confirmDelete.isOpen} 
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} 
        title="Hapus Tahapan"
        size="sm"
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
             <AlertTriangle size={32} />
          </div>
          <p className="text-lg font-bold text-gray-900 tracking-tight">Hapus tahapan {confirmDelete.name}?</p>
          <div className="flex w-full gap-3 mt-8">
             <button onClick={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold text-[10px] uppercase rounded-xl">Batal</button>
             <button onClick={executeDelete} disabled={isProcessing} className="flex-1 py-4 bg-rose-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2">{isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Ya, Hapus</button>
          </div>
        </div>
      </Modal>

      {/* NOTIFICATION MODAL */}
      <Modal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} title="" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
           <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${
               notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 
               notification.type === 'warning' ? 'bg-amber-50 text-amber-600' : 
               'bg-rose-50 text-rose-600'
           }`}>
               {notification.type === 'success' ? <CheckCircle2 size={32} /> : notification.type === 'warning' ? <AlertTriangle size={32} /> : <X size={32} />}
           </div>
           <h3 className="text-lg font-bold text-gray-900 mb-2">{notification.title}</h3>
           <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">{notification.message}</p>
           <button onClick={() => setNotification({ ...notification, isOpen: false })} className="w-full py-4 bg-gray-900 text-white font-bold text-[10px] uppercase rounded-lg hover:bg-black transition-all">Tutup</button>
        </div>
      </Modal>
    </div>
  );
};
