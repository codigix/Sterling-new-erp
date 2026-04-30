import React, { useState } from "react";
import DataTable from "../../components/ui/DataTable/DataTable";
import { 
  TrendingUp, 
  Plus, 
  Download, 
  Eye, 
  Calendar,
  CheckCircle2,
  DollarSign
} from "lucide-react";

const PaymentTrackingPage = () => {
  const mockIncomingPayments = [
    {
      id: "RCPT-2026-001",
      invoiceId: "CINV-2026-002",
      customer: "Global Infrastructures",
      date: "2026-04-15",
      amount: 85000,
      method: "NEFT",
      status: "verified",
    },
    {
      id: "RCPT-2026-002",
      invoiceId: "CINV-2026-001",
      customer: "TechnoWorld Systems",
      date: "2026-04-20",
      amount: 75000,
      method: "Cheque",
      status: "verified",
    }
  ];

  const columns = [
    {
      key: "id",
      label: "Receipt #",
      render: (val) => <span className="font-mono text-blue-600 font-bold">{val}</span>
    },
    {
      key: "invoiceId",
      label: "Ref Invoice",
    },
    {
      key: "customer",
      label: "Customer",
    },
    {
      key: "date",
      label: "Received Date",
      render: (val) => new Date(val).toLocaleDateString()
    },
    {
      key: "amount",
      label: "Amount Received",
      align: "right",
      render: (val) => <span className="text-emerald-600 font-bold">₹${val.toLocaleString()}</span>
    },
    {
      key: "method",
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
      render: () => (
        <div className="flex justify-end gap-2">
          <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all">
            <Eye size={14} />
          </button>
          <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
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
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all">
          <Plus size={16} /> Record Receipt
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Collections (This Month)</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">₹160,000</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Payments Verified</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">2 Receipts</p>
          </div>
        </div>
      </div>

      <DataTable
        title="Incoming Payments"
        titleIcon={<TrendingUp size={18} />}
        columns={columns}
        data={mockIncomingPayments}
        searchPlaceholder="Search by receipt # or customer..."
      />
    </div>
  );
};

export default PaymentTrackingPage;
