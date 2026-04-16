export interface KbCategory {
  id: number;
  company_id: number;
  name: string;
}

export interface KbArticle {
  id: number;
  company_id: number;
  category_id?: number | null;
  title: string;
  content: string;
  created_at: string;
  kb_categories?: KbCategory;
}
