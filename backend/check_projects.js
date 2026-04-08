const db = require('./config/db');

async function checkProjects() {
    try {
        const [rows] = await db.query('SELECT project_name FROM root_cards LIMIT 20');
        console.log(JSON.stringify(rows.map(r => r.project_name), null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkProjects();
