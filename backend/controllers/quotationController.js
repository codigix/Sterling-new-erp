const db = require('../config/db');

const getQuotations = async (req, res) => {
    try {
        const { type, material_request_id, search, status } = req.query;
        let query = `
            SELECT q.*, v.name as vendor_name, mr.request_number as mr_number, rc.project_name
            FROM quotations q
            LEFT JOIN vendors v ON q.vendor_id = v.id
            LEFT JOIN material_requests mr ON q.material_request_id = mr.id
            LEFT JOIN root_cards rc ON q.root_card_id = rc.id
            WHERE 1=1
        `;
        const params = [];

        if (type) {
            query += " AND q.type = ?";
            params.push(type);
        }
        if (material_request_id) {
            query += " AND q.material_request_id = ?";
            params.push(material_request_id);
        }
        if (status && status !== 'all') {
            query += " AND q.status = ?";
            params.push(status);
        }
        if (search) {
            query += " AND (q.quotation_number LIKE ? OR v.name LIKE ? OR mr.request_number LIKE ?)";
            const searchVal = `%${search}%`;
            params.push(searchVal, searchVal, searchVal);
        }

        query += " ORDER BY q.created_at DESC";

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching quotations:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getQuotationById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT q.*, v.name as vendor_name, v.email as vendor_email, mr.request_number as mr_number, rc.project_name
            FROM quotations q
            LEFT JOIN vendors v ON q.vendor_id = v.id
            LEFT JOIN material_requests mr ON q.material_request_id = mr.id
            LEFT JOIN root_cards rc ON q.root_card_id = rc.id
            WHERE q.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        const quotation = rows[0];
        const [items] = await db.query('SELECT * FROM quotation_items WHERE quotation_id = ?', [id]);
        quotation.items = items;

        res.json(quotation);
    } catch (error) {
        console.error('Error fetching quotation details:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createQuotation = async (req, res) => {
    const { vendor_id, root_card_id, material_request_id, type, items, notes, total_amount, valid_until } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Generate Quotation Number
        const year = new Date().getFullYear();
        const [countRows] = await connection.query('SELECT COUNT(*) as count FROM quotations');
        const nextNum = (countRows[0].count + 1).toString().padStart(4, '0');
        const prefix = type === 'outbound' ? 'RFQ' : 'QTN';
        const quotationNumber = `${prefix}-${year}-${nextNum}`;

        const [result] = await connection.query(
            `INSERT INTO quotations 
            (quotation_number, vendor_id, root_card_id, material_request_id, type, notes, total_amount, valid_until, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [quotationNumber, vendor_id, root_card_id || null, material_request_id || null, type, notes || '', total_amount || 0, valid_until || null, 'pending']
        );

        const quotationId = result.insertId;

        if (items && items.length > 0) {
            const itemValues = items.map(item => [
                quotationId,
                item.item_code || '',
                item.description || '',
                item.category || '',
                item.quantity || 0,
                item.unit || '',
                item.unit_price || 0,
                item.material_grade || '',
                item.part_detail || '',
                item.make || '',
                item.remark || ''
            ]);

            await connection.query(
                `INSERT INTO quotation_items 
                (quotation_id, item_code, description, category, quantity, unit, unit_price, material_grade, part_detail, make, remark) 
                VALUES ?`,
                [itemValues]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'Quotation created successfully', id: quotationId, quotation_number: quotationNumber });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating quotation:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

const getQuotationStats = async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN type = 'outbound' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN type = 'inbound' THEN 1 ELSE 0 END) as received,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
            FROM quotations
        `);
        res.json(stats[0] || { total: 0, sent: 0, received: 0, pending: 0 });
    } catch (error) {
        console.error('Error fetching quotation stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getVendors = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM vendors ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const analyzeQuotation = async (req, res) => {
    // Placeholder for AI/Document analysis
    res.json({ 
        items: JSON.parse(req.body.items || '[]').map(item => ({ ...item, unit_price: Math.floor(Math.random() * 1000) + 100 })),
        total_amount: 5000 
    });
};

const getCommunications = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM quotation_communications WHERE quotation_id = ? ORDER BY created_at DESC', [id]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching communications:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getQuotations,
    getQuotationById,
    createQuotation,
    getQuotationStats,
    getVendors,
    analyzeQuotation,
    getCommunications
};
