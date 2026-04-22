import React, { useState, useEffect } from "react";
import {
  Package,
  Search,
  Plus,
  Filter,
  Download,
  Trash2,
  Eye,
  Check,
  Clock,
  AlertTriangle,
} from "lucide-react";
import useRootCardInventoryTask from "../../hooks/useRootCardInventoryTask";

import DataTable from "../../components/ui/DataTable/DataTable";

const BatchManagementPage = () => {
  const { completeCurrentTask } = useRootCardInventoryTask();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    completeCurrentTask("Batch and location management completed");
  }, [completeCurrentTask]);

  const batchData = [
    {
      id: 1,
      batchNo: "BATCH-001-2024",
      item: "Steel Plate 10mm",
      supplier: "Vendor A",
      quantity: 500,
      unit: "kg",
      dateReceived: "2024-12-01",
      expiryDate: "2025-12-01",
      status: "active",
      location: "Storage A-12-01",
    },
    {
      id: 2,
      batchNo: "BATCH-002-2024",
      item: "Aluminum Sheet",
      supplier: "Vendor A",
      quantity: 300,
      unit: "sheets",
      dateReceived: "2024-12-05",
      expiryDate: "2025-06-05",
      status: "active",
      location: "Storage B-05-03",
    },
    {
      id: 3,
      batchNo: "BATCH-003-2024",
      item: "Bearing Set A",
      supplier: "Vendor B",
      quantity: 100,
      unit: "sets",
      dateReceived: "2024-11-15",
      expiryDate: "2024-12-25",
      status: "expiring",
      location: "Storage C-03-02",
    },
    {
      id: 4,
      batchNo: "BATCH-004-2024",
      item: "Paint - Red",
      supplier: "Vendor C",
      quantity: 200,
      unit: "liters",
      dateReceived: "2024-10-20",
      expiryDate: "2024-10-30",
      status: "expired",
      location: "Storage D-08-05",
    },
    {
      id: 5,
      batchNo: "BATCH-005-2024",
      item: "Fastener Pack",
      supplier: "Vendor A",
      quantity: 5000,
      unit: "pcs",
      dateReceived: "2024-12-10",
      expiryDate: "2026-12-10",
      status: "active",
      location: "Storage A-01-01",
    },
    {
      id: 6,
      batchNo: "BATCH-006-2024",
      item: "Wire Spool",
      supplier: "Vendor E",
      quantity: 400,
      unit: "meters",
      dateReceived: "2024-11-30",
      expiryDate: "2025-11-30",
      status: "active",
      location: "Storage F-04-02",
    },
    {
      id: 7,
      batchNo: "BATCH-007-2024",
      item: "Motor Unit 3HP",
      supplier: "Vendor B",
      quantity: 50,
      unit: "units",
      dateReceived: "2024-11-05",
      expiryDate: "2025-11-05",
      status: "active",
      location: "Storage G-06-01",
    },
    {
      id: 8,
      batchNo: "BATCH-008-2024",
      item: "Packaging Box L",
      supplier: "Vendor D",
      quantity: 1000,
      unit: "boxes",
      dateReceived: "2024-12-08",
      expiryDate: "2025-12-08",
      status: "active",
      location: "Storage E-02-04",
    },
  ];

  const filteredData = batchData.filter(
    (batch) =>
      (batch.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.item.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === "all" || batch.status === statusFilter)
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "expiring":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "expired":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <Check size={15} />;
      case "expiring":
        return <Clock size={15} />;
      case "expired":
        return <AlertTriangle size={15} />;
      default:
        return null;
    }
  };

  const calculateDaysUntilExpiry = (expiryDate) => {
    const today = new Date("2024-12-15");
    const expiry = new Date(expiryDate);
    const days = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
    return days;
  };

  const columns = [
    {
      key: "batchNo",
      label: "Batch Number",
      sortable: true,
    },
    {
      key: "item",
      label: "Item",
      sortable: true,
    },
    {
      key: "quantity",
      label: "Quantity",
      align: "center",
      sortable: true,
      render: (val, row) => (
        <span>
          {val} <span className="text-xs text-slate-500">{row.unit}</span>
        </span>
      )
    },
    {
      key: "supplier",
      label: "Supplier",
      sortable: true,
    },
    {
      key: "expiryDate",
      label: "Expiry Date",
      sortable: true,
      render: (val) => {
        const daysLeft = calculateDaysUntilExpiry(val);
        return (
          <div>
            <p className="text-xs">{val}</p>
            <p className={`text-[10px] mt-0.5 ${
              daysLeft <= 0 ? "text-red-600" : daysLeft <= 30 ? "text-yellow-600" : "text-green-600"
            }`}>
              {daysLeft <= 0 ? "Expired" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
            </p>
          </div>
        );
      }
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      sortable: true,
      render: (val) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${getStatusColor(val)}`}>
          {getStatusIcon(val)}
          {val.charAt(0).toUpperCase() + val.slice(1)}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "center",
      render: (_, row) => (
        <div className="flex justify-center gap-1">
          <button className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 rounded transition-colors">
            <Eye size={14} />
          </button>
          <button className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4 p-4">
      <DataTable
        title="Batch Management"
        titleIcon={<Package size={15} />}
        titleExtra={
          <div className="flex items-center gap-2 ml-4">
            <button className="flex items-center text-xs gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors shadow-sm">
              <Plus size={14} /> New Batch
            </button>
            <button className="flex items-center text-xs gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shadow-sm">
              <Download size={14} /> Export
            </button>
          </div>
        }
        data={batchData}
        columns={columns}
        filters={[
          {
            label: "Status",
            key: "status",
            options: [
              { label: "Active", value: "active" },
              { label: "Expiring Soon", value: "expiring" },
              { label: "Expired", value: "expired" },
            ],
          },
        ]}
      />
    </div>
  );
};

export default BatchManagementPage;
