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
} from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import MaterialRequestsPage from "../production/MaterialRequestsPage";
import CreatePurchaseOrderModal from "../inventory/CreatePurchaseOrderModal";
import "../../styles/TaskPage.css";

const ProcurementTasksPage = () => {
  const [searchParams] = useSearchParams();
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [shortageRequests, setShortageRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "material-requests");
  const [showNewForm, setShowNewForm] = useState(false);
  
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

  if (loading) {
    return (
      <div className="flex items-center text-xs justify-center py-12">
        <p className="text-slate-600">Loading procurement data...</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "placed":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const stats = {
    totalPR: purchaseRequests.length,
    totalPO: purchaseOrders.length,
    totalQuotes: quotes.length,
    pendingAmount: purchaseOrders.filter((po) => po.status === "placed").length,
  };

  return (
    <div className="task-page-container">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Purchase Requests
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white text-xs mt-1">
              {stats.totalPR}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Purchase Orders
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white text-xs mt-1">
              {stats.totalPO}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Vendor Quotes
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white text-xs mt-1">
              {stats.totalQuotes}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Pending Orders
            </p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {stats.pendingAmount}
            </p>
          </div>
        </Card>
      </div>

      {/* Tab and Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("material-requests")}
            className={`p-2 rounded font-medium transition-colors whitespace-nowrap ${
              activeTab === "material-requests"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 dark:bg-slate-700  dark: hover:"
            }`}
          >
            Material Requests
          </button>
          <button
            onClick={() => setActiveTab("shortage-requests")}
            className={`p-2 rounded font-medium transition-colors whitespace-nowrap ${
              activeTab === "shortage-requests"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 dark:bg-slate-700  dark: hover:"
            }`}
          >
            Shortage Requests
          </button>
          <button
            onClick={() => setActiveTab("pr")}
            className={`p-2 rounded font-medium transition-colors whitespace-nowrap ${
              activeTab === "pr"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 dark:bg-slate-700  dark: hover:"
            }`}
          >
            Purchase Requests
          </button>
          <button
            onClick={() => setActiveTab("po")}
            className={`p-2 rounded font-medium transition-colors whitespace-nowrap ${
              activeTab === "po"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 dark:bg-slate-700  dark: hover:"
            }`}
          >
            Purchase Orders
          </button>
          <button
            onClick={() => setActiveTab("quotes")}
            className={`p-2 rounded font-medium transition-colors whitespace-nowrap ${
              activeTab === "quotes"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 dark:bg-slate-700  dark: hover:"
            }`}
          >
            Vendor Quotes
          </button>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center text-xs gap-2 p-2 rounded text-xs bg-slate-200 dark:bg-slate-700  dark: hover: transition-colors">
            <Filter size={18} />
            Filter
          </button>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="flex items-center text-xs gap-2 p-2 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            New{" "}
            {activeTab === "pr" ? "PR" : activeTab === "po" ? "PO" : "Quote"}
          </button>
        </div>
      </div>

      {/* Material Requests */}
      {activeTab === "material-requests" && <MaterialRequestsPage />}

      {/* Shortage Requests */}
      {activeTab === "shortage-requests" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Request No
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    GRN No
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Root Card
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {shortageRequests.length > 0 ? (
                  shortageRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                    >
                      <td className="p-3 text-sm font-medium text-blue-600">{req.request_number}</td>
                      <td className="p-3 text-sm font-medium">{req.bom_number || "N/A"}</td>
                      <td className="p-3 text-sm font-medium">{req.root_card_id || "N/A"}</td>
                      <td className="p-3 text-sm">{req.project_name}</td>
                      <td className="p-3 text-sm">{new Date(req.created_at).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Badge className={getStatusColor(req.status)}>
                          {req.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button 
                            title="View Details"
                            onClick={() => handleViewShortageDetail(req)}
                            className="p-2 rounded bg-slate-200 dark:bg-slate-700 hover: transition-colors"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            title="Create PO"
                            onClick={() => handleCreatePOFromShortage(req)}
                            className="p-2 rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300 hover:bg-emerald-200 transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500 italic">
                      No shortage requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Purchase Requests */}
      {activeTab === "pr" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    PR Number
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Root Card
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Required Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchaseRequests.map((pr) => (
                  <tr
                    key={pr.id}
                    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                  >
                    <td className="p-1 text-sm font-medium">{pr.id}</td>
                    <td className="p-1 text-sm text-slate-700 dark:text-slate-300">
                      {pr.project}
                    </td>
                    <td className="p-1 text-sm text-center font-medium">
                      {pr.items}
                    </td>
                    <td className="p-1 text-sm font-medium">
                      {pr.totalAmount}
                    </td>
                    <td className="p-1 text-sm text-slate-700 dark:text-slate-300">
                      {pr.requiredDate}
                    </td>
                    <td className="p-1">
                      <Badge className={getStatusColor(pr.status)}>
                        {pr.status.charAt(0).toUpperCase() + pr.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-1">
                      <div className="flex gap-2">
                        <button className="p-2 rounded bg-slate-200 dark:bg-slate-700 hover: transition-colors">
                          <Eye size={16} />
                        </button>
                        <button className="p-2 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 transition-colors">
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Purchase Orders */}
      {activeTab === "po" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    PO ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Vendor PO
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Expected Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr
                    key={po.id}
                    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs"
                  >
                    <td className="p-1 text-sm font-medium">{po.id}</td>
                    <td className="p-1 text-sm text-slate-700 dark:text-slate-300">
                      {po.vendor}
                    </td>
                    <td className="p-1 text-sm text-slate-700 dark:text-slate-300">
                      {po.poNumber}
                    </td>
                    <td className="p-1 text-sm font-medium">{po.amount}</td>
                    <td className="p-1 text-sm text-slate-700 dark:text-slate-300">
                      {po.expectedDelivery}
                    </td>
                    <td className="p-1">
                      <Badge className={getStatusColor(po.status)}>
                        {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-1">
                      <div className="flex gap-2">
                        <button className="p-2 rounded bg-slate-200 dark:bg-slate-700 hover: transition-colors">
                          <Eye size={16} />
                        </button>
                        <button className="p-2 rounded bg-slate-200 dark:bg-slate-700 hover: transition-colors">
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Vendor Quotes */}
      {activeTab === "quotes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quotes.map((quote) => (
            <Card key={quote.id}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold  dark:">{quote.vendor}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Quote: {quote.id}
                    </p>
                  </div>
                  <Badge className={getStatusColor(quote.status)}>
                    {quote.status.charAt(0).toUpperCase() +
                      quote.status.slice(1)}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4 p-3 bg-slate-50 dark:bg-slate-700 rounded">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      Amount:
                    </span>
                    <span className="font-bold  dark:">{quote.amount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      Items:
                    </span>
                    <span className="font-bold  dark:">{quote.items}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      Expires:
                    </span>
                    <span className="font-bold  dark:">{quote.expiryDate}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button className="flex-1 px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium">
                    Accept
                  </button>
                  <button className="flex-1 px-3 py-2 rounded bg-slate-200 dark:bg-slate-700  dark: hover: transition-colors text-sm font-medium">
                    View Details
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Shortage Detail Modal */}
      {showShortageDetail && selectedShortage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b flex justify-between items-center bg-amber-50 dark:bg-amber-900/20">
              <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                <Package size={20} />
                Shortage Request: {selectedShortage.request_number}
              </h3>
              <button onClick={() => setShowShortageDetail(false)} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                <X size={20} className="text-amber-800 dark:text-amber-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 font-medium">Project</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedShortage.project_name || "General"}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Date Created</p>
                  <p className="font-bold text-slate-900 dark:text-white">{new Date(selectedShortage.created_at).toLocaleDateString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 font-medium">Remarks</p>
                  <p className="text-slate-700 dark:text-slate-300 italic">{selectedShortage.remarks || "No remarks"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Requested Items</h4>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-2 font-bold text-slate-600">Material Name</th>
                        <th className="px-4 py-2 font-bold text-slate-600 text-center">Qty</th>
                        <th className="px-4 py-2 font-bold text-slate-600">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {loadingShortageItems ? (
                        <tr><td colSpan="3" className="p-4 text-center">Loading items...</td></tr>
                      ) : (
                        selectedShortage.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                            <td className="px-4 py-3 font-medium">{item.item_name}</td>
                            <td className="px-4 py-3 text-center font-bold text-blue-600">{item.required_quantity}</td>
                            <td className="px-4 py-3">{item.uom}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 dark:bg-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setShowShortageDetail(false)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setShowShortageDetail(false);
                  handleCreatePOFromShortage(selectedShortage);
                }}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
              >
                Create Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Creation Modal */}
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
    </div>
  );
};

export default ProcurementTasksPage;
