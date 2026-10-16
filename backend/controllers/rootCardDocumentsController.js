const db = require('../config/db');

// Read-only aggregation of every document linked to a root card, grouped by department.
// It only SELECTs from existing tables, so no existing flow or status is affected.

// Run a query but never let one broken source fail the whole response
const safeQuery = async (label, sql, params) => {
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (error) {
    console.error(`[RootCardDocuments] ${label} query failed:`, error.message);
    return [];
  }
};

const parseJson = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const fileEntry = (label, filePath) => (filePath ? { label, path: filePath } : null);
const compactFiles = (...files) => files.filter(Boolean);

const PRE_PRODUCTION_STATUSES = [
  'pending',
  'RC_CREATED',
  'DESIGN_IN_PROGRESS',
  'QUALITY_QAP_PENDING',
  'DESIGN_QAP_REVIEW',
  'DESIGN_APPROVED'
];

// @route   GET api/root-cards/:id/documents
const getRootCardDocuments = async (req, res) => {
  const { id } = req.params;

  try {
    const [cards] = await db.query(
      'SELECT id, public_id, project_name, project_code, po_number, status FROM root_cards WHERE id = ? OR public_id = ?',
      [id, id]
    );
    if (cards.length === 0) {
      return res.status(404).json({ success: false, message: 'Root Card not found' });
    }
    const rootCard = cards[0];
    const rcId = rootCard.id;

    // ---------- Linked purchase orders (direct, via quotation, or via material request) ----------
    const purchaseOrders = await safeQuery(
      'purchase orders',
      `SELECT DISTINCT po.id, po.po_number, po.status, po.order_date, po.total_amount, po.created_at,
              v.name AS vendor_name
       FROM purchase_orders po
       LEFT JOIN quotations q ON po.quotation_id = q.id
       LEFT JOIN material_requests mr ON q.material_request_id = mr.id
       LEFT JOIN vendors v ON po.vendor_id = v.id
       WHERE po.project_id = ? OR q.root_card_id = ? OR mr.root_card_id = ?
       ORDER BY po.created_at DESC`,
      [rcId, rcId, rcId]
    );
    const poIds = purchaseOrders.map((po) => po.id);
    const poNumberById = Object.fromEntries(purchaseOrders.map((po) => [po.id, po.po_number]));

    const grns = poIds.length
      ? await safeQuery(
          'grns',
          `SELECT g.id, g.grn_number, g.purchase_order_id, g.posting_date, g.status, g.inspection_type,
                  g.created_at, v.name AS vendor_name
           FROM grns g
           LEFT JOIN vendors v ON g.vendor_id = v.id
           WHERE g.purchase_order_id IN (?)
           ORDER BY g.created_at DESC`,
          [poIds]
        )
      : [];

    // Production users keep the same drawing visibility rule as the Drawings screen
    const isProduction = req.user && (
      req.user.role?.toLowerCase().includes('production') ||
      req.user.department?.toLowerCase() === 'production'
    );
    const hideDrawings = isProduction && PRE_PRODUCTION_STATUSES.includes(rootCard.status);

    const [
      drawings,
      qualityStep,
      projectInspections,
      quotations,
      poAttachments,
      poCommAttachments,
      outwardChallans,
      inwardChallans
    ] = await Promise.all([
      hideDrawings
        ? []
        : safeQuery(
            'design drawings',
            `SELECT d.id, d.name, d.type, d.version, d.status, d.file_path, d.dwg_path, d.step_path,
                    d.parent_id, d.created_at, u.full_name AS created_by_name
             FROM design_documents d
             LEFT JOIN users u ON d.created_by = u.id
             WHERE d.root_card_id = ? ${isProduction ? "AND d.status = 'Approved'" : ''}
             ORDER BY d.created_at DESC`,
            [rcId]
          ),
      safeQuery(
        'quality step',
        "SELECT step_data FROM root_card_steps WHERE root_card_id = ? AND step_key = 'quality'",
        [rcId]
      ),
      safeQuery(
        'production inspections',
        `SELECT id, inspection_name, phase, status, document_path, created_at, updated_at
         FROM project_inspections
         WHERE root_card_id = ?
         ORDER BY phase ASC, created_at ASC`,
        [rcId]
      ),
      safeQuery(
        'quotations',
        `SELECT DISTINCT q.id, q.quotation_number, q.type, q.status, q.total_amount, q.rfq_id,
                q.received_quotation_path, q.created_at, v.name AS vendor_name,
                rfq.quotation_number AS rfq_number
         FROM quotations q
         LEFT JOIN material_requests mr ON q.material_request_id = mr.id
         LEFT JOIN quotations rfq ON q.rfq_id = rfq.id
         LEFT JOIN vendors v ON q.vendor_id = v.id
         WHERE q.root_card_id = ? OR mr.root_card_id = ? OR rfq.root_card_id = ?
         ORDER BY q.created_at DESC`,
        [rcId, rcId, rcId]
      ),
      poIds.length
        ? safeQuery(
            'po attachments',
            `SELECT id, purchase_order_id, file_name, file_path, mime_type, created_at
             FROM purchase_order_attachments
             WHERE purchase_order_id IN (?)
             ORDER BY created_at DESC`,
            [poIds]
          )
        : [],
      poIds.length
        ? safeQuery(
            'po communication attachments',
            `SELECT a.id, a.file_name, a.file_path, a.created_at, c.purchase_order_id, c.is_outgoing
             FROM purchase_order_communication_attachments a
             JOIN purchase_order_communications c ON a.communication_id = c.id
             WHERE c.purchase_order_id IN (?)
             ORDER BY a.created_at DESC`,
            [poIds]
          )
        : [],
      safeQuery(
        'outward challans',
        `SELECT id, challan_no, challan_date, status, vendor_name, operation_name, created_at
         FROM outward_challans
         WHERE root_card_id = ?
         ORDER BY created_at DESC`,
        [rcId]
      ),
      safeQuery(
        'inward challans',
        `SELECT ic.id, ic.challan_no, ic.challan_date, ic.received_date, ic.status, ic.vendor_name,
                ic.created_at, oc.challan_no AS outward_challan_no
         FROM inward_challans ic
         LEFT JOIN outward_challans oc ON ic.outward_challan_id = oc.id
         WHERE ic.root_card_id = ?
         ORDER BY ic.created_at DESC`,
        [rcId]
      )
    ]);

    const quotationIds = quotations.map((q) => q.id);
    const quotationCommAttachments = quotationIds.length
      ? await safeQuery(
          'quotation communication attachments',
          `SELECT a.id, a.file_name, a.file_path, a.created_at, c.quotation_id, c.is_outgoing
           FROM quotation_communication_attachments a
           JOIN quotation_communications c ON a.communication_id = c.id
           WHERE c.quotation_id IN (?)
           ORDER BY a.created_at DESC`,
          [quotationIds]
        )
      : [];

    // ---------- Design ----------
    const design = drawings.map((d) => ({
      key: `drawing-${d.id}`,
      category: 'Design Drawing',
      title: d.name,
      subtitle: [d.type, `Rev ${d.version || 1}`, d.created_by_name].filter(Boolean).join(' · '),
      status: d.status,
      date: d.created_at,
      files: compactFiles(
        fileEntry('Drawing', d.file_path),
        fileEntry('DWG', d.dwg_path),
        fileEntry('STEP', d.step_path)
      )
    }));

    // ---------- Quality ----------
    const quality = [];
    const qualityData = parseJson(qualityStep[0]?.step_data);
    const pushStepFiles = (list, legacyPath, category) => {
      const files = Array.isArray(list) ? list : [];
      files.forEach((f, idx) => {
        quality.push({
          key: `${category}-${idx}`,
          category,
          title: f.original_name || f.path?.split('/').pop() || category,
          subtitle: 'Uploaded by Quality',
          status: null,
          date: f.uploaded_at || null,
          files: compactFiles(fileEntry('File', f.path))
        });
      });
      // Older root cards only stored a single path
      if (files.length === 0 && legacyPath) {
        quality.push({
          key: `${category}-legacy`,
          category,
          title: legacyPath.split('/').pop(),
          subtitle: 'Uploaded by Quality',
          status: null,
          date: null,
          files: compactFiles(fileEntry('File', legacyPath))
        });
      }
    };
    pushStepFiles(qualityData.qap_files, qualityData.qap_path, 'QAP');
    pushStepFiles(qualityData.atp_files, qualityData.atp_path, 'ATP');

    projectInspections.forEach((t) => {
      quality.push({
        key: `inspection-${t.id}`,
        category: `Phase ${t.phase || 1} Test`,
        title: t.inspection_name,
        subtitle: t.phase === 2 ? 'Phase 2 (Painting / Final) QC' : 'Phase 1 (Dimensional) QC',
        status: t.status,
        date: t.updated_at || t.created_at,
        files: compactFiles(fileEntry('Report', t.document_path))
      });
    });

    // ---------- Procurement ----------
    const procurement = [];
    const commFilesByQuotation = {};
    quotationCommAttachments.forEach((a) => {
      (commFilesByQuotation[a.quotation_id] ||= []).push({
        label: a.file_name || 'Email attachment',
        path: a.file_path
      });
    });

    quotations.forEach((q) => {
      const isRfq = q.type === 'outbound';
      procurement.push({
        key: `quotation-${q.id}`,
        category: isRfq ? 'RFQ' : 'Received Quotation',
        title: q.quotation_number,
        subtitle: [q.vendor_name, !isRfq && q.rfq_number ? `Against ${q.rfq_number}` : null]
          .filter(Boolean)
          .join(' · '),
        status: q.status,
        date: q.created_at,
        amount: isRfq ? null : q.total_amount,
        files: compactFiles(
          fileEntry('Quotation', q.received_quotation_path),
          ...(commFilesByQuotation[q.id] || [])
        )
      });
    });

    const commFilesByPo = {};
    poCommAttachments.forEach((a) => {
      (commFilesByPo[a.purchase_order_id] ||= []).push({
        label: a.file_name || (a.is_outgoing ? 'Sent PO' : 'Vendor reply'),
        path: a.file_path
      });
    });

    purchaseOrders.forEach((po) => {
      procurement.push({
        key: `po-${po.id}`,
        category: 'Purchase Order',
        title: po.po_number,
        subtitle: po.vendor_name || '',
        status: po.status,
        date: po.order_date || po.created_at,
        amount: po.total_amount,
        files: commFilesByPo[po.id] || []
      });
    });

    // ---------- Inventory ----------
    const inventory = [];
    poAttachments.forEach((a) => {
      inventory.push({
        key: `po-attachment-${a.id}`,
        category: 'Delivery Challan / Invoice',
        title: a.file_name,
        subtitle: poNumberById[a.purchase_order_id] ? `PO ${poNumberById[a.purchase_order_id]}` : '',
        status: null,
        date: a.created_at,
        files: compactFiles(fileEntry('File', a.file_path))
      });
    });

    grns.forEach((g) => {
      inventory.push({
        key: `grn-${g.id}`,
        category: 'GRN',
        title: g.grn_number || `GRN #${g.id}`,
        subtitle: [poNumberById[g.purchase_order_id] && `PO ${poNumberById[g.purchase_order_id]}`, g.vendor_name, g.inspection_type]
          .filter(Boolean)
          .join(' · '),
        status: g.status,
        date: g.posting_date || g.created_at,
        files: []
      });
    });

    // ---------- Production ----------
    const production = [
      ...outwardChallans.map((c) => ({
        key: `outward-${c.id}`,
        category: 'Outward Challan',
        title: c.challan_no,
        subtitle: [c.vendor_name, c.operation_name].filter(Boolean).join(' · '),
        status: c.status,
        date: c.challan_date || c.created_at,
        files: [],
        generate: { type: 'outward_challan', id: c.id }
      })),
      ...inwardChallans.map((c) => ({
        key: `inward-${c.id}`,
        category: 'Inward Challan',
        title: c.challan_no,
        subtitle: [c.vendor_name, c.outward_challan_no ? `Against ${c.outward_challan_no}` : null]
          .filter(Boolean)
          .join(' · '),
        status: c.status,
        date: c.received_date || c.challan_date || c.created_at,
        files: [],
        generate: { type: 'inward_challan', id: c.id }
      }))
    ];

    res.json({
      success: true,
      rootCard: {
        id: rootCard.id,
        public_id: rootCard.public_id,
        project_name: rootCard.project_name,
        project_code: rootCard.project_code,
        po_number: rootCard.po_number
      },
      sections: { design, quality, procurement, inventory, production }
    });
  } catch (error) {
    console.error('Error fetching root card documents:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getRootCardDocuments };
