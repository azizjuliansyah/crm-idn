import React from 'react';
import { Modal } from '@/components/ui';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

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
  itemName,
  description = "Tindakan ini permanen. Pastikan tidak ada data yang masih terhubung sebelum menghapus.",
  isProcessing = false
}) => {
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
        <p className="text-lg font-bold text-gray-900 tracking-tight">Hapus {itemName}?</p>
        <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2 mb-8">
           {description}
        </p>
        <div className="flex w-full gap-3">
           <button 
             onClick={onClose}
             className="flex-1 py-4 bg-gray-100 text-gray-400 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all"
           >
             Batal
           </button>
           <button 
             onClick={onConfirm}
             disabled={isProcessing}
             className="flex-1 py-4 bg-rose-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow-lg shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all flex items-center justify-center gap-2"
           >
             {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Ya, Hapus
           </button>
        </div>
      </div>
    </Modal>
  );
};
