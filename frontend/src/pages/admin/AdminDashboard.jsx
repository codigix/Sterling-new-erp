import { useState, useEffect } from "react";
import axios from "../../utils/api";
import Card, { CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import RootCardForm from "../../components/admin/RootCardForm";
import RootCardList from "../../components/admin/RootCardList/RootCardList";
import {
  BarChart3,
  ShoppingCart,
  Target,
  Factory,
  Truck,
  Package,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  AlertTriangle,
  Zap,
  PieChart,
  TrendingUp,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  OverviewTab,
  ProjectsTab,
  DepartmentsTab,
  VendorsTab,
  MaterialsTab,
  ProductionTab,
  EmployeesTab,
  ResourcesTab,
} from "./AdminDashboard/components";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AdminDashboard = () => {
  const [kpis, setKpis] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    criticalAlerts: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    systemUptime: 99.9,
    pendingTasks: 0,
    total_orders: 0
  });
  const [chartData, setChartData] = useState({
    projectsByStatus: { onTrack: 0, delayed: 0, critical: 0, completed: 0 },
    monthlyCompletion: { labels: [], data: [] },
    deptAnalytics: { labels: [], employees: [], tasks: [] },
    materialConsumption: { labels: [], data: [] },
    operationStats: { labels: [], data: [] },
    recentProjects: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get('/admin/stats');
        const data = response.data;

        setKpis({
          totalProjects: data.kpis.total_projects,
          activeProjects: data.kpis.active_projects,
          completedProjects: data.kpis.completed_projects,
          criticalAlerts: data.kpis.critical_alerts,
          totalEmployees: data.kpis.total_users,
          activeEmployees: Math.round(data.kpis.total_users * 0.9),
          systemUptime: 99.9,
          pendingTasks: data.projectStatus.delayed,
          total_orders: data.kpis.total_orders
        });

        setChartData({
          projectsByStatus: data.projectStatus,
          monthlyCompletion: {
            labels: data.monthlyTrends.map(m => m.month),
            data: data.monthlyTrends.map(m => m.completedCount)
          },
          deptAnalytics: {
            labels: data.deptAnalytics.map(d => d.name),
            employees: data.deptAnalytics.map(d => d.employeeCount),
            tasks: data.deptAnalytics.map(d => d.taskCount)
          },
          materialConsumption: {
            labels: data.materialConsumption.map(m => m.name),
            data: data.materialConsumption.map(m => m.totalQuantity)
          },
          operationStats: {
            labels: data.operationStats.map(o => o.name),
            data: data.operationStats.map(o => o.count)
          },
          recentProjects: data.recentProjects || []
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen space-y-6  bg-slate-50/50">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl ">Dashboard & Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time manufacturing system analytics and KPIs</p>
        </div>
        <div className="text-sm text-slate-400  bg-white px-4 py-2 rounded border border-slate-200 ">
          Last Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Projects" 
          value={kpis.totalProjects} 
          subtitle="Active & Completed" 
          icon={Target} 
          color="blue" 
        />
        <KPICard 
          title="Active Projects" 
          value={kpis.activeProjects} 
          subtitle={`${Math.round((kpis.activeProjects / (kpis.totalProjects || 1)) * 100)}% of total`} 
          icon={Activity} 
          color="emerald" 
        />
        <KPICard 
          title="Total Workforce" 
          value={kpis.totalEmployees} 
          subtitle={`${kpis.activeEmployees} currently active`} 
          icon={Users} 
          color="amber" 
        />
        <KPICard 
          title="Critical Alerts" 
          value={kpis.criticalAlerts} 
          subtitle="Require immediate attention" 
          icon={AlertTriangle} 
          color="red" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Status Distribution */}
        <Card className=" border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <PieChart className="w-4 h-4 text-blue-600" />
              <span className="text-base ">Project Status Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px]">
              <Doughnut
                data={{
                  labels: ['On Track', 'Delayed', 'Critical', 'Completed'],
                  datasets: [{
                    data: [
                      chartData.projectsByStatus.onTrack,
                      chartData.projectsByStatus.delayed,
                      chartData.projectsByStatus.critical,
                      chartData.projectsByStatus.completed
                    ],
                    backgroundColor: ["#10b981", "#f59e0b", "#ef4444", "#94a3b8"],
                    borderColor: "#ffffff",
                    borderWidth: 2,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom", labels: { padding: 20, usePointStyle: true } },
                  },
                  cutout: '70%'
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance Trend */}
        <Card className=" border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-base ">Monthly Project Completion</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px]">
              <Line
                data={{
                  labels: chartData.monthlyCompletion.labels.length > 0 ? chartData.monthlyCompletion.labels : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                  datasets: [{
                    label: "Completed Projects",
                    data: chartData.monthlyCompletion.data.length > 0 ? chartData.monthlyCompletion.data : [0, 0, 0, 0, 0, 0],
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.05)",
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Department Analytics Chart - High Standard Full Width */}
        <Card className="lg:col-span-2  border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <Factory className="w-4 h-4 text-purple-600" />
              <span className="text-base ">Department Performance & Resource Allocation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[350px]">
              <Bar
                data={{
                  labels: chartData.deptAnalytics.labels,
                  datasets: [
                    {
                      label: "Workforce",
                      data: chartData.deptAnalytics.employees,
                      backgroundColor: "rgba(99, 102, 241, 0.8)",
                      borderRadius: 4,
                    },
                    {
                      label: "Production Updates",
                      data: chartData.deptAnalytics.tasks,
                      backgroundColor: "rgba(16, 185, 129, 0.8)",
                      borderRadius: 4,
                    }
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, padding: 20 } }
                  },
                  scales: {
                    y: { 
                      beginAtZero: true,
                      grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                      grid: { display: false }
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Material Consumption Chart */}
        <Card className=" border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <Package className="w-4 h-4 text-cyan-600" />
              <span className="text-base ">Top Material Consumption</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px]">
              <Bar
                data={{
                  labels: chartData.materialConsumption.labels,
                  datasets: [{
                    label: "Quantity Consumed",
                    data: chartData.materialConsumption.data,
                    backgroundColor: "rgba(6, 182, 212, 0.7)",
                    borderRadius: 4,
                  }],
                }}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { beginAtZero: true } }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operations Insight Chart */}
        <Card className=" border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="text-base ">Operation Insights (Task Distribution)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px]">
              <Doughnut
                data={{
                  labels: chartData.operationStats.labels,
                  datasets: [{
                    data: chartData.operationStats.data,
                    backgroundColor: [
                      "#6366f1", "#10b981", "#f59e0b", "#ef4444", 
                      "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"
                    ],
                    borderWidth: 1,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "right", labels: { boxWidth: 12, usePointStyle: true } },
                  },
                  cutout: '60%'
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Project Progress Visualization */}
      <Card className="border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-slate-700">
            <Activity className="w-5 h-5 text-emerald-600" />
            <span className="text-md ">Live Project Execution Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {chartData.recentProjects.slice(0, 3).length > 0 ? (
                chartData.recentProjects.slice(0, 3).map((project, index) => (
                  <div key={index} className="group">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex flex-col">
                        <span className=" text-slate-800 group-hover:text-blue-600 transition-colors">{project.project_name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs  p-1 bg-slate-100 text-slate-600 rounded-full">{project.project_code}</span>
                          <span className="text-xs  text-blue-500  ">{project.status.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg  text-blue-600">{project.progress}%</span>
                        <span className="text-xs text-slate-400   ">Current Status</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 p-[1px]">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-700 h-full rounded-full transition-all duration-1000 ease-out relative shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                        style={{ width: `${project.progress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center py-10 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No active projects tracking.
                </div>
              )}
            </div>

            <div className="space-y-2">
              {chartData.recentProjects.slice(3, 6).length > 0 ? (
                chartData.recentProjects.slice(3, 6).map((project, index) => (
                  <div key={index} className="group">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex flex-col">
                        <span className=" text-slate-800 group-hover:text-blue-600 transition-colors">{project.project_name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs  p-1 bg-slate-100 text-slate-600 rounded-full">{project.project_code}</span>
                          <span className="text-xs  text-blue-500  ">{project.status.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg  text-blue-600">{project.progress}%</span>
                        <span className="text-xs text-slate-400   ">Current Status</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 p-[1px]">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-700 h-full rounded-full transition-all duration-1000 ease-out relative shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                        style={{ width: `${project.progress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                chartData.recentProjects.length > 0 ? (
                   <div className="h-full flex items-center justify-center py-10">
                     <div className="text-center space-y-2">
                       <p className="text-sm  text-slate-600">Project Execution Efficiency</p>
                       <p className="text-3xl  text-emerald-600">High</p>
                       <p className="text-xs text-slate-400  tracking-widest ">Real-time Analysis</p>
                     </div>
                   </div>
                ) : (
                  <div className="h-full flex items-center justify-center py-10 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Awaiting project data.
                  </div>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard 
          icon={CheckCircle2} 
          label="Completion Rate" 
          value={`${Math.round((kpis.completedProjects / (kpis.totalProjects || 1)) * 100)}%`}
          color="blue"
        />
        <SummaryCard 
          icon={Zap} 
          label="System Health" 
          value={`${kpis.systemUptime}%`}
          color="emerald"
        />
        <SummaryCard 
          icon={Clock} 
          label="Pending Tasks" 
          value={kpis.pendingTasks}
          color="amber"
        />
      </div>
    </div>
  );
};

const KPICard = ({ title, value, subtitle, icon: Icon, color }) => {
  const colorMap = {
    blue: "border-blue-100 from-blue-50 to-white text-blue-600",
    emerald: "border-emerald-100 from-emerald-50 to-white text-emerald-600",
    amber: "border-amber-100 from-amber-50 to-white text-amber-600",
    red: "border-red-100 from-red-50 to-white text-red-600"
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border-2 rounded-xl p-2  transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs    text-slate-500">{title}</p>
          <p className="text-xl  ">{value}</p>
          <p className="text-xs  text-slate-500">{subtitle}</p>
        </div>
        <div className={`p-3 rounded bg-white  border border-slate-100`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: "text-blue-600 bg-blue-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50"
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm  text-slate-500">{label}</p>
          <p className="text-xl  ">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Tabs are exported for use in the main dashboard layout if needed
const RootCardsTab = () => {
  const [mode, setMode] = useState('list');
  const [selectedRootCard, setSelectedRootCard] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleBackToList = () => {
    setMode('list');
    setSelectedRootCard(null);
    setRefreshTrigger(prev => prev + 1);
  };

  if (mode === 'create' || mode === 'view' || mode === 'edit' || mode === 'assign') {
    return (
      <RootCardForm
        mode={mode}
        initialData={selectedRootCard}
        onSubmit={handleBackToList}
        onCancel={handleBackToList}
      />
    );
  }

  return (
    <div className="w-full">
      <RootCardList
        onCreateNew={() => setMode('create')}
        onViewRootCard={(rc) => { setSelectedRootCard(rc); setMode('view'); }}
        onEditRootCard={(rc) => { setSelectedRootCard(rc); setMode('edit'); }}
        onAssignRootCard={(rc) => { setSelectedRootCard(rc); setMode('assign'); }}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
};

export default AdminDashboard;
export {
  OverviewTab,
  ProjectsTab,
  DepartmentsTab,
  VendorsTab,
  MaterialsTab,
  ProductionTab,
  EmployeesTab,
  ResourcesTab,
  RootCardsTab,
};
