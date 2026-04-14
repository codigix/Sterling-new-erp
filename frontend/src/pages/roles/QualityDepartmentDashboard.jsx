import React, { useState, useEffect, useCallback } from "react";
import { Link, Routes, Route } from "react-router-dom";
import axios from "../../utils/api";
import RoleDashboardLayout from "../../components/layout/RoleDashboardLayout";
import QCInspectionsPage from "../inventory/QCInspectionsPage";
import MaterialInspectionPage from "../qc/MaterialInspectionPage";
import QualityInspectionDetail from "../qc/QualityInspectionDetail";
import QCTasksPage from "../qc/QCTasksPage";
import UniversalRootCardsPage from "../shared/UniversalRootCardsPage";
import UniversalRootCardDetailPage from "../shared/UniversalRootCardDetailPage";
import {
  CheckCircle,
  AlertCircle,
  FileText,
  TrendingUp,
  Clock,
  BarChart3,
  Loader2,
  Package,
  ClipboardCheck,
  Layers,
  Activity,
  History,
  FileCheck,
  Zap,
} from "lucide-react";

const DashboardHome = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingGRNs: 0,
    pendingInProcess: 0,
    totalReports: 0,
    recentReports: []
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [inspectionsRes, tasksRes, reportsRes] = await Promise.all([
        axios.get("/qc/grn-inspections"),
        axios.get("/qc/tasks"),
        axios.get("/qc/reports")
      ]);

      const pendingGRNs = inspectionsRes.data?.stats?.pendingGRN || 0;
      const pendingInProcess = tasksRes.data?.tasks?.length || 0;
      const totalReports = reportsRes.data?.length || 0;
      const recentReports = reportsRes.data?.slice(0, 5) || [];

      setStats({
        pendingGRNs,
        pendingInProcess,
        totalReports,
        recentReports
      });
    } catch (err) {
      console.error("Error fetching quality dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const statCards = [
    {
      title: "Pending GRN QC",
      value: stats.pendingGRNs,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      path: "/department/quality/incoming"
    },
    {
      title: "In-Process QC",
      value: stats.pendingInProcess,
      icon: Activity,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      path: "/department/quality/root-cards"
    },
    {
      title: "Finalized Reports",
      value: stats.totalReports,
      icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      path: "/department/quality/reports"
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className=" p-4 mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2  dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800 ">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white">Quality Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Monitor inspections, reports, and compliance status.</p>
        </div>
        <div className="flex gap-3">
          <Link 
            to="/department/quality/incoming"
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded  text-xs transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <ClipboardCheck size={15} />
            Start Inspection
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 my-5 md:grid-cols-3 gap-2">
        {statCards.map((stat) => (
          <Link
            key={stat.title}
            to={stat.path}
            className="group bg-white dark:bg-slate-800 rounded p-2 border border-slate-200 dark:border-slate-700  hover: hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded ${stat.bg} ${stat.color} transition-colors`}>
                <stat.icon size={15} />
              </div>
              <TrendingUp size={15} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
            </div>
            <div className="mt-3">
              <p className="text-xs  text-slate-500 dark:text-slate-400  ">
                {stat.title}
              </p>
              <h3 className="text-xl  text-slate-900 dark:text-white ">
                {stat.value}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700  overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className=" text-slate-900 dark:text-white flex items-center gap-2">
              <History size={15} className="text-blue-500" />
              Recent Finalized Reports
            </h3>
            <Link to="/department/quality/reports" className="text-xs  text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {stats.recentReports.length > 0 ? (
              stats.recentReports.map((report) => (
                <div key={report.id} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                      <FileCheck size={15} />
                    </div>
                    <div>
                      <p className="text-sm  text-slate-900 dark:text-white">{report.grn_number}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{report.project_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs  text-slate-400  ">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                    <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs  mt-1 ">
                      {report.inspection_type}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-5  text-center">
                <p className="text-sm text-slate-400 italic">No recent reports found</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links / Tasks */}
        <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700  overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className=" text-slate-900 dark:text-white flex items-center gap-2">
              <Zap size={15} className="text-amber-500" />
              Quick Actions
            </h3>
          </div>
          <div className="p-2 grid grid-cols-1 gap-2 flex-1">
            <Link 
              to="/department/quality/incoming"
              className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-blue-200 hover:bg-blue-50/50 transition-all flex items-center gap-4 group"
            >
              <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ClipboardCheck size={15} />
              </div>
              <div className="text-left">
                <p className="text-sm  text-slate-700 dark:text-slate-300">Incoming QC</p>
                <p className="text-xs text-slate-500">Inspect new GRN materials</p>
              </div>
            </Link>
            <Link 
              to="/department/quality/material-inspection"
              className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all flex items-center gap-4 group"
            >
              <div className="p-2 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package size={15} />
              </div>
              <div className="text-left">
                <p className="text-sm  text-slate-700 dark:text-slate-300">In-Process QC</p>
                <p className="text-xs text-slate-500">Check production materials</p>
              </div>
            </Link>
            <Link 
              to="/department/quality/reports"
              className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-purple-200 hover:bg-purple-50/50 transition-all flex items-center gap-4 group"
            >
              <div className="p-2 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 size={15} />
              </div>
              <div className="text-left">
                <p className="text-sm  text-slate-700 dark:text-slate-300">Inspection History</p>
                <p className="text-xs text-slate-500">View past QC reports</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Visual Analytics Placeholder */}
      <div className="bg-white my-5 dark:bg-slate-800 rounded p-2 border border-slate-200 dark:border-slate-700 ">
        <div className=" items-center justify-between ">
          <div className="mb-5">
            <h3 className=" text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 size={15} className="text-indigo-500" />
              Inspection Performance
            </h3>
            <p className="text-xs text-slate-500 mt-1">Weekly volume of inspections completed.</p>
          </div>
          <div className="flex justify-evenly gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="flex flex-col items-center gap-2">
                <div className="w-8 bg-indigo-50 dark:bg-slate-900 rounded-lg h-52 flex items-end overflow-hidden relative group">
                  <div 
                    className="w-full bg-indigo-500 group-hover:bg-indigo-600 transition-all duration-500 rounded-t-lg"
                    style={{ height: `${Math.floor(Math.random() * 80) + 20}%` }}
                  ></div>
                  {/* Tooltip-like value */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs py-0.5 px-1.5 rounded pointer-events-none">
                    {Math.floor(Math.random() * 20) + 5}
                  </div>
                </div>
                <span className="text-xs  text-slate-400  ">{day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const QualityDepartmentDashboard = () => {
  const navigationItems = [
    {
      title: "Dashboard",
      path: "/department/quality",
      icon: CheckCircle,
    },
    {
      title: "Root Cards",
      path: "/department/quality/root-cards",
      icon: Layers,
    },
    {
      title: "Incoming Inspections",
      path: "/department/quality/incoming",
      icon: ClipboardCheck,
    },
    {
      title: "Material Inspection",
      path: "/department/quality/material-inspection",
      icon: Package,
    },
    {
      title: "Quality Reports",
      path: "/department/quality/reports",
      icon: FileText,
    },
  ];

  return (
    <RoleDashboardLayout
      roleNavigation={navigationItems}
      roleName="Quality Department"
      roleIcon={CheckCircle}
    >
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="incoming" element={<QCInspectionsPage />} />
        <Route path="inspection/:id" element={<QualityInspectionDetail />} />
        <Route path="material-inspection" element={<MaterialInspectionPage />} />
        <Route path="reports" element={<QCTasksPage />} />
        <Route path="root-cards" element={<UniversalRootCardsPage />} />
        <Route path="root-cards/:id" element={<UniversalRootCardDetailPage />} />
      </Routes>
    </RoleDashboardLayout>
  );
};

export default QualityDepartmentDashboard;
