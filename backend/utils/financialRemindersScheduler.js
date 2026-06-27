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
        recurrence VARCHAR(50) DEFAULT 'once',
        recurrence_day INT NULL,
        recurrence_month INT NULL,
        is_triggered TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Dynamic schema upgrade for existing tables
    const checkColumns = async (colName, colDef) => {
      const [columns] = await db.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'financial_reminders' 
          AND COLUMN_NAME = ? 
          AND TABLE_SCHEMA = DATABASE()
      `, [colName]);

      if (columns.length === 0) {
        console.log(`Adding ${colName} column to financial_reminders table...`);
        await db.query(`ALTER TABLE financial_reminders ADD COLUMN ${colName} ${colDef}`);
        console.log(`${colName} column added successfully.`);
      }
    };

    await checkColumns('recurrence', "VARCHAR(50) DEFAULT 'once' AFTER email");
    await checkColumns('recurrence_day', 'INT NULL AFTER recurrence');
    await checkColumns('recurrence_month', 'INT NULL AFTER recurrence_day');

    console.log('financial_reminders table verified successfully.');
  } catch (error) {
    console.error('Error initializing financial_reminders database table:', error);
  }
};

const calculateNextReminderDate = (startDate, recurrence, day, month) => {
  if (!startDate) return null;
  const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
  const start = new Date(Date.UTC(sYear, sMonth - 1, sDay));
  if (isNaN(start.getTime())) return null;

  // Calculate next occurrence that is strictly after start date
  const targetDate = new Date(start);
  targetDate.setUTCDate(targetDate.getUTCDate() + 1); // Check from next day

  if (recurrence === 'monthly') {
    let year = targetDate.getUTCFullYear();
    let m = targetDate.getUTCMonth(); // 0-11
    
    const maxDays = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    const candidateDay = Math.min(day || 1, maxDays);
    const candidateDate = new Date(Date.UTC(year, m, candidateDay));
    
    if (candidateDate >= targetDate) {
      return candidateDate.toISOString().split('T')[0];
    } else {
      m += 1;
      if (m > 11) {
        m = 0;
        year += 1;
      }
      const maxDaysNext = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
      const targetDayNext = Math.min(day || 1, maxDaysNext);
      return new Date(Date.UTC(year, m, targetDayNext)).toISOString().split('T')[0];
    }
  }

  if (recurrence === 'yearly') {
    let year = targetDate.getUTCFullYear();
    const targetMonth = (month || 1) - 1; // 0-based
    
    const maxDays = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
    const targetDay = Math.min(day || 1, maxDays);
    const candidateDate = new Date(Date.UTC(year, targetMonth, targetDay));
    
    if (candidateDate >= targetDate) {
      return candidateDate.toISOString().split('T')[0];
    } else {
      year += 1;
      const maxDaysNext = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
      const targetDayNext = Math.min(day || 1, maxDaysNext);
      return new Date(Date.UTC(year, targetMonth, targetDayNext)).toISOString().split('T')[0];
    }
  }
  return null;
};

const checkFinancialReminders = async () => {
  try {
    // Query database for reminders that are due today or in the past, and haven't been triggered yet
    const [rows] = await db.query(
      'SELECT id, title, description, DATE_FORMAT(reminder_date, "%Y-%m-%d") as reminder_date, email, recurrence, recurrence_day, recurrence_month FROM financial_reminders WHERE reminder_date <= CURRENT_DATE() AND is_triggered = 0'
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

        // 3. Mark reminder as triggered or roll forward if recurring
        if (reminder.recurrence === 'once') {
          await db.query(
            'UPDATE financial_reminders SET is_triggered = 1 WHERE id = ?',
            [reminder.id]
          );
          console.log(`Successfully triggered one-time reminder ID ${reminder.id}`);
        } else {
          const nextDate = calculateNextReminderDate(reminder.reminder_date, reminder.recurrence, reminder.recurrence_day, reminder.recurrence_month);
          if (nextDate) {
            await db.query(
              'UPDATE financial_reminders SET reminder_date = ?, is_triggered = 0 WHERE id = ?',
              [nextDate, reminder.id]
            );
            console.log(`Rolled forward recurring reminder ID ${reminder.id} to next occurrence: ${nextDate}`);
          } else {
            // Fallback if date calculation fails
            await db.query(
              'UPDATE financial_reminders SET is_triggered = 1 WHERE id = ?',
              [reminder.id]
            );
            console.log(`Fallback: marked reminder ID ${reminder.id} as triggered`);
          }
        }
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

module.exports = { startFinancialRemindersScheduler, calculateNextReminderDate };
