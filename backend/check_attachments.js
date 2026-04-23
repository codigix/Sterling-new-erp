const db = require('./config/db');

async function checkAttachments() {
    try {
        const [rows] = await db.query('SELECT * FROM purchase_order_communication_attachments ORDER BY id DESC LIMIT 5');
        console.log('purchase_order_communication_attachments:');
        console.log(JSON.stringify(rows, null, 2));

        const [poRows] = await db.query('SELECT * FROM purchase_order_attachments ORDER BY id DESC LIMIT 5');
        console.log('\npurchase_order_attachments:');
        console.log(JSON.stringify(poRows, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
}

checkAttachments();
