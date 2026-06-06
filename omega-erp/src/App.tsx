import React, { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import {
  FolderOpen, FilePlus, Printer, Settings, Users, FileText,
  Package, Briefcase, Plus, Save, Calculator, X, Search,
  AlertCircle, CheckCircle2, Clock, Truck, ShoppingCart,
  Receipt, UserCheck, HardHat, Landmark, ArrowRightLeft, FileCheck,
  LogOut, Database, ShieldAlert, History
} from 'lucide-react';

// Interfaces
interface Customer { id?: number; name: string; organization?: string; phone?: string; email?: string; address?: string; customer_type?: string; }
interface Supplier { id?: number; name: string; phone?: string; address?: string; category?: string; }
interface Quotation { id?: number; quote_no: string; customer_id: number; date: string; total_amount: number; status: string; }
interface Order { id?: number; order_no: string; customer_id: number; order_date: string; delivery_date: string; status: string; total_amount: number; advance_paid: number; }
interface Invoice { id?: number; invoice_no: string; order_id?: number; date: string; total_amount: number; tax_amount: number; status: string; }
interface InventoryItem { id?: number; name: string; category?: string; unit?: string; min_stock?: number; current_stock?: number; }
interface JobCard { id?: number; order_id?: number; job_no: string; machine?: string; assigned_to?: string; status: string; priority: string; instructions?: string; }
interface Employee { id?: number; full_name: string; role?: string; department?: string; salary?: number; joining_date?: string; }
interface AuditEntry { id: number; action: string; entity: string; timestamp: string; details: string; }

function App() {
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<string | null>(null);

  // Form States
  const [newCustomer, setNewCustomer] = useState<Customer>({ name: '' });
  const [newSupplier, setNewSupplier] = useState<Supplier>({ name: '' });
  const [newInventory, setNewInventory] = useState<InventoryItem>({ name: '', current_stock: 0, min_stock: 0 });
  const [newJobCard, setNewJobCard] = useState<JobCard>({ job_no: '', status: 'Pending', priority: 'Normal' });
  const [newOrder, setNewOrder] = useState<Order>({ order_no: '', customer_id: 1, order_date: new Date().toISOString().split('T')[0], delivery_date: '', status: 'Confirmed', total_amount: 0, advance_paid: 0 });
  const [newInvoice, setNewInvoice] = useState<Invoice>({ invoice_no: '', date: new Date().toISOString().split('T')[0], total_amount: 0, tax_amount: 0, status: 'Unpaid' });
  const [newEmployee, setNewEmployee] = useState<Employee>({ full_name: '' });

  const [calc, setCalc] = useState({ material_cost: 0, machine_cost: 0, labor_cost: 0, markup: 20 });
  const [calcResult, setCalcResult] = useState<number | null>(null);

  useEffect(() => {
    if (currentFile) {
      const loaders: Record<string, () => void> = {
        'Customers': loadCustomers, 'Suppliers': loadSuppliers, 'Quotations': loadQuotations,
        'Orders': loadOrders, 'Invoices': loadInvoices, 'Inventory': loadInventory,
        'Job Cards': loadJobCards, 'HR': loadEmployees, 'Audit': loadAuditLogs,
        'Dashboard': async () => { loadOrders(); loadInventory(); }
      };
      if (loaders[activeTab]) loaders[activeTab]();
    }
  }, [currentFile, activeTab]);

  const loadCustomers = async () => setCustomers(await invoke("get_customers_cmd"));
  const loadSuppliers = async () => setSuppliers(await invoke("get_suppliers_cmd"));
  const loadQuotations = async () => setQuotations(await invoke("get_quotations_cmd"));
  const loadOrders = async () => setOrders(await invoke("get_orders_cmd"));
  const loadInvoices = async () => setInvoices(await invoke("get_invoices_cmd"));
  const loadInventory = async () => setInventory(await invoke("get_inventory_cmd"));
  const loadJobCards = async () => setJobCards(await invoke("get_job_cards_cmd"));
  const loadEmployees = async () => setEmployees(await invoke("get_employees_cmd"));
  const loadAuditLogs = async () => setAuditLogs(await invoke("get_audit_logs_cmd"));

  const handleCreateCompany = async () => {
    try { await invoke("create_new_company_cmd", { path: "company.oerp" }); setCurrentFile("company.oerp"); setError(null); } catch (e) { setError(String(e)); }
  };

  const handleOpenCompany = async () => {
    try { await invoke("open_company_cmd", { path: "company.oerp" }); setCurrentFile("company.oerp"); setError(null); } catch (e) { setError("No company.oerp file found."); }
  };

  const handleSaveToDisk = async () => { try { await invoke("save_company_cmd"); alert("Database state serialized and bundled to .oerp file."); } catch (e) { setError(String(e)); } };
  const handleClose = async () => { try { await invoke("close_company_cmd"); setCurrentFile(null); setActiveTab('Dashboard'); } catch (e) { setError(String(e)); } };

  const handleAdd = async (cmd: string, payload: any, reload: () => void) => {
    try { await invoke(cmd, payload); setIsModalOpen(null); reload(); } catch (e) { setError(String(e)); }
  };

  const convertToOrder = async (quote: Quotation) => {
    const order: Order = {
      order_no: `ORD-${quote.quote_no.split('-')[1] || Date.now().toString().slice(-4)}`,
      customer_id: quote.customer_id,
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: '',
      status: 'Confirmed',
      total_amount: quote.total_amount,
      advance_paid: 0
    };
    await handleAdd("add_order_cmd", { item: order }, () => { setActiveTab('Orders'); loadOrders(); });
  };

  const generateInvoice = async (order: Order) => {
    const invoice: Invoice = {
      invoice_no: `INV-${order.order_no.split('-')[1] || Date.now().toString().slice(-4)}`,
      order_id: order.id,
      date: new Date().toISOString().split('T')[0],
      total_amount: order.total_amount,
      tax_amount: order.total_amount * 0.18,
      status: 'Unpaid'
    };
    await handleAdd("add_invoice_cmd", { item: invoice }, () => { setActiveTab('Invoices'); loadInvoices(); });
  };

  if (!currentFile) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center">
            <h1 className="text-4xl font-black text-blue-500 mb-2 tracking-tighter italic">Ω Omega ERP</h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Portable Business Intelligence</p>
          </div>
          <div className="space-y-4 pt-4">
            <button onClick={handleCreateCompany} className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-900/40"><FilePlus size={20}/> New Project</button>
            <button onClick={handleOpenCompany} className="w-full flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all"><FolderOpen size={20}/> Load .oerp</button>
          </div>
          {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-4 rounded-xl text-xs font-bold text-center tracking-tight">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="p-8 flex items-center gap-4 border-b border-slate-800">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-900/50 italic">Ω</div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-white tracking-tighter leading-none">OMEGA</span>
            <span className="text-[9px] font-black text-slate-500 tracking-[0.2em] uppercase">Enterprise</span>
          </div>
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
          <NavItem icon={<History size={18}/>} label="Audit" active={activeTab === 'Audit'} onClick={() => setActiveTab('Audit')} />
          <NavItem icon={<Settings size={18}/>} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
        </nav>
        <div className="p-6 bg-slate-950/30 border-t border-slate-800/50 space-y-3">
          <button onClick={handleSaveToDisk} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20 active:scale-95"><Save size={14}/> Save to Disk</button>
          <button onClick={handleClose} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"><LogOut size={14}/> Close File</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-sm z-10">
          <div className="flex items-center gap-4">
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">{activeTab}</h2>
             <span className="bg-slate-100 text-[9px] font-black text-slate-400 px-3 py-1 rounded-full uppercase tracking-widest">{currentFile}</span>
          </div>
          {['Dashboard', 'Settings', 'Audit'].indexOf(activeTab) === -1 && (
            <button onClick={() => setIsModalOpen(activeTab)} className="header-btn px-6 py-2.5 rounded-xl flex items-center gap-2 bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-200"><Plus size={16}/> New {activeTab === 'HR' ? 'Employee' : activeTab.slice(0, -1)}</button>
          )}
        </header>

        <section className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          {activeTab === 'Dashboard' && <DashboardView orders={orders} inventory={inventory} />}
          {activeTab === 'Customers' && <TableView data={customers} cols={['name', 'organization', 'phone', 'email']} />}
          {activeTab === 'Suppliers' && <TableView data={suppliers} cols={['name', 'phone', 'category']} />}
          {activeTab === 'Quotations' && <TableView data={quotations} cols={['quote_no', 'date', 'total_amount', 'status']} onAction={convertToOrder} actionLabel="Order" actionIcon={<ArrowRightLeft size={14}/>} />}
          {activeTab === 'Orders' && <TableView data={orders} cols={['order_no', 'order_date', 'delivery_date', 'total_amount', 'status']} onAction={(o: any) => { setNewJobCard({...newJobCard, order_id: o.id}); setIsModalOpen('Job Cards'); }} actionLabel="Dispatch" actionIcon={<FileCheck size={14}/>} secondAction={generateInvoice} secondActionLabel="Bill" secondActionIcon={<Receipt size={14}/>} />}
          {activeTab === 'Invoices' && <TableView data={invoices} cols={['invoice_no', 'date', 'total_amount', 'status']} />}
          {activeTab === 'Inventory' && <TableView data={inventory} cols={['name', 'category', 'current_stock', 'unit']} />}
          {activeTab === 'HR' && <TableView data={employees} cols={['full_name', 'role', 'department', 'joining_date']} />}
          {activeTab === 'Job Cards' && <JobCardView cards={jobCards} />}
          {activeTab === 'Audit' && <TableView data={auditLogs} cols={['timestamp', 'action', 'entity', 'details']} />}
          {activeTab === 'Settings' && <SettingsView />}
        </section>
      </main>

      {/* --- Entity Modals --- */}
      {isModalOpen === 'Customers' && <Modal title="Add Customer" onClose={() => setIsModalOpen(null)}>
        <input placeholder="Client Full Name" className="modal-input mb-4" onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
        <input placeholder="Organization / Company" className="modal-input mb-4" onChange={e => setNewCustomer({...newCustomer, organization: e.target.value})} />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input placeholder="Phone Number" className="modal-input" onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
          <input placeholder="Email Address" className="modal-input" onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
        </div>
        <button onClick={() => handleAdd("add_customer_cmd", { customer: newCustomer }, loadCustomers)} className="modal-save">Create Profile</button>
      </Modal>}

      {isModalOpen === 'Suppliers' && <Modal title="Add Supplier" onClose={() => setIsModalOpen(null)}>
        <input placeholder="Vendor Name" className="modal-input mb-4" onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
        <input placeholder="Supply Category (e.g. Paper)" className="modal-input mb-4" onChange={e => setNewSupplier({...newSupplier, category: e.target.value})} />
        <input placeholder="Contact Phone" className="modal-input mb-4" onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} />
        <button onClick={() => handleAdd("add_supplier_cmd", { item: newSupplier }, loadSuppliers)} className="modal-save">Add Supplier</button>
      </Modal>}

      {isModalOpen === 'Inventory' && <Modal title="Add Stock Item" onClose={() => setIsModalOpen(null)}>
        <input placeholder="Material Name" className="modal-input mb-4" onChange={e => setNewInventory({...newInventory, name: e.target.value})} />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input placeholder="Category" className="modal-input" onChange={e => setNewInventory({...newInventory, category: e.target.value})} />
          <input placeholder="Unit (e.g. KG)" className="modal-input" onChange={e => setNewInventory({...newInventory, unit: e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><label className="label">Current Stock</label><input type="number" className="modal-input" onChange={e => setNewInventory({...newInventory, current_stock: Number(e.target.value)})} /></div>
          <div><label className="label">Min Level</label><input type="number" className="modal-input" onChange={e => setNewInventory({...newInventory, min_stock: Number(e.target.value)})} /></div>
        </div>
        <button onClick={() => handleAdd("add_inventory_item_cmd", { item: newInventory }, loadInventory)} className="modal-save">Add to Stock</button>
      </Modal>}

      {isModalOpen === 'Job Cards' && <Modal title="Create Job Card" onClose={() => setIsModalOpen(null)}>
        <input placeholder="Job ID (e.g. JB-101)" className="modal-input mb-4" value={newJobCard.job_no} onChange={e => setNewJobCard({...newJobCard, job_no: e.target.value})} />
        <input placeholder="Machine / Section" className="modal-input mb-4" value={newJobCard.machine || ''} onChange={e => setNewJobCard({...newJobCard, machine: e.target.value})} />
        <textarea placeholder="Production Instructions" className="modal-input mb-4 h-24 resize-none" value={newJobCard.instructions || ''} onChange={e => setNewJobCard({...newJobCard, instructions: e.target.value})}></textarea>
        <button onClick={() => handleAdd("add_job_card_cmd", { card: newJobCard }, loadJobCards)} className="modal-save">Dispatch to Shop Floor</button>
      </Modal>}

      {isModalOpen === 'Orders' && <Modal title="Confirm New Order" onClose={() => setIsModalOpen(null)}>
        <input placeholder="Order Reference #" className="modal-input mb-4" onChange={e => setNewOrder({...newOrder, order_no: e.target.value})} />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><label className="label">Order Date</label><input type="date" className="modal-input" value={newOrder.order_date} onChange={e => setNewOrder({...newOrder, order_date: e.target.value})} /></div>
          <div><label className="label">Delivery Date</label><input type="date" className="modal-input" onChange={e => setNewOrder({...newOrder, delivery_date: e.target.value})} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><label className="label">Total Amount</label><input type="number" className="modal-input" onChange={e => setNewOrder({...newOrder, total_amount: Number(e.target.value)})} /></div>
          <div><label className="label">Advance Paid</label><input type="number" className="modal-input" onChange={e => setNewOrder({...newOrder, advance_paid: Number(e.target.value)})} /></div>
        </div>
        <button onClick={() => handleAdd("add_order_cmd", { item: newOrder }, loadOrders)} className="modal-save">Finalize Order</button>
      </Modal>}

      {isModalOpen === 'Invoices' && <Modal title="Generate Tax Invoice" onClose={() => setIsModalOpen(null)}>
        <input placeholder="Invoice Number" className="modal-input mb-4" onChange={e => setNewInvoice({...newInvoice, invoice_no: e.target.value})} />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><label className="label">Amount</label><input type="number" className="modal-input" onChange={e => setNewInvoice({...newInvoice, total_amount: Number(e.target.value)})} /></div>
          <div><label className="label">Tax (GST)</label><input type="number" className="modal-input" onChange={e => setNewInvoice({...newInvoice, tax_amount: Number(e.target.value)})} /></div>
        </div>
        <button onClick={() => handleAdd("add_invoice_cmd", { item: newInvoice }, loadInvoices)} className="modal-save">Generate Document</button>
      </Modal>}

      {isModalOpen === 'HR' && <Modal title="Onboard Employee" onClose={() => setIsModalOpen(null)}>
        <input placeholder="Full Name" className="modal-input mb-4" onChange={e => setNewEmployee({...newEmployee, full_name: e.target.value})} />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input placeholder="Role" className="modal-input" onChange={e => setNewEmployee({...newEmployee, role: e.target.value})} />
          <input placeholder="Department" className="modal-input" onChange={e => setNewEmployee({...newEmployee, department: e.target.value})} />
        </div>
        <input type="number" placeholder="Monthly Salary" className="modal-input mb-4" onChange={e => setNewEmployee({...newEmployee, salary: Number(e.target.value)})} />
        <button onClick={() => handleAdd("add_employee_cmd", { item: newEmployee }, loadEmployees)} className="modal-save">Add Staff Member</button>
      </Modal>}

      {isModalOpen === 'Quotations' && <Modal title="Smart Cost Estimator" onClose={() => setIsModalOpen(null)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Material Cost</label><input type="number" className="modal-input" onChange={e => setCalc({...calc, material_cost: Number(e.target.value)})} /></div>
            <div><label className="label">Machine Cost</label><input type="number" className="modal-input" onChange={e => setCalc({...calc, machine_cost: Number(e.target.value)})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Labor Cost</label><input type="number" className="modal-input" onChange={e => setCalc({...calc, labor_cost: Number(e.target.value)})} /></div>
            <div><label className="label">Markup %</label><input type="number" className="modal-input" value={calc.markup} onChange={e => setCalc({...calc, markup: Number(e.target.value)})} /></div>
          </div>
          <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl flex justify-between items-center shadow-inner mt-4 animate-in fade-in zoom-in-95 duration-300">
            <span className="font-black text-blue-900 uppercase text-[10px] tracking-widest">Estimated Value:</span>
            <span className="text-3xl font-black text-blue-600 tracking-tighter">${calcResult?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={async () => setCalcResult(await invoke("calculate_print_cost", { calc }))} className="flex-1 py-4 bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg hover:bg-slate-700 transition-all active:scale-95">Calculate</button>
            <button disabled={!calcResult || customers.length === 0} onClick={async () => {
              const quote: Quotation = { quote_no: `QT-${Date.now().toString().slice(-6)}`, customer_id: customers[0]?.id || 1, date: new Date().toISOString().split('T')[0], total_amount: calcResult!, status: 'Draft' };
              await handleAdd("add_quotation_cmd", { quote }, loadQuotations);
            }} className="flex-1 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg hover:bg-blue-500 transition-all disabled:opacity-50 active:scale-95">Create Quote</button>
          </div>
        </div>
      </Modal>}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <div onClick={onClick} className={`flex items-center gap-5 px-8 py-3.5 cursor-pointer border-l-4 transition-all duration-200 ${active ? 'bg-blue-600/10 text-blue-500 border-blue-600 font-black' : 'hover:bg-slate-800 text-slate-500 border-transparent hover:text-slate-300 font-bold'}`}>
      <span className={active ? 'text-blue-500 scale-110 transition-transform' : ''}>{icon}</span>
      <span className="text-xs uppercase tracking-widest">{label}</span>
    </div>
  );
}

function TableView({ data, cols, onAction, actionLabel, actionIcon, secondAction, secondActionLabel, secondActionIcon }: any) {
  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-700">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
          <tr>{cols.map((c: any) => <th key={c} className="px-10 py-6">{c.replace('_', ' ')}</th>)}<th className="px-10 py-6 text-right">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
          {data.map((row: any, i: number) => <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
            {cols.map((c: any) => <td key={c} className={`px-10 py-6 ${c === 'status' ? 'text-[10px] uppercase tracking-widest font-black opacity-60' : ''} ${c.includes('amount') ? 'text-blue-600 font-black' : ''}`}>{row[c] || '-'}</td>)}
            <td className="px-10 py-6 text-right flex justify-end gap-3">
              {onAction && <button onClick={() => onAction(row)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-black text-[9px] uppercase tracking-widest transition-transform hover:scale-105">{actionIcon} {actionLabel}</button>}
              {secondAction && <button onClick={() => secondAction(row)} className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-black text-[9px] uppercase tracking-widest transition-transform hover:scale-105">{secondActionIcon} {secondActionLabel}</button>}
              <button className="text-slate-300 hover:text-slate-600 font-black text-[9px] uppercase tracking-widest transition-all">Details →</button>
            </td>
          </tr>)}
          {data.length === 0 && <tr><td colSpan={cols.length + 1} className="px-10 py-24 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest italic opacity-50">Empty Data Repository</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function DashboardView({ orders, inventory }: any) {
  const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
  const lowStockCount = inventory.filter((i: any) => (i.current_stock || 0) <= (i.min_stock || 0)).length;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard label="Shop Floor Load" value="74%" color="blue" icon={<Clock size={20}/>} />
        <MetricCard label="Active Orders" value={orders.length.toString()} color="amber" icon={<ShoppingCart size={20}/>} />
        <MetricCard label="Critical Stock" value={lowStockCount.toString()} color="rose" icon={<AlertCircle size={20}/>} />
        <MetricCard label="Revenue MTD" value={`$${(totalRevenue/1000).toFixed(1)}k`} color="emerald" icon={<Landmark size={20}/>} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-10">
          <div className="flex items-center justify-between mb-10 border-b border-slate-100 pb-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.3em]">System Intelligence</h3>
            <span className="flex items-center gap-2 text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase"><Database size={10}/> SQLite Transaction Log</span>
          </div>
          <div className="space-y-8">
             <ActivityItem title="Quotation engine optimized" time="10 mins ago" status="System" icon={<ShieldAlert size={12}/>} />
             <ActivityItem title="File-based storage verified" time="45 mins ago" status="Security" icon={<ShieldAlert size={12}/>} />
             <ActivityItem title="Production queue monitoring" time="1 hour ago" status="Shop" icon={<History size={12}/>} />
             <ActivityItem title="Audit logs compiled" time="3 hours ago" status="Audit" icon={<History size={12}/>} />
          </div>
        </div>
        <div className="bg-slate-900 rounded-3xl p-10 text-white flex flex-col justify-between overflow-hidden relative shadow-2xl shadow-blue-900/20">
          <div className="relative z-10">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4">Production Throughput</h3>
            <p className="text-6xl font-black italic tracking-tighter">74.2<span className="text-blue-500 text-3xl">%</span></p>
            <p className="text-slate-500 text-[10px] mt-4 font-bold uppercase tracking-widest leading-relaxed">System utilized across all<br/>production nodes.</p>
          </div>
          <div className="h-3 w-full bg-slate-800 rounded-full mt-10 relative z-10 overflow-hidden shadow-inner">
            <div className="h-3 bg-blue-500 rounded-full w-[74%] shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-pulse"></div>
          </div>
          <div className="absolute -right-16 -bottom-16 opacity-[0.03] rotate-12 scale-150"><Briefcase size={240} /></div>
        </div>
      </div>
    </div>
  );
}

function JobCardView({ cards }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
      {cards.map((c: any) => <div key={c.id} className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 hover:shadow-2xl hover:translate-y-[-4px] transition-all cursor-pointer group">
        <div className="flex justify-between items-start mb-8 font-black uppercase text-[10px] tracking-widest text-slate-300">
          <span className="group-hover:text-blue-600 transition-colors">{c.job_no}</span>
          <span className={`px-3 py-1 rounded-full ${c.priority === 'Urgent' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-slate-100 text-slate-500'}`}>{c.priority}</span>
        </div>
        <h4 className="text-2xl font-black text-slate-800 mb-2 leading-none">{c.machine || 'General Shop'}</h4>
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10"><HardHat size={12}/> Operator: {c.assigned_to || 'Pending'}</div>
        <div className="flex justify-between pt-6 border-t border-slate-100 items-center">
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Live Status</span>
          <span className="text-xs font-black text-blue-600 uppercase italic tracking-tight group-hover:scale-110 transition-transform">{c.status}</span>
        </div>
      </div>)}
      {cards.length === 0 && <div className="col-span-full py-40 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.3em] italic opacity-50">Shop Floor Quiet</div>}
    </div>
  );
}

function SettingsView() {
  return (
    <div className="max-w-2xl bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-8 pb-4 border-b">Company Profile</h3>
      <div className="space-y-6">
        <div><label className="label">Company Name</label><input className="modal-input" defaultValue="Omega Offset Printers" /></div>
        <div className="grid grid-cols-2 gap-6">
          <div><label className="label">GSTIN</label><input className="modal-input" defaultValue="27AAAAA0000A1Z5" /></div>
          <div><label className="label">Contact Email</label><input className="modal-input" defaultValue="admin@omegaerp.local" /></div>
        </div>
        <div><label className="label">Address</label><textarea className="modal-input h-24 resize-none" defaultValue="Plot No. 44, Industrial Estate, Sector 2, Gateway City"></textarea></div>
        <button onClick={() => alert("Profile updated locally.")} className="modal-save">Update Profile</button>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.2)] w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="px-12 py-10 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between"><h3 className="text-2xl font-black text-slate-800 tracking-tight italic">Ω {title}</h3><button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white rounded-2xl text-slate-400 hover:text-rose-600 hover:shadow-xl transition-all border border-slate-200"><X size={20}/></button></div>
        <div className="px-12 py-10 overflow-y-auto max-h-[70vh]">{children}</div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, icon }: any) {
  const colors: Record<string, string> = { blue: 'text-blue-600', amber: 'text-amber-600', emerald: 'text-emerald-600', rose: 'text-rose-600' };
  return (
    <div className="p-8 rounded-[2rem] bg-white shadow-xl shadow-slate-200/40 border border-slate-200 hover:shadow-2xl transition-all group overflow-hidden relative">
      <div className="flex items-center justify-between mb-6 relative z-10">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
        <div className={`p-3 rounded-2xl bg-slate-50 ${colors[color]} group-hover:scale-110 transition-transform`}>{icon}</div>
      </div>
      <span className={`text-4xl font-black tracking-tighter relative z-10 ${colors[color]}`}>{value}</span>
      <div className={`absolute -right-6 -bottom-6 opacity-[0.02] rotate-12 group-hover:rotate-0 transition-all duration-700 ${colors[color]}`}>{icon}</div>
    </div>
  );
}

function ActivityItem({ title, time, status, icon }: any) {
  return (
    <div className="flex items-center justify-between group cursor-default">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors">{icon}</div>
        <div className="flex flex-col"><span className="text-sm font-black text-slate-700 group-hover:text-blue-600 transition-colors">{title}</span><span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{time}</span></div>
      </div>
      <span className="px-4 py-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm">{status}</span>
    </div>
  );
}

export default App;
