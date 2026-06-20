const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../config/db');

const getDepartmentsReport = async (req, res) => {
  try {
    const [projects] = await db.query(`
      SELECT id, project_code, project_name, status as project_status, timelines 
      FROM root_cards 
      ORDER BY created_at DESC
    `);

    const [steps] = await db.query(`
      SELECT root_card_id, step_key, status, updated_at 
      FROM root_card_steps
    `);

    const stepMap = {};
    steps.forEach(s => {
      if (!stepMap[s.root_card_id]) {
        stepMap[s.root_card_id] = {};
      }
      stepMap[s.root_card_id][s.step_key] = {
        status: s.status,
        completed_date: s.updated_at
      };
    });

    const stepKeyMap = {
      Design: 'design_engineering',
      Production: 'production',
      Procurement: 'procurement',
      Inventory: 'inventory',
      Quality: 'quality'
    };

    const departments = ['Design', 'Production', 'Procurement', 'Inventory', 'Quality'];

    const projectMatrix = projects.map(project => {
      let timelinesObj = project.timelines;
      if (timelinesObj && typeof timelinesObj === 'string') {
        try {
          timelinesObj = JSON.parse(timelinesObj);
        } catch (e) {
          timelinesObj = null;
        }
      }

      const projSteps = stepMap[project.id] || {};

      const timelineReport = departments.reduce((acc, dept) => {
        const stepKey = stepKeyMap[dept];
        const stepInfo = projSteps[stepKey] || { status: 'pending', completed_date: null };
        const dates = (timelinesObj && timelinesObj[dept]) ? timelinesObj[dept] : null;

        let status = 'Not Assigned';
        let delayDays = 0;
        let startDate = dates ? dates.startDate : null;
        let endDate = dates ? dates.endDate : null;
        let completedDate = (stepInfo.status === 'completed' || stepInfo.status === 'Completed') ? stepInfo.completed_date : null;

        if (dates && dates.endDate) {
          const end = new Date(dates.endDate);
          end.setHours(23, 59, 59, 999);

          if (stepInfo.status === 'completed' || stepInfo.status === 'Completed') {
            const compDate = new Date(stepInfo.completed_date);
            if (compDate <= end) {
              status = 'On Time';
            } else {
              status = 'Delayed';
              delayDays = Math.ceil((compDate.getTime() - end.getTime()) / (1000 * 3600 * 24));
            }
          } else {
            const today = new Date();
            if (today > end) {
              status = 'Overdue';
              delayDays = Math.ceil((today.getTime() - end.getTime()) / (1000 * 3600 * 24));
            } else {
              status = 'Pending';
            }
          }
        }

        acc[dept.toLowerCase()] = {
          status,
          delayDays,
          startDate,
          endDate,
          completedDate
        };
        return acc;
      }, {});

      return {
        id: project.id,
        project_code: project.project_code,
        project_name: project.project_name,
        project_status: project.project_status,
        ...timelineReport
      };
    });

    res.json(projectMatrix);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

(async () => {
  const req = {};
  const res = {
    json: (data) => {
      console.log('Matrix result length:', data.length);
      if (data.length > 0) {
        console.log('Sample project timeline status row:', JSON.stringify(data[0], null, 2));
      }
    },
    status: (code) => ({
      json: (err) => {
        console.error(code, err);
      }
    })
  };
  await getDepartmentsReport(req, res);
  process.exit(0);
})();
