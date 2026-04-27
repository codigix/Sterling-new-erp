import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportChallanToPDF = (challanData, items) => {
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

    // Logo Area (Placeholder for text)
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('STERLING TECHNO-SYSTEMS', margin + (contentWidth * 0.2), margin + 15, { align: 'center' });
    doc.text('PVT. LTD.', margin + (contentWidth * 0.2), margin + 20, { align: 'center' });

    // Company Info
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('ENGINEERS CONSULTANTS AND MANUFACTURERS', margin + (contentWidth * 0.4) + 2, margin + 8);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    doc.text('Gat No. 70, Sonawanewasti, Talawade, Pune - 411062, Maharashtra (India)', margin + (contentWidth * 0.4) + 2, margin + 13);
    doc.text('Telefax: +91-20-27353051', margin + (contentWidth * 0.4) + 2, margin + 17);
    doc.text('GST No. 27AARCS2886C1ZX', margin + (contentWidth * 0.4) + 2, margin + 21);
    doc.setTextColor(0, 0, 255);
    doc.text('Web.: www.sterling-techno.com', margin + (contentWidth * 0.4) + 2, margin + 25);
    doc.setTextColor(0);

    // 3. Title Bar
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, margin + 30, contentWidth, 8, 'F');
    doc.setFont(undefined, 'bolditalic');
    doc.setFontSize(9);
    doc.text('DELIVERY / PROCESS CHALLAN', pageWidth / 2, margin + 35, { align: 'center' });
    doc.line(margin, margin + 38, margin + contentWidth, margin + 38);

    // 4. Vendor and Challan Info
    doc.line(margin + (contentWidth / 2), margin + 38, margin + (contentWidth / 2), margin + 80); // Vertical middle line
    doc.line(margin, margin + 80, margin + contentWidth, margin + 80); // Horizontal line below info

    // Left: To Vendor
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('To,', margin + 2, margin + 45);
    doc.setFontSize(10);
    doc.text(challanData.vendor_name || '', margin + 10, margin + 45);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const splitAddress = doc.splitTextToSize(challanData.vendor_address || 'No address provided', (contentWidth / 2) - 15);
    doc.text(splitAddress, margin + 10, margin + 50);

    // Right: Challan Info
    const startXRight = margin + (contentWidth / 2);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    
    // Grid lines for right section
    [48, 58, 68].forEach(y => doc.line(startXRight, margin + y, margin + contentWidth, margin + y));

    doc.text('CHALLAN NO:-', startXRight + 2, margin + 44);
    doc.setTextColor(79, 70, 229);
    doc.text(challanData.challan_no || '', startXRight + 35, margin + 44);
    doc.setTextColor(0);

    doc.text('DATE:-', startXRight + 2, margin + 54);
    doc.text(new Date(challanData.challan_date).toLocaleDateString('en-GB'), startXRight + 35, margin + 54);

    doc.text('SUPPLY ORDER NO.:', startXRight + 2, margin + 64);
    doc.text(challanData.supply_order_no || '-', startXRight + 35, margin + 64);

    doc.text('DATE:', startXRight + 2, margin + 74);
    doc.text(challanData.supply_order_date ? new Date(challanData.supply_order_date).toLocaleDateString('en-GB') : '-', startXRight + 35, margin + 74);

    // 5. Instruction Bar
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, margin + 80, contentWidth, 6, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(6.5);
    doc.text('PLEASE RECEIVE THE FOLLOWING ARTICLES IN GOOD CONDITION & PL. SIGN DUPLICATE CHALLAN IN TOKEN OF HAVING RECEIVED THE MATERIALS', pageWidth / 2, margin + 84, { align: 'center' });
    doc.line(margin, margin + 86, margin + contentWidth, margin + 86);

    // 6. Items Table
    const tableBody = items.map((item, index) => [
        index + 1,
        { content: `${item.item_name}\n${item.item_code}${item.batch_no ? '\nST#: ' + item.batch_no : ''}`, styles: { fontStyle: 'bold' } },
        item.uom,
        parseFloat(item.dispatch_qty).toString()
    ]);

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
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            textColor: [0, 0, 0]
        },
        headStyles: {
            fillColor: [245, 245, 245],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'right', cellWidth: 25, fontStyle: 'bold' }
        },
        didDrawCell: (data) => {
            // Draw vertical lines manually if needed, but 'grid' or 'plain' with lineWidth usually works
        }
    });

    const finalY = doc.lastAutoTable.finalY;

    // 7. Footer Sections
    doc.line(margin, finalY, margin + contentWidth, finalY);
    
    // Despatched Through Info
    const footerInfoY = finalY + 5;
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('DESPATCHED THROUGH:', margin + 2, footerInfoY);
    doc.text(challanData.despatched_through || '-', margin + 45, footerInfoY);
    
    doc.text('AGAINST L. R./ R. R. NO.:', margin + 2, footerInfoY + 5);
    doc.text(challanData.against_lr_rr_no || '-', margin + 45, footerInfoY + 5);
    
    doc.text('FRIEGHT PAID / TO PAY:', margin + 2, footerInfoY + 10);
    doc.text(challanData.freight_type || 'Paid', margin + 45, footerInfoY + 10);

    // Total Qty Box
    const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.dispatch_qty) || 0), 0);
    doc.setDrawColor(0);
    doc.rect(margin + (contentWidth * 0.7), finalY, contentWidth * 0.3, 15);
    doc.setFontSize(7);
    doc.text('TOTAL QUANTITY:', margin + (contentWidth * 0.7) + 2, finalY + 5);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(totalQty.toString(), margin + (contentWidth * 0.85), finalY + 10, { align: 'center' });

    // 8. Signatures
    const sigY = doc.internal.pageSize.getHeight() - margin - 30;
    doc.line(margin, sigY - 10, margin + contentWidth, sigY - 10);
    doc.line(margin + (contentWidth / 2), sigY - 10, margin + (contentWidth / 2), doc.internal.pageSize.getHeight() - margin);

    doc.setFontSize(7);
    doc.setFont(undefined, 'bold');
    doc.text('RECEIVED THE MATERIALS IN GOOD CONDITION', margin + 2, sigY - 5);
    doc.text('CUSTOMER SIGNATURE WITH STAMP', margin + 2, doc.internal.pageSize.getHeight() - margin - 5);

    doc.text('FOR STERLING TECHNO-SYSTEMS PVT. LTD.', margin + (contentWidth * 0.75), sigY - 5, { align: 'center' });
    doc.setLineDash([1, 1], 0);
    doc.line(margin + (contentWidth * 0.6), doc.internal.pageSize.getHeight() - margin - 10, margin + (contentWidth * 0.9), doc.internal.pageSize.getHeight() - margin - 10);
    doc.setLineDash([], 0);
    doc.text('AUTHORISED SIGNATORY', margin + (contentWidth * 0.75), doc.internal.pageSize.getHeight() - margin - 5, { align: 'center' });

    // Save
    doc.save(`Challan_${challanData.challan_no}.pdf`);
};
