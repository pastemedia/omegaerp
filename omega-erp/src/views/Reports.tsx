import React from 'react';
import { TrendingUp, TrendingDown, Landmark } from 'lucide-react';

const ReportCard = ({ label, value, sub, icon, color }: any) => {
  const colors: any = { blue: 'text-blue-600 bg-blue-50', emerald: 'text-emerald-600 bg-emerald-50', rose: 'text-rose-600 bg-rose-50' };
  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200">
      <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center mb-6`}>{icon}</div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-800 tracking-tighter mb-2">{value}</p>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{sub}</p>
    </div>
  );
};

export const ReportsView = ({ orders, invoices, employees }: any) => {
  const totalOrders = orders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  const totalBilled = invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
  const totalSalaries = employees.reduce((s: number, e: any) => s + (e.salary || 0), 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ReportCard label="Sales Pipeline" value={`$${(totalOrders/1000).toFixed(1)}k`} sub="Confirmed Quotations" icon={<TrendingUp size={20}/>} color="blue" />
        <ReportCard label="Actual Revenue" value={`$${(totalBilled/1000).toFixed(1)}k`} sub="Invoiced Amount" icon={<Landmark size={20}/>} color="emerald" />
        <ReportCard label="Operational Cost" value={`$${(totalSalaries/1000).toFixed(1)}k`} sub="Fixed Salary Expense" icon={<TrendingDown size={20}/>} color="rose" />
      </div>
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Monthly Performance Forecast</h3>
        <div className="flex items-end gap-2 h-48 mb-6">
          {[40, 70, 55, 90, 65, 80, 74].map((h, i) => (<div key={i} className="flex-1 bg-slate-50 rounded-xl relative group"><div style={{height: `${h}%`}} className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-xl transition-all group-hover:bg-blue-500 shadow-lg shadow-blue-900/10"></div></div>))}
        </div>
        <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest px-2"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
      </div>
    </div>
  );
};
