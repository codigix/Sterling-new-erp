import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import DashboardAlerts from "../../components/dashboard/DashboardAlerts";
import SearchableSelect from "../../components/ui/SearchableSelect";
import {
  Wrench,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Target,
  Loader2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const DesignEngineerDashboard = () => {
  const { user } = useAuth();
  const [departmentTasks, setDepartmentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [drawings, setDrawings] = useState([]);
  const [rootCardsList, setRootCardsList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [selectedQapProjectId, setSelectedQapProjectId] = useState("all");

  const fetchDashboardData = useCallback(async () => {
    if (!user?.departmentId) return;
    try {
      setLoading(true);
      setError(null);
      
      const [tasksResponse, rootCardsResponse, drawingsResponse] = await Promise.all([
        axios.get(`/departmental-tasks/department/${user.departmentId}`),
        axios.get("/root-cards", { params: { includeSteps: true } }),
        axios.get("/design-drawings")
      ]);

      const tasks = tasksResponse.data || [];
      const rootCards = rootCardsResponse.data.rootCards || [];
      const drawingsList = drawingsResponse.data.drawings || [];
      
      setDepartmentTasks(tasks);
      setRootCardsList(rootCards);
      setDrawings(drawingsList);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [user?.departmentId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const uniqueProjects = useMemo(() => {
    return Array.from(
      new Map(
        rootCardsList.map(rc => [rc.id, { id: rc.id, projectName: rc.project_name }])
      ).values()
    );
  }, [rootCardsList]);

  const projectOptions = useMemo(() => {
    return [
      { value: "all", label: "All Projects" },
      ...uniqueProjects.map((p) => ({
        value: p.id,
        label: `${p.projectName} (${p.id})`
      }))
    ];
  }, [uniqueProjects]);

  const { approvedCount, pendingCount, rejectedCount, totalCount } = useMemo(() => {
    const filtered = selectedProjectId === "all"
      ? drawings
      : drawings.filter(d => d.root_card_id === selectedProjectId);
      
    return {
      approvedCount: filtered.filter(d => d.status === 'Approved').length,
      pendingCount: filtered.filter(d => d.status === 'Pending Review' || d.status === 'Pending').length,
      rejectedCount: filtered.filter(d => d.status === 'Rejected').length,
      totalCount: filtered.length
    };
  }, [drawings, selectedProjectId]);

  const drawingChartData = useMemo(() => {
    return {
      labels: ["Approved", "Pending Review", "Rejected"],
      datasets: [
        {
          data: [approvedCount, pendingCount, rejectedCount],
          backgroundColor: [
            "rgba(16, 185, 129, 0.85)", // emerald-500
            "rgba(245, 158, 11, 0.85)",  // amber-500
            "rgba(239, 68, 68, 0.85)",   // red-500
          ],
          borderColor: [
            "rgb(16, 185, 129)",
            "rgb(245, 158, 11)",
            "rgb(239, 68, 68)",
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [approvedCount, pendingCount, rejectedCount]);

  const drawingChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          boxWidth: 10,
          padding: 8,
          font: { size: 10 },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = approvedCount + pendingCount + rejectedCount;
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return ` ${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    cutout: "70%",
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          font: { size: 12, weight: "500" },
          boxWidth: 14,
          padding: 12,
          usePointStyle: true,
        },
      },
      tooltip: {
        titleFont: { size: 12, weight: "bold" },
        bodyFont: { size: 11 },
        padding: 10,
        borderWidth: 1,
        borderColor: "rgba(0, 0, 0, 0.1)",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: { font: { size: 10 } },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } },
      },
    },
  };


  const { totalTasks, pendingTasks, overdueTasks, completedTasks } = useMemo(() => {
    return {
      totalTasks: departmentTasks.length,
      pendingTasks: departmentTasks.filter(t => t.status === "Pending" || !t.status).length,
      overdueTasks: departmentTasks.filter(t => {
        const isNotCompleted = t.status !== "Completed";
        const isPastDue = t.due_date && new Date(t.due_date) < new Date();
        return isNotCompleted && isPastDue;
      }).length,
      completedTasks: departmentTasks.filter(t => t.status === "Completed").length,
    };
  }, [departmentTasks]);



  const { totalQap, pendingQap, completedQap } = useMemo(() => {
    const excludedStatuses = ['pending', 'RC_CREATED', 'DESIGN_IN_PROGRESS', 'QUALITY_QAP_PENDING'];
    const relevant = rootCardsList.filter(rc => !excludedStatuses.includes(rc.status));
    
    const filtered = selectedQapProjectId === "all"
      ? relevant
      : relevant.filter(rc => rc.id === selectedQapProjectId);
      
    return {
      totalQap: filtered.length,
      pendingQap: filtered.filter(rc => rc.status === 'DESIGN_QAP_REVIEW').length,
      completedQap: filtered.filter(rc => rc.status !== 'DESIGN_QAP_REVIEW').length,
    };
  }, [rootCardsList, selectedQapProjectId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded p-6">
          <h3 className="text-red-800 dark:text-red-200  mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const completedPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const pendingPercent = totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0;
  const overduePercent = totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-2 p-4">
      <div className="">
        <div className="max-w-2xl">
          <h1 className="text-xl  mb-1">Design Engineering Hub</h1>
          <p className=" text-slate-500 text-xs">
            Real-time project and task monitoring
          </p>
        </div>
      </div>

      <DashboardAlerts />

      {/* Drawing Management Statistics Merged Container */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
        {/* Header & Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              Drawing Management Statistics
            </h2>
            <p className="text-xs text-slate-500 mt-1">Select a project to filter drawing status counts</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="min-w-[220px] w-full sm:w-auto">
              <SearchableSelect
                options={projectOptions}
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(val || "all")}
                placeholder="Search project..."
              />
            </div>
            <Link
              to="/design-engineer/drawings"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap shadow-sm shadow-blue-500/10"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              See Drawings
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-700/50 my-4" />

        {/* Drawing Statistics & Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Left: Cards Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {/* Card 1: Total */}
            <div className="bg-slate-50/40 dark:bg-slate-900/20 p-4 rounded-lg flex items-center justify-between border border-slate-100/50 dark:border-slate-800/50">
              <div>
                <p className="text-xs text-slate-500">Total Drawings</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalCount}</p>
              </div>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-600 dark:text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            
            {/* Card 2: Approved */}
            <div className="bg-emerald-50/20 dark:bg-emerald-950/10 p-4 rounded-lg flex items-center justify-between border border-emerald-100/20 dark:border-emerald-950/20">
              <div>
                <p className="text-xs text-slate-500">Approved Drawings</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{approvedCount}</p>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3: Pending Review */}
            <div className="bg-amber-50/20 dark:bg-amber-950/10 p-4 rounded-lg flex items-center justify-between border border-amber-100/20 dark:border-amber-950/20">
              <div>
                <p className="text-xs text-slate-500">Pending Review</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">{pendingCount}</p>
              </div>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4: Rejected */}
            <div className="bg-rose-50/20 dark:bg-rose-950/10 p-4 rounded-lg flex items-center justify-between border border-rose-100/20 dark:border-rose-950/20">
              <div>
                <p className="text-xs text-slate-500">Rejected Drawings</p>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{rejectedCount}</p>
              </div>
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 rounded-lg text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Right: Doughnut Chart */}
          <div className="flex flex-col items-center justify-center p-4 h-44 bg-slate-50/20 dark:bg-slate-900/10 rounded-lg border border-slate-100 dark:border-slate-800">
            {totalCount > 0 ? (
              <div className="w-full h-full max-w-[280px] relative flex items-center justify-center">
                <Doughnut
                  data={drawingChartData}
                  options={drawingChartOptions}
                />
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400 dark:text-slate-500">No drawings found for this project</p>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Task Management Statistics Merged Container */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
        {/* Header & Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              Task Management Statistics
            </h2>
            <p className="text-xs text-slate-500 mt-1">Overview of overall tasks assigned to your department</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Link
              to="/design-engineer/tasks/assigned"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap shadow-sm shadow-blue-500/10"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              See Tasks
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-700/50 my-4" />

        {/* Task Statistics Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Total */}
          <div className="bg-slate-50/40 dark:bg-slate-900/20 p-4 rounded-lg flex items-center justify-between border border-slate-100/50 dark:border-slate-800/50">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Tasks</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalTasks}</p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          
          {/* Card 2: Pending */}
          <div className="bg-amber-50/20 dark:bg-amber-950/10 p-4 rounded-lg flex items-center justify-between border border-amber-100/20 dark:border-amber-950/20">
            <div>
              <p className="text-xs text-slate-500 font-medium">Pending Tasks</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">{pendingTasks}</p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Overdue Tasks */}
          <div className="bg-rose-50/20 dark:bg-rose-950/10 p-4 rounded-lg flex items-center justify-between border border-rose-100/20 dark:border-rose-950/20">
            <div>
              <p className="text-xs text-slate-500 font-medium">Overdue Tasks</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{overdueTasks}</p>
            </div>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 rounded-lg text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Completed */}
          <div className="bg-emerald-50/20 dark:bg-emerald-950/10 p-4 rounded-lg flex items-center justify-between border border-emerald-100/20 dark:border-emerald-950/20">
            <div>
              <p className="text-xs text-slate-500 font-medium">Completed</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{completedTasks}</p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-700/50 my-4" />

        {/* Stacked Progress Bar & Legend Section */}
        {totalTasks > 0 ? (
          <div className="space-y-4 py-2 px-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Task Completion & Status Breakdown</span>
              <span className="text-emerald-600 dark:text-emerald-400">{completedPercent}% Completed</span>
            </div>
            
            {/* Stacked Progress Track */}
            <div className="w-full h-4 bg-slate-100 dark:bg-slate-700/40 rounded-full flex overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-700/50">
              {pendingTasks > 0 && (
                <div 
                  style={{ width: `${(pendingTasks / totalTasks) * 100}%` }}
                  className="bg-amber-500 transition-all duration-500 hover:opacity-90 relative"
                  title={`Pending: ${pendingTasks} tasks (${pendingPercent}%)`}
                />
              )}
              {overdueTasks > 0 && (
                <div 
                  style={{ width: `${(overdueTasks / totalTasks) * 100}%` }}
                  className="bg-red-500 transition-all duration-500 hover:opacity-90 relative"
                  title={`Overdue: ${overdueTasks} tasks (${overduePercent}%)`}
                />
              )}
              {completedTasks > 0 && (
                <div 
                  style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                  className="bg-emerald-500 transition-all duration-500 hover:opacity-90 relative"
                  title={`Completed: ${completedTasks} tasks (${completedPercent}%)`}
                />
              )}
            </div>

            {/* Legend Grid */}
            <div className="grid grid-cols-3 gap-4 text-center mt-3 pt-3 border-t border-slate-100/60 dark:border-slate-700/50">
              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pending</span>
                </div>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {pendingTasks} <span className="text-xs font-normal text-slate-400">({pendingPercent}%)</span>
                </p>
              </div>
              
              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Overdue</span>
                </div>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {overdueTasks} <span className="text-xs font-normal text-slate-400">({overduePercent}%)</span>
                </p>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Completed</span>
                </div>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {completedTasks} <span className="text-xs font-normal text-slate-400">({completedPercent}%)</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-500">
            <p className="text-xs">No tasks available</p>
          </div>
        )}
      </div>

      {/* QAP Review Statistics Merged Container */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
        {/* Header & Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              QAP Review Statistics
            </h2>
            <p className="text-xs text-slate-500 mt-1">Select a project to filter QAP hand-off counts</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="min-w-[220px] w-full sm:w-auto">
              <SearchableSelect
                options={projectOptions}
                value={selectedQapProjectId}
                onChange={(val) => setSelectedQapProjectId(val || "all")}
                placeholder="Search project..."
              />
            </div>
            <Link
              to="/design-engineer/qap-review"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap shadow-sm shadow-blue-500/10"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              See QAP reviews
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-700/50 my-4" />

        {/* QAP Statistics Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total */}
          <div className="bg-slate-50/40 dark:bg-slate-900/20 p-4 rounded-lg flex items-center justify-between border border-slate-100/50 dark:border-slate-800/50">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total QAP Reviews</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalQap}</p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          
          {/* Card 2: Ready for Production (Pending Review) */}
          <div className="bg-amber-50/20 dark:bg-amber-950/10 p-4 rounded-lg flex items-center justify-between border border-amber-100/20 dark:border-amber-950/20">
            <div>
              <p className="text-xs text-slate-500 font-medium">Ready for Production (Pending Review)</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">{pendingQap}</p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-500">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Sent to Production */}
          <div className="bg-emerald-50/20 dark:bg-emerald-950/10 p-4 rounded-lg flex items-center justify-between border border-emerald-100/20 dark:border-emerald-950/20">
            <div>
              <p className="text-xs text-slate-500 font-medium">Sent to Production</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{completedQap}</p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignEngineerDashboard;
