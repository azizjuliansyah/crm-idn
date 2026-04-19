# CRM Pintar - Project Overview

## Deskripsi Singkat
**CRM Pintar** adalah platform Customer Relationship Management (CRM) modern yang dirancang untuk membantu bisnis dalam mengelola seluruh siklus penjualan, mulai dari manajemen prospek (leads) hingga penagihan (invoicing) dan dukungan pelanggan (support). Aplikasi ini bertujuan untuk memusatkan data pelanggan dan mengotomatiskan alur kerja bisnis agar lebih efisien.

## Fitur Utama

Aplikasi ini memiliki berbagai fitur yang terintegrasi untuk mendukung operasional bisnis secara menyeluruh. Silakan klik pada tautan di bawah ini untuk melihat detail masing-masing fitur:

### 1. Sales & Pipeline
*   [**Leads**](./features/leads/README.md): Manajemen prospek potensial dan konversi.
*   [**Deals**](./features/deals/README.md): Pengelolaan peluang bisnis dan pipeline penjualan.
*   [**Quotations**](./features/quotations/README.md): Pembuatan surat penawaran harga profesional.

### 2. Manajemen Dokumen Finansial
*   [**Invoices**](./features/invoices/README.md): Sistem penagihan dan tracking pembayaran.
*   [**Proformas**](./features/proformas/README.md): Tagihan sementara dan estimasi formal.
*   [**Kwitansi**](./features/kwitansis/README.md): Bukti sah penerimaan pembayaran.
*   [**Sales Requests**](./features/sales-requests/README.md): Pengelolaan permintaan internal tim sales.

### 3. Operasional & Proyek
*   [**Projects**](./features/projects/README.md): Manajemen eksekusi pekerjaan dan timeline.
*   [**Tasks**](./features/tasks/README.md): Daftar tugas mendetail untuk tim.
*   [**Products**](./features/products/README.md): Katalog produk dan layanan perusahaan.

### 4. Layanan Pelanggan (Customer Service)
*   [**Complaints**](./features/complaints/README.md): Penanganan keluhan pelanggan secara sistematis.
*   [**Support**](./features/support/README.md): Pusat bantuan dan sistem ticketing.
*   [**Knowledge Base**](./features/knowledge-base/README.md): Repositori SOP dan dokumentasi internal.

### 5. Analitik & Dashboard
*   [**Dashboard**](./features/dashboard/README.md): Visualisasi metrik utama dan performa bisnis.
*   [**Log Activity**](./features/log-activity/README.md): Rekaman audit untuk transparansi dan keamanan.

## Teknologi yang Digunakan

*   **Frontend**: [Next.js](https://nextjs.org/) (App Router) dengan [TypeScript](https://www.typescriptlang.org/).
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand) untuk state global dan [React Query](https://tanstack.com/query/latest) untuk manajemen data server.
*   **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage).
*   **UI/UX**: [Tailwind CSS](https://tailwindcss.com/) untuk styling dan [Framer Motion](https://www.framer.com/motion/) untuk animasi.
*   **Integrasi AI**: [Google Generative AI](https://ai.google.dev/) untuk fitur asisten pintar.
*   **Eksport Data**: [jsPDF](https://github.com/parallax/jsPDF) untuk pembuatan PDF dan [XLSX](https://github.com/SheetJS/sheetjs) untuk laporan Excel.

## Struktur Project
*   `src/app`: Struktur routing dan halaman aplikasi.
*   `src/components/features`: Implementasi logika dan UI untuk setiap fitur (Leads, Deals, Invoices, dll).
*   `src/components/ui`: Kumpulan komponen dasar (Button, Input, Modal, dll) yang reusable.
*   `src/lib`: Konfigurasi library, utilitas, dan template dokumen.
