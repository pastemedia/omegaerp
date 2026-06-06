import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { Sidebar } from './components/Sidebar';
import { Modal, TableView, Search, Plus, ArrowRightLeft, Eye, FileCheck, Receipt, Printer, CheckCircle } from './components/Common';
import { DashboardView } from './views/Dashboard';
import { ReportsView } from './views/Reports';
import { EmployeeView } from './views/HR';
import { JobCardView } from './views/Production';
import { FilePlus, FolderOpen, CheckCircle2 } from 'lucide-react';

function App() {
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [jobCards, setJobCards] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [jobStages, setJobStages] = useState<any[]>([]);
  const [printDoc, setPrintDoc] = useState<any>(null);

  // Form states
  const [newCustomer, setNewCustomer] = useState({ name: '' });
  const [newSupplier, setNewSupplier] = useState({ name: '' });
  const [newJobCard, setNewJobCard] = useState<any>({ job_no: '', status: 'Pending', priority: 'Normal' });
  const [calc, setCalc] = useState({ material_cost: 0, machine_cost: 0, labor_cost: 0, markup: 20 });
  const [calcResult, setCalcResult] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    if (!currentFile) return;
    try {
      setCustomers(await invoke("get_customers_cmd"));
      setSuppliers(await invoke("get_suppliers_cmd"));
      setQuotations(await invoke("get_quotations_cmd"));
      setOrders(await invoke("get_orders_cmd"));
      setInvoices(await invoke("get_invoices_cmd"));
      setInventory(await invoke("get_inventory_cmd"));
      setJobCards(await invoke("get_job_cards_cmd"));
      setEmployees(await invoke("get_employees_cmd"));
      setAuditLogs(await invoke("get_audit_logs_cmd"));
      setAttendance(await invoke("get_attendance_cmd", { date: new Date().toISOString().split('T')[0] }));
    } catch (e) { console.error(e); }
  }, [currentFile]);

  useEffect(() => { loadAll(); }, [loadAll, activeTab]);

  const loadJobStages = async (id: number) => {
    setJobStages(await invoke("get_production_stages_cmd", { jobCardId: id }));
  };

  const handleAdd = async (cmd: string, payload: any) => {
    try { await invoke(cmd, payload); setIsModalOpen(null); loadAll(); } catch (e) { setError(String(e)); }
  };

  const filterData = (list: any[]) => list.filter(item => JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase()));

  if (!currentFile) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700">
          <div className="text-center"><h1 className="text-4xl font-black text-blue-500 mb-2 italic">Ω Omega ERP</h1><p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Portable Business Intelligence</p></div>
          <div className="space-y-4 pt-4">
            <button onClick={async () => { try { await invoke("create_new_company_cmd", { path: "company.oerp" }); setCurrentFile("company.oerp"); setError(null); } catch (e) { setError(String(e)); } }} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center gap-3"><FilePlus size={20}/> New Project</button>
            <button onClick={async () => { try { await invoke("open_company_cmd", { path: "company.oerp" }); setCurrentFile("company.oerp"); setError(null); } catch (e) { setError("No company.oerp file found."); } }} className="w-full bg-slate-700 hover:bg-slate-600 py-4 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center gap-3"><FolderOpen size={20}/> Load .oerp</button>
          </div>
          {error && <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-4 rounded-xl text-xs font-bold text-center">{error}</div>}
        </div>
      </div>
    );
  }

  if (printDoc) {
    return (
      <div className="min-h-screen bg-white p-20 text-slate-800 font-serif">
         <div className="flex justify-between border-b-4 border-slate-900 pb-10 mb-10"><div><h1 className="text-4xl font-black italic tracking-tighter text-slate-900">OMEGA OFFSET PRINTERS</h1><p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">Quality Printing & Signage Solutions</p></div><div className="text-right"><p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600 mb-2">{printDoc.type}</p><p className="text-2xl font-black tracking-tight">{printDoc.id}</p></div></div>
         <div className="grid grid-cols-2 gap-20 mb-20"><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill To:</p><p className="text-lg font-bold">Valued Customer # {printDoc.customer_id}</p></div><div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date:</p><p className="text-sm font-bold">{printDoc.date}</p></div></div>
         <table className="w-full mb-20"><thead className="border-y-2 border-slate-100"><tr><th className="py-4 text-left text-[10px] font-black uppercase">Item Description</th><th className="py-4 text-right text-[10px] font-black uppercase">Amount</th></tr></thead><tbody><tr><td className="py-6 text-sm font-medium">Standard Production / Custom Order Package</td><td className="py-6 text-right font-black">${printDoc.amount.toFixed(2)}</td></tr></tbody></table>
         <div className="flex justify-end border-t-2 border-slate-900 pt-6"><div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Total</p><p className="text-3xl font-black tracking-tighter">${printDoc.amount.toFixed(2)}</p></div></div>
         <div className="fixed bottom-10 left-10 right-10 flex justify-between items-center print:hidden border-t pt-10"><button onClick={() => setPrintDoc(null)} className="px-6 py-2 rounded-xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest">Exit Preview</button><button onClick={() => window.print()} className="px-10 py-3 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl">Confirm & Print</button></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSave={async () => { await invoke("save_company_cmd"); alert("Saved!"); }} onClose={async () => { await invoke("close_company_cmd"); setCurrentFile(null); }} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-sm z-10">
          <div className="flex items-center gap-8 flex-1">
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">{activeTab}</h2>
             <div className="relative w-full max-w-md group"><Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" /><input placeholder="Global search Repository..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
          </div>
          {['Dashboard', 'Settings', 'Audit', 'Reports'].indexOf(activeTab) === -1 && <button onClick={() => setIsModalOpen(activeTab)} className="header-btn px-6 py-2.5 rounded-xl flex items-center gap-2 bg-blue-600 text-white font-black text-xs uppercase tracking-widest"><Plus size={16}/> New {activeTab.slice(0, -1)}</button>}
        </header>

        <section className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          {activeTab === 'Dashboard' && <DashboardView orders={orders} inventory={inventory} />}
          {activeTab === 'Customers' && <TableView data={filterData(customers)} cols={['name', 'organization', 'phone', 'email']} />}
          {activeTab === 'Suppliers' && <TableView data={filterData(suppliers)} cols={['name', 'phone', 'category']} />}
          {activeTab === 'Quotations' && <TableView data={filterData(quotations)} cols={['quote_no', 'date', 'total_amount', 'status']} onAction={async (q: any) => { const order = { order_no: `ORD-${q.quote_no.split('-')[1]}`, customer_id: q.customer_id, order_date: new Date().toISOString().split('T')[0], delivery_date: '', status: 'Confirmed', total_amount: q.total_amount, advance_paid: 0 }; await handleAdd("add_order_cmd", { item: order }); setActiveTab('Orders'); }} actionLabel="Order" actionIcon={<ArrowRightLeft size={14}/>} secondAction={(q: any) => setPrintDoc({ type: 'Quotation', id: q.quote_no, date: q.date, amount: q.total_amount, customer_id: q.customer_id })} secondActionLabel="View" secondActionIcon={<Eye size={14}/>} />}
          {activeTab === 'Orders' && <TableView data={filterData(orders)} cols={['order_no', 'order_date', 'delivery_date', 'total_amount', 'status']} onAction={(o: any) => { setNewJobCard({ ...newJobCard, order_id: o.id }); setIsModalOpen('Job Cards'); }} actionLabel="Dispatch" actionIcon={<FileCheck size={14}/>} secondAction={async (o: any) => { const inv = { invoice_no: `INV-${o.order_no.split('-')[1]}`, order_id: o.id, date: new Date().toISOString().split('T')[0], total_amount: o.total_amount, tax_amount: o.total_amount*0.18, status: 'Unpaid' }; await handleAdd("add_invoice_cmd", { item: inv }); setActiveTab('Invoices'); }} secondActionLabel="Bill" secondActionIcon={<Receipt size={14}/>} />}
          {activeTab === 'Invoices' && <TableView data={filterData(invoices)} cols={['invoice_no', 'date', 'total_amount', 'status']} onAction={(i: any) => setPrintDoc({ type: 'Tax Invoice', id: i.invoice_no, date: i.date, amount: i.total_amount, customer_id: i.customer_id })} actionLabel="Print" actionIcon={<Printer size={14}/>} />}
          {activeTab === 'Inventory' && <TableView data={filterData(inventory)} cols={['name', 'category', 'current_stock', 'unit']} />}
          {activeTab === 'HR' && <EmployeeView employees={employees} attendance={attendance} onMark={async (id: number) => { await invoke("mark_attendance_cmd", { att: { employee_id: id, date: new Date().toISOString().split('T')[0], status: 'Present', clock_in: new Date().toLocaleTimeString().slice(0, 5) } }); loadAll(); }} />}
          {activeTab === 'Job Cards' && <JobCardView cards={filterData(jobCards)} onTrack={(j: any) => { setSelectedJob(j); loadJobStages(j.id); setIsModalOpen('Track'); }} />}
          {activeTab === 'Reports' && <ReportsView orders={orders} invoices={invoices} employees={employees} />}
          {activeTab === 'Audit' && <TableView data={filterData(auditLogs)} cols={['timestamp', 'action', 'entity', 'details']} />}
        </section>
      </main>

      {/* --- Entity Modals --- */}
      {isModalOpen === 'Customers' && <Modal title="Add Customer" onClose={() => setIsModalOpen(null)}><input placeholder="Name" className="modal-input mb-4" onChange={(e:any) => setNewCustomer({...newCustomer, name: e.target.value})} /><button onClick={() => handleAdd("add_customer_cmd", { customer: newCustomer })} className="modal-save">Create Profile</button></Modal>}
      {isModalOpen === 'Suppliers' && <Modal title="Add Supplier" onClose={() => setIsModalOpen(null)}><input placeholder="Name" className="modal-input mb-4" onChange={(e:any) => setNewSupplier({...newSupplier, name: e.target.value})} /><button onClick={() => handleAdd("add_supplier_cmd", { item: newSupplier })} className="modal-save">Add Supplier</button></Modal>}
      {isModalOpen === 'Quotations' && <Modal title="Cost Estimator" onClose={() => setIsModalOpen(null)}><div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="label">Material</label><input type="number" className="modal-input" onChange={(e:any) => setCalc({...calc, material_cost: Number(e.target.value)})} /></div><div><label className="label">Machine</label><input type="number" className="modal-input" onChange={(e:any) => setCalc({...calc, machine_cost: Number(e.target.value)})} /></div></div><div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl flex justify-between items-center"><span className="font-black text-blue-900 uppercase text-[10px]">Est. Value:</span><span className="text-3xl font-black text-blue-600">${calcResult?.toFixed(2) || '0.00'}</span></div><div className="flex gap-3 pt-2"><button onClick={async () => setCalcResult(await invoke("calculate_print_cost", { calc }))} className="flex-1 py-4 bg-slate-800 text-white font-black text-xs rounded-xl">Calculate</button><button disabled={!calcResult || customers.length === 0} onClick={async () => { const quote = { quote_no: `QT-${Date.now().toString().slice(-6)}`, customer_id: (customers[0] as any)?.id || 1, date: new Date().toISOString().split('T')[0], total_amount: calcResult!, status: 'Draft' }; await handleAdd("add_quotation_cmd", { quote }); }} className="flex-1 py-4 bg-blue-600 text-white font-black text-xs rounded-xl disabled:opacity-50">Create Quote</button></div></div></Modal>}
      {isModalOpen === 'Job Cards' && <Modal title="Create Job Card" onClose={() => setIsModalOpen(null)}><input placeholder="Job ID" className="modal-input mb-4" value={newJobCard.job_no} onChange={(e:any) => setNewJobCard({...newJobCard, job_no: e.target.value})} /><button onClick={() => handleAdd("add_job_card_cmd", { card: newJobCard })} className="modal-save">Dispatch</button></Modal>}

      {isModalOpen === 'Track' && selectedJob && <Modal title={`Tracking ${selectedJob.job_no}`} onClose={() => setIsModalOpen(null)}>
        <div className="space-y-6">
          <div className="flex gap-2 pb-6 border-b border-slate-100">{['Designing', 'Printing', 'Binding', 'Packing'].map(s => (<button key={s} onClick={async () => { await invoke("add_production_stage_cmd", { stage: { job_card_id: selectedJob.id, stage_name: s, status: 'Ready', start_time: new Date().toLocaleTimeString().slice(0, 5) } }); loadJobStages(selectedJob.id); }} className="px-4 py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 rounded-xl text-[10px] font-black uppercase border border-slate-200 transition-all">{s}</button>))}</div>
          <div className="space-y-4">{jobStages.map((stage:any) => (<div key={stage.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"><div className="flex items-center gap-4"><div className={`w-2 h-2 rounded-full ${stage.status === 'Done' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div><div className="flex flex-col"><span className="font-black text-slate-800 text-xs uppercase">{stage.stage_name}</span><span className="text-[10px] text-slate-400 font-bold">{stage.start_time} - {stage.status}</span></div></div>{stage.status !== 'Done' ? (<button onClick={async () => { await invoke("update_production_stage_status_cmd", { id: stage.id, status: 'Done', endTime: new Date().toISOString(), wastage: 0 }); loadJobStages(selectedJob.id); }} className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-emerald-500 border border-emerald-100"><CheckCircle size={16}/></button>) : <span className="text-emerald-500"><CheckCircle2 size={18}/></span>}</div>))}</div>
        </div>
      </Modal>}
    </div>
  );
}

export default App;
