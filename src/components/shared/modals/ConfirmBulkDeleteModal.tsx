import React from 'react';
import { Button, Modal } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';

interface ConfirmBulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  title?: string;
  description?: string;
  isProcessing?: boolean;
}

export const ConfirmBulkDeleteModal: React.FC<ConfirmBulkDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  count,
  title = "Hapus Masal",
  description,
  isProcessing = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="md"
      footer={
        <div className="flex items-center gap-3">
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
            className="px-6 uppercase text-[10px]"
          >
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            isLoading={isProcessing}
            disabled={isProcessing}
            variant="danger"
            size="sm"
            className="px-6 uppercase text-[10px] shadow-lg shadow-rose-100"
          >
            Ya, Hapus Semua
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 py-2">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shrink-0 border border-rose-100/50 shadow-sm">
            <AlertTriangle size={24} strokeWidth={2.5} />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-base font-semibold text-gray-900 leading-tight">
              {title}
            </h3>
            <p className="text-[11px] font-medium text-gray-500">
              {description || `Apakah Anda yakin ingin menghapus ${count} item yang dipilih secara permanen? Tindakan ini tidak dapat dibatalkan.`}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
