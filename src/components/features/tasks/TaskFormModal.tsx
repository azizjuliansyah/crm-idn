'use client';

import React from 'react';
import { 
  Input, 
  Button, 
  Modal, 
  Textarea, 
  ComboBox 
} from '@/components/ui';
import { Save, Loader2 } from 'lucide-react';
import { Task, TaskStage, CompanyMember } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  form: any;
  setForm: (form: any) => void;
  isProcessing: boolean;
  stages: TaskStage[];
  members: CompanyMember[];
}

export const TaskFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  form,
  setForm,
  isProcessing,
  stages,
  members
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={form.id ? "Edit Pekerjaan" : "Tambah Pekerjaan Baru"}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={isProcessing} 
            className="rounded-md"
          >
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={isProcessing}
            isLoading={isProcessing}
            leftIcon={!isProcessing && <Save size={14} />}
            className="rounded-md"
          >
            Simpan Data
          </Button>
        </div>
      }
    >
      <div className="space-y-6 py-2">
        <Input
          label="Judul Pekerjaan*"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="Tulis tugas spesifik..."
          className="rounded-md"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-gray-900">
          <ComboBox
            label="Tahapan Task"
            value={form.stage_id}
            onChange={(val: string | number) => setForm({ ...form, stage_id: val.toString() })}
            options={stages.map(s => ({ value: s.id, label: s.name }))}
            hideSearch={true}
            className="rounded-md"
          />
          <ComboBox
            label="Penanggung Jawab (PIC)"
            value={form.assigned_id}
            onChange={(val: string | number) => setForm({ ...form, assigned_id: val.toString() })}
            options={members.map(m => ({
              value: m.profile?.id.toString() || '',
              label: m.profile?.full_name || 'Tanpa Nama',
              sublabel: m.profile?.email
            }))}
            className="rounded-md"
          />
          <Input
            label="Tanggal Mulai"
            type="date"
            value={form.start_date}
            onChange={e => setForm({ ...form, start_date: e.target.value })}
            className="rounded-md"
          />
          <Input
            label="Tenggat Waktu"
            type="date"
            value={form.end_date}
            onChange={e => setForm({ ...form, end_date: e.target.value })}
            className="rounded-md"
          />
        </div>

        <Textarea
          label="Deskripsi Tugas"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Tulis instruksi atau catatan pengerjaan..."
          className="h-32 rounded-2xl"
        />
      </div>
    </Modal>
  );
};
