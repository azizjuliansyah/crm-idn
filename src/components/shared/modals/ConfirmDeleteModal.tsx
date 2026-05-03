import React from 'react';
import { Button, Modal } from '@/components/ui';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName: string;
  description?: string;
  isProcessing?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Hapus Data",
  description = "Tindakan ini permanen. Pastikan tidak ada data yang masih terhubung sebelum menghapus.",
  isProcessing = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="sm"
      noPadding
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
            className="!px-3 py-1.5 text-[9px] uppercase font-bold"
          >
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            variant="danger"
            size="sm"
            isLoading={isProcessing}
            leftIcon={!isProcessing && <Trash2 size={10} />}
            className="!px-3 py-1.5 text-[9px] uppercase font-bold shadow-none"
          >
            Ya, Hapus
          </Button>
        </div>
      }
    >
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shrink-0 border border-rose-100/30">
          <AlertTriangle size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-gray-900 tracking-tight">{title}</div>
          <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{description}</div>
        </div>
      </div>
    </Modal>
  );
};
