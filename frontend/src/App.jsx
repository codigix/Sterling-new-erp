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
const QualityDepartmentDashboard = lazy(() => import("./pages/roles/QualityDepartmentDashboard"));
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
import AuditLogs from "./pages/admin/AuditLogs";
import SystemSettings from "./pages/admin/SystemSettings";
import RoleManagement from "./pages/admin/RoleManagement";
import EmployeeManagement from "./pages/admin/EmployeeManagement";

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
const QCTasksPage = lazy(() => import("./pages/qc/QCTasksPage"));
const QCInspectionsPage = lazy(() => import("./pages/inventory/QCInspectionsPage"));
const QualityInspectionDetail = lazy(() => import("./pages/qc/QualityInspectionDetail"));

// Inventory Pages
import InventoryTasksPage from "./pages/inventory/InventoryTasksPage";

// Production Pages
import ProductionTasksPage from "./pages/production/ProductionTasksPage";
import ProductionDashboard from "./pages/production/ProductionDashboard";
import RootCardBuilderPage from "./pages/production/RootCardBuilderPage";
import ProductionRootCardDetailPage from "./pages/production/RootCardDetailPage";
import DailyProductionPlanningPage from "./pages/production/DailyProductionPlanningPage";
import OperationsPage from "./pages/production/OperationsPage";
import ProductionPlanDetailPage from "./pages/production/ProductionPlanDetailPage";
import ProductionPlanFormPage from "./pages/production/ProductionPlanFormPage";
import WorkstationsPage from "./pages/production/WorkstationsPage";
import WorkstationFormPage from "./pages/production/WorkstationFormPage";
import MaterialRequestsPage from "./pages/production/MaterialRequestsPage";
import ReleasedMaterialsPage from "./pages/production/ReleasedMaterialsPage";
import DailyProductionUpdatesPage from "./pages/production/DailyProductionUpdatesPage";
import EmployeeWorkLogsPage from "./pages/production/EmployeeWorkLogsPage";

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
              <div className="animate-spin rounded  h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
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
                <Route path="qc" element={<QCInspectionsPage />} />
                <Route path="qc/inspection/:id" element={<QualityInspectionDetail />} />
                <Route path="inventory/*" element={<InventoryDepartmentDashboard />} />
                <Route path="production" element={<ProductionDashboard />} />
                
                {/* Production Flow Routes */}
                <Route path="production/root-cards" element={<UniversalRootCardsPage />} />
                <Route path="production/root-cards/:id" element={<UniversalRootCardDetailPage />} />
                <Route path="production/design-drawings" element={<ProductionDesignDrawings />} />
                <Route path="production/material-requests" element={<MaterialRequestsPage />} />
                <Route path="production/released-materials" element={<ReleasedMaterialsPage />} />
                
                {/* BOM Routes */}
                <Route path="production/bom/create" element={<CreateBOMPage />} />
                <Route path="production/bom/view" element={<ViewBOMsPage />} />
                <Route path="production/bom/view/:id" element={<BOMDetailsPage />} />

                <Route path="production/plans" element={<DailyProductionPlanningPage />} />
                <Route path="production/updates" element={<DailyProductionUpdatesPage />} />
                <Route path="production/employee-work-logs" element={<EmployeeWorkLogsPage />} />
                <Route path="production/operations" element={<OperationsPage />} />
                <Route path="production/workstations" element={<WorkstationsPage />} />
                <Route path="production/workstations/new" element={<WorkstationFormPage />} />
                <Route path="production/workstations/edit/:id" element={<WorkstationFormPage />} />
              </Route>
              
              <Route path="/department/quality/*" element={<QualityDepartmentDashboard />} />
              
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
