import React, { useState, useEffect } from "react";
import DataTable from "../../components/ui/DataTable/DataTable";
import { 
  TrendingUp, 
  Plus, 
  Download, 
  Eye, 
  Filter,
  CheckCircle2
} from "lucide-react";
import RecordCustomerPaymentModal from "./RecordCustomerPaymentModal";
import axios from "../../utils/api";
import toastUtils from "../../utils/toastUtils";
import jsPDF from "jspdf";

const PaymentTrackingPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [projects, setProjects] = useState([]);
  const [filters, setFilter] = useState({
    search: "",
    projectId: ""
  });

  const [stats, setStats] = useState({
    total_received: 0,
    count: 0
  });

  useEffect(() => {
    fetchPayments();
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

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/accounting/customer-payments", {
        params: {
          search: filters.search,
          projectId: filters.projectId
        }
      });
      const data = response.data.payments || [];
      setPayments(data);
      
      const total = data.reduce((sum, p) => sum + parseFloat(p.amount_received), 0);
      setStats({
        total_received: total,
        count: data.length
      });
    } catch (error) {
      console.error("Error fetching customer payments:", error);
      toastUtils.error("Failed to load customer payments");
    } finally {
      setLoading(false);
    }
  };

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setIsViewMode(true);
    setIsRecordModalOpen(true);
  };

  const handleRecordPayment = () => {
    setSelectedPayment(null);
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

  const generateReceiptPDF = async (payment) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);

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
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT RECEIPT", pageWidth / 2, margin + 35, { align: "center" });

      doc.setLineWidth(0.2);
      doc.rect(margin, margin + 40, contentWidth, 60);
      
      doc.setFontSize(10);
      doc.text(`Receipt No: ${payment.receipt_number}`, margin + 5, margin + 50);
      doc.text(`Date: ${new Date(payment.received_date).toLocaleDateString()}`, margin + 140, margin + 50);
      
      doc.text(`Received from: ${payment.customer_name}`, margin + 5, margin + 60);
      doc.text(`Project: ${payment.project_name || "N/A"}`, margin + 5, margin + 70);
      doc.text(`Ref Invoice: ${payment.ref_invoice_no || "N/A"}`, margin + 5, margin + 80);
      
      doc.setFontSize(12);
      doc.rect(margin + 5, margin + 85, 100, 10);
      doc.text(`Amount: INR ${parseFloat(payment.amount_received).toLocaleString()}`, margin + 8, margin + 92);

      doc.setFontSize(10);
      doc.text(`Method: ${payment.payment_method}`, margin + 5, margin + 110);
      if (payment.transaction_ref) {
        doc.text(`Transaction Ref: ${payment.transaction_ref}`, margin + 5, margin + 120);
      }

      doc.save(`Receipt-${payment.receipt_number}.pdf`);
    } catch (error) {
      console.error("PDF Error:", error);
      toastUtils.error("Failed to generate PDF");
    }
  };

  const columns = [
    {
      key: "receipt_number",
      label: "Receipt #",
      render: (val) => <span className="font-mono text-blue-600 font-bold">{val}</span>
    },
    {
      key: "ref_invoice_no",
      label: "Ref Invoice",
      render: (val) => val || <span className="text-slate-400 italic">N/A</span>
    },
    {
      key: "customer_name",
      label: "Customer",
    },
    {
      key: "received_date",
      label: "Received Date",
      render: (val) => new Date(val).toLocaleDateString()
    },
    {
      key: "amount_received",
      label: "Amount Received",
      align: "right",
      render: (val) => <span className="text-emerald-600 font-bold">₹{parseFloat(val).toLocaleString()}</span>
    },
    {
      key: "payment_method",
      label: "Method",
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span className="px-2 py-1 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-600 border-emerald-100 uppercase">
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
          <button onClick={() => generateReceiptPDF(payment)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Payment Tracking</h1>
          <p className="text-xs text-slate-500">Track incoming payments from customers</p>
        </div>
        <button 
          onClick={handleRecordPayment}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all"
        >
          <Plus size={16} /> Record Receipt
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Collections (Total)</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">₹{stats.total_received.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Payments Recorded</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.count} Receipts</p>
          </div>
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
          placeholder="Search by receipt # or customer..."
          className="flex-1 bg-transparent text-sm outline-none"
          value={filters.search}
          onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && fetchPayments()}
        />
      </div>

      <DataTable
        title="Incoming Payments"
        titleIcon={<TrendingUp size={18} />}
        columns={columns}
        data={payments}
        isLoading={loading}
        onRefresh={fetchPayments}
      />

      <RecordCustomerPaymentModal 
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onPaymentRecorded={fetchPayments}
        editData={selectedPayment}
        initialViewMode={isViewMode}
      />
    </div>
  );
};

export default PaymentTrackingPage;
