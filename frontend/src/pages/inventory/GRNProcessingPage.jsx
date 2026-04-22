import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import { showSuccess, showError } from "../../utils/toastUtils";
import {
  Package,
  Search,
  Filter,
  CheckCircle,
  X,
  Eye,
  Clock,
  ShieldCheck,
  RefreshCw,
  Calendar,
  Warehouse,
  ClipboardCheck,
  FileText,
  Save,
  List,
  Printer,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Zap,
  Edit,
} from "lucide-react";
import { renderDimensions } from "../../utils/dimensionUtils";
import taskService from "../../utils/taskService";
import DataTable from "../../components/ui/DataTable/DataTable";

const renderOriginalDimensions = (item) => {
  if (!item) return "-";
  const originalItem = {
    item_group: item.item_group,
    length: item.length_original,
    width: item.width_original,
    thickness: item.thickness_original,
    diameter: item.diameter_original,
    outer_diameter: item.outer_diameter_original,
    height: item.height_original,
    side1: item.side1_original,
    side2: item.side2_original,
    web_thickness: item.web_thickness_original,
    flange_thickness: item.flange_thickness_original,
  };
  return renderDimensions(originalItem);
};

const ItemGroupOptions = [
  "Plates", "Round Bar", "Pipe", "Square Bar", "Rectangular Bar", 
  "Square Tube", "Rectangular Tube", "C Channel", "Angle", 
  "I Beam", "H Beam", "Bought Out", "Paint",
];

const MaterialTypeOptions = [
  { label: "Mild Steel / Carbon Steel", value: "7.85" },
  { label: "Stainless Steel (304/316)", value: "8.00" },
  { label: "Aluminum", value: "2.70" },
  { label: "Copper", value: "8.96" },
  { label: "Chemical", value: "1.10" }
];

const GRNDetailTable = ({ grnId }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await axios.get(`/department/inventory/purchase-orders/receipts/${grnId}`);
        setDetails(response.data);
      } catch (error) {
        console.error("Error fetching GRN details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [grnId]);

  if (loading) return <div className="p-4 text-center text-xs text-slate-500">Loading details...</div>;
  if (!details) return <div className="p-4 text-center text-xs text-red-500">Failed to load details.</div>;

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Logistics Context</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">PO Reference:</span>
              <span className="">{details.grn?.poNumber}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Supplier:</span>
              <span className="">{details.grn?.vendor}</span>
            </div>
            {details.grn?.project_name && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Project:</span>
                <span className=" text-blue-600">{details.grn?.project_name}</span>
              </div>
            )}
          </div>
        </div>
        
        {details.inspection && (
          <div className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Inspection Record</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Decision:</span>
                <span className=" text-blue-600">{details.inspection.status}</span>
              </div>
              <div className="text-xs text-slate-500 italic mt-1">
                "{details.inspection.remarks || 'No remarks'}"
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Summary</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Net Received:</span>
              <span className="">{details.grn?.receivedQuantity} Units</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Received Date:</span>
              <span className="">{new Date(details.grn?.receivedDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="p-2 text-xs text-slate-400 uppercase">Item Name / Group</th>
              <th className="p-2 text-xs text-slate-400 uppercase text-center">Ordered</th>
              <th className="p-2 text-xs text-slate-400 uppercase text-center">Accepted</th>
              <th className="p-2 text-xs text-slate-400 uppercase text-center">Rejected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {(details.items || []).map((item, idx) => {
              const isQCCompleted = ['qc_completed', 'qc_finalized', 'material_released', 'partially_released'].includes(details.grn?.status);
              const acceptedQty = (item.serials || []).filter(st => st.inspection_status === 'Accepted').length;
              const rejectedQty = (item.serials || []).filter(st => st.inspection_status === 'Rejected').length;
              
              const finalAccepted = (item.serials && item.serials.length > 0) ? acceptedQty : (isQCCompleted ? Number(item.received_qty || 0) : 0);
              const finalRejected = (item.serials && item.serials.length > 0) ? rejectedQty : 0;
              const isExpanded = expandedItem === idx;

              return (
                <React.Fragment key={idx}>
                  <tr 
                    className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/20' : ''}`}
                    onClick={() => setExpandedItem(isExpanded ? null : idx)}
                  >
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${isExpanded ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                          <Package size={14} />
                        </div>
                        <div>
                          <p className="text-xs ">{item.material_name}</p>
                          <p className="text-xs text-blue-600">{renderDimensions(item)}</p>
                          <p className="text-[9px] text-slate-400">{item.item_code} • {item.item_group}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-center text-xs text-slate-600">{parseFloat(item.quantity || 0)}</td>
                    <td className="p-2 text-center text-xs p-2 text-emerald-600">{finalAccepted}</td>
                    <td className="p-2 text-center text-xs p-2 text-red-600">{finalRejected}</td>
                  </tr>
                  {isExpanded && item.serials && item.serials.length > 0 && (
                    <tr>
                      <td colSpan="4" className="p-2 bg-slate-50/50">
                        <div className="border border-slate-100 rounded overflow-hidden">
                          <table className="w-full text-left bg-white">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="p-2 text-[9px] text-slate-400 uppercase text-center w-10">#</th>
                                <th className="p-2 text-[9px] text-slate-400 uppercase">Item Code</th>
                                <th className="p-2 text-[9px] text-indigo-400 uppercase">ST Code</th>
                                <th className="p-2 text-[9px] text-slate-400 uppercase text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {item.serials.map((st, sIdx) => (
                                <tr key={sIdx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-2 text-xs text-slate-400 text-center">{sIdx + 1}</td>
                                  <td className="p-2 text-xs text-slate-600">{st.item_code || item.item_code}</td>
                                  <td className="p-2 text-xs  text-indigo-600">{st.serial_number}</td>
                                  <td className="p-2 text-right">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px]  ${
                                      st.inspection_status === 'Accepted' ? 'bg-emerald-50 text-emerald-600' :
                                      st.inspection_status === 'Rejected' ? 'bg-red-50 text-red-600' :
                                      'bg-amber-50 text-amber-600'
                                    }`}>
                                      {st.inspection_status || 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const GRNProcessingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const poId = searchParams.get("poId");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [grnData, setGrnData] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [taskId, setTaskId] = useState(null);

  // New GRN Creation State
  const [poData, setPoData] = useState(null);
  const [loadingPO, setLoadingPO] = useState(false);
  const [grnForm, setGrnForm] = useState({
    posting_date: new Date().toISOString().split("T")[0],
    notes: "",
    items: [],
  });
  const [expandedItem, setExpandedItem] = useState(null);

  const calculateItemWeight = useCallback((item) => {
    const group = (item.item_group || "").toLowerCase();
    const density = parseFloat(item.density) || 0;
    if (density <= 0) return 0;

    const L = parseFloat(item.length) || 0;
    const W = parseFloat(item.width) || 0;
    const T = parseFloat(item.thickness) || 0;
    const D = parseFloat(item.diameter) || 0;
    const OD = parseFloat(item.outer_diameter) || 0;
    const H = parseFloat(item.height) || 0;
    const S1 = parseFloat(item.side1) || 0;
    const S2 = parseFloat(item.side2) || 0;
    const Tw = parseFloat(item.web_thickness) || 0;
    const Tf = parseFloat(item.flange_thickness) || 0;

    let unitWeight = 0;

    if (group === "plates" || group === "plate") {
      unitWeight = (L * W * T * density) / 1000000;
    } else if (group === "round bar") {
      unitWeight = (Math.PI * Math.pow(D / 2, 2) * L * density) / 1000000;
    } else if (group === "pipe") {
      const outerRadius = OD / 2;
      const innerRadius = outerRadius - T;
      if (innerRadius >= 0) {
        unitWeight = (Math.PI * (Math.pow(outerRadius, 2) - Math.pow(innerRadius, 2)) * L * density) / 1000000;
      }
    } else if (group === "square bar" || group === "sq bar") {
      unitWeight = (S1 * S1 * L * density) / 1000000;
    } else if (group === "rectangular bar" || group === "rec bar") {
      unitWeight = (W * T * L * density) / 1000000;
    } else if (group === "square tube" || group === "sq tube") {
      const outerArea = S1 * S1;
      const innerSide = S1 - (2 * T);
      const innerArea = innerSide > 0 ? innerSide * innerSide : 0;
      unitWeight = (outerArea - innerArea) * L * density / 1000000;
    } else if (group === "rectangular tube" || group === "rec tube") {
      const outerArea = W * H;
      const innerW = W - (2 * T);
      const innerH = H - (2 * T);
      const innerArea = (innerW > 0 && innerH > 0) ? innerW * innerH : 0;
      unitWeight = (outerArea - innerArea) * L * density / 1000000;
    } else if (group === "angle") {
      unitWeight = ((S1 + S2 - T) * T * L * density) / 1000000;
    } else if (group === "c channel") {
      unitWeight = ((H * Tw) + (2 * W * Tf)) * L * density / 1000000;
    } else if (group.includes("beam")) {
      unitWeight = ((2 * W * Tf) + (H - (2 * Tf)) * Tw) * L * density / 1000000;
    }

    return unitWeight;
  }, []);

  useEffect(() => {
    if (poId) {
      fetchPODetails(poId);
    }
  }, [poId]);

  const generateItemCode = (materialName) => {
    let typeCode = "GEN";
    const upperName = (materialName || "").toUpperCase();
    if (upperName.includes("PLATE")) typeCode = "PLT";
    else if (upperName.includes("ROUND BAR") || upperName.includes("RB") || upperName.includes("Ø") || upperName.includes("DIA")) typeCode = "RB";
    else if (upperName.includes("PIPE")) typeCode = "PIPE";

    // Try 3-dimension pattern (e.g. 12000X1500X25)
    let sizeMatch = upperName.match(/(\d+)\s*[X]\s*(\d+)\s*[X]\s*(\d+)/);
    let shortSize = "SIZE";
    
    if (sizeMatch) {
      const dims = [sizeMatch[1], sizeMatch[2], sizeMatch[3]].map(d => {
        const val = parseInt(d);
        return (val >= 100 && val % 100 === 0) ? (val / 100).toString() : val.toString();
      });
      shortSize = dims.join("x");
    } else {
      // Try 2-dimension pattern (e.g. Ø80 X 3000)
      sizeMatch = upperName.match(/(?:Ø|DIA|RB|ROUND BAR)?\s*(\d+)\s*[X]\s*(\d+)/);
      if (sizeMatch) {
        const dims = [sizeMatch[1], sizeMatch[2]].map(d => {
          const val = parseInt(d);
          return (val >= 100 && val % 100 === 0) ? (val / 100).toString() : val.toString();
        });
        shortSize = dims.join("x");
      }
    }
    return `${typeCode}-${shortSize}`;
  };

  const fetchPODetails = async (id) => {
    setLoadingPO(true);
    try {
      const response = await axios.get(`/department/inventory/purchase-orders/${id}`);
      setPoData(response.data);
      
      const initialItems = (response.data.items || []).map(item => {
        const matName = item.material_name || item.vendor_material_name || item.itemName || item.item_name || item.name || item.description;
        return {
          po_item_id: item.id,
          material_name: '', // Initially empty as requested
          material_name_original: matName,
          item_code: generateItemCode(matName),
          item_code_original: generateItemCode(matName),
          item_group: item.item_group || "",
          ordered_qty: parseFloat(item.quantity) || 0,
          received_qty: parseFloat(item.quantity) || 0, // Default to full receipt
          unit: item.unit || item.uom || "Units",
          rate_per_kg: parseFloat(item.rate_per_kg || item.rate || item.unit_price) || 0,
          total_weight: parseFloat(item.total_weight) || 0,
          unit_weight: parseFloat(item.unit_weight) || (item.quantity > 0 ? (parseFloat(item.total_weight) || 0) / parseFloat(item.quantity) : 0),
          received_weight: parseFloat(item.total_weight) || 0,
          rate: parseFloat(item.rate || item.unit_price || item.rate_per_kg) || 0,
          amount: parseFloat(item.amount) || 0,
          // Store original dimensions for display
          length_original: item.length || null,
          width_original: item.width || null,
          thickness_original: item.thickness || null,
          diameter_original: item.diameter || null,
          outer_diameter_original: item.outer_diameter || null,
          height_original: item.height || null,
          side1_original: item.side1 || null,
          side2_original: item.side2 || null,
          web_thickness_original: item.web_thickness || item.tw || null,
          flange_thickness_original: item.flange_thickness || item.tf || null,
          // New editable dimensions start empty
          length: '',
          width: '',
          thickness: '',
          diameter: '',
          outer_diameter: '',
          height: '',
          side1: '',
          side2: '',
          web_thickness: '',
          flange_thickness: '',
          material_type: item.material_type || null,
          density: item.density || null,
          material_grade: item.material_grade || null,
          generate_st: true
        };
      });

      setGrnForm(prev => ({ ...prev, items: initialItems }));
    } catch (error) {
      console.error("Error fetching PO:", error);
      showError("Failed to load Purchase Order details");
    } finally {
      setLoadingPO(false);
    }
  };

  const handleItemChange = (idx, field, value) => {
    const newItems = [...grnForm.items];
    newItems[idx][field] = value;
    
    // Recalculate weight if dimensions or quantity changed
    const dimensionFields = ['length', 'width', 'thickness', 'diameter', 'outer_diameter', 'height', 'side1', 'side2', 'web_thickness', 'flange_thickness'];
    if (['received_qty', ...dimensionFields, 'density', 'item_group'].includes(field)) {
      // Only recalculate unit weight if at least one dimension is entered
      const hasNewDimensions = dimensionFields.some(f => newItems[idx][f] !== '');
      
      if (hasNewDimensions) {
        const unitWeight = calculateItemWeight(newItems[idx]);
        newItems[idx].unit_weight = unitWeight;
      }
      // If no dimensions are entered, it keeps using the initial unit_weight (from PO)
      
      newItems[idx].received_weight = parseFloat((parseFloat(newItems[idx].received_qty || 0) * newItems[idx].unit_weight).toFixed(4));
    }

    // Update item code if name changed
    if (field === 'material_name') {
      newItems[idx].item_code = value ? generateItemCode(value) : newItems[idx].item_code_original;
    }

    setGrnForm({ ...grnForm, items: newItems });
  };

  const handleSubmitGRN = async () => {
    if (loading) return;
    try {
      const hasQuantities = grnForm.items.some(item => Number(item.received_qty) > 0);
      if (!hasQuantities) {
        return showError("Please enter received quantities for at least one item.");
      }

      setLoading(true);
      const payload = {
        purchase_order_id: poData.id,
        vendor_id: poData.vendor_id,
        posting_date: grnForm.posting_date,
        notes: grnForm.notes,
        items: grnForm.items.filter(item => Number(item.received_qty) > 0).map(item => {
          const dimensionFields = ['length', 'width', 'thickness', 'diameter', 'outer_diameter', 'height', 'side1', 'side2', 'web_thickness', 'flange_thickness'];
          const finalItem = {
            ...item,
            material_name: item.material_name || item.material_name_original,
            received_qty: parseFloat(item.received_qty),
            received_weight: parseFloat(item.received_weight),
            rate_per_kg: parseFloat(item.rate_per_kg || item.rate || 0),
            generate_st: true
          };
          
          // Apply original dimensions if new ones are not provided
          dimensionFields.forEach(f => {
            if (!finalItem[f] && finalItem[`${f}_original`]) {
              finalItem[f] = finalItem[`${f}_original`];
            }
          });
          
          return finalItem;
        })
      };

      await axios.post("/department/inventory/purchase-orders/receipts", payload);
      showSuccess("Purchase Receipt created successfully with ST Numbers");
      fetchGRNs(); // Refresh the list
      navigate("/department/inventory/grn");
    } catch (error) {
      console.error("Error submitting GRN:", error);
      showError(error.response?.data?.message || "Failed to submit Goods Receipt Note");
    } finally {
      setLoading(false);
    }
  };

  const handleViewGRN = async (grn) => {
    try {
      const response = await axios.get(`/department/inventory/purchase-orders/receipts/${grn.id}`);
      setSelectedGRN(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error("Error fetching GRN details:", error);
      showError("Failed to load GRN details");
    }
  };

  const fetchGRNs = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await axios.get("/department/inventory/purchase-orders/receipts/all");
      const formattedData = response.data.map((grn) => ({
        id: grn.id,
        grnNo: grn.grn_number || `GRN-${String(grn.id).padStart(3, "0")}-${new Date(grn.created_at).getFullYear()}`,
        poNo: grn.po_number,
        vendor: grn.vendor_name,
        inspectionStatus: grn.inspection_status || "pending",
        status: grn.status || "pending",
        receivedDate: grn.created_at ? new Date(grn.created_at).toISOString().split("T")[0] : null,
        items: grn.items || [],
      }));
      setGrnData(formattedData);
    } catch (error) {
      console.error("Error fetching GRNs:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const getSTPreview = (materialName) => {
    return `ST-${generateItemCode(materialName)}`;
  };

  useEffect(() => {
    const extractedTaskId = taskService.getTaskIdFromParams();
    if (extractedTaskId) setTaskId(extractedTaskId);
    fetchGRNs();
  }, [fetchGRNs, location]);

  const [processingStock, setProcessingStock] = useState(null);
  const [approvingGRN, setApprovingGRN] = useState(null);
  const [sendingToQC, setSendingToQC] = useState(null);
  const [releasingMaterial, setReleasingMaterial] = useState(null);

  const handleReleaseMaterial = async (grn) => {
    try {
      const result = await Swal.fire({
        title: "Release Material?",
        text: `Do you want to release the accepted material from ${grn.grnNo} for production?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, Release",
        cancelButtonText: "No, Cancel",
        confirmButtonColor: "#f59e0b",
      });

      if (result.isConfirmed) {
        setReleasingMaterial(grn.id);
        await axios.post(`/department/inventory/grns/${grn.id}/release-material`);
        showSuccess("Material released for production successfully!");
        fetchGRNs();
      }
    } catch (error) {
      console.error("Error releasing material:", error);
      showError(error.response?.data?.message || "Failed to release material");
    } finally {
      setReleasingMaterial(null);
    }
  };

  const handleSendToQuality = async (grn) => {
    try {
      const result = await Swal.fire({
        title: "Send to Quality?",
        text: `Do you want to send ${grn.grnNo} for quality inspection?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, Send",
        cancelButtonText: "No, Cancel",
        confirmButtonColor: "#8b5cf6",
      });

      if (result.isConfirmed) {
        setSendingToQC(grn.id);
        await axios.post(`/qc/grn/${grn.id}/send-to-qc`);
        showSuccess("GRN sent to Quality department successfully!");
        fetchGRNs();
      }
    } catch (error) {
      console.error("Error sending to QC:", error);
      showError(error.response?.data?.message || "Failed to send GRN to Quality");
    } finally {
      setSendingToQC(null);
    }
  };

  const handleApproveGRN = async (grn) => {
    try {
      const result = await Swal.fire({
        title: "Approve GRN?",
        text: `Do you want to approve ${grn.grnNo}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, Approve",
        cancelButtonText: "No, Cancel",
        confirmButtonColor: "#10b981",
      });

      if (result.isConfirmed) {
        setApprovingGRN(grn.id);
        await axios.post(`/department/inventory/grns/${grn.id}/approve`);
        showSuccess("GRN approved successfully!");
        fetchGRNs();
      }
    } catch (error) {
      console.error("Error approving GRN:", error);
      showError(error.response?.data?.message || "Failed to approve GRN");
    } finally {
      setApprovingGRN(null);
    }
  };

  const handleAddToStock = async (grn) => {
    try {
      if (processingStock === grn.id) return;

      const result = await Swal.fire({
        title: "Commit to Stock?",
        text: "This will add items to inventory and generate unique ST numbers for tracking.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, add to stock",
        cancelButtonText: "Cancel",
        reverseButtons: true,
        confirmButtonColor: '#059669'
      });

      if (result.isConfirmed) {
        setProcessingStock(grn.id);

        await axios.post(`/department/inventory/grns/${grn.id}/add-to-stock`, { status: grn.status });
        if (taskId) await taskService.autoCompleteTaskByAction(taskId, "add");
        
        showSuccess("Material committed to stock. Unique ST numbers activated.");
        fetchGRNs();
      }
    } catch (error) {
      console.error("Error adding to stock:", error);
      showError(error.response?.data?.message || "Failed to process stock entry");
    } finally {
      setProcessingStock(null);
    }
  };

  const stats = [
    { 
      label: "Total GRNs", 
      value: grnData.length, 
      icon: Package,
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-100 dark:border-blue-800",
      description: "Total receipts"
    },
    {
      label: "Awaiting Storage",
      value: grnData.filter((g) => g.status === 'awaiting_storage').length,
      icon: Warehouse,
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      borderColor: "border-amber-100 dark:border-amber-800",
      description: "Pending warehouse entry"
    },
    {
      label: "Ready for QC",
      value: grnData.filter((g) => g.status === 'pending').length,
      icon: Package,
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-100 dark:border-blue-800",
      description: "In stock, awaiting inspection"
    },
    {
      label: "QC Completed",
      value: grnData.filter((g) => ['qc_completed', 'qc_finalized', 'material_released', 'partially_released'].includes(g.status)).length,
      icon: CheckCircle,
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-100 dark:border-emerald-800",
      description: "Successfully added to stock"
    },
    {
      label: "Released",
      value: grnData.filter((g) => ['material_released', 'partially_released'].includes(g.status)).length,
      icon: ShieldCheck,
      bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      borderColor: "border-indigo-100 dark:border-indigo-800",
      description: "Released to Production"
    },
  ];

  const renderGRNCreationUI = () => {
    if (loadingPO) return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="animate-spin text-blue-600" size={40} />
        <p className="text-sm  text-slate-400  ">Loading PO Details...</p>
      </div>
    );

    if (!poData) return null;

    return (
      <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/department/inventory/purchase-orders')}
            className="flex items-center gap-2 text-xs  text-slate-500 hover:text-blue-600 transition-colors  "
          >
            <ChevronLeft size={15} /> Back to Orders
          </button>
          <div className="flex items-center gap-3">
            <span className="p-1 bg-blue-50 text-blue-600 rounded  text-xs    border border-blue-100">
              New Goods Receipt (GRN)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800  overflow-hidden">
          <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <p className="text-xs  text-slate-400  tracking-[0.2em]">Purchase Order</p>
                <h2 className="text-xl  text-blue-600  ">{poData.po_number}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs  text-slate-500 ">Project:</span>
                    <span className="text-xs  text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100  ">
                        {poData.root_card_project_name || "N/A"}
                    </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs  text-slate-400  tracking-[0.2em]">Supplier / Vendor</p>
                <h2 className="text-xl  text-slate-900 dark:text-white  ">{poData.vendor_name}</h2>
              </div>
              <div className="space-y-1">
                <p className="text-xs  text-slate-400  tracking-[0.2em]">Posting Date</p>
                <input 
                  type="date"
                  value={grnForm.posting_date}
                  onChange={(e) => setGrnForm({...grnForm, posting_date: e.target.value})}
                  className="bg-transparent border-none p-0 text-xl  text-slate-900 dark:text-white outline-none focus:ring-0 w-full"
                />
              </div>
            </div>
          </div>

          <div className="p-0">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 py-4 text-xs text-slate-400 text-center w-12">#</th>
                  <th className="px-4 py-4 text-xs text-slate-400 text-left w-1/4">Ordered Item / Group</th>
                  <th className="px-4 py-4 text-xs text-slate-400 text-left w-1/3">Received Material Name / Dimensions</th>
                  <th className="p-2 text-xs text-slate-400 text-center w-24">Ordered</th>
                  <th className="p-2 text-xs text-slate-400 text-center w-20">UOM</th>
                  <th className="p-2 text-xs text-slate-400 text-center w-32">Weight (Kg)</th>
                  <th className="p-2 text-xs text-slate-400 text-center w-32">Received Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {grnForm.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-6 text-center text-xs text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-6">
                      <div className="space-y-1">
                        <p className="text-sm  text-slate-900 dark:text-white line-clamp-2">{item.material_name_original || item.material_name}</p>
                        <p className="text-xs text-slate-400 uppercase tracking-widest">{item.item_group || 'No Group'}</p>
                        <p className="text-xs text-blue-600 ">{renderOriginalDimensions(item)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <div className="space-y-3">
                        <input 
                          type="text"
                          value={item.material_name}
                          onChange={(e) => handleItemChange(idx, 'material_name', e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          placeholder="Received Material Name (if different)"
                        />
                        
                        {/* Inline Dimension Fields */}
                        <div className="grid grid-cols-4 gap-2">
                          {(item.item_group?.toLowerCase()?.includes('plate')) && (
                            <>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 ml-1">L</label>
                                <input type="number" value={item.length || ''} onChange={(e) => handleItemChange(idx, 'length', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" placeholder="L" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 ml-1">W</label>
                                <input type="number" value={item.width || ''} onChange={(e) => handleItemChange(idx, 'width', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" placeholder="W" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 ml-1">T</label>
                                <input type="number" value={item.thickness || ''} onChange={(e) => handleItemChange(idx, 'thickness', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" placeholder="T" />
                              </div>
                            </>
                          )}
                          {(item.item_group?.toLowerCase()?.includes('round bar')) && (
                            <>
                              <div className="space-y-1 col-span-2">
                                <label className="text-[9px] text-slate-500 ml-1">Dia</label>
                                <input type="number" value={item.diameter || ''} onChange={(e) => handleItemChange(idx, 'diameter', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" placeholder="Dia" />
                              </div>
                              <div className="space-y-1 col-span-2">
                                <label className="text-[9px] text-slate-500 ml-1">L</label>
                                <input type="number" value={item.length || ''} onChange={(e) => handleItemChange(idx, 'length', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" placeholder="L" />
                              </div>
                            </>
                          )}
                          {(item.item_group?.toLowerCase()?.includes('pipe')) && (
                            <>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 ml-1">OD</label>
                                <input type="number" value={item.outer_diameter || ''} onChange={(e) => handleItemChange(idx, 'outer_diameter', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" placeholder="OD" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 ml-1">T</label>
                                <input type="number" value={item.thickness || ''} onChange={(e) => handleItemChange(idx, 'thickness', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" placeholder="T" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 ml-1">L</label>
                                <input type="number" value={item.length || ''} onChange={(e) => handleItemChange(idx, 'length', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" placeholder="L" />
                              </div>
                            </>
                          )}
                          {(item.item_group?.toLowerCase()?.includes('square bar') || item.item_group?.toLowerCase() === 'sq bar') && (
                            <>
                              <div className="space-y-1 col-span-2">
                                <label className="text-[9px] text-slate-500 ml-1">Side (S)</label>
                                <input type="number" value={item.side1 || ''} onChange={(e) => handleItemChange(idx, 'side1', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" placeholder="S" />
                              </div>
                              <div className="space-y-1 col-span-2">
                                <label className="text-[9px] text-slate-500 ml-1">L</label>
                                <input type="number" value={item.length || ''} onChange={(e) => handleItemChange(idx, 'length', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" placeholder="L" />
                              </div>
                            </>
                          )}
                          {(item.item_group?.toLowerCase()?.includes('rectangular bar') || item.item_group?.toLowerCase() === 'rec bar') && (
                            <>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 ml-1">W</label>
                                <input type="number" value={item.side1 || ''} onChange={(e) => handleItemChange(idx, 'side1', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" placeholder="W" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 ml-1">H</label>
                                <input type="number" value={item.side2 || ''} onChange={(e) => handleItemChange(idx, 'side2', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" placeholder="H" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 ml-1">L</label>
                                <input type="number" value={item.length || ''} onChange={(e) => handleItemChange(idx, 'length', e.target.value)} className="w-full p-1 border rounded text-xs outline-none" placeholder="L" />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-6 text-center text-xs text-slate-400">
                      {item.ordered_qty}
                    </td>
                    <td className="px-4 py-6 text-center text-xs text-slate-400">
                      {item.unit}
                    </td>
                    <td className="px-4 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <input 
                          type="number"
                          step="any"
                          value={item.received_weight}
                          onChange={(e) => handleItemChange(idx, 'received_weight', e.target.value)}
                          className="w-24 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-center focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-xs text-slate-400">Kg</span>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <input 
                        type="number"
                        step="any"
                        value={item.received_qty}
                        onChange={(e) => handleItemChange(idx, 'received_qty', e.target.value)}
                        className="w-full p-2 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded text-sm text-center text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-8 bg-slate-50/30 dark:bg-slate-800/30 border-t border-slate-50 dark:border-slate-800">
            <div className="flex flex-col md:flex-row items-end gap-6">
              <div className="flex-1 space-y-2 w-full">
                <label className="text-xs  text-slate-400   flex items-center gap-2">
                  <FileText size={12} /> Remarks / Receiving Notes
                </label>
                <textarea 
                  value={grnForm.notes}
                  onChange={(e) => setGrnForm({...grnForm, notes: e.target.value})}
                  rows={2}
                  placeholder="Any discrepancies or damage reports..."
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm  focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>
              <button 
                onClick={handleSubmitGRN}
                disabled={loading}
                className="px-10 py-4 bg-emerald-500 text-white rounded  text-xs  tracking-[0.2em] hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all  shadow-emerald-500/20 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <RefreshCw className="animate-spin" size={15} /> : <CheckCircle size={15} />}
                {loading ? "Submitting..." : "Submit Goods Receipt"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStatCard = (stat) => {
    const Icon = stat.icon;
    return (
      <div className={`relative overflow-hidden rounded border p-2 transition-all duration-300 hover: ${stat.bgColor} ${stat.borderColor}`}>
        <div className="flex justify-between items-start mb-3">
          <div className={`p-1.5 rounded bg-white dark:bg-slate-800  ${stat.iconColor}`}>
            <Icon size={15} />
          </div>
        </div>
        <div>
          <p className="text-xs  text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl  text-slate-900 dark:text-white leading-none">{stat.value}</span>
          </div>
          <p className="text-xs  text-slate-500 dark:text-slate-500 mt-1.5  ">{stat.description}</p>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Icon size={64} />
        </div>
      </div>
    );
  };

  const columns = [
    {
      key: "grnNo",
      label: "GRN Info",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs  text-slate-900">{val}</span>
          <span className="text-xs text-slate-500">PO: {row.poNo}</span>
        </div>
      )
    },
    {
      key: "vendor",
      label: "Supplier",
      render: (val) => <span className="text-xs text-slate-600">{val}</span>
    },
    {
      key: "receivedDate",
      label: "Date",
      align: "center",
      render: (val) => <span className="text-xs text-slate-500">{val}</span>
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (status) => (
        <span className={`px-2 py-0.5 rounded text-xs  border ${
          status === 'awaiting_storage' ? 'bg-amber-50 text-amber-600 border-amber-100' :
          status === 'pending' ? 'bg-blue-50 text-blue-600 border-blue-100' :
          status === 'qc_pending' ? 'bg-purple-50 text-purple-600 border-purple-100' : 
          status === 'qc_finalized' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
          status === 'qc_completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          status === 'material_released' ? 'bg-blue-100 text-blue-600 border-blue-200' :
          status === 'partially_released' ? 'bg-amber-100 text-amber-600 border-amber-200' :
          'bg-slate-50 text-slate-500 border-slate-100'
        }`}>
          {(status || 'unknown').replace('_', ' ').toUpperCase()}
        </span>
      )
    },
    {
      key: "id",
      label: "Actions",
      align: "right",
      render: (_, grn) => (
        <div className="flex justify-end gap-1.5">
          {grn.status === 'qc_completed' && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleReleaseMaterial(grn); }}
              className="flex items-center gap-1 p-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 transition-all"
            >
              <Zap size={12} />
              Release
            </button>
          )}
          {grn.status === 'awaiting_storage' && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleAddToStock(grn); }}
              disabled={processingStock === grn.id}
              className="flex items-center gap-1 p-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 disabled:opacity-50 transition-all"
            >
              {processingStock === grn.id ? <RefreshCw size={12} className="animate-spin" /> : <Package size={12} />}
              Stock
            </button>
          )}
          {grn.status === 'pending' && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleSendToQuality(grn); }}
              disabled={sendingToQC === grn.id}
              className="flex items-center gap-1 p-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {sendingToQC === grn.id ? <RefreshCw size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
              QC
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4 p-4">
      {poId ? (
        renderGRNCreationUI()
      ) : (
        <>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
             
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-cyan-600 ">Inventory</span>
                  <span className="text-slate-300">›</span>
                  <span className="text-xs text-slate-500">Stock Inward</span>
                </div>
                <h1 className="text-lg p-2 text-slate-900 dark:text-white leading-tight">Goods Receipt Note (GRN)</h1>
                <p className="text-xs text-slate-500">Manage receipts and material tracking</p>
              </div>
            </div>
            <button onClick={() => fetchGRNs()} className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:text-blue-600 transition-all shadow-sm">
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {stats.map((stat, idx) => (
              <React.Fragment key={idx}>
                {renderStatCard(stat)}
              </React.Fragment>
            ))}
          </div>

          <DataTable 
            columns={columns}
            data={grnData}
            loading={loading}
            searchPlaceholder="Search GRN, PO or Supplier..."
            renderRowDetail={(row) => <GRNDetailTable grnId={row.id} />}
            filters={[
              {
                label: "Status",
                column: "status",
                options: [
                  { label: "ALL", value: "" },
                  { label: "AWAITING STORAGE", value: "awaiting_storage" },
                  { label: "READY FOR QC", value: "pending" },
                  { label: "QC IN PROGRESS", value: "qc_pending" },
                  { label: "QC COMPLETED", value: "qc_completed" },
                  { label: "MATERIAL RELEASED", value: "material_released" }
                ]
              }
            ]}
          />
        </>
      )}
    </div>
  );
};

export default GRNProcessingPage;
