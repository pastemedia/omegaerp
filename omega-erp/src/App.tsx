import React, { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { FolderOpen, FilePlus, Printer, Settings, Users, FileText, Package, Briefcase, Plus, Save, Calculator, X } from 'lucide-react';

interface Customer {
  id?: number;
  name: string;
  organization?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  gstin?: string;
  customer_type?: string;
}

interface Quotation {
  id?: number;
  quote_no: string;
  customer_id: number;
  date: string;
  total_amount: number;
  status: string;
  items: QuotationItem[];
}

interface QuotationItem {
  id?: number;
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

function App() {
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isAddingQuotation, setIsAddingQuotation] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Customer>({ name: '' });

  const [calc, setCalc] = useState({ material_cost: 0, machine_cost: 0, labor_cost: 0, markup: 20 });
  const [calcResult, setCalcResult] = useState<number | null>(null);

  useEffect(() => {
    if (currentFile) {
      if (activeTab === 'Customers') loadCustomers();
      if (activeTab === 'Quotations') loadQuotations();
    }
  }, [currentFile, activeTab]);

  const loadCustomers = async () => {
    try {
      const res = await invoke<Customer[]>("get_customers_cmd");
      setCustomers(res);
    } catch (e) {
      setError(String(e));
    }
  };

  const loadQuotations = async () => {
    try {
      const res = await invoke<Quotation[]>("get_quotations_cmd");
      setQuotations(res);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleCreateCompany = async () => {
    try {
      const path = "company.oerp";
      await invoke("create_new_company_cmd", { path });
      setCurrentFile(path);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleOpenCompany = async () => {
    try {
      const path = "company.oerp";
      await invoke("open_company_cmd", { path });
      setCurrentFile(path);
      setError(null);
    } catch (e) {
      setError("Please create a company file first or check if company.oerp exists.");
    }
  };

  const handleSaveToDisk = async () => {
    try {
      await invoke("save_company_cmd");
      alert("Successfully saved to .oerp file!");
    } catch (e) {
      setError(String(e));
    }
  };

  const handleAddCustomer = async () => {
    try {
      await invoke("add_customer_cmd", { customer: newCustomer });
      setIsAddingCustomer(false);
      setNewCustomer({ name: '' });
      loadCustomers();
    } catch (e) {
      setError(String(e));
    }
  };

  const runCalculation = async () => {
    try {
      const total = await invoke<number>("calculate_print_cost", { calc });
      setCalcResult(total);
    } catch (e) {
      setError(String(e));
    }
  };

  if (!currentFile) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-blue-500 mb-2">Omega ERP</h1>
            <p className="text-slate-400">Printing, Signage & Packaging Management</p>
          </div>
          <div className="space-y-4">
            <button onClick={handleCreateCompany} className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-lg font-semibold transition-all">
              <FilePlus size={24} /> Create New Company
            </button>
            <button onClick={handleOpenCompany} className="w-full flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-lg font-semibold transition-all">
              <FolderOpen size={24} /> Open Existing Company
            </button>
          </div>
          {error && <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg text-sm text-center">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 text-xl font-bold text-white border-b border-slate-800">Omega ERP</div>
        <nav className="flex-1 overflow-y-auto py-4">
          <NavItem icon={<Briefcase size={20}/>} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
          <NavItem icon={<Users size={20}/>} label="Customers" active={activeTab === 'Customers'} onClick={() => setActiveTab('Customers')} />
          <NavItem icon={<FileText size={20}/>} label="Quotations" active={activeTab === 'Quotations'} onClick={() => setActiveTab('Quotations')} />
          <NavItem icon={<Printer size={20}/>} label="Job Cards" active={activeTab === 'Job Cards'} onClick={() => setActiveTab('Job Cards')} />
          <NavItem icon={<Package size={20}/>} label="Inventory" active={activeTab === 'Inventory'} onClick={() => setActiveTab('Inventory')} />
          <NavItem icon={<Settings size={20}/>} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
        </nav>
        <button onClick={handleSaveToDisk} className="m-4 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded font-medium text-xs transition-colors">
          <Save size={14}/> Save Changes to File
        </button>
        <div className="p-4 bg-slate-950 text-[10px] truncate border-t border-slate-800 opacity-50 text-center">
          {currentFile}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">{activeTab}</h2>
          <div className="flex items-center gap-4">
             {activeTab === 'Customers' && (
               <button onClick={() => setIsAddingCustomer(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors flex items-center gap-2">
                 <Plus size={16} /> New Customer
               </button>
             )}
             {activeTab === 'Quotations' && (
               <button onClick={() => setIsAddingQuotation(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors flex items-center gap-2">
                 <Calculator size={16} /> New Quotation
               </button>
             )}
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {activeTab === 'Dashboard' && <DashboardView />}
          {activeTab === 'Customers' && <CustomerView customers={customers} />}
          {activeTab === 'Quotations' && <QuotationView quotations={quotations} />}
        </section>
      </main>

      {/* Modals */}
      {isAddingCustomer && (
        <Modal title="Add New Customer" onClose={() => setIsAddingCustomer(false)}>
           <div className="space-y-4">
              <input placeholder="Full Name" className="modal-input" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
              <input placeholder="Organization" className="modal-input" value={newCustomer.organization} onChange={e => setNewCustomer({...newCustomer, organization: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Phone" className="modal-input" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                <input placeholder="Email" className="modal-input" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
              </div>
              <button onClick={handleAddCustomer} className="modal-save">Save Customer</button>
           </div>
        </Modal>
      )}

      {isAddingQuotation && (
        <Modal title="Printing Cost Calculator" onClose={() => setIsAddingQuotation(false)}>
           <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase">Material Cost ($)</label>
              <input type="number" className="modal-input" value={calc.material_cost} onChange={e => setCalc({...calc, material_cost: Number(e.target.value)})} />
              <label className="text-xs font-bold text-slate-500 uppercase">Machine Cost ($)</label>
              <input type="number" className="modal-input" value={calc.machine_cost} onChange={e => setCalc({...calc, machine_cost: Number(e.target.value)})} />
              <label className="text-xs font-bold text-slate-500 uppercase">Labor Cost ($)</label>
              <input type="number" className="modal-input" value={calc.labor_cost} onChange={e => setCalc({...calc, labor_cost: Number(e.target.value)})} />
              <label className="text-xs font-bold text-slate-500 uppercase">Markup (%)</label>
              <input type="number" className="modal-input" value={calc.markup} onChange={e => setCalc({...calc, markup: Number(e.target.value)})} />

              <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between border border-slate-200">
                <span className="font-bold text-slate-600">Estimated Total:</span>
                <span className="text-2xl font-black text-blue-600">${calcResult || '0.00'}</span>
              </div>

              <div className="flex gap-2">
                <button onClick={runCalculation} className="flex-1 bg-slate-700 text-white py-3 rounded-lg font-bold">Calculate</button>
                <button className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold opacity-50 cursor-not-allowed">Create Quote</button>
              </div>
           </div>
        </Modal>
      )}
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <div onClick={onClick} className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors ${active ? 'bg-blue-600 text-white shadow-lg z-10' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>
      {icon} <span className="font-medium">{label}</span>
    </div>
  );
}

function DashboardView() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
         <StatCard label="Pending Orders" value="12" color="blue" />
         <StatCard label="In Production" value="8" color="amber" />
         <StatCard label="Ready for Delivery" value="5" color="emerald" />
         <StatCard label="Low Stock Items" value="3" color="rose" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-slate-800 font-bold mb-4">Recent Activity</h3>
        <div className="space-y-4">
           <ActivityItem title="Quotation #1024 Created" time="10 mins ago" status="Draft" />
           <ActivityItem title="Job Card #556 Completed" time="45 mins ago" status="Ready" />
           <ActivityItem title="Inventory: Paper Gloss 170gsm Issued" time="1 hour ago" status="Stock Out" />
        </div>
      </div>
    </>
  );
}

function CustomerView({ customers }: { customers: Customer[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
       <table className="w-full text-left">
         <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
           <tr>
             <th className="px-6 py-4 font-semibold">Name</th>
             <th className="px-6 py-4 font-semibold">Organization</th>
             <th className="px-6 py-4 font-semibold">Contact</th>
             <th className="px-6 py-4 font-semibold text-right">Actions</th>
           </tr>
         </thead>
         <tbody className="divide-y divide-slate-100 text-sm">
           {customers.map(c => (
             <tr key={c.id} className="hover:bg-slate-50 transition-colors">
               <td className="px-6 py-4 font-medium text-slate-900">{c.name}</td>
               <td className="px-6 py-4 text-slate-600">{c.organization || '-'}</td>
               <td className="px-6 py-4 text-slate-600">{c.phone || c.email || '-'}</td>
               <td className="px-6 py-4 text-right">
                 <button className="text-blue-600 hover:text-blue-800 font-medium">View</button>
               </td>
             </tr>
           ))}
           {customers.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">No customers found.</td></tr>}
         </tbody>
       </table>
    </div>
  );
}

function QuotationView({ quotations }: { quotations: Quotation[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
       <table className="w-full text-left">
         <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
           <tr>
             <th className="px-6 py-4 font-semibold">Quote #</th>
             <th className="px-6 py-4 font-semibold">Date</th>
             <th className="px-6 py-4 font-semibold">Amount</th>
             <th className="px-6 py-4 font-semibold">Status</th>
             <th className="px-6 py-4 font-semibold text-right">Actions</th>
           </tr>
         </thead>
         <tbody className="divide-y divide-slate-100 text-sm">
           {quotations.map(q => (
             <tr key={q.id} className="hover:bg-slate-50 transition-colors">
               <td className="px-6 py-4 font-bold text-slate-900">{q.quote_no}</td>
               <td className="px-6 py-4 text-slate-600">{q.date}</td>
               <td className="px-6 py-4 font-bold text-blue-600">${q.total_amount.toFixed(2)}</td>
               <td className="px-6 py-4">
                 <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">{q.status}</span>
               </td>
               <td className="px-6 py-4 text-right">
                 <button className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
               </td>
             </tr>
           ))}
           {quotations.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No quotations found.</td></tr>}
         </tbody>
       </table>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string, value: string, color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-white text-blue-600 border-blue-100',
    amber: 'bg-white text-amber-600 border-amber-100',
    emerald: 'bg-white text-emerald-600 border-emerald-100',
    rose: 'bg-white text-rose-600 border-rose-100',
  };
  return (
    <div className={`p-6 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow`}>
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`text-3xl font-black mt-2 ${colors[color].split(' ')[1]}`}>{value}</span>
    </div>
  );
}

function ActivityItem({ title, time, status }: { title: string, time: string, status: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-800">{title}</span>
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{time}</span>
      </div>
      <span className="px-2 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded text-[9px] font-black uppercase tracking-widest">{status}</span>
    </div>
  );
}

export default App;
