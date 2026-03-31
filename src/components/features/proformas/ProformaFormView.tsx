'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Input, Textarea, Button, Table, TableHeader, TableBody, TableRow, TableCell, H3, Subtext, Label, Modal, Card, ComboBox, Breadcrumb, SectionHeader, H2, Toast, ToastType } from '@/components/ui';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateTemplate1, generateTemplate5, generateTemplate6 } from '@/lib/pdf-templates';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Client, Product, Quotation, ProformaInvoice, TaxSetting,
  ProductCategory, ProductUnit, ClientCompany, ClientCompanyCategory,
  AutonumberSetting, Company, ClientForm, ProductForm
} from '@/lib/types';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { ClientFormModal } from '../clients/components/ClientFormModal';
import { ProductFormModal } from '../products/components/ProductFormModal';
import {
  ArrowLeft, FileDown, Loader2, Save, FileCheck, User,
  ChevronDown, Search, Package, Trash2, Plus, X,
  Check as CheckIcon, CheckCircle as CheckCircle2, FileText, DollarSign
} from 'lucide-react';

interface Props {
  company: Company;
  editingId?: number;
  initialClientId?: number;
  initialQuotationId?: number;
  onNavigate?: (path: string) => void;
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

export const ProformaFormView: React.FC<Props> = ({ company, editingId, initialClientId, initialQuotationId, onNavigate, onSaveSuccess }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: ToastType }>({
    isOpen: false,
    message: '',
    type: 'success',
  });
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [proformas, setProformas] = useState<ProformaInvoice[]>([]);
  const [availableTaxes, setAvailableTaxes] = useState<TaxSetting[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [clientCompanies, setClientCompanies] = useState<ClientCompany[]>([]);
  const [clientCategories, setClientCategories] = useState<ClientCompanyCategory[]>([]);

  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);

  const productDropdownRef = useRef<HTMLTableDataCellElement>(null);

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
  const [items, setItems] = useState<ItemRow[]>([{ productId: '', description: '', qty: 1, unit: 'pcs', price: 0, total: 0 }]);

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

  // Infinite scroll for products
  const fetchProductsPaginated = useCallback(async ({ from, to }: { from: number, to: number }) => {
    if (!company?.id) return { data: [], error: null, count: 0 };
    let query = supabase.from('products').select('*, product_units(*)', { count: 'exact' }).eq('company_id', company.id);
    if (productSearch) query = query.ilike('name', `%${productSearch}%`);
    query = query.order('name', { ascending: true });
    const { data, error, count } = await query.range(from, to);
    return { data: data || [], error, count };
  }, [company?.id, productSearch]);

  const {
    data: scrolledProducts,
    isLoadingMore: isLoadingMoreProducts,
    hasMore: hasMoreProducts,
    loadMore: loadMoreProducts,
    refresh: refreshProducts
  } = useInfiniteScroll<Product>(fetchProductsPaginated, {
    pageSize: 20,
    dependencies: [company?.id, productSearch]
  });

  const clients = useMemo(() => {
    const list = [...scrolledClients];
    if (selectedClient && !list.find(c => c.id === selectedClient.id)) {
      list.unshift(selectedClient);
    }
    return list;
  }, [scrolledClients, selectedClient]);

  const products = useMemo(() => {
    const list = [...scrolledProducts];
    selectedProducts.forEach(sp => {
      if (!list.find(p => p.id === sp.id)) {
        list.unshift(sp);
      }
    });
    return list;
  }, [scrolledProducts, selectedProducts]);

  // Modal States
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);

  const [clientForm, setClientForm] = useState<Partial<Client>>({
    salutation: '',
    name: '',
    email: '',
    whatsapp: '',
    client_company_id: null,
  });

  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    category_id: null,
    unit_id: null,
    price: 0,
    description: '',
  });

  const [coProcessing, setCoProcessing] = useState(false);
  const [newCo, setNewCo] = useState({ name: '', category_id: '', address: '' });
  const [newCoCatName, setNewCoCatName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [topicInput, setTopicInput] = useState('');

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

        // Fetch selected products
        const productIds = pData.proforma_items.map((it: any) => it.product_id);
        if (productIds.length > 0) {
          const { data: prodData } = await supabase.from('products').select('*, product_units(*)').in('id', productIds);
          if (prodData) setSelectedProducts(prodData);
        }
      }
    }

    const [tRes, nRes, qRes, pfRes, catRes, unitRes, coRes, coCatRes] = await Promise.all([
      supabase.from('tax_settings').select('*').eq('company_id', company.id).eq('is_active', true).order('id'),
      supabase.from('autonumber_settings').select('*').eq('company_id', company.id).eq('document_type', 'proforma').maybeSingle(),
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

          // Fetch items products
          const productIds = qData.quotation_items.map((it: any) => it.product_id);
          if (productIds.length > 0) {
            const { data: prodData } = await supabase.from('products').select('*, product_units(*)').in('id', productIds);
            if (prodData) setSelectedProducts(prodData);
          }
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
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) setActiveRowIdx(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      
      // Ensure selected product is in the list
      setSelectedProducts(prev => {
        if (!prev.find(p => p.id === prod.id)) return [...prev, prod];
        return prev;
      });
    } else {
      item.productId = ''; item.description = ''; item.price = 0; item.unit = 'pcs';
    }
    item.total = item.qty * item.price;
    newItems[rowIdx] = item;
    setItems(newItems);
    setActiveRowIdx(null);
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
      setLoading(false);
    } catch (err: any) { setToast({ isOpen: true, message: err.message, type: 'error' }); setLoading(false); }
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
      // Fallback for other templates
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

  const handleSaveClient = async () => {
    if (!clientForm.name?.trim()) return;
    setIsProcessingQuick(true);
    try {
      const { data, error } = await supabase.from('clients').insert({
        company_id: company.id,
        salutation: clientForm.salutation,
        name: clientForm.name.trim(),
        client_company_id: clientForm.client_company_id,
        email: clientForm.email,
        whatsapp: clientForm.whatsapp ? `+62${clientForm.whatsapp.replace(/\D/g, '')}` : null
      }).select().single();
      if (error) throw error;
      await refreshClients();
      const freshSelect = await supabase.from('clients').select('*, client_company:client_companies(*)').eq('id', data.id).single();
      if (freshSelect.data) setSelectedClient(freshSelect.data);
      
      setClientId(String(data.id));
      setIsClientModalOpen(false);
      setClientForm({ salutation: '', name: '', client_company_id: null, email: '', whatsapp: '' });
    } catch (err: any) { setToast({ isOpen: true, message: err.message, type: 'error' }); } finally { setIsProcessingQuick(false); }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name?.trim() || !productForm.price) return;
    setIsProcessingQuick(true);
    try {
      const { data, error } = await supabase.from('products').insert({
        company_id: company.id,
        name: productForm.name.trim(),
        category_id: productForm.category_id,
        unit_id: productForm.unit_id,
        price: productForm.price,
        description: productForm.description
      }).select().single();
      if (error) throw error;
      await refreshProducts();
      const freshSelect = await supabase.from('products').select('*, product_units(*)').eq('id', data.id).single();
      if (freshSelect.data) setSelectedProducts(prev => [...prev, freshSelect.data]);
      
      setIsProductModalOpen(false);
      setProductForm({ name: '', category_id: null, unit_id: null, price: 0, description: '' });
    } catch (err: any) { setToast({ isOpen: true, message: err.message, type: 'error' }); } finally { setIsProcessingQuick(false); }
  };

  const handleQuickAddCo = async (coData: any) => {
    setCoProcessing(true);
    try {
      const { data, error } = await supabase.from('client_companies').insert({
        company_id: company.id,
        name: coData.name.trim(),
        category_id: parseInt(coData.category_id),
        address: coData.address
      }).select().single();
      if (error) throw error;
      const freshRes = await supabase.from('client_companies').select('*').eq('company_id', company.id).order('name');
      if (freshRes.data) setClientCompanies(freshRes.data);
      setClientForm((prev: Partial<Client>) => ({ ...prev, client_company_id: data.id }));
    } catch (err: any) { setToast({ isOpen: true, message: err.message, type: 'error' }); } finally { setCoProcessing(false); }
  };

  const handleQuickAddCoCat = async (catName: string) => {
    try {
      const { data, error } = await supabase.from('client_company_categories').insert({ company_id: company.id, name: catName.trim() }).select().single();
      if (error) throw error;
      setClientCategories((prev: ClientCompanyCategory[]) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data.id;
    } catch (err: any) { setToast({ isOpen: true, message: err.message, type: 'error' }); }
  };

  const handleQuickAddProdCat = async (catName: string) => {
    try {
      const { data, error } = await supabase.from('product_categories').insert({ company_id: company.id, name: catName.trim() }).select().single();
      if (error) throw error;
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data.id;
    } catch (err: any) { setToast({ isOpen: true, message: err.message, type: 'error' }); }
  };

  const handleQuickAddUnit = async (unitName: string) => {
    try {
      const { data, error } = await supabase.from('product_units').insert({ company_id: company.id, name: unitName.trim() }).select().single();
      if (error) throw error;
      setUnits(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data.id;
    } catch (err: any) { setToast({ isOpen: true, message: err.message, type: 'error' }); }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

  if (loading && !items.length) return <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white min-h-screen"><Loader2 className="animate-spin text-indigo-600" size={32} /><Subtext className="text-[10px]  uppercase  text-gray-400">Menyiapkan Proforma...</Subtext></div>;

  return (
    <div className="bg-[#F9FAFB] min-h-screen pb-24 font-sans relative">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-10 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate ? onNavigate('daftar_proforma') : router.push('/dashboard/sales/proformas')}
              className="!p-2 text-gray-400 hover:text-gray-900 border border-gray-100 lg:flex hidden"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <Breadcrumb
                items={[
                  { label: 'Proforma' },
                  { label: editingId ? 'Ubah Proforma' : 'Proforma Invoice Baru', active: true }
                ]}
              />
              <Subtext className="text-[11px] font-medium text-blue-600 uppercase  mt-0.5">{proformaNumber}</Subtext>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => onNavigate ? onNavigate('daftar_proforma') : router.push('/dashboard/sales/proformas')} className="text-gray-500">Batal</Button>
            {editingId && (
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
                  variant='danger'
                  leftIcon={<FileDown size={16} />}
                >
                  PDF
                </Button>
              </>
            )}
            <Button
              onClick={handleSave}
              isLoading={loading}
              disabled={!clientId}
              leftIcon={<Save size={16} />}
              variant='primary'>
              {editingId ? 'Update Proforma' : 'Simpan Proforma'}
            </Button>
          </div>
        </div>
      </div>

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
          <div className="overflow-visible">
            <Table className="overflow-visible">
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="w-1/3 py-3 text-[10px]">Produk</TableCell>
                  <TableCell isHeader className="py-3 text-[10px]">Deskripsi</TableCell>
                  <TableCell isHeader className="text-center w-20 py-3 text-[10px]">Qty</TableCell>
                  <TableCell isHeader className="text-center w-24 py-3 text-[10px]">Satuan</TableCell>
                  <TableCell isHeader className="text-right w-32 py-3 text-[10px]">Harga</TableCell>
                  <TableCell isHeader className="text-right w-36 py-3 text-[10px]">Jumlah</TableCell>
                  <TableCell isHeader className="w-10">{''}</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
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
                        onLoadMore={loadMoreProducts}
                        hasMore={hasMoreProducts}
                        isLoadingMore={isLoadingMoreProducts}
                        onSearchChange={setProductSearch}
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e: any) => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }}
                        className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-md outline-none focus:border-blue-500 transition-all font-medium"
                        placeholder="Detail spesifikasi..."
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e: any) => { const n = [...items]; n[idx].qty = Number(e.target.value); n[idx].total = n[idx].qty * n[idx].price; setItems(n); }}
                        className="w-full text-xs px-2 py-2 text-center font-bold bg-white border border-gray-200 rounded-md outline-none focus:border-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="w-full px-2 py-2 bg-gray-50 border border-gray-100 rounded-[4px] text-[10px] text-center text-gray-400 font-bold uppercase ">
                        {item.unit}
                      </div>
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e: any) => { const n = [...items]; n[idx].price = Number(e.target.value); n[idx].total = n[idx].qty * n[idx].price; setItems(n); }}
                        className="w-full text-xs px-3 py-2 text-right font-bold bg-white border border-gray-200 rounded-md outline-none focus:border-blue-500 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-700 text-sm whitespace-nowrap">
                      {formatIDRVal(item.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(idx)} className="!p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50">
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={handleAddItem} variant="ghost" size="sm" leftIcon={<Plus size={14} />} className="!text-[#4F46E5] hover:bg-indigo-50 font-bold  uppercase text-[10px]">
              Tambah Baris
            </Button>
          </div>
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
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <span className="text-xs font-bold text-gray-400 uppercase ">Subtotal</span>
              <span className="text-sm font-bold text-gray-900">{formatIDRVal(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-400 uppercase ">Diskon</span>
                <div className="flex bg-white rounded border border-gray-200 overflow-hidden shadow-sm h-11">
                  <ComboBox
                    value={discountType}
                    onChange={(val: string | number) => setDiscountType(val as any)}
                    className="!w-24"
                    options={[
                      { value: 'Rp', label: 'Rp' },
                      { value: '%', label: '%' },
                    ]}
                    hideSearch={true}
                    size="sm"
                    triggerClassName="!border-0 !h-full !rounded-none !ring-0 !px-4"
                  />
                  <div className="w-px bg-gray-200 h-6 my-auto" />
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e: any) => setDiscountValue(Number(e.target.value))}
                    className="!w-32 !px-3 font-bold !border-0 !h-full !rounded-none !ring-0 text-base"
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-rose-600">- {formatIDRVal(discountAmount)}</span>
            </div>

            <div className="space-y-4 border-b border-gray-50 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase ">Pajak</span>
                <div className="relative">
                  <ComboBox
                    placeholder="+ Tambah Pajak"
                    value=""
                    onChange={(val: string | number) => {
                      if (val) {
                        const id = Number(val);
                        setSelectedTaxIds(prev => prev.includes(id) ? prev : [...prev, id]);
                      }
                    }}
                    options={[
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTaxIds(prev => prev.filter(id => id !== tax.id))}
                      className="!p-1 text-gray-300 hover:text-rose-500 hover:bg-rose-50"
                    >
                      <X size={12} />
                    </Button>
                  </div>
                  <span>{formatIDRVal(tax.calculated_value)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 pb-6 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900 uppercase ">Grand Total</span>
              <span className="text-2xl font-bold text-blue-600">{formatIDRVal(total)}</span>
            </div>

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


      {/* Success Notification Toast */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />

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
