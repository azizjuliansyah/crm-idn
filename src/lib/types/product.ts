export interface ProductCategory {
  id: number;
  company_id: number;
  name: string;
}

export interface ProductUnit {
  id: number;
  company_id: number;
  name: string;
}

export interface Product {
  id: number;
  company_id: number;
  category_id?: number | null;
  unit_id?: number | null;
  name: string;
  price: number;
  description?: string;
  created_at: string;
  product_categories?: ProductCategory;
  product_units?: ProductUnit;
}

export interface ProductForm {
  name: string;
  category_id: string;
  unit_id: string;
  price: number;
  description: string;
}
