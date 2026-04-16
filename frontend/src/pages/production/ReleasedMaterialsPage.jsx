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
          <span className="font-semibold text-slate-700">{val || "General Stock"}</span>
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

      <div className="border-none">
        <div className="">
          <div className="max-w-md">
            <Input
              placeholder="Search by Entry No, Project or Remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={15} />}
              className="mb-0"
            />
          </div>
        </div>
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
                <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                  <Package size={15} />
                </div>
                <div>
                  <h3 className="text-lg  text-slate-900 dark:text-white">
                    Released Items: {selectedEntry.entry_no}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedEntry.project_name || "General Production"}</p>
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
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs  text-slate-400   border-b border-slate-100">
                      <tr>
                        <th className="p-2">Item Details</th>
                        <th className="p-2">Dimensions</th>
                        <th className="p-2 text-center">Released Qty</th>
                        <th className="p-2 text-center">Unit</th>
                        <th className="p-2 text-center">Weight (Kg)</th>
                        <th className="p-2 text-right">ST Numbers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedEntry.items?.map((item, idx) => {
                        const isExpanded = expandedItem === idx;
                        return (
                          <React.Fragment key={idx}>
                            <tr
                              className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`}
                              onClick={() => setExpandedItem(isExpanded ? null : idx)}
                            >
                              <td className="p-2">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded flex items-center justify-center ${isExpanded ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                    <Package size={15} />
                                  </div>
                                  <div>
                                    <p className=" text-slate-900 text-xs  ">{item.item_name}</p>
                                    <p className="text-xs  text-slate-400  ">{item.item_code}</p>
                                  </div>
                                  {item.serials && item.serials.length > 0 && (
                                    <div className="ml-auto pr-2">
                                      {isExpanded ? <ChevronUp size={16} className="text-blue-600" /> : <ChevronDown size={16} className="text-slate-400" />}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-2">
                                <span className="text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {renderDimensions(item)}
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                <span className="p-1  text-emerald-600 text-xs">
                                  {item.quantity}
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                <span className="text-xs  text-slate-500 ">{item.uom}</span>
                              </td>
                              <td className="p-2 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-xs text-slate-900">
                                    {Number(item.total_weight || 0).toFixed(3)} Kg
                                  </span>
                                  <span className="text-[8px] text-slate-400">
                                    Unit: {Number(item.unit_weight || 0).toFixed(3)}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2 text-right">
                                <span className="text-xs  text-blue-600 rounded   ">
                                  {item.serials?.length || 0} Pieces
                                </span>
                              </td>
                            </tr>
                            {isExpanded && item.serials && item.serials.length > 0 && (
                              <tr className="bg-slate-50/50">
                                <td colSpan="6" className="px-2 py-4">
                                  <div className="bg-white border border-slate-100 rounded  overflow-hidden">
                                    <table className="w-full text-left border-collapse bg-white">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                          <th className="p-2 text-[8px]  text-slate-400   w-12 text-center">#</th>
                                          <th className="p-2 text-[8px]  text-slate-400  ">Item Code</th>
                                          <th className="p-2 text-[8px]  text-indigo-400  ">ST Code</th>
                                          <th className="p-2 text-[8px]  text-slate-400">Dimensions</th>
                                          <th className="p-2 text-[8px]  text-slate-400">Weight</th>
                                          <th className="p-2 text-[8px]  text-emerald-400   text-right">QC STATUS</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                        {item.serials.map((stObj, sIdx) => {
                                          const stCode = stObj.serial_number;
                                          const itemCodePerPiece = stCode.replace('ST-', '');
                                          const pieceWeight = stObj.unit_weight || stObj.total_weight || item.unit_weight || 0;
                                          return (
                                            <tr key={sIdx} className="hover:bg-slate-50 transition-colors">
                                              <td className="p-2 text-xs  text-slate-400 text-center">{sIdx + 1}</td>
                                              <td className="p-2 text-xs  text-slate-700  ">{itemCodePerPiece}</td>
                                              <td className="p-2 text-xs  text-indigo-600  ">{stCode}</td>
                                              <td className="p-2 text-xs text-slate-500 italic">
                                                {renderDimensions(stObj)}
                                              </td>
                                              <td className="p-2 text-xs text-slate-500">
                                                {Number(pieceWeight).toFixed(3)} Kg
                                              </td>
                                              <td className="p-2 text-right">
                                                <span className="px-2 py-0.5 rounded text-[8px]   er bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                  {stObj.inspection_status || 'ACCEPTED'}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
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
