import React, { useState, useEffect } from "react";
import axios from "../../utils/api";
import { toast } from "react-toastify";
import { 
  X, 
  Printer, 
  Building2,
  Loader2,
  FileText,
  Truck
} from "lucide-react";

const ViewInwardChallanModal = ({ isOpen, onClose, challanId }) => {
  const [loading, setLoading] = useState(false);
  const [challanData, setChallanData] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (isOpen && challanId) {
      fetchDetails();
    }
  }, [isOpen, challanId]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/production/inward-challans/${challanId}`);
      if (response.data.success) {
        setChallanData(response.data.challan);
        setItems(response.data.items || []);
      }
    } catch (error) {
      console.error("Error fetching inward challan details:", error);
      toast.error("Failed to load inward challan details");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const totalReceived = items.reduce((sum, item) => sum + (parseFloat(item.received_qty) || 0), 0);
  const totalAccepted = items.reduce((sum, item) => sum + (parseFloat(item.accepted_qty) || 0), 0);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-950 w-full max-w-4xl rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh] print:shadow-none print:border-none print:max-h-none print:rounded-none">
        
        {/* Modal Header - Hidden in Print */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 print:hidden">
          <h2 className="text-lg  text-slate-900 dark:text-white flex items-center gap-2">
            <Truck size={20} className="text-emerald-600" />
            Inward Challan Details
          </h2>
          <div className="flex items-center gap-3">
             <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs  hover:bg-emerald-700 transition-colors"
             >
                <Printer size={14} /> Print / Save PDF
             </button>
             <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
             </button>
          </div>
        </div>

        {/* Challan Document Layout */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
               <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
               <p className="text-xs text-slate-400">Fetching document data...</p>
            </div>
          ) : challanData && (
            <div className="max-w-3xl mx-auto border-2 border-slate-950 p-0 shadow-inner rounded-sm bg-white text-slate-950 print:border-slate-950 print:shadow-none">
              
              {/* Document Header */}
              <div className="grid grid-cols-12 border-b-2 border-slate-950">
                <div className="col-span-4 p-4 border-r-2 border-slate-950 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center mb-2 print:bg-transparent">
                     <Building2 size={32} className="text-slate-900" />
                  </div>
                  <h3 className="text-sm font-black text-center leading-tight  text-slate-900">STERLING TECHNO-SYSTEMS PVT. LTD.</h3>
                </div>
                <div className="col-span-8 p-3 text-[10px] text-slate-900">
                  <div className="flex flex-col items-end text-right space-y-0.5">
                    <p className="font-black text-slate-950  text-xs">Engineers Consultants and Manufacturers</p>
                    <p className="font-medium">Gat No. 70, Sonawanewasti, Talawade, Pune - 411062, Maharashtra (India)</p>
                    <p className="font-medium">Telefax: +91-20-27353051</p>
                    <p className="font-medium">GST No. 27AARCS2886C1ZX</p>
                    <p className="font-medium text-emerald-700">Web.: www.sterling-techno.com</p>
                  </div>
                </div>
              </div>

              {/* Title Bar */}
              <div className="bg-slate-100 border-b-2 border-slate-950 py-1 text-center print:bg-slate-100">
                 <h2 className="text-[11px] font-black tracking-widest text-slate-950  italic underline">INWARD / RECEIPT CHALLAN</h2>
              </div>

              {/* Top Fields */}
              <div className="grid grid-cols-2 text-[11px] text-slate-950 border-b-2 border-slate-950">
                {/* Left Side: From Vendor */}
                <div className="border-r-2 border-slate-950 p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="font-black text-slate-900 ">From:</span>
                    <div className="flex-1">
                      <p className="font-black  text-[12px] text-slate-950">{challanData.vendor_name}</p>
                      <p className="mt-1 whitespace-pre-wrap leading-tight font-medium">{challanData.vendor_address || "No address provided"}</p>
                    </div>
                  </div>
                </div>

                {/* Right Side: Challan Info */}
                <div className="divide-y-2 divide-slate-950">
                  <div className="p-2 grid grid-cols-12 items-center">
                    <span className="col-span-5 font-black  text-slate-900">Inward No:</span>
                    <span className="col-span-7 font-black text-[12px] text-emerald-700">{challanData.challan_no}</span>
                  </div>
                  <div className="p-2 grid grid-cols-12 items-center">
                    <span className="col-span-5 font-black  text-slate-900">Challan Date:</span>
                    <span className="col-span-7 font-black text-slate-950">{new Date(challanData.challan_date).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div className="p-2 grid grid-cols-12 items-center">
                    <span className="col-span-5 font-black  text-slate-900">Received On:</span>
                    <span className="col-span-7 font-black text-slate-950">{new Date(challanData.received_date).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div className="p-2 grid grid-cols-12 items-center">
                    <span className="col-span-5 font-black  text-slate-900">Outward Ref:</span>
                    <span className="col-span-7 font-black text-indigo-700">{challanData.outward_challan_no || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="min-h-[350px] border-b-2 border-slate-950">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-950 bg-slate-50 text-[10px] font-black text-slate-900">
                      <th className="border-r-2 border-slate-950 p-2 w-[40px]">Sr.</th>
                      <th className="border-r-2 border-slate-950 p-2 text-left ">ITEM DESCRIPTION</th>
                      <th className="border-r-2 border-slate-950 p-2 w-[60px]">SENT</th>
                      <th className="border-r-2 border-slate-950 p-2 w-[60px]">RECV.</th>
                      <th className="border-r-2 border-slate-950 p-2 w-[60px]">ACCPT.</th>
                      <th className="border-r-2 border-slate-950 p-2 w-[60px]">REJT.</th>
                      <th className="p-2 text-left  text-[9px]">REMARKS / REASON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="text-slate-950 border-b border-slate-100">
                        <td className="border-r-2 border-slate-950 p-2 text-center text-[10px] ">{idx + 1}</td>
                        <td className="border-r-2 border-slate-950 p-2 text-[10px]">
                           <div className="flex flex-col">
                              <span className="font-black  text-slate-950">{item.item_name}</span>
                              <span className="text-[9px]  text-slate-600">{item.item_code}</span>
                              {item.batch_no && <span className="text-[9px]  italic text-indigo-700">ST#: {item.batch_no}</span>}
                           </div>
                        </td>
                        <td className="border-r-2 border-slate-950 p-2 text-right text-[10px] font-black">{parseFloat(item.sent_qty).toString()}</td>
                        <td className="border-r-2 border-slate-950 p-2 text-right text-[10px] font-black">{parseFloat(item.received_qty).toString()}</td>
                        <td className="border-r-2 border-slate-950 p-2 text-right text-[10px] font-black text-emerald-700">{parseFloat(item.accepted_qty).toString()}</td>
                        <td className="border-r-2 border-slate-950 p-2 text-right text-[10px] font-black text-red-600">{parseFloat(item.rejected_qty).toString()}</td>
                        <td className="p-2 text-[9px] font-medium italic">{item.remarks || "-"}</td>
                      </tr>
                    ))}
                    {items.length < 8 && Array.from({ length: 8 - items.length }).map((_, i) => (
                      <tr key={`empty-${i}`} className="h-8">
                        <td className="border-r-2 border-slate-950"></td>
                        <td className="border-r-2 border-slate-950"></td>
                        <td className="border-r-2 border-slate-950"></td>
                        <td className="border-r-2 border-slate-950"></td>
                        <td className="border-r-2 border-slate-950"></td>
                        <td className="border-r-2 border-slate-950"></td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Fields */}
              <div className="grid grid-cols-12 text-[11px] text-slate-950 border-b-2 border-slate-950">
                <div className="col-span-7 border-r-2 border-slate-950 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="font-black  text-slate-900">General Remarks:</span>
                    <p className="flex-1 font-medium italic">{challanData.remarks || "No additional remarks"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black  text-slate-900">Vehicle No:</span>
                    <span className="font-black text-slate-950 ">{challanData.vehicle_no || "N/A"}</span>
                  </div>
                </div>
                <div className="col-span-5 grid grid-cols-2 divide-x-2 divide-slate-950">
                  <div className="flex flex-col items-center justify-center bg-slate-50 p-2">
                    <span className="text-[9px] font-black  text-slate-600">Total Received</span>
                    <span className="text-xl font-black text-slate-950">{parseFloat(totalReceived).toString()}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-emerald-50 p-2">
                    <span className="text-[9px] font-black  text-emerald-600">Total Accepted</span>
                    <span className="text-xl font-black text-emerald-700">{parseFloat(totalAccepted).toString()}</span>
                  </div>
                </div>
              </div>

              {/* Signature Area */}
              <div className="grid grid-cols-2 text-[10px] text-slate-950">
                <div className="p-6 border-r-2 border-slate-950 flex flex-col justify-between h-32">
                  <span className="font-black  text-slate-900">Checked By / Store Keeper</span>
                  <div className="w-32 border-t-2 border-dotted border-slate-950"></div>
                </div>
                <div className="p-6 flex flex-col justify-between items-center text-center h-32">
                  <span className="font-black  text-slate-900">Authorised Signatory</span>
                  <div className="mt-8 flex flex-col items-center w-full">
                    <div className="w-48 border-t-2 border-dotted border-slate-950 mb-1"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Print Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .fixed.inset-0, .fixed.inset-0 * {
              visibility: visible;
            }
            .fixed.inset-0 {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
              background: white !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            .max-w-4xl {
              max-width: 100% !important;
            }
            .overflow-y-auto {
              overflow: visible !important;
            }
            .border-slate-950 {
               border-color: #000 !important;
            }
          }
        ` }} />
      </div>
    </div>
  );
};

export default ViewInwardChallanModal;
