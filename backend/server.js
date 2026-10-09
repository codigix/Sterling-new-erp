const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const rootCardRoutes = require('./routes/rootCardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const designDrawingRoutes = require('./routes/designDrawingRoutes');
const bomRoutes = require('./routes/bomRoutes');
const materialRequestRoutes = require('./routes/materialRequestRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const qualityRoutes = require('./routes/qualityRoutes');
const grnRoutes = require('./routes/grnRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const productionRoutes = require('./routes/productionRoutes');
const { startEmailMonitor } = require('./utils/emailMonitor');
const { startTimelineAlerts } = require('./utils/timelineAlerts');
const { startFinancialRemindersScheduler } = require('./utils/financialRemindersScheduler');
const { startDbBackupScheduler } = require('./utils/dbBackupScheduler');
const reportRoutes = require('./routes/reportRoutes');
const departmentTaskRoutes = require('./routes/departmentTaskRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow serving images/files
  contentSecurityPolicy: false,     // Allow Swagger UI scripts & styles
}));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use('/api/uploads', express.static(path.resolve(process.env.UPLOAD_PATH)));
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_PATH)));

// Middleware to allow any logged-in user or active ERP user to access API docs
const docsAuth = async (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return next(); // Free access on localhost / development
  }

  const jwtSecret = process.env.JWT_SECRET || 'sterling_secret';

  // 1. Check if token is passed via query param (?token=... or ?auth=...)
  const queryToken = req.query.token || req.query.auth;
  if (queryToken) {
    try {
      jwt.verify(queryToken, jwtSecret);
      return next();
    } catch (e) {
      // Continue to other checks
    }
  }

  // 2. Check if user is logged into the ERP via cookie
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(^|;\s*)token=([^;]*)/);
    if (match) {
      const cookieToken = decodeURIComponent(match[2]);
      try {
        jwt.verify(cookieToken, jwtSecret);
        return next();
      } catch (e) {
        // Continue to other checks
      }
    }
  }

  // 3. Check Authorization header (Bearer or Basic)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    // Check Bearer JWT token
    if (authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.split(' ')[1];
      try {
        jwt.verify(bearerToken, jwtSecret);
        return next();
      } catch (e) {
        // Continue
      }
    }

    // Check Basic Auth (Email and Password entered in the browser sign-in popup)
    if (authHeader.startsWith('Basic ')) {
      try {
        const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
        const email = credentials[0];
        const password = credentials.slice(1).join(':');

        // Check fallback docs credentials
        const expectedUser = process.env.DOCS_USER || 'admin';
        const expectedPass = process.env.DOCS_PASSWORD || 'Sterling@Docs2024';
        if (email === expectedUser && password === expectedPass) {
          return next();
        }

        // Check against real active users in the database
        const [users] = await db.query('SELECT * FROM users WHERE email = ? AND status != "inactive"', [email]);
        if (users && users.length > 0) {
          const isMatch = await bcrypt.compare(password, users[0].password);
          if (isMatch) {
            return next();
          }
        }
      } catch (err) {
        console.error('Docs auth error:', err);
      }
    }
  }

  // Not authenticated: prompt user with browser Sign-in dialog
  res.setHeader('WWW-Authenticate', 'Basic realm="Sterling ERP - Log in with your ERP email and password"');
  return res.status(401).send('Please log in with your Sterling ERP email and password to view API documentation.');
};

// API Documentation (OpenAPI 3.0 / Swagger UI)
app.get('/api/docs.json', docsAuth, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.use('/api/docs', docsAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Sterling ERP - API Reference & Explorer',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 24px 0 16px; }
    .swagger-ui .info .title { font-size: 28px; color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .swagger-ui .opblock-tag { font-size: 18px; font-weight: 600; border-bottom: 1px solid #e2e8f0; margin-bottom: 8px; }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
  }
}));

// Routes
app.use('/api/design-drawings', designDrawingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/root-cards', rootCardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/qc', qualityRoutes);
app.use('/api/engineering/bom/comprehensive', bomRoutes);

// Multi-path registration for Material Requests
app.use('/api/production/material-requests', materialRequestRoutes);
app.use('/api/department/procurement/material-requests', materialRequestRoutes);
app.use('/api/department/inventory/material-requests', materialRequestRoutes);
// Compatibility for paths missing /api or using /production directly
app.use('/api/production/material-requests', materialRequestRoutes);

// Multi-path registration for Quotations
app.use('/api/department/procurement/quotations', quotationRoutes);
app.use('/api/department/inventory/quotations', quotationRoutes);

// Multi-path registration for Purchase Orders
app.use('/api/department/procurement/purchase-orders', purchaseOrderRoutes);
app.use('/api/department/inventory/purchase-orders', purchaseOrderRoutes);
app.use('/api/inventory/purchase-orders', purchaseOrderRoutes); // Added for PurchaseOrderDetailPage.jsx compatibility

// Multi-path registration for GRNs
app.use('/api/department/inventory/grn', grnRoutes);
app.use('/api/department/inventory/grns', grnRoutes);
app.use('/api/inventory/grn', grnRoutes);
app.use('/api/inventory/grns', grnRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/grns', grnRoutes);

// Multi-path registration for Inventory
app.use('/api/department/inventory/portal', inventoryRoutes);
app.use('/api/department/inventory/warehouses', inventoryRoutes);
app.use('/api/department/inventory/stock-entries', inventoryRoutes);
app.use('/api/department/inventory/materials', inventoryRoutes);
app.use('/api/inventory/stock-entries', inventoryRoutes);
app.use('/api/inventory/materials', inventoryRoutes);
app.use('/api/inventory', inventoryRoutes);

// Procurement Portal Compatibility Routes
app.use('/api/procurement/portal/purchase-requests', materialRequestRoutes);
app.use('/api/procurement/portal/purchase-orders', purchaseOrderRoutes);
app.use('/api/procurement/portal/quotes', quotationRoutes);

// Multi-path registration for Vendors
app.use('/api/department/procurement/vendors', quotationRoutes);
app.use('/api/department/inventory/vendors', quotationRoutes);
app.use('/api/department/production/vendors', quotationRoutes);
app.use('/api/inventory/vendors', quotationRoutes);

// New Production Flow Routes
app.use('/api/production', productionRoutes);
app.use('/api/department/production', productionRoutes);
app.use('/api/reports', reportRoutes);

// Departmental Task Routes
app.use('/api/departmental-tasks', departmentTaskRoutes);

// Accounting Routes
app.use('/api/accounting', accountingRoutes);

// Test Route
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    res.json({ 
      message: 'Backend is running!', 
      db_status: 'Connected', 
      db_test: rows[0].solution 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Backend is running, but database connection failed', 
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Start monitoring vendor email replies
  startEmailMonitor();
  // Start checking timeline deadlines
  startTimelineAlerts();
  // Start checking financial dashboard reminders
  startFinancialRemindersScheduler();
  // Start daily database backup scheduler
  startDbBackupScheduler();
});

// Set timeout to 10 minutes (600,000 ms) for large file uploads
server.timeout = 10 * 60 * 1000;

