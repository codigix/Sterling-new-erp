import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  LayoutDashboard,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Send,
  History,
  Target,
  PackageCheck
} from "lucide-react";
import ProductionUpdateModal from "./ProductionUpdateModal";
import DataTable from "../../ui/DataTable/DataTable";

const DailyProductionUpdateTab = () => {
  const [selectedDate, setSelectedDate] = useState(new Date(Date.now() - 86400000).toISOString().split('T')[0]);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  
  // Mock data for production updates
  const productionUpdates = [
    {
      id: 1,
      date: "2026-03-30",
      projectName: "Commercial Building Structure - A1",
      operationName: "Cutting",
      employeeName: "John Doe",
      actualStartTime: "08:15",
      actualEndTime: "12:30",
      breakTime: 30,
      actualHours: 3.75,
      qtyCompleted: 12,
      pendingQty: 38,
      reworkQty: 1,
      scrapQty: 0,
      status: "Partially Completed",
      remarks: "Material hardness was higher than expected",
    },
    {
      id: 2,
      date: "2026-03-30",
      projectName: "Industrial Storage Tank - T5",
      operationName: "Welding",
      employeeName: "Mike Smith",
      actualStartTime: "09:00",
      actualEndTime: "13:00",
      breakTime: 0,
      actualHours: 4.0,
      qtyCompleted: 1,
      pendingQty: 1,
      reworkQty: 0,
      scrapQty: 0,
      status: "In Progress",
      remarks: "Main seam welding completed",
    },
    {
      id: 3,
      date: "2026-03-30",
      projectName: "Steel Platform Assembly",
      operationName: "Fabrication",
      employeeName: "David Lee",
      actualStartTime: "08:00",
      actualEndTime: "17:00",
      breakTime: 60,
      actualHours: 8.0,
      qtyCompleted: 5,
      pendingQty: 5,
      reworkQty: 0,
      scrapQty: 0,
      status: "Completed",
      remarks: "All fabrication done. Ready for QC.",
      canSendToQC: true,
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "Partially Completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "In Progress":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "Delayed":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  const columns = [
    {
      key: "employeeName",
      label: "Operator",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-xs">
            {val.split(' ').map(n => n[0]).join('')}
          </div>
          <span className="text-sm  text-slate-900 dark:text-white tracking-tight">{val}</span>
        </div>
      )
    },
    {
      key: "projectName",
      label: "Project / Operation",
      render: (val, row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm  text-slate-900 dark:text-white line-clamp-1">{val}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 tracking-wider">{row.operationName}</span>
        </div>
      )
    },
    {
      key: "actualStartTime",
      label: "Actual Time",
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <Clock size={12} className="text-blue-500" />
            {row.actualStartTime} - {row.actualEndTime}
          </div>
          <span className="text-xs text-slate-400 ml-5">Total: {row.actualHours.toFixed(2)}h</span>
        </div>
      )
    },
    {
      key: "output",
      label: "Output",
      align: "center",
      render: (_, row) => (
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-2">
            <div className="flex flex-col items-center px-2 py-0.5 bg-green-50 dark:bg-green-900/20 rounded border border-green-100 dark:border-green-800">
              <span className="text-[8px] text-green-600">Comp</span>
              <span className="text-xs text-green-700 dark:text-green-400">{row.qtyCompleted}</span>
            </div>
            <div className="flex flex-col items-center px-2 py-0.5 bg-slate-50 dark:bg-slate-700 rounded border border-slate-100 dark:border-slate-600">
              <span className="text-[8px] text-slate-500">Pend</span>
              <span className="text-xs text-slate-700 dark:text-slate-300">{row.pendingQty}</span>
            </div>
          </div>
          {(row.reworkQty > 0 || row.scrapQty > 0) && (
            <div className="flex gap-2">
              {row.reworkQty > 0 && (
                <span className="text-xs text-amber-600 flex items-center gap-0.5">
                  <AlertTriangle size={10} /> {row.reworkQty} REWORK
                </span>
              )}
              {row.scrapQty > 0 && (
                <span className="text-xs text-red-600 flex items-center gap-0.5">
                  <AlertTriangle size={10} /> {row.scrapQty} SCRAP
                </span>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (val) => (
        <span className={`px-2 py-0.5 text-xs rounded tracking-wider ${getStatusBadge(val)}`}>
          {val}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {row.canSendToQC && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs hover:bg-blue-200 transition-colors">
              <Send size={12} /> Send to QC
            </button>
          )}
          <button className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Edit2 size={15} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Date and Form Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded border border-slate-200 dark:border-slate-700 ">
        <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
          <div className="w-full md:w-auto space-y-2">
            <label className="text-xs  text-slate-500  tracking-wider">Select Work Date (Previous Day)</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input 
                type="date" 
                className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-48 text-slate-900 dark:text-white"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsUpdateModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded text-sm  hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors shadow-lg w-full md:w-auto  "
            >
              <History size={15} />
              New Work Entry
            </button>
            <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded text-sm  hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 w-full md:w-auto  ">
              <Plus size={15} />
              Import Planned Assignments
            </button>
          </div>
        </div>
      </div>

      {/* Production Update Table */}
      <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700  overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col md:flex-row gap-4 items-center justify-between">
          <h3 className="text-lg  text-slate-900 dark:text-white flex items-center gap-2">
            <PackageCheck size={20} className="text-green-600" />
            Actual Production Updates for {new Date(selectedDate).toLocaleDateString()}
          </h3>
        </div>

        <div className="p-6">
          <DataTable
            columns={columns}
            data={productionUpdates}
            showSearch={true}
            searchPlaceholder="Search by project or operator..."
          />
        </div>
      </div>

      {/* Update Modal */}
      <ProductionUpdateModal 
        isOpen={isUpdateModalOpen} 
        onClose={() => setIsUpdateModalOpen(false)} 
        date={selectedDate}
      />
    </div>
  );
};

export default DailyProductionUpdateTab;

