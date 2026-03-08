import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Deal, ProjectPipeline, ProjectPipelineStage } from '@/lib/types';
import { Modal, Button, ComboBox, Label, H4, Subtext, ToastType } from '@/components/ui';
import { Briefcase, Layers, CheckCircle2 } from 'lucide-react';

interface ConvertDealToProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    deal: Deal;
    companyId: number;
    userId: string;
    onSuccess: () => void;
    setToast: (toast: { isOpen: boolean; message: string; type: ToastType }) => void;
}

export const ConvertDealToProjectModal: React.FC<ConvertDealToProjectModalProps> = ({
    isOpen,
    onClose,
    deal,
    companyId,
    userId,
    onSuccess,
    setToast
}) => {
    const [pipelines, setPipelines] = useState<ProjectPipeline[]>([]);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
    const [selectedStageId, setSelectedStageId] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchPipelines();
        }
    }, [isOpen]);

    const fetchPipelines = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('project_pipelines')
                .select('*, stages:project_pipeline_stages(*)')
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
            setToast({
                isOpen: true,
                message: 'Gagal memuat data pipeline proyek: ' + error.message,
                type: 'error'
            });
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
            setToast({
                isOpen: true,
                message: 'Silakan pilih pipeline proyek dan tahapan terlebih dahulu.',
                type: 'error'
            });
            return;
        }

        setIsProcessing(true);
        try {
            // 1. Create the Project
            const { data: newProject, error: projectError } = await supabase.from('projects').insert({
                company_id: companyId,
                pipeline_id: parseInt(selectedPipelineId),
                stage_id: selectedStageId,
                name: deal.name,
                client_id: deal.client_id,
                lead_id: deal.sales_id || userId,
                start_date: new Date().toISOString().split('T')[0],
                notes: deal.notes || `Dikonversi dari Deal: ${deal.name}`,
                custom_field_values: {}
            }).select('id').single();

            if (projectError) throw projectError;

            // 2. Log Activity in Deal
            await supabase.from('log_activities').insert({
                deal_id: deal.id,
                user_id: userId,
                content: `Deal dikonversi menjadi Proyek di pipeline ${currentPipeline?.name}`,
                activity_type: 'status_change',
            });

            // 3. Log Activity in Project
            await supabase.from('log_activities').insert({
                project_id: newProject.id,
                user_id: userId,
                content: `Proyek dibuat melalui konversi dari Deal: ${deal.name}`,
                activity_type: 'system',
            });

            // 4. Update deal status (optional, usually deleted in lead->deal, but deal->project might keep it as "Won")
            // Based on user request "mirip seperti leads convert to deals", let's assume it should be deleted or marked differently.
            // For now, let's delete to follow the exact pattern requested.
            await supabase.from('deals').delete().eq('id', deal.id);

            setToast({
                isOpen: true,
                message: 'Berhasil mengonversi Deal menjadi Proyek!',
                type: 'success',
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setToast({
                isOpen: true,
                message: 'Gagal mengonversi ke Proyek: ' + err.message,
                type: 'error',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Konversi Deal ke Proyek"
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
                    <H4 className="mb-1">Pilih Target Pipeline Proyek & Tahapan</H4>
                    <Subtext>Tentukan kemana proyek ini akan dimasukkan dalam pipeline pengerjaan Anda.</Subtext>
                </div>

                <div className="space-y-4">
                    <ComboBox
                        label="Pilih Pipeline Proyek"
                        value={selectedPipelineId}
                        onChange={(val) => setSelectedPipelineId(val.toString())}
                        options={pipelines.map(p => ({ value: p.id.toString(), label: p.name }))}
                        leftIcon={<Briefcase size={16} />}
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
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 mt-6">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={16} />
                        </div>
                        <div>
                            <Label className="text-emerald-900 block mb-1">Konfirmasi Konversi</Label>
                            <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                                Data deal akan dihapus dan dipindahkan menjadi Proyek baru. Seluruh data klien tetap terjaga.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
