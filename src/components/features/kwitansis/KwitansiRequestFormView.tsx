'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Textarea, Button, H1, Subtext, Label, ComboBox } from '@/components/ui';

import { supabase } from '@/lib/supabase';
import { Company, Profile, Client, Invoice, UrgencyLevel } from '@/lib/types';
import {
    ArrowLeft, Save, Loader2, User, FileText, FileCheck,
    FileQuestion, AlertCircle, Info, ChevronRight, CheckCircle2, Zap
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';

interface Props {
    company: Company;
    user: Profile;
    onNavigate?: (viewId: string) => void;
}

export const KwitansiRequestFormView: React.FC<Props> = ({ company, user, onNavigate }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialInvoiceId = searchParams.get('invoiceId');
    const initialProformaId = searchParams.get('proformaId');
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [proformas, setProformas] = useState<any[]>([]);

    const { showToast } = useAppStore();
    const [clientId, setClientId] = useState('');
    const [docType, setDocType] = useState<'invoice' | 'proforma'>('invoice');
    const [docId, setDocId] = useState('');
    const [notes, setNotes] = useState('');
    const [urgencyLevels, setUrgencyLevels] = useState<UrgencyLevel[]>([]);
    const [urgencyId, setUrgencyId] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [cRes, iRes, pRes, uRes] = await Promise.all([
                supabase.from('clients').select('*, client_company:client_companies(*)').eq('company_id', company.id).order('name'),
                supabase.from('invoices').select('*').eq('company_id', company.id).order('id', { ascending: false }),
                supabase.from('proformas').select('*').eq('company_id', company.id).order('id', { ascending: false }),
                supabase.from('urgency_levels').select('*').eq('company_id', company.id).order('sort_order', { ascending: true })
            ]);

            if (cRes.data) setClients(cRes.data);
            if (iRes.data) setInvoices(iRes.data as any);
            if (pRes.data) setProformas(pRes.data);
            if (uRes.data) {
                setUrgencyLevels(uRes.data as any);
                if (uRes.data.length > 0) {
                    setUrgencyId(uRes.data[0].id); // Set default to the first one
                }
            }
        } finally {
            setLoading(false);
        }
    }, [company.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (initialInvoiceId && invoices.length > 0) {
            const inv = invoices.find(x => x.id.toString() === initialInvoiceId);
            if (inv) {
                setClientId(String(inv.client_id));
                setDocType('invoice');
                setDocId(String(inv.id));
            }
        } else if (initialProformaId && proformas.length > 0) {
            const prof = proformas.find(x => x.id.toString() === initialProformaId);
            if (prof) {
                setClientId(String(prof.client_id));
                setDocType('proforma');
                setDocId(String(prof.id));
            }
        }
    }, [initialInvoiceId, initialProformaId, invoices, proformas]);

    const filteredDocs = useMemo(() => {
        if (!clientId) return [];
        if (docType === 'invoice') {
            return invoices.filter(inv => inv.client_id === parseInt(clientId) && inv.status === 'Paid');
        } else {
            return proformas.filter(p => p.client_id === parseInt(clientId));
        }
    }, [clientId, docType, invoices, proformas]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId || !docId) return;

        setIsProcessing(true);
        try {
            const { error } = await supabase.from('kwitansi_requests').insert({
                company_id: company.id,
                requester_id: user.id,
                client_id: parseInt(clientId),
                invoice_id: docType === 'invoice' ? parseInt(docId) : null,
                proforma_id: docType === 'proforma' ? parseInt(docId) : null,
                notes: notes.trim(),
                urgency_id: urgencyId,
                status: 'Pending'
            });

            if (error) throw error;
            if (onNavigate) {
                onNavigate('request_kwitansi?success=created');
            } else {
                router.push('/dashboard/sales/kwitansi-requests?success=created');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-2xl border border-gray-100 min-h-[400px]"><Loader2 className="animate-spin text-indigo-600" size={32} /><Subtext className="text-[10px]  uppercase  text-gray-400">Menyiapkan Form Request...</Subtext></div>;

    return (
        <div className="max-w-4xl p-6 md:p-8 space-y-8">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard/sales/kwitansi-requests')}
                    className="!p-2.5 text-gray-400 border border-gray-100 h-11 w-11"
                >
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <H1 className="text-2xl">Buat Pengajuan Kwitansi</H1>
                    <Subtext className="font-medium">Ajukan permintaan pembuatan kwitansi kepada tim finance.</Subtext>
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
                            <Label className="uppercase  ml-1">Referensi Invoice Asal</Label>
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    onClick={() => { setDocType('invoice'); setDocId(''); }}
                                    variant={docType === 'invoice' ? 'primary' : 'ghost'}
                                    className={`flex-1 p-6 h-auto !justify-start !items-center gap-3 border ${docType === 'invoice' ? 'border-indigo-200 shadow-lg shadow-indigo-100' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                                >
                                    <FileCheck size={20} className={docType === 'invoice' ? 'text-white' : 'text-gray-300'} />
                                    <div className="text-left">
                                        <Subtext className={`text-[10px] ${docType === 'invoice' ? '!text-white' : '!text-gray-400'}`}>Dari Tagihan</Subtext>
                                        <Subtext className={`text-[9px] font-medium ${docType === 'invoice' ? '!text-white/80' : '!text-gray-300'}`}>Invoice</Subtext>
                                    </div>
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => { setDocType('proforma'); setDocId(''); }}
                                    variant={docType === 'proforma' ? 'primary' : 'ghost'}
                                    className={`flex-1 p-6 h-auto !justify-start !items-center gap-3 border ${docType === 'proforma' ? 'border-indigo-200 shadow-lg shadow-indigo-100' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                                >
                                    <FileText size={20} className={docType === 'proforma' ? 'text-white' : 'text-gray-300'} />
                                    <div className="text-left">
                                        <Subtext className={`text-[10px] ${docType === 'proforma' ? '!text-white' : '!text-gray-400'}`}>Dari Penawaran</Subtext>
                                        <Subtext className={`text-[9px] font-medium ${docType === 'proforma' ? '!text-white/80' : '!text-gray-300'}`}>Proforma</Subtext>
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
                            {!clientId && <Subtext className="text-[9px] text-gray-400 italic px-2">Silakan pilih client terlebih dahulu untuk melihat daftar {docType}.</Subtext>}
                            {clientId && filteredDocs.length === 0 && <Subtext className="text-[9px] text-rose-500  px-2">Tidak ada {docType} {docType === 'invoice' ? 'dengan status PAID' : ''} tersedia untuk client ini.</Subtext>}
                        </div>
                        <Textarea
                            label="Catatan Tambahan"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="h-32"
                            placeholder="Misal: Tolong kwitansi ini dibuat sesuai dengan total pembayaran termin 2..."
                        />

                        {urgencyLevels.length > 0 && (
                            <div className="space-y-3">
                                <Label className="uppercase ml-1">Tingkat Urgensi</Label>
                                <ComboBox
                                    value={urgencyId?.toString() || ''}
                                    onChange={(val: string | number) => setUrgencyId(Number(val))}
                                    options={urgencyLevels.map(u => ({
                                        value: u.id.toString(),
                                        label: u.name
                                    }))}
                                    className="h-14 font-medium"
                                />
                                <Subtext className="text-[10px] text-gray-400 mt-1 pl-1">Pilih tingkat prioritas untuk request ini.</Subtext>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl flex gap-4">
                        <Info size={24} className="text-blue-500 shrink-0" />
                        <Subtext className="text-[11px] text-blue-700 font-medium leading-relaxed">Setelah disimpan, permintaan akan muncul di dashboard admin finance untuk diproses menjadi Kwitansi Final. Anda dapat memantau statusnya di halaman utama Request Kwitansi.</Subtext>
                    </div>

                    <div className="pt-6 border-t border-gray-50 flex justify-end">
                        <Button
                            type="submit"
                            disabled={isProcessing || !clientId || !docId}
                            isLoading={isProcessing}
                            leftIcon={<Save size={18} />}
                            variant="primary"
                        >
                            Kirim Pengajuan
                        </Button>
                    </div>
                </form>
            </div>

        </div>
    );
};
