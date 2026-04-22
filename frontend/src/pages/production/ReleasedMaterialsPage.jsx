import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Eye,
  Boxes,
  Clock,
  CheckCircle2,
  Package,
  Calendar,
  Layers,
  ArrowLeft,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import axios from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import Badge from "../../components/ui/Badge";
import DataTable from "../../components/ui/DataTable/DataTable";
import Card, { CardContent } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { toast } from "react-toastify";
import { renderDimensions } from "../../utils/dimensionUtils";

const ReleasedMaterialsPage = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);




  useEffect(() => {
    fetchReleasedMaterials();
  }, []);

  const fetchReleasedMaterials = async () => {
    try {
      setLoading(true);
      // Fetching stock entries of type 'Material Issue' which represent released materials
      const response = await axios.get("/inventory/stock-entries?type=Material Issue");
      setMovements(response.data.movements || []);
    } catch (error) {
      console.error("Error fetching released materials:", error);
      toast.error("Failed to load released materials");
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const searchLower = searchTerm.toLowerCase();
      return (
        m.entry_no.toLowerCase().includes(searchLower) ||
        (m.project_name && m.project_name.toLowerCase().includes(searchLower)) ||
        (m.remarks && m.remarks.toLowerCase().includes(searchLower))
      );
    });
  }, [movements, searchTerm]);

  const handleViewDetails = (entry) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  const columns = [
    {
      key: "entry_no",
      label: "ENTRY NO",
      render: (val) => <span className=" text-blue-600">{val}</span>
    },
    {
      key: "project_name",
      label: "PROJECT",
      render: (val) => (
        <div className="flex flex-col">
          <span className=" text-slate-700">{val || "General Stock"}</span>
          <span className="text-xs text-slate-400   ">Project Assignment</span>
        </div>
      )
    },
    {
      key: "entry_date",
      label: "RELEASE DATE",
      render: (val) => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <span>{new Date(val).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      key: "status",
      label: "STATUS",
      render: () => <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 size={12} /> Released</Badge>
    },
    {
      key: "actions",
      label: "ACTIONS",
      render: (_, row) => (
        <button
          className="p-1 hover:bg-blue-50 rounded-md text-blue-600 transition-colors"
          title="View Released Items"
          onClick={() => handleViewDetails(row)}
        >
          <Eye size={15} />
        </button>
      )
    }
  ];

  return (
    <div className="p-6 space-y-4 bg-slate-50/50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl  text-slate-900 flex items-center gap-2">

            Released Materials
          </h2>
          <p className="text-slate-500 text-xs">View materials released from inventory for production use</p>
        </div>
        <Button variant="secondary" icon={Clock} onClick={fetchReleasedMaterials}>Refresh</Button>
      </div>

      

      <div className="border-none  overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredMovements}
          loading={loading}
          emptyMessage="No released materials found."
        />
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedEntry && (
        <div className="fixed inset-0 z-[150] flex  items-center justify-center p-2 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[800px] rounded overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-blue-50/30">
              <div className="flex items-center gap-3">
                
                <div>
                  <h3 className="text-lg  text-slate-900 dark:text-white">
                    Released Items: {selectedEntry.entry_no}
                  </h3>
                  <p className="text-xs text-slate-500 ">{selectedEntry.project_name || "General Production"}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded  transition-colors"
              >
                <ArrowLeft size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                  <p className="text-xs  text-slate-400   mb-1">Release Date</p>
                  <p className=" text-slate-700 text-xs">{new Date(selectedEntry.entry_date).toLocaleDateString()}</p>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                  <p className="text-xs  text-slate-400   mb-1">Project</p>
                  <p className=" text-slate-700 text-xs">{selectedEntry.project_name || "N/A"}</p>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                  <p className="text-xs  text-slate-400   mb-1">Remarks</p>
                  <p className=" text-slate-700 text-xs line-clamp-1">{selectedEntry.remarks || "No remarks"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs  text-slate-900   flex items-center gap-2">
                    <Layers size={15} className="text-blue-600" />
                    Material List
                  </h4>
                  <Badge variant="info">{selectedEntry.items?.length || 0} Items Released</Badge>
                </div>

                <div className="border border-slate-100 rounded overflow-hidden ">
                  <DataTable
                    data={selectedEntry.items || []}
                    showSearch={false}
                    renderRowDetail={(item) => {
                      if (!item.serials || item.serials.length === 0) return null;
                      return (
                        <div className="bg-white border border-slate-100 rounded overflow-hidden">
                          <DataTable
                            data={item.serials}
                            showSearch={false}
                            columns={[
                              {
                                key: "serial_number",
                                label: "#",
                                className: "w-12 text-center",
                                render: (_, __, ___, sIdx) => (
                                  <span className="text-[10px] text-slate-400">{sIdx + 1}</span>
                                ),
                              },
                              {
                                key: "serial_number",
                                label: "Item Code",
                                render: (val) => (
                                  <span className="text-[10px] text-slate-700">
                                    {(val || "").replace("ST-", "")}
                                  </span>
                                ),
                              },
                              {
                                key: "serial_number",
                                label: "ST Code",
                                render: (val) => (
                                  <span className="text-[10px] text-indigo-600 font-mono">
                                    {val}
                                  </span>
                                ),
                              },
                              {
                                key: "dimensions",
                                label: "Dimensions",
                                render: (_, stObj) => <span className="text-[10px] text-slate-500 italic">{renderDimensions(stObj)}</span>
                              },
                              {
                                key: "weight",
                                label: "Weight",
                                render: (_, stObj) => (
                                  <span className="text-[10px] text-slate-500">
                                    {Number(stObj.unit_weight || stObj.total_weight || item.unit_weight || 0).toFixed(3)} Kg
                                  </span>
                                )
                              },
                              {
                                key: "inspection_status",
                                label: "QC STATUS",
                                className: "text-right",
                                render: (status) => (
                                  <span className="px-2 py-0.5 rounded text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase">
                                    {status || 'ACCEPTED'}
                                  </span>
                                )
                              }
                            ]}
                          />
                        </div>
                      );
                    }}
                    columns={[
                      {
                        key: "item_name",
                        label: "Item Details",
                        render: (val, item) => (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded flex items-center justify-center bg-blue-50 text-blue-600">
                              <Package size={15} />
                            </div>
                            <div>
                              <p className=" text-slate-900 text-xs font-medium ">{val}</p>
                              <p className="text-[10px] text-slate-400">{item.item_code}</p>
                            </div>
                          </div>
                        )
                      },
                      {
                        key: "dimensions",
                        label: "Dimensions",
                        render: (_, item) => (
                          <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {renderDimensions(item)}
                          </span>
                        )
                      },
                      {
                        key: "quantity",
                        label: "Released Qty",
                        className: "text-center",
                        render: (val) => <span className="text-emerald-600 font-medium text-xs">{val}</span>
                      },
                      {
                        key: "uom",
                        label: "Unit",
                        className: "text-center",
                        render: (val) => <span className="text-xs text-slate-500">{val}</span>
                      },
                      {
                        key: "total_weight",
                        label: "Weight (Kg)",
                        className: "text-center",
                        render: (val, item) => (
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-slate-900">{Number(val || 0).toFixed(3)} Kg</span>
                            <span className="text-[8px] text-slate-400">Unit: {Number(item.unit_weight || 0).toFixed(3)}</span>
                          </div>
                        )
                      },
                      {
                        key: "serials",
                        label: "ST Numbers",
                        className: "text-right",
                        render: (serials) => (
                          <span className="text-xs text-blue-600 font-medium">{serials?.length || 0} Pieces</span>
                        )
                      }
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <Button onClick={() => setShowDetailModal(false)}>Close Details</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReleasedMaterialsPage;
