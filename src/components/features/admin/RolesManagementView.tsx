import React, { useState } from 'react';
import { Button, Table, TableHeader, TableBody, TableRow, TableCell, Subtext, Badge, Card, Toast, ToastType, H2, Label } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Company, CompanyRole } from '@/lib/types';
import { Plus, Edit2, Trash2, Loader2, AlertTriangle, CheckCircle2, X, Shield } from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';

import { AdminRoleEditorModal } from './components/AdminRoleEditorModal';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';

// Simplified permissions list mostly for display/selection
const AVAILABLE_PERMISSIONS = ['Dashboard', 'Leads', 'Deals', 'Projects', 'Perusahaan', 'Anggota Tim', 'Manajemen Role', 'Pengaturan Leads', 'Pengaturan Deals Pipeline', 'Data Client', 'Perusahaan Client', 'Pengaturan Kategori Client', 'Pengaturan Sumber Leads', 'Produk', 'Kategori Produk', 'Satuan', 'Penjualan', 'Penawaran', 'Proforma Invoice', 'Invoice', 'Kwitansi', 'Pengaturan Penjualan', 'Penomoran Otomatis', 'Pengaturan Pajak', 'Template Dokumen', 'Knowledge Base', 'Pengaturan AI', 'Customer Support', 'Support Pipeline', 'Konfigurasi Email', 'Request Invoice', 'Persetujuan Request Invoice', 'Request Kwitansi', 'Persetujuan Request Kwitansi', 'Akses Sales Request', 'Persetujuan Sales Request', 'Pengaturan Kategori Request', 'SOP', 'AI Assistant', 'Ticket Topic', 'Tingkat Urgensi'];

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
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const handleSaveRole = async () => {
    if (!roleForm.name) return showToast('Nama Role wajib diisi', 'error');
    setIsProcessing(true);
    try {
      if (roleForm.id) {
        const { error } = await supabase.from('company_roles').update({ name: roleForm.name, permissions: roleForm.permissions }).eq('id', roleForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('company_roles').insert({ company_id: company.id, name: roleForm.name, permissions: roleForm.permissions });
        if (error) throw error;
      }
      setIsRoleModalOpen(false);
      onUpdate();
      showToast('Role berhasil disimpan.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('company_roles').delete().eq('id', pendingDelete);
      if (error) throw error;
      setIsConfirmModalOpen(false);
      setPendingDelete(null);
      onUpdate();
      showToast('Role berhasil dihapus.');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shrink-0">
        <div>
          <H2 className="text-xl ">Manajemen Role</H2>
          <Subtext className="text-[10px] uppercase font-semibold text-gray-400">Konfigurasi hak akses dan perizinan fitur untuk setiap jabatan.</Subtext>
        </div>
        <Button
          onClick={() => { setRoleForm({ id: '', name: '', permissions: [] }); setIsRoleModalOpen(true); }}
          leftIcon={<Plus size={14} strokeWidth={3} />}
          className="!px-6 py-2.5 text-[10px] uppercase shadow-lg shadow-blue-100"
          variant='primary'
          size='sm'
        >
          Role Baru
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col relative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader className="py-4 px-6 font-bold text-gray-900 uppercase text-[10px]">Role / Jabatan</TableCell>
              <TableCell isHeader className="py-4 px-6 font-bold text-gray-900 uppercase text-[10px]">Hak Akses (Permissions)</TableCell>
              <TableCell isHeader className="text-center py-4 px-6 whitespace-nowrap font-bold text-gray-900 uppercase text-[10px]">Aksi</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map(r => (
              <TableRow key={r.id}>
                <TableCell className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-sm">
                      <Shield size={14} />
                    </div>
                    <Label className="text-[13px] font-semibold text-gray-900">{r.name}</Label>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-6">
                  <div className="flex flex-wrap gap-1.5">
                    {r.permissions.slice(0, 5).map(p => (
                      <Badge key={p} variant="neutral" className="bg-gray-50 text-gray-500 border-gray-100 text-[9px] uppercase px-2 font-medium">
                        {p}
                      </Badge>
                    ))}
                    {r.permissions.length > 5 && (
                      <Badge variant="neutral" className="bg-blue-50 text-blue-500 border-blue-100 text-[9px] font-bold px-2">
                        +{r.permissions.length - 5} MORE
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center py-4 px-6">
                  <div className="flex items-center justify-center gap-2">
                    <ActionButton
                      icon={Edit2}
                      variant="blue"
                      onClick={() => { setRoleForm({ id: r.id, name: r.name, permissions: r.permissions }); setIsRoleModalOpen(true); }}
                    />
                    {!r.is_system && (
                      <ActionButton
                        icon={Trash2}
                        variant="rose"
                        onClick={() => { setPendingDelete(r.id); setIsConfirmModalOpen(true); }}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AdminRoleEditorModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        form={roleForm}
        setForm={setRoleForm}
        onSave={handleSaveRole}
        isProcessing={isProcessing}
        availablePermissions={AVAILABLE_PERMISSIONS}
      />

      <ConfirmDeleteModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleDelete}
        itemName="Role"
        description="Hapus role ini secara permanen?"
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
