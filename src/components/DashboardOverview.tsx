
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Company } from '@/lib/types';
import { 
  Users, Target, ReceiptCent, Ticket, 
  ArrowUpRight, ArrowDownRight, 
  Layers, Globe, Loader2, Calendar, Headset,
  Briefcase, TrendingUp, Clock
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';

interface DashboardProps {
  company: Company;
}

export const DashboardOverview: React.FC<DashboardProps> = ({ company }) => {
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
      const [leadsRes, dealsRes, quotesRes, ticketsRes, stagesRes] = await Promise.all([
        supabase.from('leads').select('source, created_at, name, status').eq('company_id', company.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('deals').select('expected_value, stage_id, created_at').eq('company_id', company.id),
        supabase.from('quotations').select('total, date').eq('company_id', company.id).eq('status', 'Accepted'),
        supabase.from('support_tickets').select('priority, status').eq('company_id', company.id),
        supabase.from('pipeline_stages').select('id, name')
      ]);

      // 1. Process Leads by Source
      const sources: Record<string, number> = {};
      const allLeadsRes = await supabase.from('leads').select('source').eq('company_id', company.id);
      allLeadsRes.data?.forEach(l => {
        const src = l.source || 'Lainnya';
        sources[src] = (sources[src] || 0) + 1;
      });
      const leadsBySource = Object.entries(sources).map(([name, value]) => ({ name, value }));

      // 2. Process Monthly Revenue
      const monthly: Record<string, number> = {};
      const last6Months = Array.from({length: 6}, (_, i) => {
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
        if (priorities[t.priority.toLowerCase()] !== undefined) {
           priorities[t.priority.toLowerCase()] += 1;
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
        recentLeads: leadsRes.data || []
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
      <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Menyusun Dashboard Perusahaan...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Overview Cards - Vibrant Gradients & Professional Corners */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 p-6 rounded-2xl shadow-xl shadow-blue-100 hover:translate-y-[-4px] transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12"><Users size={80} /></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-inner">
              <Users size={22} />
            </div>
            <div className="flex items-center gap-1 text-white text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full uppercase backdrop-blur-md">
              <ArrowUpRight size={12} /> 12.5%
            </div>
          </div>
          <p className="text-blue-50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1 relative z-10">Total Leads</p>
          <h3 className="text-3xl font-bold text-white tracking-tighter relative z-10">{stats.totalLeads}</h3>
        </div>

        <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-purple-600 p-6 rounded-2xl shadow-xl shadow-purple-100 hover:translate-y-[-4px] transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12"><Target size={80} /></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-inner">
              <Target size={22} />
            </div>
            <div className="flex items-center gap-1 text-white text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full uppercase backdrop-blur-md">
              <ArrowUpRight size={12} /> 8.2%
            </div>
          </div>
          <p className="text-purple-50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1 relative z-10">Active Deals</p>
          <h3 className="text-3xl font-bold text-white tracking-tighter relative z-10">{stats.totalDeals}</h3>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 rounded-2xl shadow-xl shadow-emerald-100 hover:translate-y-[-4px] transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12"><ReceiptCent size={80} /></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-inner">
              <ReceiptCent size={22} />
            </div>
            <div className="flex items-center gap-1 text-white text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full uppercase backdrop-blur-md">
              <ArrowDownRight size={12} /> 3.1%
            </div>
          </div>
          <p className="text-emerald-50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1 relative z-10">Total Revenue</p>
          <h3 className="text-3xl font-bold text-white tracking-tighter relative z-10">{formatIDR(stats.totalRevenue)}</h3>
        </div>

        <div className="bg-gradient-to-br from-rose-600 via-rose-500 to-pink-500 p-6 rounded-2xl shadow-xl shadow-rose-100 hover:translate-y-[-4px] transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 scale-150 rotate-12"><Ticket size={80} /></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-inner">
              <Ticket size={22} />
            </div>
            <div className="px-2.5 py-1 bg-white/20 rounded-full text-[9px] font-bold text-white uppercase tracking-widest backdrop-blur-md">
              Live
            </div>
          </div>
          <p className="text-rose-50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1 relative z-10">Support Tickets</p>
          <h3 className="text-3xl font-bold text-white tracking-tighter relative z-10">{stats.activeTickets}</h3>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-10">
             <div>
                <h4 className="text-lg font-bold text-gray-900 tracking-tight">Tren Pendapatan Bulanan</h4>
                <p className="text-xs text-gray-400 font-medium">Berdasarkan penawaran yang disetujui (6 bulan terakhir).</p>
             </div>
             <Calendar size={20} className="text-gray-300" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueMonthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '12px'}}
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
                <h4 className="text-lg font-bold text-gray-900 tracking-tight">Distribusi Nilai Pipeline</h4>
                <p className="text-xs text-gray-400 font-medium">Estimasi nilai akumulasi per tahapan transaksi.</p>
             </div>
             <Layers size={20} className="text-gray-300" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dealsFunnel}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 9, fontWeight: 'bold'}} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '12px'}}
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
            <h4 className="text-lg font-bold text-gray-900 tracking-tight">Sumber Prospek</h4>
            <p className="text-xs text-gray-400 font-medium">Analisis channel pemasaran terkuat.</p>
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
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', fontSize: '11px', fontWeight: 'bold'}} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Globe size={24} className="text-gray-100 mb-1" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Global</span>
            </div>
          </div>
          <div className="mt-6 space-y-3">
             {stats.leadsBySource.slice(0, 3).map((item, idx) => (
               <div key={item.name} className="flex items-center justify-between text-[11px] font-bold">
                 <div className="flex items-center gap-2.5">
                   <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                   <span className="text-gray-500 uppercase tracking-tight">{item.name}</span>
                 </div>
                 <span className="text-gray-900">{Math.round((item.value / (stats.totalLeads || 1)) * 100)}%</span>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-lg font-bold text-gray-900 tracking-tight">Kesehatan Tim Support</h4>
                <p className="text-xs text-gray-400 font-medium">Beban kerja berdasarkan urgensi ticket aktif.</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                 <Headset size={20} />
              </div>
           </div>
           <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.ticketsPriority}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px'}}
                />
                <Line type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={5} dot={{r: 5, fill: '#EF4444', strokeWidth: 3, stroke: '#fff'}} activeDot={{r: 8}} />
              </LineChart>
            </ResponsiveContainer>
           </div>
           <div className="mt-6 p-5 bg-gray-50 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="relative">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                    <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Live Health Check: Optimal</span>
              </div>
              <button onClick={fetchData} className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline transition-all group">
                 <TrendingUp size={12} className="group-hover:translate-y-[-1px] transition-transform" /> Sinkronisasi Ulang
              </button>
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
               <h4 className="text-lg font-bold text-gray-900 tracking-tight">Prospek Terbaru</h4>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pembaruan Otomatis</p>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-gray-50/50">
                  <tr>
                     <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Client</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sumber</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Waktu Masuk</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {stats.recentLeads.map((lead, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
                                {lead.name.charAt(0)}
                             </div>
                             <span className="text-sm font-bold text-gray-900">{lead.name}</span>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-md">{lead.source}</span>
                       </td>
                       <td className="px-8 py-5 text-xs font-bold text-gray-400">
                          {new Date(lead.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                       </td>
                       <td className="px-8 py-5 text-center">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase rounded-full border border-emerald-100">
                             {lead.status}
                          </span>
                       </td>
                    </tr>
                  ))}
                  {stats.recentLeads.length === 0 && (
                    <tr>
                       <td colSpan={4} className="py-12 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest italic opacity-40">Belum ada data leads masuk</td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
