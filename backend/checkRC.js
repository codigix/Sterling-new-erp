const db = require('./config/db');

const check = async () => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) as count FROM root_cards');
    console.log('Root Card count:', rows[0].count);
    
    if (rows[0].count > 0) {
      const [cards] = await db.query('SELECT id, po_number, project_name, status FROM root_cards LIMIT 5');
      console.log('Sample Root Cards:', cards);
      
      const [steps] = await db.query('SELECT * FROM root_card_steps');
      console.log('Root Card Steps:', steps);
      
      const [users] = await db.query('SELECT id, full_name, role, department FROM users');
      console.log('Users:', users);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

check();
