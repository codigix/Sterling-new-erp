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
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Lazy load role-based dashboards for better performance
const InventoryDepartmentDashboard = lazy(() => import("./pages/roles/InventoryDepartmentDashboard"));
const ProcurementDashboard = lazy(() => import("./pages/roles/ProcurementDashboard"));
const QualityDepartmentDashboard = lazy(() => import("./pages/roles/QualityDepartmentDashboard"));
const AccountantDashboard = lazy(() => import("./pages/roles/AccountantDashboard"));
const OutsourcingChallansPage = lazy(() => import("./pages/production/OutsourcingChallansPage"));

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
import SystemSettings from "./pages/admin/SystemSettings";
import RoleManagement from "./pages/admin/RoleManagement";
import EmployeeManagement from "./pages/admin/EmployeeManagement";
import DepartmentTasksPage from "./pages/admin/DepartmentTasksPage";

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

// Production Pages
import ProductionTasksPage from "./pages/production/ProductionTasksPage";
import ProductionDashboard from "./pages/production/ProductionDashboard";
import DepartmentPortalTasksPage from "./pages/department/DepartmentPortalTasksPage";
import RootCardBuilderPage from "./pages/production/RootCardBuilderPage";
import ProductionRootCardDetailPage from "./pages/production/RootCardDetailPage";
import DailyProductionPlanningPage from "./pages/production/DailyProductionPlanningPage";
import OperationsPage from "./pages/production/OperationsPage";
import MCRReportPage from "./pages/production/MCRReportPage";
import ProductionPlanDetailPage from "./pages/production/ProductionPlanDetailPage";
import ProductionPlanFormPage from "./pages/production/ProductionPlanFormPage";
import MaterialRequestsPage from "./pages/production/MaterialRequestsPage";
import ReleasedMaterialsPage from "./pages/production/ReleasedMaterialsPage";
import ProductionUpdatePage from "./pages/production/ProductionUpdatePage";
import QualityHandoverPage from "./pages/production/QualityHandoverPage";
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
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }>
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
                <Route path="department-tasks" element={<DepartmentTasksPage />} />
                <Route path="reports" element={<ReportsAnalytics />} />
                <Route path="settings" element={<SystemSettings />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
              
              {/* Department Routes - Task-Oriented Pages */}
              <Route path="/department" element={<DepartmentLayout />}>
                <Route path="root-cards" element={
                  <ProtectedRoute allowedRoles={["Admin", "Sales", "Production", "Procurement", "Inventory", "Engineering", "Design Engineer", "Quality", "QC"]}>
                    <UniversalRootCardsPage />
                  </ProtectedRoute>
                } />
                <Route path="root-cards/new-root-card" element={
                  <ProtectedRoute allowedRoles={["Admin", "Sales", "Production", "Engineering", "Design Engineer"]}>
                    <UniversalNewRootCardPage />
                  </ProtectedRoute>
                } />
                <Route path="root-cards/:id" element={
                  <ProtectedRoute>
                    <UniversalRootCardDetailPage />
                  </ProtectedRoute>
                } />
                
                {/* Engineering/Design */}
                <Route path="engineering" element={
                  <ProtectedRoute allowedDepartments={["Design Engineer", "Engineering"]}>
                    <EngineeringTasksPage />
                  </ProtectedRoute>
                } />
                <Route path="engineering/tasks" element={
                  <ProtectedRoute allowedDepartments={["Design Engineer", "Engineering"]}>
                    <DepartmentPortalTasksPage />
                  </ProtectedRoute>
                } />
                <Route path="engineering/drawings" element={
                  <ProtectedRoute allowedDepartments={["Design Engineer", "Engineering"]}>
                    <DesignDrawingManagement />
                  </ProtectedRoute>
                } />

                {/* Procurement */}
                <Route path="procurement/*" element={
                  <ProtectedRoute allowedDepartments={["Procurement"]}>
                    <ProcurementDashboard />
                  </ProtectedRoute>
                } />
                <Route path="procurement/tasks" element={
                  <ProtectedRoute allowedDepartments={["Procurement"]}>
                    <DepartmentPortalTasksPage />
                  </ProtectedRoute>
                } />

                {/* QC/Quality */}
                <Route path="qc" element={
                  <ProtectedRoute allowedDepartments={["Quality", "QC"]}>
                    <QCInspectionsPage />
                  </ProtectedRoute>
                } />
                <Route path="qc/tasks" element={
                  <ProtectedRoute allowedDepartments={["Quality", "QC"]}>
                    <DepartmentPortalTasksPage />
                  </ProtectedRoute>
                } />
                <Route path="qc/inspection/:id" element={
                  <ProtectedRoute allowedDepartments={["Quality", "QC"]}>
                    <QualityInspectionDetail />
                  </ProtectedRoute>
                } />

                {/* Inventory */}
                <Route path="inventory/*" element={
                  <ProtectedRoute allowedDepartments={["Inventory"]}>
                    <InventoryDepartmentDashboard />
                  </ProtectedRoute>
                } />

                {/* Production */}
                <Route path="production" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <ProductionDashboard />
                  </ProtectedRoute>
                } />
                <Route path="production/tasks" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <DepartmentPortalTasksPage />
                  </ProtectedRoute>
                } />
                <Route path="production/root-cards" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <UniversalRootCardsPage />
                  </ProtectedRoute>
                } />
                <Route path="production/root-cards/:id" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <UniversalRootCardDetailPage />
                  </ProtectedRoute>
                } />
                <Route path="production/design-drawings" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <ProductionDesignDrawings />
                  </ProtectedRoute>
                } />
                <Route path="production/material-requests" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <MaterialRequestsPage />
                  </ProtectedRoute>
                } />
                <Route path="production/released-materials" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <ReleasedMaterialsPage />
                  </ProtectedRoute>
                } />
                
                {/* BOM Routes */}
                <Route path="production/bom/create" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <CreateBOMPage />
                  </ProtectedRoute>
                } />
                <Route path="production/bom/view" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <ViewBOMsPage />
                  </ProtectedRoute>
                } />
                <Route path="production/bom/view/:id" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <BOMDetailsPage />
                  </ProtectedRoute>
                } />

                <Route path="production/plans" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <DailyProductionPlanningPage />
                  </ProtectedRoute>
                } />
                <Route path="production/updates" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <ProductionUpdatePage />
                  </ProtectedRoute>
                } />
                <Route path="production/quality-handover" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <QualityHandoverPage />
                  </ProtectedRoute>
                } />
                <Route path="production/daily-updates" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <DailyProductionUpdatesPage />
                  </ProtectedRoute>
                } />
                <Route path="production/employee-work-logs" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <EmployeeWorkLogsPage />
                  </ProtectedRoute>
                } />
                <Route path="production/operations" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <OperationsPage />
                  </ProtectedRoute>
                } />
                <Route path="production/mcr-reports" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <MCRReportPage />
                  </ProtectedRoute>
                } />
                <Route path="production/outsourcing-challans" element={
                  <ProtectedRoute allowedDepartments={["Production"]}>
                    <OutsourcingChallansPage />
                  </ProtectedRoute>
                } />

                <Route path="tasks" element={<DepartmentPortalTasksPage />} />
                <Route path="root-cards/tasks" element={<DepartmentPortalTasksPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
              
              <Route path="/department/quality/*" element={
                <ProtectedRoute allowedDepartments={["Quality", "QC"]}>
                  <QualityDepartmentDashboard />
                </ProtectedRoute>
              } />
              
              {/* Employee Routes */}
              <Route path="/employee" element={
                <ProtectedRoute allowedRoles={["Employee", "Supervisor", "Admin"]}>
                  <EmployeeDashboardLayout />
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<EmployeeDashboardHome />} />
                <Route path="profile" element={<EmployeeProfile />} />
                <Route path="attendance" element={<EmployeeAttendance />} />
                <Route path="tasks" element={<EmployeeTasks />} />
                <Route path="projects" element={<EmployeeProjects />} />
                <Route path="alerts" element={<EmployeeAlerts />} />
                <Route path="updates" element={<EmployeeUpdates />} />
                <Route path="settings" element={<EmployeeSettings />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
              
              {/* Legacy Employee Portal */}
              <Route path="/employee-portal" element={
                <ProtectedRoute allowedRoles={["Employee", "Supervisor", "Admin"]}>
                  <DepartmentLayout />
                </ProtectedRoute>
              }>
                <Route path="portal" element={<EmployeePortalPage />} />
              </Route>
              
              {/* Reports Routes */}
              <Route path="/reports" element={
                <ProtectedRoute allowedRoles={["Admin", "Management"]}>
                  <DepartmentLayout />
                </ProtectedRoute>
              }>
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
              
              {/* Role-Based Dashboards */}
              <Route path="/design-engineer/*" element={
                <ProtectedRoute allowedRoles={["Design Engineer", "Engineering"]}>
                  <DesignEngineerLayout />
                </ProtectedRoute>
              } />
              <Route path="/accountant/*" element={
                <ProtectedRoute allowedRoles={["Accountant", "Admin"]}>
                  <AccountantDashboard />
                </ProtectedRoute>
              } />
              
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
