import React, { useState } from 'react';
import { Download, ArrowLeft, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import RootCardWizard from '../../sales/RootCardWizard';
import DataTable from '../../ui/DataTable/DataTable';

export default function RootCardViewOnly({ formData, initialData, onBack, employees = [] }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const getEmployeeName = (id) => {
    if (!id) return 'Not Assigned';
    const emp = employees.find(e => String(e.id) === String(id));
    return emp ? `${emp.firstName} ${emp.lastName}` : `ID: ${id}`;
  };

  const generatePDF = async () => {
    try {
      setIsGenerating(true);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      doc.setFontSize(16);
      doc.text('Root Card Details', margin, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setTextColor(100);

      const addSection = (title, data) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(title, margin, yPosition);
        yPosition += 8;

        doc.setLineWidth(0.5);
        doc.setDrawColor(200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;

        Object.entries(data).forEach(([key, value]) => {
          if (!value) return;

          if (yPosition > pageHeight - 15) {
            doc.addPage();
            yPosition = 20;
          }

          const label = key.replace(/([A-Z])/g, ' $1').trim();
          const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);

          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(`${label}:`, margin, yPosition);

          doc.setTextColor(0);
          const splitText = doc.splitTextToSize(displayValue, contentWidth - 50);
          doc.text(splitText, margin + 50, yPosition);

          yPosition += Math.max(5, splitText.length * 4) + 3;
        });

        yPosition += 5;
      };

      if (initialData?.po_number || formData?.poNumber) {
        addSection('Step 1: Project Information', {
          'PO Number': initialData?.po_number || formData?.poNumber,
          'Project Name': initialData?.project_name || formData?.projectName,
          'Project Code': formData?.projectCode,
          'Project Owner': getEmployeeName(formData?.internalProjectOwner),
          'Project Requirements': formData?.projectRequirements,
        });
      }

      if (formData.attachments?.length > 0) {
        addSection('Step 1: PO Attachments', {
          'Attachments': formData.attachments.map(doc => typeof doc === 'string' ? doc.split('/').pop() : doc.name).join(', ')
        });
      }

      if (formData?.designEngineering) {
        const designData = formData.designEngineering;
        addSection('Step 2: Design Engineering', {
          'Design ID': designData.generalDesignInfo?.designId,
          'Product Name': designData.productSpecification?.productName,
          'Design Status': designData.generalDesignInfo?.designStatus,
          // ... rest of design fields
        });
      }

      if (formData?.productionPlan) {
        const prodData = formData.productionPlan;
        addSection('Step 3: Production', {
          'Selected Phases': prodData.selectedPhases ? Object.keys(prodData.selectedPhases).join(', ') : 'N/A',
          'Assigned To': getEmployeeName(formData?.productionPlanAssignedTo),
          'Production Notes': prodData.productionNotes,
          'Estimated Completion': prodData.estimatedCompletionDate,
        });
      }

      if (formData?.materialProcurement) {
        const matData = formData.materialProcurement;
        const materialsDetails = Array.isArray(matData.materials) ? matData.materials.map((mat, idx) => `${idx + 1}. ${mat.name || mat.type || 'Material'} - Qty: ${mat.quantity || 'N/A'}`).join('; ') : 'None';
        addSection('Step 4: Procurement', {
          'Total Material Cost': matData.totalMaterialCost,
          'Procurement Status': matData.procurementStatus,
          'Assigned To': getEmployeeName(formData?.materialRequirementsAssignedTo),
          'Materials Count': Array.isArray(matData.materials) ? matData.materials.length : 0,
          'Materials Details': materialsDetails,
          'Notes': matData.notes,
        });
      }

      if (formData?.inventory) {
        addSection('Step 5: Inventory', {
          'Status': 'Tracking inventory data',
          'Assigned To': getEmployeeName(formData?.inventoryAssignedTo),
        });
      }

      if (formData?.qualityCheck || formData?.qualityCompliance || formData?.paymentTerms) {
        const qcData = formData.qualityCheck || {};
        const inspectionsDetails = Array.isArray(qcData.inspections) ? qcData.inspections.map((insp, idx) => `${idx + 1}. ${insp.type || 'Inspection'} - ${insp.result || 'N/A'}`).join('; ') : 'None';
        addSection('Step 6: Quality Check & Economics', {
          'Inspection Type': qcData.inspectionType,
          'QC Status': qcData.qcStatus,
          'Project Owner': getEmployeeName(formData?.internalProjectOwner),
          'Assigned To': getEmployeeName(formData?.qualityCheckAssignedTo),
          'Inspections Count': Array.isArray(qcData.inspections) ? qcData.inspections.length : 0,
          'Inspections Details': inspectionsDetails,
          'Remarks': qcData.remarks,
          'Job Card Number': formData.internalInfo?.jobCardNo,
          'Quality Standards': formData.qualityCompliance?.qualityStandards,
          'Welding Standards': formData.qualityCompliance?.weldingStandards,
          'Surface Finish': formData.qualityCompliance?.surfaceFinish,
          'Mechanical Load Testing': formData.qualityCompliance?.mechanicalLoadTesting,
          'Electrical Compliance': formData.qualityCompliance?.electricalCompliance,
          'Documents Required': formData.qualityCompliance?.documentsRequired,
          'Warranty Period': formData.warrantySupport?.warrantyPeriod,
          'Service Support': formData.warrantySupport?.serviceSupport,
          'Payment Terms': formData.paymentTerms,
          'Estimated Costing': formData.internalInfo?.estimatedCosting,
          'Estimated Profit': formData.internalInfo?.estimatedProfit,
          'Special Instructions': formData.specialInstructions,
        });
      }

      const fileName = `Root_Card_${initialData?.po_number || initialData?.id || 'report'}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const DetailField = ({ label, value }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="space-y-1">
        <label className="text-xs  text-slate-500  ">{label}</label>
        <p className="text-sm text-black">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
      </div>
    );
  };

  const SectionHeader = ({ number, title }) => (
    <div className="flex items-center gap-3 mb-2 border-b border-slate-200 pb-2">
      <span className="flex items-center justify-center w-8 h-8 rounded  bg-blue-100 text-blue-600  text-sm">
        {number}
      </span>
      <h2 className="text-md ">{title}</h2>
    </div>
  );

  return (
    <div className="w-full p-2 bg-white min-h-screen">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
        <div className=" mx-auto p-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded transition-colors"
                title="Back"
              >
                <ArrowLeft size={20} className="text-slate-500" />
              </button>
              <div>
                <h1 className="text-xl  text-slate-900">Root Card Details
</h1>
                <p className="text-xs text-slate-500">
                  {initialData?.po_number || formData?.poNumber || 'New Root Card'}
                </p>
              </div>
            </div>
            <button
              onClick={generatePDF}
              disabled={isGenerating}
              className="flex items-center gap-2 p-2 bg-blue-600 text-xs hover:bg-blue-700 disabled:bg-slate-300 text-white rounded  transition-colors"
              title="Download as PDF"
            >
              <Download size={15} />
              {isGenerating ? 'Generating...' : 'PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className=" mx-auto  p-2 space-y-2">
        {!formData?.poNumber && !initialData?.po_number && (
          <div className="text-center py-12">
            <p className="text-slate-500">No data filled in this root card yet.</p>
          </div>
        )}

        {/* Step 1: Project Information */}
        {(initialData?.po_number || formData?.poNumber) && (
          <section>
            <SectionHeader number="1" title="Project Information" />
            <div className="space-y-2">
              <div className="bg-white border-b border-slate-200  p-2 mb-0">
                <h3 className="text-md  text-slate-900 mb-2">PO & Project Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailField label="PO Number" value={initialData?.po_number || formData?.poNumber} />
                  <DetailField label="Project Name" value={initialData?.project_name || formData?.projectName} />
                  <DetailField label="Project Code" value={formData?.projectCode} />
                  <DetailField label="Project Owner" value={getEmployeeName(formData?.internalProjectOwner)} />
                </div>
              </div>

              <div className="bg-white border-b border-slate-200  p-2 mb-0">
                {formData?.projectRequirements && Object.keys(formData.projectRequirements).length > 0 && (
                  <div className="mt-0">
                    <h4 className="text-sm  text-slate-700 mb-3">Project Requirements</h4>
                    <div className="space-y-2">
                      {Object.entries(formData.projectRequirements).map(([key, value]) => {
                        const hasValue = value && (typeof value !== 'object' || Object.keys(value).length > 0);
                        return hasValue ? (
                          <p key={key} className="text-sm text-slate-500">
                            <span className="text-slate-700 ">{key}:</span> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </p>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                <DetailField label="Notes" value={formData?.notes} />
              </div>

              {formData?.attachments?.length > 0 && (
                <div className="bg-white border-b border-slate-200 p-2 mb-0">
                  <h3 className="text-md  text-slate-900 mb-2">Project Attachments</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded "></span>
                        {typeof file === 'string' ? file.split('/').pop() : file.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 2: Design Engineering */}
        {formData?.designEngineering && (
          <section>
            <SectionHeader number="2" title="Design Engineering" />
            <div className="space-y-2">
              <div className="bg-white border-b border-slate-200  p-2 mb-0">
                <h3 className="text-md  text-slate-900 mb-2">Design Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailField label="Design ID" value={formData.designEngineering.generalDesignInfo?.designId} />
                  <DetailField label="Product Name" value={formData.designEngineering.productSpecification?.productName} />
                  <DetailField label="Design Status" value={formData.designEngineering.generalDesignInfo?.designStatus} />
                </div>
              </div>

              <div className="bg-white border-b border-slate-200  p-2 mb-0">
                <h3 className="text-md  text-slate-900 mb-2">Product Dimensions & Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailField label="Length (mm)" value={formData.designEngineering.productSpecification?.systemLength} />
                  <DetailField label="Width (mm)" value={formData.designEngineering.productSpecification?.systemWidth} />
                  <DetailField label="Height (mm)" value={formData.designEngineering.productSpecification?.systemHeight} />
                  <DetailField label="Load Capacity (kg)" value={formData.designEngineering.productSpecification?.loadCapacity} />
                  <DetailField label="Operating Environment" value={formData.designEngineering.productSpecification?.operatingEnvironment} />
                  <DetailField label="Material Grade" value={formData.designEngineering.productSpecification?.materialGrade} />
                  <DetailField label="Surface Finish" value={formData.designEngineering.productSpecification?.surfaceFinish} />
                </div>
              </div>

              <div className="bg-white border-b border-slate-200  p-2 mb-0">
                <h3 className="text-md  text-slate-900 mb-2">Materials Required for Production</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailField label="Steel Sections" value={formData.designEngineering.materialsRequired?.steelSections?.length > 0 ? formData.designEngineering.materialsRequired.steelSections.join(', ') : 'None selected'} />
                  <DetailField label="Plates" value={formData.designEngineering.materialsRequired?.plates?.length > 0 ? formData.designEngineering.materialsRequired.plates.join(', ') : 'None selected'} />
                  <DetailField label="Fasteners & Hardware" value={formData.designEngineering.materialsRequired?.fasteners?.length > 0 ? formData.designEngineering.materialsRequired.fasteners.join(', ') : 'None selected'} />
                  <DetailField label="Mechanical Components" value={formData.designEngineering.materialsRequired?.components?.length > 0 ? formData.designEngineering.materialsRequired.components.join(', ') : 'None selected'} />
                  <DetailField label="Electrical & Automation" value={formData.designEngineering.materialsRequired?.electrical?.length > 0 ? formData.designEngineering.materialsRequired.electrical.join(', ') : 'None selected'} />
                  <DetailField label="Consumables & Paint" value={formData.designEngineering.materialsRequired?.consumables?.length > 0 ? formData.designEngineering.materialsRequired.consumables.join(', ') : 'None selected'} />
                </div>
              </div>

              {formData.designEngineering.attachments?.drawings?.length > 0 && (
                <div className="bg-white border-b border-slate-200  p-2 mb-0">
                  <h3 className="text-md  text-slate-900 mb-2">Design Drawings</h3>
                  <ul className="space-y-2">
                    {formData.designEngineering.attachments.drawings.map((file, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded "></span>
                        {typeof file === 'string' ? file : file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {formData.designEngineering.attachments?.documents?.length > 0 && (
                <div className="bg-white border-b border-slate-200  p-2 mb-0">
                  <h3 className="text-md  text-slate-900 mb-2">Supporting Documents</h3>
                  <ul className="space-y-2">
                    {formData.designEngineering.attachments.documents.map((file, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded "></span>
                        {typeof file === 'string' ? file : file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-white border-b border-slate-200  p-2 mb-0">
                <h3 className="text-md  text-slate-900 mb-2">Design Notes & Special Requirements</h3>
                <div className="space-y-4">
                  <DetailField label="Design Specifications Summary" value={formData.designEngineering.commentsNotes?.designSpecifications} />
                  <DetailField label="Manufacturing Instructions" value={formData.designEngineering.commentsNotes?.manufacturingInstructions} />
                  <DetailField label="Quality & Safety Requirements" value={formData.designEngineering.commentsNotes?.qualitySafety} />
                  <DetailField label="Additional Notes" value={formData.designEngineering.commentsNotes?.additionalNotes} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Step 3: Production */}
        {formData?.productionPlan && (
          <section>
            <SectionHeader number="3" title="Production" />
            <div className="space-y-2">
              <div className="bg-white border-b border-slate-200  p-2 mb-0">
                <h3 className="text-md  text-slate-900 mb-2">Production Timeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailField label="Production Start Date" value={formData.productionPlan.timeline?.startDate} />
                  <DetailField label="Production End Date" value={formData.productionPlan.timeline?.endDate} />
                  <DetailField label="Estimated Completion Date" value={formData.productionPlan.estimatedCompletionDate} />
                  <DetailField label="Assigned To" value={getEmployeeName(formData?.productionPlanAssignedTo)} />
                </div>
              </div>

              {formData.productionPlan.productionNotes && (
                <div className="bg-white border-b border-slate-200  p-2 mb-0">
                  <h3 className="text-md  text-slate-900 mb-2">Production Notes</h3>
                  <p className="text-slate-700 text-sm">{formData.productionPlan.productionNotes}</p>
                </div>
              )}

              {formData.productionPlan.selectedPhases && Object.keys(formData.productionPlan.selectedPhases).length > 0 && (
                <div className="bg-white border-b border-slate-200  p-2 mb-0">
                  <h3 className="text-md  text-slate-900 mb-2">Production Phases</h3>
                  <div className="space-y-2">
                    {Object.entries(formData.productionPlan.selectedPhases).map(([phase, selected]) =>
                      selected ? (
                        <div key={phase} className="flex items-center gap-2 text-slate-700 text-sm">
                          <CheckCircle2 size={15} className="text-green-500" />
                          {phase}
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 4: Procurement */}
        {formData?.materialProcurement && (
          <section>
            <SectionHeader number="4" title="Procurement" />
            <div className="space-y-2">
              <div className="bg-white border-b border-slate-200  p-2 mb-0">
                <h3 className="text-md  text-slate-900 mb-2">Procurement Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailField label="Procurement Status" value={formData.materialProcurement.procurementStatus || 'Not specified'} />
                  <DetailField label="Total Material Cost" value={formData.materialProcurement.totalMaterialCost || '0'} />
                  <DetailField label="Materials Count" value={Array.isArray(formData.materialProcurement.materials) ? formData.materialProcurement.materials.length : 0} />
                  <DetailField label="Assigned To" value={getEmployeeName(formData?.materialRequirementsAssignedTo)} />
                </div>
              </div>

              {formData.materialProcurement.notes && (
                <div className="bg-white border-b border-slate-200  p-2 mb-0">
                  <DetailField label="Notes" value={formData.materialProcurement.notes} />
                </div>
              )}

              {Array.isArray(formData.materialDetailsTable) && formData.materialDetailsTable.length > 0 && (
                <div className="bg-white border-b border-slate-200 p-2 mb-0">
                  <h3 className="text-md  text-slate-900 mb-4">Material Details Table</h3>
                  <DataTable
                    data={formData.materialDetailsTable}
                    columns={[
                      {
                        key: "index",
                        label: "Sr. No.",
                        render: (_, __, ___, idx) => idx + 1
                      },
                      {
                        key: "materialDescription",
                        label: "Description"
                      },
                      {
                        key: "specification",
                        label: "Spec/Size"
                      },
                      {
                        key: "quantity",
                        label: "Qty"
                      },
                      {
                        key: "uom",
                        label: "UOM"
                      },
                      {
                        key: "category",
                        label: "Category"
                      },
                      {
                        key: "source",
                        label: "Source"
                      }
                    ]}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 5: Inventory */}
        {formData?.inventory && (
          <section>
            <SectionHeader number="5" title="Inventory" />
            <div className="bg-white border-b border-slate-200 p-2 mb-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailField label="Assigned To" value={getEmployeeName(formData?.inventoryAssignedTo)} />
                <DetailField label="Inventory Status" value="In implementation" />
              </div>
            </div>
          </section>
        )}

        {/* Step 6: Quality Check */}
        {(formData?.qualityCheck || formData?.qualityCompliance || formData?.paymentTerms) && (
          <section>
            <SectionHeader number="6" title="Quality" />
            <div className="space-y-2">
              <div className="bg-white border-b border-slate-200  p-2 mb-0">
                <h3 className="text-md  text-slate-900 mb-2">QC Status & Inspections</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <DetailField label="Inspection Type" value={formData.qualityCheck?.inspectionType} />
                  <DetailField label="QC Status" value={formData.qualityCheck?.qcStatus} />
                  <DetailField label="Internal Project Owner" value={getEmployeeName(formData?.internalProjectOwner)} />
                  <DetailField label="Remarks" value={formData.qualityCheck?.remarks} />
                  <DetailField label="Assigned To" value={getEmployeeName(formData?.qualityCheckAssignedTo)} />
                  <DetailField label="Job Card Number" value={formData.internalInfo?.jobCardNo} />
                  <DetailField label="Inspection Count" value={Array.isArray(formData.qualityCheck?.inspections) ? formData.qualityCheck.inspections.length : 0} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <DetailField label="Estimated Costing (₹)" value={formData.internalInfo?.estimatedCosting} />
                  <DetailField label="Estimated Profit (₹)" value={formData.internalInfo?.estimatedProfit} />
                </div>

                {Array.isArray(formData.qualityCheck?.inspections) && formData.qualityCheck.inspections.length > 0 && (
                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="text-sm  text-slate-700 mb-4">Inspection Details</h4>
                    <div className="space-y-3">
                      {formData.qualityCheck.inspections.map((inspection, idx) => (
                        <div key={idx} className="bg-slate-50 rounded p-4 border border-slate-200">
                          <p className=" text-slate-900 mb-2">{inspection.type || 'Inspection ' + (idx + 1)}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {inspection.date && <p className="text-slate-500"><span className="text-slate-700">Date:</span> {inspection.date}</p>}
                            {inspection.inspector && <p className="text-slate-500"><span className="text-slate-700">Inspector:</span> {inspection.inspector}</p>}
                            {inspection.result && <p className="text-slate-500"><span className="text-slate-700">Result:</span> {inspection.result}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quality & Compliance Requirements moved from Step 1 */}
              {(formData?.qualityCompliance || formData?.warrantySupport) && (
                <div className="bg-white border-b border-slate-200 p-2 mb-0">
                  <h3 className="text-md  text-slate-900 mb-2">Quality & Compliance Requirements</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailField label="Quality Standards" value={formData.qualityCompliance?.qualityStandards} />
                    <DetailField label="Welding Standards" value={formData.qualityCompliance?.weldingStandards} />
                    <DetailField label="Surface Finish" value={formData.qualityCompliance?.surfaceFinish} />
                    <DetailField label="Mechanical Load Testing" value={formData.qualityCompliance?.mechanicalLoadTesting} />
                    <DetailField label="Electrical Compliance" value={formData.qualityCompliance?.electricalCompliance} />
                    <DetailField label="Documents Required" value={formData.qualityCompliance?.documentsRequired} />
                    <DetailField label="Warranty Period" value={formData.warrantySupport?.warrantyPeriod} />
                    <DetailField label="Service Support" value={formData.warrantySupport?.serviceSupport} />
                  </div>
                </div>
              )}

              {/* Payment & Economics moved from Step 1 */}
              <div className="bg-white border-b border-slate-200 p-2 mb-0">
                <h3 className="text-md  text-slate-900 mb-2">Payment & Project Economics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailField label="Payment Terms" value={formData?.paymentTerms} />
                  <DetailField label="Status" value={formData?.status} />
                </div>
              </div>

              {formData?.specialInstructions && (
                <div className="bg-white border-b border-slate-200  p-2 mb-0">
                  <DetailField label="Special Instructions" value={formData?.specialInstructions} />
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
