import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Package,
  Search,
  Edit,
  Save,
  X,
  Plus,
  Download,
  ShoppingCart,
  TrendingDown,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable/DataTable";

const ReorderLevelsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  const reorderItems = [
    {
      id: 1,
      name: "Steel Plate 10mm",
      current: 150,
      reorderLevel: 100,
      reorderQty: 200,
      status: "low",
      supplier: "Vendor A",
      lastOrdered: "2024-12-05",
      leadTime: "7 days",
    },
    {
      id: 2,
      name: "Bearing Set A",
      current: 45,
      reorderLevel: 80,
      reorderQty: 150,
      status: "critical",
      supplier: "Vendor B",
      lastOrdered: "2024-11-28",
      leadTime: "5 days",
    },
    {
      id: 3,
      name: "Aluminum Sheet",
      current: 450,
      reorderLevel: 200,
      reorderQty: 300,
      status: "optimal",
      supplier: "Vendor A",
      lastOrdered: "2024-12-12",
      leadTime: "7 days",
    },
    {
      id: 4,
      name: "Packaging Box L",
      current: 80,
      reorderLevel: 150,
      reorderQty: 300,
      status: "low",
      supplier: "Vendor D",
      lastOrdered: "2024-11-25",
      leadTime: "10 days",
    },
    {
      id: 5,
      name: "Paint - Red",
      current: 120,
      reorderLevel: 50,
      reorderQty: 100,
      status: "optimal",
      supplier: "Vendor C",
      lastOrdered: "2024-12-10",
      leadTime: "3 days",
    },
    {
      id: 6,
      name: "Motor Unit 3HP",
      current: 15,
      reorderLevel: 20,
      reorderQty: 30,
      status: "critical",
      supplier: "Vendor B",
      lastOrdered: "2024-12-01",
      leadTime: "14 days",
    },
    {
      id: 7,
      name: "Wire Spool",
      current: 200,
      reorderLevel: 100,
      reorderQty: 200,
      status: "optimal",
      supplier: "Vendor E",
      lastOrdered: "2024-12-08",
      leadTime: "5 days",
    },
    {
      id: 8,
      name: "Fastener Pack",
      current: 2500,
      reorderLevel: 1000,
      reorderQty: 2000,
      status: "optimal",
      supplier: "Vendor A",
      lastOrdered: "2024-12-09",
      leadTime: "7 days",
    },
  ];

  const filteredItems = reorderItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "optimal":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "low":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditValues({ ...item });
  };

  const handleSave = () => {
    console.log("Saving reorder levels:", editValues);
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleCreateOrder = (item) => {
    console.log("Creating purchase order for:", item.name);
  };

  const handleExport = () => {
    console.log("Exporting reorder levels...");
  };

  const columns = useMemo(
    () => [
      {
        label: "Item Name",
        key: "name",
        render: (_, row) => (
          <div>
            <p className="text-slate-900 dark:text-white text-xs">{row.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last ordered: {row.lastOrdered}
            </p>
          </div>
        ),
      },
      {
        label: "Current Stock",
        key: "current",
        className: "text-center",
        render: (val, row) =>
          editingId === row.id ? (
            <input
              type="number"
              value={editValues.current}
              onChange={(e) =>
                setEditValues({
                  ...editValues,
                  current: parseInt(e.target.value),
                })
              }
              className="w-20 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center"
            />
          ) : (
            <span className="text-slate-900 dark:text-white text-xs">{val}</span>
          ),
      },
      {
        label: "Reorder Level",
        key: "reorderLevel",
        className: "text-center",
        render: (val, row) =>
          editingId === row.id ? (
            <input
              type="number"
              value={editValues.reorderLevel}
              onChange={(e) =>
                setEditValues({
                  ...editValues,
                  reorderLevel: parseInt(e.target.value),
                })
              }
              className="w-20 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center"
            />
          ) : (
            <span className="text-slate-900 dark:text-white text-xs">{val}</span>
          ),
      },
      {
        label: "Reorder Qty",
        key: "reorderQty",
        className: "text-center",
        render: (val, row) =>
          editingId === row.id ? (
            <input
              type="number"
              value={editValues.reorderQty}
              onChange={(e) =>
                setEditValues({
                  ...editValues,
                  reorderQty: parseInt(e.target.value),
                })
              }
              className="w-20 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center"
            />
          ) : (
            <span className="text-slate-900 dark:text-white text-xs">{val}</span>
          ),
      },
      {
        label: "Supplier",
        key: "supplier",
        render: (val) => <span className="text-xs text-slate-600">{val}</span>
      },
      {
        label: "Status",
        key: "status",
        className: "text-center",
        render: (val) => (
          <span
            className={`px-2 py-1 rounded text-[10px] font-medium ${getStatusColor(
              val
            )}`}
          >
            {val.toUpperCase()}
          </span>
        ),
      },
      {
        label: "Actions",
        className: "text-center",
        render: (_, row) => {
          return editingId === row.id ? (
            <div className="flex justify-center gap-2">
              <button
                onClick={handleSave}
                className="p-2 hover:bg-green-100 dark:hover:bg-green-900 text-green-600 dark:text-green-400 rounded transition-colors"
              >
                <Save size={15} />
              </button>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => handleEdit(row)}
                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 rounded transition-colors"
              >
                <Edit size={15} />
              </button>
              <button
                onClick={() => handleCreateOrder(row)}
                className="p-2 hover:bg-green-100 dark:hover:bg-green-900 text-green-600 dark:text-green-400 rounded transition-colors"
                disabled={row.status === "optimal"}
              >
                <ShoppingCart size={15} />
              </button>
            </div>
          );
        },
      },
    ],
    [editingId, editValues]
  );

  const criticalItems = filteredItems.filter((item) => item.status === "critical");
  const lowStockItems = filteredItems.filter((item) => item.status === "low");
  const optimalItems = filteredItems.filter(
    (item) => item.status === "optimal"
  );

  return (
    <div className="space-y-4 p-4">
      <DataTable
        title="Reorder Levels Management"
        titleIcon={<AlertTriangle size={15} />}
        titleExtra={
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleExport}
              className="flex items-center text-xs gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shadow-sm"
            >
              <Download size={14} /> Export
            </button>
            <button className="flex items-center text-xs gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors shadow-sm">
              <Plus size={14} /> Add Item
            </button>
          </div>
        }
        filters={[
          {
            key: "status",
            label: "Stock Status",
            options: [
              { label: "Critical", value: "critical" },
              { label: "Low", value: "low" },
              { label: "Optimal", value: "optimal" },
            ]
          }
        ]}
        data={reorderItems}
        columns={columns}
      />
    </div>
  );
};

export default ReorderLevelsPage;
