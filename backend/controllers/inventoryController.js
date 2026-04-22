const db = require('../config/db');

// Helper to generate Stock Entry Number
const generateStockEntryNo = async (connection) => {
    const year = new Date().getFullYear();
    const [lastEntry] = await connection.query('SELECT entry_no FROM stock_entries ORDER BY id DESC LIMIT 1');
    let nextNum = '0001';
    if (lastEntry.length > 0 && lastEntry[0].entry_no.startsWith(`STE-${year}`)) {
        const lastNum = parseInt(lastEntry[0].entry_no.split('-').pop());
        nextNum = (lastNum + 1).toString().padStart(4, '0');
    }
    return `STE-${year}-${nextNum}`;
};

const createStockEntry = async (req, res) => {
    const { entry_type, entry_date, remarks, grn_id, project_name, vendor_name, items, status } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const entry_no = await generateStockEntryNo(connection);

        // 1. Insert Header
        const [entryResult] = await connection.query(
            `INSERT INTO stock_entries (entry_no, entry_type, entry_date, remarks, grn_id, project_name, vendor_name, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [entry_no, entry_type, entry_date, remarks || '', grn_id || null, project_name || null, vendor_name || null, status || 'submitted']
        );
        const stockEntryId = entryResult.insertId;

        // 2. Insert Items and Update Ledger
        if (items && items.length > 0) {
            for (const item of items) {
                // Insert Item
                await connection.query(
                    `INSERT INTO stock_entry_items (
                        stock_entry_id, material_id, item_code, item_name, quantity, uom, 
                        batch_no, valuation_rate, length, width, thickness, diameter, 
                        outer_diameter, height, unit_weight, total_weight, density,
                        item_group, web_thickness, flange_thickness, side_s, side_s1, side_s2, side1, side2
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        stockEntryId, 
                        item.material_id || null, 
                        item.item_code, 
                        item.item_name, 
                        item.quantity, 
                        item.uom || 'Nos', 
                        item.batch_no || null, 
                        item.valuation_rate || 0,
                        item.length || null,
                        item.width || null,
                        item.thickness || null,
                        item.diameter || null,
                        item.outer_diameter || null,
                        item.height || null,
                        item.unit_weight || 0,
                        item.total_weight || 0,
                        item.density || 0,
                        item.item_group || null,
                        item.web_thickness || item.tw || null,
                        item.flange_thickness || item.tf || null,
                        item.side_s || item.s || null,
                        item.side_s1 || item.s1 || null,
                        item.side_s2 || item.s2 || null,
                        item.side1 || item.s1 || null,
                        item.side2 || item.s2 || null
                    ]
                );

                // Update Ledger (IN or OUT based on entry type)
                const isReceipt = entry_type === 'Material Receipt' || entry_type === 'Stock Entry';
                const multiplier = isReceipt ? 1 : -1;

                const [lastBalance] = await connection.query(
                    'SELECT balance_qty FROM stock_ledger WHERE item_code = ? ORDER BY id DESC LIMIT 1',
                    [item.item_code]
                );
                const currentBalance = (lastBalance[0]?.balance_qty || 0);
                const newBalance = parseFloat(currentBalance) + (parseFloat(item.quantity) * multiplier);

                const ledgerSql = `INSERT INTO stock_ledger (
                    item_code, material_name, posting_date, posting_time, voucher_type, 
                    voucher_no, actual_qty, uom, balance_qty, project_name, vendor_name, 
                    valuation_rate, remarks, length, width, thickness, diameter, 
                    outer_diameter, height, unit_weight, total_weight, density,
                    item_group, web_thickness, flange_thickness, side_s, side_s1, side_s2, side1, side2
                ) VALUES (?, ?, ?, CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                const ledgerValues = [
                    item.item_code, 
                    item.item_name, 
                    entry_date, 
                    'Stock Entry', 
                    entry_no, 
                    item.quantity * multiplier, 
                    item.uom, 
                    newBalance, 
                    project_name || null, 
                    vendor_name || null, 
                    item.valuation_rate, 
                    remarks || `${entry_type} for ${item.item_code}`,
                    item.length || null,
                    item.width || null,
                    item.thickness || null,
                    item.diameter || null,
                    item.outer_diameter || null,
                    item.height || null,
                    item.unit_weight || 0,
                    item.total_weight ? (item.total_weight * multiplier) : 0,
                    item.density || 0,
                    item.item_group || null,
                    item.web_thickness || item.tw || null,
                    item.flange_thickness || item.tf || null,
                    item.side_s || item.s || null,
                    item.side_s1 || item.s1 || null,
                    item.side_s2 || item.s2 || null,
                    item.side1 || item.s1 || null,
                    item.side2 || item.s2 || null
                ];

                await connection.query(ledgerSql, ledgerValues);

                // Handle Serial Numbers for Material Issue
                if (entry_type === 'Material Issue') {
                    // Automatically mark serials as Used for this movement
                    // We pick the ones tied to the project, or any available if no project
                    let serialQuery = 'SELECT id FROM inventory_serials WHERE item_code LIKE ? AND item_name = ? AND status = "Available"';
                    let serialParams = [`${item.item_code}%`, item.item_name];

                    if (project_name) {
                        serialQuery += ` AND purchase_order_id IN (
                            SELECT po.id FROM purchase_orders po 
                            JOIN quotations q ON po.quotation_id = q.id 
                            JOIN root_cards rc ON q.root_card_id = rc.id 
                            WHERE rc.project_name = ?
                        )`;
                        serialParams.push(project_name);
                    }

                    serialQuery += ' ORDER BY created_at ASC LIMIT ?';
                    serialParams.push(parseInt(item.quantity));

                    const [availableSerials] = await connection.query(serialQuery, serialParams);

                    if (availableSerials.length > 0) {
                        const idsToUpdate = availableSerials.map(s => s.id);
                        await connection.query(
                            'UPDATE inventory_serials SET status = "Used", issued_in_entry_id = ? WHERE id IN (?)',
                            [stockEntryId, idsToUpdate]
                        );
                    }
                }
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Stock Entry created successfully', entry_no, id: stockEntryId });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating stock entry:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
        connection.release();
    }
};

const getStockMovements = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT * FROM stock_ledger 
            ORDER BY posting_date DESC, posting_time DESC, id DESC
        `);
        res.json({ success: true, movements: rows });
    } catch (error) {
        console.error('Error fetching stock movements:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getStockEntries = async (req, res) => {
    try {
        const { type } = req.query;
        let query = `
            SELECT se.* 
            FROM stock_entries se 
            WHERE 1=1
        `;
        const params = [];

        if (type) {
            query += " AND se.entry_type = ?";
            params.push(type);
        }

        query += " ORDER BY se.created_at DESC";
        
        const [rows] = await db.query(query, params);
        
        // Fetch items for each entry
        const entriesWithItems = [];
        for (let entry of rows) {
            const [items] = await db.query('SELECT * FROM stock_entry_items WHERE stock_entry_id = ?', [entry.id]);
            
            // For each item, fetch associated serial numbers
            const itemsWithSerials = [];
            for (let item of items) {
                let serials = [];
                if (entry.grn_id && entry.entry_type === 'Material Receipt') {
                    // Fetch by GRN for Material Receipt - Only Available ones
                    const [serialRows] = await db.query(
                        'SELECT serial_number, status, inspection_status, length, width, thickness, diameter, outer_diameter, height, unit_weight, total_weight, density, web_thickness, flange_thickness, side_s, side_s1, side_s2, side1, side2 FROM inventory_serials WHERE grn_id = ? AND item_code LIKE ? AND item_name = ? AND status = "Available"',
                        [entry.grn_id, `${item.item_code}%`, item.item_name]
                    );
                    serials = serialRows;
                } else if (entry.entry_type === 'Material Issue') {
                    // Fetch by Entry ID for Material Issue - These are the ones released
                    const [serialRows] = await db.query(
                        'SELECT serial_number, status, inspection_status, length, width, thickness, diameter, outer_diameter, height, unit_weight, total_weight, density, web_thickness, flange_thickness, side_s, side_s1, side_s2, side1, side2 FROM inventory_serials WHERE issued_in_entry_id = ? AND item_code LIKE ? AND item_name = ?',
                        [entry.id, `${item.item_code}%`, item.item_name]
                    );
                    serials = serialRows;
                }
                itemsWithSerials.push({ ...item, serials });
            }
            
            entriesWithItems.push({ ...entry, items: itemsWithSerials });
        }
        
        res.json({ success: true, movements: entriesWithItems });
    } catch (error) {
        console.error('Error fetching stock entries:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getWarehouses = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM warehouses ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching warehouses:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getStockBalance = async (req, res) => {
    try {
        const { onlyWithStock } = req.query;
        
        // Use a subquery to get the latest balance for each item+project combination
        let query = `
            SELECT l1.item_code, l1.material_name as itemName, 
                   SUM(l1.actual_qty) as total_stock, l1.uom as unit, 
                   MAX(l1.posting_date) as updatedAt,
                   l1.item_code as code,
                   l1.project_name,
                   l1.vendor_name,
                   MAX(l1.unit_weight) as unit_weight,
                   SUM(l1.total_weight) as total_weight,
                   MAX(l1.length) as length,
                   MAX(l1.width) as width,
                   MAX(l1.thickness) as thickness,
                   MAX(l1.diameter) as diameter,
                   MAX(l1.outer_diameter) as outer_diameter,
                   MAX(l1.height) as height,
                   MAX(l1.density) as density,
                   MAX(l1.item_group) as item_group,
                   MAX(l1.web_thickness) as web_thickness,
                   MAX(l1.flange_thickness) as flange_thickness,
                   MAX(l1.side_s) as side_s,
                   MAX(l1.side_s1) as side_s1,
                   MAX(l1.side_s2) as side_s2,
                   MD5(CONCAT(l1.item_code, l1.material_name, IFNULL(l1.project_name, ''), IFNULL(l1.vendor_name, ''))) as id
            FROM stock_ledger l1
            GROUP BY l1.item_code, l1.material_name, l1.uom, l1.project_name, l1.vendor_name
        `;
        
        if (onlyWithStock === 'true') {
            query = `SELECT * FROM (${query}) AS bal WHERE total_stock > 0`;
        }
        
        const [rows] = await db.query(query);

        // Fetch serials for each material
        const materialsWithSerials = await Promise.all(rows.map(async (material) => {
            let serialQuery = 'SELECT serial_number, status, item_code, item_name, inspection_status, length, width, thickness, diameter, outer_diameter, height, unit_weight, total_weight, density, web_thickness, flange_thickness, side_s, side_s1, side_s2, side1, side2 FROM inventory_serials WHERE item_code LIKE ? AND item_name = ? AND status IN ("Available", "Rejected")';
            let serialParams = [`${material.item_code}%`, material.itemName];

            if (material.project_name) {
                serialQuery += ` AND purchase_order_id IN (
                    SELECT po.id FROM purchase_orders po 
                    JOIN quotations q ON po.quotation_id = q.id 
                    JOIN root_cards rc ON q.root_card_id = rc.id 
                    WHERE rc.project_name = ?
                )`;
                serialParams.push(material.project_name);
            }

            const [serials] = await db.query(serialQuery, serialParams);
            return { ...material, serials };
        }));

        res.json({ success: true, materials: materialsWithSerials });
    } catch (error) {
        console.error('Error fetching stock balance:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getInventoryPortalData = async (req, res) => {
  try {
    // 1. Get stock stats
    const [statsResult] = await db.query(`
      SELECT 
        COUNT(DISTINCT item_code) as totalSKUs,
        SUM(actual_qty) as totalQuantity,
        SUM(actual_qty * valuation_rate) as totalValue
      FROM stock_ledger
    `);

    // 2. Get low stock items (using a mock threshold of 10 for now)
    const [lowStockResult] = await db.query(`
      SELECT item_code, material_name as name, SUM(actual_qty) as quantity
      FROM stock_ledger
      GROUP BY item_code, material_name
      HAVING quantity < 10 AND quantity > 0
    `);

    // 3. Format data for the dashboard
    const portalData = {
      stats: {
        totalSKUs: statsResult[0].totalSKUs || 0,
        totalQuantity: statsResult[0].totalQuantity || 0,
        totalValue: statsResult[0].totalValue || 0,
        lowStock: lowStockResult.length
      },
      stock: lowStockResult.map(item => ({
        id: item.item_code,
        name: item.name,
        quantity: item.quantity,
        status: 'low-stock',
        reorder_level: 10
      }))
    };

    res.json(portalData);
  } catch (error) {
    console.error('Error fetching inventory portal data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
    createStockEntry,
    getStockEntries,
    getStockMovements,
    getWarehouses,
    getStockBalance,
    getInventoryPortalData,
    generateStockEntryNo // Exported for use in other controllers
};
