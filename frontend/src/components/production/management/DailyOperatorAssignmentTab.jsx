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

const DailyOperatorAssignmentTab = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data for operator assignments
  const currentAssignments = [
    { id: 1, project: "Commercial Building Structure - A1", operation: "Cutting", operator: "John Doe", start: "09:00", end: "13:00", status: "Active", load: 4 },
    { id: 2, project: "Industrial Storage Tank - T5", operation: "Welding", operator: "Suresh Kumar", start: "09:00", end: "17:30", status: "Active", load: 8.5 },
    { id: 3, project: "Commercial Building Structure - A1", operation: "Drilling", operator: "Amit Sharma", start: "13:30", end: "17:30", status: "Active", load: 4 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
            <CalendarClock size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Daily Operator Assignment</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Morning Planning & Resource Allocation</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <input 
              type="date" 
              className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Plus size={16} /> New Assignment
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Active Assignments for {selectedDate}</h3>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> 12.5 Total Planned Man-Hours
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> 3/10 Operators Active
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project & Operation</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee / Operator</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Slot</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Load (H)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {currentAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{assignment.project}</p>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{assignment.operation}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                        <User size={14} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{assignment.operator}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-900 dark:text-white">{assignment.start} - {assignment.end}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Standard Shift</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-black text-slate-900 dark:text-white">{assignment.load}h</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailyOperatorAssignmentTab;
