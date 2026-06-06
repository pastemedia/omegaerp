import React from 'react';
import { CheckCircle2, Calendar } from 'lucide-react';

export const EmployeeView = ({ employees, attendance, onMark }: any) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Daily Roll Call</h3>
          <div className="space-y-4">
            {employees.map((e: any) => {
               const present = attendance.some((a: any) => a.employee_id === e.id);
               return (
                 <div key={e.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${present ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{e.full_name[0]}</div>
                     <div><p className="text-sm font-black text-slate-800 leading-none">{e.full_name}</p><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{e.role}</p></div>
                   </div>
                   {!present ? (<button onClick={() => onMark(e.id)} className="px-4 py-2 bg-white text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all">Mark In</button>) : <span className="text-emerald-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12}/> Present</span>}
                 </div>
               );
            })}
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2"><Calendar size={14}/> Payroll Summary</h3>
           <div className="space-y-6">
              {employees.map((e: any) => (<div key={e.id} className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0"><span className="text-sm font-bold text-slate-600">{e.full_name}</span><span className="text-sm font-black text-slate-800">${(e.salary || 0).toLocaleString()}</span></div>))}
           </div>
           <div className="mt-10 p-6 bg-slate-900 rounded-3xl flex justify-between items-center"><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Total Monthly<br/>Liabilities</span><span className="text-2xl font-black text-white">${employees.reduce((s: number, e: any) => s + (e.salary || 0), 0).toLocaleString()}</span></div>
        </div>
      </div>
    </div>
  );
};
