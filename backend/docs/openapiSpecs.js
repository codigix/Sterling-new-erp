/**
 * @file openapiSpecs.js
 * Comprehensive OpenAPI / Swagger specifications for Sterling ERP.
 */

/**
 * ============================================================================
 * MODULE 1: AUTHENTICATION & SESSIONS
 * ============================================================================
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - 1. Authentication
 *     summary: Register a new user
 *     description: Creates a new user in the system with role and department assignments.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *               - role
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@sterling.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Pass@1234
 *               role:
 *                 type: string
 *                 example: Employee
 *               department:
 *                 type: string
 *                 example: Production
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 *
 * /api/auth/login:
 *   post:
 *     tags:
 *       - 1. Authentication
 *     summary: User Login
 *     description: Authenticates user credentials and returns a signed JWT access token.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@sterling.com
 *               password:
 *                 type: string
 *                 example: Kale@1234
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid email or password
 *
 * /api/auth/me:
 *   get:
 *     tags:
 *       - 1. Authentication
 *     summary: Get Current User Profile
 *     description: Returns details of the currently authenticated user from the JWT token.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       401:
 *         description: Unauthorized / Missing token
 *
 * /api/auth/forgot-password:
 *   post:
 *     tags:
 *       - 1. Authentication
 *     summary: Request Password Reset
 *     description: Submits a password reset request which can be handled via email or admin approval.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: employee@sterling.com
 *     responses:
 *       200:
 *         description: Password reset link or request queued
 *
 * /api/auth/reset-password:
 *   post:
 *     tags:
 *       - 1. Authentication
 *     summary: Complete Password Reset
 *     description: Resets user password using the verification token.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *
 * /api/auth/change-password:
 *   put:
 *     tags:
 *       - 1. Authentication
 *     summary: Change User Password
 *     description: Allows an authenticated user to change their current password.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */

/**
 * ============================================================================
 * MODULE 2: ADMIN & SYSTEM MANAGEMENT
 * ============================================================================
 */

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     tags:
 *       - 2. Admin & User Management
 *     summary: Get Admin Dashboard Statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Total counts for users, projects, orders, and system health
 *
 * /api/admin/dept-progress:
 *   get:
 *     tags:
 *       - 2. Admin & User Management
 *     summary: Get PERT Chart Department Progress
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Progress metrics per department and project
 *
 * /api/admin/employee-list:
 *   get:
 *     tags:
 *       - 2. Admin & User Management
 *     summary: List all system employees
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of employee and user accounts
 *   post:
 *     tags:
 *       - 2. Admin & User Management
 *     summary: Create new employee account
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - role
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *               department:
 *                 type: string
 *               designation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Employee created successfully
 *
 * /api/admin/roles:
 *   get:
 *     tags:
 *       - 2. Admin & User Management
 *     summary: Get all roles and permissions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 *   post:
 *     tags:
 *       - 2. Admin & User Management
 *     summary: Create a new role
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Role created
 *
 * /api/admin/database/backup:
 *   post:
 *     tags:
 *       - 2. Admin & User Management
 *     summary: Trigger manual database backup
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Database dump initiated successfully
 *
 * /api/admin/database/backups:
 *   get:
 *     tags:
 *       - 2. Admin & User Management
 *     summary: List generated backup files
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of SQL backup archives with timestamps and sizes
 */

/**
 * ============================================================================
 * MODULE 3: EMPLOYEE MANAGEMENT
 * ============================================================================
 */

/**
 * @openapi
 * /api/employee/list:
 *   get:
 *     tags:
 *       - 3. Employee Management
 *     summary: Get roster of active employees
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees
 *
 * /api/employee/tasks:
 *   get:
 *     tags:
 *       - 3. Employee Management
 *     summary: Get tasks assigned to logged-in employee
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of tasks
 *
 * /api/employee/projects:
 *   get:
 *     tags:
 *       - 3. Employee Management
 *     summary: Get projects assigned to logged-in employee
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of active projects
 */

/**
 * ============================================================================
 * MODULE 4: DESIGN & CAD DRAWINGS
 * ============================================================================
 */

/**
 * @openapi
 * /api/design-drawings:
 *   get:
 *     tags:
 *       - 4. Design & CAD Drawings
 *     summary: Get all design drawings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of drawings with review statuses
 *
 * /api/design-drawings/upload:
 *   post:
 *     tags:
 *       - 4. Design & CAD Drawings
 *     summary: Upload engineering drawing file
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CAD file (.dwg, .dxf, .step, .pdf)
 *               title:
 *                 type: string
 *               projectId:
 *                 type: integer
 *               drawingNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Drawing uploaded
 *
 * /api/design-drawings/{parent_id}/revision:
 *   post:
 *     tags:
 *       - 4. Design & CAD Drawings
 *     summary: Create new drawing revision
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parent_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               revisionNotes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Revision registered
 *
 * /api/design-drawings/{id}/review:
 *   put:
 *     tags:
 *       - 4. Design & CAD Drawings
 *     summary: Review and approve/reject drawing
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, CHANGES_REQUESTED]
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Drawing review recorded
 */

/**
 * ============================================================================
 * MODULE 5: ENGINEERING BILL OF MATERIALS (BOM)
 * ============================================================================
 */

/**
 * @openapi
 * /api/engineering/bom/comprehensive:
 *   get:
 *     tags:
 *       - 5. Engineering BOM
 *     summary: List comprehensive BOM records
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of BOMs
 *   post:
 *     tags:
 *       - 5. Engineering BOM
 *     summary: Create comprehensive BOM
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - materials
 *             properties:
 *               projectId:
 *                 type: integer
 *               bomNumber:
 *                 type: string
 *               materials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemCode: { type: string }
 *                     materialName: { type: string }
 *                     quantity: { type: number }
 *                     unit: { type: string }
 *                     thickness: { type: number }
 *                     width: { type: number }
 *                     length: { type: number }
 *                     weightPerPiece: { type: number }
 *                     totalWeight: { type: number }
 *     responses:
 *       201:
 *         description: BOM created successfully
 *
 * /api/engineering/bom/comprehensive/{bomId}:
 *   get:
 *     tags:
 *       - 5. Engineering BOM
 *     summary: Get BOM details by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bomId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: BOM details with full item calculations
 */

/**
 * ============================================================================
 * MODULE 6: MATERIAL REQUESTS (MR)
 * ============================================================================
 */

/**
 * @openapi
 * /api/production/material-requests:
 *   get:
 *     tags:
 *       - 6. Material Requests
 *     summary: List material requests (Indents)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of material requests
 *   post:
 *     tags:
 *       - 6. Material Requests
 *     summary: Create material request indent
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               projectId: { type: integer }
 *               priority: { type: string, enum: [LOW, MEDIUM, HIGH, URGENT] }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     materialName: { type: string }
 *                     quantity: { type: number }
 *                     unit: { type: string }
 *     responses:
 *       201:
 *         description: Material request raised
 *
 * /api/production/material-requests/{id}/status:
 *   patch:
 *     tags:
 *       - 6. Material Requests
 *     summary: Update material request approval status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, APPROVED, REJECTED, ISSUED]
 *     responses:
 *       200:
 *         description: Status updated
 */

/**
 * ============================================================================
 * MODULE 7: QUOTATIONS & VENDORS
 * ============================================================================
 */

/**
 * @openapi
 * /api/department/procurement/quotations:
 *   get:
 *     tags:
 *       - 7. Quotations & RFQs
 *     summary: List vendor RFQ quotations
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of RFQs and received vendor quotes
 *   post:
 *     tags:
 *       - 7. Quotations & RFQs
 *     summary: Create RFQ / Quote
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vendorId: { type: integer }
 *               rfqNumber: { type: string }
 *               items: { type: array, items: { type: object } }
 *     responses:
 *       201:
 *         description: RFQ created
 *
 * /api/department/procurement/vendors:
 *   get:
 *     tags:
 *       - 7. Quotations & RFQs
 *     summary: List registered vendors
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor directory
 */

/**
 * ============================================================================
 * MODULE 8: PURCHASE ORDERS (PO)
 * ============================================================================
 */

/**
 * @openapi
 * /api/department/procurement/purchase-orders:
 *   get:
 *     tags:
 *       - 8. Purchase Orders (PO)
 *     summary: List all Purchase Orders
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of POs with statuses and delivery terms
 *   post:
 *     tags:
 *       - 8. Purchase Orders (PO)
 *     summary: Create new Purchase Order
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vendorId
 *               - items
 *             properties:
 *               poNumber: { type: string, example: "PO-2024-001" }
 *               vendorId: { type: integer, example: 4 }
 *               deliveryDate: { type: string, format: date }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     materialName: { type: string }
 *                     quantity: { type: number }
 *                     rate: { type: number }
 *                     gstRate: { type: number }
 *     responses:
 *       201:
 *         description: PO created
 *
 * /api/department/procurement/purchase-orders/{id}/status:
 *   patch:
 *     tags:
 *       - 8. Purchase Orders (PO)
 *     summary: Update PO Status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, ISSUED, APPROVED, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Status updated
 *
 * /api/department/procurement/purchase-orders/{id}/email:
 *   post:
 *     tags:
 *       - 8. Purchase Orders (PO)
 *     summary: Send PO directly to vendor via email
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Email sent successfully
 */

/**
 * ============================================================================
 * MODULE 9: GOODS RECEIPT NOTES (GRN)
 * ============================================================================
 */

/**
 * @openapi
 * /api/department/inventory/grn:
 *   get:
 *     tags:
 *       - 9. Goods Receipt Notes (GRN)
 *     summary: List Goods Receipt Notes
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of GRNs
 *
 * /api/department/inventory/grn/{id}/approve:
 *   post:
 *     tags:
 *       - 9. Goods Receipt Notes (GRN)
 *     summary: Approve GRN
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: GRN approved
 *
 * /api/department/inventory/grn/{id}/add-to-stock:
 *   post:
 *     tags:
 *       - 9. Goods Receipt Notes (GRN)
 *     summary: Move accepted GRN items to active inventory stock
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stock updated with serial numbers
 */

/**
 * ============================================================================
 * MODULE 10: QUALITY CONTROL (QC)
 * ============================================================================
 */

/**
 * @openapi
 * /api/qc/portal/grn-inspections:
 *   get:
 *     tags:
 *       - 10. Quality Control (QC)
 *     summary: Get pending incoming GRN inspections
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of goods awaiting QC verification
 *
 * /api/qc/inspection/submit:
 *   post:
 *     tags:
 *       - 10. Quality Control (QC)
 *     summary: Submit quality inspection report
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grnId
 *               - inspectionStatus
 *             properties:
 *               grnId: { type: integer }
 *               inspectionStatus: { type: string, enum: [ACCEPTED, REJECTED, CONDITIONALLY_ACCEPTED] }
 *               acceptedQty: { type: number }
 *               rejectedQty: { type: number }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Inspection recorded
 *
 * /api/qc/reports:
 *   get:
 *     tags:
 *       - 10. Quality Control (QC)
 *     summary: Get final QC reports
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Final inspection documentation
 */

/**
 * ============================================================================
 * MODULE 11: INVENTORY & STOCK MANAGEMENT
 * ============================================================================
 */

/**
 * @openapi
 * /api/inventory/warehouses:
 *   get:
 *     tags:
 *       - 11. Inventory & Stock
 *     summary: List all warehouses and store locations
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of warehouses
 *
 * /api/inventory/materials:
 *   get:
 *     tags:
 *       - 11. Inventory & Stock
 *     summary: Get active stock balance by material and grade
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Stock levels, reserved quantities, and available balances
 *
 * /api/inventory/stock-entries:
 *   get:
 *     tags:
 *       - 11. Inventory & Stock
 *     summary: List stock ledger entries
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Audit log of inward/outward inventory transactions
 *   post:
 *     tags:
 *       - 11. Inventory & Stock
 *     summary: Create manual stock adjustment entry
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entryType
 *               - items
 *             properties:
 *               entryType: { type: string, enum: [RECEIPT, ISSUE, TRANSFER, ADJUSTMENT] }
 *               items: { type: array, items: { type: object } }
 *     responses:
 *       201:
 *         description: Stock entry created
 */

/**
 * ============================================================================
 * MODULE 12: PRODUCTION OPERATIONS & SCHEDULING
 * ============================================================================
 */

/**
 * @openapi
 * /api/production/plans:
 *   get:
 *     tags:
 *       - 12. Production Operations
 *     summary: Get daily production plans
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of production schedules
 *   post:
 *     tags:
 *       - 12. Production Operations
 *     summary: Create daily production plan
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planDate: { type: string, format: date }
 *               shift: { type: string }
 *               items: { type: array, items: { type: object } }
 *     responses:
 *       201:
 *         description: Plan created
 *
 * /api/production/mcr/summary:
 *   get:
 *     tags:
 *       - 12. Production Operations
 *     summary: Get Material Consumption Report (MCR) summary
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Material consumption vs scrap metrics
 */

/**
 * ============================================================================
 * MODULE 13: ROOT CARDS (RC) / TRAVELLERS
 * ============================================================================
 */

/**
 * @openapi
 * /api/root-cards:
 *   get:
 *     tags:
 *       - 13. Root Cards (RC)
 *     summary: Get all root cards
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of root cards with stages and project associations
 *   post:
 *     tags:
 *       - 13. Root Cards (RC)
 *     summary: Create a new Root Card
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectCode
 *               - componentName
 *             properties:
 *               projectCode: { type: string, example: "PRJ-2024-001" }
 *               componentName: { type: string, example: "Flange Assembly" }
 *               quantity: { type: number, example: 50 }
 *     responses:
 *       201:
 *         description: Root card created
 *
 * /api/root-cards/{id}:
 *   get:
 *     tags:
 *       - 13. Root Cards (RC)
 *     summary: Get root card detail by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detailed root card data with steps and serials
 *
 * /api/root-cards/{id}/send-to-production:
 *   post:
 *     tags:
 *       - 13. Root Cards (RC)
 *     summary: Dispatch Root Card to Production Floor
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Root card dispatched
 */

/**
 * ============================================================================
 * MODULE 14: ACCOUNTING & INVOICING
 * ============================================================================
 */

/**
 * @openapi
 * /api/accounting/vendor-invoices:
 *   get:
 *     tags:
 *       - 14. Accounting & Invoicing
 *     summary: List vendor purchase invoices
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of vendor invoices with paid and balance amounts
 *   post:
 *     tags:
 *       - 14. Accounting & Invoicing
 *     summary: Record new vendor invoice
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vendorId
 *               - invoiceNumber
 *               - amount
 *             properties:
 *               vendorId: { type: integer }
 *               invoiceNumber: { type: string }
 *               amount: { type: number }
 *               taxAmount: { type: number }
 *               invoiceDate: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Vendor invoice created
 *
 * /api/accounting/vendor-payments:
 *   get:
 *     tags:
 *       - 14. Accounting & Invoicing
 *     summary: List vendor payment disbursements
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of recorded payments
 *   post:
 *     tags:
 *       - 14. Accounting & Invoicing
 *     summary: Record a vendor payment
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vendorId
 *               - amountPaid
 *               - paymentMode
 *             properties:
 *               vendorId: { type: integer }
 *               amountPaid: { type: number }
 *               paymentMode: { type: string, enum: [NEFT, RTGS, CHEQUE, UPI, CASH] }
 *               referenceNumber: { type: string }
 *     responses:
 *       201:
 *         description: Payment recorded
 *
 * /api/accounting/customer-invoices:
 *   get:
 *     tags:
 *       - 14. Accounting & Invoicing
 *     summary: List outward customer sales invoices
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Customer invoices
 */

/**
 * ============================================================================
 * MODULE 15: DEPARTMENTAL TASKS
 * ============================================================================
 */

/**
 * @openapi
 * /api/departmental-tasks/all:
 *   get:
 *     tags:
 *       - 15. Departmental Tasks
 *     summary: Get all department tasks
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Comprehensive departmental task backlog
 *
 * /api/departmental-tasks/create:
 *   post:
 *     tags:
 *       - 15. Departmental Tasks
 *     summary: Create new department task
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - departmentId
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               departmentId: { type: integer }
 *               priority: { type: string, enum: [LOW, MEDIUM, HIGH] }
 *               dueDate: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Task created
 *
 * /api/departmental-tasks/{id}/status:
 *   patch:
 *     tags:
 *       - 15. Departmental Tasks
 *     summary: Update task completion status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [TODO, IN_PROGRESS, COMPLETED, BLOCKED]
 *     responses:
 *       200:
 *         description: Task status updated
 */

/**
 * ============================================================================
 * MODULE 16: SYSTEM REPORTS & ANALYTICS
 * ============================================================================
 */

/**
 * @openapi
 * /api/reports/overview:
 *   get:
 *     tags:
 *       - 16. Reports & Timeline
 *     summary: ERP Overview analytics report
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: High-level KPI metrics across production, finance, and quality
 *
 * /api/reports/projects:
 *   get:
 *     tags:
 *       - 16. Reports & Timeline
 *     summary: Project execution and timeline reports
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Project progress metrics
 *
 * /api/reports/operator-logs:
 *   get:
 *     tags:
 *       - 16. Reports & Timeline
 *     summary: Machine operator work logs & manhours
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Operator logs and efficiency calculations
 */

/**
 * ============================================================================
 * MODULE 17: NOTIFICATIONS & ALERTS
 * ============================================================================
 */

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags:
 *       - 17. Notifications
 *     summary: Get notifications for logged-in user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of unread and read alerts
 *   post:
 *     tags:
 *       - 17. Notifications
 *     summary: Dispatch notification to user or department
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               userId: { type: integer }
 *               department: { type: string }
 *               title: { type: string }
 *               message: { type: string }
 *               type: { type: string, enum: [INFO, WARNING, SUCCESS, ERROR] }
 *     responses:
 *       201:
 *         description: Notification dispatched
 *
 * /api/notifications/mark-all-read:
 *   put:
 *     tags:
 *       - 17. Notifications
 *     summary: Mark all user notifications as read
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *
 * /api/notifications/{id}/read:
 *   put:
 *     tags:
 *       - 17. Notifications
 *     summary: Mark specific notification as read
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification status updated
 */

/**
 * @openapi
 * /api/accounting/vendor-invoices/eligible-challans:
 *   get:
 *     tags:
 *       - 14. Accounting & Invoicing
 *     summary: Get outward challans eligible for vendor invoicing
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of eligible outward challans
 *
 * /api/accounting/vendor-invoices/next-number:
 *   get:
 *     tags:
 *       - 14. Accounting & Invoicing
 *     summary: Auto-generate next vendor invoice reference number
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Next sequence number
 *
 * /api/accounting/vendor-payments/next-number:
 *   get:
 *     tags:
 *       - 14. Accounting & Invoicing
 *     summary: Auto-generate next payment voucher number
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Next payment voucher sequence
 *
 * /api/production/outward-challans:
 *   get:
 *     tags:
 *       - 12. Production Operations
 *     summary: List outward sub-contractor delivery challans
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Outward delivery challans list
 *   post:
 *     tags:
 *       - 12. Production Operations
 *     summary: Create outward challan for job work / sub-contracting
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vendorId
 *               - items
 *             properties:
 *               vendorId: { type: integer }
 *               challanDate: { type: string, format: date }
 *               items: { type: array, items: { type: object } }
 *     responses:
 *       201:
 *         description: Outward challan generated
 *
 * /api/production/inward-challans:
 *   get:
 *     tags:
 *       - 12. Production Operations
 *     summary: List inward return challans from job work vendors
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Inward challans list
 *   post:
 *     tags:
 *       - 12. Production Operations
 *     summary: Receive material back from sub-contractor
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - outwardChallanId
 *             properties:
 *               outwardChallanId: { type: integer }
 *               receivedDate: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Inward receipt recorded
 *
 * /api/qc/outsource/challan:
 *   post:
 *     tags:
 *       - 10. Quality Control (QC)
 *     summary: Create QC outsource inspection challan
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agencyName
 *               - items
 *             properties:
 *               agencyName: { type: string }
 *               testType: { type: string, example: "Radiography / Ultrasonic testing" }
 *     responses:
 *       201:
 *         description: Outsource QC challan created
 */

module.exports = {};
