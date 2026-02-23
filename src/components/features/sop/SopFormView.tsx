'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Sop, SopCategory, SopStep } from '@/lib/types';
import { 
  ArrowLeft, Save, Plus, Trash2, Loader2, BookMarked,
  List, Activity, ShieldCheck, Split,
  ArrowUp, ArrowDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea, Label, Select, Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui';

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
      alert("Judul dan Nomor Dokumen wajib diisi.");
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

      router.push('/dashboard/sops');
    } catch (err: any) {
      console.error("Save Error:", err);
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Menyiapkan Editor...</p>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-32">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-5">
           <Button 
             variant="ghost"
             onClick={() => router.back()} 
             className="!p-2 text-gray-400 hover:text-gray-900 border border-gray-100 rounded-xl hover:bg-gray-50 shadow-none"
           >
             <ArrowLeft size={20} />
           </Button>
           <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{sopId ? 'Edit Prosedur' : 'SOP Baru'}</h1>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{form.document_number || 'IDENTITAS DOKUMEN BARU'}</p>
           </div>
        </div>
        <div className="flex gap-3">
           <Button 
             variant="ghost"
             onClick={() => router.back()} 
             className="!px-5 !py-2.5 border border-gray-200 text-gray-500 hover:bg-gray-50 shadow-none"
           >
             Batal
           </Button>
           <Button 
             onClick={handleSave} 
             isLoading={isProcessing} 
             leftIcon={<Save size={14} />}
             className="!px-8 !py-2.5 shadow-lg shadow-blue-100"
           >
             Simpan SOP
           </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-10 py-10 space-y-16">
        <section className="space-y-8">
           <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><BookMarked size={18} /></div>
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight">Informasi Dasar Dokumen</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                 <Label className="uppercase tracking-widest ml-1">Judul SOP*</Label>
                 <Input type="text" value={form.title} onChange={(e: any) => setForm({...form, title: e.target.value})} className="!px-6 !py-4 font-bold text-sm shadow-sm" placeholder="Misal: Prosedur Pengadaan Barang" />
              </div>
              <div className="space-y-2">
                 <Label className="uppercase tracking-widest ml-1">Nomor Dokumen*</Label>
                 <Input type="text" value={form.document_number} onChange={(e: any) => setForm({...form, document_number: e.target.value})} className="!px-6 !py-4 font-bold text-sm shadow-sm" placeholder="Misal: SOP/PROC/001" />
              </div>
              <div className="space-y-2">
                 <Label className="uppercase tracking-widest ml-1">Kategori / Divisi</Label>
                 <Select value={form.category_id || ''} onChange={(e: any) => setForm({...form, category_id: e.target.value ? Number(e.target.value) : null})} className="!px-6 !py-4 font-bold text-sm shadow-sm">
                    <option value="">Pilih Kategori</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="uppercase tracking-widest ml-1">Revisi ke-</Label>
                    <Input type="number" value={form.revision_number} onChange={(e: any) => setForm({...form, revision_number: Number(e.target.value)})} className="!px-6 !py-4 font-bold text-sm shadow-sm" />
                 </div>
                 <div className="space-y-2">
                    <Label className="uppercase tracking-widest ml-1">Status Terbit</Label>
                    <Select value={form.status} onChange={(e: any) => setForm({...form, status: e.target.value as any})} className="!px-6 !py-4 font-bold text-sm shadow-sm">
                       <option value="Draft">Draft</option>
                       <option value="Approved">Approved / Active</option>
                    </Select>
                 </div>
              </div>
           </div>
        </section>

        <section className="space-y-8">
           <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><List size={18} /></div>
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight">Tujuan & Cakupan</h2>
           </div>
           <div className="grid grid-cols-1 gap-6">
              {[
                { id: 'purpose', label: 'I. Tujuan', placeholder: 'Menjelaskan alasan prosedur ini dibuat...' },
                { id: 'reference', label: 'II. Referensi', placeholder: 'Undang-undang, ISO, atau kebijakan internal...' },
                { id: 'scope', label: 'III. Ruang Lingkup', placeholder: 'Unit kerja atau divisi mana saja yang terlibat...' },
                { id: 'definition', label: 'IV. Definisi', placeholder: 'Istilah-istilah khusus dalam dokumen ini...' },
                { id: 'kpi_indicator', label: 'V. Indikator Kinerja (KPI)', placeholder: 'Target atau ukuran keberhasilan prosedur ini...' }
              ].map(field => (
                <div key={field.id} className="space-y-2">
                   <Label className="uppercase tracking-widest ml-1">{field.label}</Label>
                   <Textarea 
                    value={(form as any)[field.id] || ''} 
                    onChange={(e: any) => setForm({...form, [field.id]: e.target.value})} 
                    className="!px-6 !py-4 font-medium text-xs !h-28 shadow-sm"
                    placeholder={field.placeholder}
                   />
                </div>
              ))}
           </div>
        </section>

        <section className="space-y-8">
           <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Activity size={18} /></div>
                 <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight">Alur Proses (Diagram & Instruksi)</h2>
              </div>
              <Button 
                variant="ghost"
                onClick={handleAddStep} 
                leftIcon={<Plus size={14} />}
                className="!px-4 !py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-none"
              >
                Tambah Langkah Baru
              </Button>
           </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="border-collapse">
                   <TableHeader>
                      <TableRow className="bg-gray-50/50 border-b border-gray-100">
                         <TableCell isHeader className="w-12 !px-4 !py-4 text-[9px] text-center">No</TableCell>
                         <TableCell isHeader className="w-28 !px-4 !py-4 text-[9px] text-left">Shape</TableCell>
                         <TableCell isHeader className="w-40 !px-4 !py-4 text-[9px] text-left">Label Diagram</TableCell>
                         <TableCell isHeader className="w-40 !px-4 !py-4 text-[9px] text-left">Pelaksana</TableCell>
                         <TableCell isHeader className="!px-4 !py-4 text-[9px] text-left">Instruksi Kerja</TableCell>
                         <TableCell isHeader className="w-40 !px-4 !py-4 text-[9px] text-left">Dokumen Terkait</TableCell>
                         <TableCell isHeader className="w-32 !px-4 !py-4 text-[9px] text-left">Lanjut Ke</TableCell>
                         <TableCell isHeader className="w-28 !px-4 !py-4 text-[9px] text-center">Urutan</TableCell>
                         <TableCell isHeader className="w-12 !px-4 !py-4 border-l border-gray-100"></TableCell>
                      </TableRow>
                   </TableHeader>
                   <TableBody className="divide-y divide-gray-50">
                      {steps.map((step, idx) => {
                        const isSambungan = step.flow_type === 'sambungan';
                        const isAlurBaru = step.flow_type === 'alur_baru';
                        const isEnd = step.flow_type === 'end';
                        
                        return (
                          <React.Fragment key={idx}>
                            <TableRow className={`group transition-colors ${step.flow_type === 'sambungan' ? 'bg-amber-50/20' : step.flow_type === 'alur_baru' ? 'bg-blue-50/20' : isEnd ? 'bg-rose-50/20' : 'hover:bg-gray-50/30 shadow-none border-none'}`}>
                               <TableCell className="!px-4 !py-4 text-center">
                                  <span className="text-xs font-bold text-blue-600">{idx + 1}</span>
                               </TableCell>
                               <TableCell className="!px-4 !py-4">
                                  <Select 
                                    value={step.flow_type} 
                                    onChange={(e: any) => handleStepChange(idx, 'flow_type', e.target.value)}
                                    className="!px-2 !py-2 text-[10px] font-bold uppercase shadow-sm"
                                  >
                                      <option value="process">Proses</option>
                                      <option value="decision">Keputusan</option>
                                      <option value="sambungan">Sambungan</option>
                                      <option value="alur_baru">Alur Baru</option>
                                      <option value="end">Selesai</option>
                                  </Select>
                               </TableCell>
                               <TableCell className="!px-4 !py-4">
                                  <Input 
                                    type="text" 
                                    value={step.step_name} 
                                    onChange={(e: any) => handleStepChange(idx, 'step_name', e.target.value.toUpperCase())}
                                    disabled={isEnd}
                                    className={`!px-3 !py-2 text-[10px] font-bold shadow-sm ${isEnd ? 'opacity-20 bg-gray-50 cursor-not-allowed' : ''}`}
                                    placeholder={step.flow_type === 'sambungan' ? "Misal: A, B, C..." : step.flow_type === 'alur_baru' ? "Label Alur..." : isEnd ? "SELESAI" : "Label..."}
                                  />
                               </TableCell>
                               <TableCell className="!px-4 !py-4">
                                  <Input 
                                    type="text" 
                                    value={step.responsible_role} 
                                    onChange={(e: any) => handleStepChange(idx, 'responsible_role', e.target.value.toUpperCase())}
                                    disabled={isSambungan || isAlurBaru || isEnd}
                                    className={`!px-3 !py-2 text-[10px] font-bold shadow-sm ${(isSambungan || isAlurBaru || isEnd) ? 'opacity-20 bg-gray-50 cursor-not-allowed' : ''}`}
                                    placeholder="Role..."
                                  />
                               </TableCell>
                               <TableCell className="!px-4 !py-4">
                                  <Textarea 
                                    value={step.description} 
                                    onChange={(e: any) => handleStepChange(idx, 'description', e.target.value)}
                                    disabled={isSambungan || isAlurBaru || isEnd}
                                    className={`!px-3 !py-2 text-[10px] font-medium !min-h-[60px] shadow-sm ${(isSambungan || isAlurBaru || isEnd) ? 'opacity-20 bg-gray-50 cursor-not-allowed' : ''}`}
                                    placeholder="Deskripsi instruksi..."
                                  />
                               </TableCell>
                               <TableCell className="!px-4 !py-4">
                                  <Input 
                                    type="text" 
                                    value={step.related_documents || ''} 
                                    onChange={(e: any) => handleStepChange(idx, 'related_documents', e.target.value)}
                                    disabled={isSambungan || isAlurBaru || isEnd}
                                    className={`!px-3 !py-2 text-[10px] font-bold shadow-sm ${(isSambungan || isAlurBaru || isEnd) ? 'opacity-20 bg-gray-50 cursor-not-allowed' : ''}`}
                                    placeholder="Formulir/Log..."
                                  />
                               </TableCell>
                               <TableCell className="!px-4 !py-4">
                                  {(step.flow_type === 'process' || step.flow_type === 'start' || step.flow_type === 'sambungan' || step.flow_type === 'alur_baru') ? (
                                    <Select 
                                      value={step.next_target_step === -1 ? 'finish' : (step.next_target_step || '')} 
                                      onChange={(e: any) => {
                                        const val = e.target.value;
                                        handleStepChange(idx, 'next_target_step', val === 'finish' ? -1 : (val ? Number(val) : null));
                                      }}
                                      className="!px-2 !py-2 text-[10px] font-bold shadow-sm"
                                    >
                                        <option value="">Otomatis (Urutan)</option>
                                        {steps.map((s, i) => {
                                          if (i === idx) return null;
                                          
                                          // Khusus shape sambungan, muncul pilihan shape proses
                                          const isCurrentSambungan = step.flow_type === 'sambungan';
                                          const isTargetProcess = s.flow_type === 'process';
                                          const isTargetConnectorOrEnd = s.flow_type === 'sambungan' || s.flow_type === 'alur_baru' || s.flow_type === 'end';
                                          
                                          const isMatch = isCurrentSambungan ? isTargetProcess : isTargetConnectorOrEnd;
                                          
                                          if (!isMatch && s.flow_type !== 'end') return null;
 
                                          return (
                                            <option key={i} value={i + 1}>
                                              #{i + 1} {s.step_name || (s.flow_type === 'end' ? 'SELESAI' : s.flow_type === 'alur_baru' ? 'ALUR BARU' : s.flow_type === 'sambungan' ? 'SAMBUNGAN' : 'PROSES')}
                                            </option>
                                          );
                                        })}
                                        <option value="finish"># SELESAI (TERMINAL)</option>
                                    </Select>
                                  ) : isEnd ? (
                                    <div className="text-[8px] font-bold text-rose-300 uppercase italic text-center">Terminal</div>
                                  ) : (
                                    <div className="text-[8px] font-bold text-gray-300 uppercase italic text-center">See branching</div>
                                  )}
                               </TableCell>
                               <TableCell className="!px-4 !py-4">
                                  <div className="flex items-center justify-center gap-1">
                                     <Button 
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleMoveStep(idx, 'up')} 
                                      disabled={idx === 0}
                                      className="!p-2 border border-gray-100 rounded-lg text-gray-400 hover:text-blue-600 shadow-sm"
                                     >
                                        <ArrowUp size={14} />
                                     </Button>
                                     <Button 
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleMoveStep(idx, 'down')} 
                                      disabled={idx === steps.length - 1}
                                      className="!p-2 border border-gray-100 rounded-lg text-gray-400 hover:text-blue-600 shadow-sm"
                                     >
                                        <ArrowDown size={14} />
                                     </Button>
                                  </div>
                               </TableCell>
                               <TableCell className="!px-4 !py-4 border-l border-gray-100">
                                  <Button 
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveStep(idx)}
                                    className="!p-2 text-rose-300 hover:text-rose-600 shadow-none"
                                  >
                                     <Trash2 size={16} />
                                  </Button>
                               </TableCell>
                            </TableRow>
 
                            {step.flow_type === 'decision' && (
                              <TableRow className="bg-indigo-50/20 border-b border-indigo-50 shadow-none hover:bg-indigo-50/30 transition-colors">
                                 <TableCell className="!px-4 !py-3"></TableCell>
                                 <TableCell colSpan={7} className="!px-4 !py-3">
                                    <div className="flex items-center gap-8">
                                       <div className="flex items-center gap-2 shrink-0">
                                          <Split size={14} className="text-indigo-600" />
                                          <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest">Branching Logic:</span>
                                       </div>
                                       <div className="flex-1 grid grid-cols-2 gap-6">
                                          <div className="flex items-center gap-3">
                                             <span className="text-[9px] font-bold text-emerald-500 uppercase shrink-0">Jika YA:</span>
                                             <Select 
                                              value={step.yes_target_step === -1 ? 'finish' : (step.yes_target_step || '')} 
                                              onChange={(e: any) => {
                                                const val = e.target.value;
                                                handleStepChange(idx, 'yes_target_step', val === 'finish' ? -1 : (val ? Number(val) : null));
                                              }}
                                              className="flex-1 !px-3 !py-1.5 text-[10px] font-bold"
                                             >
                                                <option value="">Otomatis (Urutan)</option>
                                                {steps.map((s, i) => (i !== idx && (s.flow_type === 'sambungan' || s.flow_type === 'alur_baru' || s.flow_type === 'end')) && (
                                                   <option key={i} value={i + 1}>#{i + 1} {s.step_name || (s.flow_type === 'end' ? 'SELESAI' : s.flow_type === 'alur_baru' ? 'ALUR BARU' : 'SAMBUNGAN')}</option>
                                                ))}
                                                <option value="finish"># SELESAI (TERMINAL)</option>
                                             </Select>
                                          </div>
                                          <div className="flex items-center gap-3">
                                             <span className="text-[9px] font-bold text-rose-500 uppercase shrink-0">Jika TIDAK:</span>
                                             <Select 
                                              value={step.no_target_step === -1 ? 'finish' : (step.no_target_step || '')} 
                                              onChange={(e: any) => {
                                                const val = e.target.value;
                                                handleStepChange(idx, 'no_target_step', val === 'finish' ? -1 : (val ? Number(val) : null));
                                              }}
                                              className="flex-1 !px-3 !py-1.5 text-[10px] font-bold"
                                             >
                                                <option value="">Otomatis (Urutan)</option>
                                                {steps.map((s, i) => (i !== idx && (s.flow_type === 'sambungan' || s.flow_type === 'alur_baru' || s.flow_type === 'end')) && (
                                                   <option key={i} value={i + 1}>#{i + 1} {s.step_name || (s.flow_type === 'end' ? 'SELESAI' : s.flow_type === 'alur_baru' ? 'ALUR BARU' : 'SAMBUNGAN')}</option>
                                                ))}
                                                <option value="finish"># SELESAI (TERMINAL)</option>
                                             </Select>
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
              <div className="p-6 bg-gray-50/30 flex justify-center">
                 <Button 
                   variant="ghost"
                   onClick={handleAddStep} 
                   leftIcon={<Plus size={16} />}
                   className="!px-8 !py-3 border border-gray-200 !rounded-2xl text-blue-600 hover:border-blue-600 transition-all shadow-sm bg-white"
                 >
                    Sisipkan Langkah Di Akhir
                 </Button>
              </div>
            </div>
        </section>

        <section className="space-y-8">
           <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><ShieldCheck size={18} /></div>
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight">Otorisasi & Pengesahan</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                 <Label className="uppercase tracking-widest ml-1">Disiapkan Oleh</Label>
                 <Input type="text" value={form.prepared_by} onChange={(e: any) => setForm({...form, prepared_by: e.target.value})} className="!px-5 !py-4 font-bold text-xs" placeholder="Nama / Jabatan" />
              </div>
              <div className="space-y-2">
                 <Label className="uppercase tracking-widest ml-1">Diperiksa Oleh</Label>
                 <Input type="text" value={form.checked_by} onChange={(e: any) => setForm({...form, checked_by: e.target.value})} className="!px-5 !py-4 font-bold text-xs" placeholder="Nama / Jabatan" />
              </div>
              <div className="space-y-2">
                 <Label className="uppercase tracking-widest ml-1">Disahkan Oleh</Label>
                 <Input type="text" value={form.approved_by} onChange={(e: any) => setForm({...form, approved_by: e.target.value})} className="!px-5 !py-4 font-bold text-xs" placeholder="Nama / Jabatan" />
              </div>
           </div>
        </section>
      </div>
    </div>
  );
};
