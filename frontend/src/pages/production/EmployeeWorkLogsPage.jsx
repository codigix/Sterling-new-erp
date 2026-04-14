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

  const renderEmployeeList = () => (
    <div className="space-y-6 p-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className=" flex items-center gap-2">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500  tracking-wider ">Total Operators</p>
            <p className="text-xl  text-slate-900 dark:text-white">{employees.length}</p>
          </div>
        </div>
        <div className=" flex items-center gap-2">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500  tracking-wider ">Total Man-Hours</p>
            <p className="text-xl  text-slate-900 dark:text-white">
              {employees.reduce((acc, curr) => acc + (curr.total_hours || 0), 0).toFixed(2)}
            </p>
          </div>
        </div>
        <div className=" flex items-center gap-2">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded">
            <Briefcase size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500  tracking-wider ">Avg. Hours/Emp</p>
            <p className="text-xl  text-slate-900 dark:text-white">
              {employees.length > 0 ? Math.round(employees.reduce((acc, curr) => acc + (curr.total_hours || 0), 0) / employees.length) : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="">
        <div className="relative border border-slate-200 rounded">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input 
            type="text" 
            placeholder="SEARCH EMPLOYEES..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800  overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse bg-white">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-2 text-xs text-slate-400 ">Employee Name</th>
                <th className="p-2 text-xs text-slate-400  text-center">Projects Worked</th>
                <th className="p-2 text-xs text-slate-400  text-center">Total Hours</th>
                <th className="p-2 text-xs text-slate-400  text-center">Status</th>
                <th className="p-2 text-xs text-slate-400  text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center">
                    <p className="text-xs text-slate-400">Loading employees...</p>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-xs text-slate-400">No employees found</td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-2">
                      <div className="flex items-center gap-3">
                        
                        <span className="text-xs  text-slate-900 dark:text-white">{emp.name}</span>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <span className="p-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-400">
                        {emp.total_projects} Projects
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <span className="text-xs  text-slate-900 dark:text-white">{emp.total_hours} hrs</span>
                    </td>
                    <td className="p-2 text-center">
                      <span className={`p-1 rounded-full text-xs   ${
                        emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <button 
                        onClick={() => fetchEmployeeDetails(emp)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

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
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search Project / Root Card..." 
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
                value={projectSearchTerm}
                onChange={(e) => setProjectSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="date" 
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left bg-white border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-2 text-xs text-slate-400 ">Date</th>
                <th className="p-2 text-xs text-slate-400 ">Project / Root Card</th>
                <th className="p-2 text-xs text-slate-400 ">Operation</th>
                <th className="p-2 text-xs text-slate-400  text-center">Start Time</th>
                <th className="p-2 text-xs text-slate-400  text-center">End Time</th>
                <th className="p-2 text-xs text-slate-400  text-center">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingDetails ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    <Loader2 size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Loading work logs...</p>
                  </td>
                </tr>
              ) : filteredWorkLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-xs text-slate-400">No work history found for this employee</td>
                </tr>
              ) : (
                filteredWorkLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-2 text-xs text-slate-600 dark:text-slate-400">
                      {new Date(log.work_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Target size={14} className="text-blue-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm  text-slate-900 dark:text-white">{log.project_name}</p>
                          <p className="text-xs text-slate-400 font-mono">{log.root_card_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-1 rounded border border-blue-100 dark:border-blue-900/30">
                        {log.operation_name}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Clock size={12} className="text-emerald-500" />
                        {format12h(log.start_time)}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Clock size={12} className="text-rose-500" />
                        {format12h(log.end_time)}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <span className="text-sm  text-slate-900 dark:text-white">{log.actual_hours} hrs</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
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

      <div className="max-w-7xl mx-auto">
        {!selectedEmployee ? renderEmployeeList() : renderEmployeeDetails()}
      </div>
    </div>
  );
};

export default EmployeeWorkLogsPage;
