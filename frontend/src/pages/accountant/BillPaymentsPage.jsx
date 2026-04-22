import { useState } from "react";
import {
  Download,
  Plus,
  Eye,
  CheckCircle,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable/DataTable";

const BillPaymentsPage = () => {
  const billPayments = [
    {
      id: 1,
      paymentNo: "BP-2025-001",
      vendor: "ABC Supplies Ltd",
      amount: 150000,
      dueDate: "2025-12-25",
      paymentDate: "2025-12-20",
      method: "NEFT",
      status: "completed",
    },
    {
      id: 2,
      paymentNo: "BP-2025-002",
      vendor: "XYZ Manufacturing",
      amount: 280000,
      dueDate: "2025-12-22",
      paymentDate: null,
      method: "Cheque",
      status: "pending",
    },
    {
      id: 3,
      paymentNo: "BP-2025-003",
      vendor: "Tech Components Co",
      amount: 95000,
      dueDate: "2026-01-15",
      paymentDate: null,
      method: "RTGS",
      status: "scheduled",
    },
    {
      id: 4,
      paymentNo: "BP-2025-004",
      vendor: "Global Logistics",
      amount: 45000,
      dueDate: "2025-12-20",
      paymentDate: "2025-12-18",
      method: "NEFT",
      status: "completed",
    },
    {
      id: 5,
      paymentNo: "BP-2025-005",
      vendor: "Quality Chemicals",
      amount: 125000,
      dueDate: "2026-01-10",
      paymentDate: null,
      method: "Cheque",
      status: "pending",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const stats = [
    {
      label: "Total Payments",
      value: billPayments.length,
      color: "text-blue-600",
    },
    {
      label: "Completed",
      value: billPayments.filter((b) => b.status === "completed").length,
      color: "text-green-600",
    },
    {
      label: "Pending",
      value: billPayments.filter((b) => b.status === "pending").length,
      color: "text-yellow-600",
    },
    {
      label: "Scheduled",
      value: billPayments.filter((b) => b.status === "scheduled").length,
      color: "text-blue-600",
    },
  ];

  const totalAmount = billPayments.reduce((sum, b) => sum + b.amount, 0);
  const completedAmount = billPayments
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.amount, 0);
  const pendingAmount = totalAmount - completedAmount;

  const columns = [
    {
      header: "Payment",
      accessorKey: "paymentNo",
      cell: (info) => (
        <span className=" text-slate-900 dark:text-white text-xs">
          {info.getValue()}
        </span>
      ),
    },
    {
      header: "Vendor",
      accessorKey: "vendor",
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: (info) => (
        <span className=" text-slate-900 dark:text-white text-xs">
          ₹{info.getValue().toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      header: "Method",
      accessorKey: "method",
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (info) => (
        <span
          className={`px-3 py-1 rounded text-xs  ${getStatusColor(
            info.getValue()
          )}`}
        >
          {info.getValue().charAt(0).toUpperCase() + info.getValue().slice(1)}
        </span>
      ),
    },
    {
      header: "Actions",
      id: "actions",
      cell: (info) => (
        <div className="flex justify-center gap-2">
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors">
            <Eye size={15} className="text-slate-500 dark:text-slate-400" />
          </button>
          {info.row.original.status === "pending" && (
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors">
              <CheckCircle size={15} className="text-green-600 dark:text-green-400" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white">
            Bill Payments
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track and manage bill payments
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button className="flex items-center text-xs gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors ">
            <Plus size={15} />
            New Payment
          </button>
          <button className="flex items-center text-xs gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded transition-colors ">
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-4"
          >
            <p className="text-sm  text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
            <p className={`text-2xl  mt-2 ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DataTable
            columns={columns}
            data={billPayments}
            searchPlaceholder="Search payments..."
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { label: "All Payments", value: "all" },
                  { label: "Completed", value: "completed" },
                  { label: "Pending", value: "pending" },
                  { label: "Scheduled", value: "scheduled" },
                ],
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg  text-slate-900 dark:text-white mb-4">
              Payment Summary
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Total Amount
                </p>
                <p className="text-xl  text-slate-900 dark:text-white">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Completed
                </p>
                <p className="text-xl  text-green-600">
                  ₹{completedAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Pending
                </p>
                <p className="text-xl  text-yellow-600">
                  ₹{pendingAmount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillPaymentsPage;
