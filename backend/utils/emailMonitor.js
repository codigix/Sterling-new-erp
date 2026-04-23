const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const UPLOAD_BASE = process.env.UPLOAD_PATH || 'uploads';
const UPLOADS_DIR_QUOTES = path.resolve(__dirname, '..', UPLOAD_BASE, 'quotations');
const UPLOADS_DIR_POS = path.resolve(__dirname, '..', UPLOAD_BASE, 'purchase_orders');

// Ensure uploads directories exist
[UPLOADS_DIR_QUOTES, UPLOADS_DIR_POS].forEach(dir => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Email Monitor: Created directory ${dir}`);
        }
    } catch (err) {
        console.error(`Email Monitor: Failed to create directory ${dir}:`, err.message);
    }
});

let lastErrorLogged = 0;
const ERROR_LOG_INTERVAL = 30 * 60 * 1000; // Log error at most once every 30 minutes

const monitorReplies = async () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        const now = Date.now();
        if (now - lastErrorLogged > ERROR_LOG_INTERVAL) {
            console.warn('Email Monitor: EMAIL_USER or EMAIL_PASS not set in environment.');
            lastErrorLogged = now;
        }
        return;
    }

    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        logger: false
    });

    // Handle unexpected connection resets/errors to prevent process crash
    client.on('error', err => {
        // Only log serious errors, ignore ECONNRESET as we handle it via try-catch
        if (err.code !== 'ECONNRESET') {
            console.error('IMAP Client Error:', err.message);
        }
    });

    try {
        await client.connect();
        
        // Select and lock the INBOX
        let lock = await client.getMailboxLock('INBOX');
        try {
            // Search for unread messages
            for await (let message of client.fetch({ unseen: true }, { source: true, envelope: true })) {
                try {
                    const parsed = await simpleParser(message.source);
                    const subject = parsed.subject || '';
                    
                    // Match RFQ-YYYY-NNNN, QTN-YYYY-NNNN or PO-YYYY-NNNN
                    const match = subject.match(/(RFQ|QTN|PO)-\d{4}-\d{4}/);
                    if (match) {
                        const referenceNumber = match[0];
                        const isPO = referenceNumber.startsWith('PO-');
                        console.log(`Found possible reply for: ${referenceNumber}`);

                        // Find reference in DB
                        let refId;
                        if (isPO) {
                            const [pos] = await db.query('SELECT id FROM purchase_orders WHERE po_number = ?', [referenceNumber]);
                            if (pos.length > 0) refId = pos[0].id;
                        } else {
                            const [quotes] = await db.query('SELECT id FROM quotations WHERE quotation_number = ?', [referenceNumber]);
                            if (quotes.length > 0) refId = quotes[0].id;
                        }

                        if (refId) {
                            // Get clean content (prefer text, fallback to html)
                            let content = parsed.text || (parsed.html ? parsed.html.replace(/<[^>]*>?/gm, '') : '');
                            
                            // Strip quoted text (common patterns like "On Sat, Mar..." or ">")
                            if (content) {
                                // Split by the common reply header and take the first part
                                const replyHeaders = [
                                    /\n\s*On\s+.*\s+at\s+.*\s+wrote:\s*\n/i,
                                    /\n\s*From:.*\s*\n/i,
                                    /\n\s*-+\s*Original Message\s*-+\s*\n/i
                                ];
                                
                                for (const pattern of replyHeaders) {
                                    const match = content.match(pattern);
                                    if (match) {
                                        content = content.substring(0, match.index);
                                        break;
                                    }
                                }
                                
                                // Also remove lines starting with >
                                content = content.split('\n')
                                    .filter(line => !line.trim().startsWith('>'))
                                    .join('\n')
                                    .trim();
                            }
                            
                            // Check if this exact message was already recorded
                            const tableName = isPO ? 'purchase_order_communications' : 'quotation_communications';
                            const idCol = isPO ? 'purchase_order_id' : 'quotation_id';
                            
                            const [existing] = await db.query(
                                `SELECT id FROM ${tableName} WHERE ${idCol} = ? AND message = ? AND created_at > (NOW() - INTERVAL 1 DAY)`, 
                                [refId, content]
                            );

                            if (existing.length === 0) {
                                // 1. Save the communication record
                                const hasAttachments = parsed.attachments && parsed.attachments.length > 0;
                                const [commResult] = await db.query(
                                    `INSERT INTO ${tableName} (${idCol}, sender_id, message, is_read, is_outgoing, sender_email, subject, content_text, has_attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [refId, null, content, false, false, parsed.from?.value[0]?.address || '', subject, content, hasAttachments]
                                );
                                
                                const communicationId = commResult.insertId;
                                console.log(`Saved vendor reply for ${referenceNumber} (ID: ${communicationId})`);

                                // 2. Handle attachments
                                if (parsed.attachments && parsed.attachments.length > 0) {
                                    const attachTableName = isPO ? 'purchase_order_communication_attachments' : 'quotation_communication_attachments';
                                    const uploadDir = isPO ? UPLOADS_DIR_POS : UPLOADS_DIR_QUOTES;
                                    const uploadPath = isPO ? 'uploads/purchase_orders/' : 'uploads/quotations/';

                                    for (const attachment of parsed.attachments) {
                                        const fileName = attachment.filename || `attachment_${Date.now()}`;
                                        const safeFileName = `${communicationId}_${Date.now()}_${fileName.replace(/[^a-z0-9.]/gi, '_')}`;
                                        const filePath = path.join(uploadDir, safeFileName);
                                        const relativePath = path.join(UPLOAD_BASE, isPO ? 'purchase_orders' : 'quotations', safeFileName).replace(/\\/g, '/');

                                        try {
                                            fs.writeFileSync(filePath, attachment.content);
                                            console.log(`Email Monitor: Saved attachment to ${filePath}`);
                                            
                                            await db.query(
                                                `INSERT INTO ${attachTableName} 
                                                (communication_id, file_name, file_path, file_size, mime_type) 
                                                VALUES (?, ?, ?, ?, ?)`,
                                                [communicationId, fileName, relativePath, attachment.size, attachment.contentType]
                                            );
                                            console.log(`Email Monitor: Recorded attachment ${fileName} in database`);
                                        } catch (fsError) {
                                            console.error(`Email Monitor: Failed to save attachment ${fileName} to ${filePath}:`, fsError.message);
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (parseError) {
                    console.error('Error parsing individual email:', parseError);
                }
            }
        } finally {
            // release lock
            if (lock) lock.release();
        }
        
        await client.logout();
    } catch (err) {
        // Log the error but don't crash the server. Rate limit to 30 mins
        const now = Date.now();
        if (now - lastErrorLogged > ERROR_LOG_INTERVAL) {
            console.error('Email Monitor Connection Error:', err.message);
            lastErrorLogged = now;
        }
    }
};

// Start periodic monitoring (every 60 seconds)
const startEmailMonitor = () => {
    console.log('Starting Email Monitoring System...');
    // Initial run
    monitorReplies();
    // Schedule
    setInterval(monitorReplies, 60000);
};

module.exports = { startEmailMonitor };
