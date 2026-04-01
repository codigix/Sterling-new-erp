import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  BarChart3, 
  CheckCircle2, 
  Clock,
  History,
  Activity,
  Zap,
  PackageCheck,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  FileText
} from "lucide-react";

const ProductionReportsTab = () => {
  const [activeReport, setActiveReport] = useState("daily");

  const reportTypes = [
    { id: "daily", label: "Daily Summary", icon: LayoutGrid },
    { id: "employee", label: "Employee Man-Hours", icon: FileText },
    { id: "project", label: "Project Progress", icon: TrendingUp },
    { id: "delay", label: "Delayed Work", icon: TrendingDown },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
            <BarChart3 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Production Reports & Summary</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Manufacturing Intelligence & Productivity Analytics</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="px-6 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20">
            <Zap size={16} /> Export Detailed Analytics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-3">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                  activeReport === report.id
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">{report.label}</span>
                </div>
                {activeReport === report.id && <ArrowRight size={14} />}
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-700 mb-6 border border-slate-100 dark:border-slate-700">
            <TrendingUp size={48} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Generating Report Analytics</h3>
          <p className="text-sm font-bold text-slate-500 max-w-sm uppercase tracking-tighter leading-relaxed">
            Please wait while we synthesize data for the selected report category. 
            Real-time shop floor data is being aggregated for current manufacturing cycle.
          </p>
          <div className="mt-8 flex gap-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-150"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Efficiency Index</p>
          <h4 className="text-2xl font-black text-emerald-900 dark:text-emerald-300 leading-none">94.2%</h4>
          <p className="text-[9px] font-bold text-emerald-700/70 dark:text-emerald-500/70 uppercase tracking-tighter mt-2">+2.4% from last period</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Total Output (Monthly)</p>
          <h4 className="text-2xl font-black text-blue-900 dark:text-blue-300 leading-none">1,284</h4>
          <p className="text-[9px] font-bold text-blue-700/70 dark:text-blue-500/70 uppercase tracking-tighter mt-2">Verified Units Produced</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Active Projects</p>
          <h4 className="text-2xl font-black text-amber-900 dark:text-amber-300 leading-none">18</h4>
          <p className="text-[9px] font-bold text-amber-700/70 dark:text-amber-500/70 uppercase tracking-tighter mt-2">In shop floor pipeline</p>
        </div>
      </div>
    </div>
  );
};

export default ProductionReportsTab;
