const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        const connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log('Connected to database');
        
        const id = '67a8b0b0-dc31-4f18-9be7-bd0a0f5dadcb';
        const [rows] = await connection.query('SELECT * FROM root_cards WHERE id = ? OR public_id = ?', [id, id]);
        console.log('Query Result for Root Card:', rows.length > 0 ? 'Found' : 'Not Found');
        if (rows.length > 0) console.log(rows[0]);

        const bomIdToCheck = 52;
        const [bomRows52] = await connection.query('SELECT * FROM boms WHERE id = ?', [bomIdToCheck]);
        console.log('BOM ID 52:', bomRows52.length > 0 ? bomRows52[0] : 'Not Found');
        
        await connection.end();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
