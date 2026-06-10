import React, { useState, useEffect } from "react";
import axios from "../../utils/api";
import {
  ShoppingCart,
  FileText,
  Truck,
  AlertTriangle,
  ClipboardList,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import DashboardAlerts from "../../components/dashboard/DashboardAlerts";
import ProcurementPERTChart from "./components/ProcurementPERTChart";

const getTaskCounts = (taskList) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let completed = 0;
  let completedDelayed = 0;
  let pending = 0;
  let overdue = 0;

  taskList.forEach((t) => {
    const isCompleted = t.status === 'Completed' || t.status === 'completed';
    
    if (isCompleted) {
      // Check if completed late
      const finishedAt = t.completed_date || t.updated_at;
      if (t.due_date && finishedAt) {
        const due = new Date(t.due_date);
        due.setHours(0, 0, 0, 0);
        const completedDate = new Date(finishedAt);
        completedDate.setHours(0, 0, 0, 0);
        if (completedDate > due) {
          completedDelayed++;
        } else {
          completed++;
        }
      } else {
        completed++;
      }
    } else {
      // Pending or Overdue
      const hasDueDate = !!t.due_date;
      if (hasDueDate) {
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

  return { completed, completedDelayed, pending, overdue };
};

const ProcurementTasksPage = () => {
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [shortageRequests, setShortageRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Pagination states (5 items per page)
  const [prPage, setPrPage] = useState(1);
  const [poPage, setPoPage] = useState(1);
  const [shortagePage, setShortagePage] = useState(1);
  const itemsPerPage = 5;

  const fetchProcurementData = async () => {
    try {
      setLoading(true);
      setLoadingTasks(true);
      const [prRes, poRes, quotesRes, shortageRes, tasksRes] = await Promise.all([
        axios.get("/procurement/portal/purchase-requests"),
        axios.get("/procurement/portal/purchase-orders"),
        axios.get("/procurement/portal/quotes"),
        axios.get("/department/procurement/material-requests?type=shortage"),
        axios.get("/departmental-tasks/department/4"),
      ]);
      setPurchaseRequests(prRes.data.materialRequests || prRes.data.data || prRes.data || []);
      setPurchaseOrders(poRes.data.purchaseOrders || poRes.data || []);
      setQuotes(quotesRes.data.quotations || quotesRes.data || []);
      setShortageRequests(shortageRes.data.data || shortageRes.data || []);
      setTasks(tasksRes.data || []);
    } catch (err) {
      console.error("Fetch procurement error:", err);
    } finally {
      setLoading(false);
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchProcurementData();
  }, []);



  // Compile active data lists
  const pendingPRs = purchaseRequests.filter(
    (pr) => pr.status === "pending" || pr.status === "approved"
  );
  const activePOs = purchaseOrders.filter(
    (po) => po.status !== "fulfilled" && po.status !== "cancelled"
  );
  const activeShortages = shortageRequests.filter(
    (s) => s.status !== "received" && s.status !== "cancelled"
  );

  // Pagination math for PR Table
  const prTotalPages = Math.ceil(pendingPRs.length / itemsPerPage) || 1;
  const currentPRs = pendingPRs.slice((prPage - 1) * itemsPerPage, prPage * itemsPerPage);

  // Pagination math for PO Table
  const poTotalPages = Math.ceil(activePOs.length / itemsPerPage) || 1;
  const currentPOs = activePOs.slice((poPage - 1) * itemsPerPage, poPage * itemsPerPage);

  // Pagination math for Shortages Table
  const shortageTotalPages = Math.ceil(activeShortages.length / itemsPerPage) || 1;
  const currentShortages = activeShortages.slice((shortagePage - 1) * itemsPerPage, shortagePage * itemsPerPage);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
            <Clock size={12} /> Pending
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30">
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case "partially_received":
      case "partial":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30">
            <Truck size={12} /> Partial
          </span>
        );
      case "received":
      case "fulfilled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
            <CheckCircle2 size={12} /> Received
          </span>
        );
      case "cancelled":
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30">
            <XCircle size={12} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900/10 dark:text-slate-400 dark:border-slate-800">
            {status}
          </span>
        );
    }
  };

  const getPOStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "draft":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Draft
          </span>
        );
      case "submitted":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
            Submitted
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
            Approved
          </span>
        );
      case "goods arrival":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 font-semibold">
            Goods Arrival
          </span>
        );
      case "sent to inventory":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30">
            Sent to Inventory
          </span>
        );
      case "fulfilled":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
            Fulfilled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-600 dark:bg-slate-900/10 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 min-h-screen">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 animate-pulse text-sm">Loading procurement overview data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl text-slate-900 dark:text-white">Procurement Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Monitor pending purchase requests, vendor quote evaluations, and shortage tracking
          </p>
        </div>
        <div>
          <button
            onClick={fetchProcurementData}
            className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-xs group shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
            Refresh
          </button>
        </div>
      </div>

      <DashboardAlerts />

      <div className="mt-4">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Departmental Task Count
        </h2>
      </div>

      {/* Metrics Stat Cards (Departmental Tasks) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {/* Pending Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {loadingTasks ? <Loader2 className="animate-spin text-slate-400" size={20} /> : getTaskCounts(tasks).pending}
              </h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
              <Clock size={20} />
            </div>
          </div>
        </div>

        {/* Completed Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed On-Time</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {loadingTasks ? <Loader2 className="animate-spin text-slate-400" size={20} /> : getTaskCounts(tasks).completed}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        {/* Completed Delayed Card */}
        <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed (Delayed)</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {loadingTasks ? <Loader2 className="animate-spin text-slate-400" size={20} /> : getTaskCounts(tasks).completedDelayed}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 transition-colors">
              <AlertCircle size={20} />
            </div>
          </div>
        </div>

        {/* Overdue Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Overdue Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                {loadingTasks ? <Loader2 className="animate-spin text-slate-400" size={20} /> : getTaskCounts(tasks).overdue}
              </h3>
            </div>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 transition-colors">
              <AlertCircle size={20} className={getTaskCounts(tasks).overdue > 0 ? "animate-pulse" : ""} />
            </div>
          </div>
        </div>
      </div>

      <ProcurementPERTChart />

      {/* ── Pending Purchase Requests Table ── */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded border border-slate-200 dark:border-slate-700 mt-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-500" />
            Pending Purchase Requests
          </h3>
          {pendingPRs.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded font-medium">
              Awaiting Action: {pendingPRs.length}
            </span>
          )}
        </div>

        {pendingPRs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/10 rounded border border-dashed border-slate-200 dark:border-slate-800">
            <ClipboardList size={32} className="mx-auto mb-2 text-slate-350 dark:text-slate-650" />
            <p className="text-sm font-medium">No pending purchase requests</p>
            <p className="text-xs text-slate-400 mt-1">All incoming requests from production have been processed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/30">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Request No</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project / Route Card</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Request Date</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-850">
                  {currentPRs.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono text-xs">
                          {pr.request_number}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col max-w-xs md:max-w-md">
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {pr.project_name || "Direct Material Request"}
                          </span>
                          {pr.bom_number && (
                            <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              BOM: {pr.bom_number}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <Clock size={12} className="text-blue-500 shrink-0" />
                          {new Date(pr.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStatusBadge(pr.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {prTotalPages > 1 && (
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{((prPage - 1) * itemsPerPage) + 1}</strong> to <strong className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(prPage * itemsPerPage, pendingPRs.length)}</strong> of <strong className="font-semibold text-slate-800 dark:text-slate-200">{pendingPRs.length}</strong> requests
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPrPage((prev) => Math.max(prev - 1, 1))}
                    disabled={prPage === 1}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: prTotalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setPrPage(pageNum)}
                      className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${
                        prPage === pageNum
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    onClick={() => setPrPage((prev) => Math.min(prev + 1, prTotalPages))}
                    disabled={prPage === prTotalPages}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Active Purchase Orders Tracking ── */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded border border-slate-200 dark:border-slate-700 mt-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart size={18} className="text-indigo-500" />
            Active Purchase Orders
          </h3>
          {activePOs.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded font-medium">
              In-Process: {activePOs.length}
            </span>
          )}
        </div>

        {activePOs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/10 rounded border border-dashed border-slate-200 dark:border-slate-800">
            <ShoppingCart size={32} className="mx-auto mb-2 text-slate-350 dark:text-slate-650" />
            <p className="text-sm font-medium">No active purchase orders</p>
            <p className="text-xs text-slate-400 mt-1">All orders have been completed and delivered.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/30">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">PO Number</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project Name</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supplier Name</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order Date</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Value</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-850">
                  {currentPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                          {po.po_number}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {po.root_card_project_name || "Direct Purchase Order"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {po.vendor_name || "Direct Procurement"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {new Date(po.order_date || po.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          ₹{Number(po.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getPOStatusBadge(po.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {poTotalPages > 1 && (
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{((poPage - 1) * itemsPerPage) + 1}</strong> to <strong className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(poPage * itemsPerPage, activePOs.length)}</strong> of <strong className="font-semibold text-slate-800 dark:text-slate-200">{activePOs.length}</strong> orders
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPoPage((prev) => Math.max(prev - 1, 1))}
                    disabled={poPage === 1}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: poTotalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setPoPage(pageNum)}
                      className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${
                        poPage === pageNum
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    onClick={() => setPoPage((prev) => Math.min(prev + 1, poTotalPages))}
                    disabled={poPage === poTotalPages}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Critical Material Shortages Queue ── */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded border border-slate-200 dark:border-slate-700 mt-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-500" />
            Critical Material Shortages
          </h3>
          {activeShortages.length > 0 && (
            <span className="text-xs text-rose-650 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-0.5 rounded font-bold border border-rose-100/30">
              Shortages: {activeShortages.length}
            </span>
          )}
        </div>

        {activeShortages.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/10 rounded border border-dashed border-slate-200 dark:border-slate-800">
            <AlertTriangle size={32} className="mx-auto mb-2 text-slate-400 dark:text-slate-600" />
            <p className="text-sm font-medium">No material shortage alerts</p>
            <p className="text-xs text-slate-400 mt-1">All material stock balances are sufficient.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/30">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Alert No</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project Name</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reported Date</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-850">
                  {currentShortages.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono text-xs animate-pulse">
                          {s.request_number}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {s.project_name || "Stock Reorder Level"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {new Date(s.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400">
                          Shortage Flagged
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {shortageTotalPages > 1 && (
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{((shortagePage - 1) * itemsPerPage) + 1}</strong> to <strong className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(shortagePage * itemsPerPage, activeShortages.length)}</strong> of <strong className="font-semibold text-slate-800 dark:text-slate-200">{activeShortages.length}</strong> alerts
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShortagePage((prev) => Math.max(prev - 1, 1))}
                    disabled={shortagePage === 1}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: shortageTotalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setShortagePage(pageNum)}
                      className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${
                        shortagePage === pageNum
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    onClick={() => setShortagePage((prev) => Math.min(prev + 1, shortageTotalPages))}
                    disabled={shortagePage === shortageTotalPages}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default ProcurementTasksPage;