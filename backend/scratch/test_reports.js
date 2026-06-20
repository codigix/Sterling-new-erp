const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../config/db');
const { getOperatorLogsReport, getProjectManhoursReport } = require('../controllers/reportController');

(async () => {
  try {
    console.log('Testing report endpoints:');
    
    const req = {
      query: {
        start: '2026-05-21',
        end: '2026-06-20'
      }
    };
    
    const res = {
      json: (data) => {
        console.log('Response data length:', data.length);
        if (data.length > 0) {
          console.log('Sample item:', data[0]);
        } else {
          console.log('No data returned.');
        }
      },
      status: (code) => ({
        json: (err) => {
          console.error(`Error status ${code}:`, err);
        }
      })
    };

    console.log('--- Testing Operator Logs Report ---');
    await getOperatorLogsReport(req, res);
    
    console.log('--- Testing Project Manhours Report ---');
    await getProjectManhoursReport(req, res);

    // Let's close connection if db has end
    if (db.end) {
      await db.end();
    } else if (db.pool && db.pool.end) {
      await db.pool.end();
    }
  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    process.exit(0);
  }
})();
