const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config({ path: '../.env' });

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

const path = require('path');
const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow serving images/files
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api/uploads', express.static(path.resolve(__dirname, process.env.UPLOAD_PATH || 'uploads')));
app.use('/uploads', express.static(path.resolve(__dirname, process.env.UPLOAD_PATH || 'uploads')));

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

// Multi-path registration for Inventory
app.use('/api/department/inventory/warehouses', inventoryRoutes);
app.use('/api/department/inventory/stock-entries', inventoryRoutes);
app.use('/api/department/inventory/materials', inventoryRoutes);
app.use('/api/inventory/stock-entries', inventoryRoutes);
app.use('/api/inventory/materials', inventoryRoutes);
app.use('/api/inventory', inventoryRoutes);

// Multi-path registration for Vendors
app.use('/api/department/procurement/vendors', quotationRoutes);
app.use('/api/department/inventory/vendors', quotationRoutes);

// Root Cards (sometimes called directly or through departments)
app.use('/api/production/root-cards', rootCardRoutes);
app.use('/api/department/procurement/root-cards', rootCardRoutes);
app.use('/api/department/inventory/root-cards', rootCardRoutes);

// New Production Flow Routes
app.use('/api/production', productionRoutes);
app.use('/api/department/production', productionRoutes);

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
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Start monitoring vendor email replies
  startEmailMonitor();
});
