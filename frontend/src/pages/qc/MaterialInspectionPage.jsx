import React, { useState, useEffect } from "react";
import axios from "../../utils/api";
import { 
  Search, 
  Layers, 
  Package, 
  ChevronDown, 
  ChevronUp, 
  ClipboardCheck,
  Calendar,
  User,
  Tag,
  Hash,
  FileText,
  Filter,
  CheckCircle,
  XCircle,
  Upload,
  AlertTriangle,
  Eye,
  Clock,
  RotateCcw,
  CheckCheck,
  MessageSquare,
  X
} from "lucide-react";
import { renderDimensions } from "../../utils/dimensionUtils";
import { showSuccess, showError } from "../../utils/toastUtils";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getServerUrl } from "../../utils/fileUtils";
import DataTable from "../../components/ui/DataTable/DataTable";

const SerialInspectionTable = ({ item, onUpdateStatus, onRevertStatus, onApproveAll, onRejectAll }) => {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-xs  text-slate-500 flex items-center gap-2">
          <Tag size={12} /> Material Tags (ST Numbers) - {item.serials?.length || 0} Units
        </h5>
        {item.serials?.some(s => s.inspection_status === 'Pending' || s.inspection_status === 'Sent for Inspection') && (
          <div className="flex gap-2">
            <button 
              onClick={() => onApproveAll(item)}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded text-[10px]  hover:bg-emerald-700 transition-colors"
            >
              <CheckCheck size={12} /> Approve All
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="p-2 text-[10px] text-slate-400 uppercase text-center w-10">#</th>
              <th className="p-2 text-[10px] text-slate-400 uppercase">Item Code</th>
              <th className="p-2 text-[10px] text-slate-400 uppercase font-mono">Dimensions</th>
              <th className="p-2 text-[10px] text-indigo-400 uppercase">ST Code</th>
              <th className="p-2 text-[10px] text-slate-400 uppercase">Status</th>
              <th className="p-2 text-[10px] text-slate-400 uppercase text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {item.serials?.map((s, sIdx) => (
              <React.Fragment key={sIdx}>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-2 text-[10px] text-slate-400 text-center">{sIdx + 1}</td>
                  <td className="p-2 text-[10px] text-slate-600">{s.item_code || s.serial_number?.replace('ST-', '')}</td>
                  <td className="p-2 text-[10px] text-slate-400 font-mono">{renderDimensions(s.dimensions)}</td>
                  <td className="p-2 text-[10px]  text-blue-600">{s.serial_number}</td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px]  ${
                      s.inspection_status === 'Accepted' ? 'bg-emerald-50 text-emerald-600' :
                      s.inspection_status === 'Rejected' ? 'bg-red-50 text-red-600' :
                      s.inspection_status === 'Sent for Inspection' ? 'bg-blue-50 text-blue-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {s.inspection_status}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-1.5">
                      {(s.inspection_status === 'Pending' || s.inspection_status === 'Sent for Inspection') && (
                        <>
                          <button 
                            onClick={() => onUpdateStatus(item.grn_id, item.po_item_id, s.serial_number, 'Accepted', item.inspection_type)}
                            className="p-1 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-600 hover:text-white transition-all"
                            title="Accept"
                          >
                            <CheckCircle size={12} />
                          </button>
                          <button 
                            onClick={() => onUpdateStatus(item.grn_id, item.po_item_id, s.serial_number, 'Rejected', item.inspection_type)}
                            className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-600 hover:text-white transition-all"
                            title="Reject"
                          >
                            <XCircle size={12} />
                          </button>
                        </>
                      )}
                      {(s.inspection_status === 'Accepted' || s.inspection_status === 'Rejected') && (
                        <button 
                          onClick={() => onRevertStatus(item.grn_id, item.po_item_id, s.serial_number, item.inspection_type)}
                          className="p-1 bg-slate-50 text-slate-500 rounded hover:bg-slate-500 hover:text-white transition-all"
                          title="Revert"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {s.inspection_status === 'Rejected' && s.rejection_reason && (
                  <tr className="bg-red-50/30">
                    <td colSpan="6" className="p-2">
                      <div className="flex items-start gap-2 text-[10px] text-red-600 italic">
                        <AlertTriangle size={10} className="mt-0.5" />
                        <span>Rejection Reason: {s.rejection_reason}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MaterialInspectionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rootCards, setRootCards] = useState([]);
  const [selectedRootCard, setSelectedRootCard] = useState(null);
  const [selectedRootCardId, setSelectedRootCardId] = useState(searchParams.get("rootCardId") || "");
  const [grnNumber, setGrnNumber] = useState(searchParams.get("grnNumber") || "");
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRC, setLoadingRC] = useState(true);
  const [expandedItem, setExpandedItem] = useState(null);
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    grnId: null,
    poItemId: null,
    serialNumber: null,
    inspectionType: null,
    reason: ""
  });

  useEffect(() => {
    fetchReadyRootCards();
  }, []);

  useEffect(() => {
    // Initial fetch of materials when rootCards are loaded OR search params change
    if (rootCards.length > 0) {
      if (selectedRootCardId) {
        const rc = rootCards.find(card => String(card.id) === String(selectedRootCardId));
        if (rc) setSelectedRootCard(rc);
      }
      fetchMaterials(selectedRootCardId, grnNumber);
    } else if (rootCards.length === 0 && !loadingRC) {
      // Fallback if no root cards but we still want to fetch all materials
      fetchMaterials(selectedRootCardId, grnNumber);
    }
  }, [rootCards, loadingRC, selectedRootCardId, grnNumber]);

  const fetchReadyRootCards = async () => {
    try {
      setLoadingRC(true);
      const response = await axios.get("/qc/portal/ready-root-cards");
      setRootCards(response.data);
    } catch (error) {
      console.error("Error fetching root cards:", error);
      showError("Failed to load root cards");
    } finally {
      setLoadingRC(false);
    }
  };

  const fetchMaterials = async (rootCardId, grnNum, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await axios.get("/qc/portal/materials-for-inspection", {
        params: { 
          rootCardId: rootCardId || undefined,
          grnNumber: grnNum || undefined
        }
      });
      
      // Enhance materials with fallback dimensions for serials
      const enhancedMaterials = response.data.map(item => {
        const itemDimensions = {
          length: item.length || item.length_mm || 0,
          width: item.width || item.width_mm || 0,
          thickness: item.thickness || item.thickness_mm || 0,
          diameter: item.diameter || item.diameter_mm || 0,
          outer_diameter: item.outer_diameter || item.outerDiameter || 0,
          height: item.height || item.height_mm || 0,
          side_s: item.side_s || item.sideS || 0,
          side1: item.side1 || item.sideS1 || 0,
          side2: item.side2 || item.sideS2 || 0,
          web_thickness: item.web_thickness || item.tw || 0,
          flange_thickness: item.flange_thickness || item.tf || 0,
          item_group: item.item_group || item.itemGroup || ""
        };

        const enhancedSerials = (item.serials || []).map(s => {
          const serialDimensions = {
            ...(s.dimensions || {}),
            item_group: s.item_group || s.itemGroup || itemDimensions.item_group
          };
          const hasSerialDims = Object.values(serialDimensions).some(v => v !== null && v !== 0 && v !== '' && typeof v === 'number');
          
          return {
            ...s,
            dimensions: hasSerialDims ? serialDimensions : itemDimensions
          };
        });

        return { ...item, ...itemDimensions, serials: enhancedSerials };
      });

      setMaterials(enhancedMaterials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      showError("Failed to load materials for inspection");
    } finally {
      if (!silent) setLoading(false);
    }
  };


  const handleRootCardChange = (id) => {
    setSelectedRootCardId(id);
    const rc = rootCards.find(card => String(card.id) === String(id));
    if (rc) {
      setSelectedRootCard(rc);
    } else {
      setSelectedRootCard(null);
    }
    setExpandedItem(null);
  };

  const handleGrnFilterChange = (e) => {
    setGrnNumber(e.target.value);
    setExpandedItem(null);
  };

  const handleBulkStatusUpdate = async (grnId, poItemId, serialsToUpdate, status, inspectionType, customNotes = null) => {
    // 1. Optimistic Update
    const previousMaterials = [...materials];
    const updatedMaterials = materials.map(item => {
      if (Number(item.grn_id) === Number(grnId) && Number(item.po_item_id) === Number(poItemId)) {
        const updatedSerials = item.serials.map(s => {
          if (serialsToUpdate.includes(s.serial_number)) {
            return { ...s, inspection_status: status, rejection_reason: status === 'Rejected' ? customNotes : null };
          }
          return s;
        });
        
        // Re-calculate item-level completion status logic (similar to backend logic used in materials fetch)
        const allProcessed = updatedSerials.length > 0 && updatedSerials.every(s => s.inspection_status === 'Accepted' || s.inspection_status === 'Rejected');
        // Simple logic for UI: if all serials processed, mark as QC Completed
        const newStatus = allProcessed ? 'QC Completed' : 'QC Pending';
        
        return { ...item, serials: updatedSerials, status: newStatus };
      }
      return item;
    });
    
    setMaterials(updatedMaterials);

    try {
      // Don't set global loading to true to avoid spinner flash
      await axios.post("/qc/inspection/submit", {
        grn_id: grnId,
        po_item_id: poItemId,
        inspection_type: inspectionType || "Inhouse",
        results: serialsToUpdate.map(serialNumber => ({
          serial_number: serialNumber,
          status: status,
          notes: customNotes || `${serialsToUpdate.length > 1 ? 'Bulk ' : ''}${status} from material inspection list`
        })),
        remarks: `${serialsToUpdate.length === 1 ? 'ST ' + serialsToUpdate[0] : serialsToUpdate.length + ' ST numbers'} marked as ${status}`
      });
      showSuccess(`${serialsToUpdate.length === 1 ? 'ST ' + serialsToUpdate[0] : serialsToUpdate.length + ' items'} marked as ${status}`);
      // Refresh data locally is already done optimistically
    } catch (error) {
      console.error("Error updating status:", error);
      showError(`Failed to update status for ${serialsToUpdate.length === 1 ? serialsToUpdate[0] : 'items'}`);
      // Rollback on error
      setMaterials(previousMaterials);
    }
  };

  const handleQuickStatusUpdate = async (grnId, poItemId, serialNumber, status, inspectionType) => {
    if (status === 'Rejected' && (!inspectionType || inspectionType === 'Inhouse')) {
      setRejectionModal({
        isOpen: true,
        grnId,
        poItemId,
        serialNumber,
        inspectionType,
        reason: ""
      });
    } else {
      handleBulkStatusUpdate(grnId, poItemId, [serialNumber], status, inspectionType);
    }
  };

  const submitRejection = () => {
    if (!rejectionModal.reason.trim()) {
      showError("Please enter a rejection reason");
      return;
    }
    handleBulkStatusUpdate(
      rejectionModal.grnId,
      rejectionModal.poItemId,
      [rejectionModal.serialNumber],
      'Rejected',
      rejectionModal.inspectionType,
      rejectionModal.reason
    );
    setRejectionModal({ ...rejectionModal, isOpen: false, reason: "" });
  };

  const handleApproveAll = (item) => {
    const pendingSerials = item.serials
      ?.filter(s => s.inspection_status === 'Pending' || s.inspection_status === 'Sent for Inspection')
      .map(s => s.serial_number);
    
    if (pendingSerials && pendingSerials.length > 0) {
      handleBulkStatusUpdate(item.grn_id, item.po_item_id, pendingSerials, 'Accepted', item.inspection_type);
    }
  };

  const handleRevertStatus = (grnId, poItemId, serialNumber, inspectionType) => {
    handleBulkStatusUpdate(grnId, poItemId, [serialNumber], 'Pending', inspectionType);
  };

  const handleConsolidatedUpload = async (file, grnId, poItemId, type) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append(type === 'Accepted' ? 'accepted_doc' : 'rejected_doc', file);
      formData.append('grn_id', grnId);
      formData.append('po_item_id', poItemId);
      formData.append('inspection_type', 'Outsource');
      formData.append('remarks', `Consolidated ${type} items report uploaded for item`);
      formData.append('results', JSON.stringify([])); // Header update only

      await axios.post("/qc/outsource/submit-results", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showSuccess(`${type} items report uploaded successfully`);
      fetchMaterials(selectedRootCardId, grnNumber);
    } catch (error) {
      console.error("Error uploading consolidated document:", error);
      showError("Failed to upload report");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeQC = async (grnId) => {
    try {
      setLoading(true);
      await axios.post(`/qc/grn/${grnId}/finalize`);
      showSuccess("QC Finalized successfully");
      fetchMaterials(selectedRootCardId, grnNumber);
      fetchReadyRootCards(); // Refresh the dropdown list as well
    } catch (error) {
      console.error("Error finalizing QC:", error);
      showError(error.response?.data?.message || "Failed to finalize QC");
    } finally {
      setLoading(false);
    }
  };

  const rootCardOptions = rootCards.map(rc => ({
    value: rc.id,
    label: rc.projectName
  }));

  const columns = [
    {
      header: "Material Info",
      accessor: "material_name",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded text-slate-500">
            <Package size={15} />
          </div>
          <div>
            <h4 className="text-xs  text-slate-900">{val}</h4>
            <p className="text-[10px] text-slate-500 uppercase">{row.item_group}</p>
          </div>
        </div>
      )
    },
    {
      header: "Reference",
      accessor: "grn_number",
      render: (val, row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <FileText size={12} className="text-slate-400" />
            <span>{val}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Tag size={12} className="text-slate-400" />
            <span>PO: {row.po_number}</span>
          </div>
        </div>
      )
    },
    {
      header: "Dimensions",
      accessor: "id",
      render: (_, row) => (
        <span className="text-xs text-blue-600 font-mono">
          {renderDimensions(row)}
        </span>
      )
    },
    {
      header: "Received",
      accessor: "received_qty",
      className: "text-center",
      render: (val) => <span className="text-xs  text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{val}</span>
    },
    {
      header: "Status",
      accessor: "status",
      className: "text-right",
      render: (status) => (
        <span className={`px-2 py-0.5 rounded text-[10px]  border ${
          status === 'QC Completed' 
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
            : 'bg-purple-50 text-purple-600 border-purple-100'
        }`}>
          {(status || 'QC Pending').toUpperCase()}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-lg  text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="text-blue-600" size={18} />
            Material Inspection
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Filter materials by project or GRN number to inspect incoming items
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800 p-4 rounded border border-slate-100 dark:border-slate-700 shadow-sm">
        <SearchableSelect
          label="Filter by Root Card (Project)"
          options={rootCardOptions}
          value={selectedRootCardId}
          onChange={handleRootCardChange}
          placeholder="All Projects"
          className="w-full"
          disabled={loadingRC}
        />
        <div className="flex flex-col">
          <label className="text-xs  text-slate-700 dark:text-slate-300 mb-1.5">
            Filter by GRN Number
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="Enter GRN number (e.g. GRN-2024-001)"
              value={grnNumber}
              onChange={handleGrnFilterChange}
            />
          </div>
        </div>
      </div>

      <DataTable 
        columns={columns}
        data={materials}
        loading={loading}
        searchPlaceholder="Search material, GRN or PO..."
        expandableRow={(row) => (
          <SerialInspectionTable 
            item={row} 
            onUpdateStatus={handleQuickStatusUpdate}
            onRevertStatus={handleRevertStatus}
            onApproveAll={handleApproveAll}
          />
        )}
      />

      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm  text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={16} />
                Rejection Reason
              </h3>
              <button onClick={() => setRejectionModal({ ...rejectionModal, isOpen: false })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-3 bg-red-50 rounded border border-red-100">
                <p className="text-[10px] text-red-500 uppercase  mb-1">Item Being Rejected</p>
                <p className="text-xs  text-red-700">{rejectionModal.serialNumber}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs  text-slate-700 dark:text-slate-300">Why is this item being rejected?</label>
                <textarea
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-red-500/20 outline-none transition-all resize-none"
                  rows={4}
                  placeholder="E.g. Dimensional deviation, surface defects, material grade mismatch..."
                  value={rejectionModal.reason}
                  onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setRejectionModal({ ...rejectionModal, isOpen: false })}
                className="px-4 py-2 text-xs  text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitRejection}
                className="px-6 py-2 bg-red-600 text-white rounded text-xs  hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition-all"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialInspectionPage;
