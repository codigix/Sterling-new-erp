const db = require('./config/db');

async function describeTables() {
    try {
        const [qRows] = await db.query('DESCRIBE quotations');
        console.log('--- quotations ---');
        console.log(JSON.stringify(qRows, null, 2));

        const [itemRows] = await db.query('DESCRIBE quotation_items');
        console.log('\n--- quotation_items ---');
        console.log(JSON.stringify(itemRows, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

describeTables();
