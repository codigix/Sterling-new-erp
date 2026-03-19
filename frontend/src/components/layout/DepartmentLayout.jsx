import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../common/NotificationBell";
import {
  Menu,
  User,
  LogOut,
  ChevronDown,
  Home,
  Package,
  ShoppingCart,
  Wrench,
  CheckSquare,
  Boxes,
  Factory,
  AlertCircle,
  Zap,
  Users,
  Calendar,
  Activity,
  BarChart3,
  Layers,
  Truck,
  ClipboardList,
  FileText,
  Monitor,
  RefreshCw,
  Warehouse,
  Clock,
  FileCheck,
} from "lucide-react";

const DepartmentLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const departmentModules = {
    sales: {
      title: "Root Cards",
      icon: Layers,
      path: "/department/root-cards",
    },
    engineering: {
      title: "Engineering",
      icon: Wrench,
      path: "/department/engineering",
    },
    procurement: {
      title: "Procurement",
      icon: Package,
      path: "/department/procurement",
    },
    qc: {
      title: "QC",
      icon: CheckSquare,
      path: "/department/qc",
    },
    inventory: {
      title: "Inventory",
      icon: Boxes,
      path: "/department/inventory",
    },
    production: {
      title: "Production",
      icon: Factory,
      path: "/department/production",
    },
  };

  const getDepartmentRole = () => {
    const rawRole = user?.role?.toLowerCase() || "sales";
    
    // Handle role variations
    if (rawRole.includes("production")) return departmentModules.production;
    if (rawRole.includes("inventory")) return departmentModules.inventory;
    if (rawRole.includes("procurement")) return departmentModules.procurement;
    if (rawRole.includes("qc") || rawRole.includes("quality")) return departmentModules.qc;
    if (rawRole.includes("engineering") || rawRole.includes("design")) return departmentModules.engineering;
    if (rawRole.includes("sales")) return departmentModules.sales;
    
    // Check for "management" or "admin" roles
    if (rawRole.includes("admin") || rawRole.includes("management")) {
      // Admins see Sales/Root Cards by default in DepartmentLayout
      return departmentModules.sales;
    }
    
    return departmentModules[rawRole] || departmentModules.sales;
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getCurrentPageTitle = () => {
    const dept = getDepartmentRole();
    return dept.title;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-40">
        <div className="flex items-center text-xs justify-between h-full px-6">
          {/* Left side - Logo and mobile menu */}
          <div className="flex items-center text-xs">
            <button
              className="lg:hidden mr-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Menu size={20} />
            </button>
            <Link
              to={getDepartmentRole().path}
              className="flex items-center text-xs"
            >
              <img src="/logo.png" alt="Sterling ERP" className="h-8 w-auto" />
            </Link>
          </div>

          <div className="flex-1"></div>

          {/* Right side */}
          <div className="flex items-center text-xs space-x-4">
            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <div className="relative">
              <button
                className="flex items-center text-xs space-x-3 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center text-xs justify-center shadow-sm">
                  <span className="text-white font-bold text-base">
                    {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:flex flex-col items-start text-left leading-tight">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {user?.fullName || user?.username}
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold capitalize">
                    {user?.department || user?.role}
                  </span>
                </div>
                <ChevronDown size={14} className="text-slate-400 ml-1" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">
                      {user?.fullName || user?.username}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {user?.email}
                    </p>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center text-xs w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 z-30 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <button
              className="hidden lg:flex items-center text-xs justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Your Department */}
            {getDepartmentRole().title !== "Production" && (
              <div>
                <h6
                  className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ${
                    sidebarCollapsed ? "text-center" : ""
                  }`}
                >
                  {!sidebarCollapsed && "My Department"}
                </h6>
                <ul className="space-y-1">
                  {(() => {
                    const dept = getDepartmentRole();
                    const IconComponent = dept.icon;
                    return (
                      <li>
                        <Link
                          to={dept.path}
                          className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                            isActive(dept.path)
                              ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          <IconComponent size={18} className="flex-shrink-0" />
                          {!sidebarCollapsed && (
                            <span className="ml-3">{dept.title} Tasks</span>
                          )}
                        </Link>
                      </li>
                    );
                  })()}
                </ul>
              </div>
            )}

            {/* Design Drawings Menu - Only show for Engineering department */}
            {getDepartmentRole().title === "Engineering" && (
              <div>
                <h6
                  className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ${
                    sidebarCollapsed ? "text-center" : ""
                  }`}
                >
                  {!sidebarCollapsed && "Design Control"}
                </h6>
                <ul className="space-y-1">
                  <li>
                    <Link
                      to="/department/engineering/drawings"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/engineering/drawings")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <FileText size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Design Drawings</span>}
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {/* Production Flow Menu - Only show for Production department */}
            {getDepartmentRole().title === "Production" && (
              <div>
                <h6
                  className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ${
                    sidebarCollapsed ? "text-center" : ""
                  }`}
                >
                  {!sidebarCollapsed && "Production Flow"}
                </h6>
                <ul className="space-y-1">
                  <li>
                    <Link
                      to="/department/production"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/production")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Home size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Dashboard</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/production/root-cards"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/production/root-cards")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Zap size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Root Cards</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/production/design-drawings"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/production/design-drawings")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <FileCheck size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Design Drawings</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/production/material-requests"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/production/material-requests")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <ShoppingCart size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Material Requests</span>}
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {/* BOM Menu - Only show for Production department */}
            {getDepartmentRole().title === "Production" && (
              <div>
                <h6
                  className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ${
                    sidebarCollapsed ? "text-center" : ""
                  }`}
                >
                  {!sidebarCollapsed && "Bill of Materials"}
                </h6>
                <ul className="space-y-1">
                  <li>
                    <Link
                      to="/department/production/bom/create"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/production/bom/create")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <FileText size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Create BOM</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/production/bom/view"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/production/bom/view")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <BarChart3 size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">View BOMs</span>}
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {/* Production Flow Menu - Only show for Production department */}
            {getDepartmentRole().title === "Production" && (
              <div>
                <h6
                  className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ${
                    sidebarCollapsed ? "text-center" : ""
                  }`}
                >
                  {!sidebarCollapsed && "Production Flow"}
                </h6>
                <ul className="space-y-1">
                  <li>
                    <Link
                      to="/department/production/plans"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/production/plans")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <ClipboardList size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Production Plans</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/production/work-orders"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/production/work-orders")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <FileText size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Work Orders</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/production/job-cards"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/production/job-cards")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <ClipboardList size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Job Cards</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/production/workstations"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/production/workstations")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Monitor size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Workstations</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/production/workflow-tasks"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/production/workflow-tasks")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Zap size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Workflow Tasks</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/production/department-tasks"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/production/department-tasks")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <ClipboardList size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Department Tasks</span>}
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {/* Production Tools Menu - Only show for Production department */}
            {getDepartmentRole().title === "Production" && (
              <div className="hidden">
                {/* Hidden until needed */}
              </div>
            )}

            {/* Procurement Menu - Only show for Procurement department */}
            {getDepartmentRole().title === "Procurement" && (
              <div>
                <h6
                  className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ${
                    sidebarCollapsed ? "text-center" : ""
                  }`}
                >
                  {!sidebarCollapsed && "Procurement"}
                </h6>
                <ul className="space-y-1">
                  <li>
                    <Link
                      to="/department/procurement"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/procurement") || isActive("/department/procurement/dashboard")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Home size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Dashboard</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/procurement/root-cards"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/procurement/root-cards")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Layers size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Root Cards</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/procurement/material-requests"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/procurement/material-requests")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <ClipboardList size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Material Requests</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/procurement/quotations"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/procurement/quotations")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <FileText size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Quotations</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/procurement/purchase-orders"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/procurement/purchase-orders")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <ShoppingCart size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Purchase Orders</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/procurement/vendors"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/procurement/vendors")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Truck size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Vendors</span>}
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {/* Inventory Receiving & Quality Menu */}
            {getDepartmentRole().title === "Inventory" && (
              <div>
                <h6
                  className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ${
                    sidebarCollapsed ? "text-center" : ""
                  }`}
                >
                  {!sidebarCollapsed && "Receiving & Quality"}
                </h6>
                <ul className="space-y-1">
                  <li>
                    <Link
                      to="/department/inventory/purchase-orders"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/inventory/purchase-orders")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <ShoppingCart size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Purchase Orders</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/inventory/grn"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/inventory/grn")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <FileText size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">GRN</span>}
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {/* Inventory Stock Management Menu */}
            {getDepartmentRole().title === "Inventory" && (
              <div>
                <h6
                  className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ${
                    sidebarCollapsed ? "text-center" : ""
                  }`}
                >
                  {!sidebarCollapsed && "Stock Management"}
                </h6>
                <ul className="space-y-1">
                  <li>
                    <Link
                      to="/department/inventory/stock/entries"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/inventory/stock/entries")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <ClipboardList size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Stock Entries</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/inventory/stock/balance"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/inventory/stock/balance")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Package size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Stock Balance</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/department/inventory/stock/movements"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/inventory/stock/movements")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <RefreshCw size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Stock Movements</span>}
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            

            {/* Inventory Logistics & Tasks Menu */}
            {getDepartmentRole().title === "Inventory" && (
              <div>
                <h6
                  className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ${
                    sidebarCollapsed ? "text-center" : ""
                  }`}
                >
                  {!sidebarCollapsed && "Logistics & Tasks"}
                </h6>
                <ul className="space-y-1">
                  <li>
                    <Link
                      to="/department/inventory/department-tasks"
                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive("/department/inventory/department-tasks")
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      <ClipboardList size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && <span className="ml-3">Department Tasks</span>}
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <h6
                className={`text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ${
                  sidebarCollapsed ? "text-center" : ""
                }`}
              >
                {!sidebarCollapsed && "Quick Links"}
              </h6>
              <ul className="space-y-1">
                <li>
                  <Link
                    to="/notifications"
                    className="flex items-center text-xs px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <AlertCircle size={18} className="flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="ml-3">Notifications</span>
                    )}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Back to Admin (if admin) */}
            {user?.role?.toLowerCase() === "admin" && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <ul className="space-y-1">
                  <li>
                    <Link
                      to="/admin/dashboard"
                      className="flex items-center text-xs px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Home size={18} className="flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="ml-3">Admin Panel</span>
                      )}
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main
        style={{
          marginLeft: isDesktop ? (sidebarCollapsed ? '4rem' : '16rem') : '0',
          transition: 'margin-left 300ms ease-in-out'
        }}
        className="pt-16 min-h-[calc(100vh-4rem)]"
      >
        {/* Page Content */}
        <Outlet />
      </main>
    </div>
  );
};

export default DepartmentLayout;
