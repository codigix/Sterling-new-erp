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
import { getServerUrl, downloadFile } from "../../utils/fileUtils";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

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
    file: null,
    root_card_id: ""
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

  const fetchDocuments = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const url = rootCardId 
        ? `/design-drawings/root-card/${rootCardId}`
        : `/design-drawings`;
      const response = await axios.get(url);
      setDocuments(response.data.drawings || response.data.documents || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      await downloadFile(doc.file_path, doc.name);
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  useEffect(() => {
    fetchRootCards();
  }, []);

  useEffect(() => {
    fetchDocuments();
    setExpandedDocs(new Set());
    setDocHistories({});
  }, [rootCardId]);

  const toggleRow = async (doc) => {
    const docKey = doc.parent_id || doc.id;
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
    const docKey = doc.parent_id || doc.id;
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

  // Group documents by parent_id (or id if it's the root), keeping the latest version info
  const groupedDocuments = documents.reduce((acc, doc) => {
    const key = doc.parent_id || doc.id;
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
    const finalRootCardId = rootCardId || formData.root_card_id || (isRevision && selectedDoc?.root_card_id);
    if (!formData.file || !formData.name || !finalRootCardId) {
      toast.error("Please fill all required fields");
      return;
    }

    const uploadData = new FormData();
    uploadData.append("file", formData.file);
    uploadData.append("root_card_id", finalRootCardId);
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
        toast.success(response.data.message || "Upload successful");
        setShowUploadModal(false);
        
        // If it was a revision, refresh the expanded history
        if (isRevision && selectedDoc) {
          const docKey = selectedDoc.parent_id || selectedDoc.id;
          if (expandedDocs.has(docKey)) {
            await fetchDocHistory(selectedDoc);
          }
        }
        
        resetForm();
        fetchDocuments(true); // silent refresh
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(error.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", type: "Part Drawing", description: "", file: null, root_card_id: "" });
    setIsRevision(false);
    setSelectedDoc(null);
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`/design-drawings/${selectedDoc.id}/review`, reviewData);
      if (response.data.success) {
        toast.success(response.data.message || "Review updated");
        setShowReviewModal(false);
        fetchDocuments(true);
        // Refresh expanded history if needed
        const docKey = selectedDoc.parent_id || selectedDoc.id;
        if (expandedDocs.has(docKey)) {
          await fetchDocHistory(selectedDoc);
        }
      }
    } catch (error) {
      console.error("Review failed:", error);
      toast.error(error.response?.data?.message || "Review failed");
    }
  };

  const submitDraft = async (docId) => {
    try {
      const response = await axios.put(`/design-drawings/${docId}/submit`);
      if (response.data.success) {
        toast.success("Submitted for review");
        fetchDocuments(true);
        // Refresh expanded history if needed
        const doc = documents.find(d => d.id === docId);
        if (doc) {
           await fetchDocHistory(doc);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Submission failed");
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
          toast.success("The drawing has been approved successfully.");
          fetchDocuments(true);
          // Refresh expanded history if needed
          const docKey = doc.parent_id || doc.id;
          if (expandedDocs.has(docKey)) {
             await fetchDocHistory(doc);
          }
        }
      }
    } catch (error) {
      console.error("Approval failed:", error);
      toast.error(error.response?.data?.message || "Approval failed");
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
          toast.success(response.data.message || "Drawing has been deleted.");
          fetchDocuments(true);
          if (deleteAll) {
            setExpandedDocs(prev => {
              const newState = new Set(prev);
              newState.delete(docId);
              return newState;
            });
            setDocHistories(prev => {
              const newState = { ...prev };
              delete newState[docId];
              return newState;
            });
          } else {
             // If we deleted a single revision, we might need to refresh history
             // We can just clear it or better re-fetch it if expanded
             setDocHistories({});
          }
        }
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error(error.response?.data?.message || "Delete failed");
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
    <div className="p-6 space-y-2">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl  text-slate-900 dark:text-white">Design Drawing Management</h1>
          <p className="text-slate-500 text-xs">Upload and manage design revisions for root cards</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowUploadModal(true); }}
          className="flex items-center gap-2 p-2 rounded text-xs transition-colors bg-blue-600 hover:bg-blue-700 text-white"
          title="Upload New Drawing"
        >
          <Plus size={20} />
          Upload New Drawing
        </button>
      </div>

      <div className="border-slate-200 my-5 dark:border-slate-700  flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex-1 max-w-md">
          <label className="block text-xs  text-slate-700 dark:text-slate-300 ">Filter by Root Card</label>
          <select
            value={rootCardId}
            onChange={(e) => setRootCardId(e.target.value)}
            className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Root Cards</option>
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

        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded">
          <button
            onClick={() => setActiveTab("active")}
            className={`p-2 rounded-md text-xs  transition-all ${
              activeTab === "active"
                ? "bg-white dark:bg-slate-800 text-blue-600 "
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Active Drawings ({activeDocuments.length})
          </button>
          <button
            onClick={() => setActiveTab("rejected")}
            className={`p-2 rounded-md text-xs  transition-all ${
              activeTab === "rejected"
                ? "bg-white dark:bg-slate-800 text-red-600 "
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Rejected Drawings ({rejectedDocuments.length})
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700  overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-2 text-xs  text-slate-500">Drawing Name</th>
                <th className="p-2 text-xs  text-slate-500">Project / Root Card</th>
                <th className="p-2 text-xs  text-slate-500">Type</th>
                <th className="p-2 text-xs  text-slate-500">Latest Status</th>
                <th className="p-2 text-xs  text-slate-500">Last Updated</th>
                <th className="p-2 text-xs  text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                    <Loader2 className="animate-spin inline-block mr-2" /> Loading drawings...
                  </td>
                </tr>
              ) : (activeTab === "active" ? activeDocuments : rejectedDocuments).length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                    No {activeTab} drawings found
                  </td>
                </tr>
              ) : (
                (activeTab === "active" ? activeDocuments : rejectedDocuments).map((doc) => (
                  <React.Fragment key={doc.parent_id || doc.id}>
                    <tr 
                      onClick={() => toggleRow(doc)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer group"
                    >
                      <td className="p-2">
                        <div className="flex items-center gap-3">
                          <div className={`transition-transform duration-200 ${expandedDocs.has(doc.parent_id || doc.id) ? 'rotate-180' : ''}`}>
                            <ChevronDown size={18} className="text-slate-400 group-hover:text-blue-500" />
                          </div>
                          <div>
                            <div className=" text-xs text-slate-900 dark:text-white">{doc.name}</div>
                            <div className="text-xs text-slate-500 truncate max-w-xs">{doc.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="text-xs  text-blue-600 dark:text-blue-400 truncate max-w-[150px]" title={doc.project_name}>{doc.project_name || 'N/A'}</div>
                        <div className="text-xs text-slate-500">{doc.po_number || doc.root_card_id}</div>
                      </td>
                      <td className="p-2">
                        <span className="text-xs  text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md">{doc.type}</span>
                      </td>
                      <td className="p-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs    ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="p-2 text-xs text-slate-500 ">
                        {new Date(doc.updated_at).toLocaleDateString()}
                      </td>
                      <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {doc.type !== 'Final Approved Drawing' && doc.status !== 'Approved' && (
                            <button 
                              onClick={() => {
                                setSelectedDoc(doc); 
                                setFormData({ ...formData, name: doc.name, type: doc.type }); 
                                setIsRevision(true);
                                setShowUploadModal(true);
                              }}
                              className="bg-white dark:bg-slate-800 text-orange-500 hover:text-orange-600 border border-slate-200 dark:border-slate-700 p-2 rounded transition-colors "
                              title="Upload Revision"
                            >
                              <RefreshCw size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(doc.id, true)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 "
                            title="Delete whole drawing (all versions)"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Revision History */}
                    {expandedDocs.has(doc.parent_id || doc.id) && (
                      <tr>
                        <td colSpan="6" className="p-2 bg-slate-50/50 dark:bg-slate-900/20 border-y border-slate-100 dark:border-slate-800">
                          <div className=" space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm  text-slate-700 dark:text-slate-300 flex items-center gap-2  ">
                                <History size={15} className="text-blue-500" /> Revision History
                              </h4>
                            </div>
                            
                            {fetchingHistory[doc.parent_id || doc.id] ? (
                              <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
                                <Loader2 size={15} className="animate-spin text-blue-500" /> Loading revisions...
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {(docHistories[doc.parent_id || doc.id] || []).map((rev, index) => (
                                  <div 
                                    key={rev.id} 
                                    className={`flex items-start justify-between p-4 rounded border transition-all ${
                                      index === 0 
                                        ? "bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-900/40  ring-1 ring-blue-50 dark:ring-blue-900/10" 
                                        : "bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800"
                                    }`}
                                  >
                                    <div className="flex items-start  gap-2">
                                      <div className="flex flex-col items-center ">
                                        <span className="text-sm  text-blue-600">v{rev.version}</span>
                                        <span className="text-xs text-slate-400   er">{new Date(rev.created_at).toLocaleDateString()}</span>
                                      </div>
                                      <div className="h-12 w-px bg-slate-200 dark:bg-slate-700"></div>
                                      <div>
                                        <div className="flex gap-3 mb-1.5">
                                          
                                          <span className="text-xs text-slate-500 dark:text-slate-300">
                                            {rev.description || "No description"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-400 ">
                                          <span className="flex items-center gap-1"><FileText size={12} /> {rev.file_path.split('/').pop()}</span>
                                          {rev.reviewer_name && <span className="flex items-center gap-1 text-slate-500">Reviewer: <b className="text-slate-700 dark:text-slate-300">{rev.reviewer_name}</b></span>}
                                        </div>
                                        
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-start  gap-2">
                                      {rev.reviewer_comment && (
                                          <div className={`text-xs flex items-start gap-2 p-2 w-fit rounded border ${
                                            rev.status === 'Approved' 
                                              ? "text-green-600 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30" 
                                              : "text-red-600 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30"
                                          }`}>
                                            <MessageSquare size={10} className="mt-0.5 shrink-0" /> 
                                            <div>
                                              <span className="  text-xs block mb-0.5">Feedback</span>
                                              {rev.reviewer_comment}
                                            </div>
                                          </div>
                                        )}
                                      <button 
                                        onClick={() => window.open(getServerUrl(rev.file_path), '_blank')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs  rounded transition-colors border border-slate-200 dark:border-slate-600"
                                      >
                                        <Eye size={14} /> View
                                      </button>
                                      
                                      <button 
                                        onClick={() => handleDownload(rev)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs  rounded transition-colors border border-slate-200 dark:border-slate-600"
                                      >
                                        <Download size={14} /> Download
                                      </button>
                                      
                                      {index === 0 && rev.type !== 'Final Approved Drawing' && (
                                        <div className="flex items-center gap-2">
                                          {rev.status === 'Draft' && (
                                            <button 
                                              onClick={() => submitDraft(rev.id)}
                                              className="flex items-center gap-1.5 p-2 bg-blue-600 hovexsbg-blue-700 text-white text-xs  rounded transition-colors "
                                            >
                                              <Upload size={14} /> Submit
                                            </button>
                                          )}
                                          
                                          {rev.status === 'Rejected' && (
                                            <button 
                                              onClick={() => {
                                                setSelectedDoc(rev); 
                                                setFormData({ ...formData, name: rev.name, type: rev.type, root_card_id: rev.root_card_id }); 
                                                setIsRevision(true);
                                                setShowUploadModal(true);
                                              }}
                                              className="flex items-center gap-1.5 p-2 bg-orange-600 hoxsr:bg-orange-700 text-white text-xs  rounded transition-colors "
                                            >
                                              <RefreshCw size={14} /> Create Revision
                                            </button>
                                          )}
                                          
                                          {rev.status === 'Pending Review' && (
                                            <>
                                              <button 
                                                onClick={() => handleApprove(rev)}
                                                className="flex items-center gap-1.5 p-2 bg-green-600 hovxs:bg-green-700 text-white text-xs  rounded transition-colors "
                                              >
                                                <CheckCircle2 size={14} /> Approve
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      )}

                                      <button 
                                        onClick={() => handleDelete(rev.id, false)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 "
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md max-h-[70vh] overflow-scroll rounded  border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg text-slate-900 dark:text-white">
                {isRevision ? `Create Revision for ${formData.name} (v${selectedDoc.version + 1})` : "Upload New Drawing"}
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-500"><XCircle size={15} /></button>
            </div>
            <form onSubmit={handleUpload} className="p-2 space-y-4">
              {!isRevision && (
                <div>
                  <label className="block text-xs  text-slate-700 dark:text-slate-300 mb-1">Root Card (Project)</label>
                  <select
                    required
                    value={formData.root_card_id || rootCardId}
                    onChange={(e) => setFormData({ ...formData, root_card_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Root Card...</option>
                    {rootCards.map(rc => {
                      const baseName = rc.project_name || rc.po_number || "";
                      const displayName = baseName.replace(/^RC-\d{4}\s*[-:]\s*/i, '');
                      return (
                        <option key={rc.id} value={rc.id}>{displayName || baseName || rc.id}</option>
                      );
                    })}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs  text-slate-700 dark:text-slate-300 mb-1">Drawing Name</label>
                <input
                  type="text"
                  required
                  disabled={isRevision}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs  text-slate-700 dark:text-slate-300 mb-1">Type</label>
                <select
                  disabled={isRevision}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Part Drawing">Part Drawing</option>
                  <option value="Assembly Drawing">Assembly Drawing</option>
                  <option value="Final Approved Drawing">Final Approved Drawing</option>
                </select>
              </div>
              <div>
                <label className="block text-xs  text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border text-xs border-slate-200 dark:border-slate-700 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs  text-slate-700 dark:text-slate-300 mb-1">File (Any format)</label>
                <input
                  type="file"
                  required
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs p-2 rounded transition-colors flex items-center justify-center"
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
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl  border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg  text-slate-900 dark:text-white">Revision History: {selectedDoc?.name}</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-500"><XCircle size={15} /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {historyLoading ? (
                <div className="text-center py-10 text-slate-500"><Loader2 className="animate-spin inline mr-2" /> Loading history...</div>
              ) : history.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className=" text-blue-600 dark:text-blue-400">Version v{item.version}</span>
                    <span className={`px-2 py-0.5 rounded text-xs    ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 italic">"{item.description}"</div>
                  {item.reviewer_comment && (
                    <div className="flex gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
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
                      href={getServerUrl(item.file_path)} 
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
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl  border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg  text-slate-900 dark:text-white">
                {selectedDoc?.status === 'Rejected' ? "Reviewer Feedback" : "Review Drawing"}
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-500"><XCircle size={15} /></button>
            </div>
            <div className="p-6 space-y-4">
              {selectedDoc?.status === 'Rejected' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded">
                    <div className="flex items-center gap-2 text-red-800 dark:text-red-400  mb-2">
                      <AlertCircle size={18} />
                      <span>Status: Rejected (v{selectedDoc.version})</span>
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/50 p-3 rounded border border-red-100 dark:border-red-900/20">
                      <p className="font-semibold mb-1 text-xs   text-slate-500">Reviewer Comment:</p>
                      {selectedDoc.reviewer_comment || "No comment provided."}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setShowReviewModal(false);
                        setFormData({ ...formData, name: selectedDoc.name, type: selectedDoc.type, root_card_id: selectedDoc.root_card_id }); 
                        setIsRevision(true);
                        setShowUploadModal(true);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded  transition-colors"
                    >
                      Create Revision
                    </button>
                    <button 
                      onClick={() => setShowReviewModal(false)}
                      className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded "
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReview} className="space-y-4">
                  <div>
                    <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-1">Decision</label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setReviewData({ ...reviewData, status: "Approved" })}
                        className={`flex-1 py-2 rounded border-2 transition-all flex items-center justify-center gap-2 ${reviewData.status === 'Approved' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <CheckCircle2 size={18} /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewData({ ...reviewData, status: "Rejected" })}
                        className={`flex-1 py-2 rounded border-2 transition-all flex items-center justify-center gap-2 ${reviewData.status === 'Rejected' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <XCircle size={18} /> Reject
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-1">Reviewer Comments</label>
                    <textarea
                      required={reviewData.status === 'Rejected'}
                      placeholder={reviewData.status === 'Rejected' ? "Please provide feedback for rejection..." : "Optional comments..."}
                      value={reviewData.reviewer_comment}
                      onChange={(e) => setReviewData({ ...reviewData, reviewer_comment: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className={`w-full text-white  py-3 rounded transition-colors ${reviewData.status === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
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
