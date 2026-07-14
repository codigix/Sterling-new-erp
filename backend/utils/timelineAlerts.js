const db = require('../config/db');

const checkTimelineDeadlines = async () => {
  try {
    const [cards] = await db.query('SELECT id, project_name, timelines FROM root_cards');
    if (cards.length === 0) return;

    const stepKeyMap = {
      Design: 'design_engineering',
      Production: 'production',
      Procurement: 'procurement',
      Inventory: 'inventory',
      Quality: 'quality'
    };

    const departmentRoleMap = {
      Design: 'Design Engineer',
      Production: 'Production',
      Procurement: 'Procurement',
      Inventory: 'Inventory',
      Quality: 'Quality'
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const rc of cards) {
      let timelinesObj = rc.timelines;
      if (!timelinesObj) continue;

      if (typeof timelinesObj === 'string') {
        try {
          timelinesObj = JSON.parse(timelinesObj);
        } catch (e) {
          timelinesObj = null;
        }
      }

      if (!timelinesObj || typeof timelinesObj !== 'object') continue;

      for (const [deptKey, dates] of Object.entries(timelinesObj)) {
        if (!dates || !dates.endDate) continue;

        const end = new Date(dates.endDate);
        if (isNaN(end.getTime())) continue;
        end.setHours(0, 0, 0, 0);

        const timeDiff = end.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Alert if the deadline is between 0 and 3 days away (approaching or today)
        if (daysDiff >= 0 && daysDiff <= 3) {
          const stepKey = stepKeyMap[deptKey];
          const role = departmentRoleMap[deptKey];

          if (!stepKey || !role) continue;

          // 1. Check if the step is already completed
          const [steps] = await db.query(
            'SELECT status FROM root_card_steps WHERE root_card_id = ? AND step_key = ?',
            [rc.id, stepKey]
          );

          if (steps.length > 0 && steps[0].status === 'completed') {
            // Already completed, no need to alert
            continue;
          }

          // 2. Check if notification was already sent to avoid duplicate alerts for this end date
          const title = 'Department Timeline Deadline Approaching';
          const [existing] = await db.query(
            'SELECT id FROM notifications WHERE department = ? AND title = ? AND message LIKE ?',
            [role, title, `%${rc.id}%${dates.endDate}%`]
          );

          if (existing.length > 0) {
            // Already alerted for this end date
            continue;
          }

          // 3. Send warning notification
          let link = '/';
          if (role === 'Design Engineer') link = '/design-engineer/root-cards';
          else if (role === 'Production') link = '/department/production/root-cards';
          else if (role === 'Procurement') link = '/department/procurement/root-cards';
          else if (role === 'Inventory') link = '/department/inventory/root-cards';
          else if (role === 'Quality') link = '/department/quality/root-cards';

          const message = `Deadline for Project "${rc.project_name}" ${deptKey} department is approaching. Target end date: ${dates.endDate}. Please complete the required steps.`;

          await db.query(
            'INSERT INTO notifications (department, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
            [role, title, message, 'warning', link]
          );
          console.log(`Timeline Alert: Sent approaching deadline warning to ${role} for Route Card ${rc.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking timeline deadlines:', error);
  }
};

// Start periodic checks (e.g. check every 12 hours)
const startTimelineAlerts = () => {
  console.log('Starting Timeline Deadline Alerts System...');
  // Run check on startup
  checkTimelineDeadlines();
  
  // Set interval to run check every 12 hours (43,200,000 milliseconds)
  setInterval(checkTimelineDeadlines, 12 * 60 * 60 * 1000);
};

module.exports = { startTimelineAlerts };
