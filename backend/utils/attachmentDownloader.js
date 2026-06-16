const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Dynamically fetches a missing attachment from Gmail by searching for the corresponding email.
 * @param {string} type - 'quotation' or 'purchase_order'
 * @param {number} attachmentId - The ID of the attachment record
 * @returns {Promise<string|null>} - Returns the local absolute path of the downloaded file, or null if not found
 */
const downloadMissingAttachmentFromEmail = async (type, attachmentId) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('attachmentDownloader: EMAIL_USER or EMAIL_PASS not set.');
    return null;
  }

  console.log(`attachmentDownloader: Attempting to download missing ${type} attachment ID ${attachmentId} from email...`);

  const attachTable = type === 'purchase_order' 
    ? 'purchase_order_communication_attachments' 
    : 'quotation_communication_attachments';
    
  const commTable = type === 'purchase_order' 
    ? 'purchase_order_communications' 
    : 'quotation_communications';

  try {
    // 1. Get attachment and communication details from DB
    const [attRows] = await db.query(
      `SELECT a.file_name, a.file_path, c.sender_email, c.subject 
       FROM ${attachTable} a
       JOIN ${commTable} c ON a.communication_id = c.id
       WHERE a.id = ?`,
      [attachmentId]
    );

    if (attRows.length === 0) {
      console.error(`attachmentDownloader: Attachment record not found in DB for ID ${attachmentId}`);
      return null;
    }

    const { file_name, file_path, sender_email, subject } = attRows[0];
    if (!sender_email || !subject) {
      console.warn(`attachmentDownloader: Sender email or subject missing in DB record.`);
      return null;
    }

    // Determine target save path
    const projectRoot = path.resolve(__dirname, '..');
    const localSavePath = path.join(projectRoot, file_path);
    const localSaveDir = path.dirname(localSavePath);

    // Clean subject for search - find PO- or RFQ- number
    const match = subject.match(/(RFQ|QTN|PO)-\d{4}-\d{4}/);
    const searchSubject = match ? match[0] : subject;

    // 2. Connect to IMAP
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

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    let fileDownloadedPath = null;

    try {
      const searchOptions = {
        from: sender_email,
        subject: searchSubject
      };

      console.log(`attachmentDownloader: Searching INBOX for messages matching:`, searchOptions);
      
      const messages = [];
      for await (let msg of client.fetch(searchOptions, { source: true })) {
        messages.push(msg);
      }

      console.log(`attachmentDownloader: Found ${messages.length} matching messages.`);

      for (const msg of messages) {
        const parsed = await simpleParser(msg.source);
        if (parsed.attachments && parsed.attachments.length > 0) {
          const matchAttachment = parsed.attachments.find(a => a.filename === file_name);
          if (matchAttachment) {
            // Ensure directory exists
            if (!fs.existsSync(localSaveDir)) {
              fs.mkdirSync(localSaveDir, { recursive: true });
            }
            // Write file
            fs.writeFileSync(localSavePath, matchAttachment.content);
            console.log(`attachmentDownloader: Successfully downloaded and saved file to ${localSavePath}`);
            fileDownloadedPath = localSavePath;
            break;
          }
        }
      }
    } finally {
      lock.release();
      await client.logout();
    }

    return fileDownloadedPath;
  } catch (error) {
    console.error('attachmentDownloader: Error downloading missing attachment:', error);
    return null;
  }
};

module.exports = {
  downloadMissingAttachmentFromEmail
};
