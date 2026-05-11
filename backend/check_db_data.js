const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        const connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log('Connected to database');
        
        const [rootCards] = await connection.query('SELECT id, public_id, project_name FROM root_cards LIMIT 5');
        console.log('Sample Root Cards:', rootCards);
        
        const [boms] = await connection.query('SELECT id, public_id, root_card_id, bom_number FROM boms LIMIT 5');
        console.log('Sample BOMs:', boms);
        
        await connection.end();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
