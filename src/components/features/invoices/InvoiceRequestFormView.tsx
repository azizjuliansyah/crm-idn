'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Textarea, Button, H1, Subtext, Label, ComboBox } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, Profile, Client, Quotation, ProformaInvoice } from '@/lib/types';
import {
  ArrowLeft, Save, Loader2, User, FileText, FileCheck,
  FileQuestion, AlertCircle, Info, ChevronRight, CheckCircle2
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Props {
  company: Company;
  user: Profile;
  onNavigate?: (viewId: string) => void;
}

export const InvoiceRequestFormView: React.FC<Props> = ({ company, user, onNavigate }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProformaId = searchParams.get('proformaId');
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [proformas, setProformas] = useState<ProformaInvoice[]>([]);

  const [clientId, setClientId] = useState('');
  const [refType, setRefType] = useState<'quotation' | 'proforma'>('quotation');
  const [docId, setDocId] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, qRes, pRes] = await Promise.all([
        supabase.from('clients').select('*, client_company:client_companies(*)').eq('company_id', company.id).order('name'),
        supabase.from('quotations').select('*').eq('company_id', company.id).eq('status', 'Accepted').order('id', { ascending: false }),
        supabase.from('proformas').select('*').eq('company_id', company.id).order('id', { ascending: false })
      ]);

      if (cRes.data) setClients(cRes.data);
      if (qRes.data) setQuotations(qRes.data);
      if (pRes.data) setProformas(pRes.data as any);
    } finally {
      setLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (initialProformaId && proformas.length > 0) {
      const p = proformas.find(x => x.id.toString() === initialProformaId);
      if (p) {
        setClientId(String(p.client_id));
        setRefType('proforma');
        setDocId(String(p.id));
      }
    }
  }, [initialProformaId, proformas]);

  const filteredDocs = useMemo(() => {
    if (!clientId) return [];
    if (refType === 'quotation') {
      return quotations.filter(q => q.client_id === parseInt(clientId));
    } else {
      return proformas.filter(p => p.client_id === parseInt(clientId));
    }
  }, [clientId, refType, quotations, proformas]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !docId) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.from('invoice_requests').insert({
        company_id: company.id,
        requester_id: user.id,
        client_id: parseInt(clientId),
        quotation_id: refType === 'quotation' ? parseInt(docId) : null,
        proforma_id: refType === 'proforma' ? parseInt(docId) : null,
        notes: notes.trim(),
        status: 'Pending'
      });

      if (error) throw error;
      if (onNavigate) {
        onNavigate('request_invoice');
      } else {
        router.push('/dashboard/sales/invoice-requests');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-2xl border border-gray-100 min-h-[400px]"><Loader2 className="animate-spin text-indigo-600" size={32} /><Subtext className="text-[10px]  uppercase tracking-tight text-gray-400">Menyiapkan Form Request...</Subtext></div>;

  return (
    <div className="max-w-4xl p-6 md:p-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/sales/invoice-requests')}
          className="!p-2.5 text-gray-400 border border-gray-100 h-11 w-11"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <H1 className="text-2xl">Buat Pengajuan Invoice</H1>
          <Subtext className="font-medium">Ajukan permintaan penagihan kepada tim finance.</Subtext>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <form onSubmit={handleSave} className="p-10 space-y-8">
          <div className="space-y-6">
            <ComboBox
              label="Pilih Client Utama"
              value={clientId}
              onChange={(val: string | number) => { setClientId(val.toString()); setDocId(''); }}
              options={clients.map(c => ({
                value: c.id.toString(),
                label: c.name,
                sublabel: c.client_company?.name || 'Personal'
              }))}
              className="h-14 font-medium"
            />

            <div className="space-y-3">
              <Label className="uppercase tracking-tight ml-1">Referensi Dokumen Asal</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={refType === 'quotation' ? 'success' : 'ghost'}
                  onClick={() => { setRefType('quotation'); setDocId(''); }}
                  className={`flex-1 p-6 h-auto !justify-start !items-center gap-3 border ${refType === 'quotation' ? 'border-emerald-200' : 'bg-white border-gray-100 !text-gray-400'}`}
                >
                  <FileText size={20} />
                  <div className="text-left">
                    <Subtext className={`text-[10px] ${refType === 'quotation' ? '!text-white' : ''}`}>Dari Penawaran</Subtext>
                    <Subtext className={`text-[9px] font-medium ${refType === 'quotation' ? '!text-white/80' : 'opacity-60'}`}>Quotation</Subtext>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={refType === 'proforma' ? 'primary' : 'ghost'}
                  onClick={() => { setRefType('proforma'); setDocId(''); }}
                  className={`flex-1 p-6 h-auto !justify-start !items-center gap-3 border ${refType === 'proforma' ? 'border-indigo-200' : 'bg-white border-gray-100 !text-gray-400'}`}
                >
                  <FileCheck size={20} className={refType === 'proforma' ? 'text-white' : ''} />
                  <div className="text-left">
                    <Subtext className={`text-[10px] ${refType === 'proforma' ? '!text-white' : ''}`}>Dari Proforma</Subtext>
                    <Subtext className={`text-[9px] font-medium ${refType === 'proforma' ? '!text-white/80' : 'opacity-60'}`}>Proforma Invoice</Subtext>
                  </div>
                </Button>
              </div>

              <ComboBox
                value={docId}
                onChange={(val: string | number) => setDocId(val.toString())}
                disabled={!clientId}
                options={filteredDocs.map((d: any) => ({
                  value: d.id.toString(),
                  label: d.number,
                  sublabel: `Rp ${d.total.toLocaleString('id-ID')}`
                }))}
                className="h-14 font-medium disabled:opacity-30"
              />
              {!clientId && <Subtext className="text-[9px] text-gray-400 italic px-2">Silakan pilih client terlebih dahulu untuk melihat daftar dokumen.</Subtext>}
              {clientId && filteredDocs.length === 0 && <Subtext className="text-[9px] text-rose-500  px-2">Tidak ada dokumen {refType} yang tersedia untuk client ini.</Subtext>}
            </div>

            <Textarea
              label="Catatan Tambahan"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="h-32"
              placeholder="Misal: Tagihan ini untuk termin 1, tolong segera diproses..."
            />
          </div>

          <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl flex gap-4">
            <Info size={24} className="text-blue-500 shrink-0" />
            <Subtext className="text-[11px] text-blue-700 font-medium leading-relaxed">Setelah disimpan, permintaan akan muncul di dashboard admin finance untuk diproses menjadi Invoice Final. Anda dapat memantau statusnya di halaman utama Request Invoice.</Subtext>
          </div>

          <div className="pt-6 border-t border-gray-50 flex justify-end">
            <Button
              type="submit"
              disabled={isProcessing || !clientId || !docId}
              isLoading={isProcessing}
              leftIcon={<Save size={18} />}
              className="px-10 py-6 h-auto"
            >
              Kirim Pengajuan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
