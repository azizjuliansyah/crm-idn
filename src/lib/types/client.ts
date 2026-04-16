export interface ClientCompanyCategory {
  id: number;
  company_id: number;
  name: string;
}

export interface ClientCompany {
  id: number;
  company_id: number;
  category_id: number | null;
  name: string;
  address?: string;
  email?: string;
  whatsapp?: string;
  client_company_categories?: ClientCompanyCategory;
}

export interface Client {
  id: number;
  company_id: number;
  client_company_id?: number | null;
  salutation?: string;
  name: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  created_at: string;
  client_company?: ClientCompany;
}

export type ClientWithCompany = Client;

export interface ClientForm {
  salutation: string;
  name: string;
  email: string;
  whatsapp: string;
  client_company_id: string;
}
