import React, { useState, useEffect } from "react";
import DataTable from "../../components/ui/DataTable/DataTable";
import axios from "../../utils/api";
import toastUtils from "../../utils/toastUtils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  FileText, 
  Plus, 
  Download, 
  Eye, 
  Filter, 
  RefreshCw,
  Search,
  Calendar,
  DollarSign,
  ShoppingCart,
  Package
} from "lucide-react";
import RecordVendorInvoiceModal from "./RecordVendorInvoiceModal";

const VendorInvoicesPage = () => {
  const [loading, setLoading] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [summary, setSummary] = useState({
    totalPayable: 0,
    paidThisMonth: 0,
    overdue: 0
  });

  useEffect(() => {
    fetchInvoices();
    fetchProjects();
  }, [projectFilter]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get("/accounting/projects");
      setProjects(response.data.projects.map(p => ({ id: p.id, name: p.project_name })));
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let url = "/accounting/vendor-invoices";
      if (projectFilter) {
        url += `?projectId=${projectFilter}`;
      }
      const response = await axios.get(url);
      const fetchedInvoices = response.data.invoices || [];
      setInvoices(fetchedInvoices);
      
      // Calculate simple summary
      const payable = fetchedInvoices.reduce((sum, inv) => inv.status !== 'PAID' ? sum + parseFloat(inv.grand_total) : sum, 0);
      const paid = fetchedInvoices.reduce((sum, inv) => inv.status === 'PAID' ? sum + parseFloat(inv.grand_total) : sum, 0);
      const overdue = fetchedInvoices.reduce((sum, inv) => inv.status === 'OVERDUE' ? sum + parseFloat(inv.grand_total) : sum, 0);
      
      setSummary({
        totalPayable: payable,
        paidThisMonth: paid,
        overdue: overdue
      });
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toastUtils.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsViewMode(true);
    setIsRecordModalOpen(true);
  };

  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  };

  const generateInvoicePDF = async (invoice) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    const formatDate = (dateStr) => {
      if (!dateStr) return "N/A";
      try {
        const date = new Date(dateStr);
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
      } catch {
        return dateStr;
      }
    };

    // 1. Header Box
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, contentWidth, 25); // Main Header box

    try {
      const logo = await loadImage("/logo.png");
      doc.addImage(logo, "PNG", margin + 2, margin + 2, 21, 21);
    } catch (error) {
      console.warn("Logo failed to load", error);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("STERLING TECHNO - SYSTEMS PVT. LTD.", margin + 28, margin + 8);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("CIN NO: U29254PN2012PTC142669 | AN ISO 9001:2015 COMPANY", margin + 28, margin + 13);
    doc.setFont("helvetica", "italic");
    doc.text("Transforming Ideas Into Reality With Trusted Engineering Solutions", margin + 28, margin + 18);

    // 2. Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(180, 0, 0); // Reddish color
    doc.text("TAX INVOICE", pageWidth / 2, margin + 35, { align: "center" });
    doc.setDrawColor(180, 0, 0);
    doc.line(pageWidth / 2 - 20, margin + 36, pageWidth / 2 + 20, margin + 36);
    doc.setTextColor(0);

    // 3. Info Grid
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    const gridY = margin + 40;
    const gridHeight = 55;
    const midX = pageWidth / 2;

    doc.rect(margin, gridY, contentWidth, gridHeight); // Outer border
    doc.line(midX, gridY, midX, gridY + gridHeight); // Middle vertical line

    // Left Side: Buyer & Delivery
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Buyer:", margin + 2, gridY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.vendor_name || "N/A", margin + 2, gridY + 10);
    doc.text(invoice.vendor_address || "", margin + 2, gridY + 15, { maxWidth: contentWidth / 2 - 5 });
    if (invoice.vendor_gst) {
      doc.text(`GST: ${invoice.vendor_gst}`, margin + 2, gridY + 25);
    }
    
    doc.setFont("helvetica", "bold");
    doc.text("Delivery Address:", margin + 2, gridY + 32);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.project_name || "N/A", margin + 2, gridY + 37);
    doc.text("Project Site", margin + 2, gridY + 42, { maxWidth: contentWidth / 2 - 5 });

    // Right Side: Details
    const rowH = gridHeight / 5;
    const rightX = midX;
    
    // Draw horizontal lines for the right side grid
    for(let i=1; i<5; i++) {
      doc.line(rightX, gridY + (i * rowH), margin + contentWidth, gridY + (i * rowH));
    }
    
    // Draw vertical lines for sub-sections on right
    doc.line(rightX + 25, gridY, rightX + 25, gridY + (rowH * 3)); // For Bill No, Challan No, PO No
    doc.line(rightX + 65, gridY, rightX + 65, gridY + (rowH * 3)); // For Date columns
    doc.line(rightX + 25, gridY + (rowH * 3), rightX + 25, gridY + gridHeight); // For State, Transporter

    const drawGridText = (label, val, x, y, labelW = 23) => {
      doc.setFont("helvetica", "normal");
      doc.text(label, x + 2, y + rowH/2 + 2);
      doc.setFont("helvetica", "bold");
      doc.text(String(val || "-"), x + labelW + 4, y + rowH/2 + 2);
    };

    drawGridText("Bill No.", invoice.invoice_number, rightX, gridY);
    drawGridText("Date", formatDate(invoice.invoice_date), rightX + 65, gridY, 5);
    
    drawGridText("Challan No.", invoice.challan_number, rightX, gridY + rowH);
    drawGridText("Date", formatDate(invoice.challan_date), rightX + 65, gridY + rowH, 5);
    
    if (invoice.po_number) {
      drawGridText("P.O. No.", invoice.po_number, rightX, gridY + (rowH * 2));
      drawGridText("Date", formatDate(invoice.po_date), rightX + 65, gridY + (rowH * 2), 5);
    } else if (invoice.challan_no) {
      drawGridText("Out. Ch. No.", invoice.challan_no, rightX, gridY + (rowH * 2));
      drawGridText("Date", formatDate(invoice.oc_date), rightX + 65, gridY + (rowH * 2), 5);
    } else {
      drawGridText("P.O. No.", "-", rightX, gridY + (rowH * 2));
      drawGridText("Date", "-", rightX + 65, gridY + (rowH * 2), 5);
    }

    drawGridText("State", invoice.place_of_supply || "Maharashtra", rightX, gridY + (rowH * 3));
    drawGridText("Code", "27", rightX + 65, gridY + (rowH * 3), 5);

    drawGridText("Transporter", invoice.transporter, rightX, gridY + (rowH * 4));
    drawGridText("LR No.", invoice.lr_number, rightX + 65, gridY + (rowH * 4), 10);

    // 4. Items Table
    const tableColumn = ["Sr. No.", "Description", "HSN Code", "Qty", "Unit", "Rate", "Amount"];
    const tableRows = (invoice.items || []).map((item, index) => [
      index + 1,
      item.description,
      item.hsn_code || "8511",
      item.qty,
      item.unit,
      parseFloat(item.rate).toFixed(2),
      parseFloat(item.amount).toFixed(2),
    ]);

    autoTable(doc, {
      startY: gridY + gridHeight + 5,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 8, textColor: [0, 0, 0], lineWidth: 0.1 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 80 },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'center', cellWidth: 15 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'right', cellWidth: 25 },
        6: { halign: 'right', cellWidth: 28 },
      },
      margin: { left: margin, right: margin }
    });

    // 5. Summary Section
    const finalY = doc.lastAutoTable.finalY;
    const summaryH = 45;
    doc.rect(margin, finalY, contentWidth, summaryH);
    doc.line(midX + 25, finalY, midX + 25, finalY + summaryH);

    // Left: Bank Details
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Sterling Techno-Systems Pvt. Ltd. details", margin + 2, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.text("Bank Details: Canara Bank, Pimpri Branch", margin + 2, finalY + 10);
    doc.text("Bank A/c: 0418261010215", margin + 2, finalY + 15);
    doc.text("Bank IFSC: CNRB0000418", margin + 2, finalY + 20);
    doc.text("GSTIN: 27AARCS2886C1ZX", margin + 2, finalY + 25);
    doc.text("PAN AARCS2886C", margin + 2, finalY + 30);

    // Right: Calculations
    const calcRowH = summaryH / 6;
    const calcX = midX + 25;
    for(let i=1; i<6; i++) {
      doc.line(calcX, finalY + (i * calcRowH), margin + contentWidth, finalY + (i * calcRowH));
    }
    doc.line(calcX + 45, finalY, calcX + 45, finalY + summaryH);

    const drawCalcText = (label, val, y) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, calcX + 2, y + calcRowH/2 + 1);
      doc.text(String(val), margin + contentWidth - 2, y + calcRowH/2 + 1, { align: "right" });
    };

    drawCalcText("Sub Total", parseFloat(invoice.sub_total || 0).toLocaleString(), finalY);
    drawCalcText("Taxable Value", parseFloat(invoice.taxable_value || 0).toLocaleString(), finalY + calcRowH);
    drawCalcText("CGST @ 9%", parseFloat(invoice.cgst_amount || 0).toLocaleString(), finalY + (calcRowH * 2));
    drawCalcText("SGST @ 9%", parseFloat(invoice.sgst_amount || 0).toLocaleString(), finalY + (calcRowH * 3));
    drawCalcText("Grand Total", parseFloat(invoice.grand_total || 0).toLocaleString(), finalY + (calcRowH * 4));
    drawCalcText("Round Off", parseFloat(invoice.round_off || 0).toLocaleString(), finalY + (calcRowH * 5));

    // 6. Footer
    const footerY = finalY + summaryH + 5;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const declaration = "I / We hereby certify that my/our registration certificate under the GST Act 2017 is in force on the date on which the sale of the goods specified is this tax invoice is made by me/us and it shall be accounted for in the turnover of sales while filling of the return and due tax, if any payable on the sales has been paid or shall be paid.";
    doc.text(declaration, margin, footerY, { maxWidth: contentWidth });

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("For STERLING TECHNO-SYSTEMS PVT. LTD.", margin + contentWidth - 2, footerY + 15, { align: "right" });
    
    doc.text("Harshal K. Shinde", margin + contentWidth - 10, footerY + 35, { align: "right" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("(Director)", margin + contentWidth - 12, footerY + 38, { align: "right" });

    // Contact Footer
    doc.setDrawColor(200);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setFontSize(6);
    doc.setTextColor(100);
    doc.text("Gat No. 70, Sonawanewasti, Talawade, Pune-411062, Maharashtra (INDIA) | Email: sales@sterling-techno.com | Mob: +91 9423091147 | Website: www.sterling-techno.com", pageWidth/2, pageHeight - 10, { align: "center" });

    return doc;
  };

  const handleDownloadInvoice = async (invoice) => {
    toastUtils.info("Generating PDF...");
    try {
      const response = await axios.get(`/accounting/vendor-invoices/${invoice.id}`);
      const fullInvoice = response.data;
      const doc = await generateInvoicePDF(fullInvoice);
      doc.save(`Invoice-${fullInvoice.invoice_number.replace(/\//g, "-")}.pdf`);
      toastUtils.success("PDF Downloaded");
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toastUtils.error("Failed to generate PDF");
    }
  };

  const columns = [
    {
      key: "invoice_number",
      label: "Invoice #",
      render: (val) => <span className="font-mono text-blue-600 ">{val}</span>
    },
    {
      key: "vendor_name",
      label: "Vendor",
    },
    {
      key: "project_name",
      label: "Project",
      render: (val) => val || "Direct PO"
    },
    {
      key: "source",
      label: "PO / Challan",
      render: (_, inv) => (
        <span className="text-xs">
          {inv.po_number ? (
            <span className="flex items-center gap-1 text-slate-600">
              <ShoppingCart size={12} className="text-slate-400" /> {inv.po_number}
            </span>
          ) : inv.challan_no ? (
            <span className="flex items-center gap-1 text-slate-600">
              <Package size={12} className="text-slate-400" /> {inv.challan_no}
            </span>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </span>
      )
    },
    {
      key: "invoice_date",
      label: "Invoice Date",
      render: (val) => new Date(val).toLocaleDateString()
    },
    {
      key: "grand_total",
      label: "Invoice Amount",
      align: "right",
      render: (val) => `₹${parseFloat(val).toLocaleString()}`
    },
    {
      key: "paid_amount",
      label: "Paid",
      align: "right",
      render: (val) => <span className="text-emerald-600">₹{parseFloat(val || 0).toLocaleString()}</span>
    },
    {
      key: "balance_amount",
      label: "Remaining",
      align: "right",
      render: (val) => <span className=" text-red-600">₹{parseFloat(val || 0).toLocaleString()}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-[10px]  border ${
          val === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          val === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
          'bg-red-50 text-red-600 border-red-100'
        } `}>
          {val}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (_, invoice) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => handleViewInvoice(invoice)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all">
            <Eye size={14} />
          </button>
          <button onClick={() => handleDownloadInvoice(invoice)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
            <Download size={14} />
          </button>
        </div>
      )
    }
  ];

  const handleInvoiceRecorded = () => {
    fetchInvoices();
  };

  const handleOpenRecordModal = () => {
    setSelectedInvoice(null);
    setIsViewMode(false);
    setIsRecordModalOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white">Vendor Invoices</h1>
          <p className="text-xs text-slate-500">Manage and track incoming bills from suppliers</p>
        </div>
        <button 
          onClick={handleOpenRecordModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all"
        >
          <Plus size={16} /> Record Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500   mb-1">Total Payable</p>
          <p className="text-2xl  text-slate-900 dark:text-white">₹{summary.totalPayable.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500   mb-1">Paid this month</p>
          <p className="text-2xl  text-emerald-600">₹{summary.paidThisMonth.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500   mb-1">Overdue</p>
          <p className="text-2xl  text-red-600">₹{summary.overdue.toLocaleString()}</p>
        </div>
      </div>

      <DataTable
        title="Invoices List"
        titleIcon={<FileText size={18} />}
        filters={[
          {
            key: "project_id",
            label: "All Project",
            value: projectFilter,
            onChange: (val) => setProjectFilter(val),
            options: projects.map(p => ({ label: p.name, value: p.id }))
          }
        ]}
        columns={columns}
        data={invoices}
        loading={loading}
        searchPlaceholder="Search by invoice # or vendor..."
      />

      <RecordVendorInvoiceModal 
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onInvoiceRecorded={handleInvoiceRecorded}
        editData={selectedInvoice}
        initialViewMode={isViewMode}
      />
    </div>
  );
};

export default VendorInvoicesPage;
