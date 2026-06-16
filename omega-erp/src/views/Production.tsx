import React from 'react';
import { HardHat, Activity } from 'lucide-react';

export const JobCardView = ({ cards, onTrack }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
    {cards.map((c: any) => <div key={c.id} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 hover:shadow-2xl hover:translate-y-[-4px] transition-all cursor-pointer group">
      <div className="flex justify-between items-start mb-8 font-black uppercase text-[10px] tracking-widest text-slate-300"><span>{c.job_no}</span><span className={`px-3 py-1 rounded-full ${c.priority === 'Urgent' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-slate-100 text-slate-500'}`}>{c.priority}</span></div>
      <h4 className="text-2xl font-black text-slate-800 mb-2 leading-none">{c.machine || 'General Shop'}</h4><div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10"><HardHat size={12}/> Operator: {c.assigned_to || 'Pending'}</div>
      <div className="flex justify-between pt-6 border-t border-slate-100 items-center"><button onClick={() => onTrack(c)} className="text-[9px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-blue-600 hover:text-white transition-all"><Activity size={12}/> Track Flow</button><span className="text-xs font-black text-blue-600 uppercase italic tracking-tight">{c.status}</span></div>
    </div>)}
    {cards.length === 0 && <div className="col-span-full py-40 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.3em] italic opacity-50">Shop Floor Quiet</div>}
  </div>
);
