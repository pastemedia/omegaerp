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

const SCHEMA: &str = "
    CREATE TABLE company (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        gstin TEXT,
        address TEXT
    );

    CREATE TABLE customer (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        organization TEXT,
        phone TEXT,
        whatsapp TEXT,
        email TEXT,
        address TEXT,
        gstin TEXT,
        type TEXT
    );

    CREATE TABLE quotation (
        id INTEGER PRIMARY KEY,
        quote_no TEXT UNIQUE NOT NULL,
        customer_id INTEGER,
        date TEXT,
        total_amount REAL,
        status TEXT,
        FOREIGN KEY(customer_id) REFERENCES customer(id)
    );

    CREATE TABLE quotation_item (
        id INTEGER PRIMARY KEY,
        quotation_id INTEGER,
        description TEXT,
        quantity REAL,
        rate REAL,
        total REAL,
        FOREIGN KEY(quotation_id) REFERENCES quotation(id)
    );
";

#[derive(Default)]
struct AppSession {
    db_conn: Mutex<Option<Connection>>,
    current_oerp_path: Mutex<Option<PathBuf>>,
    workspace_path: Mutex<Option<PathBuf>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Customer {
    id: Option<i32>,
    name: String,
    organization: Option<String>,
    phone: Option<String>,
    whatsapp: Option<String>,
    email: Option<String>,
    address: Option<String>,
    gstin: Option<String>,
    customer_type: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Quotation {
    id: Option<i32>,
    quote_no: String,
    customer_id: i32,
    date: String,
    total_amount: f64,
    status: String,
    items: Vec<QuotationItem>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QuotationItem {
    id: Option<i32>,
    description: String,
    quantity: f64,
    rate: f64,
    total: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PrintCalculation {
    material_cost: f64,
    machine_cost: f64,
    labor_cost: f64,
    markup: f64,
}

#[tauri::command]
fn calculate_print_cost(calc: PrintCalculation) -> Result<f64, String> {
    let base_cost = calc.material_cost + calc.machine_cost + calc.labor_cost;
    let total = base_cost * (1.0 + calc.markup / 100.0);
    Ok((total * 100.0).round() / 100.0)
}

#[tauri::command]
fn add_quotation_cmd(quote: Quotation, session: State<AppSession>) -> Result<(), String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let mut conn = conn_guard.as_ref().ok_or("Not connected")?;

    // Using a simple non-transactional approach for demo,
    // but in real app we'd use conn.transaction()

    // Inserting quote
    let res = conn.execute(
        "INSERT INTO quotation (quote_no, customer_id, date, total_amount, status) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            quote.quote_no,
            quote.customer_id,
            quote.date,
            quote.total_amount,
            quote.status,
        ],
    );

    if let Err(e) = res {
        return Err(e.to_string());
    }

    let quote_id = conn.last_insert_rowid();

    for item in quote.items {
        conn.execute(
            "INSERT INTO quotation_item (quotation_id, description, quantity, rate, total) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                quote_id,
                item.description,
                item.quantity,
                item.rate,
                item.total,
            ],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn get_quotations_cmd(session: State<AppSession>) -> Result<Vec<Quotation>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;

    let mut stmt = conn.prepare("SELECT id, quote_no, customer_id, date, total_amount, status FROM quotation").map_err(|e| e.to_string())?;
    let quote_iter = stmt.query_map([], |row| {
        Ok(Quotation {
            id: row.get(0)?,
            quote_no: row.get(1)?,
            customer_id: row.get(2)?,
            date: row.get(3)?,
            total_amount: row.get(4)?,
            status: row.get(5)?,
            items: Vec::new(), // Simplifying by not loading items here
        })
    }).map_err(|e| e.to_string())?;

    let mut quotes = Vec::new();
    for quote in quote_iter {
        quotes.push(quote.map_err(|e| e.to_string())?);
    }
    Ok(quotes)
}

// ... (previous create, open, save, bundle, customer commands remain the same)

#[tauri::command]
fn create_new_company_cmd(path: String, session: State<AppSession>) -> Result<String, String> {
    let path_buf = PathBuf::from(&path);
    let temp_dir = path_buf.with_extension("temp_oerp_ws");

    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(temp_dir.join("attachments")).map_err(|e| e.to_string())?;

    let db_path = temp_dir.join("data.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute_batch(SCHEMA).map_err(|e| e.to_string())?;

    *session.db_conn.lock().unwrap() = Some(conn);
    *session.current_oerp_path.lock().unwrap() = Some(path_buf.clone());
    *session.workspace_path.lock().unwrap() = Some(temp_dir.clone());

    bundle_oerp(&temp_dir, &path_buf)?;
    Ok(path)
}

#[tauri::command]
fn open_company_cmd(path: String, session: State<AppSession>) -> Result<String, String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err("File does not exist".to_string());
    }

    let temp_dir = path_buf.with_extension("temp_oerp_ws");
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let file = File::open(&path_buf).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match file.enclosed_name() {
            Some(p) => temp_dir.join(p),
            None => continue,
        };

        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(p).map_err(|e| e.to_string())?;
                }
            }
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    let db_path = temp_dir.join("data.db");
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    *session.db_conn.lock().unwrap() = Some(conn);
    *session.current_oerp_path.lock().unwrap() = Some(path_buf);
    *session.workspace_path.lock().unwrap() = Some(temp_dir);

    Ok(path)
}

#[tauri::command]
fn save_company_cmd(session: State<AppSession>) -> Result<(), String> {
    let ws_path = session.workspace_path.lock().unwrap();
    let oerp_path = session.current_oerp_path.lock().unwrap();

    if let (Some(ws), Some(oerp)) = (&*ws_path, &*oerp_path) {
        bundle_oerp(ws, oerp)?;
        Ok(())
    } else {
        Err("No active company file".to_string())
    }
}

#[tauri::command]
fn get_customers_cmd(session: State<AppSession>) -> Result<Vec<Customer>, String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;

    let mut stmt = conn.prepare("SELECT id, name, organization, phone, whatsapp, email, address, gstin, type FROM customer").map_err(|e| e.to_string())?;
    let customer_iter = stmt.query_map([], |row| {
        Ok(Customer {
            id: row.get(0)?,
            name: row.get(1)?,
            organization: row.get(2)?,
            phone: row.get(3)?,
            whatsapp: row.get(4)?,
            email: row.get(5)?,
            address: row.get(6)?,
            gstin: row.get(7)?,
            customer_type: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut customers = Vec::new();
    for customer in customer_iter {
        customers.push(customer.map_err(|e| e.to_string())?);
    }
    Ok(customers)
}

#[tauri::command]
fn add_customer_cmd(customer: Customer, session: State<AppSession>) -> Result<(), String> {
    let conn_guard = session.db_conn.lock().unwrap();
    let conn = conn_guard.as_ref().ok_or("Not connected")?;

    conn.execute(
        "INSERT INTO customer (name, organization, phone, whatsapp, email, address, gstin, type) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            customer.name,
            customer.organization,
            customer.phone,
            customer.whatsapp,
            customer.email,
            customer.address,
            customer.gstin,
            customer.customer_type,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

fn bundle_oerp(src_dir: &Path, dest_file: &Path) -> Result<(), String> {
    let file = File::create(dest_file).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options: FileOptions<()> = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    let walkdir = WalkDir::new(src_dir);
    for entry in walkdir.into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = path.strip_prefix(Path::new(src_dir)).unwrap();

        if path.is_file() {
            zip.start_file(name.to_str().unwrap(), options).map_err(|e| e.to_string())?;
            let mut f = File::open(path).map_err(|e| e.to_string())?;
            let mut buffer = Vec::new();
            f.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
            zip.write_all(&buffer).map_err(|e| e.to_string())?;
        } else if !name.as_os_str().is_empty() {
            zip.add_directory(name.to_str().unwrap(), options).map_err(|e| e.to_string())?;
        }
    }
    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(AppSession::default())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            create_new_company_cmd,
            open_company_cmd,
            save_company_cmd,
            get_customers_cmd,
            add_customer_cmd,
            calculate_print_cost,
            add_quotation_cmd,
            get_quotations_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
