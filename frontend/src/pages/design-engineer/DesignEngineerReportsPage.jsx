import React, { useState, useEffect } from "react";
import { BarChart3, TrendingUp, FileText, Users, Loader2, X } from "lucide-react";
import axios from "../../utils/api";
import Modal from "../../components/ui/Modal";
import Card, { CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable/DataTable";
import { Line, Bar, Doughnut } from "react-chartjs-2";
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
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const DesignEngineerReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [data, setData] = useState({
    stats: [],
    recentActivity: []
  });

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/reports/design-engineer");
        setData(response.data);
      } catch (error) {
        console.error("Error fetching design engineer report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const reports = [
    {
      id: "design-productivity",
      title: "Design Productivity",
      icon: TrendingUp,
      description: "Track designs completed vs. pending",
      action: "View Report",
    },
    {
      id: "bom-analysis",
      title: "BOM Analysis",
      icon: BarChart3,
      description: "Analyze materials and component usage",
      action: "View Report",
    },
    {
      id: "design-reviews",
      title: "Design Reviews",
      icon: FileText,
      description: "Review cycle times and approval rates",
      action: "View Report",
    },
    {
      id: "team-performance",
      title: "Team Performance",
      icon: Users,
      description: "Individual engineer metrics and workload",
      action: "View Report",
    },
  ];

  const renderReportContent = () => {
    switch (selectedReport?.id) {
      case "design-productivity":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Designs Completed Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Line
                    data={{
                      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                      datasets: [
                        {
                          label: "Designs Completed",
                          data: [12, 19, 15, 22, 18, 25],
                          borderColor: "#3b82f6",
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                          fill: true,
                          tension: 0.4,
                        },
                      ],
                    }}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-blue-50 border-blue-100">
                <CardContent className="p-4">
                  <p className="text-xs text-blue-600  uppercase">Total Drawings</p>
                  <p className="text-2xl  text-blue-900 mt-1">112</p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-50 border-emerald-100">
                <CardContent className="p-4">
                  <p className="text-xs text-emerald-600  uppercase">Approved</p>
                  <p className="text-2xl  text-emerald-900 mt-1">98</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case "bom-analysis":
        return (
          <div className="space-y-4">
            <DataTable
              columns={[
                { key: "rootCard", label: "Root Card", sortable: true },
                { key: "items", label: "Items Count", sortable: true },
                { key: "cost", label: "Estimated Cost", sortable: true },
                { key: "status", label: "Status", render: (val) => (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${val === 'Released' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {val}
                  </span>
                )}
              ]}
              data={[
                { rootCard: "RC-1002", items: 45, cost: "₹1,24,000", status: "Released" },
                { rootCard: "RC-1005", items: 28, cost: "₹85,000", status: "Draft" },
                { rootCard: "RC-1008", items: 62, cost: "₹3,12,000", status: "Released" },
                { rootCard: "RC-1012", items: 15, cost: "₹42,000", status: "In Review" },
              ]}
              striped
            />
          </div>
        );
      case "design-reviews":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Approval Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Doughnut
                    data={{
                      labels: ["Approved", "Pending", "Revision Required"],
                      datasets: [
                        {
                          data: [65, 20, 15],
                          backgroundColor: ["#10b981", "#3b82f6", "#f59e0b"],
                        },
                      ],
                    }}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cycle Time Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Initial Submission to Review</span>
                    <span className="">1.2 days</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full w-[40%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Revision Turnaround</span>
                    <span className="">0.8 days</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full w-[25%]"></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400">Target Cycle Time: 2.0 days</p>
                  <p className="text-xs  text-emerald-600 mt-1">✓ Performance: Above Average</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "team-performance":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Individual Output Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar
                    data={{
                      labels: ["Drawings", "BOMs", "Reviews", "Tasks"],
                      datasets: [
                        {
                          label: "Your Performance",
                          data: [45, 12, 38, 52],
                          backgroundColor: "#3b82f6",
                        },
                        {
                          label: "Department Avg",
                          data: [32, 10, 25, 40],
                          backgroundColor: "#cbd5e1",
                        },
                      ],
                    }}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500">Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-xl  text-slate-900 dark:text-white">
          Design Engineer Reports
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs">
          Analytics and performance metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-slate-800 rounded p-4 border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <p className="text-xs  text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className="text-xl  text-slate-900 dark:text-white mt-2">
              {stat.value}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 ">
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.title}
              className="bg-white dark:bg-slate-800 rounded  dark:border-slate-700 p-2 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded flex items-center justify-center mb-4">
                <Icon size={15} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-md  text-slate-900 dark:text-white mb-2">
                {report.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {report.description}
              </p>
              <button 
                onClick={() => setSelectedReport(report)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-blue-600 hover:text-white transition-all text-xs "
              >
                {report.action}
              </button>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2">
        <h3 className="text-lg  text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Recent Activity
        </h3>
        <div className="space-y-0">
          {data.recentActivity.length > 0 ? (
            data.recentActivity.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 px-2 rounded-md transition-colors"
              >
                <span className="text-sm text-slate-700 dark:text-slate-300 ">
                  {activity.action}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                  {activity.time}
                </span>
              </div>
            ))
          ) : (
            <p className="text-center py-10 text-slate-400 italic text-sm">No recent activity found</p>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport?.title || "Report Detail"}
        size="lg"
      >
        <div className="p-1">
          {renderReportContent()}
          <div className="p-2 flex justify-end">
            <button
              onClick={() => setSelectedReport(null)}
              className="p-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors text-xs "
            >
              Close Report
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DesignEngineerReportsPage;
