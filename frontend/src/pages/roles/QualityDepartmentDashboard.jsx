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
} from "lucide-react";

const DashboardHome = () => {
  const fetchTasks = useCallback(async () => {
    try {
      await axios.get("/qc/tasks");
    } catch (err) {
      console.error("Error fetching quality tasks:", err);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const stats = [
    {
      title: "Pending Inspections",
      value: "12",
      change: "-3",
      positive: true,
      icon: Clock,
    },
    {
      title: "Pass Rate",
      value: "96.5%",
      change: "+1.2%",
      positive: true,
      icon: CheckCircle,
    },
    {
      title: "Active NCRs",
      value: "3",
      change: "+1",
      positive: false,
      icon: AlertCircle,
    },
  ];

  return (
    <div className="space-y-2 p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-white dark:bg-slate-800 rounded p-6 border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <div className="flex items-center text-xs justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {stat.title}
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white text-xs mt-2">
                  {stat.value}
                </p>
                <p
                  className={`text-sm mt-2 ${
                    stat.positive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stat.positive ? "↑" : "↓"} {stat.change}
                </p>
              </div>
              <stat.icon size={32} className="text-blue-500" />
            </div>
          </div>
        ))}
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
