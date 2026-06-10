import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "../../utils/api";
import { Loader2, Clock, Users, ChevronRight, ChevronLeft, Target, ShieldCheck, ClipboardList, CheckCircle2, AlertCircle } from "lucide-react";
import ProductionPERTChart from "./components/ProductionPERTChart";

const formatTime = (timeStr) => {
  if (!timeStr) return "N/A";
  try {
    if (timeStr.length === 5 || timeStr.length === 8) {
      const parts = timeStr.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      return `${formattedHours}:${minutes} ${ampm}`;
    }
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return timeStr;
  }
};

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

const ProductionDashboard = () => {
  // Today's Operator Assignments State
  const [todayAssignments, setTodayAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // QC Handover Queue State
  const [qcTasks, setQcTasks] = useState([]);
  const [loadingQc, setLoadingQc] = useState(true);
  const [qcCurrentPage, setQcCurrentPage] = useState(1);

  // Department Tasks State
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const fetchTodayAssignments = useCallback(async () => {
    try {
      setLoadingAssignments(true);
      const response = await axios.get('/production/today-assignments');
      if (response.data && response.data.success) {
        setTodayAssignments(response.data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching today assignments:', error);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  const fetchQcTasks = useCallback(async () => {
    try {
      setLoadingQc(true);
      const response = await axios.get('/qc/tasks');
      setQcTasks(response.data.tasks || response.data || []);
    } catch (error) {
      console.error('Error fetching quality tasks:', error);
    } finally {
      setLoadingQc(false);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const response = await axios.get('/departmental-tasks/department/3');
      setTasks(response.data || []);
    } catch (error) {
      console.error('Error fetching departmental tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayAssignments();
    fetchQcTasks();
    fetchTasks();
  }, [fetchTodayAssignments, fetchQcTasks, fetchTasks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [todayAssignments]);

  useEffect(() => {
    setQcCurrentPage(1);
  }, [qcTasks]);

  // Pagination for assignments
  const itemsPerPage = 5;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAssignments = todayAssignments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(todayAssignments.length / itemsPerPage);

  // Pagination for QC Queue
  const qcItemsPerPage = 5;
  const qcIndexOfLastItem = qcCurrentPage * qcItemsPerPage;
  const qcIndexOfFirstItem = qcIndexOfLastItem - qcItemsPerPage;
  const currentQcTasks = qcTasks.slice(qcIndexOfFirstItem, qcIndexOfLastItem);
  const qcTotalPages = Math.ceil(qcTasks.length / qcItemsPerPage);

  const taskCounts = getTaskCounts(tasks);

  return (
    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-xl text-slate-900 dark:text-white">Production Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Monitor active project stages, operator scheduling, and QC queue progress.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/department/production/tasks" className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors flex items-center gap-1">
            <Target size={12} /> Tasks
          </Link>
        </div>
      </div>

      {/* Departmental Tasks Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
        {/* Pending Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {loadingTasks ? <Loader2 className="animate-spin text-slate-400" size={20} /> : taskCounts.pending}
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
                {loadingTasks ? <Loader2 className="animate-spin text-slate-400" size={20} /> : taskCounts.completed}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        {/* Completed Delayed Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed (Delayed)</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {loadingTasks ? <Loader2 className="animate-spin text-slate-400" size={20} /> : taskCounts.completedDelayed}
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
                {loadingTasks ? <Loader2 className="animate-spin text-slate-400" size={20} /> : taskCounts.overdue}
              </h3>
            </div>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 transition-colors">
              <AlertCircle size={20} className="animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Production Department PERT Chart */}
      <ProductionPERTChart />

      {/* Today's Operator Assignments */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded border border-slate-200 dark:border-slate-700 mt-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-blue-500" />
            Today's Operator Assignments
          </h3>
          {todayAssignments.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded font-medium">
              Total: {todayAssignments.length}
            </span>
          )}
        </div>

        {loadingAssignments ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="animate-spin text-slate-400" size={24} />
          </div>
        ) : todayAssignments.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/10 rounded border border-dashed border-slate-200 dark:border-slate-800">
            <Users size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-medium">No operators assigned for today</p>
            <p className="text-xs text-slate-400 mt-1">Create a daily production plan to assign tasks to operators.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/30">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Operator</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Operation</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Schedule</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-850">
                  {currentAssignments.map((assign) => (
                    <tr key={assign.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-tight">
                            {assign.operator_name || "Unassigned Operator"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100/30 dark:border-blue-900/30">
                          {assign.operation_name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col max-w-xs md:max-w-md">
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {assign.project_name || "N/A"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Code: {assign.project_code || assign.root_card_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                            <Clock size={12} className="text-blue-500 shrink-0" />
                            {formatTime(assign.start_time)} - {formatTime(assign.end_time)}
                          </span>
                          {assign.total_hours && (
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Duration: <strong className="text-slate-600 dark:text-slate-350">{assign.total_hours} hrs</strong>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                          assign.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' :
                          assign.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30' :
                          assign.status === 'Rejected' ? 'bg-rose-50 text-rose-750 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30' :
                          'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                        }`}>
                          {assign.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{indexOfFirstItem + 1}</strong> to <strong className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(indexOfLastItem, todayAssignments.length)}</strong> of <strong className="font-semibold text-slate-800 dark:text-slate-200">{todayAssignments.length}</strong> assignments
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${
                        currentPage === pageNum
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
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

      {/* QC Handover Queue */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded border border-slate-200 dark:border-slate-700 mt-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList size={18} className="text-indigo-500" />
            QC Handover Queue
          </h3>
          {qcTasks.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded font-medium">
              Total: {qcTasks.length}
            </span>
          )}
        </div>

        {loadingQc ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="animate-spin text-slate-400" size={24} />
          </div>
        ) : qcTasks.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/10 rounded border border-dashed border-slate-200 dark:border-slate-800">
            <ShieldCheck size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-medium">All projects clear of QC handovers</p>
            <p className="text-xs text-slate-400 mt-1">There are no pending fabrication or final quality inspection handovers.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/30">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">QC Phase</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tests Approved</th>
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Inspection Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-850">
                  {currentQcTasks.map((task) => {
                    const isPhase1 = task.current_phase === 1;
                    const isApproved = isPhase1 
                      ? ['DIMENSIONAL_QC_APPROVED', 'PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED', 'send to production for complete final produciton', 'final Prodcution completed and send to quality for final qc', 'Redy for Dispatch'].includes(task.status)
                      : ['PHASE_2_QC_APPROVED', 'Redy for Dispatch'].includes(task.status);
                    
                    return (
                      <tr key={task.task_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col max-w-xs md:max-w-md">
                            <span className="text-xs font-semibold text-slate-850 dark:text-slate-200">
                              {task.project_name || "Unnamed Project"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {task.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            task.current_phase === 2
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-100/30 dark:border-purple-900/30'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100/30 dark:border-blue-900/30'
                          }`}>
                            Phase {task.current_phase}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-700 dark:text-slate-350 font-medium">
                              {task.approved_tests} of {task.total_tests} approved
                            </span>
                            {task.total_tests > 0 && (
                              <div className="w-16 bg-slate-100 dark:bg-slate-750 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-1.5 rounded-full" 
                                  style={{ width: `${(task.approved_tests / task.total_tests) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                            isApproved 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                              : 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                          }`}>
                            {isApproved ? 'QC Approved' : 'Awaiting Inspection'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {qcTotalPages > 1 && (
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Showing <strong className="font-semibold text-slate-800 dark:text-slate-200">{qcIndexOfFirstItem + 1}</strong> to <strong className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(qcIndexOfLastItem, qcTasks.length)}</strong> of <strong className="font-semibold text-slate-800 dark:text-slate-200">{qcTasks.length}</strong> inspects
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQcCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={qcCurrentPage === 1}
                    className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: qcTotalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setQcCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${
                        qcCurrentPage === pageNum
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    onClick={() => setQcCurrentPage((prev) => Math.min(prev + 1, qcTotalPages))}
                    disabled={qcCurrentPage === qcTotalPages}
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

export default ProductionDashboard;
