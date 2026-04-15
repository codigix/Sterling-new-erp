const db = require('../config/db');
const { sendEmail } = require('../utils/emailService');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const getQuotations = async (req, res) => {
    try {
        const { type, material_request_id, root_card_id, search, status } = req.query;
        let query = `
            SELECT q.*, v.name as vendor_name, mr.request_number as mr_number, rc.project_name,
            rfq.quotation_number as rfq_number,
            (SELECT COUNT(*) FROM quotation_communications WHERE quotation_id = q.id AND sender_id IS NULL AND is_read = FALSE) as unread_communication_count
            FROM quotations q
            LEFT JOIN vendors v ON q.vendor_id = v.id
            LEFT JOIN material_requests mr ON q.material_request_id = mr.id
            LEFT JOIN root_cards rc ON rc.id = COALESCE(q.root_card_id, mr.root_card_id)
            LEFT JOIN quotations rfq ON q.rfq_id = rfq.id
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
        if (root_card_id) {
            query += " AND (q.root_card_id = ? OR mr.root_card_id = ?)";
            params.push(root_card_id, root_card_id);
        }
        if (status && status !== 'all') {
            query += " AND q.status = ?";
            params.push(status);
        }
        if (search) {
            query += " AND (q.quotation_number LIKE ? OR v.name LIKE ? OR mr.request_number LIKE ? OR rc.project_name LIKE ?)";
            const searchVal = `%${search}%`;
            params.push(searchVal, searchVal, searchVal, searchVal);
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
            SELECT q.*, v.name as vendor_name, v.email as vendor_email, mr.request_number as mr_number, rc.project_name,
            rfq.quotation_number as rfq_number
            FROM quotations q
            LEFT JOIN vendors v ON q.vendor_id = v.id
            LEFT JOIN material_requests mr ON q.material_request_id = mr.id
            LEFT JOIN root_cards rc ON q.root_card_id = rc.id
            LEFT JOIN quotations rfq ON q.rfq_id = rfq.id
            WHERE q.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        const quotation = rows[0];
        const [items] = await db.query('SELECT *, vendor_item_name FROM quotation_items WHERE quotation_id = ?', [id]);
        quotation.items = items;

        res.json(quotation);
    } catch (error) {
        console.error('Error fetching quotation details:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createQuotation = async (req, res) => {
    const { vendor_id, root_card_id, material_request_id, rfq_id, type, items, notes, total_amount, valid_until } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        let finalRootCardId = root_card_id;

        // If root_card_id is missing but we have RFQ, fetch it from the RFQ
        if (!finalRootCardId && rfq_id) {
            const [rfqRows] = await connection.query('SELECT root_card_id FROM quotations WHERE id = ?', [rfq_id]);
            if (rfqRows.length > 0) {
                finalRootCardId = rfqRows[0].root_card_id;
                console.log(`Fetched Root Card ID from RFQ: ${finalRootCardId}`);
            }
        }

        // If still missing, try Material Request
        if (!finalRootCardId && material_request_id) {
            const [mrRows] = await connection.query('SELECT root_card_id FROM material_requests WHERE id = ?', [material_request_id]);
            if (mrRows.length > 0) {
                finalRootCardId = mrRows[0].root_card_id;
                console.log(`Fetched Root Card ID from Material Request: ${finalRootCardId}`);
            }
        }

        // Generate Unique Quotation Number with random suffix
        const year = new Date().getFullYear();
        const prefix = type === 'outbound' ? 'RFQ' : 'QTN';
        let quotationNumber = '';
        let isUnique = false;

        while (!isUnique) {
            const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit random number
            quotationNumber = `${prefix}-${year}-${randomSuffix}`;
            
            const [existing] = await connection.query(
                'SELECT id FROM quotations WHERE quotation_number = ?',
                [quotationNumber]
            );
            
            if (existing.length === 0) {
                isUnique = true;
            }
        }

        const [result] = await connection.query(
            `INSERT INTO quotations 
            (quotation_number, vendor_id, root_card_id, material_request_id, rfq_id, type, notes, total_amount, valid_until, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [quotationNumber, vendor_id, finalRootCardId || null, material_request_id || null, rfq_id || null, type, notes || '', total_amount || 0, valid_until || null, 'pending']
        );

        const quotationId = result.insertId;
        console.log(`Quotation created with ID: ${quotationId}, Type: ${type}, Final Root Card ID: ${finalRootCardId}`);

        if (items && items.length > 0) {
            console.log(`Processing ${items.length} items for quotation...`);
            const itemValues = items.map(item => [
                quotationId,
                (type === 'inbound' && item.vendor_item_name) ? item.vendor_item_name : (item.item_name || ''),
                item.vendor_item_name || '',
                item.category || '',
                item.quantity || 0,
                item.unit || '',
                item.unit_price || 0,
                item.rate_per_kg || 0,
                item.total_weight || 0,
                item.material_grade || '',
                item.part_detail || '',
                item.make || '',
                item.remark || '',
                item.item_group || '',
                item.length || null,
                item.width || null,
                item.thickness || null,
                item.diameter || null,
                item.outer_diameter || null,
                item.height || null,
                item.material_type || null,
                item.density || 0,
                item.unit_weight || 0,
                item.side1 || 0,
                item.side2 || 0,
                item.web_thickness || 0,
                item.flange_thickness || 0,
                item.vendor_length || null,
                item.vendor_width || null,
                item.vendor_thickness || null,
                item.vendor_diameter || null,
                item.vendor_outer_diameter || null,
                item.vendor_height || null,
                item.vendor_side1 || 0,
                item.vendor_side2 || 0,
                item.vendor_web_thickness || 0,
                item.vendor_flange_thickness || 0,
                item.side_s || item.s || null,
                item.side_s1 || item.s1 || null,
                item.side_s2 || item.s2 || null
            ]);

            await connection.query(
                `INSERT INTO quotation_items 
                (quotation_id, item_name, vendor_item_name, category, quantity, unit, unit_price, rate_per_kg, total_weight, material_grade, part_detail, make, remark, item_group, length, width, thickness, diameter, outer_diameter, height, material_type, density, unit_weight, side1, side2, web_thickness, flange_thickness, vendor_length, vendor_width, vendor_thickness, vendor_diameter, vendor_outer_diameter, vendor_height, vendor_side1, vendor_side2, vendor_web_thickness, vendor_flange_thickness, side_s, side_s1, side_s2) 
                VALUES ?`,
                [itemValues]
            );
        }

        // Trigger BOM Versioning if inbound and has root_card_id
        if (type === 'inbound') {
            if (finalRootCardId) {
                console.log(`Triggering BOM versioning for Root Card: ${finalRootCardId}`);
                await createBOMVersionFromQuotation(connection, finalRootCardId, items);
            } else {
                console.log('BOM versioning skipped: No finalRootCardId available');
            }
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
        const { search, category, status } = req.query;
        let query = 'SELECT * FROM vendors WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
            const searchVal = `%${search}%`;
            params.push(searchVal, searchVal, searchVal);
        }

        if (category && category !== 'all') {
            query += ' AND category = ?';
            params.push(category);
        }

        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY name ASC';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getVendorById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM vendors WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Vendor not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching vendor:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getVendorStats = async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as totalVendors,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeVendors,
                AVG(rating) as averageRating
            FROM vendors
        `);
        res.json(stats[0] || { totalVendors: 0, activeVendors: 0, averageRating: 0 });
    } catch (error) {
        console.error('Error fetching vendor stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getVendorCategories = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DISTINCT category FROM vendors WHERE category IS NOT NULL AND category != ""');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching vendor categories:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createVendor = async (req, res) => {
    const { 
        name, email, address, category, vendor_type, status,
        contact_person_name, designation, mobile_number, city, state, pincode,
        vendor_code
    } = req.body;
    
    try {
        // Generate Vendor Code if not provided
        let vCode = vendor_code;
        if (!vCode) {
            const [lastVendor] = await db.query(
                'SELECT vendor_code FROM vendors WHERE vendor_code LIKE "VEN-%" ORDER BY vendor_code DESC LIMIT 1'
            );
            let nextNum = 1;
            if (lastVendor.length > 0) {
                const lastCode = lastVendor[0].vendor_code;
                const parts = lastCode.split('-');
                if (parts.length >= 2) {
                    const lastNum = parseInt(parts[1]);
                    if (!isNaN(lastNum)) {
                        nextNum = lastNum + 1;
                    }
                }
            }
            vCode = `VEN-${nextNum.toString().padStart(4, '0')}`;
        }

        const [result] = await db.query(
            `INSERT INTO vendors (
                name, email, address, category, vendor_type, status,
                vendor_code, contact_person_name, designation, mobile_number, 
                city, state, pincode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, email || '', address || '', category || '', 
                vendor_type || 'material_supplier', status || 'active',
                vCode, contact_person_name || '', designation || '', mobile_number || '',
                city || '', state || '', pincode || ''
            ]
        );
        res.status(201).json({ message: 'Vendor created successfully', id: result.insertId, vendor_code: vCode });
    } catch (error) {
        console.error('Error creating vendor:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateVendor = async (req, res) => {
    const { id } = req.params;
    const { 
        name, email, address, category, vendor_type, status,
        vendor_code, contact_person_name, designation, mobile_number, 
        city, state, pincode
    } = req.body;

    try {
        await db.query(
            `UPDATE vendors SET 
                name = ?, email = ?, address = ?, category = ?, 
                vendor_type = ?, status = ?, vendor_code = ?, contact_person_name = ?, 
                designation = ?, mobile_number = ?, city = ?, state = ?, 
                pincode = ?
            WHERE id = ?`,
            [
                name, email, address, category, 
                vendor_type, status, vendor_code, contact_person_name, 
                designation, mobile_number, city, state, 
                pincode, id
            ]
        );
        res.json({ message: 'Vendor updated successfully' });
    } catch (error) {
        console.error('Error updating vendor:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteVendor = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM vendors WHERE id = ?', [id]);
        res.json({ message: 'Vendor deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const analyzeQuotation = async (req, res) => {
    try {
        console.log('Quotation Analysis Request Received');
        if (!req.file) {
            console.error('No file found in request');
            return res.status(400).json({ message: 'No file uploaded' });
        }
        console.log('File uploaded:', req.file.originalname, 'Path:', req.file.path);

        const items = JSON.parse(req.body.items || '[]');
        console.log('Number of items to analyze:', items.length);
        
        const filePath = req.file.path;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();

        let extractedText = '';

        if (fileExtension === '.pdf') {
            console.log('Parsing PDF file...');
            const dataBuffer = fs.readFileSync(filePath);
            
            try {
                // Try with custom pagerender first for better column detection
                const options = {
                    pagerender: function(pageData) {
                        return pageData.getTextContent()
                        .then(function(textContent) {
                            let lastY, text = '';
                            for (let item of textContent.items) {
                                if (lastY == item.transform[5] || !lastY){
                                    text += ' ' + item.str;
                                }
                                else{
                                    text += '\n' + item.str;
                                }    
                                lastY = item.transform[5];
                            }
                            return text;
                        });
                    }
                };
                const data = await pdf(dataBuffer, options);
                extractedText = data.text;
            } catch (pdfError) {
                console.warn('PDF parsing with custom pagerender failed, trying default...', pdfError.message);
                try {
                    // Fallback to default parsing
                    const data = await pdf(dataBuffer);
                    extractedText = data.text;
                } catch (fallbackError) {
                    console.error('All PDF parsing attempts failed:', fallbackError.message);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    return res.status(422).json({ 
                        message: 'The PDF document appears to be malformed or protected. Please try another file or enter data manually.',
                        error: fallbackError.message 
                    });
                }
            }
        } else {
            console.warn('Unsupported file extension for extraction:', fileExtension);
            // Clean up temp file
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(400).json({ message: 'Currently only PDF analysis is supported for detailed extraction' });
        }

        console.log('Extracted Text length:', extractedText.length);
        
        // Detect column order from headers if possible
        let rateBeforeWeight = false; // Default: Weight then Rate
        const lowerText = extractedText.toLowerCase();
        const rateIdx = lowerText.indexOf('rate');
        const weightIdx = lowerText.indexOf('weight');
        
        if (rateIdx !== -1 && weightIdx !== -1 && rateIdx < weightIdx) {
            rateBeforeWeight = true;
            console.log('Detected column order: Rate before Weight');
        } else {
            console.log('Detected column order: Weight before Rate (or unknown, using default)');
        }

        // Clean and prepare lines
        const lines = extractedText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // Helper to normalize strings for comparison
        const normalize = (str) => {
            if (!str) return '';
            return str.toLowerCase()
                .replace(/[x×]/g, ' ')
                .replace(/[^a-z0-9]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        };

        const updatedItems = items.map(item => {
            // Defaults
            item.rate_per_kg = 0;
            item.total_weight = 0;
            item.unit_price = item.unit_price || 0;

            const targetName = normalize(item.item_name);
            if (!targetName) return item;

            // Step 1: Find all lines containing parts of the item name
            const targetWords = targetName.split(' ').filter(w => w.length > 1);
            let candidates = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = normalize(lines[i]);
                const matchCount = targetWords.filter(word => line.includes(word)).length;
                const score = matchCount / targetWords.length;
                
                if (score > 0.3) {
                    candidates.push({ lineIdx: i, score });
                }
            }

            // Sort candidates by match score
            candidates.sort((a, b) => b.score - a.score);

            if (candidates.length > 0) {
                // Try each candidate line
                for (const candidate of candidates) {
                    const startIdx = candidate.lineIdx;
                    let foundMath = false;
                    // Combine current line and next few lines to ensure we get the full row data
                    const contextText = lines.slice(startIdx, startIdx + 6).join(' ');
                    
                    // Extract all numbers
                    const numberMatches = contextText.match(/\d+(?:,\d{3})*(?:\.\d+)?/g) || [];
                    const numbers = numberMatches.map(n => parseFloat(n.replace(/,/g, '')));
                    
                    // Filter out numbers that are part of the dimensions in the item name
                    const dimensions = item.item_name.match(/\d+/g) || [];
                    const filteredNumbers = numbers.filter(n => !dimensions.some(d => parseFloat(d) === n));

                    const knownQty = parseFloat(item.quantity) || 0;

                    // 1. Precise Table Row Pattern Matching
                    // Looking for: [Qty] [Any Text/Unit] [Weight] [Rate] [Amount]
                    const qtyIdx = numbers.findIndex(n => Math.abs(n - knownQty) < 0.01);
                    
                    if (qtyIdx !== -1 && numbers.length > qtyIdx + 2) {
                        const wCandidate = numbers[qtyIdx + (rateBeforeWeight ? 2 : 1)];
                        const rCandidate = numbers[qtyIdx + (rateBeforeWeight ? 1 : 2)];
                        const a = numbers[qtyIdx + 3] || 0;
                        
                        // Verification: w * r should be very close to a
                        // This confirms we have the right columns
                        if (a > 0 && Math.abs((wCandidate * rCandidate) - a) < (a * 0.05 + 10)) {
                            item.total_weight = wCandidate;
                            item.rate_per_kg = rCandidate;
                            foundMath = true;
                        } else if (numbers.length > qtyIdx + 2) {
                            // Fallback if Amount column isn't parsed correctly but sequence is likely
                            // In your PDF: Qty(2) Unit(Nos) Weight(1507.2) Rate(82)
                            item.total_weight = wCandidate;
                            item.rate_per_kg = rCandidate;
                            foundMath = true;
                        }
                    }

                    // 2. Relationship triplet matching (Weight * Rate = Total)
                    if (!foundMath) {
                        for (let i = 0; i < filteredNumbers.length; i++) {
                            for (let j = 0; j < filteredNumbers.length; j++) {
                                if (i === j) continue;
                                const n1 = filteredNumbers[i];
                                const n2 = filteredNumbers[j];
                                const prod = n1 * n2;
                                
                                // Check if any OTHER number matches this product (Amount)
                                const totalIdx = filteredNumbers.findIndex((n, idx) => 
                                    idx !== i && idx !== j && Math.abs(n - prod) < (prod * 0.02 + 5)
                                );

                                if (totalIdx !== -1) {
                                    // Use detected column sequence or heuristics
                                    if (rateBeforeWeight) {
                                        // If Rate comes before Weight in headers, first number in pair is likely Rate
                                        if (i < j) {
                                            item.rate_per_kg = n1;
                                            item.total_weight = n2;
                                        } else {
                                            item.rate_per_kg = n2;
                                            item.total_weight = n1;
                                        }
                                    } else {
                                        // Default: Weight then Rate or use larger number for weight if unknown
                                        if (i < j) {
                                            item.total_weight = n1;
                                            item.rate_per_kg = n2;
                                        } else {
                                            item.total_weight = n2;
                                            item.rate_per_kg = n1;
                                        }
                                    }
                                    foundMath = true;
                                    break;
                                }
                            }
                            if (foundMath) break;
                        }
                    }

                    if (foundMath) {
                        console.log(`Math verified match for "${item.item_name}": Weight=${item.total_weight}, Rate=${item.rate_per_kg}`);
                        break; // Stop at first math-verified line
                    }

                    // Fallback to Qty anchor if math fails
                    const qtyIdxFallback = filteredNumbers.findIndex(n => Math.abs(n - knownQty) < 0.01);
                    if (qtyIdxFallback !== -1 && qtyIdxFallback < filteredNumbers.length - 2) {
                        item.total_weight = filteredNumbers[qtyIdxFallback + 1];
                        item.rate_per_kg = filteredNumbers[qtyIdxFallback + 2];
                        console.log(`Qty-anchor match for "${item.item_name}": Weight=${item.total_weight}, Rate=${item.rate_per_kg}`);
                        break;
                    }
                }

                // Final calculation for internal unit_price
                if (item.total_weight && item.rate_per_kg) {
                    item.unit_price = (item.total_weight * item.rate_per_kg) / (parseFloat(item.quantity) || 1);
                }
            }

            return item;
        });

        // Calculate final total
        const totalAmount = updatedItems.reduce((sum, item) => {
            return sum + (item.total_weight * item.rate_per_kg || item.quantity * item.unit_price || 0);
        }, 0);

        // Cleanup temp file
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        res.json({ 
            items: updatedItems,
            total_amount: totalAmount 
        });

    } catch (error) {
        console.error('Error analyzing quotation:', error);
        res.status(500).json({ message: 'Error analyzing document: ' + error.message });
    }
};

const getCommunications = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                qc.*, 
                COALESCE(u.email, v.email) as sender_email,
                qc.created_at as received_at,
                qc.message as content_text
            FROM quotation_communications qc
            LEFT JOIN users u ON qc.sender_id = u.id
            LEFT JOIN quotations q ON qc.quotation_id = q.id
            LEFT JOIN vendors v ON q.vendor_id = v.id
            WHERE qc.quotation_id = ?
            ORDER BY qc.created_at DESC
        `;
        const [rows] = await db.query(query, [id]);
        
        // Fetch attachments for each communication
        for (let row of rows) {
            const [attachments] = await db.query(
                'SELECT id, file_name, file_size, mime_type FROM quotation_communication_attachments WHERE communication_id = ?',
                [row.id]
            );
            row.attachments = attachments;
        }
        
        // Mark all as read when viewed
        await db.query('UPDATE quotation_communications SET is_read = TRUE WHERE quotation_id = ? AND sender_id IS NULL', [id]);
        
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
            'SELECT file_path, file_name, mime_type FROM quotation_communication_attachments WHERE id = ?',
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

const sendQuotationEmail = async (req, res) => {
    const { id } = req.params;
    const { email, subject, message, pdfBase64 } = req.body;

    try {
        console.log(`Sending email to: ${email}`);
        
        const attachments = [];
        if (pdfBase64) {
            const base64Data = pdfBase64.split(',')[1] || pdfBase64;
            attachments.push({
                filename: `Quotation-${id}.pdf`,
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

        await db.query(
            'INSERT INTO quotation_communications (quotation_id, sender_id, message) VALUES (?, ?, ?)',
            [id, req.user?.id || 1, message || `Email sent to ${email} with subject: ${subject}`]
        );

        res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Email Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send email', 
            error: error.message 
        });
    }
};

const updateQuotationStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const file = req.file;

    try {
        let query = 'UPDATE quotations SET status = ?';
        const params = [status];

        if (file) {
            const uploadDir = (process.env.UPLOAD_PATH || 'uploads').replace(/\/$/, '').replace(/\\$/, '');
            // Always use forward slashes for database paths for cross-platform consistency
            const relativePath = `${uploadDir}/${file.filename}`;
            query += ', received_quotation_path = ?';
            params.push(relativePath);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await db.query(query, params);
        res.json({ 
            message: 'Status updated successfully',
            received_quotation_path: file ? path.join(process.env.UPLOAD_PATH || 'uploads', file.filename) : null
        });
    } catch (error) {
        console.error('Error updating quotation status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const downloadReceivedQuotation = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT received_quotation_path FROM quotations WHERE id = ?', [id]);
        
        if (rows.length === 0 || !rows[0].received_quotation_path) {
            return res.status(404).json({ message: 'Quotation file not found' });
        }

        // Normalize path separators to ensure cross-platform compatibility
        // And remove any duplicate slashes
        const normalizedPath = rows[0].received_quotation_path.replace(/\\/g, '/').replace(/\/+/g, '/');
        
        // Use path.resolve to get an absolute path starting from the backend root
        const filePath = path.resolve(__dirname, '..', normalizedPath);
        
        if (!fs.existsSync(filePath)) {
            console.error(`ERROR: Quotation PDF not found at ${filePath}`);
            return res.status(404).json({ message: 'File does not exist on server' });
        }

        const fileName = path.basename(filePath);
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/pdf');
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error downloading received quotation:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteQuotation = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // Delete items first (due to foreign key constraints if any)
        await connection.query('DELETE FROM quotation_items WHERE quotation_id = ?', [id]);
        
        // Delete communications and their attachments
        const [comms] = await connection.query('SELECT id FROM quotation_communications WHERE quotation_id = ?', [id]);
        for (const comm of comms) {
            const [attachments] = await connection.query('SELECT file_path FROM quotation_communication_attachments WHERE communication_id = ?', [comm.id]);
            for (const att of attachments) {
                const filePath = path.join(__dirname, '..', att.file_path);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            await connection.query('DELETE FROM quotation_communication_attachments WHERE communication_id = ?', [comm.id]);
        }
        await connection.query('DELETE FROM quotation_communications WHERE quotation_id = ?', [id]);
        
        // Delete quotation
        await connection.query('DELETE FROM quotations WHERE id = ?', [id]);
        
        await connection.commit();
        res.json({ message: 'Quotation deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting quotation:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

const createBOMVersionFromQuotation = async (connection, rootCardId, quotationItems) => {
    try {
        console.log(`BOM Versioning check started for Root Card ID: ${rootCardId}`);
        
        if (!rootCardId) {
            console.log('BOM Versioning skipped: No Root Card ID provided');
            return;
        }

        // 1. Check if any item has vendor_item_name or dimensions that are actually different
        const itemsWithAlternatives = (quotationItems || []).filter(item => {
            const hasDifferentName = item.vendor_item_name && 
                item.vendor_item_name.trim() !== '' && 
                item.vendor_item_name.trim().toLowerCase() !== (item.item_name || "").trim().toLowerCase();
            
            const hasDifferentDimensions = 
                (item.vendor_length !== null && item.vendor_length !== undefined && parseFloat(item.vendor_length) !== parseFloat(item.length)) ||
                (item.vendor_width !== null && item.vendor_width !== undefined && parseFloat(item.vendor_width) !== parseFloat(item.width)) ||
                (item.vendor_thickness !== null && item.vendor_thickness !== undefined && parseFloat(item.vendor_thickness) !== parseFloat(item.thickness)) ||
                (item.vendor_diameter !== null && item.vendor_diameter !== undefined && parseFloat(item.vendor_diameter) !== parseFloat(item.diameter)) ||
                (item.vendor_outer_diameter !== null && item.vendor_outer_diameter !== undefined && parseFloat(item.vendor_outer_diameter) !== parseFloat(item.outer_diameter)) ||
                (item.vendor_height !== null && item.vendor_height !== undefined && parseFloat(item.vendor_height) !== parseFloat(item.height)) ||
                (item.vendor_side_s !== null && item.vendor_side_s !== undefined && parseFloat(item.vendor_side_s) !== parseFloat(item.side_s)) ||
                (item.vendor_side_s1 !== null && item.vendor_side_s1 !== undefined && parseFloat(item.vendor_side_s1) !== parseFloat(item.side_s1)) ||
                (item.vendor_side_s2 !== null && item.vendor_side_s2 !== undefined && parseFloat(item.vendor_side_s2) !== parseFloat(item.side_s2));

            return hasDifferentName || hasDifferentDimensions;
        });
        
        console.log(`Found ${itemsWithAlternatives.length} items with different vendor details among ${quotationItems?.length || 0} items`);
        
        if (itemsWithAlternatives.length === 0) {
            console.log('No different vendor details found. Skipping BOM versioning.');
            return;
        }

        // 2. Find current active BOM for this root card
        console.log(`Searching for active BOM for Root Card: ${rootCardId}`);
        const [activeBoms] = await connection.query(
            'SELECT * FROM boms WHERE root_card_id = ? AND is_active = 1 LIMIT 1',
            [rootCardId]
        );

        let currentBom;
        if (activeBoms.length > 0) {
            currentBom = activeBoms[0];
        } else {
            // Fallback: find latest BOM for this root card
            const [latestBoms] = await connection.query(
                'SELECT * FROM boms WHERE root_card_id = ? ORDER BY created_at DESC LIMIT 1',
                [rootCardId]
            );
            if (latestBoms.length > 0) {
                currentBom = latestBoms[0];
                console.log(`No active BOM found, using latest BOM: ${currentBom.bom_number}`);
            }
        }

        if (!currentBom) {
            console.log(`CRITICAL: No BOM found for Root Card ID ${rootCardId}. BOM Versioning aborted.`);
            return;
        }

        console.log(`Found base BOM: ${currentBom.bom_number} (ID: ${currentBom.id})`);

        // 3. Generate new BOM number base (same base, new suffix)
        let baseBomNumber = currentBom.bom_number;
        if (baseBomNumber.includes('-V')) {
            baseBomNumber = baseBomNumber.split('-V')[0];
        }
        
        // Find the latest version number for this base BOM number
        const [lastBom] = await connection.query(
            'SELECT bom_number FROM boms WHERE bom_number LIKE ? ORDER BY bom_number DESC LIMIT 1',
            [`${baseBomNumber}-V%`]
        );
        let nextVersion = 1;
        if (lastBom.length > 0) {
            const lastBomNumber = lastBom[0].bom_number;
            const parts = lastBomNumber.split('-V');
            if (parts.length >= 2) {
                const lastVer = parseInt(parts[parts.length - 1]);
                if (!isNaN(lastVer)) {
                    nextVersion = lastVer + 1;
                }
            }
        }
        const newBomNumber = `${baseBomNumber}-V${nextVersion}`;
        
        console.log(`Generating new BOM version: ${newBomNumber} (Base: ${baseBomNumber})`);

        // 4. Create new BOM record
        const [bomResult] = await connection.query(
            `INSERT INTO boms 
            (root_card_id, bom_number, description, status, is_active, project_id, total_cost) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                currentBom.root_card_id,
                newBomNumber,
                `${currentBom.description || ''} (Vendor Alternative Revision)`,
                'approved',
                1, // Set new version as active
                currentBom.project_id,
                currentBom.total_cost
            ]
        );

        const newBomId = bomResult.insertId;
        console.log(`New BOM created with ID: ${newBomId}`);

        // 5. Deactivate ALL other BOMs for this root card
        await connection.query('UPDATE boms SET is_active = 0 WHERE root_card_id = ? AND id != ?', [currentBom.root_card_id, newBomId]);

        // 6. Copy and update materials
        const [originalMaterials] = await connection.query('SELECT * FROM bom_materials WHERE bom_id = ?', [currentBom.id]);
        console.log(`Copying ${originalMaterials.length} materials to new BOM...`);
        
        const newMaterialValues = originalMaterials.map(m => {
            // Check if this material matches any quotation item with alternative
            // Use fuzzy matching (trim and lowercase)
            const alternative = itemsWithAlternatives.find(aq => 
                (aq.item_name || "").trim().toLowerCase() === (m.item_name || "").trim().toLowerCase()
            );
            
            if (alternative) {
                console.log(`Updating material in BOM Revision: "${m.item_name}" -> "${alternative.vendor_item_name}"`);
            }

            return [
                newBomId,
                alternative ? alternative.vendor_item_name : m.item_name,
                alternative ? alternative.vendor_item_name : m.vendor_item_name,
                m.item_group,
                m.material_grade,
                m.part_detail,
                m.remark,
                m.make,
                alternative ? alternative.quantity : m.quantity,
                alternative ? (alternative.unit || alternative.uom || m.uom) : m.uom,
                m.rate,
                alternative ? (alternative.total_weight * (alternative.rate_per_kg || 0)) : m.total_amount,
                m.warehouse,
                m.operation,
                alternative ? alternative.rate_per_kg : (m.rate_per_kg || 0),
                alternative ? alternative.total_weight : (m.total_weight || 0),
                (alternative && alternative.vendor_length !== null && alternative.vendor_length !== undefined) ? alternative.vendor_length : (alternative ? alternative.length : m.length),
                (alternative && alternative.vendor_width !== null && alternative.vendor_width !== undefined) ? alternative.vendor_width : (alternative ? alternative.width : m.width),
                (alternative && alternative.vendor_thickness !== null && alternative.vendor_thickness !== undefined) ? alternative.vendor_thickness : (alternative ? alternative.thickness : m.thickness),
                (alternative && alternative.vendor_diameter !== null && alternative.vendor_diameter !== undefined) ? alternative.vendor_diameter : (alternative ? alternative.diameter : m.diameter),
                (alternative && alternative.vendor_outer_diameter !== null && alternative.vendor_outer_diameter !== undefined) ? alternative.vendor_outer_diameter : (alternative ? alternative.outer_diameter : m.outer_diameter),
                (alternative && alternative.vendor_height !== null && alternative.vendor_height !== undefined) ? alternative.vendor_height : (alternative ? alternative.height : m.height),
                (alternative && alternative.vendor_side_s !== null && alternative.vendor_side_s !== undefined) ? alternative.vendor_side_s : (alternative ? alternative.side_s : m.side_s),
                (alternative && alternative.vendor_side_s1 !== null && alternative.vendor_side_s1 !== undefined) ? alternative.vendor_side_s1 : (alternative ? alternative.side_s1 : m.side_s1),
                (alternative && alternative.vendor_side_s2 !== null && alternative.vendor_side_s2 !== undefined) ? alternative.vendor_side_s2 : (alternative ? alternative.side_s2 : m.side_s2)
            ];
        });

        if (newMaterialValues.length > 0) {
            await connection.query(
                `INSERT INTO bom_materials 
                (bom_id, item_name, vendor_item_name, item_group, material_grade, part_detail, remark, make, quantity, uom, rate, total_amount, warehouse, operation, rate_per_kg, total_weight, length, width, thickness, diameter, outer_diameter, height, side_s, side_s1, side_s2) 
                VALUES ?`,
                [newMaterialValues]
            );
        }

        // 7. Copy operations
        const [originalOperations] = await connection.query('SELECT * FROM bom_operations WHERE bom_id = ?', [currentBom.id]);
        if (originalOperations.length > 0) {
            const operationValues = originalOperations.map(o => [
                newBomId, o.operation_name, o.workstation, o.cycle_time, o.setup_time, o.hourly_rate, o.cost
            ]);
            await connection.query(
                `INSERT INTO bom_operations 
                (bom_id, operation_name, workstation, cycle_time, setup_time, hourly_rate, cost) 
                VALUES ?`,
                [operationValues]
            );
        }

        console.log(`Successfully created new BOM version ${newBomNumber} for Root Card ${rootCardId}`);

        // 8. Notify Production Department
        // Fetch project name for the notification
        const [rcRows] = await connection.query('SELECT project_name FROM root_cards WHERE id = ?', [rootCardId]);
        const projectName = rcRows.length > 0 ? rcRows[0].project_name : rootCardId;

        await connection.query(
            `INSERT INTO notifications (department, title, message, type) 
            VALUES (?, ?, ?, ?)`,
            [
                'Production',
                'New BOM Revision Created',
                `A new revision (${newBomNumber}) has been automatically created for Project "${projectName}" due to vendor material changes. It is now set as the ACTIVE BOM.`,
                'warning'
            ]
        );
    } catch (error) {
        console.error('Error creating BOM version from quotation:', error);
    }
};

module.exports = {
    getQuotations,
    getQuotationById,
    createQuotation,
    getQuotationStats,
    getVendors,
    getVendorById,
    getVendorStats,
    getVendorCategories,
    createVendor,
    updateVendor,
    deleteVendor,
    deleteQuotation,
    analyzeQuotation,
    downloadReceivedQuotation,
    getCommunications,
    downloadAttachment,
    sendQuotationEmail,
    updateQuotationStatus
};
