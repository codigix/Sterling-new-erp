const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'uploads', 'purchase_orders', '4_1776933537926_PurchaseOrder_PO_2026_4611.pdf');
console.log('Checking path:', filePath);
console.log('Exists:', fs.existsSync(filePath));

const dirPath = path.join(__dirname, 'uploads', 'purchase_orders');
console.log('Checking dir:', dirPath);
if (fs.existsSync(dirPath)) {
    console.log('Files in dir:', fs.readdirSync(dirPath));
} else {
    console.log('Dir does not exist');
}
