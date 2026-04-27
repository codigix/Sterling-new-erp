import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { 
  CheckCircle, 
  Search, 
  Package, 
  Clock, 
  AlertCircle,
  ShieldCheck,
  ClipboardList,
  RefreshCw,
  ExternalLink,
  Plus,
  Trash2,
  FileText,
  Upload,
  X,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Check,
  XCircle
} from "lucide-react";
import { showSuccess, showError } from "../../utils/toastUtils";
import DataTable from "../../components/ui/DataTable/DataTable";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { getServerUrl } from "../../utils/fileUtils";

const TestingModal = ({ isOpen, onClose, project, onRefresh, onFinalApprove }) => {
  const [inspections, setInspections] = useState([]);
  const [newInspection, setNewInspection] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const isQCApproved = useMemo(() => {
    if (!project) return false;
    const isPhase1 = project.current_phase === 1;
    return isPhase1 
      ? ['DIMENSIONAL_QC_APPROVED', 'PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED'].includes(project.status)
      : project.status === 'PHASE_2_QC_APPROVED';
  }, [project]);

  const fetchInspections = useCallback(async () => {
    if (!project?.id) return;
    try {
      setLoading(true);
      const response = await axios.get(`/qc/production/inspections/${project.id}?phase=${project.current_phase || 1}`);
      if (response.data.success) {
        setInspections(response.data.inspections || []);
      }
    } catch (error) {
      console.error("Error fetching inspections:", error);
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    if (isOpen && project) {
      fetchInspections();
    }
  }, [isOpen, project, fetchInspections]);

  const handleAddInspection = async () => {
    if (!newInspection.trim()) return;
    try {
      setAdding(true);
      const response = await axios.post("/qc/production/inspections", {
        root_card_id: project.id,
        inspection_name: newInspection.trim(),
        phase: project.current_phase || 1
      });
      if (response.data.success) {
        toast.success("Inspection test added");
        setNewInspection("");
        fetchInspections();
      }
    } catch (error) {
      showError("Failed to add test");
    } finally {
      setAdding(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      setUpdatingId(id);
      const response = await axios.put(`/qc/production/inspections/${id}`, { status });
      if (response.data.success) {
        toast.success(`Test marked as ${status}`);
        fetchInspections();
      }
    } catch (error) {
      showError("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleFileUpload = async (id, file) => {
    try {
      setUpdatingId(id);
      const formData = new FormData();
      formData.append("document", file);
      const response = await axios.put(`/qc/production/inspections/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (response.data.success) {
        toast.success("Report uploaded successfully");
        fetchInspections();
      }
    } catch (error) {
      showError("Failed to upload report");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Remove Test?',
      text: "Are you sure you want to remove this test?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!',
      background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000'
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`/qc/production/inspections/${id}`);
      toast.success("Test removed successfully");
      fetchInspections();
    } catch (error) {
      showError("Failed to delete test");
    }
  };

  const allApproved = inspections.length > 0 && inspections.every(i => i.status === 'Approved');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
              Project Testing & Inspection
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {project?.project_name} ({project?.id})
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!isQCApproved && (
            <div className="bg-blue-50/30 dark:bg-blue-900/10 p-4 rounded border border-blue-100/50 dark:border-blue-900/30">
              <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3">Define New Test</h4>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="e.g. Dimensional Check, Visual, DP Test..."
                  className="flex-1 p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded outline-none focus:ring-2 focus:ring-blue-500"
                  value={newInspection}
                  onChange={(e) => setNewInspection(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddInspection()}
                />
                <button 
                  onClick={handleAddInspection}
                  disabled={adding || !newInspection}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-bold"
                >
                  {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add Test
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Added Tests</h4>
            {loading ? (
              <div className="py-8 text-center"><Loader2 size={24} className="animate-spin text-blue-500 mx-auto" /></div>
            ) : inspections.length > 0 ? (
              <div className="space-y-2">
                {inspections.map((insp) => (
                  <div key={insp.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900/50 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{insp.inspection_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          insp.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 
                          insp.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : 
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {insp.status === 'Approved' ? 'ACCEPTED' : insp.status === 'Rejected' ? 'REJECTED' : 'PENDING'}
                        </span>
                        {insp.document_path && (
                          <a 
                            href={getServerUrl(insp.document_path)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <FileText size={10} /> View Report
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!isQCApproved && (
                        <>
                          {insp.status === 'Approved' && (
                            <label className="p-1.5 text-slate-500 hover:text-blue-600 border border-slate-200 dark:border-slate-700 rounded cursor-pointer transition-colors" title="Upload Report">
                              <input type="file" className="hidden" onChange={(e) => handleFileUpload(insp.id, e.target.files[0])} />
                              <Upload size={14} />
                            </label>
                          )}
                          
                          {insp.status === 'Pending' ? (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleStatusUpdate(insp.id, 'Approved')}
                                disabled={updatingId === insp.id}
                                className="p-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold"
                                title="Accept Test"
                              >
                                {updatingId === insp.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Accept
                              </button>
                              <button 
                                onClick={() => handleStatusUpdate(insp.id, 'Rejected')}
                                disabled={updatingId === insp.id}
                                className="p-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold"
                                title="Reject Test"
                              >
                                {updatingId === insp.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                                Reject
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleStatusUpdate(insp.id, 'Pending')}
                              className="p-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded hover:bg-amber-600 hover:text-white transition-all"
                              title="Revert to Pending"
                            >
                              <RefreshCw size={14} />
                            </button>
                          )}
                          
                          <button onClick={() => handleDelete(insp.id)} className="p-1.5 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-slate-700 rounded transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded">
                <p className="text-xs text-slate-400">No tests defined for this inspection.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-end items-center gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          {allApproved && (
            (project?.current_phase === 1 && project?.status === 'DIMENSIONAL_QC_PENDING') ||
            (project?.current_phase === 2 && project?.status === 'PHASE_2_QC_PENDING')
          ) && (
            <button
              onClick={async () => {
                const result = await Swal.fire({
                  title: 'Send to Production?',
                  text: "All tests are accepted. Send this project back to production?",
                  icon: 'question',
                  showCancelButton: true,
                  confirmButtonColor: '#10b981',
                  cancelButtonColor: '#64748b',
                  confirmButtonText: 'Yes, Send it!',
                  background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                  color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000'
                });

                if (result.isConfirmed) {
                  onFinalApprove(project.id, project.current_phase);
                  onClose();
                }
              }}
              className="px-6 py-2 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <ArrowRight size={14} />
              Send back to Production
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ProductionQCPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeProject, setActiveProject] = useState(null);

  // Get unique projects for filter
  const projectOptions = useMemo(() => {
    const projects = tasks.map(t => ({
      value: t.task_id,
      label: `${t.project_name} (${t.id}) - Phase ${t.current_phase}`
    }));
    return projects;
  }, [tasks]);

  // Filter tasks based on selected project
  const filteredTasks = useMemo(() => {
    if (!selectedProject) return tasks;
    return tasks.filter(t => t.task_id === selectedProject);
  }, [tasks, selectedProject]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/qc/tasks");
      const productionTasks = response.data.tasks || [];
      setTasks(productionTasks);
    } catch (error) {
      console.error("Error fetching quality tasks:", error);
      showError("Failed to load production QC tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleFinalApprove = async (rootCardId, phase) => {
    try {
      setLoading(true);
      const response = await axios.post("/qc/production/approve-dimensional", { 
        root_card_id: rootCardId,
        current_phase: phase
      });
      if (response.data.success) {
        showSuccess(response.data.message);
        fetchTasks();
      }
    } catch (error) {
      showError("Failed to submit final approval");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: "Project Info",
      key: "project_name",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
            <Package size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 uppercase">{val}</p>
            <p className="text-[10px] text-slate-400 font-mono">{row.id}</p>
          </div>
        </div>
      )
    },
    {
      header: "Inspection Phase",
      key: "phase",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-700 uppercase">
             Phase {row.current_phase || 1}
          </span>
        </div>
      )
    },
    {
      header: "Status",
      key: "status",
      render: (val, row) => {
        const isPhase1 = row.current_phase === 1;
        const isApproved = isPhase1 
          ? ['DIMENSIONAL_QC_APPROVED', 'PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED'].includes(val)
          : val === 'PHASE_2_QC_APPROVED';

        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isApproved ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-indigo-600 bg-indigo-50 border-indigo-100'}`}>
            {isApproved ? 'QC APPROVED' : 'AWAITING INSPECTION'}
          </span>
        );
      }
    },
    {
      header: "Actions",
      key: "task_id",
      align: "right",
      render: (val, row) => {
        const isPhase1 = row.current_phase === 1;
        const isApproved = isPhase1 
          ? ['DIMENSIONAL_QC_APPROVED', 'PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED'].includes(row.status)
          : row.status === 'PHASE_2_QC_APPROVED';

        return (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setActiveProject(row);
                setIsModalOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all shadow-sm ${
                isApproved 
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
              }`}
            >
              {isApproved ? <FileText size={14} /> : <ClipboardList size={14} />}
              {isApproved ? 'View Tests' : 'Testing'}
            </button>
            
            {((row.current_phase === 1 && row.status === 'DIMENSIONAL_QC_PENDING') || 
            (row.current_phase === 2 && row.status === 'PHASE_2_QC_PENDING')) && 
           row.total_tests > 0 && row.total_tests === row.approved_tests && (
            <button
              onClick={async () => {
                const result = await Swal.fire({
                  title: 'Send to Production?',
                  text: "All tests are accepted. Send this project back to production?",
                  icon: 'question',
                  showCancelButton: true,
                  confirmButtonColor: '#10b981',
                  cancelButtonColor: '#64748b',
                  confirmButtonText: 'Yes, Send it!',
                  background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                  color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000'
                });

                if (result.isConfirmed) {
                  handleFinalApprove(row.id, row.current_phase);
                }
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-500/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              Send back to Production
            </button>
          )}

          {(row.status === 'DIMENSIONAL_QC_APPROVED' || row.status === 'PHASE_2_QC_APPROVED') && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded text-xs font-bold border border-emerald-100">
              <CheckCircle2 size={14} /> QC Approved
            </div>
          )}
        </div>
      )
    }
  }
];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="text-indigo-600" size={20} />
            Production Phase-wise QC
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Approve completed manufacturing phases to unlock next production stages
          </p>
        </div>
        <button 
          onClick={fetchTasks} 
          className="p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-all"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-indigo-500" : "text-slate-500"} />
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/30">
          <div className="max-w-md">
            <SearchableSelect
              options={projectOptions}
              value={selectedProject}
              onChange={setSelectedProject}
              placeholder="Filter by Project Name or ID..."
              isClearable
            />
          </div>
        </div>
        <DataTable
          loading={loading}
          data={filteredTasks}
          columns={columns}
          searchPlaceholder="Search operation..."
        />
        {!loading && filteredTasks.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-slate-200" />
            </div>
            <h3 className="text-sm font-medium text-slate-900">No Pending Inspections</h3>
            <p className="text-xs text-slate-500 mt-1">
              Fabrication projects waiting for QC will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Testing Modal */}
      <TestingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        project={activeProject}
        onRefresh={fetchTasks}
        onFinalApprove={handleFinalApprove}
      />
    </div>
  );
};

export default ProductionQCPage;
