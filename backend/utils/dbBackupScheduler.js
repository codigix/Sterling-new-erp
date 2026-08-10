const { runDatabaseBackup } = require('../scripts/dbBackup');

/**
 * Starts the daily automated database backup scheduler.
 */
const startDbBackupScheduler = () => {
  console.log('[DB Backup Scheduler] Starting automated database backup scheduler...');

  // Run initial backup 15 seconds after server boot to allow full server & DB initialization
  setTimeout(async () => {
    try {
      console.log('[DB Backup Scheduler] Running startup database backup...');
      await runDatabaseBackup();
    } catch (error) {
      console.error('[DB Backup Scheduler] Initial backup failed:', error.message);
    }
  }, 15000);

  // Repeat daily backup every 24 hours (86,400,000 milliseconds)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      console.log('[DB Backup Scheduler] Running scheduled daily database backup...');
      await runDatabaseBackup();
    } catch (error) {
      console.error('[DB Backup Scheduler] Scheduled backup failed:', error.message);
    }
  }, TWENTY_FOUR_HOURS);
};

module.exports = { startDbBackupScheduler };
