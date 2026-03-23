import React from "react";
import { FileText, ClipboardList, ShieldCheck } from "lucide-react";
import Input from "../../../ui/Input";
import FormSection from "../shared/FormSection";
import FormRow from "../shared/FormRow";
import { useFormData } from "../hooks";

export default function Step1_ClientPO({ readOnly = false }) {
  const { formData, updateField } = useFormData();
  
  return (
    <div className="space-y-2">
      <FormSection
        title="Sales Order Details"
        subtitle="Enter SO details for this root card"
        icon={FileText}
      >
        <div className="space-y-2">
          {/* Project & PO Information */}
          <div>
            <h5 className="text-sm  text-slate-900 mb-3 flex items-center gap-2 text-left">
              <ClipboardList size={16} className="text-blue-600" />
              Project & PO Information
            </h5>
            <FormRow cols={3}>
              <Input
                label="Project Name"
                value={formData.projectName || ""}
                onChange={(e) => updateField("projectName", e.target.value)}
                placeholder="Enter project name"
                disabled={readOnly}
                required
              />
              <Input
                label="Project Code"
                value={formData.projectCode || ""}
                onChange={(e) => updateField("projectCode", e.target.value)}
                placeholder="Enter project code"
                disabled={readOnly}
                required
              />
              <Input
                label="Quantity (Qty)"
                type="number"
                value={formData.quantity || ""}
                onChange={(e) => updateField("quantity", e.target.value)}
                placeholder="Enter quantity"
                disabled={readOnly}
                required
              />
            </FormRow>
            
            <FormRow cols={3} className="mt-4">
              <Input
                label="PO Number"
                value={formData.poNumber || ""}
                onChange={(e) => updateField("poNumber", e.target.value)}
                placeholder="Enter PO number"
                disabled={readOnly}
                required
              />
              <Input
                label="PO Date"
                type="date"
                value={formData.poDate || ""}
                onChange={(e) => updateField("poDate", e.target.value)}
                disabled={readOnly}
                required
              />
              <Input
                label="Delivery Date"
                type="date"
                value={formData.deliveryDate || ""}
                onChange={(e) => updateField("deliveryDate", e.target.value)}
                disabled={readOnly}
                required
              />
            </FormRow>
          </div>

          {/* Inspection & Additional Details */}
          <div className="border-t border-slate-100 pt-6">
            <h5 className="text-sm  text-slate-900 mb-3 flex items-center gap-2 text-left">
              <ShieldCheck size={16} className="text-green-600" />
              Inspection & Additional Details
            </h5>
            <FormRow cols={3}>
              <Input
                label="Inspection"
                value={formData.inspection || ""}
                onChange={(e) => updateField("inspection", e.target.value)}
                placeholder="e.g. Third Party, Internal"
                disabled={readOnly}
              />
              <Input
                label="Inspection Authority"
                value={formData.inspectionAuthority || ""}
                onChange={(e) => updateField("inspectionAuthority", e.target.value)}
                placeholder="e.g. TUV, RITES, Client"
                disabled={readOnly}
              />
              <Input
                label="LD (Liquidated Damages)"
                value={formData.ld || ""}
                onChange={(e) => updateField("ld", e.target.value)}
                placeholder="Enter LD terms"
                disabled={readOnly}
              />
            </FormRow>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
