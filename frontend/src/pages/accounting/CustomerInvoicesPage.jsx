import React, { useState } from "react";
import DataTable from "../../components/ui/DataTable/DataTable";
import { 
  FileText, 
  Plus, 
  Download, 
  Eye, 
  TrendingUp,
  User
} from "lucide-react";

const CustomerInvoicesPage = () => {
  const mockInvoices = [
    {
      id: "CINV-2026-001",
      customer: "TechnoWorld Systems",
      project: "Solar Plant Control",
      date: "2026-04-10",
      dueDate: "2026-05-10",
      amount: 150000,
      status: "partial",
      received: 75000
    },
    {
      id: "CINV-2026-002",
      customer: "Global Infrastructures",
      project: "Bridge Sensors",
      date: "2026-04-12",
      dueDate: "2026-05-12",
      amount: 85000,
      status: "paid",
      received: 85000
    }
  ];

  const columns = [
    {
      key: "id",
      label: "Invoice #",
      render: (val) => <span className="font-mono text-blue-600 font-bold">{val}</span>
    },
    {
      key: "customer",
      label: "Customer",
    },
    {
      key: "project",
      label: "Project",
    },
    {
      key: "date",
      label: "Invoice Date",
      render: (val) => new Date(val).toLocaleDateString()
    },
    {
      key: "amount",
      label: "Total Amount",
      align: "right",
      render: (val) => `₹${val.toLocaleString()}`
    },
    {
      key: "received",
      label: "Received",
      align: "right",
      render: (val) => <span className="text-emerald-600 font-medium">₹${val.toLocaleString()}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
          val === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          val === 'partial' ? 'bg-blue-50 text-blue-600 border-blue-100' :
          'bg-amber-50 text-amber-600 border-amber-100'
        } uppercase`}>
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Customer Invoices</h1>
          <p className="text-xs text-slate-500">Manage sales invoices and receivables</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all">
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Receivable</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">₹235,000</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Received</p>
          <p className="text-2xl font-bold text-emerald-600">₹160,000</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 uppercase font-bold mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-amber-600">₹75,000</p>
        </div>
      </div>

      <DataTable
        title="Sales Invoices"
        titleIcon={<FileText size={18} />}
        columns={columns}
        data={mockInvoices}
        searchPlaceholder="Search by invoice # or customer..."
      />
    </div>
  );
};

export default CustomerInvoicesPage;
