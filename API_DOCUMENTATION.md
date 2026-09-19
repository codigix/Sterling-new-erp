# Sterling ERP — Complete API Documentation Manual

> **System Version:** 1.0.0  
> **Base URL:** `http://localhost:5001`  
> **Interactive Swagger UI:** `http://localhost:5001/api/docs`  
> **Raw OpenAPI JSON Spec:** `http://localhost:5001/api/docs.json`  

---

## 1. Authentication & Security Architecture

Sterling ERP uses **JSON Web Tokens (JWT)** for stateless, secure API communication.

### Authorization Header
All protected endpoints require the HTTP header:
```http
Authorization: Bearer <your_jwt_token>
```

### Local Development / Demo Access
For rapid development and automated tests in non-production environments, the backend accepts:
```http
Authorization: Bearer demo-token
```
*(Automatically blocked in `production` mode).*

---

## 2. Standard Response & Error Format

### Success Response (200 OK / 201 Created)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

### Error Response (400 / 401 / 403 / 500)
```json
{
  "success": false,
  "message": "Human-readable error description",
  "error": {}
}
```

---

## 3. API Directory by Module

```
├── 1. Authentication (/api/auth)
├── 2. Admin & User Management (/api/admin)
├── 3. Employee Directory (/api/employee)
├── 4. Design & CAD Drawings (/api/design-drawings)
├── 5. Bill of Materials (BOM) (/api/engineering/bom/comprehensive)
├── 6. Material Requests (/api/production/material-requests)
├── 7. Quotations & RFQs (/api/department/procurement/quotations)
├── 8. Purchase Orders (PO) (/api/department/procurement/purchase-orders)
├── 9. Goods Receipt Notes (GRN) (/api/department/inventory/grn)
├── 10. Quality Control (QC) (/api/qc)
├── 11. Inventory & Warehouses (/api/inventory)
├── 12. Production Operations (/api/production)
├── 13. Root Cards / Job Cards (/api/root-cards)
├── 14. Accounting & Invoices (/api/accounting)
├── 15. Departmental Tasks (/api/departmental-tasks)
├── 16. Reports & Timeline (/api/reports)
└── 17. Notifications (/api/notifications)
```

---

## Module 1: Authentication

### 1.1 User Login
* **Method & URL:** `POST /api/auth/login`
* **Access:** Public
* **Request Body:**
```json
{
  "email": "admin@sterling.com",
  "password": "YourPassword123"
}
```
* **Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": 1,
    "fullName": "System Admin",
    "email": "admin@sterling.com",
    "role": "Admin",
    "department": "Management"
  }
}
```

### 1.2 User Registration
* **Method & URL:** `POST /api/auth/register`
* **Access:** Public (or Admin only depending on policy)
* **Request Body:**
```json
{
  "fullName": "Jane Smith",
  "email": "jane@sterling.com",
  "password": "SecurePassword123",
  "role": "Employee",
  "department": "Production"
}
```

### 1.3 Get Current User Profile
* **Method & URL:** `GET /api/auth/me`
* **Access:** Protected (`Bearer <token>`)
* **Response (200 OK):** Returns the logged-in user profile decoded from the JWT token.

### 1.4 Password Management
* `POST /api/auth/forgot-password` — Body: `{ "email": "user@sterling.com" }`
* `POST /api/auth/reset-password` — Body: `{ "token": "...", "newPassword": "..." }`
* `GET /api/auth/verify-reset-token/:token` — Validates expiration.
* `PUT /api/auth/change-password` — Body: `{ "currentPassword": "...", "newPassword": "..." }`

---

## Module 2: Admin & User Management

### 2.1 Dashboard Stats
* **Method & URL:** `GET /api/admin/stats`
* **Access:** Protected (Admin)
* **Description:** Aggregates system metrics (active users, open projects, pending purchase orders, alerts).

### 2.2 Employee Management (Admin)
* `GET /api/admin/employee-list` — Lists all registered users and employees.
* `POST /api/admin/employee-list` — Add employee.
* `PUT /api/admin/employee-list/:id` — Edit employee details.
* `PUT /api/admin/employee-list/:id/status` — Toggle Active/Inactive status.
* `DELETE /api/admin/employee-list/:id` — Remove employee.
* `POST /api/admin/employee-list/:id/send-credentials` — Dispatch welcome email with login credentials.

### 2.3 Roles & Permissions
* `GET /api/admin/roles` — List user roles.
* `POST /api/admin/roles` — Create new role with permission array.
* `GET /api/admin/permissions` — Master list of system permissions.
* `GET /api/admin/departments` — Master department list.
* `GET /api/admin/designations` — Master designation list.

### 2.4 Database Backups
* `POST /api/admin/database/backup` — Trigger immediate MySQL dump.
* `GET /api/admin/database/backups` — View list of generated backup archives.
* `GET /api/admin/database/backups/download/:filename` — Download `.sql` backup.

---

## Module 3: Employee Directory

* `GET /api/employee/list` — Roster of active employees.
* `GET /api/employee/tasks` — Tasks assigned to current employee.
* `GET /api/employee/projects` — Projects assigned to current employee.

---

## Module 4: Design & CAD Drawings

Manages engineering drawings, CAD models (`.dwg`, `.dxf`, `.step`), and technical revisions.

### 4.1 Upload Drawing
* **Method & URL:** `POST /api/design-drawings/upload`
* **Content-Type:** `multipart/form-data`
* **Fields:**
  * `file`: File buffer (`.dwg`, `.step`, `.pdf`, max 500MB)
  * `projectId`: Project ID
  * `title`: Drawing Title
  * `drawingNumber`: Drawing Code

### 4.2 Revisions & Reviews
* `POST /api/design-drawings/:parent_id/revision` — Submit revision file.
* `PUT /api/design-drawings/:id/review` — Body: `{ "status": "APPROVED" | "REJECTED", "comments": "..." }`
* `GET /api/design-drawings/:id/history` — Complete audit trail of revisions.
* `GET /api/design-drawings/root-card/:rootCardId` — Drawings attached to a Root Card.

---

## Module 5: Engineering Bill of Materials (BOM)

* **Base URL:** `/api/engineering/bom/comprehensive`
* `GET /` — List comprehensive BOM records.
* `GET /:bomId` — Full item-by-item calculation (length, width, thickness, density, weights, packet counts).
* `POST /` — Create BOM. Payload includes project reference and materials array.
* `PUT /:bomId` — Update existing BOM.
* `DELETE /:bomId` — Delete BOM.

---

## Module 6: Material Requests (Indents)

* **Base URL:** `/api/production/material-requests`
* `GET /` — List material requests.
* `GET /:id` — Material request breakdown.
* `POST /` — Raise a new indent with items, required dates, and project ID.
* `PATCH /:id/status` — Status update (`PENDING`, `APPROVED`, `REJECTED`, `ISSUED`).

---

## Module 7: Quotations & RFQs

* **Base URL:** `/api/department/procurement/quotations`
* `GET /` — List RFQs and vendor quotes.
* `POST /` — Create and issue RFQ to vendors.
* `POST /:id/email` — Email RFQ PDF directly to vendor.
* `GET /api/department/procurement/vendors` — Directory of registered suppliers.

---

## Module 8: Purchase Orders (PO)

* **Base URL:** `/api/department/procurement/purchase-orders`
* `GET /` — List purchase orders.
* `GET /:id` — Detailed PO with item lines, tax breakdowns, terms & conditions.
* `POST /` — Generate new PO.
* `PATCH /:id/status` — Change PO status (`DRAFT`, `ISSUED`, `APPROVED`, `CANCELLED`).
* `POST /:id/email` — Send PO copy directly to vendor with PDF attachment.
* `POST /:id/invoices` — Upload vendor invoice against PO.

---

## Module 9: Goods Receipt Notes (GRN)

* **Base URL:** `/api/department/inventory/grn`
* `GET /` — List inward goods receipts.
* `GET /:id` — Detailed items and serial numbers in the receipt.
* `POST /:id/approve` — Approve inward GRN.
* `POST /:id/add-to-stock` — Post accepted materials to warehouse inventory.

---

## Module 10: Quality Control (QC)

* **Base URL:** `/api/qc`
* `GET /portal/grn-inspections` — Pending incoming material inspections.
* `POST /inspection/submit` — Record physical/dimensional test results:
```json
{
  "grnId": 12,
  "inspectionStatus": "ACCEPTED",
  "acceptedQty": 100,
  "rejectedQty": 0,
  "remarks": "All dimensions within drawing tolerance"
}
```
* `POST /reports/create` — Generate final QC certificate.
* `POST /outsource/challan` — Generate outsource testing delivery challan (e.g. NDT, Heat Treatment).

---

## Module 11: Inventory & Stock Management

* `GET /api/inventory/warehouses` — List all physical warehouses and bays.
* `GET /api/inventory/materials` — Stock balances grouped by material and grade.
* `GET /api/inventory/stock-entries` — Historical inward/outward ledger entries.
* `POST /api/inventory/stock-entries` — Manual stock adjustments and inter-store transfers.

---

## Module 12: Production Operations & Work Orders

* `GET /api/production/plans` — Daily shop-floor planning sheets.
* `POST /api/production/plans` — Create daily schedule for shifts and machines.
* `GET /api/production/mcr/summary` — Material Consumption Report (MCR).
* `POST /api/production/outward-challans` — Dispatch items to sub-contractors for job work.
* `POST /api/production/inward-challans` — Inward items received back from sub-contractors.

---

## Module 13: Root Cards (RC) / Job Travellers

* `GET /api/root-cards` — List production travellers.
* `POST /api/root-cards` — Initialize new Root Card with project code and quantity.
* `GET /api/root-cards/:id` — Complete traveller history, stage operations, dimensions.
* `POST /api/root-cards/:id/send-to-production` — Release traveller to factory floor.
* `POST /api/root-cards/:id/send-to-quality` — Route card to QC for QAP inspection.
* `POST /api/root-cards/:id/upload-qap` — Attach Quality Assurance Plan (QAP).

---

## Module 14: Accounting & Invoicing

* `GET /api/accounting/vendor-invoices` — List vendor purchase invoices.
* `POST /api/accounting/vendor-invoices` — Record new vendor invoice with GST breakdown.
* `GET /api/accounting/vendor-payments` — List payment vouchers.
* `POST /api/accounting/vendor-payments` — Record payment against vendor invoice.
* `GET /api/accounting/customer-invoices` — List customer sales invoices.
* `GET /api/accounting/vendor-invoices/eligible-challans` — Outward challans ready for billing.

---

## Module 15: Departmental Tasks

* `GET /api/departmental-tasks/all` — Department task backlog.
* `POST /api/departmental-tasks/create` — Assign task with priority and deadline.
* `PATCH /api/departmental-tasks/:id/status` — Update task status (`TODO`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`).

---

## Module 16: System Reports & Analytics

* `GET /api/reports/overview` — Executive KPI summary.
* `GET /api/reports/projects` — Milestone progress and PERT analysis.
* `GET /api/reports/operator-logs` — Labor hours and operator machine efficiency.

---

## Module 17: Notifications & Alerts

* `GET /api/notifications` — Current user's notifications.
* `POST /api/notifications` — Dispatch notification.
* `PUT /api/notifications/mark-all-read` — Mark all alerts as read.
* `PUT /api/notifications/:id/read` — Mark individual alert as read.

---

## 4. How to View and Test Live

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```
2. **Open the interactive portal in your browser:**
   ```
   http://localhost:5001/api/docs
   ```
3. **Import into Postman:**
   - In Postman, click **Import**.
   - Enter the URL: `http://localhost:5001/api/docs.json`.
   - Postman will instantly create a complete collection of all endpoints!
