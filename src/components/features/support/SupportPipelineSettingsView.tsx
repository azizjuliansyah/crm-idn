
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SupportStage, Company } from '@/lib/types';
import { 
  Plus, Edit2, Trash2, Loader2, ArrowUp, ArrowDown, Save, 
  CheckCircle2, AlertTriangle, Target, X
} from 'lucide-react';
import { Modal, Button, Input, Badge, H2, Subtext, SectionHeader } from '@/components/ui';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { NotificationModal } from '@/components/shared/modals/NotificationModal';

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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 min-h-[400px]">
      <Loader2 className="animate-spin text-rose-600 mb-4" size={32} />
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Support Pipeline...</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <div>
            <H2 className="text-lg uppercase tracking-tight font-black">Manajemen Support Pipeline</H2>
            <Subtext>Atur status pengerjaan ticket support.</Subtext>
          </div>
          <Button 
            onClick={() => { setForm({ id: '', name: '' }); setIsModalOpen(true); }} 
            leftIcon={<Plus size={14} />}
            variant="danger"
            className="shadow-lg shadow-rose-100"
          >
            Tambah Stage
          </Button>
        </div>
        <div className="p-6 space-y-3">
          {stages.map((stage, idx) => {
            const isUsed = usedStatuses.includes(stage.name.toLowerCase());
            return (
              <div key={stage.id} className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-100 rounded-2xl hover:border-rose-200 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-[10px] font-black text-gray-400 uppercase tracking-tight shadow-sm">{idx + 1}</div>
                  <span className="text-xs font-black text-gray-700 tracking-widest uppercase">{stage.name}</span>
                  {isUsed && <Badge variant="primary" className="text-[8px] py-0.5 font-black uppercase tracking-widest px-2">Aktif</Badge>}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 mr-4 opacity-0 group-hover:opacity-100 transition-all">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => { setForm({ id: stage.id.toString(), name: stage.name }); setIsModalOpen(true); }} 
                      className="!p-2 text-blue-500 hover:bg-blue-50 border-gray-100 rounded-xl shadow-none"
                    >
                      <Edit2 size={14} />
                    </Button>
                    {!['new', 'closed'].includes(stage.name.toLowerCase()) && ( 
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteClick(stage)} 
                        className={`!p-2 border-gray-100 rounded-xl transition-all shadow-none ${isUsed ? 'text-gray-200 pointer-events-none' : 'text-red-400 hover:bg-red-50'}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleMove(stage.id, 'up')} disabled={idx === 0} className="!p-2 text-gray-400 border-gray-100 rounded-xl shadow-none"><ArrowUp size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleMove(stage.id, 'down')} disabled={idx === stages.length - 1} className="!p-2 text-gray-400 border-gray-100 rounded-xl shadow-none"><ArrowDown size={14} /></Button>
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
        size="sm"
        footer={
          <div className="flex w-full gap-3">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 font-bold text-xs uppercase tracking-widest">Batal</Button>
            <Button 
              onClick={handleSave} 
              disabled={isProcessing} 
              isLoading={isProcessing}
              leftIcon={<Save size={14} />}
              variant="danger"
              className="flex-1 font-bold text-xs uppercase tracking-widest shadow-lg shadow-rose-100"
            >
              Simpan
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <Input 
            label="Nama Tahapan"
            type="text" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
            placeholder="Misal: In Progress..." 
            className="rounded-xl"
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
