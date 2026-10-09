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
                        item_group, web_thickness, flange_thickness, side_s, side_s1, side_s2, side1, side2,
                        items_per_packet, vendor_items_per_packet
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                        item.side2 || item.s2 || null,
                        item.items_per_packet || 1,
                        item.vendor_items_per_packet || item.items_per_packet || 1
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
                    item_group, web_thickness, flange_thickness, side_s, side_s1, side_s2, side1, side2,
                    items_per_packet, vendor_items_per_packet
                ) VALUES (?, ?, ?, CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
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
                    item.side2 || item.s2 || null,
                    item.items_per_packet || 1,
                    item.vendor_items_per_packet || item.items_per_packet || 1
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
                        'SELECT serial_number, status, inspection_status, length, width, thickness, diameter, outer_diameter, height, unit_weight, total_weight, density, web_thickness, flange_thickness, side_s, side_s1, side_s2, side1, side2, items_per_packet, vendor_items_per_packet FROM inventory_serials WHERE grn_id = ? AND item_code LIKE ? AND item_name = ? AND status = "Available"',
                        [entry.grn_id, `${item.item_code}%`, item.item_name]
                    );
                    serials = serialRows;
                } else if (entry.entry_type === 'Material Issue') {
                    // Fetch by Entry ID for Material Issue - These are the ones released
                    const [serialRows] = await db.query(
                        'SELECT serial_number, status, inspection_status, length, width, thickness, diameter, outer_diameter, height, unit_weight, total_weight, density, web_thickness, flange_thickness, side_s, side_s1, side_s2, side1, side2, items_per_packet, vendor_items_per_packet FROM inventory_serials WHERE issued_in_entry_id = ? AND item_code LIKE ? AND item_name = ?',
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
                   MAX(l1.items_per_packet) as items_per_packet,
                   MAX(l1.vendor_items_per_packet) as vendor_items_per_packet,
                   MD5(CONCAT(l1.item_code, l1.material_name, IFNULL(l1.project_name, ''), IFNULL(l1.vendor_name, ''))) as id
            FROM stock_ledger l1
            GROUP BY l1.item_code, l1.material_name, l1.uom, l1.project_name, l1.vendor_name
            ORDER BY updatedAt DESC
        `;
        
        if (onlyWithStock === 'true') {
            query = `SELECT * FROM (${query}) AS bal WHERE total_stock > 0`;
        }
        
        const [rows] = await db.query(query);

        // Fetch serials for each material
        const materialsWithSerials = await Promise.all(rows.map(async (material) => {
            let serialQuery = 'SELECT serial_number, status, item_code, item_name, inspection_status, length, width, thickness, diameter, outer_diameter, height, unit_weight, total_weight, density, web_thickness, flange_thickness, side_s, side_s1, side_s2, side1, side2, items_per_packet, vendor_items_per_packet FROM inventory_serials WHERE item_code LIKE ? AND item_name = ? AND status IN ("Available", "Rejected")';
            let serialParams = [`${material.item_code}%`, material.itemName];

            if (material.project_name) {
                serialQuery += ` AND (purchase_order_id IN (
                    SELECT po.id FROM purchase_orders po 
                    JOIN quotations q ON po.quotation_id = q.id 
                    JOIN root_cards rc ON q.root_card_id = rc.id 
                    WHERE rc.project_name = ?
                ) OR purchase_order_id IS NULL)`;
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

const generateAutoItemCode = (item) => {
    if (item.item_code && item.item_code.trim()) {
        return item.item_code.trim();
    }
    const group = (item.item_group || item.itemGroup || "").toLowerCase();
    const l = parseFloat(item.length) || 0;
    const w = parseFloat(item.width) || 0;
    const t = parseFloat(item.thickness) || 0;
    const d = parseFloat(item.diameter) || 0;
    const od = parseFloat(item.outer_diameter || item.outerDiameter) || 0;
    const h = parseFloat(item.height) || 0;
    const s1 = parseFloat(item.side1 || item.side_s || item.side_s1) || 0;
    const s2 = parseFloat(item.side2 || item.side_s2) || 0;

    let code = "GEN";
    let dims = "";

    const wt = parseFloat(item.web_thickness || item.webThickness) || 0;
    const ft = parseFloat(item.flange_thickness || item.flangeThickness) || 0;

    if (group.includes("plate") || group.includes("sheet")) {
        code = "PLT";
        const shortL = l >= 100 && l % 100 === 0 ? (l / 100) : l;
        const shortW = w >= 100 && w % 100 === 0 ? (w / 100) : w;
        dims = `${shortL}x${shortW}x${t}`;
    } else if (group.includes("round bar")) {
        code = "RB";
        const shortL = l >= 100 && l % 100 === 0 ? (l / 100) : l;
        dims = `${d}x${shortL}`;
    } else if (group.includes("pipe")) {
        code = "PIPE";
        dims = `${od}x${t}`;
    } else if (group.includes("square bar")) {
        code = "SQB";
        const shortL = l >= 100 && l % 100 === 0 ? (l / 100) : l;
        dims = `${s1}x${s1}x${shortL}`;
    } else if (group.includes("rectangular bar")) {
        code = "RGB";
        const shortL = l >= 100 && l % 100 === 0 ? (l / 100) : l;
        dims = `${w}x${t}x${shortL}`;
    } else if (group.includes("square tube")) {
        code = "SQT";
        dims = `${s1}x${s1}x${t}`;
    } else if (group.includes("rectangular tube")) {
        code = "RGT";
        dims = `${w}x${h}x${t}`;
    } else if (group.includes("angle")) {
        code = "ANG";
        dims = `${s1}x${s2 || s1}x${t}`;
    } else if (group.includes("c channel")) {
        code = "CHN";
        const chnT = t || wt || ft;
        dims = chnT ? `${w}x${h}x${chnT}` : `${w}x${h}`;
    } else if (group.includes("beam")) {
        code = "BM";
        dims = `${h}x${w}`;
    } else if (group.includes("block")) {
        code = "BLK";
        dims = `${l}x${w}x${h}`;
    } else if (group.includes("paint")) {
        code = "PNT";
    } else if (group.includes("bought out")) {
        code = "BO";
    }

    if (!dims) {
        const cleanName = (item.item_name || item.itemName || "").toUpperCase().replace(/[^A-Z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 1).slice(0, 2).join("");
        dims = cleanName || "MAT";
    }

    return `${code}-${dims}`;
};

const addManualStock = async (req, res) => {
    const { 
        entry_date, 
        remarks, 
        warehouse, 
        location,
        project_name, 
        vendor_name, 
        items 
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Please provide at least one material to add' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const entry_no = await generateStockEntryNo(connection);
        const postingDate = entry_date || new Date().toISOString().split('T')[0];
        const defaultLocation = location || warehouse || 'Main Store';

        // 1. Create Stock Entry Header
        const [entryResult] = await connection.query(
            `INSERT INTO stock_entries (entry_no, entry_type, entry_date, remarks, grn_id, project_name, vendor_name, status) 
             VALUES (?, ?, ?, ?, NULL, ?, ?, 'submitted')`,
            [
                entry_no, 
                'Material Receipt', 
                postingDate, 
                remarks || 'Manual stock entry directly added to inventory', 
                project_name || null, 
                vendor_name || null
            ]
        );
        const stockEntryId = entryResult.insertId;

        // Sequence generator for ST numbers
        const currentYear = new Date().getFullYear().toString().slice(-2);
        const stPrefix = `ST-${currentYear}`;

        const [seqResult] = await connection.query(
            `SELECT MAX(CAST(SUBSTRING_INDEX(serial_number, '-', -1) AS UNSIGNED)) as max_seq 
             FROM inventory_serials WHERE serial_number LIKE ?`,
            [`${stPrefix}-%`]
        );
        let nextSeq = (seqResult[0]?.max_seq || 0) + 1;

        const createdItemsSummary = [];

        // 2. Loop through each item
        for (const rawItem of items) {
            const itemCode = generateAutoItemCode(rawItem);
            const itemName = rawItem.item_name || rawItem.itemName || `${itemCode} Material`;
            const qty = parseFloat(rawItem.quantity || rawItem.qty) || 1;
            const uom = rawItem.uom || rawItem.unit || 'Nos';
            const unitWeight = parseFloat(rawItem.unit_weight || rawItem.calculatedWeight || rawItem.unitWeight) || 0;
            const totalWeight = parseFloat(rawItem.total_weight || rawItem.totalWeight) || (unitWeight * qty);
            const density = parseFloat(rawItem.density) || 0;
            const valuationRate = parseFloat(rawItem.valuation_rate || rawItem.rate) || 0;
            const itemLocation = rawItem.location || rawItem.warehouse || defaultLocation;

            // Insert into stock_entry_items
            await connection.query(
                `INSERT INTO stock_entry_items (
                    stock_entry_id, material_id, item_code, item_name, quantity, uom, 
                    batch_no, valuation_rate, length, width, thickness, diameter, 
                    outer_diameter, height, unit_weight, total_weight, density,
                    item_group, web_thickness, flange_thickness, side_s, side_s1, side_s2, side1, side2,
                    items_per_packet, vendor_items_per_packet
                ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    stockEntryId,
                    itemCode,
                    itemName,
                    qty,
                    uom,
                    rawItem.batch_no || null,
                    valuationRate,
                    rawItem.length || null,
                    rawItem.width || null,
                    rawItem.thickness || null,
                    rawItem.diameter || null,
                    rawItem.outer_diameter || rawItem.outerDiameter || null,
                    rawItem.height || null,
                    unitWeight,
                    totalWeight,
                    density,
                    rawItem.item_group || rawItem.itemGroup || null,
                    rawItem.web_thickness || rawItem.webThickness || null,
                    rawItem.flange_thickness || rawItem.flangeThickness || null,
                    rawItem.side1 || rawItem.side_s || null,
                    rawItem.side1 || rawItem.side_s1 || null,
                    rawItem.side2 || rawItem.side_s2 || null,
                    rawItem.side1 || null,
                    rawItem.side2 || null,
                    parseFloat(rawItem.items_per_packet || rawItem.itemsPerPacket) || 1,
                    parseFloat(rawItem.vendor_items_per_packet || rawItem.items_per_packet || rawItem.itemsPerPacket) || 1
                ]
            );

            // Update Stock Ledger
            const [lastBalance] = await connection.query(
                'SELECT balance_qty FROM stock_ledger WHERE item_code = ? ORDER BY id DESC LIMIT 1',
                [itemCode]
            );
            const currentBalance = (lastBalance[0]?.balance_qty || 0);
            const newBalance = parseFloat(currentBalance) + qty;

            const ledgerSql = `INSERT INTO stock_ledger (
                item_code, material_name, posting_date, posting_time, voucher_type, 
                voucher_no, actual_qty, uom, balance_qty, project_name, vendor_name, 
                valuation_rate, remarks, length, width, thickness, diameter, 
                outer_diameter, height, unit_weight, total_weight, density,
                item_group, web_thickness, flange_thickness, side_s, side_s1, side_s2, side1, side2,
                items_per_packet, vendor_items_per_packet
            ) VALUES (?, ?, ?, CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            await connection.query(ledgerSql, [
                itemCode,
                itemName,
                postingDate,
                'Stock Entry',
                entry_no,
                qty,
                uom,
                newBalance,
                project_name || null,
                vendor_name || null,
                valuationRate,
                remarks || `Manual stock addition: ${itemName}`,
                rawItem.length || null,
                rawItem.width || null,
                rawItem.thickness || null,
                rawItem.diameter || null,
                rawItem.outer_diameter || rawItem.outerDiameter || null,
                rawItem.height || null,
                unitWeight,
                totalWeight,
                density,
                rawItem.item_group || rawItem.itemGroup || null,
                rawItem.web_thickness || rawItem.webThickness || null,
                rawItem.flange_thickness || rawItem.flangeThickness || null,
                rawItem.side1 || rawItem.side_s || null,
                rawItem.side1 || rawItem.side_s1 || null,
                rawItem.side2 || rawItem.side_s2 || null,
                rawItem.side1 || null,
                rawItem.side2 || null,
                parseFloat(rawItem.items_per_packet || rawItem.itemsPerPacket) || 1,
                parseFloat(rawItem.vendor_items_per_packet || rawItem.items_per_packet || rawItem.itemsPerPacket) || 1
            ]);

            // Create inventory serials (ST numbers)
            const isNos = ['nos', 'pcs'].includes(uom.toLowerCase());
            const loopCount = isNos ? Math.max(1, Math.floor(qty)) : 1;

            for (let i = 0; i < loopCount; i++) {
                // Ensure unique candidateSerial
                let candidateSerial = '';
                let isUnique = false;
                while (!isUnique) {
                    const seqStr = nextSeq.toString().padStart(3, '0');
                    candidateSerial = `${stPrefix}-${seqStr}`;
                    const [existing] = await connection.query(
                        'SELECT id FROM inventory_serials WHERE serial_number = ?',
                        [candidateSerial]
                    );
                    if (existing.length === 0) {
                        isUnique = true;
                    }
                    nextSeq++;
                }

                const pieceItemCode = isNos ? `${itemCode}-${candidateSerial.split('-').pop()}` : itemCode;
                const pieceUnitWeight = unitWeight;
                const pieceTotalWeight = isNos ? unitWeight : totalWeight;

                await connection.query(
                    `INSERT INTO inventory_serials (
                        serial_number, item_code, purchase_order_id, item_id, 
                        item_name, grn_id, status, inspection_status, location,
                        length, width, thickness, diameter, outer_diameter, height, 
                        unit_weight, total_weight, density, material_grade, item_group, 
                        web_thickness, flange_thickness, side1, side2, side_s, side_s1, side_s2,
                        material_type, items_per_packet, vendor_items_per_packet, issued_in_entry_id
                    ) VALUES (?, ?, NULL, NULL, ?, NULL, 'Available', 'Accepted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        candidateSerial,
                        pieceItemCode,
                        itemName,
                        itemLocation,
                        rawItem.length || null,
                        rawItem.width || null,
                        rawItem.thickness || null,
                        rawItem.diameter || null,
                        rawItem.outer_diameter || rawItem.outerDiameter || null,
                        rawItem.height || null,
                        pieceUnitWeight,
                        pieceTotalWeight,
                        density,
                        rawItem.material_grade || rawItem.materialGrade || null,
                        rawItem.item_group || rawItem.itemGroup || null,
                        rawItem.web_thickness || rawItem.webThickness || null,
                        rawItem.flange_thickness || rawItem.flangeThickness || null,
                        rawItem.side1 || null,
                        rawItem.side2 || null,
                        rawItem.side1 || null,
                        rawItem.side1 || null,
                        rawItem.side2 || null,
                        rawItem.material_type || rawItem.materialType || null,
                        parseFloat(rawItem.items_per_packet || rawItem.itemsPerPacket) || 1,
                        parseFloat(rawItem.vendor_items_per_packet || rawItem.items_per_packet || rawItem.itemsPerPacket) || 1,
                        stockEntryId
                    ]
                );
            }

            createdItemsSummary.push({
                itemCode,
                itemName,
                quantity: qty,
                uom
            });
        }

        await connection.commit();
        res.status(201).json({
            success: true,
            message: `Successfully added ${createdItemsSummary.length} material(s) into inventory stock`,
            entry_no,
            stockEntryId,
            items: createdItemsSummary
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error adding manual stock:', error);
        res.status(500).json({ success: false, message: 'Server error while adding stock', error: error.message });
    } finally {
        connection.release();
    }
};

module.exports = {
    createStockEntry,
    getStockEntries,
    getStockMovements,
    getWarehouses,
    getStockBalance,
    getInventoryPortalData,
    generateStockEntryNo,
    addManualStock
};
