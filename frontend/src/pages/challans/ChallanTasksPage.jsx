import React, { useState } from "react";
import {
  Plus,
  Eye,
  Edit2,
  Download,
  ArrowUp,
  ArrowDown,
  Filter,
  Truck,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import DataTable from "../../components/ui/DataTable/DataTable";
import "../../styles/TaskPage.css";

const ChallanTasksPage = () => {
  const [challans] = useState([
    {
      id: "CH-OUT-001",
      type: "outward",
      stage: "Painting - XYZ Outsourced",
      challanDate: "2025-01-28",
      vendor: "Quality Paint Services",
      items: 15,
      status: "issued",
      expectedReturn: "2025-02-05",
    },
    {
      id: "CH-IN-001",
      type: "inward",
      stage: "Painting - XYZ Outsourced",
      challanDate: "2025-01-22",
      vendor: "Quality Paint Services",
      items: 12,
      status: "received",
      receivedDate: "2025-01-25",
    },
    {
      id: "CH-OUT-002",
      type: "outward",
      stage: "Plating - ABC Outsourced",
      challanDate: "2025-01-25",
      vendor: "Chrome Plating Inc",
      items: 8,
      status: "issued",
      expectedReturn: "2025-02-02",
    },
    {
      id: "CH-IN-002",
      type: "inward",
      stage: "Plating - ABC Outsourced",
      challanDate: "2025-01-18",
      vendor: "Chrome Plating Inc",
      items: 8,
      status: "received",
      receivedDate: "2025-01-20",
    },
  ]);

  const [activeTab, setActiveTab] = useState("all");
  const [showNewChallan, setShowNewChallan] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case "issued":
        return "bg-blue-100 text-blue-800";
      case "in-transit":
        return "bg-yellow-100 text-yellow-800";
      case "received":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type) => {
    return type === "outward"
      ? "bg-purple-100 text-purple-800"
      : "bg-green-100 text-green-800";
  };

  const filteredChallans =
    activeTab === "all"
      ? challans
      : activeTab === "outward"
      ? challans.filter((c) => c.type === "outward")
      : challans.filter((c) => c.type === "inward");

  const stats = {
    total: challans.length,
    outward: challans.filter((c) => c.type === "outward").length,
    inward: challans.filter((c) => c.type === "inward").length,
    pending: challans.filter(
      (c) => c.status === "issued" || c.status === "in-transit"
    ).length,
  };

  const columns = [
    { key: "id", label: "Challan ID", className: "" },
    {
      key: "type",
      label: "Type",
      render: (val) => (
        <Badge className={getTypeColor(val)}>
          {val === "outward" ? (
            <ArrowUp size={14} className="inline mr-1" />
          ) : (
            <ArrowDown size={14} className="inline mr-1" />
          )}
          {val.charAt(0).toUpperCase() + val.slice(1)}
        </Badge>
      )
    },
    { key: "stage", label: "Stage/Process" },
    { key: "vendor", label: "Vendor" },
    { key: "items", label: "Items", align: "center" },
    {
      key: "challanDate",
      label: "Date",
      render: (val, row) => (
        <>
          {val}
          {row.type === "outward" && ` (Return: ${row.expectedReturn})`}
          {row.type === "inward" && ` (Received: ${row.receivedDate})`}
        </>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <Badge className={getStatusColor(val)}>
          {val.charAt(0).toUpperCase() + val.slice(1)}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "center",
      render: () => (
        <div className="flex justify-center gap-2">
          <button className="p-2 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 transition-colors">
            <Eye size={15} />
          </button>
          <button className="p-2 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 transition-colors">
            <Edit2 size={15} />
          </button>
          <button className="p-2 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 transition-colors">
            <Download size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="task-page-container">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Total Challans
            </p>
            <p className="text-xl  text-slate-900 dark:text-white text-xs mt-1">
              {stats.total}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Outward
            </p>
            <p className="text-2xl  text-purple-600 mt-1">
              {stats.outward}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Inward</p>
            <p className="text-2xl  text-green-600 mt-1">
              {stats.inward}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              In Transit
            </p>
            <p className="text-2xl  text-yellow-600 mt-1">
              {stats.pending}
            </p>
          </div>
        </Card>
      </div>

      {/* Tab and Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`p-2 rounded  transition-colors whitespace-nowrap ${
              activeTab === "all"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 dark:bg-slate-700  dark: hover:"
            }`}
          >
            All Challans
          </button>
          <button
            onClick={() => setActiveTab("outward")}
            className={`p-2 rounded  transition-colors whitespace-nowrap ${
              activeTab === "outward"
                ? "bg-purple-600 text-white"
                : "bg-slate-200 dark:bg-slate-700  dark: hover:"
            }`}
          >
            Outward
          </button>
          <button
            onClick={() => setActiveTab("inward")}
            className={`p-2 rounded  transition-colors whitespace-nowrap ${
              activeTab === "inward"
                ? "bg-green-600 text-white"
                : "bg-slate-200 dark:bg-slate-700  dark: hover:"
            }`}
          >
            Inward
          </button>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center text-xs gap-2 p-2 rounded text-xs bg-slate-200 dark:bg-slate-700  dark: hover: transition-colors">
            <Filter size={15} />
            Filter
          </button>
          <button
            onClick={() => setShowNewChallan(!showNewChallan)}
            className="flex items-center text-xs gap-2 p-2 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            New Challan
          </button>
        </div>
      </div>

      {/* New Challan Form */}
      {showNewChallan && (
        <Card className="mb-6 p-6">
          <h3 className="text-lg   dark: mb-4">Create New Challan</h3>
          <div className="task-form mb-4">
            <select className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700  dark:">
              <option>Select Challan Type...</option>
              <option>Outward (Material sent out)</option>
              <option>Inward (Material received)</option>
            </select>
            <input
              type="text"
              placeholder="Stage/Process"
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700  dark:"
            />
            <input
              type="text"
              placeholder="Vendor Name"
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700  dark:"
            />
            <input
              type="date"
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700  dark:"
            />
            <input
              type="number"
              placeholder="Number of Items"
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700  dark:"
            />
            <textarea
              placeholder="Items Description"
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700  dark:"
              rows="3"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              Create Challan
            </button>
            <button
              onClick={() => setShowNewChallan(false)}
              className="p-2 rounded  dark:bg-slate-600  dark: hover:bg-slate-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* Challans Table */}
      <Card>
        <DataTable
          columns={columns}
          data={filteredChallans}
          showSearch={true}
          searchPlaceholder="Search challans..."
        />
      </Card>
    </div>
  );
};

export default ChallanTasksPage;
