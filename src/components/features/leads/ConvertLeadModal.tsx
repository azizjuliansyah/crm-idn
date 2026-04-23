'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lead, Pipeline, CompanyMember } from '@/lib/types';
import { Modal, Button, ComboBox, Label, H4, Subtext } from '@/components/ui';
import { LayoutGrid, Layers, CheckCircle2, User } from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';

interface ConvertLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead;
    companyId: number;
    userId: string;
    onSuccess: () => void;
    members?: CompanyMember[];
}

export const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
    isOpen,
    onClose,
    lead,
    companyId,
    userId,
    onSuccess,
    members = []
}) => {
    const { showToast } = useAppStore();
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
    const [selectedStageId, setSelectedStageId] = useState<string>('');
    const [selectedSalesId, setSelectedSalesId] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchPipelines();
            setSelectedSalesId(lead.sales_id || '');
        }
    }, [isOpen, lead]);

    const fetchPipelines = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('pipelines')
                .select('*, stages:pipeline_stages(*)')
                .eq('company_id', companyId)
                .order('name');

            if (error) throw error;
            if (data) {
                setPipelines(data);
                if (data.length > 0) {
                    setSelectedPipelineId(data[0].id.toString());
                }
            }
        } catch (error: any) {
            showToast('Gagal memuat data pipeline: ' + error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const currentPipeline = pipelines.find(p => p.id.toString() === selectedPipelineId);
    const currentStages = currentPipeline?.stages?.sort((a, b) => a.sort_order - b.sort_order) || [];

    useEffect(() => {
        if (currentStages.length > 0) {
            setSelectedStageId(currentStages[0].id.toString());
        } else {
            setSelectedStageId('');
        }
    }, [selectedPipelineId, pipelines]);

    const handleConvert = async () => {
        if (!selectedPipelineId || !selectedStageId) {
            showToast('Silakan pilih pipeline dan tahapan terlebih dahulu.', 'error');
            return;
        }

        setIsProcessing(true);
        try {
            // 1. Find or Create Client
            let clientId = null;
            const { data: existingClients } = await supabase.from('clients')
                .select('id')
                .eq('company_id', companyId)
                .eq('name', lead.name)
                .limit(1);

            if (existingClients && existingClients.length > 0) {
                clientId = existingClients[0].id;
            } else {
                const { data: newClient, error: clientError } = await supabase.from('clients')
                    .insert({
                        company_id: companyId,
                        name: lead.name,
                        salutation: lead.salutation || '-',
                        email: lead.email || null,
                        whatsapp: lead.whatsapp || null,
                        client_company_id: lead.client_company_id,
                    }).select('id').single();

                if (clientError) throw clientError;
                clientId = newClient.id;
            }

            // 2. Create the Deal
            const { data: newDeal, error: dealError } = await supabase.from('deals').insert({
                company_id: companyId,
                pipeline_id: parseInt(selectedPipelineId),
                stage_id: selectedStageId,
                name: `Deal: ${lead.name}`,
                expected_value: lead.expected_value || 0,
                sales_id: selectedSalesId || null,
                client_id: clientId,
                contact_name: lead.name,
                customer_company: lead.client_company?.name || 'Perorangan',
                email: lead.email,
                whatsapp: lead.whatsapp,
                source: lead.source,
                input_date: new Date().toISOString().split('T')[0]
            }).select('id').single();

            if (dealError) throw dealError;

            // 3. Log Activity
            await supabase.from('log_activities').insert({
                deal_id: newDeal.id,
                user_id: userId,
                content: `Lead dikonversi menjadi Deal di pipeline ${currentPipeline?.name}`,
                activity_type: 'status_change',
            });

            // 4. Update the lead status instead of deleting
            await supabase.from('leads').update({ status: 'qualified', sales_id: selectedSalesId || null }).eq('id', lead.id);

            showToast('Berhasil mengonversi Lead menjadi Deal!', 'success');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast('Gagal mengonversi ke Deal: ' + err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Konversi Lead ke Deal"
            size="md"
            footer={
                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={onClose}>Batal</Button>
                    <Button
                        onClick={handleConvert}
                        isLoading={isProcessing || isLoading}
                        leftIcon={<CheckCircle2 size={16} />}
                        variant='primary'
                    >
                        Konversi Sekarang
                    </Button>
                </div>
            }
        >
            <div className="space-y-6 py-4">
                <div>
                    <H4 className="mb-1">Pilih Target Pipeline & Tahapan</H4>
                    <Subtext>Tentukan kemana deal ini akan dimasukkan dalam pipeline penjualan Anda.</Subtext>
                </div>

                <div className="space-y-4">
                    <ComboBox
                        label="Pilih Pipeline"
                        value={selectedPipelineId}
                        onChange={(val) => setSelectedPipelineId(val.toString())}
                        options={pipelines.map(p => ({ value: p.id.toString(), label: p.name }))}
                        leftIcon={<LayoutGrid size={16} />}
                    />

                    <ComboBox
                        label="Pilih Tahapan (Stage)"
                        value={selectedStageId}
                        onChange={(val) => setSelectedStageId(val.toString())}
                        options={currentStages.map(s => ({ value: s.id.toString(), label: s.name }))}
                        leftIcon={<Layers size={16} />}
                        disabled={!selectedPipelineId || currentStages.length === 0}
                    />

                    {selectedPipelineId && currentStages.length === 0 && !isLoading && (
                        <p className="text-xs text-rose-500 font-medium">Pipeline ini tidak memiliki tahapan. Silakan pilih pipeline lain.</p>
                    )}

                    <ComboBox
                        label="PIC Sales"
                        value={selectedSalesId}
                        onChange={(val) => setSelectedSalesId(val.toString())}
                        options={members.map(m => ({ value: m.user_id, label: m.profile?.full_name || 'Tanpa Nama' }))}
                        leftIcon={<User size={16} />}
                    />
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mt-6 font-bold">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={16} />
                        </div>
                        <div>
                            <Label className="text-blue-900 block mb-1">Konfirmasi Konversi</Label>
                            <p className="text-[11px] text-blue-700 leading-relaxed font-bold">
                                Data lead akan tetap tersimpan dan statusnya akan diperbarui menjadi 'Qualified'. Data client juga akan otomatis dibuat jika belum terdaftar.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
