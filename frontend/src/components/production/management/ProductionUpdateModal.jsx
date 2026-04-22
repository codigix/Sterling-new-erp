import React, { useState, useEffect } from "react";
import { 
  X, 
  Save, 
  User, 
  LayoutDashboard, 
  Settings2,
  Clock,
  Calendar,
  PackageCheck,
  AlertTriangle,
  Target
} from "lucide-react";

const ProductionUpdateModal = ({ isOpen, onClose, date }) => {
  const [formData, setFormData] = useState({
    projectId: "",
    operationId: "",
    employeeId: "",
    actualStartTime: "08:15",
    actualEndTime: "17:30",
    breakTime: "60",
    qtyCompleted: "",
    pendingQty: "",
    reworkQty: "0",
    scrapQty: "0",
    status: "Completed",
    remarks: ""
  });

  const [actualHours, setActualHours] = useState(0);

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

  const statusOptions = [
    "Pending", "In Progress", "Partially Completed", "Completed", "Delayed", "On Hold"
  ];

  useEffect(() => {
    if (formData.actualStartTime && formData.actualEndTime) {
      const start = new Date(`2000-01-01T${formData.actualStartTime}`);
      const end = new Date(`2000-01-01T${formData.actualEndTime}`);
      
      if (end > start) {
        let diffMs = end - start;
        let diffHrs = diffMs / (1000 * 60 * 60);
        let breakHrs = parseInt(formData.breakTime || 0) / 60;
        setActualHours(Math.max(0, diffHrs - breakHrs));
      } else {
        setActualHours(0);
      }
    }
  }, [formData.actualStartTime, formData.actualEndTime, formData.breakTime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded  shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
              <PackageCheck size={20} />
            </div>
            <div>
              <h2 className="text-xl  text-slate-900 dark:text-white  tracking-tight">
                Daily Production Update
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1    flex items-center gap-1">
                <Calendar size={12} /> Actual Work for {new Date(date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Project & Operation */}
            <div className="space-y-2">
              <label className="text-xs  text-slate-500  ">Project</label>
              <select 
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none  "
                value={formData.projectId}
                onChange={(e) => setFormData({...formData, projectId: e.target.value})}
              >
                <option value="">-- Project --</option>
                {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs  text-slate-500  ">Operation</label>
              <select 
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none  "
                value={formData.operationId}
                onChange={(e) => setFormData({...formData, operationId: e.target.value})}
              >
                <option value="">-- Operation --</option>
                {operations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs  text-slate-500  ">Operator</label>
              <select 
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none  "
                value={formData.employeeId}
                onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
              >
                <option value="">-- Employee --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            {/* Timing */}
            <div className="space-y-2">
              <label className="text-xs  text-slate-500  ">Actual Start</label>
              <input 
                type="time"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none "
                value={formData.actualStartTime}
                onChange={(e) => setFormData({...formData, actualStartTime: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs  text-slate-500  ">Actual End</label>
              <input 
                type="time"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none "
                value={formData.actualEndTime}
                onChange={(e) => setFormData({...formData, actualEndTime: e.target.value})}
              />
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-100 dark:border-green-800/50 flex flex-col justify-center items-center">
              <p className="text-xs  text-green-600 dark:text-green-400  ">Actual Hours</p>
              <h4 className="text-xl  text-green-700 dark:text-green-300">{actualHours.toFixed(2)} Hrs</h4>
            </div>

            {/* Quantities */}
            <div className="space-y-2">
              <label className="text-xs  text-slate-500  ">Qty Completed</label>
              <input 
                type="number"
                placeholder="0"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none  text-green-600"
                value={formData.qtyCompleted}
                onChange={(e) => setFormData({...formData, qtyCompleted: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs  text-slate-500  ">Pending Qty</label>
              <input 
                type="number"
                placeholder="0"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none "
                value={formData.pendingQty}
                onChange={(e) => setFormData({...formData, pendingQty: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs  text-slate-500  ">Work Status</label>
              <select 
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none  "
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs  text-slate-500   flex items-center gap-1">
                <AlertTriangle size={12} className="text-amber-500" /> Rework Qty
              </label>
              <input 
                type="number"
                placeholder="0"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none  text-amber-600"
                value={formData.reworkQty}
                onChange={(e) => setFormData({...formData, reworkQty: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs  text-slate-500   flex items-center gap-1">
                <AlertTriangle size={12} className="text-red-500" /> Scrap Qty
              </label>
              <input 
                type="number"
                placeholder="0"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none  text-red-600"
                value={formData.scrapQty}
                onChange={(e) => setFormData({...formData, scrapQty: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs  text-slate-500  ">Break Time (Min)</label>
              <input 
                type="number"
                placeholder="60"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none "
                value={formData.breakTime}
                onChange={(e) => setFormData({...formData, breakTime: e.target.value})}
              />
            </div>

            {/* Remarks */}
            <div className="md:col-span-3 space-y-2">
              <label className="text-xs  text-slate-500  ">Remarks / Production Notes</label>
              <textarea 
                rows="2"
                placeholder="Enter any issues, delays, or production notes..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.remarks}
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded text-sm  hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors  "
          >
            Cancel
          </button>
          <button 
            className="px-8 py-2.5 bg-green-600 text-white rounded text-sm  hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 flex items-center gap-2  "
          >
            <Save size={15} /> Save Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionUpdateModal;
