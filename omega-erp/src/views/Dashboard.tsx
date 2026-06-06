import React from 'react';
import { Clock, ShoppingCart, AlertCircle, Landmark, Briefcase, Database, ShieldAlert, History } from 'lucide-react';

const MetricCard = ({ label, value, color, icon }: any) => {
  const colors: Record<string, string> = { blue: 'text-blue-600', amber: 'text-amber-600', emerald: 'text-emerald-600', rose: 'text-rose-600' };
  return (
    <div className="p-8 rounded-[2rem] bg-white shadow-xl border border-slate-200 hover:shadow-2xl transition-all group overflow-hidden relative">
      <div className="flex items-center justify-between mb-6 relative z-10">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
        <div className={`p-3 rounded-2xl bg-slate-50 ${colors[color]} group-hover:scale-110 transition-transform`}>{icon}</div>
      </div>
      <span className={`text-4xl font-black tracking-tighter relative z-10 ${colors[color]}`}>{value}</span>
      <div className={`absolute -right-6 -bottom-6 opacity-[0.02] rotate-12 group-hover:rotate-0 transition-all duration-700 ${colors[color]}`}>{icon}</div>
    </div>
  );
};

const ActivityItem = ({ title, time, status, icon }: any) => (
  <div className="flex items-center justify-between group cursor-default">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors">{icon}</div>
      <div className="flex flex-col"><span className="text-sm font-black text-slate-700 group-hover:text-blue-600 transition-colors">{title}</span><span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{time}</span></div>
    </div>
    <span className="px-4 py-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm">{status}</span>
  </div>
);

export const DashboardView = ({ orders, inventory }: any) => {
  const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
  const lowStockCount = inventory.filter((i: any) => (i.current_stock || 0) <= (i.min_stock || 0)).length;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard label="Shop Floor Load" value="74%" color="blue" icon={<Clock size={20}/>} />
        <MetricCard label="Active Orders" value={orders.length.toString()} color="amber" icon={<ShoppingCart size={20}/>} />
        <MetricCard label="Critical Stock" value={lowStockCount.toString()} color="rose" icon={<AlertCircle size={20}/>} />
        <MetricCard label="Revenue MTD" value={`$${(totalRevenue/1000).toFixed(1)}k`} color="emerald" icon={<Landmark size={20}/>} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-slate-200 p-10">
          <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.3em]">System Intelligence</h3>
            <span className="flex items-center gap-2 text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase"><Database size={10}/> SQLite Engine</span>
          </div>
          <div className="space-y-8">
             <ActivityItem title="Quotation engine optimized" time="10 mins ago" status="System" icon={<ShieldAlert size={12}/>} />
             <ActivityItem title="Production queue monitoring" time="1 hour ago" status="Shop" icon={<History size={12}/>} />
             <ActivityItem title="Audit logs compiled" time="3 hours ago" status="Audit" icon={<History size={12}/>} />
          </div>
        </div>
        <div className="bg-slate-900 rounded-3xl p-10 text-white flex flex-col justify-between overflow-hidden relative shadow-2xl shadow-blue-900/20">
          <div className="relative z-10">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4">Throughput</h3>
            <p className="text-6xl font-black italic tracking-tighter">74.2<span className="text-blue-500 text-3xl">%</span></p>
          </div>
          <div className="h-3 w-full bg-slate-800 rounded-full mt-10 relative z-10 overflow-hidden">
            <div className="h-3 bg-blue-500 rounded-full w-[74%] animate-pulse"></div>
          </div>
          <div className="absolute -right-16 -bottom-16 opacity-[0.03] rotate-12 scale-150"><Briefcase size={240} /></div>
        </div>
      </div>
    </div>
  );
};
