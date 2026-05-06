import React, { useState } from "react";
import DataTable from "../../components/ui/DataTable/DataTable";
import { 
  BarChart4, 
  Plus, 
  Download, 
  Eye, 
  Settings,
  List,
  FolderTree
} from "lucide-react";

const ChartOfAccountsPage = () => {
  const mockAccounts = [
    {
      code: "1000",
      name: "Fixed Assets",
      type: "Asset",
      balance: 1500000,
      status: "active",
    },
    {
      code: "1100",
      name: "Cash in Hand",
      type: "Asset",
      balance: 45000,
      status: "active",
    },
    {
      code: "1200",
      name: "HDFC Bank Account",
      type: "Asset",
      balance: 850000,
      status: "active",
    },
    {
      code: "2000",
      name: "Accounts Payable",
      type: "Liability",
      balance: 225000,
      status: "active",
    },
    {
      code: "3000",
      name: "Equity Capital",
      type: "Equity",
      balance: 2000000,
      status: "active",
    },
    {
      code: "4000",
      name: "Sales Revenue",
      type: "Revenue",
      balance: 450000,
      status: "active",
    },
    {
      code: "5000",
      name: "Direct Expenses",
      type: "Expense",
      balance: 125000,
      status: "active",
    }
  ];

  const columns = [
    {
      key: "code",
      label: "Account Code",
      render: (val) => <span className="font-mono text-slate-600 ">{val}</span>
    },
    {
      key: "name",
      label: "Account Name",
      render: (val) => <span className=" text-slate-800 dark:text-slate-200">{val}</span>
    },
    {
      key: "type",
      label: "Type",
      render: (val) => (
        <span className={`px-2 py-0.5 rounded text-[10px]   ${
          val === 'Asset' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
          val === 'Liability' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
          val === 'Equity' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
          val === 'Revenue' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
          'bg-slate-50 text-slate-600 border border-slate-100'
        }`}>
          {val}
        </span>
      )
    },
    {
      key: "balance",
      label: "Current Balance",
      align: "right",
      render: (val) => <span className=" text-slate-700">₹${val.toLocaleString()}</span>
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <span className="px-2 py-1 rounded-full text-[10px]  border bg-emerald-50 text-emerald-600 border-emerald-100 ">
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
            <Settings size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white">Chart of Accounts</h1>
          <p className="text-xs text-slate-500">Manage your organization's financial accounts</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 p-2 bg-white border border-slate-200 text-slate-600 rounded text-sm hover:bg-slate-50 transition-all font-medium">
            <Download size={16} /> Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all font-medium">
            <Plus size={16} /> Add Account
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] text-slate-500   mb-1">Total Assets</p>
          <p className="text-lg  text-blue-600 font-mono">₹2,395,000</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] text-slate-500   mb-1">Total Liabilities</p>
          <p className="text-lg  text-orange-600 font-mono">₹225,000</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] text-slate-500   mb-1">Total Revenue</p>
          <p className="text-lg  text-emerald-600 font-mono">₹450,000</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] text-slate-500   mb-1">Total Expenses</p>
          <p className="text-lg  text-red-600 font-mono">₹125,000</p>
        </div>
      </div>

      <DataTable
        title="Account Hierarchy"
        titleIcon={<FolderTree size={18} />}
        columns={columns}
        data={mockAccounts}
        searchPlaceholder="Search by account name or code..."
      />
    </div>
  );
};

export default ChartOfAccountsPage;
