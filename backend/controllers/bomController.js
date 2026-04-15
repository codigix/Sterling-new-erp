const db = require('../config/db');

// Map snake_case database row to camelCase BOM object
const mapBomRowToModel = (row) => ({
  id: row.id,
  rootCardId: row.root_card_id,
  bomNumber: row.bom_number,
  description: row.description,
  status: row.status,
  isActive: row.is_active,
  projectId: row.project_id,
  totalCost: row.total_cost,
  projectName: row.project_name,
  productName: row.project_name,
  productCode: row.project_code,
  projectCode: row.project_code,
  poNumber: row.po_number,
  quantity: row.quantity, // quantity from RC
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const createBOM = async (req, res) => {
  const { productInfo, materials, operations } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Insert into boms table
    const [bomResult] = await connection.query(
      `INSERT INTO boms 
      (root_card_id, bom_number, description, status, is_active, project_id, total_cost) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        productInfo.rootCardId,
        productInfo.bomNumber,
        productInfo.description || '',
        productInfo.status || 'draft',
        1, // Always active on first creation
        productInfo.projectId || null,
        0
      ]
    );

    const bomId = bomResult.insertId;
    let totalBOMCost = 0;

    // 2. Insert into bom_materials table
    if (materials && materials.length > 0) {
      const materialValues = materials.map(m => {
        return [
          bomId,
          m.itemName,
          m.itemGroup || null,
          m.materialGrade || null,
          m.partDetail || null,
          m.remark || null,
          m.make || null,
          m.quantity || 0,
          m.uom || '',
          0, // Rate removed from logic
          0, // Total removed from logic
          m.warehouse || null,
          m.operation || null,
          m.length || 0,
          m.width || 0,
          m.thickness || 0,
          m.diameter || 0,
          m.outerDiameter || 0,
          m.height || 0,
          m.materialType || null,
          m.density || 0,
          m.unitWeight || m.calculatedWeight || 0,
          m.totalWeight || 0,
          m.side1 || 0,
          m.side2 || 0,
          m.webThickness || 0,
          m.flangeThickness || 0
        ];
      });

      await connection.query(
        `INSERT INTO bom_materials 
        (bom_id, item_name, item_group, material_grade, part_detail, remark, make, quantity, uom, rate, total_amount, warehouse, operation, length, width, thickness, diameter, outer_diameter, height, material_type, density, unit_weight, total_weight, side1, side2, web_thickness, flange_thickness) 
        VALUES ?`,
        [materialValues]
      );
    }

    // 3. Insert into bom_operations table
    if (operations && operations.length > 0) {
      const operationValues = operations.map(o => {
        totalBOMCost += parseFloat(o.cost) || 0;
        return [
          bomId,
          o.operationName,
          o.type || 'in-house',
          o.workstation || null,
          o.targetWarehouse || null,
          o.vendorName || null,
          o.vendorRatePerUnit || 0,
          o.subcontractWarehouse || null,
          o.cycleTime || 0,
          o.setupTime || 0,
          o.hourlyRate || 0,
          o.cost || 0
        ];
      });

      await connection.query(
        `INSERT INTO bom_operations 
        (bom_id, operation_name, type, workstation, target_warehouse, vendor_name, vendor_rate_per_unit, subcontract_warehouse, cycle_time, setup_time, hourly_rate, cost) 
        VALUES ?`,
        [operationValues]
      );
    }

    // 4. Update total cost
    await connection.query(
      'UPDATE boms SET total_cost = ? WHERE id = ?',
      [totalBOMCost, bomId]
    );

    await connection.commit();
    res.status(201).json({ message: 'BOM created successfully', bomId });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating BOM:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        message: 'A BOM with this number and revision already exists',
        redirect: true,
        bomId: null
      });
    }
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const updateBOM = async (req, res) => {
  const { bomId } = req.params;
  const { productInfo, materials, operations } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [updateResult] = await connection.query(
      `UPDATE boms SET 
        root_card_id = ?, 
        bom_number = ?, 
        description = ?, 
        status = ?, 
        is_active = ?, 
        project_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        productInfo.rootCardId,
        productInfo.bomNumber,
        productInfo.description || '',
        productInfo.status || 'draft',
        productInfo.isActive !== undefined ? productInfo.isActive : true,
        productInfo.projectId || null,
        bomId
      ]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'BOM not found' });
    }

    let totalBOMCost = 0;

    await connection.query('DELETE FROM bom_materials WHERE bom_id = ?', [bomId]);
    if (materials && materials.length > 0) {
      const materialValues = materials.map(m => {
        return [
          bomId,
          m.itemName,
          m.itemGroup || null,
          m.materialGrade || null,
          m.partDetail || null,
          m.remark || null,
          m.make || null,
          m.quantity || 0,
          m.uom || '',
          0, // Rate removed from logic
          0,  // Total removed from logic
          m.warehouse || null,
          m.operation || null,
          m.length || 0,
          m.width || 0,
          m.thickness || 0,
          m.diameter || 0,
          m.outerDiameter || 0,
          m.height || 0,
          m.materialType || null,
          m.density || 0,
          m.unitWeight || m.calculatedWeight || 0,
          m.totalWeight || 0,
          m.side1 || 0,
          m.side2 || 0,
          m.webThickness || 0,
          m.flangeThickness || 0
        ];
      });
      await connection.query(
        `INSERT INTO bom_materials 
        (bom_id, item_name, item_group, material_grade, part_detail, remark, make, quantity, uom, rate, total_amount, warehouse, operation, length, width, thickness, diameter, outer_diameter, height, material_type, density, unit_weight, total_weight, side1, side2, web_thickness, flange_thickness) 
        VALUES ?`,
        [materialValues]
      );
    }

    await connection.query('DELETE FROM bom_operations WHERE bom_id = ?', [bomId]);
    if (operations && operations.length > 0) {
      const operationValues = operations.map(o => {
        totalBOMCost += parseFloat(o.cost) || 0;
        return [
          bomId,
          o.operationName,
          o.type || 'in-house',
          o.workstation || null,
          o.targetWarehouse || null,
          o.vendorName || null,
          o.vendorRatePerUnit || 0,
          o.subcontractWarehouse || null,
          o.cycleTime || 0,
          o.setupTime || 0,
          o.hourlyRate || 0,
          o.cost || 0
        ];
      });
      await connection.query(
        `INSERT INTO bom_operations 
        (bom_id, operation_name, type, workstation, target_warehouse, vendor_name, vendor_rate_per_unit, subcontract_warehouse, cycle_time, setup_time, hourly_rate, cost) 
        VALUES ?`,
        [operationValues]
      );
    }

    await connection.query('UPDATE boms SET total_cost = ? WHERE id = ?', [totalBOMCost, bomId]);

    await connection.commit();
    res.json({ message: 'BOM updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating BOM:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const getBOMs = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.*, rc.project_name, rc.project_code, rc.po_number, rc.quantity
      FROM boms b
      JOIN root_cards rc ON b.root_card_id = rc.id
      ORDER BY b.created_at DESC
    `);
    res.json({ boms: rows.map(mapBomRowToModel) });
  } catch (error) {
    console.error('Error fetching BOMs:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBOMById = async (req, res) => {
  const { bomId } = req.params;
  try {
    const [bomRows] = await db.query(`
      SELECT b.*, rc.project_name, rc.project_code, rc.po_number, rc.quantity
      FROM boms b
      JOIN root_cards rc ON b.root_card_id = rc.id
      WHERE b.id = ?
    `, [bomId]);

    if (bomRows.length === 0) {
      return res.status(404).json({ message: 'BOM not found' });
    }

    const [materials] = await db.query('SELECT * FROM bom_materials WHERE bom_id = ?', [bomId]);
    const [operations] = await db.query('SELECT * FROM bom_operations WHERE bom_id = ?', [bomId]);

    const bom = mapBomRowToModel(bomRows[0]);
    
    let materialCost = 0;
    bom.materials = materials.map(m => {
      return {
        id: m.id,
        itemName: m.item_name,
        vendorItemName: m.vendor_item_name,
        itemGroup: m.item_group,
        materialGrade: m.material_grade,
        partDetail: m.part_detail,
        remark: m.remark,
        make: m.make,
        quantity: m.quantity,
        uom: m.uom,
        warehouse: m.warehouse,
        operation: m.operation,
        length: m.length,
        width: m.width,
        thickness: m.thickness,
        diameter: m.diameter,
        outerDiameter: m.outer_diameter,
        height: m.height,
        materialType: m.material_type,
        density: m.density,
        unitWeight: m.unit_weight,
        totalWeight: m.total_weight,
        side1: m.side1,
        side2: m.side2,
        webThickness: m.web_thickness,
        flangeThickness: m.flange_thickness,
        ratePerKg: m.rate_per_kg,
        rate: 0,
        totalAmount: 0
      };
    });

    let operationCost = 0;
    bom.operations = operations.map(o => {
      const cost = parseFloat(o.cost) || 0;
      operationCost += cost;
      return {
        id: o.id,
        operationName: o.operation_name,
        type: o.type,
        workstation: o.workstation,
        targetWarehouse: o.target_warehouse,
        vendorName: o.vendor_name,
        vendorRatePerUnit: o.vendor_rate_per_unit,
        subcontractWarehouse: o.subcontract_warehouse,
        cycleTime: o.cycle_time,
        setupTime: o.setup_time,
        hourlyRate: o.hourly_rate,
        cost: o.cost
      };
    });

    bom.costs = {
      materialCost,
      componentCost: 0, // Placeholder if components are added later
      operationCost,
      totalBOMCost: materialCost + operationCost
    };

    res.json({ bom });
  } catch (error) {
    console.error('Error fetching BOM details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteBOM = async (req, res) => {
  const { bomId } = req.params;
  try {
    const [result] = await db.query('DELETE FROM boms WHERE id = ?', [bomId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'BOM not found' });
    }
    res.json({ message: 'BOM deleted successfully' });
  } catch (error) {
    console.error('Error deleting BOM:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createBOM,
  updateBOM,
  getBOMs,
  getBOMById,
  deleteBOM
};
