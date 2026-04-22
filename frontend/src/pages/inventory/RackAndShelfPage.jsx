import React, { useState } from "react";
import {
  Grid3x3,
  Plus,
  Download,
  Edit,
  Trash2,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable/DataTable";

const RackAndShelfPage = () => {
  const wings = ["all", "Wing A", "Wing B", "Wing C", "Wing D", "Wing E"];

  const rackData = [
    {
      id: 1,
      location: "A-12-01",
      wing: "Wing A",
      rack: 12,
      shelf: 1,
      capacity: 500,
      current: 150,
      item: "Steel Plate 10mm",
      utilization: 30,
      status: "active",
    },
    {
      id: 2,
      location: "A-12-02",
      wing: "Wing A",
      rack: 12,
      shelf: 2,
      capacity: 300,
      current: 280,
      item: "Fastener Pack",
      utilization: 93,
      status: "high",
    },
    {
      id: 3,
      location: "B-05-03",
      wing: "Wing B",
      rack: 5,
      shelf: 3,
      capacity: 600,
      current: 450,
      item: "Aluminum Sheet",
      utilization: 75,
      status: "active",
    },
    {
      id: 4,
      location: "B-06-01",
      wing: "Wing B",
      rack: 6,
      shelf: 1,
      capacity: 200,
      current: 0,
      item: "Empty",
      utilization: 0,
      status: "empty",
    },
    {
      id: 5,
      location: "C-03-02",
      wing: "Wing C",
      rack: 3,
      shelf: 2,
      capacity: 100,
      current: 45,
      item: "Bearing Set A",
      utilization: 45,
      status: "active",
    },
    {
      id: 6,
      location: "D-08-05",
      wing: "Wing D",
      rack: 8,
      shelf: 5,
      capacity: 300,
      current: 120,
      item: "Paint - Red",
      utilization: 40,
      status: "active",
    },
    {
      id: 7,
      location: "E-02-04",
      wing: "Wing E",
      rack: 2,
      shelf: 4,
      capacity: 500,
      current: 80,
      item: "Packaging Box L",
      utilization: 16,
      status: "low",
    },
    {
      id: 8,
      location: "A-01-01",
      wing: "Wing A",
      rack: 1,
      shelf: 1,
      capacity: 2000,
      current: 2500,
      item: "Fastener Pack",
      utilization: 125,
      status: "overflow",
    },
    {
      id: 9,
      location: "F-04-02",
      wing: "Wing F",
      rack: 4,
      shelf: 2,
      capacity: 400,
      current: 200,
      item: "Wire Spool",
      utilization: 50,
      status: "active",
    },
    {
      id: 10,
      location: "G-06-01",
      wing: "Wing G",
      rack: 6,
      shelf: 1,
      capacity: 50,
      current: 15,
      item: "Motor Unit 3HP",
      utilization: 30,
      status: "active",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200";
      case "high":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200";
      case "low":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200";
      case "empty":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200";
      case "overflow":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200";
    }
  };

  const getUtilizationColor = (util) => {
    if (util > 100) return "bg-red-500";
    if (util > 80) return "bg-blue-500";
    if (util > 50) return "bg-green-500";
    return "bg-gray-400";
  };

  return (
    <div className="space-y-4 p-4">
      <DataTable
        title="Rack & Shelf Management"
        titleIcon={<Grid3x3 size={15} />}
        titleExtra={
          <div className="flex items-center gap-2 ml-4">
            <button className="flex items-center text-xs gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors shadow-sm">
              <Plus size={14} /> Add Location
            </button>
            <button className="flex items-center text-xs gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shadow-sm">
              <Download size={14} /> Export Map
            </button>
          </div>
        }
        filters={[
          {
            key: "wing",
            label: "Wing",
            options: wings.filter(w => w !== "all").map(w => ({ label: w, value: w }))
          }
        ]}
        data={rackData}
        columns={[
          {
            key: "location",
            label: "Location ID",
            render: (val) => <span className="font-mono text-xs font-bold text-blue-600">{val}</span>
          },
          {
            key: "wing",
            label: "Wing",
            render: (val) => <span className="text-xs">{val}</span>
          },
          {
            key: "item",
            label: "Stored Item",
            render: (val) => <span className="text-xs">{val}</span>
          },
          {
            key: "utilization",
            label: "Utilization",
            render: (val) => (
              <div className="flex items-center gap-2 min-w-[100px]">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${getUtilizationColor(val)}`} style={{ width: `${Math.min(val, 100)}%` }} />
                </div>
                <span className="text-[10px] text-slate-500">{val}%</span>
              </div>
            )
          },
          {
             key: "capacity",
             label: "Current / Capacity",
             render: (_, row) => <span className="text-[10px] text-slate-500">{row.current} / {row.capacity}</span>
          },
          {
            key: "status",
            label: "Status",
            render: (val) => (
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(val)}`}>
                {val.toUpperCase()}
              </span>
            )
          },
          {
            key: "actions",
            label: "Actions",
            align: "right",
            render: () => (
              <div className="flex justify-end gap-1">
                <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600"><Edit size={14} /></button>
                <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            )
          }
        ]}
      />

      {/* Warehouse Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 rounded p-4 border border-blue-200 dark:border-slate-600">
          <p className="text-sm  text-slate-500 dark:text-slate-400">
            Total Locations
          </p>
          <p className="text-xl  text-slate-900 dark:text-white text-xs mt-1">
            {rackData.length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-slate-800 dark:to-slate-700 rounded p-4 border border-green-200 dark:border-slate-600">
          <p className="text-sm  text-slate-500 dark:text-slate-400">
            Active Locations
          </p>
          <p className="text-xl  text-slate-900 dark:text-white text-xs mt-1">
            {rackData.filter((r) => r.status === "active").length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-slate-800 dark:to-slate-700 rounded p-4 border border-yellow-200 dark:border-slate-600">
          <p className="text-sm  text-slate-500 dark:text-slate-400">
            Avg. Utilization
          </p>
          <p className="text-xl  text-slate-900 dark:text-white text-xs mt-1">
            {Math.round(
              rackData.reduce((sum, r) => sum + r.utilization, 0) /
                rackData.length
            )}
            %
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-slate-800 dark:to-slate-700 rounded p-4 border border-red-200 dark:border-slate-600">
          <p className="text-sm  text-slate-500 dark:text-slate-400">
            Over Capacity
          </p>
          <p className="text-xl  text-slate-900 dark:text-white text-xs mt-1">
            {rackData.filter((r) => r.utilization > 100).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RackAndShelfPage;
