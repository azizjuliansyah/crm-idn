'use client';

import React from 'react';
import { Button, Subtext } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title: React.ReactNode | string;
  subtitle: React.ReactNode | string;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  isSaveDisabled?: boolean;
  saveLabel: string;
  saveIcon?: React.ReactNode;
  extraActions?: React.ReactNode;
}

export const DocumentActionHeader: React.FC<Props> = ({
  title,
  subtitle,
  onBack,
  onSave,
  isSaving,
  isSaveDisabled = false,
  saveLabel,
  saveIcon,
  extraActions
}) => {
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-10 py-5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Button variant="ghost" onClick={onBack} className="!p-2 text-gray-400 border border-gray-100 h-10 w-10">
            <ArrowLeft size={20} />
          </Button>
          <div className="flex flex-col gap-0.5">
            {typeof title === 'string' ? (
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
            ) : (
              title
            )}
            {subtitle && (
              typeof subtitle === 'string' ? (
                <Subtext className="text-indigo-600 font-bold uppercase text-[11px] tracking-wider">{subtitle}</Subtext>
              ) : (
                subtitle
              )
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>Batal</Button>
          
          {extraActions && (
            <div className="flex gap-2 items-center border-r border-gray-200 pr-3 mr-1">
              {extraActions}
            </div>
          )}
          
          <Button 
            onClick={onSave} 
            isLoading={isSaving} 
            disabled={isSaveDisabled} 
            leftIcon={saveIcon} 
            variant="primary"
          >
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
