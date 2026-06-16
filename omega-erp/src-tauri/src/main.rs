// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use zip::write::FileOptions;
use walkdir::WalkDir;
use rusqlite::{params, Connection};
use tauri::State;
use chrono::Local;

const CURRENT_VERSION: &str = "1.0.0";

const SCHEMA: &str = "
    CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS company (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        gstin TEXT,
        address TEXT
    );

    CREATE TABLE IF NOT EXISTS customer (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL, organization TEXT, phone TEXT, email TEXT, address TEXT, type TEXT
    );

    CREATE TABLE IF NOT EXISTS supplier (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL, phone TEXT, address TEXT, gstin TEXT, category TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory_item (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL, category TEXT, unit TEXT, min_stock REAL, current_stock REAL
    );

    CREATE TABLE IF NOT EXISTS quotation (
        id INTEGER PRIMARY KEY,
        quote_no TEXT UNIQUE NOT NULL, customer_id INTEGER, date TEXT, total_amount REAL, status TEXT,
        FOREIGN KEY(customer_id) REFERENCES customer(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY,
        order_no TEXT UNIQUE NOT NULL, customer_id INTEGER, order_date TEXT, delivery_date TEXT, status TEXT, total_amount REAL, advance_paid REAL,
        FOREIGN KEY(customer_id) REFERENCES customer(id)
    );

    CREATE TABLE IF NOT EXISTS job_card (
        id INTEGER PRIMARY KEY,
        order_id INTEGER, job_no TEXT UNIQUE NOT NULL, machine TEXT, assigned_to TEXT, status TEXT, priority TEXT, instructions TEXT,
        FOREIGN KEY(order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS production_stage (
        id INTEGER PRIMARY KEY,
        job_card_id INTEGER, stage_name TEXT, status TEXT, start_time TEXT, end_time TEXT, wastage REAL, remarks TEXT,
        FOREIGN KEY(job_card_id) REFERENCES job_card(id)
    );

    CREATE TABLE IF NOT EXISTS invoice (
        id INTEGER PRIMARY KEY,
        invoice_no TEXT UNIQUE NOT NULL, order_id INTEGER, date TEXT, total_amount REAL, tax_amount REAL, status TEXT,
        FOREIGN KEY(order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_order (
        id INTEGER PRIMARY KEY,
        po_no TEXT UNIQUE NOT NULL, supplier_id INTEGER, date TEXT, total_amount REAL, status TEXT,
        FOREIGN KEY(supplier_id) REFERENCES supplier(id)
    );

    CREATE TABLE IF NOT EXISTS employee (
        id INTEGER PRIMARY KEY,
        full_name TEXT NOT NULL, role TEXT, department TEXT, salary REAL, joining_date TEXT
    );

    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY,
        employee_id INTEGER, date TEXT, status TEXT, clock_in TEXT, clock_out TEXT,
        FOREIGN KEY(employee_id) REFERENCES employee(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY,
        action TEXT, entity TEXT, entity_id INTEGER, timestamp TEXT, details TEXT
    );
";

#[derive(Default)]
struct AppSession {
    db_conn: Mutex<Option<Connection>>,
    current_oerp_path: Mutex<Option<PathBuf>>,
    workspace_path: Mutex<Option<PathBuf>>,
}

// --- Data Models ---
#[derive(Serialize, Deserialize, Debug)]
pub struct Customer { id: Option<i32>, name: String, organization: Option<String>, phone: Option<String>, email: Option<String>, address: Option<String>, customer_type: Option<String> }
#[derive(Serialize, Deserialize, Debug)]
pub struct Supplier { id: Option<i32>, name: String, phone: Option<String>, address: Option<String>, category: Option<String> }
#[derive(Serialize, Deserialize, Debug)]
pub struct Order { id: Option<i32>, order_no: String, customer_id: i32, order_date: String, delivery_date: String, status: String, total_amount: f64, advance_paid: f64 }
#[derive(Serialize, Deserialize, Debug)]
pub struct Invoice { id: Option<i32>, invoice_no: String, order_id: Option<i32>, date: String, total_amount: f64, tax_amount: f64, status: String }
#[derive(Serialize, Deserialize, Debug)]
pub struct PurchaseOrder { id: Option<i32>, po_no: String, supplier_id: i32, date: String, total_amount: f64, status: String }
#[derive(Serialize, Deserialize, Debug)]
pub struct InventoryItem { id: Option<i32>, name: String, category: Option<String>, unit: Option<String>, min_stock: Option<f64>, current_stock: Option<f64> }
#[derive(Serialize, Deserialize, Debug)]
pub struct JobCard { id: Option<i32>, order_id: Option<i32>, job_no: String, machine: Option<String>, assigned_to: Option<String>, status: String, priority: String, instructions: Option<String> }
#[derive(Serialize, Deserialize, Debug)]
pub struct ProductionStage { id: Option<i32>, job_card_id: i32, stage_name: String, status: String, start_time: Option<String>, end_time: Option<String>, wastage: Option<f64>, remarks: Option<String> }
#[derive(Serialize, Deserialize, Debug)]
pub struct Employee { id: Option<i32>, full_name: String, role: Option<String>, department: Option<String>, salary: Option<f64>, joining_date: Option<String> }
#[derive(Serialize, Deserialize, Debug)]
pub struct Attendance { id: Option<i32>, employee_id: i32, date: String, status: String, clock_in: Option<String>, clock_out: Option<String> }
#[derive(Serialize, Deserialize, Debug)]
pub struct Quotation { id: Option<i32>, quote_no: String, customer_id: i32, date: String, total_amount: f64, status: String }
#[derive(Serialize, Deserialize, Debug)]
pub struct AuditEntry { id: Option<i32>, action: String, entity: String, entity_id: Option<i32>, timestamp: String, details: Option<String> }
#[derive(Serialize, Deserialize, Debug)]
pub struct PrintCalculation { material_cost: f64, machine_cost: f64, labor_cost: f64, markup: f64 }

// --- Helpers ---
fn log_action(conn: &Connection, action: &str, entity: &str, entity_id: Option<i32>, details: &str) -> rusqlite::Result<()> {
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute("INSERT INTO audit_log (action, entity, entity_id, timestamp, details) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![action, entity, entity_id, now, details])?;
    Ok(())
}

fn migrate_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(SCHEMA).map_err(|e| e.to_string())?;
    conn.execute("INSERT OR IGNORE INTO meta (key, value) VALUES ('version', ?1)", params![CURRENT_VERSION]).map_err(|e| e.to_string())?;
    Ok(())
}

fn bundle_oerp(src_dir: &Path, dest_file: &Path) -> Result<(), String> {
    let file = File::create(dest_file).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options: FileOptions<()> = FileOptions::default().compression_method(zip::CompressionMethod::Deflated).unix_permissions(0o755);
    let walkdir = WalkDir::new(src_dir);
    for entry in walkdir.into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = path.strip_prefix(Path::new(src_dir)).unwrap();
        if path.is_file() {
            zip.start_file(name.to_str().unwrap(), options).map_err(|e| e.to_string())?;
            let mut f = File::open(path).map_err(|e| e.to_string())?;
            let mut buffer = Vec::new(); f.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
            zip.write_all(&buffer).map_err(|e| e.to_string())?;
        } else if !name.as_os_str().is_empty() { zip.add_directory(name.to_str().unwrap(), options).map_err(|e| e.to_string())?; }
    }
    zip.finish().map_err(|e| e.to_string())?; Ok(())
}

// --- Lifecycle Commands ---
#[tauri::command]
fn create_new_company_cmd(path: String, session: State<AppSession>) -> Result<String, String> {
    let path_buf = PathBuf::from(&path);
    let lock_path = path_buf.with_extension("oerp.lock");
    if lock_path.exists() { return Err("File is locked by another instance".to_string()); }

    let temp_dir = path_buf.with_extension("temp_oerp_ws");
    if temp_dir.exists() { fs::remove_dir_all(&temp_dir).map_err(|e| e.to_string())?; }
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(temp_dir.join("attachments")).map_err(|e| e.to_string())?;

    let db_path = temp_dir.join("data.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    migrate_schema(&conn)?;
    log_action(&conn, "CREATE", "Company", None, "New company file initialized").map_err(|e| e.to_string())?;

    File::create(&lock_path).map_err(|e| e.to_string())?;

    *session.db_conn.lock().unwrap() = Some(conn);
    *session.current_oerp_path.lock().unwrap() = Some(path_buf.clone());
    *session.workspace_path.lock().unwrap() = Some(temp_dir.clone());
    bundle_oerp(&temp_dir, &path_buf)?;
    Ok(path)
}

#[tauri::command]
fn open_company_cmd(path: String, session: State<AppSession>) -> Result<String, String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() { return Err("File does not exist".to_string()); }

    let lock_path = path_buf.with_extension("oerp.lock");
    if lock_path.exists() { return Err("File is already open in another window".to_string()); }

    { let mut conn = session.db_conn.lock().unwrap(); *conn = None; }

    let temp_dir = path_buf.with_extension("temp_oerp_ws");
    if temp_dir.exists() { fs::remove_dir_all(&temp_dir).map_err(|e| e.to_string())?; }
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let file = File::open(&path_buf).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match file.enclosed_name() { Some(p) => temp_dir.join(p), None => continue };
        if file.name().ends_with('/') { fs::create_dir_all(&outpath).map_err(|e| e.to_string())?; }
        else {
            if let Some(p) = outpath.parent() { if !p.exists() { fs::create_dir_all(p).map_err(|e| e.to_string())?; } }
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    File::create(&lock_path).map_err(|e| e.to_string())?;

    let db_path = temp_dir.join("data.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    migrate_schema(&conn)?;
    log_action(&conn, "OPEN", "File", None, &format!("File {} opened", path)).map_err(|e| e.to_string())?;

    *session.db_conn.lock().unwrap() = Some(conn);
    *session.current_oerp_path.lock().unwrap() = Some(path_buf);
    *session.workspace_path.lock().unwrap() = Some(temp_dir);
    Ok(path)
}

#[tauri::command]
fn save_company_cmd(session: State<AppSession>) -> Result<(), String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let oerp_guard = session.current_oerp_path.lock().unwrap();
    let ws_guard = session.workspace_path.lock().unwrap();
    if let (Some(_), Some(ws), Some(oerp)) = (conn_guard.as_ref(), ws_guard.as_ref(), oerp_guard.as_ref()) {
        bundle_oerp(ws, oerp)?;
        Ok(())
    } else { Err("No active company file".to_string()) }
}

#[tauri::command]
fn close_company_cmd(session: State<AppSession>) -> Result<(), String> {
    let mut conn_guard = session.db_conn.lock().unwrap();
    let mut oerp_guard = session.current_oerp_path.lock().unwrap();
    let mut ws_guard = session.workspace_path.lock().unwrap();
    if let Some(ws) = ws_guard.clone() {
        if let Some(oerp) = oerp_guard.clone() {
             *conn_guard = None;
             let _ = bundle_oerp(&ws, &oerp);
             let _ = fs::remove_dir_all(&ws);
             let lock_path = oerp.with_extension("oerp.lock");
             let _ = fs::remove_file(lock_path);
        }
    }
    *oerp_guard = None; *ws_guard = None;
    Ok(())
}

// --- CRUD Operations ---
#[tauri::command]
fn get_customers_cmd(session: State<AppSession>) -> Result<Vec<Customer>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;
    let mut stmt = conn.prepare("SELECT id, name, organization, phone, email, address, type FROM customer").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], |row| Ok(Customer { id: row.get(0)?, name: row.get(1)?, organization: row.get(2)?, phone: row.get(3)?, email: row.get(4)?, address: row.get(5)?, customer_type: row.get(6)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for i in iter { list.push(i.map_err(|e| e.to_string())?); } Ok(list)
}
#[tauri::command]
fn add_customer_cmd(customer: Customer, session: State<AppSession>) -> Result<(), String> {
    let mut conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("Not connected")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO customer (name, organization, phone, email, address, type) VALUES (?1, ?2, ?3, ?4, ?5, ?6)", params![customer.name, customer.organization, customer.phone, customer.email, customer.address, customer.customer_type]).map_err(|e| e.to_string())?;
    log_action(&tx, "ADD", "Customer", None, &customer.name).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?; Ok(())
}
#[tauri::command]
fn get_suppliers_cmd(session: State<AppSession>) -> Result<Vec<Supplier>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;
    let mut stmt = conn.prepare("SELECT id, name, phone, address, category FROM supplier").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], |row| Ok(Supplier { id: row.get(0)?, name: row.get(1)?, phone: row.get(2)?, address: row.get(3)?, category: row.get(4)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for i in iter { list.push(i.map_err(|e| e.to_string())?); } Ok(list)
}
#[tauri::command]
fn add_supplier_cmd(item: Supplier, session: State<AppSession>) -> Result<(), String> {
    let mut conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("Not connected")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO supplier (name, phone, address, category) VALUES (?1, ?2, ?3, ?4)", params![item.name, item.phone, item.address, item.category]).map_err(|e| e.to_string())?;
    log_action(&tx, "ADD", "Supplier", None, &item.name).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?; Ok(())
}
#[tauri::command]
fn get_inventory_cmd(session: State<AppSession>) -> Result<Vec<InventoryItem>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;
    let mut stmt = conn.prepare("SELECT id, name, category, unit, min_stock, current_stock FROM inventory_item").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], |row| Ok(InventoryItem { id: row.get(0)?, name: row.get(1)?, category: row.get(2)?, unit: row.get(3)?, min_stock: row.get(4)?, current_stock: row.get(5)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for i in iter { list.push(i.map_err(|e| e.to_string())?); } Ok(list)
}
#[tauri::command]
fn add_inventory_item_cmd(item: InventoryItem, session: State<AppSession>) -> Result<(), String> {
    let mut conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("Not connected")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO inventory_item (name, category, unit, min_stock, current_stock) VALUES (?1, ?2, ?3, ?4, ?5)", params![item.name, item.category, item.unit, item.min_stock, item.current_stock]).map_err(|e| e.to_string())?;
    log_action(&tx, "ADD", "Inventory", None, &item.name).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?; Ok(())
}
#[tauri::command]
fn get_orders_cmd(session: State<AppSession>) -> Result<Vec<Order>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;
    let mut stmt = conn.prepare("SELECT id, order_no, customer_id, order_date, delivery_date, status, total_amount, advance_paid FROM orders").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], |row| Ok(Order { id: row.get(0)?, order_no: row.get(1)?, customer_id: row.get(2)?, order_date: row.get(3)?, delivery_date: row.get(4)?, status: row.get(5)?, total_amount: row.get(6)?, advance_paid: row.get(7)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for i in iter { list.push(i.map_err(|e| e.to_string())?); } Ok(list)
}
#[tauri::command]
fn add_order_cmd(item: Order, session: State<AppSession>) -> Result<(), String> {
    let mut conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("Not connected")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO orders (order_no, customer_id, order_date, delivery_date, status, total_amount, advance_paid) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)", params![item.order_no, item.customer_id, item.order_date, item.delivery_date, item.status, item.total_amount, item.advance_paid]).map_err(|e| e.to_string())?;
    log_action(&tx, "ADD", "Order", None, &item.order_no).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?; Ok(())
}
#[tauri::command]
fn get_job_cards_cmd(session: State<AppSession>) -> Result<Vec<JobCard>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;
    let mut stmt = conn.prepare("SELECT id, order_id, job_no, machine, assigned_to, status, priority, instructions FROM job_card").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], |row| Ok(JobCard { id: row.get(0)?, order_id: row.get(1)?, job_no: row.get(2)?, machine: row.get(3)?, assigned_to: row.get(4)?, status: row.get(5)?, priority: row.get(6)?, instructions: row.get(7)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for i in iter { list.push(i.map_err(|e| e.to_string())?); } Ok(list)
}
#[tauri::command]
fn add_job_card_cmd(card: JobCard, session: State<AppSession>) -> Result<(), String> {
    let mut conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("Not connected")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO job_card (order_id, job_no, machine, assigned_to, status, priority, instructions) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)", params![card.order_id, card.job_no, card.machine, card.assigned_to, card.status, card.priority, card.instructions]).map_err(|e| e.to_string())?;
    log_action(&tx, "ADD", "JobCard", None, &card.job_no).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?; Ok(())
}
#[tauri::command]
fn get_production_stages_cmd(job_card_id: i32, session: State<AppSession>) -> Result<Vec<ProductionStage>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;
    let mut stmt = conn.prepare("SELECT id, job_card_id, stage_name, status, start_time, end_time, wastage, remarks FROM production_stage WHERE job_card_id = ?1").map_err(|e| e.to_string())?;
    let iter = stmt.query_map(params![job_card_id], |row| Ok(ProductionStage { id: row.get(0)?, job_card_id: row.get(1)?, stage_name: row.get(2)?, status: row.get(3)?, start_time: row.get(4)?, end_time: row.get(5)?, wastage: row.get(6)?, remarks: row.get(7)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for i in iter { list.push(i.map_err(|e| e.to_string())?); } Ok(list)
}
#[tauri::command]
fn add_production_stage_cmd(stage: ProductionStage, session: State<AppSession>) -> Result<(), String> {
    let mut conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("Not connected")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO production_stage (job_card_id, stage_name, status, start_time, remarks) VALUES (?1, ?2, ?3, ?4, ?5)", params![stage.job_card_id, stage.stage_name, stage.status, stage.start_time, stage.remarks]).map_err(|e| e.to_string())?;
    log_action(&tx, "ADD", "ProductionStage", None, &stage.stage_name).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?; Ok(())
}
#[tauri::command]
fn update_production_stage_status_cmd(id: i32, status: String, end_time: Option<String>, wastage: Option<f64>, session: State<AppSession>) -> Result<(), String> {
    let mut conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("Not connected")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("UPDATE production_stage SET status = ?1, end_time = ?2, wastage = ?3 WHERE id = ?4", params![status, end_time, wastage, id]).map_err(|e| e.to_string())?;
    log_action(&tx, "UPDATE", "ProductionStage", Some(id), &status).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?; Ok(())
}
#[tauri::command]
fn get_employees_cmd(session: State<AppSession>) -> Result<Vec<Employee>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;
    let mut stmt = conn.prepare("SELECT id, full_name, role, department, salary, joining_date FROM employee").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], |row| Ok(Employee { id: row.get(0)?, full_name: row.get(1)?, role: row.get(2)?, department: row.get(3)?, salary: row.get(4)?, joining_date: row.get(5)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for i in iter { list.push(i.map_err(|e| e.to_string())?); } Ok(list)
}
#[tauri::command]
fn add_employee_cmd(item: Employee, session: State<AppSession>) -> Result<(), String> {
    let mut conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("Not connected")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO employee (full_name, role, department, salary, joining_date) VALUES (?1, ?2, ?3, ?4, ?5)", params![item.full_name, item.role, item.department, item.salary, item.joining_date]).map_err(|e| e.to_string())?;
    log_action(&tx, "ADD", "Employee", None, &item.full_name).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?; Ok(())
}
#[tauri::command]
fn mark_attendance_cmd(att: Attendance, session: State<AppSession>) -> Result<(), String> {
    let mut conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("Not connected")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO attendance (employee_id, date, status, clock_in) VALUES (?1, ?2, ?3, ?4)", params![att.employee_id, att.date, att.status, att.clock_in]).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?; Ok(())
}
#[tauri::command]
fn get_attendance_cmd(date: String, session: State<AppSession>) -> Result<Vec<Attendance>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;
    let mut stmt = conn.prepare("SELECT id, employee_id, date, status, clock_in, clock_out FROM attendance WHERE date = ?1").map_err(|e| e.to_string())?;
    let iter = stmt.query_map(params![date], |row| Ok(Attendance { id: row.get(0)?, employee_id: row.get(1)?, date: row.get(2)?, status: row.get(3)?, clock_in: row.get(4)?, clock_out: row.get(5)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for i in iter { list.push(i.map_err(|e| e.to_string())?); } Ok(list)
}
#[tauri::command]
fn get_invoices_cmd(session: State<AppSession>) -> Result<Vec<Invoice>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;
    let mut stmt = conn.prepare("SELECT id, invoice_no, order_id, date, total_amount, tax_amount, status FROM invoice").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], |row| Ok(Invoice { id: row.get(0)?, invoice_no: row.get(1)?, order_id: row.get(2)?, date: row.get(3)?, total_amount: row.get(4)?, tax_amount: row.get(5)?, status: row.get(6)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for i in iter { list.push(i.map_err(|e| e.to_string())?); } Ok(list)
}
#[tauri::command]
fn add_invoice_cmd(item: Invoice, session: State<AppSession>) -> Result<(), String> {
    let mut conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("Not connected")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO invoice (invoice_no, order_id, date, total_amount, tax_amount, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6)", params![item.invoice_no, item.order_id, item.date, item.total_amount, item.tax_amount, item.status]).map_err(|e| e.to_string())?;
    log_action(&tx, "ADD", "Invoice", None, &item.invoice_no).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?; Ok(())
}
#[tauri::command]
fn get_quotations_cmd(session: State<AppSession>) -> Result<Vec<Quotation>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;
    let mut stmt = conn.prepare("SELECT id, quote_no, customer_id, date, total_amount, status FROM quotation").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], |row| Ok(Quotation { id: row.get(0)?, quote_no: row.get(1)?, customer_id: row.get(2)?, date: row.get(3)?, total_amount: row.get(4)?, status: row.get(5)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for i in iter { list.push(i.map_err(|e| e.to_string())?); } Ok(list)
}
#[tauri::command]
fn add_quotation_cmd(quote: Quotation, session: State<AppSession>) -> Result<(), String> {
    let mut conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("Not connected")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO quotation (quote_no, customer_id, date, total_amount, status) VALUES (?1, ?2, ?3, ?4, ?5)", params![quote.quote_no, quote.customer_id, quote.date, quote.total_amount, quote.status]).map_err(|e| e.to_string())?;
    log_action(&tx, "ADD", "Quotation", None, &quote.quote_no).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?; Ok(())
}
#[tauri::command]
fn get_audit_logs_cmd(session: State<AppSession>) -> Result<Vec<AuditEntry>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;
    let mut stmt = conn.prepare("SELECT id, action, entity, entity_id, timestamp, details FROM audit_log ORDER BY id DESC LIMIT 50").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], |row| Ok(AuditEntry { id: row.get(0)?, action: row.get(1)?, entity: row.get(2)?, entity_id: row.get(3)?, timestamp: row.get(4)?, details: row.get(5)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for i in iter { list.push(i.map_err(|e| e.to_string())?); } Ok(list)
}
#[tauri::command]
fn get_purchase_orders_cmd(session: State<AppSession>) -> Result<Vec<PurchaseOrder>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;
    let mut stmt = conn.prepare("SELECT id, po_no, supplier_id, date, total_amount, status FROM purchase_order").map_err(|e| e.to_string())?;
    let iter = stmt.query_map([], |row| Ok(PurchaseOrder { id: row.get(0)?, po_no: row.get(1)?, supplier_id: row.get(2)?, date: row.get(3)?, total_amount: row.get(4)?, status: row.get(5)? })).map_err(|e| e.to_string())?;
    let mut list = Vec::new(); for i in iter { list.push(i.map_err(|e| e.to_string())?); } Ok(list)
}
#[tauri::command]
fn add_purchase_order_cmd(item: PurchaseOrder, session: State<AppSession>) -> Result<(), String> {
    let mut conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("Not connected")?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("INSERT INTO purchase_order (po_no, supplier_id, date, total_amount, status) VALUES (?1, ?2, ?3, ?4, ?5)", params![item.po_no, item.supplier_id, item.date, item.total_amount, item.status]).map_err(|e| e.to_string())?;
    log_action(&tx, "ADD", "PurchaseOrder", None, &item.po_no).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?; Ok(())
}
#[tauri::command]
fn calculate_print_cost(calc: PrintCalculation) -> Result<f64, String> {
    let total = (calc.material_cost + calc.machine_cost + calc.labor_cost) * (1.0 + calc.markup / 100.0);
    Ok((total * 100.0).round() / 100.0)
}

fn main() {
    tauri::Builder::default()
        .manage(AppSession::default())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            create_new_company_cmd, open_company_cmd, save_company_cmd, close_company_cmd,
            get_customers_cmd, add_customer_cmd,
            get_suppliers_cmd, add_supplier_cmd,
            get_inventory_cmd, add_inventory_item_cmd,
            get_orders_cmd, add_order_cmd,
            get_job_cards_cmd, add_job_card_cmd,
            get_production_stages_cmd, add_production_stage_cmd, update_production_stage_status_cmd,
            get_invoices_cmd, add_invoice_cmd,
            get_employees_cmd, add_employee_cmd, mark_attendance_cmd, get_attendance_cmd,
            get_quotations_cmd, add_quotation_cmd,
            get_audit_logs_cmd,
            get_purchase_orders_cmd, add_purchase_order_cmd,
            calculate_print_cost
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
