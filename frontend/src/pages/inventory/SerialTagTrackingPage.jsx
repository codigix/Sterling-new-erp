import React, { useState, useEffect } from "react";
import {
  Package,
  Search,
  Filter,
  Download,
  Barcode,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  FileText,
  Truck,
  ArrowUpDown
} from "lucide-react";
import axios from "../../utils/api";
import toastUtils from "../../utils/toastUtils";

const SerialTagTrackingPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serials, setSerials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSerials();
  }, []);

  const fetchSerials = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/department/inventory/purchase-orders/receipts/serials");
      setSerials(response.data || []);
    } catch (error) {
      console.error("Error fetching serials:", error);
      toastUtils.error("Failed to load Serial Tags");
    } finally {
      setLoading(false);
    }
  };

  const filteredData = serials.filter(
    (item) =>
      (item.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       item.po_number?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === "all" || item.status?.toLowerCase() === statusFilter.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "issued":
        return "bg-blue-50 text-blue-600 border-blue-100";
      case "consumed":
        return "bg-slate-50 text-slate-500 border-slate-100";
      default:
        return "bg-amber-50 text-amber-600 border-amber-100";
    }
  };

  const stats = [
    { title: "Total Serial Tags", value: serials.length, icon: Barcode, color: "blue" },
    { title: "Available Stock", value: serials.filter(s => s.status === 'Available').length, icon: CheckCircle, color: "emerald" },
    { title: "In Consumption", value: serials.filter(s => s.status === 'Consumed').length, icon: Truck, color: "amber" },
    { title: "Recent Tags (24h)", value: serials.filter(s => new Date(s.created_at) > new Date(Date.now() - 86400000)).length, icon: Clock, color: "indigo" },
  ];

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl  text-slate-900 dark:text-white flex items-center gap-2">
            <Barcode size={24} className="text-blue-600" />
            Serial Tag (ST) Tracking
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs">
            Individual piece tracking via unique ST Numbers
          </p>
        </div>
        <button 
          onClick={fetchSerials}
          className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 transition-all  text-sm"
        >
          <Clock size={18} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px]  text-slate-400  tracking-widest">{stat.title}</p>
                  <h3 className="text-2xl  text-slate-900 dark:text-white mt-1">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by ST Number, Item Name or PO..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded text-sm  text-slate-500 outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="issued">Issued</option>
          <option value="consumed">Consumed</option>
        </select>
        <button className="flex items-center gap-2 p-2 bg-blue-600 text-white rounded  text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
          <Download size={18} /> Export List
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
            <p className="text-slate-500  animate-pulse">Fetching inventory tags...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-2 text-[10px]  text-slate-400  tracking-widest">
                    <div className="flex items-center gap-1">ST Number <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="p-2 text-[10px]  text-slate-400  tracking-widest">Material Name</th>
                  <th className="p-2 text-[10px]  text-slate-400  tracking-widest">Source Document</th>
                  <th className="p-2 text-[10px]  text-slate-400  tracking-widest text-center">Receipt Date</th>
                  <th className="p-2 text-[10px]  text-slate-400  tracking-widest text-center">Status</th>
                  <th className="p-2 text-[10px]  text-slate-400  tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="p-2">
                      <span className="px-2 py-1 bg-blue-600 text-white rounded text-[10px]   tracking-widest shadow-sm">
                        {item.serial_number}
                      </span>
                    </td>
                    <td className="p-2">
                      <p className=" text-slate-900 dark:text-white">{item.item_name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">ID: {item.id}</p>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-col">
                        <span className="text-xs  text-slate-700 flex items-center gap-1">
                          <FileText size={12} /> {item.po_number || 'Internal Transfer'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Receipt: {item.receipt_number || 'Direct Entry'}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs  text-slate-700">{new Date(item.receipt_date || item.created_at).toLocaleDateString()}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{new Date(item.receipt_date || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <span className={`px-3 py-1 rounded  text-[10px]   tracking-widest border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-blue-600">
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Barcode size={48} className="text-slate-200" />
                        <p className="text-slate-500 ">No serial tags found matching your search.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SerialTagTrackingPage;
