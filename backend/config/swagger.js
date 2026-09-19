require('dotenv').config();
const swaggerJsDoc = require('swagger-jsdoc');
const path = require('path');

// Determine base URL dynamically from .env
const apiBaseUrl = process.env.API_BASE_URL || (process.env.NODE_ENV === 'production' 
  ? 'https://sterlignerp.codigixinfotech.com' 
  : `http://localhost:${process.env.PORT || 5001}`);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sterling ERP - API Documentation',
      version: '1.0.0',
      description: `
## Sterling Manufacturing ERP API Reference
This interactive API portal provides full specifications for all endpoints across the Sterling ERP platform.

### Authentication
Most endpoints require a **Bearer JWT Token** in the \`Authorization\` header:
\`Authorization: Bearer <your_jwt_token>\`

To test authenticated endpoints:
1. Call \`POST /api/auth/login\` with valid credentials.
2. Copy the \`token\` from the response.
3. Click the **Authorize 🔓** button at the top right, paste the token, and click **Authorize**.
4. You can now execute any protected API directly from this browser page!

*(Note: In local development mode, \`demo-token\` is also supported).*
      `,
      contact: {
        name: 'Sterling ERP Engineering Team',
      },
    },
    servers: [
      {
        url: apiBaseUrl,
        description: `Configured Server (${process.env.NODE_ENV === 'production' ? 'Production' : 'Local Development'})`,
      },
      {
        url: '/',
        description: 'Current Host (Relative Path)',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token (e.g. from /api/auth/login)',
        },
      },
      schemas: {
        StandardSuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Detailed error message' },
            error: { type: 'object' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            fullName: { type: 'string', example: 'Admin User' },
            email: { type: 'string', example: 'admin@sterling.com' },
            role: { type: 'string', example: 'Admin' },
            department: { type: 'string', example: 'Management' },
            isActive: { type: 'boolean', example: true },
          },
        },
      },
    },
    tags: [
      { name: '1. Authentication', description: 'User login, registration, password recovery, session verification' },
      { name: '2. Admin & User Management', description: 'User accounts, role configurations, audit logs, and system settings' },
      { name: '3. Employee Management', description: 'Staff profiles, departmental rosters, and employee records' },
      { name: '4. Design & CAD Drawings', description: 'Engineering drawing uploads (.dwg, .step, .pdf), revisions, project CAD docs' },
      { name: '5. Engineering BOM', description: 'Bill of Materials calculations, materials breakdown, weights, and items per packet' },
      { name: '6. Material Requests', description: 'Production floor material indents, store requisitions, and approvals' },
      { name: '7. Quotations & RFQs', description: 'Vendor quotations, price comparisons, and vendor contact directory' },
      { name: '8. Purchase Orders (PO)', description: 'Purchase order generation, vendor issuance, approvals, and PO attachments' },
      { name: '9. Goods Receipt Notes (GRN)', description: 'Inward material inspection, serial allocation, and store receipting' },
      { name: '10. Quality Control (QC)', description: 'Inspection logs, MCR (Material Control Report), acceptances, and rejections' },
      { name: '11. Inventory & Stock', description: 'Warehouse stock balances, stock movement entries, and material inventory' },
      { name: '12. Production Operations', description: 'Work in progress (WIP), shop-floor job scheduling, machine operations' },
      { name: '13. Root Cards (RC)', description: 'Production traveller cards, process routing, serial tracking, dimensions' },
      { name: '14. Accounting & Invoicing', description: 'Vendor/customer invoices, payment entries, outward challans, and ledgers' },
      { name: '15. Departmental Tasks', description: 'Internal team task assignments, progress tracking, and deadlines' },
      { name: '16. Reports & Timeline', description: 'Production dashboards, timeline alerts, cost tracking, and exports' },
      { name: '17. Notifications', description: 'Real-time in-app alerts, read status, and user notifications' },
    ],
  },
  apis: [
    path.resolve(__dirname, '../routes/*.js').replace(/\\/g, '/'),
    path.resolve(__dirname, '../docs/*.js').replace(/\\/g, '/'),
    path.resolve(__dirname, '../server.js').replace(/\\/g, '/'),
  ],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;
