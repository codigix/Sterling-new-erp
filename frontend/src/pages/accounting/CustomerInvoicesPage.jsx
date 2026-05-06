import React, { useState, useEffect } from "react";
import DataTable from "../../components/ui/DataTable/DataTable";
import { 
  FileText, 
  Plus, 
  Download, 
  Eye, 
  Filter
} from "lucide-react";
import RecordCustomerInvoiceModal from "./RecordCustomerInvoiceModal";
import axios from "../../utils/api";
import toastUtils from "../../utils/toastUtils";
import jsPDF from "jspdf";

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
    try {
      const response = await axios.get(`/accounting/customer-invoices/${invId}`);
      const invoice = response.data;
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);

      const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        const date = new Date(dateStr);
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
      };

      // Header
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(margin, margin, contentWidth, 25);
      
      try {
        const logo = await loadImage("/logo.png");
        doc.addImage(logo, "PNG", margin + 2, margin + 2, 20, 20);
      } catch (e) {}

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("STERLING TECHNO - SYSTEMS PVT. LTD.", margin + 25, margin + 8);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("CIN NO: U29254PN2012PTC142669 | AN ISO 9001:2015 COMPANY", margin + 25, margin + 13);
      doc.setFont("helvetica", "italic");
      doc.text("Transforming Ideas Into Reality With Trusted Engineering Solutions", margin + 25, margin + 18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(180, 0, 0);
      doc.text("SALES INVOICE", pageWidth / 2, margin + 35, { align: "center" });
      doc.setTextColor(0);

      // Info Grid
      const gridY = margin + 40;
      const gridHeight = 50;
      const midX = pageWidth / 2;
      doc.rect(margin, gridY, contentWidth, gridHeight);
      doc.line(midX, gridY, midX, gridY + gridHeight);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Customer:", margin + 2, gridY + 5);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.customer_name || "N/A", margin + 2, gridY + 10);
      doc.text(invoice.project_name || "N/A", margin + 2, gridY + 15);

      doc.setFont("helvetica", "bold");
      doc.text("Invoice Details:", midX + 2, gridY + 5);
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice No: ${invoice.invoice_number}`, midX + 2, gridY + 12);
      doc.text(`Invoice Date: ${formatDate(invoice.invoice_date)}`, midX + 2, gridY + 19);

      // Items Table
      const tableY = gridY + gridHeight + 5;
      doc.setLineWidth(0.2);
      doc.rect(margin, tableY, contentWidth, 100); // Items box
      
      const cols = [
        { name: "Sr.", x: margin + 2, w: 10 },
        { name: "Description", x: margin + 12, w: 80 },
        { name: "HSN", x: margin + 92, w: 20 },
        { name: "Qty", x: margin + 112, w: 15 },
        { name: "Rate", x: margin + 127, w: 30 },
        { name: "Amount", x: margin + 157, w: 30 }
      ];

      doc.setFont("helvetica", "bold");
      cols.forEach(c => doc.text(c.name, c.x, tableY + 7));
      doc.line(margin, tableY + 10, margin + contentWidth, tableY + 10);

      doc.setFont("helvetica", "normal");
      let currentY = tableY + 15;
      (invoice.items || []).forEach((item, idx) => {
        doc.text((idx + 1).toString(), cols[0].x, currentY);
        doc.text(item.description, cols[1].x, currentY, { maxWidth: 75 });
        doc.text(item.hsn_code || "-", cols[2].x, currentY);
        doc.text(parseFloat(item.qty).toString(), cols[3].x, currentY);
        doc.text(parseFloat(item.rate).toLocaleString(), cols[4].x, currentY);
        doc.text(parseFloat(item.amount).toLocaleString(), cols[5].x, currentY);
        currentY += 10;
      });

      // Totals
      const totalsY = tableY + 100;
      doc.rect(margin, totalsY, contentWidth, 40);
      doc.line(midX + 20, totalsY, midX + 20, totalsY + 40);

      const tX = midX + 22;
      doc.text("Sub Total", tX, totalsY + 7);
      doc.text(parseFloat(invoice.sub_total).toLocaleString(), margin + contentWidth - 2, totalsY + 7, { align: "right" });
      
      doc.text("CGST @ 9%", tX, totalsY + 14);
      doc.text(parseFloat(invoice.cgst_amount).toLocaleString(), margin + contentWidth - 2, totalsY + 14, { align: "right" });
      
      doc.text("SGST @ 9%", tX, totalsY + 21);
      doc.text(parseFloat(invoice.sgst_amount).toLocaleString(), margin + contentWidth - 2, totalsY + 21, { align: "right" });
      
      doc.setFont("helvetica", "bold");
      doc.text("Grand Total", tX, totalsY + 30);
      doc.text(`INR ${parseFloat(invoice.grand_total).toLocaleString()}`, margin + contentWidth - 2, totalsY + 30, { align: "right" });

      doc.save(`Invoice-${invoice.invoice_number}.pdf`);
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
      label: "Received",
      align: "right",
      render: (val) => <span className="text-emerald-600 font-medium">₹${parseFloat(val).toLocaleString()}</span>
    },
    {
      key: "balance_amount",
      label: "Remaining",
      align: "right",
      render: (val) => <span className="text-amber-600 font-medium">₹${parseFloat(val).toLocaleString()}</span>
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
          <button onClick={() => handleViewInvoice(invoice)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all">
            <Eye size={14} />
          </button>
          <button onClick={() => generateInvoicePDF(invoice.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
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
