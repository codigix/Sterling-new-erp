const db = require('../config/db');
const { sendEmail } = require('../utils/emailService');
const fs = require('fs');
const path = require('path');

const getPurchaseOrders = async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = `
            SELECT po.*, v.name as vendor_name, v.email as vendor_email, q.quotation_number,
            (SELECT COUNT(*) FROM purchase_order_communications WHERE purchase_order_id = po.id AND is_outgoing = FALSE AND is_read = FALSE) as unread_communication_count,
            (SELECT SUM(quantity) FROM purchase_order_items WHERE purchase_order_id = po.id) as total_qty,
            (SELECT SUM(received) FROM purchase_order_items WHERE purchase_order_id = po.id) as received_qty
            FROM purchase_orders po
            LEFT JOIN vendors v ON po.vendor_id = v.id
            LEFT JOIN quotations q ON po.quotation_id = q.id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            query += " AND po.status = ?";
            params.push(status);
        }
        if (search) {
            query += " AND (po.po_number LIKE ? OR v.name LIKE ? OR q.quotation_number LIKE ?)";
            const searchVal = `%${search}%`;
            params.push(searchVal, searchVal, searchVal);
        }

        query += " ORDER BY po.created_at DESC";

        const [rows] = await db.query(query, params);
        res.json({ purchaseOrders: rows });
    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getPurchaseOrderById = async (req, res) => {
    const { id } = req.params;
    try {
        // Support fetching by numeric ID OR PO Number
        const isNumeric = /^\d+$/.test(id);
        const condition = isNumeric ? 'po.id = ?' : 'po.po_number = ?';

        const [rows] = await db.query(`
            SELECT po.*, v.name as vendor_name, v.email as vendor_email, q.quotation_number
            FROM purchase_orders po
            LEFT JOIN vendors v ON po.vendor_id = v.id
            LEFT JOIN quotations q ON po.quotation_id = q.id
            WHERE ${condition}
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Purchase Order not found' });
        }

        const po = rows[0];
        const [items] = await db.query('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?', [po.id]);
        po.items = items;

        const [attachments] = await db.query('SELECT * FROM purchase_order_attachments WHERE purchase_order_id = ?', [po.id]);
        po.attachments = attachments;

        res.json(po);
    } catch (error) {
        console.error('Error fetching purchase order details:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createPurchaseOrder = async (req, res) => {
    const { 
        po_number, quotation_id, vendor_id, order_date, expected_delivery_date, 
        delivery_location, currency, tax_template, tax_amount, subtotal, 
        total_amount, notes, items 
    } = req.body;
    
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Check if PO Number already exists, if so generate a new one
        let finalPoNumber = po_number;
        const [existingPO] = await connection.query('SELECT id FROM purchase_orders WHERE po_number = ?', [po_number]);
        
        if (existingPO.length > 0) {
            const year = new Date().getFullYear();
            const [countRows] = await connection.query('SELECT COUNT(*) as count FROM purchase_orders');
            const nextNum = (countRows[0].count + 1).toString().padStart(4, '0');
            finalPoNumber = `PO-${year}-${nextNum}`;
        }

        const [result] = await connection.query(
            `INSERT INTO purchase_orders 
            (po_number, quotation_id, vendor_id, order_date, expected_delivery_date, delivery_location, currency, tax_template, tax_amount, subtotal, total_amount, notes, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                finalPoNumber, quotation_id || null, vendor_id, order_date, 
                expected_delivery_date || null, delivery_location || '', 
                currency || 'INR', tax_template || 'No Tax Template', 
                tax_amount || 0, subtotal || 0, total_amount || 0, 
                notes || '', 'draft'
            ]
        );

        const poId = result.insertId;

        if (items && items.length > 0) {
            const itemValues = items.map(item => [
                poId, item.material_name, item.material_code || '', item.item_group || '', 
                item.part_detail || '', item.material_grade || '', item.remark || '', 
                item.make || '', item.quantity || 0, item.uom || item.unit || 'Nos', 
                item.rate || 0, item.amount || 0
            ]);

            await connection.query(
                `INSERT INTO purchase_order_items 
                (purchase_order_id, material_name, material_code, item_group, part_detail, material_grade, remark, make, quantity, unit, rate, amount) 
                VALUES ?`,
                [itemValues]
            );
        }

        // If created from a quotation, update quotation status to 'accepted'
        if (quotation_id) {
            await connection.query('UPDATE quotations SET status = "accepted" WHERE id = ?', [quotation_id]);
        }

        await connection.commit();
        res.status(201).json({ message: 'Purchase Order created successfully', poId, po_number: finalPoNumber });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating purchase order:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        connection.release();
    }
};

const updatePurchaseOrder = async (req, res) => {
    const { id } = req.params;
    const { 
        quotation_id, vendor_id, order_date, expected_delivery_date, 
        delivery_location, currency, tax_template, tax_amount, 
        subtotal, total_amount, notes, items 
    } = req.body;
    
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        await connection.query(
            `UPDATE purchase_orders 
            SET quotation_id = ?, vendor_id = ?, order_date = ?, expected_delivery_date = ?, 
            delivery_location = ?, currency = ?, tax_template = ?, tax_amount = ?, 
            subtotal = ?, total_amount = ?, notes = ?
            WHERE id = ?`,
            [
                quotation_id || null, vendor_id, order_date, expected_delivery_date || null, 
                delivery_location || '', currency || 'INR', tax_template || 'No Tax Template', 
                tax_amount || 0, subtotal || 0, total_amount || 0, notes || '', id
            ]
        );

        // Delete old items and insert new ones
        await connection.query('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [id]);

        if (items && items.length > 0) {
            const itemValues = items.map(item => [
                id, item.material_name, item.material_code || '', item.item_group || '', 
                item.part_detail || '', item.material_grade || '', item.remark || '', 
                item.make || '', item.quantity || 0, item.uom || item.unit || 'Nos', 
                item.rate || 0, item.amount || 0
            ]);

            await connection.query(
                `INSERT INTO purchase_order_items 
                (purchase_order_id, material_name, material_code, item_group, part_detail, material_grade, remark, make, quantity, unit, rate, amount) 
                VALUES ?`,
                [itemValues]
            );
        }

        await connection.commit();
        res.json({ message: 'Purchase Order updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating purchase order:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        connection.release();
    }
};

const updatePurchaseOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE purchase_orders SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Purchase Order status updated successfully' });
    } catch (error) {
        console.error('Error updating purchase order status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deletePurchaseOrder = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM purchase_orders WHERE id = ?', [id]);
        res.json({ message: 'Purchase Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting purchase order:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getPurchaseOrderStats = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
                SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_count,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN status = 'fulfilled' THEN 1 ELSE 0 END) as fulfilled_count,
                SUM(total_amount) as total_value,
                (SELECT COUNT(*) FROM purchase_order_communications WHERE is_outgoing = FALSE AND is_read = FALSE) as unread_replies_count
            FROM purchase_orders
        `);
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching purchase order stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const sendPurchaseOrderEmail = async (req, res) => {
    const { id } = req.params;
    const { email, subject, message, pdfBase64 } = req.body;

    try {
        console.log(`Sending PO email to: ${email}`);
        
        const attachments = [];
        if (pdfBase64) {
            const base64Data = pdfBase64.split(',')[1] || pdfBase64;
            attachments.push({
                filename: `PurchaseOrder-${id}.pdf`,
                content: Buffer.from(base64Data, 'base64'),
                contentType: 'application/pdf'
            });
        }

        await sendEmail({
            to: email,
            subject: subject,
            text: message,
            attachments: attachments
        });

        // Record the communication
        await db.query(
            `INSERT INTO purchase_order_communications 
            (purchase_order_id, sender_id, message, subject, sender_email, is_outgoing, content_text) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id, 
                req.user?.id || null, 
                message, 
                subject, 
                process.env.EMAIL_FROM, 
                true, 
                message
            ]
        );

        res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('PO Email Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send email', 
            error: error.message 
        });
    }
};

const getCommunications = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                poc.*, 
                COALESCE(u.full_name, poc.sender_email) as sender_name,
                poc.created_at as received_at
            FROM purchase_order_communications poc
            LEFT JOIN users u ON poc.sender_id = u.id
            WHERE poc.purchase_order_id = ?
            ORDER BY poc.created_at DESC
        `;
        const [rows] = await db.query(query, [id]);
        
        // Fetch attachments for each communication
        for (let row of rows) {
            const [attachments] = await db.query(
                'SELECT id, file_name, file_size, mime_type FROM purchase_order_communication_attachments WHERE communication_id = ?',
                [row.id]
            );
            row.attachments = attachments;
        }
        
        // Mark all as read when viewed
        await db.query('UPDATE purchase_order_communications SET is_read = TRUE WHERE purchase_order_id = ? AND is_outgoing = FALSE', [id]);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching communications:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const downloadAttachment = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(
            'SELECT file_path, file_name, mime_type FROM purchase_order_communication_attachments WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Attachment not found' });
        }

        const attachment = rows[0];
        const filePath = path.join(__dirname, '..', attachment.file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        res.setHeader('Content-Type', attachment.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error downloading attachment:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const uploadInvoice = async (req, res) => {
    const { id } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const file of files) {
            await connection.query(
                `INSERT INTO purchase_order_attachments 
                (purchase_order_id, file_name, file_path, file_size, mime_type, uploaded_by) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [id, file.originalname, file.path, file.size, file.mimetype, req.user?.id || null]
            );
        }

        // Auto-approve PO after invoice upload
        await connection.query('UPDATE purchase_orders SET status = ? WHERE id = ?', ['approved', id]);

        await connection.commit();
        res.status(200).json({ message: 'Invoice uploaded and PO approved successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error uploading invoice files:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    getPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrder,
    updatePurchaseOrderStatus,
    deletePurchaseOrder,
    getPurchaseOrderStats,
    sendPurchaseOrderEmail,
    getCommunications,
    downloadAttachment,
    uploadInvoice
};
