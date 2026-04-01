'use client';

import React from 'react';
import { Button, Input, ComboBox } from '@/components/ui';
import { X } from 'lucide-react';
import { TaxSetting } from '@/lib/types';

export interface CalculatedTax extends TaxSetting {
  calculated_value: number;
}

interface Props {
  subtotal: number;
  discountType: 'Rp' | '%';
  setDiscountType: (type: 'Rp' | '%') => void;
  discountValue: number;
  setDiscountValue: (val: number) => void;
  discountAmount: number;
  availableTaxes: TaxSetting[];
  selectedTaxIds: number[];
  setSelectedTaxIds: (ids: number[]) => void;
  selectedTaxesList: CalculatedTax[];
  total: number;
  totalLabel?: string;
}

const formatIDRVal = (num: number = 0) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

export const DocumentSummary: React.FC<Props> = ({
  subtotal,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  discountAmount,
  availableTaxes,
  selectedTaxIds,
  setSelectedTaxIds,
  selectedTaxesList,
  total,
  totalLabel = 'Total'
}) => {
  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-50 pb-4">
        <span className="text-xs font-bold text-gray-400 uppercase">Subtotal</span>
        <span className="text-sm font-bold text-gray-900">{formatIDRVal(subtotal)}</span>
      </div>
      
      <div className="flex items-center justify-between border-b border-gray-50 pb-4 mt-4">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-gray-400 uppercase">Diskon</span>
          <div className="flex bg-white rounded border border-gray-200 overflow-hidden h-11">
            <ComboBox
              value={discountType}
              onChange={(val: string | number) => setDiscountType(val as any)}
              options={[
                { value: 'Rp', label: 'Rp' },
                { value: '%', label: '%' },
              ]}
              hideSearch={true}
              className="!w-24"
              size="sm"
              triggerClassName="!border-0 !h-full !rounded-none !ring-0 !px-4"
            />
            <div className="w-px bg-gray-200 h-6 my-auto" />
            <Input
              type="number"
              value={discountValue}
              onChange={e => setDiscountValue(Number(e.target.value))}
              className="!w-32 font-bold !border-0 !h-full !rounded-none !ring-0 text-base"
            />
          </div>
        </div>
        <span className="text-sm font-bold text-rose-600">- {formatIDRVal(discountAmount)}</span>
      </div>

      <div className="space-y-4 border-b border-gray-50 pb-4 mt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase">Pajak</span>
          <div className="relative">
            <ComboBox
              value=""
              onChange={(val: string | number) => {
                if (val) {
                  const id = Number(val);
                  if (!selectedTaxIds.includes(id)) {
                    setSelectedTaxIds([...selectedTaxIds, id]);
                  }
                }
              }}
              options={availableTaxes.filter(t => !selectedTaxIds.includes(t.id)).map(t => ({
                value: t.id.toString(),
                label: `${t.name} (${t.rate}%)`
              }))}
              placeholder="Tambah Pajak"
              className="!w-40"
            />
          </div>
        </div>
        {selectedTaxesList.map(tax => (
          <div key={tax.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTaxIds(selectedTaxIds.filter(id => id !== tax.id))} 
                className="!p-1 text-gray-400 hover:text-rose-500 rounded-full"
              >
                <X size={14} />
              </Button>
              <span className="text-sm text-gray-600 font-medium">{tax.name} ({tax.rate}%)</span>
            </div>
            <span className="text-sm font-bold text-gray-900">{formatIDRVal(tax.calculated_value)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 mt-4">
        <span className="text-sm font-bold text-gray-900 uppercase">{totalLabel}</span>
        <span className="text-2xl font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg">{formatIDRVal(total)}</span>
      </div>
    </>
  );
};
