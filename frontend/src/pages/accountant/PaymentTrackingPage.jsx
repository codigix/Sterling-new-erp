import { useState } from "react";
import {
  Download,
  CheckCircle,
  Clock,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable/DataTable";

const PaymentTrackingPage = () => {
  const paymentTracking = [
    {
      id: 1,
      invoiceNo: "CI-2025-001",
      customer: "Client A Industries",
      amount: 350000,
      paymentAmount: 350000,
      status: "paid",
      paymentDate: "2025-12-18",
      daysOutstanding: 0,
    },
    {
      id: 2,
      invoiceNo: "CI-2025-002",
      customer: "Client B Corp",
      amount: 520000,
      paymentAmount: 260000,
      status: "partial",
      paymentDate: "2025-12-19",
      daysOutstanding: 3,
    },
    {
      id: 3,
      invoiceNo: "CI-2025-003",
      customer: "Global Solutions Ltd",
      amount: 275000,
      paymentAmount: 0,
      status: "pending",
      paymentDate: null,
      daysOutstanding: 12,
    },
    {
      id: 4,
      invoiceNo: "CI-2025-004",
      customer: "Tech Ventures Inc",
      amount: 425000,
      paymentAmount: 0,
      status: "pending",
      paymentDate: null,
      daysOutstanding: 9,
    },
    {
      id: 5,
      invoiceNo: "CI-2025-005",
      customer: "Enterprise Solutions",
      amount: 600000,
      paymentAmount: 0,
      status: "pending",
      paymentDate: null,
      daysOutstanding: 7,
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return <CheckCircle size={15} className="text-green-600" />;
      case "partial":
        return <Clock size={15} className="text-blue-600" />;
      case "pending":
        return <Clock size={15} className="text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "partial":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const stats = [
    {
      label: "Total Outstanding",
      value: "₹22,15,000",
      color: "text-yellow-600",
    },
    { label: "Total Received", value: "₹6,10,000", color: "text-green-600" },
    {
      label: "Avg Days Outstanding",
      value: "8.2 days",
      color: "text-blue-600",
    },
    { label: "Collection Rate", value: "73.5%", color: "text-purple-600" },
  ];

  const totalAmount = paymentTracking.reduce((sum, p) => sum + p.amount, 0);
  const totalReceived = paymentTracking.reduce(
    (sum, p) => sum + p.paymentAmount,
    0
  );
  const totalPending = totalAmount - totalReceived;

  const columns = [
    {
      header: "Invoice",
      accessorKey: "invoiceNo",
      cell: (info) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(info.row.original.status)}
          <span className=" text-slate-900 dark:text-white text-xs">
            {info.getValue()}
          </span>
        </div>
      ),
    },
    {
      header: "Customer",
      accessorKey: "customer",
    },
    {
      header: "Invoice Amount",
      accessorKey: "amount",
      cell: (info) => (
        <span className=" text-slate-900 dark:text-white text-xs">
          ₹{info.getValue().toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      header: "Received",
      accessorKey: "paymentAmount",
      cell: (info) => (
        <span className=" text-green-600 text-xs">
          ₹{info.getValue().toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      header: "Outstanding",
      id: "outstanding",
      cell: (info) => (
        <span className=" text-yellow-600 text-xs">
          ₹{(info.row.original.amount - info.row.original.paymentAmount).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      header: "Days",
      accessorKey: "daysOutstanding",
      cell: (info) => (
        <span className="text-xs">{info.getValue()} days</span>
      ),
    },
    {
      header: "Collection",
      id: "collection",
      cell: (info) => {
        const percentage = (info.row.original.paymentAmount / info.row.original.amount) * 100;
        return (
          <div className="w-24">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded h-1.5 mb-1">
              <div
                className="bg-green-600 h-1.5 rounded transition-all"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500">{percentage.toFixed(0)}%</p>
          </div>
        );
      },
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
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white">
            Payment Tracking
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Monitor customer payment status and collections
          </p>
        </div>
        <button className="flex items-center text-xs gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded transition-colors ">
          <Download size={15} />
          Export Report
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <DataTable
            columns={columns}
            data={paymentTracking}
            searchPlaceholder="Search payments..."
            filters={[
              {
                key: "status",
                label: "Status",
                options: [
                  { label: "All Status", value: "all" },
                  { label: "Paid", value: "paid" },
                  { label: "Pending", value: "pending" },
                  { label: "Partial", value: "partial" },
                ],
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg  text-slate-900 dark:text-white mb-4">
              Collection Summary
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
                  Received
                </p>
                <p className="text-xl  text-green-600">
                  ₹{totalReceived.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Pending
                </p>
                <p className="text-xl  text-yellow-600">
                  ₹{totalPending.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentTrackingPage;
