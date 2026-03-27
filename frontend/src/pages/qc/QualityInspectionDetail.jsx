import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../utils/api";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Save,
  CheckCircle,
  XCircle,
  Package,
  Truck,
  FileText,
  Upload,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const QualityInspectionDetail = () => {
  const { id } = useParams(); // GRN ID
  const navigate = useNavigate();
  const [grn, setGrn] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspectionType, setInspectionType] = useState("Inhouse");
  const [expandedItems, setExpandedItems] = useState({});
  const [remarks, setRemarks] = useState("");
  
  // Outsource specific state
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
    fetchVendors();
  }, [id]);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [grnRes, stRes] = await Promise.all([
        axios.get(`/inventory/grns/${id}`),
        axios.get(`/qc/grn/${id}/st-numbers`)
      ]);
      
      setGrn(grnRes.data.grn);
      setItems(stRes.data.map(item => ({
        ...item,
        acceptedDoc: item.acceptedDoc || null,
        rejectedDoc: item.rejectedDoc || null,
        serials: item.serials.map(s => ({
          ...s,
          item_code: s.item_code,
          tempStatus: s.inspection_status === 'Pending' ? '' : s.inspection_status,
          notes: '',
          doc: null
        }))
      })));
      
      if (grnRes.data.grn.inspection_type) {
        setInspectionType(grnRes.data.grn.inspection_type);
      }
      
      // Expand all by default
      const initialExpanded = {};
      stRes.data.forEach(item => {
        initialExpanded[item.itemName] = true;
      });
      setExpandedItems(initialExpanded);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load GRN details");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await axios.get("/vendors");
      setVendors(response.data.vendors || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  const toggleExpand = (itemName) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  const handleInspectionTypeChange = async (type) => {
    try {
      await axios.post(`/qc/grn/${id}/inspection-type`, { inspection_type: type });
      setInspectionType(type);
      toast.success(`Inspection type changed to ${type}`);
    } catch (error) {
      toast.error("Failed to update inspection type");
    }
  };

  const updateSerialStatus = (itemName, serialNumber, status) => {
    setItems(prev => prev.map(item => {
      if (item.itemName === itemName) {
        return {
          ...item,
          serials: item.serials.map(s => {
            if (s.serial_number === serialNumber) {
              return { ...s, tempStatus: status };
            }
            return s;
          })
        };
      }
      return item;
    }));
  };

  const bulkAction = (itemName, status) => {
    setItems(prev => prev.map(item => {
      if (item.itemName === itemName) {
        return {
          ...item,
          serials: item.serials.map(s => {
            if (s.inspection_status === 'Pending' || s.inspection_status === 'Sent for Inspection') {
               return { ...s, tempStatus: status };
            }
            return s;
          })
        };
      }
      return item;
    }));
  };

  const handleSubmitInhouse = async () => {
    try {
      const results = [];
      
      items.forEach(item => {
        item.serials.forEach(s => {
          if (s.tempStatus && (s.inspection_status === 'Pending' || s.inspection_status === 'Sent for Inspection')) {
            results.push({
              serial_number: s.serial_number,
              status: s.tempStatus,
              notes: s.notes || ''
            });
          }
        });
      });

      if (results.length === 0) {
        toast.warning("No new inspection results to submit.");
        return;
      }

      await axios.post("/qc/inspection/submit", {
        grn_id: id,
        inspection_type: "Inhouse",
        results,
        remarks
      });

      toast.success("Inhouse inspection submitted successfully");
      fetchData(true);
    } catch (error) {
      console.error("Error submitting inspection:", error);
      toast.error("Failed to submit inspection");
    }
  };

  const handleCreateChallan = async () => {
    if (!selectedVendor) {
      toast.error("Please select a vendor");
      return;
    }

    const selectedSerials = [];
    items.forEach(item => {
      item.serials.forEach(s => {
        if (s.tempStatus === 'Sent for Inspection' && s.inspection_status === 'Pending') {
          selectedSerials.push(s.serial_number);
        }
      });
    });

    if (selectedSerials.length === 0) {
      toast.error("Please select ST numbers for inspection");
      return;
    }

    try {
      await axios.post("/qc/outsource/challan", {
        grn_id: id,
        vendor_id: selectedVendor,
        challan_date: challanDate,
        serial_numbers: selectedSerials
      });
      toast.success("Inspection Challan created");
      fetchData(true);
    } catch (error) {
      toast.error("Failed to create challan");
    }
  };

  const handleSubmitOutsource = async (targetItem) => {
    const results = [];
    let hasAccepted = false;
    let hasRejected = false;

    targetItem.serials.forEach(s => {
      if (s.tempStatus === 'Accepted' || s.tempStatus === 'Rejected') {
         if (s.tempStatus === 'Accepted') hasAccepted = true;
         if (s.tempStatus === 'Rejected') hasRejected = true;
         results.push({
           serial_number: s.serial_number,
           status: s.tempStatus,
           notes: s.notes
         });
      }
    });

    if (results.length === 0) {
      toast.warning("No results to submit for this item");
      return;
    }

    if (hasAccepted && !targetItem.acceptedDoc) {
       toast.error("Accepted Items Report is required");
       return;
    }

    if (hasRejected && !targetItem.rejectedDoc) {
       toast.error("Rejected Items Report is required");
       return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('grn_id', id);
      formData.append('po_item_id', targetItem.po_item_id);
      formData.append('remarks', remarks || "Outsource inspection results");
      
      if (targetItem.acceptedDoc instanceof File) {
        formData.append('accepted_doc', targetItem.acceptedDoc);
      }
      if (targetItem.rejectedDoc instanceof File) {
        formData.append('rejected_doc', targetItem.rejectedDoc);
      }

      formData.append('results', JSON.stringify(results));

      await axios.post("/qc/outsource/submit-results", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(`Inspection completed for ${targetItem.itemName}`);
      fetchData(true);
    } catch (error) {
      console.error("Error submitting outsource results:", error);
      toast.error("Failed to submit outsource results");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeQC = async () => {
    try {
      setLoading(true);
      await axios.post(`/qc/grn/${id}/finalize`);
      toast.success("QC Finalized successfully");
      navigate("/department/quality/incoming");
    } catch (error) {
      console.error("Error finalizing QC:", error);
      toast.error(error.response?.data?.message || "Failed to finalize QC");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const hasAnyAccepted = items.some(item => item.serials.some(s => s.tempStatus === 'Accepted'));

  return (
    <div className="p-6 space-y-2 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/department/quality/material-inspection")}
            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors"
            title="Back to Material Inspection"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Quality Inspection: {grn?.grn_number}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {grn?.vendor} | {grn?.project_name || "No Project"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
          <button
            onClick={() => handleInspectionTypeChange("Inhouse")}
            className={`p-2 rounded-md text-sm font-black uppercase tracking-widest transition-all ${
              inspectionType === "Inhouse"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            Inhouse
          </button>
          <button
            onClick={() => handleInspectionTypeChange("Outsource")}
            className={`p-2 rounded-md text-sm font-black uppercase tracking-widest transition-all ${
              inspectionType === "Outsource"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            Outsource
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.itemName}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm"
            >
              <div
                className="p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 cursor-pointer"
                onClick={() => toggleExpand(item.itemName)}
              >
                <div className="flex items-center gap-3">
                  {expandedItems[item.itemName] ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <Package size={20} />
                  </div>
                  <div>
                    <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {item.itemName}
                    </span>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {item.serials.length} Units Tracked
                    </div>
                  </div>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                   <button 
                    onClick={() => bulkAction(item.itemName, 'Accepted')}
                    className="px-3 py-1 bg-green-50 text-green-600 rounded text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all border border-green-100"
                   >
                     Accept All
                   </button>
                   <button 
                    onClick={() => bulkAction(item.itemName, 'Rejected')}
                    className="px-3 py-1 bg-red-50 text-red-600 rounded text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border border-red-100"
                   >
                     Reject All
                   </button>
                   {inspectionType === 'Outsource' && (
                     <button 
                      onClick={() => bulkAction(item.itemName, 'Sent for Inspection')}
                      className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                     >
                       Outsource All
                     </button>
                   )}
                </div>
              </div>

              {expandedItems[item.itemName] && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/30 border-b border-slate-100 dark:border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <th className="px-6 py-3 text-left">ST Number</th>
                        <th className="px-6 py-3 text-left">Current Status</th>
                        <th className="px-6 py-3 text-center">Action</th>
                        {inspectionType === 'Outsource' && <th className="px-6 py-3 text-center">Doc</th>}
                        <th className="px-6 py-3 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {item.serials.map((s) => (
                        <tr key={s.serial_number} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-2 font-bold text-slate-700 dark:text-white">
                            {s.serial_number}
                          </td>
                          <td className="p-2">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${
                              s.inspection_status === 'Accepted' ? 'bg-green-100 text-green-700' :
                              s.inspection_status === 'Rejected' ? 'bg-red-100 text-red-700' :
                              s.inspection_status === 'Sent for Inspection' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {s.inspection_status}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex justify-center gap-2">
                              {(s.inspection_status === 'Pending' || s.inspection_status === 'Sent for Inspection') && (
                                <>
                                  <button
                                    onClick={() => updateSerialStatus(item.itemName, s.serial_number, 'Accepted')}
                                    className={`p-2 rounded-xl transition-all shadow-sm ${
                                      s.tempStatus === 'Accepted' ? 'bg-green-600 text-white shadow-green-200' : 'bg-slate-50 text-slate-400 hover:text-green-600 hover:bg-green-50'
                                    }`}
                                    title="Accept"
                                  >
                                    <CheckCircle size={18} />
                                  </button>
                                  <button
                                    onClick={() => updateSerialStatus(item.itemName, s.serial_number, 'Rejected')}
                                    className={`p-2 rounded-xl transition-all shadow-sm ${
                                      s.tempStatus === 'Rejected' ? 'bg-red-600 text-white shadow-red-200' : 'bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50'
                                    }`}
                                    title="Reject"
                                  >
                                    <XCircle size={18} />
                                  </button>
                                  {inspectionType === 'Outsource' && s.inspection_status === 'Pending' && (
                                    <button
                                      onClick={() => updateSerialStatus(item.itemName, s.serial_number, 'Sent for Inspection')}
                                      className={`p-2 rounded-xl transition-all shadow-sm ${
                                        s.tempStatus === 'Sent for Inspection' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                      }`}
                                      title="Mark for Outsource"
                                    >
                                      <Truck size={18} />
                                    </button>
                                  )}
                                </>
                              )}
                              {s.inspection_status !== 'Pending' && s.inspection_status !== 'Sent for Inspection' && (
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Processed</span>
                              )}
                            </div>
                          </td>
                          {inspectionType === 'Outsource' && (
                            <td className="p-2 text-center">
                              {s.tempStatus === 'Rejected' ? (
                                <div className="flex flex-col items-center gap-1">
                                  <label className={`cursor-pointer p-2 rounded-xl transition-all ${s.doc ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}>
                                    <Upload size={16} />
                                    <input type="file" className="hidden" onChange={(e) => {
                                      const file = e.target.files[0];
                                      setItems(prev => prev.map(it => {
                                        if (it.itemName === item.itemName) {
                                          return {
                                            ...it,
                                            serials: it.serials.map(ser => {
                                              if (ser.serial_number === s.serial_number) {
                                                return { ...ser, doc: file };
                                              }
                                              return ser;
                                            })
                                          };
                                        }
                                        return it;
                                      }));
                                    }} />
                                  </label>
                                  {s.doc && <span className="text-[8px] font-bold text-green-600 truncate max-w-[60px]" title={s.doc.name}>{s.doc.name}</span>}
                                </div>
                              ) : (
                                <span className="text-slate-200">-</span>
                              )}
                            </td>
                          )}
                          <td className="p-2">
                            <input 
                              type="text"
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              placeholder="Add notes..."
                              value={s.notes}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItems(prev => prev.map(it => {
                                  if (it.itemName === item.itemName) {
                                    return {
                                      ...it,
                                      serials: it.serials.map(ser => {
                                        if (ser.serial_number === s.serial_number) {
                                          return { ...ser, notes: val };
                                        }
                                        return ser;
                                      })
                                    };
                                  }
                                  return it;
                                }));
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  {inspectionType === 'Outsource' ? (
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Accepted Report */}
                      <div className={`flex items-center h-10 px-4 rounded-xl border transition-all ${item.acceptedDoc ? 'bg-green-50 border-green-200' : 'bg-white dark:bg-slate-800 border-blue-200 border-dashed hover:border-blue-400'}`}>
                        {item.acceptedDoc && !(item.acceptedDoc instanceof File) ? (
                          <button 
                            onClick={() => window.open(`${new URL(axios.defaults.baseURL).origin}/uploads/${item.acceptedDoc}`, '_blank')}
                            className="flex items-center gap-2 text-[10px] font-black text-green-700 uppercase"
                          >
                            <CheckCircle size={14} /> Accepted Report
                            <Eye size={14} className="ml-1 opacity-60" />
                          </button>
                        ) : (
                          <label className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase cursor-pointer">
                            <Upload size={14} /> {item.acceptedDoc instanceof File ? item.acceptedDoc.name : "Upload Accepted Report"}
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files[0];
                                setItems(prev => prev.map(it => it.itemName === item.itemName ? { ...it, acceptedDoc: file } : it));
                              }} 
                            />
                          </label>
                        )}
                      </div>

                      {/* Rejected Report */}
                      <div className={`flex items-center h-10 px-4 rounded-xl border transition-all ${item.rejectedDoc ? 'bg-red-50 border-red-200' : 'bg-white dark:bg-slate-800 border-red-200 border-dashed hover:border-red-400'}`}>
                        {item.rejectedDoc && !(item.rejectedDoc instanceof File) ? (
                          <button 
                            onClick={() => window.open(`${new URL(axios.defaults.baseURL).origin}/uploads/${item.rejectedDoc}`, '_blank')}
                            className="flex items-center gap-2 text-[10px] font-black text-red-700 uppercase"
                          >
                            <XCircle size={14} /> Rejected Report
                            <Eye size={14} className="ml-1 opacity-60" />
                          </button>
                        ) : (
                          <label className="flex items-center gap-2 text-[10px] font-black text-red-600 uppercase cursor-pointer">
                            <Upload size={14} /> {item.rejectedDoc instanceof File ? item.rejectedDoc.name : "Upload Rejected Report"}
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files[0];
                                setItems(prev => prev.map(it => it.itemName === item.itemName ? { ...it, rejectedDoc: file } : it));
                              }} 
                            />
                          </label>
                        )}
                      </div>

                      <button 
                        onClick={() => handleSubmitOutsource(item)}
                        className="p-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center gap-2 ml-auto"
                      >
                        <Save size={14} /> Complete Item Inspection
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                      Inhouse inspection - Process each ST number above
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        </div>

        <div className="space-y-2">
          {inspectionType === 'Outsource' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                <Truck size={16} className="text-blue-600" /> Outsource Actions
              </h3>
              
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Select Vendor</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                  >
                    <option value="">Choose Vendor...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Challan Date</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-700"
                    value={challanDate}
                    onChange={(e) => setChallanDate(e.target.value)}
                  />
                </div>

                <button 
                  onClick={handleCreateChallan}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={16} /> Create Challan
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <CheckCircle size={16} className="text-blue-600" /> Finalize Inspection
            </h3>
            
            <textarea 
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[100px]"
              placeholder="Enter overall inspection remarks..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />

            {inspectionType === 'Inhouse' && (
              <button 
                onClick={handleSubmitInhouse}
                className="w-full py-4 bg-green-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> 
                Submit Inhouse Results
              </button>
            )}

            {(() => {
              const allProcessed = items.every(item => item.serials.every(s => s.inspection_status === 'Accepted' || s.inspection_status === 'Rejected'));
              const isOutsource = inspectionType === 'Outsource';
              const needsAcceptedDoc = items.some(item => item.serials.some(s => s.inspection_status === 'Accepted') && !item.acceptedDoc);
              const needsRejectedDoc = items.some(item => item.serials.some(s => s.inspection_status === 'Rejected') && !item.rejectedDoc);
              
              const canFinalize = allProcessed && (!isOutsource || (!needsAcceptedDoc && !needsRejectedDoc));
              
              if (grn?.status === 'qc_completed') return null;

              return (
                <button 
                  onClick={handleFinalizeQC}
                  disabled={!canFinalize}
                  className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${
                    canFinalize ? 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle size={18} /> 
                  Finalize Overall QC
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityInspectionDetail;
