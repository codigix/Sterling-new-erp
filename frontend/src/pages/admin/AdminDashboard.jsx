import { useState, useEffect } from "react";
import axios from "../../utils/api";
import Card, { CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import RootCardForm from "../../components/admin/RootCardForm";
import RootCardList from "../../components/admin/RootCardList/RootCardList";
import DashboardAlerts from "../../components/dashboard/DashboardAlerts";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ClipboardList,
} from "lucide-react";
import {
  OverviewTab,
  ProjectsTab,
  DepartmentsTab,
  VendorsTab,
  MaterialsTab,
  ProductionTab,
  EmployeesTab,
  ResourcesTab,
  PertChart,
} from "./AdminDashboard/components";

const AdminDashboard = () => {
  const [allTasks, setAllTasks] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get('/admin/stats');
        const data = response.data;
        setAllTasks(data.tasks || []);
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

  // Calculate task counts dynamically based on selected department filter
  const getFilteredTaskStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = selectedDepartment === "all"
      ? allTasks
      : allTasks.filter(t => t.department_id?.toString() === selectedDepartment.toString());

    let completed = 0;
    let pending = 0;
    let overdue = 0;

    filtered.forEach(t => {
      const isCompleted = t.status === 'Completed' || t.status === 'completed';
      if (isCompleted) {
        completed++;
      } else {
        if (t.due_date) {
          const due = new Date(t.due_date);
          due.setHours(0, 0, 0, 0);
          if (due < today) {
            overdue++;
          } else {
            pending++;
          }
        } else {
          pending++;
        }
      }
    });

    return { total: filtered.length, completed, pending, overdue };
  };

  const taskStats = getFilteredTaskStats();

  const DEPARTMENTS_LIST = [
    { id: 'all', name: 'All Departments' },
    { id: '1', name: 'Admin' },
    { id: '2', name: 'Design Engineer' },
    { id: '3', name: 'Production' },
    { id: '4', name: 'Procurement' },
    { id: '5', name: 'Quality' },
    { id: '6', name: 'Inventory' },
    { id: '7', name: 'Accountant' }
  ];

  return (
    <div className="w-full min-h-screen space-y-6 p-4 bg-slate-50/50">
      <DashboardAlerts />

      {/* Departmental Tasks Widget */}
      <div className="bg-white border border-slate-200 rounded p-6 shadow-sm hover:shadow transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600 animate-pulse" />
            <div>
              <h2 className="text-md font-semibold text-slate-800">Departmental Tasks</h2>
              <p className="text-xs text-slate-400">Track task progress assigned by admin to teams</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Filter Department:</span>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="border border-slate-200 rounded p-1.5 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
            >
              {DEPARTMENTS_LIST.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded p-4 flex items-center justify-between shadow-sm group hover:shadow transition-all duration-300">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 group-hover:text-green-600 transition-colors">Completed Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900">{taskStats.completed}</h3>
              <p className="text-[10px] text-slate-400">Total completed departmental tasks</p>
            </div>
            <div className="p-3 rounded-full bg-white border border-green-100 text-green-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded p-4 flex items-center justify-between shadow-sm group hover:shadow transition-all duration-300">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 group-hover:text-amber-600 transition-colors">Pending Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900">{taskStats.pending}</h3>
              <p className="text-[10px] text-slate-400">In progress or future tasks</p>
            </div>
            <div className="p-3 rounded-full bg-white border border-amber-100 text-amber-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-white border border-red-100 rounded p-4 flex items-center justify-between shadow-sm group hover:shadow transition-all duration-300">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 group-hover:text-red-600 transition-colors">Overdue Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900 text-red-600">{taskStats.overdue}</h3>
              <p className="text-[10px] text-slate-400">Tasks past their due date</p>
            </div>
            <div className="p-3 rounded-full bg-white border border-red-100 text-red-500 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ── PERT Department Progress Chart ── */}
      <PertChart />
    </div>
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
