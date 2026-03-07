'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { Input, Textarea, Button, Table, TableHeader, TableBody, TableRow, TableCell, H1, H2, Subtext, Label, ComboBox, Card, SectionHeader, Breadcrumb, Modal, Toast, ToastType } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, Sop, SopCategory, SopStep } from '@/lib/types';
import {
  ArrowLeft, Save, Plus, Trash2, Loader2, BookMarked,
  List, Activity, ShieldCheck, Split,
  ArrowUp, ArrowDown
} from 'lucide-react';
import { ActionButton } from '@/components/shared/buttons/ActionButton';
import { useRouter } from 'next/navigation';

interface Props {
  company: Company;
  sopId?: number;
}

export const SopFormView: React.FC<Props> = ({ company, sopId }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<SopCategory[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [form, setForm] = useState<Partial<Sop>>({
    title: '', document_number: '', category_id: null,
    purpose: '', reference: '', scope: '', definition: '', kpi_indicator: '',
    prepared_by: '', checked_by: '', approved_by: '',
    revision_number: 0, status: 'Draft'
  });

  const [steps, setSteps] = useState<SopStep[]>([
    { sort_order: 1, flow_type: 'process', step_name: '', responsible_role: '', description: '', related_documents: '' }
  ]);

  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  const [activeInstructionIdx, setActiveInstructionIdx] = useState<number | null>(null);
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cats } = await supabase.from('sop_categories').select('*').eq('company_id', company.id).order('name');
      if (cats) setCategories(cats);

      if (sopId) {
        const { data: sop, error } = await supabase
          .from('sops')
          .select('*, sop_steps(*)')
          .eq('id', sopId)
          .single();

        if (sop) {
          setForm(sop);
          if (sop.sop_steps && sop.sop_steps.length > 0) {
            const contentSteps = sop.sop_steps
              .filter((s: any) => s.flow_type !== 'start')
              .sort((a: any, b: any) => a.sort_order - b.sort_order);

            if (contentSteps.length > 0) {
              setSteps(contentSteps.map((s: any, i: number) => ({ ...s, sort_order: i + 1 })));
            }
          }
        }
      }
    } catch (err) {
      console.error("Error loading SOP data:", err);
    } finally {
      setLoading(false);
    }
  }, [company.id, sopId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddStep = () => {
    setSteps([...steps, {
      sort_order: steps.length + 1,
      flow_type: 'process',
      step_name: '',
      responsible_role: '',
      description: '',
      related_documents: ''
    }]);
  };

  const handleRemoveStep = (idx: number) => {
    if (steps.length <= 1) return;
    const newSteps = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sort_order: i + 1 }));
    setSteps(newSteps);
  };

  const handleStepChange = (idx: number, field: keyof SopStep, value: any) => {
    const newSteps = [...steps];
    newSteps[idx] = { ...newSteps[idx], [field]: value };
    setSteps(newSteps);
  };

  const handleMoveStep = (idx: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === steps.length - 1)) return;

    const newSteps = [...steps];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;

    [newSteps[idx], newSteps[targetIdx]] = [newSteps[targetIdx], newSteps[idx]];

    const reordered = newSteps.map((s, i) => ({ ...s, sort_order: i + 1 }));
    setSteps(reordered);
  };

  const handleSave = async () => {
    if (!form.title || !form.document_number) {
      setToast({ isOpen: true, message: "Judul dan Nomor Dokumen wajib diisi.", type: 'error' });
      return;
    }

    setIsProcessing(true);
    try {
      const sopPayload: any = {
        company_id: company.id,
        category_id: form.category_id,
        title: form.title,
        document_number: form.document_number,
        purpose: form.purpose,
        reference: form.reference,
        scope: form.scope,
        definition: form.definition,
        kpi_indicator: form.kpi_indicator,
        prepared_by: form.prepared_by,
        checked_by: form.checked_by,
        approved_by: form.approved_by,
        revision_number: form.revision_number || 0,
        status: form.status || 'Draft',
        revision_date: new Date().toISOString().split('T')[0]
      };

      let currentSopId = sopId;

      if (currentSopId) {
        const { error: updateErr } = await supabase.from('sops').update(sopPayload).eq('id', currentSopId);
        if (updateErr) throw updateErr;
        const { error: delErr = null } = await supabase.from('sop_steps').delete().eq('sop_id', currentSopId);
        if (delErr) throw delErr;
      } else {
        const { data: newData, error: insertErr } = await supabase.from('sops').insert(sopPayload).select().single();
        if (insertErr) throw insertErr;
        currentSopId = newData.id;
      }

      const stepsToInsert = steps.map(s => {
        const { id: _, created_at: __, ...cleanStep } = s as any;
        return {
          ...cleanStep,
          sop_id: currentSopId
        };
      });

      if (stepsToInsert.length > 0) {
        const { error: stepsErr } = await supabase.from('sop_steps').insert(stepsToInsert);
        if (stepsErr) throw stepsErr;
      }

      const successParam = sopId ? 'updated' : 'created';
      router.push(`/dashboard/sops?success=${successParam}`);
    } catch (err: any) {
      console.error("Save Error:", err);
      setToast({ isOpen: true, message: "Gagal menyimpan: " + err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <Subtext className="text-xs  uppercase  text-gray-400">Menyiapkan Editor...</Subtext>
      </div>
    );
  }

  return (
    <div className="bg-[#F9FAFB] min-h-screen pb-24 font-sans relative">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-10 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="!p-2 text-gray-400 hover:text-gray-900 border border-gray-100 lg:flex hidden"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <Breadcrumb
                items={[
                  { label: 'SOP' },
                  { label: sopId ? 'Edit Prosedur' : 'SOP Baru', active: true }
                ]}
              />
              <Subtext className="text-[11px] font-medium text-blue-600 uppercase  mt-0.5">{form.document_number || 'IDENTITAS DOKUMEN BARU'}</Subtext>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.back()} className="text-gray-500">Batal</Button>
            <Button
              onClick={handleSave}
              isLoading={isProcessing}
              leftIcon={<Save size={16} />}
              variant="primary"
            >
              {sopId ? 'Update SOP' : 'Simpan SOP'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-10 py-8 space-y-6">
        <Card className="p-8">
          <SectionHeader
            icon={<BookMarked size={18} />}
            title="Informasi Dasar Dokumen"
            className="mb-8"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-1.5">
              <Label className="ml-1 ">Judul SOP*</Label>
              <Input type="text" value={form.title} onChange={(e: any) => setForm({ ...form, title: e.target.value })} className="!py-3" placeholder="Misal: Prosedur Pengadaan Barang" />
            </div>
            <div className="space-y-1.5">
              <Label className="ml-1 ">Nomor Dokumen*</Label>
              <Input type="text" value={form.document_number} onChange={(e: any) => setForm({ ...form, document_number: e.target.value })} className="!py-3" placeholder="Misal: SOP/PROC/001" />
            </div>
            <div className="space-y-1.5">
              <ComboBox
                label="Kategori / Divisi"
                value={form.category_id || ''}
                onChange={(val: string | number) => setForm({ ...form, category_id: val ? Number(val) : null })}
                options={[
                  ...categories.map(c => ({ value: c.id.toString(), label: c.name }))
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="ml-1 ">Revisi ke-</Label>
                <Input type="number" value={form.revision_number} onChange={(e: any) => setForm({ ...form, revision_number: Number(e.target.value) })} className="!py-3" />
              </div>
              <div className="space-y-1.5">
                <ComboBox
                  label="Status Terbit"
                  hideSearch
                  value={form.status || 'Draft'}
                  onChange={(val: string | number) => setForm({ ...form, status: val as any })}
                  options={[
                    { value: 'Draft', label: 'Draft' },
                    { value: 'Approved', label: 'Approved / Active' },
                  ]}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <SectionHeader
            icon={<List size={18} />}
            title="Tujuan & Cakupan"
            className="mb-8"
          />
          <div className="grid grid-cols-1 gap-6">
            {[
              { id: 'purpose', label: 'I. Tujuan', placeholder: 'Menjelaskan alasan prosedur ini dibuat...' },
              { id: 'reference', label: 'II. Referensi', placeholder: 'Undang-undang, ISO, atau kebijakan internal...' },
              { id: 'scope', label: 'III. Ruang Lingkup', placeholder: 'Unit kerja atau divisi mana saja yang terlibat...' },
              { id: 'definition', label: 'IV. Definisi', placeholder: 'Istilah-istilah khusus dalam dokumen ini...' },
              { id: 'kpi_indicator', label: 'V. Indikator Kinerja (KPI)', placeholder: 'Target atau ukuran keberhasilan prosedur ini...' }
            ].map(field => (
              <div key={field.id} className="space-y-1.5">
                <Label className="ml-1 ">{field.label}</Label>
                <Textarea
                  value={(form as any)[field.id] || ''}
                  onChange={(e: any) => setForm({ ...form, [field.id]: e.target.value })}
                  className="!px-4 !py-3 font-medium text-sm !h-28"
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-8">
          <div className="flex items-center justify-between mb-8">
            <SectionHeader
              icon={<Activity size={18} />}
              title="Alur Proses (Diagram & Instruksi)"
              className="!mb-0"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddStep}
              leftIcon={<Plus size={14} />}
            >
              Tambah Langkah Baru
            </Button>
          </div>

          <div className="overflow-visible w-full">
            <div className="overflow-x-auto">
              <Table className="overflow-visible min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader className="w-12 py-3 text-[10px] text-center">No</TableCell>
                    <TableCell isHeader className="w-28 py-3 text-[10px] text-left">Shape</TableCell>
                    <TableCell isHeader className="w-40 py-3 text-[10px] text-left">Label Diagram</TableCell>
                    <TableCell isHeader className="w-40 py-3 text-[10px] text-left">Pelaksana</TableCell>
                    <TableCell isHeader className="py-3 text-[10px] text-left">Instruksi Kerja</TableCell>
                    <TableCell isHeader className="w-40 py-3 text-[10px] text-left">Dokumen Terkait</TableCell>
                    <TableCell isHeader className="w-32 py-3 text-[10px] text-left">Lanjut Ke</TableCell>
                    <TableCell isHeader className="w-28 py-3 text-[10px] text-center">Urutan</TableCell>
                    <TableCell isHeader className="w-12 py-3"></TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {steps.map((step, idx) => {
                    const isSambungan = step.flow_type === 'sambungan';
                    const isAlurBaru = step.flow_type === 'alur_baru';
                    const isEnd = step.flow_type === 'end';

                    return (
                      <React.Fragment key={idx}>
                        <TableRow className={`group transition-colors ${step.flow_type === 'sambungan' ? 'bg-amber-50/20' : step.flow_type === 'alur_baru' ? 'bg-blue-50/20' : isEnd ? 'bg-rose-50/20' : 'hover:bg-gray-50/30 shadow-none border-none'}`}>
                          <TableCell className="!px-4 !py-4 text-center">
                            <Label className="text-xs  text-blue-600">{idx + 1}</Label>
                          </TableCell>
                          <TableCell className="!px-4 !py-4">
                            <ComboBox
                              value={step.flow_type}
                              onChange={(val: string | number) => handleStepChange(idx, 'flow_type', val.toString())}
                              options={[
                                { value: 'process', label: 'Proses' },
                                { value: 'decision', label: 'Keputusan' },
                                { value: 'sambungan', label: 'Sambungan' },
                                { value: 'alur_baru', label: 'Alur Baru' },
                                { value: 'end', label: 'Selesai' },
                              ]}
                            />
                          </TableCell>
                          <TableCell className="!px-4 !py-4">
                            <Input
                              type="text"
                              value={step.step_name}
                              onChange={(e: any) => handleStepChange(idx, 'step_name', e.target.value.toUpperCase())}
                              disabled={isEnd}
                              className={`!px-3 !py-2 text-[10px]  ${isEnd ? 'opacity-20 bg-gray-50 cursor-not-allowed' : ''}`}
                              placeholder={step.flow_type === 'sambungan' ? "Misal: A, B, C..." : step.flow_type === 'alur_baru' ? "Label Alur..." : isEnd ? "SELESAI" : "Label..."}
                            />
                          </TableCell>
                          <TableCell className="!px-4 !py-4">
                            <Input
                              type="text"
                              value={step.responsible_role}
                              onChange={(e: any) => handleStepChange(idx, 'responsible_role', e.target.value.toUpperCase())}
                              disabled={isSambungan || isAlurBaru || isEnd}
                              className={`!px-3 !py-2 text-[10px]  ${(isSambungan || isAlurBaru || isEnd) ? 'opacity-20 bg-gray-50 cursor-not-allowed' : ''}`}
                              placeholder="Role..."
                            />
                          </TableCell>
                          <TableCell className="!px-4 !py-4">
                            <Button
                              variant="ghost"
                              onClick={() => {
                                if (isSambungan || isAlurBaru || isEnd) return;
                                setActiveInstructionIdx(idx);
                                setIsInstructionModalOpen(true);
                              }}
                              disabled={isSambungan || isAlurBaru || isEnd}
                              className={`w-full justify-start !px-3 !py-2 text-[10px] font-medium min-h-[40px] h-auto border border-gray-200 !rounded-md whitespace-normal text-left items-start ${(isSambungan || isAlurBaru || isEnd) ? 'opacity-20 bg-gray-50 cursor-not-allowed hover:bg-gray-50' : 'bg-white hover:bg-indigo-50/50 hover:border-indigo-200'}`}
                            >
                              {step.description ? (
                                <span className="line-clamp-2 leading-relaxed text-gray-700">{step.description}</span>
                              ) : (
                                <span className="text-gray-400">Deskripsi...</span>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="!px-4 !py-4">
                            <Input
                              type="text"
                              value={step.related_documents || ''}
                              onChange={(e: any) => handleStepChange(idx, 'related_documents', e.target.value)}
                              disabled={isSambungan || isAlurBaru || isEnd}
                              className={`!px-3 !py-2 text-[10px]  ${(isSambungan || isAlurBaru || isEnd) ? 'opacity-20 bg-gray-50 cursor-not-allowed' : ''}`}
                              placeholder="Formulir/Log..."
                            />
                          </TableCell>
                          <TableCell className="!px-4 !py-4">
                            {(step.flow_type === 'process' || step.flow_type === 'start' || step.flow_type === 'sambungan' || step.flow_type === 'alur_baru') ? (
                              <ComboBox
                                hideSearch
                                value={step.next_target_step === -1 ? 'finish' : (step.next_target_step || '')}
                                onChange={(val: string | number) => {
                                  handleStepChange(idx, 'next_target_step', val === 'finish' ? -1 : (val ? Number(val) : null));
                                }}
                                options={[
                                  { value: '', label: 'Otomatis (Urutan)' },
                                  ...steps.map((s, i) => {
                                    if (i === idx) return null;
                                    const isCurrentSambungan = step.flow_type === 'sambungan';
                                    const isTargetProcess = s.flow_type === 'process';
                                    const isTargetConnectorOrEnd = s.flow_type === 'sambungan' || s.flow_type === 'alur_baru' || s.flow_type === 'end';
                                    const isMatch = isCurrentSambungan ? isTargetProcess : isTargetConnectorOrEnd;
                                    if (!isMatch && s.flow_type !== 'end') return null;
                                    return {
                                      value: (i + 1).toString(),
                                      label: `#${i + 1} ${s.step_name || (s.flow_type === 'end' ? 'SELESAI' : s.flow_type === 'alur_baru' ? 'ALUR BARU' : s.flow_type === 'sambungan' ? 'SAMBUNGAN' : 'PROSES')}`
                                    };
                                  }).filter(Boolean) as any,
                                  { value: 'finish', label: '# SELESAI (TERMINAL)' }
                                ]}
                              />
                            ) : isEnd ? (
                              <div className="text-[8px]  text-rose-300 uppercase italic text-center">Terminal</div>
                            ) : (
                              <div className="text-[8px]  text-gray-300 uppercase italic text-center">See branching</div>
                            )}
                          </TableCell>
                          <TableCell className="!px-4 !py-4">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveStep(idx, 'up')}
                                disabled={idx === 0}
                                className="!p-2 border border-gray-100 rounded-lg text-gray-400 hover:text-blue-600"
                              >
                                <ArrowUp size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveStep(idx, 'down')}
                                disabled={idx === steps.length - 1}
                                className="!p-2 border border-gray-100 rounded-lg text-gray-400 hover:text-blue-600"
                              >
                                <ArrowDown size={14} />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="!px-4 !py-4 border-l border-gray-100">
                            <ActionButton
                              icon={Trash2}
                              variant="rose"
                              onClick={() => handleRemoveStep(idx)}
                              title="Hapus"
                            />
                          </TableCell>
                        </TableRow>

                        {step.flow_type === 'decision' && (
                          <TableRow className="bg-indigo-50/20 border-b border-indigo-50 shadow-none hover:bg-indigo-50/30 transition-colors">
                            <TableCell className="!px-4 !py-3"></TableCell>
                            <TableCell colSpan={7} className="!px-4 !py-3">
                              <div className="flex items-center gap-8">
                                <div className="flex items-center gap-2 shrink-0">
                                  <Split size={14} className="text-indigo-600" />
                                  <Label className="text-[10px]  text-indigo-900 uppercase ">Branching Logic:</Label>
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-6">
                                  <div className="flex items-center gap-3">
                                    <Label className="text-[9px]  text-emerald-500 uppercase shrink-0">Jika YA:</Label>
                                    <ComboBox
                                      value={step.yes_target_step === -1 ? 'finish' : (step.yes_target_step || '')}
                                      onChange={(val: string | number) => {
                                        handleStepChange(idx, 'yes_target_step', val === 'finish' ? -1 : (val ? Number(val) : null));
                                      }}
                                      options={[
                                        { value: '', label: 'Otomatis (Urutan)' },
                                        ...steps.map((s, i) => {
                                          if (i === idx) return null;
                                          if (!(s.flow_type === 'sambungan' || s.flow_type === 'alur_baru' || s.flow_type === 'end')) return null;
                                          return {
                                            value: (i + 1).toString(),
                                            label: `#${i + 1} ${s.step_name || (s.flow_type === 'end' ? 'SELESAI' : s.flow_type === 'alur_baru' ? 'ALUR BARU' : 'SAMBUNGAN')}`
                                          };
                                        }).filter(Boolean) as any,
                                        { value: 'finish', label: '# SELESAI (TERMINAL)' }
                                      ]}
                                    />
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Label className="text-[9px]  text-rose-500 uppercase shrink-0">Jika TIDAK:</Label>
                                    <ComboBox
                                      value={step.no_target_step === -1 ? 'finish' : (step.no_target_step || '')}
                                      onChange={(val: string | number) => {
                                        handleStepChange(idx, 'no_target_step', val === 'finish' ? -1 : (val ? Number(val) : null));
                                      }}
                                      options={[
                                        { value: '', label: 'Otomatis (Urutan)' },
                                        ...steps.map((s, i) => {
                                          if (i === idx) return null;
                                          if (!(s.flow_type === 'sambungan' || s.flow_type === 'alur_baru' || s.flow_type === 'end')) return null;
                                          return {
                                            value: (i + 1).toString(),
                                            label: `#${i + 1} ${s.step_name || (s.flow_type === 'end' ? 'SELESAI' : s.flow_type === 'alur_baru' ? 'ALUR BARU' : 'SAMBUNGAN')}`
                                          };
                                        }).filter(Boolean) as any,
                                        { value: 'finish', label: '# SELESAI (TERMINAL)' }
                                      ]}
                                    />
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="border-l border-indigo-50/50"></TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Button onClick={handleAddStep} variant="ghost" size="sm" leftIcon={<Plus size={14} />} className="!text-[#4F46E5] hover:bg-indigo-50 font-bold  uppercase text-[10px]">
                Sisipkan Langkah Di Akhir
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <SectionHeader
            icon={<ShieldCheck size={18} />}
            title="Otorisasi & Pengesahan"
            className="mb-8"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
            <div className="space-y-1.5">
              <Label className="ml-1 ">Disiapkan Oleh</Label>
              <Input type="text" value={form.prepared_by} onChange={(e: any) => setForm({ ...form, prepared_by: e.target.value })} className="!py-3" placeholder="Nama / Jabatan" />
            </div>
            <div className="space-y-1.5">
              <Label className="ml-1 ">Diperiksa Oleh</Label>
              <Input type="text" value={form.checked_by} onChange={(e: any) => setForm({ ...form, checked_by: e.target.value })} className="!py-3" placeholder="Nama / Jabatan" />
            </div>
            <div className="space-y-1.5">
              <Label className="ml-1 ">Disahkan Oleh</Label>
              <Input type="text" value={form.approved_by} onChange={(e: any) => setForm({ ...form, approved_by: e.target.value })} className="!py-3" placeholder="Nama / Jabatan" />
            </div>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={isInstructionModalOpen}
        onClose={() => setIsInstructionModalOpen(false)}
        title="Instruksi Kerja"
        size="md"
        footer={
          <Button onClick={() => setIsInstructionModalOpen(false)} variant="primary" leftIcon={<Save size={14} />}>
            Selesai
          </Button>
        }
      >
        <div className="space-y-4 pb-4">
          <Label className="uppercase  ml-1 text-gray-400 text-xs">Deskripsi Detail Instruksi Kerja</Label>
          <Textarea
            value={activeInstructionIdx !== null ? steps[activeInstructionIdx]?.description || '' : ''}
            onChange={(e: any) => {
              if (activeInstructionIdx !== null) {
                handleStepChange(activeInstructionIdx, 'description', e.target.value);
              }
            }}
            className="!px-4 !py-3 font-medium text-sm !min-h-[240px] w-full"
            placeholder="Ketikkan deskripsi instruksi kerja secara detail..."
            autoFocus
          />
        </div>
      </Modal>

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
