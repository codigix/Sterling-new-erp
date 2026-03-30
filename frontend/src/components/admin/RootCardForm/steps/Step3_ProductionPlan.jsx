import React, { useCallback, useEffect, useState, useMemo } from "react";
import { Zap, AlertCircle, Hammer, TrendingUp, PackageCheck, FileText, Loader2, Eye, Send, Edit2, Trash2 } from "lucide-react";
import axios from "../../../../utils/api";
import Badge from "../../../ui/Badge";
import Card, { CardContent, CardHeader } from "../../../ui/Card";
import DataTable from "../../../ui/DataTable/DataTable";
import Modal, { ModalBody, ModalHeader } from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { useRootCardContext } from "../hooks";

export default function Step3_ProductionPlan({ readOnly = false }) {
  const { state, initialData } = useRootCardContext();
  const rootCardId = initialData?.id || state.createdOrderId;
  
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState(null);

  const fetchData = useCallback(async () => {
    if (!rootCardId) return;
    
    try {
      setLoading(true);
      setError("");
      
      // 1. Fetch all BOMs
      const response = await axios.get("/engineering/bom/comprehensive");
      const allBoms = response.data.boms || [];
      
      // 2. Filter for this root card and only show active BOM
      const activeBoms = allBoms.filter(b => String(b.rootCardId) === String(rootCardId) && b.isActive);
      setBoms(activeBoms);
    } catch (err) {
      console.error("Failed to fetch BOMs:", err);
      setError("Failed to load BOM list");
    } finally {
      setLoading(false);
    }
  }, [rootCardId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetails = async (bomId) => {
    try {
      setLoading(true);
      const detailsRes = await axios.get(`/engineering/bom/comprehensive/${bomId}`);
      setSelectedBOM(detailsRes.data.bom || detailsRes.data);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch BOM details:", err);
      setError("Failed to load BOM details");
    } finally {
      setLoading(false);
    }
  };

  const materialColumns = [
    { key: "itemName", label: "Item Name", className: "font-medium" },
    { key: "itemGroup", label: "Group", render: (val) => <Badge variant="gray">{val || "NO-GROUP"}</Badge> },
    { key: "partDetail", label: "Part Detail / Grade", render: (val, row) => (
      <div className="flex flex-col">
        <span className="text-xs">{val || "-"}</span>
        <span className="text-[10px] text-slate-500 ">{row.materialGrade || "-"}</span>
      </div>
    )},
    { key: "warehouse", label: "WH / Operation", render: (val, row) => (
      <div className="flex flex-col">
        <span className="text-xs text-blue-600 ">{val || "-"}</span>
        <span className="text-[10px] text-amber-600 font-medium italic">{row.operation || "-"}</span>
      </div>
    )},
    { key: "quantity", label: "QTY", render: (val, row) => `${val} ${row.uom}` },
  ];

  const operationColumns = [
    { key: "operationName", label: "Operation", className: "font-medium" },
    { key: "type", label: "Execution", render: (val) => (
      <Badge variant={val === 'outsource' ? 'warning' : 'info'} className="capitalize">
        {val || 'in-house'}
      </Badge>
    )},
    { key: "workstation", label: "Workstation / Vendor", render: (val, row) => (
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-700">{row.type === 'outsource' ? (row.vendorName || '-') : (val || '-')}</span>
        {row.type === 'outsource' && row.subcontractWarehouse && (
          <span className="text-[10px] text-slate-500 italic">Wh: {row.subcontractWarehouse}</span>
        )}
      </div>
    )},
    { key: "cycleTime", label: "Time (Min)", render: (val, row) => (
      <div className="flex flex-col text-[10px]">
        <span>Cycle: {val}m</span>
        <span>Setup: {row.setupTime}m</span>
      </div>
    )},
    { key: "cost", label: "Total Cost", render: (val) => (
      <span className=" text-slate-900">₹{parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
    )},
  ];

  if (loading && boms.length === 0) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-3 text-slate-500">Loading BOM List...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded flex items-center gap-3 text-red-700">
        <AlertCircle size={20} />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {boms.length > 0 ? (
        <div className="">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-medium text-slate-500  tracking-wider">Active BOM</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xl  text-slate-900">{boms[0].bomNumber.split('-V')[0]}</span>
                <Badge variant="secondary" className="font-mono">
                  {boms[0].bomNumber.includes('-V') ? `V${boms[0].bomNumber.split('-V')[1]}` : 'V1'}
                </Badge>
                <Badge variant="success" className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded  bg-emerald-500" />
                  Active
                </Badge>
              </div>
            </div>
            <Button 
              variant="primary" 
              onClick={() => handleViewDetails(boms[0].id)}
              className="flex items-center gap-2"
            >
              <Eye size={18} />
              View BOM Details
            </Button>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4 p-4 rounded bg-amber-50/50 border border-amber-100">
              <div className="p-3 rounded bg-amber-100 text-amber-600">
                <Hammer size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 ">Operation Cost</p>
                <p className="text-2xl  text-slate-900">₹{parseFloat(boms[0].operationCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded bg-purple-50/50 border border-purple-100">
              <div className="p-3 rounded bg-purple-100 text-purple-600">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 ">Total BOM Cost</p>
                <p className="text-2xl  text-slate-900">₹{parseFloat(boms[0].totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-50 rounded border-2 border-dashed border-slate-200">
          <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No Active BOM</h3>
          <p className="text-slate-500 mt-1">There is currently no active Bill of Materials for this project.</p>
        </div>
      )}

      {/* BOM Details Modal */}
      {selectedBOM && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={`BOM Details - ${selectedBOM.bomNumber}`}
          size="xl"
        >
          <ModalBody className="p-0">
            <div className="p-6 bg-slate-50 border-b border-slate-200">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-white p-4 rounded border border-slate-200">
                    <div className={`p-2 rounded bg-amber-50 text-amber-600`}>
                      <Hammer size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-slate-500 ">Operation Cost</p>
                      <p className="text-lg  text-slate-900">₹{selectedBOM.costs?.operationCost?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-4 rounded border border-slate-200">
                    <div className={`p-2 rounded bg-purple-50 text-purple-600`}>
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-slate-500 ">Total BOM Cost</p>
                      <p className="text-lg  text-slate-900">₹{selectedBOM.costs?.totalBOMCost?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
                    </div>
                  </div>
                </div>
            </div>

            <div className="p-6 space-y-8">
              <section>
                <h3 className=" text-slate-900 flex items-center gap-2 text-sm  tracking-wide mb-4">
                  <PackageCheck size={18} className="text-purple-600" />
                  Materials Breakdown
                </h3>
                <DataTable
                  columns={materialColumns}
                  data={selectedBOM.materials || []}
                  className="border rounded overflow-hidden"
                />
              </section>

              <section>
                <h3 className=" text-slate-900 flex items-center gap-2 text-sm  tracking-wide mb-4">
                  <FileText size={18} className="text-blue-600" />
                  Operations & Manufacturing
                </h3>
                <DataTable
                  columns={operationColumns}
                  data={selectedBOM.operations || []}
                  className="border rounded overflow-hidden"
                />
              </section>
            </div>
          </ModalBody>
        </Modal>
      )}
    </div>
  );
}
