const db = require('../config/db');
const { sendEmail } = require('../utils/emailService');
const fs = require('fs');
const path = require('path');

const getPurchaseOrders = async (req, res) => {
    try {
        const { search, status, root_card_id } = req.query;
        let query = `
            SELECT po.*, v.name as vendor_name, v.email as vendor_email, q.quotation_number,
            rc.id as root_card_id, rc.project_name as root_card_project_name,
            (SELECT COUNT(*) FROM purchase_order_communications WHERE purchase_order_id = po.id AND is_outgoing = FALSE AND is_read = FALSE) as unread_communication_count,
            (SELECT SUM(quantity) FROM purchase_order_items WHERE purchase_order_id = po.id) as total_qty,
            (SELECT SUM(received) FROM purchase_order_items WHERE purchase_order_id = po.id) as received_qty
            FROM purchase_orders po
            LEFT JOIN vendors v ON po.vendor_id = v.id
            LEFT JOIN quotations q ON po.quotation_id = q.id
            LEFT JOIN material_requests mr ON q.material_request_id = mr.id
            LEFT JOIN root_cards rc ON rc.id = COALESCE(q.root_card_id, mr.root_card_id)
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'all') {
            query += " AND po.status = ?";
            params.push(status);
        }
        if (root_card_id) {
            query += " AND (q.root_card_id = ? OR mr.root_card_id = ?)";
            params.push(root_card_id, root_card_id);
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
            SELECT po.*, v.name as vendor_name, v.email as vendor_email, q.quotation_number,
            rc.id as root_card_id, rc.project_name as root_card_project_name
            FROM purchase_orders po
            LEFT JOIN vendors v ON po.vendor_id = v.id
            LEFT JOIN quotations q ON po.quotation_id = q.id
            LEFT JOIN material_requests mr ON q.material_request_id = mr.id
            LEFT JOIN root_cards rc ON rc.id = COALESCE(q.root_card_id, mr.root_card_id)
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
        delivery_location, location_link, currency, tax_template, tax_amount, subtotal, 
        total_amount, notes, terms, items 
    } = req.body;
    
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Check if PO Number already exists, if so generate a new one
        let finalPoNumber = po_number;
        const [existingPO] = await connection.query('SELECT id FROM purchase_orders WHERE po_number = ?', [po_number]);
        
        if (existingPO.length > 0 || !po_number) {
            const year = new Date().getFullYear();
            const pattern = `PO-${year}-%`;
            const [lastPO] = await connection.query(
                'SELECT po_number FROM purchase_orders WHERE po_number LIKE ? ORDER BY po_number DESC LIMIT 1',
                [pattern]
            );

            let nextNum = 1;
            if (lastPO.length > 0) {
                const lastPoNumber = lastPO[0].po_number;
                const parts = lastPoNumber.split('-');
                if (parts.length >= 3) {
                    const lastNum = parseInt(parts[2]);
                    if (!isNaN(lastNum)) {
                        nextNum = lastNum + 1;
                    }
                }
            }
            finalPoNumber = `PO-${year}-${nextNum.toString().padStart(4, '0')}`;
        }

        const [result] = await connection.query(
            `INSERT INTO purchase_orders 
            (po_number, quotation_id, vendor_id, order_date, expected_delivery_date, delivery_location, location_link, currency, tax_template, tax_amount, subtotal, total_amount, notes, terms, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                finalPoNumber, quotation_id || null, vendor_id, order_date, 
                expected_delivery_date || null, delivery_location || '', 
                location_link || '',
                currency || 'INR', tax_template || 'No Tax Template', 
                tax_amount || 0, subtotal || 0, total_amount || 0, 
                notes || '', terms || '', 'draft'
            ]
        );

        const poId = result.insertId;

        if (items && items.length > 0) {
            const itemValues = items.map(item => {
                const finalRate = item.rate_per_kg || item.unit_price || item.rate || 0;
                const finalQty = item.quantity || 0;
                const finalUom = item.uom || item.unit || 'Nos';
                
                return [
                    poId, 
                    item.material_name || item.item_name || '', 
                    item.vendor_material_name || item.vendor_item_name || '',
                    item.item_group || '', 
                    item.part_detail || '', 
                    item.material_grade || '', 
                    item.remark || '', 
                    item.make || '', 
                    finalQty, 
                    finalUom, 
                    item.rate_per_kg || 0,
                    item.total_weight || 0,
                    finalRate, 
                    item.amount || (item.total_weight * (item.rate_per_kg || 0)) || (finalQty * finalRate)
                ];
            });

            await connection.query(
                `INSERT INTO purchase_order_items 
                (purchase_order_id, material_name, vendor_material_name, item_group, part_detail, material_grade, remark, make, quantity, unit, rate_per_kg, total_weight, rate, amount) 
                VALUES ?`,
                [itemValues]
            );
        }

        // If created from a quotation, update quotation status to 'approved'
        if (quotation_id) {
            await connection.query('UPDATE quotations SET status = "approved" WHERE id = ?', [quotation_id]);
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
        delivery_location, location_link, currency, tax_template, tax_amount, 
        subtotal, total_amount, notes, terms, items 
    } = req.body;
    
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        await connection.query(
            `UPDATE purchase_orders 
            SET quotation_id = ?, vendor_id = ?, order_date = ?, expected_delivery_date = ?, 
            delivery_location = ?, location_link = ?, currency = ?, tax_template = ?, tax_amount = ?, 
            subtotal = ?, total_amount = ?, notes = ?, terms = ?
            WHERE id = ?`,
            [
                quotation_id || null, vendor_id, order_date, expected_delivery_date || null, 
                delivery_location || '', location_link || '', currency || 'INR', tax_template || 'No Tax Template', 
                tax_amount || 0, subtotal || 0, total_amount || 0, notes || '', terms || '', id
            ]
        );

        // Delete old items and insert new ones
        await connection.query('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [id]);

        if (items && items.length > 0) {
            const itemValues = items.map(item => [
                id, 
                item.material_name || item.item_name || '', 
                item.vendor_material_name || item.vendor_item_name || '',
                item.item_group || '', 
                item.part_detail || '', 
                item.material_grade || '', 
                item.remark || '', 
                item.make || '', 
                item.quantity || 0, 
                item.uom || item.unit || 'Nos', 
                item.rate_per_kg || 0,
                item.total_weight || 0,
                item.rate || 0, 
                item.amount || 0
            ]);

            await connection.query(
                `INSERT INTO purchase_order_items 
                (purchase_order_id, material_name, vendor_material_name, item_group, part_detail, material_grade, remark, make, quantity, unit, rate_per_kg, total_weight, rate, amount) 
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
    const { status, inventory_status } = req.body;
    try {
        if (status && inventory_status) {
            await db.query('UPDATE purchase_orders SET status = ?, inventory_status = ? WHERE id = ?', [status, inventory_status, id]);
        } else if (status) {
            await db.query('UPDATE purchase_orders SET status = ? WHERE id = ?', [status, id]);
        } else if (inventory_status) {
            await db.query('UPDATE purchase_orders SET inventory_status = ? WHERE id = ?', [inventory_status, id]);
        }

        // If PO is sent to inventory, update root card status
        if (status === 'sent to inventory') {
            const [rows] = await db.query(`
                SELECT po.po_number, COALESCE(q.root_card_id, mr.root_card_id) as root_card_id
                FROM purchase_orders po
                LEFT JOIN quotations q ON po.quotation_id = q.id
                LEFT JOIN material_requests mr ON q.material_request_id = mr.id
                WHERE po.id = ?
            `, [id]);

            if (rows.length > 0 && rows[0].root_card_id) {
                await db.query('UPDATE root_cards SET status = "PURCHASE_ORDER_RELEASED" WHERE id = ?', [rows[0].root_card_id]);
            }
        }

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

const createPurchaseReceipt = async (req, res) => {
    const { purchase_order_id, vendor_id, posting_date, notes, items } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 0. Duplicate Check (prevent rapid double submits)
        const [recentGRN] = await connection.query(
            'SELECT id FROM grns WHERE purchase_order_id = ? AND vendor_id = ? AND created_at > NOW() - INTERVAL 10 SECOND',
            [purchase_order_id, vendor_id]
        );

        if (recentGRN.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'A GRN was already created for this PO a few seconds ago.' });
        }

        // 1. Generate GRN Number (GRN-YYYY-XXXX)
        const year = new Date().getFullYear();
        const [lastGRN] = await connection.query('SELECT grn_number FROM grns ORDER BY id DESC LIMIT 1');
        let nextNum = '0001';
        if (lastGRN.length > 0) {
            const lastNum = parseInt(lastGRN[0].grn_number.split('-').pop());
            nextNum = (lastNum + 1).toString().padStart(4, '0');
        }
        const grn_number = `GRN-${year}-${nextNum}`;

        // 2. Insert GRN Header
        const [grnResult] = await connection.query(
            `INSERT INTO grns (grn_number, purchase_order_id, vendor_id, posting_date, notes, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [grn_number, purchase_order_id, vendor_id, posting_date, notes || '', 'awaiting_storage']
        );
        const grnId = grnResult.insertId;

        // 3. Process items and generate ST numbers
        for (const item of items) {
            const { po_item_id, material_name, received_qty, unit, generate_st } = item;
            
            if (parseFloat(received_qty) <= 0) continue;

            // Internal helper to generate item code if missing
            const generateItemCode = (name) => {
                const upperName = (name || "").toUpperCase().trim();
                let typeCode = "GEN";
                if (upperName.includes("PLATE")) typeCode = "PLT";
                else if (upperName.includes("ROUND BAR") || upperName.includes("RB") || upperName.includes("Ø") || upperName.includes("DIA")) typeCode = "RB";
                else if (upperName.includes("PIPE")) typeCode = "PIPE";
                else if (upperName.includes("PAINT")) typeCode = "PNT";
                else if (upperName.includes("THINNER")) typeCode = "THN";
                else if (upperName.includes("WELDING") || upperName.includes("ELECTRODE")) typeCode = "WLD";

                // Try 3-dimension pattern (e.g. 12000X1500X25)
                let sizeMatch = upperName.match(/(\d+)\s*[X]\s*(\d+)\s*[X]\s*(\d+)/);
                let shortSize = "";
                
                if (sizeMatch) {
                    const dims = [sizeMatch[1], sizeMatch[2], sizeMatch[3]].map(d => {
                        const val = parseInt(d);
                        return (val >= 100 && val % 100 === 0) ? (val / 100).toString() : val.toString();
                    });
                    shortSize = dims.join("x");
                } else {
                    // Try 2-dimension pattern (e.g. Ø80 X 3000)
                    sizeMatch = upperName.match(/(?:Ø|DIA|RB|ROUND BAR)?\s*(\d+)\s*[X]\s*(\d+)/);
                    if (sizeMatch) {
                        const dims = [sizeMatch[1], sizeMatch[2]].map(d => {
                            const val = parseInt(d);
                            return (val >= 100 && val % 100 === 0) ? (val / 100).toString() : val.toString();
                        });
                        shortSize = dims.join("x");
                    }
                }

                if (!shortSize) {
                    // If no dimensions, create a slug from the name (first 2-3 words/parts)
                    shortSize = upperName
                        .replace(/[^A-Z0-9\s]/g, '')
                        .split(/\s+/)
                        .filter(word => word.length > 1)
                        .slice(0, 2)
                        .join("");
                    
                    if (!shortSize) shortSize = "ITEM";
                }

                return `${typeCode}-${shortSize}`;
            };

            const finalItemCode = item.item_code || generateItemCode(material_name);

            // Insert GRN item
            await connection.query(
                `INSERT INTO grn_items (grn_id, po_item_id, item_code, material_name, ordered_qty, received_qty, received_weight, rate_per_kg, unit) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [grnId, po_item_id, finalItemCode, material_name, item.ordered_qty || 0, received_qty, item.received_weight || 0, item.rate_per_kg || 0, unit]
            );

            // Generate ST numbers if requested
            if (generate_st) {
                const itemCode = finalItemCode;

                const stPrefix = `ST-${itemCode}`;

                // 3. Get next sequence for this item pattern
                const [seqResult] = await connection.query(
                    `SELECT MAX(CAST(SUBSTRING_INDEX(serial_number, '-', -1) AS UNSIGNED)) as max_seq 
                     FROM inventory_serials WHERE serial_number LIKE ?`,
                    [`${stPrefix}-%`]
                );

                let startSeq = (seqResult[0].max_seq || 0) + 1;

                // 4. Generate ST Numbers (one per unit for 'Nos', one per batch for others)
                const isNos = (unit || '').trim().toLowerCase() === 'nos';
                const loopCount = isNos ? Math.floor(parseFloat(received_qty)) : 1;

                for (let i = 0; i < loopCount; i++) {
                    let itemCodePerPiece = itemCode;
                    let serial_number = '';
                    
                    if (isNos) {
                        const sequenceStr = (startSeq + i).toString().padStart(3, '0');
                        itemCodePerPiece = `${itemCode}-${sequenceStr}`;
                        serial_number = `ST-${itemCodePerPiece}`;
                    } else {
                        // For non-Nos, we create one ST number for the entire batch.
                        // To ensure uniqueness across different GRNs and different items in same GRN,
                        // we use both the GRN suffix and the PO Item ID.
                        const grnSuffix = grn_number.split('-').pop(); // e.g. 0001
                        serial_number = `ST-${itemCode}-${grnSuffix}-${po_item_id}`;
                    }
                    
                    await connection.query(
                        `INSERT INTO inventory_serials (serial_number, item_code, purchase_order_id, item_id, item_name, grn_id, status) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [serial_number, itemCodePerPiece, purchase_order_id, po_item_id, material_name, grnId, 'Pending']
                    );
                }
            }

            // Update received quantity in purchase_order_items
            await connection.query(
                `UPDATE purchase_order_items SET received = COALESCE(received, 0) + ? WHERE id = ?`,
                [received_qty, po_item_id]
            );
        }

        // 4. Update PO status based on total fulfillment
        const [poItems] = await connection.query(
            'SELECT SUM(quantity) as total_qty, SUM(received) as total_received FROM purchase_order_items WHERE purchase_order_id = ?',
            [purchase_order_id]
        );
        
        const { total_qty, total_received } = poItems[0];
        let inventoryStatus = 'partially received';
        if (parseFloat(total_received) >= parseFloat(total_qty)) {
            inventoryStatus = 'fulfilled';
        }

        await connection.query('UPDATE purchase_orders SET inventory_status = ? WHERE id = ?', [inventoryStatus, purchase_order_id]);

        await connection.commit();
        res.status(201).json({ 
            message: 'GRN created successfully', 
            grn_number,
            grn_id: grnId 
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating GRN:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        connection.release();
    }
};

const getPurchaseReceipts = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT g.*, v.name as vendor_name, po.po_number
            FROM grns g
            LEFT JOIN vendors v ON g.vendor_id = v.id
            LEFT JOIN purchase_orders po ON g.purchase_order_id = po.id
            ORDER BY g.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching GRNs:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getPurchaseReceiptById = async (req, res) => {
    const { id } = req.params;
    try {
        const [grnRows] = await db.query(`
            SELECT g.*, v.name as vendor_name, po.po_number,
            rc.id as root_card_id, rc.project_name as root_card_project_name
            FROM grns g
            LEFT JOIN vendors v ON g.vendor_id = v.id
            LEFT JOIN purchase_orders po ON g.purchase_order_id = po.id
            LEFT JOIN quotations q ON po.quotation_id = q.id
            LEFT JOIN root_cards rc ON q.root_card_id = rc.id
            WHERE g.id = ?
        `, [id]);

        if (grnRows.length === 0) {
            return res.status(404).json({ message: 'GRN not found' });
        }

        const grn = grnRows[0];

        const [items] = await db.query(`
            SELECT gri.*, poi.item_group
            FROM grn_items gri
            LEFT JOIN purchase_order_items poi ON gri.po_item_id = poi.id
            WHERE gri.grn_id = ?
        `, [id]);

        const [serials] = await db.query(`
            SELECT * FROM inventory_serials WHERE grn_id = ?
        `, [id]);

        // Group serials by po_item_id
        const itemsWithSerials = items.map(item => ({
            ...item,
            quantity: item.ordered_qty, // compatibility
            received: item.received_qty, // compatibility
            material_code: item.material_name, // fallback
            serials: serials.filter(s => s.item_id === item.po_item_id).map(s => ({
                ...s,
                item_code: s.item_code // Explicitly include stored item_code
            }))
        }));

        // Wrap data for frontend compatibility
        res.json({
            grn: {
                id: grn.id,
                grn_number: grn.grn_number,
                status: grn.status,
                receivedDate: grn.posting_date,
                receivedQuantity: items.reduce((sum, item) => sum + parseFloat(item.received_qty || 0), 0),
                poNumber: grn.po_number,
                vendor: grn.vendor_name,
                qcStatus: grn.status || 'pending',
                root_card_id: grn.root_card_id,
                project_name: grn.root_card_project_name
            },
            items: itemsWithSerials
        });
    } catch (error) {
        console.error('Error fetching GRN details:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
const getInventorySerials = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT s.*, po.po_number, g.grn_number, g.created_at as grn_date
            FROM inventory_serials s
            LEFT JOIN purchase_orders po ON s.purchase_order_id = po.id
            LEFT JOIN grns g ON s.grn_id = g.id
            ORDER BY s.id DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching inventory serials:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addGRNToStock = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Get GRN details with project and vendor names
        const [grnRows] = await connection.query(`
            SELECT g.*, v.name as vendor_name, rc.project_name
            FROM grns g
            LEFT JOIN vendors v ON g.vendor_id = v.id
            LEFT JOIN purchase_orders po ON g.purchase_order_id = po.id
            LEFT JOIN quotations q ON po.quotation_id = q.id
            LEFT JOIN root_cards rc ON q.root_card_id = rc.id
            WHERE g.id = ?
        `, [id]);
        if (grnRows.length === 0) throw new Error('GRN not found');
        const grn = grnRows[0];

        // 2. Get GRN items
        const [items] = await connection.query('SELECT * FROM grn_items WHERE grn_id = ?', [id]);

        // 3. Generate Stock Entry Number (STE-YYYY-XXXX)
        const year = new Date().getFullYear();
        const [lastEntry] = await connection.query('SELECT entry_no FROM stock_entries ORDER BY id DESC LIMIT 1');
        let nextNum = '0001';
        if (lastEntry.length > 0 && lastEntry[0].entry_no.startsWith(`STE-${year}`)) {
            const lastNum = parseInt(lastEntry[0].entry_no.split('-').pop());
            nextNum = (lastNum + 1).toString().padStart(4, '0');
        }
        const entry_no = `STE-${year}-${nextNum}`;

        // 4. Create Stock Entry Header
        const [entryResult] = await connection.query(
            `INSERT INTO stock_entries (entry_no, entry_type, entry_date, remarks, grn_id, project_name, vendor_name, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [entry_no, 'Material Receipt', new Date().toISOString().split('T')[0], `Receipt against ${grn.grn_number}`, id, grn.project_name || null, grn.vendor_name || null, 'submitted']
        );
        const stockEntryId = entryResult.insertId;

        // 5. Update serials status and record ledger movements
        const [serials] = await connection.query(
            'SELECT serial_number FROM inventory_serials WHERE grn_id = ?',
            [id]
        );

        if (serials.length > 0) {
            const serialNumbers = serials.map(s => s.serial_number);
            await connection.query(
                'UPDATE inventory_serials SET status = "Available" WHERE serial_number IN (?)',
                [serialNumbers]
            );
        }

        // 6. Process items for Stock Entry Items and Ledger
        for (const item of items) {
            // Insert Stock Entry Item
            await connection.query(
                `INSERT INTO stock_entry_items (stock_entry_id, item_code, item_name, quantity, uom, valuation_rate) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [stockEntryId, item.item_code, item.material_name, item.received_qty, item.unit || 'Nos', item.rate_per_kg || 0]
            );

            // Record Movement in Ledger (IN)
            const [lastBalance] = await connection.query(
                'SELECT balance_qty FROM stock_ledger WHERE item_code = ? ORDER BY id DESC LIMIT 1',
                [item.item_code]
            );
            const currentBalance = (lastBalance[0]?.balance_qty || 0);
            const newBalance = parseFloat(currentBalance) + parseFloat(item.received_qty);

            const ledgerSql = `INSERT INTO stock_ledger (item_code, material_name, posting_date, posting_time, voucher_type, voucher_no, actual_qty, uom, balance_qty, project_name, vendor_name, valuation_rate, remarks) 
                 VALUES (?, ?, ?, CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            const ledgerValues = [
                item.item_code, 
                item.material_name, 
                new Date().toISOString().split('T')[0], 
                'Stock Entry', 
                entry_no, 
                item.received_qty, 
                item.unit || 'Nos', 
                newBalance, 
                grn.project_name || null, 
                grn.vendor_name || null, 
                item.rate_per_kg || 0, 
                `Receipt against ${grn.grn_number}`
            ];

            await connection.query(ledgerSql, ledgerValues);
        }

        // 7. Update GRN status to 'pending' (Ready for QC)
        await connection.query(
            'UPDATE grns SET status = "pending" WHERE id = ?',
            [id]
        );

        await connection.commit();
        res.json({ message: 'Material added to stock and stock entry created successfully', entry_no });
    } catch (error) {
        await connection.rollback();
        console.error('Error adding GRN to stock:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        connection.release();
    }
};

const approveGRN = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE grns SET status = "approved" WHERE id = ?', [id]);
        res.json({ message: 'GRN approved successfully' });
    } catch (error) {
        console.error('Error approving GRN:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const releaseGRNMaterial = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Get GRN details
        const [grnRows] = await connection.query(`
            SELECT g.*, v.name as vendor_name, rc.project_name, rc.id as root_card_id, po.po_number,
                   mr.bom_id as original_bom_id, mr.bom_number as original_bom_number,
                   (SELECT id FROM boms WHERE root_card_id = rc.id AND is_active = 1 ORDER BY id DESC LIMIT 1) as active_bom_id,
                   (SELECT bom_number FROM boms WHERE root_card_id = rc.id AND is_active = 1 ORDER BY id DESC LIMIT 1) as active_bom_number
            FROM grns g
            LEFT JOIN vendors v ON g.vendor_id = v.id
            LEFT JOIN purchase_orders po ON g.purchase_order_id = po.id
            LEFT JOIN quotations q ON po.quotation_id = q.id
            LEFT JOIN material_requests mr ON q.material_request_id = mr.id
            LEFT JOIN root_cards rc ON q.root_card_id = rc.id
            WHERE g.id = ?
        `, [id]);

        if (grnRows.length === 0) throw new Error('GRN not found');
        const grn = grnRows[0];

        if (grn.status !== 'qc_completed') {
            throw new Error('GRN must be in "QC COMPLETED" status to release material');
        }

        // 2. Get GRN items and their inspection results
        const [items] = await connection.query(`
            SELECT gri.*, poi.item_group, poi.quantity as ordered_qty_in_po
            FROM grn_items gri
            LEFT JOIN purchase_order_items poi ON gri.po_item_id = poi.id
            WHERE gri.grn_id = ?
        `, [id]);

        // 3. Get Serial Numbers and their inspection status
        const [serials] = await connection.query(
            'SELECT * FROM inventory_serials WHERE grn_id = ?',
            [id]
        );

        // 4. Calculate Accepted and Rejected quantities per item
        const itemStats = items.map(item => {
            const itemSerials = serials.filter(s => s.item_id === item.po_item_id);
            const isNos = (item.unit || '').toLowerCase() === 'nos';
            
            let acceptedQty = 0;
            let rejectedQty = 0;

            if (isNos) {
                acceptedQty = itemSerials.filter(s => s.inspection_status === 'Accepted').length;
                rejectedQty = itemSerials.filter(s => s.inspection_status === 'Rejected').length;
            } else {
                // For non-Nos, it's usually all or nothing per serial (and there's only 1 serial)
                const hasAccepted = itemSerials.some(s => s.inspection_status === 'Accepted');
                const hasRejected = itemSerials.some(s => s.inspection_status === 'Rejected');
                
                if (hasAccepted) acceptedQty = parseFloat(item.received_qty);
                else if (hasRejected) rejectedQty = parseFloat(item.received_qty);
            }
            
            return {
                ...item,
                accepted_qty: acceptedQty,
                rejected_qty: rejectedQty,
                // Total quantity to re-order is original ordered minus what was accepted
                shortage_to_order: Math.max(0, parseFloat(item.ordered_qty || 0) - acceptedQty)
            };
        });

        // 5. Generate Stock Entry for Material Issue (Release for Production)
        const year = new Date().getFullYear();
        const [lastEntry] = await connection.query('SELECT entry_no FROM stock_entries ORDER BY id DESC LIMIT 1');
        let nextNum = '0001';
        if (lastEntry.length > 0 && lastEntry[0].entry_no.startsWith(`STE-${year}`)) {
            const lastNum = parseInt(lastEntry[0].entry_no.split('-').pop());
            nextNum = (lastNum + 1).toString().padStart(4, '0');
        }
        const entry_no = `STE-${year}-${nextNum}`;

        const [entryResult] = await connection.query(
            `INSERT INTO stock_entries (entry_no, entry_type, entry_date, remarks, grn_id, project_name, vendor_name, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [entry_no, 'Material Issue', new Date().toISOString().split('T')[0], `Released for Production from ${grn.grn_number}`, id, grn.project_name || null, grn.vendor_name || null, 'submitted']
        );
        const stockEntryId = entryResult.insertId;

        // 6. Process items for Stock Entry and Ledger
        let totalShortageCount = 0;
        const shortageItems = [];

        for (const item of itemStats) {
            // ONLY deduct and issue the accepted quantity
            if (item.accepted_qty > 0) {
                // Insert Stock Entry Item
                await connection.query(
                    `INSERT INTO stock_entry_items (stock_entry_id, item_code, item_name, quantity, uom, valuation_rate) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [stockEntryId, item.item_code, item.material_name, item.accepted_qty, item.unit || 'Nos', item.rate_per_kg || 0]
                );

                // Update Ledger (OUT)
                const [lastBalance] = await connection.query(
                    'SELECT balance_qty FROM stock_ledger WHERE item_code = ? ORDER BY id DESC LIMIT 1',
                    [item.item_code]
                );
                const currentBalance = (lastBalance[0]?.balance_qty || 0);
                const newBalance = parseFloat(currentBalance) - parseFloat(item.accepted_qty);

                await connection.query(
                    `INSERT INTO stock_ledger (item_code, material_name, posting_date, posting_time, voucher_type, voucher_no, actual_qty, uom, balance_qty, project_name, vendor_name, valuation_rate, remarks) 
                     VALUES (?, ?, ?, CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [item.item_code, item.material_name, new Date().toISOString().split('T')[0], 'Stock Entry', entry_no, -item.accepted_qty, item.unit || 'Nos', newBalance, grn.project_name || null, grn.vendor_name || null, item.rate_per_kg || 0, `Released for Production from ${grn.grn_number}`]
                );

                // Update serials to 'Used'
                await connection.query(
                    'UPDATE inventory_serials SET status = "Used", issued_in_entry_id = ? WHERE grn_id = ? AND item_id = ? AND inspection_status = "Accepted"',
                    [stockEntryId, id, item.po_item_id]
                );
            }

            if (item.shortage_to_order > 0) {
                totalShortageCount += item.shortage_to_order;
                shortageItems.push({
                    itemName: item.material_name,
                    itemGroup: item.item_group,
                    quantity: item.shortage_to_order,
                    uom: item.unit,
                    remark: `Shortage/Rejection against original order from GRN ${grn.grn_number}`
                });
            }
        }

        // 7. Determine Final Status
        const finalStatus = totalShortageCount > 0 ? 'partially_released' : 'material_released';
        await connection.query('UPDATE grns SET status = ? WHERE id = ?', [finalStatus, id]);

        // Update Root Card status
        if (grn.root_card_id) {
            const rcStatus = finalStatus === 'partially_released' ? 'PARTIALLY_RELEASED' : 'MATERIAL_RELEASED';
            await connection.query('UPDATE root_cards SET status = ? WHERE id = ?', [rcStatus, grn.root_card_id]);
        }

        // 8. If Shortage, create Material Request for Procurement
        if (shortageItems.length > 0) {
            const pattern = `MR-SHORT-${year}-%`;
            const [lastMR] = await connection.query(
                'SELECT request_number FROM material_requests WHERE request_number LIKE ? ORDER BY request_number DESC LIMIT 1',
                [pattern]
            );

            let nextNum = 1;
            if (lastMR.length > 0) {
                const lastRequestNumber = lastMR[0].request_number;
                const parts = lastRequestNumber.split('-');
                if (parts.length >= 4) {
                    const lastNum = parseInt(parts[3]);
                    if (!isNaN(lastNum)) {
                        nextNum = lastNum + 1;
                    }
                }
            }
            const requestNumber = `MR-SHORT-${year}-${nextNum.toString().padStart(4, '0')}`;

            const bomId = grn.active_bom_id || grn.original_bom_id || null;
            const bomNumber = grn.active_bom_number || grn.original_bom_number || grn.grn_number;

            const [mrResult] = await connection.query(
                `INSERT INTO material_requests 
                (bom_id, request_number, status, department, project_id, root_card_id, created_by, remarks, project_name, type, bom_number) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [bomId, requestNumber, 'pending', 'Procurement', grn.project_id || null, grn.root_card_id || null, req.user?.id || null, `Shortage from GRN ${grn.grn_number} (PO: ${grn.po_number})`, grn.project_name, 'shortage', bomNumber]
            );

            const mrId = mrResult.insertId;

            const mrItemValues = shortageItems.map(si => [
                mrId, si.itemName, si.itemGroup, si.quantity, si.uom, si.remark
            ]);

            await connection.query(
                `INSERT INTO material_request_items (material_request_id, item_name, item_group, required_quantity, uom, remark) 
                 VALUES ?`,
                [mrItemValues]
            );

            // Notify Procurement
            await connection.query(
                `INSERT INTO notifications (department, title, message, type, link) 
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    'Procurement', 
                    'Material Shortage from GRN', 
                    `New shortage request ${requestNumber} for project ${grn.project_name || 'N/A'} created from GRN ${grn.grn_number}.`, 
                    'warning',
                    '/department/procurement/material-requests'
                ]
            );
        }

        // 9. Notify Production about Material Release
        const releaseType = finalStatus === 'partially_released' ? 'Partially Released' : 'Fully Released';
        await connection.query(
            `INSERT INTO notifications (department, title, message, type, link) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                'Production', 
                'Material Released for Production', 
                `Material for project ${grn.project_name || 'N/A'} has been ${releaseType} to Production against GRN ${grn.grn_number}.`, 
                'success',
                '/department/production/released-materials'
            ]
        );

        await connection.commit();
        res.json({ message: 'Material released successfully', status: finalStatus });

    } catch (error) {
        await connection.rollback();
        console.error('Error releasing material:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
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
    uploadInvoice,
    createPurchaseReceipt,
    getPurchaseReceipts,
    getPurchaseReceiptById,
    getInventorySerials,
    addGRNToStock,
    approveGRN,
    releaseGRNMaterial
};
