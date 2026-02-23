'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Client, Product, ProformaInvoice, ProformaItem, TaxSetting, ProductCategory, ProductUnit, ClientCompany, ClientCompanyCategory, Quotation, AutonumberSetting } from '@/lib/types';
import { 
  ArrowLeft, Save, Plus, Trash2, Calendar, FileCheck, 
  User, ChevronDown, Package, Loader2, CheckCircle2, X, AlertCircle, Tags, Weight,
  Building, Mail, Phone, Search, FileText, Check as CheckIcon, FileDown
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import { Select } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Label, H3, Subtext, SectionHeader } from '@/components/ui/Typography';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRouter } from 'next/navigation';

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
  
  const [clientSearch, setClientSearch] = useState('');
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);

  const clientDropdownRef = useRef<HTMLDivElement>(null);
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
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) setIsClientSearchOpen(false);
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
        body: p.proforma_items?.map((it: any) => [String(it.products?.name || ''), String(it.description || ''), `${it.qty} ${it.unit_name || ''}`, formatIDRVal(it.price), formatIDRVal(it.total)]) || [],
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
    } catch (err: any) { alert(err.message); }
  };

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.client_company?.name || '').toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clients, clientSearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

  if (loading && !items.length) return <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white min-h-screen"><Loader2 className="animate-spin text-indigo-600" size={32} /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Menyiapkan Proforma...</p></div>;

  return (
    <div className="bg-[#F9FAFB] min-h-screen pb-24 font-inter relative">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-10 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
           <div className="flex items-center gap-5">
              <button onClick={() => onNavigate ? onNavigate('daftar_proforma') : router.push('/dashboard/sales/proformas')} className="p-2 text-gray-400 hover:text-gray-900 border border-gray-100 rounded-lg hover:bg-gray-50 transition-all"><ArrowLeft size={20} /></button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">{editingId ? 'Ubah Proforma' : 'Proforma Invoice Baru'}</h1>
                <p className="text-[11px] font-medium text-indigo-600 uppercase tracking-widest mt-0.5">{proformaNumber}</p>
              </div>
           </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => onNavigate ? onNavigate('daftar_proforma') : router.push('/dashboard/sales/proformas')}>Batal</Button>
              {editingId && (
                <Button 
                  onClick={handleDownloadPDF}
                  variant="secondary"
                  leftIcon={<FileDown size={16} />}
                  className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  PDF
                </Button>
              )}
              <Button onClick={handleSave} disabled={loading} leftIcon={loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}>
                {editingId ? 'Update Proforma' : 'Simpan Proforma'}
              </Button>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-10 py-8 space-y-6">
         <Card className="p-8">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><FileCheck size={18} /></div>
               <H3 className="!normal-case !tracking-tight text-gray-800">Detail Proforma</H3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
               <div className="space-y-1.5 relative" ref={clientDropdownRef}>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Pelanggan <span className="text-rose-500">*</span></label>
                  <button onClick={() => setIsClientSearchOpen(!isClientSearchOpen)} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg font-medium text-sm text-left flex justify-between items-center group relative shadow-sm transition-all focus:border-indigo-500">
                    <div className="absolute left-3.5 flex items-center justify-center h-full top-0"><User className="text-gray-300" size={16} /></div>
                    <span className="truncate">{clientId ? clients.find(c => c.id.toString() === clientId)?.name : 'Pilih Pelanggan'}</span>
                    <ChevronDown className="text-gray-300" size={16} />
                  </button>
                  {isClientSearchOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="p-3 border-b border-gray-50">
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                            <input autoFocus type="text" placeholder="Cari nama..." value={clientSearch} onChange={(e: any) => setClientSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg text-xs font-bold outline-none" />
                         </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                         {filteredClients.map(c => (
                          <button key={c.id} onClick={() => { setClientId(c.id.toString()); setIsClientSearchOpen(false); }} className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex flex-col gap-0.5 border-b border-gray-50 last:border-none">
                             <span className="text-[11px] font-bold text-gray-900">{c.name}</span>
                             <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter italic">{c.client_company?.name || 'Personal'}</span>
                          </button>
                        ))}
                        <Button variant="ghost" onClick={() => { setIsQuickClientModalOpen(true); setIsClientSearchOpen(false); }} className="w-full !p-3 justify-start text-blue-600 !text-[10px] uppercase tracking-widest hover:bg-blue-50 sticky bottom-0 bg-white border-t border-blue-50">
                           + Tambah Pelanggan Baru
                        </Button>
                      </div>
                    </div>
                  )}
               </div>
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
            <div className="flex items-center gap-3 mb-8">
               <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Package size={18} /></div>
               <H3 className="!normal-case !tracking-tight text-gray-800">Daftar Item Tagihan</H3>
            </div>
            <Table>
               <TableHeader className="bg-gray-50/30">
                  <TableRow>
                     <TableCell className="text-[10px] font-bold text-gray-400 uppercase w-1/4 border-b">Produk</TableCell>
                     <TableCell className="text-[10px] font-bold text-gray-400 uppercase border-b">Deskripsi</TableCell>
                     <TableCell className="text-[10px] font-bold text-gray-400 uppercase text-center w-24 border-b">Qty</TableCell>
                     <TableCell className="text-[10px] font-bold text-gray-400 uppercase text-center w-24 border-b">Satuan</TableCell>
                     <TableCell className="text-[10px] font-bold text-gray-400 uppercase text-right w-40 border-b">Harga</TableCell>
                     <TableCell className="text-[10px] font-bold text-gray-400 uppercase text-right w-40 border-b">Jumlah</TableCell>
                     <TableCell className="w-12 border-b">{null}</TableCell>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                       <TableCell className="px-8 py-5 relative">
                         <div ref={idx === activeRowIdx ? productDropdownRef : null}>
                            <button onClick={() => { setActiveRowIdx(idx === activeRowIdx ? null : idx); setProductSearch(''); }} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded text-xs text-left truncate flex items-center justify-between shadow-sm">
                            <span>{item.productId ? products.find(p => p.id.toString() === item.productId)?.name : 'Pilih Produk'}</span>
                            <ChevronDown size={14} className="text-gray-300" />
                         </button>
                         {activeRowIdx === idx && (
                           <div className="absolute top-full left-8 right-8 bg-white border border-gray-100 shadow-xl z-50 rounded-lg overflow-hidden mt-1 bg-white">
                              <div className="p-2 border-b border-gray-50 bg-gray-50">
                                 <Input autoFocus placeholder="Cari..." value={productSearch} onChange={(e: any) => setProductSearch(e.target.value)} className="!py-1.5 !text-xs" />
                              </div>
                              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                 {filteredProducts.map(p => (
                                   <button key={p.id} onClick={() => handleSelectProduct(idx, p)} className="w-full px-4 py-2.5 text-left text-xs hover:bg-indigo-50 border-b border-gray-50 last:border-none flex items-center justify-between">
                                      <span className="font-bold">{p.name}</span>
                                      <span className="text-[10px] text-gray-400">{formatIDRVal(p.price)}</span>
                                   </button>
                                 ))}
                                 <button onClick={() => { setIsQuickProductModalOpen(true); setActiveRowIdx(null); }} className="w-full p-2.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest">+ Daftar Produk Baru</button>
                              </div>
                           </div>
                         )}
                         </div>
                      </TableCell>
                      <TableCell><Input value={item.description} onChange={(e: any) => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }} placeholder="Detail spesifikasi..." className="!py-2 !text-xs" /></TableCell>
                      <TableCell><Input type="number" value={item.qty} onChange={(e: any) => { const n = [...items]; n[idx].qty = Number(e.target.value); n[idx].total = n[idx].qty * n[idx].price; setItems(n); }} className="!py-2 !text-xs text-center font-bold" /></TableCell>
                      <TableCell><div className="w-full px-2 py-2 bg-gray-50 border border-gray-100 rounded text-xs text-center text-gray-400 font-bold uppercase tracking-widest">{item.unit}</div></TableCell>
                      <TableCell><Input type="number" value={item.price} onChange={(e: any) => { const n = [...items]; n[idx].price = Number(e.target.value); n[idx].total = n[idx].qty * n[idx].price; setItems(n); }} className="!py-2 !text-xs text-right font-bold" /></TableCell>
                      <TableCell className="text-right font-bold text-indigo-700 text-sm">Rp {formatIDRVal(item.total)}</TableCell>
                      <TableCell className="text-center"><button onClick={() => handleRemoveItem(idx)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button></TableCell>
                    </TableRow>
                  ))}
               </TableBody>
            </Table>
            <Button variant="ghost" onClick={handleAddItem} leftIcon={<Plus size={16} />} className="mt-6 text-indigo-600 hover:bg-indigo-50 !text-[11px] uppercase tracking-widest font-bold">Tambah Baris</Button>
         </Card>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-8 space-y-4">
               <Label>Syarat & Ketentuan</Label>
               <Textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} className="h-44 resize-none" placeholder="Informasi rekening pembayaran, dll..." />
            </Card>
            <Card className="p-8 space-y-5">
               <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Subtotal</span>
                  <span className="text-sm font-bold text-gray-900">{formatIDRVal(subtotal)}</span>
               </div>
               <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                  <div className="flex items-center gap-4">
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Diskon</span>
                     <div className="flex items-center border border-gray-200 rounded overflow-hidden h-9 w-32">
                        <select value={discountType} onChange={(e: any) => setDiscountType(e.target.value as any)} className="bg-gray-50 h-full px-2 border-r text-[10px] font-bold uppercase outline-none" style={{ WebkitAppearance: 'none' }}><option value="Rp">Rp</option><option value="%">%</option></select>
                        <input type="number" value={discountValue} onChange={(e: any) => setDiscountValue(Number(e.target.value))} className="w-full h-full px-2 text-xs font-bold outline-none" />
                     </div>
                  </div>
                  <span className="text-sm font-bold text-rose-600">- {formatIDRVal(discountAmount)}</span>
               </div>

               <div className="space-y-4 border-b border-gray-50 pb-4">
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pajak</span>
                     <div className="relative w-40">
                        <Select value="" onChange={(e: any) => { if(e.target.value) { const id = Number(e.target.value); setSelectedTaxIds(prev => prev.includes(id) ? prev : [...prev, id]); } }} className="!text-[10px] uppercase tracking-widest">
                           <option value="">+ Tambah Pajak</option>
                           {availableTaxes.filter(t => !selectedTaxIds.includes(t.id)).map(tax => (<option key={tax.id} value={tax.id}>{tax.name} ({tax.rate}%)</option>))}
                        </Select>
                     </div>
                  </div>
                  {selectedTaxesList.map(tax => (
                    <div key={tax.id} className="flex items-center justify-between pl-4 text-[11px] font-bold text-gray-700">
                       <div className="flex items-center gap-2">
                          <span>{tax.name} ({tax.rate}%)</span>
                          <button onClick={() => setSelectedTaxIds(prev => prev.filter(id => id !== tax.id))} className="p-1 hover:bg-rose-50 text-rose-400 rounded transition-colors"><X size={12} /></button>
                       </div>
                       <span className="text-gray-900">{formatIDRVal(tax.calculated_value)}</span>
                    </div>
                  ))}
               </div>

               <div className="pt-2 pb-6 flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900 uppercase tracking-widest">Grand Total</span>
                  <span className="text-2xl font-bold text-indigo-600">{formatIDRVal(total)}</span>
               </div>

               <Button 
                  onClick={handleSave} 
                  disabled={loading || !clientId}
                  className="w-full uppercase tracking-widest"
                  leftIcon={loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
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
        footer={<Button onClick={handleQuickAddClient} disabled={isProcessingQuick} leftIcon={isProcessingQuick ? <Loader2 className="animate-spin" size={14} /> : undefined} className="uppercase tracking-widest">Simpan & Pilih</Button>}
      >
        <div className="space-y-8 py-2">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                 <Label className="ml-1">Sapaan</Label>
                 <Select value={quickClientForm.salutation} onChange={(e: any) => setQuickClientForm({...quickClientForm, salutation: e.target.value})}>
                    <option value="">Pilih</option>
                    <option value="Bapak">Bapak</option>
                    <option value="Ibu">Ibu</option>
                 </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                 <Input label="Nama Lengkap*" value={quickClientForm.name} onChange={(e: any) => setQuickClientForm({...quickClientForm, name: e.target.value})} placeholder="John Doe..." />
              </div>
           </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                 <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Perusahaan Client</label>
                 <button onClick={() => setIsAddingCo(!isAddingCo)} className="text-[9px] font-bold text-blue-600 uppercase hover:underline">{isAddingCo ? 'Batal' : '+ Perusahaan Baru'}</button>
              </div>
              {isAddingCo ? (
                 <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <Input label="Nama Perusahaan*" placeholder="Nama PT..." value={newCo.name} onChange={(e: any) => setNewCo({...newCo, name: e.target.value})} />
                       <div className="space-y-2">
                          <Label className="ml-1">Kategori*</Label>
                          <Select value={newCo.category_id} onChange={(e: any) => setNewCo({...newCo, category_id: e.target.value})}>
                             <option value="">Pilih Kategori</option>
                             {clientCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </Select>
                       </div>
                    </div>
                    <Input label="Alamat Perusahaan*" placeholder="Alamat lengkap..." value={newCo.address} onChange={(e: any) => setNewCo({...newCo, address: e.target.value})} />
                    <Button onClick={handleQuickAddCo} disabled={coProcessing} className="w-full uppercase tracking-widest mt-2" leftIcon={coProcessing ? <Loader2 size={12} className="animate-spin" /> : <Save size={14} />}>
                      SIMPAN PERUSAHAAN
                    </Button>
                 </div>
              ) : (
                <Select value={quickClientForm.client_company_id} onChange={(e: any) => setQuickClientForm({...quickClientForm, client_company_id: e.target.value})}>
                    <option value="">Personal / Tanpa Perusahaan</option>
                    {clientCompanies.map(co => <option key={co.id} value={co.id}>{co.name}</option>)}
                </Select>
              )}
           </div>
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <Input type="email" label="Email" value={quickClientForm.email} onChange={(e: any) => setQuickClientForm({...quickClientForm, email: e.target.value})} placeholder="email@client.com" />
              </div>
              <div className="space-y-2">
                 <Input label="WhatsApp" value={quickClientForm.whatsapp} onChange={(e: any) => setQuickClientForm({...quickClientForm, whatsapp: e.target.value})} placeholder="08..." />
              </div>
           </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isQuickProductModalOpen} 
        onClose={() => setIsQuickProductModalOpen(false)} 
        title="Daftarkan Produk Baru"
        size="lg"
        footer={<Button onClick={handleQuickAddProduct} disabled={isProcessingQuick} className="uppercase tracking-widest">Simpan Produk</Button>}
      >
        <div className="space-y-8 py-2">
           <Input label="Nama Produk / Jasa*" value={quickProductForm.name} onChange={(e: any) => setQuickProductForm({...quickProductForm, name: e.target.value})} placeholder="Misal: Paket Langganan Pro..." />
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <div className="flex items-center justify-between px-1">
                    <Label>Kategori</Label>
                    <button type="button" onClick={() => setIsAddingCat(!isAddingCat)} className="text-[9px] font-bold text-blue-600 uppercase hover:underline">{isAddingCat ? 'Batal' : '+ Baru'}</button>
                 </div>
                 {isAddingCat ? (
                    <div className="flex gap-2 items-center">
                       <Input autoFocus placeholder="Kategori baru..." value={newCatName} onChange={(e: any) => setNewCatName(e.target.value)} className="w-full" />
                       <Button onClick={handleQuickAddCat} className="!px-3 !py-2.5 h-[42px]"><CheckIcon size={16} /></Button>
                    </div>
                 ) : (
                    <Select value={quickProductForm.category_id} onChange={(e: any) => setQuickProductForm({...quickProductForm, category_id: e.target.value})}>
                        <option value="">Pilih</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                 )}
              </div>
              <div className="space-y-2">
                 <div className="flex items-center justify-between px-1">
                    <Label>Satuan</Label>
                    <button type="button" onClick={() => setIsAddingUnit(!isAddingUnit)} className="text-[9px] font-bold text-blue-600 uppercase hover:underline">{isAddingUnit ? 'Batal' : '+ Baru'}</button>
                 </div>
                 {isAddingUnit ? (
                    <div className="flex gap-2 items-center">
                       <Input autoFocus placeholder="Satuan baru..." value={newUnitName} onChange={(e: any) => setNewUnitName(e.target.value)} className="w-full" />
                       <Button onClick={handleQuickAddUnit} className="!px-3 !py-2.5 h-[42px]"><CheckIcon size={16} /></Button>
                    </div>
                 ) : (
                    <Select value={quickProductForm.unit_id} onChange={(e: any) => setQuickProductForm({...quickProductForm, unit_id: e.target.value})}>
                        <option value="">Pilih</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </Select>
                 )}
              </div>
           </div>
           <Input type="number" label="Harga Jual (IDR)*" value={quickProductForm.price} onChange={(e: any) => setQuickProductForm({...quickProductForm, price: Number(e.target.value)})} placeholder="0" />
           <div className="space-y-2">
              <Label className="ml-1">Deskripsi</Label>
              <Textarea value={quickProductForm.description} onChange={(e: any) => setQuickProductForm({...quickProductForm, description: e.target.value})} className="h-32 resize-none" placeholder="Detail produk..." />
           </div>
        </div>
      </Modal>

      {/* Success Notification Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] fade-in duration-500">
           <div className="bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500">
              <CheckCircle2 size={20} />
              <span className="text-sm font-bold uppercase tracking-widest">Data Proforma Berhasil Disimpan</span>
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
