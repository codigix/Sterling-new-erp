import React, { useEffect, useState } from "react";
import axios from "../../../utils/api";
import { useAuth } from "../../../context/AuthContext";
import { RootCardProvider } from "./context";
import { useFormUI } from "./hooks";
import { useRootCardContext } from "./hooks";
import {
  saveAllStepsToRootCard,
} from "./stepDataHandler";
import WizardHeader from "./shared/WizardHeader";
import FormActions from "./shared/FormActions";
import Step1_ClientPO from "./steps/Step1_ClientPO";
import Step2_DesignEngineering from "./steps/Step2_DesignEngineering";
import Step3_ProductionPlan from "./steps/Step3_ProductionPlan";
import Step4_MaterialRequirement from "./steps/Step4_MaterialRequirement";
import Step5_Inventory from "./steps/Step5_Inventory";
import Step6_QualityCheck from "./steps/Step6_QualityCheck";
import "./RootCardForm.css";
import { showSuccess, showError } from "../../../utils/toastUtils";
import Swal from "sweetalert2";

export default function RootCardForm({
  mode = "create",
  initialData = null,
  onSubmit,
  onCancel,
}) {
  return (
    <RootCardProvider mode={mode} initialData={initialData}>
      <RootCardFormContent
        onSubmit={onSubmit}
        onCancel={onCancel}
        mode={mode}
        initialData={initialData}
      />
    </RootCardProvider>
  );
}

function RootCardFormContent({
  onSubmit,
  onCancel,
  mode = "create",
  initialData = null,
}) {
  const {
    state,
    setStep,
    setLoading,
    setError,
    setSuccess,
    setOrderId,
    setConfigData,
    setEmployees,
    updateField,
    setPoDocuments,
    setMaterialDetailsTable,
    setProductionPhaseDetails,
    setDraftData,
    reset,
  } = useRootCardContext();
  const { currentStep, loading, error, successMessage } = useFormUI();
  const { user } = useAuth();
  const { formData } = state;

  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const userDept = (user?.department || "").toLowerCase();

  const isStepDisabled = (stepNumber) => {
    if (isAdmin) return false;
    
    // Step 1: Client PO (Sales/Admin)
    if (stepNumber === 1) return !userDept.includes("sales") && !userDept.includes("admin");
    // Step 2: Design Engineering
    if (stepNumber === 2) return !userDept.includes("engineering") && !userDept.includes("design");
    // Step 3: Production Plan
    if (stepNumber === 3) return !userDept.includes("production");
    // Step 4: Material Requirement (Procurement)
    if (stepNumber === 4) return !userDept.includes("procurement");
    // Step 5: Inventory
    if (stepNumber === 5) return !userDept.includes("inventory");
    // Step 6: Quality Check
    if (stepNumber === 6) return !userDept.includes("quality") && !userDept.includes("qc");
    
    return true;
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    try {
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
        return dateStr.trim();
      }
      
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  const loadAllStepData = React.useCallback(
    async (rootCardId) => {
      try {
        setLoading(true);
        // Step data is already loaded via the main root card fetch with includeSteps=true
        setLoading(false);
      } catch (error) {
        console.error("Error loading step data:", error);
        setLoading(false);
      }
    },
    [setLoading],
  );

  useEffect(() => {
    // Config and Employee data should be loaded from global stores or specialized hooks if needed
  }, []);

  useEffect(() => {
    if (mode === "assign") {
      setStep(6);
    }
  }, [mode, setStep]);

  useEffect(() => {
    if (
      (mode === "view" || mode === "edit" || mode === "assign") &&
      initialData
    ) {
      updateField("poNumber", initialData.po_number || "");
      updateField("projectName", initialData.project_name || "");
      updateField("projectCode", initialData.project_code || "");
      updateField("quantity", initialData.quantity || 1);
      updateField("poDate", formatDateForInput(initialData.po_date));
      updateField("deliveryDate", formatDateForInput(initialData.delivery_date));
      updateField("inspection", initialData.inspection || "");
      updateField("inspectionAuthority", initialData.inspection_authority || "");
      updateField("ld", initialData.ld || "");
      updateField("status", initialData.status || "RC_CREATED");

      if (initialData.project_scope) {
        updateField("projectRequirements", {
          ...(formData.projectRequirements || {}),
          ...initialData.project_scope,
        });
      }

      if (initialData.steps) {
        if (initialData.steps.design_engineering) {
          updateField("designEngineering", initialData.steps.design_engineering);
        }
        if (initialData.steps.production) {
          updateField("productionPlan", initialData.steps.production);
        }
        if (initialData.steps.procurement) {
          updateField("materialProcurement", initialData.steps.procurement);
        }
        if (initialData.steps.inventory) {
          updateField("inventory", initialData.steps.inventory);
        }
        if (initialData.steps.quality) {
          updateField("qualityCheck", initialData.steps.quality);
        }
      }

      loadAllStepData(initialData.id);
    } else if (mode === "create") {
      reset();
    }
  }, [mode, initialData, updateField, loadAllStepData, reset]);

  const renderStep = () => {
    const isStepReadOnly = (stepNumber) => {
      return mode === "view" || mode === "assign" || isStepDisabled(stepNumber);
    };

    switch (currentStep) {
      case 1:
        return (
          <Step1_ClientPO readOnly={isStepReadOnly(1)} />
        );
      case 2:
        return (
          <Step2_DesignEngineering
            readOnly={isStepReadOnly(2)}
          />
        );
      case 3:
        return (
          <Step3_ProductionPlan
            readOnly={isStepReadOnly(3)}
          />
        );
      case 4:
        return (
          <Step4_MaterialRequirement
            readOnly={isStepReadOnly(4)}
          />
        );
      case 5:
        return (
          <Step5_Inventory readOnly={isStepReadOnly(5)} />
        );
      case 6:
        return (
          <Step6_QualityCheck
            readOnly={mode === "view" || isStepDisabled(6)}
            isAssignMode={mode === "assign"}
          />
        );
      default:
        return null;
    }
  };

  const handleNext = async () => {
    if (mode === "view" || mode === "assign") {
      setStep(currentStep + 1);
      return;
    }

    setStep(currentStep + 1);
  };

  const handlePrev = async () => {
    setStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (mode === "assign") {
      setLoading(true);
      try {
        await axios.post(`/root-cards/${initialData.id}/assign`, {
          assignedTo: formData.internalProjectOwner,
          assignedAt: new Date().toISOString(),
        });

        Swal.fire({
          title: "Assigned!",
          text: "Root Card has been assigned successfully.",
          icon: "success",
          confirmButtonColor: "#3085d6",
        }).then(() => {
          if (onSubmit) onSubmit();
        });
      } catch (err) {
        showError(err.response?.data?.message || "Failed to assign root card");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const rootCardData = {
        poNumber: formData.poNumber,
        poDate: formData.poDate,
        projectName: formData.projectName,
        projectCode: formData.projectCode,
        quantity: parseInt(formData.quantity || 1),
        deliveryDate: formData.deliveryDate || formData.estimatedEndDate,
        status: formData.status || "RC_CREATED",
        inspection: formData.inspection,
        inspectionAuthority: formData.inspectionAuthority,
        ld: formData.ld,
        items: formData.items || [],
        documents: state.poDocuments || [],
        notes: formData.notes || formData.specialInstructions || "",
        projectScope: formData.projectRequirements || {},
      };

      let response;
      if (mode === "edit" && initialData?.id) {
        response = await axios.put(`/root-cards/${initialData.id}`, rootCardData);
      } else {
        response = await axios.post("/root-cards", rootCardData);
      }
      
      const rootCardId = response.data.rootCard?.id || response.data.id || initialData?.id;

      if (!rootCardId) {
        throw new Error("Failed to process root card - no ID returned");
      }

      const mergedFormData = {
        ...formData,
        materialDetailsTable: state.materialDetailsTable,
        productionPhaseDetails: state.productionPhaseDetails,
      };

      await saveAllStepsToRootCard(
        rootCardId,
        mergedFormData,
        state.poDocuments || []
      );

      Swal.fire({
        title: "Success!",
        text: `Root Card ${mode === "edit" ? "updated" : "created"} successfully.`,
        icon: "success",
        confirmButtonColor: "#3085d6",
      }).then(() => {
        if (onSubmit) onSubmit();
      });
    } catch (err) {
      console.error("Error:", err);
      showError(err.response?.data?.message || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50">
      <div className="w-full mx-auto p-2">
        <WizardHeader currentStep={currentStep} mode={mode} />

        <div className="mt-6">{renderStep()}</div>

        <FormActions
          currentStep={currentStep}
          onNext={handleNext}
          onPrev={handlePrev}
          onSubmit={handleSubmit}
          loading={loading}
          onCancel={onCancel}
          mode={mode}
        />
      </div>
    </div>
  );
}
