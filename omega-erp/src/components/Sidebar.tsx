import React from 'react';
import {
  Briefcase, Users, Truck, FileText, ShoppingCart,
  Printer, Receipt, Package, UserCheck, BarChart3, History, Settings
} from 'lucide-react';

export const NavItem = ({ icon, label, active, onClick }: any) => (
  <div onClick={onClick} className={`flex items-center gap-5 px-8 py-3.5 cursor-pointer border-l-4 transition-all duration-200 ${active ? 'bg-blue-600/10 text-blue-500 border-blue-600 font-black' : 'hover:bg-slate-800 text-slate-500 border-transparent hover:text-slate-300 font-bold'}`}>
    <span className={active ? 'text-blue-500 scale-110' : ''}>{icon}</span><span className="text-xs uppercase tracking-widest">{label}</span>
  </div>
);

export const Sidebar = ({ activeTab, setActiveTab, onSave, onClose }: any) => (
  <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
    <div className="p-8 flex items-center gap-4 border-b border-slate-800">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg italic">Ω</div>
      <div className="flex flex-col"><span className="text-lg font-black text-white tracking-tighter leading-none">OMEGA</span><span className="text-[9px] font-black text-slate-500 tracking-[0.2em] uppercase">Enterprise</span></div>
    </div>
    <nav className="flex-1 overflow-y-auto py-6">
      <NavItem icon={<Briefcase size={18}/>} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
      <NavItem icon={<Users size={18}/>} label="Customers" active={activeTab === 'Customers'} onClick={() => setActiveTab('Customers')} />
      <NavItem icon={<Truck size={18}/>} label="Suppliers" active={activeTab === 'Suppliers'} onClick={() => setActiveTab('Suppliers')} />
      <NavItem icon={<FileText size={18}/>} label="Quotations" active={activeTab === 'Quotations'} onClick={() => setActiveTab('Quotations')} />
      <NavItem icon={<ShoppingCart size={18}/>} label="Orders" active={activeTab === 'Orders'} onClick={() => setActiveTab('Orders')} />
      <NavItem icon={<Printer size={18}/>} label="Job Cards" active={activeTab === 'Job Cards'} onClick={() => setActiveTab('Job Cards')} />
      <NavItem icon={<Receipt size={18}/>} label="Invoices" active={activeTab === 'Invoices'} onClick={() => setActiveTab('Invoices')} />
      <NavItem icon={<Package size={18}/>} label="Inventory" active={activeTab === 'Inventory'} onClick={() => setActiveTab('Inventory')} />
      <NavItem icon={<UserCheck size={18}/>} label="HR" active={activeTab === 'HR'} onClick={() => setActiveTab('HR')} />
      <NavItem icon={<BarChart3 size={18}/>} label="Reports" active={activeTab === 'Reports'} onClick={() => setActiveTab('Reports')} />
      <NavItem icon={<History size={18}/>} label="Audit" active={activeTab === 'Audit'} onClick={() => setActiveTab('Audit')} />
      <NavItem icon={<Settings size={18}/>} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
    </nav>
    <div className="p-6 bg-slate-950/30 border-t border-slate-800/50 space-y-3">
      <button onClick={onSave} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20 active:scale-95">Save to Disk</button>
      <button onClick={onClose} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95">Close File</button>
    </div>
  </aside>
);
