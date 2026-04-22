import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "../../utils/api";
import { Loader2, Package, Factory, Clock, CheckCircle, AlertTriangle, Users, TrendingUp, FileText, ShoppingCart, ChevronRight, Target, Layers, BarChart3, PieChart } from "lucide-react";
import ProductionPhasesDisplay from "../../components/production/ProductionPhasesDisplay";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const ProductionDashboard = () => {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [rootCards, setRootCards] = useState([]);
  const [loadingRootCards, setLoadingRootCards] = useState(true);
  const [departmentTasks, setDepartmentTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [bomCount, setBomCount] = useState(0);

  const fetchPlans = useCallback(async () => {
    try {
      setLoadingPlans(true);
      const response = await axios.get('/production/plans');
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Error fetching production plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  const fetchBOMCount = useCallback(async () => {
    try {
      const response = await axios.get('/engineering/bom/comprehensive');
      setBomCount(response.data.boms?.length || response.data?.length || 0);
    } catch (error) {
      console.error('Error fetching BOM count:', error);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const response = await axios.get("/employee/tasks?type=production_plan");
      setDepartmentTasks(response.data.tasks || []);
    } catch (err) {
      console.error("Error fetching production tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  // Fetch all root cards to allow searching through any of them
  const fetchRootCards = useCallback(async () => {
    setLoadingRootCards(true);
    try {
      const response = await axios.get('/production/root-cards', {
        __sessionGuard: true
      });
      const cards = Array.isArray(response.data) ? response.data : response.data.rootCards || [];
      setRootCards(cards);
    } catch (error) {
      console.error('Error fetching root cards:', error);
    } finally {
      setLoadingRootCards(false);
    }
  }, []);

  useEffect(() => {
    fetchRootCards();
    fetchTasks();
    fetchPlans();
    fetchBOMCount();
  }, [fetchTasks, fetchPlans, fetchRootCards, fetchBOMCount]);

  const [searchTerm, setSearchTerm] = useState('');

  // Chart Data Preparation
  const planStatusData = {
    labels: ['In Progress', 'Planning', 'Completed', 'Delayed'],
    datasets: [{
      data: [
        plans.filter(p => p.status === 'in_progress').length,
        plans.filter(p => p.status === 'planning').length,
        plans.filter(p => p.status === 'completed').length,
        plans.filter(p => p.status === 'delayed').length,
      ],
      backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'],
      borderWidth: 1,
    }]
  };

  const taskStatusData = {
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [{
      data: [
        departmentTasks.filter(t => t.status === 'pending').length,
        departmentTasks.filter(t => t.status === 'in_progress').length,
        departmentTasks.filter(t => t.status === 'completed').length,
      ],
      backgroundColor: ['#fbbf24', '#3b82f6', '#10b981'],
    }]
  };

  const progressData = {
    labels: plans.slice(0, 6).map(p => {
      const name = p.plan_name || "Unnamed Plan";
      return name.substring(0, 15) + (name.length > 15 ? '...' : '');
    }),
    datasets: [{
      label: 'Progress %',
      data: plans.slice(0, 6).map(p => p.progress_percentage || 0),
      backgroundColor: '#3b82f6',
    }]
  };

  const stageData = {
    labels: ['Cutting', 'Welding', 'Finishing', 'Inspection'],
    datasets: [{
      label: 'Active Count',
      data: [3, 2, 1, 2], // Hardcoded as per the existing static list in original file
      backgroundColor: '#8b5cf6',
    }]
  };

  const teamUtilizationData = {
    labels: ['Cutting & Prep', 'Welding', 'Assembly', 'Finishing'],
    datasets: [{
      label: 'Utilization %',
      data: [85, 92, 78, 65], // Hardcoded as per the existing static list in original file
      backgroundColor: '#10b981',
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          font: { size: 10 },
          color: '#64748b'
        }
      }
    }
  };

  return (
    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white">Production Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Graphical overview of manufacturing performance</p>
        </div>
        <div className="flex gap-2">
           <Link to="/department/production/plans" className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded hover:bg-slate-100 transition-colors flex items-center gap-1">
              <Clock size={12} /> Plans
           </Link>
           <Link to="/department/production/tasks" className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors flex items-center gap-1">
              <Target size={12} /> Tasks
           </Link>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Production Progress */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 col-span-1 lg:col-span-2">
          <h3 className="text-sm  text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-500" />
            Top Production Plans Progress
          </h3>
          <div className="h-64">
            <Bar 
              data={progressData} 
              options={{
                ...chartOptions,
                plugins: { ...chartOptions.plugins, legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, max: 100, ticks: { font: { size: 10 } } },
                  x: { ticks: { font: { size: 10 } } }
                }
              }} 
            />
          </div>
        </div>

        {/* Plan Status Distribution */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm  text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <PieChart size={16} className="text-amber-500" />
            Plan Status Distribution
          </h3>
          <div className="h-64">
            <Doughnut data={planStatusData} options={chartOptions} />
          </div>
        </div>

        {/* Task Status */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm  text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" />
            Planning Task Status
          </h3>
          <div className="h-64">
            <Pie data={taskStatusData} options={chartOptions} />
          </div>
        </div>

        {/* Manufacturing Stages */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm  text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Factory size={16} className="text-purple-500" />
            Manufacturing Stage Activity
          </h3>
          <div className="h-64">
            <Bar 
              data={stageData} 
              options={{
                ...chartOptions,
                plugins: { ...chartOptions.plugins, legend: { display: false } },
                indexAxis: 'y',
                scales: {
                  x: { beginAtZero: true, ticks: { font: { size: 10 } } },
                  y: { ticks: { font: { size: 10 } } }
                }
              }} 
            />
          </div>
        </div>

        {/* Team Utilization */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm  text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Users size={16} className="text-blue-500" />
            Resource Utilization
          </h3>
          <div className="h-64">
            <Line 
              data={{
                ...teamUtilizationData,
                datasets: [{
                  ...teamUtilizationData.datasets[0],
                  borderColor: '#10b981',
                  tension: 0.4,
                  fill: true,
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                }]
              }} 
              options={chartOptions} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionDashboard;
