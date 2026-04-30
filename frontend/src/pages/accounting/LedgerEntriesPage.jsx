import React, { useState } from "react";
import DataTable from "../../components/ui/DataTable/DataTable";
import { 
  BookOpen, 
  Plus, 
  Download, 
  Eye, 
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar
} from "lucide-react";

const LedgerEntriesPage = () => {
  const mockLedgerEntries = [
    {
      id: "GL-001",
      date: "2026-04-20",
      description: "Payment received from TechnoWorld Systems",
      account: "Accounts Receivable",
      type: "credit",
      amount: 75000,
    },
    {
      id: "GL-002",
      date: "2026-04-20",
      description: "Payment received from TechnoWorld Systems",
      account: "Bank Account (HDFC)",
      type: "debit",
      amount: 75000,
    },
    {
      id: "GL-003",
      date: "2026-04-18",
      description: "Office Supplies Purchase",
      account: "Petty Cash",
      type: "credit",
      amount: 2500,
    },
    {
      id: "GL-004",
      date: "2026-04-18",
      description: "Office Supplies Purchase",
      account: "Office Expense",
      type: "debit",
      amount: 2500,
    }
  ];

  const columns = [
    {
      key: "date",
      label: "Date",
      render: (val) => new Date(val).toLocaleDateString()
    },
    {
      key: "id",
      label: "Ref #",
      render: (val) => <span className="font-mono text-slate-600 font-bold">{val}</span>
    },
    {
      key: "description",
      label: "Description",
    },
    {
      key: "account",
      label: "Account Name",
    },
    {
      key: "debit",
      label: "Debit (Dr)",
      align: "right",
      render: (_, row) => row.type === 'debit' ? <span className="text-emerald-600 font-bold">₹${row.amount.toLocaleString()}</span> : '-'
    },
    {
      key: "credit",
      label: "Credit (Cr)",
      align: "right",
      render: (_, row) => row.type === 'credit' ? <span className="text-red-600 font-bold">₹${row.amount.toLocaleString()}</span> : '-'
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
        </div>
      )
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">General Ledger Entries</h1>
          <p className="text-xs text-slate-500">View all accounting journal entries</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded text-sm hover:bg-slate-50 transition-all font-medium">
            <Download size={16} /> Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all">
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Total Debits</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">₹77,500</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Total Credits</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">₹77,500</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded">
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Trial Balance</p>
            <p className="text-xl font-bold text-emerald-600">Balanced</p>
          </div>
        </div>
      </div>

      <DataTable
        title="Ledger Entries"
        titleIcon={<BookOpen size={18} />}
        columns={columns}
        data={mockLedgerEntries}
        searchPlaceholder="Search by description or account..."
      />
    </div>
  );
};

export default LedgerEntriesPage;
