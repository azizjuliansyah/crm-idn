
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, CompanyRole } from '@/lib/types';
import { Plus, Edit2, Trash2, Loader2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Modal } from './Modal';

// Simplified permissions list mostly for display/selection
const AVAILABLE_PERMISSIONS = ['Dashboard', 'Leads', 'Deals', 'Projects', 'Perusahaan', 'Anggota Tim', 'Manajemen Role', 'Pengaturan Leads', 'Pengaturan Deals Pipeline', 'Data Client', 'Perusahaan Client', 'Pengaturan Kategori Client', 'Pengaturan Sumber Leads', 'Produk', 'Kategori Produk', 'Satuan', 'Penjualan', 'Penawaran', 'Proforma Invoice', 'Invoice', 'Pengaturan Penjualan', 'Penomoran Otomatis', 'Pengaturan Pajak', 'Template Dokumen', 'Knowledge Base', 'Pengaturan AI', 'Customer Support', 'Support Pipeline', 'Konfigurasi Email', 'Request Invoice', 'SOP', 'AI Assistant'];

interface PermissionListProps {
  available: string[];
  selected: string[];
  onToggle: (perm: string) => void;
}

const PermissionsList: React.FC<PermissionListProps> = ({ available, selected, onToggle }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-100 rounded-xl custom-scrollbar">
    {available.map(perm => (
      <button 
        key={perm}
        onClick={() => onToggle(perm)}
        className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all ${selected.includes(perm) ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
      >
        {perm}
      </button>
    ))}
  </div>
);

interface Props {
  company: Company;
  roles: CompanyRole[];
  onUpdate: () => void;
}

export const RolesManagementView: React.FC<Props> = ({ company, roles, onUpdate }) => {
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ id: '', name: '', permissions: [] as string[] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ isOpen: false, title: '', message: '', type: 'success' });

  const showAlert = (title: string, message: string, type: 'success' | 'error') => {
    setAlert({ isOpen: true, title, message, type });
  };

  const handleSaveRole = async () => {
    if (!roleForm.name) return showAlert('Error', 'Nama Role wajib diisi', 'error');
    setIsProcessing(true);
    try {
      if (roleForm.id) {
        await supabase.from('company_roles').update({ name: roleForm.name, permissions: roleForm.permissions }).eq('id', roleForm.id);
      } else {
        await supabase.from('company_roles').insert({ company_id: company.id, name: roleForm.name, permissions: roleForm.permissions });
      }
      setIsRoleModalOpen(false); 
      onUpdate();
      showAlert('Berhasil', 'Role berhasil disimpan.', 'success');
    } catch(err: any) {
      showAlert('Gagal', err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsProcessing(true);
    try {
      await supabase.from('company_roles').delete().eq('id', pendingDelete);
      setIsConfirmModalOpen(false);
      setPendingDelete(null);
      onUpdate();
      showAlert('Berhasil', 'Role berhasil dihapus.', 'success');
    } catch(err: any) {
      showAlert('Gagal', err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="p-8 flex items-center justify-between border-b border-gray-50">
        <h3 className="text-lg font-bold uppercase tracking-tight">Manajemen Role</h3>
        <button onClick={() => { setRoleForm({ id: '', name: '', permissions: [] }); setIsRoleModalOpen(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all">
          <Plus size={14} /> Role Baru
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Permissions</th>
              <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {roles.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/30 group">
                <td className="px-8 py-6"><p className="font-bold">{r.name}</p></td>
                <td className="px-8 py-6">
                  <div className="flex flex-wrap gap-2">
                    {r.permissions.slice(0, 5).map(p => (
                      <span key={p} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded-lg border border-gray-200">{p}</span>
                    ))}
                    {r.permissions.length > 5 && <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[10px] rounded-lg">+{r.permissions.length - 5}</span>}
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setRoleForm({ id: r.id, name: r.name, permissions: r.permissions }); setIsRoleModalOpen(true); }} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg">
                      <Edit2 size={16} />
                    </button>
                    {!r.is_system && (
                      <button onClick={() => { setPendingDelete(r.id); setIsConfirmModalOpen(true); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title="Role Editor" size="lg">
         <div className="space-y-6">
            <input type="text" value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} placeholder="Nama Role" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" />
            
            <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Hak Akses Modul</p>
                <PermissionsList available={AVAILABLE_PERMISSIONS} selected={roleForm.permissions} onToggle={(p) => setRoleForm(prev => ({...prev, permissions: prev.permissions.includes(p) ? prev.permissions.filter(x => x !== p) : [...prev.permissions, p]}))} />
            </div>

            <button onClick={handleSaveRole} disabled={isProcessing} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all">
                {isProcessing ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Simpan Role'}
            </button>
         </div>
      </Modal>

      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Konfirmasi" size="sm">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><AlertTriangle size={32} /></div>
            <p className="text-sm font-bold text-gray-500 mb-8 px-4">Hapus role ini secara permanen?</p>
            <div className="flex gap-3">
                <button onClick={() => setIsConfirmModalOpen(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-[10px] uppercase hover:bg-gray-200">Batal</button>
                <button onClick={handleDelete} disabled={isProcessing} className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold text-[10px] uppercase hover:bg-red-700">
                    {isProcessing ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Hapus'}
                </button>
            </div>
          </div>
      </Modal>

      <Modal isOpen={alert.isOpen} onClose={() => setAlert({ ...alert, isOpen: false })} title={alert.title} size="sm">
        <div className="flex flex-col items-center py-6 text-center space-y-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${alert.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                {alert.type === 'error' ? <X size={32} /> : <CheckCircle2 size={32} />}
            </div>
            <p className="text-sm text-gray-600 font-medium px-6">{alert.message}</p>
            <button onClick={() => setAlert({ ...alert, isOpen: false })} className="w-full max-w-[200px] py-4 bg-gray-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest">Tutup</button>
        </div>
      </Modal>
    </div>
  );
};
