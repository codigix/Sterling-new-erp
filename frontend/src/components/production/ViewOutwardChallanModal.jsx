import React, { useState, useEffect, useCallback } from "react";
import axios from "../../utils/api";
import { toast } from "react-toastify";
import {
  X,
  Download,
  Building2,
  Loader2,
  FileText,
} from "lucide-react";
import { exportChallanToPDF } from "../../utils/challanPdfExport";

const ViewOutwardChallanModal = ({ isOpen, onClose, challanId }) => {
  const [loading, setLoading] = useState(false);
  const [challanData, setChallanData] = useState(null);
  const [items, setItems] = useState([]);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/production/outward-challans/${challanId}`,
      );
      if (response.data.success) {
        setChallanData(response.data.challan);
        setItems(response.data.items || []);
      }
    } catch (error) {
      console.error("Error fetching challan details:", error);
      toast.error("Failed to load challan details");
    } finally {
      setLoading(false);
    }
  }, [challanId]);

  useEffect(() => {
    if (isOpen && challanId) {
      fetchDetails();
    }
  }, [isOpen, challanId, fetchDetails]);

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!challanData) return;
    try {
      setDownloading(true);
      await exportChallanToPDF(challanData, items);
      toast.success("Downloading challan...");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const totalQty = items.reduce(
    (sum, item) => sum + (parseFloat(item.dispatch_qty) || 0),
    0,
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-950 w-full max-w-4xl rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh] print:shadow-none print:border-none print:max-h-none print:rounded-none">
        {/* Modal Header - Hidden in Print */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 print:hidden">
          <h2 className="text-lg  text-slate-900 dark:text-white flex items-center gap-2">
            <FileText size={20} className="text-indigo-600" />
            Process Challan Details
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Challan Document Layout */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2
                className="animate-spin text-indigo-600 mb-4"
                size={32}
              />
              <p className="text-xs text-slate-400">
                Fetching document data...
              </p>
            </div>
          ) : (
            challanData && (
              <div className="max-w-3xl mx-auto border-2 border-slate-950 p-0 shadow-inner rounded-sm bg-white text-slate-950 print:border-slate-950 print:shadow-none">
                {/* Document Header */}
                <div className="grid grid-cols-12 border-b-2 border-slate-950">
                  <div className="col-span-4 p-4 border-r-2 border-slate-950 flex flex-col items-center justify-center">
                    <div className="w-auto h-16 flex items-center justify-center mb-2">
                      <img src="/logo.png" alt="Sterling Logo" className="h-14 w-auto object-contain" />
                    </div>
                    <h3 className="text-sm font-black text-center leading-tight  text-slate-900">
                      STERLING TECHNO-SYSTEMS PVT. LTD.
                    </h3>
                  </div>
                  <div className="col-span-8 p-3 text-[10px] text-slate-900">
                    <div className="flex flex-col items-end text-right space-y-0.5">
                      <p className="font-black text-slate-950  text-xs">
                        Engineers Consultants and Manufacturers
                      </p>
                      <p className="font-medium">
                        Gat No. 70, Sonawanewasti, Talawade, Pune - 411062,
                        Maharashtra (India)
                      </p>
                      <p className="font-medium">Telefax: +91-20-27353051</p>
                      <p className="font-medium">GST No. 27AARCS2886C1ZX</p>
                      <p className="font-medium text-indigo-700">
                        Web.: www.sterling-techno.com
                      </p>
                    </div>
                  </div>
                </div>

                {/* Title Bar */}
                <div className="bg-slate-100 border-b-2 border-slate-950 py-1 text-center print:bg-slate-100">
                  <h2 className="text-[11px] font-black tracking-widest text-slate-950  italic underline">
                    DELIVERY / PROCESS CHALLAN
                  </h2>
                </div>

                {/* Top Fields */}
                <div className="grid grid-cols-2 text-[11px] text-slate-950">
                  {/* Left Side: To Vendor */}
                  <div className="border-r-2 border-slate-950 p-4 space-y-2 min-h-[140px]">
                    <div className="flex items-start gap-2">
                      <span className="font-black text-slate-900">To,</span>
                      <div className="flex-1">
                        <p className="font-black  text-[12px] text-slate-950">
                          {challanData.vendor_name}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap leading-tight font-medium">
                          {challanData.vendor_address || "No address provided"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Challan Info */}
                  <div className="divide-y-2 divide-slate-950">
                    <div className="p-3 grid grid-cols-12 items-center">
                      <span className="col-span-5 font-black  text-slate-900">
                        Challan No:-
                      </span>
                      <span className="col-span-7 font-black text-[12px] text-indigo-700">
                        {challanData.challan_no}
                      </span>
                    </div>
                    <div className="p-3 grid grid-cols-12 items-center">
                      <span className="col-span-5 font-black  text-slate-900">
                        Date:-
                      </span>
                      <span className="col-span-7 font-black text-slate-950">
                        {new Date(challanData.challan_date).toLocaleDateString(
                          "en-GB",
                        )}
                      </span>
                    </div>
                    <div className="p-3 grid grid-cols-12 items-center">
                      <span className="col-span-5 font-black  text-slate-900">
                        Supply Order No.:
                      </span>
                      <span className="col-span-7 font-black text-slate-950">
                        {challanData.supply_order_no || "-"}
                      </span>
                    </div>
                    <div className="p-3 grid grid-cols-12 items-center">
                      <span className="col-span-5 font-black  text-slate-900">
                        Date:
                      </span>
                      <span className="col-span-7 font-black text-slate-950">
                        {challanData.supply_order_date
                          ? new Date(
                              challanData.supply_order_date,
                            ).toLocaleDateString("en-GB")
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Instruction Bar */}
                <div className="border-y-2 border-slate-950 bg-slate-50 py-1 px-3 text-[9px] font-black text-slate-950 text-center  tracking-tighter">
                  Please Receive The Following Articles In Good Condition & Pl.
                  Sign Duplicate Challan In Token of Having Received The
                  Materials
                </div>

                {/* Items Table */}
                <div className="min-h-[400px] border-b-2 border-slate-950">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-950 bg-slate-50 text-[10px] font-black text-slate-900">
                        <th className="border-r-2 border-slate-950 p-2 w-[60px]">
                          Sr. No
                        </th>
                        <th className="border-r-2 border-slate-950 p-2 text-left ">
                          DESCRIPTION & SPECIFICATION
                        </th>
                        <th className="border-r-2 border-slate-950 p-2 w-[60px]">
                          UNIT
                        </th>
                        <th className="p-2 w-[100px] text-right">QTY.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr
                          key={idx}
                          className="text-slate-950 border-b border-slate-100"
                        >
                          <td className="border-r-2 border-slate-950 p-2 text-center text-[11px] ">
                            {idx + 1}
                          </td>
                          <td className="border-r-2 border-slate-950 p-2 text-[11px]">
                            <div className="flex flex-col">
                              <span className="font-black  text-slate-950">
                                {item.item_name}
                              </span>
                              <span className="text-[9px]  text-slate-600">
                                {item.item_code}
                              </span>
                            </div>
                          </td>
                          <td className="border-r-2 border-slate-950 p-2 text-center text-[11px] font-black ">
                            {item.uom}
                          </td>
                          <td className="p-2 text-right text-[11px] font-black">
                            {parseFloat(item.dispatch_qty).toString()}
                          </td>
                        </tr>
                      ))}
                      {/* Fill empty space */}
                      {items.length < 10 &&
                        Array.from({ length: 10 - items.length }).map(
                          (_, i) => (
                            <tr key={`empty-${i}`} className="h-8">
                              <td className="border-r-2 border-slate-950"></td>
                              <td className="border-r-2 border-slate-950"></td>
                              <td className="border-r-2 border-slate-950"></td>
                              <td></td>
                            </tr>
                          ),
                        )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Fields */}
                <div className="grid grid-cols-12 text-[11px] text-slate-950 border-b-2 border-slate-950">
                  <div className="col-span-8 border-r-2 border-slate-950 divide-y-2 divide-slate-950">
                    <div className="p-2 flex items-center">
                      <span className="font-black  w-48 text-slate-900">
                        Despatched Through:
                      </span>
                      <span className="font-black flex-1  text-slate-950">
                        {challanData.despatched_through || "-"}
                      </span>
                    </div>
                    <div className="p-2 flex items-center">
                      <span className="font-black  w-48 text-slate-900">
                        Against L. R./ R. R. No.:
                      </span>
                      <span className="font-black flex-1  text-slate-950">
                        {challanData.against_lr_rr_no || "-"}
                      </span>
                    </div>
                    <div className="p-2 flex items-center">
                      <span className="font-black  w-48 text-slate-900">
                        Frieght Paid / To Pay:
                      </span>
                      <span className="font-black flex-1  text-slate-950">
                        {challanData.freight_type || "-"}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-4 flex flex-col items-center justify-center p-2 bg-slate-50">
                    <span className="text-[9px] font-black text-slate-600 uppercase">
                      Total Qty
                    </span>
                    <span className="text-lg font-black text-slate-950">
                      {totalQty}
                    </span>
                  </div>
                </div>

                {/* Signature Area */}
                <div className="grid grid-cols-2 text-[10px] text-slate-950">
                  <div className="p-6 border-r-2 border-slate-950 flex flex-col justify-between h-40">
                    <span className="font-black border-b-2 border-slate-950 w-fit  text-slate-900">
                      RECEIVED THE MATERIALS IN GOOD CONDITION
                    </span>
                    <div className="flex justify-between items-end">
                      <span className="font-black  leading-tight text-slate-900">
                        Customer Signature With Stamp
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col justify-between items-center text-center h-40">
                    <span className="font-black  text-slate-900">
                      For Sterling Techno-systems Pvt. Ltd.
                    </span>
                    <div className="mt-12 flex flex-col items-center w-full">
                      <div className="w-48 border-t-2 border-dotted border-slate-950 mb-1"></div>
                      <span className="font-black  text-slate-900">
                        Authorised Signatory
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Global Print Styles */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
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
            .shadow-2xl, .shadow-inner {
              box-shadow: none !important;
            }
          }
        `,
          }}
        />
      </div>
    </div>
  );
};

export default ViewOutwardChallanModal;
