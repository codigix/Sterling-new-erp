const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

/**
 * Ensures the uploads/database_backup directory exists.
 */
const getBackupDirectory = () => {
  const uploadPath = process.env.UPLOAD_PATH;
  if (!uploadPath) {
    throw new Error('UPLOAD_PATH is not defined in .env file.');
  }

  const baseUploadPath = path.isAbsolute(uploadPath)
    ? uploadPath
    : path.resolve(__dirname, '..', uploadPath);

  const backupDir = path.join(baseUploadPath, 'database_backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`[DB Backup] Created directory: ${backupDir}`);
  }
  return backupDir;
};

/**
 * Formats a Date object into YYYY-MM-DD_HH-mm-ss string.
 */
const formatDateTime = (date = new Date()) => {
  const pad = (num) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

/**
 * Dump database using JS fallback (when mysqldump CLI is unavailable).
 */
const jsDatabaseDump = async (filePath) => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    timezone: 'Z'
  });

  const writeStream = fs.createWriteStream(filePath, { encoding: 'utf8' });

  writeStream.write(`-- ERP Database Backup\n`);
  writeStream.write(`-- Generated: ${new Date().toISOString()}\n`);
  writeStream.write(`-- Database: ${process.env.DB_NAME}\n\n`);
  writeStream.write(`SET FOREIGN_KEY_CHECKS=0;\n`);
  writeStream.write(`SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n\n`);

  // Fetch all tables
  const [tables] = await connection.query('SHOW TABLES');
  const tableKey = `Tables_in_${process.env.DB_NAME}`;

  for (const tableObj of tables) {
    const tableName = tableObj[tableKey] || Object.values(tableObj)[0];
    if (!tableName) continue;

    writeStream.write(`-- --------------------------------------------------------\n`);
    writeStream.write(`-- Table structure for table \`${tableName}\`\n`);
    writeStream.write(`-- --------------------------------------------------------\n\n`);
    writeStream.write(`DROP TABLE IF EXISTS \`${tableName}\`;\n`);

    const [createTableResult] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
    const createTableSql = createTableResult[0]['Create Table'] || createTableResult[0]['Create View'];
    if (createTableSql) {
      writeStream.write(`${createTableSql};\n\n`);
    }

    // Dump data if it's a table (not a view)
    const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
    if (rows && rows.length > 0) {
      writeStream.write(`-- Dumping data for table \`${tableName}\`\n\n`);

      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const columns = Object.keys(chunk[0]).map(col => `\`${col}\``).join(', ');
        
        const valueRows = chunk.map(row => {
          const vals = Object.values(row).map(val => mysql.escape(val));
          return `(${vals.join(', ')})`;
        });

        writeStream.write(`INSERT INTO \`${tableName}\` (${columns}) VALUES\n${valueRows.join(',\n')};\n\n`);
      }
    }
  }

  writeStream.write(`SET FOREIGN_KEY_CHECKS=1;\n`);
  await new Promise((resolve) => writeStream.end(resolve));
  await connection.end();
};

/**
 * Auto-delete backups older than retention period (default 30 days).
 */
const cleanupOldBackups = (backupDir, retentionDays = 30) => {
  try {
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    files.forEach(file => {
      if (file.startsWith('backup_') && file.endsWith('.sql')) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`[DB Backup] Cleaned up old backup file: ${file}`);
        }
      }
    });

    if (deletedCount > 0) {
      console.log(`[DB Backup] Cleaned up ${deletedCount} old backup(s).`);
    }
  } catch (error) {
    console.error('[DB Backup] Error during cleanup:', error.message);
  }
};

/**
 * Main database backup function.
 */
const runDatabaseBackup = async () => {
  const startTime = Date.now();
  const backupDir = getBackupDirectory();
  const timestamp = formatDateTime();
  const fileName = `backup_${timestamp}.sql`;
  const filePath = path.join(backupDir, fileName);

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME;

  if (!dbName) {
    throw new Error('DB_NAME environment variable is not defined.');
  }

  console.log(`[DB Backup] Starting backup for database '${dbName}'...`);

  // Try mysqldump CLI command first
  const mysqldumpCmd = `mysqldump --host=${dbHost} --port=${dbPort} --user=${dbUser} ${dbPassword ? `--password="${dbPassword}"` : ''} --routines --triggers --single-transaction ${dbName} > "${filePath}"`;

  return new Promise((resolve, reject) => {
    exec(mysqldumpCmd, async (error, stdout, stderr) => {
      if (error) {
        console.warn(`[DB Backup] mysqldump CLI failed or not installed. Switching to JavaScript fallback exporter...`);
        try {
          await jsDatabaseDump(filePath);
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          const stats = fs.statSync(filePath);
          const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          
          console.log(`[DB Backup] Backup completed successfully via JS fallback!`);
          console.log(`[DB Backup] File: ${fileName} (${fileSizeMB} MB)`);
          console.log(`[DB Backup] Path: ${filePath}`);
          console.log(`[DB Backup] Time taken: ${duration}s`);

          cleanupOldBackups(backupDir);

          resolve({
            success: true,
            fileName,
            filePath,
            fileSizeMB,
            duration,
            method: 'js_fallback'
          });
        } catch (fallbackError) {
          console.error(`[DB Backup] JS Fallback backup failed:`, fallbackError);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          reject(fallbackError);
        }
      } else {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const stats = fs.statSync(filePath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`[DB Backup] Backup completed successfully via mysqldump!`);
        console.log(`[DB Backup] File: ${fileName} (${fileSizeMB} MB)`);
        console.log(`[DB Backup] Path: ${filePath}`);
        console.log(`[DB Backup] Time taken: ${duration}s`);

        cleanupOldBackups(backupDir);

        resolve({
          success: true,
          fileName,
          filePath,
          fileSizeMB,
          duration,
          method: 'mysqldump'
        });
      }
    });
  });
};

// Allow executing directly from CLI: node backend/scripts/dbBackup.js
if (require.main === module) {
  runDatabaseBackup()
    .then((result) => {
      console.log('[DB Backup] Execution finished.', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[DB Backup] Execution failed:', err);
      process.exit(1);
    });
}

module.exports = {
  runDatabaseBackup,
  getBackupDirectory,
  formatDateTime
};
