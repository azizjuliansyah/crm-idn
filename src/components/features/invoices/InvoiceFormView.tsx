'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Client, Product, Invoice, InvoiceItem, TaxSetting, ProductCategory, ProductUnit, ClientCompany, ClientCompanyCategory, Quotation, ProformaInvoice, AutonumberSetting } from '@/lib/types';
import {
  ArrowLeft, Save, Plus, Trash2, Calendar, FileBadge,
  User, ChevronDown, Package, Loader2, CheckCircle2, X, AlertCircle, Tags, Weight,
  Building, Mail, Phone, Search, FileText, Check as CheckIcon, FileDown, DollarSign
} from 'lucide-react';
import { Modal, Button, Input, Textarea, SectionHeader, Label, Subtext, Table, TableHeader, TableBody, TableRow, TableCell, ComboBox, H2, Card } from '@/components/ui';
import { ClientFormModal } from '@/components/features/clients/components/ClientFormModal';
import { ProductFormModal } from '@/components/features/products/components/ProductFormModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateTemplate1, generateTemplate5, generateTemplate6 } from '@/lib/pdf-templates';
import { useRouter } from 'next/navigation';

interface Props {
  company: Company;
  editingId?: number;
  initialClientId?: number;
  initialProformaId?: number;
  initialQuotationId?: number;
  initialRequestId?: number;
  onSaveSuccess?: (id: number) => void;
}

interface ItemRow {
  id?: number;
  productId: string;
  description: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
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

export const InvoiceFormView: React.FC<Props> = ({ company, editingId, initialClientId, initialProformaId, initialQuotationId, initialRequestId, onSaveSuccess }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [proformas, setProformas] = useState<ProformaInvoice[]>([]);
  const [availableTaxes, setAvailableTaxes] = useState<TaxSetting[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [clientCategories, setClientCategories] = useState<ClientCompanyCategory[]>([]);

  const productDropdownRef = useRef<HTMLTableDataCellElement>(null);

  const [clientId, setClientId] = useState('');
  const [proformaId, setProformaId] = useState<number | null>(null);
  const [quotationId, setQuotationId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [status, setStatus] = useState('Unpaid');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [discountType, setDiscountType] = useState<'Rp' | '%'>('Rp');
  const [discountValue, setDiscountValue] = useState(0);
  const [selectedTaxIds, setSelectedTaxIds] = useState<number[]>([]);
  const [items, setItems] = useState<ItemRow[]>([{ productId: '', description: '', qty: 1, unit: 'pcs', price: 0, total: 0 }]);

  // Quick Add State (Modals)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState<Partial<Client>>({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<Partial<Product>>({ name: '', category_id: null, unit_id: null, price: 0, description: '' });
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
    let existing: any = null;

    if (editingId) {
      const { data: invData } = await supabase.from('invoices').select('*, invoice_items(*)').eq('id', editingId).single();
      if (invData) {
        existing = invData;
        setClientId(String(invData.client_id));
        setProformaId(invData.proforma_id);
        setQuotationId(invData.quotation_id);
        setInvoiceNumber(invData.number);
        setStatus(invData.status);
        setDate(invData.date);
        setDueDate(invData.due_date);
        setNotes(invData.notes || '');
        setDiscountType(invData.discount_type as any);
        setDiscountValue(invData.discount_value);
        setItems(invData.invoice_items.map((it: any) => ({
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

    const [cRes, pRes, tRes, nRes, qRes, pfRes, catRes, unitRes, coRes, coCatRes] = await Promise.all([
      supabase.from('clients').select('*, client_company:client_companies(*)').eq('company_id', company.id).order('name'),
      supabase.from('products').select('*, product_units(*)').eq('company_id', company.id).order('name'),
      supabase.from('tax_settings').select('*').eq('company_id', company.id).eq('is_active', true).order('id'),
      supabase.from('autonumber_settings').select('*').eq('company_id', company.id).eq('document_type', 'invoice').maybeSingle(),
      supabase.from('quotations').select('*').eq('company_id', company.id).order('id', { ascending: false }),
      supabase.from('proformas').select('*').eq('company_id', company.id).order('id', { ascending: false }),
      supabase.from('product_categories').select('*').eq('company_id', company.id).order('name'),
      supabase.from('product_units').select('*').eq('company_id', company.id).order('name'),
      supabase.from('client_companies').select('*').eq('company_id', company.id).order('name'),
      supabase.from('client_company_categories').select('*').eq('company_id', company.id).order('name')
    ]);

    if (cRes.data) setClients(cRes.data);
    if (pRes.data) setProducts(pRes.data);
    if (tRes.data) setAvailableTaxes(tRes.data);
    if (qRes.data) setQuotations(qRes.data);
    if (pfRes.data) setProformas(pfRes.data);
    if (catRes.data) setCategories(catRes.data);
    if (unitRes.data) setUnits(unitRes.data);
    if (coRes.data) setClientCompanies(coRes.data);
    if (coCatRes.data) setClientCategories(coCatRes.data);

    if (!editingId) {
      if (initialClientId) setClientId(initialClientId.toString());

      if (initialProformaId) {
        setProformaId(initialProformaId);
        const { data: pfData } = await supabase.from('proformas').select('*, proforma_items(*)').eq('id', initialProformaId).single();
        if (pfData) {
          setClientId(String(pfData.client_id));
          setQuotationId(pfData.quotation_id);
          setDiscountType(pfData.discount_type as any);
          setDiscountValue(pfData.discount_value);
          setItems(pfData.proforma_items.map((it: any) => ({
            productId: String(it.product_id),
            description: it.description || '',
            qty: it.qty,
            unit: it.unit_name || '',
            price: it.price,
            total: it.total
          })));
        }
      } else if (initialQuotationId) {
        setQuotationId(initialQuotationId);
        const { data: qData } = await supabase.from('quotations').select('*, quotation_items(*)').eq('id', initialQuotationId).single();
        if (qData) {
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
        const formattedNumber = generateFormattedNumber(nRes.data.format_pattern, actualNextNumber, nRes.data.digit_count || 4, 'INV');
        setInvoiceNumber(formattedNumber);
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
  }, [company.id, editingId, initialClientId, initialProformaId, initialQuotationId]);

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

  const handleAddItem = () => setItems([...items, { productId: '', description: '', qty: 1, unit: 'pcs', price: 0, total: 0 }]);
  const handleRemoveItem = (idx: number) => {
    if (items.length === 1) { setItems([{ productId: '', description: '', qty: 1, unit: 'pcs', price: 0, total: 0 }]); return; }
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSelectProduct = (rowIdx: number, prod: Product | null) => {
    const newItems = [...items];
    const item = { ...newItems[rowIdx] };
    if (prod) {
      item.productId = prod.id.toString();
      item.description = prod.description || '';
      item.price = prod.price;
      item.unit = prod.product_units?.name || 'pcs';
    } else {
      item.productId = ''; item.description = ''; item.price = 0; item.unit = 'pcs';
    }
    item.total = item.qty * item.price;
    newItems[rowIdx] = item;
    setItems(newItems);
  };

  const formatIDRVal = (num: number = 0) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  const formatDateString = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const handleSave = async () => {
    if (!clientId || !invoiceNumber) return;
    setLoading(true);
    try {
      const taxLabels = selectedTaxesList.map(t => `${t.name} ${t.rate}%`).join(', ') || 'Non Pajak';
      const payload = {
        company_id: company.id,
        client_id: parseInt(clientId),
        proforma_id: proformaId,
        quotation_id: quotationId,
        number: invoiceNumber,
        status, date, due_date: dueDate, notes, subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        tax_type: taxLabels,
        tax_value: totalTaxAmount,
        total
      };
      let invId = editingId;
      if (editingId) {
        await supabase.from('invoices').update(payload).eq('id', editingId);
        await supabase.from('invoice_items').delete().eq('invoice_id', editingId);
      } else {
        const { data: invData, error: invErr } = await supabase.from('invoices').insert(payload).select().single();
        if (invErr) throw invErr;
        invId = invData.id;
      }
      const itemInserts = items.filter(it => it.productId).map(it => ({
        invoice_id: invId,
        product_id: parseInt(it.productId),
        description: it.description,
        qty: it.qty,
        unit_name: it.unit,
        price: it.price,
        total: it.total
      }));
      if (itemInserts.length > 0) await supabase.from('invoice_items').insert(itemInserts);
      if (!editingId) {
        const { data: nSet } = await supabase.from('autonumber_settings').select('next_number').eq('company_id', company.id).eq('document_type', 'invoice').maybeSingle();
        if (nSet) await supabase.from('autonumber_settings').update({ next_number: nSet.next_number + 1 }).eq('company_id', company.id).eq('document_type', 'invoice');
      }

      if (invId) {
        if (!editingId && initialRequestId) {
          await supabase.from('invoice_requests').update({ invoice_id: invId, status: 'Approved' }).eq('id', initialRequestId);
        }
        onSaveSuccess?.(invId);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
      setLoading(false);
    } catch (err: any) { alert(err.message); setLoading(false); }
  };

  const handleDownloadPDF = async () => {
    if (!editingId) return;

    const { data: inv } = await supabase
      .from('invoices')
      .select('*, client:clients(*, client_company:client_companies(*)), invoice_items(*, products(*))')
      .eq('id', editingId)
      .single();

    if (!inv) return;

    const { data: templateSetting } = await supabase
      .from('document_template_settings')
      .select('*')
      .eq('company_id', company.id)
      .eq('document_type', 'invoice')
      .maybeSingle();

    const templateId = templateSetting?.template_id || 'template1';
    const config = templateSetting?.config || {};
    config.document_type = 'invoice';

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const padX = 18;

    if (templateId === 'template1') {
      await generateTemplate1(doc, inv, config, company, pageWidth, padX);
    } else if (templateId === 'template5') {
      await generateTemplate5(doc, inv, config, company, pageWidth, padX);
    } else if (templateId === 'template6') {
      await generateTemplate6(doc, inv, config, company, pageWidth, padX);
    } else {
      // Fallback for other templates
      doc.setFillColor('#4F46E5');
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('SALES INVOICE', 20, 25);

      autoTable(doc, {
        startY: 50,
        head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
        body: inv.invoice_items?.map((it: any) => [
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

    doc.save(`${inv.number}.pdf`);
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
      const freshRes = await supabase.from('clients').select('*, client_company:client_companies(*)').eq('company_id', company.id).order('name');
      if (freshRes.data) setClients(freshRes.data);
      setClientId(String(data.id));
      setIsClientModalOpen(false);
      setClientForm({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
    } catch (err: any) { alert(err.message); } finally { setIsProcessingQuick(false); }
  };

  const handleSaveProduct = async (formData: Partial<Product>) => {
    if (!formData.name?.trim() || !formData.price) return;
    setIsProcessingQuick(true);
    try {
      const { data, error } = await supabase.from('products').insert({
        company_id: company.id,
        name: formData.name.trim(),
        category_id: formData.category_id,
        unit_id: formData.unit_id,
        price: formData.price,
        description: formData.description
      }).select().single();
      if (error) throw error;
      const freshRes = await supabase.from('products').select('*, product_units(*)').eq('company_id', company.id).order('name');
      if (freshRes.data) setProducts(freshRes.data);
      setIsProductModalOpen(false);
      setProductForm({ name: '', category_id: null, unit_id: null, price: 0, description: '' });
    } catch (err: any) { alert(err.message); } finally { setIsProcessingQuick(false); }
  };

  const handleQuickAddCo = async (coData: any) => {
    const { data, error } = await supabase.from('client_companies').insert({
      company_id: company.id,
      ...coData
    }).select().single();
    if (error) throw error;
    const freshRes = await supabase.from('client_companies').select('*').eq('company_id', company.id).order('name');
    if (freshRes.data) setClientCompanies(freshRes.data);
    return data;
  };

  const handleQuickAddCoCat = async (name: string) => {
    const { data, error } = await supabase.from('client_company_categories').insert({ company_id: company.id, name: name.trim() }).select().single();
    if (error) throw error;
    setClientCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
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


  if (loading && !items.length) return <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white min-h-screen font-sans"><Loader2 className="animate-spin text-indigo-600" size={32} /><p className="text-[10px] font-bold uppercase tracking-tight text-gray-400">Menyiapkan Invoice...</p></div>;

  return (
    <div className="bg-[#F9FAFB] min-h-screen pb-24 font-sans relative">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-10 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button variant="ghost" onClick={() => router.push('/dashboard/sales/invoices')} className="!p-2 text-gray-400 border border-gray-100 h-10 w-10">
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{editingId ? 'Ubah Invoice' : 'Invoice Penjualan Baru'}</h1>
              <Subtext className="text-indigo-600 font-bold uppercase tracking-tight mt-0.5">{invoiceNumber}</Subtext>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push('/dashboard/sales/invoices')}>Batal</Button>
            {editingId && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/dashboard/sales/kwitansi-requests/create?invoiceId=${editingId}`)}
                  leftIcon={<FileText size={16} />}
                  className="border-amber-200 text-amber-600 hover:bg-amber-50"
                >
                  Request Kwitansi
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleDownloadPDF}
                  leftIcon={<FileDown size={16} />}
                  className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                >
                  PDF
                </Button>
              </div>
            )}
            <Button onClick={handleSave} isLoading={loading} disabled={!clientId} leftIcon={editingId ? <Save size={16} /> : <CheckCircle2 size={16} />} variant="primary">
              {editingId ? 'Update Invoice' : 'Simpan Invoice'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-10 py-8 space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
          <SectionHeader
            icon={<FileBadge size={18} />}
            title="Detail Invoice"
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
              />
            </div>
            <Input
              label="Nomor Invoice"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              className="font-medium h-[46px]"
            />
            <ComboBox
              label="Status"
              value={status}
              onChange={(val: string | number) => setStatus(val.toString())}
              options={[
                { value: 'Unpaid', label: 'Unpaid' },
                { value: 'Partial', label: 'Partial' },
                { value: 'Paid', label: 'Paid' },
              ]}
            />
            <Input
              label="Tanggal Tagihan"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="font-medium h-[46px]"
            />
            <Input
              label="Jatuh Tempo"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="font-medium h-[46px]"
            />
            <ComboBox
              label="Referensi Proforma"
              value={proformaId || ''}
              onChange={(val: string | number) => setProformaId(val ? Number(val) : null)}
              options={[
                { value: '', label: '-- Tanpa Referensi --' },
                ...proformas.map(pf => ({ value: pf.id.toString(), label: pf.number }))
              ]}
            />
            <ComboBox
              label="Referensi Penawaran"
              value={quotationId || ''}
              onChange={(val: string | number) => setQuotationId(val ? Number(val) : null)}
              options={[
                { value: '', label: '-- Tanpa Referensi --' },
                ...quotations.map(q => ({ value: q.id.toString(), label: q.number }))
              ]}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
          <SectionHeader
            icon={<FileBadge size={18} />}
            title="Daftar Item Tagihan"
            className="mb-8"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader className="px-8 w-1/4">Produk</TableCell>
                <TableCell isHeader className="px-4">Deskripsi</TableCell>
                <TableCell isHeader className="px-4 text-center w-24">Qty</TableCell>
                <TableCell isHeader className="px-4 text-center w-24">Satuan</TableCell>
                <TableCell isHeader className="px-4 text-right w-40">Harga</TableCell>
                <TableCell isHeader className="px-4 text-right w-40">Jumlah</TableCell>
                <TableCell isHeader className="w-12">{null}</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="px-8 py-5">
                    <ComboBox
                      placeholder="Pilih Produk"
                      value={item.productId}
                      onChange={(val: string | number) => handleSelectProduct(idx, products.find(p => p.id.toString() === val.toString()) || null)}
                      options={products.map(p => ({
                        value: p.id.toString(),
                        label: p.name,
                        sublabel: formatIDRVal(p.price)
                      }))}
                      onAddNew={() => setIsProductModalOpen(true)}
                      addNewLabel="Daftar Produk Baru"
                    />
                  </TableCell>
                  <TableCell className="px-4">
                    <Input
                      value={item.description}
                      onChange={e => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }}
                      className="!py-2.5 text-xs"
                      placeholder="Detail spesifikasi..."
                    />
                  </TableCell>
                  <TableCell className="px-4">
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={e => { const n = [...items]; n[idx].qty = Number(e.target.value); n[idx].total = n[idx].qty * n[idx].price; setItems(n); }}
                      className="!py-2.5 text-xs text-center rounded-md"
                    />
                  </TableCell>
                  <TableCell className="px-4 text-center">
                    <div className="w-full px-2 py-2 bg-gray-50 border border-gray-100 rounded-[4px] text-[10px] text-center text-gray-400 font-bold uppercase tracking-tight">
                      {item.unit}
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <Input
                      type="number"
                      value={item.price}
                      onChange={e => { const n = [...items]; n[idx].price = Number(e.target.value); n[idx].total = n[idx].qty * n[idx].price; setItems(n); }}
                      className="!py-2.5 text-right rounded-md"
                    />
                  </TableCell>
                  <TableCell className="px-4 text-right font-bold text-indigo-700 text-sm">
                    {formatIDRVal(item.total)}
                  </TableCell>
                  <TableCell className="text-center px-2">
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(idx)} className="!p-2 text-gray-300 hover:text-rose-500">
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={handleAddItem} variant="ghost" size="sm" leftIcon={<Plus size={14} />} className="!text-[#4F46E5] hover:bg-indigo-50 font-bold tracking-tight uppercase text-[10px]">
              Tambah Baris
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <Card className="p-8 space-y-4">
            <SectionHeader
              icon={<FileText size={18} />}
              title="Syarat & Ketentuan"
              className="mb-4"
            />
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="h-44 shadow-sm"
              placeholder="Informasi rekening pembayaran, dll..."
            />
          </Card>

          <Card className="p-8 space-y-5">
            <SectionHeader
              icon={<DollarSign size={18} />}
              title="Ringkasan Biaya"
              className="mb-4"
            />
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Subtotal</span>
              <span className="text-sm font-bold text-gray-900">{formatIDRVal(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Diskon</span>
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

            <div className="space-y-4 border-b border-gray-50 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Pajak</span>
                <div className="relative">
                  <ComboBox
                    value=""
                    onChange={(val: string | number) => {
                      if (val) {
                        const id = Number(val);
                        setSelectedTaxIds(prev => prev.includes(id) ? prev : [...prev, id]);
                      }
                    }}
                    options={[
                      { value: '', label: '+ Tambah Pajak' },
                      ...availableTaxes.filter(t => !selectedTaxIds.includes(t.id)).map(tax => ({
                        value: tax.id.toString(),
                        label: `${tax.name} (${tax.rate}%)`
                      }))
                    ]}
                  />
                </div>
              </div>
              {selectedTaxesList.map(tax => (
                <div key={tax.id} className="flex items-center justify-between pl-4 text-[11px] font-bold text-gray-700">
                  <div className="flex items-center gap-2">
                    <span>{tax.name} ({tax.rate}%)</span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTaxIds(prev => prev.filter(id => id !== tax.id))} className="!p-1 text-rose-400 hover:bg-rose-50">
                      <X size={12} />
                    </Button>
                  </div>
                  <span className="text-gray-900">{formatIDRVal(tax.calculated_value)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between py-4 mt-2 border-t-2 border-gray-100">
              <span className="text-md font-bold text-gray-900 uppercase tracking-tight">Total Tagihan</span>
              <span className="text-2xl font-bold text-blue-600">{formatIDRVal(total)}</span>
            </div>

            <Button
              onClick={handleSave}
              isLoading={loading}
              disabled={!clientId}
              className="w-full"
              variant='primary'
              leftIcon={<Save size={16} />}
            >
              {editingId ? 'Update Invoice' : 'Simpan Invoice'}
            </Button>
          </Card>
        </div>
      </div>

      {showSuccessToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] fade-in duration-500">
          <div className="bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500">
            <CheckCircle2 size={20} />
            <Label className="text-sm uppercase tracking-tight">Data Invoice Berhasil Disimpan</Label>
          </div>
        </div>
      )}

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
        onQuickAddCompany={handleQuickAddCo}
        onQuickAddCategory={handleQuickAddCoCat}
      />

      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        form={productForm}
        setForm={setProductForm}
        isProcessing={isProcessingQuick}
        categories={categories}
        units={units}
        onQuickAddCategory={handleQuickAddProdCat}
        onQuickAddUnit={handleQuickAddUnit}
      />
    </div>
  );
};
