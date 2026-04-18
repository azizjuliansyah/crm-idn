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
    case 'daftar_produk': return '/dashboard/products';
    case 'kategori_produk': return '/dashboard/products/categories';
    case 'satuan_produk': return '/dashboard/products/units';
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
      return '/dashboard';
  }
}

/**
 * Determines the active viewId based on the current pathname.
 * Centralizing this logic here ensures consistency across layout and navigation.
 */
export function getViewIdFromPath(pathname: string): string {
  if (pathname === '/dashboard') return 'dashboard';
  if (pathname === '/dashboard/admin/companies') return 'perusahaan';
  if (pathname === '/dashboard/admin/users') return 'pengguna';
  if (pathname === '/dashboard/admin/platform') return 'pengaturan';
  if (pathname === '/dashboard/admin/email') return 'pengaturan_email';

  // Leads
  if (pathname === '/dashboard/leads') return 'leads';
  if (pathname.startsWith('/dashboard/leads/settings')) return 'pengaturan_leads';
  if (pathname.startsWith('/dashboard/leads/sources')) return 'pengaturan_sumber_leads';

  // Log Activity
  if (pathname === '/dashboard/log-activity') return 'log_activity';

  // Deals
  if (pathname === '/dashboard/deals') return 'deals';
  if (pathname.startsWith('/dashboard/deals/pipelines')) return 'pengaturan_deals_pipeline';
  if (pathname.startsWith('/dashboard/deals/')) {
    const parts = pathname.split('/');
    const id = parts[3];
    if (!isNaN(parseInt(id))) return `deals_${id}`;
  }

  // Projects
  if (pathname === '/dashboard/projects') return 'projects';
  if (pathname.startsWith('/dashboard/projects/')) {
    const parts = pathname.split('/');
    const id = parts[3];
    if (!isNaN(parseInt(id))) return `projects_${id}`;
  }

  // Support
  if (pathname.startsWith('/dashboard/support/pipelines')) return 'support_pipeline';
  if (pathname.startsWith('/dashboard/support')) return 'customer_support';
  if (pathname.startsWith('/dashboard/complaints')) return 'complaints';
  if (pathname.startsWith('/dashboard/knowledge-base')) return 'knowledge_base';

  // Products
  if (pathname === '/dashboard/products' || pathname.startsWith('/dashboard/products/list')) return 'daftar_produk';
  if (pathname.startsWith('/dashboard/products/categories')) return 'kategori_produk';
  if (pathname.startsWith('/dashboard/products/units')) return 'satuan_produk';

  // Clients
  if (pathname.startsWith('/dashboard/clients/companies')) return 'perusahaan_client';
  if (pathname.startsWith('/dashboard/clients/contacts')) return 'data_client';
  if (pathname.startsWith('/dashboard/clients/categories')) return 'pengaturan_kategori_client';

  // Sales
  if (pathname.startsWith('/dashboard/sales/quotations')) {
    if (pathname.includes('/create')) return 'buat_penawaran';
    const parts = pathname.split('/');
    if (parts.length > 4 && !isNaN(parseInt(parts[4]))) return 'edit_penawaran';
    return 'daftar_penawaran';
  }
  if (pathname.startsWith('/dashboard/sales/proformas')) {
    if (pathname.includes('/create')) return 'buat_proforma';
    const parts = pathname.split('/');
    if (parts.length > 4 && !isNaN(parseInt(parts[4]))) return 'edit_proforma';
    return 'daftar_proforma';
  }
  if (pathname.startsWith('/dashboard/sales/invoices')) {
    if (pathname.includes('/create')) return 'buat_invoice';
    const parts = pathname.split('/');
    if (parts.length > 4 && !isNaN(parseInt(parts[4]))) return 'edit_invoice';
    return 'daftar_invoice';
  }
  if (pathname.startsWith('/dashboard/sales/kwitansis')) {
    if (pathname.includes('/create')) return 'buat_kwitansi';
    const parts = pathname.split('/');
    if (parts.length > 4 && !isNaN(parseInt(parts[4]))) return 'edit_kwitansi';
    return 'daftar_kwitansi';
  }
  if (pathname.startsWith('/dashboard/sales/invoice-requests')) {
    if (pathname.includes('/create')) return 'buat_request_invoice';
    const parts = pathname.split('/');
    if (parts.length > 4 && !isNaN(parseInt(parts[4]))) return 'edit_request_invoice';
    return 'request_invoice';
  }
  if (pathname.startsWith('/dashboard/sales/kwitansi-requests')) {
    if (pathname.includes('/create')) return 'buat_request_kwitansi';
    const parts = pathname.split('/');
    if (parts.length > 4 && !isNaN(parseInt(parts[4]))) return 'edit_request_kwitansi';
    return 'request_kwitansi';
  }
  if (pathname.startsWith('/dashboard/sales/requests/settings')) return 'request_category_settings';
  if (pathname.startsWith('/dashboard/sales/requests')) {
    const parts = pathname.split('/');
    if (parts.length > 4) {
      const catId = parts[4];
      if (pathname.includes('/create')) return `buat_request_cat_${catId}`;
      if (parts.length > 5 && !isNaN(parseInt(parts[5]))) return `edit_request_cat_${catId}`;
      return `request_cat_${catId}`;
    }
  }

  // Sales Settings
  if (pathname.startsWith('/dashboard/sales/settings/autonumber')) return 'penomoran_otomatis';
  if (pathname.startsWith('/dashboard/sales/settings/tax')) return 'pengaturan_pajak';
  if (pathname.startsWith('/dashboard/sales/settings/templates')) return 'pengaturan_template_pdf';

  // General Settings
  if (pathname.startsWith('/dashboard/settings/company')) return 'pengaturan_perusahaan';
  if (pathname.startsWith('/dashboard/settings/email')) return 'workspace_email_config';
  if (pathname.startsWith('/dashboard/settings/team')) return 'anggota_tim';
  if (pathname.startsWith('/dashboard/settings/roles')) return 'manajemen_role';
  if (pathname.startsWith('/dashboard/settings/profile')) return 'profil_saya';
  if (pathname.startsWith('/dashboard/settings/ticket-topic')) return 'pengaturan_ticket_topic';
  if (pathname.startsWith('/dashboard/settings/ai')) return 'pengaturan_ai';
  if (pathname.startsWith('/dashboard/settings/urgencies')) return 'pengaturan_urgensi_request';

  // Project Settings
  if (pathname.startsWith('/dashboard/settings/projects/pipelines')) return 'pengaturan_project_pipeline';
  if (pathname.startsWith('/dashboard/settings/projects/task-stages')) return 'pengaturan_task_pipeline';

  // Fallback
  const parts = pathname.split('/');
  if (parts.length > 2) return parts[2];
  return 'dashboard';
}

