import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  ClipboardList, 
  CheckCircle2, 
  Clock,
  AlertCircle
} from "lucide-react";

const ProductionPlanningTab = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for released projects
  const releasedProjects = [
    { id: 1, name: "Commercial Building Structure - A1", ref: "RC-2026-001", qty: 50, status: "Ready for Planning", progress: 0 },
    { id: 2, name: "Industrial Storage Tank - T5", ref: "RC-2026-004", qty: 12, status: "Partially Planned", progress: 30 },
    { id: 3, name: "Steel Platform Assembly", ref: "RC-2026-007", qty: 8, status: "Ready for Planning", progress: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-lg  text-slate-900 dark:text-white">Released Production Projects</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Projects ready for operation planning and sequencing</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {releasedProjects.map((project) => (
          <div key={project.id} className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <ClipboardList size={20} />
                </div>
                <span className={`text-xs  px-2.5 py-1 rounded-full  tracking-wider ${
                  project.progress > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                }`}>
                  {project.status}
                </span>
              </div>
              
              <h3 className="text-sm  text-slate-900 dark:text-white mb-1 line-clamp-1">{project.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-mono">{project.ref}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-400    mb-0.5">Quantity</p>
                  <p className="text-sm  text-slate-900 dark:text-white">{project.qty} Units</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-400    mb-0.5">Planning</p>
                  <p className="text-sm  text-slate-900 dark:text-white">{project.progress}% Done</p>
                </div>
              </div>
              
              <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs  transition-colors">
                Define Operation Plan <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}

        <button className="bg-slate-50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded p-6 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group">
          <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 mb-3 transition-colors">
            <Plus size={15} />
          </div>
          <span className="text-sm ">Import More Projects</span>
          <span className="text-xs   mt-1">From Sales/Release</span>
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded p-4 flex gap-3">
        <AlertCircle className="text-blue-600 dark:text-blue-400 shrink-0" size={20} />
        <div>
          <h4 className="text-sm  text-blue-900 dark:text-blue-300">Planning Guidelines</h4>
          <p className="text-xs text-blue-700/70 dark:text-blue-400/70 mt-0.5 leading-relaxed">
            Ensure the manufacturing sequence is defined for each project before moving to daily operator assignments. 
            All operations must be approved by the design department before they can be added to the production plan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductionPlanningTab;
