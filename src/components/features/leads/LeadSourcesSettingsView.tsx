import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, LeadSource } from '@/lib/types';
import { 
  Plus, Search, Edit2, Trash2, Loader2, Globe, 
  Save, AlertTriangle, List, CheckCircle2, X
} from 'lucide-react';
import { 
  Button, Input, Table, TableHeader, TableBody, TableRow, 
  TableCell, TableEmpty, Badge, Modal, H2, Subtext 
} from '@/components/ui';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { NotificationModal } from '@/components/shared/modals/NotificationModal';

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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 className="animate-spin text-blue-600 mb-4" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Memuat Sumber Leads...</p>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex items-center justify-between">
          <div>
            <H2 className="text-2xl font-bold tracking-tighter">Manajemen Sumber Leads</H2>
            <Subtext className="mt-1">Daftar channel atau asal datangnya calon pelanggan.</Subtext>
          </div>
          <Button 
            onClick={() => { setForm({ id: '', name: '' }); setIsModalOpen(true); }}
            leftIcon={<Plus size={16} />}
          >
            Tambah Sumber
          </Button>
        </div>

        <div className="p-6 border-b border-gray-50">
           <Input 
             placeholder="Cari sumber..." 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             leftIcon={<Search size={14} />}
             className="!py-2.5 max-w-xs"
           />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>Nama Sumber</TableCell>
              <TableCell isHeader className="text-center">Status Penggunaan</TableCell>
              <TableCell isHeader className="text-center">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSources.map(item => {
              const isInUse = usedSources.includes(item.name);
              return (
                <TableRow key={item.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <Globe size={16} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 tracking-tight">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={isInUse ? 'success' : 'neutral'}>
                      {isInUse ? 'Aktif Digunakan' : 'Kosong'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => { setForm({ id: item.id, name: item.name }); setIsModalOpen(true); }} className="!p-2 text-blue-500">
                        <Edit2 size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteClick(item)} 
                        disabled={isInUse}
                        className={`!p-2 ${isInUse ? 'text-gray-200' : 'text-rose-500 hover:text-rose-600'}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          {filteredSources.length === 0 && (
            <TableEmpty colSpan={3} icon={<Globe size={48} />} message="Data sumber tidak ditemukan" />
          )}
        </Table>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={form.id ? "Edit Sumber Lead" : "Tambah Sumber Baru"}
        size="md"
        footer={
          <Button 
            onClick={handleSave} 
            isLoading={isProcessing}
            className="w-full justify-center"
          >
            Simpan Sumber
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
           <Input 
             label="Nama Sumber Lead"
             value={form.name} 
             onChange={e => setForm({...form, name: e.target.value})} 
             placeholder="Misal: Instagram, Event Offline..." 
           />
        </div>
      </Modal>

      <ConfirmDeleteModal 
        isOpen={confirmDelete.isOpen} 
        onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })} 
        onConfirm={executeDelete}
        title="Hapus Sumber"
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
