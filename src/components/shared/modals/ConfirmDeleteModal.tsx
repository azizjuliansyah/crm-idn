import React from 'react';
import { Button, Subtext, Modal } from '@/components/ui';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName: string;
  description?: string;
  isProcessing?: boolean;
  variant?: 'vertical' | 'horizontal';
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Hapus Data",
  itemName,
  description = "Tindakan ini permanen. Pastikan tidak ada data yang masih terhubung sebelum menghapus.",
  isProcessing = false,
  variant = 'vertical'
}) => {
  if (variant === 'horizontal') {
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
              className="!px-3 py-1.5 text-[9px] uppercase font-bold shadow-lg shadow-rose-100"
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
            <div className="text-[14px] font-bold text-gray-900 tracking-tight">{title}</div>
            <div className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{description}</div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className="flex flex-col items-center py-6 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
          <AlertTriangle size={32} />
        </div>
        <Subtext className="text-lg  text-gray-900 ">Hapus {itemName}?</Subtext>
        <Subtext className="text-sm text-gray-500 font-medium leading-relaxed mt-2 mb-8">
          {description}
        </Subtext>
        <div className="flex w-full gap-3">
          <Button
            onClick={onClose}
            className="flex-1 py-4 bg-gray-100 text-gray-400  text-[10px] uppercase  rounded-lg hover:bg-gray-200 transition-all"
          >
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 py-4 bg-rose-600 text-white  text-[10px] uppercase  rounded-lg shadow-lg shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Ya, Hapus
          </Button>
        </div>
      </div>
    </Modal>
  );
};
