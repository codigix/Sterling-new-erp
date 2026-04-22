import React, { useState } from "react";
import {
  TrendingUp,
  Search,
  MapPin,
  Package,
  Calendar,
  Filter,
  Download,
  BarChart3,
  Eye,
  Edit,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable/DataTable";

const TrackInventoryPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");

  const locations = [
    "all",
    "Storage A",
    "Storage B",
    "Storage C",
    "Storage D",
    "Storage E",
  ];

  const inventoryData = [
    {
      id: 1,
      item: "Steel Plate 10mm",
      sku: "SP-001",
      currentQty: 150,
      location: "Storage A-12-01",
      lastUpdated: "2024-12-15 14:30",
      variance: "+5",
      trend: "up",
    },
    {
      id: 2,
      item: "Aluminum Sheet",
      sku: "AS-002",
      currentQty: 450,
      location: "Storage B-05-03",
      lastUpdated: "2024-12-15 12:15",
      variance: "+20",
      trend: "up",
    },
    {
      id: 3,
      item: "Bearing Set A",
      sku: "BS-003",
      currentQty: 45,
      location: "Storage C-03-02",
      lastUpdated: "2024-12-14 10:00",
      variance: "-8",
      trend: "down",
    },
    {
      id: 4,
      item: "Paint - Red",
      sku: "PR-004",
      currentQty: 120,
      location: "Storage D-08-05",
      lastUpdated: "2024-12-15 09:45",
      variance: "+15",
      trend: "up",
    },
    {
      id: 5,
      item: "Fastener Pack",
      sku: "FP-005",
      currentQty: 2500,
      location: "Storage A-01-01",
      lastUpdated: "2024-12-14 15:30",
      variance: "+100",
      trend: "up",
    },
    {
      id: 6,
      item: "Wire Spool",
      sku: "WS-006",
      currentQty: 200,
      location: "Storage F-04-02",
      lastUpdated: "2024-12-12 13:00",
      variance: "0",
      trend: "stable",
    },
    {
      id: 7,
      item: "Motor Unit 3HP",
      sku: "MU-007",
      currentQty: 15,
      location: "Storage G-06-01",
      lastUpdated: "2024-12-14 11:20",
      variance: "-3",
      trend: "down",
    },
    {
      id: 8,
      item: "Packaging Box L",
      sku: "PB-008",
      currentQty: 80,
      location: "Storage E-02-04",
      lastUpdated: "2024-12-15 08:00",
      variance: "+10",
      trend: "up",
    },
  ];

  const filteredData = inventoryData.filter(
    (item) =>
      (item.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedLocation === "all" || item.location.startsWith(selectedLocation))
  );

  const getTrendColor = (trend) => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-blue-600";
    }
  };

  const getTrendBg = (trend) => {
    switch (trend) {
      case "up":
        return "bg-green-50 dark:bg-green-900/20";
      case "down":
        return "bg-red-50 dark:bg-red-900/20";
      default:
        return "bg-blue-50 dark:bg-blue-900/20";
    }
  };

  return (
    <div className="space-y-4 p-4">
      <DataTable
        title="Inventory Tracking"
        titleIcon={<TrendingUp size={15} />}
        titleExtra={
          <div className="flex items-center gap-2 ml-4">
            <button className="flex items-center text-xs gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shadow-sm">
              <Download size={14} /> Export Report
            </button>
          </div>
        }
        filters={[
          {
            key: "location",
            label: "Location",
            options: locations.filter(l => l !== "all").map(l => ({ label: l, value: l }))
          }
        ]}
        data={inventoryData}
        columns={[
          {
            key: "sku",
            label: "SKU",
            render: (val) => <span className="font-mono text-xs">{val}</span>
          },
          {
            key: "item",
            label: "Item Details",
            render: (val) => <span className="text-xs">{val}</span>
          },
          {
            key: "currentQty",
            label: "Current Qty",
            align: "right",
            render: (val, item) => (
              <div className="flex flex-col items-end">
                <span className="text-xs font-medium">{val}</span>
                <span className={`text-[10px] ${getTrendColor(item.trend)}`}>{item.variance}</span>
              </div>
            )
          },
          {
            key: "location",
            label: "Location",
            render: (val) => (
              <div className="flex items-center gap-1">
                <MapPin size={10} className="text-slate-400" />
                <span className="text-xs">{val}</span>
              </div>
            )
          },
          {
            key: "lastUpdated",
            label: "Last Updated",
            render: (val) => (
              <div className="flex items-center gap-1">
                <Calendar size={10} className="text-slate-400" />
                <span className="text-[10px]">{val}</span>
              </div>
            )
          },
          {
            key: "actions",
            label: "Actions",
            align: "right",
            render: (_, item) => (
              <div className="flex justify-end gap-2">
                <button className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                  <Eye size={14} />
                </button>
                <button className="p-1 text-slate-600 hover:bg-slate-50 rounded transition-colors">
                  <Edit size={14} />
                </button>
              </div>
            )
          }
        ]}
      />
    </div>
  );
};

export default TrackInventoryPage;
