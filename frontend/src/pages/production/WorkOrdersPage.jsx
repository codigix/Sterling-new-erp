import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Plus,
  ChevronRight,
  AlertCircle,
  FileText,
  ClipboardList,
  Trash2,
  CheckCircle,
  Edit2,
  Layers,
  Zap,
  Settings,
  Activity,
  ArrowLeft,
  LayoutDashboard,
  Timer,
  AlertTriangle,
  MoreVertical,
  Play,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WorkOrdersPage = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const navigate = useNavigate();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'planning': 
      case 'pending': return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'on_hold': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-blue-500';
      default: return 'text-slate-500';
    }
  };

  const handleCreateNew = () => {
    navigate('/department/production/work-orders/new');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-600 rounded text-white">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-xl  text-slate-900 flex items-center gap-2">
                Work Orders
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                  <Layers size={14} /> Production
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <Clock size={14} /> 03:11 PM
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 p-2 rounded text-xs bg-slate-900 text-white font-semibold hover:bg-black transition-all text-sm shadow-sm"
            >
              <Plus size={18} />
              Create Order
            </button>
            <button className="p-2 rounded border border-slate-200 text-red-500 hover:bg-red-50 transition-all">
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Total Orders</p>
              <h3 className="text-2xl  text-slate-900">{stats.total}</h3>
              <p className="text-[10px] text-slate-400 mt-1   font-medium">Global manufacturing volume</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
              <Layers size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">In Progress</p>
              <h3 className="text-2xl  text-slate-900">{stats.inProgress}</h3>
              <p className="text-[10px] text-slate-400 mt-1   font-medium">Active production lines</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded flex items-center justify-center">
              <Activity size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Completed</p>
              <h3 className="text-2xl  text-slate-900">{stats.completed}</h3>
              <p className="text-[10px] text-slate-400 mt-1   font-medium">Ready for delivery</p>
            </div>
            <div className="w-12 h-12 bg-green-50 text-green-500 rounded flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Pending</p>
              <h3 className="text-2xl  text-slate-900">{stats.pending}</h3>
              <p className="text-[10px] text-slate-400 mt-1   font-medium">Awaiting scheduling</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
              <Timer size={24} />
            </div>
          </div>
        </div>

        {/* Scheduling Analyzer */}
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="p-2 border-b border-slate-100 bg-white flex items-center gap-3">
            <TrendingUp size={18} className="text-indigo-600" />
            <h3 className="text-sm  text-slate-900  tracking-wider">Scheduling Analyzer</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
            <div className="p-6 hover:bg-slate-50 transition-colors">
              <p className="text-xs text-slate-500 mb-2">High Priority Pending</p>
              <h4 className="text-xl  text-slate-900 mb-4">1 <span className="text-xs font-medium text-red-500 ml-2  tracking-widest ">Critical</span></h4>
              <div className="h-1.5 w-full bg-slate-100 rounded  overflow-hidden">
                <div className="h-full bg-red-500 w-[20%] shadow-[0_0_8px_rgba(239,68,68,0.2)]" />
              </div>
            </div>
            <div className="p-6 hover:bg-slate-50 transition-colors">
              <p className="text-xs text-slate-500 mb-2">Due This Week</p>
              <h4 className="text-xl  text-slate-900 mb-4">0</h4>
              <div className="h-1.5 w-full bg-slate-100 rounded  overflow-hidden">
                <div className="h-full bg-amber-500 w-0" />
              </div>
            </div>
            <div className="p-6 hover:bg-slate-50 transition-colors">
              <p className="text-xs text-slate-500 mb-2">Efficiency Rate</p>
              <h4 className="text-xl  text-slate-900 mb-4">88 %</h4>
              <div className="h-1.5 w-full bg-slate-100 rounded  overflow-hidden">
                <div className="h-full bg-indigo-600 w-[88%] shadow-[0_0_8px_rgba(79,70,229,0.2)]" />
              </div>
            </div>
            <div className="p-6 hover:bg-slate-50 transition-colors">
              <p className="text-xs text-slate-500 mb-2">Ready for QC</p>
              <h4 className="text-xl  text-slate-900 mb-4">0</h4>
              <div className="h-1.5 w-full bg-slate-100 rounded  overflow-hidden">
                <div className="h-full bg-emerald-500 w-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Work Orders Table */}
        <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base  text-slate-900">Active Work Orders</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time production tracking</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded  text-[10px]  border border-green-100">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded " />
                  {workOrders.length} Orders Active
               </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="relative max-w-md w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search orders, items, or IDs..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                 <Filter size={16} className="text-slate-400" />
                 <select 
                   className="bg-transparent text-sm font-medium text-slate-500 outline-none"
                   value={statusFilter}
                   onChange={(e) => setStatusFilter(e.target.value)}
                 >
                    <option value="all">All Status</option>
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                 </select>
              </div>
              <div className="h-4 w-px bg-slate-300 mx-1" />
              <select 
                className="bg-transparent text-sm font-medium text-slate-500 outline-none"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              >
                 <option value="all">All Months</option>
                 <option value="1">January</option>
                 <option value="2">February</option>
                 <option value="3">March</option>
                 <option value="4">April</option>
                 <option value="5">May</option>
                 <option value="6">June</option>
                 <option value="7">July</option>
                 <option value="8">August</option>
                 <option value="9">September</option>
                 <option value="10">October</option>
                 <option value="11">November</option>
                 <option value="12">December</option>
              </select>
              <select 
                className="bg-transparent text-sm font-medium text-slate-500 outline-none "
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                 <option value="all">All Years</option>
                 <option value="2023">2023</option>
                 <option value="2024">2024</option>
                 <option value="2025">2025</option>
                 <option value="2026">2026</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="p-2 text-[11px]  text-slate-400  tracking-wider">Order Identity</th>
                  <th className="p-2 text-[11px]  text-slate-400  tracking-wider">Item</th>
                  <th className="p-2 text-[11px]  text-slate-400  tracking-wider text-center">Material Status</th>
                  <th className="p-2 text-[11px]  text-slate-400  tracking-wider text-center">Status & Priority</th>
                  <th className="p-2 text-[11px]  text-slate-400  tracking-wider text-center">Progress</th>
                  <th className="p-2 text-[11px]  text-slate-400  tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500">Loading work orders...</td>
                  </tr>
                ) : workOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500">No work orders found</td>
                  </tr>
                ) : (
                  workOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-all group border-b border-slate-50">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-blue-50 text-indigo-600 rounded group-hover:scale-110 transition-transform shadow-sm border border-blue-100">
                            <FileText size={18} />
                          </div>
                          <div>
                            <p className="text-[13px]  text-indigo-700 leading-none mb-1  ">{order.work_order_no}</p>
                            <p className="text-[10px] text-slate-500  flex items-center gap-1  tracking-wider">
                              <Calendar size={10} className="text-slate-400" />
                              {order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '05 Feb'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div>
                          <p className="text-[15px]  text-slate-900 leading-none mb-1.5  ">{order.item_name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] text-indigo-700   tracking-widest italic">{order.bom_no || 'No BOM'}</p>
                            {(order.sales_order_no || order.project_name) && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded   er border border-slate-200 dark:border-slate-700">
                                {order.sales_order_no || order.project_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-center">
                          {order.is_material_ready ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded  text-[10px]  bg-green-50 text-green-700 border border-green-200  tracking-wider shadow-sm">
                               <CheckCircle size={12} />
                               Ready
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded  text-[10px]  bg-red-50 text-red-700 border border-red-200  tracking-wider shadow-sm animate-pulse">
                               <AlertTriangle size={12} />
                               Awaiting MR
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-center gap-2">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded  text-[10px]  border  tracking-wider ${getStatusBadge(order.status)} shadow-sm`}>
                             <Clock size={12} />
                             {(order.status || 'pending').replace('_', ' ')}
                          </div>
                          <div className="flex items-center gap-1.5">
                             <div className={`w-1.5 h-1.5 rounded  shadow-[0_0_4px_currentColor] ${getPriorityColor(order.priority)}`} />
                             <span className={`text-[10px]   tracking-widest ${getPriorityColor(order.priority)}`}>
                               {order.priority || 'medium'} priority
                             </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="max-w-[120px] mx-auto text-center">
                          <div className="flex items-center justify-center mb-1.5">
                            <span className="text-[10px]  text-slate-500 ">0 / <span className="text-indigo-600">0%</span></span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded  overflow-hidden p-[1px]">
                            <div className="h-full bg-indigo-500 w-0 rounded  shadow-[0_0_8px_rgba(99,102,241,0.3)]" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => order.is_material_ready && navigate(`/department/production/job-cards`, { state: { workOrderId: order.id, workOrderNo: order.work_order_no } })}
                            disabled={!order.is_material_ready}
                            className={`p-2.5 rounded transition-all shadow-sm flex items-center justify-center ${
                              order.is_material_ready 
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                            }`}
                            title={order.is_material_ready ? "Track Production" : "Materials Pending"}
                          >
                            <Activity size={18} />
                          </button>
                          <button 
                            onClick={() => order.is_material_ready && navigate(`/department/production/work-orders/edit/${order.id}`)}
                            disabled={!order.is_material_ready}
                            className={`p-2 rounded transition-all ${
                              order.is_material_ready 
                              ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50' 
                              : 'text-slate-300 cursor-not-allowed'
                            }`}
                            title={order.is_material_ready ? "Edit" : "Materials Pending"}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(order.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all" title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
             <p className="text-xs text-slate-500">Showing {workOrders.length} manufacturing sequences</p>
             <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-xs  text-slate-400 hover:text-slate-500 disabled:opacity-50">Previous</button>
                <button className="px-4 py-1.5 bg-white border border-slate-200 text-xs  text-slate-900 rounded shadow-sm hover:bg-slate-50 transition-all">Next</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkOrdersPage;
