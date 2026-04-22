import React, { useState, useEffect } from "react";
import axios from "../../utils/api";
import {
  ShoppingCart,
  FileText,
  Truck,
  AlertTriangle,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import Badge from "../../components/ui/Badge";

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
import { Bar, Doughnut, Pie } from 'react-chartjs-2';

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

const ProcurementTasksPage = () => {
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [shortageRequests, setShortageRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fetchProcurementData = async () => {
    try {
      setLoading(true);
      const [prRes, poRes, quotesRes, shortageRes] = await Promise.all([
        axios.get("/procurement/portal/purchase-requests"),
        axios.get("/procurement/portal/purchase-orders"),
        axios.get("/procurement/portal/quotes"),
        axios.get("/department/procurement/material-requests?type=shortage"),
      ]);
      setPurchaseRequests(prRes.data.materialRequests || prRes.data.data || prRes.data || []);
      setPurchaseOrders(poRes.data.purchaseOrders || poRes.data || []);
      setQuotes(quotesRes.data.quotations || quotesRes.data || []);
      setShortageRequests(shortageRes.data.data || shortageRes.data || []);
    } catch (err) {
      console.error("Fetch procurement error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurementData();
  }, []);

  const stats = [
    {
      label: "Purchase Requests",
      value: purchaseRequests.length,
      icon: ClipboardList,
      color: "blue"
    },
    {
      label: "Purchase Orders",
      value: purchaseOrders.length,
      icon: ShoppingCart,
      color: "indigo"
    },
    {
      label: "Vendor Quotes",
      value: quotes.length,
      icon: FileText,
      color: "amber"
    },
    {
      label: "Shortage Alerts",
      value: shortageRequests.length,
      icon: AlertTriangle,
      color: "rose"
    },
  ];

  const prStatusData = {
    labels: ['Pending', 'Approved', 'Rejected'],
    datasets: [{
      data: [
        purchaseRequests.filter(r => r.status?.toLowerCase() === 'pending').length,
        purchaseRequests.filter(r => r.status?.toLowerCase() === 'approved' || r.status?.toLowerCase() === 'accepted').length,
        purchaseRequests.filter(r => r.status?.toLowerCase() === 'rejected' || r.status?.toLowerCase() === 'cancelled').length,
      ],
      backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
    }]
  };

  const poStatusData = {
    labels: ['Placed', 'Delivered', 'Pending'],
    datasets: [{
      data: [
        purchaseOrders.filter(o => o.status?.toLowerCase() === 'placed').length,
        purchaseOrders.filter(o => o.status?.toLowerCase() === 'delivered').length,
        purchaseOrders.filter(o => o.status?.toLowerCase() === 'pending').length,
      ],
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
    }]
  };

  const quoteData = {
    labels: quotes.slice(0, 5).map(q => q.vendor?.substring(0, 10) || "Unknown"),
    datasets: [{
      label: 'Quote Amount (₹)',
      data: quotes.slice(0, 5).map(q => {
        const val = q.amount?.toString().replace(/[^0-9.]/g, '') || 0;
        return parseFloat(val);
      }),
      backgroundColor: '#f59e0b',
    }]
  };

  const shortageStatusData = {
    labels: ['Pending', 'Approved', 'In Process'],
    datasets: [{
      label: 'Shortages',
      data: [
        shortageRequests.filter(s => s.status?.toLowerCase() === 'pending').length,
        shortageRequests.filter(s => s.status?.toLowerCase() === 'approved').length,
        shortageRequests.filter(s => s.status?.toLowerCase() === 'in_progress' || s.status?.toLowerCase() === 'in process').length,
      ],
      backgroundColor: '#ef4444',
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, font: { size: 10 }, color: '#64748b' }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded  animate-spin"></div>
        </div>
        <p className="text-slate-500  animate-pulse">Loading procurement analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 bg-slate-50/50 dark:bg-transparent min-h-screen">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white">Procurement Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Graphical overview of procurement activities and performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchProcurementData}
            className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-xs group"
          >
            <RefreshCw size={15} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700  hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-1 ">{stat.label}</p>
                <h3 className="text-xl  text-slate-900 dark:text-white">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400`}>
                <stat.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* PR Status */}
        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 ">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-500" />
            Purchase Request Status
          </h3>
          <div className="h-64">
            <Doughnut data={prStatusData} options={chartOptions} />
          </div>
        </div>

        {/* PO Status */}
        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 ">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2">
            <ShoppingCart size={18} className="text-indigo-500" />
            Purchase Order Status
          </h3>
          <div className="h-64">
            <Pie data={poStatusData} options={chartOptions} />
          </div>
        </div>

        {/* Vendor Quotes */}
        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 ">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2">
            <Truck size={18} className="text-amber-500" />
            Top Vendor Quotes
          </h3>
          <div className="h-64">
            <Bar 
              data={quoteData} 
              options={{
                ...chartOptions,
                plugins: { ...chartOptions.plugins, legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { font: { size: 10 } } },
                  x: { ticks: { font: { size: 10 } } }
                }
              }} 
            />
          </div>
        </div>

        {/* Shortages */}
        <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700  col-span-1 md:col-span-2 lg:col-span-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-500" />
            Material Shortage Overview
          </h3>
          <div className="h-64">
            <Bar 
              data={shortageStatusData} 
              options={{
                ...chartOptions,
                plugins: { ...chartOptions.plugins, legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: 1 } },
                  x: { ticks: { font: { size: 10 } } }
                }
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcurementTasksPage;