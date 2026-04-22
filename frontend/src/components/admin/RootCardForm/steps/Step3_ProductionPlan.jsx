import React, { useCallback, useEffect, useState } from "react";
import { Zap, AlertCircle, Hammer, TrendingUp, PackageCheck, FileText, Loader2, Send, Edit2, Trash2 } from "lucide-react";
import axios from "../../../../utils/api";
import Badge from "../../../ui/Badge";
import DataTable from "../../../ui/DataTable/DataTable";
import Button from "../../../ui/Button";
import { useRootCardContext } from "../hooks";

export default function Step3_ProductionPlan({ readOnly = false }) {
  const { state, initialData } = useRootCardContext();
  const rootCardId = initialData?.id || state.createdOrderId;
  
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedBOM, setSelectedBOM] = useState(null);

  const fetchBOMDetails = async (bomId) => {
    try {
      setLoading(true);
      const detailsRes = await axios.get(`/engineering/bom/comprehensive/${bomId}`);
      setSelectedBOM(detailsRes.data.bom || detailsRes.data);
    } catch (err) {
      console.error("Failed to fetch BOM details:", err);
      setError("Failed to load BOM details");
    } finally {
      setLoading(false);
    }
  };

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

      if (activeBoms.length > 0) {
        await fetchBOMDetails(activeBoms[0].id);
      }
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

  const materialColumns = [
    { key: "itemName", label: "Item Name", className: "" },
    { key: "itemGroup", label: "Group", render: (val) => <Badge variant="gray">{val || "NO-GROUP"}</Badge> },
    { key: "partDetail", label: "Part Detail / Grade", render: (val, row) => (
      <div className="flex flex-col">
        <span className="text-xs">{val || "-"}</span>
        <span className="text-xs text-slate-500 ">{row.materialGrade || "-"}</span>
      </div>
    )},
    { key: "warehouse", label: "WH / Operation", render: (val, row) => (
      <div className="flex flex-col">
        <span className="text-xs text-blue-600 ">{val || "-"}</span>
        <span className="text-xs text-amber-600  italic">{row.operation || "-"}</span>
      </div>
    )},
    { key: "quantity", label: "QTY", render: (val, row) => `${val} ${row.uom}` },
  ];

  const operationColumns = [
    { key: "operationName", label: "Operation", className: "" },
    { key: "type", label: "Execution", render: (val) => (
      <Badge variant={val === 'outsource' ? 'warning' : 'info'} className="capitalize">
        {val || 'in-house'}
      </Badge>
    )},
    { key: "vendorName", label: "Vendor (Outsource)", render: (val, row) => (
      <div className="flex flex-col">
        <span className="text-xs  text-slate-700">{row.type === 'outsource' ? (val || '-') : '-'}</span>
        {row.type === 'outsource' && row.subcontractWarehouse && (
          <span className="text-xs text-slate-500 italic">Wh: {row.subcontractWarehouse}</span>
        )}
      </div>
    )},
    { key: "cycleTime", label: "Time (Min)", render: (val, row) => (
      <div className="flex flex-col text-xs">
        <span>Cycle: {val}m</span>
        <span>Setup: {row.setupTime}m</span>
      </div>
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
          <div className="p-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xs  text-slate-500">Active BOM</h3>
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
          </div>

          {selectedBOM && (
            <div className="p-2 space-y-2">
              <section>
                <h3 className=" text-slate-900 flex items-center gap-2 text-sm  tracking-wide mb-4">
                  <PackageCheck size={15} className="text-purple-600" />
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
                  <FileText size={15} className="text-blue-600" />
                  Operations & Manufacturing
                </h3>
                <DataTable
                  columns={operationColumns}
                  data={selectedBOM.operations || []}
                  className="border rounded overflow-hidden"
                />
              </section>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-50 rounded border-2 border-dashed border-slate-200">
          <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg  text-slate-900">No Active BOM</h3>
          <p className="text-slate-500 mt-1">There is currently no active Bill of Materials for this project.</p>
        </div>
      )}
    </div>
  );
}
