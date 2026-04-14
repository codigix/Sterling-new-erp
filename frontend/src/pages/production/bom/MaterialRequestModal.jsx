import React, { useState } from "react";
import { X, Send, AlertCircle, ShoppingCart, Box, FileText } from "lucide-react";
import axios from "../../../utils/api";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";

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
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
              <ShoppingCart size={20} />
            </div>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <h4 className="text-xs  text-slate-400   flex items-center gap-2">
                <Box size={14} className="text-slate-300" />
                Materials List
              </h4>
            </div>
            
            <div className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden ">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-xs    border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2 w-12 text-center">#</th>
                      <th className="p-2">Item Name / Group</th>
                      <th className="p-2">Part Detail / Grade</th>
                      <th className="p-2">Remark / Make</th>
                      <th className="p-2 text-center">Weight (Kg)</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-center">UOM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {bom?.materials?.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                        <td className="p-2 text-center text-xs font-medium text-slate-400">
                          {index + 1}
                        </td>
                        <td className="p-2">
                          <div className="flex flex-col">
                            <span className=" text-slate-700 dark:text-slate-200 text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {item.itemName}
                            </span>
                            {item.itemGroup?.toLowerCase().includes("plate") && (item.length || item.width || item.thickness) && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                Dim: {Number(item.length || 0)} x {Number(item.width || 0)} x {Number(item.thickness || 0)} mm
                              </span>
                            )}
                            {item.itemGroup?.toLowerCase().includes("round bar") && (item.diameter || item.length) && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                Dim: Dia:{Number(item.diameter || 0)}, L:{Number(item.length || 0)} mm
                              </span>
                            )}
                            {item.itemGroup?.toLowerCase().includes("pipe") && (item.outerDiameter || item.thickness || item.length) && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                Dim: OD:{Number(item.outerDiameter || 0)}, Thk:{Number(item.thickness || 0)}, L:{Number(item.length || 0)} mm
                              </span>
                            )}
                            {item.itemGroup?.toLowerCase().includes("block") && (item.length || item.width || item.height) && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                Dim: {Number(item.length || 0)} x {Number(item.width || 0)} x {Number(item.height || 0)} mm
                              </span>
                            )}
                            <span className="text-xs font-medium text-slate-400 dark:text-slate-500  ">
                              {item.itemGroup || "NO-GROUP"}
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              {item.partDetail || "-"}
                            </span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-500  ">
                              {item.materialGrade || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500 italic">
                              {item.remark || "-"}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {item.make || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                              {Number((parseFloat(item.totalWeight || item.total || 0) || (parseFloat(item.calculatedWeight || item.unitWeight || 0) * parseFloat(item.quantity || 0))).toFixed(3))} Kg
                            </span>
                            {(parseFloat(item.unitWeight) > 0 || parseFloat(item.calculatedWeight) > 0) && (
                              <span className="text-xs text-slate-400">
                                Unit: {Number(parseFloat(item.unitWeight || item.calculatedWeight || 0).toFixed(3))}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <span className=" text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800  rounded border border-slate-100 dark:border-slate-800">
                            {Number(parseFloat(item.quantity || 0).toFixed(4))}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs  text-slate-500 dark:text-slate-400">
                            {item.uom}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded text-sm focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[100px] resize-none"
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
