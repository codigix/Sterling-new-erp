import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from '../../utils/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import DataTable from '../../components/ui/DataTable/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController,
  PieController,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Download,
  LayoutDashboard,
  Briefcase,
  Building2,
  Truck,
  Package,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Star,
  FileText,
  Calendar,
  Filter,
  FileSpreadsheet,
  Eye,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  DoughnutController,
  PieController
);

const ReportsAnalytics = () => {
  const [selectedReport, setSelectedReport] = useState('projects');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [reportData, setReportData] = useState({
    overview: {
      completedProjects: 0,
      onTimeDelivery: 0,
      totalRevenue: 0,
      activeAlerts: 0,
      monthlyTrends: [],
      departments: []
    },
    projects: { projects: [], selectedProject: null },
    departments: { tasks: [], summary: {} },
    vendors: [],
    inventory: {
      totalItems: 0,
      itemsReceived: 0,
      itemsIssued: 0,
      lowStockItems: 0,
      items: []
    },
    employees: [],
    'operator-logs': [],
    'project-manhours': []
  });
  const [loading, setLoading] = useState(false);
  const [employeeReportModalOpen, setEmployeeReportModalOpen] = useState(false);
  const [selectedEmployeeForReport, setSelectedEmployeeForReport] = useState(null);
  const [employeeWorkingHours, setEmployeeWorkingHours] = useState({ daily: [], total_hours: 0 });
  const [employeeReportLoading, setEmployeeReportLoading] = useState(false);
  const [employeeDateRange, setEmployeeDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [employeeDailyReports, setEmployeeDailyReports] = useState([]);
  const [employeeDailyReportsLoading, setEmployeeDailyReportsLoading] = useState(false);
  const [employeeModalTab, setEmployeeModalTab] = useState('working-hours');

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const [departments, setDepartments] = useState([]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await axios.get('/admin/departments');
      setDepartments(response.data || []);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleOpenEmployeeReport = (employee) => {
    setSelectedEmployeeForReport(employee);
    setEmployeeModalTab('working-hours');
    setEmployeeReportModalOpen(true);
  };
 
  const fetchWorkingHours = useCallback(async () => {
    if (!selectedEmployeeForReport) return;
    try {
      setEmployeeReportLoading(true);
      setEmployeeDailyReportsLoading(true);
      
      const [hoursRes, reportsRes] = await Promise.all([
        axios.get(`/reports/employees/${selectedEmployeeForReport.id}/working-hours`, {
          params: {
            start: employeeDateRange.start,
            end: employeeDateRange.end
          }
        }),
        axios.get(`/reports/employees/${selectedEmployeeForReport.id}/daily-reports`, {
          params: {
            start: employeeDateRange.start,
            end: employeeDateRange.end
          }
        })
      ]);
 
      setEmployeeWorkingHours(hoursRes.data);
      setEmployeeDailyReports(reportsRes.data || []);
    } catch (error) {
      console.error("Error fetching employee working hours and reports:", error);
    } finally {
      setEmployeeReportLoading(false);
      setEmployeeDailyReportsLoading(false);
    }
  }, [selectedEmployeeForReport, employeeDateRange]);
 
  useEffect(() => {
    if (employeeReportModalOpen) {
      fetchWorkingHours();
    }
  }, [employeeReportModalOpen, fetchWorkingHours]);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        start: dateRange.start,
        end: dateRange.end
      };
      if (selectedReport === 'projects') {
        params.projectId = selectedProjectId;
      }
      const response = await axios.get(`/reports/${selectedReport}`, { params });
      
      setReportData(prev => ({
        ...prev,
        [selectedReport]: response.data
      }));
    } catch (error) {
      console.error(`Error fetching ${selectedReport} report:`, error);
    } finally {
      setLoading(false);
    }
  }, [selectedReport, dateRange, selectedProjectId]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const departmentTaskColumns = [
    {
      key: 'task_code',
      label: 'Task Code',
      sortable: true,
      render: (value) => <span className="font-semibold text-slate-800">{value || '-'}</span>
    },
    {
      key: 'title',
      label: 'Task Title',
      sortable: true,
    },
    {
      key: 'department_name',
      label: 'Department',
      sortable: true,
      render: (value) => (
        <span className="capitalize">{value}</span>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
          value === 'High' ? 'bg-red-100 text-red-700' :
          value === 'Medium' ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'assignment_date',
      label: 'Assign Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
    },
    {
      key: 'due_date',
      label: 'Due Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
    },
    {
      key: 'completed_date',
      label: 'Completed Date',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
          value === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
          value === 'In Progress' ? 'bg-blue-100 text-blue-700' :
          value === 'Pending' ? 'bg-amber-100 text-amber-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'delay_days',
      label: 'Delay Status',
      sortable: true,
      render: (value, row) => {
        const isCompleted = row.status === 'Completed' || row.status === 'COMPLETED';
        if (value > 0) {
          return isCompleted ? (
            <span className="text-amber-600 font-semibold">{value} days delay</span>
          ) : (
            <span className="text-red-600 font-semibold">{value} days overdue</span>
          );
        }
        return <span className="text-emerald-600 font-medium">On Time</span>;
      }
    }
  ];

  const vendorColumns = [
    {
      key: 'name',
      label: 'Vendor Name',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-xs gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded  flex items-center text-xs justify-center flex-shrink-0">
            <span className="text-xs text-blue-600">{value.charAt(0)}</span>
          </div>
          <span className="">{value}</span>
        </div>
      ),
    },
    { key: 'totalOrders', label: 'Total Orders', sortable: true },
    {
      key: 'onTimeDelivery',
      label: 'On-Time Delivery',
      sortable: true,
      render: (value) => `${value}%`,
    },
    {
      key: 'qualityRating',
      label: 'Quality Rating',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-xs gap-1">
          <span className="text-xs text-slate-700 mr-1">{value}/5</span>
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
            />
          ))}
        </div>
      ),
    },
    {
      key: 'totalValue',
      label: 'Total Value',
      sortable: true,
      render: (value) => `₹${value.toLocaleString()}`,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1 rounded  text-xs ${
          value === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
          value === 'Good' ? 'bg-blue-100 text-blue-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {value}
        </span>
      ),
    },
  ];

  const inventoryColumns = [
    { key: 'code', label: 'Item Code', sortable: true },
    { key: 'description', label: 'Description', sortable: true },
    { key: 'currentStock', label: 'Current Stock', sortable: true },
    { key: 'minStock', label: 'Min. Stock', sortable: true },
    {
      key: 'lastMovement',
      label: 'Last Movement',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (_, row) => (
        <span className={`px-3 py-1 rounded  text-xs ${
          row.currentStock < row.minStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {row.currentStock < row.minStock ? 'Low Stock' : 'In Stock'}
        </span>
      ),
    },
  ];

  const employeeColumns = [
    {
      key: 'name',
      label: 'Department User',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center text-xs gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded  flex items-center text-xs justify-center flex-shrink-0">
            <span className="text-xs text-blue-600">{value.charAt(0)}</span>
          </div>
          <div>
            <p className="">{value}</p>
            <p className="text-xs text-slate-500">ID: {row.id}</p>
          </div>
        </div>
      ),
    },
    { key: 'department', label: 'Department', sortable: true },
    { 
      key: 'tasksCompleted', 
      label: 'Ad-hoc Tasks', 
      sortable: true,
      render: (_, row) => `${row.tasksCompleted || 0} / ${row.tasksTotal || 0}`
    },
    { 
      key: 'timelinesCompleted', 
      label: 'Project Stages', 
      sortable: true,
      render: (_, row) => row.timelinesTotal > 0 ? `${row.timelinesCompleted || 0} / ${row.timelinesTotal}` : '-'
    },
    { 
      key: 'projectOnTimeRate', 
      label: 'Project Completion On-Time', 
      sortable: true,
      render: (_, row) => {
        if (row.timelinesTotal === 0) return '-';
        const rate = row.timelinesCompleted > 0 ? Math.round((row.timelinesOnTime / row.timelinesCompleted) * 100) : 100;
        return `${rate}%`;
      }
    },
    {
      key: 'efficiency',
      label: 'Efficiency',
      sortable: true,
      render: (value) => `${value}%`,
    },
    {
      key: 'qualityScore',
      label: 'Quality Score',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-xs gap-1">
          <span className="text-xs text-slate-700 mr-1">{value}/5</span>
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
            />
          ))}
        </div>
      ),
    },
    {
      key: 'rating',
      label: 'Performance Rating',
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1 rounded  text-xs ${
          value >= 4.5 ? 'bg-emerald-100 text-emerald-700' :
          value >= 4 ? 'bg-blue-100 text-blue-700' :
          value >= 3 ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {value}/5
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => handleOpenEmployeeReport(row)}
          className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors cursor-pointer"
          title="View Employee Report"
        >
          <Eye className="w-4 h-4" />
        </button>
      )
    },
  ];

  const operatorLogsColumns = [
    {
      key: 'work_date',
      label: 'Date',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'operator_name',
      label: 'Operator',
      sortable: true,
    },
    {
      key: 'project_code',
      label: 'Project Code',
      sortable: true,
      render: (value, row) => value || `PRJ-${row.root_card_id}`,
    },
    {
      key: 'project_name',
      label: 'Project Name',
      sortable: true,
    },
    {
      key: 'operation_name',
      label: 'Operation',
      sortable: true,
    },
    {
      key: 'actual_hours',
      label: 'Hours',
      sortable: true,
      render: (value) => `${parseFloat(value || 0).toFixed(2)} hrs`,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
          value === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
          value === 'In Progress' ? 'bg-blue-100 text-blue-700' :
          value === 'Partially Completed' ? 'bg-sky-100 text-sky-700' :
          value === 'Delayed' ? 'bg-red-100 text-red-700' :
          value === 'On Hold' ? 'bg-rose-100 text-rose-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'remarks',
      label: 'Remarks',
      sortable: false,
      render: (value) => <span className="text-xs text-slate-500 max-w-[200px] truncate block" title={value}>{value || '-'}</span>
    }
  ];

  const projectManhoursColumns = [
    {
      key: 'project_code',
      label: 'Project Code',
      sortable: true,
      render: (value, row) => value || `PRJ-${row.root_card_id}`,
    },
    {
      key: 'project_name',
      label: 'Project Name',
      sortable: true,
    },
    {
      key: 'total_hours',
      label: 'Total Manhours',
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-blue-600">
          {parseFloat(value || 0).toFixed(2)} hrs
        </span>
      ),
    },
    {
      key: 'total_logs',
      label: 'Work Logs Count',
      sortable: true,
    },
    {
      key: 'project_status',
      label: 'Project Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
          value === 'Completed' || value === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
          value === 'Active' || value === 'PRODUCTION_IN_PROGRESS' || value === 'Production' ? 'bg-blue-100 text-blue-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {value}
        </span>
      ),
    },
  ];

  const projectTimelineSelectionColumns = [
    {
      key: 'project_code',
      label: 'Project Code',
      sortable: true,
      render: (value) => value || 'N/A',
    },
    {
      key: 'project_name',
      label: 'Project Name',
      sortable: true,
    },
    {
      key: 'hasTimelines',
      label: 'Timeline Configured',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
          value ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {value ? 'Active' : 'Not Set'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      render: (_, row) => (
        <button
          onClick={() => setSelectedProjectId(row.id)}
          className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-medium rounded transition-colors cursor-pointer"
        >
          View Timeline
        </button>
      ),
    },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleExportToExcel = () => {
    setExporting(true);
    setTimeout(() => {
      try {
        const exportData = filteredTasks.map((task) => {
          const isCompleted = task.status === 'Completed' || task.status === 'completed' || task.status === 'COMPLETED';
          let doneDate = 'N/A';
          if (isCompleted && (task.completed_date || task.updated_at)) {
            doneDate = formatDate(task.completed_date || task.updated_at);
          }

          let statusDetail = task.status || 'Pending';
          if (isCompleted) {
            const isLate = (task.delay_days || 0) > 0;
            if (isLate) {
              statusDetail = 'Completed (Delayed)';
            }
          } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(task.due_date);
            due.setHours(0, 0, 0, 0);
            const isOverdue = due < today;
            if (isOverdue) {
              statusDetail = 'Overdue';
            }
          }

          return {
            "Task ID": task.task_code || "",
            "Task Title": task.title || "",
            "Description": task.description || "",
            "Department": task.department_name || "",
            "Priority": task.priority || "Medium",
            "Assignment Date": formatDate(task.assignment_date),
            "Due Date": formatDate(task.due_date),
            "Completed Date": doneDate,
            "Status": statusDetail
          };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Departmental Tasks");
        XLSX.writeFile(wb, "Departmental_Tasks.xlsx");
      } catch (err) {
        console.error("Export to Excel error:", err);
      } finally {
        setExporting(false);
      }
    }, 800);
  };

  const filteredTasks = useMemo(() => {
    let tasks = reportData?.departments?.tasks || [];
    if (filterDepartment !== 'all') {
      tasks = tasks.filter(task => task.department_id.toString() === filterDepartment.toString());
    }
    if (filterStatus !== 'all') {
      tasks = tasks.filter(task => {
        const isCompleted = task.status === 'Completed' || task.status === 'COMPLETED';
        const delay = task.delay_days || 0;
        if (filterStatus === 'Completed') {
          return isCompleted && delay === 0;
        } else if (filterStatus === 'Completed (Delayed)') {
          return isCompleted && delay > 0;
        } else if (filterStatus === 'Overdue') {
          return !isCompleted && delay > 0;
        } else if (filterStatus === 'Pending') {
          return !isCompleted && delay === 0;
        }
        return true;
      });
    }
    if (startDateFilter || endDateFilter) {
      tasks = tasks.filter(task => {
        if (!task.assignment_date) return true;
        const taskAssignDate = task.assignment_date.split('T')[0];
        let matches = true;
        if (startDateFilter) {
          matches = matches && taskAssignDate >= startDateFilter;
        }
        if (endDateFilter) {
          matches = matches && taskAssignDate <= endDateFilter;
        }
        return matches;
      });
    }
    return tasks;
  }, [reportData?.departments?.tasks, filterDepartment, filterStatus, startDateFilter, endDateFilter]);

  const departmentSummaryTasks = useMemo(() => {
    let tasks = reportData?.departments?.tasks || [];
    if (filterDepartment !== 'all') {
      tasks = tasks.filter(task => task.department_id.toString() === filterDepartment.toString());
    }
    if (startDateFilter || endDateFilter) {
      tasks = tasks.filter(task => {
        if (!task.assignment_date) return true;
        const taskAssignDate = task.assignment_date.split('T')[0];
        let matches = true;
        if (startDateFilter) {
          matches = matches && taskAssignDate >= startDateFilter;
        }
        if (endDateFilter) {
          matches = matches && taskAssignDate <= endDateFilter;
        }
        return matches;
      });
    }
    return tasks;
  }, [reportData?.departments?.tasks, filterDepartment, startDateFilter, endDateFilter]);

  const departmentSummary = useMemo(() => {
    const tasks = departmentSummaryTasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed' || t.status === 'COMPLETED').length;
    const pendingTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
    const overdueTasks = tasks.filter(t => {
      const isCompleted = t.status === 'Completed' || t.status === 'COMPLETED';
      if (isCompleted) return false;
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return new Date(t.due_date) < today;
    }).length;
    
    const onTimeCompleted = tasks.filter(t => {
      const isCompleted = t.status === 'Completed' || t.status === 'COMPLETED';
      if (!isCompleted) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(23, 59, 59, 999);
      const completedDate = t.completed_date ? new Date(t.completed_date) : new Date(t.updated_at);
      return completedDate <= dueDate;
    }).length;

    const onTimeRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : 100;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      onTimeRate
    };
  }, [departmentSummaryTasks]);

  const filteredEmployees = useMemo(() => {
    let list = reportData?.employees || [];
    if (filterDepartment !== 'all') {
      list = list.filter(emp => {
        const empDept = (emp.department || '').toLowerCase().replace(/_/g, ' ').trim();
        const targetDept = departments.find(d => d.id.toString() === filterDepartment.toString());
        if (targetDept) {
          return empDept === targetDept.name.toLowerCase().replace(/_/g, ' ').trim();
        }
        return false;
      });
    }
    return list;
  }, [reportData?.employees, filterDepartment, departments]);

  const ratingDistribution = useMemo(() => {
    let excellent = 0;
    let good = 0;
    let average = 0;
    let needsImprovement = 0;

    filteredEmployees.forEach(emp => {
      const r = emp.rating || 0;
      if (r >= 4.5) excellent++;
      else if (r >= 4.0) good++;
      else if (r >= 3.0) average++;
      else needsImprovement++;
    });

    return { excellent, good, average, needsImprovement };
  }, [filteredEmployees]);

  const ratingChartData = {
    labels: ['Excellent (4.5+)', 'Good (4.0-4.4)', 'Average (3.0-3.9)', 'Needs Improvement (<3.0)'],
    datasets: [{
      data: [
        ratingDistribution.excellent,
        ratingDistribution.good,
        ratingDistribution.average,
        ratingDistribution.needsImprovement
      ],
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
      hoverBackgroundColor: ['#059669', '#2563eb', '#d97706', '#dc2626'],
      borderWidth: 1
    }]
  };

  const ratingChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          font: { size: 10 }
        }
      }
    }
  };

  const [exportingEmployees, setExportingEmployees] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingIndividualPDF, setExportingIndividualPDF] = useState(false);

  const handleExportEmployeesToExcel = () => {
    setExportingEmployees(true);
    setTimeout(() => {
      try {
        const exportData = filteredEmployees.map((emp) => {
          const onTimeRate = emp.timelinesTotal > 0
            ? `${emp.timelinesCompleted > 0 ? Math.round((emp.timelinesOnTime / emp.timelinesCompleted) * 100) : 100}%`
            : '-';
          return {
            "Employee ID": emp.id,
            "Employee Name": emp.name,
            "Department": emp.department || "N/A",
            "Designation": emp.designation || "N/A",
            "Ad-hoc Tasks (Completed/Total)": `${emp.tasksCompleted || 0} / ${emp.tasksTotal || 0}`,
            "Project Stages (Completed/Total)": emp.timelinesTotal > 0 ? `${emp.timelinesCompleted || 0} / ${emp.timelinesTotal}` : '-',
            "Project Stage On-Time Rate": onTimeRate,
            "Efficiency (%)": `${emp.efficiency}%`,
            "Quality Score": `${emp.qualityScore}/5`,
            "Performance Rating": `${emp.rating}/5`
          };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Department Users");
        XLSX.writeFile(wb, "Department_Users_Performance.xlsx");
      } catch (err) {
        console.error("Export Employees to Excel error:", err);
      } finally {
        setExportingEmployees(false);
      }
    }, 800);
  };

  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  };

  const handleExportEmployeesToPDF = () => {
    setExportingPDF(true);
    setTimeout(async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);

        const { excellent, good, average, needsImprovement } = ratingDistribution;

        const ctx = canvas.getContext('2d');
        const chart = new ChartJS(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Excellent (4.5+)', 'Good (4.0-4.4)', 'Average (3.0-3.9)', 'Needs Improvement (<3.0)'],
            datasets: [{
              data: [excellent, good, average, needsImprovement],
              backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
              borderWidth: 1
            }]
          },
          options: {
            responsive: false,
            animation: false,
            plugins: {
              legend: {
                display: true,
                position: 'right',
                labels: {
                  boxWidth: 12,
                  font: { size: 10 }
                }
              }
            }
          }
        });

        const chartImage = canvas.toDataURL('image/png');

        chart.destroy();
        document.body.removeChild(canvas);

        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Header with Logo
        try {
          const logo = await loadImage("/logo.png");
          doc.addImage(logo, "PNG", 15, 5, 21, 21);
        } catch (error) {
          console.warn("Logo not found or failed to load:", error);
        }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("STERLING TECHNO - SYSTEMS PVT. LTD.", 43, 13);
        doc.setFontSize(8);
        doc.setFont("Helvetica", "normal");
        doc.text("CIN NO: U29254PN2012PTC142669 | AN ISO 9001:2015 COMPANY", 43, 18);
        doc.setFont("Helvetica", "italic");
        doc.text("Transforming Ideas Into Reality With Trusted Engineering Solutions", 43, 23);

        // Corporate blue line
        doc.setDrawColor(30, 50, 140);
        doc.setLineWidth(1);
        doc.line(15, 27, 195, 27);

        // Document title & metadata
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text('DEPARTMENT USERS PERFORMANCE REPORT', 15, 34);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 140, 31);
        if (dateRange.start && dateRange.end) {
          doc.text(`Period: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`, 140, 35);
        }

        doc.setTextColor(30, 41, 59);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Performance Ratings Distribution', 15, 45);
        doc.addImage(chartImage, 'PNG', 15, 48, 80, 50);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Summary Metrics:', 110, 45);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Total Users: ${filteredEmployees.length}`, 110, 52);
        
        const avgEff = filteredEmployees.length > 0
          ? Math.round(filteredEmployees.reduce((sum, e) => sum + (e.efficiency || 0), 0) / filteredEmployees.length)
          : 100;
        doc.text(`Average Efficiency: ${avgEff}%`, 110, 58);

        const totalTimelinesTotal = filteredEmployees.reduce((sum, e) => sum + (e.timelinesTotal || 0), 0);
        const totalTimelinesOnTime = filteredEmployees.reduce((sum, e) => sum + (e.timelinesOnTime || 0), 0);
        const avgOnTime = totalTimelinesTotal > 0 ? Math.round((totalTimelinesOnTime / totalTimelinesTotal) * 100) : 100;
        doc.text('Project Stage On-Time Rate: ' + avgOnTime + '%', 110, 64);

        const tableData = filteredEmployees.map(emp => {
          const tasksStr = `${emp.tasksCompleted || 0} / ${emp.tasksTotal || 0}`;
          const stagesStr = emp.timelinesTotal > 0 ? `${emp.timelinesCompleted || 0} / ${emp.timelinesTotal}` : '-';
          const onTimeStr = emp.timelinesTotal > 0
            ? `${emp.timelinesCompleted > 0 ? Math.round((emp.timelinesOnTime / emp.timelinesCompleted) * 100) : 100}%`
            : '-';
          return [
            emp.name,
            emp.department || 'N/A',
            tasksStr,
            stagesStr,
            onTimeStr,
            `${emp.efficiency}%`,
            `${emp.qualityScore}/5`,
            `${emp.rating}/5`
          ];
        });

        doc.autoTable({
          startY: 105,
          head: [['User Name', 'Department', 'Ad-hoc Tasks', 'Proj Stages', 'On-Time Rate', 'Efficiency', 'Quality', 'Rating']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] }, // Blue 500
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 25 },
            2: { cellWidth: 20 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 15 },
            6: { cellWidth: 15 },
            7: { cellWidth: 15 }
          }
        });

        doc.save('Department_Users_Performance_Report.pdf');
      } catch (err) {
        console.error("Export to PDF error:", err);
      } finally {
        setExportingPDF(false);
      }
    }, 800);
  };

  const handleExportIndividualEmployeeReport = () => {
    if (!selectedEmployeeForReport) return;
    try {
      const isOperator = selectedEmployeeForReport.role === 'employee';

      const summaryData = [
        { Metric: "Employee Name", Value: selectedEmployeeForReport.name },
        { Metric: "Employee ID", Value: selectedEmployeeForReport.id },
        { Metric: "Department", Value: selectedEmployeeForReport.department },
        { Metric: "Designation", Value: selectedEmployeeForReport.designation },
        { Metric: "User Type", Value: isOperator ? "Operator" : "Department User" },
        { Metric: "Date Range From", Value: formatDate(employeeDateRange.start) },
        { Metric: "Date Range To", Value: formatDate(employeeDateRange.end) },
      ];

      if (isOperator) {
        summaryData.push(
          { Metric: "Total Working Hours", Value: employeeWorkingHours.total_hours || 0 },
          { Metric: "Total Productions Completed", Value: employeeWorkingHours.daily?.reduce((sum, day) => sum + (day.production_count || 0), 0) || 0 },
          { Metric: "Avg Hours / Day", Value: employeeWorkingHours.daily?.length > 0 ? (employeeWorkingHours.total_hours / employeeWorkingHours.daily.length).toFixed(1) : 0 }
        );
      } else {
        const rate = (employeeWorkingHours.timelinesCompleted || 0) > 0 
          ? `${Math.round(((employeeWorkingHours.timelinesOnTime || 0) / employeeWorkingHours.timelinesCompleted) * 100)}%` 
          : "100%";
        summaryData.push(
          { Metric: "Ad-hoc Tasks Assigned", Value: employeeWorkingHours.tasksTotal || 0 },
          { Metric: "Ad-hoc Tasks Completed", Value: employeeWorkingHours.tasksCompleted || 0 },
          { Metric: "Project Stages Assigned", Value: employeeWorkingHours.timelinesTotal || 0 },
          { Metric: "Project Stages Completed", Value: employeeWorkingHours.timelinesCompleted || 0 },
          { Metric: "Project Stage On-Time Rate (%)", Value: rate }
        );
      }

      const workingHoursData = (employeeWorkingHours.daily || []).map(day => ({
        "Date": formatDate(day.date),
        [isOperator ? "Working Hours" : "Estimated Hours"]: `${day.total_hours || 0} hrs`,
        [isOperator ? "Production Count" : "Tasks Completed"]: day.production_count || 0,
        "Status": isOperator ? ((day.total_hours || 0) > 8 ? "Overtime" : "Regular") : "N/A"
      }));

      const performanceData = (employeeDailyReports || []).map(rep => {
        const row = {
          "Date": formatDate(rep.work_date),
          [isOperator ? "Project Code" : "Task Code"]: rep.project_code || "N/A",
          [isOperator ? "Project Name" : "Task Title"]: rep.project_name || "N/A",
          [isOperator ? "Operation" : "Description"]: rep.operation_name || "N/A",
          "Status": rep.status || "Completed",
          "Delay Status": rep.delay_status || "On Time"
        };

        if (isOperator) {
          row["Quantity Completed"] = rep.qty_completed || 0;
          row["Scrap Quantity"] = rep.scrap_qty || 0;
          row["Hours Spent"] = `${rep.actual_hours || 0} hrs`;
        }

        return row;
      });

      const wb = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      if (isOperator) {
        const wsHours = XLSX.utils.json_to_sheet(workingHoursData);
        XLSX.utils.book_append_sheet(wb, wsHours, "Working Hours");
      }

      const wsPerf = XLSX.utils.json_to_sheet(performanceData);
      XLSX.utils.book_append_sheet(wb, wsPerf, isOperator ? "Project Performance" : "Tasks Performance");

      XLSX.writeFile(wb, `${selectedEmployeeForReport.name.replace(/\s+/g, '_')}_Performance_Report.xlsx`);
    } catch (err) {
      console.error("Export individual employee report error:", err);
    }
  };

  const handleExportIndividualEmployeeToPDF = () => {
    if (!selectedEmployeeForReport) return;
    setExportingIndividualPDF(true);
    setTimeout(async () => {
      try {
        const isOperator = selectedEmployeeForReport.role === 'employee';
        const doc = new jsPDF('p', 'mm', 'a4');

        // Header with Logo
        try {
          const logo = await loadImage("/logo.png");
          doc.addImage(logo, "PNG", 15, 5, 21, 21);
        } catch (error) {
          console.warn("Logo not found or failed to load:", error);
        }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("STERLING TECHNO - SYSTEMS PVT. LTD.", 43, 13);
        doc.setFontSize(8);
        doc.setFont("Helvetica", "normal");
        doc.text("CIN NO: U29254PN2012PTC142669 | AN ISO 9001:2015 COMPANY", 43, 18);
        doc.setFont("Helvetica", "italic");
        doc.text("Transforming Ideas Into Reality With Trusted Engineering Solutions", 43, 23);

        // Corporate blue line
        doc.setDrawColor(30, 50, 140);
        doc.setLineWidth(1);
        doc.line(15, 27, 195, 27);

        // Document title & metadata
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text('INDIVIDUAL PERFORMANCE REPORT', 15, 34);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 140, 31);
        doc.text(`Period: ${formatDate(employeeDateRange.start)} - ${formatDate(employeeDateRange.end)}`, 140, 35);

        // Employee Info Section
        doc.setTextColor(30, 41, 59);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Employee Information', 15, 45);

        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.line(15, 47, 195, 47);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Name:', 15, 53);
        doc.text('Employee ID:', 15, 59);
        doc.text('Department:', 110, 53);
        doc.text('Designation:', 110, 59);

        doc.setFont('Helvetica', 'normal');
        doc.text(selectedEmployeeForReport.name || 'N/A', 35, 53);
        doc.text(String(selectedEmployeeForReport.id || 'N/A'), 42, 59);
        doc.text(selectedEmployeeForReport.department || 'N/A', 132, 53);
        doc.text(selectedEmployeeForReport.designation || 'N/A', 132, 59);

        // Summary Statistics Section
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Summary Metrics', 15, 70);
        doc.line(15, 72, 195, 72);

        doc.setFontSize(9);
        if (isOperator) {
          doc.text('Total Working Hours:', 15, 78);
          doc.text('Total Productions Completed:', 15, 84);
          doc.text('Average Hours / Day:', 110, 78);

          doc.setFont('Helvetica', 'normal');
          doc.text(`${employeeWorkingHours.total_hours || 0} hrs`, 52, 78);
          const totalProd = employeeWorkingHours.daily?.reduce((sum, day) => sum + (day.production_count || 0), 0) || 0;
          doc.text(String(totalProd), 68, 84);
          const avgHours = employeeWorkingHours.daily?.length > 0 ? (employeeWorkingHours.total_hours / employeeWorkingHours.daily.length).toFixed(1) : 0;
          doc.text(`${avgHours} hrs`, 148, 78);
        } else {
          doc.text('Ad-hoc Tasks:', 15, 78);
          doc.text('Project Stages:', 15, 84);
          doc.text('Project Stage On-Time Rate:', 110, 78);

          doc.setFont('Helvetica', 'normal');
          doc.text(`${employeeWorkingHours.tasksCompleted || 0} / ${employeeWorkingHours.tasksTotal || 0} completed`, 42, 78);
          doc.text(`${employeeWorkingHours.timelinesCompleted || 0} / ${employeeWorkingHours.timelinesTotal || 0} completed`, 45, 84);
          const rate = (employeeWorkingHours.timelinesCompleted || 0) > 0 
            ? `${Math.round(((employeeWorkingHours.timelinesOnTime || 0) / employeeWorkingHours.timelinesCompleted) * 100)}%` 
            : "100%";
          doc.text(rate, 158, 78);
        }

        if (isOperator) {
          // Table 1: Daily Working Hours & Attendance
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(11);
          doc.text('Daily Working Hours & Attendance', 15, 95);

          const hoursHeaders = ['Date', 'Working Hours', 'Production Count', 'Status'];
          const hoursRows = (employeeWorkingHours.daily || []).map(day => [
            formatDate(day.date),
            `${day.total_hours || 0} hrs`,
            String(day.production_count || 0),
            (day.total_hours || 0) > 8 ? 'Overtime' : 'Regular'
          ]);

          doc.autoTable({
            startY: 98,
            head: [hoursHeaders],
            body: hoursRows,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }, // Blue 500
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 15, right: 15 }
          });

          // Table 2: Detailed Performance Logs
          const nextStartY = doc.lastAutoTable.finalY + 10;
          
          // Add new page if space is low
          if (nextStartY > 220) {
            doc.addPage();
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('Project & Production Performance', 15, 20);
            generatePerfTable(23);
          } else {
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('Project & Production Performance', 15, nextStartY - 3);
            generatePerfTable(nextStartY);
          }
        } else {
          // For department users, just draw the Performance Logs directly at 95
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(11);
          doc.text('Tasks Performance', 15, 95);
          generatePerfTable(98);
        }

        function generatePerfTable(startY) {
          const perfHeaders = ['Date', isOperator ? 'Project Code' : 'Task Code', isOperator ? 'Project Name' : 'Task Title', isOperator ? 'Operation' : 'Description'];
          if (isOperator) {
            perfHeaders.push('Qty', 'Scrap', 'Hours');
          }
          perfHeaders.push('Status', 'Delay Status');

          const perfRows = (employeeDailyReports || []).map(rep => {
            const row = [
              formatDate(rep.work_date),
              rep.project_code || 'N/A',
              rep.project_name || 'N/A',
              rep.operation_name || 'N/A'
            ];
            if (isOperator) {
              row.push(
                String(rep.qty_completed || 0),
                String(rep.scrap_qty || 0),
                `${rep.actual_hours || 0} hrs`
              );
            }
            row.push(
              rep.status || 'Completed',
              rep.delay_status || 'On Time'
            );
            return row;
          });

          doc.autoTable({
            startY: startY,
            head: [perfHeaders],
            body: perfRows,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }, // Blue 500
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 15, right: 15 }
          });
        }

        doc.save(`${selectedEmployeeForReport.name.replace(/\s+/g, '_')}_Performance_Report.pdf`);
      } catch (err) {
        console.error("Export individual employee to PDF error:", err);
      } finally {
        setExportingIndividualPDF(false);
      }
    }, 800);
  };

  const performanceColumns = [
    {
      key: 'work_date',
      label: 'Date',
      sortable: true,
      render: (val) => val ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
    },
    {
      key: 'project_code',
      label: selectedEmployeeForReport?.role === 'employee' ? 'Project Code' : 'Task Code',
      sortable: true,
      render: (val) => <span className="font-semibold text-slate-800">{val || '-'}</span>
    },
    {
      key: 'project_name',
      label: selectedEmployeeForReport?.role === 'employee' ? 'Project Name' : 'Task Title',
      sortable: true
    },
    {
      key: 'operation_name',
      label: selectedEmployeeForReport?.role === 'employee' ? 'Operation' : 'Description',
      sortable: false
    },
    ...(selectedEmployeeForReport?.role === 'employee' ? [
      {
        key: 'qty_completed',
        label: 'Qty Completed',
        sortable: true
      },
      {
        key: 'scrap_qty',
        label: 'Scrap Qty',
        sortable: true
      },
      {
        key: 'actual_hours',
        label: 'Hours Spent',
        sortable: true,
        render: (val) => `${parseFloat(val || 0).toFixed(2)} hrs`
      }
    ] : []),
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
          value === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
          value === 'In Progress' ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'delay_status',
      label: 'Delay Status',
      sortable: true,
      render: (value) => {
        if (value === 'Delayed') {
          return <span className="text-amber-600 font-semibold">Delayed</span>;
        } else if (value === 'Overdue') {
          return <span className="text-red-600 font-semibold">Overdue</span>;
        }
        return <span className="text-emerald-600 font-medium">On Time</span>;
      }
    }
  ];

  const reportTabs = [
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'operator-logs', label: 'Operator Logs', icon: FileText },
    { id: 'project-manhours', label: 'Project Manhours', icon: Clock },
    { id: 'employees', label: 'Department Users', icon: Users },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'vendors', label: 'Vendors', icon: Truck },
  ];

  return (
    <div className="w-full min-h-screen p-4 space-y-2">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl  ">Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1 text-left">
            Comprehensive insights into Sterling ERP operations
          </p>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div className="border-b border-slate-200 flex my-5 gap-8 overflow-x-auto">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedReport(tab.id);
                setSelectedProjectId('');
                setFilterDepartment('all');
                setFilterStatus('all');
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              className={`p-2  text-xs flex items-center text-xs gap-2 transition-all border-b-2 ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-500 text-sm">Loading report data...</p>
        </div>
      ) : (
        <>


      {selectedReport === 'projects' && (
        <div className="space-y-4">
          {selectedProjectId ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setSelectedProjectId('')}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer"
                >
                  <span>←</span> Back to Projects list
                </button>
              </div>

              {/* Project Summary Header */}
              <Card className="p-4 border border-slate-100 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Project Code</span>
                    <span className="text-sm font-medium text-slate-800 block mt-1">
                      {reportData.projects.selectedProject?.project_code || (reportData.projects.selectedProject?.id ? `PRJ-${reportData.projects.selectedProject.id}` : '')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Project Name</span>
                    <span className="text-sm font-medium text-slate-800 block mt-1">
                      {reportData.projects.selectedProject?.project_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Current Status</span>
                    <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-medium ${
                      reportData.projects.selectedProject?.project_status === 'Completed' || reportData.projects.selectedProject?.project_status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {reportData.projects.selectedProject?.project_status}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Department Table */}
              <Card className="border border-slate-100">
                <div className="border-b border-slate-100 pb-3 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Department Timeline Performance
                  </div>
                </div>
                <div className="p-2">
                  <DataTable
                    columns={[
                      {
                        key: 'department',
                        label: 'Department',
                        sortable: true,
                        render: (value) => (
                          <div className="font-medium text-slate-800 capitalize">
                            {value === 'Design' ? 'Design Engineer' : value}
                          </div>
                        )
                      },
                      {
                        key: 'startDate',
                        label: 'Assigned Date',
                        sortable: true,
                        render: (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
                      },
                      {
                        key: 'endDate',
                        label: 'Deadline Date',
                        sortable: true,
                        render: (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
                      },
                      {
                        key: 'completedDate',
                        label: 'Completed Date',
                        sortable: true,
                        render: (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
                      },
                      {
                        key: 'status',
                        label: 'Timeline Status',
                        sortable: true,
                        render: (value) => (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            value === 'Completed On Time' ? 'bg-emerald-100 text-emerald-700' :
                            value === 'Completed with Delay' ? 'bg-amber-100 text-amber-700' :
                            value === 'Pending (On Time)' ? 'bg-blue-100 text-blue-700' :
                            value === 'Overdue' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {value}
                          </span>
                        )
                      },
                      {
                        key: 'delayDays',
                        label: 'Delay Status',
                        sortable: true,
                        render: (value, row) => {
                          if (row.status === 'Completed with Delay') {
                            return <span className="text-amber-600 font-semibold">{value} days delay</span>;
                          } else if (row.status === 'Overdue') {
                            return <span className="text-red-600 font-semibold">{value} days overdue</span>;
                          }
                          return <span className="text-slate-400">-</span>;
                        }
                      }
                    ]}
                    data={reportData.projects?.selectedProject?.timelineReport || []}
                    striped={true}
                    hover={true}
                  />
                </div>
              </Card>
            </div>
          ) : (
            <div className="space-y-4 border border-slate-100 rounded p-4 bg-white">
              {/* Search and Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Project Timeline Performance</h3>
                  <p className="text-xs text-slate-500 font-normal">Select a project from the table below to view detailed timeline performance by department.</p>
                </div>
                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search project name or code..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal"
                  />
                </div>
              </div>

              {/* Projects Table */}
              <DataTable
                columns={projectTimelineSelectionColumns}
                data={(reportData.projects?.projects || []).filter(p => 
                  p.project_name.toLowerCase().includes(projectSearch.toLowerCase()) || 
                  (p.project_code || '').toLowerCase().includes(projectSearch.toLowerCase())
                )}
                striped={true}
                hover={true}
              />
            </div>
          )}
        </div>
      )}

      {selectedReport === 'departments' && (
        <Card className=" transition-shadow border border-slate-100">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center text-xs gap-2 text-lg">
              <div className="p-2 bg-blue-50 rounded">
                <Building2 className="w-3 h-3 text-blue-600" />
              </div>
              <span className='text-lg'>Departmental Tasks Performance Report</span>
            </div>
          </div>
          <div className="p-2 space-y-4">
            {/* Overview cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Tasks', value: departmentSummary?.totalTasks || 0, color: 'bg-blue-500', icon: FileText },
                { label: 'Completed Tasks', value: departmentSummary?.completedTasks || 0, color: 'bg-emerald-500', icon: CheckCircle2 },
                { label: 'Pending Tasks', value: departmentSummary?.pendingTasks || 0, color: 'bg-amber-500', icon: Clock },
                { label: 'Overdue Tasks', value: departmentSummary?.overdueTasks || 0, color: 'bg-red-500', icon: AlertTriangle },
                { label: 'On-Time Rate', value: `${departmentSummary?.onTimeRate || 0}%`, color: 'bg-indigo-500', icon: TrendingUp },
              ].map((metric, idx) => {
                const Icon = metric.icon;
                return (
                  <div key={idx} className={`${metric.color} text-white rounded p-4 text-center shadow-sm`}>
                    <Icon className="w-5 h-5 mx-auto mb-2 opacity-80" />
                    <p className="text-2xl font-bold mb-1">{metric.value}</p>
                    <p className="text-[10px] uppercase tracking-wider opacity-90">{metric.label}</p>
                  </div>
                );
              })}
            </div>

            <DataTable
              columns={departmentTaskColumns}
              data={filteredTasks}
              striped={true}
              hover={true}
              titleExtra={
                <div className="flex flex-wrap items-center gap-4">
                  {/* Department Filter */}
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-500">Department:</span>
                    <select
                      className="border border-slate-200 rounded p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm cursor-pointer hover:border-slate-300 transition-colors min-w-[150px]"
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                    >
                      <option value="all">All Departments</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Status:</span>
                    <select
                      className="border border-slate-200 rounded p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm cursor-pointer hover:border-slate-300 transition-colors min-w-[130px]"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Completed">Completed</option>
                      <option value="Completed (Delayed)">Completed (Delayed)</option>
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">From:</span>
                      <input
                        type="date"
                        className="border border-slate-200 rounded p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">To:</span>
                      <input
                        type="date"
                        className="border border-slate-200 rounded p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                      />
                    </div>
                    {(startDateFilter || endDateFilter) && (
                      <button
                        onClick={() => { setStartDateFilter(""); setEndDateFilter(""); }}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors ml-2 font-medium"
                      >
                        Clear Date
                      </button>
                    )}
                  </div>

                  {/* Export Button */}
                  <Button
                    onClick={handleExportToExcel}
                    variant="success"
                    loading={exporting}
                    className="flex items-center gap-2 text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors shadow-sm"
                  >
                    <FileSpreadsheet size={15} />
                    Export to Excel
                  </Button>
                </div>
              }
            />
          </div>
        </Card>
      )}

      {selectedReport === 'vendors' && (
        <Card className=" transition-shadow border border-slate-100">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center text-xs gap-2 text-lg">
              <div className="p-2 bg-blue-50 rounded">
                <Truck className="w-3 h-3 text-blue-600" />
              </div>
              <span>Vendor Performance Report</span>
            </div>
          </div>
          <div className="p-2">
            <DataTable
              columns={vendorColumns}
              data={reportData?.vendors || []}
              striped={true}
              hover={true}
            />
          </div>
        </Card>
      )}

      {selectedReport === 'inventory' && (
        <Card className=" transition-shadow border border-slate-100">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center text-xs gap-2 text-lg">
              <div className="p-2 bg-blue-50 rounded">
                <Package className="w-3 h-3 text-blue-600" />
              </div>
              <span>Inventory Movement Report</span>
            </div>
          </div>
          <div className="p-2 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Items', value: reportData?.inventory?.totalItems || 0, color: 'bg-blue-500', icon: Package },
                { label: 'Items Received', value: reportData?.inventory?.itemsReceived || 0, color: 'bg-emerald-500', icon: TrendingUp },
                { label: 'Items Issued', value: reportData?.inventory?.itemsIssued || 0, color: 'bg-amber-500', icon: TrendingUp },
                { label: 'Low Stock Alerts', value: reportData?.inventory?.lowStockItems || 0, color: 'bg-red-500', icon: AlertTriangle },
              ].map((metric, idx) => {
                const Icon = metric.icon;
                return (
                  <div key={idx} className={`${metric.color} text-white rounded p-6 text-center`}>
                    <Icon className="w-6 h-6 mx-auto mb-3 opacity-80" />
                    <p className="text-3xl  mb-1">{metric.value}</p>
                    <p className="text-xs opacity-90">{metric.label}</p>
                  </div>
                );
              })}
            </div>

            <DataTable
              columns={inventoryColumns}
              data={reportData?.inventory?.items || []}
              striped={true}
              hover={true}
            />
          </div>
        </Card>
      )}

      {selectedReport === 'employees' && (
        <Card className=" transition-shadow border border-slate-100">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center text-xs gap-2 text-lg">
              <div className="p-2 bg-blue-50 rounded">
                <Users className="w-3 h-3 text-blue-600" />
              </div>
              <span>Department Users Performance Report</span>
            </div>
          </div>
          <div className="p-2 space-y-6">
            {/* Overview Section with Stats and Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Left/Middle: Stat Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 flex flex-col justify-center items-center shadow-sm">
                  <Users className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-2xl font-bold text-slate-800">{filteredEmployees.length}</span>
                  <span className="text-xs text-slate-500 mt-1 uppercase font-semibold tracking-wider">Total Users</span>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-5 flex flex-col justify-center items-center shadow-sm">
                  <TrendingUp className="w-8 h-8 text-emerald-600 mb-2" />
                  <span className="text-2xl font-bold text-emerald-700">
                    {filteredEmployees.length > 0
                      ? Math.round(filteredEmployees.reduce((sum, e) => sum + (e.efficiency || 0), 0) / filteredEmployees.length)
                      : 100}%
                  </span>
                  <span className="text-xs text-emerald-600 mt-1 uppercase font-semibold tracking-wider">Avg Efficiency</span>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-5 flex flex-col justify-center items-center shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-indigo-600 mb-2" />
                  <span className="text-2xl font-bold text-indigo-700">
                    {(() => {
                      const totalStages = filteredEmployees.reduce((sum, e) => sum + (e.timelinesTotal || 0), 0);
                      const totalOnTime = filteredEmployees.reduce((sum, e) => sum + (e.timelinesOnTime || 0), 0);
                      return totalStages > 0 ? Math.round((totalOnTime / totalStages) * 100) : 100;
                    })()}%
                  </span>
                  <span className="text-xs text-indigo-600 mt-1 uppercase font-semibold tracking-wider">Project Stages On-Time</span>
                </div>
              </div>

              {/* Right: Doughnut Chart */}
              <div className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm flex flex-col">
                <span className="text-xs font-semibold text-slate-700 mb-3 block text-left">Ratings Distribution</span>
                <div className="relative h-[130px] w-full flex justify-center">
                  {filteredEmployees.length > 0 ? (
                    <Doughnut data={ratingChartData} options={ratingChartOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs font-normal">
                      No data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DataTable
              columns={employeeColumns}
              data={filteredEmployees}
              striped={true}
              hover={true}
              titleExtra={
                <div className="flex flex-wrap items-center gap-4">
                  {/* Department Filter */}
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-500">Department:</span>
                    <select
                      className="border border-slate-200 rounded p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm cursor-pointer hover:border-slate-300 transition-colors min-w-[150px]"
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                    >
                      <option value="all">All Departments</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">From:</span>
                      <input
                        type="date"
                        className="border border-slate-200 rounded p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">To:</span>
                      <input
                        type="date"
                        className="border border-slate-200 rounded p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Export PDF Button */}
                  <Button
                    onClick={handleExportEmployeesToPDF}
                    variant="primary"
                    loading={exportingPDF}
                    className="flex items-center gap-2 text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shadow-sm"
                  >
                    <Download size={15} />
                    Export to PDF
                  </Button>

                  {/* Export Excel Button */}
                  <Button
                    onClick={handleExportEmployeesToExcel}
                    variant="success"
                    loading={exportingEmployees}
                    className="flex items-center gap-2 text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors shadow-sm"
                  >
                    <FileSpreadsheet size={15} />
                    Export to Excel
                  </Button>
                </div>
              }
            />
          </div>
        </Card>
      )}

      {selectedReport === 'operator-logs' && (
        <Card className=" transition-shadow border border-slate-100">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center text-xs gap-2 text-lg">
              <div className="p-2 bg-blue-50 rounded">
                <FileText className="w-3 h-3 text-blue-600" />
              </div>
              <span>Operator Daily Work Logs Report</span>
            </div>
          </div>
          <div className="p-2">
            <DataTable
              columns={operatorLogsColumns}
              data={reportData?.['operator-logs'] || []}
              striped={true}
              hover={true}
            />
          </div>
        </Card>
      )}

      {selectedReport === 'project-manhours' && (
        <Card className=" transition-shadow border border-slate-100">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center text-xs gap-2 text-lg">
              <div className="p-2 bg-blue-50 rounded">
                <Clock className="w-3 h-3 text-blue-600" />
              </div>
              <span>Project Manhours Consumed Report</span>
            </div>
          </div>
          <div className="p-2">
            <DataTable
              columns={projectManhoursColumns}
              data={reportData?.['project-manhours'] || []}
              striped={true}
              hover={true}
            />
          </div>
        </Card>
      )}
    </>
  )}

      {/* Employee Working Hours Modal */}
      <Modal
        isOpen={employeeReportModalOpen}
        onClose={() => setEmployeeReportModalOpen(false)}
        title={`${selectedEmployeeForReport?.role === 'employee' ? 'Operator' : 'Department User'} Report - ${selectedEmployeeForReport?.name || ''}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center text-blue-600 text-xl ">
                {selectedEmployeeForReport?.name?.charAt(0)}
              </div>
              <div>
                <h3 className=" text-slate-800">{selectedEmployeeForReport?.name}</h3>
                <p className="text-xs text-slate-500">Dept: {selectedEmployeeForReport?.department} | ID: {selectedEmployeeForReport?.id}</p>
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] text-slate-500  ml-1 font-semibold uppercase tracking-wider">START DATE</label>
                <input
                  type="date"
                  value={employeeDateRange.start}
                  onChange={(e) => setEmployeeDateRange({ ...employeeDateRange, start: e.target.value })}
                  className="p-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[10px] text-slate-500  ml-1 font-semibold uppercase tracking-wider">END DATE</label>
                <input
                  type="date"
                  value={employeeDateRange.end}
                  onChange={(e) => setEmployeeDateRange({ ...employeeDateRange, end: e.target.value })}
                  className="p-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchWorkingHours}
                className="mt-5 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center justify-center h-8 w-8 cursor-pointer"
                title="Refresh Report"
              >
                <TrendingUp className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportIndividualEmployeeReport}
                className="mt-5 p-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer px-3 shadow-sm"
                title="Download Detailed Report"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Report</span>
              </button>
              <button
                onClick={handleExportIndividualEmployeeToPDF}
                disabled={exportingIndividualPDF}
                className="mt-5 p-1.5 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer px-3 shadow-sm"
                title="Download PDF Report"
              >
                <Download className="w-4 h-4" />
                <span>{exportingIndividualPDF ? 'Exporting...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>

          {selectedEmployeeForReport?.role === 'employee' ? (
            <>
              {/* Sub-tab selection */}
              <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6 text-xs font-semibold pb-1">
                <button
                  type="button"
                  onClick={() => setEmployeeModalTab('working-hours')}
                  className={`pb-2 border-b-2 transition-all focus:outline-none cursor-pointer ${
                    employeeModalTab === 'working-hours'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Working Hours & Attendance
                </button>
                <button
                  type="button"
                  onClick={() => setEmployeeModalTab('performance')}
                  className={`pb-2 border-b-2 transition-all focus:outline-none cursor-pointer ${
                    employeeModalTab === 'performance'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Project & Production Performance
                </button>
              </div>

              {employeeModalTab === 'working-hours' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded text-center">
                      <Clock className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                      <p className="text-2xl  text-emerald-700">{employeeWorkingHours.total_hours || 0}</p>
                      <p className="text-xs text-emerald-600 ">Total Working Hours</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded text-center">
                      <CheckCircle2 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl  text-blue-700">
                        {employeeWorkingHours.daily?.reduce((sum, day) => sum + (day.production_count || 0), 0) || 0}
                      </p>
                      <p className="text-xs text-blue-600 ">Total Productions</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded text-center">
                      <TrendingUp className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                      <p className="text-2xl  text-amber-700">
                        {employeeWorkingHours.daily?.length > 0
                          ? (employeeWorkingHours.total_hours / employeeWorkingHours.daily.length).toFixed(1)
                          : 0}
                      </p>
                      <p className="text-xs text-amber-600 ">Avg. Hours / Day</p>
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded overflow-hidden">
                    <DataTable
                      columns={[
                        { key: 'date', label: 'Date', sortable: true, render: (val) => new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                        { key: 'total_hours', label: 'Working Hours', sortable: true, render: (val) => `${val || 0} hrs` },
                        { key: 'production_count', label: 'Production Count', sortable: true },
                        {
                          key: 'status',
                          label: 'Status',
                          render: (_, row) => (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${row.total_hours > 8 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {row.total_hours > 8 ? 'Overtime' : 'Regular'}
                            </span>
                          )
                        }
                      ]}
                      data={employeeWorkingHours.daily || []}
                      striped={true}
                      loading={employeeReportLoading}
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-slate-100 rounded overflow-hidden">
                  <DataTable
                    columns={performanceColumns}
                    data={employeeDailyReports}
                    striped={true}
                    loading={employeeDailyReportsLoading}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {/* For department users, show summary metrics and performance log directly (no hours) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded text-center">
                  <Clock className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <p className="text-2xl  text-emerald-700">
                    {((employeeWorkingHours.timelinesCompleted || 0) > 0 
                      ? Math.round(((employeeWorkingHours.timelinesOnTime || 0) / employeeWorkingHours.timelinesCompleted) * 100) 
                      : 100)}%
                  </p>
                  <p className="text-xs text-emerald-600 ">Project Stage On-Time</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded text-center">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl  text-blue-700">
                    {employeeWorkingHours.tasksCompleted || 0} / {employeeWorkingHours.tasksTotal || 0}
                  </p>
                  <p className="text-xs text-blue-600 ">Ad-hoc Tasks (Done/Total)</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-4 rounded text-center">
                  <TrendingUp className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl  text-amber-700">
                    {employeeWorkingHours.timelinesCompleted || 0} / {employeeWorkingHours.timelinesTotal || 0}
                  </p>
                  <p className="text-xs text-amber-600 ">Project Stages (Done/Total)</p>
                </div>
              </div>

              <div className="border border-slate-100 rounded overflow-hidden">
                <DataTable
                  columns={performanceColumns}
                  data={employeeDailyReports}
                  striped={true}
                  loading={employeeDailyReportsLoading}
                />
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ReportsAnalytics;
