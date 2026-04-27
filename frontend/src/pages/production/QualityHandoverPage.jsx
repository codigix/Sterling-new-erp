import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import { 
  Loader2, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Search,
  RefreshCw,
  ArrowRight,
  Package,
  X,
  ClipboardList,
  FileText
} from "lucide-react";
import DataTable from "../../components/ui/DataTable/DataTable";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { toast } from "react-toastify";
import { getServerUrl } from "../../utils/fileUtils";

const ViewTestsModal = ({ isOpen, onClose, project }) => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInspections = useCallback(async () => {
    if (!project?.id) return;
    try {
      setLoading(true);
      const response = await axios.get(`/qc/production/inspections/${project.id}?phase=${project.handoverPhase || 1}`);
      if (response.data.success) {
        setInspections(response.data.inspections || []);
      }
    } catch (error) {
      console.error("Error fetching inspections:", error);
    } finally {
      setLoading(false);
    }
  }, [project?.id, project?.handoverPhase]);

  useEffect(() => {
    if (isOpen && project) {
      fetchInspections();
    }
  }, [isOpen, project, fetchInspections]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
              Quality Testing & Reports
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {project?.project_name || project?.title} ({project?.id})
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-3">
            {loading ? (
              <div className="py-20 text-center"><Loader2 size={24} className="animate-spin text-blue-500 mx-auto" /></div>
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
                      </div>
                    </div>
                    
                    {insp.document_path && (
                      <a 
                        href={getServerUrl(insp.document_path)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                      >
                        <FileText size={12} /> Download Report
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded">
                <p className="text-xs text-slate-400">No testing reports found for this phase.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-end items-center">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const QualityHandoverPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeProject, setActiveProject] = useState(null);

  const fetchProjects = useCallback(async () => {
    try {
      setFetching(true);
      const response = await axios.get("/production/root-cards");
      const cards = response.data.rootCards || response.data || [];
      
      const cardsWithStages = await Promise.all(cards.map(async (card) => {
        try {
          const detailRes = await axios.get(`/production/root-cards/${card.id}`);
          return {
            ...card,
            stages: detailRes.data.stages || []
          };
        } catch (e) {
          return { ...card, stages: [] };
        }
      }));

      setProjects(cardsWithStages);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to fetch projects");
    } finally {
      setFetching(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const projectOptions = useMemo(() => {
    return projects.map(p => ({
      value: p.id,
      label: `${p.project_name || p.title} (${p.id})`
    }));
  }, [projects]);

  const handoverProjects = useMemo(() => {
    const list = [];
    
    projects.forEach(project => {
      if (!project.stages || project.stages.length === 0) return;

      const phase1Ops = project.stages.filter(s => (s.phase || 1) === 1);
      const phase2Ops = project.stages.filter(s => (s.phase || 1) === 2);
      
      const phase1Completed = phase1Ops.length > 0 && phase1Ops.every(s => s.status === 'Completed');
      const phase2Completed = phase2Ops.length > 0 && phase2Ops.every(s => s.status === 'Completed');

      // Phase 1 entry
      const phase1InQC = ['DIMENSIONAL_QC_PENDING', 'DIMENSIONAL_QC_APPROVED', 'PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED'].includes(project.status);
      
      if (phase1Completed || phase1InQC) {
        list.push({
          ...project,
          handoverPhase: 1,
          handoverType: "Phase 1",
          isReady: phase1Completed && !phase1InQC,
          status: project.status === 'DIMENSIONAL_QC_PENDING' ? 'DIMENSIONAL_QC_PENDING' : 
                  (['DIMENSIONAL_QC_APPROVED', 'PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED'].includes(project.status)) ? 'DIMENSIONAL_QC_APPROVED' : 'READY'
        });
      }

      // Phase 2 entry
      if (phase2Completed || ['PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED'].includes(project.status)) {
        list.push({
          ...project,
          handoverPhase: 2,
          handoverType: "Phase 2",
          isReady: phase2Completed && !['PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED'].includes(project.status),
          status: project.status === 'PHASE_2_QC_PENDING' ? 'PHASE_2_QC_PENDING' : 
                  project.status === 'PHASE_2_QC_APPROVED' ? 'PHASE_2_QC_APPROVED' : 'READY'
        });
      }
    });

    return list.filter(p => {
      const matchesSearch = searchTerm === "" || 
        p.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProject = projectFilter === "" || p.id === projectFilter;
      
      return matchesSearch && matchesProject;
    });
  }, [projects, searchTerm, projectFilter]);

  const handleSendToQuality = async (projectId, phase) => {
    const result = await Swal.fire({
      title: 'Send to Quality?',
      text: `Are you sure Phase ${phase} is complete and ready for Quality Inspection?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Send it!',
      background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
      color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000'
    });

    if (!result.isConfirmed) return;

    try {
      setFetching(true);
      const response = await axios.post("/production/send-fabrication-to-qc", { 
        root_card_id: projectId,
        phase: phase
      });
      if (response.data.success) {
        toast.success(response.data.message);
        fetchProjects();
      }
    } catch (error) {
      console.error("Error sending to quality:", error);
      toast.error(error.response?.data?.message || "Failed to send to quality");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quality Handover</h1>
            <p className="text-xs text-slate-500 mt-1">Send completed production phases to Quality department for inspection</p>
          </div>
          <button 
            onClick={fetchProjects}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw size={16} className={fetching ? "animate-spin text-blue-500" : "text-slate-500"} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <SearchableSelect
              placeholder="Filter by Project Name or ID..."
              options={projectOptions}
              value={projectFilter}
              onChange={setProjectFilter}
            />
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input 
              type="text" 
              placeholder="Search operation..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {(searchTerm || projectFilter) && (
            <button 
              onClick={() => {setSearchTerm(""); setProjectFilter("");}}
              className="px-4 py-2 text-rose-500 text-xs font-medium hover:bg-rose-50 rounded transition-colors flex items-center gap-1"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {/* Handover Table */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <DataTable
            loading={loading}
            data={handoverProjects}
            columns={[
              {
                header: "Project Details",
                key: "project_name",
                render: (value, row) => (
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                      {value || row.title || "N/A"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{row.id}</span>
                  </div>
                )
              },
              {
                header: "Handover Phase",
                key: "handoverType",
                render: (value) => (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                    value === "Phase 1" 
                      ? "bg-blue-50 text-blue-600 border-blue-100" 
                      : "bg-indigo-50 text-indigo-600 border-indigo-100"
                  }`}>
                    {value}
                  </span>
                )
              },
              {
                header: "Status",
                key: "status",
                render: (value, row) => (
                  <div className="flex items-center gap-2">
                    {value.includes('PENDING') ? (
                      <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded font-bold border border-amber-100 flex items-center gap-1">
                        <Clock size={10} /> UNDER INSPECTION
                      </span>
                    ) : value.includes('APPROVED') ? (
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-bold border border-emerald-100 flex items-center gap-1">
                        <CheckCircle2 size={10} /> QC APPROVED
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold border border-blue-100 flex items-center gap-1">
                        <Package size={10} /> READY FOR QC
                      </span>
                    )}
                  </div>
                )
              },
              {
                header: "Actions",
                key: "id",
                align: "right",
                render: (value, row) => (
                  <div className="flex justify-end gap-2">
                    {(row.status.includes('APPROVED') || row.status.includes('PENDING')) && (
                      <button
                        onClick={() => {
                          setActiveProject(row);
                          setIsModalOpen(true);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold transition-all shadow-sm ${
                          row.status.includes('APPROVED') 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {row.status.includes('APPROVED') ? <FileText size={14} /> : <ClipboardList size={14} />}
                        View Tests
                      </button>
                    )}

                    {row.isReady && (
                      <button
                        onClick={() => handleSendToQuality(row.id, row.handoverPhase)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                      >
                        <ShieldCheck size={14} /> Send to Quality
                      </button>
                    )}
                  </div>
                )
              }
            ]}
          />
          
          <ViewTestsModal 
            isOpen={isModalOpen} 
            onClose={() => {
              setIsModalOpen(false);
              setActiveProject(null);
            }} 
            project={activeProject} 
          />
          
          {handoverProjects.length === 0 && !loading && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} className="text-slate-300" />
              </div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">No projects found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Completed phases ready for inspection or currently under quality check will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QualityHandoverPage;
