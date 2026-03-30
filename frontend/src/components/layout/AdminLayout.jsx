import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Shield,
  FileText,
  Activity,
  Settings,
  Home,
  Menu,
  Bell,
  User,
  LogOut,
  ChevronDown,
  BarChart3,
  ShoppingCart,
  CheckSquare,
} from "lucide-react";
import NotificationBell from "../common/NotificationBell";

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const menuItems = [
    {
      title: "Dashboard",
      path: "/admin/dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      title: "Root Cards",
      path: "/admin/root-cards",
      icon: ShoppingCart,
      badge: null,
    },
    {
      title: "Employee Management",
      path: "/admin/employee-management",
      icon: Users,
      badge: null,
    },
    {
      title: "Role Management",
      path: "/admin/roles",
      icon: Shield,
      badge: null,
    },
    {
      title: "Reports",
      path: "/admin/reports",
      icon: FileText,
      badge: null,
    },
    {
      title: "Accounts",
      path: "/accountant/dashboard",
      icon: BarChart3,
      badge: null,
    },
    {
      title: "Audit Logs",
      path: "/admin/audit-logs",
      icon: Activity,
      badge: null,
    },
    {
      title: "System Settings",
      path: "/admin/settings",
      icon: Settings,
      badge: null,
    },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getCurrentPageTitle = () => {
    const activeItem = menuItems.find((item) => isActive(item.path));
    return activeItem ? activeItem.title : "Admin Panel";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-40">
        <div className="flex items-center text-xs justify-between h-full px-6">
          {/* Left side - Logo and mobile menu */}
          <div className="flex items-center text-xs">
            <button
              className="lg:hidden mr-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Menu size={20} />
            </button>
            <Link to="/admin/dashboard" className="flex items-center text-xs">
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
                className="flex items-center text-xs space-x-3 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="w-9 h-9 bg-indigo-600 rounded flex items-center text-xs justify-center shadow-sm">
                  <span className="text-white  text-base">
                    {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:flex flex-col items-start text-left leading-tight">
                  <span className="text-sm  text-slate-900 dark:text-white">
                    {user?.fullName || user?.username}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-300 font-semibold capitalize">
                    {user?.role || "Admin"}
                  </span>
                </div>
                <ChevronDown size={14} className="text-slate-400 ml-1" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-indigo-600 rounded-t-lg">
                    <p className="text-sm  text-white">
                      {user?.fullName || user?.username}
                    </p>
                    <p className="text-[10px] font-medium text-indigo-100  tracking-wider">
                      {user?.email}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center text-xs p-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <User size={16} className="mr-2" />
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center text-xs p-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Settings size={16} className="mr-2" />
                    Settings
                  </Link>
                  <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center text-xs w-full p-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
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
              className="hidden lg:flex items-center text-xs justify-center w-8 h-8 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* Admin Section */}
            <div>
              <h6
                className={`text-xs font-semibold text-slate-500 dark:text-slate-400  tracking-wider mb-3 ${
                  sidebarCollapsed ? "text-center" : ""
                }`}
              >
                {!sidebarCollapsed && "Admin"}
              </h6>
              <ul className="space-y-1">
                {menuItems.map((item, idx) => {
                  const IconComponent = item.icon;
                  const hasSubmenu = item.submenu && item.submenu.length > 0;
                  const isExpanded = expandedSections[item.title];

                  return (
                    <li key={item.path || item.title}>
                      {hasSubmenu ? (
                        <>
                          <button
                            onClick={() => toggleSection(item.title)}
                            className={`w-full flex items-center text-xs px-3 py-2 text-xs font-medium rounded transition-colors ${
                              isExpanded
                                ? "bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            <IconComponent
                              size={18}
                              className="flex-shrink-0"
                            />
                            {!sidebarCollapsed && (
                              <>
                                <span className="ml-3 flex-1 text-left">
                                  {item.title}
                                </span>
                                <ChevronDown
                                  size={16}
                                  className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                />
                              </>
                            )}
                          </button>
                          {isExpanded && !sidebarCollapsed && (
                            <ul className="mt-1 ml-3 space-y-1 border-l border-slate-200 dark:border-slate-700 pl-3">
                              {item.submenu.map((subitem) => {
                                const SubIconComponent = subitem.icon;
                                return (
                                  <li key={subitem.path}>
                                    <Link
                                      to={subitem.path}
                                      className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded transition-colors ${
                                        isActive(subitem.path)
                                          ? "bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300"
                                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                      }`}
                                    >
                                      <SubIconComponent
                                        size={16}
                                        className="flex-shrink-0"
                                      />
                                      <span className="ml-3">
                                        {subitem.title}
                                      </span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </>
                      ) : (
                        <Link
                          to={item.path}
                          className={`flex items-center text-xs px-3 py-2 text-xs font-medium rounded transition-colors ${
                            isActive(item.path)
                              ? "bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          <IconComponent size={18} className="flex-shrink-0" />
                          {!sidebarCollapsed && (
                            <>
                              <span className="ml-3">{item.title}</span>
                              {item.badge && (
                                <span className="ml-auto bg-primary-600 text-white text-xs px-2 py-1 rounded ">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Back to App */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <ul className="space-y-1">
                <li>
                  <Link
                    to="/dashboard"
                    className="flex items-center text-xs px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Home size={18} className="flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="ml-3">Back to App</span>
                    )}
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300  ${
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        } pt-16`}
      >
        <div className="p-4">
          {/* Breadcrumbs */}
          <div className="">
            <nav className="  flex items-center text-xs space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <Link
                to="/admin/dashboard"
                className="hover: dark:hover: transition-colors"
              >
                Home
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-medium">
                {getCurrentPageTitle()}
              </span>
            </nav>
          </div>

          {/* Page Content */}
          <div className="space-y-2">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
