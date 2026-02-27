'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Input, Select, Textarea, Button, Table, TableHeader, TableBody, TableRow, TableCell, H3, Subtext, Label, Modal, Card, ComboBox, Breadcrumb, SectionHeader } from '@/components/ui';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Client, Product, Quotation, ProformaInvoice, TaxSetting,
  ProductCategory, ProductUnit, ClientCompany, ClientCompanyCategory,
  AutonumberSetting, Company
} from '@/lib/types';
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

const getImgDimensions = (url: string): Promise<{ width: number, height: number, element: HTMLImageElement }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve({ width: img.width, height: img.height, element: img });
    img.onerror = reject;
    img.src = url;
  });
};

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

  const [productSearch, setProductSearch] = useState('');
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

  // Quick Add States
  const [isQuickClientModalOpen, setIsQuickClientModalOpen] = useState(false);
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);
  const [quickClientForm, setQuickClientForm] = useState({ salutation: '', name: '', email: '', whatsapp: '', client_company_id: '' });
  const [quickProductForm, setQuickProductForm] = useState({ name: '', category_id: '', unit_id: '', price: 0, description: '' });

  // Quick Company/Category/Unit States
  const [isAddingCo, setIsAddingCo] = useState(false);
  const [newCo, setNewCo] = useState({ name: '', category_id: '', address: '' });
  const [coProcessing, setCoProcessing] = useState(false);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

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
      const { data: pData } = await supabase.from('proformas').select('*, proforma_items(*)').eq('id', editingId).single();
      if (pData) {
        existing = pData;
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

    const [cRes, pRes, tRes, nRes, qRes, pfRes, catRes, unitRes, coRes, coCatRes] = await Promise.all([
      supabase.from('clients').select('*, client_company:client_companies(*)').eq('company_id', company.id).order('name'),
      supabase.from('products').select('*, product_units(*)').eq('company_id', company.id).order('name'),
      supabase.from('tax_settings').select('*').eq('company_id', company.id).eq('is_active', true).order('id'),
      supabase.from('autonumber_settings').select('*').eq('company_id', company.id).eq('document_type', 'proforma').maybeSingle(),
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
      if (initialQuotationId) {
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
        const formattedNumber = generateFormattedNumber(nRes.data.format_pattern, actualNextNumber, nRes.data.digit_count || 4, 'PI');
        setProformaNumber(formattedNumber);
        const defTaxIds = tRes.data?.filter(t => t.is_default).map(t => t.id) || [];
        setSelectedTaxIds(defTaxIds);
      }
    } else {
      if (tRes.data && existing) {
        const taxNames = existing.tax_type?.split(', ').map((s: string) => s.trim()) || [];
        const taxIds = tRes.data.filter(t => taxNames.includes(t.name)).map(t => t.id);
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
      const taxLabels = selectedTaxesList.map(t => t.name).join(', ') || 'Non Pajak';
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
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
      setLoading(false);
    } catch (err: any) { alert(err.message); setLoading(false); }
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
      .eq('document_type', 'proforma')
      .maybeSingle();

    const templateId = templateSetting?.template_id || 'template1';
    const config = templateSetting?.config || {};

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const padX = 18;

    const safeNum = (val: any, fallback: number = 0) => {
      const n = Number(val);
      return Number.isFinite(n) ? n : fallback;
    };

    const safeText = (text: any, x: number, y: number, options?: any) => {
      doc.text(String(text || ''), safeNum(x), safeNum(y), options);
    };

    const safeRect = (x: number, y: number, w: number, h: number, style?: string) => {
      doc.rect(safeNum(x), safeNum(y), safeNum(w), safeNum(h), style);
    };

    if (templateId === 'template5') {
      const tealColor = '#2596BE';
      const gray2Color = '#9B9B9B';
      const rowTealColor = '#2596BE';
      const rowLightColor = '#F2F9FB';

      doc.setFontSize(8.5);
      doc.setTextColor(17, 17, 17);
      safeText(config.top_contact || '', pageWidth - padX, 10, { align: 'right' });

      const bannerHeight = 22;
      const startY = 18;

      const logoUrl = config.logo_url || company.logo_url;
      if (logoUrl) {
        try {
          const { width, height, element } = await getImgDimensions(logoUrl);
          const maxWidth = 60;
          const maxHeight = bannerHeight;
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          const finalWidth = width * ratio;
          const finalHeight = height * ratio;
          doc.addImage(element, 'PNG', safeNum(padX), safeNum(startY + (maxHeight - finalHeight) / 2), finalWidth, finalHeight, undefined, 'FAST');
        } catch (e) {
          doc.setFontSize(14); doc.setFont('helvetica', 'bold'); safeText(company.name, padX, startY + 12);
        }
      } else {
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); safeText(company.name, padX, startY + 12);
      }

      doc.setFillColor(tealColor);
      safeRect(pageWidth - 110, startY, 110, bannerHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(30);
      doc.setFont('helvetica', 'bold');
      safeText('PROFORMA', pageWidth - 100, startY + 15);

      doc.setTextColor(17, 17, 17);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      safeText('INVOICE TO:', padX, 55);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      safeText(p.client?.client_company?.name || 'PERORANGAN', padX, 62);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      safeText(`${p.client?.salutation || ''} ${p.client?.name || ''}`.trim(), padX, 68);

      const metaX = 130;
      safeText('PROFORMA NO', metaX, 55);
      safeText(':', metaX + 30, 55);
      safeText(p.number, metaX + 35, 55);
      safeText('DATE', metaX, 61);
      safeText(':', metaX + 30, 61);
      safeText(formatDateString(p.date), metaX + 35, 61);

      autoTable(doc, {
        startY: 95,
        head: [['Item / Description', 'Price', 'Qty', 'Total']],
        body: p.proforma_items?.map((it: any) => [
          `${it.products?.name || ''}\n${it.description || ''}`,
          formatIDRVal(it.price),
          `${it.qty} ${it.unit_name || ''}`,
          formatIDRVal(it.total)
        ]) || [],
        theme: 'plain',
        headStyles: { fillColor: tealColor, textColor: '#FFFFFF', fontSize: 11, fontStyle: 'bold', minCellHeight: 12, valign: 'middle', halign: 'left' },
        bodyStyles: { fillColor: rowLightColor, fontSize: 10, textColor: '#111111', minCellHeight: 14, valign: 'middle', halign: 'left' },
        alternateRowStyles: { fillColor: rowTealColor, textColor: '#FFFFFF' },
        columnStyles: { 0: { cellWidth: 100, cellPadding: { left: padX, top: 4, right: 4, bottom: 4 } }, 3: { cellPadding: { left: 4, top: 4, right: padX, bottom: 4 } } },
        margin: { left: 0, right: 0 },
        tableWidth: pageWidth
      });

      const finalY = safeNum((doc as any).lastAutoTable?.finalY, 150);
      safeText('Sub Total', 130, finalY + 10.5);
      safeText(formatIDRVal(p.subtotal), pageWidth - padX, finalY + 10.5, { align: 'right' });

      const grandTotalY = finalY + 18.5;
      doc.setFillColor(tealColor);
      safeRect(120, grandTotalY, 90, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      safeText('Grand Total', 130, grandTotalY + 6.5);
      safeText(formatIDRVal(p.total), pageWidth - padX, grandTotalY + 6.5, { align: 'right' });
    } else {
      doc.setFillColor('#4F46E5');
      safeRect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      safeText('PROFORMA INVOICE', 20, 25);
      autoTable(doc, {
        startY: 50,
        head: [['Produk', 'Deskripsi', 'Qty', 'Harga', 'Total']],
        body: items.map(it => [String(it.productId ? products.find(p => p.id.toString() === it.productId)?.name : ''), String(it.description || ''), `${it.qty} ${it.unit || ''}`, formatIDRVal(it.price), formatIDRVal(it.total)]) || [],
        theme: 'striped',
        headStyles: { fillColor: '#4F46E5' }
      });
    }

    doc.save(`${p.number}.pdf`);
  };

  // --- Quick Add Handlers ---

  const handleQuickAddClient = async () => {
    if (!quickClientForm.name.trim()) return;
    setIsProcessingQuick(true);
    try {
      const { data, error } = await supabase.from('clients').insert({
        company_id: company.id,
        salutation: quickClientForm.salutation,
        name: quickClientForm.name.trim(),
        client_company_id: quickClientForm.client_company_id ? parseInt(quickClientForm.client_company_id) : null,
        email: quickClientForm.email,
        whatsapp: quickClientForm.whatsapp
      }).select().single();
      if (error) throw error;
      const freshRes = await supabase.from('clients').select('*, client_company:client_companies(*)').eq('company_id', company.id).order('name');
      if (freshRes.data) setClients(freshRes.data);
      setClientId(String(data.id));
      setIsQuickClientModalOpen(false);
      setQuickClientForm({ salutation: '', name: '', client_company_id: '', email: '', whatsapp: '' }); // Reset form
    } catch (err: any) { alert(err.message); } finally { setIsProcessingQuick(false); }
  };

  const handleQuickAddProduct = async () => {
    if (!quickProductForm.name.trim() || !quickProductForm.price) return;
    setIsProcessingQuick(true);
    try {
      const { data, error } = await supabase.from('products').insert({
        company_id: company.id,
        name: quickProductForm.name.trim(),
        category_id: quickProductForm.category_id ? parseInt(quickProductForm.category_id) : null,
        unit_id: quickProductForm.unit_id ? parseInt(quickProductForm.unit_id) : null,
        price: quickProductForm.price,
        description: quickProductForm.description
      }).select().single();
      if (error) throw error;
      const freshRes = await supabase.from('products').select('*, product_units(*)').eq('company_id', company.id).order('name');
      if (freshRes.data) setProducts(freshRes.data);
      setIsQuickProductModalOpen(false);
    } catch (err: any) { alert(err.message); } finally { setIsProcessingQuick(false); }
  };

  const handleQuickAddCo = async () => {
    if (!newCo.name.trim() || !newCo.category_id) return;
    setCoProcessing(true);
    try {
      const { data, error } = await supabase.from('client_companies').insert({
        company_id: company.id,
        name: newCo.name.trim(),
        category_id: parseInt(newCo.category_id),
        address: newCo.address
      }).select().single();
      if (error) throw error;
      const freshRes = await supabase.from('client_companies').select('*').eq('company_id', company.id).order('name');
      if (freshRes.data) setClientCompanies(freshRes.data);
      setQuickClientForm(prev => ({ ...prev, client_company_id: String(data.id) }));
      setIsAddingCo(false);
      setNewCo({ name: '', category_id: '', address: '' }); // Reset form
    } catch (err: any) { alert(err.message); } finally { setCoProcessing(false); }
  };

  const handleQuickAddCat = async () => {
    if (!newCatName.trim()) return;
    try {
      const { data, error } = await supabase.from('product_categories').insert({ company_id: company.id, name: newCatName.trim() }).select().single();
      if (error) throw error;
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setQuickProductForm(prev => ({ ...prev, category_id: String(data.id) }));
      setIsAddingCat(false);
      setNewCatName(''); // Reset form
    } catch (err: any) { alert(err.message); }
  };

  const handleQuickAddUnit = async () => {
    if (!newUnitName.trim()) return;
    try {
      const { data, error } = await supabase.from('product_units').insert({ company_id: company.id, name: newUnitName.trim() }).select().single();
      if (error) throw error;
      setUnits(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setQuickProductForm(prev => ({ ...prev, unit_id: String(data.id) }));
      setIsAddingUnit(false);
      setNewUnitName(''); // Reset form
    } catch (err: any) { alert(err.message); }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

  if (loading && !items.length) return <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white min-h-screen"><Loader2 className="animate-spin text-indigo-600" size={32} /><Subtext className="text-[10px]  uppercase tracking-tight text-gray-400">Menyiapkan Proforma...</Subtext></div>;

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
              <Subtext className="text-[11px] font-medium text-blue-600 uppercase tracking-tight mt-0.5">{proformaNumber}</Subtext>
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
              onAddNew={() => setIsQuickClientModalOpen(true)}
              leftIcon={<User size={16} />}
            />
            <Input label="Nomor Proforma" value={proformaNumber} onChange={(e: any) => setProformaNumber(e.target.value)} />
            <div className="space-y-1.5">
              <Label className="ml-1">Status</Label>
              <Select value={status} onChange={(e: any) => setStatus(e.target.value)}>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Paid">Paid</option>
              </Select>
            </div>
            <Input type="date" label="Tanggal" value={date} onChange={(e: any) => setDate(e.target.value)} />
            <Input type="date" label="Batas Pembayaran" value={dueDate} onChange={(e: any) => setDueDate(e.target.value)} />
            <div className="space-y-1.5">
              <Label className="ml-1">Referensi Penawaran</Label>
              <Select value={quotationId || ''} onChange={(e: any) => setQuotationId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">-- Tanpa Referensi --</option>
                {quotations.map(q => (<option key={q.id} value={q.id}>{q.number}</option>))}
              </Select>
            </div>
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
                        onAddNew={() => setIsQuickProductModalOpen(true)}
                        addNewLabel="Daftar Produk Baru"
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
                      <div className="w-full px-2 py-2 bg-gray-50 border border-gray-100 rounded-[4px] text-[10px] text-center text-gray-400 font-bold uppercase tracking-tight">
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
          <Button onClick={handleAddItem} variant="ghost" size="sm" leftIcon={<Plus size={14} />} className="mt-4 !text-[#4F46E5] hover:bg-indigo-50 font-bold tracking-tight uppercase text-[10px]">
            Tambah Baris
          </Button>
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
              <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Subtotal</span>
              <span className="text-sm font-bold text-gray-900">{formatIDRVal(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Diskon</span>
                <div className="flex bg-white rounded border border-gray-200 overflow-hidden shadow-sm h-11">
                  <Select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value as any)}
                    className="!bg-gray-50 !px-2 !border-0 !border-r !rounded-none !h-full text-[10px] font-bold uppercase cursor-pointer"
                  >
                    <option value="Rp">Rp</option>
                    <option value="%">%</option>
                  </Select>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e: any) => setDiscountValue(Number(e.target.value))}
                    className="!w-20 !px-3 font-bold !border-0 !h-full !rounded-none"
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-rose-600">- {formatIDRVal(discountAmount)}</span>
            </div>

            <div className="space-y-4 border-b border-gray-50 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Pajak</span>
                <div className="relative">
                  <Select
                    value=""
                    onChange={(e: any) => { if (e.target.value) { const id = Number(e.target.value); setSelectedTaxIds(prev => prev.includes(id) ? prev : [...prev, id]); } }}
                    className="!py-1.5 !px-4 text-[10px]"
                  >
                    <option value="">+ Tambah Pajak</option>
                    {availableTaxes.filter(t => !selectedTaxIds.includes(t.id)).map(tax => (<option key={tax.id} value={tax.id}>{tax.name} ({tax.rate}%)</option>))}
                  </Select>
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
              <span className="text-sm font-bold text-gray-900 uppercase tracking-tight">Grand Total</span>
              <span className="text-2xl font-bold text-blue-600">{formatIDRVal(total)}</span>
            </div>

            <Button
              onClick={handleSave}
              isLoading={loading}
              disabled={!clientId}
              variant="primary"
              className="w-full py-3 text-sm font-bold uppercase tracking-wider"
              leftIcon={<Save size={16} />}
            >
              {editingId ? 'Update Proforma' : 'Simpan Proforma'}
            </Button>
          </Card>
        </div>
      </div>

      {/* QUICK ADD MODALS */}

      <Modal
        isOpen={isQuickClientModalOpen}
        onClose={() => setIsQuickClientModalOpen(false)}
        title="Daftarkan Pelanggan Baru"
        size="lg"
        footer={<Button onClick={handleQuickAddClient} disabled={isProcessingQuick} leftIcon={isProcessingQuick ? <Loader2 className="animate-spin" size={14} /> : undefined} className="uppercase tracking-tight">Simpan & Pilih</Button>}
      >
        <div className="space-y-8 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="ml-1">Sapaan</Label>
              <Select value={quickClientForm.salutation} onChange={(e: any) => setQuickClientForm({ ...quickClientForm, salutation: e.target.value })}>
                <option value="">Pilih</option>
                <option value="Bapak">Bapak</option>
                <option value="Ibu">Ibu</option>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Input label="Nama Lengkap*" value={quickClientForm.name} onChange={(e: any) => setQuickClientForm({ ...quickClientForm, name: e.target.value })} placeholder="John Doe..." />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[10px]  text-gray-400 uppercase tracking-tight">Pilih Perusahaan Client</Label>
              <Button onClick={() => setIsAddingCo(!isAddingCo)} className="text-[9px]  text-blue-600 uppercase hover:underline">{isAddingCo ? 'Batal' : '+ Perusahaan Baru'}</Button>
            </div>
            {isAddingCo ? (
              <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Nama Perusahaan*" placeholder="Nama PT..." value={newCo.name} onChange={(e: any) => setNewCo({ ...newCo, name: e.target.value })} />
                  <div className="space-y-2">
                    <Label className="ml-1">Kategori*</Label>
                    <Select value={newCo.category_id} onChange={(e: any) => setNewCo({ ...newCo, category_id: e.target.value })}>
                      <option value="">Pilih Kategori</option>
                      {clientCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </div>
                </div>
                <Input label="Alamat Perusahaan*" placeholder="Alamat lengkap..." value={newCo.address} onChange={(e: any) => setNewCo({ ...newCo, address: e.target.value })} />
                <Button onClick={handleQuickAddCo} disabled={coProcessing} className="w-full uppercase tracking-tight mt-2" leftIcon={coProcessing ? <Loader2 size={12} className="animate-spin" /> : <Save size={14} />}>
                  SIMPAN PERUSAHAAN
                </Button>
              </div>
            ) : (
              <Select value={quickClientForm.client_company_id} onChange={(e: any) => setQuickClientForm({ ...quickClientForm, client_company_id: e.target.value })}>
                <option value="">Personal / Tanpa Perusahaan</option>
                {clientCompanies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
              </Select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Input type="email" label="Email" value={quickClientForm.email} onChange={(e: any) => setQuickClientForm({ ...quickClientForm, email: e.target.value })} placeholder="email@client.com" />
            </div>
            <div className="space-y-2">
              <Input label="WhatsApp" value={quickClientForm.whatsapp} onChange={(e: any) => setQuickClientForm({ ...quickClientForm, whatsapp: e.target.value })} placeholder="08..." />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isQuickProductModalOpen}
        onClose={() => setIsQuickProductModalOpen(false)}
        title="Daftarkan Produk Baru"
        size="lg"
        footer={<Button onClick={handleQuickAddProduct} disabled={isProcessingQuick} className="uppercase tracking-tight">Simpan Produk</Button>}
      >
        <div className="space-y-8 py-2">
          <Input label="Nama Produk / Jasa*" value={quickProductForm.name} onChange={(e: any) => setQuickProductForm({ ...quickProductForm, name: e.target.value })} placeholder="Misal: Paket Langganan Pro..." />
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <Label>Kategori</Label>
                <Button type="button" onClick={() => setIsAddingCat(!isAddingCat)} className="text-[9px]  text-blue-600 uppercase hover:underline">{isAddingCat ? 'Batal' : '+ Baru'}</Button>
              </div>
              {isAddingCat ? (
                <div className="flex gap-2 items-center">
                  <Input autoFocus placeholder="Kategori baru..." value={newCatName} onChange={(e: any) => setNewCatName(e.target.value)} className="w-full" />
                  <Button onClick={handleQuickAddCat} className="!px-3 !py-2.5 h-[42px]"><CheckIcon size={16} /></Button>
                </div>
              ) : (
                <Select value={quickProductForm.category_id} onChange={(e: any) => setQuickProductForm({ ...quickProductForm, category_id: e.target.value })}>
                  <option value="">Pilih</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <Label>Satuan</Label>
                <Button type="button" onClick={() => setIsAddingUnit(!isAddingUnit)} className="text-[9px]  text-blue-600 uppercase hover:underline">{isAddingUnit ? 'Batal' : '+ Baru'}</Button>
              </div>
              {isAddingUnit ? (
                <div className="flex gap-2 items-center">
                  <Input autoFocus placeholder="Satuan baru..." value={newUnitName} onChange={(e: any) => setNewUnitName(e.target.value)} className="w-full" />
                  <Button onClick={handleQuickAddUnit} className="!px-3 !py-2.5 h-[42px]"><CheckIcon size={16} /></Button>
                </div>
              ) : (
                <Select value={quickProductForm.unit_id} onChange={(e: any) => setQuickProductForm({ ...quickProductForm, unit_id: e.target.value })}>
                  <option value="">Pilih</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              )}
            </div>
          </div>
          <Input type="number" label="Harga Jual (IDR)*" value={quickProductForm.price} onChange={(e: any) => setQuickProductForm({ ...quickProductForm, price: Number(e.target.value) })} placeholder="0" />
          <div className="space-y-2">
            <Label className="ml-1">Deskripsi</Label>
            <Textarea value={quickProductForm.description} onChange={(e: any) => setQuickProductForm({ ...quickProductForm, description: e.target.value })} className="h-32 resize-none" placeholder="Detail produk..." />
          </div>
        </div>
      </Modal>

      {/* Success Notification Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] fade-in duration-500">
          <div className="bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500">
            <CheckCircle2 size={20} />
            <Label className="text-sm  uppercase tracking-tight">Data Proforma Berhasil Disimpan</Label>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
};
