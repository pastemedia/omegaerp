import React from 'react';
import {
  X, Search, Plus, ArrowRightLeft, Eye, FileCheck, Receipt, Printer, CheckCircle
} from 'lucide-react';

export const Modal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="px-12 py-10 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-2xl font-black text-slate-800 tracking-tight italic">Ω {title}</h3>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white rounded-2xl text-slate-400 hover:text-rose-600 border border-slate-200 transition-all"><X size={20}/></button>
      </div>
      <div className="px-12 py-10 overflow-y-auto max-h-[70vh]">{children}</div>
    </div>
  </div>
);

export const TableView = ({ data, cols, onAction, actionLabel, actionIcon, secondAction, secondActionLabel, secondActionIcon }: any) => (
  <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-700">
    <table className="w-full text-left">
      <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
        <tr>{cols.map((c: any) => <th key={c} className="px-10 py-6">{c.replace('_', ' ')}</th>)}<th className="px-10 py-6 text-right">Actions</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
        {data.map((row: any, i: number) => <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
          {cols.map((c: any) => <td key={c} className={`px-10 py-6 ${c === 'status' ? 'text-[10px] uppercase tracking-widest font-black opacity-60' : ''} ${c.includes('amount') ? 'text-blue-600 font-black' : ''}`}>{row[c] || '-'}</td>)}
          <td className="px-10 py-6 text-right flex justify-end gap-3">
            {onAction && <button onClick={() => onAction(row)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-black text-[9px] uppercase tracking-widest">{actionIcon} {actionLabel}</button>}
            {secondAction && <button onClick={() => secondAction(row)} className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-black text-[9px] uppercase tracking-widest">{secondActionIcon} {secondActionLabel}</button>}
            <button className="text-slate-300 hover:text-slate-600 font-black text-[9px] uppercase tracking-widest transition-all">Details →</button>
          </td>
        </tr>)}
        {data.length === 0 && <tr><td colSpan={cols.length + 1} className="px-10 py-24 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest italic opacity-50">Empty Repository</td></tr>}
      </tbody>
    </table>
  </div>
);

export { Search, Plus, ArrowRightLeft, Eye, FileCheck, Receipt, Printer, CheckCircle };
