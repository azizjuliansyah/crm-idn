'use client';

import React from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface BulkActionGroupProps {
  selectedCount: number;
  onUpdateStatus?: () => void;
  onDelete: () => void;
  className?: string;
  updateLabel?: string;
  deleteLabel?: string;
}

export const BulkActionGroup: React.FC<BulkActionGroupProps> = ({
  selectedCount,
  onUpdateStatus,
  onDelete,
  className = '',
  updateLabel = "Ubah Status",
  deleteLabel = "Hapus"
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {onUpdateStatus && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onUpdateStatus}
          className="px-4 py-2.5 text-[10px] uppercase font-extrabold text-blue-600 bg-white border-gray-100 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
        >
          <RefreshCw size={14} strokeWidth={2.5} />
          {updateLabel} ({selectedCount})
        </Button>
      )}
      
      <Button
        variant="danger"
        size="sm"
        onClick={onDelete}
        className="px-4 py-2.5 text-[10px] uppercase font-extrabold shadow-md shadow-rose-100 transition-all flex items-center gap-2"
      >
        <Trash2 size={14} strokeWidth={2.5} />
        {deleteLabel} ({selectedCount})
      </Button>
    </div>
  );
};
