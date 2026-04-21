import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../utils/api';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
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
} from 'lucide-react';

const ReportsAnalytics = () => {
  const [selectedReport, setSelectedReport] = useState('overview');
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
      activeAlerts: 0
    },
    projects: [],
    departments: [],
    vendors: [],
    inventory: {
      totalItems: 0,
      itemsReceived: 0,
      itemsIssued: 0,
      lowStockItems: 0,
      items: []
    },
    employees: []
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

  const handleOpenEmployeeReport = (employee) => {
    setSelectedEmployeeForReport(employee);
    setEmployeeReportModalOpen(true);
  };

  const fetchWorkingHours = useCallback(async () => {
    if (!selectedEmployeeForReport) return;
    try {
      setEmployeeReportLoading(true);
      const response = await axios.get(`/reports/employees/${selectedEmployeeForReport.id}/working-hours`, {
        params: {
          start: employeeDateRange.start,
          end: employeeDateRange.end
        }
      });
      setEmployeeWorkingHours(response.data);
    } catch (error) {
      console.error("Error fetching working hours:", error);
    } finally {
      setEmployeeReportLoading(false);
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
      const response = await axios.get(`/reports/${selectedReport}`, {
        params: {
          start: dateRange.start,
          end: dateRange.end
        }
      });
      
      setReportData(prev => ({
        ...prev,
        [selectedReport]: response.data
      }));
    } catch (error) {
      console.error(`Error fetching ${selectedReport} report:`, error);
    } finally {
      setLoading(false);
    }
  }, [selectedReport, dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const projectColumns = [
    {
      key: 'id',
      label: 'Project ID',
      sortable: true,
      render: (value) => `PRJ-${value}`,
    },
    {
      key: 'name',
      label: 'Project Name',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-3 py-1 rounded  text-xs ${
          value === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
          value === 'Active' ? 'bg-blue-100 text-blue-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'progress',
      label: 'Progress',
      sortable: true,
      render: (value) => (
        <div className="flex items-center text-xs gap-2 min-w-[100px]">
          <div className="flex-1 bg-slate-200 rounded  h-2">
            <div className="bg-blue-500 h-2 rounded " style={{ width: `${value}%` }}></div>
          </div>
          <span className="text-xs text-slate-700 w-8">{value}%</span>
        </div>
      ),
    },
    {
      key: 'startDate',
      label: 'Start Date',
      sortable: true,
    },
    {
      key: 'expectedCompletion',
      label: 'Expected Completion',
      sortable: true,
    },
    {
      key: 'onTime',
      label: 'On-Time',
      sortable: true,
      render: (value) => (
        value ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        ) : (
          <AlertTriangle className="w-3 h-3 text-red-600" />
        )
      ),
    },
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
          <span className="font-medium">{value}</span>
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
      label: 'Employee',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center text-xs gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded  flex items-center text-xs justify-center flex-shrink-0">
            <span className="text-xs text-blue-600">{value.charAt(0)}</span>
          </div>
          <div>
            <p className="font-medium">{value}</p>
            <p className="text-xs text-slate-500">ID: {row.id}</p>
          </div>
        </div>
      ),
    },
    { key: 'department', label: 'Department', sortable: true },
    { key: 'tasksCompleted', label: 'Tasks Completed', sortable: true },
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
      key: 'attendance',
      label: 'Attendance',
      sortable: true,
      render: (value) => `${value}%`,
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
          className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
          title="View Employee Report"
        >
          <FileText className="w-4 h-4" />
        </button>
      )
    },
  ];

  const exportReport = (format) => {
    const data = JSON.stringify(reportData[selectedReport], null, 2);
    const element = document.createElement('a');
    const file = new Blob([data], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${selectedReport}_report.${format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setExportDropdownOpen(false);
  };

  const reportTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'vendors', label: 'Vendors', icon: Truck },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'employees', label: 'Employees', icon: Users },
  ];

  return (
    <div className="w-full min-h-screen  space-y-2">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl  ">Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1 text-left">
            Comprehensive insights into Sterling ERP operations
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="p-2 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400 text-xs p-2">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="p-2 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative mt-3">
            <button 
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center text-xs gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded shadow-lg z-50">
                <button onClick={() => exportReport('pdf')} className="w-full text-left p-2 hover:bg-slate-50 text-slate-700 text-xs">Export as PDF</button>
                <button onClick={() => exportReport('excel')} className="w-full text-left p-2 hover:bg-slate-50 text-slate-700 text-xs border-t border-slate-200">Export as Excel</button>
                <button onClick={() => exportReport('csv')} className="w-full text-left p-2 hover:bg-slate-50 text-slate-700 text-xs border-t border-slate-200">Export as CSV</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div className="border-b border-slate-200 flex my-10 gap-8 overflow-x-auto">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedReport(tab.id)}
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
      {selectedReport === 'overview' && (
        <div className="space-y-2">
          {/* Key Metrics */}
          <div>
            <h2 className="text-md   mb-4">Key Performance Indicators</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Projects Completed', value: reportData?.overview?.completedProjects || 0, icon: CheckCircle2, color: 'blue', change: '+15% vs last month' },
                { label: 'On-Time Delivery', value: `${reportData?.overview?.onTimeDelivery || 0}%`, icon: Clock, color: 'emerald', change: 'Target: 95%' },
                { label: 'Revenue Generated', value: `₹${(reportData?.overview?.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'cyan', change: 'This period' },
                { label: 'Active Alerts', value: reportData?.overview?.activeAlerts || 0, icon: AlertTriangle, color: 'amber', change: 'Requires attention' },
              ].map((metric, idx) => {
                const Icon = metric.icon;
                const colorBg = { blue: 'bg-blue-50', emerald: 'bg-emerald-50', cyan: 'bg-cyan-50', amber: 'bg-amber-50' }[metric.color];
                const colorIcon = { blue: 'text-blue-600', emerald: 'text-emerald-600', cyan: 'text-cyan-600', amber: 'text-amber-600' }[metric.color];
                const colorText = { blue: 'text-blue-600', emerald: 'text-emerald-600', cyan: 'text-cyan-600', amber: 'text-amber-600' }[metric.color];
                return (
                  <Card key={idx} className=" transition-shadow border border-slate-100">
                    <CardContent className="p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs  text-slate-500   mb-1">{metric.label}</p>
                          <p className="text-xl  ">{metric.value}</p>
                          <p className={`text-xs ${colorText} mt-2 `}>{metric.change}</p>
                        </div>
                        <div className={`${colorBg} p-3 rounded flex-shrink-0`}>
                          <Icon className={`w-3 h-3 ${colorIcon}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2  transition-shadow border border-slate-100">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="flex items-center text-xs gap-2 text-lg">
                  <div className="p-2 bg-blue-50 rounded">
                    <TrendingUp className="w-3 h-3 text-blue-600" />
                  </div>
                  <span>Project Status Trend</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="flex flex-col items-center justify-center py-12">
                  <TrendingUp className="w-12 h-12 text-slate-300 mb-3" />
                  <h6 className="text-slate-500  mb-1">Chart Visualization</h6>
                  <p className="text-slate-500 text-xs">Interactive charts will be displayed here showing project trends over time</p>
                </div>
              </CardContent>
            </Card>

            <Card className=" transition-shadow border border-slate-100">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="flex items-center text-xs gap-2 text-lg">
                  <div className="p-2 bg-emerald-50 rounded">
                    <Building2 className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span>Department Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-4">
                {[
                  { name: 'Engineering', value: 95, color: 'bg-blue-500' },
                  { name: 'Production', value: 88, color: 'bg-emerald-500' },
                  { name: 'Quality Control', value: 97, color: 'bg-cyan-500' },
                  { name: 'Procurement', value: 92, color: 'bg-amber-500' },
                ].map((dept, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs  text-slate-700">{dept.name}</span>
                      <span className="text-xs  ">{dept.value}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded  h-2">
                      <div className={`${dept.color} h-2 rounded `} style={{width: `${dept.value}%`}}></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {selectedReport === 'projects' && (
        <Card className=" transition-shadow border border-slate-100">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center text-xs gap-2 text-lg">
              <div className="p-2 bg-blue-50 rounded">
                <Briefcase className="w-3 h-3 text-blue-600" />
              </div>
              <span>Project Performance Report</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <DataTable
              columns={projectColumns}
              data={reportData?.projects || []}
              striped={true}
              hover={true}
            />
          </CardContent>
        </Card>
      )}

      {selectedReport === 'departments' && (
        <Card className=" transition-shadow border border-slate-100">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center text-xs gap-2 text-lg">
              <div className="p-2 bg-blue-50 rounded">
                <Building2 className="w-3 h-3 text-blue-600" />
              </div>
              <span>Department Productivity Report</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(reportData?.departments || []).map((dept, index) => (
                <div key={index} className="border border-slate-200 rounded p-2  transition-shadow">
                  <h4 className="  mb-6">{dept.name}</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="w-12 h-12 bg-blue-100 rounded  flex items-center text-xs justify-center mx-auto mb-2">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-xl  ">{dept.totalUsers}</p>
                      <p className="text-xs text-slate-500 mt-1">Users</p>
                    </div>
                    <div>
                      <div className="w-12 h-12 bg-emerald-100 rounded  flex items-center text-xs justify-center mx-auto mb-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <p className="text-xl  ">{dept.completedTasks}</p>
                      <p className="text-xs text-slate-500 mt-1">Tasks Done</p>
                    </div>
                    <div>
                      <div className="w-12 h-12 bg-cyan-100 rounded  flex items-center text-xs justify-center mx-auto mb-2">
                        <Clock className="w-6 h-6 text-cyan-600" />
                      </div>
                      <p className="text-xl  ">{dept.avgEfficiency}%</p>
                      <p className="text-xs text-slate-500 mt-1">Efficiency</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedReport === 'vendors' && (
        <Card className=" transition-shadow border border-slate-100">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center text-xs gap-2 text-lg">
              <div className="p-2 bg-blue-50 rounded">
                <Truck className="w-3 h-3 text-blue-600" />
              </div>
              <span>Vendor Performance Report</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <DataTable
              columns={vendorColumns}
              data={reportData?.vendors || []}
              striped={true}
              hover={true}
            />
          </CardContent>
        </Card>
      )}

      {selectedReport === 'inventory' && (
        <Card className=" transition-shadow border border-slate-100">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center text-xs gap-2 text-lg">
              <div className="p-2 bg-blue-50 rounded">
                <Package className="w-3 h-3 text-blue-600" />
              </div>
              <span>Inventory Movement Report</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-2">
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
          </CardContent>
        </Card>
      )}

      {selectedReport === 'employees' && (
        <Card className=" transition-shadow border border-slate-100">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center text-xs gap-2 text-lg">
              <div className="p-2 bg-blue-50 rounded">
                <Users className="w-3 h-3 text-blue-600" />
              </div>
              <span>Employee Performance Report</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <DataTable
              columns={employeeColumns}
              data={reportData?.employees || []}
              striped={true}
              hover={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Employee Working Hours Modal */}
      <Modal
        isOpen={employeeReportModalOpen}
        onClose={() => setEmployeeReportModalOpen(false)}
        title={`Employee Report - ${selectedEmployeeForReport?.name || ''}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center text-blue-600 text-xl font-bold">
                {selectedEmployeeForReport?.name?.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{selectedEmployeeForReport?.name}</h3>
                <p className="text-xs text-slate-500">Dept: {selectedEmployeeForReport?.department} | ID: {selectedEmployeeForReport?.id}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-medium ml-1">START DATE</label>
                <input
                  type="date"
                  value={employeeDateRange.start}
                  onChange={(e) => setEmployeeDateRange({ ...employeeDateRange, start: e.target.value })}
                  className="p-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 font-medium ml-1">END DATE</label>
                <input
                  type="date"
                  value={employeeDateRange.end}
                  onChange={(e) => setEmployeeDateRange({ ...employeeDateRange, end: e.target.value })}
                  className="p-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchWorkingHours}
                className="mt-5 p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                title="Refresh Report"
              >
                <TrendingUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded text-center">
              <Clock className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-emerald-700">{employeeWorkingHours.total_hours || 0}</p>
              <p className="text-xs text-emerald-600 font-medium">Total Working Hours</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded text-center">
              <CheckCircle2 className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-700">
                {employeeWorkingHours.daily?.reduce((sum, day) => sum + (day.production_count || 0), 0)}
              </p>
              <p className="text-xs text-blue-600 font-medium">Total Productions</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded text-center">
              <TrendingUp className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-700">
                {employeeWorkingHours.daily?.length > 0
                  ? (employeeWorkingHours.total_hours / employeeWorkingHours.daily.length).toFixed(1)
                  : 0}h
              </p>
              <p className="text-xs text-amber-600 font-medium">Avg. Hours / Day</p>
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
      </Modal>
    </div>
  );
};

export default ReportsAnalytics;
