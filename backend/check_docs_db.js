require('dotenv').config({ path: '../.env' });
const db = require('./config/db');

async function checkReports() {
    try {
        console.log('CWD:', process.cwd());
        console.log('UPLOAD_PATH from env:', process.env.UPLOAD_PATH);
        console.log('Resolved uploads path:', require('path').resolve(__dirname, process.env.UPLOAD_PATH || 'uploads/'));
        
        const [rows] = await db.query('SELECT * FROM quality_final_report_items WHERE accepted_report IS NOT NULL OR rejected_report IS NOT NULL');
        console.log('--- Final Report Items with Documents ---');
        rows.forEach(r => {
            console.log(`Item ID: ${r.id}, Name: ${r.material_name}, Accepted Doc: ${r.accepted_report}, Rejected Doc: ${r.rejected_report}`);
        });

        const [inspRows] = await db.query('SELECT * FROM quality_inspections WHERE common_document_path IS NOT NULL OR rejected_document_path IS NOT NULL');
        console.log('\n--- Quality Inspections with Documents ---');
        inspRows.forEach(r => {
            console.log(`Insp ID: ${r.id}, GRN: ${r.grn_id}, Accepted Doc: ${r.common_document_path}, Rejected Doc: ${r.rejected_document_path}`);
        });

        const [resultsRows] = await db.query('SELECT * FROM quality_inspection_results WHERE document_path IS NOT NULL');
        console.log('\n--- Inspection Results with Documents ---');
        resultsRows.forEach(r => {
            console.log(`Result ID: ${r.id}, Serial: ${r.serial_number}, Doc: ${r.document_path}`);
        });
        
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkReports();
