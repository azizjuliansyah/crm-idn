-- Menambahkan kolom model_name ke tabel ai_settings
ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS model_name TEXT DEFAULT 'gemini-2.0-flash';
