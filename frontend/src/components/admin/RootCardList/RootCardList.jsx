import { useState, useEffect } from 'react';
import axios from '../../../utils/api';
import Button from '../../ui/Button';
import Card, { CardContent } from '../../ui/Card';
import DataTable from '../../ui/DataTable/DataTable';
import Select from '../../ui/Select';
import { STATUS_LEVELS } from '../RootCardForm/constants';
import Swal from 'sweetalert2';
import { showSuccess, showError } from '../../../utils/toastUtils';
import { useAuth } from '../../../context/AuthContext';
import {
  Plus,
  Eye,
  Edit2,
  Trash2,
  Send,
  Loader2,
  Calendar,
  X
} from 'lucide-react';

const RootCardList = ({ 
  onCreateNew, 
  onViewRootCard, 
  onEditRootCard, 
  onSendToDesignEngineering, 
  onSendToProduction, 
  onSendToQuality,
  onReturnToDesignEngineering,
  onUploadQAP,
  initialFilter = 'all',
  refreshTrigger = 0,
  isAccountantView = false
}) => {
  const [rootCards, setRootCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('ongoing');
  const { user } = useAuth();

  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const getUserTimelineDept = () => {
    if (!user) return null;
    const role = (user.role || "").toLowerCase();
    const dept = (user.department || "").toLowerCase();

    if (role.includes("design") || role.includes("engineering") || dept.includes("design") || dept.includes("engineering")) {
      return "Design";
    }
    if (role.includes("production") || dept.includes("production")) {
      return "Production";
    }
    if (role.includes("procurement") || dept.includes("procurement")) {
      return "Procurement";
    }
    if (role.includes("inventory") || dept.includes("inventory")) {
      return "Inventory";
    }
    if (role.includes("quality") || role.includes("qc") || dept.includes("quality") || dept.includes("qc")) {
      return "Quality";
    }
    return null;
  };

  const userTimelineDept = getUserTimelineDept();

  const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`;
  };

  const [selectedCardForTimeline, setSelectedCardForTimeline] = useState(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineForm, setTimelineForm] = useState({
    Design: { startDate: '', endDate: '' },
    Production: { startDate: '', endDate: '' },
    Procurement: { startDate: '', endDate: '' },
    Inventory: { startDate: '', endDate: '' },
    Quality: { startDate: '', endDate: '' }
  });

  useEffect(() => {
    if (selectedCardForTimeline) {
      let timelinesObj = selectedCardForTimeline.timelines;
      if (typeof timelinesObj === 'string') {
        try {
          timelinesObj = JSON.parse(timelinesObj);
        } catch (e) {
          timelinesObj = null;
        }
      }
      
      const defaultTimelines = {
        Design: { startDate: '', endDate: '' },
        Production: { startDate: '', endDate: '' },
        Procurement: { startDate: '', endDate: '' },
        Inventory: { startDate: '', endDate: '' },
        Quality: { startDate: '', endDate: '' }
      };

      if (timelinesObj) {
        setTimelineForm({
          Design: { 
            startDate: timelinesObj.Design?.startDate ? timelinesObj.Design.startDate.substring(0, 10) : '', 
            endDate: timelinesObj.Design?.endDate ? timelinesObj.Design.endDate.substring(0, 10) : '' 
          },
          Production: { 
            startDate: timelinesObj.Production?.startDate ? timelinesObj.Production.startDate.substring(0, 10) : '', 
            endDate: timelinesObj.Production?.endDate ? timelinesObj.Production.endDate.substring(0, 10) : '' 
          },
          Procurement: { 
            startDate: timelinesObj.Procurement?.startDate ? timelinesObj.Procurement.startDate.substring(0, 10) : '', 
            endDate: timelinesObj.Procurement?.endDate ? timelinesObj.Procurement.endDate.substring(0, 10) : '' 
          },
          Inventory: { 
            startDate: timelinesObj.Inventory?.startDate ? timelinesObj.Inventory.startDate.substring(0, 10) : '', 
            endDate: timelinesObj.Inventory?.endDate ? timelinesObj.Inventory.endDate.substring(0, 10) : '' 
          },
          Quality: { 
            startDate: timelinesObj.Quality?.startDate ? timelinesObj.Quality.startDate.substring(0, 10) : '', 
            endDate: timelinesObj.Quality?.endDate ? timelinesObj.Quality.endDate.substring(0, 10) : '' 
          }
        });
      } else {
        setTimelineForm(defaultTimelines);
      }
    }
  }, [selectedCardForTimeline]);

  const handleTimelineSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    const cardId = selectedCardForTimeline.id;
    try {
      setLoading(true);
      await axios.post(`/root-cards/${cardId}/timelines`, { timelines: timelineForm });
      
      setRootCards(rootCards.map(rc => 
        rc.id === cardId ? { ...rc, timelines: timelineForm } : rc
      ));
      
      showSuccess('Timelines saved and notifications sent successfully');
      setIsTimelineModalOpen(false);
      setSelectedCardForTimeline(null);
    } catch (error) {
      console.error('Error saving timelines:', error);
      showError(error.response?.data?.message || 'Failed to save timelines');
    } finally {
      setLoading(false);
    }
  };

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

  const processedRootCards = rootCards.map(rc => {
    const level = STATUS_LEVELS.find(l => l.value === (rc.status || 'RC_CREATED'));
    const statusLabel = level ? level.label : (rc.status || 'Created');
    return {
      ...rc,
      statusLabel
    };
  }).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const isCompleted = (rc) => {
    const status = rc.status || '';
    return status === 'Redy for Dispatch' || status === 'READY_FOR_DELIVERY' || status === 'DELIVERED' || status === 'Ready for Dispatch';
  };

  const ongoingCards = processedRootCards.filter(rc => !isCompleted(rc));
  const completedCards = processedRootCards.filter(rc => isCompleted(rc));
  const displayedCards = activeTab === 'ongoing' ? ongoingCards : completedCards;

  const handleDelete = async (rootCard) => {
    const rootCardId = rootCard.public_id || rootCard.id;
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
        setRootCards(rootCards.filter(rc => (rc.public_id || rc.id) !== rootCardId));
        showSuccess('Route card deleted successfully');
      } catch (error) {
        console.error('Error deleting root card:', error);
        const errorMessage = error.response?.data?.message || 'Failed to delete route card';
        showError(`Error: ${errorMessage}`);
      }
    }
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
      label: 'Project Name & PO Number',
      sortable: true,
      render: (value, row) => (
        <div className="flex flex-col gap-1">
          <span className=" text-slate-900 dark:text-white">
            {value || '-'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {row.po_number || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'project_code',
      label: 'Project Code',
      sortable: true,
    },
    {
      key: 'po_date',
      label: 'PO Date',
      sortable: true,
      render: formatDate,
    },
    {
      key: 'delivery_date',
      label: 'Delivery Date',
      sortable: true,
      render: formatDate,
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
          pending: 'bg-slate-50 text-slate-700 border-slate-200',
          RC_CREATED: 'bg-slate-50 text-slate-700 border-slate-200',
          DESIGN_IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-100',
          QUALITY_QAP_PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
          DESIGN_QAP_REVIEW: 'bg-indigo-50 text-indigo-700 border-indigo-100',
          DESIGN_APPROVED: 'bg-green-50 text-green-700 border-green-100',
          BOM_PREPARATION: 'bg-purple-50 text-purple-700 border-purple-100',
          MATERIAL_PLANNING: 'bg-amber-50 text-amber-700 border-amber-100',
          PURCHASE_ORDER_RELEASED: 'bg-green-50 text-green-700 border-green-100',
          PROCUREMENT_IN_PROGRESS: 'bg-orange-50 text-orange-700 border-orange-100',
          MATERIAL_RECEIVED: 'bg-cyan-50 text-cyan-700 border-cyan-100',
          MATERIAL_QC_PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-100',
          MATERIAL_QC_APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          PRODUCTION_IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-100',
          DIMENSIONAL_QC_PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-100',
          DIMENSIONAL_QC_APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          PAINTING_IN_PROGRESS: 'bg-pink-50 text-pink-700 border-pink-100',
          FINAL_QC_PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-100',
          FINAL_QC_APPROVED: 'bg-green-50 text-green-700 border-green-100',
          READY_FOR_DELIVERY: 'bg-teal-50 text-teal-700 border-teal-100',
          'Production completed and send to Quality fot QC': 'bg-blue-50 text-blue-700 border-blue-100',
          'send to production for complete final produciton': 'bg-indigo-50 text-indigo-700 border-indigo-100',
          'final Prodcution completed and send to quality for final qc': 'bg-emerald-50 text-emerald-700 border-emerald-100',
          'Redy for Dispatch': 'bg-green-50 text-green-700 border-green-100',
        };

        const colorClass = statusColors[value] || statusColors.RC_CREATED;
        const level = STATUS_LEVELS.find(l => l.value === (value || 'RC_CREATED'));
        const statusLabel = level ? level.label : (value || 'Created');

        const statusBadge = (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${colorClass}`}>
            {statusLabel}
          </span>
        );

        if (!isAdmin) {
          return statusBadge;
        }

        return (
          <div className="min-w-[150px] -mt-1">
            <select
              value={value || 'RC_CREATED'}
              onChange={(e) => handleStatusChange(row.id, e.target.value)}
              disabled={updatingStatus === row.id}
              className={`w-full px-2 py-1 border rounded text-[10px] font-medium outline-none cursor-pointer ${colorClass}`}
            >
              {STATUS_LEVELS.map((level) => (
                <option 
                  key={level.value} 
                  value={level.value}
                  className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
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
      render: (value, row) => {
        let hasTimeline = false;
        if (row.timelines) {
          let tObj = row.timelines;
          if (typeof tObj === 'string') {
            try { tObj = JSON.parse(tObj); } catch (e) { tObj = null; }
          }
          if (tObj) {
            hasTimeline = Object.values(tObj).some(dates => dates && (dates.startDate || dates.endDate));
          }
        }

        return (
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
            {!isAccountantView && (
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
            )}
            {!isAccountantView && (isAdmin || (hasTimeline && userTimelineDept)) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCardForTimeline(row);
                  setIsTimelineModalOpen(true);
                }}
                title={isAdmin ? (row.timelines ? "View/Edit Timelines" : "Assign Timelines") : "View Timeline"}
                className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded transition"
              >
                <Calendar className="w-3 h-3 text-indigo-600" />
              </button>
            )}

            {!isAccountantView && onSendToProduction && (row.status === 'DESIGN_QAP_REVIEW' || row.status === 'DESIGN_APPROVED') && (
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
            {!isAccountantView && onSendToQuality && row.status === 'DESIGN_IN_PROGRESS' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSendToQuality(row);
                }}
                title="Send to Quality"
                className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded transition"
              >
                <Send className="w-3 h-3 text-amber-600" />
              </button>
            )}
            {!isAccountantView && onReturnToDesignEngineering && row.status === 'QUALITY_QAP_PENDING' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReturnToDesignEngineering(row);
                }}
                title="Send to Design Engineer"
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition"
              >
                <Send className="w-3 h-3 text-blue-600" />
              </button>
            )}
            {!isAccountantView && onUploadQAP && row.status === 'QUALITY_QAP_PENDING' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUploadQAP(row);
                }}
                title="Upload QAP"
                className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded transition"
              >
                <Plus className="w-3 h-3 text-emerald-600" />
              </button>
            )}
            {!isAccountantView && isAdmin && (
              <>
                {onSendToDesignEngineering && row.status === 'RC_CREATED' && hasTimeline && (
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
                )}
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
      );
    },
  },
  ];

  const uniqueStatusLabels = Array.from(new Set(STATUS_LEVELS.map(l => l.label)));

  return (
    <div className="w-full space-y-4 p-4">
      {/* Header Section */}
      <div className="flex items-center text-xs justify-between mb-2">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white text-left ">
            Route Cards
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-left">
            Manage and track all route cards
          </p>
        </div>
        {isAdmin && !isAccountantView && (
          <Button
            onClick={onCreateNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white  transition-all p-2"
          >
            <Plus className="w-4 h-4" />
            <span className="">New Route Card</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6 mt-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('ongoing')}
          className={`pb-3 text-sm flex items-center transition-all focus:outline-none relative ${
            activeTab === 'ongoing'
              ? 'text-blue-600 dark:text-blue-400 font-semibold border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
          }`}
        >
          Ongoing
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-2 transition-all ${
            activeTab === 'ongoing'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {ongoingCards.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`pb-3 text-sm flex items-center transition-all focus:outline-none relative ${
            activeTab === 'completed'
              ? 'text-blue-600 dark:text-blue-400 font-semibold border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
          }`}
        >
          Completed
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-2 transition-all ${
            activeTab === 'completed'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {completedCards.length}
          </span>
        </button>
      </div>

      {/* DataTable */}
      <div shadow="md" padding="none" className=" dark:border-slate-700 overflow-hidden">
        <CardContent className="p-0  flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm  text-slate-500 animate-pulse">
                Loading route cards...
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={displayedCards}
              emptyMessage="No route cards found"
              sortable={true}
              striped={true}
              hover={true}
              filters={[
                {
                  key: 'statusLabel',
                  label: `Statuses (${displayedCards.length})`,
                  options: uniqueStatusLabels.map(label => {
                    const count = displayedCards.filter(rc => {
                      const level = STATUS_LEVELS.find(l => l.value === (rc.status || 'RC_CREATED'));
                      const cardLabel = level ? level.label : (rc.status || 'Created');
                      return cardLabel === label;
                    }).length;
                    return {
                      value: label,
                      label: `${label} ${count > 0 ? `(${count})` : ''}`
                    };
                  })
                }
              ]}
            />
          )}
        </CardContent>
      </div>

      {/* Department Timelines Modal */}
      {isTimelineModalOpen && selectedCardForTimeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Department Timelines
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Set schedule for <strong className="text-slate-700 dark:text-slate-300">{selectedCardForTimeline.project_name}</strong> ({selectedCardForTimeline.project_code || 'N/A'})
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      <strong>PO Date:</strong> {formatDate(selectedCardForTimeline.po_date)}
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      <strong>Delivery Date:</strong> {formatDate(selectedCardForTimeline.delivery_date)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTimelineModalOpen(false);
                  setSelectedCardForTimeline(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleTimelineSubmit}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div>Department</div>
                  <div>Start Date</div>
                  <div>End Date</div>
                </div>

                {Object.keys(timelineForm)
                  .filter((dept) => isAdmin || dept === userTimelineDept)
                  .map((dept) => (
                    <div key={dept} className="grid grid-cols-3 gap-4 items-center py-2 border-b border-slate-50 dark:border-slate-800/40">
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {dept}
                      </div>
                      <div>
                        <input
                          type="date"
                          value={timelineForm[dept].startDate}
                          disabled={!isAdmin}
                          onChange={(e) => setTimelineForm({
                            ...timelineForm,
                            [dept]: { ...timelineForm[dept], startDate: e.target.value }
                          })}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <input
                          type="date"
                          value={timelineForm[dept].endDate}
                          disabled={!isAdmin}
                          onChange={(e) => setTimelineForm({
                            ...timelineForm,
                            [dept]: { ...timelineForm[dept], endDate: e.target.value }
                          })}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  ))}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <Button
                  type="button"
                  onClick={() => {
                    setIsTimelineModalOpen(false);
                    setSelectedCardForTimeline(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all rounded text-xs"
                >
                  {isAdmin ? 'Cancel' : 'Close'}
                </Button>
                {isAdmin && (
                  <Button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all rounded text-xs"
                  >
                    Save & Notify Departments
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RootCardList;
