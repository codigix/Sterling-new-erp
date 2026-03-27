import React from "react";
import { FileText, ClipboardList, ShieldCheck } from "lucide-react";
import Input from "../../../ui/Input";
import FormSection from "../shared/FormSection";
import FormRow from "../shared/FormRow";
import { useFormData } from "../hooks";

export default function Step1_ClientPO({ readOnly = false }) {
  const { formData, updateField } = useFormData();
  
  // Keep the random number stable during the component's lifecycle
  const [randomSuffix] = React.useState(() => Math.floor(1000 + Math.random() * 9000));
  
  const handleProjectNameChange = (e) => {
    const projectName = e.target.value;
    updateField("projectName", projectName);

    // Automatically generate project code if the name has at least 1 character
    if (projectName.trim().length > 0) {
      // Generate initials from words or first few letters
      const words = projectName.trim().split(/\s+/);
      let codeBase = "";
      
      if (words.length > 1) {
        codeBase = words.map(word => word[0]).join("").toUpperCase();
      } else {
        codeBase = projectName.trim().substring(0, 3).toUpperCase();
      }
      
      const generatedCode = `${codeBase}-${randomSuffix}`;
      
      // Update if empty or if it was likely auto-generated (matches the pattern)
      // We check if the user has NOT manually edited the code to something else
      // For simplicity, we update it as long as the user hasn't explicitly changed it 
      // away from our pattern, or if it's currently empty.
      if (!formData.projectCode || formData.projectCode.includes(`-${randomSuffix}`)) {
        updateField("projectCode", generatedCode);
      }
    } else {
      // Clear code if name is completely removed
      updateField("projectCode", "");
    }
  };

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
                onChange={handleProjectNameChange}
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
