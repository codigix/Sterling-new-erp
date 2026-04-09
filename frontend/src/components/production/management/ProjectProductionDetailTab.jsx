import React, { useState } from "react";
import { 
  Search, 
  Filter, 
  ArrowRight, 
  LayoutDashboard, 
  CheckCircle2, 
  Clock,
  Briefcase,
  History,
  Activity,
  Zap,
  PackageCheck
} from "lucide-react";

const ProjectProductionDetailTab = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for project tracking
  const projectTracking = [
    { 
      id: 1, 
      name: "Commercial Building Structure - A1", 
      ref: "RC-2026-001", 
      qty: 50, 
      completed: 12, 
      totalOps: 8, 
      completedOps: 2, 
      activeOp: "Welding", 
      status: "In Progress",
      progress: 25
    },
    { 
      id: 2, 
      name: "Industrial Storage Tank - T5", 
      ref: "RC-2026-004", 
      qty: 12, 
      completed: 8, 
      totalOps: 6, 
      completedOps: 4, 
      activeOp: "Painting", 
      status: "Final Stages",
      progress: 66
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-lg  text-slate-900 dark:text-white  ">Project Production Detail View</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs    mt-0.5">Real-time Project Execution & Status Tracking</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by project name or reference..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm  outline-none focus:ring-2 focus:ring-blue-500 "
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projectTracking.map((project) => (
          <div key={project.id} className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/50">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-600/20">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs  text-slate-900 dark:text-white   line-clamp-1">{project.name}</h3>
                    <p className="text-xs text-slate-400   ">{project.ref}</p>
                  </div>
                </div>
                <span className="text-xs  px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full   border border-indigo-200 dark:border-indigo-800">
                  {project.status}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs  text-slate-400   mb-1">Target Qty</span>
                  <span className="text-lg  text-slate-900 dark:text-white">{project.qty}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs  text-slate-400   mb-1">Produced</span>
                  <span className="text-lg  text-emerald-600 dark:text-emerald-400">{project.completed}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs  text-slate-400   mb-1">Operations</span>
                  <span className="text-lg  text-slate-900 dark:text-white">{project.completedOps}/{project.totalOps}</span>
                </div>
              </div>
            </div>
            
            <div className="p-5">
              <div className="flex items-center justify-between text-xs    mb-2">
                <span className="text-slate-400 flex items-center gap-2">
                  <Activity size={12} className="text-blue-500" /> Current: {project.activeOp}
                </span>
                <span className="text-blue-600 dark:text-blue-400">{project.progress}% Complete</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 mb-6">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-xs    hover:bg-slate-800 transition-all">
                  <History size={14} /> Full History
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg text-xs    hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                  View Timeline <Zap size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-slate-50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded p-8 flex flex-col items-center justify-center text-center group">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-all shadow-sm group-hover:shadow-md mb-4 rotate-12 group-hover:rotate-0">
            <PackageCheck size={32} />
          </div>
          <h4 className="text-xs  text-slate-400  ">Select project for full drill-down</h4>
          <p className="text-xs text-slate-500 max-w-[200px] mt-2   tracking-tight">Access detailed operator logs, QC results, and timeline analytics</p>
        </div>
      </div>
    </div>
  );
};

export default ProjectProductionDetailTab;
