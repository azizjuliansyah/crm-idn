import { z } from 'zod';

// --- Common / Shared ---
export const IdSchema = z.union([z.number(), z.string()]);

export const TimestampSchema = z.string().optional();

// --- Lead ---
export const LeadSchema = z.object({
  id: z.number().optional(),
  company_id: z.number(),
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  salutation: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  client_company_id: z.number().nullable().optional(),
  address: z.string().optional(),
  expected_value: z.number().nonnegative().optional().default(0),
  source: z.string().optional(),
  status: z.string().min(1, 'Status wajib diisi'),
  sales_id: z.string().nullable().optional(),
  notes: z.string().optional(),
  input_date: z.string().optional(),
});

// --- Deal ---
export const DealSchema = z.object({
  id: z.number().optional(),
  company_id: z.number(),
  pipeline_id: z.number(),
  stage_id: z.string().min(1, 'Tahapan wajib diisi'),
  name: z.string().min(2, 'Nama deal minimal 2 karakter'),
  client_id: z.number().nullable().optional(),
  expected_value: z.number().nonnegative().optional().default(0),
  probability: z.number().min(0).max(100).optional().default(0),
  source: z.string().optional(),
  notes: z.string().optional(),
  sales_id: z.string().nullable().optional(),
  follow_up_date: z.string().nullable().optional(),
  follow_up_notes: z.string().nullable().optional(),
});

// --- Client ---
export const ClientSchema = z.object({
  id: z.number().optional(),
  company_id: z.number(),
  name: z.string().min(2, 'Nama client minimal 2 karakter'),
  salutation: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  client_company_id: z.number().nullable().optional(),
});

// --- Project ---
export const ProjectSchema = z.object({
  id: z.number().optional(),
  company_id: z.number(),
  pipeline_id: z.number(),
  stage_id: z.string().min(1, 'Tahapan wajib diisi'),
  name: z.string().min(2, 'Nama proyek minimal 2 karakter'),
  client_id: z.number().nullable().optional(),
  lead_id: z.string().nullable().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  notes: z.string().optional(),
  custom_field_values: z.record(z.string(), z.any()).optional().default({}),
});

// --- Quotation ---
export const QuotationSchema = z.object({
  id: z.number().optional(),
  company_id: z.number(),
  client_id: z.number(),
  deal_id: z.number().nullable().optional(),
  number: z.string().min(1, 'Nomor quotation wajib ada'),
  status: z.string().optional().default('Draft'),
  date: z.string(),
  expiry_date: z.string(),
  notes: z.string().optional(),
  subtotal: z.number().nonnegative(),
  discount_type: z.enum(['Rp', '%']).default('Rp'),
  discount_value: z.number().nonnegative().default(0),
  tax_type: z.string().optional(),
  tax_value: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
});

export type LeadInput = z.infer<typeof LeadSchema>;
export type DealInput = z.infer<typeof DealSchema>;
export type ClientInput = z.infer<typeof ClientSchema>;
export type ProjectInput = z.infer<typeof ProjectSchema>;
export type QuotationInput = z.infer<typeof QuotationSchema>;
