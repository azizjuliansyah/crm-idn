
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, CompanyMember, CompanyRole, Profile } from '@/lib/types';
import { UserPlus, Trash2, Loader2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Modal } from './Modal';

interface Props {
  company: Company;
  members: CompanyMember[];
  roles: CompanyRole[];
  user: Profile;
  onUpdate: () => void;
}

export const TeamMembersView: React.FC<Props> = ({ company, members, roles, user, onUpdate }) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role_id: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({ isOpen: false, title: '', message: '', type: 'success' });

  const showAlert = (title: string, message: string, type: 'success' | 'error') => {
    setAlert({ isOpen: true, title, message, type });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', inviteForm.email.trim()).maybeSingle();
        if (profile) {
            await supabase.from('company_members').insert({ company_id: company.id, user_id: profile.id, role_id: inviteForm.role_id });
            setIsInviteModalOpen(false); 
            setInviteForm({ email: '', role_id: '' });
            onUpdate();
            showAlert('Berhasil', 'Anggota berhasil diundang ke workspace.', 'success');
        } else { 
            showAlert('Tidak Ditemukan', 'User dengan email tersebut belum terdaftar di platform.', 'error');
        }
    } catch (err: any) {
        showAlert('Gagal', err.message, 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
      if (!pendingDelete) return;
      setIsProcessing(true);
      try {
        await supabase.from('company_members').delete().eq('id', pendingDelete);
        setIsConfirmModalOpen(false);
        setPendingDelete(null);
        onUpdate();
        showAlert('Berhasil', 'Anggota berhasil dihapus.', 'success');
      } catch (err: any) {
        showAlert('Gagal', err.message, 'error');
      } finally {
        setIsProcessing(false);
      }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-8 flex items-center justify-between border-b border-gray-50">
            <h3 className="text-lg font-bold uppercase tracking-tight">Anggota Tim</h3>
            <button onClick={() => setIsInviteModalOpen(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all">
                <UserPlus size={14} /> Tambah
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-gray-50/50">
                        <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama & Email</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Jabatan / Role</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {members.map(m => (
                        <tr key={m.id} className="hover:bg-gray-50/30 group">
                            <td className="px-8 py-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 uppercase overflow-hidden">
                                    {m.profile?.avatar_url ? <img src={m.profile.avatar_url} className="w-full h-full object-cover" /> : (m.profile?.full_name || '?').charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold">{m.profile?.full_name}</p>
                                    <p className="text-xs text-gray-400">{m.profile?.email || '-'}</p>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded-full border border-blue-100">{m.company_roles?.name || 'Member'}</span>
                            </td>
                            <td className="px-8 py-6 text-center">
                                {m.profile?.id !== user.id && (
                                    <button onClick={() => { setPendingDelete(m.id); setIsConfirmModalOpen(true); }} className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Undang Anggota">
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email User</label>
                    <input type="email" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold" placeholder="email@user.com" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Role</label>
                    <select value={inviteForm.role_id} onChange={e => setInviteForm({...inviteForm, role_id: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl font-bold">
                        <option value="">Pilih Role</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                </div>
                <button onClick={handleInvite} disabled={isProcessing} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all">
                    {isProcessing ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Undang Sekarang'}
                </button>
            </div>
        </Modal>

        <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Konfirmasi" size="sm">
            <div className="text-center py-6">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><AlertTriangle size={32} /></div>
                <p className="text-sm font-bold text-gray-500 mb-8 px-4">Hapus anggota tim ini secara permanen?</p>
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
