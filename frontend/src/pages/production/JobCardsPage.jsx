import React from 'react';

const JobCardsPage = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-600">Job Cards module is currently disabled.</h2>
        <p className="text-slate-500 mt-2">This feature is not being used at the moment.</p>
      </div>
    </div>
  );
};

export default JobCardsPage;

/*
import React, { useState } from 'react';
import {
  Search,
  Filter,
  Clock,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText,
  ClipboardList,
  Activity,
  Zap,
  Play,
  Edit2,
  Trash2,
  CheckCircle,
  Box,
  Layers,
  LayoutDashboard,
  TrendingUp,
  Users,
  AlertTriangle,
  AlertCircle,
  Truck,
  X,
  Package,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CreateJobCardModal from './components/CreateJobCardModal';
import InlineOperationEdit from './components/InlineOperationEdit';
import JobCardDetailsModal from './components/JobCardDetailsModal';
import OutwardChallanForm from '../../components/outsourcing/OutwardChallanForm';
import InwardChallanForm from '../../components/outsourcing/InwardChallanForm';

const JobCardsPage = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOperationId, setEditingOperationId] = useState(null);

  // Outward Challan Modal State
  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOperationForDetails, setSelectedOperationForDetails] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [fetchingMaterials, setFetchingMaterials] = useState(false);

  const navigate = useNavigate();

  const fetchJobCards = () => {};
  const handleStartOperation = () => {};
  const handleDeleteOperation = () => {};

  const handleOpenChallanModal = (operation, workOrder) => {
    setSelectedOperation(operation);
    setSelectedWorkOrder(workOrder);
    setIsChallanModalOpen(true);
  };

  const handleOpenInwardModal = (operation, workOrder) => {
    setSelectedOperation(operation);
    setSelectedWorkOrder(workOrder);
    setIsInwardModalOpen(true);
  };

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 font-bold';
      case 'in_progress': return 'text-orange-500 font-bold';
      case 'ready': return 'text-blue-500 font-bold';
      case 'draft': return 'text-slate-500 font-bold';
      case 'on_hold': return 'text-amber-600 font-bold';
      default: return 'text-slate-500 font-bold';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'in_progress': return 'In-Progress';
      case 'ready': return 'Ready';
      case 'draft': return 'Draft';
      case 'completed': return 'Completed';
      case 'pending': return 'Ready';
      default: return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Draft';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'outsource': return 'text-orange-500';
      case 'subcontract': return 'text-orange-500';
      case 'in-house': return 'text-blue-500';
      default: return 'text-blue-500';
    }
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'outsource': return 'Outsource';
      case 'subcontract': return 'Outsource';
      case 'in-house': return 'In-house';
      default: return 'In-house';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      ... (rest of the file commented out)
    </div>
  );
};

export default JobCardsPage;
*/
