'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Client, Product, Kwitansi, TaxSetting, ProductCategory, ProductUnit, ClientCompany, ClientCompanyCategory, Quotation, ProformaInvoice, AutonumberSetting } from '@/lib/types';
import {
  ArrowLeft, Save, Plus, Trash2, FileBadge,
  User, CheckCircle2, X, FileText, FileDown, DollarSign, FilePlus, Loader2
} from 'lucide-react';
import { Button, Input, Textarea, SectionHeader, Label, Subtext, ComboBox, Card } from '@/components/ui';
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
  initialProformaId?: number;
  initialQuotationId?: number;
  initialRequestId?: number;
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

export const InvoiceFormView: React.FC<Props> = ({ company, editingId, initialClientId, initialProformaId, initialQuotationId, initialRequestId, onSaveSuccess }) => {
  const router = useRouter();
  const { activeCompanyMembers, user, showToast } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [existingKwitansi, setExistingKwitansi] = useState<Kwitansi | null>(null);
  
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [initialProducts, setInitialProducts] = useState<Product[]>([]);
  
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [proformas, setProformas] = useState<ProformaInvoice[]>([]);
  const [availableTaxes, setAvailableTaxes] = useState<TaxSetting[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [clientCategories, setClientCategories] = useState<ClientCompanyCategory[]>([]);

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
  } = useInfiniteScroll<any>(fetchClientsPaginated, {
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
  const [clientForm, setClientForm] = useState<any>({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });

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
      const { data: invData } = await supabase.from('invoices').select('*, invoice_items(*), client:clients(*, client_company:client_companies(*))').eq('id', editingId).single();
      if (invData) {
        existing = invData;
        setSelectedClient(invData.client);
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

        const productIds = invData.invoice_items.map((it: any) => it.product_id);
        if (productIds.length > 0) {
          const { data: pData } = await supabase.from('products').select('*, product_units(*)').in('id', productIds);
          if (pData) setInitialProducts(pData);
        }
      }
    }

    const [tRes, nRes, qRes, pfRes, catRes, unitRes, coRes, coCatRes] = await Promise.all([
      supabase.from('tax_settings').select('*').eq('company_id', company.id).eq('is_active', true).order('id'),
      supabase.from('autonumber_settings').select('*').eq('company_id', company.id).eq('document_type', 'invoice').maybeSingle(),
      supabase.from('quotations').select('*').eq('company_id', company.id).order('id', { ascending: false }),
      supabase.from('proformas').select('*').eq('company_id', company.id).order('id', { ascending: false }),
      supabase.from('product_categories').select('*').eq('company_id', company.id).order('name'),
      supabase.from('product_units').select('*').eq('company_id', company.id).order('name'),
      supabase.from('client_companies').select('*').eq('company_id', company.id).order('name'),
      supabase.from('client_company_categories').select('*').eq('company_id', company.id).order('name')
    ]);

    if (tRes.data) setAvailableTaxes(tRes.data);
    if (qRes.data) setQuotations(qRes.data);
    if (pfRes.data) setProformas(pfRes.data);
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

      if (initialProformaId) {
        setProformaId(initialProformaId);
        const { data: pfData } = await supabase.from('proformas').select('*, proforma_items(*), client:clients(*, client_company:client_companies(*))').eq('id', initialProformaId).single();
        if (pfData) {
          setSelectedClient(pfData.client);
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

          const productIds = pfData.proforma_items.map((it: any) => it.product_id);
          if (productIds.length > 0) {
            const { data: pData } = await supabase.from('products').select('*, product_units(*)').in('id', productIds);
            if (pData) setInitialProducts(pData);
          }
        }
      } else if (initialQuotationId) {
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

          const productIds = qData.quotation_items.map((it: any) => it.product_id);
          if (productIds.length > 0) {
            const { data: pData } = await supabase.from('products').select('*, product_units(*)').in('id', productIds);
            if (pData) setInitialProducts(pData);
          }
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
    
    if (editingId) {
      const { data: kwt } = await supabase
        .from('kwitansis')
        .select('*')
        .eq('invoice_id', editingId)
        .maybeSingle();
      if (kwt) setExistingKwitansi(kwt);
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

  const taxTypeString = useMemo(() => selectedTaxesList.map(t => `${t.name} ${t.rate}%`).join(', '), [selectedTaxesList]);



  const formatIDRVal = (num: number = 0) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

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
      }
      showToast(editingId ? 'Invoice berhasil diperbarui' : 'Invoice baru berhasil disimpan', 'success');
      setLoading(false);
    } catch (err: any) { 
      showToast(err.message, 'error'); 
      setLoading(false); 
    }
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

  const hasApprovalPermission = useMemo(() => {
    if (user?.platform_role === 'ADMIN') return true;
    const currentMember = activeCompanyMembers.find(m => m.user_id === user?.id);
    return currentMember?.company_roles?.permissions.includes('Persetujuan Request Kwitansi') || false;
  }, [user, activeCompanyMembers]);

  const handleCreateKwitansi = async () => {
    setLoading(true);
    try {
      const kwtNumber = `KWT-${Date.now().toString().slice(-6)}`;
      const { data: kwt, error: kwtErr } = await supabase
        .from('kwitansis')
        .insert({
          company_id: company.id,
          client_id: parseInt(clientId),
          invoice_id: editingId,
          number: kwtNumber,
          date: new Date().toISOString().split('T')[0],
          status: 'Paid',
          total: total || 0,
          subtotal: subtotal || 0,
          tax_type: taxTypeString || null,
          tax_value: totalTaxAmount || 0,
          discount_type: discountType || 'Rp',
          discount_value: discountValue || 0
        })
        .select()
        .single();

      if (kwtErr) throw kwtErr;

      if (items.length > 0) {
        const { error: itemsErr } = await supabase
          .from('kwitansi_items')
          .insert(items.map((it: any) => ({
            kwitansi_id: kwt.id,
            product_id: it.productId ? parseInt(it.productId) : null,
            description: it.description,
            qty: it.qty,
            price: it.price,
            total: it.total,
            unit_name: it.unit
          })));
        if (itemsErr) throw itemsErr;
      }

      showToast(`Kwitansi berhasil dibuat.`, 'success');
      setExistingKwitansi(kwt);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadKwitansi = async () => {
    if (!editingId) return;
    setLoading(true);

    try {
      const { data: kwt, error: kwtErr } = await supabase
        .from('kwitansis')
        .select('*, client:clients(*, client_company:client_companies(*)), kwitansi_items(*, products(*))')
        .eq('invoice_id', editingId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (kwtErr) throw kwtErr;

      if (!kwt) {
        showToast('Kwitansi untuk invoice ini belum dibuat.', 'error');
        setLoading(false);
        return;
      }

      const { data: templateSetting } = await supabase
        .from('document_template_settings')
        .select('*')
        .eq('company_id', company.id)
        .eq('document_type', 'kwitansi')
        .maybeSingle();

      const templateId = templateSetting?.template_id || 'template1';
      const config = templateSetting?.config || {};
      config.document_type = 'kwitansi';

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const padX = 18;

      if (templateId === 'template1') {
        await generateTemplate1(doc, kwt, config, company, pageWidth, padX);
      } else if (templateId === 'template5') {
        await generateTemplate5(doc, kwt, config, company, pageWidth, padX);
      } else if (templateId === 'template6') {
        await generateTemplate6(doc, kwt, config, company, pageWidth, padX);
      } else {
        doc.setFillColor('#4F46E5');
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('KWITANSI PENJUALAN', 20, 25);

        autoTable(doc, {
          startY: 50,
          head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
          body: kwt.kwitansi_items?.map((it: any) => [
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

      doc.save(`${kwt.number}.pdf`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
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
      setClientForm({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: null });
    } catch (err: any) { 
      showToast(err.message, 'error'); 
    } finally { 
      setIsProcessingQuick(false); 
    }
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


  if (loading && !items.length) return <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white min-h-screen font-sans"><Loader2 className="animate-spin text-indigo-600" size={32} /><p className="text-[10px] font-bold uppercase  text-gray-400">Menyiapkan Invoice...</p></div>;

  return (
    <div className="bg-[#F9FAFB] min-h-screen pb-24 font-sans relative">
      <DocumentActionHeader
        title={editingId ? 'Ubah Invoice' : 'Invoice Penjualan Baru'}
        subtitle={invoiceNumber}
        onBack={() => router.push('/dashboard/sales/invoices')}
        onSave={handleSave}
        isSaving={loading}
        isSaveDisabled={!clientId}
        saveLabel={editingId ? 'Update Invoice' : 'Simpan Invoice'}
        saveIcon={editingId ? <Save size={16} /> : <CheckCircle2 size={16} />}
        extraActions={
          editingId ? (
            <>
              {status === 'Paid' && !existingKwitansi && hasApprovalPermission && (
                <Button
                  variant="secondary"
                  onClick={handleCreateKwitansi}
                  leftIcon={<FilePlus size={16} />}
                  className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  disabled={loading}
                >
                  Buat Kwitansi
                </Button>
              )}
              {status === 'Paid' && existingKwitansi && (
                <Button
                  variant="secondary"
                  onClick={handleDownloadKwitansi}
                  leftIcon={<FileDown size={16} />}
                  className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                >
                  Unduh Kwitansi
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={handleDownloadPDF}
                leftIcon={<FileDown size={16} />}
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                PDF
              </Button>
            </>
          ) : undefined
        }
      />

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
                onLoadMore={loadMoreClients}
                hasMore={hasMoreClients}
                isLoadingMore={isLoadingMoreClients}
                onSearchChange={setClientSearch}
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
                { value: '', label: 'Tanpa Referensi' },
                ...proformas.map(pf => ({ value: pf.id.toString(), label: pf.number }))
              ]}
            />
            <ComboBox
              label="Referensi Penawaran"
              value={quotationId || ''}
              onChange={(val: string | number) => setQuotationId(val ? Number(val) : null)}
              options={[
                { value: '', label: 'Tanpa Referensi' },
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
          <DocumentItemsTable
            company={company}
            items={items}
            onChange={setItems}
            initialSelectedProducts={initialProducts}
            categories={categories}
            units={units}
          />
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
              totalLabel="Total Tagihan"
            />

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
