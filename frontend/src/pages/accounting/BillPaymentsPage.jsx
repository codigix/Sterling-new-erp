import React, { useState, useEffect } from "react";
import DataTable from "../../components/ui/DataTable/DataTable";
import axios from "../../utils/api";
import toastUtils from "../../utils/toastUtils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import RecordVendorPaymentModal from "./RecordVendorPaymentModal";
import { 
  Wallet, 
  Plus, 
  Download, 
  Eye, 
  RefreshCw,
  Search,
  CheckCircle2,
  Clock
} from "lucide-react";

const BillPaymentsPage = () => {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [summary, setSummary] = useState({
    totalPaidMonth: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    fetchPayments();
    fetchPendingSummary();
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

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let url = "/accounting/vendor-payments";
      if (projectFilter) {
        url += `?projectId=${projectFilter}`;
      }
      const response = await axios.get(url);
      const fetchedPayments = response.data.payments || [];
      setPayments(fetchedPayments);
      
      // Calculate total paid this month (simple mock calculation for now)
      const currentMonth = new Date().getMonth();
      const paidThisMonth = fetchedPayments
        .filter(p => new Date(p.payment_date).getMonth() === currentMonth)
        .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);
        
      setSummary(prev => ({ ...prev, totalPaidMonth: paidThisMonth }));
    } catch (error) {
      console.error("Error fetching payments:", error);
      toastUtils.error("Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingSummary = async () => {
    try {
      const response = await axios.get("/accounting/vendor-invoices?status=PENDING");
      const pendingInvoices = response.data.invoices || [];
      const pendingTotal = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.balance_amount), 0);
      setSummary(prev => ({ ...prev, pendingPayments: pendingTotal }));
    } catch (error) {
      console.error("Error fetching pending summary:", error);
    }
  };

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
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

  const generatePaymentPDF = async (payment) => {
    const doc = new jsPDF();
    try {
      const logo = await loadImage("/logo.png");
      doc.addImage(logo, "PNG", 14, 5, 50, 15);
    } catch (error) {
      console.warn("Logo not found or failed to load:", error);
    }

    doc.setFontSize(20);
    doc.text("PAYMENT RECEIPT", 105, 30, { align: "center" });

    const formatDate = (dateStr) => {
      if (!dateStr) return "N/A";
      try {
        const date = new Date(dateStr);
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}-${m}-${y}`;
      } catch {
        return dateStr;
      }
    };

    doc.setFontSize(10);
    doc.text(`Payment Number: ${payment.payment_number}`, 14, 45);
    doc.text(`Date: ${formatDate(payment.payment_date)}`, 14, 50);
    doc.text(`Vendor: ${payment.vendor_name || "N/A"}`, 14, 55);
    doc.text(`Invoice Ref: #${payment.ref_invoice_no || "N/A"}`, 14, 60);

    autoTable(doc, {
      startY: 70,
      head: [["Description", "Details"]],
      body: [
        ["Payment Method", payment.payment_method],
        ["Reference No.", payment.reference_number || "-"],
        ["Paid Amount", `INR ${parseFloat(payment.amount_paid).toLocaleString()}`],
        ["Notes", payment.notes || "-"]
      ],
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
      styles: { fontSize: 10 },
    });

    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.text("Authorized Signatory", 150, finalY);
    doc.line(140, finalY - 5, 190, finalY - 5);

    return doc;
  };

  const handleDownloadPayment = async (payment) => {
    toastUtils.info("Generating PDF...");
    try {
      const response = await axios.get(`/accounting/vendor-payments/${payment.id}`);
      const fullPayment = response.data;
      const doc = await generatePaymentPDF(fullPayment);
      doc.save(`Payment-${fullPayment.payment_number.replace(/\//g, "-")}.pdf`);
      toastUtils.success("PDF Downloaded");
    } catch (error) {
      console.error("Error downloading payment:", error);
      toastUtils.error("Failed to generate PDF");
    }
  };

  const columns = [
    {
      key: "payment_number",
      label: "Payment #",
      render: (val) => <span className="font-mono text-blue-600 ">{val}</span>
    },
    {
      key: "ref_invoice_no",
      label: "Ref Invoice",
      render: (val) => <span className="text-slate-500 font-medium">#{val}</span>
    },
    {
      key: "vendor_name",
      label: "Vendor",
    },
    {
      key: "payment_date",
      label: "Payment Date",
      render: (val) => new Date(val).toLocaleDateString()
    },
    {
      key: "amount_paid",
      label: "Amount Paid",
      align: "right",
      render: (val) => <span className=" text-emerald-600">₹{parseFloat(val).toLocaleString()}</span>
    },
    {
      key: "payment_method",
      label: "Method",
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-[10px]  border ${
          val === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
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
      render: (_, payment) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => handleViewPayment(payment)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all">
            <Eye size={14} />
          </button>
          <button onClick={() => handleDownloadPayment(payment)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
            <Download size={14} />
          </button>
        </div>
      )
    }
  ];

  const handlePaymentRecorded = () => {
    fetchPayments();
    fetchPendingSummary();
  };

  const handleOpenRecordModal = () => {
    setSelectedPayment(null);
    setIsViewMode(false);
    setIsRecordModalOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white">Bill Payments</h1>
          <p className="text-xs text-slate-500">Track and record payments made to vendors</p>
        </div>
        <button 
          onClick={handleOpenRecordModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
        >
          <Plus size={16} /> Record Payment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500  ">Total Paid (Month)</p>
            <p className="text-xl  text-slate-900 dark:text-white">₹{summary.totalPaidMonth.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500  ">Pending Payments</p>
            <p className="text-xl  text-slate-900 dark:text-white">₹{summary.pendingPayments.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <DataTable
        title="Payment History"
        titleIcon={<Wallet size={18} />}
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
        data={payments}
        loading={loading}
        searchPlaceholder="Search by payment # or vendor..."
      />

      <RecordVendorPaymentModal 
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onPaymentRecorded={handlePaymentRecorded}
        editData={selectedPayment}
        initialViewMode={isViewMode}
      />
    </div>
  );
};

export default BillPaymentsPage;
