const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config({ path: '../.env' });

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const rootCardRoutes = require('./routes/rootCardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const designDrawingRoutes = require('./routes/designDrawingRoutes');
const bomRoutes = require('./routes/bomRoutes');
const materialRequestRoutes = require('./routes/materialRequestRoutes');
const quotationRoutes = require('./routes/quotationRoutes');

const app = express();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow serving images/files
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/design-drawings', designDrawingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/root-cards', rootCardRoutes);
app.use('/api/notifications', notificationRoutes);
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

// Multi-path registration for Vendors
app.use('/api/department/procurement/vendors', quotationRoutes);
app.use('/api/department/inventory/vendors', quotationRoutes);

// Root Cards (sometimes called directly or through departments)
app.use('/api/root-cards', rootCardRoutes);
app.use('/api/production/root-cards', rootCardRoutes);
app.use('/api/department/procurement/root-cards', rootCardRoutes);
app.use('/api/department/inventory/root-cards', rootCardRoutes);

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
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
