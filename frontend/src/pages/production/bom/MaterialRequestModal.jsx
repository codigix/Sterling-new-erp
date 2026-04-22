import React, { useState } from "react";
import { X, Send, AlertCircle, ShoppingCart, Box, FileText } from "lucide-react";
import axios from "../../../utils/api";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";
import { renderDimensions } from "../../../utils/dimensionUtils";
import DataTable from "../../../components/ui/DataTable/DataTable";

const MaterialRequestModal = ({ isOpen, onClose, bom }) => {
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await axios.post("/production/material-requests", {
        bomId: bom.id,
        projectId: bom.projectId,
        rootCardId: bom.rootCardId,
        remarks: remarks,
        items: bom.materials
      });
      toast.success("Material request sent successfully");
      onClose();
    } catch (error) {
      console.error("Error sending material request:", error);
      toast.error(error.response?.data?.message || "Failed to send material request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            
            <div>
              <h3 className="text-lg  text-slate-900 dark:text-white">Material Request</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Requesting materials for {bom.productName} ({bom.productCode}) • BOM: {bom.bomNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded  transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <h4 className="text-md  text-slate-900   flex items-center gap-2">
                <Box size={14} className="text-slate-900" />
                Materials List
              </h4>
            </div>
            
            <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden ">
              <DataTable
                data={bom?.materials || []}
                columns={[
                  {
                    header: "#",
                    accessorKey: "itemName",
                    className: "w-12 text-center",
                    render: (_, __, ___, idx) => (
                      <span className="text-[10px] text-slate-400">{idx + 1}</span>
                    ),
                  },
                  {
                    header: "Item Name / Group",
                    accessorKey: "itemName",
                    className: "p-2",
                    render: (val, item) => (
                      <div className="flex flex-col">
                        <span className=" text-slate-700 dark:text-slate-200 text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {val}
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 ">
                          Dim: {renderDimensions(item)} mm
                        </span>
                        <span className="text-xs  text-slate-400 dark:text-slate-500  ">
                          {item.itemGroup || "NO-GROUP"}
                        </span>
                      </div>
                    ),
                  },
                  {
                    header: "Part Detail / Grade",
                    accessorKey: "partDetail",
                    className: "p-2",
                    render: (val, item) => (
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-700 dark:text-slate-300">
                          {val || "-"}
                        </span>
                        <span className="text-xs  text-slate-500 dark:text-slate-500  ">
                          {item.materialGrade || "-"}
                        </span>
                      </div>
                    ),
                  },
                  {
                    header: "Remark / Make",
                    accessorKey: "remark",
                    className: "p-2",
                    render: (val, item) => (
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500 italic">{val || "-"}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {item.make || "-"}
                        </span>
                      </div>
                    ),
                  },
                  {
                    header: "Weight (Kg)",
                    accessorKey: "totalWeight",
                    className: "p-2",
                    render: (_, item) => (
                      <div className="flex flex-col">
                        <span className="text-xs text-left  text-slate-700 dark:text-slate-200">
                          {Number(
                            (
                              parseFloat(item.totalWeight || item.total || 0) ||
                              parseFloat(item.calculatedWeight || item.unitWeight || 0) *
                                parseFloat(item.quantity || 0)
                            ).toFixed(3)
                          )}{" "}
                          Kg
                        </span>
                        {(parseFloat(item.unitWeight) > 0 ||
                          parseFloat(item.calculatedWeight) > 0) && (
                          <span className="text-xs text-slate-400">
                            Unit:{" "}
                            {Number(parseFloat(item.unitWeight || item.calculatedWeight || 0).toFixed(3))}
                          </span>
                        )}
                      </div>
                    ),
                  },
                  {
                    header: "Qty",
                    accessorKey: "quantity",
                    className: "p-2 text-center",
                    render: (val) => (
                      <span className=" text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                        {Number(parseFloat(val || 0))}
                      </span>
                    ),
                  },
                  {
                    header: "UOM",
                    accessorKey: "uom",
                    className: "p-2",
                    render: (val) => (
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs  text-slate-500 dark:text-slate-400">
                        {val}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs  text-slate-400   flex items-center gap-2">
              <FileText size={14} className="text-slate-300" />
              Additional Remarks
            </h4>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter any additional instructions or remarks for this material request..."
              className="w-full p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded text-xs focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[100px] resize-none"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <Button 
            variant="secondary" 
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            icon={Send} 
            loading={submitting}
            onClick={handleSubmit}
          >
            Send Request
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MaterialRequestModal;
