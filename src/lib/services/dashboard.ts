import { createClient } from '@/lib/supabase-server';

export async function getDashboardStats(companyId: number) {
  const supabase = await createClient();

  // Parallelize all main data fetches
  const [leadsRecentRes, dealsRes, quotesRes, ticketsRes, stagesRes, allLeadsRes] = await Promise.all([
    supabase.from('leads').select('source, created_at, name, status').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5),
    supabase.from('deals').select('expected_value, stage_id, created_at').eq('company_id', companyId),
    supabase.from('quotations').select('total, date').eq('company_id', companyId).eq('status', 'Accepted'),
    supabase.from('support_tickets').select('priority, status').eq('company_id', companyId),
    supabase.from('pipeline_stages').select('id, name'),
    supabase.from('leads').select('source').eq('company_id', companyId)
  ]);

  // 1. Process Leads by Source
  const sources: Record<string, number> = {};
  allLeadsRes.data?.forEach(l => {
    const src = l.source || 'Lainnya';
    sources[src] = (sources[src] || 0) + 1;
  });
  const leadsBySource = Object.entries(sources).map(([name, value]) => ({ name, value }));

  // 2. Process Monthly Revenue
  const monthly: Record<string, number> = {};
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toLocaleString('id-ID', { month: 'short' });
  }).reverse();

  last6Months.forEach(m => monthly[m] = 0);
  quotesRes.data?.forEach(q => {
    const m = new Date(q.date).toLocaleString('id-ID', { month: 'short' });
    if (monthly[m] !== undefined) monthly[m] += Number(q.total);
  });
  const revenueMonthly = Object.entries(monthly).map(([name, amount]) => ({ name, amount }));

  // 3. Process Deals Funnel
  const funnel: Record<string, number> = {};
  const stageMap: Record<string, string> = {};
  stagesRes.data?.forEach(s => stageMap[s.id] = s.name);

  dealsRes.data?.forEach(d => {
    const stageName = stageMap[d.stage_id] || 'Unknown';
    funnel[stageName] = (funnel[stageName] || 0) + Number(d.expected_value);
  });
  const dealsFunnel = Object.entries(funnel).map(([name, value]) => ({ name, value }));

  // 4. Tickets by Priority
  const priorities: Record<string, number> = { 'urgent': 0, 'high': 0, 'normal': 0, 'low': 0 };
  ticketsRes.data?.forEach(t => {
    const priorityKey = t.priority?.toLowerCase();
    if (priorityKey && priorities[priorityKey] !== undefined) {
      priorities[priorityKey] += 1;
    }
  });
  const ticketsPriority = Object.entries(priorities).map(([name, value]) => ({ name, value }));

  return {
    totalLeads: allLeadsRes.data?.length || 0,
    totalDeals: dealsRes.data?.length || 0,
    totalRevenue: quotesRes.data?.reduce((sum, q) => sum + Number(q.total), 0) || 0,
    activeTickets: ticketsRes.data?.filter(t => t.status !== 'closed').length || 0,
    leadsBySource,
    revenueMonthly,
    dealsFunnel,
    ticketsPriority,
    recentLeads: leadsRecentRes.data || [],
    companyId: companyId
  };
}
