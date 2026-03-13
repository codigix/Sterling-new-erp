import axios from "../../../utils/api";

export const buildStepPayload = (stepNumber, formData, poDocuments = []) => {
  const cleanAttachments = (attachments) => {
    if (!attachments) return attachments;
    const cleaned = { ...attachments };
    if (cleaned.drawings) {
      cleaned.drawings = cleaned.drawings.map(d => ({
        name: d.name,
        size: d.size,
        type: d.type,
        isLocal: d.isLocal,
        path: d.path,
      }));
      console.log(`[cleanAttachments] Cleaned ${cleaned.drawings.length} drawings:`, JSON.stringify(cleaned.drawings, null, 2));
    }
    if (cleaned.documents) {
      cleaned.documents = cleaned.documents.map(doc => ({
        name: doc.name,
        size: doc.size,
        type: doc.type,
        isLocal: doc.isLocal,
        path: doc.path,
      }));
      console.log(`[cleanAttachments] Cleaned ${cleaned.documents.length} documents:`, JSON.stringify(cleaned.documents, null, 2));
    }
    return cleaned;
  };

  const payloads = {
    1: {
      poNumber: formData.poNumber,
      projectName: formData.projectName,
      projectCode: formData.projectCode,
      projectRequirements: formData.projectRequirements || {},
      notes: formData.notes || null,
      attachments: poDocuments,
      productDetails: {
        ...(formData.productDetails || {}),
      }
    },
    
    2: {
      ...(formData.designEngineering || {}),
      attachments: cleanAttachments((formData.designEngineering || {}).attachments),
      assignedTo: formData.designEngineeringAssignedTo || null
    },
    
    3: {
      productionStartDate: formData.productionStartDate,
      estimatedCompletionDate: formData.estimatedCompletionDate,
      procurementStatus: formData.procurementStatus,
      selectedPhases: formData.selectedPhases || {},
      availablePhases: formData.availablePhases || [],
      phaseDetails: formData.productionPhaseDetails || {},
      assignedTo: formData.productionPlanAssignedTo || null
    },
    
    4: {
      materials: formData.materials || [],
      materialDetailsTable: formData.materialDetailsTable || {},
      procurementStatus: formData.procurementStatus || 'pending',
      assignedTo: formData.materialRequirementsAssignedTo || null
    },
    
    5: {
      inventory: formData.inventory || {},
      assignedTo: formData.inventoryAssignedTo || null
    },
    
    6: {
      ...formData.qualityCheck,
      qualityCompliance: {
        qualityStandards: formData.qualityCompliance?.qualityStandards || '',
        weldingStandards: formData.qualityCompliance?.weldingStandards || '',
        surfaceFinish: formData.qualityCompliance?.surfaceFinish || '',
        mechanicalLoadTesting: formData.qualityCompliance?.mechanicalLoadTesting || '',
        electricalCompliance: formData.qualityCompliance?.electricalCompliance || '',
        documentsRequired: formData.qualityCompliance?.documentsRequired || ''
      },
      warrantySupport: {
        warrantyPeriod: formData.warrantySupport?.warrantyPeriod || '',
        serviceSupport: formData.warrantySupport?.serviceSupport || ''
      },
      paymentTerms: formData.paymentTerms || null,
      status: formData.status || 'pending',
      internalInfo: formData.internalInfo || {},
      specialInstructions: formData.specialInstructions || null,
      internalProjectOwner: formData.internalProjectOwner || null,
      assignedTo: formData.qualityCheckAssignedTo || null
    },
  };

  return payloads[stepNumber] || {};
};

export const updateDraftWithStepData = async (draftId, formData, currentStep, poDocuments = []) => {
  try {
    if (!draftId) {
      throw new Error('Draft ID is required');
    }

    const response = await axios.put(`/root-cards/drafts/${draftId}`, {
      formData,
      currentStep,
      poDocuments
    });
    console.log(`Draft updated with step ${currentStep} data:`, response.data);
    return response.data;
  } catch (err) {
    console.error(`Error updating draft with step ${currentStep} data:`, err);
    throw err;
  }
};

export const deleteDraft = async (draftId) => {
  try {
    if (!draftId) return;
    const response = await axios.delete(`/root-cards/drafts/${draftId}`);
    console.log('Draft deleted successfully:', response.data);
    return response.data;
  } catch (err) {
    console.error('Error deleting draft:', err);
    throw err;
  }
};

export const uploadWizardAttachments = async (rootCardId, formData) => {
  try {
    if (!rootCardId) {
      throw new Error('Root Card ID is required for uploading attachments');
    }

    const designEng = formData.designEngineering || {};
    const attachments = designEng.attachments || {};
    
    console.log(`[uploadWizardAttachments] ===== START =====`);
    console.log(`[uploadWizardAttachments] Root Card ID: ${rootCardId}`);
    console.log(`[uploadWizardAttachments] designEng:`, designEng);
    console.log(`[uploadWizardAttachments] attachments:`, attachments);
    console.log(`[uploadWizardAttachments] attachments.drawings:`, attachments.drawings);
    console.log(`[uploadWizardAttachments] attachments.documents:`, attachments.documents);
    
    const uploadPromises = [];
    
    // Upload drawings
    if (Array.isArray(attachments.drawings) && attachments.drawings.length > 0) {
      console.log(`[uploadWizardAttachments] Processing ${attachments.drawings.length} drawings`);
      attachments.drawings.forEach((d, i) => {
        console.log(`[uploadWizardAttachments] Drawing ${i}:`, { name: d.name, isLocal: d.isLocal, hasFile: !!d.file });
      });
      const localDrawings = attachments.drawings.filter(d => d.isLocal && d.file);
      console.log(`[uploadWizardAttachments] Found ${localDrawings.length} local drawings out of ${attachments.drawings.length}`);
      if (localDrawings.length > 0) {
        const drawingFormData = new FormData();
        localDrawings.forEach(drawing => {
          drawingFormData.append('documents', drawing.file);
          console.log(`[uploadWizardAttachments] Adding drawing file: ${drawing.name}`);
        });
        drawingFormData.append('type', 'drawings');
        
        uploadPromises.push(
          axios.post(`/root-cards/steps/${rootCardId}/design-engineering/upload`, drawingFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          }).then(res => {
            console.log('[uploadWizardAttachments] Drawings uploaded successfully:', res.data);
            return res;
          }).catch(err => {
            console.warn('Failed to upload wizard drawings:', err.message);
            return null;
          })
        );
      }
    }
    
    // Upload documents
    if (Array.isArray(attachments.documents) && attachments.documents.length > 0) {
      console.log(`[uploadWizardAttachments] Processing ${attachments.documents.length} documents`);
      attachments.documents.forEach((d, i) => {
        console.log(`[uploadWizardAttachments] Document ${i}:`, { name: d.name, isLocal: d.isLocal, hasFile: !!d.file });
      });
      const localDocs = attachments.documents.filter(d => d.isLocal && d.file);
      console.log(`[uploadWizardAttachments] Found ${localDocs.length} local documents out of ${attachments.documents.length}`);
      if (localDocs.length > 0) {
        const docFormData = new FormData();
        localDocs.forEach(doc => {
          docFormData.append('documents', doc.file);
          console.log(`[uploadWizardAttachments] Adding document file: ${doc.name}`);
        });
        docFormData.append('type', 'documents');
        
        uploadPromises.push(
          axios.post(`/root-cards/steps/${rootCardId}/design-engineering/upload`, docFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          }).then(res => {
            console.log('[uploadWizardAttachments] Documents uploaded successfully:', res.data);
            return res;
          }).catch(err => {
            console.warn('Failed to upload wizard documents:', err.message);
            return null;
          })
        );
      }
    }
    
    if (uploadPromises.length > 0) {
      console.log(`[uploadWizardAttachments] Starting upload of ${uploadPromises.length} batches`);
      const results = await Promise.all(uploadPromises);
      console.log('[uploadWizardAttachments] ✓ All uploads completed:', results);
      return results;
    } else {
      console.log(`[uploadWizardAttachments] No files to upload (uploadPromises.length = 0)`);
    }
    
    console.log(`[uploadWizardAttachments] ===== END =====`);
    return [];
  } catch (err) {
    console.error('[uploadWizardAttachments] ✗ FATAL ERROR:', err.message);
    console.error('[uploadWizardAttachments] Error:', err);
    throw err;
  }
};

export const saveAllStepsToRootCard = async (rootCardId, formData, poDocuments = []) => {
  try {
    if (!rootCardId) {
      throw new Error('Root Card ID is required');
    }

    const getStepKeyFromNumber = (num) => {
      const keys = {
        1: "client_po",
        2: "design_engineering",
        3: "production",
        4: "procurement",
        5: "inventory",
        6: "quality",
      };
      return keys[num];
    };

    const steps = [];
    for (let i = 1; i <= 6; i++) {
      const stepData = buildStepPayload(i, formData, poDocuments);
      steps.push({
        stepKey: getStepKeyFromNumber(i),
        stepData: stepData,
        assignedTo: stepData.assignedTo || null,
        status: 'pending' // Default status
      });
    }

    const response = await axios.post(`/root-cards/${rootCardId}/steps/all`, { steps });
    console.log('All steps saved successfully via batch API:', response.data);
    
    // Upload buffered wizard attachments (Step 2)
    try {
      await uploadWizardAttachments(rootCardId, formData);
    } catch (attachErr) {
      console.warn('Warning: Could not upload wizard attachments:', attachErr.message);
    }
    
    return { successful: 6, failed: 0, response: response.data };
  } catch (err) {
    console.error('Error saving all steps to root card:', err);
    throw err;
  }
};
