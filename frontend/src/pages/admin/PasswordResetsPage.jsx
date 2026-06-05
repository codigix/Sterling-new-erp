import React, { useState, useEffect, useCallback } from "react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import Card, { CardContent } from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable/DataTable";
import { AlertCircle, X, Mail, CheckCircle2, Lock, ArrowLeft, Loader2 } from "lucide-react";

const PasswordResetsPage = () => {
  const [resetRequests, setResetRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState(null);
  
  // Modal states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  const fetchResetRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      setRequestsError(null);
      const response = await axios.get("/admin/password-reset-requests");
      setResetRequests(response.data || []);
    } catch (err) {
      console.error("Failed to fetch reset requests:", err);
      setRequestsError("Failed to fetch password reset requests. Please try again.");
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResetRequests();
  }, [fetchResetRequests]);

  const handleOpenApproveModal = async (request) => {
    setSelectedRequest(request);
    try {
      const response = await axios.post(`/admin/password-reset-requests/${request.id}/approve`);
      setGeneratedLink(response.data.resetLink);
      setShowApproveModal(true);
      await fetchResetRequests();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to approve password reset request",
      });
    }
  };

  const handleRejectRequest = async (requestId) => {
    const result = await Swal.fire({
      title: "Reject Request?",
      text: "Are you sure you want to reject this password reset request?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, reject it",
    });

    if (result.isConfirmed) {
      try {
        await axios.post(`/admin/password-reset-requests/${requestId}/reject`);
        Swal.fire({
          icon: "success",
          title: "Rejected",
          text: "Request has been rejected",
          timer: 2000,
          showConfirmButton: false,
        });
        await fetchResetRequests();
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: err.response?.data?.message || "Failed to reject request",
        });
      }
    }
  };

  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    Swal.fire({
      icon: "success",
      title: "Link Copied",
      text: "Reset link has been copied to your clipboard.",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const sendLinkEmail = async () => {
    if (!selectedRequest) return;
    try {
      setEmailSending(true);
      await axios.post(`/admin/password-reset-requests/${selectedRequest.id}/send-email`);
      Swal.fire({
        icon: "success",
        title: "Email Sent",
        text: `Reset link email has been dispatched to ${selectedRequest.email}.`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Failed to send reset link email:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to send reset link email. SMTP may not be configured.",
      });
    } finally {
      setEmailSending(false);
    }
  };

  const columns = [
    {
      key: "username",
      label: "Account Username / Login ID",
      sortable: true,
      render: (value, row) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {value}
        </span>
      ),
    },
    {
      key: "email",
      label: "Registered Email Address",
      sortable: true,
      render: (value) => (
        <span className="text-slate-500 dark:text-slate-400 text-sm">
          {value}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Requested At",
      sortable: true,
      render: (value) => (
        <span className="text-slate-500 dark:text-slate-400 text-xs">
          {new Date(value).toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => {
        let badgeClass = "";
        switch (value) {
          case "PENDING":
            badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
            break;
          case "APPROVED":
            badgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
            break;
          case "COMPLETED":
            badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
            break;
          case "REJECTED":
            badgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
            break;
          default:
            badgeClass = "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300";
        }
        return (
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: "id",
      label: "Actions",
      sortable: false,
      render: (value, row) => {
        if (row.status !== "PENDING") {
          return <span className="text-slate-400 text-xs italic">Processed</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenApproveModal(row)}
              className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded transition shadow-sm font-medium"
            >
              Approve & Send Reset Link
            </button>
            <button
              onClick={() => handleRejectRequest(row.id)}
              className="px-2.5 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition font-medium"
            >
              Reject
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="w-full space-y-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white text-left">
          Password Reset Requests
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 text-left">
          View and verify password reset requests from employees and departmental accounts.
        </p>
      </div>

      {requestsError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded flex items-center text-xs gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-xs text-red-700 dark:text-red-300">
            {requestsError}
          </span>
        </div>
      )}

      {/* Requests Table */}
      {!requestsLoading && resetRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-500 mb-3" />
          <h3 className="text-lg text-slate-900 dark:text-white mb-1 font-semibold">
            No password reset requests
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            All submitted password reset request items will be displayed here.
          </p>
        </div>
      ) : (
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={resetRequests}
            sortable={true}
            striped={true}
            hover={true}
          />
        </CardContent>
      )}

      {/* Approve Request & Reset Link Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[0.5px] flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Approve Password Reset Request
              </h3>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700 text-xs space-y-2.5">
                <div>
                  <p className="text-[10px] text-slate-500 tracking-wider">Account ID / Username</p>
                  <p className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-100">{selectedRequest.username}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 tracking-wider">Account Name</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{selectedRequest.full_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 tracking-wider">Email Address</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{selectedRequest.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Generated Password Reset Link</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full text-xs font-mono p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 select-all focus:outline-none"
                  />
                  <button
                    onClick={copyLinkToClipboard}
                    className="px-3 py-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded font-semibold hover:bg-blue-200 transition"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-955/20 p-2 rounded">
                  ⚠️ The reset token is valid for 24 hours. Copy this link and share it with the employee, or trigger an email send.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={sendLinkEmail}
                  disabled={emailSending}
                  className="flex-1 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition flex items-center justify-center gap-1.5 shadow disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {emailSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" /> Send Email
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowApproveModal(false)}
                  disabled={emailSending}
                  className="flex-1 py-2 text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium transition disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordResetsPage;
