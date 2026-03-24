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
  ArrowLeft
} from "lucide-react";
import axios from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import Badge from "../../components/ui/Badge";
import DataTable from "../../components/ui/DataTable/DataTable";
import Card, { CardContent } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { toast } from "react-toastify";

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
      render: (val) => <span className="font-bold text-blue-600">{val}</span>
    },
    {
      key: "project_name",
      label: "PROJECT",
      render: (val) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-700">{val || "General Stock"}</span>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Project Assignment</span>
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
      render: () => <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 size={12}/> Released</Badge>
    },
    {
      key: "actions",
      label: "ACTIONS",
      render: (_, row) => (
        <button 
          className="p-1.5 hover:bg-blue-50 rounded-md text-blue-600 transition-colors"
          title="View Released Items"
          onClick={() => handleViewDetails(row)}
        >
          <Eye size={18} />
        </button>
      )
    }
  ];

  return (
    <div className="p-6 space-y-4 bg-slate-50/50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="text-blue-600" size={24} />
            Released Materials
          </h2>
          <p className="text-slate-500 text-xs">View materials released from inventory for production use</p>
        </div>
        <Button variant="secondary" icon={Clock} onClick={fetchReleasedMaterials}>Refresh</Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="max-w-md">
            <Input
              placeholder="Search by Entry No, Project or Remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={18} />}
              className="mb-0"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredMovements}
          loading={loading}
          emptyMessage="No released materials found."
        />
      </Card>

      {/* Detail Modal */}
      {showDetailModal && selectedEntry && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-blue-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Released Items: {selectedEntry.entry_no}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedEntry.project_name || "General Production"}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Release Date</p>
                  <p className="font-bold text-slate-700">{new Date(selectedEntry.entry_date).toLocaleDateString()}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Project</p>
                  <p className="font-bold text-slate-700">{selectedEntry.project_name || "N/A"}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Remarks</p>
                  <p className="font-bold text-slate-700 line-clamp-1">{selectedEntry.remarks || "No remarks"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Layers size={16} className="text-blue-600" />
                    Material List
                  </h4>
                  <Badge variant="info">{selectedEntry.items?.length || 0} Items Released</Badge>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Item Details</th>
                        <th className="px-6 py-4 text-center">Released Qty</th>
                        <th className="px-6 py-4 text-center">Unit</th>
                        <th className="px-6 py-4 text-right">ST Numbers</th>
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
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded flex items-center justify-center ${isExpanded ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                    <Package size={16} />
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{item.item_name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.item_code}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full font-black text-sm">
                                  {item.quantity}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-xs font-bold text-slate-500 uppercase">{item.uom}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 uppercase tracking-widest">
                                  {item.serials?.length || 0} Pieces
                                </span>
                              </td>
                            </tr>
                            {isExpanded && item.serials && item.serials.length > 0 && (
                              <tr className="bg-slate-50/50">
                                <td colSpan="4" className="px-12 py-4">
                                  <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                          <th className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                                          <th className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Item Code</th>
                                          <th className="p-2 text-[8px] font-black text-indigo-400 uppercase tracking-widest">ST Code</th>
                                          <th className="p-2 text-[8px] font-black text-emerald-400 uppercase tracking-widest text-right">QC STATUS</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                        {item.serials.map((stObj, sIdx) => {
                                          const stCode = stObj.serial_number;
                                          const itemCodePerPiece = stCode.replace('ST-', '');
                                          return (
                                            <tr key={sIdx} className="hover:bg-slate-50 transition-colors">
                                              <td className="p-2 text-[10px] font-bold text-slate-400 text-center">{sIdx + 1}</td>
                                              <td className="p-2 text-[10px] font-bold text-slate-700 uppercase tracking-tight">{itemCodePerPiece}</td>
                                              <td className="p-2 text-[10px] font-black text-indigo-600 uppercase tracking-tight">{stCode}</td>
                                              <td className="p-2 text-right">
                                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-600 border border-emerald-100">
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
