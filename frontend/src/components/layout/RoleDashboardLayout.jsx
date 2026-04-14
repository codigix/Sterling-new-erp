import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Menu,
  User,
  LogOut,
  ChevronDown,
  Home,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import NotificationBell from "../common/NotificationBell";
import "./RoleDashboardLayout.css";

const RoleDashboardLayout = ({
  roleNavigation,
  roleName,
  roleIcon: RoleIcon,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getCurrentPageTitle = () => {
    for (const section of roleNavigation) {
      if (section.path && isActive(section.path)) {
        return section.title;
      }
      if (section.submenu) {
        const subitem = section.submenu.find((item) => isActive(item.path));
        if (subitem) return subitem.title;
      }
    }
    return roleName;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-40">
        <div className="flex items-center text-xs justify-between h-full px-6">
          {/* Left side */}
          <div className="flex items-center text-xs">
            <button
              className="lg:hidden mr-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Menu size={20} />
            </button>
            <Link
              to={roleNavigation[0]?.path || "/"}
              className="flex items-center text-xs gap-2"
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
                className="flex items-center text-xs space-x-3 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="w-9 h-9 bg-blue-600 rounded flex items-center text-xs justify-center ">
                  <span className="text-white  text-base">
                    {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:flex flex-col items-start text-left leading-tight">
                  <span className="text-sm  text-slate-900 dark:text-white">
                    {user?.fullName || user?.username}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold capitalize">
                    {user?.department || user?.role || roleName}
                  </span>
                </div>
                <ChevronDown size={14} className="text-slate-400 ml-1" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded  border border-slate-200 dark:border-slate-700 py-1 z-50">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-blue-600 rounded-t-lg">
                    <p className="text-sm  text-white">
                      {user?.fullName || user?.username}
                    </p>
                    <p className="text-xs font-medium text-blue-100  tracking-wider">
                      {user?.email}
                    </p>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center text-xs w-full p-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <LogOut size={15} className="mr-2" />
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
            {/* Role Navigation */}
            <div>
              <h6
                className={`text-xs font-semibold text-slate-500 dark:text-slate-400  tracking-wider mb-3 ${
                  sidebarCollapsed ? "text-center" : ""
                }`}
              >
                {!sidebarCollapsed && roleName}
              </h6>
              <ul className="space-y-1">
                {roleNavigation.map((item) => {
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
                                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            <IconComponent
                              size={15}
                              className="flex-shrink-0"
                            />
                            {!sidebarCollapsed && (
                              <>
                                <span className="ml-3 flex-1 text-left">
                                  {item.title}
                                </span>
                                <ChevronDown
                                  size={15}
                                  className={`transition-transform ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
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
                                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                      }`}
                                    >
                                      <SubIconComponent
                                        size={15}
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
                              ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          }`}
                        >
                          <IconComponent size={15} className="flex-shrink-0" />
                          {!sidebarCollapsed && (
                            <span className="ml-3">{item.title}</span>
                          )}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 pt-16 min-h-screen bg-slate-50 dark:bg-slate-900 ${
          sidebarCollapsed ? "ml-16" : "ml-64"
        }`}
      >
        <div className="p-0">
          {/* Page Header */}

          {/* Page Content */}
          <div className="space-y-2">{children || <Outlet />}</div>
        </div>
      </main>
    </div>
  );
};

export default RoleDashboardLayout;
