import { useState, useEffect, lazy, Suspense } from "react";
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
  Bell,
  Trash2,
  Plus,
  Calendar,
  Mail,
  Info
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import axios from "../../utils/api";
import { toast } from "react-toastify";
import Modal, { ModalBody, ModalFooter } from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

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

const DashboardContent = ({ stats, dateRange, setDateRange, handleExport }) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [email, setEmail] = useState('');

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/accounting/reminders");
      if (response.data.success) {
        setReminders(response.data.reminders || []);
      }
    } catch (error) {
      console.error("Error fetching reminders:", error);
      toast.error("Failed to load reminders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!title || !reminderDate || !email) {
      toast.warning("Title, Date, and Email are required");
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post("/accounting/reminders", {
        title,
        description,
        reminder_date: reminderDate,
        email
      });

      if (response.data.success) {
        toast.success("Reminder set successfully");
        setModalOpen(false);
        // Reset form
        setTitle('');
        setDescription('');
        setReminderDate('');
        setEmail(user?.email || '');
        // Reload list
        fetchReminders();
      }
    } catch (error) {
      console.error("Error setting reminder:", error);
      toast.error(error.response?.data?.message || "Failed to set reminder");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReminder = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reminder?")) return;

    try {
      const response = await axios.delete(`/accounting/reminders/${id}`);
      if (response.data.success) {
        toast.success("Reminder deleted successfully");
        fetchReminders();
      }
    } catch (error) {
      console.error("Error deleting reminder:", error);
      toast.error("Failed to delete reminder");
    }
  };

  // Triggered reminders are those that have is_triggered = 1
  const activeAlerts = reminders.filter(r => r.is_triggered === 1);

  return (
    <div className="space-y-4 p-4 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Financial Dashboard
          </h1>
          <p className="text-slate-500 text-xs dark:text-slate-400 mt-1">
            Monitor financial performance and transactions
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center text-xs gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors cursor-pointer"
          >
            <TrendingUp size={15} />
            Export Report
          </button>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="p-2 bg-white dark:bg-slate-700 border text-xs border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white focus:outline-none"
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
              className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-4 transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {stat.title}
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                    {stat.value}
                  </p>
                  <p
                    className={`text-xs mt-1 font-semibold ${
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
        {/* Reminders List Table (2/3 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Scheduled Reminders
            </h2>
            <Button
              onClick={() => {
                setTitle('');
                setDescription('');
                setReminderDate('');
                setEmail(user?.email || '');
                setModalOpen(true);
              }}
              variant="primary"
              size="xs"
              icon={Plus}
            >
              Set Reminder
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
              <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No reminders set yet.</p>
              <p className="text-slate-400 text-xs mt-1">Set a reminder to receive email and dashboard alerts on configured dates.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="py-2 px-3">Title</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Reminder Date</th>
                    <th className="py-2 px-3">Email Target</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {reminders.map((reminder) => (
                    <tr key={reminder.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-950 dark:text-white">{reminder.title}</td>
                      <td className="py-2 px-3 max-w-[150px] truncate" title={reminder.description}>{reminder.description || '-'}</td>
                      <td className="py-2 px-3 font-mono font-medium">{reminder.reminder_date}</td>
                      <td className="py-2 px-3 text-slate-500">{reminder.email}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          reminder.is_triggered
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }`}>
                          {reminder.is_triggered ? 'Triggered' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleDeleteReminder(reminder.id)}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded transition-colors cursor-pointer"
                          title="Delete reminder"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alerts panel (1/3 col) */}
        <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <h2 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell size={18} className="text-red-500" />
            Alerts
          </h2>
          <div className="space-y-3 max-h-[350px] overflow-auto">
            {/* Custom Triggered Reminders */}
            {activeAlerts.map(alert => (
              <div key={alert.id} className="flex gap-3 p-3 bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 rounded text-left">
                <Bell size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-300 text-xs font-bold">
                    {alert.title}
                  </p>
                  <p className="text-[10px] text-red-700 dark:text-red-400 mt-0.5">
                    {alert.description || 'Scheduled reminder reached.'}
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                    Date: {alert.reminder_date} · Sent to: {alert.email}
                  </p>
                </div>
              </div>
            ))}

            {/* Static Alerts */}
            <div className="flex gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-500 rounded text-left">
              <TrendingUp
                size={20}
                className="text-yellow-600 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-300 text-xs font-bold">
                  Outstanding Bills
                </p>
                <p className="text-[10px] text-yellow-700 dark:text-yellow-400 mt-0.5">
                  5 bills pending payment
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded text-left">
              <TrendingUp
                size={20}
                className="text-amber-600 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-300 text-xs font-bold">
                  Overdue Invoices
                </p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                  3 invoices overdue
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 rounded text-left">
              <TrendingUp
                size={20}
                className="text-blue-600 flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-300 text-xs font-bold">
                  Budget Alert
                </p>
                <p className="text-[10px] text-blue-700 dark:text-blue-400 mt-0.5">
                  Travel budget at 85%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Set Reminder Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Set New Reminder"
        size="default"
      >
        <form onSubmit={handleAddReminder}>
          <ModalBody className="space-y-4">
            <Input
              label="Reminder Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GST Filing Deadline"
              required
            />
            <div className="space-y-1 mb-3">
              <label className="block text-xs font-semibold text-slate-750 mb-1 text-left dark:text-slate-300">
                Message / Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of the reminder..."
                className="w-full border border-slate-200 dark:border-slate-800 rounded p-2 text-xs placeholder-slate-400 dark:placeholder-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Reminder Date"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                required
              />
              <Input
                label="Notification Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. accountant@company.com"
                required
              />
            </div>
          </ModalBody>
          <ModalFooter className="flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
            >
              Save Reminder
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
};

const AccountantDashboard = () => {
  const [dateRange, setDateRange] = useState("current-month");
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await axios.get("/accounting/dashboard-stats");
      if (response.data.success) {
        setStatsData(response.data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

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
      value: statsData ? formatCurrency(statsData.receivable.value) : (statsLoading ? "Loading..." : "₹0"),
      change: statsData ? statsData.receivable.change : "0.0%",
      positive: statsData ? statsData.receivable.positive : true,
      icon: TrendingUp,
    },
    {
      title: "Total Payable",
      value: statsData ? formatCurrency(statsData.payable.value) : (statsLoading ? "Loading..." : "₹0"),
      change: statsData ? statsData.payable.change : "0.0%",
      positive: statsData ? statsData.payable.positive : false,
      icon: TrendingUp,
    },
    {
      title: "Current Cash",
      value: statsData ? formatCurrency(statsData.cash.value) : (statsLoading ? "Loading..." : "₹0"),
      change: statsData ? statsData.cash.change : "0.0%",
      positive: statsData ? statsData.cash.positive : true,
      icon: TrendingUp,
    },
    {
      title: "Monthly Revenue",
      value: statsData ? formatCurrency(statsData.revenue.value) : (statsLoading ? "Loading..." : "₹0"),
      change: statsData ? statsData.revenue.change : "0.0%",
      positive: statsData ? statsData.revenue.positive : true,
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
