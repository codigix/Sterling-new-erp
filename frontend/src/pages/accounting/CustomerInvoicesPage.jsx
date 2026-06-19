import React, { useState, useEffect } from "react";
import DataTable from "../../components/ui/DataTable/DataTable";
import { 
  FileText, 
  Plus, 
  Download, 
  Eye, 
  Filter,
  Edit
} from "lucide-react";
import RecordCustomerInvoiceModal from "./RecordCustomerInvoiceModal";
import axios from "../../utils/api";
import toastUtils from "../../utils/toastUtils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const INDIAN_STATES = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh (New)" },
  { code: "38", name: "Ladakh" }
];

const CustomerInvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [projects, setProjects] = useState([]);
  const [filters, setFilter] = useState({
    search: "",
    projectId: ""
  });

  const [stats, setStats] = useState({
    total_receivable: 0,
    total_received: 0,
    outstanding: 0
  });

  useEffect(() => {
    fetchInvoices();
    fetchProjects();
  }, [filters.projectId]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get("/accounting/projects");
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/accounting/customer-invoices", {
        params: {
          search: filters.search,
          projectId: filters.projectId
        }
      });
      const data = response.data.invoices || [];
      setInvoices(data);
      
      // Calculate stats
      const receivable = data.reduce((sum, inv) => sum + parseFloat(inv.grand_total), 0);
      const received = data.reduce((sum, inv) => sum + parseFloat(inv.paid_amount), 0);
      setStats({
        total_receivable: receivable,
        total_received: received,
        outstanding: receivable - received
      });
    } catch (error) {
      console.error("Error fetching customer invoices:", error);
      toastUtils.error("Failed to load customer invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsViewMode(true);
    setIsRecordModalOpen(true);
  };

  const handleEditInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsViewMode(false);
    setIsRecordModalOpen(true);
  };

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setIsViewMode(false);
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

  const generateInvoicePDF = async (invId) => {
    toastUtils.info("Generating PDF...");
    try {
      const response = await axios.get(`/accounting/customer-invoices/${invId}`);
      const invoice = response.data;
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);

      const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "-";
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
      };

      // 1. Header
      try {
        const logo = await loadImage("/logo.png");
        doc.addImage(logo, "PNG", margin + 2, margin + 2, 21, 21);
      } catch (e) {
        console.warn("Logo failed to load", e);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("STERLING TECHNO - SYSTEMS PVT. LTD.", margin + 28, margin + 8);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("CIN NO: U29254PN2012PTC142669 | AN ISO 9001:2015 COMPANY", margin + 28, margin + 13);
      doc.setFont("helvetica", "italic");
      doc.text("Transforming Ideas Into Reality With Trusted Engineering Solutions", margin + 28, margin + 18);

      // Solid corporate blue line under company info
      doc.setDrawColor(30, 50, 140);
      doc.setLineWidth(1.5);
      doc.line(margin, margin + 23, margin + contentWidth, margin + 23);

      // 2. Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(200, 0, 0); // Red color
      doc.text("TAX INVOICE", pageWidth / 2, margin + 31, { align: "center" });
      doc.setDrawColor(200, 0, 0);
      doc.setLineWidth(0.4);
      doc.line(pageWidth / 2 - 18, margin + 32.5, pageWidth / 2 + 18, margin + 32.5);
      doc.setTextColor(0);

      // 3. Info Grid
      const gridY = margin + 36;
      const gridHeight = 55;
      const midX = pageWidth / 2;
      doc.setDrawColor(0);
      doc.setLineWidth(0.2);
      doc.rect(margin, gridY, contentWidth, gridHeight);
      doc.line(midX, gridY, midX, gridY + gridHeight);

      // Left side compartment separator
      doc.line(margin, gridY + 28, midX, gridY + 28);

      // Buyer Section
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Buyer:", margin + 3, gridY + 5);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.customer_name || "N/A", margin + 3, gridY + 9);
      
      let nextBuyerY = gridY + 13;
      if (invoice.customer_address) {
        const addrLines = doc.splitTextToSize(invoice.customer_address, midX - margin - 6);
        doc.text(addrLines, margin + 3, nextBuyerY);
        nextBuyerY += (addrLines.length * 3.5);
      }
      doc.text(`GST - ${invoice.customer_gstin || "-"}`, margin + 3, gridY + 25);

      // Delivery Address Section
      doc.setFont("helvetica", "bold");
      doc.text("Delivery Address:", margin + 3, gridY + 33);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.customer_name || "N/A", margin + 3, gridY + 37);
      
      let nextDelivY = gridY + 41;
      if (invoice.customer_address) {
        const addrLines = doc.splitTextToSize(invoice.customer_address, midX - margin - 6);
        doc.text(addrLines, margin + 3, nextDelivY);
      }

      // Right Side Grid (5 Rows)
      // Horizontal dividers on the right
      for (let i = 1; i <= 4; i++) {
        doc.line(midX, gridY + (i * 11), margin + contentWidth, gridY + (i * 11));
      }
      // Vertical dividers on the right
      doc.line(midX + 24, gridY, midX + 24, gridY + 55);
      doc.line(midX + 56, gridY, midX + 56, gridY + 55);
      doc.line(midX + 70, gridY, midX + 70, gridY + 55);

      const drawRowCells = (label1, val1, label2, val2, rowIdx) => {
        const rowY = gridY + (rowIdx * 11);
        
        // Cell 1: Label 1
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(label1, midX + 2, rowY + 6.5);
        
        // Cell 2: Value 1 (bold, wrapped)
        doc.setFont("helvetica", "bold");
        const val1Lines = doc.splitTextToSize(String(val1 || "-"), 30);
        const val1Y = val1Lines.length > 1 ? rowY + 4.5 : rowY + 6.5;
        doc.text(val1Lines, midX + 26, val1Y);
        
        // Cell 3: Label 2
        doc.setFont("helvetica", "normal");
        doc.text(label2, midX + 58, rowY + 6.5);
        
        // Cell 4: Value 2 (bold, wrapped)
        doc.setFont("helvetica", "bold");
        const val2Lines = doc.splitTextToSize(String(val2 || "-"), 23);
        const val2Y = val2Lines.length > 1 ? rowY + 4.5 : rowY + 6.5;
        doc.text(val2Lines, midX + 72, val2Y);
      };

      const stateObj = INDIAN_STATES.find(s => s.code === invoice.customer_state_code);
      const stateName = stateObj ? stateObj.name : "-";

      drawRowCells("Bill No.", invoice.invoice_number, "Date", formatDate(invoice.invoice_date), 0);
      drawRowCells("Challan No.", invoice.challan_number, "Date", formatDate(invoice.challan_date), 1);
      drawRowCells("P.O. No.", invoice.po_number, "Date", formatDate(invoice.po_date), 2);
      drawRowCells("State", stateName, "Code", invoice.customer_state_code, 3);
      drawRowCells("Transporter", invoice.transporter, "LR No.", invoice.lr_number, 4);

      // 4. Items Table using autoTable
      const tableColumn = ["Sr. No.", "Description", "HSN Code", "Qty", "Unit", "Rate", "Amount"];
      const tableRows = (invoice.items || []).map((item, index) => [
        (index + 1).toString().padStart(2, '0'),
        item.description || "",
        item.hsn_code || "-",
        item.qty ? String(item.qty).padStart(2, '0') : "00",
        item.unit || "NOS",
        parseFloat(item.rate || 0).toFixed(2),
        parseFloat(item.amount || 0).toFixed(2),
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
          1: { cellWidth: 'auto' },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'center', cellWidth: 12 },
          4: { halign: 'center', cellWidth: 15 },
          5: { halign: 'right', cellWidth: 25 },
          6: { halign: 'right', cellWidth: 25 },
        },
        margin: { left: margin, right: margin }
      });

      // 5. Summary Section
      const finalY = doc.lastAutoTable.finalY;
      const summaryH = 39; // 6 rows of 6.5mm height
      doc.rect(margin, finalY, contentWidth, summaryH);
      
      // Draw 5 horizontal separator lines all the way across
      for (let i = 1; i <= 5; i++) {
        doc.line(margin, finalY + (i * 6.5), margin + contentWidth, finalY + (i * 6.5));
      }
      
      // Draw vertical divider between bank details and totals
      doc.line(margin + 140, finalY, margin + 140, finalY + summaryH);

      const subTotalVal = parseFloat(invoice.sub_total || 0);
      const cgstAmtVal = parseFloat(invoice.cgst_amount || 0);
      const sgstAmtVal = parseFloat(invoice.sgst_amount || 0);
      const igstAmtVal = parseFloat(invoice.igst_amount || 0);
      const isInterState = igstAmtVal > 0;
      const grandTotalVal = parseFloat(invoice.grand_total || 0);
      const roundOffVal = parseFloat(invoice.round_off || 0);

      const cgstRateVal = subTotalVal > 0 ? Math.round((cgstAmtVal / subTotalVal) * 100) : 9;
      const sgstRateVal = subTotalVal > 0 ? Math.round((sgstAmtVal / subTotalVal) * 100) : 9;
      const igstRateVal = subTotalVal > 0 ? Math.round((igstAmtVal / subTotalVal) * 100) : 18;

      const drawSummaryRow = (labelLeft, labelRight, valRight, rowIdx) => {
        const rowY = finalY + (rowIdx * 6.5);
        // Left side text
        if (labelLeft) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text(labelLeft, margin + 2, rowY + 4.5);
        }
        // Right side label
        if (labelRight) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text(labelRight, margin + 142, rowY + 4.5);
        }
        // Right side value
        if (valRight !== undefined && valRight !== null && valRight !== "") {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text(String(valRight), margin + contentWidth - 2, rowY + 4.5, { align: "right" });
        }
      };

      if (isInterState) {
        drawSummaryRow("Sterling Techno-Systems Pvt. Ltd. details", "Sub Total", subTotalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 0);
        drawSummaryRow("Bank Details: Canara Bank, Pimpri Branch", "Taxable Value", subTotalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 1);
        drawSummaryRow("Bank A/c: 0418261010215", `IGST @ ${igstRateVal}%`, igstAmtVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 2);
        drawSummaryRow("Bank IFSC: CNRB0000418", "", "", 3);
        drawSummaryRow("GSTIN: 27AARCS2886C1ZX", "Grand Total", grandTotalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 4);
        drawSummaryRow("PAN AARCS2886C", "Round Off", roundOffVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 5);
      } else {
        drawSummaryRow("Sterling Techno-Systems Pvt. Ltd. details", "Sub Total", subTotalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 0);
        drawSummaryRow("Bank Details: Canara Bank, Pimpri Branch", "Taxable Value", subTotalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 1);
        drawSummaryRow("Bank A/c: 0418261010215", `CGST @ ${cgstRateVal}%`, cgstAmtVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 2);
        drawSummaryRow("Bank IFSC: CNRB0000418", `SGST @ ${sgstRateVal}%`, sgstAmtVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 3);
        drawSummaryRow("GSTIN: 27AARCS2886C1ZX", "Grand Total", grandTotalVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 4);
        drawSummaryRow("PAN AARCS2886C", "Round Off", roundOffVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}), 5);
      }

      // 6. Footer
      const footerY = finalY + summaryH + 4;
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      const declaration = "I / We hereby certify that my/our registration certificate under the GST Act 2017 is in force on the 28.06.2017 date on which the sale of the goods specified is this tax invoice is made by me/us and it shall be accounted for in the turnover of sales while filling of the return and due tax, if any payable on the sales has been paid or shall be paid.";
      const decLines = doc.splitTextToSize(declaration, contentWidth);
      doc.text(decLines, margin, footerY);

      const sigY = footerY + (decLines.length * 3.5) + 6;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("For STERLING TECHNO-SYSTEMS PVT. LTD.", margin + contentWidth - 5, sigY, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.text("Harshal K. Shinde", margin + contentWidth - 25, sigY + 18, { align: "center" });
      doc.setFont("helvetica", "italic");
      doc.text("(Director)", margin + contentWidth - 25, sigY + 22, { align: "center" });

      // Contact Footer (Bottom blue line & addresses)
      doc.setDrawColor(30, 50, 140);
      doc.setLineWidth(1.5);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      
      doc.setFontSize(6.5);
      doc.setTextColor(80);
      doc.setFont("helvetica", "normal");
      doc.text("Gat No. 70, Sonawanewasti, Talawade, Pune-411062, Maharashtra (INDIA)  |  Email: sales@sterling-techno.com  |  sterling.techno.systems@gmail.com", pageWidth / 2, pageHeight - 11, { align: "center" });
      doc.text("Mob.: +91 9423091147  |  Website: www.sterling-techno.com", pageWidth / 2, pageHeight - 7, { align: "center" });

      doc.save(`Invoice-${invoice.invoice_number.replace(/\//g, "-")}.pdf`);
      toastUtils.success("PDF Downloaded");
    } catch (error) {
      console.error("PDF Error:", error);
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
      key: "customer_name",
      label: "Customer",
    },
    {
      key: "project_name",
      label: "Project",
      render: (val) => val || <span className="text-slate-400 italic">General</span>
    },
    {
      key: "invoice_date",
      label: "Invoice Date",
      render: (val) => new Date(val).toLocaleDateString('en-GB')
    },
    {
      key: "grand_total",
      label: "Invoice Amount",
      align: "right",
      render: (val) => `₹${parseFloat(val).toLocaleString()}`
    },
    {
      key: "paid_amount",
      label: "Received",
      align: "right",
      render: (val) => <span className="text-emerald-600 font-medium">₹{parseFloat(val).toLocaleString()}</span>
    },
    {
      key: "balance_amount",
      label: "Remaining",
      align: "right",
      render: (val) => <span className="text-amber-600 font-medium">₹{parseFloat(val).toLocaleString()}</span>
    },
    {
      key: "gst_tds",
      label: "GST TDS (₹)",
      align: "right",
      render: (val) => `₹${parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      key: "it_tds",
      label: "Income Tax TDS (₹)",
      align: "right",
      render: (val) => `₹${parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-[10px]  border ${
          val === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          val === 'PARTIAL' ? 'bg-blue-50 text-blue-600 border-blue-100' :
          'bg-amber-50 text-amber-600 border-amber-100'
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
          <button onClick={() => handleViewInvoice(invoice)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all" title="View">
            <Eye size={14} />
          </button>
          <button onClick={() => handleEditInvoice(invoice)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all" title="Edit">
            <Edit size={14} />
          </button>
          <button onClick={() => generateInvoicePDF(invoice.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all" title="Download PDF">
            <Download size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white">Customer Invoices</h1>
          <p className="text-xs text-slate-500">Manage sales invoices and receivables</p>
        </div>
        <button 
          onClick={handleCreateInvoice}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all"
        >
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500   mb-1">Total Receivable</p>
          <p className="text-2xl  text-slate-900 dark:text-white">₹{stats.total_receivable.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500   mb-1">Total Received</p>
          <p className="text-2xl  text-emerald-600">₹{stats.total_received.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500   mb-1">Outstanding</p>
          <p className="text-2xl  text-amber-600">₹{stats.outstanding.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700">
        <Filter size={16} className="text-slate-400" />
        <select 
          className="bg-transparent text-sm outline-none border-r border-slate-200 dark:border-slate-700 pr-3"
          value={filters.projectId}
          onChange={(e) => setFilter(prev => ({ ...prev, projectId: e.target.value }))}
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.project_name}</option>
          ))}
        </select>
        <input 
          type="text" 
          placeholder="Search by invoice # or customer..."
          className="flex-1 bg-transparent text-sm outline-none"
          value={filters.search}
          onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && fetchInvoices()}
        />
      </div>

      <DataTable
        title="Sales Invoices"
        titleIcon={<FileText size={18} />}
        columns={columns}
        data={invoices}
        isLoading={loading}
        onRefresh={fetchInvoices}
      />

      <RecordCustomerInvoiceModal 
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onInvoiceRecorded={fetchInvoices}
        editData={selectedInvoice}
        initialViewMode={isViewMode}
      />
    </div>
  );
};

export default CustomerInvoicesPage;
