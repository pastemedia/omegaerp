# ERP Software Planner: Printing, Signage & Packaging (Omega ERP)

This document outlines the complete plan for a local-first ERP system designed for Omega Offset Printers and similar companies in the printing, signage, and packaging industry.

## 1. Technology Recommendation

### Recommended Stack: **Tauri + React + TypeScript**

**Why this stack?**
*   **Local-First Performance:** Tauri allows the app to run as a native desktop application with a very small footprint. It leverages the system's native webview, making it faster and lighter than Electron.
*   **Security:** Tauri is built with Rust, providing high memory safety and a secure bridge between the frontend and the local file system.
*   **Cross-Platform:** Single codebase for Windows, macOS, and Linux.
*   **Developer Ecosystem:** React and TypeScript offer a massive ecosystem of UI libraries (like Shadcn UI, Ant Design) and type safety, which is critical for complex ERP logic.
*   **SQLite Integration:** Rust can interface directly with SQLite, providing high-performance, ACID-compliant data storage that behaves exactly like a local file.

---

## 2. File-Based Storage Architecture

### The `.oerp` File Format
The system will use a custom file extension `.oerp` (Omega ERP).

**Internal Structure:**
The `.oerp` file will be a **SQLite database file**.
*   **Pros:** Industry standard, extremely reliable, single file, support for transactions, and handles large datasets (gigabytes) with ease.
*   **Handling Attachments:** Small attachments (signatures, small logos) will be stored as BLOBs inside the SQLite database. Large attachments (artwork, high-res scans) will be stored in a companion folder named `[filename]_assets/` or bundled into a ZIP-based package if "single file portability" is prioritized.
*   **Recommendation:** Use a **Zipped Package** approach (similar to `.docx`). The `.oerp` file is actually a ZIP container containing:
    1.  `data.db` (The SQLite database)
    2.  `attachments/` (Folder for images/PDFs)
    3.  `metadata.json` (File version, company name, last saved info)

### File Operations
*   **Open/Create:** Users select a `.oerp` file. The app extracts/mounts the SQLite DB.
*   **Auto-save:** Standard SQLite transactions ensure data is written immediately. The "Save" button will trigger a "Commit & Bundle" if using the ZIP approach, or simply "Checkpoint" if using a raw SQLite file.
*   **File Locking:** A `.lock` file will be created in the same directory to prevent multiple users from opening the same file in write mode simultaneously.

---

## 3. Offline-First & Google Drive Workflow

### Offline Workflow
*   All logic resides in the local app.
*   Database is local.
*   No "Syncing" spinner needed for core work.
*   Calculations (Quotation, GST, Inventory) are performed by the local engine.

### Google Drive Integration (Optional)
Google Drive is treated as a **Transparent Storage Layer**.
1.  **Synced Folder:** Users save their `.oerp` file into their Google Drive local sync folder.
2.  **Conflict Detection:** The app checks the file's "Modified Date" and "ETag" before opening or saving.
3.  **Conflict Handling:** If an external change is detected while the app is open, it prompts the user to "Merge" (if supported) or "Save as Conflict Copy" (e.g., `Company_conflict_2026.oerp`).
4.  **Backups:** The app can be configured to automatically "Export Backup" to a specific Google Drive path.

---

## 4. Suggested Architecture Diagram

*   **UI Layer:** React + Tailwind CSS (Modals, Forms, Tables, Charts)
*   **State Management:** TanStack Query (Server-state-like local management) + Zustand (UI state)
*   **Backend Bridge:** Tauri IPC (Inter-Process Communication)
*   **Core Engine (Rust):**
    *   `File Manager`: Handles ZIP/Unzip of `.oerp` files.
    *   `Database Manager`: Manages SQLite connections and migrations.
    *   `Auth Manager`: Local password hashing and role verification.
    *   `Report Engine`: Generates PDFs and Excel files using headless printing or specialized libraries.
*   **Storage:** Local Disk / Google Drive Synced Folder.

---

## 5. Data Models

The following tables represent the internal SQLite schema.

### Core & Settings
*   **Company**: `id, name, gstin, address, phone, email, website, logo_path, bank_details (json), settings (json)`
*   **Branch**: `id, company_id, name, address, manager_id`
*   **User**: `id, username, password_hash, full_name, role_id, branch_id, status (active/inactive)`
*   **Role**: `id, name, description`
*   **Permission**: `id, role_id, module, action (view, create, edit, delete, approve, etc.)`
*   **AuditLog**: `id, user_id, action, entity_type, entity_id, timestamp, old_values (json), new_values (json)`

### CRM & Supply Chain
*   **Customer**: `id, name, organization, phone, whatsapp, email, address, gstin, type (Govt, Corporate, etc.), credit_limit, payment_terms, discount_policy`
*   **Supplier**: `id, name, phone, address, gstin, category (Paper, Ink, etc.), payment_terms`

### Product & Rates
*   **Product**: `id, name, category_id, unit, size, default_rate, cost_formula (json), production_steps (json)`
*   **Category**: `id, name (Printing, Signage, Packaging, etc.)`
*   **Machine**: `id, name, type, capacity, hourly_cost, department_id`
*   **RateMaster**: `id, item_type, criteria (size, material, quantity), rate, effective_date`

### Sales & Production
*   **Quotation**: `id, quote_no, customer_id, date, validity_date, status, total_amount, prepared_by_id, approved_by_id, terms`
*   **QuotationItem**: `id, quotation_id, product_id, description, quantity, size, material, rate, tax_amount, total`
*   **Order**: `id, order_no, quotation_id, customer_id, order_date, delivery_date, priority, status, advance_paid, balance_due`
*   **OrderItem**: `id, order_id, product_id, quantity, specification (json), status`
*   **JobCard**: `id, order_item_id, job_no, machine_id, assigned_staff_id, status, priority, instructions (text)`
*   **ProductionStage**: `id, job_card_id, stage_name, assigned_to_id, start_time, end_time, quantity_in, quantity_out, wastage, status`
*   **Task**: `id, job_card_id, description, assigned_to_id, due_date, status, priority`

### Inventory & Purchase
*   **InventoryItem**: `id, name, category_id, unit, min_stock_level, current_stock`
*   **InventoryTransaction**: `id, item_id, type (Purchase, Issue, Return, Adjustment), quantity, date, reference_id`
*   **PurchaseOrder**: `id, supplier_id, date, status, total_amount`
*   **PurchaseItem**: `id, purchase_order_id, item_id, quantity, rate, tax, total`

### Finance & HR
*   **Invoice**: `id, invoice_no, order_id, customer_id, date, type (Tax, Proforma, etc.), subtotal, tax_total, discount, total, payment_status`
*   **Payment**: `id, invoice_id, customer_id, date, amount, mode (Cash, UPI, etc.), reference_no`
*   **Expense**: `id, category, amount, date, description, paid_to, branch_id`
*   **Employee**: `id, full_name, role, department, salary, joining_date, docs (json)`
*   **Attendance**: `id, employee_id, date, status (Present, Absent, Leave), in_time, out_time`
*   **Salary**: `id, employee_id, month, year, basic, overtime, incentives, deductions, net_paid, payment_date`

### Documentation
*   **Attachment**: `id, entity_type, entity_id, file_name, file_path, uploaded_at`

---

## 6. Detailed Module List & Features

### 1. Dashboard
*   **KPI Cards:** Total Sales, Pending Orders, Today's Deliveries, Low Stock Items, Cash on Hand.
*   **Visualizations:** Monthly Sales Bar Chart, Machine Load Pie Chart, Production Bottlenecks.
*   **Quick Actions:** New Quote, New Job Card, Inventory Issue.

### 2. CRM (Customer & Supplier Management)
*   **Customer Profiles:** History of orders, credit limits, and document attachments (artwork, contracts).
*   **Supplier Master:** Linked to inventory items; tracks payment ledgers and delivery performance.
*   **Lead Tracking:** Simple CRM for following up on pending quotations.

### 3. Product Master & Rate Calculator
*   **Industry-Specific Calculators:**
    *   *Offset:* Sheet size, plates, CTP, impressions, binding.
    *   *Signage:* Square foot calculation for Flex, ACP, Acrylic.
    *   *Packaging:* Box dimensions, GSM, corrugation layers, folding.
*   **Formula Engine:** Customizable formulas for wastage, labor, and machine running costs.

### 4. Sales Workflow (Quotation & Order)
*   **Quotation Engine:** Multi-item quotes with "Revision" tracking and PDF generation.
*   **Order Conversion:** One-click conversion from Quote to Order; tracks advance payments.
*   **Status Tracking:** Real-time visibility into whether an order is in Design, Production, or Ready.

### 5. Production & Job Card Management
*   **Digital Job Cards:** QR-coded slips that staff can scan to update status.
*   **Machine Scheduling:** Drag-and-drop view to assign jobs to specific machines (Heidelberg, Flex Machine, CNC).
*   **Task Management:** Granular tasks (e.g., "Designing," "Lamination," "Cutting") assigned to specific staff.

### 6. Inventory & Purchase
*   **Stock Control:** Multi-branch/godown support.
*   **Auto-Reorder:** Notifications when paper reams or ink levels fall below minimum.
*   **Purchase Workflow:** PO generation -> GRN (Goods Received Note) -> Bill Entry -> Stock Update.

### 7. Accounts & Billing
*   **GST Compliance:** Automatic HSN/SAC code application; SGST/CGST/IGST calculation.
*   **Invoicing:** Professional Tax Invoices, Delivery Challans, and Proforma Invoices.
*   **Ledgers:** Customer and Supplier aging reports; Cash and Bank registers.

### 8. HR & Payroll
*   **Attendance:** Simple Check-in/Check-out; integration with shift schedules.
*   **Payroll:** Automatic salary calculation based on attendance, overtime (OT), and advances.

### 9. Document Management
*   **Asset Linking:** Attach artwork (CDR, AI, PDF) directly to job cards.
*   **Centralized Assets:** Store all company logos and common templates within the `.oerp` package.

---

## 7. UI/UX Design Plan

### Design Principles
*   **Speed:** Keyboard-first navigation (Ctrl+N, Ctrl+S, Esc).
*   **Density:** Excel-like grids for data entry (Inventory, Invoices).
*   **Clarity:** Use color coding for status (Draft: Grey, In Production: Blue, Ready: Green, Delivered: Purple).

### Key Screens
1.  **Main Shell:** Left sidebar for modules, Top search bar for global search (Customer/Job No).
2.  **Order Desk:** Kanban board showing orders moving through production stages.
3.  **Calculator Tool:** Side-by-side comparison of different paper/size options for a quote.
4.  **Staff Portal:** Simplified "My Tasks" view for machine operators.

---

## 8. Development Roadmap

| Phase | Duration | Focus |
| :--- | :--- | :--- |
| **Phase 1: Core** | 4 Weeks | Local file system (`.oerp`), Auth, Customer/Supplier Master, Basic Quotation. |
| **Phase 2: Sales** | 4 Weeks | Order management, Job Card generation, PDF templates. |
| **Phase 3: Inventory**| 3 Weeks | Stock tracking, Purchase workflow, Material issue. |
| **Phase 4: Finance** | 3 Weeks | GST Invoicing, Payments, Ledgers, Basic Reports. |
| **Phase 5: Workflow**| 4 Weeks | Production tracking, Task management, HR/Attendance. |
| **Phase 6: Polish** | 2 Weeks | Google Drive sync, Backup system, Advanced Audit logs. |

---

## 9. Testing Plan

### Offline & File System Testing
*   **Data Integrity:** Verify that a power cut during a "Save" doesn't corrupt the `.oerp` file (SQLite's WAL mode).
*   **File Migration:** Test opening a v1.0 file in v1.1 and auto-migrating the schema.
*   **Locking:** Ensure two app instances cannot write to the same file simultaneously.

### Industry Logic Testing
*   **Calculation Accuracy:** Unit tests for Offset and Signage rate calculators.
*   **GST Verification:** Compare system-generated invoices with manual calculations for edge cases (Round-offs, Partial advances).

### Integration Testing
*   **Google Drive:** Mock network failures during sync to test conflict handling.
*   **PDF/Excel Export:** Verify formatting across different OS (Windows/Linux/macOS).

---

## 10. Security & Safety

*   **Encryption:** Option to encrypt the `.oerp` file using AES-256 (via SQLite encryption extensions like SQLCipher).
*   **Role-Based Access Control (RBAC):** Permissions are stored in the file; operators can only see their tasks.
*   **Audit Logs:** Every change to a quotation or invoice is logged with a timestamp and User ID.

---

## 11. Backup & Recovery

*   **Shadow Backups:** Every time the file is opened, a temporary backup is created in the `%APPDATA%` folder.
*   **Auto-Archive:** The app creates a `Company_Backup_YYYY-MM-DD.oerp.zip` on every application close.
*   **Cloud Backup:** Optional setting to push backups to a user-defined Google Drive folder.

---

## 12. Future Upgrades & Multi-User LAN

*   **LAN Mode:** For multiple users in one office, one machine can act as the "Host". The app will use a local TCP server to allow other instances to connect to the shared SQLite database.
*   **Mobile Companion:** A future Flutter-based mobile app for staff to update task status via QR code scanning.
*   **Cloud Sync:** Future optional subscription service for real-time cloud synchronization between multiple branches.

---

## 13. Developer Instructions

1.  **Project Init:** Use `npm create tauri-app@latest`.
2.  **Database:** Use `rusqlite` for the Rust backend and `sql.js` (or better, Tauri's SQL plugin) for the frontend bridge.
3.  **UI:** Implement **Shadcn UI** for components to ensure a modern professional look.
4.  **Formatting:** Use `Prettier` and `ESLint` with strict TypeScript rules.
5.  **State:** Use `React Query` for all data fetching to handle the local IPC calls as "network" requests, enabling easy future migration to a real API if needed.
