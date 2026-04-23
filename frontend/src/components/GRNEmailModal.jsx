import React from "react";
import { X, AlertTriangle, Truck } from "lucide-react";
import DataTable from "./ui/DataTable/DataTable";

const GRNEmailModal = ({
  emailModal,
  setEmailModal,
  handleSendEmailAndAdd,
}) => {
  if (!emailModal.show) return null;

  const grnNo = emailModal.data?.grnNo || `GRN-${emailModal.data?.grnId}`;
  const poNo = emailModal.data?.poNo || "N/A";
  const vendor = emailModal.data?.vendor || "Vendor";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded shadow-2xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-xl  text-slate-900 dark:text-white text-xs flex items-center gap-3">
            <AlertTriangle className="text-orange-500" size={15} />
            Email Preview - GRN Discrepancy Report
          </h2>
          <button
            onClick={() => setEmailModal({ show: false, type: "", data: null })}
            className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Status Alert */}
          <div className="mb-6 p-4 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Discrepancy Status:</strong>{" "}
              <span className="  text-orange-600 dark:text-orange-400 text-lg ml-2">
                {emailModal.type}
              </span>
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
              This email will be sent to vendor: <strong>{vendor}</strong>
            </p>
          </div>

          {/* Email Preview Box */}
          <div className="bg-gradient-to-b from-blue-50 to-white dark:from-slate-700 dark:to-slate-800 border-2 border-blue-300 dark:border-blue-900 rounded overflow-hidden">
            {/* Email Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white p-6">
              <h3 className="text-2xl  mb-2">
                📦 Goods Received Note Discrepancy Report
              </h3>
              <p className="text-blue-100">
                Action Required: Please review the following discrepancies in
                your shipment
              </p>
            </div>

            {/* Email Content */}
            <div className="p-4 space-y-2">
              {/* Key Information Section */}
              <div className="bg-white dark:bg-slate-700 p-4 rounded border border-slate-200 dark:border-slate-600">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs  text-blue-600 dark:text-blue-400  tracking-wide">
                      Vendor
                    </p>
                    <p className="text-sm  text-slate-900 dark:text-white mt-1">
                      {vendor}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs  text-blue-600 dark:text-blue-400  tracking-wide">
                      Purchase Order
                    </p>
                    <p className="text-sm  text-slate-900 dark:text-white mt-1 break-all">
                      {poNo}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs  text-blue-600 dark:text-blue-400  tracking-wide">
                      GRN Number
                    </p>
                    <p className="text-sm  text-slate-900 dark:text-white mt-1 break-all">
                      {grnNo}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs  text-blue-600 dark:text-blue-400  tracking-wide">
                      Discrepancy Type
                    </p>
                    <p className="text-sm  text-orange-600 dark:text-orange-400 mt-1 ">
                      {emailModal.type}
                    </p>
                  </div>
                </div>
              </div>

              {/* Important Notice */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 rounded">
                <h5 className=" text-yellow-900 dark:text-yellow-300 mb-2">
                  ⚠️ Important Notice
                </h5>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Our receiving team has identified discrepancies between your
                  invoice, ordered quantities, and actual received quantities.
                  Please review the table below and contact us at your earliest
                  convenience to resolve these issues.
                </p>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 dark:border-slate-600 rounded overflow-hidden">
                <h5 className=" text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 p-2 border-b border-blue-200 dark:border-blue-800">
                  Detailed Item Comparison
                </h5>
                <DataTable
                  data={emailModal.data?.items || []}
                  columns={[
                    {
                      key: "description",
                      label: "Description",
                      render: (_, item) => (
                        <span className="text-slate-900 dark:text-slate-100">
                          {item.description || item.item_name || "-"}
                        </span>
                      )
                    },
                    {
                      key: "ordered_quantity",
                      label: "Ordered Qty",
                      className: "text-center",
                      render: (_, item) => (
                        <span className="text-slate-900 dark:text-slate-100">
                          {Number(item.ordered_quantity) || Number(item.quantity) || 0}
                        </span>
                      )
                    },
                    {
                      key: "invoice_quantity",
                      label: "Invoiced Qty",
                      className: "text-center",
                      render: (val) => (
                        <span className="text-slate-900 dark:text-slate-100">
                          {Number(val) || 0}
                        </span>
                      )
                    },
                    {
                      key: "received_quantity",
                      label: "Received Qty",
                      className: "text-center",
                      render: (val) => (
                        <span className="text-slate-900 dark:text-slate-100">
                          {Number(val) || 0}
                        </span>
                      )
                    },
                    {
                      key: "variance",
                      label: "Status & Variance",
                      className: "text-center",
                      render: (_, item) => {
                        const ordered = Number(item.ordered_quantity) || Number(item.quantity) || 0;
                        const received = Number(item.received_quantity) || 0;
                        const diff = received - ordered;
                        const status = diff < 0 ? "SHORTAGE" : diff > 0 ? "OVERAGE" : "OK";
                        const statusColor = diff < 0 ? "bg-red-500 text-white" : diff > 0 ? "bg-orange-500 text-white" : "bg-green-500 text-white";
                        return (
                          <span className={`inline-block px-3 py-1 rounded  text-xs  ${statusColor}`}>
                            {status} {diff !== 0 && `(${diff > 0 ? "+" : ""}${diff})`}
                          </span>
                        );
                      }
                    }
                  ]}
                />
              </div>

              {/* Action Items */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
                <h5 className=" text-blue-900 dark:text-blue-300 mb-2">
                  Required Action:
                </h5>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 ">
                      •
                    </span>
                    <span>
                      Review the discrepancies listed in the table above
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 ">
                      •
                    </span>
                    <span>
                      Confirm whether items were shipped or if there are quality
                      issues
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 ">
                      •
                    </span>
                    <span>
                      Respond with a resolution plan (replacement, credit note,
                      adjustment, etc.)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 ">
                      •
                    </span>
                    <span>Please reply within 48 hours</span>
                  </li>
                </ul>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-600">
                <p className=" mb-1">
                  This is an automated notification from Sterling ERP System
                </p>
                <p>
                  Please do not reply to this email. Contact your account
                  manager for assistance.
                </p>
                <p className="mt-2">
                  Generated on: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 sticky bottom-0 z-10">
          <button
            onClick={() => setEmailModal({ show: false, type: "", data: null })}
            className="px-6 py-2 text-sm  text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendEmailAndAdd}
            className="flex items-center gap-2 px-6 py-2 text-sm  text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded transition-colors shadow-lg hover:"
          >
            <Truck size={15} />
            Send Email & Add to Inventory
          </button>
        </div>
      </div>
    </div>
  );
};

export default GRNEmailModal;
