'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Client, Product, Quotation, QuotationItem, TaxSetting, ProductCategory, ProductUnit, ClientCompany, ClientCompanyCategory, AutonumberSetting, Deal } from '@/lib/types';
import {
  ArrowLeft, Save, Plus, Trash2, Calendar, FileText,
  User, ChevronDown, Package, Loader2, CheckCircle2, X, AlertCircle, Tags, Weight,
  Building, Mail, Phone, Search, FileDown, Layers, Check as CheckIcon,
  DollarSign, FileCheck
} from 'lucide-react';
import { Modal, Button, Input, Breadcrumb, SectionHeader, Card, Label, Textarea, Table, TableHeader, TableBody, TableRow, TableCell, ComboBox, Subtext, H2 } from '@/components/ui';
import { ClientFormModal } from '@/components/features/clients/components/ClientFormModal';
import { DocumentItemsTable, DocumentItemRow } from '@/components/shared/forms/DocumentItemsTable';
import { DocumentSummary, CalculatedTax } from '@/components/shared/forms/DocumentSummary';
import { DocumentActionHeader } from '@/components/shared/forms/DocumentActionHeader';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateTemplate1, generateTemplate5, generateTemplate6 } from '@/lib/pdf-templates';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store/useAppStore';

interface Props {
  company: Company;
  editingId?: number;
  initialClientId?: number;
  initialDealId?: number;
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

export const QuotationFormView: React.FC<Props> = ({ company, editingId, initialClientId, initialDealId, onSaveSuccess }) => {
  const router = useRouter();
  const { user, showToast } = useAppStore();
  const [loading, setLoading] = useState(false);
  
  const [clientSearch, setClientSearch] = useState('');
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const [deals, setDeals] = useState<Deal[]>([]);
  const [availableTaxes, setAvailableTaxes] = useState<TaxSetting[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [clientCategories, setClientCategories] = useState<ClientCompanyCategory[]>([]);

  const productDropdownRef = useRef<HTMLTableDataCellElement>(null);

  const [clientId, setClientId] = useState('');
  const [dealId, setDealId] = useState<number | null>(null);
  const [quotationNumber, setQuotationNumber] = useState('');
  const [status, setStatus] = useState('Draft');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
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



  // Quick Add State (Modals)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState<Partial<Client>>({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);

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
    let existingQuotation: any = null;

    if (editingId) {
      const { data: qData } = await supabase.from('quotations').select('*, quotation_items(*), client:clients(*, client_company:client_companies(*))').eq('id', editingId).single();
      if (qData) {
        existingQuotation = qData;
        setSelectedClient(qData.client);
        setClientId(String(qData.client_id));
        setDealId(qData.deal_id);
        setQuotationNumber(qData.number);
        setStatus(qData.status);
        setDate(qData.date);
        setExpiryDate(qData.expiry_date);
        setNotes(qData.notes || '');
        setDiscountType(qData.discount_type as any);
        setDiscountValue(qData.discount_value);
        setItems(qData.quotation_items.map((it: any) => ({
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

    const [tRes, nRes, dRes, catRes, unitRes, coRes, coCatRes] = await Promise.all([
      supabase.from('tax_settings').select('*').eq('company_id', company.id).eq('is_active', true).order('id'),
      supabase.from('autonumber_settings').select('*').eq('company_id', company.id).eq('document_type', 'quotation').maybeSingle(),
      supabase.from('deals').select('*').eq('company_id', company.id).order('id', { ascending: false }),
      supabase.from('product_categories').select('*').eq('company_id', company.id).order('name'),
      supabase.from('product_units').select('*').eq('company_id', company.id).order('name'),
      supabase.from('client_companies').select('*').eq('company_id', company.id).order('name'),
      supabase.from('client_company_categories').select('*').eq('company_id', company.id).order('name')
    ]);

    if (tRes.data) setAvailableTaxes(tRes.data);
    if (dRes.data) setDeals(dRes.data);
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
      if (initialDealId) setDealId(initialDealId);
      if (nRes.data) {
        const actualNextNumber = await handleCheckReset(nRes.data);
        const formattedNumber = generateFormattedNumber(nRes.data.format_pattern, actualNextNumber, nRes.data.digit_count || 4, 'QT');
        setQuotationNumber(formattedNumber);
        const defTaxIds = tRes.data?.filter(t => t.is_default).map(t => t.id) || [];
        setSelectedTaxIds(defTaxIds);
      }
    } else {
      if (tRes.data && existingQuotation) {
        const taxNames = existingQuotation.tax_type?.split(', ').map((s: string) => s.trim()) || [];
        const taxIds = tRes.data.filter(t => taxNames.includes(t.name) || taxNames.includes(`${t.name} ${t.rate}%`)).map(t => t.id);
        setSelectedTaxIds(taxIds);
      }
    }
    setLoading(false);
  }, [company.id, editingId, initialClientId, initialDealId]);

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
    if (!clientId || !quotationNumber) return;
    setLoading(true);
    try {
      const taxLabels = selectedTaxesList.map(t => `${t.name} ${t.rate}%`).join(', ') || 'Non Pajak';
      const payload = {
        company_id: company.id,
        client_id: parseInt(clientId),
        deal_id: dealId,
        number: quotationNumber,
        status, date, expiry_date: expiryDate, notes, subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        tax_type: taxLabels,
        tax_value: totalTaxAmount,
        total
      };
      let qId = editingId;
      if (editingId) {
        await supabase.from('quotations').update(payload).eq('id', editingId);
        await supabase.from('quotation_items').delete().eq('quotation_id', editingId);
      } else {
        const { data: qData, error: qErr } = await supabase.from('quotations').insert(payload).select().single();
        if (qErr) throw qErr;
        qId = qData.id;
      }
      const itemInserts = items.filter(it => it.productId).map(it => ({
        quotation_id: qId,
        product_id: parseInt(it.productId),
        description: it.description,
        qty: it.qty,
        unit_name: it.unit,
        price: it.price,
        total: it.total
      }));
      if (itemInserts.length > 0) await supabase.from('quotation_items').insert(itemInserts);
      if (!editingId) {
        const { data: nSet } = await supabase.from('autonumber_settings').select('next_number').eq('company_id', company.id).eq('document_type', 'quotation').maybeSingle();
        if (nSet) await supabase.from('autonumber_settings').update({ next_number: nSet.next_number + 1 }).eq('company_id', company.id).eq('document_type', 'quotation');
      }

      // Add actitivity log if user is logged in
      if (user) {
        try {
          await supabase.from('log_activities').insert({
            user_id: user.id,
            deal_id: dealId || null,
            lead_id: null,
            content: editingId
              ? `Memperbarui penawaran dengan nomor: ${quotationNumber}`
              : `Membuat penawaran baru dengan nomor: ${quotationNumber}`,
            activity_type: 'system'
          });
        } catch (logErr) {
          console.error('Failed to log activity', logErr);
        }
      }

      if (qId) {
        onSaveSuccess?.(qId);
      }
      showToast(editingId ? 'Penawaran berhasil diperbarui' : 'Penawaran baru berhasil disimpan', 'success');
      setLoading(false);
    } catch (err: any) { 
      showToast(err.message, 'error'); 
      setLoading(false); 
    }
  };

  const handleDownloadPDF = async () => {
    if (!editingId) return;

    // Fetch fresh data for PDF
    const { data: q } = await supabase
      .from('quotations')
      .select('*, client:clients(*, client_company:client_companies(*)), quotation_items(*, products(*))')
      .eq('id', editingId)
      .single();

    if (!q) return;

    const { data: templateSetting } = await supabase
      .from('document_template_settings')
      .select('*')
      .eq('company_id', company.id)
      .eq('document_type', 'quotation')
      .maybeSingle();

    const templateId = templateSetting?.template_id || 'template1';
    const config = templateSetting?.config || {};
    config.document_type = 'quotation';

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const padX = 18;

    if (templateId === 'template1') {
      await generateTemplate1(doc, q, config, company, pageWidth, padX);
    } else if (templateId === 'template5') {
      await generateTemplate5(doc, q, config, company, pageWidth, padX);
    } else if (templateId === 'template6') {
      await generateTemplate6(doc, q, config, company, pageWidth, padX);
    } else {
      // Fallback for other templates
      doc.setFillColor('#4F46E5');
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('PENAWARAN HARGA', 20, 25);

      autoTable(doc, {
        startY: 50,
        head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
        body: q.quotation_items?.map((it: any) => [
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

    doc.save(`${q.number}.pdf`);
  };

  // --- Quick Add Handlers ---

  const handleSaveClient = async (formData: Partial<Client>) => {
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
      setClientForm({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
    } catch (err: any) { showToast(err.message, 'error'); } finally { setIsProcessingQuick(false); }
  };



  const handleQuickAddProdCat = async (name: string) => {
    const { data, error } = await supabase.from('product_categories').insert({ company_id: company.id, name: name.trim() }).select().single();
    if (error) throw error;
    setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const handleQuickAddUnit = async (name: string) => {
    const { data, error } = await supabase.from('product_units').insert({ company_id: company.id, name: name.trim() }).select().single();
    if (error) throw error;
    setUnits(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  if (loading && !items.length) return <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white min-h-screen"><Loader2 className="animate-spin text-blue-600" size={32} /><Subtext className="text-[10px] uppercase  text-gray-400">Menyiapkan Formulir...</Subtext></div>;

  return (
    <div className="bg-[#F9FAFB] min-h-screen pb-24 font-sans relative">
      <DocumentActionHeader
        title={
          <Breadcrumb
            items={[
              { label: 'Penawaran' },
              { label: editingId ? 'Ubah Penawaran' : 'Penawaran Baru', active: true }
            ]}
          />
        }
        subtitle={quotationNumber}
        onBack={() => router.push('/dashboard/sales/quotations')}
        onSave={handleSave}
        isSaving={loading}
        isSaveDisabled={!clientId}
        saveLabel={editingId ? 'Update Penawaran' : 'Simpan Penawaran'}
        extraActions={editingId ? (
          <div className="flex items-center gap-3">
            {status === 'Accepted' && (
              <Button
                onClick={() => router.push(`/dashboard/sales/proformas/create?quotationId=${editingId}`)}
                variant='secondary'
                leftIcon={<FileCheck size={16} />}
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
              >
                Jadikan Proforma
              </Button>
            )}
            <Button
              onClick={handleDownloadPDF}
              variant='danger'
              leftIcon={<FileDown size={16} />}
            >
              PDF
            </Button>
          </div>
        ) : undefined}
      />

      <div className="max-w-7xl mx-auto px-10 py-8 space-y-6">
        <Card className="p-8">
          <SectionHeader
            icon={<FileText size={18} />}
            title="Rincian Penawaran"
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
            <Input label="Nomor Penawaran" value={quotationNumber} onChange={(e: any) => setQuotationNumber(e.target.value)} />
            <ComboBox
              label="Status"
              value={status}
              onChange={(val: string | number) => setStatus(val.toString())}
              options={[
                { value: 'Draft', label: 'Draft' },
                { value: 'Sent', label: 'Sent' },
                { value: 'Accepted', label: 'Accepted' },
                { value: 'Declined', label: 'Declined' },
              ]}
            />
            <Input label="Tanggal" type="date" value={date} onChange={(e: any) => setDate(e.target.value)} />
            <Input label="Berlaku Sampai" type="date" value={expiryDate} onChange={(e: any) => setExpiryDate(e.target.value)} />
            <ComboBox
              label="Hubungkan Deal (Optional)"
              value={dealId?.toString() || ''}
              onChange={(val: string | number) => setDealId(val ? Number(val) : null)}
              options={[
                { value: '', label: 'Tidak Terhubung Deal' },
                ...deals.map(d => ({
                  value: d.id.toString(),
                  label: `#${String(d.id).padStart(4, '0')} - ${d.name}`
                }))
              ]}
            />
          </div>
        </Card>

        <Card className="p-8">
          <SectionHeader
            icon={<Package size={18} />}
            title="Daftar Item Penawaran"
            className="mb-8"
          />
          <DocumentItemsTable
            items={items}
            onChange={setItems}
            company={company}
            categories={categories}
            units={units}
          />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <Card className="p-8 space-y-4">
            <SectionHeader
              icon={<FileText size={18} />}
              title="Catatan"
              className="mb-4"
            />
            <Textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} className="h-44 shadow-sm" placeholder="Tambahkan catatan untuk pelanggan..." />
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
              selectedTaxesList={selectedTaxesList}
              total={total}
            />

            <Button
              onClick={handleSave}
              isLoading={loading}
              disabled={!clientId}
              className="w-full mt-6"
              variant='primary'
              leftIcon={<Save size={16} />}
            >
              {editingId ? 'Update Penawaran' : 'Simpan Penawaran'}
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
