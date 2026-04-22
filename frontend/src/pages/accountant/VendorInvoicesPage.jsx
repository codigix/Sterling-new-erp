import { useState } from "react";
import {
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable/DataTable";

const VendorInvoicesPage = () => {
  const vendorInvoices = [
    {
      id: 1,
      invoiceNo: "VI-2025-001",
      vendor: "ABC Supplies Ltd",
      amount: 150000,
      dueDate: "2025-12-25",
      issueDate: "2025-12-16",
      status: "pending",
      description: "Raw Materials",
    },
    {
      id: 2,
      invoiceNo: "VI-2025-002",
      vendor: "XYZ Manufacturing",
      amount: 280000,
      dueDate: "2025-12-22",
      issueDate: "2025-12-10",
      status: "overdue",
      description: "Equipment Parts",
    },
    {
      id: 3,
      invoiceNo: "VI-2025-003",
      vendor: "Tech Components Co",
      amount: 95000,
      dueDate: "2026-01-15",
      issueDate: "2025-12-15",
      status: "pending",
      description: "Electronic Components",
    },
    {
      id: 4,
      invoiceNo: "VI-2025-004",
      vendor: "Global Logistics",
      amount: 45000,
      dueDate: "2025-12-20",
      issueDate: "2025-12-05",
      status: "paid",
      description: "Shipping Services",
    },
    {
      id: 5,
      invoiceNo: "VI-2025-005",
      vendor: "Quality Chemicals",
      amount: 125000,
      dueDate: "2026-01-10",
      issueDate: "2025-12-12",
      status: "pending",
      description: "Chemical Supplies",
    },
    {
      id: 6,
      invoiceNo: "VI-2025-006",
      vendor: "Industrial Tools",
      amount: 87000,
      dueDate: "2025-12-23",
      issueDate: "2025-12-08",
      status: "overdue",
      description: "Maintenance Tools",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const stats = [
    {
      label: "Total Invoices",
      value: vendorInvoices.length,
      color: "text-blue-600",
    },
    {
      label: "Pending",
      value: vendorInvoices.filter((v) => v.status === "pending").length,
      color: "text-yellow-600",
    },
    {
      label: "Overdue",
      value: vendorInvoices.filter((v) => v.status === "overdue").length,
      color: "text-red-600",
    },
    {
      label: "Paid",
      value: vendorInvoices.filter((v) => v.status === "paid").length,
      color: "text-green-600",
    },
  ];

  const totalAmount = vendorInvoices.reduce((sum, v) => sum + v.amount, 0);
  const pendingAmount = vendorInvoices
    .filter((v) => v.status !== "paid")
    .reduce((sum, v) => sum + v.amount, 0);

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
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors">
            <Trash2 size={15} className="text-red-600 dark:text-red-400" />
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
            Vendor Invoices
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage vendor bills and invoices
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
            data={vendorInvoices}
            searchPlaceholder="Search invoices..."
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { label: "All Invoices", value: "all" },
                  { label: "Pending", value: "pending" },
                  { label: "Overdue", value: "overdue" },
                  { label: "Paid", value: "paid" },
                ],
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg  text-slate-900 dark:text-white mb-4">
              Summary
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
                  Pending Amount
                </p>
                <p className="text-2xl  text-yellow-600">
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

export default VendorInvoicesPage;
