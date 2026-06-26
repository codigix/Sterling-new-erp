const db = require('../config/db');
const { sendEmail } = require('./emailService');

const initializeDatabase = async () => {
  try {
    console.log('Ensuring financial_reminders table exists...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS financial_reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        reminder_date DATE NOT NULL,
        email VARCHAR(255) NOT NULL,
        is_triggered TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('financial_reminders table verified successfully.');
  } catch (error) {
    console.error('Error initializing financial_reminders database table:', error);
  }
};

const checkFinancialReminders = async () => {
  try {
    // Query database for reminders that are due today or in the past, and haven't been triggered yet
    const [rows] = await db.query(
      'SELECT id, title, description, DATE_FORMAT(reminder_date, "%Y-%m-%d") as reminder_date, email FROM financial_reminders WHERE reminder_date <= CURRENT_DATE() AND is_triggered = 0'
    );

    if (rows.length === 0) {
      return;
    }

    console.log(`Found ${rows.length} due financial reminders. Processing...`);

    for (const reminder of rows) {
      try {
        // 1. Send Email Notification
        console.log(`Sending email reminder to ${reminder.email} for: "${reminder.title}"`);
        await sendEmail({
          to: reminder.email,
          subject: `Reminder Alert: ${reminder.title}`,
          text: `Hello,\n\nThis is a scheduled financial reminder for you:\n\nTitle: ${reminder.title}\nDescription: ${reminder.description || 'No description provided.'}\nConfigured Date: ${reminder.reminder_date}\n\nBest regards,\nSterling ERP System`
        });

        // 2. Display Dashboard Notification (insert into notifications table for Accountant department)
        console.log(`Inserting dashboard notification for Accountant department...`);
        await db.query(
          'INSERT INTO notifications (department, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
          [
            'Accountant',
            `Financial Reminder: ${reminder.title}`,
            reminder.description || 'Scheduled reminder date reached.',
            'info',
            '/accountant/dashboard'
          ]
        );

        // 3. Mark reminder as triggered
        await db.query(
          'UPDATE financial_reminders SET is_triggered = 1 WHERE id = ?',
          [reminder.id]
        );

        console.log(`Successfully triggered reminder ID ${reminder.id}`);
      } catch (err) {
        console.error(`Failed to process reminder ID ${reminder.id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error running financial reminders check:', error);
  }
};

const startFinancialRemindersScheduler = async () => {
  console.log('Starting Financial Reminders Scheduler...');
  // Ensure table exists
  await initializeDatabase();
  
  // Run first check on startup
  await checkFinancialReminders();
  
  // Set interval to check every 1 hour (3600000 ms)
  setInterval(checkFinancialReminders, 60 * 60 * 1000);
};

module.exports = { startFinancialRemindersScheduler };
