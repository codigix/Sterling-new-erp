import React, { useState, useMemo } from 'react';
import { Send, Activity, X, FileText, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/api';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../ui/DataTable/DataTable';

const MaterialRequestModal = ({ isOpen, onClose, data, materials, planId, onSavePlan }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Consolidate materials: group by specification/itemCode and sum quantities
  const consolidatedMaterials = useMemo(() => {
    if (!materials || !Array.isArray(materials)) return [];

    const map = new Map();

    materials.forEach(item => {
      const key = item.itemCode || item.materialCode || item.specification || item.itemName;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.requiredQty = Number(existing.requiredQty) + Number(item.requiredQty || 0);
        
        // Combine source names if they are different
        if (item.sourceAssembly && !existing.sourceAssembly.includes(item.sourceAssembly)) {
          existing.sourceAssembly += `, ${item.sourceAssembly}`;
        }
      } else {
        map.set(key, { ...item, requiredQty: Number(item.requiredQty || 0) });
      }
    });

    return Array.from(map.values());
  }, [materials]);

  if (!isOpen) return null;

  const handleProcessRequest = async () => {
    let currentPlanId = planId;

    if (!currentPlanId && typeof onSavePlan === 'function') {
      const savedPlanId = await onSavePlan();
      if (!savedPlanId) return;
      currentPlanId = savedPlanId;
    }

    // Try multiple possible property names for the Sales Order ID
    const finalRootCardId = data?.salesOrderId || data?.sales_order_id || data?.rootCardId || data?.root_card_id;
    
    if (!finalRootCardId || finalRootCardId === '0' || finalRootCardId === '') {
      Swal.fire({
        icon: 'error',
        title: 'Missing Source',
        text: 'A Sales Order must be linked to create Material Requests. (Source ID is missing)',
        confirmButtonColor: '#0f172a'
      });
      return;
    }

    if (!consolidatedMaterials || consolidatedMaterials.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'No Items',
        text: 'At least one material must be selected to create a request.',
        confirmButtonColor: '#0f172a'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('--- Material Request Payload Debug ---');
      const payload = {
        rootCardId: finalRootCardId,
        productionPlanId: currentPlanId,
        department: 'Production',
        purpose: 'Material Issue',
        requiredDate: data.estimatedCompletionDate,
        priority: 'medium',
        remarks: `Generated from Production Plan: ${data.planName}`,
        items: consolidatedMaterials.map(m => ({
          materialName: m.itemName || m.specification || 'Unknown Material',
          materialCode: m.itemCode || m.materialCode || m.specification || null,
          materialType: m.materialType || m.material_type || null,
          itemGroup: m.itemGroup || m.item_group || null,
          materialGrade: m.materialGrade || m.material_grade || null,
          partDetail: m.partDetail || m.part_detail || null,
          make: m.make || null,
          quantity: m.requiredQty || 0,
          uom: m.uom || 'Nos',
          remark: m.remark || '',
          specification: m.specification || null,
          density: m.density || 0,
          length: m.length || 0,
          width: m.width || 0,
          thickness: m.thickness || 0,
          diameter: m.diameter || 0,
          outerDiameter: m.outerDiameter || m.outer_diameter || 0,
          height: m.height || 0,
          side1: m.side1 || 0,
          side2: m.side2 || 0,
          web_thickness: m.webThickness || m.web_thickness || 0,
          flange_thickness: m.flangeThickness || m.flange_thickness || 0,
          unitWeight: m.unitWeight || m.unit_weight || m.calculatedWeight || 0,
          totalWeight: (m.unitWeight || m.unit_weight || m.calculatedWeight || 0) * (m.requiredQty || 0)
        }))
      };
      console.log('Payload:', JSON.stringify(payload, null, 2));

      await axios.post('/department/inventory/material-requests', payload);
      
      Swal.fire({
        icon: 'success',
        title: 'Requests Generated',
        text: 'Material requests have been successfully sent to procurement.',
        confirmButtonColor: '#0f172a'
      }).then(() => {
        // Only redirect to inventory page if user is admin or has inventory access
        // Production users should stay on their current page (production plan)
        const isProductionUser = user?.role?.toLowerCase().includes('production');
        const canViewInventory = ['Admin', 'Inventory', 'Procurement'].includes(user?.role);
        
        if (canViewInventory && !isProductionUser) {
          navigate('/department/inventory/material-requests');
        }
      });
      
      onClose();
    } catch (err) {
      console.error('Error creating material requests:', err);
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: err.response?.data?.message || 'Failed to process material requests.',
        confirmButtonColor: '#0f172a'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded  shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-green-500/10 flex items-center justify-center">
              <Send size={20} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg  text-slate-900 dark:text-white">Material Request</h2>
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-green-500" />
                <span className="text-xs   text-slate-500 tracking-wider">Resource Acquisition Phase</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto text-slate-900 dark:text-slate-100">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700/50">
              <span className="text-xs   text-slate-400">Request Identifier</span>
              <p className="text-sm  text-slate-900 dark:text-white mt-1 ">
                {planId ? `PP-MR-${planId}` : 'PENDING SAVE'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700/50">
              <span className="text-xs   text-slate-400">Originating Dept</span>
              <p className="text-sm  text-slate-900 dark:text-white mt-1 ">Production</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700/50">
              <span className="text-xs   text-slate-400">SLA Target Date</span>
              <p className="text-sm  text-slate-900 dark:text-white mt-1">{data.estimatedCompletionDate || 'Not set'}</p>
            </div>
          </div>


          {/* Components List */}
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="w-1 h-4 bg-green-500 rounded " />
              <h3 className="text-xs  text-black dark:text-slate-200  tracking-wider">Requested Components ({consolidatedMaterials?.length || 0})</h3>
            </div>
            <div className="border border-slate-100 dark:border-slate-800 rounded overflow-hidden">
              <DataTable
                data={consolidatedMaterials || []}
                columns={[
                  {
                    key: 'itemName',
                    label: 'Component Intelligence',
                    render: (_, m) => (
                      <div>
                        <p className=" text-slate-900 dark:text-white text-xs">
                          {m.itemName || m.specification}
                          {(m.itemCode || m.materialCode) && (
                            <span className="ml-1 text-slate-400 ">
                              ({m.itemCode || m.materialCode})
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] text-slate-500  uppercase tracking-tight">
                          {m.itemGroup && <span className="text-blue-600 dark:text-blue-400">{m.itemGroup}</span>}
                          {m.length > 0 && <span>L: {m.length}</span>}
                          {m.width > 0 && <span>W: {m.width}</span>}
                          {m.thickness > 0 && <span>T: {m.thickness}</span>}
                          {m.diameter > 0 && <span>Dia: {m.diameter}</span>}
                          {(m.outer_diameter > 0 || m.outerDiameter > 0) && <span>OD: {m.outer_diameter || m.outerDiameter}</span>}
                          {m.height > 0 && <span>H: {m.height}</span>}
                          {m.side1 > 0 && <span>S/W: {m.side1}</span>}
                          {m.side2 > 0 && <span>H: {m.side2}</span>}
                          {(m.web_thickness > 0 || m.webThickness > 0) && <span>Tw: {m.web_thickness || m.webThickness}</span>}
                          {(m.flange_thickness > 0 || m.flangeThickness > 0) && <span>Tf: {m.flange_thickness || m.flangeThickness}</span>}
                        </div>
                      </div>
                    )
                  },
                  {
                    key: 'requiredQty',
                    label: 'Required',
                    className: 'text-center',
                    render: (val) => <span className=" text-slate-900 dark:text-white">{val}</span>
                  },
                  {
                    key: 'uom',
                    label: 'Unit',
                    className: 'text-center',
                    render: (val) => <span className="text-xs text-slate-400  ">{val || 'KG'}</span>
                  }
                ]}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-2 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="px-5 py-2 text-slate-500 dark:text-slate-400 text-xs  hover:text-slate-900 transition-colors"
          >
            Abort Request
          </button>
          <button 
            onClick={handleProcessRequest}
            disabled={isSubmitting || !materials || materials.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded  hover:bg-black transition-all text-xs border border-slate-800 disabled:bg-slate-400"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Process Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaterialRequestModal;
