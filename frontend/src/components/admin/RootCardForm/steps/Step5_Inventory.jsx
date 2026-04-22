import React from "react";
import { Package } from "lucide-react";
import FormSection from "../shared/FormSection";
import { useFormData, useRootCardContext } from "../hooks";

export default function Step5_Inventory({ readOnly = false }) {
  const { updateField } = useFormData();
  const { state } = useRootCardContext();

  return (
    <div className="space-y-2">
      <FormSection
        title="Inventory Management"
        subtitle="Track material availability and warehouse status"
        icon={Package}
      >
        <div className="p-8 bg-white border border-slate-200 rounded ">
          <h3 className="text-xl  text-slate-900 mb-4">Inventory Tracking</h3>
          <p className="text-slate-500">Inventory tracking and management for this project.</p>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-700 text-sm ">This module is currently being implemented to provide real-time stock levels and warehouse integration.</p>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
