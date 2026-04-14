import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "../../utils/api";
import {
  Plus,
  Eye,
  Edit2,
  Download,
  X,
  CheckCircle,
  Clock,
  Filter,
  Package,
  ShoppingCart,
  FileText,
  Truck,
  AlertTriangle,
  ClipboardList,
  Search,
  MoreVertical,
  Calendar,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import MaterialRequestsPage from "../production/MaterialRequestsPage";
import CreatePurchaseOrderModal from "../inventory/CreatePurchaseOrderModal";
import "../../styles/TaskPage.css";

const ProcurementTasksPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [shortageRequests, setShortageRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "material-requests");
  const [showNewForm, setShowNewForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Detail Modal State
  const [showShortageDetail, setShowShortageDetail] = useState(false);
  const [selectedShortage, setSelectedShortage] = useState(null);
  const [loadingShortageItems, setLoadingShortageItems] = useState(false);

  // PO Modal State
  const [showPOModal, setShowPOModal] = useState(false);
  const [poSource, setPoSource] = useState(null);

  const fetchProcurementData = async () => {
    try {
      setLoading(true);
      const [prRes, poRes, quotesRes, shortageRes] = await Promise.all([
        axios.get("/procurement/portal/purchase-requests"),
        axios.get("/procurement/portal/purchase-orders"),
        axios.get("/procurement/portal/quotes"),
        axios.get("/department/procurement/material-requests?type=shortage"),
      ]);
      setPurchaseRequests(prRes.data || []);
      setPurchaseOrders(poRes.data || []);
      setQuotes(quotesRes.data || []);
      setShortageRequests(shortageRes.data.data || shortageRes.data || []);
    } catch (err) {
      setError("Failed to load procurement data");
      console.error("Fetch procurement error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurementData();
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleViewShortageDetail = async (shortage) => {
    setSelectedShortage(shortage);
    setShowShortageDetail(true);
    setLoadingShortageItems(true);
    try {
      const response = await axios.get(`/department/procurement/material-requests/${shortage.id}`);
      setSelectedShortage(response.data.data || response.data.materialRequest);
    } catch (err) {
      console.error("Error fetching shortage details:", err);
    } finally {
      setLoadingShortageItems(false);
    }
  };

  const handleCreatePOFromShortage = (shortage) => {
    setPoSource(shortage);
    setShowPOModal(true);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "approved":
      case "accepted":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "placed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "delivered":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800";
      case "rejected":
      case "cancelled":
        return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    }
  };

  const stats = [
    {
      label: "Purchase Requests",
      value: purchaseRequests.length,
      icon: ClipboardList,
      color: "blue",
      description: "Pending procurement needs"
    },
    {
      label: "Purchase Orders",
      value: purchaseOrders.length,
      icon: ShoppingCart,
      color: "indigo",
      description: "Active orders with vendors"
    },
    {
      label: "Vendor Quotes",
      value: quotes.length,
      icon: FileText,
      color: "amber",
      description: "Quotes awaiting review"
    },
    {
      label: "Pending Orders",
      value: purchaseOrders.filter((po) => po.status === "placed").length,
      icon: Clock,
      color: "emerald",
      description: "Orders yet to be delivered"
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded  animate-spin"></div>
        </div>
        <p className="text-slate-500 font-medium animate-pulse">Loading procurement dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-6 bg-slate-50/50 dark:bg-transparent min-h-screen">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white">Procurement Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Manage material requests, vendor quotes and purchase orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchProcurementData}
            className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-xs group"
          >
            <RefreshCw size={15} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="flex items-center gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Create {activeTab === "pr" ? "Request" : activeTab === "po" ? "Order" : "Quote"}</span>
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {stats.map((stat, idx) => (
          <div key={idx} className="group relative bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700  hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs    mb-1">{stat.label}</p>
                <h3 className="text-xl  text-slate-900 dark:text-white">{stat.value}</h3>
              </div>
              <div className={`p-2 rounded bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400 group-hover:scale-110 transition-transform`}>
                <stat.icon size={15} />
              </div>
            </div>
            <div className=" border-t border-slate-50 dark:border-slate-700/50">
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation and Search */}
      <div className="  overflow-hidden">
        <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: "material-requests", label: "Material Requests", icon: ClipboardList },
                { id: "shortage-requests", label: "Shortage Requests", icon: AlertTriangle },
                { id: "pr", label: "Purchase Requests", icon: FileText },
                { id: "po", label: "Purchase Orders", icon: ShoppingCart },
                { id: "quotes", label: "Vendor Quotes", icon: Truck },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 p-2 rounded text-xs text-xs transition-all whitespace-nowrap ${activeTab === tab.id
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400  ring-1 ring-slate-200 dark:ring-slate-600"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"
                    }`}
                >
                  <tab.icon size={15} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={15} />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full lg:w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-0">
          {/* Material Requests Content */}
          {activeTab === "material-requests" && (
            <div className="">
              <MaterialRequestsPage embed={true} />
            </div>
          )}

          {/* Shortage Requests Table */}
          {activeTab === "shortage-requests" && (
            <div className="overflow-x-auto animate-in fade-in duration-500">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs   ">
                    <th className="p-2">Request Details</th>
                    <th className="p-2">Context</th>
                    <th className="p-2">Project</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {shortageRequests.length > 0 ? (
                    shortageRequests
                      .filter(req =>
                        req.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        req.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                          <td className="p-2">
                            <div className="flex flex-col">
                              <span className=" text-slate-900 dark:text-white text-sm">{req.request_number}</span>
                              <span className="text-xs text-slate-400 font-medium">REQ-ID: {req.id}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <Badge className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none">GRN: {req.bom_number || "N/A"}</Badge>
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Root Card: {req.root_card_id || "N/A"}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs ">
                                {req.project_name?.charAt(0) || "G"}
                              </div>
                              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{req.project_name || "General Project"}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                              <Calendar size={14} />
                              <span className="text-xs">{new Date(req.created_at).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge variant="outline" className={`${getStatusColor(req.status)} text-xs py-1 border `}>
                              {req.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleViewShortageDetail(req)}
                                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-all "
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleCreatePOFromShortage(req)}
                                className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/20"
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded ">
                            <AlertTriangle className="text-slate-400" size={32} />
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 font-medium italic">No shortage requests found matching your criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Purchase Requests Table */}
          {activeTab === "pr" && (
            <div className="overflow-x-auto animate-in fade-in duration-500">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs   ">
                    <th className="p-2">PR Number</th>
                    <th className="p-2">Project Details</th>
                    <th className="p-2 text-center">Items</th>
                    <th className="p-2">Total Amount</th>
                    <th className="p-2">Required Date</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {purchaseRequests
                    .filter(pr =>
                      pr.id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                      pr.project?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((pr) => (
                      <tr key={pr.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group text-sm">
                        <td className="p-2  text-blue-600 dark:text-blue-400">#{pr.id}</td>
                        <td className="p-2 text-slate-700 dark:text-slate-300 font-medium">{pr.project}</td>
                        <td className="p-2 text-center">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg  text-xs">{pr.items}</span>
                        </td>
                        <td className="p-2  text-slate-900 dark:text-white">
                          {typeof pr.totalAmount === 'number' ? `₹${pr.totalAmount.toLocaleString()}` : pr.totalAmount}
                        </td>
                        <td className="p-2 text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-slate-400" />
                            {pr.requiredDate}
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className={`${getStatusColor(pr.status)} text-xs py-1 border`}>
                            {pr.status?.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-all ">
                              <Eye size={15} />
                            </button>
                            <button className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all">
                              <Edit2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Purchase Orders Table */}
          {activeTab === "po" && (
            <div className="overflow-x-auto animate-in fade-in duration-500">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs   ">
                    <th className="p-2">Order ID</th>
                    <th className="p-2">Vendor</th>
                    <th className="p-2">PO Number</th>
                    <th className="p-2">Amount</th>
                    <th className="p-2">Expected Delivery</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {purchaseOrders
                    .filter(po =>
                      po.id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                      po.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group text-sm">
                        <td className="p-2  text-slate-900 dark:text-white">#{po.id}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <Truck size={14} className="text-slate-400" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">{po.vendor}</span>
                          </div>
                        </td>
                        <td className="p-2 text-slate-500 dark:text-slate-400 font-medium font-mono">{po.poNumber}</td>
                        <td className="p-2  text-emerald-600 dark:text-emerald-400">
                          {typeof po.amount === 'number' ? `₹${po.amount.toLocaleString()}` : po.amount}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Calendar size={14} />
                            {po.expectedDelivery}
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className={`${getStatusColor(po.status)} text-xs py-1 border `}>
                            {po.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-all ">
                              <Eye size={15} />
                            </button>
                            <button className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-all">
                              <Download size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Vendor Quotes Grid */}
          {activeTab === "quotes" && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {quotes
                .filter(q =>
                  q.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  q.id?.toString().toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((quote) => (
                  <div key={quote.id} className="group relative  border border-slate-200 dark:border-slate-700 p-5  hover: hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                          <FileText size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm  text-slate-900 dark:text-white ">{quote.vendor}</h4>
                          <p className="text-xs  text-slate-400  ">Quote ID: {quote.id}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`${getStatusColor(quote.status)} text-xs py-0.5 border `}>
                        {quote.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded">
                        <p className="text-xs text-slate-400   mb-1">Total Amount</p>
                        <p className="text-sm  text-slate-900 dark:text-white">{quote.amount}</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded">
                        <p className="text-xs text-slate-400   mb-1">Total Items</p>
                        <p className="text-sm  text-slate-900 dark:text-white">{quote.items}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-6 px-1">
                      <Clock size={14} className="text-rose-500" />
                      <span className="text-xs text-slate-500 font-medium">Expires: <span className="text-rose-600 dark:text-rose-400 ">{quote.expiryDate}</span></span>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button className="flex-1 py-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs  transition-all shadow-md shadow-emerald-500/10 active:scale-95">
                        Accept Quote
                      </button>
                      <button className="flex-1 py-2.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs  transition-all active:scale-95">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Shortage Detail Modal */}
      {showShortageDetail && selectedShortage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="relative p-6 border-b dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-blue-600/5 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                  <AlertTriangle size={15} />
                </div>
                <div>
                  <h3 className="text-xl  text-slate-900 dark:text-white">
                    Shortage Request Details
                  </h3>
                  <p className="text-xs  text-blue-600 dark:text-blue-400  ">Reference: {selectedShortage.request_number}</p>
                </div>
              </div>
              <button
                onClick={() => setShowShortageDetail(false)}
                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded  transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <p className="text-xs text-slate-400    mb-1">Project Assignment</p>
                  <p className="text-sm  text-slate-900 dark:text-white">{selectedShortage.project_name || "General/Internal"}</p>
                </div>
                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <p className="text-xs text-slate-400    mb-1">Creation Date</p>
                  <p className="text-sm  text-slate-900 dark:text-white">{new Date(selectedShortage.created_at).toLocaleDateString()}</p>
                </div>
                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <p className="text-xs text-slate-400    mb-1">Status</p>
                  <Badge variant="outline" className={`${getStatusColor(selectedShortage.status)} text-xs border `}>
                    {selectedShortage.status}
                  </Badge>
                </div>
              </div>

            {selectedShortage.remarks && (
              <div className="p-5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-10">
                <p className="text-xs text-amber-600 dark:text-amber-400    mb-2 flex items-center gap-2">
                  <FileText size={14} />
                  Observations / Remarks
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedShortage.remarks}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs  text-slate-400   flex items-center gap-2">
                  <Package size={15} />
                  Requested Materials
                </h4>
                <span className="text-xs  px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500  ">
                  Total {selectedShortage.items?.length || 0} Items
                </span>
              </div>

              <div className=" border border-slate-200 dark:border-slate-800 overflow-hidden ">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800">
                    <tr>
                      <th className="p-2 text-xs  text-slate-400  ">Material Description</th>
                      <th className="p-2 text-xs  text-slate-400   text-center">Required Qty</th>
                      <th className="p-2 text-xs  text-slate-400  ">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingShortageItems ? (
                      <tr><td colSpan="3" className="p-12 text-center text-slate-400 animate-pulse">Fetching line items...</td></tr>
                    ) : (
                      selectedShortage.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900 transition-colors">
                          <td className="p-2">
                            <div className="flex flex-col">
                              <span className=" text-slate-800 dark:text-slate-200 text-sm">{item.item_name}</span>
                              <span className="text-xs text-slate-400 font-medium tracking-tight">SKU: {item.sku || "N/A"}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg  text-sm">
                              {item.required_quantity}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className="text-xs  text-slate-500 ">{item.uom}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={() => setShowShortageDetail(false)}
              className="px-6 py-3 rounded text-sm  text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              Close
            </button>
            <button
              onClick={() => {
                setShowShortageDetail(false);
                handleCreatePOFromShortage(selectedShortage);
              }}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm  transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <ShoppingCart size={15} />
              Convert to Purchase Order
              <ArrowRight size={15} />
            </button>
            </div>
          </div>
        </div>
      )}

{/* PO Creation Modal */ }
<CreatePurchaseOrderModal
  isOpen={showPOModal}
  onClose={() => setShowPOModal(false)}
  source={poSource}
  type="shortage"
  onPOCreated={() => {
    fetchProcurementData();
    setShowPOModal(false);
  }}
/>
    </div >
  );
};

export default ProcurementTasksPage;
