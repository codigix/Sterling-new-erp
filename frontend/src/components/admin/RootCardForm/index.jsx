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
import RootCardViewOnly from "./RootCardViewOnly";
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

        const clientPOResponse = await axios
          .get(`/root-cards/steps/${rootCardId}/client_po`)
          .catch(() => null);
        const designResponse = await axios
          .get(`/root-cards/steps/${rootCardId}/design_engineering`)
          .catch(() => null);
        const productionResponse = await axios
          .get(`/root-cards/steps/${rootCardId}/production`)
          .catch(() => null);
        const procurementResponse = await axios
          .get(`/root-cards/steps/${rootCardId}/procurement`)
          .catch(() => null);
        const inventoryResponse = await axios
          .get(`/root-cards/steps/${rootCardId}/inventory`)
          .catch(() => null);
        const qualityResponse = await axios
          .get(`/root-cards/steps/${rootCardId}/quality`)
          .catch(() => null);
        const allStepsResponse = await axios
          .get(`/root-cards/steps/${rootCardId}/steps`)
          .catch(() => null);

        if (allStepsResponse?.data?.data?.steps) {
          const steps = allStepsResponse.data.data.steps;
          const stepKeyMapping = {
            design_engineering: "designEngineering",
            production: "productionPlan",
            procurement: "materialRequirements",
            inventory: "inventory",
            quality: "qualityCheck",
          };
          steps.forEach((step) => {
            if (step.assignedTo) {
              const camelKey = stepKeyMapping[step.stepKey] || step.stepKey;
              const assigneeKey = `${camelKey}AssignedTo`;
              updateField(assigneeKey, step.assignedTo);
            }
          });
        }

        if (clientPOResponse?.data?.data) {
          const poData = clientPOResponse.data.data;
          updateField("poNumber", poData.poNumber || "");
          updateField("poDate", formatDateForInput(poData.poDate));
          updateField("projectName", poData.projectName || "");
          updateField("projectCode", poData.projectCode || "");
          updateField("projectRequirements", poData.projectRequirements || {});
          updateField("notes", poData.notes || null);

          if (poData.attachments) {
            setPoDocuments(poData.attachments);
          }

          if (poData.productDetails) {
            updateField("productDetails", poData.productDetails);
            if (poData.productDetails.estimatedEndDate) {
              updateField(
                "estimatedEndDate",
                formatDateForInput(poData.productDetails.estimatedEndDate),
              );
            }
          }
        }

        if (designResponse?.data?.data) {
          const designData = designResponse.data.data;
          updateField("designEngineering", designData);
        }

        if (procurementResponse?.data?.data) {
          const materialsData = procurementResponse.data.data;
          updateField("materialProcurement", materialsData);
          updateField(
            "procurementStatus",
            materialsData.procurementStatus || "pending",
          );
          if (materialsData.materials) {
            updateField("materials", materialsData.materials);
          } else if (materialsData.materialProcurement?.materials) {
            updateField(
              "materials",
              materialsData.materialProcurement.materials,
            );
          }

          if (materialsData.materialDetailsTable) {
            setMaterialDetailsTable(materialsData.materialDetailsTable);
            updateField(
              "materialDetailsTable",
              materialsData.materialDetailsTable,
            );
          }
        }

        if (productionResponse?.data?.data) {
          const productionData = productionResponse.data.data;
          updateField("productionPlan", productionData);
          
          const startDate = productionData.productionStartDate || productionData.timeline?.productionStartDate || productionData.timeline?.startDate;
          const endDate = productionData.estimatedCompletionDate || productionData.timeline?.estimatedCompletionDate || productionData.timeline?.endDate;
          const status = productionData.procurementStatus || productionData.timeline?.procurementStatus || "";

          updateField("productionStartDate", formatDateForInput(startDate));
          updateField("estimatedCompletionDate", formatDateForInput(endDate));
          updateField("procurementStatus", status);
          updateField("selectedPhases", productionData.selectedPhases || {});
          
          const availablePhases = (productionData.availablePhases && productionData.availablePhases.length > 0) 
            ? productionData.availablePhases 
            : Object.keys(productionData.selectedPhases || {}).map(name => ({ name }));
            
          updateField("availablePhases", availablePhases);
          
          if (productionData.phaseDetails) {
            setProductionPhaseDetails(productionData.phaseDetails);
          }
        }

        if (inventoryResponse?.data?.data) {
          const inventoryData = inventoryResponse.data.data;
          updateField("inventory", inventoryData || {});
        }

        if (qualityResponse?.data?.data) {
          const qcData = qualityResponse.data.data;

          if (
            qcData.qualityCheck?.inspections &&
            Array.isArray(qcData.qualityCheck.inspections)
          ) {
            qcData.qualityCheck.inspections =
              qcData.qualityCheck.inspections.map((insp) => ({
                ...insp,
                date: formatDateForInput(insp.date),
              }));
          }

          updateField("qualityCheck", qcData.qualityCheck || {});

          if (qcData.qualityCompliance)
            updateField("qualityCompliance", qcData.qualityCompliance);
          if (qcData.warrantySupport)
            updateField("warrantySupport", qcData.warrantySupport);
          if (qcData.paymentTerms)
            updateField("paymentTerms", qcData.paymentTerms);
          if (qcData.projectPriority)
            updateField("projectPriority", qcData.projectPriority);
          if (qcData.totalAmount)
            updateField("totalAmount", qcData.totalAmount);
          if (qcData.internalInfo)
            updateField("internalInfo", qcData.internalInfo);
          if (qcData.specialInstructions)
            updateField("specialInstructions", qcData.specialInstructions);
          if (qcData.status) updateField("status", qcData.status);
          if (qcData.internalProjectOwner)
            updateField("internalProjectOwner", qcData.internalProjectOwner);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading step data:", error);
        setLoading(false);
      }
    },
    [
      setLoading,
      updateField,
      setPoDocuments,
      setMaterialDetailsTable,
      setProductionPhaseDetails,
    ],
  );

  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        const response = await axios.get("/root-cards/config/all");
        const {
          projectCategories,
          materialUnits,
          materialSources,
          priorityLevels,
        } = response.data;
        setConfigData(
          projectCategories,
          materialUnits,
          materialSources,
          priorityLevels,
        );
      } catch (err) {
        console.error("Failed to fetch config data:", err);
      }
    };

    const fetchEmployees = async () => {
      try {
        const response = await axios.get("/employees");
        setEmployees(response.data || []);
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      }
    };

    fetchConfigData();
    fetchEmployees();
  }, [setConfigData, setEmployees]);

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

  if (mode === "view") {
    return (
      <RootCardViewOnly
        formData={formData}
        initialData={initialData}
        onBack={onCancel}
        employees={state.employees}
      />
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50">
      <div className="w-full mx-auto p-4">
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
