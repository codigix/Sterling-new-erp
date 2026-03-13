import React, { useState, useEffect } from "react";
import { X, Send, AlertCircle, ShoppingCart, Box } from "lucide-react";
import axios from "../../../utils/api";
import { toast } from "react-toastify";
import Button from "../../../components/ui/Button";

const MaterialRequestModal = ({ isOpen, onClose, bom }) => {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await axios.post("/production/material-requests", {
        bomId: bom.id,
        projectId: bom.projectId,
        rootCardId: bom.rootCardId,
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Material Request</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Requesting materials for BOM: {bom.bomNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between ml-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Box size={14} className="text-slate-300" />
                Materials List
              </h4>
            </div>
            
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5 w-12 text-center">#</th>
                      <th className="px-4 py-3.5">Item Name / Group</th>
                      <th className="px-4 py-3.5">Part Detail / Grade</th>
                      <th className="px-4 py-3.5">Remark / Make</th>
                      <th className="px-4 py-3.5 text-center">Qty</th>
                      <th className="px-4 py-3.5 text-center">UOM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {bom?.materials?.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                        <td className="px-4 py-3.5 text-center text-xs font-medium text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {item.itemName}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                              {item.itemGroup || "NO-GROUP"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              {item.partDetail || "-"}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-500 uppercase tracking-tight">
                              {item.materialGrade || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 italic">
                              {item.remark || "-"}
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {item.make || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-black text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-600 dark:text-slate-400">
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

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
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
