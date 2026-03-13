import { useState, useEffect } from 'react';
import axios from '../../../utils/api';
import Button from '../../ui/Button';
import Card, { CardContent } from '../../ui/Card';
import DataTable from '../../ui/DataTable/DataTable';
import { STATUS_LEVELS } from '../RootCardForm/constants';
import Swal from 'sweetalert2';
import { showSuccess, showError } from '../../../utils/toastUtils';
import { useAuth } from '../../../context/AuthContext';
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  Download,
  Send,
  AlertCircle,
  CheckCircle2,
  Filter,
  ChevronDown,
  Loader2,
} from 'lucide-react';

const RootCardList = ({ onCreateNew, onViewRootCard, onEditRootCard, onSendToDesignEngineering, onSendToProduction, refreshTrigger = 0 }) => {
  const [rootCards, setRootCards] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const { user } = useAuth();

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    const fetchRootCards = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/root-cards', {
          params: { includeSteps: false }
        });
        setRootCards(response.data.rootCards || []);
      } catch (error) {
        console.error('Error fetching root cards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRootCards();
  }, [refreshTrigger]);

  const filteredRootCards = filter === 'all' 
    ? rootCards 
    : rootCards.filter(rootCard => rootCard.status === filter);

  const handleDelete = async (rootCardId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`/root-cards/${rootCardId}`);
        setRootCards(rootCards.filter(rootCard => rootCard.id !== rootCardId));
        showSuccess('Root card deleted successfully');
      } catch (error) {
        console.error('Error deleting root card:', error);
        const errorMessage = error.response?.data?.message || 'Failed to delete root card';
        showError(`Error: ${errorMessage}`);
      }
    }
  };

  const handleDownload = (rootCard) => {
    const data = {
      poNumber: rootCard.po_number,
      projectName: rootCard.project_name,
      status: rootCard.status,
    };

    const csvContent = [
      ['PO Number', data.poNumber],
      ['Project Name', data.projectName],
      ['Status', data.status],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RC_${rootCard.po_number}_${new Date().getTime()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleStatusChange = async (rootCardId, newStatus) => {
    try {
      setUpdatingStatus(rootCardId);
      const response = await axios.patch(`/root-cards/${rootCardId}/status`, {
        status: newStatus
      });
      setRootCards(rootCards.map(rootCard => 
        rootCard.id === rootCardId ? { ...rootCard, status: newStatus } : rootCard
      ));
      showSuccess('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to update status';
      showError(`Error: ${errorMessage}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const columns = [
    {
      key: 'project_name',
      label: 'Project Name & Code',
      sortable: true,
      render: (value, row) => (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-slate-900 dark:text-white">
            {value || '-'}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {row.project_code || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'po_number',
      label: 'PO Number',
      sortable: true,
    },
    {
      key: 'po_date',
      label: 'PO Date',
      sortable: true,
      render: (value) => {
        if (!value) return '-';
        const d = new Date(value);
        if (isNaN(d.getTime())) return '-';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
      },
    },
    {
      key: 'delivery_date',
      label: 'Delivery Date',
      sortable: true,
      render: (value) => {
        if (!value) return '-';
        const d = new Date(value);
        if (isNaN(d.getTime())) return '-';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
      },
    },
    {
      key: 'quantity',
      label: 'QTY',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value, row) => {
        const statusColors = {
          pending: 'bg-slate-100 text-slate-900 border-slate-300',
          RC_CREATED: 'bg-slate-100 text-slate-900 border-slate-300',
          DESIGN_IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
          DESIGN_APPROVED: 'bg-green-50 text-green-700 border-green-200',
          BOM_PREPARATION: 'bg-purple-50 text-purple-700 border-purple-200',
          PROCUREMENT_IN_PROGRESS: 'bg-orange-50 text-orange-700 border-orange-200',
          MATERIAL_RECEIVED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
          MATERIAL_QC_PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          MATERIAL_QC_APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          PRODUCTION_IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          DIMENSIONAL_QC_PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          DIMENSIONAL_QC_APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          PAINTING_IN_PROGRESS: 'bg-pink-50 text-pink-700 border-pink-200',
          FINAL_QC_PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          FINAL_QC_APPROVED: 'bg-green-50 text-green-700 border-green-200',
          READY_FOR_DELIVERY: 'bg-teal-50 text-teal-700 border-teal-200',
        };

        const colorClass = statusColors[value] || statusColors.RC_CREATED;

        if (!isAdmin) {
          const level = STATUS_LEVELS.find(l => l.value === (value || 'RC_CREATED'));
          return (
            <span className={`px-2 py-1 rounded text-xxs font-bold border ${colorClass}`}>
              {level ? level.label : (value || 'Created')}
            </span>
          );
        }

        return (
          <div className={`px-2 py-0.5 rounded border ${colorClass}`}>
            <select
              value={value || 'RC_CREATED'}
              onChange={(e) => handleStatusChange(row.id, e.target.value)}
              disabled={updatingStatus === row.id}
              className="bg-transparent text-xxs font-bold focus:outline-none cursor-pointer disabled:opacity-50 w-full appearance-none outline-none border-none py-0.5"
              style={{ color: 'inherit' }}
            >
              {STATUS_LEVELS.map((level) => (
                <option key={level.value} value={level.value} className="text-slate-900 bg-white">
                  {level.label}
                </option>
              ))}
            </select>
          </div>
        );
      },
    },
    {
      key: 'id',
      label: 'Actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center text-xs gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewRootCard(row);
            }}
            title="View"
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition"
          >
            <Eye className="w-3 h-3 text-blue-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditRootCard(row);
            }}
            title="Edit"
            className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition"
          >
            <Edit2 className="w-3 h-3 text-green-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(row);
            }}
            title="Download"
            className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition"
          >
            <Download className="w-3 h-3 text-purple-600" />
          </button>
          {onSendToProduction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSendToProduction(row);
              }}
              title="Send to Production"
              className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition"
            >
              <Send className="w-3 h-3 text-green-600" />
            </button>
          )}
          {isAdmin && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSendToDesignEngineering(row);
                }}
                title="Send to Design Engineering"
                className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition"
              >
                <Send className="w-3 h-3 text-purple-600" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row.id);
                }}
                title="Delete"
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
              >
                <Trash2 className="w-3 h-3 text-red-600" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-4 p-4">
      {/* Header Section */}
      <div className="flex items-center text-xs justify-between">
        <div>
          <h1 className="text-xl font-bold  text-left">
            Root Cards
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 text-left">
            Manage and track all root cards
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={onCreateNew}
            className="flex items-center text-xs gap-1 text-sm px-3 py-2 h-auto"
          >
            <Plus className="w-3 h-3" />
            New Root Card
          </Button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex items-center text-xs gap-2">
        <Filter className="w-3 h-3 text-slate-500 flex-shrink-0" />
        <div className="flex gap-1 flex-wrap">
          {[
            { value: 'all', label: 'All Root Cards' },
            { value: 'RC_CREATED', label: 'Created' },
            { value: 'DESIGN_IN_PROGRESS', label: 'In Design' },
            { value: 'PRODUCTION_IN_PROGRESS', label: 'In Production' },
            { value: 'READY_FOR_DELIVERY', label: 'Ready' }
          ].map((status) => (
            <button
              key={status.value}
              onClick={() => setFilter(status.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === status.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* DataTable */}
      <Card shadow="md" padding="none" className="bg-white dark:border-slate-700 overflow-hidden">
        <CardContent className="p-0 min-h-[400px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-slate-500 animate-pulse">
                Loading root cards...
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredRootCards}
              emptyMessage="No root cards found"
              sortable={true}
              striped={true}
              hover={true}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RootCardList;
