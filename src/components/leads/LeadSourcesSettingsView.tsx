
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Company, LeadSource } from '../../lib/types';
import { 
  Plus, Search, Edit2, Trash2, Loader2, Globe, 
  Save, AlertTriangle, List, CheckCircle2, X
} from 'lucide-react';
import { Modal } from '../Modal';

interface Props {
  company: Company;
}

export const LeadSourcesSettingsView: React.FC<Props> = ({ company }) => {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [usedSources, setUsedSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<{ id: string, name: string }>({
    id: '',
    name: ''
  });

  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null; name: string }>({ isOpen: false, id: null, name: '' });
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' }>({ 
    isOpen: false, title: '', message: '', type: 'success' 
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sourcesRes } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      
      const { data: leadsRes } = await supabase
        .from('leads')
        .select('source')
        .eq('company_id', company.id);

      if (sourcesRes) setSources(sourcesRes);
      if (leadsRes) {
        const distinct = Array.from(new Set(leadsRes.map((l: any) => l.source))) as string[];
        setUsedSources(distinct);
      }
    } finally {
      setLoading(false);
    }
  }, [company.id, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredSources = sources.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setIsProcessing(true);
    try {
      if (form.id) {
        await supabase.from('lead_sources').update({ name: form.name.trim() }).eq('id', form.id);
      } else {
        await supabase.from('lead_sources').insert({ name: form.name.trim(), company_id: company.id });
      }
      setIsModalOpen(false);
      fetchData();
      setNotification({ isOpen: true, title: 'Berhasil', message: 'Sumber leads telah diperbarui.', type: 'success' });
    } catch (err: any) {
      setNotification({ isOpen: true, title: 'Gagal', message: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteClick = (source: LeadSource) => {
    const isInUse = usedSources.includes(source.name);
    if (isInUse) {
        setNotification({ isOpen: true, title: 'Akses Ditolak', message: 'Sumber ini sedang aktif digunakan oleh data leads dan tidak dapat dihapus.', type: 'warning' });
        return;
    }
    setConfirmDelete({ isOpen: true, id: source.id, name: source.name });
  };

  const executeDelete = async () => {
    if (!confirmDelete.id) return;
    setIsProcessing(true);
    try {
      await supabase.from('lead_sources').delete().eq('id', confirmDelete.id);
      setConfirmDelete({ isOpen: false, id: null, name: '' });
      fetchData();
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Sumber Leads...</p></div>;

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tighter">Manajemen Sumber Leads</h3>
            <p className="text-sm text-gray-400 font-medium mt-1">Daftar channel atau asal datangnya calon pelanggan.</p>
          </div>
          <button 
            onClick={() => { setForm({ id: '', name: '' }); setIsModalOpen(true); }}
            className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={16} /> Tambah Sumber
          </button>
        </div>

        <div className="p-6 border-b border-gray-50">
           <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
              <input 
                type="text" 
                placeholder="Cari sumber..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-blue-100 transition-all"
              />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Sumber</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status Penggunaan</th>
                <th className="px-10 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredSources.map(item => {
                const isInUse = usedSources.includes(item.name);
                return (
                  <tr key={item.id} className="hover:bg-gray-50/30 group transition-colors">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                          <Globe size={16} />
                        </div>
                        <span className="text-sm font-bold text-gray-900 tracking-tight">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                      {isInUse ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase rounded-full border border-emerald-100">Aktif Digunakan</span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-50 text-gray-400 text-[9px] font-bold uppercase rounded-full border border-gray-100">Kosong</span>
                      )}
                    </td>
                    <td className="px-10 py-6 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setForm({ id: item.id, name: item.name }); setIsModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                        <button 
                          onClick={() => handleDeleteClick(item)} 
                          className={`p-2 rounded-lg transition-all ${isInUse ? 'text-gray-200 cursor-not-allowed' : 'text-rose-500 hover:bg-rose-50'}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredSources.length === 0 && (
            <div className="py-20 text-center text-gray-300">
               <Globe size={48} className="mx-auto mb-4 opacity-10" />
               <p className="text-xs font-bold uppercase tracking-widest">Data sumber tidak ditemukan</p>
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={form.id ? "Edit Sumber Lead" : "Tambah Sumber Baru"}
        size="md"
        footer={<button onClick={handleSave} disabled={isProcessing} className="px-10 py-4 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">{isProcessing && <Loader2 className="animate-spin" size={14} />} Simpan Sumber</button>}
      >
        <div className="space-y-4 pb-2">
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Sumber Lead</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" 
                placeholder="Misal: Instagram, Event Offline..." 
              />
           </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <Modal 
        isOpen={confirmDelete.isOpen} 
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} 
        title="Hapus Sumber"
        size="sm"
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
             <AlertTriangle size={32} />
          </div>
          <p className="text-lg font-bold text-gray-900 tracking-tight">Hapus sumber {confirmDelete.name}?</p>
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
