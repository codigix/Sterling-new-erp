import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../utils/api";
import { getServerUrl } from "../../utils/fileUtils";
import { toast } from "react-toastify";
import { renderDimensions } from "../../utils/dimensionUtils";
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
      setItems(stRes.data.map(item => {
        const baseDimensions = {
          length: item.length || item.length_mm || 0,
          width: item.width || item.width_mm || 0,
          thickness: item.thickness || item.thickness_mm || 0,
          diameter: item.diameter || item.diameter_mm || 0,
          outer_diameter: item.outer_diameter || item.outerDiameter || 0,
          height: item.height || item.height_mm || 0,
          side_s: item.side_s || item.sideS || 0,
          side1: item.side1 || item.sideS1 || 0,
          side2: item.side2 || item.sideS2 || 0,
          web_thickness: item.web_thickness || item.tw || 0,
          flange_thickness: item.flange_thickness || item.tf || 0,
          item_group: item.itemGroup || item.item_group || ""
        };

        return {
          ...item,
          acceptedDoc: item.acceptedDoc || null,
          rejectedDoc: item.rejectedDoc || null,
          serials: item.serials.map(s => {
            const serialDimensions = {
              ...(s.dimensions || {}),
              item_group: s.item_group || s.itemGroup || baseDimensions.item_group
            };
            const hasSerialDims = Object.values(serialDimensions).some(v => v !== null && v !== 0 && v !== '' && typeof v === 'number');
            
            return {
              ...s,
              item_code: s.item_code,
              tempStatus: s.inspection_status === 'Pending' ? '' : s.inspection_status,
              notes: '',
              doc: null,
              dimensions: hasSerialDims ? serialDimensions : baseDimensions
            };
          })
        };
      }));
      
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
    <div className="p-4 space-y-2 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/department/quality/material-inspection")}
            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded  transition-colors"
            title="Back to Material Inspection"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-xl  text-slate-900 dark:text-white">
              Quality Inspection: {grn?.grn_number}
            </h1>
            <p className="text-slate-500 text-xs dark:text-slate-400">
              {grn?.vendor} | {grn?.project_name || "No Project"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700 ">
          <button
            onClick={() => handleInspectionTypeChange("Inhouse")}
            className={`p-2 rounded text-xs    transition-all ${
              inspectionType === "Inhouse"
                ? "bg-blue-600 text-white "
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            Inhouse
          </button>
          <button
            onClick={() => handleInspectionTypeChange("Outsource")}
            className={`p-2 rounded text-xs    transition-all ${
              inspectionType === "Outsource"
                ? "bg-blue-600 text-white "
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            Outsource
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.itemName}
              className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 overflow-hidden "
            >
              <div
                className="p-2 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 cursor-pointer"
                onClick={() => toggleExpand(item.itemName)}
              >
                <div className="flex items-center gap-3">
                  {expandedItems[item.itemName] ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                  <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <Package size={15} />
                  </div>
                  <div>
                    <span className=" text-slate-900 dark:text-white  ">
                      {item.itemName}
                    </span>
                    <div className="text-xs  text-slate-400   mt-0.5">
                      {item.serials.length} Units Tracked
                    </div>
                  </div>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                   <button 
                    onClick={() => bulkAction(item.itemName, 'Accepted')}
                    className="p-2 bg-green-50 text-green-600 rounded text-xs    hover:bg-green-600 hover:text-white transition-all border border-green-100"
                   >
                     Accept All
                   </button>
                   <button 
                    onClick={() => bulkAction(item.itemName, 'Rejected')}
                    className="p-2 bg-red-50 text-red-600 rounded text-xs    hover:bg-red-600 hover:text-white transition-all border border-red-100"
                   >
                     Reject All
                   </button>
                   {inspectionType === 'Outsource' && (
                     <button 
                      onClick={() => bulkAction(item.itemName, 'Sent for Inspection')}
                      className="p-2 bg-blue-50 text-blue-600 rounded text-xs    hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
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
                      <tr className="bg-slate-50/30 border-b border-slate-100 dark:border-slate-700 text-slate-400 text-xs   ">
                        <th className="p-2 text-left">ST Number</th>
                        <th className="p-2 text-left">Dimensions</th>
                        <th className="p-2 text-left">Current Status</th>
                        <th className="p-2 text-center">Action</th>
                        {inspectionType === 'Outsource' && <th className="p-2 text-center">Doc</th>}
                        <th className="p-2 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {item.serials.map((s) => (
                        <tr key={s.serial_number} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-2  text-slate-700 dark:text-white">
                            {s.serial_number}
                          </td>
                          <td className="p-2">
                            <div className="text-xs text-slate-500 font-mono">
                              {renderDimensions(s.dimensions)}
                            </div>
                          </td>
                          <td className="p-2">
                            <span className={`text-xs p-1 rounded     ${
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
                                    className={`p-2 rounded transition-all  ${
                                      s.tempStatus === 'Accepted' ? 'bg-green-600 text-white shadow-green-200' : 'bg-slate-50 text-slate-400 hover:text-green-600 hover:bg-green-50'
                                    }`}
                                    title="Accept"
                                  >
                                    <CheckCircle size={15} />
                                  </button>
                                  <button
                                    onClick={() => updateSerialStatus(item.itemName, s.serial_number, 'Rejected')}
                                    className={`p-2 rounded transition-all  ${
                                      s.tempStatus === 'Rejected' ? 'bg-red-600 text-white shadow-red-200' : 'bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50'
                                    }`}
                                    title="Reject"
                                  >
                                    <XCircle size={15} />
                                  </button>
                                  {inspectionType === 'Outsource' && s.inspection_status === 'Pending' && (
                                    <button
                                      onClick={() => updateSerialStatus(item.itemName, s.serial_number, 'Sent for Inspection')}
                                      className={`p-2 rounded transition-all  ${
                                        s.tempStatus === 'Sent for Inspection' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                      }`}
                                      title="Mark for Outsource"
                                    >
                                      <Truck size={15} />
                                    </button>
                                  )}
                                </>
                              )}
                              {s.inspection_status !== 'Pending' && s.inspection_status !== 'Sent for Inspection' && (
                                <span className="text-xs  text-slate-300   italic">Processed</span>
                              )}
                            </div>
                          </td>
                          {inspectionType === 'Outsource' && (
                            <td className="p-2 text-center">
                              {s.tempStatus === 'Rejected' ? (
                                <div className="flex flex-col items-center gap-1">
                                  <label className={`cursor-pointer p-2 rounded transition-all ${s.doc ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}>
                                    <Upload size={15} />
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
                                  {s.doc && <span className="text-[8px]  text-green-600 truncate max-w-[60px]" title={s.doc.name}>{s.doc.name}</span>}
                                </div>
                              ) : (
                                <span className="text-slate-200">-</span>
                              )}
                            </td>
                          )}
                          <td className="p-2">
                            <input 
                              type="text"
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-xs  text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                
                <div className="p-2 bg-slate-50/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  {inspectionType === 'Outsource' ? (
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Accepted Report */}
                      <div className={`flex items-center p-2 rounded border transition-all ${item.acceptedDoc ? 'bg-green-50 border-green-200' : 'bg-white dark:bg-slate-800 border-blue-200 border-dashed hover:border-blue-400'}`}>
                        {item.acceptedDoc && !(item.acceptedDoc instanceof File) ? (
                          <button 
                            onClick={() => window.open(getServerUrl(item.acceptedDoc), '_blank')}
                            className="flex items-center gap-2 text-xs  text-green-700 "
                          >
                            <CheckCircle size={14} /> Accepted Report
                            <Eye size={14} className="ml-1 opacity-60" />
                          </button>
                        ) : (
                          <label className="flex items-center gap-2 text-xs  text-blue-600  cursor-pointer">
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
                      <div className={`flex items-center p-2 rounded border transition-all ${item.rejectedDoc ? 'bg-red-50 border-red-200' : 'bg-white dark:bg-slate-800 border-red-200 border-dashed hover:border-red-400'}`}>
                        {item.rejectedDoc && !(item.rejectedDoc instanceof File) ? (
                          <button 
                            onClick={() => window.open(getServerUrl(item.rejectedDoc), '_blank')}
                            className="flex items-center gap-2 text-xs  text-red-700 "
                          >
                            <XCircle size={14} /> Rejected Report
                            <Eye size={14} className="ml-1 opacity-60" />
                          </button>
                        ) : (
                          <label className="flex items-center gap-2 text-xs  text-red-600  cursor-pointer">
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
                        className="p-2 bg-green-600 text-white rounded text-xs    shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center gap-2 ml-auto"
                      >
                        <Save size={14} /> Complete Item Inspection
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs  text-slate-400   italic">
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
            <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2  space-y-4">
              <h3 className="text-xs  text-slate-900 dark:text-white   flex items-center gap-2">
                <Truck size={15} className="text-blue-600" /> Outsource Actions
              </h3>
              
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs  text-slate-500   mb-1.5">Select Vendor</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2.5 text-xs  text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                  >
                    <option value="">Choose Vendor...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs  text-slate-500   mb-1.5">Challan Date</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2.5 text-xs  text-slate-700"
                    value={challanDate}
                    onChange={(e) => setChallanDate(e.target.value)}
                  />
                </div>

                <button 
                  onClick={handleCreateChallan}
                  className="w-full p-2 bg-blue-600 text-white rounded text-xs    shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={15} /> Create Challan
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 p-2  space-y-4">
            <h3 className="text-xs  text-slate-900 dark:text-white   flex items-center gap-2">
              <CheckCircle size={15} className="text-blue-600" /> Finalize Inspection
            </h3>
            
            <textarea 
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-4 py-3 text-xs  text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[100px]"
              placeholder="Enter overall inspection remarks..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />

            {inspectionType === 'Inhouse' && (
              <button 
                onClick={handleSubmitInhouse}
                className="w-full p-2 bg-green-600 text-white rounded text-xs    shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center justify-center gap-2"
              >
                <Save size={15} /> 
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
                  className={`w-full p-2 rounded text-xs transition-all flex items-center justify-center gap-2 ${
                    canFinalize ? 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle size={15} /> 
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
