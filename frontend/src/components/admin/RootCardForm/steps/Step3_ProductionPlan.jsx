import React, { useCallback, useEffect, useState } from "react";
import { Zap, AlertCircle, Hammer, TrendingUp, PackageCheck, FileText, Loader2, Send, Edit2, Trash2, Calendar, X } from "lucide-react";
import axios from "../../../../utils/api";
import Badge from "../../../ui/Badge";
import DataTable from "../../../ui/DataTable/DataTable";
import Button from "../../../ui/Button";
import { useRootCardContext } from "../hooks";
import FormSection from "../shared/FormSection";

export default function Step3_ProductionPlan({ readOnly = false }) {
  const { state, initialData } = useRootCardContext();
  const rootCardId = initialData?.id || state.createdOrderId;
  
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedBOM, setSelectedBOM] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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
      
      // 1. Fetch all BOMs and operator assignments in parallel
      const [bomResponse, assignmentsRes] = await Promise.all([
        axios.get("/engineering/bom/comprehensive"),
        axios.get(`/production/labor/project/${rootCardId}/logs`).catch(err => {
          console.error("Failed to fetch operator assignments:", err);
          return { data: { logs: [] } };
        })
      ]);

      const allBoms = bomResponse.data.boms || [];
      
      // 2. Filter for this root card and only show active BOM
      const activeBoms = allBoms.filter(b => String(b.rootCardId) === String(rootCardId) && b.isActive);
      setBoms(activeBoms);

      if (activeBoms.length > 0) {
        await fetchBOMDetails(activeBoms[0].id);
      }

      setAssignments(assignmentsRes.data?.logs || []);
    } catch (err) {
      console.error("Failed to fetch BOMs:", err);
      setError("Failed to load production plan details");
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

  const assignmentColumns = [
    { key: "operator_name", label: "Operator Name" },
    { key: "operation_name", label: "Assigned Operation", render: (val) => (
      <Badge variant="info" className="capitalize">
        {val || "NO-OPERATION"}
      </Badge>
    )},
    { key: "work_date", label: "Work Date", render: (val) => val ? new Date(val).toLocaleDateString("en-IN") : "-" },
    { key: "actual_hours", label: "Total Hours", render: (val) => val ? `${val} hrs` : "-" },
    { key: "remarks", label: "Remarks / Notes", render: (val) => val || "-" }
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
            <div className="p-2 space-y-4">
              <FormSection
                title="Production Plan & BOM Details"
                subtitle="View materials breakdown and assigned operators for the active BOM"
                icon={Hammer}
              >
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm text-slate-900 flex items-center gap-2 border-b pb-2">
                      <PackageCheck size={15} className="text-purple-600" />
                      Materials Breakdown
                    </h3>
                    <DataTable
                      columns={materialColumns}
                      data={selectedBOM.materials || []}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm text-slate-900 flex items-center gap-2 border-b pb-2">
                      <Hammer size={15} className="text-blue-600" />
                      Assigned Operators in Production
                    </h3>
                    <DataTable
                      columns={assignmentColumns}
                      data={assignments || []}
                      dateRangeFilter={{
                        column: 'work_date',
                        startDate: dateFrom,
                        endDate: dateTo,
                      }}
                      titleExtra={
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1">
                            <Calendar size={13} className="text-slate-400" />
                            <input
                              type="date"
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                              className="text-xs bg-transparent border-none outline-none text-slate-600 dark:text-slate-300 cursor-pointer"
                            />
                          </div>
                          <span className="text-slate-400 text-xs">to</span>
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1">
                            <Calendar size={13} className="text-slate-400" />
                            <input
                              type="date"
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                              className="text-xs bg-transparent border-none outline-none text-slate-600 dark:text-slate-300 cursor-pointer"
                            />
                          </div>
                          {(dateFrom || dateTo) && (
                            <button
                              onClick={() => { setDateFrom(""); setDateTo(""); }}
                              className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 transition-colors px-1.5 py-1 rounded hover:bg-rose-50"
                            >
                              <X size={12} />
                              Clear
                            </button>
                          )}
                        </div>
                      }
                    />
                  </div>
                </div>
              </FormSection>
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
