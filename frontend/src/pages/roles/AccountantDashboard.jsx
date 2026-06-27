import { useState, useEffect, useMemo, lazy, Suspense } from "react";
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
  Eye,
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
import DataTable from "../../components/ui/DataTable/DataTable";

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
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);

  const formatDateDMY = (dateStr) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [email, setEmail] = useState('');
  const [recurrence, setRecurrence] = useState('once');
  const [recurrenceDay, setRecurrenceDay] = useState('1');
  const [recurrenceMonth, setRecurrenceMonth] = useState('1');

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
    if (!title || !email) {
      toast.warning("Title and Email are required");
      return;
    }
    if (recurrence === 'once' && !reminderDate) {
      toast.warning("Reminder Date is required");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title,
        description,
        email,
        recurrence,
        recurrence_day: recurrence !== 'once' ? parseInt(recurrenceDay) : undefined,
        recurrence_month: recurrence === 'yearly' ? parseInt(recurrenceMonth) : undefined,
        reminder_date: recurrence === 'once' ? reminderDate : undefined
      };

      const response = await axios.post("/accounting/reminders", payload);

      if (response.data.success) {
        toast.success("Reminder set successfully");
        setModalOpen(false);
        // Reset form
        setTitle('');
        setDescription('');
        setReminderDate('');
        setEmail(user?.email || '');
        setRecurrence('once');
        setRecurrenceDay('1');
        setRecurrenceMonth('1');
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
  const columns = useMemo(() => [
    {
      key: "title",
      label: "Title",
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-slate-950 dark:text-white text-xs">
          {value}
        </span>
      ),
    },
    {
      key: "recurrence",
      label: "Recurrence",
      sortable: true,
      render: (value, row) => {
        const getRecurrenceText = (r) => {
          if (!r.recurrence || r.recurrence === 'once') return 'One-Time';
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const getOrdinal = (n) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
          };
          if (r.recurrence === 'monthly') return `Monthly (${getOrdinal(r.recurrence_day)})`;
          if (r.recurrence === 'yearly') {
            const mName = monthNames[r.recurrence_month - 1] || '';
            return `Yearly (${mName} ${getOrdinal(r.recurrence_day)})`;
          }
          return 'One-Time';
        };
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium inline-block ${
            row.recurrence === 'monthly' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' :
            row.recurrence === 'yearly' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400' :
            'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400'
          }`}>
            {getRecurrenceText(row)}
          </span>
        );
      },
    },
    {
      key: "reminder_date",
      label: "Next Trigger Date",
      sortable: true,
      render: (value) => (
        <span className="font-mono font-medium text-xs text-slate-750 dark:text-slate-200">
          {formatDateDMY(value)}
        </span>
      ),
    },
    {
      key: "is_triggered",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
          value
            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
        }`}>
          {value ? 'Triggered' : 'Pending'}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => {
              setSelectedReminder(row);
              setViewModalOpen(true);
            }}
            className="p-1 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
            title="View details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => handleDeleteReminder(value)}
            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
            title="Delete reminder"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [reminders]);

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
                setRecurrence('once');
                setRecurrenceDay('1');
                setRecurrenceMonth('1');
                setModalOpen(true);
              }}
              variant="primary"
              size="xs"
              icon={Plus}
            >
              Set Reminder
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={reminders}
            loading={loading}
            sortable={true}
            striped={true}
            hover={true}
            showSearch={true}
            searchPlaceholder="Search reminders..."
            emptyMessage="No reminders set yet. Set a reminder to receive email and dashboard alerts on configured dates."
            pagination={true}
            pageSize={5}
            pageSizeOptions={[5, 10, 25]}
            className="border-none bg-transparent"
          />
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
                    Date: {formatDateDMY(alert.reminder_date)} · Sent to: {alert.email}
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
              <div className="flex flex-col gap-1 text-left">
                <label className="block text-xs font-semibold text-slate-750 mb-1 dark:text-slate-300">
                  Recurrence
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded p-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 h-9"
                >
                  <option value="once">One-Time</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <Input
                label="Notification Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. accountant@company.com"
                required
              />
            </div>

            {/* Recurrence Specific Inputs */}
            {recurrence === 'once' && (
              <Input
                label="Reminder Date"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                required
              />
            )}

            {recurrence === 'monthly' && (
              <div className="flex flex-col gap-1 text-left">
                <label className="block text-xs font-semibold text-slate-750 mb-1 dark:text-slate-300">
                  Day of Month
                </label>
                <select
                  value={recurrenceDay}
                  onChange={(e) => setRecurrenceDay(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 rounded p-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 h-9"
                >
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {recurrence === 'yearly' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 text-left">
                  <label className="block text-xs font-semibold text-slate-750 mb-1 dark:text-slate-300">
                    Month
                  </label>
                  <select
                    value={recurrenceMonth}
                    onChange={(e) => setRecurrenceMonth(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded p-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 h-9"
                  >
                    {[
                      { val: '1', name: 'January' },
                      { val: '2', name: 'February' },
                      { val: '3', name: 'March' },
                      { val: '4', name: 'April' },
                      { val: '5', name: 'May' },
                      { val: '6', name: 'June' },
                      { val: '7', name: 'July' },
                      { val: '8', name: 'August' },
                      { val: '9', name: 'September' },
                      { val: '10', name: 'October' },
                      { val: '11', name: 'November' },
                      { val: '12', name: 'December' }
                    ].map(m => (
                      <option key={m.val} value={m.val}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1 text-left">
                  <label className="block text-xs font-semibold text-slate-750 mb-1 dark:text-slate-300">
                    Day of Month
                  </label>
                  <select
                    value={recurrenceDay}
                    onChange={(e) => setRecurrenceDay(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 rounded p-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 h-9"
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
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

      {/* View Reminder Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedReminder(null);
        }}
        title="Reminder Details"
        size="default"
      >
        {selectedReminder && (
          <>
            <ModalBody className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-400 font-medium">Title</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                    {selectedReminder.title}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-400 font-medium">Status</span>
                  <p className="mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                      selectedReminder.is_triggered
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {selectedReminder.is_triggered ? 'Triggered' : 'Pending'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-700/50">
                <span className="text-[10px] text-slate-400 font-medium">Message / Description</span>
                <p className="text-xs text-slate-750 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                  {selectedReminder.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-400 font-medium">Recurrence</span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                    {(() => {
                      const r = selectedReminder;
                      if (!r.recurrence || r.recurrence === 'once') return 'One-Time';
                      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      const getOrdinal = (n) => {
                        const s = ["th", "st", "nd", "rd"];
                        const v = n % 100;
                        return n + (s[(v - 20) % 10] || s[v] || s[0]);
                      };
                      if (r.recurrence === 'monthly') return `Monthly (${getOrdinal(r.recurrence_day)})`;
                      if (r.recurrence === 'yearly') {
                        const mName = monthNames[r.recurrence_month - 1] || '';
                        return `Yearly (${mName} ${getOrdinal(r.recurrence_day)})`;
                      }
                      return 'One-Time';
                    })()}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-400 font-medium">Next Trigger Date</span>
                  <p className="text-xs font-mono font-medium text-slate-900 dark:text-white mt-1">
                    {formatDateDMY(selectedReminder.reminder_date)}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-700/50">
                <span className="text-[10px] text-slate-400 font-medium">Notification Email Target</span>
                <p className="text-xs font-medium text-slate-900 dark:text-white mt-1">
                  {selectedReminder.email}
                </p>
              </div>
            </ModalBody>
            <ModalFooter className="flex justify-end bg-slate-50 dark:bg-slate-900/50">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setViewModalOpen(false);
                  setSelectedReminder(null);
                }}
              >
                Close
              </Button>
            </ModalFooter>
          </>
        )}
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
