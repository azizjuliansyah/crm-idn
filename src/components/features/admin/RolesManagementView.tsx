import React, { useState } from 'react';
import { Button, Table, TableHeader, TableBody, TableRow, TableCell, Subtext, Badge, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Company, CompanyRole } from '@/lib/types';
import { Plus, Edit2, Trash2, Loader2, AlertTriangle, CheckCircle2, X } from 'lucide-react';

import { AdminRoleEditorModal } from './components/AdminRoleEditorModal';
import { ConfirmDeleteModal } from '@/components/shared/modals/ConfirmDeleteModal';
import { NotificationModal } from '@/components/shared/modals/NotificationModal';

// Simplified permissions list mostly for display/selection
const AVAILABLE_PERMISSIONS = ['Dashboard', 'Leads', 'Deals', 'Projects', 'Perusahaan', 'Anggota Tim', 'Manajemen Role', 'Pengaturan Leads', 'Pengaturan Deals Pipeline', 'Data Client', 'Perusahaan Client', 'Pengaturan Kategori Client', 'Pengaturan Sumber Leads', 'Produk', 'Kategori Produk', 'Satuan', 'Penjualan', 'Penawaran', 'Proforma Invoice', 'Invoice', 'Kwitansi', 'Pengaturan Penjualan', 'Penomoran Otomatis', 'Pengaturan Pajak', 'Template Dokumen', 'Knowledge Base', 'Pengaturan AI', 'Customer Support', 'Support Pipeline', 'Konfigurasi Email', 'Request Invoice', 'Persetujuan Request Invoice', 'Request Kwitansi', 'Persetujuan Request Kwitansi', 'Akses Sales Request', 'Persetujuan Sales Request', 'Pengaturan Kategori Request', 'SOP', 'AI Assistant', 'Ticket Topic'];

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
      await supabase.from('company_roles').delete().eq('id', pendingDelete);
      setIsConfirmModalOpen(false);
      setPendingDelete(null);
      onUpdate();
      showAlert('Berhasil', 'Role berhasil dihapus.', 'success');
    } catch (err: any) {
      showAlert('Gagal', err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card
      title="Manajemen Role"
      action={
        <Button
          onClick={() => { setRoleForm({ id: '', name: '', permissions: [] }); setIsRoleModalOpen(true); }}
          variant="secondary"
          className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
          size="md"
          leftIcon={<Plus size={14} />}
        >
          Role Baru
        </Button>
      }
    >
      <Table className='px-4'>
        <TableHeader>
          <TableRow>
            <TableCell isHeader>Role</TableCell>
            <TableCell isHeader>Permissions</TableCell>
            <TableCell isHeader className="text-center">Aksi</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map(r => (
            <TableRow key={r.id}>
              <TableCell><Subtext>{r.name}</Subtext></TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {r.permissions.slice(0, 5).map(p => (
                    <Badge key={p} variant="neutral" className="bg-gray-100 text-gray-600 border-gray-200">{p}</Badge>
                  ))}
                  {r.permissions.length > 5 && <Badge variant="neutral">+{r.permissions.length - 5}</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-indigo-500 hover:bg-indigo-50"
                    onClick={() => { setRoleForm({ id: r.id, name: r.name, permissions: r.permissions }); setIsRoleModalOpen(true); }}
                  >
                    <Edit2 size={16} />
                  </Button>
                  {!r.is_system && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 text-red-400 hover:bg-red-50"
                      onClick={() => { setPendingDelete(r.id); setIsConfirmModalOpen(true); }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
      />

      <NotificationModal
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />
    </Card>
  );
};
