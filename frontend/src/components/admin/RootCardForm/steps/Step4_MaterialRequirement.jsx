import React, { useState, useEffect, useCallback } from "react";
import { FileText, Send, Receipt, ShoppingCart, Eye } from "lucide-react";
import FormSection from "../shared/FormSection";
import Button from "../../../ui/Button";
import { useRootCardContext } from "../hooks";
import axios from "../../../../utils/api";
import DataTable from "../../../ui/DataTable/DataTable";
import Badge from "../../../ui/Badge";
import MaterialRequestDetailModal from "../../../production/MaterialRequestDetailModal";
import CreatePurchaseOrderModal from "../../../../pages/inventory/CreatePurchaseOrderModal";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";

export default function Step4_MaterialRequirement({ readOnly = false }) {
  const { state, initialData } = useRootCardContext();
  const rootCardId = initialData?.id || state.createdOrderId;
  
  // Procurement Data
  const [materialRequests, setMaterialRequests] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingProcurement, setLoadingProcurement] = useState(false);

  // View Modals State
  const [selectedMRId, setSelectedMRId] = useState(null);
  const [isMRModalOpen, setIsMRModalOpen] = useState(false);
  const [selectedPOData, setSelectedPOData] = useState(null);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);

  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  };

  const generateQuotationPDF = async (quotation) => {
    const doc = new jsPDF();
    try {
      const logo = await loadImage("/logo.png");
      doc.addImage(logo, "PNG", 14, 5, 50, 15);
    } catch (error) {
      console.warn("Logo not found or failed to load:", error);
    }

    doc.setFontSize(20);
    doc.text(quotation.type === "outbound" ? "REQUEST FOR QUOTATION" : "QUOTATION", 105, 30, { align: "center" });

    doc.setFontSize(10);
    doc.text(`No: ${quotation.quotation_number}`, 14, 45);
    doc.text(`Date: ${new Date(quotation.created_at || Date.now()).toLocaleDateString()}`, 14, 50);
    doc.text(`Vendor: ${quotation.vendor_name || "N/A"}`, 14, 55);

    if (quotation.mr_number) doc.text(`Material Request: ${quotation.mr_number}`, 14, 60);
    if (quotation.rfq_number) doc.text(`Reference RFQ: ${quotation.rfq_number}`, 14, quotation.mr_number ? 65 : 60);

    const tableColumn = quotation.type === "inbound" ? 
      ["Material Name", "Qty", "UOM", "Rate/Kg", "Weight (Kg)", "Total"] : 
      ["Item Name", "Group", "Grade", "Part Detail", "Make", "Remark", "Qty", "Unit"];

    const tableRows = (quotation.items || []).map((item) => {
      if (quotation.type === "inbound") {
        return [
          item.vendor_item_name || item.item_name || "N/A",
          item.quantity ? parseFloat(item.quantity).toString() : "0",
          item.unit || "N/A",
          `INR ${item.rate_per_kg || 0}`,
          `${item.total_weight || 0}`,
          `INR ${(item.total_weight * item.rate_per_kg || 0).toFixed(2)}`
        ];
      } else {
        return [
          item.item_name || "N/A",
          item.item_group || "N/A",
          item.material_grade || "N/A",
          item.part_detail || "N/A",
          item.make || "N/A",
          item.remark || "N/A",
          item.quantity ? parseFloat(item.quantity).toString() : "0",
          item.unit || "N/A",
        ];
      }
    });

    autoTable(doc, {
      startY: 75,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      styles: { fontSize: 7 }
    });

    window.open(doc.output("bloburl"), "_blank");
  };

  const handleViewQuotation = async (quotation) => {
    try {
      const response = await axios.get(`/department/procurement/quotations/${quotation.id}`);
      generateQuotationPDF(response.data);
    } catch (err) {
      console.error("Error viewing quotation detail:", err);
      toast.error("Failed to load quotation details");
    }
  };

  const handleViewPO = async (po) => {
    try {
      const response = await axios.get(`/department/procurement/purchase-orders/${po.id}`);
      setSelectedPOData(response.data);
      setIsPOModalOpen(true);
    } catch (error) {
      console.error("Error viewing PO detail:", error);
      toast.error("Failed to load PO details");
    }
  };

  const fetchProcurementData = useCallback(async () => {
    if (!rootCardId) return;
    try {
      setLoadingProcurement(true);
      const [mrRes, rfqRes, qtnRes, poRes] = await Promise.all([
        axios.get("/department/procurement/material-requests", { params: { rootCardId } }),
        axios.get("/department/procurement/quotations", { params: { root_card_id: rootCardId, type: 'outbound' } }),
        axios.get("/department/procurement/quotations", { params: { root_card_id: rootCardId, type: 'inbound' } }),
        axios.get("/department/procurement/purchase-orders", { params: { root_card_id: rootCardId } })
      ]);
      setMaterialRequests(mrRes.data.data || mrRes.data || []);
      setRfqs(rfqRes.data.quotations || rfqRes.data.data || rfqRes.data || []);
      setQuotations(qtnRes.data.quotations || qtnRes.data.data || qtnRes.data || []);
      setPurchaseOrders(poRes.data.purchaseOrders || poRes.data.data || poRes.data || []);
    } catch (error) {
      console.error("Error fetching procurement data:", error);
    } finally {
      setLoadingProcurement(false);
    }
  }, [rootCardId]);

  useEffect(() => {
    fetchProcurementData();
  }, [fetchProcurementData]);

  const mrColumns = [
    { key: "request_number", label: "MR NUMBER", render: (val) => <span className=" text-blue-600">{val}</span> },
    { key: "department", label: "DEPARTMENT" },
    { key: "priority", label: "PRIORITY", render: (val) => (
      <Badge variant={val === 'urgent' ? 'danger' : val === 'high' ? 'warning' : 'info'}>{val}</Badge>
    )},
    { key: "status", label: "STATUS", render: (val) => (
      <Badge variant={val === 'pending' ? 'warning' : val === 'approved' ? 'success' : 'secondary'}>{val}</Badge>
    )},
    { key: "created_at", label: "DATE", render: (val) => new Date(val).toLocaleDateString() },
    { key: "actions", label: "ACTIONS", render: (_, row) => (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => {
          setSelectedMRId(row.id);
          setIsMRModalOpen(true);
        }}
        title="View MR Details"
      >
        <Eye size={15} className="text-blue-600" />
      </Button>
    )}
  ];

  const rfqColumns = [
    { key: "quotation_number", label: "RFQ NUMBER", render: (val) => <span className=" text-blue-600">{val}</span> },
    { key: "vendor_name", label: "VENDOR" },
    { key: "status", label: "STATUS", render: (val) => (
      <Badge variant={val === 'sent' ? 'info' : 'secondary'}>{val}</Badge>
    )},
    { key: "valid_until", label: "VALID UNTIL", render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { key: "actions", label: "ACTIONS", render: (_, row) => (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => handleViewQuotation(row)}
        title="View RFQ Details"
      >
        <Eye size={15} className="text-blue-600" />
      </Button>
    )}
  ];

  const quotationColumns = [
    { key: "quotation_number", label: "QTN NUMBER", render: (val) => <span className=" text-blue-600">{val}</span> },
    { key: "vendor_name", label: "VENDOR" },
    { key: "total_amount", label: "TOTAL AMOUNT", render: (val) => `₹${parseFloat(val).toLocaleString()}` },
    { key: "status", label: "STATUS", render: (val) => (
      <Badge variant={val === 'approved' ? 'success' : val === 'rejected' ? 'danger' : 'warning'}>{val}</Badge>
    )},
    { key: "actions", label: "ACTIONS", render: (_, row) => (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => handleViewQuotation(row)}
        title="View Quotation Details"
      >
        <Eye size={15} className="text-blue-600" />
      </Button>
    )}
  ];

  const poColumns = [
    { key: "po_number", label: "PO NUMBER", render: (val) => <span className=" text-blue-600">{val}</span> },
    { key: "vendor_name", label: "VENDOR" },
    { key: "total_amount", label: "TOTAL AMOUNT", render: (val) => `₹${parseFloat(val).toLocaleString()}` },
    { key: "status", label: "STATUS", render: (val) => (
      <Badge variant={val === 'approved' ? 'success' : 'warning'}>{val}</Badge>
    )},
    { key: "created_at", label: "DATE", render: (val) => new Date(val).toLocaleDateString() },
    { key: "actions", label: "ACTIONS", render: (_, row) => (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => handleViewPO(row)}
        title="View PO Details"
      >
        <Eye size={15} className="text-blue-600" />
      </Button>
    )}
  ];

  return (
    <div className="space-y-2 animate-in fade-in duration-500">
      <FormSection 
        title="Procurement & Material Status" 
        icon={ShoppingCart}
        description="Track material requests, RFQs, quotations, and purchase orders for this project"
      >
        <div className="space-y-8">
          {/* Section 1: Material Requests */}
          <div className="p-2 space-y-4">
            <h3 className="text-sm  text-slate-900 flex items-center gap-2 border-b pb-2">
              <FileText size={15} className="text-purple-600" />
              Material Requests (MR)
            </h3>
            <DataTable 
              columns={mrColumns} 
              data={materialRequests} 
              loading={loadingProcurement}
              emptyMessage="No material requests found for this project"
            />
          </div>

          {/* Section 2: RFQs (Sent) */}
          <div className="p-2 space-y-4">
            <h3 className="text-sm  text-slate-900 flex items-center gap-2 border-b pb-2">
              <Send size={15} className="text-blue-600" />
              RFQs Sent (Request for Quotations)
            </h3>
            <DataTable 
              columns={rfqColumns} 
              data={rfqs} 
              loading={loadingProcurement}
              emptyMessage="No RFQs sent for this project"
            />
          </div>

          {/* Section 3: Quotations */}
          <div className="p-2 space-y-4">
            <h3 className="text-sm  text-slate-900 flex items-center gap-2 border-b pb-2">
              <Receipt size={15} className="text-green-600" />
              Received Quotations
            </h3>
            <DataTable 
              columns={quotationColumns} 
              data={quotations} 
              loading={loadingProcurement}
              emptyMessage="No quotations received for this project"
            />
          </div>

          {/* Section 4: Purchase Orders */}
          <div className="p-2 space-y-4">
            <h3 className="text-sm  text-slate-900 flex items-center gap-2 border-b pb-2">
              <ShoppingCart size={15} className="text-amber-600" />
              Approved Purchase Orders (PO)
            </h3>
            <DataTable 
              columns={poColumns} 
              data={purchaseOrders} 
              loading={loadingProcurement}
              emptyMessage="No purchase orders issued for this project"
            />
          </div>
        </div>
      </FormSection>

      {/* View Detail Modals */}
      <MaterialRequestDetailModal 
        isOpen={isMRModalOpen}
        onClose={() => {
          setIsMRModalOpen(false);
          setSelectedMRId(null);
        }}
        requestId={selectedMRId}
        readOnly={true}
      />

      {selectedPOData && (
        <CreatePurchaseOrderModal 
          isOpen={isPOModalOpen}
          onClose={() => {
            setIsPOModalOpen(false);
            setSelectedPOData(null);
          }}
          editData={selectedPOData}
          initialViewMode={true}
        />
      )}
    </div>
  );
}
