import { useState } from "react";
import {
  Download,
  Plus,
  Eye,
  Edit,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable/DataTable";

const CustomerInvoicesPage = () => {
  const customerInvoices = [
    {
      id: 1,
      invoiceNo: "CI-2025-001",
      customer: "Client A Industries",
      amount: 350000,
      dueDate: "2026-01-20",
      issueDate: "2025-12-20",
      status: "paid",
      description: "Production Run #1",
    },
    {
      id: 2,
      invoiceNo: "CI-2025-002",
      customer: "Client B Corp",
      amount: 520000,
      dueDate: "2026-01-10",
      issueDate: "2025-12-15",
      status: "partial",
      description: "Custom Manufacturing",
    },
    {
      id: 3,
      invoiceNo: "CI-2025-003",
      customer: "Global Solutions Ltd",
      amount: 275000,
      dueDate: "2025-12-30",
      issueDate: "2025-12-18",
      status: "pending",
      description: "Supply Delivery",
    },
    {
      id: 4,
      invoiceNo: "CI-2025-004",
      customer: "Tech Ventures Inc",
      amount: 425000,
      dueDate: "2026-01-15",
      issueDate: "2025-12-16",
      status: "pending",
      description: "Project Work",
    },
    {
      id: 5,
      invoiceNo: "CI-2025-005",
      customer: "Enterprise Solutions",
      amount: 600000,
      dueDate: "2026-02-01",
      issueDate: "2025-12-14",
      status: "pending",
      description: "Annual Contract",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "partial":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const stats = [
    {
      label: "Total Invoices",
      value: customerInvoices.length,
      color: "text-blue-600",
    },
    {
      label: "Paid",
      value: customerInvoices.filter((c) => c.status === "paid").length,
      color: "text-green-600",
    },
    {
      label: "Pending",
      value: customerInvoices.filter((c) => c.status === "pending").length,
      color: "text-yellow-600",
    },
    {
      label: "Partial",
      value: customerInvoices.filter((c) => c.status === "partial").length,
      color: "text-blue-600",
    },
  ];

  const totalAmount = customerInvoices.reduce((sum, c) => sum + c.amount, 0);
  const paidAmount = customerInvoices
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);
  const outstandingAmount = totalAmount - paidAmount;

  const columns = [
    {
      header: "Invoice",
      accessorKey: "invoiceNo",
      cell: (info) => (
        <span className=" text-slate-900 dark:text-white text-xs">
          {info.getValue()}
        </span>
      ),
    },
    {
      header: "Customer",
      accessorKey: "customer",
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
      header: "Due Date",
      accessorKey: "dueDate",
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
      cell: () => (
        <div className="flex justify-center gap-2">
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors">
            <Eye size={15} className="text-slate-500 dark:text-slate-400" />
          </button>
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors">
            <Edit size={15} className="text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white">
            Customer Invoices
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage customer invoices and collections
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button className="flex items-center text-xs gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors ">
            <Plus size={15} />
            New Invoice
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
            data={customerInvoices}
            searchPlaceholder="Search invoices..."
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { label: "All Invoices", value: "all" },
                  { label: "Paid", value: "paid" },
                  { label: "Pending", value: "pending" },
                  { label: "Partial", value: "partial" },
                  { label: "Overdue", value: "overdue" },
                ],
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg  text-slate-900 dark:text-white mb-4">
              Revenue Summary
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Total Invoiced
                </p>
                <p className="text-xl  text-slate-900 dark:text-white">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Paid Amount
                </p>
                <p className="text-xl  text-green-600">
                  ₹{paidAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Outstanding
                </p>
                <p className="text-xl  text-yellow-600">
                  ₹{outstandingAmount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInvoicesPage;
