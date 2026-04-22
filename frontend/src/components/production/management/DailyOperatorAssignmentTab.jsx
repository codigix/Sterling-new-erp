import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  CalendarClock, 
  CheckCircle2, 
  Clock,
  User,
  Calendar,
  X
} from "lucide-react";
import DataTable from "../../ui/DataTable/DataTable";

const DailyOperatorAssignmentTab = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data for operator assignments
  const currentAssignments = [
    { id: 1, project: "Commercial Building Structure - A1", operation: "Cutting", operator: "John Doe", start: "09:00", end: "13:00", status: "Active", load: 4 },
    { id: 2, project: "Industrial Storage Tank - T5", operation: "Welding", operator: "Suresh Kumar", start: "09:00", end: "17:30", status: "Active", load: 8.5 },
    { id: 3, project: "Commercial Building Structure - A1", operation: "Drilling", operator: "Amit Sharma", start: "13:30", end: "17:30", status: "Active", load: 4 },
  ];

  const columns = [
    {
      key: "project",
      label: "Project & Operation",
      render: (val, row) => (
        <>
          <p className="text-xs text-slate-900 dark:text-white tracking-tight">{val}</p>
          <span className="text-xs text-blue-600">{row.operation}</span>
        </>
      )
    },
    {
      key: "operator",
      label: "Employee / Operator",
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
            <User size={14} />
          </div>
          <span className="text-xs text-slate-700 dark:text-slate-300">{val}</span>
        </div>
      )
    },
    {
      key: "start",
      label: "Time Slot",
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="text-xs text-slate-900 dark:text-white">{row.start} - {row.end}</span>
          <span className="text-xs text-slate-400">Standard Shift</span>
        </div>
      )
    },
    {
      key: "load",
      label: "Load (H)",
      align: "center",
      render: (val) => (
        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-900 dark:text-white">{val}h</span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: () => (
        <button className="p-2 text-slate-300 hover:text-red-500 transition-colors">
          <X size={15} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 ">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded shadow-lg shadow-blue-600/20">
            <CalendarClock size={15} />
          </div>
          <div>
            <h2 className="text-lg  text-slate-900 dark:text-white  ">Daily Operator Assignment</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs    mt-0.5">Morning Planning & Resource Allocation</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
            <input 
              type="date" 
              className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm  outline-none focus:ring-2 focus:ring-blue-500 "
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs  transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Plus size={15} /> New Assignment
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700  overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="text-xs  text-slate-500 dark:text-slate-400  ">Active Assignments for {selectedDate}</h3>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2 text-xs  text-slate-500">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> 12.5 Total Planned Man-Hours
            </div>
            <div className="flex items-center gap-2 text-xs  text-slate-500">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> 3/10 Operators Active
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <DataTable
            columns={columns}
            data={currentAssignments}
            showSearch={true}
            searchPlaceholder="Search assignments..."
          />
        </div>
      </div>
    </div>
  );
};

export default DailyOperatorAssignmentTab;
