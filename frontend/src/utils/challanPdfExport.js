import jsPDF from 'jspdf';
import 'jspdf-autotable';

const loadImage = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
};

export const exportChallanToPDF = async (challanData, items) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Configuration
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    // 1. Draw Border
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, contentWidth, doc.internal.pageSize.getHeight() - (margin * 2));

    // 2. Header Section
    doc.setLineWidth(0.3);
    doc.line(margin, margin + 30, margin + contentWidth, margin + 30); // Horizontal line below logo area
    doc.line(margin + (contentWidth * 0.4), margin, margin + (contentWidth * 0.4), margin + 30); // Vertical line after logo

    // Logo Area (Image & Text)
    try {
        const logo = await loadImage("/logo.png");
        // Center the logo in the 76mm width box (X from 10 to 86, center is 48)
        // Draw logo image at X = 43, Y = 11, width = 10, height = 10
        doc.addImage(logo, 'PNG', 43, 11, 10, 10);
    } catch (error) {
        console.warn("Logo failed to load:", error);
    }

    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('STERLING TECHNO-SYSTEMS', margin + (contentWidth * 0.2), margin + 17, { align: 'center' }); // Y = 27
    doc.text('PVT. LTD.', margin + (contentWidth * 0.2), margin + 21, { align: 'center' }); // Y = 31

    // Company Info (Right aligned to match screen preview)
    const rightAlignX = margin + contentWidth - 2;
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('Engineers Consultants and Manufacturers', rightAlignX, margin + 8, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    doc.text('Gat No. 70, Sonawanewasti, Talawade, Pune - 411062, Maharashtra (India)', rightAlignX, margin + 13, { align: 'right' });
    doc.text('Telefax: +91-20-27353051', rightAlignX, margin + 17, { align: 'right' });
    doc.text('GST No. 27AARCS2886C1ZX', rightAlignX, margin + 21, { align: 'right' });
    doc.setTextColor(0, 0, 255);
    doc.text('Web.: www.sterling-techno.com', rightAlignX, margin + 25, { align: 'right' });
    doc.setTextColor(0);

    // 3. Title Bar
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, margin + 30, contentWidth, 8, 'F');
    doc.setFont(undefined, 'bolditalic');
    doc.setFontSize(9);
    const titleText = 'DELIVERY / PROCESS CHALLAN';
    doc.text(titleText, pageWidth / 2, margin + 35, { align: 'center' });
    const titleWidth = doc.getTextWidth(titleText);
    doc.line((pageWidth / 2) - (titleWidth / 2), margin + 36, (pageWidth / 2) + (titleWidth / 2), margin + 36);
    doc.line(margin, margin + 38, margin + contentWidth, margin + 38);

    // 4. Vendor and Challan Info
    doc.line(margin + (contentWidth / 2), margin + 38, margin + (contentWidth / 2), margin + 80); // Vertical middle line
    doc.line(margin, margin + 80, margin + contentWidth, margin + 80); // Horizontal line below info

    // Left: To Vendor
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('To,', margin + 2, margin + 45);
    doc.setFontSize(10);
    doc.text(challanData.vendor_name || '-', margin + 10, margin + 45);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const splitAddress = doc.splitTextToSize(challanData.vendor_address || '-', (contentWidth / 2) - 15);
    doc.text(splitAddress, margin + 10, margin + 50);

    // Right: Challan Info
    const startXRight = margin + (contentWidth / 2);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    
    // Grid lines for right section
    [48, 58, 68].forEach(y => doc.line(startXRight, margin + y, margin + contentWidth, margin + y));

    doc.text('Challan No:-', startXRight + 2, margin + 44);
    doc.setTextColor(79, 70, 229);
    doc.text(challanData.challan_no || '-', startXRight + 35, margin + 44);
    doc.setTextColor(0);

    doc.text('Date:-', startXRight + 2, margin + 54);
    doc.text(challanData.challan_date ? new Date(challanData.challan_date).toLocaleDateString('en-GB') : '-', startXRight + 35, margin + 54);

    doc.text('Supply Order No.:', startXRight + 2, margin + 64);
    doc.text(challanData.supply_order_no || '-', startXRight + 35, margin + 64);

    doc.text('Date:', startXRight + 2, margin + 74);
    doc.text(challanData.supply_order_date ? new Date(challanData.supply_order_date).toLocaleDateString('en-GB') : '-', startXRight + 35, margin + 74);

    // 5. Instruction Bar
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, margin + 80, contentWidth, 6, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(6.5);
    doc.text('Please Receive The Following Articles In Good Condition & Pl. Sign Duplicate Challan In Token of Having Received The Materials', pageWidth / 2, margin + 84, { align: 'center' });
    doc.line(margin, margin + 86, margin + contentWidth, margin + 86);

    // 6. Items Table
    const tableBody = items.map((item, index) => [
        index + 1,
        { content: `${item.item_name || '-'}\n${item.item_code || '-'}`, styles: { fontStyle: 'bold' } },
        item.uom || '-',
        item.dispatch_qty ? parseFloat(item.dispatch_qty).toString() : '-'
    ]);

    // Pad tableBody with empty rows to have at least 10 rows
    if (tableBody.length < 10) {
        const emptyRowsCount = 10 - tableBody.length;
        for (let i = 0; i < emptyRowsCount; i++) {
            tableBody.push([
                '',
                '\n', // Ensures row height is matching description size
                '',
                ''
            ]);
        }
    }

    doc.autoTable({
        body: tableBody,
        columns: [
            { header: 'Sr. No', dataKey: 0 },
            { header: 'DESCRIPTION & SPECIFICATION', dataKey: 1 },
            { header: 'UNIT', dataKey: 2 },
            { header: 'QTY.', dataKey: 3 }
        ],
        startY: margin + 86,
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        theme: 'plain',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            textColor: [0, 0, 0],
            lineWidth: 0 // No default borders
        },
        headStyles: {
            fillColor: [245, 245, 245],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            minCellHeight: 12
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'right', cellWidth: 25, fontStyle: 'bold' }
        },
        didDrawCell: (data) => {
            // Draw vertical column dividers
            if (data.column.index < 3) {
                const x = data.cell.x + data.cell.width;
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                doc.line(x, data.cell.y, x, data.cell.y + data.cell.height);
            }
            
            // Draw horizontal bottom border for header row
            if (data.row.section === 'head') {
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
            
            // Draw horizontal bottom border for active item rows
            if (data.row.section === 'body' && data.row.index < items.length) {
                doc.setDrawColor(220, 220, 220); // light grey
                doc.setLineWidth(0.15);
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
        }
    });

    const finalY = doc.lastAutoTable.finalY;

    // 7. Footer Sections
    let footerStartY = finalY;
    if (footerStartY > 232) {
        // Overflow to next page if not enough space for footer and signatures
        doc.addPage();
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(margin, margin, contentWidth, doc.internal.pageSize.getHeight() - (margin * 2));
        footerStartY = margin + 10;
    } else {
        if (footerStartY < 232) {
            footerStartY = 232;
        }
    }

    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(margin, footerStartY, margin + contentWidth, footerStartY);
    doc.line(margin + (contentWidth * 0.7), footerStartY, margin + (contentWidth * 0.7), footerStartY + 15);

    // Left Column: Despatched Through Info
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    
    doc.text('Despatched Through:', margin + 2, footerStartY + 3.5);
    doc.text(challanData.despatched_through || '-', margin + 45, footerStartY + 3.5);
    doc.line(margin, footerStartY + 5, margin + (contentWidth * 0.7), footerStartY + 5);
    
    doc.text('Against L. R./ R. R. No.:', margin + 2, footerStartY + 8.5);
    doc.text(challanData.against_lr_rr_no || '-', margin + 45, footerStartY + 8.5);
    doc.line(margin, footerStartY + 10, margin + (contentWidth * 0.7), footerStartY + 10);
    
    doc.text('Frieght Paid / To Pay:', margin + 2, footerStartY + 13.5);
    doc.text(challanData.freight_type || '-', margin + 45, footerStartY + 13.5);
    doc.line(margin, footerStartY + 15, margin + contentWidth, footerStartY + 15);

    // Right Column: Total Qty Box
    const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.dispatch_qty) || 0), 0);
    const totalQtyCenterX = margin + (contentWidth * 0.85);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('TOTAL QTY', totalQtyCenterX, footerStartY + 4.5, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(totalQty.toString(), totalQtyCenterX, footerStartY + 11.5, { align: 'center' });

    // 8. Signatures Block
    const sigY = footerStartY + 15;
    doc.line(margin + (contentWidth / 2), sigY, margin + (contentWidth / 2), doc.internal.pageSize.getHeight() - margin);

    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    
    // Top-left text
    const leftText = 'RECEIVED THE MATERIALS IN GOOD CONDITION';
    doc.text(leftText, margin + 2, sigY + 5);
    const textWidth = doc.getTextWidth(leftText);
    doc.line(margin + 2, sigY + 6, margin + 2 + textWidth, sigY + 6);
    
    // Bottom-left text
    doc.text('Customer Signature With Stamp', margin + 2, doc.internal.pageSize.getHeight() - margin - 5);

    // Top-right text
    doc.text('For Sterling Techno-systems Pvt. Ltd.', margin + (contentWidth * 0.75), sigY + 5, { align: 'center' });
    
    // Dotted signature line
    doc.setLineDash([1, 1], 0);
    doc.line(margin + (contentWidth * 0.6), doc.internal.pageSize.getHeight() - margin - 10, margin + (contentWidth * 0.9), doc.internal.pageSize.getHeight() - margin - 10);
    doc.setLineDash([], 0);
    
    // Bottom-right text
    doc.text('Authorised Signatory', margin + (contentWidth * 0.75), doc.internal.pageSize.getHeight() - margin - 5, { align: 'center' });

    // Save
    doc.save(`Challan_${challanData.challan_no}.pdf`);
};

export const exportInwardChallanToPDF = async (challanData, items) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Configuration
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    // 1. Draw Border
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, contentWidth, doc.internal.pageSize.getHeight() - (margin * 2));

    // 2. Header Section
    doc.setLineWidth(0.3);
    doc.line(margin, margin + 30, margin + contentWidth, margin + 30); // Horizontal line below logo area
    doc.line(margin + (contentWidth * 0.4), margin, margin + (contentWidth * 0.4), margin + 30); // Vertical line after logo

    // Logo Area (Image & Text)
    try {
        const logo = await loadImage("/logo.png");
        doc.addImage(logo, 'PNG', 43, 11, 10, 10);
    } catch (error) {
        console.warn("Logo failed to load:", error);
    }

    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('STERLING TECHNO-SYSTEMS', margin + (contentWidth * 0.2), margin + 17, { align: 'center' });
    doc.text('PVT. LTD.', margin + (contentWidth * 0.2), margin + 21, { align: 'center' });

    // Company Info (Right aligned to match screen preview)
    const rightAlignX = margin + contentWidth - 2;
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('Engineers Consultants and Manufacturers', rightAlignX, margin + 8, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    doc.text('Gat No. 70, Sonawanewasti, Talawade, Pune - 411062, Maharashtra (India)', rightAlignX, margin + 13, { align: 'right' });
    doc.text('Telefax: +91-20-27353051', rightAlignX, margin + 17, { align: 'right' });
    doc.text('GST No. 27AARCS2886C1ZX', rightAlignX, margin + 21, { align: 'right' });
    doc.setTextColor(0, 0, 255);
    doc.text('Web.: www.sterling-techno.com', rightAlignX, margin + 25, { align: 'right' });
    doc.setTextColor(0);

    // 3. Title Bar
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, margin + 30, contentWidth, 8, 'F');
    doc.setFont(undefined, 'bolditalic');
    doc.setFontSize(9);
    const titleText = 'INWARD / RECEIPT CHALLAN';
    doc.text(titleText, pageWidth / 2, margin + 35, { align: 'center' });
    const titleWidth = doc.getTextWidth(titleText);
    doc.line((pageWidth / 2) - (titleWidth / 2), margin + 36, (pageWidth / 2) + (titleWidth / 2), margin + 36);
    doc.line(margin, margin + 38, margin + contentWidth, margin + 38);

    // 4. Vendor and Challan Info
    doc.line(margin + (contentWidth / 2), margin + 38, margin + (contentWidth / 2), margin + 80); // Vertical middle line
    doc.line(margin, margin + 80, margin + contentWidth, margin + 80); // Horizontal line below info

    // Left: From Vendor
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('From:', margin + 2, margin + 45);
    doc.setFontSize(10);
    doc.text(challanData.vendor_name || '-', margin + 12, margin + 45);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const splitAddress = doc.splitTextToSize(challanData.vendor_address || '-', (contentWidth / 2) - 15);
    doc.text(splitAddress, margin + 12, margin + 50);

    // Right: Challan Info
    const startXRight = margin + (contentWidth / 2);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    
    // Grid lines for right section
    [48, 58, 68].forEach(y => doc.line(startXRight, margin + y, margin + contentWidth, margin + y));

    doc.text('Inward No:', startXRight + 2, margin + 44);
    doc.setTextColor(16, 185, 129); // emerald green
    doc.text(challanData.challan_no || '-', startXRight + 35, margin + 44);
    doc.setTextColor(0);

    doc.text('Challan Date:', startXRight + 2, margin + 54);
    doc.text(challanData.challan_date ? new Date(challanData.challan_date).toLocaleDateString('en-GB') : '-', startXRight + 35, margin + 54);

    doc.text('Received On:', startXRight + 2, margin + 64);
    doc.text(challanData.received_date ? new Date(challanData.received_date).toLocaleDateString('en-GB') : '-', startXRight + 35, margin + 64);

    doc.text('Outward Ref:', startXRight + 2, margin + 74);
    doc.setTextColor(79, 70, 229);
    doc.text(challanData.outward_challan_no || '-', startXRight + 35, margin + 74);
    doc.setTextColor(0);

    // 5. Items Table
    const tableBody = items.map((item, index) => {
        const itemDesc = `${item.item_name || '-'}\n${item.item_code || '-'}${item.batch_no ? `\nST#: ${item.batch_no}` : ''}`;
        return [
            index + 1,
            { content: itemDesc, styles: { fontStyle: 'bold' } },
            item.sent_qty ? (parseFloat(item.sent_qty) || 0).toString() : '0',
            item.received_qty ? (parseFloat(item.received_qty) || 0).toString() : '0',
            item.accepted_qty ? (parseFloat(item.accepted_qty) || 0).toString() : '0',
            item.rejected_qty ? (parseFloat(item.rejected_qty) || 0).toString() : '0',
            item.remarks || '-'
        ];
    });

    // Pad tableBody with empty rows to have at least 8 rows
    if (tableBody.length < 8) {
        const emptyRowsCount = 8 - tableBody.length;
        for (let i = 0; i < emptyRowsCount; i++) {
            tableBody.push([
                '',
                '\n',
                '',
                '',
                '',
                '',
                ''
            ]);
        }
    }

    doc.autoTable({
        body: tableBody,
        columns: [
            { header: 'Sr.', dataKey: 0 },
            { header: 'ITEM DESCRIPTION', dataKey: 1 },
            { header: 'SENT', dataKey: 2 },
            { header: 'RECV.', dataKey: 3 },
            { header: 'ACCPT.', dataKey: 4 },
            { header: 'REJT.', dataKey: 5 },
            { header: 'REMARKS / REASON', dataKey: 6 }
        ],
        startY: margin + 80,
        margin: { left: margin, right: margin },
        tableWidth: contentWidth,
        theme: 'plain',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            textColor: [0, 0, 0],
            lineWidth: 0
        },
        headStyles: {
            fillColor: [245, 245, 245],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            minCellHeight: 12
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left' },
            2: { halign: 'right', cellWidth: 15 },
            3: { halign: 'right', cellWidth: 15 },
            4: { halign: 'right', cellWidth: 15, fontStyle: 'bold', textColor: [16, 185, 129] },
            5: { halign: 'right', cellWidth: 15, fontStyle: 'bold', textColor: [220, 38, 38] },
            6: { halign: 'left', cellWidth: 35 }
        },
        didDrawCell: (data) => {
            // Draw vertical column dividers
            if (data.column.index < 6) {
                const x = data.cell.x + data.cell.width;
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                doc.line(x, data.cell.y, x, data.cell.y + data.cell.height);
            }
            
            // Draw horizontal bottom border for header row
            if (data.row.section === 'head') {
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
            
            // Draw horizontal bottom border for active item rows
            if (data.row.section === 'body' && data.row.index < items.length) {
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.15);
                doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            }
        }
    });

    const finalY = doc.lastAutoTable.finalY;

    // 7. Footer Sections
    let footerStartY = finalY;
    if (footerStartY > 232) {
        doc.addPage();
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.rect(margin, margin, contentWidth, doc.internal.pageSize.getHeight() - (margin * 2));
        footerStartY = margin + 10;
    } else {
        if (footerStartY < 232) {
            footerStartY = 232;
        }
    }

    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(margin, footerStartY, margin + contentWidth, footerStartY);
    doc.line(margin + (contentWidth * 0.6), footerStartY, margin + (contentWidth * 0.6), footerStartY + 15);
    doc.line(margin + (contentWidth * 0.8), footerStartY, margin + (contentWidth * 0.8), footerStartY + 15);

    // Left Column: General Remarks & Vehicle No
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    
    doc.text('General Remarks:', margin + 2, footerStartY + 4.5);
    doc.setFont(undefined, 'normal');
    doc.text(challanData.remarks || 'No additional remarks', margin + 30, footerStartY + 4.5);
    
    doc.setFont(undefined, 'bold');
    doc.text('Vehicle No:', margin + 2, footerStartY + 11.5);
    doc.text(challanData.vehicle_no || 'N/A', margin + 30, footerStartY + 11.5);

    doc.line(margin, footerStartY + 15, margin + contentWidth, footerStartY + 15);

    // Total Received Box
    const totalReceived = items.reduce((sum, item) => sum + (parseFloat(item.received_qty) || 0), 0);
    const totalReceivedCenterX = margin + (contentWidth * 0.7);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('TOTAL RECEIVED', totalReceivedCenterX, footerStartY + 4.5, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text(totalReceived.toString(), totalReceivedCenterX, footerStartY + 11.5, { align: 'center' });

    // Total Accepted Box
    const totalAccepted = items.reduce((sum, item) => sum + (parseFloat(item.accepted_qty) || 0), 0);
    const totalAcceptedCenterX = margin + (contentWidth * 0.9);
    doc.setFontSize(6.5);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text('TOTAL ACCEPTED', totalAcceptedCenterX, footerStartY + 4.5, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.setFont(undefined, 'bold');
    doc.text(totalAccepted.toString(), totalAcceptedCenterX, footerStartY + 11.5, { align: 'center' });
    doc.setTextColor(0);

    // 8. Signatures Block
    const sigY = footerStartY + 15;
    doc.line(margin + (contentWidth / 2), sigY, margin + (contentWidth / 2), doc.internal.pageSize.getHeight() - margin);

    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    
    // Top-left text
    doc.text('Checked By / Store Keeper', margin + 2, sigY + 5);
    
    // Bottom-left signature line
    doc.setLineDash([1, 1], 0);
    doc.line(margin + 5, doc.internal.pageSize.getHeight() - margin - 10, margin + 50, doc.internal.pageSize.getHeight() - margin - 10);
    doc.setLineDash([], 0);

    // Top-right text
    doc.text('Authorised Signatory', margin + (contentWidth * 0.75), sigY + 5, { align: 'center' });
    
    // Dotted signature line
    doc.setLineDash([1, 1], 0);
    doc.line(margin + (contentWidth * 0.6), doc.internal.pageSize.getHeight() - margin - 10, margin + (contentWidth * 0.9), doc.internal.pageSize.getHeight() - margin - 10);
    doc.setLineDash([], 0);
    
    // Bottom-right text
    doc.text('Authorised Signatory', margin + (contentWidth * 0.75), doc.internal.pageSize.getHeight() - margin - 5, { align: 'center' });

    // Save
    doc.save(`Inward_Challan_${challanData.challan_no}.pdf`);
};
