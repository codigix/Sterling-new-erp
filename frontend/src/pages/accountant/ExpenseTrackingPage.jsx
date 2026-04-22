import { useState } from "react";
import {
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  X,
  FileText,
  User,
  IndianRupee,
  RefreshCw
} from "lucide-react";
import DataTable from "../../components/ui/DataTable/DataTable";

const ExpenseTrackingPage = () => {
  const [loading, setLoading] = useState(false);

  const expenses = [
    {
      id: 1,
      date: "2025-12-20",
      category: "Travel",
      description: "Hotel stay in Mumbai",
      amount: 8500,
      employee: "John Smith",
      receipt: "yes",
      status: "approved",
      approvedBy: "Manager A",
    },
    {
      id: 2,
      date: "2025-12-19",
      category: "Meals",
      description: "Team lunch meeting",
      amount: 3200,
      employee: "Sarah Johnson",
      receipt: "yes",
      status: "pending",
      approvedBy: null,
    },
    {
      id: 3,
      date: "2025-12-18",
      category: "Office Supplies",
      description: "Printer cartridges",
      amount: 2150,
      employee: "Mike Chen",
      receipt: "yes",
      status: "approved",
      approvedBy: "Manager B",
    },
    {
      id: 4,
      date: "2025-12-17",
      category: "Client Meeting",
      description: "Client entertainment",
      amount: 5800,
      employee: "Emma Davis",
      receipt: "no",
      status: "pending",
      approvedBy: null,
    },
    {
      id: 5,
      date: "2025-12-16",
      category: "Travel",
      description: "Flight tickets",
      amount: 12500,
      employee: "Alex Brown",
      receipt: "yes",
      status: "approved",
      approvedBy: "Manager A",
    },
    {
      id: 6,
      date: "2025-12-15",
      category: "Conferences",
      description: "Conference registration",
      amount: 4500,
      employee: "Lisa White",
      receipt: "yes",
      status: "approved",
      approvedBy: "Director",
    },
  ];

  const stats = [
    { label: "Total Expenses", value: expenses.length, color: "text-blue-600", bgColor: "bg-blue-50" },
    {
      label: "Approved",
      value: expenses.filter((e) => e.status === "approved").length,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    {
      label: "Pending",
      value: expenses.filter((e) => e.status === "pending").length,
      color: "text-amber-600",
      bgColor: "bg-amber-50"
    },
    {
      label: "Total Amount",
      value: "₹" + expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString("en-IN"),
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
  ];

  const columns = [
    {
      header: "Date",
      accessor: "date",
      render: (val) => <span className="text-xs text-slate-500 ">{val}</span>
    },
    {
      header: "Employee / Category",
      accessor: "employee",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs  text-slate-900 flex items-center gap-1.5">
            <User size={12} className="text-slate-400" />
            {val}
          </span>
          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-1">{row.category}</span>
        </div>
      )
    },
    {
      header: "Description",
      accessor: "description",
      render: (val) => <span className="text-xs text-slate-600 line-clamp-1" title={val}>{val}</span>
    },
    {
      header: "Amount",
      accessor: "amount",
      className: "text-right",
      render: (val) => (
        <span className="text-xs  text-slate-900 flex items-center justify-end gap-1">
          <IndianRupee size={12} />
          {val.toLocaleString("en-IN")}
        </span>
      )
    },
    {
      header: "Status",
      accessor: "status",
      className: "text-right",
      render: (status) => (
        <span className={`px-2 py-0.5 rounded text-[10px]  border ${
          status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
          'bg-red-50 text-red-600 border-red-100'
        }`}>
          {status.toUpperCase()}
        </span>
      )
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="text-blue-600" size={20} />
            Expense Tracking
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage and approve employee expenses
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center text-xs gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors  shadow-sm">
            <Plus size={15} />
            New Expense
          </button>
          <button className="flex items-center text-xs gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded transition-colors ">
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 p-3 shadow-sm"
          >
            <p className="text-[10px]  text-slate-400 uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className={`text-lg  ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <DataTable 
        columns={columns}
        data={expenses}
        loading={loading}
        searchPlaceholder="Search employee, description..."
        filters={[
          {
            label: "Status",
            column: "status",
            options: [
              { label: "ALL", value: "" },
              { label: "APPROVED", value: "approved" },
              { label: "PENDING", value: "pending" },
              { label: "REJECTED", value: "rejected" }
            ]
          },
          {
            label: "Category",
            column: "category",
            options: [
              { label: "ALL CATEGORIES", value: "" },
              { label: "TRAVEL", value: "Travel" },
              { label: "MEALS", value: "Meals" },
              { label: "OFFICE SUPPLIES", value: "Office Supplies" },
              { label: "CLIENT MEETING", value: "Client Meeting" },
              { label: "CONFERENCES", value: "Conferences" }
            ]
          }
        ]}
      />
    </div>
  );
};

export default ExpenseTrackingPage;
