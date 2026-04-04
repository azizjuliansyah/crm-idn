import React, { useState } from 'react';
import { Button, Modal, ComboBox } from '@/components/ui';
import { RefreshCw } from 'lucide-react';

interface Option {
  id: string | number;
  name: string;
}

interface ConfirmBulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (statusId: string | number) => void;
  count: number;
  options: Option[];
  title?: string;
  description?: string;
  isProcessing?: boolean;
  label?: string;
}

export const ConfirmBulkStatusModal: React.FC<ConfirmBulkStatusModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  count,
  options,
  title = "Ubah Status Masal",
  description,
  isProcessing = false,
  label = "Pilih Status Baru"
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string | number>('');

  const handleConfirm = () => {
    if (selectedStatus) {
      onConfirm(selectedStatus);
    }
  };

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
            onClick={handleConfirm}
            isLoading={isProcessing}
            disabled={isProcessing || !selectedStatus}
            variant="primary"
            size="sm"
            className="px-6 uppercase text-[10px] shadow-lg shadow-emerald-100/50"
          >
            Terapkan
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 py-2">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100/50 shadow-sm">
            <RefreshCw size={24} strokeWidth={2.5} />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-base font-semibold text-gray-900 leading-tight">
              {title}
            </h3>
            <p className="text-[11px] font-medium text-gray-500">
              {description || `Pilih status baru yang akan diterapkan pada ${count} item yang dipilih.`}
            </p>
          </div>
        </div>
        
        <div className="w-full text-left space-y-2">
          <label className="text-[9px] uppercase font-semibold text-gray-600">{label}</label>
          <ComboBox
            hideSearch
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val)}
            options={options.map(opt => ({ value: opt.id, label: opt.name.toUpperCase() }))}
            placeholder="Pilih item..."
            className="w-full rounded-xl border-gray-100 focus:ring-blue-500"
          />
        </div>
      </div>
    </Modal>
  );
};
