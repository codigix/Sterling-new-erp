import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "../../utils/api";
import { 
  Search, 
  Loader2, 
  Activity,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Filter,
  Save,
  User,
  History,
  Plus,
  Trash2,
  ListOrdered,
  Settings2,
  X,
  GripVertical,
  Package
} from "lucide-react";
import SearchableSelect from "../../components/ui/SearchableSelect";
import DataTable from "../../components/ui/DataTable/DataTable";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

// Modal Component for Managing Operations
const ManageOperationsModal = ({ isOpen, onClose, project, availableOperations, projects, onRefresh }) => {
  const [selectedProject, setSelectedProject] = useState(project);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newOperation, setNewOperation] = useState({
    operation_name: "",
    phase: 1
  });

  const fetchOperations = useCallback(async (id) => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await axios.get(`/production/root-cards/${id}`);
      if (response.data.success) {
        setOperations(response.data.stages || []);
      }
    } catch (error) {
      console.error("Error fetching operations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (project) {
        setSelectedProject(project);
        fetchOperations(project.id);
      } else {
        setSelectedProject(null);
        setOperations([]);
      }
    }
  }, [isOpen, project, fetchOperations]);

  const handleProjectChange = (projectId) => {
    const proj = projects.find(p => p.id === projectId);
    setSelectedProject(proj);
    fetchOperations(projectId);
  };

  const handleAddOperation = async () => {
    if (!selectedProject?.id) {
      toast.error("Please select a project first");
      return;
    }
    if (!newOperation.operation_name) {
      toast.error("Please select an operation");
      return;
    }

    try {
      setAdding(true);
      const response = await axios.post(`/production/root-cards/${selectedProject.id}/stages`, {
        stageName: newOperation.operation_name,
        stageType: 'in_house',
        phase: newOperation.phase
      });

      if (response.data.success) {
        toast.success("Operation added successfully");
        setNewOperation({ operation_name: "", phase: 1 });
        fetchOperations(selectedProject.id);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error("Error adding operation:", error);
      toast.error("Failed to add operation");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteOperation = async (operationId) => {
    const result = await Swal.fire({
      title: 'Remove Operation?',
      text: "Are you sure you want to remove this operation?",
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
      const response = await axios.delete(`/production/root-cards/${selectedProject.id}/stages/${operationId}`);
      if (response.data.success) {
        toast.success("Operation removed");
        fetchOperations(selectedProject.id);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error("Error deleting operation:", error);
      toast.error("Failed to remove operation");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
              Define Project Operations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select a project and add its manufacturing operations in sequence
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Project Selection */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <SearchableSelect
                label="Select Project"
                options={projects.map(p => ({ value: p.id, label: `${p.project_name || p.title} (${p.id})` }))}
                value={selectedProject?.id || ""}
                onChange={handleProjectChange}
                placeholder="Search project..."
              />
            </div>

            {selectedProject && (
              <>
                {/* Add Operation Section - NOW IMMEDIATELY AFTER PROJECT SELECTION */}
                <div className="bg-blue-50/30 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
                  <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">Add New Operation</h4>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Select Operation</label>
                      <select 
                        className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded outline-none focus:ring-2 focus:ring-blue-500"
                        value={newOperation.operation_name}
                        onChange={(e) => {
                          setNewOperation({
                            ...newOperation, 
                            operation_name: e.target.value
                          });
                        }}
                      >
                        <option value="">-- Select Operation --</option>
                        {availableOperations.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Phase</label>
                      <select 
                        className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded outline-none focus:ring-2 focus:ring-blue-500"
                        value={newOperation.phase}
                        onChange={(e) => setNewOperation({ ...newOperation, phase: parseInt(e.target.value) })}
                      >
                        <option value={1}>Phase 1</option>
                        <option value={2}>Phase 2</option>
                      </select>
                    </div>
                    <div className="flex items-end pb-0.5">
                      <button 
                        onClick={handleAddOperation}
                        disabled={adding || !newOperation.operation_name}
                        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-bold"
                      >
                        {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Add to List
                      </button>
                    </div>
                  </div>
                </div>

                {/* Current Operations Table */}
                <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-16">Seq</th>
                        <th className="py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Operation</th>
                        <th className="py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center w-24">Phase</th>
                        <th className="py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loading ? (
                        <tr>
                          <td colSpan="3" className="py-8 text-center">
                            <Loader2 size={24} className="animate-spin text-blue-500 mx-auto" />
                            <p className="text-xs text-slate-400 mt-2">Loading operations...</p>
                          </td>
                        </tr>
                      ) : operations.length > 0 ? (
                        operations.map((op, index) => (
                          <tr key={op.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-4">
                              <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-xs font-medium text-slate-900 dark:text-white uppercase">{op.operation_name || op.stage_name}</p>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${op.phase === 2 ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                                Phase {op.phase || 1}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button 
                                onClick={() => handleDeleteOperation(op.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="py-12 text-center">
                            <Settings2 size={40} className="text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">No operations defined for this project.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ProductionUpdatePage = () => {
  const [projects, setProjects] = useState([]);
  const [availableOperations, setAvailableOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingProjects, setFetchingProjects] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  
  // Modal states
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeProject, setActiveProject] = useState(null);

  const fetchProjects = useCallback(async () => {
    try {
      setFetchingProjects(true);
      // Fetch all projects ready for production
      const response = await axios.get("/production/root-cards");
      const cards = response.data.rootCards || response.data || [];
      
      // For each project, fetch its stages to show current progress
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
      setFetchingProjects(false);
      setLoading(false);
    }
  }, []);

  const fetchOperations = useCallback(async () => {
    try {
      const response = await axios.get("/production/operations");
      if (response.data.success) {
        setAvailableOperations(response.data.operations.map(op => ({
          value: op.name,
          label: op.name
        })));
      }
    } catch (error) {
      console.error("Error fetching operations:", error);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchOperations();
  }, [fetchProjects, fetchOperations]);

  const projectOptions = useMemo(() => {
    return projects.map(p => ({
      value: p.id,
      label: `${p.project_name || p.title} (${p.id})`
    }));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = searchTerm === "" || 
        p.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = projectFilter === "" || p.id === projectFilter;
      
      return matchesSearch && matchesFilter;
    });
  }, [projects, searchTerm, projectFilter]);

  const flattenedOperations = useMemo(() => {
    const list = [];
    filteredProjects.forEach(project => {
      if (project.stages && project.stages.length > 0) {
        // Check if all Phase 1 operations are completed AND Phase 1 QC is approved
        const phase1Ops = project.stages.filter(s => (s.phase || 1) === 1);
        const allPhase1Completed = phase1Ops.length > 0 && phase1Ops.every(s => s.status === 'Completed');
        const phase1QCApproved = ['DIMENSIONAL_QC_APPROVED', 'PHASE_2_QC_PENDING', 'PHASE_2_QC_APPROVED'].includes(project.status);

        project.stages.forEach((stage, index) => {
          // Hide Phase 2 operations until Phase 1 is fully complete and approved by Quality
          if ((stage.phase || 1) === 2 && (!allPhase1Completed || !phase1QCApproved)) {
            return;
          }

          list.push({
            ...stage,
            projectName: project.project_name || project.title,
            projectId: project.id,
            sequenceIndex: index + 1,
            projectData: project
          });
        });
      }
    });
    return list;
  }, [filteredProjects]);

  const handleManageOperations = (project) => {
    setActiveProject(project);
    setIsManageModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30';
      case 'In Progress': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30';
      case 'Partially Completed': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30';
      case 'Delayed': return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30';
      case 'DIMENSIONAL_QC_PENDING': return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30';
      case 'DIMENSIONAL_QC_APPROVED': return 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800';
      default: return 'text-slate-600 bg-slate-50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      {/* Header Area */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Production Update</h1>
            <p className="text-xs text-slate-500 mt-1">Assign and track manufacturing operations for each project</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setActiveProject(null);
                setIsManageModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
            >
              <Plus size={14} /> Define Project Operations
            </button>
             <button 
              onClick={fetchProjects}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-50 transition-colors shadow-sm"
              title="Refresh Data"
            >
              <Activity size={16} className={fetchingProjects ? "animate-spin text-blue-500" : "text-slate-500"} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Filters */}
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

        {/* Operation List Table */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <DataTable
            loading={loading}
            data={flattenedOperations}
            columns={[
              {
                header: "Project",
                key: "projectName",
                render: (value, row) => (
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase" title={value}>
                      {value || "N/A"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">{row.projectId}</span>
                      {row.projectData?.status === 'DIMENSIONAL_QC_PENDING' && (
                        <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1 rounded font-bold border border-indigo-100 flex items-center gap-0.5">
                          <Clock size={8} /> UNDER INSPECTION
                        </span>
                      )}
                      {row.projectData?.status === 'DIMENSIONAL_QC_APPROVED' && (
                        <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1 rounded font-bold border border-emerald-100 flex items-center gap-0.5">
                          <CheckCircle2 size={8} /> QC APPROVED
                        </span>
                      )}
                    </div>
                  </div>
                )
              },
              {
                header: "Operation",
                key: "operation_name",
                render: (value, row) => (
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-200 dark:border-slate-700">
                      {row.sequenceIndex}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                        {value || row.stage_name}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-0.5 ${row.phase === 2 ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                        PHASE {row.phase || 1}
                      </span>
                    </div>
                  </div>
                )
              },
              {
                header: "Status",
                key: "status",
                render: (value) => (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getStatusColor(value)}`}>
                    {value || "Pending"}
                  </span>
                )
              },
              {
                header: "Actions",
                key: "id",
                align: "right",
                render: (value, row) => (
                  <div className="flex justify-end items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveProject(row.projectData);
                        setIsManageModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded"
                      title="Manage Operations"
                    >
                      <Settings2 size={16} />
                    </button>
                  </div>
                )
              }
            ]}
          />
          {flattenedOperations.length === 0 && !loading && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings2 size={32} className="text-slate-300" />
              </div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">No operations found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {projectFilter || searchTerm 
                  ? "Try adjusting your filters to find what you're looking for." 
                  : "Add operations to projects to start tracking production progress."}
              </p>
              {!projectFilter && !searchTerm && (
                <button 
                  onClick={() => setIsManageModalOpen(true)}
                  className="mt-6 text-blue-600 text-xs font-bold hover:underline"
                >
                  Define your first project operation
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Operation Management Modal */}
      <ManageOperationsModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        project={activeProject}
        projects={projects}
        availableOperations={availableOperations}
        onRefresh={fetchProjects}
      />
    </div>
  );
};

export default ProductionUpdatePage;
