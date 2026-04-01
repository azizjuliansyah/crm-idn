'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Input, Textarea, Button, Subtext, Label, Card, ComboBox, Breadcrumb, SectionHeader } from '@/components/ui';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateTemplate1, generateTemplate5, generateTemplate6 } from '@/lib/pdf-templates';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Client, Product, Quotation, ProformaInvoice, TaxSetting,
  ProductCategory, ProductUnit, ClientCompany, ClientCompanyCategory,
  AutonumberSetting, Company
} from '@/lib/types';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { ClientFormModal } from '../clients/components/ClientFormModal';
import { DocumentItemsTable, DocumentItemRow } from '@/components/shared/forms/DocumentItemsTable';
import { DocumentSummary, CalculatedTax } from '@/components/shared/forms/DocumentSummary';
import { DocumentActionHeader } from '@/components/shared/forms/DocumentActionHeader';
import {
  ArrowLeft, FileDown, Save, FileCheck, User,
  Package, X, DollarSign,
  FileText, Loader2
} from 'lucide-react';
import { useAppStore } from '@/lib/store/useAppStore';

interface Props {
  company: Company;
  editingId?: number;
  initialClientId?: number;
  initialQuotationId?: number;
  onNavigate?: (path: string) => void;
  onSaveSuccess?: (id: number) => void;
}



const romanize = (num: number): string => {
  if (num <= 0) return String(num);
  const lookup: Record<string, number> = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let roman = '';
  for (const i in lookup) {
    while (num >= lookup[i]) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman;
};

const generateFormattedNumber = (pattern: string, nextNum: number, digitCount: number, prefix: string) => {
  if (!pattern) return '';
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const mon = now.toLocaleString('id-ID', { month: 'short' }).toUpperCase();
  const month = now.toLocaleString('id-ID', { month: 'long' }).toUpperCase();
  const yy = String(now.getFullYear()).substring(2);
  const yyyy = String(now.getFullYear());
  const numStr = String(nextNum).padStart(digitCount || 4, '0');

  return pattern
    .replace(/\[NUMBER\]/g, numStr)
    .replace(/\[ROMAN_NUMBER\]/g, romanize(nextNum))
    .replace(/\[DD\]/g, dd)
    .replace(/\[ROMAN_DD\]/g, romanize(now.getDate()))
    .replace(/\[MM\]/g, mm)
    .replace(/\[MON\]/g, mon)
    .replace(/\[MONTH\]/g, month)
    .replace(/\[ROMAN_MM\]/g, romanize(now.getMonth() + 1))
    .replace(/\[YY\]/g, yy)
    .replace(/\[YYYY\]/g, yyyy)
    .replace(/\[ROMAN_YY\]/g, romanize(Number(yy)))
    .replace(/\[ROMAN_YYYY\]/g, romanize(now.getFullYear()))
    .replace(/\[PREFIX\]/g, prefix);
};

export const ProformaFormView: React.FC<Props> = ({ company, editingId, initialClientId, initialQuotationId, onNavigate, onSaveSuccess }) => {
  const router = useRouter();
  const { showToast } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [availableTaxes, setAvailableTaxes] = useState<TaxSetting[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [clientCategories, setClientCategories] = useState<ClientCompanyCategory[]>([]);

  const [clientId, setClientId] = useState('');
  const [quotationId, setQuotationId] = useState<number | null>(null);
  const [proformaNumber, setProformaNumber] = useState('');
  const [status, setStatus] = useState('Draft');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [discountType, setDiscountType] = useState<'Rp' | '%'>('Rp');
  const [discountValue, setDiscountValue] = useState(0);
  const [selectedTaxIds, setSelectedTaxIds] = useState<number[]>([]);
  const [items, setItems] = useState<DocumentItemRow[]>([{ productId: '', description: '', qty: 1, unit: 'pcs', price: 0, total: 0 }]);

  // Infinite scroll for clients
  const fetchClientsPaginated = useCallback(async ({ from, to }: { from: number, to: number }) => {
    if (!company?.id) return { data: [], error: null, count: 0 };
    let query = supabase.from('clients').select('*, client_company:client_companies(*)', { count: 'exact' }).eq('company_id', company.id);
    if (clientSearch) query = query.ilike('name', `%${clientSearch}%`);
    query = query.order('name', { ascending: true });
    const { data, error, count } = await query.range(from, to);
    return { data: data || [], error, count };
  }, [company?.id, clientSearch]);

  const {
    data: scrolledClients,
    isLoadingMore: isLoadingMoreClients,
    hasMore: hasMoreClients,
    loadMore: loadMoreClients,
    refresh: refreshClients
  } = useInfiniteScroll<Client>(fetchClientsPaginated, {
    pageSize: 20,
    dependencies: [company?.id, clientSearch]
  });

  const clients = useMemo(() => {
    const list = [...scrolledClients];
    if (selectedClient && !list.find(c => c.id === selectedClient.id)) {
      list.unshift(selectedClient);
    }
    return list;
  }, [scrolledClients, selectedClient]);

  // Modal States
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);

  const [clientForm, setClientForm] = useState<Partial<Client>>({
    salutation: '',
    name: '',
    email: '',
    whatsapp: '',
    client_company_id: null,
  });

  const handleCheckReset = async (setting: AutonumberSetting) => {
    if (!setting || setting.reset_period === 'never') return setting.next_number;

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const lastReset = setting.last_reset_date ? new Date(setting.last_reset_date) : null;

    let shouldReset = false;

    if (setting.reset_period === 'monthly') {
      if (!lastReset || (lastReset.getMonth() + 1 !== currentMonth || lastReset.getFullYear() !== currentYear)) {
        if (currentDay >= (setting.reset_day || 1)) {
          shouldReset = true;
        }
      }
    } else if (setting.reset_period === 'yearly') {
      if (!lastReset || lastReset.getFullYear() !== currentYear) {
        if (currentMonth > (setting.reset_month || 1) || (currentMonth === (setting.reset_month || 1) && currentDay >= (setting.reset_day || 1))) {
          shouldReset = true;
        }
      }
    }

    if (shouldReset) {
      await supabase.from('autonumber_settings').update({
        next_number: 1,
        last_reset_date: now.toISOString().split('T')[0]
      }).eq('id', setting.id);
      return 1;
    }

    return setting.next_number;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    let existing: any = null;

    if (editingId) {
      const { data: pData } = await supabase.from('proformas').select('*, proforma_items(*), client:clients(*, client_company:client_companies(*))').eq('id', editingId).single();
      if (pData) {
        existing = pData;
        setSelectedClient(pData.client);
        setClientId(String(pData.client_id));
        setQuotationId(pData.quotation_id);
        setProformaNumber(pData.number);
        setStatus(pData.status);
        setDate(pData.date);
        setDueDate(pData.due_date);
        setNotes(pData.notes || '');
        setDiscountType(pData.discount_type as any);
        setDiscountValue(pData.discount_value);
        setItems(pData.proforma_items.map((it: any) => ({
          id: it.id,
          productId: String(it.product_id),
          description: it.description || '',
          qty: it.qty,
          unit: it.unit_name || '',
          price: it.price,
          total: it.total
        })));

      }
    }

    const [tRes, nRes, qRes, catRes, unitRes, coRes, coCatRes] = await Promise.all([
      supabase.from('tax_settings').select('*').eq('company_id', company.id).eq('is_active', true).order('id'),
      supabase.from('autonumber_settings').select('*').eq('company_id', company.id).eq('document_type', 'proforma').maybeSingle(),
      supabase.from('quotations').select('*').eq('company_id', company.id).order('id', { ascending: false }),
      supabase.from('product_categories').select('*').eq('company_id', company.id).order('name'),
      supabase.from('product_units').select('*').eq('company_id', company.id).order('name'),
      supabase.from('client_companies').select('*').eq('company_id', company.id).order('name'),
      supabase.from('client_company_categories').select('*').eq('company_id', company.id).order('name')
    ]);

    if (tRes.data) setAvailableTaxes(tRes.data);
    if (qRes.data) setQuotations(qRes.data);
    if (catRes.data) setCategories(catRes.data);
    if (unitRes.data) setUnits(unitRes.data);
    if (coRes.data) setClientCompanies(coRes.data);
    if (coCatRes.data) setClientCategories(coCatRes.data);

    if (!editingId) {
      if (initialClientId) {
        setClientId(initialClientId.toString());
        const { data: cData } = await supabase.from('clients').select('*, client_company:client_companies(*)').eq('id', initialClientId).single();
        if (cData) setSelectedClient(cData);
      }
      if (initialQuotationId) {
        setQuotationId(initialQuotationId);
        const { data: qData } = await supabase.from('quotations').select('*, quotation_items(*), client:clients(*, client_company:client_companies(*))').eq('id', initialQuotationId).single();
        if (qData) {
          setSelectedClient(qData.client);
          setClientId(String(qData.client_id));
          setDiscountType(qData.discount_type as any);
          setDiscountValue(qData.discount_value);
          setItems(qData.quotation_items.map((it: any) => ({
            productId: String(it.product_id),
            description: it.description || '',
            qty: it.qty,
            unit: it.unit_name || '',
            price: it.price,
            total: it.total
          })));

        }
      }
      if (nRes.data) {
        const actualNextNumber = await handleCheckReset(nRes.data);
        const formattedNumber = generateFormattedNumber(nRes.data.format_pattern, actualNextNumber, nRes.data.digit_count || 4, 'PI');
        setProformaNumber(formattedNumber);
        const defTaxIds = tRes.data?.filter(t => t.is_default).map(t => t.id) || [];
        setSelectedTaxIds(defTaxIds);
      }
    } else {
      if (tRes.data && existing) {
        const taxNames = existing.tax_type?.split(', ').map((s: string) => s.trim()) || [];
        const taxIds = tRes.data.filter(t => taxNames.includes(t.name) || taxNames.includes(`${t.name} ${t.rate}%`)).map(t => t.id);
        setSelectedTaxIds(taxIds);
      }
    }
    setLoading(false);
  }, [company.id, editingId, initialClientId, initialQuotationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const subtotal = useMemo(() => items.reduce((acc, curr) => acc + curr.total, 0), [items]);
  const discountAmount = useMemo(() => discountType === 'Rp' ? discountValue : (subtotal * discountValue) / 100, [subtotal, discountType, discountValue]);

  const selectedTaxesList = useMemo(() => {
    const base = subtotal - discountAmount;
    return availableTaxes.filter(t => selectedTaxIds.includes(t.id)).map(t => ({ ...t, calculated_value: (base * (t.rate / 100)) }));
  }, [subtotal, discountAmount, selectedTaxIds, availableTaxes]);

  const totalTaxAmount = useMemo(() => selectedTaxesList.reduce((acc, curr) => acc + curr.calculated_value, 0), [selectedTaxesList]);
  const total = useMemo(() => subtotal - discountAmount + totalTaxAmount, [subtotal, discountAmount, totalTaxAmount]);



  const formatIDRVal = (num: number = 0) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  const handleSave = async () => {
    if (!clientId || !proformaNumber) return;
    setLoading(true);
    try {
      const taxLabels = selectedTaxesList.map(t => `${t.name} ${t.rate}%`).join(', ') || 'Non Pajak';
      const payload = {
        company_id: company.id,
        client_id: parseInt(clientId),
        quotation_id: quotationId,
        number: proformaNumber,
        status, date, due_date: dueDate, notes, subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        tax_type: taxLabels,
        tax_value: totalTaxAmount,
        total
      };
      let pId = editingId;
      if (editingId) {
        await supabase.from('proformas').update(payload).eq('id', editingId);
        await supabase.from('proforma_items').delete().eq('proforma_id', editingId);
      } else {
        const { data: pData, error: pErr } = await supabase.from('proformas').insert(payload).select().single();
        if (pErr) throw pErr;
        pId = pData.id;
      }
      const itemInserts = items.filter(it => it.productId).map(it => ({
        proforma_id: pId,
        product_id: parseInt(it.productId),
        description: it.description,
        qty: it.qty,
        unit_name: it.unit,
        price: it.price,
        total: it.total
      }));
      if (itemInserts.length > 0) await supabase.from('proforma_items').insert(itemInserts);
      if (!editingId) {
        const { data: nSet } = await supabase.from('autonumber_settings').select('next_number').eq('company_id', company.id).eq('document_type', 'proforma').maybeSingle();
        if (nSet) await supabase.from('autonumber_settings').update({ next_number: nSet.next_number + 1 }).eq('company_id', company.id).eq('document_type', 'proforma');
      }

      if (pId) {
        onSaveSuccess?.(pId);
      }
      showToast(editingId ? 'Proforma berhasil diperbarui' : 'Proforma baru berhasil disimpan', 'success');
      setLoading(false);
    } catch (err: any) { 
      showToast(err.message, 'error'); 
      setLoading(false); 
    }
  };

  const handleDownloadPDF = async () => {
    if (!editingId) return;

    const { data: p } = await supabase
      .from('proformas')
      .select('*, client:clients(*, client_company:client_companies(*)), proforma_items(*, products(*))')
      .eq('id', editingId)
      .single();

    if (!p) return;

    const { data: templateSetting } = await supabase
      .from('document_template_settings')
      .select('*')
      .eq('company_id', company.id)
      .eq('document_type', 'invoice')
      .maybeSingle();

    const templateId = templateSetting?.template_id || 'template1';
    const config = templateSetting?.config || {};
    config.document_type = 'proforma';

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const padX = 18;

    if (templateId === 'template1') {
      await generateTemplate1(doc, p, config, company, pageWidth, padX);
    } else if (templateId === 'template5') {
      await generateTemplate5(doc, p, config, company, pageWidth, padX);
    } else if (templateId === 'template6') {
      await generateTemplate6(doc, p, config, company, pageWidth, padX);
    } else {
      doc.setFillColor('#4F46E5');
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('PROFORMA INVOICE', 20, 25);

      autoTable(doc, {
        startY: 50,
        head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
        body: p.proforma_items?.map((it: any) => [
          String(it.products?.name || ''),
          String(it.description || ''),
          `${it.qty} ${it.unit_name || ''}`,
          formatIDRVal(it.price),
          formatIDRVal(it.total)
        ]) || [],
        theme: 'striped',
        headStyles: { fillColor: '#4F46E5' }
      });
    }

    doc.save(`${p.number}.pdf`);
  };

  // --- Quick Add Handlers ---

  const handleSaveClient = async (formData: any) => {
    if (!formData.name?.trim()) return;
    setIsProcessingQuick(true);
    try {
      const { data, error } = await supabase.from('clients').insert({
        company_id: company.id,
        salutation: formData.salutation,
        name: formData.name.trim(),
        client_company_id: formData.client_company_id,
        email: formData.email,
        whatsapp: formData.whatsapp ? `+62${formData.whatsapp.replace(/\D/g, '')}` : null
      }).select().single();
      if (error) throw error;
      await refreshClients();
      const freshSelect = await supabase.from('clients').select('*, client_company:client_companies(*)').eq('id', data.id).single();
      if (freshSelect.data) setSelectedClient(freshSelect.data);
      
      setClientId(String(data.id));
      setIsClientModalOpen(false);
      setClientForm({ salutation: '', name: '', client_company_id: null, email: '', whatsapp: '' });
    } catch (err: any) { showToast(err.message, 'error'); } finally { setIsProcessingQuick(false); }
  };



  const handleQuickAddProdCat = async (catName: string) => {
    const { data, error } = await supabase.from('product_categories').insert({ company_id: company.id, name: catName.trim() }).select().single();
    if (error) throw error;
    setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const handleQuickAddUnit = async (unitName: string) => {
    const { data, error } = await supabase.from('product_units').insert({ company_id: company.id, name: unitName.trim() }).select().single();
    if (error) throw error;
    setUnits(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  if (loading && !items.length) return <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white min-h-screen font-sans"><Loader2 className="animate-spin text-indigo-600" size={32} /><Subtext className="text-[10px] font-bold uppercase text-gray-400">Menyiapkan Proforma...</Subtext></div>;

  return (
    <div className="bg-[#F9FAFB] min-h-screen pb-24 font-sans relative">
      <DocumentActionHeader
        title={
          <Breadcrumb
            items={[
              { label: 'Proforma' },
              { label: editingId ? 'Ubah Proforma' : 'Proforma Invoice Baru', active: true }
            ]}
          />
        }
        subtitle={
          <Subtext className="text-[11px] font-bold text-blue-600 uppercase mt-0.5">{proformaNumber}</Subtext>
        }
        onBack={() => onNavigate ? onNavigate('daftar_proforma') : router.push('/dashboard/sales/proformas')}
        onSave={handleSave}
        isSaving={loading}
        isSaveDisabled={!clientId}
        saveLabel={editingId ? 'Update Proforma' : 'Simpan Proforma'}
        saveIcon={<Save size={16} />}
        extraActions={
          editingId ? (
            <>
              {status !== 'Draft' && (
                <Button
                  onClick={() => router.push(`/dashboard/sales/invoice-requests/create?proformaId=${editingId}`)}
                  variant='secondary'
                  leftIcon={<FileCheck size={16} />}
                  className="text-amber-600 border-amber-200 hover:bg-amber-50"
                >
                  Request Invoice
                </Button>
              )}
              <Button
                onClick={handleDownloadPDF}
                variant='secondary'
                className="border-rose-200 text-rose-600 hover:bg-rose-50"
                leftIcon={<FileDown size={16} />}
              >
                PDF
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="max-w-7xl mx-auto px-10 py-8 space-y-6">
        <Card className="p-8">
          <SectionHeader
            icon={<FileText size={18} />}
            title="Rincian Proforma"
            className="mb-8"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
            <div className="space-y-4">
              <ComboBox
                label="Pelanggan"
                placeholder="Pilih Pelanggan"
                value={clientId}
                onChange={(val: string | number) => setClientId(val.toString())}
                options={clients.map(c => ({
                  value: c.id.toString(),
                  label: c.name,
                  sublabel: c.client_company?.name || 'PERSONAL'
                }))}
                onAddNew={() => setIsClientModalOpen(true)}
                addNewLabel="Tambah Pelanggan Baru"
                leftIcon={<User size={16} />}
                onLoadMore={loadMoreClients}
                hasMore={hasMoreClients}
                isLoadingMore={isLoadingMoreClients}
                onSearchChange={setClientSearch}
              />

            </div>
            <Input label="Nomor Proforma" value={proformaNumber} onChange={(e: any) => setProformaNumber(e.target.value)} />
            <ComboBox
              label="Status"
              value={status}
              onChange={(val: string | number) => setStatus(val.toString())}
              options={[
                { value: 'Draft', label: 'Draft' },
                { value: 'Sent', label: 'Sent' },
                { value: 'Paid', label: 'Paid' },
              ]}
            />
            <Input type="date" label="Tanggal" value={date} onChange={(e: any) => setDate(e.target.value)} />
            <Input type="date" label="Batas Pembayaran" value={dueDate} onChange={(e: any) => setDueDate(e.target.value)} />
            <ComboBox
              label="Referensi Penawaran"
              value={quotationId?.toString() || ''}
              onChange={(val: string | number) => setQuotationId(val ? Number(val) : null)}
              options={[
                { value: '', label: '-- Tanpa Referensi --' },
                ...quotations.map(q => ({
                  value: q.id.toString(),
                  label: q.number
                }))
              ]}
            />
          </div>
        </Card>

        <Card className="p-8">
          <SectionHeader
            icon={<Package size={18} />}
            title="Daftar Item Tagihan"
            className="mb-8"
          />
          <DocumentItemsTable
            company={company}
            items={items}
            onChange={setItems}
            categories={categories}
            units={units}
            onQuickAddCategory={handleQuickAddProdCat}
            onQuickAddUnit={handleQuickAddUnit}
          />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <Card className="p-8 space-y-4">
            <SectionHeader
              icon={<FileText size={18} />}
              title="Syarat & Ketentuan"
              className="mb-4"
            />
            <Textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} className="h-44 shadow-sm" placeholder="Informasi rekening pembayaran, dll..." />
          </Card>

          <Card className="p-8 space-y-5">
            <SectionHeader
              icon={<DollarSign size={18} />}
              title="Ringkasan Biaya"
              className="mb-4"
            />
            <DocumentSummary
              subtotal={subtotal}
              discountType={discountType}
              setDiscountType={setDiscountType}
              discountValue={discountValue}
              setDiscountValue={setDiscountValue}
              discountAmount={discountAmount}
              availableTaxes={availableTaxes}
              selectedTaxIds={selectedTaxIds}
              setSelectedTaxIds={setSelectedTaxIds}
              selectedTaxesList={selectedTaxesList as CalculatedTax[]}
              total={total}
              totalLabel="Grand Total"
            />

            <Button
              onClick={handleSave}
              isLoading={loading}
              disabled={!clientId}
              variant="primary"
              className="w-full py-3 text-sm font-bold uppercase "
              leftIcon={<Save size={16} />}
            >
              {editingId ? 'Update Proforma' : 'Simpan Proforma'}
            </Button>
          </Card>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <ClientFormModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleSaveClient}
        form={clientForm}
        setForm={setClientForm}
        isProcessing={isProcessingQuick}
        clientCompanies={clientCompanies}
        categories={clientCategories}
        companyId={company.id}
      />


    </div>
  );
};
