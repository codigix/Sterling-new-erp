import React, { useState, useEffect } from "react";
import { 
  FolderOpen, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Eye, 
  X, 
  Save, 
  FileText
} from "lucide-react";
import axios from "../../utils/api";
import toastUtils from "../../utils/toastUtils";
import SearchableSelect from "../../components/ui/SearchableSelect";

const ProjectDocumentsPage = ({ readOnly = false }) => {
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDocId, setCurrentDocId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    project_id: "",
    document_name: "",
    file: null
  });
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get("/accounting/projects");
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/accounting/project-documents");
      if (response.data.success) {
        setDocuments(response.data.documents || []);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toastUtils.error("Failed to load project documents");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setCurrentDocId(null);
    setFormData({
      project_id: "",
      document_name: "",
      file: null
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (doc) => {
    setIsEditing(true);
    setCurrentDocId(doc.id);
    setFormData({
      project_id: doc.project_id,
      document_name: doc.document_name,
      file: null
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return;
    }
    try {
      const response = await axios.delete(`/accounting/project-documents/${id}`);
      if (response.data.success) {
        toastUtils.success("Document deleted successfully");
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toastUtils.error(error.response?.data?.message || "Failed to delete document");
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData(prev => ({ ...prev, file: e.target.files[0] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project_id) {
      toastUtils.error("Please select a project");
      return;
    }
    if (!formData.document_name.trim()) {
      toastUtils.error("Please enter a document name");
      return;
    }
    if (!isEditing && !formData.file) {
      toastUtils.error("Please select a file to upload");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("project_id", formData.project_id);
      data.append("document_name", formData.document_name);
      if (formData.file) {
        data.append("file", formData.file);
      }

      if (isEditing) {
        await axios.put(`/accounting/project-documents/${currentDocId}`, data, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toastUtils.success("Document updated successfully");
      } else {
        await axios.post("/accounting/project-documents", data, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toastUtils.success("Document uploaded successfully");
      }
      setIsModalOpen(false);
      fetchDocuments();
    } catch (error) {
      console.error("Error saving document:", error);
      toastUtils.error(error.response?.data?.message || "Failed to save document");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter logic
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.project_name && doc.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.project_code && doc.project_code.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesProject = !selectedProjectFilter || String(doc.project_id) === String(selectedProjectFilter);
    
    return matchesSearch && matchesProject;
  });

  return (
    <div className="p-4 space-y-4">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl text-slate-900 dark:text-white flex items-center gap-2 font-medium">
            <FolderOpen className="text-blue-600" size={22} /> Project Documents
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage, view, and organize customer and vendor project files</p>
        </div>
        {!readOnly && (
          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all font-medium"
          >
            <Plus size={16} /> Add Project Document
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by document name or project..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-950 dark:text-white"
          />
        </div>
        <div className="w-full md:w-72">
          <SearchableSelect
            options={[
              { value: "", label: "All Projects" },
              ...projects.map(proj => ({
                value: proj.id,
                label: `${proj.project_name} (${proj.project_code || 'N/A'})`
              }))
            ]}
            value={selectedProjectFilter}
            onChange={(val) => setSelectedProjectFilter(val)}
            placeholder="Filter by project..."
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-sm">No Project Documents Found</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting filters or uploading a new document.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-[10px] text-slate-400 tracking-wider">Document Name</th>
                  <th className="px-4 py-3 text-[10px] text-slate-400 tracking-wider">Project</th>
                  <th className="px-4 py-3 text-[10px] text-slate-400 tracking-wider">Date Uploaded</th>
                  <th className="px-4 py-3 text-[10px] text-slate-400 tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredDocuments.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded">
                          <FileText size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">{doc.document_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs">{doc.file_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs text-slate-700 dark:text-slate-300">{doc.project_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{doc.project_code || "N/A"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 font-mono font-medium">
                      {new Date(doc.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <a 
                          href={`/api/uploads/${doc.file_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-all"
                          title="View File"
                        >
                          <Eye size={14} />
                        </a>
                        {!readOnly && (
                          <button 
                            onClick={() => handleOpenEditModal(doc)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded transition-all"
                            title="Edit Document"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                        {!readOnly && (
                          <button 
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-all"
                            title="Delete Document"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200 text-left">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <FolderOpen className="text-blue-600" size={18} />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  {isEditing ? "Edit Project Document" : "Add Project Document"}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={16} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit}>
              <div className="p-4 space-y-4">
                {/* Project Select */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Select Project</label>
                  <SearchableSelect
                    options={projects.map(p => ({
                      value: p.id,
                      label: `${p.project_name} (${p.project_code || 'N/A'})`
                    }))}
                    value={formData.project_id}
                    onChange={(val) => setFormData(prev => ({ ...prev, project_id: val }))}
                    placeholder="Search and select project..."
                  />
                </div>

                {/* Document Name */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Document Name</label>
                  <input
                    type="text"
                    value={formData.document_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, document_name: e.target.value }))}
                    placeholder="e.g. Technical Specifications, Purchase Contract"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-950 dark:text-white"
                    required
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-medium">
                    {isEditing ? "Update File (Optional)" : "Upload File"}
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-md hover:border-blue-500 transition-colors">
                    <div className="space-y-1 text-center">
                      <FileText className="mx-auto h-12 w-12 text-slate-400" />
                      <div className="flex text-xs text-slate-600 dark:text-slate-400 justify-center">
                        <label className="relative cursor-pointer bg-white dark:bg-slate-900 rounded font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                          <span>Upload a file</span>
                          <input 
                            type="file" 
                            className="sr-only" 
                            onChange={handleFileChange}
                            required={!isEditing}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        PDF, CAD, Images, Excel, Word up to 10MB
                      </p>
                      {formData.file && (
                        <p className="text-xs text-green-600 font-semibold mt-2 truncate max-w-xs mx-auto">
                          Selected: {formData.file.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors disabled:opacity-50 font-medium"
                >
                  <Save size={14} />
                  {submitting ? "Saving..." : "Save Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDocumentsPage;
