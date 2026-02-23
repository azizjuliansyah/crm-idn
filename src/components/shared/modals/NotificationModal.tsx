import React from 'react';
import { Modal } from '@/components/ui';
import { CheckCircle2, X, AlertTriangle } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning';
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'success'
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title=""
      size="sm"
    >
      <div className="flex flex-col items-center py-6 text-center">
         <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${type === 'success' ? 'bg-emerald-50 text-emerald-600' : type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-rose-50 text-rose-600'}`}>
            {type === 'success' ? <CheckCircle2 size={32} /> : type === 'warning' ? <AlertTriangle size={32} /> : <X size={32} />}
         </div>
         <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
         <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
           {message}
         </p>
         <button 
           onClick={onClose}
           className="w-full py-4 bg-gray-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-black transition-all"
         >
           Tutup
         </button>
      </div>
    </Modal>
  );
};
