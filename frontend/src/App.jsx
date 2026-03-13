import { useEffect, lazy, Suspense } from "react";
const DesignDrawingManagement = lazy(() => import("./pages/design-engineer/DesignDrawingManagement"));
const ProductionDesignDrawings = lazy(() => import("./pages/production/ProductionDesignDrawings"));
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import AdminLayout from "./components/layout/AdminLayout";
import DepartmentLayout from "./components/layout/DepartmentLayout";
import DesignEngineerLayout from "./components/layout/DesignEngineerLayout";

// Lazy load role-based dashboards for better performance
const InventoryDepartmentDashboard = lazy(() => import("./pages/roles/InventoryDepartmentDashboard"));
const ProcurementDashboard = lazy(() => import("./pages/roles/ProcurementDashboard"));
const QCManagerDashboard = lazy(() => import("./pages/roles/QCManagerDashboard"));
const AccountantDashboard = lazy(() => import("./pages/roles/AccountantDashboard"));
const WorkerDashboard = lazy(() => import("./pages/roles/WorkerDashboard"));
const ProductionManagerDashboard = lazy(() => import("./pages/roles/ProductionManagerDashboard"));

// BOM Pages (Production)
const CreateBOMPage = lazy(() => import("./pages/production/bom/CreateBOMPage"));
const ViewBOMsPage = lazy(() => import("./pages/production/bom/ViewBOMsPage"));
const BOMDetailsPage = lazy(() => import("./pages/production/bom/BOMDetailsPage"));

// Admin Components
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProjectsPage from "./pages/admin/ProjectsPage";
import DepartmentsPage from "./pages/admin/DepartmentsPage";
import VendorsPage from "./pages/admin/VendorsPage";
import MaterialsPage from "./pages/admin/MaterialsPage";
import ProductionPage from "./pages/admin/ProductionPage";
import EmployeesPage from "./pages/admin/EmployeesPage";
import ResourcesPage from "./pages/admin/ResourcesPage";
import RootCardsPage from "./pages/admin/RootCardsPage";
import NewRootCardPage from "./pages/admin/NewRootCardPage";
import AdminRootCardDetailPage from "./pages/admin/RootCardDetailPage";
import ReportsAnalytics from "./pages/admin/ReportsAnalytics";
import AnalyticsReportsPage from "./pages/admin/AnalyticsReportsPage";
import AuditLogs from "./pages/admin/AuditLogs";
import SystemSettings from "./pages/admin/SystemSettings";
import RoleManagement from "./pages/admin/RoleManagement";
import EmployeeManagement from "./pages/admin/EmployeeManagement";
import TaskAssignmentPage from "./pages/admin/TaskAssignmentPage";
import SalesOrderPage from "./pages/admin/SalesOrderPage";

// Sales Pages
import RootCardDashboard from "./pages/sales/RootCardDashboard";
import UniversalRootCardsPage from "./pages/shared/UniversalRootCardsPage";
import UniversalRootCardDetailPage from "./pages/shared/UniversalRootCardDetailPage";
import UniversalNewRootCardPage from "./pages/shared/UniversalNewRootCardPage";

// Engineering Pages
import EngineeringTasksPage from "./pages/engineering/EngineeringTasksPage";

// Procurement Pages
import ProcurementTasksPage from "./pages/procurement/ProcurementTasksPage";

// QC Pages
import QCTasksPage from "./pages/qc/QCTasksPage";

// Inventory Pages
import InventoryTasksPage from "./pages/inventory/InventoryTasksPage";

// Production Pages
import ProductionTasksPage from "./pages/production/ProductionTasksPage";
import ProductionDashboard from "./pages/production/ProductionDashboard";
import RootCardBuilderPage from "./pages/production/RootCardBuilderPage";
import ProductionRootCardDetailPage from "./pages/production/RootCardDetailPage";
import ProductionPlansPage from "./pages/production/ProductionPlansPage";
import ProductionPlanDetailPage from "./pages/production/ProductionPlanDetailPage";
import ProductionPlanFormPage from "./pages/production/ProductionPlanFormPage";
import WorkOrdersPage from "./pages/production/WorkOrdersPage";
import WorkOrderFormPage from "./pages/production/WorkOrderFormPage";
import WorkOrderDetailPage from "./pages/production/WorkOrderDetailPage";
import JobCardsPage from "./pages/production/JobCardsPage";
import WorkstationsPage from "./pages/production/WorkstationsPage";
import WorkstationFormPage from "./pages/production/WorkstationFormPage";
import ProductionEntryPage from "./pages/production/ProductionEntryPage";
import MaterialRequestsPage from "./pages/production/MaterialRequestsPage";
import ProductionDepartmentTasksPage from "./pages/production/ProductionDepartmentTasksPage";
import ProductionWorkflowTasksPage from "./pages/production/ProductionWorkflowTasksPage";

// Employee Portal
import EmployeePortalPage from "./pages/employee/EmployeePortalPage";
import EmployeeDashboardLayout from "./components/layout/EmployeeDashboardLayout";
import EmployeeDashboardHome from "./pages/employee/EmployeeDashboardHome";
import EmployeeProfile from "./pages/employee/EmployeeProfile";
import EmployeeAttendance from "./pages/employee/EmployeeAttendance";
import EmployeeTasks from "./pages/employee/EmployeeTasks";
import EmployeeProjects from "./pages/employee/EmployeeProjects";
import EmployeeAlerts from "./pages/employee/EmployeeAlerts";
import EmployeeUpdates from "./pages/employee/EmployeeUpdates";
import EmployeeSettings from "./pages/employee/EmployeeSettings";

// Reports/Tracking Pages
import ProjectTrackingDashboard from "./pages/reports/ProjectTrackingDashboard";
import EmployeeTrackingDashboard from "./pages/reports/EmployeeTrackingDashboard";

// Notifications
import NotificationsPage from "./pages/notifications/NotificationsPage";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

const SessionWatcher = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const handleSessionExpired = () => {
      logout();
      navigate("/login", { replace: true });
    };

    window.addEventListener("app:session-expired", handleSessionExpired);
    return () =>
      window.removeEventListener("app:session-expired", handleSessionExpired);
  }, [logout, navigate]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <SessionWatcher />
        <div className="App">
          <ToastContainer />
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          }>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="root-cards" element={<UniversalRootCardsPage />} />
                <Route path="root-cards/new-root-card" element={<UniversalNewRootCardPage />} />
                <Route path="root-cards/:id" element={<UniversalRootCardDetailPage />} />
                <Route path="root-cards/:id/assign" element={<UniversalRootCardDetailPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="departments" element={<DepartmentsPage />} />
                <Route path="vendors" element={<VendorsPage />} />
                <Route path="materials" element={<MaterialsPage />} />
                <Route path="production" element={<ProductionPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="resources" element={<ResourcesPage />} />
                <Route path="roles" element={<RoleManagement />} />
                <Route path="employee-management" element={<EmployeeManagement />} />
                <Route path="task-assignment" element={<TaskAssignmentPage />} />
                <Route path="sales-order" element={<SalesOrderPage />} />
                <Route path="analytics-reports" element={<AnalyticsReportsPage />} />
                <Route path="reports" element={<ReportsAnalytics />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="settings" element={<SystemSettings />} />
              </Route>
              
              {/* Department Routes - Task-Oriented Pages */}
              <Route path="/department" element={<DepartmentLayout />}>
                <Route path="root-cards" element={<UniversalRootCardsPage />} />
                <Route path="root-cards/new-root-card" element={<UniversalNewRootCardPage />} />
                <Route path="root-cards/:id" element={<UniversalRootCardDetailPage />} />
                <Route path="engineering" element={<EngineeringTasksPage />} />
                <Route path="engineering/drawings" element={<DesignDrawingManagement />} />
                <Route path="procurement/*" element={<ProcurementDashboard />} />
                <Route path="qc" element={<QCTasksPage />} />
                <Route path="inventory/*" element={<InventoryDepartmentDashboard />} />
                <Route path="production" element={<ProductionDashboard />} />
                
                {/* Production Flow Routes */}
                <Route path="production/root-cards" element={<UniversalRootCardsPage />} />
                <Route path="production/root-cards/:id" element={<UniversalRootCardDetailPage />} />
                <Route path="production/design-drawings" element={<ProductionDesignDrawings />} />
                <Route path="production/material-requests" element={<MaterialRequestsPage />} />
                
                {/* BOM Routes */}
                <Route path="production/bom/create" element={<CreateBOMPage />} />
                <Route path="production/bom/view" element={<ViewBOMsPage />} />
                <Route path="production/bom/view/:id" element={<BOMDetailsPage />} />

                <Route path="production/plans" element={<ProductionPlansPage />} />
                <Route path="production/plans/new" element={<ProductionPlanFormPage />} />
                <Route path="production/plans/:id" element={<ProductionPlanFormPage />} />
                <Route path="production/work-orders" element={<WorkOrdersPage />} />
                <Route path="production/work-orders/new" element={<WorkOrderFormPage />} />
                <Route path="production/work-orders/:id" element={<WorkOrderDetailPage />} />
                <Route path="production/work-orders/edit/:id" element={<WorkOrderFormPage />} />
                <Route path="production/job-cards" element={<JobCardsPage />} />
                <Route path="production/workstations" element={<WorkstationsPage />} />
                <Route path="production/workstations/new" element={<WorkstationFormPage />} />
                <Route path="production/workstations/edit/:id" element={<WorkstationFormPage />} />
                <Route path="production/department-tasks" element={<ProductionDepartmentTasksPage />} />
                <Route path="production/workflow-tasks" element={<ProductionWorkflowTasksPage />} />
                <Route path="production/operations/:id/entry" element={<ProductionEntryPage />} />
              </Route>
              
              {/* Employee Routes */}
              <Route path="/employee" element={<EmployeeDashboardLayout />}>
                <Route path="dashboard" element={<EmployeeDashboardHome />} />
                <Route path="profile" element={<EmployeeProfile />} />
                <Route path="attendance" element={<EmployeeAttendance />} />
                <Route path="tasks" element={<EmployeeTasks />} />
                <Route path="projects" element={<EmployeeProjects />} />
                <Route path="alerts" element={<EmployeeAlerts />} />
                <Route path="updates" element={<EmployeeUpdates />} />
                <Route path="settings" element={<EmployeeSettings />} />
                <Route path="operations/:id/entry" element={<ProductionEntryPage />} />
              </Route>
              
              {/* Legacy Employee Portal */}
              <Route path="/employee-portal" element={<DepartmentLayout />}>
                <Route path="portal" element={<EmployeePortalPage />} />
              </Route>
              
              {/* Reports Routes */}
              <Route path="/reports" element={<DepartmentLayout />}>
                <Route
                  path="project-tracking"
                  element={<ProjectTrackingDashboard />}
                />
                <Route
                  path="employee-tracking"
                  element={<EmployeeTrackingDashboard />}
                />
              </Route>
              
              {/* Shared Pages */}
              <Route path="/notifications" element={<NotificationsPage />} />
              
              {/* Role-Based Dashboards */}
              <Route path="/design-engineer/*" element={<DesignEngineerLayout />} />
              <Route path="/qc-manager/*" element={<QCManagerDashboard />} />
              <Route path="/accountant/*" element={<AccountantDashboard />} />
              <Route path="/production-manager/*" element={<ProductionManagerDashboard />} />
              <Route path="/worker/*" element={<WorkerDashboard />} />
              
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
