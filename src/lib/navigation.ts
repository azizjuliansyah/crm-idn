export function getPathFromViewId(viewId: string): string {
  switch (viewId) {
    case 'dashboard': return '/dashboard';
    case 'perusahaan': return '/dashboard/admin/companies';
    case 'pengguna': return '/dashboard/admin/users';
    case 'pengaturan': return '/dashboard/admin/platform';
    case 'pengaturan_email': return '/dashboard/admin/email';
    case 'leads': return '/dashboard/leads';
    case 'pengaturan_leads': return '/dashboard/leads/settings';
    case 'pengaturan_sumber_leads': return '/dashboard/leads/sources';
    case 'deals': return '/dashboard/deals';
    case 'pengaturan_deals_pipeline': return '/dashboard/deals/pipelines';
    case 'log_activity': return '/dashboard/log-activity';
    case 'customer_support': return '/dashboard/support';
    case 'support_pipeline': return '/dashboard/support/pipelines';
    case 'complaints': return '/dashboard/complaints';
    case 'knowledge_base': return '/dashboard/knowledge-base';
    case 'ai_assistant': return '/dashboard/ai';
    case 'daftar_produk': return '/dashboard/products';
    case 'kategori_produk': return '/dashboard/products/categories';
    case 'satuan_produk': return '/dashboard/products/units';
    case 'sop_all': return '/dashboard/sops';
    case 'sop_category_settings': return '/dashboard/sops/categories';
    case 'sop_archive': return '/dashboard/sops/archive';
    case 'sop_editor': return '/dashboard/sops/create';
    case 'perusahaan_client': return '/dashboard/clients/companies';
    case 'data_client': return '/dashboard/clients/contacts';
    case 'pengaturan_kategori_client': return '/dashboard/clients/categories';
    case 'daftar_penawaran': return '/dashboard/sales/quotations';
    case 'buat_penawaran': return '/dashboard/sales/quotations/create';
    case 'daftar_proforma': return '/dashboard/sales/proformas';
    case 'buat_proforma': return '/dashboard/sales/proformas/create';
    case 'daftar_invoice': return '/dashboard/sales/invoices';
    case 'buat_invoice': return '/dashboard/sales/invoices/create';
    case 'daftar_kwitansi': return '/dashboard/sales/kwitansis';
    case 'buat_kwitansi': return '/dashboard/sales/kwitansis/create';
    case 'request_invoice': return '/dashboard/sales/invoice-requests';
    case 'buat_request_invoice': return '/dashboard/sales/invoice-requests/create';
    case 'request_kwitansi': return '/dashboard/sales/kwitansi-requests';
    case 'buat_request_kwitansi': return '/dashboard/sales/kwitansi-requests/create';
    case 'request_category_settings': return '/dashboard/sales/requests/settings';
    case 'penomoran_otomatis': return '/dashboard/sales/settings/autonumber';
    case 'pengaturan_pajak': return '/dashboard/sales/settings/tax';
    case 'pengaturan_template_pdf': return '/dashboard/sales/settings/templates';
    case 'pengaturan_perusahaan': return '/dashboard/settings/company';
    case 'workspace_email_config': return '/dashboard/settings/email';
    case 'anggota_tim': return '/dashboard/settings/team';
    case 'manajemen_role': return '/dashboard/settings/roles';
    case 'profil_saya': return '/dashboard/settings/profile';
    case 'pengaturan_ticket_topic': return '/dashboard/settings/ticket-topic';
    case 'pengaturan_ai': return '/dashboard/settings/ai';
    case 'pengaturan_urgensi_request': return '/dashboard/settings/urgencies';
    case 'pengaturan_project_pipeline': return '/dashboard/settings/projects/pipelines';
    case 'pengaturan_task_pipeline': return '/dashboard/settings/projects/task-stages';
    default:
      if (viewId.startsWith('deals_')) {
        return `/dashboard/deals/${viewId.split('_')[1]}`;
      }
      if (viewId.startsWith('request_cat_')) {
        return `/dashboard/sales/requests/${viewId.split('_')[2]}`;
      }
      if (viewId.startsWith('buat_request_cat_')) {
        return `/dashboard/sales/requests/${viewId.split('_')[3]}/create`;
      }
      if (viewId.startsWith('projects_')) {
        return `/dashboard/projects/${viewId.split('_')[1]}`;
      }
      if (viewId.startsWith('sop_cat_')) {
        return `/dashboard/sops/category/${viewId.split('_')[2]}`;
      }
      return '/dashboard';
  }
}
