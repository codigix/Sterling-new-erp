import React, { useState, useEffect } from "react";
import { 
  X, 
  Save, 
  User, 
  LayoutDashboard, 
  Settings2,
  Clock,
  Calendar,
  AlertCircle
} from "lucide-react";

const OperatorAssignmentModal = ({ isOpen, onClose, date }) => {
  const [formData, setFormData] = useState({
    projectId: "",
    operationId: "",
    employeeId: "",
    startTime: "08:00",
    endTime: "17:00",
    breakTime: "60",
    remarks: ""
  });

  const [totalHours, setTotalHours] = useState(0);

  // Mock data for dropdowns
  const activeProjects = [
    { id: 1, name: "Commercial Building Structure - A1" },
    { id: 2, name: "Industrial Storage Tank - T5" },
    { id: 3, name: "Steel Platform Assembly" }
  ];

  const operations = [
    { id: 1, name: "Cutting" },
    { id: 2, name: "Drilling" },
    { id: 3, name: "Welding" },
    { id: 4, name: "Assembly" }
  ];

  const employees = [
    { id: 1, name: "John Doe" },
    { id: 2, name: "Mike Smith" },
    { id: 3, name: "David Lee" },
    { id: 4, name: "Sarah Wilson" }
  ];

  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(`2000-01-01T${formData.startTime}`);
      const end = new Date(`2000-01-01T${formData.endTime}`);
      
      if (end > start) {
        let diffMs = end - start;
        let diffHrs = diffMs / (1000 * 60 * 60);
        let breakHrs = parseInt(formData.breakTime || 0) / 60;
        setTotalHours(Math.max(0, diffHrs - breakHrs));
      } else {
        setTotalHours(0);
      }
    }
  }, [formData.startTime, formData.endTime, formData.breakTime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                New Operator Assignment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase font-bold tracking-widest flex items-center gap-1">
                <Calendar size={12} /> Planning for {new Date(date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <LayoutDashboard size={14} className="text-blue-500" /> Select Project
              </label>
              <select 
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium uppercase"
                value={formData.projectId}
                onChange={(e) => setFormData({...formData, projectId: e.target.value})}
              >
                <option value="">-- Choose Project --</option>
                {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Operation Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Settings2 size={14} className="text-blue-500" /> Select Operation
              </label>
              <select 
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium uppercase"
                value={formData.operationId}
                onChange={(e) => setFormData({...formData, operationId: e.target.value})}
              >
                <option value="">-- Choose Operation --</option>
                {operations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Employee Selection */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <User size={14} className="text-blue-500" /> Assign Operator / Employee
              </label>
              <select 
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium uppercase"
                value={formData.employeeId}
                onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
              >
                <option value="">-- Choose Employee --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            {/* Time Slots */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={14} className="text-blue-500" /> Start Time
              </label>
              <input 
                type="time"
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={14} className="text-blue-500" /> End Time
              </label>
              <input 
                type="time"
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={14} className="text-blue-500" /> Break Time (Minutes)
              </label>
              <input 
                type="number"
                placeholder="60"
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                value={formData.breakTime}
                onChange={(e) => setFormData({...formData, breakTime: e.target.value})}
              />
            </div>

            {/* Total Hours Display */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 flex flex-col justify-center items-center">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Calculated Man-Hours</p>
              <h4 className="text-2xl font-black text-blue-700 dark:text-blue-300">{totalHours.toFixed(2)} Hrs</h4>
            </div>

            {/* Remarks */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                Remarks / Special Instructions
              </label>
              <textarea 
                rows="3"
                placeholder="Enter any specific instructions for the operator..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.remarks}
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              />
            </div>
          </div>

          {/* Overlap Warning (UI Placeholder) */}
          <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50 text-amber-700 dark:text-amber-400">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p className="text-xs font-medium">
              System will automatically check for overlapping assignments for the selected operator on {new Date(date).toLocaleDateString()} before saving.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
          <button 
            className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2 uppercase tracking-widest"
          >
            <Save size={18} /> Confirm Assignment
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperatorAssignmentModal;
