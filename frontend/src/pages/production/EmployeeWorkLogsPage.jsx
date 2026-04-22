import React, { useState, useEffect, useCallback } from "react";
import axios from "../../utils/api";
import { 
  Users, 
  Search, 
  Calendar, 
  Loader2, 
  Clock, 
  Briefcase,
  Target,
  ChevronRight,
  ArrowLeft,
  Filter,
  X,
  TrendingUp,
  History
} from "lucide-react";
import DataTable from "../../components/ui/DataTable/DataTable";

const EmployeeWorkLogsPage = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [workLogs, setWorkLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [projectSearchTerm, setProjectSearchTerm] = useState("");

  const from24h = (timeStr) => {
    if (!timeStr) return { time: "", period: "AM" };
    try {
      let [hours, minutes] = timeStr.split(':');
      hours = parseInt(hours);
      const period = hours >= 12 ? "PM" : "AM";
      let h12 = hours % 12;
      if (h12 === 0) h12 = 12;
      return {
        time: `${h12.toString().padStart(2, '0')}:${minutes}`,
        period
      };
    } catch (e) {
      return { time: timeStr, period: "AM" };
    }
  };

  const format12h = (timeStr) => {
    if (!timeStr) return "";
    const { time, period } = from24h(timeStr);
    return `${time} ${period}`;
  };

  // Fetch summary of all employees
  const fetchEmployeesSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get("/production/labor/employees-summary");
      if (response.data.success) {
        // Ensure total_hours and total_projects are numbers to avoid string concatenation
        const processedEmployees = response.data.employees.map(emp => ({
          ...emp,
          total_hours: parseFloat(emp.total_hours) || 0,
          total_projects: parseInt(emp.total_projects) || 0
        }));
        setEmployees(processedEmployees);
      }
    } catch (error) {
      console.error("Error fetching employee summary:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch detailed logs for a specific employee
  const fetchEmployeeDetails = async (employee) => {
    try {
      setLoadingDetails(true);
      setSelectedEmployee(employee);
      const response = await axios.get(`/production/labor/employee/${employee.id}/logs`);
      if (response.data.success) {
        setWorkLogs(response.data.logs);
      }
    } catch (error) {
      console.error("Error fetching employee details:", error);
      setWorkLogs([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchEmployeesSummary();
  }, [fetchEmployeesSummary]);

  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWorkLogs = workLogs.filter(log => {
    const matchesProject = log.project_name?.toLowerCase().includes(projectSearchTerm.toLowerCase()) || 
                          log.root_card_id?.toLowerCase().includes(projectSearchTerm.toLowerCase());
    const matchesDate = !dateFilter || log.work_date === dateFilter;
    return matchesProject && matchesDate;
  });

  const employeeColumns = [
    {
      header: "Employee Name",
      accessor: "name",
      render: (value) => (
        <span className="text-xs text-slate-900 dark:text-white">{value}</span>
      ),
    },
    {
      header: "Projects Worked",
      accessor: "total_projects",
      align: "center",
      render: (value) => (
        <span className="p-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-400">
          {value} Projects
        </span>
      ),
    },
    {
      header: "Total Hours",
      accessor: "total_hours",
      align: "center",
      render: (value) => (
        <span className="text-xs text-slate-900 dark:text-white">{value} hrs</span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      align: "center",
      render: (value) => (
        <span
          className={`p-1 rounded-full text-xs ${
            value === "Active"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      header: "Action",
      align: "right",
      render: (_, emp) => (
        <button
          onClick={() => fetchEmployeeDetails(emp)}
          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      ),
    },
  ];

  const renderEmployeeList = () => (
    <div className="space-y-6 p-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="bg-white p-2 flex items-center gap-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded">
            <Users size={15} />
          </div>
          <div>
            <p className="text-xs text-slate-500  tracking-wider ">Total Operators</p>
            <p className="text-xl  text-slate-900 dark:text-white">{employees.length}</p>
          </div>
        </div>
        <div className="bg-white p-2 flex items-center gap-2">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded">
            <Clock size={15} />
          </div>
          <div>
            <p className="text-xs text-slate-500  tracking-wider ">Total Man-Hours</p>
            <p className="text-xl  text-slate-900 dark:text-white">
              {employees.reduce((acc, curr) => acc + (curr.total_hours || 0), 0).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="bg-white p-2 flex items-center gap-2">
          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded">
            <Briefcase size={15} />
          </div>
          <div>
            <p className="text-xs text-slate-500  tracking-wider ">Avg. Hours/Emp</p>
            <p className="text-xl  text-slate-900 dark:text-white">
              {employees.length > 0 ? Math.round(employees.reduce((acc, curr) => acc + (curr.total_hours || 0), 0) / employees.length) : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <DataTable
        columns={employeeColumns}
        data={employees}
        loading={loading}
        searchPlaceholder="SEARCH EMPLOYEES..."
      />
    </div>
  );

  const workLogColumns = [
    {
      header: "Date",
      accessor: "work_date",
      render: (value) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      header: "Project / Root Card",
      accessor: "project_name",
      render: (_, log) => (
        <div className="flex items-center gap-2">
          <Target size={14} className="text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-sm text-slate-900 dark:text-white">{log.project_name}</p>
            <p className="text-xs text-slate-400 font-mono">{log.root_card_id}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Operation",
      accessor: "operation_name",
      render: (value) => (
        <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-1 rounded border border-blue-100 dark:border-blue-900/30">
          {value}
        </span>
      ),
    },
    {
      header: "Start Time",
      accessor: "start_time",
      align: "center",
      render: (value) => (
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <Clock size={12} className="text-emerald-500" />
          {format12h(value)}
        </div>
      ),
    },
    {
      header: "End Time",
      accessor: "end_time",
      align: "center",
      render: (value) => (
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <Clock size={12} className="text-rose-500" />
          {format12h(value)}
        </div>
      ),
    },
    {
      header: "Total Hours",
      accessor: "actual_hours",
      align: "center",
      render: (value) => (
        <span className="text-sm text-slate-900 dark:text-white">{value} hrs</span>
      ),
    },
  ];

  const renderEmployeeDetails = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <button 
        onClick={() => setSelectedEmployee(null)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={15} />
        <span className="text-sm">Back to Employee List</span>
      </button>

      <div className=" p-2 rounded  flex flex-col md:flex-row justify-between items-start  gap-6">
        <div className="flex items-center gap-2">
          
          <div>
            <h2 className="text-xl  text-slate-900 dark:text-white">{selectedEmployee.name}</h2>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <TrendingUp size={12} className="text-emerald-500" />
              Total Contribution: {selectedEmployee.total_hours} Man-Hours
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded text-center min-w-[100px]">
            <p className="text-xs text-slate-400  ">Projects</p>
            <p className="text-lg  text-slate-900 dark:text-white">{selectedEmployee.total_projects}</p>
          </div>
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded text-center min-w-[100px]">
            <p className="text-xs text-slate-400  ">Total Hours</p>
            <p className="text-lg  text-slate-900 dark:text-white">{selectedEmployee.total_hours}</p>
          </div>
        </div>
      </div>

      <div className=" dark:border-slate-800  overflow-hidden">
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-2">
          <h3 className="text-sm  text-slate-900 dark:text-white flex items-center gap-2">
            <History size={15} className="text-blue-500" />
            Detailed Work History
          </h3>
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="date" 
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DataTable
          columns={workLogColumns}
          data={filteredWorkLogs}
          loading={loadingDetails}
          searchPlaceholder="Search Project / Root Card..."
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      {/* Header */}
      <div className=" mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
         
          <div>
            <h1 className="text-xl  text-slate-900 dark:text-white">Employee Work Logs</h1>
            <p className="text-xs text-slate-500 mt-1">Track labor distribution and man-hours per project</p>
          </div>
        </div>
        {!selectedEmployee && (
          <button 
            onClick={fetchEmployeesSummary}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
            Refresh Data
          </button>
        )}
      </div>

      <div className=" mx-auto">
        {!selectedEmployee ? renderEmployeeList() : renderEmployeeDetails()}
      </div>
    </div>
  );
};

export default EmployeeWorkLogsPage;
