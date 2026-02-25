'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Button, Table, TableHeader, TableBody, TableRow, TableCell, H1, Subtext, Label } from '@/components/ui';


import { supabase } from '@/lib/supabase';
import { Company, Sop, SopStep } from '@/lib/types';
import {
  ArrowLeft, Loader2, Edit, RefreshCw, Printer,
  User, Layers, Target, FileText, ArrowDown,
  ArrowRight, ArrowLeft as ArrowLeftIcon, ShieldCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRouter } from 'next/navigation';

interface Props {
  company: Company;
  sopId: number;
}

const FlowShape: React.FC<{
  type: string,
  label: string,
  displayNumber: number | null,
  size?: 'sm' | 'md',
  onClick?: () => void
}> = ({ type, label, displayNumber, size = 'md', onClick }) => {
  const displayLabel = label || (type === 'start' ? 'MULAI' : type === 'end' ? 'SELESAI' : `PROSES`);
  const isConnector = type === 'sambungan' || type === 'alur_baru';

  const NumberBadge = displayNumber !== null ? (
    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full border border-gray-900 bg-white flex items-center justify-center z-20 shadow-sm">
      <Label className="text-[8px]  text-gray-900">{displayNumber}</Label>
    </div>
  ) : null;

  if (type === 'start' || type === 'end') {
    return (
      <div className="relative flex flex-col items-center">
        {NumberBadge}
        <div className="w-24 h-10 border border-gray-900 rounded-full flex items-center justify-center text-[8px]  uppercase tracking-tight bg-white px-2 text-center shadow-sm">
          {displayLabel}
        </div>
      </div>
    );
  }
  if (type === 'decision') {
    const isLong = (displayLabel || '').length > 12;
    const sideClass = isLong ? 'w-24 h-24' : 'w-16 h-16';
    const textClass = isLong ? 'text-[7px]' : 'text-[8px]';

    return (
      <div className="relative flex flex-col items-center">
        {NumberBadge}
        <div className={`${sideClass} border border-gray-900 rotate-45 flex items-center justify-center bg-white shadow-sm`}>
          <div className={`-rotate-45 ${textClass}  uppercase text-center px-2 leading-tight break-words max-w-[85%]`}>
            {displayLabel}
          </div>
        </div>
      </div>
    );
  }
  if (isConnector) {
    return (
      <div
        onClick={onClick}
        className={`relative flex flex-col items-center ${onClick ? 'cursor-pointer group/conn' : ''}`}
      >
        <div className={`w-8 h-8 border border-gray-900 rounded-full flex items-center justify-center text-[9px]  bg-white shadow-sm uppercase px-1 text-center transition-all ${onClick ? 'group-hover/conn:bg-blue-600 group-hover/conn:text-white group-hover/conn:scale-110 group-active/conn:scale-95' : ''}`}>
          {displayLabel}
        </div>
      </div>
    );
  }
  return (
    <div className="relative flex flex-col items-center">
      {NumberBadge}
      <div className="w-28 h-12 border border-gray-900 flex items-center justify-center text-[8px]  uppercase text-center bg-white shadow-sm px-2 leading-tight">
        {displayLabel}
      </div>
    </div>
  );
};

export const SopDetailView: React.FC<Props> = ({ company, sopId }) => {
  const router = useRouter();
  const [sop, setSop] = useState<Sop | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSop = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sops')
        .select('*, sop_steps(*), sop_categories(*)')
        .eq('id', sopId)
        .single();

      if (data) {
        const sortedSteps = (data.sop_steps || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order);

        data.sop_steps = sortedSteps;
        setSop(data as any);
      }
    } finally {
      setLoading(false);
    }
  }, [sopId]);

  useEffect(() => {
    fetchSop();
  }, [fetchSop]);

  const contentSteps = useMemo(() => {
    return sop?.sop_steps?.filter(s => s.flow_type !== 'start' && s.flow_type !== 'sambungan') || [];
  }, [sop?.sop_steps]);

  const stepDisplayNumbers = useMemo(() => {
    let currentNum = 1;
    return contentSteps.map((s) => {
      if (s.flow_type === 'end' || s.flow_type === 'alur_baru') {
        return null;
      }
      return currentNum++;
    });
  }, [contentSteps]);

  const handleRevision = async () => {
    if (!sop) return;
    setIsProcessing(true);
    try {
      const newSop = {
        ...sop,
        revision_number: (sop.revision_number || 0) + 1,
        status: 'Draft',
        is_archived: false,
        revision_date: new Date().toISOString().split('T')[0]
      };
      delete (newSop as any).id;
      delete (newSop as any).sop_steps;
      delete (newSop as any).created_at;
      delete (newSop as any).sop_categories;

      const { data: savedNew, error: parentErr } = await supabase.from('sops').insert(newSop).select().single();
      if (parentErr) throw parentErr;

      const newSteps = sop.sop_steps?.map(s => {
        const ns = { ...s, sop_id: savedNew.id };
        delete (ns as any).id;
        delete (ns as any).created_at;
        return ns;
      }) || [];

      if (newSteps.length > 0) {
        await supabase.from('sop_steps').insert(newSteps);
      }

      router.push(`/dashboard/sops/${savedNew.id}/edit`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!sop) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    const drawHeader = (d: jsPDF, pageNum: number) => {
      d.setDrawColor(0); d.setLineWidth(0.2);
      d.rect(10, 10, pageWidth - 20, 25);
      d.line(pageWidth - 70, 10, pageWidth - 70, 35);
      d.line(pageWidth - 70, 18, pageWidth - 10, 18);
      d.line(pageWidth - 70, 26, pageWidth - 10, 26);
      d.line(pageWidth - 40, 26, pageWidth - 40, 35);

      d.setFontSize(12); d.setFont('helvetica', 'bold');
      d.text(company.name.toUpperCase(), 15, 20);
      d.setFontSize(14);
      d.text(sop.title.toUpperCase(), 15, 28);

      d.setFontSize(8);
      d.text(`No. Dokumen: ${sop.document_number}`, pageWidth - 68, 15);
      d.text(`No. Revisi: ${String(sop.revision_number).padStart(2, '0')}`, pageWidth - 68, 23);
      d.text(`Tgl Revisi: ${sop.revision_date}`, pageWidth - 68, 32);
      d.text(`Halaman: ${pageNum}`, pageWidth - 38, 32);
    };

    drawHeader(doc, 1);

    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('I. TUJUAN', 10, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(sop.purpose || '-', pageWidth - 20), 10, 50);

    doc.setFont('helvetica', 'bold'); doc.text('II. REFERENSI', 10, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(sop.reference || '-', pageWidth - 20), 10, 75);

    autoTable(doc, {
      startY: 120,
      head: [['DISIAPKAN', 'DIPERIKSA', 'DISAHKAN']],
      body: [[sop.prepared_by || '-', sop.checked_by || '-', sop.approved_by || '-']],
      styles: { halign: 'center', fontSize: 8, font: 'helvetica' },
      theme: 'grid'
    });

    const tableBody: any[][] = [];
    tableBody.push(["MULAI", "", "", ""]);
    if (contentSteps) {
      for (let i = 0; i < contentSteps.length; i++) {
        const s = contentSteps[i];
        const displayNumber = stepDisplayNumbers[i];

        if (s.flow_type === 'end') {
          tableBody.push(["SELESAI", "", "", ""]);
        } else if (s.flow_type === 'alur_baru') {
          tableBody.push([`[ALUR BARU] ${s.step_name || 'ALUR'}`, "", "", ""]);
        } else {
          tableBody.push([
            `[${displayNumber}] ${s.step_name ? s.step_name.toUpperCase() : 'PROSES'}`,
            s.responsible_role,
            s.description,
            s.related_documents
          ]);
        }
      }
    }

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['DIAGRAM ALIR', 'PELAKSANA', 'DESKRIPSI PEKERJAAN', 'DOKUMEN']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8, font: 'helvetica' },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 35 }, 3: { cellWidth: 35 } },
    });

    doc.save(`${sop.document_number}_Rev${sop.revision_number}.pdf`);
  };

  const getVerticalOverflow = (label: string = '') => {
    const isLong = (label || '').length > 12;
    const sideLength = isLong ? 96 : 64; // w-24 = 96px, w-16 = 64px
    const diagonal = sideLength * Math.SQRT2;
    return (diagonal - sideLength) / 2;
  };

  const getTargetEdgeOffset = (type: string, label: string = '') => {
    if (type === 'decision') {
      const isLong = (label || '').length > 12;
      const sideLength = isLong ? 96 : 64;
      return (sideLength * Math.SQRT2) / 2;
    }
    if (type === 'end') return 48; // w-24 = 96px
    return 56; // process/start: w-28 = 112px
  };

  const scrollToLabel = (label: string) => {
    if (!label) return;
    const target = document.querySelector(`[data-flow-label="${label}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Temporary visual feedback
      target.classList.add('ring-8', 'ring-blue-400/30', 'transition-all', 'duration-500');
      setTimeout(() => {
        target.classList.remove('ring-8', 'ring-blue-400/30');
      }, 2000);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-blue-600 mb-4" /></div>;
  if (!sop) return <div>SOP tidak ditemukan</div>;

  return (
    <div className="bg-[#F9FAFB] min-h-screen">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-5">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="!p-2 text-gray-400 hover:text-gray-900 border border-gray-100 rounded-xl hover:bg-gray-50 shadow-none"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <H1 className="text-xl  text-gray-900 tracking-tight">{sop.title}</H1>
            <div className="flex items-center gap-3 mt-0.5">
              <Subtext className="text-[10px]  text-blue-600 uppercase tracking-tight">{sop.document_number}</Subtext>
              <Label className="w-1 h-1 rounded-full bg-gray-300"></Label>
              <Subtext className="text-[10px]  text-gray-400 uppercase tracking-tight">Rev {String(sop.revision_number).padStart(2, '0')}</Subtext>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleExportPDF}
            leftIcon={<Printer size={16} />}
            className="!px-5 !py-2.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-none"
          >
            PDF Export
          </Button>
          {sop.status === 'Approved' ? (
            <Button
              onClick={handleRevision}
              isLoading={isProcessing}
              leftIcon={!isProcessing && <RefreshCw size={16} />}
              className="!px-5 !py-2.5 bg-indigo-600 text-white shadow-lg shadow-indigo-100"
            >
              Revisi SOP
            </Button>
          ) : (
            <Button
              onClick={() => router.push(`/dashboard/sops/${sop.id}/edit`)}
              leftIcon={<Edit size={16} />}
              className="!px-5 !py-2.5 bg-blue-600 text-white shadow-lg shadow-blue-100"
            >
              Lanjut Edit
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-[98%] mx-auto px-6 py-10 space-y-10">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
          {[
            { id: 'purpose', label: 'I. Tujuan', icon: <Target className="text-blue-500" /> },
            { id: 'reference', label: 'II. Referensi', icon: <ShieldCheck className="text-emerald-500" /> },
            { id: 'scope', label: 'III. Ruang Lingkup', icon: <Layers className="text-indigo-500" /> }
          ].map(sec => (
            <div key={sec.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center opacity-70">{sec.icon}</div>
                <h4 className="text-sm  text-gray-900 uppercase tracking-tight">{sec.label}</h4>
              </div>
              <Subtext className="text-sm text-gray-600 font-medium leading-relaxed pl-11 whitespace-pre-wrap">{(sop as any)[sec.id] || '-'}</Subtext>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 bg-gray-50/20">
            <h4 className="text-sm  text-gray-900 uppercase tracking-tight">Visualisasi Alur & Instruksi Kerja</h4>
          </div>
          <Table className="border-collapse table-fixed">
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableCell isHeader className="px-8 py-5 text-[10px] uppercase tracking-tight text-center w-[340px]">Diagram Alir</TableCell>
                <TableCell isHeader className="px-8 py-5 text-[10px] uppercase tracking-tight text-left w-48">Pelaksana</TableCell>
                <TableCell isHeader className="px-8 py-5 text-[10px] uppercase tracking-tight text-left min-w-[400px]">Instruksi Pekerjaan</TableCell>
                <TableCell isHeader className="px-8 py-5 text-[10px] uppercase tracking-tight text-left w-48">Dokumen</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-b border-gray-50 shadow-none hover:bg-white">
                <TableCell
                  rowSpan={contentSteps.length + 1}
                  className="p-0 align-top border-r border-gray-100 relative bg-white"
                >
                  <div className="flex flex-col items-center py-8">
                    <div className="flex flex-col items-center w-full group/start">
                      <FlowShape type="start" label="MULAI" displayNumber={null} />
                      <div className="flex flex-col items-center relative h-16 w-full">
                        <div className="w-0.5 bg-gray-900 h-full relative z-10">
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-0.5">
                            <ArrowDown size={14} strokeWidth={4} className="text-gray-900" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {contentSteps.map((flowStep, flowIdx) => {
                      const isDecision = flowStep.flow_type === 'decision';
                      const isProcess = flowStep.flow_type === 'process';
                      const isEnd = flowStep.flow_type === 'end';
                      const isAlurBaru = flowStep.flow_type === 'alur_baru';

                      const allSteps = (sop.sop_steps || []);
                      const nextVisibleStep = contentSteps[flowIdx + 1];
                      const nextVisibleStepFullIdx = nextVisibleStep ? allSteps.indexOf(nextVisibleStep) + 1 : null;

                      const getTargetStep = (targetNum: number | null | undefined) => {
                        if (targetNum === null || targetNum === undefined) return null;
                        if (targetNum === -1) return { flow_type: 'terminal_end' };
                        return allSteps[targetNum - 1];
                      };

                      const nextTarget = getTargetStep(flowStep.next_target_step);
                      const yesTarget = getTargetStep(flowStep.yes_target_step);
                      const noTarget = getTargetStep(flowStep.no_target_step);

                      const yesGoesDown = isDecision && (
                        flowStep.yes_target_step === nextVisibleStepFullIdx ||
                        (flowStep.yes_target_step === null && nextVisibleStepFullIdx !== null)
                      );

                      const noGoesDown = isDecision && (
                        flowStep.no_target_step === nextVisibleStepFullIdx ||
                        (flowStep.no_target_step === null && nextVisibleStepFullIdx !== null && !yesGoesDown)
                      );

                      const verticalLabel = yesGoesDown ? "YA" : (noGoesDown ? "TIDAK" : null);

                      const sideYesTarget = (isDecision && !yesGoesDown) ? yesTarget : null;
                      const sideNoTarget = (isDecision && !noGoesDown) ? noTarget : null;
                      const sideProcessTarget = ((isProcess || isAlurBaru) && flowStep.next_target_step !== nextVisibleStepFullIdx && flowStep.next_target_step !== null) ? nextTarget : null;

                      const getConnectorLabel = (target: any) => (target?.flow_type === 'sambungan' || target?.flow_type === 'alur_baru') ? target.step_name : null;
                      const incomingConnector = allSteps.find(s => (s.flow_type === 'sambungan' || s.flow_type === 'alur_baru') && s.next_target_step === (allSteps.indexOf(flowStep) + 1));

                      const currentEdgeOffset = getTargetEdgeOffset(flowStep.flow_type, flowStep.step_name);

                      const currentOverflow = isDecision ? getVerticalOverflow(flowStep.step_name) : 0;
                      const nextStepOverflow = nextVisibleStep?.flow_type === 'decision' ? getVerticalOverflow(nextVisibleStep.step_name) : 0;

                      const flowsToAlurBaru = nextVisibleStep?.flow_type === 'alur_baru' && (
                        (isProcess && (flowStep.next_target_step === nextVisibleStepFullIdx || flowStep.next_target_step === null)) ||
                        (isAlurBaru && (flowStep.next_target_step === nextVisibleStepFullIdx || flowStep.next_target_step === null)) ||
                        (isDecision && ((yesGoesDown && (flowStep.yes_target_step === nextVisibleStepFullIdx || flowStep.yes_target_step === null)) || (noGoesDown && (flowStep.no_target_step === nextVisibleStepFullIdx || flowStep.no_target_step === null))))
                      );

                      const shouldDrawVerticalArrow =
                        ((isProcess && (flowStep.next_target_step === nextVisibleStepFullIdx || flowStep.next_target_step === null)) ||
                          (isAlurBaru && (flowStep.next_target_step === nextVisibleStepFullIdx || flowStep.next_target_step === null)) ||
                          (isDecision && (yesGoesDown || noGoesDown))) &&
                        nextVisibleStepFullIdx !== null;

                      return (
                        <div key={flowIdx} data-flow-label={flowStep.step_name} className="flex flex-col items-center w-full group/step">
                          <div className="relative flex items-center justify-center w-full">
                            <div className="relative z-20">
                              <FlowShape
                                type={flowStep.flow_type}
                                label={isEnd ? 'SELESAI' : (flowStep.step_name || '')}
                                displayNumber={stepDisplayNumbers[flowIdx]}
                                onClick={(flowStep.flow_type === 'alur_baru' || flowStep.flow_type === 'sambungan') ? () => scrollToLabel(flowStep.step_name || '') : undefined}
                              />
                            </div>

                            {/* SAMBUNGAN MASUK (Box <--- Circle) */}
                            {incomingConnector && (
                              <div className="absolute top-1/2 -translate-y-1/2 flex items-center" style={{ left: `calc(50% + ${currentEdgeOffset}px)` }}>
                                <div className="flex items-center">
                                  <div className="w-10 h-0.5 bg-gray-900 relative">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0.5">
                                      <ArrowLeftIcon size={14} strokeWidth={4} className="text-gray-900" />
                                    </div>
                                  </div>
                                  <FlowShape
                                    type={incomingConnector.flow_type}
                                    label={incomingConnector.step_name || 'A'}
                                    displayNumber={null}
                                    onClick={() => scrollToLabel(incomingConnector.step_name || '')}
                                  />
                                </div>
                              </div>
                            )}

                            {/* SIDE TARGET - YES */}
                            {sideYesTarget && (
                              <div className="absolute top-1/2 -translate-y-1/2 flex items-center" style={{ left: `calc(50% + ${currentEdgeOffset}px)` }}>
                                <div className="w-12 h-0.5 bg-gray-900 relative">
                                  <div className="absolute -top-4 left-1 text-[8px]  text-emerald-600 bg-white px-1 border border-emerald-100 rounded">YA</div>
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-0.5">
                                    <ArrowRight size={14} strokeWidth={4} className="text-gray-900" />
                                  </div>
                                </div>
                                {getConnectorLabel(sideYesTarget) ? (
                                  <FlowShape
                                    type={sideYesTarget.flow_type}
                                    label={getConnectorLabel(sideYesTarget) || ''}
                                    displayNumber={null}
                                    onClick={() => scrollToLabel(getConnectorLabel(sideYesTarget) || '')}
                                  />
                                ) : sideYesTarget.flow_type === 'terminal_end' && (
                                  <div className="w-0.5 bg-gray-900 absolute left-[64px] top-0 transition-all" style={{ height: `calc(${((contentSteps.length - flowIdx) * 114) + 60}px)` }}>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full flex flex-col items-center">
                                      <div className="h-4 w-0.5 bg-gray-900"></div>
                                      <ArrowDown size={14} strokeWidth={4} className="text-gray-900" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* SIDE TARGET - NO */}
                            {sideNoTarget && (
                              <div className="absolute top-1/2 -translate-y-1/2 flex items-center" style={{ left: `calc(50% + ${currentEdgeOffset}px)` }}>
                                <div className="w-12 h-0.5 bg-gray-900 relative">
                                  <div className="absolute -top-4 left-1 text-[8px]  text-rose-600 bg-white px-1 border border-rose-100 rounded">TIDAK</div>
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-0.5">
                                    <ArrowRight size={14} strokeWidth={4} className="text-gray-900" />
                                  </div>
                                </div>
                                {getConnectorLabel(sideNoTarget) ? (
                                  <FlowShape
                                    type={sideNoTarget.flow_type}
                                    label={getConnectorLabel(sideNoTarget) || ''}
                                    displayNumber={null}
                                    onClick={() => scrollToLabel(getConnectorLabel(sideNoTarget) || '')}
                                  />
                                ) : sideNoTarget.flow_type === 'terminal_end' && (
                                  <div className="w-0.5 bg-gray-900 absolute left-[64px] top-0 transition-all" style={{ height: `calc(${((contentSteps.length - flowIdx) * 114) + 60}px)` }}>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full flex flex-col items-center">
                                      <div className="h-4 w-0.5 bg-gray-900"></div>
                                      <ArrowDown size={14} strokeWidth={4} className="text-gray-900" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* SIDE TARGET - PROCESS */}
                            {sideProcessTarget && (
                              <div className="absolute top-1/2 -translate-y-1/2 flex items-center" style={{ left: `calc(50% + ${currentEdgeOffset}px)` }}>
                                <div className="w-12 h-0.5 bg-gray-900 relative">
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-0.5">
                                    <ArrowRight size={14} strokeWidth={4} className="text-gray-900" />
                                  </div>
                                </div>
                                {getConnectorLabel(sideProcessTarget) ? (
                                  <FlowShape
                                    type={sideProcessTarget.flow_type}
                                    label={getConnectorLabel(sideProcessTarget) || ''}
                                    displayNumber={null}
                                    onClick={() => scrollToLabel(getConnectorLabel(sideProcessTarget) || '')}
                                  />
                                ) : sideProcessTarget.flow_type === 'terminal_end' && (
                                  <div className="w-0.5 bg-gray-900 absolute left-[64px] top-0 transition-all" style={{ height: `calc(${((contentSteps.length - flowIdx) * 114) + 60}px)` }}>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full flex flex-col items-center">
                                      <div className="h-4 w-0.5 bg-gray-900"></div>
                                      <ArrowDown size={14} strokeWidth={4} className="text-gray-900" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Main Vertical Down Arrow */}
                          {!isEnd && (
                            <div className={`flex flex-col items-center relative w-full ${flowsToAlurBaru ? 'h-24' : 'h-16'}`}>
                              {shouldDrawVerticalArrow ? (
                                <React.Fragment>
                                  {/* Arrow Line */}
                                  <div
                                    className="w-0.5 bg-gray-900 absolute left-1/2 -translate-x-1/2 z-30"
                                    style={{
                                      top: `${currentOverflow}px`,
                                      height: flowsToAlurBaru ? '28px' : `calc(100% - ${currentOverflow + nextStepOverflow}px)`
                                    }}
                                  >
                                    {verticalLabel && (
                                      <div className={`absolute left-2 top-2 text-[8px]  px-1 bg-white border rounded ${verticalLabel === 'YA' ? 'text-emerald-600 border-emerald-100' : 'text-rose-600 border-rose-100'}`}>
                                        {verticalLabel}
                                      </div>
                                    )}
                                    {/* Arrowhead exactly at the end of the line */}
                                    <div className="absolute bottom-[-1px] left-1/2 -translate-x-1/2">
                                      <ArrowDown size={14} strokeWidth={4} className="text-gray-900" />
                                    </div>
                                  </div>

                                  {/* Double Circle RAG Logic */}
                                  {flowsToAlurBaru && (
                                    <div className="absolute top-[40px] left-1/2 -translate-x-1/2 z-40">
                                      <FlowShape
                                        type="alur_baru"
                                        label={nextVisibleStep?.step_name || ''}
                                        displayNumber={null}
                                        onClick={() => scrollToLabel(nextVisibleStep?.step_name || '')}
                                      />
                                    </div>
                                  )}
                                </React.Fragment>
                              ) : (
                                <div className="w-0.5 bg-gray-100 h-full relative z-10" />
                              )}
                            </div>
                          )}

                          {/* Spasi tambahan khusus Alur Baru agar gap antara lingkaran atas dan bawah terlihat jelas */}
                          {flowsToAlurBaru && <div className="h-6 w-full" />}
                          {isEnd && <div className="h-8 w-full" />}
                        </div>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell colSpan={3} className="px-8 py-10 bg-white shadow-none"></TableCell>
              </TableRow>

              {contentSteps.map((step, idx) => {
                const isEnd = step.flow_type === 'end';
                const isAlurBaru = step.flow_type === 'alur_baru';

                return (
                  <TableRow key={idx} className={`group transition-colors border-b border-gray-50 shadow-none ${isEnd ? 'bg-gray-50/10' : 'hover:bg-gray-50/5'}`}>
                    <TableCell className="px-8 py-10 align-top">
                      {(!isEnd && !isAlurBaru) && step.responsible_role && (
                        <div className="flex items-center gap-2 mt-2">
                          <User size={12} className="text-blue-500" />
                          <Label className="text-xs  text-gray-900 uppercase tracking-tight leading-tight">{step.responsible_role}</Label>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="px-8 py-10 align-top">
                      <div className="space-y-4 mt-2">
                        <div className="flex gap-4">
                          {!isEnd && !isAlurBaru && (
                            <Label className="text-xs  text-gray-400 bg-gray-50 w-6 h-6 rounded flex items-center justify-center shrink-0">{stepDisplayNumbers[idx]}</Label>
                          )}
                          <div className="space-y-4 flex-1">
                            {!isEnd && !isAlurBaru && (
                              <Subtext className="text-sm text-gray-700 leading-relaxed font-medium whitespace-pre-wrap">{step.description}</Subtext>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-8 py-10 align-top">
                      {!isEnd && !isAlurBaru && step.related_documents && (
                        <div className="mt-2">
                          <Subtext className="text-[10px]  text-gray-400 uppercase tracking-tight flex items-center gap-2">
                            <FileText size={12} className="text-emerald-500 shrink-0" />
                            {step.related_documents}
                          </Subtext>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 overflow-hidden">
          <h4 className="text-sm  text-gray-900 uppercase tracking-tight mb-8 text-center">Lembar Otorisasi</h4>
          <div className="grid grid-cols-3 divide-x divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
            <div className="p-6 text-center">
              <Label className="uppercase tracking-tight mb-10 block">Disiapkan Oleh</Label>
              <Subtext className="text-xs  text-gray-900">{sop.prepared_by || '-'}</Subtext>
            </div>
            <div className="p-6 text-center">
              <Label className="uppercase tracking-tight mb-10 block">Diperiksa Oleh</Label>
              <Subtext className="text-xs  text-gray-900">{sop.checked_by || '-'}</Subtext>
            </div>
            <div className="p-6 text-center">
              <Label className="uppercase tracking-tight mb-10 block">Disahkan Oleh</Label>
              <Subtext className="text-xs  text-gray-900">{sop.approved_by || '-'}</Subtext>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
