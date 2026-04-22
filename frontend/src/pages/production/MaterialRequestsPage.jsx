import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Eye,
  ShoppingCart,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Truck,
  X,
  FileText,
  User,
  Calendar,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import axios from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import DataTable from "../../components/ui/DataTable/DataTable";
import Card, { CardContent } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { toast } from "react-toastify";
import MaterialRequestDetailModal from "../../components/production/MaterialRequestDetailModal";

const MaterialRequestsPage = ({ embed = false }) => {
  const [requests, setRequests] = useState([]);
  const [rootCards, setRootCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rootCardFilter, setRootCardFilter] = useState("all");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isProcurement =
    user?.role?.toLowerCase().includes("procurement") ||
    user?.role?.toLowerCase().includes("admin");

  useEffect(() => {
    fetchRequests();
    fetchRootCards();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rootCardId = params.get("rootCardId");
    if (rootCardId) {
      setRootCardFilter(rootCardId);
    }
  }, [location.search]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/production/material-requests");
      setRequests(response.data.data || []);
    } catch (error) {
      console.error("Error fetching material requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRootCards = async () => {
    try {
      const response = await axios.get("/production/root-cards");
      setRootCards(response.data.rootCards || response.data.data || []);
    } catch (error) {
      console.error("Error fetching root cards:", error);
    }
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      setSubmittingId(requestId);
      await axios.patch(`/production/material-requests/${requestId}/status`, {
        status: newStatus,
      });
      toast.success(`Request ${newStatus} successfully`);
      fetchRequests();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setSubmittingId(null);
    }
  };

  const handlePOProcessing = (request) => {
    if (!request) return;

    navigate("/department/procurement/quotations/sent", {
      state: {
        openModal: true,
        initialData: {
          material_request_id: request.id,
          root_card_id: request.root_card_id,
          type: "outbound",
        },
      },
    });
  };

  const handleViewDetails = (id) => {
    setSelectedRequestId(id);
    setIsDetailModalOpen(true);
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesSearch =
        req.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.project_name &&
          req.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (req.bom_number &&
          req.bom_number.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" || req.status === statusFilter;
      const matchesRootCard =
        rootCardFilter === "all" ||
        req.root_card_id?.toString() === rootCardFilter ||
        req.project_name?.toLowerCase().includes(rootCardFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesRootCard;
    });
  }, [requests, searchTerm, statusFilter, rootCardFilter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock size={12} /> Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="primary" className="flex items-center gap-1">
            <CheckCircle2 size={12} /> Approved
          </Badge>
        );
      case "partially_received":
        return (
          <Badge variant="info" className="flex items-center gap-1">
            <Truck size={12} /> Partial
          </Badge>
        );
      case "received":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 size={12} /> Received
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <XCircle size={12} /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="gray">{status}</Badge>;
    }
  };

  const columns = [
    {
      key: "request_number",
      label: "REQUEST NO",
      render: (val) => <span className=" text-blue-600">{val}</span>,
    },
    {
      key: "bom_number",
      label: "BOM NO",
      render: (val) => <span className="">{val}</span>,
    },
    {
      key: "project_name",
      label: "PROJECT",
      render: (val) => <span className="text-slate-500">{val || "N/A"}</span>,
    },
    {
      key: "created_at",
      label: "DATE",
      render: (val) => new Date(val).toLocaleDateString(),
    },
    {
      key: "status",
      label: "STATUS",
      render: (val) => getStatusBadge(val),
    },
    {
      key: "actions",
      label: "ACTIONS",
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:bg-blue-50 rounded-md text-blue-600 transition-colors"
            title="View Details"
            onClick={() => handleViewDetails(row.id)}
          >
            <Eye size={15} />
          </button>
          {isProcurement && row.status === "approved" && (
            <button
              className=" bg-green-50 hover:bg-green-100 rounded-md text-green-600 text-xs  transition-colors flex items-center gap-1"
              title="PO Processing"
              onClick={() => handlePOProcessing(row)}
            >
              <ArrowRight size={12} />
              <span>PO PROCESSING</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={`${embed ? "p-0 space-y-4" : "p-4 space-y-2 bg-slate-50/50 min-h-screen"}`}>
      {!embed && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl  text-slate-900 flex items-center gap-2">
              Material Requests
            </h2>
            <p className="text-slate-500 text-xs">
              Track and manage material requests sent to procurement
            </p>
          </div>
        </div>
      )}

      <div className={`flex flex-wrap gap-2 items-center ${embed ? "my-3" : ""}`}>
       
        <div className="w-full sm:w-auto">
          <select
            value={rootCardFilter}
            onChange={(e) => setRootCardFilter(e.target.value)}
            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          >
            <option value="all">All Root Cards</option>
            {rootCards.map((rc) => (
              <option key={rc.id} value={rc.id.toString()}>
                {rc.project_name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="partially_received">Partially Received</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <Button
          variant="secondary"
          icon={Clock}
          onClick={fetchRequests}
          className="mb-0"
        >
          Refresh
        </Button>
      </div>

      <div className="border-none  overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredRequests}
          loading={loading}
          emptyMessage="No material requests found."
        />
      </div>

      <MaterialRequestDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        requestId={selectedRequestId}
        onStatusUpdate={fetchRequests}
      />
    </div>
  );
};

export default MaterialRequestsPage;
