import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Download,
  Eye,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Loader2,
  MoreVertical,
  ChevronDown,
  Upload,
  RefreshCw,
  MessageSquare,
  Trash2
} from "lucide-react";
import axios from "../../utils/api";
import Swal from "sweetalert2";

const DesignDrawingManagement = () => {
  const [searchParams] = useSearchParams();
  const [rootCardId, setRootCardId] = useState(searchParams.get("rootCardId") || "");
  const [rootCards, setRootCards] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isRevision, setIsRevision] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "Mechanical",
    description: "",
    file: null
  });

  const [reviewData, setReviewData] = useState({
    status: "Approved",
    reviewer_comment: ""
  });

  const [activeTab, setActiveTab] = useState("active");
  const [expandedDocs, setExpandedDocs] = useState(new Set());
  const [docHistories, setDocHistories] = useState({});
  const [fetchingHistory, setFetchingHistory] = useState({});

  const fetchRootCards = async () => {
    try {
      const response = await axios.get("/root-cards");
      const cards = response.data.rootCards || response.data.data || (Array.isArray(response.data) ? response.data : []);
      setRootCards(cards);
    } catch (error) {
      console.error("Error fetching root cards:", error);
      setRootCards([]);
    }
  };

  const fetchDocuments = async () => {
    if (!rootCardId) return;
    try {
      setLoading(true);
      const response = await axios.get(`/design-drawings/root-card/${rootCardId}`);
      // Grouping logic is handled in the render
      setDocuments(response.data.drawings || response.data.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRootCards();
  }, []);

  useEffect(() => {
    if (rootCardId) {
      fetchDocuments();
      setExpandedDocs(new Set());
      setDocHistories({});
    } else {
      setDocuments([]);
      setLoading(false);
    }
  }, [rootCardId]);

  const toggleRow = async (doc) => {
    const docKey = `${doc.name}-${doc.type}`;
    const newExpanded = new Set(expandedDocs);
    
    if (newExpanded.has(docKey)) {
      newExpanded.delete(docKey);
    } else {
      newExpanded.add(docKey);
      if (!docHistories[docKey]) {
        await fetchDocHistory(doc);
      }
    }
    setExpandedDocs(newExpanded);
  };

  const fetchDocHistory = async (doc) => {
    const docKey = `${doc.name}-${doc.type}`;
    try {
      setFetchingHistory(prev => ({ ...prev, [docKey]: true }));
      const response = await axios.get(`/design-drawings/${doc.id}/history`);
      setDocHistories(prev => ({ ...prev, [docKey]: response.data.history }));
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setFetchingHistory(prev => ({ ...prev, [docKey]: false }));
    }
  };

  // Group documents by name and type, keeping the latest version info
  const groupedDocuments = documents.reduce((acc, doc) => {
    const key = `${doc.name}-${doc.type}`;
    if (!acc[key] || doc.version > acc[key].version) {
      acc[key] = doc;
    }
    return acc;
  }, {});

  const groupedDocsList = Object.values(groupedDocuments);

  const activeDocuments = groupedDocsList.filter(doc => doc.status !== 'Rejected');
  const rejectedDocuments = groupedDocsList.filter(doc => doc.status === 'Rejected');

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.file || !formData.name || !rootCardId) {
      Swal.fire("Error", "Please fill all required fields", "error");
      return;
    }

    const uploadData = new FormData();
    uploadData.append("file", formData.file);
    uploadData.append("root_card_id", rootCardId);
    uploadData.append("name", formData.name);
    uploadData.append("type", formData.type);
    uploadData.append("description", formData.description);

    try {
      setLoading(true);

      const headers = {
        'Content-Type': 'multipart/form-data',
      };

      let response;
      if (isRevision && selectedDoc) {
        // Revision endpoint expects parent_id
        const parentId = selectedDoc.parent_id || selectedDoc.id;
        response = await axios.post(`/design-drawings/${parentId}/revision`, uploadData, { headers });
      } else {
        response = await axios.post("/design-drawings/upload", uploadData, { headers });
      }

      if (response.data.success) {
        Swal.fire("Success", response.data.message, "success");
        setShowUploadModal(false);
        
        // If it was a revision, clear cached history for this drawing to force refresh
        if (isRevision && selectedDoc) {
          const docKey = `${selectedDoc.name}-${selectedDoc.type}`;
          setDocHistories(prev => {
            const newState = { ...prev };
            delete newState[docKey];
            return newState;
          });
        }
        
        resetForm();
        fetchDocuments();
      }
    } catch (error) {
      console.error("Upload failed:", error);
      Swal.fire("Error", error.response?.data?.message || "Upload failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", type: "Part Drawing", description: "", file: null });
    setIsRevision(false);
    setSelectedDoc(null);
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`/design-drawings/${selectedDoc.id}/review`, reviewData);
      if (response.data.success) {
        Swal.fire("Success", response.data.message, "success");
        setShowReviewModal(false);
        fetchDocuments();
        // Clear cached history to force refresh
        const docKey = `${selectedDoc.name}-${selectedDoc.type}`;
        setDocHistories(prev => {
          const newState = { ...prev };
          delete newState[docKey];
          return newState;
        });
      }
    } catch (error) {
      console.error("Review failed:", error);
      Swal.fire("Error", "Review failed", "error");
    }
  };

  const submitDraft = async (docId) => {
    try {
      const response = await axios.put(`/design-drawings/${docId}/submit`);
      if (response.data.success) {
        Swal.fire("Success", "Submitted for review", "success");
        fetchDocuments();
        // Refresh expanded history if needed
        const doc = documents.find(d => d.id === docId);
        if (doc) {
           await fetchDocHistory(doc);
        }
      }
    } catch (error) {
      Swal.fire("Error", "Submission failed", "error");
    }
  };

  const handleApprove = async (doc) => {
    try {
      const result = await Swal.fire({
        title: "Approve Drawing?",
        text: `Are you sure you want to approve "${doc.name}" (v${doc.version})? This will make it available for production.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Yes, Approve it!",
      });

      if (result.isConfirmed) {
        setLoading(true);
        const response = await axios.put(`/design-drawings/${doc.id}/review`, {
          status: "Approved",
          reviewer_comment: "Approved"
        });
        
        if (response.data.success) {
          Swal.fire("Approved!", "The drawing has been approved successfully.", "success");
          fetchDocuments();
          // Clear cached history to force refresh
          const docKey = `${doc.name}-${doc.type}`;
          setDocHistories(prev => {
            const newState = { ...prev };
            delete newState[docKey];
            return newState;
          });
        }
      }
    } catch (error) {
      console.error("Approval failed:", error);
      Swal.fire("Error", "Approval failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId, deleteAll = false) => {
    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: deleteAll 
          ? "This will delete ALL versions of this drawing. You won't be able to revert this!" 
          : "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!",
      });

      if (result.isConfirmed) {
        setLoading(true);
        const response = await axios.delete(`/design-drawings/${docId}${deleteAll ? "?deleteAll=true" : ""}`);
        if (response.data.success) {
          Swal.fire("Deleted!", response.data.message || "Drawing has been deleted.", "success");
          fetchDocuments();
          if (deleteAll) {
            setExpandedDocs(new Set());
            setDocHistories({});
          } else {
             // If we deleted a single revision, we might need to refresh history
             // But usually we just refresh the main list which groups them
             setDocHistories({});
          }
        }
      }
    } catch (error) {
      console.error("Delete failed:", error);
      Swal.fire("Error", error.response?.data?.message || "Delete failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "Rejected": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "Pending Review": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Draft": return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Design Drawing Management</h1>
          <p className="text-slate-500">Upload and manage design revisions for root cards</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowUploadModal(true); }}
          disabled={!rootCardId}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            !rootCardId 
              ? "bg-slate-300 cursor-not-allowed text-slate-500" 
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
          title={!rootCardId ? "Please select a Root Card first" : "Upload New Drawing"}
        >
          <Plus size={20} />
          Upload New Drawing
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Root Card</label>
          <select
            value={rootCardId}
            onChange={(e) => setRootCardId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select Root Card...</option>
            {rootCards.map(rc => {
              const baseName = rc.project_name || rc.po_number || "";
              // Remove RC-XXXX pattern from the start of the string if it exists
              const displayName = baseName.replace(/^RC-\d{4}\s*[-:]\s*/i, '');
              return (
                <option key={rc.id} value={rc.id}>{displayName || baseName || rc.id}</option>
              );
            })}
          </select>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "active"
                ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Active Drawings ({activeDocuments.length})
          </button>
          <button
            onClick={() => setActiveTab("rejected")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "rejected"
                ? "bg-white dark:bg-slate-800 text-red-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Rejected Drawings ({rejectedDocuments.length})
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Drawing Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                    <Loader2 className="animate-spin inline-block mr-2" /> Loading drawings...
                  </td>
                </tr>
              ) : (activeTab === "active" ? activeDocuments : rejectedDocuments).length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                    {rootCardId 
                      ? `No ${activeTab} drawings found for this root card` 
                      : "Please select a root card to view drawings"}
                  </td>
                </tr>
              ) : (
                (activeTab === "active" ? activeDocuments : rejectedDocuments).map((doc) => (
                  <React.Fragment key={`${doc.name}-${doc.type}`}>
                    <tr 
                      onClick={() => toggleRow(doc)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`transition-transform duration-200 ${expandedDocs.has(`${doc.name}-${doc.type}`) ? 'rotate-180' : ''}`}>
                            <ChevronDown size={18} className="text-slate-400 group-hover:text-blue-500" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{doc.name}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">{doc.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md">{doc.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {new Date(doc.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {doc.type !== 'Final Approved Drawing' && doc.status !== 'Approved' && (
                            <button 
                              onClick={() => {
                                setSelectedDoc(doc); 
                                setFormData({ ...formData, name: doc.name, type: doc.type }); 
                                setIsRevision(true);
                                setShowUploadModal(true);
                              }}
                              className="bg-white dark:bg-slate-800 text-orange-500 hover:text-orange-600 border border-slate-200 dark:border-slate-700 p-2 rounded-lg transition-colors shadow-sm"
                              title="Upload Revision"
                            >
                              <RefreshCw size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(doc.id, true)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                            title="Delete whole drawing (all versions)"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Revision History */}
                    {expandedDocs.has(`${doc.name}-${doc.type}`) && (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/20 border-y border-slate-100 dark:border-slate-800">
                          <div className="pl-8 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-tight">
                                <History size={16} className="text-blue-500" /> Revision History
                              </h4>
                            </div>
                            
                            {fetchingHistory[`${doc.name}-${doc.type}`] ? (
                              <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
                                <Loader2 size={20} className="animate-spin text-blue-500" /> Loading revisions...
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {(docHistories[`${doc.name}-${doc.type}`] || []).map((rev, index) => (
                                  <div 
                                    key={rev.id} 
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                      index === 0 
                                        ? "bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-900/40 shadow-md ring-1 ring-blue-50 dark:ring-blue-900/10" 
                                        : "bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800"
                                    }`}
                                  >
                                    <div className="flex items-center gap-6">
                                      <div className="flex flex-col items-center min-w-[40px]">
                                        <span className="text-base font-black text-blue-600">v{rev.version}</span>
                                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">{new Date(rev.created_at).toLocaleDateString()}</span>
                                      </div>
                                      <div className="h-12 w-px bg-slate-200 dark:bg-slate-700"></div>
                                      <div>
                                        <div className="flex items-center gap-3 mb-1.5">
                                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusColor(rev.status)}`}>
                                            {rev.status}
                                          </span>
                                          <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                            {rev.description || "No description"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
                                          <span className="flex items-center gap-1"><FileText size={12} /> {rev.file_path.split('/').pop()}</span>
                                          {rev.reviewer_name && <span className="flex items-center gap-1 text-slate-500">Reviewer: <b className="text-slate-700 dark:text-slate-300">{rev.reviewer_name}</b></span>}
                                        </div>
                                        {rev.reviewer_comment && (
                                          <div className="text-[11px] text-red-600 mt-2.5 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900/30">
                                            <MessageSquare size={14} className="mt-0.5 shrink-0" /> 
                                            <div>
                                              <span className="font-bold uppercase text-[9px] block mb-0.5">Reviewer Feedback:</span>
                                              {rev.reviewer_comment}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <a 
                                        href={`${axios.defaults.baseURL.split('/api')[0]}/${rev.file_path}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-600"
                                      >
                                        <Eye size={14} /> View
                                      </a>
                                      
                                      {index === 0 && rev.type !== 'Final Approved Drawing' && (
                                        <div className="flex items-center gap-2">
                                          {rev.status === 'Draft' && (
                                            <button 
                                              onClick={() => submitDraft(rev.id)}
                                              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm"
                                            >
                                              <Upload size={14} /> Submit
                                            </button>
                                          )}
                                          
                                          {rev.status === 'Rejected' && (
                                            <button 
                                              onClick={() => {
                                                setSelectedDoc(rev); 
                                                setFormData({ ...formData, name: rev.name, type: rev.type }); 
                                                setIsRevision(true);
                                                setShowUploadModal(true);
                                              }}
                                              className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm"
                                            >
                                              <RefreshCw size={14} /> Create Revision
                                            </button>
                                          )}
                                          
                                          {rev.status === 'Pending Review' && (
                                            <>
                                              <button 
                                                onClick={() => handleApprove(rev)}
                                                className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm"
                                              >
                                                <CheckCircle2 size={14} /> Approve
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      )}

                                      <button 
                                        onClick={() => handleDelete(rev.id, false)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                                        title="Delete this version only"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isRevision ? `Create Revision for ${formData.name} (v${selectedDoc.version + 1})` : "Upload New Drawing"}
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Drawing Name</label>
                <input
                  type="text"
                  required
                  disabled={isRevision}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                <select
                  disabled={isRevision}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Part Drawing">Part Drawing</option>
                  <option value="Assembly Drawing">Assembly Drawing</option>
                  <option value="Final Approved Drawing">Final Approved Drawing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">File (Any format)</label>
                <input
                  type="file"
                  required
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
              >
                {loading ? <Loader2 className="animate-spin" /> : (isRevision ? "Create Revision" : "Upload Drawing")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revision History: {selectedDoc?.name}</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {historyLoading ? (
                <div className="text-center py-10 text-slate-500"><Loader2 className="animate-spin inline mr-2" /> Loading history...</div>
              ) : history.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-600 dark:text-blue-400">Version v{item.version}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 italic">"{item.description}"</div>
                  {item.reviewer_comment && (
                    <div className="flex gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                      <MessageSquare size={16} />
                      <span>{item.reviewer_comment}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Uploaded by: {item.created_by_name}</span>
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-end">
                    <a 
                      href={`${axios.defaults.baseURL.split('/api')[0]}/${item.file_path}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                    >
                      <Download size={14} /> Download File
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Review / Feedback Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedDoc?.status === 'Rejected' ? "Reviewer Feedback" : "Review Drawing"}
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              {selectedDoc?.status === 'Rejected' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 dark:text-red-400 font-bold mb-2">
                      <AlertCircle size={18} />
                      <span>Status: Rejected (v{selectedDoc.version})</span>
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/50 p-3 rounded border border-red-100 dark:border-red-900/20">
                      <p className="font-semibold mb-1 text-xs uppercase tracking-wider text-slate-500">Reviewer Comment:</p>
                      {selectedDoc.reviewer_comment || "No comment provided."}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setShowReviewModal(false);
                        setFormData({ ...formData, name: selectedDoc.name, type: selectedDoc.type }); 
                        setIsRevision(true);
                        setShowUploadModal(true);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold transition-colors"
                    >
                      Create Revision
                    </button>
                    <button 
                      onClick={() => setShowReviewModal(false)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Decision</label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setReviewData({ ...reviewData, status: "Approved" })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${reviewData.status === 'Approved' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <CheckCircle2 size={18} /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewData({ ...reviewData, status: "Rejected" })}
                        className={`flex-1 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${reviewData.status === 'Rejected' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <XCircle size={18} /> Reject
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reviewer Comments</label>
                    <textarea
                      required={reviewData.status === 'Rejected'}
                      placeholder={reviewData.status === 'Rejected' ? "Please provide feedback for rejection..." : "Optional comments..."}
                      value={reviewData.reviewer_comment}
                      onChange={(e) => setReviewData({ ...reviewData, reviewer_comment: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className={`w-full text-white font-bold py-3 rounded-lg transition-colors ${reviewData.status === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    Submit Decision
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignDrawingManagement;
