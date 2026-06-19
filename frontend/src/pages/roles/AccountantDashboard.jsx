import { useState, lazy, Suspense } from "react";
import { Link, Routes, Route, Navigate } from "react-router-dom";
import RoleDashboardLayout from "../../components/layout/RoleDashboardLayout";
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Loader2,
  Layers,
  Truck,
  CreditCard,
  Wallet,
  FileText,
  Activity,
  List,
  LayoutDashboard,
  ClipboardList,
  FolderOpen,
} from "lucide-react";

const PurchaseOrderPage = lazy(() => import("../inventory/PurchaseOrderPage"));
const UniversalRootCardsPage = lazy(() => import("../shared/UniversalRootCardsPage"));
const UniversalRootCardDetailPage = lazy(() => import("../shared/UniversalRootCardDetailPage"));
const OutsourcingChallansPage = lazy(() => import("../production/OutsourcingChallansPage"));
const DepartmentPortalTasksPage = lazy(() => import("../department/DepartmentPortalTasksPage"));

// Accounting Module Pages
const VendorInvoicesPage = lazy(() => import("../accounting/VendorInvoicesPage"));
const BillPaymentsPage = lazy(() => import("../accounting/BillPaymentsPage"));
const CustomerInvoicesPage = lazy(() => import("../accounting/CustomerInvoicesPage"));
const PaymentTrackingPage = lazy(() => import("../accounting/PaymentTrackingPage"));
const LedgerEntriesPage = lazy(() => import("../accounting/LedgerEntriesPage"));
const ProjectDocumentsPage = lazy(() => import("../accounting/ProjectDocumentsPage"));

const DashboardContent = ({ stats, dateRange, setDateRange, handleExport }) => (
  <div className="space-y-2 p-4">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-xl  text-slate-900 dark:text-white">
          Financial Dashboard
        </h1>
        <p className="text-slate-500 text-xs dark:text-slate-400 mt-1">
          Monitor financial performance and transactions
        </p>
      </div>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleExport}
          className="flex items-center text-xs gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors "
        >
          <TrendingUp size={15} />
          Export Report
        </button>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="p-2 bg-white dark:bg-slate-700 border text-xs border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white "
        >
          <option value="current-month">Current Month</option>
          <option value="last-quarter">Last Quarter</option>
          <option value="last-year">Last Year</option>
          <option value="ytd">Year to Date</option>
        </select>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2  transition-shadow"
          >
            <div className="flex items-center text-xs justify-between">
              <div>
                <p className="text-xs  text-slate-500 dark:text-slate-400">
                  {stat.title}
                </p>
                <p className="text-xl  text-slate-900 dark:text-white text-xs mt-2">
                  {stat.value}
                </p>
                <p
                  className={`text-sm mt-1  ${
                    stat.positive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stat.change}
                </p>
              </div>
              <Icon
                size={32}
                className={`${
                  stat.positive ? "text-green-600" : "text-red-600"
                } opacity-20`}
              />
            </div>
          </div>
        );
      })}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Quick Actions removed as they point to deleted routes */}
      
      {/* Keep Alerts for now as they are part of Dashboard view */}
      <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2">
        <h2 className="text-lg  text-slate-900 dark:text-white mb-4">
          Alerts
        </h2>
        <div className="space-y-3">
          <div className="flex gap-3 p-3 bg-red-50 dark:bg-red-900 rounded">
            <TrendingUp
              size={20}
              className="text-red-600 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className=" text-red-900 dark:text-red-200 text-sm">
                Outstanding Bills
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">
                5 bills pending payment
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-yellow-50 dark:bg-yellow-900 rounded">
            <TrendingUp
              size={20}
              className="text-yellow-600 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className=" text-yellow-900 dark:text-yellow-200 text-sm">
                Overdue Invoices
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                3 invoices overdue
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-900 rounded">
            <TrendingUp
              size={20}
              className="text-blue-600 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className=" text-blue-900 dark:text-blue-200 text-sm">
                Budget Alert
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Travel budget at 85%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AccountantDashboard = () => {
  const [dateRange, setDateRange] = useState("current-month");

  const navigationItems = [
    {
      title: "Dashboard",
      path: "/accountant/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Route Cards",
      path: "/accountant/root-cards",
      icon: Layers,
    },
    {
      title: "Purchase Orders",
      path: "/accountant/purchase-orders",
      icon: ShoppingCart,
    },
    {
      title: "Outsourcing Challans",
      path: "/accountant/challans",
      icon: Truck,
    },
    {
      title: "Accounts Payable",
      icon: CreditCard,
      submenu: [
        {
          title: "Vendor Invoices",
          path: "/accountant/payable/vendor-invoices",
          icon: FileText,
        },
        {
          title: "Bill Payments",
          path: "/accountant/payable/bill-payments",
          icon: Wallet,
        },
      ],
    },
    {
      title: "Accounts Receivable",
      icon: Activity,
      submenu: [
        {
          title: "Customer Invoices",
          path: "/accountant/receivable/customer-invoices",
          icon: FileText,
        },
        {
          title: "Payment Tracking",
          path: "/accountant/receivable/payment-tracking",
          icon: TrendingUp,
        },
      ],
    },
    {
      title: "General Ledger",
      icon: List,
      submenu: [
        {
          title: "Ledger Entries",
          path: "/accountant/ledger/entries",
          icon: FileText,
        },
      ],
    },
    {
      title: "Project Documents",
      path: "/accountant/project-documents",
      icon: FolderOpen,
    },
    {
      title: "Departmental Tasks",
      path: "/accountant/tasks",
      icon: ClipboardList,
    },
  ];

  const stats = [
    {
      title: "Total Receivable",
      value: "₹45,32,500",
      change: "+5.2%",
      positive: true,
      icon: TrendingUp,
    },
    {
      title: "Total Payable",
      value: "₹22,15,000",
      change: "+2.1%",
      positive: false,
      icon: TrendingUp,
    },
    {
      title: "Current Cash",
      value: "₹18,50,000",
      change: "+8.5%",
      positive: true,
      icon: TrendingUp,
    },
    {
      title: "Monthly Revenue",
      value: "₹95,43,000",
      change: "+12.3%",
      positive: true,
      icon: TrendingUp,
    },
  ];

  const handleExport = () => {
    alert("Exporting financial report...");
  };

  return (
    <RoleDashboardLayout
      roleNavigation={navigationItems}
      roleName="Accountant"
      roleIcon={BarChart3}
    >
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      }>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <DashboardContent
                stats={stats}
                dateRange={dateRange}
                setDateRange={setDateRange}
                handleExport={handleExport}
              />
            }
          />
          <Route
            path="/project-documents"
            element={<ProjectDocumentsPage />}
          />
          <Route
            path="/tasks"
            element={<DepartmentPortalTasksPage />}
          />
          
          {/* Accounts Payable */}
          <Route
            path="/payable/vendor-invoices"
            element={<VendorInvoicesPage />}
          />
          <Route
            path="/payable/bill-payments"
            element={<BillPaymentsPage />}
          />

          {/* Accounts Receivable */}
          <Route
            path="/receivable/customer-invoices"
            element={<CustomerInvoicesPage />}
          />
          <Route
            path="/receivable/payment-tracking"
            element={<PaymentTrackingPage />}
          />

          {/* General Ledger */}
          <Route
            path="/ledger/entries"
            element={<LedgerEntriesPage />}
          />

          <Route
            path="/purchase-orders"
            element={<PurchaseOrderPage isAccountantView={true} />}
          />
          <Route
            path="/root-cards"
            element={<UniversalRootCardsPage isAccountantView={true} />}
          />
          <Route
            path="/root-cards/:id"
            element={<UniversalRootCardDetailPage />}
          />
          <Route
            path="/challans"
            element={<OutsourcingChallansPage isAccountantView={true} />}
          />
          <Route
            path="/"
            element={<Navigate to="/accountant/dashboard" replace />}
          />
        </Routes>
      </Suspense>
    </RoleDashboardLayout>
  );
};

export default AccountantDashboard;
