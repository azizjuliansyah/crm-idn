import React from 'react';
import { Button, Subtext, Modal } from '@/components/ui';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

interface ConfirmBulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  title?: string;
  description?: string;
  isProcessing?: boolean;
  variant?: 'vertical' | 'horizontal';
}

export const ConfirmBulkDeleteModal: React.FC<ConfirmBulkDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  count,
  title = "Hapus Masal",
  description,
  isProcessing = false,
  variant = 'vertical'
}) => {
  const isHorizontal = variant === 'horizontal';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isHorizontal ? "" : title}
      size={isHorizontal ? "md" : "sm"}
      footer={isHorizontal ? (
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
      ) : null}
    >
      {isHorizontal ? (
        <div className="flex items-start gap-4 py-2">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-rose-100/50">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1 space-y-1">
            <Subtext className="text-base font-bold text-gray-900 leading-tight">
              {title}
            </Subtext>
            <Subtext className="text-xs text-gray-500 leading-relaxed">
              {description || `Apakah Anda yakin ingin menghapus ${count} item yang dipilih secara permanen? Tindakan ini tidak dapat dibatalkan.`}
            </Subtext>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle size={32} />
          </div>
          <Subtext className="text-lg  text-gray-900 ">Hapus {count} Item?</Subtext>
          <Subtext className="text-sm text-gray-500 font-medium leading-relaxed mt-2 mb-8">
            {description || `Apakah Anda yakin ingin menghapus ${count} item yang dipilih secara permanen? Tindakan ini tidak dapat dibatalkan.`}
          </Subtext>
          <div className="flex w-full gap-3">
            <Button
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 text-gray-400  text-[10px] uppercase  rounded-lg"
            >
              Batal
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 py-4 bg-rose-600 text-white  text-[10px] uppercase  rounded-lg shadow-lg shadow-rose-100"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Hapus Semua
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
