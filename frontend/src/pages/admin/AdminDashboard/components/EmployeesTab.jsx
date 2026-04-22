import React, { useState, useEffect } from "react";
import Card, { CardHeader, CardTitle, CardContent } from "../../../../components/ui/Card";
import Badge from "../../../../components/ui/Badge";
import axios from "../../../../utils/api";
import {
  UserCheck,
  TrendingUp,
  Target,
  Calendar,
  BarChart3,
  PieChart,
  Factory,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  FileText,
  Clock,
  User,
} from "lucide-react";
import { Bar, Doughnut, Line } from "react-chartjs-2";

const EmployeesTab = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [dailyReports, setDailyReports] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/reports/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDetails = async (employee) => {
    try {
      setDetailsLoading(true);
      setSelectedEmployee(employee);
      
      const [performanceRes, reportsRes] = await Promise.all([
        axios.get(`/reports/employees/${employee.id}/performance`),
        axios.get(`/reports/employees/${employee.id}/daily-reports`)
      ]);
      
      setPerformanceData(performanceRes.data);
      setDailyReports(reportsRes.data);
    } catch (error) {
      console.error("Error fetching employee details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedEmployee(null);
    setPerformanceData(null);
    setDailyReports([]);
  };

  const departmentStats = [
    {
      department: "Production",
      avgEfficiency: 91,
      avgQuality: 4.6,
      totalEmployees: 45,
      topPerformer: "Rajesh Kumar",
    },
    {
      department: "Quality Control",
      avgEfficiency: 93,
      avgQuality: 4.8,
      totalEmployees: 18,
      topPerformer: "Priya Sharma",
    },
    {
      department: "Engineering",
      avgEfficiency: 87,
      avgQuality: 4.5,
      totalEmployees: 28,
      topPerformer: "Amit Singh",
    },
    {
      department: "Procurement",
      avgEfficiency: 89,
      avgQuality: 4.4,
      totalEmployees: 12,
      topPerformer: "Sneha Patel",
    },
    {
      department: "Warehouse",
      avgEfficiency: 92,
      avgQuality: 4.6,
      totalEmployees: 15,
      topPerformer: "Vikram Rao",
    },
    {
      department: "Sales",
      avgEfficiency: 82,
      avgQuality: 4.1,
      totalEmployees: 8,
      topPerformer: "Kavita Jain",
    },
  ];

  const getPerformanceStatus = (efficiency) => {
    if (efficiency >= 90) return "Excellent";
    if (efficiency >= 80) return "Good";
    if (efficiency >= 70) return "Average";
    return "Needs Improvement";
  };

  const getQualityColor = (score) => {
    if (score >= 4.5) return "text-green-600";
    if (score >= 4.0) return "text-blue-600";
    if (score >= 3.5) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (selectedEmployee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center text-sm  text-slate-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Overview
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
               <User className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg  text-slate-800">{selectedEmployee.name}</h2>
              <p className="text-xs text-slate-500">{selectedEmployee.designation || 'Employee'} • {selectedEmployee.department}</p>
            </div>
          </div>
        </div>

        {detailsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm  text-slate-500">Total Updates</p>
                      <p className="text-2xl ">{performanceData?.stats?.total_updates || 0}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm  text-slate-500">Quantity Produced</p>
                      <p className="text-2xl ">{performanceData?.stats?.total_produced || 0}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-green-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm  text-slate-500">Avg Rejections</p>
                      <p className="text-2xl  text-red-500">{Number(performanceData?.stats?.avg_rejections || 0).toFixed(2)}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <Card className="lg:col-span-2">
                 <CardHeader>
                   <CardTitle className="text-sm  flex items-center">
                     <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                     Production Performance (Last 30 Days)
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="h-64">
                      <Line 
                        data={{
                          labels: performanceData?.trend?.map(t => t.date) || [],
                          datasets: [{
                            label: 'Quantity Produced',
                            data: performanceData?.trend?.map(t => t.count) || [],
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            fill: true,
                            tension: 0.4
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: {
                            y: { beginAtZero: true }
                          }
                        }}
                      />
                    </div>
                 </CardContent>
               </Card>

               <Card>
                 <CardHeader>
                   <CardTitle className="text-sm  flex items-center">
                     <Clock className="w-4 h-4 mr-2 text-purple-500" />
                     Work Distribution
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="h-64">
                       <Doughnut 
                         data={{
                           labels: ['Produced', 'Rejections'],
                           datasets: [{
                             data: [
                               performanceData?.stats?.total_produced || 1,
                               performanceData?.stats?.avg_rejections * performanceData?.stats?.total_updates || 0
                             ],
                             backgroundColor: ['#10b981', '#ef4444'],
                             borderWidth: 0
                           }]
                         }}
                         options={{
                           responsive: true,
                           maintainAspectRatio: false,
                           plugins: { legend: { position: 'bottom' } }
                         }}
                       />
                    </div>
                 </CardContent>
               </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm  flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-primary-500" />
                  Daily Production Reports
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">{dailyReports.length} reports</Badge>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left py-3 px-2  text-slate-500">Date</th>
                        <th className="text-left py-3 px-2  text-slate-500">Project</th>
                        <th className="text-left py-3 px-2  text-slate-500">Operation</th>
                        <th className="text-center py-3 px-2  text-slate-500">Qty Produced</th>
                        <th className="text-center py-3 px-2  text-slate-500">Qty Rejected</th>
                        <th className="text-left py-3 px-2  text-slate-500">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReports.map((report, idx) => (
                        <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-2">{new Date(report.update_date).toLocaleDateString()}</td>
                          <td className="py-3 px-2">
                             <div className="flex flex-col">
                               <span className="">{report.project_name}</span>
                               <span className="text-[10px] text-slate-400">{report.project_code}</span>
                             </div>
                          </td>
                          <td className="py-3 px-2 ">{report.operation_name}</td>
                          <td className="py-3 px-2 text-center text-green-600 ">{report.quantity_produced}</td>
                          <td className="py-3 px-2 text-center text-red-500">{report.rejection_quantity}</td>
                          <td className="py-3 px-2 text-slate-500 max-w-xs truncate">{report.remarks || '-'}</td>
                        </tr>
                      ))}
                      {dailyReports.length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-10 text-center text-slate-400 italic">No daily reports found for this employee.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 overflow-x-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center text-xs">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded">
                <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm  text-slate-500 dark:text-slate-400">
                  Top Performers
                </p>
                <p className="text-xl   text-left">
                  18
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center text-xs">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm  text-slate-500 dark:text-slate-400">
                  Avg Efficiency
                </p>
                <p className="text-xl   text-left">
                  89%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center text-xs">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded">
                <Target className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm  text-slate-500 dark:text-slate-400">
                  Avg Quality
                </p>
                <p className="text-xl   text-left">
                  4.5/5.0
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center text-xs">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded">
                <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm  text-slate-500 dark:text-slate-400">
                  Avg Attendance
                </p>
                <p className="text-xl   text-left">
                  97%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xs">
            <UserCheck className="w-3 h-3 mr-2" />
            Top Performing Employees (Click to view details)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {employees.length > 0 ? (
              employees.slice(0, 6).map((employee, index) => (
                <div
                  key={index}
                  onClick={() => fetchEmployeeDetails(employee)}
                  className="flex items-center text-xs p-4 border border-slate-200 dark:border-slate-700 rounded hover:border-primary-500 hover:shadow-sm cursor-pointer transition-all bg-white"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center text-xs justify-center">
                      <span className="text-lg  text-primary-600 dark:text-primary-400">
                        {employee.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center text-xs justify-between mb-1">
                      <h4 className=" text-slate-800">
                        {employee.name}
                      </h4>
                      <Badge className={
                        employee.efficiency >= 90 ? "bg-green-100 text-green-700" :
                        employee.efficiency >= 80 ? "bg-blue-100 text-blue-700" :
                        "bg-yellow-100 text-yellow-700"
                      }>
                        {getPerformanceStatus(employee.efficiency)}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      {employee.designation || 'Specialist'} • {employee.department}
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-[10px]">
                      <div>
                        <span className="text-slate-400 uppercase ">
                          Tasks
                        </span>
                        <p className=" text-slate-700">
                          {employee.tasksCompleted}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase ">
                          Efficiency
                        </span>
                        <p className=" text-green-600">
                          {employee.efficiency}%
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase ">
                          Rating
                        </span>
                        <p className=" text-blue-600">
                          {employee.rating}/5.0
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-10 text-center text-slate-400 italic">No employee data found.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xs">
              <BarChart3 className="w-3 h-3 mr-2" />
              Department Efficiency Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar
                data={{
                  labels: departmentStats.map((d) => d.department),
                  datasets: [
                    {
                      label: "Average Efficiency %",
                      data: departmentStats.map((d) => d.avgEfficiency),
                      backgroundColor: "#475569",
                      borderRadius: 4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: (value) => value + "%",
                      },
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xs">
              <PieChart className="w-3 h-3 mr-2" />
              Performance Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Doughnut
                data={{
                  labels: ["Excellent", "Good", "Average", "Needs Improvement"],
                  datasets: [
                    {
                      data: [18, 24, 8, 2],
                      backgroundColor: [
                        "#10b981",
                        "#3b82f6",
                        "#f59e0b",
                        "#ef4444",
                      ],
                      borderWidth: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom", labels: { boxWidth: 12 } },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xs">
            <Factory className="w-3 h-3 mr-2" />
            Department Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4   dark:">
                    Department
                  </th>
                  <th className="text-left py-3 px-4   dark:">
                    Employees
                  </th>
                  <th className="text-left py-3 px-4   dark:">
                    Avg Efficiency
                  </th>
                  <th className="text-left py-3 px-4   dark:">
                    Avg Quality
                  </th>
                  <th className="text-left py-3 px-4   dark:">
                    Top Performer
                  </th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.map((dept, index) => (
                  <tr
                    key={index}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-3 px-4   dark:">
                      {dept.department}
                    </td>
                    <td className="py-3 px-4  dark:">
                      {dept.totalEmployees}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={` ${
                          dept.avgEfficiency >= 90
                            ? "text-green-600"
                            : dept.avgEfficiency >= 85
                            ? "text-blue-600"
                            : dept.avgEfficiency >= 80
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {dept.avgEfficiency}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={` ${getQualityColor(
                          dept.avgQuality
                        )}`}
                      >
                        {dept.avgQuality}/5.0
                      </span>
                    </td>
                    <td className="py-3 px-4  dark:">
                      {dept.topPerformer}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xs">
            <TrendingUp className="w-3 h-3 mr-2" />
            Performance Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="  dark:">
                Strengths
              </h4>
              <div className="space-y-3">
                <div className="flex items-center text-xs p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                  <CheckCircle className="w-3 h-3 text-green-600 mr-3" />
                  <div>
                    <p className=" text-green-900 dark:text-green-100">
                      Quality Control Excellence
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      QC team maintains 4.8/5.0 average quality score
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <TrendingUp className="w-3 h-3 text-blue-600 mr-3" />
                  <div>
                    <p className=" text-blue-900 dark:text-blue-100">
                      High Attendance Rate
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      97% average attendance across all departments
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="  dark:">
                Areas for Improvement
              </h4>
              <div className="space-y-3">
                <div className="flex items-center text-xs p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <AlertTriangle className="w-3 h-3 text-yellow-600 mr-3" />
                  <div>
                    <p className=" text-yellow-900 dark:text-yellow-100">
                      Sales Performance
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Sales team efficiency at 82% - consider additional
                      training
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                  <Target className="w-3 h-3 text-orange-600 mr-3" />
                  <div>
                    <p className=" text-orange-900 dark:text-orange-100">
                      Engineering Workload
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Consider redistributing complex tasks to balance workload
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeesTab;
