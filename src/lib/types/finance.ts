import type { Profile } from './auth';
import type { Client } from './client';
import type { Product } from './product';
import type { UrgencyLevel } from './system';

export interface QuotationItem {
  id: number;
  quotation_id: number;
  product_id?: number | null;
  description?: string;
  qty: number;
  unit_name?: string;
  price: number;
  total: number;
  products?: Product;
}

export interface Quotation {
  id: number;
  company_id: number;
  client_id: number;
  deal_id?: number | null;
  number: string;
  status: string;
  date: string;
  expiry_date: string;
  notes?: string;
  subtotal: number;
  discount_type: 'Rp' | '%';
  discount_value: number;
  tax_type?: string;
  tax_value: number;
  total: number;
  created_at: string;
  client?: Client;
  quotation_items?: QuotationItem[];
}

export interface ProformaItem {
  id: number;
  proforma_id: number;
  product_id?: number | null;
  description?: string;
  qty: number;
  unit_name?: string;
  price: number;
  total: number;
  products?: Product;
}

export interface ProformaInvoice {
  id: number;
  company_id: number;
  client_id: number;
  quotation_id?: number | null;
  number: string;
  status: string;
  date: string;
  due_date: string;
  notes?: string;
  subtotal: number;
  discount_type: 'Rp' | '%';
  discount_value: number;
  tax_type?: string;
  tax_value: number;
  total: number;
  created_at: string;
  client?: Client;
  proforma_items?: ProformaItem[];
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  product_id?: number | null;
  description?: string;
  qty: number;
  unit_name?: string;
  price: number;
  total: number;
  products?: Product;
}

export interface Invoice {
  id: number;
  company_id: number;
  client_id: number;
  proforma_id?: number | null;
  quotation_id?: number | null;
  number: string;
  status: string;
  date: string;
  due_date: string;
  notes?: string;
  subtotal: number;
  discount_type: 'Rp' | '%';
  discount_value: number;
  tax_type?: string;
  tax_value: number;
  total: number;
  created_at: string;
  client?: Client;
  invoice_items?: InvoiceItem[];
}

export interface InvoiceRequest {
  id: number;
  company_id: number;
  requester_id: string;
  client_id: number;
  quotation_id?: number | null;
  proforma_id?: number | null;
  invoice_id?: number | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  created_at: string;
  is_urgent?: boolean;
  urgency_id?: number | null;
  profile?: Profile;
  client?: Client;
  quotation?: { number: string };
  proforma?: { number: string };
  invoice?: { id: number, number: string };
  urgency_level?: UrgencyLevel;
}

export interface KwitansiItem {
  id: number;
  kwitansi_id: number;
  product_id?: number | null;
  description?: string;
  qty: number;
  unit_name?: string;
  price: number;
  total: number;
  products?: Product;
}

export interface Kwitansi {
  id: number;
  company_id: number;
  client_id: number;
  invoice_id?: number | null;
  number: string;
  status: string;
  date: string;
  notes?: string;
  subtotal: number;
  discount_type: 'Rp' | '%';
  discount_value: number;
  tax_type?: string;
  tax_value: number;
  total: number;
  created_at: string;
  client?: Client;
  kwitansi_items?: KwitansiItem[];
}

export interface KwitansiRequest {
  id: number;
  company_id: number;
  requester_id: string;
  client_id: number;
  invoice_id?: number | null;
  proforma_id?: number | null;
  kwitansi_id?: number | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  created_at: string;
  is_urgent?: boolean;
  urgency_id?: number | null;
  profile?: Profile;
  client?: Client;
  invoice?: { id: number, number: string };
  proforma?: { id: number, number: string };
  kwitansi?: { id: number, number: string };
  urgency_level?: UrgencyLevel;
}
