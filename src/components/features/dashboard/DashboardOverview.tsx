import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Table, TableHeader, TableBody, TableRow, TableCell, TableEmpty, H3, Subtext, Label, Badge, H1, H2 } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Company } from '@/lib/types';
import {
  Users, Target, ReceiptCent, Ticket,
  ArrowUpRight, ArrowDownRight,
  Layers, Globe, Loader2, Calendar, Headset,
  TrendingUp, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';

interface DashboardProps {
  company: Company;
}

export const DashboardOverview: React.FC<DashboardProps> = ({ company }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalDeals: 0,
    totalRevenue: 0,
    activeTickets: 0,
    leadsBySource: [] as any[],
    revenueMonthly: [] as any[],
    dealsFunnel: [] as any[],
    ticketsPriority: [] as any[],
    recentLeads: [] as any[]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Parallelize all main data fetches to avoid waterfalls
      const [leadsRecentRes, dealsRes, quotesRes, ticketsRes, stagesRes, allLeadsRes] = await Promise.all([
        // Recent leads for the table
        supabase.from('leads').select('source, created_at, name, status').eq('company_id', company.id).order('created_at', { ascending: false }).limit(5),
        // All deals for metrics and funnel
        supabase.from('deals').select('expected_value, stage_id, created_at').eq('company_id', company.id),
        // Accepted quotations for revenue trend
        supabase.from('quotations').select('total, drug_total:total, date').eq('company_id', company.id).eq('status', 'Accepted'),
        // Support tickets for priority chart
        supabase.from('support_tickets').select('priority, status').eq('company_id', company.id),
        // Pipeline stages for mapping IDs to names
        supabase.from('pipeline_stages').select('id, name'),
        // All leads just for source distribution
        supabase.from('leads').select('source').eq('company_id', company.id)
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

      setStats({
        totalLeads: allLeadsRes.data?.length || 0,
        totalDeals: dealsRes.data?.length || 0,
        totalRevenue: quotesRes.data?.reduce((sum, q) => sum + Number(q.total), 0) || 0,
        activeTickets: ticketsRes.data?.filter(t => t.status !== 'closed').length || 0,
        leadsBySource,
        revenueMonthly,
        dealsFunnel,
        ticketsPriority,
        recentLeads: leadsRecentRes.data || []
      });
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [company.id]);

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const formatIDR = (num: number) => {
    if (num >= 1000000000) return `Rp ${(num / 1000000000).toFixed(1)}M`;
    if (num >= 1000000) return `Rp ${(num / 1000000).toFixed(1)}Jt`;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <Subtext className="text-gray-400  uppercase  text-[10px]">Menyusun Dashboard Perusahaan...</Subtext>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Overview Cards - Vibrant Gradients & Professional Corners */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link 
          href="/dashboard/leads"
          onMouseEnter={() => router.prefetch('/dashboard/leads')}
          className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 p-6 rounded-2xl shadow-xl shadow-blue-100 hover:translate-y-[-4px] transition-all group overflow-hidden relative block"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12"><Users size={80} /></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-inner">
              <Users size={22} />
            </div>
            <div className="flex items-center gap-1 text-white text-[10px]  bg-white/20 px-2.5 py-1 rounded-full uppercase backdrop-blur-md">
              <ArrowUpRight size={12} /> 12.5%
            </div>
          </div>
          <Subtext className="!text-blue-50 text-[10px]  uppercase tracking-[0.15em] mb-1 relative z-10">Total Leads</Subtext>
          <H2 className="text-white">{stats.totalLeads}</H2>
        </Link>

        <Link 
          href="/dashboard/crm/deals"
          onMouseEnter={() => router.prefetch('/dashboard/crm/deals')}
          className="bg-gradient-to-br from-violet-700 via-violet-600 to-purple-600 p-6 rounded-2xl shadow-xl shadow-purple-100 hover:translate-y-[-4px] transition-all group overflow-hidden relative block"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12"><Target size={80} /></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-inner">
              <Target size={22} />
            </div>
            <div className="flex items-center gap-1 text-white text-[10px]  bg-white/20 px-2.5 py-1 rounded-full uppercase backdrop-blur-md">
              <ArrowUpRight size={12} /> 8.2%
            </div>
          </div>
          <Subtext className="!text-purple-50 text-[10px]  uppercase tracking-[0.15em] mb-1 relative z-10">Active Deals</Subtext>
          <H2 className="text-white">{stats.totalDeals}</H2>
        </Link>

        <Link 
          href="/dashboard/sales/quotations"
          onMouseEnter={() => router.prefetch('/dashboard/sales/quotations')}
          className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 rounded-2xl shadow-xl shadow-emerald-100 hover:translate-y-[-4px] transition-all group overflow-hidden relative block"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12"><ReceiptCent size={80} /></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-inner">
              <ReceiptCent size={22} />
            </div>
            <div className="flex items-center gap-1 text-white text-[10px]  bg-white/20 px-2.5 py-1 rounded-full uppercase backdrop-blur-md">
              <ArrowDownRight size={12} /> 3.1%
            </div>
          </div>
          <Subtext className="!text-emerald-50 text-[10px]  uppercase tracking-[0.15em] mb-1 relative z-10">Total Revenue</Subtext>
          <H2 className="text-white">{formatIDR(stats.totalRevenue)}</H2>
        </Link>

        <Link 
          href="/dashboard/customer-service/tickets"
          onMouseEnter={() => router.prefetch('/dashboard/customer-service/tickets')}
          className="bg-gradient-to-br from-rose-600 via-rose-500 to-pink-500 p-6 rounded-2xl shadow-xl shadow-rose-100 hover:translate-y-[-4px] transition-all group overflow-hidden relative block"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12"><Ticket size={80} /></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-inner">
              <Ticket size={22} />
            </div>
            <div className="px-2.5 py-1 bg-white/20 rounded-full text-[9px]  text-white uppercase  backdrop-blur-md">
              Live
            </div>
          </div>
          <Subtext className="!text-rose-50 text-[10px]  uppercase tracking-[0.15em] mb-1 relative z-10">Support Tickets</Subtext>
          <H2 className="text-white">{stats.activeTickets}</H2>
        </Link>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <H3 className="normal-case text-lg  text-gray-900 ">Tren Pendapatan Bulanan</H3>
              <Subtext>Berdasarkan penawaran yang disetujui (6 bulan terakhir).</Subtext>
            </div>
            <Calendar size={20} className="text-gray-300" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueMonthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '12px' }}
                  formatter={(value: any) => [formatIDR(Number(value)), 'Revenue']}
                />
                <Bar dataKey="amount" fill="#4F46E5" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <H3 className="normal-case text-lg  text-gray-900 ">Distribusi Nilai Pipeline</H3>
              <Subtext>Estimasi nilai akumulasi per tahapan transaksi.</Subtext>
            </div>
            <Layers size={20} className="text-gray-300" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dealsFunnel}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 'bold' }} dy={10} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '12px' }}
                  formatter={(value: any) => [formatIDR(Number(value)), 'Value']}
                />
                <Area type="monotone" dataKey="value" stroke="#10B981" fillOpacity={1} fill="url(#colorValue)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Row: Leads & Support */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm lg:col-span-1">
          <div className="mb-8">
            <H3 className="normal-case text-lg  text-gray-900 ">Sumber Prospek</H3>
            <Subtext>Analisis channel pemasaran terkuat.</Subtext>
          </div>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.leadsBySource}
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.leadsBySource.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '11px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <Globe size={24} className="text-gray-100 mb-1" />
              <Label className="text-[10px]  text-gray-400 uppercase ">Global</Label>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {stats.leadsBySource.slice(0, 3).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-[11px] ">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <Label className="text-gray-500 uppercase ">{item.name}</Label>
                </div>
                <Label className="text-gray-900">{Math.round((item.value / (stats.totalLeads || 1)) * 100)}%</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div>
              <H3 className="normal-case text-lg  text-gray-900 ">Kesehatan Tim Support</H3>
              <Subtext>Beban kerja berdasarkan urgensi ticket aktif.</Subtext>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Headset size={20} />
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.ticketsPriority}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={5} dot={{ r: 5, fill: '#EF4444', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-5 bg-gray-50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
              </div>
              <Label className="text-[10px]  uppercase tracking-[0.2em] text-gray-500">Live Health Check: Optimal</Label>
            </div>
            <Button
              onClick={fetchData}
              variant="ghost"
              size="sm"
              leftIcon={<TrendingUp size={12} className="group-hover:translate-y-[-1px] transition-transform" />}
              className="text-[10px] font-medium text-blue-600 uppercase "
            >
              Sinkronisasi Ulang
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <H3 className="normal-case text-lg  text-gray-900 ">Prospek Terbaru</H3>
          </div>
          <Subtext className="text-[10px] font-medium text-gray-400 uppercase ">Pembaruan Otomatis</Subtext>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>Nama Client</TableCell>
              <TableCell isHeader>Sumber</TableCell>
              <TableCell isHeader>Waktu Masuk</TableCell>
              <TableCell isHeader className="text-center">Status</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.recentLeads.map((lead, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px]  text-gray-400 uppercase">
                      {lead.name.charAt(0)}
                    </div>
                    <Label className="text-sm  text-gray-900">{lead.name}</Label>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="ghost" className="text-indigo-600 bg-indigo-50 border-none">{lead.source}</Badge>
                </TableCell>
                <TableCell className=" text-gray-400">
                  {new Date(lead.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="success" className="border-emerald-100 bg-emerald-50 text-emerald-600 rounded-full">{lead.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {stats.recentLeads.length === 0 && (
              <TableEmpty colSpan={4} message="Belum ada data leads masuk" />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
