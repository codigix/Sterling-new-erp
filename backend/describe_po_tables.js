const db = require('./config/db');

async function describeTables() {
    try {
        const [poRows] = await db.query('DESCRIBE purchase_orders');
        console.log('--- purchase_orders ---');
        console.log(JSON.stringify(poRows, null, 2));

        const [itemRows] = await db.query('DESCRIBE purchase_order_items');
        console.log('\n--- purchase_order_items ---');
        console.log(JSON.stringify(itemRows, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

describeTables();
